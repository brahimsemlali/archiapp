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
  whatsappNumber?: string;
  email?: string;
  source?: string;
  type?: string;
  stage?: string;
  estimatedValueCentimes?: number;
  projectType?: string;
  notes?: string;
  lostReason?: string;
  followUpStatus?: string;
  nextFollowUpDate?: string;
  lastContactedAt?: string;
  communicationNotes?: string;
}

export interface ProspectRow {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  source: string | null;
  type: string;
  stage: string;
  estimated_value_centimes: number;
  project_type: string | null;
  notes: string | null;
  lost_reason: string | null;
  follow_up_status: string;
  next_follow_up_date: string | null;
  last_contacted_at: string | null;
  communication_notes: string | null;
  created_at: string;
}

export async function createProspectAction(values: ProspectValues): Promise<Result<ProspectRow>> {
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
    whatsapp_number: values.whatsappNumber?.trim() || values.phone?.trim() || null,
    email: values.email?.trim() || null,
    source: values.source || null,
    type: values.type || "particulier",
    stage: values.stage || "nouveau",
    estimated_value_centimes: values.estimatedValueCentimes ?? 0,
    project_type: values.projectType?.trim() || null,
    notes: values.notes?.trim() || null,
    lost_reason: values.lostReason?.trim() || null,
    follow_up_status: values.followUpStatus || "none",
    next_follow_up_date: values.nextFollowUpDate || null,
    last_contacted_at: values.lastContactedAt || null,
    communication_notes: values.communicationNotes?.trim() || null,
  }).select(`
    id,
    name,
    contact_name,
    phone,
    whatsapp_number,
    email,
    source,
    type,
    stage,
    estimated_value_centimes,
    project_type,
    notes,
    lost_reason,
    follow_up_status,
    next_follow_up_date,
    last_contacted_at,
    communication_notes,
    created_at
  `).single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/prospects");
  return { ok: true, data };
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
    ...(values.whatsappNumber !== undefined && { whatsapp_number: values.whatsappNumber?.trim() || null }),
    ...(values.email !== undefined && { email: values.email?.trim() || null }),
    ...(values.source !== undefined && { source: values.source || null }),
    ...(values.type && { type: values.type }),
    ...(values.stage && { stage: values.stage }),
    ...(values.estimatedValueCentimes !== undefined && { estimated_value_centimes: values.estimatedValueCentimes }),
    ...(values.projectType !== undefined && { project_type: values.projectType?.trim() || null }),
    ...(values.notes !== undefined && { notes: values.notes?.trim() || null }),
    ...(values.lostReason !== undefined && { lost_reason: values.lostReason?.trim() || null }),
    ...(values.followUpStatus !== undefined && { follow_up_status: values.followUpStatus || "none" }),
    ...(values.nextFollowUpDate !== undefined && { next_follow_up_date: values.nextFollowUpDate || null }),
    ...(values.lastContactedAt !== undefined && { last_contacted_at: values.lastContactedAt || null }),
    ...(values.communicationNotes !== undefined && { communication_notes: values.communicationNotes?.trim() || null }),
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
