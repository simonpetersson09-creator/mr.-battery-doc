import { getCalculation } from "@/lib/access/calculationCache";
import { computeAncillaryScenario } from "@/lib/battery-app/ancillaryScenario";
import { createInitialState } from "@/state/wizard";
for (const kwh of [0, 1000]) {
  const s: any = JSON.parse(JSON.stringify(createInitialState("SE")));
  s.grid.mainFuseA = 200;
  s.consumption.mode = "annual";
  s.consumption.annualKwh = kwh;
  s.consumption.profileId = "normal";
  s.production.none = true;
  s.strategies = { ...s.strategies, solarSelfConsumption: false, peakShaving: false, ancillary: true };
  s.economy = { ...s.economy, paybackYears: 10 };
  const r: any = getCalculation(s);
  const sc: any = computeAncillaryScenario(s);
  console.log(kwh, r.outcome.status, "best:", sc?.best?.capacityKWh, sc?.best?.powerKw, "cands:", sc?.candidates?.length);
}
