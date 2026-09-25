/**
 * Android sync: same local SPA bundle as iOS (capacitor-www/), then cap sync android.
 * Does not touch the iOS project.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
execSync("node scripts/build-native.mjs", {
  stdio: "inherit",
  env: { ...process.env, SKIP_IOS_ICON_SYNC: "1" },
});
if (!existsSync("android")) execSync("npx cap add android", { stdio: "inherit" });
execSync("npx cap sync android", { stdio: "inherit" });
execSync("node scripts/sync-android-icon.mjs", { stdio: "inherit" });
