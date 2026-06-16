"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { assertStorageAvailable } from "@/lib/billing/guards";
import { buildSafeStorageFilename, validateImageUpload, type UploadFileMeta } from "@/lib/storage/upload-validation";
import { dbError } from "@/lib/db-error";

export interface Observation {
  id: string;
  zone: string;
  note: string;
  photoUrl?: string;
  photoPath?: string;
  createIssue?: boolean;
  issuePriority?: "low" | "medium" | "high";
  issueTitle?: string;
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


export async function createVisiteAction(input: CreateVisiteInput): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  const observations = input.observations.map((obs) => ({
    ...obs,
    photoUrl: undefined,
  }));

  const { data, error } = await supabase
    .from("site_visits")
    .insert({
      workspace_id: workspaceId,
      project_id: input.projectId,
      title: input.title,
      visit_date: input.visitDate,
      weather: input.weather ?? null,
      attendees: input.attendees ?? null,
      observations,
      summary: input.summary ?? null,
      ai_generated: input.aiGenerated ?? false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  const issueObservations = observations.filter((obs) => obs.createIssue && obs.note.trim());
  if (issueObservations.length > 0) {
    const { error: issueError } = await supabase.from("site_issues").insert(
      issueObservations.map((obs) => ({
        workspace_id: workspaceId,
        project_id: input.projectId,
        site_visit_id: data.id,
        created_by: user.id,
        title: obs.issueTitle?.trim() || `${obs.zone} — ${obs.note.trim().slice(0, 80)}`,
        description: obs.note.trim(),
        zone: obs.zone,
        status: "open",
        priority: obs.issuePriority ?? "medium",
        photo_url: null,
        photo_path: obs.photoPath ?? null,
        metadata: { source: "site_visit_observation", observation_id: obs.id },
      }))
    );
    if (issueError) return { ok: false, error: issueError.message };
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: input.projectId,
    action: "visite.created",
    metadata: { title: input.title, visit_date: input.visitDate, issues_created: issueObservations.length },
  });

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, data: { id: data.id } };
}

/**
 * Signed-URL ticket for a direct-to-storage site-visit photo upload — the
 * browser PUTs the bytes to Storage, bypassing the Vercel ~4.5 MB server-action
 * body cap (phone photos routinely exceed it). The client then mints its own
 * 1 h preview URL via the browser Supabase client.
 */
export async function createVisitePhotoUploadUrlAction(
  projectId: string,
  meta: UploadFileMeta
): Promise<Result<{ bucket: string; path: string; token: string; contentType: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  const fileValidation = validateImageUpload(meta, 10 * 1024 * 1024);
  if (!fileValidation.ok) return fileValidation;
  const storageCheck = await assertStorageAvailable(supabase, workspaceId, meta.size);
  if (!storageCheck.ok) return storageCheck;

  const safeName = buildSafeStorageFilename(meta.name, fileValidation.data.extension);
  const path = `${workspaceId}/${projectId}/visites/${Date.now()}_${safeName}`;

  const { data: signed, error } = await supabase.storage
    .from("project-files")
    .createSignedUploadUrl(path);
  if (error || !signed) return { ok: false, error: error?.message ?? "Impossible de préparer l'envoi." };

  return { ok: true, data: { bucket: "project-files", path: signed.path, token: signed.token, contentType: fileValidation.data.contentType } };
}

export async function deleteVisiteAction(id: string, projectId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: visite } = await supabase
    .from("site_visits")
    .select("project_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();
  if (!visite || visite.project_id !== projectId) return { ok: false, error: "Visite introuvable." };

  const { error } = await supabase.from("site_visits").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}
