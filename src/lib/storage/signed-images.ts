import type { createClient, createServiceClient } from "@/lib/supabase/server";
import type { InspirationItem } from "@/components/projects/inspiration-board";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient | typeof createServiceClient>>;

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function signInspirationItems(
  supabase: SupabaseServerClient,
  items: InspirationItem[] | null | undefined,
  bucket = "project-files"
): Promise<InspirationItem[]> {
  if (!items?.length) return [];

  return Promise.all(
    items.map(async (item) => {
      if (!item.path) return item;

      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(item.path, DEFAULT_SIGNED_URL_TTL_SECONDS);

      return data?.signedUrl ? { ...item, url: data.signedUrl } : item;
    })
  );
}
