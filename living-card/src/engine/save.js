// Versioned, validated local saves with migration and a last-good backup. Storage is injectable for tests.
// Storage keys keep the internal `livingcard` prefix (the directory/route is still /living-card/).
import { resolveCard } from '../cards/catalog.js';
import { KEYWORDS } from '../data/keywords.js';
import { RUN_VERSION } from './run.js';
import { META_VERSION, newMeta, DEFAULT_SETTINGS } from './progression.js';
import { STARTING_NAME } from './evolution.js';

export const KEYS = { run: 'deepcutsedh.livingcard.run', meta: 'deepcutsedh.livingcard.meta' };
const BAK = '.bak', BAD = '.corrupt';

function checksum(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0; return h.toString(36); }
function wrap(v, data) { const json = JSON.stringify(data); return JSON.stringify({ v, sum: checksum(json), data: json }); }
function unwrap(raw) {
  const env = JSON.parse(raw);
  if (!env || typeof env.data !== 'string' || typeof env.v !== 'number') throw new Error('malformed save');
  if (checksum(env.data) !== env.sum) throw new Error('checksum mismatch');
  return { v: env.v, data: JSON.parse(env.data) };
}
const isNum = n => typeof n === 'number' && Number.isFinite(n);

/** Ordered migrations: RUN_MIGRATIONS[n] upgrades a v(n) run to v(n+1). */
export const RUN_MIGRATIONS = {
  1: r => {
    r.v = 2; r.name = r.name || STARTING_NAME; r.contentMode = 'original';
    if (r.battle) { r.battle.v = 2; for (const u of r.battle.units) if (u.side === 'player' && u.hero === undefined) u.hero = u.defId === 'player'; const h = r.battle.units.find(u => u.hero); if (h) h.name = r.name; }
    if (r.evo) for (const a of r.evo.absorbed || []) if (!a.name) { const c = resolveCard(a.cardId); a.name = c ? c.name : a.cardId; }
    if (r.evo && r.evo.parts) { const p = r.evo.parts;
      for (const [from, to] of [['venomSacs', 'venom'], ['fangs', 'claws'], ['longNeck', 'beak']]) if (p[from]) { p[to] = (p[to] || 0) + p[from]; delete p[from]; }
      for (const gone of ['legs', 'wideMouth']) delete p[gone]; }
    return r;
  },
};
export const META_MIGRATIONS = {
  1: m => { m.v = 2; m.settings = { ...DEFAULT_SETTINGS, ...(m.settings || {}), contentMode: 'original' }; return m; },
  2: m => { m.v = 3; m.settings = { ...(m.settings || {}), contentMode: 'reference' }; return m; },
};
export function migrate(data, from, to, table) {
  let v = from;
  while (v < to) { if (!table[v]) throw new Error('no migration from v' + v); data = table[v](data); v++; }
  if (v > to) throw new Error('save is from a newer version (v' + v + ')');
  return data;
}

export function validateRun(r) {
  const errs = [];
  if (!r || r.v !== RUN_VERSION) errs.push('version');
  const e = r && r.evo;
  if (!e || !isNum(e.power) || !isNum(e.toughness) || e.toughness < 1 || e.power < 0) errs.push('evo stats');
  if (e) {
    for (const [k, v] of Object.entries(e.keywords || {})) if (!KEYWORDS[k] || !isNum(v)) errs.push('keyword ' + k);
    for (const a of e.absorbed || []) if (!resolveCard(a.cardId)) errs.push('card ' + a.cardId);
  }
  if (!Array.isArray(r && r.spellbook) || r.spellbook.some(s => !resolveCard(s.id) || !isNum(s.level))) errs.push('spellbook');
  if (!r || !r.map || !Array.isArray(r.map.nodes) || !r.map.nodes.length) errs.push('map');
  if (r && !['map', 'battle', 'reward', 'shrine', 'won', 'lost'].includes(r.phase)) errs.push('phase');
  if (r && r.phase === 'battle' && (!r.battle || !Array.isArray(r.battle.units) || !r.battle.units.some(u => u.hero))) errs.push('battle');
  if (r && r.phase === 'reward' && (!r.pending || !Array.isArray(r.pending.cards) || !r.pending.cards.every(resolveCard))) errs.push('reward');
  return errs;
}

export function createStore(storage) {
  const loadRunFrom = raw => {
    const { v, data } = unwrap(raw);
    const run = migrate(data, v, RUN_VERSION, RUN_MIGRATIONS);
    const errs = validateRun(run); if (errs.length) throw new Error('invalid: ' + errs.join(', '));
    return { run, migrated: v !== RUN_VERSION };
  };
  return {
    saveRun(run) {
      if (!run) { const cur = storage.getItem(KEYS.run); if (cur) storage.setItem(KEYS.run + BAK, cur); storage.removeItem(KEYS.run); return; }
      const cur = storage.getItem(KEYS.run); if (cur) storage.setItem(KEYS.run + BAK, cur);
      storage.setItem(KEYS.run, wrap(RUN_VERSION, run));
    },
    loadRun() {
      const raw = storage.getItem(KEYS.run); if (!raw) return { run: null };
      try { return loadRunFrom(raw); }
      catch (err) {
        storage.setItem(KEYS.run + BAD, raw); storage.removeItem(KEYS.run);
        const bak = storage.getItem(KEYS.run + BAK);
        if (bak) { try { const r = loadRunFrom(bak); return { ...r, error: String(err.message || err), recovered: true }; } catch { /* fall through */ } }
        return { run: null, error: String(err.message || err) };
      }
    },
    saveMeta(meta) { storage.setItem(KEYS.meta, wrap(META_VERSION, meta)); },
    loadMeta() {
      const raw = storage.getItem(KEYS.meta); if (!raw) return newMeta();
      try {
        const { v, data } = unwrap(raw); const m = migrate(data, v, META_VERSION, META_MIGRATIONS); const d = newMeta();
        return { ...d, ...m, stats: { ...d.stats, ...m.stats }, settings: { ...d.settings, ...m.settings } };
      } catch { storage.setItem(KEYS.meta + BAD, raw); return newMeta(); }
    },
  };
}
export function memoryStorage() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; }
export const _internal = { wrap, checksum };
