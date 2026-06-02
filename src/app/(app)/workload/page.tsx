import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { SmartNotificationsPanel, type SmartAlert } from "@/components/notifications/smart-notifications-panel";
import { WorkloadDashboard, type UnassignedTaskRow, type WorkloadMemberRow } from "@/components/workload/workload-dashboard";

export default async function WorkloadPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(today.getDate() + 7);
  const soonStr = inSevenDays.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  weekStart.setDate(today.getDate() - daysSinceMonday);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [
    { data: members },
    { data: tasks },
    { data: timeEntries },
    { data: overdueInvoices },
    { data: pendingApprovals },
    { data: siteIssues },
    { data: riskyProjects },
  ] = await Promise.all([
    workspaceId
      ? supabase.from("workspace_members").select("user_id, role").eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("tasks")
        .select("id, title, assigned_to, due_date, priority, status, project_id, projects!tasks_project_id_fkey(id, title)")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .neq("status", "termine")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("time_entries")
        .select("id, user_id, duration_minutes")
        .eq("workspace_id", workspaceId)
        .gte("date", weekStartStr)
        .limit(1000)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("factures")
        .select("id, number, title, total_centimes, due_date, projects!factures_project_id_fkey(id, title)")
        .eq("workspace_id", workspaceId)
        .eq("status", "envoyee")
        .lt("due_date", todayStr)
        .order("due_date", { ascending: true })
        .limit(8)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("files")
        .select("id, filename, project_id, projects!files_project_id_fkey(id, title)")
        .eq("workspace_id", workspaceId)
        .eq("approval_status", "pending")
        .order("approval_requested_at", { ascending: true, nullsFirst: false })
        .limit(8)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("site_issues")
        .select("id, title, priority, due_date, status, project_id, projects!site_issues_project_id_fkey(id, title)")
        .eq("workspace_id", workspaceId)
        .neq("status", "resolved")
        .or(`priority.eq.high,due_date.lt.${todayStr}`)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(8)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
        .from("projects")
        .select("id, title, target_end_date, status")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .neq("status", "termine")
        .lte("target_end_date", soonStr)
        .order("target_end_date", { ascending: true })
        .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const memberRows: WorkloadMemberRow[] = (members ?? []).map((member) => {
    const assigned = (tasks ?? []).filter((task) => task.assigned_to === member.user_id);
    const projectMap = new Map<string, { id: string; title: string }>();
    for (const task of assigned) {
      const project = (Array.isArray(task.projects) ? task.projects[0] : task.projects) as { id: string; title: string } | null;
      if (project) projectMap.set(project.id, project);
    }
    return {
      userId: member.user_id,
      role: member.role,
      assignedTasks: assigned.length,
      overdueTasks: assigned.filter((task) => task.due_date && task.due_date < todayStr).length,
      dueSoonTasks: assigned.filter((task) => task.due_date && task.due_date >= todayStr && task.due_date <= soonStr).length,
      minutesThisWeek: (timeEntries ?? []).filter((entry) => entry.user_id === member.user_id).reduce((sum, entry) => sum + entry.duration_minutes, 0),
      projects: Array.from(projectMap.values()),
    };
  });

  const unassignedTasks = (tasks ?? []).filter((task) => !task.assigned_to) as unknown as UnassignedTaskRow[];

  const alerts: SmartAlert[] = [
    ...(tasks ?? [])
      .filter((task) => task.due_date && task.due_date < todayStr)
      .slice(0, 8)
      .map((task) => ({
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
      detail: "Facture envoyée non réglée",
      href: `/factures/${invoice.id}`,
      dueDate: invoice.due_date,
      amountCentimes: invoice.total_centimes,
    })),
    ...(pendingApprovals ?? []).map((file) => ({
      id: `approval-${file.id}`,
      type: "approval" as const,
      title: file.filename,
      detail: "Fichier en attente d'approbation client",
      href: `/projects/${file.project_id}/files`,
    })),
    ...(siteIssues ?? []).map((issue) => ({
      id: `issue-${issue.id}`,
      type: "issue" as const,
      title: issue.title,
      detail: issue.priority === "high" ? "Réserve chantier haute priorité" : "Réserve chantier à suivre",
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
  ].slice(0, 18);

  return (
    <div className="max-w-7xl space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">Planning</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">Charge équipe & alertes</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          Visualisez la disponibilité, les surcharges et les alertes opérationnelles critiques.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.55fr]">
        <WorkloadDashboard members={memberRows} unassignedTasks={unassignedTasks} />
        <SmartNotificationsPanel alerts={alerts} />
      </div>
    </div>
  );
}
