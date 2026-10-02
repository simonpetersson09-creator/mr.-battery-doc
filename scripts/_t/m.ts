import { runBatteryApp } from "../../src/lib/battery-app/index";
import { customerEconomyFromResult } from "../../src/lib/battery-app/customerEconomy";
import { computeBatteryAlternatives } from "../../src/lib/battery-app/capacityAlternatives";
import { computeAncillaryScenario } from "../../src/lib/battery-app/ancillaryScenario";
import { buildReportModel, collectReportText } from "../../src/lib/report/reportModel";
import { createInitialState } from "../../src/state/wizard";
import { writeFileSync } from "fs";
const [group, out] = [process.argv[2], process.argv[3]];
type C = { id: string; cc: any; area?: any; fuse: number; kwh: number; solar: boolean; peak: boolean; fcr: boolean; share: number; ancOnly?: boolean };
const cs: C[] = [];
const countries: [any, any?][] = [["SE"],["FI"],["DK","DK1"],["DK","DK2"],["DE"],["AT"],["CH"],["BE"],["FR"],["CZ"],["SI"]];
for (const [cc, area] of countries) for (const fuse of [25, 63]) cs.push({ id: `${cc}${area??""}-${fuse}`, cc, area, fuse, kwh: 20000, solar: true, peak: true, fcr: true, share: 0.75 });
for (const sh of [0.6, 1.0]) for (const [cc, area] of [["SE"],["DE"],["DK","DK2"],["BE"]] as any) cs.push({ id: `${cc}${area??""}-35-s${sh}`, cc, area, fuse: 35, kwh: 20000, solar: true, peak: true, fcr: true, share: sh });
for (const sh of [0.6, 0.75, 1.0]) for (const cc of ["SE", "FI"]) cs.push({ id: `${cc}-anc-s${sh}`, cc, fuse: 20, kwh: 20000, solar: false, peak: false, fcr: true, share: sh, ancOnly: true });
cs.push({ id: "SE-200A-big", cc: "SE", fuse: 200, kwh: 400000, solar: true, peak: true, fcr: true, share: 0.75 });
cs.push({ id: "DE-63-noFcr", cc: "DE", fuse: 63, kwh: 20000, solar: true, peak: true, fcr: false, share: 0.75 });
const n = 4, g = Number(group);
const res: any = {};
cs.forEach((c, i) => { if (i % n !== g) return;
  const s = createInitialState(c.cc); if (c.area) s.grid.marketArea = c.area;
  s.grid.mainFuseA = c.fuse; s.grid.mainFuseManual = true; s.grid.gridValuesConfirmed = true;
  s.consumption.mode = "annual"; s.consumption.annualKwh = c.kwh; s.consumption.profileId = "normal";
  if (c.solar) { s.production.mode = "manual"; s.production.dcKwp = 10; s.production.acKw = 10; s.production.annualKwh = 10000; } else s.production.mode = "none";
  if (c.ancOnly) { s.strategies.solarSelfConsumption = false; s.strategies.reducedGridImport = false; }
  s.strategies.peakShaving = c.peak; s.strategies.fcrDUp = c.fcr; s.preferences.customerAncillaryShare = c.share;
  const o = runBatteryApp(s); if (o.status !== "ok") { res[c.id] = o.status; return; }
  const ce = customerEconomyFromResult(o.result, c.share);
  const alts = computeBatteryAlternatives(o.input, o.result, c.share);
  const sc = computeAncillaryScenario(o.input, o.result, c.share, 10);
  const model = buildReportModel({ outcome: o, language: "sv", customerEconomy: ce, targetPaybackYears: 10, alternatives: alts, ancillaryScenario: sc, now: new Date(2026, 9, 2), reportId: "X" });
  const { selectedResult, ...scLite } = (sc ?? {}) as any;
  res[c.id] = { summary: o.result.summary, potential: (o.result.diagnostics as any).ancillaryPowerPotential ?? null, ce, alts,
    sc: sc ? JSON.parse(JSON.stringify(scLite, (k, v) => (k === "selectedResult" ? undefined : v))) : null, raw: model.raw, text: collectReportText(model) };
});
writeFileSync(out, JSON.stringify(res));
