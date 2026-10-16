// Viewport-aware card fan geometry, independent of mana rules or stored progress.
// A small overlap is intentional even on wide screens: a hand feels held,
// not like an ordinary row of separate cards.
const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
export function handFanLayout(count,viewportWidth,viewportHeight){
 const vw=Math.max(240,Number(viewportWidth)||390);
 const vh=Math.max(360,Number(viewportHeight)||740);
 const phone=vw<=650;
 const cardWidth=Math.round(clamp(vh*(phone?.18:.177),phone?86:110,phone?125:160));
 const usableWidth=Math.max(180,vw-(phone?20:52));
 const naturalSpacing=cardWidth*(count>=4?.82:count>=3?.9:1);
 const spacing=count>1?Math.min(naturalSpacing,(usableWidth-cardWidth)/(count-1)):cardWidth;
 const overlap=count>1?Math.round(clamp(spacing-cardWidth,-cardWidth*.82,0)):0;
 const totalWidth=cardWidth+(count>1?(count-1)*(cardWidth+overlap):0);
 const tiltStep=Math.min(7,27/Math.max(1,count-1));
 return {
  cardWidth,overlap,totalWidth,
  cards:Array.from({length:count},(_,i)=>{
   const m=(count-1)/2,d=i-m;
   return {tilt:Math.round(d*tiltStep*100)/100,
    drop:Math.round((Math.abs(d)**1.5)*2.3),
    order:i+1};
  })
 };
}
