/**
 * Visual-only articulated phase poses for six Magic legendary creatures and three original act bosses.
 * Frame state is deterministic; bosses keep their existing combat AI and phases.
 */
export const ADVANCED_BOSS_KEYS=Object.freeze(['nemata','arasta','drakuseth','krenko','scarab','toxrill','thornmother','matron','unwritten']);
export const BOSS_STATES=Object.freeze(['idle','walk','attack','cast','hurt','defeat']);
const WALK=Object.freeze([-2,0,2,-1]);
const STRIKE=Object.freeze([0,3,8,2]);
const CAST=Object.freeze([0,3,6,2]);
const HURT=Object.freeze([0,-2,-5,-1]);
const DEFEAT=Object.freeze([0,2,6,10]);
export function advancedBossPose(name,state,frame,back=false){
  if(!ADVANCED_BOSS_KEYS.includes(name))return null;
  if(!Number.isInteger(state)||state<0||state>=BOSS_STATES.length||
     !Number.isInteger(frame)||frame<0||frame>3)throw new Error('Invalid boss pose state/frame');
  const walk=state===1,attack=state===2,cast=state===3,hurt=state===4,defeat=state===5;
  const sink=defeat?DEFEAT[frame]:0;
  const pressure=attack?STRIKE[frame]:cast?CAST[frame]:0;
  const recoil=hurt?HURT[frame]:0;
  const idle=[0,-1,-2,-1][frame];
  const move=walk?WALK[frame]:0;
  return {
    name,back,sink,pressure,recoil,
    rootStep:walk?move:0,
    armReach:attack?STRIKE[frame]:cast?CAST[frame]*.55:0,
    canopySway:walk?move:cast?[-1,0,3,1][frame]:hurt?HURT[frame]*.7:idle,
    leafPulse:cast?[0,3,6,2][frame]:attack?[0,1,4,2][frame]:[0,2,4,1][frame],
    mantleWave:walk?[-2,0,3,1][frame]:attack?[0,2,5,1][frame]:cast?[0,1,3,1][frame]:idle,
    feelerBend:walk?[0,3,-1,-3][frame]:attack?[0,-2,-6,-1][frame]:
      cast?[0,-3,-7,-2][frame]:defeat?[0,3,8,11][frame]:[0,-1,-3,-1][frame],
    slugAdvance:attack?STRIKE[frame]*.42:hurt?recoil*.5:walk?move*.45:0,
    slimePulse:cast?[0,2,5,1][frame]:attack?[0,2,4,1][frame]:walk?[0,1,2,0][frame]:[0,1,2,1][frame],
    // Arasta: all eight limb roots retain their identity while gait and lunge
    // flex individual knees/tarsi. Idle and casting also change abdomen volume.
    spiderStep:walk?[-2,0,3,1][frame]:attack?[0,1,3,0][frame]:0,
    spiderLunge:attack?STRIKE[frame]*.52:hurt?recoil*.3:0,
    abdomenBreath:walk?[0,1,2,1][frame]:cast?[0,2,4,1][frame]:
      defeat?[-1,-2,-5,-8][frame]:[0,1,3,1][frame],
    webTension:cast?[0,2,6,1][frame]:attack?[0,1,4,1][frame]:0,
    // Drakuseth: the wing membranes and supported leading ribs articulate from
    // the shoulder. Neck, jaws, tail and flame have their own timed arcs.
    wingLift:walk?[0,3,6,2][frame]:attack?[0,4,9,3][frame]:
      cast?[0,5,11,4][frame]:hurt?[0,-3,-6,-2][frame]:
      defeat?[0,-2,-6,-10][frame]:[0,1,3,1][frame],
    neckThrust:attack?STRIKE[frame]*.36:cast?CAST[frame]*.25:hurt?recoil*.25:0,
    jawOpen:attack?[0,2,6,1][frame]:cast?[0,4,7,2][frame]:0,
    tailFlex:walk?[-2,1,3,0][frame]:attack?[0,3,5,1][frame]:
      defeat?[-1,-3,-5,-8][frame]:[0,1,2,0][frame],
    flameBloom:attack?[0,2,5,1][frame]:cast?[0,3,7,2][frame]:0,
    // Krenko: body weight follows his Goblin feet, the sword stays connected to
    // a moving arm, and a free-hand command gesture rises during summoning.
    goblinStep:walk?[-2,1,3,0][frame]:attack?[0,2,5,1][frame]:0,
    goblinCommand:cast?[0,3,7,2][frame]:attack?[0,1,3,0][frame]:0,
    goblinBlade:attack?[0,3,8,2][frame]:cast?[0,2,3,1][frame]:0,
    goblinHead:walk?[0,1,-1,0][frame]:attack?[0,-1,-3,-1][frame]:
      cast?[0,-2,-4,-2][frame]:hurt?[0,2,4,2][frame]:idle,
    // The Scarab God's ceremonial metal and winged cape form one coherent
    // body, never a generic wizard model. Its casting light follows the hands.
    scarabStep:walk?[-2,0,2,-1][frame]:attack?[0,1,2,1][frame]:0,
    scarabCape:walk?[0,2,4,1][frame]:attack?[0,2,5,1][frame]:
      cast?[0,4,8,3][frame]:defeat?[0,-2,-6,-9][frame]:[0,1,2,1][frame],
    scarabArm:cast?[0,3,7,2][frame]:attack?[0,2,5,1][frame]:
      hurt?[0,-1,-2,-1][frame]:0,
    scarabMagic:cast?[0,3,7,2][frame]:attack?[0,1,4,1][frame]:0,
    // Thornmother: rooted body, branch-lash, green heartwood and crown always
    // connect to the same sovereign trunk while reacting to combat.
    thornRoot:walk?[-2,0,2,-1][frame]:attack?[0,1,3,1][frame]:0,
    thornLash:attack?[0,3,8,2][frame]:cast?[0,1,4,1][frame]:0,
    thornCrown:walk?[0,1,3,1][frame]:cast?[0,2,5,2][frame]:
      hurt?[0,-2,-4,-1][frame]:defeat?[0,-2,-5,-8][frame]:idle,
    heartwoodPulse:cast?[0,2,5,1][frame]:attack?[0,1,3,1][frame]:[0,1,2,0][frame],
    // Matron: low-slung furnace abdomen and grasping brood-claws; never a dragon.
    broodStride:walk?[-2,1,3,0][frame]:attack?[0,1,3,0][frame]:0,
    clawSwipe:attack?[0,3,7,2][frame]:cast?[0,1,4,1][frame]:0,
    moltenPulse:cast?[0,2,6,2][frame]:attack?[0,2,5,1][frame]:[0,1,3,1][frame],
    hornTilt:walk?[0,1,2,0][frame]:attack?[0,-2,-4,-1][frame]:
      hurt?[0,2,5,1][frame]:defeat?[0,2,5,8][frame]:0,
    // The Unwritten: independent floating mask, scroll wings and void limbs,
    // with casting glyphs anchored to the same body rather than arbitrary dots.
    voidFloat:walk?[0,-2,-3,-1][frame]:cast?[0,-1,-4,-1][frame]:
      hurt?[0,2,5,1][frame]:defeat?[0,2,5,9][frame]:[0,-1,-2,-1][frame],
    scrollFlutter:walk?[0,2,4,1][frame]:attack?[0,2,6,1][frame]:
      cast?[0,3,7,2][frame]:defeat?[0,-2,-5,-9][frame]:[0,1,2,1][frame],
    voidArm:attack?[0,3,8,2][frame]:cast?[0,3,6,1][frame]:0,
    glyphBurst:cast?[0,2,6,1][frame]:attack?[0,1,4,1][frame]:0,
    maskBend:attack?[0,2,4,1][frame]:cast?[0,1,3,1][frame]:
      hurt?[0,-2,-5,-1][frame]:defeat?[0,-2,-4,-6][frame]:0
  };
}
