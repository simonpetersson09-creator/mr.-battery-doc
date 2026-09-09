import { checkScenario } from "./harness";
import { buildScenarios } from "./scenarios";
const all = buildScenarios();
console.log("scenarios", all.length);
const t0=Date.now();
for (const s of [all[0], all[200], all[500]]) console.log(JSON.stringify(checkScenario(s)).slice(0,900));
console.log("ms", Date.now()-t0);
