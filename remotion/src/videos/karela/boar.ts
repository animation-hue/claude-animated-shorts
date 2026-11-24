// The wild boars as flat ink drawings (same Pen / ink style as the people). Side card 900 x 600 design, hooves at
// y = 580, facing screen-right. Faces: plain, sniffing, chewing a karela, the BITTER face (squeezed eyes, tongue out,
// wobble lines), running (legs stretched, sweat drops).
import { Pen, INK } from "./toon";

type P2 = [number, number];
let HIDE = "#5a4a44", HIDE_D = "#3e322e", MANE = "#2a2220", SNOUT = "#9a7a70", TUSK = "#f4f1e6";
const tone = (dark?: boolean) => { [HIDE, HIDE_D, MANE, SNOUT, TUSK] = dark ? ["#161a26", "#10131c", "#0b0d14", "#1c2030", "#2a3040"] : ["#5a4a44", "#3e322e", "#2a2220", "#9a7a70", "#f4f1e6"]; };
export type BoarFace = "plain" | "sniff" | "chew" | "bitter" | "run";
export type BoarPose = { phase?: number; walk?: number; face?: BoarFace; head?: number; karela?: number; sniff?: number; size?: number; dark?: boolean };

const leg = (p: Pen, top: P2, foot: P2, w: number, col: string) => {
  p.line([top, foot], col, w);
  p.poly([[foot[0] - w * 0.45, foot[1] - 8], [foot[0] + w * 0.55, foot[1] - 8], [foot[0] + w * 0.5, foot[1] + 6], [foot[0] - w * 0.5, foot[1] + 6]], "#2a2220", 4);
};

export const boarSide = (p: Pen, b: BoarPose = {}) => {
  tone(b.dark);
  const ph = b.phase ?? 0, wk = b.walk ?? 0, two = Math.PI * 2, run = b.face === "run";
  const hd = b.head ?? 0, bob = (run ? 14 : 6) * wk * Math.abs(Math.sin(two * ph));
  const cx = 400, cy = 330 - bob;
  const sw = (o: number) => (run ? 110 : 60) * wk * Math.sin(two * (ph + o));
  leg(p, [cx - 150, cy + 60], [cx - 160 + sw(0.5), 580], 34, HIDE_D);
  leg(p, [cx + 150, cy + 60], [cx + 160 + sw(0), 580], 34, HIDE_D);
  // body: a barrel with a high bristly shoulder hump
  p.ell(cx, cy, 250, 150, HIDE, 9);
  p.ell(cx - 20, cy + 70, 190, 55, "#6e5c54", 0);
  p.ell(cx, cy, 250, 150, null, 9);
  for (let i = 0; i < 9; i++) { const x = cx - 150 + i * 36, y = cy - 140 + Math.abs(i - 5) * 6; p.poly([[x - 14, y + 10], [x, y - 22 - (i > 3 && i < 7 ? 10 : 0)], [x + 14, y + 10]], MANE, 4); }
  // curly tail
  p.arc(cx - 262, cy - 40, 18, 18, 0, 300, 7);
  leg(p, [cx - 140, cy + 70], [cx - 150 + sw(0), 580], 38, HIDE);
  leg(p, [cx + 160, cy + 70], [cx + 170 + sw(0.5), 580], 38, HIDE);
  // head: long wedge toward the snout (lowered when sniffing / eating)
  const hx = cx + 250, hy = cy - 10 + 120 * hd;
  p.poly([[cx + 170, cy - 110], [hx + 40, hy - 70], [hx + 170, hy + 20], [hx + 150, hy + 70], [cx + 180, cy + 90]], HIDE, 9);
  p.poly([[hx - 30, hy - 75], [hx - 5, hy - 140], [hx + 25, hy - 70]], HIDE_D, 7);   // ear
  // snout disc + nostrils
  const wig = b.sniff ? 5 * Math.sin(b.sniff * 32) : 0;
  p.ell(hx + 165 + wig, hy + 42, 28, 38, SNOUT, 7);
  p.dot(hx + 168 + wig, hy + 30, 6); p.dot(hx + 168 + wig, hy + 54, 6);
  // tusk
  p.poly([[hx + 110, hy + 72], [hx + 140, hy + 28], [hx + 128, hy + 72]], TUSK, 4);
  // eye + brow by face
  const ex = hx + 45, ey = hy - 20, f = b.face ?? "plain";
  if (f === "bitter") {
    p.stroke([[ex - 18, ey - 14], [ex + 16, ey + 2], [ex - 18, ey + 14]], 8);                      // squeezed >
    p.arc(ex, ey - 40, 22, 8, 200, 340, 7);
  } else if (f === "run") { p.ell(ex, ey, 16, 18, "#ffffff", 5); p.dot(ex + 6, ey + 2, 8); p.stroke([[ex - 20, ey - 30], [ex + 22, ey - 22]], 7); }
  else { p.dot(ex, ey, 10); p.stroke([[ex - 18, ey - 26], [ex + 20, ey - 30]], 7); }
  // mouth
  if (f === "chew") {
    const k = 0.5 + 0.5 * Math.sin((b.phase ?? 0) * 40);
    p.ell(hx + 110, hy + 78, 30, 10 + 12 * k, "#7a2a33", 6);
  } else if (f === "bitter") {
    const pts: P2[] = []; for (let i = 0; i <= 10; i++) pts.push([hx + 70 + i * 10, hy + 82 + 8 * Math.sin(i * 1.8)]);
    p.stroke(pts, 7);
    p.ell(hx + 150, hy + 100, 22, 30, "#e86a8a", 6);                                                 // tongue out
    p.ell(hx + 150, hy + 104, 14, 18, "#7fbf4a", 0);                                                 // ...green with karela
    for (let k = 0; k < 3; k++) p.stroke([[hx - 40 + k * 18, hy - 150 - k * 8], [hx - 30 + k * 18, hy - 190 - k * 8]], 7); // shock lines
  } else p.stroke([[hx + 80, hy + 82], [hx + 130, hy + 76]], 6);
  // a karela in its mouth
  if (b.karela && b.karela > 0) {
    const s = b.karela;
    p.ell(hx + 140, hy + 80, 60 * s, 18 * s, "#5aa83c", 6, 0, 360, -12);
    for (let k = -2; k <= 2; k++) p.dot(hx + 140 + k * 20 * s, hy + 80 - 4 * s, 4 * s, "#3f7f2c");
  }
  if (f === "run") for (let k = 0; k < 2; k++) p.poly([[cx - 300 - k * 40, cy - 80 + k * 50], [cx - 288 - k * 40, cy - 60 + k * 50], [cx - 300 - k * 40, cy - 48 + k * 50], [cx - 312 - k * 40, cy - 60 + k * 50]], "#9fd4ff", 3);
};

/** front view (snout toward the lens): 600 x 600 design, hooves at 580 */
export const boarFront = (p: Pen, b: BoarPose = {}) => {
  tone(b.dark);
  const cx = 300, f = b.face ?? "plain";
  for (const s of [-1, 1]) leg(p, [cx + s * 90, 420], [cx + s * 100, 580], 40, HIDE_D);
  p.ell(cx, 360, 200, 150, HIDE, 9);
  for (let i = 0; i < 7; i++) { const x = cx - 120 + i * 40; p.poly([[x - 14, 228], [x, 190 - (i > 1 && i < 5 ? 12 : 0)], [x + 14, 228]], MANE, 4); }
  for (const s of [-1, 1]) leg(p, [cx + s * 70, 440], [cx + s * 72, 580], 44, HIDE);
  for (const s of [-1, 1]) p.poly([[cx + s * 70, 260], [cx + s * 120, 170], [cx + s * 140, 270]], HIDE_D, 7);
  p.ell(cx, 330, 120, 110, HIDE, 9);
  p.ell(cx, 400, 62, 48, SNOUT, 7);
  p.dot(cx - 20, 400, 9); p.dot(cx + 20, 400, 9);
  for (const s of [-1, 1]) p.poly([[cx + s * 55, 440], [cx + s * 85, 395], [cx + s * 70, 445]], TUSK, 4);
  for (const s of [-1, 1]) {
    const ex = cx + s * 50, ey = 305;
    if (f === "bitter") p.stroke([[ex - s * 16, ey - 14], [ex + s * 14, ey], [ex - s * 16, ey + 14]], 8);
    else p.dot(ex, ey, 11);
    p.stroke([[ex - 20, ey - 28 - (f === "bitter" ? 8 : 0) * s], [ex + 20, ey - 28 + (f === "bitter" ? 8 : 0) * s]], 7);
  }
  if (f === "bitter") { p.ell(cx, 470, 26, 34, "#e86a8a", 6); p.ell(cx, 474, 16, 20, "#7fbf4a", 0); }
  else if (f === "chew") p.ell(cx, 462, 30, 14, "#7a2a33", 6);
  else p.stroke([[cx - 30, 462], [cx + 30, 462]], 6);
};
