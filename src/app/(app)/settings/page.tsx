import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace";
import { SettingsForm } from "@/components/settings/settings-form";
import { TeamMembers } from "@/components/settings/team-members";
import { PortfolioSettings } from "@/components/settings/portfolio-settings";
import { PlanUsage } from "@/components/settings/plan-usage";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Users, Globe, Languages, BadgeDollarSign, Download, Shield } from "lucide-react";
import Link from "next/link";
import type { WorkspacePlan } from "@/lib/billing/plans";

export default async function SettingsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  const workspaceId = await getWorkspaceId(supabase);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [profileResult, workspaceResult, membersResult, invitesResult, projectsCountResult, filesResult, aiUsageResult] = await Promise.all([
    workspaceId
      ? supabase.from("firm_profile").select("*").eq("workspace_id", workspaceId).single()
      : Promise.resolve({ data: null }),
    workspaceId
      ? supabase.from("workspaces").select("id, name, owner_id, plan").eq("id", workspaceId).single()
      : Promise.resolve({ data: null }),
    workspaceId
      ? supabase
          .from("workspace_members")
          .select("id, user_id, role, joined_at")
          .eq("workspace_id", workspaceId)
          .order("joined_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase
          .from("workspace_invites")
          .select("id, email, role, token, status, expires_at, created_at")
          .eq("workspace_id", workspaceId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase.from("projects").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("archived_at", null)
      : Promise.resolve({ count: 0 }),
    workspaceId
      ? supabase.from("files").select("size_bytes").eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", monthStart)
      : Promise.resolve({ count: 0 }),
  ]);

  const membersWithUsers = await Promise.all(
    (membersResult.data ?? []).map(async (m) => {
      const { data: authUser } = await serviceClient.auth.admin.getUserById(m.user_id);
      return {
        id: m.id,
        userId: m.user_id,
        role: m.role as "owner" | "admin" | "member" | "viewer",
        joinedAt: m.joined_at,
        user: {
          email: authUser?.user?.email ?? m.user_id,
          fullName: (authUser?.user?.user_metadata?.full_name ?? undefined) as string | undefined,
        },
      };
    })
  );

  const invites = (invitesResult.data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role as "owner" | "admin" | "member" | "viewer",
    token: i.token,
    status: i.status as "pending" | "accepted" | "revoked",
    expiresAt: i.expires_at,
    createdAt: i.created_at,
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const storageBytes = (filesResult.data ?? []).reduce((sum, file) => sum + (file.size_bytes ?? 0), 0);
  const plan = (workspaceResult.data?.plan ?? "solo") as WorkspacePlan;
  const currentUserRole = membersWithUsers.find((member) => member.userId === user?.id)?.role ?? "viewer";

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "fr") as "fr" | "ar";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">Configuration</p>
        <h1 className="page-title text-[28px] text-[#16170E]">Paramètres</h1>
        <p className="text-[13.5px] text-[#82806F] mt-1">Profil du cabinet, équipe et préférences.</p>
      </div>

      <div className="bg-white border border-[#E8E6DF] rounded-xl p-6">
        <SettingsForm profile={profileResult.data} />
      </div>

      <div className="bg-white border border-[#E8E6DF] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BadgeDollarSign className="h-4 w-4 text-[#82806F]" />
          <h2 className="section-title text-[15px] text-[#16170E]">Plan & usage</h2>
        </div>
        <PlanUsage
          plan={plan}
          usage={{
            seats: membersWithUsers.length,
            projects: projectsCountResult.count ?? 0,
            storageBytes,
            aiCalls: aiUsageResult.count ?? 0,
          }}
        />
      </div>

      <div className="bg-white border border-[#E8E6DF] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4 text-[#82806F]" />
          <h2 className="section-title text-[15px] text-[#16170E]">Portfolio public</h2>
        </div>
        <PortfolioSettings
          currentSlug={profileResult.data?.slug ?? null}
          portfolioEnabled={profileResult.data?.portfolio_enabled ?? false}
          portfolioTagline={profileResult.data?.portfolio_tagline ?? null}
          portfolioSpecialties={profileResult.data?.portfolio_specialties ?? null}
          appUrl={appUrl}
        />
      </div>

      <div className="bg-white border border-[#E8E6DF] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Languages className="h-4 w-4 text-[#82806F]" />
          <h2 className="section-title text-[15px] text-[#16170E]">Langue / اللغة</h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[#82806F]">
            {locale === "fr" ? "Langue de l'interface" : "لغة الواجهة"}
          </p>
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>

      <div className="bg-white border border-[#E8E6DF] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-4 w-4 text-[#82806F]" />
          <h2 className="section-title text-[15px] text-[#16170E]">Équipe</h2>
        </div>
        <TeamMembers
          members={membersWithUsers}
          invites={invites}
          appUrl={appUrl}
          currentUserRole={currentUserRole}
        />
      </div>

      <div className="bg-white border border-[#E8E6DF] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-[#82806F]" />
          <h2 className="section-title text-[15px] text-[#16170E]">Données & confidentialité</h2>
        </div>
        <p className="text-[13px] text-[#82806F] mb-4">
          Exportez toutes vos données au format JSON. Consultez nos pages légales pour en savoir plus sur l'utilisation de vos données.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-[#E8E6DF] bg-white px-3 py-2 text-[13px] font-semibold text-[#16170E] hover:bg-[#F7F7F4] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter mes données (JSON)
          </a>
          <Link href="/terms" className="text-[13px] text-[#82806F] hover:underline self-center">CGU</Link>
          <Link href="/privacy" className="text-[13px] text-[#82806F] hover:underline self-center">Confidentialité</Link>
          <Link href="/cookies" className="text-[13px] text-[#82806F] hover:underline self-center">Cookies</Link>
        </div>
      </div>
    </div>
  );
}
