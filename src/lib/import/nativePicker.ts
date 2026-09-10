/**
 * Native iOS pickers for the monthly import: camera, photo library and Files.
 *
 * The plugins are imported dynamically and only inside the native WebView, so the
 * browser bundle keeps working exactly as before. Every picker returns the same
 * normalised result, and every failure mode (cancel, denied permission, oversized
 * file, unsupported type) comes back as a value — never as a thrown error — so the
 * calling form can keep its data and reset its loading state.
 */

import { isNativePlatform } from "@/lib/platform/runtime";
import {
  IMPORT_PICKER_TYPES,
  base64ByteLength,
  rejectionFor,
  resolveMimeType,
  toDataUrl,
} from "./fileRules";

export interface PickedDocument {
  name: string;
  mimeType: string;
  /** data:<mime>;base64,<data> — the only representation ever sent to the backend. */
  dataUrl: string;
  size: number;
}

export type PickOutcome =
  | { status: "picked"; file: PickedDocument }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "tooLarge" }
  | { status: "unsupportedType" }
  | { status: "error" };

export type PickerSource = "camera" | "photos" | "files";

/** Minimal shape of @capacitor/camera we depend on. */
export interface CameraLike {
  getPhoto(options: Record<string, unknown>): Promise<{ base64String?: string; format?: string }>;
}

/** Minimal shape of @capawesome/capacitor-file-picker we depend on. */
export interface FilePickerLike {
  pickFiles(options: Record<string, unknown>): Promise<{
    files: Array<{ name?: string; mimeType?: string; size?: number; data?: string }>;
  }>;
}

export interface PickerAdapters {
  camera?: CameraLike | null;
  files?: FilePickerLike | null;
}

/**
 * Maps a plugin rejection to an outcome. iOS reports a user cancel and a denied
 * permission as ordinary errors, and both must stay silent-but-handled.
 */
export function classifyPickerError(error: unknown): PickOutcome {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (/cancel/.test(message)) return { status: "cancelled" };
  if (/(denied|permission|not authorized|unauthorized|restricted|access to)/.test(message)) {
    return { status: "denied" };
  }
  if (/(unimplemented|not implemented|unavailable)/.test(message)) return { status: "unsupported" };
  return { status: "error" };
}

/** Wraps base64 plugin output in the shared size/type rules. */
export function documentFromBase64(
  name: string,
  mimeType: string | undefined | null,
  base64: string | undefined | null,
): PickOutcome {
  if (!base64) return { status: "cancelled" };
  const mime = resolveMimeType(name, mimeType);
  const size = base64ByteLength(base64);
  const rejection = rejectionFor({ name, mimeType: mime, size });
  if (rejection) return { status: rejection };
  return { status: "picked", file: { name, mimeType: mime, dataUrl: toDataUrl(mime, base64), size } };
}

async function loadCamera(): Promise<CameraLike | null> {
  try {
    const mod = await import("@capacitor/camera");
    return mod.Camera as unknown as CameraLike;
  } catch {
    return null;
  }
}

async function loadFilePicker(): Promise<FilePickerLike | null> {
  try {
    const mod = await import("@capawesome/capacitor-file-picker");
    return mod.FilePicker as unknown as FilePickerLike;
  } catch {
    return null;
  }
}

/** True when the three native buttons should replace the plain file input. */
export function nativePickersAvailable(): boolean {
  return isNativePlatform();
}

function photoName(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix}-${stamp}.jpg`;
}

/**
 * Camera and photo library both go through @capacitor/camera, which re-encodes the
 * picture to JPEG natively. That converts iPhone HEIC for us and drops the original
 * EXIF/GPS metadata, so no location data ever leaves the device.
 */
async function photo(source: "CAMERA" | "PHOTOS", adapters?: PickerAdapters): Promise<PickOutcome> {
  const camera = adapters?.camera !== undefined ? adapters.camera : await loadCamera();
  if (!camera) return { status: "unsupported" };
  try {
    const result = await camera.getPhoto({
      source,
      resultType: "base64",
      format: "jpeg",
      quality: 88,
      // Long edge cap: keeps invoice/table text readable while staying well
      // under the upload limit.
      width: 1800,
      correctOrientation: true,
      saveToGallery: false,
      allowEditing: false,
      promptLabelHeader: "",
    });
    return documentFromBase64(
      photoName(source === "CAMERA" ? "foto" : "bild"),
      "image/jpeg",
      result.base64String,
    );
  } catch (error) {
    return classifyPickerError(error);
  }
}

export function takePhoto(adapters?: PickerAdapters): Promise<PickOutcome> {
  return photo("CAMERA", adapters);
}

export function pickPhoto(adapters?: PickerAdapters): Promise<PickOutcome> {
  return photo("PHOTOS", adapters);
}

/** iOS document picker (Files) — PDFs and the other supported document types. */
export async function pickFile(adapters?: PickerAdapters): Promise<PickOutcome> {
  const picker = adapters?.files !== undefined ? adapters.files : await loadFilePicker();
  if (!picker) return { status: "unsupported" };
  try {
    const result = await picker.pickFiles({
      types: IMPORT_PICKER_TYPES,
      limit: 1,
      readData: true,
    });
    const file = result.files?.[0];
    if (!file) return { status: "cancelled" };
    return documentFromBase64(file.name ?? "underlag", file.mimeType, file.data);
  } catch (error) {
    return classifyPickerError(error);
  }
}

export function pickFrom(source: PickerSource, adapters?: PickerAdapters): Promise<PickOutcome> {
  if (source === "camera") return takePhoto(adapters);
  if (source === "photos") return pickPhoto(adapters);
  return pickFile(adapters);
}
