import "server-only";

import sharp from "sharp";
import { fetchPublicHttpUrl } from "@/lib/server/url-safety";

const FETCH_TIMEOUT_MS = 10_000;
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
} as const;

/**
 * Normalize a firm logo URL to a PNG data URI (preserves transparency), fetched over the
 * SSRF-safe path and transcoded with sharp.
 *
 * Why: @react-pdf/renderer can only decode JPG/PNG. A webp/avif logo passed straight to
 * <Image src={firm.logo_url}> does NOT crash — it renders a blank reserved box (logo missing,
 * surrounding layout pushed down). Returning a PNG data URI fixes that; returning null lets the
 * template omit the logo cleanly (no empty gap). Used by every PDF route that shows the firm logo.
 */
export async function normalizeLogo(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  let url: URL;
  try {
    url = new URL(logoUrl);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;

  try {
    const res = await fetchPublicHttpUrl(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    const out = await sharp(raw, { failOn: "none" })
      .rotate()
      .resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Return a copy of a firm object with `logo_url` replaced by a PDF-safe PNG data URI
 * (or null if it can't be normalized). Drop-in for any PDF route that passes `firm` to a
 * template doing `<Image src={firm.logo_url}>`.
 */
export async function withNormalizedLogo<T extends { logo_url?: string | null }>(
  firm: T | null | undefined
): Promise<T | null> {
  if (!firm) return null;
  const logo_url = await normalizeLogo(firm.logo_url);
  return { ...firm, logo_url };
}
