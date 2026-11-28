export const outline="#1e2528";

export function canvasPainter(ctx) {
 function stroke(color,width) {
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
 }
 function form(points,fill,line=outline,width=1.2) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
  ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  if(line)stroke(line,width);
 }
 function trace(points,color,width=1.2) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
  stroke(color,width);
 }
 function oval(x,y,rx,ry,fill,edge=outline,width=1.2) {
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(edge)stroke(edge,width);
 }
 function gradient(x0,y0,x1,y1,colors) {
  const paint=ctx.createLinearGradient(x0,y0,x1,y1);
  colors.forEach((color,i)=>paint.addColorStop(i/(colors.length-1),color));
  return paint;
 }
 function limb(points,color,width,highlight=null) {
  trace(points,outline,width+2);
  trace(points,color,width);
  if(highlight)trace(points.slice(0,2),highlight,width*.27);
 }
 function plate(points,colors,edge=outline) {
  const [first,,last]=points;
  form(points,gradient(first[0]-4,first[1]-3,last[0]+4,last[1]+3,colors),edge);
 }
 function eye(x,y,color) {
  oval(x,y,2.1,1.55,outline,null);
  oval(x+.3,y-.2,1.2,.76,color,null);
 }
 function spark(x,y,s,color) {
  form([[x-s,y],[x-1,y-1],[x,y-s],[x+1,y-1],[x+s,y],[x+1,y+1],[x,y+s],[x-1,y+1]],color,null);
 }
 return {ctx,form,trace,oval,gradient,limb,plate,eye,spark};
}

export function boot(p,points,color="#685149",edge="#b59879",width=4) {
 const {limb,oval}=p;
 limb(points,color,width,edge);
 const [x,y]=points.at(-1);
 oval(x+1,y,3.3,1.9,color);
}

export function blade(p,x,y,length,color,wide=4) {
 const {form,trace,plate}=p;
 trace([[x-3,y+4],[x+4,y-8]],"#644735",2.5);
 plate([[x+2,y-4],[x+length*.49,y-length],[x+length*.69,y-length-1],[x+wide+5,y-3]],["#fff0c9",color,"#514956"]);
 trace([[x-2,y-6],[x+7,y-1]],"#c9a36f",1.7);
 form([[x+length*.5,y-length],[x+wide+7,y-4],[x+6,y-5]],"#fff0d066",null);
}
