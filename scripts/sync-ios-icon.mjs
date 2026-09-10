// Syncs the source app icon (assets/app-icon.png) into the iOS Xcode project.
// Runs automatically as part of `npm run build:native` and `npm run sync:ios`,
// so the App Store icon is always up to date before opening Xcode.
//
// To change the icon: replace assets/app-icon.png (square PNG) and run
// `npm run sync:ios`. No manual work in Xcode is needed.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "assets/app-icon.png";
const ICONSET_DIR = "ios/App/App/Assets.xcassets/AppIcon.appiconset";
const ICON_NAME = "AppIcon-512@2x.png";

if (!existsSync(SOURCE)) {
  console.warn(`[ios-icon] ${SOURCE} saknas – hoppar över ikonsynk.`);
  process.exit(0);
}
if (!existsSync("ios/App")) {
  console.warn("[ios-icon] ios/-projektet saknas – hoppar över ikonsynk.");
  process.exit(0);
}

mkdirSync(ICONSET_DIR, { recursive: true });
const target = join(ICONSET_DIR, ICON_NAME);

// Resize/flatten to a 1024x1024 opaque PNG. Prefer macOS `sips`, fall back to ImageMagick.
let done = false;
try {
  execFileSync("sips", ["-z", "1024", "1024", SOURCE, "--out", target], { stdio: "pipe" });
  done = true;
} catch {
  try {
    execFileSync(
      "magick",
      [SOURCE, "-resize", "1024x1024", "-background", "white", "-alpha", "remove", "-alpha", "off", target],
      { stdio: "pipe" },
    );
    done = true;
  } catch {
    /* fall through */
  }
}
if (!done) {
  // Last resort: copy as-is (must already be 1024x1024 PNG).
  copyFileSync(SOURCE, target);
  console.warn("[ios-icon] Varken sips eller magick hittades – kopierade källfilen som den är.");
}

writeFileSync(
  join(ICONSET_DIR, "Contents.json"),
  JSON.stringify(
    {
      images: [{ filename: ICON_NAME, idiom: "universal", platform: "ios", size: "1024x1024" }],
      info: { author: "xcode", version: 1 },
    },
    null,
    2,
  ) + "\n",
);

console.log(`[ios-icon] App-ikon uppdaterad från ${SOURCE} → ${ICONSET_DIR}`);
