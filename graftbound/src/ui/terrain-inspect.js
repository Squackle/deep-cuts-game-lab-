// Presentation-only positioning. Find a small free rectangle for a mobile
// terrain summary without covering the hero plate, spell hand, deck piles,
// End Turn, or top actions. Positions are relative to the full-screen HUD.
export function terrainInspectPlacement({width, height, plate, zones, tray, endTurn, topButtons, margin=8}) {
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  if(!finite(width)||!finite(height)||width<=0||height<=0)return {fits:false};
  const controls=[plate,zones,tray,endTurn,topButtons].filter(Boolean);
  const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom});
  if(controls.some(r=>!['left','top','right','bottom'].every(k=>finite(r[k]))))return {fits:false};
  const overlaps=(a,b)=>a.left<b.right+margin&&a.right>b.left-margin&&a.top<b.bottom+margin&&a.bottom>b.top-margin;
  const topStart=Math.max(margin,Math.ceil((plate?.bottom??margin)+margin));
  const topStop=Math.max(topStart,Math.floor(height-margin));
  for(const w of [Math.min(265,width-margin*2),Math.min(224,width-margin*2),Math.min(178,width-margin*2)]){
    if(w<150)continue;
    const xs=[margin,Math.max(margin,Math.ceil((zones?.right??0)+margin)),Math.max(margin,Math.floor(width-w-margin))];
    const ys=[topStart,...Array.from({length:Math.max(0,Math.ceil((topStop-topStart)/12))},(_,i)=>topStart+12*(i+1))];
    for(const top of ys){
      if(top+74>height-margin)continue;
      for(const left of xs){
        if(left+w>width-margin)continue;
        const candidate={left,top,right:left+w,bottom:top+74};
        if(controls.every(c=>!overlaps(candidate,rect(c))))return {fits:true,left,top,width:w,height:74};
      }
    }
  }
  return {fits:false};
}
