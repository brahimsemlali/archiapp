import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLocalization, type WorkspaceLocalization } from "@/lib/country-packs";

/**
 * Server-side: fetch a workspace's localization (currency, tax, timezone).
 * Selects * so it works whether or not the worldwide_localization migration
 * has run — missing columns simply resolve to the Morocco-pack defaults.
 * If the caller already holds the firm_profile row, use resolveLocalization
 * from country-packs directly instead of re-querying.
 */
export async function getWorkspaceLocalization(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceLocalization> {
  const { data } = await supabase
    .from("firm_profile")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return resolveLocalization(data);
}
