"use client";

import { useState, useTransition } from "react";
import { PHASE_DELIVERABLES, PHASE_LABELS } from "@/lib/constants";
import { updateProjectChecklistAction } from "@/lib/actions/projects";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface PhaseChecklistProps {
  projectId: string;
  phase: string;
  initialChecklist: Record<string, ChecklistItem[]>;
}

export function PhaseChecklist({ projectId, phase, initialChecklist }: PhaseChecklistProps) {
  const defaultItems = (PHASE_DELIVERABLES[phase] ?? []).map((label) => ({ label, done: false }));
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem[]>>(() => {
    const result: Record<string, ChecklistItem[]> = {};
    for (const [p, defaults] of Object.entries(PHASE_DELIVERABLES)) {
      const saved = initialChecklist[p] ?? [];
      result[p] = defaults.map((label) => ({
        label,
        done: saved.find((s) => s.label === label)?.done ?? false,
      }));
    }
    return result;
  });
  const [isPending, startTransition] = useTransition();

  const phaseItems = checklist[phase] ?? defaultItems;
  const doneCount = phaseItems.filter((i) => i.done).length;
  const pct = phaseItems.length > 0 ? Math.round((doneCount / phaseItems.length) * 100) : 0;

  function toggle(label: string) {
    const next = {
      ...checklist,
      [phase]: (checklist[phase] ?? defaultItems).map((item) =>
        item.label === label ? { ...item, done: !item.done } : item
      ),
    };
    setChecklist(next);

    startTransition(async () => {
      const result = await updateProjectChecklistAction(projectId, next);
      if (!result.ok) toast.error("Erreur lors de la sauvegarde.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Current phase */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold">Phase actuelle : {PHASE_LABELS[phase] ?? phase}</p>
            <p className="text-sm text-muted-foreground">{doneCount} / {phaseItems.length} livrables complétés</p>
          </div>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <span className={`text-sm font-bold ${pct === 100 ? "text-green-600" : pct >= 50 ? "text-blue-600" : "text-amber-600"}`}>{pct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-2.5">
          {phaseItems.map((item) => (
            <li key={item.label}>
              <button
                className="w-full flex items-center gap-3 text-left group"
                onClick={() => toggle(item.label)}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 shrink-0 group-hover:text-gray-400" />
                )}
                <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* All phases summary */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Toutes les phases</p>
        <div className="space-y-2">
          {Object.entries(PHASE_DELIVERABLES).map(([p, items]) => {
            const pItems = checklist[p] ?? items.map((l) => ({ label: l, done: false }));
            const done = pItems.filter((i) => i.done).length;
            const isCurrentPhase = p === phase;
            return (
              <div key={p} className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm ${isCurrentPhase ? "bg-blue-50 border border-blue-100" : ""}`}>
                <span className={`w-24 shrink-0 font-medium text-xs ${isCurrentPhase ? "text-blue-700" : "text-muted-foreground"}`}>
                  {PHASE_LABELS[p] ?? p}
                </span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${done === items.length ? "bg-green-400" : isCurrentPhase ? "bg-blue-400" : "bg-gray-300"}`}
                    style={{ width: `${items.length > 0 ? (done / items.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{done}/{items.length}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
