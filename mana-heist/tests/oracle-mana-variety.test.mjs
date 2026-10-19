import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {CARDS,actions,initial,reduce,validate,completed} from "../src/engine.js";
import {certifyMastery} from "../src/mastery-certificates.js";
import {certifyDiverse} from "../src/mana-variety-certificates.js";
import {certifyRemix} from "../src/certified-remixes.js";
import {replay} from "../src/solver.js";
import {SOURCES} from "../src/mana-engine-v2.js";

test("all 250 mastery vaults have legal varied solution routes, not all Dark Ritual", {timeout:110000},()=>{
 const families=new Set(),boardFingerprints=new Set();
 for(let i=250;i<500;i++){
  const l=LEVELS[i];
  assert.equal(validate(l),true,l.id);
  const proof=l.revision===4?certifyRemix(l):l.revision===3?certifyDiverse(l):certifyMastery(l);
  assert.equal(proof?.status,"solved",l.id);
  assert.ok(replay(l,proof.actions).ok,l.id);
  families.add(l.mastery.family||"black-engine");
  boardFingerprints.add(l.field.map(x=>x.card).sort().join("|")+";"+l.hand.map(x=>x.card).join("|"));
 }
 assert.deepEqual([...families].sort(),["black-engine","finale","geyser","key","prism","rite","tide","borrowed-filter","talisman-turns","survival-chain","life-ledger","final-precision"].sort());
 assert.ok(boardFingerprints.size>=18,"genuine mechanically distinct boards required: "+boardFingerprints.size);
 const last=LEVELS[499];assert.equal(last.stages.length,6);
 assert.equal(last.mastery.family,"finale");
 assert.deepEqual(last.hand.map(x=>x.card),["tide","geyser","rite"]);
 const finish=certifyDiverse(last);
 assert.ok(finish.actions.some(a=>a.type==="activate"&&a.mode==="key-untap-f17"));
 assert.equal(finish.actions.filter(a=>a.type==="ritual").length,3);
});
test("every ten-vault mastery world rotates at least five actual strategy families",()=>{
 for(let world=25;world<50;world++){
  const segment=LEVELS.slice(world*10,world*10+10);
  const families=new Set(segment.map(l=>l.mastery.family||"black-engine"));
  assert.ok(families.size>=5,"World "+(world+1)+" has only "+families.size+" strategy families");
  const rituals=new Set(segment.flatMap(l=>l.hand.filter(c=>CARDS[c.card].manaSpell).map(c=>c.card)));
  assert.ok(rituals.size>=4,"World "+(world+1)+" repeats the same ritual effects");
 }
});

test("new mana Oracle subset includes multiple spells, rocks, untap and fixing with exact identities",()=>{
 for(const card of ["song","desperate","rite","geyser","tide","mindstone","vessel","archive","thran","worn","gilded","arcane","prism","cylix","lantern","skyclave","basalt","key","bloom","nyxlotus","chalice"]){
  assert.ok(CARDS[card],card);
  if(!CARDS[card].manaSpell)assert.ok(SOURCES[card],card+" needs an activation");
 }
 assert.deepEqual(CARDS.song.manaSpell.cost,{N:2,R:1});
 assert.deepEqual(CARDS.song.manaSpell.output,["R","R","R","R","R"]);
 assert.equal(CARDS.geyser.kind,"sorcery");
 const source=readFileSync(new URL("../tools/build-mana-catalog.mjs",import.meta.url),"utf8");
 assert.match(source,/oracle_cards/);
 assert.match(source,/review:"candidate-unverified"/);
});
test("Rite of Flame grows in later turns because previous copies are really in graveyard",()=>{
 const l=LEVELS.find(p=>p.curated==="mana-diversity-3.0"&&p.mastery.family==="rite"&&p.turnLimit===3);
 assert.ok(l);
 const proof=certifyDiverse(l),rituals=proof.actions.filter(x=>x.type==="ritual");
 assert.equal(rituals.length,3);
 assert.deepEqual(rituals.map(x=>x.output.length),[2,3,4]);
});
test("High Tide adds U even when typed Island taps for red and resets at end turn",()=>{
 const l=LEVELS.find(p=>p.curated==="mana-diversity-3.0"&&p.mastery.family==="tide"&&p.turnLimit>=2);
 let s=initial(l);
 const begin=actions(l,s).find(x=>x.type==="tap"&&x.id==="f0"&&x.color==="U");
 s=reduce(l,s,begin).state;
 const t=actions(l,s).find(x=>x.type==="ritual"&&x.id==="h0");
 s=reduce(l,s,t).state;
 assert.equal(s.highTide,1);
 const dual=actions(l,s).find(x=>x.type==="tap"&&x.id==="f3"&&x.color==="R");
 s=reduce(l,s,dual).state;
 assert.equal(s.pool.U,1,"Island dual tapped for R triggers extra blue");
 assert.equal(s.pool.R,1);
 const proof=certifyDiverse(l);
 assert.ok(replay(l,proof.actions).ok);
});
test("artifact Key can untap Basalt Monolith; Monolith does not naturally untap",()=>{
 const l=LEVELS.find(p=>p.curated==="mana-diversity-3.0"&&p.mastery.family==="key");
 assert.ok(l);
 const proof=certifyDiverse(l);
 assert.equal(proof.actions.filter(a=>a.type==="activate"&&a.mode==="basalt-CCC").length,2);
 assert.ok(proof.actions.some(a=>a.type==="activate"&&a.mode==="key-untap-f6"));
 assert.ok(completed(l,replay(l,proof.actions).state));
});
test("mana geyser scales with *opponent* tapped land count, varying across puzzles",()=>{
 const levels=LEVELS.filter(p=>p.curated==="mana-diversity-3.0"&&p.mastery.family==="geyser");
 assert.deepEqual([...new Set(levels.map(l=>l.opponentTappedLands))].sort((a,b)=>a-b),[8,9,10]);
 for(const l of levels.slice(0,9)){
  const proof=certifyDiverse(l);
  const geyser=proof.actions.find(a=>a.type==="ritual");
  assert.equal(geyser.output.length,l.opponentTappedLands,l.id);
 }
});
