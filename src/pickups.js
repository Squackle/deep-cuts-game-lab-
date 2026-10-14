/**
 * Clearly readable brood pickup with an outlined, softly animated beacon.
 * Drawn over the backdrop on every frame so even bright hive eggs cannot
 * mask the collectible. No assets or global browser state required.
 */
export function drawBroodPickup(ctx,food,cellSize=20,time=0){
 const {x,y}=food,px=x*cellSize,py=y*cellSize;
 const centerX=px+cellSize/2,centerY=py+cellSize/2;
 const pulse=.5+.5*Math.sin(time/180);
 ctx.save();
 // The halo reaches into adjacent cells, so it reads even on tiny phones.
 const glow=ctx.createRadialGradient(centerX,centerY,1,centerX,centerY,cellSize*.9);
 glow.addColorStop(0,"rgba(255,242,175,0.66)");
 glow.addColorStop(.48,"rgba(255,192,74,0.25)");
 glow.addColorStop(1,"rgba(255,192,74,0)");
 ctx.fillStyle=glow;
 ctx.fillRect(px-cellSize*.5,py-cellSize*.5,cellSize*2,cellSize*2);
 // Dark silhouette separates the collectible from the busy painted background.
 ctx.fillStyle="rgba(8,12,15,.94)";
 ctx.beginPath();ctx.arc(centerX,centerY,cellSize*.44,0,2*Math.PI);ctx.fill();
 ctx.strokeStyle="#fff3c9";ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(centerX,centerY,cellSize*(.40+.03*pulse),0,2*Math.PI);ctx.stroke();
 // Amber core + white hot center.
 ctx.fillStyle="#f5b44a";ctx.beginPath();
 ctx.arc(centerX,centerY,cellSize*(.27+.025*pulse),0,2*Math.PI);ctx.fill();
 ctx.fillStyle="#fff9e7";ctx.beginPath();ctx.arc(centerX,centerY,cellSize*.14,0,2*Math.PI);ctx.fill();
 // Tiny directional sparkle on top, crisp in pixelated Canvas.
 ctx.fillStyle="#fffef0";
 ctx.fillRect(Math.round(centerX)-1,py,2,4);
 ctx.fillRect(px,Math.round(centerY)-1,4,2);
 ctx.restore();
}