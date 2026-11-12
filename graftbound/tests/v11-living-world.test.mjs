// GRAFTBOUND v1.1: new terrain and spell loadout regression. No browser or network needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { newRun, enterNode, RUN_VERSION } from '../src/engine/run.js';
import { createStore, memoryStorage, KEYS, _internal } from '../src/engine/save.js';
import { BASE_HAND_CAPACITY, MAX_HAND_CAPACITY, handCapacity, normalizedEquipped, combatSpellbook, setSpellEquipped, grantHandSlot } from '../src/engine/loadout.js';
import { EVENT_IDS, eventChoices, resolveEvent, rollEvent } from '../src/engine/events.js';
import { templateFor, buildEncounter } from '../src/engine/encounters.js';
import { T, tileAt } from '../src/core/grid.js';
import { player, movePlayer, endTurn, hazardPreview } from '../src/engine/combat.js';
import { pathWarning, describeTile } from '../src/engine/describe.js';
import { CAST_SIGNATURES, AFTERMATH_SIGILS, CAST_PROFILE } from '../src/rendering/casting.js';
import { PACK_IDENTITIES } from '../src/ui/pack-opening.js';
import { Particles } from '../src/rendering/particles.js';

const SPELL_IDS = ['shock','lightning-bolt','flame-slash','giant-growth','pyroclasm','titanic-growth','snakeskin-veil','disfigure','fireball'];
const mk = () => { const r = newRun({ seed: 100 }); r.spellbook = SPELL_IDS.map(id => ({ id:'mtg:'+id, level:1 })); r.equippedSpellIds = SPELL_IDS.slice(0,7).map(id=>'mtg:'+id); return r; };

test('v1.1 spell hand allows only 7 active cards, preserves extra learned spells and player toggles', () => {
  const r=mk();
  assert.equal(handCapacity(r),7); assert.equal(combatSpellbook(r).length,7);
  assert.equal(r.spellbook.length,9);
  assert.throws(()=>setSpellEquipped(r,'mtg:fireball',true),/full/);
  setSpellEquipped(r,'mtg:shock',false);
  setSpellEquipped(r,'mtg:fireball',true);
  assert.equal(combatSpellbook(r).length,7);
  assert.ok(!normalizedEquipped(r).includes('mtg:shock'));
  assert.equal(r.spellbook.length,9);
  r.phase='battle'; assert.throws(()=>setSpellEquipped(r,'mtg:shock',true),/combat/);
});

test('v1.1 mystery slot reward is deterministic, capped at 10, alternative rewards remain available',()=>{
  const r=mk();
  assert.ok(EVENT_IDS.includes('mnemonicShrine') && EVENT_IDS.includes('echoingCauldron'));
  assert.deepEqual(rollEvent(r,123),rollEvent(r,123));
  let options=eventChoices(r,'mnemonicShrine');
  assert.ok(options.find(x=>x.id==='expand'&&x.available));
  for(let cap=8;cap<=MAX_HAND_CAPACITY;cap++) assert.equal(grantHandSlot(r),cap);
  assert.throws(()=>grantHandSlot(r),/maximum/);
  assert.equal(eventChoices(r,'mnemonicShrine').find(x=>x.id==='expand').available,false);
  assert.equal(r.spellbook.length,9);
});

test('v1.1 old v1.0 saves migrate without losing extra spells and preserve an active battle',()=>{
  const r=mk();r.phase='map'; const old={...r,v:5};delete old.handCapacity;delete old.equippedSpellIds;
  const mem=memoryStorage();const db=createStore(mem);
  mem.setItem(KEYS.run,_internal.wrap(5,old));
  const got=db.loadRun();
  assert.equal(got.run.v,RUN_VERSION);assert.equal(got.run.spellbook.length,9);
  assert.equal(got.run.equippedSpellIds.length,BASE_HAND_CAPACITY);
  assert.equal(got.run.handCapacity,BASE_HAND_CAPACITY);
  assert.equal(db.loadRun().run.spellbook.length,9);
  assert.ok(mem.getItem(KEYS.run+'.pre-v5'));
});

test('v1.1 new terrain types are distinct, deterministic per seed and do not spawn hazards under units',()=>{
  const tpl=templateFor(2,'elite',5,919);
  const a=buildEncounter(tpl,1234,'elite');const b=buildEncounter(tpl,1234,'elite');
  assert.deepEqual(a,b);
  const all=new Set(a.terrain);
  assert.ok([T.ICE,T.SPORES,T.UNSTABLE,T.CONDUIT,T.CRUMBLE].every(t=>all.has(t)), 'all five authored in the elite Nexus');
  assert.equal(tileAt(a,a.playerStart.x,a.playerStart.y),T.FLOOR);
  for(const e of a.enemies) assert.equal(tileAt(a,e.x,e.y),T.FLOOR);
});

test('v1.1 hazard tooltips distinguish deferred poison from immediate lethal damage',()=>{
  const s=arena(['.....','.....','..P..'],{});
  s.terrain[1*s.w+2]=T.SPORES;
  const w=pathWarning(s,2,1);
  assert.ok(w && /poison.*later turn/i.test(w.text));assert.equal(w.enter,0);
  assert.ok(describeTile(s,2,1).some(x=>x.name==='Spore bed'));
});

test('v1.1 crumbling pressure tile can only hurt once, clears into ordinary terrain and dispatches event',()=>{
  const s=arena(['.....','.....','..P..'],{});
  s.terrain[1*s.w+2]=T.CRUMBLE;
  const before=player(s).hp;
  const ev=movePlayer(s,2,1);
  assert.equal(player(s).hp,before-1);
  assert.equal(tileAt(s,2,1),T.FLOOR);
  assert.ok(ev.some(x=>x.t==='terrain'&&x.kind==='crumble'));
});

test('v1.1 unstable tiles announce an even-round pulse without forcing visual randomness into simulation',()=>{
  const s=arena(['.....','.....','..P..'],{});
  s.terrain[1*s.w+2]=T.UNSTABLE;
  assert.deepEqual(hazardPreview(s),[],'first turn not pulsing');
  endTurn(s);
  assert.ok(hazardPreview(s).some(q=>q.x===2&&q.y===1), 'second turn warns about unstable stone');
});

test('all curated spells have bounded original sigils and authored charging signatures',()=>{
  const names=Object.keys(AFTERMATH_SIGILS);
  for(const name of names) {
    assert.ok(CAST_SIGNATURES[name],name);
    assert.ok(CAST_PROFILE[name],name);
    assert.ok(CAST_SIGNATURES[name][0]>=2 && CAST_SIGNATURES[name][0]<=12,name);
  }
  assert.ok(Object.keys(PACK_IDENTITIES).length>=7);
});

test('particle pool caps spell bursts and magic swirls to capacity',()=>{
  const p=new Particles(8);p.density=1;
  p.burst([0,0,0],[1,0.5,0.2],500);
  assert.equal(p.n,8);
  p.swirl([0,0,0],()=>[0,0,0],[1,1,1],500);
  assert.equal(p.n,8);
});
