"use client";

import { formatMAD, formatDateShort } from "@/lib/format";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FactureRow { id: string; number: string; title: string; total_centimes: number; due_date: string | null; paid_at: string | null; status: string; clients?: { name: string } | null }
interface DevisRow { id: string; number: string; title: string; total_centimes: number; valid_until: string | null; status: string }

interface Props { factures: FactureRow[]; devis: DevisRow[] }

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export function CashflowForecast({ factures, devis }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in90 = addDays(today, 90);

  // Unpaid factures with a due date in next 90 days or overdue
  const pending = factures.filter((f) => f.status === "envoyee");
  const overdue = pending.filter((f) => f.due_date && new Date(f.due_date) < today);
  const dueSoon = pending.filter((f) => f.due_date && new Date(f.due_date) >= today && new Date(f.due_date) <= in90);
  const noDueDate = pending.filter((f) => !f.due_date);

  // Potential from accepted devis (not yet invoiced in simple proxy)
  const potentialDevis = devis.filter((d) => d.status === "accepte");

  // Build 90-day timeline buckets: 0-7, 8-30, 31-60, 61-90
  type Bucket = { label: string; from: number; to: number; items: FactureRow[] };
  const buckets: Bucket[] = [
    { label: "Cette semaine", from: 0, to: 7, items: [] },
    { label: "8 – 30 jours", from: 8, to: 30, items: [] },
    { label: "31 – 60 jours", from: 31, to: 60, items: [] },
    { label: "61 – 90 jours", from: 61, to: 90, items: [] },
  ];

  for (const f of dueSoon) {
    if (!f.due_date) continue;
    const diff = Math.floor((new Date(f.due_date).getTime() - today.getTime()) / 86400000);
    const bucket = buckets.find((b) => diff >= b.from && diff <= b.to);
    if (bucket) bucket.items.push(f);
  }

  const totalOverdue = overdue.reduce((s, f) => s + f.total_centimes, 0);
  const totalForecast90 = dueSoon.reduce((s, f) => s + f.total_centimes, 0);
  const totalPotential = potentialDevis.reduce((s, d) => s + d.total_centimes, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={overdue.length > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${overdue.length > 0 ? "text-red-500" : "text-[#64748B]"}`} />
              <p className="text-xs text-[#64748B]">En retard</p>
            </div>
            <p className={`text-xl font-bold ${overdue.length > 0 ? "text-red-700" : "text-[#0B1220]"}`}>{totalOverdue > 0 ? formatMAD(totalOverdue) : "—"}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{overdue.length} facture{overdue.length > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-[#64748B]">À encaisser (90j)</p>
            </div>
            <p className="text-xl font-bold text-[#0B1220]">{totalForecast90 > 0 ? formatMAD(totalForecast90) : "—"}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{dueSoon.length} facture{dueSoon.length > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-[#64748B]">Potentiel (devis acc.)</p>
            </div>
            <p className="text-xl font-bold text-[#0B1220]">{totalPotential > 0 ? formatMAD(totalPotential) : "—"}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{potentialDevis.length} devis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-[#64748B]" />
              <p className="text-xs text-[#64748B]">Sans date d'échéance</p>
            </div>
            <p className="text-xl font-bold text-[#0B1220]">{noDueDate.length > 0 ? formatMAD(noDueDate.reduce((s, f) => s + f.total_centimes, 0)) : "—"}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{noDueDate.length} facture{noDueDate.length > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Factures en retard — action requise
          </h3>
          <div className="space-y-2">
            {overdue.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")).map((f) => {
              const daysLate = f.due_date ? Math.floor((today.getTime() - new Date(f.due_date).getTime()) / 86400000) : 0;
              return (
                <div key={f.id} className="bg-white border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm hover:shadow-sm transition-shadow">
                  <div>
                    <p className="font-medium text-[#0B1220]">{f.number} — {f.title}</p>
                    <p className="text-xs text-[#64748B]">{f.clients?.name} · Échue le {f.due_date ? formatDateShort(f.due_date) : "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-red-700">{formatMAD(f.total_centimes)}</p>
                    <p className="text-xs text-red-500">{daysLate}j de retard</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline buckets */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#0B1220]">Calendrier d'encaissement — 90 jours</h3>
        {buckets.map((b) => (
          <div key={b.label}>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">{b.label}</p>
              {b.items.length > 0 && (
                <span className="text-xs font-bold text-[#0B1220]">{formatMAD(b.items.reduce((s, f) => s + f.total_centimes, 0))}</span>
              )}
            </div>
            {b.items.length === 0 ? (
              <p className="text-xs text-[#64748B] pl-0.5">Aucune échéance</p>
            ) : (
              <div className="space-y-1.5">
                {b.items.map((f) => (
                  <div key={f.id} className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-[#0B1220]">{f.number} — {f.title}</p>
                      <p className="text-xs text-[#64748B]">{f.clients?.name} · {f.due_date ? formatDateShort(f.due_date) : "—"}</p>
                    </div>
                    <p className="font-semibold text-[#0B1220]">{formatMAD(f.total_centimes)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Potential pipeline */}
      {potentialDevis.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#0B1220] mb-2">Potentiel à facturer (devis acceptés)</h3>
          <div className="space-y-1.5">
            {potentialDevis.map((d) => (
              <div key={d.id} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-[#0B1220]">{d.number} — {d.title}</p>
                  {d.valid_until && <p className="text-xs text-[#64748B]">Valable jusqu'au {formatDateShort(d.valid_until)}</p>}
                </div>
                <p className="font-semibold text-blue-700">{formatMAD(d.total_centimes)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
