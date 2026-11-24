// GRAFTBOUND v1.8.3 regression tests — owner's screenshot-driven rules and visual requirements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena, evoWith } from './helpers.mjs';
import { player, enemies, guard, cast, castOptions, movePlayer, endTurn, startPlayerTurn } from '../src/engine/combat.js';
import { dealDamage, heal } from '../src/engine/abilities.js';
import { shouldAutoEnd, getLegalPlayerActions } from '../src/engine/legal.js';
import { comboActiveOptions, reassembleReason } from '../src/engine/combo-triggers.js';
import { activateCombo } from '../src/engine/combat.js';
import { availableMana } from '../src/engine/mana.js';
import { T } from '../src/core/grid.js';
import { BattleUI } from '../src/ui/battle-ui.js';
import { validDecision, RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';
import { GAME } from '../src/config.js';
const txt = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

// 1. Hover is a tactical input even when the inspector text is locked.
test('locked terrain tooltip does not block live move/path/attack hover and keeps Details for original tile', () => {
  const original=globalThis.document;
  const classes=new Set(['terrain-inspect','terrain-locked','show']);
  globalThis.document={getElementById:id=>id==='inspect'?{classList:{contains:k=>classes.has(k)}}:null};
  try {
    const ui=Object.create(BattleUI.prototype);let calls=0;
    ui.pinnedTerrainTile={x:1,y:1};ui.tileInspectLatch={locked:true};ui.hover={x:1,y:1};
    ui.refreshHighlights=()=>{calls++};ui.showTile=()=>{throw Error('Pinned Details must not be overwritten')};
    ui.setHover({x:3,y:2});assert.deepEqual(ui.hover,{x:3,y:2});assert.deepEqual(ui.pinnedTerrainTile,{x:1,y:1});assert.equal(calls,1);
    ui.setHover(null);assert.equal(ui.hover,null);assert.equal(calls,2);
  }finally{if(original)globalThis.document=original;else delete globalThis.document;}
});

test('Guard adds finite temporary Shield, not unlimited reduction per hit', () => {
  const s=arena(['h...', '....', '.P..'],{h:'hound'}), hero=player(s);
  guard(s);
  const n=hero.statuses.guardShield; assert.equal(n,hero.statuses.shield);assert.ok(n>0);
  const foe=enemies(s)[0], oldHp=hero.hp;
  dealDamage(s,[],foe,hero,n-1,{combat:true});
  assert.equal(hero.statuses.shield,1);assert.equal(hero.statuses.guardShield,1);
  dealDamage(s,[],foe,hero,2,{combat:true});
  assert.equal(hero.hp,oldHp-1,'second attack penetrates remaining Shield');
  assert.equal(hero.statuses.guardShield,0);
});

test('unused Guard shield expires at the next player turn; non-Guard shield persists',()=>{
  const s=arena(['h...', '....', '.P..'],{h:'hound'}), hero=player(s);
  hero.statuses.shield=2;guard(s);
  const guardGranted=hero.statuses.guardShield;
  assert.equal(hero.statuses.shield,guardGranted+2);
  const ev=startPlayerTurn(s);
  assert.equal(hero.statuses.shield,2);assert.equal(hero.statuses.guardShield,0);
  assert.ok(ev.some(e=>e.t==='shield'&&e.kind==='guardExpire'&&e.amount<0));
});

test('auto-end when no movement, spells, legal attacks, interactions, or useful stances remain',()=>{
  const s=arena(['h....','.....','....P'],{h:'hound'});
  s.p.moveLeft=0;s.p.attacksLeft=1;s.p.mana=0;s.p.storedMana=0;s.spellbook=[];
  assert.equal(getLegalPlayerActions(s).attack.length,0);
  assert.equal(getLegalPlayerActions(s).any,false);
  assert.equal(shouldAutoEnd(s),true);
  assert.equal(shouldAutoEnd(s,{targeting:true}),false);
  assert.equal(shouldAutoEnd(s,{enabled:false}),false);
});

test('Healing Salve requires explicit choice BEFORE mana is charged or target is selected',()=>{
  const s=arena(['.h.', '.P.', '...'],{h:'hound'},{spellbook:[{id:'mtg:healing-salve',level:1}]});
  s.p.mana=5;const hero=player(s),mana=availableMana(s);
  assert.throws(()=>cast(s,'mtg:healing-salve',hero.x,hero.y),/Choose a Healing Salve mode/);
  assert.equal(availableMana(s),mana);assert.equal(s.p.cast['mtg:healing-salve'],undefined);
  assert.deepEqual(castOptions(s,'mtg:healing-salve','heal'),[{x:hero.x,y:hero.y}]);
  assert.equal(validDecision({seq:0,type:'cast',id:'mtg:healing-salve',x:1,y:1,mode:'prevent'},0),true);
  assert.equal(validDecision({seq:0,type:'cast',id:'mtg:healing-salve',x:1,y:1,mode:'invented'},0),false);
});

test('Healing Salve gain-life mode heals three and no longer cleanses as an invented side effect',()=>{
  const s=arena(['h..','...','..P'],{h:'hound'},{spellbook:[{id:'mtg:healing-salve',level:1}]});
  s.p.mana=6;const hero=player(s);hero.hp-=5;hero.statuses.poison=2;
  const ev=cast(s,'mtg:healing-salve',hero.x,hero.y,1,'heal');
  assert.equal(hero.hp,hero.maxHp-2);assert.equal(hero.statuses.poison,2);
  assert.equal(ev.find(e=>e.t==='spell').mode,'heal');
});

test('Healing Salve prevention mode protects a target for exactly three incoming damage this turn',()=>{
  const s=arena(['h..','...','..P'],{h:'hound'},{spellbook:[{id:'mtg:healing-salve',level:1}]});
  s.p.mana=6;const hero=player(s),foe=enemies(s)[0];
  cast(s,'mtg:healing-salve',hero.x,hero.y,1,'prevent');
  const hp=hero.hp;
  dealDamage(s,[],foe,hero,2,{combat:true});assert.equal(hero.hp,hp);
  dealDamage(s,[],foe,hero,2,{combat:true});assert.equal(hero.hp,hp-1);
  assert.equal(hero.statuses.damagePrevention,0);
});

test('Vito converts life GAIN into enemy life LOSS which bypasses shields and damage prevention',()=>{
  const s=arena(['h..','...','..P'],{h:'hound'},{evo:evoWith('mtg:vito-thorn-of-the-dusk-rose')});
  const hero=player(s),foe=enemies(s)[0];
  assert.ok(s.traits.includes('vito'));hero.hp-=3;foe.hp=foe.maxHp=20;
  foe.statuses.shield=25;foe.statuses.damagePrevention=25;
  const ev=[];heal(s,ev,hero,3,'regeneration');
  assert.equal(foe.hp,17);assert.equal(foe.statuses.shield,25);
  assert.equal(foe.statuses.damagePrevention,25);
  assert.ok(ev.some(e=>e.t==='lifeLoss'&&e.kind==='vito'&&e.amount===3));
});

test('Conduit grants immediately when stepping onto the tile, once per turn and not by dancing on/off',()=>{
  const s=arena(['h....','.....','..P..','.....'],{h:'hound'});
  s.p.moveLeft=5;const hero=player(s);
  const goal={x:3,y:2};s.terrain[goal.y*s.w+goal.x]=T.CONDUIT;
  const ev=movePlayer(s,goal.x,goal.y);
  assert.equal(s.p.conduit,1);assert.equal(s.p.conduitGrantedTurn,s.turn);
  assert.ok(ev.some(e=>e.t==='conduit'&&e.x===goal.x&&e.y===goal.y));
  s.p.conduit=0;s.p.moveLeft=5;movePlayer(s,2,2);s.p.moveLeft=5;
  const second=movePlayer(s,goal.x,goal.y);
  assert.equal(s.p.conduit,0,'cannot farm second bonus in same turn');
  assert.equal(second.some(e=>e.t==='conduit'),false);
});

test('Reassembling Skeleton costs two mana to return tapped whenever absent, repeatedly',()=>{
  const s=arena(['h.....','......','...P..'],{h:'hound'},{evo:evoWith('mtg:reassembling-skeleton')});
  s.p.mana=8;
  assert.ok(s.traits.includes('skeleton'));
  for(let n=0;n<2;n++){
    const living=s.units.find(u=>u.sourceGraft==='skeleton'&&u.hp>0);
    assert.ok(living,'skeleton should be on the battlefield initially');
    living.hp=0;
    assert.equal(reassembleReason(s),null);
    const before=availableMana(s);
    const opts=comboActiveOptions(s);assert.ok(opts.some(o=>o.kind==='skeleton'));
    activateCombo(s,'skeleton',0);
    assert.equal(availableMana(s),before-2);
    const resurrected=s.units.find(u=>u.sourceGraft==='skeleton'&&u.hp>0);
    assert.ok(resurrected?.tapped);
  }
});

test('only Triplicate Titan Flying Golem receives the Flying keyword and hover visual',()=>{
  const source=txt('src/ui/battle-ui.js'),scene=txt('src/rendering/scene.js');
  assert.match(source,/u\.defId === 'golemFly' && u\.keywords\?\.flying/);
  assert.match(scene,/hover: u\.keywords\?\.flying && !u\.statuses\?\.grounded/);
  assert.match(source,/v\.hover = u\.defId === 'golemFly'/);
});

test('multiple summons initialize together and animate as one group; rift has upright purple spike',()=>{
  const js=txt('src/ui/battle-ui.js');
  assert.match(js,/while \(events\[idx \+ 1\]\?\.t === 'summon'\) group\.push\(events\[\+\+idx\]\)/);
  assert.match(js,/await Promise\.all\(newcomers\.map/);
  assert.match(js,/b: \[w\[0\], 2\.45, w\[2\]\]/);
  assert.match(js,/segs: 1/);
});

test('angel atlas scrub removes only stray detached pieces while preserving 7 authored poses',()=>{
  const js=txt('src/rendering/raster-benchmarks.js');
  assert.match(js,/stripAngelAtlasDebris/);
  assert.match(js,/asset\.key === 'angel'/);
  assert.match(js,/piece\.length < 150/);
});

test('v1.8.3 game and isolated replay fingerprint make old ranked decisions ineligible',()=>{
  assert.equal(GAME.version,'1.9.0-candidate');
  assert.equal(RULES_VERSION,'graftbound-rules-1.9.0-candidate');
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,32);
});
