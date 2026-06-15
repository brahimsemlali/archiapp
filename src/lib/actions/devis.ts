"use server";

import { createClient } from "@/lib/supabase/server";
import { assertProjectMatchesClient, assertWorkspaceRecords, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { devisFormSchema, type DevisFormValues } from "@/lib/validators/devis";
import { sendEmail } from "@/lib/email/send";
import { devisSentEmail, APP_URL } from "@/lib/email/templates";
import { formatMoney, formatDate } from "@/lib/format";
import { resolveLocalization } from "@/lib/country-packs";
import { dbError } from "@/lib/db-error";


async function nextDevisNumber(supabase: Awaited<ReturnType<typeof createClient>>, workspaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_workspace_document_number", {
    p_workspace_id: workspaceId,
    p_document_type: "devis",
    p_prefix: "DEV",
  });

  if (error || typeof data !== "string") {
    throw new Error(error?.message ?? "Impossible de générer le numéro du devis.");
  }

  return data;
}

function computeTotals(items: DevisFormValues["items"], tvaRate: number) {
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCentimes), 0);
  const tva = Math.round(subtotal * tvaRate / 100);
  return { subtotalCentimes: subtotal, tvaCentimes: tva, totalCentimes: subtotal + tva };
}

export async function createDevisAction(values: DevisFormValues): Promise<Result<{ id: string }>> {
  const parsed = devisFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "clients", id: parsed.data.clientId, label: "Client" },
    { table: "projects", id: parsed.data.projectId, label: "Projet" },
  ]);
  if (!relationCheck.ok) return relationCheck;
  const projectClientCheck = await assertProjectMatchesClient(supabase, workspaceId, parsed.data.projectId, parsed.data.clientId);
  if (!projectClientCheck.ok) return projectClientCheck;

  let number: string;
  try {
    number = await nextDevisNumber(supabase, workspaceId);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Impossible de générer le numéro du devis." };
  }
  const { subtotalCentimes, tvaCentimes, totalCentimes } = computeTotals(parsed.data.items, parsed.data.tvaRate);

  const { data, error } = await supabase
    .from("devis")
    .insert({
      workspace_id: workspaceId,
      client_id: parsed.data.clientId,
      project_id: parsed.data.projectId ?? null,
      number,
      title: parsed.data.title,
      items: parsed.data.items,
      tva_rate: parsed.data.tvaRate,
      subtotal_centimes: subtotalCentimes,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      notes: parsed.data.notes ?? null,
      valid_until: parsed.data.validUntil ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: parsed.data.projectId ?? null,
    client_id: parsed.data.clientId,
    action: "devis.created",
    metadata: { title: parsed.data.title, number, total_centimes: totalCentimes },
  });

  revalidatePath("/devis");
  if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateDevisAction(id: string, values: DevisFormValues): Promise<Result<void>> {
  const parsed = devisFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;
  const relationCheck = await assertWorkspaceRecords(supabase, workspaceId, [
    { table: "clients", id: parsed.data.clientId, label: "Client" },
    { table: "projects", id: parsed.data.projectId, label: "Projet" },
  ]);
  if (!relationCheck.ok) return relationCheck;
  const projectClientCheck = await assertProjectMatchesClient(supabase, workspaceId, parsed.data.projectId, parsed.data.clientId);
  if (!projectClientCheck.ok) return projectClientCheck;

  const { subtotalCentimes, tvaCentimes, totalCentimes } = computeTotals(parsed.data.items, parsed.data.tvaRate);

  const { data: devis, error } = await supabase
    .from("devis")
    .update({
      client_id: parsed.data.clientId,
      project_id: parsed.data.projectId ?? null,
      title: parsed.data.title,
      items: parsed.data.items,
      tva_rate: parsed.data.tvaRate,
      subtotal_centimes: subtotalCentimes,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      notes: parsed.data.notes ?? null,
      valid_until: parsed.data.validUntil ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!devis) return { ok: false, error: "Devis introuvable." };

  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  return { ok: true, data: undefined };
}

export async function updateDevisStatusAction(
  id: string,
  status: "brouillon" | "envoye" | "accepte" | "refuse" | "expire"
): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: devis, error } = await supabase
    .from("devis")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, number, title, total_centimes, valid_until, client_id, clients!devis_client_id_fkey(name, email)")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!devis) return { ok: false, error: "Devis introuvable." };

  if (status === "envoye") {
    const { data: firm } = await supabase
      .from("firm_profile")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const { data: shareLink } = await supabase
      .from("share_links")
      .select("token")
      .eq("workspace_id", workspaceId)
      .eq("resource_type", "client")
      .eq("resource_id", devis.client_id)
      .is("expires_at", null)
      .maybeSingle();

    const client = Array.isArray(devis.clients) ? devis.clients[0] : devis.clients;
    const portalUrl = shareLink
      ? `${APP_URL}/portal/client/${shareLink.token}`
      : `${APP_URL}/devis/${id}`;

    const tpl = devisSentEmail({
      firmName: firm?.firm_name ?? "Votre architecte",
      clientName: client?.name ?? "Client",
      devisNumber: devis.number ?? id,
      devisTitle: devis.title ?? "Devis",
      totalTTC: formatMoney(devis.total_centimes ?? 0, resolveLocalization(firm).currency),
      validUntil: devis.valid_until ? formatDate(devis.valid_until) : "—",
      portalUrl,
    });

    await sendEmail({
      workspaceId,
      to: client?.email,
      subject: tpl.subject,
      html: tpl.html,
      eventType: "devis.sent",
      resourceType: "devis",
      resourceId: id,
    });
  }

  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function deleteDevisAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data: devis, error } = await supabase
    .from("devis")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbError(error) };
  if (!devis) return { ok: false, error: "Devis introuvable." };

  revalidatePath("/devis");
  return { ok: true, data: undefined };
}
