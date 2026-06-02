import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, CalendarDays } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";
import { CalendarView, type CalendarEvent } from "@/components/tasks/calendar-view";
import { getTranslations } from "next-intl/server";

export default async function TasksPage() {
  const t = await getTranslations("tasks");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const [
    { data: tasks },
    { data: projects },
    { data: clients },
    { data: members },
    { data: deadlineProjects },
    { data: expiringDevis },
    { data: dueFactures },
    { data: siteVisits },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects!tasks_project_id_fkey(title), clients!tasks_client_id_fkey(name)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, client_id")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .neq("status", "termine")
      .order("title"),
    supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId),
    supabase
      .from("projects")
      .select("id, title, target_end_date")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .not("target_end_date", "is", null)
      .order("target_end_date"),
    supabase
      .from("devis")
      .select("id, title, number, valid_until")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoye")
      .not("valid_until", "is", null)
      .order("valid_until"),
    supabase
      .from("factures")
      .select("id, title, number, due_date")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoyee")
      .not("due_date", "is", null)
      .order("due_date"),
    supabase
      .from("site_visits")
      .select("id, title, visit_date")
      .eq("workspace_id", workspaceId)
      .order("visit_date", { ascending: false })
      .limit(60),
  ]);

  const calendarEvents: CalendarEvent[] = [
    ...(tasks ?? [])
      .filter((t) => t.due_date && t.status !== "termine")
      .map((t) => ({
        id: `task-${t.id}`,
        date: t.due_date as string,
        label: t.title,
        type: "task" as const,
        priority: t.priority,
        status: t.status,
        href: `/tasks`,
      })),
    ...(deadlineProjects ?? [])
      .filter((p) => p.target_end_date)
      .map((p) => ({
        id: `proj-${p.id}`,
        date: p.target_end_date as string,
        label: p.title,
        type: "project_deadline" as const,
        href: `/projects/${p.id}`,
      })),
    ...(expiringDevis ?? [])
      .filter((d) => d.valid_until)
      .map((d) => ({
        id: `devis-${d.id}`,
        date: d.valid_until as string,
        label: `${d.number} — ${d.title}`,
        type: "devis_expiry" as const,
        href: `/devis/${d.id}`,
      })),
    ...(dueFactures ?? [])
      .filter((f) => f.due_date)
      .map((f) => ({
        id: `facture-${f.id}`,
        date: f.due_date as string,
        label: `${f.number} — ${f.title}`,
        type: "facture_due" as const,
        href: `/factures/${f.id}`,
      })),
    ...(siteVisits ?? [])
      .filter((v) => v.visit_date)
      .map((v) => ({
        id: `visite-${v.id}`,
        date: v.visit_date as string,
        label: v.title,
        type: "visite" as const,
      })),
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="pt-1">
        <p className="eyebrow mb-1">{t("eyebrow")}</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">
          {t("subtitle")}
        </p>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="h-9 bg-[#F1F5F9] border border-[#E5E7EB] p-0.5 rounded-lg">
          <TabsTrigger value="list" className="gap-2 text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#0B1220] text-[#64748B]">
            <ListTodo className="h-3.5 w-3.5" />
            {t("viewList")}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#0B1220] text-[#64748B]">
            <CalendarDays className="h-3.5 w-3.5" />
            {t("viewCalendar")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <TaskList
            tasks={tasks ?? []}
            projects={projects ?? []}
            clients={clients ?? []}
            members={(members ?? []).map((m) => ({ userId: m.user_id, role: m.role }))}
            currentUserId={user?.id ?? ""}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <CalendarView
            events={calendarEvents}
            projects={projects ?? []}
            clients={clients ?? []}
            members={(members ?? []).map((m) => ({ userId: m.user_id, role: m.role }))}
            currentUserId={user?.id ?? ""}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
