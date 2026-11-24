import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { player,enemies,intents } from '../src/engine/combat.js';
import { tacticalThreat,slimeEndStepWarning } from '../src/ui/tactical-threats.js';

test('multi-hit intent reports the per-hit danger without mutating state',()=>{
 const s=arena(['Pa.','...'],{a:'alpha'}),a=enemies(s)[0];
 a.keywords.doubleStrike=1;
 const i={uid:a.uid,kind:'attack',damage:4};
 const before=structuredClone(s);
 assert.equal(tacticalThreat(s,i).hits,2);
 assert.match(tacticalThreat(s,i).notes.join(' '),/two hits/);
 assert.deepEqual(s,before);
});
test('Nemata reveals extra summon when primary intent is an attack',()=>{
 const s=arena(['Pn.','...'],{n:'nemata'});
 const n=enemies(s)[0];n.bossMana=3;
 const i=intents(s).find(x=>x.uid===n.uid);
 assert.equal(i.kind,'attack');
 assert.ok(tacticalThreat(s,i).notes.some(n=>n.includes('summon')));
});
test('Arasta and Toxrill communicate non-attack pressure',()=>{
 const a=arena(['Pa.','...'],{a:'arasta'});assert.match(tacticalThreat(a,intents(a)[0]).notes.join(' '),/Spiders/);
 const s=arena(['Pt.','...'],{t:'toxrill'});player(s).toughness=1;
 assert.match(slimeEndStepWarning(s),/fatal/);
 player(s).toughness=2;assert.match(slimeEndStepWarning(s),/both end steps/);
 enemies(s)[0].hp=0;assert.equal(slimeEndStepWarning(s),'');
});

test('Gloam Coven uses real-card identities rather than legacy guardian and hexer mechanics',()=>{
 const s=arena(['P...','ahe.','....'],{a:'alpha',h:'hexer',e:'tortoise'});
 const alpha=enemies(s).find(u=>u.defId==='alpha'),hexer=enemies(s).find(u=>u.defId==='hexer'),escort=enemies(s).find(u=>u.defId==='tortoise');
 assert.equal(alpha.name,'Nightpack Ambusher');assert.equal(hexer.name,'Blightcaster');assert.equal(escort.name,'Dauntless Escort');
 assert.equal(tacticalThreat(s,{uid:alpha.uid,kind:'attack'}).hits,1);
 assert.match(tacticalThreat(s,{uid:escort.uid,kind:'move'}).notes.join(' '),/lethal damage/);
 assert.match(tacticalThreat(s,{uid:hexer.uid,kind:'move'}).notes.join(' '),/−2\/−2/);
 hexer.spellUsed=true;assert.ok(!tacticalThreat(s,{uid:hexer.uid,kind:'move'}).notes.some(x=>x.includes('One with the Wind')));
});
