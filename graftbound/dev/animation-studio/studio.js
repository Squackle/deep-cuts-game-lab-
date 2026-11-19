// GRAFTBOUND Animation Studio: isolated visual scene using the actual WebGL battlefield renderer.
// No save, combat-run, score, Scryfall, or server state. Gameplay values are a clearly labeled fixture.
import { Scene } from '../../src/rendering/scene.js';
import { loadAssets } from '../../src/rendering/sprites.js';
import { buildEncounter } from '../../src/engine/encounters.js';
import { ACTS } from '../../src/data/encounters.js';
import { SCENARIO, PHASES, DURATION, IMPACT_TIME, resolveBoardFire } from './scenario.js';
import { SmokeField } from './smoke-fluid.js';
import { drawSmokeOnArena, clipToArena, arenaPoint } from './arena-projection.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), effects = $('effects'), ctx = effects.getContext('2d');
const replayBtn = $('replay'), resetBtn = $('reset'), labels = $('labels');
const speedSel = $('speed'), particlesSel = $('particles'), motionSel = $('motion'), smokeSel = $('smoke'), fireSel = $('fire');
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = n => { const t = clamp(n); return t*t*(3-2*t); };
const frac = n => n - Math.floor(n);
const rnd = n => frac(Math.sin(n * 127.1 + 18.73) * 43758.5453);
const mix = (a, b, t) => a + (b-a)*t;
const defaultReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
motionSel.value = defaultReduced ? 'reduced' : 'full';
let sc, smoke, smokeTexture, smokeCtx, playing = false, started = 0, elapsed = 0, prev = 0;
let resolved = null, damaged = false, removed = false, lastCast = -1;
const marks = new Map();
const original = SCENARIO.map(u => ({ ...u }));

function note(message, state) {
  $('phase').textContent = state || message;
  $('outcome').textContent = message;
}
function prepareLabels() {
  labels.replaceChildren();
  marks.clear();
  for (const u of original) {
    // Match the actual GRAFTBOUND BattleUI.renderLabel() structure exactly:
    // no nameplates, a 46×9 allegiance-colored bar and HP number on the left.
    const el = document.createElement('div');
    el.className = 'ulabel ' + (u.side === 'enemy' ? 'enemy' : 'player');
    el.dataset.unitId = String(u.uid);
    const hp = document.createElement('div');
    hp.className = 'hpbar';
    const fill = document.createElement('i');
    const value = document.createElement('span');
    hp.append(fill, value);
    el.append(hp);
    labels.append(el);
    marks.set(u.uid, { el, fill, value });
  }
}
function resetBattle() {
  if (!sc) return;
  playing = false; elapsed = 0; damaged = false; removed = false; resolved = null; lastCast = -1;
  sc.loadArena(buildEncounter(ACTS[1].mid[0], 11, 'battle'), 11, 'warrens');
  sc.zoom = 1.17;
  sc.reduced = motionSel.value === 'reduced';
  sc.setQuality(particlesSel.value === 'high' ? 'high' : particlesSel.value === 'low' ? 'performance' : 'balanced');
  for (const u of original) {
    const unit = sc.addUnit(u, u.sprite);
    unit.dir = u.side === 'enemy' ? [0, 1] : [0, -1];
    if (u.uid === 1) unit.castAt = 'hands';
  }
  // The fluid's grid represents the 8x8 physical battlefield, not the
  // browser's rectangular viewport. Its boundaries are solid box walls.
  const cells = particlesSel.value === 'high' ? 112 : particlesSel.value === 'low' ? 56 : 80;
  smoke = new SmokeField(cells,cells);
  smokeTexture = document.createElement('canvas');
  smokeTexture.width = smokeTexture.height = cells*4;
  smokeCtx = smokeTexture.getContext('2d');
  prepareLabels(); $('count').textContent = '0 / 7 HIT';
  replayBtn.disabled = false; resetBtn.disabled = false;
  replayBtn.textContent = '▶ CAST CINDERSTORM';
  note('2 fire damage to every creature — including allies and the caster.', 'READY TO CAST');
}
function begin() {
  if (!sc) return;
  resetBattle();
  playing = true; started = performance.now();
  replayBtn.textContent = '↻ REPLAY CINDERSTORM';
  note('The caster begins to summon a ring of burning embers.', 'THE INVOCATION');
}
function impact() {
  if (damaged) return;
  damaged = true;
  resolved = resolveBoardFire(original);
  $('count').textContent = '7 / 7 HIT';
  // Every creature is affected simultaneously. The smoke masks the visual state transition.
  for (const u of resolved) {
    sc.hit(u.uid, [1, 0.4, 0.12], false);
    const m = marks.get(u.uid);
    m.fill.style.width = (100 * u.hp / u.maxHp) + '%';
    m.value.textContent = String(u.hp);
    // The main game uses the sprite's hit flash rather than shaking labels.
  }
  sc.light(sc.centerPos(1), [1, 0.41, 0.1], 7, 0.6, 3);
  if (!sc.reduced) sc.shake(0.12);
}
function removeFallen() {
  if (!resolved || removed) return;
  removed = true;
  for (const u of resolved) if (u.dead) {
    sc.removeUnit(u.uid);
    marks.get(u.uid).el.classList.add('dead');
  }
  const lost = resolved.filter(u => u.dead).length;
  note('The storm clears. ' + lost + ' creatures have fallen into ash; the others survived.', 'ASHFALL · ' + lost + ' FALLEN');
}
function renderLabels() {
  if (!sc?.cam) return;
  for (const u of original) {
    const m = marks.get(u.uid); if (!m) continue;
    if (!m.value.textContent) { m.value.textContent = String(u.hp); m.fill.style.width = '100%'; }
    const v = sc.units.get(u.uid);
    if (!v || (resolved && resolved.find(n => n.uid === u.uid)?.dead && removed)) continue;
    const p = sc.project(sc.headPos(u.uid));
    // Same projected head-position anchoring as the main game's BattleUI.frame().
    m.el.style.transform = `translate(${p.x | 0}px, ${p.y | 0}px)`;
    // Keep the main-game HP bars readable during the wipe's hottest moment.
    m.el.style.opacity = elapsed > 3.05 && elapsed < 3.48 ? '.55' : '1';
  }
}
function resize() {
  const rect = effects.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  effects.width = Math.max(1, Math.round(rect.width * dpr));
  effects.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // The projected box follows Scene's camera whenever the window resizes;
  // the world-space fluid does not lose or rescale its density on resize.
}
function blob(x, y, radius, center, edge, opacity = 1) {
  if (radius <= 0 || opacity <= 0) return;
  const g = ctx.createRadialGradient(x, y, 1, x, y, radius);
  g.addColorStop(0, center); g.addColorStop(1, edge);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill();
}
function ashPile(point, age, uid) {
  const a = clamp((age - 3.59) / 0.38);
  if (!a) return;
  const {x,y} = point;
  ctx.globalAlpha = a;
  ctx.fillStyle = '#161613';
  ctx.beginPath();ctx.ellipse(x,y+5,20,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle = '#4e4a40';
  ctx.beginPath();ctx.ellipse(x,y+1,16,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle = '#888070';
  ctx.beginPath();ctx.ellipse(x-3,y-1,11,3,0,Math.PI*2,Math.PI*4);ctx.fill();
  for(let i=0;i<6;i++){
    const px=x+(rnd(uid*25+i)-.5)*30, py=y-2+(rnd(uid*39+i)-.5)*8;
    ctx.fillStyle = i%3===0?'#ec803f':'#a59a7b';
    ctx.fillRect(px,py,i%3===0?2:3,2);
  }
  if (age<4.95) for (let i=0;i<3;i++){
    const xx=x+(rnd(uid*77+i)-.5)*21+Math.sin(age*2+i)*5;
    blob(xx,y-12-(age-3.55)*12-i*9,12,'#73716b99','#4a493500',0.22*(4.95-age)*a);
  }
}
// Individual billows rise in world height while their x/z travel through the
// same reflected 8×8 velocity field. The clip is the actual tile footprint:
// smoke volume never paints the surrounding scenery, even near a wall.
function drawContainedBillows(field,reduced) {
  if(!field.brush||!field.puffs.length)return;
  ctx.save();
  clipToArena(ctx,sc,0.04);
  const src=field.brush;
  for(const puff of field.puffs){
    const age=puff.age/puff.life;
    const birth=smooth(puff.age/.24);
    const fade=1-smooth((age-.54)/.46);
    const sootReveal=smooth((field.time-3.00)/.70);
    const alpha=birth*fade*(.09+.26*sootReveal)*Number(smokeSel.value)*(reduced?.55:1);
    if(alpha<=.005)continue;
    const [wx,,wz]=sc.world(puff.x/(field.w-1)*sc.w-.5,puff.y/(field.h-1)*sc.h-.5);
    const height=.30+Math.min(1.25,puff.age*.75);
    const p=sc.project([wx,height,wz]);
    const q=sc.project([wx+1,height,wz]);
    const pixelTile=Math.max(14,Math.hypot(q.x-p.x,q.y-p.y));
    const radius=Math.min(83,Math.max(9,pixelTile*(puff.size/10)*(1+puff.age*.9)*1.16));
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(p.x,p.y);
    ctx.rotate(puff.rotate+puff.age*.21);
    ctx.drawImage(src,-radius,-radius,radius*2,radius*2);
    ctx.restore();
  }
  ctx.restore();
}
// Advected tongues of flame: moving particles use the gas velocity grid,
// react to its heat, and rise above the tile plane. All light is clipped to
// the same invisible 8×8 walls. No off-board spawners or overlay fog.
function drawContainedFlames(field,reduced) {
  if(!field.flames.length)return;
  const fade=1-smooth((field.time-3.40)/.50);
  if(fade<=0)return;
  const intensity=Number(fireSel.value);
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.globalCompositeOperation='lighter';
  for(const f of field.flames){
    const life=1-f.age/f.life;
    const opacity=clamp(life*fade*(.34+.66*f.heat)*intensity*(reduced?.44:1),0,.93);
    if(opacity<.045)continue;
    const [wx,,wz]=sc.world(f.x/(field.w-1)*sc.w-.5,f.y/(field.h-1)*sc.h-.5);
    const p=sc.project([wx,.22,wz]), tile=sc.project([wx+1,.22,wz]);
    const tilePx=Math.max(12,Math.hypot(tile.x-p.x,tile.y-p.y));
    const v=field.velocityAt(f.x,f.y);
    const lean=clamp(v[0]*.19,-19,19)+Math.sin(f.age*12+f.seed*7)*3.3;
    const height=tilePx*(.72+f.size*.75)*(1-f.age/f.life*.45);
    const half=Math.max(2.1,tilePx*(.15+f.size*.08)*life);
    const tipX=p.x+lean,tipY=p.y-height;
    ctx.globalAlpha=opacity;
    const g=ctx.createLinearGradient(p.x,p.y,tipX,tipY);
    g.addColorStop(0,'rgba(255,248,187,.98)');
    g.addColorStop(.30,'rgba(255,189,54,.98)');
    g.addColorStop(.73,'rgba(255,92,17,.77)');
    g.addColorStop(1,'rgba(220,30,5,0)');
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(p.x-half*1.18,p.y);
    ctx.quadraticCurveTo(p.x-1.35*half+lean*.18,p.y-height*.48,tipX,tipY);
    ctx.quadraticCurveTo(p.x+half*.95+lean*.32,p.y-height*.52,p.x+half*1.17,p.y);
    ctx.closePath();
    ctx.fill();
    // Thin, brighter core near the burning ground plane.
    if(f.heat>.19 && !reduced){
      ctx.globalAlpha=opacity*.5;
      ctx.fillStyle='#fff7cb';
      ctx.beginPath();
      ctx.moveTo(p.x-half*.44,p.y);
      ctx.quadraticCurveTo(p.x+lean*.16,p.y-height*.35,tipX*.17+p.x*.83,p.y-height*.69);
      ctx.quadraticCurveTo(p.x+half*.41,p.y-height*.20,p.x+half*.44,p.y);
      ctx.closePath();ctx.fill();
    }
  }
  ctx.restore();
}
function drawCinderstorm(t) {
  const w = effects.clientWidth, h = effects.clientHeight;
  ctx.clearRect(0,0,w,h);
  if(!sc?.cam||!smoke)return;
  const actor=sc.units.get(1);
  if(!actor)return;
  const reduced=motionSel.value==='reduced';
  // Coordinates are on the actual 8x8 tile plane. A plume cannot enter the
  // surrounding scenery because velocity and density obey reflective walls.
  const origin={
    x:(actor.pos[0]+sc.w/2)/sc.w,
    y:(actor.pos[2]+sc.h/2)/sc.h
  };
  smoke.advanceTo(t,origin,reduced);
  smokeCtx.clearRect(0,0,smokeTexture.width,smokeTexture.height);
  smoke.render(smokeCtx,smokeTexture.width,smokeTexture.height,{
    smoke:Number(smokeSel.value),fire:Number(fireSel.value),reduced
  });
  // Perspective-warp the 2D density sheet onto the real battlefield tiles,
  // and clip every projected layer to their outline. No rectangular fog overlay.
  const mobile=w<620;
  drawSmokeOnArena(ctx,smokeTexture,sc,{elevation:0.15,steps:mobile?4:6,opacity:.94});
  if(!reduced)drawSmokeOnArena(ctx,smokeTexture,sc,{elevation:0.65,steps:mobile?3:5,opacity:.35});
  drawContainedFlames(smoke,reduced);
  drawContainedBillows(smoke,reduced);
  // Emission glow and impact flash respect the same invisible arena footprint.
  ctx.save();
  clipToArena(ctx,sc,0.04);
  const caster=arenaPoint(sc,origin.x,origin.y,0.28);
  if(t>0&&t<3.35&&!reduced){
    const glow=Math.min(1,t/.78)*(1-smooth((t-2.95)/.43));
    const radius=22+44*smooth(t/1.4);
    const g=ctx.createRadialGradient(caster.x,caster.y,2,caster.x,caster.y,radius);
    g.addColorStop(0,'rgba(255,198,82,'+(glow*.34)+')');
    g.addColorStop(.38,'rgba(252,95,23,'+(glow*.18)+')');
    g.addColorStop(1,'rgba(240,66,10,0)');
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(caster.x,caster.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  if(t>IMPACT_TIME-.13&&t<IMPACT_TIME+.22){
    const flash=(1-Math.abs(t-IMPACT_TIME)/.22)*(reduced?.05:.14);
    ctx.fillStyle='rgba(255,124,53,'+Math.max(0,flash)+')';
    ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
  if(resolved&&t>=3.57) for(const u of resolved){
    if(u.dead) ashPile(sc.project(sc.world(u.x,u.y)),t,u.uid);
  }
  if(resolved&&t>=3.83&&t<4.55) for(const u of resolved){
    if(u.dead)continue;
    const p=sc.project(sc.headPos(u.uid));
    const strength=1-smooth((t-3.87)/.7);
    ctx.save();ctx.globalAlpha=Math.max(0,strength);
    ctx.fillStyle='#ffc782';ctx.font='bold 20px Georgia';ctx.textAlign='center';
    ctx.shadowColor='#7a2700';ctx.shadowBlur=7;
    ctx.fillText('−2',p.x,p.y-38-(t-3.83)*17);
    ctx.restore();
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function tick(now) {
  requestAnimationFrame(tick);
  const dt=Math.min(.05,Math.max(0,(now-prev)/1000));prev=now;
  if (!sc || document.hidden) return;
  if (playing) {
    elapsed=Math.min(DURATION,(now-started)/1000*Number(speedSel.value));
    const current=PHASES.filter(p=>elapsed>=p.time).at(-1);
    if (!removed && current) $('phase').textContent=current.label;
    const actor=sc.units.get(1);
    if (actor && !damaged) {
      if (motionSel.value==='full') {
        const radians=(elapsed*1.3+elapsed*elapsed*.48)*Math.PI*2;
        actor.dir=[Math.sin(radians),Math.cos(radians)];
        actor.castLift=Math.sin(elapsed*16)*.035;
        if(elapsed-lastCast>.28){sc.play(1,'cast');lastCast=elapsed;}
      } else if (elapsed-lastCast>.52){sc.play(1,'cast');lastCast=elapsed;}
    }
    if (elapsed>=IMPACT_TIME) impact();
    if (elapsed>=3.60) removeFallen();
    if (elapsed>=DURATION) {playing=false;replayBtn.textContent='↻ REPLAY CINDERSTORM';}
  }
  sc.frame(dt);
  renderLabels();
  drawCinderstorm(elapsed);
}
replayBtn.addEventListener('click', begin);
resetBtn.addEventListener('click', resetBattle);
particlesSel.addEventListener('change',()=>{if(sc)sc.setQuality(particlesSel.value==='high'?'high':particlesSel.value==='low'?'performance':'balanced');if(sc&&!playing)resetBattle();});
motionSel.addEventListener('change',()=>{if(sc)sc.reduced=motionSel.value==='reduced';if(sc&&!playing)resetBattle();});
window.addEventListener('resize',resize);
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!e.repeat&&!['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();begin();}});
(async()=>{
  try {
    const assets=await loadAssets();
    sc=new Scene(canvas,assets);
    resize();
    resetBattle();
    $('loading').remove();
    prev=performance.now();
    requestAnimationFrame(tick);
    // Auto-preview once when ready, without writing progress or accessing a gameplay session.
    setTimeout(()=>{if(!playing&&elapsed===0&&!document.hidden)begin();},650);
  } catch (err) {
    $('loading').textContent='Unable to prepare the GRAFTBOUND preview. This requires WebGL2 and current browser support.';
    console.error('Animation Lab initialization failed',err);
  }
})();
