"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/workspace";
import type { Result } from "@/types";
import type { SmartAlert } from "@/components/notifications/smart-notifications-panel";

export async function getNotificationAlertsAction(): Promise<Result<SmartAlert[]>> {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  if (!workspace.ok) return { ok: false, error: workspace.error };
  const { workspaceId } = workspace.data;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(today.getDate() + 7);
  const soonStr = inSevenDays.toISOString().slice(0, 10);

  const [
    { data: overdueTasks },
    { data: overdueInvoices },
    { data: expiringDevis },
    { data: pendingApprovals },
    { data: siteIssues },
    { data: riskyProjects },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .neq("status", "termine")
      .not("due_date", "is", null)
      .lt("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("factures")
      .select("id, number, title, total_centimes, due_date")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoyee")
      .not("due_date", "is", null)
      .lt("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("devis")
      .select("id, number, title, total_centimes, valid_until")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoye")
      .not("valid_until", "is", null)
      .gte("valid_until", todayStr)
      .lte("valid_until", soonStr)
      .order("valid_until", { ascending: true })
      .limit(8),
    supabase
      .from("files")
      .select("id, filename, project_id")
      .eq("workspace_id", workspaceId)
      .eq("approval_status", "pending")
      .order("approval_requested_at", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("site_issues")
      .select("id, title, priority, due_date, project_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "resolved")
      .or(`priority.eq.high,due_date.lt.${todayStr}`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("projects")
      .select("id, title, target_end_date")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .neq("status", "termine")
      .not("target_end_date", "is", null)
      .lte("target_end_date", soonStr)
      .order("target_end_date", { ascending: true })
      .limit(8),
  ]);

  const alerts: SmartAlert[] = [
    ...(overdueTasks ?? []).map((task) => ({
      id: `task-${task.id}`,
      type: "task" as const,
      title: task.title,
      detail: "Tâche en retard",
      href: "/tasks",
      dueDate: task.due_date,
    })),
    ...(overdueInvoices ?? []).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "invoice" as const,
      title: `${invoice.number} · ${invoice.title}`,
      detail: "Facture non réglée",
      href: `/factures/${invoice.id}`,
      dueDate: invoice.due_date,
      amountCentimes: invoice.total_centimes,
    })),
    ...(expiringDevis ?? []).map((devis) => ({
      id: `devis-${devis.id}`,
      type: "invoice" as const,
      title: `${devis.number} · ${devis.title}`,
      detail: "Devis bientôt expiré",
      href: `/devis/${devis.id}`,
      dueDate: devis.valid_until,
      amountCentimes: devis.total_centimes,
    })),
    ...(pendingApprovals ?? []).map((file) => ({
      id: `approval-${file.id}`,
      type: "approval" as const,
      title: file.filename,
      detail: "Fichier en attente d'approbation",
      href: `/projects/${file.project_id}/files`,
    })),
    ...(siteIssues ?? []).map((issue) => ({
      id: `issue-${issue.id}`,
      type: "issue" as const,
      title: issue.title,
      detail:
        issue.priority === "high"
          ? "Réserve chantier haute priorité"
          : "Réserve chantier à suivre",
      href: `/projects/${issue.project_id}`,
      dueDate: issue.due_date,
    })),
    ...(riskyProjects ?? []).map((project) => ({
      id: `risk-${project.id}`,
      type: "risk" as const,
      title: project.title,
      detail: "Échéance projet proche",
      href: `/projects/${project.id}`,
      dueDate: project.target_end_date,
    })),
  ].slice(0, 20);

  return { ok: true, data: alerts };
}
