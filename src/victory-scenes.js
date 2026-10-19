/**
 * Authentic Dominion victory presentation only. No game rules, no spoofed wins.
 * The Hunt illustration is an independent approved pixel-art asset in victory-art.js.
 * Brood Trail uses a hand-painted deterministic canvas pixel scene.
 */
export const CELEBRATED_OUTCOMES=Object.freeze(["broodmother_defeated","perfect_clear"]);
export function victoryDetails(run){
 if(!run||run.status!=="won")return null;
 if(run.mode==="hunt"&&run.outcome==="broodmother_defeated"&&!run.lairBoss)
  return {kind:"hunt",title:"THE HIVE REIGNS",eyebrow:"DOMINION · VICTORY",message:"The burrow can no longer contain your swarm. The village awaits.",countLabel:"CAPTURES",count:run.kills};
 if(run.mode==="classic"&&run.outcome==="perfect_clear")
  return {kind:"classic",title:"HIVE COMPLETE!",eyebrow:"PERFECT CLEAR · VICTORY",message:"Every last tile belongs to your brood. The entire burrow is yours.",countLabel:"ORBS",count:run.brood};
 return null;
}
export const BROOD_FINALE_COLORS=Object.freeze(["#eed7a6","#5aaddb","#ac79cd","#df7458","#88c78b"]);
function hash(i){let n=(Math.imul(i+177,1103515245)+12345)>>>0;n^=n>>>15;return (Math.imul(n,2246822519)>>>0)/4294967296;}
/** Pixel-perfect 360x640 full-screen art showing an immense coiled five-color brood.
 * No state changes, network, images or Math.random(). Motion runs only in the
 * visual-only animation clock and respects reduced motion.
 */
export function drawBroodTrailFinale(ctx,time=0,reducedMotion=false){
 if(!ctx)return false;
 const W=360,H=640,S=8,clock=reducedMotion?0:time;
 ctx.save();
 ctx.imageSmoothingEnabled=false;
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 // Deep underground columns: parallax patterned rock and cavern gold.
 box(0,0,W,H,"#080e1b");
 for(let gy=0;gy<80;gy++)for(let gx=0;gx<45;gx++){
  const n=hash(gx*107+gy*643),v=n>.78?"#213047":n>.43?"#17263b":"#101d30";
  box(gx*S,gy*S,S,S,v);
 }
 // An arch of stone teeth narrows the cavern, broken by a golden sunburst.
 for(let y=0;y<640;y+=8){
  const wing=18+Math.round(26*Math.abs(Math.sin(y/125))+(y<170?(170-y)/8:0));
  for(let x=0;x<wing;x+=8)box(x,y,8,8,hash(x+y*7)>.5?"#354050":"#253047");
  for(let x=W-wing;x<W;x+=8)box(x,y,8,8,hash(x+y*9)>.5?"#354050":"#253047");
 }
 // Emerald and gold light pours into the otherwise dark burrow.
 const centreX=180,centreY=315;
 for(let layer=13;layer>=0;layer--){
  const size=22+layer*14;
  const col=layer>8?"#263a37":layer>5?"#345449":layer>2?"#597755":"#9d935a";
  // Pixelated diamond halo, growing from the center toward the edge.
  for(let dy=-size;dy<=size;dy+=8){
   const horizontal=Math.floor((size-Math.abs(dy))*.65/8)*8;
   box(centreX-horizontal,centreY+dy,horizontal*2+8,8,col);
  }
 }
 // An enormous continuous, five-color spiral serpent occupying the whole cave.
 for(let i=0;i<760;i++){
  const t=i/759,angle=i*.113+(reducedMotion?0:clock*.00011),
   radius=165*(1-t)+10*Math.sin(i*.09),x=centreX+Math.cos(angle)*radius*.88,
   y=centreY+Math.sin(angle)*radius*1.31;
  const segment=(Math.floor(i/13)+Math.floor(i/95))%5,
   tone=BROOD_FINALE_COLORS[segment];
  box(Math.round(x/8)*8-4,Math.round(y/8)*8-4,10,10,"#152a2b");
  box(Math.round(x/8)*8-3,Math.round(y/8)*8-3,8,8,tone);
  if(i%11===0)box(Math.round(x/8)*8,Math.round(y/8)*8-7,4,4,"#fff3c6");
 }
 // Crown of the burrow: asymmetric blade arms make the triumphant Sliver recognizable.
 for(let j=0;j<17;j++){
  const dy=j*9,dx=10+Math.sin(j/4)*17;
  box(centreX-12-dx,centreY-88-dy,12,8,"#d1c49a");
  box(centreX+dx,centreY-88-dy,12,8,"#75bad3");
 }
 for(let j=0;j<12;j++){
  box(centreX-30+j*3,centreY-72-j*3,8,8,"#f3d597");
  box(centreX+24-j*3,centreY-72-j*3,8,8,"#e7ecad");
 }
 box(centreX-22,centreY-63,44,56,"#443653");
 box(centreX-14,centreY-69,28,47,"#b5a9c9");
 box(centreX-13,centreY-57,10,8,"#ffec8c");box(centreX+6,centreY-57,10,8,"#ffec8c");
 box(centreX-6,centreY-36,12,29,"#76658c");
 // Dozens of tiny newborn Slivers gather at its feet.
 for(let i=0;i<42;i++){
  const px=20+Math.floor(hash(i*19+4)*40)*8,py=425+Math.floor(hash(i*17+8)*19)*8;
  box(px,py,8,6,BROOD_FINALE_COLORS[i%5]);
  box(px-4,py-5,4,5,"#d8ddda");box(px+6,py-7,5,5,"#d8ddda");
  box(px+4,py+5,4,8,"#c6a8c9");
 }
 // Animated celebratory sparks and gold confetti (static in reduced-motion).
 for(let i=0;i<95;i++){
  const px=Math.floor(hash(i*3+123)*45)*8,
   original=Math.floor(hash(i*17+8)*80)*8,
   py=(original+(reducedMotion?0:Math.floor(clock/(25+i%5*9)))%640)%640;
  const col=i%5===0?"#fff1c2":i%5===1?"#f3ba5c":BROOD_FINALE_COLORS[i%5];
  box(px,py,i%4===0?8:4,i%3===0?8:5,col);
 }
 // Heavy original pixel-art frame.
 for(let i=0;i<45;i++){box(i*8,0,8,8,i%2?"#e5c179":"#9c7b56");box(i*8,H-8,8,8,i%2?"#a47f50":"#e3c28b");}
 ctx.restore();return true;
}
