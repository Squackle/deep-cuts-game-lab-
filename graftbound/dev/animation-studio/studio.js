// GRAFTBOUND Animation Studio: isolated visual scene using the actual WebGL battlefield renderer.
// No save, combat-run, score, Scryfall, or server state. Gameplay values are a clearly labeled fixture.
import { CanvasBattleScene } from './canvas-scene.js';
import { buildEncounter } from '../../src/engine/encounters.js';
import { ACTS } from '../../src/data/encounters.js';
import { SCENARIO, DURATION, IMPACT_TIME, resolveBoardFire, FIRE_BOARD_WIPE_EFFECT, isFireBoardWipeEligible } from './scenario.js';
import { SmokeField } from './smoke-fluid.js';
import { drawSmokeOnArena, clipToArena, arenaPoint } from './arena-projection.js';
import { createPixelAtlas } from './pixel-art.js';
import { ashSmokePuffs } from './ash-smoke.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), effects = $('effects'), ctx = effects.getContext('2d');
const replayBtn = $('replay'), resetBtn = $('reset'), labels = $('labels');
const speedSel = $('speed'), particlesSel = $('particles'), motionSel = $('motion'), smokeSel = $('smoke'), fireSel = $('fire'), spriteDensitySel = $('sprite-density');
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = n => { const t = clamp(n); return t*t*(3-2*t); };
const frac = n => n - Math.floor(n);
const rnd = n => frac(Math.sin(n * 127.1 + 18.73) * 43758.5453);
const mix = (a, b, t) => a + (b-a)*t;
const defaultReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
motionSel.value = defaultReduced ? 'reduced' : 'full';
let sc, smoke, smokeTexture, smokeCtx, pixelAtlas, playing = false, started = 0, elapsed = 0, prev = 0;
let compatCanvas=null;
const touchMobile=window.matchMedia?.('(pointer: coarse)').matches &&
  Math.min(window.innerWidth,window.innerHeight)<=820;
const preferCompatible=touchMobile || new URLSearchParams(window.location.search).get('renderer')==='2d';
function startCompatibleScene(reason='mobile'){
  // Canvas already bound to WebGL cannot be reused as a 2D canvas after failure.
  // Create a fresh, isolated canvas UNDER the existing Pyroclasm effect sheet.
  if(!compatCanvas){
    compatCanvas=document.createElement('canvas');
    compatCanvas.id='scene-compat';
    compatCanvas.setAttribute('aria-label','GRAFTBOUND mobile-compatible pixel-art battlefield');
    canvas.parentNode.insertBefore(compatCanvas,effects);
  }
  canvas.style.display='none';
  sc=new CanvasBattleScene(compatCanvas);
  $('renderer-status').textContent='Mobile-safe 2D renderer';
  document.body.dataset.previewRenderer='canvas2d';
  if(reason!=='mobile')console.warn('Pyroclasm switched to Canvas 2D compatibility mode:',reason);
}

let peakEmbers=0, peakFlames=0;
let resolved = null, damaged = false, removed = false, lastCast = -1;
let levelClock=0, ashSmokeBornAt=null;
const marks = new Map();
const original = SCENARIO.map(u => ({ ...u }));
// A visual-study eligibility guard, not a live-game spell dispatcher.
// This spell effect is ONLY for red, fire-themed creature board wipes.
if (!isFireBoardWipeEligible(FIRE_BOARD_WIPE_EFFECT))
  throw new Error('The Pyroclasm preview requires a red fire-based creature board wipe.');

// Spell casts never display phase names or narrative text on the battlefield.
// The below-the-arena test outcome remains available for QA and accessibility.
function note(message) {
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
function showSpriteCounts() {
  if (!smoke) return;
  const embers=smoke.embers.length, flames=smoke.flames.length;
  peakEmbers=Math.max(peakEmbers,embers);
  peakFlames=Math.max(peakFlames,flames);
  $('sprite-counts').textContent=!playing&&elapsed>=DURATION
    ? `Peak B: ${peakEmbers} embers · C: ${peakFlames} flames`
    : `Active B: ${embers} embers · C: ${flames} flames`;
}
function resetBattle() {
  if (!sc) return;
  playing = false; elapsed = 0; damaged = false; removed = false; resolved = null; lastCast = -1;
  levelClock=0; ashSmokeBornAt=null;
  peakEmbers=0; peakFlames=0;
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
  // Mobile browsers have a much smaller canvas/GPU memory budget. Restrict
  // only simulation resolution, not the user-selected B/C sprite density.
  const cells = sc.mode==='canvas-2d'
    ? (particlesSel.value==='high'?64:particlesSel.value==='low'?44:56)
    : (particlesSel.value === 'high' ? 112 : particlesSel.value === 'low' ? 56 : 80);
  smoke = new SmokeField(cells,cells,{spriteDensity:Number(spriteDensitySel.value)});
  smokeTexture = document.createElement('canvas');
  smokeTexture.width = smokeTexture.height = cells*4;
  smokeCtx = smokeTexture.getContext('2d');
  prepareLabels(); $('count').textContent = '0 / 7 HIT';
  showSpriteCounts();
  replayBtn.disabled = false; resetBtn.disabled = false;
  replayBtn.textContent = '▶ CAST PYROCLASM';
  note('2 fire damage to every creature — including allies and the caster.');
}
function begin() {
  if (!sc) return;
  resetBattle();
  playing = true; started = performance.now();
  replayBtn.textContent = '↻ REPLAY PYROCLASM';
  note('2 fire damage to every creature — including allies and the caster.');
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
  // The mound and its faint smoke persist for the current battlefield until
  // resetBattle(), regardless of the cinematic reaching DURATION.
  ashSmokeBornAt=levelClock;
  for (const u of resolved) if (u.dead) {
    sc.removeUnit(u.uid);
    marks.get(u.uid).el.classList.add('dead');
  }
  const lost = resolved.filter(u => u.dead).length;
  note('The storm clears. ' + lost + ' creatures have fallen into ash; the others survived.');
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
// Approved Ash A: a dusty pale-gray pixel mound, rather than the previous
// smooth ellipses, blobs or random orange wedges. One mound per defeated unit.
function ashPile(unit,age) {
  if(!pixelAtlas || age<3.59)return;
  const opacity=smooth((age-3.59)/.37);
  const point=sc.project(sc.world(unit.x,unit.y));
  const across=sc.project(sc.world(unit.x+1,unit.y));
  const tilePx=Math.hypot(across.x-point.x,across.y-point.y);
  // Keep pale powder mounds legible on both wide desktop boards and small
  // phones without letting a corpse's ash cover multiple full tiles.
  const compact=effects.clientWidth<620;
  const drawW=Math.round(clamp(tilePx*1.35,compact?27:41,compact?46:70));
  const drawH=Math.round(drawW*29/48);
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=opacity;
  ctx.drawImage(pixelAtlas.ash,
    Math.round(point.x-drawW*.5),Math.round(point.y-drawH*.58),
    drawW,drawH);
  ctx.restore();
}
// Subtle perpetual smoke from a defeated creature's Ash A powder mound.
// These are small staggered cool-gray pixel clusters, not more red fire.
// Use a separate level clock: the spell's timeline freezes at DURATION,
// but the remaining ash continues smoldering until this battle resets.
function drawAshSmoke(unit,timeSinceDeath,reduced) {
  if(ashSmokeBornAt==null||!Number.isFinite(timeSinceDeath)||timeSinceDeath<0)return;
  const wisps=ashSmokePuffs(timeSinceDeath,unit.uid,reduced);
  if(!wisps.length)return;
  const point=sc.project(sc.world(unit.x,unit.y));
  const across=sc.project(sc.world(unit.x+1,unit.y));
  const tilePx=Math.hypot(across.x-point.x,across.y-point.y);
  const compact=effects.clientWidth<620;
  const drawW=Math.round(clamp(tilePx*1.35,compact?27:41,compact?46:70));
  const drawH=drawW*29/48;
  const smokeUnit=Math.max(1.5,Math.min(3.5,drawW*.065));
  const originY=point.y-drawH*.29;
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#aab0ae';
  for(const puff of wisps){
    const x=Math.round(point.x+puff.x*drawW),y=Math.round(originY-puff.rise*drawH);
    const px=Math.max(1,Math.round(smokeUnit*(puff.size/.05)));
    ctx.globalAlpha=puff.alpha;
    ctx.fillRect(x,y,px+1,px);
    ctx.globalAlpha=puff.alpha*.55;
    ctx.fillRect(x-px,y+px,px,px);
    ctx.globalAlpha=puff.alpha*.32;
    ctx.fillRect(x+px,y-px,Math.max(1,px-1),px);
  }
  ctx.restore();
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
// Options B+C: nearest-neighbor pixel ember pops and small S-curved flames.
// Both are emitted by the caster, advected by the fluid, and masked to the 8×8
// battlefield. These replace (not augment) the old vector triangles and strokes.
function drawPixelFire(field,reduced) {
  if(!pixelAtlas)return;
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.imageSmoothingEnabled=false;
  ctx.globalCompositeOperation='source-over';
  const intensity=Number(fireSel.value);
  const flameFade=1-smooth((field.time-3.40)/.62);
  const renderPos=(p,height)=>{
    const [x,,z]=sc.world(p.x/(field.w-1)*sc.w-.5,p.y/(field.h-1)*sc.h-.5);
    return sc.project([x,height,z]);
  };
  for(const f of field.flames){
    const life=clamp(1-f.age/f.life);
    const opacity=life*flameFade*(.27+.56*f.heat)*intensity*(reduced?.58:1);
    if(opacity<.04)continue;
    const p=renderPos(f,.18+f.age*.17);
    const r=renderPos({...f,x:f.x+(field.w-1)/sc.w},.18+f.age*.17);
    const tilePx=Math.hypot(r.x-p.x,r.y-p.y);
    const height=Math.round(clamp(tilePx*(.53+f.size*.17),13,35));
    const width=Math.round(height*17/23);
    const frame=Math.min(7,Math.floor(f.age/f.life*8));
    const sprite=pixelAtlas.flames[frame];
    const wind=field.velocityAt(f.x,f.y)[0];
    ctx.save();
    ctx.globalAlpha=clamp(opacity,0,.81);
    ctx.translate(Math.round(p.x),Math.round(p.y));
    if(wind<-.8)ctx.scale(-1,1);
    ctx.drawImage(sprite,-Math.round(width/2),-height,width,height);
    ctx.restore();
  }
  // The little scattered Rising Embers remain visible during ignition,
  // expansion, impact and the brief cooling aftermath.
  for(const e of field.embers){
    const progress=clamp(e.age/e.life);
    const p=renderPos(e,.28+e.age*.85);
    const r=renderPos({...e,x:e.x+(field.w-1)/sc.w},.28+e.age*.85);
    const tilePx=Math.hypot(r.x-p.x,r.y-p.y);
    const width=Math.round(clamp(tilePx*(.18+e.size*.023),7,13));
    const height=Math.round(width*13/9);
    const frame=Math.min(7,Math.floor(progress*8));
    ctx.globalAlpha=clamp((1-progress*.65)*(reduced?.58:1),0,.94);
    ctx.drawImage(pixelAtlas.embers[frame],
      Math.round(p.x-width*.5),Math.round(p.y-height*.55),width,height);
  }
  ctx.restore();
}
// Shared visual for Pyroclasm and future eligible red fire-based board wipes.
// The live combat engine must independently resolve each card's actual rules.
function drawPyroclasm(t) {
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
  drawContainedBillows(smoke,reduced);
  drawPixelFire(smoke,reduced);
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
    if(u.dead){
      ashPile(u,t);
      if(removed)drawAshSmoke(u,levelClock-ashSmokeBornAt,reduced);
    }
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
  try {
  const dt=Math.min(.05,Math.max(0,(now-prev)/1000));prev=now;
  if (!sc || document.hidden) return;
  if (playing) {
    elapsed=Math.min(DURATION,(now-started)/1000*Number(speedSel.value));
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
    if (elapsed>=DURATION) {playing=false;replayBtn.textContent='↻ REPLAY PYROCLASM';}
  }
  levelClock+=dt; // Not capped at the spell's 5.2-second duration.
  sc.frame(dt);
  renderLabels();
  drawPyroclasm(elapsed);
  showSpriteCounts();
  } catch(err) {
    if(sc?.mode==='canvas-2d') {
      // The initial loading overlay was removed after startup. Re-create it
      // on a later CPU render failure instead of throwing from this handler.
      let loading=$('loading');
      if(!loading){
        loading=document.createElement('div');
        loading.id='loading';loading.className='loading';
        effects.parentNode.appendChild(loading);
      }
      loading.textContent='The mobile preview encountered a rendering error. Please reload to retry.';
      console.error('Pyroclasm Canvas 2D rendering error:',err);
      playing=false;sc=null;
    } else {
      startCompatibleScene(err?.message||'WebGL scene interrupted');
      resetBattle();
      begin();
    }
  }
}
replayBtn.addEventListener('click', begin);
resetBtn.addEventListener('click', resetBattle);
// Every preset starts a fresh deterministic cast for immediate A/B/C comparison.
// Only the two pixel sprite streams change; core fire, smoke, ash and damage do not.
spriteDensitySel.addEventListener('change',()=>{
  if(sc)begin();
});
particlesSel.addEventListener('change',()=>{if(sc)sc.setQuality(particlesSel.value==='high'?'high':particlesSel.value==='low'?'performance':'balanced');if(sc&&!playing)resetBattle();});
motionSel.addEventListener('change',()=>{if(sc)sc.reduced=motionSel.value==='reduced';if(sc&&!playing)resetBattle();});
window.addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  if(!sc||sc.mode==='canvas-2d')return;
  startCompatibleScene('WebGL context lost');
  begin();
});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!e.repeat&&!['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();begin();}});
(async()=>{
  try {
    // On touch phones, avoid the heavy WebGL program/shader/creature-asset
    // initialization entirely. This prevents a blank field on mobile Safari.
    if(preferCompatible){
      startCompatibleScene('mobile');
    }else{
      try {
        // Heavy WebGL scene and original 3D creature art are desktop-only
        // dynamic imports. Mobile Safari loads no 3D renderer dependency tree.
        const [{Scene},{loadAssets}]=await Promise.all([
          import('../../src/rendering/scene.js'),
          import('../../src/rendering/sprites.js')
        ]);
        const assets=await loadAssets();
        sc=new Scene(canvas,assets);
        $('renderer-status').textContent='Full 3D renderer';
        document.body.dataset.previewRenderer='webgl2';
      }catch(err){
        startCompatibleScene(err?.message||'3D initialization failed');
      }
    }
    pixelAtlas=createPixelAtlas(document);
    resize();
    resetBattle();
    $('loading').remove();
    prev=performance.now();
    requestAnimationFrame(tick);
    // Auto-preview once when ready, without writing progress or accessing a gameplay session.
    setTimeout(()=>{if(!playing&&elapsed===0&&!document.hidden)begin();},650);
  } catch (err) {
    $('loading').textContent='Unable to prepare the Pyroclasm preview. Please reload or try an updated browser.';
    console.error('Animation Lab initialization failed even in compatibility mode',err);
  }
})();
