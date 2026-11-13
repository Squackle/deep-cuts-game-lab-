// Battle state machine. A battle is a plain JSON object (saveable mid-fight). Player actions validate,
// mutate state and return an ordered list of events consumed by the presentation layer.
import { reachable, pathTo, manhattan, lineOfSight, tileAt, T, key } from '../core/grid.js';
import { makeRng } from '../core/rng.js';
import { resolveCard as getCard } from '../cards/catalog.js';
import { player, enemies, allies, alive, has, kv, heal, attackExchange, enterTiles, dealDamage } from './abilities.js';
import { spellTargets, castSpellEffect, castBlockReason, spellCost } from './spells.js';
import { actEnemy, actAlly, spawnEnemy, previewIntent, announcePhase , spawnTokensAround, resolveToxrillEndStep } from './ai.js';
import { STARTING_NAME } from './evolution.js';
import { TERRAIN_RULES } from '../data/terrain.js';
import { TACTICS } from '../data/tactics.js';
import { createCombatDeck, drawCards, playFromHand, discardFromHand, endHandLimit } from './deck.js';
import { attachAura, hasGear, attachEquipment, detachEquipment, EQUIPMENT_SLOTS } from './attachments.js';

export const BATTLE_VERSION = 7;
export const RIFT_DAMAGE = TERRAIN_RULES.rift.pulseDamage, LAVA_DAMAGE = TERRAIN_RULES.lava.endTurnDamage;

export function createBattle({ evo, stats, spellbook, encounter, seed = 1, heroName = STARTING_NAME, startHp = null, act = 0, deckMode = false, handCapacity = 7 }) {
  const s = {
    v: BATTLE_VERSION, w: encounter.w, h: encounter.h, terrain: encounter.terrain.slice(), act,
    name: encounter.name, kind: encounter.kind || 'battle', units: [], nextUid: 1, turn: 0, phase: 'player',
    rng: makeRng(seed), spellbook: spellbook.map(x => ({ ...x })),
    p: { mana: 0, maxMana: stats.maxMana, regen: stats.manaRegen, startMana: stats.startMana, arcane: stats.arcane, moveLeft: 0, attacksLeft: 0, cast: {} },
    // v0.6 scoring counters: only actions ACCEPTED by this engine increment them (rejected input throws first).
    stats: { damageDealt: 0, damageTaken: 0, enemyHealthDamage: 0, kills: 0, spellsCast: 0, turns: 0, attacks: 0, actions: 0, moves: 0, tilesMoved: 0, interactions: 0 },
    terrainTimers: [],
    crystals: (encounter.crystals || []).map(c => ({ x: c.x, y: c.y, charged: true })), cooled: [],
  };
  if (deckMode) { s.deck=createCombatDeck(spellbook,seed,handCapacity); s.spellbook=s.deck.hand; s.p.freeCast=false; s.p.freeCastUsed=false; }
  const hp = startHp == null ? stats.maxHealth : Math.max(1, Math.min(stats.maxHealth, startHp));
  s.units.push({ uid: s.nextUid++, side: 'player', hero: true, defId: 'player', name: heroName, x: encounter.playerStart.x, y: encounter.playerStart.y,
    hp, maxHp: stats.maxHealth, power: stats.power, toughness: stats.toughness, move: stats.move, keywords: { ...evo.keywords }, statuses: {} });
  for (const en of encounter.enemies) spawnEnemy(s, en.defId, en.x, en.y);
  s.openingEvents = [...(s.entryEvents || []), ...startPlayerTurn(s)];
  return s;
}
/** Rifts pulse at the end of every even round (telegraphed during that round's player phase). */
export const riftsPulseThisRound = s => s.turn % 2 === 0;
export function hazardPreview(s) {
  if (!riftsPulseThisRound(s)) return [];
  const out = []; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (tileAt(s, x, y) === T.RIFT || tileAt(s, x, y) === T.UNSTABLE) out.push({ x, y });
  return out;
}
export function startPlayerTurn(s) {
  const ev = []; const p = player(s);
  s.turn++; s.phase = 'player'; s.stats.turns = s.turn;
  if(s.deck){s.spellbook=s.deck.hand;if(s.turn>1){const drawn=drawCards(s.deck,1);for(const c of drawn)ev.push({t:'cardDraw',id:c.id,uid:p.uid});}}
  p.tapped=false;
  if (p.suppressed && p.suppressedTurn == null) p.suppressedTurn = s.turn;   // Redaction lasts for exactly this turn
  ev.push({ t: 'turn', phase: 'player', turn: s.turn });
  p.statuses.empowered = 0; p.statuses.guard = 0; s.p.channel = 0;
  s.p.conduit = tileAt(s, p.x, p.y) === T.CONDUIT ? TERRAIN_RULES.conduit.spellBonus : 0;
  if (s.p.conduit) ev.push({ t: 'conduit', uid: p.uid, amount: s.p.conduit, x: p.x, y: p.y });   // v0.8 stances last until your next turn begins
  if (p.statuses.poison > 0) { dealDamage(s, ev, null, p, p.statuses.poison, { kind: 'poison' }); p.statuses.poison--; if (!alive(p)) return ev; }
  if (kv(p, 'regenerate')) heal(s, ev, p, kv(p, 'regenerate'), 'regenerate');
  if (kv(p, 'ward') && (p.statuses.shield || 0) < kv(p, 'ward')) {
    const add = kv(p, 'ward') - (p.statuses.shield || 0); p.statuses.shield = kv(p, 'ward'); ev.push({ t: 'shield', uid: p.uid, amount: add, total: p.statuses.shield, kind: 'ward' });
  }
  const before = s.p.mana;
  s.p.mana = s.turn === 1 ? s.p.startMana : Math.min(s.p.maxMana, s.p.mana + s.p.regen);
  if (tileAt(s, p.x, p.y) === T.LEYLINE) s.p.mana = Math.min(s.p.maxMana + 1, s.p.mana + 1);
  ev.push({ t: 'mana', from: before, to: s.p.mana });
  s.p.moveLeft = p.statuses.stunned ? 0 : Math.max(0, p.move - (p.keywords.flying && p.statuses.grounded ? 1 : 0) - (p.statuses.chilled ? TERRAIN_RULES.ice.slowNextMovement : 0));
  p.statuses.chilled = 0;
  s.p.attacksLeft = 1;  // Haste grants movement, not a second attack
  s.p.cast = {};
  return ev;
}
const ensurePlayerPhase = s => { if (s.phase !== 'player') throw new Error('Not your turn'); };
export function moveOptions(s) {
  if (s.phase !== 'player') return [];
  const p = player(s);
  return [...reachable(s, p, s.p.moveLeft).values()].filter(v => v.stop && v.cost > 0);
}
export function movePlayer(s, x, y) {
  ensurePlayerPhase(s);
  const p = player(s); const map = reachable(s, p, s.p.moveLeft); const n = map.get(key(x, y));
  if (!n || !n.stop || n.cost === 0) throw new Error(s.p.moveLeft ? 'Out of reach' : 'No movement left');
  const path = pathTo(map, x, y); const ev = [{ t: 'move', uid: p.uid, path }];
  p.x = x; p.y = y; s.p.moveLeft -= n.cost;
  s.stats.actions++; s.stats.moves++; s.stats.tilesMoved += n.cost;
  enterTiles(s, ev, p, path);
  return ev;
}
/** A new 4/4 flying Angel is created for every attack by a Spear bearer. */
export function summonAngel(s,ev,bearer){
 const offsets=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 for(let radius=1;radius<=Math.max(s.w,s.h);radius++)for(const [dx,dy] of offsets){
   const x=bearer.x+dx*radius,y=bearer.y+dy*radius;
   if(x<0||y<0||x>=s.w||y>=s.h||tileAt(s,x,y)===T.ROCK||s.units.some(u=>u.hp>0&&u.x===x&&u.y===y))continue;
   const u={uid:s.nextUid++,side:bearer.side,hero:false,defId:'angel',name:'Angel',power:4,toughness:4,hp:4,maxHp:4,move:3,
     keywords:{flying:1},statuses:{},token:true,x,y};s.units.push(u);ev.push({t:'summon',uid:u.uid,defId:'angel',x,y,by:bearer.uid,ally:bearer.side==='player'});return u;
 }
 // Preserve trigger if crowded: spawn on a later opening. Never silently delete a promised Angel.
 s.pendingAngels=(s.pendingAngels||0)+1;ev.push({t:'legendaryAbility',uid:bearer.uid,name:'Angel waits for an open tile'});return null;
}
export function canAttack(s, attacker, target) {
  const d = manhattan(attacker, target);
  if (d === 1) return true;
  if (d === 2 && has(attacker, 'reach') && (attacker.x === target.x || attacker.y === target.y)) return lineOfSight(s, attacker, target);
  return false;
}
export function attackTargets(s) {
  if (s.phase !== 'player' || s.p.attacksLeft <= 0 || player(s).tapped) return [];
  const p = player(s);
  return enemies(s).filter(e => canAttack(s, p, e));
}
export function attack(s, targetUid) {
  ensurePlayerPhase(s);
  const p = player(s); const t = s.units.find(u => u.uid === targetUid);
  if (!t || !alive(t) || t.side !== 'enemy') throw new Error('Not a valid target');
  if(p.auras?.includes('mtg:pacifism'))throw new Error('Pacifism prevents attacks');
  if (s.p.attacksLeft <= 0 || p.tapped) throw new Error('You already attacked or are tapped');
  if (!canAttack(s, p, t)) throw new Error('Out of attack range');
  const ev = []; s.stats.attacks++; s.stats.actions++;
  // The Spear's printed trigger occurs when the equipped creature ATTACKS, before damage.
  if(hasGear(p,'mtg:moonsilver-spear')) summonAngel(s,ev,p);
  const hpBefore=t.hp;attackExchange(s, ev, p, t);
  // Mask of Memory is adapted from player combat damage to combat damage to a creature.
  if(s.deck && hasGear(p,'mtg:mask-of-memory') && t.hp < hpBefore){
    const drawn=drawCards(s.deck,2);for(const c of drawn)ev.push({t:'cardDraw',id:c.id,uid:p.uid});
    if(drawn.length) {s.deck.pendingDiscards=(s.deck.pendingDiscards||0)+1;if(!s.p.freeCastUsed)s.p.freeCast=true;}
  }
  if(!has(p,'vigilance'))p.tapped=true;
  s.p.attacksLeft--;
  if (!has(p, 'vigilance')) s.p.moveLeft = 0;
  return ev;
}
/** The printed Equip action: paid, legal-bearer-only, and deterministic. */
export function equipmentOptions(s) {
  if(!s || s.phase!=='player' || !Array.isArray(s.equipmentInventory))return [];
  return s.equipmentInventory.filter(id=>!(s.destroyedEquipment||[]).includes(id)).flatMap(id=>{
    const c=getCard(id);if(!c||c.kind!=='equipment'||s.p.mana<(c.equipCost||0))return [];
    return allies(s).flatMap(u=>{
      if(u.equipment?.includes(id))return [];
      return Array.from({length:u.hero?EQUIPMENT_SLOTS:1},(_,slot)=>({id,uid:u.uid,slot,cost:c.equipCost||0}));
    });
  });
}
export function equipBattle(s,id,uid,slot=0) {
  ensurePlayerPhase(s);
  if(!Number.isSafeInteger(uid)||!Number.isSafeInteger(slot))throw new Error('Invalid equipment target');
  const choice=equipmentOptions(s).find(o=>o.id===id&&o.uid===uid&&o.slot===slot);
  if(!choice)throw new Error('Equipment unavailable, insufficient mana, or illegal bearer');
  const target=s.units.find(u=>u.uid===uid);
  const replaced=target.hero?(s.heroEquipmentSlots||[null,null])[slot]||null:target.equipment?.[0]||null;
  const before=s.p.mana;
  for(const u of s.units)if(u.equipment?.includes(id))detachEquipment(u,id);
  if(replaced&&target.equipment?.includes(replaced))detachEquipment(target,replaced);
  attachEquipment(target,id);
  if(target.hero){
    const slots=(s.heroEquipmentSlots||[null,null]).slice();
    for(let i=0;i<slots.length;i++)if(slots[i]===id)slots[i]=null;
    slots[slot]=id;s.heroEquipmentSlots=slots;
  }else if(s.heroEquipmentSlots){
    s.heroEquipmentSlots=s.heroEquipmentSlots.map(v=>v===id?null:v);
  }
  s.p.mana-=choice.cost;s.stats.actions++;s.stats.interactions++;
  return [{t:'mana',from:before,to:s.p.mana},{t:'equipmentAttach',uid,id,slot,removed:replaced,amount:choice.cost}];
}
// ── v0.8 tactical stances: available to every creature, independent of card rewards ─────────────────────
// Both cost your ATTACK for the turn (no free actions), so they compete with striking. Values live in
// data/tactics.js so tooltips and rules can never disagree.
export const guardValue = p => Math.min(TACTICS.guard.max, TACTICS.guard.base + Math.floor((p.toughness || 0) / TACTICS.guard.perToughness));
/** Movement printed on the Guard button is the hero's full turn budget, not their remaining movement.
 * The cost grows when grafts improve movement and is reduced if grounded at turn start.
 * Computing it from unit/status data preserves in-progress saves from earlier rules versions. */
export function stanceMovementCost(s, kind) {
  if (kind !== 'guard') return TACTICS[kind]?.moveCost || 0;
  const p = player(s);
  return p.statuses.stunned ? 0 : Math.max(0, p.move - (p.keywords.flying && p.statuses.grounded ? 1 : 0));
}
export function stanceBlockReason(s, kind) {
  if (s.phase !== 'player') return 'Not your turn';
  if (s.p.attacksLeft <= 0) return 'You already used your attack this turn';
  if (!TACTICS[kind]) return 'Unknown stance';
  const cost = stanceMovementCost(s, kind);
  if (kind === 'guard') {
    if (cost <= 0) return 'Guard needs movement available';
    if (s.p.moveLeft !== cost) return `Guard needs all ${cost} movement points unspent — you cannot Guard after moving`;
  } else if (s.p.moveLeft < cost) return `Need ${cost} movement point${cost === 1 ? '' : 's'}`;
  if (kind === 'guard' && player(s).statuses.guard) return 'Already guarding';
  if (kind === 'channel' && s.p.channel) return 'Already channeling';
  return null;
}
/** GUARD: give up your attack; until your next turn, every hit from a foe (strikes, arrows, slams, breath) is reduced. */
export function guard(s) {
  ensurePlayerPhase(s); const why = stanceBlockReason(s, 'guard'); if (why) throw new Error(why);
  const p = player(s); const v = guardValue(p); p.statuses.guard = v; s.p.attacksLeft = 0; s.p.moveLeft = 0;
  s.stats.actions++; s.stats.stances = (s.stats.stances || 0) + 1;
  return [{ t: 'stance', uid: p.uid, kind: 'guard', amount: v }, { t: 'status', uid: p.uid, status: 'guard', value: v, total: v }];
}
/** CHANNEL: give up your attack AND remaining movement; +1 mana now (may exceed max by 1) and your next spell this turn gains +1. */
export function channel(s) {
  ensurePlayerPhase(s); const why = stanceBlockReason(s, 'channel'); if (why) throw new Error(why);
  const p = player(s); const before = s.p.mana;
  s.p.mana = Math.min(s.p.maxMana + 1, s.p.mana + TACTICS.channel.mana); s.p.channel = TACTICS.channel.spellBonus; s.p.attacksLeft = 0; s.p.moveLeft -= TACTICS.channel.moveCost;
  s.stats.actions++; s.stats.stances = (s.stats.stances || 0) + 1;
  return [{ t: 'stance', uid: p.uid, kind: 'channel', amount: TACTICS.channel.spellBonus }, { t: 'mana', from: before, to: s.p.mana }];
}

export function castOptions(s, spellId) {
  if (castBlockReason(s, spellId)) return [];
  const entry = s.spellbook.find(x => x.id === spellId);
  return spellTargets(s, spellId, entry.level);
}
export function cast(s, spellId, x, y) {
  ensurePlayerPhase(s);
  const why = castBlockReason(s, spellId); if (why) throw new Error(why);
  const entry = s.spellbook.find(e => e.id === spellId);
  if (!castOptions(s, spellId).some(t => t.x === x && t.y === y)) throw new Error('Not a valid target for ' + getCard(spellId).name);
  const ev = []; const cost = s.p.freeCast ? 0 : spellCost(s, spellId);
  s.p.mana -= cost; s.p.cast[spellId] = true; s.stats.spellsCast++; s.stats.actions++;
  ev.push({ t: 'mana', from: s.p.mana + cost, to: s.p.mana });
  const card=getCard(spellId);
  if(card.kind==='aura'){
    const target=s.units.find(u=>u.hp>0&&u.x===x&&u.y===y);
    attachAura(target,spellId);ev.push({t:'auraAttach',uid:target.uid,id:spellId,x,y,name:card.name});
  } else castSpellEffect(s, ev, spellId, entry.level, x, y);
  if(s.deck){playFromHand(s.deck,spellId,{permanent:card.kind==='aura'});s.spellbook=s.deck.hand;}
  if(s.p.freeCast){s.p.freeCast=false;s.p.freeCastUsed=true;}
  const arasta = enemies(s).find(e=>e.defId==='arasta');
  if(arasta && alive(arasta) && card.kind==='spell' && /^(Instant|Sorcery)\b/.test(card.sourceInfo?.typeLine||'')) spawnTokensAround(s,ev,arasta,'spider',1);
  const spellEvent = ev.find(x => x.t === 'spell' && x.id === spellId);
  if (spellEvent) spellEvent.manaCost = cost; // presentation-only; exact paid cost includes Null Warden tax
  return ev;
}
export function discard(s,id){
 ensurePlayerPhase(s);if(!s.deck||!(s.deck.pendingDiscards>0||endHandLimit(s.deck)>0))throw new Error('No discard required');
 discardFromHand(s.deck,id);s.spellbook=s.deck.hand;if(s.deck.pendingDiscards>0)s.deck.pendingDiscards--;
 s.stats.actions++;return [{t:'cardDiscard',id,uid:player(s).uid}];
}
export function endTurn(s) {
  ensurePlayerPhase(s);
  if(s.deck && (s.deck.pendingDiscards>0||endHandLimit(s.deck)>0))throw new Error('Discard down to your hand limit before ending turn');
  const ev = []; const p = player(s);
  if (tileAt(s, p.x, p.y) === T.LAVA && !has(p, 'flying')) dealDamage(s, ev, null, p, LAVA_DAMAGE, { kind: 'lava' });
  if (s.phase !== 'player') return ev;
  // End-of-turn stat buffs expire on their target, including allies and foes.
  for(const u of s.units){const t=u.statuses.temporaryToughness||0;if(t){u.maxHp=Math.max(0,u.maxHp-t);u.hp=Math.min(u.hp,u.maxHp);u.toughness=Math.max(0,u.toughness-t);u.statuses.temporaryToughness=0;u.statuses.empowered=0;}}
  p.statuses.empowered = 0; p.statuses.weakened = 0; p.statuses.grounded = 0; if (p.statuses.stunned) p.statuses.stunned = 0; s.p.silenced = null;
  if (p.suppressed && p.suppressedTurn != null && p.suppressedTurn <= s.turn) { Object.assign(p.keywords, p.suppressed); ev.push({ t: 'restored', uid: p.uid, keyword: Object.keys(p.suppressed)[0] }); p.suppressed = null; p.suppressedTurn = null; }
  // Sacrifice-granted Indestructible expires at the end of the protected turn.
  for(const u of s.units)if(u.statuses.indestructible){u.statuses.indestructible=0;ev.push({t:'status',uid:u.uid,status:'indestructible',value:0});}
  // The player end step is also an end step for Toxrill's printed trigger.
  resolveToxrillEndStep(s,ev);
  if(s.phase === 'lost')return ev;
  s.phase = 'enemy'; ev.push({ t: 'turn', phase: 'enemy', turn: s.turn });
  for(const u of s.units)if(u.side==='enemy')u.tapped=false;
  for (const a of allies(s).filter(u => !u.hero)) { if (s.phase !== 'enemy') break; ev.push({ t: 'enemyTurn', uid: a.uid }); actAlly(s, ev, a); }
  // Friendly spell buffs remain through the summoned creature's action, then expire.
  for (const a of allies(s).filter(u => !u.hero)) if (a.statuses.empowered) { a.statuses.empowered = 0; ev.push({ t: 'status', uid: a.uid, status: 'empowered', value: 0, total: 0 }); }
  for (const e of s.units.filter(u => u.side === 'enemy' && u.boss)) announcePhase(ev, e);
  for (const e of s.units.filter(u => u.side === 'enemy')) {
    if (!alive(e) || s.phase !== 'enemy') continue;
    if (e.statuses.poison > 0) { dealDamage(s, ev, null, e, e.statuses.poison, { kind: 'poison' }); e.statuses.poison--; if (!alive(e)) continue; }
    ev.push({ t: 'enemyTurn', uid: e.uid });
    actEnemy(s, ev, e);
  }
  for (const u of s.units.filter(x=>x.pumpExpires)) { const n=u.pumpExpires; u.power=Math.max(0,u.power-n);u.toughness=Math.max(0,u.toughness-n);u.maxHp=Math.max(0,u.maxHp-n);u.hp=Math.min(u.hp,u.maxHp);u.pumpExpires=0; }
  // Nightpack Ambusher: end step, if its controller cast no spell this turn, create a 2/2 Wolf.
  if(s.phase==='enemy')for(const a of enemies(s).filter(u=>u.defId==='alpha')){
    if(!s.enemySpellsCastThisTurn)spawnTokensAround(s,ev,a,'wolf',1);
  }
  s.enemySpellsCastThisTurn=0;
  // Triplicate Titan's death trigger yields three different 3/3 Golems.
  if(s.phase==='enemy'&&s.pendingGolems?.length){
    for(const g of s.pendingGolems.splice(0)){
      const owner={...g,uid:0,side:'enemy'};
      for(const kind of ['golemFly','golemVigilance','golemTrample'])spawnTokensAround(s,ev,owner,kind,1);
    }
  }
  // Blightcaster's -2/-2 temporary effect ends after the enemy turn.
  if(player(s).statuses.blightcasterDebuff){const h=player(s),n=h.statuses.blightcasterDebuff;
    h.power+=n;h.toughness+=n;h.maxHp+=n;h.statuses.blightcasterDebuff=0;
  }
  if(s.phase==='enemy' && s.pendingSlugs){const t=enemies(s).find(x=>x.defId==='toxrill');if(t){const n=s.pendingSlugs;s.pendingSlugs=0;spawnTokensAround(s,ev,t,'slug',n);}}
  if(s.phase==='enemy' && s.pendingAngels){const hero=player(s);const n=s.pendingAngels;s.pendingAngels=0;for(let k=0;k<n;k++)summonAngel(s,ev,hero);}
  if (s.phase === 'enemy' && riftsPulseThisRound(s)) {
    const tiles = hazardPreview(s);
    const rifts = tiles.filter(t => tileAt(s, t.x, t.y) === T.RIFT);
    const cracks = tiles.filter(t => tileAt(s, t.x, t.y) === T.UNSTABLE);
    if (rifts.length) ev.push({ t: 'riftPulse', tiles: rifts });
    if (cracks.length) ev.push({ t: 'crackPulse', tiles: cracks });
    for (const t of tiles) { const u = s.units.find(u => u.hp > 0 && u.x === t.x && u.y === t.y); if (u) dealDamage(s, ev, null, u, tileAt(s, t.x, t.y) === T.RIFT ? RIFT_DAMAGE : TERRAIN_RULES.unstable.pulseDamage, { kind: 'terrain' }); }
  }
  // Enemy end step: Toxrill triggers again, consistent with its printed EVERY end step ability.
  if(s.phase === 'enemy')resolveToxrillEndStep(s,ev);
  // Gift of Immortality's delayed end-step reattachment: only while its saved creature still lives.
  for(const a of s.pendingAuras||[]){const u=s.units.find(x=>x.uid===a.uid&&x.hp>0);
    if(u && !u.auras?.includes(a.id)){attachAura(u,a.id);ev.push({t:'auraAttach',uid:u.uid,id:a.id,x:u.x,y:u.y,name:'Gift of Immortality'});}
  }
  s.pendingAuras=[];
  if(s.phase === 'enemy') restoreCooled(s, ev);
  if (s.phase === 'enemy') ev.push(...startPlayerTurn(s));
  return ev;
}

/** Frost-cooled lava hardens into walkable floor for a few rounds, then melts back (see data/terrain.js). */
function restoreCooled(s, ev) {
  const back = [];
  s.cooled = (s.cooled || []).filter(c => { if (c.until > s.turn) return true; s.terrain[c.i] = T.LAVA; back.push({ x: c.i % s.w, y: Math.floor(c.i / s.w) }); return false; });
  if (back.length) ev.push({ t: 'terrain', tiles: back, kind: 'lava' });
}

// ── v0.6 battlefield objects: magical crystals ───────────────────────────
export const crystalAt = (s, x, y) => (s.crystals || []).find(c => c.x === x && c.y === y) || null;
/** Charged crystals on or next to the hero can be attuned (one interaction action, once per crystal). */
export function interactOptions(s) {
  if (s.phase !== 'player') return [];
  const p = player(s);
  return (s.crystals || []).filter(c => c.charged && manhattan(p, c) <= 1).map(c => ({ x: c.x, y: c.y, kind: 'crystal' }));
}
export function interact(s, x, y) {
  ensurePlayerPhase(s);
  if (!interactOptions(s).some(o => o.x === x && o.y === y)) throw new Error('Nothing to use there');
  const c = crystalAt(s, x, y); const ev = [];
  c.charged = false; s.stats.actions++; s.stats.interactions++;
  const before = s.p.mana; s.p.mana = Math.min(s.p.maxMana + TERRAIN_RULES.crystal.manaGain, s.p.mana + TERRAIN_RULES.crystal.manaGain);
  ev.push({ t: 'crystal', x, y, kind: 'attune' }, { t: 'mana', from: before, to: s.p.mana });
  return ev;
}
export function intents(s) { return enemies(s).map(e => previewIntent(s, e)); }
export { player, enemies };
