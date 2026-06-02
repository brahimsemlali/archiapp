"use server";

import { createClient } from "@/lib/supabase/server";
import { assertWorkspaceRecords, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface RecurringInvoiceValues {
  clientId?: string;
  projectId?: string;
  title: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; tvaRate: number }>;
  subtotalCentimes: number;
  tvaRate: number;
  tvaCentimes: number;
  totalCentimes: number;
  frequency: "monthly" | "quarterly" | "yearly";
  nextDate: string;
  endDate?: string;
  autoSend: boolean;
}

export type RecurringInvoiceRow = {
  id: string;
  title: string;
  total_centimes: number;
  frequency: string;
  next_date: string;
  active: boolean;
  tva_rate: number;
  clients?: { name: string } | null;
  projects?: { title: string } | null;
  items: Array<{ description: string; quantity: number; unitPrice: number; tvaRate: number }>;
};

export async function createRecurringInvoiceAction(values: RecurringInvoiceValues): Promise<Result<RecurringInvoiceRow>> {
  if (!values.title?.trim()) return { ok: false, error: "Titre requis." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "clients", id: values.clientId, label: "Client" },
    { table: "projects", id: values.projectId, label: "Projet" },
  ]);
  if (!relationCheck.ok) return relationCheck;

  const { data, error } = await supabase.from("recurring_invoices").insert({
    workspace_id: workspaceId,
    client_id: values.clientId || null,
    project_id: values.projectId || null,
    title: values.title.trim(),
    items: values.items,
    subtotal_centimes: values.subtotalCentimes,
    tva_rate: values.tvaRate,
    tva_centimes: values.tvaCentimes,
    total_centimes: values.totalCentimes,
    frequency: values.frequency,
    next_date: values.nextDate,
    end_date: values.endDate || null,
    auto_send: values.autoSend,
  })
    .select("id, title, total_centimes, frequency, next_date, active, tva_rate, items, clients!recurring_invoices_client_id_fkey(name), projects!recurring_invoices_project_id_fkey(title)")
    .single();

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/factures");
  const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;
  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  return {
    ok: true,
    data: {
      id: data.id,
      title: data.title,
      total_centimes: data.total_centimes,
      frequency: data.frequency,
      next_date: data.next_date,
      active: data.active,
      tva_rate: Number(data.tva_rate),
      items: data.items as RecurringInvoiceRow["items"],
      clients: client ?? null,
      projects: project ?? null,
    },
  };
}

export async function toggleRecurringInvoiceAction(id: string, active: boolean): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const { data: recurringInvoice, error } = await supabase
    .from("recurring_invoices")
    .update({ active })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: dbError(error) };
  if (!recurringInvoice) return { ok: false, error: "Modèle récurrent introuvable." };
  revalidatePath("/factures");
  return { ok: true, data: undefined };
}

export async function deleteRecurringInvoiceAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const { data: recurringInvoice, error } = await supabase
    .from("recurring_invoices")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: dbError(error) };
  if (!recurringInvoice) return { ok: false, error: "Modèle récurrent introuvable." };
  revalidatePath("/factures");
  return { ok: true, data: undefined };
}

export async function generateFromRecurringAction(id: string): Promise<Result<{ factureId: string }>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: rec, error: recErr } = await supabase
    .from("recurring_invoices")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (recErr || !rec) return { ok: false, error: "Modèle introuvable." };

  const { data: number, error: numberError } = await supabase.rpc("next_workspace_document_number", {
    p_workspace_id: workspaceId,
    p_document_type: "facture",
    p_prefix: "FA",
  });
  if (numberError || typeof number !== "string") {
    return { ok: false, error: numberError?.message ?? "Impossible de générer le numéro de facture." };
  }

  const { data: facture, error: factErr } = await supabase.from("factures").insert({
    workspace_id: workspaceId,
    client_id: rec.client_id,
    project_id: rec.project_id,
    number,
    title: rec.title,
    items: rec.items,
    subtotal_centimes: rec.subtotal_centimes,
    tva_rate: rec.tva_rate,
    tva_centimes: rec.tva_centimes,
    total_centimes: rec.total_centimes,
    status: "brouillon",
  }).select("id").single();

  if (factErr || !facture) return { ok: false, error: factErr?.message ?? "Erreur création." };

  // Advance next_date
  const next = new Date(rec.next_date);
  if (rec.frequency === "monthly") next.setMonth(next.getMonth() + 1);
  else if (rec.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setFullYear(next.getFullYear() + 1);

  await supabase.from("recurring_invoices").update({
    next_date: next.toISOString().split("T")[0],
    last_generated_at: new Date().toISOString(),
  }).eq("id", id).eq("workspace_id", workspaceId);

  revalidatePath("/factures");
  return { ok: true, data: { factureId: facture.id } };
}
