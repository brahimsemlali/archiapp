"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PHASE_ORDER } from "@/lib/constants";
import { updateProjectChecklistAction } from "@/lib/actions/projects";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface PhaseChecklistProps {
  projectId: string;
  phase: string;
  initialChecklist: Record<string, ChecklistItem[]>;
}

const PHASES: readonly string[] = PHASE_ORDER;

export function PhaseChecklist({ projectId, phase, initialChecklist }: PhaseChecklistProps) {
  const tPhase = useTranslations("phase");
  const tDeliv = useTranslations("phaseDeliverables");
  // Seed defaults come from i18n (current UI locale); persisted once a phase is touched.
  const defaultsFor = (p: string): ChecklistItem[] =>
    (tDeliv.has(p) ? (tDeliv.raw(p) as string[]) : []).map((label) => ({ label, done: false }));

  // Saved items are the source of truth; defaults only seed a phase never touched.
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem[]>>(() => {
    const result: Record<string, ChecklistItem[]> = {};
    for (const p of PHASES) {
      result[p] = initialChecklist[p] ?? defaultsFor(p);
    }
    return result;
  });
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  function setItems(p: string, items: ChecklistItem[]) {
    const next = { ...checklist, [p]: items };
    setChecklist(next);
    startTransition(async () => {
      const result = await updateProjectChecklistAction(projectId, next);
      if (!result.ok) toast.error("Erreur lors de la sauvegarde.");
    });
  }

  const phaseItems = checklist[phase] ?? [];
  const doneCount = phaseItems.filter((i) => i.done).length;
  const pct = phaseItems.length > 0 ? Math.round((doneCount / phaseItems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Current phase */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold">Phase actuelle : {tPhase.has(phase) ? tPhase(phase) : phase}</p>
            <p className="text-sm text-muted-foreground">{doneCount} / {phaseItems.length} livrables complétés</p>
          </div>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <span className={`text-sm font-bold ${pct === 100 ? "text-green-600" : pct >= 50 ? "text-blue-600" : "text-amber-600"}`}>{pct}%</span>
          </div>
        </div>

        <div className="h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <PhaseItemsEditor items={phaseItems} onChange={(items) => setItems(phase, items)} />
      </div>

      {/* All phases — expandable to edit any phase's deliverables */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Toutes les phases</p>
        <div className="space-y-2">
          {PHASES.map((p) => {
            const pItems = checklist[p] ?? [];
            const done = pItems.filter((i) => i.done).length;
            const total = pItems.length;
            const isCurrentPhase = p === phase;
            const isOpen = expanded === p;
            return (
              <div key={p} className={`rounded-lg border ${isCurrentPhase ? "border-blue-100 bg-blue-50/50" : "border-gray-100"}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : p)}
                  className="w-full flex items-center gap-3 py-2 px-3 text-sm"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className={`w-24 shrink-0 text-left font-medium text-xs ${isCurrentPhase ? "text-blue-700" : "text-muted-foreground"}`}>
                    {tPhase.has(p) ? tPhase(p) : p}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${total > 0 && done === total ? "bg-green-400" : isCurrentPhase ? "bg-blue-400" : "bg-gray-300"}`}
                      style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{done}/{total}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    <PhaseItemsEditor items={pItems} onChange={(items) => setItems(p, items)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PhaseItemsEditor({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [adding, setAdding] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  function toggle(idx: number) {
    onChange(items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  }

  function startEdit(idx: number) {
    setEditIdx(idx);
    setEditValue(items[idx]?.label ?? "");
  }

  function commitEdit() {
    if (editIdx === null) return;
    const label = editValue.trim();
    const idx = editIdx;
    setEditIdx(null);
    setEditValue("");
    if (label && label !== items[idx]?.label) {
      onChange(items.map((it, i) => (i === idx ? { ...it, label } : it)));
    }
  }

  function add() {
    const label = adding.trim();
    if (!label) return;
    onChange([...items, { label, done: false }]);
    setAdding("");
  }

  return (
    <div>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2.5 group rounded-md px-1 -mx-1 hover:bg-gray-50">
            <button onClick={() => toggle(idx)} className="shrink-0 py-1" aria-label="Marquer comme fait">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400" />
              )}
            </button>
            {editIdx === idx ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") { setEditIdx(null); setEditValue(""); }
                }}
                className="flex-1 text-sm border-b border-primary/40 outline-none bg-transparent py-1"
              />
            ) : (
              <button
                onClick={() => startEdit(idx)}
                title="Cliquer pour modifier"
                className={`flex-1 text-left text-sm py-1 ${item.done ? "line-through text-muted-foreground" : ""}`}
              >
                {item.label}
              </button>
            )}
            <button
              onClick={() => remove(idx)}
              className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              aria-label="Supprimer le livrable"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground px-1 py-1.5">Aucun livrable. Ajoutez-en un ci-dessous.</li>
        )}
      </ul>
      <div className="flex items-center gap-2 mt-2.5 px-1">
        <Plus className="h-4 w-4 text-gray-400 shrink-0" />
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Ajouter un livrable…"
          className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-primary bg-transparent py-1"
        />
        {adding.trim() && (
          <button onClick={add} className="text-xs font-semibold text-primary shrink-0">Ajouter</button>
        )}
      </div>
    </div>
  );
}
