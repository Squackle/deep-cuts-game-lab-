import test from 'node:test';
import assert from 'node:assert/strict';
import { arena,evoWith } from './helpers.mjs';
import { player } from '../src/engine/combat.js';
import { candidateGain,consumeCandidateGain } from './life-gain-v2-prototype.mjs';
const fixture=()=>arena(['P..','..g'],{g:'grub'},{evo:evoWith('mtg:ajani-s-pridemate')});
test('proposed canonical hero gain counts one event for multiple life points and at full HP',()=>{
 const s=fixture(),h=player(s),power=h.power;
 h.hp=h.maxHp-1;
 const first=candidateGain(s,3,'healing-salve');
 assert.equal(first.restored,1);assert.equal(first.nominal,3);
 consumeCandidateGain(s,first);assert.equal(h.power,power+1);
 const full=candidateGain(s,1,'lifelink');
 assert.equal(full.restored,0);consumeCandidateGain(s,full);
 assert.equal(h.power,power+2);
});
test('proposed canonical gain is serializable, ordered and consumed once across reload',()=>{
 const s=fixture(),power=player(s).power;
 const a=candidateGain(s,1,'soulWarden'),b=candidateGain(s,2,'sheoldred');
 const saved=JSON.parse(JSON.stringify({s,a,b}));
 assert.deepEqual(consumeCandidateGain(saved.s,saved.b),[]);
 consumeCandidateGain(saved.s,saved.a);
 assert.deepEqual(consumeCandidateGain(saved.s,saved.a),[]);
 consumeCandidateGain(saved.s,saved.b);
 assert.equal(player(saved.s).power,power+2);
 assert.equal(player(s).power,power);
});
test('zero gain, ally-only healing and terminal encounters do not produce hero gain events',()=>{
 const s=fixture(),h=player(s),power=h.power;
 assert.equal(candidateGain(s,0,'heal'),null);
 const ally={uid:99,hero:false,hp:1,maxHp:3};
 assert.equal(candidateGain(s,1,'lifelink',ally),null);assert.equal(ally.hp,2);
 const pending=candidateGain(s,1,'heal');s.phase='won';s.victoryDeclared=true;
 assert.equal(candidateGain(s,1,'heal'),null);
 assert.deepEqual(consumeCandidateGain(s,pending),[]);
 assert.equal(h.power,power);
});
