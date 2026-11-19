// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<"day" | "golden", LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffb36b", sunI: 6.6, sky: "#e2bcc0", ground: "#9a7a6a", hemiI: 0.68,
    bias: -0.0006, normalBias: 0.03,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<"day" | "golden", WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
};

// ---------------- Rikshaw Love: time-of-day moods on top of the two base presets ----------------
// The base preset (day / golden) still drives the grade, card shading and shadow style; a mood adjusts the sun,
// key colour/strength, shade, saturation, sky, fog and sea so the day reads 9:30 -> noon -> haze -> 5:20 -> garage -> 6 pm.
export type Mood = "clinic" | "morning" | "noon" | "haze" | "warm" | "garage" | "garageGold" | "golden";
const mulC = (a: C3, b: C3): C3 => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
export const moodLight = (L: LightPreset, m: Mood): LightPreset => {
  switch (m) {
    // indoors: soft window key, bright shade (a white room bounces a lot), short pale fog for depth
    case "clinic": return { ...L, lit: mulC(L.lit, [0.98, 0.99, 1.0]), shade: [0.56, 0.56, 0.64], lift: [0.06, 0.07, 0.1], sunI: L.sunI * 0.85,
      charShade: 0.92, fog: "#e4ece8", fogNear: 9, fogFar: 60 };
    case "morning": return { ...L, el: 24, az: 60, lit: mulC(L.lit, [1.0, 0.98, 0.93]), sunCol: "#fff0d2", fogNear: 40, fogFar: 380 };
    case "noon": return { ...L, el: 74, az: 40, lit: mulC(L.lit, [1.08, 1.06, 1.0]), shade: mulC(L.shade, [1.12, 1.12, 1.1]), fogNear: 60, fogFar: 420 };
    case "haze": return { ...L, el: 40, az: 70, lit: mulC(L.lit, [0.78, 0.78, 0.8]), shade: mulC(L.shade, [1.25, 1.25, 1.2]), lift: mulC(L.lift, [1.6, 1.6, 1.4]),
      fog: "#cbc5ba", fogNear: 18, fogFar: 170, sunI: L.sunI * 0.7 };
    case "warm": return { ...L, el: 16, az: 70, lit: [1.62, 1.08, 0.56], shade: [0.2, 0.19, 0.33], fogNear: 60, fogFar: 420, sunI: L.sunI * 1.1 };
    case "garage": return { ...L, el: 30, az: 110, lit: [0.7, 0.72, 0.8], shade: [0.1, 0.12, 0.22], lift: [0.05, 0.06, 0.12], sunI: L.sunI * 0.35, hemiI: 0.25,
      charTint: [0.82, 0.88, 1.0], fog: "#2a3346", fogNear: 30, fogFar: 200 };
    case "garageGold": return { ...L, el: 10, az: 165, lit: [1.75, 1.15, 0.6], shade: [0.16, 0.14, 0.26], sunI: L.sunI * 1.2, hemiI: 0.4,
      charTint: [1.0, 0.82, 0.62], fog: "#5a4048", fogNear: 30, fogFar: 220 };
    default: return L;
  }
};
export const moodLook = (K: WorldLook, m: Mood): WorldLook => {
  switch (m) {
    case "clinic": return { ...K, sat: 1.06 };
    case "morning": return { ...K, sat: 1.06, sky: { c: ["#d6e6f2", "#b8d6ef", "#8ab9e8", "#68a2e0", "#4a86d4"], e: [0, 3, 8, 16, 40] },
      water: { ...K.water, near: "#2fb0be", mid: "#2490c0", far: "#7fb4d8", crest: "#bff0f4" } };
    case "noon": return { ...K, sat: 1.14, sky: { c: ["#a9c9ee", "#7fb2ec", "#4f8fe0", "#3778d6", "#2560c4"], e: [0, 3, 8, 16, 40] } };
    case "haze": return { ...K, sat: 0.72, sky: { c: ["#d8d2c6", "#cfccc4", "#bfc1c6", "#aeb5c2", "#9aa6bb"], e: [0, 3, 8, 16, 40] },
      water: { ...K.water, near: "#5f8f98", mid: "#6a8d9c", far: "#a9aeb2", crest: "#c8d6d8", trough: "#4a6670" } };
    case "warm": return { ...K, sat: 1.1, sky: { c: ["#ffd79a", "#ffc583", "#f6ad7e", "#d99b8e", "#9c88a0"], e: [0, 4, 10, 20, 40] },
      water: { ...K.water, near: "#2a5486", mid: "#4a78a6", far: "#e8b88e", crest: "#f0c49a", glint: "#fff0c8" } };
    case "golden": return { ...K, water: { ...K.water, near: "#3a4f86", mid: "#8a6f96", far: "#f2b98a", crest: "#ffd6a0", glint: "#fff2c8", trough: "#2a3466" } };
    case "garage": return { ...K, sat: 0.85 };
    case "garageGold": return { ...K, sat: 1.12 };
    default: return K;
  }
};
