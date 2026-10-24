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

## 3D build

Same game, same rules, rendered with Three.js as a low-poly 3D scene. Open **http://localhost:8080/3d.html** (same server command as above; `index.html` is still the classic pixel-art 2D version).

**Route:** city start > city running section > visible fork > **LEFT: Greenwood (forest)** / **RIGHT: Market Detour (city)** > both merge into the same city plaza and the track continues (and loops, so the fork comes round again). Both branches are short (130 m).

**How a junction works**
- The track is data (`src/track.js`): a `sequence` of segments (each with a biome, length, curve, obstacle patterns) and a `fork` (diverge zone, branch length, merge zone, biome blend, which segment each side leads to). `src/world.js` turns it into pieces and answers "where are the road(s) at distance z?" for gameplay and rendering alike.
- Road geometry (`src3d/road3d.js`): the road, curbs, sidewalks and verges are two *ribbon* meshes rewritten each frame from that data, so a fork is real geometry: one road splits into two that diverge, run apart, and merge back, with the same width, surface height and curve as gameplay. Where roads touch, each takes its half up to the midline (no overlap, no z-fighting); the inner curbs shrink to nothing at the tip. A prebuilt straight segment mesh cannot do this, which is why the road is streamed (64 sections x 3 m, always reused); scenery and items use bounded pools.
- Choosing: a LEFT / RIGHT prompt appears 76 m before the junction, with two route signposts and the visible fork. Steering is free until then and never picks a road by itself. A left/right input given inside the prompt window is the pick (highlighted in the prompt); with no input the side you are standing on is used. The pick is locked when you cross the junction line (once per junction); in the last 35 m before it the runner is eased onto the picked road, and afterwards the opposite key cannot re-route.
- Camera: a chase camera behind and above the runner that follows the active route's centre, looks 20 m down it, and blends gradually into the fork's biome. Sky, fog and light colours, road palette and scenery all blend between city, forest and market (scenery per road side is chosen per 12 m slot by the blend at that spot).
- Biomes are `src3d/env_city.js`, `env_forest.js`, `env_market.js` (colours, road palette, props, layout rule); the market detour reuses the city's buildings and street props with a different layout and a warmer cobbled road. A new biome is a new `ENV3D.<id>` plus a segment in `track.js`.

**Avatar:** the neon egg-bot from the character sheet (`src3d/runner3d.js`), with an animated main-menu showcase.

**Works in 3D:** all of the above, plus jump, slide, coins, hazards (placed on whichever road they belong to), pause, game over, restart (route, choice and atmosphere reset), touch controls, resizing.

**Limitations**
- The unchosen road stays visible but its coins/obstacles are removed once you choose (existing game rule); the full coin/obstacle gameplay pass is still to do.
- Fork props, sky and colours blend smoothly, but the fork zone is only 44 m long, so the first part of each branch still shows some city.
- Steering is continuous across the road (as in the 2D game), not snapping between three lanes; lane markings and item placement are lane-aligned. The runner may be up to ~10 cm beyond a road edge for one frame while it eases onto the chosen road at the fork's tip.
- Pickup sparkles, dust and floaters are 2D-only effects; only the 2D build has the original forest/market pixel art.
- Tested in headless Chromium with software WebGL; real-device frame rate is not measured.

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
src3d/*         3D front end: kit, road3d, env_city/forest/market, runner3d, items3d, signs3d, renderer3d, main3d
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
