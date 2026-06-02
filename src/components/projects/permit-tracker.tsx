"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { upsertPermitStageAction, type PermitStageRow } from "@/lib/actions/permit-stages";
import { cn } from "@/lib/utils";

const STAGES: { key: string; label: string; description: string; defaultDocs: string[] }[] = [
  {
    key: "constitution_dossier",
    label: "Constitution du dossier",
    description: "Préparation des pièces administratives et techniques",
    defaultDocs: ["Plans de situation", "Plans de masse", "Plans de façades et coupes", "Notice descriptive", "Formulaire de demande", "Copie du titre foncier"],
  },
  {
    key: "depot_commune",
    label: "Dépôt en commune",
    description: "Remise du dossier complet à la commune",
    defaultDocs: ["Accusé de réception de dépôt", "Récépissé de dépôt", "Numéro de dossier attribué"],
  },
  {
    key: "en_instruction",
    label: "En instruction",
    description: "Examen du dossier par les services communaux et autres administrations",
    defaultDocs: ["Avis du service urbanisme", "Avis ABH (si applicable)", "Avis ONEE (si applicable)", "Procès-verbal de la commission"],
  },
  {
    key: "permis_obtenu",
    label: "Permis obtenu",
    description: "Délivrance du permis de construire",
    defaultDocs: ["Arrêté de permis de construire", "Plans approuvés tamponnés", "Affichage du permis sur le chantier"],
  },
  {
    key: "validite_expiree",
    label: "Suivi validité",
    description: "Surveillance de la validité du permis (18 mois au Maroc)",
    defaultDocs: ["Déclaration d'ouverture de chantier", "Renouvellement si nécessaire"],
  },
];

const STATUS_OPTIONS = [
  { value: "en_attente", label: "En attente", color: "bg-slate-100 text-slate-600", icon: Circle },
  { value: "en_cours", label: "En cours", color: "bg-blue-100 text-blue-700", icon: Clock },
  { value: "complete", label: "Complété", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  { value: "bloque", label: "Bloqué", color: "bg-red-100 text-red-700", icon: AlertCircle },
];

function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]!;
}

interface PermitTrackerProps {
  projectId: string;
  initialStages: PermitStageRow[];
}

export function PermitTracker({ projectId, initialStages }: PermitTrackerProps) {
  const [stages, setStages] = useState<Record<string, PermitStageRow>>(() => {
    const map: Record<string, PermitStageRow> = {};
    for (const s of initialStages) map[s.stage] = s;
    return map;
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [newDocLabel, setNewDocLabel] = useState<Record<string, string>>({});

  function getOrDefault(stageKey: string): PermitStageRow {
    if (stages[stageKey]) return stages[stageKey]!;
    const def = STAGES.find((s) => s.key === stageKey)!;
    return {
      id: "",
      project_id: projectId,
      stage: stageKey,
      status: "en_attente",
      deadline: null,
      docs: def.defaultDocs.map((label) => ({ label, done: false })),
      notes: null,
      completed_at: null,
      created_at: "",
    };
  }

  async function saveStage(stageKey: string, patch: Partial<PermitStageRow>) {
    const current = getOrDefault(stageKey);
    const merged = { ...current, ...patch };
    setSaving((p) => ({ ...p, [stageKey]: true }));

    const result = await upsertPermitStageAction(projectId, stageKey, {
      status: merged.status,
      deadline: merged.deadline ?? undefined,
      docs: merged.docs,
      notes: merged.notes ?? undefined,
      completedAt: merged.status === "complete" ? (merged.completed_at ?? new Date().toISOString()) : null,
    });

    setSaving((p) => ({ ...p, [stageKey]: false }));
    if (!result.ok) { toast.error(result.error); return; }
    setStages((p) => ({ ...p, [stageKey]: { ...merged, id: result.data.id } }));
  }

  async function toggleDoc(stageKey: string, docIdx: number) {
    const current = getOrDefault(stageKey);
    const docs = current.docs.map((d, i) => i === docIdx ? { ...d, done: !d.done } : d);
    await saveStage(stageKey, { docs });
  }

  async function addDoc(stageKey: string) {
    const label = (newDocLabel[stageKey] ?? "").trim();
    if (!label) return;
    const current = getOrDefault(stageKey);
    const docs = [...current.docs, { label, done: false }];
    await saveStage(stageKey, { docs });
    setNewDocLabel((p) => ({ ...p, [stageKey]: "" }));
  }

  async function removeDoc(stageKey: string, docIdx: number) {
    const current = getOrDefault(stageKey);
    const docs = current.docs.filter((_, i) => i !== docIdx);
    await saveStage(stageKey, { docs });
  }

  const completedCount = STAGES.filter((s) => (stages[s.key]?.status ?? "en_attente") === "complete").length;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-800">Avancement permis de construire</p>
          <span className="text-sm font-bold text-primary">{completedCount}/{STAGES.length}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / STAGES.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">Délai légal de validité : 18 mois à compter de la date d&apos;obtention.</p>
      </div>

      {/* Stages */}
      {STAGES.map((stageDef, stageIdx) => {
        const data = getOrDefault(stageDef.key);
        const statusConfig = getStatusConfig(data.status);
        const StatusIcon = statusConfig.icon;
        const isExpanded = expanded[stageDef.key] ?? false;
        const doneCount = data.docs.filter((d) => d.done).length;
        const isSaving = saving[stageDef.key] ?? false;

        return (
          <div key={stageDef.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded((p) => ({ ...p, [stageDef.key]: !isExpanded }))}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{stageIdx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{stageDef.label}</p>
                  <Badge className={cn("text-xs border-0", statusConfig.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {doneCount}/{data.docs.length} documents · {stageDef.description}
                </p>
              </div>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 p-4 space-y-4">
                {/* Status + deadline */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-500">Statut</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => saveStage(stageDef.key, { status: opt.value })}
                          disabled={isSaving}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                            data.status === opt.value
                              ? `${opt.color} border-current opacity-100`
                              : "border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-500">Échéance</p>
                    <Input
                      type="date"
                      value={data.deadline ?? ""}
                      onChange={(e) => saveStage(stageDef.key, { deadline: e.target.value || null })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Documents checklist */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">Documents requis</p>
                  {data.docs.map((doc, docIdx) => (
                    <div key={docIdx} className="flex items-center gap-2 group">
                      <button
                        onClick={() => toggleDoc(stageDef.key, docIdx)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          doc.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-slate-400"
                        )}
                      >
                        {doc.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </button>
                      <span className={cn("text-sm flex-1", doc.done && "line-through text-slate-400")}>{doc.label}</span>
                      <button
                        onClick={() => removeDoc(stageDef.key, docIdx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Ajouter un document…"
                      value={newDocLabel[stageDef.key] ?? ""}
                      onChange={(e) => setNewDocLabel((p) => ({ ...p, [stageDef.key]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addDoc(stageDef.key)}
                      className="h-8 text-sm flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => addDoc(stageDef.key)} className="h-8 px-2">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500">Notes</p>
                  <Textarea
                    value={data.notes ?? ""}
                    onChange={(e) => saveStage(stageDef.key, { notes: e.target.value })}
                    rows={2}
                    placeholder="Observations, numéros de référence, contacts…"
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
