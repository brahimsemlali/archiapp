import "server-only";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/admin/auth";

export interface SuperadminAuditEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  workspaceId: string | null;
  detail: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "superadmin.workspace_updated": "Workspace modifié",
  "superadmin.owner_banned": "Login owner bloqué",
  "superadmin.owner_unbanned": "Login owner réactivé",
  "superadmin.user_banned": "Utilisateur bloqué",
  "superadmin.user_unbanned": "Utilisateur réactivé",
  "superadmin.workspace_repaired": "Workspace créé/réparé",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/^superadmin\./, "");
}

/** Recent superadmin actions, for the accountability/audit panel. The panel
 *  performs destructive controls (bans, plan/status changes) — showing who did
 *  what, when, is the accountability half of that power. */
export async function listSuperadminAudit(limit = 40): Promise<SuperadminAuditEntry[]> {
  const supabase = await createClient();
  await requireSuperadmin(supabase);
  const serviceSupabase = await createServiceClient();

  const { data, error } = await serviceSupabase
    .from("activity_log")
    .select("id, action, workspace_id, metadata, created_at")
    .like("action", "superadmin.%")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const detailBits: string[] = [];
    if (typeof meta.plan === "string") detailBits.push(`plan=${meta.plan}`);
    if (typeof meta.account_status === "string") detailBits.push(meta.account_status);
    if (typeof meta.user_email === "string") detailBits.push(meta.user_email);
    if (typeof meta.suspended_reason === "string" && meta.suspended_reason) detailBits.push(meta.suspended_reason);
    return {
      id: row.id,
      action: row.action,
      actorEmail: typeof meta.actor_email === "string" ? meta.actor_email : null,
      workspaceId: row.workspace_id,
      detail: detailBits.length ? detailBits.join(" · ") : null,
      createdAt: row.created_at,
    } satisfies SuperadminAuditEntry;
  });
}
