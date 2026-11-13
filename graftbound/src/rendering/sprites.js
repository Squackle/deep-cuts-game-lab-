import { installRealCreatureModels } from './real-creature-models.js';
// Asset loading: sprite sheets + manifest, evolution layers, terrain atlas (+ pre-filtered blur atlas), foliage, card art.
const BASE = new URL('../../assets/', import.meta.url).href;
function img(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Failed to load ' + src)); i.src = BASE + src; }); }
async function json(src) { const r = await fetch(BASE + src); if (!r.ok) throw new Error('Failed to load ' + src); return r.json(); }
export async function loadAssets(onProgress = () => {}) {
  const manifest = await json('sprites/manifest.json');
  const jobs = []; const images = {}, parts = {};
  for (const [k, s] of Object.entries(manifest.sprites)) {
    jobs.push(img('sprites/' + s.file).then(i => (images[k] = i)));
    if (s.mask) jobs.push(img('sprites/' + s.mask).then(i => (images[k + ':mask'] = i)));
  }
  for (const [name, tiers] of Object.entries(manifest.parts)) for (const [tier, layers] of Object.entries(tiers)) for (const [layer, file] of Object.entries(layers))
    jobs.push(img('sprites/' + file).then(i => { parts[`${name}:${tier}:${layer}`] = i; }));
  jobs.push(img('textures/terrain.png').then(i => (images.terrain = i)));
  jobs.push(img('textures/terrain_blur.png').then(i => (images.terrainBlur = i)));
  jobs.push(img('sprites/foliage.png').then(i => (images.foliage = i)));
  let done = 0; jobs.forEach(j => j.then(() => onProgress(++done / jobs.length)));
  await Promise.all(jobs);
  installRealCreatureModels(images,manifest);
  return { manifest, images, parts, base: BASE };
}