"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { WORKSPACE_ADMIN_ROLES, requireWorkspaceRole } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { sendWelcomeEmailAction } from "@/lib/actions/auth";
import { dbError } from "@/lib/db-error";
import { COUNTRY_PACKS, SUPPORTED_CURRENCIES, getCountryPack } from "@/lib/country-packs";

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
  country?: string;
  currency?: string;
  defaultTaxRate?: number;
}

export async function updateFirmProfileAction(values: FirmProfileValues): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase, WORKSPACE_ADMIN_ROLES);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  const firmName = values.firmName?.trim() || null;
  const architectName = values.architectName?.trim() || null;
  const address = values.address?.trim() || null;
  const phone = values.phone?.trim() || null;
  const email = values.email?.trim() || null;
  const ice = values.ice?.trim() || null;
  const rc = values.rc?.trim() || null;
  const ifNumber = values.ifNumber?.trim() || null;
  const cnss = values.cnss?.trim() || null;
  const patente = values.patente?.trim() || null;
  const iban = values.iban?.trim() || null;

  // Localization (worldwide.md W1) — keys are only included when provided so
  // the upsert keeps working on databases that predate the localization migration
  const localizationFields: Record<string, string | number> = {};
  if (values.country !== undefined) {
    if (!(values.country in COUNTRY_PACKS)) return { ok: false, error: "Pays non reconnu." };
    localizationFields.country = values.country;
    // timezone follows the country pack until a dedicated control exists (W2)
    localizationFields.timezone = getCountryPack(values.country).timezone;
  }
  if (values.currency !== undefined) {
    if (!SUPPORTED_CURRENCIES.includes(values.currency)) return { ok: false, error: "Devise non prise en charge." };
    localizationFields.currency = values.currency;
  }
  if (values.defaultTaxRate !== undefined) {
    if (!Number.isFinite(values.defaultTaxRate) || values.defaultTaxRate < 0 || values.defaultTaxRate > 100) {
      return { ok: false, error: "Taux de taxe invalide (0–100)." };
    }
    localizationFields.default_tax_rate = values.defaultTaxRate;
  }

  // Check if this is the first time firm_name is being set (onboarding completion)
  const { data: existing } = await supabase
    .from("firm_profile")
    .select("firm_name")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const isOnboarding = !existing?.firm_name && !!firmName;

  const { error } = await supabase
    .from("firm_profile")
    .upsert({
      workspace_id: workspaceId,
      firm_name: firmName,
      architect_name: architectName,
      address,
      phone,
      email,
      ice,
      rc,
      if_number: ifNumber,
      cnss,
      patente,
      iban,
      ...localizationFields,
      updated_at: new Date().toISOString(),
    });

  if (error) return { ok: false, error: dbError(error) };

  if (isOnboarding) {
    // Send welcome email on first onboarding completion
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      void sendWelcomeEmailAction(user.email, architectName ?? undefined, workspaceId);
    }
  }

  if (firmName) {
    const serviceSupabase = await createServiceClient();
    await serviceSupabase
      .from("workspaces")
      .update({ name: firmName, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    action: "settings.firm_profile_updated",
    metadata: { firm_name: firmName },
  });

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export interface PortfolioValues {
  slug: string;
  enabled: boolean;
  tagline: string | null;
  specialties: string[] | null;
}

export async function updatePortfolioSettingsAction(values: PortfolioValues): Promise<Result<void>> {
  const supabase = await createClient();
  const context = await requireWorkspaceRole(supabase, WORKSPACE_ADMIN_ROLES);
  if (!context.ok) return { ok: false, error: context.error };
  const { workspaceId } = context.data;

  // Check slug uniqueness (excluding own workspace)
  if (values.slug) {
    const { data: existing } = await supabase
      .from("firm_profile")
      .select("workspace_id")
      .eq("slug", values.slug)
      .neq("workspace_id", workspaceId)
      .maybeSingle();
    if (existing) return { ok: false, error: "Cet identifiant est déjà utilisé. Choisissez-en un autre." };
  }

  const { error } = await supabase
    .from("firm_profile")
    .upsert({
      workspace_id: workspaceId,
      slug: values.slug || null,
      portfolio_enabled: values.enabled,
      portfolio_tagline: values.tagline,
      portfolio_specialties: values.specialties,
      updated_at: new Date().toISOString(),
    });

  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
