// Keyword definitions for GRAFTBOUND's own RPG rules. These are ADAPTATIONS, not Magic rules.
// "flag" keywords are present/absent; "stack" keywords have a value with a hard cap.
// Duplicate flags and stack overflow convert into Resonance (+2 Spark each, v0.5) — see engine/evolution.js.
// `mtg`: the Scryfall keyword this maps from (null = no real-card source; legacy/enemy only).
export const KEYWORDS = {
  deathtouch:  { name: 'Deathtouch',   kind: 'flag', glyph: '☠', mtg: 'Deathtouch',    text: 'Your strikes destroy any non-Legendary foe they damage (after armor and shields). Against Legendary foes, strikes deal +2 instead.' },
  flying:      { name: 'Flying',       kind: 'flag', glyph: '❦', mtg: 'Flying',        text: '+1 movement. Fly over rocks, hazards and enemies. Ground melee foes cannot strike back at you. Harpoons can ground you.' },
  trample:     { name: 'Trample',      kind: 'flag', glyph: '➹', mtg: 'Trample',       text: 'When a strike kills, excess damage hits the foe directly behind it.' },
  firstStrike: { name: 'First Strike', kind: 'flag', glyph: '⚔', mtg: 'First strike',  text: 'Foes you attack cannot strike back. When attacked in melee, you strike first.' },
  doubleStrike:{ name: 'Double Strike',kind: 'flag', glyph: '⚔⚔', mtg: 'Double strike', text: 'Your attacks strike twice.' },
  lifelink:    { name: 'Lifelink',     kind: 'flag', glyph: '♥', mtg: 'Lifelink',      text: 'Damage from your strikes heals you.' },
  vigilance:   { name: 'Vigilance',    kind: 'flag', glyph: '◈', mtg: 'Vigilance',     text: 'Attacking does not end your movement.' },
  reach:       { name: 'Long Reach',   kind: 'flag', glyph: '⟿', mtg: null,            text: 'Attack foes 2 tiles away in a straight line. Distant foes cannot strike back. (Legacy graft.)' },
  haste:       { name: 'Haste',        kind: 'flag', glyph: '»', mtg: 'Haste',         text: '+1 movement. On the first turn of each battle you may attack twice.' },
  regenerate:  { name: 'Regenerate',   kind: 'stack', cap: 4, glyph: '✚', mtg: null,   text: 'Heal N at the start of each of your turns. (Legacy graft.)' },
  ward:        { name: 'Bulwark',      kind: 'stack', cap: 6, glyph: '⛉', mtg: null,   text: 'At the start of each of your turns, your shield refreshes to at least N. (Legacy graft.)' },
  spines:      { name: 'Spines',       kind: 'stack', cap: 6, glyph: '✷', mtg: null,   text: 'Melee attackers take N damage when they strike you.' },
  attuned:     { name: 'Attuned',      kind: 'stack', cap: 3, glyph: '◆', mtg: null,   text: '+N maximum mana, +N starting mana and +N mana each turn.' },
  arcane:      { name: 'Arcane',       kind: 'stack', cap: 5, glyph: '✦', mtg: null,   text: 'Your spells deal, heal and shield +N.' },
  armor:       { name: 'Armor',        kind: 'stack', cap: 4, glyph: '▣', mtg: null,   text: 'Each instance of combat damage dealt to this unit is reduced by N.' },
};
export const KEYWORD_ORDER = Object.keys(KEYWORDS);
export function keywordLabel(id, v) {
  const k = KEYWORDS[id]; if (!k) return id;
  return k.kind === 'stack' ? `${k.name} ${v}` : k.name;
}
