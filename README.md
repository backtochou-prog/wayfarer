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

**Route:** city start > city running section > visible fork > **LEFT: Greenwood (forest)** / **RIGHT: Market Detour (city)** > both merge into the same city plaza and the track continues (and loops, so the fork comes round again). Both branches are short (130 m) and are fully their own biome within 15 m of the junction.

**How a junction works**
- The track is data (`src/track.js`): a `sequence` of segments (each with a biome, length, curve, obstacle patterns) and a `fork` (diverge zone, branch length, merge zone, biome blend, which segment each side leads to). `src/world.js` turns it into pieces and answers "where are the road(s) at distance z?" for gameplay and rendering alike.
- Road geometry (`src3d/road3d.js`): the road, curbs, sidewalks and verges are two *ribbon* meshes rewritten each frame from that data, so a fork is real geometry: one road splits into two that diverge, run apart, and merge back, with the same width, surface height and curve as gameplay. Where roads touch, each takes its half up to the midline (no overlap, no z-fighting); the inner curbs shrink to nothing at the tip. A prebuilt straight segment mesh cannot do this, which is why the road is streamed (64 sections x 3 m, always reused); scenery and items use bounded pools.
- Choosing: a LEFT / RIGHT prompt appears 76 m before the junction, with two route signposts and the visible fork. Steering is free until then and never picks a road by itself. A left/right input given inside the prompt window is the pick (highlighted in the prompt); with no input the side you are standing on is used. The pick is locked when you cross the junction line (once per junction); in the last 35 m before it the runner is eased onto the picked road, and afterwards the opposite key cannot re-route.
- Camera: a chase camera behind and above the runner that follows the active route's centre, looks 20 m down it, and blends gradually into the fork's biome. Sky, fog and light colours, road palette and scenery all blend between city, forest and market (scenery per road side is chosen per 12 m slot by the blend at that spot).
- Biomes are `src3d/env_city.js`, `env_forest.js`, `env_market.js` (colours, road palette, props, layout rule); the market detour reuses the city's buildings and street props with a different layout and a warmer cobbled road. A new biome is a new `ENV3D.<id>` plus a segment in `track.js`.

**Avatar:** the strawberry-man from the character painting (`src3d/runner3d.js`): glossy red strawberry body with a few yellow seeds on the cheeks, a beige jacket with a hollow pink outline star on the back, wrapping its back and sides (open on the red in front), dark glasses across the face (V lower edge, temple arms ending behind the ears, bare strawberry back of the head), green calyx leaves, pink lips, black side panels, long navy legs, black-and-pink sneakers, smooth-shaded with a glossy Phong material and a soft contact shadow, with an animated main-menu showcase. Its feet stay on the road through the run cycle (ankle joint), it turns to face along curves, and its slide pose fits under the gate.

**Gameplay loop (shared rules in `src/game.js`, drawn in 3D)**
- *Controls:* steer left/right (arrows or A/D, continuous across the three marked lanes), Space/Up jump (0.55 s, ~3 m apex, 0.12 s landing buffer), Down slide (0.55 s; tapping again mid-slide does not chain it; Down in the air fast-falls; a jump cancels a slide). Forward movement is automatic. Auto-repeat key events are ignored; jump/slide always return to running.
- *Coins:* pooled gold coins that spin and bob, in lines, groups, zig-zags and left/right lane trails, plus a coin trail on each branch of a fork. Pickup box: ~0.7 m sideways, ~0.9 m in depth, and the runner's body height must overlap the coin height (high coins need a jump). The counter updates the frame you pass through; each coin counts once; a collected coin swells and rises for 0.4 s.
- *Hazards (what you see is what you hit — meshes are built from the collision table `OBST`):* crate (1.2 m, jump), low striped barrier (2.8 m wide, jump), overhead gate (banner 1.05 m above the road, slide; you can only get round it at the very edge of the road). Spacing is >= 19.5 m, the first hazard is ~69 m in, and the last 66 m before every junction is hazard-free (that stretch is where the picked road gently guides the runner).
- *Game over:* any collision ends the run: debris burst, screen shake, red flash, the avatar tips over. Distance, speed, coins, spawning and track updates all stop and the chosen route is kept; the panel shows distance, coins, score and best. Restart (button, Space, Enter, R) gives a clean run.
- *Difficulty:* speed starts at 22 m/s and rises 0.16 m/s per second to a 34 m/s cap; distance is the integral of speed and is unaffected by forks or recycling.

**Works in 3D:** all of the above, plus pause, touch controls, resizing, both branches with hazards and coins active.

**Tested** (headless Chromium, software WebGL, simulation stepped frame by frame; suites live outside the repo): 3D gameplay 35 checks, 3D routes/geometry 34, 3D phone touch 9, 2D regression 50; plus extra probes: frame-rate independence (clearing windows match from 20 to 144 fps, no tunnelling at 34 m/s), input state-machine fuzz (6 simulated minutes, 17 restarts), a brute-force survivability search over every distinct hazard pair of the looping track on both branches at 22 and 34 m/s (all 37 pairs clearable), and a 12-minute bot run through 62 junctions with constant memory.

**Limitations**
- Real-device frame rate and touch feel are not measured. Per-frame JavaScript allocation in the 3D draw path is about 12 KB (down from 57 KB), mostly small temporaries.
- Steering is continuous across the road (as in the 2D game), not snapping between three lanes. Collision uses the hit boxes above; the avatar's hair and outstretched arms are drawn slightly taller/wider than its 1.8 m hit box, so a close shave is forgiving, never a phantom hit.
- The road you did not take stays visible with its coins and hazards (it cannot be touched: you are confined to your road and the two are metres apart). Pickup sparkles and dust are 2D-only; the 3D build has its own coin pop and crash debris.

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
