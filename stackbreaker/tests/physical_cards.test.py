from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).parents[1]/'index.html').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(320,568),(390,844),(768,900),(1280,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html,wait_until='load',timeout=20000)
  assert page.locator('[data-cast]').count()==0
  assert page.locator('[data-target-for]').count()==0
  assert page.locator('.hand-card').count()==0,'Selfless Spirit ability should not appear in hand'
  assert page.locator('.battle-card[data-activate-source]').count()==1
  # Activate ability by clicking the permanent itself.
  page.locator('[data-activate-source]').click()
  assert page.locator('.stack-entry').count()==2,('selfless spirit activation',width)
  assert page.locator('.battle-card').count()==2
  page.locator('#scenarioSelect').select_option('5')
  assert page.locator('#scenarioTitle').inner_text()=='The Final Exchange'
  assert page.locator('.hand-card').count()==2
  assert page.locator('[data-cast]').count()==0
  page.locator('#scenarioSelect').select_option('11')
  assert page.locator('.hand-card').count()==5
  positions=page.evaluate('''()=>({overflow:document.documentElement.scrollWidth-innerWidth,screen:document.querySelector('.game-screen').getBoundingClientRect().bottom,core:[...document.querySelectorAll('.land-card,.hand-card,.battle-card,#passButton,#undoButton,#restartButton,#nextButton')].map(el=>({label:el.className,box:el.getBoundingClientRect().toJSON()}))})''')
  assert positions['overflow']<=1,(width,'overflow',positions['overflow'])
  assert positions['screen']<=height+1,(width,'screen',positions['screen'])
  for item in positions['core']:
   b=item['box'];assert b['width']>0 and b['height']>0,(width,'zero-sized',item)
   assert b['left']>=-1 and b['right']<=width+1 and b['top']>=0 and b['bottom']<=height+1,(width,item['label'],b)
  assert not errs,(width,errs)
  page.screenshot(path=str(Path(__file__).parents[1]/f'hand-qa-{width}.png'))
  print('Viewport',width,height,'no extra UI, all cards/controls in viewport, ability activated')
  page.close()
 # The Final Exchange: choose target AFTER dragging salve onto stack.
 page=browser.new_page(viewport={'width':1280,'height':900});page.set_content(html)
 page.locator('#scenarioSelect').select_option('5')
 page.locator('[data-land="land-1"]').click();page.locator('[data-land="land-2"]').click()
 page.locator('[data-drag-card="salve"]').drag_to(page.locator('#stackDrop'))
 assert page.locator('#playPrompt').is_visible(),'Target prompt not open'
 page.locator('[data-choose-target="player"]').click()
 assert page.locator('.stack-entry').count()==4
 page.locator('[data-drag-card="dispel"]').drag_to(page.locator('#stackDrop'),force=True)
 assert page.locator('#playPrompt').is_visible()
 page.locator('[data-choose-target="theircounter"]').click()
 assert page.locator('.stack-entry').count()==5
 for _ in range(15):
  if 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text():break
  page.locator('#passButton').click()
 assert 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text()
 page.locator('#nextButton').click();assert page.locator('#missionNum').inner_text().startswith('07')
 print('Final Exchange: drag onto stack, choose target after drop, solve and next case: passed')
 # Generic mana is chosen AFTER dropping when multiple pools can legally pay.
 page.locator('#scenarioSelect').select_option('3')
 for land in ('land-1','land-2','land-3'):page.locator(f'[data-land="{land}"]').click()
 page.locator('[data-drag-card="negate"]').drag_to(page.locator('#stackDrop'),force=True)
 assert page.locator('#playPrompt').is_visible()
 assert 'generic' in page.locator('.prompt-header').inner_text().lower()
 assert page.locator('[data-choose-payment]').count()==2
 page.locator('[data-choose-payment]').first.click()
 assert page.locator('.stack-entry').count()==2
 assert page.locator('#playPrompt').is_hidden()
 print('Generic mana payment selected after dragging: passed')
 # Target via direct battlefield drop on creature, no separate target picker required.
 page.locator('#scenarioSelect').select_option('2')
 page.locator('[data-land="land-1"]').click()
 page.locator('[data-drag-card="growth"]').drag_to(page.locator('[data-unit="bear"]'))
 assert page.locator('.stack-entry').count()==2
 assert page.locator('#playPrompt').is_hidden()
 print('Battlefield drop on legal creature target casts onto actual stack: passed')
 page.close()
 # Touch simulated pointer drag and target picking.
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);page.set_content(html)
 page.locator('#scenarioSelect').select_option('1');page.locator('[data-land="land-1"]').click();page.locator('[data-land="land-2"]').click()
 outcome=page.evaluate('''()=>{const source=document.querySelector('[data-drag-card="counter"]'),zone=document.querySelector('#stackDrop');const a=source.getBoundingClientRect(),b=zone.getBoundingClientRect();const sx=a.left+a.width/2,sy=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2;const emit=(to,name,x,y)=>to.dispatchEvent(new PointerEvent(name,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:22,clientX:x,clientY:y}));emit(source,'pointerdown',sx,sy);emit(document,'pointermove',sx+16,sy-10);emit(document,'pointermove',tx,ty);emit(document,'pointerup',tx,ty);return {stack:document.querySelectorAll('.stack-entry').length,prompt:document.querySelector('#playPrompt').hidden};}''')
 assert outcome['stack']==2,outcome
 print('Touch drag a real card on stack: passed')
 page.close();browser.close()