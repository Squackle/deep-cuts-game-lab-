import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,pass,tapLand} from '../src/engine.js';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import core from '../data/scenarios.json' with {type:'json'};
import expansion from '../data/campaign-expansion.json' with {type:'json'};
import {
 DAILY_STORAGE_KEY,DAILY_MANIFEST,dailyUtcDate,millisUntilUtcReset,dailyCountdown,
 dailyEntryForDate,localScenarioFingerprint,bindDailyScenario,localDailyStart,
 dailyAcceptedTransition,safeDailyLoad,readLocalDaily,writeLocalDaily,dailyShareText
} from '../src/daily.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scenarios=[...core,...expansion,...generateStages([...core,...expansion])].map((s,i)=>commanderScenario(s,i));
const entry=bindDailyScenario(dailyEntryForDate('2026-10-19'),scenarios);
const fakeStorage=()=>{const m=new Map();return {
 getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,String(value)),dump:()=>m
}};
test('manifest pins 365 immutable UTC days and cycles through 90 preselected verified Classic IDs',()=>{
 const m=DAILY_MANIFEST;
 assert.equal(m.schemaVersion,1);
 assert.equal(m.manifestVersion,1);
 assert.equal(m.resetAt,'00:00:00Z');
 assert.equal(m.publishedFrom,'2026-10-19');
 assert.equal(m.publishedThrough,'2027-10-18');
 assert.equal(m.entries.length,365);
 assert.equal(m.candidateCount,90);
 assert.equal(new Set(m.candidates).size,90);
 assert.equal(new Set(m.entries.slice(0,90).map(x=>x.puzzleId)).size,90);
 assert.equal(new Set(m.entries.map(x=>x.utcDate)).size,365);
 assert.equal(m.candidates.length,90);
 assert.match(m.contentReviewStatus,/editorial review.*pending/i);
 for(const e of m.entries){
  assert.equal(e.rulesVersion,'sb-mtg-training-0.3.0');
  assert.equal(e.manifestVersion,1);
  assert.ok(scenarios.some(s=>s.id===e.puzzleId),e.puzzleId);
  assert.ok(e.utcDate.match(/^\d{4}-\d{2}-\d{2}$/));
 }
});
test('daily date is global UTC and does not shift for US local DST or timezone',()=>{
 const at=Date.parse('2026-11-01T23:59:59.999Z');
 assert.equal(dailyUtcDate(at),'2026-11-01');
 assert.equal(dailyUtcDate(at+1),'2026-11-02');
 assert.equal(dailyUtcDate(new Date('2027-03-14T02:30:00-05:00')),'2027-03-14');
 assert.equal(dailyUtcDate(new Date('2027-03-14T07:30:00Z')),'2027-03-14');
 assert.equal(dailyUtcDate(Date.parse('2028-02-29T00:30:00Z')),'2028-02-29');
 assert.equal(dailyUtcDate(Date.parse('2028-03-01T00:00:00Z')),'2028-03-01');
 assert.equal(millisUntilUtcReset(at),1);
 assert.equal(millisUntilUtcReset(at+1),86400000);
 assert.equal(dailyCountdown(at),'00:00:00');
 assert.equal(dailyCountdown(Date.parse('2026-11-02T12:00:00Z')),'12:00:00');
});
test('identical date always binds identical scenario and local scenario fingerprint',()=>{
 assert.ok(entry);
 assert.equal(entry.utcDate,'2026-10-19');
 assert.equal(entry.rulesVersion,'sb-mtg-training-0.3.0');
 assert.equal(entry.scenario.id,entry.puzzleId);
 assert.deepEqual(bindDailyScenario(dailyEntryForDate(entry.utcDate),scenarios),entry);
 assert.equal(localScenarioFingerprint(entry.scenario),entry.scenarioDigest);
 assert.ok(entry.scenarioDigest.startsWith('fnv1a32-'));
 assert.equal(dailyEntryForDate('2027-10-19'),null,'expired published manifest never silently repeats');
 assert.equal(dailyEntryForDate('garbage'),null);
 assert.equal(bindDailyScenario({...entry,puzzleId:'not-a-puzzle'},scenarios),null);
});
test('one locally stored scored start resumes exactly once and is always unverified',()=>{
 const store=fakeStorage(),g=createGame(entry.scenario),record=localDailyStart(entry,g,Date.parse('2026-10-19T15:00:00Z'));
 assert.equal(record.status,'playing');
 assert.equal(record.localUnverified,true);
 assert.equal(record.acceptedActionCount,0);
 assert.equal(record.puzzleId,entry.puzzleId);
 assert.equal(writeLocalDaily(store,record),true);
 assert.ok(store.dump().has(DAILY_STORAGE_KEY));
 assert.deepEqual(readLocalDaily(store,entry),record);
 assert.deepEqual(safeDailyLoad({...record,puzzleId:'other'},entry),null);
 assert.deepEqual(safeDailyLoad({...record,rulesVersion:'0.4.0'},entry),null);
 assert.throws(()=>localDailyStart(entry,{id:'other'}),/mismatch/);
});
test('accepted state changes increment only on successful transitions; win/loss is based on engine',()=>{
 const g=createGame(entry.scenario),rec=localDailyStart(entry,g);
 assert.equal(dailyAcceptedTransition(rec,g,g),rec);
 const next=pass(g);
 const after=dailyAcceptedTransition(rec,g,next);
 assert.equal(after.acceptedActionCount,1);
 assert.equal(after.state.id,entry.puzzleId);
 assert.equal(after.status,next.status);
 assert.equal(after.completed,next.status==='won');
 assert.equal(after.priorityPassCount,(next.step!==g.step?1:0));
 const ended={...after,status:'lost'};
 assert.equal(dailyAcceptedTransition(ended,next,next),ended);
});
test('spoiler-free result includes UTC date and unverified label, no puzzle/card/strategy names',()=>{
 const text=dailyShareText(entry,{status:'won',acceptedActionCount:5});
 assert.match(text,/2026-10-19 \(UTC\)/);
 assert.match(text,/SOLVED/);
 assert.match(text,/5 accepted actions/);
 assert.match(text,/LOCAL \/ UNVERIFIED/);
 assert.ok(!text.includes(entry.puzzleId));
 assert.ok(!text.includes(entry.scenario.title));
 for(const name of ['Lightning Bolt','Wrath of God','Counterspell'])assert.ok(!text.includes(name));
 assert.equal(dailyShareText(null,{status:'won'}),'');
});
test('practice and scored UI are separated; scored blocks hints/reset/undo and campaign saves',()=>{
 const ui=read('src/ui.js'),template=read('template.html'),css=read('observatory.css');
 assert.match(ui,/if\(dailyRoute&&!force\)return/);
 assert.match(ui,/if\(dailyRoute&&dailySession!=='practice'\)return/);
 assert.match(ui,/if\(dailyRoute&&dailySession!=='practice'\)return;hint=!hint/);
 assert.match(ui,/if\(!dailyRoute\)\{progress\[p.id\]/);
 assert.match(ui,/if\(!dailyRoute\)try\{localStorage.setItem\('dc-stackbreaker-last-level'/);
 assert.match(ui,/dailyAcceptedTransition\(dailyRecord,game,s\)/);
 assert.match(ui,/dailySession==='scored'/);
 assert.match(ui,/dailySession='practice'/);
 assert.match(template,/id="dailyCountdown"/);
 assert.match(template,/id="dailyShareText"/);
 assert.match(css,/\.daily-banner\[hidden\]/);
 assert.match(read('daily/index.html'),/\.\.\/\?daily=1/);
});
test('no authenticated profile claims, D1 calls or leaderboard restored; bundled daily runtime shipped',()=>{
 const html=read('index.html'),build=read('build.py'),ui=read('src/ui.js');
 assert.match(build,/data\/daily-manifest\.json/);
 assert.match(build,/src\/daily\.js/);
 assert.ok(html.includes('const dailyManifest='));
 assert.ok(html.includes('function dailyEntryForDate('));
 assert.ok(html.includes('LOCAL / UNVERIFIED'));
 assert.ok(html.includes('dc-stackbreaker-progress-v3'));
 assert.ok(html.includes('dc-stackbreaker-last-level'));
 assert.ok(!ui.includes('/api/stackbreaker/daily/attempts'));
 assert.ok(!ui.includes('stackbreaker_mastery_grant'));
});
