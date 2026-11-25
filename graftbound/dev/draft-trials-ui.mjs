import {DRAFTS, DRAFT_VERSION, createDraft, testGraft} from './draft-trials.mjs';
import {resolveCard} from '../src/cards/catalog.js';
import {T, key, tileAt, unitAt} from '../src/core/grid.js';
import {keywordLabel} from '../src/data/keywords.js';
import {attack, attackTargets, endTurn, enemies, guard, moveOptions, movePlayer, player, stanceBlockReason} from '../src/engine/combat.js';
import {deriveAppearance} from '../src/engine/appearance.js';

const el = id => document.getElementById(id);
const keywordList = kws => Object.keys(kws).map(id => keywordLabel(id, kws[id])).join(', ');
let draft, battle;

function render(focus) {
  const hero = player(battle);
  const foes = enemies(battle), names = foes.map((foe, index) => [foe.uid, String.fromCharCode(65 + index)]);
  const mark = new Map(names);
  const moves = new Set(moveOptions(battle).map(p => key(p.x, p.y)));
  const targets = new Set(attackTargets(battle).map(u => u.uid));
  const buttons = [];

  el('stats').textContent = `Turn ${battle.turn} · ${hero.hp}/${hero.maxHp} health · ${hero.power} power · ${battle.p.moveLeft} movement left${keywordList(hero.keywords) ? ' · ' + keywordList(hero.keywords) : ''}`;
  el('foes').textContent = foes.map(foe => `${mark.get(foe.uid)} · ${foe.name} (${foe.hp}/${foe.maxHp})`).join(' | ');
  for (let y = 0; y < battle.h; y++) {
    for (let x = 0; x < battle.w; x++) {
      const unit = unitAt(battle, x, y), tile = tileAt(battle, x, y), id = key(x, y);
      const kind = unit?.hero ? 'hero' : unit ? 'enemy' : tile === T.ROCK ? 'rock' : tile === T.BRAMBLE ? 'bramble' : 'floor';
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.kind = kind; b.dataset.cell = id;
      b.textContent = unit?.hero ? 'You' : unit ? `${mark.get(unit.uid)} ${unit.hp}` : kind === 'rock' ? 'Rock' : kind === 'bramble' ? 'Briar' : '·';
      const canAttack = unit && targets.has(unit.uid), canMove = moves.has(id);
      b.disabled = battle.phase !== 'player' || !(canAttack || canMove);
      const label = canAttack ? 'Attack ' + unit.name : canMove ? 'Move to ' + kind : unit?.name || kind;
      b.setAttribute('aria-label', `${label} at column ${x + 1}, row ${y + 1}`);
      b.onclick = () => {
        const before = unit?.hp;
        if (canAttack) attack(battle, unit.uid); else movePlayer(battle, x, y);
        el('result').textContent = canAttack ? `${unit.name} lost ${before - Math.max(0, unit.hp)} health.` : `Moved to column ${x + 1}, row ${y + 1}.`;
        render(id);
      };
      buttons.push(b);
    }
  }
  el('board').replaceChildren(...buttons);
  const active = battle.phase === 'player';
  el('end').disabled = !active;
  el('guard').disabled = !active || !!stanceBlockReason(battle, 'guard');
  if (!active) el('result').textContent = `${battle.phase === 'won' ? 'Arena cleared' : 'Defeated'} in ${battle.turn} turns · ${battle.stats.damageTaken} damage taken.`;
  if (focus) (buttons.find(b => b.dataset.cell === focus && !b.disabled) || buttons.find(b => !b.disabled) || el('arena-title')).focus();
}

function loadDraft() {
  draft = createDraft(Number(el('draft').value));
  el('arena').hidden = true;
  const kept = draft.profile.keeps.map(id => resolveCard(id).name).join(', ') || 'Blank creature';
  el('build').textContent = `Current build: ${kept} · Graft budget ${draft.budget}`;
  el('offers').replaceChildren(...draft.choices.map(card => {
    const b = document.createElement('button'), name = document.createElement('strong'), detail = document.createElement('span');
    b.type = 'button';
    name.textContent = card.name;
    detail.textContent = `${card.sourceInfo.manaCost} · ${card.power}/${card.toughness} · ${card.rarity} · Rating ${draft.rating(card)}${keywordList(card.keywords) ? ' · ' + keywordList(card.keywords) : ''}`;
    b.append(name, detail);
    b.onclick = () => {
      const next = testGraft(draft, card.id);
      battle = next.battle;
      const appearance = deriveAppearance(next.evo);
      const parts = [...Object.values(appearance.slots).map(s => s.part), ...appearance.effects].join(', ');
      el('arena-title').textContent = card.name;
      el('parts').textContent = 'Graft anatomy: ' + (parts || 'bulk');
      el('arena').hidden = false;
      el('result').textContent = card.name + ' grafted.';
      render();
      el('arena-title').focus();
    };
    return b;
  }));
}
DRAFTS.forEach((draft, index) => {
  const option = document.createElement('option');
  option.value = index; option.textContent = draft.name; el('draft').append(option);
});
el('draft').addEventListener('change', loadDraft);
el('guard').addEventListener('click', () => {
  guard(battle); el('result').textContent = 'Guarded.'; render(); el('end').focus();
});
el('end').addEventListener('click', () => {
  endTurn(battle); el('result').textContent = 'Round resolved.'; render();
  if (el('end').disabled) el('arena-title').focus();
});
document.body.dataset.rules = DRAFT_VERSION;
loadDraft();
