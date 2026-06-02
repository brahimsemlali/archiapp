"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Plus, CalendarDays, LayoutGrid, List, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { updateTaskAction } from "@/lib/actions/tasks";
import { TaskForm } from "./task-form";
import { TaskDetailPanel } from "./task-detail-panel";
import { TaskListView } from "./task-list-view";
import { PRIORITY_LABELS } from "@/lib/validators/tasks";
import type { Task, TaskMeta } from "./task-detail-panel";

export type { Task };

interface Project { id: string; title: string; client_id?: string | null }
interface Client { id: string; name: string }
interface Member { userId: string; role: string }

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  members?: Member[];
  currentUserId?: string;
  defaultProjectId?: string;
}

type ViewMode = "kanban" | "list";

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

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function isOverdue(d: string | null | undefined, status: string) {
  if (!d || status === "termine") return false;
  return new Date(d + "T00:00:00") < new Date(new Date().toDateString());
}

function getInitials(id: string) { return id.slice(0, 2).toUpperCase(); }

const KANBAN_COLS = [
  { key: "a_faire",  label: "À faire",  dot: "#ADAB9D" },
  { key: "en_cours", label: "En cours", dot: "#2563EB" },
  { key: "termine",  label: "Terminé",  dot: "#2F8F5C" },
] as const;

type StatusKey = "a_faire" | "en_cours" | "termine";

// ── Draggable card ────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  currentUserId,
  onView,
  isDragging = false,
}: {
  task: Task;
  currentUserId: string;
  onView: (t: Task) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const meta = (task.metadata ?? {}) as TaskMeta;
  const checklist = meta.checklist ?? [];
  const doneCount = checklist.filter((i) => i.done).length;
  const totalCount = checklist.length;

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onView(task)}
      className={cn(
        "w-full text-left bg-white border border-[#E5E7EB] rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-150 select-none",
        isDragging ? "opacity-40 shadow-none" : "hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full border",
          PRIORITY_TAG[task.priority] ?? "bg-slate-50 text-slate-600 border-slate-100"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority])} />
          {PRIORITY_LABELS[task.priority] ?? task.priority}
        </span>
        {meta.estimated_minutes && (
          <span className="text-[11px] text-[#64748B] tabnum">
            {meta.estimated_minutes < 60
              ? `${meta.estimated_minutes}m`
              : `${Math.floor(meta.estimated_minutes / 60)}h${meta.estimated_minutes % 60 ? ` ${meta.estimated_minutes % 60}m` : ""}`}
          </span>
        )}
      </div>

      <p className={cn(
        "text-[13.5px] font-medium leading-snug",
        task.status === "termine" ? "line-through text-[#ADAB9D]" : "text-[#0B1220]"
      )}>
        {task.title}
      </p>

      {task.projects?.title && (
        <p className="text-[11.5px] text-[#64748B] mt-1">{task.projects.title}</p>
      )}

      {/* Checklist progress */}
      {totalCount > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2F8F5C] rounded-full"
              style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
            />
          </div>
          <span className="text-[10.5px] text-[#64748B] tabnum">{doneCount}/{totalCount}</span>
        </div>
      )}

      {task.due_date && (
        <div className="flex items-center gap-1 mt-2">
          <CalendarDays className={cn("h-3 w-3", isOverdue(task.due_date, task.status) ? "text-[#C75B2E]" : "text-[#64748B]")} />
          <span className={cn("text-[11px] tabnum", isOverdue(task.due_date, task.status) ? "text-[#C75B2E]" : "text-[#64748B]")}>
            {formatDate(task.due_date)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-1.5">
          {task.assigned_to && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#CBD5E1] to-[#B5B0A0] border-2 border-white flex items-center justify-center">
              <span className="text-[9px] font-semibold text-[#0B1220]">
                {task.assigned_to === currentUserId ? "Moi" : getInitials(task.assigned_to)}
              </span>
            </div>
          )}
        </div>
        {task.status === "termine" && <CheckCircle2 className="h-3.5 w-3.5 text-[#2F8F5C]" />}
      </div>
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────

function KanbanColumn({
  columnKey,
  label,
  dot,
  tasks,
  currentUserId,
  draggingId,
  onView,
  onAdd,
}: {
  columnKey: StatusKey;
  label: string;
  dot: string;
  tasks: Task[];
  currentUserId: string;
  draggingId: string | null;
  onView: (t: Task) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div className="min-w-[260px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
          <span className="text-[13px] font-semibold text-[#0B1220]">{label}</span>
          <span className="text-[11.5px] font-medium text-[#64748B] tabnum">{tasks.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1220] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2.5 p-3 border rounded-xl min-h-[200px] transition-colors duration-150",
          isOver ? "bg-blue-50 border-blue-200" : "bg-[#F7F8FA] border-[#E5E7EB]"
        )}
      >
        {tasks.length === 0 && !isOver ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="text-xs text-[#ADAB9D]">Aucune tâche</p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onView={onView}
              isDragging={draggingId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TaskList({
  tasks: initialTasks,
  projects,
  clients,
  members = [],
  currentUserId = "",
  defaultProjectId,
}: TaskListProps) {
  const router = useRouter();
  const [taskSnapshot, setTaskSnapshot] = useState({
    source: initialTasks,
    tasks: initialTasks,
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tasks-view") as ViewMode) ?? "kanban";
    }
    return "kanban";
  });
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (taskSnapshot.source !== initialTasks) {
    setTaskSnapshot({ source: initialTasks, tasks: initialTasks });
  }

  const tasks = taskSnapshot.tasks;
  const setTasks = (update: Task[] | ((currentTasks: Task[]) => Task[])) => {
    setTaskSnapshot((current) => ({
      source: current.source,
      tasks: typeof update === "function" ? update(current.tasks) : update,
    }));
  };

  useEffect(() => {
    localStorage.setItem("tasks-view", viewMode);
  }, [viewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped: Record<StatusKey, Task[]> = {
    a_faire:  tasks.filter((t) => t.status === "a_faire"),
    en_cours: tasks.filter((t) => t.status === "en_cours"),
    termine:  tasks.filter((t) => t.status === "termine"),
  };

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null;

  function handleStatusChange(id: string, status: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    if (viewingTask?.id === id) setViewingTask((v) => v ? { ...v, status } : v);
  }

  function handleMetadataChange(id: string, meta: TaskMeta) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, metadata: meta } : t));
    if (viewingTask?.id === id) setViewingTask((v) => v ? { ...v, metadata: meta } : v);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as StatusKey;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    handleStatusChange(taskId, newStatus);
    const result = await updateTaskAction(taskId, { status: newStatus });
    if (!result.ok) {
      toast.error(result.error);
      handleStatusChange(taskId, task.status); // rollback
    }
  }

  function handleFormSuccess(savedTask?: Task) {
    if (savedTask) {
      setTasks((prev) => {
        const exists = prev.some((task) => task.id === savedTask.id);
        if (exists) return prev.map((task) => task.id === savedTask.id ? savedTask : task);
        return [savedTask, ...prev];
      });
    }
    setShowForm(false);
    setEditingTask(null);
    router.refresh();
  }

  // Sync viewingTask with latest task state
  const viewingTaskLive = viewingTask
    ? (tasks.find((t) => t.id === viewingTask.id) ?? viewingTask)
    : null;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white/72 p-3 shadow-[0_10px_28px_rgba(22,23,14,0.045)] sm:flex-row sm:items-center sm:justify-between sm:bg-transparent sm:p-0 sm:shadow-none sm:border-0">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748B]">
          <span><strong className="text-[#0B1220]">{tasks.filter((t) => t.status !== "termine").length}</strong> actives</span>
          <span>·</span>
          <span><strong className="text-[#0B1220]">{tasks.filter((t) => t.status === "termine").length}</strong> terminées</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* View switcher */}
          <div className="grid grid-cols-2 bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg p-0.5 sm:flex sm:items-center">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors",
                viewMode === "kanban"
                  ? "bg-white text-[#0B1220] shadow-sm"
                  : "text-[#64748B] hover:text-[#0B1220]"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex min-h-9 items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors",
                viewMode === "list"
                  ? "bg-white text-[#0B1220] shadow-sm"
                  : "text-[#64748B] hover:text-[#0B1220]"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </button>
          </div>

          <Button
            size="sm"
            className="min-h-10 gap-2 bg-[#0B1220] hover:bg-[#2C2D24] text-[#F7F8FA] border-0 sm:min-h-8"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Kanban view */}
      {viewMode === "kanban" && (
        <DndContext id="tasks-kanban" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {KANBAN_COLS.map(({ key, label, dot }) => (
              <KanbanColumn
                key={key}
                columnKey={key}
                label={label}
                dot={dot}
                tasks={grouped[key]}
                currentUserId={currentUserId}
                draggingId={draggingId}
                onView={setViewingTask}
                onAdd={() => setShowForm(true)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
            {draggingTask && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-xl rotate-1 opacity-95 w-[260px]">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full border mb-2.5",
                  PRIORITY_TAG[draggingTask.priority] ?? "bg-slate-50 text-slate-600 border-slate-100"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[draggingTask.priority])} />
                  {PRIORITY_LABELS[draggingTask.priority] ?? draggingTask.priority}
                </span>
                <p className="text-[13.5px] font-medium text-[#0B1220] leading-snug">{draggingTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <TaskListView
          tasks={tasks}
          currentUserId={currentUserId}
          onView={setViewingTask}
          onAdd={() => setShowForm(true)}
          onStatusChange={handleStatusChange}
        />
      )}

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-[#64748B]" />
          </div>
          <p className="text-sm font-medium text-[#0B1220]">Aucune tâche pour le moment</p>
          <p className="text-xs text-[#64748B] mt-1 mb-4">Créez votre première tâche pour commencer.</p>
          <Button
            size="sm"
            className="gap-2 bg-[#0B1220] hover:bg-[#2C2D24] text-[#F7F8FA] border-0"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>
      )}

      {/* Task detail panel */}
      <TaskDetailPanel
        task={viewingTaskLive}
        allTasks={tasks}
        currentUserId={currentUserId}
        onClose={() => setViewingTask(null)}
        onEdit={(t) => { setEditingTask(t); setViewingTask(null); }}
        onDeleted={(id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
          setViewingTask(null);
        }}
        onStatusChange={handleStatusChange}
        onMetadataChange={handleMetadataChange}
      />

      {/* New task form */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-[min(100vw,34rem)] p-4 sm:p-5">
          <SheetHeader><SheetTitle>Nouvelle tâche</SheetTitle></SheetHeader>
          <div className="mt-6">
            <TaskForm
              projects={projects}
              clients={clients}
              members={members}
              currentUserId={currentUserId}
              defaultProjectId={defaultProjectId}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit task form */}
      <Sheet open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <SheetContent className="w-[min(100vw,34rem)] p-4 sm:p-5">
          <SheetHeader><SheetTitle>Modifier la tâche</SheetTitle></SheetHeader>
          {editingTask && (
            <div className="mt-6">
              <TaskForm
                projects={projects}
                clients={clients}
                members={members}
                currentUserId={currentUserId}
                task={{
                  id: editingTask.id,
                  title: editingTask.title,
                  description: editingTask.description ?? undefined,
                  projectId: editingTask.project_id ?? undefined,
                  clientId: editingTask.client_id ?? undefined,
                  assignedTo: editingTask.assigned_to ?? undefined,
                  dueDate: editingTask.due_date ?? undefined,
                  priority: editingTask.priority as "haute" | "moyenne" | "basse",
                  status: editingTask.status as "a_faire" | "en_cours" | "termine",
                }}
                onSuccess={handleFormSuccess}
                onCancel={() => setEditingTask(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
