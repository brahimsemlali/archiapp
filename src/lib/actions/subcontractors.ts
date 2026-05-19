"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface SubcontractorInput {
  name: string;
  trade?: string;
  phone?: string;
  email?: string;
  address?: string;
  cnss?: string;
  rib?: string;
  rating?: number;
  notes?: string;
}

export async function createSubcontractorAction(input: SubcontractorInput): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  if (!input.name.trim()) return { ok: false, error: "Nom requis." };

  const { data, error } = await supabase
    .from("subcontractors")
    .insert({ workspace_id: workspaceId, ...input })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/subcontractors");
  return { ok: true, data };
}

export async function updateSubcontractorAction(id: string, input: Partial<SubcontractorInput>): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("subcontractors")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/subcontractors");
  return { ok: true, data: undefined };
}

export async function deleteSubcontractorAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("subcontractors")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/subcontractors");
  return { ok: true, data: undefined };
}
