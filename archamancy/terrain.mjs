// Painted battlefield backdrop (cosmetic only, drawn once per map and resize into an offscreen canvas).
// Art direction, from studying top tower defense games such as Kingdom Rush:
// - Keep the ground mid-value and low-contrast so towers, troops and enemies always pop on top of it.
// - One warm key light from the top-left; every prop casts a soft shadow to the lower right.
// - Chunky shapes with dark ink outlines, a lit side and a shaded side, so props read at small sizes.
// - The road is the brightest large shape on the map, so the route is obvious at a glance.
// - Pads look like real stone foundations with a bevel, not flat ellipses.
const INK="#15241c";
export function paintTerrain(a,game){
 const {segments,spans,pads,keep,labels,entrances}=game.map,W=game.map.width||1000,H=game.map.height||600;
 let seed=23921;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const roadDist=(x,y)=>{const q=game.pointAt(game.nearestPath(x,y));return Math.hypot(q.x-x,q.y-y);};
 const padDist=(x,y)=>Math.min(...pads.map(p=>Math.hypot((p.x-x)*.85,p.y-y)));
 const clear=(x,y,road=44,pad=40)=>roadDist(x,y)<road||padDist(x,y)<pad;
 const ell=(x,y,rx,ry,fill,rot=0)=>{a.beginPath();a.ellipse(x,y,rx,ry,rot,0,Math.PI*2);a.fillStyle=fill;a.fill();};
 const roadPath=()=>{a.beginPath();for(const path of segments)path.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));};

 // 1. Ground: a mid-green meadow, warmer where the light falls.
 const g=a.createLinearGradient(0,0,W*.6,H);g.addColorStop(0,"#5d8a45");g.addColorStop(.55,"#4f7d3e");g.addColorStop(1,"#3f6a37");a.fillStyle=g;a.fillRect(0,0,W,H);
 // Large soft meadow patches break up the flat colour.
 for(let i=0;i<46;i++){const x=random()*W,y=random()*H,r=40+random()*110,c=random()<.55?"#7aa553":"#2f5a33",p=a.createRadialGradient(x,y,0,x,y,r);p.addColorStop(0,c+"33");p.addColorStop(1,c+"00");a.fillStyle=p;a.fillRect(x-r,y-r,r*2,r*2);}
 // Grass texture: short strokes, lighter on top so the field feels lit from above.
 a.lineCap="round";
 for(let i=0;i<5200;i++){const x=random()*W,y=random()*H,len=2+random()*4,c=["#6f9c4e","#86b15c","#45733b","#5b8a45"][i%4];a.strokeStyle=c;a.globalAlpha=.45;a.lineWidth=1.1;a.beginPath();a.moveTo(x,y);a.lineTo(x+(random()-.5)*2,y-len);a.stroke();}
 a.globalAlpha=1;
 // Bare earth patches.
 for(let i=0;i<14;i++){const x=random()*W,y=random()*H;if(clear(x,y,60,50))continue;const r=10+random()*18;ell(x,y,r*1.4,r*.6,"#7c7048aa",random()*.4);ell(x-2,y-1,r*1.1,r*.42,"#93865a88",random()*.4);}

 // 2. Road: ambient occlusion on the grass, a worn earth edge, sandy bed and a lighter worn centre.
 a.lineJoin="round";a.lineCap="round";roadPath();
 for(const [w,c] of [[78,"#1e3a2224"],[70,"#1e3a2230"],[62,"#2a3b2266"]]){a.strokeStyle=c;a.lineWidth=w;a.stroke();}
 a.strokeStyle="#6e5a3b";a.lineWidth=55;a.stroke();
 a.strokeStyle="#b99a66";a.lineWidth=47;a.stroke();
 a.strokeStyle="#cfb37c";a.lineWidth=36;a.stroke();
 a.strokeStyle="#dcc391";a.globalAlpha=.55;a.lineWidth=16;a.stroke();a.globalAlpha=1;
 // Wheel ruts.
 for(const side of [-1,1]){a.save();a.setLineDash([22,9]);a.lineDashOffset=side*7;a.strokeStyle="#a6875a";a.globalAlpha=.45;a.lineWidth=2.2;
  a.beginPath();for(const [s0,s1] of spans){for(let n=s0;n<=s1;n+=4){const p=game.pointAt(n),q=game.pointAt(Math.min(s1,n+2)),dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,x=p.x-dy/l*9*side,y=p.y+dx/l*9*side;n===s0?a.moveTo(x,y):a.lineTo(x,y);}}a.stroke();a.restore();}
 // Pebbles and cobbles on the road bed.
 for(let i=0;i<620;i++){const [s0,s1]=spans[i%spans.length],p=game.pointAt(s0+random()*(s1-s0)),x=p.x+(random()-.5)*36,y=p.y+(random()-.5)*36;if(roadDist(x,y)>19)continue;const r=1+random()*2.4;ell(x+.8,y+.8,r,r*.7,"#8a6f4888");ell(x,y,r,r*.7,random()<.5?"#e3cfa3":"#bfa57a");}
 // Edging stones along both sides with a lit top and a contact shadow.
 for(const [s0,s1] of spans)for(let n=s0+6;n<s1;n+=12){const p=game.pointAt(n),q=game.pointAt(n+1),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  for(const side of [-1,1]){const x=p.x+nx*24*side+(random()-.5)*2,y=p.y+ny*24*side+(random()-.5)*2,r=3.4+random()*1.4;if(roadDist(x,y)<21)continue;ell(x+1.2,y+1.6,r+1,r*.75,"#2b2a1fbb");ell(x,y,r+.8,r*.72+.6,INK);ell(x,y,r,r*.72,random()<.5?"#a59a7c":"#968c6f");ell(x-r*.25,y-r*.25,r*.5,r*.3,"#cfc6a6");}}
 // Grass tufts spilling over the road edge soften the hard line.
 for(let i=0;i<420;i++){const [s0,s1]=spans[i%spans.length],n=s0+random()*(s1-s0),p=game.pointAt(n),q=game.pointAt(n+1),dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,side=random()<.5?-1:1,d=27+random()*5,x=p.x-dy/l*d*side,y=p.y+dx/l*d*side;
  if(padDist(x,y)<30||roadDist(x,y)<25)continue;tuft(x,y,4+random()*3);}

 // 3. Build pads: a stone foundation with a bevel (lit top-left rim, shaded bottom-right).
 for(const p of pads){
  ell(p.x+3,p.y+6,34,21,"#13241a66");
  ell(p.x,p.y+2,32,20,INK);
  const rim=a.createLinearGradient(p.x-30,p.y-18,p.x+24,p.y+20);rim.addColorStop(0,"#d7cfae");rim.addColorStop(.5,"#9c9578");rim.addColorStop(1,"#5c5847");ell(p.x,p.y,30,18.5,rim);
  const top=p.bonus==="spring"?["#5aa3a3","#2f6b6f"]:p.bonus==="height"?["#c7ad70","#8a7244"]:["#a29c80","#77735e"];const t=a.createLinearGradient(p.x,p.y-14,p.x,p.y+14);t.addColorStop(0,top[0]);t.addColorStop(1,top[1]);ell(p.x,p.y+1,24,14,t);
  // Flagstone seams.
  a.save();a.beginPath();a.ellipse(p.x,p.y+1,24,14,0,0,Math.PI*2);a.clip();a.strokeStyle="#00000030";a.lineWidth=1.2;a.beginPath();a.moveTo(p.x-24,p.y+2);a.lineTo(p.x+24,p.y);a.moveTo(p.x-6,p.y-14);a.lineTo(p.x-9,p.y+1);a.moveTo(p.x+9,p.y+1);a.lineTo(p.x+6,p.y+15);a.stroke();a.restore();
  if(p.bonus){a.strokeStyle=p.bonus==="spring"?"#a8f0e8":"#f6d98a";a.lineWidth=2;a.setLineDash([6,5]);a.beginPath();a.ellipse(p.x,p.y+1,38,24,0,0,Math.PI*2);a.stroke();a.setLineDash([]);}
 }

 // 4. Props: rocks, flowers, bushes and trees, sorted back to front so they overlap correctly.
 const props=[];
 for(let i=0;i<100;i++){const x=random()*W,y=random()*H;if(clear(x,y,40,36))continue;props.push({y,draw:()=>flower(x,y)});}
 for(let i=0;i<40;i++){const x=random()*W,y=random()*H;if(clear(x,y,44,40))continue;const r=4+random()*7;props.push({y,draw:()=>rock(x,y,r)});}
 for(let i=0;i<60;i++){const x=random()*W,y=random()*H;if(clear(x,y,46,42))continue;const r=7+random()*6;props.push({y,draw:()=>bush(x,y,r)});}
 // Trees come in clumps, which reads as woodland rather than noise.
 for(let c=0;c<44;c++){const cx=random()*W,cy=random()*H,n=3+Math.floor(random()*6),pine=random()<.55;for(let i=0;i<n;i++){const x=cx+(random()-.5)*90,y=cy+(random()-.5)*60;if(x<-10||x>W+10||y<-10||y>H+30||clear(x,y,50,46))continue;const h=24+random()*20;props.push({y,draw:pine?()=>pineTree(x,y,h):()=>roundTree(x,y,h*.55)});}}
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
 a.font="bold 13px Georgia";a.lineJoin="round";for(const [t,x,y] of labels){a.strokeStyle="#1b2a1fcc";a.lineWidth=4;a.strokeText(t,x,y);a.fillStyle="#fbefcb";a.fillText(t,x,y);}

 // 7. Light: warm key light from the top-left, cool shade bottom-right, gentle vignette.
 const key=a.createRadialGradient(W*.18,H*.05,0,W*.18,H*.05,W*.85);key.addColorStop(0,"#ffe9b030");key.addColorStop(1,"#ffe9b000");a.fillStyle=key;a.fillRect(0,0,W,H);
 const shade=a.createLinearGradient(0,0,W,H);shade.addColorStop(.55,"#0b1a2200");shade.addColorStop(1,"#0b1a2240");a.fillStyle=shade;a.fillRect(0,0,W,H);
 const v=a.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,W*.62);v.addColorStop(0,"#0a140f00");v.addColorStop(1,"#0a140f66");a.fillStyle=v;a.fillRect(0,0,W,H);

 function tuft(x,y,h){a.lineWidth=1.3;for(let k=-1;k<=1;k++){a.strokeStyle=k?"#4f8040":"#7fae57";a.beginPath();a.moveTo(x+k*1.6,y);a.quadraticCurveTo(x+k*2.6,y-h*.6,x+k*3.6,y-h);a.stroke();}}
 function flower(x,y){tuft(x,y,5);const c=["#f4e7a8","#f0a9c4","#b9d6f5","#fbf6ea","#f3b46b"][Math.floor(random()*5)];for(const [dx,dy] of [[-2.5,-6],[2.5,-7],[0,-9]]){ell(x+dx,y+dy,1.9,1.9,c);}ell(x,y-7.3,.9,.9,"#fff6c8");}
 function rock(x,y,r){ell(x+r*.5,y+r*.35,r*1.25,r*.6,"#13241a66");a.beginPath();a.moveTo(x-r*1.2,y+r*.2);a.lineTo(x-r*.8,y-r*.6);a.lineTo(x+r*.1,y-r*.9);a.lineTo(x+r*1.1,y-r*.4);a.lineTo(x+r*1.25,y+r*.25);a.closePath();a.fillStyle="#8a8d7c";a.fill();a.strokeStyle=INK;a.lineWidth=1.6;a.stroke();a.beginPath();a.moveTo(x-r*.8,y-r*.6);a.lineTo(x+r*.1,y-r*.9);a.lineTo(x+r*.3,y-r*.2);a.lineTo(x-r*.6,y-r*.05);a.closePath();a.fillStyle="#b9bba7";a.fill();}
 function bush(x,y,r){ell(x+r*.5,y+r*.3,r*1.3,r*.5,"#13241a77");const blobs=[[-r*.6,-r*.2,r*.7],[r*.6,-r*.25,r*.7],[0,-r*.6,r*.8]];for(const [dx,dy,rr] of blobs)ell(x+dx,y+dy,rr+1.5,rr*.85+1.5,INK);for(const [dx,dy,rr] of blobs)ell(x+dx,y+dy,rr,rr*.85,"#3f7a3a");for(const [dx,dy,rr] of blobs)ell(x+dx-rr*.25,y+dy-rr*.3,rr*.55,rr*.4,"#6fab52");if(random()<.35)for(let i=0;i<3;i++)ell(x+(random()-.5)*r*1.4,y-r*.4+(random()-.5)*r*.8,1.4,1.4,"#e5584a");}
 function pineTree(x,y,h){ell(x+h*.35,y+3,h*.5,h*.16,"#10201866");a.fillStyle="#5b4330";a.fillRect(x-2,y-h*.22,4,h*.26);
  for(let k=0;k<3;k++){const top=y-h*(1.05-k*.2),base=y-h*(.08+k*.15),half=h*(.38-k*.07);
   a.beginPath();a.moveTo(x,top-1.5);a.lineTo(x-half-1.5,base+1);a.lineTo(x+half+1.5,base+1);a.closePath();a.fillStyle=INK;a.fill();
   a.beginPath();a.moveTo(x,top);a.lineTo(x-half,base);a.lineTo(x+half,base);a.closePath();a.fillStyle=["#2b5a36","#336a3d","#3c7744"][k];a.fill();
   a.beginPath();a.moveTo(x,top);a.lineTo(x-half,base);a.lineTo(x-half*.15,base);a.closePath();a.fillStyle=["#477e4a","#538d50","#5f9b57"][k];a.fill();}}
 function roundTree(x,y,r){ell(x+r*.7,y+3,r*1.1,r*.35,"#10201870");a.fillStyle=INK;a.fillRect(x-3.2,y-r*.9,6.4,r*.95);a.fillStyle="#6b4d33";a.fillRect(x-2.2,y-r*.9,4.4,r*.9);
  const cy=y-r*1.35,blobs=[[-r*.55,r*.1,r*.62],[r*.55,r*.12,r*.6],[0,-r*.35,r*.72],[0,r*.2,r*.7]];
  for(const [dx,dy,rr] of blobs)ell(x+dx,cy+dy,rr+1.8,rr+1.6,INK);for(const [dx,dy,rr] of blobs)ell(x+dx,cy+dy,rr,rr*.95,"#3a7139");
  for(const [dx,dy,rr] of blobs)ell(x+dx-rr*.22,cy+dy-rr*.25,rr*.62,rr*.55,"#4f8c45");ell(x-r*.35,cy-r*.45,r*.32,r*.24,"#78b35b");}
}
