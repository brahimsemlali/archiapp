import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/workspace";
import { assertAiUsageAvailable, recordAiUsage } from "@/lib/ai/usage";
import { AI_MODEL, anthropic, messageText } from "@/lib/ai/anthropic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const workspace = await requireActiveWorkspace(supabase, user.id);
  if (!workspace.ok) return NextResponse.json({ error: workspace.error }, { status: 403 });
  const { workspaceId } = workspace.data;
  const quota = await assertAiUsageAvailable(supabase, workspaceId);
  if (!quota.ok) return NextResponse.json({ error: quota.error }, { status: quota.code === "rate_limited" ? 429 : 402 });

  let body: { projectTitle?: string; observations?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { projectTitle, observations, date } = body;

  if (!observations) return NextResponse.json({ error: "Observations manquantes." }, { status: 400 });

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      system: `Tu es un assistant spécialisé dans la rédaction de comptes-rendus de visite de chantier pour des architectes au Maroc.
Tu rédiges en français professionnel et concis.
Ton rôle est de synthétiser les observations de chantier en un compte-rendu structuré, clair et professionnel.
Format : paragraphes en texte brut, pas de markdown ni de titres.
Ton : objectif, factuel, professionnel.`,
      messages: [
        {
          role: "user",
          content: `Rédige une synthèse professionnelle de cette visite de chantier :

Projet : ${projectTitle ?? "Non précisé"}
Date : ${date ?? new Date().toLocaleDateString("fr-MA")}

Observations relevées :
${observations}

Écris une synthèse de 3-5 phrases résumant l'état d'avancement général, les points de vigilance, et les actions à suivre si nécessaire.`,
        },
      ],
    });
    await recordAiUsage(supabase, workspaceId, {
      feature: "site_visit_summary",
      provider: "anthropic",
      model: AI_MODEL,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return NextResponse.json({ summary: messageText(message) });
  } catch (err) {
    console.error("[ai/visites/summarize]", err);
    return NextResponse.json({ error: "Le service IA est momentanément indisponible. Veuillez réessayer." }, { status: 502 });
  }
}
