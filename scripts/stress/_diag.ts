import { runBatteryEngine } from "@/lib/battery-engine";
import { buildInput, marketToSite } from "./harness";
import { toLabConfig, toTimeSeries } from "@/lib/battery-engine";
import { computeGridLimits, baseline, dispatch } from "@/lib/lab/dispatch";
import { ancillaryPlan } from "@/lib/lab/ancillary";

function mk(o: any) { return { id:"d", tag:"d", profile:"normal", hsc:null, econ:"NORMAL",
  strategies:{self:true,reduce:true,peak:true,fcr:true}, ...o }; }

// 1. C-rate case S0003: SE 5000/5000 fuse16 strat SR-F econ LOW
const a = mk({ market:"SE", loadKWh:5000, pvKWh:5000, fuseA:16, econ:"LOW", strategies:{self:true,reduce:true,peak:false,fcr:true} });
const ra = runBatteryEngine(buildInput(a as any));
const rec = ra.summary.recommendation;
console.log("C-RATE CASE", JSON.stringify({cap:rec.capacityKWh, rec:rec.recommendedPowerKw, prod:rec.productPowerKw, phys:rec.physicalPowerNeedKw, opt:rec.operatingOptimalPowerKw, status:rec.economicPowerSizingStatus, reason:rec.economicPowerSizingReason, options: ra.summary.powerOptions.map(o=>({kw:o.powerKw,c:o.cRate,sel:o.selected,tot:Math.round(o.totalOperatingBenefitSek)})), candidates: ra.diagnostics.economicPowerSizing.candidatePowersKw, maxC: ra.diagnostics.economicPowerSizing.maxProductCRate}));

// 2. symmetric reserve case DE 5000/0 fuse16
const b = mk({ market:"DE", loadKWh:5000, pvKWh:0, fuseA:16, econ:"HIGH", strategies:{self:true,reduce:false,peak:false,fcr:false} });
const rb = runBatteryEngine(buildInput(b as any));
console.log("DE anc enabled?", (rb.diagnostics.simulation.ancillary as any).enabled, "held", (rb.diagnostics.simulation.ancillary as any).heldPowerAvgKw, "mon", (rb.diagnostics.simulation.ancillary as any).monetizedPowerAvgKw, "gross", (rb.summary.economy as any).fcrGrossSek, "recMode",(rb.diagnostics.simulation.ancillary as any).reserveMode);
