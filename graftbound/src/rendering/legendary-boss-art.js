import {ADVANCED_BOSS_KEYS,advancedBossPose} from './advanced-boss-motion.js';
/** GRAFTBOUND v1.3: nine original, individually drawn premium boss identities.
 * Official MTG art consulted for silhouette/identity; no card illustration pixels copied.
 * All sheets share 112px 4-frame/10-row HD-2D format and lighting language. */
const W=112,F=4,VIEWS=2,ANIMS=5;
export const LEGENDARY_BOSS_KEYS=Object.freeze(['nemata','arasta','drakuseth','krenko','scarab','toxrill']);
export const LEGACY_BOSS_KEYS=Object.freeze(['thornmother','matron','unwritten']);
export const BOSS_PRINTINGS=Object.freeze({
 nemata:{set:'Planeshift',name:'Nemata, Grove Guardian',character:'Living tree guardian with branch-canopy limbs, roots and saproling growth'},
 arasta:{set:'Theros Beyond Death',name:'Arasta of the Endless Web',character:'Eight-legged spider titan with ornate green-violet body and enchanted webbing'},
 drakuseth:{set:'Core Set 2020',name:'Drakuseth, Maw of Flames',character:'Blackened red dragon, soaring leathery wings, coal-dark horned head, fiery jaws'},
 krenko:{set:'Magic 2013',name:'Krenko, Mob Boss',character:'Wiry goblin mob leader; pointed ears, layered gang attire and commanding arms'},
 scarab:{set:'Hour of Devastation',name:'The Scarab God',character:'Towering turquoise-black scarab-headed Egyptian-styled undead god in gold'},
 toxrill:{set:'Innistrad: Crimson Vow',name:'Toxrill, the Corrosive',character:'Massive purple slug Horror with corrosive slime, tentacles and fleshy ridges'},
});
const P={ink:'#202830',dark:'#33323c',bone:'#e6ceaa',ivory:'#fff1cd',iron:'#52616b',ironHi:'#aebec1',gold:'#cba96c',goldHi:'#f0da9a',amber:'#efaa54',fire:'#db5837',red:'#99433e',rose:'#c9787a',green:'#4c7959',greenHi:'#9abe75',wood:'#644c38',woodHi:'#aa8662',web:'#d2c8e2',violet:'#806494',teal:'#448f94',tealHi:'#90ddd6',slime:'#9ed77f'};
function dot(g,x,y,w=1,h=1,color=P.ink){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(g,x0,y0,x1,y1,color=P.ink,width=1){let n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));for(let i=0;i<=n;i++){let t=i/Math.max(n,1);dot(g,x0+(x1-x0)*t,y0+(y1-y0)*t,width,width,color)}}
// Material-aware cel shading: consistent top-left key light across every premium boss.
// Compute a small deterministic ramp per source swatch rather than flat-filling the
// surface. No random noise, no extra textures and no gameplay-state dependency.
const LIGHT_RAMP=new Map();
function lit(color,step){
 if(!/^#[0-9a-f]{6}$/i.test(color))return color;
 const key=color+':'+step; if(LIGHT_RAMP.has(key))return LIGHT_RAMP.get(key);
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 const values=rgb.map(v=>Math.max(0,Math.min(255,Math.round(step<0?v*(1+step):v+(255-v)*step))));
 const hex='#'+values.map(v=>v.toString(16).padStart(2,'0')).join('');LIGHT_RAMP.set(key,hex);return hex;
}
function ell(g,x,y,rx,ry,color=P.iron,edge=P.ink){for(let iy=Math.floor(y-ry);iy<=Math.ceil(y+ry);iy++)for(let ix=Math.floor(x-rx);ix<=Math.ceil(x+rx);ix++){
 const dx=(ix+.5-x)/rx,dy=(iy+.5-y)/ry,d=dx*dx+dy*dy;if(d>1)continue;
 const light=dx*-.43+dy*-.54+Math.sqrt(Math.max(0,1-d))*.12;
 const shade=light>.35?.26:light>.12?.12:light<-.4?-.30:light<-.12?-.14:0;
 dot(g,ix,iy,1,1,d>.92?edge:shade?lit(color,shade):color);
}}
function poly(g,a,color,edge=P.ink){let min=Math.floor(Math.min(...a.map(p=>p[1]))),max=Math.ceil(Math.max(...a.map(p=>p[1])));for(let y=min;y<=max;y++){
 let xs=[];for(let k=0;k<a.length;k++){let [x0,y0]=a[k],[x1,y1]=a[(k+1)%a.length];if(y+.5>=Math.min(y0,y1)&&y+.5<Math.max(y0,y1)&&y0!==y1)xs.push(x0+(y+.5-y0)*(x1-x0)/(y1-y0));}
 xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<xs[i+1];x++)dot(g,x,y,1,1,color);}
 if(edge)for(let i=0;i<a.length;i++)line(g,...a[i],...a[(i+1)%a.length],edge,1);
}
function branch(g,x,y,xx,yy,bark=P.wood){line(g,x+1,y+1,xx+1,yy+1,P.ink,6);line(g,x,y,xx,yy,bark,4);line(g,x-1,y,xx-1,yy,P.woodHi,1)}
function barb(g,x,y,xx,yy,color=P.bone){poly(g,[[x-2,y+2],[x+2,y+2],[xx,yy]],color);}
function eye(g,x,y,color=P.goldHi,back=false){if(back)return;dot(g,x-2,y-1,4,3,P.ink);dot(g,x,y,2,1,color)}
function petals(g,cx,cy,n,color){for(let i=0;i<n;i++){let a=i/n*Math.PI*2;let x=cx+Math.cos(a)*10,y=cy+Math.sin(a)*9;ell(g,x,y,5,7,i%2?color:P.greenHi);}}
function nemata(g,S){const {back,phase,walk,cast,attack,hot,hurt}=S;
 const m=S.motion,b=m?Math.round(m.sink*.15+(walk?m.rootStep*.4:0)):0;
 const bend=m?m.canopySway:0,reach=m?m.armReach:0;
 // Foot roots and weighty trunk; top canopy intentionally asymmetrical.
 for(let k=0;k<5;k++){let x=51+(k-2)*7+S.lean+(m?m.rootStep*(k%2?1:-1)*.45:0),y=91+b;
  const tipX=x+(k-2)*4;
  // Root stroke width and outline must stay inside the bottom atlas gutter.
  branch(g,55,74+b*.25,tipX,100+b);barb(g,tipX,101+b,tipX-5,103+b,P.woodHi);}
 ell(g,57,65+b,19,30,P.wood);poly(g,[[47,37+b],[65,37+b],[77,57+b],[70,89+b],[51,91+b],[40,72+b]],P.wood);
 for(let side of [-1,1]){let sh=57+side*13,ex=57+side*27;
  const elbowX=ex+side*(attack?reach*.65:cast?reach*.38:0);
  branch(g,sh,48+b,elbowX,72+b-(cast?reach*.3:0));
  const clawX=ex+side*(7+(attack?reach*.75:0));
  branch(g,elbowX,71+b-(cast?reach*.3:0),clawX,83+b-(cast?reach*.6:0));
  barb(g,clawX,83+b-(cast?reach*.6:0),clawX+side*8,78+b-(cast?reach*.7:0),P.wood);
  for(let j=0;j<3;j++)branch(g,ex+(j-1)*3,61+b,ex+side*(12+j*3),52+b+j*6);
 }
 ell(g,57,41+b,16,16,P.woodHi);for(let k=-3;k<=3;k++){let x=57+k*8,y=31+Math.abs(k)*3;
  branch(g,x,44+b,x+k*2+bend*(k/4),13+Math.abs(k)*2+b+bend*.65);
  ell(g,x+k*2+bend*(k/4),16+Math.abs(k)*2+b+bend*.65,9,8,k%2?P.green:P.greenHi);
 }
 for(let k=0;k<14;k++){let x=40+(k*11)%36,y=19+(k*13)%45+b;dot(g,x,y,3,2,k%3?P.woodHi:P.greenHi);}
 for(let k=-2;k<=2;k++)branch(g,57+k*3,47+b,57+k*4,82+b,k%2?P.woodHi:P.wood);
 if(!back){eye(g,51,38+b,P.goldHi);eye(g,63,38+b,P.goldHi);line(g,54,45+b,61,44+b,P.ink,2);}
 if(hot){for(let k=0;k<4;k++)ell(g,42+k*10,73+b,2,4,P.greenHi)}
 if(hurt)dot(g,49,44+b,17,2,P.wood);
 if(S.defeat){
  // Bark splinters and drooping branch tips describe a falling Treefolk.
  for(let i=0;i<4;i++){let x=38+i*13,y=83+b;
   barb(g,x,y,x+(i-2)*3,y+Math.min(8,m.sink),P.woodHi);}
 }
}
function arasta(g,S){const {back,phase,walk,cast,attack,hot,hurt}=S,m=S.motion;
 const b=m?Math.round(m.sink*.12+(walk?m.spiderStep*.25:0)):0;
 // Each of eight genuine articulated legs tracks body phase independently.
 for(let side of [-1,1])for(let i=0;i<4;i++){
  let x=56+side*(12+i%2*3),y=60+i*5+b;
  const step=m?(i%2?m.spiderStep:-m.spiderStep):0;
  let kneeX=56+side*(25+i*3+step*.45),kneeY=27+i*9+(walk?(phase+i)%3:0)+b;
  let tipX=56+side*(37+i*2+step*.9),tipY=92-i*4+b-Math.abs(step)*.4;
  branch(g,x,y,kneeX,kneeY,P.violet);line(g,kneeX,kneeY,tipX,tipY,P.ink,5);line(g,kneeX,kneeY,tipX,tipY,i%2?P.violet:P.greenHi,3);
  barb(g,tipX,tipY,tipX+side*3,tipY+6,P.web);
 }
 ell(g,57+(m?m.spiderLunge*.25:0),68+b,23+(m?m.abdomenBreath*.15:0),24+(m?m.abdomenBreath*.2:0),'#53405b');
 ell(g,57+(m?m.spiderLunge*.25:0),66+b,19+(m?m.abdomenBreath*.15:0),18,P.violet);
 for(let k=0;k<9;k++){let x=42+(k*7)%33,y=55+(k*11)%25+b;dot(g,x,y,3,3,k%3?P.web:P.rose)}
 // Thorax, enthroned head, patterned back carapace.
 const strikeShift=m?m.spiderLunge:0;
 ell(g,57+strikeShift,42+b,14,17,P.green);petals(g,57+strikeShift,36+b,7,P.violet);
 ell(g,57+strikeShift,38+b,10,12,'#94758d');
 if(!back){for(let k=-1;k<=1;k++){
  eye(g,57+strikeShift+k*6,36+b,P.goldHi);
  eye(g,57+strikeShift+k*4,42+b,P.rose);
 }}
 for(let i=0;i<5;i++){let x=37+i*9,y=54+(i%2)*4+b;
  line(g,x,y,57,78+b,P.web,1);}
 if(cast||attack){for(let k=-3;k<=3;k++){
  const tensile=m?m.webTension:0;
  line(g,56+strikeShift,38+b,56+k*6,25+k*2+b-tensile*.4,P.web,1);
  line(g,56+k*6,25+k*2+b-tensile*.4,56+k*8,24+k*4+b-tensile*.65,P.web,1);
 }}
 if(hot)for(let k=0;k<7;k++){let x=35+(k*7)%43,y=21+(k*5)%42;dot(g,x,y,2,2,P.web);}
 if(hurt)line(g,48,38+b,66,38+b,P.ink,3);
 if(S.defeat){
  // Spinnerets droop as the eight rooted legs collapse around the abdomen.
  for(let side of [-1,1])for(let i=0;i<3;i++){
   line(g,57+side*(9+i*4),87+b,57+side*(14+i*6),94+b+(m?m.sink*.22:0),P.web,1);
  }
 }
}
function drakuseth(g,S){const {back,phase,walk,cast,attack,hot,hurt}=S,m=S.motion;
 const b=m?Math.round(m.sink*.12+(walk?m.tailFlex*.18:0)):0;
 const flap=m?m.wingLift*.5:phase%2?4:0;
 const neck=m?m.neckThrust:0,jaw=m?m.jawOpen:0;
 // Swept red-charcoal membrane wings; wing roots connected to shoulder.
 for(let side of [-1,1]){
  const x=55+side*10;
  const tipY=Math.max(7,6+flap);
  poly(g,[[x,57+b],[x+side*16,Math.max(12,20-flap)],[x+side*34,tipY],[x+side*35,26],[x+side*26,36],[x+side*36,46],[x+side*16,67+b]],'#8b332c');
  line(g,x,57+b,x+side*34,tipY+2,P.ink,4);line(g,x,57+b,x+side*35,26,P.amber,2);
  for(let i=1;i<4;i++)line(g,x,56+b,x+side*(17+i*5),17+i*10,P.red,2);
 }
 for(let k=0;k<11;k++){let x=47-k*2.6,y=75+k*1.8+b+(m?m.tailFlex*k*.035:0);
  ell(g,x,y,6-k*.28,5-k*.14,k%2?'#5f302d':'#813b30');
  if(k%2===0)barb(g,x,y-3,x-4,y-8,P.bone);}
 // Muscular dragon haunches and talons.
 for(let side of [-1,1]){
  ell(g,56+side*16,77+b,10,14,'#70332d');branch(g,56+side*17,81+b,56+side*20,95+b,'#99473b');
  for(let j=-1;j<=1;j++)barb(g,56+side*20+j*3,96+b,56+side*22+j*4,102+b,P.bone);
 }
 ell(g,59,61+b,23,27,'#75372e');ell(g,60,60+b,17,22,'#b75c3b');
 for(let j=0;j<7;j++){let x=47+j*4,y=56+j%2*5+b;ell(g,x,y,3,4,j%2?P.red:P.amber);}
 // Distinct long neck and horned jaw, original black-red Drakuseth form.
 branch(g,60,48+b,70+neck*.45,26+b-neck*.15,'#71332d');
 ell(g,72+neck,27+b-neck*.15,13,11,'#51353a');
 poly(g,[[68+neck,28+b],[87+neck,26+b],[96+neck,32+b],[87+neck,40+b],[73+neck,37+b]],'#ae5839');
 poly(g,[[77+neck,37+b],[93+neck,35+b+jaw*.4],[89+neck,41+b+jaw],[76+neck,41+b+jaw]],'#392c34');
 for(let i=0;i<4;i++)barb(g,79+neck+i*4,38+b+jaw*.15,79+neck+i*4,41+b+jaw*.6,P.ivory);
 for(let i=-2;i<=2;i++)barb(g,66+i*4,18+b,64+i*6,7+b,P.bone);
 if(!back){eye(g,81+neck,27+b,P.goldHi);dot(g,88+neck,30+b,2,2,P.ink)}
 for(let i=0;i<7;i++)barb(g,47+i*4,42+b+(i%2)*4,46+i*4,35+b+(i%2)*3,P.bone);
 if(attack||cast){for(let i=0;i<8;i++){
   const spread=m?m.flameBloom:0;
   // Flame stays inside the atlas cell at maximum breath extension.
   let x=Math.min(102,93+neck+i*(.9+spread*.04)),y=38+Math.sin(i*.9+phase)*3+b+jaw*.18;
   ell(g,x,y,3+(i%3),3+(i%2),i%2?P.amber:P.fire);
 }}
 if(hurt)dot(g,75,33+b,10,3,P.ink);
 if(S.defeat){
  // Wing membranes sag and extinguished embers scatter as the dragon falls.
  for(let i=0;i<4;i++)ell(g,53+i*8,92+b,2,2,i%2?P.dark:P.red);
 }
}
function krenko(g,S){const {back,phase,walk,cast,attack,hot,hurt}=S,m=S.motion;
 const b=m?Math.round(m.sink*.12+(walk?Math.abs(m.goblinStep)*.3:0)):0;
 const step=m?m.goblinStep:walk?phase%2?3:-3:0;
 const headBob=m?m.goblinHead:0;
 // Krenko remains a nimble goblin-sized commander, never an inflated troll.
 for(let side of [-1,1]){
  const footX=56+side*9+side*step*.7,footY=94+b-Math.abs(step)*.4;
  branch(g,56+side*7,77+b,footX,footY,'#5f513c');
  ell(g,footX+side*2,footY+2,8,3,P.dark);
 }
 poly(g,[[44,43+b],[66,43+b],[75,79+b],[39,79+b]],'#873f37');
 poly(g,[[45,49+b],[68,49+b],[70,74+b],[42,74+b]],'#b96b49');
 for(let i=0;i<6;i++){dot(g,45+i*4,60+b,2,2,P.gold);dot(g,46+i*4,72+b,3,2,P.dark);}
 line(g,42,75+b,73,75+b,P.ink,4);dot(g,53,74+b,8,5,P.gold);dot(g,55,75+b,4,3,P.wood);
 for(let side of [-1,1]){
  const lift=m?(side<0?m.goblinCommand:m.goblinBlade):attack?4:0;
  const handX=56+side*(24+lift*.5),handY=73+b-lift*.65;
  branch(g,56+side*16,50+b,handX,handY,'#907c58');
  ell(g,handX,handY+1,5,5,'#8d8059');
 }
 // Recognizable pointed Goblin ears, wrinkled face, nose, sharp teeth, crooked cap.
 ell(g,56,34+b+headBob,17,17,'#84915a');
 poly(g,[[42,32+b+headBob],[21,23+b+headBob],[36,41+b+headBob]],'#989b5f');
 poly(g,[[70,32+b+headBob],[91,21+b+headBob],[76,41+b+headBob]],'#989b5f');
 if(!back){eye(g,47,33+b+headBob,P.ivory);eye(g,65,33+b+headBob,P.ivory);
  poly(g,[[56,35+b+headBob],[45,47+b+headBob],[66,42+b+headBob]],'#b4ab7d');
  for(let i=0;i<5;i++)dot(g,49+i*3,46+b+headBob,2,2,P.ivory);}
 poly(g,[[39,28+b+headBob],[45,18+b+headBob],[64,15+b+headBob],[75,25+b+headBob],
  [70,32+b+headBob],[41,31+b+headBob]],'#793e3b');
 for(let i=0;i<4;i++)dot(g,45+i*7,22+b+headBob,2,1,P.gold);
 // Knife is anchored to the active sword hand, not floating at world position.
 const blade=m?m.goblinBlade:0;
 const grip=[80+blade*.5,73+b-blade*.65],knifeTip=[Math.min(97,88+blade*.42),Math.max(13,37+b-blade*.75)];
 line(g,grip[0],grip[1],knifeTip[0],knifeTip[1],P.dark,4);
 poly(g,[[knifeTip[0],knifeTip[1]],[knifeTip[0]-2,knifeTip[1]-12],
   [knifeTip[0]+5,knifeTip[1]-14],[knifeTip[0]+6,knifeTip[1]-3]],P.ironHi);
 if(cast||attack){for(let i=0;i<3;i++)
  dot(g,73+i*8+(m?m.goblinCommand*.35:0),19+i*5,3,3,P.amber);}
 if(hurt)line(g,45,32+b+headBob,67,32+b+headBob,P.dark,3);
 if(S.defeat){for(let i=-2;i<=2;i++)ell(g,56+i*5,92+b,2.3+(m?m.sink*.12:0),2,P.wood);}
}
function scarab(g,S){const {back,phase,walk,cast,attack,hot,hurt}=S,m=S.motion;
 const b=m?Math.round(m.sink*.12+(walk?Math.abs(m.scarabStep)*.25:0)):0;
 const cape=m?m.scarabCape:0,arm=m?m.scarabArm:0;
 for(let side of [-1,1]){
  // Cape/wings and insect ceremonial shoulder plates.
  poly(g,[[55+side*8,42+b],[55+side*(30+cape*.45),17+b-cape*.45],
    [55+side*(33+cape*.35),75+b],[55+side*21,87+b]],'#1e555d');
  for(let i=0;i<5;i++){line(g,55+side*9,45+b,55+side*(20+i*3+cape*.25),40+i*7+b,P.teal,1);}
  const armX=56+side*(21+arm*.4),armY=77+b-arm*.65;
  branch(g,56+side*14,51+b,armX,armY,P.iron);
  ell(g,armX,armY+3,6,7,P.gold);
  const footX=56+side*(8+(m?m.scarabStep*.4:0));
  branch(g,56+side*7,81+b,footX,99+b-(m?Math.abs(m.scarabStep)*.25:0),P.dark);
  ell(g,footX+side,101+b,8,4,P.gold);
 }
 poly(g,[[43,40+b],[69,40+b],[78,66+b],[67,91+b],[45,91+b],[35,66+b]],'#223d4a');
 poly(g,[[46,45+b],[66,45+b],[69,71+b],[60,85+b],[48,73+b]],P.teal);
 for(let i=0;i<7;i++){let x=44+(i*11)%26,y=53+(i*9)%29+b;dot(g,x,y,2,3,i%2?P.gold:P.tealHi);}
 poly(g,[[36,48+b],[55,37+b],[74,47+b],[69,55+b],[43,57+b]],P.gold);
 for(let k=0;k<6;k++){let x=39+k*7;dot(g,x,50+b,3,2,P.goldHi);}
 // Beetle head with distinct curved sacred antennae and blue eyes.
 ell(g,56,30+b,14,16,'#153f4d');ell(g,56,25+b,9,12,P.teal);
 for(let side of [-1,1]){line(g,56+side*9,25+b,56+side*21,9+b,P.gold,4);line(g,56+side*21,9+b,56+side*25,18+b,P.goldHi,2);}
 if(!back){eye(g,49,31+b,P.tealHi);eye(g,63,31+b,P.tealHi);dot(g,54,39+b,5,3,P.gold);}
 for(let i=0;i<4;i++){
  let y=65+i*5+b;line(g,47,y,65,y,P.gold,1);
 }
 if(cast||attack)for(let i=0;i<8;i++){
  const pulse=m?m.scarabMagic:0;
  let x=35+(i*9)%45+(i%2?pulse*.4:0),y=23+(i*11)%43-pulse*.65;
  dot(g,x,y,3,3,i%2?P.tealHi:P.goldHi);
 }
 if(hurt)dot(g,47,32+b,18,2,P.ink);
 if(S.defeat){
  // Broken ceremonial ribbons and cooling divine embers, not an upright idle.
  for(let i=0;i<6;i++){const x=33+i*8;
   line(g,x,88+b,x+((i%2)?3:-3),93+b+(m?m.sink*.25:0),P.tealHi,2);}
 }
}
function toxrill(g,S){const {back,phase,walk,cast,attack,hot,hurt}=S;
 const m=S.motion,b=m?Math.round(m.mantleWave*.25+m.sink*.14):0;
 const shift=m?m.slugAdvance+m.mantleWave*.45:0,sink=m?m.sink:0;
 // Slug anatomy: no legs, no arms, continuous foot and massive ridged mantle.
 ell(g,54+shift,91+b,40,13,'#493450');
 poly(g,[[14+shift,91+b],[22+shift,82+b],[85+shift,80+b],[101+shift,93+b],[88+shift,103+b],[20+shift,103+b]],'#6b4b78');
 for(let i=0;i<8;i++){let x=24+i*10+shift,y=97+b+(i%2);ell(g,x,y,6,3,i%2?P.violet:'#9c70a0');}
 ell(g,53+shift,67+b+sink*.28,36,29-sink*.65,'#4b385b');
 ell(g,57+shift,62+b+sink*.28,31,26-sink*.6,'#806093');
 for(let i=0;i<8;i++){let x=31+i*7+shift,y=48+(i%3)*7+b;
  poly(g,[[x-6,y+8],[x-2,y-5],[x+4,y+1],[x+7,y+11]],i%2?'#77538a':'#a56f9c');
 }
 // Raised, stalking slug head with multiple feelers, corrosive fangs.
 ell(g,79+shift,48+b+sink*.35,19,22-sink*.32,'#6b4f7e');
 poly(g,[[69+shift,48+b],[93+shift,44+b],[101+shift,53+b],[89+shift,66+b],[69+shift,63+b]],'#97759a');
 for(let i=0;i<4;i++){
  const x=73+i*7+shift,y=42-(i%2)*3+b;
  const tipX=x+(i-1)*3+(m?m.feelerBend*.36:0),tipY=17+(i%2)*6+b+(m?m.feelerBend*.65:0);
  line(g,x,y,tipX,tipY,P.ink,6);
  line(g,x,y,tipX,tipY,'#9778a2',4);
  ell(g,tipX,tipY-1,4,4,P.slime);
  eye(g,tipX,tipY-1,P.ink,back);
 }
 for(let i=0;i<8;i++){let x=28+(i*9)%70+shift,y=68+(i*5)%25+b;ell(g,x,y,2,3,i%3?P.slime:P.teal);}
 if(cast||attack){for(let i=0;i<8;i++)ell(g,64+i*5,87+i%4*3+b,3,4,i%2?P.slime:P.teal);}
 if(hot)for(let i=0;i<6;i++)dot(g,29+(i*17)%59,105+b,5,2,P.slime);
 if(hurt)line(g,76,54+b,97,54+b,P.ink,3);
 if(S.defeat){
  // Final, distinct slime compression, not a generic upright damage pose.
  for(let i=0;i<7;i++){const x=22+i*11,y=99+(i%2)*2;
   ell(g,x,y,2.1+(m.sink*.18),2,P.slime);}
 }
}
function thornmother(g,S){
 const {back,walk,cast,attack,hurt}=S,m=S.motion;
 const b=m?Math.round(m.sink*.1+(walk?Math.abs(m.thornRoot)*.22:0)):walk?S.phase%2:0;
 const root=m?m.thornRoot:0,lash=m?m.thornLash:0,crown=m?m.thornCrown:0;
 // Living Treefolk sovereign: all seven roots emerge from the same trunk.
 for(let i=-3;i<=3;i++){
  const x=56+i*5,tipX=x+i*4+(i%2?root:-root)*.45,tipY=99+b-Math.abs(root)*.25;
  branch(g,x,84+b,tipX,tipY,i%2?P.wood:P.dark);
  barb(g,tipX,tipY,tipX+i*.2,Math.min(103,tipY+2),P.woodHi);
 }
 poly(g,[[42,37+b],[70,37+b],[82,83+b],[69,91+b],[43,91+b],[29,81+b]],'#473d3c');
 ell(g,56,64+b,17,23,'#6c5242');
 for(let side of [-1,1]){
  const x=56+side*13,handX=x+side*(29+lash*.45),handY=70+b-lash*.52;
  branch(g,x,48+b,handX,handY,P.wood);
  for(let i=0;i<4;i++)
   barb(g,x+side*(3+i*5),49+i*5+b,handX+side*(i*.9),handY-8-i*2,P.bone);
 }
 // Branches and antler-thorns flex with the canopy, not as loose decorations.
 for(let k=0;k<9;k++){
  const x=32+k*6,tx=x+(k-4)*2+crown*(k-4)*.18;
  barb(g,x,43+b,tx,16+(k%3)*3+b+crown*.3,k%3?P.greenHi:P.bone);
 }
 ell(g,56,33+b+crown*.3,11,14,'#5d493d');
 if(!back){eye(g,51,33+b+crown*.3,P.greenHi);eye(g,61,33+b+crown*.3,P.greenHi);}
 const pulse=m?m.heartwoodPulse:0;
 ell(g,56,65+b,7+pulse*.15,10+pulse*.15,P.rose);
 ell(g,56,66+b,4+pulse*.18,7+pulse*.2,P.goldHi);
 for(let k=0;k<15;k++){
  const x=31+(k*11)%51,y=24+(k*13)%61+b+crown*.12;
  dot(g,x,y,2,3,k%3?P.green:P.greenHi);
 }
 if(cast||attack)for(let k=0;k<4;k++)
  line(g,43+k*9,89+b,36+k*11,71+b-(m?m.heartwoodPulse*.4:0),P.greenHi,2);
 if(S.defeat)for(let k=0;k<4;k++)
  line(g,38+k*11,96+b,37+k*11,100+b+(m?m.sink*.35:0),P.woodHi,2);
 if(hurt)line(g,48,63+b,65,63+b,P.dark,2);
}
function matron(g,S){
 const {back,phase,walk,cast,attack}=S,m=S.motion;
 const b=m?Math.round(m.sink*.15+(walk?Math.abs(m.broodStride)*.2:0)):walk?phase%2:0;
 const step=m?m.broodStride:0,claw=m?m.clawSwipe:0;
 const heat=m?m.moltenPulse:0,tilt=m?m.hornTilt:0;
 // Brood queen is a heavy furnace-insect with two grounded feet and long claws.
 for(let side of [-1,1]){
  const x=56+side*14,footX=x+side*(21+step*.35),footY=91+b-Math.abs(step)*.3;
  branch(g,x,65+b,footX,footY,'#713632');ell(g,footX+side,footY+5,9,5,P.iron);
  const handX=x+side*(22+claw*.3),handY=66+b-claw*.6;
  branch(g,x,48+b,handX,handY,'#a35438');
  for(let j=0;j<3;j++)
   barb(g,handX-side*(4-j*3),handY,handX+side*(3+j*4),handY+2+j,P.bone);
 }
 ell(g,56,75+b,27,26-Math.min(5,(m?m.sink:0)*.35),'#543438');
 ell(g,56,76+b,21+heat*.18,20+heat*.12,'#9d4630');
 for(let i=0;i<11;i++){
  const x=37+(i*11)%37,y=63+(i*7)%27+b;
  ell(g,x,y,3+heat*.08,4+heat*.12,i%3?P.amber:P.fire);
 }
 ell(g,56,39+b+tilt*.22,16,20,'#582f34');
 poly(g,[[43,36+b+tilt*.22],[55,14+b+tilt*.25],[68,36+b+tilt*.22]],'#8e4035');
 for(let i=-2;i<=2;i++)
  barb(g,56+i*6,27+b+tilt*.2,56+i*9,7+(i%2)*4+b+tilt*.25,P.bone);
 ell(g,56,42+b+tilt*.2,13,11,'#af6040');
 if(!back){eye(g,50,40+b+tilt*.2,P.amber);eye(g,62,40+b+tilt*.2,P.amber);}
 if(cast||attack)for(let i=0;i<8;i++){
  const x=43+i*4,y=70+Math.sin(i+phase)*3+b-heat*.3;
  ell(g,x,y,3+heat*.1,5+heat*.12,i%2?P.fire:P.amber);
 }
 if(S.defeat)for(let i=0;i<5;i++)ell(g,37+i*10,97+b,3+heat*.12,2,P.iron);
}
function unwritten(g,S){
 const {back,walk,cast,attack}=S,m=S.motion;
 const b=m?Math.round(m.voidFloat*.45):walk?S.phase%2:0;
 const flutter=m?m.scrollFlutter:0,arm=m?m.voidArm:0,glow=m?m.glyphBurst:0;
 // Negative-space mirror entity, one mask with attached scroll-cape and limbs.
 for(let side of [-1,1]){
  poly(g,[[56+side*8,35+b],[56+side*(30+flutter*.35),10+b-flutter*.3],
    [56+side*(33+flutter*.25),75+b],[56+side*17,88+b]],'#2c344d');
  for(let i=0;i<5;i++)
   line(g,56+side*9,45+b,56+side*(20+i*3+flutter*.2),40+i*7+b,P.teal,1);
  const handX=56+side*(20+arm*.35),handY=80+b-arm*.65;
  branch(g,56+side*12,46+b,handX,handY,P.iron);
  for(let i=0;i<4;i++){
   const x=handX+side*(i*.8),y=handY-4+i*3;
   dot(g,x,y,3,4,P.web);
  }
 }
 poly(g,[[44,39+b],[68,39+b],[80,91+b],[34,91+b]],'#35364b');
 for(let i=0;i<7;i++){
  const x=38+i*6,y=51+(i%2)*5+b;
  line(g,x,y,x+5+flutter*.1,y+1,i%2?P.web:P.violet,1);
 }
 const headY=31+b-(m?m.maskBend||0:0);
 ell(g,56,headY,16,20,'#292e43');ell(g,56,headY-3,13,16,'#d0c6d3');
 if(!back){
  ell(g,56,headY-4,7,9,'#3b3553');
  dot(g,52,headY-9,8,2,P.web);dot(g,54,headY,4,4,P.violet);
 }
 for(let i=0;i<8;i++){
  const x=31+(i*11)%52+glow*((i%2)?-.3:.3);
  const y=17+(i*13)%74+b-glow*.5;
  dot(g,x,y,2+glow*.1,2+glow*.1,i%2?P.violet:P.web);
 }
 if(attack||cast)for(let i=0;i<6;i++)
  line(g,33+i*8,55+b,43+i*5,39+b-glow*.5,P.web,1);
 if(S.defeat)for(let i=0;i<4;i++)
  line(g,40+i*10,86+b,42+i*9,90+b+(m?m.sink*.4:0),P.violet,1.5);
}
const DRAW={nemata,arasta,drakuseth,krenko,scarab,toxrill,thornmother,matron,unwritten};
function sheet(name){
 const advanced=ADVANCED_BOSS_KEYS.includes(name),rows=advanced?ANIMS+1:ANIMS;
 const c=document.createElement('canvas');c.width=W*F;c.height=W*VIEWS*rows;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 for(let v=0;v<VIEWS;v++)for(let a=0;a<rows;a++)for(let f=0;f<F;f++){
  g.save();g.translate(f*W,(v*rows+a)*W);
  DRAW[name](g,{back:v===1,phase:f,walk:a===1,attack:a===2,cast:a===3,hurt:a===4,
    defeat:a===5,hot:a===2||a===3,lean:a===2?(-2+f):0,
    motion:advanced?advancedBossPose(name,a,f,v===1):null});
  g.restore();
 }
 return c;
}
/** Install AFTER generated generic identities so dedicated art is authoritative. */
export function installLegendaryBosses(images,manifest){
 if(typeof document==='undefined')return;
 for(const name of Object.keys(DRAW)){
  const key=LEGENDARY_BOSS_KEYS.includes(name)?'mtg_'+name:name;
  const advanced=ADVANCED_BOSS_KEYS.includes(name);
  images[key]=sheet(name);
  manifest.sprites[key]={w:W,h:W,pivotY:W-6,artWidth:W-12,bleedX:4,generated:true,premium:true,identity:name,
    ...(advanced?{
      views:['front','back'],cols:F,artPack:'advanced-boss-motion-v1',
      anims:{
        idle:{row:0,frames:4,fps:5,loop:true},
        walk:{row:1,frames:4,fps:9,loop:true},
        attack:{row:2,frames:4,fps:11,loop:false},
        cast:{row:3,frames:4,fps:9,loop:false},
        hurt:{row:4,frames:4,fps:9,loop:false},
        defeat:{row:5,frames:4,fps:7,loop:false}
      }
    }:{}),
    qualityStatus:advanced?'species-specific boss motion study; final painted asset quality pending':undefined
  };
 }
}
