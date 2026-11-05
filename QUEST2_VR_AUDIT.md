# WAYFARER: Meta Quest 2 / WebXR technical audit

Status: **audit only**. Nothing in the game, its gameplay, its art or its assets was changed. This document was written from reading the code at commit `962f619` (`main`, same as `three-d`), on 2026-11-05.
Some numbers below are measured in the repo (file sizes, line counts, object counts already documented in the code). Others are **estimates**: they are marked as such and must be checked on a real Quest 2. No headset was available for this audit.

---

## 1. Current architecture and technology stack

### 1.1 Project structure

| Path | Role |
|---|---|
| `index.html` | **The 3D game** (default page). Loads ~70 plain `<script>` tags in order. Three stacked canvases: `#gl` (WebGL, full window), `#screen` (320x180 pixel-art HUD/menus, scaled), `#touch` (smooth touch buttons). |
| `2d.html` | The classic 2D pixel-art game (same `Game` rules, `Renderer` in `src/render.js`). Must keep working. |
| `3d.html` | A redirect to `./` (kept for old links). |
| `src/` (≈356 KB) | Shared, renderer-agnostic code: `game.js` (state machine, input, main loop), `world.js` / `track.js` / `biomes.js` (procedural track and zones), `perks.js`, `race.js` (race-zone rules, pure), `audio.js` (Web Audio + music), `render.js` (2D renderer, also used to draw the 3D build's HUD), `sprites.js`, `font.js`, touch/ring assets. |
| `src3d/` (≈6.1 MB) | The 3D front end: `renderer3d.js` (`Renderer3D`, 539 lines), `main3d.js` (wires `Game` + `Renderer3D` + `GameAudio`), `kit.js` (geometry kit, units), `road3d.js`, `runner3d.js` / `runner_sprite.js` (avatar), `items3d.js`, `perks3d.js`, `fx3d.js`, `portal3d.js`, `race3d.js` (own scene and camera), `car3d.js`, `train3d.js`, `crowd3d.js`, `env_*.js` (one per zone), `*_art.js` (builders), `*_assets.js` (pictures as WebP data URIs). |
| `vendor/three.min.js` | three.js **r186** (npm `three@0.186.1`) bundled once as an IIFE global `window.THREE` (744 KB). Core only: no `examples/jsm` add-ons. |
| `assets/` (6.6 MB) | Three MP3 music loops. |
| `tools/` | Python/Node asset and music generators (not shipped at runtime). |
| `tests/` | 20 Playwright (`playwright-core`) browser tests `qa3d_*.js` + `race_sim.js` (plain Node). Run against Chromium with SwiftShader (software GL). |
| `docs/` | Renders and screenshots referenced from `README.md` (very detailed per-feature notes). |

### 1.2 Framework, engine, dependencies, build

- **Vanilla JavaScript, no framework, no bundler, no `package.json`, no build step.** Scripts share globals (`Game`, `Renderer3D`, `THREE`, `U3`, `BTN`, `TOUCH`, ...). The page also runs from `file://`.
- **Rendering engine: three.js r186**, `WebGLRenderer` (WebGL 2), `antialias: true`, `powerPreference: 'high-performance'`, no shadow maps, hemisphere + one directional light, linear fog, vertex-coloured sky dome.
- r186's core **already contains the WebXR manager** (`renderer.xr`: session handling, stereo `ArrayCamera`, controllers, foveation, framebuffer scale). That is the main reason no framework change is needed.
- Runtime dependencies: none besides three.js. Test tooling: `playwright-core` (installed outside the repo) and Chromium.

### 1.3 Rendering approach: hybrid

- **3D world** (WebGL): road, props, hazards, coins, avatar, cars, sky. Most props are low-poly meshes merged by `Kit.merge` (few draw calls). A large part of the look comes from **pictures on flat cards** (alpha-tested or transparent planes: trees, crowds, signs, the avatar `RunnerSprite`, the robot car's flanks).
- **2D overlay** (Canvas 2D, 320x180, nearest-neighbour scaled): HUD, title / pause / game-over menus, buttons, banners, cutscene letterbox. Drawn by the 2D `Renderer.drawUI` into `#screen` every frame.
- **Touch layer** (Canvas 2D at device resolution): the on-screen buttons, redrawn only when they change.

### 1.4 Camera, scene, animation, assets

- **One main scene** (`Renderer3D.scene`) with ~8 500 pooled groups (~24 000 objects), of which only one or two hundred are visible at any moment (documented in `renderer3d.js`; the scene's `updateMatrixWorld` is overridden to skip hidden groups).
- **The race zone has its own scene and its own `PerspectiveCamera`** (`Race3D`, fov 62, far 700), drawn on the same `WebGLRenderer`.
- **Camera**: `PerspectiveCamera(62, 16/9, 0.1, 400)`. Every frame `Renderer3D.draw` computes a **chase camera** (behind and above the runner: about 4.2 m up and 7.5 m back) blended with a menu orbit, a cutscene camera (Gare du Midi) and screen shake. It then calls `camera.position.copy(cam); camera.lookAt(look)`. The FOV changes with the screen's aspect and the dash perk. The sky dome and the sun disc are re-centred on the camera every frame.
- **World motion**: the runner stays near the origin and the world scrolls toward it (`rz = p.z * U3.Z`). Scale: `U3.Z = 0.1`, so run speed is 220 to 340 units/s = **22 to 34 m/s (80 to 120 km/h)**. Race cars: 34 to 49 m/s.
- **Animation**: procedural, in code (avatar run cycle, sprite frames, items spinning, beat-synchronised pulses from `music_beats*.js`). No skeletal animation or glTF.
- **Assets**: all pictures are embedded as **WebP data URIs inside JS files** (largest: `zagla_assets.js` 692 KB, `race_assets.js` 669 KB, `avatar_assets.js` 591 KB, `tree_assets.js` 572 KB, `utrecht_assets.js` 518 KB). They are decoded into `THREE.Texture`s at load. Some textures are drawn at runtime on canvases (`CanvasTexture`: sun glow, water, neon boards).

### 1.5 Main loop

- `Game` constructor runs its own loop with **`window.requestAnimationFrame`**. It skips frames on screens over 100 Hz (60 fps cap, `?fps=`) and simulates in fixed slices of at most 1/60 s (`advance`). Then it calls `draw()`, which calls `Renderer3D.draw(g)` → `renderer.render(scene, camera)` plus the HUD redraw.
- `Renderer3D.adapt()` changes `setPixelRatio` between 0.7 and 2.25 based on frame time.

### 1.6 Input, UI, navigation

- **Keyboard**: `keydown/keyup` → `onKey` → `this.keys.left/right/up/down` (arrows, WASD / ZQSD, Space), `P`/`Esc` pause, `C` character.
- **Pointer / touch**: `pointerdown/move/up` on the canvas, mapped to the 320x180 canvas space (`this.mouse`). Then hit-tested against `TOUCH` zones (left, right, slide, jump, pause, scooter) and `BTN` buttons (PLAY, RESUME, RUN AGAIN, CHARACTER, sound). In the race, a lane queue (`laneQ`) is used.
- `Game.hold(id, ...)` / `syncTouch()` turn held zones into the same `keys` flags. **Every input path ends in a small set of flags and button actions.** That is the natural place to plug in VR controllers.
- **Navigation**: title → play ↔ pause → over → play. Plus the cutscene state (`scene`, no input) and the race (`race`). Fullscreen is requested on a touch start.

### 1.7 Audio

- `GameAudio` (Web Audio): effects, music loops with a beat clock, the synthesised engine and cutscene sounds. It starts on any user gesture. Nothing is positional (no `PannerNode`).

### 1.8 Performance work already in place

- The hidden-group walk is skipped in `updateMatrixWorld` (about 20x faster scene walk on phones).
- A 60 fps cap on fast screens.
- Adaptive resolution (start 1.5, ceiling `PR_CEIL = 2.25`).
- The touch layer is redrawn only on change, at most 2x density.
- Geometry is merged per prop. No shadow maps. `tests/qa3d_perf.js` guards some of this.

### 1.9 Hosting and deployment

- Static site. `main` auto-deploys to **GitHub Pages** (`https://backtochou-prog.github.io/wayfarer/`) and **Vercel** (`https://wayfarer-chi-teal.vercel.app`). The `three-d` branch mirrors `main`.
- No `vercel.json`, no custom headers, no service worker, no manifest.
- **Both hosts serve HTTPS**, which WebXR requires (a secure context).

---

## 2. WebXR compatibility assessment

| Area | Verdict | Why |
|---|---|---|
| Engine | ✅ **Ready** | three.js r186 has `renderer.xr` built in (immersive-vr sessions, stereo rendering, head pose, controllers, foveation, framebuffer scale). No framework change is justified. |
| Hosting | ✅ **Ready** | HTTPS on both hosts. A top-level page has `xr-spatial-tracking` allowed by default. No build step, so nothing to change in the pipeline. |
| Main loop | ❌ **Blocking** | During an immersive session, `window.requestAnimationFrame` stops firing on Quest Browser. Frames must come from `XRSession.requestAnimationFrame`, which three exposes through `renderer.setAnimationLoop(fn)`. The `Game` loop must be able to be driven by it. |
| Camera | ❌ **Must adapt** | In XR three replaces the camera's pose with the headset pose every frame, so `camera.position.copy() / lookAt()` stops working (and must not be fought: moving or rotating the view against the head causes sickness). The chase pose must be applied to a **rig** (a `Group` holding the camera), with yaw only. The race scene's own camera needs the same. |
| Projection / FOV | ⚠️ **Adapt** | In XR the FOV and projection come from the headset. The aspect-based FOV and the dash's FOV widening do nothing there. Screen shake and the cutscene camera moves must be replaced by comfort-safe versions. |
| HUD / menus | ❌ **Must adapt** | The DOM canvases (`#screen`, `#touch`) are **not visible inside an immersive session**. The HUD must become a textured plane in the 3D scene. It can **reuse `Renderer.drawUI` unchanged**: draw into the 320x180 canvas, upload it as a `CanvasTexture`. |
| Input | ⚠️ **Adapt (easy)** | No gamepad or XR input today. The Touch controllers are read through `XRInputSource.gamepad` (xr-standard mapping: thumbstick, trigger, squeeze, A/B/X/Y). They can be mapped onto the existing `keys` flags and button actions, and the rules stay untouched. Menus need a controller ray hitting the HUD plane, converted to the 320x180 coordinates that `overButton` already uses. |
| Adaptive resolution | ⚠️ **Replace in XR** | `setPixelRatio` does not size the XR framebuffer. In XR use `renderer.xr.setFramebufferScaleFactor()` (before the session starts) and `renderer.xr.setFoveation()`. `adapt()` must be turned off during a session. |
| Sky / sun | ✅ Reusable | They are re-centred on the camera. In XR, re-centre them on the rig (or on the XR camera's world position). The 300 m dome and 400 m far plane work in stereo. |
| Picture cards (sprites) | ⚠️ **Visual caveat, no change proposed** | Flat cards read as flat in stereo, especially when close (the avatar, crowds, trees near the road). Distant cards look fine. **The art is not to be touched.** This is noted only so that the camera distance is chosen where they look best. |
| Audio | ✅ Reusable | Web Audio works in Quest Browser. Entering VR is a user gesture, so music can start. Positional audio is optional, later. |
| 2D game (`2d.html`) | ✅ Unaffected | It does not load three.js. VR code must stay out of `src/render.js` and `2d.html`. |
| Desktop / mobile 3D | ✅ Preservable | All VR code can be gated behind `navigator.xr.isSessionSupported('immersive-vr')` and an "Enter VR" button. With no session running, the current path (current camera, `requestAnimationFrame`, DOM HUD) runs exactly as today. |

**Overall: compatible, with moderate adaptation.** No rewrite. The rules (`Game`, `World`, `Race`, `Perks`), the scene content, the assets and the audio are reused as they are. The work is concentrated in four places: the loop driver, the camera rig, the HUD-in-3D, and the controller input mapping.

---

## 3. Recommended VR implementation architecture

Principle: **one new opt-in module, minimal hooks in existing files, zero changes to rules and art.**

```
index.html
 ├─ vendor/three.min.js          (unchanged: r186 core already includes WebXRManager)
 ├─ src/* , src3d/*              (unchanged except small, guarded hooks listed below)
 └─ src3d/xr3d.js   NEW          XR controller: session, rig, HUD panel, controllers, input mapping, comfort
```

### 3.1 `XR3D` module (new, `src3d/xr3d.js`)

1. **Entry**: feature-detect `navigator.xr` and `isSessionSupported('immersive-vr')`. Only then show an **"ENTER VR" button** (a small DOM button, or a `BTN` on the title screen). Request the session with `optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']` (hand tracking optional, later), then `renderer.xr.setSession(session)`. Use reference space `local-floor`.
2. **Loop driver**: on `sessionstart`, stop the window loop and run `renderer.setAnimationLoop(t => { game.advance(dt); game.draw(dt); })` with the same dt clamp and 1/60 s slices. The Quest runs at 72, 80 or 90 Hz, so no 60 fps cap in XR. On `sessionend`, set `setAnimationLoop(null)` and resume the window loop.
   *Hook needed in `Game`*: let the loop be paused/resumed from outside (e.g. `game.loopOwner = 'xr'` makes the existing rAF callback return early). This is about 3 lines and does not change behaviour outside XR.
3. **Camera rig**: `rig = new THREE.Group()`, with the existing `camera` as its child, added to the scene. In XR, `Renderer3D.draw` writes the chase pose to the **rig** (position and **yaw only**: no pitch, no roll, no `lookAt` tilt) instead of the camera. The headset adds head rotation and translation on top. Outside XR nothing changes: the rig stays at the origin and the camera is driven exactly as today.
   *Hook needed in `Renderer3D.draw`*: at the end, `if (this.xr && this.xr.active) this.xr.applyChase(this.cam, this.look) else { camera.position.copy(...); camera.lookAt(...) }`. The race scene gets the same branch (`Race3D.draw`): the rig is re-parented into whichever scene is being drawn.
4. **VR camera framing (comfort)**:
   - Default: a **third-person "rail" view**. The rig sits behind and slightly above the runner (start at about 1.6 m above the road, 4 to 5 m behind, then tune on device). It follows the lane changes with smoothing and turns only on curves, with heavily damped yaw.
   - Optional "first-person" mode later (much stronger vection at 22 to 34 m/s, not recommended as the default).
   - **Comfort**: no screen shake in XR (replace it with a controller haptic pulse). A **dynamic vignette** while speed is high or the view turns. Cutscene and zone-portal camera moves are replaced by a **fade to black, then cut** (the game already has fades). The FOV-widening dash is replaced by a short vignette or particle effect. The horizon stays level.
5. **HUD panel**: one `Mesh(PlaneGeometry)` with a `CanvasTexture` whose source is the existing 320x180 `uiCanvas`, after `Renderer.drawUI` ran. Set `needsUpdate = true` each frame (320x180 is tiny to upload). Two placements:
   - **Menus** (title, pause, over): a large panel about 2 m ahead in world space, readable, aimed at with the controller ray.
   - **In-run HUD** (score, coins, banners): a smaller panel attached to the rig, low in the field of view (not head-locked, which is uncomfortable), or split into a few world-space labels later.
   - The touch buttons (`#touch`) are **hidden in XR** (controllers replace them).
6. **Controllers**: `renderer.xr.getController(0/1)` (target ray) and `getControllerGrip(0/1)`. Draw a **simple procedural ray and pointer** (thin line and dot). No downloaded controller models (see 4.2). Each frame, read `inputSource.gamepad` for both hands.
7. **Input mapping** (writes only the flags and actions `Game` already understands):

   | Quest Touch | Game action (existing) |
   |---|---|
   | Left or right thumbstick left/right (with dead zone and hysteresis) | `keys.left` / `keys.right` (steer; in the race, one lane step per flick → `laneQ`) |
   | Thumbstick up, or **A** / **X** | jump (`keys.up`) |
   | Thumbstick down, or **B** / **Y** | slide (`keys.down`) |
   | **Trigger** (index) while the ray is on the HUD | click: ray ∩ panel → UV → 320x180 coordinates → existing `overButton` / `activeButton` logic |
   | Trigger during play | jump (alternative, configurable) |
   | Squeeze (grip) | get on / off the scooter (`mount`), only where it is valid today |
   | **Menu** button (left) | pause / resume (as `P`) |

   Optional later: a "lean" mode (head or hand lateral offset steers), behind a setting.
8. **Rendering settings in XR**:
   - Before the session: `renderer.xr.setFramebufferScaleFactor(0.8–1.0)` (start at 0.9 and measure) and `renderer.xr.setFoveation(1)` (fixed foveated rendering).
   - Keep `antialias: true` (Quest Browser gives an MSAA framebuffer).
   - `adapt()` is disabled during the session.
   - Check whether multiview (`OVR_multiview2`) is usable with this three.js version on Quest Browser. If it is, it halves the CPU draw-call cost of stereo. To verify on device.
9. **Haptics**: `inputSource.gamepad.hapticActuators[0].pulse()` on a hit, a coin streak, a bump in the race, and where the desktop build shakes the screen.

### 3.2 What is reused unchanged

`Game` rules and state machine, `World` / `track` / `biomes`, `Perks`, `Race` (pure rules), `Portal` logic, every `env_*`, every `*_art` / `*_assets` file (all art), `Kit`, `road3d`, `items3d`, `fx3d`, `runner3d` / `runner_sprite`, `car3d`, `race3d` scene content, `renderer3d` scene building and atmosphere blending, `GameAudio`, the 2D `Renderer.drawUI` (as the HUD texture source), `2d.html`.

### 3.3 What must be adapted or added

| Item | Type | Size |
|---|---|---|
| `src3d/xr3d.js` (session, rig, HUD panel, controllers, input, comfort, haptics) | New | Medium (estimate: 400 to 600 lines) |
| `Game`: let an external owner drive the loop | Small hook | A few lines |
| `Renderer3D.draw`: write the chase pose to the rig in XR; keep sky and sun on the rig; skip `adapt()`, shake and the FOV dash in XR; hide the DOM layers | Small hooks | About 15 to 30 lines |
| `Race3D.draw`: same rig branch | Small hook | About 10 lines |
| `index.html`: one `<script>` tag and an Enter VR button | Small | A few lines |
| Cutscene and portal camera in XR → fade and cut | Adapt | Small to medium |

---

## 4. Required dependencies and tools

### 4.1 Runtime

- **None new is required.** three.js r186 core already has `WebXRManager`.
- The "Enter VR" button is easiest written by hand (about 30 lines, styled like the game). Alternatively, `VRButton.js` from `three/examples/jsm/webxr/` (same r186 version) can be vendored as a small global script, matching how `three.min.js` is vendored.

### 4.2 Deliberately avoided

- `XRControllerModelFactory`: it needs `GLTFLoader` plus a **network fetch** of controller models from the `@webxr-input-profiles` CDN at runtime. That is an extra dependency, a network dependency and new art. A procedural ray and pointer is enough.
- A-Frame, React Three Fiber, Babylon.js or any engine change: no compelling reason, and each would mean a rewrite.
- A bundler / npm build: not needed. The project's no-build design is kept.

### 4.3 Development and testing tools

- **Meta Quest Browser** on the Quest 2 (the target).
- **Immersive Web Emulator** (Meta's browser extension for desktop Chrome/Edge): emulates a Quest headset and Touch controllers for fast iteration without the headset.
- **Remote DevTools**: Quest in developer mode, USB, `adb`, then `chrome://inspect` on desktop to see the console, profile and inspect the Quest Browser tab. `adb reverse tcp:8000 tcp:8000` lets the Quest open a local server as `http://localhost:8000`, which counts as a secure context.
- **OVR Metrics Tool** (Meta): on-headset overlay of frame rate, GPU/CPU level, stale frames, foveation level, memory.
- The existing Playwright setup, extended with a mocked `navigator.xr` (or the WebXR test API polyfill) for logic tests of the XR module. Real rendering performance can only be judged on the device.

---

## 5. Estimated implementation complexity

The time estimates are rough, for one developer familiar with this code base, and include on-device tuning.

| Work item | Complexity | Estimate |
|---|---|---|
| Session entry, loop driver, rig, stereo rendering of the main scene (no HUD, controllers only for steering) | Low to medium | 1 to 2 days |
| Controller input mapping (play, race, pause, scooter) and haptics | Low | 1 day |
| HUD and menus as a 3D panel, with ray picking reusing `overButton` | Medium | 1.5 to 2.5 days |
| Race zone in XR (its own scene and camera) | Low to medium | 0.5 to 1 day |
| Comfort: framing, damping, vignette, fades for cutscene and portals, no shake | Medium (mostly tuning on the headset) | 2 to 3 days |
| Performance pass on Quest 2 (framebuffer scale, foveation, multiview check, culling distance, texture memory) | Medium to high (depends on measurements) | 2 to 4 days |
| Tests (mocked XR), README, regression of desktop, mobile and 2D | Low to medium | 1 to 1.5 days |
| **Total** | **Moderate** | **about 9 to 15 working days** |

Main risk: **frame rate on Quest 2** (section 6), not the WebXR plumbing.

---

## 6. Potential performance limitations on Quest 2

Quest 2: Snapdragon XR2 (Adreno 650), 6 GB RAM shared with the OS. Display 1832x1920 per eye. Refresh rate 72 Hz by default (90 Hz optional): a **13.9 ms** (or 11.1 ms) frame budget, **for both eyes**. A missed frame shows as judder and reprojection, which is much worse in a headset than on a phone.

| Risk | Why it matters here | Mitigation (no art change) |
|---|---|---|
| **Pixel cost** | Two views at about 1440x1584 each (default recommended resolution) is roughly 4.5 Mpx a frame, more than a phone at pixel ratio 1.5. | `setFramebufferScaleFactor` (0.8 to 0.9), fixed foveation level 1 to 2, keep the fragment work cheap (Lambert/Basic materials are already cheap). |
| **Overdraw from transparent and alpha-tested cards** | Trees, crowds, signs, glows, the canopy glass, additive sun glow, portal effects. A tile-based mobile GPU pays heavily for blended layers, and `alphaTest` (discard) disables early-Z optimisations. | Pull the fog / draw distance in a little in XR, cap simultaneous particle effects, prefer `alphaTest` over blending where the material already allows it (a material setting, not an art change). Measure first. |
| **Draw calls and CPU** | Without multiview, every visible object is drawn twice. The CPU side (JS, scene walk, sprite updates) is shared with the browser on a phone-class CPU. | Keep `cullHidden` on. Use multiview if available. Keep the 1/60 s rule slices (they add CPU only at 90 Hz; consider 72 Hz). Avoid per-frame allocations (check with the remote profiler). |
| **Texture memory** | About 6 MB of WebP (base64 in JS) decodes to uncompressed RGBA textures in GPU memory: likely **hundreds of MB** (estimate: to be measured). There are no compressed GPU formats (KTX2/ASTC). Quest Browser tabs have a stricter memory limit than desktop and can be killed. | Measure with remote DevTools and OVR Metrics. Later options: load zone textures lazily, dispose the textures of zones that are far away, or convert to KTX2/Basis (a format conversion, not a redraw: it would need explicit approval since it touches the asset pipeline). |
| **Download and parse** | About 6 MB of JS assets plus 6.6 MB of music, all parsed at start-up on the Quest's CPU. | Acceptable for a first version. Later: defer the assets of zones that are not visited yet. |
| **Canvas texture uploads** | The HUD (320x180) is cheap. The animated `CanvasTexture`s (water, glows) re-upload each frame. | Keep their size small; reduce their update rate in XR if needed. |
| **Comfort-related cost** | A vignette is one more full-screen pass if done as post-processing. | Draw the vignette as a mesh in front of the camera, not as a post-processing pass. Avoid any `EffectComposer` post-processing in XR. |
| **Simulation at 22 to 34 m/s** | Not a GPU cost, but a comfort limit: fast forward motion plus turning can cause motion sickness. | Third-person rail view, damped yaw, vignette, and an optional speed-reduced "comfort" mode **only if the user approves a gameplay option** (it would change gameplay, so it is not part of this plan by default). |

Expected outcome (**estimate**): the street zones should reach 72 fps with a framebuffer scale near 0.9 and foveation. Dense zones (neon quarter, coastal town with crowds, race zone with large glowing pictures) are the most likely to need a lower scale or a shorter draw distance in XR.

---

## 7. Phased implementation plan

Each phase ends with something testable on the headset, and with the desktop, mobile and 2D versions verified unchanged.

**Phase 0: baseline (no code change to the game)**
- Open the current site in Quest Browser in its 2D window and record frame rate and memory with OVR Metrics and remote DevTools, as a reference.
- Set up the Immersive Web Emulator and the `adb reverse` workflow.

**Phase 1: "it renders in VR"**
- `xr3d.js` with feature detection and an Enter VR button (hidden when unsupported). Session start/end. The loop is driven by `setAnimationLoop` in XR.
- Camera rig and chase pose applied to the rig (yaw only). Sky and sun on the rig. Shake, FOV dash and `adapt()` off in XR. DOM layers hidden in XR.
- Thumbstick steering, jump and slide mapped to `keys`.
- Exit: playable run in stereo with head tracking. Desktop, mobile and 2D unchanged (full test battery green).

**Phase 2: menus and HUD**
- HUD panel from `uiCanvas`. Menu panel in world space. Controller rays and trigger click through the existing `overButton` / `activeButton`.
- Pause on the Menu button and when the session goes hidden (`visibilitychange` on the XR session: Oculus button, headset removed).
- Exit: a full loop title → play → pause → over → again, entirely with the controllers.

**Phase 3: all game states**
- Race zone (its own scene, rig branch, lane flicks).
- Scooter mount and dismount on grip.
- Gare du Midi cutscene and zone portals with a fade-and-cut camera in XR.
- Haptics.

**Phase 4: comfort and tuning on the device**
- Rig height and distance, yaw damping, vignette, horizon. Compare a few framings on the headset.
- An optional comfort settings panel (vignette strength, snap or smooth turn of the rig on curves). No gameplay change unless approved.

**Phase 5: performance**
- Framebuffer scale and foveation tuning per zone. Multiview check.
- Draw distance and fog in XR. Profiling of the CPU frame with remote DevTools.
- Texture memory measurement, and a proposal (for approval) if it is too high.

**Phase 6: release**
- README section, automated tests for the XR module, final regression on desktop, mobile and `2d.html`, deploy (section 8).

---

## 8. Recommended testing and deployment strategy

### Testing

1. **Regression first**: the existing 20 browser tests plus `race_sim.js` must stay green after every phase. They run without WebXR, so they prove that the non-XR path is untouched. Add a test that `2d.html` does not load `xr3d.js`.
2. **XR logic tests (automated)**: in Playwright, inject a mocked `navigator.xr` / `XRSession` (or the WebXR test API polyfill). Check that:
   - the button appears only when VR is supported;
   - the loop switches to `setAnimationLoop` and back;
   - the gamepad axes and buttons produce the right `keys` and button actions;
   - a ray at given panel UVs maps to the right 320x180 coordinates and buttons;
   - shake and `adapt()` are off in XR.
3. **Emulator (manual, desktop)**: Immersive Web Emulator for every phase: enter/exit, controller mapping, menus, race, cutscene.
4. **On the Quest 2 (manual, required)**:
   - every phase with OVR Metrics on (target: steady 72 fps, no stale frames);
   - each zone at least once (city, forest, market, neon, coast/town, tram, Gare du Midi cutscene, Utrecht, Vic, race);
   - a 10-minute session for heat and memory;
   - entering and leaving VR several times;
   - taking the headset off and pressing the Oculus button mid-run (the game must pause).
   - A short comfort checklist (sickness, readability of the HUD, reachability of controls), ideally with more than one person.
5. **Desktop and mobile check**: the current phones (including the Redmi that was slow before) and desktop browsers, to confirm no regression and no Enter VR button where it does not apply.

### Deployment

- Keep the current static hosting: **no change needed** (HTTPS already, no headers required, no build step).
- Develop on a branch (e.g. `vr-quest`). Use **Vercel preview deployments** of that branch for headset testing over HTTPS, so `main` stays the live, unchanged game until VR is approved.
- Ship VR as **opt-in on the same `index.html`**: the Enter VR button appears only in browsers that support `immersive-vr`. Desktop and mobile behave exactly as before. A `?vr=0` URL switch to hide the button is useful for support.
- After approval, merge into `main` and push `main` and `main:three-d` as usual (both deploy automatically).
- Optional later: a web app manifest so the game can be pinned in the Quest library as a web app (a separate decision).

---

## Summary

- **Feasible without a rewrite and without changing the framework.** three.js r186 already ships the WebXR support needed.
- **Reused as is**: all gameplay rules, the world, the zones, every asset and art file, the audio, and the 2D HUD drawing code.
- **New or adapted**: an XR-driven loop, a camera rig (yaw only), the HUD as a 3D panel, Quest Touch input mapped onto the existing flags, comfort measures, and XR-specific resolution settings.
- **Main risk**: holding 72 fps on Quest 2 in the densest zones (overdraw from transparent cards, texture memory). Measure in Phase 0 and Phase 5 before choosing any further change, and ask for approval before touching assets.
- **Estimated effort**: about 9 to 15 working days over 6 phases. Each phase is testable on the headset and keeps the desktop, mobile and 2D versions unchanged.
