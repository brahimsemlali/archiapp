import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL, anthropic, messageText } from "@/lib/ai/anthropic";
import { formatMoney } from "@/lib/format";
import { getWorkspaceLocalization } from "@/lib/localization";
import { requireActiveWorkspace } from "@/lib/workspace";
import { assertAiUsageAvailable, recordAiUsage } from "@/lib/ai/usage";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const workspace = await requireActiveWorkspace(supabase, user.id);
  if (!workspace.ok) return NextResponse.json({ error: workspace.error }, { status: 403 });
  const { workspaceId } = workspace.data;
  const quota = await assertAiUsageAvailable(supabase, workspaceId);
  if (!quota.ok) return NextResponse.json({ error: quota.error }, { status: quota.code === "rate_limited" ? 429 : 402 });
  const { currency } = await getWorkspaceLocalization(supabase, workspaceId);
  const money = (centimes: number) => formatMoney(centimes, currency);

  let data: {
    overdueInvoices: Array<{ number: string; amount: number; daysLate: number; client: string }>;
    expiringDevis: Array<{ number: string; daysLeft: number }>;
    budgetOverruns: Array<{ project: string; overrunPct: number }>;
    upcomingDeadlines: Array<{ project: string; daysLeft: number }>;
    totalOutstanding: number;
  };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("fr-MA", { day: "numeric", month: "long", year: "numeric" });

  const prompt = `Tu es le conseiller de gestion d'un cabinet d'architecture marocain.
Date du jour : ${today}.

Données de santé du cabinet :
- Total à encaisser : ${money(data.totalOutstanding)}
- Factures en retard (${data.overdueInvoices.length}) : ${data.overdueInvoices.map((f) => `${f.number} (${f.client}, ${f.daysLate}j de retard, ${money(f.amount)})`).join(" | ") || "Aucune"}
- Devis expirant bientôt (${data.expiringDevis.length}) : ${data.expiringDevis.map((d) => `${d.number} (dans ${d.daysLeft}j)`).join(" | ") || "Aucun"}
- Projets dépassant le budget temps (${data.budgetOverruns.length}) : ${data.budgetOverruns.map((b) => `${b.project} (+${b.overrunPct}%)`).join(" | ") || "Aucun"}
- Deadlines projets imminentes (${data.upcomingDeadlines.length}) : ${data.upcomingDeadlines.map((d) => `${d.project} (dans ${d.daysLeft}j)`).join(" | ") || "Aucune"}

Rédigez un bilan hebdomadaire professionnel de 3-4 paragraphes en français, structuré ainsi :
1. Situation financière globale (encaissements, retards)
2. Actions prioritaires cette semaine (maximum 3 points actionnables)
3. Points de vigilance à moyen terme

Ton direct, professionnel, sans formules creuses. Maximum 200 mots.`;

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    await recordAiUsage(supabase, workspaceId, {
      feature: "dashboard_digest",
      provider: "anthropic",
      model: AI_MODEL,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return NextResponse.json({ digest: messageText(message) });
  } catch (err) {
    console.error("[ai/digest]", err);
    return NextResponse.json({ error: "Le service IA est momentanément indisponible. Veuillez réessayer." }, { status: 502 });
  }
}
