# Ondus Tattoo

Website for **Ondus Tattoo**, a tattoo and piercing studio in Vezia (Lugano).

## Run locally

This is a static website — no build step needed.

```bash
# from this folder
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` in your browser.

## Structure

- `index.html` — home
- `css/` — styles · `js/` — scripts · `img/` — tattoo and piercing gallery
- `video/` — process video (section `#processo`)

## Process video

The video ships in two encodings: AV1 for modern browsers and H.264 as the
fallback (Safari without AV1 hardware). To replace it, re-encode from the
original file and regenerate the poster:

```bash
ffmpeg -i input.mp4 -c:v libsvtav1 -preset 3 -crf 45 -pix_fmt yuv420p10le -g 150 -c:a aac -b:a 64k -movflags +faststart video/processo-av1.mp4
ffmpeg -i input.mp4 -c:v libx264 -preset veryslow -crf 29 -profile:v high -level:v 3.1 -pix_fmt yuv420p -c:a aac -b:a 64k -movflags +faststart video/processo.mp4
ffmpeg -ss 14 -i input.mp4 -frames:v 1 -q:v 5 img/processo-poster.jpg
```

If the resolution changes, update `width`/`height` on the `<video>` tag and the
`codecs` strings on its `<source>` tags.

## Gallery videos

Each video in the portfolio grid (`.pf-item--video`, two rows tall) needs four
files plus a poster, all named after it (e.g. `fucile`):

- `video/NAME-loop-av1.mp4` + `video/NAME-loop.mp4` — silent loop shown in the
  grid. Cut out black frames and the logo outro so the tile reads as a moving
  photo, and start it on the frame used as the poster.
- `video/NAME-av1.mp4` + `video/NAME.mp4` — the full clip with sound, opened in
  the lightbox (`data-video="video/NAME"`). Same commands as the process video.
- `img/NAME-poster.jpg` — the first frame of the loop.

```bash
# loop: list the clean segments as trim=START:END, the first one is the poster frame
F="[0:v]trim=5.4:7.85,setpts=PTS-STARTPTS[a];[0:v]trim=0:1.95,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]"
ffmpeg -i input.mp4 -filter_complex "$F" -map "[v]" -an -c:v libsvtav1 -preset 3 -crf 45 -pix_fmt yuv420p10le -g 150 -movflags +faststart video/NAME-loop-av1.mp4
ffmpeg -i input.mp4 -filter_complex "$F" -map "[v]" -an -c:v libx264 -preset veryslow -crf 29 -profile:v high -level:v 3.1 -pix_fmt yuv420p -movflags +faststart video/NAME-loop.mp4
ffmpeg -i video/NAME-loop.mp4 -frames:v 1 -q:v 5 img/NAME-poster.jpg
```

Then copy an existing `pf-item--video` block in `index.html`. Place video tiles
far apart in the grid; tiles without `data-extra` stay visible on mobile.

## Tech

Plain HTML, CSS and JavaScript.

## Repo

https://github.com/tommyzaffa/Ondus
