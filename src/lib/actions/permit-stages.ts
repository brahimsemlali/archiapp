"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecord, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export type PcStage =
  | "constitution_dossier"
  | "depot_commune"
  | "en_instruction"
  | "permis_obtenu"
  | "validite_expiree";

export interface PermitStageRow {
  id: string;
  project_id: string;
  stage: string;
  status: string;
  deadline: string | null;
  docs: { label: string; done: boolean }[];
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function upsertPermitStageAction(
  projectId: string,
  stage: string,
  input: {
    status: string;
    deadline?: string;
    docs?: { label: string; done: boolean }[];
    notes?: string;
    completedAt?: string | null;
  }
): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectCheck = await assertWorkspaceRecord(supabase, "projects", projectId, workspaceId, "Projet");
  if (!projectCheck.ok) return projectCheck;

  const { data: existing } = await supabase
    .from("permit_stages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .eq("stage", stage)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("permit_stages")
      .update({
        status: input.status,
        deadline: input.deadline ?? null,
        docs: input.docs ?? [],
        notes: input.notes ?? null,
        completed_at: input.completedAt ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("workspace_id", workspaceId);
    if (error) return { ok: false, error: dbError(error) };
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: { id: existing.id } };
  }

  const { data, error } = await supabase
    .from("permit_stages")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      stage,
      status: input.status,
      deadline: input.deadline ?? null,
      docs: input.docs ?? [],
      notes: input.notes ?? null,
      completed_at: input.completedAt ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function deletePermitStageAction(id: string, projectId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectCheck = await assertWorkspaceRecord(supabase, "projects", projectId, workspaceId, "Projet");
  if (!projectCheck.ok) return projectCheck;

  const { error } = await supabase
    .from("permit_stages")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}
