// Original tower sprites. Models are drawn from the pad's center, with light from the upper left.
const outline = "#172722";
const palettes = {
 W:{light:"#eee2bc",body:"#b9b29b",shade:"#655e56",metal:"#c19448",accent:"#ffe0a0",glow:"#fff4cb"},
 U:{light:"#b5d2dc",body:"#668b9b",shade:"#324c68",metal:"#b49360",accent:"#7bd9ed",glow:"#d9fcff"},
 B:{light:"#a89aaf",body:"#6a5a79",shade:"#3b304c",metal:"#8a728f",accent:"#d09bed",glow:"#f8d5fb"},
 R:{light:"#c4a38a",body:"#96705f",shade:"#493c3d",metal:"#b9754d",accent:"#ff9b5c",glow:"#ffe6a4"},
 G:{light:"#bbbc85",body:"#789166",shade:"#385444",metal:"#8f7350",accent:"#a4d674",glow:"#e4f8bd"}
};

function painter(ctx, color) {
 const {light,body,shade,metal,accent,glow}=color;

 function stroke(ink,width) {
  ctx.strokeStyle=ink;
  ctx.lineWidth=width;
  ctx.lineJoin="round";
  ctx.lineCap="round";
  ctx.stroke();
 }
 function shape(points,fill,edge=outline,width=1.35) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for(const point of points.slice(1))ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
  if(edge)stroke(edge,width);
 }
 function line(points,ink,width=1.4) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for(const point of points.slice(1))ctx.lineTo(...point);
  stroke(ink,width);
 }
 function ellipse(x,y,rx,ry,fill,edge=outline,width=1.3) {
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(edge)stroke(edge,width);
 }
 function ramp(x0,y0,x1,y1,...stops) {
  const paint=ctx.createLinearGradient(x0,y0,x1,y1);
  stops.forEach((stop,i)=>paint.addColorStop(i/(stops.length-1),stop));
  return paint;
 }
 function stone(x,y,height,width,crest=true) {
  const right=x+width, bottom=y+height;
  shape([[x,bottom],[x,y],[right-4,y],[right,y+3],[right,bottom]],ramp(x,y,right,y,light,body,shade));
  for(let row=y+6,i=0;row<bottom-2;row+=6,i++){
   const seam=x+width*(i%2?.63:.35);
   line([[x+1,row],[right-1,row]],shade+"8c",.8);
   line([[seam,row],[seam-1,row-5]],shade+"8c",.8);
   line([[x+1,row+1],[seam-1,row+1]],light+"9c",.7);
  }
  if(crest)shape([[x-2,y-1],[x+width-1,y-1],[right+2,y+2],[right+2,y+5],[x-2,y+5]],ramp(x,y,right,y,light,body,shade));
 }
 function arch(x,y,w,h,fill="#27322e") {
  const half=w/2;
  shape([[x-half,y],[x-half,y-h*.56],[x,y-h],[x+half,y-h*.56],[x+half,y]],metal);
  const inner=half-2;
  shape([[x-inner,y],[x-inner,y-h*.52],[x,y-h+3],[x+inner,y-h*.52],[x+inner,y]],fill,null);
 }
 function gem(x,y,w,h,tint=accent,tilt=0) {
  shape([[x+tilt,y-h],[x+w,y-2],[x+w*.62,y+h*.68],[x-w*.45,y+h],[x-w,y]],ramp(x-w,y-h,x+w,y+h,glow,tint,shade));
  shape([[x+tilt,y-h],[x+w,y-2],[x+2,y+1],[x-w*.45,y+h]],tint+"aa",null);
  line([[x+tilt,y-h+2],[x-w+2,y],[x-w*.43,y+h-2]],glow,.9);
 }
 function band(x,y,w,h) {
  shape([[x-w,y],[x+w-2,y],[x+w,y+h/2],[x+w-2,y+h],[x-w,y+h]],ramp(x-w,y,x+w,y+h,light,metal,shade));
 }
 function pennant(x,y,w,h,mirror=false) {
  const end=x+(mirror?-w:w);
  line([[x,y+17],[x,y-2]],metal,2.2);
  ellipse(x,y-2,1.8,1.8,glow,outline,.85);
  shape([[x,y],[end,y+2],[end-(mirror?-4:4),y+h*.58],[end,y+h],[x,y+h-1]],ramp(x,y,end,y+h,shade,body,accent));
  line([[x+(mirror?-2:2),y+2],[end-(mirror?-2:2),y+3]],glow,.8);
 }
 function crest(x,y,r,fill=accent) {
  shape([[x,y-r],[x+r*.52,y-r*.3],[x+r,y],[x+r*.5,y+r*.3],[x,y+r],[x-r*.5,y+r*.3],[x-r,y],[x-r*.5,y-r*.3]],fill,outline,.95);
  ellipse(x,y,1.45,1.45,glow,null);
 }
 function rays(x,y,r,count) {
  for(let i=0;i<count;i++){
   const angle=i*Math.PI*2/count,dx=Math.cos(angle),dy=Math.sin(angle);
   line([[x+dx*(r-3),y+dy*(r-3)],[x+dx*r,y+dy*r]],accent,1.15);
  }
 }
 return {ctx,color,shape,line,ellipse,ramp,stone,arch,gem,band,pennant,crest,rays};
}

function legion(p,tier,branch) {
 const {shape,line,ellipse,stone,arch,pennant,crest,band,color}=p;
 const {light,shade,accent,glow}=color;
 stone(-23,-23,29,42);
 const towers=branch==="A"?[-23,20]:[-18,15];
 for(const x of towers){
  const y=tier>=3&&branch==="A"?-38:-29;
  stone(x-6,y,7-y,13);
  band(x,y-3,8,5);
  for(const offset of [-6,0,6])shape([[x+offset-2,y-7],[x+offset+2,y-7],[x+offset+2,y-1],[x+offset-2,y-1]],light);
  arch(x,y+16,5,9,shade);
 }
 const fortTop=tier>=2?-35:-30;
 band(0,fortTop,16,6);
 arch(0,7,19,24,"#403b32");
 for(const x of [-5,0,5])line([[x,-10],[x,6]],"#c4a067",1.15);
 shape([[-9,-23],[9,-23],[8,-16],[0,-10],[-8,-16]],shade);
 crest(0,-18,5,accent);
 pennant(6,fortTop-15,15,10);
 if(branch==="B"){pennant(-19,-47,14,10,true);if(tier===4)pennant(21,-46,12,10);}
 if(branch==="A"&&tier===4){
  ellipse(0,-31,8,6,accent);crest(0,-31,6,glow);
 }
}

function chapel(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,arch,band,rays,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-19,-29,36,39);
 if(branch==="A"){
  for(const x of [-22,22]){
   stone(x-5,-23,29,11);
   shape([[x-7,-22],[x,-43],[x+7,-22]],ramp(x-6,-37,x+7,-22,light,metal,shade));
   arch(x,-5,5,11,accent);
  }
 }
 shape([[-20,-29],[-7,-57],[7,-57],[20,-29],[13,-31],[0,-41],[-13,-31]],ramp(-14,-48,19,-27,accent,metal,shade));
 line([[-17,-30],[-6,-55],[0,-57]],glow,1.2);
 shape([[-13,-32],[0,-50],[13,-32],[12,4],[-12,4]],ramp(-13,-40,12,4,light,body,shade));
 ellipse(0,-33,7.7,8.1,metal);
 ellipse(0,-33,5.7,6.1,glow);
 crest(0,-33,5,accent);
 if(tier>=2)for(const x of [-8,8])line([[x,-23],[x,-5]],metal,1.5);
 arch(0,5,13,23,branch==="A"?"#f5c677":"#604c39");
 band(0,6,16,4);
 if(branch==="B"||tier===4){
  const r=tier===4?12:9;
  ellipse(0,-54,r,r*.8,null,accent,1.6);
  rays(0,-54,r+3,8);
  crest(0,-54,5,glow);
 }else crest(0,-57,4,accent);
}

function judgment(p,tier,branch) {
 const {shape,line,ellipse,ramp,arch,band,crest,gem,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 ellipse(0,0,23,9,shade);
 band(0,-5,19,8);
 shape([[-13,-1],[-12,-34],[0,-54],[11,-40],[15,-1]],ramp(-12,-47,15,1,light,body,shade));
 shape([[0,-54],[9,-42],[10,-4],[1,-7]],shade+"96",null);
 if(tier>=2)for(const x of [-1,1])shape([[x*11,-20],[x*20,-2],[x*10,1]],ramp(x*11,-21,x*20,-1,light,metal,shade));
 arch(0,1,7,20,shade);
 crest(0,-31,6,accent);
 const spears=branch==="B"?(tier===4?[-13,0,13]:[-9,9]):[0];
 for(const x of spears){
  const short=Math.abs(x)>0?5:0;
  line([[x,-33],[x,-63+short]],metal,3);
  gem(x,-59+short,branch==="A"?6:4,branch==="A"?10:7,accent,-1);
  shape([[x-8,-43],[x,-39],[x+8,-43],[x+6,-38],[x,-35],[x-6,-38]],metal);
 }
 if(branch==="A"&&tier===4){
  for(const x of [-15,15])line([[x,-8],[x,-28],[x*.7,-37]],glow,1.7);
 }
}

function arcanum(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,arch,band,gem,crest,color}=p;
 const {light,shade,metal,accent,glow}=color;
 stone(-20,-17,24,40);
 arch(0,7,12,18,"#245063");
 band(0,-19,23,7);
 ellipse(0,-19,18,6,"#385a69");
 const spread=branch==="A"?23:18;
 for(const x of [-spread,spread]){
  gem(x,-33,branch==="A"?7:5,branch==="A"?16:11,accent,Math.sign(x)*4);
  if(tier===4&&branch==="A")gem(x*.58,-23,5,11,glow);
 }
 if(branch==="B"){
  ellipse(0,-38,24,tier===4?15:10,null,metal,tier===4?2.5:1.8);
  if(tier===4)ellipse(0,-38,19,20,null,light,1.4);
 }
 if(tier>=2)for(const x of [-12,12])gem(x,-22,4,8,light,Math.sign(x)*2);
 gem(0,-40,tier===4?12:10,22,accent,-3);
 line([[-10,-13],[0,-7],[10,-13]],glow,1.1);
 crest(0,-7,2.5,accent);
}

function library(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,arch,band,pennant,crest,rays,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-25,-23,30,50);
 for(const x of [-18,-6,6,18])arch(x,2,8,18,branch==="A"?accent:"#483d34");
 shape([[-27,-23],[-20,-32],[-11,-32],[-4,-43],[7,-43],[14,-32],[22,-32],[27,-23]],ramp(-27,-32,27,-23,light,shade,"#26374a"));
 line([[-24,-24],[-18,-30],[-10,-30],[-4,-41]],accent+"9f",1.2);
 band(0,-22,25,4);
 if(tier>=2)for(const x of [-22,22])crest(x,-27,3,accent);
 if(branch==="B"){
  const r=tier===4?13:10;
  ellipse(0,-36,r,r,metal);
  ellipse(0,-36,r-2,r-2,shade,light);
  rays(0,-36,r-1,12);
  line([[0,-43],[0,-36],[5,-40]],glow,1.6);
 }else{
  shape([[-14,-46],[0,-41],[14,-46],[13,-34],[0,-30],[-13,-34]],metal);
  shape([[-14,-48],[-6,-48],[0,-43],[7,-48],[14,-48],[12,-36],[0,-33],[-12,-36]],ramp(-14,-48,14,-33,glow,"#d9ceac",light));
  line([[0,-43],[0,-33]],shade,1.05);
  for(const y of [-44,-41,-38])line([[-10,y],[-3,y+2]],body,.8);
  if(tier===4){pennant(-20,-50,9,11,true);pennant(20,-50,9,11);crest(0,-54,4);}
 }
}

function mirror(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,band,gem,crest,color}=p;
 const {light,shade,metal,accent,glow}=color;
 stone(-20,-13,20,40);
 band(0,-9,22,5);
 if(branch==="A"){
  for(const x of [-19,19]){
   ellipse(x,-21,tier===4?10:8,17,metal);
   ellipse(x,-21,tier===4?7:5,13,ramp(x-8,-31,x+8,-13,glow,accent,shade));
  }
 }
 ellipse(0,-30,18,25,ramp(-19,-48,19,-10,light,metal,shade));
 ellipse(0,-30,14,21,ramp(-13,-49,14,-11,glow,accent,"#4f869e",shade),shade,1.9);
 shape([[-10,-26],[-3,-48],[4,-49],[-9,-14]],glow+"b8",null);
 shape([[1,-24],[12,-39],[13,-34],[7,-21]],light+"bc",null);
 if(branch==="B"){
  for(const x of [-19,19])gem(x,-32,tier===4?6:4,12,accent);
  crest(0,-12,4,glow);
 }
 if(tier>=2)for(const x of [-13,13])crest(x,-17,2.8,accent);
 gem(0,-58,branch==="B"&&tier===4?8:5,8,glow);
 line([[-13,-10],[-9,-19]],metal,2.2);line([[13,-10],[9,-19]],metal,2.2);
}

function necropolis(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,arch,band,gem,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-22,-23,30,44);
 for(const x of [-19,19]){
  const top=branch==="B"?-42:-32;
  shape([[x-7,7],[x-6,top+7],[x,top-5],[x+6,top+7],[x+7,7]],ramp(x-7,top,x+7,5,body,shade));
  arch(x,-6,7,16,accent);
 }
 if(branch==="A"){
  for(const x of [-28,28]){
   line([[x,5],[x,-34]],light,2);
   crest(x,-35,4,glow);
   shape([[x-4,-25],[x+4,-25],[x+4,-11],[x,-14],[x-4,-11]],shade,metal);
  }
 }
 arch(0,7,29,43,"#342637");
 shape([[-10,-25],[-5,-30],[5,-30],[10,-25],[9,-17],[5,-14],[4,-9],[-4,-9],[-5,-14],[-9,-17]],ramp(-9,-29,9,-12,"#eee2cc","#aa9d98",metal));
 for(const x of [-4,4])ellipse(x,-21,3,2.6,shade);
 for(const x of [-2,0,2])line([[x,-13],[x,-10]],shade,.85);
 const high=branch==="B"&&tier===4?-54:-45;
 gem(0,high,tier>=3?8:6,11,accent);
 if(branch==="B"&&tier===4)for(const x of [-11,11])gem(x,-45,3,7,accent);
 band(0,6,15,4);
 if(tier>=2)for(const x of [-12,12])gem(x,-4,2.8,5,accent);
}

function foundry(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,band,gem,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-23,-15,23,46);
 const chimneys=branch==="A"?[-15,15]:[15];
 for(const x of chimneys){
  const top=tier>=3?-44:-39;
  shape([[x-6,-14],[x-4,top],[x+4,top],[x+6,-14]],ramp(x-6,-40,x+6,-14,light,body,shade));
  band(x,top-3,7,5);
  ellipse(x,top-3,4,2,"#1f2530");
 }
 shape([[-20,-20],[20,-20],[16,2],[8,7],[-8,7],[-16,2]],ramp(-20,-18,20,5,light,metal,shade));
 ellipse(0,-22,21,10,body);
 ellipse(0,-23,16,6,ramp(-16,-28,16,-19,shade,accent,glow,body));
 for(const x of [-15,-8,8,15])ellipse(x,-9,1.6,1.6,light,null);
 if(branch==="A"){
  const height=tier===4?-45:-38;
  gem(0,height,7,14,accent);
  line([[-17,-20],[-12,height],[12,height],[17,-20]],metal,1.7);
 }else if(branch==="B"){
  for(const x of [-18,18]){
   shape([[x-4,-20],[x-2,-42],[x+4,-49],[x+1,-35],[x+5,-20]],shade,metal);
   if(tier===4)gem(x,-43,3.5,7,accent);
  }
 }
 if(tier>=2)line([[16,-12],[24,-9],[24,-2]],metal,3.1);
 ellipse(0,-4,7,6,shade);
 ellipse(0,-4,4,3.7,accent);
}

function hex(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,arch,gem,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-15,-17,24,30);
 arch(0,7,11,23,shade);
 shape([[-14,-10],[-13,-35],[0,-54],[12,-39],[15,-11],[6,-15],[0,-9],[-7,-15]],ramp(-13,-40,15,-10,body,shade));
 for(const x of [-18,18]){
  const height=branch==="A"?-46:-33;
  shape([[x-4,-14],[x-6,height+8],[x,height],[x+5,height+8],[x+4,-14]],ramp(x-5,height,x+4,-14,light,shade));
  if(branch==="A"&&tier===4)arch(x,-19,6,20,accent);
 }
 shape([[-16,-29],[0,-41],[16,-29],[11,-23],[0,-20],[-11,-23]],metal);
 shape([[-12,-29],[0,-34],[12,-29],[0,-24]],glow,shade);
 ellipse(0,-29,2.5,4.3,shade,null);
 line([[-7,-17],[0,-13],[7,-17]],accent,1.15);
 if(tier>=2)for(const x of [-9,9])crest(x,-2,2.4,accent);
 if(branch==="B"){
  const y=tier===4?-51:-47;
  ellipse(0,y,9,9,null,metal,1.6);
  gem(0,y,4,8,accent);
  if(tier===4)crest(0,-64,4);
 }else crest(0,-43,3);
}

function pyre(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,band,gem,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-25,-12,19,45);
 ellipse(-8,-11,18,8,shade);
 for(const x of [-20,9]){
  ellipse(x,-5,8.5,8.5,metal);
  ellipse(x,-5,5.5,5.5,shade);
  ellipse(x,-5,2.3,2.3,light);
 }
 if(tier>=2)line([[-20,-5],[-7,1],[9,-5]],metal,2);
 const muzzle=branch==="B"?33:26;
 const depth=branch==="B"&&tier===4?10:7;
 shape([[-19,-32],[muzzle-7,-34],[muzzle,-29],[muzzle,-18],[muzzle-6,-16],[-19,-19]],ramp(0,-34,0,-16,light,body,shade));
 for(const x of [-13,-1,11,muzzle-7]){
  shape([[x-3,-33],[x+1,-33],[x+3,-18],[x,-17]],ramp(x,-32,x,-18,metal,shade));
 }
 ellipse(muzzle,-25,5.7,depth,metal);
 ellipse(muzzle+.7,-25,3.5,depth-2,shade);
 ellipse(muzzle+1,-25,2,depth*.36,branch==="B"?"#2b282a":accent);
 if(branch==="A"){
  shape([[-14,-29],[-18,-45],[-10,-41],[-8,-54],[-2,-44],[4,-48],[6,-31]],ramp(-10,-53,-5,-29,glow,accent,metal));
  if(tier===4)gem(-6,-43,5,11,glow);
 }else if(branch==="B"){
  band(-9,-39,10,6);
  line([[-19,-12],[-22,-38],[-14,-36]],metal,2.2);
  if(tier===4)line([[2,-11],[17,-18]],accent,2);
 }
}

function goblin(p,tier,branch) {
 const {shape,line,ellipse,ramp,arch,pennant,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 shape([[-25,6],[-20,-15],[-16,-24],[-6,-34],[7,-34],[20,-19],[26,6]],ramp(-23,-23,25,0,light,body,shade));
 shape([[-23,-12],[-18,-25],[-8,-34],[2,-41],[6,-35],[19,-26],[22,-14],[4,-18],[-5,-16]],ramp(-22,-25,22,-15,accent,metal,"#5e3834"));
 for(const x of [-18,-12,14,20])line([[x,-16],[x*1.13,5]],metal,1.6);
 line([[-22,-14],[-5,-17],[4,-18],[22,-14]],glow+"a4",1.35);
 arch(2,6,19,24,"#271e1b");
 pennant(16,-38,12,10);
 if(tier>=2)for(const x of [-1,1])line([[2+x*11,4],[2+x*14,-12],[2+x*10,-18]],light,1.35);
 if(branch==="A"){
  pennant(-15,-45,13,11,true);
  if(tier===4){pennant(3,-54,14,11);crest(2,-17,4,glow);}
 }else if(branch==="B"){
  for(const [x,y] of [[-20,1],[18,2],[27,6]]){
   ellipse(x,y-4,5.5,8,body);
   line([[x-5,y-5],[x+5,y-5]],shade,2);
   line([[x,y-11],[x+3,y-15]],light,1);
   if(tier===4)ellipse(x+3,y-15,1.6,1.6,glow,null);
  }
 }
}

function storm(p,tier,branch) {
 const {shape,line,ellipse,ramp,stone,band,gem,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 stone(-16,-12,19,32);
 shape([[-14,-12],[-9,-44],[8,-44],[14,-12]],ramp(-14,-36,14,-12,light,body,shade));
 line([[-12,-12],[-21,-5],[-19,-24],[-11,-29]],metal,2.7);
 line([[12,-12],[21,-5],[19,-24],[11,-29]],metal,2.7);
 if(tier>=2)for(const x of [-19,19])crest(x,-19,2.6,accent);
 for(const y of [-16,-24,-32,-40])ellipse(0,y,12,3,ramp(-12,y-3,12,y+3,glow,metal,shade));
 const core=branch==="B"&&tier===4?12:8;
 gem(0,-49,core,13,accent);
 const coils=branch==="A"?[-18,18]:[-9,9];
 for(const x of coils){
  const y=branch==="A"?-49:-58;
  line([[x*.65,-15],[x,-27],[x,y]],shade,3.5);
  band(x,y,4.5,4);
  if(tier===4)crest(x,y-3,3.5,glow);
  if(branch==="A")line([[x,y],[x*.74,y-5],[x*.42,y+1],[0,y-2]],accent,1.25);
 }
}

function grove(p,tier,branch) {
 const {shape,line,ellipse,ramp,gem,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 ellipse(0,3,26,8,shade);
 const crown=branch==="A"?-51:-44;
 const size=branch==="A"&&tier===4?1.12:1;
 for(const [x,y,r] of [[-17,-27,12],[-11,-40,13],[6,crown,15],[17,-37,14],[22,-23,10],[-2,-26,20]]){
  const wide=r*size;
  ellipse(x,y,wide,r*.76,ramp(x-wide,y-r,x+wide,y+r,light,body,shade));
  for(const [dx,dy] of [[-.36,-.3],[.18,-.42],[.43,-.13]])ellipse(x+dx*r,y+dy*r,r*.22,r*.14,accent+"72",null);
 }
 shape([[-23,7],[-12,1],[-6,-13],[-7,-24],[-13,-31],[-8,-35],[-1,-27],[6,-38],[13,-36],[5,-23],[6,-9],[17,1],[23,7],[10,5],[2,1],[-5,7]],ramp(-15,-29,12,8,light,metal,"#45362b"));
 line([[-13,4],[-6,-3],[-2,-18],[-6,-29]],light,1.6);
 line([[13,4],[5,-3],[2,-19],[7,-32]],shade,1.45);
 for(const [x,y,r] of [[-14,-28,4],[5,crown+9,6],[15,-19,4]])gem(x,y,r,r*1.6,accent);
 if(tier>=2)for(const [x,y] of [[-21,-7],[21,-11]])gem(x,y,2.8,5,glow);
 if(branch==="A"&&tier===4){
  line([[-29,8],[-19,7],[-13,2],[-4,-1],[7,2],[15,6],[28,8]],accent,1.55);
 }else if(branch==="B"){
  ellipse(0,-20,26,tier===4?11:8,null,accent,1.45);
  for(const x of tier===4?[-23,-11,11,23]:[-23,23])crest(x,-21,3.5,glow);
 }
}

function beast(p,tier,branch) {
 const {shape,line,ellipse,ramp,gem,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 const horn=branch==="B"?-51:-33;
 shape([[-30,7],[-24,-15],[-16,-28],[0,-34],[16,-28],[25,-14],[30,7]],ramp(-27,-26,28,6,body,shade));
 for(const x of [-1,1]){
  shape([[x*24,-13],[x*16,horn],[x*10,horn+11],[x*9,-22],[x*17,-12]],ramp(x*10,horn,x*22,-10,glow,light,metal));
  line([[x*14,horn+12],[x*18,horn+16]],shade,.9);
  line([[x*16,horn+21],[x*21,horn+25]],shade,.9);
 }
 shape([[-17,7],[-15,-8],[-9,-15],[9,-15],[15,-8],[17,7]],"#232b25",light);
 for(const x of [-1,1]){
  shape([[x*13,6],[x*17,-7],[x*10,-3]],glow,shade);
  ellipse(x*5,-5,2,1.4,accent,null);
 }
 if(tier>=2)for(const x of [-20,20])line([[x,3],[x*.9,-4],[x,-10]],light,1.25);
 if(branch==="A"){
  for(const x of [-24,24])gem(x,-10,4,10,accent);
  if(tier===4)crest(0,-28,6,glow);
 }else if(branch==="B"&&tier===4){
  shape([[-12,-25],[-8,-34],[0,-39],[8,-34],[12,-25],[0,-16]],light);
  crest(0,-31,5,accent);
 }
}

function thorn(p,tier,branch) {
 const {shape,line,ellipse,ramp,gem,crest,color}=p;
 const {light,body,shade,metal,accent,glow}=color;
 ellipse(0,4,23,7,shade);
 for(const side of [-1,1]){
  const x=side;
  shape([[x*27,7],[x*13,-1],[x*7,-18],[x*14,-30],[x*8,-45],[0,-58],[x*6,-39],[x*3,-32],[x*3,-18],[x*8,4]],ramp(x*26,-4,x*3,-42,shade,body,light));
  line([[x*23,4],[x*13,-4],[x*10,-18],[x*12,-28]],accent,1);
 }
 for(const [x,y] of [[-13,-15],[12,-20],[-8,-34],[5,-47]]){
  const side=x<0?-1:1;
  shape([[x,y+6],[x+side*12,y-9],[x+side*8,y+1],[x,y+8]],ramp(x,y+7,x+side*9,y-8,shade,body,accent));
  line([[x,y+6],[x+side*8,y-4]],light,1);
 }
 if(branch==="A"){
  for(const x of [-21,21]){
   line([[x,5],[x,-9],[x*.77,-20],[x,-32]],metal,3.8);
   gem(x,-32,3.5,7,accent);
  }
  if(tier===4)crest(0,-55,5,glow);
 }else if(branch==="B"){
  ellipse(0,-31,tier===4?10:7,10,shade,light);
  gem(0,-31,5,8,"#d6dc6b");
 }
 if(tier>=2)for(const x of [-12,12])gem(x,-12,2.65,6,accent,Math.sign(x)*3);
 gem(0,-48,6,11,accent);
}

const designs={
 legion:["W",legion],chapel:["W",chapel],judgment:["W",judgment],
 arcanum:["U",arcanum],library:["U",library],mirror:["U",mirror],
 necropolis:["B",necropolis],foundry:["B",foundry],hex:["B",hex],
 pyre:["R",pyre],goblin:["R",goblin],storm:["R",storm],
 grove:["G",grove],beast:["G",beast],thorn:["G",thorn]
};

export const towerArtSchools=Object.fromEntries(Object.entries(designs).map(([kind,[school]])=>[kind,school]));

export function paintTowerModel(ctx,kind,tier,branch) {
 const [school,draw]=designs[kind];
 const p=painter(ctx,palettes[school]);
 const {color,shape,line,ellipse,ramp,crest}=p;
 shape([[-31,4],[-22,-5],[20,-5],[30,3],[26,13],[-25,13]],ramp(-29,-5,29,13,"#8f9885","#59675b","#34463b"));
 line([[-28,6],[-22,10],[22,10],[27,6]],"#a4a68e",1.25);
 for(const x of [-23,23])ellipse(x,8,1.7,1.35,color.metal,outline,.7);
 ctx.save();
 ctx.scale(1+(tier-1)*.065,1+(tier-1)*.09);
 draw(p,tier,branch);
 ctx.restore();
 for(let i=0;i<tier;i++)crest((i-(tier-1)/2)*6,11.4,2.65,color.accent);
}
