/**
 * Visual-only articulated phase poses for treefolk Nemata and slug-horror Toxrill.
 * Frame state is deterministic; bosses keep their existing combat AI and phases.
 */
export const ADVANCED_BOSS_KEYS=Object.freeze(['nemata','toxrill']);
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
    slimePulse:cast?[0,2,5,1][frame]:attack?[0,2,4,1][frame]:walk?[0,1,2,0][frame]:[0,1,2,1][frame]
  };
}
