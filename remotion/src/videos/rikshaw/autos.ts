// Our own cartoon auto rickshaws as flat ink cards (Rikshaw Love). Headlights are the eyes (lids, pupils, wide / droop /
// heart / dazed), the bumper is the mouth, posture is shiver + tilt. Front view: 600 x 800 design units, wheels on
// y = 780. Side view (facing screen-right): 900 x 700 units, wheels on y = 680. Drawn with the same plum ink as the cast.
import { Pen, INK } from "./toon";

type P2 = [number, number];
export type AutoLook = {
  roof: string; body: string; band: string; trim?: string;
  crown?: boolean; lashes?: boolean; garland?: boolean; glasses?: boolean;
  driver?: "natraj" | "generic" | "none"; dents?: boolean;
};
export type AutoEye = "open" | "wide" | "droop" | "heart" | "closed" | "squint" | "dazed" | "soft";
export type AutoMouth = "smile" | "grin" | "o" | "frown" | "wobble" | "flat" | "shy" | "grit";
export type AutoState = {
  eye?: AutoEye; lid?: number; look?: number; mouth?: AutoMouth; shiver?: number; tilt?: number;
  tape?: boolean; glow?: [number, number]; flower?: boolean; mirror?: number; goggles?: "up" | "down"; toothpick?: number;
  blush?: number; natraj?: "grin" | "sad" | "set";
};

export const BADSHAH: AutoLook = { roof: "#f4c21b", body: "#26262c", band: "#f4c21b", trim: "#e2b443", crown: true, driver: "natraj", dents: true };
export const BIJLI: AutoLook = { roof: "#f07aa8", body: "#26262c", band: "#f07aa8", trim: "#f6d7e6", lashes: true, garland: true, driver: "none" };
export const GRANDMA: AutoLook = { roof: "#e7a3bd", body: "#3a3a40", band: "#cfc6c0", trim: "#d8d2c8", glasses: true, driver: "generic" };
export const PLAIN = (v = 0): AutoLook => ({ roof: ["#f4c21b", "#f1bd16", "#f6c827"][v % 3], body: v % 4 === 3 ? "#2f4a3a" : "#26262c", band: "#f4c21b", driver: "generic" });

const mixc = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
const rr = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  const c = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  c(x1 - r, y1 - r, 0); c(x0 + r, y1 - r, Math.PI / 2); c(x0 + r, y0 + r, Math.PI); c(x1 - r, y0 + r, Math.PI * 1.5);
  return pts;
};
const withXf = (p: Pen, s: AutoState, ox: number, oy: number, fn: () => void) => {
  const g = p.g; g.save(); g.translate((s.shiver ?? 0) + ox, oy); g.rotate(s.tilt ?? 0); g.translate(-ox, -oy); fn(); g.restore();
};

// ---------------- eyes (headlights) ----------------
const headEye = (p: Pen, x: number, y: number, r: number, s: AutoState, side: number, o: AutoLook, lidCol: string) => {
  const kind = s.eye ?? "open", look = s.look ?? 0, blink = s.lid ?? 0;
  const R = kind === "wide" ? r * 1.15 : r;
  p.ell(x, y, R + 9, R + 9, o.trim ?? "#cfd3da", 7);                       // chrome rim
  const taped = s.tape && side < 0;
  p.ell(x, y, R, R, taped ? "#e9ecef" : "#fbfdff", 5);                     // the lamp = sclera
  if (s.glow && s.glow[side < 0 ? 0 : 1] > 0.01) {
    const k = s.glow[side < 0 ? 0 : 1];
    p.ell(x, y, R * 0.95, R * 0.95, `rgba(255,236,150,${(0.85 * k).toFixed(2)})`, 0);
  }
  if (kind === "heart") {
    const h = (cx: number, cy: number, w: number) => p.poly([[cx, cy + w], [cx - w * 1.1, cy - w * 0.1], [cx - w * 0.55, cy - w * 0.8], [cx, cy - w * 0.35], [cx + w * 0.55, cy - w * 0.8], [cx + w * 1.1, cy - w * 0.1]], "#ef4f7d", 4);
    h(x + look * r * 0.2, y + 2, r * 0.42);
  } else if (kind === "dazed") {
    const pts: P2[] = []; for (let i = 0; i < 40; i++) { const a = i * 0.5, rad = (i / 40) * r * 0.7; pts.push([x + rad * Math.cos(a), y + rad * Math.sin(a)]); }
    p.stroke(pts, 5);
  } else if (kind !== "closed") {
    const pr = kind === "wide" ? r * 0.3 : kind === "soft" ? r * 0.42 : r * 0.38;
    p.ell(x + look * r * 0.35, y + (kind === "droop" ? r * 0.2 : 0), pr, pr * (kind === "soft" ? 1.08 : 1), "#1d1a24", 0);
    p.ell(x + look * r * 0.35 - pr * 0.35, y - pr * 0.4 + (kind === "droop" ? r * 0.2 : 0), pr * 0.28, pr * 0.28, "#ffffff", 0);
  }
  // lids (body-coloured): droop / squint / blink / closed
  let top = kind === "droop" ? 0.55 : kind === "squint" ? 0.45 : kind === "soft" ? 0.22 : kind === "closed" ? 1 : 0;
  top = Math.max(top, blink);
  if (top > 0.01) {
    const yl = y - R + 2 * R * top, tiltL = kind === "droop" ? side * 10 : 0;
    p.clip([[x - R - 2, y - R - 2], [x + R + 2, y - R - 2], [x + R + 2, y + R + 2], [x - R - 2, y + R + 2]].map(([a, b]) => [a, b]) as P2[], () => {
      p.g.save(); p.g.beginPath(); p.g.arc(x, y, R, 0, Math.PI * 2); p.g.clip();
      p.poly([[x - R - 4, y - R - 4], [x + R + 4, y - R - 4], [x + R + 4, yl - tiltL], [x - R - 4, yl + tiltL]], lidCol, 0);
      p.g.restore();
    });
    p.stroke([[x - R * 0.95, yl + tiltL * 0.9], [x + R * 0.95, yl - tiltL * 0.9]], 6);
    if (top > 0.3) p.arc(x, yl - 8, R * 0.55, 6, 200, 340, 3.5);                                        // eyelid crease
  }
  if (kind === "squint") p.stroke([[x - R * 0.8, y + R * 0.55], [x + R * 0.8, y + R * 0.5]], 5);
  if (kind === "closed") p.arc(x, y + R * 0.1, R * 0.6, R * 0.35, 20, 160, 6);
  p.ell(x, y, R, R, null, 6);
  if (o.lashes && kind !== "closed") for (let k = 0; k < 3; k++) {
    const a = (side < 0 ? 200 + k * 22 : 340 - k * 22) * Math.PI / 180;
    p.stroke([[x + (R + 8) * Math.cos(a), y + (R + 8) * Math.sin(a)], [x + (R + 34) * Math.cos(a - side * 0.3), y + (R + 34) * Math.sin(a - side * 0.3)]], 9);
  }
  if (taped) {
    for (const k of [-1, 1]) p.poly([[x - R * 1.15, y + k * R * 0.9 - 9], [x + R * 1.15, y - k * R * 0.9 - 9], [x + R * 1.15, y - k * R * 0.9 + 9], [x - R * 1.15, y + k * R * 0.9 + 9]], "#e8d9b0", 4);
    p.stroke([[x - R * 0.2, y - R * 0.6], [x + R * 0.05, y - R * 0.1], [x - R * 0.3, y + R * 0.3]], 3.5);
  }
};

const mouthAuto = (p: Pen, kind: AutoMouth, x: number, y: number, w: number) => {
  switch (kind) {
    case "smile": p.arc(x, y - 10, w, 22, 20, 160, 7); break;
    case "shy": p.arc(x + 6, y - 6, w * 0.55, 14, 25, 155, 6); break;
    case "grin": p.poly([[x - w, y - 12], [x + w, y - 12], [x + w * 0.7, y + 22], [x - w * 0.7, y + 22]], "#5a1e28", 6);
      p.poly([[x - w * 0.9, y - 10], [x + w * 0.9, y - 10], [x + w * 0.85, y], [x - w * 0.85, y]], "#ffffff", 0); break;
    case "o": p.ell(x, y + 4, w * 0.32, w * 0.4, "#5a1e28", 6); break;
    case "frown": p.arc(x, y + 22, w * 0.8, 18, 200, 340, 7); break;
    case "grit": p.poly([[x - w, y - 8], [x + w, y - 8], [x + w, y + 14], [x - w, y + 14]], "#ffffff", 6);
      for (let k = -2; k <= 2; k++) p.stroke([[x + k * w * 0.33, y - 8], [x + k * w * 0.33, y + 14]], 3); break;
    case "wobble": { const pts: P2[] = []; for (let i = 0; i <= 14; i++) pts.push([x - w + (i * 2 * w) / 14, y + 5 * Math.sin(i * 1.3)]); p.stroke(pts, 6); break; }
    default: p.stroke([[x - w * 0.7, y], [x + w * 0.7, y]], 7);
  }
};

const natrajHead = (p: Pen, x: number, y: number, r: number, s: AutoState, side: boolean) => {
  p.ell(x, y, r, r * 1.05, "#d9a77e", 5);
  p.poly([[x - r, y - r * 0.2], [x - r * 0.8, y - r * 0.95], [x + r * 0.8, y - r * 0.95], [x + r, y - r * 0.2], [x + r * 0.7, y - r * 0.55], [x - r * 0.7, y - r * 0.55]], "#1f1a1a", 4); // hair
  const gy = s.goggles === "down" ? y - r * 0.05 : y - r * 0.5;
  p.stroke([[x - r * 1.02, gy], [x + r * 1.02, gy]], 7, "#3a2a24");                                   // strap
  for (const k of side ? [1] : [-1, 1]) { p.ell(x + k * r * 0.38 + (side ? r * 0.25 : 0), gy, r * 0.33, r * 0.28, s.goggles === "down" ? "#3b4b5e" : "#9cc2dc", 6); p.ell(x + k * r * 0.38 - r * 0.1 + (side ? r * 0.25 : 0), gy - r * 0.08, r * 0.08, r * 0.06, "#ffffff", 0); }
  if (s.goggles !== "down") for (const k of side ? [1] : [-1, 1]) p.ell(x + k * r * 0.35 + (side ? r * 0.25 : 0), y + r * 0.05, 5, 6, INK, 0);
  const mx = x + (side ? r * 0.55 : r * 0.1), my = y + r * 0.45, md = s.natraj ?? "grin";
  if (md === "sad") { p.arc(mx, my + 8, r * 0.26, 7, 200, 340, 4); if (s.goggles !== "down") for (const k of side ? [1] : [-1, 1]) p.stroke([[x + k * r * 0.2 + (side ? r * 0.25 : 0), y - r * 0.22], [x + k * r * 0.52 + (side ? r * 0.25 : 0), y - r * 0.12]], 4); }
  else if (md === "set") { p.stroke([[mx - r * 0.25, my], [mx + r * 0.25, my - 3]], 5); }
  else p.arc(mx, my - 6, r * 0.3, 8, 20, 160, 4);
  const tp = s.toothpick ?? 0.2;                                                                          // toothpick angle
  p.stroke([[mx + r * 0.15, my], [mx + r * 0.15 + r * 0.8 * Math.cos(tp), my - r * 0.8 * Math.sin(tp)]], 6.5, "#d9b37a");
};
const genericHead = (p: Pen, x: number, y: number, r: number) => {
  p.ell(x, y, r, r * 1.05, "#c99067", 5);
  p.poly([[x - r, y - r * 0.25], [x - r * 0.7, y - r * 0.95], [x + r * 0.7, y - r * 0.95], [x + r, y - r * 0.25], [x, y - r * 0.55]], "#2a201a", 4);
  for (const k of [-1, 1]) p.ell(x + k * r * 0.35, y + r * 0.05, 5, 6, INK, 0);
  p.stroke([[x - r * 0.25, y + r * 0.45], [x + r * 0.25, y + r * 0.45]], 4);
};

/** jasmine garland: white buds on a string, one orange marigold */
/** a jasmine flower: five soft rounded white petals round a pale yellow-green centre */
const bud = (p: Pen, x: number, y: number, s: number, rot = 0) => {
  for (let k = 0; k < 5; k++) { const a = rot + (k / 5) * Math.PI * 2; p.ell(x + 6.5 * s * Math.cos(a), y + 6.5 * s * Math.sin(a), 6 * s, 4.4 * s, "#fdfdf6", 2.2 * Math.min(1.4, s), 0, 360, (a * 180) / Math.PI); }
  p.ell(x, y, 2.6 * s, 2.6 * s, "#dfe7a0", 0);
};
const garland = (p: Pen, x0: number, y0: number, x1: number, y1: number, sag: number, sway = 0) => {
  const n = 14;
  p.stroke(Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t + sway * Math.sin(t * Math.PI), y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)] as P2; }), 2.5, "#5d7a3a");
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t + sway * Math.sin(t * Math.PI), y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t);
    bud(p, x + (i % 2 ? 4 : -4), y, 0.95, i * 0.7);
  }
};
const flowerAt = (p: Pen, x: number, y: number, s = 1) => {
  p.stroke([[x, y - 34 * s], [x + 2 * s, y - 6 * s]], 2.4, "#5d7a3a");                                   // the thread it hangs from
  for (const [dx, dy, r] of [[0, 0, 0], [13, 8, 1], [-12, 9, 2], [1, 19, 3]] as const) bud(p, x + dx * s, y + dy * s, 1.25 * s, r);
};

// ---------------- front view ----------------
export const autoFront = (p: Pen, o: AutoLook, s: AutoState) => {
  const body = o.body, roof = o.roof, dark = mixc(body, "#000000", 0.25), roofSh = mixc(roof, "#6a3a20", 0.28);
  withXf(p, s, 300, 780, () => {
    // rear wheels peeking out behind
    for (const k of [-1, 1]) p.ell(300 + k * 232, 738, 44, 44, "#1b1b20", 6);
    // side panels of the cabin (behind the front cowl)
    p.poly([[86, 420], [514, 420], [530, 700], [70, 700]], body, 7);
    p.poly([[86, 470], [514, 470], [520, 520], [80, 520]], o.band, 5);                                  // colour band
    // canopy poles + canopy
    for (const k of [-1, 1]) p.poly([[300 + k * 214, 190], [300 + k * 226, 190], [300 + k * 226, 430], [300 + k * 214, 430]], "#2a2a30", 4);
    const dome: P2[] = [[60, 205], [60, 120]];
    for (let i = 0; i <= 16; i++) { const t = i / 16; dome.push([60 + 480 * t, 120 - 70 * Math.sin(Math.PI * t)]); }
    dome.push([540, 120], [540, 205]);
    p.gradFill(dome, roof, roofSh, -2.1); p.poly(dome, null, 8);
    p.poly([[52, 196], [548, 196], [548, 222], [52, 222]], dark, 6);                                    // canopy lip
    // windscreen with the driver behind it
    const glass: P2[] = [[150, 232], [450, 232], [432, 420], [168, 420]];
    p.poly(glass, "#9fc9dc", 6);
    p.clip(glass, () => {
      if (o.driver === "natraj") natrajHead(p, 300, 340, 62, s, false);
      else if (o.driver === "generic") genericHead(p, 300, 345, 56);
      p.poly([[150, 232], [450, 232], [432, 420], [168, 420]], "rgba(190,226,242,0.38)", 0);
      p.poly([[190, 240], [230, 240], [180, 410], [160, 410]], "rgba(255,255,255,0.35)", 0);              // glare streak
    });
    p.poly(glass, null, 6);
    p.stroke([[186, 412], [330, 404]], 5, "#2a2a30");                                                     // wiper (parked)
    // mirrors on stalks (right one wobbly)
    const mw = s.mirror ?? 0;
    for (const k of [-1, 1]) {
      const a = k > 0 ? mw : 0, sx = 300 + k * 232, sy = 250, mx = 300 + k * 262 + Math.sin(a) * 20, my = 296 + (1 - Math.cos(a)) * 8;
      p.stroke([[sx, sy], [mx, my - 22]], 8, "#2a2a30");
      p.ell(mx, my, 27, 31, "#cfd3da", 6, 0, 360, (a * 180) / Math.PI);
      p.ell(mx, my, 18, 22, "#a9c9dc", 0);
      if (o.garland && k > 0) garland(p, mx - 10, my + 28, mx - 4, my + 160, 30, 10 * Math.sin(mw * 3));
      if (s.flower && k > 0) flowerAt(p, mx - 4, my + 40, 1.8);
    }
    // front cowl (the face)
    const cowl: P2[] = [[178, 430], [422, 430], [440, 520], [404, 690], [196, 690], [160, 520]];
    p.gradFill(cowl, body, mixc(body, "#000000", 0.35), -2.0); p.poly(cowl, null, 8);
    p.poly([[176, 436], [424, 436], [430, 462], [170, 462]], o.band, 4);                                // top stripe
    if (o.dents) { p.arc(212, 640, 14, 8, 200, 340, 3.5, "#47474f"); p.arc(392, 600, 12, 7, 200, 340, 3.5, "#47474f"); }
    if (o.crown) {                                                                                      // gold crown emblem
      const cx = 300, cy = 452, pts: P2[] = [[cx - 26, cy + 10], [cx - 26, cy - 12], [cx - 13, cy], [cx, cy - 18], [cx + 13, cy], [cx + 26, cy - 12], [cx + 26, cy + 10]];
      p.poly(pts, o.trim ?? "#e2b443", 4);
    }
    headEye(p, 236, 532, 46, { ...s }, -1, o, o.band);
    headEye(p, 364, 532, 46, { ...s }, 1, o, o.band);
    if ((s.blush ?? 0) > 0.01) for (const k of [-1, 1]) p.ell(300 + k * 92, 586, 26, 13, `rgba(240,110,150,${(0.75 * (s.blush ?? 0)).toFixed(2)})`, 0);
    if (o.glasses) {
      for (const k of [-1, 1]) p.ell(300 + k * 64, 532, 60, 60, null, 6);
      p.stroke([[276, 520], [324, 520]], 6);
    }
    p.poly(rr(214, 594, 386, 660, 22), "#d4d7dd", 6);                                                // chrome bumper plate = the mouth area
    mouthAuto(p, s.mouth ?? "flat", 300, 626, 52);
    // front wheel + mudguard
    p.ell(300, 742, 52, 40, "#1b1b20", 6); p.ell(300, 742, 20, 16, "#8a8f98", 4);
    p.poly([[236, 700], [364, 700], [356, 728], [244, 728]], dark, 5);
  });
};

// ---------------- side view (facing right) ----------------
export const autoSide = (p: Pen, o: AutoLook, s: AutoState) => {
  const body = o.body, roof = o.roof, roofSh = mixc(roof, "#6a3a20", 0.28);
  withXf(p, s, 450, 680, () => {
    p.ell(230, 628, 54, 54, "#1b1b20", 7); p.ell(230, 628, 20, 20, "#8a8f98", 4);                      // rear wheel
    // passenger box + bench
    const box: P2[] = [[110, 360], [520, 360], [560, 600], [120, 612]];
    p.gradFill(box, body, mixc(body, "#000000", 0.35), -2.0); p.poly(box, null, 8);
    p.poly([[112, 410], [526, 410], [534, 452], [114, 456]], o.band, 5);
    p.poly([[150, 470], [470, 470], [478, 520], [150, 524]], "#5a3b2a", 5);                              // bench
    // canopy
    const can: P2[] = [[100, 180]];
    for (let i = 0; i <= 14; i++) { const t = i / 14; can.push([100 + 560 * t, 180 - 60 * Math.sin(Math.PI * (0.25 + 0.75 * t)) * (t < 0.15 ? t / 0.15 : 1)]); }
    can.push([660, 190], [660, 222], [96, 222]);
    p.gradFill(can, roof, roofSh, -2.1); p.poly(can, null, 8);
    p.poly([[110, 222], [646, 222], [646, 370], [110, 370]], "#3a3540", 0);                             // cabin interior (opaque)
    p.poly([[130, 236], [520, 236], [520, 350], [130, 350]], "#4a4452", 0);                             // seat back
    for (const x of [116, 640]) p.poly([[x - 6, 222], [x + 6, 222], [x + 6, 380], [x - 6, 380]], "#2a2a30", 4);
    // driver
    if (o.driver === "natraj") natrajHead(p, 590, 300, 50, s, true);
    else if (o.driver === "generic") genericHead(p, 590, 305, 46);
    if (o.driver && o.driver !== "none") { p.poly([[548, 340], [636, 340], [640, 450], [552, 450]], o.driver === "natraj" ? "#e9e4d8" : "#3f6fb5", 5); p.stroke([[630, 392], [690, 380]], 7); }
    // front cowl with the face
    const cowl: P2[] = [[600, 330], [700, 330], [800, 420], [812, 520], [790, 610], [610, 612]];
    p.gradFill(cowl, body, mixc(body, "#000000", 0.35), -2.0); p.poly(cowl, null, 8);
    p.poly([[602, 336], [702, 336], [736, 366], [606, 366]], o.band, 4);
    if (o.crown) p.poly([[680, 352], [680, 336], [690, 346], [700, 330], [710, 346], [720, 336], [720, 352]], o.trim ?? "#e2b443", 3.5);
    headEye(p, 770, 470, 38, s, 1, o, o.band);
    if ((s.blush ?? 0) > 0.01) p.ell(756, 516, 20, 10, `rgba(240,110,150,${(0.75 * (s.blush ?? 0)).toFixed(2)})`, 0);
    p.poly(rr(738, 530, 806, 584, 14), "#d4d7dd", 5);
    mouthAuto(p, s.mouth ?? "flat", 772, 557, 26);
    // mirror + garland / flower
    const mw = s.mirror ?? 0, mx = 712 + Math.sin(mw) * 16, my = 248;
    p.stroke([[666, 300], [mx, my + 24]], 7, "#2a2a30");
    p.ell(mx, my, 22, 26, "#cfd3da", 5); p.ell(mx, my, 14, 18, "#a9c9dc", 0);
    if (o.garland) garland(p, mx - 6, my + 24, mx - 2, my + 130, 26, 8 * Math.sin(mw * 3));
    if (s.flower) flowerAt(p, mx - 4, my + 34, 1.6);
    p.ell(706, 632, 50, 50, "#1b1b20", 7); p.ell(706, 632, 18, 18, "#8a8f98", 4);                      // front wheel
    p.poly([[650, 600], [770, 600], [760, 588], [660, 588]], mixc(body, "#000000", 0.3), 4);
  });
};
