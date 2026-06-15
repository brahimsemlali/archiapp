"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  Bot, CheckSquare, Loader2, Plus, Sparkles, TriangleAlert,
  Clock, Users, CalendarCheck, Trash2, Download, Timer, FileCheck,
  X, ChevronDown, ChevronUp, PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createMeetingAction,
  generateAiForMeetingAction,
  createTasksFromMeetingAction,
  createTimeEntryFromMeetingAction,
  deleteMeetingAction,
} from "@/lib/actions/meeting-intelligence";
import { useLocalization } from "@/components/localization-provider";
import { MeetingPvSignaturePad } from "@/components/projects/meeting-pv-signature-pad";

const MEETING_TYPE_LABELS: Record<string, string> = {
  reunion_client: "Réunion client",
  revue_conception: "Revue de conception",
  reunion_chantier: "Réunion de chantier",
  reunion_fournisseur: "Réunion fournisseur",
  kick_off: "Lancement",
  reception: "Réception",
};

const MEETING_TYPE_COLORS: Record<string, string> = {
  reunion_client: "bg-blue-50 text-blue-700",
  revue_conception: "bg-purple-50 text-purple-700",
  reunion_chantier: "bg-orange-50 text-orange-700",
  reunion_fournisseur: "bg-slate-50 text-slate-700",
  kick_off: "bg-emerald-50 text-emerald-700",
  reception: "bg-green-50 text-green-700",
};

export interface MeetingRow {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string | null;
  attendees: unknown;
  duration_planned_minutes: number | null;
  duration_actual_minutes: number | null;
  summary: string | null;
  decisions: unknown;
  risks: unknown;
  extracted_tasks: unknown;
  ai_generated: boolean;
  pv_signed_at: string | null;
  pv_signer_name: string | null;
  metadata: unknown;
}

interface CarryoverTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
}

interface ExtractedTask {
  title: string;
  assigneeHint?: string;
  dueDate?: string;
  priority: "haute" | "moyenne" | "basse";
  context?: string;
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function parseDurationToMinutes(h: string, m: string): number | undefined {
  const hours = parseInt(h || "0", 10);
  const mins = parseInt(m || "0", 10);
  const total = hours * 60 + mins;
  return total > 0 ? total : undefined;
}

export function MeetingIntelligencePanel({
  projectId,
  meetings: initialMeetings,
  aiEnabled,
  carryoverTasks,
}: {
  projectId: string;
  meetings: MeetingRow[];
  aiEnabled: boolean;
  carryoverTasks: CarryoverTask[];
}) {
  const { formatDate } = useLocalization();
  const today = new Date().toISOString().slice(0, 10);

  const [meetingSnapshot, setMeetingSnapshot] = useState({
    source: initialMeetings,
    meetings: initialMeetings,
  });
  const [saving, setSaving] = useState(false);
  const [generatingAiFor, setGeneratingAiFor] = useState<string | null>(null);
  const [creatingTasksFor, setCreatingTasksFor] = useState<string | null>(null);
  const [creatingTimeEntryFor, setCreatingTimeEntryFor] = useState<string | null>(null);
  const [deletingFor, setDeletingFor] = useState<string | null>(null);
  const [signingFor, setSigningFor] = useState<string | null>(null);
  const [showCarryover, setShowCarryover] = useState(carryoverTasks.length > 0);

  const [form, setForm] = useState({
    title: "",
    meetingDate: today,
    meetingType: "reunion_client",
    attendeeInput: "",
    attendees: [] as string[],
    plannedH: "",
    plannedM: "",
    actualH: "",
    actualM: "",
    rawNotes: "",
  });

  if (meetingSnapshot.source !== initialMeetings) {
    setMeetingSnapshot({ source: initialMeetings, meetings: initialMeetings });
  }

  const meetings = meetingSnapshot.meetings;
  const setMeetings = (update: MeetingRow[] | ((currentMeetings: MeetingRow[]) => MeetingRow[])) => {
    setMeetingSnapshot((current) => ({
      source: current.source,
      meetings: typeof update === "function" ? update(current.meetings) : update,
    }));
  };
  const aiActionQueue = meetings.reduce((sum, meeting) => {
    const tasks = Array.isArray(meeting.extracted_tasks) ? meeting.extracted_tasks as ExtractedTask[] : [];
    const meta = (meeting.metadata as Record<string, unknown> | null) ?? {};
    return sum + (meta.tasks_created_at ? 0 : tasks.length);
  }, 0);
  const unsignedPvs = meetings.filter((meeting) => !meeting.pv_signed_at).length;
  const pendingTimeEntries = meetings.filter((meeting) => {
    const meta = (meeting.metadata as Record<string, unknown> | null) ?? {};
    return !meta.time_entry_id && !!(meeting.duration_actual_minutes ?? meeting.duration_planned_minutes);
  }).length;

  function addAttendee() {
    const name = form.attendeeInput.trim();
    if (!name || form.attendees.includes(name)) return;
    setForm((f) => ({ ...f, attendees: [...f.attendees, name], attendeeInput: "" }));
  }

  function removeAttendee(name: string) {
    setForm((f) => ({ ...f, attendees: f.attendees.filter((a) => a !== name) }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Saisissez un titre."); return; }
    setSaving(true);
    const result = await createMeetingAction({
      projectId,
      title: form.title.trim(),
      meetingDate: form.meetingDate,
      meetingType: form.meetingType as "reunion_client" | "revue_conception" | "reunion_chantier" | "reunion_fournisseur" | "kick_off" | "reception",
      attendees: form.attendees,
      durationPlannedMinutes: parseDurationToMinutes(form.plannedH, form.plannedM),
      durationActualMinutes: parseDurationToMinutes(form.actualH, form.actualM),
      rawNotes: form.rawNotes,
    });
    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }

    const newMeeting: MeetingRow = {
      id: result.data.id,
      title: form.title.trim(),
      meeting_date: form.meetingDate,
      meeting_type: form.meetingType,
      attendees: form.attendees,
      duration_planned_minutes: parseDurationToMinutes(form.plannedH, form.plannedM) ?? null,
      duration_actual_minutes: parseDurationToMinutes(form.actualH, form.actualM) ?? null,
      summary: null,
      decisions: [],
      risks: [],
      extracted_tasks: [],
      ai_generated: false,
      pv_signed_at: null,
      pv_signer_name: null,
      metadata: {},
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    setForm({ title: "", meetingDate: today, meetingType: "reunion_client", attendeeInput: "", attendees: [], plannedH: "", plannedM: "", actualH: "", actualM: "", rawNotes: "" });
    toast.success("Réunion enregistrée.");
  }

  async function handleGenerateAi(meetingId: string) {
    if (!aiEnabled) { toast.error("IA disponible sur les plans Studio et Agence."); return; }
    setGeneratingAiFor(meetingId);
    const result = await generateAiForMeetingAction(meetingId);
    setGeneratingAiFor(null);
    if (!result.ok) { toast.error(result.error); return; }
    setMeetings((prev) => prev.map((m) =>
      m.id === meetingId
        ? { ...m, summary: result.data.summary, decisions: result.data.decisions, risks: result.data.risks, extracted_tasks: result.data.tasks, ai_generated: true }
        : m
    ));
    toast.success("Résumé IA généré.");
  }

  async function handleCreateTasks(meeting: MeetingRow) {
    setCreatingTasksFor(meeting.id);
    const result = await createTasksFromMeetingAction(meeting.id);
    setCreatingTasksFor(null);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(`${result.data.created} tâche(s) créée(s).`);
    setMeetings((prev) => prev.map((m) =>
      m.id === meeting.id ? { ...m, metadata: { ...(m.metadata as object), tasks_created_at: new Date().toISOString() } } : m
    ));
  }

  async function handleCreateTimeEntry(meetingId: string) {
    setCreatingTimeEntryFor(meetingId);
    const result = await createTimeEntryFromMeetingAction(meetingId);
    setCreatingTimeEntryFor(null);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Entrée de temps ajoutée.");
    setMeetings((prev) => prev.map((m) =>
      m.id === meetingId ? { ...m, metadata: { ...(m.metadata as object), time_entry_id: result.data.id } } : m
    ));
  }

  async function handleDelete(meetingId: string) {
    setDeletingFor(meetingId);
    const result = await deleteMeetingAction(meetingId);
    setDeletingFor(null);
    if (!result.ok) { toast.error(result.error); return; }
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    toast.success("Réunion supprimée.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <CheckSquare className="h-3.5 w-3.5" />Actions IA
          </p>
          <p className={`mt-1 text-lg font-bold ${aiActionQueue > 0 ? "text-purple-700" : "text-slate-900"}`}>{aiActionQueue}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FileCheck className="h-3.5 w-3.5" />PV à signer
          </p>
          <p className={`mt-1 text-lg font-bold ${unsignedPvs > 0 ? "text-amber-700" : "text-slate-900"}`}>{unsignedPvs}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Timer className="h-3.5 w-3.5" />Temps à créer
          </p>
          <p className={`mt-1 text-lg font-bold ${pendingTimeEntries > 0 ? "text-blue-700" : "text-slate-900"}`}>{pendingTimeEntries}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      {/* Left: form */}
      <div className="space-y-4">
        {/* Carryover alert */}
        {carryoverTasks.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <button
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setShowCarryover((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  {carryoverTasks.length} tâche(s) non clôturée(s) des réunions précédentes
                </span>
              </div>
              {showCarryover ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
            </button>
            {showCarryover && (
              <ul className="mt-3 space-y-1.5">
                {carryoverTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-xs text-amber-800">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${t.priority === "haute" ? "bg-red-400" : t.priority === "moyenne" ? "bg-amber-400" : "bg-slate-300"}`} />
                    <span>{t.title}{t.due_date ? ` — échéance ${formatDate(t.due_date)}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* New meeting form */}
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-slate-500" />
            Nouvelle réunion
          </p>

          {/* Title + Type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Validation APS"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.meetingType} onValueChange={(v) => setForm((f) => ({ ...f, meetingType: v ?? f.meetingType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.meetingDate}
              onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
              required
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Durée</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Prévue</p>
                <div className="flex gap-1.5 items-center">
                  <Input className="w-16 text-center" placeholder="0" value={form.plannedH} onChange={(e) => setForm((f) => ({ ...f, plannedH: e.target.value }))} />
                  <span className="text-xs text-slate-400">h</span>
                  <Input className="w-16 text-center" placeholder="0" value={form.plannedM} onChange={(e) => setForm((f) => ({ ...f, plannedM: e.target.value }))} />
                  <span className="text-xs text-slate-400">min</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Réelle</p>
                <div className="flex gap-1.5 items-center">
                  <Input className="w-16 text-center" placeholder="0" value={form.actualH} onChange={(e) => setForm((f) => ({ ...f, actualH: e.target.value }))} />
                  <span className="text-xs text-slate-400">h</span>
                  <Input className="w-16 text-center" placeholder="0" value={form.actualM} onChange={(e) => setForm((f) => ({ ...f, actualM: e.target.value }))} />
                  <span className="text-xs text-slate-400">min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Participants</Label>
            <div className="flex gap-2">
              <Input
                value={form.attendeeInput}
                onChange={(e) => setForm((f) => ({ ...f, attendeeInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }}
                placeholder="Nom + Entrée"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addAttendee} disabled={!form.attendeeInput.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {form.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.attendees.map((a) => (
                  <span key={a} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {a}
                    <button type="button" onClick={() => removeAttendee(a)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes de réunion</Label>
            <Textarea
              value={form.rawNotes}
              onChange={(e) => setForm((f) => ({ ...f, rawNotes: e.target.value }))}
              rows={5}
              placeholder="Décisions, points discutés, actions, blocages..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={saving} variant="outline">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
            <Button
              type="button"
              disabled={saving || !aiEnabled}
              onClick={async (e) => {
                e.preventDefault();
                if (!form.title.trim()) { toast.error("Saisissez un titre."); return; }
                if ((form.rawNotes ?? "").trim().length < 10) { toast.error("Ajoutez des notes pour la génération IA."); return; }
                setSaving(true);
                const saveResult = await createMeetingAction({
                  projectId,
                  title: form.title.trim(),
                  meetingDate: form.meetingDate,
                  meetingType: form.meetingType as "reunion_client" | "revue_conception" | "reunion_chantier" | "reunion_fournisseur" | "kick_off" | "reception",
                  attendees: form.attendees,
                  durationPlannedMinutes: parseDurationToMinutes(form.plannedH, form.plannedM),
                  durationActualMinutes: parseDurationToMinutes(form.actualH, form.actualM),
                  rawNotes: form.rawNotes,
                });
                setSaving(false);
                if (!saveResult.ok) { toast.error(saveResult.error); return; }
                const newMeeting: MeetingRow = {
                  id: saveResult.data.id,
                  title: form.title.trim(),
                  meeting_date: form.meetingDate,
                  meeting_type: form.meetingType,
                  attendees: form.attendees,
                  duration_planned_minutes: parseDurationToMinutes(form.plannedH, form.plannedM) ?? null,
                  duration_actual_minutes: parseDurationToMinutes(form.actualH, form.actualM) ?? null,
                  summary: null,
                  decisions: [],
                  risks: [],
                  extracted_tasks: [],
                  ai_generated: false,
                  pv_signed_at: null,
                  pv_signer_name: null,
                  metadata: {},
                };
                setMeetings((prev) => [newMeeting, ...prev]);
                setForm({ title: "", meetingDate: today, meetingType: "reunion_client", attendeeInput: "", attendees: [], plannedH: "", plannedM: "", actualH: "", actualM: "", rawNotes: "" });
                await handleGenerateAi(saveResult.data.id);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Enregistrer + IA
            </Button>
          </div>
        </form>
      </div>

      {/* Right: meetings list */}
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <Bot className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">Aucune réunion enregistrée</p>
            <p className="mt-1 text-xs text-slate-400">Les comptes-rendus apparaîtront ici.</p>
          </div>
        ) : (
          meetings.map((meeting) => {
            const decisions = Array.isArray(meeting.decisions) ? meeting.decisions as string[] : [];
            const risks = Array.isArray(meeting.risks) ? meeting.risks as string[] : [];
            const tasks = Array.isArray(meeting.extracted_tasks) ? meeting.extracted_tasks as ExtractedTask[] : [];
            const attendees = Array.isArray(meeting.attendees) ? meeting.attendees as string[] : [];
            const meta = (meeting.metadata as Record<string, unknown> | null) ?? {};
            const tasksCreated = !!meta.tasks_created_at;
            const timeEntryCreated = !!meta.time_entry_id;
            const hasDuration = !!(meeting.duration_actual_minutes ?? meeting.duration_planned_minutes);
            const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type ?? "reunion_client"] ?? meeting.meeting_type;
            const typeColor = MEETING_TYPE_COLORS[meeting.meeting_type ?? "reunion_client"] ?? "bg-slate-50 text-slate-700";
            const isSigningThis = signingFor === meeting.id;

            return (
              <div key={meeting.id} className="rounded-xl border border-slate-200 bg-white">
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{meeting.title}</p>
                      {meeting.ai_generated && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">IA</span>
                      )}
                      {meeting.pv_signed_at && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <FileCheck className="h-3 w-3" />PV signé
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColor}`}>{typeLabel}</span>
                      <span className="text-xs text-slate-400">{formatDate(meeting.meeting_date)}</span>
                      {hasDuration && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatDuration(meeting.duration_actual_minutes ?? meeting.duration_planned_minutes)}
                        </span>
                      )}
                      {attendees.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Users className="h-3 w-3" />{attendees.length} présent{attendees.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {attendees.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {attendees.slice(0, 4).map((a) => (
                          <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{a}</span>
                        ))}
                        {attendees.length > 4 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">+{attendees.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    disabled={deletingFor === meeting.id}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                  >
                    {deletingFor === meeting.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                {/* Content */}
                <div className="px-4 pb-3 space-y-3">
                  {meeting.summary && (
                    <p className="text-sm text-slate-600 leading-relaxed">{meeting.summary}</p>
                  )}

                  {decisions.length > 0 && (
                    <Block icon={<CheckSquare className="h-3.5 w-3.5" />} title="Décisions" items={decisions} color="text-blue-600" />
                  )}
                  {risks.length > 0 && (
                    <Block icon={<TriangleAlert className="h-3.5 w-3.5" />} title="Risques" items={risks} color="text-red-500" />
                  )}

                  {tasks.length > 0 && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions ({tasks.length})</p>
                        {!tasksCreated && (
                          <Button size="sm" variant="outline" onClick={() => handleCreateTasks(meeting)} disabled={creatingTasksFor === meeting.id}>
                            {creatingTasksFor === meeting.id && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                            Créer tâches
                          </Button>
                        )}
                        {tasksCreated && <span className="text-xs text-emerald-600 font-medium">✓ Tâches créées</span>}
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {tasks.map((task, index) => (
                          <li key={`${meeting.id}-task-${index}`} className="text-sm">
                            <p className="font-medium text-slate-800">{task.title}</p>
                            <p className="text-xs text-slate-400">
                              {task.priority}{task.dueDate ? ` · ${task.dueDate}` : ""}{task.assigneeHint ? ` · ${task.assigneeHint}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* PV Signature */}
                  {isSigningThis && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <MeetingPvSignaturePad
                        meetingId={meeting.id}
                        meetingTitle={meeting.title}
                        onSigned={(signerName) => {
                          setSigningFor(null);
                          setMeetings((prev) => prev.map((m) =>
                            m.id === meeting.id
                              ? { ...m, pv_signed_at: new Date().toISOString(), pv_signer_name: signerName }
                              : m
                          ));
                        }}
                        onCancel={() => setSigningFor(null)}
                      />
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div className="border-t border-slate-100 px-4 py-2.5 flex flex-wrap items-center gap-2">
                  {/* PDF download */}
                  <a
                    href={`/api/meeting-notes/${meeting.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-slate-600">
                      <Download className="h-3.5 w-3.5" />
                      Compte-rendu PDF
                    </Button>
                  </a>

                  {/* Time entry */}
                  {!timeEntryCreated && hasDuration && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-slate-600"
                      onClick={() => handleCreateTimeEntry(meeting.id)}
                      disabled={creatingTimeEntryFor === meeting.id}
                    >
                      {creatingTimeEntryFor === meeting.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Timer className="h-3.5 w-3.5" />
                      }
                      Ajouter au temps
                    </Button>
                  )}
                  {timeEntryCreated && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />Temps enregistré
                    </span>
                  )}

                  {/* AI generate */}
                  {!meeting.ai_generated && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-slate-600"
                      onClick={() => handleGenerateAi(meeting.id)}
                      disabled={generatingAiFor === meeting.id || !aiEnabled}
                    >
                      {generatingAiFor === meeting.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Sparkles className="h-3.5 w-3.5" />
                      }
                      Résumé IA
                    </Button>
                  )}

                  {/* PV signature */}
                  {!meeting.pv_signed_at && !isSigningThis && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs text-slate-600"
                      onClick={() => setSigningFor(meeting.id)}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Signer le PV
                    </Button>
                  )}
                  {isSigningThis && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-slate-500" onClick={() => setSigningFor(null)}>
                      <X className="h-3.5 w-3.5" />Annuler
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
}

function Block({ icon, title, items, color }: { icon: React.ReactNode; title: string; items: string[]; color: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
        {icon}
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}
