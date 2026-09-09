import { checkScenario } from "./harness";
import { buildScenarios } from "./scenarios";
const shard = Number(process.argv[2] ?? 0);
const shards = Number(process.argv[3] ?? 1);
const all = buildScenarios();
const out: any[] = [];
for (let i = shard; i < all.length; i += shards) {
  try {
    out.push(checkScenario(all[i]));
  } catch (e: any) {
    out.push({ id: all[i].id, tag: all[i].tag, market: all[i].market, fail: ["THROW:" + (e?.message ?? e)] });
  }
}
await Bun.write(`/tmp/stress/out-${shard}.json`, JSON.stringify(out));
console.log("shard", shard, "done", out.length);
