// Printed abilities: Wurmcoil Engine, Fallen Shinobi and The Scarab God.
// No simulated opponent library; all card movements refer to real encounter state.
// Pure and DOM-free. Every random outcome comes from a seeded, serialisable RNG stored on the battle.
// Encounter adaptations are labelled as such and never presented as exact Oracle text.
import { ENEMY_FACTS } from '../cards/enemy-facts.js';
import { ENEMIES } from '../data/enemies.js';
import { inBounds, tileAt, unitAt, T, DIRS } from '../core/grid.js';
import { player, enemies, alive, dealDamage, refreshTribalBonuses } from './abilities.js';
import { resolveCard } from '../cards/catalog.js';
import { effectOf, spellNumbers } from './spells.js';

/** Mana value of a printed cost string such as '{4}{R}{R}' (hybrid/phyrexian count as 1, X as 0). */
export function manaValue(cost = '') {
  let mv = 0;
  for (const [, sym] of String(cost).matchAll(/\{([^}]+)\}/g)) {
    if (/^\d+$/.test(sym)) mv += Number(sym);
    else if (sym !== 'X') mv += 1;
  }
  return mv;
}

export const SHINOBI_EXILE = 2, SCARAB_RECAST_COST = 5;
/** Wurmcoil Engine's simultaneous death-triggered two 3/3 tokens, deterministically placed. */
export function splitWurmcoil(s, ev, wurm) {
  if(wurm.defId!=='champion' || wurm.token || wurm.wurmSplit)return 0;
  wurm.wurmSplit=true;
  let count=0;
  for(const defId of ['wurmTouch','wurmLife']){
    const tile=openTileNear(s,wurm);
    if(!tile){ev.push({t:'realAbility',uid:wurm.uid,name:'Wurmcoil Engine · no safe tile for the remaining Wurm token'});break;}
    const u=spawnCard(s,defId,tile.x,tile.y);u.token=true;u.summoned=true;
    ev.push({t:'summon',uid:u.uid,defId,x:u.x,y:u.y,by:wurm.uid});count++;
  }
  ev.push({t:'realAbility',uid:wurm.uid,name:`Wurmcoil Engine · ${count} Wurm tokens (${count} of 2 spaces available)`});
  return count;
}

// ---------------------------------------------------------------- Fallen Shinobi
/** Called from dealDamage after combat damage from a Shinobi reaches the player's hero. */
export function resolveShinobiHit(s, ev, src, hero) {
  ev.push({ t: 'realAbility', uid: src.uid, name: 'Fallen Shinobi · exile the top two cards of your library' });
  if (!s.deck || !s.deck.library.length) { ev.push({ t: 'realAbility', uid: src.uid, name: 'Fallen Shinobi · your library is empty' }); return; }
  const exiled = s.deck.library.splice(0, SHINOBI_EXILE);
  s.deck.exile.push(...exiled);
  for (const card of exiled) {
    const c = resolveCard(card.id);
    ev.push({ t: 'shinobiExile', uid: src.uid, id: card.id, name: c?.name || card.id });
    // Adaptation: the opponent plays an exiled card for free only when it is a single-target damage spell,
    // aimed at your hero at printed strength (level 1, no Arcane). Anything else stays exiled unused.
    if (effectOf(card.id) === 'ember_dart' && alive(hero) && alive(src)) {
      const dmg = spellNumbers(card.id, 1, 0)[0];
      ev.push({ t: 'realAbility', uid: src.uid, name: `Fallen Shinobi plays ${c?.name || card.id} for free`, amount: dmg });
      dealDamage(s, ev, src, hero, dmg, { kind: 'shinobiSpell' });
    }
  }
}

// ---------------------------------------------------------------- The Scarab God
export const isZombie = u => !!(u && (u.zombie || u.defId === 'zombie' || /Zombie/.test(ENEMY_FACTS[u.defId]?.tribe || '')));

/** Upkeep: each opponent LOSES X life (not damage: shields/Guard don't apply) and the Scarab God scries X. */
export function scarabUpkeep(s, ev, god) {
  const hero = player(s);
  const x = enemies(s).filter(isZombie).length;
  if (x <= 0 || !alive(hero)) return 0;
  const before = hero.hp; hero.hp = Math.max(0, hero.hp - x);
  const lost = before - hero.hp; s.stats.damageTaken += lost;
  ev.push({ t: 'legendaryAbility', uid: god.uid, name: `The Scarab God · you lose ${x} life; foresight ${x} (adapted scry)`, amount: x });
  ev.push({ t: 'damage', uid: hero.uid, amount: lost, blocked: 0, kind: 'lifeLoss', src: god.uid });
  // Adaptation: the God announces an ominous, deterministic tactical read.
  // No hidden opponent library, phantom draws or fictional spell casting.
  s.scarabOmen=x; ev.push({t:'legendaryAbility',uid:god.uid,name:`The Scarab God · foresight ${x} (GRAFTBOUND adaptation)`});
  if (hero.hp <= 0 && s.phase !== 'won') { s.phase = 'lost'; ev.push({ t: 'defeat', kind: 'lifeLoss' }); }
  return lost;
}

/** Real battlefield corpses are the only reanimation targets; no simulated opponent library. */
export function scarabTargets(s, god) {
  const out = [];
  for (const u of s.units) if (u.hp <= 0 && !u.token && !u.exiled && !u.hero && !u.inHand && u !== god && ENEMIES[u.defId]) out.push({ from: 'battlefield', uid: u.uid, defId: u.defId });
  return out;
}

export function scarabReanimate(s, ev, god, target) {
  const tile = openTileNear(s, god); if (!tile) return null;
  if (target.from === 'battlefield') { const d = s.units.find(u => u.uid === target.uid); if (!d) return null; d.exiled = true; }
  else return null; // Only actual defeated creatures may be exiled.
  const u = spawnCard(s, target.defId, tile.x, tile.y);
  // Token copy, except 4/4 black Zombie. Printed abilities (and keywords) are kept; encounter Vitality is not.
  Object.assign(u, { power: 4, toughness: 4, hp: 4, maxHp: 4, legendaryVitality: 0, boss: false, token: true, zombie: true, summoned: true });
  u.name = `${ENEMY_FACTS[target.defId]?.name || ENEMIES[target.defId].name} (Zombie copy)`;
  ev.push({ t: 'summon', uid: u.uid, defId: target.defId, x: u.x, y: u.y, by: god.uid });
  ev.push({ t: 'legendaryAbility', uid: god.uid, name: `Exile ${ENEMY_FACTS[target.defId]?.name || target.defId} · create 4/4 Zombie copy` });
  refreshTribalBonuses(s, ev);
  return u;
}

/** Death trigger bookkeeping (called from kill()). Return happens at the beginning of the next end step. */
export function scarabDied(s, god) {
  if (god.defId !== 'scarab' || god.token) return;
  s.scarabReturn = { uid: god.uid, mana: god.bossMana ?? 3, x: god.x, y: god.y };
}
/** End step: The Scarab God returns to its owner's hand. If the opponent has no creatures left the encounter
 *  is already won and we do not model recasting it. */
export function resolveScarabEndStep(s, ev) {
  const r = s.scarabReturn; if (!r) return;
  s.scarabReturn = null;
  const god = s.units.find(u => u.uid === r.uid); if (!god) return;
  god.inHand = true; god.exiled = true;     // no longer a graveyard card
  s.scarabInHand = { mana: r.mana, x: r.x, y: r.y };
  ev.push({ t: 'legendaryAbility', uid: god.uid, name: 'The Scarab God returns to its owner\'s hand' });
}
/** Enemy-turn start: recast for {3}{U}{B} when the opponent's mana allows. Re-enters as printed 5/5, no Vitality. */
export function scarabRecast(s, ev) {
  const h = s.scarabInHand; if (!h || s.phase !== 'enemy' || !enemies(s).length) return;
  h.mana = Math.min(8, h.mana + 1);
  if (h.mana < SCARAB_RECAST_COST) { ev.push({ t: 'legendaryAbility', uid: 0, name: `The Scarab God waits in hand (${h.mana}/${SCARAB_RECAST_COST} mana)` }); return; }
  const tile = openTileNear(s, h) || openTileNear(s, enemies(s)[0]); if (!tile) return;
  s.scarabInHand = null;
  const u = spawnCard(s, 'scarab', tile.x, tile.y);
  Object.assign(u, { hp: 5, maxHp: 5, legendaryVitality: 0, bossMana: h.mana - SCARAB_RECAST_COST, recast: true });
  ev.push({ t: 'summon', uid: u.uid, defId: 'scarab', x: u.x, y: u.y, by: u.uid });
  ev.push({ t: 'legendaryAbility', uid: u.uid, name: 'The Scarab God is cast again (5/5)' });
}

// ---------------------------------------------------------------- helpers
function openTileNear(s, c) {
  const offs = [...DIRS, [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (let r = 1; r <= Math.max(s.w, s.h); r++) for (const [dx, dy] of offs) {
    const x = c.x + dx * r, y = c.y + dy * r;
    if (inBounds(s, x, y) && tileAt(s, x, y) !== T.ROCK && tileAt(s, x, y) !== T.LAVA && !unitAt(s, x, y)) return { x, y };
  }
  return null;
}
let spawnImpl = null;
/** ai.js registers spawnEnemy here to avoid a circular import. */
export function registerSpawn(fn) { spawnImpl = fn; }
function spawnCard(s, defId, x, y) { return spawnImpl(s, defId, x, y); }
