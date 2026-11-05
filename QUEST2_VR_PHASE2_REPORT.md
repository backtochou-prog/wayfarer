# WAYFARER: Meta Quest 2 VR, Phase 2 report (controllers, HUD, playable gameplay)

Status: **implemented and tested with an emulated WebXR device in headless Chromium. NOT verified on a physical Meta Quest 2.** Nothing committed or deployed.
Phase 3 work was started afterwards in the same working tree. The Phase 2 regression results below were measured on a **frozen copy of the Phase 2 tree**, taken before any Phase 3 change.

---

## 1. Files created and modified (Phase 2 only)

### Created
| File | Lines | Purpose |
|---|---|---|
| `src3d/xr_input.js` | 140 | `XRInput`: Quest Touch controllers: discovery by hand, gamepad polling, dead zones and hysteresis, press/release edges, mapping to existing `Game` actions, menu ray press/release, haptics on game events. |
| `src3d/xr_hud.js` | 68 | `XRHud`: the existing 320x180 `#screen` canvas as a `CanvasTexture` on a world-space panel (menu and run layouts), the controller beam and pointer dot, the EXIT VR plate, ray → 320x180 coordinates. |
| `QUEST2_VR_PHASE2_REPORT.md` | — | This report. |

### Modified
| File | Change | Effect outside VR |
|---|---|---|
| `src/game.js` | The click logic of the anonymous `pointerup` handler moved into **`Game.pressAt(x, y)`** (the same three checks in the same order; the handler calls it); `emit()` also calls an optional `onEmit` listener. | Identical. Clicks and taps go through the same code (`ui` and `controls` tests pass). |
| `src/render.js` | One flag, **`g.vr`** (set only during a VR session): `drawUI` leaves out what covers the whole screen (the game-over flash, the portal wash, the cutscene letterbox and black fade), the screen-space scooter disc, and the keyboard/touch hints. | `g.vr` is undefined on desktop, mobile and `2d.html`, so nothing changes. |
| `src3d/xr3d.js` | Creates `XRInput` / `XRHud` at session start; a `preFrame` step (active rig, controllers and HUD on it, ray, input poll, tracking-loss check); `interrupt()` for a hidden session, lost tracking or a removed controller; cleanup on end. | Not loaded on `2d.html`; inert without a session. |
| `index.html` | `+2` script tags (`xr_input.js`, `xr_hud.js`). | None. |
| `tests/qa3d_xr.js` | Fake controllers (an xr-standard gamepad, a target-ray pose, a haptic actuator) + **11 new checks**. | — |

**Not modified**: all art and assets, `2d.html`, `world.js`, `track.js`, `biomes.js`, `race.js`, `perks.js`, `audio.js`, the environments, three.js. No dependency was installed.

---

## 2. Controller mapping (configurable: `XRInput.MAP`)

| Quest input | Run (`play`) | Race | Title | Pause | Game over |
|---|---|---|---|---|---|
| Thumbstick X, either hand (`steer: 'either'`, or `'left'`/`'right'`) | steer, held (`Game.hold('xr-L'/'xr-R', 'left'/'right')`, the touch channel) | **one lane per flick** (`laneQ ±1`) | — | — | — |
| Right trigger | jump | — | **select** (ray) | select | select |
| Left trigger | — | — | select | select | select |
| A / X | jump | — | PLAY (confirm) | RESUME | RUN AGAIN |
| B / Y | slide | — | CHARACTER | — | — |
| Grip (either) | scooter on/off (`mount` / `dismount`) | — | — | — | — |
| Thumbstick press (either) | pause | — | — | resume | — |
| Ray hover | — | — | buttons light (`Game.mouse`) | same | same |

- **Dead zone and hysteresis**: steering starts past 0.35 and stops under 0.25. A race flick fires past 0.6 and re-arms under 0.3, so holding the stick gives exactly one lane.
- **Edges only**: every button acts on the frame it goes down (menu select: press shows the button pressed, release over the same target activates). Holding a button never repeats it.
- **No conflicts**: each input has one meaning per state. The trigger is jump in a run and select in menus, never both.
- **The Meta and menu buttons** belong to the Quest system, so pause is on the thumbstick press.
- **Nothing duplicated**: jump and slide go through `Game.hold(id, 'jump'|'slide', true)` (which applies the "only in a run, once" rule), steering through `hold()` / `syncTouch()`, race lanes through `laneQ`, the scooter through `mount()` / `dismount()` (the E key's calls), menus through `Game.pressAt()` (the click code).
- **Nothing stuck**: controller holds are released on pause, on a controller disconnect, on a hidden session, after 250 ms of lost tracking, and at session end. The game's own `releaseTouch()` (blur, cutscene, race start) also clears them, because they live in the touch channel.

---

## 3. HUD implementation

- **Source**: the original `#screen` canvas that `Renderer.drawUI` paints each frame. It is uploaded as a `CanvasTexture` with nearest filtering, so the pixel art stays crisp. The artwork, typography, colours and button states are the original ones. Buttons light under the ray because the ray sets `Game.mouse`, exactly like a mouse.
- **Menu layout** (title, pause, game over): a 2.4 m panel 2.2 m ahead at eye height, held by the rig (it follows the run, not the head). The controller beam and pointer dot are in the game's amber. Under the panel is an **EXIT VR** plate, drawn with the game's own pixel font (`drawText`) and palette (`C`); it lights when aimed at and ends the session.
- **Run layout** (run, race, cutscene): a larger, lower panel tilted toward the eyes, with no ray. It shows score, coins, banners, missions and the race HUD.
- The panel, beam, dot and controllers ride the rig of the scene being drawn (the main scene's or the race's).
- The texture is uploaded once per frame, only while a panel is shown.

## 4. Gameplay functionality implemented

Covered by the tests in the emulator: enter VR → PLAY (ray or A) → steer → jump → slide → scooter on/off → pause/resume (stick press, or RESUME by the ray) → race (lane flicks) → game over → RUN AGAIN → EXIT VR (plate) → re-enter.
Coins and power-ups need no input; they work as before, because the rules are untouched.

---

## 5. Tests and results

### `tests/qa3d_xr.js`: 25/25 (Phase 1's 14 + 11 new)
New checks:
1. Controller discovery: both hands found, tracked, riding the active rig.
2. HUD on the 2.4 m panel; the ray gives the 320x180 point and lights PLAY; the trigger press shows it pressed; the release starts the game **once**.
3. Steering: the dead zone, steer at 0.35, hysteresis down to 0.25, release; either stick.
4. Jump (right trigger and X), slide (B), scooter (grip): one action per press however long it is held; nothing left held.
5. Pause by stick press releases the steering; RESUME by the ray; stick press toggles.
6. **Race**: one lane per flick on `laneQ`; a held stick does not repeat; re-armed under 0.3; no continuous steering; the HUD and controllers follow into the race scene and back.
7. Game over → RUN AGAIN with A, once; a crash pulses both controllers.
8. Interruptions: a controller removed mid-steer leaves nothing held and reconnects; a hidden session and lost tracking pause with nothing held.
9. EXIT VR from inside (the plate) ends the session and restores the desktop game (the window loop, no VR flag, nothing held, the panel gone).
10. Re-entering VR: the controllers are found again and PLAY works.
11. No page errors.

An emulated-frame screenshot was also checked by eye: the menu panel shows the original title art, the beam reaches PLAY, the EXIT VR plate sits under the panel. The in-run HUD looked too small in that render, so its starting size was enlarged (to be tuned on the headset).

### Regression (frozen copy of the Phase 2 tree, all 22 suites)
| Suite | Result | Note |
|---|---|---|
| race_sim | all passed | |
| xr | 25/25 | |
| controls / ui / perf | 7/7, 12/12, 5/5 | keyboard, touch, menus, emulated phone |
| world / race / vic / quay / portal / dest / town / coastzone | 43/43, 13/13, 19/19, 17/17, 21/21, 18/18, 34/34, 10/10 | |
| perks / coins / utrecht / gare / vortex | 29/29, 10/10, 12/12, 17/17, 13/13 | |
| audio | 31/32 then **32/32 on re-run** | the failing check is a real-time music test in slow software GL: same code, passes on re-run, so a timing flake, not a regression |
| scooter / avatar / zagla | 18/19, 9/10, 17/18 | **pre-existing**: identical failures on the original code at `ccc0273` (outdated thresholds; see the Phase 1 report) |

No failure was introduced by Phase 2.

## 6. Known limitations

- The **scooter indicator disc** is a screen-space overlay placed for the desktop camera, so it is hidden in VR. Mounting with the grip works where a vehicle is offered (the same rule as E), but nothing in VR shows the offer. A world-space marker is new visual work, left for a later phase.
- **No VR control hints** on the title screen. The keyboard/touch hints are hidden in VR, and none were added (Q3 of the plan, still open).
- **The cutscene and portal fades** were not shown in VR in Phase 2 (added in Phase 3).
- **HUD and camera values** are starting values, not tuned on a headset.
- Two small Phase 2 defects were found during Phase 3 and fixed there: the head-height reading after a re-entry (`rig.children[0]`), and the tracking-loss timer counting the clamped game dt instead of real time (fixed during Phase 2 testing).

## 7. Testing on the Quest 2

As in the Phase 1 report: USB + `adb reverse tcp:8000 tcp:8000` + `python3 -m http.server 8000`, then `http://localhost:8000/` in Quest Browser. Or a Vercel preview, if you authorise one.
In the headset: ENTER VR → aim at PLAY, pull the trigger → steer with a thumbstick, jump with the right trigger or A, slide with B, grip at a parked scooter, click a thumbstick to pause → EXIT VR from the plate under the pause menu.

## 8. Remaining issues requiring the headset
- Does Quest Browser expose the xr-standard gamepad buttons as expected (indices 0/1/3/4/5)?
- Haptic strength feel.
- Readability of the run HUD and menu panel.
- Comfort of steering with the stick at the game's speeds.
- The real frame rate.
