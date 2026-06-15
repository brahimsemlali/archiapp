"use client";

import Link from "next/link";
import { useLocalization } from "@/components/localization-provider";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

interface ProjectRow {
  id: string;
  title: string;
  phase: string;
  fees_centimes: number | null;
  totalInvoiced: number;
  totalPaid: number;
  totalMinutes: number;
  timeCost: number;
  hasRates: boolean;
}

interface ProjectProfitabilityProps {
  rows: ProjectRow[];
}

export function ProjectProfitability({ rows }: ProjectProfitabilityProps) {
  const tPhase = useTranslations("phase");
  const { money } = useLocalization();
  const sorted = [...rows].sort((a, b) => {
    const ma = a.hasRates && a.totalPaid > 0 ? (a.totalPaid - a.timeCost) / a.totalPaid : null;
    const mb = b.hasRates && b.totalPaid > 0 ? (b.totalPaid - b.timeCost) / b.totalPaid : null;
    if (ma === null && mb === null) return 0;
    if (ma === null) return 1;
    if (mb === null) return -1;
    return mb - ma;
  });

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[#64748B]">
        Aucun projet actif.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px_80px_60px] gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
        <span>Projet</span>
        <span className="text-right">Honoraires</span>
        <span className="text-right">Facturé</span>
        <span className="text-right">Encaissé</span>
        <span className="text-right">Temps</span>
        <span className="text-right">Coût</span>
        <span className="text-right">Marge</span>
      </div>

      {sorted.map((row) => {
        const margin = row.hasRates && row.totalPaid > 0
          ? Math.round(((row.totalPaid - row.timeCost) / row.totalPaid) * 100)
          : null;
        const grossMargin = row.hasRates ? row.totalPaid - row.timeCost : null;
        const hours = Math.floor(row.totalMinutes / 60);
        const mins = row.totalMinutes % 60;
        const billingPct = row.fees_centimes && row.fees_centimes > 0 && row.totalInvoiced > 0
          ? Math.round((row.totalInvoiced / row.fees_centimes) * 100)
          : null;

        return (
          <div
            key={row.id}
            className="bg-white border border-[#E5E7EB] rounded-xl p-3 hover:shadow-sm transition-shadow"
          >
            {/* Mobile layout */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/projects/${row.id}?tab=rentabilite`} className="font-medium text-sm text-[#0B1220] hover:underline flex items-center gap-1">
                    {row.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </Link>
                  <p className="text-xs text-[#64748B]">{tPhase.has(row.phase) ? tPhase(row.phase) : row.phase}</p>
                </div>
                {margin !== null && <MarginBadge margin={margin} />}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[#64748B]">Facturé</p>
                  <p className="font-medium">{row.totalInvoiced > 0 ? money(row.totalInvoiced) : "—"}</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Encaissé</p>
                  <p className="font-medium text-green-700">{row.totalPaid > 0 ? money(row.totalPaid) : "—"}</p>
                </div>
                <div>
                  <p className="text-[#64748B]">Temps</p>
                  <p className="font-medium">{row.totalMinutes > 0 ? `${hours}h${mins > 0 ? mins : ""}` : "—"}</p>
                </div>
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px_80px_60px] gap-2 items-center text-sm">
              <div>
                <Link href={`/projects/${row.id}?tab=rentabilite`} className="font-medium text-[#0B1220] hover:underline flex items-center gap-1.5">
                  {row.title}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
                <p className="text-xs text-[#64748B]">{tPhase.has(row.phase) ? tPhase(row.phase) : row.phase}</p>
              </div>
              <div className="text-right">
                {row.fees_centimes ? (
                  <span className="font-medium text-xs">{money(row.fees_centimes)}</span>
                ) : (
                  <span className="text-[#64748B]">—</span>
                )}
                {billingPct !== null && (
                  <p className={`text-[10px] ${billingPct >= 90 ? "text-green-700" : billingPct >= 60 ? "text-amber-700" : "text-red-600"}`}>{billingPct}% fact.</p>
                )}
              </div>
              <span className="text-right text-[#64748B]">{row.totalInvoiced > 0 ? money(row.totalInvoiced) : "—"}</span>
              <span className="text-right font-medium text-green-700">{row.totalPaid > 0 ? money(row.totalPaid) : "—"}</span>
              <span className="text-right text-[#64748B]">{row.totalMinutes > 0 ? `${hours}h${mins > 0 ? mins : ""}` : "—"}</span>
              <span className="text-right text-red-700">{row.hasRates && row.timeCost > 0 ? money(row.timeCost) : "—"}</span>
              <div className="text-right">
                {margin !== null ? (
                  <MarginBadge margin={margin} />
                ) : grossMargin !== null ? (
                  <span className={`text-xs font-semibold ${grossMargin >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {money(grossMargin)}
                  </span>
                ) : (
                  <span className="text-[#64748B]">—</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary row */}
      {rows.length > 1 && (
        <div className="bg-[#F1F5F9] border border-[#E5E7EB] rounded-xl p-3 mt-2">
          <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_80px_80px_60px] gap-2 items-center text-sm font-semibold">
            <span className="text-[#0B1220]">Total ({rows.length} projets)</span>
            <span className="text-right">{money(rows.reduce((s, r) => s + (r.fees_centimes ?? 0), 0))}</span>
            <span className="text-right">{money(rows.reduce((s, r) => s + r.totalInvoiced, 0))}</span>
            <span className="text-right text-green-700">{money(rows.reduce((s, r) => s + r.totalPaid, 0))}</span>
            <span className="text-right text-[#64748B]">{Math.floor(rows.reduce((s, r) => s + r.totalMinutes, 0) / 60)}h</span>
            <span className="text-right text-red-700">{money(rows.reduce((s, r) => s + r.timeCost, 0))}</span>
            <span />
          </div>
          <div className="sm:hidden flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="text-green-700">{money(rows.reduce((s, r) => s + r.totalPaid, 0))} encaissé</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 30) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
      <TrendingUp className="h-3 w-3" />{margin}%
    </span>
  );
  if (margin >= 10) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
      <Minus className="h-3 w-3" />{margin}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
      <TrendingDown className="h-3 w-3" />{margin}%
    </span>
  );
}
