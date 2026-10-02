import { runBatteryApp } from "../../src/lib/battery-app/index";
import { runBatteryEngine } from "../../src/lib/battery-engine";
import { customerEconomyFromResult } from "../../src/lib/battery-app/customerEconomy";
import { createInitialState } from "../../src/state/wizard";
const s = createInitialState("SE" as any);
s.grid.mainFuseA = 35; s.grid.mainFuseManual = true; s.grid.gridValuesConfirmed = true;
s.consumption.mode = "annual"; s.consumption.annualKwh = 0; s.consumption.profileId = "normal";
s.production.mode = "none"; s.strategies.solarSelfConsumption = false; s.strategies.reducedGridImport = false; s.strategies.peakShaving = false; s.strategies.fcrDUp = true;
const o: any = runBatteryApp(s); if (o.status !== "ok") { console.log(o.status); process.exit(); }
const r = runBatteryEngine({ ...o.input, battery: { ...o.input.battery, fixedCapacityKWh: 10, fixedPowerKw: 10 } });
const f: any = r.summary.fcr; const ce = customerEconomyFromResult(r, 0.75);
console.log(JSON.stringify({ gross: f.grossSek, offered: f.offeredPowerKw, held: f.avgHeldPowerKw, heldDown: f.avgHeldDownPowerKw, kund: ce.ancillaryCustomerValueSek, kundMan: ce.ancillaryCustomerValueSek / 12, total: r.summary.economy.annualCustomerBenefitSek }));
