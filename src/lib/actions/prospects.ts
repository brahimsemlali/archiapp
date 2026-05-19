"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface ProspectValues {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  source?: string;
  type?: string;
  stage?: string;
  estimatedValueCentimes?: number;
  projectType?: string;
  notes?: string;
  lostReason?: string;
}

export async function createProspectAction(values: ProspectValues): Promise<Result<{ id: string }>> {
  if (!values.name?.trim()) return { ok: false, error: "Nom requis." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase.from("prospects").insert({
    workspace_id: workspaceId,
    name: values.name.trim(),
    contact_name: values.contactName?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    source: values.source || null,
    type: values.type || "particulier",
    stage: values.stage || "nouveau",
    estimated_value_centimes: values.estimatedValueCentimes ?? 0,
    project_type: values.projectType?.trim() || null,
    notes: values.notes?.trim() || null,
  }).select("id").single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/prospects");
  return { ok: true, data: { id: data.id } };
}

export async function updateProspectAction(id: string, values: Partial<ProspectValues & { stage: string }>): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: prospect, error } = await supabase.from("prospects").update({
    ...(values.name && { name: values.name.trim() }),
    ...(values.contactName !== undefined && { contact_name: values.contactName?.trim() || null }),
    ...(values.phone !== undefined && { phone: values.phone?.trim() || null }),
    ...(values.email !== undefined && { email: values.email?.trim() || null }),
    ...(values.source !== undefined && { source: values.source || null }),
    ...(values.type && { type: values.type }),
    ...(values.stage && { stage: values.stage }),
    ...(values.estimatedValueCentimes !== undefined && { estimated_value_centimes: values.estimatedValueCentimes }),
    ...(values.projectType !== undefined && { project_type: values.projectType?.trim() || null }),
    ...(values.notes !== undefined && { notes: values.notes?.trim() || null }),
    ...(values.lostReason !== undefined && { lost_reason: values.lostReason?.trim() || null }),
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("workspace_id", workspaceId).select("id").maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!prospect) return { ok: false, error: "Prospect introuvable." };
  revalidatePath("/prospects");
  return { ok: true, data: undefined };
}

export async function deleteProspectAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: prospect, error } = await supabase.from("prospects").delete().eq("id", id).eq("workspace_id", workspaceId).select("id").maybeSingle();
  if (error) return { ok: false, error: dbError(error) };
  if (!prospect) return { ok: false, error: "Prospect introuvable." };
  revalidatePath("/prospects");
  return { ok: true, data: undefined };
}
