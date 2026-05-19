"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface TemplateValues {
  type: "devis" | "checklist" | "contract_clause";
  name: string;
  description?: string;
  content: Record<string, unknown>;
}

export async function createTemplateAction(values: TemplateValues): Promise<Result<{ id: string }>> {
  if (!values.name?.trim()) return { ok: false, error: "Nom requis." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase.from("templates").insert({
    workspace_id: workspaceId,
    type: values.type,
    name: values.name.trim(),
    description: values.description?.trim() || null,
    content: values.content,
  }).select("id").single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/templates");
  return { ok: true, data: { id: data.id } };
}

export async function updateTemplateAction(id: string, values: Partial<TemplateValues>): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase.from("templates").update({
    ...(values.name && { name: values.name.trim() }),
    ...(values.description !== undefined && { description: values.description?.trim() || null }),
    ...(values.content && { content: values.content }),
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/templates");
  return { ok: true, data: undefined };
}

export async function deleteTemplateAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const { error } = await supabase.from("templates").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/templates");
  return { ok: true, data: undefined };
}
