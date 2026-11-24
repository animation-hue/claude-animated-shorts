// "किसान रामू और विद्या – करेला बना खेत का रखवाला" (the user's own story and shot list), 16:9, 24 fps, Hindi:
// narrator (Biju S), Ramu (Sunil SL Narnauliya), Vidya (Ritu) - ElevenLabs, assembled in shorts/karela/voice.
// Everything is timed to that voice track (voiceEnv.ts LINES, seconds). One world: the house + courtyard, the path,
// the field (x FIELD[0..1], z FIELD[2..3]) with its states, the karela bund, the scrub east where the boars live,
// and a bedroom set (ROOM) for the night shots.
import { LINES, VOICE_TOTAL } from "./voiceEnv";
export const FPS = 24;
export const TOTAL = Math.ceil((VOICE_TOTAL + 0.2) * FPS); // 340.4 s
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const F = (t: number) => Math.round(t * FPS);
export const lineT = (id: string) => LINES.find((l) => l[0] === id)!;

// ---------------- places ----------------
export const FIELD: [number, number, number, number] = [-6, 14, 4, 22]; // x0, x1, z0, z1
export const HOUSE: V3 = [-13, 0, 2];
export const ROOM: V3 = [-60, 0, -40];
export const TULSI: V3 = [-7.4, 0, 0.1];
export const VINE_X = 14.75;          // the east bund's vines, where the boars bite
export const BED_R: [V3, V3] = [[ROOM[0] + 0.85, 0.66, ROOM[2] + 1.05], [ROOM[0] - 0.85, 0.66, ROOM[2] + 1.05]]; // feet, head
export const BED_V: [V3, V3] = [[ROOM[0] + 0.85, 0.66, ROOM[2] + 1.75], [ROOM[0] - 0.85, 0.66, ROOM[2] + 1.75]];

// ---------------- tracks (global time in seconds) ----------------
type Key = [number, number, number, number?];
const track = (keys: Key[]) => (t: number): V3 => {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][3] ?? 0, keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, z1, y1 = 0] = keys[i], [t0, x0, z0, y0 = 0] = keys[i - 1];
    if (t <= t1) { const k = t1 - t0 < 0.15 ? 1 : (t - t0) / (t1 - t0); return [lerp(x0, x1, k), lerp(y0, y1, k), lerp(z0, z1, k)]; }
  }
  const l = keys[keys.length - 1];
  return [l[1], l[3] ?? 0, l[2]];
};
export const ramuAt = track([
  [0, -2.2, 4.7], [23.9, -2.2, 4.7], [26.0, 2.6, 2.7], [72.4, 2.6, 2.7], [72.5, -3.5, 2.6], [75.7, 2.6, 2.7], [99.0, 2.6, 2.7],
  [99.05, 0.8, 8.0], [104.4, 6.2, 8.0], [104.5, 1.5, 10.0], [107.4, 6.0, 10.0], [107.5, 4.2, 6.2], [114.9, 4.2, 6.2],
  [115.0, 2.6, 2.7], [131.5, 2.6, 2.7], [131.6, -4.0, 2.6], [134.3, 2.6, 2.7], [138.3, 2.6, 2.7], [138.4, 3.2, 4.7], [168.0, 3.2, 4.7],
  [168.1, 2.8, 3.2], [201.9, 2.8, 3.2], [202.0, 2.0, 9.0], [214.1, 7.0, 9.0], [214.2, 4.0, 2.5], [283.3, 4.0, 2.5],
  [283.4, -1.5, 2.6], [286.0, 3.0, 2.7], [340.5, 3.0, 2.7],
]);
export const vidyaAt = track([
  [0, -8.0, -0.6], [25.9, -8.0, -0.6], [26.0, 3.7, 2.7], [72.4, 3.7, 2.7], [72.5, -4.6, 2.5], [75.7, 3.8, 2.8], [99.0, 3.8, 2.8],
  [99.05, -1.0, 2.6], [114.9, -1.0, 2.6], [115.0, 3.7, 2.7], [131.5, 3.7, 2.7], [131.6, -5.1, 2.5], [134.3, 3.8, 2.8], [138.3, 3.8, 2.8],
  [138.4, 4.3, 4.3], [168.0, 4.3, 4.3], [168.1, 3.7, 3.2], [201.9, 3.7, 3.2], [202.0, 6.0, 3.35], [214.1, 9.5, 3.35],
  [214.2, 5.0, 2.5], [283.3, 5.0, 2.5], [283.4, -2.6, 2.5], [286.0, 3.9, 2.7], [299.0, 3.9, 2.7], [299.1, 3.65, 2.7], [340.5, 3.65, 2.7],
]);
/** asleep in the bedroom set */
export const asleep = (t: number) => (t >= 56.4 && t < 62.9) || (t >= 236.8 && t < 243.2);

/** what the field looks like at t (+ growth 0..1 for the young corn and the vines) */
export type FieldState = { golden: boolean; destroyed: boolean; bare: boolean; young: number; vines: number; seedlings: boolean };
export const fieldAt = (t: number): FieldState => {
  const S = (o: Partial<FieldState>): FieldState => ({ golden: false, destroyed: false, bare: false, young: 0, vines: 0, seedlings: false, ...o });
  if (t < 72.5) return S({ golden: true });
  if (t < 99.0) return S({ destroyed: true });
  if (t < 107.5) return S({ bare: true, seedlings: t >= 105.5 });
  if (t < 115.0) return S({ bare: true, young: 0.06 + 0.94 * smooth((t - 107.5) / 7.3) });
  if (t < 131.6) return S({ young: 1 });
  if (t < 202.0) return S({ destroyed: true });
  if (t < 214.2) return S({ bare: true, vines: t >= 204.5 ? 0.15 : 0, seedlings: t >= 209 });
  if (t < 224.6) { const g = smooth((t - 214.2) / 10.3); return S({ bare: true, young: 0.06 + 0.94 * g, vines: 0.15 + 0.85 * g }); }
  return S({ golden: true, vines: 1 });
};

// ---------------- the boars ----------------
export const BOARS = 6;
/** boar i: position, facing (+1 = toward +x), face, karela-in-mouth, walking speed */
export type BoarState = { p: V3; dir: 1 | -1; face: "plain" | "sniff" | "chew" | "bitter" | "run"; karela: number; walk: number; head: number };
const OFF: [number, number][] = [[0, 0], [0.9, 1.4], [1.1, -1.3], [2.0, 0.5], [2.4, 2.4], [2.6, -2.2]];
export const boarAt = (i: number, t: number): BoarState | null => {
  const [ox, oz] = OFF[i], d = 0.35 * i;
  // the first two nights: dark shapes slipping into the corn (no faces)
  for (const [a, b] of [[66.0, 72.5], [128.8, 131.6]] as const) if (t >= a && t < b) {
    const u = (t - a) / (b - a);
    return { p: [lerp(20, 11.5, u) + ox, 0, 13 + oz], dir: -1, face: "plain", karela: 0, walk: 1, head: 0.2 };
  }
  if (t < 249.2 + d || t > 279) return null;
  const T0 = 249.2 + d, arrive = 255.4 + d, turn = 267.8 + 0.25 * i;
  const zz = 13 + oz, xs = 22 + ox, xv = VINE_X + 0.75 + 0.45 * ox;
  if (t < arrive) { const u = (t - T0) / (arrive - T0); return { p: [lerp(xs, xv, u), 0, zz], dir: -1, face: "plain", karela: 0, walk: 1, head: 0.1 }; }
  if (t < turn) {
    const bite = i === 0 ? 257.4 : 260.9 + 0.55 * i, bitter = i === 0 ? 260.4 : bite + 1.4;
    const face = t < bite ? "sniff" : t < bitter ? "chew" : "bitter";
    return { p: [xv + (t >= bitter ? 0.25 * Math.sin(t * 16) : 0), 0, zz], dir: -1, face, karela: t >= bite && t < bitter ? 1 : 0, walk: 0, head: face === "sniff" ? 0.6 : 0.25 };
  }
  const u = t - turn;
  return { p: [xv + 3.4 * u, 0, zz + 0.2 * u * (oz >= 0 ? 1 : -1)], dir: 1, face: "run", karela: 0, walk: 1, head: 0 };
};

// ---------------- what each person is doing ----------------
export type Act = { mode?: "stand" | "sit" | "stroll"; prop?: ["hoe" | "lota" | "seeds", number] | null; expr?: string; armsUp?: number; headTilt?: number };
export const ramuAct = (t: number): Act => {
  if (t < 23.9) return { prop: ["hoe", 0.5 + 0.5 * Math.sin(t * 3.2)] };
  if (t >= 99.05 && t < 104.5) return { prop: ["hoe", 0.5 + 0.5 * Math.sin(t * 3.4)], mode: "stroll" };
  if (t >= 104.5 && t < 107.5) return { prop: ["seeds", (t * 1.4) % 1], mode: "stroll" };
  if (t >= 107.5 && t < 115) return { prop: ["lota", 1] };
  if (t >= 138.4 && t < 168) return { mode: "sit" };
  if (t >= 202 && t < 214.2) return { prop: ["seeds", (t * 1.3) % 1], mode: "stroll" };
  return {};
};
export const vidyaAct = (t: number): Act => {
  if (t < 25.9) return { prop: ["lota", t > 21 ? 1 : 0.2] };
  if (t >= 202 && t < 214.2) return { mode: "sit" };
  if (t >= 169.7 && t < 175.7) return { headTilt: -0.22 };   // whispering in his ear
  return {};
};
/** faces per beat (toon Expr names) */
export const exprAt = (who: "R" | "V", t: number): string => {
  const L = LINES.find((l) => l[2] - 0.3 <= t && t < l[3] + 0.8);
  const id = L ? L[0] : "";
  if (who === "R") {
    const m: Record<string, string> = { R1: "laugh", V1: "smile_closed", R2: "grin", V2: "relief", R3: "shock", V3: "shock", V4: "nervous", R4: "pained", R5: "grin", V5: "smile",
      R6: "pained", V6: "nervous", V7: "nervous", R7: "shock", V8: "neutral", R8: "nervous", V9: "shock", R9: "laugh", V10: "grin", R10: "laugh", V11: "smile_closed", R11: "relief_open",
      R12: "laugh", V12: "grin", R13: "relief_open", V13: "relief" };
    if (m[id]) return m[id];
    if (t < 26) return "smile_closed";
    if (t >= 75.8 && t < 99) return "pained";
    if (t >= 134.4 && t < 158) return "pained";
    if (t >= 286) return "laugh";
    return "smile";
  }
  const m: Record<string, string> = { R1: "grin", V1: "smile_closed", R2: "smile", V2: "relief", R3: "shock", V3: "shock", V4: "nervous", R4: "nervous", R5: "smile", V5: "smile_closed",
    R6: "nervous", V6: "smile", V7: "relief_open", R7: "grin", V8: "smile", R8: "smile", V9: "grin", R9: "grin", V10: "smile_closed", R10: "grin", V11: "smile_closed", R11: "relief",
    R12: "grin", V12: "relief_open", R13: "relief", V13: "relief" };
  if (m[id]) return m[id];
  if (t < 26) return "smile_closed";
  if (t >= 155.9 && t < 158.4) return "whistle";  // thinking...
  if (t >= 75.8 && t < 99) return "nervous";
  return "smile";
};

// ---------------- shots ----------------
export type Mood = "dawn" | "day" | "warm" | "evening" | "night" | "gloom" | "sunrise";
export type ShotDef = { id: number; a: number; b: number; light: "day" | "golden"; mood: Mood; crowd: string; tau: (t: number) => number; sunAz?: number; sunEl?: number };
type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Plan = { t: number; mood: Mood; cam: (u: number, t: number) => Cam; dof?: number; focus?: (t: number) => V3; kind?: string };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mid = (a: V3, b: V3, k = 0.5): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const mixV = (a: V3, b: V3, k: number): V3 => mid(a, b, k);
/** camera on a sphere around a target: yaw 0 = lens at -z looking +z (toward the field), +yaw swings to +x */
const orbit = (tg: V3, d: number, yaw: number, pitch: number, fov: number, roll = 0): Cam => {
  const y = (yaw * Math.PI) / 180, p = (pitch * Math.PI) / 180;
  return { pos: [tg[0] + d * Math.sin(y) * Math.cos(p), tg[1] + d * Math.sin(p), tg[2] - d * Math.cos(y) * Math.cos(p)], look: tg, fov, roll };
};
const R = (t: number) => ramuAt(t), Vd = (t: number) => vidyaAt(t);
const hR = (t: number, h = 1.5): V3 => add(R(t), [0, h, 0]);
const hV = (t: number, h = 1.42): V3 => add(Vd(t), [0, h, 0]);
const two = (t: number, y = 1.2): V3 => { const a = R(t), b = Vd(t); return [(a[0] + b[0]) / 2, y, (a[2] + b[2]) / 2]; };
const FC: V3 = [(FIELD[0] + FIELD[1]) / 2, 1.0, (FIELD[2] + FIELD[3]) / 2];
const boarLead = (t: number): V3 => { const b = boarAt(0, t); return b ? add(b.p, [0, 0.55, 0]) : [VINE_X + 0.8, 0.55, 13]; };
const glide = (a: Cam, b: Cam, u: number): Cam => ({ pos: mixV(a.pos, b.pos, smooth(u)), look: mixV(a.look, b.look, smooth(u)), fov: lerp(a.fov, b.fov, smooth(u)), roll: lerp(a.roll, b.roll, smooth(u)) });
const CU = 28, MS = 30, TWO = 32, WIDE = 38;

const PLANS: Plan[] = [
  // ---- 01 the village at sunrise, drone down to the house
  { t: 0, mood: "dawn", cam: (u) => glide({ pos: [-55, 34, -48], look: [-8, 2, 6], fov: 40, roll: 0 }, { pos: [-30, 16, -24], look: [-11, 2, 3], fov: 38, roll: 0 }, u), dof: 0, kind: "wide" },
  { t: 8.0, mood: "dawn", cam: (u) => glide({ pos: [20, 18, -14], look: [2, 1, 10], fov: 40, roll: 0 }, { pos: [-1, 9, -12], look: [-8, 1.2, 3], fov: 38, roll: 0 }, u), dof: 0, kind: "wide" },
  // ---- 02 Ramu works the field, Vidya in the courtyard, a smile across
  { t: 14.7, mood: "day", cam: (u, t) => orbit(hR(t, 1.1), 7.5 - 2.5 * u, -25, 6, WIDE), dof: 4, focus: (t) => hR(t, 1.2) },
  { t: 19.6, mood: "day", cam: (u, t) => orbit(hV(t, 1.0), 6.0 - 1.4 * u, 35, 5, WIDE), dof: 5, focus: (t) => hV(t, 1.1) },
  { t: 23.0, mood: "day", cam: (u, t) => orbit(hR(t), 2.2 - 0.15 * u, -40, 0, CU), dof: 10, focus: (t) => hR(t) },
  { t: 24.6, mood: "day", cam: (u, t) => orbit(hV(t), 2.1 - 0.15 * u, 40, 0, CU), dof: 10, focus: (t) => hV(t) },
  // ---- 03 the golden harvest: pan, a cob close-up, the happy plans
  { t: 26.0, mood: "warm", cam: (u) => ({ pos: [lerp(-4, 12, u), 3.4, -2.5], look: [lerp(0, 10, u), 1.6, 12], fov: 36, roll: 0 }), dof: 2, kind: "wide" },
  { t: 29.2, mood: "warm", cam: (u) => orbit([1.2, 1.25, 4.4], 0.85 - 0.1 * u, -15, 4, 30), dof: 14, focus: () => [1.2, 1.25, 4.4] },
  { t: 31.0, mood: "warm", cam: (u, t) => orbit(two(t, 1.35), 5.0 - 0.5 * u, 12, 5, TWO), dof: 5, focus: (t) => two(t, 1.4) },
  { t: 35.8, mood: "warm", cam: (u, t) => orbit(hV(t), 2.2 - 0.2 * u, 30, 0, CU), dof: 10, focus: (t) => hV(t) },
  { t: 40.5, mood: "warm", cam: (u, t) => orbit(hR(t), 2.3 - 0.25 * u, -30, 0, CU), dof: 10, focus: (t) => hR(t) },
  { t: 45.0, mood: "warm", cam: (u, t) => orbit(two(t, 1.4), 4.6 - 0.4 * u, -12, 3, TWO), dof: 6 },
  { t: 49.8, mood: "warm", cam: (u, t) => orbit(hV(t), 2.0 - 0.15 * u, 25, 0, CU), dof: 10, focus: (t) => hV(t) },
  // ---- 04 evening, then asleep
  { t: 52.6, mood: "evening", cam: (u) => glide({ pos: [-24, 6, -14], look: [-6, 2, 8], fov: 40, roll: 0 }, { pos: [-22, 5, -10], look: [-11, 1.6, 2], fov: 36, roll: 0 }, u), dof: 0, kind: "wide" },
  { t: 56.4, mood: "night", cam: (u) => orbit(add(ROOM, [0, 0.8, 1.4]), 3.8 - 0.5 * u, -8, 22, 40), dof: 3, focus: () => add(ROOM, [0, 0.7, 1.4]), kind: "room" },
  // ---- 05 the moonlit field: something moves
  { t: 62.9, mood: "night", cam: (u) => ({ pos: [lerp(-2, 6, u), 4.5, -6], look: [lerp(6, 10, u), 1.2, 13], fov: 38, roll: 0 }), dof: 0, kind: "wide" },
  { t: 68.4, mood: "night", cam: (u) => orbit([14.5, 1.1, 13], 6.5 - 1.0 * u, 70, 8, 34), dof: 4, focus: () => [12, 1, 13] },
  // ---- 06 the morning: the field destroyed
  { t: 72.5, mood: "gloom", cam: (u) => glide({ pos: [4, 22, -26], look: [4, 0.5, 12], fov: 40, roll: 0 }, { pos: [3, 5, -5], look: [4, 0.6, 9], fov: 38, roll: 0 }, u), dof: 0, kind: "wide" },
  { t: 75.8, mood: "gloom", cam: (u, t) => orbit(hR(t), 2.1 - 0.25 * u, -20, 2, CU), dof: 11, focus: (t) => hR(t) },
  { t: 80.2, mood: "gloom", cam: (u, t) => orbit(hV(t), 2.1 - 0.2 * u, 22, 2, CU), dof: 11, focus: (t) => hV(t) },
  // ---- 07 "what now?" - "I will farm again"
  { t: 84.6, mood: "gloom", cam: (u, t) => orbit(hV(t, 1.3), 3.0 - 0.3 * u, 28, 0, MS), dof: 8, focus: (t) => hV(t) },
  { t: 90.3, mood: "gloom", cam: (u, t) => orbit(hR(t), 2.2 - 0.3 * u, -25, 0, CU), dof: 11, focus: (t) => hR(t) },
  { t: 94.8, mood: "gloom", cam: (u, t) => orbit(two(t, 1.3), 5.5 - 0.6 * u, -14, 7, TWO), dof: 4, focus: (t) => two(t, 1.3) },
  // ---- 08 time-lapse: plough, sow, water, the corn grows
  { t: 99.0, mood: "day", cam: (u, t) => orbit(hR(t, 1.0), 7.0, -20, 10, WIDE), dof: 3, focus: (t) => hR(t, 1.0) },
  { t: 104.5, mood: "day", cam: (u, t) => orbit(hR(t, 1.1), 4.2, -55, 6, MS), dof: 6, focus: (t) => hR(t, 1.1) },
  { t: 107.5, mood: "day", cam: (u, t) => orbit(hR(t, 0.9), 3.6, 35, 6, MS), dof: 6, focus: (t) => hR(t, 1.0) },
  { t: 110.0, mood: "day", cam: (u) => ({ pos: [-3, 2.2 + 3 * u, -3], look: [5, 0.8 + 0.4 * u, 12], fov: 38, roll: 0 }), dof: 0, kind: "wide" },
  // ---- 09 the second crop: hope
  { t: 115.0, mood: "warm", cam: (u, t) => orbit(two(t, 1.4), 4.4 - 0.4 * u, -15, 3, TWO), dof: 6 },
  { t: 122.1, mood: "warm", cam: (u, t) => orbit(hV(t), 2.1 - 0.15 * u, 25, 0, CU), dof: 10, focus: (t) => hV(t) },
  // ---- 10 night again; the morning after
  { t: 126.4, mood: "night", cam: (u) => ({ pos: [lerp(-16, -10, u), 6, -12], look: [lerp(0, 8, u), 1.2, 12], fov: 40, roll: 0 }), dof: 0, kind: "wide" },
  { t: 131.6, mood: "gloom", cam: (u, t) => orbit(two(t, 1.2), 6.0, -60, 6, WIDE), dof: 3 },
  { t: 134.4, mood: "gloom", cam: (u) => glide({ pos: [4, 12, -12], look: [4, 0.4, 10], fov: 40, roll: 0 }, { pos: [3.5, 4, -3], look: [4, 0.4, 8], fov: 36, roll: 0 }, u), dof: 0, kind: "wide" },
  // ---- 11 Ramu gives up; Vidya won't let him
  { t: 138.4, mood: "gloom", cam: (u, t) => orbit(hR(t, 0.9), 4.2 - 0.8 * u, -10, 10, MS), dof: 7, focus: (t) => hR(t, 0.9) },
  { t: 141.3, mood: "gloom", cam: (u, t) => orbit(hR(t, 0.95), 2.0 - 0.3 * smooth(u), -25, 4, CU), dof: 12, focus: (t) => hR(t, 0.95) },
  { t: 151.4, mood: "gloom", cam: (u, t) => orbit(mid(hR(t, 0.9), hV(t, 1.3)), 3.6 - 0.3 * u, 20, 6, TWO), dof: 6 },
  // ---- 12 Vidya's idea
  { t: 155.9, mood: "day", cam: (u, t) => orbit(hV(t), 2.6 - 0.6 * smooth(u), 30, 0, CU), dof: 11, focus: (t) => hV(t) },
  { t: 165.6, mood: "day", cam: (u, t) => orbit(hR(t, 0.95), 2.0, -30, 4, CU), dof: 11, focus: (t) => hR(t, 0.95) },
  // ---- 13 the whisper (over the shoulder), the explanation
  { t: 169.6, mood: "day", cam: (u, t) => ({ pos: add(R(t), [-0.8, 1.65, -1.1]), look: hV(t, 1.4), fov: 30, roll: 0.02 }), dof: 9, focus: (t) => hV(t) },
  { t: 176.2, mood: "day", cam: (u, t) => orbit(hR(t), 2.1, -28, 0, CU), dof: 11, focus: (t) => hR(t) },
  { t: 180.5, mood: "day", cam: (u, t) => orbit(hV(t, 1.3), 3.0 - 0.4 * u, 30, 2, MS), dof: 8, focus: (t) => hV(t) },
  // ---- 14 hope returns
  { t: 190.2, mood: "warm", cam: (u, t) => orbit(hR(t), 2.2 - 0.2 * u, -30, 0, CU), dof: 11, focus: (t) => hR(t) },
  { t: 197.8, mood: "warm", cam: (u, t) => orbit(two(t, 1.4), 4.2 - 0.3 * u, 10, 3, TWO), dof: 6 },
  // ---- 15 the new plan: karela vines on the bund, corn inside
  { t: 202.0, mood: "day", cam: (u) => ({ pos: [lerp(0, 6, u), 4.5, -4.5], look: [lerp(5, 8, u), 0.4, 7], fov: 38, roll: 0 }), dof: 0, kind: "wide" },
  { t: 208.5, mood: "day", cam: (u, t) => orbit(hV(t, 0.8), 3.2, 20, 12, MS), dof: 7, focus: (t) => hV(t, 0.8) },
  // ---- 16 montage: the vines climb over the bund, the corn rises
  { t: 214.2, mood: "day", cam: (u) => orbit([8, 0.45, 3.3], 1.6, -20, 12, 30), dof: 12, focus: () => [8, 0.45, 3.3] },
  { t: 218.5, mood: "day", cam: (u) => ({ pos: [-3, 2.0 + 2 * u, -2.5], look: [5, 0.9, 12], fov: 38, roll: 0 }), dof: 0, kind: "wide" },
  { t: 222.6, mood: "day", cam: (u) => orbit([VINE_X, 0.5, 8], 3.0, 80, 10, 32), dof: 6, focus: () => [VINE_X, 0.5, 8] },
  // ---- 17 crane up over the whole field
  { t: 224.6, mood: "warm", cam: (u, t) => ({ pos: [lerp(4.5, 4.5, u), lerp(1.8, 13, smooth(u)), lerp(-2.5, -9, smooth(u))], look: [4.5, lerp(1.3, 0.5, u), lerp(3, 12, smooth(u))], fov: 40, roll: 0 }), dof: 2, kind: "wide" },
  { t: 228.9, mood: "warm", cam: (u, t) => orbit(hV(t), 2.1, 25, 0, CU), dof: 10, focus: (t) => hV(t) },
  { t: 233.5, mood: "warm", cam: (u, t) => orbit(hR(t), 2.1 - 0.15 * u, -25, 0, CU), dof: 10, focus: (t) => hR(t) },
  // ---- 18 that night again
  { t: 236.8, mood: "night", cam: (u) => orbit(add(ROOM, [0, 0.8, 1.4]), 3.6 - 0.4 * u, 10, 24, 40), dof: 3, focus: () => add(ROOM, [0, 0.7, 1.4]), kind: "room" },
  { t: 243.2, mood: "night", cam: (u) => orbit([20, 1.2, 13], 9.0 - 1.5 * u, 60, 6, 36), dof: 3, focus: () => [20, 1, 13] },
  // ---- 19 the boars come out (low tracking)
  { t: 249.2, mood: "night", cam: (u, t) => ({ pos: add(boarLead(t), [-1.0, -0.2, -4.2]), look: add(boarLead(t), [0.4, 0.15, 0]), fov: 34, roll: 0 }), dof: 6, focus: (t) => boarLead(t), kind: "boars" },
  { t: 253.6, mood: "night", cam: (u) => orbit([VINE_X + 1.2, 0.6, 13], 3.8 - 0.6 * u, 130, 4, 34), dof: 6, focus: () => [VINE_X + 1.2, 0.6, 13], kind: "boars" },
  // ---- 20 a karela bite... the bitter face
  { t: 257.4, mood: "night", cam: (u) => orbit(add(boarLead(257.4), [-0.4, 0.15, 0]), 2.6 - 0.2 * u, 150, 2, 30), dof: 12, focus: () => add(boarLead(257.4), [-0.4, 0.15, 0]), kind: "boars" },
  { t: 260.4, mood: "night", cam: (u) => orbit(add(boarLead(260.4), [-0.4, 0.15, 0]), 2.3 - 0.15 * u, 165, 0, 28, 0.03 * Math.sin(u * 40)), dof: 13, focus: () => add(boarLead(260.4), [-0.4, 0.15, 0]), kind: "boars" },
  { t: 262.2, mood: "night", cam: (u) => orbit([VINE_X + 1.6, 0.6, 13], 4.6, 140, 6, 34), dof: 5, focus: () => [VINE_X + 1.6, 0.6, 13], kind: "boars" },
  { t: 266.2, mood: "night", cam: (u) => { const b = boarAt(2, 266.2)!; return orbit(add(b.p, [-0.4, 0.7, 0]), 2.3, 155, 0, 28); }, dof: 13, focus: () => { const b = boarAt(2, 266.2)!; return add(b.p, [-0.4, 0.7, 0]); }, kind: "boars" },
  // ---- 21 they run; the field is safe
  { t: 268.2, mood: "night", cam: (u) => orbit([VINE_X + 4, 0.8, 13], 8.5, 100, 8, 36), dof: 3, kind: "boars" },
  { t: 275.6, mood: "night", cam: (u) => ({ pos: [lerp(16, 10, u), 4.0, -5], look: [5, 1.4, 12], fov: 38, roll: 0 }), dof: 0, kind: "wide" },
  // ---- 22 sunrise: the whole field safe
  { t: 283.4, mood: "sunrise", cam: (u) => glide({ pos: [4, 26, -30], look: [4, 1, 12], fov: 40, roll: 0 }, { pos: [3.5, 5, -6], look: [3.5, 1.2, 4], fov: 38, roll: 0 }, u), dof: 0, kind: "wide" },
  { t: 286.2, mood: "sunrise", cam: (u, t) => orbit(two(t, 1.4), 4.4 - 0.4 * u, -10, 3, TWO), dof: 6 },
  { t: 293.4, mood: "sunrise", cam: (u, t) => orbit(hV(t), 2.1 - 0.15 * u, 25, 0, CU), dof: 10, focus: (t) => hV(t) },
  // ---- 23 together; laughter
  { t: 299.0, mood: "sunrise", cam: (u, t) => orbit(two(t, 1.35), 3.6 - 0.4 * u, 8, 2, TWO), dof: 7 },
  { t: 307.9, mood: "sunrise", cam: (u, t) => orbit(two(t, 1.45), 2.6 - 0.2 * u, -8, 0, CU + 2), dof: 10 },
  // ---- 24 the wide golden ending: the camera rises over the field
  { t: 313.3, mood: "sunrise", cam: (u, t) => ({ pos: [lerp(3.4, 3.4, u), lerp(1.6, 16, smooth(u)), lerp(-3.4, -14, smooth(u))], look: [3.6, lerp(1.4, 0.6, u), lerp(2.7, 11, smooth(u))], fov: 40, roll: 0 }), dof: 2, kind: "wide" },
];
export const SHOTS: ShotDef[] = PLANS.map((p, i) => ({
  id: i + 1, a: F(p.t), b: i + 1 < PLANS.length ? F(PLANS[i + 1].t) : TOTAL, light: "day", mood: p.mood,
  crowd: p.kind ?? "", tau: (t: number) => t,
}));
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const FADE_AT = F(336.8);
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];
const KICKS: number[] = [F(75.85), F(260.45), F(268.3)];
export const kickAt = (f: number) => { let a = 0; for (const k of KICKS) { const n = f - k; if (n >= 0 && n < 6) a += (n % 2 ? -1 : 1) * (1 - n / 6) ** 1.5; } return a; };
export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1], p = PLANS[id - 1], u = clamp01((f - s.a) / Math.max(1, s.b - s.a)), t = f / FPS;
  const c = p.cam(u, t), a = kickAt(f);
  return a ? { ...c, look: [c.look[0] + 0.02 * a, c.look[1] + 0.015 * a, c.look[2]], roll: c.roll + a * 0.01 } : c;
};
export const segmentOf = (id: number, _f: number): [number, number] => [SHOTS[id - 1].a, SHOTS[id - 1].b];
export const SUN_SEG: Record<string, { az: number; el: number }> = {};
export const dofAt = (f: number) => {
  const s = shotAt(f), p = PLANS[s.id - 1];
  return { cInf: p.dof ?? 6, focus: (ff?: number) => (p.focus ? p.focus((ff ?? f) / FPS) : camAt(s.id, ff ?? f).look) };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
export { LINES };
