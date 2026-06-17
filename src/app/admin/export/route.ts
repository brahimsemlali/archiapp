import { createClient } from "@/lib/supabase/server";
import { getSuperadminUser } from "@/lib/admin/auth";
import { listAdminWorkspaces } from "@/lib/admin/workspaces";
import { getPlanLimits } from "@/lib/billing/plans";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Superadmin-only CSV export of all workspaces for offline analysis / accounting. */
export async function GET() {
  const supabase = await createClient();
  const user = await getSuperadminUser(supabase);
  if (!user) return new Response("Not found", { status: 404 });

  const workspaces = await listAdminWorkspaces();
  const headers = [
    "workspace_id", "name", "owner_email", "plan", "monthly_price_mad",
    "account_status", "subscription_status", "subscription_source",
    "lemon_subscription_id", "current_period_end", "trial_ends_at",
    "members", "projects", "clients", "storage_bytes", "ai_calls_month",
    "created_at", "last_activity_at",
  ];

  const rows = workspaces.map((w) => [
    w.id, w.name, w.ownerEmail ?? "", w.plan, getPlanLimits(w.plan).monthlyPriceMad,
    w.accountStatus, w.subscriptionStatus, w.subscriptionSource,
    w.lemonSqueezySubscriptionId ?? "", w.currentPeriodEnd ?? "", w.trialEndsAt ?? "",
    w.membersCount, w.projectsCount, w.clientsCount, w.storageBytes, w.aiCallsThisMonth,
    w.createdAt, w.lastActivityAt ?? "",
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `archidesk-workspaces-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
