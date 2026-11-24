// Battle HUD, input (mouse / touch / keyboard) and event playback onto the HD-2D scene.
import { availableMana } from '../engine/mana.js';
import { hasComboChoices, comboChoices, comboActiveOptions, reassembleReason } from '../engine/combo-triggers.js';
import { moveOptions, movePlayer, attackTargets, attack, castOptions, cast, endTurn, intents, canAttack, player, enemies, hazardPreview, interact, interactOptions, crystalAt, guard, channel, guardValue, stanceBlockReason, stanceMovementCost, discard, equipBattle, chooseCombo, activateCombo } from '../engine/combat.js';
import { TACTICS } from '../data/tactics.js';
import { getLegalPlayerActions, shouldAutoEnd } from '../engine/legal.js';
import { describeTile, pathWarning } from '../engine/describe.js';
import { bossPhaseOf, bossPhaseName } from '../engine/ai.js';
import { castBlockReason, spellCost, rangeLabel, formatSpellText } from '../engine/spells.js';
import { reachable, pathTo, key, unitAt, T, tileAt } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { ACTS, bossNameOf, bossTitleOf } from '../data/encounters.js';
import { resolveCard as getCard } from '../cards/catalog.js';
import { KEYWORDS, keywordLabel } from '../data/keywords.js';
import { deriveAppearance } from '../engine/appearance.js';
import { visualForRun, skinToneForSeed } from '../engine/visual-identity.js';
import { recolorSkin } from '../rendering/premium-creatures.js';
import { composePlayerSheet } from '../rendering/evolution-visuals.js';
import { composeEquippedSheet, composeAllyAttachments } from '../rendering/equipment-visuals.js';
import { auraColor } from '../rendering/aura-art.js';
import { VFX, DEFAULT_VFX, chainHop } from '../rendering/vfx.js';
import { castSpellVisual, withTimeout } from '../rendering/casting.js';
import { ICON } from './icons.js';
import { esc, cardHTML, backHTML } from './cards.js';
import { CardAnimationDirector } from './card-animation-director.js';
import { terrainInspectPlacement, TileInspectLatch } from './terrain-inspect.js';
import { exileZone, discardRequirement } from '../engine/zones.js';
import { exilePortalCanvas } from './exile-portal.js';
import { visualScale } from '../rendering/creature-scale.js';
import { wolfCoatFor, recoatSheet, WOLF_KEYS, LEADER_KEYS, LEADER_COAT, THEME_BIOME } from '../rendering/creature-variants.js';
/** Strip markup down to plain text for a tooltip; repeats until stable so no partial tag can survive (escaped again on output). */
const plainText = html => { let prev, out = String(html); do { prev = out; out = out.replace(/<[^>]*>?/g, ''); } while (out !== prev); return out.replace(/[<>]/g, ''); };

const $ = id => document.getElementById(id);
const SPELL_COL = { ember: [1, 0.55, 0.2], verdant: [0.5, 1, 0.4], tide: [0.4, 0.8, 1], umbral: [0.75, 0.45, 1], radiant: [1, 0.9, 0.5] };
const SPELL_SFX = { disfigure: 'poison', titanic: 'spell', pyroclasm: 'fireboom', lightningBolt: 'lightningImpact', spark: 'zap', shock: 'shockImpact', flameSlash: 'fireboom', salve: 'heal', chain: 'thunder', fire: 'fireboom', fireball: 'fireboom', frost: 'frost', poison: 'poison', heal: 'heal', shield: 'block', growth: 'spell', drain: 'spell', summon: 'spell', wind: 'spell' };
export const STAGE = { blank: 'Blank', stirring: 'Stirring', awakened: 'Awakened', ascendant: 'Ascendant' };
const NO_COUNTER = { boss: 'Bosses never strike back — watch their telegraphs', tapped: 'Tapped — no reaction attack', pacifism: 'Pacifism — cannot attack or block', flying: 'Flying — it cannot reach you', 'first strike': 'First Strike — no strike back', stunned: 'Stunned — no strike back', 'no power': 'Too weak to strike back' };
export function kwChips(keywords, cls = '') {
  return Object.entries(keywords).filter(([k]) => KEYWORDS[k]).map(([k, v]) => `<span class="chip ${cls}" tabindex="0" data-tip="${esc(KEYWORDS[k].text)}"><em>${KEYWORDS[k].glyph}</em>${esc(keywordLabel(k, v))}</span>`).join('');
}

const exileCount = s => { const z = exileZone(s); return z.yours.length + z.foes.length; };
/** v1.8.1 status presentation (pure). Friendly buffs rise, hostile effects drip; colours are fixed per status so they
 *  stay distinguishable. Re-uses previous entries so pulse timers don't restart on every label refresh. */
const s0Traits = ui => ui.s?.traits || [];
export const STATUS_FX = Object.freeze({
  empowered: { col: [1, 0.8, 0.3], hostile: false }, shield: { col: [0.5, 0.8, 1], hostile: false }, guard: { col: [0.62, 0.86, 1], hostile: false },
  weakened: { col: [0.72, 0.32, 0.92], hostile: true }, poison: { col: [0.42, 0.95, 0.3], hostile: true }, stunned: { col: [1, 0.95, 0.45], hostile: true }, grounded: { col: [0.75, 0.55, 0.35], hostile: true },
});
export function statusVisuals(d, prev = []) {
  const out = [];
  for (const [k, spec] of Object.entries(STATUS_FX)) if (d?.[k] > 0) out.push(prev?.find(p => p.key === k) || { key: k, col: spec.col, hostile: spec.hostile, t: 0 });
  return out;
}
export class BattleUI {
  constructor(app) {
    this.app = app; this.audio = app.audio;
    this.disp = new Map(); this.labels = new Map(); this.busy = false; this.spell = null; this.spellMode = null; this.hover = null; this.cursor = null; this.pendingTap = null; this.intents = [];
    this.cardAnimations = new CardAnimationDirector(app); this.concealedDraws=new Map();this.initialHandConcealed=false;
    this.tileInspectLatch = new TileInspectLatch();
    this.pinnedTerrainTile = null;
    this.bindInput();
  }
  get scene() { return this.app.scene; }
  /** Every player action goes through here: the engine validates it, THEN it is recorded (ranked replay). */
  exec(d) {
    const s = this.s; let ev;
    switch (d.type) {
      case 'move': ev = movePlayer(s, d.x, d.y); break;
      case 'attack': ev = attack(s, d.uid); break;
      case 'cast': ev = cast(s, d.id, d.x, d.y, d.xValue ?? 1, d.mode ?? null); break;
      case 'interact': ev = interact(s, d.x, d.y); break;
      case 'end': ev = endTurn(s); break;
      case 'discard': ev = discard(s, d.id); break;
      case 'equip': ev = equipBattle(s,d.id,d.uid,d.slot); break;
      case 'guard': ev = guard(s); break;
      case 'channel': ev = channel(s); break;
      case 'combo': ev = chooseCombo(s,d.kind,d.arg); break;
      case 'graft': ev = activateCombo(s,d.kind,d.arg); break;
      default: throw new Error('Unknown action');
    }
    this.app.record(d);
    if (d.type !== 'end') this.autoEnds = 0;
    return ev;
  }
  wait(ms) { return new Promise(r => setTimeout(r, ms / this.app.animFactor())); }
  async start(run, s, { fresh }) {
    this.cancelAutoEnd(); this.autoEnds = 0;
    this.resetTileInspectLock();
    this._comboShowing=false;this.victoryPlayed=false;this.ending=false;this.cardAnimations.stop(); this.concealedDraws.clear();this.initialHandConcealed=!!fresh&&!!s.deck;this.run = run; this.s = s; this.spell = null; this.spellMode = null; this.hover = null; this.pendingTap = null;
    $('labels').innerHTML = ''; this.labels.clear(); this.disp.clear();
    this.scene.loadArena(s, s.rng.s ^ 0x77, ACTS[s.act || 0].theme); this.audio.setAct(s.act || 0);
    for (const u of s.units) if (u.hp > 0) this.addUnitView(u);
    this.faceOpening(s);
    this.syncDisp(); $('hud').classList.remove('hidden'); $('enc-name').textContent = s.name;
    if (this.app.live && s.spellbook.length) this.app.live.enrichAll(s.spellbook.map(e => e.id)).then(() => { if (this.s === s) this.renderHUD(); });   // real card faces when online
    this.scene.zoom = 1; this.scene.focusTarget = [0, 0, 0]; this.scene.dof = 1;
    this.refresh();
    return new Promise(async res => {
      this.done = res;
      if (fresh) {
        this.busy = true; this.refresh();
        await this.banner(s.nodeType === 'boss' ? s.name : s.nodeType === 'elite' ? 'Elite Lair · ' + s.name : s.name, s.nodeType === 'boss' ? 'boss' : '', s.nodeType === 'boss' ? bossTitleOf(s.act) : '');
        if (s.deck) await this.deckCeremony();
        this.initialHandConcealed=false;this.renderHand(s);
        // v1.7.0: no start-of-encounter threat banner; the post-victory dial is the only threat presentation.
        // v1.6.0: the post-victory Global Threat dial is the authoritative threat presentation; reinforcements still apply.
        this.busy = false;
      }
      this.refresh(); this.tutorialHints('start'); this.checkEnd(); this.promptComboChoices(); this.maybeAutoEnd();
    });
  }
  /** Visual-only arcane spiral: a stationary top cover with rotating UNDERcards.
   * Shuffling and drawing have already happened deterministically in createCombatDeck(). */
  async deckCeremony() {
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || this.app.meta.settings.cardMotion==='off' || this.app.animFactor()>50;
    if(reduced)return;
    const overlay=document.createElement('div');overlay.className='gb-shuffle-overlay';
    overlay.setAttribute('aria-label','Shuffling your encounter deck');overlay.setAttribute('role','status');
    overlay.innerHTML=`<div class="gb-shuffle-stack">${Array.from({length:8},(_,i)=>`<i class="gb-shuffle-under" style="--k:${i};--angle-a:${i*46}deg;--angle-b:${i*58+180}deg;--angle-c:${i*28}deg"></i>`).join('')}<i class="gb-shuffle-cover"></i></div><span>Arcane Shuffle · Draw 3</span>`;
    document.body.appendChild(overlay);this.audio.play('shuffle');
    const duration=this.app.animFactor()>1.5?550:1000;overlay.style.setProperty('--gb-shuffle-ms',duration+'ms');
    try{await new Promise(res=>setTimeout(res,duration+50));}finally{overlay.remove();}
  }
  stop() { this.cancelAutoEnd(); this.resetTileInspectLock();this._comboShowing=false;this.cardAnimations.stop(); this.hideHandPreview(); $('hud').classList.add('hidden'); $('labels').innerHTML = ''; this.labels.clear(); this.s = null; }
  addUnitView(u) {
    let v;
    if (u.hero) {
      const ap = deriveAppearance(this.run.evo, visualForRun(this.run));
      v = this.scene.addUnit(u, 'blank'); { const bm = this.app.assets.manifest.sprites.blank; this.scene.setUnitTexture(u.uid, composeEquippedSheet(this.app.assets, ap, u.equipment || [], u.auras || []), visualScale('blank', bm, bm.bounds, { heroSize: ap.size })); }
      v.aura = ap.effects.includes('aura') ? ap.glow : null;
      v.electro = !!s0Traits(this).includes('electrofield');   // v1.8.1 passive Electrostatic Field arcs (visual only)
      v.hover = u.keywords.flying ? 0.14 : 0;   // v0.6: fliers levitate; trample builds plant heavier steps (see play())
      v.style = { flying: !!u.keywords.flying, trample: !!u.keywords.trample, deathtouch: !!u.keywords.deathtouch, doubleStrike: !!u.keywords.doubleStrike, lifelink: !!u.keywords.lifelink,
        armored: !!ap.slots.body || ap.size >= 1.45 };
      // v0.7 casting point follows the evolved body: horns/antlers/crown channel through the head.
      v.castAt = ap.slots.head ? 'head' : 'chest';
    } else {
      const friend = u.side === 'player' && u.defId === 'sproutling';
      const comboModels={spider:'mtg_friendlySpider',birdIllusion:'mtg_friendlyBirdIllusion',tentacle:'mtg_friendlyTentacle',skeleton:'mtg_friendlySkeleton',snake:'mtg_friendlySnake',goblin:'mtg_friendlyGoblin',hornet:'mtg_friendlyHornet',squirrel:'mtg_friendlySquirrel'};
      const tokenKey = comboModels[u.traitToken] || (u.traitToken === 'elemental' ? 'mtg_friendlyElemental' :
        u.traitToken === 'drake' ? 'mtg_friendlyDrake' :
        u.traitToken === 'catsoldier' ? 'mtg_friendlyCatSoldier' :
        u.name === 'Soldier' ? 'mtg_friendlySoldier' : 'mtg_friendlySproutling');
      v = this.scene.addUnit(u, friend ? tokenKey : ENEMIES[u.defId].sprite);   // v1.7.0: size from the central species table
      // Triplicate Titan's three printed tokens have distinct animations and keywords:
      // only the Flying token may hover. The other two must plant their feet.
      if (['golemFly', 'golemVigilance', 'golemTrample'].includes(u.defId)) {
        v.hover = u.defId === 'golemFly' && u.keywords?.flying ? 0.14 : 0;
        v.style = { ...(v.style || {}), flying: !!(u.defId === 'golemFly' && u.keywords?.flying), armored: true };
      }
      { const key = friend ? tokenKey : ENEMIES[u.defId].sprite, img = this.app.assets.images[key];   // v1.7.0 wolf coats / pack leader
        const coat = LEADER_KEYS.has(key) ? LEADER_COAT : WOLF_KEYS.has(key) ? wolfCoatFor(this.run?.seed || 0, u.uid, THEME_BIOME[this.scene?.theme] || 'temperate') : null;
        if (coat && coat.hue != null && img) this.scene.setUnitTexture(u.uid, recoatSheet(img, coat, key)); }
      if (friend && tokenKey === 'mtg_friendlySoldier') {
        const src=this.app.assets.images.mtg_friendlySoldier, mask=this.app.assets.images['mtg_friendlySoldier:skinMask'];
        this.scene.setUnitTexture(u.uid,composeAllyAttachments(recolorSkin(src,mask,skinToneForSeed(this.run.seed,u.uid)),v.fw,u.equipment||[],u.auras||[]));
      }
    }
    if(u.auras?.length) this.applyAuraLight(u);
    const el = document.createElement('div'); el.className = 'ulabel ' + (u.side === 'player' ? 'player' : 'enemy'); $('labels').appendChild(el); this.labels.set(u.uid, el);
    return v;
  }
  /** Repaint the exact unit that changed, never silently update only the hero.
   * Cosmetic transitions are derived from saved battle state; no gameplay RNG. */
  refreshUnitAttachments(uid){
    const unit=this.s?.units.find(u=>u.uid===uid),v=this.scene.units.get(uid);
    if(!unit||!v)return;
    if(unit.hero){
      const app=deriveAppearance(this.run.evo,visualForRun(this.run));
      { const bm=this.app.assets.manifest.sprites.blank; this.scene.setUnitTexture(uid,composeEquippedSheet(this.app.assets,app,unit.equipment||[],unit.auras||[]),visualScale('blank',bm,bm.bounds,{heroSize:app.size})); }
    }else{
      let base=this.app.assets.images[v.key];if(!base)return;
      if(v.key==='mtg_friendlySoldier')base=recolorSkin(base,this.app.assets.images['mtg_friendlySoldier:skinMask'],skinToneForSeed(this.run.seed,uid));
      this.scene.setUnitTexture(uid,composeAllyAttachments(base,v.fw,unit.equipment||[],unit.auras||[],this.app.assets.manifest.cols));
    }
    this.applyAuraLight(unit);
  }
  applyAuraLight(unit){
    const v=this.scene.units.get(unit.uid);if(!v)return;
    const color=auraColor(unit.auras||[]);
    if(color){const n=Number.parseInt(color.slice(1),16);v.aura=[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];}
    else if(unit.hero){const ap=deriveAppearance(this.run.evo,visualForRun(this.run));v.aura=ap.effects.includes('aura')?ap.glow:null;}
    else v.aura=null;
  }
  syncDisp() {
    for (const u of this.s.units) this.disp.set(u.uid, { hp: u.hp, maxHp: u.maxHp, shield: u.statuses.shield || 0, guard: u.statuses.guard || 0, poison: u.statuses.poison || 0, stunned: u.statuses.stunned || 0, empowered: u.statuses.empowered || 0, weakened: u.statuses.weakened || 0, grounded: u.statuses.grounded || 0 });
    this.dispMana = availableMana(this.s);
  }
  frame() {
    if (!this.s || !this.scene.cam) return;
    // v1.7.0 priority-based, collision-aware label layout: hero > bosses > foes threatening damage > the rest.
    // Lower-priority labels step up out of the way (max 3 steps), then collapse to a compact bar; intents stay visible.
    const items = [];
    for (const [uid, el] of this.labels) {
      const v = this.scene.units.get(uid); if (!v) { el.style.display = 'none'; continue; }
      const p = this.scene.project(this.scene.headPos(uid)); el.style.display = '';
      const u = this.s.units.find(x => x.uid === uid), it = this.intents.find(i => i.uid === uid);
      items.push({ el, x: p.x, y: p.y, h: el._h || 24, pr: u?.hero ? 0 : u?.boss ? 1 : it && it.damage ? 2 : 3 });
    }
    items.sort((a, b) => a.pr - b.pr || b.y - a.y);
    const placed = [], W = 58, hit = (x, y, h) => placed.some(r => Math.abs(r.x - x) < W && y > r.y - r.h - 2 && y - h < r.y + 2);
    for (const it of items) {
      let y = it.y, steps = 0; while (hit(it.x, y, it.h) && steps < 3) { y -= Math.max(10, it.h * 0.55); steps++; }
      const compact = it.pr >= 2 && hit(it.x, y, it.h); it.el.classList.toggle('compact', compact);
      placed.push({ x: it.x, y, h: compact ? 10 : it.h }); it.el.style.transform = `translate(${it.x | 0}px, ${y | 0}px)`;
    }
  }
  renderLabel(uid) {
    const el = this.labels.get(uid); const d = this.disp.get(uid); if (!el || !d) return;
    const pct = Math.max(0, d.hp / d.maxHp) * 100;
    const it = this.intents.find(i => i.uid === uid);
    let intent = '';
    if (it && this.s.phase === 'player') {
      const ic = { attack: ICON.sword, spit: ICON.spit, hex: ICON.stun, harpoon: ICON.hook, aim: ICON.aim, fire: ICON.aim, slam: ICON.slam, summon: ICON.summon, support: ICON.shield, guard: ICON.guard, stunned: ICON.stun, move: ICON.move }[it.kind] || ICON.move;
      const cls = it.kind === 'fire' || it.kind === 'slam' ? 'locked' : (it.damage ? 'threat' : 'calm');
      intent = `<div class="intent ${cls}" title="${esc(this.intentText(it))}">${ic}${it.damage ? `<b>${it.damage}</b>` : ''}${it.extra ? `<span class="xtra">+${ICON.sword}${it.extra}</span>` : ''}${it.poison ? `<span class="psn">${ICON.poison}${it.poison}</span>` : ''}${it.weaken ? `<span class="wk">−${it.weaken}⚔</span>` : ''}</div>`;
    }
    const u = this.s.units.find(x => x.uid === uid);
    const armor = u && u.keywords && u.keywords.armor ? `<span class="st ar">▣${u.keywords.armor}</span>` : '';
    const stList = [armor, u?.slime ? `<span class="st gb-slime" title="Toxrill: ${u.slime} slime counter(s), -${u.slime}/-${u.slime}">☣${u.slime}</span>` : '', d.grounded ? `<span class="st gr">${ICON.hook}</span>` : '', d.weakened ? `<span class="st wk">−${d.weakened}⚔</span>` : '', d.shield ? `<span class="st sh">${ICON.shield}${d.shield}</span>` : '', u?.statuses?.guardShield > 0 ? `<span class="st sh gb-guard" title="Guard: ${u.statuses.guardShield} temporary shield remains until next turn">${ICON.guard}${u.statuses.guardShield}</span>` : '', d.poison ? `<span class="st ps">${ICON.poison}${d.poison}</span>` : '', d.stunned ? `<span class="st sn">${ICON.stun}</span>` : '', d.empowered ? `<span class="st em">+${d.empowered}</span>` : ''];
    // v1.7.0: at most 3 status chips; the rest fold into a '+n' chip (full list in its tooltip)
    const stShown = stList.filter(Boolean), st = (stShown.length > 3 ? [...stShown.slice(0, 2), `<span class="st more" title="${esc(stShown.slice(2).map(plainText).join(' · '))}">+${stShown.length - 2}</span>`] : stShown).join('');
    el.innerHTML = `${intent}<div class="hpbar"><i style="width:${pct}%"></i><span>${d.hp}</span></div><div class="sts">${st}</div>`;
    el._h = el.offsetHeight || 24;
    { const view = this.scene.units.get(uid); if (view) view.statusFx = statusVisuals(d, view.statusFx); }
  }
  intentText(it) {
    const tgt = it.target && this.s.units.find(u => u.uid === it.target);
    const who = tgt && !tgt.hero ? ' your ' + tgt.name : ' you';
    return (({ attack: `Will strike${who} for ${it.damage}`, spit: `Will spit for ${it.damage} and poison ${it.poison}`, hex: `Will curse you: ${it.damage} damage and −${it.weaken} power on your next turn`,
      harpoon: `Harpoon: ${it.damage} damage${it.ground ? ' and Grounds you (no flying next turn)' : ''}`, aim: 'Will take aim along a line', fire: `Fires ${it.damage} along the red line`,
      slam: `${it.damage} to every red tile${it.extra ? ` (and strikes for ${it.extra} if adjacent)` : ''}`, summon: 'Will summon reinforcements', smash: 'Will smash through the rock (uses its whole turn)', support: 'Will empower its Saprolings', guard: 'Will shield adjacent allies', stunned: 'Stunned — loses its next action' })[it.kind] || 'Will move')
      + (it.quick ? ` · then a quick shot for ${it.quick.damage} at ${(t => !t || t.hero ? 'you' : 'your ' + t.name)(this.s.units.find(u => u.uid === it.quick.target))}` : '')
      + (it.guarded ? ` · Blocks ${it.guarded}` : '') + (it.silence ? ` · Silences your ${getCard(it.silence).name} next turn` : '')
      + (it.redact ? ` · Redaction: your ${KEYWORDS[it.redact].name} is suppressed during your next turn (it returns after)` : '') + (it.briars ? ' · Briars will sprout around you (fire burns them)' : '') + (it.mirror ? ` · Will copy your ${KEYWORDS[it.mirror].name}` : '');
  }
  renderHUD() {
    const s = this.s; const p = player(s); const d = this.disp.get(p.uid) || { hp: p.hp, maxHp: p.maxHp, shield: 0 };
    const ap = deriveAppearance(this.run.evo, visualForRun(this.run));
    d.guardShield = p.statuses.guardShield || 0;
    $('plate').innerHTML = `
      <div class="pl-top"><div><div class="pl-name">${esc(this.run.name)}</div><div class="pl-stage">${STAGE[ap.stage]} · ${this.run.evo.absorbed.length} graft${this.run.evo.absorbed.length === 1 ? '' : 's'}</div></div>
      <div class="pl-pt" title="Power / Toughness"><span class="${d.empowered ? 'buff' : d.weakened ? 'debuff' : ''}">${Math.max(0, p.power + (d.empowered || 0) - (d.weakened || 0))}</span>/<span>${p.toughness}</span></div></div>
      <div class="pl-hp" tabindex="0" data-tip="Health ${d.hp}/${d.maxHp}${d.shield ? ` · shield ${d.shield} absorbs damage first` : ''}${d.guardShield ? ` · ${d.guardShield} temporary Guard shield expires next turn` : ''}. Wounds carry between battles."><div class="bar"><i style="width:${(d.hp / d.maxHp) * 100}%"></i>${d.shield ? `<u style="width:${Math.min(100, d.shield / d.maxHp * 100)}%"></u>` : ''}</div>
      <span>${ICON.heart}${d.hp}<small>/${d.maxHp}</small>${d.shield ? ` <em class="shd" title="Shield ${d.shield}: absorbs ${d.shield} total damage, then is gone">${ICON.shield}${d.shield}</em>` : ''}${d.guardShield ? ` <em class="shd gb-guard" title="${d.guardShield} temporary shield points from Guard. Absorbed once and expire next turn.">${ICON.guard}Temp ${d.guardShield}</em>` : ''}</span></div>
      <div class="pl-res"><span class="mana" tabindex="0" data-tip="Mana ${this.dispMana}/${s.p.maxMana}. Spells cost gems. You regain ${s.p.regen} each turn${s.p.arcane ? `; Arcane adds +${s.p.arcane} to spell numbers` : ''}.">${Array.from({ length: Math.max(s.p.maxMana, this.dispMana) }, (_, i) => `<i class="${i < this.dispMana ? 'on' : ''}">${ICON.gem}</i>`).join('')}</span>
</div>
      <div class="pl-act" role="group" aria-label="Movement, attacks and banked mana"></div>
      <div class="pl-kw">${kwChips(p.keywords)}${d.poison ? `<span class="chip bad" tabindex="0" data-tip="Poison: lose ${d.poison} health at the start of your turn, then it drops by 1.">${ICON.poison}Poison ${d.poison}</span>` : ''}${p.slime ? `<span class="chip bad" tabindex="0" data-tip="Toxrill adds one slime counter at each end step. Each counter gives −1/−1 while Toxrill is alive.">☣ Slime ${p.slime}</span>` : ''}${d.grounded ? `<span class="chip bad" tabindex="0" data-tip="Grounded: no flying and −1 movement this turn.">${ICON.hook}Grounded</span>` : ''}${p.suppressed ? `<span class="chip bad" tabindex="0" data-tip="Redacted by the Unwritten for this turn only. It returns when your turn ends.">✖ ${esc(Object.keys(p.suppressed).map(k => KEYWORDS[k].name).join(', '))}</span>` : ''}</div>`;
    // v1.5.0 compact HUD: movement and attacks live in the hero plate's action strip (one coordinated panel).
    $('gb-action-counters').innerHTML = '';
    const strip = $('plate').querySelector('.pl-act');
    if (strip) {
      strip.classList.toggle('has-treasure', (s.combo?.treasure || 0) > 0);
      strip.innerHTML = `<span class="moves" tabindex="0" data-tip="Movement left this turn (tiles). Hazards may damage ground units.">${ICON.move}<b>${s.phase === 'player' ? s.p.moveLeft : 0}</b><small>move</small></span>
      <span class="atk ${s.p.attacksLeft > 0 && s.phase === 'player' ? 'on' : ''}" tabindex="0" data-tip="Attacks left this turn.">${ICON.sword}<b>${s.phase === 'player' ? s.p.attacksLeft : 0}</b><small>attack</small></span>
      <span class="gb-reserve" tabindex="0" data-tip="Banked mana and Channel charges persist; Treasure charges from Storm-Kiln Artist also pay for spells.">Bank ${s.p.storedMana||0}${ICON.gem} · ${s.p.channel||0}✧${s.combo?.treasure?' · '+s.combo.treasure+' Treasure':''}</span>`;
    }
    $('enc-turn').textContent = s.phase === 'player' ? `Turn ${s.turn} · Your move` : `Turn ${s.turn} · Foes act`;
    this.renderHand(s);
    this.renderZones(s);
    if(s.deck){$('tray').setAttribute('aria-label',`Spell hand · ${s.deck.hand.length} cards · library ${s.deck.library.length} · graveyard ${s.deck.graveyard.length}`);}
    this.renderStances(s);
    const skill=$('graftPowers'), options=comboActiveOptions(s);
    if(skill){skill.hidden=!options.length&&!s.traits?.includes('skeleton');skill.disabled=this.busy||s.phase!=='player'||hasComboChoices(s)||!options.length;skill.textContent='✦';skill.setAttribute('aria-label',`Open ${options.length} available Graft Powers`);skill.title=`Graft Powers (${options.length})`;  if(!options.length&&s.traits?.includes('skeleton'))skill.title=reassembleReason(s)||'Reassemble available';}
    $('endTurn').disabled = this.busy || s.phase !== 'player';
    $('endTurn').classList.toggle('glow', s.phase === 'player' && !this.busy && !getLegalPlayerActions(s).any);
  }
  /** Original illustrated card back and the top face of the graveyard, not hidden deck contents. */
  renderZones(s) {
    const parent = $('gb-card-zones');
    if (!parent) return;
    if (!s.deck) { parent.innerHTML = ''; return; }
    const library = s.deck.library || [], grave = s.deck.graveyard || [];
    const last = grave.at(-1);
    const label = last ? getCard(last.id || last)?.name || 'Last card' : 'Empty graveyard';
    parent.innerHTML = `<button type="button" class="gb-zone gb-zone-library" data-zone="library" aria-label="Library, ${library.length} cards remaining. Inspect library rules.">
        <span class="gb-zone-art gb-deck-back">${backHTML()}</span>
        <span class="gb-zone-meta"><strong>Library</strong><em>${library.length}</em></span></button>
      <button type="button" class="gb-zone gb-zone-graveyard" data-zone="graveyard" aria-label="Graveyard, ${grave.length} cards. Latest: ${esc(label)}. Inspect graveyard.">
        <span class="gb-zone-art gb-grave-face">${last ? cardHTML(last.id || last,{small:true,uid:'graveyard-zone',extraClass:'gb-grave-top'}) : `<span class="gb-zone-empty gb-grave-empty">${ICON.graveyard}</span>`}</span>
        <span class="gb-zone-meta"><strong>Graveyard</strong><em>${grave.length}</em></span></button>
      <button type="button" class="gb-zone gb-zone-exile" data-zone="exile" aria-label="Exile, ${exileCount(s)} cards. Inspect exile.">
        <span class="gb-zone-art gb-exile-portal" aria-hidden="true" data-portal-slot></span>
        <span class="gb-zone-meta"><strong>Exile</strong><em>${exileCount(s)}</em></span></button>`;
    { const slot = parent.querySelector('[data-portal-slot]'), pc = exilePortalCanvas(); if (slot && pc) slot.appendChild(pc); }   // v1.6.0: same node every rebuild
    this.positionCardZones();
  }
  // Actual spell-hand height changes with screen size, orientation, and card count.
  // Anchor the two piles ABOVE the measured tray, not an arbitrary 94px offset.
  positionCardZones() {
    const zones=$('gb-card-zones'),tray=$('tray'),hud=$('hud');
    if(!zones||!tray||!hud)return;
    if(!window.matchMedia('(max-width: 760px)').matches){zones.style.removeProperty('--gb-zone-bottom');this.positionActionCounters();this.positionTerrainInspect();return;}
    const trayTop=tray.getBoundingClientRect().top, hudBottom=hud.getBoundingClientRect().bottom;
    if(!Number.isFinite(trayTop)||!Number.isFinite(hudBottom))return;
    const gap=14; // Also leaves room for the small selected-card lift.
    zones.style.setProperty('--gb-zone-bottom',`${Math.max(0,Math.ceil(hudBottom-trayTop+gap))}px`);
    this.positionActionCounters();
    this.positionTerrainInspect();
  }
  /** Position the separate movement/attack badges OUTSIDE the hero plate. */
  positionActionCounters() {
    const el=$('gb-action-counters'), plate=$('plate'), zones=$('gb-card-zones'), tray=$('tray'), hud=$('hud');
    if(!el||!plate||!hud)return;
    const h=hud.getBoundingClientRect(), p=plate.getBoundingClientRect();
    const r=element=>{const v=element?.getBoundingClientRect();return v&&v.width&&v.height?{left:v.left-h.left,top:v.top-h.top,right:v.right-h.left,bottom:v.bottom-h.top}:null;};
    const box=r(el); if(!box)return;
    const obstacles=[r(zones),r(tray),r($('endTurn')),r(document.querySelector('.topbtns'))].filter(Boolean);
    const pw=box.right-box.left, ph=box.bottom-box.top;
    const px=p.left-h.left, py=p.bottom-h.top+8;
    const overlaps=(a,b)=>a.left<b.right+6&&a.right>b.left-6&&a.top<b.bottom+6&&a.bottom>b.top-6;
    const xs=[px,Math.max(8,h.width-pw-8),Math.max(8,p.right-h.left+8)];
    let found=null;
    for(let top=py;top+ph<=h.height-8&&!found;top+=8){
      for(const left of xs){
        const box={left,top,right:left+pw,bottom:top+ph};
        if(left>=8&&box.right<=h.width-8&&obstacles.every(o=>!overlaps(box,o))){found=box;break;}
      }
    }
    // A very short viewport may have no free dock. Never paint over card piles.
    el.classList.toggle('gb-dock-no-room',!found);
    if(found){el.style.setProperty('--gb-actions-left',found.left+'px');el.style.setProperty('--gb-actions-top',found.top+'px');}
  }
  /** Mobile compactness is a rendering rule, not just a CSS breakpoint. On a
   * touch phone, a stale viewport width must never expose the full rules panel. */
  compactInspector() {
    if (typeof window === 'undefined') return false;
    const w = window;
    return !!(w.matchMedia?.('(max-width: 760px)')?.matches ||
      (Number.isFinite(w.innerWidth) && w.innerWidth <= 760) ||
      (w.navigator?.maxTouchPoints > 0 &&
        ((Number.isFinite(w.screen?.width) && w.screen.width <= 760) ||
         (Number.isFinite(w.screen?.height) && w.screen.height <= 600) ||
         (Number.isFinite(w.visualViewport?.width) && w.visualViewport.width <= 760))));
  }
  /** Both creature and terrain inspectors use real obstacle-aware placement. */
  positionTerrainInspect() {
    const el=$('inspect');
    if(!el?.classList.contains('show'))return;
    const plate=$('plate'), zones=$('gb-card-zones'), tray=$('tray'), hud=$('hud');
    if(!plate||!zones||!tray||!hud)return;
    this.positionActionCounters();
    const h=hud.getBoundingClientRect();
    const relative=node=>{const r=node?.getBoundingClientRect();return r&&r.width&&r.height?{left:r.left-h.left,top:r.top-h.top,right:r.right-h.left,bottom:r.bottom-h.top}:null;};
    const unit=el.classList.contains('unit-inspect');
    const mobile=this.compactInspector();
    const pos=terrainInspectPlacement({
      width:h.width,height:h.height,plate:relative(plate),zones:relative(zones),
      tray:relative(tray),endTurn:relative($('endTurn')),topButtons:relative(document.querySelector('.topbtns')),
      actions:$('gb-action-counters')?.classList.contains('gb-dock-no-room')?null:relative($('gb-action-counters')),
      // v1.5.0: ordinary ground gets a slim panel; complex terrain and creatures expand.
      desiredHeight:unit?(mobile?48:224):mobile?48:el.classList.contains('terrain-plain')?46:54,
      minHeight:unit?(mobile?48:112):mobile?48:el.classList.contains('terrain-plain')?46:50,
      maxWidth:unit?(mobile?280:350):mobile?250:el.classList.contains('terrain-plain')?240:330
    });
    if(pos.fits){
      el.style.setProperty('--gb-terrain-top',pos.top+'px');
      el.style.setProperty('--gb-terrain-left',pos.left+'px');
      el.style.setProperty('--gb-terrain-width',pos.width+'px');
      el.style.setProperty('--gb-terrain-height',pos.height+'px');
    }
    el.classList.toggle('terrain-no-room',!pos.fits);
  }
  terrainDetailsHTML(t) {
    const rows=describeTile(this.s,t.x,t.y);
    const warning=this.s.phase==='player'?pathWarning(this.s,t.x,t.y):null;
    return `<h2>Tile details · ${esc(rows.map(r=>r.name).join(' + '))}</h2>` +
      rows.map(r=>`<section class="gb-terrain-detail"><h3>${esc(r.name)}</h3><p>${esc(r.text)}</p><p class="muted small">${esc(r.when)}</p></section>`).join('') +
      (warning ? `<p class="take">${esc(warning.text)}${warning.lethal?' This would defeat you.':''}</p>`:'') +
      `<button type="button" class="btn primary" data-close>Close</button>`;
  }
  inspectZone(zone) {
    if (!this.s?.deck) return;
    const d=this.s.deck;
    if (zone === 'library') {
      this.app.openModal(`<h2>Library · ${d.library.length} cards</h2><p>Your shuffled library is face-down. Drawing moves the top card into your hand; its identity stays hidden until drawn.</p><button class="btn primary" type="button" data-close>Close</button>`);
      return;
    }
    if (zone === 'exile') {
      const z = exileZone(this.s);
      this.app.openModal(`<h2>Exile · ${z.yours.length + z.foes.length} cards</h2><p class="small">Exiled cards are out of play: they never return to your library and graveyard recursion cannot reach them.</p>
        <h3 class="gb-exile-h">Your cards · ${z.yours.length}</h3><div class="gb-grave-list">${z.yours.length ? z.yours.map((e,i)=>`<div class="gb-grave-list-card">${cardHTML(e.id,{small:true,uid:'exile-list'+i})}</div>`).join('') : '<p>None of your cards are in exile.</p>'}</div>
        <h3 class="gb-exile-h">Exiled creatures · ${z.foes.length}</h3>${z.foes.length ? `<ul class="gb-exile-foes">${z.foes.map(f=>`<li>${esc(f.name)}<small>${esc(f.why)}</small></li>`).join('')}</ul>` : '<p>No opposing creatures are in exile.</p>'}
        <button class="btn primary" type="button" data-close>Close</button>`);
      return;
    }
    const cards=[...d.graveyard].reverse();
    this.app.openModal(`<h2>Graveyard · ${cards.length} cards</h2><p class="small">Most recently placed card first. These cards are available to graveyard-recursion abilities.</p>
      <div class="gb-grave-list">${cards.length ? cards.map((e,i)=>`<div class="gb-grave-list-card">${cardHTML(e.id || e,{small:true,uid:'grave-list'+i})}</div>`).join('') : '<p>Your graveyard is empty.</p>'}</div><button class="btn primary" type="button" data-close>Close</button>`);
  }
  /** v0.8 spell hand: the actual Magic card faces (unmodified Scryfall image when available, GRAFTBOUND frame
   *  offline) with small overlays for GRAFTBOUND's adapted mana cost, level, availability and selection. */
  renderHand(s) {
    const tray = $('tray');
    if (!s.spellbook.length) { tray.innerHTML = `<div class="tray-empty">${ICON.book}<span>Your hand is empty · draw again next turn</span></div>`; return; }
    const scrollX = tray.scrollLeft;
    tray.classList.toggle('many', s.spellbook.length > 5);
    tray.classList.toggle('overflowing', s.spellbook.length > 7);
    tray.setAttribute('aria-label', `Spell hand, ${s.spellbook.length} spells, horizontally scroll to see more`);
    const dr = discardRequirement(s), discarding = dr.need > 0 && !this.busy;
    tray.classList.toggle('discard-mode', discarding);
    if (!discarding) this.discardArmed = null;
    this.renderDiscardBar(dr);
    tray.innerHTML = s.spellbook.map((e, i) => {
      const c = getCard(e.id); const why = this.busy ? 'Wait…' : castBlockReason(s, e.id); const cost = spellCost(s, e.id);
      const state = s.p.cast[e.id] ? 'used' : s.p.silenced === e.id ? 'silenced' : why && /mana/i.test(why) ? 'nomana' : why ? 'off' : 'ready';
      const label = { used: 'Cast this turn', silenced: 'Silenced', nomana: 'Not enough mana', off: why || '', ready: 'Ready' }[state];
      const hidden=this.initialHandConcealed || (s.spellbook.slice(i+1).filter(item=>item.id===e.id).length < (this.concealedDraws.get(e.id)||0));
      return `<button type="button" class="handcard c-${c.color} ${hidden?'gb-draw-concealed ':''}${this.spell === e.id ? 'sel' : ''} st-${state}" data-spell="${esc(e.id)}" style="--i:${i};--n:${s.spellbook.length}"
          aria-pressed="${this.spell === e.id}" aria-label="${esc(c.name)}, ${cost} mana in GRAFTBOUND, level ${e.level}. ${esc(label)}. ${esc(formatSpellText(e.id, e.level, s.p.arcane))}">
        ${cardHTML(e.id, { small: true, level: e.level, arcane: s.p.arcane, uid: 'hand' + i, extraClass: 'in-hand' })}
        <span class="hc-cost ${cost > c.cost ? 'taxed' : ''}" title="GRAFTBOUND mana cost (not the printed Magic cost)">${ICON.gem}${cost}</span>
        ${e.level > 1 ? `<span class="hc-lvl" title="Spell level">Lv ${e.level} · ${'✦'.repeat(e.level - 1)}</span>` : ''}
        <span class="hc-state">${esc(label)}</span><kbd>${i + 1}</kbd>
        <span class="hc-info" data-inspect="${esc(e.id)}" role="button" tabindex="-1" aria-label="Inspect ${esc(c.name)}">i</span>
        ${discarding ? `<span class="hc-discard ${this.discardArmed === i ? 'armed' : ''}" data-discard-i="${i}" role="button" tabindex="0" aria-label="Discard ${esc(c.name)} to your Graveyard">Discard</span>` : ''}</button>`;
    }).join('');
    tray.scrollLeft = scrollX;
  }
  showHandPreview(id) {
    if (!this.s || !this.s.spellbook.some(e => e.id === id)) return;
    let el = $('hand-readout');
    if (!el) { el = document.createElement('div'); el.id = 'hand-readout'; el.className = 'hand-readout'; $('hud').appendChild(el); }
    const e = this.s.spellbook.find(sp => sp.id === id), c = getCard(id);
    const why = castBlockReason(this.s, id);
    el.innerHTML = `<small>Spellbook · level ${e.level}</small><b>${esc(c.name)}</b>
      <p>${esc(formatSpellText(id, e.level, this.s.p.arcane))}</p>
      <span>${ICON.gem}${spellCost(this.s, id)} mana · ${esc(rangeLabel(id, e.level))} · ${id === 'mtg:healing-salve' ? 'Choose one of two modes' : c.target === 'ally' ? 'Choose a friendly creature' : c.target === 'enemy' ? 'Choose a foe' : c.target === 'self' ? 'Self' : 'Choose a tile'}</span>
      <em>${why ? esc(why) : 'Ready to cast'}</em>`;
    el.classList.add('show');
  }
  hideHandPreview() { const el = $('hand-readout'); if (el) el.classList.remove('show'); }
  /** Guard requires the full unspent movement budget; Channel requires one movement point. */
  renderStances(s) {
    let el = $('stances'); if (!el) { el = document.createElement('div'); el.id = 'stances'; el.className = 'stances'; $('hud').appendChild(el); }
    const p = player(s); const gv = guardValue(p);
    const b = (kind, label, tip, key) => { const why = this.busy ? 'Wait…' : stanceBlockReason(s, kind); return `<button type="button" class="stance ${why ? 'off' : ''} ${p.statuses[kind] || (kind === 'channel' && s.p.channel) ? 'on' : ''}" data-stance="${kind}" data-tip="${esc(tip + (why ? ' — ' + why : ''))}" aria-label="${esc(label + '. ' + tip + (why ? '. ' + why : ''))}"><b>${label}</b><span class="stance-cost">${ICON.move}${kind === 'guard' ? 'ALL ' + stanceMovementCost(s, 'guard') : TACTICS[kind].moveCost} · ${ICON.sword}1</span><kbd>${key}</kbd></button>`; };
    el.innerHTML = b('guard', `${ICON.shield} Guard ${gv}`, `Spend ALL ${stanceMovementCost(s, 'guard')} movement and your attack before moving. Gain ${gv} temporary Shield (2 + toughness ÷ ${TACTICS.guard.perToughness}, max ${TACTICS.guard.max}); it absorbs ${gv} total damage, then expires at the start of your next turn. It does not reduce every hit.`, 'G')
      + b('channel', `${ICON.gem} Channel`, `Spend ${TACTICS.channel.moveCost} movement and your attack: bank up to 2 reserve mana and 2 spell charges. Both persist across turns until spent.`, 'H');
  }
  refresh() {
    if (!this.s) return;
    this.intents = this.s.phase === 'player' ? intents(this.s) : [];
    for (const uid of this.labels.keys()) this.renderLabel(uid);
    this.renderHUD(); this.refreshHighlights();
  }
  refreshHighlights() {
    const s = this.s; if (!s) return;
    const tiles = [];
    const danger = this.intents.flatMap(i => (i.kind === 'fire' || i.kind === 'slam') ? i.tiles : []);
    this.scene.setDanger(danger); this.scene.setHazard(s.phase === 'player' ? hazardPreview(s) : []);
    if (danger.length) this.app.hint('danger', 'Red tiles will be struck on the enemy turn. Step out of them — foes standing there get hit too.');
    if (hazardPreview(s).length) this.app.hint('rift', 'Violet rifts pulse for 3 damage at the end of this round. Do not end your turn on them.');
    for (const v of this.scene.units.values()) v.outline = 0;
    if (this.busy || s.phase !== 'player') { this.scene.setOverlay(this.cursorTiles([])); return; }
    const hv = this.scene.units.get(player(s).uid); if (hv) hv.outline = 0.25;
    if (this.spell) {
      const opts = castOptions(s, this.spell, this.spellMode); const c = getCard(this.spell);
      for (const t of opts) tiles.push({ ...t, col: c.target === 'enemy' ? [0.75, 0.5, 1, 0.55] : [0.6, 0.45, 1, 0.28], ring: c.target === 'enemy' });
      for (const t of opts) { const u = unitAt(s, t.x, t.y); if (u) { const v = this.scene.units.get(u.uid); if (v) v.outline = 0.5; } }
      const h = this.hover;
      if (h && opts.some(o => o.x === h.x && o.y === h.y)) {
        const eff = c.effect || this.spell; const area = eff === 'venom_mist' ? 'sq' : eff === 'starfall' ? 'plus' : null;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!area && (dx || dy)) continue; if (area === 'plus' && dx && dy) continue; tiles.push({ x: h.x + dx, y: h.y + dy, col: [0.85, 0.6, 1, 0.7], ring: true }); }
      }
    } else {
      const mo = moveOptions(s);
      for (const t of mo) tiles.push({ x: t.x, y: t.y, col: tileAt(s, t.x, t.y) === T.LAVA ? [1, 0.4, 0.15, 0.3] : [0.95, 0.78, 0.35, 0.22] });
      for (const e of attackTargets(s)) tiles.push({ x: e.x, y: e.y, col: [1, 0.3, 0.2, 0.85], ring: true });
      const h = this.hover;
      if (h) {
        const e = unitAt(s, h.x, h.y);
        if (e && e.side === 'enemy') {
          for (const v of reachable(s, e, e.move).values()) if (v.stop && v.cost > 0) tiles.push({ x: v.x, y: v.y, col: [0.9, 0.25, 0.2, 0.16] });
          const plan = this.autoAttackPlan(e); if (plan && plan.move) for (const t of plan.path) tiles.push({ ...t, col: [1, 0.9, 0.55, 0.5], inset: 0.12 });
          const ev = this.scene.units.get(e.uid); if (ev) ev.outline = 0.6;
        } else if (mo.some(o => o.x === h.x && o.y === h.y)) for (const t of pathTo(reachable(s, player(s), s.p.moveLeft), h.x, h.y)) tiles.push({ ...t, col: [1, 0.9, 0.55, 0.55], inset: 0.12 });
      }
    }
    this.scene.setOverlay(this.cursorTiles(tiles));
  }
  cursorTiles(tiles) { if (this.cursor) tiles.push({ ...this.cursor, col: [1, 1, 1, 0.9], ring: true, inset: -0.02 }); return tiles; }
  autoAttackPlan(e) {
    const s = this.s; const p = player(s);
    if (s.p.attacksLeft <= 0) return null;
    if (canAttack(s, p, e)) return { move: false };
    const map = reachable(s, p, s.p.moveLeft);
    const best = [...map.values()].filter(v => v.stop && v.cost > 0 && canAttack(s, { ...p, x: v.x, y: v.y }, e)).sort((a, b) => (tileAt(s, a.x, a.y) === T.LAVA) - (tileAt(s, b.x, b.y) === T.LAVA) || a.cost - b.cost || a.y - b.y || a.x - b.x)[0];
    return best ? { move: true, to: best, path: pathTo(map, best.x, best.y) } : null;
  }
  simulate(fn) {
    const c = structuredClone(this.s); try { fn(c); } catch { return null; }
    const p0 = player(this.s), p1 = player(c);
    const res = { taken: p0.hp + (p0.statuses.shield || 0) - p1.hp - (p1.statuses.shield || 0), dealt: [] };
    for (const e of enemies(this.s)) { const e1 = c.units.find(u => u.uid === e.uid); const dmg = e.hp - (e1 ? e1.hp : 0); if (dmg > 0) res.dealt.push({ e, dmg, dead: !e1 || e1.hp <= 0 }); }
    return res;
  }
  previewHTML(pv) {
    if (!pv) return '';
    const dealt = pv.dealt.map(d => `${esc(d.e.name)}: −${d.dmg}${d.dead ? ' <b class="kill">defeated</b>' : ''}`).join('<br>');
    return `<div class="preview">${dealt || 'No damage'}${pv.taken > 0 ? `<br><span class="take">You take ${pv.taken}</span>` : '<br><span class="safe">You take nothing</span>'}</div>`;
  }
  resetTileInspectLock() {
    this.tileInspectLatch?.reset();
    this.pinnedTerrainTile = null;
    const el = $('inspect');
    el?.classList.remove('terrain-locking', 'terrain-locked');
    el?.removeAttribute?.('data-tile-pinned');
  }
  /** Unpin on the FIRST game input without consuming that input. Reading remains pinned on hover. */
  releasePinnedTileForAction() {
    if (!this.tileInspectLatch?.locked && !this.pinnedTerrainTile) return;
    this.resetTileInspectLock();
    this.hover = null;
    this.terrainTile = null;
    $('inspect')?.classList.remove('show');
    if (this.s) this.refreshHighlights();
  }
  /** Opening terrain Details consumes the pin; closing the modal returns to normal hover/controls. */
  openTerrainDetails() {
    if (!this.s || !this.terrainTile) return;
    const details = this.terrainDetailsHTML(this.terrainTile);
    this.resetTileInspectLock();
    this.terrainTile = null;
    this.hover = null;
    this.showInspect(null);
    this.refreshHighlights();
    this.app.openModal(details);
  }
  showInspect(u, preview) {
    this.resetTileInspectLock();
    const el = $('inspect');
    el.classList.remove('terrain-inspect', 'unit-inspect', 'unit-compact', 'terrain-no-room', 'terrain-plain');
    if (!u) { this.unitDetailsHTML = null; el.classList.remove('show'); return; }
    const compact = this.compactInspector();
    const def = ENEMIES[u.defId]; const it = this.intents.find(i => i.uid === u.uid);
    const friendly = u.side === 'player';
    const type = friendly ? (u.hero ? 'Your creature' : `Summoned ally · ${u.name}`) : (def?.role || 'Foe');
    const statuses = Object.entries(u.statuses || {}).filter(([, val]) => typeof val === 'number' && val > 0)
      .map(([name, val]) => `<span class="chip ${name === 'poison' || name === 'weakened' ? 'bad' : ''}">${esc(name)} ${val}</span>`).join('');
    const currentPower = Math.max(0, u.power + (u.statuses?.empowered || 0) - (u.statuses?.weakened || 0));
    const full = `
      <div class="in-head"><b>${esc(u.name)}</b><em class="role">${esc(type)}</em>${u.legendary ? '<em class="leg">Legendary</em>' : ''}<span class="pt">${currentPower}/${u.toughness}</span></div>
      <div class="in-types">${esc(u.creatureTypes || def?.tribe || (u.hero ? 'Grafted Hero' : u.token ? 'Soldier' : 'Creature'))}</div>
      <div class="in-hp">${ICON.heart}${u.hp}/${u.maxHp}${u.statuses?.shield ? ` · ${ICON.shield}${u.statuses.shield}` : ''}${u.boss ? ` · Printed ${u.power}/${u.toughness} · Legendary Vitality +${u.legendaryVitality || 0} · Deathtouch cannot instantly destroy this boss · Phase ${bossPhaseOf(u)}/3 · ${esc(bossPhaseName(u))}` : ''}</div>
      <p class="in-stats">Movement ${u.move} · Base attack ${u.power}${currentPower !== u.power ? ` → <b>${currentPower} buffed</b>` : ''} · ${friendly ? 'Friendly' : 'Hostile'}</p>
      ${Object.keys(u.keywords || {}).length ? `<div class="in-kw">${kwChips(u.keywords)}</div>` : ''}
      ${statuses || u.slime ? `<div class="in-status">${statuses}${u.slime ? `<span class="chip bad">☣ Slime ${u.slime} · −${u.slime}/−${u.slime} while Toxrill lives</span>` : ''}</div>` : ''}
      ${def?.affinity ? `<div class="in-affinity"><span>Resists ${esc(def.affinity.resist)} spells −1 damage</span><span>Weak to ${esc(def.affinity.weak)} spells +1 damage</span></div>` : ''}
      <p>${esc(friendly ? (u.hero ? 'Your evolving graftbound form.' : `${u.name} ally. It acts automatically when your turn ends. Friendly-target spells can enhance or shield it.`) : (def?.blurb || ''))}</p>
      ${it ? `<p class="in-intent">${esc(this.intentText(it))}</p>` : ''}${this.previewHTML(preview)}`;
    this.unitDetailsHTML = `<h2>${esc(u.name)} · Creature details</h2><div class="gb-unit-full">${full}</div><div class="modal-actions"><button type="button" class="btn primary" data-close>Close</button></div>`;
    // The battlefield shows ONLY name, power/toughness, and Details on phones.
    // The complete description, intent, statuses and combat preview live in the modal.
    const brief = `<div class="gb-unit-brief" style="display:flex;align-items:center;height:100%;min-width:0" aria-label="${esc(u.name)} summary">
      <div class="gb-unit-brief-row"><strong>${esc(u.name)}</strong><span class="gb-unit-vitals">${currentPower}/${u.toughness}</span><button type="button" class="gb-unit-details" data-unit-details aria-label="Full details for ${esc(u.name)}">Details</button></div></div>`;
    el.innerHTML = compact ? brief : `<div class="gb-unit-rich">${full}</div>`;
    if (compact) el.classList.add('unit-compact');
    // Inline caps are a fail-safe if Safari serves an older stylesheet.
    el.style?.setProperty('height', compact ? '48px' : '', 'important');
    el.style?.setProperty('max-height', compact ? '48px' : '', 'important');
    el.style?.setProperty('overflow', compact ? 'hidden' : '');
    el.classList.add('unit-inspect','show');
    this.positionTerrainInspect();
  }
  bindInput() {
    const cv = $('gl');
    // Capture, but do not cancel, a player's first real click/tap anywhere in the game.
    // The inspector is click-through except for Details, which unlocks itself on opening.
    $('app').addEventListener('pointerdown', e => {
      if (this.s && this.tileInspectLatch?.locked && !e.target.closest?.('[data-terrain-details]'))
        this.releasePinnedTileForAction();
    }, { capture: true });
    let downAt = null; const touches = new Map(); let pinch0 = null;
    const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const endTouch = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = null; };
    let orbit = null;   // v1.5.0 middle-mouse orbit: never selects tiles, moves or attacks
    cv.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });   // no browser autoscroll
    cv.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
    cv.addEventListener('pointerdown', e => {
      if (e.button === 1 && e.pointerType === 'mouse') { e.preventDefault(); orbit = { x: e.clientX, y: e.clientY, id: e.pointerId }; downAt = null; try { cv.setPointerCapture(e.pointerId); } catch {} cv.classList.add('orbiting'); return; }
      this.app.audio.unlock();
      if (e.pointerType === 'touch') { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { pinch0 = { d: pinchDist(), z: this.scene.zoom }; downAt = null; return; } }
      if (!pinch0) downAt = { x: e.clientX, y: e.clientY };
    });
    cv.addEventListener('pointermove', e => {
      if (orbit && e.pointerId === orbit.id) { this.scene.orbit(e.clientX - orbit.x, e.clientY - orbit.y); orbit.x = e.clientX; orbit.y = e.clientY; return; }
      if (touches.has(e.pointerId)) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch0 && touches.size === 2) this.scene.zoom = Math.min(2, Math.max(0.8, pinch0.z * pinchDist() / pinch0.d)); return; }
      if (!this.s || e.pointerType === 'touch') return; this.setHover(this.scene.pick(e.offsetX, e.offsetY));
    });
    // EU5-style timer lock: leaving the board only dismisses an UNLOCKED tooltip.
    cv.addEventListener('pointerleave', e => {
      if (this.s && e.pointerType !== 'touch' && !this.tileInspectLatch?.locked) this.setHover(null);
    });
    cv.addEventListener('pointercancel', e => { if (orbit && e.pointerId === orbit.id) { orbit = null; cv.classList.remove('orbiting'); } endTouch(e); });
    cv.addEventListener('pointerup', e => {
      if (orbit && e.pointerId === orbit.id) { orbit = null; cv.classList.remove('orbiting'); try { cv.releasePointerCapture(e.pointerId); } catch {} downAt = null; return; }
      const wasPinch = !!pinch0 || touches.size > 1; endTouch(e);
      if (!this.s || !downAt || wasPinch) return;
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 12) return;
      const t = this.scene.pick(e.offsetX, e.offsetY); if (!t) { this.cancel(); return; }
      if (e.pointerType === 'touch') this.setHover(t);
      this.onTile(t, e.pointerType === 'touch');
    });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); this.cancel(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.scene.zoom = Math.min(2, Math.max(0.8, this.scene.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
    $('gb-card-zones').addEventListener('click',e=>{const el=e.target.closest('[data-zone]');if(el)this.inspectZone(el.dataset.zone);});
    $('inspect').addEventListener('animationend', e => {
      // CSS and JavaScript must never disagree about whether the gold bar finished.
      if (e.animationName === 'gb-terrain-lock-fill' && e.target?.classList?.contains('gb-terrain-lock-progress')
          && $('inspect').classList.contains('terrain-locking')) this.tileInspectLatch?.lockNow();
    });
    $('inspect').addEventListener('click',e=>{
      if (e.target.closest('[data-terrain-details]')) { e.stopPropagation(); this.openTerrainDetails(); return; }
      if(e.target.closest('[data-unit-details]') && this.s && this.unitDetailsHTML) this.app.openModal(this.unitDetailsHTML);
      if(e.target.closest('[data-unit-dismiss]')) this.setHover(null);
    });
    window.addEventListener('resize',()=>this.positionCardZones(),{passive:true});
    window.visualViewport?.addEventListener('resize',()=>this.positionCardZones(),{passive:true});
    $('tray').addEventListener('pointerover', e => { const c = e.target.closest('[data-spell]'); if (c) this.showHandPreview(c.dataset.spell); });
    $('tray').addEventListener('focusin', e => { const c = e.target.closest('[data-spell]'); if (c) this.showHandPreview(c.dataset.spell); });
    $('tray').addEventListener('pointerleave', () => this.hideHandPreview());
    $('tray').addEventListener('focusout', e => { if (!e.relatedTarget?.closest?.('#tray')) this.hideHandPreview(); });
    $('tray').addEventListener('click', e => {
      const inf = e.target.closest('[data-inspect]'); if (inf) { e.stopPropagation(); this.app.inspectSpell(inf.dataset.inspect); return; }
      const dz = e.target.closest('[data-discard-i]'); if (dz) { e.stopPropagation(); this.discardCard(+dz.dataset.discardI); return; }
      const b = e.target.closest('[data-spell]'); if (!b) return;
      // v1.6.0: while a discard is required, tapping a card ARMS it (shows its Discard button) — it never casts.
      if ($('tray').classList.contains('discard-mode')) { const i = [...$('tray').querySelectorAll('button.handcard')].indexOf(b); this.discardArmed = this.discardArmed === i ? null : i; this.renderHand(this.s); return; }
      this.selectSpell(b.dataset.spell);
    });
    $('tray').addEventListener('keydown', e => { const dz = e.target.closest?.('[data-discard-i]'); if (dz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); this.discardCard(+dz.dataset.discardI); } });
    this.bindDiscardDrag();
    $('hud').addEventListener('click', e => { const st = e.target.closest('[data-stance]'); if (st) this.doStance(st.dataset.stance); });
    $('graftPowers').addEventListener('click', () => this.openGraftSkills());
    $('endTurn').addEventListener('click', () => this.doEndTurn());
    $('plate').addEventListener('click', () => this.app.openSheet());
    window.addEventListener('keydown', e => {
      if (!this.s || this.app.modalOpen() || this.app.mode !== 'battle') return;
      const focusedHand = document.activeElement?.closest?.('#tray');
      if (focusedHand && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const all = [...$('tray').querySelectorAll('button.handcard')];
        const index = all.indexOf(document.activeElement);
        all[Math.max(0, Math.min(all.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1))) ]?.focus();
        return;
      }
      if (document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
      const k = e.key.toLowerCase();
      if (this.tileInspectLatch?.locked && /^(arrowup|arrowdown|arrowleft|arrowright|w|a|s|d|enter| |g|h|[1-9])$/.test(k))
        this.releasePinnedTileForAction();
      const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
      if (mv) {
        e.preventDefault();
        const steps = ((Math.round((this.scene.yawTarget - Math.PI / 4) / (Math.PI / 2)) % 4) + 4) % 4;
        let [dx, dy] = mv; for (let i = 0; i < steps; i++) [dx, dy] = [-dy, dx];
        const c = this.cursor || { x: player(this.s).x, y: player(this.s).y };
        this.cursor = { x: Math.max(0, Math.min(this.s.w - 1, c.x + dx)), y: Math.max(0, Math.min(this.s.h - 1, c.y + dy)) };
        this.setHover(this.cursor); return;
      }
      if (k === 'enter') { e.preventDefault(); if (this.cursor) this.onTile(this.cursor, false); }
      else if (k === ' ') { e.preventDefault(); this.doEndTurn(); }
      else if (k === 'escape') this.cancel();
      else if (/^[1-9]$/.test(k)) { const sp = this.s.spellbook[+k - 1]; if (sp) this.selectSpell(sp.id); }
      else if (k === 'g') this.doStance('guard'); else if (k === 'h') this.doStance('channel');
    });
  }
  setHover(t) {
    // A pinned inspector owns its tile independent of transient canvas hover.
    // Mouseleave, hovering other tiles or entering Details must NOT replace it.
    // Live pointer hover drives movement/attack/path overlays even while the DETAILS panel is pinned.
    // The pin freezes only the displayed inspector HTML, never the tactical cursor.
    const pinned = !!(this.pinnedTerrainTile && this.tileInspectLatch?.locked && $('inspect')?.classList.contains('terrain-locked'));
    if ((t && this.hover && t.x === this.hover.x && t.y === this.hover.y) || (!t && !this.hover)) return;
    if (pinned) { this.hover = t; this.refreshHighlights(); return; }
    this.resetTileInspectLock();
    this.hover = t; this.refreshHighlights();
    if (!t || !this.s) { this.showInspect(null); return; }
    const u = unitAt(this.s, t.x, t.y); let preview = null;
    if (this.s.phase === 'player' && !this.busy) {
      if (this.spell && castOptions(this.s, this.spell, this.spellMode).some(o => o.x === t.x && o.y === t.y)) preview = this.simulate(c => cast(c, this.spell, t.x, t.y, this.spellX ?? 1, this.spellMode));
      else if (u && u.side === 'enemy') { const plan = this.autoAttackPlan(u); if (plan) preview = this.simulate(c => { if (plan.move) movePlayer(c, plan.to.x, plan.to.y); attack(c, u.uid); }); }
    }
    if (u) this.showInspect(u, preview);
    else if (!u && !this.spell) this.showTile(t);
    else if (preview) { $('inspect').classList.remove('terrain-inspect', 'terrain-no-room'); $('inspect').innerHTML = `<div class="in-head"><b>${esc(getCard(this.spell).name)}</b></div>${this.previewHTML(preview)}`; $('inspect').classList.add('show'); }
    else this.showInspect(null);
  }
  /** v0.6 terrain/object inspection: what it is, what it does, when, and the damage — from live rules. */
  showTile(t) {
    const s = this.s, el = $('inspect'); const rows = describeTile(s, t.x, t.y); const w = s.phase === 'player' ? pathWarning(s, t.x, t.y) : null;
    const label = rows.map(r=>r.name).join(' + ');
    const role = rows.some(r=>r.kind==='hazard') ? 'Hazard' : rows.some(r=>r.kind==='benefit') ? 'Benefit' : '';
    // A selected tile is a single short label row; the full rule text and hazard warning live in Details.
    this.terrainTile = {x:t.x,y:t.y};
    el.innerHTML = `<div class="gb-terrain-brief-head"><strong>${esc(label)}</strong><span class="gb-terrain-role">${role}</span><button class="gb-terrain-details-btn" type="button" data-terrain-details aria-label="More details about ${esc(label)}">Details</button></div>`;
    el.classList.remove('unit-inspect');
    el.classList.toggle('terrain-plain', !w && rows.length <= 1 && rows.every(r => r.kind === 'info' && !/Rock|Crystal/i.test(r.name)));
    el.classList.add('terrain-inspect','show');
    el.innerHTML += '<div class="gb-terrain-lock-progress" aria-hidden="true"></div>';
    this.positionTerrainInspect();
    // Ultra-short layouts cannot fit a panel between plate and controls.
    // A direct tile tap can still open full details without obscuring the hand.
    if(el.classList.contains('terrain-no-room')) { el.classList.remove('show'); return; }
    el.classList.add('terrain-locking');
    (this.tileInspectLatch ??= new TileInspectLatch()).watch(t, () => {
      if (!this.s || !el.classList.contains('terrain-inspect') || !el.classList.contains('show')) return;
      this.pinnedTerrainTile = { x: t.x, y: t.y };
      this.terrainTile = { ...this.pinnedTerrainTile };
      el.classList.remove('terrain-locking');
      el.classList.add('terrain-locked');
      el.setAttribute?.('data-tile-pinned', `${t.x},${t.y}`);
    });
  }
  cancelAutoEnd() {
    if (this.autoEndTimer != null) clearTimeout(this.autoEndTimer);
    this.autoEndTimer = null;
    if (this.autoEnding) this.app.status('');
    this.autoEnding = false;
  }
  canAutoEnd(s) {
    return this.s === s && this.app.mode === 'battle' && !this.app.modalOpen() &&
      !document.hidden && !this.ending && !discardRequirement(s).need &&
      shouldAutoEnd(s, { busy: this.busy, targeting: !!this.spell, enabled: this.app.meta.settings.autoEnd !== false });
  }
  maybeAutoEnd() {
    const s = this.s;
    if (this.autoEnding || !this.canAutoEnd(s)) return;
    if ((this.autoEnds || 0) >= 25) return;   // safety valve: a long stun-lock never loops unattended
    const turn = s.turn;
    this.autoEnding = true; this.app.status('No actions left — your turn ends');
    this.autoEndTimer = setTimeout(async () => {
      this.autoEndTimer = null; this.autoEnding = false;
      if (!this.canAutoEnd(s) || s.turn !== turn) { this.app.status(''); return; }
      this.autoEnds = (this.autoEnds || 0) + 1; await this.doEndTurn();
    }, 520 / Math.min(this.app.animFactor(), 10));
  }
  cancel() { this.resetTileInspectLock(); this.spell = null; this.spellMode = null; this.spellX = null; this.pendingTap = null; this.hover = null; $('inspect')?.classList.remove('show'); this.refresh(); }
  /** v1.5.0: opening orientation. The hero and allies face the centroid of living foes (or the board centre);
   *  foes face the hero. Uses the same face() as movement/attacks, so directional animation stays consistent. */
  faceOpening(s) {
    const sc = this.scene, live = s.units.filter(u => u.hp > 0), foes = live.filter(u => u.side === 'enemy');
    const centroid = list => { const ps = list.map(u => sc.world(u.x, u.y)); return [ps.reduce((a, p) => a + p[0], 0) / ps.length, 0, ps.reduce((a, p) => a + p[2], 0) / ps.length]; };
    const foeC = foes.length ? centroid(foes) : sc.world((s.w - 1) / 2, (s.h - 1) / 2);
    const hero = live.find(u => u.hero), heroP = hero ? sc.world(hero.x, hero.y) : foeC;
    for (const u of live) { const v = sc.units.get(u.uid); if (v && !u.facing) sc.face(v, u.side === 'enemy' ? heroP : foeC); }   // v1.7.0: keep a saved last-move facing
  }
  /** v1.5.0: once the battle is over (or ending), stray input is a quiet no-op: short sound, no error toast. */
  inputClosed() { return !this.s || this.ending || this.s.phase === 'won' || this.s.phase === 'lost' || !!this.s.victoryDeclared; }
  reject(msg) { this.audio.play('nope'); if (this.inputClosed()) { console.debug('[GRAFTBOUND] input ignored after battle end:', msg); return; } this.app.toast(`<b>Can't</b> ${esc(msg)}`, 'short'); }
  selectSpell(id) {
    if (!this.s || this.s.phase !== 'player' || this.busy) return;
    if (this.spell === id) { this.spell = null; this.spellMode = null; this.spellX = null; this.refresh(); return; }
    const why = castBlockReason(this.s, id); if (why) { this.flashTray(id); this.reject(why); return; }
    this.audio.play('click');
    if (id === 'mtg:drain-life') { this.chooseDrainX(id); return; }
    if (id === 'mtg:healing-salve') { this.chooseHealingSalve(id); return; }
    const opts = castOptions(this.s, id);
    if (getCard(id).target === 'self') { this.spell = null; this.act(() => this.exec({ type: 'cast', id, x: opts[0].x, y: opts[0].y })); return; }
    this.spell = id; this.pendingTap = null; this.refresh();
    this.app.hint('target', 'Choose a highlighted legal target. Spells saying target creature can affect allies, your hero or foes; right-click or Esc to cancel.');
  }
  /** True Magic choice: choose Healing Salve's mode before spending mana or choosing a target. */
  chooseHealingSalve(id) {
    const modal = this.app.openModal(`<div class="gb-combo-modal"><small class="sh-brand">Healing Salve · Choose One</small><h2>How should it help?</h2><div class="gb-combo-options"><button class="btn gb-combo-option" type="button" data-salve="heal">Gain 3 life</button><button class="btn gb-combo-option" type="button" data-salve="prevent">Prevent next 3 damage to a creature or player this turn</button></div><button class="btn" type="button" data-close>Cancel</button></div>`);
    for (const button of modal.querySelectorAll('[data-salve]')) button.onclick = () => {
      if (!this.s || this.busy) return;
      const mode = button.dataset.salve;
      this.app.closeModal(); this.pendingTap = null;
      if (mode === 'heal') {
        const p = player(this.s);
        this.spell = null; this.spellMode = null;
        this.act(() => this.exec({ type: 'cast', id, x: p.x, y: p.y, mode }));
      } else {
        this.spell = id; this.spellMode = mode; this.refresh();
        this.app.hint('target', 'Choose the creature that should be protected from the next 3 damage this turn.');
      }
    };
  }
  /** Player-facing deterministic choices for real spell/creature combo interactions. */
  promptComboChoices(){
    if(this._comboShowing&&!this.app.modalOpen())this._comboShowing=false;
    if(!this.s||this.busy||this.app.mode!=='battle'||this.s.phase!=='player'||this._comboShowing||!hasComboChoices(this.s))return;
    const choice=comboChoices(this.s);if(!choice)return;
    this._comboShowing=true;
    const options=choice.choices.map(x=>`<button type="button" class="btn gb-combo-option" data-combo-arg="${esc(String(x.arg))}">${esc(x.label)}</button>`).join('');
    // v1.7.0: locked — backdrop/Escape cannot dismiss an unresolved trigger; closeModal() re-prompts as a safety net.
    const modal=this.app.openModal(`<div class="gb-combo-modal" role="alertdialog" aria-modal="true"><small class="sh-brand">Graftbound · Combo Engine</small><h2>${esc(choice.kind==='mentor'?'Mentor of the Meek':choice.kind.replace(/([A-Z])/g,' $1'))}</h2><p class="gb-combo-note">${esc(choice.subtitle)}${choice.reason?' · '+esc(choice.reason):''}</p><div class="gb-combo-options">${options}</div></div>`,'',{locked:true});
    for(const btn of modal.querySelectorAll('[data-combo-arg]'))btn.onclick=async()=>{
      if(!this._comboShowing)return;this._comboShowing=false;
      const argText=btn.dataset.comboArg;const arg=/^\d+$/.test(argText)?Number(argText):argText;
      this.app.closeModal();await this.act(()=>this.exec({type:'combo',kind:choice.kind,arg}));
    };
    modal.querySelector('.gb-combo-option')?.focus();
  }
  openGraftSkills(){
    if(!this.s||this.busy||hasComboChoices(this.s)||this.s.phase!=='player')return;
    const options=comboActiveOptions(this.s);if(!options.length)return;
    const modal=this.app.openModal(`<div class="gb-combo-modal"><small class="sh-brand">Graftbound · Activated Abilities</small><h2>Graft Powers</h2><p>Choose a power. Every sacrifice, mana payment and card return is a real, replayable action.</p><div class="gb-combo-options">${options.map((o,i)=>`<button type="button" class="btn gb-combo-option" data-graft-index="${i}">${esc(o.label)}</button>`).join('')}</div><button type="button" class="btn" data-close>Cancel</button></div>`);
    for(const btn of modal.querySelectorAll('[data-graft-index]'))btn.onclick=async()=>{
      const option=options[Number(btn.dataset.graftIndex)];this.app.closeModal();
      await this.act(()=>this.exec({type:'graft',kind:option.kind,arg:option.arg}));
    };
  }
  chooseDrainX(id) {
    const s=this.s, base=spellCost(s,id,0), max=Math.min(99,availableMana(s)-base);
    if(max<1){this.reject('Not enough mana to choose X ≥ 1');return;}
    let x=Math.min(2,max);
    const m=this.app.openModal(`<div class="gb-x-choice"><small class="sh-brand">Drain Life · Variable Mana</small><h2>Choose X</h2><p class="small">Spend mana to tear life from your target. Damage = X; you recover the health taken.</p><div class="gb-x-step"><button class="btn" type="button" data-x-minus aria-label="Decrease X">−</button><output data-x-output aria-live="polite"></output><button class="btn" type="button" data-x-plus aria-label="Increase X">+</button></div><input type="range" min="1" max="${max}" value="${x}" step="1" data-x-range aria-label="Drain Life X value"/><p class="gb-x-summary" data-x-summary></p><div class="modal-actions"><button class="btn" type="button" data-x-cancel>Cancel</button><button class="btn primary" type="button" data-x-confirm>Choose Target</button></div></div>`);
    const paint=()=>{m.querySelector('[data-x-output]').textContent=x;m.querySelector('[data-x-range]').value=x;m.querySelector('[data-x-summary]').textContent=`${base+x} mana · ${x} damage · heal actual damage dealt`;};
    m.querySelector('[data-x-minus]').onclick=()=>{x=Math.max(1,x-1);paint();};
    m.querySelector('[data-x-plus]').onclick=()=>{x=Math.min(max,x+1);paint();};
    m.querySelector('[data-x-range]').oninput=e=>{x=Math.max(1,Math.min(max,Number(e.target.value)||1));paint();};
    m.querySelector('[data-x-cancel]').onclick=()=>this.app.closeModal();
    m.querySelector('[data-x-confirm]').onclick=()=>{this.spell=id;this.spellX=x;this.pendingTap=null;this.app.closeModal();this.refresh();this.app.toast(`Drain Life X=${x} · Pick an enemy`, 'short');};
    paint();
  }
  flashTray(id) { const b = document.querySelector(`[data-spell="${CSS.escape(id)}"]`); if (b) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); } }
  needConfirm(isTouch, tag) {
    if (!isTouch) return false;
    if (this.pendingTap === tag) { this.pendingTap = null; return false; }
    this.pendingTap = tag; const h = $('taphint'); h.classList.remove('show'); void h.offsetWidth; h.classList.add('show'); return true;
  }
  onTile(t, isTouch) {
    const s = this.s; if (this.busy) return;
    // Deliberate selections (mouse, touch, keyboard) release a locked inspector.
    if (this.tileInspectLatch?.locked || this.pinnedTerrainTile) { this.releasePinnedTileForAction(); this.setHover(t); }
    if (s.phase !== 'player') { this.reject('Wait for the foes to finish'); return; }
    const tag = key(t.x, t.y) + (this.spell || '');
    if (this.spell) {
      if (castOptions(s, this.spell, this.spellMode).some(o => o.x === t.x && o.y === t.y)) { if (this.needConfirm(isTouch, tag)) return; const id = this.spell, xValue = this.spellX ?? 1, mode = this.spellMode; this.spell = null; this.spellMode = null; this.spellX = null; this.act(() => this.exec({ type: 'cast', id, x: t.x, y: t.y, ...(id === 'mtg:drain-life' ? { xValue } : {}), ...(mode ? { mode } : {}) })); }
      else this.reject(`${getCard(this.spell).name} can't target that tile`);
      return;
    }
    const u = unitAt(s, t.x, t.y);
    if (u && u.side === 'enemy') {
      const plan = this.autoAttackPlan(u);
      if (plan) {
        const warn = plan.move ? pathWarning(s, plan.to.x, plan.to.y) : null;
        if (warn && !this.warnOk(tag, warn)) return;
        if (!warn && this.needConfirm(isTouch, tag)) return;
        this.act(() => { const ev = []; if (plan.move) ev.push(...this.exec({ type: 'move', x: plan.to.x, y: plan.to.y })); if (s.phase === 'player') ev.push(...this.exec({ type: 'attack', uid: u.uid })); return ev; });
      }
      else { this.showInspect(u); if (isTouch && $('inspect').classList.contains('terrain-no-room')) this.app.openModal(this.unitDetailsHTML); this.reject(s.p.attacksLeft <= 0 ? 'You already attacked this turn' : `${u.name} is out of reach this turn`); }
      return;
    }
    if (u && u.hero && !interactOptions(s).some(o => o.x === t.x && o.y === t.y)) { this.app.openSheet(); return; }
    { const o = interactOptions(s).find(o => o.x === t.x && o.y === t.y && o.kind === 'smash'); if (o) { this.app.confirm('Smash this rock? It becomes rubble you can walk through, but uses ALL of your remaining movement and attacks this turn.', 'Smash', () => this.act(() => this.exec({ type: 'interact', x: t.x, y: t.y }))); return; } }
    if (interactOptions(s).some(o => o.x === t.x && o.y === t.y)) { if (this.needConfirm(isTouch, tag)) return; this.act(() => this.exec({ type: 'interact', x: t.x, y: t.y })); return; }
    if (moveOptions(s).some(o => o.x === t.x && o.y === t.y)) {
      const warn = pathWarning(s, t.x, t.y);
      if (warn) { if (!this.warnOk(tag, warn)) return; }
      else if (this.needConfirm(isTouch, tag)) return;
      this.act(() => this.exec({ type: 'move', x: t.x, y: t.y }));
    }
    else if (!u && isTouch) { this.showTile(t); if($('inspect').classList.contains('terrain-no-room')) this.app.openModal(this.terrainDetailsHTML(t)); }
    else if (s.p.moveLeft <= 0) this.reject('No movement left this turn');
    else this.reject('Too far, or blocked');
  }
  /** Hazard confirmation: the first click/tap shows the warning; a deliberate second one confirms. */
  warnOk(tag, w) {
    if (this.pendingWarn === tag) { this.pendingWarn = null; return true; }
    this.pendingWarn = tag; this.pendingTap = null; this.audio.play('nope');
    this.app.toast(`<b>Hazard</b> ${esc(w.text)}${w.lethal ? ' This would defeat you.' : ''}<small>Click or tap the same tile again to confirm.</small>`, 'short');
    return false;
  }
  async act(fn) {
    if (this.busy) return;
    if (this.inputClosed()) { this.audio.play('nope'); return; }
    this.cancelAutoEnd(); this.busy = true; this.pendingTap = null; this.showInspect(null); this.scene.setOverlay([]); this.syncDisp();
    let ev;
    try { ev = await fn(); } catch (err) { this.busy = false; this.reject(err.message || 'Not allowed'); this.refresh(); this.maybeAutoEnd(); return; }
    // Keep newly drawn cards concealed until their flights from the library finish.
    this.concealedDraws=new Map();
    for(const event of ev||[])if(event.t==='cardDraw'&&event.id)this.concealedDraws.set(event.id,(this.concealedDraws.get(event.id)||0)+1);
    this.app.save(); this.renderHUD();
    await this.play(ev);
    this.concealedDraws.clear();
    this.busy = false; this.syncDisp(); this.refresh(); this.tutorialHints('after'); this.checkEnd(); this.promptComboChoices(); this.maybeAutoEnd();
  }
  async doStance(kind) {
    if (!this.s || this.busy || this.s.phase !== 'player') return;
    const why = stanceBlockReason(this.s, kind); if (why) { this.reject(why); return; }
    this.spell = null; this.audio.play('click'); await this.act(() => this.exec({ type: kind }));
  }
  /** v1.6.0 discard prompt: shown the moment a requirement exists, never only after pressing End Turn. */
  renderDiscardBar(dr = discardRequirement(this.s)) {
    const bar = $('gb-discard-bar'); if (!bar) return;
    if (!dr.need || this.busy) { bar.hidden = true; bar.innerHTML = ''; $('hud').classList.remove('gb-discarding'); return; }
    bar.hidden = false; $('hud').classList.add('gb-discarding');
    bar.innerHTML = `<b>${esc(dr.text)}</b><small>${esc(dr.detail)} Drag a card onto your Graveyard, or tap a card and choose Discard.</small>`;
  }
  /** Animate the card into the Graveyard, then perform the authoritative discard (same rule path as before). */
  async discardCard(index) {
    const s = this.s; if (!s || this.busy || !discardRequirement(s).need) return;
    const entry = s.deck?.hand?.[index]; if (!entry) return;
    const card = $('tray').querySelectorAll('button.handcard')[index], grave = document.querySelector('#gb-card-zones .gb-zone-graveyard .gb-zone-art');
    this.discardArmed = null; this.audio.play('flip');
    if (card && grave && this.app.animFactor() < 50 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const a = card.getBoundingClientRect(), b = grave.getBoundingClientRect(), ghost = card.cloneNode(true);
      Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, zIndex: 60, pointerEvents: 'none', transition: 'transform .38s cubic-bezier(.4,.1,.3,1), opacity .38s' });
      ghost.classList.add('gb-discard-ghost'); document.body.appendChild(ghost); card.style.visibility = 'hidden';
      requestAnimationFrame(() => { ghost.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${Math.max(0.3, b.width / a.width)}) rotate(-8deg)`; ghost.style.opacity = '0.25'; });
      await new Promise(r => setTimeout(r, 400)); ghost.remove();
    }
    await this.act(() => this.exec({ type: 'discard', id: entry.id }));
  }
  /** Drag a hand card onto the Graveyard to discard it. Only active in discard mode; any other drop is cancelled. */
  bindDiscardDrag() {
    const tray = $('tray'); let drag = null;
    const graveAt = (x, y) => document.elementsFromPoint(x, y).some(el => el.closest?.('.gb-zone-graveyard'));
    tray.addEventListener('pointerdown', e => {
      if (!tray.classList.contains('discard-mode') || e.button > 0 || e.target.closest('[data-inspect],[data-discard-i]')) return;
      const card = e.target.closest('button.handcard'); if (!card) return;
      drag = { card, i: [...tray.querySelectorAll('button.handcard')].indexOf(card), x: e.clientX, y: e.clientY, ghost: null, id: e.pointerId };
    });
    window.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
        const r = drag.card.getBoundingClientRect(); drag.ghost = drag.card.cloneNode(true); drag.ghost.classList.add('gb-discard-ghost', 'dragging');
        Object.assign(drag.ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, zIndex: 60, pointerEvents: 'none' });
        document.body.appendChild(drag.ghost); drag.card.classList.add('gb-drag-source'); drag.ox = drag.x - r.left; drag.oy = drag.y - r.top;
      }
      if (drag.ghost) { drag.ghost.style.left = (e.clientX - drag.ox) + 'px'; drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
        document.querySelector('#gb-card-zones .gb-zone-graveyard')?.classList.toggle('drop-ready', graveAt(e.clientX, e.clientY)); }
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null;
      document.querySelector('#gb-card-zones .gb-zone-graveyard')?.classList.remove('drop-ready');
      if (!d.ghost) return;                                   // a tap: the click handler arms the card
      d.ghost.remove(); d.card.classList.remove('gb-drag-source');
      d.card.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
      if (e.type === 'pointerup' && graveAt(e.clientX, e.clientY)) this.discardCard(d.i);   // anywhere else: cancelled, nothing moves
    };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  }
  async doEndTurn() {
    if (this.busy || !this.s || this.s.phase !== 'player') return;
    if (discardRequirement(this.s).need) { this.audio.play('nope'); const bar = $('gb-discard-bar'); bar?.classList.remove('pulse'); void bar?.offsetWidth; bar?.classList.add('pulse'); return; }
    this.spell = null; this.audio.play('click');
    await this.act(() => this.exec({ type: 'end' }));
  }
  chooseDiscard() {
    const deck=this.s?.deck;if(!deck)return;
    const needed=Math.max(deck.pendingDiscards||0,Math.max(0,deck.hand.length-deck.capacity));
    if(!needed)return;
    const choices=deck.hand.map(entry=>{const c=getCard(entry.id);return `<button type="button" class="btn gb-discard-choice" data-discard="${esc(entry.id)}">Discard ${esc(c?.name||entry.id)}</button>`;}).join('');
    const modal=this.app.openModal(`<h2>Discard ${needed} card${needed===1?'':'s'}</h2><p>Choose a card for the graveyard. All cards remain in your permanent run collection.</p><div class="gb-discard-list">${choices}</div><div class="modal-actions"><button class="btn" data-close>Cancel</button></div>`);
    modal.addEventListener('click',async e=>{const b=e.target.closest('[data-discard]');if(!b)return;const id=b.dataset.discard;this.app.closeModal();await this.act(()=>this.exec({type:'discard',id}));if(this.s?.deck && ((this.s.deck.pendingDiscards||0)>0 || this.s.deck.hand.length>this.s.deck.capacity))this.chooseDiscard();});
  }
  checkEnd() { if (!this.s) return; if (this.s.phase === 'won' || this.s.phase === 'lost') { this.ending = true; const r = this.s.phase; const done = this.done; this.done = null; if (done) setTimeout(() => done(r), 300 / this.app.animFactor()); } }
  float(uid, text, cls) {
    if (!this.scene.cam) return;
    const p = this.scene.project(this.scene.headPos(uid));
    const el = document.createElement('div'); el.className = 'float ' + cls; el.innerHTML = text;
    el.style.left = (p.x + (Math.random() - 0.5) * 24) + 'px'; el.style.top = (p.y - 10) + 'px';
    $('labels').appendChild(el); setTimeout(() => el.remove(), 1300);
  }
  /** `text` must be a string: objects are refused so "[object Object]" can never reach the screen (v0.8 fix). */
  async banner(text, cls = '', sub = '') {
    const b = $('banner'); b.dataset.last = typeof text === 'string' ? text : '';
    if (this.app.animFactor() > 50) return;
    if (typeof text !== 'string') { console.warn('banner: non-string title refused'); return; }
    b.className = 'banner ' + cls; b.innerHTML = `<span>${esc(text)}${sub ? `<small class="banner-sub">${esc(sub)}</small>` : ''}</span>`; void b.offsetWidth; b.classList.add('show');
    await this.wait(950); b.classList.remove('show');
  }
  tile(x, y) { return this.scene.world(x, y); }
  /** Spell playback: the spell's own VFX identity runs; damage events that follow appear at the impact moment. */
  /** v0.7 spell playback: GATHER → INTENSIFY → RELEASE at the caster, then the spell's own impact. Damage and
   *  healing events that follow are played only after this resolves (the impact moment). Animation-only. */
  async playSpell(e) {
    const sc = this.scene; const c = getCard(e.id); const kind = e.vfx && VFX[e.vfx] ? e.vfx : (DEFAULT_VFX[c.effect || e.id] || 'fire');
    if (kind === 'teleport') { sc.play(e.uid, 'cast'); this.audio.play('spell'); return; }
    if (c.color === 'umbral' && sc.units.get(e.uid)) {
      const source=sc.centerPos(e.uid);
      sc.fx.burst(source,[0.16,0.09,0.19],12,{speed:0.45,up:0.5,grav:-0.06,size:9});
    }
    const to = e.target != null && sc.units.get(e.target) ? sc.centerPos(e.target) : [...this.tile(e.x, e.y)];
    if (e.target == null) to[1] = 0.3;
    if (c.color === 'umbral' && sc.units.get(e.uid))
      sc.fx.swirl(sc.centerPos(e.uid),()=>to,[0.14,0.1,0.2],14,0.36);
    const tgtView = e.target != null && sc.units.get(e.target) ? e.target : null;
    const tiles = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const w = this.tile(e.x + dx, e.y + dy); tiles.push([w[0], 0, w[2]]); }
    if (kind === 'lightningBolt' || kind === 'chain') setTimeout(() => this.audio.play('crackle'), 120 / this.app.animFactor());
    await withTimeout(castSpellVisual(sc, { kind, uid: e.uid, to, target: tgtView, tiles, audio: this.audio, magnitude: e.magnitude, level: e.level || 1, manaCost: e.manaCost ?? c.cost }), 9000 / Math.min(this.app.animFactor(), 6));
    this.audio.play(SPELL_SFX[kind] || 'spell');
  }
  async play(events) {
    const sc = this.scene, au = this.audio; let actor = null;
    for (let idx = 0; idx < events.length; idx++) {
      const e = events[idx];
      const d = e.uid != null ? this.disp.get(e.uid) : null;
      // Targeted blows, spells and telegraphed attacks use their actual visual aim point.
      // Movement retains the per-step direction supplied by Scene.movePath.
      if (e.uid != null) sc.faceCombatEvent(e);
      switch (e.t) {
        case 'turn':
          if (e.phase === 'player' && e.turn > 1) { au.play('turn'); await this.banner('Your Turn', 'you'); }
          else if (e.phase === 'enemy') { au.play('enemyTurn'); await this.banner('Foes Act', 'foe'); }
          this.renderHUD(); break;
        case 'enemyTurn': { if (actor) actor.outline = 0; actor = sc.units.get(e.uid); if (actor) actor.outline = 0.8; const u = this.s.units.find(x => x.uid === e.uid); if (u) this.app.status(`${u.name} acts`); await this.wait(110); break; }
        case 'move': sc.onStep = () => au.play('step'); await sc.movePath(e.uid, e.path, 0.17 / this.app.animFactor()); sc.onStep = null; break;
        case 'teleport': au.play('spell'); await sc.teleport(e.uid, e.x, e.y, e.kind === 'rift' ? [0.75, 0.4, 1] : [0.5, 0.8, 1]); break;
        case 'push': await sc.slide(e.uid, e.path); break;
        case 'attack':
          if (e.ranged) { const a = sc.centerPos(e.uid), b = sc.centerPos(e.target); sc.play(e.uid, 'attack'); sc.face(sc.units.get(e.uid), b); await sc.projectile(a, b, [1, 0.85, 0.5], 0.2); }
          else {
            const v = sc.units.get(e.uid), st = v && v.style;
            if (st && st.deathtouch) sc.fx.swirl(sc.centerPos(e.uid), () => sc.centerPos(e.target), [0.75, 0.35, 1], 18, 0.4);
            await sc.lunge(e.uid, e.target);
            if (st && st.trample) { if (!sc.reduced) sc.shake(0.09); const w = sc.centerPos(e.target); sc.fx.burst([w[0], 0.05, w[2]], [0.55, 0.45, 0.3], 16, { speed: 1.6, up: 0.8, size: 14 }); }
          }
          break;
        case 'counter': await this.wait(e.first ? 40 : 110); await sc.lunge(e.uid, e.target); this.float(e.uid, e.first ? 'First Strike!' : 'Strikes back', 'note'); break;
        case 'noCounter': this.float(e.uid, esc(NO_COUNTER[e.reason] || 'No strike back'), 'note'); break;
        case 'capped': this.float(e.uid, `Unyielding: ${e.from} → ${e.to}`, 'note'); break;
        case 'deathtouchResisted': this.float(e.uid, this.s && this.s.units.find(u => u.uid === e.uid && u.hero) ? 'Deathtouch: +2 damage' : 'Legendary: resists Deathtouch', 'blocked'); au.play('armor'); break;
        case 'armored': au.play('armor'); this.float(e.uid, `▣ −${e.amount}`, 'blocked'); break;
        case 'damage': {
          if (e.kind === 'strike2') { const atk = events.slice(0, idx).reverse().find(x => x.t === 'attack'); if (atk) { this.float(atk.uid, 'Double Strike!', 'note'); await sc.lunge(atk.uid, e.uid); } }
          if (d) { d.hp = e.deathtouch ? 0 : Math.max(0, d.hp - e.amount); d.shield = Math.max(0, d.shield - e.blocked); }
          const big = e.amount >= 4 || e.deathtouch;
          const already = e.kind === 'spell' && events[idx - 1] && (events[idx - 1].t === 'spell' || events[idx - 1].t === 'chain');
          if (e.amount > 0 && !already) sc.hit(e.uid, e.kind === 'poison' ? [0.6, 1, 0.3] : e.kind === 'spell' ? [0.8, 0.6, 1] : e.kind === 'lava' || e.kind === 'burst' ? [1, 0.5, 0.15] : e.kind === 'rift' ? [0.75, 0.4, 1] : e.deathtouch ? [0.75, 0.4, 1] : [1, 0.55, 0.3], big);
          if (e.deathtouch) sc.screenFlash([0.55, 0.3, 0.8], 0.25);
          au.play(e.deathtouch ? 'deathtouch' : e.amount > 0 ? (big ? 'bigHit' : 'hit') : 'block');
          if (e.blocked) this.float(e.uid, `${ICON.shield}${e.blocked}`, 'blocked');
          if (e.amount > 0 || !e.blocked) this.float(e.uid, e.deathtouch ? '☠ Deathtouch' : `−${e.amount}`, e.deathtouch ? 'dt' : e.kind === 'poison' ? 'poison' : 'dmg');
          const lbl = { bramble: 'Brambles', spines: 'Spines', lava: 'Lava', rift: 'Rift', burst: 'Burst', harpoon: 'Harpoon' }[e.kind]; if (lbl) this.float(e.uid, lbl, 'note');
          this.renderLabel(e.uid); if (this.isHero(e.uid)) this.renderHUD();
          await this.wait(big ? 230 : 140); break;
        }
        case 'lifeLoss': if (d) d.hp = Math.max(0, d.hp - e.amount); this.float(e.uid, `−${e.amount} life (Vito)`, 'dmg'); this.renderLabel(e.uid); this.renderHUD(); await this.wait(110); break;
        case 'heal': if (d) d.hp += e.amount; au.play('heal'); if (e.kind === 'lifelink') { const atk = events.slice(0, idx).reverse().find(x => x.t === 'attack' && x.uid === e.uid); if (atk && sc.units.get(atk.target)) sc.fx.swirl(sc.centerPos(atk.target), () => sc.centerPos(e.uid), [1, 0.45, 0.5], 22, 0.6); } this.float(e.uid, `+${e.amount}${e.kind === 'lifelink' ? ' Lifelink' : e.kind === 'regenerate' ? ' Regenerate' : ''}`, 'heal'); sc.fx.burst(sc.centerPos(e.uid), [0.5, 1, 0.5], 14, { speed: 0.8, up: 1.5, grav: 1 }); this.renderLabel(e.uid); this.renderHUD(); await this.wait(140); break;
        case 'shield': if (d) { d.shield = e.total; if (e.kind === 'guard') d.guardShield = (d.guardShield || 0) + e.amount; if (e.kind === 'guardExpire') d.guardShield = 0; } if (e.kind !== 'barkskin' && e.amount > 0) au.play('block'); if (e.amount > 0) this.float(e.uid, `${ICON.shield}+${e.amount}${e.kind === 'guard' ? ' Guard' : e.kind === 'ward' ? ' Bulwark' : ''}`, 'shieldf'); this.renderLabel(e.uid); this.renderHUD(); if (e.amount > 0) await this.wait(120); break;
        case 'status': {
          if (d) d[e.status] = e.total;
          const lbl = { poison: `${ICON.poison}Poison ${e.value}`, stunned: `${ICON.stun}Stunned`, empowered: `+${e.value} power`, weakened: `Hexed −${e.value} power`, grounded: `${ICON.hook}Grounded` }[e.status];
          if (e.value && lbl) this.float(e.uid, lbl, e.status === 'empowered' ? 'heal' : 'poison');
          this.renderLabel(e.uid); this.renderHUD(); await this.wait(120); break;
        }
        case 'death': au.play('death'); { const lb = this.labels.get(e.uid); if (lb) { lb.remove(); this.labels.delete(e.uid); } } await sc.death(e.uid, e.element); break;
        case 'burst': { const w = this.tile(e.x, e.y); sc.fx.burst([w[0], 0.3, w[2]], [1, 0.55, 0.15], 40, { speed: 2.8, up: 2 }); sc.addRing({ pos: [w[0], 0.03, w[2]], r0: 0.1, r1: 1.3, life: 0.35, col: [1, 0.5, 0.1], width: 0.12 }); sc.light([w[0], 0.4, w[2]], [1, 0.5, 0.15], 3, 0.4, 2.4); au.play('fireboom'); if (!sc.reduced) sc.shake(0.1); await this.wait(160); break; }
        case 'mana': this.dispMana = e.to; this.renderHUD(); break;
        case 'spell': await this.playSpell(e); break;
        case 'area': break;
        case 'chain': { const a = [...this.tile(e.from.x, e.from.y)], b = e.target != null && sc.units.get(e.target) ? sc.centerPos(e.target) : [...this.tile(e.x, e.y)]; a[1] = 0.4; au.play('zap'); await chainHop(sc, a, b, e.target); break; }
        case 'trample': this.float(e.uid, 'Trample!', 'note'); await this.wait(100); break;
        case 'spines': break;
        case 'aim': au.play(e.slam ? 'slam' : 'aim'); sc.play(e.uid, 'cast'); if (e.slam) this.float(e.uid, { root: 'Root Slam!', fire: 'Flames gather!', void: 'Erasure!' }[e.kind] || 'Danger!', 'warn'); this.scene.setDanger(e.tiles); await this.wait(260); break;
        case 'hex': { au.play('spell'); sc.play(e.uid, 'cast'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.85, 0.3, 0.9], 0.3, 0.3); break; }
        case 'rangedShot': {
          au.play('fire');sc.play(e.uid,'attack');
          const source=sc.units.get(e.uid),target=sc.units.get(e.target);
          if(source&&target){sc.face(source,sc.centerPos(e.target));
            if(e.kind==='spikeshot')await sc.arrowProjectile(sc.centerPos(e.uid),sc.centerPos(e.target));
            else await sc.projectile(sc.centerPos(e.uid),sc.centerPos(e.target),[1,0.48,0.18],0.25,0.12,{embers:true,size:18});
          }
          break;
        }
        case 'harpoon': { au.play('fire'); sc.play(e.uid, 'attack'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.85, 0.9, 1], 0.2, 0.05, { size: 18 }); break; }
        case 'spit': { au.play('fire'); sc.play(e.uid, 'attack'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.75, 0.4, 1], 0.25); break; }
        case 'fire': { au.play('fire'); sc.play(e.uid, 'attack'); const a = sc.centerPos(e.uid); const end = e.tiles.at(-1) || { x: 0, y: 0 }; const victim = e.tiles.map(t => this.s.units.find(u => u.x === t.x && u.y === t.y && u.uid !== e.uid && u.hp >= 0)).find(Boolean); const b = victim && sc.units.get(victim.uid) ? sc.centerPos(victim.uid) : [...this.tile(end.x, end.y)]; if(this.s.units.find(u=>u.uid===e.uid)?.defId==='archer')await sc.arrowProjectile(a,b,0.33); else await sc.projectile(a, b, [0.9, 1, 0.6], 0.22, 0.15); break; }
        case 'slamHit': {
          au.play(e.kind === 'fire' ? 'fireboom' : 'slam'); if (!sc.reduced) sc.shake(0.25); sc.play(e.uid, 'attack');
          const col = e.kind === 'fire' ? [1, 0.5, 0.15] : e.kind === 'void' ? [0.75, 0.4, 1] : [0.5, 0.4, 0.25];
          for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.fx.burst([w[0], 0.1, w[2]], col, 8, { speed: 1, up: 2 }); }
          if (e.kind === 'void') for (const t of e.tiles.slice(0, 6)) { const w = this.tile(t.x, t.y); sc.addBolt({ a: [w[0], 2.5, w[2]], b: [w[0], 0, w[2]], life: 0.2, width: 0.05, col, segs: 6 }); }
          await this.wait(220); break;
        }
        case 'archiveDraw': { const w = this.tile(e.x,e.y); sc.addRing({pos:[w[0],0.04,w[2]],r0:0.1,r1:0.7,life:0.5,col:[0.58,0.65,1],width:0.07,spokes:4});this.float(e.uid,e.count?'Inscribed Page · Draw +1':'Inscribed Page · Empty deck','note');break;}
        case 'conduit': { const w = this.tile(e.x, e.y); sc.addRing({ pos: [w[0], 0.1, w[2]], r0: 0.2, r1: 0.7, life: 0.5, col: [0.35, 0.9, 1], width: 0.08, spokes: 8 }); break; }
        case 'crackPulse': au.play('slam'); for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.addRing({ pos: [w[0], 0.02, w[2]], r0: 0.1, r1: 0.55, life: 0.4, col: [1, 0.44, 0.2], width: 0.09, spokes: 6 }); } await this.wait(180); break;
        case 'riftPulse': au.play('zap'); for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.addRing({ pos: [w[0], 0.04, w[2]], r0: 0.05, r1: 0.6, life: 0.4, col: [0.75, 0.4, 1], width: 0.1, spokes: 4 }); sc.fx.burst([w[0], 0.2, w[2]], [0.75, 0.4, 1], 12, { speed: 1.2, up: 2 });
          // An upright violet crystal spike erupts at each pulsing rift (no additional damage).
          sc.addBolt({ a: [w[0], 0.04, w[2]], b: [w[0], 2.2, w[2]], life: 0.46,
            width: 0.22, col: [0.49, 0.15, 0.85], segs: 1 });
          sc.addBolt({ a: [w[0], 0.09, w[2]], b: [w[0], 2.45, w[2]], life: 0.33,
            width: 0.085, col: [0.90, 0.65, 1], segs: 1 });
          sc.light([w[0], 1.15, w[2]], [0.75, 0.4, 1], 2.5, 0.35, 1.5);
          } await this.wait(300); break;
        case 'smash': { const v = sc.units.get(e.uid); if (v) { sc.face(v, this.tile(e.x, e.y)); sc.play(e.uid, 'attack'); } const w = this.tile(e.x, e.y); sc.fx.burst([w[0], 0.35, w[2]], [0.72, 0.66, 0.58], 26, { speed: 1.6, up: 2.2 }); sc.shake && sc.shake(0.08); au.play('slam'); this.float(e.uid, 'Smash!', 'note'); await this.wait(260); break; }
        case 'terrain': {
          const C = { lava: [1, 0.5, 0.15], burn: [1, 0.6, 0.2], cool: [0.7, 0.9, 1], bramble: [0.4, 0.8, 0.3] }[e.kind] || [1, 0.5, 0.15];
          for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.fx.burst([w[0], 0.1, w[2]], C, 18, { speed: 1, up: 2.4 }); }
          this.scene.refreshTerrain(this.s, this.s.rng.s ^ 0x77); au.play(e.kind === 'cool' ? 'frost' : e.kind === 'bramble' ? 'spell' : 'fireboom');
          const hero = this.s.units.find(u => u.hero);
          if (hero) this.float(hero.uid, { lava: 'The ground melts!', burn: 'The brambles burn away', cool: 'The lava hardens', bramble: 'Briars erupt!', sporefield: 'Toxic spores spread!', fissure: 'The earth cracks!', fracture: 'A dimensional tear opens!', crumble: 'The stone collapses!', smash: 'The rock shatters into rubble!' }[e.kind] || 'The ground shifts', e.kind === 'cool' || e.kind === 'burn' ? 'note' : 'warn');
          await this.wait(240); break;
        }
        case 'crystal': {
          const w = this.tile(e.x, e.y); const c = e.kind === 'discharge' ? [0.7, 0.85, 1] : [0.55, 0.75, 1];
          sc.fx.burst([w[0], 0.5, w[2]], c, e.kind === 'discharge' ? 50 : 30, { speed: 2, up: 2 }); sc.light([w[0], 0.6, w[2]], c, 3, 0.4, 2.4);
          if (e.kind === 'discharge') for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; sc.addBolt({ a: [w[0], 0.6, w[2]], b: [w[0] + Math.cos(a) * 1.2, 0.2, w[2] + Math.sin(a) * 1.2], life: 0.2, width: 0.03, col: c, segs: 5 }); }
          au.play(e.kind === 'discharge' ? 'thunder' : 'shrine'); this.scene.refreshTerrain(this.s, this.s.rng.s ^ 0x77);
          const hero = this.s.units.find(u => u.hero); if (hero) this.float(hero.uid, e.kind === 'discharge' ? 'Crystal discharge!' : 'Crystal attuned', 'note');
          await this.wait(220); break;
        }
        case 'stance': {
          const c = e.kind === 'guard' ? [0.55, 0.8, 1] : [0.75, 0.6, 1]; const stanceAnim = sc.stance(e.uid, e.kind);   // v1.6.0: never the attack/cast rows
          const position = sc.units.get(e.uid)?.pos;
          if (position) {
            const base = [position[0], 0.035, position[2]];
            // Guard spends the ENTIRE movement budget: visibly lock the hero inside a six-sided ward.
            sc.addRing({ pos: base, r0: 0.08, r1: e.kind === 'guard' ? 0.83 : 0.65,
              life: e.kind === 'guard' ? 0.7 : 0.45, col: c, width: 0.09,
              spokes: e.kind === 'guard' ? 6 : 3, seg: e.kind === 'guard' ? 6 : 28 });
            if (e.kind === 'guard' && !sc.reduced) {
              sc.addRing({ pos: [base[0], 0.16, base[2]], r0: 0.17, r1: 0.62,
                life: 0.8, col: c, width: 0.045, spokes: 6, seg: 6, spin: 0.5 });
              sc.fx.burst([base[0], 0.27, base[2]], c, 12, { speed: 0.55, up: 0.4, life: 0.6 });
            }
            if (e.kind === 'channel' && !sc.reduced) {   // v1.6.0: mana gathers inward and rises — concentration, not a strike
              sc.addRing({ pos: [base[0], 0.05, base[2]], r0: 0.75, r1: 0.12, life: 0.55, col: [0.62, 0.5, 1], width: 0.05, spokes: 0, seg: 28 });
              sc.fx.burst([base[0], 0.15, base[2]], [0.7, 0.62, 1], 16, { speed: 0.25, up: 1.9, life: 0.85 });
            }
          }
          sc.light(sc.centerPos(e.uid), c, e.kind === 'guard' ? 2.9 : 2.2, 0.55, 1.4);
          au.play(e.kind === 'guard' ? 'block' : 'castArcane');
          this.float(e.uid, e.kind === 'guard' ? `Guard +${e.amount} temporary shield` : `Channel: next spell +${e.amount}`, 'note'); await this.wait(260); break;
        }
        case 'guarded': this.float(e.uid, `Shield absorbs ${e.amount}`, 'blocked'); break;
        case 'prevented': this.float(e.uid, `Healing Salve prevents ${e.amount}`, 'blocked'); break;
        case 'resisted': this.float(e.uid, `${e.element} resist −${e.amount}`, 'blocked'); break;
        case 'weakpoint': this.float(e.uid, `${e.element} weak +${e.amount}`, 'dmg'); break;
        case 'silence': { const h = this.s.units.find(u => u.hero); if (h) this.float(h.uid, `${getCard(e.spell).name} silenced (this turn)`, 'warn'); sc.screenFlash([0.85, 0.8, 1], 0.2); au.play('spell'); await this.wait(280); break; }
        case 'redact': { sc.screenFlash([0.85, 0.8, 1], 0.25); const h = this.s.units.find(u => u.hero); if (h) this.float(h.uid, `${KEYWORDS[e.keyword].name} redacted (this turn)`, 'warn'); au.play('spell'); await this.wait(300); break; }
        case 'restored': this.float(e.uid, `${KEYWORDS[e.keyword].name} restored`, 'note'); break;
        case 'summon': {
          // Consecutive summons belong to one rules event: prepare all units before fading ANY in.
          // Engine event order, placement and ETB resolution remain unchanged.
          const group = [e];
          while (events[idx + 1]?.t === 'summon') group.push(events[++idx]);
          const newcomers = group.map(entry => ({ entry, unit: this.s.units.find(u => u.uid === entry.uid) })).filter(x => x.unit);
          for (const { entry, unit } of newcomers) {
            this.disp.set(unit.uid, { hp: unit.maxHp, maxHp: unit.maxHp, shield: 0, poison: 0, stunned: 0, empowered: 0 });
            this.addUnitView({ ...unit, x: entry.x, y: entry.y }); this.renderLabel(unit.uid);
          }
          await Promise.all(newcomers.map(async ({ entry, unit }) => {
            if (entry.ally) await VFX.summon(sc, { from: sc.units.get(entry.by) ? sc.centerPos(entry.by) : null, to: this.tile(entry.x, entry.y) });
            await sc.spawn(unit.uid);
          }));
          break;
        }
        case 'mirror': { sc.screenFlash([0.85, 0.8, 1], 0.25); this.float(e.uid, `Copies your ${KEYWORDS[e.keyword].name}!`, 'warn'); au.play('spell'); await this.wait(300); break; }
        case 'bossPhase': {const bossView=sc.units.get(e.uid??this.s?.units.find(u=>u.boss)?.uid);if(bossView){bossView.flash=1;bossView.aura=e.phase===3?[0.92,0.38,0.24]:[0.75,0.63,0.35];}this.audio.play('bossPhase'); sc.screenFlash([0.6, 0.35, 0.15], 0.3); if (!sc.reduced) sc.shake(0.12); await this.banner(e.phase ? `Phase ${e.phase} · ${e.text}` : (e.text || 'The foe changes'), 'boss'); break;}
        case 'stunnedSkip': this.float(e.uid, 'Stunned', 'note'); await this.wait(200); break;
        case 'slimeCounter': { const u=this.s.units.find(unit=>unit.uid===e.uid);if(u){this.float(e.uid,`☣ Slime ${e.total} · −${e.total}/−${e.total}`,'poison');sc.fx.burst(sc.centerPos(e.uid),[0.38,0.65,0.18],10,{speed:0.48,up:0.48,size:9});this.renderLabel(e.uid);if(u.hero)this.renderHUD();}au.play('poison');await this.wait(120);break; }
        case 'cardDraw': {
          au.play('flip');await this.cardAnimations.play('draw',e);
          const left=this.concealedDraws.get(e.id)||0;
          if(left<=1)this.concealedDraws.delete(e.id);else this.concealedDraws.set(e.id,left-1);
          this.renderHand(this.s);
          break;
        }
        case 'deckReshuffle': au.play('flip'); await this.cardAnimations.play('shuffle',e); if (sc.units.get(e.uid)) this.float(e.uid, `Graveyard reshuffled · ${e.count} card${e.count === 1 ? '' : 's'}`, 'note'); break;
        case 'equipmentAttach': {au.play('click');this.refreshUnitAttachments(e.uid);if(e.removed){for(const unit of this.s?.units||[])if(unit.uid!==e.uid)this.refreshUnitAttachments(unit.uid);}break;}
        case 'cardCastMove': await this.cardAnimations.play('cast',e); break;
        case 'cardReturn': await this.cardAnimations.play('return',e); break;
        case 'cardDiscard': au.play('flip'); await this.cardAnimations.play('discard',e); this.float(player(this.s).uid,'Card to graveyard','note'); break;
        case 'auraCast': {
          const from=sc.units.get(e.uid)?sc.centerPos(e.uid):null;
          const to=sc.units.get(e.target)?sc.centerPos(e.target):[...this.tile(e.x,e.y)];
          const gift=e.id==='mtg:gift-of-immortality';
          const color=gift?[1,0.91,0.54]:e.color==='umbral'?[0.22,0.13,0.32]:[0.8,0.7,1];
          if(from){sc.play(e.uid,'cast');sc.addBolt({a:from,b:to,life:gift?0.55:0.35,width:gift?0.13:0.065,col:color,branches:gift?0:2,segs:9});
            await sc.projectile(from,to,color,gift?0.48:0.3,gift?0.05:0.24,{size:gift?26:18});}
          sc.fx.burst(to,color,gift?30:15,{speed:gift?0.9:0.65,up:1.5});au.play(gift?'heal':'spell');break;
        }
        case 'auraAttach': {const w=this.tile(e.x,e.y);sc.fx.burst([w[0],0.4,w[2]],[0.85,0.65,1],16,{speed:0.7,up:1.3});au.play('spell');this.float(e.uid,esc(e.name||'Enchanted'),'note');this.refreshUnitAttachments(e.uid);break;}
        case 'auraBreak': au.play('block'); this.float(e.uid,'Aura shattered','warn');this.refreshUnitAttachments(e.uid); break;
        case 'revive': au.play('heal');this.float(e.uid,'Gift of Immortality!','note');break;
        case 'legendaryFlame': au.play('fireboom');sc.screenFlash([1,0.45,0.18],0.35);break;
        case 'legendaryAbility': au.play('bossPhase'); if (e.name && sc.units.get(e.uid)) this.float(e.uid, esc(e.name), 'note'); break;
        case 'ambush': au.play('foe'); await this.banner('Ambush! Your grafts\u2019 battle-start effects did not fire', 'foe'); break;
        case 'graftTrigger': if(e.name && sc.units.get(e.uid)){
          this.float(e.uid,esc(e.name),'note');
          if (/Blood Artist|Vito|Sheoldred/i.test(e.name)) {
            const from=sc.centerPos(e.uid), target=this.s.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,b)=>a.uid-b.uid)[0];
            sc.fx.burst(from,[0.14,0.08,0.17],11,{speed:0.4,up:0.35});
            if(target&&sc.units.get(target.uid))sc.fx.swirl(from,()=>sc.centerPos(target.uid),[0.2,0.12,0.27],15,0.36);
          }
          await this.wait(110);break;
        }
        case 'realAbility': if (e.name && sc.units.get(e.uid)) { this.float(e.uid, esc(e.name), 'note'); await this.wait(180); } break;
        case 'shinobiExile': au.play('flip'); if (sc.units.get(e.uid)) this.float(e.uid, `Exiled: ${esc(e.name)}`, 'warn'); await this.wait(220); break;
        case 'victory': if (this.victoryPlayed) break; this.victoryPlayed = true; au.play('victory'); await this.banner('Victory', 'win'); break;   // v1.5.0: once per battle
        case 'defeat': au.play('defeat'); await this.banner('The graft unravels', 'lose'); break;
      }
    }
    if (actor) actor.outline = 0; this.app.status('');
  }
  isHero(uid) { const u = this.s.units.find(x => x.uid === uid); return u && u.hero; }
  tutorialHints(when) {
    const s = this.s; if (!s || s.phase !== 'player') return;
    const H = (id, text) => this.app.hint(id, text);
    if (s.nodeType === 'tutorial') {
      if (s.turn === 1 && s.p.moveLeft === player(s).move && s.p.attacksLeft > 0) return H('move', 'Tap a glowing tile to move. Tap a foe to walk up and strike it.');
      if (attackTargets(s).length) return H('attack', 'Foes that survive your strike hit back. The number over a foe is the damage it will deal you next.');
      if (s.p.attacksLeft === 0 || when === 'after') return H('endturn', 'When you are done, press End Turn (Space).');
    }
    if (s.spellbook.length) H('spell', 'Spells cost mana (the gems by your health) and reach anywhere on the battlefield.');
    if (this.run.hp != null && player(s).hp < player(s).maxHp && s.turn === 1) H('wounds', 'Wounds carry between battles: a victory restores only half of your missing health. Wayshrines can mend the rest.');
  }
}