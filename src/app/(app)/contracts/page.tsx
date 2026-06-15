import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { getServerFormatters } from "@/lib/formatters-server";
import { ContractsFilters } from "@/components/contracts/contracts-filters";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-[#F1F5F9] text-[#64748B]",
  finalise:  "bg-[#E5F3EB] text-[#2F8F5C]",
  archive:   "bg-[#F1F5F9] text-[#ADAB9D]",
};

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("contracts");
  const ts = await getTranslations("status.contract");
  const tt = await getTranslations("contractType");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  const { formatDate } = await getServerFormatters();
  if (!workspaceId) redirect("/onboarding");

  let query = supabase
    .from("contracts")
    .select("*, clients!contracts_client_id_fkey(name), projects!contracts_project_id_fkey(title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  } else if (!params.status) {
    query = query.neq("status", "archive");
  }

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }

  const { data: contracts } = await query;

  const draftCount = (contracts ?? []).filter((c) => c.status === "brouillon").length;
  const signedCount = (contracts ?? []).filter((c) => c.status === "finalise").length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="eyebrow mb-1">{t("eyebrow")}</p>
          <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
          <p className="text-[13.5px] text-[#64748B] mt-1">
            {(contracts?.length ?? 0) === 1 ? t("contractCount", { count: contracts?.length ?? 0 }) : t("contractCountPlural", { count: contracts?.length ?? 0 })}
            {draftCount > 0 && ` · ${draftCount === 1 ? t("draftCount", { count: draftCount }) : t("draftCountPlural", { count: draftCount })}`}
          </p>
        </div>
        <Link href="/contracts/new" className="shrink-0">
          <Button size="sm" className="bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] border-0 shadow-none h-8 px-3 text-[13px] font-medium rounded-lg">
            {t("new")}
          </Button>
        </Link>
      </div>

      {/* KPI mini row */}
      {(draftCount > 0 || signedCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
            <p className="eyebrow">{t("filterDrafts")}</p>
            <p className="font-fraunces text-[22px] text-[#0B1220] tabnum mt-0.5">{draftCount}</p>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
            <p className="eyebrow">{t("filterFinalised")}</p>
            <p className="font-fraunces text-[22px] text-[#2F8F5C] tabnum mt-0.5">{signedCount}</p>
          </div>
        </div>
      )}

      <ContractsFilters />

      {contracts && contracts.length > 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#F1F5F9]">
            {contracts.map((contract) => (
              <Link key={contract.id} href={`/contracts/${contract.id}`}>
                <div className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#F7F8FA] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-[#ADAB9D] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-[#0B1220] truncate">{contract.title}</p>
                      <p className="text-[11.5px] text-[#64748B] mt-0.5">
                        {(contract.clients as { name: string } | null)?.name ?? "—"}
                        {(contract.projects as { title: string } | null)?.title
                          ? ` · ${(contract.projects as { title: string }).title}`
                          : ""}
                        {" · "}{(["mission_complete","mission_partielle","etude_faisabilite","suivi_chantier","autre"] as const).includes(contract.type as "mission_complete"|"mission_partielle"|"etude_faisabilite"|"suivi_chantier"|"autre") ? tt(contract.type as "mission_complete"|"mission_partielle"|"etude_faisabilite"|"suivi_chantier"|"autre") : contract.type}
                        {" · "}{formatDate(contract.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[contract.status] ?? STATUS_COLORS.brouillon}`}>
                    {(["brouillon","finalise","archived"] as const).includes(contract.status as "brouillon"|"finalise"|"archived") ? ts(contract.status as "brouillon"|"finalise"|"archived") : contract.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
            <FileText className="h-5 w-5 text-[#ADAB9D]" />
          </div>
          <p className="text-[13.5px] text-[#0B1220] font-medium mb-1">{t("empty")}</p>
          <p className="text-[12px] text-[#64748B] mb-4">{t("emptyCreate")}</p>
          <Link href="/contracts/new">
            <Button variant="outline" size="sm" className="border-[#E5E7EB] text-[#1E293B]">{t("generateCta")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
