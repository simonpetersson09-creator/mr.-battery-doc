/**
 * Generates Android launcher icons from the same source used by iOS.
 * Run after `cap add android` / `cap sync android` so Capacitor defaults
 * can never replace the branded launcher resources.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = join(root, "assets", "app-icon.png");
const resDir = join(root, "android", "app", "src", "main", "res");

if (!existsSync(sourcePath)) {
  console.error("[android-icon] assets/app-icon.png is missing.");
  process.exit(1);
}
if (!existsSync(resDir)) {
  console.error("[android-icon] Android project is missing. Run `bun run add:android` first.");
  process.exit(1);
}

const source = PNG.sync.read(readFileSync(sourcePath));
if (source.width !== source.height) {
  console.error("[android-icon] Source icon must be square.");
  process.exit(1);
}

const densities = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

const resize = (input, width, height) => {
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = ((y + 0.5) * input.height) / height - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(input.height - 1, y0 + 1);
    const fy = Math.max(0, sourceY - y0);
    for (let x = 0; x < width; x += 1) {
      const sourceX = ((x + 0.5) * input.width) / width - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(input.width - 1, x0 + 1);
      const fx = Math.max(0, sourceX - x0);
      const targetOffset = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = input.data[(y0 * input.width + x0) * 4 + channel] * (1 - fx)
          + input.data[(y0 * input.width + x1) * 4 + channel] * fx;
        const bottom = input.data[(y1 * input.width + x0) * 4 + channel] * (1 - fx)
          + input.data[(y1 * input.width + x1) * 4 + channel] * fx;
        output.data[targetOffset + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return output;
};

const circularCrop = (input) => {
  const radius = input.width / 2;
  const center = (input.width - 1) / 2;
  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const distance = Math.hypot(x - center, y - center);
      const alpha = Math.max(0, Math.min(1, radius + 0.5 - distance));
      input.data[(y * input.width + x) * 4 + 3] = Math.round(255 * alpha);
    }
  }
  return input;
};

const writePng = (path, image) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(image, { colorType: 6 }));
};

for (const [density, scale] of Object.entries(densities)) {
  const dir = join(resDir, `mipmap-${density}`);
  const legacySize = Math.round(48 * scale);
  const adaptiveSize = Math.round(108 * scale);
  writePng(join(dir, "ic_launcher.png"), resize(source, legacySize, legacySize));
  writePng(join(dir, "ic_launcher_round.png"), circularCrop(resize(source, legacySize, legacySize)));
  writePng(join(dir, "ic_launcher_foreground.png"), resize(source, adaptiveSize, adaptiveSize));
}

for (const obsolete of [
  join(resDir, "drawable", "ic_launcher_background.xml"),
  join(resDir, "drawable-v24", "ic_launcher_foreground.xml"),
]) {
  rmSync(obsolete, { force: true });
}

console.log("[android-icon] Android launcher icons updated from assets/app-icon.png");