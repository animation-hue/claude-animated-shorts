// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxStars, fxBurst, RAM, SHYAM, GRANDMA, Outfit, Expr, FrontOpts, SideOpts, MouthK, INK } from "./toon";
import { bearSide, bearFront, rabbit, hornbill, BearPose } from "./bear";
import { FPS, SHOTS, V3, clamp01, smooth, ramAt, shyamAt, bearAt, bearShown, bearFacing, bearHead, shyamLying, jumpAt, LINES, HUT, BUSH, PERCH, TREE, BRANCH, LIE_X } from "./story";
import { VOICE } from "./voiceEnv";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null; glow = 0;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = this.glow ? 2 : 0; this.mat.color.setScalar(1 + this.glow); this.soft.color.setScalar(1 + this.glow); }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "bearS" | "bearF"; roll?: number; size?: [number, number, number];
  /** full billboard (faces the lens in pitch too) rolled by `roll`: the lying patient */
  bill?: boolean;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; glow?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; fwd?: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- Two Friends and the Bear ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const SB = 0.0023; // metres per bear design unit: side card 1000 x 700 = 2.3 x 1.6 m
const tv = new THREE.Vector3(), tu = new THREE.Vector3();
const CAST = { R: { i: 1, o: RAM, okey: "ram" }, S: { i: 2, o: SHYAM, okey: "shyam" }, G: { i: 3, o: GRANDMA, okey: "dadi" } };
type WhoId = keyof typeof CAST;

/** the speaking character's mouth follows the narration envelope on their quoted lines only */
const talkAt = (who: WhoId, t: number): MouthK | null => {
  if (!LINES.some(([w, a, b]) => w === who && t >= a && t < b)) return null;
  const f = Math.round(t * FPS), v = (k: number) => VOICE[Math.max(0, Math.min(VOICE.length - 1, k))] ?? 0;
  const e = Math.max(v(f), v(f - (f % 2)));
  return e >= 70 ? "O" : e >= 42 ? "o" : null;
};
/** velocity of a track at t (m/s) */
const vel = (tr: (t: number) => V3, t: number) => { const a = tr(t - 0.05), b = tr(t + 0.05); return [(b[0] - a[0]) / 0.1, (b[2] - a[2]) / 0.1]; };

/** faces per beat (story time t, seconds) */
const exprR = (t: number): Expr =>
  t < 18.7 ? "grin" : t < 29.6 ? (t < 24 ? "neutral" : "grin") : t < 38 ? "smile_closed" : t < 44.9 ? "smile" :
  (t >= 47.0 && t < 48.6) || (t >= 53.3 && t < 55.0) || (t >= 61.0 && t < 65.0) ? "shock" : t < 69 ? "nervous" : t < 71.7 ? "stern" :
  t < 81.2 ? "shock" : t < 89.3 ? "shock" : t < 143 ? "nervous" : t < 146 ? "neutral" : t < 166.4 ? "grin" : "nervous";
const exprS = (t: number): Expr =>
  t < 29.6 ? "grin" : t < 44.9 ? "smile" : t < 49.6 ? "shock" : t < 54.7 ? "neutral" : t < 58 ? "nervous" : t < 69.1 ? "shock" :
  t < 70.4 ? "laugh" : t < 72.6 ? "smile" : t < 98.2 ? "shock" : t < 104.3 ? "nervous" : t < 153.4 ? "whistle" : t < 156.3 ? "neutral" : t < 172 ? "stern" : "neutral";

/** one person: walking (side / front by the view), standing, sitting or climbing; y lift from jumps */
const personAt = (out: Stage, cam: CamInfo, who: WhoId, p: V3, t: number, o: { dir?: [number, number]; expr?: Expr; extra?: Partial<FrontOpts>; mode?: FrontOpts["mode"]; lift?: number; facing?: -1 | 0 | 1; noBlob?: boolean } = {}) => {
  if (Math.hypot(cam.pos.x - p[0], cam.pos.z - p[2]) < 0.6 && Math.abs(cam.pos.y - p[1] - 1.3) < 0.8) return;
  const w = CAST[who], [vx, vz] = o.dir ?? [0, 0], sp = Math.hypot(vx, vz), y = p[1] + (o.lift ?? 0);
  const expr = o.expr ?? "neutral", blink = lidAt(t, w.i), talk = talkAt(who, t);
  const walking = sp > 0.25 && !o.mode;
  const v = walking ? viewOf(cam, p[0], p[2], vx, vz) : { side: false, mirror: false, fs: 1 };
  const phase = (t * (sp / 1.4)) % 1;
  if (walking && v.side) {
    const so: SideOpts = { mode: "march", phase, expr, blink, stride: 0.7 * v.fs * Math.min(1.6, sp / 1.1), talk };
    out.places.push(person(cam, w, p[0], y, p[2], v, {}, so));
  } else {
    const fo: FrontOpts = { mode: o.mode ?? (walking ? "stroll" : "stand"), phase, expr, blink, talk, facing: o.facing ?? 0, ...o.extra };
    out.places.push(person(cam, w, p[0], y, p[2], { side: false, mirror: false }, fo, {}));
  }
  if (!o.noBlob && y - p[1] < 0.05 && p[1] < 0.05) contact(out, p[0], 0, p[2]);
  else if (!o.noBlob && p[1] < 0.05) { const k = Math.max(0.35, 1 - (y - p[1]) / 2); contact(out, p[0], 0, p[2], 0.52 * k, 0.4 * k); }
};
const contact = (out: Stage, x: number, y: number, z: number, w = 0.52, h = 0.4) => {
  const cc = hexOf(CONTACT.day, 0.9);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w, h, flat: true });
};
const faceTo = (cam: CamInfo, from: V3, to: V3) => {
  const d = (to[0] - from[0]) * cam.right.x + (to[2] - from[2]) * cam.right.z;
  return (Math.abs(d) < 0.15 ? 0 : d > 0 ? 1 : -1) as -1 | 0 | 1;
};

/** Shyam lying on the path: a full billboard rolled so his head points to -x on screen (pulled toward the lens along
 *  the sight ray, size-compensated, so the ground never cuts it) */
const lying = (out: Stage, cam: CamInfo, t: number) => {
  const P: V3 = [LIE_X + 0.85, 0.24, 0], H: V3 = [LIE_X - 0.85, 0.24, 0];
  const up = tu.copy(cam.right).cross(cam.fwd ?? tv.set(0, 0, -1)).normalize();
  const hx = (H[0] - P[0]) * cam.right.x + (H[1] - P[1]) * cam.right.y + (H[2] - P[2]) * cam.right.z;
  const hy = (H[0] - P[0]) * up.x + (H[1] - P[1]) * up.y + (H[2] - P[2]) * up.z;
  const roll = Math.atan2(-hx, hy);
  const d0 = Math.hypot(cam.pos.x - P[0], cam.pos.y - P[1], cam.pos.z - P[2]), off = Math.min(0.35, 0.25 * d0), k = off / d0;
  const x = P[0] + (cam.pos.x - P[0]) * k, y = P[1] + (cam.pos.y - P[1]) * k, z = P[2] + (cam.pos.z - P[2]) * k;
  const fo: FrontOpts = { mode: "stand", expr: "whistle", blink: 0, facing: 0, headTilt: 0 };
  const pl = person(cam, CAST.S, x, y, z, { side: false, mirror: false }, fo, {}, 1 - k);
  out.places.push({ ...pl, bill: true, roll });
  contact(out, LIE_X, 0, 0.05, 1.9, 0.75);
  // held breath: a tiny bead of sweat that slides down now and then
  if (t > 107.5) { const u = (t * 0.5) % 1; out.fx.push({ key: "sweat", cw: 64, ch: 96, draw: (p) => p.poly([[32, 8], [50, 60], [32, 88], [14, 60]], "#9fd4ff", 5), x: H[0] - 0.05, y: 0.5 - 0.12 * u, z: -0.25, w: 0.07, h: 0.1 }); }
};

/** the bear: side card facing its motion (or -x), front card when the lens is ahead of it */
const bear = (out: Stage, cam: CamInfo, t: number, pose: BearPose = {}) => {
  const p = bearAt(t), [vx, vz] = vel(bearAt, t), sp = Math.hypot(vx, vz), dir = bearFacing(t);
  const v = viewOf(cam, p[0], p[2], sp > 0.2 ? vx : dir, sp > 0.2 ? vz : 0);
  const walk = Math.min(1, sp / 1.2), ps: BearPose = { phase: (t * 0.9) % 1, walk, head: bearHead(t), eye: "dot", ...pose };
  const d = cam.pos.distanceTo(tv.set(p[0], 0.9, p[2])), k = d < 3.5 ? 2.0 : d < 9 ? 1.2 : 0.6;
  const key = (o: object) => JSON.stringify(o, (_k, x) => (typeof x === "number" ? Math.round(x * 30) / 30 : x));
  if (v.side) out.places.push({ key: `BS|${key(ps)}`, x: p[0], y: 0, z: p[2], geo: "bearS", size: [Math.round(1000 * k), Math.round(700 * k), k], mirror: v.mirror, draw: (pen) => bearSide(pen, ps) });
  else out.places.push({ key: `BF|${key(ps)}`, x: p[0], y: 0, z: p[2], geo: "bearF", size: [Math.round(700 * k), Math.round(700 * k), k], draw: (pen) => bearFront(pen, ps) });
  const cc = hexOf(CONTACT.day, 1);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (pp) => fxContact(pp, cc), x: p[0], y: 0.022, z: p[2], w: 2.2, h: 1.3, flat: true });
};

/** the secret handshake as an insert card: two hands meet (k = 0 slap, 1 slap, 2 bump, 3 thumbs); solo = only Ram's */
const handsCard = (beat: number, sub: number, solo: boolean) => (p: Pen) => {
  const skinR = RAM.skin!, skinS = SHYAM.skin!, sleeveR = RAM.jacket, sleeveS = SHYAM.jacket;
  const gap = beat < 2 ? 60 * (1 - Math.min(1, sub * 2)) + 4 : 20 * (1 - Math.min(1, sub * 2)) + 2;
  const arm = (side: number, col: string, skin: string, kind: string) => {
    const x0 = side < 0 ? 0 : 800, xh = 400 - side * (gap + 70);
    p.line([[x0, 330 + side * 30], [xh - side * 60, 300]], col, 120);
    if (kind === "fist") p.ell(xh, 290, 78, 66, skin, 9);
    else if (kind === "thumb") { p.ell(xh, 300, 70, 60, skin, 9); p.poly([[xh - 18, 250], [xh - 18, 150], [xh + 18, 150], [xh + 18, 250]], skin, 9); }
    else { p.poly([[xh - side * 60, 230], [xh + side * 40, 210], [xh + side * 60, 330], [xh - side * 60, 360]], skin, 9); }
  };
  const kind = beat < 2 ? "flat" : beat === 2 ? "fist" : "thumb";
  arm(-1, sleeveR, skinR, kind);
  if (!solo) arm(1, sleeveS, skinS, kind);
  if (!solo && sub > 0.45 && sub < 0.8) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.stroke([[400 + 95 * Math.cos(a), 290 + 95 * Math.sin(a)], [400 + 140 * Math.cos(a), 290 + 140 * Math.sin(a)]], 10); }
};
const HANDS: Record<string, number[]> = { hands1: [5.48, 6.3, 7.15, 8.05], hands2: [26.3, 27.27, 27.95, 28.63], hands3: [169.89, 171.14] };

const raysCard = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "rgba(255,240,180,0.0)"); gr.addColorStop(0.3, "rgba(255,240,180,0.35)"); gr.addColorStop(1, "rgba(255,240,180,0.0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(44, 0); g.lineTo(84, 0); g.lineTo(128, 512); g.lineTo(0, 512); g.closePath(); g.fill();
};
const lines = (p: Pen) => { for (const [a, l] of [[-0.6, 1], [0, 1.2], [0.6, 1]]) p.stroke([[128 + 60 * Math.sin(a), 120 - 60 * Math.cos(a)], [128 + 110 * l * Math.sin(a), 120 - 110 * l * Math.cos(a)]], 9); };

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  // ---- inserts: the handshake ----
  const hb = HANDS[s.crowd];
  if (hb) {
    let beat = -1; for (let i = 0; i < hb.length; i++) if (t >= hb[i] - 0.12) beat = i;
    const sub = beat >= 0 ? Math.min(1, (t - hb[beat] + 0.12) / 0.35) : 0;
    const c = cam.pos, fw = cam.fwd ?? tv.set(0, 0, 1), at: V3 = [c.x + fw.x * 1.0, c.y + fw.y * 1.0 - 0.05, c.z + fw.z * 1.0];
    const solo = s.crowd === "hands3";
    out.fx.push({ key: `hands|${beat}|${Math.round(sub * 12)}|${solo}`, cw: 800, ch: 480, draw: handsCard(Math.max(0, beat), sub, solo), x: at[0], y: at[1], z: at[2], w: 0.95, h: 0.57 });
    return out;
  }
  // ---- Grandma's memory ----
  if (s.memory) {
    const wag = Math.sin(t * 9) * 0.6;
    personAt(out, cam, "G", [HUT[0], 0.42, HUT[2] - 2.2], t, { mode: "sit", expr: talkAt("G", t) ? "stern" : "smile", extra: { wave: 0.2 + 0.25 * wag, headTilt: 0.06 * Math.sin(t * 3) }, noBlob: true });
    contact(out, HUT[0], 0, HUT[2] - 2.2, 2.0, 1.0);
    return out;
  }
  const r = ramAt(t), sh = shyamAt(t);
  // ---- Ram ----
  const climbing = t >= 86.2 && t < 89.3, onBranch = t >= 89.3 && t < 143.0, sliding = t >= 143.0 && t < 144.7;
  const stick: FrontOpts["prop"] = t < 82.2 ? ["stick", t >= 32.4 && t < 37.8 ? 0.85 : 0.1] : null;
  if (climbing || sliding) {
    personAt(out, cam, "R", r, t, { expr: exprR(t), extra: { armsUp: 1, headTilt: 0.08 * Math.sin(t * 14) }, mode: "stand", noBlob: true });
  } else if (onBranch) {
    const hug = t >= 116 && t < 121 ? 1 : 0.15;
    personAt(out, cam, "R", [r[0], r[1] - 0.55, r[2]], t, { mode: hug > 0.5 ? "stand" : "sit", expr: exprR(t), extra: hug > 0.5 ? { armsUp: 0.6, headTilt: 0.05 * Math.sin(t * 20) } : { headTilt: 0.04 * Math.sin(t * 2) }, noBlob: true });
  } else {
    const lift = jumpAt(t), extra: Partial<FrontOpts> = { prop: stick, facing: faceTo(cam, r, t > 75 && t < 83 ? bearAt(t) : sh) };
    if (lift > 0.02) extra.armsUp = 1;
    if (t >= 168.4) { extra.wave = -1.4; extra.prop = null; }
    personAt(out, cam, "R", r, t, { dir: vel(ramAt, t) as [number, number], expr: exprR(t), extra, lift });
  }
  // shoes flying off on the big jump
  if (t >= 61.9 && t < 63.6) for (const k of [0, 1]) {
    const u = (t - 61.9) / 1.7, x = r[0] + (k ? 0.5 : -0.4) * u * 2, y = 0.2 + 2.6 * u - 3.2 * u * u;
    if (y > 0) out.fx.push({ key: "shoe", cw: 128, ch: 80, draw: (p) => p.poly([[10, 30], [80, 24], [118, 50], [118, 70], [10, 70]], "#2a201a", 6), x, y, z: r[2] - 0.2, w: 0.22, h: 0.14, rot: u * 9 * (k ? 1 : -1) });
  }
  if (t >= 82.2 && t < 140) out.fx.push({ key: "stickdown", cw: 512, ch: 64, draw: (p) => p.line([[10, 32], [500, 32]], "#8a5a34", 22), x: 34.6, y: 0.05, z: -0.3, w: 1.5, h: 0.12, flat: true, rot: 0.4 });
  // ---- Shyam ----
  if (shyamLying(t)) lying(out, cam, t);
  else {
    const extra: Partial<FrontOpts> = { facing: faceTo(cam, sh, t > 72 && t < 105 ? bearAt(t) : r) };
    if (t >= 104.35 && t < 106.1) { extra.headTilt = -0.4 * smooth((t - 104.35) / 1.7); }
    if (t >= 175.6) extra.prop = ["bag", 0];
    if (t >= 51.5 && t < 52.9) out.fx.push({ key: "growl", cw: 256, ch: 160, draw: (p) => { const pts: [number, number][] = []; for (let i = 0; i <= 20; i++) pts.push([20 + i * 11, 80 + 26 * Math.sin(i * 1.6 + t * 20)]); p.stroke(pts, 8); }, x: sh[0] + 0.35, y: 1.0, z: sh[2] - 0.3, w: 0.42, h: 0.26 });
    personAt(out, cam, "S", sh, t, { dir: vel(shyamAt, t) as [number, number], expr: exprS(t), extra, lift: t >= 48.0 && t < 48.6 ? 0.15 * Math.sin((t - 48) / 0.6 * Math.PI) : 0 });
  }
  // ---- the bear ----
  if (bearShown(t)) {
    const whisper = t >= 121 && t < 133.8, sniff = (t >= 111.6 && t < 116) || whisper;
    bear(out, cam, t, { eye: whisper ? "closed" : t < 76.6 ? "wide" : "dot", mouth: t >= 74 && t < 76.6 ? "open" : "shut", sniff: sniff ? t : 0 });
  }
  // ---- jungle life ----
  if (t >= 44.8 && t < 47.2) out.fx.push({ key: "rustle", cw: 256, ch: 256, draw: lines, x: BUSH[0] + 0.1 * Math.sin(t * 40), y: 1.55, z: BUSH[2] - 0.5, w: 0.7, h: 0.7, rot: 0.15 * Math.sin(t * 30) });
  if (t >= 48.25 && t < 50.5) {
    const u = clamp01((t - 48.25) / 1.3), hop = (t * 2.2) % 1;
    out.fx.push({ key: `rabbit${Math.round(hop * 10)}`, cw: 300, ch: 300, draw: (p) => rabbit(p, hop), x: BUSH[0] - 0.5 - 1.6 * u, y: 0.25, z: BUSH[2] - 0.6, w: 0.5, h: 0.5 });
  }
  if (t >= 58.2 && t < 61.0) {
    const u = (t - 58.2) / 2.8;
    out.fx.push({ key: `hbfly${Math.round((t * 4) % 1 * 8)}`, cw: 500, ch: 300, draw: (p) => hornbill(p, (t * 4) % 1), x: r[0] - 6 + 14 * u, y: 5.5 + 0.6 * Math.sin(u * 3), z: r[2] + 1.5, w: 1.6, h: 0.96 });
    out.fx.push({ key: "blob|hbshadow", cw: 128, ch: 128, draw: (p) => fxContact(p, "#506b58"), x: r[0] - 6 + 14 * u, y: 0.03, z: r[2], w: 4.5, h: 2.4, flat: true });
  }
  if (t >= 61.0 && t < 72) out.fx.push({ key: `hbperch${t >= 64.9}`, cw: 500, ch: 300, draw: (p) => hornbill(p, -1, t >= 64.9), x: PERCH[0], y: PERCH[1] + 0.3, z: PERCH[2], w: 1.05, h: 0.63 });
  // sun shafts between the trees (jungle mood)
  if (s.mood === "jungle") for (let i = 0; i < 4; i++) {
    const x = r[0] - 6 + i * 4.5 + 2 * Math.sin(i * 7.3);
    out.fx.push({ key: "ray", cw: 128, ch: 512, draw: raysCard, x, y: 5.5, z: 3.5 + 2 * (i % 2), w: 1.6, h: 11, rot: 0.25, soft: true, glow: 0.25 });
  }
  return out;
};
