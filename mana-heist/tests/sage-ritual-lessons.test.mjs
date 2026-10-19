import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS,EXTRA_LESSONS} from "../src/expanded-learn.js";
import {SAGE_LESSONS,lessonNote,relevantLesson} from "../src/sage-lessons.js";
import {LEARN_COUNT,LEARN_GROUPS} from "../src/learn-track.js";
import {CARDS,actions,reduce,initial,completed,validate} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("all twenty-eight authored Sage lessons have actual unique objectives and specific notes",()=>{
 assert.equal(LEARN_COUNT,28);assert.equal(LEARN_LEVELS.length,28);
 assert.equal(EXTRA_LESSONS.length,10);
 assert.equal(SAGE_LESSONS.length,28);
 assert.deepEqual(LEARN_GROUPS.flatMap(g=>g.indices).sort((a,b)=>a-b),Array.from({length:28},(_,i)=>i));
 assert.deepEqual(LEARN_LEVELS.slice(0,18).map(l=>l.id),LEVELS.slice(0,18).map(l=>l.id));
 for(let i=0;i<28;i++){
  const l=LEARN_LEVELS[i],s=initial(l),n=lessonNote(i,l,s);
  assert.ok(n?.title&&n?.body&&n.why,l.id+" should contain meaningful hints");
  assert.ok(n.body.length>55,l.id+" too short");
  assert.equal(validate(l),true);
 }
 const mixed=lessonNote(4,LEARN_LEVELS[4],{...initial(LEARN_LEVELS[4]),stage:1,pool:{W:0,U:1,B:0,R:1,G:0,C:0}});
 assert.equal(mixed.mixed,true);assert.match(mixed.body,/CAST SPELL/);
 assert.equal(relevantLesson(EXTRA_LESSONS[2]),20);
 assert.equal(relevantLesson(EXTRA_LESSONS[6]),24);
});
test("Sol Ring, Signet, both rituals, filtered mana and Coffers lessons are solver validated", {timeout:90000},()=>{
 for(const l of EXTRA_LESSONS){
  const result=solve(l,{maxStates:140000});
  assert.equal(result.status,"solved",l.id+" "+JSON.stringify(result));
  assert.ok(result.turn<=l.turnLimit,l.id);
  assert.ok(replay(l,result.actions).ok,l.id);
 }
});
test("Dark Ritual spends black, produces exactly three black and goes to graveyard",()=>{
 const l=EXTRA_LESSONS[2],start=initial(l);
 const tap=actions(l,start).find(a=>a.type==="tap"&&a.color==="B");
 const withBlack=reduce(l,start,tap).state;
 const ritual=actions(l,withBlack).find(a=>a.type==="ritual");
 assert.ok(ritual);
 const after=reduce(l,withBlack,ritual).state;
 assert.equal(after.pool.B,3);
 assert.equal(after.hand.length,0);assert.deepEqual(after.graveyard,["h0"]);
 assert.ok(actions(l,after).some(a=>a.type==="cast"));
 assert.ok(completed(l,reduce(l,after,actions(l,after).find(a=>a.type==="cast")).state));
 assert.equal(CARDS.ritual.kind,"instant");
});
test("red mana ritual costs red plus generic before producing three red",()=>{
 const l=EXTRA_LESSONS[4];let s=initial(l);
 assert.equal(actions(l,s).some(a=>a.type==="ritual"),false);
 for(const c of ["f0","f1"]){const a=actions(l,s).find(x=>x.type==="tap"&&x.id===c);s=reduce(l,s,a).state;}
 const cast=actions(l,s).find(a=>a.type==="ritual");assert.ok(cast);
 const next=reduce(l,s,cast).state;
 assert.equal(next.pool.R,3);assert.equal(next.pool.C,0);
 assert.equal(next.graveyard.length,1);
});
test("sideways card and result uses corrected bounded rendering, not old 520px modal",()=>{
 const css=read("sage-and-card-fixes.css"),ui=read("src/main.js");
 assert.match(css,/is-tapped \.mtg-card-image/);
 assert.match(css,/rotate\(90deg\)!important/);
 assert.match(css,/#winPanel\.win:not\(\[hidden\]\)/);
 assert.match(css,/height:auto!important/);
 assert.match(css,/#sageNotes\.sage-notes:not\(\[hidden\]\)/);
 assert.match(ui,/magnifier\.hide\(\)/);
 assert.match(ui,/SAGE_LESSONS\[index\]\?\.why/);
 assert.match(ui,/playSelectedLand"\)\.textContent=.*CAST MANA SPELL/);
 assert.match(ui,/new URL\("\.\.\/sage-and-card-fixes\.css"/);
});
