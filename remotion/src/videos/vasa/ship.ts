// The Vasa, our own cartoon build (not a replica): lofted hull with tumblehome and a high stern castle, a painted
// transom, beakhead, two rows of gun ports whose red lids swing open with bronze barrels sliding out, three masts with
// yards, bulging sails, shrouds and Swedish flags. Also a small rowing boat for the "stand up in a boat" analogy.
// Local frame: x along the keel (bow +x), y up (waterline y = 0), z across (starboard +z). Posed per frame by world.ts
// from story.ts shipPose(): position, yaw, heel (roll about the keel), port lids, guns, sail bulge, flag snap.
import * as THREE from "three";
import { lam, V } from "./build";
import { ctex } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { ShipPose, smooth, clamp01 } from "./story";

// ---------------- hull form ----------------
export const HL = 44; // hull length (m), stern x = -22, stem x = +22
export const HB = 5.1; // max half-beam
export const KEEL = -4.2; // keel depth (local y)
const YMAXB = 1.3; // height of the widest waterline
/** main deck height (top of the planking) along the keel: waist 6.4, stern castle 11.2, forecastle 8.2 */
export const deckH = (x: number) => 6.4 + 4.8 * smooth((-x - 11) / 7) + 1.8 * smooth((x - 13) / 5);
export const RAIL = 1.15; // bulwark height above the deck
/** plan shape: half-breadth at the widest waterline */
const planW = (x: number) => {
  const u = x / (HL / 2);
  if (u >= 0) return HB * Math.pow(Math.max(0, 1 - Math.pow(u, 2.1)), 0.62);
  return HB * (0.62 + 0.38 * Math.pow(Math.max(0, 1 - Math.pow(-u, 3)), 0.5)); // full stern ending on a flat transom
};
/** section shape: fraction of planW at height y (0 at the keel, 1 at YMAXB, tumblehome above) */
const secS = (x: number, y: number) => {
  if (y <= YMAXB) { const k = (YMAXB - y) / (YMAXB - KEEL); return Math.sqrt(Math.max(0, 1 - Math.pow(k, 2.2))); }
  const top = deckH(x) + RAIL, k = clamp01((y - YMAXB) / (top - YMAXB));
  return 1 - 0.2 * Math.pow(k, 1.4);
};
/** half-breadth of the hull skin at (x, y) */
export const halfB = (x: number, y: number) => planW(x) * secS(x, y);

const YT = 12.6; // texture v range top (local y)
const vOf = (y: number) => (y - KEEL) / (YT - KEEL);
const uOf = (x: number) => (x + HL / 2) / HL;

// gun ports: two rows of 12 a side (the lower deck sits just ~1.9 m above the water line)
export const PORT_X = Array.from({ length: 12 }, (_, i) => -12.9 + i * 2.25);
export const PORT_ROWS: { y: number; s: number }[] = [{ y: 1.95, s: 0.95 }, { y: 4.25, s: 0.85 }];

// ---------------- painted textures ----------------
const hullTex = () => ctex("vasaHull", 2048, 1024, (g, r) => {
  const W = 2048, H = 1024, Y = (y: number) => H - vOf(y) * H, X = (x: number) => uOf(x) * W;
  // below the water: dark tarred oak
  g.fillStyle = "#4a3426"; g.fillRect(0, Y(0), W, H - Y(0));
  // planked sides: warm oak strakes with near-black seams (seams painted in as dark tints)
  for (let y = 0; y < 6.4 + 1.2; y += 0.42) {
    const c = ["#8a5e3b", "#82573a", "#8f6340", "#7c5236"][Math.floor(r() * 4)];
    g.fillStyle = c; g.fillRect(0, Y(y + 0.42), W, Y(y) - Y(y + 0.42));
    g.fillStyle = "rgba(30,18,14,0.55)"; g.fillRect(0, Y(y) - 2, W, 3);
    for (let x = -22 + r() * 6; x < 22; x += 5 + r() * 4) { g.fillStyle = "rgba(30,18,14,0.45)"; g.fillRect(X(x), Y(y + 0.42), 3, Y(y) - Y(y + 0.42)); }
  }
  // black wales
  for (const [y, h] of [[0.55, 0.32], [3.15, 0.3], [5.45, 0.3]]) { g.fillStyle = "#2a1f1c"; g.fillRect(0, Y(y + h), W, Y(y) - Y(y + h)); }
  // upper works: red with a blue frieze and gold trim, painted carvings as gold blobs
  g.fillStyle = "#a8322e"; g.fillRect(0, 0, W, Y(6.1));
  g.fillStyle = "#2d4f8e"; g.fillRect(0, Y(7.6), W, Y(6.6) - Y(7.6));
  g.fillStyle = "#e2b443"; g.fillRect(0, Y(6.65), W, 7); g.fillRect(0, Y(7.6), W, 7); g.fillRect(0, Y(6.15), W, 6);
  for (let x = -21; x < 21; x += 1.6) {
    g.fillStyle = "#e9bd4c"; g.beginPath(); g.ellipse(X(x), Y(7.1), 11, 15, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(60,30,20,0.7)"; g.lineWidth = 3; g.stroke();
  }
  // stern castle windows band
  g.fillStyle = "#2d4f8e"; g.fillRect(X(-22), Y(10.2), X(-12) - X(-22), Y(8.6) - Y(10.2));
  for (let x = -21; x < -13; x += 1.5) { g.fillStyle = "#e2b443"; g.fillRect(X(x) - 12, Y(9.9), 24, Y(8.9) - Y(9.9)); g.fillStyle = "#1f2433"; g.fillRect(X(x) - 7, Y(9.75), 14, Y(9.05) - Y(9.75)); }
  // gun port holes (dark), framed in red
  for (const row of PORT_ROWS) for (const x of PORT_X) {
    const s = row.s, x0 = X(x - s / 2), x1 = X(x + s / 2), y0 = Y(row.y + s / 2), y1 = Y(row.y - s / 2);
    g.fillStyle = "#b23a32"; g.fillRect(x0 - 8, y0 - 8, x1 - x0 + 16, y1 - y0 + 16);
    g.fillStyle = "#151013"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
});
const lidTex = () => ctex("vasaLid", 128, 128, (g) => {
  g.fillStyle = "#c2342e"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#e7b947"; g.beginPath(); g.arc(64, 62, 34, 0, Math.PI * 2); g.fill(); // gilded lion mask (cartoon disc)
  g.strokeStyle = "#b77d22"; g.lineWidth = 7; g.beginPath(); g.arc(64, 62, 22, 0, 7); g.stroke();
  g.strokeStyle = "#7a2a22"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122);
});
const transomTex = () => ctex("vasaTransom", 1024, 1024, (g) => {
  g.fillStyle = "#2d4f8e"; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#a8322e"; g.fillRect(0, 860, 1024, 164);
  const gold = (x: number, y: number, rx: number, ry: number) => { g.fillStyle = "#e7b947"; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.strokeStyle = "rgba(70,35,20,.75)"; g.lineWidth = 6; g.stroke(); };
  // gilded frame + carved figures (our own simple shapes)
  g.strokeStyle = "#e7b947"; g.lineWidth = 26; g.strokeRect(40, 40, 944, 800);
  for (let i = 0; i < 6; i++) gold(130 + i * 153, 120, 46, 60);
  for (let i = 0; i < 4; i++) { const x = 190 + i * 215; g.fillStyle = "#e7b947"; g.fillRect(x - 70, 330, 140, 170); g.fillStyle = "#1f2433"; g.fillRect(x - 46, 356, 92, 120); }
  // three crowns
  for (const [x, y] of [[512, 610], [412, 700], [612, 700]]) {
    g.fillStyle = "#f2c94c"; g.beginPath(); g.moveTo(x - 55, y + 35); g.lineTo(x - 55, y - 20); g.lineTo(x - 28, y + 5); g.lineTo(x, y - 35); g.lineTo(x + 28, y + 5); g.lineTo(x + 55, y - 20); g.lineTo(x + 55, y + 35); g.closePath(); g.fill();
    g.strokeStyle = "rgba(70,35,20,.8)"; g.lineWidth = 6; g.stroke();
  }
  gold(140, 640, 70, 120); gold(884, 640, 70, 120); // two lions (rounded)
});
const deckTex = () => ctex("vasaDeck", 1024, 1024, (g, r) => {
  for (let i = 0; i < 16; i++) {
    g.fillStyle = ["#c9a36d", "#bf9862", "#d0ab75", "#b88f5b"][Math.floor(r() * 4)]; g.fillRect(i * 64, 0, 64, 1024);
    g.fillStyle = "rgba(40,25,15,0.7)"; g.fillRect(i * 64, 0, 3, 1024);
    for (let y = r() * 300; y < 1024; y += 260 + r() * 200) g.fillRect(i * 64, y, 64, 3);
  }
});
export const swedishFlag = () => ctex("flagSweden", 320, 200, (g) => {
  g.fillStyle = "#2a62ad"; g.fillRect(0, 0, 320, 200);
  g.fillStyle = "#f3c63a"; g.fillRect(0, 80, 320, 40); g.fillRect(100, 0, 40, 200);
});
const sailTex = () => ctex("vasaSail", 256, 256, (g) => {
  g.fillStyle = "#f1e6cb"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(150,120,90,0.25)"; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 3, 256);
  g.strokeStyle = "rgba(120,90,60,0.6)"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250);
});

// ---------------- geometry builders ----------------
/** hull skin, one side (s = +1 starboard, -1 port), from keel to the rail top, x from stern to stem */
const hullSide = (s: number) => {
  const NX = 88, NY = 30, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NX; i++) {
    const x = -HL / 2 + (i / NX) * HL, top = deckH(x) + RAIL;
    for (let j = 0; j <= NY; j++) {
      const y = KEEL + (j / NY) * (top - KEEL);
      pos.push(x, y, s * halfB(x, y)); uv.push(uOf(x), vOf(y));
    }
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const a = i * (NY + 1) + j, b = a + NY + 1;
    if (s > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** flat transom at the stern: from the water line up to the castle rail */
const transomGeo = () => {
  const x = -HL / 2 + 0.01, y0 = -0.6, y1 = deckH(x) + RAIL, NY = 16, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NY; j++) {
    const y = y0 + (j / NY) * (y1 - y0), w = halfB(x, y);
    pos.push(x, y, w, x, y, -w); uv.push(0, j / NY, 1, j / NY);
  }
  for (let j = 0; j < NY; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** walkable deck surface (follows the sheer, stepped up at the castles) */
const deckGeo = () => {
  const NX = 88, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NX; i++) {
    const x = -HL / 2 + (i / NX) * HL, y = deckH(x), w = halfB(x, y) - 0.05;
    pos.push(x, y, -w, x, y, w); uv.push(x / 8, 0, x / 8, w / 4);
  }
  for (let i = 0; i < NX; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const rod = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, seg = 8) => {
  const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), seg);
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
  return g;
};

// masts: x position, height of the top above the deck, yards (height above deck, half-span)
export const MASTS = [
  { x: 13.5, top: 33, yards: [[13, 8.5], [24, 6]] },
  { x: 0.5, top: 41, yards: [[15, 10], [28, 7.2]] },
  { x: -13.5, top: 26, yards: [[12, 6]] },
] as const;
export const mastTop = (k: number) => deckH(MASTS[k].x) + MASTS[k].top;

// ---------------- the ship object ----------------
export class Ship {
  root = new THREE.Group();
  private lids: { m: THREE.Mesh; row: number; i: number; s: number }[] = [];
  private guns: { m: THREE.Mesh; row: number; i: number; s: number; base: THREE.Vector3 }[] = [];
  private sails: { m: THREE.Mesh; base: Float32Array; span: number; drop: number }[] = [];
  private flags: { m: THREE.Mesh; w: number; h: number }[] = [];
  private furls: THREE.Mesh[] = [];

  constructor(parent: THREE.Object3D) {
    const R = this.root;
    R.rotation.order = "YXZ";
    const hullM = lam("vasaHullM", () => ({ map: hullTex(), side: THREE.DoubleSide }));
    if (hullM.map) { hullM.map.anisotropy = 16; }
    const add = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; R.add(me); return me; };
    add(hullSide(1), hullM); add(hullSide(-1), hullM);
    add(transomGeo(), lam("vasaTransomM", () => ({ map: transomTex(), side: THREE.DoubleSide })));
    const deckM = lam("vasaDeckM", () => ({ map: deckTex() }));
    if (deckM.map) { deckM.map.wrapS = deckM.map.wrapT = THREE.RepeatWrapping; deckM.map.anisotropy = 16; }
    add(deckGeo(), deckM);
    const wood = lam("vasaSpar", () => ({ color: "#7a5434" })), dark = lam("vasaDark", () => ({ color: "#3a2a24" }));
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e2b443", specular: "#fff1b0", shininess: 50 }), 0.2);
    const bronze = twoTone(new THREE.MeshPhongMaterial({ color: "#9b6a32", specular: "#ffd58a", shininess: 60 }), 0.2);
    // rail cap along both bulwarks
    for (const s of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 44; i++) { const x = -HL / 2 + 0.3 + (i / 44) * (HL - 0.8), y = deckH(x) + RAIL; pts.push(V(x, y, s * halfB(x, y))); }
      const curve = new THREE.CatmullRomCurve3(pts);
      add(new THREE.TubeGeometry(curve, 120, 0.13, 6), lam("vasaRailCap", () => ({ color: "#e2b443" })));
    }
    // beakhead + figurehead (a gilded lion as a simple rounded form)
    const beak = new THREE.ConeGeometry(1.0, 7.5, 8); beak.rotateZ(-Math.PI / 2); beak.translate(HL / 2 + 3.2, 5.6, 0);
    add(beak, lam("vasaBeak", () => ({ color: "#a8322e" })));
    const lion = new THREE.SphereGeometry(0.9, 16, 12); lion.scale(1.4, 1, 0.8); lion.translate(HL / 2 + 6.2, 6.3, 0);
    add(lion, gold);
    // bowsprit
    add(rod(V(HL / 2 - 2, 7.6, 0), V(HL / 2 + 13, 13.5, 0), 0.32, 0.18), wood);
    // stern lanterns
    for (const z of [-2.6, 0, 2.6]) add(new THREE.SphereGeometry(0.45, 12, 10).translate(-HL / 2 - 0.3, deckH(-HL / 2) + RAIL + 0.9, z), gold);
    // masts, yards, sails, shrouds
    const sailM = lam("vasaSailM", () => ({ map: sailTex(), side: THREE.DoubleSide }));
    const rope = lam("vasaRope", () => ({ color: "#3b2c25" }));
    MASTS.forEach((mk, k) => {
      const d = deckH(mk.x);
      add(rod(V(mk.x, d - 1, 0), V(mk.x, d + mk.top, 0), k === 1 ? 0.55 : 0.45, 0.18, 10), wood);
      // fighting tops (platforms)
      add(new THREE.CylinderGeometry(1.6, 1.3, 0.45, 12).translate(mk.x, d + mk.yards[0][0] + 1.2, 0), dark);
      mk.yards.forEach(([yh, span], j) => {
        add(rod(V(mk.x, d + yh, -span), V(mk.x, d + yh, span), 0.2, 0.2, 6), wood);
        // sail hangs from the yard down toward the next yard / deck
        const drop = j === 0 ? Math.min(yh - 3.2, 9.5) : yh - mk.yards[0][0] - 1.8;
        const furl = new THREE.Mesh(rod(V(mk.x + 0.35, d + yh - 0.35, -span * 0.82), V(mk.x + 0.35, d + yh - 0.35, span * 0.82), 0.34, 0.34, 8), sailM);
        furl.castShadow = true; R.add(furl); this.furls.push(furl);
        const g = new THREE.PlaneGeometry(span * 1.6, drop * 0.85, 10, 8); g.rotateY(Math.PI / 2); g.translate(mk.x + 0.25, d + yh - drop * 0.425 - 0.2, 0);
        const m = add(g, sailM);
        this.sails.push({ m, base: (g.attributes.position.array as Float32Array).slice(), span, drop });
        // shrouds from below the top to the rail
        for (const s of [-1, 1]) for (const dx of [-1.6, -0.5, 0.6]) {
          const xr = mk.x + dx, yr = deckH(xr) + RAIL;
          if (j === 0) add(rod(V(mk.x, d + yh - 0.6, 0), V(xr, yr, s * (halfB(xr, yr) + 0.2)), 0.05, 0.05, 4), rope, false);
        }
      });
      // pennant / flag at the masthead
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(k === 1 ? 4.2 : 3, k === 1 ? 2.4 : 1.8, 14, 2), lam("vasaFlagM", () => ({ map: swedishFlag(), side: THREE.DoubleSide })));
      fl.position.set(mk.x, d + mk.top + 0.2, 0); fl.castShadow = true; R.add(fl);
      this.flags.push({ m: fl, w: k === 1 ? 4.2 : 3, h: k === 1 ? 2.4 : 1.8 });
    });
    // big ensign on the stern staff
    add(rod(V(-HL / 2 + 0.5, deckH(-HL / 2) + RAIL, 0), V(-HL / 2 - 1.5, deckH(-HL / 2) + 8.5, 0), 0.12, 0.08), wood);
    const ens = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.4, 14, 2), lam("vasaFlagM", () => ({ map: swedishFlag(), side: THREE.DoubleSide })));
    ens.position.set(-HL / 2 - 1.5, deckH(-HL / 2) + 6.6, 0); ens.castShadow = true; R.add(ens);
    this.flags.push({ m: ens, w: 5.5, h: 3.4 });
    // gun port lids (hinged on top) and bronze barrels
    const lidM = lam("vasaLidM", () => ({ map: lidTex(), side: THREE.DoubleSide }));
    PORT_ROWS.forEach((row, r) => PORT_X.forEach((x, i) => {
      for (const s of [-1, 1]) {
        const w = halfB(x, row.y);
        const lid = new THREE.Mesh(new THREE.PlaneGeometry(row.s * 1.12, row.s * 1.12).translate(0, -row.s * 0.56, 0), lidM);
        lid.rotation.order = "YXZ";
        lid.position.set(x, row.y + row.s * 0.56, s * (w + 0.06)); lid.rotation.y = s > 0 ? 0 : Math.PI;
        lid.castShadow = true; R.add(lid); this.lids.push({ m: lid, row: r, i, s });
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 2.0, 10).rotateX(Math.PI / 2), bronze);
        const base = V(x, row.y - 0.05, s * (w - 0.9));
        gun.position.copy(base); gun.castShadow = true; R.add(gun); this.guns.push({ m: gun, row: r, i, s, base });
      }
    }));
    parent.add(R);
  }

  /** world point of a local ship point under the current pose (call after pose) */
  toWorld(lx: number, ly: number, lz: number, out = new THREE.Vector3()) { return out.set(lx, ly, lz).applyMatrix4(this.root.matrixWorld); }

  pose(p: ShipPose, t: number) {
    const R = this.root;
    R.visible = p.visible;
    if (!p.visible) return;
    R.position.set(p.x, -p.sink, p.z); R.rotation.set(p.heel, p.yaw, 0);
    R.updateMatrixWorld(true);
    for (const l of this.lids) { const o = p.ports[l.row](l.i, l.s); l.m.rotation.x = -l.s * 0 + (l.s > 0 ? -1 : -1) * o * 1.35; }
    for (const g of this.guns) { const o = clamp01(p.ports[g.row](g.i, g.s) * 1.4 - 0.4) * p.guns; g.m.position.set(g.base.x, g.base.y, g.base.z + g.s * 1.55 * o); g.m.visible = o > 0.01; }
    // sails set (sail >= 0) or furled on the yards (sail < 0: moored)
    const set = p.sail >= 0;
    for (const s of this.sails) s.m.visible = set;
    for (const fu of this.furls) fu.visible = !set;
    // sails: bulge downwind (+z when wind > 0) with a gentle breathing
    if (set) for (const s of this.sails) {
      const a = s.m.geometry.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array, b = s.base;
      for (let i = 0; i < a.count; i++) {
        const z = b[i * 3 + 2], y = b[i * 3 + 1];
        const uz = 1 - (z / (s.span * 0.8)) ** 2, top = (y - (b[1] ?? y));
        void top;
        const bul = (0.6 + 2.6 * p.sail) * Math.max(0, uz) * (1 + 0.05 * Math.sin(t * 2.3 + z));
        arr[i * 3] = b[i * 3] + bul;
      }
      a.needsUpdate = true; s.m.geometry.computeVertexNormals();
    }
    // flags stream away from the wind (local -x is aft); snap harder with the gust
    for (const f of this.flags) {
      const a = f.m.geometry.attributes.position as THREE.BufferAttribute, nx = 15;
      for (let i = 0; i < a.count; i++) {
        const u = (i % nx) / (nx - 1), row = Math.floor(i / nx), y = (0.5 - row / 2) * f.h;
        const amp = 0.12 + 0.35 * p.flag;
        a.setXYZ(i, -u * f.w, y - u * 0.15 * (1 - p.flag) * f.h, amp * u * Math.sin(t * (5 + 4 * p.flag) - u * 5) * f.h);
      }
      a.needsUpdate = true;
    }
  }
}

// ---------------- rowing boat (analogy) ----------------
export class RowBoat {
  root = new THREE.Group();
  constructor(parent: THREE.Object3D) {
    const R = this.root; R.rotation.order = "YXZ";
    const L = 4.2, B = 0.85, D = 0.55, NX = 24, NY = 6;
    const hw = (x: number, y: number) => B * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / (L / 2), 2.2)), 0.6) * (0.55 + 0.45 * clamp01((y + 0.25) / (D + 0.25)));
    const side = (s: number) => {
      const pos: number[] = [], idx: number[] = [];
      for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) { const x = -L / 2 + (i / NX) * L, y = -0.25 + (j / NY) * (D + 0.25 + 0.12 * (x / (L / 2)) ** 2); pos.push(x, y, s * hw(x, y)); }
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const a = i * (NY + 1) + j, b = a + NY + 1; if (s > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const m = lam("rowBoat", () => ({ color: "#3f7fbf", side: THREE.DoubleSide })), inner = lam("rowBoatIn", () => ({ color: "#d9b27a" }));
    for (const s of [-1, 1]) { const me = new THREE.Mesh(side(s), m); me.castShadow = true; me.receiveShadow = true; R.add(me); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.8, B * 1.0).rotateX(-Math.PI / 2).translate(0, 0.02, 0), inner); floor.receiveShadow = true; R.add(floor);
    for (const x of [-0.9, 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, B * 1.5).translate(x, D - 0.12, 0), inner); b.castShadow = true; R.add(b); }
    const oar = lam("oar", () => ({ color: "#c9a36d" }));
    for (const s of [-1, 1]) { const o = new THREE.Mesh(rod(V(-0.2, D, s * 0.7), V(-1.9, -0.05, s * 1.9), 0.035), oar); o.castShadow = true; R.add(o); }
    parent.add(R);
  }
  pose(x: number, z: number, yaw: number, roll: number, visible: boolean) {
    this.root.visible = visible; this.root.position.set(x, 0, z); this.root.rotation.set(roll, yaw, 0); this.root.updateMatrixWorld(true);
  }
}
void NOINK;
