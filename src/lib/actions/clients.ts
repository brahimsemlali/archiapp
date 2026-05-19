"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/workspace";
import { clientSchema, type ClientFormValues } from "@/lib/validators/client";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { dbError } from "@/lib/db-error";

export interface ClientImportRow {
  name?: string;
  type?: string;
  phone?: string;
  email?: string;
  address?: string;
  ice?: string;
  cin?: string;
  notes?: string;
}

export interface ClientImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

function normalizeClientType(value?: string): "particulier" | "societe" {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (["societe", "société", "company", "entreprise", "sarl", "sa", "ste"].includes(normalized)) {
    return "societe";
  }
  return "particulier";
}

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

export async function createClientAction(values: ClientFormValues): Promise<Result<{ id: string }>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, workspace_id: workspaceId })
    .select("id")
    .single();

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    client_id: data.id,
    action: "client.created",
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/clients");
  return { ok: true, data: { id: data.id } };
}

export async function importClientsAction(rows: ClientImportRow[]): Promise<Result<ClientImportResult>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Aucune ligne à importer." };
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  const clientsToInsert: Array<ClientFormValues & { workspace_id: string }> = [];

  for (const [index, row] of rows.slice(0, 500).entries()) {
    const name = cleanOptional(row.name);
    if (!name) {
      errors.push(`Ligne ${index + 2}: nom manquant.`);
      continue;
    }

    const candidate: ClientFormValues = {
      name,
      type: normalizeClientType(row.type),
      phone: cleanOptional(row.phone),
      email: cleanOptional(row.email) ?? "",
      address: cleanOptional(row.address),
      ice: cleanOptional(row.ice),
      cin: cleanOptional(row.cin),
      notes: cleanOptional(row.notes),
    };

    const dedupeKey = [
      candidate.name.toLowerCase(),
      candidate.email?.toLowerCase() ?? "",
      candidate.phone ?? "",
    ].join("|");

    if (seen.has(dedupeKey)) {
      errors.push(`Ligne ${index + 2}: doublon dans le fichier.`);
      continue;
    }
    seen.add(dedupeKey);

    const parsed = clientSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push(`Ligne ${index + 2}: données invalides.`);
      continue;
    }

    clientsToInsert.push({ ...parsed.data, workspace_id: workspaceId });
  }

  if (clientsToInsert.length === 0) {
    return {
      ok: true,
      data: { inserted: 0, skipped: rows.length, errors: errors.slice(0, 20) },
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(clientsToInsert)
    .select("id, name");

  if (error) return { ok: false, error: dbError(error) };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "clients.imported",
    metadata: { count: data?.length ?? clientsToInsert.length },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: {
      inserted: data?.length ?? clientsToInsert.length,
      skipped: rows.length - clientsToInsert.length,
      errors: errors.slice(0, 20),
    },
  };
}

export async function updateClientAction(id: string, values: ClientFormValues): Promise<Result<void>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("clients")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return { ok: true, data: undefined };
}

export async function archiveClientAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: dbError(error) };

  revalidatePath("/clients");
  return { ok: true, data: undefined };
}
