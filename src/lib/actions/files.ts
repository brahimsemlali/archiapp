"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import crypto from "crypto";

const STORAGE_BUCKET = "project-files";

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

export async function uploadFileAction(
  projectId: string,
  folder: string,
  formData: FormData
): Promise<Result<{ id: string; filename: string }>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "Aucun fichier fourni." };

  if (file.size > 100 * 1024 * 1024) {
    return { ok: false, error: "Le fichier dépasse 100 Mo." };
  }

  // Check for existing file with same name in same folder → versioning
  const { data: existing } = await supabase
    .from("files")
    .select("id, version")
    .eq("project_id", projectId)
    .eq("folder", folder)
    .eq("filename", file.name)
    .is("parent_file_id", null)
    .order("version", { ascending: false })
    .limit(1);

  const latestExisting = existing?.[0];
  const newVersion = latestExisting ? latestExisting.version + 1 : 1;

  const storagePath = `${workspaceId}/${projectId}/${folder}/${Date.now()}_${file.name}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
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
      mime_type: file.type || "application/octet-stream",
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
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

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
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

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

  if (error) return { ok: false, error: error.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true, data: `${appUrl}/share/${token}` };
}

export async function deleteFileAction(fileId: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { data: file } = await supabase
    .from("files")
    .select("storage_path")
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

  if (error) return { ok: false, error: error.message };

  return { ok: true, data: undefined };
}
