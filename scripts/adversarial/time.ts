import { checkScenario } from "../stress/harness";
for (const load of [5000, 100000]) {
  const t0 = Date.now();
  const r = checkScenario({id:"T",tag:"t",market:"SE",loadKWh:load,pvKWh:load/2,profile:"normal",fuseA:63,hsc:null,strategies:{self:true,reduce:true,peak:true,fcr:true},econ:"NORMAL"} as any);
  console.log(load, Date.now()-t0, "ms", r.capKWh, r.powKw, r.physKw, Math.round(r.benefit ?? 0));
}
