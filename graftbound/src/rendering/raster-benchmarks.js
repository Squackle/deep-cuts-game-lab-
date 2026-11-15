/**
 * GRAFTBOUND owner-approved painterly HD-2D raster benchmark intake.
 * Genuine authored poses supplied as PNG source frames in assets/hd2d/benchmarks.
 * The runtime atlas is composed ONCE at asset load, never during simulation/render.
 * Front-facing idle, gait and strike use genuinely different source illustrations.
 * Rear motion + cast/hurt need further authored frames before final art acceptance.
 */
export const BENCHMARK_STATES = Object.freeze({
  idle:   {row:0,frames:4,fps:5,loop:true},
  walk:   {row:1,frames:4,fps:10,loop:true},
  attack: {row:2,frames:4,fps:12,loop:false},
  cast:   {row:3,frames:4,fps:8,loop:false},
  hurt:   {row:4,frames:4,fps:9,loop:false}
});
export const BENCHMARK_POSES = Object.freeze({
  idle:[0,1,0,1],
  walk:[2,3,2,3],
  attack:[4,5,5,4],
  cast:[0,4,5,1],
  hurt:[3,3,1,0]
});
export const BENCHMARKS=Object.freeze([
  {key:'blank',file:'blank-poses.png',mask:'blank-skin-mask.png',size:128,pivot:123},
  {key:'mtg_friendlySoldier',file:'soldier-poses.png',mask:'soldier-skin-mask.png',size:128,pivot:123},
  {key:'mtg_friendlySquirrel',file:'squirrel-poses.png',size:96,pivot:91}
]);
export const BENCHMARK_VIEWS=Object.freeze(['front','back']);
const COLS=4;
const POSES_X=COLS;
const POSES_Y=2;
export function validateBenchmarkAsset(image,asset){
  if(!image||image.width!==asset.size*POSES_X||image.height!==asset.size*POSES_Y)
    throw new Error(`GRAFTBOUND HD-2D: source atlas for ${asset.key} must be ${asset.size*POSES_X}x${asset.size*POSES_Y}`);
  return true;
}
export function poseFor(state,frame,view){
  if(!(state in BENCHMARK_POSES)) throw new Error(`Unknown benchmark state ${state}`);
  if(!Number.isInteger(frame)||frame<0||frame>=COLS)throw new Error('Invalid benchmark frame');
  if(view!==0&&view!==1)throw new Error('Invalid benchmark directional view');
  return view===1?6:BENCHMARK_POSES[state][frame];
}
function canvasForAsset(asset){
  const el=document.createElement('canvas');el.width=asset.size*COLS;
  el.height=asset.size*Object.keys(BENCHMARK_STATES).length*BENCHMARK_VIEWS.length;
  return el;
}
/** Translate a full authored rear pose gently; intentionally NOT claimed as fully animated rear anatomy. */
export function paintBenchmarkFrame(ctx,image,asset,state,frame,view){
  const pose=poseFor(state,frame,view),N=asset.size;
  const srcX=(pose%COLS)*N,srcY=Math.floor(pose/COLS)*N;
  const x=frame*N,y=(view*Object.keys(BENCHMARK_STATES).length+BENCHMARK_STATES[state].row)*N;
  ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
  if(view===1){
    const walk=state==='walk',attack=state==='attack',hurt=state==='hurt';
    const sway=walk?[-1,1,2,-1][frame]:attack?[0,1,3,1][frame]:hurt?[0,-2,1,0][frame]:0;
    const rise=walk?[0,-2,-1,0][frame]:0;
    ctx.translate(sway,rise);
  }
  ctx.drawImage(image,srcX,srcY,N,N,0,0,N,N);
  ctx.restore();
}
export function buildBenchmarkSheet(image,asset){
  validateBenchmarkAsset(image,asset);
  const output=canvasForAsset(asset),g=output.getContext('2d');
  if(!g)throw new Error('Canvas 2D required for GRAFTBOUND source composition');
  for(let view=0;view<BENCHMARK_VIEWS.length;view++)
    for(const state of Object.keys(BENCHMARK_STATES))
      for(let frame=0;frame<COLS;frame++)paintBenchmarkFrame(g,image,asset,state,frame,view);
  return output;
}
/** Stage ALL files before replacing any runtime sprite, to avoid partial visual state. */
export async function installRasterBenchmarks(images,manifest,loadPng){
  if(typeof document==='undefined')return 0;
  // Blank artwork is staged in the repo but NOT installed: its 64px graft/Equipment layers fail painterly QA.
  const staged=await Promise.all(BENCHMARKS.filter(asset=>asset.key!=='blank').map(async asset=>{
    if(!manifest.sprites[asset.key])throw new Error('Missing existing GRAFTBOUND runtime identity '+asset.key);
    const source=await loadPng('hd2d/benchmarks/'+asset.file);
    validateBenchmarkAsset(source,asset);
    let skin=null;
    if(asset.mask){skin=await loadPng('hd2d/benchmarks/'+asset.mask);validateBenchmarkAsset(skin,asset);}
    return {asset,sheet:buildBenchmarkSheet(source,asset),skin:skin?buildBenchmarkSheet(skin,asset):null};
  }));
  for(const {asset,sheet,skin} of staged){
    const prior=manifest.sprites[asset.key];
    images[asset.key]=sheet;
    if(skin)images[asset.key==='blank'?'blank:mask':'mtg_friendlySoldier:skinMask']=skin;
    manifest.sprites[asset.key]={...prior,w:asset.size,h:asset.size,pivotY:asset.pivot,
      pixelScale:(prior.h / asset.size)*(prior.pixelScale||1),cols:COLS,
      views:BENCHMARK_VIEWS,anims:BENCHMARK_STATES,premium:true,
      artPack:'owner-raster-benchmarks-v1',artSource:asset.file,
      qualityStatus:'front-pose-benchmark; rear animation and cast/hurt require authored frames'};
  }
  return staged.length;
}