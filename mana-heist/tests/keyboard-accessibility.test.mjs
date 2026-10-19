import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS} from "../src/expanded-learn.js";
import {BONUS_TRIALS} from "../src/bonus-trials.js";
import {RACK_NAV_KEYS,cardNavigationIndex,navigateCardRack} from "../src/keyboard-rack.js";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function rack(length){
 const tracker={focused:null,scrolled:null};
 const nodes=Array.from({length},(_,i)=>({
  id:"f"+i,disabled:false,hidden:false,
  closest(sel){return sel===".land-card[data-cardid]"?this:null;},
  focus(opts){tracker.focused={id:this.id,opts};},
  scrollIntoView(opts){tracker.scrolled={id:this.id,opts};}
 }));
 const zone={contains:n=>nodes.includes(n),querySelectorAll:sel=>sel===".land-card[data-cardid]"?nodes:[]};
 const event=(i,key,mods={})=>({
  target:nodes[i],key,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,...mods,
  prevented:false,preventDefault(){this.prevented=true;}
 });
 return {nodes,zone,event,tracker};
}
test("card racks support arrows, Home, End with deterministic boundaries",()=>{
 assert.deepEqual([...RACK_NAV_KEYS],["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]);
 assert.equal(cardNavigationIndex(2,5,"ArrowLeft"),1);
 assert.equal(cardNavigationIndex(2,5,"ArrowUp"),1);
 assert.equal(cardNavigationIndex(2,5,"ArrowRight"),3);
 assert.equal(cardNavigationIndex(2,5,"ArrowDown"),3);
 assert.equal(cardNavigationIndex(2,5,"Home"),0);
 assert.equal(cardNavigationIndex(2,5,"End"),4);
 assert.equal(cardNavigationIndex(0,5,"ArrowLeft"),0);
 assert.equal(cardNavigationIndex(4,5,"ArrowRight"),4);
 assert.equal(cardNavigationIndex(0,1,"End"),0);
 assert.equal(cardNavigationIndex(0,0,"Home"),null);
 assert.equal(cardNavigationIndex(8,5,"Home"),null);
 assert.equal(cardNavigationIndex(2,5,"Enter"),null,"Enter must remain native button activation");
});
test("a focused card advances to the next live card and scrolls only as needed",()=>{
 const r=rack(10);
 const key=r.event(3,"ArrowRight");
 assert.equal(navigateCardRack(r.zone,key),true);
 assert.equal(key.prevented,true);
 assert.deepEqual(r.tracker.focused,{id:"f4",opts:{preventScroll:true}});
 assert.deepEqual(r.tracker.scrolled,{id:"f4",opts:{block:"nearest",inline:"nearest",behavior:"instant"}});
 r.nodes[4].disabled=true;
 const key2=r.event(3,"ArrowRight");
 assert.equal(navigateCardRack(r.zone,key2),true);
 assert.equal(r.tracker.focused.id,"f5");
});
test("Home, End and focus boundaries do not disturb Cast/Enter or modifier combos",()=>{
 const r=rack(3);
 const end=r.event(1,"End");
 assert.ok(navigateCardRack(r.zone,end));assert.equal(r.tracker.focused.id,"f2");
 const before=r.tracker.focused;
 assert.ok(navigateCardRack(r.zone,r.event(2,"ArrowRight")));
 assert.equal(r.tracker.focused,before,"already-at-end must not re-scroll");
 const enter=r.event(1,"Enter");
 assert.equal(navigateCardRack(r.zone,enter),false);
 assert.equal(enter.prevented,false);
 for(const mods of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true}]){
  const event=r.event(1,"Home",mods);
  assert.equal(navigateCardRack(r.zone,event),false);
  assert.equal(event.prevented,false);
 }
});
test("navigation never reaches outside active zone or steals focus from noncards",()=>{
 const r=rack(3),outsider={closest:()=>r.nodes[1]};
 assert.equal(navigateCardRack(r.zone,r.event(0,"Tab")),false);
 assert.equal(navigateCardRack(r.zone,{...r.event(0,"Home"),target:outsider}),true);
 const elsewhere=rack(2).nodes[0],outside={...r.event(0,"Home"),target:elsewhere};
 assert.equal(navigateCardRack(r.zone,outside),false);
 assert.equal(outside.prevented,false);
 assert.equal(navigateCardRack(null,r.event(0,"Home")),false);
});
test("key descriptions and visible focus are available without opening the guide",()=>{
 const html=read("index.html"),css=read("playtest-mobile.css"),ui=read("src/main.js");
 assert.match(html,/id="cardKeyboardHelp"/);
 assert.match(html,/aria-describedby="cardKeyboardHelp"/);
 assert.match(html,/role="group" aria-describedby="cardKeyboardHelp" aria-label="Curved hand/);
 assert.match(html,/Home and End jump to the first and last card/);
 assert.match(html,/Enter or Space selects or uses a card/);
 assert.match(css,/\.card-keyboard-instructions\{/);
 assert.match(css,/#battlefield \.land-card\.mtg-real-land:focus-visible/);
 assert.match(css,/#hand \.land-card\.mtg-real-land:focus-visible/);
 assert.match(ui,/import \{navigateCardRack\} from "\.\/keyboard-rack\.js"/);
 assert.match(ui,/if\(navigateCardRack\(el\(id\),e\)\)return/);
 assert.match(ui,/e\.key\.toLowerCase\(\)!=="i"/);
});
test("returning from a puzzle restores focus to the visible map, lesson, or QA launcher",()=>{
 const source=read("src/main.js");
 assert.match(source,/const wasPlaying=document\.body\.classList\.contains\("in-heist"\)/);
 assert.match(source,/const leavingTrial=trialIndex/);
 assert.match(source,/if\(wasPlaying\)\{/);
 assert.match(source,/mapLaunchFocus\?\.isConnected/);
 assert.match(source,/mapLaunchFocus\.closest\("\[hidden\]"\)/);
 assert.match(source,/\[data-trial-index=/);
 assert.match(source,/\[data-learn-level=/);
 assert.match(source,/\[data-level=/);
 assert.match(source,/\.focus\(\{preventScroll:true\}\)/);
 assert.match(source,/mapLaunchFocus=null;/);
 assert.match(source,/el\("campaignScreen"\)\.contains\(document\.activeElement\)/);
 assert.match(source,/mapLaunchFocus=document\.activeElement/);
});
test("accessibility release does not rewrite mana mechanics or player saved records",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(LEARN_LEVELS.length,28);
 assert.equal(BONUS_TRIALS.length,2);
 const source=read("src/main.js");
 for(const key of ["dc-mana-heist-landfall-v2","dc-mana-heist-variety-v1","dc-mana-heist-capstones-v1","dc-mana-heist-bonus-trials-v1","dc-mana-heist-certified-remixes-v1"])
 assert.match(source,key==="dc-mana-heist-bonus-trials-v1"?/BONUS_TRIAL_STORAGE_KEY/:key==="dc-mana-heist-certified-remixes-v1"?/REMIX_KEY/:new RegExp(key));
 assert.match(read("src/drag-lands.js"),/onDrop\(id\)/);
 assert.match(read("src/main.js"),/onInspect:id=>playLand\(id\)/);
});
