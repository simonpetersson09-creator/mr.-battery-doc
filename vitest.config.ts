import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Battery Engine runs simulate 8760 hours per candidate, so a single case can take
 * several seconds under parallel load. Only the timeout is configured here — no engine
 * behaviour is affected.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
