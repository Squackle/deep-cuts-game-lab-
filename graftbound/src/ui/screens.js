// Menu, intro, act interludes, map, booster, Wayshrine, sheet, settings and summary screens (DOM).
import { RARITY } from '../data/cards.js';
import { resolveCard as getCard, rewardCards } from '../cards/catalog.js';
import { KEYWORDS, keywordLabel } from '../data/keywords.js';
import { cardHTML, COLOR, esc, sourcePanelHTML, backHTML } from './cards.js';
import { availableNodes, nodeById, NODE_TYPES } from '../engine/campaign.js';
import { absorb, deriveStats } from '../engine/evolution.js';
import { runStats, CHALLENGES, graftCapacity, graftsFull, woundsOf, maxHpOf } from '../engine/run.js';
import { SHRINES } from '../engine/shrines.js';
import { ACTS, bossNameOf } from '../data/encounters.js';
import { bossForSeed } from '../data/legendary.js';
import { deriveAppearance } from '../engine/appearance.js';
import { ACHIEVEMENTS } from '../engine/progression.js';
import { formatSpellText, rangeLabel } from '../engine/spells.js';
import { rarityWeights } from '../engine/rewards.js';
import { GAME } from '../config.js';
import { kwChips, STAGE } from './battle-ui.js';
import { ICON } from './icons.js';
import { EVENTS, eventChoices, EVENT_COST } from '../engine/events.js';
import { expeditionTotals } from '../engine/scoring.js';
import { SCORE } from '../data/scoring.js';
import { graftHistory } from '../engine/journal.js';
import { composePlayerSheet } from '../rendering/evolution-visuals.js';
import { composeEquippedSheet } from '../rendering/equipment-visuals.js';
import { equipItem } from '../engine/attachments.js';
import { newEvolution } from '../engine/evolution.js';
import { setSpellEquipped, handCapacity, normalizedEquipped } from '../engine/loadout.js';
import { RANKED_CHALLENGES, ACTIVE_CHALLENGE } from '../engine/ranked.js';
import { NODE_TYPES as NT } from '../engine/campaign.js';
import { formatDuration } from '../engine/clock.js';
import { packIdentity, packOrnament } from './pack-opening.js';

const $ = id => document.getElementById(id);
const TARGET = { enemy: 'One foe, anywhere', ally: 'Friendly creature, anywhere', self: 'Yourself', tile: 'Any tile (area)', empty: 'Empty tile' };
const LOGO = `<h1 class="logo" aria-label="${GAME.title}"><span class="logo-sigil">${ICON.sigil}</span><span class="logo-word">GRAFT<b>BOUND</b></span></h1>`;
const ACT_ROMAN = ['I', 'II', 'III'];
const ACT_LORE = [
  'In the Forgotten Hollow, every creature that falls leaves its shape behind.',
  'Below the Hollow the roots burn. The Ashen Warrens are a furnace where the Pyre Matron hatches her kin in lava.',
  'Past the furnace, the world was never finished. In the Fractured Nexus, a final legendary guardian stands between you and the last graft.',
];
const NODE_TIP = { battle: 'Skirmish: a normal battle, then a booster of 3 real cards. Scored.', tutorial: 'Your first battle. Scored.', elite: 'Elite Lair: harder foes, a stronger booster, ×1.25 score.',
  shrine: 'Wayshrine: one offering, no battle. Not scored.', event: 'Mystery: a special encounter with an explicit choice. Not scored.', boss: 'Act boss: multi-phase fight, full heal after, ×1.5 score.' };
export function showScreen(html, cls = '') { const el = $('screen'); el.className = 'screen show ' + cls; el.innerHTML = html; return el; }
export function hideScreen() { const el = $('screen'); el.className = 'screen'; el.innerHTML = ''; }

export function titleScreen(app) {
  const { meta } = app; const hasRun = !!app.run;
  const el = showScreen(`
    <div class="title-wrap">
      <a class="lab-home-link" href="/lab/" aria-label="Back to Game Lab home">← Back to Game Lab</a>
      <small class="presents">Deep Cuts EDH presents</small>
      ${LOGO}
      <p class="tagline">${GAME.tagline}</p>
      <nav class="menu">
        ${hasRun ? `<button type="button" class="btn primary" data-a="continue">Continue Adventure${app.run.act ? ` <small>· Act ${ACT_ROMAN[app.run.act]}</small>` : ''}</button>` : ''}
        <button type="button" class="btn ${hasRun ? '' : 'primary'}" data-a="new">${hasRun ? 'Begin a New Adventure' : 'Begin Adventure'}</button>
        <button type="button" class="btn" data-a="ranked">Ranked Expedition <small>· preview</small></button>
        <button type="button" class="btn" data-a="challenges">Challenges${meta.unlocks.firstVictory ? '' : ' <small>· locked</small>'}</button>
        <div class="menu-row"><button type="button" class="btn small" data-a="codex">Codex</button><button type="button" class="btn small" data-a="ach">Achievements</button><button type="button" class="btn small" data-a="stats">Records</button><button type="button" class="btn small" data-a="settings">Settings</button></div>
      </nav>
      <p class="fine">Rewards are real Magic: The Gathering cards (data via Scryfall), adapted to GRAFTBOUND's own rules. ${GAME.title} is unofficial fan content — not approved or endorsed by Wizards of the Coast. v${GAME.version}</p>
    </div>`, 'title');
  el.querySelector('.menu').addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return; app.audio.unlock(); app.audio.play('click');
    ({ ranked: () => rankedModal(app), continue: () => app.resume(), new: () => (hasRun ? app.confirm('Abandon your current adventure? It will count as a loss.', 'Abandon', () => app.newRun([])) : app.newRun([])), challenges: () => challengesModal(app), codex: () => codexModal(app), ach: () => achievementsModal(app), stats: () => statsModal(app), settings: () => settingsModal(app) })[a.dataset.a]();
  });
}
function revealLines(el, app) {
  const step = app.animFactor() > 1.5 ? 90 : 850;
  return [...el.querySelectorAll('.intro-text p')].map(p => setTimeout(() => p.classList.remove('pending'), 250 + (+p.dataset.d) * step));
}
function waitGo(el, timers) {
  return new Promise(res => {
    const go = () => { timers.forEach(clearTimeout); window.removeEventListener('keydown', key); res(); };
    const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); go(); } };
    window.addEventListener('keydown', key); el.querySelector('[data-go]').addEventListener('click', go);
  });
}
export function introScreen(app, { first }) {
  const lines = first ? [ACT_LORE[0], 'You are <b>The Blank</b> — a 1/1 scrap of living parchment. No claws. No wings. No name.',
    'Win a battle and three real cards are offered. <b>Graft</b> a creature into yourself and take its strength and gifts. Inscribe a spell and it is yours to cast.',
    'Three acts lie ahead. Your body can hold only so many grafts — choose what you become.', 'Begin as nothing.'] : ['The Hollow stirs. A new Blank wakes in the moss.'];
  const el = showScreen(`<div class="intro ${first ? 'first' : ''}">${LOGO}
      <div class="intro-text">${lines.map((l, i) => `<p class="pending" data-d="${i}">${l}</p>`).join('')}<p class="intro-last pending" data-d="${lines.length}">${first ? 'Become everything.' : GAME.tagline}</p></div>
      <div class="intro-pt"><span>1/1</span><small>The Blank · no abilities · empty spellbook</small></div>
      <button type="button" class="btn primary big" data-go>Enter the Hollow</button></div>`, 'introscr' + (app.animFactor() > 1.5 ? ' fast' : ''));
  app.audio.play('intro');
  return waitGo(el, revealLines(el, app));
}
export function actScreen(app, act) {
  const A = ACTS[act]; const run = app.run;
  const el = showScreen(`<div class="intro act act-${A.theme}">
      <small class="presents">Act ${ACT_ROMAN[act]}</small><h1 class="act-title">${esc(A.name)}</h1>
      <div class="intro-text"><p class="pending" data-d="0">${ACT_LORE[act]}</p><p class="pending" data-d="1">Your graft capacity grows to <b>${graftCapacity(run)}</b>. The wounds of the last act are mended.</p><p class="intro-last pending" data-d="2">${esc(A.bossName)} awaits.</p></div>
      <div class="intro-pt"><span>${run.evo.power}/${run.evo.toughness}</span><small>${run.evo.absorbed.length} grafts · ${run.spellbook.length} spells</small></div>
      <button type="button" class="btn primary big" data-go>Descend</button></div>`, 'introscr actscr' + (app.animFactor() > 1.5 ? ' fast' : ''));
  app.audio.play('intro');
  return waitGo(el, revealLines(el, app));
}
function challengesModal(app) {
  const unlocked = !!app.meta.unlocks.firstVictory;
  const m = app.openModal(`<h2>Challenges</h2>${unlocked ? '' : '<p class="muted">Finish an adventure (defeat the final legendary boss) to unlock challenges.</p>'}
    <div class="chal">${Object.entries(CHALLENGES).map(([id, c]) => `<label class="${unlocked ? '' : 'locked'}"><input type="checkbox" value="${id}" ${unlocked ? '' : 'disabled'}><b>${c.name}</b><span>${c.text}</span></label>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="btn" data-close>Back</button><button type="button" class="btn primary" data-go ${unlocked ? '' : 'disabled'}>Begin Challenge Run</button></div>`);
  m.querySelector('[data-go]').addEventListener('click', () => { const ch = [...m.querySelectorAll('input:checked')].map(i => i.value); app.closeModal(); app.newRun(ch); });
}
function codexModal(app) {
  const seen = app.meta.seen; const all = rewardCards();
  const w = rarityWeights(0); const tot = Object.values(w).reduce((a, b) => a + b, 0);
  const m = app.openModal(`<h2>Codex <small>${all.filter(c => seen[c.id]).length} / ${all.length} real cards discovered</small></h2>
    <p class="muted small">Which cards can appear depends on GRAFTBOUND power rating and how far you are, not on Magic rarity. Rarity only shapes which eligible card shows up (${Object.entries(w).map(([k, v]) => `${RARITY[k].name} ${Math.round(v / tot * 100)}%`).join(' · ')} at the start).</p>
    <div class="codex">${all.map(c => seen[c.id] ? `<button type="button" class="cx" data-zoom="${esc(c.id)}">${cardHTML(c.id, { small: true, uid: 'cx' })}</button>` : `<div class="lc-card unknown"><div class="face front"><div class="q">?</div><small>Undiscovered</small></div></div>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`, 'wide');
  m.addEventListener('click', e => { const z = e.target.closest('[data-zoom]'); if (z) inspectCard(app, z.dataset.zoom, { back: () => codexModal(app) }); });
}
export function inspectCard(app, id, { evo = null, level = 1, arcane = 0, back = null } = {}) {
  const m = app.openModal(`<div class="inspect-card">${cardHTML(id, { evo, level, arcane, uid: 'zm', extraClass: 'big' })}<div class="inspect-side">${sourcePanelHTML(id)}</div></div>
    <div class="modal-actions"><button type="button" class="btn primary" data-close>Close</button></div>`, 'wide dark');
  if (back) m.querySelector('[data-close]').addEventListener('click', () => setTimeout(back, 0));
}
function achievementsModal(app) {
  const a = app.meta.achievements;
  app.openModal(`<h2>Achievements <small>${Object.keys(a).length} / ${ACHIEVEMENTS.length}</small></h2>
    <ul class="ach">${ACHIEVEMENTS.map(x => `<li class="${a[x.id] ? 'got' : ''}"><b>${x.name}</b><span>${x.text}</span></li>`).join('')}</ul>
    <div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`);
}
function statsModal(app) {
  const s = app.meta.stats;
  const rows = [['Adventures begun', s.runs], ['Adventures completed', s.wins], ['Grafts unraveled', s.losses], ['Furthest act reached', ACT_ROMAN[s.bestAct || 0]], ['Battles won', s.battlesWon], ['Creatures grafted', s.cardsAbsorbed], ['Spells cast', s.spellsCast], ['Foes defeated', s.kills], ['Greatest power', s.highestPower], ['Greatest toughness', s.highestToughness]];
  app.openModal(`<h2>Records</h2><table class="stats">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
    ${recordsHTML(app)}
    <div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`, 'wide');
}
/** v0.6 local personal records + leaderboard preview. Clearly labeled: local, unverified, unranked. */
export function recordsHTML(app) {
  const rec = app.meta.records || {}; const keys = Object.keys(rec);
  const rows = keys.map(k => { const r = rec[k]; return `<tr><td>${esc(r.label || k)}</td><td>${r.best ? r.best.total.toLocaleString() : '—'}</td><td>${r.best ? r.best.actions : '—'}</td><td>${r.best ? r.best.damage : '—'}</td><td>${r.fewestActions ?? '—'}</td><td>${r.lowestDamage ?? '—'}</td><td>${r.completions || 0}</td></tr>`; }).join('');
  return `<h3>Personal records <small class="badge-local">LOCAL · UNVERIFIED · UNRANKED</small></h3>
    ${keys.length ? `<table class="stats lb"><tr><th>Mode</th><th>Best score</th><th>Actions</th><th>Damage</th><th>Fewest actions (encounter)</th><th>Lowest damage (expedition)</th><th>Completions</th></tr>${rows}</table>` : '<p class="muted">Finish an adventure or a Ranked Expedition preview to record your first score.</p>'}
    <p class="small">These records live only in this browser. Verified leaderboards, achievements and expedition history will belong to your existing DeepCutsEDH profile on <b>deep-cuts-edh.pages.dev</b> once the separately reviewed integration launches. Local results are never uploaded or converted into verified records.</p>`;
}
export function rankedModal(app) {
  const c = RANKED_CHALLENGES[ACTIVE_CHALLENGE];
  const m = app.openModal(`<div class="parch-record"><small class="sh-brand">${GAME.title} · Ranked Expedition</small><h2>${esc(c.name)}</h2>
    <p>Every competitor gets the same blank 1/1, the same challenge seed, the same maps, encounters and reward rules. Your choices — and how efficiently you win — decide the score.</p>
    <table class="stats"><tr><td>Challenge</td><td>${esc(c.id)} · rev ${c.revision}</td></tr><tr><td>Rules</td><td>${esc(c.rulesVersion)}</td></tr><tr><td>Card pool</td><td>${esc(c.cardPoolVersion)}</td></tr><tr><td>Scoring</td><td>${esc(c.scoringVersion)}</td></tr></table>
    <p class="note-warn"><b>Game Lab preview — unranked.</b> This build plays the real challenge and records a replay, then verifies it locally. It is <b>not</b> submitted anywhere. Verified rankings require a DeepCutsEDH profile and will be hosted on the main website after a separate, approved launch. You never need to sign in to play here.</p>
    <div class="modal-actions"><button type="button" class="btn" data-close>Back</button><button type="button" class="btn primary" data-go>Begin Ranked Preview</button></div></div>`, 'wide');
  m.querySelector('[data-go]').addEventListener('click', () => { app.closeModal(); const go = () => app.newRanked(); if (app.run) app.confirm('Starting a Ranked Expedition ends your current adventure (it counts as a loss).', 'Begin', go); else go(); });
}
export function settingsModal(app) {
  const st = app.meta.settings;
  const sel = (k, opts) => `<select data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${st[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const m = app.openModal(`<h2>Settings</h2>
    <label class="row"><span>Graphics</span>${sel('graphics', [['auto', 'Auto'], ['high', 'High — shadows, depth of field, bloom'], ['balanced', 'Balanced'], ['performance', 'Performance — no shadows or post']])}</label>
    <label class="row"><span>Animation speed</span>${sel('animSpeed', [['cinematic', 'Cinematic — savor every spell'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}</label>
    <label class="toggle"><input type="checkbox" data-k="autoEnd" ${st.autoEnd !== false ? 'checked' : ''}><span>Auto-End Turn <small class="muted">— ends your turn when no legal move, attack, spell or interaction remains</small></span></label>
    <label class="toggle"><input type="checkbox" data-k="ambient" ${st.ambient !== false ? 'checked' : ''}><span>Ambient wind &amp; swaying foliage</span></label>
    <label class="toggle"><input type="checkbox" data-k="sound" ${st.sound ? 'checked' : ''}><span>Sound effects</span></label>
    <label class="toggle"><input type="checkbox" data-k="music" ${st.music ? 'checked' : ''}><span>Music</span></label>
    <p class="muted small">Renderer: ${esc(app.scene ? app.scene.r.qName : '—')} · ${GAME.title} v${GAME.version}${app.scene && app.scene.reduced ? ' · reduced motion (from your system setting)' : ''}</p>
    <h3>Controls</h3>
    <table class="keys"><tr><td>Move / strike / target</td><td>Click or tap (tap twice to confirm on touch)</td></tr><tr><td>Cursor</td><td>Arrow keys or WASD, Enter to confirm</td></tr><tr><td>Spells</td><td>1–9 — spells reach anywhere on the battlefield</td></tr><tr><td>End turn</td><td>Space</td></tr><tr><td>Rotate camera</td><td>Q / E</td></tr><tr><td>Zoom</td><td>Mouse wheel or pinch</td></tr><tr><td>Character sheet</td><td>C</td></tr><tr><td>Cancel</td><td>Esc or right-click</td></tr></table>
    <div class="modal-actions"><button type="button" class="btn danger" data-wipe>Erase all progress</button><button type="button" class="btn primary" data-close>Done</button></div>`);
  m.addEventListener('change', e => { const k = e.target.dataset.k; if (!k) return; st[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; app.applySettings(); app.saveMeta(); });
  m.querySelector('[data-wipe]').addEventListener('click', () => app.confirm('Erase every achievement, unlock, record and saved adventure? This cannot be undone.', 'Erase', () => app.wipe()));
}

export function mapScreen(app) {
  const run = app.run, map = run.map;
  const avail = new Set(availableNodes(map, run.current).map(n => n.id));
  const H = 168, depthY = d => H - 12 - d * 20.5, nx = n => 8 + n.x * 84;
  const lines = [];
  for (const n of map.nodes) for (const id of n.next) {
    const m = nodeById(map, id); const walked = run.visited.includes(n.id) && run.visited.includes(m.id);
    lines.push(`<path d="M${nx(n)} ${depthY(n.depth)} Q${(nx(n) + nx(m)) / 2 + (n.id % 2 ? 3 : -3)} ${(depthY(n.depth) + depthY(m.depth)) / 2} ${nx(m)} ${depthY(m.depth)}" class="${walked ? 'walked' : ''} ${n.id === run.current && avail.has(m.id) ? 'next' : ''}"/>`);
  }
  const nodes = map.nodes.map(n => {
    const t = NODE_TYPES[n.type]; const cls = [n.type, avail.has(n.id) ? 'avail' : '', run.visited.includes(n.id) ? 'done' : '', n.id === run.current ? 'here' : ''].join(' ');
    const label = n.type === 'boss' ? bossForSeed(run.act, n.seed).name : t.name;
    return `<g class="node ${cls}" data-node="${n.id}" data-tip="${esc(NODE_TIP[n.type] || label)}" transform="translate(${nx(n)} ${depthY(n.depth)})" tabindex="${avail.has(n.id) ? 0 : -1}" role="button" aria-label="${esc(label + ' — ' + (NODE_TIP[n.type] || ''))}">
      <title>${esc(label + ' — ' + (NODE_TIP[n.type] || ''))}</title><circle r="${n.type === 'boss' ? 6.5 : 4.6}"/><text y="1.7">${t.glyph}</text>${avail.has(n.id) || n.type === 'boss' ? `<text class="lbl" y="${n.type === 'boss' ? 11 : 9}">${esc(label)}</text>` : ''}</g>`;
  }).join('');
  const st = runStats(run), ap = deriveAppearance(run.evo); const wounds = woundsOf(run);
  const el = showScreen(`
    <div class="map-wrap act-${ACTS[run.act].theme}">
      <section class="map-sheet">
        <header><small>${GAME.title} · Act ${ACT_ROMAN[run.act]} of III</small><h2>${esc(map.region)}</h2>
          <div class="actbar">${[0, 1, 2].map(a => `<i class="${a < run.act ? 'done' : a === run.act ? 'cur' : ''}">${ACT_ROMAN[a]}</i>`).join('')}</div></header>
        <svg viewBox="0 0 100 ${H}" class="map-svg"><g class="paths">${lines.join('')}</g>${nodes}</svg>
        <p class="map-legend"><span>⚔ Skirmish</span><span>☠ Elite — stronger rewards</span><span>✧ Wayshrine</span><span>? Mystery — a special encounter</span><span>♛ Act boss</span></p>
      </section>
      <aside class="map-side">
        <div class="mini-plate" data-sheet tabindex="0" role="button">
          <div class="mp-head"><b>${esc(run.name)}</b><span>${STAGE[ap.stage]}</span></div>
          <div class="mp-pt">${run.evo.power}<i>/</i>${run.evo.toughness}</div>
          <div class="mp-hp"><div class="bar"><i style="width:${run.hp / st.maxHealth * 100}%"></i></div><span>${ICON.heart}${run.hp}/${st.maxHealth}${wounds ? ` · <em>${wounds} wounds</em>` : ''}</span></div>
          <div class="mp-row">${ICON.gem}${st.maxMana} mana · ${ICON.move}${st.move} move · ${run.evo.absorbed.length}/${graftCapacity(run)} grafts</div>
          <div class="mp-row world-threat" data-tip="World Threat grows after two enemy-damage-free victories and drops after heavy enemy-caused damage. Maximum 12. Reinforcement limits always apply." role="status" aria-label="World Threat ${run.worldThreat?.level||0} of 12">⚔ World Threat ${(run.worldThreat?.level||0)}/12 · ${run.worldThreat?.level>=9?'Relentless':run.worldThreat?.level>=6?'Hunting':run.worldThreat?.level>=3?'Restless':'Dormant'}</div>
          <div class="mp-kw">${kwChips(run.evo.keywords) || '<span class="muted">No abilities yet</span>'}</div>
          <div class="mp-spells">${run.spellbook.map(s => `<span class="mp-sp c-${getCard(s.id).color}">${esc(getCard(s.id).name)}${s.level > 1 ? ' ' + '✦'.repeat(s.level - 1) : ''}</span>`).join('') || '<span class="muted">Spellbook empty</span>'}</div>
          <small class="open-sheet">Character sheet &amp; spellbook (C)</small>
        </div>
        <button type="button" class="btn small" data-menu>${ICON.menu} Menu</button>
      </aside>
    </div>`, 'map');
  return new Promise(res => {
    const pick = id => { if (!avail.has(id)) return; app.audio.play('click'); res(id); };
    el.querySelector('.map-svg').addEventListener('click', e => { const g = e.target.closest('[data-node]'); if (g) pick(+g.dataset.node); });
    el.querySelector('.map-svg').addEventListener('keydown', e => { const g = e.target.closest('[data-node]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(+g.dataset.node); } });
    el.querySelector('[data-sheet]').addEventListener('click', () => app.openSheet());
    el.querySelector('[data-menu]').addEventListener('click', () => app.pauseMenu());
    app.hint('map', 'Choose your path. Elites guard stronger cards; Wayshrines offer choices. Wounds carry between battles.');
  });
}

/** Booster: original ornamental wrapper → seal charge → seal break → wrapper opens → cards fan → reveal → choose. */
export function rewardScreen(app, cards, { tier, severed, firstVictoryPacks }) {
  const run = app.run; const arcane = runStats(run).arcane; const fast = app.animFactor() > 1.5; const instant = app.animFactor() > 50; const identity = packIdentity(tier);
  for (const id of cards) app.meta.seen[id] = true; app.saveMeta();
  const levelOf = id => { const e = run.spellbook.find(s => s.id === id); return e ? e.level + 1 : 1; };
  const titles = { boss: 'The Victor\u2019s Hoard', elite: 'An Elite\u2019s Hoard', shrine: 'Offering of the Wayshrine', graftsmith: 'The Graftsmith\u2019s Stock', battle: 'Spoils of Battle', primer: 'A Spell Primer', archivist: 'The Archivist\u2019s Folio' };
  const motes = Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i * 26) % 360}deg;--d:${(i % 5) * 0.4}s;--r:${70 + (i % 4) * 18}px"></i>`).join('');
  const el = showScreen(`
    <div class="reward tier-${esc(tier)}" data-pack-kind="${identity.emblem}">
      <h2 class="rw-title">${titles[tier] || titles.battle}</h2>
      ${firstVictoryPacks ? `<p class="rw-pack-count" aria-label="First level booster ${firstVictoryPacks.index} of ${firstVictoryPacks.total}">Pack ${firstVictoryPacks.index} of ${firstVictoryPacks.total}</p>` : ''}
      <p class="rw-sub" id="rw-sub" aria-live="polite">${severed ? `You severed <b>${esc(severed)}</b>. ` : ''}${esc(identity.cue)}</p><p class="rw-omen">${esc(identity.omen)}</p>
      <div class="pack-stage" id="pstage">
        <button type="button" class="pack ${tier}" id="pack" aria-label="Break the seal and open the booster"><span class="pack-rank">${esc(identity.rank)}</span>
          <span class="pk-shadow"></span>
          <span class="pk-body">
            <svg class="pk-art" viewBox="0 0 200 300" aria-hidden="true">
              <defs>
                <linearGradient id="pkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#173826"/><stop offset=".5" stop-color="#0d1f16"/><stop offset="1" stop-color="#1c3a2b"/></linearGradient>
                <linearGradient id="pkgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#d9b052"/><stop offset="1" stop-color="#7c5a1c"/></linearGradient>
                <pattern id="pkvine" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 Q10 8 20 20 T40 20" fill="none" stroke="#2f5a3e" stroke-width="1.2"/><circle cx="20" cy="20" r="1.6" fill="#3d6e4c"/><path d="M20 20 l4 -6 M20 20 l-4 6" stroke="#2f5a3e"/></pattern>
              </defs>
              <rect x="6" y="6" width="188" height="288" rx="10" fill="url(#pkg)"/>
              <rect x="6" y="6" width="188" height="288" rx="10" fill="url(#pkvine)" opacity=".55"/>
              <rect x="14" y="14" width="172" height="272" rx="7" fill="none" stroke="url(#pkgold)" stroke-width="2.5"/>
              <rect x="20" y="20" width="160" height="260" rx="5" fill="none" stroke="url(#pkgold)" stroke-width=".8" stroke-dasharray="2 3"/>
              ${[[14, 14, 1, 1], [186, 14, -1, 1], [14, 286, 1, -1], [186, 286, -1, -1]].map(([x, y, sx, sy]) => `<path d="M${x} ${y + sy * 34} Q${x} ${y} ${x + sx * 34} ${y} M${x + sx * 8} ${y + sy * 20} Q${x + sx * 8} ${y + sy * 8} ${x + sx * 20} ${y + sy * 8} M${x + sx * 14} ${y + sy * 14} m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" fill="none" stroke="url(#pkgold)" stroke-width="2"/>`).join('')}
              <g transform="translate(100 168)">
                <circle r="54" fill="#0a1711" stroke="url(#pkgold)" stroke-width="3"/>
                <circle r="46" fill="none" stroke="url(#pkgold)" stroke-width="1" stroke-dasharray="1 4"/>
                ${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0 -54 L3 -62 L0 -70 L-3 -62Z" fill="url(#pkgold)"/>`).join('')}
                <path d="M-22 -32 h44 l6 6 v52 l-6 6 h-44 l-6 -6 v-52z" fill="none" stroke="url(#pkgold)" stroke-width="2.5"/>
                <path d="M0 -24 V28 M-12 -10 c8 0 12 4 12 10 s4 10 12 10 M12 -10 c-8 0 -12 4 -12 10" fill="none" stroke="url(#pkgold)" stroke-width="3" stroke-linecap="round"/>
                <circle r="5" fill="url(#pkgold)"/>
              </g>
              ${packOrnament(tier)}
              <text x="100" y="262" text-anchor="middle" class="pk-name">GRAFTBOUND</text>
              <text x="100" y="278" text-anchor="middle" class="pk-tier">${tier === 'elite' || tier === 'boss' ? 'STRONGER FRAGMENTS WITHIN' : tier === 'graftsmith' ? 'CREATURES ONLY' : 'THREE FRAGMENTS'}</text>
              <path d="M6 58 H194" stroke="url(#pkgold)" stroke-width="1.4" stroke-dasharray="5 4"/>
            </svg>
            <span class="pk-foil"></span>
            <span class="pk-flap"></span>
            <span class="pk-seal"><span class="pk-sigil">${ICON.sigil}</span>${Array.from({ length: 7 }, (_, i) => `<i class="shard" style="--a:${i * 51}deg"></i>`).join('')}</span>
          </span>
          <span class="pk-motes">${motes}</span>
        </button>
        <div class="fan" id="fan">${cards.map((id, i) => `<div class="slot" data-i="${i}" data-id="${esc(id)}" style="--i:${i}" role="button" tabindex="0" aria-label="Card ${i + 1}">
          <span class="rays"></span>${cardHTML(id, { level: levelOf(id), arcane, uid: 'rw' + i, extraClass: 'flipped', evo: run.evo })}
          <button type="button" class="zoom" data-zoom="${esc(id)}" aria-label="Inspect">${ICON.zoom}</button></div>`).join('')}</div>
      </div>
      <div class="rw-detail" id="rw-detail"></div>
      <div class="rw-actions"><button type="button" class="btn small ghost" id="rw-ceremony-skip" aria-label="Skip pack opening ceremony, retain all rewards">Skip opening animation</button><button type="button" class="btn small ghost" id="rw-reveal">Reveal all</button>${tier !== 'graftsmith' ? `<button type="button" class="btn small ghost" id="rw-skip" hidden>Leave the pack · +1 Spark</button>` : ''}</div>
    </div>`, 'rewardscr' + (fast ? ' fast' : ''));
  app.hint('pack', 'Reveal all three cards, then choose one. Creatures are grafted into you; spells go into your spellbook. Tap the magnifier to inspect a card.');
  let showDetailRef = null;
  const realIds = cards.filter(id => getCard(id).reference);
  if (app.live && realIds.length) app.live.enrichAll(realIds).then(() => {
    for (const [i, id] of cards.entries()) {
      const slot = el.querySelector(`.slot[data-i="${i}"]`); if (!slot || !getCard(id).sourceInfo.live) continue;
      const old = slot.querySelector('.lc-card'); const flipped = old.classList.contains('flipped');
      old.outerHTML = cardHTML(id, { level: levelOf(id), arcane, uid: 'rw' + i, extraClass: flipped ? 'flipped' : '', evo: run.evo });
    }
    const sel = el.querySelector('.slot.sel'); if (sel && showDetailRef) showDetailRef(sel.dataset.id);
  });
  const stage = $('pstage'), pack = $('pack'), fan = $('fan');
  stage.addEventListener('pointermove', e => { if (pack.classList.contains('open')) return; const r = stage.getBoundingClientRect(); pack.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -14 + 'deg'); pack.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 18 + 'deg'); });
  stage.addEventListener('pointerleave', () => { pack.style.setProperty('--rx', '0deg'); pack.style.setProperty('--ry', '0deg'); });
  return new Promise(res => {
    let opened = false, opening = null, claimed = false, ceremonySkipped = false;
    const ceremonyButton = $('rw-ceremony-skip');
    const finishOpen = () => {
      pack.classList.remove('charging', 'broken');
      pack.classList.add('open', 'gone'); fan.classList.add('out');
      ceremonyButton.hidden = true;
      $('rw-sub').textContent = 'Reveal the three fragments';
      const sk = $('rw-skip'); if (sk) sk.hidden = false;
    };
    // Skip animation never consumes/chooses a card; queued visual transitions are cancelled.
    const skipCeremony = () => { ceremonySkipped = true; opened = true; finishOpen(); };
    ceremonyButton.addEventListener('click', skipCeremony);
    const wait = ms => new Promise(r => setTimeout(r, ceremonySkipped || instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : fast ? ms * 0.35 : ms));
    const open = () => opening || (opening = (async () => {
      if (opened) return; opened = true;
      app.audio.play(tier === 'boss' ? 'packBoss' : tier === 'elite' || tier === 'graftsmith' ? 'packElite' : tier === 'primer' || tier === 'archivist' ? 'packFolio' : 'seal'); pack.classList.add('charging');
      const sc = app.scene; if (sc && sc.cam) sc.fx.swirl([0, 1.3, 0], () => [0, 1.3, 0], [1, 0.85, 0.45], 50, 0.6);
      await wait(520); if (ceremonySkipped) return;
      pack.classList.add('broken'); app.audio.play('tear'); if (sc) { sc.screenFlash([1, 0.92, 0.7], 0.25); sc.fx.burst([0, 1.4, 0], [1, 0.85, 0.45], 60, { speed: 3, up: 2 }); }
      await wait(320); if (ceremonySkipped) return;
      pack.classList.add('open'); fan.classList.add('out');
      await wait(380); if (ceremonySkipped) return; pack.classList.add('gone'); ceremonyButton.hidden = true;
      $('rw-sub').textContent = 'Reveal the three fragments'; const sk = $('rw-skip'); if (sk) sk.hidden = false;
    })());
    pack.addEventListener('click', open);
    pack.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    const reveal = slot => {
      const card = slot.querySelector('.lc-card'); if (!card.classList.contains('flipped')) return false;
      card.classList.remove('flipped'); slot.classList.add('revealed');
      const c = getCard(slot.dataset.id);
      const fx = c.rarity === 'mythic' ? 'mythic' : c.rarity === 'rare' ? 'rare' : c.rarity === 'uncommon' ? 'uncommon' : 'flip';
      app.audio.play(fx); slot.classList.add('rv-' + c.rarity);
      if ((c.rarity === 'rare' || c.rarity === 'mythic') && app.scene) app.scene.screenFlash(c.rarity === 'mythic' ? [1, 0.7, 0.4] : [1, 0.92, 0.65], 0.18);
      if (fan.querySelectorAll('.lc-card.flipped').length === 0) { $('rw-sub').textContent = 'Choose one card to keep · double-click to confirm'; $('rw-reveal').hidden = true; }
      return true;
    };
    fan.addEventListener('click', async e => {
      const z = e.target.closest('[data-zoom]'); if (z) { e.stopPropagation(); if (z.closest('.slot').classList.contains('revealed')) inspectCard(app, z.dataset.zoom, { evo: run.evo, level: levelOf(z.dataset.zoom), arcane }); return; }
      const slot = e.target.closest('.slot'); if (!slot) return;
      if (!opened) { await open(); return; }
      if (reveal(slot)) return;
      fan.querySelectorAll('.slot').forEach(s => s.classList.toggle('sel', s === slot)); showDetail(slot.dataset.id);
      if (matchMedia('(max-width: 760px)').matches) $('rw-detail').scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'nearest' });
    });
    fan.addEventListener('dblclick', e => {
      if (claimed || !opened) return;
      const slot = e.target.closest('.slot'); if (!slot || !slot.classList.contains('revealed')) return;
      const id = slot.dataset.id;
      fan.querySelectorAll('.slot').forEach(s => s.classList.toggle('sel', s === slot));
      showDetail(id);
      const take = $('rw-detail')?.querySelector('[data-take]'); if (take && !take.disabled) take.click();
    });
    fan.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('slot')) {
      e.preventDefault(); if (e.key === 'Enter' && e.target.classList.contains('revealed') && e.target.classList.contains('sel')) {
        const take = $('rw-detail')?.querySelector('[data-take]'); if (take && !take.disabled) take.click();
      } else e.target.click();
    } });
    $('rw-reveal').addEventListener('click', async () => { if (!opened) skipCeremony(); await open(); fan.querySelectorAll('.slot').forEach((s, i) => setTimeout(() => reveal(s), instant ? 0 : fast ? 60 * i : 180 + i * 220)); });
    const sk = $('rw-skip'); if (sk) sk.addEventListener('click', () => app.confirm('Leave all three cards behind and gain +1 Spark (+1 max health) instead?', 'Leave them', () => res({ choice: 'skip' })));
    const showDetail = id => {
      const c = getCard(id); let body; const full = c.kind === 'creature' && graftsFull(run);
      if (c.kind === 'creature') {
        const { evo, change } = absorb(run.evo, c);
        const before = runStats(run), after = deriveStats(evo, { sparkBonus: run.sparkBonus, baseSpark: before.spark - run.sparkBonus - 2 * (run.evo.resonance || 0), manaBonus: run.manaBonus || 0 });
        const gained = change.gained.map(k => `<span class="chip new" data-tip="${esc(KEYWORDS[k].text)}">${KEYWORDS[k].glyph} ${esc(keywordLabel(k, evo.keywords[k]))}</span>`).join('');
        body = `<div class="becomes"><span class="lbl">${full ? 'Release one graft, then become' : 'You become'}</span><span class="ptbig">${run.evo.power}/${run.evo.toughness} <i>→</i> <b>${evo.power}/${evo.toughness}</b>${full ? ' <small>(before release)</small>' : ''}</span>
          <span class="hp">${ICON.heart} ${before.maxHealth} → ${after.maxHealth} max health${after.move !== before.move ? ` · ${ICON.move} ${before.move} → ${after.move} move` : ''}</span>
          <div class="chips">${gained}${change.resonance ? `<span class="chip res" data-tip="Abilities you already have resonate: +2 Spark (max health) each.">Resonance +${change.resonance * 2} Spark</span>` : ''}</div></div>
          ${full ? `<div class="release"><p>Your body holds <b>${graftCapacity(run)}</b> grafts in this act. Choose one to release (its power, toughness and abilities leave you):</p>
            ${run.evo.absorbed.map((a, i) => { const ac = getCard(a.cardId); return `<label><input type="radio" name="rel" value="${i}"><b>${esc(a.name)}</b><small>${ac && ac.kind === 'creature' ? `+${ac.power}/+${ac.toughness}${Object.keys(ac.keywords).length ? ' · ' + Object.keys(ac.keywords).map(k => KEYWORDS[k].name).join(', ') : ''}` : ''}</small></label>`; }).join('')}</div>` : ''}
          ${sourcePanelHTML(id)}<button type="button" class="btn primary big" data-take ${full ? 'disabled' : ''}>Graft ${esc(c.name)}</button>`;
      } else {
        const e = run.spellbook.find(s => s.id === id);
        body = `<div class="becomes"><span class="lbl">${e ? `Empower to level ${e.level + 1}` : 'New spell'}</span>${e ? `<div class="upgrade-comparison"><span><b>Now · Lv ${e.level}</b>${esc(formatSpellText(id, e.level, arcane))}</span><span><b>After · Lv ${e.level + 1}</b>${esc(formatSpellText(id, e.level + 1, arcane))}</span></div>` : ''}<p class="sptext">${esc(formatSpellText(id, e ? e.level + 1 : 1, arcane))}</p><span class="hp">${ICON.gem} ${c.cost} mana · ${TARGET[c.target]} · ${rangeLabel(id, e ? e.level + 1 : 1)} · once per turn</span></div>
          ${sourcePanelHTML(id)}<button type="button" class="btn primary big" data-take>${e ? 'Empower' : 'Inscribe'} ${esc(c.name)}</button>`;
      }
      const det = $('rw-detail'); det.innerHTML = body; det.classList.add('show');
      const take = det.querySelector('[data-take]');
      det.addEventListener('change', ev => { if (ev.target.name === 'rel') take.disabled = false; });
      take.addEventListener('click', async () => {
        if (claimed || take.disabled) return; claimed = true; take.disabled = true;
        const rel = det.querySelector('input[name="rel"]:checked');
        const slot = fan.querySelector(`.slot[data-id="${CSS.escape(id)}"]`);
        fan.querySelectorAll('.slot').forEach(s => s.classList.add(s === slot ? 'chosen' : 'discard'));
        await wait(320);
        res({ choice: id, rect: slot.getBoundingClientRect(), release: rel ? +rel.value : undefined });
      });
    };
    showDetailRef = showDetail;
    if (instant) { /* tests: keep everything clickable immediately */ }
  });
}

export function shrineScreen(app) {
  const run = app.run; const view = { ...run, wounds: woundsOf(run), maxHp: maxHpOf(run) };
  const opts = run.shrine.options;
  const el = showScreen(`<div class="shrine act-${ACTS[run.act].theme}"><div class="shrine-glow"></div><h2>A Wayshrine</h2>
    <p class="rw-sub">Old stones hum with ink and ember. Make one offering — the shrine falls silent after.</p>
    <div class="shrine-opts">${opts.map(k => { const S = SHRINES[k]; return `<button type="button" class="opt" data-c="${k}"><span class="og">${S.glyph}</span><b>${S.name}</b><span>${esc(S.text(view))}</span>${S.note ? `<small>${esc(S.note(view))}</small>` : ''}</button>`; }).join('')}</div>
    <p class="muted small">${ICON.heart} ${run.hp}/${maxHpOf(run)} health${view.wounds ? ` · ${view.wounds} wounds` : ''} · ${run.evo.absorbed.length}/${graftCapacity(run)} grafts</p></div>`, 'shrinescr');
  app.audio.play('shrine');
  return new Promise(res => el.querySelector('.shrine-opts').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return; app.audio.play('click'); const c = b.dataset.c;
    if (c === 'graftsmith') {
      const m = app.openModal(`<h2>The Graftsmith</h2><p>Choose a graft to sever. You will then pick its replacement from a stronger creature-only pack.</p>
        <div class="release">${run.evo.absorbed.map((a, i) => `<button type="button" class="btn" data-sev="${i}">${esc(a.name)} <small>+${a.power}/+${a.toughness}</small></button>`).join('')}</div>
        <div class="modal-actions"><button type="button" class="btn" data-close>Back</button></div>`);
      m.addEventListener('click', ev => { const s = ev.target.closest('[data-sev]'); if (s) { app.closeModal(); res({ choice: c, arg: +s.dataset.sev }); } });
    } else if (c === 'inscribe') {
      const m = app.openModal(`<h2>Inscription Altar</h2><p>Empower one spell by a level.</p>
        <div class="release">${run.spellbook.filter(s => s.level < 3).map(s => `<button type="button" class="btn" data-sp="${esc(s.id)}">${esc(getCard(s.id).name)} <small>Lv ${s.level} → ${s.level + 1}</small><span class="upgrade-sub">${esc(formatSpellText(s.id, s.level, runStats(run).arcane))} → ${esc(formatSpellText(s.id, s.level + 1, runStats(run).arcane))}</span></button>`).join('')}</div>
        <div class="modal-actions"><button type="button" class="btn" data-close>Back</button></div>`);
      m.addEventListener('click', ev => { const s = ev.target.closest('[data-sp]'); if (s) { app.closeModal(); res({ choice: c, arg: s.dataset.sp }); } });
    } else res({ choice: c });
  }));
}

export function sheetModal(app) {
  const run = app.run; if (!run) return;
  const st = runStats(run), ap = deriveAppearance(run.evo);
  const hist = run.evo.absorbed.map((a, i) => {
    const c = getCard(a.cardId); const col = c ? COLOR[c.color] : COLOR.verdant;
    const bits = [`+${a.power}/+${a.toughness}`, ...a.gained.map(k => KEYWORDS[k].name), ...a.raised.map(k => KEYWORDS[k].name + '↑'), a.resonance ? `Resonance +${a.resonance * 2} Spark` : ''].filter(Boolean).join(' · ');
    return `<li style="--frame:${col.frame}"><span class="n">${i + 1}</span><b>${esc(a.name || (c && c.name) || a.cardId)}${c && c.legacy ? ' <em class="lg">legacy</em>' : ''}</b><small>${esc(bits)}</small></li>`;
  }).join('');
  const visible = Object.entries(ap.slots).map(([, p]) => `${p.part}${p.tier > 1 ? ' II' : ''}`).concat(ap.effects);
  const m = app.openModal(`
    <div class="sheet">
      <section class="sh-main">
        <small class="sh-brand">${GAME.title} · Act ${ACT_ROMAN[run.act]}</small>
        <h2>${esc(run.name)} <small>${STAGE[ap.stage]}</small></h2>
        <figure class="sh-portrait" data-character-portrait aria-label="Your current evolved character"><figcaption>Current form · ${esc(visible.join(', ') || 'The Blank')}</figcaption><div class="trait-pins" role="group" aria-label="Inspect visible graft traits"></div></figure><p class="trait-detail" aria-live="polite">Select a glowing trait to inspect your evolved form.</p>
        <div class="sh-pt"><div><span>${run.evo.power}</span><small>Power</small></div><div><span>${run.evo.toughness}</span><small>Toughness</small></div></div>
        <dl class="sh-derived">
          <dt>${ICON.heart} Health</dt><dd>${run.hp}/${st.maxHealth} <small>= ${st.spark} Spark + ${run.evo.toughness} toughness</small></dd>
          <dt>${ICON.move} Movement</dt><dd>${st.move}</dd>
          <dt>${ICON.gem} Mana</dt><dd>${st.startMana} at start · +${st.manaRegen}/turn · max ${st.maxMana}</dd>
          <dt>⧉ Grafts</dt><dd>${run.evo.absorbed.length} of ${graftCapacity(run)} this act</dd>
          ${st.arcane ? `<dt>✦ Arcane</dt><dd>Spells +${st.arcane}</dd>` : ''}
          ${run.evo.resonance ? `<dt>◎ Resonance</dt><dd>+${run.evo.resonance * 2} Spark from repeated abilities</dd>` : ''}
        </dl>
        <h3>Abilities</h3>
        <ul class="sh-kw">${Object.entries(run.evo.keywords).map(([k, v]) => `<li><b>${KEYWORDS[k].glyph} ${esc(keywordLabel(k, v))}</b><span>${esc(KEYWORDS[k].text)}</span></li>`).join('') || '<li class="muted">None yet. Graft creatures to gain abilities.</li>'}</ul>
        <h3>Spellbook</h3><p class="small">${run.spellbook.length} collected spells · draw 3 at battle start, then 1 per turn · maximum hand ${handCapacity(run)}. Auras expire after one encounter.</p>
        <p><button type="button" class="btn primary" data-open-spellbook>Open Spellbook · ${run.spellbook.length} spells</button> <button type="button" class="btn" data-inventory>Equipment Inventory · ${(run.equipmentInventory||[]).length} items</button></p>
      </section>
      <section class="sh-hist"><h3>Grafts</h3><ol class="hist">${hist || '<li class="muted">Nothing yet. You are a blank 1/1.</li>'}</ol>
        <h3>Form</h3><p class="small">${visible.length ? 'Visible traits: ' + esc(visible.join(', ')) : 'Unmarked parchment.'}${ap.dormant.length ? `<br><span class="muted">Dormant: ${esc(ap.dormant.join(', '))}</span>` : ''}</p>
        <p class="rules-note"><b>Permanent</b>: grafts, spells and Spark. <b>Between battles</b>: wounds — a victory restores half your missing health; act bosses and Restoration restore all. <b>Temporary</b>: shields, poison, stuns, power changes.</p>
      </section>
    </div>
    <div class="modal-actions"><button type="button" class="btn" data-journal>Evolution Journal</button><button type="button" class="btn primary" data-close>Close</button></div>`, 'wide');
  m.querySelector('[data-character-portrait]')?.prepend(sheetCanvas(app, run.evo, 4, run.equippedEquipment || []));
  // The markers reflect visible grafted anatomy only; no guessed card provenance.
  const pinPositions = { head: [50, 18], back: [26, 38], rear: [77, 62], body: [50, 56], front: [77, 39] };
  const traits = Object.entries(ap.slots).map(([slot, part]) => ({
    name: part.part + (part.tier > 1 ? ' II' : ''),
    label: slot + ' · ' + part.part + (part.tier > 1 ? ' (evolved)' : ''),
    xy: pinPositions[slot] || [50, 50],
  }));
  ap.effects.forEach((effect, i) => traits.push({ name: effect, label: 'Visible aura · ' + effect, xy: [38 + i * 24, 79] }));
  const pins = m.querySelector('.trait-pins');
  if (pins) {
    pins.innerHTML = traits.map((trait, i) => `<button type="button" class="trait-pin" data-trait="${i}"
      style="left:${trait.xy[0]}%;top:${trait.xy[1]}%" aria-label="Inspect ${esc(trait.label)}" aria-pressed="false">✦</button>`).join('');
    pins.addEventListener('click', event => {
      const button = event.target.closest('[data-trait]'); if (!button) return;
      const trait = traits[Number(button.dataset.trait)]; if (!trait) return;
      for (const pin of pins.querySelectorAll('.trait-pin')) pin.setAttribute('aria-pressed', String(pin === button));
      const detail = m.querySelector('.trait-detail'); if (detail) detail.textContent = trait.label;
    });
  }
  m.querySelector('[data-open-spellbook]')?.addEventListener('click', () => { app.closeModal(); spellbookModal(app); });
  m.querySelector('[data-inventory]')?.addEventListener('click', () => { app.closeModal(); inventoryModal(app); });
  const jb = document.querySelector('#modal [data-journal]'); if (jb) jb.addEventListener('click', () => { app.closeModal(); journalModal(app); });
}

/** Equipment transfers from a live battle are paid actions, not free UI edits.
 * The hero has two equipment slots, eligible allies have one each. */
function combatInventoryModal(app) {
 const run=app.run,s=run.battle;
 const m=app.openModal('<div class="gb-gear-inventory"><small class="sh-brand">GRAFTBOUND · Armory</small><h2>Battle Equipment</h2><p>Attach or transfer owned Equipment during your turn, paying its printed Equip mana cost. Select a bearer and slot below.</p><div data-gear-targets></div><div class="gb-gear-layout"><div class="gb-gear-avatar"><div data-gear-preview></div><p data-gear-bearer-name></p></div><div class="gb-gear-controls"><h3>Equipment slots</h3><div data-gear-slots></div><h3>Collected Equipment</h3><div data-gear-items></div><p class="small" role="status" aria-live="polite" data-gear-error></p></div></div></div><div class="modal-actions"><button type="button" class="btn primary" data-close>Close</button></div>','wide');
 let targetUid=s.units.find(u=>u.hero)?.uid, slot=0;
 const render=()=>{
   const eligible=s.units.filter(u=>u.side==='player'&&u.hp>0);
   const target=eligible.find(u=>u.uid===targetUid)||eligible[0];
   if(!target)return;
   targetUid=target.uid;
   const slots=target.hero?2:1;
   if(slot>=slots)slot=0;
   m.querySelector('[data-gear-targets]').innerHTML=eligible.map(u=>'<button type="button" class="btn small" data-bearer="'+u.uid+'" aria-pressed="'+(targetUid===u.uid)+'">'+esc(u.name)+(u.hero?' (hero)':'')+'</button>').join('');
   const worn=target.hero?(s.heroEquipmentSlots||[null,null]):[target.equipment?.[0]||null];
   m.querySelector('[data-gear-slots]').innerHTML=worn.map((id,i)=>{
     const c=id&&getCard(id);
     return '<button type="button" class="btn gb-gear-slot" data-slot="'+i+'" aria-pressed="'+(i===slot)+'">'+(id?'<span class="gb-equip-card">'+cardHTML(id,{small:true,extraClass:'gear-mini'})+'</span>':'')+'Slot '+(i+1)+': '+(c?esc(c.name):'Empty')+'</button>';
   }).join('');
   const preview=m.querySelector('[data-gear-preview]');
   if(target.hero)preview.replaceChildren(sheetCanvas(app,run.evo,4,target.equipment||[]));
   else preview.textContent=target.name+' · '+(target.equipment?.length||0)+' attached';
   m.querySelector('[data-gear-bearer-name]').textContent=target.name;
   const owned=(s.equipmentInventory||[]).filter(id=>!(s.destroyedEquipment||[]).includes(id));
   m.querySelector('[data-gear-items]').innerHTML=owned.length?owned.map(id=>{
     const c=getCard(id);if(!c)return '';
     const cost=c.equipCost||0,attached=!!target.equipment?.includes(id);
     const possible=s.phase==='player'&&!app.battle?.busy&&s.p.mana>=cost&&!attached;
     return '<button type="button" class="gb-gear-entry" data-equip-id="'+esc(id)+'" '+(possible?'':'disabled')+'><span class="gb-equip-card">'+cardHTML(id,{small:true,extraClass:'gear-mini'})+'</span><b>'+esc(c.name)+'</b><span>Equip '+cost+' mana</span><small>'+(attached?'Already worn':'Available mana: '+s.p.mana)+'</small></button>';
   }).join(''):'<p>No Equipment collected.</p>';
 };
 m.addEventListener('click',async event=>{
   const b=event.target.closest('button');if(!b)return;
   if(b.dataset.bearer!==undefined){targetUid=Number(b.dataset.bearer);slot=0;render();return;}
   if(b.dataset.slot!==undefined){slot=Number(b.dataset.slot);render();return;}
   if(b.dataset.equipId===undefined)return;
   try{
     const id=b.dataset.equipId;
     if(app.battle?.busy)throw Error('Wait for the current action');
     await app.battle.act(()=>app.battle.exec({type:'equip',id,uid:targetUid,slot}));
     render();
   }catch(error){m.querySelector('[data-gear-error]').textContent=String(error.message||error);}
 });
 render();
}

/** Physical Equipment inventory: gear is drawn ON the character sprite and removed when unequipped. */
export function inventoryModal(app) {
 const run=app.run;if(!run)return;
 if(run.phase==='battle')return combatInventoryModal(app);
 const editable=run.phase !== 'battle';
 const m=app.openModal(`<div class="gb-gear-inventory"><small class="sh-brand">${GAME.title} · Adventurer’s Armory</small>
   <h2>Equipment Inventory</h2><p class="small">Two persistent Equipment slots. Gear changes visually on your evolved creature; equipping between encounters is free, printed Equip costs apply to future in-battle transfers. Auras are drawn in battle, not stored here.</p>
   <div class="gb-gear-layout"><div class="gb-gear-avatar"><figure class="sh-portrait"><div data-gear-preview></div><figcaption>Equipped form · ${esc(run.name)}</figcaption></figure></div>
   <div class="gb-gear-controls"><h3>Equipped</h3><div data-gear-slots></div><h3>Collected Equipment</h3><div data-gear-collection></div><p data-gear-message aria-live="polite" class="small"></p></div></div></div>
   <div class="modal-actions"><button type="button" class="btn" data-gear-back>Character Sheet</button><button type="button" class="btn primary" data-close>Close</button></div>`, 'wide');
 let selected=0;
 const render=()=>{
  const preview=m.querySelector('[data-gear-preview]');preview.replaceChildren(sheetCanvas(app,run.evo,4,run.equippedEquipment||[]));
  m.querySelector('[data-gear-slots]').innerHTML=[0,1].map(i=>{
   const id=(run.equippedEquipment||[])[i],c=id&&getCard(id);
   return `<div class="gb-gear-slot ${selected===i?'selected':''}"><button class="btn gb-gear-equipped" data-gear-slot="${i}" aria-pressed="${selected===i}" aria-label="Equipped slot ${i+1}: ${c?esc(c.name):'Empty'}">${c?`<span class="gb-equip-card">${cardHTML(id,{small:true,extraClass:'gear-mini'})}</span>`:''}<span>Slot ${i+1}: ${c?esc(c.name):'Empty'}</span></button>${id&&editable?`<button class="btn small" data-gear-unequip="${i}" aria-label="Unequip ${esc(c.name)}">Remove</button>`:''}</div>`;
  }).join('');
  const inventory=run.equipmentInventory||[];
  m.querySelector('[data-gear-collection]').innerHTML=inventory.length?inventory.map(id=>{
   const c=getCard(id),active=(run.equippedEquipment||[]).includes(id);
   return `<button type="button" class="gb-gear-entry" data-gear-equip="${esc(id)}" ${editable?'':'disabled'} aria-label="Equip ${esc(c.name)} in slot ${selected}"><span class="gb-equip-card">${cardHTML(id,{small:true,extraClass:'gear-mini'})}</span><b>${esc(c.name)}</b><span>${esc(c.adaptationNote||'Printed Equipment effects apply')} · Equip ${c.equipCost ?? c.equip ?? '?'}</span><small>${active?'Currently equipped':'In inventory'}</small></button>`;
  }).join(''):'<p>No Equipment collected yet. Find relics in booster rewards.</p>';
 };
 m.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-gear-back')){app.closeModal();sheetModal(app);return;}
  if(b.dataset.gearSlot!==undefined){selected=Number(b.dataset.gearSlot);render();return;}
  if(!editable)return;
  const id=b.dataset.gearEquip??(b.dataset.gearUnequip!==undefined?null:undefined);
  const slot=b.dataset.gearUnequip!==undefined?Number(b.dataset.gearUnequip):selected;
  if(id===undefined)return;
  try {equipItem(run,id,slot);app.save();app.audio.play('click');render();}
  catch(err){m.querySelector('[data-gear-message]').textContent=String(err.message||err);}
 });
 render();
}

/** A page-turning, two-facing-page spellbook. It presents the actual upgraded effect, not base card text. */
export function spellbookModal(app) {
  const run = app.run; if (!run) return;
  let page = 0, color = 'all';
  const canEquip = run.phase !== 'battle';
  const filters = ['all', 'radiant', 'tide', 'umbral', 'ember', 'verdant'];
  const st = runStats(run);
  const m = app.openModal(`<div class="book-wrap"><div class="book-header"><small>${GAME.title} · Inscribed spells</small><h2>The Spellbook</h2></div>
    <p class="book-loadout-count" id="book-loadout-count">Combat library: ${run.spellbook.length} cards · maximum hand size ${handCapacity(run)} · draw 3 initially then 1 each turn. Every learned spell enters the encounter library; Auras expire after one encounter.</p>
    <div class="book-filter" role="group" aria-label="Filter spell colors">${filters.map(x => `<button type="button" data-color="${x}" aria-pressed="${x === color}">${x}</button>`).join('')}</div>
    <div class="open-book" id="open-book" aria-live="polite"><section class="book-page book-left" id="book-left"></section><section class="book-page book-right" id="book-right"></section></div>
    <div class="book-controls"><button type="button" class="btn" data-prev>Previous page</button><span id="book-num"></span><button type="button" class="btn" data-next>Next page</button></div>
    <div class="modal-actions"><button type="button" class="btn" data-back>Character Sheet</button><button type="button" class="btn primary" data-close>Close</button></div></div>`, 'wide');
  const filtered = () => run.spellbook.filter(e => color === 'all' || getCard(e.id)?.color === color);
  const render = () => {
    const pages = filtered(), length = pages.length;
    if (page >= length) page = Math.max(0, length - 1);
    if (!length) {
      m.querySelector('#book-left').innerHTML = '<h3>No inscriptions</h3><p>Choose spell cards from boosters to write your first page.</p>';
      m.querySelector('#book-right').innerHTML = '<p class="book-empty">An untouched page awaits.</p>';
    } else {
      const entry = pages[page], c = getCard(entry.id);
      m.querySelector('#book-left').innerHTML = `<small>Folio ${page + 1}</small><h3>${esc(c.name)}</h3><div class="book-art">${cardHTML(entry.id, { level:entry.level,arcane:st.arcane,uid:'folio'+page })}</div>`;
      m.querySelector('#book-right').innerHTML = `<small>${esc(c.color)} magic · Level ${entry.level}</small><h3>${esc(c.name)}</h3><p class="book-cost">${ICON.gem}${c.cost} GRAFTBOUND mana · ${esc(rangeLabel(entry.id,entry.level))} · ${esc(TARGET[c.target])}</p>
        <p class="book-effect">${esc(formatSpellText(entry.id,entry.level,st.arcane))}</p><h4>Inscription level</h4><p>Level ${entry.level} ${entry.level < 3 ? `· Next level: ${esc(formatSpellText(entry.id,entry.level+1,st.arcane))}` : '· Mastered'}</p>
        <p class="book-rule">${esc(c.adaptationNote || 'GRAFTBOUND adaptation, not official Magic rules.')}</p><p class="small book-equip-message">${c.kind==='aura'?'One-level Aura · expires after the next completed encounter':'Persistent learned spell · shuffled into each encounter deck'}</p><p class="book-equip-message" aria-live="polite"></p>`;
    }
    m.querySelector('#book-loadout-count').textContent = `Combat library: ${run.spellbook.length} cards · maximum hand size ${handCapacity(run)} · draw 3 initially then 1 each turn. Every learned spell enters the encounter library; Auras expire after one encounter.`;
    m.querySelector('#book-num').textContent = length ? `Page ${page + 1} of ${length}` : 'Empty';
    m.querySelector('[data-prev]').disabled = !length || page === 0;
    m.querySelector('[data-next]').disabled = !length || page >= length - 1;
    m.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === color)));
    m.querySelector('#open-book').classList.remove('turn'); void m.querySelector('#open-book').offsetWidth; m.querySelector('#open-book').classList.add('turn');
  };
  m.addEventListener('click', e => {
    const target = e.target.closest('button'); if (!target) return;
    if (false && target.dataset.equip && canEquip) {
      const id = target.dataset.equip;
      try { setSpellEquipped(run, id, !normalizedEquipped(run).includes(id)); app.save(); render(); }
      catch (error) { const msg = m.querySelector('.book-equip-message'); if (msg) msg.textContent = String(error.message || error); }
      return;
    }
    if (target.dataset.color) { color = target.dataset.color; page = 0; render(); }
    if (target.hasAttribute('data-next')) { page++; render(); }
    if (target.hasAttribute('data-prev')) { page--; render(); }
    if (target.hasAttribute('data-back')) { app.closeModal(); sheetModal(app); }
  });
  render();
}

const KIND_LINE = { start: () => 'Woke as The Blank — a 1/1 with no abilities.', boss: e => `Defeated ${esc(e.name)}.`, act: e => `Entered Act ${ACT_ROMAN[e.act]} · ${esc(ACTS[e.act].name)}.`,
  graft: e => `Grafted <b>${esc(e.name)}</b> (+${e.power}/+${e.toughness})${e.gained && e.gained.length ? ' — gained ' + esc(e.gained.map(k => KEYWORDS[k].name).join(', ')) : ''}${e.released ? ' · released ' + esc(e.released) : ''}.${e.firstGraft ? ' <em>First graft.</em>' : ''}${e.firstKeyword ? ` <em>First ability: ${esc(KEYWORDS[e.firstKeyword].name)}.</em>` : ''}${e.stage && e.stage !== 'blank' ? ` <em>Became ${esc(STAGE[e.stage])}.</em>` : ''}`,
  release: e => `Released ${esc(e.name)} (${e.by === 'exchange' ? 'Graft Exchange' : 'Graftsmith'}).`, spell: e => `${e.level > 1 ? 'Empowered' : 'Inscribed'} ${esc(getCard(e.cardId) ? getCard(e.cardId).name : e.cardId)}${e.level > 1 ? ' to level ' + e.level : ''}.`,
  event: e => `Met ${esc(EVENTS[e.id] ? EVENTS[e.id].name : e.id)} — chose “${esc(e.choice)}”.` };
const sheetCanvas = (app, evo, scale = 3, equipment = []) => {
  const src = composeEquippedSheet(app.assets, deriveAppearance(evo), equipment); const c = document.createElement('canvas'); c.width = 48 * scale; c.height = 48 * scale;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, 48, 48, 0, 0, 48 * scale, 48 * scale); c.className = 'journal-sprite'; return c;
};
/** v0.6 Evolution Journal: current creature, graft history, spells, timeline and before/after. */
export function journalModal(app) {
  const run = app.run; if (!run) return;
  const st = runStats(run), ap = deriveAppearance(run.evo); const hist = graftHistory(run);
  const traits = Object.values(ap.slots).map(p => p.part + (p.tier > 1 ? ' II' : '')).concat(ap.effects);
  const m = app.openModal(`<div class="journal"><small class="sh-brand">${GAME.title} · Evolution Journal</small><h2>${esc(run.name)} <small>${STAGE[ap.stage]}</small></h2>
    <section class="j-now"><div class="j-compare"><figure data-fig="before"><figcaption>The Blank · 1/1</figcaption></figure><span class="j-arrow">→</span><figure data-fig="now"><figcaption>Now · ${run.evo.power}/${run.evo.toughness}</figcaption></figure></div>
      <table class="stats"><tr><td>Power / Toughness</td><td>${run.evo.power}/${run.evo.toughness}</td></tr><tr><td>Health</td><td>${run.hp}/${st.maxHealth}</td></tr><tr><td>Abilities</td><td>${esc(Object.keys(run.evo.keywords).map(k => keywordLabel(k, run.evo.keywords[k])).join(', ') || 'none')}</td></tr>
      <tr><td>Visible traits</td><td>${esc(traits.join(', ') || 'unmarked parchment')}</td></tr><tr><td>Stage</td><td>${STAGE[ap.stage]}</td></tr><tr><td>Grafts (active / ever)</td><td>${run.evo.absorbed.length} / ${hist.length}</td></tr></table></section>
    <h3>Graft history</h3><ol class="hist">${hist.map(h => `<li class="${h.active ? '' : 'gone'}"><span class="n">${h.i}</span><b>${esc(h.name)}</b><small>+${h.power}/+${h.toughness}${h.gained && h.gained.length ? ' · ' + esc(h.gained.map(k => KEYWORDS[k].name).join(', ')) : ''} · ${h.reconstructed ? 'acquired before v0.6' : `Act ${ACT_ROMAN[h.act]}${h.node != null ? ', node ' + h.node : ''}`} · ${h.active ? 'active' : 'released'}</small></li>`).join('') || '<li class="muted">No grafts yet.</li>'}</ol>
    <h3>Spellbook</h3><ul class="sh-kw">${run.spellbook.map(sp => `<li><b>${esc(getCard(sp.id).name)}${sp.level > 1 ? ' · Lv ' + sp.level : ''}</b></li>`).join('') || '<li class="muted">Empty.</li>'}</ul>
    <h3>Timeline</h3><ol class="timeline">${(run.journal ? run.journal.entries : []).map(e => `<li>${(KIND_LINE[e.kind] || (() => esc(e.kind)))(e)}</li>`).join('')}</ol>
    <p class="small muted">Local adventure journal. Verified expedition history will appear on your DeepCutsEDH profile only after server verification.</p></div>
    <div class="modal-actions"><button type="button" class="btn primary" data-close>Close</button></div>`, 'wide');
  m.querySelector('[data-fig="before"]').prepend(sheetCanvas(app, newEvolution())); m.querySelector('[data-fig="now"]').prepend(sheetCanvas(app, run.evo));
}

/** v0.6 special encounter screen. Every cost is shown before you choose; Graft Exchange previews what you lose. */
export function eventScreen(app) {
  const run = app.run; const id = run.event.id; const E = EVENTS[id]; const view = { ...run, maxHp: runStats(run).maxHealth };
  const ch = eventChoices(view, id);
  const el = showScreen(`<div class="shrine event act-${ACTS[run.act].theme}"><div class="shrine-glow"></div><h2>${esc(E.glyph)} ${esc(E.name)}</h2>
    <p class="rw-sub">${esc(E.text)}</p>
    <div class="shrine-opts">${ch.map(c => `<button type="button" class="opt" data-c="${c.id}" ${c.available ? '' : 'disabled'} data-tip="${esc(c.text)}"><b>${esc(c.label)}</b><span>${esc(c.text)}</span>${c.available ? '' : '<small>Not available right now</small>'}</button>`).join('')}</div>
    <p class="muted small">${ICON.heart} ${run.hp}/${view.maxHp} health · ${run.evo.absorbed.length}/${graftCapacity(run)} grafts · Special encounters are never scored.</p></div>`, 'shrinescr');
  app.audio.play('shrine');
  return new Promise(res => el.querySelector('.shrine-opts').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b || b.disabled) return; const c = b.dataset.c; app.audio.play('click');
    if (id === 'graftExchange' && c === 'exchange') {
      const m = app.openModal(`<h2>The Graft Exchange</h2><p>Choose a graft to release. You will lose exactly what is listed, then choose a replacement from a creature-only pack.</p>
        <div class="release">${run.evo.absorbed.map((a, i) => { const ac = getCard(a.cardId); return `<button type="button" class="btn" data-g="${i}">${esc(a.name)} <small>lose +${a.power}/+${a.toughness}${ac && ac.keywords && Object.keys(ac.keywords).length ? ' and ' + esc(Object.keys(ac.keywords).map(k => KEYWORDS[k].name).join(', ')) : ''}</small></button>`; }).join('')}</div>
        <div class="modal-actions"><button type="button" class="btn" data-close>Back</button></div>`);
      m.addEventListener('click', ev => { const g = ev.target.closest('[data-g]'); if (g) { app.confirm(`Release ${run.evo.absorbed[+g.dataset.g].name}? This removes its power, toughness and abilities now.`, 'Release', () => res({ choice: c, arg: +g.dataset.g })); } });
    } else if (id === 'archivist' && c === 'trade') {
      const m = app.openModal(`<h2>The Wandering Archivist</h2><p>Which page do you give away? It leaves your spellbook (and any levels it had).</p>
        <div class="release">${run.spellbook.map(sp => `<button type="button" class="btn" data-sp="${esc(sp.id)}">${esc(getCard(sp.id).name)} <small>Lv ${sp.level}</small></button>`).join('')}</div>
        <div class="modal-actions"><button type="button" class="btn" data-close>Back</button></div>`);
      m.addEventListener('click', ev => { const t = ev.target.closest('[data-sp]'); if (t) { app.closeModal(); res({ choice: c, arg: t.dataset.sp }); } });
    } else res({ choice: c });
  }));
}

/** v0.6 encounter result — an adventurer's tournament record, not a web dashboard. */
export function encounterResultScreen(app, entry, { verifiedNote = '' } = {}) {
  const best = app.meta.records && app.meta.records[app.recordKey()] ;
  const el = showScreen(`<div class="result-wrap"><section class="parch-record result">
    <small class="sh-brand">${GAME.title} · Record of the ${entry.nodeType === 'boss' ? 'Boss' : entry.nodeType === 'elite' ? 'Elite Lair' : 'Encounter'}</small>
    <h2>${entry.total ? 'Encounter Cleared' : 'Encounter Lost'}</h2><p class="rw-sub dark">${esc(entry.name)}</p>
    <table class="score"><tr><td>Victory</td><td>+${entry.victory.toLocaleString()}</td></tr>
      <tr><td>Efficiency <small>${entry.actions} actions · par ${entry.parActions}</small></td><td>+${entry.efficiency}</td></tr>
      <tr><td>Damage avoided <small>${entry.damage} damage taken · budget ${entry.damageBudget}</small></td><td>+${entry.avoidance}</td></tr>
      ${entry.multiplier !== 1 ? `<tr><td>${entry.nodeType === 'boss' ? 'Boss' : 'Elite'} multiplier</td><td>×${entry.multiplier}</td></tr>` : ''}
      <tr class="tot"><td>Total</td><td>${entry.total.toLocaleString()} points</td></tr></table>
    <p class="small">${entry.turns} turns · ${entry.tiles} tiles moved · ${entry.actions} accepted actions (auto-ended turns, inspecting and rejected clicks never count).</p>
    <p class="small">${best && best.best ? `Local best expedition: ${best.best.total.toLocaleString()}.` : ''} <span class="badge-local">${esc(verifiedNote || 'LOCAL · PROVISIONAL')}</span></p>
    <div class="modal-actions center"><button type="button" class="btn primary" data-go>Continue</button></div></section></div>`, 'resultscr');
  return new Promise(res => { const b = el.querySelector('[data-go]'); b.focus({ preventScroll: true }); b.addEventListener('click', () => res()); });
}

export function scoreBreakdownHTML(run, extra = {}) {
  const t = expeditionTotals(run); const e = (run.scoring && run.scoring.encounters) || [];
  return `<section class="parch-record end-record"><h3>Expedition Record ${run.ranked ? `<small>${esc(run.ranked.challengeId)} · rev ${run.ranked.revision}</small>` : '<small>Adventure</small>'}</h3>
    <div class="end-total">${t.total.toLocaleString()} <small>points</small></div>
    <table class="score"><tr><th>Encounter</th><th>Actions</th><th>Damage</th><th>Eff.</th><th>Avoid.</th><th>Score</th></tr>
    ${e.map(x => `<tr><td>${esc(ACT_ROMAN[x.act])} · ${esc(x.name)}${x.multiplier !== 1 ? ` ×${x.multiplier}` : ''}</td><td>${x.actions}/${x.parActions}</td><td>${x.damage}/${x.damageBudget}</td><td>+${x.efficiency}</td><td>+${x.avoidance}</td><td>${x.total.toLocaleString()}</td></tr>`).join('')}
    ${t.completionBonus ? `<tr><td colspan="5">Expedition completed</td><td>+${t.completionBonus.toLocaleString()}</td></tr>` : ''}
    <tr class="tot"><td>Total</td><td>${t.actions}</td><td>${t.damage}</td><td colspan="2">${t.turns} turns</td><td>${t.total.toLocaleString()}</td></tr></table>
    ${extra.newBest ? '<p class="new-best">★ New local personal best</p>' : ''}
    <p class="small">${run.ranked ? (extra.verifiedLocally ? '✔ Replay re-verified locally from the challenge definition. ' : '✖ Local replay verification failed — this result is not eligible. ') : ''}<span class="badge-local">LOCAL · UNRANKED — not submitted</span></p>
    ${run.scoring && run.migratedFromV05 ? '<p class="small muted">Battles before the v0.6 update were not scored.</p>' : ''}</section>`;
}
/** v0.8 Time Taken rows (active play only; partial for adventures begun before v0.8). */
export function timeRows(run) {
  const c = run.clock; if (!c) return '<tr><td>Time Taken</td><td>not recorded</td></tr>';
  const acts = (c.byAct || []).map((ms, i) => ms > 0 ? `<tr class="sub"><td>· Act ${ACT_ROMAN[i]}</td><td>${formatDuration(ms)}</td></tr>` : '').join('');
  return `<tr class="time"><td>Time Taken${c.partial ? ' <small>(partial — tracked since the v0.8 update)</small>' : ''}</td><td data-time>${formatDuration(c.ms)}</td></tr>${acts}`;
}
export function endScreen(app, { won, earned, extra = {} }) {
  const run = app.run; const s = run.stats;
  const el = showScreen(`<div class="end ${won ? 'won' : 'lost'}">
    <small class="presents">${GAME.title}</small>
    <h1>${won ? 'The Last Page Turns' : 'The Graft Unravels'}</h1>
    <p class="rw-sub">${won ? 'You began as nothing. The final guardian could not stop what you became.' : `You fell in Act ${ACT_ROMAN[run.act]} · ${esc(ACTS[run.act].name)}. Every card you held is remembered in the Codex.`}</p>
    <div class="end-pt">${run.evo.power}/${run.evo.toughness}</div>
    <div class="chips center">${kwChips(run.evo.keywords)}</div>
    <table class="stats"><tr><td>Battles won</td><td>${s.battlesWon}</td></tr><tr><td>Bosses defeated</td><td>${s.bossesDefeated || 0}</td></tr><tr><td>Creatures grafted</td><td>${s.cardsAbsorbed}</td></tr><tr><td>Spells learned</td><td>${s.spellsLearned}</td></tr><tr><td>Foes defeated</td><td>${s.kills}</td></tr>${timeRows(run)}</table>
    ${scoreBreakdownHTML(run, extra)}
    ${earned.length ? `<h3>Achievements</h3><ul class="ach">${earned.map(a => `<li class="got"><b>${a.name}</b><span>${a.text}</span></li>`).join('')}</ul>` : ''}
    <div class="modal-actions center"><button type="button" class="btn" data-a="journal">Evolution Journal</button><button type="button" class="btn primary" data-a="again">New Adventure</button><button type="button" class="btn" data-a="title">Home</button></div></div>`, 'endscr');
  return new Promise(res => el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'journal') { journalModal(app); return; } res(b.dataset.a); }));
}
