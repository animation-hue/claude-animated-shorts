// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxStars, fxBurst, RAMU, VIDYA, Outfit, Expr, FrontOpts, SideOpts, MouthK, INK } from "./toon";
import { boarSide, boarFront, BoarPose } from "./boar";
import { FPS, SHOTS, V3, clamp01, smooth, ramuAt, vidyaAt, asleep, boarAt, BOARS, ramuAct, vidyaAct, exprAt, LINES, BED_R, BED_V, TULSI, VINE_X } from "./story";
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
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = Math.min(rt ? rt.width : r.domElement.width, rt ? rt.height : r.domElement.height) / 1080; };
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "boarS" | "boarF"; roll?: number; size?: [number, number, number];
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

// ---------------- Karela: Ramu, Vidya, the boars ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const SBO = 0.0018; // metres per boar design unit: side card 900 x 600 = 1.62 x 1.08 m
const tv = new THREE.Vector3(), tu = new THREE.Vector3();
const CAST = { R: { i: 1, o: RAMU, okey: "ramu" }, V: { i: 2, o: VIDYA, okey: "vidya" } };
type WhoId = keyof typeof CAST;

/** the speaking character's mouth follows the voice envelope on their own lines only */
const talkAt = (who: WhoId, t: number): MouthK | null => {
  if (!LINES.some(([, sp, a, b]) => sp === who && t >= a && t < b)) return null;
  const f = Math.round(t * FPS), v = (k: number) => VOICE[Math.max(0, Math.min(VOICE.length - 1, k))] ?? 0;
  const e = Math.max(v(f), v(f - (f % 2)));
  return e >= 70 ? (who === "R" ? "O" : "o") : e >= 40 ? "o" : null;
};
const speaking = (who: WhoId, t: number) => LINES.some(([, sp, a, b]) => sp === who && t >= a - 0.2 && t < b + 0.3);
const vel = (tr: (t: number) => V3, t: number) => { const a = tr(t - 0.05), b = tr(t + 0.05); return [(b[0] - a[0]) / 0.1, (b[2] - a[2]) / 0.1]; };
const contact = (out: Stage, x: number, y: number, z: number, w = 0.52, h = 0.4) => {
  const cc = hexOf(CONTACT.day, 0.9);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w, h, flat: true });
};
const faceTo = (cam: CamInfo, from: V3, to: V3) => {
  const d = (to[0] - from[0]) * cam.right.x + (to[2] - from[2]) * cam.right.z;
  return (Math.abs(d) < 0.15 ? 0 : d > 0 ? 1 : -1) as -1 | 0 | 1;
};

/** one of the couple: walking (side / front by the view), standing, sitting, working with a prop */
const personAt = (out: Stage, cam: CamInfo, who: WhoId, t: number) => {
  const tr = who === "R" ? ramuAt : vidyaAt, p = tr(t), other = (who === "R" ? vidyaAt : ramuAt)(t);
  if (Math.hypot(cam.pos.x - p[0], cam.pos.z - p[2]) < 0.6 && Math.abs(cam.pos.y - 1.3) < 0.8) return;
  const w = CAST[who], act = who === "R" ? ramuAct(t) : vidyaAct(t), [vx, vz] = vel(tr, t), sp = Math.hypot(vx, vz);
  const expr = exprAt(who, t) as Expr, blink = lidAt(t, w.i), talk = talkAt(who, t);
  const walking = sp > 0.25 && act.mode !== "sit";
  const v = walking ? viewOf(cam, p[0], p[2], vx, vz) : { side: false, mirror: false, fs: 1 };
  const phase = (t * (sp / 1.4)) % 1;
  // listening: look at the one who speaks; speaking: a little head life
  const facing = faceTo(cam, p, other), tilt = (act.headTilt ?? 0) + (speaking(who, t) ? 0.04 * Math.sin(t * 2.3 + w.i) : 0.02 * Math.sin(t * 0.9 + w.i));
  if (walking && v.side && !act.prop) {
    const so: SideOpts = { mode: "march", phase, expr, blink, stride: 0.7 * v.fs * Math.min(1.6, sp / 1.1), talk };
    out.places.push(person(cam, w, p[0], p[1], p[2], v, {}, so));
  } else {
    const fo: FrontOpts = { mode: act.mode === "sit" ? "sit" : walking ? "stroll" : "stand", phase, expr, blink, talk, facing, headTilt: tilt, prop: act.prop ?? null, armsUp: act.armsUp };
    out.places.push(person(cam, w, p[0], p[1], p[2], { side: false, mirror: false }, fo, {}));
  }
  contact(out, p[0], 0, p[2]);
};

/** asleep on the charpai: a full billboard rolled so the head points along the bed (pulled toward the lens) */
const sleeper = (out: Stage, cam: CamInfo, who: WhoId, bed: [V3, V3], t: number) => {
  const [P, H] = bed;
  const up = tu.copy(cam.right).cross(cam.fwd ?? tv.set(0, 0, -1)).normalize();
  const hx = (H[0] - P[0]) * cam.right.x + (H[1] - P[1]) * cam.right.y + (H[2] - P[2]) * cam.right.z;
  const hy = (H[0] - P[0]) * up.x + (H[1] - P[1]) * up.y + (H[2] - P[2]) * up.z;
  const roll = Math.atan2(-hx, hy);
  const d0 = Math.hypot(cam.pos.x - P[0], cam.pos.y - P[1], cam.pos.z - P[2]), off = Math.min(0.3, 0.12 * d0), k = off / d0;
  const x = P[0] + (cam.pos.x - P[0]) * k, y = P[1] + (cam.pos.y - P[1]) * k, z = P[2] + (cam.pos.z - P[2]) * k;
  const fo: FrontOpts = { mode: "stand", expr: "smile_closed", blink: 1, facing: 0, headTilt: 0.03 * Math.sin(t * 0.8 + CAST[who].i) };
  const pl = person(cam, CAST[who], x, y, z, { side: false, mirror: false }, fo, {}, (1 - k) * 0.92);
  out.places.push({ ...pl, bill: true, roll });
};

/** a boar: side card facing its way (front card when the lens is ahead of it) */
const boar = (out: Stage, cam: CamInfo, i: number, t: number, dark: boolean) => {
  const b = boarAt(i, t);
  if (!b) return;
  const v = viewOf(cam, b.p[0], b.p[2], b.walk > 0 ? b.dir : b.dir, 0);
  const ps: BoarPose = { phase: (t * (b.face === "run" ? 2.2 : 1.1) + i * 0.27) % 1, walk: b.walk, face: dark ? "plain" : b.face, head: b.head, karela: b.karela, sniff: b.face === "sniff" ? t : 0, dark };
  const d = cam.pos.distanceTo(tv.set(b.p[0], 0.6, b.p[2])), k = d < 3 ? 2.0 : d < 8 ? 1.2 : 0.6;
  const key = (o: object) => JSON.stringify(o, (_k, x) => (typeof x === "number" ? Math.round(x * 24) / 24 : x));
  if (v.side) out.places.push({ key: `BO|${key(ps)}`, x: b.p[0], y: 0, z: b.p[2], geo: "boarS", size: [Math.round(900 * k), Math.round(600 * k), k], mirror: v.mirror, draw: (pen) => boarSide(pen, ps) });
  else out.places.push({ key: `BOF|${key(ps)}`, x: b.p[0], y: 0, z: b.p[2], geo: "boarF", size: [Math.round(600 * k), Math.round(600 * k), k], draw: (pen) => boarFront(pen, ps) });
  contact(out, b.p[0], 0, b.p[2], 1.5, 0.8);
  // bitter: wobbly stink lines + a green "yuck" puff over the head
  if (b.face === "bitter" && !dark) {
    const u = (t * 2 + i * 0.3) % 1;
    out.fx.push({ key: `yuck${Math.round(u * 8)}`, cw: 256, ch: 256, draw: (p) => { for (let k = 0; k < 3; k++) { const pts: [number, number][] = []; for (let j = 0; j <= 12; j++) pts.push([60 + k * 60 + 14 * Math.sin(j * 1.3 + u * 6 + k), 230 - j * 17]); p.stroke(pts, 9, "#7fbf4a"); } },
      x: b.p[0] - 0.4 * b.dir, y: 1.35 + 0.15 * u, z: b.p[2], w: 0.6, h: 0.6 });
  }
  if (b.face === "run" && !dark) out.fx.push({ key: "dust", cw: 256, ch: 256, draw: (p) => { for (let k = 0; k < 4; k++) p.ell(128 + 40 * Math.cos(k * 1.7), 150 + 26 * Math.sin(k * 1.7), 52, 40, "#b9a890", 5); }, x: b.p[0] - 0.9 * b.dir, y: 0.35, z: b.p[2], w: 0.9, h: 0.9 });
};

/** water drops from the lota, seeds flying, growth sparkle - small work effects */
const work = (out: Stage, t: number) => {
  const a = ramuAct(t);
  if (a.prop && a.prop[0] === "lota") {
    const p = ramuAt(t);
    for (let k = 0; k < 6; k++) { const u = ((t * 2.2 + k / 6) % 1); out.fx.push({ key: "drop", cw: 64, ch: 64, draw: (pp) => pp.ell(32, 32, 10, 14, "#8fd0f2", 3), x: p[0] + 0.55, y: 1.0 - 1.0 * u, z: p[2] - 0.15, w: 0.05, h: 0.06 }); }
  }
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = "day";
  findSun(cam, SUN);
  if (s.crowd === "room") {
    if (asleep(t)) { sleeper(out, cam, "R", BED_R, t); sleeper(out, cam, "V", BED_V, t); }
    return out;
  }
  if (!asleep(t) && !(t >= 62.9 && t < 72.5) && !(t >= 126.4 && t < 131.6) && !(t >= 243.2 && t < 283.4)) {
    personAt(out, cam, "R", t);
    personAt(out, cam, "V", t);
    work(out, t);
  }
  const dark = (t >= 62.9 && t < 72.5) || (t >= 126.4 && t < 131.6);
  for (let i = 0; i < BOARS; i++) boar(out, cam, i, t, dark);
  return out;
};
