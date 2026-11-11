// v0.6 explanations for tooltips, keyboard focus and mobile inspection. Every number is read from the live
// rules modules (data/terrain.js, ENEMIES, KEYWORDS, spells.js), never typed into a description string.
import { T, tileAt, reachable, pathTo, isFlying } from '../core/grid.js';
import { TERRAIN_RULES as R } from '../data/terrain.js';
import { riftsPulseThisRound, crystalAt, player } from './combat.js';

export function describeTile(s, x, y) {
  const t = tileAt(s, x, y), out = [];
  const add = (name, text, when, kind = 'info') => out.push({ name, text, when, kind });
  if (t === T.BRAMBLE) add('Brambles', `Thorny ground. Deals ${R.bramble.enterDamage} damage to a ground unit that enters it.`, 'When entered (fliers are immune). Fire burns brambles away.', 'hazard');
  if (t === T.LAVA) add('Lava', `Molten rock. Deals ${R.lava.enterDamage} damage on entry and ${R.lava.endTurnDamage} if you end your turn on it.`, 'On entry and at end of turn. Fliers are immune. Frost hardens it for ' + R.frost.coolRounds + ' rounds.', 'hazard');
  if (t === T.RIFT) add('Rift', `A tear in the world. Pulses for ${R.rift.pulseDamage} damage to whoever stands on it.`, `End of every ${R.rift.pulseEvery}nd round${s && riftsPulseThisRound(s) ? ' — it pulses THIS round' : ''}. Hits fliers too.`, 'hazard');
  if (t === T.LEYLINE) add('Leyline', `Ancient channel of power. Start your turn here for +${R.leyline.manaBonus} mana (may exceed your maximum by 1).`, 'At the start of your turn.', 'benefit');
  if (t === T.ROCK) add('Rock', 'Impassable for ground units. Fliers pass over it. Does not block spells.', 'Always.', 'info');
  const cooled = s && (s.cooled || []).find(c => c.i === y * s.w + x);
  if (cooled) add('Hardened lava', `Frost-cooled rock: safe to stand on; it melts back to lava at the end of round ${cooled.until}.`, 'Temporary.', 'benefit');
  const c = s && crystalAt(s, x, y);
  if (c) add('Magic crystal', c.charged ? `Attune while standing on or next to it: +${R.crystal.manaGain} mana (one action, once). A lightning spell that strikes within 1 tile makes it discharge ${R.crystal.dischargeDamage} damage to every foe within ${R.crystal.dischargeRadius} tile.` : 'Spent. Its charge is gone for this battle.', c.charged ? 'Once per battle.' : '—', c.charged ? 'benefit' : 'info');
  if (!out.length) add('Ground', 'Ordinary footing. No effect.', '—');
  return out;
}

/** Predicted hazard damage along the path the hero would take to (x, y), plus ending the turn there. */
export function pathWarning(s, x, y) {
  const p = player(s); if (!p || isFlying(p)) return null;
  const map = reachable(s, p, s.p.moveLeft); if (!map.has(x + ',' + y)) return null;
  const path = pathTo(map, x, y); let enter = 0; const tiles = [];
  for (let i = 1; i < path.length; i++) { const t = tileAt(s, path[i].x, path[i].y); const d = t === T.BRAMBLE ? R.bramble.enterDamage : t === T.LAVA ? R.lava.enterDamage : 0; if (d) { enter += d; tiles.push({ ...path[i], damage: d }); } }
  const end = tileAt(s, x, y);
  const endTurn = end === T.LAVA ? R.lava.endTurnDamage : (end === T.RIFT && riftsPulseThisRound(s)) ? R.rift.pulseDamage : 0;
  if (!enter && !endTurn) return null;
  const shield = p.statuses.shield || 0;
  return { enter, endTurn, tiles, shield, lethal: enter > 0 && enter - shield >= p.hp,
    text: [enter ? `This path crosses hazards: ${enter} damage${shield ? ` (your ${shield} shield absorbs first)` : ''}.` : '', endTurn ? `Ending your turn there costs ${endTurn} more.` : ''].filter(Boolean).join(' ') };
}
