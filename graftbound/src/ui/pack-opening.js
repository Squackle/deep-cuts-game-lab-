// Original, procedural GRAFTBOUND pack wrappers (no Magic card art sampled or transformed).
// Presentation only: this module NEVER chooses rewards or changes rarity probabilities.
export const PACK_IDENTITIES = Object.freeze({
  battle: { rank: 'FIELD PACK · WAX & ROOT', emblem: 'field', omen: 'A root-bound packet salvaged from the battlefield.', cue: 'Break the wax to uncover three fragments.' },
  tutorial: { rank: 'FIRST SPOILS · THE HOLLOW', emblem: 'field', omen: 'The Hollow offers its first three fragments.', cue: 'Break the seal to reveal your first choices.' },
  elite: { rank: 'ELITE RELIQUARY · GILDED IRON', emblem: 'elite', omen: 'A warded relic wrested from a formidable guardian.', cue: 'Shatter the enchanted lock to expose three fragments.' },
  boss: { rank: 'BOSS HOARD · ANCIENT CROWN', emblem: 'boss', omen: 'A crowned reliquary hums with the power of a fallen ruler.', cue: 'Unbind the crown seal to claim a boss reward.' },
  shrine: { rank: 'WAYSHRINE OFFERING · SAGE WAX', emblem: 'field', omen: 'An offering set upon the shrine stone.', cue: 'Break the seal and choose a fragment.' },
  primer: { rank: 'SPELL PRIMER · INK & LIGHT', emblem: 'folio', omen: 'The first inscriptions of your growing spellbook.', cue: 'Open the folio and select your spell.' },
  archivist: { rank: 'ARCHIVIST FOLIO · ANCIENT INK', emblem: 'folio', omen: 'A tome of rewritten magic, paid for in memory.', cue: 'Open the folio and choose an inscription.' },
  graftsmith: { rank: 'GRAFTSMITH CACHE · BONE & BRASS', emblem: 'elite', omen: 'A surgeon’s hidden cache, bound in iron.', cue: 'Open the cache and choose a body to graft.' },
});
export const packIdentity = tier => PACK_IDENTITIES[tier] || PACK_IDENTITIES.battle;

// SVG silhouettes intentionally made from simple geometry so no external visual dependency exists.
const ART = Object.freeze({
  field: `<g class="pk-etch pk-field" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M41 92 Q73 69 92 101 M159 92 Q127 69 108 101 M39 224 Q69 237 91 208 M161 224 Q131 237 109 208"/>
    <path d="M52 99 q-12 -23 -30 -13 M56 102 q-22 -5 -30 8 M145 96 q15 -23 32 -13 M145 102 q20 -4 29 8"/>
    <path d="M47 223 l-6 -17 m17 20 l4 -14 M153 223 l6 -17 m-17 20 l-4 -14"/>
    <circle cx="32" cy="98" r="5"/><circle cx="168" cy="98" r="5"/>
  </g>`,
  elite: `<g class="pk-etch pk-elite" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
    <path d="M48 91 L67 66 84 92 100 60 116 92 133 66 152 91 M58 215 L73 239 100 224 127 239 142 215"/>
    <path d="M43 94 L33 120 45 146 M157 94 L167 120 155 146 M43 186 L33 204 49 229 M157 186 L167 204 151 229"/>
    <path d="M71 68 l-9 -12 m38 7 V47 m29 21 l9 -12 M72 233 l-8 12 M128 233 l8 12"/>
    <path d="M34 158 l12 8 -12 8 -12 -8z M166 158 l12 8 -12 8 -12 -8z"/>
  </g>`,
  boss: `<g class="pk-etch pk-boss" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
    <path d="M38 109 L40 70 66 88 100 51 134 88 160 70 162 109 Z M48 117 H152"/>
    <path d="M52 217 l15 17 33 -11 33 11 15 -17 M43 210 h114"/>
    <path d="M34 143 L22 153 34 163 M166 143 L178 153 166 163 M100 40 v-15 M89 36 L100 22 111 36"/>
    <circle cx="100" cy="75" r="6"/><circle cx="66" cy="93" r="4"/><circle cx="134" cy="93" r="4"/>
  </g>`,
  folio: `<g class="pk-etch pk-folio" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
    <path d="M45 82 Q72 76 100 93 Q128 76 155 82 V216 Q128 207 100 225 Q72 207 45 216 Z"/>
    <path d="M100 93 V225 M55 108 Q75 105 90 115 M110 115 Q130 105 145 108 M55 189 Q73 182 91 195 M109 195 Q127 182 145 189"/>
    <path d="M68 130 q11 -11 21 0 M111 130 q11 -11 21 0 M69 158 q10 -11 20 0 M111 158 q11 -11 21 0"/>
  </g>`,
});
export const packOrnament = tier => ART[packIdentity(tier).emblem];

/** Pure cosmetic treatment. Does not affect the reward roll or card printing rarity. */
export function treatmentFor(seed, cardId, position=0){
 let h=(seed ^ 0x8a11b00b ^ Math.imul(position+1,0x9e3779b1))>>>0;
 for(const c of cardId){h=(Math.imul(h^c.charCodeAt(0),16777619))>>>0;}
 const r=h%100;
 return r<2?'masterwork':r<12?'etched':'original';
}
export const TREATMENT_NAMES=Object.freeze({original:'Original GRAFTBOUND frame',etched:'Etched GRAFTBOUND frame',masterwork:'Masterwork GRAFTBOUND frame'});
