import { effectiveTickMs, pause, start, step, turn } from "../../src/engine.js";
import { LAIR_BOSSES, completeLairRun, createLairRun, lairDetails } from "../../src/lair.js";
import { BRIEFING_SECONDS } from "../../src/boss-briefing.js";
import { keyboardDirection, swipeHeading } from "../../src/input-controls.js";
import { createCachedBackdrop } from "../../src/level-background.js";
import { drawTerrain } from "../../src/environments.js";
import { drawBurrowWarning, drawMiniboss, drawWebs } from "../../src/boss-art.js";
import { drawBroodmotherHatchlings } from "../../src/broodmother-hatchlings.js";
import { drawPlayerLocator, drawQueuedTurn } from "../../src/player-visibility.js";
import { createLossReview, describeLossFrame } from "./loss-review.js";

const $ = id => document.getElementById(id);
const arena = $("arena");
const ctx = arena.getContext("2d");
const boss = $("boss");
const scrubber = $("frame");
const beginButton = $("start");
const pauseButton = $("pause");
const playButton = $("play");
const paintBackdrop = createCachedBackdrop();
let run, review, loss, pointer;
let countdown = 0, accumulator = 0, lastFrame = 0, animationId = 0;
let playback = null;

for (const entry of LAIR_BOSSES) {
 boss.add(new Option(lairDetails(entry.id).name, entry.id));
}

function draw(frame = run) {
 const cell = arena.width / frame.cols;
 paintBackdrop(ctx, arena, null, frame.cols, frame.rows, cell, frame.biome);
 drawTerrain(ctx, frame, cell);
 drawWebs(ctx, frame.encounter?.webs, cell);
 drawMiniboss(ctx, frame.enemies, cell, frame.encounter?.phase);
 drawBurrowWarning(ctx, frame.encounter?.telegraph, cell);
 drawBroodmotherHatchlings(ctx, frame, cell, frame.tick * 150 || 0);
 for (let index = frame.body.length - 1; index >= 0; index--) {
  const part = frame.body[index];
  ctx.fillStyle = index === 0 ? "#cbeea7" : "#82a65e";
  ctx.fillRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4);
 }
 const heading = frame.turnQueue[0] ?? frame.direction;
 drawPlayerLocator(ctx, frame.body[0], heading, cell);
 drawQueuedTurn(ctx, frame.body[0], frame.turnQueue[0], frame.cols, frame.rows, cell);
 if (frame.impact) {
  const x = Math.max(0, Math.min(frame.cols - 1, frame.impact.x));
  const y = Math.max(0, Math.min(frame.rows - 1, frame.impact.y));
  ctx.strokeStyle = "#ff8871";
  ctx.lineWidth = 3;
  ctx.strokeRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
 }
}

function updateControls() {
 const active = countdown > 0 || run.status === "running" || run.status === "paused";
 boss.disabled = active;
 beginButton.disabled = active;
 beginButton.textContent = run.status === "over" || run.status === "won" ? "Rematch same boss" : "Begin encounter";
 pauseButton.disabled = countdown > 0 || !active;
 pauseButton.textContent = run.status === "paused" ? "Resume" : "Pause";
 $("countdown").hidden = countdown <= 0;
 $("arena-phase").textContent = run.encounter ? `Phase ${run.encounter.phase} of ${run.encounter.phases}` : "Encounter complete";
 $("condition").textContent = run.encounter?.stunMs > 0 ? "Swarm webbed" : (run.mercy > 0 ? "Instinct ready" : "Instinct spent");
}

function scheduleFrame() {
 if (!animationId) animationId = requestAnimationFrame(animate);
}

function stopPlayback() {
 playback = null;
 playButton.textContent = "Play replay";
}

function displayFrame(index) {
 const frame = loss.frames[index];
 const details = describeLossFrame(frame);
 scrubber.value = index;
 const elapsed = (frame.elapsedMs - loss.frames.at(-1).elapsedMs) / 1000;
 $("time").textContent = elapsed === 0 ? "Final step" : `${elapsed.toFixed(2)} s`;
 scrubber.setAttribute("aria-valuetext", $("time").textContent);
 for (const label of ["turns", "warnings", "heading", "finding"]) $(label).textContent = details[label];
 draw(frame);
}

function finish() {
 accumulator = 0;
 lastFrame = 0;
 pointer = null;
 $("status").textContent = run.endReason;
 loss = review.loss();
 if (loss) {
  $("review").hidden = false;
  $("ending").textContent = loss.reason;
  const last = loss.frames.length - 1;
  scrubber.max = last;
  displayFrame(last);
 } else draw();
 updateControls();
 beginButton.focus({ preventScroll: true });
}

function animate(now) {
 animationId = 0;
 const elapsed = lastFrame ? Math.min(now - lastFrame, 250) : 0;
 lastFrame = now;
 if (playback) {
  playback.elapsed += elapsed;
  let index = Number(scrubber.value);
  while (index + 1 < loss.frames.length && loss.frames[index + 1].elapsedMs <= playback.elapsed) index++;
  displayFrame(index);
  if (index === loss.frames.length - 1) stopPlayback();
 } else if (countdown > 0) {
  countdown = Math.max(0, countdown - elapsed);
  $("countdown").textContent = Math.ceil(countdown / 1000);
  if (!countdown) {
   start(run);
   $("status").textContent = "Encounter active.";
   updateControls();
  }
 } else if (run.status === "running") {
  accumulator += elapsed;
  let interval = effectiveTickMs(run);
  while (accumulator >= interval && run.status === "running") {
   accumulator -= interval;
   step(run);
   completeLairRun(run);
   review.capture(interval);
   interval = effectiveTickMs(run);
  }
  if (run.status === "over" || run.status === "won") {
   finish();
   return;
  }
  draw();
  updateControls();
 }
 if (playback || countdown > 0 || run.status === "running") scheduleFrame();
}

function selectEncounter() {
 stopPlayback();
 run = createLairRun(boss.value);
 loss = null;
 $("review").hidden = true;
 const details = lairDetails(boss.value);
 $("arena-name").textContent = details.name;
 $("ability").textContent = `${details.ability} · ${details.captures} captures to win`;
 $("status").textContent = "Begin when ready.";
 updateControls();
 draw();
}

function begin() {
 selectEncounter();
 review = createLossReview(run);
 countdown = BRIEFING_SECONDS * 1000;
 $("countdown").textContent = BRIEFING_SECONDS;
 $("status").textContent = "Encounter starting.";
 accumulator = 0;
 lastFrame = 0;
 updateControls();
 arena.focus({ preventScroll: true });
 scheduleFrame();
}

function togglePause() {
 if (pauseButton.disabled) return;
 if (run.status === "running") {
  pause(run);
  pointer = null;
  $("status").textContent = "Encounter paused.";
 } else {
  start(run);
  lastFrame = 0;
  $("status").textContent = "Encounter active.";
  arena.focus({ preventScroll: true });
  scheduleFrame();
 }
 updateControls();
}

function steer(heading, source) {
 if (heading && turn(run, heading)) review.acceptedTurn(heading, source);
}

boss.addEventListener("change", selectEncounter);
beginButton.addEventListener("click", begin);
pauseButton.addEventListener("click", togglePause);
arena.addEventListener("keydown", event => {
 if (event.code === "Space" && !event.repeat) {
  event.preventDefault();
  togglePause();
  return;
 }
 const heading = keyboardDirection(event.key, event.repeat);
 if (heading) {
  event.preventDefault();
  steer(heading, "keyboard");
 }
});
arena.addEventListener("pointerdown", event => {
 if (run.status !== "running" || event.pointerType !== "touch" || !event.isPrimary) return;
 pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
 arena.setPointerCapture(event.pointerId);
});
arena.addEventListener("pointerup", event => {
 if (pointer?.id !== event.pointerId) return;
 steer(swipeHeading(event.clientX - pointer.x, event.clientY - pointer.y), "swipe");
 pointer = null;
});
arena.addEventListener("pointercancel", () => { pointer = null; });
document.addEventListener("visibilitychange", () => {
 if (!document.hidden) return;
 stopPlayback();
 if (run.status === "running") togglePause();
});
scrubber.addEventListener("input", () => {
 stopPlayback();
 displayFrame(Number(scrubber.value));
});
playButton.addEventListener("click", () => {
 if (playback) {
  stopPlayback();
  return;
 }
 if (Number(scrubber.value) === loss.frames.length - 1) displayFrame(0);
 playback = { elapsed: loss.frames[Number(scrubber.value)].elapsedMs };
 playButton.textContent = "Stop replay";
 lastFrame = 0;
 scheduleFrame();
});
selectEncounter();
