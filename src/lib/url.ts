export function normalizeExternalUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function displayExternalUrl(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
