"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

export async function updateProjectNotesAction(
  projectId: string,
  notes: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) return { ok: false, error: "Espace de travail introuvable." };

  const { error } = await supabase
    .from("projects")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/notes`);
  return { ok: true, data: undefined };
}
