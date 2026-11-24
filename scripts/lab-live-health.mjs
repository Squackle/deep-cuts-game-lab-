import {pathToFileURL} from "node:url";
const ORIGIN="https://deep-cuts-game-lab.pages.dev";
export const routes=[
 ["/","Game Lab | Deep Cuts EDH"],
 ["/lab/","Game Lab | Deep Cuts EDH"],
 ["/hive-run/","Game Lab | Hive Run"],
 ["/stackbreaker/","Game Lab | Stackbreaker"],
 ["/mana-heist/","Game Lab | Mana Heist"],
 ["/graftbound/","GRAFTBOUND"],
 ["/archemancy/","ARCHEMANCY | Deep Cuts Game Lab"]
];
export async function checkRoute(path,marker,request=fetch){
 try{
  const response=await request(ORIGIN+path,{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"DeepCutsEDH-Lab-Health/1.0","Accept":"text/html"}});
  if(response.status!==200){await response.body?.cancel();return {path,ok:false,reason:"HTTP "+response.status};}
  if(!/^text\/html(?:;|$)/i.test(response.headers.get("content-type")??"")){await response.body?.cancel();return {path,ok:false,reason:"unexpected content type"};}
  const html=await response.text();
  const title=html.match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1]??"";
  if(!title.includes(marker))return {path,ok:false,reason:"missing expected game title"};
  if(path==="/"||path==="/lab/"){
   for(const [game] of routes.slice(2))if(!html.includes('href="'+game+'"'))return {path,ok:false,reason:"missing catalog link "+game};
  }
  return {path,ok:true,reason:"HTTP 200 and expected page identity"};
 }catch{return {path,ok:false,reason:"network or response-read failure"};}
}
export async function run(request=fetch){
 const results=[];
 // Sequential, low-volume, anonymous static GETs only. No scripts or game APIs executed.
 for(const [path,marker] of routes)results.push(await checkRoute(path,marker,request));
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const results=await run();
 for(const {path,ok,reason} of results)console.log((ok?"PASS":"FAIL")+" "+path+" — "+reason);
 if(results.some(x=>!x.ok))process.exitCode=1;
}
