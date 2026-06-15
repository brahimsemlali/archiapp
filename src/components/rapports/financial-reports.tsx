"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/components/localization-provider";
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

interface Facture {
  id: string;
  number: string;
  title: string;
  total_centimes: number;
  tva_centimes: number;
  subtotal_centimes: number;
  status: string;
  paid_at: string | null;
  due_date: string | null;
  created_at: string;
  client_id: string;
  project_id: string | null;
  clients?: { name: string } | null;
}

interface Devi {
  id: string;
  number: string;
  total_centimes: number;
  tva_centimes: number;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  phase: string;
  status: string;
  fees_centimes: number | null;
}

interface FinancialReportsProps {
  factures: Facture[];
  devis: Devi[];
  projects: Project[];
  year: number;
}

export function FinancialReports({ factures, year }: FinancialReportsProps) {
  const { money, taxLabel } = useLocalization();
  const [tab, setTab] = useState<"revenue" | "tva" | "aging">("revenue");

  const stats = useMemo(() => {
    const paid = factures.filter((f) => f.status === "payee");
    const pending = factures.filter((f) => f.status === "envoyee");
    const today = new Date();
    const overdue = pending.filter((f) => f.due_date && new Date(f.due_date) < today);

    const totalPaid = paid.reduce((s, f) => s + f.total_centimes, 0);
    const totalPending = pending.reduce((s, f) => s + f.total_centimes, 0);
    const totalOverdue = overdue.reduce((s, f) => s + f.total_centimes, 0);
    const tvaPaid = paid.reduce((s, f) => s + f.tva_centimes, 0);
    const htPaid = paid.reduce((s, f) => s + f.subtotal_centimes, 0);

    // Monthly revenue
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const monthPaid = paid
        .filter((f) => new Date(f.paid_at ?? f.created_at).getMonth() === i)
        .reduce((s, f) => s + f.total_centimes, 0);
      const monthBilled = factures
        .filter((f) => new Date(f.created_at).getMonth() === i)
        .reduce((s, f) => s + f.total_centimes, 0);
      return { month: i, paid: monthPaid, billed: monthBilled };
    });

    const maxMonthly = Math.max(...monthly.map((m) => Math.max(m.paid, m.billed)), 1);

    // Aging buckets (pending invoices)
    const aging = {
      current: pending.filter((f) => !f.due_date || new Date(f.due_date) >= today),
      days30: overdue.filter((f) => {
        const diff = (today.getTime() - new Date(f.due_date!).getTime()) / 86400000;
        return diff <= 30;
      }),
      days60: overdue.filter((f) => {
        const diff = (today.getTime() - new Date(f.due_date!).getTime()) / 86400000;
        return diff > 30 && diff <= 60;
      }),
      days90: overdue.filter((f) => {
        const diff = (today.getTime() - new Date(f.due_date!).getTime()) / 86400000;
        return diff > 60;
      }),
    };

    return { paid, pending, overdue, totalPaid, totalPending, totalOverdue, tvaPaid, htPaid, monthly, maxMonthly, aging };
  }, [factures]);

  // TVA quarterly
  const tvaByQ = useMemo(() => {
    const quarters = [0, 1, 2, 3].map((q) => {
      const months = [q * 3, q * 3 + 1, q * 3 + 2];
      const paidF = factures.filter((f) => f.status === "payee" && months.includes(new Date(f.paid_at ?? f.created_at).getMonth()));
      return {
        q: q + 1,
        htTotal: paidF.reduce((s, f) => s + f.subtotal_centimes, 0),
        tvaCollected: paidF.reduce((s, f) => s + f.tva_centimes, 0),
      };
    });
    return quarters;
  }, [factures]);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Encaissé (TTC)" value={money(stats.totalPaid / 100)} sub={`HT: ${money(stats.htPaid / 100)}`} color="emerald" icon={CheckCircle2} />
        <StatCard label="En attente" value={money(stats.totalPending / 100)} sub={`${stats.pending.length} factures`} color="blue" icon={Clock} />
        <StatCard label="En retard" value={money(stats.totalOverdue / 100)} sub={`${stats.overdue.length} factures`} color="red" icon={AlertTriangle} />
        <StatCard label={`${taxLabel} collectée`} value={money(stats.tvaPaid / 100)} sub={`Sur factures payées`} color="purple" icon={TrendingUp} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["revenue", "tva", "aging"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "revenue" ? "Chiffre d'affaires" : t === "tva" ? taxLabel : "Vieillissement"}
          </button>
        ))}
      </div>

      {/* Revenue chart */}
      {tab === "revenue" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-6">CA mensuel {year}</h2>
          <div className="flex items-end gap-2 h-48">
            {stats.monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-40">
                  <div
                    className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                    style={{ height: `${(m.billed / stats.maxMonthly) * 100}%` }}
                    title={`Facturé: ${money(m.billed / 100)}`}
                  />
                  <div
                    className="flex-1 bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${(m.paid / stats.maxMonthly) * 100}%` }}
                    title={`Encaissé: ${money(m.paid / 100)}`}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{MONTHS_FR[m.month]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-primary/20 inline-block" /> Facturé
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Encaissé
            </div>
          </div>
        </div>
      )}

      {/* TVA table */}
      {tab === "tva" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">{`Déclaration  — `}{year}</h2>
          <p className="text-xs text-slate-400 mb-4">Basé sur les factures payées dans chaque trimestre.</p>
          <div className="space-y-3">
            {tvaByQ.map((q) => (
              <div key={q.q} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-16 text-sm font-semibold text-slate-700">T{q.q}</div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">HT facturé</p>
                    <p className="text-sm font-semibold text-slate-900">{money(q.htTotal / 100)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{` collectée`}</p>
                    <p className="text-sm font-semibold text-emerald-700">{money(q.tvaCollected / 100)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-primary/5 rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{`Total  `}{year}</span>
            <span className="text-lg font-bold text-primary">{money(stats.tvaPaid / 100)}</span>
          </div>
        </div>
      )}

      {/* Aging */}
      {tab === "aging" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Vieillissement des créances</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Courant", items: stats.aging.current, color: "bg-slate-100 text-slate-700" },
              { label: "0–30 jours", items: stats.aging.days30, color: "bg-amber-100 text-amber-700" },
              { label: "31–60 jours", items: stats.aging.days60, color: "bg-orange-100 text-orange-700" },
              { label: "> 60 jours", items: stats.aging.days90, color: "bg-red-100 text-red-700" },
            ].map((bucket) => (
              <div key={bucket.label} className={cn("rounded-xl p-3", bucket.color)}>
                <p className="text-xs font-semibold mb-1">{bucket.label}</p>
                <p className="text-base font-bold">{money(bucket.items.reduce((s, f) => s + f.total_centimes, 0) / 100)}</p>
                <p className="text-xs opacity-70">{bucket.items.length} facture{bucket.items.length !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>

          {stats.overdue.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Factures en retard</h3>
              {stats.overdue.map((f) => {
                const daysLate = Math.floor((new Date().getTime() - new Date(f.due_date!).getTime()) / 86400000);
                return (
                  <div key={f.id} className="flex items-center gap-3 py-2 px-3 bg-red-50 rounded-xl">
                    <FileText className="h-4 w-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{f.number} — {f.title}</p>
                      <p className="text-xs text-slate-500">{f.clients?.name} · en retard de {daysLate}j</p>
                    </div>
                    <span className="text-sm font-semibold text-red-700 shrink-0">{money(f.total_centimes / 100)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub: string; color: string; icon: React.ElementType }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
  } as Record<string, string>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", colors[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
