// Timeline of "Thirty Sailors and a Gust of Wind" (the Vasa, Stockholm 1628): 19 shots timed to the voice words
// (public/vasa/words.json, CUES.md), the ship physics (stability test rocking, gust, heel, flooding, sinking, raising)
// and the camera grammar of the bridge short (motion.md): symmetric smootherstep glides 18-40 f, cuts on big
// reframes, every hold creeps in, 7-frame flip kicks on impacts, no hand-held float.
export const FPS = 30;
export const TOTAL = 2040; // voice.wav = 68.00 s
export const D0 = 6.0; // quay top above the water (m); the water is y = 0, quays at z = +-30
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
const F = (f: number) => f / FPS; // frame -> seconds

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "sail" | "king" | "builder" | "admiral" | "test" | "launch" | "shore" | "masts" | "boat" | "inquiry" | "kingInq" | "lift" | "tourists" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean; sunAz?: number; sunEl?: number };
const I = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 119, light: "day", crowd: "sail", tau: I },          // mightiest warship in Europe
  { id: 2, a: 119, b: 176, light: "day", crowd: "masts", tau: I },       // ...it sank before it left the harbour (flash-forward)
  { id: 3, a: 176, b: 206, light: "day", crowd: "builder", tau: I, sunAz: 120 }, // Stockholm (aerial, ship at the quay)
  { id: 4, a: 206, b: 281, light: "day", crowd: "king", tau: I },        // the king wanted a ship that would terrify
  { id: 5, a: 281, b: 419, light: "day", crowd: "none", tau: I },        // 64 bronze cannons, two gun decks
  { id: 6, a: 419, b: 499, light: "day", crowd: "builder", tau: I },     // the shipbuilder had never built one
  { id: 7, a: 499, b: 567, light: "day", crowd: "admiral", tau: I },     // the admiral ordered a test
  { id: 8, a: 567, b: 836, light: "day", crowd: "test", tau: I },        // thirty sailors running
  { id: 9, a: 836, b: 910, light: "day", crowd: "admiral", tau: I },     // "If only His Majesty were at home"
  { id: 10, a: 910, b: 945, light: "day", crowd: "launch", tau: I },     // and launched it anyway
  { id: 11, a: 945, b: 1034, light: "golden", crowd: "shore", tau: I },  // 10 August, farewell salute
  { id: 12, a: 1034, b: 1181, light: "golden", crowd: "sail", tau: I },  // 1300 m out, the gust, the sea comes in
  { id: 13, a: 1181, b: 1397, light: "golden", crowd: "masts", tau: I }, // luckily 32 m deep / masts sticking out
  { id: 14, a: 1397, b: 1530, light: "day", crowd: "boat", tau: I },     // stood up in a rowing boat?
  { id: 15, a: 1530, b: 1628, light: "day", crowd: "none", tau: I },     // all cannon on top
  { id: 16, a: 1628, b: 1735, light: "day", crowd: "inquiry", tau: I },  // the inquiry; the builder had died
  { id: 17, a: 1735, b: 1809, light: "day", crowd: "kingInq", tau: I },  // ...was the king
  { id: 18, a: 1809, b: 1896, light: "day", crowd: "lift", tau: I },     // 333 years later they lifted her out
  { id: 19, a: 1896, b: TOTAL, light: "day", crowd: "tourists", tau: I },// a million a year; nobody on deck
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 11: 8, 14: 8, 15: 6, 16: 8, 18: 8, 19: 6 };
export const FLASH_AT = 176;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- ship physics ----------------
export type ShipPose = {
  visible: boolean; x: number; z: number; yaw: number; heel: number; sink: number;
  /** port-lid opening 0..1 per row, for gun i on side s (+1 starboard, -1 port) */
  ports: [(i: number, s: number) => number, (i: number, s: number) => number];
  guns: number; sail: number; flag: number;
};
export const MOOR: V3 = [0, 0, -23.4]; // alongside the near quay (port side to the quay)
export const COURSE_Z = -8;
export const SINK_X = 41.5; // where she went down (x along the harbour)
export const SUNK = 31.5, SUNK_HEEL = -0.3; // settled on the bottom: masts leaning to port
const shut = () => 0, open = () => 1;
/** ripple: lids open one after another from stern to bow starting at f0, `gap` frames apart, 6-frame swing */
const ripple = (f: number, f0: number, gap = 2.2, side = 0) => (i: number, s: number) => (side && s !== side ? 0 : smooth((f - f0 - i * gap) / 6));
/** the stability test: where the thirty stand across the deck (-1 port .. +1 starboard) */
export const RUNS = [592, 652, 698, 746]; // run starts (frames): to starboard, back, again, and the third one stopped
export const RUN_F = 30; // frames per crossing
export const STOP_F = 779; // "stopped them"
export const crewSide = (f: number) => {
  let side = -1;
  RUNS.forEach((r, k) => {
    const dir = k % 2 ? -1 : 1, u = smooth((f - r) / RUN_F);
    if (f < r) return;
    const stopU = k === 3 ? Math.min(u, smooth((STOP_F - r) / RUN_F)) : u;
    side = -dir + 2 * dir * stopU;
  });
  return side;
};
/** heel of the stability test (rad, + = starboard): a lagged response to the crew's side that grows with every
 *  crossing (rocked, rolled), then the lurch after they stop ("fell over") and a slow recovery */
export const testHeel = (f: number) => {
  const lag = crewSide(f - 7), gain = lin([[560, 0.07], [640, 0.09], [690, 0.13], [740, 0.17], [779, 0.2]], f);
  const lurch = 0.17 * Math.exp(-Math.max(0, f - 812) / 16) * smooth((f - 790) / 22) * Math.cos(Math.max(0, f - 812) * 0.12);
  const sway = 0.012 * Math.sin(f * 0.21);
  return lag * gain + (f > 790 ? lurch : 0) + sway;
};
/** sinking curve u 0..1 -> heel / sink (heels hard to port, floods, goes down, settles leaning to port) */
const sinkPose = (u: number) => ({ heel: lin([[0, -0.08], [0.25, -0.62], [0.55, -0.78], [1, SUNK_HEEL]], u), sink: SUNK * smooth(lin([[0, 0], [0.2, 0.02], [1, 1]], u)) });
/** course out of the harbour (10 August): towed off the quay, then under sail along x */
const courseX = (f: number) => (f < 945 ? 2 + 0.06 * (f - 910) : Math.min(SINK_X, 26 + 0.0969 * (f - 945)));
export const shipPose = (id: number, f: number): ShipPose => {
  const t = F(f), bob = 0.012 * Math.sin(t * 1.3);
  const base: ShipPose = { visible: true, x: MOOR[0], z: MOOR[2], yaw: 0, heel: bob, sink: 0, ports: [shut, shut], guns: 1, sail: -1, flag: 0.25 };
  switch (id) {
    case 1: return { ...base, x: 6 + 0.07 * f, z: COURSE_Z, heel: 0.03 * Math.sin(t * 0.9), ports: [open, open], sail: 0.7, flag: 0.5 };
    case 2: { const u = clamp01((f - 124) / 32); return { ...base, x: SINK_X, z: COURSE_Z, ...sinkPose(u), ports: [open, open], sail: 0.9, flag: 0.8 }; }
    case 5: return { ...base, ports: [ripple(f, 310), ripple(f, 388)] };
    case 8: return { ...base, heel: testHeel(f) };
    case 10: { const u = smooth((f - 905) / 45); return { ...base, x: courseX(f), z: MOOR[2] + (COURSE_Z - MOOR[2]) * 0.35 * u, sail: u > 0.5 ? 0.2 : -1 }; }
    case 11: return { ...base, x: courseX(f), z: COURSE_Z, ports: [ripple(f, 975, 1.6), ripple(f, 982, 1.6)], sail: 0.45, flag: 0.35, heel: 0.015 * Math.sin(t) };
    case 12: case 13: {
      const gust = smooth((f - 1080) / 10), x = courseX(Math.min(f, 1105));
      let heel = -0.04 - 0.4 * smooth((f - 1082) / 26) - 0.25 * smooth((f - 1112) / 24);
      let sink = 0;
      if (f >= 1138) { const s = sinkPose(clamp01((f - 1138) / 105)); heel = Math.min(heel, s.heel); if (f > 1200) heel = s.heel; sink = s.sink; }
      return { ...base, x, z: COURSE_Z, heel: heel + bob, sink, ports: [open, open], sail: 0.45 + 0.55 * gust, flag: 0.35 + 0.65 * gust };
    }
    case 14: case 16: case 17: return { ...base, visible: false };
    case 15: return { ...base, ports: [open, open] };
    case 18: { const u = smooth((f - 1858) / 40); return { ...base, x: SINK_X, z: COURSE_Z, heel: SUNK_HEEL * (1 - u), sink: SUNK * (1 - u) - 0.4 * u, sail: -1, flag: 0 }; }
    case 19: return { ...base, flag: 0.15 };
    default: return base;
  }
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (per-frame rate, optional punch for the first n frames with 8 f soft edges) */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// ship-relative points (moored ship, local deck heights mirror ship.ts deckH)
const deckH = (x: number) => 6.4 + 4.8 * smooth((-x - 11) / 7) + 1.8 * smooth((x - 13) / 5);
export const ADMIRAL_AT: V3 = [-17.6, 0, -0.9]; // local, on the quarterdeck (y from deckH)
export const KING_AT: V3 = [-1.5, D0, -31.0];
export const BUILDER_AT: V3 = [-9.0, D0, -31.1];
export const TABLE_AT: V3 = [-42, D0, -33.6];
export const STOOL_AT: V3 = [-37.6, D0, -32.9];
export const KING_INQ: V3 = [-34.8, D0, -33.4];
export const BOAT_AT: V3 = [-62, 0, -13];
const SX = (f: number) => shipPose(1, f).x; // hook course

// ---- framings ----
// 1 hook: low 3/4 from ahead-starboard, the ship sails toward the lens; then a heroic low angle under the bowsprit
const S1a = (f: number) => dolly([SX(f) + 70, 14, 30], [SX(f) + 2, 15, COURSE_Z], pushK(f, 0, 0.0025), { fov: 44 });
const S1b = (f: number) => dolly([SX(f) + 46, 3.4, 20], [SX(f) + 3, 17, COURSE_Z], pushK(f, 60, 0.003, 0.006, 30), { fov: 46, roll: -0.04 });
// 2 flash-forward: side-on from the water, tilting down after the hull as she goes
const S2a = (f: number) => dolly([SINK_X + 26, 4.5, 22], [SINK_X, 15 - 8 * smooth((f - 124) / 30), COURSE_Z], pushK(f, 119, 0.002), { fov: 48 });
// 3 Stockholm aerial: over the far bank, the ship at the quay, houses on both banks
const S3a = (f: number) => zoom([62, 56, 34], [-4, 6, -30], 46, pushK(f, 172, 0.002));
// 4 the king on the quay, the ship's side and rigging behind him; punch + roll on "terrify"
const S4a = (f: number) => dolly([KING_AT[0] + 1.6, D0 + 1.45, -35.6], [KING_AT[0], D0 + 2.0, KING_AT[2]], pushK(f, 206, 0.0025), { fov: 40 });
const S4b = (f: number) => dolly([KING_AT[0] + 0.9, D0 + 1.35, -34.6], [KING_AT[0], D0 + 1.95, KING_AT[2]], pushK(f, 241, 0.002, 0.006, 30), { fov: 38, roll: 0.04 });
// 5 starboard side from the water: the lower row opens, then up to the upper row ("two gun decks")
const S5a = (f: number) => dolly([-4, 2.7, -5.5], [1.5, 2.6, -18.3], pushK(f, 281, 0.0022), { fov: 42 });
const S5b = (f: number) => dolly([-3.5, 5.4, -6.5], [1.5, 4.6, -18.3], pushK(f, 375, 0.002, 0.005, 30), { fov: 42, roll: -0.035 });
// 6 the shipbuilder on the quay, scratching his head
const S6a = (f: number) => dolly([BUILDER_AT[0] - 1.3, D0 + 1.5, -35.3], [BUILDER_AT[0], D0 + 1.7, BUILDER_AT[2]], pushK(f, 419, 0.0025, 0.005, 30), { fov: 40 });
// 7 / 9 the admiral on the quarterdeck, seen from the waist looking aft (the ensign behind him)
const AD = (): V3 => [ADMIRAL_AT[0], deckH(ADMIRAL_AT[0]), MOOR[2] + ADMIRAL_AT[2]];
const S7a = (f: number) => { const a = AD(); return dolly([a[0] + 2.4, a[1] + 1.35, a[2] + 4.6], [a[0], a[1] + 1.75, a[2]], pushK(f, 499, 0.0025), { fov: 40 }); };
const S9a = (f: number) => { const a = AD(); return dolly([a[0] + 1.6, a[1] + 1.5, a[2] + 3.4], [a[0], a[1] + 1.85, a[2]], pushK(f, 836, 0.002, 0.005, 35), { fov: 38, roll: -0.03 }); };
// 8 the stability test from astern (world-fixed lens: the whole ship rolls in the frame)
const S8a = (f: number) => dolly([-34, 27, -13], [0, 7.0, -23.4], pushK(f, 567, 0.0018), { fov: 40 });
const S8b = (f: number) => dolly([-24, 19, -16], [0.5, 6.8, -23.4], pushK(f, 652, 0.0022), { fov: 40, roll: 0.03 });
const S8c = (f: number) => dolly([-36, 25, -18], [0, 7.2, -23.4], pushK(f, 746, 0.0022, 0.005, 30), { fov: 42, roll: -0.03 });
// 10 launch: high from the far bank, the ship warped off the quay
const S10a = (f: number) => zoom([30, 24, 18], [4, 8, -20], 42, pushK(f, 910, 0.0025));
// 11 golden: from the water past the ship toward the cheering quay
const S11a = (f: number) => dolly([courseX(975) + 16, 13.5, 18], [courseX(975) - 4, 7.2, -30], pushK(f, 945, 0.002), { fov: 44 });
const S11b = (f: number) => dolly([courseX(1010) + 5, 4.0, 6.5], [courseX(1010) - 1.5, 4.2, COURSE_Z], pushK(f, 1012, 0.002, 0.005, 25), { fov: 40, roll: 0.035 });
// 12 aerial 1300 m out -> bow 3/4 on the gust -> the port gun ports at the water line
const X12 = SINK_X - 1.5;
const S12a = (f: number) => zoom([X12 + 64, 34, 36], [X12, 9, COURSE_Z], 42, pushK(f, 1034, 0.002));
const S12b = (f: number) => dolly([X12 + 30, 8.5, 16], [X12 + 1, 13, COURSE_Z], pushK(f, 1082, 0.0025, 0.006, 30), { fov: 46, roll: -0.04 });
const S12c = (f: number) => dolly([SINK_X + 9, 2.4, -27.2], [SINK_X - 1, 3.6, COURSE_Z - 2], pushK(f, 1133, 0.003, 0.005, 25), { fov: 46, roll: 0.035 });
// 13 deadpan: low over the water, the quay crowd behind; tilt up to the masts on "Unluckily"
const S13a = (f: number) => dolly([SINK_X + 6, 2.2, 13], [SINK_X - 1, 2.4, -14], pushK(f, 1181, 0.0018), { fov: 42 });
const S13b = (f: number) => dolly([SINK_X + 7, 3.4, 15], [SINK_X - 0.5, 7.5, -12], pushK(f, 1258, 0.002, 0.006, 35), { fov: 44, roll: 0.04 });
const S13c = (f: number) => dolly([SINK_X + 3, 4.6, 9], [SINK_X + 0.5, 7.0, COURSE_Z], pushK(f, 1310, 0.0025), { fov: 42, roll: -0.03 });
// 14 the rowing boat
const S14a = (f: number) => dolly([BOAT_AT[0] + 3.4, 3.6, BOAT_AT[2] + 5.6], [BOAT_AT[0], 0.8, BOAT_AT[2]], pushK(f, 1397, 0.002), { fov: 40 });
const S14b = (f: number) => dolly([BOAT_AT[0] + 2.6, 2.9, BOAT_AT[2] + 4.3], [BOAT_AT[0], 0.85, BOAT_AT[2]], pushK(f, 1476, 0.002, 0.005, 25), { fov: 40, roll: 0.04 });
// 15 the upper gun deck -> tilt down to the water line ("almost nothing underneath")
const S15a = (f: number) => dolly([3, 6.2, -8], [0.5, 5.0, -18.3], pushK(f, 1530, 0.0025), { fov: 42 });
const S15b = (f: number) => dolly([3, 1.3, -9], [0.5, -0.2, -18.3], pushK(f, 1585, 0.0025), { fov: 42, roll: -0.035 });
// 16 the inquiry table on the quay; the builder's empty stool
const S16a = (f: number) => dolly([TABLE_AT[0] + 0.8, D0 + 2.1, -26.4], [TABLE_AT[0], D0 + 1.45, TABLE_AT[2]], pushK(f, 1628, 0.0025, 0.005, 30), { fov: 44 });
const S16b = (f: number) => dolly([STOOL_AT[0] + 0.7, D0 + 1.05, STOOL_AT[2] + 3.2], [STOOL_AT[0], D0 + 0.55, STOOL_AT[2]], pushK(f, 1684, 0.0025), { fov: 40 });
// 17 the judges turn ("the man who approved the design...") -> the king, pleased with himself
const S17a = (f: number) => dolly([TABLE_AT[0] + 2.6, D0 + 2.0, -26.8], [TABLE_AT[0] + 1.6, D0 + 1.45, TABLE_AT[2]], pushK(f, 1735, 0.002), { fov: 44 });
const S17b = (f: number) => dolly([KING_INQ[0] - 0.6, D0 + 1.6, KING_INQ[2] + 3.6], [KING_INQ[0], D0 + 1.95, KING_INQ[2]], pushK(f, 1783, 0.002, 0.006, 25), { fov: 38, roll: 0.04 });
// 18 raised: wide from the water, the masts first, then the hull
const S18a = (f: number) => dolly([SINK_X + 24, 7, 22], [SINK_X, 9 - 2 * smooth((f - 1860) / 40), COURSE_Z], pushK(f, 1809, 0.002), { fov: 46 });
// 19 the visitors on the quay with the ship behind; then the empty deck from the quarterdeck
const S19a = (f: number) => dolly([3.2, deckH(3) + 3.0, MOOR[2] - 3.2], [1.0, D0 + 1.3, -33.2], pushK(f, 1896, 0.002, 0.005, 30), { fov: 46 });
const S19b = (f: number) => dolly([-17.5, deckH(-17.5) + 2.2, MOOR[2] + 1.4], [8, deckH(0) + 0.6, MOOR[2] - 0.4], pushK(f, 2003, 0.0025), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 52, dur: 30, s: S1b }],                // centred on "mightiest" (64)
  2: [{ f: 119, s: S2a }],
  3: [{ f: 172, s: S3a }],
  4: [{ f: 206, s: S4a }, { f: 236, dur: 18, s: S4b }],              // centred on "terrify" (241)
  5: [{ f: 281, s: S5a }, { f: 372, dur: 30, s: S5b }],              // centred on "two" (388)
  6: [{ f: 419, s: S6a }],
  7: [{ f: 499, s: S7a }],
  8: [{ f: 567, s: S8a }, { f: 652, cut: true, s: S8b }, { f: 746, cut: true, s: S8c }],
  9: [{ f: 836, s: S9a }],
  10: [{ f: 910, s: S10a }],
  11: [{ f: 945, s: S11a }, { f: 1012, cut: true, s: S11b }],       // cut to the guns on "salute"
  12: [{ f: 1034, s: S12a }, { f: 1082, cut: true, s: S12b }, { f: 1133, cut: true, s: S12c }],
  13: [{ f: 1181, s: S13a }, { f: 1246, dur: 26, s: S13b }, { f: 1310, cut: true, s: S13c }],
  14: [{ f: 1393, s: S14a }, { f: 1476, cut: true, s: S14b }],
  15: [{ f: 1527, s: S15a }, { f: 1585, dur: 30, s: S15b }],         // tilt down through "almost nothing"
  16: [{ f: 1624, s: S16a }, { f: 1684, cut: true, s: S16b }],
  17: [{ f: 1735, s: S17a }, { f: 1783, cut: true, s: S17b }],
  18: [{ f: 1805, s: S18a }],
  19: [{ f: 1893, s: S19a }, { f: 2003, cut: true, s: S19b }],
};

// impact kicks (seconds, gain): the hook's sink, the lurch, the salute, the gust, the flood
const KICKS: [number, number][] = [[F(124), 0.5], [F(812), 0.8], [F(1019), 0.6], [F(1082), 1.0], [F(1133), 0.7]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(F(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eye = (p: V3, h = 1.85): (() => V3) => () => [p[0], p[1] + h, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                     // hook wides
  { f: 206, cInf: 12, focus: eye(KING_AT, 1.95) },       // king MS
  { f: 281, cInf: 0 },                                   // hull side
  { f: 419, cInf: 12, focus: eye(BUILDER_AT, 1.8) },     // shipbuilder MS
  { f: 499, cInf: 11, focus: () => { const a = AD(); return [a[0], a[1] + 1.8, a[2]]; } }, // admiral
  { f: 567, cInf: 0 },                                   // the test (wide, readable)
  { f: 836, cInf: 13, focus: () => { const a = AD(); return [a[0], a[1] + 1.85, a[2]]; } },
  { f: 910, cInf: 0 },                                   // launch, salute, aerials
  { f: 1012, cInf: 8 },                                  // guns CU (focus = look)
  { f: 1034, cInf: 0 },
  { f: 1133, cInf: 10 },                                 // flooding gun ports
  { f: 1181, cInf: 0 },                                  // deadpan wides
  { f: 1397, cInf: 7, focus: () => [BOAT_AT[0], 1.5, BOAT_AT[2]] }, // rowing boat
  { f: 1530, cInf: 0 },
  { f: 1628, cInf: 10, focus: () => [TABLE_AT[0], D0 + 1.4, TABLE_AT[2] - 0.8] }, // judges
  { f: 1684, cInf: 13 },                                 // empty stool (focus = look)
  { f: 1735, cInf: 9, focus: () => [TABLE_AT[0], D0 + 1.4, TABLE_AT[2] - 0.8] },
  { f: 1783, cInf: 13, focus: eye(KING_INQ, 1.95) },     // king MS
  { f: 1809, cInf: 0 },                                  // raising (wide)
  { f: 1896, cInf: 6 },                                  // visitors (mild)
  { f: 2003, cInf: 0 },                                  // empty deck
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

/** near framing objects (Kenney / cartoon plants via build.ts kitClone): visible a <= f < b */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 1628, b: 1684, kit: "plant_bushDetailed", pos: [TABLE_AT[0] + 2.6, D0, -31.4], s: 1.0, yaw: 0.8 }, // inquiry, bottom-right
];
