# WAYFARER — Prototype 01

A small pixel-art branching endless runner. HTML + CSS + vanilla JavaScript on a Canvas 2D (320×180, scaled by whole numbers). No dependencies, no build step.

## Run

```
cd wayfarer
python3 -m http.server 8080      # Windows: py -m http.server 8080
```

Open http://localhost:8080. Opening `index.html` directly in a browser also works.

## Controls

| Key | Action |
|---|---|
| A / D or ← / → | steer |
| Space or ↑ | jump (crates, low barriers) |
| ↓ | slide (overhead banners and vines) |
| P or Esc | pause / resume |
| Enter, Space or R | start / restart (the on-screen buttons work too) |

At a fork, lean to the road you want (or tap ← / →) before crossing the junction line. The prompt shows the current pick.

## Layout

```
index.html, style.css
src/biomes.js   palette + biome definitions (city, forest, market)
src/track.js    track pieces, obstacle patterns, collision boxes
src/world.js    road geometry, fork/merge logic, item spawning
src/sprites.js  programmatic pixel-art sprites and skylines
src/font.js     3×5 pixel font
src/render.js   drawing: sky, road, objects, HUD, screens
src/game.js     state, input, loop, collisions, scoring
```

Score = distance in metres + 10 per coin. Best score is kept in `localStorage`.
