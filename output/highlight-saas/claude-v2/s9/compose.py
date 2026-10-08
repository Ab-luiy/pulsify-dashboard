"""Slide 9 build.
  python compose.py preview                 -> s9-preview.mp4 (graphic + stand-in photo, silent)
  python compose.py final webcam.mp4        -> s9-final.mp4 (graphic + the founder's webcam clip and its audio)
Frames come from capture.mjs (node capture.mjs). beats.json holds the scene start/end seconds; retime it to the real
take, rerun capture.mjs, then run final.
"""
import os, subprocess, sys
import imageio_ffmpeg
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FF = imageio_ffmpeg.get_ffmpeg_exe()
X, Y, W, H, R = 60, 1010, 960, 700, 44

mode = sys.argv[1]
frames = os.path.join(HERE, 'frames', '%04d.jpg')
base = [FF, '-y', '-framerate', '30', '-i', frames]

if mode == 'preview':
    out = os.path.join(HERE, 's9-preview.mp4')
    subprocess.run(base + ['-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', out], check=True)
else:
    cam = sys.argv[2]
    mask = Image.new('L', (W * 2, H * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W * 2 - 1, H * 2 - 1), R * 2, fill=255)
    mp = os.path.join(HERE, 'mask.png')
    mask.resize((W, H), Image.LANCZOS).save(mp)
    out = os.path.join(HERE, 's9-final.mp4')
    fc = (f'[1:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=yuva420p[c];'
          f'[2:v]format=gray[m];[c][m]alphamerge[ca];[0:v][ca]overlay={X}:{Y}:shortest=1[v]')
    subprocess.run([FF, '-y', '-framerate', '30', '-i', frames, '-i', cam, '-loop', '1', '-i', mp,
                    '-filter_complex', fc, '-map', '[v]', '-map', '1:a?', '-c:v', 'libx264', '-crf', '17',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', out], check=True)
print('wrote', out)
