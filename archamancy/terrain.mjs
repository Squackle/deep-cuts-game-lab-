// Painted battlefield backdrop (cosmetic only, drawn once per map and resize into an offscreen canvas).
// Art direction, from studying top tower defense games such as Kingdom Rush:
// - Keep the ground mid-value and low-contrast so towers, troops and enemies always pop on top of it.
// - One warm key light from the top-left; every prop casts a soft shadow to the lower right.
// - Chunky shapes with dark ink outlines, a lit side and a shaded side, so props read at small sizes.
// - The road is the brightest large shape on the map, so the route is obvious at a glance.
// - Pads look like real stone foundations with a bevel, not flat ellipses.
const INK="#15241c";
// Animated set dressing (smoke, fire, water, windmill sails, banners, birds) is registered while painting and drawn
// every frame by animateMap(), which fx.ambient() calls. Everything here is cosmetic.
let living=[];
// Seasonal palettes. The engine sets game.map.season ("summer", "autumn" or "winter"); summer is the original meadow.
// A ?season= query parameter previews a season on any map (cosmetic only).
const PALETTES={
 summer:{ground:["#5d8a45","#4f7d3e","#3f6a37"],patch:["#7aa553","#2f5a33"],grass:["#6f9c4e","#86b15c","#45733b","#5b8a45"],grassAlpha:.45,earth:["#7c7048aa","#93865a88"],
  tuft:["#4f8040","#7fae57"],bush:["#3f7a3a","#6fab52"],berry:"#e5584a",pine:[["#2b5a36","#336a3d","#3c7744"],["#477e4a","#538d50","#5f9b57"]],trees:[["#3a7139","#4f8c45","#78b35b"]],
  bank:["#2f5a33","#4b6b3a","#7a6a46","#5a4c34"],water:["#2c5f74","#3b86a0","#58a7c0","#cdeef5"],reed:"#3f6b33",moss:["#5f9a4f","#7fb35f"],ao:"#1e3a22",
  road:["#6e5a3b","#b99a66","#cfb37c","#dcc391","#a6875a"],cobble:["#e3cfa3","#bfa57a"],key:"#ffe9b0",shade:"#0b1a22",flowers:100,litter:null,snow:false},
 autumn:{ground:["#86843f","#76763a","#5f6234"],patch:["#b39a4a","#4f5430"],grass:["#a39850","#c0ac5c","#6c6a3a","#8d8446"],grassAlpha:.45,earth:["#7c6440aa","#93785288"],
  tuft:["#8a7a3a","#c4a552"],bush:["#a9522c","#de8a3e"],berry:"#7a1f1f",pine:[["#284f33","#2f5d38","#36683f"],["#41724a","#4b7f4e","#558b52"]],
  trees:[["#b0502a","#d47234","#f2a04a"],["#9e3328","#c64a32","#e8744a"],["#b98a28","#d8ac38","#f4d266"],["#c0682c","#e08a38","#f6b85a"]],
  bank:["#4f5430","#5f6234","#7a6a46","#5a4c34"],water:["#2c5f74","#3b86a0","#58a7c0","#cdeef5"],reed:"#8a7a3a",moss:["#a39850","#c4a552"],ao:"#3a3220",
  road:["#6e5a3b","#b99a66","#cfb37c","#dcc391","#a6875a"],cobble:["#e3cfa3","#bfa57a"],key:"#ffc070",shade:"#2a1408",flowers:24,litter:["#c9542e","#e8823a","#f2b84a","#a8382e","#d89a3a"],snow:false},
 winter:{ground:["#eef3f6","#dde7ee","#c4d3de"],patch:["#ffffff","#a9bccb"],grass:["#cbd8e2","#ffffff","#b2c3d0","#dfe8ef"],grassAlpha:.5,earth:["#a7b1b6aa","#bcc5c988"],
  tuft:["#8f8466","#b8ab84"],bush:["#4d6a5c","#f4f8fa"],berry:"#c8302a",pine:[["#1f4033","#24493a","#2a5242"],["#eaf1f5","#f4f8fa","#ffffff"]],trees:[["#5a6f66","#e3ecf1","#ffffff"]],
  bank:["#8fa0ab","#a9b8c2","#7f8a8e","#6c7477"],water:["#7fa7bd","#a6c8da","#cfe5ef","#ffffff"],reed:"#8f8466",moss:["#eef3f6","#ffffff"],ao:"#36485a",
  road:["#5d5248","#8e8274","#a59a8c","#b8afa2","#7a7062"],cobble:["#c9c1b4","#a49a8b"],key:"#e8f2ff",shade:"#16243a",flowers:0,litter:null,snow:true}};
export function seasonOf(game){let q=null;try{q=new URLSearchParams(globalThis.location?.search||"").get("season");}catch{}
 const s=game?.map?.season||q||"summer";return PALETTES[s]?s:"summer";}
export function paintTerrain(a,game){
 living=[];
 const season=seasonOf(game),S=PALETTES[season];
 const {segments,spans,pads,keep,labels,entrances}=game.map,W=game.map.width||1000,H=game.map.height||600;
 let seed=23921;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const roadDist=(x,y)=>{const q=game.pointAt(game.nearestPath(x,y));return Math.hypot(q.x-x,q.y-y);};
 const padDist=(x,y)=>Math.min(...pads.map(p=>Math.hypot((p.x-x)*.85,p.y-y)));
 const occ=[];
 const taken=(x,y,r=0)=>occ.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+r);
 const clear=(x,y,road=44,pad=40)=>roadDist(x,y)<road||padDist(x,y)<pad||taken(x,y);
 const ell=(x,y,rx,ry,fill,rot=0)=>{a.beginPath();a.ellipse(x,y,rx,ry,rot,0,Math.PI*2);a.fillStyle=fill;a.fill();};
 const roadPath=()=>{a.beginPath();for(const path of segments)path.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));};

 // 1. Ground: a mid-green meadow, warmer where the light falls.
 const g=a.createLinearGradient(0,0,W*.6,H);g.addColorStop(0,S.ground[0]);g.addColorStop(.55,S.ground[1]);g.addColorStop(1,S.ground[2]);a.fillStyle=g;a.fillRect(0,0,W,H);
 // Large soft meadow patches break up the flat colour.
 for(let i=0;i<46;i++){const x=random()*W,y=random()*H,r=40+random()*110,c=random()<.55?S.patch[0]:S.patch[1],p=a.createRadialGradient(x,y,0,x,y,r);p.addColorStop(0,c+"33");p.addColorStop(1,c+"00");a.fillStyle=p;a.fillRect(x-r,y-r,r*2,r*2);}
 // Grass texture: short strokes, lighter on top so the field feels lit from above.
 a.lineCap="round";
 for(let i=0;i<5200;i++){const x=random()*W,y=random()*H,len=2+random()*4,c=S.grass[i%4];a.strokeStyle=c;a.globalAlpha=S.grassAlpha;a.lineWidth=1.1;a.beginPath();a.moveTo(x,y);a.lineTo(x+(random()-.5)*2,y-len);a.stroke();}
 a.globalAlpha=1;
 // Bare earth patches.
 for(let i=0;i<14;i++){const x=random()*W,y=random()*H;if(clear(x,y,60,50))continue;const r=10+random()*18;ell(x,y,r*1.4,r*.6,S.earth[0],random()*.4);ell(x-2,y-1,r*1.1,r*.42,S.earth[1],random()*.4);}

 // 1b. Creek: carved into the ground before the road is laid, entering and leaving off the map edges.
 // The road and plank bridges are painted over it afterwards, so it reads as passing under the road.
 const poly=(pts,fill,stroke=INK,lw=1.6)=>{a.beginPath();pts.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.closePath();a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=lw;a.stroke();}};
 const rect=(x,y,w,h,fill)=>{a.fillStyle=INK;a.fillRect(x-1,y-1,w+2,h+2);a.fillStyle=fill;a.fillRect(x,y,w,h);};
 let creek=null;
 {const keepAt=keep||{x:W,y:H*.8};
  for(let cx=90;cx<=W-90;cx+=10){const pts=[];for(let y=-30;y<=H+30;y+=5){const w=Math.sin(y*.028+cx*.37)*13+Math.sin(y*.083+cx)*4;pts.push([cx+w,y]);}
   let minPad=1e9,ok=true;for(const [x,y] of pts){minPad=Math.min(minPad,padDist(x,y));if(Math.hypot(x-keepAt.x,y-keepAt.y)<90)ok=false;}if(!ok||minPad<46)continue;
   const runs=[];let run=[];pts.forEach(([x,y],k)=>{if(roadDist(x,y)<44)run.push(k);else if(run.length){runs.push(run);run=[];}});if(run.length)runs.push(run);
   const bridges=[];for(const r of runs){let bk=r[0],bd=1e9;for(const k of r){const d=roadDist(pts[k][0],pts[k][1]);if(d<bd){bd=d;bk=k;}}if(bd>6){ok=false;break;}
    const n=game.nearestPath(pts[bk][0],pts[bk][1]),c=game.pointAt(n),p1=game.pointAt(n-46),p2=game.pointAt(n+46);
    if(Math.abs(p2.y-p1.y)>3||Math.abs(p2.x-p1.x)<80){ok=false;break;}bridges.push({x:c.x,y:c.y,ux:Math.sign(p2.x-p1.x)||1});}
   if(!ok||bridges.length>3)continue;const score=bridges.length*100-Math.min(minPad,120)*.3;if(!creek||score<creek.score)creek={score,pts,bridges};}
  // No clean crossing (too many roads in the way): a spring-fed brook instead, running from a pond off the nearest map edge.
  if(!creek){let best=null;for(let cx=60;cx<=W-60;cx+=10)for(const dir of [1,-1]){const pts=[];let len=0;for(let k=0;k<70;k++){const y=dir>0?-30+k*5:H+30-k*5,x=cx+Math.sin(y*.028+cx*.37)*13+Math.sin(y*.083+cx)*4;if(roadDist(x,y)<46||padDist(x,y)<46||Math.hypot(x-keepAt.x,y-keepAt.y)<90)break;pts.push([x,y]);len=k;}
    if(len>=11&&(!best||len>best.len)){const end=pts.at(-1);if(roadDist(end[0],end[1])>48&&padDist(end[0],end[1])>60)best={len,pts};}}
   if(best){const pts=best.pts.slice(0,Math.min(best.pts.length,40)),[sx,sy]=pts.at(-1);creek={pts,bridges:[],spring:{x:sx,y:sy}};}}}
 const creekDist=(x,y)=>creek?Math.min(...creek.pts.map(([px,py])=>Math.hypot(px-x,py-y))):1e9;
 if(creek){const pts=creek.pts,line=(w,c,dx=0,dy=0,alpha=1)=>{a.globalAlpha=alpha;a.strokeStyle=c;a.lineWidth=w;a.lineJoin="round";a.lineCap="round";a.beginPath();pts.forEach(([x,y],k)=>k?a.lineTo(x+dx,y+dy):a.moveTo(x+dx,y+dy));a.stroke();a.globalAlpha=1;};
  line(40,S.bank[0],2,2,.55);line(33,S.bank[1]);line(29,S.bank[2]);line(25,S.bank[3]);line(21,S.water[0]);line(16,S.water[1]);line(9,S.water[2]);line(2,S.water[3],-3,-1,.55);
  if(S.snow)iceCracks(pts);
  if(creek.spring){const {x,y}=creek.spring;ell(x+2,y+3,30,17,S.bank[0]+"88");ell(x,y,28,16,S.bank[2]);ell(x,y,25,14,S.water[0]);ell(x,y,21,11,S.water[1]);ell(x-4,y-3,13,6,S.water[2]);occ.push({x,y,r:34});
   for(let i=0;i<7;i++){const an=i/7*Math.PI*2,rx=x+Math.cos(an)*26,ry=y+Math.sin(an)*15,r=2.4+random()*2;ell(rx,ry,r+.6,r*.75+.4,INK);ell(rx,ry,r,r*.75,"#9a9a88");ell(rx-r*.3,ry-r*.3,r*.45,r*.3,"#cfd2c0");}
   if(!S.snow)living.push({type:"duck",x,y,r:20});}
  // Shore stones and reeds, lit from the top-left, so the banks look carved rather than pasted on.
  pts.forEach(([x,y],k)=>{if(roadDist(x,y)<46)return;if(k%3===0)occ.push({x,y,r:20});
   for(const sd of [-1,1]){if(random()<.42){const sx=x+sd*(12+random()*3),sy=y+(random()-.5)*4,r=1.8+random()*2.4;ell(sx+.8,sy+1,r+.6,r*.7,"#1d2a1e88");ell(sx,sy,r+.6,r*.75+.4,INK);ell(sx,sy,r,r*.75,random()<.5?"#9a9a88":"#8a8c7a");ell(sx-r*.3,sy-r*.3,r*.45,r*.3,"#cfd2c0");}
    if(random()<.12){const rx=x+sd*15;a.strokeStyle=S.reed;a.lineWidth=1.5;for(let j=-1;j<=1;j++){a.beginPath();a.moveTo(rx+j*2,y+2);a.lineTo(rx+j*3,y-9-random()*5);a.stroke();}ell(rx,y-11,1.3,2.8,"#6b4a2c");}}
   if(k%4===0)living.push({type:"glint",x:x+(random()-.5)*6,y,ph:random()*6});});}

 // 2. Road: ambient occlusion on the grass, a worn earth edge, sandy bed and a lighter worn centre.
 a.lineJoin="round";a.lineCap="round";roadPath();
 for(const [w,c] of [[78,S.ao+"24"],[70,S.ao+"30"],[62,S.ao+"66"]]){a.strokeStyle=c;a.lineWidth=w;a.stroke();}
 a.strokeStyle=S.road[0];a.lineWidth=55;a.stroke();
 a.strokeStyle=S.road[1];a.lineWidth=47;a.stroke();
 a.strokeStyle=S.road[2];a.lineWidth=36;a.stroke();
 a.strokeStyle=S.road[3];a.globalAlpha=.55;a.lineWidth=16;a.stroke();a.globalAlpha=1;
 // Wheel ruts.
 for(const side of [-1,1]){a.save();a.setLineDash([22,9]);a.lineDashOffset=side*7;a.strokeStyle=S.road[4];a.globalAlpha=.45;a.lineWidth=2.2;
  a.beginPath();for(const [s0,s1] of spans){for(let n=s0;n<=s1;n+=4){const p=game.pointAt(n),q=game.pointAt(Math.min(s1,n+2)),dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,x=p.x-dy/l*9*side,y=p.y+dx/l*9*side;n===s0?a.moveTo(x,y):a.lineTo(x,y);}}a.stroke();a.restore();}
 // Pebbles and cobbles on the road bed.
 for(let i=0;i<620;i++){const [s0,s1]=spans[i%spans.length],p=game.pointAt(s0+random()*(s1-s0)),x=p.x+(random()-.5)*36,y=p.y+(random()-.5)*36;if(roadDist(x,y)>19)continue;const r=1+random()*2.4;ell(x+.8,y+.8,r,r*.7,"#8a6f4888");ell(x,y,r,r*.7,random()<.5?S.cobble[0]:S.cobble[1]);}
 // Edging stones along both sides with a lit top and a contact shadow.
 for(const [s0,s1] of spans)for(let n=s0+6;n<s1;n+=12){const p=game.pointAt(n),q=game.pointAt(n+1),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  for(const side of [-1,1]){const x=p.x+nx*24*side+(random()-.5)*2,y=p.y+ny*24*side+(random()-.5)*2,r=3.4+random()*1.4;if(roadDist(x,y)<21||creekDist(x,y)<20)continue;ell(x+1.2,y+1.6,r+1,r*.75,"#2b2a1fbb");ell(x,y,r+.8,r*.72+.6,INK);ell(x,y,r,r*.72,random()<.5?"#a59a7c":"#968c6f");ell(x-r*.25,y-r*.25,r*.5,r*.3,"#cfc6a6");}}
 // Grass tufts spilling over the road edge soften the hard line.
 for(let i=0;i<420;i++){const [s0,s1]=spans[i%spans.length],n=s0+random()*(s1-s0),p=game.pointAt(n),q=game.pointAt(n+1),dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,side=random()<.5?-1:1,d=27+random()*5,x=p.x-dy/l*d*side,y=p.y+dx/l*d*side;
  if(padDist(x,y)<30||roadDist(x,y)<25||creekDist(x,y)<18)continue;tuft(x,y,4+random()*3);}
 // Autumn: fallen leaves drift across the grass and the road verge.
 if(S.litter)for(let i=0;i<900;i++){const x=random()*W,y=random()*H;if(padDist(x,y)<30||creekDist(x,y)<16||(roadDist(x,y)<20&&random()<.8))continue;const c=S.litter[i%S.litter.length],rot=random()*Math.PI;ell(x+.6,y+.8,2.6,1.3,"#3a2a1840",rot);ell(x,y,2.6,1.3,c,rot);}
 // Winter: soft snowbanks along the road edges, lit on top.
 if(S.snow)for(let i=0;i<520;i++){const [s0,s1]=spans[i%spans.length],n=s0+random()*(s1-s0),p=game.pointAt(n),q=game.pointAt(n+1),dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,side=random()<.5?-1:1,d=24+random()*6,x=p.x-dy/l*d*side,y=p.y+dx/l*d*side;
  if(padDist(x,y)<30||roadDist(x,y)<21||creekDist(x,y)<18)continue;const r=4+random()*5;ell(x+1,y+1.5,r,r*.5,"#8fa3b455");ell(x,y,r,r*.5,"#f6f9fb");}

 // Plank bridges where the creek passes under the road: stone piers at each bank, deck and rails on top.
 if(creek)for(const b of creek.bridges){a.save();a.translate(b.x,b.y);
  for(const sd of [-1,1]){a.fillStyle="#13241a66";a.fillRect(-27,sd*34-3,54,6);}
  for(const ex of [-25,25]){rect(ex-4,-33,8,66,"#8f8a78");a.fillStyle="#00000030";for(let yy=-28;yy<30;yy+=9)a.fillRect(ex-4,yy,8,1.2);}
  rect(-21,-31,42,62,"#8a6440");for(let x=-20;x<20;x+=7){a.fillStyle=(x+20)%14?"#a87c4f":"#9a7046";a.fillRect(x,-30,6,60);a.fillStyle="#00000030";a.fillRect(x+6,-30,1,60);}
  for(const sd of [-1,1]){rect(-25,sd*31-2,50,4,"#6b4a2c");for(const x of [-25,-8,8,25])rect(x-2,sd*31-6,4,10,"#5a3e25");}
  a.restore();}

 // 3. Build pads: a stone foundation with a bevel (lit top-left rim, shaded bottom-right).
 for(const p of pads){
  ell(p.x+3,p.y+6,34,21,"#13241a66");
  ell(p.x,p.y+2,32,20,INK);
  const rim=a.createLinearGradient(p.x-30,p.y-18,p.x+24,p.y+20);rim.addColorStop(0,"#d7cfae");rim.addColorStop(.5,"#9c9578");rim.addColorStop(1,"#5c5847");ell(p.x,p.y,30,18.5,rim);
  const top=p.bonus==="spring"?["#5aa3a3","#2f6b6f"]:p.bonus==="height"?["#c7ad70","#8a7244"]:["#a29c80","#77735e"];const t=a.createLinearGradient(p.x,p.y-14,p.x,p.y+14);t.addColorStop(0,top[0]);t.addColorStop(1,top[1]);ell(p.x,p.y+1,24,14,t);
  if(S.snow){a.save();a.beginPath();a.ellipse(p.x,p.y,30,18.5,0,0,Math.PI*2);a.clip();ell(p.x-4,p.y-10,26,8,"#f4f8fa");ell(p.x+6,p.y+17,22,5,"#e6eef3cc");a.restore();}
  // Flagstone seams.
  a.save();a.beginPath();a.ellipse(p.x,p.y+1,24,14,0,0,Math.PI*2);a.clip();a.strokeStyle="#00000030";a.lineWidth=1.2;a.beginPath();a.moveTo(p.x-24,p.y+2);a.lineTo(p.x+24,p.y);a.moveTo(p.x-6,p.y-14);a.lineTo(p.x-9,p.y+1);a.moveTo(p.x+9,p.y+1);a.lineTo(p.x+6,p.y+15);a.stroke();a.restore();
  if(p.bonus){a.strokeStyle=p.bonus==="spring"?"#a8f0e8":"#f6d98a";a.lineWidth=2;a.setLineDash([6,5]);a.beginPath();a.ellipse(p.x,p.y+1,38,24,0,0,Math.PI*2);a.stroke();a.setLineDash([]);}
 }

 // 3b. Water: ponds with reeds and lily pads (the creek is carved in before the road, see 1b).
 for(let k=0;k<3;k++){const r=20+random()*12;let spot=null;for(let t=0;t<300&&!spot;t++){const x=40+random()*(W-80),y=40+random()*(H-80);if(roadDist(x,y)>r+40&&padDist(x,y)>r+36&&!taken(x,y,r+10))spot=[x,y];}if(!spot)continue;const [x,y]=spot;occ.push({x,y,r:r+6});
  ell(x,y+2,r*1.25+3,r*.7+3,S.bank[1]);ell(x,y,r*1.25+2,r*.7+2,S.bank[2]);ell(x,y,r*1.25,r*.7,S.water[1]);ell(x-r*.15,y-r*.12,r*.95,r*.48,S.water[2]);
  if(S.snow){a.strokeStyle="#ffffffaa";a.lineWidth=1.2;a.beginPath();a.moveTo(x-r*.6,y-r*.1);a.lineTo(x-r*.1,y+r*.15);a.lineTo(x+r*.5,y-r*.05);a.moveTo(x-r*.1,y+r*.15);a.lineTo(x,y+r*.4);a.stroke();}
  else for(let i=0;i<3;i++){const lx=x+(random()-.5)*r*1.4,ly=y+(random()-.3)*r*.5;ell(lx,ly,4,2.4,"#4f8f3f");ell(lx+1,ly,1.2,1.2,"#f3b6d0");}
  for(let i=0;i<7;i++){const ang=Math.PI*(.75+random()*.5)+(random()<.5?0:Math.PI),rx=x+Math.cos(ang)*r*1.2,ry=y+Math.sin(ang)*r*.66;a.strokeStyle=S.reed;a.lineWidth=1.6;for(let j=-1;j<=1;j++){a.beginPath();a.moveTo(rx+j*2,ry);a.lineTo(rx+j*3,ry-10-random()*5);a.stroke();}ell(rx,ry-12,1.4,3,"#6b4a2c");}
  for(let i=0;i<5;i++)living.push({type:"glint",x:x+(random()-.5)*r*1.6,y:y+(random()-.5)*r*.6,ph:random()*6});
  if(k===0&&!S.snow)living.push({type:"duck",x,y,r});}

 // 3c. Landmarks and set dressing, placed in free ground away from the road and pads.
 const land=[];
 function place(r,road=30,pad=30){const edge=r*.9;for(let t=0;t<500;t++){const x=edge+random()*(W-edge*2),y=Math.max(r*.8,24)+random()*(H-Math.max(r*.8,24)-8);if(roadDist(x,y)>r+road&&padDist(x,y)>r+pad&&!taken(x,y,r)){occ.push({x,y,r});return [x,y];}}return null;}
 const want=[["windmill",40],["cottage",30],["ruin",30],["camp",34],["cottage",28],["graves",30],["shrine",20],["well",18],["cart",22],["cart",20],["hay",14],["hay",14],["hay",13],["logs",15],["logs",14],["crates",13],["crates",12],["banner",8],["banner",8],["banner",8],["stump",9],["stump",9],["stump",8],["stump",8],["fence",30],["fence",28],["fence",26],["cliff",34],["cliff",30],["barrels",11]];
 for(const [kind,r] of want){const at=place(r,kind==="banner"?24:30,kind==="banner"?14:30);if(at)land.push({kind,x:at[0],y:at[1],r});}
 // A signpost beside each road entrance.
 for(const [ex,ey] of entrances){const x=ex+64,y=ey+(ey>H/2?-38:38);if(padDist(x,y)>30&&!taken(x,y,8)){occ.push({x,y,r:10});land.push({kind:"sign",x,y,r:10});}}

 // 4. Props: rocks, flowers, bushes and trees, sorted back to front so they overlap correctly.
 const props=[];
 for(let i=0;i<S.flowers;i++){const x=random()*W,y=random()*H;if(clear(x,y,40,36))continue;props.push({y,draw:()=>flower(x,y)});}
 if(S.snow)for(let i=0;i<70;i++){const x=random()*W,y=random()*H;if(clear(x,y,40,36))continue;props.push({y,draw:()=>tuft(x,y,4+random()*4)});}
 for(let i=0;i<40;i++){const x=random()*W,y=random()*H;if(clear(x,y,44,40))continue;const r=4+random()*7;props.push({y,draw:()=>rock(x,y,r)});}
 for(let i=0;i<60;i++){const x=random()*W,y=random()*H;if(clear(x,y,46,42))continue;const r=7+random()*6;props.push({y,draw:()=>bush(x,y,r)});}
 // Trees come in clumps, which reads as woodland rather than noise.
 for(let c=0;c<44;c++){const cx=random()*W,cy=random()*H,n=3+Math.floor(random()*6),pine=random()<.55;for(let i=0;i<n;i++){const x=cx+(random()-.5)*90,y=cy+(random()-.5)*60;if(x<-10||x>W+10||y<-10||y>H+30||clear(x,y,50,46))continue;const h=24+random()*20;props.push({y,draw:pine?()=>pineTree(x,y,h):()=>roundTree(x,y,h*.55)});}}
 for(const L of land)props.push({y:L.y,draw:()=>landmark(L)});
 // Butterflies over flowery spots and a flock of birds that crosses the map now and then.
 for(let i=0;i<(S.snow?0:season==="autumn"?3:7);i++){let s=null;for(let t=0;t<80&&!s;t++){const x=random()*W,y=random()*H;if(!clear(x,y,50,44))s=[x,y];}if(s)living.push({type:"butterfly",x:s[0],y:s[1],ph:random()*6,c:["#f6e27a","#f3a6c8","#bfe0ff","#ffffff"][i%4]});}
 living.push({type:"birds",W,H});
 if(season!=="summer")living.push({type:season==="winter"?"snow":"leaves",W,H});
 props.sort((p,q)=>p.y-q.y);for(const p of props)p.draw();

 // 5. Keep at the road's end.
 a.save();a.translate(keep.x-1000,keep.y-490);
 ell(980,522,40,10,"#13241a88");
 a.fillStyle=INK;a.fillRect(945,432,57,100);
 const wall=a.createLinearGradient(948,0,1000,0);wall.addColorStop(0,"#d2c6a6");wall.addColorStop(1,"#958a6e");a.fillStyle=wall;a.fillRect(948,442,52,74);
 a.fillStyle="#00000026";for(let y=450;y<515;y+=12){a.fillRect(948,y,52,1.6);}for(let y=444,r=0;y<515;y+=12,r++)for(let x=952+(r%2)*8;x<1000;x+=16)a.fillRect(x,y,1.4,12);
 a.fillStyle="#1a1f1c";a.beginPath();a.arc(979,486,13,Math.PI,0);a.lineTo(992,516);a.lineTo(966,516);a.fill();
 for(let i=0;i<3;i++){a.fillStyle=INK;a.fillRect(945+i*19,431,15,17);a.fillStyle=i===0?"#e4d9bb":"#c9bc99";a.fillRect(947+i*19,433,11,13);}
 a.fillStyle="#7a5a3a";a.fillRect(963,402,3,32);a.fillStyle="#c9473a";a.beginPath();a.moveTo(966,404);a.lineTo(986,410);a.lineTo(966,417);a.fill();
 a.restore();

 // 6. Entrance arrows and place names.
 for(const [ex,ey] of entrances){for(const dx of [14,30]){a.fillStyle=INK;a.globalAlpha=.5;a.beginPath();a.moveTo(ex+dx,ey-11);a.lineTo(ex+dx+11,ey);a.lineTo(ex+dx,ey+11);a.closePath();a.fill();a.fillStyle="#fff2cf";a.globalAlpha=.85;a.beginPath();a.moveTo(ex+dx+1,ey-8);a.lineTo(ex+dx+9,ey);a.lineTo(ex+dx+1,ey+8);a.closePath();a.fill();}a.globalAlpha=1;}
 // Place names are no longer painted on the battlefield (owner request, 2026-11-22); map.labels stays as data.

 // 7. Light: warm key light from the top-left, cool shade bottom-right, gentle vignette.
 const key=a.createRadialGradient(W*.18,H*.05,0,W*.18,H*.05,W*.85);key.addColorStop(0,S.key+"30");key.addColorStop(1,S.key+"00");a.fillStyle=key;a.fillRect(0,0,W,H);
 const shade=a.createLinearGradient(0,0,W,H);shade.addColorStop(.55,S.shade+"00");shade.addColorStop(1,S.shade+"40");a.fillStyle=shade;a.fillRect(0,0,W,H);
 const v=a.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,W*.62);v.addColorStop(0,"#0a140f00");v.addColorStop(1,"#0a140f66");a.fillStyle=v;a.fillRect(0,0,W,H);

 function tuft(x,y,h){a.lineWidth=1.3;for(let k=-1;k<=1;k++){a.strokeStyle=k?S.tuft[0]:S.tuft[1];a.beginPath();a.moveTo(x+k*1.6,y);a.quadraticCurveTo(x+k*2.6,y-h*.6,x+k*3.6,y-h);a.stroke();}}
 function flower(x,y){tuft(x,y,5);const c=["#f4e7a8","#f0a9c4","#b9d6f5","#fbf6ea","#f3b46b"][Math.floor(random()*5)];for(const [dx,dy] of [[-2.5,-6],[2.5,-7],[0,-9]]){ell(x+dx,y+dy,1.9,1.9,c);}ell(x,y-7.3,.9,.9,"#fff6c8");}
 function rock(x,y,r){ell(x+r*.5,y+r*.35,r*1.25,r*.6,"#13241a66");a.beginPath();a.moveTo(x-r*1.2,y+r*.2);a.lineTo(x-r*.8,y-r*.6);a.lineTo(x+r*.1,y-r*.9);a.lineTo(x+r*1.1,y-r*.4);a.lineTo(x+r*1.25,y+r*.25);a.closePath();a.fillStyle="#8a8d7c";a.fill();a.strokeStyle=INK;a.lineWidth=1.6;a.stroke();a.beginPath();a.moveTo(x-r*.8,y-r*.6);a.lineTo(x+r*.1,y-r*.9);a.lineTo(x+r*.3,y-r*.2);a.lineTo(x-r*.6,y-r*.05);a.closePath();a.fillStyle=S.snow?"#f4f8fa":"#b9bba7";a.fill();}
 function bush(x,y,r){ell(x+r*.5,y+r*.3,r*1.3,r*.5,"#13241a77");const blobs=[[-r*.6,-r*.2,r*.7],[r*.6,-r*.25,r*.7],[0,-r*.6,r*.8]];for(const [dx,dy,rr] of blobs)ell(x+dx,y+dy,rr+1.5,rr*.85+1.5,INK);for(const [dx,dy,rr] of blobs)ell(x+dx,y+dy,rr,rr*.85,S.bush[0]);for(const [dx,dy,rr] of blobs)ell(x+dx-rr*.25,y+dy-rr*.3,rr*.55,rr*.4,S.bush[1]);if(random()<.35)for(let i=0;i<3;i++)ell(x+(random()-.5)*r*1.4,y-r*.4+(random()-.5)*r*.8,1.4,1.4,S.berry);}
 function pineTree(x,y,h){ell(x+h*.35,y+3,h*.5,h*.16,"#10201866");a.fillStyle="#5b4330";a.fillRect(x-2,y-h*.22,4,h*.26);
  for(let k=0;k<3;k++){const top=y-h*(1.05-k*.2),base=y-h*(.08+k*.15),half=h*(.38-k*.07);
   a.beginPath();a.moveTo(x,top-1.5);a.lineTo(x-half-1.5,base+1);a.lineTo(x+half+1.5,base+1);a.closePath();a.fillStyle=INK;a.fill();
   a.beginPath();a.moveTo(x,top);a.lineTo(x-half,base);a.lineTo(x+half,base);a.closePath();a.fillStyle=S.pine[0][k];a.fill();
   a.beginPath();a.moveTo(x,top);a.lineTo(x-half,base);a.lineTo(x-half*.15,base);a.closePath();a.fillStyle=S.pine[1][k];a.fill();}}
 function roundTree(x,y,r){ell(x+r*.7,y+3,r*1.1,r*.35,"#10201870");a.fillStyle=INK;a.fillRect(x-3.2,y-r*.9,6.4,r*.95);a.fillStyle="#6b4d33";a.fillRect(x-2.2,y-r*.9,4.4,r*.9);
  const T=S.trees.length>1?S.trees[Math.floor(random()*S.trees.length)]:S.trees[0],cy=y-r*1.35,blobs=[[-r*.55,r*.1,r*.62],[r*.55,r*.12,r*.6],[0,-r*.35,r*.72],[0,r*.2,r*.7]];
  for(const [dx,dy,rr] of blobs)ell(x+dx,cy+dy,rr+1.8,rr+1.6,INK);for(const [dx,dy,rr] of blobs)ell(x+dx,cy+dy,rr,rr*.95,T[0]);
  for(const [dx,dy,rr] of blobs)ell(x+dx-rr*.22,cy+dy-rr*.25,rr*.62,rr*.55,T[1]);ell(x-r*.35,cy-r*.45,r*.32,r*.24,T[2]);}
 function shadow(x,y,rx,ry){ell(x+rx*.25,y+2,rx,ry,"#13241a5c");}
 function roofTri(x,y,w,h,c,dark){poly([[x-w/2-4,y],[x,y-h],[x+w/2+4,y]],c);poly([[x,y-h],[x+w/2+4,y],[x+3,y]],dark,null);
  if(S.snow){poly([[x-w/2-2,y-h*.12],[x,y-h],[x+w/2+2,y-h*.12],[x+w*.25,y-h*.3],[x,y-h*.2],[x-w*.3,y-h*.32]],"#f4f8fa",INK,1.2);poly([[x,y-h],[x+w/2+2,y-h*.12],[x+w*.25,y-h*.3]],"#c9d8e4",null);}}
 // Winter: thin pale cracks across the frozen creek.
 function iceCracks(pts){a.strokeStyle="#ffffffcc";a.lineWidth=1.1;for(let k=4;k<pts.length-2;k+=6){const [x,y]=pts[k];a.beginPath();a.moveTo(x-6,y-4);a.lineTo(x+1,y+1);a.lineTo(x+5,y-3);a.moveTo(x+1,y+1);a.lineTo(x-2,y+7);a.stroke();}}
 // Every landmark sits in a worn earth patch fringed with grass so it belongs to the ground.
 function ground(x,y,r){ell(x,y+2,r*1.15,r*.36,S.earth[0]);ell(x-r*.1,y+1,r*.8,r*.24,S.earth[1]);for(let k=0;k<6;k++){const an=Math.PI*(k/5),gx=x+Math.cos(an)*r*1.15*(k%2?1:-1)*.95,gy=y+2+Math.sin(an)*r*.3;tuft(gx,gy,3+random()*3);}}
 function landmark(L){const {kind,x,y,r}=L;if(!["banner","sign","fence","stump"].includes(kind))ground(x,y,r);
  if(kind==="cottage"){shadow(x,y+2,r*1.15,r*.36);rect(x-r*.75,y-r*.9,r*1.5,r*.9,"#d9c9a2");a.fillStyle="#00000026";a.fillRect(x+r*.15,y-r*.9,r*.6,r*.9);
   for(const bx of [-.6,0,.6]){a.fillStyle="#6b4a2c";a.fillRect(x+bx*r-1.5,y-r*.9,3,r*.9);}
   rect(x-r*.18,y-r*.48,r*.36,r*.48,"#5a3e25");rect(x+r*.32,y-r*.66,r*.26,r*.22,"#ffd77a");
   rect(x+r*.32,y-r*1.75,r*.22,r*.55,"#8b8270");roofTri(x,y-r*.86,r*1.5,r*.95,"#c98b3e","#9c6a2c");
   for(let k=1;k<4;k++){a.strokeStyle="#a5702f";a.lineWidth=1;a.beginPath();a.moveTo(x-r*.85+k*4,y-r*.86-k*r*.22);a.lineTo(x+r*.85-k*4,y-r*.86-k*r*.22);a.stroke();}
   living.push({type:"smoke",x:x+r*.43,y:y-r*1.8,ph:random()*9});}
  else if(kind==="windmill"){shadow(x,y+2,r*.8,r*.3);poly([[x-r*.42,y],[x-r*.26,y-r*1.5],[x+r*.26,y-r*1.5],[x+r*.42,y]],"#e2d6b4");poly([[x+r*.05,y],[x+r*.08,y-r*1.5],[x+r*.26,y-r*1.5],[x+r*.42,y]],"#00000022",null);
   rect(x-r*.1,y-r*.36,r*.2,r*.36,"#5a3e25");rect(x-r*.08,y-r*1.05,r*.16,r*.16,"#ffd77a");roofTri(x,y-r*1.46,r*.6,r*.42,"#a6513b","#7f3b2b");
   living.push({type:"sails",x,y:y-r*1.62,r:r*.95,ph:random()*6});}
  else if(kind==="ruin"){shadow(x,y+2,r*1.1,r*.35);for(const [dx,dy,rr] of [[-r*.9,-2,6],[r*.8,0,5],[r*.4,-4,4]])ell(x+dx,y+dy,rr,rr*.6,"#9a9480");
   poly([[x-r*.5,y],[x-r*.5,y-r*1.4],[x-r*.3,y-r*1.55],[x-r*.1,y-r*1.3],[x+r*.1,y-r*1.6],[x+r*.25,y-r*1.1],[x+r*.5,y-r*.95],[x+r*.5,y]],"#b3ab92");
   poly([[x+r*.15,y],[x+r*.25,y-r*1.1],[x+r*.5,y-r*.95],[x+r*.5,y]],"#00000026",null);
   a.fillStyle="#00000030";for(let yy=y-r*.25;yy>y-r*1.3;yy-=r*.22)a.fillRect(x-r*.5,yy,r,1.2);rect(x-r*.14,y-r*.95,r*.2,r*.32,"#2b2a24");
   a.strokeStyle="#4f8a42";a.lineWidth=2.4;a.beginPath();a.moveTo(x-r*.45,y);a.quadraticCurveTo(x-r*.2,y-r*.6,x-r*.4,y-r*1.1);a.stroke();for(let k=0;k<6;k++)ell(x-r*.4+random()*r*.3,y-random()*r*1.1,2.6,2,"#5d9b4c");}
  else if(kind==="camp"){const tx=x-r*.35,fx=x+r*.55,fy=y+r*.2;shadow(tx,y+2,r*.75,r*.25);poly([[tx-r*.65,y],[tx,y-r*1.05],[tx+r*.65,y]],"#c9b48a");poly([[tx,y-r*1.05],[tx+r*.65,y],[tx+r*.1,y]],"#a08a62",null);poly([[tx-r*.15,y],[tx,y-r*.55],[tx+r*.15,y]],"#3d2f22",null);
   a.strokeStyle="#6b4a2c";a.lineWidth=2;a.beginPath();a.moveTo(tx,y-r*1.05);a.lineTo(tx-3,y-r*1.25);a.moveTo(tx,y-r*1.05);a.lineTo(tx+3,y-r*1.25);a.stroke();
   for(let k=0;k<7;k++){const an=k/7*Math.PI*2;ell(fx+Math.cos(an)*8,fy+Math.sin(an)*4,2.6,1.9,"#8d8878");}for(const sd of [-1,1]){a.strokeStyle="#5a3e25";a.lineWidth=3;a.beginPath();a.moveTo(fx-6*sd,fy+2);a.lineTo(fx+6*sd,fy-2);a.stroke();}
   rect(fx+10,fy-3,10,5,"#7a5a3a");living.push({type:"fire",x:fx,y:fy,ph:random()*6});}
  else if(kind==="graves"){for(let k=0;k<5;k++){const gx=x+(k%3-1)*r*.6+(random()-.5)*4,gy=y+(k<3?-r*.25:r*.3);ell(gx+3,gy+2,6,2,"#13241a55");poly([[gx-4.5,gy],[gx-4.5,gy-10],[gx-2,gy-13],[gx+2,gy-13],[gx+4.5,gy-10],[gx+4.5,gy]],k===2?"#a6a0b6":"#9a9a8a");a.fillStyle="#00000033";a.fillRect(gx-2,gy-9,4,1.2);}
   a.strokeStyle="#5a4a36";a.lineWidth=1.6;a.beginPath();a.moveTo(x-r,y+r*.65);a.lineTo(x+r,y+r*.65);a.stroke();for(let fx=x-r;fx<=x+r;fx+=7){a.beginPath();a.moveTo(fx,y+r*.65);a.lineTo(fx,y+r*.65-7);a.stroke();}
   living.push({type:"wisp",x,y:y-r*.2,ph:random()*6});}
  else if(kind==="shrine"){shadow(x,y+2,r*.8,r*.28);rect(x-r*.6,y-r*.25,r*1.2,r*.25,"#9a9480");poly([[x-r*.3,y-r*.25],[x-r*.2,y-r*1.7],[x,y-r*2],[x+r*.2,y-r*1.7],[x+r*.3,y-r*.25]],"#8e8aa0");poly([[x,y-r*2],[x+r*.2,y-r*1.7],[x+r*.3,y-r*.25],[x+r*.05,y-r*.25]],"#00000026",null);living.push({type:"rune",x,y:y-r*1.15,ph:random()*6});}
  else if(kind==="well"){shadow(x,y+2,r*.9,r*.3);ell(x,y,r*.75+1.5,r*.38+1.5,INK);ell(x,y,r*.75,r*.38,"#9a9480");ell(x,y-1,r*.5,r*.22,"#24384a");for(const sd of [-1,1])rect(x+sd*r*.6-1.5,y-r*1.25,3,r*1.2,"#6b4a2c");roofTri(x,y-r*1.2,r*1.4,r*.5,"#a6513b","#7f3b2b");rect(x-1,y-r*1.1,2,r*.6,"#c9b48a");}
  else if(kind==="cart"){shadow(x,y+3,r*.9,r*.25);rect(x-r*.8,y-r*.62,r*1.6,r*.4,"#9a6a3e");for(let k=0;k<3;k++)ell(x-r*.45+k*r*.42,y-r*.75,r*.26,r*.16,"#e3c56e");a.strokeStyle=INK;a.lineWidth=1.5;a.fillStyle="#6b4a2c";for(const wx of [-r*.5,r*.5]){a.beginPath();a.arc(x+wx,y-r*.18,r*.24,0,Math.PI*2);a.fill();a.stroke();}
   a.strokeStyle="#6b4a2c";a.lineWidth=2.5;a.beginPath();a.moveTo(x+r*.8,y-r*.4);a.lineTo(x+r*1.25,y-r*.1);a.stroke();}
  else if(kind==="hay"){shadow(x,y+1,r*.85,r*.28);poly([[x-r*.8,y],[x-r*.6,y-r*.75],[x,y-r*.95],[x+r*.6,y-r*.75],[x+r*.8,y]],"#e0c060");poly([[x,y-r*.95],[x+r*.6,y-r*.75],[x+r*.8,y],[x+r*.1,y]],"#b8963f",null);a.strokeStyle="#a8862f";a.lineWidth=1;for(let k=-2;k<=2;k++){a.beginPath();a.moveTo(x+k*r*.25,y-2);a.lineTo(x+k*r*.2,y-r*.7);a.stroke();}}
  else if(kind==="logs"){shadow(x,y+1,r,r*.3);for(const [dx,dy] of [[-r*.4,0],[r*.4,0],[0,-r*.5]]){rect(x+dx-r*.55,y+dy-r*.42,r*1.1,r*.42,"#7a5233");ell(x+dx+r*.55,y+dy-r*.21,r*.2+1,r*.21+1,INK);ell(x+dx+r*.55,y+dy-r*.21,r*.2,r*.21,"#d8b98a");}}
  else if(kind==="crates"){shadow(x,y+1,r,r*.3);for(const [dx,dy,sz] of [[-r*.45,0,r*.8],[r*.4,0,r*.7],[-r*.1,-r*.75,r*.65]]){rect(x+dx-sz/2,y+dy-sz,sz,sz,"#b07f4a");a.strokeStyle="#7a5233";a.lineWidth=1.4;a.beginPath();a.moveTo(x+dx-sz/2,y+dy-sz);a.lineTo(x+dx+sz/2,y+dy);a.stroke();}}
  else if(kind==="barrels"){shadow(x,y+1,r,r*.3);for(const dx of [-r*.45,r*.45]){rect(x+dx-r*.4,y-r*1.1,r*.8,r*1.1,"#8a5d36");a.fillStyle="#3a3a36";a.fillRect(x+dx-r*.4,y-r*.85,r*.8,2);a.fillRect(x+dx-r*.4,y-r*.35,r*.8,2);ell(x+dx,y-r*1.1,r*.4,r*.14,"#a8794a");}}
  else if(kind==="stump"){shadow(x,y+1,r,r*.32);rect(x-r*.6,y-r*.7,r*1.2,r*.7,"#7a5233");ell(x,y-r*.7,r*.6+1,r*.26+1,INK);ell(x,y-r*.7,r*.6,r*.26,"#d8b98a");a.strokeStyle="#a8794a";a.lineWidth=1;a.beginPath();a.ellipse(x,y-r*.7,r*.3,r*.12,0,0,Math.PI*2);a.stroke();}
  else if(kind==="fence"){const n=4,ang=(random()-.5)*.5;for(let k=0;k<n;k++){const fx=x-r+k*(2*r/(n-1)),fy=y+Math.sin(ang)*(fx-x);rect(fx-1.8,fy-12,3.6,12,"#8a6440");}a.strokeStyle=INK;a.lineWidth=4;for(const h of [4,9]){a.beginPath();a.moveTo(x-r,y-h-Math.sin(ang)*r);a.lineTo(x+r,y-h+Math.sin(ang)*r);a.stroke();}a.strokeStyle="#b08a5a";a.lineWidth=2.2;for(const h of [4,9]){a.beginPath();a.moveTo(x-r,y-h-Math.sin(ang)*r);a.lineTo(x+r,y-h+Math.sin(ang)*r);a.stroke();}}
  else if(kind==="cliff"){const pts=[];for(let k=0;k<9;k++){const an=Math.PI+k/8*Math.PI,rr=r*(.85+random()*.25);pts.push([x+Math.cos(an)*rr*1.2,y-r*.45+Math.sin(an)*rr*.6]);}
   const face=[...pts.map(([px,py])=>[px,py]),[x+r*1.2,y+r*.15],[x-r*1.2,y+r*.15]];shadow(x,y+r*.15,r*1.3,r*.3);poly(face,"#7d7663");
   const top=[...pts,[x+r*1.15,y-r*.42],[x-r*1.15,y-r*.42]];poly(pts.concat([[x+r*1.15,y-r*.2],[x,y-r*.05],[x-r*1.15,y-r*.2]]),"#a39b80");
   ell(x-r*.1,y-r*.55,r*.75,r*.25,S.moss[0]);ell(x-r*.3,y-r*.62,r*.4,r*.13,S.moss[1]);a.strokeStyle="#00000030";a.lineWidth=1.2;for(let k=-2;k<=2;k++){a.beginPath();a.moveTo(x+k*r*.4,y-r*.15);a.lineTo(x+k*r*.38+3,y+r*.12);a.stroke();}}
  else if(kind==="banner"){rect(x-1.5,y-30,3,30,"#6b4a2c");ell(x,y-31,2.4,2.4,"#e6c66a");living.push({type:"banner",x:x+1.5,y:y-29,c:["#c9473a","#3f78b8","#e6c66a","#6a4a9a","#4f9a4a"][Math.floor(random()*5)],ph:random()*6});}
  else if(kind==="sign"){rect(x-1.5,y-20,3,20,"#6b4a2c");rect(x-12,y-22,22,8,"#b08a5a");poly([[x+10,y-22],[x+15,y-18],[x+10,y-14]],"#b08a5a");a.fillStyle="#5a3e25";a.fillRect(x-9,y-19,15,1.4);}
 }

}

// Drawn every frame on the main canvas in map units. Cheap: a few shapes per animated prop.
export function animateMap(ctx,now){const t=now/1000;
 for(const L of living){
  if(L.type==="glint"){const k=Math.max(0,Math.sin(t*1.6+L.ph));if(k<.2)continue;ctx.globalAlpha=k*.7;ctx.fillStyle="#e8fbff";ctx.fillRect(L.x-2.5,L.y-.6,5,1.2);ctx.globalAlpha=1;}
  else if(L.type==="smoke"||L.type==="fire"){const base=L.type==="fire"?L.y-6:L.y;for(let i=0;i<4;i++){const k=((t*.35+i/4+L.ph)%1),px=L.x+Math.sin(t*1.2+i*2+L.ph)*4*k+k*8,py=base-k*34;ctx.globalAlpha=.4*(1-k);ctx.fillStyle="#ecebe4";ctx.beginPath();ctx.arc(px,py,3+k*6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
   if(L.type==="fire"){const f=Math.sin(t*14+L.ph)*.5+.5;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.22+f*.1;ctx.fillStyle="#ffb24a";ctx.beginPath();ctx.arc(L.x,L.y-3,16,0,Math.PI*2);ctx.fill();ctx.restore();
    for(const [dx,h,c] of [[-3,10+f*4,"#ff7a2e"],[3,9+(1-f)*4,"#ff7a2e"],[0,13+f*3,"#ffb84a"],[0,7,"#fff0a8"]]){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(L.x+dx-3.5,L.y);ctx.quadraticCurveTo(L.x+dx-2,L.y-h*.6,L.x+dx,L.y-h);ctx.quadraticCurveTo(L.x+dx+2,L.y-h*.6,L.x+dx+3.5,L.y);ctx.fill();}}}
  else if(L.type==="sails"){ctx.save();ctx.translate(L.x,L.y);ctx.rotate(t*.9+L.ph);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillStyle="#15241c";ctx.fillRect(-1.6,0,3.2,L.r+1);ctx.fillStyle="#6b4a2c";ctx.fillRect(-1,0,2,L.r);ctx.fillStyle="#15241c";ctx.fillRect(1,L.r*.25,L.r*.32+1,L.r*.75+1);ctx.fillStyle="#efe6cc";ctx.fillRect(1.5,L.r*.27,L.r*.3,L.r*.72);}ctx.fillStyle="#3d2f22";ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();ctx.restore();}
  else if(L.type==="banner"){ctx.fillStyle="#15241c";ctx.beginPath();ctx.moveTo(L.x,L.y-1);for(let i=0;i<=6;i++){const u=i/6;ctx.lineTo(L.x+u*16,L.y-1+Math.sin(t*5+L.ph-u*3)*u*2.4);}for(let i=6;i>=0;i--){const u=i/6;ctx.lineTo(L.x+u*16,L.y+11+Math.sin(t*5+L.ph-u*3)*u*2.4+(i===6?-3:0));}ctx.closePath();ctx.fill();
   ctx.fillStyle=L.c;ctx.beginPath();ctx.moveTo(L.x,L.y);for(let i=0;i<=6;i++){const u=i/6;ctx.lineTo(L.x+u*15,L.y+Math.sin(t*5+L.ph-u*3)*u*2.4);}for(let i=6;i>=0;i--){const u=i/6;ctx.lineTo(L.x+u*15,L.y+10+Math.sin(t*5+L.ph-u*3)*u*2.4+(i===6?-3:0));}ctx.closePath();ctx.fill();}
  else if(L.type==="duck"){const an=t*.25+L.ph,dx=L.x+Math.cos(an)*L.r*.7,dy=L.y+Math.sin(an)*L.r*.3,dir=Math.sin(an)>0?-1:1;ctx.fillStyle="#ffffff55";ctx.beginPath();ctx.ellipse(dx,dy+2,7,2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f2efe4";ctx.beginPath();ctx.ellipse(dx,dy,5,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#3f7a4a";ctx.beginPath();ctx.arc(dx+4*dir,dy-3,2.2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f0a030";ctx.fillRect(dx+(dir>0?5.5:-8),dy-3.4,2.5,1.4);}
  else if(L.type==="butterfly"){const x=L.x+Math.sin(t*.7+L.ph)*22+Math.sin(t*1.9+L.ph)*6,y=L.y+Math.cos(t*.9+L.ph)*12-6,f=Math.abs(Math.sin(t*16+L.ph));ctx.fillStyle=L.c;for(const sd of [-1,1]){ctx.beginPath();ctx.ellipse(x+sd*2.2*f,y,2.4*f+.4,2,0,0,Math.PI*2);ctx.fill();}}
  else if(L.type==="wisp"||L.type==="rune"){const k=Math.sin(t*2+L.ph)*.5+.5,y=L.y-(L.type==="wisp"?Math.sin(t*.8+L.ph)*6:0);ctx.save();ctx.globalCompositeOperation="lighter";for(const [r,al] of [[11,.12],[6,.22],[3,.5]]){ctx.globalAlpha=al*(.5+k*.5);ctx.fillStyle=L.type==="wisp"?"#bfe8d0":"#c9a6ff";ctx.beginPath();ctx.arc(L.x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();}
  else if(L.type==="snow"){ctx.fillStyle="#ffffff";for(let i=0;i<110;i++){const sp=18+(i*37%23),x0=(i*97.3)%L.W,y=((i*61.7)+t*sp)%(L.H+20)-10,x=x0+Math.sin(t*.8+i)*10,r=.9+(i%3)*.55;ctx.globalAlpha=.55+(i%4)*.1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  else if(L.type==="leaves"){const C=["#c9542e","#e8823a","#f2b84a","#a8382e"];for(let i=0;i<26;i++){const sp=22+(i*13%17),x0=(i*131.7)%L.W,y=((i*53.3)+t*sp)%(L.H+30)-15,x=x0+Math.sin(t*1.1+i)*24,rot=t*2+i;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,Math.abs(Math.sin(t*3+i))*.7+.3);ctx.fillStyle=C[i%4];ctx.beginPath();ctx.ellipse(0,0,4,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
  else if(L.type==="birds"){const period=26,k=(t%period)/period;if(k>.55)continue;const u=k/.55,bx=-60+u*(L.W+120),by=L.H*.28+Math.sin(u*3)*40;for(let i=0;i<5;i++){const ox=bx-i*16-(i%2)*8,oy=by+(i%2?10:-4)*(1+i*.2),fl=Math.sin(t*12+i)*3;ctx.fillStyle="#13241a30";ctx.beginPath();ctx.ellipse(ox+30,oy+90,4,1.6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#22302a";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(ox-5,oy-fl);ctx.quadraticCurveTo(ox-2,oy-1,ox,oy);ctx.quadraticCurveTo(ox+2,oy-1,ox+5,oy-fl);ctx.stroke();}}
 }
 ctx.globalAlpha=1;}
