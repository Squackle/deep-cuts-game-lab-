"""Stackbreaker 0.7 – legal-target glow, precise pointer casting and larger cards."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,h in [(320,568),(390,844),(768,900),(1280,900)]:
  page=browser.new_page(viewport={'width':w,'height':h})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.locator('#scenarioSelect').select_option('2')
  geom=page.evaluate('''()=>{const box=s=>{let r=document.querySelector(s).getBoundingClientRect();return {w:r.width,h:r.height,bottom:r.bottom,left:r.left,right:r.right}};
   return {screen:box('.game-screen'),battle:box('.battle-card'),hand:box('.hand-card'),next:box('#nextButton'),overflow:document.documentElement.scrollWidth-innerWidth};}''')
  assert geom['overflow']<=1,(w,'horizontal overflow',geom)
  assert geom['screen']['bottom']<=h+1 and geom['next']['bottom']<=h+1,(w,'required controls below fold',geom)
  assert geom['hand']['h']>=(130 if w==320 else 150),(w,'hand too small',geom)
  assert geom['battle']['h']>=(70 if w==320 else 175 if w==390 else 145 if w==768 else 240),(w,'battlefield too small',geom)
  assert abs(geom['battle']['w']/geom['battle']['h']-488/680)<.035,(w,'distorted creature card',geom)
  page.locator('[data-land="land-1"]').click()
  # Simulate native drag in stages to observe visual feedback before release.
  result=page.evaluate('''()=>{const src=document.querySelector('[data-drag-card="growth"]');
   const bear=document.querySelector('[data-unit="bear"]');const other=document.querySelector('[data-target-person="opponent"]');
   const data=new DataTransfer();const fire=(el,type)=>el.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:data}));
   fire(src,'dragstart');const available=bear.classList.contains('drop-target-legal');
   const notAvailable=other.classList.contains('drop-target-legal');fire(bear,'dragover');
   const hovered=bear.classList.contains('drop-target-hover');
   const glow=getComputedStyle(bear).boxShadow;
   fire(src,'dragend');const cleaned=!bear.classList.contains('drop-target-legal')&&!bear.classList.contains('drop-target-hover');
   return {available,notAvailable,hovered,glow,cleaned};}''')
  assert result['available'] and not result['notAvailable'] and result['hovered'] and result['cleaned'],(w,result)
  assert 'rgb' in result['glow'],(w,'no actual CSS glow',result)
  # Wrong drop on generic zone cannot cast or open old target picker.
  page.locator('[data-drag-card="growth"]').drag_to(page.locator('#stackDrop'),force=True)
  assert page.locator('.stack-entry').count()==1,(w,'illegal auto-target')
  assert page.locator('#playPrompt').is_hidden(),(w,'old target choice prompt')
  # Legal target: release directly on Grizzly Bears, cast on stack.
  page.locator('[data-drag-card="growth"]').drag_to(page.locator('[data-unit="bear"]'),force=True)
  assert page.locator('.stack-entry').count()==2,(w,'drag onto creature should cast')
  assert page.locator('#playPrompt').is_hidden(),(w,'no modal for a direct target')
  assert not errors,(w,errors)
  # Card sizes and controls in five-card case as well.
  page.locator('#scenarioSelect').select_option('11')
  assert page.locator('.hand-card').count()==5
  all_boxes=page.evaluate('''()=>[...document.querySelectorAll('.hand-card,.battle-card,.land-card,#passButton,#nextButton')].map(e=>{let r=e.getBoundingClientRect();return {name:e.className,x:r.x,right:r.right,y:r.y,bottom:r.bottom,w:r.width,h:r.height}})''')
  for b in all_boxes:
   assert b['w']>0 and b['h']>0 and b['x']>=-1 and b['right']<=w+1 and b['y']>=0 and b['bottom']<=h+1,(w,b)
  page.screenshot(path=str(root/f'drag-v07-{w}.png'))
  print('PASS',w,h,'no automatic targeting, legal-creature confirmation glow, larger cards, all controls visible')
  page.close()
 # Exercise actual stack-target and life-target drag interactions in favorite case 6.
 page=browser.new_page(viewport={'width':1280,'height':900});page.set_content(html)
 page.locator('#scenarioSelect').select_option('5')
 page.locator('[data-land="land-1"]').click();page.locator('[data-land="land-2"]').click()
 page.locator('[data-drag-card="salve"]').drag_to(page.locator('[data-target-person="player"]'),force=True)
 assert page.locator('.stack-entry').count()==4 and page.locator('#playPrompt').is_hidden(),('salve direct life targeting')
 page.locator('[data-drag-card="dispel"]').drag_to(page.locator('[data-stack-target="theircounter"]'),force=True)
 assert page.locator('.stack-entry').count()==5 and page.locator('#playPrompt').is_hidden(),('dispel direct stack targeting')
 for i in range(15):
  if 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text():break
  page.locator('#passButton').click()
 assert 'CASE SOLVED' in page.locator('#resultEyebrow').inner_text()
 page.locator('#nextButton').click();assert page.locator('#missionNum').inner_text().startswith('1.1-7')
 print('PASS level 6: direct-life and direct-stack drop, solve puzzle, next case')
 page.locator('#scenarioSelect').select_option('3')
 for id in ('land-1','land-2','land-3'):page.locator(f'[data-land="{id}"]').click()
 page.locator('[data-drag-card="negate"]').drag_to(page.locator('[data-stack-target="wrath"]'),force=True)
 assert 'generic' in page.locator('.prompt-header').inner_text().lower()
 assert page.locator('[data-choose-payment]').count()==2
 page.locator('[data-choose-payment]').first.click();assert page.locator('.stack-entry').count()==2
 print('PASS ambiguous generic mana selection after valid target drop')
 page.close()
 # Touch drag over creature should show glow, then cast on release.
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);page.set_content(html)
 page.locator('#scenarioSelect').select_option('2');page.locator('[data-land="land-1"]').click()
 touch=page.evaluate('''()=>{const src=document.querySelector('[data-drag-card="growth"]'),creature=document.querySelector('[data-unit="bear"]');
 const a=src.getBoundingClientRect(),b=creature.getBoundingClientRect();const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 const emit=(type,x,y)=>{const target=type==='pointerdown'?src:document;target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:51,clientX:x,clientY:y}));};
 emit('pointerdown',sx,sy);emit('pointermove',sx+20,sy-16);emit('pointermove',tx,ty);
 const glow=creature.classList.contains('drop-target-hover');emit('pointerup',tx,ty);
 return {glow,stack:document.querySelectorAll('.stack-entry').length,prompt:document.querySelector('#playPrompt').hidden};}''')
 assert touch['glow'] and touch['stack']==2 and touch['prompt'],touch
 print('PASS touch glow before release and creature-target cast')
 page.close();browser.close()