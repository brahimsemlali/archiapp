"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { requireWorkspaceRole } from "@/lib/workspace";
import { dbError } from "@/lib/db-error";

export async function updateProjectNotesAction(
  projectId: string,
  notes: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase
    .from("projects")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!data) return { ok: false, error: "Projet introuvable." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/notes`);
  return { ok: true, data: undefined };
}
