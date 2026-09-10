import { defaultConfig, spreadAnnual, DEFAULT_LOAD_MONTH_SHARE, DEFAULT_PV_MONTH_SHARE } from "../../src/lib/lab/defaults";
import { buildSeries, simulate } from "../../src/lib/lab/simulate";
import type { LabConfig } from "../../src/lib/lab/types";

const setLoad = (c: LabConfig, kWh: number) => { c.consumption.annualKWh = kWh; c.consumption.monthlyKWh = spreadAnnual(kWh, DEFAULT_LOAD_MONTH_SHARE); };
const setPv = (c: LabConfig, kWh: number) => { c.solar.monthlyKWh = spreadAnnual(kWh, DEFAULT_PV_MONTH_SHARE); };

const variants: Record<string, (c: LabConfig) => void> = {
  base: () => {},
  bigCommercial: (c) => { setLoad(c, 250000); setPv(c, 80000); c.solar.kWp = 90; c.solar.inverterAcKw = 80; c.grid.mainFuseA = 200; c.battery.chargeKw = 100; c.battery.dischargeKw = 100; },
  noPv: (c) => { setPv(c, 0); c.solar.enabled = false; },
  hugePv: (c) => { setPv(c, 60000); setLoad(c, 8000); c.solar.kWp = 50; c.solar.inverterAcKw = 40; },
  tinyFuse: (c) => { c.grid.mainFuseA = 16; setLoad(c, 40000); },
  peakOn: (c) => { c.strategies.peakShaving = true; c.demandCharge.enabled = true; },
  peakNoFee: (c) => { c.strategies.peakShaving = true; c.demandCharge.enabled = true; c.demandCharge.krPerKw = 0; },
  fcr: (c) => { c.strategies.ancillaryServices = true; },
  fcrPeak: (c) => { c.strategies.ancillaryServices = true; c.strategies.peakShaving = true; c.demandCharge.enabled = true; },
  allOn: (c) => { c.strategies.peakShaving = true; c.strategies.arbitrage = true; c.strategies.curtailmentRecovery = true; c.strategies.backupReserve = true; c.strategies.ancillaryServices = true; c.demandCharge.enabled = true; c.battery.reserveSocPct = 30; },
};

let worst = { r: 0, name: "" };
let worstSoc = { d: 0, name: "", pct: 0 };
const lines: string[] = [];
for (const [name, over] of Object.entries(variants)) {
  for (const [cap, kw] of [[10, 5], [25, 12.5], [30, 15], [100, 50], [200, 100]] as [number, number][]) {
    const c = defaultConfig(); over(c);
    c.battery.nominalKWh = cap; c.battery.chargeKw = Math.max(c.battery.chargeKw, kw); c.battery.dischargeKw = c.battery.chargeKw;
    const s = buildSeries(c);
    const r = simulate(c, s, cap, kw);
    const eb = (r as any).energyBalance;
    const t: any = r;
    const socD = ((r as any).socEndKWh ?? 0) - ((r as any).socStartKWh ?? 0);
    const rt = t && t.chargedKWh > 0 ? t.dischargedKWh / t.chargedKWh : NaN;
    if (Math.abs(eb.residualKWh) > Math.abs(worst.r)) worst = { r: eb.residualKWh, name: `${name}/${cap}` };
    if (Math.abs(socD) > Math.abs(worstSoc.d)) worstSoc = { d: socD, name: `${name}/${cap}`, pct: Math.abs(socD) / Math.max(1, t.dischargedKWh) * 100 };
    lines.push(`${name}/${cap}kWh-${kw}kW ok=${eb.ok} resid=${eb.residualKWh.toExponential(2)} socDelta=${socD.toFixed(2)} d/c=${rt.toFixed(4)} cycles=${t.equivalentFullCycles.toFixed(1)}`);
  }
}
console.log(lines.join("\n"));
console.log(`\nWORST RESIDUAL: ${worst.r.toExponential(3)} kWh (${worst.name})`);
console.log(`WORST SOC DELTA: ${worstSoc.d.toFixed(2)} kWh (${worstSoc.name}) = ${worstSoc.pct.toFixed(3)} % of annual discharge`);

// initial SOC sensitivity
console.log("\nINITIAL SOC SENSITIVITY (base, 30 kWh/15 kW):");
for (const p of [5, 25, 50, 75, 95]) {
  const c = defaultConfig(); c.battery.nominalKWh = 30; c.battery.chargeKw = 15; c.battery.dischargeKw = 15; c.battery.initialSocPct = p;
  const s = buildSeries(c); const r: any = simulate(c, s, 30, 15);
  const t = r.dispatch?.tallies ?? r.tallies;
  console.log(`  initialSoc=${p}% discharged=${t.dischargedKWh.toFixed(1)} charged=${t.chargedKWh.toFixed(1)} socEnd=${t.socEnd.toFixed(2)} resid=${r.energyBalance.residualKWh.toExponential(2)}`);
}
