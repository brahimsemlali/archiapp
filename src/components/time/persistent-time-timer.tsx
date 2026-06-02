"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock, Loader2, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTimeEntryAction } from "@/lib/actions/time-entries";
import { cn } from "@/lib/utils";

interface Project { id: string; title: string }
interface Task { id: string; title: string; project_id: string | null }

interface PersistentTimeTimerProps {
  workspaceId?: string | null;
  projects: Project[];
  tasks: Task[];
}

interface RunningTimer {
  startedAt: number;
  startedPath: string;
  projectId: string;
  taskId: string;
  phase: string;
  description: string;
}

const PHASES = ["esquisse", "aps", "apd", "pc", "dce", "chantier", "reception", "autre"] as const;
const PHASE_LABELS: Record<string, string> = {
  esquisse: "Esquisse",
  aps: "APS",
  apd: "APD",
  pc: "PC",
  dce: "DCE",
  chantier: "Chantier",
  reception: "Réception",
  autre: "Autre",
};

function storageKey(workspaceId: string) {
  return `archidesk_running_timer_${workspaceId}`;
}

function loadStoredTimer(workspaceId?: string | null): RunningTimer | null {
  if (!workspaceId || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunningTimer;
    return parsed?.startedAt && Number.isFinite(parsed.startedAt) ? parsed : null;
  } catch {
    window.localStorage.removeItem(storageKey(workspaceId));
    return null;
  }
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function todayFrom(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function routeLabel(pathname: string): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const labels: Record<string, string> = {
    dashboard: "Tableau de bord",
    projects: "Projets",
    clients: "Clients",
    devis: "Devis",
    factures: "Factures",
    tasks: "Tâches",
    rapports: "Rapports",
    boq: "BOQ",
    subcontractors: "Sous-traitants",
    fournisseurs: "Fournisseurs",
  };

  return firstSegment ? labels[firstSegment] ?? firstSegment : "ArchiDesk";
}

export function PersistentTimeTimer({ workspaceId, projects, tasks }: PersistentTimeTimerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftProject, setDraftProject] = useState("");
  const [draftTask, setDraftTask] = useState("");
  const [draftPhase, setDraftPhase] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const activeKey = workspaceId ? storageKey(workspaceId) : null;
  const runningTask = runningTimer?.taskId ? tasks.find((task) => task.id === runningTimer.taskId) : null;
  const runningProject = runningTimer?.projectId ? projects.find((project) => project.id === runningTimer.projectId) : null;
  const selectableTasks = useMemo(
    () => draftProject ? tasks.filter((task) => task.project_id === draftProject) : [],
    [draftProject, tasks]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedTimer = loadStoredTimer(workspaceId);
      setRunningTimer(storedTimer);
      setElapsed(storedTimer ? Math.max(0, Math.floor((Date.now() - storedTimer.startedAt) / 1000)) : 0);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [workspaceId]);

  useEffect(() => {
    if (!runningTimer) return;

    const interval = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - runningTimer.startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [runningTimer]);

  const persistTimer = useCallback((timer: RunningTimer | null) => {
    if (!activeKey || typeof window === "undefined") return;

    if (timer) window.localStorage.setItem(activeKey, JSON.stringify(timer));
    else window.localStorage.removeItem(activeKey);
  }, [activeKey]);

  const startTimer = useCallback(() => {
    if (!activeKey) return;

    const timer: RunningTimer = {
      startedAt: Date.now(),
      startedPath: pathname,
      projectId: draftProject,
      taskId: draftTask,
      phase: draftPhase,
      description: draftDescription.trim(),
    };

    setRunningTimer(timer);
    setElapsed(0);
    persistTimer(timer);
    setOpen(false);
    toast.success("Chronomètre démarré.");
  }, [activeKey, draftDescription, draftPhase, draftProject, draftTask, pathname, persistTimer]);

  const stopTimer = useCallback(async () => {
    if (!runningTimer || saving) return;

    const minutes = Math.max(1, Math.round((Date.now() - runningTimer.startedAt) / 60000));
    if (minutes > 12 * 60) {
      const shouldSave = window.confirm("Ce chronomètre dépasse 12 heures. Voulez-vous vraiment enregistrer cette durée ?");
      if (!shouldSave) return;
    }

    setSaving(true);
    const result = await createTimeEntryAction({
      projectId: runningTimer.projectId || undefined,
      taskId: runningTimer.taskId || undefined,
      phase: runningTimer.phase || undefined,
      description: runningTimer.description || `Travail ${routeLabel(runningTimer.startedPath)}`,
      durationMinutes: minutes,
      date: todayFrom(runningTimer.startedAt),
      billable: true,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setRunningTimer(null);
    setElapsed(0);
    persistTimer(null);
    router.refresh();
    toast.success("Temps enregistré.");
  }, [persistTimer, router, runningTimer, saving]);

  const discardTimer = useCallback(() => {
    if (!runningTimer) return;
    const shouldDiscard = window.confirm("Supprimer le chronomètre en cours sans enregistrer le temps ?");
    if (!shouldDiscard) return;

    setRunningTimer(null);
    setElapsed(0);
    persistTimer(null);
    toast.success("Chronomètre supprimé.");
  }, [persistTimer, runningTimer]);

  return (
    <div className="relative shrink-0">
      {runningTimer ? (
        <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/90 p-1 shadow-[0_10px_24px_rgba(232,163,23,0.15)]">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex min-h-8 items-center gap-2 rounded-full px-2 text-left text-[11px] font-semibold text-[#5F4706] transition-colors hover:bg-white/75"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="hidden max-w-[150px] truncate lg:inline">
              {runningProject?.title ?? runningTask?.title ?? routeLabel(runningTimer.startedPath)}
            </span>
            <span className="font-mono tabular-nums">{formatTimer(elapsed)}</span>
          </button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full bg-[#0B1220] px-3 text-xs text-white hover:bg-[#2A2B22]"
            onClick={stopTimer}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            <span className="hidden sm:ml-1.5 sm:inline">Stop</span>
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          className="h-10 rounded-full border-[#E5E7EB] bg-white/75 px-3 text-[11px] font-bold text-[#475569] shadow-[0_8px_22px_rgba(22,23,14,0.045)] hover:bg-white"
        >
          <Clock className="h-3.5 w-3.5 text-[#E8A317]" />
          <span className="hidden md:ml-1.5 md:inline">Timer</span>
        </Button>
      )}

      {open && (
        <div className="fixed inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_60px_rgba(22,23,14,0.16)] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[360px]">
          {runningTimer ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#ADAB9D]">Chronomètre actif</p>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#0B1220]">{formatTimer(elapsed)}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {runningProject?.title ?? "Aucun projet"}{runningTimer.phase ? ` · ${PHASE_LABELS[runningTimer.phase] ?? runningTimer.phase}` : ""}
                </p>
                {runningTimer.description && (
                  <p className="mt-2 truncate rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs text-[#475569]">{runningTimer.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="flex-1 gap-2" onClick={stopTimer} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  Enregistrer
                </Button>
                <Button type="button" variant="outline" className="gap-2 text-red-600" onClick={discardTimer} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#ADAB9D]">Nouveau suivi</p>
                <p className="mt-1 text-sm font-semibold text-[#0B1220]">Démarrer un chronomètre</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  placeholder={`Travail ${routeLabel(pathname)}`}
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Projet</Label>
                  <Select
                    value={draftProject || "none"}
                    onValueChange={(value) => {
                      setDraftProject((value ?? "none") === "none" ? "" : value ?? "");
                      setDraftTask("");
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tâche</Label>
                  <Select
                    value={draftTask || "none"}
                    onValueChange={(value) => setDraftTask((value ?? "none") === "none" ? "" : value ?? "")}
                    disabled={!draftProject}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {selectableTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phase</Label>
                <Select value={draftPhase || "none"} onValueChange={(value) => setDraftPhase((value ?? "none") === "none" ? "" : value ?? "")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Aucune phase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune phase</SelectItem>
                    {PHASES.map((phase) => <SelectItem key={phase} value={phase}>{PHASE_LABELS[phase] ?? phase}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="w-full gap-2" onClick={startTimer} disabled={!workspaceId}>
                <Play className="h-4 w-4" />
                Démarrer
              </Button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        aria-label="Fermer le chronomètre"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={cn("fixed inset-0 z-40 cursor-default", open ? "block" : "hidden")}
      />
    </div>
  );
}
