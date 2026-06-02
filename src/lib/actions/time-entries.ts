"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface TimeEntryInput {
  projectId?: string;
  taskId?: string;
  phase?: string;
  description?: string;
  durationMinutes: number;
  date: string;
  billable?: boolean;
  rateCentimes?: number;
}

function validateTimeInput(input: Partial<TimeEntryInput>): Result<void> {
  if (input.durationMinutes !== undefined) {
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1) {
      return { ok: false, error: "Durée invalide." };
    }
    if (input.durationMinutes > 24 * 60) {
      return { ok: false, error: "Durée trop longue. Fractionnez cette entrée en plusieurs journées." };
    }
  }

  if (input.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Date invalide." };
  }

  if (input.rateCentimes !== undefined && input.rateCentimes !== null && input.rateCentimes < 0) {
    return { ok: false, error: "Taux horaire invalide." };
  }

  return { ok: true, data: undefined };
}

async function resolveTimeContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  input: Pick<TimeEntryInput, "projectId" | "taskId">
): Promise<Result<{ projectId?: string; taskId?: string }>> {
  let projectId = input.projectId || undefined;
  const taskId = input.taskId || undefined;

  if (taskId) {
    const { data: task, error } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) return { ok: false, error: dbError(error) };
    if (!task) return { ok: false, error: "Tâche introuvable." };
    if (projectId && task.project_id !== projectId) {
      return { ok: false, error: "La tâche sélectionnée n'appartient pas à ce projet." };
    }
    projectId = projectId ?? task.project_id ?? undefined;
  }

  if (projectId) {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) return { ok: false, error: dbError(error) };
    if (!project) return { ok: false, error: "Projet introuvable." };
  }

  return { ok: true, data: { projectId, taskId } };
}

export async function createTimeEntryAction(input: TimeEntryInput): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  const valid = validateTimeInput(input);
  if (!valid.ok) return valid;
  const timeContext = await resolveTimeContext(supabase, workspaceId, input);
  if (!timeContext.ok) return timeContext;

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      project_id: timeContext.data.projectId ?? null,
      task_id: timeContext.data.taskId ?? null,
      phase: input.phase ?? null,
      description: input.description ?? null,
      duration_minutes: input.durationMinutes,
      date: input.date,
      billable: input.billable ?? true,
      rate_centimes: input.rateCentimes ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/time");
  revalidatePath("/rapports");
  if (timeContext.data.projectId) revalidatePath(`/projects/${timeContext.data.projectId}`);
  return { ok: true, data };
}

export async function updateTimeEntryAction(id: string, input: Partial<TimeEntryInput>): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const valid = validateTimeInput(input);
  if (!valid.ok) return valid;
  const timeContext = await resolveTimeContext(supabase, workspaceId, input);
  if (!timeContext.ok) return timeContext;

  const { error } = await supabase
    .from("time_entries")
    .update({
      ...(input.projectId !== undefined || input.taskId !== undefined ? { project_id: timeContext.data.projectId ?? null } : {}),
      ...(input.taskId !== undefined && { task_id: timeContext.data.taskId ?? null }),
      ...(input.phase !== undefined && { phase: input.phase }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.durationMinutes !== undefined && { duration_minutes: input.durationMinutes }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.billable !== undefined && { billable: input.billable }),
      ...(input.rateCentimes !== undefined && { rate_centimes: input.rateCentimes }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/time");
  revalidatePath("/rapports");
  if (timeContext.data.projectId) revalidatePath(`/projects/${timeContext.data.projectId}`);
  return { ok: true, data: undefined };
}

export async function deleteTimeEntryAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase.from("time_entries").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/time");
  return { ok: true, data: undefined };
}
