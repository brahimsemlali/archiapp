"use server";

import { createClient } from "@/lib/supabase/server";
import { projectSchema, type ProjectFormValues } from "@/lib/validators/project";
import { inputToCentimes } from "@/lib/format";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  return data?.id ?? null;
}

export async function createProjectAction(values: ProjectFormValues): Promise<Result<{ id: string }>> {
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      type: parsed.data.type,
      address: parsed.data.address,
      surface_m2: parsed.data.surfaceM2 ? parseFloat(parsed.data.surfaceM2) : null,
      phase: parsed.data.phase,
      status: parsed.data.status,
      budget_estimate_centimes: parsed.data.budgetEstimate
        ? inputToCentimes(parsed.data.budgetEstimate)
        : null,
      fees_centimes: parsed.data.fees ? inputToCentimes(parsed.data.fees) : null,
      start_date: parsed.data.startDate ?? null,
      target_end_date: parsed.data.targetEndDate ?? null,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: data.id,
    client_id: parsed.data.clientId,
    action: "project.created",
    metadata: { title: parsed.data.title },
  });

  revalidatePath("/projects");
  return { ok: true, data: { id: data.id } };
}

export async function updateProjectAction(id: string, values: ProjectFormValues): Promise<Result<void>> {
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("projects")
    .update({
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      type: parsed.data.type,
      address: parsed.data.address,
      surface_m2: parsed.data.surfaceM2 ? parseFloat(parsed.data.surfaceM2) : null,
      phase: parsed.data.phase,
      status: parsed.data.status,
      budget_estimate_centimes: parsed.data.budgetEstimate
        ? inputToCentimes(parsed.data.budgetEstimate)
        : null,
      fees_centimes: parsed.data.fees ? inputToCentimes(parsed.data.fees) : null,
      start_date: parsed.data.startDate ?? null,
      target_end_date: parsed.data.targetEndDate ?? null,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  return { ok: true, data: undefined };
}

export async function archiveProjectAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/projects");
  return { ok: true, data: undefined };
}
