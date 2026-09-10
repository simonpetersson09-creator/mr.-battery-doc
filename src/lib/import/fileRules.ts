/**
 * Defensive file rules shared by the web file input and the native iOS pickers.
 *
 * Pure functions only — no DOM, no Capacitor — so the same rules apply on the web,
 * inside the iOS WebView and in tests. The extraction logic itself is untouched.
 */

/**
 * Client-side ceiling, matched to the import contract: the server schema accepts a
 * data URL of at most 25 000 000 characters (~18.6 MB of bytes), so 15 MB of file
 * bytes always fits after base64 expansion. Never send more than this.
 */
export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

/** Extensions the monthly import accepts, whatever picker produced the file. */
export const SUPPORTED_IMPORT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "heic",
  "heif",
  "webp",
  "csv",
  "txt",
  "tsv",
] as const;

/** `accept` attribute for the web file input and the iOS document picker. */
export const IMPORT_ACCEPT = "image/*,application/pdf,.csv,.txt,.tsv,.heic,.heif";

/** UTIs/MIME types handed to the iOS document picker. */
export const IMPORT_PICKER_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/heif",
  "image/webp",
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
];

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  csv: "text/csv",
  txt: "text/plain",
  tsv: "text/tab-separated-values",
};

export function extensionOf(fileName: string): string {
  const clean = fileName.split(/[?#]/)[0] ?? "";
  const dot = clean.lastIndexOf(".");
  return dot > -1 ? clean.slice(dot + 1).toLowerCase() : "";
}

/**
 * iOS often hands back an empty or generic MIME type for documents picked from
 * Files. Fall back to the extension instead of refusing a perfectly good PDF.
 */
export function resolveMimeType(fileName: string, mimeType?: string | null): string {
  const given = (mimeType ?? "").trim().toLowerCase();
  const generic = !given || given === "application/octet-stream" || given === "content/unknown";
  if (!generic) return given;
  return EXTENSION_MIME[extensionOf(fileName)] ?? "application/octet-stream";
}

export function isTextImport(fileName: string, mimeType?: string | null): boolean {
  const mime = resolveMimeType(fileName, mimeType);
  return /^text\//.test(mime) || mime === "text/csv" || ["csv", "txt", "tsv"].includes(extensionOf(fileName));
}

export function isHeic(fileName: string, mimeType?: string | null): boolean {
  const mime = resolveMimeType(fileName, mimeType);
  return /hei[cf]/.test(mime) || ["heic", "heif"].includes(extensionOf(fileName));
}

/** True when the import pipeline can actually do something with this file. */
export function isSupportedImport(fileName: string, mimeType?: string | null): boolean {
  const mime = resolveMimeType(fileName, mimeType);
  if (mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/")) return true;
  return (SUPPORTED_IMPORT_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

/** Byte length of base64 payload, without allocating the decoded bytes. */
export function base64ByteLength(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

export function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64.replace(/^data:[^,]*,/, "")}`;
}

export function base64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma > -1 ? dataUrl.slice(comma + 1) : dataUrl;
}

export type ImportRejection = "tooLarge" | "unsupportedType" | null;

/** One place that decides whether a picked file may be sent at all. */
export function rejectionFor(file: { name: string; mimeType?: string | null; size: number }): ImportRejection {
  if (!isSupportedImport(file.name, file.mimeType)) return "unsupportedType";
  if (file.size > MAX_IMPORT_BYTES) return "tooLarge";
  return null;
}
