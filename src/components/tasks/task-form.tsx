"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import type { TaskFormValues } from "@/lib/validators/tasks";
import type { Task } from "./task-detail-panel";

interface Project { id: string; title: string; client_id?: string | null }
interface Client { id: string; name: string }
interface Member { userId: string; role: string; email?: string }

interface TaskFormProps {
  projects: Project[];
  clients: Client[];
  members?: Member[];
  currentUserId?: string;
  defaultProjectId?: string;
  defaultDueDate?: string;
  task?: { id: string } & TaskFormValues;
  onSuccess?: (task?: Task) => void;
  onCancel?: () => void;
}

export function TaskForm({ projects, clients, members = [], currentUserId, defaultProjectId, defaultDueDate, task, onSuccess, onCancel }: TaskFormProps) {
  const defaultProject = useMemo(
    () => projects.find((project) => project.id === (task?.projectId ?? defaultProjectId)),
    [defaultProjectId, projects, task?.projectId]
  );
  const t = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(task?.projectId ?? defaultProjectId ?? "" as string);
  const [clientId, setClientId] = useState(task?.clientId ?? defaultProject?.client_id ?? "" as string);
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? "" as string);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate ?? "");
  const [priority, setPriority] = useState<TaskFormValues["priority"]>(task?.priority ?? "moyenne");
  const [status, setStatus] = useState<TaskFormValues["status"]>(task?.status ?? "a_faire");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Le titre est requis."); return; }

    setSaving(true);
    const values: TaskFormValues = {
      title: title.trim(),
      description: description.trim() || undefined,
      projectId: projectId || undefined,
      clientId: clientId || undefined,
      assignedTo: assignedTo || undefined,
      dueDate: dueDate || undefined,
      priority,
      status,
    };

    const result = task
      ? await updateTaskAction(task.id, values)
      : await createTaskAction(values);

    setSaving(false);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(task ? "Tâche mise à jour." : "Tâche créée.");
    onSuccess?.(result.data as Task);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Titre *</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Préparer les plans APD..."
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Description</Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails ou contexte…"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priorité</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskFormValues["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="haute">
                <span className="h-2 w-2 rounded-full bg-[#C75B2E]" />
                Haute
              </SelectItem>
              <SelectItem value="moyenne">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Moyenne
              </SelectItem>
              <SelectItem value="basse">
                <span className="h-2 w-2 rounded-full bg-[#2F8F5C]" />
                Basse
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskFormValues["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="termine">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-due">Échéance</Label>
        <Input
          id="task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {members.length > 1 && (
        <div className="space-y-1.5">
          <Label>Assigné à</Label>
          <Select value={assignedTo || "none"} onValueChange={(v) => setAssignedTo(v === "none" ? "" : (v ?? ""))}>
            <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non assigné</SelectItem>
              {currentUserId && (
                <SelectItem value={currentUserId}>Moi</SelectItem>
              )}
              {members.filter((m) => m.userId !== currentUserId).map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.email ?? m.userId.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Projet (optionnel)</Label>
        <Select
          value={projectId || "none"}
          onValueChange={(v) => {
            const nextProjectId = v === "none" ? "" : (v ?? "");
            setProjectId(nextProjectId);
            const linkedProject = projects.find((project) => project.id === nextProjectId);
            if (linkedProject?.client_id) setClientId(linkedProject.client_id);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Aucun projet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun projet</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Client (optionnel)</Label>
        <Select
          value={clientId || "none"}
          onValueChange={(v) => {
            const nextClientId = v === "none" ? "" : (v ?? "");
            setClientId(nextClientId);
            const selectedProject = projects.find((project) => project.id === projectId);
            if (selectedProject?.client_id && selectedProject.client_id !== nextClientId) {
              setProjectId("");
            }
          }}
        >
          <SelectTrigger><SelectValue placeholder="Aucun client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {task ? t("save") : t("create")}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>
        )}
      </div>
    </form>
  );
}
