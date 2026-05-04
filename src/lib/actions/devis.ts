"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import type { DevisFormValues } from "@/lib/validators/devis";

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
  return data?.id ?? null;
}

async function nextDevisNumber(supabase: Awaited<ReturnType<typeof createClient>>, workspaceId: string): Promise<string> {
  const { count } = await supabase
    .from("devis")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const n = (count ?? 0) + 1;
  const year = new Date().getFullYear();
  return `DEV-${year}-${String(n).padStart(3, "0")}`;
}

function computeTotals(items: DevisFormValues["items"], tvaRate: number) {
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCentimes), 0);
  const tva = Math.round(subtotal * tvaRate / 100);
  return { subtotalCentimes: subtotal, tvaCentimes: tva, totalCentimes: subtotal + tva };
}

export async function createDevisAction(values: DevisFormValues): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const number = await nextDevisNumber(supabase, workspaceId);
  const { subtotalCentimes, tvaCentimes, totalCentimes } = computeTotals(values.items, values.tvaRate);

  const { data, error } = await supabase
    .from("devis")
    .insert({
      workspace_id: workspaceId,
      client_id: values.clientId,
      project_id: values.projectId ?? null,
      number,
      title: values.title,
      items: values.items,
      tva_rate: values.tvaRate,
      subtotal_centimes: subtotalCentimes,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      notes: values.notes ?? null,
      valid_until: values.validUntil ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    project_id: values.projectId ?? null,
    client_id: values.clientId,
    action: "devis.created",
    metadata: { title: values.title, number, total_centimes: totalCentimes },
  });

  revalidatePath("/devis");
  if (values.projectId) revalidatePath(`/projects/${values.projectId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateDevisAction(id: string, values: DevisFormValues): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { subtotalCentimes, tvaCentimes, totalCentimes } = computeTotals(values.items, values.tvaRate);

  const { error } = await supabase
    .from("devis")
    .update({
      client_id: values.clientId,
      project_id: values.projectId ?? null,
      title: values.title,
      items: values.items,
      tva_rate: values.tvaRate,
      subtotal_centimes: subtotalCentimes,
      tva_centimes: tvaCentimes,
      total_centimes: totalCentimes,
      notes: values.notes ?? null,
      valid_until: values.validUntil ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  return { ok: true, data: undefined };
}

export async function updateDevisStatusAction(
  id: string,
  status: "brouillon" | "envoye" | "accepte" | "refuse" | "expire"
): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("devis")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteDevisAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("devis")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/devis");
  return { ok: true, data: undefined };
}
