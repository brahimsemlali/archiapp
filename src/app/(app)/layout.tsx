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

  if (workspace?.id) {
    if (workspace.account_status === "suspended" || workspace.account_status === "cancelled") {
      redirect("/account-suspended");
    }

    const { data: profile } = await supabase
      .from("firm_profile")
      .select("firm_name")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!profile?.firm_name) {
      redirect("/onboarding");
    }
  }

  return (
    <div className="premium-app-shell flex h-screen overflow-hidden bg-[#F7F7F4]">
      <Sidebar
        userEmail={user.email}
        workspaceName={workspace?.name}
        activeWorkspaceId={workspaceId}
        workspaces={workspaces}
        locale={locale}
      />
      <div className="premium-main flex-1 flex flex-col overflow-hidden">
        <Header activeWorkspaceId={workspaceId} workspaces={workspaces} />
        {trialInfo?.onTrial && <TrialBanner daysLeft={trialInfo.daysLeft} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AppContentShell>{children}</AppContentShell>
        </main>
        <div className="md:hidden fixed bottom-4 end-4 z-50">
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>
      <PwaRegister />
    </div>
  );
}
