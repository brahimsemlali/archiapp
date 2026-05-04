"use server";

import { createClient } from "@/lib/supabase/server";
import { contractGenerateSchema, contractAiResponseSchema, type ContractAiResponse } from "@/lib/validators/contract";
import { anthropic, AI_MODEL } from "@/lib/ai/anthropic";
import { CONTRACT_SYSTEM_PROMPT, CONTRACT_PROMPT_VERSION } from "@/lib/ai/prompts/contract";
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

async function callAI(userPrompt: string): Promise<Result<ContractAiResponse>> {
  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: CONTRACT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = message.content[0]?.type === "text" ? message.content[0].text : "";

  // Extract JSON from the response (AI may wrap it in markdown)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { ok: false, error: "La réponse de l'IA n'est pas au format attendu." };
  }

  const parsed = contractAiResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
  if (!parsed.success) {
    // Retry once
    const retry = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: CONTRACT_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
        { role: "assistant", content: rawText },
        {
          role: "user",
          content:
            "Ta réponse précédente n'était pas du JSON valide conforme au schéma. Renvoie uniquement le JSON strict : { \"title\": string, \"sections\": [{\"heading\": string, \"body\": string}] }",
        },
      ],
    });
    const retryText = retry.content[0]?.type === "text" ? retry.content[0].text : "";
    const retryMatch = retryText.match(/\{[\s\S]*\}/);
    if (!retryMatch) {
      return { ok: false, error: "Échec de la génération du contrat. Veuillez réessayer." };
    }
    const retryParsed = contractAiResponseSchema.safeParse(JSON.parse(retryMatch[0]));
    if (!retryParsed.success) {
      return { ok: false, error: "Échec de la génération du contrat. Veuillez réessayer." };
    }
    return { ok: true, data: retryParsed.data };
  }

  return { ok: true, data: parsed.data };
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

  // Fetch context data
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
      ai_model: `${AI_MODEL}@${CONTRACT_PROMPT_VERSION}`,
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
    metadata: { title: contractData.title, ai_model: AI_MODEL },
  });

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
