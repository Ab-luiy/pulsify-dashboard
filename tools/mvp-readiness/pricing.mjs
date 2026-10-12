// Planning scenarios, not observed costs, vendor quotes, or revenue forecasts.
import fs from 'node:fs';
const hourly=50, weeks=13;
const scenarios=[
 {name:'lean',setupHours:20,weeklyHours:3,production:600,tools:300},
 {name:'working',setupHours:25,weeklyHours:5,production:1200,tools:450},
 {name:'heavy',setupHours:40,weeklyHours:8,production:2400,tools:600},
].map(s=>{
 const hours=s.setupHours+weeks*s.weeklyHours;
 const cost=hours*hourly+s.production+s.tools;
 const options=[{base:5000,share:.30},{base:10000,share:.25}].map(p=>({...p,
  marginWithNoPerformance:(p.base-cost)/p.base,
  revenueNeededToBreakEven:Math.max(0,(cost-p.base)/p.share),
  revenueFor50PercentDeliveryMargin:Math.max(0,(cost/.5-p.base)/p.share),
  feeAt:[0,30000,60000,100000].map(revenue=>({attributableCollections:revenue,fee:p.base+p.share*revenue})),
 }));
 return {...s,hours,cost,options};
});
fs.writeFileSync('output/mvp-readiness-2026-10-12/pricing-model.json',JSON.stringify({hypothetical:true,hourly,weeks,excludes:['acquisition','tax','fixed overhead','refunds','uncapped continuation'],scenarios},null,2));
console.log(JSON.stringify(scenarios,null,2));
