// Regrade stored real outputs without spending quota. --report ABS.json --out ABS.json
// Fresh runs: node tools/eval-jane-live.mjs --out ABS.json [--case ID]
import fs from 'node:fs';
import path from 'node:path';
import { JANE_QUALITY_CASES, scoreJaneReply } from './jane-quality-cases.mjs';
const arg = name => process.argv[process.argv.indexOf(name)+1];
if (!process.argv.includes('--report') || !process.argv.includes('--out') || !path.isAbsolute(arg('--report')||'') || !path.isAbsolute(arg('--out')||'')) throw Error('Pass absolute --report and --out paths.');
const input = JSON.parse(fs.readFileSync(arg('--report'),'utf8'));
const results = input.results.map(row=>{
  const item=JANE_QUALITY_CASES.find(item=>item.id===row.id);
  return !item || !row.text ? {...row, quality_status:'not_evaluated'} : {...row, quality:scoreJaneReply(item,row.text,{results:row.lookups||[]})};
});
fs.writeFileSync(arg('--out'),JSON.stringify({source_report:arg('--report'),at:new Date().toISOString(),human_approved:false,results},null,2));
console.log(JSON.stringify({ evaluated:results.filter(row=>row.quality).length, flagged:results.filter(row=>row.quality && !row.quality.automated_pass).map(row=>row.id), human_approved:false }));
