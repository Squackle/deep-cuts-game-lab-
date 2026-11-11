"""Dev helper: screenshot a URL in headless Chromium (SwiftShader WebGL). Usage: shot.py URL OUT [W H WAIT]"""
import sys, time
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]; w = int(sys.argv[3]) if len(sys.argv) > 3 else 1280; h = int(sys.argv[4]) if len(sys.argv) > 4 else 800
wait = float(sys.argv[5]) if len(sys.argv) > 5 else 2.5
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1228/chrome-linux64/chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": w, "height": h}); errs = []
    pg.on("console", lambda m: errs.append(m.type + ": " + m.text[:400]) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)[:1500]))
    pg.goto(url); time.sleep(wait); pg.screenshot(path=out)
    try: print('fps', pg.evaluate("window.__bench && window.__bench.fps()"))
    except Exception as e: print(e)
    print("\n".join(errs[:10])); b.close()
