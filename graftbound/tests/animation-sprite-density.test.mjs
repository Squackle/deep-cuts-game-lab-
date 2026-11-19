import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SmokeField, FIRE_SPRITE_DENSITIES, normalizedSpriteDensity, scaledSpriteSpawn }
  from '../dev/animation-studio/smoke-fluid.js';

const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const origin={x:.31,y:.68};

test('Fire Sprite Density exposes original and all three comparison presets',()=>{
  assert.deepEqual(FIRE_SPRITE_DENSITIES,[1,1.35,1.5,1.75]);
  for (const value of FIRE_SPRITE_DENSITIES) {
    assert.equal(normalizedSpriteDensity(String(value)),value);
    assert.equal(new SmokeField(32,32,{spriteDensity:value}).spriteDensity,value);
  }
  assert.equal(normalizedSpriteDensity('nonsense'),1);
  assert.equal(normalizedSpriteDensity(99),1);
  const html=file('../dev/animation-studio/index.html');
  assert.match(html,/<select id="sprite-density"/);
  for (const value of FIRE_SPRITE_DENSITIES)
    assert.match(html,new RegExp('<option value="'+value+'"(?: selected)?>'),
      'selector has '+value+'x as a user-selectable option');
});

test('fractional spawn carry achieves exact long-run 1.35x, 1.5x and 1.75x',()=>{
  for(const scale of FIRE_SPRITE_DENSITIES) {
    let carry=0,total=0;
    for(let tick=0;tick<40;tick++){
      const spawn=scaledSpriteSpawn(4,scale,carry);
      carry=spawn.remainder;
      total+=spawn.count;
    }
    assert.equal(total,Math.round(160*scale),'40 equal frames correctly apply '+scale+'x');
    assert.ok(carry>=0&&carry<1,'spawn carry remains fractional');
  }
});

test('higher density produces more visible flames AND embers, with proportionate caps',()=>{
  const fields=FIRE_SPRITE_DENSITIES.map(density=>new SmokeField(56,56,{spriteDensity:density}));
  const snapshots=fields.map(()=>({peakEmbers:0,peakFlames:0,emberTicks:0,flameTicks:0}));
  for(let frame=1;frame<=95;frame++){
    for(let n=0;n<fields.length;n++){
      const field=fields[n],stats=snapshots[n];
      field.advanceTo(frame/30,origin);
      stats.peakEmbers=Math.max(stats.peakEmbers,field.embers.length);
      stats.peakFlames=Math.max(stats.peakFlames,field.flames.length);
      stats.emberTicks+=field.embers.length;
      stats.flameTicks+=field.flames.length;
    }
  }
  for(let n=1;n<snapshots.length;n++){
    const before=snapshots[n-1],after=snapshots[n];
    assert.ok(after.peakEmbers>before.peakEmbers,'Rising Ember peak grows at '+FIRE_SPRITE_DENSITIES[n]+'x');
    assert.ok(after.peakFlames>before.peakFlames,'Curling Flame peak grows at '+FIRE_SPRITE_DENSITIES[n]+'x');
    assert.ok(after.emberTicks>before.emberTicks,'Rising Ember screen time grows');
    assert.ok(after.flameTicks>before.flameTicks,'Curling Flame screen time grows');
  }
  // Sprite count must not modify the air, fire chemistry, smoke, wall
  // simulation or timing. Only small rendered B/C particles change.
  for(let n=1;n<fields.length;n++)for(const name of ['u','v','density','heat','fuel','flame'])
    assert.deepEqual(fields[n][name],fields[0][name],name+' remains unchanged at '+FIRE_SPRITE_DENSITIES[n]+'x');
});

test('reduced-motion caps also scale safely and reset restores original seeded cast',()=>{
  const field=new SmokeField(40,40,{spriteDensity:1.75});
  let maxE=0,maxF=0;
  for(let frame=1;frame<=100;frame++){
    field.advanceTo(frame/30,origin,true);
    maxE=Math.max(maxE,field.embers.length);
    maxF=Math.max(maxF,field.flames.length);
  }
  assert.ok(maxE<=Math.round(48*1.75));
  assert.ok(maxF<=Math.round(30*1.75));
  assert.ok(maxE>0&&maxF>0);
  field.reset();
  assert.equal(field.embers.length,0);
  assert.equal(field.flames.length,0);
  assert.equal(field._emberCarry,0);
  assert.equal(field._flameCarry,0);
  assert.equal(field.spriteDensity,1.75,'reset keeps the selected preview setting');
});

test('changing selector replays and shows both sprite counts without affecting Ash A',()=>{
  const studio=file('../dev/animation-studio/studio.js');
  assert.match(studio,/spriteDensity:Number\(spriteDensitySel\.value\)/);
  assert.match(studio,/spriteDensitySel\.addEventListener\('change'/);
  assert.match(studio,/if\(sc\)begin\(\)/);
  assert.match(studio,/peakEmbers=Math\.max\(/);
  assert.match(studio,/peakFlames=Math\.max\(/);
  assert.match(studio,/ashPile\(u,t-spreadDelay\)/);
  assert.doesNotMatch(studio,/localStorage|sessionStorage|\/api\//);
  const html=file('../dev/animation-studio/index.html');
  assert.match(html,/id="sprite-counts"/);
  assert.match(html,/Changing fire sprite density or fire spread speed automatically replays/);
});

test('approved Cinematic Inferno preset is the actual default, preserving user overrides',()=>{
  const html=file('../dev/animation-studio/index.html');
  const selects=[
    ['speed','1'],
    ['sprite-density','1.5'],
    ['particles','high'],
    ['fire','1.5'],
    ['smoke','1.35'],
    ['motion','full']
  ];
  for(const [id,value] of selects){
    const select=html.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)<\\/select>'));
    assert.ok(select,'missing preset control '+id);
    const selected=[...select[1].matchAll(/<option value="([^"]+)" selected>/g)].map(m=>m[1]);
    assert.deepEqual(selected,[value],'approved selection for '+id);
  }
  assert.match(html,/Approved preset — Cinematic Inferno:/);
  const studio=file('../dev/animation-studio/studio.js');
  assert.match(studio,/const defaultReduced = window.matchMedia/);
  assert.match(studio,/motionSel.value = defaultReduced \? 'reduced' : 'full'/,
    'explicit accessibility preference still overrides full motion');
  assert.doesNotMatch(studio,/localStorage|sessionStorage|\/api\//);
});
