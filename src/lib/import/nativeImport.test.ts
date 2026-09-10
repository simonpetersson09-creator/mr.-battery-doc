/**
 * Native camera / photo / file import.
 *
 * Covers the picker outcomes, the defensive file rules, HEIC handling, transport
 * routing (native public endpoint vs. web same-origin) and the iOS permission
 * configuration. The extraction logic itself is not touched by these tests.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  IMPORT_ACCEPT,
  MAX_IMPORT_BYTES,
  base64ByteLength,
  isHeic,
  isSupportedImport,
  isTextImport,
  rejectionFor,
  resolveMimeType,
} from "./fileRules";
import {
  classifyPickerError,
  documentFromBase64,
  pickFile,
  pickFrom,
  pickPhoto,
  takePhoto,
  type CameraLike,
  type FilePickerLike,
} from "./nativePicker";
import { prepareImageUpload, textFromDataUrl } from "./prepareUpload";

const b64 = (bytes: number) => Buffer.alloc(bytes, 1).toString("base64");

function camera(impl: () => Promise<{ base64String?: string }>): CameraLike {
  return { getPhoto: impl };
}
function files(impl: () => Promise<{ files: Array<Record<string, unknown>> }>): FilePickerLike {
  return { pickFiles: impl as FilePickerLike["pickFiles"] };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("cancelling never breaks the form", () => {
  it("camera cancelled", async () => {
    const out = await takePhoto({ camera: camera(async () => { throw new Error("User cancelled photos app"); }) });
    expect(out).toEqual({ status: "cancelled" });
  });

  it("photo picker cancelled", async () => {
    const out = await pickPhoto({ camera: camera(async () => ({})) });
    expect(out).toEqual({ status: "cancelled" });
  });

  it("file picker cancelled", async () => {
    expect(await pickFile({ files: files(async () => { throw new Error("pickFiles canceled."); }) }))
      .toEqual({ status: "cancelled" });
    expect(await pickFile({ files: files(async () => ({ files: [] })) })).toEqual({ status: "cancelled" });
  });

  it("camera permission denied is reported, not thrown", async () => {
    const out = await takePhoto({
      camera: camera(async () => { throw new Error("User denied access to camera"); }),
    });
    expect(out).toEqual({ status: "denied" });
  });

  it("a missing plugin degrades gracefully", async () => {
    expect(await pickFrom("camera", { camera: null })).toEqual({ status: "unsupported" });
    expect(await pickFrom("files", { files: null })).toEqual({ status: "unsupported" });
  });
});

describe("picked files", () => {
  it("accepts a camera JPEG", async () => {
    const out = await takePhoto({ camera: camera(async () => ({ base64String: b64(1024) })) });
    expect(out.status).toBe("picked");
    if (out.status !== "picked") return;
    expect(out.file.mimeType).toBe("image/jpeg");
    expect(out.file.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(out.file.name.endsWith(".jpg")).toBe(true);
  });

  it("accepts a PNG, a PDF and a HEIC from the document picker", async () => {
    for (const [name, mime] of [
      ["skarmbild.png", "image/png"],
      ["elfaktura.pdf", "application/pdf"],
      ["IMG_1234.HEIC", "image/heic"],
    ]) {
      const out = await pickFile({
        files: files(async () => ({ files: [{ name, mimeType: mime, data: b64(2048) }] })),
      });
      expect(out.status, name).toBe("picked");
      if (out.status !== "picked") continue;
      expect(out.file.mimeType).toBe(mime);
    }
  });

  it("falls back to the extension when iOS reports no MIME type", async () => {
    const out = await pickFile({
      files: files(async () => ({ files: [{ name: "elfaktura.pdf", mimeType: "", data: b64(64) }] })),
    });
    expect(out.status === "picked" && out.file.mimeType).toBe("application/pdf");
    expect(resolveMimeType("bild.HEIC", "application/octet-stream")).toBe("image/heic");
  });

  it("rejects an unsupported type before anything is uploaded", async () => {
    const out = await pickFile({
      files: files(async () => ({ files: [{ name: "arkiv.zip", mimeType: "application/zip", data: b64(64) }] })),
    });
    expect(out).toEqual({ status: "unsupportedType" });
  });

  it("rejects an oversized file with the same limit the backend uses", () => {
    expect(MAX_IMPORT_BYTES).toBe(15 * 1024 * 1024);
    expect(rejectionFor({ name: "stor.jpg", mimeType: "image/jpeg", size: MAX_IMPORT_BYTES + 1 })).toBe("tooLarge");
    expect(rejectionFor({ name: "ok.jpg", mimeType: "image/jpeg", size: MAX_IMPORT_BYTES })).toBeNull();
    expect(documentFromBase64("stor.jpg", "image/jpeg", b64(MAX_IMPORT_BYTES + 10))).toEqual({ status: "tooLarge" });
    expect(base64ByteLength(b64(1000))).toBe(1000);
  });

  it("keeps every currently supported format", () => {
    for (const name of ["a.pdf", "a.png", "a.jpg", "a.jpeg", "a.heic", "a.webp", "a.csv", "a.txt", "a.tsv"]) {
      expect(isSupportedImport(name, ""), name).toBe(true);
    }
    expect(isSupportedImport("a.exe", "application/octet-stream")).toBe(false);
    expect(isTextImport("data.csv", "")).toBe(true);
    expect(isTextImport("foto.jpg", "image/jpeg")).toBe(false);
    expect(IMPORT_ACCEPT).toContain("application/pdf");
  });
});

describe("HEIC", () => {
  it("is recognised however iOS labels it", () => {
    expect(isHeic("IMG_1.HEIC", "")).toBe(true);
    expect(isHeic("x", "image/heif")).toBe(true);
    expect(isHeic("x.png", "image/png")).toBe(false);
  });

  it("is passed through unchanged when no decoder is available", async () => {
    const url = "data:image/heic;base64,AAAA";
    expect(await prepareImageUpload(url, "image/heic", "IMG_1.HEIC")).toEqual({
      dataUrl: url,
      mimeType: "image/heic",
    });
  });

  it("camera and photo library return JPEG, so HEIC never reaches the backend from there", async () => {
    const out = await pickPhoto({ camera: camera(async () => ({ base64String: b64(32) })) });
    expect(out.status === "picked" && out.file.mimeType).toBe("image/jpeg");
  });

  it("decodes a text document that arrived as base64", () => {
    const csv = "Jan;100\nFeb;90";
    expect(textFromDataUrl(`data:text/csv;base64,${Buffer.from(csv).toString("base64")}`)).toBe(csv);
  });
});

describe("transport", () => {
  const input = { dataUrl: "data:image/jpeg;base64,AAA", mimeType: "image/jpeg", fileName: "a.jpg" };

  async function nativeTransport(url = "https://battery-buddy-wizard.lovable.app") {
    vi.stubEnv("VITE_NATIVE_BACKEND_URL", url);
    (globalThis as { window?: unknown }).window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } };
    vi.resetModules();
    return (await import("./extractMonthlyTransport")).extractMonthlyDocument;
  }

  it("native posts to the published public endpoint", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: unknown) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ series: [], selfConsumptionPct: null, notes: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const send = await nativeTransport();
    await send(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls[0]).toBe(
      "https://battery-buddy-wizard.lovable.app/api/public/extract-monthly",
    );
  });

  it("native backend errors become a friendly failure, never a throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const send = await nativeTransport();
    const res = await send(input);
    expect(res.series).toEqual([]);
    expect(res.errorCode).toBe("unreadable");
  });

  it("a network timeout or abort is handled the same way", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("The operation was aborted"); }));
    const send = await nativeTransport();
    await expect(send(input)).resolves.toMatchObject({ errorCode: "unreadable", series: [] });
  });

  it("native without a configured backend fails politely", async () => {
    const send = await nativeTransport("");
    await expect(send(input)).resolves.toMatchObject({ errorCode: "notConfigured" });
  });

  it("the web keeps the same-origin server function and never calls the public endpoint", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    vi.doMock("./extractMonthly.functions", () => ({
      extractMonthlyFromDocument: vi.fn(async () => ({ series: [], selfConsumptionPct: null, notes: [] })),
    }));
    const { extractMonthlyDocument } = await import("./extractMonthlyTransport");
    const res = await extractMonthlyDocument(input);
    expect(res.series).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.doUnmock("./extractMonthly.functions");
  });

  it("classifies picker errors without leaking raw plugin text", () => {
    expect(classifyPickerError(new Error("Unimplemented"))).toEqual({ status: "unsupported" });
    expect(classifyPickerError(new Error("something odd"))).toEqual({ status: "error" });
  });
});

describe("iOS configuration", () => {
  const plist = readFileSync("ios/App/App/Info.plist", "utf8");

  it("declares the camera and photo library usage descriptions", () => {
    expect(plist).toContain("NSCameraUsageDescription");
    expect(plist).toContain("NSPhotoLibraryUsageDescription");
    expect(/<key>NSCameraUsageDescription<\/key>\s*<string>.{30,}<\/string>/s.test(plist)).toBe(true);
  });

  it("asks for no microphone and no extra permissions", () => {
    expect(plist).not.toContain("NSMicrophoneUsageDescription");
    expect(plist).not.toContain("NSPhotoLibraryAddUsageDescription");
    expect(plist).not.toContain("NSLocationWhenInUseUsageDescription");
  });

  it("keeps the app locally bundled with only an API backend", () => {
    const config = readFileSync("capacitor.config.ts", "utf8");
    expect(config).toContain("capacitor-www");
    expect(/server\s*:\s*\{[^}]*url/.test(config)).toBe(false);
    const build = readFileSync("scripts/build-native.mjs", "utf8");
    expect(build).toContain("VITE_NATIVE_BACKEND_URL");
    expect(build).toContain("https://battery-buddy-wizard.lovable.app");
  });

  it("bundles the native pickers", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["@capacitor/camera"]).toBeTruthy();
    expect(pkg.dependencies["@capawesome/capacitor-file-picker"]).toBeTruthy();
  });
});
