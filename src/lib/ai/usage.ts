import type { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/billing/plans";
import { assertRateLimit } from "@/lib/security/rate-limit";
import type { Result } from "@/types";

interface AiUsageInput {
  feature: string;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  metadata?: Record<string, unknown>;
}

export async function recordAiUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  input: AiUsageInput
) {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("ai_usage_logs").insert({
    workspace_id: workspaceId,
    user_id: user?.id ?? null,
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    input_tokens: input.inputTokens ?? null,
    output_tokens: input.outputTokens ?? null,
    metadata: input.metadata ?? {},
  });
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function assertAiUsageAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
): Promise<Result<void>> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [{ data: workspace }, { count, error }] = await Promise.all([
    supabase.from("workspaces").select("plan").eq("id", workspaceId).single(),
    supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStart),
  ]);

  if (error) return { ok: false, error: error.message };

  const limits = getPlanLimits(workspace?.plan);
  if (!limits.aiEnabled || limits.aiCalls <= 0) {
    return {
      ok: false,
      error: `L'IA est désactivée sur le plan ${limits.label}. Passez à un plan IA pour l'utiliser.`,
    };
  }

  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "Le module IA n'est pas configuré pour cet environnement.",
    };
  }

  if ((count ?? 0) >= limits.aiCalls) {
    return {
      ok: false,
      error: `Limite IA atteinte pour le plan ${limits.label} (${limits.aiCalls} appels/mois).`,
    };
  }

  const burstLimit = await assertRateLimit({
    action: "ai.workspace_call",
    key: workspaceId,
    limit: Math.min(20, Math.max(5, limits.aiCalls)),
    windowSeconds: 10 * 60,
  });
  if (!burstLimit.ok) return burstLimit;

  return { ok: true, data: undefined };
}
