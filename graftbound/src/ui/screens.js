// Menu, intro, act interludes, map, booster, Wayshrine, sheet, settings and summary screens (DOM).
import { RARITY } from '../data/cards.js';
import { resolveCard as getCard, rewardCards } from '../cards/catalog.js';
import { KEYWORDS, keywordLabel } from '../data/keywords.js';
import { cardHTML, COLOR, esc, sourcePanelHTML, backHTML } from './cards.js';
import { availableNodes, nodeById, NODE_TYPES } from '../engine/campaign.js';
import { absorb, deriveStats } from '../engine/evolution.js';
import { runStats, CHALLENGES, graftCapacity, graftsFull, woundsOf, maxHpOf } from '../engine/run.js';
import { SHRINES } from '../engine/shrines.js';
import { ACTS } from '../data/encounters.js';
import { deriveAppearance } from '../engine/appearance.js';
import { ACHIEVEMENTS } from '../engine/progression.js';
import { formatSpellText, rangeLabel } from '../engine/spells.js';
import { rarityWeights } from '../engine/rewards.js';
import { GAME } from '../config.js';
import { kwChips, STAGE } from './battle-ui.js';
import { ICON } from './icons.js';

const $ = id => document.getElementById(id);
const TARGET = { enemy: 'One foe, anywhere', self: 'Yourself', tile: 'Any tile (area)', empty: 'Empty tile' };
const LOGO = `<h1 class="logo" aria-label="${GAME.title}"><span class="logo-sigil">${ICON.sigil}</span><span class="logo-word">GRAFT<b>BOUND</b></span></h1>`;
const ACT_ROMAN = ['I', 'II', 'III'];
const ACT_LORE = [
  'In the Forgotten Hollow, every creature that falls leaves its shape behind.',
  'Below the Hollow the roots burn. The Ashen Warrens are a furnace where the Pyre Matron hatches her kin in lava.',
  'Past the furnace, the world was never finished. In the Fractured Nexus, the Unwritten waits to copy whatever you have become.',
];
export function showScreen(html, cls = '') { const el = $('screen'); el.className = 'screen show ' + cls; el.innerHTML = html; return el; }
export function hideScreen() { const el = $('screen'); el.className = 'screen'; el.innerHTML = ''; }

export function titleScreen(app) {
  const { meta } = app; const hasRun = !!app.run;
  const el = showScreen(`
    <div class="title-wrap">
      <small class="presents">Deep Cuts EDH presents</small>
      ${LOGO}
      <p class="tagline">${GAME.tagline}</p>
      <nav class="menu">
        ${hasRun ? `<button type="button" class="btn primary" data-a="continue">Continue Adventure${app.run.act ? ` <small>· Act ${ACT_ROMAN[app.run.act]}</small>` : ''}</button>` : ''}
        <button type="button" class="btn ${hasRun ? '' : 'primary'}" data-a="new">${hasRun ? 'Begin a New Adventure' : 'Begin Adventure'}</button>
        <button type="button" class="btn" data-a="challenges">Challenges${meta.unlocks.firstVictory ? '' : ' <small>· locked</small>'}</button>
        <div class="menu-row"><button type="button" class="btn small" data-a="codex">Codex</button><button type="button" class="btn small" data-a="ach">Achievements</button><button type="button" class="btn small" data-a="stats">Records</button><button type="button" class="btn small" data-a="settings">Settings</button></div>
      </nav>
      <p class="fine">Rewards are real Magic: The Gathering cards (data via Scryfall), adapted to GRAFTBOUND's own rules. ${GAME.title} is unofficial fan content — not approved or endorsed by Wizards of the Coast. v${GAME.version}</p>
    </div>`, 'title');
  el.querySelector('.menu').addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return; app.audio.unlock(); app.audio.play('click');
    ({ continue: () => app.resume(), new: () => (hasRun ? app.confirm('Abandon your current adventure? It will count as a loss.', 'Abandon', () => app.newRun([])) : app.newRun([])), challenges: () => challengesModal(app), codex: () => codexModal(app), ach: () => achievementsModal(app), stats: () => statsModal(app), settings: () => settingsModal(app) })[a.dataset.a]();
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
      <div class="intro-text"><p class="pending" data-d="0">${ACT_LORE[act]}</p><p class="pending" data-d="1">Your graft capacity grows to <b>${graftCapacity(run)}</b>. The wounds of the last act are mended.</p><p class="intro-last pending" data-d="2">${esc(A.boss)} awaits.</p></div>
      <div class="intro-pt"><span>${run.evo.power}/${run.evo.toughness}</span><small>${run.evo.absorbed.length} grafts · ${run.spellbook.length} spells</small></div>
      <button type="button" class="btn primary big" data-go>Descend</button></div>`, 'introscr actscr' + (app.animFactor() > 1.5 ? ' fast' : ''));
  app.audio.play('intro');
  return waitGo(el, revealLines(el, app));
}
function challengesModal(app) {
  const unlocked = !!app.meta.unlocks.firstVictory;
  const m = app.openModal(`<h2>Challenges</h2>${unlocked ? '' : '<p class="muted">Finish an adventure (defeat the Unwritten) to unlock challenges.</p>'}
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
  app.openModal(`<h2>Records</h2><table class="stats">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`);
}
export function settingsModal(app) {
  const st = app.meta.settings;
  const sel = (k, opts) => `<select data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${st[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const m = app.openModal(`<h2>Settings</h2>
    <label class="row"><span>Graphics</span>${sel('graphics', [['auto', 'Auto'], ['high', 'High — shadows, depth of field, bloom'], ['balanced', 'Balanced'], ['performance', 'Performance — no shadows or post']])}</label>
    <label class="row"><span>Animation speed</span>${sel('animSpeed', [['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}</label>
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
    const label = n.type === 'boss' ? map.boss : t.name;
    return `<g class="node ${cls}" data-node="${n.id}" transform="translate(${nx(n)} ${depthY(n.depth)})" tabindex="${avail.has(n.id) ? 0 : -1}" role="button" aria-label="${esc(label)}">
      <circle r="${n.type === 'boss' ? 6.5 : 4.6}"/><text y="1.7">${t.glyph}</text>${avail.has(n.id) || n.type === 'boss' ? `<text class="lbl" y="${n.type === 'boss' ? 11 : 9}">${esc(label)}</text>` : ''}</g>`;
  }).join('');
  const st = runStats(run), ap = deriveAppearance(run.evo); const wounds = woundsOf(run);
  const el = showScreen(`
    <div class="map-wrap act-${ACTS[run.act].theme}">
      <section class="map-sheet">
        <header><small>${GAME.title} · Act ${ACT_ROMAN[run.act]} of III</small><h2>${esc(map.region)}</h2>
          <div class="actbar">${[0, 1, 2].map(a => `<i class="${a < run.act ? 'done' : a === run.act ? 'cur' : ''}">${ACT_ROMAN[a]}</i>`).join('')}</div></header>
        <svg viewBox="0 0 100 ${H}" class="map-svg"><g class="paths">${lines.join('')}</g>${nodes}</svg>
        <p class="map-legend"><span>⚔ Skirmish</span><span>☠ Elite — stronger rewards</span><span>✧ Wayshrine</span><span>♛ Act boss</span></p>
      </section>
      <aside class="map-side">
        <div class="mini-plate" data-sheet tabindex="0" role="button">
          <div class="mp-head"><b>${esc(run.name)}</b><span>${STAGE[ap.stage]}</span></div>
          <div class="mp-pt">${run.evo.power}<i>/</i>${run.evo.toughness}</div>
          <div class="mp-hp"><div class="bar"><i style="width:${run.hp / st.maxHealth * 100}%"></i></div><span>${ICON.heart}${run.hp}/${st.maxHealth}${wounds ? ` · <em>${wounds} wounds</em>` : ''}</span></div>
          <div class="mp-row">${ICON.gem}${st.maxMana} mana · ${ICON.move}${st.move} move · ${run.evo.absorbed.length}/${graftCapacity(run)} grafts</div>
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
export function rewardScreen(app, cards, { tier, severed }) {
  const run = app.run; const arcane = runStats(run).arcane; const fast = app.animFactor() > 1.5; const instant = app.animFactor() > 50;
  for (const id of cards) app.meta.seen[id] = true; app.saveMeta();
  const levelOf = id => { const e = run.spellbook.find(s => s.id === id); return e ? e.level + 1 : 1; };
  const titles = { boss: 'The Victor\u2019s Hoard', elite: 'An Elite\u2019s Hoard', shrine: 'Offering of the Wayshrine', graftsmith: 'The Graftsmith\u2019s Stock', battle: 'Spoils of Battle' };
  const motes = Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i * 26) % 360}deg;--d:${(i % 5) * 0.4}s;--r:${70 + (i % 4) * 18}px"></i>`).join('');
  const el = showScreen(`
    <div class="reward tier-${tier}">
      <h2 class="rw-title">${titles[tier] || titles.battle}</h2>
      <p class="rw-sub" id="rw-sub">${severed ? `You severed <b>${esc(severed)}</b>. ` : ''}Touch the seal to break it</p>
      <div class="pack-stage" id="pstage">
        <button type="button" class="pack ${tier}" id="pack" aria-label="Break the seal and open the booster">
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
      <div class="rw-actions"><button type="button" class="btn small ghost" id="rw-reveal">Reveal all</button>${tier !== 'graftsmith' ? `<button type="button" class="btn small ghost" id="rw-skip" hidden>Leave the pack · +1 Spark</button>` : ''}</div>
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
    let opened = false, opening = null;
    const wait = ms => new Promise(r => setTimeout(r, instant ? 0 : fast ? ms * 0.35 : ms));
    const open = () => opening || (opening = (async () => {
      if (opened) return; opened = true;
      app.audio.play('seal'); pack.classList.add('charging');
      const sc = app.scene; if (sc && sc.cam) sc.fx.swirl([0, 1.3, 0], () => [0, 1.3, 0], [1, 0.85, 0.45], 50, 0.6);
      await wait(520);
      pack.classList.add('broken'); app.audio.play('tear'); if (sc) { sc.screenFlash([1, 0.92, 0.7], 0.25); sc.fx.burst([0, 1.4, 0], [1, 0.85, 0.45], 60, { speed: 3, up: 2 }); }
      await wait(320);
      pack.classList.add('open'); fan.classList.add('out');
      await wait(380); pack.classList.add('gone');
      $('rw-sub').textContent = 'Reveal each card'; const sk = $('rw-skip'); if (sk) sk.hidden = false;
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
      if (fan.querySelectorAll('.lc-card.flipped').length === 0) { $('rw-sub').textContent = 'Choose one card to keep'; $('rw-reveal').hidden = true; }
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
    fan.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('slot')) { e.preventDefault(); e.target.click(); } });
    $('rw-reveal').addEventListener('click', async () => { await open(); fan.querySelectorAll('.slot').forEach((s, i) => setTimeout(() => reveal(s), instant ? 0 : fast ? 60 * i : 180 + i * 220)); });
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
        body = `<div class="becomes"><span class="lbl">${e ? `Empower to level ${e.level + 1}` : 'New spell'}</span><p class="sptext">${esc(formatSpellText(id, e ? e.level + 1 : 1, arcane))}</p><span class="hp">${ICON.gem} ${c.cost} mana · ${TARGET[c.target]} · ${rangeLabel(id, e ? e.level + 1 : 1)} · once per turn</span></div>
          ${sourcePanelHTML(id)}<button type="button" class="btn primary big" data-take>${e ? 'Empower' : 'Inscribe'} ${esc(c.name)}</button>`;
      }
      const det = $('rw-detail'); det.innerHTML = body; det.classList.add('show');
      const take = det.querySelector('[data-take]');
      det.addEventListener('change', ev => { if (ev.target.name === 'rel') take.disabled = false; });
      take.addEventListener('click', async () => {
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
        <div class="release">${run.spellbook.filter(s => s.level < 3).map(s => `<button type="button" class="btn" data-sp="${esc(s.id)}">${esc(getCard(s.id).name)} <small>Lv ${s.level} → ${s.level + 1}</small></button>`).join('')}</div>
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
  app.openModal(`
    <div class="sheet">
      <section class="sh-main">
        <small class="sh-brand">${GAME.title} · Act ${ACT_ROMAN[run.act]}</small>
        <h2>${esc(run.name)} <small>${STAGE[ap.stage]}</small></h2>
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
        <h3>Spellbook</h3>
        <ul class="sh-kw">${run.spellbook.map(s => { const c = getCard(s.id); return `<li><b>${esc(c.name)}${s.level > 1 ? ` · Lv ${s.level}` : ''} <em>${c.cost} mana · ${TARGET[c.target]} · ${rangeLabel(s.id, s.level)}</em></b><span>${esc(formatSpellText(s.id, s.level, st.arcane))}</span></li>`; }).join('') || '<li class="muted">Empty. Choose spell cards from boosters.</li>'}</ul>
      </section>
      <section class="sh-hist"><h3>Grafts</h3><ol class="hist">${hist || '<li class="muted">Nothing yet. You are a blank 1/1.</li>'}</ol>
        <h3>Form</h3><p class="small">${visible.length ? 'Visible traits: ' + esc(visible.join(', ')) : 'Unmarked parchment.'}${ap.dormant.length ? `<br><span class="muted">Dormant: ${esc(ap.dormant.join(', '))}</span>` : ''}</p>
        <p class="rules-note"><b>Permanent</b>: grafts, spells and Spark. <b>Between battles</b>: wounds — a victory restores half your missing health; act bosses and Restoration restore all. <b>Temporary</b>: shields, poison, stuns, power changes.</p>
      </section>
    </div>
    <div class="modal-actions"><button type="button" class="btn primary" data-close>Close</button></div>`, 'wide');
}

export function endScreen(app, { won, earned }) {
  const run = app.run; const s = run.stats;
  const el = showScreen(`<div class="end ${won ? 'won' : 'lost'}">
    <small class="presents">${GAME.title}</small>
    <h1>${won ? 'The Last Page Turns' : 'The Graft Unravels'}</h1>
    <p class="rw-sub">${won ? 'You began as nothing. The Unwritten could not copy what you became.' : `You fell in Act ${ACT_ROMAN[run.act]} · ${esc(ACTS[run.act].name)}. Every card you held is remembered in the Codex.`}</p>
    <div class="end-pt">${run.evo.power}/${run.evo.toughness}</div>
    <div class="chips center">${kwChips(run.evo.keywords)}</div>
    <table class="stats"><tr><td>Battles won</td><td>${s.battlesWon}</td></tr><tr><td>Bosses defeated</td><td>${s.bossesDefeated || 0}</td></tr><tr><td>Creatures grafted</td><td>${s.cardsAbsorbed}</td></tr><tr><td>Spells learned</td><td>${s.spellsLearned}</td></tr><tr><td>Foes defeated</td><td>${s.kills}</td></tr></table>
    ${earned.length ? `<h3>Achievements</h3><ul class="ach">${earned.map(a => `<li class="got"><b>${a.name}</b><span>${a.text}</span></li>`).join('')}</ul>` : ''}
    <div class="modal-actions center"><button type="button" class="btn primary" data-a="again">New Adventure</button><button type="button" class="btn" data-a="title">Title</button></div></div>`, 'endscr');
  return new Promise(res => el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) res(b.dataset.a); }));
}
