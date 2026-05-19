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

export async function createTimeEntryAction(input: TimeEntryInput): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  if (input.projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", input.projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (!project) return { ok: false, error: "Projet introuvable." };
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      project_id: input.projectId ?? null,
      task_id: input.taskId ?? null,
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
  return { ok: true, data };
}

export async function updateTimeEntryAction(id: string, input: Partial<TimeEntryInput>): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  if (input.projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", input.projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (!project) return { ok: false, error: "Projet introuvable." };
  }

  const { error } = await supabase
    .from("time_entries")
    .update({
      ...(input.projectId !== undefined && { project_id: input.projectId ?? null }),
      ...(input.taskId !== undefined && { task_id: input.taskId ?? null }),
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
