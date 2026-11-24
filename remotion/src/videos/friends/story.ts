// "Two Friends and the Bear" (दो दोस्त और भालू) — the user's story, Hindi narration (ElevenLabs, Ahamed Ansari, take A,
// 185.6 s). Everything is timed to shorts/friends/voice/words.json (seconds below are word starts from it).
// One world along the jungle path (x): village (-75..-50), jungle (-40..30), the clearing with Ram's tree (~40).
export const FPS = 30;
export const TOTAL = 5640; // 188 s: voice 185.6 s + a held last shot
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const F = (t: number) => Math.round(t * FPS);

// ---------------- places ----------------
export const HUT: V3 = [-66, 0, 5.5];          // Grandma's hut (memory shot)
export const BUSH: V3 = [13.6, 0, 4.2];      // the rustling bush (rabbit)
export const PERCH: V3 = [14.6, 3.55, 2.6];   // the hornbill's branch
export const TREE: V3 = [40, 0, 5.5];         // Ram's tree (trunk base)
export const BRANCH: V3 = [38.85, 3.35, 5.3]; // where Ram sits
export const BEAR_BUSH: V3 = [47, 0, -3.4];
export const LIE_X = 35.6;                    // Shyam's middle while he lies on the path

// ---------------- tracks (global time in seconds) ----------------
type Key = [number, number, number, number?]; // t, x, z, y
const track = (keys: Key[]) => (t: number): V3 => {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][3] ?? 0, keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, z1, y1 = 0] = keys[i], [t0, x0, z0, y0 = 0] = keys[i - 1];
    if (t <= t1) { const k = t1 - t0 < 0.15 ? 1 : (t - t0) / (t1 - t0); return [lerp(x0, x1, k), lerp(y0, y1, k), lerp(z0, z1, k)]; }
  }
  const l = keys[keys.length - 1];
  return [l[1], l[3] ?? 0, l[2]];
};
export const ramAt = track([
  [0, -62.7, 0], [13.25, -62.7, 0], [13.3, -50.2, 0.25], [18.6, -48.7, 0.25], [18.7, -47.9, 0.2], [29.65, -47.9, 0.2],
  [29.7, -31.5, 0.15], [37.9, -26.0, 0.15], [38.0, -9, 0.15], [44.8, -2.5, 0.15], [44.9, 9.9, 0.15], [49.6, 9.9, 0.15],
  [53.2, 11.9, 0.15], [71.6, 11.9, 0.15], [71.7, 34.5, 0.1], [83.1, 34.5, 0.1], [85.6, 39.5, 4.82],
  [86.2, 39.5, 4.82, 0], [88.8, 39.2, 4.95, 3.0], [89.3, BRANCH[0], BRANCH[2], BRANCH[1]], [143.0, BRANCH[0], BRANCH[2], BRANCH[1]],
  [143.3, 39.3, 4.95, 2.9], [144.7, 39.5, 4.82, 0], [145.8, 37.5, 1.5], [188, 37.5, 1.5],
]);
export const shyamAt = track([
  [0, -61.3, 0], [13.25, -61.3, 0], [13.3, -51.5, -0.15], [18.6, -50.0, -0.15], [18.7, -46.7, 0.2], [29.65, -46.7, 0.2],
  [29.7, -33.2, -0.1], [37.9, -27.6, -0.1], [38.0, -10.6, -0.1], [44.8, -4.1, -0.1], [44.9, 8.6, -0.1], [53.2, 8.6, -0.1],
  [58.0, 10.6, -0.1], [71.6, 10.6, -0.1], [71.7, 33.2, -0.1], [98.0, 33.2, -0.1], [104.4, 35.6, 0], [175.8, 35.6, 0],
  [188, 27.4, -0.1],
]);
/** bear: centre of the side card; facing is the sign of its motion (default: toward the boys, -x) */
export const bearAt = track([
  [72.6, 47.6, -3.4], [75.3, 43.2, -1.6], [110.2, 43.2, -1.6], [112.1, 37.7, 0.9], [113.5, 36.9, 0.9], [115.0, 36.15, 0.9],
  [120.9, 36.15, 0.9], [122.4, 35.95, 0.9], [133.7, 35.95, 0.9], [135.3, 36.3, 1.0], [140.5, 46.5, 5.5],
]);
export const bearShown = (t: number) => t >= 72.6 && t < 140.5;
export const bearFacing = (t: number) => (t >= 134.6 && t < 141 ? 1 : -1);
/** 0 level .. 1 head down at the ground (sniffing / whispering) */
export const bearHead = (t: number) => (t >= 111.6 && t < 116.0 ? 0.85 : t >= 121.0 && t < 133.8 ? 0.75 : t >= 74.0 && t < 75.5 ? -0.3 : 0);
export const shyamLying = (t: number) => t >= 106.1 && t < 153.4;
/** Ram's jumps: [take-off s, height m] (the three false alarms) */
export const JUMPS: [number, number][] = [[47.2, 0.45], [53.75, 0.9], [61.4, 1.55]];
export const jumpAt = (t: number) => {
  for (const [t0, h] of JUMPS) { const d = 0.38 + 0.25 * h, u = (t - t0) / d; if (u >= 0 && u < 1) return h * 4 * u * (1 - u); }
  return 0;
};
/** spoken lines: who moves their mouth on which word span (seconds) */
export const LINES: [string, number, number][] = [
  ["R", 18.8, 23.97], ["S", 24.35, 25.25], ["R", 32.45, 34.3], ["R", 35.05, 37.7], ["G", 100.65, 104.2],
  ["R", 146.9, 152.6], ["S", 156.4, 159.0], ["S", 160.3, 165.4],
];

// ---------------- shots ----------------
export type Mood = "morning" | "jungle" | "dread" | "warm" | "golden" | "memory";
export type ShotDef = { id: number; a: number; b: number; light: "day" | "golden"; mood: Mood; crowd: string; tau: (t: number) => number;
  sunAz?: number; sunEl?: number; memory?: boolean };
type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Plan = { t: number; mood: Mood; cam: (u: number, t: number) => Cam; dof?: number; focus?: (t: number) => V3; kind?: string; sunAz?: number; sunEl?: number };

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mid = (a: V3, b: V3, k = 0.5): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** camera on a sphere around a target: yaw 0 = lens at -z looking +z, +yaw swings to +x; pitch + = above */
const orbit = (tg: V3, d: number, yaw: number, pitch: number, fov: number, roll = 0): Cam => {
  const y = (yaw * Math.PI) / 180, p = (pitch * Math.PI) / 180;
  return { pos: [tg[0] + d * Math.sin(y) * Math.cos(p), tg[1] + d * Math.sin(p), tg[2] - d * Math.cos(y) * Math.cos(p)], look: tg, fov, roll };
};
const head = (p: V3, h = 1.55): V3 => [p[0], p[1] + h, p[2]];
const R = (t: number) => ramAt(t), S = (t: number) => shyamAt(t), B = (t: number) => bearAt(t);
const two = (t: number, y = 1.25): V3 => { const r = R(t), s = S(t); return [(r[0] + s[0]) / 2, y, (r[2] + s[2]) / 2]; };
const shyamHeadLying = (): V3 => [LIE_X - 0.78, 0.28, 0];

const PLANS: Plan[] = [
  // ---- the village morning: friends since five, the secret handshake ----
  { t: 0, mood: "morning", cam: (u, t) => orbit(two(t, 1.2), 9.5 - 1.2 * u, -18, 9, 42), dof: 3, kind: "wide" },
  { t: 3.4, mood: "morning", cam: (u, t) => orbit(two(t, 1.35), 4.2 - 0.5 * u, 8, 2, 40), dof: 7 },
  { t: 5.35, mood: "morning", cam: (u, t) => orbit(two(t, 1.15), 1.25 - 0.15 * u, 0, 6, 38, 0.03), dof: 14, kind: "hands1" },
  { t: 8.9, mood: "morning", cam: (u, t) => orbit(two(t, 1.4), 3.4 - 0.4 * u, -12, 4, 40), dof: 8 },
  { t: 13.2, mood: "morning", cam: (u, t) => orbit(two(t, 1.3), 9 - 1.0 * u, 102, 6, 44), dof: 3, kind: "wide" },
  { t: 18.7, mood: "morning", cam: (u, t) => orbit(head(R(t)), 2.0 - 0.25 * u, 28, 2, 36, -0.03), dof: 12, focus: (t) => head(R(t)) },
  { t: 23.1, mood: "morning", cam: (u, t) => orbit(head(S(t), 1.5), 2.0 - 0.25 * u, -28, 2, 36, 0.03), dof: 12, focus: (t) => head(S(t), 1.5) },
  { t: 26.15, mood: "morning", cam: (u, t) => orbit(two(t, 1.15), 1.25 - 0.15 * u, 0, 6, 38, -0.03), dof: 14, kind: "hands2" },
  // ---- into the jungle ----
  { t: 29.65, mood: "jungle", cam: (u, t) => orbit(two(t, 1.3), 6.5, -70, 5, 40), dof: 6 },
  { t: 32.4, mood: "jungle", cam: (u, t) => orbit(head(R(t), 1.45), 2.3 - 0.3 * u, 35, -16, 40, 0.05), dof: 10, focus: (t) => head(R(t)) },
  { t: 37.95, mood: "jungle", cam: (u, t) => orbit(two(t, 3.0), 17 - 2 * u, -100, 6, 48), dof: 2, kind: "wide" },
  // ---- three false alarms ----
  { t: 44.85, mood: "jungle", cam: (u) => orbit(add(BUSH, [0, 0.8, 0]), 3.2 - 0.6 * u, -20, 6, 38), dof: 9, focus: () => add(BUSH, [0, 0.8, 0]) },
  { t: 46.9, mood: "jungle", cam: (u, t) => orbit(head(R(t), 1.1), 3.2, -15, 0, 40, 0.06), dof: 8, focus: (t) => head(R(t)) },
  { t: 48.2, mood: "jungle", cam: (u) => orbit(add(BUSH, [-1.0, 0.3, -1.8]), 2.0 - 0.2 * u, -30, 4, 36), dof: 12, focus: () => add(BUSH, [-1.0, 0.3, -1.8]) },
  { t: 49.6, mood: "jungle", cam: (u, t) => orbit(two(t, 1.3), 5.5 - 0.6 * u, -60, 3, 40), dof: 6 },
  { t: 53.2, mood: "jungle", cam: (u, t) => orbit(head(R(t), 1.3), 3.6, 10, -4, 42, -0.06), dof: 8, focus: (t) => head(R(t)) },
  { t: 54.75, mood: "jungle", cam: (u, t) => orbit(head(S(t), 1.2), 1.9 - 0.2 * u, -30, 0, 36), dof: 12, focus: (t) => head(S(t), 1.4) },
  { t: 58.0, mood: "jungle", cam: (u, t) => ({ pos: add(two(t, 0.6), [-1.6, 0, -2.4]), look: add(two(t, 4.6), [1.5, 0, 1.2]), fov: 58, roll: 0.08 }), dof: 0 },
  { t: 60.95, mood: "jungle", cam: (u, t) => orbit(head(R(t), 1.6), 5.2, 15, -3, 44), dof: 6, focus: (t) => head(R(t)) },
  { t: 64.95, mood: "jungle", cam: (u) => orbit(add(PERCH, [0, 0.4, 0]), 2.7 - 0.3 * u, -25, -4, 36), dof: 12, focus: () => add(PERCH, [0, 0.4, 0]) },
  { t: 69.1, mood: "jungle", cam: (u, t) => orbit(head(S(t), 1.45), 2.0, -35, 0, 36), dof: 12, focus: (t) => head(S(t), 1.45) },
  { t: 70.45, mood: "jungle", cam: (u, t) => orbit(head(R(t), 1.5), 1.9, 30, 0, 36), dof: 12, focus: (t) => head(R(t)) },
  // ---- the bear ----
  { t: 71.65, mood: "dread", cam: (u) => orbit([45.2, 1.1, -2.4], 7.0 - 1.6 * u, -55, 3, 40), dof: 7, focus: () => [45.5, 1.0, -2.6] },
  { t: 75.5, mood: "dread", cam: (u, t) => orbit(add(B(t), [-1.0, 1.15, 0]), 2.4 - 0.4 * u, -62, -6, 38, -0.05), dof: 12, focus: (t) => add(B(t), [-1.0, 1.1, 0]) },
  { t: 76.6, mood: "dread", cam: (u, t) => orbit(mid(two(t, 1.0), add(B(t), [0, 1.0, 0])), 9.5 + 1.0 * u, -96, 10, 44), dof: 3, kind: "wide" },
  { t: 79.2, mood: "dread", cam: (u, t) => orbit(two(t, 1.45), 3.0 - 0.15 * u, -40, 0, 40), dof: 9 },
  { t: 81.2, mood: "dread", cam: (u, t) => orbit(head(R(81.6), 1.1), 4.2, -30, 2, 42), dof: 7, focus: (t) => head(R(t), 1.1) },
  { t: 83.85, mood: "dread", cam: (u, t) => orbit([39.4, 1.9, 4.9], 5.2, -15, 4, 44), dof: 6, focus: (t) => head(R(t), 1.0) },
  { t: 89.3, mood: "dread", cam: (u) => orbit(add(BRANCH, [0, 0.45, 0]), 3.2 - 0.3 * u, -10, -6, 38), dof: 11, focus: () => add(BRANCH, [0, 0.45, 0]) },
  { t: 92.7, mood: "dread", cam: (u, t) => orbit(head(S(t), 1.3), 6.5 - 2.6 * smooth(u), 20, 6, 42), dof: 8, focus: (t) => head(S(t), 1.45) },
  // ---- the memory: Grandma ----
  { t: 98.2, mood: "memory", cam: (u) => orbit(add(HUT, [0, 1.0, -2.2]), 3.2 - 0.4 * u, 12, 4, 40), dof: 9, focus: () => add(HUT, [0, 1.0, -2.2]), kind: "memory" },
  // ---- playing dead ----
  { t: 104.35, mood: "dread", cam: (u, t) => orbit([LIE_X, 0.5, 0], 6.0 - 0.5 * u, -20, 14, 42), dof: 6 },
  { t: 107.15, mood: "dread", cam: (u) => orbit(shyamHeadLying(), 2.5 - 0.3 * u, -5, 58, 38), dof: 12, focus: () => shyamHeadLying() },
  { t: 110.1, mood: "dread", cam: (u, t) => ({ pos: [LIE_X - 2.6, 0.55, -1.3], look: add(B(t), [0, 0.75, 0]), fov: 44, roll: 0.03 }), dof: 6, focus: (t) => add(B(t), [-1.0, 0.8, 0]) },
  { t: 112.0, mood: "dread", cam: (u) => orbit([LIE_X + 0.85, 0.35, 0.2], 1.7, -20, 12, 38), dof: 12, focus: () => [LIE_X + 0.85, 0.35, 0.2] },
  { t: 113.45, mood: "dread", cam: (u) => orbit([LIE_X + 0.1, 0.35, 0.1], 1.7, -15, 14, 38), dof: 12, focus: () => [LIE_X + 0.1, 0.35, 0.1] },
  { t: 114.95, mood: "dread", cam: (u) => orbit([LIE_X - 0.7, 0.4, 0.2], 1.8, -10, 16, 38), dof: 12, focus: () => [LIE_X - 0.7, 0.4, 0.2] },
  { t: 116.1, mood: "dread", cam: (u) => ({ pos: add(BRANCH, [0.15, 0.4, -0.05]), look: [LIE_X + 0.3 * u, 0.3, 0.3], fov: 46, roll: -0.04 }), dof: 4, focus: () => [LIE_X, 0.3, 0.2], kind: "fromTree" },
  { t: 120.85, mood: "dread", cam: (u) => orbit([LIE_X - 0.85, 0.42, 0.25], 2.6 - 1.3 * smooth(u), -12, 9, 38), dof: 14, focus: () => [LIE_X - 0.85, 0.42, 0.25], kind: "whisper" },
  { t: 129.5, mood: "dread", cam: (u) => orbit(shyamHeadLying(), 2.2 - 0.2 * u, 0, 60, 36), dof: 13, focus: () => shyamHeadLying() },
  { t: 133.65, mood: "dread", cam: (u, t) => orbit([39.5, 1.0, 1.5], 9.0, -30, 8, 42), dof: 4, focus: (t) => add(B(t), [0, 0.9, 0]) },
  // ---- Ram comes down ----
  { t: 138.15, mood: "warm", cam: (u) => orbit(add(BRANCH, [0, 0.45, 0]), 3.2, 15, -6, 38), dof: 10, focus: () => add(BRANCH, [0, 0.45, 0]) },
  { t: 142.95, mood: "warm", cam: (u, t) => orbit([39.0, 1.5, 4.0], 5.0, -18, 4, 42), dof: 6, focus: (t) => head(R(t), 1.2) },
  { t: 146.85, mood: "warm", cam: (u, t) => orbit(head(R(t), 1.5), 2.1 - 0.2 * u, 30, 0, 36), dof: 12, focus: (t) => head(R(t)) },
  { t: 153.2, mood: "warm", cam: (u, t) => orbit(head(S(t), 1.2), 3.4, -20, 0, 40), dof: 9, focus: (t) => head(S(t), 1.45) },
  { t: 156.3, mood: "warm", cam: (u, t) => orbit(head(S(t), 1.45), 2.4 - 0.6 * smooth(u), -28, 0, 36), dof: 12, focus: (t) => head(S(t), 1.45) },
  { t: 165.95, mood: "golden", cam: (u, t) => orbit(head(R(t), 1.5), 1.9 - 0.15 * u, 32, 0, 36), dof: 12, focus: (t) => head(R(t)) },
  { t: 167.95, mood: "golden", cam: (u, t) => orbit(two(t, 1.15), 1.5 - 0.1 * u, -5, 6, 38), dof: 13, kind: "hands3" },
  { t: 172.0, mood: "golden", cam: (u, t) => orbit(head(S(t), 1.45), 2.0, -30, 0, 36), dof: 12, focus: (t) => head(S(t), 1.45) },
  { t: 174.8, mood: "golden", cam: (u, t) => ({ pos: add(R(t), [1.1, 1.6, 1.5]), look: add(S(t), [0, 1.1, 0]), fov: 42, roll: 0 }), dof: 6, focus: (t) => head(S(t), 1.2) },
  { t: 179.4, mood: "golden", cam: (u, t) => orbit(add(R(t), [-3.5, 1.4, 0]), 11 + 6 * u, -25, 10 + 6 * u, 46), dof: 2, kind: "wide" },
];
export const SHOTS: ShotDef[] = PLANS.map((p, i) => ({
  id: i + 1, a: F(p.t), b: i + 1 < PLANS.length ? F(PLANS[i + 1].t) : TOTAL, light: p.mood === "golden" ? "golden" : "day", mood: p.mood,
  crowd: p.kind ?? "", tau: (t: number) => t, sunAz: p.sunAz, sunEl: p.sunEl, memory: p.mood === "memory",
}));
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const FADE_AT = F(185.9);
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// impact flip-shakes: the three jumps, the bear's entrance, the stick drop
const KICKS: number[] = [F(47.25), F(53.8), F(61.45), F(74.6), F(82.25)];
export const kickAt = (f: number) => { let a = 0; for (const k of KICKS) { const n = f - k; if (n >= 0 && n < 7) a += (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; } return a; };
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
