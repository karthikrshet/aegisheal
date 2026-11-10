"""Original cinematic score, synthesised from scratch (no samples, no copyright).
A-minor progression with warm pads, sub bass, a building arpeggio and a soft heartbeat pulse."""
import json, sys, wave
import numpy as np

SR = 48000
marks = json.load(open("marks.json"))["marks"]
TOTAL = marks["end"] + 1.0
n = int(TOTAL * SR)
t = np.arange(n) / SR
mix = np.zeros((n, 2))

def note(m):  # midi -> Hz
    return 440.0 * 2 ** ((m - 69) / 12)

# Am – F – C – G (and an uplifting Am – F – C – E near the resolution)
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
CHORD = 6.4  # seconds per chord (≈ 75 bpm, 2 bars)

def env(length, attack, release):
    e = np.ones(length)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a) ** 2
    e[-r:] *= np.linspace(1, 0, r) ** 2
    return e

def add(sig, start, gain_l=1.0, gain_r=1.0):
    s = int(start * SR); e = min(n, s + len(sig))
    if e <= s: return
    gl = gain_l[: e - s] if np.ndim(gain_l) else gain_l
    gr = gain_r[: e - s] if np.ndim(gain_r) else gain_r
    mix[s:e, 0] += sig[: e - s] * gl
    mix[s:e, 1] += sig[: e - s] * gr

# section intensity: quiet intro → title swell → app (steady) → recovery (build) → outro (resolve)
def intensity(x):
    pts = [(0, .35), (marks["title"], .8), (marks["login"], .5), (marks["chaos"], .62), (marks["recover"], .9),
           (marks["incident"], .7), (marks["supervised"], .65), (marks["outro"] - 2, .8), (marks["outro"], 1.0), (TOTAL, .9)]
    xs, ys = zip(*pts)
    return np.interp(x, xs, ys)

k = 0
pos = 0.0
while pos < TOTAL:
    chord = PROG[k % 4]
    if pos >= marks["outro"] - 0.5:
        chord = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]][k % 4]
    L = int((CHORD + 1.6) * SR)
    tt = np.arange(L) / SR
    lvl = intensity(pos)
    # warm pad: detuned sines with a few soft harmonics, slow stereo chorus
    pad = np.zeros(L)
    for m in chord + [chord[0] + 12]:
        f = note(m)
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            pad += np.sin(2 * np.pi * ff * tt) + 0.25 * np.sin(4 * np.pi * ff * tt) + 0.08 * np.sin(6 * np.pi * ff * tt)
    pad *= env(L, 1.8, 1.8) * 0.018 * (0.6 + 0.6 * lvl)
    wob = 0.5 + 0.12 * np.sin(2 * np.pi * 0.15 * tt)
    add(pad, pos, wob, 1 - wob + 0.5)
    # sub bass
    bass = np.sin(2 * np.pi * note(chord[0] - 24) * tt) * env(L, 0.6, 1.4) * 0.10 * lvl
    add(bass, pos)
    # arpeggio (eighth notes), enters after the title
    if pos >= marks["login"] - 1:
        step = 60 / 75 / 2
        seq = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24, chord[2] + 12, chord[1] + 12, chord[0] + 24, chord[2] + 12]
        for i in range(int(CHORD / step)):
            ts = pos + i * step
            if ts >= TOTAL: break
            dl = int(0.7 * SR); x = np.arange(dl) / SR
            f = note(seq[i % len(seq)])
            pluck = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 6) * 0.045 * intensity(ts)
            pan = 0.5 + 0.35 * np.sin(i)
            add(pluck, ts, 1 - pan + 0.3, pan + 0.3)
    pos += CHORD
    k += 1

# heartbeat pulse during the action (chaos → supervised)
beat = 60 / 75
b = marks["chaos"]
while b < marks["learn"]:
    for off, g in ((0, 1.0), (0.22, 0.6)):
        dl = int(0.35 * SR); x = np.arange(dl) / SR
        freq = 55 + 50 * np.exp(-x * 25)
        kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-x * 9) * 0.22 * g * intensity(b)
        add(kick, b + off)
    b += beat * 2

# cinematic riser + hit into the title and into the outro
for hit in (marks["title"], marks["outro"]):
    dl = int(3.0 * SR); x = np.arange(dl) / SR
    noise = np.random.default_rng(7).standard_normal(dl)
    riser = noise * (x / 3.0) ** 3 * 0.05
    riser = np.convolve(riser, np.ones(40) / 40, mode="same")
    add(riser, hit - 3.0)
    dl = int(4 * SR); x = np.arange(dl) / SR
    boom = np.sin(2 * np.pi * (40 + 30 * np.exp(-x * 6)) * x) * np.exp(-x * 1.4) * 0.35
    add(boom, hit)

# simple stereo delay "space"
for d, g in ((0.29, 0.28), (0.53, 0.18), (0.83, 0.1)):
    s = int(d * SR)
    mix[s:, 0] += mix[:-s, 1] * g
    mix[s:, 1] += mix[:-s, 0] * g

# master fade + normalise
fade = int(4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.85
pcm = (mix * 32767).astype(np.int16)
with wave.open("music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("music.wav", round(TOTAL, 1), "s")
