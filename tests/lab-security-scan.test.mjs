import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {scanText,scanRepository,report} from "../scripts/lab-security-scan.mjs";
test("secret-shaped values are detected without returning the value",()=>{
 const value="gh"+"p_"+"a".repeat(36);
 const result=scanText("src/example.js","const example='"+value+"';");
 assert.equal(result.length,1);
 assert.equal(result[0].rule,"GitHub token shape");
 assert.ok(!JSON.stringify(result).includes(value));
 assert.ok(!report({scanned:1,bytes:100,omitted:0,omittedSample:[],findings:result}).includes(value));
});
test("private-key marker must have key-like material; placeholders remain allowed",()=>{
 assert.equal(scanText("docs/example.md","-----BEGIN PRIVATE KEY-----\n<placeholder>").length,0);
 const value="A".repeat(48);
 assert.equal(scanText("test.pem","-----BEGIN PRIVATE KEY-----\n"+value)[0].rule,"private-key material");
});
test("workflow guard flags elevated triggers and all-write permissions only in workflows",()=>{
 const yml="on:\n  pull_request_"+"target:\npermissions: "+"write-all\n";
 assert.equal(scanText(".github/workflows/example.yml",yml).length,2);
 assert.equal(scanText("docs/workflow.md",yml).length,0);
 assert.deepEqual(scanText(".github/workflows/example.yml","on:\n  pull_request:\npermissions:\n  contents: read"),[]);
 for(const quote of ["'",'"']){
  const configuration="permissions: "+quote+"write-all"+quote+" # workflow default";
  assert.equal(scanText(".github/workflows/example.yml",configuration)[0]?.rule,"unrestricted workflow token permissions");
 }
});
test("tracked scan ignores untracked files and records omissions without exposing file contents",()=>{
 const root=mkdtempSync(join(tmpdir(),"dc-lab-scan-"));
 try{
  execFileSync("git",["init","-q"],{cwd:root});
  mkdirSync(join(root,"functions"));
  writeFileSync(join(root,"a.js"),"let x=1;");
  writeFileSync(join(root,"b.txt"),"x".repeat(30));
  writeFileSync(join(root,"archive.PEM"),"x".repeat(30));
  writeFileSync(join(root,"functions","api.js"),"x".repeat(30));
  writeFileSync(join(root,"untracked.js"),"gh"+"p_"+"x".repeat(36));
  execFileSync("git",["add","a.js","b.txt","archive.PEM","functions/api.js"],{cwd:root});
  const result=scanRepository(root,{maxFileBytes:20,maxTotalBytes:100});
  assert.equal(result.scanned,1);
  assert.equal(result.omitted,3);
  assert.deepEqual(result.findings.map(f=>f.path),["archive.PEM","functions/api.js"]);
  assert.ok(!report(result).includes("x".repeat(30)));
  const capped=scanRepository(root,{maxFileBytes:100,maxTotalBytes:10});
  assert.ok(capped.findings.some(f=>f.rule.includes("total byte budget")));
 }finally{rmSync(root,{recursive:true,force:true});}
});
