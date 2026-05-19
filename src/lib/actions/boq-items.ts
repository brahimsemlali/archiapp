"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

const optionalUuid = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().uuid().optional()
);

const moneyToCentimes = z.preprocess((value) => {
  if (value === "" || value == null) return 0;
  if (typeof value === "number") return Math.round(value * 100);
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : value;
}, z.number().int().min(0));

const boqItemSchema = z.object({
  projectId: z.string().uuid(),
  supplierId: optionalUuid,
  itemName: z.string().trim().min(2, "Nom requis"),
  category: z.string().trim().optional(),
  quantity: z.coerce.number().min(0).default(0),
  unit: z.string().trim().min(1).default("u"),
  estimatedCost: moneyToCentimes.default(0),
  actualCost: moneyToCentimes.default(0),
  procurementStatus: z.enum(["not_started", "requested", "ordered", "delivered", "installed", "cancelled"]).default("not_started"),
  notes: z.string().trim().optional(),
});

const boqItemUpdateSchema = boqItemSchema.omit({ projectId: true }).partial();

export type BoqItemInput = z.input<typeof boqItemSchema>;
export type BoqItemUpdate = z.input<typeof boqItemUpdateSchema>;

export async function createBoqItemAction(input: BoqItemInput): Promise<Result<{ id: string }>> {
  const parsed = boqItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!project) return { ok: false, error: "Projet introuvable." };

  if (parsed.data.supplierId) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", parsed.data.supplierId)
      .eq("workspace_id", workspaceId)
      .single();
    if (!supplier) return { ok: false, error: "Fournisseur introuvable." };
  }

  const { data, error } = await supabase
    .from("boq_items")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.data.projectId,
      supplier_id: parsed.data.supplierId ?? null,
      item_name: parsed.data.itemName,
      category: parsed.data.category || null,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      estimated_cost_centimes: parsed.data.estimatedCost,
      actual_cost_centimes: parsed.data.actualCost,
      procurement_status: parsed.data.procurementStatus,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId,
    action: "boq.item_created",
    metadata: { itemName: parsed.data.itemName, procurementStatus: parsed.data.procurementStatus },
  });

  revalidatePath("/boq");
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateBoqItemAction(id: string, input: BoqItemUpdate): Promise<Result<void>> {
  const parsed = boqItemUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: item } = await supabase
    .from("boq_items")
    .select("project_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();
  if (!item) return { ok: false, error: "Article introuvable." };

  if (parsed.data.supplierId) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", parsed.data.supplierId)
      .eq("workspace_id", workspaceId)
      .single();
    if (!supplier) return { ok: false, error: "Fournisseur introuvable." };
  }

  const has = (key: keyof z.infer<typeof boqItemUpdateSchema>) =>
    Object.prototype.hasOwnProperty.call(input, key);

  const { error } = await supabase
    .from("boq_items")
    .update({
      ...(has("supplierId") && { supplier_id: parsed.data.supplierId ?? null }),
      ...(has("itemName") && { item_name: parsed.data.itemName }),
      ...(has("category") && { category: parsed.data.category || null }),
      ...(has("quantity") && { quantity: parsed.data.quantity }),
      ...(has("unit") && { unit: parsed.data.unit }),
      ...(has("estimatedCost") && { estimated_cost_centimes: parsed.data.estimatedCost }),
      ...(has("actualCost") && { actual_cost_centimes: parsed.data.actualCost }),
      ...(has("procurementStatus") && { procurement_status: parsed.data.procurementStatus }),
      ...(has("notes") && { notes: parsed.data.notes || null }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/boq");
  revalidatePath(`/projects/${item.project_id}`);
  return { ok: true, data: undefined };
}

export async function deleteBoqItemAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: item } = await supabase
    .from("boq_items")
    .select("project_id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();
  if (!item) return { ok: false, error: "Article introuvable." };

  const { error } = await supabase
    .from("boq_items")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/boq");
  revalidatePath(`/projects/${item.project_id}`);
  return { ok: true, data: undefined };
}
