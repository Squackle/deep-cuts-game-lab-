// Damage, healing, statuses and keyword-driven combat resolution. Functions mutate battle state `s`
// and append presentation events to `ev`. No rendering, no randomness.
import { unitAt, T, tileAt, manhattan, isFlying } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { TERRAIN_RULES } from '../data/terrain.js';
import { hasAura, detachAura } from './attachments.js';
import { resolveShinobiHit, scarabDied, splitWurmcoil } from './printed-triggers.js';
import { onUnitDeath, onHeroHeal, skullclampDraw } from './trait-triggers.js';

export const has = (u, kw) => kw === 'flying' ? isFlying(u) : !u.shadowSuppressed?.[kw]&&!!(u.keywords && u.keywords[kw]);
const indestructible=u=>!u.shadowSuppressed?.indestructible&&!!(u.statuses?.indestructible||u.keywords?.indestructible);
export const kv = (u, kw) => (u.keywords && u.keywords[kw]) || 0;
export const alive = u => !!u && u.hp > 0;
export const player = s => s.units.find(u => u.hero);
export const allies = s => s.units.filter(u => u.side === 'player' && u.hp > 0);
export const enemies = s => s.units.filter(u => u.side === 'enemy' && u.hp > 0);
export const effectivePower = u => Math.max(0, u.power + (u.statuses.empowered || 0) - (u.statuses.weakened || 0));
/** Keep all printed Wolf/Minotaur static modifiers in sync as creatures enter/leave.
 * This is additive and deterministic, does not invent any extra creature keywords. */
export function refreshTribalBonuses(s,ev=[]) {
  if(!s?.units)return;
  const aliveUnits=s.units.filter(u=>u.hp>0);
  for(const u of aliveUnits){
    const same=aliveUnits.filter(v=>v.side===u.side);
    const tribe=ENEMIES[u.defId]?.tribe||'';
    const timber=u.defId==='hound'?same.filter(v=>v!==u&&v.defId==='hound').length:0;
    const ambush=tribe.includes('Wolf')?same.filter(v=>v!==u&&v.defId==='alpha').length:0;
    const minotaur=tribe.includes('Minotaur')?same.filter(v=>v!==u&&v.defId==='ashbrute').length:0;
    // Rageblood Shaman grants Trample only to OTHER Minotaurs while alive.
    if(tribe.includes('Minotaur')) {
      if(minotaur>0){
        if(!u.tribalTrample){u.originalTrample=!!u.keywords?.trample;u.tribalTrample=true;u.keywords.trample=1;}
      }else if(u.tribalTrample){
        u.tribalTrample=false;if(!u.originalTrample)delete u.keywords.trample;
      }
    }
    const total=timber+ambush+minotaur,delta=total-(u.tribalBonus||0);
    // Rageblood Shaman also grants Trample to OTHER Minotaurs. Preserve
    // printed/intrinsic Trample if the source leaves the battlefield.
    if(minotaur>0){if(!u.keywords.trample)u.tribalOnlyTrample=true;u.keywords.trample=1;}
    else if(u.tribalOnlyTrample){delete u.keywords.trample;u.tribalOnlyTrample=false;}
    if(!delta)continue;
    u.tribalBonus=total;u.power=Math.max(0,u.power+delta);u.toughness=Math.max(0,u.toughness+delta);
    // v1.5.0: marked damage persists when a bonus ends (simultaneous Pyroclasm on a pack resolves like the printed card).
    u.maxHp=Math.max(0,u.maxHp+delta);u.hp=Math.max(0,Math.min(u.maxHp,u.hp+delta));
    ev.push({t:'status',uid:u.uid,status:'tribal',value:total,total});
    if(u.hp<=0&&!u.deadResolved)kill(s,ev,u);
  }
}


/** Power used when `u` strikes `target`, including pack-flanking bonus. */
export function strikePower(s, u, target) {
  let p = effectivePower(u);
  const def = ENEMIES[u.defId];
  if (def && def.pack && target && s.units.some(o => o !== u && o.hp > 0 && o.side === u.side && manhattan(o, target) === 1)) p += 1;
  // v1.8.0 Pack tactics (Threat 19+): a foe striking while another foe also stands next to the target gets +1.
  else if (s.threatFlank && u.side === 'enemy' && target && s.units.some(o => o !== u && o.hp > 0 && o.side === 'enemy' && manhattan(o, target) === 1)) p += s.threatFlank;
  return p;
}
export function heal(s, ev, u, amount, kind = 'heal') {
  if (!alive(u) || !Number.isFinite(amount) || amount <= 0 || battleOver(s)) return 0;
  const h = Math.min(amount, Math.max(0, u.maxHp - u.hp));
  if (h > 0) { u.hp += h; ev.push({ t: 'heal', uid: u.uid, amount: h, kind }); }
  // r31: a positive hero gain is one event, independently of the RPG HP cap.
  // Ally healing is not player life gain; Vito sees the nominal amount.
  if (u.hero) {
    ev.push({ t: 'comboLifeGain', uid: u.uid, amount, restored: h, kind });
    onHeroHeal(s, ev, amount, kind);
  }
  return h;
}
export function addShield(s, ev, u, amount, kind = 'shield') {
  if (!alive(u) || amount <= 0) return;
  u.statuses.shield = (u.statuses.shield || 0) + amount;
  ev.push({ t: 'shield', uid: u.uid, amount, total: u.statuses.shield, kind });
}
export function addStatus(s, ev, u, status, value, { bySide = null } = {}) {
  if (!alive(u)) return;
  u.statuses[status] = (u.statuses[status] || 0) + value;
  if (status === 'poison' && bySide === 'enemy') u.poisonByEnemy = (u.poisonByEnemy || 0) + value;   // v1.7.0 attribution
  ev.push({ t: 'status', uid: u.uid, status, value, total: u.statuses[status] });
}
/** v1.5.0: the ONLY way a battle becomes won. Idempotent: one phase change, one 'victory' event, ever.
 * During a simultaneous batch (s.batchDepth > 0) victory is deferred until the batch and its deaths finish. */
export function declareVictory(s, ev) {
  if (s.phase === 'lost' || s.victoryDeclared) return false;
  if (s.batchDepth > 0) { s.victoryPending = true; return false; }
  s.victoryDeclared = true; s.victoryPending = false; s.phase = 'won'; ev.push({ t: 'victory' }); return true;
}
export const battleOver = s => s.phase === 'won' || s.phase === 'lost' || !!s.victoryDeclared;
const allEnemiesDown = s => s.units.every(e => e.side !== 'enemy' || e.hp <= 0);
/** v1.5.0 simultaneous resolution: every target is chosen from ONE snapshot, all damage is applied first, then
 * destruction/replacement and death triggers resolve in board order, then victory/defeat is checked once. */
export function damageBatch(s, ev, src, entries, opts = {}) {
  const list = entries.filter(([u]) => u && u.hp > 0);
  ev.push({ t: 'batch', kind: opts.kind || 'spell', uids: list.map(([u]) => u.uid) });
  s.batchDepth = (s.batchDepth || 0) + 1; const deferred = s.deferredDeaths || (s.deferredDeaths = []);
  let total = 0;
  try {
    for (const [u, amt] of list) total += dealDamage(s, ev, src, u, amt, opts) || 0;
  } finally { s.batchDepth--; }
  if (s.batchDepth === 0) {
    const due = deferred.splice(0);
    for (const [u, el] of due) if (u.hp <= 0 && !u.deadResolved) kill(s, ev, u, el);
    ev.push({ t: 'batchEnd' });
    if (s.victoryPending || (allEnemiesDown(s) && s.phase !== 'lost' && !s.victoryDeclared && list.some(([u]) => u.side === 'enemy'))) declareVictory(s, ev);
  }
  return total;
}
function kill(s, ev, u, element = null) {
  if (s.batchDepth > 0) { if (!s.deferredDeaths.some(([x]) => x === u)) s.deferredDeaths.push([u, element]); return; }
  if (u.deadResolved) return; u.deadResolved = true;
  ev.push({ t: 'death', uid: u.uid, element, phase:s.phase,turn:s.turn });
  onUnitDeath(s,ev,u);
  if(u.side==='player' && !u.hero && u.slime>0 && s.units.some(x=>x.defId==='toxrill'&&x.hp>0))s.pendingSlugs=(s.pendingSlugs||0)+1;
  if (u.side === 'enemy') {
    s.stats.kills++;
    const def = ENEMIES[u.defId];
    if(u.defId==='scarab') scarabDied(s,u);
    if(u.defId==='champion') splitWurmcoil(s,ev,u);
    if(u.defId==='cinderling') {
      // Mudbutton Torchrunner: 3 to any target, NOT an invented 2-damage explosion.
      const chosen=player(s);if(alive(chosen)) {
        ev.push({t:'realAbility',uid:u.uid,name:'Mudbutton Torchrunner · death trigger',target:chosen.uid});
        dealDamage(s,ev,u,chosen,3,{kind:'deathTrigger'});
      }
    }
    if(u.defId==='sentinel') {
      // Triplicate Titan's death trigger resolves immediately, before checking victory.
      // Place up to three tokens on nearby legal squares with deterministic ties.
      const forms=['golemFly','golemVigilance','golemTrample'];
      const available=[];
      for(let rad=0;rad<=Math.max(s.w,s.h);rad++)for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
        if(Math.abs(x-u.x)+Math.abs(y-u.y)!==rad)continue;
        if(tileAt(s,x,y)===T.ROCK||tileAt(s,x,y)===T.LAVA||unitAt(s,x,y))continue;
        available.push({x,y});
      }
      for(let i=0;i<3&&i<available.length;i++){
        const d=ENEMIES[forms[i]],tile=available[i];
        const golem={uid:s.nextUid++,side:'enemy',defId:forms[i],name:d.name,x:tile.x,y:tile.y,hp:d.toughness,maxHp:d.toughness,power:d.power,toughness:d.toughness,move:d.move,keywords:{...d.keywords},statuses:{},token:true};
        s.units.push(golem);ev.push({t:'summon',uid:golem.uid,defId:forms[i],x:tile.x,y:tile.y,by:u.uid,phase:s.phase,turn:s.turn,entryPower:golem.power});
      }
      ev.push({t:'realAbility',uid:u.uid,name:'Triplicate Titan · three Golems'});
    }
    if (def && def.burst) { // Legacy-only rules; new printed creature records clear this property.
      ev.push({ t: 'burst', uid: u.uid, x: u.x, y: u.y });
      damageBatch(s, ev, null, s.units.filter(o => o.hp > 0 && manhattan(o, u) === 1).map(o => [o, def.burst]), { kind: 'burst' });
    }
    refreshTribalBonuses(s,ev);
    if (allEnemiesDown(s)) declareVictory(s, ev);
  } else if (u.hero && !s.victoryDeclared && s.phase !== 'lost') { s.phase = 'lost'; ev.push({ t: 'defeat' }); }
}
/** A legal voluntary sacrifice still uses the authoritative death trigger pipeline. */
export function sacrificeAlly(s,ev,u){
  if(!u||u.hero||u.side!=='player'||!alive(u))throw new Error('Choose a living summoned ally');
  u.hp=0;kill(s,ev,u);return u;
}
/** State-based actions: creature with zero Toughness dies even without receiving damage.
 * This is required for printed -1/-1 counter and Aura interactions. */
export function checkStateBasedDeath(s, ev, u) {
  if (u && !u.deadResolved && u.toughness <= 0) { u.hp = 0; kill(s, ev, u); return true; }
  return false;
}
/** Attachment modifiers may already have set HP to zero; never revive a dead bearer. */
export function resolveAttachmentDeath(s,ev,u){if(u&&!u.deadResolved&&(u.hp<=0||u.toughness<=0)){u.hp=0;kill(s,ev,u);return true;}return false;}
/** Damage pipeline: strike cap (bosses) -> armor (combat only) -> shield -> health.
 *  Only combat damage (strikes/counterblows) triggers Deathtouch and Lifelink; spells bypass armor. */
export function dealDamage(s, ev, src, tgt, amount, { combat = false, kind = 'hit', element = null, cause = null, lifelinkGroup = null } = {}) {
  if (!alive(tgt) || amount <= 0) return 0;
  let a = amount;
  // Explicit per-enemy affinity only. Never grant automatic same-color resistance to all foes.
  // Applies to spell damage, not poison, falling terrain, ordinary attacks or burst explosions.
  const affinity = kind === 'spell' && src?.side === 'player' && tgt.side === 'enemy' && element ? ENEMIES[tgt.defId]?.affinity : null;
  if (affinity?.resist === element) {
    const blocked = Math.min(a, 1); a -= blocked;
    if (blocked) ev.push({ t: 'resisted', uid: tgt.uid, amount: blocked, element });
  } else if (affinity?.weak === element) {
    a++; ev.push({ t: 'weakpoint', uid: tgt.uid, amount: 1, element });
  }
  if (a <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return 0; }
  const cap = combat && ENEMIES[tgt.defId] && ENEMIES[tgt.defId].strikeCap;
  if (cap && a > cap) { ev.push({ t: 'capped', uid: tgt.uid, from: a, to: cap }); a = cap; }
  // Healing Salve: prevent the next 3 damage this turn before reducing finite shields or health.
  const saved = Math.min(a, tgt.statuses?.damagePrevention || 0);
  if (saved) {
    tgt.statuses.damagePrevention -= saved; a -= saved;
    ev.push({ t: 'prevented', uid: tgt.uid, amount: saved });
  }
  if (a <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return 0; }
  // Guard is an ordinary finite shield pool; no per-hit subtraction remains.
  const armor = combat ? kv(tgt, 'armor') : 0;
  if (armor) { const cut = Math.min(armor, a); a -= cut; if (cut) ev.push({ t: 'armored', uid: tgt.uid, amount: cut }); }
  if (a <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return 0; }
  // Dauntless Escort may sacrifice itself to give all other allies Indestructible
  // until end of turn when a legal lethal attack or spell threatens a creature.
  if(tgt.side==='enemy' && src?.side==='player' && tgt.defId!=='tortoise' &&
     !indestructible(tgt) && a>(tgt.statuses.shield||0) && a-(tgt.statuses.shield||0)>=tgt.hp){
    const escort=enemies(s).find(u=>u.defId==='tortoise'&&u!==tgt);
    if(escort){
      escort.hp=0;ev.push({t:'realAbility',uid:escort.uid,name:'Dauntless Escort · sacrifice for indestructible'});
      kill(s,ev,escort);
      for(const ally of enemies(s)) {if(ally.shadowSuppressed)ally.shadowSuppressed.indestructible=false;ally.statuses.indestructible=1;ev.push({t:'status',uid:ally.uid,status:'indestructible',value:1});}
    }
  }
  const sh = tgt.statuses.shield || 0;
  const blocked = Math.min(sh, a);
  if (blocked) { tgt.statuses.shield = sh - blocked; tgt.statuses.guardShield = Math.max(0, (tgt.statuses.guardShield || 0) - blocked); a -= blocked; }
  const hpBefore = tgt.hp;
  // Legendary bosses resist the instant-destroy clause of Deathtouch.
  // Ordinary creatures still die to it; bosses take printed combat damage
  // (plus the separately disclosed GRAFTBOUND boss chip bonus in strike()).
  const bossResistsTouch = !!(combat && src && has(src, 'deathtouch') && a > 0 && (tgt.boss || tgt.hero));
  if (bossResistsTouch) ev.push({ t: 'deathtouchResisted', uid: tgt.uid, src: src.uid });
  // v1.4.0: the hero is the player's life total, not a creature card — enemy Deathtouch deals its damage (+2), never instant death.
  const dt = combat && src && has(src, 'deathtouch') && a > 0 && !tgt.boss && !tgt.hero;
  tgt.hp = dt ? 0 : Math.max(0, tgt.hp - a);
  if(indestructible(tgt) && tgt.toughness>0 && tgt.hp<=0){tgt.hp=1;ev.push({t:'indestructible',uid:tgt.uid});}
  const lost = hpBefore - tgt.hp;
  ev.push({ t: 'damage', uid: tgt.uid, amount: a, blocked, deathtouch: dt, kind, element, src: src ? src.uid : null });
  if (src && src.side === 'player' && tgt.side === 'enemy') s.stats.damageDealt += lost;
  // v1.7.0 attribution: only ENEMY-caused health loss restrains Global Threat — a foe source, or an explicit cause:'enemy'
  // (foe-created hazards, foe-inflicted poison). Self-damage, own spells/allies and neutral terrain never count.
  // v1.8.1: a foe's death trigger (e.g. Mudbutton Torchrunner) is the unavoidable RESULT of killing it. It still removes
  // HP and counts as damage taken (scoring), but is tracked separately and does NOT count against Global Threat.
  if (tgt.hero) { s.stats.damageTaken += lost;
    if (kind === 'deathTrigger') s.stats.deathTriggerHp = (s.stats.deathTriggerHp || 0) + lost;
    else if (src?.side === 'enemy' || (!src && cause === 'enemy')) s.stats.enemyHealthDamage = (s.stats.enemyHealthDamage || 0) + lost; }
  // Real infect replaces health damage with poison counters against a player.
  // Against creatures, damage is represented by persistent -1/-1 counters.
  if(combat && src?.keywords?.infect && a>0){
    if(tgt.hero){
      tgt.hp=hpBefore;s.stats.damageTaken=Math.max(0,s.stats.damageTaken-lost);
      if(src.side==='enemy'&&kind!=='deathTrigger')s.stats.enemyHealthDamage=Math.max(0,(s.stats.enemyHealthDamage||0)-lost);
      s.poisonCounters=(s.poisonCounters||0)+a;
      ev.push({t:'poisonCounter',uid:tgt.uid,amount:a,total:s.poisonCounters});
      if(s.poisonCounters>=10){s.phase='lost';ev.push({t:'defeat',kind:'poison'});}
      return 0;
    }
    if(tgt.side!=='player'||!tgt.hero){
      tgt.hp=hpBefore;
      tgt.power=Math.max(0,tgt.power-a);tgt.toughness=Math.max(0,tgt.toughness-a);
      tgt.maxHp=Math.max(0,tgt.maxHp-a);tgt.hp=Math.min(tgt.hp,tgt.maxHp);
      tgt.minusCounters=(tgt.minusCounters||0)+a;
      ev.push({t:'minusCounter',uid:tgt.uid,amount:a,total:tgt.minusCounters});
      if(tgt.hp<=0)kill(s,ev,tgt);
      return 0;
    }
  }
  if (combat && src && has(src, 'lifelink') && lost > 0) {
    if (lifelinkGroup) lifelinkGroup.amount += lost;
    else heal(s, ev, src, lost, 'lifelink');
  }
  // Fallen Shinobi: combat damage to the player exiles their top two library cards (printed trigger).
  // Only when the Shinobi is the attacker; striking back as a blocker ('counter') is not damage to a player.
  if (combat && src?.side === 'enemy' && src.defId === 'riftstalker' && kind !== 'counter' && tgt.hero && lost > 0 && s.phase !== 'lost') resolveShinobiHit(s, ev, src, tgt);
  // Destruction replacement effects resolve before defeat. Never rewrite printed +P/+T.
  if(tgt.hp<=0 && tgt.toughness>0 && hasAura(tgt,'mtg:hyena-umbra') && (combat||kind==='spell'||kind==='arrow')){
    detachAura(tgt,'mtg:hyena-umbra');tgt.hp=tgt.maxHp;ev.push({t:'auraBreak',uid:tgt.uid,id:'mtg:hyena-umbra'});
  } else if(tgt.hp<=0 && hasAura(tgt,'mtg:gift-of-immortality') && !tgt.token && tgt.toughness>0){
    ev.push({t:'death',uid:tgt.uid,kind:'gift'});skullclampDraw(s,ev,tgt);
    detachAura(tgt,'mtg:gift-of-immortality');tgt.hp=tgt.maxHp;
    (s.pendingAuras ||= []).push({uid:tgt.uid,id:'mtg:gift-of-immortality'});
    ev.push({t:'revive',uid:tgt.uid,kind:'gift',hp:tgt.hp});
  } else if(tgt.hp <= 0) kill(s, ev, tgt, element);
  return lost;
}
/** Target player life loss (GRAFTBOUND foe-proxy adaptation), NOT damage: ignores armor, shield,
 * prevention and deathtouch, does not count as damage dealt, and still resolves death/victory. */
export function loseLife(s, ev, src, tgt, amount, kind = 'lifeLoss') {
  if (!alive(tgt) || !Number.isFinite(amount) || amount <= 0) return 0;
  const lost = Math.min(tgt.hp, Math.floor(amount));
  tgt.hp -= lost;
  ev.push({ t: 'lifeLoss', uid: tgt.uid, amount: lost, src: src?.uid || null, kind });
  if (tgt.hp <= 0) kill(s, ev, tgt);
  return lost;
}
/** One combat strike. dir = [dx,dy] of the attack (used by Trample). */
export function strike(s, ev, src, tgt, dir, kind = 'strike') {
  if (!alive(src) || !alive(tgt)) return;
  let amt = strikePower(s, src, tgt);
  if (has(src, 'deathtouch') && (tgt.boss || tgt.hero) && amt > 0) amt += 2; // Explicit Legendary Vitality adaptation: chip damage, not destruction.
  if (amt <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return; }
  const cap = ENEMIES[tgt.defId] && ENEMIES[tgt.defId].strikeCap;
  const shield = tgt.statuses.shield || 0, armor = kv(tgt, 'armor');
  const lethal = armor + shield + (has(src, 'deathtouch') && !tgt.legendary && !tgt.boss && !tgt.hero ? 1 : tgt.hp);
  const excess = Math.min(amt, cap || Infinity) - lethal;
  const tx = tgt.x, ty = tgt.y;
  const trample = has(src, 'trample') && excess > 0 && dir;
  const next = trample ? unitAt(s, tx + dir[0], ty + dir[1]) : null;
  // One strike, including its overflow, is one hero lifelink transaction.
  // Delay death resolution only for this simultaneous damage transaction so the
  // gain occurs before terminal victory and cannot be duplicated by overflow.
  const group = src.hero && has(src, 'lifelink') && next && next.side !== src.side ? { amount: 0 } : null;
  if (group) { s.batchDepth = (s.batchDepth || 0) + 1; s.deferredDeaths ||= []; }
  try {
    dealDamage(s, ev, src, tgt, amt, { combat: true, kind, lifelinkGroup: group });
    if (trample && tgt.hp <= 0 && alive(src)) {
      const behind = unitAt(s, tx + dir[0], ty + dir[1]);
      if (behind && behind.side !== src.side) {
        ev.push({ t: 'trample', uid: src.uid, target: behind.uid, amount: excess });
        dealDamage(s, ev, src, behind, excess, { combat: true, kind: 'trample', lifelinkGroup: group });
      }
    }
    if (group?.amount) heal(s, ev, src, group.amount, 'lifelink');
  } finally {
    if (group && --s.batchDepth === 0) {
      const due = s.deferredDeaths.splice(0);
      for (const [u, el] of due) if (u.hp <= 0 && !u.deadResolved) kill(s, ev, u, el);
      if (s.victoryPending) declareVictory(s, ev);
    }
  }
}
/** Why a defender cannot strike back (null = it can). Used by rules AND by UI explanations. */
export function counterBlocked(atk, def, melee) {
  if (!melee) return 'ranged';
  if (!alive(def)) return 'dead';
  if(def.tapped)return 'tapped';
  if(hasAura(def,'mtg:pacifism'))return 'pacifism';
  if(atk.championLambholt && atk.side==='player' && effectivePower(atk)>effectivePower(def))return 'champion';
  // Printed legendary status does not prevent counterattacks.
  // Tapping, First Strike, flying and explicit restrictions do.
  if (def.statuses.stunned) return 'stunned';
  if (effectivePower(def) <= 0) return 'no power';
  if (has(atk, 'firstStrike')) return 'first strike';
  if (has(atk, 'flying') && !has(def, 'flying') && !has(def, 'reach')) return 'flying';
  return null;
}
/** Full exchange. Order: defender First-Strike counter -> attacker strike(s) -> Spines -> normal counterblow. */
export function attackExchange(s, ev, atk, def) {
  const dist = Math.abs(atk.x - def.x) + Math.abs(atk.y - def.y);
  const melee = dist === 1;
  const dir = [Math.sign(def.x - atk.x), Math.sign(def.y - atk.y)];
  ev.push({ t: 'attack', uid: atk.uid, target: def.uid, ranged: !melee });
  let countered = false;
  if (!counterBlocked(atk, def, melee) && has(def, 'firstStrike')) {
    ev.push({ t: 'counter', uid: def.uid, target: atk.uid, first: true });
    strike(s, ev, def, atk, [-dir[0], -dir[1]], 'counter');def.tapped=true;
    countered = true;
    if (!alive(atk)) return;
  }
  const hits = has(atk, 'doubleStrike') ? 2 : 1;
  for (let i = 0; i < hits && alive(def) && alive(atk); i++) strike(s, ev, atk, def, dir, i ? 'strike2' : 'strike');
  if (melee && alive(atk) && kv(def, 'spines') > 0) {
    ev.push({ t: 'spines', uid: def.uid, target: atk.uid });
    dealDamage(s, ev, def, atk, kv(def, 'spines'), { kind: 'spines' });
  }
  if (!countered && alive(atk)) {
    const why = counterBlocked(atk, def, melee);
    if (!why) { ev.push({ t: 'counter', uid: def.uid, target: atk.uid }); strike(s, ev, def, atk, [-dir[0], -dir[1]], 'counter');def.tapped=true; }
    else if (alive(def) && why !== 'ranged' && why !== 'dead') ev.push({ t: 'noCounter', uid: def.uid, reason: why });
  }
}
/** Movement side effects for ground units: bramble and lava damage on each entered tile (see data/terrain.js). */
const ENTER_HAZARDS = new Set([T.BRAMBLE, T.LAVA, T.ICE, T.SPORES, T.CRUMBLE]);
/** On-enter terrain effect for ONE tile. Foe-created hazards (s.foeTiles) count as enemy-caused damage/poison. */
export function hazardAt(s, ev, u, at) {
  const t = tileAt(s, at.x, at.y), foe = (s.foeTiles || []).includes(at.y * s.w + at.x) ? 'enemy' : null;
  if (t === T.BRAMBLE) dealDamage(s, ev, null, u, TERRAIN_RULES.bramble.enterDamage, { kind: 'bramble', cause: foe });
  if (t === T.LAVA) dealDamage(s, ev, null, u, TERRAIN_RULES.lava.enterDamage, { kind: 'lava', cause: foe });
  if (t === T.ICE && !(u.statuses.chilled || 0)) addStatus(s, ev, u, 'chilled', 1);
  if (t === T.SPORES) addStatus(s, ev, u, 'poison', TERRAIN_RULES.spores.poisonOnEnter, { bySide: foe });
  if (t === T.CRUMBLE) {
    dealDamage(s, ev, null, u, TERRAIN_RULES.crumble.enterDamage, { kind: 'crumble', cause: foe });
    s.terrain[at.y * s.w + at.x] = T.FLOOR;
    ev.push({ t: 'terrain', tiles: [at], kind: 'crumble' });
  }
}
/** First Conduit entry of the player turn grants the next spell bonus immediately.
 * No repeated harvesting through moving away/back or teleportation. */
export function grantConduitOnEntry(s, ev, u, x, y) {
  if (!u?.hero || s.phase !== 'player' || tileAt(s, x, y) !== T.CONDUIT || s.p.conduitGrantedTurn === s.turn) return false;
  const amount = TERRAIN_RULES.conduit.spellBonus;
  s.p.conduit = Math.max(s.p.conduit || 0, amount);
  s.p.conduitGrantedTurn = s.turn;
  ev.push({ t: 'conduit', uid: u.uid, amount, x, y });
  return true;
}
export function enterTiles(s, ev, u, path) {
  if (has(u, 'flying')) return;
  for (let i = 1; i < path.length && alive(u); i++) hazardAt(s, ev, u, path[i]);
}
/** v1.7.0 STEPWISE movement: the unit really occupies each tile in turn. A hazardous tile resolves the moment it is
 *  entered (the walk presentation is split there), and death stops the walk on that tile — later tiles never fire.
 *  Also records the last-move direction (u.facing, presentation-only). Flying units ignore ground hazards. */
export function walkPath(s, ev, u, path) {
  if (!path || path.length < 2) return { x: u.x, y: u.y, stopped: false };
  let seg = [path[0]];
  const flush = () => { if (seg.length > 1) ev.push({ t: 'move', uid: u.uid, path: seg }); seg = [seg[seg.length - 1]]; };
  for (let i = 1; i < path.length; i++) {
    const at = path[i]; u.facing = [Math.sign(at.x - path[i - 1].x), Math.sign(at.y - path[i - 1].y)];
    u.x = at.x; u.y = at.y; seg.push(at);
    grantConduitOnEntry(s, ev, u, at.x, at.y);
    if (!has(u, 'flying') && ENTER_HAZARDS.has(tileAt(s, at.x, at.y))) {
      flush(); hazardAt(s, ev, u, at);
      if (!alive(u)) { ev.push({ t: 'moveStopped', uid: u.uid, x: at.x, y: at.y, reason: 'defeated' }); return { x: at.x, y: at.y, stopped: true }; }
    }
  }
  flush(); return { x: u.x, y: u.y, stopped: false };
}
/** v1.5.0 destructible rocks. Any living unit adjacent to a Rock may smash it, which costs ALL of that unit's remaining
 * movement and attacks this turn. The tile becomes floor (recorded as rubble for presentation and saves); movement,
 * line of sight, pathfinding and AI all read s.terrain, so the change is authoritative and deterministic. */
export function smashRock(s, ev, u, x, y) {
  if (!alive(u)) throw new Error('That creature cannot act');
  if (!inBoundsTile(s, x, y) || tileAt(s, x, y) !== T.ROCK) throw new Error('There is no rock there');
  if (manhattan(u, { x, y }) !== 1) throw new Error('Stand next to the rock to smash it');
  s.terrain[y * s.w + x] = T.FLOOR; (s.rubble ||= []).push({ x, y });
  u.smashedTurn = s.turn;
  ev.push({ t: 'smash', uid: u.uid, x, y }, { t: 'terrain', tiles: [{ x, y }], kind: 'smash' });
}
const inBoundsTile = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
