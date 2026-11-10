import asyncio, json, subprocess, sys
import edge_tts, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "en-US-AndrewMultilingualNeural"
async def main():
    items = json.load(open("script.json", encoding="utf8"))
    out = {}
    for it in items:
        mp3 = f"audio/{it['id']}.mp3"; wav = f"audio/{it['id']}.wav"
        for attempt in range(5):
            try:
                await edge_tts.Communicate(it["text"], VOICE, rate="-6%", pitch="-4Hz").save(mp3); break
            except Exception as e:
                print("retry", it["id"], e); await asyncio.sleep(3)
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "2", wav], check=True)
        r = subprocess.run([FF, "-i", wav], capture_output=True, text=True)
        d = [l for l in r.stderr.splitlines() if "Duration" in l][0].split("Duration:")[1].split(",")[0].strip()
        h, m, s = d.split(":"); out[it["id"]] = round(int(h) * 3600 + int(m) * 60 + float(s), 2)
        print(it["id"], out[it["id"]])
    json.dump(out, open("audio/durations.json", "w"), indent=1)
asyncio.run(main())
