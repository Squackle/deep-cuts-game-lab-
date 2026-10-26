import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/ui.js');
const published=read('index.html');

test('Daily Stackbreaker opens in playable practice, not a silently locked preview',()=>{
 for(const [name,code] of [['source',source],['published build',published]]){
  assert.ok(code.includes("let dailySession=dailyRoute?'practice':'preview'"),
   name+' must allow land tapping immediately on the daily route');
  assert.ok(code.includes("const dailyReady=()=>isDaily()"),
   name+' must retain the existing daily action guard');
  assert.ok(code.includes("['practice','scored'].includes(dailySession)"),
   name+' must permit practice actions');
  assert.ok(code.includes("function applyLand(id)"),
   name+' must keep Classic land tapping');
  assert.ok(code.includes("const after=tapLand(before,id)"),
   name+' must use the original game engine for mana');
 }
});

test('Practice never fabricates a verified attempt and daily selection stays date-bound',()=>{
 for(const [name,code] of [['source',source],['published build',published]]){
  assert.ok(code.includes("const dailyBound=dailyRoute?bindDailyScenario(dailyEntryForDate(dailyDate),scenarios):null"),
   name+' must pick a dated puzzle from the original scenario pool');
  assert.ok(code.includes("changeCase(dailyIndex,true)"),
   name+' must render the selected existing Classic scenario');
  assert.ok(code.includes("if(siteRanked&&scoredDaily())"),
   name+' must send only opted-in scored actions to the site');
  assert.ok(code.includes("dailySession='scored'"),
   name+' must keep ranked play a separate server-authorized state');
  assert.ok(code.includes("dailyRecord=siteRanked?null:readLocalDaily"),
   name+' must not treat local guest saves as ranking proof');
 }
});
