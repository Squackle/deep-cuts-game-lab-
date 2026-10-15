"""Regression for real browser pointercancel during native drag (synthetic DragEvent tests miss this)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,h in [(320,568),(390,844),(768,900),(1280,900)]:
  page=browser.new_page(viewport={'width':w,'height':h})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.locator('#scenarioSelect').select_option('2')
  page.locator('[data-land="land-1"]').click()
  src=page.locator('[data-drag-card="growth"]').bounding_box()
  tgt=page.locator('[data-unit="bear"]').bounding_box()
  assert src and tgt
  sx,sy=src['x']+src['width']/2,src['y']+src['height']/2
  tx,ty=tgt['x']+tgt['width']/2,tgt['y']+tgt['height']/2
  page.mouse.move(sx,sy)
  page.mouse.down()
  page.mouse.move(sx+5,sy-7,steps=4)
  page.mouse.move(tx,ty,steps=18)
  page.wait_for_timeout(220)
  result=page.evaluate('''()=>{const b=document.querySelector('[data-unit="bear"]');const s=getComputedStyle(b);const a=getComputedStyle(b,'::after');return {legal:b.classList.contains('drop-target-legal'),hover:b.classList.contains('drop-target-hover'),outline:s.outlineColor,outlineWidth:s.outlineWidth,glow:s.boxShadow,inset:a.boxShadow,insetBorder:a.borderColor,pseudo:a.content,overflow:document.documentElement.scrollWidth-window.innerWidth}}''')
  assert result['legal'] and result['hover'],(w,'Native drag lost target indicator',result)
  assert result['outline']=='rgb(255, 234, 134)' and result['outlineWidth']=='4px',(w,'Gold hover outline is missing',result)
  assert '255, 177, 27' in result['glow'],(w,'Gold halo missing',result)
  assert result['pseudo']!='none' and 'rgb(255, 241, 163)' in result['insetBorder'],(w,'Gold frame overlay missing',result)
  assert result['overflow']<=1,(w,'Horizontal overflow',result)
  # Simulate finishing the async Scryfall catalog update in the middle of a drag.
  # The battlefield DOM must not be replaced until the user releases their spell.
  page.evaluate('''()=>{window._targetBefore=document.querySelector('[data-unit="bear"]');refreshScryfallCards();}''')
  assert page.evaluate("document.querySelector('[data-unit=\"bear\"]')===window._targetBefore"),(w,'Scryfall redraw interrupted drag')
  assert page.locator('[data-unit="bear"]').evaluate("el=>el.classList.contains('drop-target-hover')"),(w,'Refresh erased gold highlight')
  page.screenshot(path=str(root/f'gold-drag-{w}.png'))
  page.mouse.up()
  assert page.locator('.stack-entry').count()==2,(w,'Release did not cast onto the bear')
  assert not page.locator('.drop-target-hover').count(),(w,'Glow did not clear on release')
  assert not errors,(w,errors)
  print('PASS native mouse drag, glowing gold and Scryfall refresh deferral',w,h)
  page.close()
 # Confirm targeting and touch behavior still works when pointercancel really is a touch cancellation.
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
 page.set_content(html)
 page.locator('#scenarioSelect').select_option('2');page.locator('[data-land="land-1"]').click()
 res=page.evaluate('''()=>{const hand=document.querySelector('[data-drag-card="growth"]'),bear=document.querySelector('[data-unit="bear"]');
 const s=hand.getBoundingClientRect(),t=bear.getBoundingClientRect();const x=s.x+s.width/2,y=s.y+s.height/2,X=t.x+t.width/2,Y=t.y+t.height/2;
 const fire=(el,type,x,y)=>el.dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',clientX:x,clientY:y,cancelable:true,bubbles:true}));
 fire(hand,'pointerdown',x,y);fire(document,'pointermove',x+18,y-20);fire(document,'pointermove',X,Y);
 const before=bear.classList.contains('drop-target-hover');const color=getComputedStyle(bear).outlineColor;
 fire(document,'pointercancel',X,Y);
 return {before,color,after:bear.classList.contains('drop-target-hover'),stack:document.querySelectorAll('.stack-entry').length};}''')
 assert res['before'] and not res['after'] and res['stack']==1,res
 print('PASS actual touch cancellation clears glow without casting')
 page.close();browser.close()