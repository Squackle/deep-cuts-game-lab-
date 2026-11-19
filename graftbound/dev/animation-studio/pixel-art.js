// Pyroclasm / red fire board-wipe Animation Lab original pixel art. No copyrighted Magic artwork.
// Rasterized once into small nearest-neighbor sprites, never vector flame triangles.
// Pure pixel generation is Node-testable; DOM canvas is only used in createPixelAtlas().
const rgba = hex => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
const ASH = ['#27262a','#48474d','#68666a','#8a888b','#aca9ab','#d0cdcb'].map(rgba);
const RED = rgba('#a8290b'), ORANGE = rgba('#ee5811');
const AMBER = rgba('#ff9826'), GOLD = rgba('#ffd15b'), HOT = rgba('#ffedaa');
const hash = (a,b,s=0) => {
  let n=Math.imul(a+41,374761393)+Math.imul(b+73,668265263)+Math.imul(s+97,2246822519);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
};
function raster(width,height) {
  const data=new Uint8ClampedArray(width*height*4);
  const put=(x,y,color,alpha=255) => {
    x=Math.round(x);y=Math.round(y);
    if(x<0||y<0||x>=width||y>=height||alpha<=0)return;
    const i=(y*width+x)*4;
    const a=Math.max(0,Math.min(255,Math.round(alpha)));
    if(data[i+3]>a)return; // Bright core wins over faint trailing color.
    data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=a;
  };
  return {width,height,data,put};
}
// Approved Ash A: low light-gray powder mound, dusty falloff and loose flecks.
// It is intentionally NOT a charcoal bonfire or an ember-flame effect.
export function makeAshA(seed=1) {
  const img=raster(48,29),cx=24,base=23;
  // Uneven powder shadow, then scattered ash around the edges.
  for(let x=5;x<=43;x++){
    const taper=Math.max(0,1-Math.abs(x-cx)/20);
    for(let y=22;y<=24;y++){
      if(hash(x,y,seed) > .24+.73*taper)continue;
      img.put(x,y,ASH[hash(x,15,seed)>.5?0:1], 230);
    }
  }
  for(let x=9;x<=39;x++){
    const q=Math.abs(x-cx)/16;
    const peak=Math.max(0,Math.round(12*(1-Math.pow(q,1.4))+1.6*(hash(x,6,seed)-.5)));
    const top=base-peak;
    for(let y=top;y<=base;y++){
      const edge=y-top;
      const value=hash(x,y,seed);
      const shade=edge<2?(value>.48?5:4):edge<5?(value>.7?4:value>.18?3:2):(value>.63?3:value>.22?2:1);
      img.put(x,y,ASH[shade]);
      if(edge<4 && value>.95)img.put(x,y,ASH[5]);
    }
  }
  // A broken pale central ridge is the visual hallmark of Ash A.
  for(let x=17;x<=31;x++){
    const rise=Math.round(11*(1-Math.pow(Math.abs(x-cx)/16,1.4)));
    const y=base-rise;
    if(hash(x,y,seed+23)>.30)img.put(x,y,ASH[5]);
  }
  for(let i=0;i<30;i++){
    const x=4+Math.floor(hash(i,17,seed)*41);
    const y=18+Math.floor(hash(i,30,seed)*9);
    if(x>13&&x<36&&y<22)continue;
    img.put(x,y,ASH[2+Math.floor(hash(i,41,seed)*4)]);
  }
  return img;
}
// Option B: a single hot pixel-cluster ember which detaches and drifts upward.
// Discrete frames replace old antialiased line-streak particles.
export function makeRisingEmber(frame=0) {
  const f=((Math.floor(frame)%8)+8)%8,img=raster(9,13);
  const x=4+Math.round(Math.sin(f*.9)*1),y=10-f;
  const alpha=Math.round(255*(1-.77*Math.pow(f/7,2)));
  const put=(dx,dy,col,a=1)=>img.put(x+dx,y+dy,col,alpha*a);
  put(0,0,HOT);
  put(-1,0,ORANGE,.95);put(1,0,AMBER,.95);
  put(0,-1,AMBER);put(0,1,RED,.8);
  if(f<5){put(-1,1,RED,.5);put(1,1,ORANGE,.45);}
  if(f<3)put(0,2,RED,.45);
  if(f>1&&f<7)img.put(x+(f%2?2:-2),y+2,RED,alpha*.35);
  return img;
}
// Option C: short S-curved yellow/orange tongue built from deliberate pixel
// clusters. No bezier/path triangle, rotating polygon or soft gradient.
export function makeCurlingFlame(frame=0) {
  const f=((Math.floor(frame)%8)+8)%8,img=raster(17,23);
  const phase=f*Math.PI/4;
  const height=13+Math.round(2+2*Math.sin(phase-.5));
  const base=21,top=base-height;
  for(let y=base;y>=top;y--){
    const p=(base-y)/height;
    // Lateral movement strengthens toward the top, creating a hooked curl.
    const center=8+Math.round(2.5*Math.sin(phase*.48+p*4.9)+1.1*Math.sin(p*9.4+phase));
    const radius=p<.20?3:p<.60?2:p<.84?2:1;
    for(let dx=-radius;dx<=radius;dx++){
      if(p>.69&&Math.abs(dx)===radius&&hash(y,dx,f)<.40)continue;
      const dist=Math.abs(dx);
      const v=hash(y,dx,f);
      const color=dist===radius?(p>.74?RED:ORANGE):
        p>.81?(v>.45?AMBER:ORANGE):
        p>.53?(v>.34?GOLD:AMBER):
        dist===0?(v>.4?HOT:GOLD):AMBER;
      img.put(center+dx,y,color,p>.86?210:255);
    }
  }
  // A shorter secondary lick gives the silhouette two asymmetrical tips,
  // avoiding a monotonous cone even when several sprites overlap.
  if(f===1||f===2||f===5||f===6){
    for(let i=0;i<5;i++){
      const y=base-4-i;
      const x=11+Math.round(Math.sin(i*.66+phase));
      img.put(x,y,i>2?ORANGE:AMBER,235);
      if(i<3)img.put(x-1,y,RED,230);
    }
  }
  return img;
}
export function makeArtFrames() {
  return {
    ash:makeAshA(3),
    embers:Array.from({length:8},(_,i)=>makeRisingEmber(i)),
    flames:Array.from({length:8},(_,i)=>makeCurlingFlame(i))
  };
}
function asCanvas(pixels,doc) {
  const c=doc.createElement('canvas');
  c.width=pixels.width;c.height=pixels.height;
  const ctx=c.getContext('2d');
  const im=ctx.createImageData(c.width,c.height);
  im.data.set(pixels.data);
  ctx.putImageData(im,0,0);
  return c;
}
export function createPixelAtlas(doc=document) {
  const data=makeArtFrames();
  return {
    ash:asCanvas(data.ash,doc),
    embers:data.embers.map(p=>asCanvas(p,doc)),
    flames:data.flames.map(p=>asCanvas(p,doc))
  };
}
