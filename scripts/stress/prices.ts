/** Read-only verification of every reserve price dataset and its time axis. */
import {
  FCR_D_UP_SE_2025,
  FCR_D_UP_FI_2025,
  FCR_SYMMETRIC_DE_2025,
  FCR_SYMMETRIC_DK1_2025,
  FCR_D_UP_DK2_2025,
} from "@/lib/lab/ancillary/prices";

const SETS = {
  SE: FCR_D_UP_SE_2025,
  FI: FCR_D_UP_FI_2025,
  DE: FCR_SYMMETRIC_DE_2025,
  DK1: FCR_SYMMETRIC_DK1_2025,
  DK2: FCR_D_UP_DK2_2025,
} as const;

for (const [area, s] of Object.entries(SETS)) {
  const p = s.pricesEurPerMw;
  const n = p.length;
  const finite = p.every((v) => Number.isFinite(v));
  const neg = p.filter((v) => v < 0).length;
  const mean = p.reduce((a, b) => a + b, 0) / n;
  const sorted = [...p].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  // DST audit: the engine hour index is a plain chronological 8760 axis starting at the
  // dataset's first timestamp. Verify the declared span matches 8760 UTC hours.
  const from = new Date(s.timestampFrom);
  const to = new Date(s.timestampTo);
  const spanHours = (to.getTime() - from.getTime()) / 3_600_000 + 1;
  console.log(
    JSON.stringify({
      area,
      market: s.market,
      service: s.service,
      currency: s.currency,
      unit: s.unit,
      hours: s.hours,
      arrayLength: n,
      sourceHours: s.sourceHours ?? n,
      from: s.timestampFrom,
      to: s.timestampTo,
      spanHours,
      spanMatches8760: spanHours === 8760,
      allFinite: finite,
      negatives: neg,
      min: Math.min(...p),
      max: Math.max(...p),
      mean: Math.round(mean * 1e6) / 1e6,
      median,
    }),
  );
}
