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
import { getTranslations } from "next-intl/server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billingError?: string; checkout?: string; tab?: string }>;
}) {
  const t = await getTranslations("settingsPage");
  const params = await searchParams;
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
      ? supabase
          .from("workspaces")
          .select("id, name, owner_id, plan, subscription_status, subscription_source, current_period_end, trial_ends_at")
          .eq("id", workspaceId)
          .single()
      : Promise.resolve({ data: null }),
    workspaceId
      ? serviceClient.rpc("get_workspace_members_with_email", { p_workspace_id: workspaceId })
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
      ? supabase.from("files").select("size_bytes.sum()").eq("workspace_id", workspaceId).single()
      : Promise.resolve({ data: null }),
    workspaceId
      ? supabase.from("ai_usage_logs").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", monthStart)
      : Promise.resolve({ count: 0 }),
  ]);

  type MemberRow = { id: string; user_id: string; role: string; joined_at: string; email: string | null; full_name: string | null };
  const membersWithUsers = ((membersResult.data ?? []) as MemberRow[]).map((m) => ({
    id: m.id,
    userId: m.user_id,
    role: m.role as "owner" | "admin" | "member" | "viewer",
    joinedAt: m.joined_at,
    user: {
      email: m.email ?? m.user_id,
      fullName: (m.full_name ?? undefined) as string | undefined,
    },
  }));

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
  const storageBytes = Number((filesResult.data as unknown as { sum: string | null } | null)?.sum ?? 0);
  const plan = (workspaceResult.data?.plan ?? "solo") as WorkspacePlan;
  const currentUserRole = membersWithUsers.find((member) => member.userId === user?.id)?.role ?? "viewer";

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "fr") as "fr" | "en" | "ar";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">{t("eyebrow")}</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">{t("subtitle")}</p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <SettingsForm profile={profileResult.data} />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BadgeDollarSign className="h-4 w-4 text-[#64748B]" />
          <h2 className="section-title text-[15px] text-[#0B1220]">{t("sectionPlan")}</h2>
        </div>
        <PlanUsage
          plan={plan}
          billingError={params.billingError ?? null}
          subscription={{
            status: workspaceResult.data?.subscription_status ?? null,
            source: workspaceResult.data?.subscription_source ?? null,
            currentPeriodEnd: workspaceResult.data?.current_period_end ?? null,
            trialEndsAt: workspaceResult.data?.trial_ends_at ?? null,
          }}
          usage={{
            seats: membersWithUsers.length,
            projects: projectsCountResult.count ?? 0,
            storageBytes,
            aiCalls: aiUsageResult.count ?? 0,
          }}
        />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4 text-[#64748B]" />
          <h2 className="section-title text-[15px] text-[#0B1220]">{t("sectionPortfolio")}</h2>
        </div>
        <PortfolioSettings
          currentSlug={profileResult.data?.slug ?? null}
          portfolioEnabled={profileResult.data?.portfolio_enabled ?? false}
          portfolioTagline={profileResult.data?.portfolio_tagline ?? null}
          portfolioSpecialties={profileResult.data?.portfolio_specialties ?? null}
          appUrl={appUrl}
        />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Languages className="h-4 w-4 text-[#64748B]" />
          <h2 className="section-title text-[15px] text-[#0B1220]">{t("sectionLanguage")}</h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[#64748B]">
            {t("languageLabel")}
          </p>
          <LanguageSwitcher currentLocale={locale} />
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-4 w-4 text-[#64748B]" />
          <h2 className="section-title text-[15px] text-[#0B1220]">{t("sectionTeam")}</h2>
        </div>
        <TeamMembers
          members={membersWithUsers}
          invites={invites}
          appUrl={appUrl}
          currentUserRole={currentUserRole}
        />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-[#64748B]" />
          <h2 className="section-title text-[15px] text-[#0B1220]">{t("sectionData")}</h2>
        </div>
        <p className="text-[13px] text-[#64748B] mb-4">
          {t("dataDescription")}
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#0B1220] hover:bg-[#F7F8FA] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportJson")}
          </a>
          <Link href="/mentions-legales" className="text-[13px] text-[#64748B] hover:underline self-center">{t("linkLegal")}</Link>
          <Link href="/terms" className="text-[13px] text-[#64748B] hover:underline self-center">{t("linkTerms")}</Link>
          <Link href="/cgv" className="text-[13px] text-[#64748B] hover:underline self-center">{t("linkCgv")}</Link>
          <Link href="/privacy" className="text-[13px] text-[#64748B] hover:underline self-center">{t("linkPrivacy")}</Link>
          <Link href="/cookies" className="text-[13px] text-[#64748B] hover:underline self-center">{t("linkCookies")}</Link>
        </div>
      </div>
    </div>
  );
}
