// Rendering samples for the fixed-tick simulation. This module never writes to actors.
// Interpolate progress along the road so a frame between ticks follows bends instead of cutting corners.
const MAX_CONTINUOUS_TRAVEL = 96;

export function createRoadMotion() {
 const tracks = new WeakMap();

 function sample(actor, tick, fraction) {
  const progress = actor.progress;
  let track = tracks.get(actor);
  if (!track) {
   track = {tick, from:progress, to:progress, progress, travel:0, fraction:0};
   tracks.set(actor, track);
  } else if (track.tick !== tick || track.to !== progress) {
   const continuous = tick > track.tick && Math.abs(progress - track.to) <= MAX_CONTINUOUS_TRAVEL;
   track.from = continuous ? track.to : progress;
   track.to = progress;
   track.tick = tick;
   track.travel = track.to - track.from;
   track.fraction = 0;
  }
  track.fraction = Math.max(track.fraction, fraction);
  track.progress = track.from + track.travel * track.fraction;
  return track;
 }

 return {sample};
}
