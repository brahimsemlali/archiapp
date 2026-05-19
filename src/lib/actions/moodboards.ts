"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecord, requireWorkspaceRole } from "@/lib/workspace";
import { normalizeExternalUrl } from "@/lib/url";
import { assertPublicHttpUrl } from "@/lib/server/url-safety";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { assertStorageAvailable } from "@/lib/billing/guards";
import { validateImageUpload } from "@/lib/storage/upload-validation";
import { dbError } from "@/lib/db-error";

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?)(\?.*)?$/i;
const STORAGE_BUCKET = "project-files";

function extractOgMeta(html: string, baseUrl: string): { imageUrl: string | null; title: string | null } {
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
    ?? null;
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    ?? null;

  let imageUrl = ogImage;
  if (imageUrl && !imageUrl.startsWith("http")) {
    try {
      imageUrl = new URL(imageUrl, baseUrl).href;
    } catch {
      imageUrl = null;
    }
  }

  return { imageUrl, title: ogTitle ? ogTitle.trim() : null };
}

export async function addMoodboardLinkAction(
  moodboardId: string,
  linkUrl: string,
  caption?: string
): Promise<Result<InspirationItem>> {
  let url: URL;
  try {
    url = new URL(linkUrl.trim());
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
    await assertPublicHttpUrl(url);
  } catch {
    return { ok: false, error: "URL invalide." };
  }

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  let imageUrl: string;
  let autoCaption: string | undefined;

  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    // Direct image URL — use as-is, no server-side download needed
    imageUrl = url.href;
  } else {
    // Web page — extract og:image from HTML
    let html: string;
    try {
      const res = await fetch(url.href, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { ok: false, error: `Impossible de charger la page (${res.status}).` };
      html = await res.text();
    } catch {
      return { ok: false, error: "Impossible d'accéder à cette URL." };
    }

    const meta = extractOgMeta(html, url.href);
    if (!meta.imageUrl) return { ok: false, error: "Aucune image trouvée sur cette page. Copiez directement l'URL de l'image." };
    imageUrl = meta.imageUrl;
    if (!caption && meta.title) autoCaption = meta.title;
  }

  const { data: board } = await supabase
    .from("moodboards")
    .select("items")
    .eq("id", moodboardId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!board) return { ok: false, error: "Moodboard introuvable." };

  const existing = (board.items as InspirationItem[]) ?? [];
  const newItem: InspirationItem = {
    id: crypto.randomUUID(),
    url: imageUrl,
    caption: caption?.trim() || autoCaption || undefined,
    source: url.href,
    uploadedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("moodboards")
    .update({ items: [...existing, newItem], updated_at: new Date().toISOString() })
    .eq("id", moodboardId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/moodboards/${moodboardId}`);
  return { ok: true, data: newItem };
}

export interface Moodboard {
  id: string;
  workspace_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  items: InspirationItem[];
  created_at: string;
  updated_at: string;
  clients: { name: string } | null;
}

export async function createMoodboardAction(values: {
  title: string;
  description?: string;
  clientId?: string;
}): Promise<Result<{ id: string }>> {
  if (!values.title?.trim()) return { ok: false, error: "Titre requis." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const clientCheck = await assertWorkspaceRecord(supabase, "clients", values.clientId, workspaceId, "Client");
  if (!clientCheck.ok) return clientCheck;

  const { data, error } = await supabase
    .from("moodboards")
    .insert({
      workspace_id: workspaceId,
      title: values.title.trim(),
      description: values.description?.trim() || null,
      client_id: values.clientId || null,
      items: [],
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "moodboard.created",
    metadata: { title: values.title.trim() },
  });

  revalidatePath("/moodboards");
  return { ok: true, data: { id: data.id } };
}

export async function updateMoodboardAction(
  id: string,
  values: { title: string; description?: string; clientId?: string }
): Promise<Result<void>> {
  if (!values.title?.trim()) return { ok: false, error: "Titre requis." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const clientCheck = await assertWorkspaceRecord(supabase, "clients", values.clientId, workspaceId, "Client");
  if (!clientCheck.ok) return clientCheck;

  const { error } = await supabase
    .from("moodboards")
    .update({
      title: values.title.trim(),
      description: values.description?.trim() || null,
      client_id: values.clientId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/moodboards/${id}`);
  revalidatePath("/moodboards");
  return { ok: true, data: undefined };
}

export async function deleteMoodboardAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("moodboards")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath("/moodboards");
  return { ok: true, data: undefined };
}

export async function addMoodboardImageAction(
  moodboardId: string,
  formData: FormData
): Promise<Result<InspirationItem>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const file = formData.get("image") as File | null;
  if (!file) return { ok: false, error: "Aucune image." };
  const fileValidation = validateImageUpload(file, 10 * 1024 * 1024);
  if (!fileValidation.ok) return fileValidation;
  const storageCheck = await assertStorageAvailable(supabase, workspaceId, file.size);
  if (!storageCheck.ok) return storageCheck;

  const caption = (formData.get("caption") as string | null) ?? undefined;
  const sourceInput = (formData.get("source") as string | null) ?? undefined;
  const source = normalizeExternalUrl(sourceInput);
  if (sourceInput?.trim() && !source) return { ok: false, error: "URL source invalide." };

  const path = `${workspaceId}/moodboards/${moodboardId}/${Date.now()}.${fileValidation.data.extension}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: fileValidation.data.contentType, upsert: false });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return { ok: false, error: "Image envoyée, mais l'aperçu n'a pas pu être généré." };
  }

  const { data: board } = await supabase
    .from("moodboards")
    .select("items")
    .eq("id", moodboardId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!board) return { ok: false, error: "Moodboard introuvable." };

  const existing = (board.items as InspirationItem[]) ?? [];
  const newItem: InspirationItem = {
    id: crypto.randomUUID(),
    url: signedUrlData.signedUrl,
    path,
    caption: caption || undefined,
    source: source ?? undefined,
    uploadedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("moodboards")
    .update({ items: [...existing, newItem], updated_at: new Date().toISOString() })
    .eq("id", moodboardId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/moodboards/${moodboardId}`);
  return { ok: true, data: newItem };
}

export async function removeMoodboardImageAction(
  moodboardId: string,
  itemId: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: board } = await supabase
    .from("moodboards")
    .select("items")
    .eq("id", moodboardId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!board) return { ok: false, error: "Moodboard introuvable." };

  const existing = (board.items as InspirationItem[]) ?? [];
  const removedItem = existing.find((i) => i.id === itemId);

  const { error } = await supabase
    .from("moodboards")
    .update({
      items: existing.filter((i) => i.id !== itemId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", moodboardId)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  if (removedItem?.path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([removedItem.path]);
  }

  revalidatePath(`/moodboards/${moodboardId}`);
  return { ok: true, data: undefined };
}
