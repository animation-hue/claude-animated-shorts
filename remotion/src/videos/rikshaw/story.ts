// Timeline of "Rikshaw Love" (fiction, the user's own story): 18 shots timed to the voice words
// (public/rikshaw/words.json), one day on Marine Drive 9:30 am -> 6 pm golden hour. Same camera grammar as the
// bridge / Vasa shorts (smootherstep glides, cuts on big reframes, creeping holds, flip kicks on impacts) with the
// fiction toolkit: a light arc per beat (MOOD), eyes and faces carried by the autos (cast.ts), one love leitmotif.
export const FPS = 30;
export const TOTAL = 2340; // voice.wav = 78.00 s
export const D0 = 6.0; // land / road height above the sea (m); the sea is y = 0 beyond the wall at z = -30
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- Marine Drive layout (x runs along the seafront) ----------------
export const Z_WALL = -30;                        // sea wall; promenade -30 .. -34
export const LANE = { sea: -35.8, e2: -38.6, w1: -43.4, w2: -46.2 }; // eastbound (+x): sea, e2; westbound (-x): w1, w2
export const MEDIAN = -41;                        // divider with lamp posts
export const FOOT = -49;                          // city-side footpath; building fronts at -51
export const SIGNAL_X = 0;                        // stop line for the eastbound lanes
export const CRASH: V3 = [72, D0, MEDIAN];        // the lamp post Badshah meets
export const ROUND: V3 = [330, D0, -66];          // the busiest roundabout in Mumbai, just inland (island r 7, ring r 9.5-12.5)
export const GARAGE: V3 = [-260, D0, -60];        // Happy Singh's garage: room x -265..-255, z -66..-56, open toward +z

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Mood = "morning" | "noon" | "haze" | "warm" | "garage" | "garageGold" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; mood: Mood; crowd: string; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const I = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 108, light: "day", mood: "morning", crowd: "signal", tau: I, sunAz: 140 },        // 9:30, red light on Marine Drive
  { id: 2, a: 108, b: 205, light: "day", mood: "morning", crowd: "signal", tau: I },      // Badshah ... fell in love
  { id: 3, a: 205, b: 311, light: "day", mood: "morning", crowd: "signal", tau: I },      // her name was Bijli
  { id: 4, a: 311, b: 418, light: "day", mood: "morning", crowd: "signal", tau: I },      // headlights wide, skipped a beat
  { id: 5, a: 418, b: 487, light: "day", mood: "morning", crowd: "signal", tau: I },      // green, gone
  { id: 6, a: 487, b: 564, light: "day", mood: "morning", crowd: "signal", tau: I },      // Natraj pulls down his goggles
  { id: 7, a: 564, b: 648, light: "day", mood: "morning", crowd: "chase", tau: I },       // past the sea wall, round the corner
  { id: 8, a: 648, b: 779, light: "day", mood: "morning", crowd: "round", tau: I },       // the roundabout
  { id: 9, a: 779, b: 838, light: "day", mood: "morning", crowd: "exit", tau: I },        // she wasn't there
  { id: 10, a: 838, b: 977, light: "day", mood: "noon", crowd: "search1", tau: I },       // pink roof! grandma / umbrella
  { id: 11, a: 977, b: 1134, light: "day", mood: "haze", crowd: "search2", tau: I },      // ... drove away; drooped
  { id: 12, a: 1134, b: 1312, light: "golden", mood: "warm", crowd: "hope", tau: I },     // 5:20, jasmine, there she was
  { id: 13, a: 1312, b: 1468, light: "golden", mood: "warm", crowd: "fall", tau: I },     // only looked at her: lamp post
  { id: 14, a: 1468, b: 1772, light: "golden", mood: "garage", crowd: "garage", tau: I }, // Happy Singh's garage
  { id: 15, a: 1772, b: 1963, light: "golden", mood: "garageGold", crowd: "magic", tau: I }, // the door glows: Bijli
  { id: 16, a: 1963, b: 2034, light: "golden", mood: "garageGold", crowd: "flower", tau: I }, // jasmine on his mirror
  { id: 17, a: 2034, b: 2209, light: "golden", mood: "garageGold", crowd: "flicker", tau: I }, // once, softly / she flickered back
  { id: 18, a: 2209, b: TOTAL, light: "golden", mood: "golden", crowd: "together", tau: I, sunAz: 8, sunEl: 6 }, // golden evening, slowly
];
export const XFADE: Record<number, number> = { 10: 10, 11: 12, 12: 12, 14: 10, 18: 12 };
export const FLASH_AT = -100; // no white flash in this film

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story clocks ----------------
/** eastbound signal: red until 435, then green */
export const signalAt = (f: number): "red" | "amber" | "green" => (f < 428 ? "red" : f < 436 ? "amber" : "green");
/** Badshah's garage-door light 0..1 (shot 15 on) and the flicker glows of the ending */
export const doorGold = (f: number) => smooth((f - 1779) / 42);
const pulse = (f: number, f0: number, up = 3, hold = 6, down = 10) => (f < f0 ? 0 : f < f0 + up ? (f - f0) / up : f < f0 + up + hold ? 1 : Math.max(0, 1 - (f - f0 - up - hold) / down));
export const badshahGlow = (f: number) => Math.max(pulse(f, 2134), 0.85 * pulse(f, 2152, 4, 8, 14));
export const bijliGlow = (f: number) => Math.max(pulse(f, 2178, 4, 10, 16), 0.8 * pulse(f, 2196, 4, 8, 14));
export const honk = 1847, BIJLI_IN = 1882, FLOWER_F = 1990, CRASH_F = 1452;

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
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// ---------------- where the autos are (shared by the cameras and cast.ts) ----------------
export type AutoPos = { x: number; z: number; dx: number; dz: number; speed: number };
const BX0 = -3.2, ZB = LANE.e2, ZJ = LANE.sea;
/** Badshah, per shot */
export const badshahAt = (id: number, f: number): AutoPos => {
  switch (id) {
    case 1: case 2: case 3: case 4: case 6: return { x: BX0, z: ZB, dx: 1, dz: 0, speed: 0 };
    case 5: { const x = BX0 + 3.5 * smooth((f - 470) / 30) * ((f - 470) / 30); return { x, z: ZB, dx: 1, dz: 0, speed: f > 470 ? 1 : 0 }; }
    case 7: return { x: 6 + (f - 564) * 0.62, z: lin([[564, ZB], [610, ZB], [630, LANE.sea]], f), dx: 1, dz: 0, speed: 1 };
    case 8: { const a = (f - 648) * 0.045, r = 11; return { x: ROUND[0] + r * Math.cos(a), z: ROUND[2] + r * Math.sin(a), dx: -Math.sin(a), dz: Math.cos(a), speed: 1 }; }
    case 9: return { x: ROUND[0] + 32 + 2 * smooth((f - 779) / 30), z: LANE.e2, dx: 1, dz: 0, speed: f < 805 ? 0.4 : 0 };
    case 10: return { x: 150, z: LANE.e2, dx: 1, dz: 0, speed: 0 };
    case 11: return { x: 190, z: LANE.e2, dx: 1, dz: 0, speed: 0 };
    case 12: return { x: 96 - 0.05 * (f - 1134), z: LANE.w1, dx: -1, dz: 0, speed: 0.3 };
    case 13: {
      // heads straight across toward her (sea lane at x ~ 70), meets the median lamp post at CRASH_F
      if (f < 1409) return { x: 88.5 - 0.05 * (f - 1312), z: LANE.w1, dx: -1, dz: 0, speed: 0.3 };
      const u = smooth((f - 1409) / (CRASH_F - 1409));
      const x = 83.6 + (CRASH[0] + 0.9 - 83.6) * u, z = LANE.w1 + (CRASH[2] - 1.0 - LANE.w1) * u;
      return { x, z, dx: -0.6, dz: 0.8, speed: f < CRASH_F ? 1 : 0 };
    }
    case 14: case 16: case 17: return { x: GARAGE[0], z: GARAGE[2] - 1.2, dx: 0, dz: 1, speed: 0 };
    case 15: return { x: GARAGE[0] - 0.6, z: GARAGE[2] - 1.2, dx: 0, dz: 1, speed: 0 };
    case 18: return { x: 20 + 0.09 * (f - 2209), z: LANE.e2, dx: 1, dz: 0, speed: 0.4 };
    default: return { x: BX0, z: ZB, dx: 1, dz: 0, speed: 0 };
  }
};
/** Bijli, per shot (null = not in the shot) */
export const bijliAt = (id: number, f: number): AutoPos | null => {
  switch (id) {
    case 1: return null;
    case 2: return f > 175 ? { x: BX0 - 9 + 8.7 * smooth((f - 175) / 50), z: ZJ, dx: 1, dz: 0, speed: f < 225 ? 0.6 : 0 } : null;
    case 3: case 4: case 6: return { x: BX0 - 0.3, z: ZJ, dx: 1, dz: 0, speed: 0 };
    case 5: { const u = Math.max(0, f - 440); return { x: BX0 - 0.3 + 0.004 * u * u + 0.05 * u, z: ZJ, dx: 1, dz: 0, speed: u > 0 ? 1 : 0 }; }
    case 12: return f > 1250 ? { x: 68, z: LANE.sea, dx: 1, dz: 0, speed: 0 } : null;
    case 13: return { x: 68, z: LANE.sea, dx: 1, dz: 0, speed: 0 };
    case 15: return f >= BIJLI_IN ? { x: GARAGE[0] + 0.8 - 0.4 * smooth((f - BIJLI_IN) / 40), z: GARAGE[2] + 6.5 - 2.4 * smooth((f - BIJLI_IN) / 40), dx: 0, dz: -1, speed: f < BIJLI_IN + 40 ? 0.3 : 0 } : null;
    case 16: case 17: return { x: GARAGE[0] + 0.4, z: GARAGE[2] + 4.1, dx: 0, dz: -1, speed: 0 };
    case 18: return { x: 20.9 + 0.09 * (f - 2209), z: LANE.sea, dx: 1, dz: 0, speed: 0.4 };
    default: return null;
  }
};

// ---- framings ----
const H = D0; // road level
const B = (id: number, f: number) => badshahAt(id, f);
// 1: high over the promenade, the red light and the waiting autos, the art-deco front behind
const S1a = (f: number) => dolly([-14, 21, -66], [6, H - 1.5, -22], pushK(f, 0, 0.0025), { fov: 46 }); // from inland, over the road to the sea
// 2: Badshah at the light (front), push on "fell in love"
const S2a = (f: number) => dolly([3.0, H + 1.25, ZB + 0.6], [BX0, H + 0.95, ZB], pushK(f, 108, 0.002, 0.006, 30), { fov: 40 });
// 3: Bijli rolls up in the sea lane; push to her jasmine
const S3a = (f: number) => dolly([3.0, H + 1.2, ZJ - 0.8], [BX0 - 0.3, H + 0.95, ZJ], pushK(f, 205, 0.0022), { fov: 40 });
const S3b = (f: number) => dolly([0.3, H + 1.55, ZJ - 0.9], [BX0 - 0.3, H + 1.42, ZJ + 0.45], pushK(f, 262, 0.0025), { fov: 36, roll: 0.03 });
// 4: Badshah close-up: wide eyes, the skipped beat
const S4a = (f: number) => dolly([0.2, H + 1.0, ZB + 0.25], [BX0, H + 0.82, ZB], pushK(f, 311, 0.002, 0.007, 28), { fov: 36 });
// 5: the signal turns green (insert) -> she glides away (from the promenade)
const S5a = (f: number) => dolly([-3.2, H + 4.7, -37.4], [0.3, H + 5.35, -38.75], pushK(f, 418, 0.003), { fov: 34 });
const S5b = (f: number) => dolly([1.0, H + 1.6, -31.2], [-1.0, H + 0.9, -38], pushK(f, 440, 0.0018), { fov: 46 });
// 6: Natraj behind the windscreen pulls his goggles down
const S6a = (f: number) => dolly([-0.6, H + 1.2, ZB + 0.15], [BX0, H + 1.08, ZB], pushK(f, 487, 0.0025, 0.006, 25), { fov: 38, roll: -0.03 });
// 7: chase, tracking alongside from the promenade; whip on "corner"
const S7a = (f: number) => { const b = B(7, f); return { pos: [b.x + 1.5, H + 1.15, -45.4] as V3, look: [b.x + 1.5, H + 0.95, -37] as V3, fov: 54, roll: 0.03 }; }; // from the city side: Badshah, Bijli just ahead, the sea behind
const S7b = (f: number) => { const b = B(7, f); return { pos: [b.x + 9, H + 1.2, LANE.e2 + 0.5] as V3, look: [b.x, H + 0.9, b.z] as V3, fov: 40, roll: -0.04 }; };
// 8: the roundabout from above, then low among the identical autos
const S8a = (f: number) => dolly([ROUND[0] + 22, 29, ROUND[2] + 22], [ROUND[0], H, ROUND[2]], pushK(f, 648, 0.0025), { fov: 46 });
/** riding with Badshah round the ring: he is big in the foreground, the identical autos circle behind him */
const S8b = (f: number): Shot => { const b = B(8, f), nx = (b.x - ROUND[0]) / 11, nz = (b.z - ROUND[2]) / 11;
  return { pos: [b.x + b.dx * 2.6 - nx * 3.4, H + 2.3, b.z + b.dz * 2.6 - nz * 3.4], look: [b.x + nx * 0.6, H + 0.85, b.z + nz * 0.6], fov: 50, roll: 0.03 }; }; // from above the island edge
// 9: out of the roundabout, dazed, alone
const S9a = (f: number) => { const b = B(9, f); return dolly([b.x + 5.5, H + 1.3, b.z + 0.5], [b.x, H + 0.95, b.z], pushK(f, 779, 0.0022), { fov: 40 }); };
// 10: noon search: Badshah -> the grandma auto -> the pink umbrella
export const GRANDMA_AT: V3 = [156, D0, LANE.sea];
export const UMBRELLA_AT: V3 = [161, D0, FOOT + 0.4];
const S10a = (f: number) => dolly([155, H + 1.2, ZB + 0.4], [150, H + 0.95, ZB], pushK(f, 838, 0.0025, 0.006, 25), { fov: 40 });
const S10b = (f: number) => dolly([GRANDMA_AT[0] - 4.2, H + 1.15, GRANDMA_AT[2] + 0.4], [GRANDMA_AT[0], H + 0.95, GRANDMA_AT[2]], pushK(f, 903, 0.003), { fov: 38, roll: -0.03 });
const S10c = (f: number) => dolly([UMBRELLA_AT[0] - 1.0, H + 1.6, LANE.w1], [UMBRELLA_AT[0], H + 1.7, UMBRELLA_AT[2]], pushK(f, 926, 0.0025), { fov: 42, roll: 0.03 });
// 11: hazy: a pink roof far away driving off; Badshah's lids droop
const S11a = (f: number) => dolly([186, H + 1.3, ZB + 0.6], [240, H + 1.0, LANE.sea], pushK(f, 977, 0.0015), { fov: 22 });
const S11b = (f: number) => dolly([194.2, H + 1.0, ZB + 0.3], [190, H + 0.85, ZB], pushK(f, 1041, 0.0012), { fov: 36 });
// 12: 5:20 warm: driving slowly back along Marine Drive; jasmine; there she was (across the road)
const S12a = (f: number) => { const b = B(12, f); return dolly([b.x - 7, H + 2.4, LANE.w2 - 1.5], [b.x, H + 1.0, b.z], pushK(f, 1134, 0.002), { fov: 44 }); };
const S12b = (f: number) => { const b = B(12, f); return dolly([b.x - 4.2, H + 1.15, b.z + 0.3], [b.x, H + 0.95, b.z], pushK(f, 1231, 0.0025), { fov: 38 }); };
const S12c = (f: number) => { const b = B(12, f); return dolly([b.x + 1.6, H + 1.7, b.z - 1.4], [68, H + 0.9, LANE.sea], pushK(f, 1256, 0.0015, 0.005, 35), { fov: 20 }); };
// 13: heart eyes (close) -> across the road -> BOING
const S13a = (f: number) => { const b = B(13, f); return dolly([b.x - 3.4, H + 1.0, b.z + 0.2], [b.x, H + 0.85, b.z], pushK(f, 1312, 0.002, 0.006, 30), { fov: 36 }); };
const S13b = (f: number) => dolly([CRASH[0] - 4.0, H + 1.6, -34.6], [CRASH[0] + 4.0, H + 1.0, -42.4], pushK(f, 1409, 0.002), { fov: 48 });
// 14: the garage: from the door looking in; Happy Singh laughing; Badshah still
const G = GARAGE;
export const HAPPY_AT: V3 = [G[0] + 1.6, D0, G[2] - 0.4];
const S14a = (f: number) => dolly([G[0] + 0.9, H + 1.6, G[2] + 6.4], [G[0] + 0.8, H + 1.05, G[2] - 1.0], pushK(f, 1468, 0.002), { fov: 50 });
const S14b = (f: number) => dolly([HAPPY_AT[0] - 0.4, H + 1.7, HAPPY_AT[2] + 3.4], [HAPPY_AT[0], H + 1.75, HAPPY_AT[2]], pushK(f, 1620, 0.0025, 0.006, 25), { fov: 40 });
const S14c = (f: number) => dolly([G[0] - 0.2, H + 1.05, G[2] + 2.6], [G[0], H + 0.9, G[2] - 1.2], pushK(f, 1688, 0.0025), { fov: 36 });
// 15: inside, looking out at the door: gold light, the honk, Bijli in the doorway
const S15a = (f: number) => dolly([G[0] - 2.4, H + 1.35, G[2] - 4.6], [G[0] + 1.0, H + 1.05, G[2] + 4.0], pushK(f, 1772, 0.0015), { fov: 46 });
const S15b = (f: number) => dolly([G[0] - 1.6, H + 1.2, G[2] - 2.0], [G[0] + 0.4, H + 1.05, G[2] + 4.2], pushK(f, 1886, 0.0018, 0.005, 35), { fov: 40, roll: 0.025 });
// 16: the jasmine flower on his mirror
const S16a = (f: number) => dolly([G[0] + 0.55, H + 1.2, G[2] + 0.4], [G[0] + 0.62, H + 1.12, G[2] - 1.2], pushK(f, 1963, 0.003), { fov: 34 });
// 17: his one good headlight; hers back
const S17a = (f: number) => dolly([G[0] + 0.1, H + 1.05, G[2] + 2.2], [G[0], H + 0.85, G[2] - 1.2], pushK(f, 2034, 0.0016), { fov: 34 });
const S17b = (f: number) => dolly([G[0] + 0.3, H + 1.05, G[2] + 0.9], [G[0] + 0.4, H + 0.85, G[2] + 4.1], pushK(f, 2168, 0.0018), { fov: 34, roll: -0.02 });
// 18: golden evening on Marine Drive: low beside the two autos, crane up and out over the sea wall
// (from the city side looking out to sea: the two autos cross the frame in side view, the sun setting over the water)
const S18a = (f: number) => { const b = B(18, f); return { pos: [b.x + 0.8, H + 1.4, -46.4] as V3, look: [b.x + 0.8, H + 1.05, -30] as V3, fov: 40, roll: 0 }; };
const S18b = (f: number): Shot => { const b = B(18, f), u = glide((f - 2262) / 78); return { pos: [b.x + 0.8 - 3 * u, H + 1.4 + 9 * u, -46.4 - 5 * u], look: [b.x + 0.8 + 1.5 * u, H + 1.05 - 0.8 * u, -30 + 10 * u], fov: 40 + 4 * u, roll: 0 }; };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 108, s: S2a }],
  3: [{ f: 205, s: S3a }, { f: 256, dur: 26, s: S3b }],            // glide to the jasmine (270)
  4: [{ f: 311, s: S4a }],
  5: [{ f: 418, s: S5a }, { f: 440, cut: true, s: S5b }],
  6: [{ f: 487, s: S6a }],
  7: [{ f: 564, s: S7a }, { f: 624, cut: true, s: S7b }],           // whip on "corner"
  8: [{ f: 648, s: S8a }, { f: 708, cut: true, s: S8b }],
  9: [{ f: 779, s: S9a }],
  10: [{ f: 834, s: S10a }, { f: 903, cut: true, s: S10b }, { f: 926, cut: true, s: S10c }],
  11: [{ f: 971, s: S11a }, { f: 1041, cut: true, s: S11b }],
  12: [{ f: 1128, s: S12a }, { f: 1231, cut: true, s: S12b }, { f: 1256, cut: true, s: S12c }],
  13: [{ f: 1312, s: S13a }, { f: 1409, cut: true, s: S13b }],
  14: [{ f: 1463, s: S14a }, { f: 1620, cut: true, s: S14b }, { f: 1688, cut: true, s: S14c }],
  15: [{ f: 1772, s: S15a }, { f: 1886, cut: true, s: S15b }],
  16: [{ f: 1963, s: S16a }],
  17: [{ f: 2034, s: S17a }, { f: 2168, cut: true, s: S17b }],
  18: [{ f: 2203, s: S18a }, { f: 2262, cut: true, s: S18b }],
};
/** frame range [a, b) of the camera segment (between cuts) that frame f of shot id belongs to */
export const segmentOf = (id: number, f: number): [number, number] => {
  const s = SHOTS[id - 1];
  let a = s.a, b = s.b;
  for (const k of CAMS[id]) { if (k.cut && k.f <= f) a = k.f; if (k.cut && k.f > f) { b = Math.min(b, k.f); break; } }
  return [Math.max(a, s.a), b];
};
/** sun overrides per camera segment ("shot:segmentStart"), camera-relative az/el like ShotDef */
export const SUN_SEG: Record<string, { az: number; el: number }> = {};

const KICKS: [number, number][] = [[CRASH_F / FPS, 1.4], [624 / FPS, 0.4], [401 / FPS, 0.35]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const at = (p: () => AutoPos, h = 1.0) => (): V3 => { const q = p(); return [q.x, D0 + h, q.z]; };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 108, cInf: 12, focus: at(() => B(2, 150)) },
  { f: 205, cInf: 12, focus: () => [BX0 - 0.3, D0 + 1.1, ZJ] },
  { f: 311, cInf: 14, focus: at(() => B(4, 330), 0.85) },
  { f: 418, cInf: 10 },
  { f: 440, cInf: 0 },
  { f: 487, cInf: 6, focus: () => [BX0, D0 + 1.02, ZB] },
  { f: 564, cInf: 7 },                                               // chase: background streaks soft
  { f: 648, cInf: 0 },
  { f: 779, cInf: 11 },
  { f: 838, cInf: 12 },
  { f: 977, cInf: 0 },
  { f: 1041, cInf: 13 },
  { f: 1134, cInf: 0 },
  { f: 1231, cInf: 12 },
  { f: 1256, cInf: 9, focus: () => [68, D0 + 1.0, LANE.sea] },
  { f: 1312, cInf: 14 },
  { f: 1409, cInf: 0 },
  { f: 1468, cInf: 6 },
  { f: 1620, cInf: 12 },
  { f: 1688, cInf: 14 },
  { f: 1772, cInf: 6, focus: () => [GARAGE[0] - 0.6, D0 + 0.9, GARAGE[2] - 1.2] },
  { f: 1886, cInf: 6 },
  { f: 1963, cInf: 15 },
  { f: 2034, cInf: 14 },
  { f: 2209, cInf: 6 },
  { f: 2262, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
