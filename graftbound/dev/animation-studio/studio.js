// GRAFTBOUND Animation Studio: isolated visual scene using the actual WebGL battlefield renderer.
// No save, combat-run, score, Scryfall, or server state. Gameplay values are a clearly labeled fixture.
import { Scene } from '../../src/rendering/scene.js';
import { loadAssets } from '../../src/rendering/sprites.js';
import { buildEncounter } from '../../src/engine/encounters.js';
import { ACTS } from '../../src/data/encounters.js';
import { SCENARIO, PHASES, DURATION, IMPACT_TIME, resolveBoardFire } from './scenario.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), effects = $('effects'), ctx = effects.getContext('2d');
const replayBtn = $('replay'), resetBtn = $('reset'), labels = $('labels');
const speedSel = $('speed'), particlesSel = $('particles'), motionSel = $('motion');
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = n => { const t = clamp(n); return t*t*(3-2*t); };
const frac = n => n - Math.floor(n);
const rnd = n => frac(Math.sin(n * 127.1 + 18.73) * 43758.5453);
const mix = (a, b, t) => a + (b-a)*t;
const defaultReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
motionSel.value = defaultReduced ? 'reduced' : 'full';
let sc, playing = false, started = 0, elapsed = 0, prev = 0;
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
    const el = document.createElement('div');
    el.className = 'unit-label ' + (u.side === 'enemy' ? 'foe' : 'friend') + (u.uid === 1 ? ' caster' : '');
    const name = document.createElement('span');
    name.textContent = u.name;
    const hp = document.createElement('div');
    hp.className = 'hp';
    const fill = document.createElement('i');
    hp.append(fill);
    const value = document.createElement('span');
    el.append(name, hp, value);
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
    m.value.textContent = u.hp + ' / ' + u.maxHp + ' HP';
    m.el.classList.add('hit');
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
    if (!m.value.textContent) { m.value.textContent = u.hp + ' / ' + u.maxHp + ' HP'; m.fill.style.width = '100%'; }
    const v = sc.units.get(u.uid);
    if (!v || (resolved && resolved.find(n => n.uid === u.uid)?.dead && removed)) continue;
    const p = sc.project(sc.headPos(u.uid));
    m.el.style.left = p.x + 'px';
    m.el.style.top = (p.y - 8) + 'px';
    m.el.style.opacity = elapsed > 2.13 && elapsed < 2.82 ? '.10' : '1';
  }
}
function resize() {
  const rect = effects.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  effects.width = Math.max(1, Math.round(rect.width * dpr));
  effects.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  const a = clamp((age - 2.69) / 0.34);
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
  if (age<4) for (let i=0;i<3;i++){
    const xx=x+(rnd(uid*77+i)-.5)*21+Math.sin(age*2+i)*5;
    blob(xx,y-12-(age-2.6)*12-i*9,12,'#73716b99','#4a493500',0.22*(4-age)*a);
  }
}
function drawCinderstorm(t) {
  const w = effects.clientWidth, h = effects.clientHeight;
  ctx.clearRect(0, 0, w, h);
  if (!sc?.cam || t <= 0) return;
  const pos = sc.project(sc.centerPos(1));
  const center = sc.project([0,0,0]);
  const grow = smooth(t / 1.48);
  const storm = smooth((t-1.18)/0.85);
  const decay = 1-smooth((t-2.70)/0.85);
  const intensity = storm*decay;
  const reduced = motionSel.value === 'reduced';
  const count = particlesSel.value === 'low' ? 72 : particlesSel.value === 'high' ? 275 : 160;
  const xscale = Math.max(130,w*0.40), yscale = Math.max(90,h*0.34);
  if (t<3.62) {
    // Molten spiral bands connect the caster's rotation to the eventual arena-wide cyclone.
    ctx.save();
    if (!reduced) {
      ctx.globalCompositeOperation = 'screen';
      for (let ring=0; ring<5; ring++) {
        const k = clamp((t-.18-ring*.12)/1.5);
        if (!k) continue;
        const rr = mix(14, Math.min(w,h)*.46, smooth(k));
        ctx.strokeStyle = ring%2 ? 'rgba(248,100,27,.27)' : 'rgba(255,200,84,.23)';
        ctx.lineWidth = 3 + ring * 2;
        ctx.beginPath();
        ctx.ellipse(mix(pos.x,center.x,storm), mix(pos.y,center.y,storm), rr*1.3,rr*.62, -0.20, t*2.5+ring, t*2.5+ring+Math.PI*1.65);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // Fire-laced smoke, increasingly dense until the entire battlefield is obscured.
    const veil = storm * (1-smooth((t-2.72)/.65));
    if (veil) {
      ctx.fillStyle = 'rgba(18,16,15,'+(veil*(reduced?.46:.76))+')';
      ctx.fillRect(0,0,w,h);
    }
    const clouds = reduced ? 18 : Math.floor((particlesSel.value==='high'?92:particlesSel.value==='low'?34:58)*intensity);
    for (let i=0;i<clouds;i++){
      const seed=i*2.39996, angle=seed-t*(3.1+storm*7.5);
      const spiral=0.1+Math.sqrt((i+.5)/Math.max(1,clouds))*.95;
      const cx=center.x + Math.cos(angle)*xscale*spiral;
      const cy=center.y + Math.sin(angle)*yscale*spiral;
      const rad=(particlesSel.value==='low'?25:40)*(0.72+rnd(i+10))*(.55+intensity);
      blob(cx,cy,rad,i%4===0?'#9b422aab':'#3a3330e8','#1b1e1a00',Math.min(0.9,intensity*.86));
    }
    // Embers revolve tightly around the raised hands first and widen into a wildfire.
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<count;i++){
      const fraction=i/count, phase=i*2.39996;
      const wake=clamp(t*1.6-fraction*.7);
      if(wake<=0) continue;
      const orbit=phase+t*(1.8+grow*8.6)+Math.sin(i)*.4;
      const rad=(10+(9+fraction*65)*grow)+(storm* Math.min(w,h)*.29*fraction);
      const anchorX=mix(pos.x,center.x,storm*.72), anchorY=mix(pos.y,center.y,storm*.65);
      const x=anchorX+Math.cos(orbit)*rad*(1+storm*.45);
      const y=anchorY+Math.sin(orbit)*rad*(.55+storm*.13);
      const life=1-smooth((t-2.88)/.66), alpha=clamp(wake*life)*(reduced?.32:1);
      const size=1.1+rnd(i*13)*2.5+storm*2;
      ctx.fillStyle=i%4===0?'rgba(255,224,115,'+alpha+')':'rgba(255,97,28,'+alpha+')';
      ctx.fillRect(x,y,size,size*1.55);
    }
    ctx.restore();
    // A brief warm veil at the exact simultaneous impact. The HP updates happen underneath.
    if(t>IMPACT_TIME-.11&&t<IMPACT_TIME+.27){
      const flash=(1-Math.abs(t-IMPACT_TIME)/.27)*(reduced?.09:.27);
      ctx.fillStyle='rgba(255,119,37,'+Math.max(0,flash)+')';
      ctx.fillRect(0,0,w,h);
    }
  }
  if (resolved && t>=2.69) for (const u of resolved) {
    if (!u.dead) continue;
    const p=sc.project(sc.world(u.x,u.y));
    ashPile(p,t,u.uid);
  }
  if (resolved && t>=2.78 && t<3.75) for(const u of resolved) {
    if (u.dead) continue;
    const p=sc.project(sc.headPos(u.uid));
    const strength=1-smooth((t-3)/.75);
    ctx.save();ctx.globalAlpha=Math.max(0,strength);
    ctx.fillStyle='#ffbd6b';ctx.font='bold 20px Georgia';ctx.textAlign='center';
    ctx.shadowColor='#7a2700';ctx.shadowBlur=7;
    ctx.fillText('−2',p.x,p.y-38-(t-2.78)*17);
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
    if (elapsed>=2.70) removeFallen();
    if (elapsed>=DURATION) {playing=false;replayBtn.textContent='↻ REPLAY CINDERSTORM';}
  }
  sc.frame(dt);
  renderLabels();
  drawCinderstorm(elapsed);
}
replayBtn.addEventListener('click', begin);
resetBtn.addEventListener('click', resetBattle);
particlesSel.addEventListener('change',()=>{if(sc)sc.setQuality(particlesSel.value==='high'?'high':particlesSel.value==='low'?'performance':'balanced');});
motionSel.addEventListener('change',()=>{if(sc)sc.reduced=motionSel.value==='reduced';});
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
