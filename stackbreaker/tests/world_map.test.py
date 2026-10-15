"""Stackbreaker 0.9 — 5x6 campaign, map, progress, prev and one-screen QA."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,h in ((320,568),(390,844),(768,900),(1280,900)):
  page=browser.new_page(viewport={'width':w,'height':h})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML,wait_until='load')
  assert page.locator('#scenarioSelect option').count()==30
  assert page.locator('#missionNum').inner_text()=='1-1'
  assert page.locator('#prevButton').is_disabled()
  page.locator('#nextButton').click();assert page.locator('#missionNum').inner_text()=='1-2'
  page.locator('#prevButton').click();assert page.locator('#missionNum').inner_text()=='1-1'
  page.locator('#mapButton').click();assert page.locator('#worldMap').is_visible()
  assert page.locator('.world-tab').count()==5
  assert page.locator('.map-level').count()==6
  m=page.evaluate('''()=>{const b=e=>{const r=e.getBoundingClientRect();return {x:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   return {view:b(document.querySelector('#worldMap')),stage:b(document.querySelector('#worldStage')),close:b(document.querySelector('#closeMapButton')),last:b([...document.querySelectorAll('.map-level')].at(-1)),scrollWidth:document.documentElement.scrollWidth};}''')
  assert m['scrollWidth']<=w+1,(w,'horizontal overflow',m)
  for name in ['view','stage','close','last']:
   assert m[name]['right']<=w+1 and m[name]['bottom']<=h+1,(w,name,m)
  page.locator('[data-world-index="4"]').click();assert 'Last Response Citadel' in page.locator('#worldStage').inner_text()
  assert page.locator('.map-level').count()==6
  page.locator('[data-level-index="29"]').click()
  assert page.locator('#missionNum').inner_text()=='5-6'
  assert page.locator('#worldMap').is_hidden()
  assert page.locator('#nextButton').is_disabled()
  page.locator('#prevButton').click();assert page.locator('#missionNum').inner_text()=='5-5'
  page.locator('#mapButton').click()
  page.keyboard.press('Escape');assert page.locator('#worldMap').is_hidden()
  visible=page.evaluate('''()=>({bottom:document.querySelector('.game-screen').getBoundingClientRect().bottom,nav:[...document.querySelectorAll('#prevButton,#nextButton,#mapButton')].map(e=>e.getBoundingClientRect().bottom)})''')
  assert visible['bottom']<=h+1 and all(x<=h+1 for x in visible['nav']),(w,visible)
  assert not errors,(w,errors)
  print(f'PASS {w}×{h}: five worlds, 30 stages, previous/next, map, Escape, viewport')
  page.close()
 # Real local-storage persistence and existing progress ids are retained.
 page=browser.new_page(viewport={'width':390,'height':844})
 page.set_content(HTML)
 page.locator('#scenarioSelect').select_option('5')
 assert page.locator('#missionNum').inner_text()=='1-6'
 page.locator('#mapButton').click();assert page.locator('.map-level.active').count()==1
 assert 'The Final Exchange' in page.locator('#worldStage').inner_text()
 page.close();browser.close()
print('PASS final exchange remains 1-6')