// Composition-preserving dye solver for the Chromatic Cauldron.
// Each cell stores six real pigment fractions. We advect and mix fractions,
// not final RGB values, and explicitly restore each mana color's overall
// concentration after every fluid step. Stirring cannot erase a pigment.
import {COLOR_ORDER,COLOR_RGB} from "./fluid-palette.js";

const TAU=Math.PI*2;
const C=COLOR_ORDER.length;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const idx=(x,y,n)=>y*n+x;
export function ensurePigments(grid){
 if(grid.pigments)return;
 const count=grid.n*grid.n;
 grid.pigments=COLOR_ORDER.map(()=>new Float32Array(count));
 grid.nextPigments=COLOR_ORDER.map(()=>new Float32Array(count));
 grid.turbulence=new Float32Array(count);
 grid.pigmentTargets=new Float64Array(C);
 grid.coloredCellCount=0;
 grid.pigmentLive=false;
}
export function initializePigments(grid,orbs){
 ensurePigments(grid);
 const counts=COLOR_ORDER.map(c=>orbs.reduce((n,o)=>n+(o?.color===c?1:0),0));
 const total=counts.reduce((a,b)=>a+b,0);
 const group=counts.map((count,color)=>({count,color})).filter(g=>g.count);
 let running=0;
 const stops=group.map(g=>(running+=g.count/Math.max(1,total)));
 const size=grid.n,mid=(size-1)/2;
 let activeCount=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=idx(x,y,size);
  for(let c=0;c<C;c++)grid.pigments[c][i]=0;
  if(!grid.active[i]||!total)continue;
  activeCount++;
  const dx=x-mid,dy=y-mid,dist=Math.hypot(dx,dy);
  const angle=(Math.atan2(dy,dx)/TAU+1)%1;
  const wobble=group.length===1?0:.007*Math.sin(dist*.28+angle*19)+.004*Math.sin(y*.19+x*.11);
  const fraction=(angle+wobble+1)%1;
  let selected=0;
  while(selected<stops.length-1&&fraction>=stops[selected])selected++;
  grid.pigments[group[selected].color][i]=1;
 }
 grid.coloredCellCount=activeCount;
 for(let c=0;c<C;c++)grid.pigmentTargets[c]=total?counts[c]/total:0;
 grid.turbulence.fill(0);
 grid.pigmentLive=total>0;
 if(total)updateRgbFromPigments(grid);
 return {total,counts,group};
}
export function updateRgbFromPigments(grid){
 const {pigments,active,r,g,b,mass}=grid;
 for(let i=0;i<active.length;i++){
  if(!active[i]){r[i]=g[i]=b[i]=mass[i]=0;continue;}
  let rr=0,gg=0,bb=0,sum=0;
  for(let c=0;c<C;c++){
   const n=pigments[c][i];
   sum+=n;
   rr+=COLOR_RGB[COLOR_ORDER[c]][0]*n;
   gg+=COLOR_RGB[COLOR_ORDER[c]][1]*n;
   bb+=COLOR_RGB[COLOR_ORDER[c]][2]*n;
  }
  const inv=1/Math.max(sum,1e-9);
  mass[i]=1;r[i]=rr*inv;g[i]=gg*inv;b[i]=bb*inv;
 }
}
function sample(field,active,n,x,y,fallback){
 x=clamp(x,0,n-1.001);y=clamp(y,0,n-1.001);
 const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
 const a=idx(x0,y0,n),b=a+1,c=a+n,d=c+1;
 const av=active[a]?field[a]:fallback,bv=active[b]?field[b]:fallback;
 const cv=active[c]?field[c]:fallback,dv=active[d]?field[d]:fallback;
 return (av*(1-fx)+bv*fx)*(1-fy)+(cv*(1-fx)+dv*fx)*fy;
}
export function mixPigments(grid,dt=1){
 if(!grid.pigmentLive)return;
 const {n,active,pigments:colors,nextPigments:next,vx,vy,turbulence,pigmentTargets:target}=grid;
 // Semi-Lagrangian transport moves all six pigments by the SAME water velocity.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=idx(x,y,n);if(!active[i]){for(let c=0;c<C;c++)next[c][i]=0;continue;}
  const px=x-vx[i]*dt*.92,py=y-vy[i]*dt*.92;
  for(let c=0;c<C;c++)next[c][i]=sample(colors[c],active,n,px,py,colors[c][i]);
 }
 // Stirring increases local dye diffusion and creates visible purple/green/etc.
 // trails. This is a diffusion of *pigment fractions*, not a color override.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=idx(x,y,n);if(!active[i])continue;
  const left=i-1,right=i+1,up=i-n,down=i+n;
  const perFrame=clamp(.013+turbulence[i]*.060,.013,.32);
  const mixing=1-Math.pow(1-perFrame,dt);
  const count=(active[left]?1:0)+(active[right]?1:0)+(active[up]?1:0)+(active[down]?1:0);
  let cellSum=0;
  for(let c=0;c<C;c++){
   const neighboring=(active[left]?next[c][left]:0)+(active[right]?next[c][right]:0)+(active[up]?next[c][up]:0)+(active[down]?next[c][down]:0);
   const avg=count?neighboring/count:next[c][i];
   const value=next[c][i]*(1-mixing)+avg*mixing;
   colors[c][i]=Math.max(0,value);
   cellSum+=colors[c][i];
  }
  if(cellSum>1e-8){
   const inv=1/cellSum;
   for(let c=0;c<C;c++)colors[c][i]*=inv;
  }
  turbulence[i]*=Math.pow(.93,dt);
 }
 // Correct transport drift through bounded iterative proportional fitting.
 // This preserves each individual mana color even after very long stirring.
 rebalancePigments(grid,3);
}

export function rebalancePigments(grid,passes=3){
 if(!grid.pigmentLive)return;
 const {active,pigments:colors,pigmentTargets:target}=grid;
  const totals=grid._colorTotals||(grid._colorTotals=new Float64Array(C));
  const factors=grid._colorFactors||(grid._colorFactors=new Float64Array(C));
  for(let iteration=0;iteration<passes;iteration++){
   totals.fill(0);
   for(let i=0;i<active.length;i++)if(active[i]){
    for(let c=0;c<C;c++)totals[c]+=colors[c][i];
   }
   for(let c=0;c<C;c++)factors[c]=target[c]>0?
    clamp(target[c]*grid.coloredCellCount/Math.max(totals[c],1e-10),.65,1.55):0;
   for(let i=0;i<active.length;i++)if(active[i]){
    let sum=0;
    for(let c=0;c<C;c++){colors[c][i]*=factors[c];sum+=colors[c][i];}
    if(sum>1e-8)for(let c=0;c<C;c++)colors[c][i]/=sum;
   }
  }
 updateRgbFromPigments(grid);
}
// Inject a NEW mana into the existing water without resetting stirred dye.
// Its wedge occupies roughly one new part of the whole bowl, while the other
// regions keep their existing pigments and mixtures.
export function introducePigment(grid,orb,allOrbs){
 if(!grid.pigmentLive)return initializePigments(grid,allOrbs);
 const ci=COLOR_ORDER.indexOf(orb?.color);
 if(ci<0)return;
 const list=allOrbs||[];
 const total=list.length;
 if(!total)return;
 const n=grid.n,mid=(n-1)/2;
 const fraction=1/total;
 const id=String(orb.id||"");
 const seed=id.split("").reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
 const at=(seed*.037+ci*.113)%1;
 const fade=Math.min(.0075,fraction*.08);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=idx(x,y,n);
  if(!grid.active[i])continue;
  const dx=x-mid,dy=y-mid,d=Math.hypot(dx,dy);
  const angle=(Math.atan2(dy,dx)/TAU+1)%1;
  const wave=.009*Math.sin(d*.25+angle*17)+.003*Math.sin(x*.21+y*.13);
  const offset=(angle-at+wave+1)%1;
  const left=clamp(offset/Math.max(fade,1e-8),0,1);
  const right=clamp((fraction-offset)/Math.max(fade,1e-8),0,1);
  const amount=Math.min(left,right)*.995;
  for(let c=0;c<C;c++)grid.pigments[c][i]*=1-amount;
  grid.pigments[ci][i]+=amount;
 }
 for(let c=0;c<C;c++){
  const code=COLOR_ORDER[c];
  grid.pigmentTargets[c]=list.filter(item=>item.color===code).length/total;
 }
 rebalancePigments(grid,5);
}

export function pigmentStatistics(grid){
 if(!grid.pigmentLive)return null;
 const totals=COLOR_ORDER.map(()=>0);
 let blendedCells=0;
 for(let i=0;i<grid.active.length;i++)if(grid.active[i]){
  let strongest=0;
  for(let c=0;c<C;c++){
   const p=grid.pigments[c][i];totals[c]+=p;
   if(p>strongest)strongest=p;
  }
  if(strongest<.88)blendedCells++;
 }
 const ratio=Object.fromEntries(COLOR_ORDER.map((c,i)=>[c,totals[i]/grid.coloredCellCount]));
 return {ratio,blendedCells,pixelCount:grid.coloredCellCount};
}
export function stirPigmentWake(grid,x,y,dx,dy){
 if(!grid.pigmentLive)return;
 const n=grid.n,radius=15,r2=radius*radius,mag=Math.min(12,Math.hypot(dx,dy));
 if(mag<.05)return;
 for(let py=Math.max(1,Math.floor(y-radius));py<Math.min(n-1,Math.ceil(y+radius));py++)
  for(let px=Math.max(1,Math.floor(x-radius));px<Math.min(n-1,Math.ceil(x+radius));px++){
   const i=idx(px,py,n),rx=px-x,ry=py-y,d2=rx*rx+ry*ry;
   if(!grid.active[i]||d2>=r2)continue;
   const impact=(1-d2/r2)**2;
   // Momentum follows the cursor, plus a localized rotary eddy.
   grid.vx[i]+=(dx*.29-ry*.027*mag)*impact;
   grid.vy[i]+=(dy*.29+rx*.027*mag)*impact;
   grid.turbulence[i]=clamp(grid.turbulence[i]+mag*.28*impact,0,5);
  }
}
