import { cardHTML, backHTML } from './cards.js';
// Presentation-only card flights. The engine has already mutated the deck and logged
// replay events; animation may safely be skipped without affecting game state.
export const motionDuration = (setting='auto', reduced=false) => {
  if(reduced || setting==='off') return 0;
  return setting==='minimal'?130:setting==='full'?440:330;
};

export class CardAnimationDirector {
  constructor(app){this.app=app;this.active=new Set();}
  stop(){for(const fx of this.active){fx.cancel?.();}this.active.clear();}
  async play(kind, event={}) {
    if(typeof document==='undefined' || document.hidden || !document.querySelector('#gb-card-zones')) return;
    const setting=this.app.meta?.settings?.cardMotion||'auto';
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration=motionDuration(setting,reduced);
    if(!duration) return;
    const lib=document.querySelector('.gb-zone-library');
    const grave=document.querySelector('.gb-zone-graveyard');
    const hand=document.querySelector('#tray');
    if(!lib||!grave||!hand)return;
    const libR=lib.getBoundingClientRect(),graveR=grave.getBoundingClientRect(),handR=hand.getBoundingClientRect();
    const center=r=>({x:r.left+r.width*.5,y:r.top+r.height*.5});
    const centers={library:center(libR),graveyard:center(graveR),hand:center(handR)};
    const route={draw:['library','hand'],cast:['hand','graveyard'],discard:['hand','graveyard'],return:['graveyard','hand'],shuffle:['graveyard','library']}[kind];
    if(!route)return;
    const start=centers[route[0]],end=centers[route[1]];
    const isFace=(kind==='cast'||kind==='discard'||kind==='return') && !!event.id;
    const sprite=document.createElement('div');sprite.className='gb-card-flight'+(isFace?' faceup':' facedown');
    // A real, resolved card face on cast/discard/return. Draw and shuffle stay concealed.
    sprite.innerHTML=isFace ? cardHTML(event.id,{small:true,level:event.level||1,uid:'flight',extraClass:'in-flight'}) : backHTML();
    sprite.setAttribute('aria-hidden','true');
    document.body.appendChild(sprite);
    const dx=end.x-start.x,dy=end.y-start.y;
    const durationMs=duration/Math.max(1,this.app.animFactor?.()||1);
    let animation;
    try{
      sprite.style.left=start.x+'px';sprite.style.top=start.y+'px';
      animation=sprite.animate([
        {transform:'translate(-50%,-50%) rotate(-11deg) scale(.75)',opacity:0.15},
        {transform:`translate(calc(-50% + ${dx*.52}px),calc(-50% + ${dy*.42-42}px)) rotate(7deg) scale(1.04)`,opacity:1,offset:.52},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(0deg) scale(.75)`,opacity:.06},
      ],{duration:durationMs,easing:'cubic-bezier(.2,.68,.22,1)',fill:'forwards'});
      this.active.add(animation);
      await animation.finished.catch(()=>{});
    }catch(_){/* Visual errors must never alter deterministic gameplay. */}
    finally{if(animation)this.active.delete(animation);sprite.remove();}
  }
}
