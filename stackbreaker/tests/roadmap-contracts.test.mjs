import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateScenario} from '../src/engine.js';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import {RULES_VERSION} from '../src/cards.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const contract=JSON.parse(read('planning/daily-mastery-advanced-contracts-v1.json'));
const core=JSON.parse(read('data/scenarios.json'));
const expansion=JSON.parse(read('data/campaign-expansion.json'));

test('contract stays a non-runtime Step 1 mock with preserved Classic keys and version',()=>{
 assert.equal(contract.schemaVersion,1);
 assert.equal(contract.status,'step-1-contract-not-implemented');
 assert.equal(RULES_VERSION,'sb-mtg-training-0.3.0');
 assert.equal(contract.rulesVersions.classic,RULES_VERSION);
 assert.equal(contract.rulesVersions.advancedStatus,'PROPOSED_NOT_IMPLEMENTED');
 assert.equal(contract.storage.classicProgressKey,'dc-stackbreaker-progress-v3');
 assert.equal(contract.storage.classicLastLevelKey,'dc-stackbreaker-last-level');
 assert.equal(contract.storage.untouched,true);
 assert.equal(contract.stage.current,1);
 assert.equal(contract.stage.next,2);
});
test('original 30 core and exactly 220 deterministic generated puzzles are unmodified',()=>{
 assert.equal(core.length+expansion.length,30);
 assert.equal(core[0].id,'sb-01');
 const pool=[...core,...expansion];
 const a=generateStages(pool);
 const b=generateStages(pool);
 assert.equal(a.length,220);
 assert.deepEqual(a,b);
 const originals=[...pool,...a];
 assert.equal(originals.length,250);
 assert.equal(new Set(originals.map(p=>p.id)).size,250);
 assert.equal(originals[0].id,'sb-01');
 assert.equal(originals[29].id,'sb-30');
 assert.equal(originals[30].id,'sg-031');
 assert.equal(originals[249].id,'sg-250');
 for(let i=0;i<originals.length;i++){
  const scenario=commanderScenario(originals[i],i);
  assert.deepEqual(validateScenario(scenario),{valid:true,errors:[]},scenario.id);
  assert.equal(scenario.version,RULES_VERSION);
 }
});
test('daily uses identical UTC day/reset rules and unverified guest disclosure',()=>{
 const d=contract.daily;
 assert.equal(d.dateKey,'YYYY-MM-DD');
 assert.equal(d.reset,'00:00:00Z');
 assert.equal(d.timezone,'UTC');
 assert.ok(d.curatedMin>=90);
 assert.equal(d.puzzleContent.neverRetroactivelyReassign,true);
 assert.equal(d.puzzleContent.upcomingSolutionsPublic,false);
 assert.equal(d.attempts.practice.unlimited,true);
 assert.equal(d.attempts.practice.qualifies,false);
 assert.equal(d.attempts.scored.oneStartPerAccountPerUtcDate,true);
 assert.equal(d.attempts.scored.undo,false);
 assert.equal(d.attempts.scored.hints,false);
 assert.equal(d.attempts.scored.retry,false);
 assert.match(d.guestVerification,/unverified/i);
});
test('accepted action counting and spoiler-free sharing are explicit',()=>{
 const d=contract.daily;
 assert.ok(d.score.fields.includes('acceptedActionCount'));
 assert.ok(d.score.fields.includes('rulesVersion'));
 assert.ok(d.score.fields.includes('puzzleRevision'));
 assert.ok(d.score.fields.includes('utcDate'));
 assert.match(d.score.acceptedActionDefinition,/accepted/i);
 assert.equal(d.score.tiebreaker.includes('no leaderboard'),true);
 assert.equal(d.sharing.spoilerFree,true);
 assert.ok(d.sharing.exclude.includes('puzzleId'));
 assert.ok(d.sharing.exclude.includes('lineOfPlay'));
 assert.ok(!d.sharing.fields.includes('cardName'));
});
test('achievement IDs, unlock thresholds and rewards are unique and constrained',()=>{
 const m=contract.mastery;
 assert.equal(m.achievementCount,24);
 assert.equal(m.achievements.length,24);
 assert.equal(new Set(m.achievements.map(a=>a.id)).size,m.achievementCount);
 const valid=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
 for(const a of m.achievements){
  assert.match(a.id,valid);
  assert.ok(Number.isInteger(a.threshold)&&a.threshold>=1,a.id);
  assert.ok(['title','frame','vfx'].includes(a.reward.type),a.id);
  assert.ok(m.cosmetics[a.reward.type==='title'?'titles':a.reward.type==='frame'?'frames':'vfx'].includes(a.reward.id),a.id);
  if(a.metric.includes('verified-daily'))assert.equal(a.requiresServerVerification,true,a.id);
  if(a.metric.includes('advanced-'))assert.equal(a.engineGate,'advanced-v0.4+',a.id);
 }
});
test('semantic replay events have stable envelope and cannot be granted by VFX',()=>{
 const r=contract.replay,events=contract.semanticEventTypes;
 assert.equal(r.schemaVersion,1);
 for(const x of ['rulesVersion','contentVersion','puzzleId','puzzleRevision','puzzleDigest',
  'actionIndex','stateHashBefore','stateHashAfter','semanticEvents']){
  assert.ok(r.envelopeRequired.includes(x),x);
 }
 assert.equal(new Set(events).size,events.length);
 for(const e of ['spell.countered','spell.copied','trigger.created','ward.paid',
  'replacement.applied','daily.attempt_finished'])assert.ok(events.includes(e),e);
 assert.match(r.hashing,/NEVER client proof/i);
 assert.match(contract.mastery.grants.scoreProof,/never VFX/i);
});
test('auth/profile writes remain a separately approved website-only lane',()=>{
 assert.equal(contract.websiteOnly.approvalRequired,true);
 assert.equal(contract.websiteOnly.accountOwnerFromSession,true);
 assert.equal(contract.websiteOnly.publicLeaderboard,false);
 assert.equal(contract.websiteOnly.apiCandidate.length,5);
 assert.match(contract.websiteOnly.d1Migrations,/no writes/i);
 assert.equal(contract.storage.untouched,true);
});
test('no runtime module or standalone bundle imports the planning contract',()=>{
 for(const name of ['src/engine.js','src/ui.js','src/galaxies.js','src/cards.js',
  'build.py','index.html']){
  assert.ok(!read(name).includes('daily-mastery-advanced-contracts-v1'),name);
 }
 const spec=read('planning/STEP-1-ARCHITECTURE.md');
 assert.match(spec,/NO migration executed/);
 assert.match(spec,/Next permitted work/);
 assert.match(spec,/one scored start/i);
});
