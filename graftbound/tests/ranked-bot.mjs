// Decision-emitting bot: plays a ranked expedition ONLY through applyDecision, recording the replay log.
import { applyDecision, startRanked } from '../src/engine/ranked.js';
import { availableNodes } from '../src/engine/campaign.js';
import { moveOptions, attackTargets, castOptions, player, enemies, interactOptions } from '../src/engine/combat.js';
import { resolveCard } from '../src/cards/catalog.js';
import { graftRating } from '../src/engine/power.js';
import { graftsFull } from '../src/engine/run.js';
import { eventChoices } from '../src/engine/events.js';
import { manhattan } from '../src/core/grid.js';
import { usefulStances } from '../src/engine/legal.js';
import './helpers.mjs';

export function nextBattleDecision(s) {
  const p = player(s);
  if(s.deck && ((s.deck.pendingDiscards||0)>0 || s.deck.hand.length>s.deck.capacity) && s.deck.hand.length)return {type:'discard',id:s.deck.hand.at(-1).id};
  for (const sp of s.spellbook) {
    const c = resolveCard(sp.id); const opts = castOptions(s, sp.id); if (!opts.length) continue;
    if (c.category === 'healing' && p.hp > p.maxHp * 0.6) continue;
    if (c.target === 'empty') continue;
    const t = opts.map(o => ({ o, u: enemies(s).find(e => e.x === o.x && e.y === o.y) })).sort((a, b) => (a.u ? a.u.hp : 99) - (b.u ? b.u.hp : 99))[0].o;
    return { type: 'cast', id: sp.id, x: t.x, y: t.y };
  }
  const io = interactOptions(s); if (io.length) return { type: 'interact', x: io[0].x, y: io[0].y };
  const at = attackTargets(s); if (at.length) return { type: 'attack', uid: at.sort((a, b) => a.hp - b.hp)[0].uid };
  const near = o => Math.min(...enemies(s).map(e => manhattan(o, e)));
  const mv = moveOptions(s).sort((a, b) => near(a) - near(b) || a.cost - b.cost || a.y - b.y || a.x - b.x)[0];
  if (mv && near(mv) < near(p)) return { type: 'move', x: mv.x, y: mv.y };
  const st = usefulStances(s); if (st.includes('guard')) return { type: 'guard' }; if (st.includes('channel')) return { type: 'channel' };
  return { type: 'end' };
}
export function nextDecision(run) {
  if (run.phase === 'map') { const o = availableNodes(run.map, run.current); return { type: 'node', node: (o.find(n => n.type === 'shrine') || o.find(n => n.type === 'event') || o[0]).id }; }
  if (run.phase === 'battle') return nextBattleDecision(run.battle);
  if (run.phase === 'shrine') { const o = run.shrine.options; const k = ['spark', 'restoration', 'arcane', 'offering'].find(x => o.includes(x)) || o[0]; return { type: 'shrine', choice: k, ...(k === 'inscribe' ? { arg: run.spellbook.find(s => s.level < 3).id } : k === 'graftsmith' ? { arg: 0 } : {}) }; }
  if (run.phase === 'event') { const ch = eventChoices(run, run.event.id).filter(c => c.available); const c = ch.find(x => x.id !== 'leave' && !x.arg) || ch.find(x => x.id === 'leave'); return { type: 'event', choice: c.id }; }
  if (run.phase === 'reward') {
    const ids = run.pending.cards.slice().sort((a, b) => score(run, resolveCard(b)) - score(run, resolveCard(a)));
    const ok = ids.filter(id => !(run.pending.tier === 'graftsmith' && resolveCard(id).kind !== 'creature') && !(run.pending.tier === 'archivist' && resolveCard(id).kind !== 'spell'));
    const id = ok[0]; if (!id) return { type: 'skip' };
    const c = resolveCard(id); return { type: 'reward', card: id, ...(c.kind === 'creature' && graftsFull(run) ? { release: 0 } : {}) };
  }
  return null;
}
const score = (run, c) => c.kind === 'creature' ? graftRating(c, run.evo) : (c.category === 'damage' ? 4.5 : 3) - (run.spellbook.length >= 4 ? 3 : 0);

export function playRanked({ id, limit = 3000, onDecision } = {}) {
  let run = startRanked(id); const log = [];
  while (run.phase !== 'won' && run.phase !== 'lost' && log.length < limit) {
    const d = { seq: run.ranked.seq, ...nextDecision(run) };
    if (onDecision) onDecision(run, d);
    applyDecision(run, d); log.push(d);
  }
  return { run, log };
}
