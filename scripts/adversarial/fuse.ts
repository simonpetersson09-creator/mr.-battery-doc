import { buildMatrix } from "./matrix";
import { buildInput } from "./harness";
import { runBatteryEngine } from "@/lib/battery-engine";
const m = buildMatrix().filter((s) => s.family === "mono-fuse-big");
for (const s of m.filter((x) => [200, 400].includes(x.fuseA))) {
  const res = runBatteryEngine(buildInput(s));
  const d = res.diagnostics as unknown as { sweep: { results: unknown[] } };
  console.log("=== fuse", s.fuseA, "chosen", JSON.stringify(res.summary.recommendation));
  for (const r of d.sweep.results) console.log("  ", JSON.stringify(r).slice(0, 400));
}
