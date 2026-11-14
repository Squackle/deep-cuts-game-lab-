// Original animated pixel-silhouettes for real Magic creature encounters. The old
// sprite atlas is never relabeled: each identity receives a different visible model.
// Generated once at asset load; no Magic card art, network requests or gameplay RNG.
// Canvas-only: engine, simulation and ranked replay remain entirely DOM-free.

const C = (base, dark, mid, light, feature, custom = false) => ({ base, dark, mid, light, feature, custom });
export const REAL_CREATURE_MODELS = Object.freeze({
  grub: C('grub','#19391d','#54a54a','#d4e988','caterpillar'),
  hound: C('hound','#283e45','#7e9996','#e0e0ba','wolf'),
  archer: C('archer','#123b31','#4a8760','#d2dca0','bow'),
  tortoise: C('warden','#52514a','#a4a69a','#e6e2cd','rhino'),
  moth: C('moth','#312043','#786293','#bbf1c2','stinger'),
  hexer: C('hexer','#24152f','#6b3b89','#d1a0e7','blightcaster'),
  alpha: C('alpha','#101b2a','#4b657d','#b6d5ee','direwolf'),
  cinderling: C('cinderling','#592824','#b35b35','#f3d391','torchgoblin'),
  ashbrute: C('ashbrute','#4a2526','#a04c47','#ffd18a','minotaur'),
  harpooner: C('harpooner','#572d25','#b26c44','#ffdda4','spikeshot'),
  emberseer: C('emberseer','#492b27','#a44e32','#ffde91','alchemist'),
  champion: C('champion','#3e4036','#8e7a55','#d8c98e','wurm'),
  riftstalker: C('riftstalker','#141d33','#425a89','#a4b7df','shinobi'),
  nullwarden: C('nullwarden','#26333b','#687d83','#c7dbe0','golem'),
  shardling: C('shardling','#26365b','#666ab6','#d0c3f2','duelist'),
  sentinel: C('sentinel','#343842','#888ca0','#e5d2ad','titan'),
  nemata: C('thornmother','#203824','#547741','#bdd67a','nemata'),
  arasta: C('thornmother','#2b203c','#5a407c','#c0b7e2','spiderboss',true),
  drakuseth: C('matron','#4a1717','#b53e25','#ffd37d','dragon',true),
  krenko: C('matron','#51321f','#9e613e','#f5bd7f','krenko',true),
  scarab: C('unwritten','#152d48','#3a8090','#e7c57a','scarabgod',true),
  toxrill: C('unwritten','#34203b','#734d8c','#addb75','toxrill',true),
  angel: C('moth','#7f6d4f','#e2cfa5','#ffffff','angel',true),
  saproling: C('grub','#27542d','#68aa63','#d1f0a1','saproling',true),
  spider: C('moth','#2c2742','#55567b','#cad8d9','spiderboss',true),
  goblin: C('cinderling','#583026','#bb8052','#e8d38f','torchgoblin',true),
  zombie: C('riftstalker','#283e42','#5d8a8c','#c5d3bc','zombie'),
  slug: C('grub','#34213d','#76538b','#bbeb88','toxrill',true),
  wolf: C('hound','#283e45','#839b90','#f1e0b6','wolf'),
  golemFly: C('sentinel','#374354','#8c9ba4','#dbd8c0','titan'),
  golemVigilance: C('sentinel','#4a4537','#b3a17c','#f8e2a9','golem'),
  golemTrample: C('sentinel','#463c42','#987985','#e3c3d6','gearhulk'),
});

const rgb = hex => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
const mix = (a,b,k) => a.map((v,i)=>Math.round(v*(1-k)+b[i]*k));
function recolor(frame, config) {
  const g=frame.getContext('2d',{willReadFrequently:true}),img=g.getImageData(0,0,frame.width,frame.height);
  const lo=rgb(config.dark),mid=rgb(config.mid),hi=rgb(config.light),d=img.data;
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;
    const l=(d[i]*0.29+d[i+1]*0.58+d[i+2]*0.13)/255;
    const col=l<0.49?mix(lo,mid,l/0.49):mix(mid,hi,(l-0.49)/0.51);
    d[i]=col[0];d[i+1]=col[1];d[i+2]=col[2];
  }
  g.putImageData(img,0,0);
}
function overlay(g,w,h,{feature,dark,mid,light},view,anim,frame) {
  const back=view===1,attack=anim===2,walk=anim===1,cast=anim===3;
  const c=Math.min(w/80,h/88),bob=walk?(frame%2?1:-1):anim===0?(frame%2?0:1):0;
  g.save();g.translate(w/2,h*0.63+bob);g.scale(c,c);
  g.lineJoin='round';g.lineCap='round';
  const poly=(pts,fill=mid,stroke=dark,thick=2)=>{g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=thick;g.stroke();}};
  const ell=(x,y,rx,ry,fill=mid,stroke=dark,lw=2)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.stroke();}};
  const line=(a,b,col=light,lw=3)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.lineWidth=lw;g.strokeStyle=col;g.stroke()};
  const eye=(x,y,col=light)=>{if(!back)ell(x,y,1.5,1.5,col,null)};
  const lightLine=(a,b)=>line(a,b,light,2);
  const ears=()=>{poly([[-17,-17],[-22,-31],[-8,-21]],mid);poly([[16,-17],[22,-31],[8,-21]],mid)};
  const horns=()=>{poly([[-11,-17],[-25,-32],[-20,-20],[-14,-16]],light);poly([[11,-17],[25,-32],[20,-20],[14,-16]],light)};
  const body=()=>{poly([[-14,-17],[-17,13],[-10,22],[11,22],[17,13],[12,-17]],mid);poly([[-12,-16],[-9,1],[8,1],[12,-16]],dark,null);ell(0,-22,11,11,mid);eye(-5,-23);eye(5,-23)};
  const limb=(x,y,dx,dy)=>line([x,y],[x+dx,y+dy],dark,7);
  switch(feature){
    case 'caterpillar': for(let i=-2;i<=2;i++)ell(i*8,2+Math.sin(i)*2,6,9,i%2?mid:light);poly([[20,0],[31,-8],[27,4]],light);eye(18,-4);break;
    case 'wolf':case 'direwolf': ears();ell(0,-14,15,9,mid);poly([[0,-11],[23,-8],[27,-1],[9,-2]],light);ell(-5,-18,4,3,dark,null);eye(12,-16,feature==='direwolf'?'#ef8a61':light);line([-17,0],[-28,-4],mid,5);break;
    case 'bow': ears();line([-20,-26],[-25,14],light,3);line([-25,14],[-17,24],light,3);line([-20,-26],[-17,24],dark,1);poly([[8,-8],[27,-9],[30,-5],[6,-3]],light);eye(2,-23);break;
    case 'rhino': horns();poly([[-3,-26],[5,-41],[9,-24]],light);ell(0,-12,17,9,mid);poly([[-20,-6],[-28,4],[-18,13]],light);lightLine([-10,0],[10,4]);break;
    case 'stinger': poly([[-25,-22],[-32,-7],[-12,-9]],light);poly([[25,-22],[32,-7],[12,-9]],light);line([12,6],[25,22],mid,4);poly([[25,22],[29,30],[20,26]],light);eye(3,-18);break;
    case 'blightcaster': line([18,-28],[20,19],light,3);ell(18,-31,5,5,'#bd79e5');poly([[-17,-3],[18,-3],[15,22],[-18,22]],dark);poly([[-13,-10],[12,-10],[7,-1],[-8,-1]],mid);eye(4,-21);break;
    case 'torchgoblin': ears();ell(0,-20,12,11,mid);poly([[-11,-6],[11,-6],[15,16],[-15,16]],dark);line([18,5],[23,-25],'#5a3929',4);ell(23,-29,5,8,'#faaf4c');poly([[22,-37],[27,-29],[20,-27]],'#ffee80');eye(-5,-21);eye(5,-21);break;
    case 'minotaur': horns();ell(0,-13,16,15,mid);poly([[-18,-12],[-8,6],[8,6],[19,-12]],dark);line([-10,9],[-18,24],mid,7);line([10,9],[17,24],mid,7);eye(-4,-18);eye(5,-18);break;
    case 'spikeshot': ears();ell(0,-20,11,11,mid);line([12,-1],[26,-10],dark,6);line([14,-5],[29,-17],light,3);poly([[26,-17],[35,-22],[27,-12]],light);poly([[12,-12],[20,-10],[14,-4]],'#d78f61');eye(-4,-21);eye(4,-21);break;
    case 'alchemist': body();line([14,2],[22,-16],dark,4);ell(22,-19,5,7,'#f5bd65');ell(22,-26,3,7,'#f8e87d');poly([[-13,0],[-21,18],[17,18],[12,0]],dark);break;
    case 'wurm': body();ell(-13,0,13,8,light);ell(7,-7,15,10,dark);ell(11,-10,7,5,light);ell(-22,4,7,6,dark);line([-28,6],[-15,6],light,3);break;
    case 'gearhulk':case 'golem': body();ell(-15,-6,9,10,light);ell(15,-6,9,10,light);ell(0,-10,7,7,'#ff9f57');line([-7,-10],[7,-10],dark,2);break;
    case 'shinobi':body();poly([[-12,-26],[11,-26],[12,-17],[-10,-17]],dark);line([-23,-27],[20,18],light,3);line([-20,20],[27,-23],light,2);break;
    case 'duelist': poly([[-15,-18],[-29,-35],[-23,-4]],light);poly([[15,-18],[29,-35],[23,-4]],light);body();line([12,-4],[31,-19],light,2);break;
    case 'titan': poly([[-12,-8],[-32,-28],[-26,10]],light);poly([[12,-8],[32,-28],[26,10]],light);body();ell(0,-12,6,7,'#f5cb7b');break;
    case 'nemata': for(let i=-2;i<=2;i++){ell(i*9,-39+Math.abs(i)*6,14,12,i%2?mid:light);line([i*5,-12],[i*9,-26],dark,4)};poly([[-15,-7],[15,-7],[12,20],[-12,20]],mid);line([-10,12],[-23,24],dark,5);line([10,12],[23,24],dark,5);eye(-4,-6,'#e7f0a2');eye(4,-6,'#e7f0a2');break;
    case 'spiderboss':
      for(let i=-3;i<=3;i++){const y=-16+i*5;line([-8,y],[-28,-26+i*8],mid,5);line([-28,-26+i*8],[-32,9+i*3],light,3);line([8,y],[28,-26+i*8],mid,5);line([28,-26+i*8],[32,9+i*3],light,3)}
      ell(0,0,21,18,mid);ell(0,-23,14,12,dark);ell(-5,-26,3,3,'#f5b7e6',null);ell(5,-26,3,3,'#f5b7e6',null);ell(0,3,5,6,light);break;
    case 'dragon':
      poly([[-11,-11],[-36,-38],[-34,-3],[-15,1]],mid);poly([[11,-11],[36,-38],[34,-3],[15,1]],mid);
      line([-4,18],[-27,30],mid,6);poly([[-27,30],[-33,19],[-21,22]],light);
      poly([[-12,-19],[12,-19],[18,12],[0,24],[-18,12]],mid);ell(0,-27,14,10,mid);poly([[11,-30],[30,-28],[35,-20],[12,-20]],light);
      horns();eye(15,-28,'#ffe37f');
      if(cast||attack){poly([[32,-23],[39,-19],[34,-15],[40,-9],[27,-17]],'#f48a45');}
      break;
    case 'krenko':
      body();ears();poly([[-11,-37],[-4,-45],[6,-45],[14,-37],[10,-30],[-8,-30]],'#e2b46c');
      line([20,-9],[24,-46],dark,4);poly([[24,-44],[37,-38],[25,-25]],'#c56b4a');
      line([-13,7],[-25,19],light,3);break;
    case 'scarabgod':
      poly([[-13,-19],[-26,-33],[-21,5]],mid);poly([[13,-19],[26,-33],[21,5]],mid);
      body();ell(0,-28,15,13,dark);poly([[-14,-33],[-22,-43],[-15,-42],[-8,-29]],light);poly([[14,-33],[22,-43],[15,-42],[8,-29]],light);
      ell(0,-27,6,7,'#52c9d5');ell(-5,-32,2,2,light,null);ell(5,-32,2,2,light,null);break;
    case 'tox rill':case 'toxrill':
      ell(-7,8,29,16,mid);poly([[-28,12],[23,16],[32,25],[-25,25]],dark);ell(14,-2,12,14,mid);
      line([14,-12],[9,-33],mid,5);line([22,-12],[28,-37],mid,5);ell(9,-36,5,5,light);ell(28,-38,5,5,light);
      eye(9,-36,dark);eye(28,-38,dark);
      for(let i=0;i<4;i++)ell(-25+i*11,20,3,2,'#ade38a',null);break;
    case 'angel': poly([[-12,-4],[-31,-32],[-24,15]],light);poly([[12,-4],[31,-32],[24,15]],light);body();ell(0,-43,12,2,'#f7e49f');break;
    case 'saproling': ell(0,3,12,14,mid);poly([[-20,-8],[0,-35],[19,-8]],light);eye(-4,-6);eye(4,-6);break;
  }
  if(!back && ['bow','spikeshot','alchemist','minotaur','gearhulk'].includes(feature))ell(0,0,2,2,light,null);
  g.restore();
}
/** Append new namespaced sprite sheets and metadata to the loaded, original atlas. */
export function installRealCreatureModels(images,manifest) {
  if (typeof document === 'undefined') return 0;
  const rows=Object.keys(manifest.anims).length, views=manifest.views.length, cols=manifest.cols;
  for(const [name,config] of Object.entries(REAL_CREATURE_MODELS)) {
    const key='mtg_'+name,base=manifest.sprites[config.base],source=images[config.base];
    if(!base||!source)throw new Error('Missing original animation rig '+config.base+' for '+key);
    const width=config.custom && ['arasta','drakuseth','krenko','scarab','toxrill'].includes(name)?96:base.w;
    const height=config.custom && ['arasta','drakuseth','krenko','scarab','toxrill'].includes(name)?96:base.h;
    const sheet=document.createElement('canvas');sheet.width=width*cols;sheet.height=height*rows*views;
    const sctx=sheet.getContext('2d');sctx.imageSmoothingEnabled=false;
    for(let view=0;view<views;view++)for(const anim of Object.values(manifest.anims))for(let frame=0;frame<cols;frame++){
      const cell=document.createElement('canvas');cell.width=width;cell.height=height;
      const cctx=cell.getContext('2d');cctx.imageSmoothingEnabled=false;
      const srcX=frame*base.w,srcY=(view*rows+anim.row)*base.h;
      if(!config.custom) {
        cctx.drawImage(source,srcX,srcY,base.w,base.h,0,0,width,height);
        recolor(cell,config);
      }
      // Every frame, including the non-looping hurt/cast frames, is fully populated.
      overlay(cctx,width,height,config,view,anim.row,frame);
      sctx.drawImage(cell,frame*width,(view*rows+anim.row)*height);
    }
    images[key]=sheet;
    manifest.sprites[key]={w:width,h:height,pivotY:height-3,hover:base.hover||0,artWidth:Math.max(0,width-4),bleedX:2,generated:true};
  }
  return Object.keys(REAL_CREATURE_MODELS).length;
}