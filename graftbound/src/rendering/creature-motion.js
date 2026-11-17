/**
 * Deterministic presentation poses and surface lighting for the creature families
 * still awaiting fully authored raster animation sheets.
 *
 * No combat timing changes. Motion is derived from the animation state and frame
 * only, so playbacks never consume simulation randomness.
 */
export const CREATURE_MOTION_FAMILIES=Object.freeze({
  wolf:'quadruped',direwolf:'quadruped',
  friendlyDrake:'winged',torchgoblin:'biped',friendlyGoblin:'biped',
  saproling:'fungal',
  spiderling:'arachnid',friendlySnake:'serpent',friendlyHornet:'insect',stinger:'insect',
  friendlyCatSoldier:'feline-warrior',friendlySkeleton:'skeleton',zombie:'undead',
  golem:'construct',gearhulk:'construct',titan:'construct',
  friendlyElemental:'flame-being',friendlyBirdIllusion:'winged-illusion',
  friendlyTentacle:'tentacular',angel:'celestial',
  caterpillar:'larval',rhino:'hoofed',wurm:'burrowing',toxrill:'slug-horror',
  // v1.5.0 native folk studies
  bow:'biped',alchemist:'robed',blightcaster:'robed',minotaur:'biped',spikeshot:'biped',shinobi:'biped',duelist:'winged-biped',friendlySquirrel:'rodent'
});
const GAIT=Object.freeze([-1,0,1,0]);
const HOP=Object.freeze([0,-2,-4,-1]);
const ATTACK=Object.freeze([0,2,7,1]);
const RECOIL=Object.freeze([0,-3,-5,-1]);
const AIR=Object.freeze([0,3,6,2]);
const SINK=Object.freeze([0,1,5,8]);

export function creaturePose(feature,animation,frame,back=false) {
  const kind=CREATURE_MOTION_FAMILIES[feature];
  if(!kind) return null;
  if(!Number.isInteger(animation)||animation<0||animation>5)throw new Error('Invalid creature animation state');
  if(!Number.isInteger(frame)||frame<0||frame>3)throw new Error('Invalid creature frame');
  const walk=animation===1, attack=animation===2, cast=animation===3;
  const hurt=animation===4, defeat=animation===5;
  const gait=walk?GAIT[frame]:0;
  const leap=attack?ATTACK[frame]:0;
  const recoil=hurt?RECOIL[frame]:0;
  const collapse=defeat?SINK[frame]:0;
  return {
    kind,
    // The viewing direction changes limb order without mirroring asymmetric gear.
    nearStep:gait*(back?-1:1),
    farStep:-gait*(back?-1:1),
    bob:walk?HOP[frame]:cast?[-1,-2,-1,0][frame]:defeat?collapse:0,
    advance:attack?leap:hurt?recoil:0,
    head:attack?[0,-2,-4,-1][frame]:cast?[-1,-3,-5,-2][frame]:hurt?[0,2,4,2][frame]:0,
    tail:walk?[0,3,1,-2][frame]:attack?[0,2,5,1][frame]:defeat?[-2,-4,-7,-10][frame]:[0,1,2,1][frame],
    wing:walk?AIR[frame]:cast?[0,6,10,5][frame]:attack?[0,4,9,1][frame]:hurt?[0,-3,-6,-3][frame]:defeat?[-2,-5,-8,-10][frame]:0,
    strike:attack?ATTACK[frame]:cast?[0,2,4,1][frame]:0,
    tilt:attack?[-2,-5,-9,-2][frame]:hurt?[0,4,8,3][frame]:defeat?[0,5,9,14][frame]:[0,1,0,-1][frame],
    collapse,
  };
}

/** Authored broad lighting bands, not coordinate-hash speckles.
 * Preserve material-specific volume cues and silhouettes at game zoom.
 */
export function materialLightDelta(x,y,w,h,feature,edgeSides=0){
  const nx=(x+.5)/Math.max(1,w), ny=(y+.5)/Math.max(1,h);
  const organic=/wolf|direwolf|caterpillar|squirrel|snake|saproling|wurm|rhino|cat|hornet|spider|stinger|stalker|toxrill/i.test(feature);
  const metal=/golem|titan|gearhulk|duelist|shinobi|bow|soldier|skeleton|sentinel|armor/i.test(feature);
  // Shared upper-left lighting direction across every character family.
  let light=(.5-nx)*10+(.48-ny)*8;
  if(organic) {
    // Warm underside shadow and long fur/foliage material rhythm, not random dither.
    light-=Math.max(0,ny-.57)*10;
    light+=Math.sin((nx*.6+ny*.4)*Math.PI*3)*2;
  }
  if(metal) {
    // A broad coherent specular plane, intentionally not one-pixel scratches.
    const streak=Math.abs((nx-.53)-((ny-.45)*.24));
    light+=Math.max(0,1-streak*9)*10;
    light-=Math.max(0,ny-.75)*6;
  }
  if(edgeSides) light+=(nx<.5||ny<.4)?6:-7;
  return Math.max(-24,Math.min(24,Math.round(light)));
}

/** v1.6.0 shared HD-2D finishing pass for every generated creature study, matching the hero/Soldier standard:
 *  - selective outline (sel-out): edge pixels darken toward their OWN colour (never flat black), heavier on the
 *    lower-right (shadow side) and lighter on the upper-left;
 *  - rim light: a one-pixel warm highlight on upper-left silhouette edges (shared light direction);
 *  - contact occlusion: the lowest opaque rows of each column darken slightly so creatures sit on the ground.
 *  Deterministic, frame-local and alpha-preserving (silhouettes and hit areas are unchanged). */
export function finishCreatureCell(data, w, h, { rim = [255, 236, 200], strength = 1 } = {}) {
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]);
  const src = new Uint8ClampedArray(data);
  const lowest = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (src[(y * w + x) * 4 + 3] >= 128) { lowest[x] = y; break; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3] < 128) continue;
    const openL = A(x - 1, y) < 128, openT = A(x, y - 1) < 128, openR = A(x + 1, y) < 128, openB = A(x, y + 1) < 128;
    let k = 1, add = 0;
    if (openR || openB) k = 0.5;                       // shadow-side sel-out
    else if (openL || openT) { k = 0.82; add = 1; }    // light-side edge
    if (add && (openT || openL) && !(openR || openB)) { for (let c = 0; c < 3; c++) data[i + c] = Math.round(src[i + c] * 0.45 + rim[c] * 0.55 * strength + src[i + c] * 0.55 * (1 - strength)); continue; }
    if (lowest[x] >= 0 && y >= lowest[x] - 2) k *= 0.8;   // contact occlusion
    if (k !== 1) for (let c = 0; c < 3; c++) data[i + c] = Math.round(src[i + c] * k);
  }
  return data;
}
