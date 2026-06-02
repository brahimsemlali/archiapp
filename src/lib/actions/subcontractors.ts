"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface SubcontractorInput {
  name: string;
  trade?: string;
  phone?: string;
  email?: string;
  address?: string;
  cnss?: string;
  rib?: string;
  rating?: number;
  notes?: string;
}

export interface SubcontractorRow {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnss: string | null;
  rib: string | null;
  rating: number | null;
  notes: string | null;
}

function normalizeInput(input: SubcontractorInput | Partial<SubcontractorInput>) {
  return {
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.trade !== undefined && { trade: input.trade?.trim() || null }),
    ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
    ...(input.email !== undefined && { email: input.email?.trim() || null }),
    ...(input.address !== undefined && { address: input.address?.trim() || null }),
    ...(input.cnss !== undefined && { cnss: input.cnss?.trim() || null }),
    ...(input.rib !== undefined && { rib: input.rib?.trim() || null }),
    ...(input.rating !== undefined && { rating: input.rating ?? null }),
    ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
  };
}

const subcontractorSelect = "id, name, trade, phone, email, address, cnss, rib, rating, notes";

export async function createSubcontractorAction(input: SubcontractorInput): Promise<Result<SubcontractorRow>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  if (!input.name.trim()) return { ok: false, error: "Nom requis." };

  const { data, error } = await supabase
    .from("subcontractors")
    .insert({ workspace_id: workspaceId, ...normalizeInput(input) })
    .select(subcontractorSelect)
    .single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/subcontractors");
  return { ok: true, data };
}

export async function updateSubcontractorAction(id: string, input: Partial<SubcontractorInput>): Promise<Result<SubcontractorRow>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase
    .from("subcontractors")
    .update({ ...normalizeInput(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(subcontractorSelect)
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!data) return { ok: false, error: "Sous-traitant introuvable." };
  revalidatePath("/subcontractors");
  return { ok: true, data };
}

export async function deleteSubcontractorAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("subcontractors")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/subcontractors");
  return { ok: true, data: undefined };
}
