import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json() as { projectTitle?: string; observations?: string; date?: string };
  const { projectTitle, observations, date } = body;

  if (!observations) return NextResponse.json({ error: "Observations manquantes." }, { status: 400 });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
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

  const summary = message.content[0]?.type === "text" ? message.content[0].text : "";
  return NextResponse.json({ summary });
}
