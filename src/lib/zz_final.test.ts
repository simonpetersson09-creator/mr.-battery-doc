import { it, vi } from "vitest";
const rec: any = { soc: null, held: null };
vi.mock("@/lib/lab/dispatch", async (orig) => {
  const m: any = await orig();
  return { ...m, dispatch: (a: any) => { const o = m.dispatch(a); (rec.runs ??= []).push({ soc: o.socSeries, held: o.ancillaryReservedPowerKwByHour }); return o; } };
});
import { runBatteryEngine } from "@/lib/battery-engine";
import { fcrPriceSeriesForCountry } from "@/lib/lab/ancillary/prices";
import { FCR_ENDURANCE_HOURS } from "@/lib/lab/ancillary/countryMarkets";
import { reserveModeForMarket, marketProfileForPriceArea } from "@/lib/lab/ancillary";
import { localUnitsPerEur, currencyForCountry } from "@/lib/currency";
import { COUNTRIES } from "@/lib/country-config";
import { writeFileSync } from "fs";
it("final", () => {
  const out: string[] = [];
  out.push("COUNTRIES " + Object.keys(COUNTRIES).join(","));
  rec.runs = [];
  for (const cc of ["AT","CH","BE","FR","CZ","SI","DE"]) {
    const ser: any = fcrPriceSeriesForCountry(cc as any);
    const prof: any = marketProfileForPriceArea(cc as any);
    out.push(`CFG ${cc} mode=${reserveModeForMarket(cc as any)} endCfg=${(FCR_ENDURANCE_HOURS as any)[cc]} endProf=${prof.services.map((s:any)=>s.requirements.enduranceHours).join("/")} series=${ser?.market}|${ser?.source}|n=${ser?.pricesEurPerMw.length} cur=${currencyForCountry(cc as any)} rate=${localUnitsPerEur(cc as any)} avail=${prof.services.map((s:any)=>s.requirements.availabilityPct).join("/")} minBid=${prof.services.map((s:any)=>s.requirements.minBidKw ?? s.requirements.minimumBidKw).join("/")}`);
    for (const [p, c] of [[5,10],[10,15],[15,30],[50,100],[125,150]]) {
      const r: any = runBatteryEngine({
        site:{voltageV:400,phases:3,mainFuseA:250,country:cc as any,marketArea:null},
        consumption:{annualKWh:20000,profile:"normal"}, production:{enabled:true,annualKWh:10000,kWp:10},
        strategies:{selfConsumption:true,reduceImport:true,peakShaving:true,fcrDUp:true,optimiseFcrReservation:true},
        economy:{peakDemandChargeSekPerKwMonth:null,customerAncillaryShare:0.75,eurSekRate:localUnitsPerEur(cc as any)},
        battery:{fixedCapacityKWh:c,fixedPowerKw:p},
      } as any);
      const s = r.diagnostics.simulation, a = s.ancillary, cfg = r.diagnostics.config;
      const runs = rec.runs; rec.runs = [];
      const target = a.avgReservedPowerUpKw * 8760;
      const m = [...runs].reverse().find((x: any) => Math.abs(x.held.reduce((t: number, v: number) => t + v, 0) - target) < 1e-6 && Math.abs(x.soc[8759] - s.socEndKWh) < 1e-6);
      rec.soc = m?.soc ?? [NaN]; rec.held = m?.held ?? [];
      const soc = rec.soc!; const smin = Math.min(...soc), smax = Math.max(...soc);
      const lo = cfg.battery.minSocPct/100*c, hi = cfg.battery.maxSocPct/100*c;
      const held: number[] = rec.held;
      const rate = localUnitsPerEur(cc as any);
      const recon = held.length ? held.reduce((t:number,kw:number,h:number)=>t+kw/1000*ser.pricesEurPerMw[h],0)*rate : NaN;
      const gross = r.summary.fcr.grossSek ?? 0;
      const end = (FCR_ENDURANCE_HOURS as any)[cc] ?? 0.25+0.125+1/24;
      const conv = s.socCycleConverged && Math.abs(s.socEndKWh-s.socStartKWh) <= Math.max(1e-6, c*1e-4);
      const capOk = a.reservedPowerUpKw <= p/1.25+1e-9;
      const resOk = Math.abs(a.reservedEnergyUpKWh - a.reservedPowerUpKw*end) < 1e-6;
      const socOk = smin >= lo-1e-6 && smax <= hi+1e-6;
      const recOk = !held.length || Math.abs(recon-gross) <= Math.max(0.01, gross*1e-6);
      const pass = conv && capOk && resOk && socOk && s.energyBalance.ok && recOk;
      out.push(`ROW ${cc} ${p}/${c} off=${a.reservedPowerUpKw.toFixed(2)} held=${a.avgReservedPowerUpKw.toFixed(2)} max=${(p/1.25).toFixed(1)} resE=${a.reservedEnergyUpKWh.toFixed(2)} end=${end.toFixed(4)} soc=${s.socStartKWh.toFixed(3)}->${s.socEndKWh.toFixed(3)} sd=${s.selfDischargeKWh.toFixed(2)} smCh=${a.storageManagementChargeKWh.toFixed(2)} smDis=${a.storageManagementDischargeKWh.toFixed(2)} ch=${s.chargedKWh.toFixed(0)} dis=${s.dischargedKWh.toFixed(0)} socMinMax=${smin.toFixed(2)}/${smax.toFixed(2)} lim=${lo.toFixed(2)}/${hi.toFixed(2)} bal=${s.energyBalance.ok} gross=${gross.toFixed(2)} recon=${recon.toFixed(2)} cur=${currencyForCountry(cc as any)} it=${s.socCycleIterations} conv=${conv} ${pass?"PASS":"FAIL"}${!capOk?" cap":""}${!resOk?" res":""}${!socOk?" soc":""}${!recOk?" recon":""}`);
    }
  }
  writeFileSync("/tmp/de/final.out", out.join("\n"));
});
