import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('the persistent shared Lab return link survives campaign navigation',()=>{
 const template=fs.readFileSync(new URL('../template.html',import.meta.url),'utf8');
 const bundle=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 for(const html of [template,bundle]){
  assert.match(html,/class="site-home" href="\/lab\/"/);
  assert.match(html,/class="site-mark" href="\/lab\/"/);
  assert.match(html,/Back to Test Lab, choose another game/);
 }
 assert.match(css,/\.mast \.site-home\{display:inline-flex/);
});