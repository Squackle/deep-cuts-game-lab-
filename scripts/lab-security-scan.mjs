// Read-only, tracked-source security guard. No remote requests, token values or Git history in output.
import {execFileSync} from "node:child_process";
import {readFileSync,lstatSync,appendFileSync} from "node:fs";
import {resolve,extname,basename,sep} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
const defaultRoot=fileURLToPath(new URL("../",import.meta.url));
const extensions=new Set([".js",".mjs",".cjs",".ts",".tsx",".jsx",".html",".css",".json",".jsonc",".yml",".yaml",".toml",".ini",".env",".md",".txt",".sh",".py",".sql",".pem",".key"]);
const config=new Set(["_headers","_redirects","_routes.json"]);
const rules=[
 ["private-key material",/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=]{32,}/],
 ["GitHub token shape",/\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
 ["GitHub fine-grained token shape",/\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
 ["live payment token shape",/\bsk_live_[A-Za-z0-9]{20,}\b/]
];
export function scanText(path,text){
 const findings=[];
 for(const [rule,pattern] of rules)if(pattern.test(text))findings.push({path,rule,severity:"high"});
 if(path.startsWith(".github/workflows/")){
  if(/^\s*pull_request_target\s*:/m.test(text))findings.push({path,rule:"privileged pull_request_target trigger requires separate review",severity:"high"});
  if(/^\s*permissions\s*:\s*(?:write-all|'write-all'|"write-all")\s*(?:#.*)?$/m.test(text))findings.push({path,rule:"unrestricted workflow token permissions",severity:"high"});
 }
 return findings;
}
export function scanRepository(root=defaultRoot,{maxFileBytes=8_000_000,maxTotalBytes=150_000_000}={}){
 root=resolve(root);
 const tracked=execFileSync("git",["ls-files","-z"],{cwd:root,maxBuffer:16_000_000,encoding:"utf8"}).split("\0").filter(Boolean);
 const result={scanned:0,bytes:0,omitted:0,omittedSample:[],findings:[]};
 const omit=(path,reason)=>{
  result.omitted++;
  if(result.omittedSample.length<25)result.omittedSample.push({path,reason});
  if(reason==="total byte budget"||path.startsWith(".github/workflows/")||path.startsWith("functions/")||basename(path).startsWith(".env")||[".pem",".key"].includes(extname(path).toLowerCase()))
   result.findings.push({path,rule:"required security scan coverage incomplete: "+reason,severity:"high"});
 };
 for(const path of tracked){
  const name=basename(path);
  if(!extensions.has(extname(name).toLowerCase())&&!name.startsWith(".env.")&&name!==".env"&&!config.has(name))continue;
  const full=resolve(root,path);
  if(!full.startsWith(root+sep))throw Error("Tracked path outside root");
  let info;
  try{info=lstatSync(full)}catch{omit(path,"unreadable candidate");continue}
  if(!info.isFile()){omit(path,"not a regular file");continue}
  if(info.size>maxFileBytes){omit(path,"per-file size limit");continue}
  if(result.bytes+info.size>maxTotalBytes){omit(path,"total byte budget");continue}
  const content=readFileSync(full);
  if(content.includes(0)){omit(path,"binary candidate");continue}
  result.bytes+=content.length;
  result.scanned++;
  result.findings.push(...scanText(path,content.toString("utf8")));
 }
 return result;
}
export function report(result){
 const lines=["# Game Lab source security guard","",
  "Tracked text files scanned: "+result.scanned+"; bytes: "+result.bytes+"; omitted candidates: "+result.omitted+".",
  "Potential credential/workflow findings: "+result.findings.length+".","",
  "Only file paths and rule names are reported. Findings require review; no matched values are emitted. This is not a Git-history, dependency, or production-security audit."];
 for(const f of result.findings)lines.push("- "+JSON.stringify(f.path)+": "+f.rule);
 if(result.omittedSample.length)lines.push("","Omitted candidate sample (up to 25):",...result.omittedSample.map(x=>"- "+JSON.stringify(x.path)+": "+x.reason));
 return lines.join("\n")+"\n";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=scanRepository();
 const summary=report(result);
 console.log(summary);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
 if(result.findings.length||result.scanned===0)process.exitCode=1;
}
