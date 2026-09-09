/** Deterministic stratified scenario set. No randomness beyond a seeded LCG. */
import type { Market, Scenario } from "./harness";

const MARKETS: Market[] = ["SE", "FI", "DE", "DK1", "DK2"];
const LOADS = [5000, 10000, 20000, 40000];
const PVS = [0, 5000, 10000, 20000, 40000];
const PROFILES = ["normal", "evening-heavy", "heat-pump", "day-heavy", "ev-evening"] as const;
const FUSES_BY_MARKET: Record<Market, number[]> = {
  SE: [16, 20, 25, 35, 50, 63, 100],
  FI: [16, 25, 35, 50, 63, 100],
  DE: [16, 20, 25, 32, 35, 40, 63, 100],
  DK1: [16, 20, 25, 32, 35, 40, 63, 100],
  DK2: [16, 20, 25, 32, 35, 40, 63, 100],
};
const HSC = [null, 30, 45, 60];
const ECON = ["LOW", "NORMAL", "HIGH"] as const;

type Strat = Scenario["strategies"];
const STRATS: { name: string; v: Strat }[] = [
  { name: "all", v: { self: true, reduce: true, peak: true, fcr: true } },
  { name: "no-fcr", v: { self: true, reduce: true, peak: true, fcr: false } },
  { name: "no-peak", v: { self: true, reduce: true, peak: false, fcr: true } },
  { name: "solar-only", v: { self: true, reduce: false, peak: false, fcr: false } },
  { name: "fcr-only", v: { self: false, reduce: false, peak: false, fcr: true } },
  { name: "peak-only", v: { self: false, reduce: false, peak: true, fcr: false } },
];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildScenarios(): Scenario[] {
  const out: Scenario[] = [];
  const rnd = lcg(20260909);
  let i = 0;
  const push = (s: Omit<Scenario, "id">) => out.push({ ...s, id: `S${String(i++).padStart(4, "0")}` });

  /* ---- 1. stratified core grid: every market x load x pv, rotating other axes ---- */
  for (const m of MARKETS) {
    for (const load of LOADS) {
      for (const pv of PVS) {
        for (let k = 0; k < 5; k++) {
          const fuses = FUSES_BY_MARKET[m];
          push({
            tag: "core",
            market: m,
            loadKWh: load,
            pvKWh: pv,
            profile: PROFILES[Math.floor(rnd() * PROFILES.length)],
            fuseA: fuses[Math.floor(rnd() * fuses.length)],
            hsc: pv > 0 ? HSC[Math.floor(rnd() * HSC.length)] : null,
            strategies: STRATS[Math.floor(rnd() * STRATS.length)].v,
            econ: ECON[Math.floor(rnd() * ECON.length)],
          });
        }
      }
    }
  }

  /* ---- 2. strategy coverage: every market x every strategy preset ---- */
  for (const m of MARKETS) {
    for (const st of STRATS) {
      for (const econ of ECON) {
        push({
          tag: `strategy:${st.name}`,
          market: m,
          loadKWh: 20000,
          pvKWh: 14000,
          profile: "normal",
          fuseA: 25,
          hsc: null,
          strategies: st.v,
          econ,
        });
      }
    }
  }

  /* ---- 3. profile coverage ---- */
  for (const m of MARKETS) {
    for (const p of PROFILES) {
      for (const hsc of HSC) {
        push({
          tag: "profile",
          market: m,
          loadKWh: 20000,
          pvKWh: 14000,
          profile: p,
          fuseA: 25,
          hsc,
          strategies: STRATS[0].v,
          econ: "NORMAL",
        });
      }
    }
  }

  /* ---- 4. fuse sweep (same property) ---- */
  for (const m of MARKETS) {
    for (const f of [16, 25, 35, 63]) {
      push({
        tag: "fuse-sweep",
        market: m,
        loadKWh: 20000,
        pvKWh: 14000,
        profile: "normal",
        fuseA: f,
        hsc: null,
        strategies: STRATS[0].v,
        econ: "NORMAL",
      });
    }
    for (const f of FUSES_BY_MARKET[m]) {
      push({
        tag: "fuse-country",
        market: m,
        loadKWh: 20000,
        pvKWh: 14000,
        profile: "normal",
        fuseA: f,
        hsc: null,
        strategies: STRATS[0].v,
        econ: "NORMAL",
      });
    }
  }

  /* ---- 5. edge cases A..U ---- */
  const edge: [string, Partial<Scenario>][] = [
    ["A", { loadKWh: 5000, pvKWh: 0, fuseA: 16 }],
    ["B", { loadKWh: 40000, pvKWh: 0, fuseA: 16 }],
    ["C", { loadKWh: 5000, pvKWh: 40000, fuseA: 16 }],
    ["D", { loadKWh: 40000, pvKWh: 40000, fuseA: 16 }],
    ["E", { loadKWh: 40000, pvKWh: 40000, fuseA: 63 }],
    ["F", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, fixedCapacityKWh: 5, fixedPowerKw: 2.5 }],
    ["G", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, fixedCapacityKWh: 100, fixedPowerKw: 50 }],
    ["H", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, fixedCapacityKWh: 60, fixedPowerKw: 3 }],
    ["I", { loadKWh: 20000, pvKWh: 14000, fuseA: 63, fixedCapacityKWh: 20, fixedPowerKw: 10 }],
    ["J", { loadKWh: 20000, pvKWh: 14000, fuseA: 16, fixedCapacityKWh: 40, fixedPowerKw: 20 }],
    ["M", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, econ: "LOW" }],
    ["N", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, econ: "HIGH" }],
    ["O", { loadKWh: 20000, pvKWh: 14000, fuseA: 16 }],
    ["R", { loadKWh: 20000, pvKWh: 0, fuseA: 25 }],
    ["S", { loadKWh: 10000, pvKWh: 40000, fuseA: 25 }],
    ["T", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, hsc: null }],
    ["U30", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, hsc: 30 }],
    ["U45", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, hsc: 45 }],
    ["U60", { loadKWh: 20000, pvKWh: 14000, fuseA: 25, hsc: 60 }],
    ["extreme-min", { loadKWh: 1000, pvKWh: 0, fuseA: 16 }],
    ["extreme-max", { loadKWh: 80000, pvKWh: 60000, fuseA: 100 }],
  ];
  for (const m of MARKETS) {
    for (const [name, patch] of edge) {
      push({
        tag: `edge:${name}`,
        market: m,
        loadKWh: 20000,
        pvKWh: 14000,
        profile: "normal",
        fuseA: 25,
        hsc: null,
        strategies: STRATS[0].v,
        econ: "NORMAL",
        ...(patch as any),
      });
    }
  }

  /* ---- 6. sensitivity pairs (one input nudged) ---- */
  const basePairs: { name: string; a: Partial<Scenario>; b: Partial<Scenario> }[] = [
    { name: "load", a: { loadKWh: 10000 }, b: { loadKWh: 10500 } },
    { name: "pv", a: { pvKWh: 10000 }, b: { pvKWh: 10500 } },
    { name: "fuse", a: { fuseA: 25 }, b: { fuseA: 35 } },
    { name: "hsc", a: { hsc: 45 }, b: { hsc: 50 } },
    { name: "econ", a: { econ: "NORMAL" }, b: { econ: "HIGH" } },
  ];
  for (const m of MARKETS) {
    for (const p of basePairs) {
      for (const side of ["a", "b"] as const) {
        push({
          tag: `sens:${p.name}:${side}`,
          market: m,
          loadKWh: 10000,
          pvKWh: 10000,
          profile: "normal",
          fuseA: 25,
          hsc: 45,
          strategies: STRATS[0].v,
          econ: "NORMAL",
          ...((side === "a" ? p.a : p.b) as any),
        });
      }
    }
  }

  /* ---- 7. cross-country identical physical case ---- */
  for (const m of MARKETS) {
    for (const fcr of [true, false]) {
      push({
        tag: fcr ? "cross:with-reserve" : "cross:no-reserve",
        market: m,
        loadKWh: 20000,
        pvKWh: 14000,
        profile: "normal",
        fuseA: 25,
        hsc: null,
        strategies: { self: true, reduce: true, peak: true, fcr },
        econ: "NORMAL",
      });
    }
    push({
      tag: "sanity:no-solar-no-reserve",
      market: m,
      loadKWh: 20000,
      pvKWh: 0,
      profile: "normal",
      fuseA: 25,
      hsc: null,
      strategies: { self: true, reduce: true, peak: true, fcr: false },
      econ: "NORMAL",
    });
  }

  /* ---- 8. battery sweep around the recommendation ---- */
  for (const m of MARKETS) {
    for (const cap of [5, 10, 15, 20, 25, 30, 40, 50]) {
      for (const cr of [0.2, 0.5]) {
        push({
          tag: "battery-sweep",
          market: m,
          loadKWh: 20000,
          pvKWh: 14000,
          profile: "normal",
          fuseA: 25,
          hsc: null,
          strategies: STRATS[0].v,
          econ: "NORMAL",
          fixedCapacityKWh: cap,
          fixedPowerKw: Math.round(cap * cr * 10) / 10,
        });
      }
    }
  }

  /* ---- 9. reserve headroom stress (symmetric up/down corners) ---- */
  for (const m of MARKETS) {
    for (const [name, patch] of [
      ["P:no-down-headroom", { pvKWh: 40000, fuseA: 16 }],
      ["Q:no-up-headroom", { loadKWh: 40000, pvKWh: 0, fuseA: 16 }],
      ["K:soc-min", { loadKWh: 40000, pvKWh: 0, fuseA: 20 }],
      ["L:soc-max", { loadKWh: 5000, pvKWh: 30000, fuseA: 63 }],
    ] as [string, Partial<Scenario>][]) {
      push({
        tag: `reserve-corner:${name}`,
        market: m,
        loadKWh: 20000,
        pvKWh: 14000,
        profile: "normal",
        fuseA: 25,
        hsc: null,
        strategies: { self: true, reduce: true, peak: true, fcr: true },
        econ: "NORMAL",
        ...(patch as any),
      });
    }
  }

  return out;
}
