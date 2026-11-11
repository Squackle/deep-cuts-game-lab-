// Route/branding invariants for the living-card -> graftbound migration (static checks; browser checks in e2e.py).
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
test('game lives in graftbound/: entry point, metadata and canonical route', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<title>GRAFTBOUND/); assert.match(html, /canonical" href="https:\/\/deep-cuts-game-lab\.pages\.dev\/graftbound\/"/); assert.match(html, /src="src\/main\.js"/);
  assert.equal(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).name, 'deep-cuts-graftbound');
});
test('old /living-card/ is a tiny redirect that preserves query and hash (no second copy of the game)', () => {
  const p = join(ROOT, '..', 'living-card'); if (!existsSync(p)) return; // package layout: sibling folder
  const files = readdirSync(p); assert.deepEqual(files.sort(), ['README.md', 'index.html']);
  const html = readFileSync(join(p, 'index.html'), 'utf8');
  assert.match(html, /location\.replace\('\/graftbound\/' \+ location\.search \+ location\.hash\)/); assert.match(html, /http-equiv="refresh"/);
});
test('no player-facing source says "Living Card"; asset paths are relative (work under /graftbound/)', () => {
  for (const f of walk(join(ROOT, 'src')).concat([join(ROOT, 'index.html'), join(ROOT, 'styles.css')])) {
    const t = readFileSync(f, 'utf8');
    assert.ok(!/The Living Card|Living Card/.test(t.replace(/formerly <i>The Living Card<\/i>/g, '')), f);
    assert.ok(!/["'(]\/living-card\//.test(t), 'absolute old route in ' + f);
  }
  assert.match(readFileSync(join(ROOT, 'src/rendering/sprites.js'), 'utf8'), /new URL\('\.\.\/\.\.\/assets\/', import\.meta\.url\)/);
});
test('save keys deliberately unchanged (localStorage is per-origin, so /graftbound/ reads v0.4 saves)', async () => {
  const { KEYS } = await import('../src/engine/save.js'); assert.equal(KEYS.run, 'deepcutsedh.livingcard.run'); assert.equal(KEYS.meta, 'deepcutsedh.livingcard.meta');
});
test('no runtime dependencies were added', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')); assert.equal(pkg.dependencies, undefined); assert.equal(pkg.devDependencies, undefined);
});
