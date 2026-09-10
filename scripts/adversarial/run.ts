/** Sharded adversarial audit runner. Read-only. */
import { auditRun } from "./harness";
import { buildMatrix } from "./matrix";

const shard = Number(process.argv[2] ?? 0);
const shards = Number(process.argv[3] ?? 1);
const all = buildMatrix();
const out: unknown[] = [];
for (let i = shard; i < all.length; i += shards) {
  try {
    out.push(auditRun(all[i]));
  } catch (e) {
    out.push({
      id: all[i].id,
      family: all[i].family,
      market: all[i].market,
      load: all[i].loadKWh,
      pv: all[i].pvKWh,
      fuse: all[i].fuseA,
      profile: all[i].profile,
      fail: ["THROW:" + ((e as Error)?.message ?? String(e))],
      flags: [],
    });
  }
}
await Bun.write(`/tmp/adv/out-${shard}.json`, JSON.stringify(out));
console.log("shard", shard, "done", out.length);
