/** READ-ONLY DATA VOLUME AUDIT. Counts real numeric values used by the model. */
import {
  FCR_D_UP_SE_2025,
  FCR_D_UP_FI_2025,
  FCR_SYMMETRIC_DE_2025,
  FCR_SYMMETRIC_DK1_2025,
  FCR_D_UP_DK2_2025,
} from "../../src/lib/lab/ancillary/prices";
import { LOAD_PROFILES, CUSTOMER_LOAD_PROFILES } from "../../src/lib/lab/loadProfiles";
import { SE_MARKET } from "../../src/lib/lab/ancillary/markets/se";
import { defaultConfig, DEFAULT_PV_MONTH_SHARE, DEFAULT_LOAD_MONTH_SHARE } from "../../src/lib/lab/defaults";

const series = [
  ["SE FCR-D upp 2025", FCR_D_UP_SE_2025],
  ["FI FCR-D upp 2025", FCR_D_UP_FI_2025],
  ["DE FCR symmetrisk 2025", FCR_SYMMETRIC_DE_2025],
  ["DK1 FCR symmetrisk 2025", FCR_SYMMETRIC_DK1_2025],
  ["DK2 FCR-D upp 2025", FCR_D_UP_DK2_2025],
] as const;

let priceTotal = 0;
console.log("=== A1. HISTORISKA FCR-PRISSERIER ===");
for (const [name, s] of series) {
  const v = (s as any).valuesEurPerMwPerHour ?? (s as any).values ?? [];
  const arr: number[] = Array.isArray(v) ? v : [];
  const bad = arr.filter((x) => !Number.isFinite(x)).length;
  priceTotal += arr.length;
  console.log(
    `${name.padEnd(26)} ${String(arr.length).padStart(6)} timvärden, ` +
      `ej finita: ${bad}, min ${Math.min(...arr).toFixed(2)}, max ${Math.max(...arr).toFixed(2)} EUR/MW/h`,
  );
}
console.log(`SUMMA prisdatapunkter: ${priceTotal}`);

console.log("\n=== A2. LASTPROFILER ===");
let profileTotal = 0;
for (const p of LOAD_PROFILES) {
  let n = p.monthShare.length + p.shape.weekday.length + p.shape.weekend.length;
  if (p.winterShape) n += p.winterShape.weekday.length + p.winterShape.weekend.length;
  if (p.summerShape) n += p.summerShape.weekday.length + p.summerShape.weekend.length;
  profileTotal += n;
  console.log(`${p.id.padEnd(20)} ${String(n).padStart(4)} värden (${p.audience})`);
}
console.log(
  `SUMMA profildatapunkter: ${profileTotal} (varav kundvalbara: ${CUSTOMER_LOAD_PROFILES.length} profiler)`,
);

console.log("\n=== A3. SOL- OCH KALENDERTABELLER ===");
console.log(`PV månadsandelar: ${DEFAULT_PV_MONTH_SHARE.length}`);
console.log(`Last månadsandelar (referens): ${DEFAULT_LOAD_MONTH_SHARE.length}`);

console.log("\n=== A4. MARKNADSREGLER ===");
const reqCount = SE_MARKET.services.reduce(
  (a, s) => a + Object.values(s.requirements).filter((v) => typeof v === "number").length + 1,
  0,
);
console.log(`FCR-D upp krav-/regelparametrar: ${reqCount}`);

console.log("\n=== A5. MODELLPARAMETRAR (defaultConfig) ===");
const cfg = defaultConfig() as any;
let params = 0;
const walk = (o: any) => {
  if (o == null) return;
  if (typeof o === "number") {
    params += 1;
    return;
  }
  if (Array.isArray(o)) {
    o.forEach(walk);
    return;
  }
  if (typeof o === "object") Object.values(o).forEach(walk);
};
walk(cfg);
console.log(`Numeriska modell-/nät-/batteri-/ekonomiparametrar: ${params}`);

console.log("\n=== SUMMA A ===");
const A = priceTotal + profileTotal + DEFAULT_PV_MONTH_SHARE.length + DEFAULT_LOAD_MONTH_SHARE.length + reqCount + params;
console.log(`Permanent modellunderlag: ${A} unika numeriska datapunkter`);
