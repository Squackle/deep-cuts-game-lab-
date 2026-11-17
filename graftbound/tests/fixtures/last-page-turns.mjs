// The owner's completed local expedition "The Last Page Turns" (v1.5.0), reconstructed from the supplied record.
// Only the fields shown on the end screen; used to test the Copy Run Stats report and the balance analysis.
const rows = [
  ['The Waking Glade', 0, 'tutorial', 6, 3, 0, 6, 1700], ['Moth-Lit Hollow', 0, 'battle', 6, 5, 1, 8, 1850], ['Gloam Coven', 0, 'elite', 8, 6, 0, 14, 2313],
  ['Bastion Ruins', 0, 'battle', 5, 6, 0, 8, 2000], ['Den of the Alpha', 0, 'elite', 6, 6, 0, 14, 2500], ['Nemata, Grove Guardian', 0, 'boss', 13, 8, 2, 20, 2594],
  ['Brute Gate', 1, 'battle', 8, 5, 3, 10, 1655], ['Cinder Run', 1, 'battle', 7, 6, 6, 10, 1674], ['Brute Gate', 1, 'battle', 5, 5, 3, 10, 1880],
  ["Champion's Pit", 1, 'elite', 5, 9, 6, 18, 2334], ['Obsidian Vigil', 1, 'elite', 5, 7, 1, 18, 2473], ['Krenko, Mob Boss', 1, 'boss', 7, 8, 3, 36, 2951],
  ['Shard Storm', 2, 'battle', 4, 6, 4, 10, 1840], ['Shard Storm', 2, 'battle', 5, 6, 2, 10, 1920], ['Sentinel Spire', 2, 'elite', 4, 9, 0, 18, 2500],
  ['Sentinel Spire', 2, 'elite', 7, 9, 5, 18, 2361], ['Toxrill, the Corrosive', 2, 'boss', 9, 8, 0, 48, 2900],
];
export const LAST_PAGE_TURNS = {
  phase: 'won', act: 2, worldThreat: { level: 11 }, evo: { power: 30, toughness: 31, keywords: {} },
  stats: { battlesWon: 17, bossesDefeated: 3, cardsAbsorbed: 10, spellsLearned: 11, kills: 85 },
  clock: { ms: (28 * 60 + 35) * 1000, byAct: [(11 * 60 + 47) * 1000, (8 * 60 + 42) * 1000, (8 * 60 + 5) * 1000] },
  scoring: { version: 1, completionBonus: 2500, encounters: rows.map(([name, act, nodeType, actions, parActions, damage, damageBudget, total], i) => ({
    key: `${act}:${i}`, act, nodeType, name, actions, parActions, damage, damageBudget, total, multiplier: 1 })) },   // per-encounter turns/bonuses were not in the record
};
