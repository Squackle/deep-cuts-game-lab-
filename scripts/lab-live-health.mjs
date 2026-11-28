import {pathToFileURL} from "node:url";
import {appendFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
const ORIGIN="https://deep-cuts-game-lab.pages.dev";
export const routes=[
 ["/","Game Lab | Deep Cuts EDH"],
 ["/lab/","Game Lab | Deep Cuts EDH"],
 ["/hive-run/","Game Lab | Hive Run"],
 ["/stackbreaker/","Game Lab | Stackbreaker"],
 ["/mana-heist/","Game Lab | Mana Heist"],
 ["/graftbound/","GRAFTBOUND — Begin as nothing. Become everything."],
 ["/archemancy/","ARCHEMANCY | Deep Cuts Game Lab"]
];
export async function checkRoute(path,marker,request=fetch){
 try{
  const response=await request(ORIGIN+path,{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"DeepCutsEDH-Lab-Health/1.0","Accept":"text/html"}});
  if(response.status!==200){await response.body?.cancel();return {path,ok:false,reason:"HTTP "+response.status,retryable:response.status===408||response.status===429||response.status>=500};}
  if(!/^text\/html(?:;|$)/i.test(response.headers.get("content-type")??"")){await response.body?.cancel();return {path,ok:false,reason:"unexpected content type"};}
  const html=await response.text();
  const title=html.match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1]??"";
  if(title.trim()!==marker)return {path,ok:false,reason:"unexpected page title"};
  if(path==="/"||path==="/lab/"){
   for(const [game] of routes.slice(2))if(!html.includes('href="'+game+'"'))return {path,ok:false,reason:"missing catalog link "+game};
  }
  return {path,ok:true,reason:"HTTP 200 and expected page identity"};
 }catch{return {path,ok:false,reason:"network or response-read failure",retryable:true};}
}
export async function run(request=fetch,wait=()=>delay(1000)){
 const results=[];
 // Seven normal GETs, at most one retry per transient failure. Never retry a
 // wrong page identity, content type, unexpected redirect or other client error.
 for(const [path,marker] of routes){
  const first=await checkRoute(path,marker,request);
  if(first.ok||!first.retryable){results.push({...first,attempts:1});continue;}
  await wait();
  const second=await checkRoute(path,marker,request);
  results.push({...second,attempts:2,recovered:second.ok,firstFailure:first.reason});
 }
 return results;
}
export function summarize(results){
 const counts={healthy:0,recovered:0,failed:0};
 for(const result of results)counts[result.ok?(result.recovered?"recovered":"healthy"):"failed"]++;
 const lines=["# Lab deployed route health","",counts.healthy+" first-attempt healthy; "+counts.recovered+" transient recovered; "+counts.failed+" failed.",""];
 for(const {path,ok,recovered,reason,firstFailure,attempts} of results)
  lines.push("- "+(ok?(recovered?"RECOVERED":"PASS"):"FAIL")+" "+path+" — "+reason+" ("+attempts+" attempt"+(attempts===1?"":"s")+(firstFailure?"; first: "+firstFailure:"")+")");
 return lines.join("\n")+"\n";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const results=await run();
 const summary=summarize(results);
 console.log(summary);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
 if(results.some(x=>!x.ok))process.exitCode=1;
}
