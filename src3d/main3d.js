// 3D front end: the same Game (rules, input, track) driven through Renderer3D instead of the pixel-art renderer.
// The menu keeps the START button left of the animated character.
Object.assign(BTN.title, { x: 14, y: 114, w: 108, h: 18 });
(function () {
  const cv = document.getElementById('screen');
  window.__wf = new Game(cv, { world: new World(TRACK), renderer: new Renderer3D(cv, ENV3D) });
  window.__wf.sfx = new GameAudio();                                  // sound: effects + the music track and its beat clock (see src/audio.js)
})();
