// Menu, intro, map, booster, shrine, character sheet / spellbook, settings and summary screens (DOM).
import { RARITY } from '../data/cards.js';
import { resolveCard as getCard, catalogCards } from '../cards/catalog.js';
import { KEYWORDS, keywordLabel } from '../data/keywords.js';
import { cardHTML, COLOR, esc, sourcePanelHTML } from './cards.js';
import { availableNodes, nodeById, NODE_TYPES } from '../engine/campaign.js';
import { absorb, deriveStats } from '../engine/evolution.js';
import { runStats, CHALLENGES } from '../engine/run.js';
import { deriveAppearance } from '../engine/appearance.js';
import { ACHIEVEMENTS } from '../engine/progression.js';
import { formatSpellText, spellRange } from '../engine/spells.js';
import { rarityWeights } from '../engine/rewards.js';
import { cardArtUrl } from '../rendering/sprites.js';
import { CONFIG, GAME } from '../config.js';
import { kwChips, STAGE } from './battle-ui.js';
import { ICON } from './icons.js';

const $ = id => document.getElementById(id);
const TARGET = { enemy: 'One foe', self: 'Yourself', tile: 'Any tile (area)', empty: 'Empty tile' };
const LOGO = `<h1 class="logo" aria-label="${GAME.title}"><span class="logo-sigil">${ICON.sigil}</span><span class="logo-word">GRAFT<b>BOUND</b></span></h1>`;

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
        ${hasRun ? `<button type="button" class="btn primary" data-a="continue">Continue Adventure</button>` : ''}
        <button type="button" class="btn ${hasRun ? '' : 'primary'}" data-a="new">${hasRun ? 'Begin a New Adventure' : 'Begin Adventure'}</button>
        <button type="button" class="btn" data-a="challenges">Challenges${meta.unlocks.firstVictory ? '' : ' <small>· locked</small>'}</button>
        <div class="menu-row"><button type="button" class="btn small" data-a="codex">Codex</button><button type="button" class="btn small" data-a="ach">Achievements</button><button type="button" class="btn small" data-a="stats">Records</button><button type="button" class="btn small" data-a="settings">Settings</button></div>
      </nav>
      <p class="fine">${app.contentModeForNewRun() === 'reference' ? 'Cards: real Magic: The Gathering cards (data via Scryfall), adapted to this game\u2019s rules. ' : 'Cards: original set. '}${GAME.title} is unofficial fan content — not approved or endorsed by Wizards of the Coast. v${GAME.version}</p>
    </div>`, 'title');
  el.querySelector('.menu').addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return; app.audio.unlock(); app.audio.play('click');
    ({ continue: () => app.resume(), new: () => (hasRun ? app.confirm('Abandon your current adventure? It will count as a loss.', 'Abandon', () => app.newRun([])) : app.newRun([])), challenges: () => challengesModal(app), codex: () => codexModal(app), ach: () => achievementsModal(app), stats: () => statsModal(app), settings: () => settingsModal(app) })[a.dataset.a]();
  });
}

/** Adventure introduction: shown when a new adventure begins (full text the first time, brief afterwards). */
export function introScreen(app, { first }) {
  const lines = first ? [
    'In the Forgotten Hollow, every creature that falls leaves its shape behind.',
    'You are <b>The Blank</b> — a 1/1 scrap of living parchment. No claws. No wings. No name.',
    'Win a battle and the Hollow offers three cards. <b>Graft</b> a creature into yourself and you take its strength and its gifts. Inscribe a spell and it is yours to cast.',
    'Begin as nothing.',
  ] : ['The Hollow stirs. A new Blank wakes in the moss.'];
  const el = showScreen(`<div class="intro ${first ? 'first' : ''}">
      ${LOGO}
      <div class="intro-text">${lines.map((l, i) => `<p class="pending" data-d="${i}">${l}</p>`).join('')}<p class="intro-last pending" data-d="${lines.length}">${first ? 'Become everything.' : GAME.tagline}</p></div>
      <div class="intro-pt" aria-label="Starting stats"><span>1/1</span><small>The Blank · no abilities · empty spellbook</small></div>
      <button type="button" class="btn primary big" data-go>Enter the Hollow</button>
    </div>`, 'introscr' + (app.animFactor() > 1.5 ? ' fast' : ''));
  app.audio.play('intro');
  // Timer-driven reveal (not CSS animation delays): text can never stay hidden on slow devices.
  const step = app.animFactor() > 1.5 ? 90 : 850;
  const timers = [...el.querySelectorAll('.intro-text p')].map(p => setTimeout(() => p.classList.remove('pending'), 250 + (+p.dataset.d) * step));
  return new Promise(res => {
    const go = () => { timers.forEach(clearTimeout); window.removeEventListener('keydown', key); res(); };
    const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); go(); } };
    window.addEventListener('keydown', key);
    el.querySelector('[data-go]').addEventListener('click', go);
  });
}
function challengesModal(app) {
  const unlocked = !!app.meta.unlocks.firstVictory;
  const m = app.openModal(`<h2>Challenges</h2>${unlocked ? '' : '<p class="muted">Defeat the Thornmother once to unlock challenges.</p>'}
    <div class="chal">${Object.entries(CHALLENGES).map(([id, c]) => `<label class="${unlocked ? '' : 'locked'}"><input type="checkbox" value="${id}" ${unlocked ? '' : 'disabled'}><b>${c.name}</b><span>${c.text}</span></label>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="btn" data-close>Back</button><button type="button" class="btn primary" data-go ${unlocked ? '' : 'disabled'}>Begin Challenge Run</button></div>`);
  m.querySelector('[data-go]').addEventListener('click', () => { const ch = [...m.querySelectorAll('input:checked')].map(i => i.value); app.closeModal(); app.newRun(ch); });
}
function codexModal(app) {
  const seen = app.meta.seen; const all = catalogCards({ includeReference: app.meta.settings.contentMode === 'reference' });
  const w = rarityWeights(0); const tot = Object.values(w).reduce((a, b) => a + b, 0);
  app.openModal(`<h2>Codex <small>${Object.keys(seen).filter(id => all.some(c => c.id === id)).length} / ${all.length} discovered</small></h2>
    <p class="muted small">Booster odds per slot at the start of an adventure: ${Object.entries(w).map(([k, v]) => `${RARITY[k].name} ${Math.round(v / tot * 100)}%`).join(' · ')}. Deeper steps raise rare odds a little. Elite and boss packs guarantee one Rare or better.</p>
    <div class="codex">${all.map(c => seen[c.id] ? cardHTML(c.id, { small: true, uid: 'cx', artUrl: cardArtUrl(app.assets, c.id) }) : `<div class="lc-card unknown"><div class="face front"><div class="q">?</div><small>${c.unlock ? 'Locked' : 'Undiscovered'}</small></div></div>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`, 'wide');
}
function achievementsModal(app) {
  const a = app.meta.achievements;
  app.openModal(`<h2>Achievements <small>${Object.keys(a).length} / ${ACHIEVEMENTS.length}</small></h2>
    <ul class="ach">${ACHIEVEMENTS.map(x => `<li class="${a[x.id] ? 'got' : ''}"><b>${x.name}</b><span>${x.text}</span></li>`).join('')}</ul>
    <div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`);
}
function statsModal(app) {
  const s = app.meta.stats;
  const rows = [['Adventures begun', s.runs], ['Thornmother defeated', s.wins], ['Grafts unraveled', s.losses], ['Battles won', s.battlesWon], ['Creatures grafted', s.cardsAbsorbed], ['Spells cast', s.spellsCast], ['Foes defeated', s.kills], ['Deepest step reached', s.bestDepth], ['Greatest power', s.highestPower], ['Greatest toughness', s.highestToughness]];
  app.openModal(`<h2>Records</h2><table class="stats">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><div class="modal-actions"><button type="button" class="btn" data-close>Close</button></div>`);
}
export function settingsModal(app) {
  const st = app.meta.settings;
  const sel = (k, opts) => `<select data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${st[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const m = app.openModal(`<h2>Settings</h2>
    <label class="row"><span>Graphics</span>${sel('graphics', [['auto', 'Auto'], ['high', 'High — shadows, depth of field, bloom'], ['balanced', 'Balanced'], ['performance', 'Performance — no shadows or post']])}</label>
    <label class="row"><span>Animation speed</span>${sel('animSpeed', [['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}</label>
    ${CONFIG.REFERENCE_MODE_AVAILABLE ? `<label class="row"><span>Card source</span>${sel('contentMode', [['reference', 'Real Magic cards (Scryfall)'], ['original', 'Original set only']])}</label><p class="muted small">Card source applies to new adventures.</p>` : ''}
    <label class="toggle"><input type="checkbox" data-k="sound" ${st.sound ? 'checked' : ''}><span>Sound effects</span></label>
    <label class="toggle"><input type="checkbox" data-k="music" ${st.music ? 'checked' : ''}><span>Music</span></label>
    <p class="muted small">Renderer: ${esc(app.scene ? app.scene.r.qName : '—')} · ${GAME.title} v${GAME.version}</p>
    <h3>Controls</h3>
    <table class="keys"><tr><td>Move / strike / target</td><td>Click or tap (tap twice to confirm on touch)</td></tr><tr><td>Cursor</td><td>Arrow keys or WASD, Enter to confirm</td></tr><tr><td>Spells</td><td>1–9</td></tr><tr><td>End turn</td><td>Space</td></tr><tr><td>Rotate camera</td><td>Q / E or arrow buttons</td></tr><tr><td>Zoom</td><td>Mouse wheel or pinch</td></tr><tr><td>Character sheet &amp; spellbook</td><td>C</td></tr><tr><td>Cancel</td><td>Esc or right-click</td></tr></table>
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
    return `<g class="node ${cls}" data-node="${n.id}" transform="translate(${nx(n)} ${depthY(n.depth)})" tabindex="${avail.has(n.id) ? 0 : -1}" role="button" aria-label="${t.name}">
      <circle r="${n.type === 'boss' ? 6.5 : 4.6}"/><text y="1.7">${t.glyph}</text>${avail.has(n.id) ? `<text class="lbl" y="${n.type === 'boss' ? 11 : 9}">${t.name}</text>` : ''}</g>`;
  }).join('');
  const st = runStats(run), ap = deriveAppearance(run.evo);
  const el = showScreen(`
    <div class="map-wrap">
      <section class="map-sheet">
        <header><small>${GAME.title} · Act I</small><h2>${esc(map.region)}</h2></header>
        <svg viewBox="0 0 100 ${H}" class="map-svg"><g class="paths">${lines.join('')}</g>${nodes}</svg>
        <p class="map-legend"><span>⚔ Skirmish</span><span>☠ Elite — rare reward</span><span>✧ Wayshrine</span><span>♛ Boss</span></p>
      </section>
      <aside class="map-side">
        <div class="mini-plate" data-sheet tabindex="0" role="button">
          <div class="mp-head"><b>${esc(run.name)}</b><span>${STAGE[ap.stage]}</span></div>
          <div class="mp-pt">${run.evo.power}<i>/</i>${run.evo.toughness}</div>
          <div class="mp-row">${ICON.heart}${st.maxHealth} health · ${ICON.gem}${st.maxMana} mana · ${ICON.move}${st.move} move</div>
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
    app.hint('map', 'Choose your path. Elites guard rarer cards; Wayshrines strengthen you.');
  });
}

export function rewardScreen(app, cards, { tier }) {
  const run = app.run; const arcane = runStats(run).arcane; const fast = app.animFactor() > 1.5;
  for (const id of cards) app.meta.seen[id] = true; app.saveMeta();
  const levelOf = id => { const e = run.spellbook.find(s => s.id === id); return e ? e.level + 1 : 1; };
  const el = showScreen(`
    <div class="reward">
      <h2 class="rw-title">${tier === 'boss' ? 'The Heartwood Hoard' : tier === 'elite' ? 'An Elite\u2019s Hoard' : tier === 'shrine' ? 'Offering of the Wayshrine' : 'Spoils of Battle'}</h2>
      <p class="rw-sub" id="rw-sub">Tap the pack to open it</p>
      <div class="pack-stage">
        <button type="button" class="pack ${tier}" id="pack" aria-label="Open booster pack"><span class="flap"></span><span class="pk-emb">${ICON.sigil}</span><span class="pk-name">GRAFTBOUND</span><span class="pk-tier">${tier === 'elite' || tier === 'boss' ? 'Rare guaranteed' : '3 cards'}</span></button>
        <div class="fan" id="fan">${cards.map((id, i) => `<button type="button" class="slot" data-i="${i}" data-id="${esc(id)}" style="--i:${i}">${cardHTML(id, { level: levelOf(id), arcane, uid: 'rw' + i, extraClass: 'flipped', artUrl: cardArtUrl(app.assets, id) })}</button>`).join('')}</div>
      </div>
      <div class="rw-detail" id="rw-detail"></div>
      <div class="rw-actions"><button type="button" class="btn small ghost" id="rw-reveal">Reveal all</button><button type="button" class="btn small ghost" id="rw-skip" hidden>Leave the pack · +1 Spark</button></div>
    </div>`, 'rewardscr' + (fast ? ' fast' : ''));
  app.hint('pack', 'Reveal all three cards, then choose one. Creatures are grafted into you; spells go into your spellbook.');
  let showDetailRef = null;
  const realIds = cards.filter(id => getCard(id).reference);
  if (app.live && realIds.length) app.live.enrichAll(realIds).then(() => {
    for (const [i, id] of cards.entries()) {
      const slot = document.querySelector(`.slot[data-i="${i}"]`); if (!slot || !getCard(id).reference || !getCard(id).sourceInfo.live) continue;
      const old = slot.querySelector('.lc-card'); const flipped = old.classList.contains('flipped');
      old.outerHTML = cardHTML(id, { level: levelOf(id), arcane, uid: 'rw' + i, extraClass: flipped ? 'flipped' : '' });
    }
    const sel = document.querySelector('.slot.sel'); if (sel && showDetailRef) showDetailRef(sel.dataset.id);
  });
  return new Promise(res => {
    const pack = $('pack'), fan = $('fan'); let opened = false;
    const open = async () => {
      if (opened) return; opened = true; app.audio.play('tear');
      app.scene.fx.burst([0, 1.2, 0], [1, 0.85, 0.45], 50, { speed: 3, up: 2 });
      pack.classList.add('tear'); await new Promise(r => setTimeout(r, fast ? 120 : 480)); pack.classList.add('gone'); fan.classList.add('out');
      $('rw-sub').textContent = 'Reveal each card'; $('rw-skip').hidden = false;
    };
    pack.addEventListener('click', open);
    const reveal = slot => {
      const card = slot.querySelector('.lc-card'); if (!card.classList.contains('flipped')) return false;
      card.classList.remove('flipped'); slot.classList.add('revealed');
      const c = getCard(slot.dataset.id); const rare = c.rarity === 'rare' || c.rarity === 'mythic';
      app.audio.play(rare ? 'rare' : 'flip'); if (rare) slot.classList.add('shine');
      if (fan.querySelectorAll('.lc-card.flipped').length === 0) { $('rw-sub').textContent = 'Choose one card to keep'; $('rw-reveal').hidden = true; }
      return true;
    };
    fan.addEventListener('click', e => {
      const slot = e.target.closest('.slot'); if (!slot) return;
      if (!opened) { open(); return; }
      if (reveal(slot)) return;
      fan.querySelectorAll('.slot').forEach(s => s.classList.toggle('sel', s === slot)); showDetail(slot.dataset.id);
    });
    $('rw-reveal').addEventListener('click', async () => { await open(); fan.querySelectorAll('.slot').forEach((s, i) => setTimeout(() => reveal(s), fast ? 0 : 160 + i * 140)); });
    $('rw-skip').addEventListener('click', () => app.confirm('Leave all three cards behind and gain +1 Spark (+1 max health) instead?', 'Leave them', () => res({ choice: 'skip' })));
    const showDetail = id => {
      const c = getCard(id); let body;
      if (c.kind === 'creature') {
        const { evo, change } = absorb(run.evo, c);
        const before = runStats(run), after = deriveStats(evo, { sparkBonus: run.sparkBonus, baseSpark: before.spark - run.sparkBonus });
        const gained = change.gained.map(k => `<span class="chip new" data-tip="${esc(KEYWORDS[k].text)}">${KEYWORDS[k].glyph} ${esc(keywordLabel(k, evo.keywords[k]))}</span>`).join('');
        const raised = change.raised.map(k => `<span class="chip new">${esc(keywordLabel(k, run.evo.keywords[k]))} → ${evo.keywords[k]}</span>`).join('');
        body = `<div class="becomes"><span class="lbl">You become</span><span class="ptbig">${run.evo.power}/${run.evo.toughness} <i>→</i> <b>${evo.power}/${evo.toughness}</b></span>
          <span class="hp">${ICON.heart} ${before.maxHealth} → ${after.maxHealth} health${after.move !== before.move ? ` · ${ICON.move} ${before.move} → ${after.move} move` : ''}${after.maxMana !== before.maxMana ? ` · ${ICON.gem} ${before.maxMana} → ${after.maxMana} mana` : ''}</span>
          <div class="chips">${gained}${raised}${change.resonance ? `<span class="chip res" data-tip="Abilities you already have resonate: +1/+1 each.">Resonance +${change.resonance}/+${change.resonance}</span>` : ''}</div></div>
          ${sourcePanelHTML(id)}<button type="button" class="btn primary big" data-take>Graft ${esc(c.name)}</button>`;
      } else {
        const e = run.spellbook.find(s => s.id === id);
        body = `<div class="becomes"><span class="lbl">${e ? `Empower to level ${e.level + 1}` : 'New spell'}</span><p class="sptext">${esc(formatSpellText(id, e ? e.level + 1 : 1, arcane))}</p><span class="hp">${ICON.gem} ${c.cost} mana · ${TARGET[c.target]} · range ${spellRange(id, e ? e.level + 1 : 1) || 'self'} · once per turn</span></div>
          ${sourcePanelHTML(id)}<button type="button" class="btn primary big" data-take>${e ? 'Empower' : 'Inscribe'} ${esc(c.name)}</button>`;
      }
      $('rw-detail').innerHTML = body; $('rw-detail').classList.add('show');
      $('rw-detail').querySelector('[data-take]').addEventListener('click', () => { const slot = fan.querySelector(`.slot[data-id="${CSS.escape(id)}"]`); res({ choice: id, rect: slot.getBoundingClientRect() }); });
    };
    showDetailRef = showDetail;
  });
}

export function shrineScreen(app) {
  const el = showScreen(`<div class="shrine"><h2>A Wayshrine</h2><p class="rw-sub">Moss-wrapped stones hum with old ink. Make one offering.</p>
    <div class="shrine-opts">
      <button type="button" class="opt" data-c="spark"><b>Spark Font</b><span>+3 Spark — your maximum health rises by 3 for the rest of the adventure.</span></button>
      <button type="button" class="opt" data-c="pack"><b>Offering Bowl</b><span>Open an extra three-card booster.</span></button>
    </div></div>`, 'shrinescr');
  return new Promise(res => el.querySelector('.shrine-opts').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { app.audio.play('click'); res(b.dataset.c); } }));
}

export function sheetModal(app) {
  const run = app.run; if (!run) return;
  const st = runStats(run), ap = deriveAppearance(run.evo);
  const hist = run.evo.absorbed.map((a, i) => {
    const c = getCard(a.cardId); const col = c ? COLOR[c.color] : COLOR.verdant;
    const bits = [`+${a.power}/+${a.toughness}`, ...a.gained.map(k => KEYWORDS[k].name), ...a.raised.map(k => KEYWORDS[k].name + '↑'), a.resonance ? `Resonance +${a.resonance}` : ''].filter(Boolean).join(' · ');
    return `<li style="--frame:${col.frame}"><span class="n">${i + 1}</span><b>${esc(a.name || (c && c.name) || a.cardId)}</b><small>${esc(bits)}</small></li>`;
  }).join('');
  const visible = Object.entries(ap.slots).map(([slot, p]) => `${p.part}${p.tier > 1 ? ' II' : ''}`).concat(ap.effects);
  app.openModal(`
    <div class="sheet">
      <section class="sh-main">
        <small class="sh-brand">${GAME.title}</small>
        <h2>${esc(run.name)} <small>${STAGE[ap.stage]}</small></h2>
        <div class="sh-pt"><div><span>${run.evo.power}</span><small>Power</small></div><div><span>${run.evo.toughness}</span><small>Toughness</small></div></div>
        <dl class="sh-derived">
          <dt>${ICON.heart} Health</dt><dd>${st.maxHealth} <small>= ${st.spark} Spark + 2 × ${run.evo.toughness} toughness</small></dd>
          <dt>${ICON.move} Movement</dt><dd>${st.move}</dd>
          <dt>${ICON.gem} Mana</dt><dd>${st.startMana} at start · +${st.manaRegen}/turn · max ${st.maxMana}</dd>
          ${st.arcane ? `<dt>✦ Arcane</dt><dd>Spells +${st.arcane}</dd>` : ''}
          ${run.evo.resonance ? `<dt>◎ Resonance</dt><dd>+${run.evo.resonance}/+${run.evo.resonance} from repeated abilities</dd>` : ''}
        </dl>
        <h3>Abilities</h3>
        <ul class="sh-kw">${Object.entries(run.evo.keywords).map(([k, v]) => `<li><b>${KEYWORDS[k].glyph} ${esc(keywordLabel(k, v))}</b><span>${esc(KEYWORDS[k].text)}</span></li>`).join('') || '<li class="muted">None yet. Graft creatures to gain abilities.</li>'}</ul>
        <h3 id="spellbook">Spellbook</h3>
        <ul class="sh-kw">${run.spellbook.map(s => { const c = getCard(s.id); return `<li><b>${esc(c.name)}${s.level > 1 ? ` · Lv ${s.level}` : ''} <em>${c.cost} mana · ${TARGET[c.target]} · range ${spellRange(s.id, s.level) || 'self'}${c.los ? ' · needs sight' : ''}</em></b><span>${esc(formatSpellText(s.id, s.level, st.arcane))}</span></li>`; }).join('') || '<li class="muted">Empty. Choose spell cards from boosters.</li>'}</ul>
      </section>
      <section class="sh-hist"><h3>Grafts</h3><ol class="hist">${hist || '<li class="muted">Nothing yet. You are a blank 1/1.</li>'}</ol>
        <h3>Form</h3><p class="small">${visible.length ? 'Visible traits: ' + esc(visible.join(', ')) : 'Unmarked parchment.'}${ap.dormant.length ? `<br><span class="muted">Dormant (no room to show): ${esc(ap.dormant.join(', '))}</span>` : ''}</p>
        <p class="rules-note"><b>Permanent</b>: power, toughness, abilities, spells and Spark carry through the whole adventure. <b>Temporary</b>: damage, shields, poison, stuns and power changes last only for the current battle (or turn). You return to full health after each victory.</p>
      </section>
    </div>
    <div class="modal-actions"><button type="button" class="btn primary" data-close>Close</button></div>`, 'wide');
}

export function endScreen(app, { won, earned }) {
  const run = app.run; const s = run.stats;
  const el = showScreen(`<div class="end ${won ? 'won' : 'lost'}">
    <small class="presents">${GAME.title}</small>
    <h1>${won ? 'The Heartwood Falls' : 'The Graft Unravels'}</h1>
    <p class="rw-sub">${won ? 'You began as nothing. The Forgotten Hollow now remembers what you became.' : 'The ink fades — but every card you held is remembered in the Codex.'}</p>
    <div class="end-pt">${run.evo.power}/${run.evo.toughness}</div>
    <div class="chips center">${kwChips(run.evo.keywords)}</div>
    <table class="stats"><tr><td>Battles won</td><td>${s.battlesWon}</td></tr><tr><td>Creatures grafted</td><td>${s.cardsAbsorbed}</td></tr><tr><td>Spells learned</td><td>${s.spellsLearned}</td></tr><tr><td>Foes defeated</td><td>${s.kills}</td></tr><tr><td>Damage dealt</td><td>${s.damageDealt}</td></tr></table>
    ${earned.length ? `<h3>Achievements</h3><ul class="ach">${earned.map(a => `<li class="got"><b>${a.name}</b><span>${a.text}</span></li>`).join('')}</ul>` : ''}
    <div class="modal-actions center"><button type="button" class="btn primary" data-a="again">New Adventure</button><button type="button" class="btn" data-a="title">Title</button></div></div>`, 'endscr');
  return new Promise(res => el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) res(b.dataset.a); }));
}
