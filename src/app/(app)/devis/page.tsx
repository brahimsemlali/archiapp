import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getWorkspaceLocalization } from "@/lib/localization";
import { getServerFormatters } from "@/lib/formatters-server";
import { DevisFilters } from "@/components/devis/devis-filters";
import { getWorkspaceId } from "@/lib/workspace";
import { getTranslations } from "next-intl/server";

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-[#F1F5F9] text-[#64748B]",
  envoye: "bg-[#E9ECFF] text-[#2563EB]",
  accepte: "bg-[#E5F3EB] text-[#2F8F5C]",
  refuse: "bg-[#FCEFE6] text-[#C75B2E]",
  expire: "bg-[#F1F5F9] text-[#ADAB9D]",
};

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("devis");
  const ts = await getTranslations("status.devis");
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) redirect("/onboarding");
  const { currency, timezone } = await getWorkspaceLocalization(supabase, workspaceId);
  const { formatDate } = await getServerFormatters(timezone);
  const money = (centimes: number) => formatMoney(centimes, currency);

  let query = supabase
    .from("devis")
    .select("id, number, title, status, total_centimes, created_at, valid_until, clients!devis_client_id_fkey(name), projects!devis_project_id_fkey(title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: devisList } = await query;

  const totalEnvoye = (devisList ?? [])
    .filter((d) => d.status === "envoye")
    .reduce((sum, d) => sum + d.total_centimes, 0);

  const totalAccepte = (devisList ?? [])
    .filter((d) => d.status === "accepte")
    .reduce((sum, d) => sum + d.total_centimes, 0);

  const sevenDaysFromNow = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <p className="eyebrow mb-1">{t("eyebrow")}</p>
          <h1 className="page-title text-[28px] text-[#0B1220]">{t("title")}</h1>
          <p className="text-[13.5px] text-[#64748B] mt-1">{t("subtitle")}</p>
        </div>
        <Link href="/devis/new" className="shrink-0">
          <Button size="sm" className="bg-[#0B1220] hover:bg-[#2D2E22] text-[#F7F8FA] border-0 shadow-none h-8 px-3 text-[13px] font-medium rounded-lg">
            {t("new")}
          </Button>
        </Link>
      </div>

      {/* KPI mini row */}
      {(totalEnvoye > 0 || totalAccepte > 0) && (
        <div className="flex gap-3 flex-wrap">
          {totalEnvoye > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
              <p className="eyebrow">{t("pending")}</p>
              <p className="font-fraunces text-[22px] text-[#0B1220] tabnum mt-0.5">{money(totalEnvoye)}</p>
            </div>
          )}
          {totalAccepte > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
              <p className="eyebrow">{t("accepted")}</p>
              <p className="font-fraunces text-[22px] text-[#2F8F5C] tabnum mt-0.5">{money(totalAccepte)}</p>
            </div>
          )}
        </div>
      )}

      <DevisFilters />

      {devisList && devisList.length > 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#F1F5F9]">
            {devisList.map((d) => {
              const client = (d.clients as unknown) as { name: string } | null;
              const project = (d.projects as unknown) as { title: string } | null;
              const isExpiringSoon = d.status === "envoye" && d.valid_until && new Date(d.valid_until) < sevenDaysFromNow;
              return (
                <Link key={d.id} href={`/devis/${d.id}`}>
                  <div className={`flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#F7F8FA] transition-colors ${isExpiringSoon ? "bg-[#FCEFE6]/30" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-[#ADAB9D] shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[#ADAB9D] font-mono">{d.number}</span>
                          <p className="text-[13.5px] font-medium text-[#0B1220] truncate">{d.title}</p>
                        </div>
                        <p className="text-[11.5px] text-[#64748B] mt-0.5">
                          {client?.name ?? "—"}
                          {project ? ` · ${project.title}` : ""}
                          {" · "}{formatDate(d.created_at)}
                          {isExpiringSoon && <span className="text-[#C75B2E] font-medium"> · {t("expiringSoon")}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[13.5px] font-semibold text-[#0B1220] tabnum">{money(d.total_centimes)}</span>
                      <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[d.status] ?? STATUS_COLORS.brouillon}`}>
                        {(["brouillon","envoye","accepte","refuse","expire"] as const).includes(d.status as "brouillon"|"envoye"|"accepte"|"refuse"|"expire") ? ts(d.status as "brouillon"|"envoye"|"accepte"|"refuse"|"expire") : d.status}
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
            <FileText className="h-5 w-5 text-[#ADAB9D]" />
          </div>
          <p className="text-[13.5px] text-[#0B1220] font-medium mb-1">{t("empty")}</p>
          <p className="text-[12px] text-[#64748B] mb-4">{t("emptyCreate")}</p>
          <Link href="/devis/new">
            <Button variant="outline" size="sm" className="border-[#E5E7EB] text-[#1E293B]">{t("createFirst")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
