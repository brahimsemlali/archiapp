"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface Comment {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author_email?: string;
}

export async function createCommentAction(
  resourceType: string,
  resourceId: string,
  body: string,
  revalidate?: string
): Promise<Result<Comment>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId } = context.data;

  if (!body.trim()) return { ok: false, error: "Commentaire vide." };
  if (resourceType !== "project") return { ok: false, error: "Type de commentaire non supporté." };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", resourceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (projectError) return { ok: false, error: projectError.message };
  if (!project) return { ok: false, error: "Projet introuvable." };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      workspace_id: workspaceId,
      resource_type: resourceType,
      resource_id: resourceId,
      author_id: user.id,
      body: body.trim(),
    })
    .select("id, body, author_id, created_at")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  if (revalidate) revalidatePath(revalidate);
  return { ok: true, data: { ...data, author_email: user.email } };
}

export async function deleteCommentAction(id: string, revalidate?: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { user, workspaceId, role } = context.data;

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("author_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (commentError) return { ok: false, error: commentError.message };
  if (!comment) return { ok: false, error: "Commentaire introuvable." };
  if (comment.author_id !== user.id && role !== "owner" && role !== "admin") {
    return { ok: false, error: "Vous ne pouvez supprimer que vos propres commentaires." };
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: dbError(error) };
  if (revalidate) revalidatePath(revalidate);
  return { ok: true, data: undefined };
}
