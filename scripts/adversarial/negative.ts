/** Root-cause classification of negative customer benefit (read-only). */
import { auditRun } from "./harness";
import { buildMatrix } from "./matrix";

const shard = Number(process.argv[2] ?? 0);
const shards = Number(process.argv[3] ?? 1);
const all = buildMatrix();
const out: unknown[] = [];
for (let i = shard; i < all.length; i += shards) {
  const s = { ...all[i]!, noReplay: true, withAlternatives: false };
  try {
    const r = auditRun(s);
    if ((r.customerBenefit ?? 0) < 0 || (r.engineTotal ?? 0) < 0)
      out.push({
        id: r.id,
        family: r.family,
        market: r.market,
        load: r.load,
        pv: r.pv,
        fuse: r.fuse,
        profile: r.profile,
        strat: r.strat,
        demandCharge: r.demandCharge,
        cap: r.capKWh,
        kw: r.powKw,
        energy: Math.round(r.energyBenefit),
        peak: r.peakBenefit === null ? null : Math.round(r.peakBenefit),
        fcr: Math.round(r.fcrGross ?? 0),
        total: r.engineTotal === null ? null : Math.round(r.engineTotal),
        customer: r.customerBenefit === null ? null : Math.round(r.customerBenefit),
        unserved: Math.round(r.unserved),
        curtailed: Math.round(r.curtailed),
        peakBefore: r.peakBeforeKw,
        peakAfter: r.peakAfterKw,
      });
  } catch {
    /* ignore */
  }
}
await Bun.write(`/tmp/adv/neg-${shard}.json`, JSON.stringify(out));
console.log("shard", shard, "neg", out.length);
