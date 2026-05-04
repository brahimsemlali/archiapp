"use server";

import { createClient } from "@/lib/supabase/server";
import { clientSchema, type ClientFormValues } from "@/lib/validators/client";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  return data?.id ?? null;
}

export async function createClientAction(values: ClientFormValues): Promise<Result<{ id: string }>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, workspace_id: workspaceId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    client_id: data.id,
    action: "client.created",
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/clients");
  return { ok: true, data: { id: data.id } };
}

export async function updateClientAction(id: string, values: ClientFormValues): Promise<Result<void>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("clients")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return { ok: true, data: undefined };
}

export async function archiveClientAction(id: string): Promise<Result<void>> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId(supabase);
  if (!workspaceId) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  return { ok: true, data: undefined };
}
