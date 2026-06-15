"use client";

import { useState } from "react";
import { useLocalization } from "@/components/localization-provider";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Clock,
  FolderOpen,
  Plus,
  Check,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { updateTaskAction } from "@/lib/actions/tasks";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/validators/tasks";
import type { Task, TaskMeta } from "./task-detail-panel";

const STATUS_ORDER = ["a_faire", "en_cours", "termine"] as const;

const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  a_faire:  { dot: "#ADAB9D", label: "À faire",  bg: "bg-[#F1F5F9]",  text: "text-[#64748B]" },
  en_cours: { dot: "#2563EB", label: "En cours", bg: "bg-blue-50",     text: "text-blue-700"  },
  termine:  { dot: "#2F8F5C", label: "Terminé",  bg: "bg-[#E5F3EB]",  text: "text-[#2F8F5C]" },
};

const PRIORITY_DOT: Record<string, string> = {
  haute:   "bg-[#C75B2E]",
  moyenne: "bg-amber-400",
  basse:   "bg-[#2F8F5C]",
};

const PRIORITY_TAG: Record<string, string> = {
  haute:   "bg-[#FCEFE6] text-[#C75B2E]",
  moyenne: "bg-amber-50 text-amber-700",
  basse:   "bg-[#E5F3EB] text-[#2F8F5C]",
};

type SortKey = "title" | "priority" | "due_date" | "status" | "estimated";

const PRIORITY_RANK: Record<string, number> = { haute: 0, moyenne: 1, basse: 2 };

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

function getInitials(id: string) {
  return id.slice(0, 2).toUpperCase();
}

interface TaskRowProps {
  task: Task;
  currentUserId: string;
  onView: (t: Task) => void;
  onStatusChange: (id: string, status: string) => void;
}

function TaskRow({ task, currentUserId, onView, onStatusChange }: TaskRowProps) {
  const { formatDayMonth } = useLocalization();
  const [cycling, setCycling] = useState(false);
  const meta = (task.metadata ?? {}) as TaskMeta;
  const checklist = meta.checklist ?? [];
  const doneCount = checklist.filter((i) => i.done).length;
  const totalCount = checklist.length;
  const hasBlockedBy = (meta.blocked_by?.length ?? 0) > 0;

  async function cycleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    if (cycling) return;
    setCycling(true);
    const next =
      task.status === "a_faire" ? "en_cours" :
      task.status === "en_cours" ? "termine" : "a_faire";
    onStatusChange(task.id, next);
    const result = await updateTaskAction(task.id, { status: next as "a_faire" | "en_cours" | "termine" });
    setCycling(false);
    if (!result.ok) {
      toast.error(result.error);
      onStatusChange(task.id, task.status); // rollback
    }
  }

  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG["a_faire"]!;

  return (
    <div
      onClick={() => onView(task)}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F7F8FA] cursor-pointer group border-b border-[#F1F5F9] last:border-0 transition-colors"
    >
      {/* Status toggle */}
      <button
        onClick={cycleStatus}
        title={`Passer à : ${STATUS_LABELS[task.status === "a_faire" ? "en_cours" : task.status === "en_cours" ? "termine" : "a_faire"] ?? ""}`}
        className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
        style={{
          borderColor: cfg.dot,
          background: task.status === "termine" ? cfg.dot : "transparent",
        }}
      >
        {task.status === "termine" && <Check className="h-2.5 w-2.5 text-white" />}
      </button>

      {/* Title area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[13.5px] font-medium truncate",
            task.status === "termine" ? "line-through text-[#ADAB9D]" : "text-[#0B1220]"
          )}>
            {task.title}
          </span>
          {hasBlockedBy && (
            <span title="Dépendances en attente">
              <Link2 className="h-3 w-3 text-amber-500 shrink-0" />
            </span>
          )}
        </div>
        {/* Sub-info row */}
        <div className="flex items-center gap-3 mt-0.5">
          {task.projects?.title && (
            <span className="text-[11.5px] text-[#64748B] flex items-center gap-1 truncate max-w-[160px]">
              <FolderOpen className="h-3 w-3 shrink-0" />
              {task.projects.title}
            </span>
          )}
          {totalCount > 0 && (
            <span className="text-[11.5px] text-[#64748B] flex items-center gap-1 shrink-0">
              <Check className="h-3 w-3" />
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Priority */}
      <span className={cn(
        "shrink-0 hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full",
        PRIORITY_TAG[task.priority] ?? "bg-slate-50 text-slate-500"
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority])} />
        {PRIORITY_LABELS[task.priority] ?? task.priority}
      </span>

      {/* Due date */}
      <span className={cn(
        "shrink-0 hidden md:flex items-center gap-1 text-[12px] tabnum w-20 justify-end",
        task.due_date
          ? isOverdue(task.due_date, task.status)
            ? "text-[#C75B2E] font-medium"
            : "text-[#64748B]"
          : "text-[#ADAB9D]"
      )}>
        {task.due_date ? (
          <>
            <CalendarDays className="h-3 w-3 shrink-0" />
            {formatDayMonth(task.due_date)}
          </>
        ) : "—"}
      </span>

      {/* Time estimate */}
      <span className="shrink-0 hidden lg:flex items-center gap-1 text-[12px] text-[#64748B] tabnum w-16 justify-end">
        {meta.estimated_minutes ? (
          <>
            <Clock className="h-3 w-3 shrink-0" />
            {formatMinutes(meta.estimated_minutes)}
          </>
        ) : "—"}
      </span>

      {/* Assignee */}
      <div className="shrink-0 w-6">
        {task.assigned_to && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#CBD5E1] to-[#B5B0A0] flex items-center justify-center">
            <span className="text-[9px] font-semibold text-[#0B1220]">
              {task.assigned_to === currentUserId ? "Moi" : getInitials(task.assigned_to)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskGroupProps {
  status: string;
  tasks: Task[];
  currentUserId: string;
  onView: (t: Task) => void;
  onAdd: () => void;
  onStatusChange: (id: string, status: string) => void;
  defaultOpen?: boolean;
}

function TaskGroup({ status, tasks, currentUserId, onView, onAdd, onStatusChange, defaultOpen = true }: TaskGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["a_faire"]!;

  return (
    <div className="mb-1">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 sticky top-0 bg-white z-[1] border-b border-[#F1F5F9]">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-70 transition-opacity"
        >
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
            : <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />}
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
          <span className="text-[13px] font-semibold text-[#0B1220]">{cfg.label}</span>
          <span className="text-[11.5px] text-[#64748B] tabnum">{tasks.length}</span>
        </button>
        <button
          onClick={onAdd}
          className="p-1 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1220] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && tasks.length > 0 && (
        <div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onView={onView}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}

      {open && tasks.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-[12px] text-[#ADAB9D]">Aucune tâche</p>
        </div>
      )}
    </div>
  );
}

interface ListViewProps {
  tasks: Task[];
  currentUserId: string;
  onView: (t: Task) => void;
  onAdd: () => void;
  onStatusChange: (id: string, status: string) => void;
}

export function TaskListView({ tasks, currentUserId, onView, onAdd, onStatusChange }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  function sortedTasks(list: Task[]): Task[] {
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "priority") cmp = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      else if (sortKey === "due_date") {
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) cmp = 1;
        else if (!b.due_date) cmp = -1;
        else cmp = a.due_date.localeCompare(b.due_date);
      } else if (sortKey === "estimated") {
        const ae = (a.metadata as TaskMeta | null)?.estimated_minutes ?? 0;
        const be = (b.metadata as TaskMeta | null)?.estimated_minutes ?? 0;
        cmp = ae - be;
      }
      return sortAsc ? cmp : -cmp;
    });
  }

  const renderSortBtn = (col: SortKey, label: string, className?: string) => {
    const active = sortKey === col;
    return (
      <button
        onClick={() => handleSort(col)}
        className={cn(
          "text-[11.5px] font-semibold uppercase tracking-wider flex items-center gap-0.5 transition-colors",
          active ? "text-[#0B1220]" : "text-[#ADAB9D] hover:text-[#64748B]",
          className
        )}
      >
        {label}
        {active && <ChevronDown className={cn("h-3 w-3 transition-transform", !sortAsc && "rotate-180")} />}
      </button>
    );
  };

  const grouped = STATUS_ORDER.map((s) => ({
    status: s,
    tasks: sortedTasks(tasks.filter((t) => t.status === s)),
  }));

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#F7F8FA] border-b border-[#E5E7EB]">
        <div className="w-4 shrink-0" />
        {renderSortBtn("title", "Tâche", "flex-1")}
        {renderSortBtn("priority", "Priorité", "hidden sm:flex w-24 justify-end")}
        {renderSortBtn("due_date", "Échéance", "hidden md:flex w-20 justify-end")}
        {renderSortBtn("estimated", "Estimé", "hidden lg:flex w-16 justify-end")}
        <div className="w-6 shrink-0" />
      </div>

      {/* Groups */}
      {grouped.map(({ status, tasks: groupTasks }) => (
        <TaskGroup
          key={status}
          status={status}
          tasks={groupTasks}
          currentUserId={currentUserId}
          onView={onView}
          onAdd={onAdd}
          onStatusChange={onStatusChange}
          defaultOpen={status !== "termine"}
        />
      ))}

      {tasks.length === 0 && (
        <div className="py-12 text-center text-[13px] text-[#ADAB9D]">Aucune tâche</div>
      )}
    </div>
  );
}
