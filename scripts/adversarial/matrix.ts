/** Deterministic adversarial scenario matrix. Read-only audit input. */
import type { AdvScenario, Market } from "./harness";

const MARKETS: Market[] = ["SE", "FI", "DE", "DK1", "DK2"];
const LOADS = [500, 1500, 3000, 5000, 10000, 20000, 50000, 100000, 250000, 500000, 1200000];
const PV_RATIOS = [0, 0.25, 0.5, 1, 1.5, 2.5, 5];
const FUSES = [10, 16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200, 400];
const PROFILES = [
  "normal",
  "evening-heavy",
  "day-heavy",
  "heat-pump",
  "direct-electric",
  "heat-pump-ev",
  "ev-night",
  "ev-evening",
  "pool-summer",
  "office",
  "retail-restaurant",
  "workshop",
];

type Strat = AdvScenario["strategies"];
const STRATS: { name: string; v: Strat }[] = [
  { name: "all", v: { self: true, reduce: true, peak: true, fcr: true } },
  { name: "self-only", v: { self: true, reduce: false, peak: false, fcr: false } },
  { name: "reduce-only", v: { self: false, reduce: true, peak: false, fcr: false } },
  { name: "peak-only", v: { self: false, reduce: false, peak: true, fcr: false } },
  { name: "fcr-only", v: { self: false, reduce: false, peak: false, fcr: true } },
  { name: "self+peak", v: { self: true, reduce: true, peak: true, fcr: false } },
  { name: "self+fcr", v: { self: true, reduce: true, peak: false, fcr: true } },
];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fuse that can physically carry the load, so the matrix is not all grid-starved. */
function plausibleFuse(loadKWh: number): number {
  const avgKw = loadKWh / 8760;
  const target = avgKw * 6;
  return FUSES.find((f) => f * 400 * Math.sqrt(3) * 0.001 >= target) ?? 400;
}

export function buildMatrix(): AdvScenario[] {
  const out: AdvScenario[] = [];
  let i = 0;
  const push = (s: Omit<AdvScenario, "id">) =>
    out.push({ ...s, id: `A${String(i++).padStart(5, "0")}` });
  const rnd = lcg(20260910);

  /* 1. CORE MATRIX — market x load x pv ratio, rotating profile/fuse/strategy. */
  for (const m of MARKETS)
    for (const load of LOADS)
      for (const ratio of PV_RATIOS)
        for (let k = 0; k < 3; k++) {
          const plaus = plausibleFuse(load);
          const fuse = k === 0 ? plaus : FUSES[Math.floor(rnd() * FUSES.length)];
          push({
            family: "core",
            market: m,
            loadKWh: load,
            pvKWh: Math.round(load * ratio),
            profile: PROFILES[Math.floor(rnd() * PROFILES.length)],
            fuseA: fuse,
            strategies: STRATS[Math.floor(rnd() * STRATS.length)].v,
          });
        }

  /* 2. PROFILE MATRIX — every profile, all strategies, two sizes, SE + DE. */
  for (const m of ["SE", "DE"] as Market[])
    for (const p of PROFILES)
      for (const load of [10000, 100000])
        for (const st of STRATS)
          push({
            family: "profile",
            market: m,
            loadKWh: load,
            pvKWh: load / 2,
            profile: p,
            fuseA: plausibleFuse(load),
            strategies: st.v,
          });

  /* 3. FUSE SWEEP — identical property, every fuse, all markets. */
  for (const m of MARKETS)
    for (const f of FUSES)
      push({
        family: "fuse",
        market: m,
        loadKWh: 40000,
        pvKWh: 20000,
        profile: "heat-pump-ev",
        fuseA: f,
        strategies: { self: true, reduce: true, peak: true, fcr: true },
      });

  /* 4. NO-SUN FAMILY. */
  for (const m of MARKETS)
    for (const load of [3000, 10000, 50000, 250000])
      for (const st of STRATS)
        push({
          family: "nosun",
          market: m,
          loadKWh: load,
          pvKWh: 0,
          profile: "heat-pump",
          fuseA: plausibleFuse(load),
          strategies: st.v,
        });

  /* 5. EXTREME SUN. */
  for (const m of MARKETS)
    for (const ratio of [1.5, 2.5, 5])
      for (const load of [5000, 20000, 100000])
        push({
          family: "sun",
          market: m,
          loadKWh: load,
          pvKWh: load * ratio,
          profile: "normal",
          fuseA: plausibleFuse(load),
          strategies: { self: true, reduce: true, peak: true, fcr: true },
        });

  /* 6. MONOTONICITY SWEEPS — one input at a time. */
  const baseMono = {
    family: "mono-load",
    market: "SE" as Market,
    loadKWh: 10000,
    pvKWh: 8000,
    profile: "normal",
    fuseA: 25,
    strategies: { self: true, reduce: true, peak: true, fcr: true },
  };
  for (const load of [9000, 9250, 9500, 9750, 10000, 10250, 10500, 10750, 11000])
    push({ ...baseMono, loadKWh: load });
  for (const pv of [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000])
    push({ ...baseMono, family: "mono-pv", pvKWh: pv });
  for (const f of [16, 20, 25, 35, 50, 63, 80, 100, 125, 160, 200])
    push({ ...baseMono, family: "mono-fuse", fuseA: f });
  for (const p of [0, 0.05, 0.5, 1.0, 1.5, 2.5, 5, 10])
    push({ ...baseMono, family: "mono-import", importPrice: p });
  for (const p of [0, 0.2, 0.5, 1.0, 1.5, 3])
    push({ ...baseMono, family: "mono-export", exportPrice: p });
  for (const d of [0, 10, 30, 60, 120, 400])
    push({ ...baseMono, family: "mono-demand", demandCharge: d });
  for (const sh of [0, 0.25, 0.5, 0.75, 1])
    push({ ...baseMono, family: "mono-share", share: sh });
  for (const y of [5, 8, 10, 15, 20]) push({ ...baseMono, family: "mono-payback", payback: y });
  /* Larger commercial site, same sweeps on load and fuse. */
  const bigMono = { ...baseMono, loadKWh: 250000, pvKWh: 150000, fuseA: 200, profile: "workshop" };
  for (const load of [230000, 240000, 250000, 260000, 270000])
    push({ ...bigMono, family: "mono-load-big", loadKWh: load });
  for (const f of [63, 80, 100, 125, 160, 200, 400])
    push({ ...bigMono, family: "mono-fuse-big", fuseA: f });

  /* 7. MARGINAL UTILITY LADDER — fixed capacities on identical properties. */
  const LADDER = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
  for (const m of ["SE", "DE", "DK2"] as Market[])
    for (const site of [
      { load: 20000, pv: 14000, fuse: 63, profile: "heat-pump" },
      { load: 250000, pv: 100000, fuse: 200, profile: "workshop" },
    ])
      for (const cap of LADDER)
        push({
          family: `ladder:${m}:${site.load}`,
          market: m,
          loadKWh: site.load,
          pvKWh: site.pv,
          profile: site.profile,
          fuseA: site.fuse,
          strategies: { self: true, reduce: true, peak: true, fcr: true },
          fixedCapacityKWh: cap,
        });

  /* 8. ECONOMIC EDGE CASES. */
  for (const m of MARKETS)
    for (const imp of [0, 0.05, 0.5, 1.5, 5, 10])
      for (const exp of [0, imp, imp * 1.5])
        push({
          family: "econ",
          market: m,
          loadKWh: 20000,
          pvKWh: 15000,
          profile: "normal",
          fuseA: 50,
          strategies: { self: true, reduce: true, peak: true, fcr: true },
          importPrice: imp,
          exportPrice: exp,
        });
  for (const m of MARKETS)
    for (const d of [0, 10, 45, 150, 600])
      push({
        family: "econ-demand",
        market: m,
        loadKWh: 60000,
        pvKWh: 0,
        profile: "workshop",
        fuseA: 100,
        strategies: { self: true, reduce: true, peak: true, fcr: false },
        demandCharge: d,
      });

  /* 9. PEAK SHAVING SHAPES. */
  for (const m of ["SE", "DE"] as Market[])
    for (const p of ["flat", "low-base-peaks", "direct-electric", "retail-restaurant", "ev-evening"])
      for (const d of [0, 45, 150])
        push({
          family: "peak",
          market: m,
          loadKWh: 80000,
          pvKWh: 0,
          profile: p,
          fuseA: 125,
          strategies: { self: false, reduce: false, peak: true, fcr: false },
          demandCharge: d,
        });

  /* 10. ANCILLARY CUSTOMER SHARE (physics must not move). */
  for (const m of MARKETS)
    for (const sh of [0, 0.25, 0.5, 0.75, 1])
      push({
        family: "share",
        market: m,
        loadKWh: 30000,
        pvKWh: 15000,
        profile: "normal",
        fuseA: 63,
        strategies: { self: true, reduce: true, peak: true, fcr: true },
        share: sh,
      });

  /* 11. ALTERNATIVES ORDERING (3 extra engine runs each — keep it bounded). */
  for (const m of MARKETS)
    for (const load of [3000, 20000, 100000, 500000])
      push({
        family: "alt",
        market: m,
        loadKWh: load,
        pvKWh: load * 0.6,
        profile: "normal",
        fuseA: plausibleFuse(load),
        strategies: { self: true, reduce: true, peak: true, fcr: true },
        withAlternatives: true,
        noReplay: true,
      });

  /* 12. PRODUCT CAP STRESS — very large sites. */
  for (const m of MARKETS)
    for (const load of [500000, 1200000, 3000000])
      push({
        family: "cap",
        market: m,
        loadKWh: load,
        pvKWh: load * 0.4,
        profile: "workshop",
        fuseA: 400,
        strategies: { self: true, reduce: true, peak: true, fcr: true },
      });

  /* 13. TINY SITES. */
  for (const m of MARKETS)
    for (const load of [200, 500, 1500])
      for (const ratio of [0, 1, 5])
        push({
          family: "tiny",
          market: m,
          loadKWh: load,
          pvKWh: load * ratio,
          profile: "normal",
          fuseA: 16,
          strategies: { self: true, reduce: true, peak: true, fcr: true },
        });

  return out;
}
