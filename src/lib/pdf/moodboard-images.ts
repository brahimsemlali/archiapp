import "server-only";

import sharp from "sharp";
import type { createClient, createServiceClient } from "@/lib/supabase/server";
import type { InspirationItem } from "@/components/projects/inspiration-board";
import { fetchPublicHttpUrl } from "@/lib/server/url-safety";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient | typeof createServiceClient>>;

export interface NormalizedImage {
  id: string;
  caption?: string;
  source?: string;
  /** data:image/jpeg;base64,… — always JPEG, safe for @react-pdf/renderer */
  dataUri: string;
  width: number;
  height: number;
}

const STORAGE_BUCKET = "project-files";
const MAX_IMAGES = 48;
const MAX_DIMENSION = 900; // longest side, px — keeps the PDF send-friendly (WhatsApp/email)
const JPEG_QUALITY = 72;
const FETCH_TIMEOUT_MS = 10_000;
const CONCURRENCY = 6; // cap parallel fetch+transcode so a large board can't spike memory/network

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
} as const;

/** Get the raw image bytes for an item — uploaded files come from storage, links are fetched over HTTP. */
async function bytesForItem(
  supabase: SupabaseServerClient,
  item: InspirationItem
): Promise<Buffer | null> {
  // Uploaded image — pull bytes straight from storage (no signed-URL round-trip, never expires).
  if (item.path) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(item.path);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  // External link (Pinterest, Behance, direct image URL, …) — SSRF-safe fetch.
  if (!item.url) return null;
  let url: URL;
  try {
    url = new URL(item.url);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;

  const res = await fetchPublicHttpUrl(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/** Transcode any input (webp/avif/png/gif/…) to a JPEG data URI that @react-pdf can render. */
async function transcode(raw: Buffer): Promise<{ dataUri: string; width: number; height: number } | null> {
  try {
    const { data, info } = await sharp(raw, { failOn: "none" })
      .rotate() // honour EXIF orientation
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // drop alpha onto white so transparency doesn't render black
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    if (!info.width || !info.height) return null;
    return { dataUri: `data:image/jpeg;base64,${data.toString("base64")}`, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/**
 * Fetch + normalize every moodboard item into JPEG data URIs for PDF rendering.
 * Each item is isolated: one dead link or unsupported format is skipped, never fails the batch.
 */
async function normalizeOne(
  supabase: SupabaseServerClient,
  item: InspirationItem
): Promise<NormalizedImage | null> {
  try {
    const raw = await bytesForItem(supabase, item);
    if (!raw) return null;
    const out = await transcode(raw);
    if (!out) return null;
    return {
      id: item.id,
      caption: item.caption?.trim() || undefined,
      source: item.source?.trim() || undefined,
      ...out,
    };
  } catch {
    return null;
  }
}

export interface NormalizeResult {
  images: NormalizedImage[];
  /** how many items were attempted (within the cap) but couldn't be fetched/decoded */
  failed: number;
}

export async function normalizeMoodboardImages(
  supabase: SupabaseServerClient,
  items: InspirationItem[] | null | undefined
): Promise<NormalizeResult> {
  const sliced = (items ?? []).slice(0, MAX_IMAGES);
  const out: NormalizedImage[] = [];

  // Process in bounded batches so a large board doesn't open dozens of concurrent
  // fetches / sharp pipelines at once. Order is preserved within each batch.
  for (let i = 0; i < sliced.length; i += CONCURRENCY) {
    const batch = sliced.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(batch.map((item) => normalizeOne(supabase, item)));
    for (const img of settled) {
      if (img) out.push(img);
    }
  }

  return { images: out, failed: sliced.length - out.length };
}
