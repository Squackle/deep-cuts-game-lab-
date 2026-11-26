import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../../archemancy/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../main.mjs',import.meta.url),'utf8');
const code=(from,to)=>{
 const a=js.indexOf(from),b=js.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'restart code anchors present');
 return js.slice(a,b);
};

test('main title menu exposes Restart saved run only when a valid run can be continued',()=>{
 assert.match(html,/<button id="continueRun"[^>]*hidden/);
 assert.match(html,/<button id="titleRestart"[^>]*hidden>Restart saved run<\/button>/);
 assert.match(js,/\$\("titleRestart"\)\.hidden=!save/);
 assert.match(js,/\$\("titleRestart"\)\.addEventListener\("click",\(\)=>askRestart\("title"\)\)/);
});
test('all in-game and main-title restarts route through an accessible confirmation dialog',()=>{
 for(const id of ['restartConfirmDialog','restartConfirmTitle','restartConfirmText','restartCancel','restartConfirm'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<dialog id="restartConfirmDialog"[^>]*aria-labelledby="restartConfirmTitle"[^>]*aria-describedby="restartConfirmText"/);
 assert.match(html,/<button id="restartCancel"[^>]*autofocus>Keep playing<\/button>/);
 assert.match(js,/\$\("restart"\)\.addEventListener\("click",\(\)=>askRestart\("menu"\)\)/);
 assert.match(js,/\$\("restartConfirmDialog"\)\.addEventListener\("cancel",event=>\{event\.preventDefault\(\);cancelRestart\(\);\}\)/);
});
test('canceling restart cannot erase the active run and restores the in-game menu',()=>{
 const cancel=code('function cancelRestart(){',' $("restartCancel").addEventListener');
 assert.doesNotMatch(cancel,/clearRun\(|restart\(|startRun\(/);
 assert.match(cancel,/restartSource=null/);
 assert.match(cancel,/if\(source==="menu"\)showDialog\("menuDialog"\)/);
 const ask=code('function askRestart(source){',' function cancelRestart()');
 assert.doesNotMatch(ask,/clearRun\(|restart\(/);
});
test('confirming restart resets only the active run, retaining previous difficulty and layout',()=>{
 const confirmation=code(' $("restartConfirm").addEventListener',' $("restart").addEventListener');
 assert.match(confirmation,/restart\(run\.mode,challenge,run,mission\)/);
 assert.match(confirmation,/daily\.dailyFor\(run\.daily\.date,MAPS\)/);
 const restartBody=code(' function restart(mode,dc=null,from=null,mission=null){',' let restartSource=null');
 for(const span of ['from?.seed','from?.mapId','from?.season','from?.difficulty','from?.perks','from?.locked','from?.commander?.id','from?.kit','clearRun()'])
  assert.ok(restartBody.includes(span),'retains '+span);
 assert.match(restartBody,/from\?!!from\.onslaught/,'saved Onslaught setting is preserved');
 assert.match(restartBody,/clearRun\(\)/);
 assert.ok(js.indexOf('clearRun();',js.indexOf('function restart(mode,dc=null,from=null,mission=null)'))>js.indexOf('function restart(mode,dc=null,from=null,mission=null)'), 'clear on the confirmed path only');
});
test('empty wave history no longer crashes the UI with undefined.wave',()=>{
 assert.match(js,/const lastWave=s\.waveHistory\.at\(-1\);if\(!lastWave\)\{seenWaves=0;return;\}/);
 assert.match(js,/wave:lastWave\.wave,mode:s\.mode/);
 assert.doesNotMatch(js,/wave:s\.waveHistory\.at\(-1\)\.wave/);
});
