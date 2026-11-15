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
  caterpillar:'larval',rhino:'hoofed',wurm:'burrowing',toxrill:'slug-horror'
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
