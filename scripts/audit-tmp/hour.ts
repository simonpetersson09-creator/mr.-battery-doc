import { toLabConfig, toTimeSeries } from "../../src/lib/battery-engine/input";
import { dispatch, computeGridLimits, resolveWindow } from "../../src/lib/lab/dispatch";
import { ancillaryPlan } from "../../src/lib/lab/ancillary";

const input = {
  site: { country: "SE" as const, mainFuseA: 25 },
  consumption: { annualKWh: 20000 },
  production: { enabled: true, kWp: 14 },
  battery: { fixedCapacityKWh: 10, fixedPowerKw: 10 },
  strategies: { fcrDUp: true },
};
const cfg = toLabConfig(input);
const series = toTimeSeries(cfg, input);
const C = 10, P = 10;
const plan = ancillaryPlan({ ...cfg.ancillary, enabled: true, offeredPowerKw: 10 })!;
const out = dispatch({ series, battery: cfg.battery, strategies: cfg.strategies, peak: cfg.peakShaving, spot: cfg.spot, flex: cfg.flex, grid: cfg.grid, ancillary: plan, capacityKWh: C, powerKw: P });
const win = resolveWindow(cfg.battery, cfg.strategies, cfg.flex, C, P);
const limits = computeGridLimits(cfg.grid);
const h = 100;
const socStart = h === 0 ? out.tallies.socStart : out.socSeries[h-1]!;
const socEnd = out.socSeries[h]!;
const socLow = Math.min(socStart, socEnd);
const nominal = C;
const serviceFloor = Math.max(win.socFloorKWh, (plan.serviceMinSocPct/100)*nominal);
const endurance = plan.upEnergyKWh / plan.upPowerKw;
const deliverable = Math.max(0, socLow - serviceFloor) * win.dischargeEff;
const energyUp = deliverable / endurance;
const gridUp = (out.importSeries[h] ?? 0) + Math.max(0, limits.maxExportKw - (out.exportSeries[h] ?? 0));
console.log({ socStart, socEnd, socLow, technicalFloor: win.socFloorKWh, serviceMinSocPct: plan.serviceMinSocPct, serviceFloorKWh: serviceFloor, endurance, dischargeEff: win.dischargeEff, deliverableKWh: deliverable, energyUpCapabilityKw: energyUp, dischargePowerCapabilityKw: win.dischargeKw, gridUpHeadroomKw: gridUp, upReservableKw: Math.max(0, Math.min(win.dischargeKw, energyUp, gridUp)), paidUpKw: out.ancillaryReservedPowerKwByHour[h], paidDownKw: out.ancillaryReservedDownPowerKwByHour[h], serviceMaxSocPct: plan.serviceMaxSocPct });
// invariant scan
let worst = 0, worstD = 0;
for (let i=0;i<8760;i++){
  const up = out.ancillaryReservedPowerKwByHour[i] ?? 0;
  const dn = out.ancillaryReservedDownPowerKwByHour[i] ?? 0;
  const s0 = i===0?out.tallies.socStart:out.socSeries[i-1]!, s1 = out.socSeries[i]!;
  const lo = Math.min(s0,s1), hi = Math.max(s0,s1);
  const avail = Math.max(0, lo - serviceFloor) * win.dischargeEff;
  const room = Math.max(0, Math.min(win.socCeilKWh,(plan.serviceMaxSocPct/100)*nominal) - hi) / win.chargeEff;
  worst = Math.max(worst, up*endurance - avail);
  worstD = Math.max(worstD, dn*endurance - room);
}
console.log({ worstUpViolationKWh: worst, worstDownViolationKWh: worstD });
