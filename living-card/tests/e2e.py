"""GRAFTBOUND real-browser end-to-end tests (Playwright + Chromium; WebGL2 via SwiftShader software rendering).
Serve the Game Lab root on :8765 (python3 -m http.server 8765), then: python3 living-card/tests/e2e.py
Uses ?gfx=performance&anim=instant&live=0. Verifies flows and layout, NOT real-device performance.
LC_QUERY adds query params (e.g. "&cards=original")."""
import time, json, sys, os
from playwright.sync_api import sync_playwright
CH = os.environ.get('LC_CHROMIUM', "/opt/pw-browsers/chromium-1228/chrome-linux64/chrome")
BASE = os.environ.get('LC_URL', "http://localhost:8765/living-card/index.html")
URL = BASE + "?gfx=performance&anim=instant&live=0" + os.environ.get('LC_QUERY', '')
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
SHOTS = os.environ.get('LC_SHOTS', os.path.expanduser('~/shots'))
os.makedirs(SHOTS, exist_ok=True)
results = []
def check(name, cond, info=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (" — " + str(info)[:200] if info else ""), flush=True)
def idle(pg, t=30):
    end = time.time() + t
    while time.time() < end:
        if pg.evaluate("!window.__LC.battle.busy && !window.__LC.skipAbsorb"): return True
        time.sleep(0.1)
    return False
def tile_xy(pg, x, y):
    return pg.evaluate(f"(()=>{{const s=window.__LC.scene; const p=s.project(s.world({x},{y})); const r=s.canvas.getBoundingClientRect(); return [p.x+r.left,p.y+r.top];}})()")
def binfo(pg):
    return pg.evaluate("""(()=>{const r=window.__LC.run; const b=r&&r.battle; if(!b) return null; const p=b.units.find(u=>u.hero);
      return {phase:b.phase, turn:b.turn, p:{x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,power:p.power,toughness:p.toughness,kw:p.keywords}, enemies:b.units.filter(u=>u.side==='enemy'&&u.hp>0).map(u=>({uid:u.uid,x:u.x,y:u.y,hp:u.hp})), moveLeft:b.p.moveLeft};})()""")
def click_tile(pg, x, y, touch=False):
    cx, cy = tile_xy(pg, x, y)
    if touch: pg.touchscreen.tap(cx, cy); time.sleep(0.15); pg.touchscreen.tap(cx, cy)
    else: pg.mouse.click(cx, cy)
    time.sleep(0.1); idle(pg)
def wait_screen(pg, sel, t=20):
    try: pg.wait_for_selector(sel, timeout=t * 1000); return True
    except Exception: return False
def pass_intro(pg, touch=False):
    """New adventures show the GRAFTBOUND introduction; continue past it."""
    if wait_screen(pg, ".intro [data-go]", 10):
        if touch: pg.tap(".intro [data-go]")
        else: pg.click(".intro [data-go]")
    return wait_screen(pg, "g.node.avail")
def play_battle(pg, max_turns=40, touch=False):
    for _ in range(max_turns):
        idle(pg); info = binfo(pg)
        if not info or info['phase'] != 'player' or not info['enemies']: break
        p = info['p']; en = sorted(info['enemies'], key=lambda e: abs(e['x'] - p['x']) + abs(e['y'] - p['y']))[0]
        before = json.dumps(info); click_tile(pg, en['x'], en['y'], touch)
        if json.dumps(binfo(pg)) == before:
            best = pg.evaluate("""(([ex,ey])=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); const df=window.__LC.debug.distanceField(s,{x:ex,y:ey}); const t=[];
              for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){ if(Math.abs(x-p.x)+Math.abs(y-p.y)<=s.p.moveLeft && s.terrain[y*s.w+x]!==2 && s.terrain[y*s.w+x]!==1) t.push([x,y,df[y*s.w+x]]); } return t.sort((a,b)=>a[2]-b[2]);})""", [en['x'], en['y']])
            for t in best[:5]:
                b2 = json.dumps(binfo(pg)); click_tile(pg, t[0], t[1], touch)
                if json.dumps(binfo(pg)) != b2: break
        info = binfo(pg)
        if not info or info['phase'] != 'player': break
        if touch: bx = pg.locator('#endTurn').bounding_box(); pg.touchscreen.tap(bx['x'] + 20, bx['y'] + 20)
        else: pg.click('#endTurn')
        time.sleep(0.2); idle(pg, 60)
    time.sleep(0.5)
def ensure_battle(pg):
    """Advance (reward -> map -> next node) until a battle with the player to act is running."""
    for _ in range(4):
        ph = pg.evaluate("window.__LC.run && window.__LC.run.phase")
        if ph == 'battle' and pg.evaluate("!!window.__LC.battle.s && window.__LC.battle.s.phase==='player'"): return True
        if ph == 'reward':
            wait_screen(pg, "#pack"); pg.click("#rw-reveal", force=True); time.sleep(1); pg.locator(".slot").first.click(force=True); time.sleep(0.3); pg.click("[data-take]", force=True); time.sleep(0.5); idle(pg, 20)
        if pg.evaluate("window.__LC.run.phase") == 'map':
            wait_screen(pg, "g.node.avail"); pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
        if pg.evaluate("window.__LC.run.phase") == 'shrine': pg.click("[data-c='spark']"); time.sleep(0.5)
    return pg.evaluate("!!window.__LC.battle.s && window.__LC.battle.s.phase==='player'")
def wait_phase(pg, phase, t=30):
    end = time.time() + t
    while time.time() < end:
        if pg.evaluate("window.__LC.run && window.__LC.run.phase") == phase: return True
        time.sleep(0.2)
    return False

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CH, args=ARGS)
    ctx = br.new_context(viewport={"width": 960, "height": 640}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); wait_screen(pg, "text=Begin Adventure", 40)
    check("1 game launches to title", pg.locator("text=Begin Adventure").count() == 1)
    check("   branding: page title, logo and tagline say GRAFTBOUND", "GRAFTBOUND" in pg.title() and pg.locator(".title-wrap .logo").get_attribute("aria-label") == "GRAFTBOUND" and "Begin as nothing. Become everything." in pg.inner_text(".tagline"), pg.title())
    check("   branding: no 'Living Card' left in player-facing text", "living card" not in (pg.inner_text("body") + pg.title()).lower())
    pg.screenshot(path=f"{SHOTS}/title.png")
    pg.click("text=Begin Adventure")
    check("   adventure introduction is shown for a new adventure", wait_screen(pg, ".intro [data-go]", 10) and "The Blank" in pg.inner_text(".intro"))
    pg.screenshot(path=f"{SHOTS}/intro.png")
    pass_intro(pg)
    pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.5); idle(pg)
    info = binfo(pg)
    check("2 enters first encounter as The Blank 1/1 with no abilities", info and info['p']['power'] == 1 and info['p']['toughness'] == 1 and info['p']['kw'] == {} and pg.evaluate("window.__LC.run.name") == 'The Blank', info and info['p'])
    hash0 = pg.evaluate("window.__LC.debug.heroSheetHash()")
    mo = pg.evaluate("(()=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); const o=[]; for(const [dx,dy] of [[0,-1],[1,0],[-1,0]]){const x=p.x+dx,y=p.y+dy; if(x>=0&&x<8&&y>=0&&y<8&&s.terrain[y*8+x]===0&&!s.units.some(u=>u.hp>0&&u.x===x&&u.y===y)) o.push([x,y]);} return o;})()")
    p0 = (info['p']['x'], info['p']['y']); click_tile(pg, *mo[0]); info = binfo(pg)
    check("3 moves across the battlefield by clicking a tile", (info['p']['x'], info['p']['y']) == tuple(mo[0]), (p0, info['p']))
    en = info['enemies'][0]; x, y = tile_xy(pg, en['x'], en['y']); pg.mouse.move(x, y); time.sleep(0.4)
    check("   hovering a foe shows inspector with attack preview", pg.locator("#inspect.show").count() == 1, pg.inner_text("#inspect")[:80])
    play_battle(pg)
    check("4 attacks and defeats the enemies", wait_phase(pg, 'reward', 20), pg.evaluate("window.__LC.run.phase"))
    cards = pg.evaluate("window.__LC.run.pending.cards")
    dt_card = pg.evaluate("window.__LC.run.pending.cards.find(id => { const c = window.__LC.debug.card(id); return c && c.kind==='creature' && c.power===2 && c.toughness===2 && c.keywords.deathtouch; })")
    check("5 receives a three-card booster containing a 2/2 deathtouch creature", len(cards) == 3 and dt_card, cards)
    if pg.evaluate("window.__LC.run.contentMode") == 'reference':
        check("   real cards mode: pack contains a real Magic card with its real name/mana cost", pg.evaluate("window.__LC.run.pending.cards.some(id => window.__LC.debug.card(id).reference)") and pg.locator('.slot .origin').count() >= 1 and pg.locator('.slot .pip').count() >= 1, cards)
    wait_screen(pg, "#pack"); pg.click("#pack", force=True); time.sleep(0.6); pg.click("#rw-reveal", force=True); time.sleep(1.2)
    check("6 reveals all three rewards", pg.locator(".slot .lc-card.flipped").count() == 0 and pg.locator(".slot.revealed").count() == 3)
    pg.screenshot(path=f"{SHOTS}/e2e_pack.png")
    pg.locator(f".slot[data-id='{dt_card}']").click(force=True); time.sleep(0.4)
    det = pg.inner_text("#rw-detail")
    check("7 selects the 2/2 deathtouch creature; preview shows 1/1 → 3/3 + Deathtouch and a Graft button", "3/3" in det and "Deathtouch" in det and "Graft " in det, det[:120])
    pg.click("[data-take]", force=True); time.sleep(0.5); idle(pg, 20); wait_screen(pg, "g.node.avail")
    evo = pg.evaluate("window.__LC.run.evo")
    check("8-9 grafted: now 3/3 with deathtouch, history recorded", evo['power'] == 3 and evo['toughness'] == 3 and evo['keywords'] == {'deathtouch': 1} and evo['absorbed'][0]['cardId'] == dt_card, (evo['power'], evo['toughness'], evo['keywords']))
    hash1 = pg.evaluate("window.__LC.debug.heroSheetHash()")
    vis = pg.evaluate("(()=>{const v=[...window.__LC.scene.units.values()].find(u=>u.key==='blank'); return {own: !!(v&&v.ownTex), scale: v&&v.scale};})()")
    check("10 visual evolution: composed sprite sheet changed", hash0 != hash1 and vis['own'], (hash0, hash1, vis))
    check("   map panel shows 3/3", "3/3" in pg.inner_text(".mp-pt").replace("\n", ""))
    pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.5); idle(pg)
    info = binfo(pg)
    check("11 next encounter starts as 3/3 deathtouch with 11 health", info['p']['power'] == 3 and info['p']['toughness'] == 3 and info['p']['kw'] == {'deathtouch': 1} and info['p']['maxHp'] == 11, info['p'])
    check("   HUD plate shows 3/3 and Deathtouch", "3/3" in pg.inner_text("#plate").replace("\n", "") and "Deathtouch" in pg.inner_text("#plate"))
    for _ in range(12):
        idle(pg); info = binfo(pg)
        if not info or info['phase'] != 'player' or not info['enemies']: ensure_battle(pg); continue
        if pg.evaluate("window.__LC.battle.s && (()=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); return s.units.some(u=>u.side==='enemy'&&u.hp>0&&!u.legendary&&Math.abs(u.x-p.x)+Math.abs(u.y-p.y)<=1+s.p.moveLeft);})()"): break
        en = sorted(info['enemies'], key=lambda e: abs(e['x'] - info['p']['x']) + abs(e['y'] - info['p']['y']))[0]
        best = pg.evaluate("""(([ex,ey])=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); const df=window.__LC.debug.distanceField(s,{x:ex,y:ey}); const t=[]; for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){ if(Math.abs(x-p.x)+Math.abs(y-p.y)<=s.p.moveLeft&&s.terrain[y*s.w+x]===0) t.push([x,y,df[y*s.w+x]]);} return t.sort((a,b)=>a[2]-b[2]);})""", [en['x'], en['y']])
        if best: click_tile(pg, best[0][0], best[0][1])
        pg.click('#endTurn'); time.sleep(0.2); idle(pg, 60)
    tgt = pg.evaluate("(()=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); const e=s.units.filter(u=>u.side==='enemy'&&u.hp>0&&!u.legendary).sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0]; e.hp=e.maxHp=50; e.statuses.shield=0; return {uid:e.uid,x:e.x,y:e.y};})()")
    click_tile(pg, tgt['x'], tgt['y']); time.sleep(0.3)
    hp_after = pg.evaluate(f"window.__LC.battle.s ? window.__LC.battle.s.units.find(u=>u.uid==={tgt['uid']}).hp : (window.__LC.run.battle ? -1 : 0)")
    check("12 deathtouch works in combat: one click-attack destroyed a 50-health foe", hp_after == 0, hp_after)
    idle(pg)
    snap = pg.evaluate("(()=>{const r=window.__LC.run; return JSON.stringify({evo:r.evo, visited:r.visited, phase:r.phase, units:r.battle&&r.battle.units.map(u=>[u.uid,u.x,u.y,u.hp])});})()")
    pg.reload(); wait_screen(pg, "text=Continue Adventure", 40)
    check("13 save & reload: title offers Continue", pg.locator("text=Continue Adventure").count() == 1)
    pg.click("text=Continue Adventure"); time.sleep(1.5); idle(pg)
    snap2 = pg.evaluate("(()=>{const r=window.__LC.run; return JSON.stringify({evo:r.evo, visited:r.visited, phase:r.phase, units:r.battle&&r.battle.units.map(u=>[u.uid,u.x,u.y,u.hp])});})()")
    check("14 restored: grafted creature, stats, abilities, map progress and battle state preserved", snap == snap2)
    check("   continuing does not replay the introduction", pg.locator(".intro").count() == 0)
    ensure_battle(pg)
    check("   (setup) in a battle for spellbook test", pg.evaluate("!!window.__LC.battle.s && window.__LC.battle.s.phase==='player'"))
    if pg.evaluate("!!window.__LC.battle.s && window.__LC.battle.s.phase==='player'"):
        pg.evaluate("(()=>{const s=window.__LC.battle.s; s.spellbook=[{id:'ember_dart',level:1}]; s.p.mana=3; window.__LC.battle.refresh();})()")
        e = pg.evaluate("(()=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); for (const e of s.units.filter(u=>u.side==='enemy'&&u.hp>0)) { e.hp=e.maxHp=20; e.statuses.shield=0; } const e=s.units.filter(u=>u.side==='enemy'&&u.hp>0)[0]; p.x=e.x; p.y=Math.min(7,e.y+2); if (s.units.some(u=>u!==p&&u.hp>0&&u.x===p.x&&u.y===p.y)) p.y=Math.max(0,e.y-2); s.terrain=s.terrain.map(()=>0); window.__LC.battle.refresh(); return {uid:e.uid,x:e.x,y:e.y,hp:e.hp};})()")
        pg.click("[data-spell='ember_dart']"); time.sleep(0.3)
        check("   spellbook: selecting Ember Dart highlights targets", pg.evaluate("window.__LC.battle.spell") == 'ember_dart')
        click_tile(pg, e['x'], e['y']); time.sleep(0.3)
        hp = pg.evaluate(f"window.__LC.battle.s.units.find(u=>u.uid==={e['uid']}).hp")
        check("   spellbook: casting damages the target and spends mana", hp == e['hp'] - 2 and pg.evaluate("window.__LC.battle.s.p.mana") == 2, (hp, e['hp']))
        pg.click("[data-spell='ember_dart']"); time.sleep(0.3)
        check("   invalid action feedback: recasting shows a reason", "Already cast this turn" in pg.inner_text("#toast"), pg.inner_text("#toast"))
    pg.click("#btn-menu"); time.sleep(0.3)
    check("   pause menu is branded", "GRAFTBOUND" in pg.inner_text(".modal-box"))
    pg.click("text=Abandon Adventure"); time.sleep(0.3); pg.click("[data-yes]"); wait_screen(pg, "text=New Adventure")
    check("   restart: abandoning shows the branded end screen", pg.locator(".end.lost").count() == 1 and "GRAFTBOUND" in pg.inner_text(".end") and "The Graft Unravels" in pg.inner_text(".end"))
    pg.click("text=New Adventure"); pass_intro(pg)
    check("   restart: new adventure begins as a fresh 1/1", pg.evaluate("window.__LC.run.evo.power") == 1 and pg.evaluate("window.__LC.run.evo.absorbed.length") == 0)
    check("no page errors (desktop)", not errs, errs[:3])
    ctx.close()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); wait_screen(pg, "text=Begin Adventure", 40)
    pg.tap("text=Begin Adventure"); pass_intro(pg, touch=True); pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.5); idle(pg)
    info = binfo(pg); tgt = (info['p']['x'], info['p']['y'] - 1)
    cx, cy = tile_xy(pg, *tgt)
    # Under SwiftShader load Chromium occasionally drops an injected tap before it reaches the page.
    # Retry only until the game has demonstrably received the FIRST tap (pendingTap set); the two-tap rule is still asserted.
    for attempt in range(3):
        pg.touchscreen.tap(cx, cy); time.sleep(0.4)
        if pg.evaluate("window.__LC.battle.pendingTap") is not None: break
    check("touch: first tap previews only (tap registered, no move yet)", pg.evaluate("window.__LC.battle.pendingTap") is not None and (binfo(pg)['p']['x'], binfo(pg)['p']['y']) == (info['p']['x'], info['p']['y']), f"attempts={attempt + 1} diag=" + str(pg.evaluate(f"(()=>{{const b=window.__LC.battle; const el=document.elementFromPoint({cx},{cy}); return {{busy:b.busy, phase:b.s&&b.s.phase, mode:window.__LC.mode, modal:window.__LC.modalOpen(), toast:document.getElementById('toast').innerText, el:el&&(el.id||String(el.className)), pick:window.__LC.scene.pick({cx},{cy}), screen:document.getElementById('screen').className, move:b.s&&b.s.p.moveLeft}};}})()")))
    pg.touchscreen.tap(cx, cy); time.sleep(0.3); idle(pg)
    check("touch: second tap confirms the move", (binfo(pg)['p']['x'], binfo(pg)['p']['y']) == tgt, binfo(pg)['p'])
    pg.screenshot(path=f"{SHOTS}/e2e_mobile_battle.png")
    play_battle(pg, touch=True)
    check("touch: a whole battle can be won with taps", wait_phase(pg, 'reward', 20), pg.evaluate("window.__LC.run.phase"))
    check("no page errors (touch)", not errs, errs[:3])
    ctx.close()
    for (w, h, label) in [(320, 640, 'phone-320'), (375, 667, 'phone-375'), (390, 844, 'phone-390'), (768, 1024, 'tablet-768'), (1280, 800, 'desktop-1280')]:
        ctx = br.new_context(viewport={"width": w, "height": h}, has_touch=w < 800); pg = ctx.new_page()
        pg.goto(URL); wait_screen(pg, "text=Begin Adventure", 40)
        logo_fits = pg.evaluate("(()=>{const r=document.querySelector('.title-wrap .logo').getBoundingClientRect(); return r.left>=-1 && r.right<=innerWidth+1;})()")
        pg.click("text=Begin Adventure")
        intro_fits = wait_screen(pg, ".intro [data-go]", 10) and pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
        pass_intro(pg)
        okmap = pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
        pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
        boxes = [pg.locator(s).bounding_box() for s in ['#plate', '#endTurn', '#tray']]
        inside = all(b and b['x'] >= 0 and b['x'] + b['width'] <= w + 1 and b['y'] + b['height'] <= h + 1 for b in boxes)
        overlap = boxes[0]['y'] + boxes[0]['height'] > boxes[1]['y']
        pg.screenshot(path=f"{SHOTS}/layout_{label}.png")
        pg.evaluate("(()=>{const b=window.__LC.battle.s; b.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=0); b.phase='won'; window.__LC.battle.checkEnd();})()")
        wait_screen(pg, "#pack"); pg.click("#rw-reveal", force=True); time.sleep(1.2)
        cards_fit = pg.evaluate("[...document.querySelectorAll('.slot')].every(s=>{const r=s.getBoundingClientRect(); return r.left>=-1 && r.right<=innerWidth+1;})")
        check(f"layout {label}: logo, intro, HUD, map & booster fit", logo_fits and intro_fits and okmap and inside and not overlap and cards_fit, [logo_fits, intro_fits, okmap, inside, not overlap, cards_fit])
        ctx.close()
    br.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} e2e checks passed")
sys.exit(1 if fails else 0)
