"""Power/toughness is printed on Scryfall cards; show a replacement only when modified."""
from pathlib import Path
import io, json
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
# A card-proportioned mocked CDN image, with a printed stat box in the lower right.
im=Image.new('RGB',(488,680),(211,203,173));draw=ImageDraw.Draw(im)
draw.rectangle((10,10,477,668),outline=(25,21,11),width=10)
draw.rectangle((338,608,465,648),fill=(241,231,205),outline=(29,29,27),width=4)
draw.text((357,617),'2/2',fill=(20,20,20))
draw.text((90,260),'SCRYFALL CARD',fill=(15,50,40))
mem=io.BytesIO();im.save(mem,format='JPEG');img_bytes=mem.getvalue()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in ((320,568),(390,844),(768,900),(1280,900)):
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errs=[];page.on('pageerror',lambda err: errs.append(str(err)))
        def collection(route):
            data=json.loads(route.request.post_data)
            records=[]
            for n in data['identifiers']:
                name=n['name']
                records.append({'name':name,'image_uris':{k:f'https://cards.scryfall.io/{k}/front/card-{name}.jpg' for k in ('small','normal','art_crop')}, 'oracle_text':name})
            route.fulfill(status=200,content_type='application/json',body=json.dumps({'data':records}),headers={'Access-Control-Allow-Origin':'*'})
        page.route('https://api.scryfall.com/cards/collection',collection)
        page.route('https://cards.scryfall.io/**',lambda route:route.fulfill(status=200,body=img_bytes,content_type='image/jpeg'))
        page.set_content(html,wait_until='load',timeout=20000)
        page.wait_for_function("() => document.querySelector('#artStatus').textContent === 'SCRYFALL IMAGES'",timeout=7000)
        page.locator('#scenarioSelect').select_option('2')
        assert page.locator('.battle-card').count()==1
        assert page.locator('.battle-card .pt,.battle-card .pt-replacement').count()==0,(width,'printed state has overlay')
        page.evaluate('''()=>{game.units[0].damage=1;render()}''')
        assert page.locator('.battle-card .pt-replacement').count()==0,(width,'marked damage changed toughness label')
        page.locator('#restartButton').click()
        page.locator('[data-land="land-1"]').click()
        page.locator('[data-drag-card="growth"]').drag_to(page.locator('[data-unit="bear"]'),force=True)
        page.locator('#passButton').click()
        replacement=page.locator('.battle-card .pt-replacement')
        assert replacement.count()==1,(width,'no replacement after Giant Growth')
        assert replacement.inner_text()=='5/5',(width,'wrong buff',replacement.inner_text())
        geometry=page.evaluate('''()=>{
           const face=document.querySelector('.battle-card-face').getBoundingClientRect();
           const stat=document.querySelector('.pt-replacement').getBoundingClientRect();
           const button=document.querySelector('.battle-card').getBoundingClientRect();
           return {face:face.toJSON(),stat:stat.toJSON(),button:button.toJSON(),viewport:innerHeight};
        }''')
        a,b=geometry['face'],geometry['stat']
        assert a['width']>15 and a['height']>25,(width,geometry)
        assert a['left']-1<=b['left']<=b['right']<=a['right']+1 and a['top']-1<=b['top']<=b['bottom']<=a['bottom']+1,(width,geometry)
        assert b['top']>a['top']+a['height']*.60 and b['left']>a['left']+a['width']*.12,(width,geometry)
        assert abs(a['width']/a['height']-488/680)<.03,(width,'card frame aspect ratio',geometry)
        assert not errs,(width,errs)
        if width in (320,390):page.screenshot(path=str(root/f'printed-stats-{width}.png'))
        print(width,height,'printed stats untouched; marked damage untouched; Giant Growth overlays 5/5 in bottom-right card box')
        page.close()
    browser.close()