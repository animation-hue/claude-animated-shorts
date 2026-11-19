// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, fxSplash, fxRing, fxShadow, fxContact, SAILOR, ADMIRAL, KING, BUILDER, JUDGE, TOURIST, folk1628,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, SHOTS, V3, smooth, clamp01, ShipPose, crewSide, RUNS, RUN_F, STOP_F, ADMIRAL_AT, KING_AT, BUILDER_AT, TABLE_AT, STOOL_AT, KING_INQ,
  BOAT_AT, SINK_X, COURSE_Z,
} from "./story";
import { deckH, halfB, PORT_X, PORT_ROWS, MASTS, Ship } from "./ship";
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
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
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
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; fwd?: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const CREW = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => SAILOR(v));
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => folk1628(v));
const VISIT = [0, 1, 2, 3, 4, 5, 6].map((v) => TOURIST(v));
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

// ---------------- crowd by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const GANGWAY_X = 2.0;
const L = LEAD;
const wv = new THREE.Vector3();
/** a point on the ship's deck (local x, z) in world space under the current pose */
const onDeck = (ship: Ship, lx: number, lz: number, up = 0) => ship.toWorld(lx, deckH(lx) + up, lz, wv.clone());
/** screen roll for a card standing on something heeled by `heel` about an axis along world direction (ax, az) */
const rollOn = (cam: CamInfo, heel: number, ax: number, az: number) => {
  const fw = cam.fwd; if (!fw) return 0;
  return -heel * (fw.x * ax + fw.z * az);
};
const shipAxis = (sp: ShipPose): [number, number] => [Math.cos(sp.yaw), -Math.sin(sp.yaw)];

/** everyone standing still somewhere: front view, contact shadow, blinks */
const stander = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, x: number, y: number, z: number, fo: FrontOpts, scale = 1, roll = 0, shadow = true) => {
  const pl = person(cam, { i, o, okey }, x, y, z, { side: false, mirror: false }, { mode: "stand", blink: lidAt(t, i), ...fo }, {}, scale);
  out.places.push(roll ? { ...pl, roll } : pl);
  if (shadow) blob(out, x, y, z, scale);
};

/** a handful of crew on deck (sailing shots) */
const crewOnDeck = (out: Stage, cam: CamInfo, t: number, sp: ShipPose, ship: Ship, n: number, expr: (i: number) => Expr) => {
  const [ax, az] = shipAxis(sp);
  for (let i = 0; i < n; i++) {
    const lx = -9 + (i / Math.max(1, n - 1)) * 19 + (hh(i, 3) - 0.5) * 1.5, lz = (i % 2 ? 1 : -1) * (1.3 + hh(i, 4) * 2.0); // clear of the masts on the centre line
    const p = onDeck(ship, lx, lz);
    stander(out, cam, t, i, CREW[i % 8], `c${i % 8}`, p.x, p.y, p.z, { expr: expr(i), wave: undefined }, 1, rollOn(cam, sp.heel, ax, az), false);
  }
};

/** the thirty of the stability test: lined at the port rail, then running across and back, stopped on the third run */
const testCrew = (out: Stage, cam: CamInfo, t: number, f: number, sp: ShipPose, ship: Ship) => {
  const [ax, az] = shipAxis(sp);
  for (let i = 0; i < 30; i++) {
    const col = i % 10, row = Math.floor(i / 10);
    const lx = -8.4 + col * 1.85 + (hh(i) - 0.5) * 0.5;
    const lag = (hh(i, 2) * 6 + row * 2) | 0; // each one leaves a few frames apart
    const side = crewSide(f - lag), sidePrev = crewSide(f - lag - 2);
    const lz = side * (3.15 - row * 0.85) + (hh(i, 5) - 0.5) * 0.3;
    const p = onDeck(ship, lx, lz);
    const moving = Math.abs(side - sidePrev) > 0.005;
    const dir = Math.sign(side - sidePrev) || 1;
    const wdx = Math.sin(sp.yaw) * dir, wdz = Math.cos(sp.yaw) * dir; // world direction of the run (local +-z)
    const stage3 = f >= RUNS[2], lurch = f >= 800 && f < 860;
    const expr: Expr = lurch ? (i % 3 ? "shock" : "nervous") : f >= STOP_F - 2 ? "nervous" : stage3 ? (i % 2 ? "nervous" : "grin") : i % 3 === 0 ? "laugh" : "grin";
    const roll = rollOn(cam, sp.heel, ax, az);
    if (moving) {
      const view = viewOf(cam, p.x, p.z, wdx, wdz);
      const phase = q(((f - lag) / 13 + hh(i, 6)) % 1, 60);
      const so: SideOpts = { mode: "march", phase, expr, blink: 0, stomp: 1.4, stride: 1.25 * view.fs };
      const fo: FrontOpts = { mode: "march", phase, expr, blink: 0, lift: 80 };
      const pl = person(cam, { i, o: CREW[i % 8], okey: `c${i % 8}` }, p.x, p.y, p.z, view, fo, so);
      out.places.push({ ...pl, roll });
    } else {
      const look = side < 0 ? 1 : -1;
      stander(out, cam, t, i, CREW[i % 8], `c${i % 8}`, p.x, p.y, p.z, { expr, look, headTilt: lurch ? (hh(i, 7) - 0.5) * 0.4 : 0 }, 1, roll, false);
    }
  }
  // the admiral watching from the quarterdeck rail
  const a = onDeck(ship, ADMIRAL_AT[0], ADMIRAL_AT[2]);
  const aexpr: Expr = f < RUNS[1] ? "stern" : f < STOP_F - 2 ? "nervous" : f < 860 ? "shock" : "nervous";
  stander(out, cam, t, 90, ADMIRAL, "adm", a.x, a.y, a.z, { expr: aexpr, wave: f >= STOP_F - 2 && f < STOP_F + 30 ? 0.9 : undefined }, 1, rollOn(cam, sp.heel, ax, az), false);
};

/** cheering quay crowd (near quay, z -31..-35) between x0 and x1 */
const quayCrowd = (out: Stage, cam: CamInfo, t: number, x0: number, x1: number, n: number, mood: "cheer" | "shock" | "watch", seed = 0) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) / n) * (x1 - x0) + (hh(i, 1 + seed) - 0.5) * 1.2, z = -31.0 - hh(i, 2 + seed) * 3.6;
    const kid = i % 6 === 4, o = kid ? KID : FOLK[i % 6];
    const cheer = mood === "cheer", hop = kid && cheer ? Math.max(0, Math.sin(t * 7 + i)) * 0.16 : 0;
    const expr: Expr = mood === "shock" ? (i % 3 ? "shock" : "nervous") : mood === "watch" ? (i % 2 ? "neutral" : "smile_closed") : (["smile", "grin", "laugh", "smile_closed"] as Expr[])[i % 4];
    const fo: FrontOpts = { mode: "stand", expr, wave: cheer && i % 3 !== 2 ? q(Math.sin(t * 9 + i * 1.3), 30) : undefined, blink: lidAt(t, i + 40) };
    out.places.push(person(cam, { i: i + 200, o, okey: kid ? "kid" : `f${i % 6}` }, x, D0 + hop, z, { side: false, mirror: false }, fo, {}, kid ? 0.72 : 1));
    blob(out, x, D0, z, kid ? 0.72 : 1, hop > 0 ? 0.6 : 1);
  }
};

/** sailors in the water around the masts (survivors held on to the masts) */
const swimmers = (out: Stage, cam: CamInfo, t: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hh(i) * 0.6, r = 3.2 + hh(i, 2) * 4.5;
    const x = SINK_X + 0.5 + Math.cos(a) * r, z = COURSE_Z + Math.sin(a) * r * 0.8, bob = 0.04 * Math.sin(t * 2.2 + i);
    const expr: Expr = (["dazed", "shock", "pained", "relief"] as Expr[])[i % 4];
    out.places.push(person(cam, { i, o: CREW[i % 8], okey: `c${i % 8}` }, x, -0.62 + bob, z, { side: false, mirror: false }, { mode: "sit", expr, blink: lidAt(t, i), look: 0 }, {}));
    const u = ((t + hh(i, 7) * 2) % 2.2) / 2.2;
    out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x, y: 0.03, z, w: 2.0, h: 2.0, flat: true });
    out.fx.push({ key: `blob|contact|${WATERLINE}`, cw: 128, ch: 128, draw: (p) => fxContact(p, WATERLINE), x, y: 0.034, z, w: 0.7, h: 0.5, flat: true });
  }
};
const WATERLINE = hexOf([0.3, 0.36, 0.52], 1);

// ---- the rowing boat (shot 14): the kid stands up, the boat tips; sits down, it rights itself ----
const STAND_A = 1405, SIT_A = 1490;
const boatStand = (f: number) => smooth((f - STAND_A) / 8) * (1 - smooth((f - SIT_A) / 8));
export const boatRoll = (f: number) => {
  const up = boatStand(f), grow = smooth((f - 1430) / 46);
  const tip = up * (0.06 + 0.3 * grow) * Math.sin((f - STAND_A) * 0.16);
  const settle = f > SIT_A ? 0.2 * Math.exp(-(f - SIT_A) / 14) * Math.cos((f - SIT_A) * 0.2) : 0;
  return tip + settle;
};
const boatKid = (out: Stage, cam: CamInfo, t: number, f: number) => {
  const roll = boatRoll(f), yaw = 0.25, up = boatStand(f);
  const ax = Math.cos(yaw), az = -Math.sin(yaw);
  const standing = up > 0.5;
  const expr: Expr = !standing ? (f > SIT_A ? "relief" : "smile") : f < 1440 ? "grin" : "shock";
  const fo: FrontOpts = standing ? { mode: "stand", expr, wave: q(0.9 * Math.sin(f * 0.35), 30), blink: lidAt(t, 5), headTilt: roll * 0.8 }
    : { mode: "sit", expr, blink: lidAt(t, 5) };
  const y = standing ? 0.06 : -0.12, lift = y * Math.cos(roll);
  const pl = person(cam, { i: 5, o: KID, okey: "kid" }, BOAT_AT[0], lift, BOAT_AT[2] + Math.sin(roll) * y, { side: false, mirror: false }, fo, {}, 0.72);
  out.places.push({ ...pl, roll: rollOn(cam, roll, ax, az) });
  // ripples round the boat when it rocks
  const u = (t * 0.7) % 1;
  out.fx.push({ key: `ring${q(u, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 30)), x: BOAT_AT[0], y: 0.03, z: BOAT_AT[2], w: 3.4 * (0.3 + Math.abs(roll) * 2.5), h: 3.4 * (0.3 + Math.abs(roll) * 2.5), flat: true });
};

// ---- effects ----
const smokeCloud = (p: Pen, t: number) => {
  // opaque cut-out puffs (they write depth, so the world ink behind them is hidden), shrinking as they thin out
  const k = 1 - 0.55 * t * t;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, d = 50 + 90 * t, r = (70 + 22 * (i % 3)) * (0.7 + 0.5 * t) * k;
    p.ell(256 + d * Math.cos(a), 256 + d * 0.6 * Math.sin(a), r, r * 0.82, i % 2 ? "#c9c3ba" : "#dcd6cc", 6);
  }
  if (t < 0.3) { // muzzle flash: spiky orange star
    const R = 150 * (1 - t * 2.5), pts: [number, number][] = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr2 = i % 2 ? R * 0.42 : R; pts.push([256 + rr2 * Math.cos(a), 256 + rr2 * Math.sin(a)]); }
    p.poly(pts, "#ff9a2e", 6); p.ell(256, 256, R * 0.3, R * 0.3, "#ffe08a", 0);
  }
};
/** the farewell salute: starboard barrels fire one after another from f1019 */
const salute = (out: Stage, f: number, ship: Ship) => {
  PORT_X.forEach((x, i) => {
    const f0 = 1017 + (PORT_X.length - 1 - i) * 1.2, u = (f - f0) / 26; // bow first: the guns in frame fire on "salute"
    if (u < 0 || u >= 1) return;
    const row = PORT_ROWS[i % 2], m = ship.toWorld(x, row.y, halfB(x, row.y) + 2.4 + 2.2 * u, new THREE.Vector3());
    out.fx.push({ key: `smoke${q(u, 30)}`, cw: 512, ch: 512, draw: (p) => smokeCloud(p, q(u, 30)), x: m.x, y: m.y, z: m.z, w: 3.2 + 2 * u, h: 3.2 + 2 * u });
  });
};
/** the sea pouring in through the open port-side gun ports as she heels */
const flooding = (out: Stage, f: number, sp: ShipPose, ship: Ship, cam: CamInfo) => {
  if (sp.heel > -0.3 || sp.sink > 6) return;
  // a soft curl of sea over the sill of whichever row of open ports is at the water line; the card is placed so the
  // curl's end (canvas 300, 150 of 400 x 300) lands in the port opening
  const W = 3.4, H = 2.55, ox = ((300 - 200) / 400) * W, oy = ((150 - 150) / 300) * H;
  for (const row of PORT_ROWS) PORT_X.forEach((x, i) => {
    const m = ship.toWorld(x, row.y, -halfB(x, row.y) - 0.1, new THREE.Vector3());
    if (m.y < -0.4 || m.y > 1.6) return;
    const u = q(((f * 0.05 + hh(i, 9)) % 1), 24);
    out.fx.push({ key: `curl${u}`, cw: 400, ch: 300, draw: (p) => waterCurl(p, u), x: m.x - cam.right.x * ox, y: Math.max(0.5, m.y - oy + 0.05), z: m.z - cam.right.z * ox - 1.25, w: W, h: H });
  });
};
const qb = (a: [number, number], c: [number, number], b: [number, number], n = 10) => Array.from({ length: n + 1 }, (_, k) => {
  const t = k / n, s2 = 1 - t; return [s2 * s2 * a[0] + 2 * s2 * t * c[0] + t * t * b[0], s2 * s2 * a[1] + 2 * s2 * t * c[1] + t * t * b[1]] as [number, number];
});
/** soft wavy arc of sea curling up from the surface and down over a sill into the port at (300, 150); foam at the base */
const waterCurl = (p: Pen, u: number) => {
  const w = 7 * Math.sin(u * Math.PI * 2), w2 = 7 * Math.cos(u * Math.PI * 2);
  const outer = [...qb([10, 292], [70, 120 + w], [190, 92 + w2]), ...qb([190, 92 + w2], [285, 82], [306, 150]).slice(1)];
  const inner = [...qb([284, 160], [262, 128], [205, 132 - w2]), ...qb([205, 132 - w2], [120, 150 + w], [92, 292]).slice(1)];
  p.poly([...outer, ...inner], "#58bde9", 7);
  p.stroke(qb([40, 270], [95, 135 + w], [200, 108 + w2], 12), 11, "#a9def7");                  // light along the crest
  p.stroke(qb([200, 108 + w2], [262, 104], [282, 138], 8), 7, "#e8f7ff");
  for (let k = 0; k < 6; k++) p.ell(30 + k * 32 + 6 * Math.sin(u * 9 + k), 284 - (k % 2) * 7, 26 - (k % 3) * 4, 13, "#f2fbff", 5); // foam
  p.ell(298, 146, 9, 7, "#e8f7ff", 4);                                                                   // spill into the port
};
/** water streaming off the hull as she is raised (shot 18) */
const drips = (out: Stage, f: number, sp: ShipPose, ship: Ship) => {
  if (f < 1862 || sp.sink < 0.5) return;
  for (let i = 0; i < 9; i++) {
    const x = -16 + i * 4, m = ship.toWorld(x, 0, halfB(x, 0) + 0.4, new THREE.Vector3());
    const u = q(((f * 0.05 + hh(i, 4)) % 1), 30);
    out.fx.push({ key: `splash${u}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, u), x: m.x, y: 0.9, z: Math.max(m.z, COURSE_Z + 3), w: 3.0, h: 3.0 });
  }
};
const candle = (p: Pen, fl: number) => {
  p.poly([[42, 290], [78, 290], [78, 130], [42, 130]], "#f4efe2", 6);
  p.ell(60, 100 - 6 * fl, 15 + 3 * fl, 32 + 6 * fl, "#ffb43a", 5);
  p.ell(60, 108, 7, 14, "#fff0b0", 0);
};
const capAlone = (p: Pen) => {
  p.ell(100, 120, 70, 44, "#5e4b3a", 8, 180, 360);
  p.poly([[30, 120], [170, 120], [190, 132], [30, 134]], "#4a3c30", 7);
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, f: number, sp: ShipPose, ship: Ship, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  switch (s.crowd) {
    case "sail":
      crewOnDeck(out, cam, t, sp, ship, id === 12 ? 8 : 12, (i) => (id === 12 && f > 1090 ? (i % 2 ? "shock" : "nervous") : i % 3 ? "smile_closed" : "grin"));
      if (id === 12) flooding(out, f, sp, ship, cam);
      break;
    case "masts":
      if (id === 13 && f >= 1150) swimmers(out, cam, t, 9);
      if (id === 13) quayCrowd(out, cam, t, SINK_X - 22, SINK_X + 18, 22, "shock", 3);
      if (id === 2) flooding(out, f, sp, ship, cam);
      break;
    case "king": {
      stander(out, cam, t, 80, KING, "king", KING_AT[0], KING_AT[1], KING_AT[2], { expr: t < 241 / FPS - L ? "smile_closed" : "stern", facing: 1 });
      for (const [k, dx] of [[81, -2.6], [82, 2.4]] as const) stander(out, cam, t, k, FOLK[k % 6], `f${k % 6}`, KING_AT[0] + dx, D0, KING_AT[2] - 1.2, { expr: "neutral" });
      break;
    }
    case "builder":
      stander(out, cam, t, 70, BUILDER, "bld", BUILDER_AT[0], BUILDER_AT[1], BUILDER_AT[2], { expr: id === 3 ? "neutral" : t < 442 / FPS - L ? "neutral" : "nervous", headTilt: id === 6 ? 0.12 * Math.sin(t * 2.4) : 0, prop: ["hammer", 1] });
      if (id === 3) quayCrowd(out, cam, t, -16, 14, 12, "watch", 1);
      break;
    case "admiral": {
      const a = onDeck(ship, ADMIRAL_AT[0], ADMIRAL_AT[2]);
      const expr: Expr = id === 7 ? (t < 553 / FPS - L ? "stern" : "neutral") : t < 895 / FPS ? "nervous" : "dazed";
      stander(out, cam, t, 90, ADMIRAL, "adm", a.x, a.y, a.z, { expr, facing: -1 }, 1, 0, false);
      break;
    }
    case "test": testCrew(out, cam, t, f, sp, ship); break;
    case "launch":
      quayCrowd(out, cam, t, -14, 16, 16, "cheer", 2);
      crewOnDeck(out, cam, t, sp, ship, 10, () => "grin");
      break;
    case "shore":
      quayCrowd(out, cam, t, sp.x - 26, sp.x + 18, 26, "cheer", 4);
      crewOnDeck(out, cam, t, sp, ship, 10, (i) => (i % 2 ? "grin" : "laugh"));
      salute(out, f, ship);
      break;
    case "boat": boatKid(out, cam, t, f); break;
    case "inquiry": case "kingInq": {
      const turn = id === 17 && f >= 1739 - 2;
      [-1.35, 0, 1.35].forEach((dx, k) => stander(out, cam, t, 60 + k, JUDGE(k), `j${k}`, TABLE_AT[0] + dx, D0, TABLE_AT[2] - 0.85,
        { expr: turn ? (k === 1 ? "shock" : "nervous") : "stern", look: turn ? 1 : 0 }, 1, 0, false));
      out.fx.push({ key: "cap", cw: 220, ch: 160, draw: capAlone, x: STOOL_AT[0] - 0.08, y: D0 + 0.66, z: STOOL_AT[2], w: 0.42, h: 0.3 });
      const fl = q(0.5 + 0.5 * Math.sin(t * 13), 10);
      out.fx.push({ key: `candle${fl}`, cw: 120, ch: 300, draw: (p) => candle(p, fl), x: STOOL_AT[0] + 0.2, y: D0 + 0.72, z: STOOL_AT[2] + 0.05, w: 0.12, h: 0.3 });
      if (id === 17) stander(out, cam, t, 80, KING, "king", KING_INQ[0], KING_INQ[1], KING_INQ[2], { expr: f < 1783 ? "neutral" : "smile_closed", facing: -1 });
      break;
    }
    case "lift": drips(out, f, sp, ship); quayCrowd(out, cam, t, SINK_X - 20, SINK_X + 16, 14, "watch", 5); break;
    case "tourists":
      for (let i = 0; i < 24; i++) {
        const row = i % 3, x = -4.5 + ((Math.floor(i / 3) + 0.5) / 8) * 11 + (hh(i, 31) - 0.5) * 0.9 + row * 0.45, z = -31.7 - row * 1.25 - hh(i, 32) * 0.5;
        if (Math.abs(x - GANGWAY_X) < 1.3 && z > -32.4) continue; // keep the barrier clear
        const kid = i % 7 === 5, o = kid ? KID : VISIT[i % 7];
        const fo: FrontOpts = { expr: (["smile", "grin", "smile_closed", "laugh"] as Expr[])[i % 4], wave: i % 4 === 1 ? q(Math.sin(t * 6 + i), 30) : undefined, look: Math.round(Math.sin(t * 0.7 + i) * 1.2) > 0 ? 1 : 0 };
        stander(out, cam, t, i + 300, o, kid ? "kid" : `v${i % 7}`, x, D0, z, fo, kid ? 0.72 : 1);
      }
      break;
    default: break;
  }
  return out;
};
export { FPS, MASTS };
