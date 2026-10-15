from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import io

root=Path(__file__).parents[1]
html=(root/'index.html').read_text()
buf=io.BytesIO(); im=Image.new('RGB',(146,204),(48,85,101)); d=ImageDraw.Draw(im);d.rectangle((9,8,137,190),outline=(221,200,145),width=5);d.text((18,90),'CARD IMAGE',fill=(255,255,255));im.save(buf,format='JPEG');fake_bytes=buf.getvalue()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(320,568),(390,844),(768,900),(1280,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def collection(route):
   import json
   req=json.loads(route.request.post_data)
   requests.append(req)
   items=[]
   for i,entry in enumerate(req['identifiers']):
    name=entry['name'];items.append({'name':name,'oracle_text':'Scryfall Oracle: '+name+' — Verified card ability text.', 'artist':'Test Artist',
     'scryfall_uri':'https://scryfall.com/card/xyz/'+str(i),
     'image_uris':{key:'https://cards.scryfall.io/'+key+'/front/xyz/'+str(i)+'.jpg' for key in ('small','normal','art_crop')}})
   route.fulfill(status=200,content_type='application/json',body=json.dumps({'object':'list','data':items}),headers={'access-control-allow-origin':'*'})
  page.route('https://api.scryfall.com/cards/collection',collection)
  page.route('https://cards.scryfall.io/**',lambda route:route.fulfill(status=200,body=fake_bytes,content_type='image/jpeg',headers={'access-control-allow-origin':'*'}))
  page.set_content(html,wait_until='load',timeout=16000)
  page.wait_for_function("() => document.querySelector('#artStatus').textContent === 'SCRYFALL IMAGES'",timeout=7000)
  assert len(requests)==1,(width,requests)
  assert len(requests[0]['identifiers'])>=26,len(requests[0]['identifiers'])
  for scene in (0,5,11):
   page.locator('#scenarioSelect').select_option(str(scene))
   assert page.locator('.land-card img.land-image').count()==page.locator('.land-card').count(),('land images',width,scene)
   assert page.locator('.response-card img.response-image').count()==page.locator('.response-card').count(),('hand images',width,scene)
   assert page.locator('.stack-entry img.stack-art-image').count()==page.locator('.stack-entry').count(),('stack artwork',width,scene)
   assert page.locator('.battle-card img.battle-image').count()==page.locator('.battle-card').count(),('battlefield images',width,scene)
   text=page.locator('.stack-entry .stack-oracle').first.inner_text()
   assert 'Scryfall Oracle' in text,(width,scene,text)
   rect=page.evaluate('''()=>({bottom:document.querySelector('.game-screen').getBoundingClientRect().bottom,
     overflow:document.documentElement.scrollWidth-innerWidth,
     items:[...document.querySelectorAll('.stack-art,.land-card,.response-card,.game-controls button')].map(e=>e.getBoundingClientRect().toJSON())})''')
   assert rect['bottom']<=height+1 and rect['overflow']<=0,(width,scene,rect)
   for r in rect['items']:assert r['left']>=-1 and r['right']<=width+1 and r['top']>=0 and r['bottom']<=height+2,(width,scene,r)
  page.locator('#scenarioSelect').select_option('5')
  art=page.locator('.stack-art-image').first
  art.hover(force=True)
  assert page.locator('#cardPreview').is_visible(),(width,'hover did not open')
  assert page.locator('#cardPreviewImage').get_attribute('src').startswith('https://cards.scryfall.io/normal/')
  assert 'Test Artist' in page.locator('#cardPreviewCredit').inner_text()
  page.locator('#missionNum').hover(force=True)
  assert not page.locator('#cardPreview').is_visible(),(width,'preview did not disappear after pointer left artwork')
  assert not errors,(width,errors)
  print('Scryfall batch, card images in all zones, Oracle text, hover dismiss, and viewport',width,height,'passed')
  if width==390:page.screenshot(path=str(root/'art-preview-390.png'))
  page.close()
 browser.close()