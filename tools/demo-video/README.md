# Demo video generator

Re-creates `media/AegisHeal-Demo.mp4`: a 1080p, ~3-minute cinematic walkthrough with real navigation of the running app, a neural narrator voice (Microsoft *Andrew Multilingual*, not a default system voice), lower-third captions, an animated cursor and an original synthesised soundtrack that ducks under the voice.

## Requirements

```bash
python -m pip install edge-tts imageio-ffmpeg numpy playwright
```

```bash
python -m playwright install chromium
```

## Steps (run inside this folder)

1. Start an isolated AegisHeal instance on port 4400 with fresh demo data (from the repo root):
   ```bash
   npm run build
   ```
   ```bash
   cd server && DATA_DIR=../media/rec-data node src/scripts/seed.js && NODE_ENV=production COOKIE_SECURE=false API_PORT=4400 SERVICE_BASE_PORT=5501 DATA_DIR=../media/rec-data CLIENT_ORIGIN=http://localhost:4400 JWT_SECRET=<48 random hex chars> node src/index.js
   ```
2. Narration (edit `script.json` to change the words):
   ```bash
   python tts.py
   ```
3. Record the browser walkthrough (timed to the narration):
   ```bash
   python record.py
   ```
4. Compose the score and render:
   ```bash
   python music.py
   ```
   ```bash
   python render.py ../../media/AegisHeal-Demo.mp4
   ```

| File | Role |
|---|---|
| `script.json` | narration text per scene |
| `tts.py` | neural TTS → `audio/*.wav` + durations |
| `cards.html` | cinematic intro / title / outro cards |
| `overlay.js` | captions, step chip, cursor and click ripple injected into the app |
| `record.py` | Playwright script that drives the real app scene by scene |
| `music.py` | original score: pads, sub bass, arpeggio, heartbeat, risers |
| `render.py` | ffmpeg mix (voice ducking, limiter) and 1080p H.264 encode |

Generated files (`audio/`, `raw/`, `marks.json`, `music.wav`) and `media/` are not committed.
