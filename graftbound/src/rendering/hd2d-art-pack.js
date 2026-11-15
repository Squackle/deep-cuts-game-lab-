/**
 * Native-resolution HD-2D sprite-pack contract.
 *
 * This loader accepts only independently authored RGBA frame sheets for *existing*
 * runtime identities. It does not upscale legacy sprites, manufacture artwork,
 * change simulation RNG, or declare visual quality accepted.
 */
export const REQUIRED_STATES = Object.freeze(['idle','walk','attack','cast','hurt']);
const REQUIRED_VIEWS = ['front','back'];
const FOUR_VIEWS = ['front','back','left','right'];
const isInt = n => Number.isSafeInteger(n);
const error = (message) => { throw new Error('HD-2D art pack: ' + message); };

export function validateHd2dManifest(pack, runtimeSprites) {
  if (!pack || pack.schemaVersion !== 1 || !Array.isArray(pack.units)) error('expected schemaVersion 1 and units array');
  const keys = new Set();
  return pack.units.map((unit, i) => {
    const id = 'units[' + i + ']';
    if (!unit || typeof unit !== 'object') error(id + ' must be an object');
    if (typeof unit.key !== 'string' || !/^[a-z][a-z0-9_]*$/.test(unit.key)) error(id + ' has invalid identity');
    if (keys.has(unit.key)) error('duplicate identity ' + unit.key);
    keys.add(unit.key);
    if (!runtimeSprites?.[unit.key]) error('unknown runtime identity ' + unit.key);
    // The current hero graft, skin and equipment compositors are 64px-specific.
    // Silently replacing the Blank would detach all of those layers.
    if (unit.key === 'blank') error('Blank needs a resolution-aware graft, skin-mask and equipment compositor first');
    if (typeof unit.file !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_/-]*\.png$/.test(unit.file) ||
        unit.file.split('/').some(s => s === '' || s === '.' || s === '..')) error(id + ' has unsafe PNG path');
    const { frameWidth:w, frameHeight:h, columns } = unit;
    if (!isInt(w) || !isInt(h) || w < 32 || h < 32 || w > 512 || h > 512 || !isInt(columns) || columns < 4 || columns > 24)
      error(id + ' has invalid native frame dimensions/columns');
    if (!isInt(unit.pivotY) || unit.pivotY < 0 || unit.pivotY > h) error(id + ' must declare a foot pivot');
    if (unit.pivotX !== undefined && (!isInt(unit.pivotX) || unit.pivotX < 0 || unit.pivotX > w)) error(id + ' has invalid horizontal pivot');
    const views = unit.views;
    if (!Array.isArray(views) || !(views.length === 2 || views.length === 4) ||
        (views.length === 2 ? REQUIRED_VIEWS : FOUR_VIEWS).some(v => !views.includes(v)) ||
        new Set(views).size !== views.length) error(id + ' requires distinct front/back or four directional views');
    const states = unit.animations;
    if (!states || typeof states !== 'object' || Array.isArray(states)) error(id + ' requires animation metadata');
    for (const state of REQUIRED_STATES) if (!states[state]) error(id + ' missing required state ' + state);
    const rows = [];
    for (const [name, data] of Object.entries(states)) {
      if (!/^[a-z][a-z0-9]*$/.test(name) || !data || !isInt(data.row) || data.row < 0 ||
          !isInt(data.frames) || data.frames < 2 || data.frames > columns ||
          typeof data.fps !== 'number' || !Number.isFinite(data.fps) || data.fps <= 0 || data.fps > 60 ||
          typeof data.loop !== 'boolean') error(id + ' invalid animation ' + name);
      rows.push(data.row);
    }
    rows.sort((a,b) => a-b);
    if (rows.some((row, index) => row !== index)) error(id + ' animation rows must start at 0 and be contiguous');
    if (unit.anchors !== undefined && (typeof unit.anchors !== 'object' || Array.isArray(unit.anchors) || !unit.anchors)) error(id + ' anchors must be an object');
    return { ...unit, views: [...views], animations: structuredClone(states) };
  });
}

/** Camera-relative view: four-view sheets never fake an asymmetric side by mirroring. */
export function chooseSpriteDirection(views, awayDot, rightDot) {
  const hasSides = views.includes('left') && views.includes('right');
  const facing = hasSides && Math.abs(rightDot) > Math.abs(awayDot)
    ? (rightDot > 0 ? 'right' : 'left')
    : (awayDot > 0.05 ? 'back' : 'front');
  return { index: views.indexOf(facing), flip: !hasSides && rightDot > 0.05 };
}

/** Stage/validate every image before mutating the live manifest: no half-loaded packs. */
export async function installHd2dArtPack(images, manifest, readPack, loadPng) {
  const units = validateHd2dManifest(await readPack(), manifest.sprites);
  const staged = await Promise.all(units.map(async (unit) => {
    const image = await loadPng('hd2d/' + unit.file);
    const expectedW = unit.frameWidth * unit.columns;
    const expectedH = unit.frameHeight * unit.views.length * Object.keys(unit.animations).length;
    if (!image || image.width !== expectedW || image.height !== expectedH)
      error(unit.key + ' sheet size must be ' + expectedW + 'x' + expectedH + ' RGBA pixels');
    return {unit,image};
  }));
  for (const {unit,image} of staged) {
    const prior = manifest.sprites[unit.key];
    images[unit.key] = image;
    manifest.sprites[unit.key] = {
      ...prior, w:unit.frameWidth, h:unit.frameHeight, pivotY:unit.pivotY,
      pivotX:unit.pivotX ?? Math.floor(unit.frameWidth/2),
      pixelScale:prior.h / unit.frameHeight, // preserve the preexisting tile/world footprint
      cols:unit.columns, views:unit.views, anims:unit.animations,
      anchors:unit.anchors || {}, artPack:'hd2d-v1', premium:true
    };
  }
  return staged.length;
}
