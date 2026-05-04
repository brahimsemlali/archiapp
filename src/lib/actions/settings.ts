"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";

export interface FirmProfileValues {
  firmName?: string;
  architectName?: string;
  address?: string;
  phone?: string;
  email?: string;
  ice?: string;
  rc?: string;
  ifNumber?: string;
  cnss?: string;
  patente?: string;
  iban?: string;
}

export async function updateFirmProfileAction(values: FirmProfileValues): Promise<Result<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) return { ok: false, error: "Espace de travail introuvable." };

  const { error } = await supabase
    .from("firm_profile")
    .upsert({
      workspace_id: workspace.id,
      firm_name: values.firmName,
      architect_name: values.architectName,
      address: values.address,
      phone: values.phone,
      email: values.email,
      ice: values.ice,
      rc: values.rc,
      if_number: values.ifNumber,
      cnss: values.cnss,
      patente: values.patente,
      iban: values.iban,
      updated_at: new Date().toISOString(),
    });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
