// Small, localized cast animations drawn in battlefield coordinates.
const schools={
 W:["#fff5c8","#ecbf71","#a97145"],U:["#edfaff","#7cdcf1","#547bbd"],
 B:["#f6e2ff","#c692e0","#775b99"],R:["#fff4c6","#ff985a","#b44c49"],
 G:["#f3ffd1","#a2db73","#5c9f68"],C:["#fbf3da","#c9b394","#897b8d"]
};

export const spellStyles={
 legion:["gate",38],ward:["ward",32],twins:["echo",44],rally:["gate",48],valor:["radiance",42],
 inquiry:["glyph",39],echo:["echo",40],freeze:["ice",64],reflection:["gate",48],reset:["clock",35],
 raise:["wraith",37],offering:["funnel",40],recall:["wraith",47],funeral:["glyph",39],deathmark:["omen",60],
 meteor:["meteor",79],flame:["embers",67],bloodrush:["blade",43],lightning:["lightning",75],cascade:["sparks",65],
 wild:["sprout",39],root:["roots",68],verdant:["echo",48],awaken:["clock",38],bloom:["roots",59],
 prism:["prism",43],resonance:["glyph",42],matrix:["blade",40],blade:["radiance",38],forge:["sparks",46]
};

export const commanderStyles={
 krenko:["gate",72],talrand:["squall",106],omnath:["sprout",70],edgar:["wraith",82],
 lightpaws:["ward",95],meren:["wraith",93],teysa:["radiance",94],korvold:["funnel",95],
 atraxa:["prism",118],toxrill:["venom",103],torbran:["embers",110],urza:["clock",76],
 heliod:["radiance",122],wilhelt:["gate",79],kaalia:["squall",124],urdragon:["dragon",135]
};

export const towerStyles={
 legion:["ward","gate"],chapel:["radiance","blade"],judgment:["blade","sparks"],
 arcanum:["ice","glyph"],library:["gate","clock"],mirror:["echo","prism"],
 necropolis:["gate","wraith"],foundry:["funnel","omen"],hex:["venom","omen"],
 pyre:["embers","meteor"],goblin:["gate","sparks"],storm:["lightning","blade"],
 grove:["sprout","glyph"],beast:["blade","radiance"],thorn:["roots","venom"]
};

const tau=Math.PI*2;
const wave=(value,seed)=>Math.sin(value+seed*2.39);

export function drawCast(ctx,effect,age,calm=false){
 const {kind,school,x,y,radius:limit,seed=0,major=false,emblem}=effect;
 const [white,tint,shade]=schools[school]||schools.C;
 const t=Math.max(0,Math.min(age,1));
 const ease=1-(1-t)**3;
 const r=limit*(calm?.72:.24+.76*ease);
 const alpha=Math.min(1,t*10)*(1-t)*(1-t*.22);
 ctx.save();
 ctx.translate(x,y);
 ctx.lineCap="round";ctx.lineJoin="round";

 function path(draw,color=tint,width=2,opacity=1) {
  ctx.beginPath();draw();
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha*opacity;ctx.stroke();
 }
 function line(points,color=tint,width=2,opacity=1){
  path(()=>{
   ctx.moveTo(...points[0]);
   for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
  },color,width,opacity);
 }
 function ellipse(ex,ey,rx,ry,color=tint,width=2,opacity=1){
  path(()=>ctx.ellipse(ex,ey,rx,ry,0,0,tau),color,width,opacity);
 }
 function light(ex,ey,rx,ry,color,opacity){
  ctx.beginPath();ctx.ellipse(ex,ey,rx,ry,0,0,tau);
  ctx.fillStyle=color;ctx.globalAlpha=alpha*opacity;ctx.fill();
 }
 function jewel(jx,jy,s,color=tint,opacity=1){
  ctx.beginPath();ctx.moveTo(jx-s*.55,jy);ctx.lineTo(jx,jy-s);ctx.lineTo(jx+s*.55,jy);ctx.lineTo(jx,jy+s);
  ctx.closePath();ctx.fillStyle=color;ctx.globalAlpha=alpha*opacity;ctx.fill();
 }
 function orbit(count,distance,vertical,shift,step){
  for(let i=0;i<count;i++){
   const theta=i/count*tau+shift;
   step(Math.cos(theta)*distance,Math.sin(theta)*distance*vertical,theta,i);
  }
 }

 // Every cast carries a localized outline. The existing target and warning graphics remain readable behind it.
 if(calm){
  ellipse(0,0,r,r*.42,shade,4,.65);
  ellipse(0,0,r,r*.42,tint,1.6);
  jewel(0,-6,6,white);
  ctx.restore();
  return;
 }
 if(major){
  // A fast amber-white center and a longer, low-opacity school-colored glow.
  const flash=Math.max(0,1-t*3.2);
  light(0,0,r*.95,r*.39,tint,.07+flash*.09);
  light(0,-3,r*.64,r*.31,tint,.09+flash*.11);
  light(0,-4,r*.22,r*.2,white,flash*.28);
 }
 ellipse(0,1,r,r*.43,"#111918",4,.45);
 ellipse(0,0,r,r*.43,tint,1.6,.83);

 switch(kind){
  case "ice":
   orbit(6,r*.7,.43,t*.22,(sx,sy,theta,i)=>{
    const h=11+limit*.27*(.6+.4*wave(i,seed));
    line([[sx-4,sy],[sx+Math.cos(theta)*5,sy-h],[sx+5,sy-3],[sx-4,sy]],shade,5,.68);
    line([[sx-4,sy],[sx+Math.cos(theta)*5,sy-h],[sx+5,sy-3],[sx-4,sy]],tint,2.4);
    jewel(sx+Math.cos(theta)*5,sy-h,3.8,white);
   });
   break;
  case "meteor":{
   const flight=Math.max(0,1-t*3.3);
   const mx=r*.8+72*flight,my=-22-86*flight;
   path(()=>{ctx.moveTo(mx+35,my-46);ctx.quadraticCurveTo(mx+17,my-26,mx,my);},shade,12,.65);
   path(()=>{ctx.moveTo(mx+27,my-36);ctx.quadraticCurveTo(mx+9,my-18,mx,my);},tint,6);
   jewel(mx,my,9,white);
   orbit(9,r*.78,.46,-t,(sx,sy,theta,i)=>jewel(sx,sy-t*16,3+(i%3),i%2?tint:white));
   break;
  }
  case "embers":
  case "dragon":
   orbit(kind==="dragon"?8:6,r*.72,.47,seed+t*.7,(sx,sy,theta,i)=>{
    const height=(kind==="dragon"?20:13)+r*.19+wave(i,seed)*5;
    path(()=>{
     ctx.moveTo(sx-6,sy+3);
     ctx.quadraticCurveTo(sx-11,sy-height*.58,sx+7+Math.cos(theta)*4,sy-height);
     ctx.quadraticCurveTo(sx+3,sy-height*.36,sx+10,sy+2);
    },i%2?tint:shade,4.6,.9);
    line([[sx-1,sy],[sx+3,sy-height*.54],[sx+5,sy-height*.69]],white,1.4);
    jewel(sx+9,sy-height-8,4,tint,.85);
   });
   break;
  case "lightning":
   orbit(5,r,.55,t*.25,(sx,sy,theta,i)=>{
    const points=[[0,-18],[sx*.31+wave(t*22+i,seed)*6,sy*.4-10],
     [sx*.52-wave(t*31+i,seed)*5,sy*.46-19],[sx*.78,sy*.7-5],[sx,sy]];
    line(points,shade,6,.77);line(points,tint,3);line(points,white,1.15);
    jewel(sx,sy,4.2,white,.9);
   });
   break;
  case "roots":
  case "sprout":
  case "venom":
   orbit(kind==="roots"?7:5,r*.88,.54,seed*.45+t*.65,(sx,sy,theta,i)=>{
    const px=sx*.38,py=sy*.38;
    path(()=>{ctx.moveTo(px,py+3);ctx.quadraticCurveTo(px,py-13,sx,sy-18-i%3*4);},shade,5.1,.84);
    path(()=>{ctx.moveTo(px,py+3);ctx.quadraticCurveTo(px,py-13,sx,sy-18-i%3*4);},tint,2.2);
    jewel(sx-4,sy-9,4,kind==="venom"?"#d8f4a4":tint);
    jewel(sx,sy-19-i%3*4,kind==="sprout"?6:4,white);
   });
   break;
  case "ward":
  case "radiance":
   path(()=>{ctx.moveTo(-r*.72,0);ctx.quadraticCurveTo(-r*.58,-r*.88,0,-r*.77);ctx.quadraticCurveTo(r*.58,-r*.88,r*.72,0);},shade,7,.7);
   path(()=>{ctx.moveTo(-r*.72,0);ctx.quadraticCurveTo(-r*.58,-r*.88,0,-r*.77);ctx.quadraticCurveTo(r*.58,-r*.88,r*.72,0);},white,2.6);
   orbit(kind==="radiance"?12:7,r*.81,.45,seed+t*.27,(sx,sy,theta,i)=>{
    line([[sx*.88,sy*.85-9],[sx,sy-17-i%2*4]],tint,1.8,.9);
    jewel(sx,sy-20-i%2*4,kind==="radiance"?5:3.6,white);
   });
   break;
  case "gate":
  case "wraith":
  case "funnel":
   for(const side of [-1,1]){
    const sx=side*r*.38,h=r*(kind==="funnel"?1:.71);
    path(()=>{
     ctx.moveTo(sx,-3);
     ctx.quadraticCurveTo(side*r*.58,-h*.7,kind==="funnel"?0:sx*.45,-h);
     ctx.quadraticCurveTo(side*r*.18,-h*.72,side*r*.06,-h*.35);
    },shade,7,.64);
    path(()=>{
     ctx.moveTo(sx,-3);
     ctx.quadraticCurveTo(side*r*.58,-h*.7,kind==="funnel"?0:sx*.45,-h);
     ctx.quadraticCurveTo(side*r*.18,-h*.72,side*r*.06,-h*.35);
    },tint,2.6);
   }
   orbit(7,r*.76,.46,seed+t,(sx,sy,theta,i)=>jewel(sx,sy-10-(i%3)*9-t*14,3.6,i%2?white:tint));
   break;
  case "squall":
   for(const side of [-1,1])for(let k=0;k<3;k++){
    const sx=r*(.35+k*.24)*side,sy=-r*(.24+k*.13);
    path(()=>{
     ctx.moveTo(side*r*.15,-r*.08);
     ctx.quadraticCurveTo(sx*.9,sy*.56,sx,sy);
     ctx.lineTo(sx-side*r*.38,sy+r*.1);
    },k===0?white:tint,2.9,.88);
    jewel(sx,sy,4.7,white);
   }
   break;
  case "blade":
  case "sparks":
   orbit(kind==="blade"?5:9,r*.76,.48,seed+t*2,(sx,sy,theta,i)=>{
    const wing=(i%2?1:-1)*r*.22;
    path(()=>{ctx.moveTo(sx*.56,sy-8);ctx.quadraticCurveTo(sx+wing,sy-24,sx,sy-39);},tint,3,.9);
    jewel(sx,sy-39,4,white);
   });
   break;
  default:
   ellipse(0,-9,r*.83,r*.41,shade,5,.7);
   ellipse(0,-9,r*.83,r*.41,tint,1.6);
   orbit(kind==="clock"?12:8,r*.72,.51,seed+t*(kind==="clock"?1.7:.7),(sx,sy,theta,i)=>{
    const color=kind==="prism"?schools["WUBRG"[i%5]][1]:i%2?tint:white;
    const px=sx*.81,py=sy*.8-16;
    if(kind==="echo")ellipse(sx,sy-12,8-i%3,5,color,1.3,.9);
    else line([[px,py],[sx,sy-14],[sx+Math.cos(theta)*4,sy-20]],color,1.5);
    jewel(sx,sy-21,4.4,color);
   });
   if(kind==="omen"){
    line([[-r*.36,-r*.32],[0,-r*.63],[r*.36,-r*.32],[0,-r*.22],[-r*.36,-r*.32]],white,2.4);
    jewel(0,-r*.35,r*.09,tint);
   }
 }
 if(major&&emblem){
  const cy=-16-ease*12,unit=Math.min(22,r*.23);
  switch(emblem){
   case "heliod":
    ellipse(0,cy,unit,unit,white,2.3);
    orbit(9,unit*1.34,1,t*.5,(sx,sy)=>line([[sx*.81,cy+sy*.81],[sx,cy+sy]],white,1.7));
    light(0,cy,unit*.83,unit*.83,tint,.23);
    break;
   case "urdragon":
    for(const side of [-1,1])path(()=>{
     ctx.moveTo(0,cy+unit*.58);
     ctx.quadraticCurveTo(side*unit*.91,cy-unit*.85,side*unit*1.35,cy-unit*.68);
     ctx.lineTo(side*unit*.83,cy+unit*.32);
    },white,2.3);
    jewel(0,cy,unit*.8,tint);
    break;
   case "talrand":
   case "kaalia":
    orbit(3,unit*1.17,.3,t*.48,(sx,sy,theta,i)=>{
     const py=cy+sy-i*5;
     line([[sx-8,py-4],[sx,py+3],[sx+8,py-4]],emblem==="kaalia"?schools["WBR"[i]][1]:white,2.4);
    });
    break;
   case "krenko":
   case "wilhelt":
    for(const side of [-1,1]){
     const sx=side*unit*.64;
     line([[sx,cy+unit*.7],[sx,cy-unit*.74],[sx+8,cy-unit*.5],[sx,cy-unit*.23]],white,2);
    }
    break;
   case "edgar":
   case "meren":
    orbit(4,unit,.65,-t*.9,(sx,sy,theta,i)=>{
     if(emblem==="edgar")line([[sx-6,cy+sy],[sx-3,cy+sy-4],[sx,cy+sy],[sx+3,cy+sy-4],[sx+6,cy+sy]],white,1.7);
     else jewel(sx,cy+sy-i*2,4,white);
    });
    break;
   case "korvold":
    line([[-unit,cy-unit*.38],[-unit*.4,cy+3],[0,cy-unit*.65],[unit*.4,cy+3],[unit,cy-unit*.38],[unit*.66,cy+unit*.45],[-unit*.66,cy+unit*.45],[-unit,cy-unit*.38]],white,2);
    break;
   case "teysa":
    for(const side of [-1,1])path(()=>{
     ctx.moveTo(side*unit,cy+8);ctx.quadraticCurveTo(side*unit*.7,cy-unit*.63,-side*unit,cy-unit*.83);
    },white,2.2);
    jewel(0,cy-7,6,tint);
    break;
   case "lightpaws":
    line([[-unit*.65,cy-unit*.5],[-unit*.61,cy+unit*.14],[0,cy+unit*.65],[unit*.61,cy+unit*.14],[unit*.65,cy-unit*.5],[0,cy-unit*.7],[-unit*.65,cy-unit*.5]],white,2.4);
    break;
   case "omnath":
    jewel(0,cy,unit*.75,white);
    jewel(0,cy,unit*.45,tint);
    break;
   case "toxrill":
    orbit(5,unit,.6,seed+t*.35,(sx,sy,theta,i)=>light(sx,cy+sy-i*2,4,5,"#d6f194",.73));
    break;
   case "torbran":
    line([[-unit*.75,cy-unit*.58],[unit*.75,cy-unit*.58],[unit*.75,cy-unit*.16],[unit*.13,cy-unit*.16],[unit*.13,cy+unit*.57],[-unit*.11,cy+unit*.57],[-unit*.11,cy-unit*.16],[-unit*.75,cy-unit*.16],[-unit*.75,cy-unit*.58]],white,2.3);
    break;
   case "urza":
    ellipse(0,cy,unit*.8,unit*.8,white,2);
    line([[0,cy-unit*.55],[0,cy],[unit*.58,cy+unit*.12]],white,2.35);
    break;
   case "atraxa":
    orbit(5,unit,.65,-t,(sx,sy,theta,i)=>jewel(sx,cy+sy,4,schools["WUBRG"[i]][1]));
    break;
   default:
    jewel(0,cy,unit*.48,white);
  }
 }
 ctx.restore();
}
