// HD-2D renderer core (WebGL2). Passes: shadow map -> lit scene (3D meshes + pixel sprites + additive FX
// meshes + particles) into an offscreen target -> post (bloom, tilt-shift DOF, grade, vignette).
// v0.5 floor fix (2 of 2): terrain textures are sampled from a sharp atlas up close and blend toward a
// pre-filtered (blurred, tileable) atlas as the per-pixel texel footprint grows, removing the distant
// "crawling"/moire stripes that nearest-neighbour sampling of 32px stone produced at the board's far edge.
import { STRIDE } from './geometry.js';
export const MAX_LIGHTS = 8;

const COMMON = `
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmbTop; uniform vec3 uAmbBot; uniform vec3 uFog; uniform vec2 uFogR;
uniform mat4 uLightVP; uniform highp sampler2DShadow uShadow; uniform float uShadowOn; uniform float uShadowTaps; uniform float uShadowTexel;
uniform vec4 uPL[${MAX_LIGHTS}]; uniform vec3 uPLc[${MAX_LIGHTS}]; uniform int uPLn; uniform float uTime; uniform vec3 uCamPos;
float shadowAt(vec3 wp, float bias) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 lp = uLightVP * vec4(wp, 1.0); vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  p.z -= bias;
  if (uShadowTaps < 2.0) return texture(uShadow, p);
  float s = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) s += texture(uShadow, p + vec3(float(x), float(y), 0.0) * uShadowTexel * 1.25);
  return s / 9.0;
}
vec3 pointLights(vec3 wp, vec3 n, float wrap) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uPLn) break;
    vec3 d = uPL[i].xyz - wp; float dist = length(d); float r = uPL[i].w;
    float att = clamp(1.0 - dist / r, 0.0, 1.0); att *= att;
    float nd = clamp((dot(n, d / max(dist, 1e-3)) + wrap) / (1.0 + wrap), 0.0, 1.0);
    acc += uPLc[i] * att * nd;
  }
  return acc;
}
vec3 applyFog(vec3 c, vec3 wp) {
  float f = smoothstep(uFogR.x, uFogR.y, length(wp.xz));
  f = max(f, smoothstep(-0.8, -4.0, wp.y) * 0.85);
  float mist = smoothstep(0.6, -1.2, wp.y) * 0.18;
  return mix(c, uFog, clamp(f + mist, 0.0, 1.0));
}`;

const MESH_VS = `#version 300 es
in vec3 aPos; in vec3 aNor; in vec4 aCol; in float aMat;
uniform mat4 uVP; uniform mat4 uM;
out vec3 vN; out vec4 vC; out vec3 vW; flat out float vMat;
void main(){ vec4 w = uM * vec4(aPos,1.0); vW = w.xyz; vN = mat3(uM) * aNor; vC = aCol; vMat = aMat; gl_Position = uVP * w; }`;
const MESH_FS = `#version 300 es
precision highp float;
in vec3 vN; in vec4 vC; in vec3 vW; flat in float vMat;
uniform sampler2D uAtlas; uniform sampler2D uAtlasBlur; uniform vec3 uEmissive; uniform float uAlpha; uniform float uUnlit;
${COMMON}
out vec4 o;
vec2 cellUV(float id, vec2 uv) { float i = id - 1.0; vec2 cell = vec2(mod(i, 4.0), floor(i / 4.0)); vec2 f = fract(uv); f = (floor(f * 32.0) + 0.5) / 32.0; return (cell + f) / 4.0; }
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 base = vC.rgb; vec3 glow = vec3(0.0);
  float water = 0.0;
  if (vMat > 0.5) {
    vec3 an = abs(n); vec2 uv = an.y > 0.6 ? vW.xz : (an.x > an.z ? vW.zy : vW.xy);
    if (abs(vMat - 11.0) < 0.1) { water = 1.0; uv += vec2(uTime * 0.03, uTime * 0.02); }
    if (abs(vMat - 14.0) < 0.1) uv += vec2(sin(uTime * 0.4 + vW.z) * 0.05, uTime * 0.025);
    float footprint = max(length(dFdx(uv)), length(dFdy(uv))) * 32.0;   // atlas texels per screen pixel
    float k = smoothstep(0.55, 1.6, footprint);
    vec2 cuv = cellUV(vMat, uv);
    vec3 tex = mix(texture(uAtlas, cuv).rgb, texture(uAtlasBlur, cuv).rgb, k);
    base *= tex * (abs(vMat - 11.0) < 0.1 ? 0.9 : 1.35);
    if (abs(vMat - 14.0) < 0.1) { float pulse = 0.75 + 0.25 * sin(uTime * 2.1 + vW.x * 1.7 + vW.z * 1.3); glow = tex * vec3(1.6, 0.75, 0.25) * pulse; }
    if (abs(vMat - 15.0) < 0.1) { glow = tex * vec3(0.35, 0.22, 0.6) * (0.6 + 0.4 * sin(uTime * 1.3 + vW.x * 2.0)); }
  }
  if (uUnlit > 0.5) { o = vec4(base + uEmissive, vC.a * uAlpha); return; }
  float sh = shadowAt(vW + n * 0.03, 0.0015);
  float d = max(dot(n, uSunDir), 0.0);
  vec3 amb = mix(uAmbBot, uAmbTop, n.y * 0.5 + 0.5);
  vec3 col = base * (amb + uSunCol * d * sh + pointLights(vW, n, 0.2)) + uEmissive + glow;
  if (water > 0.5) {
    vec3 v = normalize(uCamPos - vW); vec3 h = normalize(uSunDir + v);
    float rip = sin(vW.x * 7.0 + uTime * 1.7) * sin(vW.z * 6.0 - uTime * 1.3);
    float spec = pow(max(dot(normalize(n + vec3(rip * 0.08, 0, rip * 0.06)), h), 0.0), 60.0) * sh;
    float fres = pow(1.0 - max(v.y, 0.0), 3.0);
    col = mix(col * 0.55, uFog * 1.3 + vec3(0.03, 0.07, 0.08), 0.3 + fres * 0.35) + uSunCol * spec * 0.55;
  }
  o = vec4(applyFog(col, vW), vC.a * uAlpha);
}`;
const SPR_VS = `#version 300 es
in vec3 aCenter; in vec2 aCorner; in vec2 aSize; in vec4 aUV; in vec4 aFx;
uniform mat4 uVP; uniform vec3 uRight;
out vec2 vUV; out vec4 vFx; out vec3 vW; out vec4 vRect;
void main(){
  vec3 w = aCenter + uRight * (aCorner.x - 0.5) * aSize.x + vec3(0.0, aCorner.y * aSize.y, 0.0);
  vW = w; vUV = mix(aUV.xy, aUV.zw, vec2(aCorner.x, 1.0 - aCorner.y)); vRect = aUV; vFx = aFx;
  gl_Position = uVP * vec4(w, 1.0);
}`;
const SPR_FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec4 vFx; in vec3 vW; in vec4 vRect;
uniform sampler2D uTex; uniform vec2 uTexel; uniform vec3 uCamFwd; uniform float uDepthOnly; uniform vec3 uOutlineCol;
${COMMON}
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec4 t = texture(uTex, vUV);
  if (vFx.y > 0.0 && hash(floor(vUV / uTexel)) < vFx.y) discard;
  if (t.a < 0.5) {
    if (vFx.z > 0.0 && uDepthOnly < 0.5) {
      vec2 lo = min(vRect.xy, vRect.zw), hi = max(vRect.xy, vRect.zw);
      float n = 0.0;
      for (int i = 0; i < 4; i++) { vec2 d = vec2(i==0?1.:i==1?-1.:0., i==2?1.:i==3?-1.:0.) * uTexel; vec2 q = clamp(vUV + d, lo, hi); n = max(n, texture(uTex, q).a); }
      if (n > 0.5) { o = vec4(uOutlineCol * (1.0 + vFx.z), 1.0); return; }
    }
    discard;
  }
  if (uDepthOnly > 0.5) { o = vec4(1.0); return; }
  vec3 n = normalize(-uCamFwd * 0.75 + vec3(0.0, 0.55, 0.0));
  float sh = shadowAt(vW + vec3(0.0, 0.05, 0.0) - uSunDir * 0.12, 0.004);
  float d = max(dot(n, uSunDir), 0.0) * 0.7 + 0.3;
  vec3 amb = mix(uAmbBot, uAmbTop, 0.75);
  vec3 col = t.rgb * (amb * 1.15 + uSunCol * d * mix(0.45, 1.0, sh) + pointLights(vW, n, 1.0));
  col = mix(col, vFx.w > 0.5 ? vec3(0.75, 0.9, 1.0) : vec3(1.0, 0.97, 0.88), vFx.x);
  o = vec4(applyFog(col, vW), 1.0);
}`;
const PT_VS = `#version 300 es
in vec3 aPos; in vec4 aCol; in float aSize; uniform mat4 uVP; uniform float uScale; out vec4 vC;
void main(){ gl_Position = uVP * vec4(aPos,1.0); gl_PointSize = aSize * uScale / gl_Position.w; vC = aCol; }`;
const PT_FS = `#version 300 es
precision mediump float; in vec4 vC; out vec4 o;
void main(){ vec2 p = abs(gl_PointCoord - 0.5) * 2.0; float core = step(max(p.x, p.y), 0.34); float halo = smoothstep(1.0, 0.0, length(p)); halo *= halo;
  float a = max(core, halo * 0.55) * vC.a; o = vec4(vC.rgb * a, a); }`;
const FS_VS = `#version 300 es
in vec2 aP; out vec2 vUV; void main(){ vUV = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;
const BLUR_FS = `#version 300 es
precision mediump float; in vec2 vUV; uniform sampler2D uSrc; uniform vec2 uDir; out vec4 o;
void main(){ vec3 c = texture(uSrc, vUV).rgb * 0.227;
  c += (texture(uSrc, vUV + uDir * 1.385).rgb + texture(uSrc, vUV - uDir * 1.385).rgb) * 0.316;
  c += (texture(uSrc, vUV + uDir * 3.231).rgb + texture(uSrc, vUV - uDir * 3.231).rgb) * 0.070; o = vec4(c, 1.0); }`;
const COPY_FS = `#version 300 es
precision mediump float; in vec2 vUV; uniform sampler2D uSrc; out vec4 o; void main(){ o = vec4(texture(uSrc, vUV).rgb, 1.0); }`;
const COMPOSITE_FS = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uScene; uniform sampler2D uBlur;
uniform float uBloom; uniform float uDof; uniform float uFocusY; uniform float uGrade; uniform float uFlash; uniform vec3 uFlashCol; uniform vec3 uTint; out vec4 o;
void main(){
  vec3 c = texture(uScene, vUV).rgb; vec3 b = texture(uBlur, vUV).rgb;
  float tilt = smoothstep(0.22, 0.55, abs(vUV.y - uFocusY)) * uDof;
  c = mix(c, b, tilt);
  vec3 glow = max(b - 0.62, 0.0) * 1.4; c += glow * uBloom;
  if (uGrade > 0.0) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, c * vec3(0.92, 1.0, 1.08), (1.0 - smoothstep(0.0, 0.45, l)) * 0.35 * uGrade);
    c = mix(c, c * vec3(1.08, 1.02, 0.9), smoothstep(0.45, 1.0, l) * 0.4 * uGrade);
    c = mix(vec3(l), c, 1.0 + 0.12 * uGrade);
    c = (c - 0.5) * (1.0 + 0.08 * uGrade) + 0.5;
    c *= uTint;
  }
  float v = smoothstep(1.15, 0.35, length((vUV - 0.5) * vec2(1.25, 1.0))); c *= mix(0.62, 1.0, v);
  c = mix(c, uFlashCol, uFlash);
  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  o = vec4(c, 1.0);
}`;
const DEPTH_FS = `#version 300 es
precision mediump float; out vec4 o; void main(){ o = vec4(1.0); }`;

function compile(gl, vs, fs) {
  const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, a = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm.replace('[0]', '')] = gl.getUniformLocation(p, nm); }
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const nm = gl.getActiveAttrib(p, i).name; a[nm] = gl.getAttribLocation(p, nm); }
  return { p, u, a };
}
export const QUALITY = {
  high:        { shadow: 2048, taps: 9, post: true, dof: 1, bloom: 0.9, lights: 8, particles: 1, dpr: 2 },
  balanced:    { shadow: 1024, taps: 1, post: true, dof: 0, bloom: 0.7, lights: 4, particles: 0.7, dpr: 1.5 },
  performance: { shadow: 0, taps: 1, post: false, dof: 0, bloom: 0, lights: 2, particles: 0.35, dpr: 1 },
};
export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL2 unavailable');
  const P = {
    mesh: compile(gl, MESH_VS, MESH_FS), meshDepth: compile(gl, MESH_VS, DEPTH_FS), spr: compile(gl, SPR_VS, SPR_FS),
    pt: compile(gl, PT_VS, PT_FS), blur: compile(gl, FS_VS, BLUR_FS), copy: compile(gl, FS_VS, COPY_FS), comp: compile(gl, FS_VS, COMPOSITE_FS),
  };
  const fsBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fsBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const ptBuf = gl.createBuffer(), sprBuf = gl.createBuffer();
  const R = { gl, canvas, P, q: QUALITY.balanced, qName: 'balanced', lights: [], env: null, flash: 0, flashCol: [1, 1, 1], focusY: 0.5, tint: [1, 1, 1] };
  R.texture = (img, { nearest = true, repeat = false } = {}) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const f = nearest ? gl.NEAREST : gl.LINEAR, w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    return { t, w: img.width, h: img.height };
  };
  R.updateTexture = (tex, img) => { gl.bindTexture(gl.TEXTURE_2D, tex.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); tex.w = img.width; tex.h = img.height; };
  R.upload = data => { const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return { buf, count: data.length / STRIDE }; };
  R.dynamic = (m, data) => { if (!m) m = { buf: gl.createBuffer(), count: 0 }; gl.bindBuffer(gl.ARRAY_BUFFER, m.buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); m.count = data.length / STRIDE; return m; };
  R.free = m => { if (m && m.buf) gl.deleteBuffer(m.buf); };
  function bindMesh(prog, m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.buf); const a = prog.a, B = STRIDE * 4;
    gl.enableVertexAttribArray(a.aPos); gl.vertexAttribPointer(a.aPos, 3, gl.FLOAT, false, B, 0);
    if (a.aNor >= 0 && a.aNor !== undefined) { gl.enableVertexAttribArray(a.aNor); gl.vertexAttribPointer(a.aNor, 3, gl.FLOAT, false, B, 12); }
    if (a.aCol !== undefined) { gl.enableVertexAttribArray(a.aCol); gl.vertexAttribPointer(a.aCol, 4, gl.FLOAT, false, B, 24); }
    if (a.aMat !== undefined) { gl.enableVertexAttribArray(a.aMat); gl.vertexAttribPointer(a.aMat, 1, gl.FLOAT, false, B, 40); }
  }
  let shadow = null, targets = null;
  function ensureShadow() {
    const size = R.q.shadow; if (!size) { if (shadow) { gl.deleteTexture(shadow.tex); gl.deleteFramebuffer(shadow.fb); shadow = null; } return; }
    if (shadow && shadow.size === size) return;
    if (shadow) { gl.deleteTexture(shadow.tex); gl.deleteFramebuffer(shadow.fb); }
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    shadow = { tex, fb, size };
  }
  const dummyShadow = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, dummyShadow);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 1, 1, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, new Uint32Array([0xffffffff]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  function colorTarget(w, h, depth) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let rb = null; if (depth) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, rb, w, h };
  }
  function ensureTargets(w, h) {
    if (!R.q.post) { if (targets) freeTargets(); return; }
    if (targets && targets.w === w && targets.h === h) return;
    freeTargets();
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
    targets = { w, h, scene: colorTarget(w, h, true), a: colorTarget(qw, qh), b: colorTarget(qw, qh) };
  }
  function freeTargets() { if (!targets) return; for (const k of ['scene', 'a', 'b']) { const t = targets[k]; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); if (t.rb) gl.deleteRenderbuffer(t.rb); } targets = null; }
  R.setQuality = name => { R.qName = name; R.q = QUALITY[name]; ensureShadow(); };
  function setCommon(prog, cam, depthOnly = false) {
    const u = prog.u, e = R.env;
    gl.uniform3fv(u.uSunDir, e.sunDir); gl.uniform3fv(u.uSunCol, e.sunCol); gl.uniform3fv(u.uAmbTop, e.ambTop); gl.uniform3fv(u.uAmbBot, e.ambBot);
    gl.uniform3fv(u.uFog, e.fog); gl.uniform2fv(u.uFogR, e.fogR); gl.uniform1f(u.uTime, R.time || 0);
    if (u.uCamPos) gl.uniform3fv(u.uCamPos, cam.eye);
    gl.uniformMatrix4fv(u.uLightVP, false, cam.lightVP);
    gl.uniform1f(u.uShadowOn, shadow && !depthOnly ? 1 : 0); gl.uniform1f(u.uShadowTaps, R.q.taps); gl.uniform1f(u.uShadowTexel, shadow ? 1 / shadow.size : 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadow && !depthOnly ? shadow.tex : dummyShadow); gl.uniform1i(u.uShadow, 1);
    const n = Math.min(R.lights.length, R.q.lights), pl = new Float32Array(MAX_LIGHTS * 4), pc = new Float32Array(MAX_LIGHTS * 3);
    R.lights.slice().sort((a, b) => (b.prio || 0) - (a.prio || 0)).slice(0, n).forEach((l, i) => { pl.set([l.pos[0], l.pos[1], l.pos[2], l.radius], i * 4); pc.set(l.col.map(c => c * l.intensity), i * 3); });
    gl.uniform4fv(u.uPL, pl); gl.uniform3fv(u.uPLc, pc); gl.uniform1i(u.uPLn, n);
  }
  function drawMeshes(prog, list, depthOnly, cam) {
    gl.useProgram(prog.p); gl.uniformMatrix4fv(prog.u.uVP, false, depthOnly ? cam.lightVP : cam.vp);
    if (!depthOnly) {
      setCommon(prog, cam);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.atlas.t); gl.uniform1i(prog.u.uAtlas, 0);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, (R.atlasBlur || R.atlas).t); gl.uniform1i(prog.u.uAtlasBlur, 2);
    }
    for (const d of list) {
      if (!d.mesh || !d.mesh.count || (depthOnly && d.noShadow)) continue;
      gl.uniformMatrix4fv(prog.u.uM, false, d.model);
      if (!depthOnly) {
        gl.uniform3fv(prog.u.uEmissive, d.emissive || [0, 0, 0]); gl.uniform1f(prog.u.uAlpha, d.alpha == null ? 1 : d.alpha); gl.uniform1f(prog.u.uUnlit, d.unlit ? 1 : 0);
        if (d.blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, d.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
        if (d.noDepth) gl.disable(gl.DEPTH_TEST);
      }
      bindMesh(prog, d.mesh); gl.drawArrays(gl.TRIANGLES, 0, d.mesh.count);
      if (!depthOnly) { if (d.blend) { gl.disable(gl.BLEND); gl.depthMask(true); } if (d.noDepth) gl.enable(gl.DEPTH_TEST); }
    }
    for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
  }
  function drawSprites(batches, depthOnly, cam) {
    const p = P.spr; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, depthOnly ? cam.lightVP : cam.vp); gl.uniform3fv(p.u.uRight, depthOnly ? cam.lightRight : cam.right);
    gl.uniform1f(p.u.uDepthOnly, depthOnly ? 1 : 0); gl.uniform3fv(p.u.uCamFwd, cam.fwd); gl.uniform3fv(p.u.uOutlineCol, R.outlineCol || [1, 0.85, 0.4]);
    setCommon(p, cam, depthOnly);
    gl.bindBuffer(gl.ARRAY_BUFFER, sprBuf);
    for (const b of batches) {
      if (!b.count) continue;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, b.tex.t); gl.uniform1i(p.u.uTex, 0); gl.uniform2f(p.u.uTexel, 1 / b.tex.w, 1 / b.tex.h);
      gl.bufferData(gl.ARRAY_BUFFER, b.data.subarray(0, b.count * 15), gl.STREAM_DRAW);
      const B = 60, a = p.a;
      gl.enableVertexAttribArray(a.aCenter); gl.vertexAttribPointer(a.aCenter, 3, gl.FLOAT, false, B, 0);
      gl.enableVertexAttribArray(a.aCorner); gl.vertexAttribPointer(a.aCorner, 2, gl.FLOAT, false, B, 12);
      gl.enableVertexAttribArray(a.aSize); gl.vertexAttribPointer(a.aSize, 2, gl.FLOAT, false, B, 20);
      gl.enableVertexAttribArray(a.aUV); gl.vertexAttribPointer(a.aUV, 4, gl.FLOAT, false, B, 28);
      gl.enableVertexAttribArray(a.aFx); gl.vertexAttribPointer(a.aFx, 4, gl.FLOAT, false, B, 44);
      gl.drawArrays(gl.TRIANGLES, 0, b.count);
    }
    for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
  }
  function drawPoints(cam, data, count, scale) {
    if (!count) return;
    const p = P.pt; gl.useProgram(p.p); gl.uniformMatrix4fv(p.u.uVP, false, cam.vp); gl.uniform1f(p.u.uScale, scale);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 8), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(p.a.aPos); gl.vertexAttribPointer(p.a.aPos, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(p.a.aCol); gl.vertexAttribPointer(p.a.aCol, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(p.a.aSize); gl.vertexAttribPointer(p.a.aSize, 1, gl.FLOAT, false, 32, 28);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disable(gl.BLEND); gl.depthMask(true);
    for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
  }
  function fullscreen(prog) { gl.bindBuffer(gl.ARRAY_BUFFER, fsBuf); gl.enableVertexAttribArray(prog.a.aP); gl.vertexAttribPointer(prog.a.aP, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(prog.a.aP); }
  R.render = scene => {
    const { cam } = scene;
    const dpr = Math.min(window.devicePixelRatio || 1, R.q.dpr);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ensureShadow(); ensureTargets(w, h);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    if (shadow) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.fb); gl.viewport(0, 0, shadow.size, shadow.size); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2.0);
      drawMeshes(P.meshDepth, scene.opaque, true, cam); drawSprites(scene.sprites, true, cam);
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets ? targets.scene.fb : null); gl.viewport(0, 0, w, h);
    const f = R.env.fog; gl.clearColor(f[0], f[1], f[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawMeshes(P.mesh, scene.opaque, false, cam);
    drawSprites(scene.sprites, false, cam);
    drawMeshes(P.mesh, scene.overlays, false, cam);
    if (scene.particles) drawPoints(cam, scene.particles.data, scene.particles.count, scene.particles.scale * h);
    if (targets) {
      gl.disable(gl.DEPTH_TEST);
      const pass = (prog, src, dst, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null); gl.viewport(0, 0, dst ? dst.w : w, dst ? dst.h : h); gl.useProgram(prog.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(prog.u.uSrc, 0); if (set) set(prog.u); fullscreen(prog); };
      pass(P.copy, targets.scene, targets.a);
      pass(P.blur, targets.a, targets.b, u => gl.uniform2f(u.uDir, 1 / targets.a.w, 0));
      pass(P.blur, targets.b, targets.a, u => gl.uniform2f(u.uDir, 0, 1 / targets.a.h));
      pass(P.blur, targets.a, targets.b, u => gl.uniform2f(u.uDir, 2 / targets.a.w, 0));
      pass(P.blur, targets.b, targets.a, u => gl.uniform2f(u.uDir, 0, 2 / targets.a.h));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); const c = P.comp; gl.useProgram(c.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, targets.scene.tex); gl.uniform1i(c.u.uScene, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, targets.a.tex); gl.uniform1i(c.u.uBlur, 1);
      gl.uniform1f(c.u.uBloom, R.q.bloom); gl.uniform1f(c.u.uDof, R.q.dof * (scene.dof == null ? 1 : scene.dof)); gl.uniform1f(c.u.uFocusY, R.focusY);
      gl.uniform1f(c.u.uGrade, 1); gl.uniform1f(c.u.uFlash, R.flash); gl.uniform3fv(c.u.uFlashCol, R.flashCol); gl.uniform3fv(c.u.uTint, R.tint);
      fullscreen(c); gl.enable(gl.DEPTH_TEST);
    }
  };
  R.setQuality('balanced');
  return R;
}
