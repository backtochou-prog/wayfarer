// Stretch: groups scenery slots (SEG_LEN = 12 m each) into stretches of 4-13 slots (about 50-150 m). Each stretch has its own seeded "character"
// (a variant such as terrace / avenue / open square for the city, dense wood / clearing / rocky for the forest) and at most one landmark,
// so the street changes shape every so often instead of repeating one layout slot after slot.
//
// Everything is a pure function of the slot index and a per-biome salt (no state, no allocation worth mentioning), so layouts are reproducible
// and testable, and the renderer's per-slot layout cache stays valid.
//
// Neighbouring stretches always differ: stretch b only draws its variant and its landmark kind from list entries whose index has the parity of b,
// so two consecutive stretches never get the same variant or the same landmark. A landmark sits 1..len-2 slots into its stretch, so two landmarks
// are at least 3 slots (36 m) apart.
const Stretch = {
  CELL: 9,
  cut(c, salt) { return c * 9 + 2 + Math.floor(rnd(c, 101 + salt) * 5); },        // one cut per 9-slot cell, 2..6 slots in: stretches are 4-13 slots long
  pickIdx(count, b, n, salt) {                                                       // seeded index in 0..count-1 with the parity of b
    const par = ((b % 2) + 2) % 2, cnt = Math.max(1, Math.ceil((count - par) / 2));
    return Math.min(count - 1, par + 2 * Math.floor(rnd(b, n + salt) * cnt));
  },
  // the stretch containing slot i. nVar: number of variants (>= 2). landmarks: list of landmark prop names (>= 2). pLm: chance a stretch has one.
  of(i, salt, nVar, landmarks, pLm = 0.75) {
    const c = Math.floor(i / 9); let b = c, start = this.cut(c, salt);
    if (i < start) { b = c - 1; start = this.cut(b, salt); }
    const end = this.cut(b + 1, salt), len = end - start;
    let lm = null;
    if (landmarks && rnd(b, 8 + salt) < pLm) lm = { kind: landmarks[this.pickIdx(landmarks.length, b, 9, salt)], side: rnd(b, 10 + salt) < 0.5 ? -1 : 1, slot: start + 1 + Math.floor(rnd(b, 11 + salt) * Math.max(1, len - 2)) };
    return { b, start, len, pos: i - start, variant: this.pickIdx(nVar, b, 7, salt), lm };
  },
};
