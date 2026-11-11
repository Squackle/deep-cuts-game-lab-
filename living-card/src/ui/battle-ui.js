// Battle HUD, input (mouse / touch / keyboard) and event playback onto the HD-2D scene.
import { moveOptions, movePlayer, attackTargets, attack, castOptions, cast, endTurn, intents, canAttack, player, enemies } from '../engine/combat.js';
import { castBlockReason } from '../engine/spells.js';
import { reachable, pathTo, key, unitAt } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { resolveCard as getCard } from '../cards/catalog.js';
import { KEYWORDS, keywordLabel } from '../data/keywords.js';
import { formatSpellText, spellRange } from '../engine/spells.js';
import { deriveAppearance } from '../engine/appearance.js';
import { composePlayerSheet } from '../rendering/evolution-visuals.js';
import { ICON } from './icons.js';
import { esc } from './cards.js';

const $ = id => document.getElementById(id);
const SPELL_COL = { ember: [1, 0.55, 0.2], verdant: [0.5, 1, 0.4], tide: [0.4, 0.8, 1], umbral: [0.75, 0.45, 1], radiant: [1, 0.9, 0.5] };
export const STAGE = { blank: 'Blank', stirring: 'Stirring', awakened: 'Awakened', ascendant: 'Ascendant' };
const NO_COUNTER = { flying: 'Flying — it cannot reach you', 'first strike': 'First Strike — no strike back', stunned: 'Stunned — no strike back', 'no power': 'Too weak to strike back' };

export function kwChips(keywords, cls = '') {
  return Object.entries(keywords).map(([k, v]) => `<span class="chip ${cls}" tabindex="0" data-tip="${esc(KEYWORDS[k].text)}"><em>${KEYWORDS[k].glyph}</em>${esc(keywordLabel(k, v))}</span>`).join('');
}

export class BattleUI {
  constructor(app) {
    this.app = app; this.audio = app.audio;
    this.disp = new Map(); this.labels = new Map(); this.busy = false; this.spell = null; this.hover = null; this.cursor = null; this.pendingTap = null; this.intents = [];
    this.bindInput();
  }
  get scene() { return this.app.scene; }
  wait(ms) { return new Promise(r => setTimeout(r, ms / this.app.animFactor())); }
  async start(run, s, { fresh }) {
    this.run = run; this.s = s; this.spell = null; this.hover = null; this.pendingTap = null;
    $('labels').innerHTML = ''; this.labels.clear(); this.disp.clear();
    this.scene.loadArena(s, s.rng.s ^ 0x77);
    for (const u of s.units) if (u.hp > 0) this.addUnitView(u);
    this.syncDisp(); $('hud').classList.remove('hidden'); $('enc-name').textContent = s.name;
    this.scene.zoom = 1; this.scene.focusTarget = [0, 0, 0]; this.scene.dof = 1;
    this.refresh();
    return new Promise(async res => {
      this.done = res;
      if (fresh) { this.busy = true; this.refresh(); await this.banner(s.nodeType === 'boss' ? 'The Thornmother Wakes' : s.nodeType === 'elite' ? 'Elite Lair' : s.name, s.nodeType === 'boss' ? 'boss' : '');
        if (s.reinforced) { await this.banner(`The Hollow answers your strength · +${s.reinforced} foe${s.reinforced > 1 ? 's' : ''}`, 'foe'); this.app.hint('reinforced', 'The stronger you become, the more the Hollow sends against you. Reinforcements never have extra health — just more of them.'); }
        this.busy = false; }
      this.refresh(); this.tutorialHints('start'); this.checkEnd();
    });
  }
  stop() { $('hud').classList.add('hidden'); $('labels').innerHTML = ''; this.labels.clear(); this.s = null; }
  addUnitView(u) {
    let v;
    if (u.hero) {
      const ap = deriveAppearance(this.run.evo);
      v = this.scene.addUnit(u, 'blank'); this.scene.setUnitTexture(u.uid, composePlayerSheet(this.app.assets, ap), ap.size);
      v.aura = ap.effects.includes('aura') ? ap.glow : null;
    } else v = this.scene.addUnit(u, u.defId === 'sproutling' ? 'sproutling' : ENEMIES[u.defId].sprite);
    const el = document.createElement('div'); el.className = 'ulabel ' + (u.side === 'player' ? 'player' : 'enemy'); $('labels').appendChild(el); this.labels.set(u.uid, el);
    return v;
  }
  syncDisp() {
    for (const u of this.s.units) this.disp.set(u.uid, { hp: u.hp, maxHp: u.maxHp, shield: u.statuses.shield || 0, poison: u.statuses.poison || 0, stunned: u.statuses.stunned || 0, empowered: u.statuses.empowered || 0, weakened: u.statuses.weakened || 0 });
    this.dispMana = this.s.p.mana;
  }
  frame() {
    if (!this.s || !this.scene.cam) return;
    for (const [uid, el] of this.labels) {
      const v = this.scene.units.get(uid); if (!v) { el.style.display = 'none'; continue; }
      const p = this.scene.project(this.scene.headPos(uid)); el.style.display = '';
      el.style.transform = `translate(${p.x | 0}px, ${p.y | 0}px)`;
    }
  }
  renderLabel(uid) {
    const el = this.labels.get(uid); const d = this.disp.get(uid); if (!el || !d) return;
    const pct = Math.max(0, d.hp / d.maxHp) * 100;
    const it = this.intents.find(i => i.uid === uid);
    let intent = '';
    if (it && this.s.phase === 'player') {
      const ic = { attack: ICON.sword, spit: ICON.spit, hex: ICON.stun, aim: ICON.aim, fire: ICON.aim, slam: ICON.slam, summon: ICON.summon, guard: ICON.guard, stunned: ICON.stun, move: ICON.move }[it.kind] || ICON.move;
      const cls = it.kind === 'fire' || it.kind === 'slam' ? 'locked' : (it.damage ? 'threat' : 'calm');
      intent = `<div class="intent ${cls}" title="${esc(this.intentText(it))}">${ic}${it.damage ? `<b>${it.damage}</b>` : ''}${it.poison ? `<span class="psn">${ICON.poison}${it.poison}</span>` : ''}${it.weaken ? `<span class="wk">−${it.weaken}⚔</span>` : ''}</div>`;
    }
    const st = [d.weakened ? `<span class="st wk">−${d.weakened}⚔</span>` : '', d.shield ? `<span class="st sh">${ICON.shield}${d.shield}</span>` : '', d.poison ? `<span class="st ps">${ICON.poison}${d.poison}</span>` : '', d.stunned ? `<span class="st sn">${ICON.stun}</span>` : '', d.empowered ? `<span class="st em">+${d.empowered}</span>` : ''].join('');
    el.innerHTML = `${intent}<div class="hpbar"><i style="width:${pct}%"></i><span>${d.hp}</span></div><div class="sts">${st}</div>`;
  }
  intentText(it) {
    const tgt = it.target && this.s.units.find(u => u.uid === it.target);
    const who = tgt && !tgt.hero ? ' your ' + tgt.name : ' you';
    return ({ attack: `Will strike${who} for ${it.damage}`, spit: `Will spit for ${it.damage} and poison ${it.poison}`, hex: `Will curse you: ${it.damage} damage and −${it.weaken} power on your next turn`, aim: 'Will take aim along a line', fire: `Fires ${it.damage} along the red line`,
      slam: `Root Slam: ${it.damage} to every red tile`, summon: 'Will call a hound', guard: 'Will shield adjacent allies', stunned: 'Stunned — loses its next action' })[it.kind] || 'Will move';
  }
  renderHUD() {
    const s = this.s; const p = player(s); const d = this.disp.get(p.uid) || { hp: p.hp, maxHp: p.maxHp, shield: 0 };
    const ap = deriveAppearance(this.run.evo);
    $('plate').innerHTML = `
      <div class="pl-top"><div><div class="pl-name">${esc(this.run.name)}</div><div class="pl-stage">${STAGE[ap.stage]} · ${this.run.evo.absorbed.length} graft${this.run.evo.absorbed.length === 1 ? '' : 's'}</div></div>
      <div class="pl-pt" title="Power / Toughness"><span class="${d.empowered ? 'buff' : d.weakened ? 'debuff' : ''}">${Math.max(0, p.power + (d.empowered || 0) - (d.weakened || 0))}</span>/<span>${p.toughness}</span></div></div>
      <div class="pl-hp"><div class="bar"><i style="width:${(d.hp / d.maxHp) * 100}%"></i>${d.shield ? `<u style="width:${Math.min(100, d.shield / d.maxHp * 100)}%"></u>` : ''}</div>
      <span>${ICON.heart}${d.hp}<small>/${d.maxHp}</small>${d.shield ? ` <em class="shd">${ICON.shield}${d.shield}</em>` : ''}</span></div>
      <div class="pl-res"><span class="mana" title="Mana">${Array.from({ length: Math.max(s.p.maxMana, this.dispMana) }, (_, i) => `<i class="${i < this.dispMana ? 'on' : ''}">${ICON.gem}</i>`).join('')}</span>
      <span class="moves" title="Movement left">${ICON.move}${s.phase === 'player' ? s.p.moveLeft : 0}</span>
      <span class="atk ${s.p.attacksLeft > 0 && s.phase === 'player' ? 'on' : ''}" title="Attacks left">${ICON.sword}${s.phase === 'player' ? s.p.attacksLeft : 0}</span></div>
      <div class="pl-kw">${kwChips(p.keywords)}${d.poison ? `<span class="chip bad">${ICON.poison}Poison ${d.poison}</span>` : ''}</div>`;
    $('enc-turn').textContent = s.phase === 'player' ? `Turn ${s.turn} · Your move` : `Turn ${s.turn} · Foes act`;
    const tray = $('tray');
    if (!s.spellbook.length) tray.innerHTML = `<div class="tray-empty">${ICON.book}<span>Your spellbook is empty</span></div>`;
    else tray.innerHTML = s.spellbook.map((e, i) => {
      const c = getCard(e.id); const why = this.busy ? 'Wait…' : castBlockReason(s, e.id);
      return `<button type="button" class="spell c-${c.color} ${this.spell === e.id ? 'sel' : ''} ${why ? 'off' : ''} ${s.p.cast[e.id] ? 'used' : ''}" data-spell="${esc(e.id)}" aria-label="${esc(c.name)}${why ? ' — ' + esc(why) : ''}" title="${esc(why || 'Range ' + spellRange(e.id, e.level))}">
        <span class="sp-cost">${'<i></i>'.repeat(c.cost)}</span><span class="sp-name">${esc(c.name)}${e.level > 1 ? ` <sup>${'✦'.repeat(e.level - 1)}</sup>` : ''}</span>
        <span class="sp-text">${esc(formatSpellText(e.id, e.level, s.p.arcane))}</span><kbd>${i + 1}</kbd></button>`;
    }).join('');
    $('endTurn').disabled = this.busy || s.phase !== 'player';
    $('endTurn').classList.toggle('glow', s.phase === 'player' && !this.busy && s.p.attacksLeft === 0 && (s.p.moveLeft === 0 || !moveOptions(s).length));
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
    this.scene.setDanger(danger);
    if (danger.length) this.app.hint('danger', 'Red tiles will be struck on the enemy turn. Step out of them — foes standing there get hit too.');
    for (const v of this.scene.units.values()) v.outline = 0;
    if (this.busy || s.phase !== 'player') { this.scene.setOverlay(this.cursorTiles([])); return; }
    const hv = this.scene.units.get(player(s).uid); if (hv) hv.outline = 0.25;
    if (this.spell) {
      const opts = castOptions(s, this.spell);
      for (const t of opts) tiles.push({ ...t, col: [0.6, 0.45, 1, 0.3] });
      const h = this.hover;
      if (h && opts.some(o => o.x === h.x && o.y === h.y)) {
        const eff = getCard(this.spell).effect || this.spell;
        const area = eff === 'venom_mist' ? 'sq' : eff === 'starfall' ? 'plus' : null;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!area && (dx || dy)) continue; if (area === 'plus' && dx && dy) continue;
          tiles.push({ x: h.x + dx, y: h.y + dy, col: [0.85, 0.6, 1, 0.6], ring: true });
        }
      }
    } else {
      const mo = moveOptions(s);
      for (const t of mo) tiles.push({ x: t.x, y: t.y, col: [0.95, 0.78, 0.35, 0.22] });
      for (const e of attackTargets(s)) tiles.push({ x: e.x, y: e.y, col: [1, 0.3, 0.2, 0.85], ring: true });
      const h = this.hover;
      if (h) {
        const e = unitAt(s, h.x, h.y);
        if (e && e.side === 'enemy') {
          for (const v of reachable(s, e, e.move).values()) if (v.stop && v.cost > 0) tiles.push({ x: v.x, y: v.y, col: [0.9, 0.25, 0.2, 0.16] });
          const plan = this.autoAttackPlan(e); if (plan && plan.move) for (const t of plan.path) tiles.push({ ...t, col: [1, 0.9, 0.55, 0.5], inset: 0.12 });
          const ev = this.scene.units.get(e.uid); if (ev) ev.outline = 0.6;
        } else if (mo.some(o => o.x === h.x && o.y === h.y)) {
          for (const t of pathTo(reachable(s, player(s), s.p.moveLeft), h.x, h.y)) tiles.push({ ...t, col: [1, 0.9, 0.55, 0.55], inset: 0.12 });
        }
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
    const best = [...map.values()].filter(v => v.stop && v.cost > 0 && canAttack(s, { ...p, x: v.x, y: v.y }, e)).sort((a, b) => a.cost - b.cost || a.y - b.y || a.x - b.x)[0];
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
  showInspect(u, preview) {
    const el = $('inspect');
    if (!u) { el.classList.remove('show'); return; }
    const def = ENEMIES[u.defId]; const it = this.intents.find(i => i.uid === u.uid);
    el.innerHTML = def ? `
      <div class="in-head"><b>${esc(u.name)}</b><em class="role">${esc(def.role)}</em>${u.legendary ? '<em class="leg">Legendary</em>' : ''}<span class="pt">${u.power}/${u.toughness}</span></div>
      <div class="in-hp">${ICON.heart}${u.hp}/${u.maxHp}${u.statuses.shield ? ` · ${ICON.shield}${u.statuses.shield}` : ''}</div>
      ${Object.keys(u.keywords).length ? `<div class="in-kw">${kwChips(u.keywords)}</div>` : ''}
      <p>${esc(def.blurb)}</p>${it ? `<p class="in-intent">${esc(this.intentText(it))}</p>` : ''}${this.previewHTML(preview)}` : '';
    el.classList.toggle('show', !!el.innerHTML);
  }
  bindInput() {
    const cv = $('gl');
    let downAt = null; const touches = new Map(); let pinch0 = null;
    const pinchDist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const endTouch = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = null; };
    cv.addEventListener('pointerdown', e => {
      this.app.audio.unlock();
      if (e.pointerType === 'touch') { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { pinch0 = { d: pinchDist(), z: this.scene.zoom }; downAt = null; return; } }
      if (!pinch0) downAt = { x: e.clientX, y: e.clientY };
    });
    cv.addEventListener('pointermove', e => {
      if (touches.has(e.pointerId)) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch0 && touches.size === 2) this.scene.zoom = Math.min(2, Math.max(0.8, pinch0.z * pinchDist() / pinch0.d)); return; }
      if (!this.s || e.pointerType === 'touch') return; this.setHover(this.scene.pick(e.offsetX, e.offsetY));
    });
    cv.addEventListener('pointercancel', endTouch);
    cv.addEventListener('pointerup', e => {
      const wasPinch = !!pinch0 || touches.size > 1; endTouch(e);
      if (!this.s || !downAt || wasPinch) return;
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 12) return;
      const t = this.scene.pick(e.offsetX, e.offsetY); if (!t) { this.cancel(); return; }
      if (e.pointerType === 'touch') this.setHover(t);
      this.onTile(t, e.pointerType === 'touch');
    });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); this.cancel(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.scene.zoom = Math.min(2, Math.max(0.8, this.scene.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
    $('tray').addEventListener('click', e => { const b = e.target.closest('[data-spell]'); if (b) this.selectSpell(b.dataset.spell); });
    $('endTurn').addEventListener('click', () => this.doEndTurn());
    $('plate').addEventListener('click', () => this.app.openSheet());
    window.addEventListener('keydown', e => {
      if (!this.s || this.app.modalOpen() || this.app.mode !== 'battle') return;
      const k = e.key.toLowerCase();
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
    });
  }
  setHover(t) {
    if ((t && this.hover && t.x === this.hover.x && t.y === this.hover.y) || (!t && !this.hover)) return;
    this.hover = t; this.refreshHighlights();
    if (!t || !this.s) { this.showInspect(null); return; }
    const u = unitAt(this.s, t.x, t.y); let preview = null;
    if (this.s.phase === 'player' && !this.busy) {
      if (this.spell && castOptions(this.s, this.spell).some(o => o.x === t.x && o.y === t.y)) preview = this.simulate(c => cast(c, this.spell, t.x, t.y));
      else if (u && u.side === 'enemy') { const plan = this.autoAttackPlan(u); if (plan) preview = this.simulate(c => { if (plan.move) movePlayer(c, plan.to.x, plan.to.y); attack(c, u.uid); }); }
    }
    if (u && u.side === 'enemy') this.showInspect(u, preview);
    else if (preview) { $('inspect').innerHTML = `<div class="in-head"><b>${esc(getCard(this.spell).name)}</b></div>${this.previewHTML(preview)}`; $('inspect').classList.add('show'); }
    else this.showInspect(null);
  }
  cancel() { this.spell = null; this.pendingTap = null; this.refresh(); }
  reject(msg) { this.audio.play('nope'); this.app.toast(`<b>Can't</b> ${esc(msg)}`, 'short'); }
  selectSpell(id) {
    if (!this.s || this.s.phase !== 'player') return;
    if (this.busy) return;
    if (this.spell === id) { this.spell = null; this.refresh(); return; }
    const why = castBlockReason(this.s, id); if (why) { this.flashTray(id); this.reject(why); return; }
    this.audio.play('click');
    const opts = castOptions(this.s, id);
    if (getCard(id).target === 'self') { this.spell = null; this.act(() => cast(this.s, id, opts[0].x, opts[0].y)); return; }
    this.spell = id; this.pendingTap = null; this.refresh();
    this.app.hint('target', 'Pick a highlighted tile. Hover to preview the result; right-click or Esc to cancel.');
  }
  flashTray(id) { const b = document.querySelector(`[data-spell="${CSS.escape(id)}"]`); if (b) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); } }
  needConfirm(isTouch, tag) {
    if (!isTouch) return false;
    if (this.pendingTap === tag) { this.pendingTap = null; return false; }
    this.pendingTap = tag; const h = $('taphint'); h.classList.remove('show'); void h.offsetWidth; h.classList.add('show'); return true;
  }
  onTile(t, isTouch) {
    const s = this.s; if (this.busy) return;
    if (s.phase !== 'player') { this.reject('Wait for the foes to finish'); return; }
    const tag = key(t.x, t.y) + (this.spell || '');
    if (this.spell) {
      if (castOptions(s, this.spell).some(o => o.x === t.x && o.y === t.y)) { if (this.needConfirm(isTouch, tag)) return; const id = this.spell; this.spell = null; this.act(() => cast(s, id, t.x, t.y)); }
      else { this.reject(`${getCard(this.spell).name} can't target that tile`); }
      return;
    }
    const u = unitAt(s, t.x, t.y);
    if (u && u.side === 'enemy') {
      const plan = this.autoAttackPlan(u);
      if (plan) { if (this.needConfirm(isTouch, tag)) return; this.act(() => { const ev = []; if (plan.move) ev.push(...movePlayer(s, plan.to.x, plan.to.y)); if (s.phase === 'player') ev.push(...attack(s, u.uid)); return ev; }); }
      else { this.showInspect(u); this.reject(s.p.attacksLeft <= 0 ? 'You already attacked this turn' : `${u.name} is out of reach this turn`); }
      return;
    }
    if (u && u.hero) { this.app.openSheet(); return; }
    if (moveOptions(s).some(o => o.x === t.x && o.y === t.y)) { if (this.needConfirm(isTouch, tag)) return; this.act(() => movePlayer(s, t.x, t.y)); }
    else if (s.p.moveLeft <= 0) this.reject('No movement left this turn');
    else this.reject('Too far, or blocked');
  }
  async act(fn) {
    if (this.busy) return;
    this.busy = true; this.pendingTap = null; this.showInspect(null); this.scene.setOverlay([]); this.syncDisp();
    let ev;
    try { ev = await fn(); } catch (err) { this.busy = false; this.reject(err.message || 'Not allowed'); this.refresh(); return; }
    this.app.save(); this.renderHUD();
    await this.play(ev);
    this.busy = false; this.syncDisp(); this.refresh(); this.tutorialHints('after'); this.checkEnd();
  }
  async doEndTurn() {
    if (this.busy || !this.s || this.s.phase !== 'player') return;
    this.spell = null; this.audio.play('click');
    await this.act(() => endTurn(this.s));
  }
  checkEnd() { if (!this.s) return; if (this.s.phase === 'won' || this.s.phase === 'lost') { const r = this.s.phase; const done = this.done; this.done = null; if (done) setTimeout(() => done(r), 300 / this.app.animFactor()); } }
  float(uid, text, cls) {
    if (!this.scene.cam) return;
    const p = this.scene.project(this.scene.headPos(uid));
    const el = document.createElement('div'); el.className = 'float ' + cls; el.innerHTML = text;
    el.style.left = (p.x + (Math.random() - 0.5) * 24) + 'px'; el.style.top = (p.y - 10) + 'px';
    $('labels').appendChild(el); setTimeout(() => el.remove(), 1300);
  }
  async banner(text, cls = '') {
    if (this.app.animFactor() > 50) return;
    const b = $('banner'); b.className = 'banner ' + cls; b.innerHTML = `<span>${esc(text)}</span>`; void b.offsetWidth; b.classList.add('show');
    await this.wait(950); b.classList.remove('show');
  }
  tile(x, y) { return this.scene.world(x, y); }
  async play(events) {
    const sc = this.scene, au = this.audio; let actor = null;
    for (const e of events) {
      const d = e.uid != null ? this.disp.get(e.uid) : null;
      switch (e.t) {
        case 'turn':
          if (e.phase === 'player' && e.turn > 1) { au.play('turn'); await this.banner('Your Turn', 'you'); }
          else if (e.phase === 'enemy') { au.play('enemyTurn'); await this.banner('Foes Act', 'foe'); }
          this.renderHUD(); break;
        case 'enemyTurn': { if (actor) actor.outline = 0; actor = sc.units.get(e.uid); if (actor) actor.outline = 0.8; const u = this.s.units.find(x => x.uid === e.uid); if (u) this.app.status(`${u.name} acts`); await this.wait(110); break; }
        case 'move': sc.onStep = () => au.play('step'); await sc.movePath(e.uid, e.path, 0.17 / this.app.animFactor()); sc.onStep = null; break;
        case 'teleport': au.play('spell'); await sc.teleport(e.uid, e.x, e.y); break;
        case 'push': await sc.slide(e.uid, e.path); break;
        case 'attack':
          if (e.ranged) { const a = sc.centerPos(e.uid), b = sc.centerPos(e.target); sc.play(e.uid, 'attack'); sc.face(sc.units.get(e.uid), b); await sc.projectile(a, b, [1, 0.85, 0.5], 0.2); }
          else await sc.lunge(e.uid, e.target);
          break;
        case 'counter': await this.wait(e.first ? 40 : 110); await sc.lunge(e.uid, e.target); this.float(e.uid, e.first ? 'First Strike!' : 'Strikes back', 'note'); break;
        case 'noCounter': this.float(e.uid, esc(NO_COUNTER[e.reason] || 'No strike back'), 'note'); break;
        case 'capped': this.float(e.uid, `Heartwood: ${e.from} → ${e.to}`, 'note'); break;
        case 'damage': {
          if (d) { d.hp = e.deathtouch ? 0 : Math.max(0, d.hp - e.amount); d.shield = Math.max(0, d.shield - e.blocked); }
          const big = e.amount >= 4 || e.deathtouch;
          if (e.amount > 0) sc.hit(e.uid, e.kind === 'poison' ? [0.6, 1, 0.3] : e.kind === 'spell' ? [0.8, 0.6, 1] : e.deathtouch ? [0.75, 0.4, 1] : [1, 0.55, 0.3], big);
          if (e.deathtouch) sc.screenFlash([0.55, 0.3, 0.8], 0.25);
          au.play(e.deathtouch ? 'deathtouch' : e.amount > 0 ? (big ? 'bigHit' : 'hit') : 'block');
          if (e.blocked) this.float(e.uid, `${ICON.shield}${e.blocked}`, 'blocked');
          if (e.amount > 0 || !e.blocked) this.float(e.uid, e.deathtouch ? '☠ Deathtouch' : `−${e.amount}`, e.deathtouch ? 'dt' : e.kind === 'poison' ? 'poison' : 'dmg');
          if (e.kind === 'bramble') this.float(e.uid, 'Brambles', 'note');
          if (e.kind === 'spines') this.float(e.uid, 'Spines', 'note');
          this.renderLabel(e.uid); if (this.isHero(e.uid)) this.renderHUD();
          await this.wait(big ? 230 : 140); break;
        }
        case 'heal': if (d) d.hp += e.amount; au.play('heal'); this.float(e.uid, `+${e.amount}${e.kind === 'lifelink' ? ' Lifelink' : e.kind === 'regenerate' ? ' Regenerate' : ''}`, 'heal'); sc.fx.burst(sc.centerPos(e.uid), [0.5, 1, 0.5], 14, { speed: 0.8, up: 1.5, grav: 1 }); sc.light(sc.centerPos(e.uid), [0.5, 1, 0.5], 2, 0.5); this.renderLabel(e.uid); this.renderHUD(); await this.wait(140); break;
        case 'shield': if (d) d.shield = e.total; au.play('block'); this.float(e.uid, `${ICON.shield}+${e.amount}${e.kind === 'ward' ? ' Bulwark' : ''}`, 'shieldf'); sc.fx.burst(sc.centerPos(e.uid), [0.5, 0.8, 1], 14, { speed: 0.9 }); this.renderLabel(e.uid); this.renderHUD(); await this.wait(120); break;
        case 'status': {
          if (d) d[e.status] = e.total;
          const lbl = { poison: `${ICON.poison}Poison ${e.value}`, stunned: `${ICON.stun}Stunned`, empowered: `+${e.value} power`, weakened: `Hexed −${e.value} power` }[e.status];
          if (e.value && lbl) this.float(e.uid, lbl, e.status === 'empowered' ? 'heal' : 'poison');
          this.renderLabel(e.uid); this.renderHUD(); await this.wait(120); break;
        }
        case 'death': au.play('death'); { const lb = this.labels.get(e.uid); if (lb) { lb.remove(); this.labels.delete(e.uid); } } await sc.death(e.uid); break;
        case 'mana': this.dispMana = e.to; this.renderHUD(); break;
        case 'spell': {
          const c = getCard(e.id); const col = SPELL_COL[c.color] || [1, 0.9, 0.6]; au.play('spell'); sc.play(e.uid, 'cast');
          const from = sc.centerPos(e.uid), to = [...this.tile(e.x, e.y)]; to[1] = 0.4;
          sc.light(from, col, 2.6, 0.6, 1.4);
          if (c.target === 'self') { sc.fx.swirl(from, () => sc.centerPos(e.uid), col, 46, 0.7); await this.wait(380); }
          else if ((c.effect || e.id) === 'starfall') { await sc.projectile([to[0] + 2, 6, to[2] - 2], to, col, 0.45, 0); sc.shake(0.2); sc.light(to, col, 4, 0.6, 2.5); sc.screenFlash([1, 0.95, 0.8], 0.3); }
          else if ((c.effect || e.id) !== 'blink_step' && (c.effect || e.id) !== 'call_sproutling') await sc.projectile(from, to, col, 0.3);
          break;
        }
        case 'area': { const col = e.kind === 'mist' ? [0.6, 1, 0.3] : [1, 0.9, 0.5]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (e.kind === 'star' && dx && dy) continue; const w = this.tile(e.x + dx, e.y + dy); sc.fx.burst([w[0], 0.2, w[2]], col, 10, { speed: 0.8, up: 1 }); } break; }
        case 'chain': { const a = [...this.tile(e.from.x, e.from.y)], b = [...this.tile(e.x, e.y)]; a[1] = b[1] = 0.4; await sc.projectile(a, b, [0.7, 0.85, 1], 0.14, 0.15); break; }
        case 'trample': this.float(e.uid, 'Trample!', 'note'); await this.wait(100); break;
        case 'spines': break;
        case 'aim': au.play(e.slam ? 'slam' : 'aim'); sc.play(e.uid, 'cast'); if (e.slam) this.float(e.uid, 'Root Slam!', 'warn'); this.scene.setDanger(e.tiles); await this.wait(260); break;
        case 'hex': { au.play('spell'); sc.play(e.uid, 'cast'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.85, 0.3, 0.9], 0.3, 0.3); break; }
        case 'spit': { au.play('fire'); sc.play(e.uid, 'attack'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.75, 0.4, 1], 0.25); break; }
        case 'fire': { au.play('fire'); sc.play(e.uid, 'attack'); const a = sc.centerPos(e.uid); const end = e.tiles.at(-1) || { x: 0, y: 0 }; const victim = e.tiles.map(t => this.s.units.find(u => u.x === t.x && u.y === t.y && u.uid !== e.uid && u.hp >= 0)).find(Boolean); const b = victim && sc.units.get(victim.uid) ? sc.centerPos(victim.uid) : [...this.tile(end.x, end.y)]; await sc.projectile(a, b, [0.9, 1, 0.6], 0.22, 0.15); break; }
        case 'slamHit': au.play('slam'); sc.shake(0.25); sc.play(e.uid, 'attack'); for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.fx.burst([w[0], 0.1, w[2]], [0.5, 0.4, 0.25], 8, { speed: 1, up: 2 }); } await this.wait(220); break;
        case 'summon': { const u = this.s.units.find(x => x.uid === e.uid); if (u) { this.disp.set(u.uid, { hp: u.maxHp, maxHp: u.maxHp, shield: 0, poison: 0, stunned: 0, empowered: 0 }); this.addUnitView({ ...u, x: e.x, y: e.y }); this.renderLabel(u.uid); await sc.spawn(u.uid); } break; }
        case 'bossPhase': sc.screenFlash([0.6, 0.35, 0.15], 0.3); await this.banner('Bark hardens over her wounds', 'boss'); break;
        case 'stunnedSkip': this.float(e.uid, 'Stunned', 'note'); await this.wait(200); break;
        case 'victory': au.play('victory'); await this.banner('Victory', 'win'); break;
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
    if (s.spellbook.length) H('spell', 'Spells cost mana — the gems by your health. They refill each turn. Tap a spell, then a target.');
  }
}
