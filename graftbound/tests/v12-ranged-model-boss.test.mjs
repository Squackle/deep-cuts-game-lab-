import test from 'node:test';
import assert from 'node:assert/strict';
import { REAL_CREATURE_MODELS, installRealCreatureModels } from '../src/rendering/real-creature-models.js';
import { ENEMIES } from '../src/data/enemies.js';
import { arena } from './helpers.mjs';
import { endTurn, player, attack } from '../src/engine/combat.js';
import { evoWith } from './helpers.mjs';
import { readFileSync } from 'node:fs';

const names=['grub','hound','archer','tortoise','moth','hexer','alpha','cinderling','ashbrute','harpooner','emberseer','champion','riftstalker','nullwarden','shardling','sentinel','nemata','arasta','drakuseth','krenko','scarab','toxrill'];
test('all sixteen printed MTG foes and all six seed-selected bosses use distinct new animated models',()=>{
 const original=JSON.parse(readFileSync(new URL('../assets/sprites/manifest.json',import.meta.url)));
 for(const id of names){
   const e=ENEMIES[id];assert.ok(REAL_CREATURE_MODELS[id],`${id} has a new model plan`);
   assert.equal(e.sprite,`mtg_${id}`,`${e.name} is not shown as its retired fictional sprite`);
   assert.ok(original.sprites[REAL_CREATURE_MODELS[id].base],`${id} has a complete working animation rig`);
 }
 assert.equal(new Set(names.map(id=>ENEMIES[id].sprite)).size,names.length);
});
test('all new summon tokens also have their own models rather than borrowed retired enemies',()=>{
 for(const id of ['angel','saproling','spider','goblin','zombie','slug','wolf','golemFly','golemVigilance','golemTrample'])assert.equal(ENEMIES[id].sprite,'mtg_'+id);
});
test('Spikeshot Goblin visibly emits a ranged projectile event before damage',()=>{
 const s=arena(['h..','...','.P.'],{h:'harpooner'});const goblin=s.units.find(u=>u.defId==='harpooner');
 const before=player(s).hp;const ev=endTurn(s);
 const shot=ev.find(e=>e.t==='rangedShot'&&e.kind==='spikeshot');
 assert.ok(shot,'Goblin activates a distinct visible projectile');assert.equal(shot.uid,goblin.uid);assert.equal(shot.target,player(s).uid);
 assert.ok(ev.some(e=>e.t==='damage'&&e.src===goblin.uid&&e.uid===player(s).uid));
 assert.ok(player(s).hp<before);
});
test('boss Vitality defeats instant Deathtouch, yet normal damage and non-boss Deathtouch still work',()=>{
 const boss=arena(['.....','..B..','..P..'],{B:'drakuseth'},{evo:evoWith('mtg:typhoid-rats')});
 const e=boss.units.find(u=>u.boss);const initial=e.hp;
 const ev=attack(boss,e.uid);
 assert.ok(e.hp>0&&e.hp<initial);assert.ok(ev.some(x=>x.t==='deathtouchResisted'&&x.uid===e.uid));
 const normal=arena(['...', '.h.', '.P.'],{h:'hound'},{evo:evoWith('mtg:typhoid-rats')});
 attack(normal,normal.units.find(x=>x.defId==='hound').uid);
 assert.equal(normal.phase,'won','ordinary target remains vulnerable to Deathtouch');
});
test('real model registration is safe in engine-only Node processes',()=>{
 const imageMap={},manifest={};assert.equal(installRealCreatureModels(imageMap,manifest),0,'no browser dependency leaks into engine');
});