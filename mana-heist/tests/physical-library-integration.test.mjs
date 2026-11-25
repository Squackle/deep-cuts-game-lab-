import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {chooseAutomaticCast} from "../src/auto-cast.js";
import {manualCastOptions, popUndoFrame} from "../src/cast-controls.js";
import {VERSION, PHYSICAL_LIBRARY_VERSION, initial, actions, reduce, completed} from "../src/engine.js";
import {
  SAVE_KEYS,
  readGuestSaves,
  createGuestBackup,
  parseGuestBackup,
  previewGuestRestore,
  applyGuestRestore,
} from "../src/guest-backup.js";
import {LEVELS} from "../src/levels.js";
import {FIXTURE, createWorkbench} from "../src/physical-library-workbench.js";
import {reservePresentation} from "../src/reserve-presentation.js";
import {replay, solve} from "../src/solver.js";
import {legalContinuation} from "../src/verified-hints.js";

function move(level, state, predicate) {
  const action = actions(level, state).find(predicate);
  assert.ok(action, "Expected a legal action");
  const result = reduce(level, state, action);
  assert.ok(result.ok, result.error);
  return result.state;
}

test("integrated physical reserve matches the reducer on fetch, bounce, and undo", () => {
  const level = FIXTURE;
  const start = initial(level);
  const afterFetch = move(level, start, action => (
    action.type === "fetch" && action.id === "f1" && action.targetId === "blue1"
  ));
  assert.deepEqual(reservePresentation(level, afterFetch).cards.map(card => card.id), ["blue2", "red"]);

  const afterBounce = move(level, afterFetch, action => action.type === "play" && action.returnId === "blue1");
  assert.deepEqual(reservePresentation(level, afterBounce).cards.map(card => card.id), ["blue2", "red"]);
  assert.ok(afterBounce.hand.includes("blue1"));

  const frames = [{state: start, automatic: false}, {state: afterFetch, automatic: false}];
  assert.deepEqual(
    reservePresentation(level, popUndoFrame(frames).state).cards.map(card => card.id),
    ["blue2", "red"],
  );
  assert.equal(reservePresentation(level, popUndoFrame(frames).state).cards.length, 3);
});

test("candidate manual cast, automatic cast, and verified hints use legal payments", () => {
  const level = {
    ...FIXTURE,
    turnLimit: 1,
    hand: [],
    stages: [{name: "First generic", cost: {N: 1}}, {name: "Final blue", cost: {U: 1}}],
  };
  let state = initial(level);
  for (const [id, targetId] of [["f1", "blue1"], ["f2", "red"]]) {
    state = move(level, state, action => action.type === "fetch" && action.id === id && action.targetId === targetId);
  }
  for (const id of ["blue1", "red"]) {
    state = move(level, state, action => action.type === "tap" && action.id === id);
  }

  assert.equal(manualCastOptions(level, state).length, 2);
  assert.equal(chooseAutomaticCast(level, state)?.spend.R, 1);
  assert.equal(legalContinuation(level, state, null).status, "solved");

  const spentBlue = move(level, state, action => action.type === "cast" && action.spend.U === 1);
  assert.equal(solve(level, {startState: spentBlue}).status, "unsolvable");
  const spentRed = move(level, state, action => action.type === "cast" && action.spend.R === 1);
  assert.ok(completed(level, move(level, spentRed, action => action.type === "cast")));
});

test("candidate workbench preserves 500 legacy campaign definitions and guest saves", () => {
  assert.equal(LEVELS.length, 500);
  assert.ok(LEVELS.every(level => level.version === VERSION));
  assert.equal(new Set(LEVELS.map(level => level.id)).size, 500);

  const legacy = LEVELS.find(level => level.id === "mh-12");
  const candidate = {...legacy, version: PHYSICAL_LIBRARY_VERSION};
  const legacyTrace = solve(legacy);
  assert.equal(legacyTrace.status, "solved");
  assert.ok(replay(legacy, legacyTrace.actions).ok);
  assert.ok(replay(candidate, legacyTrace.actions).ok);

  const savedCampaign = {
    v: 2,
    index: 11,
    bests: {"mh-12": {turn: 1, spentLife: 1}, "mh-01": {turn: 1, spentLife: 0}},
  };
  const entries = new Map([[SAVE_KEYS.campaign, JSON.stringify(savedCampaign)], ["unrelated", "keep"]]);
  const storage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key),
  };

  const before = readGuestSaves(storage.getItem);
  const bytes = JSON.stringify([...entries]);
  const workbench = createWorkbench();
  workbench.move(workbench.choices.find(action => action.type === "fetch"));
  workbench.undo();
  workbench.reset();
  assert.equal(JSON.stringify([...entries]), bytes);

  const backup = parseGuestBackup(createGuestBackup(before));
  assert.deepEqual(backup, before);
  assert.ok(applyGuestRestore(storage, previewGuestRestore(before, backup)));
  assert.deepEqual(readGuestSaves(storage.getItem), before);
  assert.equal(entries.get("unrelated"), "keep");

  const source = readFileSync(new URL("../src/physical-library-workbench.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(|\/api\//);
});
