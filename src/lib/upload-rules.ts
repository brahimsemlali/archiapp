export const IMAGE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const DOCUMENT_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.dwg,.dxf,.ifc,.rvt,.skp,.pln,.jpg,.jpeg,.png,.webp,.mp4,.mov";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;
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
const DOCUMENT_EXTENSION = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv|dwg|dxf|ifc|rvt|skp|pln|jpe?g|png|webp|mp4|mov)$/i;

export function isAllowedImageFile(file: File) {
  return IMAGE_MIME_TYPES.has(file.type) || IMAGE_EXTENSION.test(file.name);
}

export function isAllowedDocumentFile(file: File) {
  const mimeType = file.type || "application/octet-stream";
  const extensionAllowed = DOCUMENT_EXTENSION.test(file.name);
  if (mimeType === "application/octet-stream") return extensionAllowed;
  return DOCUMENT_MIME_TYPES.has(mimeType) || extensionAllowed;
}
