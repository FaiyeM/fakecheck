#!/usr/bin/env python3
"""Generate FakeCheck Play Store assets (icon, feature graphic, screenshots) from the app theme."""
import math, os, subprocess

OUT = "/sessions/focused-hopeful-faraday/mnt/outputs/store-assets"
SVG = os.path.join(OUT, "svg")
os.makedirs(SVG, exist_ok=True)

# Theme (mobile/src/theme/colors.ts)
BG="#0E1116"; SURF="#1A1F27"; SURF2="#232A34"; TEXT="#F5F7FA"; MUT="#A6B0BE"
BORDER="#2E3742"; PRIM="#2F6FED"; GREEN="#1FAE6C"; YEL="#E0A416"; RED="#D64545"; LGREEN="#5FB97E"
F='font-family="DejaVu Sans"'

def magnifier(cx, cy, s, lens_fill="#0E1116", lens_op="0.22", stroke="#FFFFFF", check=GREEN):
    r = 120*s
    sw = 26*s
    hx1, hy1 = cx + r*0.707, cy + r*0.707
    hx2, hy2 = cx + (r+95*s)*0.707, cy + (r+95*s)*0.707
    return f'''
  <line x1="{hx1:.0f}" y1="{hy1:.0f}" x2="{hx2:.0f}" y2="{hy2:.0f}" stroke="{stroke}" stroke-width="{46*s:.0f}" stroke-linecap="round"/>
  <circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="{lens_fill}" fill-opacity="{lens_op}" stroke="{stroke}" stroke-width="{sw:.0f}"/>
  <path d="M{cx-52*s:.0f} {cy+4*s:.0f} l{40*s:.0f} {40*s:.0f} l{66*s:.0f} {-86*s:.0f}" fill="none" stroke="{check}" stroke-width="{30*s:.0f}" stroke-linecap="round" stroke-linejoin="round"/>'''

def arc(cx, cy, r, frac):
    a0 = math.radians(-90); a1 = math.radians(-90 + 360*frac)
    x1, y1 = cx+r*math.cos(a0), cy+r*math.sin(a0)
    x2, y2 = cx+r*math.cos(a1), cy+r*math.sin(a1)
    large = 1 if frac > 0.5 else 0
    return f'M{x1:.1f},{y1:.1f} A{r},{r} 0 {large} 1 {x2:.1f},{y2:.1f}'

def ring(cx, cy, r, frac, color, sw=26):
    return f'''<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{BORDER}" stroke-width="{sw}"/>
  <path d="{arc(cx,cy,r,frac)}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>'''

def write(name, w, h, body):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
    p = os.path.join(SVG, name+".svg")
    open(p, "w").write(svg)
    png = os.path.join(OUT, name+".png")
    # Render at high density for crisp text, then force exact target dimensions.
    cmd = ["convert", "-background", "none", "-density", "192", p,
           "-resize", f"{w}x{h}!", "-depth", "8"]
    if name in ("icon-512", "feature-1024x500"):
        cmd += ["-background", BG, "-flatten"]  # store icon/feature: no transparency
    cmd.append(png)
    subprocess.run(cmd, check=True)
    print("wrote", png)

# ---------- App icon 512 ----------
icon = f'''
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="{PRIM}"/><stop offset="1" stop-color="#13317A"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  {magnifier(228, 224, 1.05)}'''
write("icon-512", 512, 512, icon)

# ---------- Feature graphic 1024x500 ----------
feat = f'''
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#141B26"/><stop offset="1" stop-color="{BG}"/></linearGradient></defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="868" cy="232" r="190" fill="{PRIM}" fill-opacity="0.10"/>
  {magnifier(868, 232, 0.92)}
  <text x="80" y="205" {F} font-weight="bold" font-size="82" fill="{TEXT}">FakeCheck</text>
  <text x="84" y="270" {F} font-size="35" fill="{MUT}">Instant AI authenticity checks</text>
  <text x="84" y="352" {F} font-size="26" fill="{LGREEN}">Sneakers · Handbags · Pokémon · Watches</text>'''
write("feature-1024x500", 1024, 500, feat)

# ---------- Screenshot helpers ----------
W, H = 1080, 2160
def base(caption):
    return f'''
  <rect width="{W}" height="{H}" fill="{BG}"/>
  <rect width="{W}" height="210" fill="{PRIM}"/>
  <text x="540" y="130" text-anchor="middle" {F} font-weight="bold" font-size="56" fill="#FFFFFF">{caption}</text>
  <text x="60" y="285" {F} font-size="32" fill="{TEXT}">9:41</text>
  <rect x="965" y="262" width="46" height="26" rx="5" fill="none" stroke="{MUT}" stroke-width="3"/>
  <rect x="970" y="267" width="30" height="16" rx="2" fill="{MUT}"/>
  <text x="945" y="285" text-anchor="end" {F} font-size="30" fill="{MUT}">100%</text>'''

def bracket(x, y, dx, dy, L=70, sw=10):
    return (f'<path d="M{x},{y+dy*L} L{x},{y} L{x+dx*L},{y}" fill="none" stroke="#FFFFFF" '
            f'stroke-width="{sw}" stroke-linecap="round"/>')

# SS1 — camera / home
vf_x, vf_y, vf_w, vf_h = 60, 340, 960, 1470
ss1 = base("See if it&apos;s real in seconds") + f'''
  <rect x="{vf_x}" y="{vf_y}" width="{vf_w}" height="{vf_h}" rx="40" fill="#13171D" stroke="{BORDER}" stroke-width="2"/>
  {bracket(vf_x+90, vf_y+120, 1, 1)}{bracket(vf_x+vf_w-90, vf_y+120, -1, 1)}
  {bracket(vf_x+90, vf_y+vf_h-120, 1, -1)}{bracket(vf_x+vf_w-90, vf_y+vf_h-120, -1, -1)}
  <rect x="320" y="900" width="440" height="330" rx="28" fill="{SURF2}"/>
  <text x="540" y="1085" text-anchor="middle" {F} font-size="34" fill="#7C8794">Your item</text>
  <text x="540" y="1700" text-anchor="middle" {F} font-size="36" fill="{MUT}">Center the item, then tap to scan</text>
  <circle cx="540" cy="1960" r="72" fill="#FFFFFF"/>
  <circle cx="540" cy="1960" r="90" fill="none" stroke="#FFFFFF" stroke-width="6"/>
  <circle cx="250" cy="1960" r="46" fill="{SURF}"/><text x="250" y="1974" text-anchor="middle" {F} font-size="40" fill="{TEXT}">▢</text>
  <circle cx="830" cy="1960" r="46" fill="{SURF}"/>'''
write("screenshot-1-camera", W, H, ss1)

# SS2 — identification result
ss2 = base("Instant identification") + f'''
  <rect x="60" y="340" width="960" height="560" rx="32" fill="{SURF}"/>
  <rect x="110" y="390" width="320" height="460" rx="22" fill="{SURF2}"/>
  <text x="270" y="640" text-anchor="middle" {F} font-size="30" fill="#7C8794">photo</text>
  <text x="470" y="470" {F} font-weight="bold" font-size="46" fill="{TEXT}">Air Jordan 1</text>
  <text x="470" y="535" {F} font-size="36" fill="{MUT}">Retro High OG</text>
  <text x="470" y="600" {F} font-size="32" fill="{MUT}">Nike · Sneaker</text>
  {ring(560, 1180, 150, 0.88, GREEN, 30)}
  <text x="560" y="1170" text-anchor="middle" {F} font-weight="bold" font-size="92" fill="{GREEN}">88</text>
  <text x="560" y="1240" text-anchor="middle" {F} font-size="40" fill="{MUT}">% match</text>
  <text x="540" y="1420" text-anchor="middle" {F} font-size="34" fill="{MUT}">Not what you have? Choose category</text>
  <rect x="120" y="1520" width="840" height="130" rx="28" fill="{PRIM}"/>
  <text x="540" y="1605" text-anchor="middle" {F} font-weight="bold" font-size="46" fill="#FFFFFF">Check if Fake</text>'''
write("screenshot-2-identify", W, H, ss2)

# SS3 — guided steps
def step_dot(x, done):
    c = GREEN if done else BORDER
    return f'<circle cx="{x}" cy="395" r="16" fill="{c}"/>'
ss3 = base("Guided photo checks") + f'''
  <rect x="60" y="388" width="960" height="14" rx="7" fill="{BORDER}"/>
  <rect x="60" y="388" width="480" height="14" rx="7" fill="{GREEN}"/>
  <text x="60" y="500" {F} font-size="34" fill="{MUT}">Step 3 of 6</text>
  <text x="60" y="610" {F} font-weight="bold" font-size="56" fill="{TEXT}">Photograph the</text>
  <text x="60" y="680" {F} font-weight="bold" font-size="56" fill="{TEXT}">stitching detail</text>
  <rect x="60" y="760" width="960" height="720" rx="32" fill="{SURF}"/>
  <rect x="110" y="810" width="860" height="500" rx="22" fill="{SURF2}"/>
  <text x="540" y="1075" text-anchor="middle" {F} font-size="34" fill="#7C8794">Reference example</text>
  <text x="110" y="1400" {F} font-size="34" fill="{MUT}">Tip: even lighting, fill the frame</text>
  <rect x="60" y="1560" width="960" height="180" rx="28" fill="{SURF}"/>
  <text x="120" y="1670" {F} font-size="38" fill="{LGREEN}">Authentic stitching is tight and even</text>
  <rect x="120" y="1860" width="840" height="130" rx="28" fill="{PRIM}"/>
  <text x="540" y="1945" text-anchor="middle" {F} font-weight="bold" font-size="46" fill="#FFFFFF">Capture &amp; continue</text>'''
write("screenshot-3-guided", W, H, ss3)

# SS4 — verdict
def ev(y, mark, color, label):
    return (f'<text x="120" y="{y}" {F} font-weight="bold" font-size="46" fill="{color}">{mark}</text>'
            f'<text x="190" y="{y}" {F} font-size="40" fill="{TEXT}">{label}</text>')
ss4 = base("Clear verdict with evidence") + f'''
  <rect x="60" y="330" width="960" height="300" rx="32" fill="{SURF}" stroke="{LGREEN}" stroke-width="3"/>
  <circle cx="200" cy="480" r="70" fill="{LGREEN}"/>
  <path d="M168 482 l24 24 l40 -52" fill="none" stroke="#0E1116" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="320" y="465" {F} font-weight="bold" font-size="58" fill="{LGREEN}">Likely Authentic</text>
  <text x="320" y="535" {F} font-size="38" fill="{MUT}">Overall confidence 84%</text>
  <text x="60" y="760" {F} font-weight="bold" font-size="44" fill="{TEXT}">Evidence</text>
  {ev(870, "✓", GREEN, "Stitching consistent with genuine")}
  {ev(960, "✓", GREEN, "Logo alignment correct")}
  {ev(1050, "✓", GREEN, "Box label fonts match")}
  {ev(1140, "✗", RED, "Date code spacing unusual")}
  {ev(1230, "?", YEL, "Serial not clearly visible")}
  <rect x="60" y="1320" width="960" height="170" rx="28" fill="{SURF}"/>
  <text x="120" y="1410" {F} font-size="36" fill="{MUT}">What to look for: heel tab alignment,</text>
  <text x="120" y="1455" {F} font-size="36" fill="{MUT}">midsole paint, and stitch density.</text>
  <rect x="120" y="1620" width="840" height="120" rx="28" fill="{PRIM}"/>
  <text x="540" y="1697" text-anchor="middle" {F} font-weight="bold" font-size="44" fill="#FFFFFF">Save to history</text>
  <text x="540" y="1890" text-anchor="middle" {F} font-size="30" fill="#6B7686">AI-assisted opinion, not a guarantee of authenticity.</text>'''
write("screenshot-4-verdict", W, H, ss4)

print("DONE")
