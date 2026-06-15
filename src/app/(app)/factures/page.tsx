import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Receipt, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getWorkspaceLocalization } from "@/lib/localization";
import { getServerFormatters } from "@/lib/formatters-server";
import { FacturesFilters } from "@/components/factures/factures-filters";
import { RecurringInvoicesPanel } from "@/components/factures/recurring-invoices-panel";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-[#F1F5F9] text-[#64748B]",
  envoyee:   "bg-[#E9ECFF] text-[#2563EB]",
  payee:     "bg-[#E5F3EB] text-[#2F8F5C]",
  annulee:   "bg-[#FCEFE6] text-[#C75B2E]",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  brouillon: Clock,
  envoyee:   Clock,
  payee:     CheckCircle2,
  annulee:   AlertCircle,
};

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("factures");
  const ts = await getTranslations("status.facture");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");
  const { currency, timezone } = await getWorkspaceLocalization(supabase, workspaceId);
  const { formatDate } = await getServerFormatters(timezone);
  const money = (centimes: number) => formatMoney(centimes, currency);

  let query = supabase
    .from("factures")
    .select("id, number, title, status, total_centimes, due_date, paid_at, created_at, clients!factures_client_id_fkey(name), projects!factures_project_id_fkey(title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const [{ data: factures }, { data: recurringInvoices }, { data: clients }, { data: projects }] = await Promise.all([
    query,
    supabase.from("recurring_invoices").select("*, clients!recurring_invoices_client_id_fkey(name), projects!recurring_invoices_project_id_fkey(title)").eq("workspace_id", workspaceId).eq("active", true).order("next_date"),
    supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
    supabase.from("projects").select("id, title").eq("workspace_id", workspaceId).is("archived_at", null).order("title"),
  ]);

  const totalUnpaid = (factures ?? [])
    .filter((f) => f.status === "envoyee")
    .reduce((sum, f) => sum + f.total_centimes, 0);

  const totalPaid = (factures ?? [])
    .filter((f) => f.status === "payee")
    .reduce((sum, f) => sum + f.total_centimes, 0);

  const overdueCount = (factures ?? [])
    .filter((f) => f.status === "envoyee" && f.due_date && new Date(f.due_date) < new Date()).length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="eyebrow mb-1">{t("eyebrow")}</p>
          <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
          <p className="text-[13.5px] text-[#64748B] mt-1">
            {totalUnpaid > 0
              ? <span className="text-[#C75B2E] font-medium">{money(totalUnpaid)} {t("toCollect")}</span>
              : t("title")}
          </p>
        </div>
        <Link href="/factures/new" className="shrink-0">
          <Button size="sm" className="bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] border-0 shadow-none h-8 px-3 text-[13px] font-medium rounded-lg">
            {t("new")}
          </Button>
        </Link>
      </div>

      {/* KPI mini row */}
      <div className="flex gap-3 flex-wrap">
        {totalUnpaid > 0 && (
          <div className={`bg-white border rounded-xl px-4 py-3 ${overdueCount > 0 ? "border-[#C75B2E]/30" : "border-[#E5E7EB]"}`}>
            <p className="eyebrow">{t("toCollect")}</p>
            <p className={`font-fraunces text-[22px] tabnum mt-0.5 ${overdueCount > 0 ? "text-[#C75B2E]" : "text-[#0B1220]"}`}>{money(totalUnpaid)}</p>
            {overdueCount > 0 && (
              <p className="text-[11px] text-[#C75B2E] font-semibold mt-0.5">{overdueCount} {t("overdue")}</p>
            )}
          </div>
        )}
        {totalPaid > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
            <p className="eyebrow">{t("collected")}</p>
            <p className="font-fraunces text-[22px] text-[#2F8F5C] tabnum mt-0.5">{money(totalPaid)}</p>
          </div>
        )}
      </div>

      <FacturesFilters />

      {factures && factures.length > 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#F1F5F9]">
            {factures.map((f) => {
              const client = (f.clients as unknown) as { name: string } | null;
              const project = (f.projects as unknown) as { title: string } | null;
              const statusColors = STATUS_COLORS[f.status] ?? STATUS_COLORS.brouillon!;
              const StatusIcon = STATUS_ICONS[f.status] ?? STATUS_ICONS.brouillon!;
              const isOverdue = f.status === "envoyee" && f.due_date && new Date(f.due_date) < new Date();
              return (
                <Link key={f.id} href={`/factures/${f.id}`}>
                  <div className={`flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#F7F8FA] transition-colors ${isOverdue ? "bg-[#FCEFE6]/30" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon className={`h-4 w-4 shrink-0 ${f.status === "payee" ? "text-[#2F8F5C]" : f.status === "annulee" ? "text-[#C75B2E]" : isOverdue ? "text-[#C75B2E]" : "text-[#ADAB9D]"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[#ADAB9D] font-mono">{f.number}</span>
                          <p className="text-[13.5px] font-medium text-[#0B1220] truncate">{f.title}</p>
                        </div>
                        <p className="text-[11.5px] text-[#64748B] mt-0.5">
                          {client?.name ?? "—"}
                          {project ? ` · ${project.title}` : ""}
                          {f.due_date ? ` · ${formatDate(f.due_date)}` : ""}
                          {isOverdue && <span className="text-[#C75B2E] font-medium"> · {t("overdue")}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[13.5px] font-semibold text-[#0B1220] tabnum">{money(f.total_centimes)}</span>
                      <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${statusColors}`}>
                        {(["brouillon","envoyee","payee","annulee"] as const).includes(f.status as "brouillon"|"envoyee"|"payee"|"annulee") ? ts(f.status as "brouillon"|"envoyee"|"payee"|"annulee") : f.status}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
            <Receipt className="h-5 w-5 text-[#ADAB9D]" />
          </div>
          <p className="text-[13.5px] text-[#0B1220] font-medium mb-1">{t("empty")}</p>
          <p className="text-[12px] text-[#64748B] mb-4">{t("emptyCreate")}</p>
          <Link href="/factures/new">
            <Button variant="outline" size="sm" className="border-[#E5E7EB] text-[#1E293B]">{t("createFirst")}</Button>
          </Link>
        </div>
      )}

      {/* Recurring invoices */}
      <RecurringInvoicesPanel
        initialRecurring={(recurringInvoices ?? []) as Parameters<typeof RecurringInvoicesPanel>[0]["initialRecurring"]}
        clients={clients ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}
