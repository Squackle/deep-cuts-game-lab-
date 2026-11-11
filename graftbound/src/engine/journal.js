// v0.6 evolution journal: structured, compact history (never images). Appearance is rebuilt deterministically
// from graft lists, so before/after comparisons cost no storage.
import { deriveAppearance } from './appearance.js';
export const JOURNAL_CAP = 400;
export const newJournal = () => ({ v: 1, entries: [{ kind: 'start', act: 0, node: null, i: 0 }] });

export function journalNote(run, kind, data = {}) {
  const j = run.journal || (run.journal = newJournal());
  if (j.entries.length >= JOURNAL_CAP) return null;
  const e = { kind, act: run.act || 0, node: run.current ?? null, i: j.entries.length, ...data };
  if (kind === 'graft') {
    const hadKw = j.entries.some(x => x.kind === 'graft' && x.gained && x.gained.length);
    if (!hadKw && data.gained && data.gained.length) e.firstKeyword = data.gained[0];
    const stage = deriveAppearance(run.evo).stage;
    const prev = [...j.entries].reverse().find(x => x.stage); if (!prev || prev.stage !== stage) e.stage = stage;
  }
  j.entries.push(e); return e;
}

/** Graft history rows: every graft ever taken, in order, with whether it is still active. */
export function graftHistory(run) {
  const active = new Map(); for (const a of run.evo.absorbed) active.set(a.cardId, (active.get(a.cardId) || 0) + 1);
  const rows = (run.journal ? run.journal.entries : []).filter(e => e.kind === 'graft');
  const seen = new Map();
  return rows.map(r => { const n = (seen.get(r.cardId) || 0) + 1; seen.set(r.cardId, n); return { ...r, active: n <= (active.get(r.cardId) || 0) }; });
}
/** Rebuild journal entries for a pre-v0.6 run from its graft list (marked as reconstructed). */
export function reconstructJournal(run) {
  const j = newJournal();
  for (const a of (run.evo && run.evo.absorbed) || []) j.entries.push({ kind: 'graft', act: 0, node: null, i: j.entries.length, cardId: a.cardId, name: a.name, power: a.power, toughness: a.toughness, gained: a.gained || [], reconstructed: true });
  for (const s of run.spellbook || []) j.entries.push({ kind: 'spell', act: 0, node: null, i: j.entries.length, cardId: s.id, level: s.level, reconstructed: true });
  return j;
}
