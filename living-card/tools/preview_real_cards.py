"""Dev tool: preview the booster with LIVE real-card faces using MOCKED Scryfall responses (the build sandbox
cannot reach Scryfall). Mock images are labeled 'MOCK' and are NOT Scryfall art. Usage: preview_real_cards.py OUT.png"""
import io, json, subprocess, sys, time, re, os
from urllib.parse import urlparse, parse_qs
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), '..')
pool = json.loads(subprocess.check_output(['node', '-e', "import('./src/cards/real-pool.js').then(m=>console.log(JSON.stringify([...m.REAL_CREATURES,...m.REAL_SPELLS])))"], cwd=ROOT))
by_name = {c['name'].lower(): c for c in pool}
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
COL = {'W': (235, 225, 190), 'U': (110, 160, 210), 'B': (90, 80, 90), 'R': (200, 90, 60), 'G': (90, 150, 90)}
def mock_png(name):
    c = by_name.get(name.lower(), {}); col = COL.get((c.get('color_identity') or ['W'])[0], (150, 150, 150))
    im = Image.new('RGB', (488, 680), (24, 22, 20)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((14, 14, 474, 666), 24, fill=col); d.rectangle((40, 90, 448, 380), fill=(40, 40, 46))
    d.text((44, 40), c.get('name', name), fill=(0, 0, 0)); d.text((390, 40), c.get('mana_cost', ''), fill=(0, 0, 0))
    d.text((44, 400), c.get('type_line', ''), fill=(0, 0, 0)); d.text((150, 220), 'MOCK IMAGE (not Scryfall art)', fill=(240, 200, 120))
    if c.get('power'): d.text((410, 620), f"{c['power']}/{c['toughness']}", fill=(0, 0, 0))
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
def card_json(name):
    c = by_name[name.lower()]
    return {'object': 'card', 'id': '00000000-0000-4000-8000-' + format(abs(hash(name)) % 10**12, '012d'), 'oracle_id': 'x', 'name': c['name'], 'mana_cost': c['mana_cost'], 'cmc': c['cmc'],
            'type_line': c['type_line'], 'oracle_text': ', '.join(c['keywords']).capitalize() if not c.get('spell') else '(mock Oracle text)', 'power': c.get('power'), 'toughness': c.get('toughness'),
            'keywords': c['keywords'], 'color_identity': c['color_identity'], 'rarity': c['rarity'], 'set': 'mock', 'set_name': 'MOCK DATA', 'artist': '(mock)',
            'image_uris': {'normal': f"https://cards.scryfall.io/normal/front/mock/{slug(name)}.png"}, 'scryfall_uri': 'https://scryfall.com/card/mock/1/' + slug(name)}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('LC_CHROMIUM', "/opt/pw-browsers/chromium-1228/chrome-linux64/chrome"), args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1180, "height": 760})
    pg.route("https://api.scryfall.com/**", lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(card_json(parse_qs(urlparse(r.request.url).query)['exact'][0]))))
    pg.route("https://cards.scryfall.io/**", lambda r: r.fulfill(status=200, content_type='image/png', body=mock_png(r.request.url.rsplit('/', 1)[1][:-4].replace('-', ' '))))
    pg.goto("http://localhost:8765/living-card/play.html?gfx=performance&anim=fast"); pg.wait_for_selector("text=Begin Adventure", timeout=40000)
    pg.click("text=Begin Adventure"); pg.wait_for_selector(".intro [data-go]"); pg.click(".intro [data-go]")
    pg.wait_for_selector("g.node.avail"); pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(2)
    pg.evaluate("(()=>{const L=window.__LC; const b=L.battle.s; b.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=0); b.phase='won'; L.battle.checkEnd();})()")
    pg.wait_for_selector("#pack"); time.sleep(0.5); pg.click("#rw-reveal", force=True); time.sleep(3)
    real = pg.evaluate("[...document.querySelectorAll('.slot')].map(s=>s.dataset.id).find(id=>window.__LC.debug.card(id).reference)")
    if real: pg.locator(f".slot[data-id='{real}']").click(force=True); time.sleep(6)
    pg.screenshot(path=sys.argv[1]); print('live faces:', pg.locator('.lc-card.real').count(), 'selected:', real)
    b.close()
