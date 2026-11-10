"""Mix narration + score (with voice ducking) and render a 1080p H.264 MP4."""
import json, subprocess, pathlib, sys
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
m = json.load(open("marks.json"))
marks, raw = m["marks"], m["raw"]
end = marks["end"]
out = sys.argv[1]
ids = ["intro", "title", "login", "dashboard", "chaos", "recover", "incident", "supervised", "learn", "outro"]
lead = {"intro": 0.6, "title": 0.9, "outro": 0.8}   # let the visuals breathe before the voice

cmd = [FF, "-y", "-loglevel", "error", "-i", raw, "-i", "music.wav"]
for i in ids: cmd += ["-i", f"audio/{i}.wav"]
fc = []
for k, i in enumerate(ids):
    ms = int((marks[i] + lead.get(i, 0.35)) * 1000)
    fc.append(f"[{k+2}:a]adelay={ms}|{ms},volume=1.6[v{k}]")
fc.append("".join(f"[v{k}]" for k in range(len(ids))) + f"amix=inputs={len(ids)}:normalize=0,apad,atrim=0:{end},asplit=2[vo][vokey]")
fc.append("[1:a]volume=0.55,atrim=0:" + str(end) + "[mus]")
fc.append("[mus][vokey]sidechaincompress=threshold=0.03:ratio=8:attack=40:release=600[duck]")
fc.append(f"[duck][vo]amix=inputs=2:normalize=0,alimiter=limit=0.95,afade=t=out:st={end-3}:d=3[aout]")
fc.append(f"[0:v]fps=30,scale=1920:1080:flags=lanczos,unsharp=5:5:0.6,eq=contrast=1.03:saturation=1.06,"
          f"fade=t=in:st=0:d=1.2,fade=t=out:st={end-1.8}:d=1.8[vout]")
cmd += ["-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]", "-t", str(end),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", out]
subprocess.run(cmd, check=True)
print("rendered", out)
