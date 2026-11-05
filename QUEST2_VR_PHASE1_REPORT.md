# WAYFARER: Meta Quest 2 VR, Phase 1 report (WebXR foundation)

Status: **implemented and tested in an emulated environment, NOT yet verified on a physical Meta Quest 2.** Nothing is committed or deployed. The work is in the working tree on top of `ccc0273`.

---

## 1. Files created and modified

### Created
| File | Lines | Purpose |
|---|---|---|
| `src3d/xr3d.js` | 175 | `XR3D`: support detection, ENTER/EXIT VR button, session start/end, loop ownership, the two camera rigs, XR render settings, error handling. |
| `tests/qa3d_xr.js` | 153 | Automated lifecycle tests with a fake WebXR device driven by three's real `WebXRManager`. |
| `QUEST2_VR_PHASE1_REPORT.md` | — | This report. |

### Modified (`git diff --stat`: 5 files, +22 / −9)
| File | Change | Effect outside VR |
|---|---|---|
| `index.html` | `+1`: `<script src="src3d/xr3d.js">` after `renderer3d.js`. | None (it only defines a class). |
| `src3d/main3d.js` | `+1`: `__wf.xr = XR3D.maybeCreate(__wf)`. | None: no button unless `immersive-vr` is supported. |
| `src/game.js` | `+4 −1`: `this.loopOwner = 'window'`; the window loop returns early (and resets its clock) when it is not the owner; `frame(dt)` = `advance(dt); draw(dt)`, called by the window loop. | Identical: the same calls in the same order; the 60 fps cap is untouched. |
| `src3d/renderer3d.js` | `+13 −8`, all guarded by `this.xr && this.xr.presenting`: `resize()` and `adapt()` return early; no shake; no cutscene camera blend; no dash FOV change; the chase pose goes to `xr.applyMain()`; the sky, sun disc and glow are centred on the rig instead of the camera. | Identical (the original statements run in the `else` branch). |
| `src3d/race3d.js` | `+3`: when presenting, the race pose goes to `xr.applyRace()` and the speed-FOV / `lookAt` lines are skipped. | Identical. |

**Not touched**: `2d.html`, all art and asset files (`*_assets.js`, `*_art.js`, `env_*.js`, `assets/`), `src/render.js`, `world.js`, `track.js`, `biomes.js`, `race.js`, `perks.js`, `audio.js`, `vendor/three.min.js`. No dependency was installed.

---

## 2. Architectural decisions

1. **three r186's built-in WebXR** (`renderer.xr`): no new engine, framework, bundler or runtime dependency.
2. **Opt-in**: the button is created only when `navigator.xr.isSessionSupported('immersive-vr')` is true. `?vr=0` hides it. In automated browsers it appears only with `?vr=1`, so the existing tests see exactly the page they always saw.
3. **Loop ownership (one loop at a time)**:
   - `Game.loopOwner` is `'window'` or `'xr'`. The window loop stays armed for the whole life of the page, but is idle while VR owns the frames, so it never has to be restarted and resumes with no time jump.
   - The VR loop is `renderer.setAnimationLoop(cb)`. It calls the same `Game.frame(dt)` with the same dt clamp (0.05 s); `advance()` keeps splitting it into ≤ 1/60 s sub-steps, so any headset rate works (72/80/90 Hz). There is no 60 fps cap in VR.
   - **Bug found and fixed during testing**: if the animation loop is set *inside* the `sessionstart` event, three restarts its own window-driven animation and **two loops run** (the test measured 6 game frames for 4 headset frames). The loop is now registered *before* `setSession`, and its callback does nothing unless a session is presenting. The test now requires every game frame to come from the headset loop.
4. **Two rigs, no re-parenting during a session**: `rigMain` (in `Renderer3D.scene`, holds `Renderer3D.camera`) and `rigRace` (in `Race3D.scene`, holds `Race3D.camera`, created when the race scene first exists).
   - The cameras are put in their rigs at session start and taken out at the end, so the desktop scene graph is exactly as before.
   - three takes the eye poses relative to `camera.parent`, so each scene's own rig defines its view.
5. **Rig placement** (`XR3D.place`):
   - x follows the desktop chase target (smoothed, `latFollow` 0.6);
   - z = the runner + `back` (4.5 m; race: 6.5 m), **not** smoothed, because the road moves at 22 to 49 m/s;
   - height puts the player's eyes at `eyeY` (2.2 m) above the road, measuring the headset's own height slowly (`seatedCompensate`);
   - yaw is smoothed (0.6 s) and clamped to ±25°;
   - **pitch and roll are always 0**, so the horizon is level and the head moves freely.
6. **No artificial motion added**: in VR, shake, the Gare du Midi side camera, the dash FOV and the race speed-FOV are skipped. The menu orbit is not applied either: on the title screen the rig stays behind the runner, which turns to face the player, as on desktop.
7. **Rendering**: `setFramebufferScaleFactor(0.9)` and `setFoveation(1)` are set before the session. The desktop adaptive resolution stands aside while presenting, and three restores the desktop pixel ratio and size when the session ends.
8. **Lifecycle safety**:
   - a refused session shows "VR UNAVAILABLE" on the button for 2.5 s, and nothing else changes;
   - three failing VR frames in a row end the session, and the desktop loop takes over;
   - a running game is paused when VR ends (the headset came off);
   - if the page blur caused by entering VR pauses a run that was in progress, the run is resumed after 0.6 s.
9. **Configuration**: everything is in `XR3D.cfg`. URL overrides are available for tuning on the headset: `?xrY=`, `?xrBack=`, `?xrRaceBack=`, `?xrLat=`, `?xrScale=`, `?xrFov=`.

---

## 3. Implemented functionality (Phase 1 scope)

- An ENTER VR button where immersive VR is supported. It becomes EXIT VR during a session.
- An immersive session with the `local-floor` reference space (falling back to `local`), the framebuffer scale and the foveation.
- The existing world rendered by three in stereo (two views), with head tracking supplied by the device.
- A third-person rig following the runner in the main scene and in the race scene.
- Returning to the normal game: the EXIT VR button, or the headset's own exit. The desktop loop, resolution and camera are restored.
- **Not in this phase** (as instructed): controller gameplay, VR menus/HUD, comfort fades and vignette, haptics.

---

## 4. Tests performed and results

All tests ran in headless Chromium 1248 with SwiftShader (software GL) on the build server.

### New: `tests/qa3d_xr.js`: **14/14 passed**
1. The ordinary page: no button; the window loop owns the frames; the game runs; no errors.
2. No button without `navigator.xr`, none when unsupported, none with `?vr=0`.
3. The button appears where supported.
4. Entering: three presents the session; the button says EXIT VR; `local-floor`; scale 0.9; foveation 1.
5. **One loop in VR**: every `Game.frame` call comes from the headset loop (this test failed before the fix in 2.3).
6. The camera is in its rig; pitch and roll are 0; the eyes are 2.2 m over the road and 4.5 m behind the runner; the sky follows the viewer.
7. The adaptive resolution stands aside while presenting.
8. The race in VR: the race camera rides its own rig in the race scene, 6.5 m behind the car, level; the main camera is untouched.
9. EXIT: the headset loop stops; the window loop resumes and the game advances; the cameras leave their rigs; a running game is paused.
10. The desktop pixel ratio is restored after VR.
11. Entering and leaving 5 more times: one loop each time; every session ended; nothing left in the scene; no page errors.
12. Three failing frames in VR end the session cleanly; the desktop game carries on.
13. A refused session: a message on the button; nothing presenting; the window loop untouched.
14. `2d.html` loads no VR code and shows no button, even with a WebXR device present.

The fake device implements just enough of WebXR (`XRSession`, two views per frame, `XRWebGLLayer`) for three's real `WebXRManager` to run its normal code path. It proves the logic, not the behaviour of a real headset or of Quest Browser.

### Existing battery, after the changes
| Suite | Result |
|---|---|
| race_sim | all passed |
| controls (keyboard + touch / mobile controls) | 7/7 |
| ui (menus, buttons, touch layer) | 12/12 |
| perf (emulated phone, frame cap, adaptive resolution) | 5/5 |
| world | 43/43 |
| race | 13/13 |
| vic | 19/19 |
| quay | 17/17 |
| portal | 21/21 |
| dest | 18/18 |
| town | 34/34 |
| coastzone | 10/10 |
| perks | 29/29 |
| coins | 10/10 |
| utrecht | 12/12 |
| audio | 32/32 |
| gare | 17/17 |
| vortex | 13/13 |
| **scooter** | **18/19** |
| **avatar** | **9/10** |
| **zagla** | **17/18** |

**The three failures already existed before Phase 1.** I re-ran those three suites with my changes stashed (the original code at `ccc0273`) and got exactly the same results: scooter 18/19, avatar 9/10, zagla 17/18, failing the same checks. They are outdated thresholds in older tests (a texture-count limit, a scene object count, a scooter speed check), not caused by this work. I have not fixed them, because that is outside Phase 1.

### Coverage of the requirements
- **Desktop gameplay**: covered by world, ui, controls, race and the zone suites (all green except the pre-existing failures).
- **Mobile gameplay**: covered by controls and ui (touch buttons, touch layer) and perf (emulated phone). I did not test on a physical phone in this phase.
- **2D game**: it loads none of the new code (test 14), and `2d.html` is not modified. `src/game.js` is shared, and its change is behaviour-neutral.
- **Duplicate loops**: tests 5 and 11.
- **Repeated entering and exiting**: test 11 (5 cycles), plus the error paths (12, 13).

---

## 5. Known limitations (Phase 1)

- **No controller input yet**. In VR the player cannot steer, jump, press PLAY or unpause:
  - Entering VR from the title screen shows the attract run (the runner runs by itself).
  - Entering during a run continues it, but without controls it will soon end on an obstacle, and RUN AGAIN cannot be pressed from inside VR yet.
  - Exit with the headset's own controls (Oculus/Meta button → exit) or remove the headset; the page's EXIT VR button is only reachable outside VR.
- **The HUD and menus are not visible in VR** (the 2D overlay is DOM; it becomes a 3D panel in Phase 2/5).
- **The cutscene and portal full-screen effects** (fades, letterbox, pink wash) are drawn on the 2D overlay and are not seen in VR yet. The cutscene camera move is suppressed (the rig stays behind the runner). Fades come in Phase 7.
- **Camera values** (`eyeY`, `back`, `latFollow`, yaw smoothing) are starting values, not tuned on a headset.
- **Performance on Quest 2 is unknown**: the scale 0.9 and foveation 1 are conservative guesses.
- **Audio**: the music starts on the page's first gesture. The ENTER VR click counts as one, so it should play in VR, but this is not verified on the device.

---

## 6. How to test on a Meta Quest 2

Nothing is deployed. To test, the working tree must be served over HTTPS or as `localhost`.

**Option A: from a computer, over USB (no deployment)**
1. Enable developer mode on the Quest (Meta Horizon app → device → Developer mode), connect USB, accept the debugging prompt in the headset.
2. On the computer: `cd wayfarer && python3 -m http.server 8000`.
3. `adb reverse tcp:8000 tcp:8000`.
4. In Quest Browser open `http://localhost:8000/` (localhost counts as a secure context).
5. Remote console: Chrome on the computer → `chrome://inspect/#devices` → inspect the Quest Browser tab.

**Option B: a preview deployment**, once you authorise it: push the work to a branch (e.g. `vr-quest`) and open its Vercel preview URL (HTTPS) in Quest Browser. `main` stays unchanged.

**Steps in the headset**
1. Open the page. The ENTER VR button should appear at the bottom right (it is not shown until support is confirmed).
2. Press it with the controller pointer. Allow the immersive prompt if asked.
3. You should see the world in stereo behind the runner, and be able to look around freely.
4. Exit with the Meta button → exit, or the browser's exit prompt. The page should come back with the game paused if a run was going.
5. Repeat entering and exiting a few times.
6. Tuning without code changes, for example: `http://localhost:8000/?xrY=1.8&xrBack=5&xrScale=0.8`.

---

## 7. Issues requiring physical headset verification

| # | To verify on the Quest 2 | Why |
|---|---|---|
| H1 | The button appears and the session starts (the immersive prompt, `local-floor` granted). | Emulated only. |
| H2 | **The stereo image is correct** (scale, depth, no doubled or swapped eyes), and the sky and sun look right at the horizon. | The fake device has simple, made-up projections. |
| H3 | **Frame rate**: 72 fps in the busy zones (neon, coast/town, race) at scale 0.9 and foveation 1 (OVR Metrics). | Unknown on real hardware. |
| H4 | Comfort of the starting framing (eyes 2.2 m over the road, 4.5 m back; race 6.5 m back), yaw smoothing and clamp. | Starting values only. |
| H5 | Whether entering VR blurs the page in Quest Browser (the Game pauses on blur; XR3D resumes a run 0.6 s after start). | Browser behaviour, not testable here. |
| H6 | That the window `requestAnimationFrame` loop really stays idle during the session in Quest Browser (it should; the owner flag also guards it). | Real browser scheduling. |
| H7 | Exiting with the Meta button returns cleanly to the page, and the canvas size and resolution are restored. | Real lifecycle. |
| H8 | Music and sound effects are audible in VR. | Gesture and audio policy on the device. |
| H9 | Memory over a 10-minute session (no tab reload). | Texture memory is the main risk identified by the audit. |

No claim of Quest 2 compatibility is made until these are checked on the headset.
