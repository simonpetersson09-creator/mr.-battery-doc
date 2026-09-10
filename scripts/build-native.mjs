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
const src = join(root, "dist", "client");
const out = join(root, "capacitor-www");

execSync("vite build", { cwd: root, stdio: "inherit", env: { ...process.env, CAPACITOR_BUILD: "1" } });

if (!existsSync(join(src, "index.html"))) {
  console.error("[build:native] FAILED: dist/client/index.html was not produced by the SPA build.");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src, out, { recursive: true });

const assets = join(out, "assets");
const files = existsSync(assets) ? readdirSync(assets) : [];
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
if (js.length === 0 || css.length === 0) {
  console.error("[build:native] FAILED: local JS/CSS assets missing in capacitor-www/assets.");
  process.exit(1);
}
const size = readdirSync(out, { recursive: true }).reduce((n, f) => {
  const p = join(out, String(f));
  return statSync(p).isFile() ? n + statSync(p).size : n;
}, 0);
console.log(
  `[build:native] OK -> capacitor-www (index.html + ${js.length} js, ${css.length} css, ${(size / 1e6).toFixed(1)} MB total)`,
);
