import { runBatteryEngine, toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import { buildInput } from "./harness";
import { computeGridLimits, dispatch } from "@/lib/lab/dispatch";
import { ancillaryPlan } from "@/lib/lab/ancillary";

function run(o: any) {
  const s = { id:"d", tag:"d", profile:"normal", hsc:null, econ:"NORMAL", strategies:{self:true,reduce:true,peak:true,fcr:true}, ...o };
  const input = buildInput(s as any);
  const res = runBatteryEngine(input);
  const cfg = toLabConfig(input);
  const series = toTimeSeries(cfg, input);
  const rec = res.summary.recommendation;
  const cap = rec.capacityKWh, pow = rec.recommendedPowerKw ?? rec.productPowerKw;
  const limits = computeGridLimits(cfg.grid);
  const rc = { ...cfg, ancillary: { ...cfg.ancillary, offeredPowerKw: res.summary.fcr.offeredPowerKw } };
  const plan = rc.strategies.ancillaryServices ? ancillaryPlan(rc.ancillary) : null;
  const d = dispatch({ series, battery: rc.battery, grid: rc.grid, strategies: rc.strategies, peak: rc.peakShaving, spot: rc.spot, flex: rc.flex, ancillary: plan, capacityKWh: cap, powerKw: pow } as any);
  return { res, cfg, series, d, limits, cap, pow };
}

// FI 40000/0 fuse16
const { res, series, d, limits, cap, pow } = run({ market:"FI", loadKWh:40000, pvKWh:0, fuseA:16, econ:"LOW", strategies:{self:false,reduce:false,peak:true,fcr:false} });
const w:any = d.window; const t = d.tallies;
console.log("cap/pow", cap, pow, "limits", limits, "unservedKWh", t.unservedKWh, "gridImportLimited", t.gridImportLimitedKWh, "peakThresholdLimited", t.peakThresholdLimitedKWh);
let shown = 0;
for (let h = 1; h < 8760 && shown < 6; h++) {
  const dSoc = d.socSeries[h] - d.socSeries[h-1];
  const net = dSoc >= 0 ? dSoc / w.chargeEff : dSoc * w.dischargeEff;
  const imp = d.importSeries[h], ex = d.exportSeries[h];
  const r = imp + series.pv[h] - series.load[h] - ex - net - (cap>0?(20/1000):0);
  const exportBinds = ex >= limits.operationalExportKw - 1e-6;
  const importBinds = imp >= limits.operationalImportKw - 1e-6;
  const un = r < -1e-3 && !importBinds ? -r : r > 1e-3 && !exportBinds && series.pv[h] <= series.load[h] ? r : 0;
  if (Math.abs(un) > 1e-2) {
    console.log("hour", h, {load:+series.load[h].toFixed(3), pv:series.pv[h], imp:+imp.toFixed(3), ex:+ex.toFixed(3), dSoc:+dSoc.toFixed(3), net:+net.toFixed(3), r:+r.toFixed(3), importBinds, exportBinds});
    shown++;
    continue;
  }
  if (false) {
    console.log("hour", h, {load:series.load[h], pv:series.pv[h], imp, ex, dSoc, net, r, thr: d.monthlyPeakThresholdKw[Math.floor(h/730)]});
    shown++;
  }
}
console.log("unserved summary", res.summary.grid.unservedLoadKWh, "gridBound", res.summary.grid.unservedIsGridBound);
