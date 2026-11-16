// v1.6.0 expedition record -> shareable Markdown (for ChatGPT, Claude, Discord or bug reports).
// Pure and DOM-free. Reads ONLY gameplay results already shown on the end screen: no seeds, save keys, run ids,
// browser data, auth values or other internal identifiers. Score values are copied, never recomputed.
import { expeditionTotals } from './scoring.js';
import { ACTS } from '../data/encounters.js';
import { GAME } from '../config.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const n = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmt = v => (n(v) == null ? '—' : v.toLocaleString('en-US'));
export function formatMs(ms) {
  if (!n(ms) || ms < 0) return '—';
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s` : `${m}m ${String(sec).padStart(2, '0')}s`;
}
const hasAll = (e, k) => e.length && e.every(x => n(x[k]) != null);
const cell = v => String(v ?? '—').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

/** Derived balance metrics with explicit definitions. Missing data (older saves) yields null, never a guess. */
export function derivedMetrics(run) {
  const e = run?.scoring?.encounters || [];
  const has = k => e.length && e.every(x => n(x[k]) != null);
  const sum = k => e.reduce((a, x) => a + (n(x[k]) || 0), 0);
  const par = sum('parActions'), budget = sum('damageBudget');
  const bosses = e.filter(x => x.nodeType === 'boss');
  return {
    encounters: e.length,
    enemyDamage: has('enemyDamage') ? sum('enemyDamage') : null,
    flawless: has('enemyDamage') ? e.filter(x => x.enemyDamage === 0).length : e.filter(x => x.damage === 0).length,
    flawlessBasis: has('enemyDamage') ? 'enemy-caused health loss' : 'recorded damage',
    bossesFlawless: bosses.length ? bosses.filter(x => (has('enemyDamage') ? x.enemyDamage : x.damage) === 0).length : 0,
    bosses: bosses.length,
    actionsVsPar: par ? +(sum('actions') / par).toFixed(2) : null,
    damageVsReference: budget ? +(sum('damage') / budget).toFixed(2) : null,
    turnsPerEncounter: has('turns') ? +(sum('turns') / e.length).toFixed(1) : null,
    threatPath: e.some(x => n(x.threat) != null) ? e.map(x => (n(x.threatAfter) != null ? `${x.threat ?? '?'}→${x.threatAfter}` : `${x.threat ?? '?'}`)) : null,
  };
}

/** The complete record as Markdown. `opts`: { won, earned: [{name,text}], newBest, verifiedLocally }. */
export function runStatsMarkdown(run, opts = {}) {
  const won = opts.won ?? run?.phase === 'won', s = run?.stats || {}, t = expeditionTotals(run || {}), e = run?.scoring?.encounters || [];
  const act = n(run?.act) ?? 0, threat = n(run?.worldThreat?.level), d = derivedMetrics(run || {}), c = run?.clock;
  const L = [];
  L.push(`# ${GAME.title} — ${won ? 'The Last Page Turns' : 'The Graft Unravels'}`);
  L.push(won ? '_You began as nothing. The final guardian could not stop what you became._' : `_Fell in Act ${ROMAN[act]} · ${ACTS[act]?.name || ''}._`);
  L.push('');
  L.push(`- **Result:** ${won ? 'Expedition completed' : 'Defeated'} · ${run?.ranked ? `RANKED preview · ${cell(run.ranked.challengeId)} rev ${cell(run.ranked.revision)} · ${opts.verifiedLocally ? 'replay verified locally' : 'not verified'}` : 'Local · unranked (not submitted)'}`);
  L.push(`- **Version:** ${GAME.version}${run?.ranked?.rulesVersion ? ` · rules ${run.ranked.rulesVersion}` : ''}`);
  L.push(`- **Final Global Threat:** ${threat == null ? '—' : `${threat}/12`}`);
  L.push(`- **Final form:** ${fmt(run?.evo?.power)}/${fmt(run?.evo?.toughness)}${Object.keys(run?.evo?.keywords || {}).length ? ` · ${Object.keys(run.evo.keywords).join(', ')}` : ''}`);
  L.push(`- **Battles won:** ${fmt(s.battlesWon)} · **Bosses defeated:** ${fmt(s.bossesDefeated ?? 0)} · **Foes defeated:** ${fmt(s.kills)}`);
  L.push(`- **Creatures grafted:** ${fmt(s.cardsAbsorbed)} · **Spells learned:** ${fmt(s.spellsLearned)}`);
  L.push(`- **Time:** ${c ? formatMs(c.ms) : 'not recorded'}${c?.partial ? ' (partial)' : ''}${(c?.byAct || []).some(x => x > 0) ? ' · ' + c.byAct.map((ms, i) => (ms > 0 ? `Act ${ROMAN[i]} ${formatMs(ms)}` : null)).filter(Boolean).join(' · ') : ''}`);
  L.push(`- **Total score:** ${fmt(t.total)}${opts.newBest ? ' · ★ new local personal best' : ''}`);
  L.push('');
  L.push('## Encounters');
  if (!e.length) L.push('_No scored encounters recorded._');
  else {
    L.push('| # | Act | Encounter | Actions/par | Damage/ref | Enemy dmg | Turns | Threat | Eff. | Avoid. | Threat bonus | Score |');
    L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
    e.forEach((x, i) => L.push(`| ${i + 1} | ${ROMAN[x.act] ?? '?'} | ${cell(x.name)}${x.nodeType === 'boss' ? ' (boss)' : x.nodeType === 'elite' ? ' (elite)' : ''}${x.multiplier && x.multiplier !== 1 ? ` ×${x.multiplier}` : ''} | ${fmt(x.actions)}/${fmt(x.parActions)} | ${fmt(x.damage)}/${fmt(x.damageBudget)} | ${fmt(x.enemyDamage)} | ${fmt(x.turns)} | ${n(x.threat) == null ? '—' : n(x.threatAfter) == null ? x.threat : `${x.threat}→${x.threatAfter}`} | ${n(x.efficiency) == null ? '—' : '+' + fmt(x.efficiency)} | ${n(x.avoidance) == null ? '—' : '+' + fmt(x.avoidance)} | ${x.threatBonus ? '+' + fmt(x.threatBonus) : '—'} | ${fmt(x.total)} |`));
    if (t.completionBonus) L.push(`|  |  | Expedition completed bonus |  |  |  |  |  |  |  |  | +${fmt(t.completionBonus)} |`);
    L.push(`|  |  | **Total** | ${fmt(t.actions)} |  ${fmt(t.damage)} |  | ${hasAll(e, 'turns') ? fmt(t.turns) : '—'} |  |  |  |  | **${fmt(t.total)}** |`);
  }
  L.push('');
  L.push('## Balance metrics');
  L.push(`- Enemy-caused health lost: ${d.enemyDamage == null ? 'not recorded (older run)' : fmt(d.enemyDamage)} _(health removed by foes; excludes terrain and self-inflicted costs)_`);
  L.push(`- Flawless encounters: ${d.flawless}/${d.encounters} _(no ${d.flawlessBasis})_ · bosses flawless: ${d.bossesFlawless}/${d.bosses}`);
  L.push(`- Actions vs par: ${d.actionsVsPar ?? '—'} _(total actions ÷ total par; below 1 is faster than par)_`);
  L.push(`- Damage vs reference: ${d.damageVsReference ?? '—'} _(recorded damage ÷ total reference)_`);
  L.push(`- Turns per encounter: ${d.turnsPerEncounter ?? '—'}`);
  if (d.threatPath) L.push(`- Threat by encounter: ${d.threatPath.join(', ')} _(threat applied → threat after victory)_`);
  L.push('');
  const earned = opts.earned || [];
  L.push('## Achievements');
  L.push(earned.length ? earned.map(a => `- **${cell(a.name)}** — ${cell(a.text)}`).join('\n') : '_None earned this run._');
  return L.join('\n');
}

/** Clipboard with fallbacks: async Clipboard API, then a hidden textarea + execCommand. Returns true on success. */
export async function copyText(text, doc = typeof document !== 'undefined' ? document : null) {
  try { if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && (typeof isSecureContext === 'undefined' || isSecureContext)) { await navigator.clipboard.writeText(text); return true; } } catch {}
  if (!doc) return false;
  const ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); Object.assign(ta.style, { position: 'fixed', top: '-1000px', opacity: '0' });
  doc.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false; try { ok = doc.execCommand('copy'); } catch {}
  ta.remove(); return ok;
}
