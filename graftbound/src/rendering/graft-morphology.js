/** Original 64px modular pixel anatomy drawn in the same palette/lighting space as the Blank.
 * Every frame is regenerated from saved visual state; never changes combat or RNG. */
const F=64;
const C={ink:'#222c31',highlight:'#e8d8b5',bone:'#e6d2a0',boneDark:'#85745c',leaf:'#6f9960',leafHi:'#b5d186',wood:'#664b38',woodHi:'#b08a62',metal:'#607a85',steel:'#9aa9aa',bright:'#d9dde0',shadow:'#364e54',gold:'#c8a665',red:'#b35a45',flame:'#e8974b',venom:'#8e76b7',teal:'#5b9791',purple:'#997ec4',cloth:'#697f80'};
function dot(g,x,y,w=1,h=1,c=C.ink){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function ellipse(g,x,y,rx,ry,light,shadow=C.ink){
 for(let iy=Math.floor(y-ry);iy<=Math.ceil(y+ry);iy++)for(let ix=Math.floor(x-rx);ix<=Math.ceil(x+rx);ix++){
  const xx=(ix+.5-x)/Math.max(1,rx),yy=(iy+.5-y)/Math.max(1,ry),v=xx*xx+yy*yy;
  if(v>1)continue;
  dot(g,ix,iy,1,1,(xx+yy)*.5<-.35?light:v>.79?shadow:light);
 }
}
function line(g,x,y,xx,yy,c=C.ink,w=1){const n=Math.ceil(Math.max(Math.abs(xx-x),Math.abs(yy-y)));for(let i=0;i<=n;i++){const t=i/Math.max(n,1);dot(g,x+(xx-x)*t,y+(yy-y)*t,w,w,c);}}
function poly(g,p,col,edge=C.ink){let low=Math.floor(Math.min(...p.map(v=>v[1]))),high=Math.ceil(Math.max(...p.map(v=>v[1])));
 for(let y=low;y<=high;y++){let xs=[];for(let i=0;i<p.length;i++){let [x0,y0]=p[i],[x1,y1]=p[(i+1)%p.length];if(y+.5>=Math.min(y0,y1)&&y+.5<Math.max(y0,y1)&&y1!==y0)xs.push(x0+(y+.5-y0)*(x1-x0)/(y1-y0));}
 xs.sort((a,b)=>a-b);for(let i=0;i<xs.length-1;i+=2)for(let x=Math.ceil(xs[i]);x<xs[i+1];x++)dot(g,x,y,1,1,col);}
 if(edge)for(let i=0;i<p.length;i++)line(g,...p[i],...p[(i+1)%p.length],edge);
}
function prong(g,x,y,dx,dy,shade=C.bone){line(g,x,y,x+dx*.7,y+dy*.7,C.boneDark,3);line(g,x+dx*.3,y+dy*.3,x+dx,y+dy,shade,1);}
export function renderGraftFrame(g,app,view,anim,frame,pass){
 const A=app.anatomy||{},t=A.features||{},m=A.morph||{},back=!!view,walk=anim===1,attack=anim===2,cast=anim===3;
 const phase=frame%4,bob=walk?(phase%2):anim===0?(phase>1?1:0):0,lean=attack?([1,-2,-3,0][phase]):0;
 const xx=lean,yy=bob,level=Math.min(3,Math.max(1,Math.floor(A.stage/3)+1));
 const organic=m.surface==='bark'?[C.wood,C.woodHi]:m.surface==='chitin'?[C.metal,C.steel]:m.surface==='fur'?['#917d64','#d6b993']:[C.woodHi,C.bone];
 if(pass==='behind'){
  // Tail belongs to the pelvis, not the torso overlay. Larger tails curl inward for grid readability.
  if(t.tail){let k=t.tail,tx=42+xx,ty=48+yy;for(let i=0;i<9+k;i++){
    const fx=tx+i*1.4, fy=ty+Math.sin(i*.43+phase*.18)*2-i*.66;
    ellipse(g,fx,fy,Math.max(1.8,4-i*.17),Math.max(1.8,3-i*.12),m.tailKind==='fur'?'#b99b75':organic[0],C.ink);
    if(i%3===0)dot(g,fx,fy-2,2,1,organic[1]);
  }if(m.tailKind==='serpent')ellipse(g,54,36+yy,3,2,C.teal);}
  if(t.wings){const span=9+Math.min(t.wings,3)*2,opening=anim===1?phase%2*4:anim===3?5:phase%2*2;
    for(const side of [-1,1]){
      const x=32+xx+side*4,y=29+yy;
      poly(g,[[x,y],[x+side*(span+opening),4+yy],[x+side*(span+5+opening),20+yy],[x+side*(span-2),36+yy],[x+side*5,36+yy]],m.wingKind==='feather'?'#c9c7b1':'#975a54',C.ink);
      line(g,x,y,x+side*(span+opening),5+yy,m.wingKind==='feather'?C.bright:C.bone,2);
      for(let j=1;j<=3;j++)line(g,x,y+5,x+side*(span+j),14+j*5+yy,m.wingKind==='feather'?'#9babb4':C.red,1);
    }
  }
  if(t.shell){ellipse(g,32+xx,30+yy,12+t.shell,11+t.shell,'#536f60');
    for(let i=-2;i<=2;i++){line(g,32+xx+i*5,22+yy,32+xx+i*6,35+yy,C.teal,1);dot(g,32+xx+i*5,26+yy,2,2,C.steel);}}
  if(t.spikes){for(let i=-2;i<=2;i++){let ox=32+xx+i*5;prong(g,ox,24+yy,2*i,-(7+t.spikes*2),C.bone);}}
  if(m.lower==='serpentine'&&level>=2){for(let i=0;i<7;i++)ellipse(g,28+i*3+xx,53+Math.sin(i*.7+phase*.2)*2,5,4,C.teal);}
  return;
 }
 // Anatomical surface restructuring occurs after the base, before gear. Draw selective material texture only.
 if(m.surface==='bark'&&A.stage){for(let i=0;i<8;i++){
   let x=25+(i*7)%15+xx,y=30+(i*5)%17+yy;
   line(g,x,y,x+((i%3)-1)*2,y+5,C.wood,2);dot(g,x,y,1,3,C.woodHi);
 }}
 if(m.surface==='scales'&&A.stage){for(let y=31;y<47;y+=4)for(let x=25+(y%3);x<40;x+=4){dot(g,x+xx,y+yy,3,2,'#8e917b');dot(g,x+xx,y+yy,1,1,C.bone);}}
 if(m.surface==='chitin'&&A.stage){for(let y=30;y<46;y+=5){ellipse(g,32+xx,y+yy,10,3,C.metal,C.shadow);line(g,27+xx,y-1+yy,38+xx,y-1+yy,C.steel,1);}}
 if(m.surface==='fur'&&A.stage){for(let i=0;i<9;i++){let x=23+((i*7)%18)+xx,y=29+((i*4)%13)+yy;prong(g,x,y,i%2?3:-3,-2,'#c4a683');}}
 if(m.head==='feline'&&A.stage){
   ellipse(g,32+xx,19+yy,10,10,'#ae8d65');
   for(const side of [-1,1])poly(g,[[32+side*5+xx,12+yy],[32+side*11+xx,6+yy],[32+side*12+xx,16+yy]],'#a9876c');
   if(!back){ellipse(g,29+xx,22+yy,6,3,'#d3b99a');dot(g,25+xx,18+yy,3,2,C.ink);dot(g,35+xx,18+yy,3,2,C.ink);dot(g,28+xx,23+yy,6,1,C.wood);}
 }
 if(m.head==='draconic'&&A.stage){
   ellipse(g,32+xx,18+yy,9,10,C.teal);
   if(!back){poly(g,[[24+xx,19+yy],[17+xx,24+yy],[20+xx,28+yy],[38+xx,25+yy]],'#83a194');dot(g,24+xx,17+yy,2,2,C.ink);dot(g,35+xx,17+yy,2,2,C.ink);}
 }
 if(m.head==='beak'&&A.stage&&!back){poly(g,[[28+xx,21+yy],[19+xx,25+yy],[30+xx,27+yy]],C.gold);}
 if(t.horns){for(const side of [-1,1]){prong(g,32+side*6+xx,10+yy,side*(4+t.horns),-(6+t.horns*2),C.bone);}}
 if(t.antlers){for(const side of [-1,1]){let x=32+side*6+xx,y=11+yy;line(g,x,y,x+side*9,y-10,C.wood,3);line(g,x+side*5,y-5,x+side*10,y-15,C.woodHi,2);line(g,x+side*5,y-5,x+side*13,y-6,C.woodHi,2);}}
 if(t.crown){for(let i=-2;i<=2;i++){let x=32+i*4+xx;prong(g,x,9+yy,i,-(3+t.crown*2),C.gold);}}
 if(t.beak&&!back){poly(g,[[28+xx,20+yy],[17+xx,25+yy],[25+xx,28+yy],[32+xx,24+yy]],C.gold,C.wood);dot(g,19+xx,26+yy,2,1,C.bone);}
 if(t.tusks&&!back){prong(g,25+xx,25+yy,-3,-6,C.bone);prong(g,35+xx,25+yy,2,-5,C.bone);}
 if(t.eyes&&!back){dot(g,29+xx,12+yy,3,1,C.teal);dot(g,33+xx,10+yy,3,1,C.teal);}
 if(t.blades){for(const side of [-1,1]){poly(g,[[32+side*15+xx,42+yy],[32+side*(20+t.blades*3)+xx,27+yy],[32+side*18+xx,37+yy]],C.steel);}}
 if(t.claws){for(const side of [-1,1])for(let j=0;j<3;j++){let x=32+side*17+xx;prong(g,x,42+j*2+yy,side*(3+t.claws),2,C.bone);}}
 if(t.armor){poly(g,[[26+xx,30+yy],[38+xx,30+yy],[42+xx,40+yy],[39+xx,46+yy],[25+xx,46+yy],[22+xx,40+yy]],C.metal);
   for(let yy2=34;yy2<=44;yy2+=4){line(g,25+xx,yy2+yy,39+xx,yy2+yy,C.steel,1);dot(g,31+xx,yy2+yy,2,2,C.gold);}}
 if(t.moss){for(let i=0;i<7;i++)ellipse(g,22+((i*5)%20)+xx,30+((i*11)%16)+yy,2,2,C.leaf,C.wood);}
 if(t.tendrils){for(let i=0;i<3;i++){let x=21+i*11+xx,y=42+yy;line(g,x,y,x+(i-1)*4,y+8,C.red,2);dot(g,x+(i-1)*4,y+8,2,1,C.venom);}}
 if(t.venom){for(let i=0;i<7;i++){let x=25+(i*7)%16+xx,y=31+(i*3)%17+yy;dot(g,x,y,2,2,C.purple);}}
 if(app.markings?.length){for(let i=0;i<Math.min(app.markings.length,3);i++){
   const color=app.markings[i];const tint={verdant:C.leaf,umbral:C.purple,ember:C.flame,tide:C.teal,radiant:C.gold}[color]||C.gold;
   dot(g,27+xx+i*4,39+yy,2,2,tint);
 }}
}
export function drawGraftSheet(context,app,pass){
 for(let view=0;view<2;view++)for(let anim=0;anim<5;anim++)for(let frame=0;frame<4;frame++){
  context.save();context.translate(frame*F,(view*5+anim)*F);
  renderGraftFrame(context,app,view,anim,frame,pass);
  context.restore();
 }
}
