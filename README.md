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

## Tech

Plain HTML, CSS and JavaScript.

## Repo

https://github.com/tommyzaffa/Ondus
