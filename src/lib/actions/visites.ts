"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

export interface Observation {
  id: string;
  zone: string;
  note: string;
  photoUrl?: string;
  photoPath?: string;
}

export interface CreateVisiteInput {
  projectId: string;
  title: string;
  visitDate: string;
  weather?: string;
  attendees?: string;
  observations: Observation[];
  summary?: string;
  aiGenerated?: boolean;
}

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
  return data?.id ?? null;
}

export async function createVisiteAction(input: CreateVisiteInput): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase
    .from("site_visits")
    .insert({
      workspace_id: workspaceId,
      project_id: input.projectId,
      title: input.title,
      visit_date: input.visitDate,
      weather: input.weather ?? null,
      attendees: input.attendees ?? null,
      observations: input.observations,
      summary: input.summary ?? null,
      ai_generated: input.aiGenerated ?? false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: input.projectId,
    action: "visite.created",
    metadata: { title: input.title, visit_date: input.visitDate },
  });

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function uploadVisitePhotoAction(
  projectId: string,
  formData: FormData
): Promise<Result<{ url: string; path: string }>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const file = formData.get("photo") as File | null;
  if (!file) return { ok: false, error: "Aucune photo." };

  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Photo trop lourde (max 10 Mo)." };

  const path = `${workspaceId}/${projectId}/visites/${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("project-files")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from("project-files").getPublicUrl(path);
  return { ok: true, data: { url: data.publicUrl, path } };
}

export async function deleteVisiteAction(id: string, projectId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  await supabase.from("site_visits").delete().eq("id", id).eq("workspace_id", workspaceId);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}
