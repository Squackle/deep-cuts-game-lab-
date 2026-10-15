// Repository-specific PR ownership and cross-PR collision guard.
// Designed for an unprivileged pull_request workflow; only GET API calls.
import fs from "node:fs";
import {pathToFileURL} from "node:url";

const MAIN="Squackle/deep-cuts-edh";
const LAB="Squackle/deep-cuts-game-lab-";
const HIVE=/^(?:games\/hive-run\/|src\/hive-server\/|functions\/games\/hive-run\/|functions\/api\/hive-profile\.js$|hive-profile\.js$)/;
const COORD=/^(?:docs\/|\.github\/|scripts\/|tests\/|AGENTS\.md$|README\.md$|DEVLOG\.md$)/;

function field(body,key){
 const found=new RegExp("^"+key.replaceAll("/","\\/")+":\\s*(.*?)\\s*$","im").exec(body||"");
 return found?.[1]?.trim()||"";
}
function declared(value){
 return !!value&&!/^\[|^TODO\b|^TBD\b|^placeholder\b/i.test(value);
}
export function validatePR({repo,body,files}){
 const problems=[],lane=field(body,"Workstream");
 const allowed=repo===MAIN?["Website","Game Lab Promotion","Coordination"]:
  repo===LAB?["Game Lab","Coordination"]:[];
 if(!allowed.includes(lane))problems.push("Set Workstream to "+allowed.join(" / ")+".");
 for(const key of ["Owner authorization","Files/Scope","Concurrent work","Test plan","Rollback"]){
  if(!declared(field(body,key)))problems.push("Complete PR field: "+key+".");
 }
 if(lane==="Coordination"){
  const runtime=files.filter(p=>!COORD.test(p));
  if(runtime.length)problems.push("Coordination PR may not change runtime paths: "+runtime.join(", "));
 }
 if(repo===MAIN&&files.some(p=>HIVE.test(p))){
  if(lane!=="Game Lab Promotion")problems.push("Production Hive Run changes require Workstream: Game Lab Promotion.");
  if(!/^[0-9a-f]{40}$/i.test(field(body,"Lab source SHA")))
   problems.push("Provide full 40-character tested Lab source SHA.");
  if(!/^hive-\d+\.\d+(?:\.\d+)?(?:[-.][a-z0-9]+)*$/i.test(field(body,"Rules version")))
   problems.push("Provide real Rules version (e.g., hive-1.3).");
  if(!declared(field(body,"Score/replay validation")))
   problems.push("Provide Score/replay validation evidence.");
 }
 if(repo===LAB&&lane==="Game Lab"){
  if(!declared(field(body,"Rules version")))problems.push("Document Rules version, or explicitly 'unchanged'.");
  if(!declared(field(body,"Main-site impact")))problems.push("Document Main-site impact.");
 }
 return problems;
}
export function findOverlaps(thisFiles,otherPRs,currentNumber){
 const ours=new Set(thisFiles);
 return otherPRs
  .filter(p=>p.number<currentNumber)
  .map(p=>({number:p.number,title:p.title||"",shared:p.files.filter(x=>ours.has(x))}))
  .filter(p=>p.shared.length>0);
}
async function githubGet(repo,path,token){
 const response=await fetch("https://api.github.com/repos/"+repo+path,{
  headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
   "X-GitHub-Api-Version":"2022-11-28","User-Agent":"DeepCutsEDH-release-coordination"}
 });
 if(!response.ok)throw new Error("GitHub API "+response.status+" for "+path);
 return response.json();
}
async function pages(repo,path,token){
 let out=[];
 for(let page=1;page<=5;page++){
  const slice=await githubGet(repo,path+(path.includes("?")?"&":"?")+"per_page=100&page="+page,token);
  if(!Array.isArray(slice))throw new Error("Expected array for "+path);
  out=out.concat(slice);
  if(slice.length<100)return out;
 }
 throw new Error("More than 500 records; refusing incomplete collision assessment");
}
export async function checkCurrentPullRequest(env=process.env){
 if(!env.GITHUB_EVENT_PATH||!env.GITHUB_REPOSITORY||!env.GITHUB_TOKEN)
  throw new Error("Missing GitHub Actions PR event, repository or read-only API token");
 const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,"utf8"));
 const pr=event.pull_request;
 if(!pr?.number)throw new Error("This check requires a pull_request event");
 const repo=env.GITHUB_REPOSITORY,token=env.GITHUB_TOKEN;
 if(repo!==MAIN&&repo!==LAB)throw new Error("Unknown repository");
 const ours=(await pages(repo,"/pulls/"+pr.number+"/files",token)).map(x=>x.filename);
 const failures=validatePR({repo,body:pr.body,files:ours});
 const open=await pages(repo,"/pulls?state=open",token);
 const older=open.filter(p=>p.number<pr.number);
 const peers=await Promise.all(older.map(async p=>({
  number:p.number,title:p.title,
  files:(await pages(repo,"/pulls/"+p.number+"/files",token)).map(x=>x.filename)
 })));
 const collisions=findOverlaps(ours,peers,pr.number);
 for(const c of collisions)
  failures.push("File overlap with earlier open PR #"+c.number+" ("+c.title+"): "+
   c.shared.join(", ")+". Wait for it to finish, then update and re-test this branch.");
 console.log("Coordination: "+repo+" PR #"+pr.number+
  " | workstream="+field(pr.body,"Workstream")+
  " | files="+ours.length+" | older open PRs="+older.length);
 for(const issue of failures)console.error("::error::"+issue.replaceAll("\n"," "));
 if(failures.length)throw new Error(failures.length+" release coordination issue(s) require resolution");
 console.log("No conflicting older open PR or workstream policy violation.");
 return {files:ours,older:older.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 checkCurrentPullRequest().catch(e=>{console.error(e.message);process.exitCode=1});
