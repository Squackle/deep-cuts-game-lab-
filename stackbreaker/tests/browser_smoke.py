from pathlib import Path
from playwright.sync_api import sync_playwright
path=(Path(__file__).parents[1]/'index.html').as_uri()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,768,1280]:
  p=b.new_page(viewport={'width':width,'height':880},device_scale_factor=1)
  errors=[]
  p.on('pageerror',lambda err: errors.append(str(err)))
  p.set_content(Path(__file__).parents[1].joinpath('index.html').read_text(),wait_until='load',timeout=14000)
  p.wait_for_selector('.response',timeout=7000)
  print('Viewport',width,'title',p.title(),'cards',p.locator('.card-frame').count(),'response',p.locator('.response').count(),'scrollX',p.evaluate('document.documentElement.scrollWidth-innerWidth'),'errors',errors)
  assert p.locator('#scenarioTitle').inner_text()=='The Last Shelter'
  assert p.evaluate('document.documentElement.scrollWidth-innerWidth')<=0
  assert not errors
  if width in [390,1280]:p.screenshot(path=str(Path(__file__).parents[1]/f'screenshot-{width}.png'),full_page=True)
  p.close()
 p=b.new_page(viewport={'width':900,'height':900});p.set_content(Path(__file__).parents[1].joinpath('index.html').read_text())
 p.locator('[data-cast="ward"]').click()
 p.locator('#passButton').click()
 p.locator('#passButton').click()
 p.locator('#passButton').click()
 assert p.locator('#resultTitle').inner_text()=='The stack broke your way.'
 assert p.locator('#completed').inner_text().startswith('1 / 12')
 print('First scenario victory verified')
 p.locator('#scenarioSelect').select_option('11')
 p.locator('select[data-target-for="salve"]').select_option('player')
 p.locator('[data-cast="salve"]').click()
 p.locator('select[data-target-for="dispel"]').select_option('theircounter')
 p.locator('[data-cast="dispel"]').click()
 for _ in range(7):
  if p.locator('#result').is_visible():break
  p.locator('#passButton').click()
 print('Final scenario',p.locator('#resultTitle').inner_text(), 'log',p.locator('#log').inner_text()[:100])
 assert p.locator('#resultTitle').inner_text()=='The stack broke your way.'
 b.close()