import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyWorkspace } from "@/lib/push";

const BATCH_SIZE = 10;

// Called daily by Vercel Cron (see vercel.json).
// Sends push notifications for overdue invoices and tasks due today.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: activeWorkspaces } = await supabase
    .from("push_subscriptions")
    .select("workspace_id")
    .neq("workspace_id", null);

  const workspaceIds = [...new Set((activeWorkspaces ?? []).map((r) => r.workspace_id))];
  if (!workspaceIds.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  // Process in parallel batches to avoid overwhelming the DB
  for (let i = 0; i < workspaceIds.length; i += BATCH_SIZE) {
    const batch = workspaceIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (workspaceId) => {
        const [{ data: overdueInvoices }, { data: tasksDueToday }] = await Promise.all([
          supabase
            .from("factures")
            .select("id, number, title")
            .eq("workspace_id", workspaceId)
            .eq("status", "envoyee")
            .not("due_date", "is", null)
            .lt("due_date", todayStr)
            .limit(5),
          supabase
            .from("tasks")
            .select("id, title")
            .eq("workspace_id", workspaceId)
            .is("archived_at", null)
            .neq("status", "termine")
            .eq("due_date", todayStr)
            .limit(5),
        ]);

        let notified = 0;
        if ((overdueInvoices?.length ?? 0) > 0) {
          const count = overdueInvoices!.length;
          await notifyWorkspace(supabase, workspaceId, {
            title: `${count} facture${count > 1 ? "s" : ""} en retard`,
            body: overdueInvoices!.map((f) => f.number).join(", "),
            href: "/factures",
          });
          notified++;
        }
        if ((tasksDueToday?.length ?? 0) > 0) {
          const count = tasksDueToday!.length;
          await notifyWorkspace(supabase, workspaceId, {
            title: `${count} tâche${count > 1 ? "s" : ""} à rendre aujourd'hui`,
            body: tasksDueToday!.map((t) => t.title).join(", "),
            href: "/tasks",
          });
          notified++;
        }
        return notified;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") sent += result.value;
    }
  }

  return NextResponse.json({ sent, workspaces: workspaceIds.length });
}
