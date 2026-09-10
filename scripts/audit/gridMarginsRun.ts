/** Sharded runner for the grid-margin sensitivity audit. Read-only. */
import { buildScenarios, runVariant, VARIANTS, ISO_VARIANTS, type Variant } from "./gridMargins";

const shard = Number(process.argv[2] ?? 0);
const shards = Number(process.argv[3] ?? 1);
const mode = process.argv[4] ?? "main";
const set: Variant[] = mode === "iso" ? ISO_VARIANTS : VARIANTS;
const all = buildScenarios();
const out: unknown[] = [];
for (let i = shard; i < all.length; i += shards) {
  const s = all[i];
  const row: Record<string, unknown> = {
    id: s.id,
    family: s.family,
    market: s.market,
    load: s.loadKWh,
    pv: s.pvKWh,
    profile: s.profile,
    fuse: s.fuseA,
    strat: `${s.strategies.self ? "S" : "-"}${s.strategies.reduce ? "R" : "-"}${s.strategies.peak ? "P" : "-"}${s.strategies.fcr ? "F" : "-"}`,
  };
  for (const v of set) {
    try {
      row[v.key] = runVariant(s, v);
    } catch (e) {
      row[v.key] = { fail: ["THROW:" + ((e as Error)?.message ?? String(e))] };
    }
  }
  out.push(row);
}
await Bun.write(`/tmp/gm/${mode}-${shard}.json`, JSON.stringify(out));
console.log("shard", shard, mode, "done", out.length);
