// Renderer3D: draws the game state (World + Game from the 2D build) as a low-poly 3D scene.
//
// Frame of reference: the runner always stands at scene z = 0 and runs toward -Z; the road, props and items are
// re-laid around it every frame, so coordinates never grow. Gameplay units convert with U3 (kit.js). Lateral positions are
// absolute track coordinates (x + curve offset) in metres minus the camera reference Lref (the 2D game's smoothed camera
// centre), so every road of a fork exists side by side in the scene and the runner is simply somewhere on one of them.
//
// Pieces: Road3D (ribbon road, curbs, sidewalks, verges for up to two roads), pooled scenery per road side chosen by the
// biome blend at that spot (gradual city <-> forest), Items3D (coins/hazards), Runner3D, sky dome / sun / fog / lights that
// blend between biomes with the same value the 2D game uses (g.bgTo / g.bgT).
class Renderer3D {
  constructor(uiCanvas, envs) {
    this.envs = envs; this.baseId = TRACK.base || TRACK.segments[TRACK.sequence[0].seg].biome;
    const base = envs[this.baseId];
    this.ui = new Renderer(uiCanvas);                     // the pixel-art HUD / menus / touch controls, drawn on a transparent overlay
    this.uiCtx = uiCanvas.getContext('2d');
    this.ui.menu3d = true;
    BTN.title.label = 'PLAY';                              // the 3D menu's main button says PLAY (the classic 2D page keeps START)
    if (typeof UI_ASSETS !== 'undefined') { this.ui.titleImg = new Image(); this.ui.titleImg.src = UI_ASSETS.titlePanel; this.ui.controlsImg = new Image(); this.ui.controlsImg.src = UI_ASSETS.controlsPanel; this.ui.startImg = new Image(); this.ui.startImg.src = UI_ASSETS.startButton; }   // the user's menu-panel artwork

    const gl = this.gl = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // keeps fill-rate modest on high-DPI phones
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400);
    this.scene.fog = new THREE.Fog(base.fog.color, base.fog.near, base.fog.far);
    this.scene.background = new THREE.Color(base.fog.color);

    // lights: warm hemisphere fill + one low sun, no shadow maps. Colours/intensities are re-blended per biome (applyAtmosphere).
    this.hemi = new THREE.HemisphereLight(base.hemi.sky, base.hemi.ground, base.hemi.intensity); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(base.sun.color, base.sun.intensity); this.sun.position.set(...base.sun.position); this.scene.add(this.sun);

    // sky dome (vertex-coloured gradient, ignores fog) + sun disc, both re-centred on the camera each frame
    const dome = new THREE.SphereGeometry(300, 16, 10), pos = dome.attributes.position;
    this.domeH = new Float32Array(pos.count); for (let i = 0; i < pos.count; i++) this.domeH[i] = Math.max(0, pos.getY(i) / 300);
    dome.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.sky = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -2; this.scene.add(this.sky);
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: base.sunDisc.color, fog: false, depthWrite: false }));
    this.sunDisc.scale.setScalar(250 * Math.tan(base.sunDisc.size * Math.PI / 360)); this.sunDisc.renderOrder = -1; this.scene.add(this.sunDisc);
    // soft halo around the sun (additive radial gradient), only strong in zones that ask for it (`sunGlow`); sunOff = where the sun sits relative to the camera at 250 m (per biome, blended)
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d'), gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,214,140,0.95)'); gr.addColorStop(0.18, 'rgba(255,170,90,0.55)'); gr.addColorStop(0.5, 'rgba(255,120,60,0.16)'); gr.addColorStop(1, 'rgba(255,100,50,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
    this.sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
    this.sunGlow.renderOrder = -1; this.sunGlow.visible = false; this.scene.add(this.sunGlow); this.sunOff = { x: -70, y: 28, glow: 0, size: base.sunDisc.size };
    this.groundMat = new THREE.MeshLambertMaterial({ color: base.groundFar });                                  // (its colour is blended per biome in applyAtmosphere)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), this.groundMat);
    // two halves of the far ground: behind the runner it stays flat; ahead it hangs from a pivot at the runner and tips down with the street's slope (see World.dropAt), so a descent never buries the road
    ground.geometry = new THREE.PlaneGeometry(900, 450); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -225);
    this.groundPivot = new THREE.Group(); this.groundPivot.position.y = -0.03; this.groundPivot.add(ground); this.scene.add(this.groundPivot);
    const groundBack = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), this.groundMat); groundBack.rotation.x = -Math.PI / 2; groundBack.position.set(0, -0.03, 225); this.scene.add(groundBack);
    // the sea seen from under it (the aquarium tunnel dives below the level of the sea): its surface, a bright translucent ceiling that stays at the sea's own height while the road goes down (see draw)
    { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = '#2fb0d2'; c.fillRect(0, 0, 256, 256); c.lineCap = 'round';        // the light of the surface: wavy bright lines in two directions (whole periods: the picture tiles)
      for (let pass = 0; pass < 2; pass++) for (let k = 0; k < 7; k++) { c.strokeStyle = 'rgba(214,255,255,' + (0.35 + 0.1 * (k % 3)) + ')'; c.lineWidth = 2 + (k % 3); c.beginPath(); const base = 18 + k * 36, A = 7 + (k % 4) * 3, ph = k * 1.9 + pass, f = 1 + (k % 3);
        for (let t = 0; t <= 256; t += 4) { const o = base + A * Math.sin(t / 256 * Math.PI * 2 * f + ph); if (pass) { t ? c.lineTo(o, t) : c.moveTo(o, t); } else { t ? c.lineTo(t, o) : c.moveTo(t, o); } } c.stroke(); }
      const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(24, 24); this.seaTex = tex;
      // the plane runs from mouth to mouth (the length of the tunnel) in 90 rows; its alpha follows the DEPTH of the road under it (0 down to 2 m, 1 from 5 m: smooth), so the entrance and its surroundings stay DRY and the water comes in gradually
      const tb = TRACK.forks.gateIslandSunset.tube, ROWS = 90, geo = new THREE.PlaneGeometry(700, tb.len * U3.Z, 1, ROWS), n = geo.attributes.position.count, rgba = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) { const row = Math.floor(k / 2), d = World.dipAt(tb, row * tb.len / ROWS) * 0.1, v = Math.max(0, Math.min(1, (d - 2) / 3)); rgba.set([1, 1, 1, v * v * (3 - 2 * v)], k * 4); }
      geo.setAttribute('color', new THREE.BufferAttribute(rgba, 4));
      this.seaTop = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, fog: false })); }
    this.seaTop.rotation.x = Math.PI / 2; this.seaTop.position.set(0, 20, -150); this.seaTop.visible = false; this.scene.add(this.seaTop);
    this._c = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];   // scratch colours for blending
    this.atmoTo = ''; this.atmoQ = -1; this.atmoKey = ''; this.applyAtmosphere(this.baseId, 0);

    this.road = new Road3D(this.scene, envs, this.baseId);

    // scenery: one shared geometry per prop name (first biome that defines it wins), a bounded pool per name
    const CAP = { lamp: 100, tree: 120, bench: 50, planter: 130, bush: 60, stall: 40, stallB: 40, pine: 110, pineTall: 90, oak: 90, birch: 70, fbush: 80, rock: 60, log: 40, fence: 60, gore: 4,
                  wall: 70, cafe: 40, bollard: 40, barrel: 40, boulder: 30, stump: 30, flowers: 40,                       // street furniture and roadside details
                  fountain: 6, clockTower: 6, statue: 6, cabin: 6, giantOak: 8, standingStones: 6, marketHall: 6, bigTent: 6,   // landmarks: at most one per stretch and side
                  gateCity: 8, gateWood: 8, gateMarket: 8, gateNeon: 8,                                                    // entrance markers where the biome changes
                  neonTowerA: 24, neonTowerB: 24, neonBlockA: 24, neonBlockB: 24, neonBlockC: 24, neonShopA: 24, neonShopB: 24, neonLampM: 60, neonLampC: 60,   // the neon quarter
                  stripM: 80, stripG: 80, stripR: 80, neonSignA: 40, neonSignB: 40, neonBollard: 40, neonRing: 6, neonSpire: 6, neonBillboard: 6,
                  neonBlockD: 24, neonBlockE: 24, neonShopC: 24, neonBlade: 80, neonBanner: 40, neonBucket: 80, neonBottle: 60, neonHalo: 6,      // props made of the user's materials
                  neonSwirlR: 24, neonSwirlP: 24, neonSwirlG: 24, neonSwirlT: 24, neonStreetBlock: 24, neonDotsBlock: 24, neonRaysTower: 28, neonSwirlSign: 40, neonCapSign: 40, neonDotScreen: 28, neonLinesBanner: 40,
                  neonShopD: 24, neonCar: 40, neonBoardVortex: 6, neonBoardSphere: 6, neonBoardRings: 6, neonBoardSpiral: 6,
                  rowA: 26, rowB: 26, rowC: 26, rowD: 26, rowE: 26, rowF: 26, rowG: 26, rowH: 26, pole: 24, wire: 36, swan: 40, blossom: 76, cobbles: 44, carA: 20, carB: 20, carC: 20, van: 20,   // the tram street
                  polyclinique: 6, tramStop: 6, cornerCafe: 6, gateTram: 8, school: 6, glassTower: 6,
                  rowI: 26, rowJ: 26, rowK: 26, rowL: 26, lantern: 40, posts: 40, streetSign: 24, hedge: 30, tent: 24, scooter: 40, steps: 24, zebra: 8, scooterDock: 10, board: 40, boardDock: 12, neonHover: 40, neonHoverDock: 14, neonShopF: 24, neonShopG: 24, neonShopH: 24, neonShopI: 24,
                  neonWire: 40, neonPole: 24, neonPuddle: 30,                                                   // the neon district's cables, poles and wet road
                  seaStrip: 36, cottageA: 24, cottageB: 24, cottageC: 24, cottageD: 24, seaFence: 70, tuft: 80, tuftBig: 50, driftwood: 30, dune: 30, cliff: 24, boat: 24, buoy: 40, crates: 30, lampSea: 40, lighthouse: 6, pier: 6, gateCoast: 8,   // the sunset coast
                  wallLow: 40, wallHigh: 40, wallLowB: 40, column: 60, columnLow: 60, columnTall: 20, archHalf: 24, lantern: 50, blocks: 40, ivy: 50, patchA: 40, patchB: 40, ruinTemple: 6, obelisk: 6, gateRuins: 8,   // the mossy ruins
                  garePlat: 20, stationFlankA: 12, stationFlankB: 12, platLamp: 20, gareHall: 3, tourMidi: 3,                  // the Gare du Midi
                  coastClub: 6, coastDelphi: 6, portalGate: 14, coastCanal: 18, aquaRib: 18, aquaJelly: 18, aquaTurtle: 14, aquaWhale: 4, aquaShoal0: 28, aquaShoal1: 28, aquaShoal2: 28, aquaRay: 6, aquaKelp: 28, aquaCoral: 22, aquaBubbles: 22, coastTower0: 16, coastTower1: 16, coastTower2: 16, coastTower3: 16, coastRound: 6, coastFruit: 6, coastCafe: 6, coastPool: 6, coastCove: 6, coastParasolI0: 4, coastParasolI1: 4, coastParasolI2: 4, coastParasolI3: 4, coastParasolI4: 4, coastParasolI5: 4, coastParasolI6: 4, coastParasolI7: 4, coastParasolI8: 4, coastPad: 4, coastParasol: 6, coastBike: 18, coastPark: 6, coastCourt: 4, coastPlay: 4,
                  utQuayA: 30, utQuayB: 30, utQuayC: 30, utRowA: 16, utRowB: 16, utRowC: 16, utRowD: 16, utRowE: 16, utRowF: 16, utRowG: 16, utRowH: 16, utRowP1905: 10, utRowP1912: 10, utRowPChoor: 10, utRowPWhite: 10, utRowPShut: 10,   // Utrecht
                  utWetA: 14, utWetB: 14, utWetC: 14, utWetD: 14, utPlatane: 24, utPlataneB: 24, utBridge: 3, utDom: 3, utStationHall: 24, utPark: 24, utPlane: 30, utFootBridge: 4, utTunnel: 24,
                  neonHotel: 6, neonMoroccanLamp: 80, neonPendantLamp: 50, neonLanternPierced: 50, neonPillarLamp: 50, neonLightbox: 30 };                                                              // entrance markers where the biome changes
    this.props = {}; this.propUsed = {};
    for (const id of Object.keys(envs)) {
      const props = envs[id].props; if (!props) continue;
      for (const name of Object.keys(props)) {
        if (this.props[name]) continue;
        const m = props[name](), cap = /^house/.test(name) ? 26 : /^sign/.test(name) ? 4 : CAP[name] || 28, list = [];
        for (let i = 0; i < cap; i++) {
          // textured panels (trees: TreeSprite; the neon billboard and tower facades: NeonArt) are a `sprite` geometry with its own material, optionally beside ordinary merged geometry (`merged`)
          let g;
          if (m.sprite) { g = m.merged ? Kit.mesh(m.merged) : new THREE.Group(); g.add(new THREE.Mesh(m.sprite, m.material ? m.material() : TreeSprite.material())); } else g = Kit.mesh(m);
          for (const e of m.extra || []) g.add(new THREE.Mesh(e.sprite, e.material()));                                   // more textured panels (another atlas), e.g. a door on a building
          g.visible = false; this.scene.add(g); list.push(g);
        }
        this.props[name] = list; this.propUsed[name] = 0;
      }
    }
    if (typeof PortalArt !== 'undefined') {                // the doors of the passages between zones (Portal): one pooled plane per door, each with its own material (its opacity is set every frame)
      const list = []; for (let i = 0; i < CAP.portalGate; i++) { const g = new THREE.Group(), hole = new THREE.Mesh(PortalArt.hole(), PortalArt.holeMaterial()), pic = new THREE.Mesh(PortalArt.gate(), PortalArt.material()); pic.renderOrder = 1; hole.renderOrder = 2; g.add(pic, hole); g.visible = false; this.scene.add(g); list.push(g); }
      this.props.portalGate = list; this.propUsed.portalGate = 0;
    }
    // upload the art textures to the GPU as soon as their images have loaded, so the first frames that show them do not hitch (a big atlas upload is a one-off spike)
    // and warm up once: compile every material variant and draw one frame with every pooled prop visible, so geometries, textures and shaders are all on the GPU before
    // the first prop of each kind comes into view (otherwise that first sight costs a one-off hitch of hundreds of ms in a software renderer)
    let pending = 11 + (typeof UtrechtArt !== 'undefined' ? 3 : 0) + (typeof CoastArt !== 'undefined' ? 3 : 0) + (typeof PortalArt !== 'undefined' ? 1 : 0) + (typeof ParasolArt !== 'undefined' ? 1 : 0);
    const warm = () => { const hid = []; this.scene.traverse(o => { if (!o.visible && o.parent) { hid.push(o); o.visible = true; } });
      try { this.renderer.compile(this.scene, this.camera); this.renderer.render(this.scene, this.camera); this.renderer.clear(); } catch (e) {}   // drawn on screen (that is the program variant that must be ready) and cleared in the same task: a canvas is only shown after the next game frame
      for (const o of hid) o.visible = false; };
    for (const get of [() => TreeSprite.material(), () => NeonArt.material(), () => NeonArt.material2(), () => NeonArt.material3(), () => TramArt.material(), () => this.sunGlow.material, () => BlossomSprite.material(), () => BoardArt.material(), () => NeonShopArt.material(), () => NeonArt.material4(), () => (typeof FlowerArt !== 'undefined' ? FlowerArt.material() : TreeSprite.material())].concat(typeof UtrechtArt !== 'undefined' ? [() => UtrechtArt.material(), () => UtrechtArt.paveMaterial(), () => UtrechtArt.waterMaterial()] : []).concat(typeof CoastArt !== 'undefined' ? [() => CoastArt.material(), () => CoastArt.signMaterial(), () => CoastArt.delphiMaterial()] : []).concat(typeof PortalArt !== 'undefined' ? [() => ({ map: PortalArt.texture() })] : []).concat(typeof ParasolArt !== 'undefined' ? [() => ParasolArt.material()] : [])) {
      const tex = get().map, go = () => { tex.needsUpdate = true; try { this.renderer.initTexture(tex); } catch (e) {}   // (needsUpdate first: an image that was already decoded when checked has no upload version yet, and initTexture skips such a texture)
      if (--pending === 0) setTimeout(warm, 50); };
      if (!(tex.image instanceof HTMLImageElement) || (tex.image.complete && tex.image.naturalWidth)) go(); else tex.image.addEventListener('load', () => setTimeout(go, 0));   // (a canvas texture, the tram signs, is ready at once)
    }
    this.droppedBy = {}; this.dropped = 0;                 // props skipped because a pool was full (should stay 0)
    this.layouts = {}; for (const id of Object.keys(envs)) if (envs[id].layout) this.layouts[id] = new Map();   // per biome: slot -> cached placements
    this.slotCache = []; for (let i = 0; i < 20; i++) this.slotCache.push({ i: -1e9, ver: -1, mid: null, a: null, b: null });   // track bands per scenery slot (middle / start / end), reused until the track changes
    this.items = new Items3D(this.scene);
    this.fx = new Fx3D(this.scene);
    this.saucers = typeof Saucer3D !== 'undefined' ? new Saucer3D(this.scene) : null;                  // the flying saucers of the coastal town (one per landing pad in view)
    this.characters = {}; this.character = Renderer3D.savedCharacter(); this.runner = this.makeRunner(this.character);   // the playable characters: the strawberry (the user's retouched artwork by default; ?avatar=3d selects its 3D model) and Zagla (a 3D body)
    this.scene.add(this.runner.group); this.scene.add(this.runner.shadow);

    this.supportsScene = true;                                                      // Game plays the Gare du Midi cutscene only with a front end that sets this
    this.supportsPerks = true; this.supportsPortals = true; this.perk = new Perk3D(this.scene);                  // Game builds its power-ups, shards and missions (Perks) only with a front end that sets this; Perk3D draws their effects
    this.train = new Train3D(this.scene); this.crowd = new Crowd3D(this.scene); this.crowdT = 0; this.sceneK = 0; this.scCam = new THREE.Vector3(); this.scLook = new THREE.Vector3(); this.garePiece = null;
    this.spots = []; this.usedSpots = new Set(); this.armedSpot = null; this._v = new THREE.Vector3();         // parked scooters / stations seen this frame; the ones already taken
    this.menu = 1; this.lookX = 0; this.heading = 0;                         // menu blend (1 = menu camera, 0 = chase) and smoothed look-ahead
    this.cam = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = Math.max(2, innerWidth), h = Math.max(2, innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.5 ? 62 + (1.5 - w / h) * 26 : 62;       // keep all three lanes in view on narrow screens
    this.camera.updateProjectionMatrix();
  }

  // THE CHARACTERS: 'strawberry' and 'zagla'. The choice is made on the title screen (the button, or the C key), kept in localStorage, and ?avatar=zagla / ?avatar=strawberry forces one for a visit.
  static get CHARACTERS() { return ['strawberry', 'zagla']; }
  static savedCharacter() {
    const q = (location.search.match(/[?&]avatar=(zagla|strawberry)\b/) || [])[1]; if (q) return q;
    try { const v = localStorage.getItem('wayfarer.character'); if (v === 'zagla' && typeof RunnerZagla !== 'undefined') return v; } catch (e) {}
    return 'strawberry';
  }
  makeRunner(id) {
    if (!this.characters[id]) this.characters[id] = id === 'zagla' && typeof RunnerZagla !== 'undefined' ? new RunnerZagla() : /[?&]avatar=(3d|model)\b/.test(location.search) ? new Runner3D() : new RunnerSprite();
    return this.characters[id];
  }
  setCharacter(id) {
    if (id === this.character || !Renderer3D.CHARACTERS.includes(id)) return;
    const old = this.runner, nu = this.makeRunner(id);
    nu.group.position.copy(old.group.position); this.scene.remove(old.group); this.scene.remove(old.shadow); this.scene.add(nu.group); this.scene.add(nu.shadow);
    this.runner = nu; this.character = id; try { localStorage.setItem('wayfarer.character', id); } catch (e) {}
  }
  nextCharacter() { const L = Renderer3D.CHARACTERS; this.setCharacter(L[(L.indexOf(this.character) + 1) % L.length]); return this.character; }

  // sky, fog, background and light colours blended from the opening biome toward `toId` (quantised, so only ~16 repaints)
  applyAtmosphere(toId, t, fromId) {                       // (`fromId`: blend from that biome's look instead of the opening one, in 32 steps: the tunnel under the sea)
    const S = fromId ? 32 : 16, q = Math.round(t * S) / S, from = fromId || this.baseId;
    if (toId === this.atmoTo && q === this.atmoQ && from === this.atmoFrom) return;
    this.atmoTo = toId; this.atmoQ = q; this.atmoFrom = from; this.atmoKey = toId + q + from;
    const a = this.envs[from], b = this.envs[toId], [c0, c1, top, mid, hor] = this._c;
    const lerpTo = (out, x, y) => out.set(x).lerp(c1.set(y), q);
    lerpTo(this.scene.fog.color, a.fog.color, b.fog.color); this.scene.fog.near = a.fog.near + (b.fog.near - a.fog.near) * q; this.scene.fog.far = a.fog.far + (b.fog.far - a.fog.far) * q;
    this.scene.background.copy(this.scene.fog.color);
    lerpTo(this.hemi.color, a.hemi.sky, b.hemi.sky); lerpTo(this.hemi.groundColor, a.hemi.ground, b.hemi.ground); this.hemiBase = a.hemi.intensity + (b.hemi.intensity - a.hemi.intensity) * q; this.hemi.intensity = this.hemiBase;
    lerpTo(this.sun.color, a.sun.color, b.sun.color); this.sun.intensity = a.sun.intensity + (b.sun.intensity - a.sun.intensity) * q;
    lerpTo(this.sunDisc.material.color, a.sunDisc.color, b.sunDisc.color); lerpTo(this.groundMat.color, a.groundFar, b.groundFar);
    { const pa = a.sunPos || [-70, 28], pb = b.sunPos || [-70, 28], so = this.sunOff;
      so.x = pa[0] + (pb[0] - pa[0]) * q; so.y = pa[1] + (pb[1] - pa[1]) * q; so.glow = (a.sunGlow || 0) + ((b.sunGlow || 0) - (a.sunGlow || 0)) * q; so.size = a.sunDisc.size + (b.sunDisc.size - a.sunDisc.size) * q;
      this.sunDisc.scale.setScalar(250 * Math.tan(so.size * Math.PI / 360)); this.sunGlow.scale.setScalar(250 * Math.tan(so.size * Math.PI / 360) * 7); this.sunGlow.material.opacity = Math.min(1, so.glow); this.sunGlow.visible = so.glow > 0.02; }
    lerpTo(top, a.sky.top, b.sky.top); lerpTo(mid, a.sky.mid, b.sky.mid); lerpTo(hor, a.sky.horizon, b.sky.horizon);
    const col = this.sky.geometry.attributes.color, arr = col.array, H = this.domeH;
    for (let i = 0; i < H.length; i++) {
      const h = H[i];
      if (h < 0.35) c0.copy(hor).lerp(mid, h / 0.35); else c0.copy(mid).lerp(top, Math.min(1, (h - 0.35) / 0.65));
      arr[i * 3] = c0.r; arr[i * 3 + 1] = c0.g; arr[i * 3 + 2] = c0.b;
    }
    col.needsUpdate = true;
  }

  // absolute lateral centre (metres) of the road on `side` (0 = the single road) in a band list
  centreOf(bands, side) {
    let b = bands[0];
    if (bands.length > 1) for (let k = 0; k < bands.length; k++) if (bands[k].side === side) { b = bands[k]; break; }
    return ((b.lo + b.hi) / 2 + b.off) * U3.X;
  }

  layoutFor(envId, i) {
    const m = this.layouts[envId];
    let lay = m.get(i);
    if (!lay) { lay = this.envs[envId].layout(i, rnd); m.set(i, lay); }
    return lay;
  }

  // centre line of the route the player follows: the chosen road, or the shared axis before a fork has been chosen
  axisLat(w, z, Lref) {
    const bands = w.bandsAt(z);
    if (bands.length === 1) return ((bands[0].lo + bands[0].hi) / 2 + bands[0].off) * U3.X - Lref;
    for (const b of bands) if (b.chosen) return ((b.lo + b.hi) / 2 + b.off) * U3.X - Lref;
    return (((bands[0].lo + bands[1].hi) / 2) + (bands[0].off + bands[1].off) / 2) * U3.X - Lref;
  }

  // game events (called by Game): a collected coin pops, a crash throws debris, a restart clears the effects
  onCoin(g, it) { const band = g.world.bandNear(it.z, it.x); this.fx.coinPop((it.x + band.off) * U3.X, it.h * U3.Y, it.z * U3.Z, g.time); }
  onDie(g) { const p = g.p, pb = g.world.playerBand(p.z, p.x); this.fx.crash((p.x + pb.off) * U3.X, p.jy * U3.Y + 0.9, p.z * U3.Z + 0.4, g.time); }
  onPerk(g, ev) {                                                                   // an event of the perks layer (src/perks.js): the pickup / pop / near-miss / mission effects, placed in track coordinates
    const U = U3, p = g.p, pb = g.world.playerBand(p.z, p.x), lat = (p.x + pb.off) * U.X, y = p.jy * U.Y + 0.9, z = p.z * U.Z, t = g.time;
    if (ev.t === 'pickup') { const it = ev.it, band = g.world.bandNear(it.z, it.x); this.perk.pickup(ev.kind, (it.x + band.off) * U.X, it.h * U.Y, it.z * U.Z, t); }
    else if (ev.t === 'auraBreak') { this.perk.auraBreak(lat, y, z, t); const it = ev.it, band = g.world.bandNear(it.z, it.x); this.fx.crash((it.x + band.off) * U.X, 0.4, it.z * U.Z, t); }   // the hazard shatters
    else if (ev.t === 'near') this.perk.near(lat, y, z, t);
    else if (ev.t === 'expire') this.perk.ring(ev.kind, lat, 0.15, z, t, 2.2);
    else if (ev.t === 'mission' || ev.t === 'combo') this.perk.celebrate(lat, y, z, t);
  }
  onReset() { this.fx.clear(); this.perk.clear(); this.heading = 0; this.lastT = 0; this.usedSpots.clear(); this.armedSpot = null; }

  // does the runner ride the kick scooter? The player decides (Game.riding: tap the indicator over a parked scooter or a station, or press E; again to get off); ?scooter=1 rides
  // everywhere and always, ?scooter=0 never (for testing)
  riding(g) {
    const m = (location.search.match(/[?&]scooter=(\w+)/) || [])[1];
    if (m === '1' || m === 'always') return true;
    if (m === '0' || m === 'never') return false;
    return !!g.riding;
  }

  // the indicator: a translucent ring on the ground under the nearest parked scooter / station (the HUD draws it as an ellipse in perspective: rx, ry in its pixel grid). It is armed from
  // 140 m ahead to 60 m behind (about 7 s at running speed, so there is time to reach it); once the scooter slips out of view behind the camera the ring stays pinned to the bottom
  // of the screen on its side (pinned: true) and fades. g.scooterHint is what the HUD draws and what a tap, a click or E takes. Nothing while riding or outside play. onScooter
  // (called by Game when the player mounts) marks the spot as taken.
  pickHint(g) {
    g.scooterHint = null;
    if (g.state !== 'play' || this.riding(g) || g.surf) { this.armedSpot = null; return; }
    const U = U3, rz = g.p.z * U.Z, Lref = (g.camX + g.camOff) * U.X, w = g.world, d0 = w.dropAt(g.p.z);
    let sp = null;
    const kept = this.armedSpot && !this.usedSpots.has(this.armedSpot.key) && this.armedSpot.zAbs - rz >= -60 ? this.armedSpot : null;     // the scooter already offered stays offered until it is 60 m behind (a newer one nearer ahead does not take over: no chasing a moving target)
    if (kept) { const ahead = kept.zAbs - rz; sp = { key: kept.key, dock: kept.dock, kind: kept.kind, ahead, x: kept.xAbs - Lref, y: WALK_Y - (w.dropAt(kept.zAbs / U.Z) - d0) * U.Z, z: -ahead }; }
    else {
      sp = this.spots.filter(q => q.ahead >= -20 && q.ahead <= 140 && !this.usedSpots.has(q.key)).sort((p, q) => (p.ahead < 0 ? 1000 - p.ahead : p.ahead) - (q.ahead < 0 ? 1000 - q.ahead : q.ahead))[0];          // else the nearest one ahead (or, if none, the one just passed)
      if (!sp) { this.armedSpot = null; return; }
      this.armedSpot = { key: sp.key, dock: sp.dock, kind: sp.kind, xAbs: sp.x + Lref, zAbs: rz + sp.ahead };                       // remembered by its absolute place: the street scenery is only built ~25 m behind the runner
    }
    this.camera.updateMatrixWorld(true);
    const cv = document.getElementById('screen'), rc = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const to = (x, y, z) => { const v = this._v.set(x, y, z).project(this.camera); return v.z >= 1 ? null : { nx: v.x, ny: v.y, x: ((v.x + 1) / 2 * innerWidth - rc.left) * VW / rc.width, y: ((1 - v.y) / 2 * innerHeight - rc.top) * VH / rc.height }; };
    const c = to(sp.x, sp.y, sp.z), R = sp.dock ? 3.2 : 2.2;
    if (c && c.y < VH + 40) {                                                                                       // in front of the camera: on the ground under the scooter (clamped to the HUD)
      const ex = to(sp.x + R, sp.y, sp.z), ez = to(sp.x, sp.y, sp.z - R), rx = ex ? Math.abs(ex.x - c.x) : 8, ry = ez ? Math.abs(ez.y - c.y) : 3;
      g.scooterHint = { key: sp.key, dock: sp.dock, kind: sp.kind, ahead: sp.ahead, pinned: c.y > VH - 44, x: Math.max(16, Math.min(VW - 16, c.x)), y: Math.max(40, Math.min(VH - 44, c.y)), rx: Math.max(3, Math.min(60, rx)), ry: Math.max(1.5, Math.min(30, ry)) };
    } else g.scooterHint = { key: sp.key, dock: sp.dock, kind: sp.kind, ahead: sp.ahead, pinned: true, x: sp.x < 0 ? 112 : 208, y: VH - 44, rx: 18, ry: 7 };     // behind the camera: pinned low on its side
  }
  onScooter(g, hint) { if (hint) { this.usedSpots.add(hint.key); this.armedSpot = null; } }

  // The journey through a Stargate (Portal): the runner is pulled into the black hole at the middle of the entry door, spiralling in, turning and shrinking away, is out of sight between the two doors,
  // then falls out of the middle of the exit door and settles back onto its road. Only how it is drawn: its real position (and the camera that follows it) is the road's.
  journey(g, relX, ry) {
    const R = this.runner, sh = R.shadow, pz = g.portal ? g.portal.pose : null; R.group.scale.setScalar(1); R.group.rotation.z = 0;
    if (!pz || pz.mode === 'none') return;
    const want = pz.mode === 'pull' ? 'in' : 'out'; let d = null, bd = 1e9;
    for (const c of this.doorsNow) if (c.q === g.portal.act && c.kind === want) { const dd = Math.abs(c.x - relX); if (dd < bd) { bd = dd; d = c; } }
    if (pz.mode === 'hidden' || !d) { if (pz.mode !== 'pull') { R.group.visible = false; sh.visible = false; } return; }
    // the path: a straight pull toward the middle of the hole whose swirl only builds up near it (the turn goes with the cube of the progress, so the runner stays in view and in front of the door, and
    // comes out of the exit door the same way in reverse: the turn dies away as it settles), shrinking as it goes
    const e = pz.e, pull = pz.mode === 'pull', m = pull ? e : 1 - e, ang = m * m * m * 2 * Math.PI * (pull ? 1 : -1), co = Math.cos(ang), si = Math.sin(ang), dx = relX - d.x, dy = ry - d.y, k = pull ? 1 - e : e;
    R.group.position.set(d.x + (dx * co - dy * si) * k, d.y + (dx * si + dy * co) * k, pull ? d.z * e : d.z * (1 - e));
    const s = pull ? Math.pow(1 - e, 1.2) : Math.pow(e, 0.8); R.group.scale.setScalar(Math.max(0.001, s)); R.group.rotation.z = (pull ? 1 : -1) * m * m * m * 4 * Math.PI;
    R.group.visible = s > 0.02; sh.visible = R.group.visible && s > 0.85;
  }

  place(name, x, y, z, rotY, sc) {
    const pool = this.props[name], n = this.propUsed[name];
    if (!pool || n >= pool.length) { this.dropped++; this.droppedBy[name] = (this.droppedBy[name] || 0) + 1; return; }
    this.propUsed[name] = n + 1;
    const o = pool[n]; o.position.set(x, y, z); o.rotation.y = rotY; if (sc || o.scale.x !== 1) o.scale.setScalar(sc || 1); o.visible = true;
  }

  draw(g) {
    const w = g.world, p = g.p, U = U3, dt = Math.min(0.05, this.lastT ? (g.time - this.lastT) : 0.016) || 0.016;
    if (g.state !== 'pause') this.lastT = g.time;
    const rz = p.z * U.Z, Lref = (g.camX + g.camOff) * U.X, SL = SEG_LEN;
    const SC = g.state === 'scene' ? g.scene : null;                                      // the Gare du Midi cutscene, if one is running
    { const tp = w.tubeFork(g.p.z); if (tp) this.applyAtmosphere('coastAqua', World.seaK(w.seaDepth(g.p.z)), tp.fork.tube.pre); else this.applyAtmosphere(g.bgTo, g.bgT); }       // in the tunnel under the sea the look follows the DEPTH: from the coast's own light to the deep, and back (never a cut)
    // the music's beat (g.sfx.beat(): pulse 1 on each kick, decaying), scaled by how loud the track is at that moment, drives the animation: the sun-side light, the glowing
    // neon parts (one shared material), the PLAY button, the avatar. Stronger in the neon quarter. Without sound (the pulse is a clock at the same tempo) it still moves.
    const bt = g.sfx ? g.sfx.beat() : null, nw = g.bgTo === 'neon' ? g.bgT : 0, pulse = bt ? bt.pulse * (0.4 + 0.6 * bt.energy) : 0;
    this.hemi.intensity = this.hemiBase * (1 + (0.05 + 0.1 * nw) * pulse);
    Kit.materials().glow.color.setScalar(1 - (0.1 + 0.12 * nw) * (1 - pulse));
    this.ui.beatPulse = pulse;

    // ---- road ribbons (two roads at a fork)
    // descent: how far below the runner's level a point z (design units) lies (0 on flat road); the slope of the far ground follows the steepest slope seen from here to 150 m ahead
    const d0 = w.dropAt(p.z), dy = z => -(w.dropAt(z) - d0) * U.Z;
    this.groundPivot.rotation.x = -Math.atan(Math.max(w.gradeAt(p.z), w.gradeAt(p.z + 1500)));
    // under the sea: the coast road beside the tunnel is not seen once the runner is deep (hide = the side of the junction not drawn); the surface of the sea is a plane at the sea's own height over the tunnel, from mouth
    // to mouth, but only visible where the road under it is deep (its alpha follows the depth: the entrance and its surroundings stay dry), seen from above on the way down and up and from below in the deep
    const depthM = w.seaDepth(p.z) * U.Z, hide = depthM >= 3.5 ? -1 : 0; this.road.hide = hide; this.hide = hide;
    const tf = w.tubeFork(p.z, 3000, 1000);
    this.seaTop.visible = !!tf; if (tf) {
      const lenM = tf.fork.tube.len * U.Z, st = this.seaTop; st.position.set(0, depthM + 0.04, rz - (tf.fe + tf.fork.tube.len / 2) * U.Z); this.seaTex.repeat.set(24, 24 * lenM / 700);
      st.material.opacity = (this.camera.position.y > st.position.y ? 0.4 : 0.7); this.seaTex.offset.set(g.time * 0.012, g.time * 0.007);
    }
    this.road.update(w, rz, Lref);

    // ---- scenery: slots of SEG_LEN, per road and side; the biome of each side is chosen by the blend at that spot
    for (const k in this.propUsed) this.propUsed[k] = 0;
    this.spots.length = 0;
    const i0 = Math.floor(rz / SL) - 2, i1 = i0 + TRACK3D.SLOTS - 1;
    this.doorsNow = []; this.padsNow = [];                    // the doors placed this frame (for the runner's journey) and the landing pads (for the saucers)
    for (let i = i0; i <= i1; i++) {
      const zs = i * SL, sc = this.slotCache[((i % 20) + 20) % 20];
      if (sc.i !== i || sc.ver !== w.ver) { sc.i = i; sc.ver = w.ver; sc.mid = w.bandsAt((zs + SL / 2) / U.Z); sc.a = w.bandsAt(zs / U.Z); sc.b = w.bandsAt((zs + SL) / U.Z); }
      const bands = sc.mid, two = bands.length > 1 && !hide;
      for (let bi = 0; bi < bands.length; bi++) {
        if (hide && bands[bi].side === hide) continue;
        const b = bands[bi], hwM = (b.hi - b.lo) / 2 * U.X;
        let c0 = null, c1 = null;
        for (let sg = -1; sg <= 1; sg += 2) {
          const inner = two && sg !== b.side;
          let avail = 99;
          if (inner) {                                           // room between this road's edge and the midline to the other road
            const o = bands[1 - bi]; avail = Math.abs(((o.lo + o.hi) / 2 + o.off - ((b.lo + b.hi) / 2 + b.off)) * U.X) / 2 - hwM;
            if (avail < 3.5) continue;
          }
          const info = sg < 0 ? b.eL : b.eR;
          // which biome dresses this side of this slot: the blend decides, with a seeded threshold per pair of slots, so the scenery changes once, cleanly, as the blend passes ~half
          const pick = j => (0.35 + 0.3 * rnd(Math.floor(j / 2) * 4 + bi * 2 + (sg > 0 ? 1 : 0), 21) < info.t ? info.to : this.baseId);
          const envId = pick(i), env = this.envs[envId];
          if (c0 === null) { c0 = this.centreOf(sc.a, b.side) - Lref; c1 = this.centreOf(sc.b, b.side) - Lref; }
          // an entrance marker at the first slot of a new biome (only when the change is clean: the two slots before differ, the next one agrees)
          if (env.entrance && !inner && pick(i - 1) !== envId && pick(i - 2) !== envId && pick(i + 1) === envId)
            this.place(env.entrance, c0 + (c1 - c0) * (1.5 / SL) + sg * 5.2, WALK_Y + dy((zs + 1.5) / U.Z), rz - zs - 1.5, (sg < 0 ? Math.PI : 0) - Math.atan2(c1 - c0, SL));
          for (const pl of this.layoutFor(envId, i)) {
            if ((pl.x < 0 ? -1 : 1) !== sg) continue;
            if (inner && (!env.innerOk.has(pl.prop) || Math.abs(pl.x) - hwM > avail - 0.8)) continue;
            if (pl.under !== undefined && w.seaDepth((zs + pl.dist) / U.Z) * U.Z < pl.under) continue;                    // sea life only where the sea is deep enough over the road (never in the air)
            const t = pl.dist / SL, cx = c0 + (c1 - c0) * t;
            if (/^(scooter|board|neonHover)/.test(pl.prop)) {                    // a parked scooter or a scooter station: offered to the player (an indicator above it), unless it was already taken
              const key = i + ':' + pl.prop + ':' + pl.x.toFixed(2);
              if (this.usedSpots.has(key)) continue;
              this.spots.push({ key, dock: /Dock$/.test(pl.prop), kind: /^(board|neonHover)/.test(pl.prop) ? 'board' : 'scooter', x: cx + pl.x, y: WALK_Y + dy((zs + pl.dist) / U.Z), z: rz - zs - pl.dist, ahead: zs + pl.dist - rz });
            }
            let py = WALK_Y + dy((zs + pl.dist) / U.Z), pz = rz - zs - pl.dist;
            if (pl.live) { py += Math.sin(g.time * 0.8 + i * 1.7 + pl.x) * 0.45; pz += Math.sin(g.time * 0.35 + i) * 2.2; }                    // a creature of the aquarium drifts a little (up and down, along the road)
            this.place(pl.prop, cx + pl.x, py, pz, (pl.x < 0 ? Math.PI : 0) + (pl.rotY || 0) - Math.atan2(c1 - c0, SL));
            if (pl.prop === 'coastPad') this.padsNow.push({ id: i, x: cx + pl.x, y: WALK_Y + dy((zs + pl.dist) / U.Z), z: rz - zs - pl.dist });
          }
        }
        // the doors of a passage between two zones (Portal) that stand across this road in this slot: the user's picture on a plane, additive, faded in with the distance and out as the runner goes through
        if (g.portal) for (const gt of g.portal.gatesIn(zs / U.Z, (zs + SL) / U.Z)) {
          if (c0 === null) { c0 = this.centreOf(sc.a, b.side) - Lref; c1 = this.centreOf(sc.b, b.side) - Lref; }
          const dist = gt.z * U.Z - zs, ahead = gt.z * U.Z - rz, far = gt.kind === 'out' ? Math.max(0, Math.min(1, (70 - ahead) / 20)) : Math.max(0, Math.min(1, (120 - ahead) / 30)), near = Math.max(0, Math.min(1, (ahead + 7) / 11));
          this.place('portalGate', c0 + (c1 - c0) * (dist / SL), dy(gt.z), rz - zs - dist, -Math.atan2(c1 - c0, SL), two ? 0.68 : 1);
          const o = this.props.portalGate[this.propUsed.portalGate - 1];
          if (o) {
            o.children[0].material.opacity = o.children[1].material.opacity = far * far * (3 - 2 * far) * near;
            const [lx, ly] = PortalArt.centre(), sc = o.scale.x, ry = o.rotation.y;                      // the middle of its black hole, in the scene: where the runner is pulled to and comes out from
            this.doorsNow.push({ q: gt.q, kind: gt.kind, x: o.position.x + lx * sc * Math.cos(ry), y: o.position.y + ly * sc, z: o.position.z - lx * sc * Math.sin(ry) });
          }
        }
      }
    }
    for (const id in this.layouts) { const m = this.layouts[id]; if (m.size > 30) for (const k of m.keys()) if (k < i0 - 4) m.delete(k); }
    if (this.saucers) this.saucers.update(this.padsNow, dt, g.time);

    // ---- items: coins and hazards on whichever road they belong to; signposts and the fork marker
    this.items.begin();
    for (const it of w.items) {
      const dz = it.z - p.z;
      if (it.taken || dz < -150 || dz > 1500) continue;         // design units: 15 m behind .. 150 m ahead
      if (it.offV !== w.ver) { const bn = w.bandNear(it.z, it.x); it.off = bn.off; it.sd = bn.side; it.wet = bn.t > 0.5 && !!(this.envs[bn.to] && this.envs[bn.to].road.water); it.offV = w.ver; }   // road curve offset and water (a canal: hazards get their water look) at the item, cached until the track changes
      if (hide && it.sd === hide) continue;                      // (the other road of the junction is not seen from under the sea)
      const x = (it.x + it.off) * U.X - Lref, zr = -dz * U.Z;
      const iy = dy(it.z);                                     // on a descent the item sits on the sloping road
      if (it.kind === 'prop') { this.place(it.spr, x, WALK_Y + iy, zr, 0); continue; }
      if (it.kind === 'coin' || this.items.extraSet[it.kind]) this.items.place(it.kind, x, it.h * U.Y + iy, zr); else this.items.place(it.wet && this.items.pool[it.kind + 'W'] ? it.kind + 'W' : it.kind, x, iy, zr);   // coins and the collectibles hang at their height
    }
    for (const name in this.props) { const pool = this.props[name]; for (let n = this.propUsed[name]; n < pool.length; n++) pool[n].visible = false; }
    this.items.end(g.time);
    this.fx.update(g.time, rz, Lref);
    { // the station's train: standing at the platform from afar (the boarding door at the door point), the leaves slide in the cutscene, it pulls out in the 'depart' phase
      if (!this.garePiece || w.pieces.indexOf(this.garePiece) < 0) this.garePiece = w.pieces.find(q => q.type === 'seg' && q.seg.scene) || null;
      const GP = this.garePiece, T = this.train, C = this.crowd, inView = !!GP && p.z > GP.z0 - 2400 && p.z < GP.z1 + 200;
      if (inView) {
        const sc = GP.seg.scene, doorZ = GP.z0 + sc.at + sc.run, S2 = SC && SC.P === GP ? SC : null, wz = rz - doorZ * U.Z;
        T.group.visible = !(GP.sceneDone && !S2) && !(S2 && S2.phase === 'depart' && S2.trainS * U.Z > 120);                    // (the train has left for good once the scene is over)
        T.group.position.set(11.1 - Lref, -0.02 + dy(doorZ), wz - (S2 ? S2.trainS * U.Z : 0)); T.setOpen(S2 ? S2.open : 0);
        this.crowdT = S2 ? S2.t : GP.sceneDone ? this.crowdT + dt : 0;                                                           // the walkers start walking with the scene and go on after it
        C.group.visible = true; C.place(Lref, 0.78 + dy(doorZ), wz, this.crowdT, !!S2 && (S2.phase === 'depart' || S2.phase === 'doors' || (S2.phase === 'board' && S2.t > S2.T + 0.6)));
      } else { T.group.visible = false; C.group.visible = false; }
    }

    // ---- runner (absolute lateral on its road, jump height in metres)
    const pb = w.playerBand(p.z, p.x), relX = (p.x + pb.off) * U.X - Lref;
    const lift = SC ? 0.85 * Math.max(0, Math.min(1, ((p.x + pb.off) * U.X - 6.6) / 0.8)) : 0;       // in the cutscene the runner steps up onto the platform (0.85 m)
    this.runner.group.position.set(relX, p.jy * U.Y + lift, 0); this.runner.group.visible = !(SC && SC.boarded);
    { const sh = this.runner.shadow, k = Math.max(0.25, 1 - p.jy * U.Y / 3.5); sh.position.set(relX, 0.04 + lift, 0); sh.scale.set(0.5 * k, 1, 0.42 * k); sh.material.opacity = 0.3 * k; sh.visible = this.runner.group.visible; }   // contact shadow, fading as the runner leaves the ground
    this.journey(g, relX, p.jy * U.Y + lift);
    this.perk.update(g, rz, Lref, relX, this.runner.group.position.y);
    if (Math.abs(this.camera.fov - this.perk.fov) > 0.02) { this.camera.fov = this.perk.fov; this.camera.updateProjectionMatrix(); }       // the dash opens the view a few degrees
    const ms = 1 - Math.exp(-3.5 * dt);
    this.menu += ((g.state === 'title' ? 1 : 0) - this.menu) * ms;
    const mm = this.menu * this.menu * (3 - 2 * this.menu);
    // heading: the runner faces along the route (the tangent of its road's centre line 5 m either side), so it stays aligned on curves
    const c1 = w.playerBand(p.z + 50, p.x), c0 = w.playerBand(p.z - 50, p.x);
    const slope = ((c1.c + c1.off) - (c0.c + c0.off)) * U.X / (100 * U.Z);
    this.heading += (-Math.atan(slope) - this.heading) * (1 - Math.exp(-10 * dt));
    this.runner.group.rotation.y = Math.PI * mm + this.heading * (1 - mm);
    this.runner.update(dt, { beat: pulse, faceYaw: Math.atan2(this.cam.x - relX, this.cam.z), time: g.time, runRate: 2.3 + p.speed / 340 * 1.1, airborne: p.jy > 0, vy: p.vy, sliding: p.slide > 0,
                             lean: Math.max(-1, Math.min(1, p.vx / STEER)), state: g.state, scooter: this.riding(g) || !!g.surf, vehicle: g.surf ? 'surf' : g.vehicle || 'scooter' });

    // ---- camera: chase (behind and above, centred on the 2D camera) blended with the menu showcase orbit; looks down the active route
    const orbit = Math.sin(g.time * 0.35) * 0.5;                  // menu camera drifts around the character
    this.cam.set((relX + Math.sin(orbit) * 2.6) * mm, 4.2 + (1.35 - 4.2) * mm, 7.5 + (Math.cos(orbit) * 3.5 - 7.5) * mm);
    const ahead = this.axisLat(w, p.z + TRACK3D.LOOK_AHEAD, Lref);
    this.lookX += (ahead * 0.8 - this.lookX) * (1 - Math.exp(-4 * dt));
    this.look.set(this.lookX + ((relX - 1.0) - this.lookX) * mm, 0.8 + 0.3 * mm, -20 * (1 - mm));
    if (g.shake > 0) { this.cam.x += Math.sin(g.time * 90) * g.shake * 0.5; this.cam.y += Math.cos(g.time * 70) * g.shake * 0.3; }
    // the cutscene's camera: from the road side, beside the runner (run, board, doors), then following the train out (depart); it eases in and out of the chase camera
    this.sceneK += ((SC ? 1 : 0) - this.sceneK) * (1 - Math.exp(-(SC ? 2.2 : 5) * dt));
    if (this.sceneK > 0.002) {
      const k = this.sceneK * this.sceneK * (3 - 2 * this.sceneK), dep = SC && SC.phase === 'depart', ts = SC ? SC.trainS * U.Z : 0, fz = dep ? -ts * 0.8 - 1 : -2.5;
      const tx = relX - 6.5, ty = 2.1 + lift, tz = dep ? 4.5 - ts * 0.5 : 4.5, lx = relX + 3.2, ly = 1.5 + lift, lz = fz;
      if (this.sceneK < 0.02 && SC) { this.scCam.copy(this.cam); this.scLook.copy(this.look); }
      const a = 1 - Math.exp(-5 * dt); this.scCam.x += (tx - this.scCam.x) * a; this.scCam.y += (ty - this.scCam.y) * a; this.scCam.z += (tz - this.scCam.z) * a; this.scLook.x += (lx - this.scLook.x) * a; this.scLook.y += (ly - this.scLook.y) * a; this.scLook.z += (lz - this.scLook.z) * a;
      this.cam.lerp(this.scCam, k); this.look.lerp(this.scLook, k);
    }
    this.camera.position.copy(this.cam); this.camera.lookAt(this.look);
    this.sky.position.copy(this.camera.position);
    this.sunDisc.position.set(this.camera.position.x + this.sunOff.x, this.camera.position.y + this.sunOff.y, this.camera.position.z - 250);
    this.sunDisc.lookAt(this.camera.position);
    if (this.sunGlow.visible) { this.sunGlow.position.copy(this.sunDisc.position); this.sunGlow.position.z += 0.5; this.sunGlow.lookAt(this.camera.position); }

    this.pickHint(g);
    this.renderer.render(this.scene, this.camera);
    this.uiCtx.clearRect(0, 0, VW, VH);
    this.ui.drawUI(g);
  }
}
