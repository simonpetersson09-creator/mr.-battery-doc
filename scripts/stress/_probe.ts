import { runBatteryEngine } from "@/lib/battery-engine";
import { buildInput } from "./harness";
const s: any = { id:"x", tag:"t", market:"DK1", loadKWh:10000, pvKWh:5000, profile:"day-heavy", fuseA:25, hsc:45,
  strategies:{self:true,reduce:true,peak:true,fcr:true}, econ:"NORMAL" };
const r = runBatteryEngine(buildInput(s));
console.log(JSON.stringify(r.summary.economy, null, 1));
console.log("fcr", JSON.stringify({g:r.summary.fcr.grossSek, inc:r.summary.fcr.incrementalNetSek, opp:r.summary.fcr.opportunityCostSek, held:r.summary.fcr.avgHeldPowerKw, label:r.summary.fcr.label}));
