"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecord, requireActiveWorkspace, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import crypto from "crypto";
import { assertStorageAvailable } from "@/lib/billing/guards";
import { buildSafeStorageFilename, sanitizeStorageSegment, validateDocumentUpload } from "@/lib/storage/upload-validation";
import { dbError } from "@/lib/db-error";

const STORAGE_BUCKET = "project-files";
const APPROVAL_STATUSES = ["not_required", "pending", "approved", "rejected"] as const;
type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export async function uploadFileAction(
  projectId: string,
  folder: string,
  formData: FormData
): Promise<Result<{ id: string; filename: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectCheck = await assertWorkspaceRecord(supabase, "projects", projectId, workspaceId, "Projet");
  if (!projectCheck.ok) return projectCheck;

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "Aucun fichier fourni." };

  const fileValidation = validateDocumentUpload(file, 100 * 1024 * 1024);
  if (!fileValidation.ok) return fileValidation;
  const storageCheck = await assertStorageAvailable(supabase, workspaceId, file.size);
  if (!storageCheck.ok) return storageCheck;

  // Check for existing file with same name in same folder → versioning
  const { data: existing } = await supabase
    .from("files")
    .select("id, version")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .eq("folder", folder)
    .eq("filename", file.name)
    .is("parent_file_id", null)
    .order("version", { ascending: false })
    .limit(1);

  const latestExisting = existing?.[0];
  const newVersion = latestExisting ? latestExisting.version + 1 : 1;

  const safeFolder = sanitizeStorageSegment(folder, "Documents");
  const safeName = buildSafeStorageFilename(file.name, fileValidation.data.extension);
  const storagePath = `${workspaceId}/${projectId}/${safeFolder}/${Date.now()}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: fileValidation.data.contentType,
      upsert: false,
    });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: fileRow, error: dbError } = await supabase
    .from("files")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      folder,
      filename: file.name,
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: fileValidation.data.contentType,
      version: newVersion,
      parent_file_id: latestExisting?.id ?? null,
    })
    .select("id")
    .single();

  if (dbError) return { ok: false, error: dbError.message };

  await Promise.all([
    supabase.from("activity_log").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      action: "file.uploaded",
      metadata: { filename: file.name, folder, version: newVersion },
    }),
    supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("workspace_id", workspaceId),
  ]);

  revalidatePath(`/projects/${projectId}/files`);
  return { ok: true, data: { id: fileRow.id, filename: file.name } };
}

export async function getFileDownloadUrl(fileId: string): Promise<Result<string>> {
  const supabase = await createClient();
  const workspace = await requireActiveWorkspace(supabase);
  if (!workspace.ok) return { ok: false, error: workspace.error };
  const { workspaceId } = workspace.data;

  const { data: file } = await supabase
    .from("files")
    .select("storage_path, filename")
    .eq("id", fileId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!file) return { ok: false, error: "Fichier introuvable." };

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, 3600);

  if (!data?.signedUrl) return { ok: false, error: "Impossible de générer le lien." };

  return { ok: true, data: data.signedUrl };
}

export async function createShareLinkAction(
  fileId: string,
  expiryDays: number | null
): Promise<Result<string>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: file } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!file) return { ok: false, error: "Fichier introuvable." };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = expiryDays
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("share_links").insert({
    workspace_id: workspaceId,
    resource_type: "file",
    resource_id: fileId,
    token,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: dbError(error) };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true, data: `${appUrl}/share/${token}` };
}

export async function deleteFileAction(fileId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: file } = await supabase
    .from("files")
    .select("storage_path, project_id")
    .eq("id", fileId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!file) return { ok: false, error: "Fichier introuvable." };

  await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path]);

  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/projects/${file.project_id}/files`);
  return { ok: true, data: undefined };
}

export async function updateFileApprovalStatusAction(
  fileId: string,
  status: ApprovalStatus,
  note?: string
): Promise<Result<void>> {
  if (!APPROVAL_STATUSES.includes(status)) return { ok: false, error: "Statut invalide." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  const { data: file } = await supabase
    .from("files")
    .select("project_id, filename")
    .eq("id", fileId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!file) return { ok: false, error: "Fichier introuvable." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("files")
    .update({
      approval_status: status,
      approval_requested_at: status === "pending" ? now : null,
      approved_at: status === "approved" || status === "rejected" ? now : null,
      approved_by: status === "approved" || status === "rejected" ? user.id : null,
      approval_note: note?.trim() || null,
      updated_at: now,
    })
    .eq("id", fileId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: file.project_id,
    action: "file.approval_status_changed",
    metadata: { filename: file.filename, status },
  });

  revalidatePath(`/projects/${file.project_id}`);
  revalidatePath(`/projects/${file.project_id}/files`);
  return { ok: true, data: undefined };
}
