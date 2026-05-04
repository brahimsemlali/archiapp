"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import crypto from "crypto";

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
  return data?.id ?? null;
}

export async function createProjectPortalLinkAction(
  projectId: string,
  expiresInDays: number | null = 30
): Promise<Result<{ token: string; url: string }>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  // Check project belongs to workspace
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  // Revoke any existing project portal link
  await supabase
    .from("share_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "project")
    .eq("resource_id", projectId);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("share_links").insert({
    workspace_id: workspaceId,
    resource_type: "project",
    resource_id: projectId,
    token,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: error.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: { token, url: `${appUrl}/portal/${token}` } };
}

export async function revokeProjectPortalLinkAction(
  projectId: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  await supabase
    .from("share_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("resource_type", "project")
    .eq("resource_id", projectId);

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}
