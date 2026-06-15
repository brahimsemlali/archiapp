"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PHASE_ORDER } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useLocalization } from "@/components/localization-provider";
import { cn } from "@/lib/utils";
import { updateProjectPhaseBudgetsAction } from "@/lib/actions/projects";

export type PhaseBudgetMap = Record<string, {
  plannedHours?: number;
  plannedBudgetCentimes?: number;
}>;

export interface PhaseActualRow {
  phase: string | null;
  minutes: number;
  costCentimes: number;
}

interface DraftRow {
  phase: string;
  plannedHours: string;
  plannedBudget: string;
}

function centimesToInput(value: number | undefined): string {
  if (!value) return "";
  return (value / 100).toFixed(2);
}

function inputToCentimes(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest > 0 ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

export function PhaseBudgetPlanner({
  projectId,
  initialBudgets,
  actuals,
}: {
  projectId: string;
  initialBudgets: PhaseBudgetMap;
  actuals: PhaseActualRow[];
}) {
  const tPhase = useTranslations("phase");
  const { money } = useLocalization();
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>(() =>
    PHASE_ORDER.map((phase) => ({
      phase,
      plannedHours: initialBudgets[phase]?.plannedHours ? String(initialBudgets[phase]?.plannedHours) : "",
      plannedBudget: centimesToInput(initialBudgets[phase]?.plannedBudgetCentimes),
    }))
  );

  const actualByPhase = useMemo(() => {
    const map = new Map<string, { minutes: number; costCentimes: number }>();
    for (const actual of actuals) {
      const phase = actual.phase && PHASE_ORDER.includes(actual.phase as (typeof PHASE_ORDER)[number])
        ? actual.phase
        : "esquisse";
      const current = map.get(phase) ?? { minutes: 0, costCentimes: 0 };
      current.minutes += actual.minutes;
      current.costCentimes += actual.costCentimes;
      map.set(phase, current);
    }
    return map;
  }, [actuals]);

  const totals = rows.reduce((acc, row) => {
    acc.plannedHours += Number.parseFloat(row.plannedHours.replace(",", ".")) || 0;
    acc.plannedBudget += inputToCentimes(row.plannedBudget);
    return acc;
  }, { plannedHours: 0, plannedBudget: 0 });
  const actualMinutes = actuals.reduce((sum, actual) => sum + actual.minutes, 0);
  const actualCost = actuals.reduce((sum, actual) => sum + actual.costCentimes, 0);
  const hoursPct = totals.plannedHours > 0 ? Math.round((actualMinutes / 60 / totals.plannedHours) * 100) : null;
  const budgetPct = totals.plannedBudget > 0 ? Math.round((actualCost / totals.plannedBudget) * 100) : null;

  async function save() {
    setSaving(true);
    const result = await updateProjectPhaseBudgetsAction(projectId, rows.map((row) => ({
      phase: row.phase,
      plannedHours: Number.parseFloat(row.plannedHours.replace(",", ".")) || 0,
      plannedBudgetCentimes: inputToCentimes(row.plannedBudget),
    })));
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Budgets par phase enregistrés.");
  }

  return (
    <Card>
      <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Budgets par phase</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Comparez les heures et coûts prévus avec les temps réellement saisis.
          </p>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Summary label="Heures prévues" value={totals.plannedHours > 0 ? `${Math.round(totals.plannedHours)}h` : "—"} />
          <Summary label="Heures réelles" value={actualMinutes > 0 ? formatHours(actualMinutes) : "—"} danger={hoursPct !== null && hoursPct > 100} />
          <Summary label="Budget prévu" value={totals.plannedBudget > 0 ? money(totals.plannedBudget) : "—"} />
          <Summary label="Coût réel" value={actualCost > 0 ? money(actualCost) : "—"} danger={budgetPct !== null && budgetPct > 100} />
        </div>

        {(hoursPct !== null && hoursPct > 100) || (budgetPct !== null && budgetPct > 100) ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#F2C9B8] bg-[#FCEFE6] p-3 text-sm text-[#9A3F1F]">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Ce projet dépasse au moins un objectif de phase. Vérifiez les phases en rouge avant d'accepter de nouvelles demandes client.
            </p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div className="min-w-[760px] space-y-2">
            <div className="grid grid-cols-[150px_110px_110px_1fr_100px_110px] gap-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Phase</span>
              <span>H prévues</span>
              <span>Budget prévu</span>
              <span>Avancement temps</span>
              <span className="text-right">Coût réel</span>
              <span className="text-right">Écart</span>
            </div>
            {rows.map((row, index) => {
              const actual = actualByPhase.get(row.phase) ?? { minutes: 0, costCentimes: 0 };
              const plannedHours = Number.parseFloat(row.plannedHours.replace(",", ".")) || 0;
              const plannedBudget = inputToCentimes(row.plannedBudget);
              const phaseHoursPct = plannedHours > 0 ? Math.round((actual.minutes / 60 / plannedHours) * 100) : 0;
              const variance = plannedBudget > 0 ? plannedBudget - actual.costCentimes : 0;
              const isOver = (plannedHours > 0 && phaseHoursPct > 100) || (plannedBudget > 0 && actual.costCentimes > plannedBudget);

              return (
                <div key={row.phase} className={cn("grid grid-cols-[150px_110px_110px_1fr_100px_110px] items-center gap-3 rounded-xl border p-2 text-sm", isOver ? "border-[#F2C9B8] bg-[#FFF7F3]" : "border-[#E5E7EB] bg-white")}>
                  <span className="font-medium text-[#0B1220]">{tPhase.has(row.phase) ? tPhase(row.phase) : row.phase}</span>
                  <Input
                    value={row.plannedHours}
                    type="number"
                    min="0"
                    step="0.25"
                    onChange={(event) => setRows((current) => current.map((item, i) => i === index ? { ...item, plannedHours: event.target.value } : item))}
                    placeholder="0"
                  />
                  <Input
                    value={row.plannedBudget}
                    type="number"
                    min="0"
                    step="0.01"
                    onChange={(event) => setRows((current) => current.map((item, i) => i === index ? { ...item, plannedBudget: event.target.value } : item))}
                    placeholder="0.00"
                  />
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{actual.minutes > 0 ? formatHours(actual.minutes) : "—"}</span>
                      <span className={cn("font-semibold", isOver ? "text-[#C75B2E]" : "text-[#2F8F5C]")}>{plannedHours > 0 ? `${phaseHoursPct}%` : "—"}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F5F9]">
                      <div
                        className={cn("h-2 rounded-full", isOver ? "bg-[#C75B2E]" : "bg-[#2F8F5C]")}
                        style={{ width: `${Math.min(100, phaseHoursPct)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right tabular-nums text-red-700">{actual.costCentimes > 0 ? money(actual.costCentimes) : "—"}</span>
                  <span className={cn("text-right font-semibold tabular-nums", variance < 0 ? "text-[#C75B2E]" : variance > 0 ? "text-[#2F8F5C]" : "text-muted-foreground")}>
                    {plannedBudget > 0 ? money(variance) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", danger ? "text-[#C75B2E]" : "text-[#0B1220]")}>{value}</p>
    </div>
  );
}
