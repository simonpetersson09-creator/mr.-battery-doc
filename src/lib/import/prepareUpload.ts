/**
 * Prepares a picked file for the extraction backend.
 *
 * Images are downscaled to a readable-but-cheap size and re-encoded to JPEG when
 * needed. The re-encode also drops EXIF/GPS metadata, so nothing about where a
 * photo was taken is uploaded. Non-images (PDF, text) pass through untouched.
 */

import { base64FromDataUrl, isHeic } from "./fileRules";

/** Longest edge sent to the reader — plenty for table text, far cheaper to send. */
export const MAX_IMAGE_EDGE = 1800;

export interface UploadPayload {
  dataUrl: string;
  mimeType: string;
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read"));
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

/**
 * Downscales/normalises an image data URL. Returns the input unchanged when it is
 * not an image, when the browser cannot decode it (e.g. HEIC on a platform without
 * a HEIC decoder) or when it is already small enough — the backend accepts HEIC,
 * so a failed conversion must never block the import.
 */
export async function prepareImageUpload(dataUrl: string, mimeType: string, fileName = ""): Promise<UploadPayload> {
  const isImage = mimeType.startsWith("image/") || isHeic(fileName, mimeType);
  if (!isImage || typeof document === "undefined") return { dataUrl, mimeType };
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = dataUrl;
    });
    const longest = Math.max(img.width, img.height);
    const needsConversion = isHeic(fileName, mimeType);
    if (longest <= MAX_IMAGE_EDGE && !needsConversion) return { dataUrl, mimeType };
    const scale = Math.min(1, MAX_IMAGE_EDGE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { dataUrl, mimeType };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Quality 0.9 keeps invoice and screenshot text legible.
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), mimeType: "image/jpeg" };
  } catch {
    return { dataUrl, mimeType };
  }
}

/** Convenience for the web file input, which still hands us a File. */
export async function prepareFileUpload(file: File): Promise<UploadPayload> {
  const mimeType = file.type || "image/jpeg";
  const dataUrl = await readAsDataUrl(file);
  return prepareImageUpload(dataUrl, mimeType, file.name);
}

/** Decodes a text document that arrived as base64 (native pickers). */
export function textFromDataUrl(dataUrl: string): string {
  const base64 = base64FromDataUrl(dataUrl);
  if (typeof atob !== "function") return "";
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
