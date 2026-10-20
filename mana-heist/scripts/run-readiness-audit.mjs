#!/usr/bin/env node
// Reproducible audit. Produces no historical score changes or network calls.
import {writeFileSync} from "node:fs";
import {auditLegalRoutes,auditCsv} from "../src/readiness-audit.js";
const outputJson=process.argv.find(x=>x.startsWith("--json="))?.slice(7);
const outputCsv=process.argv.find(x=>x.startsWith("--csv="))?.slice(6);
const report=auditLegalRoutes();
console.log("MANA_HEIST_READINESS_SUMMARY "+JSON.stringify(report.summary));
for(const g of report.galaxies)console.log("GALAXY "+g.galaxy+" "+JSON.stringify(g));
const problems=report.rows.filter(r=>r.proofStatus!=="legal-replay");
for(const p of problems.slice(0,30))console.error("REFERENCE_ISSUE "+p.id+" "+p.proofStatus+" "+p.proofError);
if(outputJson){writeFileSync(outputJson,JSON.stringify(report,null,2)+"\n","utf8");console.log("WROTE_JSON "+outputJson);}
if(outputCsv){writeFileSync(outputCsv,auditCsv(report),"utf8");console.log("WROTE_CSV "+outputCsv);}
if(problems.length){console.error("AUDIT_NOT_ACCEPTED "+problems.length+" unresolved or failed reference replays");process.exitCode=1;}
else console.log("ALL_500_LEGAL_REFERENCES_REPLAYED (NOT optimality, uniqueness, beginner or human QA certification)");
