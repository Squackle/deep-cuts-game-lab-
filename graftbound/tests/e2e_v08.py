"""GRAFTBOUND v0.8 browser checks (Playwright + Chromium/SwiftShader). Serve the repo root on :8765 first.
Boss titles, spell hand, stances, Time Taken, Home labels, magnitude-scaled VFX, mobile hand. NOT real-device testing."""
import time, sys, os
from playwright.sync_api import sync_playwright
CH = os.environ.get('LC_CHROMIUM', "/opt/pw-browsers/chromium-1228/chrome-linux64/chrome")
ORIGIN = os.environ.get('LC_ORIGIN', "http://localhost:8765")
URL = ORIGIN + "/graftbound/index.html?gfx=performance&anim=instant&live=0"
SHOTS = os.environ.get('LC_SHOTS', os.path.expanduser('~/shots')); os.makedirs(SHOTS, exist_ok=True)
R = []
def check(n, c, info=""): R.append((n, bool(c))); print(("PASS " if c else "FAIL ") + n + (" — " + str(info)[:220] if info else ""), flush=True)
def idle(pg, t=30):
    end = time.time() + t
    while time.time() < end:
        if pg.evaluate("!window.__LC.battle.busy && !window.__LC.battle.autoEnding"): return True
        time.sleep(0.1)
    return False
BOSS_JS = """(async(act)=>{const L=window.__LC; const {generateMap}=await import('./src/engine/campaign.js'); const {enterNode}=await import('./src/engine/run.js');
  const r=L.run; r.act=act; r.map=generateMap(r.seed,{act}); r.phase='map'; r.current=r.map.nodes.find(n=>n.depth===6).id; r.visited=[r.current];
  enterNode(r, r.map.nodes.find(n=>n.type==='boss').id); L.closeModal(); L.runBattle(true); })"""
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CH, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = br.new_page(viewport={"width": 1180, "height": 760}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and 'favicon' not in m.text else None)
    pg.goto(URL); pg.wait_for_selector("text=Begin Adventure", timeout=60000)
    pg.click("[data-a='settings']"); time.sleep(0.3)
    check("settings offer a Cinematic animation speed", pg.locator("select[data-k='animSpeed'] option[value='cinematic']").count() == 1); pg.click("#modal [data-close]")
    pg.click("text=Begin Adventure"); pg.wait_for_selector(".intro [data-go]", timeout=20000); pg.click(".intro [data-go]"); pg.wait_for_selector("g.node.avail", timeout=30000)
    check("map: boss node label is a real name", "[object Object]" not in pg.inner_text(".map-sheet") and "The Thornmother" in pg.inner_text(".map-sheet"))
    # ── boss banners for all three acts ──
    for act, name in ((0, 'The Thornmother'), (1, 'The Pyre Matron'), (2, 'The Unwritten')):
        pg.evaluate("void " + BOSS_JS + f"({act}); 0"); time.sleep(1.5); idle(pg)
        last = pg.evaluate("document.getElementById('banner').dataset.last")
        check(f"Act {act + 1} boss introduction shows '{name}'", last == name and '[object' not in pg.inner_text('body'), last)
    pg.screenshot(path=f"{SHOTS}/v08_boss_act3.png")
    # ── spell hand of real cards + stances ──
    pg.evaluate("""(()=>{const b=window.__LC.battle,s=b.s; s.spellbook=[{id:'mtg:lightning-bolt',level:2},{id:'mtg:pyroclasm',level:1},{id:'mtg:disfigure',level:1},{id:'mtg:feat-of-resistance',level:1},{id:'mtg:titanic-growth',level:1}];
       s.p.mana=2; s.p.cast={}; b.refresh();})()""")
    time.sleep(0.4)
    n = pg.locator("#tray .handcard").count(); faces = pg.locator("#tray .handcard .lc-card").count()
    check(f"spell hand shows {n} card faces (actual Magic card frames) with GRAFTBOUND mana overlays", n == 5 and faces == 5 and pg.locator("#tray .hc-cost").count() == 5)
    states = pg.evaluate("[...document.querySelectorAll('#tray .handcard')].map(b=>b.className.match(/st-\\w+/)[0])")
    check("unaffordable spells stay visible but marked (Pyroclasm needs 3 mana)", 'st-nomana' in states and len(states) == 5, states)
    check("no broken images in the hand", pg.evaluate("[...document.querySelectorAll('#tray img')].every(i=>i.complete && i.naturalWidth>0 || i.closest('.img-failed'))"))
    pg.evaluate("window.__LC.battle.s.p.mana=6; window.__LC.battle.refresh()"); pg.keyboard.press("1"); time.sleep(0.3)
    check("keyboard 1 selects the first card (selected state + aria-pressed)", pg.evaluate("window.__LC.battle.spell") == 'mtg:lightning-bolt' and pg.locator("#tray .handcard.sel[aria-pressed='true']").count() == 1)
    pg.keyboard.press("Escape"); time.sleep(0.2)
    pg.locator("#tray .handcard").nth(1).hover(); time.sleep(0.5); pg.screenshot(path=f"{SHOTS}/v08_hand_hover.png")
    pg.locator("#tray .handcard [data-inspect]").first.click(force=True); time.sleep(0.4)
    check("ⓘ inspects the full card with its GRAFTBOUND adaptation", pg.locator("#modal .inspect-card").count() == 1 and "In GRAFTBOUND" in pg.inner_text("#modal")); pg.click("#modal [data-close]")
    check("Guard and Channel stance buttons are present", pg.locator("[data-stance='guard']").count() == 1 and pg.locator("[data-stance='channel']").count() == 1)
    a0 = pg.evaluate("window.__LC.battle.s.stats.actions"); pg.evaluate("window.__LC.battle.s.p.attacksLeft=1; window.__LC.battle.refresh()")
    pg.keyboard.press("g"); time.sleep(0.6); idle(pg)
    st = pg.evaluate("(()=>{const s=window.__LC.battle.s; const p=s.units.find(u=>u.hero); return [p.statuses.guard||0, s.p.attacksLeft, s.stats.actions];})()")
    check("G guards: Guard status, attack spent, exactly one action", st[0] > 0 and st[1] == 0 and st[2] == a0 + 1, st)
    log_ok = pg.evaluate("!window.__LC.run.ranked || window.__LC.run.ranked.log.some(d=>d.type==='guard')")
    check("stance went through the recorded engine path", log_ok)
    pg.screenshot(path=f"{SHOTS}/v08_hand_stances.png")
    check("no page errors (desktop battle)", not errs, errs[:3])
    # ── end screen: Time Taken + Home ──
    pg.evaluate("window.__LC.run.clock.ms = (3600+24*60+36)*1000; window.__LC.run.clock.byAct=[1800000, 2400000, 876000]; void window.__LC.endRun(false); 0")
    pg.wait_for_selector(".end", timeout=20000); et = pg.inner_text(".end")
    check("defeat screen shows Time Taken 1h 24m 36s with per-act times", "Time Taken" in et and "1h 24m 36s" in et and "Act III" in et, et[:300])
    check("end screen's Title button now reads Home", pg.locator(".end [data-a='title']").inner_text().strip() == "Home")
    pg.screenshot(path=f"{SHOTS}/v08_end_time.png", full_page=True)
    pg.click(".end [data-a='title']"); pg.wait_for_selector("text=Begin Adventure", timeout=20000)
    pg.click("text=Begin Adventure"); pg.wait_for_selector(".intro [data-go]", timeout=20000); pg.click(".intro [data-go]"); pg.wait_for_selector("g.node.avail", timeout=30000)
    pg.evaluate("window.__LC.pauseMenu()"); time.sleep(0.4)
    check("pause menu reads 'Save & Return Home'", "Save & Return Home" in pg.inner_text("#modal") and "Title" not in pg.inner_text("#modal"))
    ms0 = pg.evaluate("window.__LC.run.clock.ms"); time.sleep(1.5); ms1 = pg.evaluate("window.__LC.run.clock.ms")
    check("the clock does not run while the pause menu is open", ms1 - ms0 < 50, [ms0, ms1]); pg.click("#modal [data-close]")
    time.sleep(1.2); check("…and resumes afterwards", pg.evaluate("window.__LC.run.clock.ms") > ms1 + 300)
    # ── magnitude-scaled spell VFX (dev gallery, normal speed) ──
    pg.goto(ORIGIN + "/graftbound/dev/vfx.html?q=balanced&speed=1"); time.sleep(3)
    for mag in (2, 18):
        pg.evaluate(f"window.__setMag({mag}); window.__fire('lightningBolt')"); time.sleep(1.25); pg.screenshot(path=f"{SHOTS}/v08_bolt_mag{mag}.png"); time.sleep(1.5)
    pg.evaluate("window.__setMag(8); window.__fire('pyroclasm')"); time.sleep(1.3); pg.screenshot(path=f"{SHOTS}/v08_pyroclasm.png"); time.sleep(1.5)
    pg.evaluate("window.__setMag(6); window.__fire('fireball')"); time.sleep(1.45); pg.screenshot(path=f"{SHOTS}/v08_fireball_flight.png"); time.sleep(1.5)
    check("dev gallery lists all 17 spells and a magnitude control", pg.evaluate("document.querySelectorAll('#ui .sp').length") == 17)
    # ── mobile hand ──
    pg.close()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True); mp = ctx.new_page(); merrs = []; mp.on("pageerror", lambda e: merrs.append(str(e)))
    mp.goto(URL); mp.wait_for_selector("text=Begin Adventure", timeout=120000); mp.tap("text=Begin Adventure"); mp.wait_for_selector(".intro [data-go]", timeout=20000); mp.tap(".intro [data-go]")
    mp.wait_for_selector("g.node.avail", timeout=30000); mp.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.5); idle(mp)
    mp.evaluate("""(()=>{const b=window.__LC.battle,s=b.s; s.spellbook=['shock','lightning-bolt','flame-slash','pyroclasm','disfigure','healing-salve','feat-of-resistance'].map(x=>({id:'mtg:'+x,level:1})); s.p.mana=3; b.refresh();})()"""); time.sleep(0.5)
    box = mp.locator("#tray").bounding_box(); et_box = mp.locator("#endTurn").bounding_box()
    check("mobile: 7-card hand stays inside the screen and scrolls horizontally; no overlap with End Turn", box['x'] >= 0 and box['x'] + box['width'] <= 391 and box['x'] + box['width'] <= et_box['x'] + 2 and mp.evaluate("document.getElementById('tray').scrollWidth > document.getElementById('tray').clientWidth"), [box, et_box])
    mp.locator("#tray .handcard").nth(1).tap(); time.sleep(0.4)
    check("mobile: tapping a card selects it", mp.evaluate("window.__LC.battle.spell") == 'mtg:lightning-bolt')
    mp.screenshot(path=f"{SHOTS}/v08_mobile_hand.png"); check("no page errors (mobile)", not merrs, merrs[:2]); ctx.close()
    br.close()
f = [r for r in R if not r[1]]; print(f"\n{len(R) - len(f)}/{len(R)} v0.8 e2e checks passed"); sys.exit(1 if f else 0)
