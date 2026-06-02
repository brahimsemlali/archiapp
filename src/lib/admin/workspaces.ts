import "server-only";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/admin/auth";

export type AdminWorkspace = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerBannedUntil: string | null;
  plan: "solo" | "studio" | "agence";
  accountStatus: "active" | "suspended" | "cancelled";
  subscriptionStatus: "manual" | "trialing" | "active" | "past_due" | "paused" | "cancelled";
  subscriptionSource: "manual" | "lemonsqueezy";
  lemonSqueezyCustomerId: string | null;
  lemonSqueezySubscriptionId: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  projectsCount: number;
  clientsCount: number;
  storageBytes: number;
  aiCallsThisMonth: number;
  lastActivityAt: string | null;
};

export async function listAdminWorkspaces(query?: string): Promise<AdminWorkspace[]> {
  const supabase = await createClient();
  await requireSuperadmin(supabase);

  const serviceSupabase = await createServiceClient();
  const { data: usersResult, error: usersError } = await serviceSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) throw new Error(usersError.message);

  const [
    workspacesResult,
    membersResult,
    projectsResult,
    clientsResult,
    filesResult,
    aiUsageResult,
    activityResult,
  ] = await Promise.all([
    serviceSupabase
      .from("workspaces")
      .select(`
        id,
        name,
        owner_id,
        plan,
        account_status,
        subscription_status,
        subscription_source,
        lemon_squeezy_customer_id,
        lemon_squeezy_subscription_id,
        current_period_end,
        trial_ends_at,
        suspended_at,
        suspended_reason,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false })
      .limit(500),
    serviceSupabase.from("workspace_members").select("workspace_id"),
    serviceSupabase
      .from("projects")
      .select("workspace_id")
      .is("archived_at", null),
    serviceSupabase
      .from("clients")
      .select("workspace_id")
      .is("archived_at", null),
    serviceSupabase
      .from("files")
      .select("workspace_id, size_bytes"),
    serviceSupabase
      .from("ai_usage_logs")
      .select("workspace_id")
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    serviceSupabase
      .from("activity_log")
      .select("workspace_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  if (workspacesResult.error) throw new Error(workspacesResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (filesResult.error) throw new Error(filesResult.error.message);
  if (aiUsageResult.error) throw new Error(aiUsageResult.error.message);
  if (activityResult.error) throw new Error(activityResult.error.message);

  const authUsersById = new Map(
    usersResult.users.map((user) => [user.id, user])
  );
  const membersByWorkspace = countByWorkspace(membersResult.data ?? []);
  const projectsByWorkspace = countByWorkspace(projectsResult.data ?? []);
  const clientsByWorkspace = countByWorkspace(clientsResult.data ?? []);
  const aiByWorkspace = countByWorkspace(aiUsageResult.data ?? []);
  const storageByWorkspace = sumBytesByWorkspace(filesResult.data ?? []);
  const lastActivityByWorkspace = latestActivityByWorkspace(activityResult.data ?? []);

  const enriched = (workspacesResult.data ?? []).map((workspace) => {
    const owner = authUsersById.get(workspace.owner_id);

    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.owner_id,
      ownerEmail: owner?.email ?? null,
      ownerBannedUntil: owner?.banned_until ?? null,
      plan: workspace.plan,
      accountStatus: workspace.account_status,
      subscriptionStatus: workspace.subscription_status,
      subscriptionSource: workspace.subscription_source,
      lemonSqueezyCustomerId: workspace.lemon_squeezy_customer_id,
      lemonSqueezySubscriptionId: workspace.lemon_squeezy_subscription_id,
      currentPeriodEnd: workspace.current_period_end,
      trialEndsAt: workspace.trial_ends_at,
      suspendedAt: workspace.suspended_at,
      suspendedReason: workspace.suspended_reason,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
      membersCount: membersByWorkspace.get(workspace.id) ?? 0,
      projectsCount: projectsByWorkspace.get(workspace.id) ?? 0,
      clientsCount: clientsByWorkspace.get(workspace.id) ?? 0,
      storageBytes: storageByWorkspace.get(workspace.id) ?? 0,
      aiCallsThisMonth: aiByWorkspace.get(workspace.id) ?? 0,
      lastActivityAt: lastActivityByWorkspace.get(workspace.id) ?? null,
    } satisfies AdminWorkspace;
  });

  const search = query?.trim().toLowerCase();
  if (!search) return enriched;

  return enriched.filter((workspace) => (
    workspace.name.toLowerCase().includes(search) ||
    workspace.ownerEmail?.toLowerCase().includes(search) ||
    workspace.id.toLowerCase().includes(search) ||
    workspace.ownerId.toLowerCase().includes(search) ||
    workspace.lemonSqueezyCustomerId?.toLowerCase().includes(search) ||
    workspace.lemonSqueezySubscriptionId?.toLowerCase().includes(search)
  ));
}

function sumBytesByWorkspace(rows: Array<{ workspace_id: string | null; size_bytes: number | string | null }>) {
  const sums = new Map<string, number>();
  for (const row of rows) {
    if (!row.workspace_id) continue;
    sums.set(row.workspace_id, (sums.get(row.workspace_id) ?? 0) + Number(row.size_bytes ?? 0));
  }
  return sums;
}

function latestActivityByWorkspace(rows: Array<{ workspace_id: string | null; created_at: string | null }>) {
  const latest = new Map<string, string>();
  for (const row of rows) {
    if (!row.workspace_id || !row.created_at) continue;
    if (!latest.has(row.workspace_id)) latest.set(row.workspace_id, row.created_at);
  }
  return latest;
}

function countByWorkspace(rows: Array<{ workspace_id: string | null }>) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.workspace_id) continue;
    counts.set(row.workspace_id, (counts.get(row.workspace_id) ?? 0) + 1);
  }

  return counts;
}
