"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { anthropic, AI_MODEL, messageText } from "@/lib/ai/anthropic";
import { assertAiUsageAvailable, recordAiUsage } from "@/lib/ai/usage";
import type { Result } from "@/types";

export async function generateProjectSummaryAction(projectId: string): Promise<Result<{ summary: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const quota = await assertAiUsageAvailable(supabase, workspaceId);
  if (!quota.ok) return quota;

  const [{ data: project }, { data: tasks }, { data: devis }, { data: factures }, { data: visits }] = await Promise.all([
    supabase.from("projects").select("*, clients!projects_client_id_fkey(name)").eq("id", projectId).eq("workspace_id", workspaceId).single(),
    supabase.from("tasks").select("title, status, due_date, priority").eq("workspace_id", workspaceId).eq("project_id", projectId).is("archived_at", null).neq("status", "termine"),
    supabase.from("devis").select("number, total_centimes, status").eq("workspace_id", workspaceId).eq("project_id", projectId).neq("status", "brouillon"),
    supabase.from("factures").select("number, total_centimes, status, due_date").eq("workspace_id", workspaceId).eq("project_id", projectId),
    supabase.from("site_visits").select("title, visit_date, summary").eq("workspace_id", workspaceId).eq("project_id", projectId).order("visit_date", { ascending: false }).limit(3),
  ]);

  if (!project) return { ok: false, error: "Projet introuvable." };

  const prompt = `Tu es l'assistant d'un architecte marocain. Rédige un résumé exécutif concis (150-200 mots, en français) du projet suivant pour une réunion de suivi.

PROJET: ${project.title}
CLIENT: ${(project as { clients?: { name: string } }).clients?.name ?? "—"}
PHASE: ${project.phase?.toUpperCase()}
STATUT: ${project.status}
BUDGET: ${project.budget_estimate_centimes ? (project.budget_estimate_centimes / 100).toLocaleString("fr-FR") + " MAD" : "Non défini"}
HONORAIRES: ${project.fees_centimes ? (project.fees_centimes / 100).toLocaleString("fr-FR") + " MAD" : "Non défini"}

TÂCHES EN COURS (${tasks?.length ?? 0}):
${tasks?.map((t) => `- [${t.priority?.toUpperCase()}] ${t.title}${t.due_date ? ` (échéance: ${t.due_date})` : ""}`).join("\n") ?? "Aucune"}

DEVIS:
${devis?.map((d) => `- ${d.number}: ${(d.total_centimes / 100).toLocaleString("fr-FR")} MAD (${d.status})`).join("\n") ?? "Aucun"}

FACTURES:
${factures?.map((f) => `- ${f.number}: ${(f.total_centimes / 100).toLocaleString("fr-FR")} MAD (${f.status}${f.due_date ? `, échéance ${f.due_date}` : ""})`).join("\n") ?? "Aucune"}

DERNIÈRES VISITES:
${visits?.map((v) => `- ${v.visit_date}: ${v.title}${v.summary ? " — " + v.summary.slice(0, 80) : ""}`).join("\n") ?? "Aucune"}

Rédige le résumé en mettant en avant l'avancement, les points d'attention et les prochaines étapes. Sois factuel et professionnel.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    await recordAiUsage(supabase, workspaceId, {
      feature: "project_summary",
      provider: "anthropic",
      model: AI_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      metadata: { projectId },
    });

    const summary = messageText(response);
    if (!summary) return { ok: false, error: "L'IA n'a pas renvoyé de contenu. Veuillez réessayer." };
    return { ok: true, data: { summary } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur IA." };
  }
}

export async function generateClientEmailAction(
  clientId: string,
  emailContext: string
): Promise<Result<{ email: string }>> {
  const supabase = await createClient();
  const roleContext = await requireWorkspaceRole(supabase);
  if (!roleContext.ok) return { ok: false, error: roleContext.error };
  const { workspaceId } = roleContext.data;
  const quota = await assertAiUsageAvailable(supabase, workspaceId);
  if (!quota.ok) return quota;

  const [{ data: client }, { data: projects }, { data: firmProfile }] = await Promise.all([
    supabase.from("clients").select("name, email").eq("id", clientId).eq("workspace_id", workspaceId).single(),
    supabase.from("projects").select("title, phase, status").eq("workspace_id", workspaceId).eq("client_id", clientId).is("archived_at", null).limit(5),
    supabase.from("firm_profile").select("firm_name, architect_name").eq("workspace_id", workspaceId).single(),
  ]);

  if (!client) return { ok: false, error: "Client introuvable." };

  const prompt = `Tu es un architecte marocain professionnel. Rédige un email professionnel en français pour ton client.

DESTINATAIRE: ${client.name}${client.email ? ` <${client.email}>` : ""}
EXPÉDITEUR: ${firmProfile?.architect_name ?? "L'architecte"}, ${firmProfile?.firm_name ?? "le cabinet"}
PROJETS EN COURS: ${projects?.map((p) => `${p.title} (phase ${p.phase?.toUpperCase()}, ${p.status})`).join(", ") ?? "Aucun"}

CONTEXTE / OBJET DE L'EMAIL: ${emailContext}

Règles:
- Ton professionnel, chaleureux mais formel
- Formule d'appel appropriée (M./Mme selon le contexte)
- Corps concis et structuré
- Formule de politesse standard marocaine
- Signature avec le nom de l'architecte et du cabinet
- Maximum 200 mots`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    await recordAiUsage(supabase, workspaceId, {
      feature: "client_email",
      provider: "anthropic",
      model: AI_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      metadata: { clientId },
    });

    const email = messageText(response);
    if (!email) return { ok: false, error: "L'IA n'a pas renvoyé de contenu. Veuillez réessayer." };
    return { ok: true, data: { email } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur IA." };
  }
}

export async function classifyFileAction(filename: string, mimeType: string): Promise<Result<{ folder: string; confidence: number }>> {
  const FOLDER_MAP: Record<string, string[]> = {
    Plans: ["dwg", "dxf", "rvt", "ifc", "plan", "facade", "coupe", "masse", "niveau"],
    Rendus: ["render", "rendu", "perspective", "image", "jpg", "jpeg", "png", "webp", "3d", "visualisation"],
    Documents: ["contrat", "contract", "devis", "facture", "rapport", "note", "brief", "pdf", "docx", "doc", "xlsx", "xls"],
    Photos: ["photo", "chantier", "visite", "site"],
  };

  const nameLower = filename.toLowerCase();
  const ext = nameLower.split(".").pop() ?? "";

  for (const [folder, keywords] of Object.entries(FOLDER_MAP)) {
    if (keywords.some((kw) => nameLower.includes(kw) || ext === kw)) {
      return { ok: true, data: { folder, confidence: 0.9 } };
    }
  }

  if (mimeType.startsWith("image/")) return { ok: true, data: { folder: "Rendus", confidence: 0.7 } };
  if (mimeType === "application/pdf") return { ok: true, data: { folder: "Documents", confidence: 0.7 } };

  return { ok: true, data: { folder: "Autre", confidence: 0.5 } };
}
