// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, fxStars, fxBurst, PATIENT, DOCTOR, FATHER, HELPER, Outfit, Expr, FrontOpts, SideOpts, MouthK, INK } from "./toon";
import { FPS, D0, SHOTS, V3, clamp01, MARK, standAt, headOf, phaseOf, Who as WhoId, INJ_A, INJ_B } from "./story";
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body"; roll?: number; size?: [number, number, number];
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

// ---------------- Injection Ka Khauf: four people in one room ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const L = LEAD;
const F_ = (t: number) => Math.round(t * FPS);
const tv = new THREE.Vector3(), tu = new THREE.Vector3();

const CAST: Record<Exclude<WhoId, "-">, Who> = {
  P: { i: 1, o: PATIENT, okey: "pat" }, D: { i: 2, o: DOCTOR, okey: "doc" }, F: { i: 3, o: FATHER, okey: "dad" }, H: { i: 4, o: HELPER, okey: "hlp" },
};
/** open mouth shapes while speaking [mid, loud] */
const TALK: Record<Exclude<WhoId, "-">, [MouthK, MouthK]> = { P: ["o", "O"], D: ["grin", "laugh"], F: ["o", "O"], H: ["o", "grin"] };
/** the voice envelope drives the speaker's mouth: open above ~45/100, wide above 72, held >= 2 frames (no 1-frame flicker) */
const talkAt = (who: WhoId, sp: WhoId, f: number): MouthK | null => {
  if (who === "-" || who !== sp) return null;
  const v = (k: number) => VOICE[Math.max(0, Math.min(VOICE.length - 1, k))] ?? 0;
  const e = Math.max(v(f), v(f - (f % 2)));
  return e >= 72 ? TALK[who][1] : e >= 45 ? TALK[who][0] : null;
};

/** each character's face per shot (the original's beats: the patient's dread, the doctor's glee, the father's
 *  sternness, the helper's grip) */
const exprOf = (who: WhoId, id: number, f: number): Expr => {
  const ph = phaseOf(id), k = id % 3;
  switch (who) {
    case "P":
      if (ph === "carry") return id === 68 ? "relief" : "dazed";
      if (ph === "held") return id >= 52 ? (id === 54 ? "dazed" : "pained") : k === 0 ? "shock" : "pained";
      return [2, 5, 13, 23, 24, 26].includes(id - 1) || id === 36 ? "shock" : "nervous";
    case "D": return [8, 40, 50, 55, 64].includes(id) ? "laugh" : "grin";
    case "F": return id === 61 ? "shock" : ph === "carry" ? "stern" : id === 47 ? "grin" : "stern";
    case "H": return id === 44 || id === 59 ? "grin" : "neutral";
  }
  return "neutral";
};

/** contact pool under someone (no sun tails indoors) */
const contact = (out: Stage, x: number, y: number, z: number, w = 0.52, h = 0.4) => {
  const cc = hexOf(CONTACT.day, 0.9);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w, h, flat: true });
};
/** horizontal facing toward a point: -1 / 0 / +1 on screen */
const faceTo = (cam: CamInfo, from: V3, to: V3) => {
  const d = (to[0] - from[0]) * cam.right.x + (to[2] - from[2]) * cam.right.z;
  return (Math.abs(d) < 0.15 ? 0 : d > 0 ? 1 : -1) as -1 | 0 | 1;
};
/** someone standing at their mark, front view, facing the person they deal with */
const stand = (out: Stage, cam: CamInfo, id: number, f: number, who: Exclude<WhoId, "-">, partner: WhoId, extra: Partial<FrontOpts> = {}, at?: V3) => {
  const p = at ?? standAt(who, id), t = f / FPS, s = SHOTS[id - 1];
  if (Math.hypot(cam.pos.x - p[0], cam.pos.z - p[2]) < 0.75) return; // the lens is at this person's shoulder (ots)
  const facing = partner === "-" ? 0 : faceTo(cam, p, headOf(partner, id));
  const fo: FrontOpts = { mode: "stand", expr: exprOf(who, id, f), blink: lidAt(t, CAST[who].i), facing, talk: talkAt(who, s.speaker, f),
    headTilt: 0.03 * Math.sin(t * 1.3 + CAST[who].i), ...extra };
  out.places.push(person(cam, CAST[who], p[0], p[1], p[2], { side: false, mirror: false }, fo, {}));
  contact(out, p[0], p[1], p[2]);
};

/** the patient lying on the couch: a full billboard rolled so his head points along the couch to -x on screen,
 *  pulled toward the lens (along the sight ray, size-compensated) so the couch pad never cuts the card */
const lying = (out: Stage, cam: CamInfo, id: number, f: number, extra: Partial<FrontOpts> = {}) => {
  const t = f / FPS, s = SHOTS[id - 1], P = MARK.P, H = MARK.PH;
  const up = tu.copy(cam.right).cross(cam.fwd ?? tv.set(0, 0, -1)).normalize(); // camera up = right x fwd
  const hx = (H[0] - P[0]) * cam.right.x + (H[1] - P[1]) * cam.right.y + (H[2] - P[2]) * cam.right.z;
  const hy = (H[0] - P[0]) * up.x + (H[1] - P[1]) * up.y + (H[2] - P[2]) * up.z;
  const roll = Math.atan2(-hx, hy);
  const d0 = Math.hypot(cam.pos.x - P[0], cam.pos.y - P[1], cam.pos.z - P[2]), off = Math.min(0.45, 0.3 * d0);
  const k = off / d0, x = P[0] + (cam.pos.x - P[0]) * k, y = P[1] + (cam.pos.y - P[1]) * k, z = P[2] + (cam.pos.z - P[2]) * k;
  const squirm = id >= 38 && id <= 49 ? 0.06 * Math.sin(t * 13) : 0;
  const fo: FrontOpts = { mode: "stand", expr: exprOf("P", id, f), blink: lidAt(t, 1), talk: talkAt("P", s.speaker, f),
    facing: 0, headTilt: squirm, ...extra };
  const pl = person(cam, CAST.P, x, y, z, { side: false, mirror: false }, fo, {}, 1 - k);
  out.places.push({ ...pl, bill: true, roll: roll + squirm * 0.3 });
  // a long soft pool on the pad under him
  const cc = hexOf(CONTACT.day, 0.8);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: 0.12, y: 0.752, z: 0, w: 1.8, h: 0.55, flat: true });
};

/** the big comedy syringe as an effect card (needle to the right, k = plunger 0 .. 1 pushed) */
const syringeCard = (k: number) => (p: Pen) => {
  const g = p.g;
  p.stroke([[300, 64], [500, 64]], 6, "#9aa3ad");                                 // needle
  p.poly([[96, 34], [300, 34], [300, 94], [96, 94]], "#eef6fb", 7);               // barrel
  g.save(); g.globalAlpha = 0.85; p.poly([[110 + 150 * k, 44], [290, 44], [290, 84], [110 + 150 * k, 84]], "#3f9fe0", 0); g.restore();
  for (let i = 0; i < 6; i++) p.stroke([[140 + 28 * i, 34], [140 + 28 * i, 52]], 3, INK);
  p.poly([[300, 46], [320, 54], [320, 74], [300, 82]], "#c9ccd2", 5);              // hub
  p.stroke([[30 + 150 * k, 64], [110 + 150 * k, 64]], 10, "#c9ccd2");             // plunger rod
  p.poly([[16 + 150 * k, 30], [34 + 150 * k, 30], [34 + 150 * k, 98], [16 + 150 * k, 98]], "#c9ccd2", 5);
  p.poly([[86, 22], [100, 22], [100, 106], [86, 106]], "#c9ccd2", 5);              // finger flange
};
const syringe = (out: Stage, at: V3, w: number, rot: number, k: number) =>
  out.fx.push({ key: `syr${q(k, 20)}`, cw: 512, ch: 128, draw: syringeCard(q(k, 20)), x: at[0], y: at[1], z: at[2], w, h: w / 4, rot });

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], ph = phaseOf(id);
  LNAME = "day";
  findSun(cam, SUN);
  const prop: FrontOpts["prop"] = ["syringe", q(0.35 + 0.15 * Math.sin(t * 2.1), 20)];
  if (ph !== "carry") {
    lying(out, cam, id, f);
    stand(out, cam, id, f, "D", "P", { prop, look: -0.3 });
    stand(out, cam, id, f, "F", s.speaker === "F" ? "D" : "P");
    stand(out, cam, id, f, "H", "P", ph === "held" ? { headTilt: 0.12, look: 0.4 } : {});
  } else {
    // the father carries the dazed patient (a sitting card at his chest), the doctor waves them off
    const Fc = standAt("F", id), bob = Math.abs(Math.sin(t * 4.2)) * 0.03;
    stand(out, cam, id, f, "F", "D", { headTilt: 0.05 * Math.sin(t * 4.2) }, [Fc[0], bob, Fc[2]]);
    const to = tv.set(cam.pos.x - Fc[0], 0, cam.pos.z - Fc[2]).normalize();
    const px = Fc[0] + to.x * 0.28, pz = Fc[2] + to.z * 0.28, t2 = f / FPS;
    const fo: FrontOpts = { mode: "sit", expr: exprOf("P", id, f), blink: lidAt(t2, 1), talk: talkAt("P", s.speaker, f), facing: 0, headTilt: -0.12 };
    const pl = person(cam, CAST.P, px, 0.62 + bob, pz, { side: false, mirror: false }, fo, {}, 0.86);
    out.places.push({ ...pl, roll: -0.42 + 0.04 * Math.sin(t * 4.2) });
    stand(out, cam, id, f, "D", "F", { prop });
    stand(out, cam, id, f, "H", "F");
  }
  // inserts: the syringe close-up (shot 2), the hip with the needle hovering (31) and going in (51)
  if (s.kind === "insSyr") {
    const hnd = standAt("D", id);
    syringe(out, [hnd[0] + 0.3, 1.5, hnd[2] - 0.15], 0.62, 0.35 + 0.05 * Math.sin(t * 3), 0);
    if (Math.floor(f / 6) % 2 === 0) out.fx.push({ key: "drop", cw: 64, ch: 64, draw: (p) => p.ell(32, 32, 10, 14, "#7fd0ff", 3), x: hnd[0] + 0.62, y: 1.62, z: hnd[2] - 0.18, w: 0.05, h: 0.05 });
  }
  if (id === 31 || id === 51) {
    const hip: V3 = [0.25, 0.86, 0], u = (f - s.a) / Math.max(1, s.b - s.a);
    const dn = id === 31 ? 0.35 + 0.05 * Math.sin(t * 5) : u < 0.25 ? 0.45 - 1.6 * u : u < 0.85 ? 0.05 : 0.05 + 2.5 * (u - 0.85);
    const pk = id === 51 ? clamp01((u - 0.3) / 0.45) : 0;
    const to = tv.set(cam.pos.x - hip[0], cam.pos.y - hip[1], cam.pos.z - hip[2]).normalize();
    syringe(out, [hip[0] + to.x * 0.3, hip[1] + to.y * 0.3 + dn + 0.13, hip[2] + to.z * 0.3], 0.5, -Math.PI / 2 + 0.18, pk);
    const fb = f - (s.a + Math.round(0.25 * (s.b - s.a)));
    if (id === 51 && fb >= 0 && fb < 8) { const v = fb / 8; out.fx.push({ key: `burst${q(v, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(v, 30)), x: hip[0] + to.x * 0.32, y: hip[1] + to.y * 0.32 + 0.02, z: hip[2] + to.z * 0.32, w: 0.4, h: 0.4 }); }
  }
  // the shot after the needle: stars over the patient's head
  if (id === 52 || id === 53) {
    const u = ((f - INJ_B) % 60) / 60, H = MARK.PH;
    out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: H[0], y: H[1] + 0.32, z: H[2] - 0.35, w: 0.5, h: 0.25 });
  }
  return out;
};
export { FPS, F_, L, INJ_A };
