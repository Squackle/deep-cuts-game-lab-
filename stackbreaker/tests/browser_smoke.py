from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).parents[1]/'index.html').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(320,568),(390,844),(768,900),(1280,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load',timeout=14000)
  for i in [0,5,11]:
   page.locator('#scenarioSelect').select_option(str(i))
   assert page.locator('.stack-entry').count()>0
   rect=page.evaluate('''()=>({screen:document.querySelector('.game-screen').getBoundingClientRect().bottom,core:[...document.querySelectorAll('.land-card,.response-card,.response-card button,.stack-entry,#passButton,#nextButton,#restartButton,#undoButton')].map(e=>({name:e.textContent.trim().slice(0,10),box:e.getBoundingClientRect().toJSON()})),scrollX:document.documentElement.scrollWidth-innerWidth})''')
   assert rect['scrollX']<=0,(width,'horizontal overflow',rect['scrollX'])
   assert rect['screen']<=height+1,(width,'core game exceeds screen',rect['screen'],height)
   for item in rect['core']:
    box=item['box'];assert box['x']>=-1 and box['right']<=width+1 and box['y']>=0 and box['bottom']<=height+2,(width,height,i,item['name'],box)
  assert not errors,(width,errors)
  print('Viewport fits core controls',width,height,'last-case lands',page.locator('.land-card').count(),'hand',page.locator('.response-card').count())
  if width in [320,390,1280]:page.screenshot(path=str(Path(__file__).parents[1]/f'qa-{width}.png'))
  page.close()
 # Real gameplay: manually tap lands, drag Counterspell onto the stack.
 page=browser.new_page(viewport={'width':1280,'height':900});page.set_content(html)
 page.locator('#scenarioSelect').select_option('1')
 assert page.locator('[data-cast="counter"]').is_disabled()
 for id in ('land-1','land-2'):page.locator(f'[data-land="{id}"]').click()
 assert page.locator('#manaPool .U').count()==2
 assert page.locator('[data-cast="counter"]').is_enabled()
 page.locator('[data-drag-card="counter"]').drag_to(page.locator('#stackDrop'))
 assert page.locator('.stack-entry').count()==2,'Desktop drag failed to cast onto stack'
 assert page.locator('.response-card').count()==1,'Cast spell did not leave the hand'
 assert page.locator('#manaPool .U').count()==0
 for _ in range(10):
  if 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text():break
  page.locator('#passButton').click()
 assert 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text()
 assert page.locator('#nextButton').is_visible()
 page.locator('#nextButton').click()
 assert page.locator('#scenarioTitle').inner_text()=='A Bear Against Lightning'
 print('Desktop drag, manual Island tapping, pass and next case: passed')
 # Favorite challenge stays level 6, with explicit land tapping before targeted response casting.
 page.locator('#scenarioSelect').select_option('5')
 assert page.locator('#scenarioTitle').inner_text()=='The Final Exchange'
 assert page.locator('[data-cast="salve"]').is_disabled()
 page.locator('[data-land="land-1"]').click();page.locator('[data-land="land-2"]').click()
 page.locator('select[data-target-for="salve"]').select_option('player')
 page.locator('[data-cast="salve"]').click()
 page.locator('select[data-target-for="dispel"]').select_option('theircounter')
 page.locator('[data-drag-card="dispel"]').drag_to(page.locator('#stackDrop'))
 assert page.locator('.stack-entry').count()==5
 for _ in range(15):
  if 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text():break
  page.locator('#passButton').click()
 assert 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text()
 print('Level six Final Exchange: real land payment, targets, drag and win: passed')
 page.close()
 # Simulated touch pointer drag uses the same interaction path as mobile browsers.
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);page.set_content(html)
 page.locator('#scenarioSelect').select_option('1');page.locator('[data-land="land-1"]').click();page.locator('[data-land="land-2"]').click()
 result=page.evaluate('''()=>{const source=document.querySelector('[data-drag-card="counter"]'),zone=document.querySelector('#stackDrop');const a=source.getBoundingClientRect(),b=zone.getBoundingClientRect();const sx=a.left+a.width/2,sy=a.top+17,tx=b.left+b.width/2,ty=b.top+b.height/2;
 const emit=(to,name,x,y)=>to.dispatchEvent(new PointerEvent(name,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:22,clientX:x,clientY:y}));
 emit(source,'pointerdown',sx,sy);emit(document,'pointermove',sx+16,sy-10);emit(document,'pointermove',tx,ty);emit(document,'pointerup',tx,ty);return {stack:document.querySelectorAll('.stack-entry').length,hand:document.querySelectorAll('.response-card').length};}''')
 assert result['stack']==2,result
 print('Touch pointer drag onto stack: passed')
 page.close();browser.close()