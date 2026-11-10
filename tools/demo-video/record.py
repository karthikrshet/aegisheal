"""Record the AegisHeal demo: real navigation of the running app, timed to the narration."""
import json, time, pathlib, threading, urllib.request, http.cookiejar
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).parent
APP = "http://localhost:4400"
API = "http://localhost:4400/api"
DUR = json.load(open(HERE / "audio" / "durations.json"))
CARDS = (HERE / "cards.html").as_uri()
W, H = 1600, 900
marks = {}

# ── tiny API client (operator) used to inject the supervised-mode fault off-screen ──
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def api(path, body=None, method="POST"):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={"Content-Type": "application/json"} if data else {})
    return json.loads(opener.open(req, timeout=10).read() or b"null")

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--force-device-scale-factor=1"])
    ctx = browser.new_context(viewport={"width": W, "height": H}, record_video_dir=str(HERE / "raw"), record_video_size={"width": W, "height": H})
    ctx.add_init_script(path=str(HERE / "overlay.js"))
    page = ctx.new_page()
    T0 = time.monotonic()

    def now(): return time.monotonic() - T0
    def scene(sid):
        marks[sid] = round(now(), 2); print(f"{sid} @ {marks[sid]}s")
    def hold(sid, pad=0.8):
        end = marks[sid] + DUR[sid] + pad
        while now() < end: page.wait_for_timeout(100)
    def cap(kicker, text, step=None):
        page.evaluate("([k,t,s]) => window.__caption && window.__caption(k,t,s)", [kicker, text, step])
    def move(x, y, steps=35):
        page.mouse.move(x, y, steps=steps); page.wait_for_timeout(120)
    def click(loc, pause=350):
        loc.scroll_into_view_if_needed(); b = loc.bounding_box()
        move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2); page.wait_for_timeout(pause)
        page.mouse.down(); page.wait_for_timeout(70); page.mouse.up(); page.wait_for_timeout(250)
    def scroll_to(y, wait=1400):
        page.evaluate(f"window.scrollTo({{top:{y},behavior:'smooth'}})"); page.wait_for_timeout(wait)
    def nav(label):
        click(page.locator("aside nav a", has_text=label).first); page.wait_for_timeout(900)

    # 1. Intro card
    page.goto(CARDS + "?scene=intro"); scene("intro"); hold("intro", 0.6)
    # 2. Title card
    page.goto(CARDS + "?scene=title"); scene("title"); hold("title", 1.2)

    # 3. Login
    page.goto(APP + "/login"); page.wait_for_selector("text=Welcome back"); scene("login")
    cap("Secure access", "Role-based sign in for admins, operators and viewers")
    click(page.get_by_label("E-mail")); page.keyboard.type("admin@aegisheal.local", delay=55)
    click(page.get_by_label("Password")); page.keyboard.type("Admin@12345", delay=70)
    click(page.get_by_role("button", name="Sign in")); page.wait_for_selector("text=All systems operational", timeout=15000)
    hold("login", 0.3)

    # 4. Dashboard tour
    scene("dashboard"); cap("Control center", "Live health of every service, streamed every 2 seconds", "STEP 1 · MONITOR")
    page.wait_for_timeout(2500); move(700, 330); page.wait_for_timeout(1500)
    scroll_to(330, 2600); cap("Agentic pipeline", "Monitor → Detect → Collect → Analyse → Decide → Recover → Verify")
    move(1000, 330); page.wait_for_timeout(2600)
    scroll_to(720, 3000); move(500, 520); page.wait_for_timeout(2500)
    scroll_to(1150, 3000); page.wait_for_timeout(1500); scroll_to(0, 1500)
    hold("dashboard", 0.2)

    # 5. Chaos lab + guided demo
    scene("chaos"); cap("Chaos lab", "Real processes. Real faults.", "FAULT INJECTION")
    nav("Chaos lab"); page.wait_for_selector("text=Run guided demo")
    for name in ["Crash process", "Memory leak", "Bad deployment"]:
        b = page.locator(".fault-btn", has_text=name).first.bounding_box(); move(b["x"] + 60, b["y"] + 25, 25); page.wait_for_timeout(900)
    click(page.get_by_role("button", name="Run guided demo")); page.wait_for_selector("text=Run the guided demo?")
    cap("Guided demo", "Crash · Memory leak · Faulty release — all at once", "FAULT INJECTION")
    while now() < marks["chaos"] + DUR["chaos"] - 1.2: page.wait_for_timeout(100)
    click(page.get_by_role("button", name="Start demo"))

    # 6. Watch the recovery on the dashboard
    scene("recover"); nav("Dashboard"); cap("Autonomous recovery", "Detect → diagnose → fix → verify, with no human", "STEPS 2–7 · AGENT")
    scroll_to(330, 1500); page.wait_for_timeout(5500)
    scroll_to(560, 2500); page.wait_for_timeout(3500)
    scroll_to(1150, 2500); cap("Three problems, three fixes", "Restart · Clear cache · Roll back — each verified healthy")
    hold("recover", 0.4)

    # 7. Incident detail (faulty deployment)
    scene("incident"); nav("Incidents"); page.wait_for_selector("text=Error spike", timeout=20000)
    cap("Explainable AI", "Every diagnosis comes with evidence and confidence", "STEP 4 · ANALYSE")
    click(page.locator("tr", has_text="Error spike").first); page.wait_for_selector("text=Self-healing pipeline")
    page.wait_for_timeout(2500); scroll_to(560, 2500); page.wait_for_timeout(3500)
    cap("Verified recovery", "Rolled back to the last known good version · 3/3 healthy checks", "STEP 7 · VERIFY")
    scroll_to(1150, 2500); page.wait_for_timeout(3000); scroll_to(1700, 2500)
    hold("incident", 0.2)

    # 8. Supervised mode with human approval
    scene("supervised"); scroll_to(0, 300); nav("Agent control"); page.wait_for_selector("text=Autonomy mode")
    cap("Human in the loop", "Supervised mode: the agent proposes, a human approves", "STEP 5 · DECIDE")
    click(page.get_by_role("radio", name="Supervised")); page.wait_for_timeout(1500)
    api("/auth/login", {"email": "operator@aegisheal.local", "password": "Operator@123"})
    api("/services/payment-service/chaos/job-failure")
    page.wait_for_selector("text=Proposed:", timeout=40000); page.wait_for_timeout(800)
    click(page.locator("a", has_text="INC-").first); page.wait_for_selector("text=Approve & run")
    page.wait_for_timeout(1500); cap("Guardrails", "Whitelisted actions · confidence · cooldowns · circuit breakers")
    click(page.get_by_role("button", name="Approve & run"))
    page.wait_for_selector("text=Resolved in", timeout=30000); page.wait_for_timeout(1500)
    hold("supervised", 0.6)

    # 9. Learning: playbooks + reports
    scene("learn"); nav("Playbooks"); page.wait_for_selector("text=Recovery playbooks")
    cap("It learns", "Every outcome re-ranks the recovery playbooks")
    page.wait_for_timeout(1500); scroll_to(400, 2500); page.wait_for_timeout(1000)
    nav("Reports"); page.wait_for_selector("text=Incident trend"); cap("Measured impact", "MTTR · success rate · downtime avoided")
    page.wait_for_timeout(2000); scroll_to(500, 2500)
    hold("learn", 0.4)

    # 10. Outro card
    page.goto(CARDS + "?scene=outro"); scene("outro"); hold("outro", 3.5)
    marks["end"] = round(now(), 2)

    video = page.video
    ctx.close(); browser.close()
    raw = video.path()

# restore autonomous mode for normal use
try:
    jar.clear(); api("/auth/login", {"email": "admin@aegisheal.local", "password": "Admin@12345"})
    api("/agent/mode", {"mode": "autonomous"}, "PUT")
except Exception as e:
    print("could not restore mode:", e)

json.dump({"raw": str(raw), "marks": marks}, open(HERE / "marks.json", "w"), indent=1)
print("raw video:", raw, marks)
