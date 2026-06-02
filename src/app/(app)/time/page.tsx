import { createClient } from "@/lib/supabase/server";
import { TimeTracker } from "@/components/time/time-tracker";
import { getWorkspaceId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function TimePage() {
  const t = await getTranslations("time");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const workspaceId = await getWorkspaceId(supabase, user?.id);
  if (!workspaceId) redirect("/onboarding");

  // 90 days covers week/month/last-month date range filters on the client
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().slice(0, 10);

  const [{ data: projects }, { data: entries }, { data: tasks }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .neq("status", "termine")
      .order("title"),
    supabase
      .from("time_entries")
      .select("id, project_id, task_id, phase, description, duration_minutes, date, billable, rate_centimes, projects!time_entries_project_id_fkey(title)")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user!.id)
      .gte("date", fromDate)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, project_id")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("title"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">{t("eyebrow")}</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">{t("subtitle")}</p>
      </div>

      <TimeTracker
        projects={projects ?? []}
        tasks={(tasks ?? []) as Parameters<typeof TimeTracker>[0]["tasks"]}
        entries={(entries ?? []) as unknown as Parameters<typeof TimeTracker>[0]["entries"]}
      />
    </div>
  );
}
