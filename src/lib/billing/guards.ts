import type { createClient } from "@/lib/supabase/server";
import { getPlanLimits, PLAN_LIMITS } from "@/lib/billing/plans";
import type { Result } from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface WorkspaceInfo {
  plan: string | null;
  trial_ends_at: string | null;
}

async function getWorkspaceInfo(supabase: SupabaseServerClient, workspaceId: string): Promise<Result<{ limits: ReturnType<typeof getPlanLimits>; onTrial: boolean }>> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("plan, trial_ends_at")
    .eq("id", workspaceId)
    .single();

  if (error) return { ok: false, error: error.message };

  const ws = data as WorkspaceInfo;
  const onTrial = ws.trial_ends_at != null && new Date(ws.trial_ends_at) > new Date();

  // During trial, use studio limits regardless of current plan
  const limits = onTrial ? PLAN_LIMITS.studio : getPlanLimits(ws.plan);
  return { ok: true, data: { limits, onTrial } };
}

export async function assertSeatAvailable(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<Result<void>> {
  const info = await getWorkspaceInfo(supabase, workspaceId);
  if (!info.ok) return info;

  const { limits } = info.data;

  const [{ count: membersCount, error: membersError }, { count: invitesCount, error: invitesError }] = await Promise.all([
    supabase.from("workspace_members").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase
      .from("workspace_invites")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending"),
  ]);

  if (membersError) return { ok: false, error: membersError.message };
  if (invitesError) return { ok: false, error: invitesError.message };

  const usedSeats = (membersCount ?? 0) + (invitesCount ?? 0);
  if (usedSeats >= limits.seats) {
    return {
      ok: false,
      error: `Limite d'utilisateurs atteinte (plan ${limits.label} · ${limits.seats} siège${limits.seats > 1 ? "s" : ""}). Passez à un plan supérieur pour ajouter des membres.`,
      code: "upgrade_required",
    };
  }

  return { ok: true, data: undefined };
}

export async function assertProjectAvailable(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<Result<void>> {
  const info = await getWorkspaceInfo(supabase, workspaceId);
  if (!info.ok) return info;

  const { limits } = info.data;
  if (limits.projects === null) return { ok: true, data: undefined };

  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  if (error) return { ok: false, error: error.message };
  if ((count ?? 0) >= limits.projects) {
    return {
      ok: false,
      error: `Limite de projets atteinte (plan ${limits.label} · ${limits.projects} projets). Passez à Studio AI pour des projets illimités.`,
      code: "upgrade_required",
    };
  }

  return { ok: true, data: undefined };
}

export async function assertStorageAvailable(
  supabase: SupabaseServerClient,
  workspaceId: string,
  additionalBytes: number
): Promise<Result<void>> {
  const info = await getWorkspaceInfo(supabase, workspaceId);
  if (!info.ok) return info;

  const { limits } = info.data;

  const { data, error } = await supabase
    .from("files")
    .select("size_bytes")
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  const currentBytes = (data ?? []).reduce((sum, file) => sum + Number(file.size_bytes ?? 0), 0);
  const limitBytes = limits.storageGb * 1024 * 1024 * 1024;

  if (currentBytes + additionalBytes > limitBytes) {
    return {
      ok: false,
      error: `Limite de stockage atteinte (plan ${limits.label} · ${limits.storageGb} Go). Passez à un plan supérieur pour plus d'espace.`,
      code: "upgrade_required",
    };
  }

  return { ok: true, data: undefined };
}

export async function assertAiAvailable(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<Result<void>> {
  const info = await getWorkspaceInfo(supabase, workspaceId);
  if (!info.ok) return info;

  const { limits } = info.data;

  if (!limits.aiEnabled) {
    return {
      ok: false,
      error: `L'IA est disponible à partir du plan Studio AI (${PLAN_LIMITS.studio.monthlyPriceMad} MAD/mois). Passez à la version payante pour accéder à toutes les fonctionnalités IA.`,
      code: "upgrade_required",
    };
  }

  return { ok: true, data: undefined };
}

export async function getTrialInfo(
  supabase: SupabaseServerClient,
  workspaceId: string
): Promise<{ onTrial: boolean; daysLeft: number; trialEndsAt: Date | null }> {
  const { data } = await supabase
    .from("workspaces")
    .select("trial_ends_at")
    .eq("id", workspaceId)
    .single();

  if (!data?.trial_ends_at) return { onTrial: false, daysLeft: 0, trialEndsAt: null };

  const trialEndsAt = new Date(data.trial_ends_at);
  const now = new Date();
  const msLeft = trialEndsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const onTrial = msLeft > 0;

  return { onTrial, daysLeft, trialEndsAt };
}
