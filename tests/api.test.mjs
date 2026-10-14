import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost} from '../functions/api/leaderboard.js';
import {newRun,start,step} from '../src/engine.js';
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../db/leaderboard.sql',import.meta.url),'utf8'));
 return {sqlite,prepare(sql){const st=sqlite.prepare(sql);let params=[];const q={bind(...p){params=p;return q},async run(){const result=st.run(...params);return {meta:{changes:Number(result.changes)}}},async first(){return st.get(...params)||null},async all(){return {results:st.all(...params)}}};return q},async batch(statements){sqlite.exec('BEGIN');try{const res=[];for(const s of statements)res.push(await s.run());sqlite.exec('COMMIT');return res}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
const url='https://test.invalid/api/leaderboard';
function request(value,origin='https://test.invalid'){return new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.10'},body:JSON.stringify(value)})}
async function call(env,value,data){const r=await onRequestPost({env,request:request(value),data});return {status:r.status,body:await r.json()}}
function ended(seed,mode){const r=newRun({seed,mode});start(r);while(r.status==='running')step(r);return {score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks}}
test('D1 end-to-end: mode-bound daily sessions, verified profile identity, replay and one-use transaction',async()=>{
 const db=database(),env={HIVE_DB:db};
 const a=await call(env,{action:'start',mode:'classic',challenge:'daily'});assert.equal(a.status,201);
 const b=await call(env,{action:'start',mode:'classic',challenge:'daily'});assert.equal(a.body.seed,b.body.seed);
 const hunt=await call(env,{action:'start',mode:'hunt',challenge:'daily'});assert.notEqual(a.body.seed,hunt.body.seed);
 const submit={action:'submit',token:a.body.token,events:[],alias:'Test Player',profileHandle:'Imposter',summary:ended(a.body.seed,'classic')};
 const who={id:'profile1',handle:'RealOwner'};
 const s=await call(env,submit,{hiveProfile:who});assert.equal(s.status,201,JSON.stringify(s));assert.equal(s.body.profileVerified,true);
 assert.equal(db.sqlite.prepare('SELECT profile_handle FROM hive_scores_v1').get().profile_handle,'RealOwner');
 assert.equal((await call(env,submit,{hiveProfile:who})).status,409);
 const board=await onRequestGet({env,request:new Request(url+'?mode=classic&challenge=daily'),data:{resolveProfiles:async()=>{}}});
 const rows=await board.json();assert.equal(rows.entries.length,1);assert.equal(rows.entries[0].profileHandle,'RealOwner');assert.equal(rows.entries[0].profileId,undefined);
 const other=await onRequestGet({env,request:new Request(url+'?mode=hunt&challenge=daily')});assert.equal((await other.json()).entries.length,0);
 const arcade=await onRequestGet({env,request:new Request(url+'?mode=classic&challenge=arcade')});assert.equal((await arcade.json()).entries.length,0);
 db.sqlite.close();
});
test('API rejects cross-origin writes, invalid modes, inflated replays, and preserves rejected session',async()=>{
 const db=database(),env={HIVE_DB:db};
 assert.equal((await onRequestPost({env,request:request({action:'start'},'https://evil.invalid')})).status,403);
 assert.equal((await call(env,{action:'start',mode:'fake'})).status,400);
 const a=(await call(env,{action:'start',mode:'hunt'})).body;
 const valid=ended(a.seed,'hunt');
 const bad=await call(env,{action:'submit',token:a.token,events:[],summary:{...valid,score:999999}});assert.equal(bad.status,422);
 const ok=await call(env,{action:'submit',token:a.token,events:[],summary:valid,profileHandle:'GuestUser'});assert.equal(ok.status,201);assert.equal(ok.body.profileVerified,false);
 assert.equal(db.sqlite.prepare('SELECT profile_verified FROM hive_scores_v1').get().profile_verified,0);
 db.sqlite.close();
});
