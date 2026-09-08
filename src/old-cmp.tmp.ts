import { buildLoadSeries, buildPvSeries, shapeDeviationOf } from "@/lib/lab/profiles";
import { defaultConfig, MONTH_DAYS } from "@/lib/lab/defaults";
const C = defaultConfig();
const LOAD_MONTHS = [2560,2280,2080,1620,1220,900,800,860,1160,1620,2120,2760];
const PV_MONTHS = [140,380,950,1500,1900,2050,2000,1650,1150,620,250,110];
const ranges: {start:number;end:number}[] = [];
let c=0; for (const d of MONTH_DAYS){ranges.push({start:c,end:c+d*24}); c+=d*24;}
function oldReshape(load:number[],pv:number[],k:number){
  if(k===0) return load; const out=[...load]; const mix=Math.min(1,Math.abs(k));
  for(const {start,end} of ranges){let pvSum=0,pvMax=0,mt=0;
    for(let h=start;h<end;h++){const v=pv[h]!;pvSum+=v;if(v>pvMax)pvMax=v;mt+=load[h]!;}
    if(pvSum<=0||mt<=0)continue;
    const rw=(h:number)=>k>0?pv[h]!:Math.max(0,pvMax-pv[h]!);
    let rs=0;for(let h=start;h<end;h++)rs+=rw(h); if(rs<=0)continue;
    let s=0;for(let h=start;h<end;h++){const v=(1-mix)*load[h]!+mix*mt*(rw(h)/rs);out[h]=Math.max(0,v);s+=out[h]!;}
    const sc=mt/s;for(let h=start;h<end;h++)out[h]=out[h]!*sc;}
  return out;}
const pv = buildPvSeries({...C.solar,enabled:true,monthlyKWh:PV_MONTHS,inverterAcKw:12} as never).pv;
const pvTot = pv.reduce((a,b)=>a+b,0);
const pct=(l:number[])=>l.reduce((a,v,i)=>a+Math.min(v,pv[i]!),0)/pvTot*100;
for(const p of ["normal","evening-heavy","heat-pump","ev-evening"]){
  const load=buildLoadSeries({...C.consumption,shape:p as never,monthlyKWh:LOAD_MONTHS} as never);
  let lo=-1,hi=1;for(let i=0;i<44;i++){const m=(lo+hi)/2;if(pct(oldReshape(load,pv,m))<45)lo=m;else hi=m;}
  const k=(lo+hi)/2;const cal=oldReshape(load,pv,k);
  console.log(p,"OLD k=",k.toFixed(3),"ach=",pct(cal).toFixed(1),"dev=",shapeDeviationOf(load,cal).toFixed(3),"peak=",Math.max(...cal).toFixed(2));
}
