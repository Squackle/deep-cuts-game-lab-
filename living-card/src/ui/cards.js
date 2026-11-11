// Card rendering: original frames, pixel-art illustrations when available, procedural SVG emblem fallback,
// and real Magic card faces (unmodified Scryfall image + "In this game" strip). All text passes through esc().
import { RARITY } from '../data/cards.js';
import { resolveCard } from '../cards/catalog.js';
import { KEYWORDS, keywordLabel } from '../data/keywords.js';
import { formatSpellText } from '../engine/spells.js';
import { CONFIG } from '../config.js';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const COLOR = {
  verdant: { frame: '#2c5236', sky: ['#9cc28a', '#2f5a3a'], glow: '#d8f0a0' },
  umbral:  { frame: '#3a2b4d', sky: ['#8a76a8', '#251a35'], glow: '#d6b8ff' },
  ember:   { frame: '#6a2d1b', sky: ['#f0a86a', '#5a1f12'], glow: '#ffd28a' },
  tide:    { frame: '#1e4555', sky: ['#8ac4d6', '#173847'], glow: '#bff0ff' },
  radiant: { frame: '#6e5a24', sky: ['#f3e2a0', '#7a6326'], glow: '#fff3c0' },
};
const E = {
  toad: '<ellipse cx="50" cy="50" rx="24" ry="13"/><circle cx="38" cy="38" r="7"/><circle cx="62" cy="38" r="7"/>',
  brute: '<path d="M26 66 Q24 30 50 22 Q76 30 74 66Z"/><circle cx="50" cy="24" r="9"/><path d="M26 44 l-8 18 M74 44 l8 18" stroke-width="7"/>',
  boar: '<ellipse cx="46" cy="46" rx="25" ry="13"/><path d="M66 40 Q82 42 80 50 L68 54Z"/><path d="M30 56 v10 M40 58 v10 M54 58 v10 M62 56 v10" stroke-width="5"/>',
  bird: '<path d="M50 44 L14 26 Q30 46 40 50 L50 62 L60 50 Q70 46 86 26Z"/><circle cx="50" cy="40" r="6"/>',
  roc: '<path d="M50 40 L4 14 Q24 46 38 50 L50 68 L62 50 Q76 46 96 14Z"/><circle cx="50" cy="36" r="7"/><path d="M50 36 l-10 4" stroke-width="3"/>',
  leech: '<path d="M20 58 Q34 26 52 40 T84 34" stroke-width="12" fill="none"/><circle cx="84" cy="34" r="6"/>',
  tortoise: '<path d="M22 56 Q26 26 50 26 Q74 26 78 56Z"/><circle cx="84" cy="50" r="6"/><path d="M30 56 v8 M70 56 v8" stroke-width="6"/>',
  heron: '<path d="M44 44 Q46 20 60 18 L76 22 L62 24 Q54 26 54 44Z"/><ellipse cx="44" cy="48" rx="14" ry="8"/><path d="M42 56 v14 M48 56 v14" stroke-width="3"/>',
  hedgehog: '<path d="M22 58 Q26 30 52 30 Q72 32 78 58Z"/><path d="M26 40 l-8 -6 M34 32 l-4 -10 M46 28 l0 -11 M58 29 l4 -10 M68 34 l8 -7" stroke-width="4"/>',
  mantis: '<path d="M48 70 L52 40 L56 70Z"/><path d="M52 40 L44 26 L60 26Z"/><path d="M50 44 Q30 40 26 22 M54 44 Q74 40 78 22" stroke-width="5" fill="none"/>',
  stag: '<ellipse cx="48" cy="50" rx="20" ry="10"/><circle cx="68" cy="38" r="7"/><path d="M66 32 L60 14 L54 20 M72 32 L78 14 L84 20" stroke-width="3" fill="none"/>',
  owl: '<ellipse cx="50" cy="46" rx="18" ry="22"/><circle cx="43" cy="40" r="6" class="eye"/><circle cx="57" cy="40" r="6" class="eye"/>',
  wisp: '<path d="M50 14 Q70 40 62 58 Q56 70 50 70 Q44 70 38 58 Q30 40 50 14Z"/><circle cx="45" cy="50" r="3.5" class="eye"/><circle cx="55" cy="50" r="3.5" class="eye"/>',
  adder: '<path d="M18 62 Q30 44 46 56 T74 44 Q82 40 84 30" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="84" cy="28" r="7"/>',
  lynx: '<ellipse cx="46" cy="50" rx="22" ry="11"/><circle cx="68" cy="38" r="10"/><path d="M62 30 l2 -12 l5 9 M72 29 l5 -11 l2 12"/>',
  wyrm: '<path d="M16 60 Q30 30 50 50 T86 34" stroke-width="14" fill="none" stroke-linecap="round"/>',
  drake: '<path d="M50 40 L10 18 Q24 44 36 48 L50 66 L64 48 Q76 44 90 18Z"/><circle cx="50" cy="36" r="7"/>',
  flame: '<path d="M50 70 Q28 62 34 40 Q40 52 46 46 Q42 28 56 16 Q54 32 66 40 Q74 62 50 70Z"/>',
  shield: '<path d="M50 14 L76 24 V40 Q76 60 50 70 Q24 60 24 40 V24Z"/>',
  sap: '<path d="M50 14 Q70 44 66 56 A16 16 0 0 1 34 56 Q30 44 50 14Z"/>',
  wind: '<path d="M14 32 H62 Q74 32 72 22 Q68 14 60 20 M14 46 H78 Q90 46 88 58 Q84 66 74 60 M22 60 H54" stroke-width="5" fill="none" stroke-linecap="round"/>',
  swirl: '<path d="M50 42 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0" stroke-width="4" fill="none"/>',
  root: '<path d="M50 10 V40 M50 40 Q30 50 20 70 M50 40 Q70 50 80 70 M50 40 V70" stroke-width="5" fill="none" stroke-linecap="round"/>',
  mist: '<circle cx="36" cy="44" r="14"/><circle cx="56" cy="38" r="17"/><circle cx="70" cy="50" r="11"/>',
  rain: '<circle cx="40" cy="28" r="12"/><circle cx="58" cy="24" r="14"/><path d="M34 46 l-4 10 M48 48 l-4 12 M62 46 l-4 10" stroke-width="3.5" stroke-linecap="round"/>',
  siphon: '<path d="M50 40 m-6 0 a6 6 0 1 1 12 0 a12 12 0 1 1 -24 0" stroke-width="4" fill="none"/><path d="M80 14 L60 32" stroke-width="4"/>',
  sprout: '<path d="M50 70 V40" stroke-width="5"/><path d="M50 42 Q30 20 18 30 Q30 46 50 42Z M50 38 Q66 14 82 24 Q70 42 50 38Z"/>',
  bolt: '<path d="M58 10 L32 44 H48 L40 72 L70 34 H54Z"/>',
  star: '<path d="M50 10 L58 34 L84 36 L64 52 L72 76 L50 62 L28 76 L36 52 L16 36 L42 34Z"/>',
};
const TYPE_EMBLEM = { Angel: 'roc', Bird: 'bird', Drake: 'drake', Dragon: 'drake', Rat: 'leech', Snake: 'adder', Cat: 'lynx', Bear: 'brute', Beast: 'brute', Dinosaur: 'wyrm', Wurm: 'wyrm',
  Elephant: 'boar', Giant: 'brute', Unicorn: 'stag', Elemental: 'wisp', Spirit: 'wisp', Vampire: 'owl', Aetherborn: 'wisp', Goblin: 'mantis', Elf: 'heron', Human: 'stag' };
function refEmblem(card) { if (card.kind === 'spell') return card.art; const t = (card.type || '').split(/\s+/); for (const x of t) if (TYPE_EMBLEM[x]) return TYPE_EMBLEM[x]; return 'star'; }
export function artHTML(card, artUrl, uid = '') {
  if (artUrl) return `<img class="art-img" src="${esc(artUrl)}" alt="" draggable="false">`;
  const c = COLOR[card.color] || COLOR.verdant; const id = esc(card.id + uid).replace(/[^a-z0-9]/gi, '');
  const back = card.kind === 'creature' ? `<path d="M0 62 Q20 52 40 60 T80 56 T100 60 V72 H0Z" fill="rgba(0,0,0,.35)"/>`
    : `<g opacity=".35" stroke="${c.glow}" fill="none" stroke-width=".6"><circle cx="50" cy="40" r="30"/><circle cx="50" cy="40" r="22"/></g>`;
  const art = card.art || (card.reference ? refEmblem(card) : null);
  return `<svg viewBox="0 0 100 72" preserveAspectRatio="xMidYMid slice" class="art-svg"><defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky[0]}"/><stop offset="1" stop-color="${c.sky[1]}"/></linearGradient>
  <radialGradient id="gl${id}"><stop offset="0" stop-color="${c.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient></defs>
  <rect width="100" height="72" fill="url(#sky${id})"/><circle cx="50" cy="40" r="30" fill="url(#gl${id})"/>${back}<g class="emb" fill="#1a140e" stroke="#1a140e">${E[art] || E.star}</g></svg>`;
}
/** Mana cost like "{1}{B}{B}" -> colored pips (escaped). */
export function manaPips(cost) {
  return String(cost || '').match(/\{[^}]+\}/g)?.map(t => { const v = t.slice(1, -1); const k = /^[WUBRG]$/.test(v) ? v : 'N'; return `<span class="pip pip-${k}">${k === 'N' ? esc(v) : ''}</span>`; }).join('') || '';
}
/** Short summary of what a card does in THIS game (used on real card faces). */
export function gameSummary(c, level = 1, arcane = 0) {
  if (c.kind === 'creature') return [`${c.power}/${c.toughness}`, ...Object.entries(c.keywords).map(([k, v]) => keywordLabel(k, v))].join(' · ');
  return `${formatSpellText(c.id, level, arcane)} · ${c.cost} gem${c.cost > 1 ? 's' : ''}`;
}
/** opts: level, arcane, small, extraClass, uid, artUrl */
export function cardHTML(cardId, opts = {}) {
  const c = resolveCard(cardId); if (!c) return '';
  if (c.reference && CONFIG.SHOW_REFERENCE_IMAGES && c.sourceInfo.live && c.sourceInfo.image && c.sourceInfo.image.normal) {
    return `<div class="lc-card ${c.kind} real r-${esc(c.rarity)} ${opts.extraClass || ''}" data-card="${esc(c.id)}">
      <div class="face front realface"><img class="real-img" src="${esc(c.sourceInfo.image.normal)}" alt="${esc(c.name)}" draggable="false" loading="lazy">
        <div class="adapt-tag"><b>In this game</b> ${esc(gameSummary(c, opts.level || 1, opts.arcane || 0))}</div></div>
      <div class="face back"><div class="back-emblem"><span>G</span></div></div></div>`;
  }
  const col = COLOR[c.color] || COLOR.verdant; const r = RARITY[c.rarity] || RARITY.common;
  let rules = '';
  if (c.kind === 'creature') {
    const kws = Object.entries(c.keywords).map(([k, v]) => `<b>${esc(keywordLabel(k, v))}</b>`).join(', ');
    const rem = Object.keys(c.keywords).map(k => `<i>${esc(KEYWORDS[k].text)}</i>`).join(' ');
    rules = `${kws ? `<p class="kw">${kws}</p>` : '<p class="kw"><i>No abilities — pure body.</i></p>'}${opts.small ? '' : `<p class="rem">${rem}</p>`}${c.flavor ? `<p class="flav">${esc(c.flavor)}</p>` : ''}`;
  } else rules = `<p>${esc(formatSpellText(c.id, opts.level || 1, opts.arcane || 0))}</p>${opts.level > 1 ? `<p class="lvl">Level ${opts.level}</p>` : ''}`;
  if (c.reference && c.kind === 'spell') rules += `<p class="adapt">${esc(c.adaptationNote)}</p>`;
  const typeLine = c.reference ? `${esc(c.sourceInfo.typeLine)}${c.kind === 'spell' ? ` · ${'<span class="mgem"></span>'.repeat(c.cost)}` : ''}`
    : c.kind === 'creature' ? `Creature — ${esc(c.type)}` : `Spell · ${'<span class="mgem"></span>'.repeat(c.cost)}`;
  return `<div class="lc-card ${c.kind} r-${esc(c.rarity)} ${opts.extraClass || ''}" data-card="${esc(c.id)}" style="--frame:${col.frame};--glow:${col.glow};--gem:${r.gem}">
    <div class="face front">
      <div class="title"><span>${esc(c.name)}</span>${c.reference ? `<span class="pips">${manaPips(c.sourceInfo.manaCost)}</span>` : c.kind === 'spell' ? `<span class="cost">${c.cost}</span>` : ''}</div>
      <div class="art">${artHTML(c, opts.artUrl, opts.uid || '')}</div>
      <div class="type"><span>${typeLine}</span><span class="rar" title="${esc(r.name)}"></span></div>
      <div class="rules">${rules}</div>
      ${c.kind === 'creature' ? `<div class="pt">${c.power}/${c.toughness}</div>` : ''}
      ${c.reference ? '<div class="origin" title="A real Magic: The Gathering card, adapted to this game">Magic card</div>' : ''}
    </div>
    <div class="face back"><div class="back-emblem"><span>G</span></div></div>
  </div>`;
}
/** Read-only source panel for reference cards (real card metadata, original Oracle text, link). */
export function sourcePanelHTML(cardId) {
  const c = resolveCard(cardId); if (!c || !c.reference) return '';
  const s = c.sourceInfo;
  const oracle = s.oracleText == null ? '<i>Oracle text loads from Scryfall when online.</i>' : (s.oracleText ? esc(s.oracleText).replace(/\n/g, '<br>') : '<i>(No rules text.)</i>');
  return `<div class="source"><h4>The real card</h4><p><b>${esc(c.name)}</b> <span class="pips">${manaPips(s.manaCost)}</span><br>${esc(s.typeLine)}${c.kind === 'creature' ? ` · ${c.power}/${c.toughness}` : ''}</p>
    <p class="oracle">${oracle}</p>
    <p class="adapt-line"><b>In this game:</b> ${esc(c.kind === 'spell' ? c.adaptationNote : 'Grafted as ' + gameSummary(c) + ' (abilities use this game\u2019s rules — tap them for details).')}</p>
    ${s.issues && s.issues.length ? `<p class="warn">Scryfall shows a difference: ${esc(s.issues.join('; '))}</p>` : ''}
    <p class="fine">${s.live ? `${esc(s.setName)}${s.artist ? ' · Illustrated by ' + esc(s.artist) : ''} · ` : ''}Card data and images via Scryfall. Magic: The Gathering is © Wizards of the Coast. GRAFTBOUND is unofficial fan content, not approved or endorsed by Wizards. ${s.scryfallUri ? `<a href="${esc(s.scryfallUri)}" target="_blank" rel="noopener noreferrer">View on Scryfall</a>` : ''}</p></div>`;
}
