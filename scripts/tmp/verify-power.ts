import { runBatteryEngine } from "@/lib/battery-engine";
import { buildReportModel } from "@/lib/report/reportModel";

const combos = [[15,15],[20,20],[30,30],[50,50],[100,100]] as const;
for (const [kwh, kw] of combos) {
  const res = runBatteryEngine({
    site: { country: "SE", marketArea: "SE3", mainFuseA: 63 },
    consumption: { annualKWh: 60000, profileId: "evening-heavy" },
    production: { acKw: 30 },
    strategies: { fcrDUp: true, optimiseFcrReservation: true, solarSelfConsumption: true, reducedGridImport: true, peakShaving: true },
    battery: { fixedCapacityKWh: kwh, fixedPowerKw: kw },
  } as never);
  const f = (res as never as { summary: { fcr: Record<string, number> } }).summary.fcr;
  console.log(`${kwh}/${kw}`, JSON.stringify({
    offered: +f.offeredPowerKw.toFixed(2),
    reservable: +f.reservablePowerAvgKw.toFixed(2),
    held: +f.avgHeldPowerKw.toFixed(2),
    monetized: +f.monetizedPowerKw.toFixed(2),
    gross: Math.round(f.grossSek),
  }));
}
