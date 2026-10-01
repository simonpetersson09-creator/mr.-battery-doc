import { it } from "vitest";
import { writeFileSync } from "fs";
import { toEconomyConfig, toLabConfig } from "@/lib/battery-engine/input";
import { buildSeries, simulate } from "@/lib/lab/simulate";
import { ancillaryPlan, capSymmetricPlanToBatteryPower } from "@/lib/lab/ancillary";
import { dispatch, resolveWindow } from "@/lib/lab/dispatch";
import { dispatch as dispatchOld } from "@/lib/lab/zz_dispatch_old";
import { composeOperatingEconomy, optimizeFcrReservation } from "@/lib/lab/operatingEconomy";
export function mk(c: string, r: number, cap: number, kw: number, offered: number) {
  const i: any = {
    site: { voltageV: 400, phases: 3, mainFuseA: 250, country: c, marketArea: null },
    consumption: { annualKWh: 20000, profile: "normal" },
    production: { enabled: true, annualKWh: 10000, kWp: 10 },
    strategies: { selfConsumption: true, reduceImport: true, peakShaving: true, fcrDUp: true, optimiseFcrReservation: true },
    economy: { importEnergyPriceSekPerKWh: 0.3 * r, exportEnergyValueSekPerKWh: 0.05 * r, peakDemandChargeSekPerKwMonth: null, peakTariffSource: "default-estimate", eurSekRate: r, customerAncillaryShare: 0.75 },
    battery: { fixedCapacityKWh: cap, fixedPowerKw: kw },
  };
  const cfg0 = toLabConfig(i);
  const cfg = { ...cfg0, ancillary: { ...cfg0.ancillary, enabled: true, offeredPowerKw: offered } };
  return { cfg, econ: toEconomyConfig(i), series: buildSeries(cfg) };
}
it("p1", () => {
  const { cfg, econ, series } = mk("CH", 0.94, 10, 5, 3.5);
  const win = resolveWindow(cfg.battery, cfg.strategies, cfg.flex, 10, 5);
  const plan = capSymmetricPlanToBatteryPower(ancillaryPlan(cfg.ancillary), win.chargeKw, win.dischargeKw);
  const args = (pct: number) => ({ series, battery: { ...cfg.battery, initialSocPct: pct }, grid: cfg.grid, strategies: cfg.strategies, peak: cfg.peakShaving, spot: cfg.spot, flex: cfg.flex, ancillary: plan, capacityKWh: 10, powerKw: 5 });
  // OLD: own cyclic loop
  let pct = cfg.battery.initialSocPct; let o: any;
  for (let k = 0; k < 30; k++) { o = dispatchOld(args(pct) as any); const n = o.tallies.socEnd / 10 * 100; if (Math.abs(o.tallies.socEnd - o.tallies.socStart) < 1e-3) break; pct = n; }
  const s = simulate(cfg, series, 10, 5);
  const e = composeOperatingEconomy(s, econ);
  (globalThis as any).__SMDBG={n:0,rows:[]}; (globalThis as any).__SMDBG2=0; const nd: any = dispatch(args(s.socStartKWh / 10 * 100) as any);
  const smG = nd.storageManagementGridChargeByHour as number[]; const od = nd.ordinaryDischargeToLoadByHour as number[];
  let circle = 0, hoursSm = 0, followed = 0;
  const fut = [...od];
  for (let h = 0; h < 8760; h++) if (smG[h]! > 1e-9) { hoursSm++; let need = smG[h]!; let got = false; for (let k = h + 1; k <= Math.min(8759, h + 24) && need > 1e-12; k++) { const t = Math.min(need, fut[k]!); if (t > 0) got = true; fut[k]! -= t; need -= t; circle += t; } if (got) followed++; }
  const t = (x: any) => ({ chargedKWh: x.chargedKWh, dischargedKWh: x.dischargedKWh, smCharge: x.storageManagementChargeKWh, smDis: x.storageManagementDischargeKWh, smGrid: x.storageManagementGridChargeKWh, pv: x.chargedFromPvKWh, grid: x.chargedFromGridKWh, sd: x.selfDischargeKWh, loss: x.lossesKWh, socStart: x.socStart, socEnd: x.socEnd });
  const opt = optimizeFcrReservation({ ...cfg }, 10, 5, econ, undefined, series);
  writeFileSync("/tmp/diag/dbg.json", JSON.stringify((globalThis as any).__SMDBG.rows)); writeFileSync("/tmp/diag/p1.json", JSON.stringify({ old: t(o.tallies), oldCycles: o.tallies.dischargedKWh / 10,
    now: t(nd.tallies), sim: { cyc: s.equivalentFullCycles, s0: s.socStartKWh, s1: s.socEndKWh, conv: (s as any).socCycleConverged ?? null, held: s.ancillary.physicalHeldPowerAvgKw, energy: e.energy.energyBenefitSek, fcr: e.fcr.grossSek, cust: (e.fcr.grossSek ?? 0) * 0.75 },
    circle, hoursSm, followed, sumSmG: smG.reduce((a,b)=>a+b,0), ndSmG: nd.tallies.storageManagementGridChargeKWh, dbgN: (globalThis as any).__SMDBG.n, opt: opt.candidates.map((c) => [c.offeredPowerKw, c.energyBenefitSek, c.fcrGrossSek, c.annualCustomerBenefitSek]), best: opt.best.offeredPowerKw }, null, 1));
}, 600000);
