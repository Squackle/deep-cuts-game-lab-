"""Stackbreaker 1.0 – 5 galaxies / 25 worlds / 250 levels and one-screen navigation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
HTML=(root/'index.html').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(320,568),(390,844),(768,900),(1280,900)]:
  page=browser.new_page(viewport={'width':width,'height':height})
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(HTML,wait_until='load')
  assert page.locator('#scenarioSelect option').count()==250
  assert page.locator('#missionNum').inner_text()=='1.1-1'
  assert page.locator('#prevButton').is_disabled()
  page.locator('#nextButton').click()
  assert page.locator('#missionNum').inner_text()=='1.1-2'
  page.locator('#prevButton').click()
  assert page.locator('#missionNum').inner_text()=='1.1-1'
  page.locator('#mapButton').click()
  assert page.locator('#worldMap').is_visible()
  assert page.locator('.galaxy-tab').count()==5
  assert page.locator('.world-tab').count()==5
  assert page.locator('.map-level').count()==10
  page.locator('[data-galaxy-index="4"]').click()
  assert page.locator('.galaxy-tab.current').count()==1
  assert page.locator('[data-world-index="24"]').count()==1
  page.locator('[data-world-index="24"]').click()
  assert 'Final Constellation' in page.locator('#worldStage').inner_text()
  assert page.locator('.map-level').count()==10
  page.locator('[data-level-index="249"]').click()
  assert page.locator('#worldMap').is_hidden()
  assert page.locator('#missionNum').inner_text()=='5.5-10'
  assert page.locator('#nextButton').is_disabled()
  page.locator('#prevButton').click()
  assert page.locator('#missionNum').inner_text()=='5.5-9'
  page.locator('#mapButton').click()
  page.keyboard.press('Escape')
  assert page.locator('#worldMap').is_hidden()
  measurements=page.evaluate('''()=>{const r=e=>e.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,game:r(document.querySelector('.game-screen')).bottom,buttons:[...document.querySelectorAll('#prevButton,#nextButton,#mapButton')].map(x=>r(x).bottom)}}''')
  assert measurements['overflow']<=1,(width,measurements)
  assert measurements['game']<=height+1,(width,measurements)
  assert all(v<=height+1 for v in measurements['buttons']),(width,measurements)
  assert not errors,(width,errors)
  print('PASS',width,height,'five galaxies, 25 worlds, 250 levels')
  page.close()
 page=browser.new_page(viewport={'width':390,'height':844})
 page.set_content(HTML)
 page.locator('#scenarioSelect').select_option('5')
 assert page.locator('#missionNum').inner_text()=='1.1-6'
 assert 'The Final Exchange' in page.locator('#scenarioTitle').inner_text()
 page.close()
 browser.close()
print('PASS 30 original levels and Final Exchange intact')
