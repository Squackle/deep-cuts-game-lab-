// Original Animation Lab visual source, 01ecea4a6127222a8c2e53b64a9be67df8488c0f, graftbound/dev/animation-studio/arena-projection.js.
// Animation Lab only: project a 2D gas field onto the real GRAFTBOUND 8x8 tile footprint.
// This is a camera-aligned illusion of a contained volume, not volumetric CFD.
// No engine changes: Scene.world/project provide the authoritative arena geometry.
export function arenaPoint(scene, u, v, height = 0.12) {
  const [x, , z] = scene.world(u * scene.w - .5, v * scene.h - .5);
  return scene.project([x, height, z]);
}
export function arenaPolygon(scene, height = 0.12) {
  return [arenaPoint(scene,0,0,height), arenaPoint(scene,1,0,height),
          arenaPoint(scene,1,1,height), arenaPoint(scene,0,1,height)];
}
export function clipToArena(ctx, scene, height = 0.12) {
  const hull = arenaPolygon(scene, height);
  ctx.beginPath();
  ctx.moveTo(hull[0].x, hull[0].y);
  for (const p of hull.slice(1)) ctx.lineTo(p.x,p.y);
  ctx.closePath();
  ctx.clip();
  return hull;
}
// Affine map one triangular patch of smoke texture to its projected battlefield triangle.
// Breaking the 3D projection into 5x5 / 6x6 cells approximates perspective (unlike a
// simple drawImage stretched across a screen-space rectangle).
function textureTriangle(ctx, image, src, dest) {
  const [a,b,c]=src,[A,B,C]=dest;
  const det=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  if (Math.abs(det)<1e-7) return;
  const dx1=B.x-A.x,dx2=C.x-A.x,dy1=B.y-A.y,dy2=C.y-A.y;
  const m11=(dx1*(c.y-a.y)-dx2*(b.y-a.y))/det;
  const m12=(dy1*(c.y-a.y)-dy2*(b.y-a.y))/det;
  const m21=(dx2*(b.x-a.x)-dx1*(c.x-a.x))/det;
  const m22=(dy2*(b.x-a.x)-dy1*(c.x-a.x))/det;
  const tx=A.x-m11*a.x-m21*a.y,ty=A.y-m12*a.x-m22*a.y;
  ctx.save();
  ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.closePath();ctx.clip();
  ctx.transform(m11,m12,m21,m22,tx,ty);
  ctx.drawImage(image,0,0);
  ctx.restore();
}
export function drawSmokeOnArena(ctx, image, scene, {elevation=0.12, steps=5, opacity=1}={}) {
  if (!image || !scene?.cam) return;
  const n=Math.max(2,Math.min(9,Math.round(steps)));
  const sw=image.width,sh=image.height;
  ctx.save();
  ctx.globalAlpha=opacity;
  // The footprint clip prevents blurred edges, billows, glows and ember trails
  // from ever painting the water/lava/environment outside the battlefield tiles.
  clipToArena(ctx,scene,0.04);
  // CanvasBattleScene.project is affine: one image draw matches all clipped
  // triangles, saving 50 canvas operations per frame in the mobile path.
  if(scene.cam.mode==='canvas-2d' || scene.isAffine){
    const A=arenaPoint(scene,0,0,elevation),B=arenaPoint(scene,1,0,elevation);
    const C=arenaPoint(scene,0,1,elevation);
    const matrix=[(B.x-A.x)/sw,(B.y-A.y)/sw,
      (C.x-A.x)/sh,(C.y-A.y)/sh,A.x,A.y];
    if(matrix.every(Number.isFinite)){
      ctx.transform(...matrix);
      ctx.drawImage(image,0,0);
    }
    ctx.restore();
    return;
  }
  const points=[];
  for(let row=0;row<=n;row++) {
    const line=[];
    for(let col=0;col<=n;col++) line.push(arenaPoint(scene,col/n,row/n,elevation));
    points.push(line);
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const x0=x/n*sw,x1=(x+1)/n*sw,y0=y/n*sh,y1=(y+1)/n*sh;
    const a={x:x0,y:y0},b={x:x1,y:y0},c={x:x1,y:y1},d={x:x0,y:y1};
    const A=points[y][x],B=points[y][x+1],C=points[y+1][x+1],D=points[y+1][x];
    textureTriangle(ctx,image,[a,b,c],[A,B,C]);
    textureTriangle(ctx,image,[a,c,d],[A,C,D]);
  }
  ctx.restore();
}
