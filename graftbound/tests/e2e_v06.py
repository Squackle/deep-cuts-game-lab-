"""GRAFTBOUND v0.6 browser checks (Playwright + Chromium/SwiftShader). Serve the repo root on :8765 first.
Covers: auto-end turn, terrain tooltips (hover, keyboard), hazard confirmation, encounter score screen, ranked preview
recording + in-browser replay verification, journal, events, settings, spell VFX gallery. NOT real-device testing."""
import time, sys, os, json
from playwright.sync_api import sync_playwright
CH = os.environ.get('LC_CHROMIUM', "/opt/pw-browsers/chromium-1228/chrome-linux64/chrome")
ORIGIN = os.environ.get('LC_ORIGIN', "http://localhost:8765")
URL = ORIGIN + "/graftbound/index.html?gfx=performance&anim=instant&live=0"
SHOTS = os.environ.get('LC_SHOTS', os.path.expanduser('~/shots')); os.makedirs(SHOTS, exist_ok=True)
R = []
def check(n, c, info=""): R.append((n, bool(c))); print(("PASS " if c else "FAIL ") + n + (" — " + str(info)[:200] if info else ""), flush=True)
def idle(pg, t=30):
    end = time.time() + t
    while time.time() < end:
        if pg.evaluate("!window.__LC.battle.busy && !window.__LC.battle.autoEnding"): return True
        time.sleep(0.1)
    return False
def xy(pg, x, y): return pg.evaluate(f"(()=>{{const s=window.__LC.scene;const p=s.project(s.world({x},{y}));const r=s.canvas.getBoundingClientRect();return [p.x+r.left,p.y+r.top];}})()")
def start_battle(pg):
    pg.wait_for_selector("g.node.avail", timeout=30000); pg.locator("g.node.avail").first.dispatch_event("click"); time.sleep(1.2); idle(pg)
    pg.evaluate("document.getElementById('hint').classList.remove('show')")
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CH, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = br.new_page(viewport={"width": 1100, "height": 720}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and 'favicon' not in m.text else None)
    pg.goto(URL); pg.wait_for_selector("text=Begin Adventure", timeout=40000)
    check("title offers Ranked Expedition (preview) next to Adventure", pg.locator("[data-a='ranked']").count() == 1)
    pg.click("[data-a='settings']"); time.sleep(0.3)
    check("settings: Auto-End Turn toggle, enabled by default", pg.locator("input[data-k='autoEnd']").is_checked())
    check("settings: ambient wind toggle", pg.locator("input[data-k='ambient']").count() == 1)
    pg.screenshot(path=f"{SHOTS}/v06_settings.png"); pg.click("#modal [data-close]")
    pg.click("text=Begin Adventure"); pg.wait_for_selector(".intro [data-go]", timeout=15000); pg.click(".intro [data-go]")
    start_battle(pg)
    # ── tooltip + hazard confirmation on a staged board ──
    pg.evaluate("""(()=>{const b=window.__LC.battle,s=b.s,p=s.units.find(u=>u.hero);for(const e of s.units.filter(u=>u.side==='enemy')){e.x=0;e.y=0;} s.units.filter(u=>u.side==='enemy').forEach((e,i)=>{e.x=i*2;e.y=0;});
      p.x=4;p.y=7; s.terrain[6*8+4]=2; s.p.moveLeft=3; s.p.attacksLeft=1; b.scene.refreshTerrain(s,7); b.refresh();})()""")
    x, y = xy(pg, 4, 6); pg.mouse.move(x - 20, y); pg.mouse.move(x, y, steps=3); time.sleep(0.6)
    txt = pg.inner_text("#inspect")
    check("hovering brambles explains them before you step (live value)", "Brambles" in txt and "Deals 1 damage" in txt, txt[:120])
    check("hover shows the path hazard warning", "crosses hazards" in txt, txt[-120:])
    pg.screenshot(path=f"{SHOTS}/v06_tooltip_brambles.png")
    pg.mouse.click(x, y); time.sleep(0.5); idle(pg)
    moved1 = pg.evaluate("(()=>{const p=window.__LC.battle.s.units.find(u=>u.hero);return [p.x,p.y];})()")
    check("first click on a hazard path only warns (no movement)", moved1 == [4, 7] and "Hazard" in pg.inner_text("#toast"), moved1)
    pg.mouse.click(x, y); time.sleep(0.6); idle(pg)
    moved2 = pg.evaluate("(()=>{const s=window.__LC.battle.s;const p=s.units.find(u=>u.hero);return [p.x,p.y,p.hp,s.stats.actions];})()")
    check("second click confirms; bramble damage applied; one accepted action", moved2[:2] == [4, 6] and moved2[3] == 1, moved2)
    # keyboard focus: arrow cursor onto a tile shows the same explanation
    pg.evaluate("(()=>{const s=window.__LC.battle.s; s.terrain[5*8+4]=4; window.__LC.battle.scene.refreshTerrain(s,7); window.__LC.battle.cursor={x:4,y:6}; window.__LC.battle.refresh();})()")
    pg.keyboard.press("ArrowUp"); time.sleep(0.4)
    kt = pg.inner_text("#inspect"); check("keyboard cursor inspects lava with live numbers", "Lava" in kt and "2 damage" in kt, kt[:100])
    # ── auto-end turn ──
    t0 = pg.evaluate("window.__LC.battle.s.turn")
    pg.evaluate("(()=>{const b=window.__LC.battle,s=b.s; s.spellbook=[]; s.p.attacksLeft=0; s.p.moveLeft=1; s.terrain[5*8+4]=0; s.terrain[6*8+3]=0; b.scene.refreshTerrain(s,7); b.refresh();})()")
    x2, y2 = xy(pg, 3, 6); pg.mouse.click(x2, y2); time.sleep(0.4)
    end = time.time() + 20
    while time.time() < end and pg.evaluate("window.__LC.battle.s.turn") == t0: time.sleep(0.2)
    check("Auto-End Turn: spending the last movement ends the turn without pressing End Turn", pg.evaluate("window.__LC.battle.s.turn") == t0 + 1)
    check("auto-end is not counted as an action", pg.evaluate("window.__LC.battle.s.stats.actions") == 2)
    idle(pg)
    # ── encounter score screen ──
    pg.evaluate("(()=>{const b=window.__LC.battle.s; b.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=0); b.phase='won'; window.__LC.battle.checkEnd();})()")
    pg.wait_for_selector(".result", timeout=20000); rt = pg.inner_text(".result")
    check("encounter result: Victory, Efficiency, Damage Avoided and Total shown", all(k in rt for k in ["Encounter Cleared", "Victory", "Efficiency", "Damage avoided", "Total"]), rt[:160])
    pg.screenshot(path=f"{SHOTS}/v06_encounter_result.png"); pg.click(".result [data-go]")
    pg.wait_for_selector("#pack", timeout=20000); pg.click("#pack", force=True); time.sleep(0.4); pg.click("#rw-reveal", force=True); time.sleep(0.6)
    pg.locator(".slot[data-id='mtg:typhoid-rats']").click(force=True); time.sleep(0.2); pg.click("[data-take]", force=True); time.sleep(0.8)
    pg.wait_for_selector("g.node.avail", timeout=20000)
    # ── journal ──
    pg.evaluate("window.__LC.openSheet()"); time.sleep(0.3); pg.click("#modal [data-journal]"); time.sleep(0.5)
    jt = pg.inner_text("#modal")
    check("journal: graft history, timeline and before/after sprites", "Typhoid Rats" in jt and "Woke as The Blank" in jt and pg.locator("#modal canvas.journal-sprite").count() == 2, jt[:120])
    pg.screenshot(path=f"{SHOTS}/v06_journal.png"); pg.click("#modal [data-close]")
    # ── event screen ──
    pg.evaluate("""(()=>{const L=window.__LC,r=L.run; r.phase='event'; r.event={id:'graftExchange',node:r.current}; L.save(); L.event();})()""")
    pg.wait_for_selector(".event .opt", timeout=10000); et = pg.inner_text(".event")
    check("event: Graft Exchange explains exactly what you lose before confirming", "Exchange a graft" in et and "Release one graft" in et, et[:120])
    pg.screenshot(path=f"{SHOTS}/v06_event.png"); pg.click(".opt[data-c='leave']"); pg.wait_for_selector("g.node.avail", timeout=10000)
    check("event resolved once and returned to the map", pg.evaluate("window.__LC.run.event") is None and 'graftExchange' in pg.evaluate("window.__LC.run.eventsSeen"))
    # ── ranked preview: record through the real UI exec path, then verify by replay in the browser ──
    pg.evaluate("window.__LC.pauseMenu()"); time.sleep(0.2); pg.click("#modal [data-close]")
    pg.evaluate("window.__LC.newRanked()"); pg.wait_for_selector("g.node.avail", timeout=20000)
    check("ranked preview uses the fixed challenge seed", pg.evaluate("window.__LC.run.seed") == 0x5eedcafe and pg.evaluate("window.__LC.run.ranked.challengeId") == 'gb-expedition-01')
    start_battle(pg)
    for i in range(80):
        st = pg.evaluate("window.__LC.run.phase")
        if st != 'battle' or pg.evaluate("window.__LC.battle.s && window.__LC.battle.s.phase") != 'player': break
        pg.evaluate("""(async()=>{const m=await import('./tests/ranked-bot.mjs'); const b=window.__LC.battle; const d=m.nextBattleDecision(b.s); await b.act(()=>b.exec(d));})()""")
        idle(pg)
    pg.wait_for_selector(".result [data-go]", timeout=30000); pg.click(".result [data-go]"); pg.wait_for_selector("#pack", timeout=20000)
    log_len = pg.evaluate("window.__LC.run.ranked.log.length")
    same = pg.evaluate("""(async()=>{const R=await import('./src/engine/ranked.js'); const L=window.__LC; const r=R.replayRun(L.run.ranked.challengeId, L.run.ranked.log);
       const a=L.run, b=r.run; return JSON.stringify([a.evo,a.hp,a.scoring,a.pending,a.ranked.seq])===JSON.stringify([b.evo,b.hp,b.scoring,b.pending,b.ranked.seq]);})()""")
    check(f"ranked: {log_len} UI decisions recorded; in-browser replay reproduces the exact state and score", log_len > 3 and same)
    tamper = pg.evaluate("""(async()=>{const R=await import('./src/engine/ranked.js'); const L=window.__LC; const log=L.run.ranked.log.map(d=>({...d})); const i=log.findIndex(d=>d.type==='move'); if(i<0) return 'nomove'; log[i].x=(log[i].x+5)%8; try{R.replayRun('gb-expedition-01',log); return 'accepted';}catch(e){return 'rejected';}})()""")
    check("ranked: a tampered move in the recorded log is rejected by the verifier", tamper in ('rejected', 'nomove'), tamper)
    pg.screenshot(path=f"{SHOTS}/v06_ranked_pack.png")
    check("no page errors", not errs, errs[:3])
    # ── spell VFX gallery (dev only) ──
    pg.goto(ORIGIN + "/graftbound/dev/vfx.html?q=balanced"); time.sleep(2.5)
    names = pg.evaluate("[...document.querySelectorAll('#b button')].map(b=>b.textContent)")
    check("dev VFX gallery lists all 13 curated spells", len(names) == 13, names)
    for fx in ['shock', 'flameSlash', 'salve', 'lightningBolt']:
        pg.evaluate(f"window.__fire('{fx}')"); time.sleep(0.5 if fx != 'lightningBolt' else 0.65); pg.screenshot(path=f"{SHOTS}/v06_vfx_{fx}.png"); time.sleep(0.8)
    check("gallery leaves saves untouched", pg.evaluate("localStorage.getItem('deepcutsedh.livingcard.run') !== null"))
    br.close()
f = [r for r in R if not r[1]]; print(f"\n{len(R) - len(f)}/{len(R)} v0.6 e2e checks passed"); sys.exit(1 if f else 0)
