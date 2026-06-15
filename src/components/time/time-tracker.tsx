"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Edit2, Check, X } from "lucide-react";
import { createTimeEntryAction, updateTimeEntryAction, deleteTimeEntryAction } from "@/lib/actions/time-entries";
import { useLocalization } from "@/components/localization-provider";
import { cn } from "@/lib/utils";

interface Project { id: string; title: string }
interface Task { id: string; title: string; project_id: string | null }

interface TimeEntry {
  id: string;
  project_id: string | null;
  task_id: string | null;
  phase: string | null;
  description: string | null;
  duration_minutes: number;
  date: string;
  billable: boolean;
  rate_centimes: number | null;
  projects?: { title: string } | null;
}

interface TimeTrackerProps {
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
}

const PHASES = ["esquisse", "aps", "apd", "pc", "dce", "chantier", "reception", "autre"] as const;

type DateRange = "week" | "month" | "last_month" | "all";
const RANGE_LABELS: Record<DateRange, string> = {
  week: "7 jours", month: "Ce mois", last_month: "Mois dernier", all: "Tout",
};

type EditState = {
  projectId: string; taskId: string; phase: string; description: string;
  hours: string; mins: string; date: string; billable: boolean; rate: string;
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m}min`;
}

function getRangeDates(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString().slice(0, 10);
  if (range === "week") {
    const from = new Date(now); from.setDate(from.getDate() - 6);
    return { from: pad(from), to: pad(now) };
  }
  if (range === "month") {
    return { from: pad(new Date(now.getFullYear(), now.getMonth(), 1)), to: pad(now) };
  }
  if (range === "last_month") {
    return {
      from: pad(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: pad(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  return { from: "2000-01-01", to: pad(now) };
}

const RATE_LS_KEY = "te_last_rate_mad";

export function TimeTracker({ projects, tasks, entries: initialEntries }: TimeTrackerProps) {
  const { money, formatDateParts } = useLocalization();
  const tPhase = useTranslations("phase");
  const [entrySnapshot, setEntrySnapshot] = useState({
    source: initialEntries,
    entries: initialEntries,
  });
  const [range, setRange] = useState<DateRange>("month");

  // Manual form
  const [showManual, setShowManual] = useState(false);
  const [manualProject, setManualProject] = useState("");
  const [manualTask, setManualTask] = useState("");
  const [manualPhase, setManualPhase] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualHours, setManualHours] = useState("1");
  const [manualMins, setManualMins] = useState("0");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualBillable, setManualBillable] = useState(true);
  const [manualRate, setManualRate] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(RATE_LS_KEY) ?? "") : ""
  );
  const [saving, setSaving] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  if (entrySnapshot.source !== initialEntries) {
    setEntrySnapshot({ source: initialEntries, entries: initialEntries });
  }

  const entries = entrySnapshot.entries;
  const setEntries = (update: TimeEntry[] | ((currentEntries: TimeEntry[]) => TimeEntry[])) => {
    setEntrySnapshot((current) => ({
      source: current.source,
      entries: typeof update === "function" ? update(current.entries) : update,
    }));
  };

  // Derived data
  const { from, to } = getRangeDates(range);
  const filtered = entries.filter((e) => e.date >= from && e.date <= to);
  const totalMinutes = filtered.reduce((s, e) => s + e.duration_minutes, 0);
  const billableMinutes = filtered.filter((e) => e.billable).reduce((s, e) => s + e.duration_minutes, 0);
  const valueCentimes = filtered
    .filter((e) => e.billable && e.rate_centimes)
    .reduce((s, e) => s + Math.round((e.duration_minutes / 60) * (e.rate_centimes ?? 0)), 0);

  const phaseMap: Record<string, number> = {};
  for (const e of filtered) {
    const key = e.phase ?? "autre";
    phaseMap[key] = (phaseMap[key] ?? 0) + e.duration_minutes;
  }
  const phaseBreakdown = Object.entries(phaseMap).sort((a, b) => b[1] - a[1]);

  const byDate: Record<string, TimeEntry[]> = {};
  for (const e of filtered) { (byDate[e.date] ??= []).push(e); }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  function tasksForProject(projectId: string) {
    return projectId ? tasks.filter((t) => t.project_id === projectId) : [];
  }

  // Manual save
  async function handleManualSave() {
    const mins = (parseInt(manualHours || "0") * 60) + parseInt(manualMins || "0");
    if (mins < 1) { toast.error("Durée invalide."); return; }
    const rateCentimes = manualRate ? Math.round(parseFloat(manualRate) * 100) : undefined;
    setSaving(true);
    const result = await createTimeEntryAction({
      projectId: manualProject || undefined,
      taskId: manualTask || undefined,
      phase: manualPhase || undefined,
      description: manualDesc || undefined,
      durationMinutes: mins,
      date: manualDate,
      billable: manualBillable,
      rateCentimes,
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    if (manualRate && typeof window !== "undefined") localStorage.setItem(RATE_LS_KEY, manualRate);
    const project = projects.find((p) => p.id === manualProject);
    setEntries((prev) => [{
      id: result.data.id, project_id: manualProject || null, task_id: manualTask || null,
      phase: manualPhase || null, description: manualDesc || null,
      duration_minutes: mins, date: manualDate, billable: manualBillable,
      rate_centimes: rateCentimes ?? null,
      projects: project ? { title: project.title } : null,
    }, ...prev]);
    toast.success("Entrée ajoutée.");
    setShowManual(false);
    setManualDesc(""); setManualHours("1"); setManualMins("0"); setManualTask("");
  }

  // Inline edit
  function startEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setEditForm({
      projectId: entry.project_id ?? "", taskId: entry.task_id ?? "",
      phase: entry.phase ?? "", description: entry.description ?? "",
      hours: String(Math.floor(entry.duration_minutes / 60)),
      mins: String(entry.duration_minutes % 60),
      date: entry.date, billable: entry.billable,
      rate: entry.rate_centimes ? String(entry.rate_centimes / 100) : "",
    });
  }

  async function handleEditSave() {
    if (!editForm || !editingId) return;
    const mins = (parseInt(editForm.hours || "0") * 60) + parseInt(editForm.mins || "0");
    if (mins < 1) { toast.error("Durée invalide."); return; }
    const rateCentimes = editForm.rate ? Math.round(parseFloat(editForm.rate) * 100) : undefined;
    setEditSaving(true);
    const result = await updateTimeEntryAction(editingId, {
      projectId: editForm.projectId || undefined,
      taskId: editForm.taskId || undefined,
      phase: editForm.phase || undefined,
      description: editForm.description || undefined,
      durationMinutes: mins, date: editForm.date, billable: editForm.billable,
      rateCentimes,
    });
    setEditSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    if (editForm.rate && typeof window !== "undefined") localStorage.setItem(RATE_LS_KEY, editForm.rate);
    const project = projects.find((p) => p.id === editForm.projectId);
    setEntries((prev) => prev.map((e) => e.id === editingId ? {
      ...e, project_id: editForm.projectId || null, task_id: editForm.taskId || null,
      phase: editForm.phase || null, description: editForm.description || null,
      duration_minutes: mins, date: editForm.date, billable: editForm.billable,
      rate_centimes: rateCentimes ?? null,
      projects: project ? { title: project.title } : e.projects,
    } : e));
    setEditingId(null); setEditForm(null);
    toast.success("Entrée mise à jour.");
  }

  async function handleDelete(id: string) {
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const result = await deleteTimeEntryAction(id);
    if (!result.ok) { setEntries(snapshot); toast.error(result.error); return; }
    toast.success("Supprimé.");
  }

  return (
    <div className="space-y-6">
      {/* Date range chips */}
      <div className="flex items-center gap-1.5">
        {(Object.entries(RANGE_LABELS) as [DateRange, string][]).map(([r, label]) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-colors",
              range === r
                ? "bg-[#0B1220] text-white border-[#0B1220]"
                : "border-[#E5E7EB] text-[#64748B] hover:border-[#0B1220] hover:text-[#0B1220]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-xl font-bold text-slate-900">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Facturable</p>
          <p className="text-xl font-bold text-emerald-600">{formatDuration(billableMinutes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Non facturable</p>
          <p className="text-xl font-bold text-slate-400">{formatDuration(totalMinutes - billableMinutes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Valeur estimée</p>
          <p className="text-xl font-bold text-blue-600">{valueCentimes > 0 ? money(valueCentimes) : "—"}</p>
        </div>
      </div>

      {/* Phase breakdown */}
      {phaseBreakdown.length > 0 && totalMinutes > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Répartition par phase</p>
          <div className="space-y-2">
            {phaseBreakdown.map(([phase, mins]) => (
              <div key={phase} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20 shrink-0">{tPhase.has(phase) ? tPhase(phase) : phase}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${Math.round((mins / totalMinutes) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-slate-700 w-14 text-right">{formatDuration(mins)}</span>
                <span className="text-xs text-slate-400 w-8 text-right">{Math.round((mins / totalMinutes) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">Entrées de temps</h2>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowManual((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />Ajouter manuellement
          </Button>
        </div>

        {showManual && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Projet</Label>
                <Select value={manualProject || "none"} onValueChange={(v) => { setManualProject((v ?? "none") === "none" ? "" : (v ?? "")); setManualTask(""); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tâche</Label>
                <Select value={manualTask || "none"} onValueChange={(v) => setManualTask((v ?? "none") === "none" ? "" : (v ?? ""))} disabled={!manualProject}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {tasksForProject(manualProject).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phase</Label>
                <Select value={manualPhase || "none"} onValueChange={(v) => setManualPhase((v ?? "none") === "none" ? "" : (v ?? ""))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {PHASES.map((ph) => <SelectItem key={ph} value={ph}>{tPhase.has(ph) ? tPhase(ph) : ph}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input className="h-8 text-sm" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder="Réunion, modélisation…" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Heures</Label>
                <Input type="number" min={0} className="h-8 text-sm" value={manualHours} onChange={(e) => setManualHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Minutes</Label>
                <Input type="number" min={0} max={59} className="h-8 text-sm" value={manualMins} onChange={(e) => setManualMins(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" className="h-8 text-sm" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Taux (MAD/h)</Label>
                <Input type="number" min={0} className="h-8 text-sm" value={manualRate} onChange={(e) => setManualRate(e.target.value)} placeholder="500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="te-billable" checked={manualBillable} onChange={(e) => setManualBillable(e.target.checked)} className="rounded" />
              <Label htmlFor="te-billable" className="text-xs cursor-pointer">Facturable</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleManualSave} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowManual(false)}>Annuler</Button>
            </div>
          </div>
        )}

        {sortedDates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune entrée de temps.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const dayEntries = byDate[date] ?? [];
              const dayTotal = dayEntries.reduce((s, e) => s + e.duration_minutes, 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500">
                      {formatDateParts(date, { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <span className="text-xs text-slate-400">{formatDuration(dayTotal)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {dayEntries.map((entry) =>
                      editingId === entry.id && editForm ? (
                        <div key={entry.id} className="bg-blue-50 rounded-xl border border-blue-200 p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={editForm.projectId || "none"} onValueChange={(v) => setEditForm((f) => f ? { ...f, projectId: (v ?? "none") === "none" ? "" : (v ?? ""), taskId: "" } : f)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Projet" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucun projet</SelectItem>
                                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={editForm.taskId || "none"} onValueChange={(v) => setEditForm((f) => f ? { ...f, taskId: (v ?? "none") === "none" ? "" : (v ?? "") } : f)} disabled={!editForm.projectId}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tâche" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucune tâche</SelectItem>
                                {tasksForProject(editForm.projectId).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={editForm.phase || "none"} onValueChange={(v) => setEditForm((f) => f ? { ...f, phase: (v ?? "none") === "none" ? "" : (v ?? "") } : f)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Phase" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucune phase</SelectItem>
                                {PHASES.map((ph) => <SelectItem key={ph} value={ph}>{tPhase.has(ph) ? tPhase(ph) : ph}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input value={editForm.description} onChange={(e) => setEditForm((f) => f ? { ...f, description: e.target.value } : f)} placeholder="Description" className="h-7 text-xs" />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <Input type="number" min={0} value={editForm.hours} onChange={(e) => setEditForm((f) => f ? { ...f, hours: e.target.value } : f)} placeholder="h" className="h-7 text-xs" />
                            <Input type="number" min={0} max={59} value={editForm.mins} onChange={(e) => setEditForm((f) => f ? { ...f, mins: e.target.value } : f)} placeholder="min" className="h-7 text-xs" />
                            <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => f ? { ...f, date: e.target.value } : f)} className="h-7 text-xs" />
                            <Input type="number" min={0} value={editForm.rate} onChange={(e) => setEditForm((f) => f ? { ...f, rate: e.target.value } : f)} placeholder="MAD/h" className="h-7 text-xs" />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={editForm.billable} onChange={(e) => setEditForm((f) => f ? { ...f, billable: e.target.checked } : f)} className="rounded" />
                              Facturable
                            </label>
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 text-xs px-2 gap-1" onClick={handleEditSave} disabled={editSaving}>
                                <Check className="h-3 w-3" />{editSaving ? "…" : "Valider"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1" onClick={() => { setEditingId(null); setEditForm(null); }}>
                                <X className="h-3 w-3" />Annuler
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div key={entry.id} className="group flex items-center gap-3 py-2.5 px-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", entry.billable ? "bg-emerald-400" : "bg-slate-300")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-800 tabular-nums">{formatDuration(entry.duration_minutes)}</span>
                              {entry.projects?.title && <span className="text-xs text-slate-500 truncate">{entry.projects.title}</span>}
                              {entry.phase && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{tPhase.has(entry.phase) ? tPhase(entry.phase) : entry.phase.toUpperCase()}</Badge>
                              )}
                              {entry.rate_centimes && entry.rate_centimes > 0 && (
                                <span className="text-[10px] text-blue-500 font-medium">
                                  {money(Math.round((entry.duration_minutes / 60) * entry.rate_centimes))}
                                </span>
                              )}
                            </div>
                            {entry.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(entry)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
