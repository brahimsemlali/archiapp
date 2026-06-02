import { createClient } from "@/lib/supabase/server";
import { FinancialReports } from "@/components/rapports/financial-reports";
import { BankReconciliation } from "@/components/rapports/bank-reconciliation";
import { ProjectProfitability } from "@/components/rapports/project-profitability";
import { CashflowForecast } from "@/components/rapports/cashflow-forecast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkspaceId } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function RapportsPage() {
  const t = await getTranslations("rapports");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;

  const [{ data: factures }, { data: devis }, { data: projects }, { data: allProjectFactures }, { data: timeEntries }, { data: allFactures }, { data: allDevis }] = await Promise.all([
    supabase
      .from("factures")
      .select("id, number, title, total_centimes, tva_centimes, subtotal_centimes, status, paid_at, due_date, created_at, client_id, project_id, clients!factures_client_id_fkey(name)")
      .eq("workspace_id", workspaceId)
      .gte("created_at", yearStart)
      .order("created_at"),
    supabase
      .from("devis")
      .select("id, number, total_centimes, tva_centimes, status, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", yearStart)
      .order("created_at"),
    supabase
      .from("projects")
      .select("id, title, phase, status, fees_centimes")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("factures")
      .select("id, project_id, total_centimes, status")
      .eq("workspace_id", workspaceId)
      .not("project_id", "is", null)
      .limit(500),
    supabase
      .from("time_entries")
      .select("id, project_id, duration_minutes, rate_centimes, billable")
      .eq("workspace_id", workspaceId)
      .not("project_id", "is", null)
      .limit(500),
    supabase
      .from("factures")
      .select("id, number, title, total_centimes, status, due_date, paid_at, clients!factures_client_id_fkey(name)")
      .eq("workspace_id", workspaceId)
      .in("status", ["envoyee"])
      .order("due_date", { nullsFirst: false })
      .limit(200),
    supabase
      .from("devis")
      .select("id, number, title, total_centimes, status, valid_until")
      .eq("workspace_id", workspaceId)
      .in("status", ["accepte", "envoye"])
      .order("valid_until", { nullsFirst: false }),
  ]);

  const profitabilityRows = (projects ?? []).map((p) => {
    const pFactures = (allProjectFactures ?? []).filter((f) => f.project_id === p.id);
    const pEntries = (timeEntries ?? []).filter((e) => e.project_id === p.id);
    const totalInvoiced = pFactures.filter((f) => f.status !== "annulee").reduce((s, f) => s + f.total_centimes, 0);
    const totalPaid = pFactures.filter((f) => f.status === "payee").reduce((s, f) => s + f.total_centimes, 0);
    const totalMinutes = pEntries.reduce((s, e) => s + e.duration_minutes, 0);
    const hasRates = pEntries.some((e) => (e.rate_centimes ?? 0) > 0);
    const timeCost = pEntries.reduce((s, e) => s + Math.round((e.duration_minutes / 60) * (e.rate_centimes ?? 0)), 0);
    return { id: p.id, title: p.title, phase: p.phase, fees_centimes: p.fees_centimes, totalInvoiced, totalPaid, totalMinutes, timeCost, hasRates };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pt-1">
        <p className="eyebrow mb-1">{t("eyebrow")}</p>
        <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1">{t("subtitle", { year: now.getFullYear() })}</p>
      </div>

      <Tabs defaultValue="financier">
        <TabsList className="h-9 bg-[#F1F5F9] border border-[#E5E7EB] p-0.5 rounded-lg flex-wrap">
          <TabsTrigger value="financier" className="text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#0B1220] text-[#64748B]">{t("tabReports")}</TabsTrigger>
          <TabsTrigger value="tresorerie" className="text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#0B1220] text-[#64748B]">{t("tabCashflow")}</TabsTrigger>
          <TabsTrigger value="rentabilite" className="text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#0B1220] text-[#64748B]">{t("tabProfitability")}</TabsTrigger>
          <TabsTrigger value="rapprochement" className="text-[13px] rounded-md data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#0B1220] text-[#64748B]">{t("tabReconciliation")}</TabsTrigger>
        </TabsList>
        <TabsContent value="financier" className="mt-4">
          <FinancialReports
            factures={(factures ?? []) as unknown as Parameters<typeof FinancialReports>[0]["factures"]}
            devis={devis ?? []}
            projects={projects ?? []}
            year={now.getFullYear()}
          />
        </TabsContent>
        <TabsContent value="tresorerie" className="mt-4">
          <CashflowForecast
            factures={(allFactures ?? []) as unknown as Parameters<typeof CashflowForecast>[0]["factures"]}
            devis={(allDevis ?? []) as Parameters<typeof CashflowForecast>[0]["devis"]}
          />
        </TabsContent>
        <TabsContent value="rentabilite" className="mt-4">
          <ProjectProfitability rows={profitabilityRows} />
        </TabsContent>
        <TabsContent value="rapprochement" className="mt-4">
          <BankReconciliation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
