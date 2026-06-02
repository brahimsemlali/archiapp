"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecord, requireWorkspaceRole } from "@/lib/workspace";
import { normalizeExternalUrl } from "@/lib/url";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface SupplierValues {
  name: string;
  category?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  rating?: number;
}

export interface CatalogItemValues {
  supplierId?: string;
  name: string;
  description?: string;
  unit: string;
  unitPriceCentimes: number;
  category?: string;
  reference?: string;
  lastUpdated?: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  rating: number | null;
}

export interface CatalogItemRow {
  id: string;
  supplier_id: string | null;
  name: string;
  description: string | null;
  unit: string;
  unit_price_centimes: number;
  category: string | null;
  reference: string | null;
  last_updated: string | null;
  suppliers?: { name: string } | null;
}

export async function createSupplierAction(values: SupplierValues): Promise<Result<SupplierRow>> {
  if (!values.name?.trim()) return { ok: false, error: "Nom requis." };
  const website = normalizeExternalUrl(values.website);
  if (values.website?.trim() && !website) return { ok: false, error: "Site web invalide." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase.from("suppliers").insert({
    workspace_id: workspaceId,
    name: values.name.trim(),
    category: values.category || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    address: values.address?.trim() || null,
    website,
    notes: values.notes?.trim() || null,
    rating: values.rating ?? null,
  }).select("id, name, category, phone, email, address, website, notes, rating").single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "supplier.created",
    metadata: { name: values.name.trim(), category: values.category ?? null },
  });

  revalidatePath("/fournisseurs");
  return { ok: true, data };
}

export async function updateSupplierAction(id: string, values: Partial<SupplierValues>): Promise<Result<void>> {
  const website = normalizeExternalUrl(values.website);
  if (values.website?.trim() && !website) return { ok: false, error: "Site web invalide." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: supplier, error } = await supabase.from("suppliers").update({
    ...(values.name && { name: values.name.trim() }),
    ...(values.category !== undefined && { category: values.category || null }),
    ...(values.phone !== undefined && { phone: values.phone?.trim() || null }),
    ...(values.email !== undefined && { email: values.email?.trim() || null }),
    ...(values.address !== undefined && { address: values.address?.trim() || null }),
    ...(values.website !== undefined && { website }),
    ...(values.notes !== undefined && { notes: values.notes?.trim() || null }),
    ...(values.rating !== undefined && { rating: values.rating ?? null }),
  }).eq("id", id).eq("workspace_id", workspaceId).select("id").maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!supplier) return { ok: false, error: "Fournisseur introuvable." };
  revalidatePath("/fournisseurs");
  return { ok: true, data: undefined };
}

export async function deleteSupplierAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const { data: supplier, error } = await supabase.from("suppliers").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId).select("id, name").maybeSingle();
  if (error) return { ok: false, error: dbError(error) };
  if (!supplier) return { ok: false, error: "Fournisseur introuvable." };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "supplier.deleted",
    metadata: { supplier_id: id, name: (supplier as { name?: string }).name ?? null },
  });

  revalidatePath("/fournisseurs");
  return { ok: true, data: undefined };
}

export async function createCatalogItemAction(values: CatalogItemValues): Promise<Result<CatalogItemRow>> {
  if (!values.name?.trim()) return { ok: false, error: "Nom requis." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const supplierCheck = await assertWorkspaceRecord(supabase, "suppliers", values.supplierId, workspaceId, "Fournisseur");
  if (!supplierCheck.ok) return supplierCheck;

  const { data, error } = await supabase.from("catalog_items").insert({
    workspace_id: workspaceId,
    supplier_id: values.supplierId || null,
    name: values.name.trim(),
    description: values.description?.trim() || null,
    unit: values.unit,
    unit_price_centimes: values.unitPriceCentimes,
    category: values.category || null,
    reference: values.reference?.trim() || null,
    last_updated: values.lastUpdated || new Date().toISOString().split("T")[0],
  }).select("id, supplier_id, name, description, unit, unit_price_centimes, category, reference, last_updated, suppliers!catalog_items_supplier_id_fkey(name)").single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/fournisseurs");
  return { ok: true, data: {
    ...data,
    suppliers: Array.isArray(data.suppliers) ? data.suppliers[0] ?? null : data.suppliers,
  } };
}

export async function updateCatalogItemAction(id: string, values: Partial<CatalogItemValues>): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const supplierCheck = await assertWorkspaceRecord(supabase, "suppliers", values.supplierId, workspaceId, "Fournisseur");
  if (!supplierCheck.ok) return supplierCheck;

  const { data: item, error } = await supabase.from("catalog_items").update({
    ...(values.name && { name: values.name.trim() }),
    ...(values.supplierId !== undefined && { supplier_id: values.supplierId || null }),
    ...(values.description !== undefined && { description: values.description?.trim() || null }),
    ...(values.unit && { unit: values.unit }),
    ...(values.unitPriceCentimes !== undefined && { unit_price_centimes: values.unitPriceCentimes }),
    ...(values.category !== undefined && { category: values.category || null }),
    ...(values.reference !== undefined && { reference: values.reference?.trim() || null }),
    last_updated: new Date().toISOString().split("T")[0],
  }).eq("id", id).eq("workspace_id", workspaceId).select("id").maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!item) return { ok: false, error: "Article introuvable." };
  revalidatePath("/fournisseurs");
  return { ok: true, data: undefined };
}

export async function deleteCatalogItemAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const { data: item, error } = await supabase.from("catalog_items").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId).select("id").maybeSingle();
  if (error) return { ok: false, error: dbError(error) };
  if (!item) return { ok: false, error: "Article introuvable." };
  revalidatePath("/fournisseurs");
  return { ok: true, data: undefined };
}
