import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { Building2, FolderOpen, Sparkles, UsersRound } from "lucide-react";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceId = await getWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    redirect("/login");
  }

  const [{ data: profile }, { data: workspace }, { data: memberships }, { data: activeMembership }] = await Promise.all([
    supabase
      .from("firm_profile")
      .select("firm_name, architect_name, email")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces!workspace_members_workspace_id_fkey(id, name)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profile?.firm_name) {
    redirect("/dashboard");
  }

  const workspaces = (memberships ?? []).map((membership) => {
    const linkedWorkspace = Array.isArray(membership.workspaces)
      ? membership.workspaces[0]
      : membership.workspaces;

    return {
      id: membership.workspace_id,
      name: linkedWorkspace?.name ?? "Cabinet",
      role: membership.role,
    };
  });
  const canConfigureWorkspace = activeMembership?.role === "owner" || activeMembership?.role === "admin";

  return (
    <main className="min-h-dvh bg-[#F7F8FA] px-4 py-8 text-[#0B1220] sm:px-6 lg:py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#475569] shadow-[0_8px_24px_rgba(22,23,14,0.055)]">
            <Sparkles className="h-4 w-4 text-[#2563EB]" />
            V1 workspace setup
          </div>

          <div className="max-w-sm rounded-2xl border border-[#E5E7EB] bg-white/80 p-3 shadow-[0_12px_34px_rgba(22,23,14,0.07)]">
            <WorkspaceSwitcher activeWorkspaceId={workspaceId} workspaces={workspaces} />
          </div>

          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B1220] via-[#2563EB] to-[#2F8F5C] text-white shadow-[0_14px_34px_rgba(42,69,240,0.25)]">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="font-fraunces text-[clamp(2.4rem,7vw,4.8rem)] font-semibold leading-[0.98] tracking-normal">
              Configurez votre cabinet.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#475569] sm:text-lg">
              Cette étape donne à votre espace de travail une identité claire pour les devis, factures,
              fichiers partagés, portails clients et rapports de chantier.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Cabinet", body: "Nom, contact, identité", icon: Building2 },
              { title: "Projets", body: "Phases et deadlines", icon: FolderOpen },
              { title: "Équipe", body: "Invitations et rôles", icon: UsersRound },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-[#E5E7EB] bg-white/88 p-4 shadow-[0_10px_28px_rgba(22,23,14,0.055)]">
                  <Icon className="mb-3 h-5 w-5 text-[#2563EB]" />
                  <p className="text-sm font-bold text-[#0B1220]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white/92 p-5 shadow-[0_24px_80px_rgba(22,23,14,0.12)] backdrop-blur-xl sm:p-7">
          <div className="mb-6">
            <p className="eyebrow mb-1">Première configuration</p>
            <h2 className="section-title text-2xl text-[#0B1220]">Profil du cabinet</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Vous pourrez compléter les informations légales plus tard dans les paramètres.
            </p>
          </div>

          {canConfigureWorkspace ? (
            <OnboardingForm
              defaultEmail={profile?.email ?? user.email ?? null}
              defaultFirmName={profile?.firm_name ?? workspace?.name ?? null}
              defaultArchitectName={profile?.architect_name ?? null}
            />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Ce cabinet doit être configuré par un propriétaire ou un administrateur. Changez d'espace de
              travail si vous avez accès à un autre cabinet, ou demandez à un administrateur de terminer la configuration.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
