// Damage, healing, statuses and keyword-driven combat resolution. Functions mutate battle state `s`
// and append presentation events to `ev`. No rendering, no randomness.
import { unitAt, T, tileAt, manhattan, isFlying } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { TERRAIN_RULES } from '../data/terrain.js';
import { hasAura, detachAura } from './attachments.js';
import { resolveShinobiHit, scarabDied } from './printed-triggers.js';

export const has = (u, kw) => kw === 'flying' ? isFlying(u) : !!(u.keywords && u.keywords[kw]);
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
    u.maxHp=Math.max(0,u.maxHp+delta);u.hp=Math.max(0,Math.min(u.maxHp,u.hp+Math.max(0,delta)));
    ev.push({t:'status',uid:u.uid,status:'tribal',value:total,total});
  }
}


/** Power used when `u` strikes `target`, including pack-flanking bonus. */
export function strikePower(s, u, target) {
  let p = effectivePower(u);
  const def = ENEMIES[u.defId];
  if (def && def.pack && target && s.units.some(o => o !== u && o.hp > 0 && o.side === u.side && manhattan(o, target) === 1)) p += 1;
  return p;
}
export function heal(s, ev, u, amount, kind = 'heal') {
  if (!alive(u) || amount <= 0) return 0;
  const h = Math.min(amount, u.maxHp - u.hp);
  if (h <= 0) return 0;
  u.hp += h; ev.push({ t: 'heal', uid: u.uid, amount: h, kind });
  return h;
}
export function addShield(s, ev, u, amount, kind = 'shield') {
  if (!alive(u) || amount <= 0) return;
  u.statuses.shield = (u.statuses.shield || 0) + amount;
  ev.push({ t: 'shield', uid: u.uid, amount, total: u.statuses.shield, kind });
}
export function addStatus(s, ev, u, status, value) {
  if (!alive(u)) return;
  u.statuses[status] = (u.statuses[status] || 0) + value;
  ev.push({ t: 'status', uid: u.uid, status, value, total: u.statuses[status] });
}
function kill(s, ev, u, element = null) {
  ev.push({ t: 'death', uid: u.uid, element });
  if(u.side==='player' && !u.hero && u.slime>0 && s.units.some(x=>x.defId==='toxrill'&&x.hp>0))s.pendingSlugs=(s.pendingSlugs||0)+1;
  if (u.side === 'enemy') {
    s.stats.kills++;
    const def = ENEMIES[u.defId];
    if(u.defId==='scarab') scarabDied(s,u);
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
        s.units.push(golem);ev.push({t:'summon',uid:golem.uid,defId:forms[i],x:tile.x,y:tile.y,by:u.uid});
      }
      ev.push({t:'realAbility',uid:u.uid,name:'Triplicate Titan · three Golems'});
    }
    if (def && def.burst) { // Legacy-only rules; new printed creature records clear this property.
      ev.push({ t: 'burst', uid: u.uid, x: u.x, y: u.y });
      for (const o of s.units.filter(o => o.hp > 0 && manhattan(o, u) === 1)) dealDamage(s, ev, null, o, def.burst, { kind: 'burst' });
    }
    refreshTribalBonuses(s,ev);
    if (s.units.every(e => e.side !== 'enemy' || e.hp <= 0) && s.phase !== 'lost') { s.phase = 'won'; ev.push({ t: 'victory' }); }
  } else if (u.hero && s.phase !== 'won') { s.phase = 'lost'; ev.push({ t: 'defeat' }); }
}
/** State-based actions: creature with zero Toughness dies even without receiving damage.
 * This is required for printed -1/-1 counter and Aura interactions. */
export function checkStateBasedDeath(s, ev, u) {
  if (u && u.hp > 0 && u.toughness <= 0) { u.hp = 0; kill(s, ev, u); return true; }
  return false;
}
/** Damage pipeline: strike cap (bosses) -> armor (combat only) -> shield -> health.
 *  Only combat damage (strikes/counterblows) triggers Deathtouch and Lifelink; spells bypass armor. */
export function dealDamage(s, ev, src, tgt, amount, { combat = false, kind = 'hit', element = null } = {}) {
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
  // v0.8 Guard: every hit from an enemy (strikes, arrows, slams, breath) is reduced; hazards and poison are not.
  if (tgt.statuses && tgt.statuses.guard && src && src.side !== tgt.side) { const braced = kind === 'slam' || kind === 'arrow'; const cut = Math.min(a, braced ? Math.max(tgt.statuses.guard, Math.floor(a / 2)) : tgt.statuses.guard); /* telegraphed blows are at least halved */ a -= cut; if (cut) ev.push({ t: 'guarded', uid: tgt.uid, amount: cut }); if (a <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return 0; } }
  const armor = combat ? kv(tgt, 'armor') : 0;
  if (armor) { const cut = Math.min(armor, a); a -= cut; if (cut) ev.push({ t: 'armored', uid: tgt.uid, amount: cut }); }
  if (a <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return 0; }
  // Dauntless Escort may sacrifice itself to give all other allies Indestructible
  // until end of turn when a legal lethal attack or spell threatens a creature.
  if(tgt.side==='enemy' && src?.side==='player' && tgt.defId!=='tortoise' &&
     !tgt.statuses.indestructible && a>(tgt.statuses.shield||0) && a-(tgt.statuses.shield||0)>=tgt.hp){
    const escort=enemies(s).find(u=>u.defId==='tortoise'&&u!==tgt);
    if(escort){
      escort.hp=0;ev.push({t:'realAbility',uid:escort.uid,name:'Dauntless Escort · sacrifice for indestructible'});
      kill(s,ev,escort);
      for(const ally of enemies(s)) {ally.statuses.indestructible=1;ev.push({t:'status',uid:ally.uid,status:'indestructible',value:1});}
    }
  }
  const sh = tgt.statuses.shield || 0;
  const blocked = Math.min(sh, a);
  if (blocked) { tgt.statuses.shield = sh - blocked; a -= blocked; }
  const hpBefore = tgt.hp;
  // Legendary bosses resist the instant-destroy clause of Deathtouch.
  // Ordinary creatures still die to it; bosses take printed combat damage
  // (plus the separately disclosed GRAFTBOUND boss chip bonus in strike()).
  const bossResistsTouch = !!(combat && src && has(src, 'deathtouch') && a > 0 && tgt.boss);
  if (bossResistsTouch) ev.push({ t: 'deathtouchResisted', uid: tgt.uid, src: src.uid });
  const dt = combat && src && has(src, 'deathtouch') && a > 0 && !tgt.boss;
  tgt.hp = dt ? 0 : Math.max(0, tgt.hp - a);
  if(tgt.statuses.indestructible && tgt.toughness>0 && tgt.hp<=0){tgt.hp=1;ev.push({t:'indestructible',uid:tgt.uid});}
  const lost = hpBefore - tgt.hp;
  ev.push({ t: 'damage', uid: tgt.uid, amount: a, blocked, deathtouch: dt, kind, element, src: src ? src.uid : null });
  if (src && src.side === 'player') s.stats.damageDealt += lost;
  if (tgt.hero) { s.stats.damageTaken += lost; if (src?.side === 'enemy') s.stats.enemyHealthDamage = (s.stats.enemyHealthDamage || 0) + lost; }
  // Real infect replaces health damage with poison counters against a player.
  // Against creatures, damage is represented by persistent -1/-1 counters.
  if(combat && src?.keywords?.infect && a>0){
    if(tgt.hero){
      tgt.hp=hpBefore;s.stats.damageTaken=Math.max(0,s.stats.damageTaken-lost);
      if(src.side==='enemy')s.stats.enemyHealthDamage=Math.max(0,(s.stats.enemyHealthDamage||0)-lost);
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
  if (combat && src && has(src, 'lifelink') && lost > 0) heal(s, ev, src, lost, 'lifelink');
  // Fallen Shinobi: combat damage to the player exiles their top two library cards (printed trigger).
  // Only when the Shinobi is the attacker; striking back as a blocker ('counter') is not damage to a player.
  if (combat && src?.side === 'enemy' && src.defId === 'riftstalker' && kind !== 'counter' && tgt.hero && lost > 0 && s.phase !== 'lost') resolveShinobiHit(s, ev, src, tgt);
  // Destruction replacement effects resolve before defeat. Never rewrite printed +P/+T.
  if(tgt.hp<=0 && tgt.toughness>0 && hasAura(tgt,'mtg:hyena-umbra') && (combat||kind==='spell'||kind==='arrow')){
    detachAura(tgt,'mtg:hyena-umbra');tgt.hp=tgt.maxHp;ev.push({t:'auraBreak',uid:tgt.uid,id:'mtg:hyena-umbra'});
  } else if(tgt.hp<=0 && hasAura(tgt,'mtg:gift-of-immortality') && !tgt.token && tgt.toughness>0){
    ev.push({t:'death',uid:tgt.uid,kind:'gift'});
    detachAura(tgt,'mtg:gift-of-immortality');tgt.hp=tgt.maxHp;
    (s.pendingAuras ||= []).push({uid:tgt.uid,id:'mtg:gift-of-immortality'});
    ev.push({t:'revive',uid:tgt.uid,kind:'gift',hp:tgt.hp});
  } else if(tgt.hp <= 0) kill(s, ev, tgt, element);
  return lost;
}
/** One combat strike. dir = [dx,dy] of the attack (used by Trample). */
export function strike(s, ev, src, tgt, dir, kind = 'strike') {
  if (!alive(src) || !alive(tgt)) return;
  let amt = strikePower(s, src, tgt);
  if (has(src, 'deathtouch') && tgt.boss && amt > 0) amt += 2; // Explicit Legendary Vitality adaptation: chip damage, not destruction.
  if (amt <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return; }
  const cap = ENEMIES[tgt.defId] && ENEMIES[tgt.defId].strikeCap;
  const shield = tgt.statuses.shield || 0, armor = kv(tgt, 'armor');
  const lethal = armor + shield + (has(src, 'deathtouch') && !tgt.legendary ? 1 : tgt.hp);
  const excess = Math.min(amt, cap || Infinity) - lethal;
  const tx = tgt.x, ty = tgt.y;
  dealDamage(s, ev, src, tgt, amt, { combat: true, kind });
  if (has(src, 'trample') && excess > 0 && tgt.hp <= 0 && dir && alive(src)) {
    const behind = unitAt(s, tx + dir[0], ty + dir[1]);
    if (behind && behind.side !== src.side) {
      ev.push({ t: 'trample', uid: src.uid, target: behind.uid, amount: excess });
      dealDamage(s, ev, src, behind, excess, { combat: true, kind: 'trample' });
    }
  }
}
/** Why a defender cannot strike back (null = it can). Used by rules AND by UI explanations. */
export function counterBlocked(atk, def, melee) {
  if (!melee) return 'ranged';
  if (!alive(def)) return 'dead';
  if(def.tapped)return 'tapped';
  if(hasAura(def,'mtg:pacifism'))return 'pacifism';
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
export function enterTiles(s, ev, u, path) {
  if (has(u, 'flying')) return;
  for (let i = 1; i < path.length && alive(u); i++) {
    const t = tileAt(s, path[i].x, path[i].y);
    if (t === T.BRAMBLE) dealDamage(s, ev, null, u, TERRAIN_RULES.bramble.enterDamage, { kind: 'bramble' });
    if (t === T.LAVA) dealDamage(s, ev, null, u, TERRAIN_RULES.lava.enterDamage, { kind: 'lava' });
    if (t === T.ICE && !(u.statuses.chilled || 0)) addStatus(s, ev, u, 'chilled', 1);
    if (t === T.SPORES) addStatus(s, ev, u, 'poison', TERRAIN_RULES.spores.poisonOnEnter);
    if (t === T.CRUMBLE) {
      dealDamage(s, ev, null, u, TERRAIN_RULES.crumble.enterDamage, { kind: 'crumble' });
      s.terrain[path[i].y * s.w + path[i].x] = T.FLOOR;
      ev.push({ t: 'terrain', tiles: [path[i]], kind: 'crumble' });
    }
  }
}