// GRAFTBOUND-specific, consciously bounded tactical adaptations of real printed creature abilities.
// Only these explicitly reviewed identities may enter the reward pool with non-keyword Oracle text.
export const GRAFT_TRAITS = Object.freeze({
  'Serra Ascendant': { id:'ascendant', trigger:'battleStart', value:3, note:'At 30+ health when a battle starts, gain +3/+3 and Flying for that battle; printed +5/+5 is adapted for balance.' },
  'Brimaz, King of Oreskos': { id:'brimaz', trigger:'attackDeclared', value:1, note:'Your hero attack creates a 1/1 white Cat Soldier ally on an open adjacent tile, capped at three per encounter.' },
  'Archmage Emeritus': { id:'archmage', trigger:'spellCast', value:1, note:'Casting an instant or sorcery draws one additional spell from your encounter library.' },
  'Talrand, Sky Summoner': { id:'talrand', trigger:'spellCast', value:1, note:'Casting an instant or sorcery creates a 2/2 Flying Drake ally, capped at three active Drakes.' },
  'Archaeomancer': { id:'archaeomancer', trigger:'spellCast', value:1, note:'The first spell you cast each encounter retrieves the most recent different spell in your Graveyard; if none exists, draw one.' },
  'Blood Artist': { id:'bloodArtist', trigger:'unitDied', value:1, note:'When another creature dies, drain 1 life from the nearest living foe and heal 1; a tactical adaptation of target-opponent life loss.' },
  'Vito, Thorn of the Dusk Rose': { id:'vito', trigger:'lifeGained', value:1, note:'When the hero gains health, deal that much damage to the nearest enemy (never chains from Vito itself).' },
  'Sheoldred, the Apocalypse': { id:'sheoldred', trigger:'cardDraw', value:2, note:'When the hero draws a card, gain 2 health; the printed opponent-draw trigger is not modeled.' },
  'Young Pyromancer': { id:'pyromancer', trigger:'spellCast', value:1, note:'Casting an instant or sorcery creates a 1/1 red Elemental ally, capped at three active Elementals.' },
  'Elvish Visionary': { id:'visionary', trigger:'battleStart', value:1, note:'Draw one additional spell when an encounter begins; adapted from its enter-the-battlefield draw.' },
  'Wurmcoil Engine': { id:'wurmcoil', trigger:'unitDied', value:2, note:'When Wurmcoil itself dies on the board, it splits into one 3/3 Deathtouch Wurm and one 3/3 Lifelink Wurm; hero grafts retain its printed keywords.' },
});
export function traitOf(cardOrName) { const name=typeof cardOrName==='string'?cardOrName:cardOrName?.name;return GRAFT_TRAITS[name] || null; }
export const GRAFT_TRAIT_IDS = new Set(Object.values(GRAFT_TRAITS).map(t=>t.id));
