# WAYFARER: Meta Quest 2 WebXR architecture and implementation plan

Status: **plan only, awaiting approval.** No source code, art, asset, dependency, branch or commit was changed to write it.
Based on `QUEST2_VR_AUDIT.md` and a direct re-reading of the code at `ccc0273`: `src/game.js`, `src/render.js`, `src3d/renderer3d.js`, `src3d/race3d.js`, `src3d/main3d.js`, `index.html`.
Nothing in this plan has been run on a Quest 2. Every behaviour of the Quest Browser stated here is an assumption to verify. These are listed in section 10.

---

## 0. Corrections and additions to the audit

Re-reading the code showed these points. The audit was wrong or incomplete on each, and the plan below uses the corrected version.

| # | Audit said | What the code actually does | Consequence for the plan |
|---|---|---|---|
| C1 | Menu clicks can "reuse `overButton` / `activeButton`". | Those two are reusable, but the **click logic itself is inside an anonymous `pointerup` listener** in the `Game` constructor (`game.js` ~l.67-75): the sound toggle, CHARACTER, then the active button (resume / start, plus fullscreen on touch). It cannot be called from outside. | Add a small **`Game.pressAt(x, y)`** method containing that logic. `pointerup` calls it, so behaviour stays identical, and the VR ray calls it too. One refactor in `game.js`, no rule change. |
| C2 | "Re-parent the rig into whichever scene is drawn." | `Race3D` has its **own `THREE.Scene` and its own camera** (`race3d.js` l.15). It moves that camera itself every frame (lerp, `lookAt`, and a **speed-dependent FOV** of 62 to 76 degrees). three's WebXR manager computes the eye poses from `camera.parent`. | **Two rigs, one per scene, each permanently owning its scene's camera.** No re-parenting at runtime, so no ownership conflict. See section 6.1. |
| C3 | Simulation is "fixed-step". | `Game.advance` splits each frame's dt (clamped to 0.05 s) into `n = ceil(dt·60)` **equal sub-steps of at most 1/60 s**. At 72/80/90 Hz that is one sub-step of 13.9/12.5/11.1 ms. It is capped sub-stepping, not a fixed step. | Keep `advance()` exactly as it is. It already works at any refresh rate. The XR loop only has to feed it the same clamped dt. |
| C4 | Not mentioned. | `Renderer3D.adapt()` calls `resize()` → `renderer.setSize()`, which three refuses while an XR session is presenting. The window `resize` listener does the same. | `adapt()` and `resize()` must return early while XR is presenting. |
| C5 | Not mentioned. | Window **`blur` sets `state = 'pause'`** (`game.js` l.43). Entering an immersive session may blur the page in Quest Browser (unverified). | Phase 1 must check this on the device. If it happens, `XR3D` resumes play once the session starts. The `blur` handler itself is not changed. |
| C6 | "HUD panel = the 320x180 canvas." | The canvas holding the HUD is `#screen` itself (`main3d.js` passes it to `Renderer3D` as `uiCanvas`). `drawUI` also paints **full-screen effects into it**: the game-over flash, the portal wash and streaks (`drawPortalFx`), the cutscene letterbox and fades (`drawSceneOverlay`). On a floating panel these would tint a rectangle, not the view. | In XR those effects are routed to a **head-locked fade/vignette** driven by the same values (`g.flash`, `g.portal.k/flash`, `g.scene.fade`, `g.fadeIn`). `Renderer.drawUI` gets one guarded flag to skip painting them into the panel (section 6.3). The touch buttons are already on `#touch`, not in `#screen`, so they never reach the panel. |
| C7 | Not mentioned. | The menus print **keyboard or touch hints** ("OR PRESS ENTER", "HOLD < > STEER", "P ESC", the scooter "TAP"/"E" label), chosen by `g.touch`. | In XR these hints would be wrong. **Open question Q3** (section 10): adding VR hint text is a UI change and needs approval. The default proposal: in XR `g.touch` stays false and the keyboard hints are hidden by the same flag, so no new text is added. |
| C8 | "Trigger during play = jump" **and** "trigger = menu click". | That is fine in itself, because the two never apply in the same state. But it collided with the squeeze/scooter idea in the audit's table. | Final mapping in section 5. Each physical input has exactly one meaning per game state. |
| C9 | "Sky and sun re-centred on the camera." | They are placed with `camera.position` (`renderer3d.js` l.528-531). In XR that is the head's **local** pose inside the rig, not a world position. | In XR use the rig's world position (`XR3D.eyeWorld()`). A 3-line branch. |
| C10 | `pickHint` "uses the camera"? | No: `pickHint` works in road coordinates, and the 2D label is placed by `drawUI`. | Nothing to change. The scooter label appears on the panel. |
| C11 | "Game input → `keys`." | There are **two parallel channels**: `keys.left/right` (keyboard) and `tleft/tright`, which come from `held` via `hold()` / `syncTouch()` (touch). `step()` reads both (l.377). The race reads only **`laneQ`** (l.361). `endRace`, `beginScene` and `blur` clear `keys` / `releaseTouch()`. | VR uses the **touch channel** (`hold()` with its own pointer ids) plus `laneQ`, exactly like a finger. Section 5 explains why. |

---

## 1. Final proposed architecture

```
                    ┌───────────────────────────── existing, unchanged rules ──────────────────────────────┐
 keyboard ─┐        │ Game (src/game.js): state machine, advance()/update(), hold()/syncTouch(), keys,    │
 touch    ─┼──────► │ laneQ, jump(), slideKey(), mount()/dismount(), pressAt() [NEW, extracted]          │
 XRInput  ─┘        └───────────────┬───────────────────────────────────────────────────────────────────┘
 (new)                              │ draw()
                                    ▼
                    Renderer3D (src3d/renderer3d.js) ── computes the chase pose (this.cam / this.look)
                       │   ├─ desktop/mobile: camera.position / lookAt  (as today)
                       │   └─ XR: XR3D.applyChase(rigMain, cam, look)   (yaw + position only)
                       ├─ Race3D (src3d/race3d.js) ── computes its chase pose
                       │   ├─ desktop/mobile: as today
                       │   └─ XR: XR3D.applyChase(rigRace, ...)
                       └─ ui.drawUI(g) → #screen canvas ──► XRHud CanvasTexture panel (XR only)

 XR3D (src3d/xr3d.js, new) ─ owns: session, loop ownership, the two rigs, comfort layer, XR render settings
   ├─ XRInput (src3d/xr_input.js, new) ─ controllers, rays, gamepad mapping → Game actions, haptics
   └─ XRHud   (src3d/xr_hud.js, new)   ─ menu/HUD panels, ray ↔ panel UV ↔ 320x180 → Game.pressAt
```

Principles:
1. **VR is opt-in.** Nothing XR runs until `navigator.xr.isSessionSupported('immersive-vr')` resolves true **and** the player presses ENTER VR. When it is false, or on `2d.html`, the code path is today's code path.
2. **No gameplay in the XR layer.** `XRInput` only calls existing `Game` entry points (`hold`, `laneQ`, `jump` through `hold`, `mount`/`dismount`, `pressAt`, `state = 'pause'/'play'` as `onKey` already does).
3. **The renderers keep computing their camera poses.** In XR they hand the pose to `XR3D` instead of writing it to the camera. The headset owns head rotation and position; the game only moves the rig.
4. **No new rendering engine, framework, bundler or runtime dependency.** It uses three r186's built-in `renderer.xr` and plain global scripts like the rest of the project.

---

## 2. Module responsibilities

### `src3d/xr3d.js`: `XR3D` (new, about 300 lines estimated)
- **Support and entry**: feature detection; the ENTER VR / EXIT VR button (DOM button, hidden unless supported; `?vr=0` hides it); `navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] })`; `renderer.xr.enabled = true` (only once supported); `renderer.xr.setReferenceSpaceType('local-floor')`; `renderer.xr.setSession(s)`.
- **Loop ownership** (section 3.A): it takes the loop on `sessionstart` and gives it back on `end`. A guarded `try/catch` around each XR frame.
- **Rigs**: `rigMain` (holds `Renderer3D.camera`, added to `Renderer3D.scene`) and `rigRace` (holds `Race3D.camera`, added to `Race3D.scene`), created lazily. `applyChase(rig, cam, look, dt)` derives a **level yaw** from `look − cam`, smooths position and yaw, and adds the configurable offsets (`XR3D.cfg`).
- **XR render settings**: `setFramebufferScaleFactor(cfg.scale)` **before** `setSession`; `setFoveation(cfg.foveation)` after it; it marks `presenting` so `adapt()` / `resize()` / shake / FOV changes skip.
- **Comfort layer**: one head-locked `Mesh` (an inverted sphere or a quad in front of the eyes, `depthTest: false`, highest `renderOrder`), attached to the XR camera. It draws the fade-to-black and the speed/turn **vignette** (a radial alpha texture made once in a canvas, no post-processing pass). It is driven by `g.scene.fade`, `g.fadeIn`, `g.flash`, `g.portal.k/flash`, the rig's yaw rate and the speed.
- **Lifecycle safety**: `end`, `visibilitychange` (`visible-blurred` / `hidden` → pause, like `blur`), restoring the DOM layers and the window loop, `renderer.xr.enabled` back to false after the session so desktop rendering is exactly as before.

### `src3d/xr_input.js`: `XRInput` (new, about 200 lines estimated)
- `renderer.xr.getController(0/1)` for the target rays. A procedural ray (a thin `Line`) and a pointer dot. No downloaded controller models.
- Each XR frame: read `XRSession.inputSources[i].gamepad` (xr-standard mapping, `handedness`). It detects edges (pressed this frame), applies a dead zone and hysteresis, and translates to `Game` calls (section 5).
- Haptics: `gamepad.hapticActuators?.[0]?.pulse(v, ms)`, triggered from **events the game already emits** (`Game.emit` names: hit, coin, bump, ...) through a tiny listener (section 4: a hook in `emit`), or by watching `g.shake` rising. Nothing is added to the rules.

### `src3d/xr_hud.js`: `XRHud` (new, about 150 lines estimated)
- One `CanvasTexture` whose source is the `#screen` canvas (320x180). `NearestFilter`, so the pixel art stays crisp. `colorSpace = SRGBColorSpace`. Updated once per frame after `drawUI` (`needsUpdate = true`).
- **Menu panel** (title / pause / over / race end): world-space, in front of the rig, about 2.4 m wide at 2.2 m distance (configurable), yaw-locked to the rig. Unlit `MeshBasicMaterial` with `transparent: true`.
- **HUD panel** (play / race / scene): the same texture on a smaller, lower panel attached to the rig (not to the head), tilted toward the eyes.
- **Raycasting**: a ray from the controller against the active panel → `uv` → `x = uv.x·320`, `y = (1 − uv.y)·180` → `game.mouse` (for hover) → on trigger: `game.pressAt(x, y)`.

### `src/game.js`: `Game` (existing, the rules are not changed)
It keeps all gameplay state and mechanics. It gets two **behaviour-neutral hooks** (section 4).

### `src3d/renderer3d.js`, `src3d/race3d.js` (existing)
They keep computing their camera poses as today and get **guarded XR branches** (section 4).

---

## 3. Critical systems design

### A. Game loop (verified against `game.js` l.84-100)

Today: the constructor starts `requestAnimationFrame(loop)`. `loop` re-arms first, measures the screen rate over 40 frames, skips early frames on screens over 100 Hz (`cap`), clamps dt to 0.05 s, then calls `advance(dt)` and `draw(dt)`.

**Design:**
1. Add a **loop-owner flag** to `Game`: `this.loopOwner = 'window'`. In `loop`, after re-arming: `if (this.loopOwner !== 'window') { last = now; return; }`. The window loop **keeps re-arming** (so it never has to be restarted, and it cannot die), but does no work while XR owns the frames. Resetting `last` means the first desktop frame after VR does not see a huge dt.
   Note: Quest Browser typically stops calling the window's `requestAnimationFrame` during an immersive session. The flag also covers browsers that keep calling it, so the two loops can never both advance the game.
2. Expose one stepping function, `Game.frame(dt)`, which is `advance(dt); draw(dt)`. The window loop calls it, so behaviour is unchanged.
3. `XR3D` on `sessionstart`: `game.loopOwner = 'xr'`; `renderer.setAnimationLoop((t, xrFrame) => { dt = clamp((t − last)/1000, 0, 0.05); input.poll(xrFrame); game.frame(dt); hud.update(); comfort.update(); })`.
   - **No FPS cap in XR.** The headset's rate (72/80/90 Hz) is the frame clock. `advance()` already sub-steps to ≤ 1/60 s (C3).
   - The **desktop FPS cap is untouched**: it lives in the window loop only.
   - Optional, later: `session.updateTargetFrameRate(72|90)` if `supportedFrameRates` offers it (Phase 8).
4. On `end` (user exit, Oculus button, error, or `session.end()` from EXIT VR): `renderer.setAnimationLoop(null)`, then `game.loopOwner = 'window'`. Restore the DOM layers, set `renderer.xr.enabled = false`, call `Renderer3D.resize()`, and pause if the state was `play` (the player is taking the headset off).
5. **Errors**: each XR frame body is wrapped in `try/catch`. After 3 consecutive failing frames, `session.end()` is called, which returns to the desktop loop through the `end` path, and the error is logged. A `requestSession` rejection shows a short message on the button and never touches the loop.
6. **No duplicate loops**: there is exactly one `setAnimationLoop` callback (guarded by `XR3D.active`). The window loop is permanent but inert while `loopOwner === 'xr'`. ENTER VR is ignored while a session is starting or running.

### B. Camera architecture

**Today**:
- Main scene: `Renderer3D.draw` computes `this.cam` (chase: about 4.2 m up, 7.5 m back, follows `relX`, menu orbit blend, cutscene blend, shake) and `this.look`, then `camera.position.copy(cam); camera.lookAt(look)`. The FOV is changed by the aspect ratio (`resize`) and by the dash (`perk.fov`).
- Race: `Race3D.draw` lerps its own camera to `(p.x·0.55, 3.5 + air·1.4, −p.s + 8.2)`, calls `lookAt` ahead, and changes its FOV with speed.

**XR design (one rig per scene, no re-parenting):**

```
Renderer3D.scene ── rigMain (Group) ── Renderer3D.camera   (three's XR manager drives camera pose and projection)
Race3D.scene     ── rigRace (Group) ── Race3D.camera
```

- The rigs are created when the first session starts. `rigRace` is created the first time `Race3D` exists (it is lazily created in `Renderer3D.draw`). Outside XR each camera's parent is its rig at **identity** (or the camera is simply left where it is, and the rig is only inserted when a session starts and removed when it ends). **Recommended**: insert on `sessionstart`, remove on `end`, so the desktop scene graph is byte-for-byte today's. Verify in Phase 3 that the main scene's custom `updateMatrixWorld` (it skips hidden children) updates the visible rig. It should, since the rig is visible.
- **`applyChase(rig, cam, look, dt)`**:
  - Position: the rig follows `cam` with an exponential smoothing (`cfg.posLag`, e.g. 0.12 s), but **height is fixed** to `cfg.eyeY` (start 2.2 m above the road, so a seated or standing player sees over the runner), **back offset** `cfg.back` (start 4.5 m, shorter than the desktop 7.5 m: in stereo the runner should not look tiny), **lateral** follow factor `cfg.latFollow` (start 0.6: lane changes move the view less than the runner).
  - Yaw only: `yaw = atan2(look.x − cam.x, −(look.z − cam.z))`, smoothed hard (`cfg.yawLag`, e.g. 0.6 s), and clamped to a small range around the road direction. **No pitch and no roll ever**: the horizon stays level. The headset gives the real head pitch and roll.
  - **Ignored in XR**: `g.shake` (replaced by haptics), the menu orbit (the menu rig stays still in front of the runner), the dash FOV and the race FOV (the projection belongs to the headset), the cutscene camera move (replaced by a fade: see E).
  - `local-floor` reference space: the player's real height adds to `cfg.eyeY`. Phase 3 decides whether to subtract the floor-to-head height so seated and standing players see the same framing (an option: `cfg.seatedCompensate`).
- **In `Renderer3D.draw`**: replace the final `camera.position.copy(cam); camera.lookAt(look)` with `if (xr.presenting) xr.applyChase(xr.rigMain, this.cam, this.look, dt); else { …as today… }`. The sky and sun use `xr.eyeWorld()` in XR (C9).
- **In `Race3D.draw`**: compute the same target (`camPos`, look point) and branch the same way. The FOV line is skipped in XR.
- Every value lives in `XR3D.cfg`, with URL overrides (`?xrY=`, `?xrBack=`, `?xrLat=`, `?xrScale=`) for tuning on the headset without redeploying code.

### C. VR HUD and menus

- **Source**: the existing `#screen` canvas after `Renderer.drawUI(g)` (no change to the artwork or the layout). Its CSS can be hidden in XR. The canvas still renders.
- **Texture**: `new THREE.CanvasTexture(screenCanvas)`, `magFilter = NearestFilter`, `minFilter = LinearFilter` (no mipmaps: a 320x180 upload per frame is about 230 KB). `needsUpdate` each frame. Phase 8 may lower this to "only when the HUD changed" if profiling shows a cost.
- **Panels**: one mesh, moved and scaled between two layouts:
  - **Menu layout** (`title`, `pause`, `over`): world-space, 2.4 x 1.35 m, 2.2 m ahead of the rig at head height, yaw-locked. It is the only interactive layout. A ray is shown only in this layout.
  - **HUD layout** (`play`, `race`, `scene`): 1.2 x 0.675 m, 1.6 m ahead and 0.45 m below eye height, tilted up 20 degrees. Not interactive. Readability of the 1x pixel font at this size **must be checked on the headset** (risk R4).
- **Full-screen effects** (C6): `Renderer.drawUI` gets a guarded flag `this.noScreenFx` (false by default, so the 2D page and desktop are unchanged). When true, it skips the burgundy game-over flash, `drawPortalFx` and the black fade part of `drawSceneOverlay` (the captions stay, they are UI). `XR3D` sets it during the session and redraws those effects on the head-locked comfort layer.
- **Ray → UI**: `Raycaster.setFromXRController(controller)`, intersect the menu panel → `uv` → `(uv.x·320, (1 − uv.y)·180)` → `game.mouse.x/y` (hover, the existing cursor logic) → on trigger edge: `game.pressAt(x, y)` (C1). The sound button, CHARACTER, PLAY/RESUME/RUN AGAIN all come for free.
- `#screen` and `#touch` are hidden (`visibility: hidden`) during the session and restored after it. Nothing relies on them inside VR.

### D. Quest Touch controller integration

**Why the touch channel**: `hold(pid, id, fresh)` already implements "steering is held; jump / slide / pause / scooter-off fire once, only in `play`". `releaseTouch()` is already called at pause, cutscene and blur. Using it with dedicated pointer ids (`'xr-steer'`, `'xr-act'`) gives exactly the touch behaviour with no duplicated logic. The keyboard channel (`keys`) is left to the keyboard.

See section 5 for the table. Details:
- **Steering (play)**: the thumbstick x of either hand, dead zone 0.35, hysteresis to 0.25. `hold('xr-steer', 'left'|'right'|null, false)`. Holding it steers continuously, like holding a touch button.
- **Race lanes**: on a thumbstick **flick** (crossing 0.6 from the centre, re-armed below 0.3): `game.laneQ += ±1`, exactly what the touch and keyboard paths do. One lane per flick.
- **Jump / slide**: `hold('xr-act', 'jump'|'slide', true)` then `hold('xr-act', null, false)`. This fires once, only in `play` (the rule `hold()` enforces).
- **Scooter**: `game.riding ? game.dismount() : game.mount()`. These are the same calls the `E` key makes. `mount()` itself refuses when no indicator is shown.
- **Pause / resume**: the Menu button sets `state = 'pause'` + `releaseTouch()` from `play`, and `state = 'play'` from `pause`. These are the same transitions as `P`/`Esc` in `onKey`. Session `visibilitychange` → pause.
- **Menus**: a trigger press on the panel → `pressAt`. **A** also acts as "Enter" on title/over (start) and pause (resume) for players who do not point, by calling `pressAt` at the centre of the active button.

### E. Comfort and visual presentation

- **Third-person floating chase rig**, level horizon, yaw-only and heavily damped (B).
- **No forced camera movement**: the rig moves only with the run (which is the game's motion) and with the yaw of the road. Lane changes are attenuated (`latFollow`).
- **No shake, no roll, no FOV change** in XR.
- **Fade to black** instead of camera moves: the Gare du Midi cutscene (`state === 'scene'`): the game already fades (`g.scene.fade`, `g.fadeIn`). In XR the rig **stays put** while the cutscene plays, and the comfort layer fades out and back in. Captions stay on the HUD panel. Portals: the pink wash becomes a soft vignette tint, and the door "flash" becomes a short fade.
- **Vignette**: strength = f(speed above BASE, |yaw rate|), configurable 0 to 1, on by default at a moderate level (`cfg.vignette`).
- **Art and visual identity unchanged**: the same scenes, lights, fog, textures and sprites. Only the camera framing and full-screen effects are adapted.

### F. Performance (details in section 7)
72 fps is the minimum target and 90 fps the goal. Measure first. Multiview is not assumed.

---

## 3b. Input mapping table (section 5 of the deliverables)

| Physical input (either hand unless stated) | `title` | `play` | `race` | `pause` | `over` | `scene` |
|---|---|---|---|---|---|---|
| Thumbstick X held | — | steer: `hold('xr-steer','left/right')` | — | — | — | (ignored, like touch) |
| Thumbstick X flick | — | (same as held) | `laneQ ±1` | — | — | — |
| Thumbstick up (flick) | — | jump (`hold(...'jump', true)`) | — | — | — | — |
| Thumbstick down (flick) | — | slide (`hold(...'slide', true)`) | — | — | — | — |
| **A** (right) / **X** (left) | press PLAY | jump | — | resume | RUN AGAIN (after the delay) | — |
| **B** (right) / **Y** (left) | CHARACTER | slide | — | — | — | — |
| **Trigger** | click on the panel (`pressAt`) | jump | — | click (`pressAt`) | click (`pressAt`) | — |
| **Squeeze (grip)** | — | scooter on/off (`mount`/`dismount`) | — | — | — | — |
| **Menu** (left controller only; the right one is the system button) | — | pause | — | resume | — | — |
| Ray hover | `game.mouse` (cursor/hover) | hidden | hidden | `game.mouse` | `game.mouse` | hidden |

Notes:
- The race uses only lane flicks, because `Race.step` has no jump or slide input (verified: `raceStep` only reads `laneQ`). Its jumps come from the ramps.
- The sound on/off button stays reachable by the ray in the menus (`BTN.sound`). The **M** key has no VR equivalent (not needed).
- Each cell has one meaning, so no conflicting assignments. Trigger = jump in `play` is optional (`cfg.triggerJump`, default on), because some players prefer A.

---

## 4. Exact existing files requiring modification

All changes are **guarded** (they do nothing unless an XR session is active) or are **pure refactors with identical behaviour**. None changes rules, art or assets.

| File | Change | Behaviour outside XR |
|---|---|---|
| `index.html` | Add `<script src="src3d/xr_hud.js">`, `xr_input.js`, `xr3d.js` after `renderer3d.js`. `main3d.js` creates `XR3D` if `navigator.xr` exists. | Unchanged. The scripts only define classes; no button appears unless VR is supported. |
| `src3d/main3d.js` | `window.__wf.xr = XR3D.maybeCreate(__wf)` (3 to 5 lines). | Unchanged. |
| `src/game.js` | (1) `loopOwner` flag + early return in `loop`; (2) extract `frame(dt)`; (3) extract `pressAt(x, y)` from the `pointerup` handler; (4) an optional `onEmit` listener in `emit()` (for haptics). | Identical: the same code paths, now named. Checked by the existing `ui`, `controls`, `perf`, `world` tests. |
| `src/render.js` | `noScreenFx` flag: when true, `drawUI` skips the full-screen flash, the portal wash and the black fade. | Flag false by default → `2d.html` and desktop unchanged. |
| `src3d/renderer3d.js` | (1) `adapt()` and `resize()` return early while XR is presenting; (2) camera write → `xr.applyChase` when presenting; (3) sky / sun / glow centred on `xr.eyeWorld()` when presenting; (4) skip the dash FOV and shake when presenting. | Unchanged (every branch tests `this.xr && this.xr.presenting`). |
| `src3d/race3d.js` | Camera write and FOV line → `xr.applyChase(rigRace, …)` when presenting. `Race3D` needs a reference to `xr` (passed by `Renderer3D`). | Unchanged. |
| `README.md` | A VR section (Phase 9). | n/a |
| `tests/` | A new `qa3d_xr.js` (see section 8). Existing tests untouched. | n/a |

**Not modified**: `2d.html`, `3d.html`, `src/world.js`, `src/track.js`, `src/biomes.js`, `src/race.js`, `src/perks.js`, `src/audio.js`, every `src3d/env_*`, `*_art`, `*_assets`, `kit.js`, `road3d.js`, `items3d.js`, `runner3d.js`, `runner_sprite.js`, `car3d.js`, `portal3d.js`, `train3d.js`, `crowd3d.js`, `vendor/three.min.js`, `assets/`, `tools/`.

## 5. Proposed new files

| File | Purpose |
|---|---|
| `src3d/xr3d.js` | `XR3D`: support detection, button, session, loop ownership, rigs, chase application, XR render settings, comfort layer, lifecycle. |
| `src3d/xr_input.js` | `XRInput`: controllers, rays, gamepad polling and edge detection, mapping to `Game` calls, haptics. |
| `src3d/xr_hud.js` | `XRHud`: CanvasTexture panel, layouts, ray/panel intersection → 320x180 → `pressAt`. |
| `tests/qa3d_xr.js` | Automated tests with a fake XR session (section 8). |
| `docs/vr/` | Notes and on-device measurement logs (OVR Metrics captures, tuning values). |

Why three files instead of one `xr3d.js`: the input mapping and the HUD can each be unit-tested without a session, and each stays small. `XR3D` is the only entry point; the other two are internal helpers. If you prefer a single file, they can be merged without changing the design.

### Proposed directory tree (new items marked `+`, modified `~`)

```
wayfarer/
├── 2d.html
├── 3d.html
├── index.html                      ~ three <script> tags
├── README.md                       ~ VR section (Phase 9)
├── QUEST2_VR_AUDIT.md
├── QUEST2_VR_IMPLEMENTATION_PLAN.md
├── assets/                         (unchanged)
├── vendor/three.min.js             (unchanged, r186 includes WebXRManager)
├── src/
│   ├── game.js                     ~ loopOwner, frame(), pressAt(), onEmit (behaviour-neutral)
│   ├── render.js                   ~ noScreenFx flag (default off)
│   └── … (world, track, biomes, race, perks, audio … unchanged)
├── src3d/
│   ├── main3d.js                   ~ create XR3D when supported
│   ├── renderer3d.js               ~ guarded XR branches (camera, sky, adapt/resize, shake/FOV)
│   ├── race3d.js                   ~ guarded XR branch (camera, FOV)
│   ├── xr3d.js                     + session, loop, rigs, comfort, XR settings
│   ├── xr_input.js                 + controllers, mapping, haptics
│   ├── xr_hud.js                   + HUD/menu panel, ray → pressAt
│   └── … (env_*, *_art, *_assets, kit, road3d, items3d … unchanged)
├── tests/
│   ├── qa3d_xr.js                  + fake-session tests
│   └── … (existing tests unchanged)
├── docs/
│   └── vr/                         + measurement logs, tuning notes
└── tools/                          (unchanged)
```

---

## 6. Camera and HUD architecture (summary)

### 6.1 Ownership rules (no conflicts)
- Each scene owns exactly one camera and, in XR, one rig: `Renderer3D.scene → rigMain → Renderer3D.camera`, `Race3D.scene → rigRace → Race3D.camera`. Nothing is re-parented while a session runs.
- `renderer.render(scene, camera)` is called with that scene's own camera, as today. three's XR manager takes the eye poses relative to `camera.parent`, which is that scene's rig.
- Switching between the main scene and the race (`g.state === 'race'`) changes which rig is used. On the switch `XR3D` **snaps** (no smoothing) the new rig to its target behind a short fade, so the view never sweeps across.
- The renderers keep computing `cam`/`look` as today. Only the final write is redirected. That keeps a single source of truth for the framing.

### 6.2 Configurable framing (`XR3D.cfg`, URL overrides for tuning)
`eyeY 2.2 m`, `back 4.5 m`, `latFollow 0.6`, `posLag 0.12 s`, `yawLag 0.6 s`, `yawClamp 25°`, `seatedCompensate true`, `vignette 0.5`, `scale 0.9`, `foveation 1`, `triggerJump true`, `hudDist 1.6 m`, `menuDist 2.2 m`.
All are **starting values to tune on the headset** (Phase 3 and 7).

### 6.3 HUD data flow
`Game.draw` → `Renderer3D.draw` → `ui.drawUI(g)` paints `#screen` (with `noScreenFx` in XR) → `XRHud.update()` sets `texture.needsUpdate` → the panel is drawn in the same XR frame. The comfort layer reads `g.scene?.fade`, `g.fadeIn`, `g.flash`, `g.portal` directly. These are read-only, so no gameplay coupling.

---

## 7. Performance strategy

**Facts from the code**: about 8 500 pooled groups (~24 000 objects), with only one or two hundred visible; the hidden-group walk skip (`cullHidden`); merged prop geometry; no shadow maps; Lambert/Basic materials; about 42 materials with `alphaTest` or `transparent` across `src3d`; WebP data-URI textures (about 6 MB of JS) decoded to uncompressed RGBA; animated `CanvasTexture`s (water, glows, neon boards); the 320x180 HUD texture to be added.

**Targets**: ≥ 72 fps everywhere (no stale frames in OVR Metrics); 90 fps as the optimisation goal (Phase 8).

| Lever | Plan |
|---|---|
| Framebuffer scale | Start at `0.9`, measure per zone, and pick the highest value that holds 72 fps. It is set before the session, so changing it means exiting and re-entering VR. Phase 8 may choose a per-session value from a quick benchmark. |
| Foveation | `setFoveation(1)` to start; try 2 or more if GPU-bound (it softens the edges of the view, which is acceptable at speed). |
| Adaptive pixel ratio | `adapt()` disabled in XR (C4). Its role is taken by the scale and foveation choices. |
| Stereo overhead | Without multiview, the draw calls double. **Multiview is not assumed**: Phase 8 checks whether three r186 + Quest Browser can use `OVR_multiview2` with this renderer configuration, and measures before and after. |
| Draw distance | Fog near/far is already per biome. In XR, optionally scale `fog.far` and the item/prop visibility window by `cfg.drawK` (e.g. 0.8) if the CPU or GPU is short. This only shows less far scenery and changes no rules. |
| Overdraw | Measure the dense zones (neon, coast/town crowds, race). Material-level options only (prefer `alphaTest` where a material already supports it, limit simultaneous additive effects). No art change. |
| CanvasTexture uploads | The HUD at 320x180 per frame is cheap. Phase 8 measures the other animated canvases and may lower their update rate in XR. |
| CPU | Remote DevTools profiling of an XR frame. Check for per-frame allocations in the XR modules (reuse vectors and quaternions). The game's sub-steps cost 1x per frame at 72 to 90 Hz (C3). |
| Texture memory | Measure with remote DevTools (memory) and OVR Metrics. If it is too high, **propose** (for approval) lazy per-zone decoding or KTX2 conversion. This touches the asset pipeline, so it is not included without your approval. |
| Refresh rate | Default 72 Hz. Use `updateTargetFrameRate(90)` only where the measurements show headroom. |

---

## 8. Testing methodology

### Automated (CI-style, no headset)
| What | How |
|---|---|
| Non-XR behaviour unchanged | The existing battery (`race_sim.js` + the 20 `qa3d_*.js`), run after each phase. Plus: the `2d.html` page loads none of the XR scripts and still runs 300 frames; desktop `index.html` shows no ENTER VR button when `navigator.xr` is absent. |
| `Game` refactors | `pressAt` gives the same results as clicks (the existing `ui` and `controls` tests). The loop with `loopOwner = 'xr'` stops advancing the game; with `'window'` it resumes with no dt spike. |
| Input mapping | `qa3d_xr.js` injects a **fake gamepad state** into `XRInput.map(state, game)` (a pure function) for each game state. It checks `held`/`tleft`/`tright`, `laneQ`, jump/slide/pause/mount calls, edge detection, dead zone and hysteresis. |
| HUD picking | `XRHud.uvToUi(uv)` → expected 320x180 coordinates; a ray at each `BTN` → the right `pressAt` action. |
| Loop ownership | A fake `XRSession`-like object (`requestAnimationFrame`, `end` event) drives `XR3D`'s start/end paths. Check: there is one active loop, the owner is restored on end, a frame that throws 3 times ends the session. |
| Rig math | `applyChase` keeps pitch and roll at 0, clamps yaw, smooths, and snaps on a scene switch. |

Limit: three's real `WebXRManager` needs a real or emulated XR device. A full stereo render cannot be checked headless with the current SwiftShader setup. The automated tests cover the logic, not the headset.

### Semi-automated / manual on desktop
- **Immersive Web Emulator** (Meta, a Chrome extension): every phase, for entering/leaving, controller mapping, menus, race, cutscene. It can perhaps also be loaded into a headed Playwright Chromium for scripted smoke tests (to try; not required).

### On the Quest 2 (required; cannot be automated)
- Developer mode, USB, `adb reverse tcp:8000 tcp:8000`, local server; or a Vercel preview URL (HTTPS).
- `chrome://inspect` remote DevTools: console, performance profile of XR frames, memory.
- **OVR Metrics Tool**: fps, stale frames, GPU/CPU level, foveation, memory.
- A checklist per phase, plus at the end:
  - every zone (city, forest, market, neon, coast/town, tram, Gare du Midi cutscene, Utrecht, Vic, race);
  - a 10-minute session (heat, memory);
  - entering/exiting VR 5 times;
  - Oculus button and headset removal mid-run (must pause);
  - seated and standing;
  - HUD readability;
  - a comfort rating, ideally with more than one tester.

### Regression on the existing platforms
Desktop Chrome/Firefox/Safari and the phones used so far (including the Redmi), for each phase that touches shared files.

---

## 9. Implementation phases and acceptance criteria

Every phase ends with: the existing battery green, `2d.html` checked, and the work pushed to a **`vr-quest` branch** (Vercel preview). `main` is not touched until you approve the merge.

### Phase 1: XR session initialization and exit
- **Files**: `src3d/xr3d.js` (new, session part), `src3d/main3d.js`, `index.html`.
- **Changes**: support detection; ENTER/EXIT VR button; `requestSession` / `setSession` / `end`; `local-floor`; DOM layers hidden and restored; `renderer.xr.enabled` toggled. The scene is shown with the default XR camera (no rig yet).
- **Dependencies**: none.
- **Acceptance**: on the Quest the button appears; entering shows the 3D world in stereo with head tracking; exiting returns to the 2D page view with the game intact. Check the `blur` → pause behaviour (C5) and record it. No button on desktop without XR or on phones.
- **Regression**: the full battery; a new test that the button is absent without `navigator.xr`.

### Phase 2: XR animation loop integration
- **Files**: `src/game.js` (`loopOwner`, `frame()`), `src3d/xr3d.js`.
- **Changes**: section 3.A; `try/catch` guard; dt clamp; session end → window loop.
- **Acceptance**: the game advances in VR at the headset rate (log the measured Hz: 72/80/90); exiting resumes the desktop loop with no time jump; no double stepping (check with a frame counter in dev mode); the desktop 60 fps cap still works (`?fps=`).
- **Regression**: `perf`, `ui`, `world`; new loop-ownership tests.

### Phase 3: Camera rig and stereo rendering
- **Files**: `src3d/xr3d.js` (rigs, `applyChase`, `eyeWorld`), `src3d/renderer3d.js` (guarded branches, `adapt`/`resize` skip, sky/sun, no shake/FOV in XR).
- **Changes**: section 3.B for the main scene; `cfg` + URL overrides.
- **Acceptance**: the third-person view behind the runner at a comfortable height; the horizon always level; the head moves freely; no artificial pitch or roll; lane changes and curves feel smooth; values tuned on the device and recorded in `docs/vr/`.
- **Regression**: the full battery (the renderer is shared); desktop and phone visual check; rig math tests.

### Phase 4: Basic controller steering and gameplay
- **Files**: `src3d/xr_input.js` (new), `src3d/xr3d.js`.
- **Changes**: controllers, thumbstick steer via `hold('xr-steer')`, A/X jump, B/Y slide, grip scooter, Menu pause; edge detection, dead zone and hysteresis.
- **Acceptance**: a full run is playable with the controllers only (steer, jump, slide, scooter on/off where offered, pause/resume); no stuck steering after a pause or cutscene (`releaseTouch` clears the `xr-*` ids).
- **Regression**: `controls`, `scooter`, `world`; mapping tests.

### Phase 5: VR HUD and interactive menus
- **Files**: `src3d/xr_hud.js` (new), `src/game.js` (`pressAt` extraction), `src/render.js` (`noScreenFx`), `src3d/xr_input.js` (rays).
- **Changes**: section 3.C; menu and HUD layouts; ray hover and click; full-screen effects moved to the comfort layer.
- **Acceptance**: title → play → pause → resume → over → run again, all from inside VR; the CHARACTER and sound buttons work; the score and coins are readable in the HUD layout; no tinted rectangle for flashes and fades.
- **Regression**: `ui` (proves `pressAt` == old clicks), `controls`, `portal`, `gare`; HUD picking tests.

### Phase 6: Race scene compatibility
- **Files**: `src3d/race3d.js` (guarded branch), `src3d/renderer3d.js` (passes `xr`), `src3d/xr3d.js` (`rigRace`, snap on switch), `src3d/xr_input.js` (lane flicks).
- **Acceptance**: entering the race through the sphere and leaving it happen behind a fade, with no sweep; one lane per flick; the race HUD is readable; win and lose both return to the run correctly.
- **Regression**: `race` (13 checks), `race_sim`.

### Phase 7: Comfort features and haptics
- **Files**: `src3d/xr3d.js` (comfort layer: fade + vignette), `src3d/xr_input.js` (haptics), `src/game.js` (`onEmit` listener).
- **Changes**: section 3.E; the cutscene and portals in XR; vignette tuning; haptics on hit / coin streak / bump / the moments where desktop shakes.
- **Acceptance**: the Gare du Midi cutscene shows with fades and no camera move; portals have no flashing rectangle; the vignette is tunable; testers report no discomfort in a 10-minute session at default settings (subjective, recorded).
- **Regression**: `gare`, `portal`, `vortex`, `perks`; the full battery.

### Phase 8: Performance optimization
- **Files**: `src3d/xr3d.js` (scale, foveation, `drawK`, target frame rate), possibly guarded XR-only settings in `renderer3d.js` / `race3d.js`.
- **Changes**: section 7; the multiview check; profiling; measured choices recorded in `docs/vr/`.
- **Acceptance**: ≥ 72 fps with no sustained stale frames in every zone on Quest 2 (OVR Metrics logs saved); a list of the zones that reach 90 fps; memory stable over 10 minutes; any asset-pipeline proposal written up for approval, not applied.
- **Regression**: `perf`; the full battery; desktop and phone fps spot checks.

### Phase 9: Final Quest 2 testing and deployment
- **Files**: `README.md`, `docs/vr/`.
- **Acceptance**: the full on-device checklist (section 8) passed; the full automated battery green; the desktop, mobile and `2d.html` regression done. After your approval: merge `vr-quest` → `main`, push `main` and `main:three-d` (both auto-deploy), then a smoke test of the live URLs on the Quest.

---

## 10. Technical risks and unresolved questions

### Risks
| # | Risk | Mitigation |
|---|---|---|
| R1 | **Frame rate** in the dense zones (overdraw from transparent and additive cards, stereo draw calls). | Measure early (Phase 3 already on the device), then the scale, foveation, draw distance and multiview levers (Phase 8). |
| R2 | **Texture memory** (uncompressed RGBA from about 6 MB of WebP) → tab reload or kill on Quest. | Measure in Phase 1/3. Any lazy loading or KTX2 change is proposed for approval only. |
| R3 | **Motion sickness** at 22 to 49 m/s. | Third-person rig, level horizon, damped yaw, vignette, fades; tuning with testers. A speed or comfort mode would change gameplay and is **not** included unless you ask. |
| R4 | **HUD readability**: the 320x180 pixel font magnified on a panel may be blurry or too small at the Quest 2's resolution. | Tune the panel size and distance; nearest filtering. If still unreadable: Q4. |
| R5 | **Flat picture cards in stereo** (avatar, crowds, close trees) read as flat. | Choose a rig distance where they read well. **No art change.** Report what is seen. |
| R6 | **`blur`/visibility behaviour** of Quest Browser around session start (C5) and system-menu overlays. | Verify in Phase 1; handle it in `XR3D` without changing the `blur` rule. |
| R7 | Custom `scene.updateMatrixWorld` (skips hidden groups) interacting with the rig and the XR camera's matrices. | It should be fine because the rig is visible. Verify in Phase 3. |
| R8 | **Multiview** availability with three r186 + Quest Browser + this renderer configuration (`antialias: true`). | Not assumed. Test in Phase 8. |
| R9 | Audio: the music start relies on gesture listeners on `window`. Pressing ENTER VR is a gesture, but controller presses inside VR are not DOM events. | Make sure the music has started before the session (ENTER VR click). Verify in Phase 1. |

### Questions for you before or during implementation
- **Q1**: Branch workflow: OK to develop on `vr-quest` with Vercel previews and merge to `main` only after your approval?
- **Q2**: Three new files (`xr3d.js`, `xr_input.js`, `xr_hud.js`), or a single `xr3d.js`?
- **Q3** (C7): In VR, may the menus show **new short hint text** ("A PLAY", "TRIGGER SELECT")? This is a UI text addition, not art. The default if not approved: hide the keyboard/touch hints and add nothing.
- **Q4**: If the HUD is unreadable at any reasonable size (R4), may the in-run HUD be drawn at 2x into a separate canvas using the **same** `Renderer` drawing code (same artwork, more pixels)?
- **Q5**: Default trigger action in `play`: jump (proposed) or nothing (A/X only)?
- **Q6**: Is a seated experience the main target (it affects `eyeY` and `seatedCompensate`)?
- **Q7**: Optional later: a web app manifest so WAYFARER can be pinned in the Quest library?
