// Original cached procedural sprites and purely cosmetic combat illustrations.
export function createArt(ctx,{res:startRes=1,portrait=null}={}){
 const ink="#172722",metal="#7d8e85",stone="#aab0a0",gold="#ead49a",ice="#8ee5fb",violet="#ca9be9",fire="#ffb267",leaf="#a0d481";
 const school={W:gold,U:ice,B:violet,R:fire,G:leaf};
 const towerSchools={legion:"W",chapel:"W",judgment:"W",arcanum:"U",library:"U",mirror:"U",necropolis:"B",foundry:"B",hex:"B",pyre:"R",goblin:"R",storm:"R",grove:"G",beast:"G",thorn:"G"};
 const enemyKeys=["raider","runner","armored","wing","mage","regen","titan","stalker","warden","golem","grimgut","matron","colossus","hierophant","tyrant","lorthos","isu","kazuul","infernotitan"],allyKeys=["legion","necropolis","goblin","beast","construct","bloom","drake","vampire","slug","toxrill","torbran","urza","zombie","angel","demon","dragon","heliod","wilhelt","kaalia","krenko","talrand","omnath","edgar","lightpaws","meren","teysa","korvold","atraxa","urdragon"];
 const commanderKeys=["krenko","talrand","omnath","edgar","lightpaws","meren","teysa","korvold","atraxa","urdragon","toxrill","torbran","urza","heliod","wilhelt","kaalia"];
 function crown(a,y,c){poly(a,[[-7,y],[-7,y-7],[-3,y-3],[0,y-9],[3,y-3],[7,y-7],[7,y]],c);}
 function poly(a,points,fill,stroke=ink){a.beginPath();points.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.closePath();a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=1.8;a.stroke();}}
 function oval(a,x,y,rx,ry,fill,stroke=null){a.beginPath();a.ellipse(x,y,rx,ry,0,0,Math.PI*2);a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=1.6;a.stroke();}}
 function rect(a,x,y,w,h,fill,stroke=ink){a.fillStyle=fill;a.fillRect(x,y,w,h);if(stroke){a.strokeStyle=stroke;a.lineWidth=1.5;a.strokeRect(x,y,w,h);}}
 function line(a,points,color,width=2){a.beginPath();points.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.strokeStyle=color;a.lineWidth=width;a.lineCap="round";a.lineJoin="round";a.stroke();}
 function crystal(a,x,y,s,c){poly(a,[[x,y-s],[x+s*.58,y],[x,y+s],[x-s*.58,y]],c);poly(a,[[x,y-s],[x+s*.58,y],[x,y+s]],"#ffffff44",null);}
 function roof(a,y,c){poly(a,[[-25,y], [0,y-24],[25,y]],c);poly(a,[[0,y-24],[25,y],[6,y]],"#00000033",null);}
 function keep(a,top=-34,body=stone){rect(a,-19,top,38,-top+7,body);poly(a,[[10,top],[19,top],[19,7],[10,7]],"#00000033",null);rect(a,-7,-9,14,16,ink,null);for(let i=0;i<3;i++)line(a,[[-17,top+7+i*9],[-10,top+7+i*9]],"#ffffff55",1.5);}
 function flag(a,x,y,c){line(a,[[x,y],[x,y-24]],"#b6a486",2);poly(a,[[x,y-24],[x+15,y-20],[x,y-14]],c);}
 const cache=new Map();
 let res=startRes;
 // Sprites are drawn at res× their layout size so they stay sharp on high-density and large screens.
 function setRes(r){r=Math.max(1,Math.min(4,r));if(r!==res){res=r;cache.clear();}}
 function makeSprite(key,draw,w=96,h=96){if(cache.has(key))return cache.get(key);const c=document.createElement("canvas");c.width=Math.round(w*res);c.height=Math.round(h*res);const a=c.getContext("2d");a.save();if(res!==1)a.scale(res,res);a.translate(w/2,h*.75);draw(a);a.restore();finish(c,a,w,h);cache.set(key,c);return c;}
 // Art pass (painted look): every cached sprite gets a top-left key light, a darker base for weight,
 // a warm rim on the lit edge and a thick ink outline so it reads against the busy map, Kingdom Rush style.
 let scratch=null;
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
 function towerModel(a,k,tier,branch){
  const c=school[towerSchools[k]];poly(a,[[-27,1],[-18,-8],[18,-8],[27,1],[24,10],[-24,10]],"#637263");
  a.save();a.scale(1+(tier-1)*.065,1+(tier-1)*.09);
  switch(k){
   case "legion":keep(a,-25);for(const x of [-18,-5,8])rect(a,x,-31,10,9,stone);flag(a,13,-30,c);poly(a,[[-17,-15],[-4,-15],[-4,-3],[-10,4],[-17,-3]],gold);line(a,[[-10,-13],[-10,0]],"#fff4cb");break;
   case "chapel":keep(a,-34,"#d0c8ab");roof(a,-34,"#bc9a59");rect(a,-5,-28,10,17,"#ffe7a6");line(a,[[0,-59],[0,-41]],gold,4);line(a,[[-6,-52],[6,-52]],gold,4);break;
   case "judgment":poly(a,[[-13,7],[-10,-39],[0,-50],[10,-39],[13,7]],"#c6c4ad");line(a,[[0,-45],[0,-1]],"#fff2bd",3);poly(a,[[-7,-41],[0,-62],[7,-41]],gold);oval(a,0,-26,13,6,"#ead49a88");break;
   case "arcanum":keep(a,-22,"#658c9b");poly(a,[[-21,-23],[-15,-42],[-5,-33],[-10,-21]],"#b0d6dc");poly(a,[[21,-23],[15,-42],[5,-33],[10,-21]],"#b0d6dc");crystal(a,0,-39,18,c);break;
   case "library":rect(a,-23,-31,46,36,"#6b8593");roof(a,-32,"#324f69");for(let x=-18;x<19;x+=9)rect(a,x,-26,6,17,["#bc9177",ice,"#d4b46d"][(x+18)/9%3]);poly(a,[[-15,-35],[0,-29],[15,-35],[15,-23],[0,-17],[-15,-23]],"#f1e7c4");line(a,[[0,-29],[0,-17]],"#465c72");break;
   case "mirror":rect(a,-18,-31,36,36,"#4d697b");oval(a,0,-29,20,28,"#d3c9ae",ink);oval(a,0,-29,15,22,"#75bdd6","#314d67");line(a,[[-9,-17],[10,-40]],"#d3f9ff",3);crystal(a,0,-59,7,ice);break;
   case "necropolis":poly(a,[[-22,7],[-19,-29],[-10,-38],[0,-29],[10,-38],[19,-29],[22,7]],"#77728c");oval(a,0,-18,11,10,"#e0d7c3",ink);oval(a,-4,-19,3,3,ink);oval(a,4,-19,3,3,ink);rect(a,-4,-9,8,4,"#cfc6b0");crystal(a,0,-44,10,violet);break;
   case "foundry":rect(a,-22,-25,44,30,"#62616b");oval(a,0,-25,22,10,"#323745",ink);oval(a,0,-26,15,5,"#d7a0f5");rect(a,10,-48,10,23,"#797183");poly(a,[[-12,4],[-12,-10],[0,-17],[12,-10],[12,4]],"#352739");oval(a,0,-5,7,7,violet);break;
   case "hex":poly(a,[[-15,6],[-11,-38],[0,-53],[12,-36],[15,6]],"#65516d");poly(a,[[-20,-28],[0,-37],[20,-28],[11,-19],[-11,-19]],"#42374e");oval(a,0,-28,11,6,violet);oval(a,0,-28,3,6,ink);line(a,[[-10,-5],[0,-16],[10,-5]],violet,3);break;
   case "pyre":rect(a,-24,-15,48,20,"#82685b");oval(a,-10,-15,12,10,"#343b38",ink);poly(a,[[-15,-18],[-15,-33],[21,-33],[27,-26],[21,-18]],"#8d9691");oval(a,22,-25,6,9,"#332d28",ink);oval(a,22,-25,3,5,fire);poly(a,[[-15,-33],[-21,-45],[-10,-38],[-4,-52],[4,-33]],fire);break;
   case "goblin":poly(a,[[-25,5],[-19,-21],[0,-39],[19,-21],[25,5]],"#915d4b");poly(a,[[-25,5],[0,-39],[7,5]],"#b9835d");poly(a,[[-9,5],[0,-17],[10,5]],ink);flag(a,17,-24,fire);line(a,[[-22,4],[-28,-8]],"#bda788",3);break;
   case "storm":rect(a,-18,-15,36,20,"#79695c");poly(a,[[-15,-15],[-7,-42],[7,-42],[15,-15]],"#777c78");for(let y=-35;y<-12;y+=7)oval(a,0,y,12,3,"#e6b873",ink);crystal(a,0,-49,10,"#f8db83");line(a,[[-8,-55],[1,-65],[-1,-56],[10,-64]],"#fff5c9",3);break;
   case "grove":poly(a,[[-9,6],[-5,-30],[6,-30],[10,6]],"#927654");for(const [x,y,r] of [[-14,-24,15],[14,-24,15],[0,-40,17],[0,-22,21]])oval(a,x,y,r,r*.75,"#4e8251",ink);for(const [x,y] of [[-14,-28],[5,-42],[15,-19]])crystal(a,x,y,7,leaf);break;
   case "beast":poly(a,[[-27,6],[-21,-19],[0,-34],[20,-22],[27,6]],"#82775f");oval(a,0,-5,15,16,"#27372e",ink);poly(a,[[-20,-17],[-13,-33],[-8,-21],[8,-22],[15,-34],[21,-17]],"#a8b592");line(a,[[-8,4],[-13,-5]],"#d3cfb2",3);line(a,[[8,4],[13,-5]],"#d3cfb2",3);break;
   case "thorn":line(a,[[-18,6],[-10,-18],[3,-32],[0,-47]],"#61794f",9);line(a,[[13,7],[4,-12],[-7,-28],[0,-47]],"#9bad66",7);for(const [x,y] of [[-10,-18],[9,-9],[-6,-32],[5,-38]])poly(a,[[x-3,y+5],[x+13,y-12],[x+5,y+5]],leaf);crystal(a,0,-49,8,"#c5ef9b");break;
  }
  a.restore();
  if(branch==="A"){for(const x of [-23,23]){poly(a,[[x-5,6],[x-5,-18],[x,-26],[x+5,-18],[x+5,6]],c);if(tier===4)crystal(a,x,-28,5,"#f7e7ba");}}else if(branch==="B"){oval(a,0,-38,tier===4?26:22,8,c+"55",c);for(const x of [-17,17])crystal(a,x,-38,tier===4?9:6,c);}
  for(let i=0;i<tier;i++)oval(a,(i-(tier-1)/2)*6,12,2.6,2.6,c,ink);
 }
 function humanoid(a,c,skin,opts={}){
  const sw=opts.bulk?13:9;line(a,[[-4,-2],[-6,5]],"#242e2b",5);line(a,[[4,-2],[7,5]],"#242e2b",5);
  poly(a,[[-sw,-20],[sw,-20],[sw*.7,-3],[-sw*.7,-3]],c);poly(a,[[0,-20],[sw,-20],[sw*.7,-3],[0,-3]],"#00000044",null);
  oval(a,0,-25,7,8,skin,ink);
  if(opts.helmet){poly(a,[[-8,-27],[-5,-35],[5,-35],[8,-27],[8,-23],[-8,-23]],"#b2b9af");rect(a,-5,-26,10,3,ink,null);}
  if(opts.shield){poly(a,[[-14,-19],[-4,-20],[-3,-7],[-9,-2],[-15,-7]],opts.shield);line(a,[[-9,-18],[-9,-6]],"#e9dec1",2);}
  if(opts.staff){line(a,[[13,-38],[13,5]],"#9a8362",3);crystal(a,13,-38,6,opts.staff);}
  else {line(a,[[7,-13],[17,-19]],"#8f9389",4);line(a,[[13,-16],[22,-30]],"#e2e4d8",3);}
 }
 function beast(a,c,accent){oval(a,-5,-11,17,10,c,ink);line(a,[[-16,-7],[-17,4]],c,6);line(a,[[5,-7],[7,4]],c,6);line(a,[[-19,-12],[-26,-20]],c,5);poly(a,[[6,-18],[12,-30],[16,-22],[23,-28],[24,-10],[12,-5]],accent);oval(a,19,-16,2,2,"#fcf2b8");}
 // Enemy models: each enemy is drawn as the creature on its Magic card (type lines in engine.mjs enemyCards), facing right.
 // Original drawings in the game's painted style; bosses wear a small crown (Emrakul's bone crest stands in for hers).
 function legs(a,pts,c,w=5){for(const p of pts)line(a,p,c,w);}
 function wingPair(a,pts,fill,stroke=ink){poly(a,pts,fill,stroke);poly(a,pts.map(([x,y])=>[-x,y]),fill,stroke);}
 function enemyModel(a,k){
  switch(k){
   case "raider": // Goblin Raider: Goblin Warrior, red.
    legs(a,[[[-4,-4],[-7,4]],[[4,-4],[6,4]]],"#4a3226");oval(a,-7,5,3.4,1.8,"#2a1d17");oval(a,7,5,3.4,1.8,"#2a1d17");
    oval(a,-10,-12,6.5,7.5,"#8b5a34",ink);oval(a,-10,-12,2,2,"#d9c08a");
    poly(a,[[-8,-20],[8,-20],[9,-4],[-9,-4]],"#8a3b2a");rect(a,-9,-10,18,3,"#3a2a20",null);
    poly(a,[[-4,-28],[-16,-34],[-6,-22]],"#7fae4f");poly(a,[[8,-29],[19,-36],[10,-22]],"#7fae4f");
    oval(a,2,-26,8,7,"#7fae4f",ink);poly(a,[[-6,-29],[9,-33],[11,-28],[-6,-26]],"#b5402c");
    oval(a,6,-26,1.7,1.7,"#ffd84a",ink);line(a,[[3,-21],[9,-22]],ink,1.4);poly(a,[[5,-21.5],[6,-19.5],[7,-21.7]],"#f4efd8",null);
    line(a,[[6,-15],[13,-19]],"#7fae4f",4);poly(a,[[12,-20],[15,-37],[18,-34],[17,-30],[20,-28],[17,-19]],"#c9cfc6");break;
   case "runner": // Monastery Swiftspear: Human Monk mid-sprint, red.
    for(const [y,w] of [[-24,12],[-17,16],[-9,10]])line(a,[[-12,y],[-12-w,y+1]],"#fff1d088",1.6);
    legs(a,[[[-2,-5],[-11,3]],[[3,-5],[11,1]]],"#5a3424",4.5);
    poly(a,[[-6,-21],[8,-22],[10,-5],[-7,-5]],"#d0632f");line(a,[[-6,-12],[10,-14]],"#f1c75a",3);line(a,[[-6,-12],[-15,-9],[-22,-13]],"#f1c75a",2.2);
    oval(a,4,-27,6.5,7,"#d9a37c",ink);oval(a,7,-28,1.2,1.2,ink);line(a,[[0,-31],[3,-33]],"#9e5746",1.4);
    line(a,[[-14,-6],[24,-26]],"#8b6a44",2.6);poly(a,[[22,-27],[32,-31],[25,-22]],"#e9ecef");oval(a,-1,-12,2.6,2.6,"#d9a37c",ink);oval(a,11,-18,2.6,2.6,"#d9a37c",ink);break;
   case "armored": // Indomitable Ancients: Treefolk Warrior behind a great shield, white.
    poly(a,[[-13,5],[-10,-7],[-3,-7],[-5,5]],"#6a4c32");poly(a,[[3,5],[4,-7],[11,-7],[14,5]],"#6a4c32");
    poly(a,[[-13,-6],[-11,-31],[10,-31],[12,-6]],"#7a5a3c");for(const x of [-6,-1,5])line(a,[[x,-29],[x-1,-9]],"#5a412b",1.4);
    oval(a,-3,-21,1.7,2.1,"#f3e6a8");oval(a,4,-21,1.7,2.1,"#f3e6a8");line(a,[[-6,-25],[7,-24]],"#4a3424",2);
    line(a,[[-11,-24],[-18,-33]],"#6a4c32",3.5);for(const [x,y,r] of [[-9,-34,8],[7,-35,8],[-1,-40,9],[-18,-35,5]])oval(a,x,y,r,r*.8,"#b6c48a",ink);
    line(a,[[9,-20],[13,-16]],"#6a4c32",4);poly(a,[[7,-27],[21,-27],[21,-8],[14,0],[7,-8]],"#ece3c4");line(a,[[14,-25],[14,-3]],"#c9a75a",2);line(a,[[9,-17],[19,-17]],"#c9a75a",2);crystal(a,14,-17,4,gold);break;
   case "wing": // Carrion Crow: Zombie Bird, black; tattered wings, exposed bone, sickly eye.
    wingPair(a,[[-2,-14],[-28,-27],[-24,-19],[-28,-13],[-20,-11],[-22,-5],[-8,-8]],"#2b2830");
    line(a,[[-4,-14],[-24,-24]],"#d9d2bf",1.3);line(a,[[4,-14],[24,-24]],"#d9d2bf",1.3);poly(a,[[16,-17],[21,-12],[18,-9]],"#7a6a5a",null);
    poly(a,[[-8,-10],[-17,-4],[-9,-6]],"#2b2830");oval(a,0,-11,9,7,"#35303a",ink);for(const x of [-3,0,3])line(a,[[x,-13],[x+1,-8]],"#d9d2bf",1.2);
    oval(a,9,-17,5.2,5,"#35303a",ink);poly(a,[[13,-18],[21,-16],[13,-14.5]],"#c9b98a");oval(a,10,-18,1.7,1.7,"#b6ff6a");line(a,[[-1,-5],[-2,0]],"#c9b98a",1.5);line(a,[[3,-5],[3,0]],"#c9b98a",1.5);break;
   case "mage": // Prodigal Sorcerer: Human Wizard casting a bolt, blue.
    line(a,[[-12,-34],[-12,4]],"#8b6a44",2.5);oval(a,-12,-36,3.2,3.2,"#8ee5fb",ink);
    poly(a,[[-11,5],[-7,-21],[7,-21],[11,5]],"#2f5c9a");line(a,[[0,-20],[0,5]],"#c9d8f0",1.5);line(a,[[-11,4],[11,4]],"#c9d8f0",1.5);
    oval(a,1,-26,6.5,7,"#e0b896",ink);poly(a,[[-4,-24],[6,-24],[3,-15],[-1,-15]],"#ece9df");oval(a,4,-27,1.2,1.2,ink);
    poly(a,[[-10,-29],[11,-29],[4,-33],[2,-46],[-3,-33]],"#244a80");line(a,[[-10,-29],[11,-29]],"#c9d8f0",1.5);
    line(a,[[4,-17],[16,-21]],"#2f5c9a",4.5);oval(a,17,-21,2.5,2.5,"#e0b896",ink);oval(a,20,-22,6,6,"#8ee5fb44",null);line(a,[[19,-21],[24,-26],[22,-20],[29,-24]],"#e6fbff",2);break;
   case "regen": // Mossbridge Troll: hulking, stooped Troll with moss on its back and long arms, green.
    legs(a,[[[-6,-4],[-9,5]],[[4,-4],[5,5]]],"#4e6a39",6.5);line(a,[[-10,-20],[-14,-4]],"#5f7f45",6);oval(a,-14,-3,3.2,2.6,"#4e6a39",ink);
    poly(a,[[-12,-4],[-14,-22],[-6,-32],[8,-31],[12,-18],[9,-4]],"#5f7f45");poly(a,[[-14,-20],[-8,-33],[6,-33],[2,-27],[-3,-30],[-6,-25],[-10,-27]],"#8bb35a");for(const x of [-12,-7])line(a,[[x,-24],[x,-16]],"#8bb35a",1.6);
    oval(a,9,-30,7,6.5,"#6b8c4c",ink);oval(a,11,-32,1.5,1.5,"#ffcf4a");line(a,[[8,-34],[13,-33]],ink,1.4);oval(a,12,-26,4.5,2.6,"#4e6a39",ink);poly(a,[[10,-27],[11,-31],[12.5,-27]],"#f2ead2");poly(a,[[14,-27],[15,-31],[16,-26.5]],"#f2ead2");
    line(a,[[8,-22],[16,-3]],"#5f7f45",6.5);oval(a,16,-2,3.6,2.8,"#4e6a39",ink);break;
   case "titan": // Primeval Titan: a Giant of stone and vine, carrying land, green.
    poly(a,[[-10,5],[-9,-11],[-2,-11],[-3,5]],"#7a7466");poly(a,[[3,5],[3,-11],[10,-11],[11,5]],"#7a7466");
    line(a,[[-13,-26],[-17,-11]],"#857c69",6);oval(a,-17,-10,3.2,3.2,"#857c69",ink);
    poly(a,[[-15,-31],[15,-31],[11,-10],[-11,-10]],"#857c69");line(a,[[-10,-28],[-4,-20],[-8,-12]],"#5f9b4a",2);line(a,[[9,-29],[4,-19],[8,-12]],"#5f9b4a",2);rect(a,-11,-14,22,4,"#5a4f3f",null);
    oval(a,-15,-30,6.5,5,"#9a917e",ink);oval(a,15,-30,6.5,5,"#9a917e",ink);poly(a,[[-19,-34],[-16,-38],[-13,-34]],"#6fb34f",null);poly(a,[[12,-34],[15,-38],[18,-34]],"#6fb34f",null);
    oval(a,0,-36,6,6,"#857c69",ink);oval(a,-2,-37,1.4,1.4,"#a8ff6a");oval(a,3,-37,1.4,1.4,"#a8ff6a");
    poly(a,[[-4,-41],[-11,-49],[-6,-42]],"#5f9b4a");poly(a,[[4,-41],[11,-49],[6,-42]],"#5f9b4a");
    line(a,[[13,-26],[18,-13]],"#857c69",6);poly(a,[[13,-13],[25,-11],[23,-4],[14,-6]],"#6b4f35");line(a,[[20,-12],[20,-18]],"#5a412b",2);oval(a,20,-21,4.5,4,"#4e8251",ink);break;
   case "stalker": // Invisible Stalker: hooded Human Rogue, half-seen, blue.
    a.save();a.globalAlpha=.6;
    poly(a,[[-10,5],[-7,-22],[1,-35],[8,-22],[10,5]],"#5b7fa0","#2a4258");poly(a,[[-3,-20],[1,-28],[6,-20],[5,-14],[-2,-14]],"#2a4258",null);a.restore();
    for(const [x,y] of [[-13,-8],[-11,-20],[12,-4],[-6,-33]])crystal(a,x,y,2,"#c9f3ff");oval(a,2,-25,4,5,"#13202b");oval(a,1,-26,1.3,1.3,"#c9f3ff");oval(a,4,-26,1.3,1.3,"#c9f3ff");line(a,[[6,-12],[17,-17]],"#d4e3ea",2.2);line(a,[[5,-11],[8,-14]],"#5b7fa0",3);break;
   case "warden": // Kappa Cannoneer: artifact Turtle Warrior with a shoulder cannon, blue.
    legs(a,[[[-6,-3],[-7,5]],[[5,-3],[6,5]]],"#4f8f86",6);
    oval(a,-4,-15,13,12,"#6e7f86",ink);for(const [x,y] of [[-11,-19],[-4,-23],[3,-19],[-9,-10],[-2,-11]])oval(a,x,y,1.3,1.3,"#c3ccd0");line(a,[[-15,-15],[6,-15]],"#4f5a60",1.4);crystal(a,-5,-16,3.5,ice);
    oval(a,5,-12,6.5,8.5,"#c9b27a",ink);line(a,[[2,-15],[8,-15]],"#9c8758",1.2);line(a,[[2,-10],[8,-10]],"#9c8758",1.2);
    oval(a,9,-24,6,5.5,"#5f9f90",ink);oval(a,12,-25,1.5,1.5,"#ffe9a0");line(a,[[10,-21],[15,-22]],ink,1.2);
    poly(a,[[-8,-28],[17,-35],[18,-30],[-7,-24]],"#56606a");line(a,[[2,-31],[3,-27]],"#c9a75a",2);oval(a,18,-32.5,2.6,3.2,"#1b2226",ink);break;
   case "golem": // Darksteel Juggernaut: an unstoppable darksteel siege engine, colorless.
    rect(a,-18,-3,36,8,"#24282d");for(const x of [-12,-4,4,12])oval(a,x,1,3.2,3.2,"#5b6570",ink);
    poly(a,[[-18,-3],[-20,-16],[-12,-31],[10,-31],[18,-19],[18,-3]],"#3a4048");line(a,[[-14,-26],[6,-27]],"#8fa3b8",1.6);line(a,[[-17,-14],[-10,-27]],"#8fa3b8",1.2);
    poly(a,[[7,-26],[18,-19],[18,-5],[7,-7]],"#2a2f36");line(a,[[10,-16],[17,-15]],"#ff7a4a",2.2);
    for(const y of [-22,-12,-5])poly(a,[[18,y-2.5],[26,y],[18,y+2.5]],"#9aa6ad");poly(a,[[-8,-31],[-5,-38],[-2,-31]],"#9aa6ad");poly(a,[[0,-31],[3,-38],[6,-31]],"#9aa6ad");break;
   case "grimgut": // Lovisa Coldeyes: Human barbarian warlord with a war axe, red.
    poly(a,[[-15,4],[-12,-22],[6,-22],[0,4]],"#8a7660");legs(a,[[[-4,-3],[-6,5]],[[4,-3],[6,5]]],"#4a3a2c",5.5);
    poly(a,[[-9,-21],[9,-21],[9,-4],[-9,-4]],"#8e3a2a");rect(a,-9,-10,18,3,"#3a2a20",null);oval(a,-8,-21,5,3.5,"#cbb89a",ink);oval(a,8,-21,5,3.5,"#cbb89a",ink);
    poly(a,[[-7,-31],[6,-33],[-1,-11],[-9,-13]],"#e0c27a");oval(a,2,-27,6.5,7,"#e2b89a",ink);oval(a,5,-28,1.5,1.5,"#9fe3ff");oval(a,6,-23,1.5,1.1,ink);
    line(a,[[7,-17],[14,-37]],"#7a5a3c",3);poly(a,[[11,-41],[22,-39],[21,-30],[13,-34]],"#c9cfc6");break;
   case "matron": // Oona, Queen of the Fae: Faerie Wizard queen on gauzy wings, blue-black.
    wingPair(a,[[-2,-26],[-24,-44],[-29,-32],[-6,-22]],"#9fd8ff77","#5b4f86");wingPair(a,[[-2,-20],[-22,-14],[-18,-5],[-4,-16]],"#c9a6ff66","#5b4f86");
    poly(a,[[-12,5],[-6,-22],[6,-22],[12,5]],"#2b2650");line(a,[[-6,-22],[-12,5]],"#8a6ad0",1.4);line(a,[[6,-22],[12,5]],"#8a6ad0",1.4);
    poly(a,[[-7,-31],[7,-31],[8,-14],[-8,-14]],"#1d1830");oval(a,0,-27,6,7,"#cfc7e8",ink);oval(a,-2,-27,1.3,1.3,"#c9f3ff");oval(a,2.5,-27,1.3,1.3,"#c9f3ff");
    for(const [x,y] of [[-14,-8],[15,-26],[18,-6]])crystal(a,x,y,2.5,"#e6d7ff");break;
   case "colossus": // Darksteel Colossus: artifact Golem of dark steel.
    rect(a,-11,-12,8,17,"#3e454e");rect(a,3,-12,8,17,"#3e454e");
    line(a,[[-18,-29],[-20,-12]],"#4a525c",7);oval(a,-20,-10,4,4,"#3e454e",ink);
    poly(a,[[-16,-35],[16,-35],[12,-12],[-12,-12]],"#4a525c");line(a,[[-10,-30],[10,-30]],"#8fa3b8",1.4);line(a,[[0,-34],[0,-13]],"#2f353c",1.4);crystal(a,0,-24,5,"#9fd8ff");
    oval(a,-17,-33,6.5,5,"#5a636e",ink);oval(a,17,-33,6.5,5,"#5a636e",ink);line(a,[[18,-29],[20,-12]],"#4a525c",7);oval(a,20,-10,4,4,"#3e454e",ink);
    rect(a,-5,-44,10,9,"#3a4048");line(a,[[-3,-39],[4,-39]],"#9fd8ff",2);break;
   case "hierophant": // Iona, Shield of Emeria: Angel in white and gold with a sword.
    wingPair(a,[[-3,-24],[-30,-44],[-32,-30],[-26,-17],[-8,-14]],"#f4f1e6");for(const s of [-1,1])for(const y of [-36,-28,-21])line(a,[[s*8,-21],[s*26,y]],"#d8cfb6",1.1);
    poly(a,[[-10,5],[-7,-22],[7,-22],[10,5]],"#e8dcb8");poly(a,[[-7,-22],[7,-22],[5,-11],[-5,-11]],"#d9b45a");
    poly(a,[[-7,-30],[7,-30],[7,-17],[-7,-17]],"#e9d38a",null);oval(a,0,-27,6,7,"#f1dcc4",ink);oval(a,2.5,-27,1.2,1.2,ink);
    line(a,[[7,-14],[20,-41]],"#eef2f5",3);line(a,[[4,-17],[11,-13]],gold,2.4);break;
   case "tyrant": // Emrakul, the Aeons Torn: colossal Eldrazi of bone plates and tentacles, colorless.
    for(const [x0,x1,x2] of [[-8,-20,-26],[-3,-10,-12],[3,8,13],[8,20,27]]){line(a,[[x0,-10],[x1,-2],[x2,5]],ink,6);line(a,[[x0,-10],[x1,-2],[x2,5]],"#c9a3c0",4);}
    poly(a,[[-12,-8],[-14,-30],[-6,-42],[6,-42],[14,-30],[12,-8]],"#8b6f86");
    for(const y of [-34,-24,-15])poly(a,[[-11,y],[0,y-4],[11,y],[0,y+3]],"#e6ddcc");line(a,[[-9,-12],[-4,-28]],"#ff9ad8",1.2);line(a,[[8,-13],[4,-27]],"#ff9ad8",1.2);
    poly(a,[[-10,-39],[-17,-49],[-4,-43],[0,-50],[4,-43],[17,-49],[10,-39]],"#e6ddcc");for(const [x,y] of [[-6,-22],[6,-30],[0,-11]])oval(a,x,y,1.5,1.5,"#ff9ad8");break;
   case "lorthos": // Lorthos, the Tidemaker: a vast blue Octopus rising from the tide.
    for(const [x0,x1,x2] of [[-9,-20,-27],[-5,-12,-17],[-1,-3,-6],[3,7,9],[7,16,21],[10,22,29]]){line(a,[[x0,-8],[x1,-1],[x2,5]],ink,6);line(a,[[x0,-8],[x1,-1],[x2,5]],"#3f7fb8",4);}
    oval(a,0,4,24,3.5,"#7fc8ff55",null);
    oval(a,0,-24,15,17,"#3f7fb8",ink);oval(a,-4,-31,6,5,"#6aa8dd",null);for(const [x,y] of [[-9,-18],[8,-16],[-3,-12],[6,-30]])oval(a,x,y,1.6,1.6,"#9fd8ff");
    oval(a,-5,-22,3,3.2,"#f3e9b8",ink);oval(a,6,-22,3,3.2,"#f3e9b8",ink);oval(a,-4.5,-22,1.2,2,ink);oval(a,6.5,-22,1.2,2,ink);
    line(a,[[13,-20],[24,-30],[28,-42]],ink,5);line(a,[[13,-20],[24,-30],[28,-42]],"#3f7fb8",3.4);break;
   case "isu": // Isu the Abominable: a white snow Yeti, legendary.
    legs(a,[[[-7,-4],[-9,5]],[[6,-4],[8,5]]],"#d9e3ea",7);
    line(a,[[-13,-24],[-18,-5]],"#e8eff4",7);oval(a,-18,-4,4,3.4,"#c9d6df",ink);
    oval(a,0,-19,15,16,"#eef3f6",ink);for(const [x,y] of [[-9,-12],[-4,-26],[7,-10],[10,-24],[-1,-6]])line(a,[[x,y],[x+2,y+4]],"#b8c8d4",1.4);
    oval(a,3,-34,8,7.5,"#eef3f6",ink);oval(a,5,-32,5.5,4.5,"#7fa2b8",null);oval(a,3,-33,1.3,1.3,"#9ff0ff");oval(a,7,-33,1.3,1.3,"#9ff0ff");poly(a,[[4,-29],[5,-26.5],[6,-29]],"#f2ead2");
    line(a,[[12,-24],[19,-6]],"#e8eff4",7);oval(a,19,-5,4,3.4,"#c9d6df",ink);for(const [x,y] of [[-20,-30],[22,-28],[-16,-40]])crystal(a,x,y,2.4,"#d9f4ff");break;
   case "kazuul": // Kazuul, Tyrant of the Cliffs: a red Ogre Warrior with a stone club.
    legs(a,[[[-6,-4],[-8,5]],[[5,-4],[7,5]]],"#6b4a34",7);
    poly(a,[[-14,-4],[-16,-24],[-8,-34],[10,-34],[15,-22],[12,-4]],"#b0603e");rect(a,-14,-10,26,5,"#4a3324",null);oval(a,-1,-8,3,2.5,"#c9a75a",ink);
    oval(a,-15,-30,6,5,"#7a6a5a",ink);poly(a,[[-18,-33],[-15,-40],[-12,-33]],"#d8cfb6");
    oval(a,4,-38,7.5,7,"#c06c48",ink);oval(a,7,-39,1.5,1.5,"#ffd24a");line(a,[[5,-42],[10,-41]],ink,1.6);poly(a,[[5,-34],[6,-30],[7.5,-34]],"#f2ead2");poly(a,[[9,-34],[10,-30],[11,-34]],"#f2ead2");
    line(a,[[-13,-22],[-18,-6]],"#b0603e",6);line(a,[[12,-24],[20,-34]],"#b0603e",6);line(a,[[20,-34],[24,-48]],"#6b4f35",4);poly(a,[[19,-48],[23,-58],[30,-55],[29,-46]],"#8a8478");break;
   case "infernotitan": // Inferno Titan: a Giant wreathed in fire with a burning axe, red.
    poly(a,[[-10,5],[-9,-11],[-2,-11],[-3,5]],"#5a2a1c");poly(a,[[3,5],[3,-11],[10,-11],[11,5]],"#5a2a1c");
    poly(a,[[-15,-33],[15,-33],[11,-10],[-11,-10]],"#7a3420");line(a,[[-9,-28],[-3,-19],[-7,-12]],"#ffb347",2);line(a,[[8,-30],[3,-20],[7,-12]],"#ffb347",2);
    oval(a,-15,-31,6,5,"#5a2a1c",ink);oval(a,15,-31,6,5,"#5a2a1c",ink);line(a,[[-14,-27],[-17,-11]],"#7a3420",6);oval(a,-17,-10,3.2,3.2,"#5a2a1c",ink);
    oval(a,0,-38,6.5,6.5,"#7a3420",ink);oval(a,-2,-39,1.5,1.5,"#ffe26a");oval(a,3,-39,1.5,1.5,"#ffe26a");
    for(const [x,h] of [[-6,10],[-2,14],[2,12],[6,9]])poly(a,[[x-3,-43],[x,-43-h],[x+3,-43]],"#ff8a2e");
    for(const [x,h] of [[-2,7],[2,6]])poly(a,[[x-2,-43],[x,-43-h],[x+2,-43]],"#ffe26a");
    line(a,[[14,-27],[22,-42]],"#3a2a20",3);poly(a,[[19,-48],[30,-44],[25,-36],[19,-40]],"#c9cfc6");for(const [x,y] of [[24,-50],[29,-48],[20,-53]])oval(a,x,y,2,3,"#ff8a2e88",null);break;
  }
  if(tokenBoss.includes(k)&&k!=="tyrant"&&k!=="infernotitan")crown(a,({grimgut:-35,matron:-35,colossus:-45,hierophant:-35,lorthos:-41,isu:-41,kazuul:-45})[k],k==="matron"?"#b9a6e8":gold);
 }
 const tokenBoss=["grimgut","matron","colossus","hierophant","tyrant","lorthos","isu","kazuul","infernotitan"];
 function creature(a,k){
  if(enemyKeys.includes(k))return enemyModel(a,k);
  switch(k){
   case "legion":humanoid(a,"#e2cc99","#e5bd93",{helmet:true,shield:gold});break;
   case "necropolis":humanoid(a,"#827393","#d8d7c1",{});oval(a,-3,-26,2,2,ink);oval(a,3,-26,2,2,ink);line(a,[[-6,-15],[6,-15]],"#e3decf",2);break;
   case "goblin":humanoid(a,"#bb7257","#90a86b",{});poly(a,[[-6,-29],[-15,-33],[-8,-23]],"#90a86b");poly(a,[[6,-29],[15,-33],[8,-23]],"#90a86b");break;
   case "beast":beast(a,"#827e61","#b9bc86");break;
   case "bloom":beast(a,"#668f54","#b1da79");crystal(a,-8,-25,9,"#b6f28a");break;
   case "construct":humanoid(a,"#788e8d","#acbbc0",{bulk:true,helmet:true});crystal(a,0,-13,6,ice);break;
   case "drake":poly(a,[[-3,-16],[-24,-28],[-18,-10],[-6,-12]],"#5f9ccf");poly(a,[[3,-16],[24,-28],[18,-10],[6,-12]],"#5f9ccf");oval(a,0,-12,7,11,"#3d78a8",ink);poly(a,[[-4,-21],[0,-30],[4,-21]],"#9fd2f2");break;
   case "vampire":humanoid(a,"#5b2230","#e6d9d2",{});poly(a,[[-9,-21],[0,-12],[9,-21],[9,-4],[-9,-4]],"#8e2f3e",null);break;
   case "krenko":humanoid(a,"#b8573c","#8fae63",{});poly(a,[[-6,-29],[-16,-34],[-8,-23]],"#8fae63");poly(a,[[6,-29],[16,-34],[8,-23]],"#8fae63");crown(a,-34,gold);break;
   case "talrand":poly(a,[[-13,4],[-8,-22],[8,-22],[13,4]],"#2f6c93");oval(a,0,-25,7,8,"#6fb7c9",ink);poly(a,[[-8,-27],[-14,-36],[-4,-31]],"#4aa3c6");poly(a,[[8,-27],[14,-36],[4,-31]],"#4aa3c6");line(a,[[14,-40],[14,4]],"#c2b07c",3);crystal(a,14,-41,6,ice);break;
   case "omnath":oval(a,0,-16,15,19,"#4f9a4a",ink);oval(a,0,-16,9,12,"#8ee06c");crystal(a,0,-38,8,leaf);for(const x of [-11,11])line(a,[[x,-10],[x*1.6,4]],"#3f7b3c",5);break;
   case "edgar":humanoid(a,"#3b2029","#ece2dc",{});poly(a,[[-14,-20],[-18,2],[0,-6],[18,2],[14,-20]],"#7c1f2c",null);crown(a,-34,"#d9c08a");break;
   case "lightpaws":beast(a,"#e9e2cf","#f3dc93");crystal(a,-8,-26,6,gold);line(a,[[-14,-20],[4,-20]],"#d6b85c",3);break;
   case "meren":poly(a,[[-14,4],[-8,-22],[8,-22],[14,4]],"#2e3b2f");oval(a,0,-25,7,8,"#c9b39a",ink);poly(a,[[-9,-26],[0,-38],[9,-26]],"#5d7a46");line(a,[[13,-36],[13,4]],"#8b7a5a",3);oval(a,13,-38,5,5,"#d9d4c3",ink);break;
   case "teysa":poly(a,[[-13,4],[-8,-22],[8,-22],[13,4]],"#e8e2d3");oval(a,0,-25,7,8,"#d9b9a1",ink);poly(a,[[-8,-29],[0,-35],[8,-29]],"#2a2530");line(a,[[13,-36],[13,4]],"#3b3442",3);crystal(a,13,-38,6,violet);break;
   case "korvold":beast(a,"#6b3a2c","#c86b4b");poly(a,[[-10,-20],[-24,-36],[-6,-26]],"#4c2a22");crown(a,-33,gold);break;
   case "atraxa":humanoid(a,"#e8e6dc","#f1e4d0",{});poly(a,[[-4,-18],[-30,-34],[-24,-8]],"#f4f1e6");poly(a,[[4,-18],[30,-34],[24,-8]],"#f4f1e6");for(const [x,c] of [[-9,gold],[-3,ice],[3,violet],[9,leaf]])oval(a,x,-36,2.6,2.6,c);break;
   case "slug":oval(a,0,-6,13,7,"#4a3a55",ink);oval(a,6,-12,6,6,"#5d4a6b",ink);line(a,[[8,-17],[10,-24]],"#5d4a6b",2);line(a,[[4,-17],[3,-24]],"#5d4a6b",2);oval(a,-4,-8,2.5,1.5,"#9fe07a");break;
   case "toxrill":oval(a,0,-12,18,13,"#3b2d47",ink);oval(a,10,-24,9,9,"#4e3c5e",ink);for(const [x,y] of [[-10,-14],[-2,-8],[6,-16],[-6,-20]])oval(a,x,y,2.6,2,"#9fe07a");line(a,[[14,-31],[18,-42]],"#4e3c5e",3);line(a,[[8,-32],[6,-42]],"#4e3c5e",3);oval(a,13,-25,2,2,"#d6ff9a");break;
   case "torbran":humanoid(a,"#9c3a2a","#d7a07d",{bulk:true,helmet:true,shield:"#c0582f"});line(a,[[-6,-12],[6,-12]],"#e8d0a8",4);line(a,[[12,-8],[22,-34]],"#7d8e85",4);poly(a,[[18,-34],[28,-38],[24,-28]],fire);break;
   case "urza":poly(a,[[-13,4],[-8,-22],[8,-22],[13,4]],"#3a5d86");oval(a,0,-25,7,8,"#d9c3a6",ink);line(a,[[-6,-30],[6,-30]],"#c9c3b6",2);rect(a,-16,-14,7,7,"#9aa6ad");crystal(a,-12,-20,5,ice);line(a,[[13,-36],[13,4]],"#9aa6ad",3);crystal(a,13,-38,6,ice);break;
   case "zombie":humanoid(a,"#4f5b46","#8fa27e",{});line(a,[[-8,-14],[-16,-18]],"#8fa27e",3);line(a,[[8,-14],[16,-18]],"#8fa27e",3);break;
   case "angel":poly(a,[[-3,-18],[-22,-34],[-16,-8]],"#f4f1e6");poly(a,[[3,-18],[22,-34],[16,-8]],"#f4f1e6");humanoid(a,"#e8dcb8","#f1e0c8",{});oval(a,0,-36,6,2,"#00000000",gold);break;
   case "demon":humanoid(a,"#5a1f2a","#8e3a3a",{bulk:true});poly(a,[[-6,-30],[-12,-42],[-2,-32]],"#2a1418");poly(a,[[6,-30],[12,-42],[2,-32]],"#2a1418");oval(a,-3,-26,1.8,1.8,fire);oval(a,3,-26,1.8,1.8,fire);break;
   case "dragon":poly(a,[[-3,-16],[-26,-30],[-20,-8],[-6,-12]],"#c0582f");poly(a,[[3,-16],[26,-30],[20,-8],[6,-12]],"#c0582f");oval(a,0,-12,8,12,"#8e2f22",ink);poly(a,[[-4,-21],[0,-32],[4,-21]],"#f7a564");break;
   case "heliod":humanoid(a,"#e8d9a8","#f1dfc0",{});for(let i=0;i<8;i++){const r=i*Math.PI/4;line(a,[[Math.cos(r)*9,-28+Math.sin(r)*9],[Math.cos(r)*15,-28+Math.sin(r)*15]],gold,2);}line(a,[[13,-36],[13,4]],"#c9a75a",3);break;
   case "wilhelt":humanoid(a,"#3d4a5a","#a9b59a",{helmet:true});line(a,[[12,-6],[24,-34]],"#7d8e85",5);poly(a,[[20,-34],[30,-40],[28,-28]],"#9aa6ad");oval(a,-3,-25,1.8,1.8,"#9fe07a");oval(a,3,-25,1.8,1.8,"#9fe07a");break;
   case "kaalia":poly(a,[[-4,-18],[-24,-30],[-18,-8]],"#b8a7c8");poly(a,[[4,-18],[24,-30],[18,-8]],"#b8a7c8");humanoid(a,"#7c2a2a","#d9b49a",{});line(a,[[-8,-30],[8,-30]],gold,2);break;
   case "urdragon":for(const [x,c] of [[-26,gold],[-14,ice],[14,fire],[26,leaf]])poly(a,[[0,-18],[x,-34],[x*.8,-10]],c);oval(a,0,-14,9,14,"#5a3f63",ink);poly(a,[[-5,-26],[0,-40],[5,-26]],"#7a4c6e");oval(a,-3,-24,2,2,fire);oval(a,3,-24,2,2,fire);break;
  }
 }
 // Towers draw about 10% larger than before so they sit proud of their pads; a soft contact shadow grounds them.
 function tower(t,p){const s=makeSprite("tower:"+t.kind+":"+t.tier+":"+(t.branch||"-"),a=>towerModel(a,t.kind,t.tier,t.branch),96,120);const scale=Math.max(.82,Math.min(1,p.y/78.75));softShadow(p.x+3,p.y+9,32*scale,12*scale,.55);ctx.drawImage(s,p.x-42*scale,p.y-78.75*scale,84*scale,105*scale);idle(t,p,scale);}
 // Idle life on built towers: glowing crystals and eyes, forge smoke, flame flicker, crackling storm coils.
 // Anchors are model coordinates from towerModel(); the sprite maps them at 0.875 × scale (plus tier growth).
 const IDLE={legion:[["glint",-10,-10,gold]],chapel:[["glow",0,-52,gold]],judgment:[["glow",0,-56,gold]],arcanum:[["glow",0,-39,ice],["orbit",0,-39,ice]],library:[["rune",0,-46,ice]],mirror:[["glow",0,-59,ice],["glint",6,-34,"#e6fbff"]],
  necropolis:[["glow",0,-44,violet],["eyes",0,-19,"#c9a6ff"]],foundry:[["smoke",15,-50,"#d9d4e6"],["glow",0,-5,violet]],hex:[["glow",0,-28,violet]],pyre:[["flame",-6,-44,fire],["smoke",-6,-52,"#d8d0c8"]],goblin:[["smoke",-3,-42,"#e0d8cc"]],
  storm:[["glow",0,-49,"#f8db83"],["zap",0,-49,"#fff5c9"]],grove:[["glow",-14,-28,leaf],["glow",5,-42,leaf],["glow",15,-19,leaf]],beast:[["eyes",0,-6,"#ffd86b"]],thorn:[["glow",0,-49,"#c5ef9b"]]};
 function idle(t,p,scale){const list=IDLE[t.kind];if(!list)return;const now=(typeof performance!=="undefined"?performance.now():0)/1000,sx=.875*scale*(1+(t.tier-1)*.065),sy=.875*scale*(1+(t.tier-1)*.09),seed=(p.x*7+p.y*3)%10;
  ctx.save();
  list.forEach(([kind,mx,my,c],i)=>{const x=p.x+mx*sx,y=p.y+my*sy,ph=now*2+seed+i*1.7,k=Math.sin(ph)*.5+.5;
   if(kind==="glow")glow(x,y,10+k*6,c,.35+k*.45);
   else if(kind==="orbit"){const a=now*2.4+seed;oval(ctx,x+Math.cos(a)*14,y+Math.sin(a)*5,1.8,1.8,"#f2fdff");glow(x+Math.cos(a)*14,y+Math.sin(a)*5,6,c,.6);}
   else if(kind==="rune"){const yy=y-Math.sin(now*1.6+seed)*4;glow(x,yy,10,c,.5);ctx.globalAlpha=.9;ctx.fillStyle="#f1e7c4";ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.fillRect(x-5,yy-4,10,7);ctx.strokeRect(x-5,yy-4,10,7);ctx.globalAlpha=1;}
   else if(kind==="glint"){const g=(now*.5+seed*.1)%1;if(g<.12){const v=g/.12,r=6*Math.sin(v*Math.PI);ctx.save();ctx.globalCompositeOperation="lighter";ctx.fillStyle=c;ctx.globalAlpha=.9;ctx.beginPath();for(let j=0;j<8;j++){const an=j*Math.PI/4,rr=j%2?r*.25:r;j?ctx.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr):ctx.moveTo(x+rr,y);}ctx.closePath();ctx.fill();ctx.restore();}}
   else if(kind==="eyes"){const blink=(now*.4+seed*.13)%1>.96;if(!blink)for(const sd of [-1,1]){glow(x+sd*3.5*sx,y,5,c,.6);oval(ctx,x+sd*3.5*sx,y,1.3,1.3,c);}}
   else if(kind==="smoke"){for(let j=0;j<3;j++){const u=(now*.45+j/3+seed*.07)%1;ctx.globalAlpha=.45*(1-u);oval(ctx,x+Math.sin(now+j*2)*3*u+u*6,y-u*26,2.5+u*5,2.5+u*5,c);}ctx.globalAlpha=1;}
   else if(kind==="flame"){glow(x,y,12+k*5,c,.5+k*.3);for(let j=0;j<2;j++){const u=(now*.9+j*.5+seed*.1)%1;ctx.globalAlpha=1-u;oval(ctx,x+Math.sin(now*3+j)*4,y-u*18,1.4,1.4,"#ffd36b");}ctx.globalAlpha=1;}
   else if(kind==="zap"){const z=(now*1.3+seed*.1)%1;if(z<.18){const dir=Math.floor(now*7)%2?1:-1,pts=[[x,y]];for(let j=1;j<=4;j++)pts.push([x+dir*j*4+(Math.sin(now*40+j)*3),y-j*4-(j%2)*2]);ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.9;line(ctx,pts,c,1.6);ctx.restore();}}
  });
  ctx.restore();}
 function softShadow(x,y,rx,ry,alpha){ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,rx*.2,0,0,rx);g.addColorStop(0,"rgba(8,18,14,"+alpha+")");g.addColorStop(1,"rgba(8,18,14,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fill();ctx.restore();}
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
 function barTop(k){return tokenBoss.includes(k)||k==="titan"?.79:enemyKeys.includes(k)?.72:.65;}
 function sizeOf(k){return ["titan","grimgut","matron","colossus","hierophant","tyrant","lorthos","isu","kazuul","infernotitan"].includes(k)?(k==="titan"||k==="grimgut"||k==="matron"||k==="colossus"||k==="hierophant"?70:k==="tyrant"?78:76):commanderKeys.includes(k)?(k==="urdragon"?66:54):k==="bloom"?56:k==="wing"?50:45;}
 // Attack poses (visual only): pose() watches each fighter's attack timer and health between frames.
 // A rising timer means it just struck (lunge, lean and a swing arc); falling health means it was hit (recoil and a flash).
 const poses=new Map();let poseSweep=0;
 function pose(key,next,hp,now=performance.now()){let p=poses.get(key);if(!p){p={next,hp,atk:-1e9,hurt:-1e9};poses.set(key,p);}
  if(next!==undefined&&p.seen&&(p.next===undefined||next>p.next))p.atk=now;if(hp<p.hp)p.hurt=now;p.next=next;p.hp=hp;p.seen=now;
  if(now-poseSweep>4000){poseSweep=now;for(const [k,v] of poses)if(now-v.seen>3000)poses.delete(k);}
  const a=(now-p.atk)/280,h=(now-p.hurt)/220;return {atk:a>=0&&a<1?a:0,hurt:h>=0&&h<1?h:0,engaged:now-p.atk<1400};}
 function unit(k,x,y,opt={}){const s=makeSprite("unit:"+k,a=>creature(a,k),68,68),size=sizeOf(k),top=barTop(k);const dir=(opt.dir<0?-1:1)*(opt.ally&&opt.engaged?-1:1),flip=dir,atk=opt.atk||0,hurt=opt.hurt||0;
  const lunge=atk?Math.sin(Math.PI*Math.min(1,atk*1.4))*size*.2:0,recoil=hurt?Math.sin(Math.PI*hurt)*-3.5:0,lean=atk?Math.sin(Math.PI*Math.min(1,atk*1.4))*.22:0;
  x+=(lunge+recoil)*dir;
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
  if(lean)ctx.rotate(lean*dir);if(rock)ctx.rotate(rock*dir);ctx.scale(flip*(1+squash*.5-flap*.3),1-squash+flap);
  if((hurt&&hurt<.6)||(die&&die<.18))ctx.filter="brightness(1.9) saturate(.6)";ctx.drawImage(s,-size/2,-size*.75+bob,size,size);ctx.filter="none";ctx.restore();
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
