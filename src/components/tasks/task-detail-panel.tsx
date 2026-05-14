"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  CalendarDays,
  FolderOpen,
  User,
  Pencil,
  Trash2,
  X,
  Clock,
  Plus,
  Check,
  Link2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { updateTaskAction, deleteTaskAction, updateTaskMetadataAction } from "@/lib/actions/tasks";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/validators/tasks";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskMeta {
  checklist?: ChecklistItem[];
  estimated_minutes?: number;
  blocked_by?: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: string;
  status: string;
  project_id?: string | null;
  client_id?: string | null;
  assigned_to?: string | null;
  metadata?: TaskMeta | null;
  projects?: { title: string } | null;
  clients?: { name: string } | null;
}

const PRIORITY_TAG: Record<string, string> = {
  haute:   "bg-[#FCEFE6] text-[#C75B2E] border-transparent",
  moyenne: "bg-amber-50 text-amber-700 border-transparent",
  basse:   "bg-[#E5F3EB] text-[#2F8F5C] border-transparent",
};

const PRIORITY_DOT: Record<string, string> = {
  haute:   "bg-[#C75B2E]",
  moyenne: "bg-amber-400",
  basse:   "bg-[#2F8F5C]",
};

const STATUS_CYCLE: Record<string, string> = {
  a_faire:  "en_cours",
  en_cours: "termine",
  termine:  "a_faire",
};

const STATUS_STYLE: Record<string, string> = {
  a_faire:  "bg-[#F2F2EE] text-[#82806F] border-[#E8E6DF]",
  en_cours: "bg-blue-50 text-blue-700 border-blue-200",
  termine:  "bg-[#E5F3EB] text-[#2F8F5C] border-transparent",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function isOverdue(d: string | null | undefined, status: string) {
  if (!d || status === "termine") return false;
  return new Date(d + "T00:00:00") < new Date(new Date().toDateString());
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseEstimateInput(input: string): number | null {
  const s = input.trim().toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  const bare = !h && !m ? s.match(/^(\d+)$/) : null;
  if (bare) return parseInt(bare[1]!, 10);
  if (!h && !m) return null;
  return (h ? parseInt(h[1]!, 10) * 60 : 0) + (m ? parseInt(m[1]!, 10) : 0);
}

interface TaskDetailPanelProps {
  task: Task | null;
  allTasks?: Task[];
  currentUserId?: string;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDeleted: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onMetadataChange: (id: string, meta: TaskMeta) => void;
}

export function TaskDetailPanel({
  task: initialTask,
  allTasks = [],
  onClose,
  onEdit,
  onDeleted,
  onStatusChange,
  onMetadataChange,
}: TaskDetailPanelProps) {
  const t = useTranslations("common");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Checklist state
  const [newItemText, setNewItemText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const newItemRef = useRef<HTMLInputElement>(null);

  // Estimate edit state
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");
  const estimateRef = useRef<HTMLInputElement>(null);

  // Dependency picker
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [depSearch, setDepSearch] = useState("");

  useEffect(() => {
    if (addingItem && newItemRef.current) newItemRef.current.focus();
  }, [addingItem]);

  useEffect(() => {
    if (editingEstimate && estimateRef.current) {
      estimateRef.current.focus();
      estimateRef.current.select();
    }
  }, [editingEstimate]);

  if (!initialTask) return null;

  const meta: TaskMeta = {
    checklist: [],
    estimated_minutes: undefined,
    blocked_by: [],
    ...(initialTask.metadata ?? {}),
  };

  const checklist = meta.checklist ?? [];
  const doneCount = checklist.filter((i) => i.done).length;
  const totalCount = checklist.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  async function saveMeta(patch: Partial<TaskMeta>) {
    const next = { ...meta, ...patch };
    setSavingMeta(true);
    onMetadataChange(initialTask!.id, next);
    const result = await updateTaskMetadataAction(initialTask!.id, next as Record<string, unknown>);
    setSavingMeta(false);
    if (!result.ok) toast.error(result.error);
  }

  async function handleCycleStatus() {
    setTogglingStatus(true);
    const next = STATUS_CYCLE[initialTask!.status] ?? "a_faire";
    const result = await updateTaskAction(initialTask!.id, { status: next as "a_faire" | "en_cours" | "termine" });
    setTogglingStatus(false);
    if (!result.ok) { toast.error(result.error); return; }
    onStatusChange(initialTask!.id, next);
  }

  async function handleDelete() {
    setDeletingId(initialTask!.id);
    const result = await deleteTaskAction(initialTask!.id);
    setDeletingId(null);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success("Tâche supprimée.");
    onDeleted(initialTask!.id);
  }

  function toggleChecklistItem(itemId: string) {
    const updated = checklist.map((i) => i.id === itemId ? { ...i, done: !i.done } : i);
    void saveMeta({ checklist: updated });
  }

  function deleteChecklistItem(itemId: string) {
    const updated = checklist.filter((i) => i.id !== itemId);
    void saveMeta({ checklist: updated });
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
    };
    void saveMeta({ checklist: [...checklist, newItem] });
    setNewItemText("");
  }

  function handleSaveEstimate() {
    const mins = parseEstimateInput(estimateInput);
    if (estimateInput.trim() === "" || estimateInput.trim() === "0") {
      void saveMeta({ estimated_minutes: undefined });
    } else if (mins !== null && mins > 0) {
      void saveMeta({ estimated_minutes: mins });
    }
    setEditingEstimate(false);
  }

  function toggleDependency(taskId: string) {
    const current = meta.blocked_by ?? [];
    const next = current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId];
    void saveMeta({ blocked_by: next });
    setDepSearch("");
    setShowDepPicker(false);
  }

  const blockedByTasks = (meta.blocked_by ?? [])
    .map((id) => allTasks.find((t) => t.id === id))
    .filter(Boolean) as Task[];

  const depCandidates = allTasks.filter(
    (t) =>
      t.id !== initialTask.id &&
      !(meta.blocked_by ?? []).includes(t.id) &&
      t.title.toLowerCase().includes(depSearch.toLowerCase())
  );

  return (
    <Sheet open={!!initialTask} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6DF] px-5 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-[#82806F] hover:text-[#16170E] transition-colors"
          >
            <X className="h-4 w-4" />
            Fermer
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(initialTask)}
              className="p-1.5 rounded-lg hover:bg-[#F2F2EE] text-[#82806F] hover:text-[#16170E] transition-colors"
              title={t("edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={!!deletingId}
              className="p-1.5 rounded-lg hover:bg-[#FCEFE6] text-[#82806F] hover:text-[#C75B2E] transition-colors"
              title={t("delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Title */}
          <SheetHeader className="p-0">
            <SheetTitle className="text-[18px] font-semibold text-[#16170E] leading-snug tracking-tight text-left">
              {initialTask.title}
            </SheetTitle>
          </SheetHeader>

          {/* Status cycle button */}
          <button
            onClick={handleCycleStatus}
            disabled={togglingStatus}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors",
              initialTask.status === "termine"
                ? "bg-[#E5F3EB] text-[#2F8F5C] hover:bg-[#d0ecdc]"
                : "bg-[#16170E] text-[#F7F7F4] hover:bg-[#2C2D24]"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {initialTask.status === "termine"
              ? "Réouvrir la tâche"
              : initialTask.status === "a_faire"
              ? "Démarrer → En cours"
              : "Marquer comme terminé"}
          </button>

          {/* Attributes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ADAB9D] mb-3">Attributs</p>
            <div className="space-y-2.5">
              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <Circle className="h-3.5 w-3.5 text-[#ADAB9D]" />
                  <span className="text-[13px] text-[#82806F]">Statut</span>
                </div>
                <span className={cn(
                  "text-[11.5px] font-medium px-2.5 py-1 rounded-full border",
                  STATUS_STYLE[initialTask.status] ?? "bg-[#F2F2EE] text-[#82806F] border-[#E8E6DF]"
                )}>
                  {STATUS_LABELS[initialTask.status] ?? initialTask.status}
                </span>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[initialTask.priority])} />
                  <span className="text-[13px] text-[#82806F]">Priorité</span>
                </div>
                <span className={cn(
                  "text-[11.5px] font-medium px-2.5 py-1 rounded-full border",
                  PRIORITY_TAG[initialTask.priority] ?? "bg-slate-50 text-slate-600"
                )}>
                  {PRIORITY_LABELS[initialTask.priority] ?? initialTask.priority}
                </span>
              </div>

              {/* Due date */}
              {initialTask.due_date && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <CalendarDays className="h-3.5 w-3.5 text-[#ADAB9D]" />
                    <span className="text-[13px] text-[#82806F]">Échéance</span>
                  </div>
                  <span className={cn(
                    "text-[13px] font-medium tabnum",
                    isOverdue(initialTask.due_date, initialTask.status) ? "text-[#C75B2E]" : "text-[#16170E]"
                  )}>
                    {formatDate(initialTask.due_date)}
                    {isOverdue(initialTask.due_date, initialTask.status) && (
                      <span className="text-[11px] ml-1.5 font-normal">· En retard</span>
                    )}
                  </span>
                </div>
              )}

              {/* Time estimate */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <Clock className="h-3.5 w-3.5 text-[#ADAB9D]" />
                  <span className="text-[13px] text-[#82806F]">Estimé</span>
                </div>
                {editingEstimate ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSaveEstimate(); }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      ref={estimateRef}
                      value={estimateInput}
                      onChange={(e) => setEstimateInput(e.target.value)}
                      onBlur={handleSaveEstimate}
                      placeholder="ex: 2h 30m"
                      className="text-[13px] border border-[#E8E6DF] rounded-lg px-2.5 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <button type="submit" className="p-1 rounded-md hover:bg-[#E5F3EB] text-[#2F8F5C]">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setEstimateInput(meta.estimated_minutes ? formatMinutes(meta.estimated_minutes) : "");
                      setEditingEstimate(true);
                    }}
                    className={cn(
                      "text-[13px] rounded-lg px-2.5 py-1 border transition-colors",
                      meta.estimated_minutes
                        ? "text-[#16170E] border-[#E8E6DF] hover:border-blue-300"
                        : "text-[#ADAB9D] border-dashed border-[#ADAB9D] hover:border-blue-400 hover:text-blue-500"
                    )}
                  >
                    {meta.estimated_minutes ? formatMinutes(meta.estimated_minutes) : "+ Ajouter"}
                  </button>
                )}
              </div>

              {/* Project */}
              {initialTask.projects?.title && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <FolderOpen className="h-3.5 w-3.5 text-[#ADAB9D]" />
                    <span className="text-[13px] text-[#82806F]">Projet</span>
                  </div>
                  <span className="text-[13px] text-[#16170E]">{initialTask.projects.title}</span>
                </div>
              )}

              {/* Client */}
              {initialTask.clients?.name && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <User className="h-3.5 w-3.5 text-[#ADAB9D]" />
                    <span className="text-[13px] text-[#82806F]">Client</span>
                  </div>
                  <span className="text-[13px] text-[#16170E]">{initialTask.clients.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {initialTask.description && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ADAB9D] mb-2">Description</p>
              <p className="text-[13.5px] text-[#3A3A30] leading-relaxed whitespace-pre-wrap">
                {initialTask.description}
              </p>
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ADAB9D]">
                Checklist
                {totalCount > 0 && (
                  <span className="ml-2 normal-case text-[#82806F]">{doneCount}/{totalCount}</span>
                )}
              </p>
              {savingMeta && (
                <span className="text-[11px] text-[#ADAB9D]">Enregistrement…</span>
              )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#E8E6DF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2F8F5C] rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#82806F] tabnum w-7 text-right">{progressPct}%</span>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 group py-1 px-1 rounded-lg hover:bg-[#F7F7F4]">
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className="shrink-0 w-4 h-4 rounded border border-[#ADAB9D] flex items-center justify-center hover:border-[#2F8F5C] transition-colors"
                    style={item.done ? { background: "#2F8F5C", borderColor: "#2F8F5C" } : {}}
                  >
                    {item.done && <Check className="h-2.5 w-2.5 text-white" />}
                  </button>
                  <span className={cn(
                    "flex-1 text-[13px] leading-relaxed",
                    item.done ? "line-through text-[#ADAB9D]" : "text-[#3A3A30]"
                  )}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-[#C75B2E] text-[#ADAB9D] transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add item */}
            {addingItem ? (
              <form onSubmit={handleAddItem} className="flex items-center gap-2 mt-2">
                <div className="shrink-0 w-4 h-4 rounded border border-[#E8E6DF]" />
                <input
                  ref={newItemRef}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onBlur={() => { if (!newItemText.trim()) setAddingItem(false); }}
                  onKeyDown={(e) => { if (e.key === "Escape") { setAddingItem(false); setNewItemText(""); } }}
                  placeholder="Nouvel élément…"
                  className="flex-1 text-[13px] border-0 border-b border-[#E8E6DF] focus:outline-none focus:border-blue-400 bg-transparent pb-0.5"
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  className="p-0.5 rounded hover:text-[#2F8F5C] text-[#ADAB9D] disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingItem(true)}
                className="flex items-center gap-2 mt-2 text-[13px] text-[#82806F] hover:text-[#16170E] transition-colors group"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un élément
              </button>
            )}
          </div>

          {/* Dependencies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ADAB9D]">
                Bloqué par
              </p>
            </div>

            {blockedByTasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {blockedByTasks.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2 py-1 px-2 bg-[#F7F7F4] rounded-lg group">
                    <Link2 className="h-3 w-3 text-[#82806F] shrink-0" />
                    <span className={cn(
                      "flex-1 text-[12.5px]",
                      dep.status === "termine" ? "line-through text-[#ADAB9D]" : "text-[#3A3A30]"
                    )}>
                      {dep.title}
                    </span>
                    <span className={cn(
                      "text-[10.5px] px-1.5 py-0.5 rounded-full",
                      dep.status === "termine" ? "bg-[#E5F3EB] text-[#2F8F5C]" :
                      dep.status === "en_cours" ? "bg-blue-50 text-blue-600" :
                      "bg-[#F2F2EE] text-[#82806F]"
                    )}>
                      {STATUS_LABELS[dep.status] ?? dep.status}
                    </span>
                    <button
                      onClick={() => toggleDependency(dep.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#ADAB9D] hover:text-[#C75B2E] transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add dependency picker */}
            <div className="relative">
              <button
                onClick={() => setShowDepPicker((v) => !v)}
                className="flex items-center gap-2 text-[13px] text-[#82806F] hover:text-[#16170E] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une dépendance
                <ChevronDown className={cn("h-3 w-3 transition-transform", showDepPicker && "rotate-180")} />
              </button>

              {showDepPicker && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-[#E8E6DF] rounded-xl shadow-lg z-20 overflow-hidden">
                  <div className="p-2 border-b border-[#E8E6DF]">
                    <input
                      autoFocus
                      value={depSearch}
                      onChange={(e) => setDepSearch(e.target.value)}
                      placeholder="Rechercher une tâche…"
                      className="w-full text-[13px] px-2 py-1.5 rounded-lg bg-[#F7F7F4] focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {depCandidates.length === 0 ? (
                      <p className="text-[12px] text-[#ADAB9D] text-center py-4">Aucune tâche trouvée</p>
                    ) : (
                      depCandidates.slice(0, 20).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => toggleDependency(t.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F7F7F4] text-left transition-colors"
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            t.status === "termine" ? "bg-[#2F8F5C]" :
                            t.status === "en_cours" ? "bg-blue-500" : "bg-[#ADAB9D]"
                          )} />
                          <span className="flex-1 text-[13px] text-[#16170E] truncate">{t.title}</span>
                          {t.projects?.title && (
                            <span className="text-[11px] text-[#ADAB9D] shrink-0">{t.projects.title}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
