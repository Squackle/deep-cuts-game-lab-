"""GRAFTBOUND v0.5 real-browser tests (Playwright + Chromium; WebGL2 via SwiftShader software rendering).
Serve the Game Lab root on :8765 (python3 -m http.server 8765), then: python3 graftbound/tests/e2e.py
Uses ?gfx=performance&anim=instant&live=0. Verifies flows, routes and layout — NOT real-device performance."""
import time, json, sys, os
from playwright.sync_api import sync_playwright
CH = os.environ.get('LC_CHROMIUM', "/opt/pw-browsers/chromium-1228/chrome-linux64/chrome")
ORIGIN = os.environ.get('LC_ORIGIN', "http://localhost:8765")
Q = "?gfx=performance&anim=instant&live=0"
URL = ORIGIN + "/graftbound/index.html" + Q
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
SHOTS = os.environ.get('LC_SHOTS', os.path.expanduser('~/shots')); os.makedirs(SHOTS, exist_ok=True)
results = []
def check(name, cond, info=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (" — " + str(info)[:220] if info else ""), flush=True)
def idle(pg, t=30):
    end = time.time() + t
    while time.time() < end:
        if pg.evaluate("!window.__LC.battle.busy && !window.__LC.skipAbsorb"): return True
        time.sleep(0.1)
    return False
def wait_screen(pg, sel, t=20):
    try: pg.wait_for_selector(sel, timeout=t * 1000); return True
    except Exception: return False
def wait_phase(pg, phase, t=30):
    end = time.time() + t
    while time.time() < end:
        if pg.evaluate("window.__LC.run && window.__LC.run.phase") == phase: return True
        time.sleep(0.2)
    return False
def tile_xy(pg, x, y): return pg.evaluate(f"(()=>{{const s=window.__LC.scene; const p=s.project(s.world({x},{y})); const r=s.canvas.getBoundingClientRect(); return [p.x+r.left,p.y+r.top];}})()")
def binfo(pg): return pg.evaluate("""(()=>{const b=window.__LC.run&&window.__LC.run.battle; if(!b) return null; const p=b.units.find(u=>u.hero); return {phase:b.phase,p:{x:p.x,y:p.y,hp:p.hp,maxHp:p.maxHp,power:p.power,toughness:p.toughness,kw:p.keywords},enemies:b.units.filter(u=>u.side==='enemy'&&u.hp>0).map(u=>({uid:u.uid,x:u.x,y:u.y,hp:u.hp}))};})()""")
def click_tile(pg, x, y):
    cx, cy = tile_xy(pg, x, y); pg.mouse.click(cx, cy); time.sleep(0.1); idle(pg)
def win_battle(pg):
    pg.evaluate("(()=>{const b=window.__LC.battle.s; b.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=0); b.phase='won'; window.__LC.battle.checkEnd();})()")
    ok = wait_phase(pg, 'reward', 20)
    if wait_screen(pg, ".result [data-go]", 10): pg.click(".result [data-go]")   # v0.6 encounter score record
    return ok
def pass_intro(pg):
    if wait_screen(pg, ".intro [data-go]", 10): pg.click(".intro [data-go]")
    return wait_screen(pg, "g.node.avail")
def open_pack(pg):
    wait_screen(pg, "#pack"); pg.click("#pack", force=True); time.sleep(0.5); pg.click("#rw-reveal", force=True); time.sleep(0.8)
    # SwiftShader renders ~3 fps on phone viewports, so CSS transitions finish late in wall-clock time: wait for layout to settle.
    pg.wait_for_function("[...document.querySelectorAll('.slot')].every(s=>getComputedStyle(s).transform==='none' || getComputedStyle(s).transform==='matrix(1, 0, 0, 1, 0, 0)' || !matchMedia('(max-width: 760px)').matches)", timeout=20000)
def take(pg, cid, release=None):
    pg.locator(f".slot[data-id='{cid}']").click(force=True); time.sleep(0.3)
    if release is not None: pg.locator(f"input[name=rel][value='{release}']").check(force=True)
    pg.click("[data-take]", force=True); time.sleep(0.6); idle(pg, 20)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CH, args=ARGS)
    ctx = br.new_context(viewport={"width": 1100, "height": 720}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and 'favicon' not in m.text else None)
    # ── routes ──
    pg.goto(ORIGIN + "/living-card/?anim=instant&live=0&x=1#k"); pg.wait_for_url("**/graftbound/**", timeout=15000)
    check("route: /living-card/ redirects to /graftbound/ keeping query + hash", "/graftbound/?anim=instant&live=0&x=1#k" in pg.url, pg.url)
    pg.goto(URL); wait_screen(pg, "text=Begin Adventure", 40)
    check("route: /graftbound/ loads the game; title GRAFTBOUND", "GRAFTBOUND" in pg.title() and pg.locator(".title-wrap .logo").count() == 1, pg.title())
    check("assets: every sprite, layer and texture loaded", pg.evaluate("Object.keys(window.__LC.assets.images).length") >= 23 and pg.evaluate("Object.keys(window.__LC.assets.parts).length") >= 19)
    check("settings no longer offer an original-card mode", "Original set" not in pg.inner_text("body"))
    pg.click("text=Begin Adventure"); check("intro shown", pass_intro(pg))
    pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
    info = binfo(pg); check("start: The Blank 1/1, no abilities, 7 health", info['p']['power'] == 1 and info['p']['kw'] == {} and info['p']['maxHp'] == 7, info['p'])
    pg.evaluate("document.getElementById('hint').classList.remove('show')")  # tutorial hint may cover the top of the board
    time.sleep(1.5)  # v0.6: let the camera finish easing from the map view before projecting tile coordinates
    # pick a foe whose tile is not covered by HUD panels (the plate sits over the top-left of the board)
    cand = [e for e in info['enemies'] if pg.evaluate(f"(()=>{{const [x,y]={tile_xy(pg, e['x'], e['y'])}; const el=document.elementFromPoint(x,y); return el && el.id==='gl';}})()")]
    en = (cand or info['enemies'])[0]; x, y = tile_xy(pg, en['x'], en['y']); pg.mouse.move(x - 30, y); pg.mouse.move(x, y, steps=4)
    ok = False
    for _ in range(25):
        if pg.evaluate("document.getElementById('inspect').classList.contains('show') && !!window.__LC.battle.hover"): ok = True; break
        time.sleep(0.2)
    check("hover inspector with attack preview", ok, pg.inner_text("#inspect")[:80])
    check("win first battle", win_battle(pg))
    cards = pg.evaluate("window.__LC.run.pending.cards")
    check("tutorial booster: 3 REAL Magic cards incl. Typhoid Rats (real 1/1 Deathtouch)", len(cards) == 3 and all(c.startswith('mtg:') for c in cards) and 'mtg:typhoid-rats' in cards, cards)
    check("booster wrapper: ornamental SVG, seal and foil present", pg.locator("#pack .pk-art").count() == 1 and pg.locator("#pack .pk-seal").count() == 1 and pg.locator("#pack .pk-foil").count() == 1)
    pg.screenshot(path=f"{SHOTS}/e2e_pack_closed.png")
    open_pack(pg)
    check("seal breaks, wrapper opens, three cards revealed", pg.locator("#pack.broken.open").count() == 1 and pg.locator(".slot.revealed").count() == 3)
    names = pg.evaluate("[...document.querySelectorAll('.slot .lc-card')].map(c=>{const n=c.querySelector('.nm'); return n? n.textContent : c.querySelector('img') && c.querySelector('img').alt;})")
    check("each card shows its real name and the GRAFTBOUND effect line", all(names) and pg.locator(".slot .ingame").count() == 3, names)
    check("creature cards compare with your build (1/1 → …)", pg.locator(".slot .ingame .cmp").count() >= 1)
    pg.locator(".slot[data-id='mtg:typhoid-rats'] .zoom").click(force=True); time.sleep(0.3)
    check("cards can be enlarged/inspected", pg.locator(".modal-box .inspect-card .lc-card.big").count() == 1); pg.click(".modal-box [data-close]"); time.sleep(0.2)
    pg.screenshot(path=f"{SHOTS}/e2e_pack_open.png")
    pg.locator(".slot[data-id='mtg:typhoid-rats']").click(force=True); time.sleep(0.3)
    det = pg.inner_text("#rw-detail"); check("detail: You become 2/2 + Deathtouch, Graft button", "2/2" in det and "Deathtouch" in det and "Graft Typhoid Rats" in det, det[:120])
    pg.click("[data-take]", force=True); time.sleep(0.6); idle(pg, 20)
    if wait_screen(pg, "#pack", 8) and pg.evaluate("window.__LC.run.pending && window.__LC.run.pending.tier==='primer'"):   # v0.8 Spell Primer
        check("v0.8: the Spell Primer offers 3 spells after the first victory", pg.evaluate("window.__LC.run.pending.cards.length") == 3)
        open_pack(pg); take(pg, pg.evaluate("window.__LC.run.pending.cards[0]"))
    wait_screen(pg, "g.node.avail")
    evo = pg.evaluate("window.__LC.run.evo")
    check("grafted: 2/2 Deathtouch from a real card", evo['power'] == 2 and evo['toughness'] == 2 and evo['keywords'] == {'deathtouch': 1} and evo['absorbed'][0]['cardId'] == 'mtg:typhoid-rats')
    pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
    tgt = pg.evaluate("(()=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); const e=s.units.find(u=>u.side==='enemy'&&u.hp>0&&!u.legendary); e.x=p.x; e.y=p.y-1; e.hp=e.maxHp=50; e.statuses.shield=0; delete e.keywords.armor; window.__LC.battle.refresh(); return {uid:e.uid,x:e.x,y:e.y};})()")
    click_tile(pg, tgt['x'], tgt['y']); time.sleep(0.3)
    check("deathtouch works: one strike destroys a 50-health foe", pg.evaluate(f"window.__LC.battle.s.units.find(u=>u.uid=={tgt['uid']}).hp") == 0)
    # ── long-range spells + Lightning Bolt VFX ──
    if pg.evaluate("!!window.__LC.battle.s && window.__LC.battle.s.phase==='player'"):
        e = pg.evaluate("(()=>{const s=window.__LC.battle.s; s.spellbook=[{id:'mtg:lightning-bolt',level:1}]; s.p.mana=5; const p=s.units.find(u=>u.hero); const e=s.units.filter(u=>u.side==='enemy'&&u.hp>0).sort((a,b)=>(Math.abs(b.x-p.x)+Math.abs(b.y-p.y))-(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)))[0]; e.hp=e.maxHp=20; e.statuses.shield=0; window.__LC.battle.refresh(); return {uid:e.uid,x:e.x,y:e.y,d:Math.abs(e.x-p.x)+Math.abs(e.y-p.y)};})()")
        pg.click("[data-spell='mtg:lightning-bolt']"); time.sleep(0.3)
        check("spell selected; the far foe is a legal target", pg.evaluate("window.__LC.battle.spell") == 'mtg:lightning-bolt' and pg.evaluate(f"(()=>{{const b=window.__LC.battle; return b.s.units.some(u=>u.uid=={e['uid']});}})()"))
        click_tile(pg, e['x'], e['y']); time.sleep(0.2)
        hp = pg.evaluate(f"window.__LC.battle.s.units.find(u=>u.uid=={e['uid']}).hp")
        check(f"Lightning Bolt hits a foe {e['d']} tiles away for 3", hp == 17, hp)
        check("Lightning Bolt spawns procedural lightning geometry", pg.evaluate("window.__LC.scene.boltsMade || 0") > 0, pg.evaluate("window.__LC.scene.boltsMade"))
    # ── save / reload / continue ──
    snap = pg.evaluate("JSON.stringify(window.__LC.run.evo)")
    pg.reload(); wait_screen(pg, "text=Continue Adventure", 40); pg.click("text=Continue Adventure"); time.sleep(1.2); idle(pg)
    check("save & reload restores the grafted creature", pg.evaluate("JSON.stringify(window.__LC.run.evo)") == snap)
    # ── Wayshrine ──
    pg.evaluate("""(()=>{const L=window.__LC; const r=L.run; L.battle.stop(); r.battle=null; r.phase='shrine'; r.spellbook=[{id:'mtg:shock',level:1}]; r.hp=Math.max(1,r.hp-3); r.shrine={options:['restoration','spark','offering','arcane'],node:r.current}; L.save(); L.shrine();})()""")
    wait_screen(pg, ".shrine-opts"); check("Wayshrine shows four distinct offerings", pg.locator(".shrine-opts .opt").count() == 4, pg.inner_text(".shrine-opts")[:200])
    pg.screenshot(path=f"{SHOTS}/e2e_shrine.png")
    before = pg.evaluate("window.__LC.run.sparkBonus"); pg.click(".opt[data-c='spark']"); wait_screen(pg, "g.node.avail")
    check("Spark Font applied, persisted, shrine consumed", pg.evaluate("window.__LC.run.sparkBonus") == before + 3 and pg.evaluate("window.__LC.run.shrine") is None)
    # ── acts II & III render with their own environments ──
    for act, theme in ((1, 'warrens'), (2, 'nexus')):
        pg.evaluate(f"""(async()=>{{const L=window.__LC; const r=L.run; const {{generateMap}}=await import('./src/engine/campaign.js'); r.act={act}; r.map=generateMap(r.seed,{{act:{act}}}); r.current=null; r.visited=[]; r.phase='map'; L.closeModal(); L.goMap();}})()""")
        wait_screen(pg, "g.node.avail"); check(f"Act {act + 1} map: {pg.inner_text('.map-sheet h2')}", ["The Ashen Warrens", "The Fractured Nexus"][act - 1] in pg.inner_text(".map-sheet h2"))
        pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.5); idle(pg)
        check(f"Act {act + 1} battle uses the {theme} theme and new enemies", pg.evaluate("window.__LC.scene.theme") == theme and pg.evaluate("window.__LC.battle.s.units.some(u=>u.side==='enemy'&&['cinderling','harpooner','ashbrute','emberseer','riftstalker','nullwarden','shardling','hound','grub','hexer'].includes(u.defId))"))
        pg.screenshot(path=f"{SHOTS}/e2e_act{act + 1}.png")
    # ── v0.4 save compatibility at /graftbound/ ──
    pg.evaluate("""(async()=>{window.__LC.run=null; /* v0.8 saves on pagehide; drop the live run so it cannot overwrite the injected v0.4 save */ const s=await import('./src/engine/save.js'); const run=await import('./src/engine/run.js'); const ev=await import('./src/engine/evolution.js');
      const r=run.newRun({seed:99,tutorial:true}); let e=ev.newEvolution(); for (const id of ['nightcap_toad','galecrest_roc']) e=ev.absorb(e,id).evo;
      const old={...JSON.parse(JSON.stringify(r)),v:2,contentMode:'original',evo:e,spellbook:[{id:'ember_dart',level:1}]}; for (const k of ['act','actHistory','manaBonus','sparkFonts','wardNext','hp','shrine']) delete old[k];
      localStorage.setItem(s.KEYS.run, s._internal.wrap(2, old));})()""")
    pg.goto(URL); wait_screen(pg, "text=Continue Adventure", 40)
    check("v0.4 save loads at /graftbound/ with an update notice", "v0.4 adventure continues" in pg.inner_text("#toast") or pg.evaluate("window.__LC.loadInfo.migrated"))
    pg.click("text=Continue Adventure"); wait_screen(pg, "g.node.avail")
    check("legacy grafts kept exactly; legacy card shown as Legacy", pg.evaluate("window.__LC.run.evo.absorbed.map(a=>a.cardId).join()") == "nightcap_toad,galecrest_roc" and pg.evaluate("window.__LC.run.v") == 5)
    pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
    check("migrated adventure is playable (battle starts)", pg.evaluate("!!window.__LC.battle.s"))
    check("no page errors (desktop)", not errs, errs[:3])
    ctx.close()
    # ── mobile booster ──
    for (w, h, label) in [(390, 844, 'phone-390'), (320, 640, 'phone-320')]:
        ctx = br.new_context(viewport={"width": w, "height": h}, has_touch=True, is_mobile=True); pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); wait_screen(pg, "text=Begin Adventure", 40); pg.tap("text=Begin Adventure"); pass_intro(pg)
        pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
        boxes = [pg.locator(s).bounding_box() for s in ['#plate', '#endTurn', '#tray']]
        hud_ok = all(b and b['x'] >= 0 and b['x'] + b['width'] <= w + 1 for b in boxes)
        pg.screenshot(path=f"{SHOTS}/e2e_{label}_battle.png")
        win_battle(pg); open_pack(pg)
        widths = pg.evaluate("[...document.querySelectorAll('.slot .lc-card')].map(c=>c.offsetWidth)")
        reach = []
        for i in range(3):
            pg.locator(f".slot[data-i='{i}']").scroll_into_view_if_needed(); time.sleep(0.2)
            b = pg.locator(f".slot[data-i='{i}']").bounding_box(); reach.append(b['x'] >= -1 and b['x'] + b['width'] <= w + 1)
        fs = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.slot .lc-card .ingame')).fontSize)")
        pg.locator(".slot[data-i='1']").tap(); time.sleep(0.4)
        sel = pg.evaluate("!!document.querySelector('.slot.sel')")
        pg.screenshot(path=f"{SHOTS}/e2e_{label}_pack.png")
        check(f"mobile {label}: HUD fits; 3 cards each ≥ {min(widths):.0f}px wide, scrollable into view, selectable; effect text {fs:.1f}px", hud_ok and min(widths) >= min(200, w * 0.6) and all(reach) and sel and fs >= 9.5, [hud_ok, widths, reach, sel, fs])
        check(f"no page errors ({label})", not errs, errs[:2]); ctx.close()
    br.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} e2e checks passed"); sys.exit(1 if fails else 0)
