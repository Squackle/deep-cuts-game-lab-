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
  cast:[0,4,4,1],   // v1.6.0: raised-hand casting only; pose 5 is the punch extension and belongs to attack
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
/** Clean detached atlas-edge shards from the supplied Angel source without redrawing its real poses.
 * Frame-local 8-connectivity preserves wings, robe, sword and facial pixels in the main figure.
 * This is performed once at asset intake (not during rendering), with no gameplay randomness. */
export function stripAngelAtlasDebris(image, size) {
  const out = document.createElement('canvas'); out.width = image.width; out.height = image.height;
  const g = out.getContext('2d', { willReadFrequently: true }); g.drawImage(image, 0, 0);
  const pixels = g.getImageData(0, 0, out.width, out.height), data = pixels.data;
  const cols = out.width / size;
  for (let pose = 0; pose < 7; pose++) {
    const ox = (pose % cols) * size, oy = Math.floor(pose / cols) * size;
    const seen = new Uint8Array(size * size); const pieces = [];
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const start = py * size + px, si = ((oy + py) * out.width + ox + px) * 4 + 3;
      if (seen[start] || data[si] === 0) continue;
      const stack = [start], piece = []; seen[start] = 1;
      while (stack.length) {
        const q = stack.pop(), x = q % size, y = Math.floor(q / size); piece.push(q);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!dx && !dy || nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const ni = ny * size + nx, alpha = ((oy + ny) * out.width + ox + nx) * 4 + 3;
          if (!seen[ni] && data[alpha]) { seen[ni] = 1; stack.push(ni); }
        }
      }
      pieces.push(piece);
    }
    // The authored Angel occupies thousands of connected pixels; disconnected edge shards
    // have at most a few dozen. Keep the largest connected figure in every pose.
    const main = pieces.sort((a,b) => b.length-a.length)[0];
    for (const piece of pieces) if (piece !== main && piece.length < 150) for (const q of piece) {
      const i = ((oy + Math.floor(q / size)) * out.width + ox + q % size) * 4;
      data[i] = data[i+1] = data[i+2] = data[i+3] = 0;
    }
  }
  g.putImageData(pixels, 0, 0);
  return out;
}
export function buildBenchmarkSheet(image,asset){
  validateBenchmarkAsset(image,asset);
  if (asset.key === 'angel') image = stripAngelAtlasDebris(image, asset.size);
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
  // The native Blank now has 128px pose-aware anatomical graft and Equipment layers.
  // Validate its base and skin-material mask alongside the other benchmarks.
  const staged=await Promise.all(BENCHMARKS.map(async asset=>{
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
      qualityStatus:'native front-pose benchmark; rear animation and cast/hurt require authored frames'};
  }
  return staged.length;
}
/**
 * v1.8.0 painted CREATURE art intake. Any sheet listed in assets/hd2d/creatures/index.json in the SAME 4x2 pose layout
 * as the benchmarks (idle A, idle B, walk A, walk B / wind-up, strike, back view) REPLACES the generated model for that
 * runtime identity — the code-drawn placeholder is never shown for it again. Validation is all-or-nothing per sheet:
 * a wrong size or missing file leaves that creature on its previous art and reports it in CREATURE_ART_STATUS.
 * index.json: { "schemaVersion": 1, "creatures": [ { "key": "grub", "size": 96 }, ... ] }
 * Painted creature sheets face screen-LEFT in front poses (facesRight=false).
 */
export const CREATURE_SIZES = Object.freeze([96, 128, 192]);
export const CREATURE_ART_STATUS = { installed: [], rejected: [] };
export const runtimeKeyFor = (key, sprites) => sprites['mtg_' + key] ? 'mtg_' + key : sprites[key] ? key : null;
export function validateCreatureIndex(index) {
  if (!index || index.schemaVersion !== 1 || !Array.isArray(index.creatures)) throw new Error('creature art index: expected schemaVersion 1 and creatures[]');
  const seen = new Set(), validKey = k => typeof k === 'string' && /^[a-z][A-Za-z0-9]*$/.test(k);
  return index.creatures.map((c, i) => {
    if (!c || !validKey(c.key)) throw new Error(`creature art index: creatures[${i}] invalid key`);
    if (c.art !== undefined && !validKey(c.art)) throw new Error(`creature art index: ${c.key} invalid art reference`);
    if (seen.has(c.key)) throw new Error('creature art index: duplicate ' + c.key); seen.add(c.key);
    if (!CREATURE_SIZES.includes(c.size)) throw new Error(`creature art index: ${c.key} size must be one of ${CREATURE_SIZES.join('/')}`);
    return { key: c.key, size: c.size, pivot: c.size - 5, file: `creatures/${c.art || c.key}-poses.png` };
  });
}
export async function installCreatureArt(images, manifest, loadPng, readIndex) {
  CREATURE_ART_STATUS.installed = []; CREATURE_ART_STATUS.rejected = [];
  if (typeof document === 'undefined') return 0;
  let entries = [];
  try { entries = validateCreatureIndex(await readIndex()); } catch (e) { CREATURE_ART_STATUS.rejected.push({ key: '*', reason: String(e.message || e) }); return 0; }
  // Alias entries share the same decoded image; never issue redundant network loads.
  const sourceCache = new Map();
  const staged = await Promise.all(entries.map(async asset => {
    const runtime = runtimeKeyFor(asset.key, manifest.sprites);
    if (!runtime) return { asset, error: 'unknown runtime identity' };
    try {
      if (!sourceCache.has(asset.file)) sourceCache.set(asset.file, loadPng('hd2d/' + asset.file));
      const src = await sourceCache.get(asset.file);
      validateBenchmarkAsset(src, { ...asset, key: runtime });
      return { asset, runtime, sheet: buildBenchmarkSheet(src, asset) };
    }
    catch (e) { return { asset, error: String(e.message || e) }; }
  }));
  for (const st of staged) {
    if (st.error) { CREATURE_ART_STATUS.rejected.push({ key: st.asset.key, reason: st.error }); continue; }
    const prior = manifest.sprites[st.runtime];
    images[st.runtime] = st.sheet;
    manifest.sprites[st.runtime] = { ...prior, w: st.asset.size, h: st.asset.size, pivotY: st.asset.pivot, pixelScale: 0.5, cols: COLS,
      views: BENCHMARK_VIEWS, anims: BENCHMARK_STATES, premium: true, painted: true, facesRight: false,
      artPack: 'painted-creatures-v1', artSource: st.asset.file, qualityStatus: 'painted HD-2D sheet' };
    delete manifest.sprites[st.runtime].bounds; delete manifest.sprites[st.runtime].boundsAll;
    CREATURE_ART_STATUS.installed.push(st.runtime);
  }
  return CREATURE_ART_STATUS.installed.length;
}
