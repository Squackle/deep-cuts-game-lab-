import {canvasPainter,boot,blade} from "./actor-paint.mjs";

const ivory=["#f6ecd0","#c5a86f","#8c7758"], linen=["#e6d8bd","#a49988","#544b5b"];
const red=["#d79677","#a64845","#513642"], blue=["#accee0","#4c829e","#314460"];
const leaf=["#c5da92","#7f9c69","#405d48"], black=["#d1afd4","#80658b","#473d58"];
const iron=["#d1d3c4","#839291","#425260"], violet=["#debae2","#9a6da9","#59456a"];
const bronze=["#edbf85","#a77557","#624b48"];

function helm(p,x,y,colors,trim,{crown=false,horns=false,goblin=false}={}) {
 const {form,plate,eye,trace}=p;
 if(horns)for(const side of [-1,1])plate([[x+side*3,y-6],[x+side*10,y-15],[x+side*9,y-8],[x+side*7,y-3]],ivory);
 if(goblin)form([[x-4,y-5],[x-14,y-7],[x-10,y+2],[x-5,y+2]],"#a1a86a");
 plate([[x-7,y+1],[x-7,y-6],[x,y-10],[x+6,y-8],[x+10,y-1],[x+6,y+5],[x-1,y+7]],colors);
 trace([[x+2,y-2],[x+9,y-2]],colors[2],2.5);
 eye(x+7,y-2,trim);
 if(crown)form([[x-7,y-7],[x-9,y-14],[x-3,y-11],[x,y-16],[x+4,y-11],[x+9,y-13],[x+7,y-7]],trim);
}

function cloak(p,colors,spread=17) {
 const {plate,trace}=p;
 plate([[-8,-24],[-spread,-21],[-spread-2,4],[-8,1],[0,6],[5,4],[8,-19]],colors);
 trace([[-spread+1,-18],[-spread+1,-1],[-9,-2]],colors[0],1.55);
}

function swordBearer(p,look) {
 const {form,plate,trace,oval,limb,spark}=p;
 const {colors,trim,face=colors,shield,cape,weapon="sword",crown,horns,goblin,bulk=1}=look;
 const width=10*bulk;
 if(cape)cloak(p,cape);
 boot(p,[[-5,-10],[-7,1],[-8,5]],colors[2],colors[1],4.4*bulk);
 boot(p,[[5,-10],[7,-1],[8,5]],colors[2],colors[1],4.4*bulk);
 plate([[-width,-24],[-5,-28],[7,-26],[width,-21],[width-2,-8],[-width+2,-8]],colors);
 plate([[-width-4,-24],[-width,-30],[-5,-28],[-5,-21],[-width-2,-20]],colors);
 trace([[-width+2,-14],[0,-11],[width-2,-13]],trim,1.4);
 spark(0,-19,3,trim);
 helm(p,0,-30,face,trim,{crown,horns,goblin});
 limb([[6,-22],[12,-16],[16,-18]],colors[1],4.3*bulk,colors[0]);
 if(weapon==="axe"||weapon==="hammer"){
  trace([[12,-9],[23,-39]],bronze[1],2.8);
  const head=weapon==="axe"?[[19,-37],[18,-44],[28,-46],[31,-39],[26,-34]]:[[17,-41],[25,-45],[30,-38],[27,-31],[19,-34]];
  plate(head,weapon==="axe"?iron:bronze);
  if(weapon==="hammer")spark(25,-39,3.1,trim);
 }else if(weapon==="fists"){
  oval(17,-16,4.8,4.3,colors[1]);spark(17,-16,2.7,trim);
 }else blade(p,16,-16,look.reach||15,colors[0]);
 if(shield){
  plate([[-18,-22],[-11,-25],[-3,-21],[-4,-9],[-10,-3],[-17,-9]],shield);
  form([[-14,-19],[-10,-22],[-6,-19],[-7,-10],[-10,-7],[-14,-12]],shield[2],shield[0],.8);
  spark(-10,-14,3.8,trim);
 }
}

function mage(p,look) {
 const {form,plate,trace,limb,oval,eye,spark}=p;
 const {colors,cape=colors,trim,face,head="hood",cane="orb"}=look;
 cloak(p,cape,look.spread||14);
 plate([[-10,5],[-6,-20],[-3,-27],[8,-26],[13,-17],[12,5],[4,1],[-4,4]],colors);
 trace([[-4,-18],[-6,2],[2,-1],[6,0]],trim,1.35);
 spark(5,-19,3.1,trim);
 limb([[9,-20],[14,-15],[18,-19]],colors[1],4,colors[0]);
 plate([[-3,-39],[4,-43],[11,-37],[13,-30],[9,-24],[2,-26]],face);
 if(head==="hood"){
  form([[-8,-26],[-6,-36],[1,-45],[8,-42],[5,-36],[4,-29]],colors[1]);
  trace([[-5,-36],[1,-43],[6,-42]],trim,1.2);
 }else if(head==="fins"){
  for(const side of [-1,1])plate([[4+side*4,-39],[4+side*11,-46],[4+side*9,-37],[4+side*5,-35]],colors);
 }else if(head==="beard"){
  plate([[1,-34],[9,-32],[12,-28],[8,-21],[4,-24],[-1,-26]],linen);
  trace([[1,-41],[9,-40]],"#e3dab0",2);
 }else if(head==="diadem")form([[-3,-40],[1,-43],[4,-41],[8,-45],[12,-41],[10,-37]],trim);
 eye(10,-34,trim);
 const x=19;
 trace([[x-3,5],[x+2,-41]],cane==="key"?iron[1]:bronze[1],2.55);
 if(cane==="key"){
  form([[x-2,-38],[x-2,-45],[x+6,-48],[x+10,-41],[x+8,-35],[x+2,-35]],colors[1],trim);
  oval(x+4,-41,2.2,2.2,colors[2]);
 }else if(cane==="skull"){
  oval(x+2,-41,4.3,4.8,linen[0]);oval(x+3,-41,1.1,1.3,black[2],null);
 }else{
  oval(x+2,-41,5.2,5.2,colors[2],trim);
  spark(x+2,-41,4.3,trim);
 }
}

function quadruped(p,look) {
 const {form,plate,trace,limb,oval,eye,spark}=p;
 const {colors,trim,head="wolf",mane=false,bloom=false,crown=false}=look;
 boot(p,[[-15,-12],[-17,-3],[-19,3]],colors[2],colors[0],4.8);
 boot(p,[[8,-12],[9,-4],[11,3]],colors[2],colors[0],4.8);
 limb([[-15,-12],[-22,-14],[-28,-21]],colors[1],5,colors[0]);
 plate([[-21,-10],[-18,-19],[-6,-24],[8,-24],[15,-17],[12,-6],[-8,-4]],colors);
 if(mane)for(const [x,y] of [[-16,-18],[-9,-22],[-2,-23]])form([[x-4,y+2],[x+1,y-7],[x+7,y-1],[x+5,y+3]],trim);
 if(bloom)for(const [x,y] of [[-12,-22],[-6,-27],[0,-22]]){
  oval(x,y,4.4,3.5,colors[0]);spark(x,y,2.4,trim);
 }
 plate([[5,-23],[9,-31],[14,-25],[18,-31],[23,-25],[24,-20],[29,-17],[25,-12],[17,-10],[9,-14]],colors);
 if(head==="fox")form([[8,-25],[12,-29],[16,-23],[19,-29],[22,-24],[24,-20],[19,-15],[14,-18]],ivory[0]);
 eye(21,-23,trim);
 trace([[22,-16],[27,-16]],colors[2],1.35);
 if(crown)form([[11,-28],[9,-34],[14,-33],[18,-37],[20,-32],[25,-34],[23,-28]],trim);
}

function wings(p,colors,trim,feathered=false,spread=1) {
 const {plate,trace}=p;
 for(const sign of [-1,1]){
  const x=sign*spread;
  const out=feathered?[[3*x,-20],[15*x,-34],[28*x,-43],[27*x,-29],[24*x,-19],[19*x,-20],[14*x,-12],[9*x,-14]]
   :[[3*x,-19],[10*x,-29],[27*x,-40],[31*x,-27],[23*x,-29],[21*x,-17],[15*x,-22],[10*x,-10]];
  plate(out,colors);
  for(const [tip,dy] of [[23,-35],[18,-25],[13,-21]])trace([[4*x,-20],[tip*x,dy]],trim,1);
 }
}

function dragon(p,colors,trim,{regal=false,horns=false}={}) {
 const {plate,form,trace,limb,eye,spark}=p;
 wings(p,colors,trim,false,regal?1.02:.88);
 limb([[-7,-12],[-17,-9],[-25,-13]],colors[1],5,colors[0]);
 plate([[-13,-13],[-8,-22],[4,-27],[11,-21],[11,-10],[4,-4],[-6,-6]],colors);
 plate([[4,-24],[7,-34],[16,-37],[18,-30],[23,-27],[20,-22],[12,-21]],colors);
 if(horns||regal)form([[6,-32],[4,-42],[10,-37],[13,-42],[16,-38],[19,-41],[19,-34]],trim);
 eye(16,-31,trim);
 for(let j=0;j<3;j++)trace([[2+j*2,-21+j*3],[9+j,-21+j*3]],trim,.95);
 if(regal)for(const [x,y,c] of [[-19,-29,"#95d6f5"],[18,-29,"#f4bb6c"],[-8,-21,"#c5acdf"],[9,-15,"#c9e18c"]])spark(x,y,3.75,c);
}

function slug(p,commander=false) {
 const {form,plate,trace,oval,eye,spark}=p;
 const k=commander?1:.65;
 const scale=points=>points.map(([x,y])=>[x*k,y*k]);
 plate(scale([[-24,3],[-20,-9],[-9,-23],[8,-25],[18,-18],[20,-8],[24,1],[11,5]]),black);
 plate(scale([[-3,-16],[-7,-30],[1,-38],[14,-38],[20,-27],[15,-18]]),violet);
 for(const side of [-1,1])trace(scale([[6+side*5,-36],[6+side*9,-46],[6+side*12,-48]]),black[1],commander?2.8:1.9);
 for(const [x,y] of [[-13,-11],[-9,-17],[-2,-11],[9,-9],[14,-14]])oval(x*k,y*k,2.7*k,1.9*k,"#c4df74",null);
 eye(14*k,-29*k,"#dbf998");
 if(commander)spark(8,-22,3.5,"#d7ea96");
}

const designs={
 legion:p=>swordBearer(p,{colors:ivory,trim:"#fff3b9",shield:ivory,reach:17}),
 necropolis:p=>swordBearer(p,{colors:black,trim:"#e9bdfb",face:linen,weapon:"axe"}),
 goblin:p=>swordBearer(p,{colors:red,trim:"#ffd390",face:leaf,goblin:true,reach:11}),
 beast:p=>quadruped(p,{colors:bronze,trim:"#f9e5a6",mane:true}),
 construct:p=>swordBearer(p,{colors:iron,trim:"#a8ecfa",weapon:"fists",bulk:1.26}),
 bloom:p=>quadruped(p,{colors:leaf,trim:"#e6faab",bloom:true}),
 drake:p=>dragon(p,blue,"#b3effa"),
 vampire:p=>swordBearer(p,{colors:black,trim:"#f5aeb9",face:linen,cape:red,reach:13}),
 slug:p=>slug(p),
 zombie:p=>swordBearer(p,{colors:leaf,trim:"#d4e6af",face:linen,weapon:"fists"}),
 angel:p=>{wings(p,ivory,"#fff4cc",true,.86);swordBearer(p,{colors:ivory,trim:"#fff2c9",face:linen});},
 demon:p=>{wings(p,red,"#f0ad8a",false,.78);swordBearer(p,{colors:red,trim:"#ffb06f",face:black,horns:true,weapon:"axe"});},
 dragon:p=>dragon(p,red,"#ffd49a",{horns:true}),
 krenko:p=>swordBearer(p,{colors:red,trim:"#ffdc88",face:leaf,goblin:true,crown:true,cape:bronze,weapon:"axe"}),
 talrand:p=>mage(p,{colors:blue,trim:"#bedfec",face:blue,head:"fins",spread:17}),
 omnath:p=>{
  const {plate,trace,limb,oval,spark}=p;
  plate([[-12,5],[-15,-7],[-12,-23],[-5,-32],[7,-34],[17,-22],[15,-6],[11,5]],leaf);
  for(const side of [-1,1])limb([[side*10,-18],[side*15,-6],[side*20,2]],leaf[1],5.8,leaf[0]);
  oval(1,-17,8,10,"#86ad66");
  trace([[-10,-23],[-4,-20],[0,-13],[-4,-7]],"#d4f0a1",1.5);
  spark(2,-17,6.6,"#e3ff9f");spark(3,-38,5.8,"#ddf5aa");
 },
 edgar:p=>swordBearer(p,{colors:black,trim:"#f8d5a4",face:linen,crown:true,cape:red,reach:23}),
 lightpaws:p=>quadruped(p,{colors:ivory,trim:"#fff6c9",head:"fox",crown:true}),
 meren:p=>mage(p,{colors:leaf,face:bronze,cape:black,trim:"#e1eda6",cane:"skull",spread:19}),
 teysa:p=>mage(p,{colors:linen,face:bronze,cape:black,trim:"#f7d6ee",head:"diadem",cane:"key",spread:19}),
 korvold:p=>{wings(p,red,"#dfaa74",false,.75);quadruped(p,{colors:red,trim:"#f4d286",crown:true});},
 atraxa:p=>{wings(p,linen,"#e7edda",true,1);swordBearer(p,{colors:linen,trim:"#e4f0be",face:blue,weapon:"fists"});for(const [x,y,c] of [[-19,-32,"#f3d8a0"],[-8,-37,"#a7daef"],[13,-40,"#dcb9ea"],[23,-33,"#c6e2a8"]])p.spark(x,y,3.6,c);},
 urdragon:p=>dragon(p,black,"#dfc5b4",{regal:true}),
 toxrill:p=>slug(p,true),
 torbran:p=>swordBearer(p,{colors:red,trim:"#ffcc8d",face:bronze,shield:bronze,weapon:"hammer",bulk:1.25}),
 urza:p=>mage(p,{colors:blue,trim:"#dbf7ff",face:bronze,head:"beard",cane:"key"}),
 heliod:p=>{
  const {oval,trace,spark}=p;
  oval(0,-34,12,13,null,"#ffdb89",1.6);
  for(let i=0;i<9;i++){
   const a=i*Math.PI*2/9,x=Math.cos(a),y=Math.sin(a);
   trace([[x*13,-34+y*13],[x*17,-34+y*17]],"#ffdd8e",1.1);
  }
  swordBearer(p,{colors:ivory,trim:"#fff4b0",face:bronze,shield:ivory,reach:23});
  spark(3,-45,4,"#fff3b8");
 },
 wilhelt:p=>swordBearer(p,{colors:iron,trim:"#c8eeb0",face:leaf,horns:true,cape:black,weapon:"axe"}),
 kaalia:p=>{wings(p,violet,"#f9c8db",true,.91);mage(p,{colors:red,face:bronze,trim:"#ffe2bd",head:"diadem",spread:12});}
};

export const allyArtKeys=Object.keys(designs);

export function paintAllyModel(ctx,kind) {
 designs[kind]?.(canvasPainter(ctx));
}
