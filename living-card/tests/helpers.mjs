import { createBattle, moveOptions, movePlayer, attackTargets, attack, castOptions, cast, endTurn, player, enemies, intents } from '../src/engine/combat.js';
import { newEvolution, absorb, deriveStats } from '../src/engine/evolution.js';
import { T, manhattan } from '../src/core/grid.js';

export function evoWith(...cards) { let e = newEvolution(); for (const c of cards) e = absorb(e, c).evo; return e; }
/** Hand-built arena. rows: '.' floor '#' rock '*' bramble '+' leyline 'P' player, letters = enemies per enemyMap */
export function arena(rows, enemyMap, { evo = newEvolution(), spellbook = [], seed = 1 } = {}) {
  const h = rows.length, w = rows[0].length, terrain = []; const en = []; let playerStart;
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    terrain.push(ch === '#' ? T.ROCK : ch === '*' ? T.BRAMBLE : ch === '+' ? T.LEYLINE : T.FLOOR);
    if (ch === 'P') playerStart = { x, y };
    else if (enemyMap[ch]) en.push({ defId: enemyMap[ch], x, y });
  }));
  return createBattle({ evo, stats: deriveStats(evo), spellbook, encounter: { name: 'test', w, h, terrain, playerStart, enemies: en }, seed });
}
/** Greedy bot for balance smoke tests. Returns 'won' | 'lost' | 'timeout'. */
export function botPlay(s, maxTurns = 40) {
  for (let t = 0; t < maxTurns; t++) {
    if (s.phase !== 'player') return s.phase;
    const danger = new Set(intents(s).flatMap(i => (i.kind === 'fire' || i.kind === 'slam') ? i.tiles.map(q => q.x + ',' + q.y) : []));
    for (const sp of s.spellbook) {
      if (['blink_step', 'call_sproutling'].includes(sp.id)) continue;
      const opts = castOptions(s, sp.id); if (!opts.length) continue;
      const tgt = opts.map(o => ({ o, u: enemies(s).find(e => e.x === o.x && e.y === o.y) })).sort((a, b) => (a.u ? a.u.hp : 99) - (b.u ? b.u.hp : 99))[0];
      cast(s, sp.id, tgt.o.x, tgt.o.y); if (s.phase !== 'player') return s.phase;
    }
    if (!attackTargets(s).length) {
      const opts = moveOptions(s).filter(o => !danger.has(o.x + ',' + o.y));
      const score = o => Math.min(...enemies(s).map(e => manhattan(o, e)));
      const best = opts.sort((a, b) => score(a) - score(b) || a.cost - b.cost)[0];
      if (best && score(best) < Math.min(...enemies(s).map(e => manhattan(player(s), e)))) movePlayer(s, best.x, best.y);
    }
    while (attackTargets(s).length && s.phase === 'player') attack(s, attackTargets(s).sort((a, b) => a.hp - b.hp)[0].uid);
    if (s.phase !== 'player') return s.phase;
    endTurn(s);
  }
  return s.phase === 'player' ? 'timeout' : s.phase;
}
