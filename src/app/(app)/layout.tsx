import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PwaRegister } from "@/components/pwa-register";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AppContentShell } from "@/components/layout/app-content-shell";
import { getWorkspaceId } from "@/lib/workspace";
import { TrialBanner } from "@/components/billing/trial-banner";
import { getTrialInfo } from "@/lib/billing/guards";
import { resolveLocalization } from "@/lib/country-packs";
import { LocalizationProvider } from "@/components/localization-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get workspace info — works for both owners and members (via workspace_members RLS)
  const [workspaceId, locale] = await Promise.all([
    getWorkspaceId(supabase, user.id),
    getLocale(),
  ]);
  const trialInfo = workspaceId ? await getTrialInfo(supabase, workspaceId) : null;
  const { data: workspace } = workspaceId
    ? await supabase.from("workspaces").select("id, name, account_status").eq("id", workspaceId).single()
    : { data: null };
  const { data: workspaceMemberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces!workspace_members_workspace_id_fkey(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });
  const [{ data: timerProjects }, { data: timerTasks }] = workspaceId
    ? await Promise.all([
        supabase
          .from("projects")
          .select("id, title")
          .eq("workspace_id", workspaceId)
          .is("archived_at", null)
          .neq("status", "termine")
          .order("title"),
        supabase
          .from("tasks")
          .select("id, title, project_id")
          .eq("workspace_id", workspaceId)
          .is("archived_at", null)
          .order("title"),
      ])
    : [{ data: [] }, { data: [] }];
  const workspaces = (workspaceMemberships ?? []).map((membership) => {
    const linkedWorkspace = Array.isArray(membership.workspaces)
      ? membership.workspaces[0]
      : membership.workspaces;

    return {
      id: membership.workspace_id,
      name: linkedWorkspace?.name ?? "Cabinet",
      role: membership.role,
    };
  });

  let firmProfile: Record<string, unknown> | null = null;
  if (workspace?.id) {
    if (workspace.account_status === "suspended" || workspace.account_status === "cancelled") {
      redirect("/account-suspended");
    }

    // select * (not named columns) so this works before and after the
    // worldwide_localization migration adds the localization columns
    const { data: profile } = await supabase
      .from("firm_profile")
      .select("*")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!profile?.firm_name) {
      redirect("/onboarding");
    }
    firmProfile = profile;
  }
  const localization = resolveLocalization(firmProfile);

  return (
    <LocalizationProvider value={localization}>
    <div className="premium-app-shell flex h-dvh min-h-dvh overflow-hidden bg-[#F7F8FA]">
      <Sidebar
        userEmail={user.email}
        workspaceName={workspace?.name}
        activeWorkspaceId={workspaceId}
        workspaces={workspaces}
        locale={locale}
      />
      <div className="premium-main flex-1 flex flex-col overflow-hidden">
        <Header
          activeWorkspaceId={workspaceId}
          workspaces={workspaces}
          projects={timerProjects ?? []}
          tasks={timerTasks ?? []}
        />
        {trialInfo?.onTrial && <TrialBanner daysLeft={trialInfo.daysLeft} />}
        <main className="flex-1 overflow-y-auto p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6">
          <AppContentShell>{children}</AppContentShell>
        </main>
        <div className="md:hidden fixed bottom-4 end-4 z-50">
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>
      <PwaRegister />
    </div>
    </LocalizationProvider>
  );
}
