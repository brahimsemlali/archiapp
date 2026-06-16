import "server-only";

import type { Result } from "@/types";

// Only the fields the validators read. A browser `File` satisfies this, and so
// does the {name,type,size} metadata sent ahead of a direct-to-storage upload
// (signed-URL flow) — letting us validate server-side without the file bytes.
export type UploadFileMeta = { name: string; type: string; size: number };

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "rar",
  "txt",
  "csv",
  "dwg",
  "dxf",
  "ifc",
  "rvt",
  "skp",
  "pln",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "mp4",
  "mov",
]);

function normalizedMime(file: UploadFileMeta) {
  return (file.type || "application/octet-stream").toLowerCase().split(";")[0]!.trim();
}

function extensionFromName(name: string) {
  const clean = name.split("?")[0] ?? name;
  const ext = clean.includes(".") ? clean.split(".").pop() : "";
  return (ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function imageContentTypeFromExtension(extension: string) {
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

function validateBaseFile(file: UploadFileMeta, maxBytes: number, label: string): Result<void> {
  if (file.size <= 0) return { ok: false, error: `${label} vide ou invalide.` };
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    return { ok: false, error: `${label} trop volumineux (${maxMb} Mo max).` };
  }
  return { ok: true, data: undefined };
}

export function validateImageUpload(file: UploadFileMeta, maxBytes: number): Result<{ extension: string; contentType: string }> {
  const base = validateBaseFile(file, maxBytes, "Image");
  if (!base.ok) return base;

  const contentType = normalizedMime(file);
  const extension = extensionFromName(file.name);
  if (!IMAGE_MIME_TYPES.has(contentType) && !IMAGE_EXTENSIONS.has(extension)) {
    return { ok: false, error: "Format image requis : JPG, PNG ou WEBP." };
  }

  return {
    ok: true,
    data: {
      extension: extension === "jpeg" ? "jpg" : extension || (contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"),
      contentType: IMAGE_MIME_TYPES.has(contentType) ? contentType : imageContentTypeFromExtension(extension),
    },
  };
}

export function validateDocumentUpload(file: UploadFileMeta, maxBytes: number): Result<{ extension: string; contentType: string }> {
  const base = validateBaseFile(file, maxBytes, "Fichier");
  if (!base.ok) return base;

  const contentType = normalizedMime(file);
  const extension = extensionFromName(file.name);
  const extensionAllowed = DOCUMENT_EXTENSIONS.has(extension);
  const mimeAllowed = DOCUMENT_MIME_TYPES.has(contentType);
  if ((!mimeAllowed && !extensionAllowed) || (contentType === "application/octet-stream" && !extensionAllowed)) {
    return { ok: false, error: "Type de fichier non autorisé." };
  }

  return {
    ok: true,
    data: {
      extension: extension || "bin",
      contentType: DOCUMENT_MIME_TYPES.has(contentType) ? contentType : "application/octet-stream",
    },
  };
}

export function sanitizeStorageSegment(value: string | null | undefined, fallback = "files") {
  const sanitized = (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return sanitized || fallback;
}

export function buildSafeStorageFilename(originalName: string, extension: string) {
  const base = originalName.replace(/\.[^.]+$/, "");
  const safeBase = sanitizeStorageSegment(base, "upload").slice(0, 96);
  const safeExt = sanitizeStorageSegment(extension, "bin").toLowerCase();
  return `${safeBase}.${safeExt}`;
}
