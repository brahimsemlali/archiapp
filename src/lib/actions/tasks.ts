"use server";

import { createClient } from "@/lib/supabase/server";
import { assertProjectMatchesClient, assertWorkspaceRecords, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { taskFormSchema, taskUpdateSchema, type TaskFormValues } from "@/lib/validators/tasks";


export async function createTaskAction(values: TaskFormValues): Promise<Result<{ id: string }>> {
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
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId ?? null,
    client_id: parsed.data.clientId ?? null,
    action: "task.created",
    metadata: { title: parsed.data.title, priority: parsed.data.priority },
  });

  revalidatePath("/tasks");
  return { ok: true, data };
}

export async function updateTaskAction(id: string, values: Partial<TaskFormValues>): Promise<Result<void>> {
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
  const projectClientCheck = await assertProjectMatchesClient(supabase, workspaceId, parsed.data.projectId, parsed.data.clientId);
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
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!task) return { ok: false, error: "Tâche introuvable." };
  revalidatePath("/tasks");
  return { ok: true, data: undefined };
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
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!task) return { ok: false, error: "Tâche introuvable." };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "task.deleted",
    metadata: { task_id: id },
  });

  revalidatePath("/tasks");
  return { ok: true, data: undefined };
}

export async function toggleTaskStatusAction(id: string, currentStatus: string): Promise<Result<void>> {
  const next = currentStatus === "termine" ? "a_faire" : currentStatus === "a_faire" ? "en_cours" : "termine";
  return updateTaskAction(id, { status: next as TaskFormValues["status"] });
}

export async function updateTaskMetadataAction(
  id: string,
  metadata: Record<string, unknown>
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!task) return { ok: false, error: "Tâche introuvable." };
  return { ok: true, data: undefined };
}
