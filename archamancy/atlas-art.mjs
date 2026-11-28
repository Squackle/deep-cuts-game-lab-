const illustrations = new Map();

// Both copies of the world map share a decoded image. Regional plates load when their pin is selected.
export function atlasIllustration(name) {
 if (!illustrations.has(name)) {
  const source = new Image();
  source.decoding = "async";
  if (name === "world") source.fetchPriority = "low";
  const art = {image: null, ready: null};
  art.ready = new Promise(resolve => {
   source.addEventListener("load", () => {art.image = source;resolve(source);}, {once:true});
   source.addEventListener("error", () => resolve(null), {once:true});
   source.src = new URL(`./assets/atlas/${name}.webp`, import.meta.url).href;
  });
  illustrations.set(name, art);
 }
 return illustrations.get(name);
}

export function drawAtlasIllustration(ctx, image, width, height, preserveCoast = false) {
 // Hold onto the coast on the world plate and the landmarks at the edges of each regional plate.
 const crop = Math.min(image.naturalHeight, Math.max(image.naturalWidth * height / width,
  image.naturalHeight * (preserveCoast ? .98 : .86)));
 ctx.drawImage(image, 0, (image.naturalHeight - crop) / 2, image.naturalWidth, crop, 0, 0, width, height);
}

export function paintAtlasFrame(ctx, width, height) {
 const inset = height * .03;
 const span = height * .105;
 ctx.save();
 ctx.lineWidth = Math.max(1, height * .003);
 for (const [x, y, dx, dy] of [[inset,inset,1,1],[width-inset,inset,-1,1],
  [inset,height-inset,1,-1],[width-inset,height-inset,-1,-1]]) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dx, dy);
  ctx.beginPath();
  ctx.moveTo(0, span);
  ctx.lineTo(0, span * .28);
  ctx.quadraticCurveTo(0, 0, span * .28, 0);
  ctx.lineTo(span, 0);
  ctx.strokeStyle = "#171b14a6";
  ctx.lineWidth *= 2.6;
  ctx.stroke();
  ctx.strokeStyle = "#f2dc9bc7";
  ctx.lineWidth /= 2.6;
  ctx.stroke();
  ctx.fillStyle = "#e3c182d9";
  ctx.beginPath();
  ctx.moveTo(span * .18, span * .18);
  ctx.lineTo(span * .38, span * .18);
  ctx.quadraticCurveTo(span * .2, span * .22, span * .18, span * .38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
 }
 ctx.restore();
}

export function paintCompass(ctx, x, y, r) {
 ctx.save();
 ctx.translate(x, y);
 ctx.lineWidth = Math.max(1, r * .036);
 ctx.fillStyle = "#0f25269c";
 ctx.strokeStyle = "#eac991b8";
 ctx.beginPath();
 ctx.arc(0, 0, r * .62, 0, Math.PI * 2);
 ctx.fill();
 ctx.stroke();
 for (let i = 0; i < 8; i++) {
  const length = i === 0 ? r : i % 2 ? r * .53 : r * .79;
  const half = i % 2 ? r * .075 : r * .115;
  ctx.beginPath();
  ctx.moveTo(0, -length);
  ctx.lineTo(half, 0);
  ctx.lineTo(-half, 0);
  ctx.closePath();
  ctx.fillStyle = i % 2 ? "#b79b6ecd" : "#f8e0a7";
  ctx.fill();
  ctx.fillStyle = "#37292080";
  ctx.beginPath();
  ctx.moveTo(0, -length);
  ctx.lineTo(0, 0);
  ctx.lineTo(-half, 0);
  ctx.fill();
  ctx.rotate(Math.PI / 4);
 }
 ctx.fillStyle = "#fff0c3";
 ctx.beginPath();
 ctx.arc(0, 0, r * .065, 0, Math.PI * 2);
 ctx.fill();
 ctx.restore();
}
