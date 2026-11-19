// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, fxRing, fxShadow, fxContact, fxStars, fxBurst, NATRAJ, HAPPY_SINGH, UMBRELLA_LADY, folk1628, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, badshahAt, bijliAt, AutoPos, LANE, ROUND, GARAGE, GRANDMA_AT, UMBRELLA_AT, HAPPY_AT, CRASH, CRASH_F, FLOWER_F, BIJLI_IN, badshahGlow, bijliGlow, honk, doorGold } from "./story";
import { autoFront, autoSide, AutoLook, AutoState, BADSHAH, BIJLI, GRANDMA, PLAIN } from "./autos";
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "autoF" | "autoS"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; glow?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; fwd?: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => folk1628(v));
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

// ---------------- Rikshaw Love: autos + people by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const SUA = 1.85 / 800; // metres per auto design unit: front card 600 x 800 = 1.39 x 1.85 m
const L = LEAD;
const F_ = (t: number) => Math.round(t * FPS);

/** auto card size by distance [canvas w, h, scale from the design] for front (600 x 800) or side (900 x 700) */
const autoTier = (d: number, side: boolean): [number, number, number] => {
  const k = d < 4 ? 2.0 : d < 9 ? 1.0 : d < 25 ? 0.5 : 0.25;
  return side ? [Math.round(900 * k), Math.round(700 * k), k] : [Math.round(600 * k), Math.round(800 * k), k];
};
const skey = (s: AutoState) => JSON.stringify(s, (_k, v) => (typeof v === "number" ? q(v, 60) : v));

/** one auto: front card when the lens is ahead of it, side card otherwise (mirrored to its heading) */
const auto = (out: Stage, cam: CamInfo, t: number, name: string, look: AutoLook, st: AutoState, p: AutoPos, i: number, shadow = true) => {
  const v = viewOf(cam, p.x, p.z, p.dx, p.dz);
  const d = cam.pos.distanceTo(tmp.set(p.x, D0 + 0.9, p.z));
  // engine idle: a 1-px shudder; moving: bounce
  const idle = (Math.sin(t * 47 + i) > 0 ? 1 : -1) * (p.speed > 0 ? 3 : 1.2);
  const lid = Math.max(st.lid ?? 0, (st.eye ?? "open") === "open" || st.eye === "wide" || st.eye === "soft" ? lidAt(t, i + 500) : 0);
  const s2: AutoState = { ...st, lid, shiver: (st.shiver ?? 0) + idle, mirror: (st.mirror ?? 0) + 0.05 * Math.sin(t * 3 + i) };
  const side = v.side;
  const [w, h, k] = autoTier(d, side);
  out.places.push({
    key: `A|${name}|${side ? "S" : "F"}|${skey(s2)}`, x: p.x, y: D0, z: p.z, geo: side ? "autoS" : "autoF", size: [w, h, k],
    mirror: side && v.mirror, roll: st.tilt ? 0 : 0,
    draw: (pen) => (side ? autoSide(pen, look, s2) : autoFront(pen, look, s2)),
  });
  if (shadow) { const cc = hexOf(CONTACT[LNAME], 0.95), along = Math.abs(p.dx) > Math.abs(p.dz);
    out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (pp) => fxContact(pp, cc), x: p.x, y: D0 + 0.022, z: p.z, w: along ? 2.6 : 1.5, h: along ? 1.5 : 2.6, flat: true }); }
};
/** world position of a front card's right / left headlight (canvas x 364 / 236, y 532) as seen from the lens */
const headlightPos = (cam: CamInfo, p: AutoPos, side: number): V3 => {
  const dx = (side > 0 ? 64 : -64) * SUA, dy = (780 - 532) * SUA; // canvas +x = screen right on a front card
  return [p.x + cam.right.x * dx, D0 + dy, p.z + cam.right.z * dx];
};
const glowCard = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,248,215,1)"); gr.addColorStop(0.3, "rgba(255,226,140,0.75)"); gr.addColorStop(1, "rgba(255,200,90,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
const glow = (out: Stage, cam: CamInfo, at: V3, k: number, size = 0.34) => {
  if (k < 0.02) return;
  const to = tmp.set(cam.pos.x - at[0], cam.pos.y - at[1], cam.pos.z - at[2]).normalize();
  out.fx.push({ key: "glow", cw: 256, ch: 256, draw: glowCard, x: at[0] + to.x * 0.12, y: at[1] + to.y * 0.12, z: at[2] + to.z * 0.12, w: size * (0.5 + 0.5 * k), h: size * (0.5 + 0.5 * k), soft: true, glow: 1.6 * k });
};
const puff = (out: Stage, at: V3, u: number) => {
  if (u < 0 || u >= 1) return;
  out.fx.push({ key: `puff${q(u, 20)}`, cw: 256, ch: 256, draw: (p) => { for (let k = 0; k < 4; k++) p.ell(128 + 30 * Math.cos(k * 1.7) * (0.5 + u), 128 + 22 * Math.sin(k * 1.7) * (0.5 + u), 44 * (1 - 0.5 * u), 38 * (1 - 0.5 * u), "#cfcac4", 5); },
    x: at[0], y: at[1] + 0.4 * u, z: at[2], w: 0.7 + 0.6 * u, h: 0.7 + 0.6 * u });
};
const petals = (out: Stage, t: number, base: V3, n = 9) => {
  for (let i = 0; i < n; i++) {
    const u = ((t * 0.35 + hh(i, 3)) % 1);
    out.fx.push({ key: "petal", cw: 96, ch: 96, draw: (p) => { p.ell(48, 48, 30, 20, "#fbfbf3", 4, 0, 360, 30); p.ell(48, 48, 7, 7, "#f2c94c", 0); },
      x: base[0] - 6 + 12 * u + 2 * Math.sin(i), y: base[1] + 0.6 + 1.6 * Math.sin(u * Math.PI) + 0.3 * hh(i), z: base[2] + (hh(i, 5) - 0.5) * 3, w: 0.18, h: 0.18, rot: u * 6 + i });
  }
};

/** Badshah's face for the beat at frame f */
const badshahState = (id: number, f: number): AutoState => {
  const t = f / FPS, g: "up" | "down" = (id === 6 && f >= 540) || id === 7 || id === 8 ? "down" : "up";
  const sad = (id === 5 && f >= 470) || id === 9 || (id === 10 && f < 878) || id === 11 || (id === 12 && f < 1219) || id === 14 || (id === 15 && f < 1819);
  const base: AutoState = { goggles: g, toothpick: f >= 545 && id <= 8 ? 1.1 : 0.25, natraj: sad ? "sad" : (id === 6 && f >= 545) || id === 7 || id === 8 ? "set" : "grin" };
  switch (id) {
    case 1: return { ...base, eye: "open", mouth: "flat", look: 0.3 };
    case 2: return f < 186 - 2 ? { ...base, eye: "open", mouth: "flat", look: -0.2 } : { ...base, eye: "heart", mouth: "smile" };
    case 3: return { ...base, eye: "heart", mouth: "smile" };
    case 4: {
      if (f < 336) return { ...base, eye: "open", mouth: "shy", look: -0.7 };
      const beat = f >= 389 && f < 405;
      return { ...base, eye: "wide", mouth: beat ? "wobble" : "o", look: -0.5, shiver: beat ? 10 * Math.sin(f * 2.4) : 0 };
    }
    case 5: return f < 470 ? { ...base, eye: "wide", mouth: "o", look: 0.6 } : { ...base, eye: "droop", mouth: "frown", look: 0.8 };
    case 6: return { ...base, eye: f < 545 ? "droop" : "squint", mouth: f < 545 ? "frown" : "grit" };
    case 7: return { ...base, eye: "squint", mouth: "grit" };
    case 8: return { ...base, eye: f < 740 ? "squint" : "dazed", mouth: f < 740 ? "grit" : "wobble", tilt: f < 740 ? 0 : 0.06 * Math.sin(f * 0.3) };
    case 9: return { ...base, eye: f < 800 ? "dazed" : "open", mouth: "frown", look: Math.sin(t * 2.2) };
    case 10: return f < 878 ? { ...base, eye: "droop", mouth: "frown" } : { ...base, eye: "wide", mouth: "smile", look: 0.7 };
    case 11: { const k = clamp01((f - 1041) / 72); return { ...base, eye: "droop", mouth: "frown", lid: 0.55 + 0.3 * k, tilt: -0.02 * k }; }
    case 12: return f < 1219 ? { ...base, eye: "droop", mouth: "flat" } : f < 1254 ? { ...base, eye: "closed", mouth: "smile" } : { ...base, eye: "wide", mouth: "o", look: 0.6 };
    case 13: {
      if (f < CRASH_F) return { ...base, eye: "heart", mouth: "grin" };
      const u = Math.min(1, (f - CRASH_F) / 40);
      return { ...base, eye: "dazed", mouth: "wobble", tilt: 0.16 * (1 - u) * Math.cos((f - CRASH_F) * 0.5) };
    }
    case 14: return { ...base, eye: "droop", mouth: "frown", tape: true, lid: f > 1700 ? 0.7 : 0.6 };
    case 15: return f < 1819 ? { ...base, eye: "droop", mouth: "frown", tape: true } : f < honk - 1 ? { ...base, eye: "open", mouth: "flat", tape: true, look: 0.5 }
      : f < BIJLI_IN + 8 ? { ...base, eye: "wide", mouth: "o", tape: true, look: 0.5 } : { ...base, eye: "soft", mouth: "shy", tape: true, look: 0.3 };
    case 16: return { ...base, eye: "soft", mouth: "shy", tape: true, flower: f >= FLOWER_F };
    case 17: return { ...base, eye: "soft", mouth: f < 2120 ? "shy" : "smile", tape: true, flower: true, glow: [0, badshahGlow(f)] };
    case 18: return { ...base, eye: "soft", mouth: "smile", tape: true, flower: true };
    default: return base;
  }
};
const bijliState = (id: number, f: number): AutoState => {
  switch (id) {
    case 2: case 3: return { eye: "soft", mouth: "smile", look: f > 280 && f < 300 ? -0.6 : 0, mirror: 0.15 * Math.sin(f * 0.12) };
    case 4: return { eye: "soft", mouth: "smile", look: -0.5 };
    case 5: return { eye: "soft", mouth: "smile", look: f > 444 && f < 468 ? -0.9 : 0 };      // a glance back at the green light
    case 12: case 13: return { eye: "soft", mouth: "smile", look: -0.3 };
    case 15: return { eye: "open", mouth: "smile", blush: 0.85, look: -0.2 };
    case 16: return { eye: "soft", mouth: "smile", blush: 0.7 };
    case 17: return { eye: "soft", mouth: "smile", blush: 0.6, glow: [bijliGlow(f), bijliGlow(f)] };
    case 18: return { eye: "soft", mouth: "smile", blush: 0.4, look: -0.4 };
    default: return { eye: "soft", mouth: "smile" };
  }
};

const traffic = (out: Stage, cam: CamInfo, t: number, f: number, spots: [number, number, number, number][]) =>
  spots.forEach(([x, z, dx, sp], i) => auto(out, cam, t, `p${i % 3}`, PLAIN(i), { eye: i % 4 === 1 ? "squint" : "open", mouth: "flat", look: Math.sin(t + i) * 0.4 }, { x, z, dx, dz: 0, speed: sp }, 30 + i));

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const B = badshahAt(id, f), J = bijliAt(id, f), bs = badshahState(id, f);
  switch (s.crowd) {
    case "signal": {
      const go = f >= 470;
      const roll = (x0: number) => (go ? x0 + Math.max(0, f - 470) * 0.12 : x0);
      traffic(out, cam, t, f, [[roll(-9.6), LANE.sea, 1, go ? 1 : 0], [roll(-15.8), LANE.sea, 1, go ? 1 : 0], [roll(-9.4), LANE.e2, 1, go ? 1 : 0], [roll(-15.6), LANE.e2, 1, go ? 1 : 0], [roll(-21.5), LANE.e2, 1, go ? 1 : 0],
        [12 - 0.35 * (f % 400), LANE.w1, -1, 1], [40 - 0.3 * (f % 500), LANE.w2, -1, 1]]);
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      if (J) auto(out, cam, t, "bijli", BIJLI, bijliState(id, f), J, 2);
      if (id === 4) puff(out, [B.x - 1.0, D0 + 0.5, B.z + 0.4], (f - 393) / 20);
      if ((id === 2 && f >= 186) || (id === 4 && f >= 336)) hearts(out, t, [B.x, D0 + 1.9, B.z], id === 2 ? f - 186 : f - 336);
      break;
    }
    case "chase": {
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      const sx = (x0: number) => x0 + (f - 564) * 0.22;
      traffic(out, cam, t, f, [[sx(30), LANE.sea, 1, 1], [sx(48), LANE.e2, 1, 1], [sx(70), LANE.sea, 1, 1], [sx(88), LANE.e2, 1, 1], [60 - (f - 564) * 0.4, LANE.w1, -1, 1]]);
      for (let k = 0; k < 3; k++) puff(out, [B.x - 1.4 - k * 0.6, D0 + 0.35, B.z], ((f * 0.08 + k / 3) % 1));
      auto(out, cam, t, "bijli", BIJLI, { eye: "soft", mouth: "smile" }, { x: B.x + 5.5 + 0.05 * (f - 564), z: LANE.sea, dx: 1, dz: 0, speed: 1 }, 2);
      for (let k = 0; k < 5; k++) out.fx.push({ key: "speed", cw: 256, ch: 32, draw: (p) => p.stroke([[8, 16], [248, 16]], 7, "rgba(255,255,255,0.85)"), x: B.x - 1.8 - 0.5 * k, y: D0 + 0.4 + 0.28 * k, z: B.z + 0.2, w: 1.4 + 0.3 * (k % 2), h: 0.08 });
      break;
    }
    case "round": {
      const ab = (f - 648) * 0.045;
      for (let i = 0; i < 40; i++) {
        const r = 9.5 + (i % 3) * 1.5, a = (i / 40) * Math.PI * 2 + (f - 648) * (0.042 - (i % 3) * 0.004);
        const da = Math.atan2(Math.sin(a - ab), Math.cos(a - ab));
        if (i % 3 !== 2 && Math.abs(da) < 0.6) continue;                          // keep Badshah's slot and the inner ring beside him clear
        auto(out, cam, t, "p0", PLAIN(0), { eye: "open", mouth: "flat" }, { x: ROUND[0] + r * Math.cos(a), z: ROUND[2] + r * Math.sin(a), dx: -Math.sin(a), dz: Math.cos(a), speed: 1 }, 40 + i, false);
      }
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1, false);
      break;
    }
    case "exit": auto(out, cam, t, "badshah", BADSHAH, bs, B, 1); break;
    case "search1": {
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      const wink = f >= 905 && f < 924;
      auto(out, cam, t, "grandma", GRANDMA, { eye: wink ? "squint" : "open", mouth: wink ? "grin" : "smile", look: -0.4 }, { x: GRANDMA_AT[0], z: GRANDMA_AT[2], dx: -1, dz: 0, speed: 0 }, 3);
      const fo: FrontOpts = { mode: "stand", expr: "smile", blink: lidAt(t, 77) };
      out.places.push(person(cam, { i: 77, o: UMBRELLA_LADY, okey: "umb" }, UMBRELLA_AT[0], D0 + 0.15, UMBRELLA_AT[2], { side: false, mirror: false }, fo, {}));
      blob(out, UMBRELLA_AT[0], D0 + 0.15, UMBRELLA_AT[2]);
      out.fx.push({ key: "umbrella", cw: 400, ch: 300, draw: umbrella, x: UMBRELLA_AT[0] + 0.1, y: D0 + 2.45, z: UMBRELLA_AT[2] + 0.1, w: 1.5, h: 1.12, rot: 0.15 * Math.sin(t * 3) });
      break;
    }
    case "search2": {
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      const u = Math.max(0, f - 1005);
      auto(out, cam, t, "pinkfar", { ...BIJLI, garland: false, lashes: false }, { eye: "open", mouth: "flat" }, { x: 236 + 0.004 * u * u + 0.05 * u, z: LANE.sea, dx: 1, dz: 0, speed: u > 0 ? 1 : 0 }, 4);
      break;
    }
    case "hope": case "fall": {
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      if (J) auto(out, cam, t, "bijli", BIJLI, bijliState(id, f), J, 2);
      traffic(out, cam, t, f, [[140 - 0.3 * (f - 1134), LANE.w2, -1, 1], [30 + 0.25 * (f - 1134), LANE.e2, 1, 1]]);
      if (id === 12 && f >= 1215) petals(out, t, [B.x + 2, D0 + 0.6, B.z + 1.5]);
      if (id === 13 && f >= CRASH_F && f < CRASH_F + 70) {
        const u = (f - CRASH_F) / 70;
        out.fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: B.x, y: D0 + 2.2, z: B.z, w: 1.2, h: 0.6 });
        if (f < CRASH_F + 6) { const v = (f - CRASH_F) / 6; out.fx.push({ key: `burst${q(v, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(v, 30)), x: CRASH[0], y: D0 + 1.3, z: CRASH[2], w: 1.6, h: 1.6 }); }
      }
      break;
    }
    case "garage": case "magic": case "flower": case "flicker": {
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      if (J) auto(out, cam, t, "bijli", BIJLI, bijliState(id, f), J, 2);
      if (id === 14) {
        const hop = Math.max(0, Math.sin(t * 9)) * 0.05;
        const fo: FrontOpts = { mode: "stand", expr: f < 1620 || f >= 1640 ? "laugh" : "grin", prop: ["hammer", q(0.5 + 0.5 * Math.sin(t * 6), 20)], blink: lidAt(t, 66), headTilt: 0.08 * Math.sin(t * 7) };
        out.places.push(person(cam, { i: 66, o: HAPPY_SINGH, okey: "happy" }, HAPPY_AT[0], D0 + hop, HAPPY_AT[2], { side: false, mirror: false }, fo, {}));
        blob(out, HAPPY_AT[0], D0 + 0.02, HAPPY_AT[2], 1.1);
      }
      if (id >= 15) {
        const gk = id === 15 ? doorGold(f) : 1;
        for (let k = 0; k < 3; k++) out.fx.push({ key: "ray", cw: 128, ch: 512, draw: rayCard, x: GARAGE[0] - 1.6 + 1.6 * k, y: D0 + 2.0, z: GARAGE[2] + 1.6, w: 1.0, h: 4.2, rot: 0.32 - 0.12 * k, soft: true, glow: 0.6 * gk });
        out.fx.push({ key: "pool", cw: 256, ch: 256, draw: glowCard, x: GARAGE[0], y: D0 + 0.03, z: GARAGE[2] + 1.0, w: 5.5 * gk + 0.01, h: 4.5 * gk + 0.01, flat: true, soft: true, glow: 0.4 * gk });
      }
      if (id === 17) {
        glow(out, cam, headlightPos(cam, B, 1), badshahGlow(f));
        if (J) { const k = bijliGlow(f); glow(out, cam, headlightPos(cam, J, 1), k); glow(out, cam, headlightPos(cam, J, -1), k); }
      }
      break;
    }
    case "together": {
      auto(out, cam, t, "badshah", BADSHAH, bs, B, 1);
      if (J) auto(out, cam, t, "bijli", BIJLI, bijliState(id, f), J, 2);
      break;
    }
    default: break;
  }
  return out;
};
const rayCard = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "rgba(255,214,140,0.0)"); gr.addColorStop(0.35, "rgba(255,214,140,0.42)"); gr.addColorStop(1, "rgba(255,214,140,0.0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(40, 0); g.lineTo(88, 0); g.lineTo(128, 512); g.lineTo(0, 512); g.closePath(); g.fill();
};
const hearts = (out: Stage, t: number, at: V3, df: number) => {
  for (let i = 0; i < 4; i++) {
    const u = ((df / 30) * 0.6 + i * 0.25) % 1;
    if (df < i * 6) continue;
    out.fx.push({ key: "heart", cw: 128, ch: 128, draw: (p) => p.poly([[64, 110], [16, 60], [24, 30], [46, 22], [64, 40], [82, 22], [104, 30], [112, 60]], "#ef4f7d", 7),
      x: at[0] + (hh(i, 7) - 0.5) * 0.8, y: at[1] + 0.9 * u, z: at[2] + (hh(i, 8) - 0.5) * 0.4, w: 0.26 * (1 - 0.3 * u), h: 0.26 * (1 - 0.3 * u), rot: 0.3 * Math.sin(t * 3 + i) });
  }
};
const umbrella = (p: Pen) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (1 + i / 20); pts.push([200 + 180 * Math.cos(a), 170 + 120 * Math.sin(a)]); }
  for (let k = 4; k >= 0; k--) { const x = 20 + k * 90; pts.push([x + 45, 175], [x, 160]); }
  p.poly(pts, "#f07aa8", 7);
  p.stroke([[200, 50], [200, 290]], 7);
};
export { FPS, F_, L };
