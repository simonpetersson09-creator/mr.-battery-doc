import { it } from "vitest";
import { runBatteryApp } from "@/lib/battery-app";
import { createInitialState } from "@/state/wizard";
it("probe", () => {
const s = createInitialState("SE");
s.grid.mainFuseA = 630; s.grid.mainFuseManual = true; s.grid.gridValuesConfirmed = true;
s.consumption.mode = "annual"; s.consumption.annualKwh = 1200000; s.consumption.profileId = "office";
s.production.mode = "manual"; s.production.dcKwp = 800; s.production.acKw = 700; s.production.annualKwh = 760000;
s.strategies.peakShaving = true; s.strategies.fcrDUp = true;
const r = runBatteryApp(s);
if (r.status !== "ok") { console.log(r); return; }
console.log(JSON.stringify(r.result.summary.recommendation, null, 1));
console.log("powerSizing", JSON.stringify(r.result.diagnostics?.powerSizing ?? {}, null, 1).slice(0,1500));
}, 240000);
