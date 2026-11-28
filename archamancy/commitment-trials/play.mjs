import {createTrial, TRIALS} from './trials.mjs';

const el = id => document.getElementById(id);
const canvas = el('map'), ctx = canvas.getContext('2d');
let run, selected = 0, paused = false;

function choose(id, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  el(id).append(option);
}

function status() {
  const {game, trial} = run, {state} = game;
  const finished = run.result();
  el('wave').textContent = state.phase === 'ready' && !finished ? `Before wave ${state.wave + 1}` : `Wave ${state.wave} of ${trial.last}`;
  el('status').textContent = `${state.health} fortress · ${state.mana} mana · ${state.stats.farmMana} harvested · ${state.enemies.length + state.queue.length} enemies left in wave`;
  el('start').disabled = state.phase !== 'ready' || !!finished;
  el('pause').disabled = state.phase !== 'active';
  el('pause').textContent = paused ? 'Resume' : 'Pause';
  el('step').disabled = state.phase !== 'active' || !paused;
  const next = state.phase === 'ready' ? state.wave + 1 : state.wave;
  el('forecast').textContent = finished ? '' : game.waveSpec(next).map(spec => {
    const [kind, count] = spec.split(':');
    return `${count} × ${game.types[kind].role}`;
  }).join(' · ');
}

function draw() {
  const {game} = run, {state} = game;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#bba27a'; ctx.lineWidth = 26; ctx.lineJoin = 'round';
  for (const route of game.map.segments) {
    ctx.beginPath();
    route.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 22px system-ui';
  for (const pad of game.map.pads) {
    const tower = state.towers[pad.id];
    ctx.beginPath(); ctx.arc(pad.x, pad.y, 28, 0, 2 * Math.PI);
    ctx.fillStyle = tower ? run.trial.color === 'G' ? '#245b3b' : '#205d79' : '#263935';
    ctx.fill(); ctx.lineWidth = pad.id === selected ? 6 : 3;
    ctx.strokeStyle = pad.id === selected ? '#ffe39d' : '#8aad9f'; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(tower ? `${pad.id + 1}·${tower.tier}` : String(pad.id + 1), pad.x, pad.y);
  }
  for (const enemy of state.enemies) {
    const {x, y} = game.pointAt(enemy.progress);
    ctx.beginPath(); ctx.arc(x, y, enemy.boss ? 17 : 8, 0, 2 * Math.PI);
    ctx.fillStyle = enemy.flying ? '#fbc376' : enemy.shroud ? '#b49cf8' : enemy.resist >= 100 ? '#8ae1e4' : '#ff8a8a';
    ctx.fill();
  }
}

function controls() {
  const {game, trial} = run, {state} = game;
  const pad = selected, tower = state.towers[pad];
  const options = [], hand = [];
  const add = (list, label, action) => list.push({label, action});
  if (state.rubble[pad]) {
    add(options, `Clear pad · ${state.rubble[pad]} mana`, {type: 'clear', pad});
  } else if (!tower) {
    for (const [kind, spec] of Object.entries(game.roster)) {
      if (spec.color === trial.color) add(options, `Build ${spec.name} · ${spec.cost} mana`, {type: 'build', kind, pad});
    }
  } else {
    const cost = game.upgradeCost(tower);
    if (tower.tier === 2) {
      for (const branch of game.branchOptions(tower)) add(options, `${branch.name} · ${cost} mana`, {type: 'upgrade', pad, branch: branch.id});
    } else if (cost !== null) {
      add(options, `Upgrade ${game.branchName(tower)} · ${cost} mana`, {type: 'upgrade', pad});
    }
    add(options, `Sell ${game.branchName(tower)} · recover ${Math.floor(tower.paid * .7)} mana`, {type: 'sell', pad});
  }
  const {x, y} = game.map.pads[pad], point = game.pointAt(game.nearestPath(x, y));
  state.hand.forEach((id, index) => {
    const spec = game.cards[id], aim = spec.target === 'tower' ? {pad} : spec.target === 'ground' ? point : {};
    add(hand, `Cast ${spec.name} · ${game.castCost(id)} mana`, {type: 'cast', index, ...aim});
    add(hand, `Discard ${spec.name}`, {type: 'discard', index});
  });
  for (const [id, list] of [['tower', options], ['hand', hand]]) {
    el(id).replaceChildren(...list.map(({label, action}) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.disabled = !!run.result();
      button.onclick = () => {
        const accepted = run.command(action);
        el('report').textContent = accepted ? label : 'Action unavailable for this pad or current mana.';
        if (accepted) { controls(); status(); draw(); el('pad').focus(); }
      };
      return button;
    }));
  }
}

function tick(count = 1) {
  const {game} = run, {state} = game;
  if (state.phase !== 'active') return;
  const hand = state.hand.join();
  for (let i = 0; i < count && state.phase === 'active'; i++) game.step();
  status(); draw();
  if (hand !== state.hand.join() || state.phase !== 'active') controls();
  if (run.result()) el('report').textContent = run.result();
}

function reset() {
  try {
    run = createTrial(el('trial').value);
  } catch (error) {
    el('report').textContent = error.message;
    return;
  }
  paused = false; selected = 0;
  el('objective').textContent = run.trial.objective;
  el('report').textContent = '';
  el('pad').replaceChildren();
  for (const pad of run.game.map.pads) choose('pad', pad.id, `Pad ${pad.id + 1}${pad.bonus ? ' · ' + pad.bonus : ''}`);
  status(); controls(); draw();
}

for (const [id, trial] of Object.entries(TRIALS)) choose('trial', id, trial.name);
el('trial').addEventListener('change', reset);
el('restart').addEventListener('click', reset);
el('start').addEventListener('click', () => {
  if (run.command({type: 'wave'})) {
    el('report').textContent = `Wave ${run.game.state.wave} called.`;
    status(); controls(); draw(); el('pause').focus();
  }
});
el('pause').addEventListener('click', () => { paused = !paused; status(); });
el('step').addEventListener('click', () => tick(10));
el('pad').addEventListener('change', () => { selected = Number(el('pad').value); controls(); draw(); });
canvas.addEventListener('click', event => {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
  const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
  const pad = run?.game.map.pads.find(p => Math.hypot(p.x - x, p.y - y) <= 30);
  if (pad) {
    selected = pad.id; el('pad').value = String(selected); controls(); draw();
  }
});
reset();
setInterval(() => { if (run && !paused && !document.hidden) tick(); }, 100);
