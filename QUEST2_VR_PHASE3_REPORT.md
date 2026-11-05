# WAYFARER: Meta Quest 2 VR, Phase 3 report (comfort, haptics, performance, polish)

Status: **implemented and tested with an emulated WebXR device in headless Chromium (SwiftShader software GL). NOT verified on a physical Meta Quest 2: no headset was available.** Nothing committed or deployed.
Every "measured" number below comes from that emulated setup. Section 3 says which of them carry over to a Quest 2 and which do not.

---

## 1. All changes

### New file
| File | Lines | Purpose |
|---|---|---|
| `src3d/xr_comfort.js` | 62 | `XRComfort`: the **vignette** and the **fade to black**, two quads held in front of the eyes (children of the head-tracked camera), drawn last without depth. |

### Changed (Phase 3)
| File | Change |
|---|---|
| `src3d/xr3d.js` | **Recentring** for seated play (automatic when tracking starts, and on demand); the headset pose is read **exactly from the XR frame** (position and orientation) for the eye height and recentring; a **cut behind black** whenever the view changes scene (main ↔ race), with the new rig snapping into place; the **title screen view is still** (it used to follow the desktop menu's orbiting camera, which is forced motion in VR: a Phase 1/2 bug found here); **frame statistics** (`?xrStats=1` logs fps, JS time, draw calls, textures every 5 s on the remote console); `XRComfort` wired in; the window resize after exit is deferred until three has finished ending the session (it removed a warning). |
| `src3d/xr_input.js` | **Haptics extended and configurable** (an event table; global on/off and a strength factor; the `vibrationActuator` fallback; silently nothing without haptic hardware); **race events** read from the race state (a bump into the robot's car, win, lose); a **hover tick** when the ray moves onto a button; **recentring** by holding both grips for 0.8 s in a menu; timers in real time. |
| `src3d/xr_hud.js` | The **controller ray is a tapered beam** (3 mm at the hand) instead of a 1-pixel line, which flickers and nearly vanishes in a headset; hovered-button detection for the tick. |
| `index.html` | `+1` script (`xr_comfort.js`). |
| `tests/qa3d_xr.js` | A fake headset pose that can be offset and turned; **7 new checks** (32 in all). |

### Bugs found and fixed in this phase
1. **Head height after re-entering VR** was read from `rig.children[0]`. After an exit, the controllers stay in the rig, so the first child could be a controller (1.3 m) instead of the camera. The rig now keeps a reference to its camera, and the height comes from the XR pose itself.
2. **Title screen in VR followed the desktop orbit camera** (sideways drift and turning while the menu is open). The title view is now fixed behind the runner.
3. **Recentring and grip-hold timers counted the game's clamped dt** (so 1.3 s of real holding counted as 0.25 s on a slow frame rate). They now use real time.
4. Recentring first read the camera's local pose, which lags one frame while the rig moves (about 3 cm error). It now reads the XR frame's pose.

---

## 2. Comfort features (all configurable)

| Feature | Behaviour | Setting (default) |
|---|---|---|
| **Peripheral vignette** | A soft dark ring at the edge of the view. It closes in at high speed (the top 40 % of the run's speed range, a dash, a race boost) and on fast rig turns (above 0.12 rad/s), and opens again when calm. The centre is never touched. | `XRComfort.cfg.vignette` 0.5 (0 = off), `?xrVig=0..1` |
| **Fade to black** | Driven by the game's own fade values: the Gare du Midi cutscene (`g.scene.fade`, `g.fadeIn`), the flash of a portal door (to 70 % black), the end of a race (`g.fadeIn`). | `fades` true, `?xrFade=0` |
| **Cut between scenes** | Entering or leaving the race: 0.35 s of black and the new rig snaps into place, so the view never sweeps. | `cutTime` 0.35 |
| **Camera follow** | The rig follows sideways smoothed (0.12 s) at 60 % of the chase camera's move; the turn is smoothed (0.6 s) and clamped to ±25°; z follows exactly (the road is fast). | `XR3D.cfg` |
| **Stable horizon** | The rig turns about the vertical only: pitch and roll are always 0 (checked by the tests in the main scene and the race). | — |
| **No shake** | The desktop screen shake is skipped in VR; a haptic pulse replaces it. | — |
| **No forced movement** | The title view is still; the cutscene's side camera is not applied (fades instead); the dash FOV and race speed-FOV are skipped. | — |
| **HUD placement** | Menus on a 2.4 m panel 2.2 m ahead at eye height; the in-run HUD on a 1.8 m panel 1.7 m ahead, 0.3 m below the eyes, tilted toward them. Both are held by the rig, never head-locked. | `XRHud.cfg` |
| **Seated play** | The eyes are put 2.2 m above the road whatever the player's real height. **Recentring** removes the player's position and heading in the room: automatically when tracking starts, or by holding both grips 0.8 s in the title or pause menu. | `autoCentre` true, `MAP.centreHold` 0.8 s |

## 3. Haptic implementation

Brief pulses, never needed to play, on the game's own events. Strength 0–1 and duration in ms, configurable in `XRInput.HAPTIC`.

| Event | Pulse |
|---|---|
| Coin (and race spirals and rare tokens) | 0.10 / 14 ms |
| Shard, waymark | 0.15 / 18, 0.18 / 24 |
| Jump, landing | 0.15 / 18, 0.12 / 16 |
| Crash (the run ends) | 0.9 / 140 |
| Aura absorbs a hit | 0.6 / 80 |
| Power-up starts, mission completed | 0.45 / 60, 0.4 / 70 |
| Scooter on / off | 0.35 / 40, 0.25 / 30 |
| Race: bump into the robot's car, win, lose | 0.6 / 80, 0.55 / 180, 0.35 / 120 |
| Menu: hover onto a button, press | 0.05 / 8, 0.35 / 35 |
| Recentred | 0.4 / 60 |

- Global switch: `XRInput.MAP.haptics` (`?xrHaptics=0`). Strength factor: `hapticScale`.
- It uses `gamepad.hapticActuators[0].pulse()`, falls back to `gamepad.vibrationActuator.playEffect('dual-rumble')`, and **does nothing, without errors,** when neither exists (tested).

---

## 4. Performance measurements

**Setup**: headless Chromium 1248, SwiftShader (CPU software rendering), emulated WebXR device (800x450 framebuffer, two views). **GPU timings from this setup say nothing about the Quest 2's GPU.** Counts (draw calls, triangles, textures, memory) do carry over, because they come from the scene, not from the hardware.

### Draw calls and triangles per frame (one frame, both eyes in VR)
| Zone | Desktop calls | VR calls | Desktop triangles | VR triangles |
|---|---|---|---|---|
| Neon quarter (start) | 442 | **905** | 63 k | 124 k |
| Coast | 197 | 381 | 63 k | 119 k |
| Utrecht (arrival cutscene) | 126 | 320 | 34 k | 105 k |
| Race | 111 | 224 | 38 k | 76 k |

- **Stereo doubles draw calls**, as expected: three r186's WebXR path renders the scene once per eye. **Multiview (`OVR_multiview2`) is not in three r186's core** (checked in the bundled library), so it cannot be switched on without changing the rendering engine. That was not authorised, and it is not done.
- **The neon quarter is the heaviest zone: about 900 draw calls per VR frame.** On a Quest 2 this is the most likely place for the frame rate to drop below 72 fps (CPU submission cost in the browser). This is an estimate from the count; it is not measured on the device.
- Triangles (≤ 124 k per frame) are modest for the Quest 2's GPU.

### Textures
- 44 textures in the two scenes, about **89 MB uncompressed** (including mipmaps; estimated from the image sizes). The largest are a few pictures of about 1024 x 2000 (10 MB each). No compressed GPU formats.
- Acceptable for a Quest 2 browser tab at this size, but it is the largest memory item. Converting to KTX2/Basis would reduce it; that touches the asset pipeline and is left for your approval.

### HUD texture upload
- 1.03 uploads per frame, **0.11 ms per frame**. JS frame time with the upload 9.3 ms, without 8.1 ms: within the noise of software GL. **No optimisation needed.**

### Scene traversal
- The existing hidden-group skip (`cullHidden`) is unchanged and active in VR (the rig, controllers and HUD are visible children; nothing else was added to the walk).

### Memory over a long session (emulated VR, 3 minutes of play with 6 restarts)
| t (s) | 0 | 31 | 61 | 91 | 121 | 151 | 181 |
|---|---|---|---|---|---|---|---|
| JS heap (MB, after GC) | 78.7 | 79.0 | 79.1 | 79.3 | 79.3 | 79.3 | 79.4 |
| GPU geometries | 743 | 743 | 743 | 743 | 743 | 743 | 743 |
| GPU textures | 43 | 43 | 43 | 43 | 43 | 43 | 43 |

**No progressive growth**: +0.7 MB of heap in 3 minutes (within noise), and the geometry and texture counts are constant.

### CPU frame time
JS time per frame was 7 to 24 ms in this setup, but that includes software GL work done on the CPU, so it does not predict the Quest. `?xrStats=1` reports the real figure on the headset.

### Optimisations made
None to the rendering: nothing measured here justified one, and the counts above can only be judged on the device. The HUD upload was measured and found negligible.

**Recommended next step (measure first)**: on the Quest, open `?xrStats=1` in the neon quarter. If it is under 72 fps, the levers in order are: framebuffer scale 0.9 → 0.8 (`?xrScale=0.8`), foveation 1 (already the maximum in three's 0–1 range), then a VR-only shorter draw distance in that zone (a proposal: it shows less far scenery and would need your approval).

---

## 5. Test results

### `tests/qa3d_xr.js`: **32/32** (Phase 1: 14, Phase 2: 11, Phase 3: 7)
Phase 3 checks:
1. The vignette and fade ride the head-tracked camera. The vignette is faint (< 0.1) when calm, clearly stronger at top speed, and off at strength 0.
2. The game's fades and a portal flash (70 %) darken the view in VR. Entering the race is a cut behind black with the rig snapped; both cameras carry the comfort layer; the horizon is level.
3. Haptics: a power-up pulses both hands; a coin is faint (0.1); strength 0 or haptics off give no pulse; a controller without haptics is ignored without error; `vibrationActuator` is used where it exists; the race pulses on a bump.
4. The ray is a beam; moving it onto a button gives exactly one hover tick.
5. **Seated recentring**: a player 0.5 m aside and turned 90° away holds both grips → looking down the road, eyes 2.2 m over it, 4.5 m behind the runner.
6. Re-entry: the rig knows its camera (it is no longer the first child) and the eye height is the headset's 1.6 m; frame statistics are kept.
7. No page errors.

This test also caught a defect in an art change made during this phase at your request (the robot's triangle plate, see section 8): NaN vertices at the plate's corners. That was fixed before this result.

### Full regression battery (working tree, Phase 3, all 22 suites)
| Suite | Result | Note |
|---|---|---|
| race_sim | all passed | |
| xr | **32/32** | |
| controls / ui / perf | 7/7, 12/12, 5/5 | keyboard, touch, menus, emulated phone: desktop and mobile intact |
| world / vic / quay / portal / dest / town / coastzone | 43/43, 19/19, 17/17, 21/21, 18/18, 34/34, 10/10 | |
| race | 13/13 | **re-run after the neon was added** to the robot's back (the battery's first race run came before it) |
| perks / coins / utrecht / audio / gare | 29/29, 10/10, 12/12, 32/32, 17/17 | |
| vortex | 12/13, then **13/13 on re-run** | a timing check in slow software GL: same code passes on re-run, a flake |
| scooter / avatar / zagla | 18/19, 9/10, 17/18 | **pre-existing**: identical failures on the original code at `ccc0273` |

No failure was introduced by Phase 3.

### Physical Quest 2 testing
**Not performed: no device was available.** Nothing in this report claims Quest 2 compatibility.

---

## 6. Remaining limitations
- **Multiview** is not available in three r186's core, so stereo costs double draw calls.
- The **neon quarter**'s ~900 VR draw calls are a frame-rate risk on the Quest 2 (unmeasured on the device).
- The **scooter offer** is not shown in VR (the screen-space disc is hidden; a world-space marker is new visual work).
- **No VR control hints** on the title (plan question Q3).
- **Textures** are uncompressed (~89 MB).
- **Comfort, haptic strengths and HUD readability** are starting values; only the headset can tune them.

## 7. Physical headset verification status
| Item | Status |
|---|---|
| Quest Browser WebXR support, immersive session start | **not verified** (emulated only) |
| Controller tracking and the xr-standard button layout | **not verified** |
| Head tracking, correct stereo | **not verified** |
| Audio playback in VR | **not verified** |
| Session interruption, recovery, exit and re-entry | **emulated only** (tested with the fake device) |
| Frame rate 72 / 90 fps | **not verified** (counts measured; device timing not) |
| Desktop and mobile after the VR changes | **verified in emulation** (the regression battery, emulated phone in `perf`) |

## 8. Also in the working tree (not VR): the robot car, at your request during this phase
- The **pink** was removed from the triangle of the robot's head-on picture (outline and centre), from the larger V around it, from the arcs over both "eyes", and from low down beside the triangle on both sides (`untint_triangle` in `tools/make_race_assets.py`, applied to `botPod` in `src3d/race_assets.js`).
- A **matte black plate, domed about 4 cm**, now sits on the triangle of the stern (`race3d.js`).
- **The user's neon drawing, named `brack3` by the user** (`RACE_ASSETS.brack3`, built by `tools/make_race_assets.py`), is projected onto the stern dome over the picture and drawn additively. Its triangle is the plate's. It is **dim at rest (0.35)** and **lights up strongly (1.7) while the robot brakes** (its pace dropping faster than 1 m/s², on in 0.08 s, off in 0.35 s; `XRaceNeon` in `race3d.js`).
- The renders in `docs/race/robot/` are redone (`robot-back-brake.png`: the neon while braking).

## 9. Recommended final configuration (starting point for the headset)
```
XR3D.cfg:      eyeY 2.2, back 4.5, raceBack 6.5, latFollow 0.6, posLag 0.12, yawLag 0.6, yawClamp 25,
               seatedCompensate true, autoCentre true, scale 0.9, foveation 1
XRComfort.cfg: vignette 0.5, fades true, portalFade 0.7, cutTime 0.35
XRHud.cfg:     menu 2.4 m at 2.2 m; run 1.8 m at 1.7 m, 0.3 m below the eyes, tilt -0.2 rad
XRInput.MAP:   steer 'either', dead zone 0.35 / 0.25, flick 0.6 / 0.3, haptics on, hapticScale 1
URL tuning:    ?xrY= ?xrBack= ?xrLat= ?xrScale= ?xrFov= ?xrVig= ?xrFade=0 ?xrHaptics=0 ?xrStats=1
```
