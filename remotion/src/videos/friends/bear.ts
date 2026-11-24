// The bear, the rabbit and the hornbill as flat ink drawings (same Pen / ink style as the people).
// Bear side card: 1000 x 700 design, paws at y = 680, facing screen-right. Front card: 700 x 700, paws at y = 680.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const FUR = "#8a5a36", FUR_D = "#6e4529", FUR_L = "#a4724a", MUZ = "#d9b48c", NOSE = "#241726";

export type BearPose = {
  phase?: number;   // walk cycle 0..1
  walk?: number;    // 0 stand .. 1 full stride
  head?: number;    // 0 level .. 1 lowered (sniffing the ground) .. -0.4 raised (startle)
  eye?: "dot" | "closed" | "squint" | "wide";
  mouth?: "shut" | "open" | "smile";
  sniff?: number;   // nose wiggle phase (draws two sniff puffs when > 0)
  rear?: number;    // 0 on all fours .. 1 reared up (front only)
};

const leg = (p: Pen, top: P2, foot: P2, w: number, col: string) => {
  p.line([top, foot], col, w);
  p.ell(foot[0] + 10, foot[1] - 6, w * 0.62, w * 0.32, col, 6);
};

/** side view, walking toward screen-right */
export const bearSide = (p: Pen, b: BearPose = {}) => {
  const ph = b.phase ?? 0, wk = b.walk ?? 0, hd = b.head ?? 0, two = Math.PI * 2;
  const bob = 8 * wk * Math.cos(2 * two * ph);
  const cx = 470, cy = 390 + bob;
  // far legs (darker), then body, then near legs
  const sw = (o: number) => 70 * wk * Math.sin(two * (ph + o));
  leg(p, [cx - 180, cy + 60], [cx - 200 + sw(0.5), 680], 64, FUR_D);
  leg(p, [cx + 170, cy + 60], [cx + 190 + sw(0), 680], 64, FUR_D);
  // body
  p.ell(cx, cy, 300, 185, FUR, 10);
  p.ell(cx - 10, cy + 80, 220, 80, FUR_L, 0);
  p.ell(cx, cy, 300, 185, null, 10);
  // fur tufts on the back
  for (let i = 0; i < 4; i++) p.arc(cx - 160 + i * 90, cy - 160, 26, 12, 200, 340, 6);
  // tail
  p.ell(cx - 300, cy - 50, 26, 22, FUR_D, 6);
  leg(p, [cx - 160, cy + 70], [cx - 180 + sw(0), 680], 70, FUR);
  leg(p, [cx + 190, cy + 70], [cx + 210 + sw(0.5), 680], 70, FUR);
  // head (lowered when sniffing)
  const hx = cx + 300 + 40 * hd, hy = cy - 70 + 190 * hd;
  p.line([[cx + 210, cy - 40], [hx - 40, hy]], FUR, 150, true);
  p.ell(hx - 70, hy - 95, 40, 38, FUR, 8);           // ear
  p.ell(hx - 70, hy - 95, 20, 18, FUR_D, 0);
  p.ell(hx, hy, 125, 108, FUR, 10);
  // muzzle + nose
  const wig = b.sniff ? 4 * Math.sin(b.sniff * 30) : 0;
  p.ell(hx + 95, hy + 25, 72, 52, MUZ, 8);
  p.ell(hx + 150 + wig, hy + 8, 26, 20, NOSE, 0);
  // eye
  const ex = hx + 30, ey = hy - 30;
  switch (b.eye ?? "dot") {
    case "closed": p.arc(ex, ey, 14, 8, 20, 160, 7); break;
    case "squint": p.stroke([[ex - 14, ey], [ex + 14, ey - 2]], 7); break;
    case "wide": p.ell(ex, ey, 16, 18, "#ffffff", 5); p.dot(ex + 4, ey, 8); break;
    default: p.dot(ex, ey, 11);
  }
  p.arc(ex, ey - 30, 18, 6, 200, 340, 6); // brow
  // mouth
  const m = b.mouth ?? "shut";
  if (m === "open") p.ell(hx + 100, hy + 62, 30, 20, "#7a2a33", 6);
  else if (m === "smile") p.arc(hx + 95, hy + 50, 30, 14, 20, 160, 6);
  else p.stroke([[hx + 70, hy + 58], [hx + 120, hy + 52]], 6);
  if (b.sniff && b.sniff > 0) for (let k = 0; k < 2; k++) {
    const u = (b.sniff * 2 + k * 0.5) % 1;
    p.ell(hx + 200 + 50 * u, hy - 10 - 30 * u, 14 + 12 * u, 10 + 8 * u, null, 4);
  }
};

/** front view (toward the lens), on all fours or reared up */
export const bearFront = (p: Pen, b: BearPose = {}) => {
  const r = b.rear ?? 0, cx = 350;
  const bodyY = 470 - 120 * r, headY = 290 - 170 * r;
  // back legs
  leg(p, [cx - 120, 600], [cx - 140, 680], 74, FUR_D);
  leg(p, [cx + 120, 600], [cx + 140, 680], 74, FUR_D);
  p.ell(cx, bodyY, 230, 200 + 40 * r, FUR, 10);
  p.ell(cx, bodyY + 40, 140, 120 + 30 * r, FUR_L, 0);
  p.ell(cx, bodyY, 230, 200 + 40 * r, null, 10);
  // front legs (raised paws when reared)
  if (r > 0.5) {
    for (const s of [-1, 1]) { p.line([[cx + s * 170, bodyY - 80], [cx + s * 250, headY + 20]], FUR, 70); p.ell(cx + s * 255, headY + 10, 46, 40, FUR, 8);
      for (let k = -1; k <= 1; k++) p.stroke([[cx + s * 255 + k * 16, headY - 30], [cx + s * 255 + k * 18, headY - 48]], 7); }
  } else for (const s of [-1, 1]) leg(p, [cx + s * 90, bodyY + 60], [cx + s * 95, 680], 80, FUR);
  // head
  for (const s of [-1, 1]) { p.ell(cx + s * 110, headY - 105, 44, 42, FUR, 8); p.ell(cx + s * 110, headY - 105, 22, 20, FUR_D, 0); }
  p.ell(cx, headY, 150, 135, FUR, 10);
  p.ell(cx, headY + 50, 78, 58, MUZ, 8);
  p.ell(cx, headY + 22, 30, 22, NOSE, 0);
  p.stroke([[cx, headY + 44], [cx, headY + 66]], 6);
  const m = b.mouth ?? "shut";
  if (m === "open") p.ell(cx, headY + 84, 34, 22, "#7a2a33", 6);
  else if (m === "smile") p.arc(cx, headY + 66, 34, 16, 20, 160, 6);
  else { p.arc(cx - 16, headY + 66, 16, 8, 20, 160, 6); p.arc(cx + 16, headY + 66, 16, 8, 20, 160, 6); }
  for (const s of [-1, 1]) {
    const ex = cx + s * 55, ey = headY - 25;
    switch (b.eye ?? "dot") {
      case "closed": p.arc(ex, ey, 14, 8, 20, 160, 7); break;
      case "squint": p.stroke([[ex - 14, ey], [ex + 14, ey]], 7); break;
      case "wide": p.ell(ex, ey, 18, 20, "#ffffff", 5); p.dot(ex, ey + 2, 9); break;
      default: p.dot(ex, ey, 12);
    }
    p.arc(ex, ey - 32, 20, 6, 200, 340, 6);
  }
};

/** a small rabbit sitting / hopping (300 x 300 design, feet at 280), facing screen-right */
export const rabbit = (p: Pen, hop = 0) => {
  const y = -40 * Math.sin(Math.PI * Math.min(1, Math.max(0, hop)));
  p.ell(120, 215 + y, 80, 62, "#e9e2d6", 7);
  p.ell(48, 200 + y, 20, 18, "#ffffff", 5);                    // tail
  p.ell(185, 150 + y, 48, 44, "#e9e2d6", 7);
  for (const [dx, a] of [[-12, -0.25], [12, 0.15]] as const) p.ell(180 + dx, 75 + y, 14, 44, "#e9e2d6", 6, 0, 360, a * 57);
  p.ell(180, 75 + y, 6, 30, "#f2b6c4", 0, 0, 360, -14);
  p.dot(200, 140 + y, 7);
  p.dot(232, 156 + y, 6, "#d77a8f");
  p.ell(150, 272 + y, 34, 12, "#e9e2d6", 5);
};

/** the hornbill: big curved yellow-orange beak + casque, black and white plumage (500 x 300 design), facing right.
 *  `fly` = wing phase when flying, -1 = perched; `eye` "bored" gives the unimpressed half-lid */
export const hornbill = (p: Pen, fly = -1, bored = false) => {
  if (fly >= 0) {
    const w = Math.sin(fly * Math.PI * 2);
    p.poly([[220, 150], [120, 150 - 110 * w], [60, 160 - 90 * w], [200, 175]], "#1f1d26", 6);
    p.poly([[100, 152 - 100 * w], [60, 160 - 90 * w], [80, 168 - 70 * w]], "#f4f1e8", 4);
  }
  p.ell(220, 165, 110, 55, "#1f1d26", 7);                           // body
  p.ell(240, 195, 70, 24, "#f4f1e8", 0);                             // white belly
  p.poly([[110, 165], [20, 190], [30, 205], [115, 185]], "#f4f1e8", 5); // tail
  p.ell(330, 120, 48, 44, "#1f1d26", 7);                             // head
  p.poly([[360, 105], [470, 140], [455, 158], [365, 140]], "#f2a93a", 6); // beak
  p.poly([[355, 92], [440, 108], [430, 120], [362, 112]], "#e8792e", 5);  // casque
  p.ell(345, 112, 10, 10, "#ffffff", 3);
  if (bored) { p.dot(347, 115, 4.5); p.stroke([[333, 108], [358, 110]], 5); } else p.dot(347, 112, 5);
  if (fly < 0) for (const x of [200, 240]) p.stroke([[x, 215], [x + 4, 260]], 6, "#5a4636");
};
