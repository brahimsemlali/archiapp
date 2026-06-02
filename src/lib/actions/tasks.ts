"use server";

import { createClient } from "@/lib/supabase/server";
import { assertProjectMatchesClient, assertWorkspaceRecords, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { taskFormSchema, taskUpdateSchema, type TaskFormValues } from "@/lib/validators/tasks";
import { notifyWorkspace } from "@/lib/push";
import { dbError } from "@/lib/db-error";

type TaskActionRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  project_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  metadata: unknown;
  projects: { title: string } | null;
  clients: { name: string } | null;
};

const TASK_SELECT = `
  id,
  title,
  description,
  due_date,
  priority,
  status,
  project_id,
  client_id,
  assigned_to,
  metadata,
  projects!tasks_project_id_fkey(title),
  clients!tasks_client_id_fkey(name)
`;

function revalidateTaskSurfaces(...relations: Array<{ project_id?: string | null; client_id?: string | null } | null | undefined>) {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/workload");
  revalidatePath("/rapports");

  const projectIds = new Set<string>();
  const clientIds = new Set<string>();
  for (const relation of relations) {
    if (relation?.project_id) projectIds.add(relation.project_id);
    if (relation?.client_id) clientIds.add(relation.client_id);
  }

  for (const projectId of projectIds) revalidatePath(`/projects/${projectId}`);
  for (const clientId of clientIds) revalidatePath(`/clients/${clientId}`);
}

function normalizeTaskRow(row: unknown): TaskActionRow {
  const task = row as TaskActionRow & {
    projects?: { title: string } | { title: string }[] | null;
    clients?: { name: string } | { name: string }[] | null;
  };

  return {
    ...task,
    projects: Array.isArray(task.projects) ? task.projects[0] ?? null : task.projects ?? null,
    clients: Array.isArray(task.clients) ? task.clients[0] ?? null : task.clients ?? null,
  };
}

export async function createTaskAction(values: TaskFormValues): Promise<Result<TaskActionRow>> {
  const parsed = taskFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "projects", id: parsed.data.projectId, label: "Projet" },
    { table: "clients", id: parsed.data.clientId, label: "Client" },
    { table: "workspace_members", id: parsed.data.assignedTo, label: "Assigné" },
  ]);
  if (!relationCheck.ok) return relationCheck;
  const projectClientCheck = await assertProjectMatchesClient(supabase, workspaceId, parsed.data.projectId, parsed.data.clientId);
  if (!projectClientCheck.ok) return projectClientCheck;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      project_id: parsed.data.projectId ?? null,
      client_id: parsed.data.clientId ?? null,
      assigned_to: parsed.data.assignedTo ?? null,
      due_date: parsed.data.dueDate ?? null,
      priority: parsed.data.priority,
      status: parsed.data.status,
    })
    .select(TASK_SELECT)
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId ?? null,
    client_id: parsed.data.clientId ?? null,
    action: "task.created",
    metadata: { title: parsed.data.title, priority: parsed.data.priority },
  });

  // Notify the assigned user (if different from creator)
  if (parsed.data.assignedTo) {
    await notifyWorkspace(supabase, workspaceId, {
      title: "Nouvelle tâche assignée",
      body: parsed.data.title,
      href: "/tasks",
    }, { userId: parsed.data.assignedTo });
  }

  const normalizedTask = normalizeTaskRow(data);
  revalidateTaskSurfaces(normalizedTask);
  return { ok: true, data: normalizedTask };
}

export async function updateTaskAction(id: string, values: Partial<TaskFormValues>): Promise<Result<TaskActionRow>> {
  const parsed = taskUpdateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const has = (key: keyof TaskFormValues) => Object.prototype.hasOwnProperty.call(values, key);

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "projects", id: parsed.data.projectId, label: "Projet" },
    { table: "clients", id: parsed.data.clientId, label: "Client" },
    { table: "workspace_members", id: parsed.data.assignedTo, label: "Assigné" },
  ]);
  if (!relationCheck.ok) return relationCheck;

  const { data: previousTask, error: previousError } = await supabase
    .from("tasks")
    .select("project_id, client_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (previousError) return { ok: false, error: dbError(previousError) };
  if (!previousTask) return { ok: false, error: "Tâche introuvable." };

  const projectClientCheck = await assertProjectMatchesClient(
    supabase,
    workspaceId,
    has("projectId") ? parsed.data.projectId : previousTask.project_id ?? undefined,
    has("clientId") ? parsed.data.clientId : previousTask.client_id ?? undefined
  );
  if (!projectClientCheck.ok) return projectClientCheck;

  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      ...(has("title") && { title: parsed.data.title }),
      ...(has("description") && { description: parsed.data.description ?? null }),
      ...(has("projectId") && { project_id: parsed.data.projectId ?? null }),
      ...(has("clientId") && { client_id: parsed.data.clientId ?? null }),
      ...(has("assignedTo") && { assigned_to: parsed.data.assignedTo ?? null }),
      ...(has("dueDate") && { due_date: parsed.data.dueDate ?? null }),
      ...(has("priority") && { priority: parsed.data.priority }),
      ...(has("status") && { status: parsed.data.status }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(TASK_SELECT)
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!task) return { ok: false, error: "Tâche introuvable." };
  const normalizedTask = normalizeTaskRow(task);
  revalidateTaskSurfaces(previousTask, normalizedTask);
  return { ok: true, data: normalizedTask };
}

export async function deleteTaskAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: task, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, project_id, client_id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!task) return { ok: false, error: "Tâche introuvable." };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "task.deleted",
    metadata: { task_id: id },
  });

  revalidateTaskSurfaces(task);
  return { ok: true, data: undefined };
}

export async function toggleTaskStatusAction(id: string, currentStatus: string): Promise<Result<void>> {
  const next = currentStatus === "termine" ? "a_faire" : currentStatus === "a_faire" ? "en_cours" : "termine";
  const result = await updateTaskAction(id, { status: next as TaskFormValues["status"] });
  if (!result.ok) return result;
  return { ok: true, data: undefined };
}

export async function updateTaskMetadataAction(
  id: string,
  metadata: Record<string, unknown>
): Promise<Result<TaskActionRow>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(TASK_SELECT)
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!task) return { ok: false, error: "Tâche introuvable." };
  const normalizedTask = normalizeTaskRow(task);
  revalidateTaskSurfaces(normalizedTask);
  return { ok: true, data: normalizedTask };
}
