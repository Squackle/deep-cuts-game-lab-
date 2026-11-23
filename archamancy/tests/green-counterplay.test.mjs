import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngine } from '../engine.mjs';

function built(kind, enemy) {
  const g = createEngine(1, 'sandbox', 'hollow');
  assert.ok(g.command({ type:'sandboxMana', amount:100000 }));
  assert.ok(g.command({ type:'build', pad:0, kind }));
  assert.ok(g.command({ type:'upgrade', pad:0 }));
  assert.ok(g.command({ type:'sandboxEnemy', enemy, count:1 }));
  const tower = g.state.towers[0], foe = g.state.enemies[0];
  foe.progress = tower.rally || 220;
  foe.hp = foe.maxHp = 1000000;
  foe.speed = 0;
  foe.attack = 0;
  foe.revealed = true;
  for (const u of g.state.troops) if (u.source === 0) {
    u.progress = tower.rally;
    u.leave = 0;
    u.next = 0;
  }
  return {g,tower,foe};
}
function tick(g,n=25){for(let i=0;i<n;i++)g.step();}

test('only Beast Pack gains Reach at Tier III, including existing beasts',()=>{
  const {g,tower,foe} = built('beast','wing');
  const originals = g.state.troops.filter(u=>u.source===0);
  assert.ok(originals.length>0);
  tick(g,8);
  assert.equal(foe.hp,foe.maxHp,'Tier II Beast Den cannot attack flyers');
  assert.equal(tower.blockTicks||0,0);
  assert.ok(g.command({type:'upgrade',pad:0,branch:'A'}));
  assert.ok(originals.every(u=>u.reach),'live fighters gain Reach immediately on specialization');
  tick(g,25);
  assert.ok(foe.hp<foe.maxHp,'Reach beasts damage flyers');
  assert.ok(tower.blockTicks>0,'Reach beasts block flyers');
  assert.equal(g.state.stats.blockedEnemyTicks,tower.blockTicks,'blocking attribution remains exact');
  assert.ok(g.branchOptions(tower).some(o=>o.id==='A'&&/Reach/.test(o.description)));
});

test('Colossal Titan branch stays a ground-only army',()=>{
  const {g,tower,foe}=built('beast','wing');
  assert.ok(g.command({type:'upgrade',pad:0,branch:'B'}));
  tick(g,25);
  assert.equal(foe.hp,foe.maxHp);
  assert.equal(tower.blockTicks||0,0);
  assert.ok(g.state.troops.filter(u=>u.source===0).every(u=>!u.reach));
});

test('Venom Thicket poisons physical-immune golems without bypassing armor on the initial strike',()=>{
  const {g,tower,foe}=built('thorn','golem');
  assert.equal(foe.armor,100);
  tick(g,15);
  assert.equal(tower.shots||0,0,'Tier II Thornheart skips physical immune foes');
  assert.equal(foe.hp,foe.maxHp);
  assert.ok(g.command({type:'upgrade',pad:0,branch:'B'}));
  tick(g,35);
  assert.ok((tower.shots||0)>0,'Venom Thicket attempts to poison golems');
  assert.ok((tower.immuneHits||0)>0,'direct physical strike remains immune');
  assert.ok(foe.poisonStacks>0,'poison is applied on the immune target');
  assert.ok(foe.hp<foe.maxHp,'armor-piercing poison damages the golem');
  assert.ok(tower.towerDamage>0,'poison damage is credited to the tower');
});

test('Grasping Forest does not gain physical-immunity bypass',()=>{
  const {g,tower,foe}=built('thorn','golem');
  assert.ok(g.command({type:'upgrade',pad:0,branch:'A'}));
  tick(g,35);
  assert.equal(foe.hp,foe.maxHp);
  assert.equal(tower.shots||0,0);
});

test('Reach and poison survive snapshot/replay deterministically',()=>{
  for(const [kind,branch,enemy] of [['beast','A','wing'],['thorn','B','golem']]){
    const {g}=built(kind,enemy);
    assert.ok(g.command({type:'upgrade',pad:0,branch}));
    tick(g,12);
    const copy=createEngine(1,'sandbox','hollow');
    assert.ok(copy.restore(JSON.parse(JSON.stringify(g.snapshot()))));
    tick(g,45);tick(copy,45);
    assert.deepEqual(copy.playtestReport(),g.playtestReport(),kind+' '+branch+' deterministic after restore');
  }
});

test('build and tower details communicate Reach, poison immunity and tunnel placement traps',()=>{
  const ui=readFileSync(new URL('../main.mjs',import.meta.url),'utf8');
  for(const term of ['towerTargetHint','towerPlacementHint','Reach at Tier III','Venom Thicket','physical immunity','no exposed road','Mountain tunnel']){
    assert.ok(ui.includes(term),term+' must appear in player-facing placement guidance');
  }
});
