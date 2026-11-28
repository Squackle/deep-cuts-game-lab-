import test from "node:test";
import assert from "node:assert/strict";
import { effectiveTickMs, start, step, turn } from "../src/engine.js";
import { LAIR_BOSSES, createLairRun } from "../src/lair.js";
import { REVIEW_WINDOW_MS, createLossReview, describeLossFrame } from "../hive-run/lair-workshop/loss-review.js";

function recordStep(run, review) {
 const elapsed = effectiveTickMs(run);
 step(run);
 review.capture(elapsed);
}

test("Lair rematches recreate the same boss and seeded opening", () => {
 for (const boss of LAIR_BOSSES) {
  const first = createLairRun(boss.id);
  const rematch = createLairRun(boss.id);
  assert.equal(rematch.seed, first.seed);
  assert.deepEqual(rematch.body, first.body);
  assert.deepEqual(rematch.enemies, first.enemies);
  assert.deepEqual(rematch.terrain, first.terrain);
 }
});

test("a recorded Lair collision captures the real final state", () => {
 const run = start(createLairRun("stalker"));
 const review = createLossReview(run);
 while (run.encounter.introMs > 0) recordStep(run, review);
 assert.equal(turn(run, "down"), true);
 review.acceptedTurn("down", "keyboard");
 recordStep(run, review);
 for (let index = 0; index < 40 && run.status === "running"; index++) recordStep(run, review);
 const loss = review.loss();
 assert.ok(loss);
 const last = loss.frames.at(-1);
 assert.equal(last.ending, run.endReason);
 assert.equal(describeLossFrame(last).finding, run.endReason);
 assert.ok(last.elapsedMs - loss.frames[0].elapsedMs <= REVIEW_WINDOW_MS);
 assert.equal(last.direction, "down");
 assert.ok(loss.frames.some(frame => frame.turns.some(input => input.heading === "down" && input.source === "keyboard")));
 assert.notEqual(last.body, run.body);
});

test("replay facts report visible warnings and webbed state", () => {
 const run = start(createLairRun("weaver"));
 const review = createLossReview(run);
 run.encounter.webs.push({ pos: { x: 6, y: 4 }, lifeMs: 800 });
 run.encounter.stunMs = 1000;
 run.terrain.push({ kind: "seal", pos: { x: 1, y: 2 }, warningMs: 300 });
 review.capture(150);
 run.status = "over";
 run.endReason = "You hit the arena wall.";
 run.event = { type: "death" };
 review.capture(150);
 const details = describeLossFrame(review.loss().frames[1]);
 assert.match(details.warnings, /Seal warning at column 2, row 3/);
 assert.match(details.warnings, /Web at column 7, row 5/);
 assert.equal(details.finding, "Swarm webbed");
});
