// Timeline of "Injection Ka Khauf" rebuilt in our style on the user's ORIGINAL audio (kept unchanged): 69 shots on
// the original's cut points (30 fps), each with a framing type, a subject and the character speaking. One room, one
// day; phases: on the couch (0-36), held down + the injection (37-55), carried out (56-67), fade (68).
export const FPS = 30;
export const TOTAL = 2892; // original audio 96.39 s
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- the room and the marks ----------------
export const COUCH: V3 = [0, 0.75, 0];                  // couch top centre (x along the couch, head end at -x)
export const MARK = {
  P: [0.95, 0.98, 0] as V3,                             // patient's FEET while lying (the card runs from here toward -x, centre line ~ head height)
  PH: [-0.62, 0.98, 0.02] as V3,                        // patient's head while lying
  // doctor + helper stand BEHIND the couch (+z) so the lenses at -z see everyone; the father at the head end, front
  D: [0.5, 0, 0.92] as V3, F: [-1.65, 0, -0.5] as V3, Hp: [-0.7, 0, 0.95] as V3,
  Dinj: [0.3, 0, 0.78] as V3,                           // the doctor at the hip for the injection
  Fc: [-0.4, 0, -1.55] as V3, Dc: [1.05, 0, -0.55] as V3, // carry phase: father (with the patient), doctor
};
export const EYE = 1.62;                                // standing eye height (m)

// ---------------- shots ----------------
export type Kind = "cu" | "ms" | "low" | "two" | "ots" | "wide" | "top" | "insSyr" | "insButt" | "hold" | "carry" | "end";
export type Who = "P" | "D" | "F" | "H" | "-";
export type ShotDef = { id: number; a: number; b: number; kind: Kind; subj: Who; with?: Who; speaker: Who; light: "day" | "golden"; mood: "clinic"; crowd: string; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const CUTS = [0, 29, 68, 90, 141, 163, 185, 231, 270, 308, 355, 424, 494, 539, 576, 652, 720, 760, 780, 793, 892, 922, 955, 1021, 1026, 1040, 1078, 1112, 1157, 1196, 1221, 1239, 1260, 1288, 1309, 1378, 1406, 1461, 1500, 1568, 1601, 1650, 1674, 1694, 1753, 1820, 1879, 1926, 1971, 2026, 2049, 2144, 2185, 2196, 2221, 2276, 2335, 2375, 2431, 2486, 2540, 2581, 2608, 2641, 2708, 2747, 2786, 2816, 2821];
// [kind, subject, partner, speaker] per shot, read from the original's framing
const PLAN: [Kind, Who, Who, Who][] = [
  ["ms", "P", "-", "P"], ["insSyr", "D", "-", "D"], ["ots", "F", "D", "F"], ["wide", "F", "-", "F"], ["cu", "P", "H", "P"], ["low", "F", "-", "F"], ["cu", "F", "-", "F"], ["two", "D", "P", "D"],
  ["cu", "D", "-", "D"], ["ots", "P", "D", "D"], ["ms", "D", "-", "D"], ["two", "D", "P", "D"], ["cu", "P", "-", "P"], ["low", "P", "-", "P"], ["ms", "D", "-", "D"], ["two", "D", "P", "D"],
  ["cu", "P", "-", "P"], ["two", "F", "P", "F"], ["two", "P", "F", "P"], ["cu", "F", "-", "F"], ["cu", "P", "-", "P"], ["ots", "F", "P", "F"], ["top", "P", "-", "P"], ["cu", "P", "-", "P"],
  ["cu", "P", "-", "P"], ["top", "D", "P", "D"], ["cu", "P", "H", "P"], ["ms", "D", "-", "D"], ["two", "D", "P", "D"], ["ots", "F", "P", "F"], ["insButt", "P", "-", "-"], ["two", "D", "P", "D"],
  ["ots", "F", "P", "F"], ["wide", "-", "-", "-"], ["ms", "D", "-", "D"], ["cu", "P", "-", "P"], ["ms", "D", "-", "D"], ["hold", "P", "H", "P"], ["hold", "P", "D", "P"], ["cu", "D", "-", "D"],
  ["low", "D", "-", "D"], ["two", "F", "P", "F"], ["hold", "P", "H", "P"], ["cu", "H", "-", "H"], ["wide", "-", "-", "-"], ["hold", "P", "H", "P"], ["cu", "F", "-", "F"], ["hold", "P", "H", "P"],
  ["hold", "P", "H", "P"], ["ms", "D", "-", "D"], ["insButt", "P", "-", "-"], ["ms", "D", "-", "D"], ["cu", "P", "-", "P"], ["cu", "P", "-", "P"], ["top", "-", "-", "-"], ["cu", "D", "-", "D"],
  ["carry", "F", "P", "F"], ["carry", "F", "P", "F"], ["cu", "H", "-", "H"], ["carry", "F", "P", "F"], ["carry", "D", "F", "D"], ["cu", "F", "-", "F"], ["carry", "P", "F", "P"], ["ms", "D", "-", "D"],
  ["carry", "F", "P", "F"], ["ms", "D", "-", "D"], ["carry", "P", "F", "P"], ["cu", "P", "-", "P"], ["end", "P", "-", "-"],
];
export const SHOTS: ShotDef[] = PLAN.map(([kind, subj, w, speaker], i) => ({
  id: i + 1, a: CUTS[i], b: i + 1 < CUTS.length ? CUTS[i + 1] : TOTAL, kind, subj, with: w, speaker, light: "day", mood: "clinic",
  crowd: i < 37 ? "couch" : i < 56 ? "held" : "carry", tau: (t: number) => t, sunAz: 110, sunEl: 48,
}));
export const XFADE: Record<number, number> = {};
export const FLASH_AT = -100;
export const FADE_AT = 2821; // fade to black over the last shot
export const INJ_A = CUTS[50], INJ_B = CUTS[51]; // the injection insert
export const phaseOf = (id: number) => (id <= 37 ? "couch" : id <= 56 ? "held" : "carry");

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---------------- where everyone is (by phase) ----------------
const standAt = (who: Who, id: number): V3 => {
  const ph = phaseOf(id);
  if (who === "D") return ph === "carry" ? MARK.Dc : id >= 49 && id <= 52 ? MARK.Dinj : MARK.D;
  if (who === "F") return ph === "carry" ? MARK.Fc : MARK.F;
  if (who === "H") return MARK.Hp;
  return MARK.P;
};
/** the head (look point) of a character in shot id */
export const headOf = (who: Who, id: number): V3 => {
  if (who === "P") return phaseOf(id) === "carry" ? [MARK.Fc[0] + 0.05, 1.35, MARK.Fc[2] - 0.25] : MARK.PH;
  const p = standAt(who, id);
  return [p[0], EYE + (who === "D" ? 0.02 : who === "H" ? -0.06 : 0), p[2]];
};
export { standAt };

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** framing for a shot; every hold creeps in (the cut grammar of the original: punchy dutch angles, close faces) */
const frame = (s: ShotDef, f: number): Cam => {
  const i = s.id - 1, u = clamp01((f - s.a) / Math.max(1, s.b - s.a)), side = hh(i, 1) < 0.5 ? -1 : 1;
  const dutch = (0.06 + 0.1 * hh(i, 2)) * side, creep = 1 - 0.1 * u;
  const H = headOf(s.subj === "-" ? "P" : s.subj, s.id), W = s.with && s.with !== "-" ? headOf(s.with, s.id) : H;
  const lying = s.subj === "P" && phaseOf(s.id) !== "carry";
  switch (s.kind) {
    case "cu": { const off: V3 = lying ? [0.45 * side, 1.35, -1.6] : [0.4 * side, -0.04, -2.0]; return { pos: add(H, off.map((v) => v * creep) as V3), look: H, fov: 36, roll: dutch }; }
    case "ms": return lying ? { pos: add(H, [0.9 * side * creep, 1.2, -2.9 * creep]), look: add(H, [0.35, -0.1, 0]), fov: 40, roll: dutch * 0.6 }
      : { pos: add(H, [0.8 * side * creep, -0.2, -3.2 * creep]), look: add(H, [0, -0.35, 0]), fov: 40, roll: dutch * 0.6 };
    case "low": return { pos: add(H, [0.6 * side, -1.1, -2.3 * creep]), look: add(H, [0, -0.05, 0]), fov: 46, roll: dutch * 1.4 };
    case "two": { const m = lerp(H, W, 0.5), lo = H[1] < 1.2 || W[1] < 1.2; return { pos: add(m, [1.1 * side, lo ? 1.05 : 0.2, -3.6 * creep]), look: add(m, [0, -0.2, 0]), fov: 44, roll: dutch }; }
    case "ots": { const d: V3 = [W[0] - H[0], 0, W[2] - H[2]], n = Math.hypot(d[0], d[2]) || 1;
      const hi = lying ? 0.75 : 0.12; // over a lying patient: look down past his body, not through it
      return { pos: add(W, [(d[0] / n) * 0.7 + 0.35 * side, hi, (d[2] / n) * 0.7 - 0.25]), look: H, fov: 40, roll: dutch }; }
    case "wide": return { pos: [2.6 * side, 2.3 + 0.1 * u, -4.4 + 0.3 * u], look: [-0.2, 0.9, 0.1], fov: 50, roll: 0.04 * side };
    case "top": return { pos: [0.25 * side, 2.95, -0.35 - 0.1 * u], look: [-0.1, 0.75, 0.05], fov: 54, roll: 0.2 * side };
    case "insSyr": { const hnd = add(standAt("D", s.id), [0.3, 1.38, 0]); return { pos: add(hnd, [0.15, 0.05, -0.75 * creep]), look: add(hnd, [0, 0.12, 0]), fov: 32, roll: 0.25 }; }
    case "insButt": { const hip: V3 = [0.18, 0.9, 0]; return { pos: add(hip, [0.45, 0.8 * creep, -1.0 * creep]), look: hip, fov: 40, roll: -0.18 }; }
    case "hold": { const m = lerp(MARK.PH, headOf(s.with ?? "H", s.id), 0.4); return { pos: add(m, [0.9 * side, 1.0, -2.6 * creep]), look: m, fov: 44, roll: dutch }; }
    case "carry": { const m = lerp(headOf("F", s.id), headOf("P", s.id), 0.4); return { pos: add(m, [0.5 * side, -0.08, -2.3 * creep]), look: add(m, [0, -0.12, 0]), fov: 44, roll: dutch }; }
    default: { const P = headOf("P", s.id); return { pos: add(P, [0.2, -0.1, -0.85 * creep]), look: P, fov: 36, roll: 0.05 }; }
  }
};
const KICKS: number[] = [INJ_A + 18, CUTS[13] + 2, CUTS[67] + 2];
export const kickAt = (f: number) => { let a = 0; for (const k of KICKS) { const n = f - k; if (n >= 0 && n < 7) a += (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; } return a; };
export const camAt = (id: number, f: number): Cam => {
  const c = frame(SHOTS[id - 1], f), a = kickAt(f);
  if (!a) return c;
  return { ...c, look: [c.look[0] + 0.01 * a, c.look[1] + 0.008 * a, c.look[2]], roll: c.roll + a * 0.006 };
};
export const segmentOf = (id: number, _f: number): [number, number] => [SHOTS[id - 1].a, SHOTS[id - 1].b];
export const SUN_SEG: Record<string, { az: number; el: number }> = {};

// ---------------- lens ----------------
export const dofAt = (f: number) => {
  const s = shotAt(f), k = s.kind;
  const cInf = k === "cu" ? 13 : k === "insSyr" || k === "insButt" ? 14 : k === "ms" || k === "low" || k === "ots" ? 9 : k === "two" || k === "hold" || k === "carry" ? 6 : 0;
  const focus = (_f?: number): V3 => (k === "ots" || k === "cu" || k === "ms" || k === "low" ? headOf(s.subj === "-" ? "P" : s.subj, s.id) : frame(s, f).look);
  return { cInf, focus };
};
export const focusAt = (id: number, f: number): V3 => dofAt(f).focus();
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
