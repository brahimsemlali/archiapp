import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface WorkloadMemberRow {
  userId: string;
  role: string;
  assignedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  minutesThisWeek: number;
  projects: Array<{ id: string; title: string }>;
}

export interface UnassignedTaskRow {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  projects?: { id: string; title: string } | { id: string; title: string }[] | null;
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function WorkloadDashboard({
  members,
  unassignedTasks,
}: {
  members: WorkloadMemberRow[];
  unassignedTasks: UnassignedTaskRow[];
}) {
  const overloaded = members.filter((member) => member.assignedTasks >= 8 || member.minutesThisWeek >= 2100 || member.overdueTasks > 0);
  const totalOpen = members.reduce((sum, member) => sum + member.assignedTasks, 0) + unassignedTasks.length;
  const totalHours = Math.round(members.reduce((sum, member) => sum + member.minutesThisWeek, 0) / 60);
  const weeklyCapacityHours = members.length * 35;
  const remainingCapacity = Math.max(0, weeklyCapacityHours - totalHours);
  const utilizationPct = weeklyCapacityHours > 0 ? Math.min(140, Math.round((totalHours / weeklyCapacityHours) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Tâches ouvertes" value={String(totalOpen)} />
        <Metric label="Utilisation" value={members.length > 0 ? `${utilizationPct}%` : "—"} danger={utilizationPct >= 100} />
        <Metric label="Capacité restante" value={members.length > 0 ? `${remainingCapacity}h` : "—"} danger={remainingCapacity === 0 && members.length > 0} />
        <Metric label="Profils surchargés" value={String(overloaded.length)} danger={overloaded.length > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Disponibilité équipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-[#64748B]">Aucun membre d'équipe dans cet espace.</p>
            ) : (
              members.map((member) => {
                const hours = Math.round(member.minutesThisWeek / 60);
                const taskLoadPct = Math.round((member.assignedTasks / 10) * 100);
                const timeLoadPct = Math.round((hours / 35) * 100);
                const loadPct = Math.min(100, Math.max(taskLoadPct, timeLoadPct));
                const remainingHours = Math.max(0, 35 - hours);
                const status = member.overdueTasks > 0 || member.assignedTasks >= 8 || hours >= 35
                  ? "overloaded"
                  : member.assignedTasks >= 5 || hours >= 25
                  ? "busy"
                  : "available";
                return (
                  <div key={member.userId} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-[#64748B]" />
                          <p className="font-semibold text-[#0B1220]">{member.userId.slice(0, 8)}</p>
                          <span className="text-xs text-[#ADAB9D]">{member.role}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {member.assignedTasks} tâche(s) ouvertes · {hours}h cette semaine · {remainingHours}h dispo
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[#F1F5F9]">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          status === "overloaded" ? "bg-[#C75B2E]" : status === "busy" ? "bg-amber-500" : "bg-[#2F8F5C]"
                        )}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748B]">
                      <span className="rounded-full bg-[#F7F8FA] px-2 py-0.5">{loadPct}% charge</span>
                      {member.overdueTasks > 0 && <span className="rounded-full bg-[#FCEFE6] px-2 py-0.5 text-[#C75B2E]">{member.overdueTasks} en retard</span>}
                      {member.dueSoonTasks > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{member.dueSoonTasks} cette semaine</span>}
                      {member.projects.slice(0, 3).map((project) => (
                        <Link key={project.id} href={`/projects/${project.id}`} className="rounded-full bg-[#F7F8FA] px-2 py-0.5 hover:underline">
                          {project.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>À assigner</CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8D5CB] p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#B9DEC8]" />
                <p className="text-sm text-[#64748B]">Toutes les tâches sont assignées.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-[#E5E7EB] p-3">
                    <p className="text-sm font-medium text-[#0B1220]">{task.title}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {relationOne(task.projects)?.title ?? "Sans projet"}{task.due_date ? ` · ${formatDate(task.due_date)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", danger ? "text-[#C75B2E]" : "text-[#0B1220]")}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "available" | "busy" | "overloaded" }) {
  if (status === "overloaded") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#FCEFE6] px-2 py-0.5 text-xs font-semibold text-[#C75B2E]"><AlertTriangle className="h-3 w-3" />Surcharge</span>;
  }
  if (status === "busy") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"><Clock className="h-3 w-3" />Chargé</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F3EB] px-2 py-0.5 text-xs font-semibold text-[#2F8F5C]"><CheckCircle2 className="h-3 w-3" />Disponible</span>;
}
