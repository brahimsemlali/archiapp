import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AiHealthDigest } from "@/components/dashboard/ai-health-digest";
import {
  FolderOpen, Users, FileText, ArrowRight, Receipt, BadgeDollarSign,
  AlertTriangle, Settings, TrendingUp, CheckCircle2, ChevronRight,
  HardHat,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { resolveLocalization } from "@/lib/country-packs";
import { getServerFormatters } from "@/lib/formatters-server";
import { PHASE_COLORS } from "@/lib/constants";
import { getPlanLimits } from "@/lib/billing/plans";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";
import { createDemoWorkspaceDataAction } from "@/lib/actions/activation";

const PRIORITY_COLORS: Record<string, string> = {
  haute: "text-[#C75B2E] bg-[#FCEFE6]",
  moyenne: "text-[#B07A1A] bg-[#FDF3DC]",
  basse: "text-[#64748B] bg-[#F1F5F9]",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const workspaceId = await getWorkspaceId(supabase, user?.id);
  if (!workspaceId) redirect("/onboarding");
  const t = await getTranslations("dashboard");
  const tPhase = await getTranslations("phase");
  const tActivity = await getTranslations("activityActions");
  const { data: workspace } = await supabase.from("workspaces").select("plan").eq("id", workspaceId).single();
  const aiEnabled = getPlanLimits(workspace?.plan).aiEnabled;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]!;
  const sevenDaysStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
  const thirtyDaysStr = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const [
    { data: activeProjects },
    { count: clientsCount },
    { count: devisCount },
    { count: facturesCount },
    { data: recentActivity },
    { data: unpaidFactures },
    { data: paidThisMonth },
    { data: paidLastMonth },
    { data: billedThisYear },
    { data: tasksDueSoon },
    { count: draftContracts },
    firmProfile,
    { data: expiringDevis },
    { data: nextVisit },
    { data: pendingDevis },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, phase, status, target_end_date, clients!projects_client_id_fkey(name)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .neq("status", "termine")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).is("archived_at", null),
    supabase.from("devis").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("factures").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("activity_log").select("action, metadata, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(8),
    supabase
      .from("factures")
      .select("id, number, title, total_centimes, due_date, status, clients!factures_client_id_fkey(name)")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoyee")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("factures")
      .select("total_centimes")
      .eq("workspace_id", workspaceId)
      .eq("status", "payee")
      .gte("paid_at", startOfMonth),
    supabase
      .from("factures")
      .select("total_centimes")
      .eq("workspace_id", workspaceId)
      .eq("status", "payee")
      .gte("paid_at", startOfLastMonth)
      .lte("paid_at", endOfLastMonth),
    supabase
      .from("factures")
      .select("total_centimes")
      .eq("workspace_id", workspaceId)
      .in("status", ["payee", "envoyee"])
      .gte("created_at", startOfYear),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, status, projects!tasks_project_id_fkey(title)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .neq("status", "termine")
      .not("due_date", "is", null)
      .lte("due_date", sevenDaysStr)
      .order("due_date", { ascending: true })
      .limit(6),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "brouillon"),
    supabase.from("firm_profile").select("*").eq("workspace_id", workspaceId).single(),
    supabase
      .from("devis")
      .select("id, number, title, total_centimes, valid_until")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoye")
      .not("valid_until", "is", null)
      .lte("valid_until", thirtyDaysStr)
      .order("valid_until", { ascending: true })
      .limit(3),
    supabase
      .from("site_visits")
      .select("id, title, visit_date, projects!site_visits_project_id_fkey(title)")
      .eq("workspace_id", workspaceId)
      .gte("visit_date", todayStr)
      .order("visit_date", { ascending: true })
      .limit(1),
    supabase
      .from("devis")
      .select("total_centimes")
      .eq("workspace_id", workspaceId)
      .eq("status", "envoye"),
  ]);

  const totalPaidMonth = (paidThisMonth ?? []).reduce((s, f) => s + f.total_centimes, 0);
  const totalPaidLastMonth = (paidLastMonth ?? []).reduce((s, f) => s + f.total_centimes, 0);
  const totalYearCA = (billedThisYear ?? []).reduce((s, f) => s + f.total_centimes, 0);
  const totalPendingDevis = (pendingDevis ?? []).reduce((s, d) => s + d.total_centimes, 0);
  const overdueFactures = (unpaidFactures ?? []).filter((f) => f.due_date && f.due_date < todayStr);
  const pendingFactures = (unpaidFactures ?? []).filter((f) => !f.due_date || f.due_date >= todayStr);
  const totalUnpaid = (unpaidFactures ?? []).reduce((s, f) => s + f.total_centimes, 0);
  const monthDelta = totalPaidLastMonth > 0 ? Math.round(((totalPaidMonth - totalPaidLastMonth) / totalPaidLastMonth) * 100) : null;
  const { currency, timezone } = resolveLocalization(firmProfile?.data);
  const { formatRelative, formatDateParts } = await getServerFormatters(timezone);
  const money = (centimes: number) => formatMoney(centimes, currency);
  const missingFirmProfile = !firmProfile?.data?.firm_name;
  const hasClients = (clientsCount ?? 0) > 0;
  const hasProjects = (activeProjects?.length ?? 0) > 0;
  const hasDevis = (devisCount ?? 0) > 0;
  const hasFactures = (facturesCount ?? 0) > 0;
  const onboardingSteps = [
    { label: t("setupBanner.step_firmName"), detail: t("setupBanner.step_firmName_desc"), href: "/settings", done: !missingFirmProfile },
    { label: t("setupBanner.step_firstClient"), detail: t("setupBanner.step_firstClient_desc"), href: "/clients/new", done: hasClients },
    { label: t("setupBanner.step_firstProject"), detail: t("setupBanner.step_firstProject_desc"), href: "/projects/new", done: hasProjects },
    { label: t("setupBanner.step_firstDevis"), detail: t("setupBanner.step_firstDevis_desc"), href: "/devis/new", done: hasDevis },
    { label: t("setupBanner.step_firstInvoice"), detail: t("setupBanner.step_firstInvoice_desc"), href: "/factures/new", done: hasFactures },
  ];
  const completedOnboardingSteps = onboardingSteps.filter((step) => step.done).length;
  const nextOnboardingStep = onboardingSteps.find((step) => !step.done);
  const showOnboarding = completedOnboardingSteps < onboardingSteps.length;
  async function installDemoWorkspaceData() {
    "use server";
    await createDemoWorkspaceDataAction();
  }

  const todayLabel = formatDateParts(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  // Prefer the architect's first name, then the firm name, then the email prefix —
  // so the greeting shows who they are, not "archidesk-uxtest+123".
  const architectFirstName = firmProfile?.data?.architect_name?.trim().split(/\s+/)[0];
  const firstName = architectFirstName || firmProfile?.data?.firm_name?.trim() || (user?.email?.split("@")[0] ?? "");
  const capitalizedToday = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  function activityLabel(action: string, metadata: Record<string, unknown>): string {
    const key = action.replace(".", "_") as Parameters<typeof tActivity>[0];
    try {
      const base = tActivity(key);
      const title = (metadata?.title as string) ?? (metadata?.name as string) ?? "";
      return title ? `${base} — ${title}` : base;
    } catch {
      return action;
    }
  }

  return (
    <div className="premium-route-enter mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="studio-hero p-4 sm:p-5 lg:p-6">
        <div className="studio-hero-content flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow mb-2">{capitalizedToday}</p>
            <h1 className="page-title text-[32px] text-[#0B1220] sm:text-[38px]">{t("greeting", { name: firstName })}</h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#475569]">
              {activeProjects?.length ?? 0} {t("panels.activeProjects").toLowerCase()}
              {overdueFactures.length > 0 && ` · ${overdueFactures.length} ${overdueFactures.length > 1 ? "" : ""}${t("invoices.overdue")}`}
              {(expiringDevis?.length ?? 0) > 0 && ` · ${expiringDevis!.length} ${t("devisAlerts").toLowerCase()}`}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#E5E7EB] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#1E293B] shadow-sm">
                {t("headerStats.clients", { count: clientsCount ?? 0 })}
              </span>
              <span className="rounded-full border border-[#E5E7EB] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#1E293B] shadow-sm">
                {t("headerStats.tasksDueSoon", { count: tasksDueSoon?.length ?? 0 })}
              </span>
              <span className="rounded-full border border-[#E5E7EB] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#1E293B] shadow-sm">
                {t("headerStats.draftContracts", { count: draftContracts ?? 0 })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/tasks">
              <Button size="sm" variant="outline" className="h-9 rounded-lg border-[#E5E7EB] bg-white/82 px-3 text-[13px] font-semibold text-[#1E293B]">
                Tâche
              </Button>
            </Link>
            <Link href="/devis/new">
              <Button size="sm" variant="outline" className="h-9 rounded-lg border-[#E5E7EB] bg-white/82 px-3 text-[13px] font-semibold text-[#1E293B]">
                {t("actions.newDevis")}
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button size="sm" className="h-9 rounded-lg border-0 bg-[#0B1220] px-3 text-[13px] font-semibold text-[#F7F8FA] shadow-[0_14px_30px_rgba(22,23,14,0.18)] hover:bg-[#2D2E22]">
                {t("actions.newProject")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Onboarding */}
      {showOnboarding && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
            <div className="p-4 bg-[#F7F8FA] border-b lg:border-b-0 lg:border-r border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#0B1220] text-[#F7F8FA] flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <p className="eyebrow">{t("setupBanner.title")}</p>
                  <p className="text-[15px] font-semibold text-[#0B1220]">{t("setupBanner.steps", { done: completedOnboardingSteps, total: onboardingSteps.length })}</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0B1220]"
                  style={{ width: `${(completedOnboardingSteps / onboardingSteps.length) * 100}%` }}
                />
              </div>
              <p className="text-[12.5px] text-[#64748B] leading-relaxed mt-3">
                {t("setupBanner.description")}
              </p>
              {nextOnboardingStep && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={nextOnboardingStep.href} className="inline-flex">
                    <Button size="sm" className="h-8 bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] text-[12.5px] rounded-lg">
                      {t("continue")} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                  {!hasClients && !hasProjects && (
                    <form action={installDemoWorkspaceData}>
                      <Button type="submit" size="sm" variant="outline" className="h-8 text-[12.5px] rounded-lg">
                        Installer une démo
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#F1F5F9]">
              {onboardingSteps.map((step) => (
                <Link key={step.label} href={step.href} className="group p-4 min-h-[118px] hover:bg-[#F7F8FA] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center border ${step.done ? "bg-[#2F8F5C] border-[#2F8F5C] text-white" : "border-[#D8D5CB] text-[#ADAB9D] bg-white"}`}>
                      {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </div>
                    {!step.done && <ArrowRight className="h-3.5 w-3.5 text-[#ADAB9D] group-hover:text-[#0B1220] transition-colors" />}
                  </div>
                  <p className="text-[13px] font-semibold text-[#0B1220] mt-3 leading-tight">{step.label}</p>
                  <p className="text-[11.5px] text-[#64748B] mt-1.5 leading-relaxed">{step.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Encaissé ce mois */}
        <Link href="/rapports">
          <div className="studio-kpi-card p-4" data-tone="mint">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">{t("kpi.collected")}</p>
              <TrendingUp className="h-3.5 w-3.5 text-[#2F8F5C]" />
            </div>
            <p className="font-fraunces text-[28px] font-medium leading-none text-[#0B1220] tabnum">
              {totalPaidMonth > 0 ? money(totalPaidMonth) : "—"}
            </p>
            {monthDelta !== null && (
              <p className={`text-[11.5px] font-semibold mt-2 ${monthDelta >= 0 ? "text-[#2F8F5C]" : "text-[#C75B2E]"}`}>
                {monthDelta >= 0 ? t("kpi.vsLastMonth", { delta: monthDelta }) : t("kpi.vsLastMonthNeg", { delta: monthDelta })}
              </p>
            )}
            <p className="text-[11px] text-[#ADAB9D] mt-1">{t("kpi.paidInvoices")}</p>
          </div>
        </Link>

        {/* En attente */}
        <Link href="/factures">
          <div className="studio-kpi-card p-4" data-tone={overdueFactures.length > 0 ? "rose" : "gold"}>
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">{t("kpi.toCollect")}</p>
              <BadgeDollarSign className={`h-3.5 w-3.5 ${overdueFactures.length > 0 ? "text-[#C75B2E]" : "text-[#ADAB9D]"}`} />
            </div>
            <p className="font-fraunces text-[28px] font-medium leading-none text-[#0B1220] tabnum">
              {totalUnpaid > 0 ? money(totalUnpaid) : "—"}
            </p>
            {overdueFactures.length > 0 && (
              <p className="text-[11.5px] font-semibold mt-2 text-[#C75B2E]">
                {overdueFactures.length} {t("kpi.overdue")}
              </p>
            )}
            <p className="text-[11px] text-[#ADAB9D] mt-1">{unpaidFactures?.length ?? 0} {t("invoices.pending")}</p>
          </div>
        </Link>

        {/* Devis en cours */}
        <Link href="/devis">
          <div className="studio-kpi-card p-4" data-tone="blue">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">{t("kpi.sentDevis")}</p>
              <Receipt className="h-3.5 w-3.5 text-[#2563EB]" />
            </div>
            <p className="font-fraunces text-[28px] font-medium leading-none text-[#0B1220] tabnum">
              {totalPendingDevis > 0 ? money(totalPendingDevis) : "—"}
            </p>
            <p className="text-[11.5px] font-semibold mt-2 text-[#2563EB]">
              {pendingDevis?.length ?? 0} {t("invoices.pending")}
            </p>
            <p className="text-[11px] text-[#ADAB9D] mt-1">{t("devisAlerts")}</p>
          </div>
        </Link>

        {/* CA annuel */}
        <Link href="/rapports">
          <div className="studio-kpi-card p-4" data-tone="gold">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">{t("kpi.annualRevenue", { year: now.getFullYear() })}</p>
              <TrendingUp className="h-3.5 w-3.5 text-[#ADAB9D]" />
            </div>
            <p className="font-fraunces text-[28px] font-medium leading-none text-[#0B1220] tabnum">
              {totalYearCA > 0 ? money(totalYearCA) : "—"}
            </p>
            <p className="text-[11px] text-[#ADAB9D] mt-3">{t("kpi.billedThisYear")}</p>
          </div>
        </Link>
      </div>

      {/* AI Health Digest */}
      <AiHealthDigest
        aiEnabled={aiEnabled}
        data={{
          overdueInvoices: overdueFactures.map((f) => ({ number: f.number, amount: f.total_centimes, daysLate: f.due_date ? Math.floor((now.getTime() - new Date(f.due_date).getTime()) / 86400000) : 0, client: (f.clients as unknown as { name: string } | null)?.name ?? "" })),
          expiringDevis: (expiringDevis ?? []).map((d) => ({ number: d.number, daysLeft: Math.ceil((new Date(d.valid_until!).getTime() - now.getTime()) / 86400000) })),
          budgetOverruns: [],
          upcomingDeadlines: (activeProjects ?? []).filter((p) => p.target_end_date && new Date(p.target_end_date) <= new Date(now.getTime() + 14 * 86400000)).map((p) => ({ project: p.title, daysLeft: Math.ceil((new Date(p.target_end_date!).getTime() - now.getTime()) / 86400000) })),
          totalOutstanding: totalUnpaid,
        }}
      />

      {/* Expiring devis alert */}
      {(expiringDevis?.length ?? 0) > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-[#B07A1A]" />
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#B07A1A]">{t("devisAlerts")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringDevis!.map((d) => {
              const daysLeft = Math.ceil((new Date(d.valid_until!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const urgent = daysLeft <= 2;
              return (
                <Link key={d.id} href={`/devis/${d.id}`}>
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-[13px] hover:shadow-sm transition-all ${urgent ? "bg-[#FCEFE6] border-[#C75B2E]/25" : "bg-[#FDF3DC] border-[#B07A1A]/20"}`}>
                    <div>
                      <span className="font-medium text-[#0B1220]">{d.number} — {d.title}</span>
                      <span className="text-[11px] ml-2 font-semibold text-[#64748B]">{money(d.total_centimes)}</span>
                    </div>
                    <span className={`text-[10.5px] font-semibold shrink-0 ${urgent ? "text-[#C75B2E]" : "text-[#B07A1A]"}`}>
                      {daysLeft <= 0 ? t("today") : t("devisExpiring", { days: daysLeft })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main 3-panel grid */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Facturation panel */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <p className="font-semibold text-[14px] text-[#0B1220]">{t("panels.billing")}</p>
            <Link href="/factures" className="flex items-center gap-1 text-[11.5px] text-[#64748B] hover:text-[#0B1220] transition-colors font-medium">
              {t("viewAll")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {(unpaidFactures ?? []).length === 0 ? (
            <div className="px-4 py-10 text-center">
              <BadgeDollarSign className="h-8 w-8 text-[#E5E7EB] mx-auto mb-2" />
              <p className="text-[13px] text-[#64748B]">{t("invoices.noPending")}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {overdueFactures.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#C75B2E] mb-1.5">{t("invoices.overdue")}</p>
                  {overdueFactures.map((f) => {
                    const client = (f.clients as unknown as { name: string } | null);
                    const daysLate = Math.floor((now.getTime() - new Date(f.due_date!).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={f.id} href={`/factures/${f.id}`}>
                        <div className="flex items-center justify-between py-2.5 hover:bg-[#FCEFE6]/30 -mx-4 px-4 rounded transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#0B1220] truncate">{f.title}</p>
                            <p className="text-[11px] text-[#64748B] mt-0.5">{client?.name ?? "—"} · {daysLate}j {t("kpi.overdue")}</p>
                          </div>
                          <p className="text-[13px] font-semibold text-[#C75B2E] shrink-0 ml-3 tabnum">{money(f.total_centimes)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              {pendingFactures.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  {overdueFactures.length > 0 && <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-1.5">{t("invoices.pending")}</p>}
                  {pendingFactures.slice(0, 5).map((f) => {
                    const client = (f.clients as unknown as { name: string } | null);
                    const daysLeft = f.due_date ? Math.ceil((new Date(f.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <Link key={f.id} href={`/factures/${f.id}`}>
                        <div className="flex items-center justify-between py-2.5 hover:bg-[#F7F8FA] -mx-4 px-4 rounded transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#0B1220] truncate">{f.title}</p>
                            <p className="text-[11px] text-[#64748B] mt-0.5">
                              {client?.name ?? "—"}
                              {daysLeft !== null && ` · ${t("invoices.dueIn", { days: daysLeft })}`}
                            </p>
                          </div>
                          <p className="text-[13px] font-semibold text-[#0B1220] shrink-0 ml-3 tabnum">{money(f.total_centimes)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* New facture CTA */}
          <div className="px-4 py-3 border-t border-[#E5E7EB]">
            <Link href="/factures/new">
              <button className="w-full text-[12.5px] font-medium text-[#64748B] hover:text-[#0B1220] hover:bg-[#F7F8FA] rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5">
                {t("invoices.newInvoice")}
              </button>
            </Link>
          </div>
        </div>

        {/* Middle: Projets */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[14px] text-[#0B1220]">{t("panels.activeProjects")}</p>
              {activeProjects && activeProjects.length > 0 && (
                <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] rounded-full px-2 py-0.5">{activeProjects.length}</span>
              )}
            </div>
            <Link href="/projects" className="flex items-center gap-1 text-[11.5px] text-[#64748B] hover:text-[#0B1220] transition-colors font-medium">
              {t("viewAll")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {activeProjects && activeProjects.length > 0 ? (
              activeProjects.slice(0, 7).map((project) => {
                const client = (project.clients as unknown as { name: string } | null);
                const daysToEnd = project.target_end_date
                  ? Math.ceil((new Date(project.target_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between py-3 px-4 hover:bg-[#F7F8FA] transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-[#0B1220] truncate">{project.title}</p>
                        <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                          {client?.name ?? "—"}
                          {daysToEnd !== null && (
                            <span className={daysToEnd <= 7 ? " · text-[#C75B2E] font-semibold" : ""}>
                              {" · "}
                              {daysToEnd <= 0 ? t("kpi.overdue") : t("projects.daysLeft", { days: daysToEnd })}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`shrink-0 ml-3 text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${PHASE_COLORS[project.phase] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>
                        {tPhase(project.phase as Parameters<typeof tPhase>[0])}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-10">
                <FolderOpen className="h-8 w-8 text-[#E5E7EB] mx-auto mb-2" />
                <p className="text-[13px] text-[#64748B] mb-3">{t("noActivity")}</p>
                <Link href="/projects/new">
                  <Button variant="outline" size="sm" className="text-xs border-[#E5E7EB] text-[#1E293B]">{t("projects.createFirst")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tasks + Activity */}
        <div className="lg:col-span-1 space-y-4">

          {/* Tasks due soon */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <p className="font-semibold text-[14px] text-[#0B1220]">{t("panels.urgentTasks")}</p>
              <Link href="/tasks" className="text-[11.5px] text-[#64748B] hover:text-[#0B1220] transition-colors font-medium">
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {(tasksDueSoon ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center">
                <CheckCircle2 className="h-7 w-7 text-[#E5E7EB] mx-auto mb-1.5" />
                <p className="text-[12px] text-[#64748B]">{t("panels.urgentTasks")}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {(tasksDueSoon ?? []).slice(0, 5).map((task) => {
                  const daysLeft = task.due_date
                    ? Math.ceil((new Date(task.due_date).getTime() - startOfTodayMs) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isToday = daysLeft === 0;
                  return (
                    <Link key={task.id} href="/tasks">
                      <div className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-[#F7F8FA] transition-colors">
                        <div className={`mt-0.5 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.basse}`}>
                          {task.priority === "haute" ? "!" : task.priority === "moyenne" ? "·" : "–"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-medium text-[#0B1220] leading-snug truncate">{task.title}</p>
                          <p className={`text-[10.5px] mt-0.5 font-medium ${isOverdue ? "text-[#C75B2E]" : isToday ? "text-[#B07A1A]" : "text-[#64748B]"}`}>
                            {isOverdue ? `${Math.abs(daysLeft!)}j ${t("kpi.overdue")}` : isToday ? t("today") : t("projects.daysLeft", { days: daysLeft ?? 0 })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next site visit */}
          {nextVisit && nextVisit.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <p className="eyebrow mb-2">{t("panels.nextVisit")}</p>
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-[#EDE9FF] rounded-lg shrink-0">
                  <HardHat className="h-3.5 w-3.5 text-[#6B3FA0]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0B1220] truncate">{nextVisit[0]!.title}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {formatDateParts(nextVisit[0]!.visit_date, { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F1F5F9]">
            <Link href="/clients">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F7F8FA] transition-colors rounded-t-xl">
                <div className="flex items-center gap-2.5">
                  <Users className="h-3.5 w-3.5 text-[#6B3FA0]" />
                  <p className="text-[13px] text-[#1E293B]">{t("quickStats.clients")}</p>
                </div>
                <p className="text-[13px] font-semibold text-[#0B1220] tabnum">{clientsCount ?? 0}</p>
              </div>
            </Link>
            <Link href="/contracts">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F7F8FA] transition-colors rounded-b-xl">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                  <p className="text-[13px] text-[#1E293B]">{t("quickStats.draftContracts")}</p>
                </div>
                <p className="text-[13px] font-semibold text-[#0B1220] tabnum">{draftContracts ?? 0}</p>
              </div>
            </Link>
          </div>

          {/* Activity */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB]">
              <p className="font-semibold text-[14px] text-[#0B1220]">{t("panels.activity")}</p>
            </div>
            <div className="p-4">
              {(recentActivity ?? []).length > 0 ? (
                <ul className="space-y-2.5">
                  {(recentActivity ?? []).slice(0, 6).map((log, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="h-1.5 w-1.5 mt-[7px] rounded-full bg-[#ADAB9D] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] text-[#1E293B] leading-snug truncate">
                          {activityLabel(log.action, log.metadata as Record<string, unknown>)}
                        </p>
                        <p className="text-[10.5px] text-[#ADAB9D] mt-0.5">{formatRelative(log.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-[#64748B]">{t("activity.noActivity")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
