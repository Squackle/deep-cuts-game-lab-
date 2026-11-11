// v0.6 Ranked Expedition: deterministic challenge definitions, a versioned replay (decision log) format, and a
// rules-only verifier. Pure + DOM-free: the SAME module runs in the browser and in a Cloudflare Worker.
// The replay never carries damage, scores or random outcomes — only the player's accepted decisions.
import { newRun, enterNode, concludeBattle, chooseReward, skipReward, shrineChoice, eventChoice } from './run.js';
import { movePlayer, attack, cast, endTurn, interact } from './combat.js';
import { expeditionTotals } from './scoring.js';
import { SCORING_VERSION } from '../data/scoring.js';

export const RULES_VERSION = 'graftbound-rules-0.6.0';
export const CARD_POOL_VERSION = 'real-pool-63-v1';
export const REPLAY_VERSION = 1;
export const MAX_DECISIONS = 4000, MAX_SEGMENT = 400;

/** Fixed, versioned challenges. Seeds are authored here; servers never accept a client-chosen seed. */
export const RANKED_CHALLENGES = {
  'gb-expedition-01': { id: 'gb-expedition-01', revision: 1, name: 'The First Expedition', seed: 0x5eedcafe, tutorial: true,
    rulesVersion: RULES_VERSION, cardPoolVersion: CARD_POOL_VERSION, scoringVersion: SCORING_VERSION, status: 'active' },
};
export const ACTIVE_CHALLENGE = 'gb-expedition-01';

export function challengeFor(id, revision) {
  const c = RANKED_CHALLENGES[id];
  if (!c || (revision != null && c.revision !== revision)) throw new Error('Unknown or retired challenge');
  return c;
}
export function startRanked(id = ACTIVE_CHALLENGE) {
  const c = challengeFor(id);
  const run = newRun({ seed: c.seed, tutorial: c.tutorial, unlocks: {}, challenges: [] });
  run.startedAt = 0;   // timestamps never influence rules; keep the state byte-stable for checkpoints
  run.ranked = { challengeId: c.id, revision: c.revision, rulesVersion: c.rulesVersion, cardPoolVersion: c.cardPoolVersion, scoringVersion: c.scoringVersion, replay: REPLAY_VERSION, seq: 0 };
  return run;
}

const INT = v => Number.isSafeInteger(v) && v >= 0 && v < 1e6;
const ID = v => typeof v === 'string' && /^[a-z0-9:_-]{1,64}$/i.test(v);
const SHAPES = {
  node: { node: INT }, move: { x: INT, y: INT }, attack: { uid: INT }, cast: { id: ID, x: INT, y: INT }, interact: { x: INT, y: INT },
  end: {}, reward: { card: ID, release: v => v === undefined || INT(v) }, skip: {}, shrine: { choice: ID, arg: v => v === undefined || INT(v) || ID(v) },
  event: { choice: ID, arg: v => v === undefined || INT(v) || ID(v) },
};
/** Strict envelope validation: exact keys, typed values, contiguous sequence. */
export function validDecision(d, seq) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.seq !== seq || !SHAPES[d.type]) return false;
  const shape = SHAPES[d.type];
  for (const k of Object.keys(d)) if (k !== 'seq' && k !== 'type' && !(k in shape)) return false;
  return Object.entries(shape).every(([k, ok]) => ok(d[k]));
}

/** Apply ONE decision through the real engine. Throws on anything the engine would reject. */
export function applyDecision(run, d) {
  if (!run.ranked) throw new Error('Not a ranked run');
  if (!validDecision(d, run.ranked.seq)) throw new Error('Malformed or out-of-order decision ' + run.ranked.seq);
  if (run.phase === 'won' || run.phase === 'lost') throw new Error('Expedition already finished');
  const b = run.battle; const inBattle = run.phase === 'battle';
  const need = p => { if (run.phase !== p) throw new Error(`Decision ${d.type} not allowed during ${run.phase}`); };
  switch (d.type) {
    case 'node': need('map'); enterNode(run, d.node); break;
    case 'move': need('battle'); movePlayer(b, d.x, d.y); break;
    case 'attack': need('battle'); attack(b, d.uid); break;
    case 'cast': need('battle'); cast(b, d.id, d.x, d.y); break;
    case 'interact': need('battle'); interact(b, d.x, d.y); break;
    case 'end': need('battle'); endTurn(b); break;
    case 'reward': need('reward'); chooseReward(run, d.card, d.release); break;
    case 'skip': need('reward'); skipReward(run); break;
    case 'shrine': need('shrine'); shrineChoice(run, d.choice, d.arg); break;
    case 'event': need('event'); eventChoice(run, d.choice, d.arg); break;
  }
  if (inBattle && run.battle && (run.battle.phase === 'won' || run.battle.phase === 'lost')) concludeBattle(run);
  if (run.phase === 'reward' && run.pending && !run.pending.cards.length) { run.pending = null; run.phase = 'map'; }
  run.ranked.seq++;
  return run;
}

/** Replay a whole decision list from the authoritative challenge definition. */
export function replayRun(id, decisions, { revision, rulesVersion = RULES_VERSION } = {}) {
  if (rulesVersion !== RULES_VERSION) throw new Error('Rules version mismatch');
  if (!Array.isArray(decisions) || decisions.length > MAX_DECISIONS) throw new Error('Replay too long');
  const c = challengeFor(id, revision);
  let run = startRanked(c.id);
  for (const d of decisions) run = applyDecision(run, d);
  return { run, totals: expeditionTotals(run) };
}
/** Server checkpoint step: continue an authoritative run state with a bounded segment of new decisions. */
export function applySegment(checkpoint, decisions) {
  if (!Array.isArray(decisions) || !decisions.length || decisions.length > MAX_SEGMENT) throw new Error('Bad segment size');
  const run = structuredClone(checkpoint);
  if (run.ranked.rulesVersion !== RULES_VERSION) throw new Error('Rules version mismatch');
  for (const d of decisions) applyDecision(run, d);
  return { run, totals: expeditionTotals(run) };
}

/** Verified achievements derive ONLY from a server-replayed run. */
export const ACHIEVEMENT_IDS = ['first-graft', 'untouched-victory', 'efficient-hunter', 'hollow-conqueror', 'ashen-conqueror', 'unwritten-end', 'perfect-expedition', 'graftbound'];
export const PERFECT_EXPEDITION = { minAvgEfficiency: 480, maxTotalDamage: 60 };
export function verifiedAchievements(run) {
  const e = (run.scoring && run.scoring.encounters) || []; const t = expeditionTotals(run); const out = [];
  const boss = a => e.some(x => x.nodeType === 'boss' && x.act === a && x.total > 0);
  if (run.evo.absorbed.length || (run.journal && run.journal.entries.some(x => x.kind === 'graft'))) out.push('first-graft');
  if (e.some(x => x.total > 0 && x.damage === 0)) out.push('untouched-victory');
  if (e.some(x => x.total > 0 && x.actions <= x.parActions)) out.push('efficient-hunter');
  if (boss(0)) out.push('hollow-conqueror'); if (boss(1)) out.push('ashen-conqueror'); if (boss(2)) out.push('unwritten-end');
  if (t.completed) out.push('graftbound');
  const won = e.filter(x => x.total > 0);
  if (t.completed && won.length && won.reduce((a, x) => a + x.efficiency, 0) / won.length >= PERFECT_EXPEDITION.minAvgEfficiency && t.damage <= PERFECT_EXPEDITION.maxTotalDamage) out.push('perfect-expedition');
  return out;
}
