// Presentation-only: place both unit and terrain inspectors in a free HUD rectangle.
// Width/height are in HUD-local CSS pixels. Always consider the actual position
// of the Library/Graveyard dock, hand, End Turn, character and action counters.
export function terrainInspectPlacement({width,height,plate,zones,tray,endTurn,topButtons,actions,
  desiredHeight=136,minHeight=100,maxWidth=336,margin=8}) {
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  if(!finite(width)||!finite(height)||width<=0||height<=0)return {fits:false};
  const controls=[plate,zones,tray,endTurn,topButtons,actions].filter(Boolean);
  if(controls.some(r=>!['left','top','right','bottom'].every(k=>finite(r[k]))))return {fits:false};
  const overlaps=(a,b)=>a.left<b.right+margin&&a.right>b.left-margin&&a.top<b.bottom+margin&&a.bottom>b.top-margin;
  const topStart=Math.max(margin,Math.ceil((plate?.bottom??margin)+margin));
  const widths=[maxWidth,300,265,224,178].map(w=>Math.min(w,width-margin*2))
    .filter((w,i,all)=>w>=150&&all.indexOf(w)===i);
  const high=Math.min(Math.max(minHeight,desiredHeight),height-2*margin);
  const heights=[];
  for(let h=high;h>=minHeight;h-=12)heights.push(h);
  if(heights.length&&heights.at(-1)!==minHeight)heights.push(minHeight);
  // Try tall, readable panels first, then reduce dimensions only when necessary.
  for(const ph of heights)for(const pw of widths){
    const xs=[margin,Math.ceil((zones?.right??margin)+margin),Math.ceil((plate?.right??margin)+margin),Math.floor(width-pw-margin)];
    const ys=[];
    for(let y=topStart;y+ph<=height-margin;y+=8)ys.push(y);
    if(ys.length&&ys.at(-1)+ph<height-margin)ys.push(Math.floor(height-ph-margin));
    for(const top of ys)for(const left of xs){
      if(left<margin||left+pw>width-margin)continue;
      const candidate={left,top,right:left+pw,bottom:top+ph};
      if(controls.every(c=>!overlaps(candidate,c)))return {fits:true,left,top,width:pw,height:ph};
    }
  }
  return {fits:false};
}

/** Three-second tile inspector latch. UI-only: never changes combat selection or state. */
export const TILE_INSPECT_LOCK_DELAY_MS = 3000;
export class TileInspectLatch {
  constructor({ delay = TILE_INSPECT_LOCK_DELAY_MS, schedule = setTimeout, cancel = clearTimeout } = {}) {
    this.delay = delay; this.schedule = schedule; this.cancel = cancel;
    this.key = null; this.locked = false; this.timer = null; this.onLock = null;
  }
  watch(tile, onLock) {
    const next = tile ? `${tile.x},${tile.y}` : null;
    if (next === this.key) return;
    this.reset();
    if (next === null) return;
    this.key = next; this.onLock = onLock;
    this.timer = this.schedule(() => this.lockNow(), this.delay);
  }
  /** One authoritative lock transition. The timer and visible gold-bar animation both use it. */
  lockNow() {
    if (this.locked || this.key === null) return false;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null; this.locked = true;
    this.onLock?.();
    return true;
  }
  reset() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null; this.key = null; this.locked = false; this.onLock = null;
  }
}
