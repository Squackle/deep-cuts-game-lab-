import {getCard, labelAction, PHYSICAL_LIBRARY_VERSION, poolLabel} from './engine.js';
import {createWorkbench} from './physical-library-workbench.js';

export const VAULTS = [
  {
    id: 'mh-commitment-quick-turn', title: 'The Quick Turn',
    version: PHYSICAL_LIBRARY_VERSION, turnLimit: 2, life: 4,
    field: [{id: 'tarn', card: 'fetchUR'}, {id: 'wastes', card: 'relic'}],
    hand: [{id: 'chamber', card: 'bounceUG'}],
    library: [{id: 'vents', card: 'shockUR'}, {id: 'mountain', card: 'mountain'}],
    stages: [{name: 'Rewind ward', cost: {R: 1, C: 1}, effect: 'untap'}, {name: 'Blue seal', cost: {U: 1}}],
    objective: 'Open both wards within two turns. Can you finish in one turn? Can you finish with 3 life?',
    hints: [
      'The first ward untaps one tapped land. Think about which colors that land can produce a second time.',
      'For speed, use Steam Vents twice on turn one. To save life, use Mountain for red and let Simic Growth Chamber untap on turn two.',
    ],
    lesson: 'Steam Vents can supply red and then blue after the first ward untaps it. The untapped fetch costs 3 life. Fetching Mountain costs 1 life and leaves blue to Simic Growth Chamber on turn two.',
  },
  {
    id: 'mh-commitment-return-address', title: 'Return Address',
    version: PHYSICAL_LIBRARY_VERSION, turnLimit: 2, life: 4,
    field: [{id: 'tarn', card: 'fetchUR'}, {id: 'reef', card: 'painUR'}],
    hand: [{id: 'chamber', card: 'bounceUG'}, {id: 'wastes', card: 'relic'}],
    library: [{id: 'island', card: 'island'}, {id: 'vents', card: 'shockUR'}, {id: 'mountain', card: 'mountain'}],
    stages: [{name: 'Entry ward', cost: {U: 1, C: 1}}, {name: 'Exit ward', cost: {G: 1, R: 1, C: 1}}],
    objective: 'Open both wards within two turns. Can you reach the exit with at least 2 life?',
    hints: [
      'Look at the exit ward first. Work out which land must already be on the battlefield when turn two starts.',
      'Use Island and Shivan Reef for the first ward. Return Island to play Simic Growth Chamber, then use Wastes and the Reef to finish next turn.',
    ],
    lesson: 'Simic Growth Chamber needs the turn-one land drop so it can untap on turn two. Floating mana before returning a land preserves that mana until the turn ends. Spending 3 life on an untapped Steam Vents makes the first ward possible, but leaves no life to spend on Shivan Reef.',
  },
];

export function vaultActionLabel(level, state, action) {
  const name = id => getCard(level, id).name;
  if (action.type === 'cast') {
    const untap = action.untapId ? ' · untap ' + name(action.untapId) : '';
    return 'Open ' + level.stages[state.stage].name + ' · spend ' + poolLabel(action.spend) + untap;
  }
  if (action.type === 'fetch') {
    return 'Fetch ' + name(action.targetId) + ' · ' + (action.shock ? 'untapped · pay 3 life' : 'pay 1 life');
  }
  if (action.type === 'tap' && getCard(level, action.id).kind === 'pain') {
    return labelAction(level, action) + (action.color === 'C' ? '' : ' · lose 1 life');
  }
  return labelAction(level, action);
}

export function mountCommitmentVaults(doc) {
  const el = id => doc.getElementById(id);
  let level, game, hintCount;
  const choiceKey = action => JSON.stringify(action);
  function render(focusKey) {
    const {state, done, reserve, choices} = game;
    const stage = level.stages[state.stage];
    const name = id => getCard(level, id).name;
    const list = items => items.join(' · ') || 'Empty';
    el('run').textContent =
      `Turn ${state.turn} of ${level.turnLimit} · Life ${state.life} · Pool ${poolLabel(state.pool)} · Land drop ${state.played ? 'used' : 'available'}`;
    el('ward').textContent = done ? 'Vault open' : `${stage.name} · ${poolLabel(stage.cost)}${stage.effect === 'untap' ? ' · untap a land on opening' : ''}`;
    el('objective').textContent = level.objective;
    el('field').textContent = list(state.field.map(f => name(f.id) + (f.tapped ? ' (tapped)' : '')));
    el('hand').textContent = list(state.hand.map(name));
    el('reserve').textContent = list(reserve.map(c => name(c.id)));
    el('graveyard').textContent = list(state.graveyard.map(name));
    el('undo').disabled = !game.canUndo;
    el('hint').disabled = done || hintCount === level.hints.length;
    el('hint-text').textContent = level.hints.slice(0, hintCount).join(' ');
    el('lesson').textContent = done ? level.lesson : '';
    const buttons = choices.map(action => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.textContent = vaultActionLabel(level, state, action);
      b.dataset.choice = choiceKey(action);
      b.addEventListener('click', () => {
        game.move(action);
        const next = game.state;
        el('notice').textContent = game.done
          ? `Vault open on turn ${next.turn} with ${next.life} life.`
          : game.choices.length ? b.textContent + '.' : 'No legal actions left. Undo or restart to try another line.';
        render(b.dataset.choice);
      });
      return b;
    });
    el('moves').replaceChildren(...buttons);
    if (focusKey) (buttons.find(b => b.dataset.choice === focusKey) || buttons[0] || el('notice')).focus();
  }
  function start(index) {
    level = VAULTS[index];
    game = createWorkbench(level);
    hintCount = 0;
    el('notice').textContent = '';
    render();
  }
  const picker = el('vault');
  VAULTS.forEach((v, index) => {
    const opt = doc.createElement('option');
    opt.value = index;
    opt.textContent = v.title;
    picker.append(opt);
  });
  picker.addEventListener('change', () => start(Number(picker.value)));
  el('undo').addEventListener('click', () => {
    game.undo();
    el('notice').textContent = 'Previous move restored.';
    render();
    if (el('undo').disabled) el('moves').querySelector('button')?.focus();
  });
  el('reset').addEventListener('click', () => start(Number(picker.value)));
  el('hint').addEventListener('click', () => {
    hintCount++;
    render();
    if (el('hint').disabled) el('hint-text').focus();
  });
  start(0);
}
