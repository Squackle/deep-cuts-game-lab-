import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS} from "../src/expanded-learn.js";
import {BONUS_TRIALS} from "../src/bonus-trials.js";
import {
 BACKUP_FORMAT,BACKUP_VERSION,MAX_BACKUP_BYTES,SAVE_KEYS,
 readGuestSaves,createGuestBackup,parseGuestBackup,previewGuestRestore,applyGuestRestore
} from "../src/guest-backup.js";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const base=(id,turn=1,spentLife=0)=>({turn,spentLife});
const scored=(turn=1,spentLife=0,actions=3)=>({turn,spentLife,actions});
function example(){
 const capstone=LEVELS.find(l=>l.revision===1||l.revision===2);
 assert.ok(capstone,"versioned scored capstone for archival export");
 return {
  campaign:{v:2,index:123,bests:{"mh-01":base("mh-01",1,0),"mh-250":base("mh-250",2,0)}},
  capstones:{v:1,bests:{[capstone.id]:scored(2,1,15)}},
  variety:{v:1,bests:{"mh-251":scored(2,1,9)}},
  remixes:{v:1,bests:{"mh-251":scored(1,0,5)}},
  bonus:{v:1,bests:{"mh-bonus-01":{...scored(1,1,5),stars:2}}},
  learn:{v:1,completed:[0,1,26],last:26}
 };
}
function storage(initial={}){
 const data=new Map(Object.entries(initial));
 return {
  data,
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,value),
  removeItem:key=>data.delete(key)
 };
}
test("P12 exports exact six save namespaces; it never exports identity, consent, QA or opt-in metrics",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(LEARN_LEVELS.length,28);
 assert.equal(BONUS_TRIALS.length,2);
 assert.equal(BACKUP_FORMAT,"deep-cuts-mana-heist-guest-backup");
 assert.equal(BACKUP_VERSION,1);
 assert.equal(MAX_BACKUP_BYTES,262144);
 assert.deepEqual(Object.keys(SAVE_KEYS).sort(),["campaign","capstones","variety","remixes","bonus","learn"].sort());
 assert.ok(!Object.values(SAVE_KEYS).includes("dc-mana-heist-playtest-v1"));
 assert.ok(!Object.values(SAVE_KEYS).includes("dc-mana-heist-device-qa-v1"));
 assert.ok(!Object.values(SAVE_KEYS).includes("dc-mana-heist-playtest-optin-v1"));
 const text=createGuestBackup(example()),back=JSON.parse(text);
 assert.equal(back.format,BACKUP_FORMAT);
 assert.equal(back.version,1);
 assert.deepEqual(Object.keys(back.sections).sort(),Object.keys(SAVE_KEYS).sort());
 assert.ok(text.length<MAX_BACKUP_BYTES);
 const parsed=parseGuestBackup(text);
 assert.deepEqual(parsed,JSON.parse(createGuestBackup(parsed)).sections);
 assert.equal(parsed.campaign.index,123);
 assert.equal(parsed.variety.bests["mh-251"].actions,9);
 assert.equal(parsed.remixes.bests["mh-251"].actions,5);
 assert.deepEqual(parsed.learn.completed,[0,1,26]);
 assert.equal(parsed.bonus.bests["mh-bonus-01"].stars,2);
});
test("revised-board medals and archived version-three scores remain distinct",()=>{
 const old=example(),incoming=example();
 old.variety.bests["mh-251"]=scored(2,1,9);
 old.remixes.bests["mh-251"]=scored(1,0,5);
 incoming.variety.bests["mh-251"]=scored(1,0,6);
 incoming.remixes.bests["mh-251"]=scored(2,0,8);
 const plan=previewGuestRestore(old,parseGuestBackup(createGuestBackup(incoming)));
 assert.deepEqual(plan.sections.variety.bests["mh-251"],scored(1,0,6),"archive may be improved independently");
 assert.deepEqual(plan.sections.remixes.bests["mh-251"],scored(1,0,5),"current rev4 result not overwritten by worse");
 assert.equal(plan.groups.variety.improved,1);
 assert.equal(plan.groups.remixes.improved,0);
});
test("import merges better records, keeps stronger current ones and unions lesson completion",()=>{
 const local=example(),incoming=example();
 local.campaign.bests["mh-01"]=base("mh-01",1,0);
 incoming.campaign.bests["mh-01"]=base("mh-01",2,1);
 incoming.campaign.bests["mh-02"]=base("mh-02",1,0);
 incoming.campaign.index=499;
 local.learn.completed=[0,1,26];local.learn.last=26;
 incoming.learn.completed=[0,1,2,27];incoming.learn.last=27;
 incoming.bonus.bests["mh-bonus-01"]={...scored(1,0,5),stars:3};
 const result=previewGuestRestore(local,parseGuestBackup(createGuestBackup(incoming)));
 assert.equal(result.changed,true);
 assert.equal(result.sections.campaign.index,123,"existing active last stage stays");
 assert.deepEqual(result.sections.campaign.bests["mh-01"],base("mh-01",1,0));
 assert.deepEqual(result.sections.campaign.bests["mh-02"],base("mh-02",1,0));
 assert.deepEqual(result.sections.learn.completed,[0,1,2,26,27]);
 assert.equal(result.sections.learn.last,26);
 assert.equal(result.addedLessons,2);
 assert.equal(result.sections.bonus.bests["mh-bonus-01"].stars,3);
 assert.ok(result.added>=1);
 const empty=previewGuestRestore(null,local);
 assert.equal(empty.sections.campaign.index,123,"new browser restores last played index");
});
test("unsupported/wrong version and incomplete or oversized backup files are rejected before writes",()=>{
 const valid=JSON.parse(createGuestBackup(example()));
 const mutator=fn=>{const data=structuredClone(valid);fn(data);return JSON.stringify(data);};
 assert.throws(()=>parseGuestBackup("not valid json"),/valid JSON/);
 assert.throws(()=>parseGuestBackup('{"hello":"world"}'),/supported Mana Heist/);
 assert.throws(()=>parseGuestBackup("x".repeat(MAX_BACKUP_BYTES+1)),/oversized/);
 assert.throws(()=>parseGuestBackup(mutator(d=>d.version=2)),/supported Mana Heist/);
 assert.throws(()=>parseGuestBackup(mutator(d=>delete d.sections.learn)),/sections are incomplete/);
 assert.throws(()=>parseGuestBackup(mutator(d=>d.sections.profile={v:1})),/unsupported data/);
 assert.throws(()=>parseGuestBackup(mutator(d=>d.sections.campaign.v=1)),/Invalid or incompatible campaign/);
 assert.throws(()=>parseGuestBackup(mutator(d=>d.sections.learn.completed="all")),/Invalid lesson progress/);
});
test("malformed, unknown and impossible stage results are discarded not applied",()=>{
 const incoming=example();
 incoming.campaign.bests["mh-01"]={turn:0,spentLife:0};
 incoming.campaign.bests["fake-stage"]={turn:1,spentLife:0};
 incoming.campaign.bests["__proto__"]={turn:1,spentLife:0};
 incoming.learn.completed=[0,0,27,28,999,-1,"4"];
 incoming.capstones.bests["mh-01"]=scored(1,0,1);
 incoming.variety.bests["mh-01"]=scored(1,0,1);
 incoming.remixes.bests["mh-01"]=scored(1,0,1);
 incoming.remixes.bests["mh-251"]=scored(50,0,1);
 incoming.bonus.bests["mh-bonus-01"].stars=8;
 const sections=parseGuestBackup(createGuestBackup(incoming));
 assert.equal(Object.hasOwn(sections.campaign.bests,"mh-01"),false);
 assert.equal(Object.hasOwn(sections.campaign.bests,"fake-stage"),false);
 assert.equal(Object.hasOwn(sections.capstones.bests,"mh-01"),false);
 assert.equal(Object.hasOwn(sections.variety.bests,"mh-01"),false);
 assert.equal(Object.hasOwn(sections.remixes.bests,"mh-01"),false);
 assert.equal(Object.hasOwn(sections.remixes.bests,"mh-251"),false);
 assert.equal(Object.hasOwn(sections.bonus.bests,"mh-bonus-01"),false);
 assert.deepEqual(sections.learn.completed,[0,27]);
});
test("only approved progress keys are written, unrelated local data is untouched",()=>{
 const old=example(),incoming=example();
 incoming.campaign.bests["mh-03"]=base("mh-03",1,0);
 const source=storage({"dc-mana-heist-playtest-v1":"KEEP METRICS","dc-mana-heist-playtest-optin-v1":"yes","dc-mana-heist-device-qa-v1":"KEEP QA"});
 for(const [name,key] of Object.entries(SAVE_KEYS))source.setItem(key,JSON.stringify(old[name]));
 const plan=previewGuestRestore(readGuestSaves(key=>source.getItem(key)),incoming);
 assert.equal(plan.changed,true);
 assert.equal(applyGuestRestore(source,plan),true);
 assert.equal(source.getItem("dc-mana-heist-playtest-v1"),"KEEP METRICS");
 assert.equal(source.getItem("dc-mana-heist-device-qa-v1"),"KEEP QA");
 assert.equal(source.getItem("dc-mana-heist-playtest-optin-v1"),"yes");
 assert.deepEqual(Object.keys(JSON.parse(source.getItem(SAVE_KEYS.campaign)).bests).sort(),["mh-01","mh-03","mh-250"].sort());
 assert.deepEqual(JSON.parse(source.getItem(SAVE_KEYS.learn)).completed,[0,1,26]);
});
test("storage failures roll back previously written progress keys where possible",()=>{
 const initial={};
 for(const [name,key] of Object.entries(SAVE_KEYS))initial[key]=JSON.stringify(example()[name]);
 const s=storage(initial);let once=false;
 const failing={getItem:s.getItem,removeItem:s.removeItem,
  setItem(key,value){if(key===SAVE_KEYS.variety&&!once){once=true;throw Error("Quota exceeded");}s.setItem(key,value);}
 };
 assert.throws(()=>applyGuestRestore(failing,previewGuestRestore(null,example())),/Previous records were restored/);
 for(const [name,key] of Object.entries(SAVE_KEYS))assert.equal(s.getItem(key),initial[key],name+" stayed unchanged");
});
test("progress portability UI is explicit, file-size bounded, and refreshes after merge",()=>{
 const html=read("index.html"),ui=read("src/main.js"),css=read("playtest-mobile.css");
 for(const id of ["guestBackupPanel","guestBackupDownload","guestBackupCopy","guestBackupFile","guestBackupStatus","guestBackupImport","guestBackupText"])
  assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(html,/id="guestBackupImport" type="button" disabled/);
 assert.match(ui,/file\.size>MAX_BACKUP_BYTES/);
 assert.match(ui,/parseGuestBackup\(text\)/);
 assert.match(ui,/previewGuestRestore\(readGuestStorage\(\),incoming\)/);
 assert.match(ui,/window\.confirm\("Merge "/);
 assert.match(ui,/applyGuestRestore\(localStorage,plan\)/);
 assert.match(ui,/window\.location\.reload\(\)/);
 assert.match(ui,/a\.download="mana-heist-guest-backup-v1\.json"|anchor\.download="mana-heist-guest-backup-v1\.json"/);
 assert.match(css,/\.guest-backup>summary:focus-visible/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(read("src/guest-backup.js"),/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.|Date\.now\(/);
});
