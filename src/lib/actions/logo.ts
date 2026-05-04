"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

const LOGOS_BUCKET = "logos";

export async function uploadLogoAction(formData: FormData): Promise<Result<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return { ok: false, error: "Espace de travail introuvable." };

  const file = formData.get("logo") as File | null;
  if (!file) return { ok: false, error: "Aucun fichier." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Logo max 2 Mo." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Format image requis (PNG, JPG, SVG)." };

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${workspace.id}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(LOGOS_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(path);

  await supabase
    .from("firm_profile")
    .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id);

  revalidatePath("/settings");
  return { ok: true, data: urlData.publicUrl };
}
