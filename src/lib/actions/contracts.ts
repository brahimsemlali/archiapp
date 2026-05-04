"use server";

import { createClient } from "@/lib/supabase/server";
import { contractGenerateSchema, contractAiResponseSchema, type ContractAiResponse } from "@/lib/validators/contract";
import { nvidiaClient, NVIDIA_MODEL, NVIDIA_PROMPT_VERSION } from "@/lib/ai/nvidia";
import { CONTRACT_SYSTEM_PROMPT } from "@/lib/ai/prompts/contract";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  return data?.id ?? null;
}

async function collectStream(userPrompt: string): Promise<string> {
  const stream = await nvidiaClient.chat.completions.create(
    {
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: CONTRACT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      top_p: 1,
      max_tokens: 8192,
      stream: true,
    },
    {
      body: {
        extra_body: {
          chat_template_kwargs: {
            enable_thinking: true,
            clear_thinking: true,
          },
        },
      },
    }
  );

  let content = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta && "content" in delta && delta.content) {
      content += delta.content;
    }
  }
  return content;
}

async function callAI(userPrompt: string): Promise<Result<ContractAiResponse>> {
  let rawText: string;
  try {
    rawText = await collectStream(userPrompt);
  } catch (err) {
    return { ok: false, error: `Erreur API NVIDIA : ${err instanceof Error ? err.message : String(err)}` };
  }

  // Extract JSON — AI may wrap it in markdown code fences
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawText.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1] ?? jsonMatch?.[0];
  if (!jsonStr) {
    return { ok: false, error: "La réponse de l'IA n'est pas au format attendu." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonStr);
  } catch {
    return { ok: false, error: "Le JSON retourné par l'IA est invalide." };
  }

  const validated = contractAiResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    // Retry once with a stricter prompt
    let retryRaw: string;
    try {
      retryRaw = await collectStream(
        userPrompt +
          '\n\nIMPORTANT: Renvoie UNIQUEMENT du JSON strict sans aucun texte autour. Format exact: { "title": "...", "sections": [{ "heading": "...", "body": "..." }] }'
      );
    } catch {
      return { ok: false, error: "Échec de la génération. Veuillez réessayer." };
    }
    const retryMatch = retryRaw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? retryRaw.match(/(\{[\s\S]*\})/);
    const retryStr = retryMatch?.[1] ?? retryMatch?.[0];
    if (!retryStr) return { ok: false, error: "Échec de la génération. Veuillez réessayer." };

    let retryJson: unknown;
    try {
      retryJson = JSON.parse(retryStr);
    } catch {
      return { ok: false, error: "Échec de la génération. Veuillez réessayer." };
    }

    const retryValidated = contractAiResponseSchema.safeParse(retryJson);
    if (!retryValidated.success) {
      return { ok: false, error: "Échec de la génération. Veuillez réessayer." };
    }
    return { ok: true, data: retryValidated.data };
  }

  return { ok: true, data: validated.data };
}

export async function generateContractAction(
  values: unknown
): Promise<Result<{ id: string }>> {
  const parsed = contractGenerateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides : " + parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const [clientRes, projectRes, firmRes] = await Promise.all([
    supabase.from("clients").select("name, type, address, ice, cin").eq("id", parsed.data.clientId).single(),
    parsed.data.projectId
      ? supabase.from("projects").select("title, type, address, surface_m2").eq("id", parsed.data.projectId).single()
      : Promise.resolve({ data: null }),
    supabase.from("firm_profile").select("firm_name, architect_name, address, ice, rc").eq("workspace_id", workspaceId).single(),
  ]);

  const userPrompt = JSON.stringify({
    type_contrat: parsed.data.type,
    client: clientRes.data,
    projet: projectRes.data,
    architecte: firmRes.data,
    perimetre_mission: parsed.data.missionScope,
    honoraires_mad_ht: parsed.data.feesMad,
    modalites_paiement: parsed.data.paymentSchedule,
    delais: parsed.data.deadlines,
    clauses_particulieres: parsed.data.specialClauses,
  });

  const aiResult = await callAI(userPrompt);
  if (!aiResult.ok) return aiResult;

  const contractData = aiResult.data;
  const contentHtml = contractData.sections
    .map((s) => `<h2>${s.heading}</h2><p>${s.body.replace(/\n/g, "</p><p>")}</p>`)
    .join("\n");

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId ?? null,
      client_id: parsed.data.clientId,
      type: parsed.data.type,
      title: contractData.title,
      content_json: contractData,
      content_html: contentHtml,
      ai_prompt: userPrompt,
      ai_response_raw: JSON.stringify(contractData),
      ai_model: `${NVIDIA_MODEL}@${NVIDIA_PROMPT_VERSION}`,
      status: "brouillon",
      version: 1,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId ?? null,
    client_id: parsed.data.clientId,
    action: "contract.generated",
    metadata: { title: contractData.title, ai_model: NVIDIA_MODEL },
  });

  if (parsed.data.projectId) {
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", parsed.data.projectId)
      .eq("workspace_id", workspaceId);
  }

  revalidatePath("/contracts");
  if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);

  return { ok: true, data: { id: contract.id } };
}

export async function updateContractContentAction(
  contractId: string,
  contentJson: unknown,
  contentHtml: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("contracts")
    .update({
      content_json: contentJson,
      content_html: contentHtml,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/contracts/${contractId}`);
  return { ok: true, data: undefined };
}

export async function archiveContractAction(contractId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "archive", updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
  return { ok: true, data: undefined };
}

export async function finalizeContractAction(contractId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "finalise", updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/contracts/${contractId}`);
  return { ok: true, data: undefined };
}
