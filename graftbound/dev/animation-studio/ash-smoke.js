// Original Pyroclasm Ash A residue: tiny, cool-gray wisps that persist until
// the current encounter/battlefield is reset. Pure time-based animation: no
// timers, random gameplay state, screen-space gradients, fires, or extra units.
// Independent of the cinematic's capped 5.2-second playback timeline.
export const ASH_SMOKE_CYCLE = 3.2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const k=clamp(v);return k*k*(3-2*k);};
const frac=n=>n-Math.floor(n);

/**
 * Return tiny smoke flecks in mound-relative coordinates:
 * x in tile widths; rise in mound heights, alpha in [0,0.23].
 * `elapsed` is the time since the bodies became ash, not the spell clock.
 * Passing any larger elapsed value remains animated with no lifetime cutoff.
 */
export function ashSmokePuffs(elapsed,uid=0,reduced=false){
  if(!Number.isFinite(elapsed)||elapsed<0)return [];
  const puffs=[];
  const strands=reduced?1:2;
  const steps=reduced?2:3;
  for(let strand=0;strand<strands;strand++){
    for(let segment=0;segment<steps;segment++){
      const phase=frac(elapsed/ASH_SMOKE_CYCLE+segment/steps+
        strand*.46+uid*.137);
      const appear=smooth(phase/.14);
      const disappear=1-smooth((phase-.68)/.32);
      const alpha=appear*disappear*(reduced?.16:.22)*(strand? .77:1);
      if(alpha<.009)continue;
      const side=strand===0?-.045:.07;
      const drift=.055*Math.sin(elapsed*.68+uid*.47+strand*1.9+phase*3.5);
      const x=side+drift+.075*(phase-.5);
      puffs.push({
        x,
        rise:.06+phase*.97,
        alpha,
        size:.045+(1-phase)*.017,
      });
    }
  }
  return puffs;
}
