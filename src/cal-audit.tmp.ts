import { runBatteryApp } from "@/lib/battery-app/index";
import { createInitialState } from "@/state/wizard";
import { buildLoadSeries, buildPvSeries, calibrateLoadToSelfConsumption, shapeDeviationOf } from "@/lib/lab/profiles";
import { defaultConfig } from "@/lib/lab/defaults";
const DEFAULT_CONFIG = defaultConfig();

const LOAD_MONTHS = [2560, 2280, 2080, 1620, 1220, 900, 800, 860, 1160, 1620, 2120, 2760];
const PV_MONTHS = [140, 380, 950, 1500, 1900, 2050, 2000, 1650, 1150, 620, 250, 110];

function build(profile: string, target: number | null) {
  const s = createInitialState("SE");
  s.grid.mainFuseA = 25;
  s.consumption.mode = "monthly";
  s.consumption.monthlyKwh = [...LOAD_MONTHS];
  s.consumption.profileId = profile as never;
  s.production.mode = "manual";
  s.production.useMonthly = true;
  s.production.monthlyKwh = [...PV_MONTHS];
  s.production.dcKwp = 14;
  s.production.acKw = 12;
  s.production.selfConsumptionPct = target;
  s.strategies.peakShaving = true;
  return s;
}

const profiles = ["normal", "evening-heavy", "heat-pump", "ev-evening"];

// Cap sweep on raw series
const pv = buildPvSeries({ ...DEFAULT_CONFIG.solar, enabled: true, monthlyKWh: PV_MONTHS, inverterAcKw: 12 } as never).pv;
console.log("--- CAP SWEEP (target 60 %) ---");
for (const p of profiles) {
  const load = buildLoadSeries({ ...DEFAULT_CONFIG.consumption, shape: p as never, monthlyKWh: LOAD_MONTHS } as never);
  const peakHourOf = (s: number[]) => {
    const acc = new Array(24).fill(0);
    s.forEach((v, i) => (acc[i % 24] += v));
    return acc.indexOf(Math.max(...acc));
  };
  const row: string[] = [];
  for (const cap of [0.1, 0.15, 0.2, 0.25, 0.3]) {
    const out = calibrateLoadToSelfConsumption(load, pv, 60, cap);
    row.push(`cap ${cap}: ${out.calibration!.achievedPct.toFixed(1)}% dev=${out.calibration!.shapeDeviation.toFixed(3)} peakH=${peakHourOf(out.load)} peakKw=${Math.max(...out.load).toFixed(2)}`);
  }
  console.log(p, "base peakH", peakHourOf(load), "peakKw", Math.max(...load).toFixed(2));
  row.forEach((r) => console.log("   ", r));
}

console.log("\n--- PROFILE FALSIFICATION ---");
for (const t of [null, 30, 45, 60, 85]) {
  for (const p of profiles) {
    const o = runBatteryApp(build(p, t));
    if (o.status !== "ok") { console.log(p, t, o.status); continue; }
    const s = o.result.summary;
    const c = s.selfConsumptionCalibration;
    console.log(
      `${t ?? "none"}\t${p}\tach=${s.energy.selfConsumptionBeforePct.toFixed(1)}\tstatus=${c?.status ?? "not-requested"}\tdev=${(c?.shapeDeviation ?? 0).toFixed(3)}\tpeak=${s.grid.importPeakBeforeKw.toFixed(2)}\tphys=${s.recommendation.physicalPowerNeedKw.toFixed(2)}\tkWh=${s.recommendation.capacityKWh}\tkW=${s.recommendation.powerKw}\tcyc=${s.energy.equivalentFullCycles.toFixed(1)}\tshift=${0}\tben=${(s.economy.totalOperatingBenefitSek ?? 0).toFixed(0)}\tbal=${s.energyBalance.ok}`,
    );
  }
}
