# WAYFARER — Prototype 01

A small pixel-art branching endless runner. HTML + CSS + vanilla JavaScript on a Canvas 2D (320×180, scaled by whole numbers). No dependencies, no build step.

## Run

```
cd wayfarer
python3 -m http.server 8080      # Windows: py -m http.server 8080
```

Open http://localhost:8080. Opening `index.html` directly in a browser also works.

## Play on a phone

Open the hosted page on an Android phone (Chrome). On-screen buttons appear automatically: hold ◄ / ► to steer, tap ▲ to jump, ▼ to slide, and the pause icon at the top. Landscape works best; the first tap on START asks for fullscreen and landscape. To try it from your own machine, run the server above and open `http://<your-computer-ip>:8080` on a phone on the same Wi-Fi.

## 3D build (work in progress)

Same game, same rules, rendered with Three.js as a low-poly 3D scene. Open **http://localhost:8080/3d.html** (same server command as above; `index.html` is still the classic pixel-art 2D version).

- The avatar is the neon egg-bot from the character sheet: glossy black egg head with a visor band and yellow ring eye, magenta/violet torso panels, blue hip bulb, leaf-blade arms, a frond crown and neon sneakers. The main menu shows it doing a looping showcase (idle, wave, spin, dance, run in place) while the camera drifts around it.
- Old Town is drawn in 3D: a warm sunset street with five townhouse types, lamps, trees, benches, planters; road segments are recycled (15 live segments, 12 m each).
- Reused unchanged from the 2D game: `world.js` (track, fork/merge, items), `game.js` (rules, input, touch controls, scoring), the HUD / menu renderer (drawn as a pixel-art overlay).
- New code lives in `src3d/` (`kit.js` shared geometry kit and palette, `env_city.js` biome data, `runner3d.js`, `items3d.js`, `renderer3d.js`, `main3d.js`). Three.js r186 is vendored as one plain script in `vendor/three.min.js` (MIT, no build step).
- A new biome (e.g. forest) is a new `ENV3D.<name>` object with the same shape as `ENV3D.city` (colours, one road segment, props, layout rule).

**Works in 3D:** automatic running, free steering across the three-lane road, jump, slide, coins, all three hazard types, pause, game over, restart, touch controls, route choice at forks (the chosen road bends away, the camera looks down it, and it merges back), window resizing.

**Not yet in 3D:**
- The *second* road of a fork is not drawn, and a branch's own coins/obstacles appear only after the choice is made. True 3D branching needs two road ribbons diverging in the scene, both with their own props, and the prop/item layout evaluated per band.
- Only the Old Town biome exists in 3D (the 2D forest/market biomes are not ported); fork signposts are not modelled.
- Pickup sparkles, dust, "+1" floaters and the biome colour transitions are 2D-only effects and are not shown in 3D.
- Steering is continuous (as in the 2D game) rather than snapping between three discrete lanes; lane markings and item placement are lane-aligned.

## Controls (keyboard)

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
src3d/*         3D front end (see above)
vendor/         three.min.js (Three.js r186)
tools/preview3d.html  dev page that renders one 3D module in isolation
src/biomes.js   palette + biome definitions (city, forest, market)
src/track.js    track pieces, obstacle patterns, collision boxes
src/world.js    road geometry, fork/merge logic, item spawning
src/sprites.js  programmatic pixel-art sprites and skylines
src/font.js     3×5 pixel font
src/render.js   drawing: sky, road, objects, HUD, screens
src/game.js     state, input, loop, collisions, scoring
```

Score = distance in metres + 10 per coin. Best score is kept in `localStorage`.
