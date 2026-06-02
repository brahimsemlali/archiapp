"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { WORKSPACE_ADMIN_ROLES, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { validateImageUpload } from "@/lib/storage/upload-validation";
import { dbError } from "@/lib/db-error";

const LOGOS_BUCKET = "logos";

export async function uploadLogoAction(formData: FormData): Promise<Result<string>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase, WORKSPACE_ADMIN_ROLES);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const file = formData.get("logo") as File | null;
  if (!file) return { ok: false, error: "Aucun fichier." };
  const validation = validateImageUpload(file, 2 * 1024 * 1024);
  if (!validation.ok) return validation;

  const path = `${workspaceId}/logo.${validation.data.extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const serviceSupabase = await createServiceClient();

  const { error: uploadError } = await serviceSupabase.storage
    .from(LOGOS_BUCKET)
    .upload(path, arrayBuffer, { contentType: validation.data.contentType, upsert: true });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = serviceSupabase.storage.from(LOGOS_BUCKET).getPublicUrl(path);

  const { data: profile, error: profileError } = await serviceSupabase
    .from("firm_profile")
    .upsert({ workspace_id: workspaceId, logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .select("workspace_id")
    .maybeSingle();

  if (profileError) return { ok: false, error: dbError(profileError) };
  if (!profile) return { ok: false, error: "Profil cabinet introuvable." };

  revalidatePath("/settings");
  return { ok: true, data: urlData.publicUrl };
}
