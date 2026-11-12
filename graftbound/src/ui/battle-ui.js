// Battle HUD, input (mouse / touch / keyboard) and event playback onto the HD-2D scene.
import { moveOptions, movePlayer, attackTargets, attack, castOptions, cast, endTurn, intents, canAttack, player, enemies, hazardPreview, interact, interactOptions, crystalAt, guard, channel, guardValue, stanceBlockReason } from '../engine/combat.js';
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
import { composePlayerSheet } from '../rendering/evolution-visuals.js';
import { VFX, DEFAULT_VFX, chainHop } from '../rendering/vfx.js';
import { castSpellVisual, withTimeout } from '../rendering/casting.js';
import { ICON } from './icons.js';
import { esc, cardHTML } from './cards.js';

const $ = id => document.getElementById(id);
const SPELL_COL = { ember: [1, 0.55, 0.2], verdant: [0.5, 1, 0.4], tide: [0.4, 0.8, 1], umbral: [0.75, 0.45, 1], radiant: [1, 0.9, 0.5] };
const SPELL_SFX = { disfigure: 'poison', titanic: 'spell', pyroclasm: 'fireboom', lightningBolt: 'thunder', spark: 'zap', shock: 'zap', flameSlash: 'fireboom', salve: 'heal', chain: 'thunder', fire: 'fireboom', fireball: 'fireboom', frost: 'frost', poison: 'poison', heal: 'heal', shield: 'block', growth: 'spell', drain: 'spell', summon: 'spell', wind: 'spell' };
export const STAGE = { blank: 'Blank', stirring: 'Stirring', awakened: 'Awakened', ascendant: 'Ascendant' };
const NO_COUNTER = { boss: 'Bosses never strike back — watch their telegraphs', flying: 'Flying — it cannot reach you', 'first strike': 'First Strike — no strike back', stunned: 'Stunned — no strike back', 'no power': 'Too weak to strike back' };
export function kwChips(keywords, cls = '') {
  return Object.entries(keywords).filter(([k]) => KEYWORDS[k]).map(([k, v]) => `<span class="chip ${cls}" tabindex="0" data-tip="${esc(KEYWORDS[k].text)}"><em>${KEYWORDS[k].glyph}</em>${esc(keywordLabel(k, v))}</span>`).join('');
}

export class BattleUI {
  constructor(app) {
    this.app = app; this.audio = app.audio;
    this.disp = new Map(); this.labels = new Map(); this.busy = false; this.spell = null; this.hover = null; this.cursor = null; this.pendingTap = null; this.intents = [];
    this.bindInput();
  }
  get scene() { return this.app.scene; }
  /** Every player action goes through here: the engine validates it, THEN it is recorded (ranked replay). */
  exec(d) {
    const s = this.s; let ev;
    switch (d.type) {
      case 'move': ev = movePlayer(s, d.x, d.y); break;
      case 'attack': ev = attack(s, d.uid); break;
      case 'cast': ev = cast(s, d.id, d.x, d.y); break;
      case 'interact': ev = interact(s, d.x, d.y); break;
      case 'end': ev = endTurn(s); break;
      case 'guard': ev = guard(s); break;
      case 'channel': ev = channel(s); break;
      default: throw new Error('Unknown action');
    }
    this.app.record(d);
    if (d.type !== 'end') this.autoEnds = 0;
    return ev;
  }
  wait(ms) { return new Promise(r => setTimeout(r, ms / this.app.animFactor())); }
  async start(run, s, { fresh }) {
    this.run = run; this.s = s; this.spell = null; this.hover = null; this.pendingTap = null;
    $('labels').innerHTML = ''; this.labels.clear(); this.disp.clear();
    this.scene.loadArena(s, s.rng.s ^ 0x77, ACTS[s.act || 0].theme); this.audio.setAct(s.act || 0);
    for (const u of s.units) if (u.hp > 0) this.addUnitView(u);
    this.syncDisp(); $('hud').classList.remove('hidden'); $('enc-name').textContent = s.name;
    if (this.app.live && s.spellbook.length) this.app.live.enrichAll(s.spellbook.map(e => e.id)).then(() => { if (this.s === s) this.renderHUD(); });   // real card faces when online
    this.scene.zoom = 1; this.scene.focusTarget = [0, 0, 0]; this.scene.dof = 1;
    this.refresh();
    return new Promise(async res => {
      this.done = res;
      if (fresh) {
        this.busy = true; this.refresh();
        await this.banner(s.nodeType === 'boss' ? bossNameOf(s.act) : s.nodeType === 'elite' ? 'Elite Lair · ' + s.name : s.name, s.nodeType === 'boss' ? 'boss' : '', s.nodeType === 'boss' ? bossTitleOf(s.act) : '');
        if (s.reinforced) { await this.banner(`The world answers your strength · +${s.reinforced} foe${s.reinforced > 1 ? 's' : ''}`, 'foe'); this.app.hint('reinforced', 'The stronger you become, the more foes answer. Reinforcements never have extra health — just more of them.'); }
        this.busy = false;
      }
      this.refresh(); this.tutorialHints('start'); this.checkEnd(); this.maybeAutoEnd();
    });
  }
  stop() { $('hud').classList.add('hidden'); $('labels').innerHTML = ''; this.labels.clear(); this.s = null; }
  addUnitView(u) {
    let v;
    if (u.hero) {
      const ap = deriveAppearance(this.run.evo);
      v = this.scene.addUnit(u, 'blank'); this.scene.setUnitTexture(u.uid, composePlayerSheet(this.app.assets, ap), ap.size);
      v.aura = ap.effects.includes('aura') ? ap.glow : null;
      v.hover = u.keywords.flying ? 0.28 : 0;   // v0.6: fliers levitate; trample builds plant heavier steps (see play())
      v.style = { flying: !!u.keywords.flying, trample: !!u.keywords.trample, deathtouch: !!u.keywords.deathtouch, doubleStrike: !!u.keywords.doubleStrike, lifelink: !!u.keywords.lifelink,
        armored: !!ap.slots.body || ap.size >= 1.45 };
      // v0.7 casting point follows the evolved body: horns/antlers/crown channel through the head.
      v.castAt = ap.slots.head ? 'head' : 'chest';
    } else v = this.scene.addUnit(u, u.defId === 'sproutling' ? 'sproutling' : ENEMIES[u.defId].sprite);
    const el = document.createElement('div'); el.className = 'ulabel ' + (u.side === 'player' ? 'player' : 'enemy'); $('labels').appendChild(el); this.labels.set(u.uid, el);
    return v;
  }
  syncDisp() {
    for (const u of this.s.units) this.disp.set(u.uid, { hp: u.hp, maxHp: u.maxHp, shield: u.statuses.shield || 0, poison: u.statuses.poison || 0, stunned: u.statuses.stunned || 0, empowered: u.statuses.empowered || 0, weakened: u.statuses.weakened || 0, grounded: u.statuses.grounded || 0 });
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
      const ic = { attack: ICON.sword, spit: ICON.spit, hex: ICON.stun, harpoon: ICON.hook, aim: ICON.aim, fire: ICON.aim, slam: ICON.slam, summon: ICON.summon, guard: ICON.guard, stunned: ICON.stun, move: ICON.move }[it.kind] || ICON.move;
      const cls = it.kind === 'fire' || it.kind === 'slam' ? 'locked' : (it.damage ? 'threat' : 'calm');
      intent = `<div class="intent ${cls}" title="${esc(this.intentText(it))}">${ic}${it.damage ? `<b>${it.damage}</b>` : ''}${it.extra ? `<span class="xtra">+${ICON.sword}${it.extra}</span>` : ''}${it.poison ? `<span class="psn">${ICON.poison}${it.poison}</span>` : ''}${it.weaken ? `<span class="wk">−${it.weaken}⚔</span>` : ''}</div>`;
    }
    const u = this.s.units.find(x => x.uid === uid);
    const armor = u && u.keywords && u.keywords.armor ? `<span class="st ar">▣${u.keywords.armor}</span>` : '';
    const st = [armor, d.grounded ? `<span class="st gr">${ICON.hook}</span>` : '', d.weakened ? `<span class="st wk">−${d.weakened}⚔</span>` : '', d.shield ? `<span class="st sh">${ICON.shield}${d.shield}</span>` : '', d.poison ? `<span class="st ps">${ICON.poison}${d.poison}</span>` : '', d.stunned ? `<span class="st sn">${ICON.stun}</span>` : '', d.empowered ? `<span class="st em">+${d.empowered}</span>` : ''].join('');
    el.innerHTML = `${intent}<div class="hpbar"><i style="width:${pct}%"></i><span>${d.hp}</span></div><div class="sts">${st}</div>`;
  }
  intentText(it) {
    const tgt = it.target && this.s.units.find(u => u.uid === it.target);
    const who = tgt && !tgt.hero ? ' your ' + tgt.name : ' you';
    return (({ attack: `Will strike${who} for ${it.damage}`, spit: `Will spit for ${it.damage} and poison ${it.poison}`, hex: `Will curse you: ${it.damage} damage and −${it.weaken} power on your next turn`,
      harpoon: `Harpoon: ${it.damage} damage${it.ground ? ' and Grounds you (no flying next turn)' : ''}`, aim: 'Will take aim along a line', fire: `Fires ${it.damage} along the red line`,
      slam: `${it.damage} to every red tile${it.extra ? ` (and strikes for ${it.extra} if adjacent)` : ''}`, summon: 'Will summon reinforcements', guard: 'Will shield adjacent allies', stunned: 'Stunned — loses its next action' })[it.kind] || 'Will move')
      + (it.guarded ? ` · Guard blocks ${it.guarded}` : '') + (it.silence ? ` · Silences your ${getCard(it.silence).name} next turn` : '')
      + (it.redact ? ` · Redaction: your ${KEYWORDS[it.redact].name} is suppressed during your next turn (it returns after)` : '') + (it.briars ? ' · Briars will sprout around you (fire burns them)' : '') + (it.mirror ? ` · Will copy your ${KEYWORDS[it.mirror].name}` : '');
  }
  renderHUD() {
    const s = this.s; const p = player(s); const d = this.disp.get(p.uid) || { hp: p.hp, maxHp: p.maxHp, shield: 0 };
    const ap = deriveAppearance(this.run.evo);
    $('plate').innerHTML = `
      <div class="pl-top"><div><div class="pl-name">${esc(this.run.name)}</div><div class="pl-stage">${STAGE[ap.stage]} · ${this.run.evo.absorbed.length} graft${this.run.evo.absorbed.length === 1 ? '' : 's'}</div></div>
      <div class="pl-pt" title="Power / Toughness"><span class="${d.empowered ? 'buff' : d.weakened ? 'debuff' : ''}">${Math.max(0, p.power + (d.empowered || 0) - (d.weakened || 0))}</span>/<span>${p.toughness}</span></div></div>
      <div class="pl-hp" tabindex="0" data-tip="Health ${d.hp}/${d.maxHp}${d.shield ? ` · shield ${d.shield} absorbs damage first` : ''}. Wounds carry between battles."><div class="bar"><i style="width:${(d.hp / d.maxHp) * 100}%"></i>${d.shield ? `<u style="width:${Math.min(100, d.shield / d.maxHp * 100)}%"></u>` : ''}</div>
      <span>${ICON.heart}${d.hp}<small>/${d.maxHp}</small>${d.shield ? ` <em class="shd">${ICON.shield}${d.shield}</em>` : ''}</span></div>
      <div class="pl-res"><span class="mana" tabindex="0" data-tip="Mana ${this.dispMana}/${s.p.maxMana}. Spells cost gems. You regain ${s.p.regen} each turn${s.p.arcane ? `; Arcane adds +${s.p.arcane} to spell numbers` : ''}.">${Array.from({ length: Math.max(s.p.maxMana, this.dispMana) }, (_, i) => `<i class="${i < this.dispMana ? 'on' : ''}">${ICON.gem}</i>`).join('')}</span>
      <span class="moves" tabindex="0" data-tip="Movement left this turn (tiles). Brambles and lava hurt ground units that enter them.">${ICON.move}${s.phase === 'player' ? s.p.moveLeft : 0}</span>
      <span class="atk ${s.p.attacksLeft > 0 && s.phase === 'player' ? 'on' : ''}" tabindex="0" data-tip="Attacks left this turn. Attacking ends your movement unless you have Vigilance.">${ICON.sword}${s.phase === 'player' ? s.p.attacksLeft : 0}</span></div>
      <div class="pl-kw">${kwChips(p.keywords)}${d.poison ? `<span class="chip bad" tabindex="0" data-tip="Poison: lose ${d.poison} health at the start of your turn, then it drops by 1.">${ICON.poison}Poison ${d.poison}</span>` : ''}${d.grounded ? `<span class="chip bad" tabindex="0" data-tip="Grounded: no flying and −1 movement this turn.">${ICON.hook}Grounded</span>` : ''}${p.suppressed ? `<span class="chip bad" tabindex="0" data-tip="Redacted by the Unwritten for this turn only. It returns when your turn ends.">✖ ${esc(Object.keys(p.suppressed).map(k => KEYWORDS[k].name).join(', '))}</span>` : ''}</div>`;
    $('enc-turn').textContent = s.phase === 'player' ? `Turn ${s.turn} · Your move` : `Turn ${s.turn} · Foes act`;
    this.renderHand(s);
    this.renderStances(s);
    $('endTurn').disabled = this.busy || s.phase !== 'player';
    $('endTurn').classList.toggle('glow', s.phase === 'player' && !this.busy && !getLegalPlayerActions(s).any);
  }
  /** v0.8 spell hand: the actual Magic card faces (unmodified Scryfall image when available, GRAFTBOUND frame
   *  offline) with small overlays for GRAFTBOUND's adapted mana cost, level, availability and selection. */
  renderHand(s) {
    const tray = $('tray');
    if (!s.spellbook.length) { tray.innerHTML = `<div class="tray-empty">${ICON.book}<span>Your spellbook is empty</span></div>`; return; }
    tray.classList.toggle('many', s.spellbook.length > 5);
    tray.innerHTML = s.spellbook.map((e, i) => {
      const c = getCard(e.id); const why = this.busy ? 'Wait…' : castBlockReason(s, e.id); const cost = spellCost(s, e.id);
      const state = s.p.cast[e.id] ? 'used' : s.p.silenced === e.id ? 'silenced' : why && /mana/i.test(why) ? 'nomana' : why ? 'off' : 'ready';
      const label = { used: 'Cast this turn', silenced: 'Silenced', nomana: 'Not enough mana', off: why || '', ready: 'Ready' }[state];
      return `<button type="button" class="handcard c-${c.color} ${this.spell === e.id ? 'sel' : ''} st-${state}" data-spell="${esc(e.id)}" style="--i:${i};--n:${s.spellbook.length}"
          aria-pressed="${this.spell === e.id}" aria-label="${esc(c.name)}, ${cost} mana in GRAFTBOUND, level ${e.level}. ${esc(label)}. ${esc(formatSpellText(e.id, e.level, s.p.arcane))}">
        ${cardHTML(e.id, { small: true, level: e.level, arcane: s.p.arcane, uid: 'hand' + i, extraClass: 'in-hand' })}
        <span class="hc-cost ${cost > c.cost ? 'taxed' : ''}" title="GRAFTBOUND mana cost (not the printed Magic cost)">${ICON.gem}${cost}</span>
        ${e.level > 1 ? `<span class="hc-lvl" title="Spell level">${'✦'.repeat(e.level - 1)}</span>` : ''}
        <span class="hc-state">${esc(label)}</span><kbd>${i + 1}</kbd>
        <span class="hc-info" data-inspect="${esc(e.id)}" role="button" tabindex="-1" aria-label="Inspect ${esc(c.name)}">i</span></button>`;
    }).join('');
  }
  /** v0.8 tactical stances (always available; each costs your attack). */
  renderStances(s) {
    let el = $('stances'); if (!el) { el = document.createElement('div'); el.id = 'stances'; el.className = 'stances'; $('hud').appendChild(el); }
    const p = player(s); const gv = guardValue(p);
    const b = (kind, label, tip, key) => { const why = this.busy ? 'Wait…' : stanceBlockReason(s, kind); return `<button type="button" class="stance ${why ? 'off' : ''} ${p.statuses[kind] || (kind === 'channel' && s.p.channel) ? 'on' : ''}" data-stance="${kind}" data-tip="${esc(tip + (why ? ' — ' + why : ''))}" aria-label="${esc(label + '. ' + tip + (why ? '. ' + why : ''))}"><b>${label}</b><kbd>${key}</kbd></button>`; };
    el.innerHTML = b('guard', `${ICON.shield} Guard ${gv}`, `Give up your attack. Until your next turn, every hit from a foe deals ${gv} less (2 + toughness ÷ ${TACTICS.guard.perToughness}, max ${TACTICS.guard.max}); telegraphed slams, breath and aimed arrows are at least halved. Hazards and poison are not reduced.`, 'G')
      + b('channel', `${ICON.gem} Channel`, `Give up your attack and remaining movement: +${TACTICS.channel.mana} mana now (may exceed your max by 1) and your next spell this turn gains +${TACTICS.channel.spellBonus}.`, 'H');
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
      const opts = castOptions(s, this.spell); const c = getCard(this.spell);
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
  showInspect(u, preview) {
    const el = $('inspect');
    if (!u) { el.classList.remove('show'); return; }
    const def = ENEMIES[u.defId]; const it = this.intents.find(i => i.uid === u.uid);
    el.innerHTML = def ? `
      <div class="in-head"><b>${esc(u.name)}</b><em class="role">${esc(def.role)}</em>${u.legendary ? '<em class="leg">Legendary</em>' : ''}<span class="pt">${u.power}/${u.toughness}</span></div>
      <div class="in-hp">${ICON.heart}${u.hp}/${u.maxHp}${u.statuses.shield ? ` · ${ICON.shield}${u.statuses.shield}` : ''}${u.boss ? ` · Phase ${bossPhaseOf(u)}/3 · ${esc(bossPhaseName(u))}` : ''}</div>
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
    $('tray').addEventListener('click', e => {
      const inf = e.target.closest('[data-inspect]'); if (inf) { e.stopPropagation(); this.app.inspectSpell(inf.dataset.inspect); return; }
      const b = e.target.closest('[data-spell]'); if (b) this.selectSpell(b.dataset.spell);
    });
    $('hud').addEventListener('click', e => { const st = e.target.closest('[data-stance]'); if (st) this.doStance(st.dataset.stance); });
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
      else if (k === 'g') this.doStance('guard'); else if (k === 'h') this.doStance('channel');
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
    else if (!u && !this.spell) this.showTile(t);
    else if (preview) { $('inspect').innerHTML = `<div class="in-head"><b>${esc(getCard(this.spell).name)}</b></div>${this.previewHTML(preview)}`; $('inspect').classList.add('show'); }
    else this.showInspect(null);
  }
  /** v0.6 terrain/object inspection: what it is, what it does, when, and the damage — from live rules. */
  showTile(t) {
    const s = this.s, el = $('inspect'); const rows = describeTile(s, t.x, t.y); const w = s.phase === 'player' ? pathWarning(s, t.x, t.y) : null;
    el.innerHTML = rows.map(r => `<div class="in-head"><b>${esc(r.name)}</b><em class="role ${r.kind}">${r.kind === 'hazard' ? 'Hazard' : r.kind === 'benefit' ? 'Benefit' : ''}</em></div><p>${esc(r.text)}</p><p class="muted small">${esc(r.when)}</p>`).join('')
      + (w ? `<div class="preview"><span class="take">${esc(w.text)}${w.lethal ? ' This would defeat you.' : ''}</span></div>` : '')
      + (interactOptions(s).some(o => o.x === t.x && o.y === t.y) ? '<div class="preview"><span class="safe">Click / tap to attune this crystal.</span></div>' : '');
    el.classList.add('show');
  }
  maybeAutoEnd() {
    const s = this.s; const enabled = this.app.meta.settings.autoEnd !== false;
    if (this.autoEnding || !shouldAutoEnd(s, { busy: this.busy, targeting: !!this.spell, enabled })) return;
    if ((this.autoEnds || 0) >= 25) return;   // safety valve: a long stun-lock never loops unattended
    this.autoEnding = true; this.app.status('No actions left — your turn ends');
    setTimeout(async () => {
      this.autoEnding = false;
      if (!this.s || !shouldAutoEnd(this.s, { busy: this.busy, targeting: !!this.spell, enabled: this.app.meta.settings.autoEnd !== false })) { this.app.status(''); return; }
      this.autoEnds = (this.autoEnds || 0) + 1; await this.doEndTurn();
    }, 520 / Math.min(this.app.animFactor(), 10));
  }
  cancel() { this.spell = null; this.pendingTap = null; this.refresh(); }
  reject(msg) { this.audio.play('nope'); this.app.toast(`<b>Can't</b> ${esc(msg)}`, 'short'); }
  selectSpell(id) {
    if (!this.s || this.s.phase !== 'player' || this.busy) return;
    if (this.spell === id) { this.spell = null; this.refresh(); return; }
    const why = castBlockReason(this.s, id); if (why) { this.flashTray(id); this.reject(why); return; }
    this.audio.play('click');
    const opts = castOptions(this.s, id);
    if (getCard(id).target === 'self') { this.spell = null; this.act(() => this.exec({ type: 'cast', id, x: opts[0].x, y: opts[0].y })); return; }
    this.spell = id; this.pendingTap = null; this.refresh();
    this.app.hint('target', 'Spells reach any foe on the battlefield — no need to walk closer. Pick a highlighted target; right-click or Esc to cancel.');
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
      if (castOptions(s, this.spell).some(o => o.x === t.x && o.y === t.y)) { if (this.needConfirm(isTouch, tag)) return; const id = this.spell; this.spell = null; this.act(() => this.exec({ type: 'cast', id, x: t.x, y: t.y })); }
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
      else { this.showInspect(u); this.reject(s.p.attacksLeft <= 0 ? 'You already attacked this turn' : `${u.name} is out of reach this turn`); }
      return;
    }
    if (u && u.hero && !interactOptions(s).some(o => o.x === t.x && o.y === t.y)) { this.app.openSheet(); return; }
    if (interactOptions(s).some(o => o.x === t.x && o.y === t.y)) { if (this.needConfirm(isTouch, tag)) return; this.act(() => this.exec({ type: 'interact', x: t.x, y: t.y })); return; }
    if (moveOptions(s).some(o => o.x === t.x && o.y === t.y)) {
      const warn = pathWarning(s, t.x, t.y);
      if (warn) { if (!this.warnOk(tag, warn)) return; }
      else if (this.needConfirm(isTouch, tag)) return;
      this.act(() => this.exec({ type: 'move', x: t.x, y: t.y }));
    }
    else if (!u && isTouch) { this.showTile(t); }
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
    this.busy = true; this.pendingTap = null; this.showInspect(null); this.scene.setOverlay([]); this.syncDisp();
    let ev;
    try { ev = await fn(); } catch (err) { this.busy = false; this.reject(err.message || 'Not allowed'); this.refresh(); return; }
    this.app.save(); this.renderHUD();
    await this.play(ev);
    this.busy = false; this.syncDisp(); this.refresh(); this.tutorialHints('after'); this.checkEnd(); this.maybeAutoEnd();
  }
  async doStance(kind) {
    if (!this.s || this.busy || this.s.phase !== 'player') return;
    const why = stanceBlockReason(this.s, kind); if (why) { this.reject(why); return; }
    this.spell = null; this.audio.play('click'); await this.act(() => this.exec({ type: kind }));
  }
  async doEndTurn() {
    if (this.busy || !this.s || this.s.phase !== 'player') return;
    this.spell = null; this.audio.play('click');
    await this.act(() => this.exec({ type: 'end' }));
  }
  checkEnd() { if (!this.s) return; if (this.s.phase === 'won' || this.s.phase === 'lost') { const r = this.s.phase; const done = this.done; this.done = null; if (done) setTimeout(() => done(r), 300 / this.app.animFactor()); } }
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
    const to = e.target != null && sc.units.get(e.target) ? sc.centerPos(e.target) : [...this.tile(e.x, e.y)];
    if (e.target == null) to[1] = 0.3;
    const tgtView = e.target != null && sc.units.get(e.target) ? e.target : null;
    const tiles = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const w = this.tile(e.x + dx, e.y + dy); tiles.push([w[0], 0, w[2]]); }
    if (kind === 'lightningBolt' || kind === 'chain') setTimeout(() => this.audio.play('crackle'), 120 / this.app.animFactor());
    await withTimeout(castSpellVisual(sc, { kind, uid: e.uid, to, target: tgtView, tiles, audio: this.audio, magnitude: e.magnitude }), 9000 / Math.min(this.app.animFactor(), 6));
    this.audio.play(SPELL_SFX[kind] || 'spell');
  }
  async play(events) {
    const sc = this.scene, au = this.audio; let actor = null;
    for (let idx = 0; idx < events.length; idx++) {
      const e = events[idx];
      const d = e.uid != null ? this.disp.get(e.uid) : null;
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
        case 'heal': if (d) d.hp += e.amount; au.play('heal'); if (e.kind === 'lifelink') { const atk = events.slice(0, idx).reverse().find(x => x.t === 'attack' && x.uid === e.uid); if (atk && sc.units.get(atk.target)) sc.fx.swirl(sc.centerPos(atk.target), () => sc.centerPos(e.uid), [1, 0.45, 0.5], 22, 0.6); } this.float(e.uid, `+${e.amount}${e.kind === 'lifelink' ? ' Lifelink' : e.kind === 'regenerate' ? ' Regenerate' : ''}`, 'heal'); sc.fx.burst(sc.centerPos(e.uid), [0.5, 1, 0.5], 14, { speed: 0.8, up: 1.5, grav: 1 }); this.renderLabel(e.uid); this.renderHUD(); await this.wait(140); break;
        case 'shield': if (d) d.shield = e.total; if (e.kind !== 'barkskin') au.play('block'); this.float(e.uid, `${ICON.shield}+${e.amount}${e.kind === 'ward' ? ' Bulwark' : ''}`, 'shieldf'); this.renderLabel(e.uid); this.renderHUD(); await this.wait(120); break;
        case 'status': {
          if (d) d[e.status] = e.total;
          const lbl = { poison: `${ICON.poison}Poison ${e.value}`, stunned: `${ICON.stun}Stunned`, empowered: `+${e.value} power`, weakened: `Hexed −${e.value} power`, grounded: `${ICON.hook}Grounded` }[e.status];
          if (e.value && lbl) this.float(e.uid, lbl, e.status === 'empowered' ? 'heal' : 'poison');
          this.renderLabel(e.uid); this.renderHUD(); await this.wait(120); break;
        }
        case 'death': au.play('death'); { const lb = this.labels.get(e.uid); if (lb) { lb.remove(); this.labels.delete(e.uid); } } await sc.death(e.uid); break;
        case 'burst': { const w = this.tile(e.x, e.y); sc.fx.burst([w[0], 0.3, w[2]], [1, 0.55, 0.15], 40, { speed: 2.8, up: 2 }); sc.addRing({ pos: [w[0], 0.03, w[2]], r0: 0.1, r1: 1.3, life: 0.35, col: [1, 0.5, 0.1], width: 0.12 }); sc.light([w[0], 0.4, w[2]], [1, 0.5, 0.15], 3, 0.4, 2.4); au.play('fireboom'); if (!sc.reduced) sc.shake(0.1); await this.wait(160); break; }
        case 'mana': this.dispMana = e.to; this.renderHUD(); break;
        case 'spell': await this.playSpell(e); break;
        case 'area': break;
        case 'chain': { const a = [...this.tile(e.from.x, e.from.y)], b = e.target != null && sc.units.get(e.target) ? sc.centerPos(e.target) : [...this.tile(e.x, e.y)]; a[1] = 0.4; au.play('zap'); await chainHop(sc, a, b, e.target); break; }
        case 'trample': this.float(e.uid, 'Trample!', 'note'); await this.wait(100); break;
        case 'spines': break;
        case 'aim': au.play(e.slam ? 'slam' : 'aim'); sc.play(e.uid, 'cast'); if (e.slam) this.float(e.uid, { root: 'Root Slam!', fire: 'Flames gather!', void: 'Erasure!' }[e.kind] || 'Danger!', 'warn'); this.scene.setDanger(e.tiles); await this.wait(260); break;
        case 'hex': { au.play('spell'); sc.play(e.uid, 'cast'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.85, 0.3, 0.9], 0.3, 0.3); break; }
        case 'harpoon': { au.play('fire'); sc.play(e.uid, 'attack'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.85, 0.9, 1], 0.2, 0.05, { size: 18 }); break; }
        case 'spit': { au.play('fire'); sc.play(e.uid, 'attack'); await sc.projectile(sc.centerPos(e.uid), sc.centerPos(e.target), [0.75, 0.4, 1], 0.25); break; }
        case 'fire': { au.play('fire'); sc.play(e.uid, 'attack'); const a = sc.centerPos(e.uid); const end = e.tiles.at(-1) || { x: 0, y: 0 }; const victim = e.tiles.map(t => this.s.units.find(u => u.x === t.x && u.y === t.y && u.uid !== e.uid && u.hp >= 0)).find(Boolean); const b = victim && sc.units.get(victim.uid) ? sc.centerPos(victim.uid) : [...this.tile(end.x, end.y)]; await sc.projectile(a, b, [0.9, 1, 0.6], 0.22, 0.15); break; }
        case 'slamHit': {
          au.play(e.kind === 'fire' ? 'fireboom' : 'slam'); if (!sc.reduced) sc.shake(0.25); sc.play(e.uid, 'attack');
          const col = e.kind === 'fire' ? [1, 0.5, 0.15] : e.kind === 'void' ? [0.75, 0.4, 1] : [0.5, 0.4, 0.25];
          for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.fx.burst([w[0], 0.1, w[2]], col, 8, { speed: 1, up: 2 }); }
          if (e.kind === 'void') for (const t of e.tiles.slice(0, 6)) { const w = this.tile(t.x, t.y); sc.addBolt({ a: [w[0], 2.5, w[2]], b: [w[0], 0, w[2]], life: 0.2, width: 0.05, col, segs: 6 }); }
          await this.wait(220); break;
        }
        case 'riftPulse': au.play('zap'); for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.addRing({ pos: [w[0], 0.04, w[2]], r0: 0.05, r1: 0.6, life: 0.4, col: [0.75, 0.4, 1], width: 0.1, spokes: 4 }); sc.fx.burst([w[0], 0.2, w[2]], [0.75, 0.4, 1], 12, { speed: 1.2, up: 2 }); } await this.wait(220); break;
        case 'terrain': {
          const C = { lava: [1, 0.5, 0.15], burn: [1, 0.6, 0.2], cool: [0.7, 0.9, 1], bramble: [0.4, 0.8, 0.3] }[e.kind] || [1, 0.5, 0.15];
          for (const t of e.tiles) { const w = this.tile(t.x, t.y); sc.fx.burst([w[0], 0.1, w[2]], C, 18, { speed: 1, up: 2.4 }); }
          this.scene.refreshTerrain(this.s, this.s.rng.s ^ 0x77); au.play(e.kind === 'cool' ? 'frost' : e.kind === 'bramble' ? 'spell' : 'fireboom');
          const hero = this.s.units.find(u => u.hero);
          if (hero) this.float(hero.uid, { lava: 'The ground melts!', burn: 'The brambles burn away', cool: 'The lava hardens', bramble: 'Briars erupt!' }[e.kind] || 'The ground shifts', e.kind === 'cool' || e.kind === 'burn' ? 'note' : 'warn');
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
          const c = e.kind === 'guard' ? [0.55, 0.8, 1] : [0.75, 0.6, 1]; sc.play(e.uid, 'cast');
          sc.addRing({ pos: [sc.units.get(e.uid).pos[0], 0.03, sc.units.get(e.uid).pos[2]], r0: 0.1, r1: 0.7, life: 0.45, col: c, width: 0.07, spokes: e.kind === 'guard' ? 6 : 3, seg: e.kind === 'guard' ? 6 : 28 });
          sc.light(sc.centerPos(e.uid), c, 2.2, 0.4, 1.4); au.play(e.kind === 'guard' ? 'block' : 'castArcane');
          this.float(e.uid, e.kind === 'guard' ? `Guard −${e.amount} per hit` : `Channel: next spell +${e.amount}`, 'note'); await this.wait(260); break;
        }
        case 'guarded': this.float(e.uid, `Guarded −${e.amount}`, 'blocked'); break;
        case 'silence': { const h = this.s.units.find(u => u.hero); if (h) this.float(h.uid, `${getCard(e.spell).name} silenced (this turn)`, 'warn'); sc.screenFlash([0.85, 0.8, 1], 0.2); au.play('spell'); await this.wait(280); break; }
        case 'redact': { sc.screenFlash([0.85, 0.8, 1], 0.25); const h = this.s.units.find(u => u.hero); if (h) this.float(h.uid, `${KEYWORDS[e.keyword].name} redacted (this turn)`, 'warn'); au.play('spell'); await this.wait(300); break; }
        case 'restored': this.float(e.uid, `${KEYWORDS[e.keyword].name} restored`, 'note'); break;
        case 'summon': { const u = this.s.units.find(x => x.uid === e.uid); if (u) { if (e.ally) await VFX.summon(sc, { to: this.tile(e.x, e.y) }); this.disp.set(u.uid, { hp: u.maxHp, maxHp: u.maxHp, shield: 0, poison: 0, stunned: 0, empowered: 0 }); this.addUnitView({ ...u, x: e.x, y: e.y }); this.renderLabel(u.uid); await sc.spawn(u.uid); } break; }
        case 'mirror': { sc.screenFlash([0.85, 0.8, 1], 0.25); this.float(e.uid, `Copies your ${KEYWORDS[e.keyword].name}!`, 'warn'); au.play('spell'); await this.wait(300); break; }
        case 'bossPhase': sc.screenFlash([0.6, 0.35, 0.15], 0.3); if (!sc.reduced) sc.shake(0.12); await this.banner(e.phase ? `Phase ${e.phase} · ${e.text}` : (e.text || 'The foe changes'), 'boss'); break;
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
    if (s.spellbook.length) H('spell', 'Spells cost mana (the gems by your health) and reach anywhere on the battlefield.');
    if (this.run.hp != null && player(s).hp < player(s).maxHp && s.turn === 1) H('wounds', 'Wounds carry between battles: a victory restores only half of your missing health. Wayshrines can mend the rest.');
  }
}
