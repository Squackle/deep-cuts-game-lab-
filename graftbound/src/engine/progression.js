// Permanent, between-run progression: statistics, achievements, unlocks, settings. Never auto-resets.
export const META_VERSION = 5;
export const DEFAULT_SETTINGS = { sound: true, music: true, graphics: 'auto', animSpeed: 'normal', autoEnd: true, ambient: true };
export function newMeta() {
  return {
    v: META_VERSION, tutorialDone: false, introSeen: false, hints: {}, seen: {}, achievements: {}, unlocks: {},
    stats: { runs: 0, wins: 0, losses: 0, battlesWon: 0, cardsAbsorbed: 0, spellsCast: 0, kills: 0, bestDepth: 0, bestAct: 0, highestPower: 1, highestToughness: 1 },
    settings: { ...DEFAULT_SETTINGS },
    records: {},   // v0.6 LOCAL personal records (unverified; never uploaded)
  };
}
export const ACHIEVEMENTS = [
  { id: 'first_blood',   name: 'First Ink',          text: 'Win your first battle.',                        test: c => c.event === 'battleWon' },
  { id: 'clean_page',    name: 'Clean Page',         text: 'Win a battle without losing health.',           test: c => c.event === 'battleWon' && c.battleStats.damageTaken === 0 },
  { id: 'pure_magic',    name: 'Marginalia',         text: 'Win a battle without making an attack.',        test: c => c.event === 'battleWon' && c.attacks === 0 },
  { id: 'alpha_down',    name: 'Gloam Breaker',      text: 'Defeat an Elite Lair.',                         test: c => c.event === 'battleWon' && c.elite },
  { id: 'thornmother',   name: 'Heartwood Fallen',   text: 'Defeat the Thornmother.',                       test: c => c.event === 'bossDown' && c.act === 0, unlock: 'act1' },
  { id: 'matron',        name: 'Ashes to Ashes',     text: 'Defeat the Pyre Matron.',                       test: c => c.event === 'bossDown' && c.act === 1, unlock: 'act2' },
  { id: 'unwritten',     name: 'The Last Page',      text: 'Defeat the Unwritten and finish the adventure. Unlocks challenges.', test: c => c.event === 'runWon', unlock: 'firstVictory' },
  { id: 'lethal_step',   name: 'Lethal Footprint',   text: 'Possess Deathtouch and Trample together.',      test: c => c.evo && c.evo.keywords.deathtouch && c.evo.keywords.trample },
  { id: 'night_wing',    name: 'Night on the Wing',  text: 'Possess Flying and Deathtouch together.',       test: c => c.evo && c.evo.keywords.flying && c.evo.keywords.deathtouch },
  { id: 'titan',         name: 'Titan of the Graft', text: 'Reach 10 power in a single run.',               test: c => c.evo && c.evo.power >= 10 },
  { id: 'resonant',      name: 'Resonance',          text: 'Graft an ability you already have.',            test: c => c.evo && c.evo.resonance > 0 },
  { id: 'chimera',       name: 'Chimera',            text: 'Graft creatures of four different colors.',     test: c => c.evo && Object.keys(c.evo.colors).length >= 4 },
  { id: 'paper_crown',   name: 'Paper Crown',        text: 'Win a run on the Paper Thin challenge.',        test: c => c.event === 'runWon' && c.run.challenges.includes('paperThin') },
];
export function evaluateAchievements(meta, ctx) {
  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.achievements[a.id]) continue;
    let ok = false; try { ok = !!a.test(ctx); } catch { ok = false; }
    if (ok) { meta.achievements[a.id] = Date.now(); if (a.unlock) meta.unlocks[a.unlock] = true; earned.push(a); }
  }
  return earned;
}
export function recordRunEnd(meta, run, won) {
  const s = meta.stats;
  s.runs++; if (won) s.wins++; else s.losses++;
  s.battlesWon += run.stats.battlesWon; s.cardsAbsorbed += run.stats.cardsAbsorbed; s.spellsCast += run.stats.spellsCast; s.kills += run.stats.kills;
  const depth = run.current != null ? run.map.nodes.find(n => n.id === run.current).depth : 0;
  s.bestDepth = Math.max(s.bestDepth, (run.act || 0) * 8 + depth); s.bestAct = Math.max(s.bestAct || 0, run.act || 0);
  s.highestPower = Math.max(s.highestPower, run.evo.power); s.highestToughness = Math.max(s.highestToughness, run.evo.toughness);
}
