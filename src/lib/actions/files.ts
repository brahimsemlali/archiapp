"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecord, requireActiveWorkspace, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import crypto from "crypto";
import { assertStorageAvailable } from "@/lib/billing/guards";
import { buildSafeStorageFilename, sanitizeStorageSegment, validateDocumentUpload, type UploadFileMeta } from "@/lib/storage/upload-validation";
import { dbError } from "@/lib/db-error";

const STORAGE_BUCKET = "project-files";
const APPROVAL_STATUSES = ["not_required", "pending", "approved", "rejected"] as const;
type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export interface FileUploadTicket {
  bucket: string;
  storagePath: string;
  token: string;
  contentType: string;
  version: number;
  parentFileId: string | null;
}

/**
 * Step 1 of a direct-to-storage upload. Validates metadata + plan storage,
 * computes the version chain, and returns a signed upload URL so the browser
 * can PUT the bytes straight to Storage — bypassing the Vercel ~4.5 MB
 * server-action body cap that silently broke large plan/render/photo uploads.
 */
export async function createFileUploadUrlAction(
  projectId: string,
  folder: string,
  meta: UploadFileMeta
): Promise<Result<FileUploadTicket>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectCheck = await assertWorkspaceRecord(supabase, "projects", projectId, workspaceId, "Projet");
  if (!projectCheck.ok) return projectCheck;

  const fileValidation = validateDocumentUpload(meta, MAX_UPLOAD_BYTES);
  if (!fileValidation.ok) return fileValidation;
  const storageCheck = await assertStorageAvailable(supabase, workspaceId, meta.size);
  if (!storageCheck.ok) return storageCheck;

  // Existing file with same name in same folder → next version
  const { data: existing } = await supabase
    .from("files")
    .select("id, version")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .eq("folder", folder)
    .eq("filename", meta.name)
    .is("parent_file_id", null)
    .order("version", { ascending: false })
    .limit(1);

  const latestExisting = existing?.[0];
  const newVersion = latestExisting ? latestExisting.version + 1 : 1;

  const safeFolder = sanitizeStorageSegment(folder, "Documents");
  const safeName = buildSafeStorageFilename(meta.name, fileValidation.data.extension);
  const storagePath = `${workspaceId}/${projectId}/${safeFolder}/${Date.now()}_${safeName}`;

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) return { ok: false, error: signError?.message ?? "Impossible de préparer l'envoi." };

  return {
    ok: true,
    data: {
      bucket: STORAGE_BUCKET,
      storagePath: signed.path,
      token: signed.token,
      contentType: fileValidation.data.contentType,
      version: newVersion,
      parentFileId: latestExisting?.id ?? null,
    },
  };
}

/**
 * Step 2: record the file row after the browser has uploaded the bytes to the
 * signed path. Re-validates ownership and re-derives the version chain so a
 * stale/forged ticket can't corrupt versioning.
 */
export async function finalizeFileUploadAction(input: {
  projectId: string;
  folder: string;
  filename: string;
  storagePath: string;
  sizeBytes: number;
  contentType: string;
}): Promise<Result<{ id: string; filename: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const projectCheck = await assertWorkspaceRecord(supabase, "projects", input.projectId, workspaceId, "Projet");
  if (!projectCheck.ok) return projectCheck;

  // The uploaded object must live under this workspace's prefix.
  if (!input.storagePath.startsWith(`${workspaceId}/${input.projectId}/`)) {
    return { ok: false, error: "Chemin de stockage invalide." };
  }

  const { data: existing } = await supabase
    .from("files")
    .select("id, version")
    .eq("workspace_id", workspaceId)
    .eq("project_id", input.projectId)
    .eq("folder", input.folder)
    .eq("filename", input.filename)
    .is("parent_file_id", null)
    .order("version", { ascending: false })
    .limit(1);
  const latestExisting = existing?.[0];
  const newVersion = latestExisting ? latestExisting.version + 1 : 1;

  const { data: fileRow, error: insertError } = await supabase
    .from("files")
    .insert({
      workspace_id: workspaceId,
      project_id: input.projectId,
      folder: input.folder,
      filename: input.filename,
      storage_path: input.storagePath,
      size_bytes: input.sizeBytes,
      mime_type: input.contentType,
      version: newVersion,
      parent_file_id: latestExisting?.id ?? null,
    })
    .select("id")
    .single();

  if (insertError) return { ok: false, error: insertError.message };

  await Promise.all([
    supabase.from("activity_log").insert({
      workspace_id: workspaceId,
      project_id: input.projectId,
      action: "file.uploaded",
      metadata: { filename: input.filename, folder: input.folder, version: newVersion },
    }),
    supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.projectId)
      .eq("workspace_id", workspaceId),
  ]);

  revalidatePath(`/projects/${input.projectId}/files`);
  return { ok: true, data: { id: fileRow.id, filename: input.filename } };
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
