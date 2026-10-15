/** Compact head marker: 8px center plate under sprite and one tiny direction pip.
 * No opaque full-tile backing or bright corner brackets over the artwork.
 */
export function drawPlayerLocator(ctx,head,direction,cell=20,layer="above"){
 if(!head)return;
 const x=head.x*cell,y=head.y*cell;
 const center=size=>Math.floor((cell-size)/2);
 ctx.save();
 if(layer==="below"){
  const size=Math.max(6,Math.round(cell*.4)),inset=center(size);
  ctx.fillStyle="rgba(5,18,17,.30)";
  ctx.fillRect(x+inset,y+inset,size,size);
  ctx.strokeStyle="#bda267";ctx.lineWidth=1;
  ctx.strokeRect(x+inset,y+inset,size,size);
 }else{
  const pip=Math.max(2,Math.round(cell*.15)),mid=center(pip);
  ctx.fillStyle="#ffe39a";
  const arrows={
   up:[x+mid,y,pip,pip],down:[x+mid,y+cell-pip,pip,pip],
   left:[x,y+mid,pip,pip],right:[x+cell-pip,y+mid,pip,pip]
  };
  ctx.fillRect(...(arrows[direction]||arrows.right));
 }
 ctx.restore();
}

// Paint a queued turn immediately without advancing the simulation.
// Movement is still grid-ticked and all replay events remain deterministic.
export function drawQueuedTurn(ctx,head,heading,cols,rows,cell=20){
 if(!head||!heading)return false;
 const offset={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[heading];
 if(!offset)return false;
 const x=head.x+offset[0],y=head.y+offset[1];
 if(x<0||x>=cols||y<0||y>=rows)return false;
 const px=x*cell,py=y*cell;
 ctx.save();
 ctx.fillStyle="rgba(233,203,134,.30)";
 ctx.fillRect(px+2,py+2,cell-4,cell-4);
 ctx.fillStyle="#ffe2a0";
 ctx.fillRect(px+Math.floor(cell/2)-2,py+Math.floor(cell/2)-2,4,4);
 ctx.restore();
 return true;
}
