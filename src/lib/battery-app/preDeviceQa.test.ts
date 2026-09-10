/**
 * PRE-DEVICE QA regressions.
 *
 * 1. Product power cap: the physical need may exceed 200 kW, the recommended PRODUCT
 *    level may not.
 * 2. HEIC: a picture that cannot be converted to JPEG is never uploaded raw.
 * 3. Native picker: permission/cancel/unavailable states come from structured signals.
 * 4. CORS: production allowlist has no http://localhost.
 */

import { describe, expect, it, vi } from "vitest";
import {
  buildPowerCandidates,
  maxProductStepKw,
} from "@/lib/lab/economicPowerSizing";
import { buildWithoutFcrCandidates } from "@/lib/battery-app/withoutFcrOptimum";
import { ImageConversionError, prepareImageUpload } from "@/lib/import/prepareUpload";
import {
  classifyPickerError,
  outcomeForPermission,
  pluginErrorCode,
  takePhoto,
  type CameraLike,
} from "@/lib/import/nativePicker";
import {
  allowedImportOrigins,
  isAllowedImportOrigin,
} from "@/lib/import/corsOrigins";

const STEPS = [2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200];

describe("200 kW product cap", () => {
  it("knows the largest purchasable product level", () => {
    expect(maxProductStepKw(STEPS)).toBe(200);
  });

  it("never proposes a product level above 200 kW, even at 500 kWh / 0.5 C", () => {
    const candidates = buildPowerCandidates(500, 200, STEPS, 0.5);
    expect(Math.max(...candidates)).toBe(200);
    expect(candidates).not.toContain(250);
  });

  it("keeps the C-rate ceiling as a candidate while it stays inside the product range", () => {
    // 25 kWh * 0.5 C = 12.5 kW — unchanged behaviour below the cap.
    expect(buildPowerCandidates(25, 5, STEPS, 0.5)).toEqual([5, 7.5, 10, 12.5]);
  });

  it("caps the FCR-off counterfactual candidates the same way", () => {
    const candidates = buildWithoutFcrCandidates(500, 250, 200, STEPS, 0.5);
    expect(Math.max(...candidates)).toBe(200);
  });
});

describe("HEIC conversion", () => {
  it("aborts instead of uploading a raw HEIC when it cannot be decoded", async () => {
    await expect(
      prepareImageUpload("data:image/heic;base64,AAAA", "image/heic", "IMG_1.HEIC"),
    ).rejects.toBeInstanceOf(ImageConversionError);
  });

  it("leaves a non-image payload untouched", async () => {
    await expect(prepareImageUpload("data:application/pdf;base64,AA", "application/pdf", "a.pdf")).resolves.toEqual({
      dataUrl: "data:application/pdf;base64,AA",
      mimeType: "application/pdf",
    });
  });
});

describe("native picker permissions", () => {
  it("prefers structured permission state over error text", async () => {
    const camera: CameraLike = {
      getPhoto: vi.fn(),
      checkPermissions: async () => ({ camera: "denied" }),
    };
    await expect(takePhoto({ camera })).resolves.toEqual({ status: "denied" });
    expect(camera.getPhoto).not.toHaveBeenCalled();
  });

  it("maps restricted permission to its own outcome", async () => {
    const camera: CameraLike = {
      getPhoto: vi.fn(),
      checkPermissions: async () => ({ camera: "restricted" }),
    };
    await expect(takePhoto({ camera })).resolves.toEqual({ status: "restricted" });
  });

  it("proceeds when permission is granted or limited", () => {
    expect(outcomeForPermission("granted")).toBeNull();
    expect(outcomeForPermission("limited")).toBeNull();
    expect(outcomeForPermission(undefined)).toBeNull();
  });

  it("reads structured plugin error codes", () => {
    expect(pluginErrorCode({ code: "UNIMPLEMENTED" })).toBe("UNIMPLEMENTED");
    expect(classifyPickerError({ code: "OS-PLUGIN-CANCELED" })).toEqual({ status: "cancelled" });
    expect(classifyPickerError({ code: "PERMISSION_DENIED" })).toEqual({ status: "denied" });
    expect(classifyPickerError({ code: "RESTRICTED" })).toEqual({ status: "restricted" });
    expect(classifyPickerError({ code: "UNAVAILABLE" })).toEqual({ status: "unsupported" });
  });

  it("still classifies plain english messages defensively", () => {
    expect(classifyPickerError(new Error("User cancelled photos app"))).toEqual({ status: "cancelled" });
    expect(classifyPickerError(new Error("User denied access to photos"))).toEqual({ status: "denied" });
  });

  it("falls back to a generic error for an unknown native failure", () => {
    expect(classifyPickerError(new Error("something odd happened"))).toEqual({ status: "error" });
    expect(classifyPickerError(null)).toEqual({ status: "error" });
  });

  it("reports an unavailable plugin instead of throwing", async () => {
    await expect(takePhoto({ camera: null })).resolves.toEqual({ status: "unsupported" });
  });
});

describe("import CORS allowlist", () => {
  it("allows the published web app in production", () => {
    expect(isAllowedImportOrigin("https://battery-buddy-wizard.lovable.app", false)).toBe(true);
  });

  it("allows the native Capacitor origin in production", () => {
    expect(isAllowedImportOrigin("capacitor://localhost", false)).toBe(true);
  });

  it("rejects a random origin", () => {
    expect(isAllowedImportOrigin("https://evil.example.com", false)).toBe(false);
  });

  it("allows http://localhost in development only", () => {
    expect(isAllowedImportOrigin("http://localhost", true)).toBe(true);
    expect(isAllowedImportOrigin("http://localhost", false)).toBe(false);
    expect(allowedImportOrigins(false)).not.toContain("http://localhost");
  });
});
