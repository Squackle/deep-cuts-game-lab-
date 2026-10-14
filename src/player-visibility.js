/** Pixel-art head indicator that remains readable over busy cave flooring. */
export function drawPlayerLocator(ctx,head,direction,cell=20,layer="above"){
 if(!head)return;
 const x=head.x*cell,y=head.y*cell;
 ctx.save();
 if(layer==="below"){
  ctx.fillStyle="rgba(5,18,17,.72)";
  ctx.fillRect(x+1,y+1,cell-2,cell-2);
  ctx.strokeStyle="#d7b66a";ctx.lineWidth=2;
  ctx.strokeRect(x+1,y+1,cell-2,cell-2);
 }else{
  const edge=cell-3;
  ctx.fillStyle="#fff0b5";
  for(const [px,py] of [[2,2],[edge-4,2],[2,edge-4],[edge-4,edge-4]]){
   const right=px>cell/2,bottom=py>cell/2;
   ctx.fillRect(x+px,y+py,6,2);
   ctx.fillRect(x+(right?px+4:px),y+py,2,6);
   if(bottom)ctx.fillRect(x+px,y+py+4,6,2);
  }
  ctx.fillStyle="#ffe39a";
  const arrows={up:[x+cell/2-2,y,4,4],down:[x+cell/2-2,y+cell-4,4,4],
   left:[x,y+cell/2-2,4,4],right:[x+cell-4,y+cell/2-2,4,4]};
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
