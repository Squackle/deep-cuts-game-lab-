import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {fileURLToPath} from "node:url";import {dirname,resolve} from "node:path";
test("normal Mana Heist browser module graph does not require JSON import attributes",()=>{
 const root=fileURLToPath(new URL("../src/main.js",import.meta.url)),seen=new Set();
 function walk(path){if(seen.has(path))return;seen.add(path);const src=readFileSync(path,"utf8");assert.doesNotMatch(src,/\bwith\s*\{\s*type\s*:\s*["']json["']/,"Safari pre-17.2 parse regression in "+path);
 for(const match of src.matchAll(/(?:\bfrom\s*|\bimport\s*)["'](\.[^"']+)["']/g)){assert.ok(!match[1].endsWith(".json"),"JSON module in browser graph");walk(resolve(dirname(path),match[1]));}}
 walk(root);assert.ok(seen.size>15);
});