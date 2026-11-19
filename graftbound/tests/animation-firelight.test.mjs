import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CanvasBattleScene} from '../dev/animation-studio/canvas-scene.js';
import {SCENARIO} from '../dev/animation-studio/scenario.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Canvas creature light uses crisp brightened rectangles and caster-facing rim',()=>{
 const calls=[];
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},fillRect(){calls.push({alpha:this.globalAlpha,blend:this.globalCompositeOperation,fill:this.fillStyle})}};
 const canvas={clientWidth:390,clientHeight:450,getContext(){return ctx}};
 const sc=new CanvasBattleScene(canvas);sc.loadArena({w:8,h:8});
 const v=sc.addUnit(SCENARIO[0],SCENARIO[0].sprite);
 v.fireLight=1;v.fireTint=[255,125,30];sc._unit(v);
 assert.ok(calls.some(c=>c.blend==='lighter' && /rgb\(255,125,30\)/.test(c.fill)),'firelight multiplies actual actor pixel rectangles');
 assert.equal(ctx.globalCompositeOperation,'source-over');
});
test('sampled firelight is smoothed and bounded for mobile and desktop',()=>{
 const source=read('../dev/animation-studio/studio.js');
 assert.match(source,/function updateFireLighting\(dt\)/);
 assert.match(source,/1-Math\.exp\(-dt\*10\)/);
 assert.match(source,/sc\.light\(sc\.centerPos\(v\.uid\)/);
 assert.match(source,/litTargets\.slice\(0,3\)/);
 assert.match(source,/\.sample\(smoke\.flame,gx/);
 assert.match(source,/reduced\?\.5:1/);
 assert.match(source,/function drawTileFirelight\(/);
 assert.match(source,/\.22\*flicker/);
 assert.match(source,/target\.globalCompositeOperation='lighter'/);
 assert.doesNotMatch(source,/Math\.random/);
});
