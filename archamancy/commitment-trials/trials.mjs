import {createEngine, VERSION} from '../engine.mjs';

export const TRIAL_ENGINE_VERSION = '0.1.0-beta.13.68';
export const TRIALS = {
  green: {
    name: 'Green · Roots and Reach', color: 'G', first: 4, last: 6, mana: 1550, minimum: 14,
    deck: ['wild', 'awaken', 'root', 'verdant', 'bloom'],
    objective: 'Clear waves 4–6 with at least 14 fortress health. Can you do it with 80 or more mana harvested?',
  },
  blue: {
    name: 'Blue · Two Kinds of Trouble', color: 'U', first: 8, last: 9, mana: 1800, minimum: 19,
    deck: ['inquiry', 'echo', 'reflection', 'reset', 'freeze'],
    objective: 'Clear waves 8–9 with at least 19 fortress health. Can you keep the road completely sealed?',
  },
};

const decisions = new Set(['clear', 'build', 'upgrade', 'sell', 'target', 'flightTarget', 'rally', 'cast', 'discard', 'wave']);

export function createTrial(id) {
  if (VERSION !== TRIAL_ENGINE_VERSION) throw Error('These trials need ARCHEMANCY ' + TRIAL_ENGINE_VERSION + '.');
  if (!Object.hasOwn(TRIALS, id)) throw Error('Unknown commitment trial.');
  const trial = TRIALS[id];
  const game = createEngine(3, 'campaign', 'hollow');
  const locked = Object.entries(game.roster).filter(([, tower]) => tower.color !== trial.color).map(([kind]) => kind);
  for (const action of [{type: 'difficulty', level: 'hard'}, {type: 'locks', towers: locked}, {type: 'kit', deck: trial.deck}]) {
    if (!game.command(action)) throw Error('Trial setup failed: ' + action.type);
  }
  game.state.wave = trial.first - 1;
  game.state.mana = trial.mana;
  function result() {
    const {health, phase, wave, stats} = game.state;
    if (phase === 'lost') return 'Fortress lost.';
    if (phase !== 'ready' || wave !== trial.last) return '';
    const cleared = health >= trial.minimum ? 'Trial cleared' : 'Health target missed';
    return `${cleared} · ${health} fortress health · ${stats.farmMana} mana harvested`;
  }
  function command(action) {
    if (!decisions.has(action?.type) || result()) return false;
    return game.command(action);
  }
  return {game, trial, result, command};
}
