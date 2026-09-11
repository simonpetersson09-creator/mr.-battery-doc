/**
 * Native (Capacitor) production build.
 *
 * source -> CAPACITOR_BUILD=1 vite build (static SPA) -> capacitor-www/
 *
 * capacitor-www/ is the ONLY directory Capacitor packages (see capacitor.config.ts).
 * Keeping it separate from dist/client guarantees a plain SSR web build can never
 * be shipped into the iOS app by accident, and the guard below fails the build if
 * the local bundle is incomplete instead of silently shipping a broken app.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "capacitor-www");

/**
 * Where the static SPA build lands depends on the Vite/TanStack Start/Nitro versions in
 * use: older setups wrote dist/client, newer ones write .output/public. Instead of
 * hardcoding one of them, probe the known output directories and pick the first that
 * actually contains a complete static bundle (index.html + an assets directory).
 */
const CANDIDATE_DIRS = [
  join(root, "dist", "client"),
  join(root, ".output", "public"),
  join(root, "dist", "public"),
  join(root, "dist"),
];

const isStaticBundle = (dir) =>
  existsSync(join(dir, "index.html")) && existsSync(join(dir, "assets"));

/**
 * Backend base URL for the few native API calls that need a server (AI import).
 * This is NOT the app's start URL and is never used as Capacitor `server.url` —
 * the frontend always runs from the locally bundled capacitor-www/.
 * Override with VITE_NATIVE_BACKEND_URL=... bun run build:native
 */
const NATIVE_BACKEND_URL = process.env["VITE_NATIVE_BACKEND_URL"] || "https://battery-buddy-wizard.lovable.app";

execSync("vite build", { cwd: root, stdio: "inherit", env: { ...process.env, CAPACITOR_BUILD: "1", VITE_NATIVE_BACKEND_URL: NATIVE_BACKEND_URL } });

const src = CANDIDATE_DIRS.find(isStaticBundle);
if (!src) {
  console.error(
    "[build:native] FAILED: no static SPA bundle (index.html + assets/) was produced.\n" +
      "  Searched:\n" +
      CANDIDATE_DIRS.map((d) => `    - ${d.replace(root + "/", "")}`).join("\n"),
  );
  process.exit(1);
}
console.log(`[build:native] static SPA output: ${src.replace(root + "/", "")}`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src, out, { recursive: true });

const assets = join(out, "assets");
const files = existsSync(assets) ? readdirSync(assets) : [];
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
if (js.length === 0 || css.length === 0) {
  console.error(
    `[build:native] FAILED: local JS/CSS assets missing in capacitor-www/assets (copied from ${src.replace(root + "/", "")}).`,
  );
  process.exit(1);
}
const size = readdirSync(out, { recursive: true }).reduce((n, f) => {
  const p = join(out, String(f));
  return statSync(p).isFile() ? n + statSync(p).size : n;
}, 0);
console.log(`[build:native] native backend for API calls: ${NATIVE_BACKEND_URL}`);
console.log(
  `[build:native] OK -> capacitor-www (index.html + ${js.length} js, ${css.length} css, ${(size / 1e6).toFixed(1)} MB total)`,
);

// Sync the app icon into the Xcode project on every native build/sync.
try {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, ["scripts/sync-ios-icon.mjs"], { stdio: "inherit" });
} catch (e) {
  console.warn("[build:native] icon sync skipped:", e?.message ?? e);
}
