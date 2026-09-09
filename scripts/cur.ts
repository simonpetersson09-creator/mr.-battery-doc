import { createInitialState } from "@/state/wizard";
import { runBatteryApp } from "@/lib/battery-app";
for (const c of ["SE","FI","DK","DE"] as const) {
  const s = createInitialState(c);
  s.grid.mainFuseA = 25; s.grid.gridValuesConfirmed = true;
  if (c === "DK") s.grid.marketArea = "DK1" as any;
  s.consumption = { ...s.consumption, mode: "annual", annualKwh: 20000, profileId: "normal" as any };
  s.production = { ...s.production, mode: "manual", annualKwh: 14000, dcKwp: 14, acKw: 12 };
  const o = runBatteryApp(s);
  if (o.status !== "ok") { console.log(c, o.status, JSON.stringify(o).slice(0,200)); continue; }
  const e = o.result.summary;
  console.log(c, s.economy.currency, "rate", s.economy.eurSekRate,
    "| fcrEUR", (e.fcr as any).grossEur ?? JSON.stringify(Object.keys(e.fcr)), "| fcrLocal", e.fcr.grossSek,
    "| total", e.economy.totalOperatingBenefitSek);
}
