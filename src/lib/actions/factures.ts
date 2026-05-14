"use server";

import { createClient } from "@/lib/supabase/server";
import { assertDevisMatchesContext, assertProjectMatchesClient, assertWorkspaceRecords, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { factureFormSchema, type FactureFormValues } from "@/lib/validators/facture";


async function nextFactureNumber(supabase: Awaited<ReturnType<typeof createClient>>, workspaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_workspace_document_number", {
    p_workspace_id: workspaceId,
    p_document_type: "facture",
    p_prefix: "FA",
  });

  if (error || typeof data !== "string") {
    throw new Error(error?.message ?? "Impossible de générer le numéro de facture.");
  }

  return data;
}

function computeTotals(items: FactureFormValues["items"], tvaRate: number) {
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCentimes), 0);
  const tva = Math.round(subtotal * tvaRate / 100);
  return { subtotalCentimes: subtotal, tvaCentimes: tva, totalCentimes: subtotal + tva };
}

async function createSentInvoiceSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  factureId: string,
  status: "envoyee" | "payee",
  paidAt?: string
): Promise<Result<void>> {
  const [{ data: userResult }, { data: existing }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("invoice_snapshots")
      .select("id")
      .eq("facture_id", factureId)
      .eq("snapshot_type", "sent")
      .maybeSingle(),
  ]);

  if (existing) return { ok: true, data: undefined };

  const [{ data: facture, error: factureError }, { data: firmProfile }] = await Promise.all([
    supabase
      .from("factures")
      .select(`
        id, workspace_id, project_id, client_id, devis_id, number, title, status,
        items, subtotal_centimes, tva_rate, tva_centimes, total_centimes, notes,
        due_date, paid_at, created_at, updated_at,
        clients!factures_client_id_fkey(name, type, phone, email, address, ice, cin),
        projects!factures_project_id_fkey(title, address)
      `)
      .eq("id", factureId)
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("firm_profile")
      .select("firm_name, architect_name, address, phone, email, ice, rc, if_number, cnss, patente, iban, logo_url")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  if (factureError || !facture) {
    return { ok: false, error: factureError?.message ?? "Facture introuvable." };
  }

  const snapshotPayload = {
    schemaVersion: 1,
    snapshotType: "sent",
    capturedAt: new Date().toISOString(),
    facture: {
      ...facture,
      status,
      paid_at: status === "payee" ? (paidAt ?? new Date().toISOString()) : facture.paid_at,
    },
    firmProfile,
  };

  const { error } = await supabase
    .from("invoice_snapshots")
    .insert({
      workspace_id: workspaceId,
      facture_id: factureId,
      snapshot_type: "sent",
      number: facture.number,
      payload: snapshotPayload,
      created_by: userResult.user?.id ?? null,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function createFactureAction(values: FactureFormValues): Promise<Result<{ id: string }>> {
  const parsed = factureFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "clients", id: parsed.data.clientId, label: "Client" },
    { table: "projects", id: parsed.data.projectId, label: "Projet" },
    { table: "devis", id: parsed.data.devisId, label: "Devis" },
  ]);
  if (!relationCheck.ok) return relationCheck;
  const projectClientCheck = await assertProjectMatchesClient(supabase, workspaceId, parsed.data.projectId, parsed.data.clientId);
  if (!projectClientCheck.ok) return projectClientCheck;
  const devisContextCheck = await assertDevisMatchesContext(supabase, workspaceId, parsed.data.devisId, parsed.data.clientId, parsed.data.projectId);
  if (!devisContextCheck.ok) return devisContextCheck;

  let number: string;
  try {
    number = await nextFactureNumber(supabase, workspaceId);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Impossible de générer le numéro de facture." };
  }
  const { subtotalCentimes, tvaCentimes, totalCentimes } = computeTotals(parsed.data.items, parsed.data.tvaRate);

  const { data, error } = await supabase
    .from("factures")
    .insert({
      workspace_id: workspaceId,
      client_id: parsed.data.clientId,
      project_id: parsed.data.projectId ?? null,
      devis_id: parsed.data.devisId ?? null,
      number,
      title: parsed.data.title,
      items: parsed.data.items,
      tva_rate: parsed.data.tvaRate,
      subtotal_centimes: subtotalCentimes,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      notes: parsed.data.notes ?? null,
      due_date: parsed.data.dueDate ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId ?? null,
    client_id: parsed.data.clientId,
    action: "facture.created",
    metadata: { title: parsed.data.title, number, total_centimes: totalCentimes },
  });

  revalidatePath("/factures");
  if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateFactureAction(id: string, values: FactureFormValues): Promise<Result<void>> {
  const parsed = factureFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "clients", id: parsed.data.clientId, label: "Client" },
    { table: "projects", id: parsed.data.projectId, label: "Projet" },
    { table: "devis", id: parsed.data.devisId, label: "Devis" },
  ]);
  if (!relationCheck.ok) return relationCheck;
  const projectClientCheck = await assertProjectMatchesClient(supabase, workspaceId, parsed.data.projectId, parsed.data.clientId);
  if (!projectClientCheck.ok) return projectClientCheck;
  const devisContextCheck = await assertDevisMatchesContext(supabase, workspaceId, parsed.data.devisId, parsed.data.clientId, parsed.data.projectId);
  if (!devisContextCheck.ok) return devisContextCheck;

  const { data: current } = await supabase
    .from("factures")
    .select("status")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!current) return { ok: false, error: "Facture introuvable." };
  if (current.status !== "brouillon") {
    return { ok: false, error: "Seules les factures en brouillon peuvent être modifiées." };
  }

  const { subtotalCentimes, tvaCentimes, totalCentimes } = computeTotals(parsed.data.items, parsed.data.tvaRate);

  const { data: facture, error } = await supabase
    .from("factures")
    .update({
      client_id: parsed.data.clientId,
      project_id: parsed.data.projectId ?? null,
      devis_id: parsed.data.devisId ?? null,
      title: parsed.data.title,
      items: parsed.data.items,
      tva_rate: parsed.data.tvaRate,
      subtotal_centimes: subtotalCentimes,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      notes: parsed.data.notes ?? null,
      due_date: parsed.data.dueDate ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!facture) return { ok: false, error: "Facture introuvable." };

  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  return { ok: true, data: undefined };
}

export async function updateFactureStatusAction(
  id: string,
  status: "brouillon" | "envoyee" | "payee" | "annulee",
  paidAt?: string
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const [{ data: userResult }, { data: current }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("factures")
      .select("status")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single(),
  ]);

  if (!current) return { ok: false, error: "Facture introuvable." };

  if (status === "envoyee" || status === "payee") {
    const snapshotResult = await createSentInvoiceSnapshot(supabase, workspaceId, id, status, paidAt);
    if (!snapshotResult.ok) return snapshotResult;
  }

  const { data: facture, error } = await supabase
    .from("factures")
    .update({
      status,
      paid_at: status === "payee" ? (paidAt ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!facture) return { ok: false, error: "Facture introuvable." };

  await supabase.from("invoice_status_events").insert({
    workspace_id: workspaceId,
    facture_id: id,
    previous_status: current.status,
    next_status: status,
    actor_id: userResult.user?.id ?? null,
    source: "app",
    metadata: { paidAt: status === "payee" ? (paidAt ?? null) : null },
  });

  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteFactureAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: current } = await supabase
    .from("factures")
    .select("status")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!current) return { ok: false, error: "Facture introuvable." };
  if (current.status !== "brouillon") {
    return { ok: false, error: "Seules les factures en brouillon peuvent être supprimées." };
  }

  const { data: facture, error } = await supabase
    .from("factures")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!facture) return { ok: false, error: "Facture introuvable." };
  revalidatePath("/factures");
  return { ok: true, data: undefined };
}
