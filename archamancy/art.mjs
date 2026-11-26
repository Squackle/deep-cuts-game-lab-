import {paintTowerModel,towerArtSchools as towerSchools} from "./tower-art.mjs";
import {paintEnemyModel,enemyArtKeys as enemyKeys} from "./enemy-art.mjs";
import {paintAllyModel,allyArtKeys as allyKeys} from "./ally-art.mjs";

// Original cached procedural sprites and purely cosmetic combat illustrations.
export function createArt(ctx,{res:startRes=1,portrait=null}={}){
 const ink="#172722",gold="#ead49a",ice="#8ee5fb",violet="#ca9be9",fire="#ffb267",leaf="#a0d481";
 const commanderKeys=["krenko","talrand","omnath","edgar","lightpaws","meren","teysa","korvold","atraxa","urdragon","toxrill","torbran","urza","heliod","wilhelt","kaalia"];
 function poly(a,points,fill,stroke=ink){a.beginPath();points.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.closePath();a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=1.8;a.stroke();}}
 function oval(a,x,y,rx,ry,fill,stroke=null){a.beginPath();a.ellipse(x,y,rx,ry,0,0,Math.PI*2);a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=1.6;a.stroke();}}
 function rect(a,x,y,w,h,fill,stroke=ink){a.fillStyle=fill;a.fillRect(x,y,w,h);if(stroke){a.strokeStyle=stroke;a.lineWidth=1.5;a.strokeRect(x,y,w,h);}}
 function line(a,points,color,width=2){a.beginPath();points.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.strokeStyle=color;a.lineWidth=width;a.lineCap="round";a.lineJoin="round";a.stroke();}
 function crystal(a,x,y,s,c){poly(a,[[x,y-s],[x+s*.58,y],[x,y+s],[x-s*.58,y]],c);poly(a,[[x,y-s],[x+s*.58,y],[x,y+s]],"#ffffff44",null);}
 const cache=new Map();
 let res=startRes;
 // Sprites are drawn at res× their layout size so they stay sharp on high-density and large screens.
 function setRes(r){r=Math.max(1,Math.min(4,r));if(r!==res){res=r;cache.clear();}}
 function makeSprite(key,draw,w=96,h=96){if(cache.has(key))return cache.get(key);const c=document.createElement("canvas");c.width=Math.round(w*res);c.height=Math.round(h*res);const a=c.getContext("2d");a.save();if(res!==1)a.scale(res,res);a.translate(w/2,h*.75);draw(a);a.restore();finish(c,a,w,h);cache.set(key,c);return c;}
 // Art pass (painted look): every cached sprite gets a top-left key light, a darker base for weight,
 // a warm rim on the lit edge and a thick ink outline so it reads against the busy map, Kingdom Rush style.
 let scratch=null;
 function hitSprite(key,source){
  const id="hit:"+key,existing=cache.get(id);
  if(existing)return existing;
  const sprite=document.createElement("canvas");
  sprite.width=source.width;sprite.height=source.height;
  const layer=sprite.getContext("2d");
  layer.filter="brightness(1.9) saturate(.6)";
  layer.drawImage(source,0,0);
  cache.set(id,sprite);
  return sprite;
 }
 function finish(c,a,w,h){
  const W=c.width,H=c.height,k=W/w;
  a.save();a.globalCompositeOperation="source-atop";
  const light=a.createLinearGradient(0,0,W*.55,H);light.addColorStop(0,"#fff6dc55");light.addColorStop(.45,"#fff6dc00");light.addColorStop(.62,"#0a141000");light.addColorStop(1,"#0a141070");
  a.fillStyle=light;a.fillRect(0,0,W,H);a.restore();
  if(!scratch)scratch=document.createElement("canvas");const s=scratch;s.width=W;s.height=H;const b=s.getContext("2d");
  b.save();b.clearRect(0,0,W,H);b.shadowColor=ink;b.shadowBlur=0;const o=1.6*k;
  for(const [dx,dy] of [[o,0],[-o,0],[0,o],[0,-o],[o*.7,o*.7],[-o*.7,o*.7],[o*.7,-o*.7],[-o*.7,-o*.7]]){b.shadowOffsetX=dx;b.shadowOffsetY=dy;b.drawImage(c,0,0);}
  b.restore();b.save();b.filter="saturate(1.18) contrast(1.06)";b.drawImage(c,0,0);b.restore();
  a.save();a.setTransform(1,0,0,1,0,0);a.clearRect(0,0,W,H);a.drawImage(s,0,0);a.restore();
 }
 const bossKeys=new Set(["titan","grimgut","matron","colossus","hierophant","tyrant","lorthos","isu","kazuul","infernotitan"]);
 function creature(a,k){
  if(enemyKeys.includes(k))paintEnemyModel(a,k);
  else paintAllyModel(a,k);
 }
 // Leave headroom on pads at the top of the map so taller upgrades keep their silhouettes.
 function tower(t,p){const s=makeSprite("tower:"+t.kind+":"+t.tier+":"+(t.branch||"-"),a=>paintTowerModel(a,t.kind,t.tier,t.branch),96,120);const scale=Math.max(.55,Math.min(1,(p.y-3)/70));softShadow(p.x+3,p.y+9,32*scale,12*scale,.55);ctx.drawImage(s,p.x-42*scale,p.y-78.75*scale,84*scale,105*scale);idle(t,p,scale);}
 // Idle life on built towers: glowing crystals and eyes, forge smoke, flame flicker, crackling storm coils.
 // Anchors are model coordinates from paintTowerModel(); the sprite maps them at 0.875 × scale (plus tier growth).
 const IDLE={legion:[["glint",-10,-10,gold]],chapel:[["glow",0,-54,gold]],judgment:[["glow",0,-59,gold]],arcanum:[["glow",0,-39,ice],["orbit",0,-39,ice]],library:[["glow",0,-38,ice]],mirror:[["glow",0,-59,ice],["glint",-5,-38,"#e6fbff"]],
  necropolis:[["glow",0,-44,violet],["eyes",0,-21,"#c9a6ff"]],foundry:[["smoke",15,-46,"#d9d4e6"],["glow",0,-4,violet]],hex:[["glow",0,-29,violet]],pyre:[["flame",-6,-44,fire],["smoke",-6,-52,"#d8d0c8"]],goblin:[["smoke",-3,-42,"#e0d8cc"]],
  storm:[["glow",0,-49,"#f8db83"],["zap",0,-49,"#fff5c9"]],grove:[["glow",-14,-28,leaf],["glow",5,-42,leaf],["glow",15,-19,leaf]],beast:[["eyes",0,-6,"#ffd86b"]],thorn:[["glow",0,-49,"#c5ef9b"]]};
 function idle(t,p,scale){const list=IDLE[t.kind];if(!list)return;const now=(typeof performance!=="undefined"?performance.now():0)/1000,sx=.875*scale*(1+(t.tier-1)*.065),sy=.875*scale*(1+(t.tier-1)*.09),seed=(p.x*7+p.y*3)%10;
  ctx.save();
  list.forEach(([kind,mx,my,c],i)=>{const x=p.x+mx*sx,y=p.y+my*sy,ph=now*2+seed+i*1.7,k=Math.sin(ph)*.5+.5;
   if(kind==="glow")glow(x,y,10+k*6,c,.35+k*.45);
   else if(kind==="orbit"){const a=now*2.4+seed;oval(ctx,x+Math.cos(a)*14,y+Math.sin(a)*5,1.8,1.8,"#f2fdff");glow(x+Math.cos(a)*14,y+Math.sin(a)*5,6,c,.6);}
   else if(kind==="glint"){const g=(now*.5+seed*.1)%1;if(g<.12){const v=g/.12,r=6*Math.sin(v*Math.PI);ctx.save();ctx.globalCompositeOperation="lighter";ctx.fillStyle=c;ctx.globalAlpha=.9;ctx.beginPath();for(let j=0;j<8;j++){const an=j*Math.PI/4,rr=j%2?r*.25:r;j?ctx.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr):ctx.moveTo(x+rr,y);}ctx.closePath();ctx.fill();ctx.restore();}}
   else if(kind==="eyes"){const blink=(now*.4+seed*.13)%1>.96;if(!blink)for(const sd of [-1,1]){glow(x+sd*3.5*sx,y,5,c,.6);oval(ctx,x+sd*3.5*sx,y,1.3,1.3,c);}}
   else if(kind==="smoke"){for(let j=0;j<3;j++){const u=(now*.45+j/3+seed*.07)%1;ctx.globalAlpha=.45*(1-u);oval(ctx,x+Math.sin(now+j*2)*3*u+u*6,y-u*26,2.5+u*5,2.5+u*5,c);}ctx.globalAlpha=1;}
   else if(kind==="flame"){glow(x,y,12+k*5,c,.5+k*.3);for(let j=0;j<2;j++){const u=(now*.9+j*.5+seed*.1)%1;ctx.globalAlpha=1-u;oval(ctx,x+Math.sin(now*3+j)*4,y-u*18,1.4,1.4,"#ffd36b");}ctx.globalAlpha=1;}
   else if(kind==="zap"){const z=(now*1.3+seed*.1)%1;if(z<.18){const dir=Math.floor(now*7)%2?1:-1,pts=[[x,y]];for(let j=1;j<=4;j++)pts.push([x+dir*j*4+(Math.sin(now*40+j)*3),y-j*4-(j%2)*2]);ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.9;line(ctx,pts,c,1.6);ctx.restore();}}
  });
  ctx.restore();}
 let shadowMask=null;
 function softShadow(x,y,rx,ry,alpha){
  // One resampled contact shadow for every actor. Avoid allocating a gradient per unit per frame.
  if(!shadowMask){
   shadowMask=document.createElement("canvas");
   shadowMask.width=shadowMask.height=64;
   const shade=shadowMask.getContext("2d");
   const gradient=shade.createRadialGradient(32,32,6.4,32,32,32);
   gradient.addColorStop(0,"#08120e");
   gradient.addColorStop(1,"#08120e00");
   shade.fillStyle=gradient;
   shade.fillRect(0,0,64,64);
  }
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.drawImage(shadowMask,x-rx,y-ry,rx*2,ry*2);
  ctx.restore();
 }
 // Wooden scaffolding for a tower under construction; k (0 to 1) is how far it has gone up.
 function scaffold(x,y,k){const h=62*Math.min(1,k),w=24;ctx.save();ctx.lineCap="round";ctx.strokeStyle="#4a3324";ctx.lineWidth=5;
  for(const dx of [-w,w]){ctx.beginPath();ctx.moveTo(x+dx,y+2);ctx.lineTo(x+dx*.82,y+2-h);ctx.stroke();}
  ctx.strokeStyle="#a9814f";ctx.lineWidth=3;for(const dx of [-w,w]){ctx.beginPath();ctx.moveTo(x+dx,y+2);ctx.lineTo(x+dx*.82,y+2-h);ctx.stroke();}
  ctx.strokeStyle="#c79d62";ctx.lineWidth=2.5;for(let yy=y-14;yy>y+2-h;yy-=20){const f=(y-yy)/78,dx=w*(1-.18*f);ctx.beginPath();ctx.moveTo(x-dx,yy);ctx.lineTo(x+dx,yy);ctx.stroke();ctx.beginPath();ctx.moveTo(x-dx,yy);ctx.lineTo(x+dx,yy-18);ctx.globalAlpha=.7;ctx.stroke();ctx.globalAlpha=1;}
  oval(ctx,x,y+4,30,8,"#10231d55");ctx.restore();}
 // Ruins that block a pad until cleared.
 function rubble(x,y){ctx.save();oval(ctx,x,y+4,30,10,"#10231d77");const stones=[[-16,-2,11,7,"#7d7564"],[10,0,13,8,"#857c69"],[-2,-8,12,8,"#958b76"],[16,-10,7,6,"#6e6757"],[-20,-12,6,5,"#a39a84"]];for(const [dx,dy,rx,ry,c] of stones){oval(ctx,x+dx,y+dy,rx,ry,c,"#3b382f");}
  ctx.fillStyle="#b3a88e";ctx.strokeStyle="#3b382f";ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(x-8,y-34,10,26);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-8,y-34);ctx.lineTo(x-4,y-40);ctx.lineTo(x+2,y-36);ctx.lineTo(x+2,y-34);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="#5d8a4e";ctx.lineWidth=1.4;for(const dx of [-12,6,18]){ctx.beginPath();ctx.moveTo(x+dx,y+2);ctx.quadraticCurveTo(x+dx+2,y-5,x+dx+4,y-9);ctx.stroke();}ctx.restore();}
 // Health bars sit just above each model's head: the card-based enemy models stand taller than the old figures.
 function barTop(k){return bossKeys.has(k)?.86:commanderKeys.includes(k)?.81:enemyKeys.includes(k)?.72:.74;}
 function sizeOf(k){return bossKeys.has(k)?(k==="titan"||k==="grimgut"||k==="matron"||k==="colossus"||k==="hierophant"?70:k==="tyrant"?78:76):commanderKeys.includes(k)?(k==="urdragon"?66:54):k==="bloom"?56:k==="wing"?50:45;}
 // Attack poses (visual only): pose() watches each fighter's attack timer and health between frames.
 // A rising timer means it just struck (lunge, lean and a swing arc); falling health means it was hit (recoil and a flash).
 const poses=new Map();let poseSweep=0;
 function pose(key,next,hp,now=performance.now()){let p=poses.get(key);if(!p){p={next,hp,atk:-1e9,hurt:-1e9};poses.set(key,p);}
  if(next!==undefined&&p.seen&&(p.next===undefined||next>p.next))p.atk=now;if(hp<p.hp)p.hurt=now;p.next=next;p.hp=hp;p.seen=now;
  if(now-poseSweep>4000){poseSweep=now;for(const [k,v] of poses)if(now-v.seen>3000)poses.delete(k);}
  const a=(now-p.atk)/280,h=(now-p.hurt)/220;return {atk:a>=0&&a<1?a:0,hurt:h>=0&&h<1?h:0,engaged:now-p.atk<1400};}
 function unit(k,x,y,opt={}){
  const w=76,h=80,size=sizeOf(k),top=barTop(k),unitScale=size/68;
  const s=makeSprite("unit:"+k,a=>creature(a,k),w,h);const dir=(opt.dir<0?-1:1)*(opt.ally&&opt.engaged&&(!opt.gait?.moving||opt.atk)?-1:1),flip=dir,atk=opt.atk||0,hurt=opt.hurt||0;
  const casting=opt.casting||0,lift=casting?Math.sin(casting*Math.PI):0;
  const lunge=atk?Math.sin(Math.PI*Math.min(1,atk*1.4))*size*.2:0,recoil=hurt?Math.sin(Math.PI*hurt)*-3.5:0,lean=atk?Math.sin(Math.PI*Math.min(1,atk*1.4))*.22:0;
  x+=(lunge+recoil)*dir;
  if(lift){
   const base=y+(opt.flying?-14:0);
   ctx.save();
   ctx.globalAlpha*=.68*lift;
   ctx.strokeStyle=opt.castColor||gold;
   ctx.lineWidth=1.8;
   for(let i=0;i<2;i++){
    const radius=size*(.24+.25*casting+i*.08);
    ctx.beginPath();ctx.ellipse(x,base-5-i*11,radius,radius*.42,0,0,Math.PI*2);ctx.stroke();
   }
   ctx.restore();
  }
  const die=opt.die||0;if(die){ctx.save();ctx.globalAlpha*=die<.55?1:1-(die-.55)/.45;}
  ctx.save();softShadow(x+1,y+3,size*(opt.flying?.24:.32)*(1-die*.5),size*.11,opt.flying?.3:.5);ctx.translate(x,y+(opt.flying?-14+die*die*16:0));const ph=opt.animate?Math.sin(opt.time*.4+(opt.id||0)):0;let squash=opt.flying?0:Math.abs(ph)*.05,bob=opt.animate?ph*(opt.flying?2:1):0,rock=0,flap=0;
  // Enemy gait (visual only): ground enemies step with a bounce and a side-to-side rock timed to their speed; heavy ones stomp
  // slowly and squash on each footfall; fliers flap. Enemies held up by troops breathe in place instead of walking.
  if(opt.gait&&opt.animate&&!die){const g=opt.gait,t=opt.time,id=opt.id||0;
   if(opt.flying){const f=Math.sin(t*(1.3+g.speed*.02)+id);flap=f*.1;bob=Math.sin(t*.45+id)*3;squash=0;}
   else if(g.moving){const heavy=g.speed<=7,st=Math.sin(t*(.3+g.speed*.036)+id),up=Math.abs(st);bob=-up*(heavy?1.6:2.6)*(size/45);rock=st*(heavy?.045:.075);squash=heavy?(1-up)**3*.09:(1-up)**3*.05;}
   else{bob=Math.sin(t*.16+id)*.7;squash=(Math.sin(t*.16+id)*.5+.5)*.025;}}
  // Death (visual only): a white flash, then the body tips over and sinks while fading; fliers spin and drop.
  if(die){const k=Math.min(1,die/.6),e=1-(1-k)**2;rock=(opt.flying?2.2:1.35)*e;squash=die>.5?(die-.5)*.5:0;bob=die*size*.12;}
  bob-=lift*3;squash-=lift*.045;
  if(lean)ctx.rotate(lean*dir);if(rock)ctx.rotate(rock*dir);ctx.scale(flip*(1+squash*.5-flap*.3),1-squash+flap);
  const flashed=(hurt&&hurt<.6)||(die&&die<.18);
  ctx.drawImage(flashed?hitSprite(k,s):s,-w*unitScale/2,-h*unitScale*.75+bob,w*unitScale,h*unitScale);
  ctx.restore();
  if(die){ctx.restore();return;}
  // Swing arc: a quick bright crescent sweeping in front of the attacker.
  if(atk>.12&&atk<.8){const k=(atk-.12)/.68,cx=x+dir*size*.26,cy=y+(opt.flying?-14:0)-size*.32,r=size*.34,a0=-1.3+k*1.6;ctx.save();ctx.globalAlpha=(1-k)*.85;ctx.strokeStyle=opt.ally?"#fff6d8":"#ffd0c0";ctx.lineWidth=2.6;ctx.lineCap="round";ctx.beginPath();
   if(dir>0)ctx.arc(cx,cy,r,a0,a0+1.1);else ctx.arc(cx,cy,r,Math.PI-a0-1.1,Math.PI-a0);ctx.stroke();ctx.globalAlpha=(1-k)*.35;ctx.lineWidth=6;ctx.stroke();ctx.restore();}
  const yy=y+(opt.flying?-14:0)-size*top;const ww=size*.60;rect(ctx,x-ww/2,yy,ww,3,"#26332d",null);rect(ctx,x-ww/2,yy,ww*Math.max(0,Math.min(1,opt.hp||0)),3,opt.ally?"#94db93":"#e9a181",null);if(opt.ward) {ctx.strokeStyle="#f1d991aa";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y-9,15,19,0,0,Math.PI*2);ctx.stroke();}}
 const projectileColors={strike:gold,arcane:ice,mirror:"#c1edff",hex:violet,splash:fire,chain:"#ffdf83",root:leaf,melee:"#f6e0bd",heal:"#b0efad"};
 // Art pass: projectiles get a shaped core with an ink edge, an additive glow and a fading trail; impacts flash.
 function glow(x,y,r,c,a=1){ctx.save();ctx.globalCompositeOperation="lighter";for(const [k,al] of [[1,.14],[.6,.24],[.32,.4]]){ctx.globalAlpha=al*a;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r*k,0,Math.PI*2);ctx.fill();}ctx.restore();}
 function projectile(f,clock){
  const p=Math.max(0,Math.min(1,(clock-f.start)/f.duration)),c=projectileColors[f.kind]||gold;
  const arc=t=>f.kind==="splash"?Math.sin(t*Math.PI)*40:0,at=t=>[f.x+(f.tx-f.x)*t,f.y+(f.ty-f.y)*t-arc(t)];
  const [x,y]=at(p),dx=f.tx-f.x,dy=f.ty-f.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
  ctx.save();ctx.globalAlpha=1-p*.15;
  if(f.kind==="chain"){const pts=[[f.x,f.y],[f.x+dx*.25+dy*.06,f.y+dy*.25-dx*.06],[f.x+dx*.5-dy*.07,f.y+dy*.5+dx*.07],[f.x+dx*.75+dy*.05,f.y+dy*.75-dx*.05],[f.tx,f.ty]];
   ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.35*(1-p);line(ctx,pts,c,9);ctx.restore();line(ctx,pts,c,3.5);line(ctx,pts,"#fffbe6",1.4);glow(f.tx,f.ty,16,c,1-p);}
  else if(f.kind==="melee"){ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.tx,f.ty-6,13,-1.8+p,0.9+p);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle="#ffffff";ctx.lineWidth=1.2;ctx.stroke();}
  else if(f.kind==="strike"){ // Glowing holy arrow with fletching.
   const tx=x-ux*18,ty=y-uy*18;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.4;line(ctx,[[x-ux*34,y-uy*34],[x,y]],c,5);ctx.restore();
   line(ctx,[[tx,ty],[x,y]],ink,4);line(ctx,[[tx,ty],[x,y]],"#f7e8bd",2);poly(ctx,[[x+ux*5,y+uy*5],[x-ux*2-uy*3.5,y-uy*2+ux*3.5],[x-ux*2+uy*3.5,y-uy*2-ux*3.5]],c);
   for(const sd of [-1,1])line(ctx,[[tx,ty],[tx-ux*5+uy*4*sd,ty-uy*5-ux*4*sd]],"#fff6dc",1.6);}
  else if(f.kind==="root"){ // A thorny seed trailing a vine.
   const pts=[];for(let k=0;k<=6;k++){const t=Math.max(0,p-.3)+(p-Math.max(0,p-.3))*k/6,[px,py]=at(t),w=Math.sin(t*28)*3;pts.push([px-uy*w,py+ux*w]);}
   line(ctx,pts,ink,4);line(ctx,pts,"#6fa64c",2.4);crystal(ctx,x,y,5,leaf);}
  else { // Orbs: arcane, mirror, hex, heal, and the arcing splash fireball.
   const fire=f.kind==="splash",r=fire?6.5:4.6;
   for(let k=1;k<=5;k++){const t=Math.max(0,p-k*.045),[tx,ty]=at(t);ctx.globalAlpha=(1-k/6)*.55;oval(ctx,tx,ty,r*(1-k*.13),r*(1-k*.13),fire?(k<3?"#ffcf6b":"#8a7a6c"):c);}
   ctx.globalAlpha=1;glow(x,y,r*3.4,c,.9);oval(ctx,x,y,r+1.4,r+1.4,ink);oval(ctx,x,y,r,r,c);oval(ctx,x-r*.3,y-r*.3,r*.45,r*.45,"#fffbe9");
   if(f.kind==="hex"){ctx.strokeStyle="#2a1838";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,r*.55,0,Math.PI*2);ctx.stroke();}}
  if(p>.72){const v=(p-.72)/.28;glow(f.tx,f.ty,10+v*16,c,(1-v)*.9);ctx.globalAlpha=(1-v)*.8;for(let i=0;i<6;i++){const a=i*Math.PI/3+f.start;line(ctx,[[f.tx+Math.cos(a)*v*6,f.ty+Math.sin(a)*v*6],[f.tx+Math.cos(a)*(6+v*13),f.ty+Math.sin(a)*(6+v*13)]],c,2);}}
  ctx.restore();
 }
 // Status effects on enemies: a look that stays on the body for the whole duration, plus small icons over the health bar.
 // st = {burn, poison (stacks), freeze, curse}; t = time in ms.
 const STATUS={burn:"#ff8a3d",poison:"#79d158",freeze:"#9fe3ff",curse:"#b98af0"};
 function status(k,x,y,st,{flying=false,t=0,id=0}={}){const size=sizeOf(k),cy=y+(flying?-14:0),body=cy-size*.32,s=t/1000;
  if(st.curse){const rx=size*.38,ry=rx*.4,cx0=x,cy0=cy+3,r=s*1.4;ctx.globalAlpha=.85;ctx.strokeStyle=STATUS.curse;ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(cx0,cy0,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();for(let i=0;i<=3;i++){const a=r+i*Math.PI*2/3,px=cx0+Math.cos(a)*rx,py=cy0+Math.sin(a)*ry;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();ctx.globalAlpha=1;
   ctx.globalAlpha=.55+.25*Math.sin(s*4+id);ctx.fillStyle=STATUS.curse;ctx.font="700 "+Math.round(size*.28)+"px Georgia,serif";ctx.textAlign="center";ctx.fillText("✶",x,body-size*.42);ctx.textAlign="start";ctx.globalAlpha=1;}
  if(st.freeze){ctx.globalAlpha=.28;oval(ctx,x,body,size*.3,size*.4,"#c8f1ff");ctx.globalAlpha=.9;for(let i=0;i<3;i++){const a=i*2.1+id,px=x+Math.cos(a)*size*.27,py=body+Math.sin(a)*size*.3;poly(ctx,[[px,py-4],[px+2.5,py],[px,py+4],[px-2.5,py]],"#e9fbff","#7cc9ec");}ctx.globalAlpha=1;}
  if(st.poison){for(let i=0;i<Math.min(3,st.poison);i++){const ph=((s*1.2+i*.37+id*.13)%1),px=x+(i-1)*size*.16,py=body-size*.05+ph*size*.45;ctx.globalAlpha=1-ph*.7;ctx.fillStyle=STATUS.poison;ctx.strokeStyle="#1d4a16";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py-6);ctx.quadraticCurveTo(px+4.5,py+1,px,py+3.5);ctx.quadraticCurveTo(px-4.5,py+1,px,py-6);ctx.fill();ctx.stroke();}ctx.globalAlpha=.22;oval(ctx,x,body,size*.26,size*.34,STATUS.poison);ctx.globalAlpha=1;}
  if(st.burn){for(let i=0;i<3;i++){const fl=Math.sin(s*14+i*2+id)*.5+.5,px=x+(i-1)*size*.17,base=body+size*.12,h=size*(.22+.14*fl);ctx.globalAlpha=.9;poly(ctx,[[px-4,base],[px,base-h],[px+4,base]],"#ff7a2e",null);poly(ctx,[[px-2,base],[px,base-h*.6],[px+2,base]],"#ffd36b",null);}ctx.globalAlpha=1;}
  const keys=["burn","poison","freeze","curse"].filter(k=>st[k]);if(!keys.length)return;const iy=cy-size*barTop(k)-7,w=keys.length*10;
  keys.forEach((kk,i)=>{const ix=x-w/2+5+i*10;oval(ctx,ix,iy,4.6,4.6,"#0d1712",null);oval(ctx,ix,iy,3.6,3.6,STATUS[kk],null);ctx.fillStyle="#0d1712";ctx.strokeStyle="#0d1712";ctx.lineWidth=1;
   if(kk==="burn")poly(ctx,[[ix-1.6,iy+2],[ix,iy-2.4],[ix+1.6,iy+2]],"#0d1712",null);
   else if(kk==="poison"){ctx.font="800 6px system-ui";ctx.textAlign="center";ctx.fillText(String(Math.min(9,st.poison)),ix,iy+2.2);ctx.textAlign="start";}
   else if(kk==="freeze"){for(let j=0;j<3;j++){const a=j*Math.PI/3;ctx.beginPath();ctx.moveTo(ix-Math.cos(a)*2.4,iy-Math.sin(a)*2.4);ctx.lineTo(ix+Math.cos(a)*2.4,iy+Math.sin(a)*2.4);ctx.stroke();}}
   else {ctx.beginPath();ctx.arc(ix,iy,1.5,0,Math.PI*2);ctx.fill();}});}
 return {rubble,scaffold,setRes,status,tower,unit,pose,projectile,towerKeys:Object.keys(towerSchools),enemyKeys,allyKeys};
}
