// GRAFTBOUND app controller: loading -> screens <-> run lifecycle <-> battle UI <-> saves. No game rules here.
import { Scene } from './rendering/scene.js';
import { loadAssets } from './rendering/sprites.js';
import { composePlayerSheet } from './rendering/evolution-visuals.js';
import { Audio } from './audio/audio.js';
import { BattleUI } from './ui/battle-ui.js';
import * as UI from './ui/screens.js';
import { esc, COLOR } from './ui/cards.js';
import { createStore } from './engine/save.js';
import { newRun, enterNode, concludeBattle, chooseReward, skipReward, shrineChoice, eventChoice } from './engine/run.js';
import { startRanked, replayRun, verifiedAchievements } from './engine/ranked.js';
import { expeditionTotals } from './engine/scoring.js';
import { evaluateAchievements, recordRunEnd } from './engine/progression.js';
import { deriveAppearance } from './engine/appearance.js';
import { newEvolution } from './engine/evolution.js';
import { hashSeed } from './core/rng.js';
import { resolveCard as getCard } from './cards/catalog.js';
import { keywordLabel } from './data/keywords.js';
import { ACTS } from './data/encounters.js';
import { distanceField } from './core/grid.js';
import { ICON } from './ui/icons.js';
import { installReferenceSet } from './cards/reference-set.js';
import { createLiveCards } from './cards/live.js';
import { CONFIG, GAME } from './config.js';

installReferenceSet(); // bundled + rules-checked; must exist before saves that contain real cards are validated

const $ = id => document.getElementById(id);
const TRAIT_TEXT = { wings: 'Grew wings', shell: 'Grew a shell', spikes: 'Sprouted spines', horns: 'Grew horns', antlers: 'Grew antlers', crown: 'Crowned', tail: 'Grew a tail', armor: 'Plated in armor',
  blades: 'Grew blade-arms', claws: 'Grew claws', tusks: 'Grew tusks', beak: 'Grew a beak', venom: 'Venom spots', aura: 'Wreathed in an aura', eyes: 'Opened new eyes', moss: 'Mossed over', tendrils: 'Grew tendrils' };
const TRAIT_FX = {
  wings: { n: 40, col: [1, 0.97, 0.88], r: 0.3, y: 0.3, out: 1.6, up: 2.2, size: 12, life: 1.1, grav: -1.5 }, venom: { n: 30, col: [0.75, 0.4, 1], r: 0.25, y: 0.2, out: 0.4, up: 0.3, size: 11, life: 1.2, grav: -3 },
  armor: { n: 34, col: [0.8, 0.9, 1], r: 0.3, y: 0, out: 2.4, up: 1.4, size: 8, life: 0.5, grav: -6 }, horns: { n: 24, col: [1, 0.9, 0.6], r: 0.15, y: 0.5, out: 0.8, up: 2.6, size: 9, life: 0.8, grav: -3 },
  aura: { n: 50, col: [1, 0.9, 0.5], r: 0.5, y: -0.1, out: 0.2, up: 1.2, size: 10, life: 1.4, grav: 0 }, moss: { n: 26, col: [0.5, 1, 0.4], r: 0.3, y: 0.3, out: 0.6, up: 0.8, size: 9, life: 1.2, grav: -1 },
  claws: { n: 20, col: [1, 0.8, 0.5], r: 0.3, y: 0, out: 2, up: 1, size: 8, life: 0.5, grav: -5 }, blades: { n: 24, col: [0.6, 1, 0.95], r: 0.3, y: 0.1, out: 2.2, up: 1, size: 8, life: 0.5, grav: -5 },
  tail: { n: 18, col: [1, 0.6, 0.3], r: 0.4, y: 0, out: 0.8, up: 0.8, size: 9, life: 0.8, grav: -2 }, tendrils: { n: 24, col: [1, 0.35, 0.35], r: 0.25, y: -0.1, out: 0.5, up: 0.2, size: 9, life: 1, grav: -2 },
  eyes: { n: 20, col: [0.5, 1, 0.95], r: 0.2, y: 0.4, out: 0.6, up: 0.6, size: 10, life: 1, grav: 0 }, crown: { n: 30, col: [1, 0.85, 0.4], r: 0.2, y: 0.7, out: 0.8, up: 1.6, size: 10, life: 1, grav: -2 },
};
const SPELL_COL = { ember: [1, 0.55, 0.2], verdant: [0.5, 1, 0.4], tide: [0.4, 0.8, 1], umbral: [0.75, 0.45, 1], radiant: [1, 0.9, 0.5] };

class App {
  async init() {
    document.title = `${GAME.title} — ${GAME.tagline}`;
    let storage; try { storage = window.localStorage; storage.setItem('__lc', '1'); storage.removeItem('__lc'); } catch { storage = null; }
    this.storage = storage;
    this.store = createStore(storage || { getItem: () => null, setItem() {}, removeItem() {} });
    this.meta = this.store.loadMeta();
    const loaded = this.store.loadRun(); this.run = loaded.run; this.loadInfo = loaded;
    this.audio = new Audio();
    this.live = CONFIG.LIVE_SCRYFALL && new URLSearchParams(location.search).get('live') !== '0' ? createLiveCards({ storage }) : null;
    try { this.assets = await loadAssets(p => { $('loadbar').style.width = Math.round(p * 100) + '%'; }); }
    catch (err) { $('loading').innerHTML = `<p>Could not load game art: ${esc(err.message)}</p>`; throw err; }
    try { this.scene = new Scene($('gl'), this.assets); } catch (err) { $('loading').hidden = true; $('nogl').hidden = false; throw err; }
    this.scene.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('loading').classList.add('done'); setTimeout(() => ($('loading').hidden = true), 600);
    this.applySettings();
    this.battle = new BattleUI(this);
    this.mode = 'title'; this.fpsS = [];
    this.bindGlobal();
    let last = performance.now();
    const loop = now => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
      if (this.mode === 'title' || this.mode === 'intro') this.scene.yawTarget += dt * 0.1;
      this.scene.frame(dt); this.battle.frame(); this.autoQuality(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    this.toTitle();
    if (loaded.recovered) this.toast('Your latest save could not be read, so the previous good save was restored.');
    else if (loaded.error) this.toast('Your saved adventure could not be read and was set aside (a copy was kept).');
    else if (loaded.migrated) this.toast(`<b>Adventure updated</b><small>Your v0.4 adventure continues in GRAFTBOUND v${GAME.version}. Cards you already earned are kept exactly as they were.</small>`);
  }
  save() { this.store.saveRun(this.run); }
  saveMeta() { this.store.saveMeta(this.meta); }
  animFactor() { const f = new URLSearchParams(location.search).get('anim'); return { normal: 1, fast: 2.2, instant: 100 }[f || this.meta.settings.animSpeed] || 1; }
  pickQuality() {
    const forced = new URLSearchParams(location.search).get('gfx'); if (['high', 'balanced', 'performance'].includes(forced)) return forced;
    const g = this.meta.settings.graphics; if (g !== 'auto') return g;
    const coarse = matchMedia('(pointer: coarse)').matches, small = Math.min(innerWidth, innerHeight) < 600;
    return coarse || small || (navigator.deviceMemory && navigator.deviceMemory < 4) ? 'balanced' : 'high';
  }
  applySettings() {
    this.audio.setSfx(this.meta.settings.sound); this.audio.setMusic(this.meta.settings.music);
    if (this.scene) { this.scene.setQuality(this.autoDowngraded || this.pickQuality()); this.scene.speed = this.animFactor(); this.scene.ambientOn = this.meta.settings.ambient !== false; }
  }
  /** Ranked replay recorder: called only AFTER the engine accepted a decision. Adventure runs record nothing. */
  record(d) {
    const r = this.run; if (!r || !r.ranked) return;
    const clean = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined));
    (r.ranked.log = r.ranked.log || []).push({ seq: r.ranked.seq, ...clean }); r.ranked.seq++;
  }
  recordKey(run = this.run) { return run && run.ranked ? `ranked:${run.ranked.challengeId}:${run.ranked.revision}:${run.ranked.rulesVersion}` : 'adventure:v0.6'; }
  /** LOCAL personal records only (never uploaded). Returns whether this is a new best. */
  saveRecords(run) {
    const t = expeditionTotals(run); const k = this.recordKey(run); const recs = this.meta.records = this.meta.records || {};
    const r = recs[k] = recs[k] || { label: run.ranked ? `Ranked preview · ${run.ranked.challengeId}` : 'Adventure (v0.6 scoring)', completions: 0 };
    const better = !r.best || t.total > r.best.total || (t.total === r.best.total && t.actions < r.best.actions);
    if (better) r.best = { total: t.total, actions: t.actions, damage: t.damage, turns: t.turns, acts: t.actsCompleted, completed: t.completed };
    if (t.completed) { r.completions++; r.lowestDamage = r.lowestDamage == null ? t.damage : Math.min(r.lowestDamage, t.damage); }
    const enc = (run.scoring ? run.scoring.encounters : []).filter(e => e.total > 0);
    if (enc.length) r.fewestActions = Math.min(r.fewestActions ?? Infinity, ...enc.map(e => e.actions));
    this.saveMeta(); return better && t.total > 0;
  }
  autoQuality(dt) {
    if (this.meta.settings.graphics !== 'auto' || !dt) return;
    this.fpsS.push(dt); if (this.fpsS.length < 120) return;
    const avg = this.fpsS.reduce((a, b) => a + b, 0) / this.fpsS.length; this.fpsS = [];
    const order = ['high', 'balanced', 'performance'], cur = this.scene.r.qName;
    if (1 / avg < 32 && cur !== 'performance') { this.autoDowngraded = order[order.indexOf(cur) + 1]; this.scene.setQuality(this.autoDowngraded); }
  }
  wipe() { for (const k of Object.keys(localStorage)) if (k.startsWith('deepcutsedh.livingcard.')) localStorage.removeItem(k); location.reload(); }
  bindGlobal() {
    $('btn-rotl').innerHTML = ICON.rotL; $('btn-rotr').innerHTML = ICON.rotR; $('btn-sheet').innerHTML = ICON.book; $('btn-menu').innerHTML = ICON.menu;
    $('btn-rotl').addEventListener('click', () => this.scene.rotate(-1));
    $('btn-rotr').addEventListener('click', () => this.scene.rotate(1));
    $('btn-sheet').addEventListener('click', () => this.openSheet());
    $('btn-sound').addEventListener('click', () => { const on = !(this.meta.settings.sound || this.meta.settings.music); this.meta.settings.sound = this.meta.settings.music = on; this.applySettings(); this.saveMeta(); this.syncSoundBtn(); });
    $('btn-menu').addEventListener('click', () => this.pauseMenu());
    this.syncSoundBtn();
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) this.closeModal(); });
    $('hint').addEventListener('click', () => $('hint').classList.remove('show'));
    $('bigtext').addEventListener('click', () => { if (this.skipAbsorb) this.skipAbsorb(); });
    document.addEventListener('pointerdown', () => this.audio.unlock());
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'escape' && this.modalOpen()) { this.closeModal(); return; }
      if (this.skipAbsorb && (k === ' ' || k === 'enter' || k === 'escape')) { e.preventDefault(); this.skipAbsorb(); return; }
      if (this.modalOpen() || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (k === 'q') this.scene.rotate(-1); else if (k === 'e') this.scene.rotate(1);
      else if (k === 'c' && this.run) this.openSheet();
      else if (k === 'm') $('btn-sound').click();
    });
    const tip = $('tip');
    const showTip = el => { const r = el.getBoundingClientRect(); tip.textContent = el.dataset.tip; tip.classList.add('show'); tip.style.left = Math.min(innerWidth - 250, Math.max(8, r.left)) + 'px'; tip.style.top = (r.bottom + 6) + 'px'; };
    document.addEventListener('pointerover', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); else tip.classList.remove('show'); });
    document.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  }
  syncSoundBtn() { const on = this.meta.settings.sound || this.meta.settings.music; $('btn-sound').innerHTML = on ? ICON.sound : ICON.mute; $('btn-sound').setAttribute('aria-label', on ? 'Mute' : 'Unmute'); }
  modalOpen() { return $('modal').classList.contains('show'); }
  openModal(html, cls = '') { const m = $('modal'); m.innerHTML = `<div class="modal-box ${cls}" role="dialog" aria-modal="true">${html}</div>`; m.classList.add('show'); const f = m.querySelector('button.primary, button'); if (f) f.focus({ preventScroll: true }); return m.firstElementChild; }
  closeModal() { $('modal').classList.remove('show'); $('modal').innerHTML = ''; }
  confirm(text, yes, fn) { const m = this.openModal(`<p class="confirm">${esc(text)}</p><div class="modal-actions"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn danger" data-yes>${esc(yes)}</button></div>`); m.querySelector('[data-yes]').addEventListener('click', () => { this.closeModal(); fn(); }); }
  toast(html, kind = '') { const t = $('toast'); t.innerHTML = html; t.className = 'toast ' + kind; void t.offsetWidth; t.classList.add('show'); }
  status(text) { $('status').textContent = text; $('status').classList.toggle('show', !!text); }
  hint(id, text) {
    if (this.meta.hints[id]) return; this.meta.hints[id] = 1; this.saveMeta();
    const h = $('hint'); h.innerHTML = `<span>${esc(text)}</span><small>tap to dismiss</small>`; h.classList.remove('show'); void h.offsetWidth; h.classList.add('show');
    clearTimeout(this.hintT); this.hintT = setTimeout(() => h.classList.remove('show'), 9000);
  }
  achievementsToast(list) { list.forEach((a, i) => setTimeout(() => { this.audio.play('achievement'); this.toast(`<b>Achievement</b> ${esc(a.name)}<small>${esc(a.text)}</small>`); }, i * 2200)); }
  openSheet() { if (this.run) UI.sheetModal(this); }
  pauseMenu() {
    const inRun = !!this.run;
    const m = this.openModal(`<small class="sh-brand">${GAME.title}</small><h2>Paused</h2><div class="menu">
      <button type="button" class="btn primary" data-close>Resume</button>
      ${inRun ? '<button type="button" class="btn" data-a="sheet">Character Sheet &amp; Spellbook</button><button type="button" class="btn" data-a="journal">Evolution Journal</button>' : ''}
      <button type="button" class="btn" data-a="settings">Settings</button>
      ${inRun ? '<button type="button" class="btn" data-a="quit">Save &amp; Return to Title</button><button type="button" class="btn danger" data-a="abandon">Abandon Adventure</button>' : ''}</div>`);
    m.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'sheet') { this.closeModal(); this.openSheet(); }
      if (a.dataset.a === 'journal') { this.closeModal(); UI.journalModal(this); }
      if (a.dataset.a === 'settings') { this.closeModal(); UI.settingsModal(this); }
      if (a.dataset.a === 'quit') { this.closeModal(); this.save(); this.toTitle(); }
      if (a.dataset.a === 'abandon') this.confirm('Abandon this adventure? It will count as a loss.', 'Abandon', () => this.endRun(false));
    });
  }
  setMode(mode) { document.body.dataset.mode = mode; this.mode = mode; }
  showcase(theme) {
    const evo = this.run ? this.run.evo : newEvolution();
    const fake = { w: 8, h: 8, terrain: new Array(64).fill(0).map((_, i) => ([9, 14, 50, 53].includes(i) ? 3 : [19, 44].includes(i) ? 1 : 0)) };
    this.battle.stop(); this.scene.loadArena(fake, 7, theme || (this.run ? ACTS[this.run.act].theme : 'hollow')); this.audio.setAct(this.run ? this.run.act : 0);
    const ap = deriveAppearance(evo);
    const v = this.scene.addUnit({ uid: 1, side: 'player', x: 3, y: 4 }, 'blank'); this.scene.setUnitTexture(1, composePlayerSheet(this.assets, ap), ap.size);
    v.pos[0] += 0.5; v.dir = [0.3, 1]; v.aura = ap.effects.includes('aura') ? ap.glow : null;
    this.scene.zoom = 1.75; this.scene.focusTarget = [0.5, 0.2, 0.5]; this.scene.dof = 1.4;
  }
  toTitle() { this.setMode('title'); this.showcase(); UI.titleScreen(this); }
  async newRanked() {
    if (this.run) { recordRunEnd(this.meta, this.run, false); this.saveMeta(); }
    this.run = startRanked(); this.run.ranked.log = []; this.earnedThisRun = []; this.save();
    this.toast('<b>Ranked preview</b><small>Same seed and rules for everyone. Local and unranked in the Game Lab.</small>');
    this.goMap();
  }
  async newRun(challenges = []) {
    if (this.run) { recordRunEnd(this.meta, this.run, false); this.saveMeta(); }
    this.run = newRun({ seed: hashSeed(Date.now() + ':' + Math.random()), unlocks: this.meta.unlocks, challenges, tutorial: !this.meta.tutorialDone });
    this.earnedThisRun = []; this.save();
    this.setMode('intro'); this.showcase('hollow'); this.scene.zoom = 2.4; this.scene.focusTarget = [0.5, 0.3, 0.5];
    await UI.introScreen(this, { first: !this.meta.introSeen });
    if (!this.meta.introSeen) { this.meta.introSeen = true; this.saveMeta(); }
    this.goMap();
  }
  resume() {
    const r = this.run; if (!r) return this.toTitle();
    this.earnedThisRun = this.earnedThisRun || [];
    if (r.phase === 'battle') return this.runBattle(false);
    if (r.phase === 'reward') return this.reward();
    if (r.phase === 'shrine') return this.shrine();
    if (r.phase === 'event') return this.event();
    if (r.phase === 'won' || r.phase === 'lost') return this.endRun(r.phase === 'won');
    this.goMap();
  }
  async goMap() {
    if (this.run.actIntro) {
      this.setMode('intro'); this.showcase(); this.scene.zoom = 2.2;
      await UI.actScreen(this, this.run.actIntro); delete this.run.actIntro; this.save();
    }
    this.setMode('map'); this.showcase(); this.scene.zoom = 1.9; this.scene.focusTarget = [1.4, 0.3, 0.5];
    const id = await UI.mapScreen(this);
    enterNode(this.run, id); this.record({ type: 'node', node: id }); this.save();
    if (this.run.phase === 'shrine') return this.shrine();
    if (this.run.phase === 'event') return this.event();
    return this.runBattle(true);
  }
  async shrine() {
    this.setMode('map');
    const { choice, arg } = await UI.shrineScreen(this);
    let res; try { res = shrineChoice(this.run, choice, arg); } catch (err) { this.toast(`<b>Can't</b> ${esc(err.message)}`, 'short'); return this.shrine(); }
    this.record({ type: 'shrine', choice, arg }); this.save();
    const msg = { restoration: '<b>Restored</b><small>All wounds mended; 3 shield next battle</small>', spark: '<b>+3 Spark</b><small>Maximum health increased</small>', arcane: '<b>Arcane Font</b><small>+1 maximum mana</small>', inscribe: `<b>Inscribed</b><small>${res.cardId ? esc(getCard(res.cardId).name) + ' is now level ' + res.level : ''}</small>` }[res.kind];
    if (msg) { this.toast(msg); this.audio.play('heal'); return this.goMap(); }
    return this.reward();
  }
  async event() {
    this.setMode('map');
    const { choice, arg } = await UI.eventScreen(this);
    let res; try { res = eventChoice(this.run, choice, arg); } catch (err) { this.closeModal(); this.toast(`<b>Can't</b> ${esc(err.message)}`, 'short'); return this.event(); }
    this.closeModal(); this.record({ type: 'event', choice, arg }); this.save();
    const msg = { leave: '<b>You walk on</b>', well: '<b>The well takes its price</b><small>−3 Spark · +1 maximum and starting mana</small>' }[res.kind];
    if (msg) this.toast(msg);
    if (this.run.phase === 'reward') return this.reward();
    return this.goMap();
  }
  async runBattle(fresh) {
    UI.hideScreen(); this.setMode('battle');
    await this.battle.start(this.run, this.run.battle, { fresh });
    const attacks = this.run.battle.stats.attacks; const act = this.run.act;
    const out = concludeBattle(this.run);
    const entry = this.run.scoring && this.run.scoring.encounters.at(-1);
    if (out.outcome === 'lost') { this.save(); await new Promise(r => setTimeout(r, 600)); return this.endRun(false); }
    if (entry && entry.key === act + ':' + this.run.current) { this.setMode('reward'); await UI.encounterResultScreen(this, entry, { verifiedNote: this.run.ranked ? 'RANKED PREVIEW · PROVISIONAL · UNSUBMITTED' : 'LOCAL · PROVISIONAL' }); }
    if (this.run.lastBattle.nodeType === 'tutorial') this.meta.tutorialDone = true;
    this.collect(evaluateAchievements(this.meta, { event: out.boss ? 'bossDown' : 'battleWon', act, elite: out.elite, battleStats: out.battleStats, attacks, run: this.run, evo: this.run.evo }));
    if (out.boss) this.collect(evaluateAchievements(this.meta, { event: 'battleWon', elite: false, battleStats: out.battleStats, attacks, run: this.run, evo: this.run.evo }));
    this.saveMeta(); this.save();
    return this.reward();
  }
  collect(earned) { if (earned.length) { this.earnedThisRun.push(...earned); this.achievementsToast(earned); } }
  async reward() {
    this.setMode('reward');
    const heroView = [...this.scene.units.values()].find(u => u.side === 'player' && u.key === 'blank');
    if (!heroView) this.showcase(); else { this.scene.focusTarget = [heroView.pos[0], 0.3, heroView.pos[2]]; this.scene.zoom = 1.6; }
    this.scene.dof = 1.6;
    if (!this.run.pending.cards.length) { this.run.pending = null; this.run.phase = 'map'; this.save(); return this.goMap(); }
    if (this.run.phase === 'won') return this.endRun(true);
    const { choice, rect, release } = await UI.rewardScreen(this, this.run.pending.cards, { tier: this.run.pending.tier, severed: this.run.pending.severed });
    if (choice === 'skip') { skipReward(this.run); this.record({ type: 'skip' }); this.save(); this.toast('<b>+1 Spark</b>'); }
    else {
      const evoBefore = this.run.evo; let change;
      try { change = chooseReward(this.run, choice, release); } catch (err) { this.toast(`<b>Can't</b> ${esc(err.message)}`, 'short'); return this.reward(); }
      this.record({ type: 'reward', card: choice, release }); this.save();
      await this.absorbSequence(choice, change, rect, evoBefore);
      this.collect(evaluateAchievements(this.meta, { event: 'evolve', run: this.run, evo: this.run.evo })); this.saveMeta();
    }
    if (this.run.phase === 'won') return this.endRun(true);
    return this.goMap();
  }
  newTraits(evoBefore) {
    const vis = ap => new Set([...Object.values(ap.slots).map(p => p.part + (p.tier > 1 ? '+' : '')), ...ap.effects]);
    const a = vis(deriveAppearance(evoBefore)), b = vis(deriveAppearance(this.run.evo));
    return [...b].filter(x => !a.has(x));
  }
  traitLine(evoBefore) {
    const t = this.newTraits(evoBefore); if (!t.length) return '';
    return `<div class="bt-form">${t.map(x => TRAIT_TEXT[x.replace('+', '')] ? (x.endsWith('+') ? 'Its ' + x.replace('+', '') + ' grow' : TRAIT_TEXT[x]) : '').filter(Boolean).map(esc).join(' · ')}</div>`;
  }
  traitFx(uid, evoBefore) {
    const sc = this.scene, c = sc.centerPos(uid), r = Math.random;
    for (const t of this.newTraits(evoBefore).map(x => x.replace('+', ''))) {
      const fx = TRAIT_FX[t]; if (!fx) continue;
      for (let i = 0; i < fx.n; i++) { const a = r() * 6.283; sc.fx.emit({ pos: [c[0] + Math.cos(a) * fx.r, c[1] + fx.y + r() * 0.3, c[2] + Math.sin(a) * fx.r], vel: [Math.cos(a) * fx.out, fx.up * (0.5 + r()), Math.sin(a) * fx.out], col: [...fx.col, 1], size: fx.size * (0.6 + r() * 0.6), life: fx.life * (0.7 + r() * 0.6), grav: fx.grav, drag: 1.2 }, true); }
      sc.light(c, fx.col, 3, 1, 1.6);
    }
  }
  /** Transformation: card flies into the creature, light swirls, sprite is recomposed and grows. Tap/Space to skip. */
  async absorbSequence(cardId, change, rect, evoBefore) {
    const sc = this.scene, card = getCard(cardId), k = this.animFactor();
    let v = [...sc.units.values()].find(u => u.side === 'player' && u.key === 'blank');
    if (!v) { this.showcase(); v = sc.units.get(1); }
    const uid = v.uid; sc.zoom = 2.3; sc.focusTarget = [v.pos[0], 0.35, v.pos[2]]; v.dir = [0.3, 1];
    let skipped = false; const waitS = ms => new Promise(r => { const t = setTimeout(r, ms / k); this._skipT = () => { clearTimeout(t); r(); }; });
    this.skipAbsorb = () => { skipped = true; if (this._skipT) this._skipT(); };
    const slot = document.querySelector(`.slot[data-id="${CSS.escape(cardId)}"] .lc-card`);
    const flyer = slot && k < 50 ? slot.cloneNode(true) : null;
    UI.hideScreen(); $('bigtext').classList.add('skippable');
    if (!skipped) await waitS(250);
    if (flyer && rect && !skipped) {
      flyer.classList.add('flyer'); Object.assign(flyer.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
      document.body.appendChild(flyer); void flyer.offsetWidth;
      const p = sc.project(sc.centerPos(uid));
      Object.assign(flyer.style, { transform: `translate(${p.x - rect.left - rect.width / 2}px, ${p.y - rect.top - rect.height / 2}px) scale(.06) rotate(540deg)`, opacity: '0.2' });
      await waitS(650); flyer.remove();
    }
    const col = SPELL_COL[card.color] || [1, 0.85, 0.5];
    this.audio.play('absorb'); v.outline = 1; sc.play(uid, 'cast');
    sc.fx.swirl(sc.centerPos(uid), () => sc.centerPos(uid), col, card.kind === 'creature' ? 150 : 70, 1.3 / Math.min(k, 3));
    sc.addRing({ pos: [v.pos[0], 0.03, v.pos[2]], r0: 1.4, r1: 0.2, life: 0.9 / Math.min(k, 3), col, width: 0.06, spokes: 8, spin: 2 });
    sc.light(sc.centerPos(uid), col, 3.5, 1.6 / Math.min(k, 3), 2);
    if (!skipped) await waitS(card.kind === 'creature' ? 900 : 550);
    if (card.kind === 'creature') {
      const ap = deriveAppearance(this.run.evo); const s0 = v.scale;
      sc.setUnitTexture(uid, composePlayerSheet(this.assets, ap)); v.aura = ap.effects.includes('aura') ? ap.glow : null;
      v.flash = 1; if (!sc.reduced) sc.shake(0.15); sc.screenFlash([1, 0.95, 0.8], 0.45);
      sc.tween(0.5, t => { v.scale = s0 + (ap.size - s0) * (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI) * 0.15; });
      sc.fx.burst(sc.centerPos(uid), col, 80, { speed: 3, up: 2.5, size: 16 }); sc.fx.burst(sc.centerPos(uid), [1, 0.95, 0.7], 40, { speed: 1.6, up: 3, size: 10 });
      this.traitFx(uid, evoBefore);
      const kws = [...change.gained, ...change.raised].map(kw => keywordLabel(kw, this.run.evo.keywords[kw]));
      this.bigText(`<div class="bt-pt">${evoBefore.power}/${evoBefore.toughness} <i>→</i> <b>${this.run.evo.power}/${this.run.evo.toughness}</b></div>${kws.length ? `<div class="bt-kw">${esc(kws.join(' · '))}</div>` : ''}${change.resonance ? `<div class="bt-res">Resonance +${change.resonance * 2} Spark</div>` : ''}${change.released ? `<div class="bt-src">${esc(change.released)} was released</div>` : ''}${this.traitLine(evoBefore)}<div class="bt-src">${esc(card.name)} is grafted to you · recorded in your Journal</div><small class="bt-skip">tap to continue</small>`, COLOR[card.color].glow);
    } else {
      v.flash = 0.6; sc.fx.burst(sc.centerPos(uid), col, 40, { speed: 2, up: 2 });
      this.bigText(`<div class="bt-kw">${esc(change.kind === 'empower' ? `${card.name} · Level ${change.level}` : card.name)}</div><div class="bt-src">${change.kind === 'empower' ? 'Spell empowered' : 'Inscribed in your spellbook'}</div><small class="bt-skip">tap to continue</small>`, COLOR[card.color].glow);
    }
    if (!skipped) await waitS(2100);
    $('bigtext').classList.remove('show', 'skippable'); this.skipAbsorb = null; v.outline = 0;
    sc.zoom = 1; sc.focusTarget = [0, 0, 0];
  }
  bigText(html, glow) { const b = $('bigtext'); b.style.setProperty('--glow', glow); b.innerHTML = html; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  async endRun(won) {
    const run = this.run; this.battle.stop();
    recordRunEnd(this.meta, run, won);
    this.collect(won ? evaluateAchievements(this.meta, { event: 'runWon', run, evo: run.evo }) : []);
    const extra = { newBest: this.saveRecords(run) };
    if (run.ranked) {   // re-run the recorded decisions from the challenge definition, exactly as a server would
      try { const r = replayRun(run.ranked.challengeId, run.ranked.log || [], { revision: run.ranked.revision }); extra.verifiedLocally = r.totals.total === expeditionTotals(run).total && r.run.phase === run.phase; extra.achievements = verifiedAchievements(r.run); }
      catch (err) { extra.verifiedLocally = false; extra.verifyError = String(err.message || err); console.warn('Local replay verification failed:', err); }
    }
    this.meta.tutorialDone = true; this.saveMeta();
    this.setMode('end'); this.showcase();
    const all = (this.earnedThisRun || []).slice();
    this.store.saveRun(null);
    const a = await UI.endScreen(this, { won, earned: all, extra });
    this.run = null;
    if (a === 'again') this.newRun([]); else this.toTitle();
  }
}
const app = new App();
window.__LC = app; // used by browser tests only
app.debug = { distanceField, card: id => getCard(id), heroSheetHash() { const c = composePlayerSheet(app.assets, deriveAppearance(app.run ? app.run.evo : newEvolution())); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0; return h; } };
export default app;
app.init();
