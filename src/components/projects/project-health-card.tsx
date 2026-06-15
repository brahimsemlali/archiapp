import { AlertTriangle, CheckCircle2, Gauge, TimerReset } from "lucide-react";
import type { ReactNode } from "react";
import { useLocalization } from "@/components/localization-provider";

interface ProjectHealthCardProps {
  budgetEstimateCentimes: number | null;
  feesCentimes?: number | null;
  totalInvoicedCentimes?: number;
  totalPaidCentimes?: number;
  timeCostCentimes: number;
  targetEndDate: string | null;
  status: string;
  openIssuesCount: number;
  highIssuesCount: number;
  overdueTasksCount: number;
}

export function ProjectHealthCard({
  budgetEstimateCentimes,
  feesCentimes,
  totalInvoicedCentimes = 0,
  totalPaidCentimes = 0,
  timeCostCentimes,
  targetEndDate,
  status,
  openIssuesCount,
  highIssuesCount,
  overdueTasksCount,
}: ProjectHealthCardProps) {
  const { money } = useLocalization();
  const today = new Date();
  const deadline = targetEndDate ? new Date(`${targetEndDate}T00:00:00`) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - today.getTime()) / 86400000) : null;
  const budgetPct = budgetEstimateCentimes && budgetEstimateCentimes > 0
    ? Math.round((timeCostCentimes / budgetEstimateCentimes) * 100)
    : null;

  const isDelayed = status === "suspendu" || (daysLeft !== null && daysLeft < 0 && status !== "termine");
  const isOverBudget = budgetPct !== null && budgetPct > 100;
  const feeBurnPct = feesCentimes && feesCentimes > 0
    ? Math.round((timeCostCentimes / feesCentimes) * 100)
    : null;
  const billingPct = feesCentimes && feesCentimes > 0
    ? Math.round((totalInvoicedCentimes / feesCentimes) * 100)
    : null;
  const paidPct = totalInvoicedCentimes > 0
    ? Math.round((totalPaidCentimes / totalInvoicedCentimes) * 100)
    : null;
  const isRisk = !isDelayed && !isOverBudget && (
    highIssuesCount > 0 ||
    overdueTasksCount > 0 ||
    openIssuesCount > 0 ||
    (daysLeft !== null && daysLeft <= 14 && status !== "termine") ||
    (budgetPct !== null && budgetPct >= 80) ||
    (feeBurnPct !== null && feeBurnPct >= 75 && (billingPct ?? 0) < feeBurnPct)
  );
  const reasons = [
    isOverBudget ? "Coût temps au-dessus du budget estimé." : null,
    isDelayed ? "Date cible dépassée ou projet suspendu." : null,
    feeBurnPct !== null && feeBurnPct >= 75 ? "Honoraires consommés rapidement par le temps passé." : null,
    billingPct !== null && feeBurnPct !== null && billingPct < feeBurnPct ? "Facturation en retard par rapport au temps consommé." : null,
    paidPct !== null && paidPct < 80 ? "Encaissement incomplet sur les factures émises." : null,
    overdueTasksCount > 0 ? `${overdueTasksCount} tâche(s) en retard.` : null,
    highIssuesCount > 0 ? `${highIssuesCount} réserve(s) critique(s).` : null,
  ].filter(Boolean) as string[];

  const health = isDelayed || isOverBudget
    ? {
        label: "Rouge",
        title: "À corriger",
        detail: isOverBudget ? "Le coût consommé dépasse le budget estimé." : "Le planning est en retard ou suspendu.",
        className: "border-[#F1B7A0] bg-[#FCEFE6]",
        iconClassName: "text-[#C75B2E]",
      }
    : isRisk
    ? {
        label: "Orange",
        title: "Sous surveillance",
        detail: "Des réserves, tâches ou échéances nécessitent une action.",
        className: "border-amber-200 bg-amber-50",
        iconClassName: "text-amber-600",
      }
    : {
        label: "Vert",
        title: "Sain",
        detail: "Projet dans les seuils de budget, planning et réserves.",
        className: "border-[#B9DEC8] bg-[#E5F3EB]",
        iconClassName: "text-[#2F8F5C]",
      };

  const remainingBudget = budgetEstimateCentimes != null ? budgetEstimateCentimes - timeCostCentimes : null;

  return (
    <div className={`rounded-xl border p-4 ${health.className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Santé projet</p>
          <div className="mt-2 flex items-center gap-2">
            {health.label === "Vert" ? (
              <CheckCircle2 className={`h-5 w-5 ${health.iconClassName}`} />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${health.iconClassName}`} />
            )}
            <h2 className="text-base font-semibold text-[#0B1220]">{health.title}</h2>
          </div>
          <p className="mt-1 text-[12.5px] text-[#475569]">{health.detail}</p>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#0B1220]">
          {health.label}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Metric
          label="Honoraires"
          value={feesCentimes ? money(feesCentimes) : "—"}
          sub={feeBurnPct !== null ? `${feeBurnPct}% consommé` : undefined}
          danger={feeBurnPct !== null && feeBurnPct >= 90}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <Metric
          label="Facturé"
          value={totalInvoicedCentimes > 0 ? money(totalInvoicedCentimes) : "—"}
          sub={billingPct !== null ? `${billingPct}% des honoraires` : undefined}
          danger={billingPct !== null && feeBurnPct !== null && billingPct < feeBurnPct}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <Metric
          label="Budget temps"
          value={budgetEstimateCentimes ? money(budgetEstimateCentimes) : "—"}
          sub={budgetPct !== null ? `${budgetPct}% consommé` : undefined}
          danger={remainingBudget !== null && remainingBudget < 0}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <Metric
          label="Réserves ouvertes"
          value={String(openIssuesCount)}
          sub={overdueTasksCount > 0 ? `${overdueTasksCount} tâche(s) en retard` : undefined}
          danger={highIssuesCount > 0}
          icon={<TimerReset className="h-3.5 w-3.5" />}
        />
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/70 bg-white/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Pourquoi</p>
          <ul className="mt-2 grid gap-1 text-[12px] text-[#475569] sm:grid-cols-2">
            {reasons.slice(0, 4).map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  icon,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/70 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${danger ? "text-[#C75B2E]" : "text-[#0B1220]"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[#64748B]">{sub}</p>}
    </div>
  );
}
