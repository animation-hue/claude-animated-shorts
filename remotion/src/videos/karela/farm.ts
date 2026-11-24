// The farm of "Karela": Ramu and Vidya's mud house with a courtyard, the path to the field, the corn field in its
// states (golden mature / destroyed / bare furrows / young growing), the bund (raised border) with karela vines, the
// bushes the wild boars come from, trees and far hills, and a separate small bedroom set for the night shots.
// world.ts switches the field states and grows the young corn / vines per frame.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, prop, setSight, addVeg, Ray } from "./build";
import { ctex, grass, rng } from "./paint";
import { FIELD, HOUSE, ROOM } from "./story";

export type Farm = { golden: THREE.Group; destroyed: THREE.Group; bare: THREE.Group; young: THREE.Group; vines: THREE.Group; seedlings: THREE.Group; windowLight: THREE.Mesh; lamp: THREE.Mesh };

const soilTex = (furrow: boolean) => ctex(furrow ? "kSoilF" : "kSoil", 512, 512, (g, r) => {
  g.fillStyle = "#8a5a36"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? "rgba(110,70,40,0.4)" : "rgba(170,120,80,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
  if (furrow) for (let k = 0; k < 8; k++) { g.fillStyle = "rgba(60,35,20,0.55)"; g.fillRect(k * 64 + 26, 0, 12, 512); g.fillStyle = "rgba(190,140,95,0.45)"; g.fillRect(k * 64 + 6, 0, 10, 512); }
});
const mud = () => ctex("kMud", 256, 256, (g, r) => {
  g.fillStyle = "#d9a86c"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) { g.fillStyle = "rgba(170,120,70,0.25)"; g.fillRect(r() * 256, r() * 256, 10 + r() * 30, 3 + r() * 6); }
  g.fillStyle = "#f2e6cf"; g.fillRect(0, 196, 256, 60);
  g.fillStyle = "#c0533a"; g.fillRect(0, 192, 256, 6);
});
const tiles = () => ctex("kTiles", 256, 256, (g) => {
  g.fillStyle = "#b8573a"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32 + y / 32) % 2 ? "#a84b31" : "#c46241"; g.beginPath(); g.ellipse(x + 16 + (y % 64 ? 16 : 0), y + 16, 15, 14, 0, Math.PI, 0); g.fill(); }
});

// ---------------- corn plant pieces ----------------
const STALK = "#9fbf4a", LEAF = ["#8fc24a", "#a6cc4e", "#c2cf58"], COB = "#f2c443", HUSK = "#cfd27a", TASSEL = "#d9b26a";
const leafGeo = (len: number, w: number, droop: number) => {
  const n = 7, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = len * u, y = droop * u * u * len * 0.8, ww = w * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.05));
    pos.push(x, y, -ww / 2, x, y, ww / 2);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const LEAFG = [leafGeo(1.05, 0.17, -0.75), leafGeo(0.95, 0.16, -1.05), leafGeo(0.85, 0.14, -0.5)];
const STALKG = new THREE.CylinderGeometry(0.022, 0.035, 1, 6).translate(0, 0.5, 0);
const COBG = new THREE.CylinderGeometry(0.06, 0.045, 0.3, 10).translate(0, 0.15, 0);
const HUSKG = new THREE.ConeGeometry(0.065, 0.2, 6).translate(0, 0.1, 0);
const TASG = leafGeo(0.32, 0.025, 0.35);
const m4 = (p: THREE.Vector3, q: THREE.Quaternion, s = 1) => new THREE.Matrix4().compose(p, q, V(s, s, s));
const Q = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "YXZ"));

/** one corn plant into batch b, with an extra transform `base` (for fallen / growing plants) */
const corn = (b: Batch, base: THREE.Matrix4, h: number, r: () => number, cobs = true) => {
  const stalkM = lam("kStalk", () => ({ color: STALK, side: THREE.DoubleSide }));
  b.add(STALKG, stalkM, base.clone().multiply(new THREE.Matrix4().makeScale(1, h, 1)));
  for (let k = 0; k < 7; k++) {
    const y = h * (0.18 + 0.105 * k), yaw = k * 2.4 + r() * 0.8;
    b.add(LEAFG[k % 3], lam("kLeaf" + (k % 3), () => ({ color: LEAF[k % 3], side: THREE.DoubleSide })), base.clone().multiply(m4(V(0, y, 0), Q(0, yaw, 0.55 - 0.08 * k), 1 - 0.06 * k)));
  }
  for (let k = 0; k < 4; k++) b.add(TASG, lam("kTassel", () => ({ color: TASSEL, side: THREE.DoubleSide })), base.clone().multiply(m4(V(0, h - 0.02, 0), Q(0, k * 1.57 + r(), 1.1))));
  if (cobs) {
    const y = h * 0.52, yaw = r() * 6.28;
    b.add(HUSKG, lam("kHusk", () => ({ color: HUSK })), base.clone().multiply(m4(V(0.04 * Math.cos(yaw), y, 0.04 * Math.sin(yaw)), Q(0.35, yaw, 0))));
    b.add(COBG, lam("kCob", () => ({ color: COB })), base.clone().multiply(m4(V(0.05 * Math.cos(yaw), y + 0.02, 0.05 * Math.sin(yaw)), Q(0.45, yaw, 0))));
  }
};

/** karela (bitter gourd): a warty, pointed green fruit, hanging */
const karelaGeo = (() => {
  const g = new THREE.SphereGeometry(1, 12, 10);
  const p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const taper = 1 - 0.55 * Math.abs(v.y) ** 1.5, wart = 1 + 0.12 * Math.sin(v.y * 22) * Math.sin(Math.atan2(v.z, v.x) * 6);
    p.setXYZ(i, v.x * 0.05 * taper * wart, v.y * 0.15, v.z * 0.05 * taper * wart);
  }
  g.computeVertexNormals();
  return g;
})();

export const buildFarm = (root: THREE.Object3D, rays: Ray[]): Farm => {
  setSight(rays);
  const r = rng(4242), U = (a: number, c: number) => a + (c - a) * r();
  const cams: [number, number][] = [];
  for (const ray of rays) if (ray.core) cams.push([ray.o.x, ray.o.z]);
  const nearCam = (x: number, z: number, rad: number) => cams.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < rad + 1.5);
  const b = new Batch();
  // ---- ground: grass, the field soil, the path, the bund
  const gm = lam("kGrass", () => ({ map: grass() }));
  if (gm.map) { gm.map.wrapS = gm.map.wrapT = THREE.RepeatWrapping; gm.map.repeat.set(90, 90); }
  b.add(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), gm);
  const [x0, x1, z0, z1] = FIELD, fw = x1 - x0, fd = z1 - z0, fcx = (x0 + x1) / 2, fcz = (z0 + z1) / 2;
  const sm = lam("kSoilM", () => ({ map: soilTex(false) }));
  if (sm.map) { sm.map.wrapS = sm.map.wrapT = THREE.RepeatWrapping; sm.map.repeat.set(fw / 4, fd / 4); }
  b.add(new THREE.PlaneGeometry(fw, fd).rotateX(-Math.PI / 2).translate(fcx, 0.01, fcz), sm);
  const path = lam("kPath", () => ({ map: soilTex(false), color: "#e8c9a0" }));
  b.add(new THREE.PlaneGeometry(fw + 14, 2.2).rotateX(-Math.PI / 2).translate(fcx - 6, 0.012, z0 - 1.6), path);
  const bund = lam("kBund", () => ({ color: "#9a6a42" }));
  for (const [a, c] of [[V(x0 - 0.7, 0, z0 - 0.7), V(x1 + 0.7, 0.28, z0 - 0.1)], [V(x0 - 0.7, 0, z1 + 0.1), V(x1 + 0.7, 0.28, z1 + 0.7)],
    [V(x0 - 0.7, 0, z0 - 0.1), V(x0 - 0.1, 0.28, z1 + 0.1)], [V(x1 + 0.1, 0, z0 - 0.1), V(x1 + 0.7, 0.28, z1 + 0.1)]] as const) b.add(boxGeo(a, c), bund);
  // ---- the house: mud walls, tiled roof, door + window facing the field (+x), courtyard, tulsi, charpai, pots
  const [hx, , hz] = HOUSE, hw = 6, hd = 5, hh = 2.6;
  b.add(new THREE.BoxGeometry(hw, hh, hd).translate(hx, hh / 2, hz), lam("kMudM", () => ({ map: mud() })));
  const roof = lam("kRoof", () => ({ map: tiles(), side: THREE.DoubleSide }));
  b.add(new THREE.ConeGeometry(4.9, 1.7, 4, 1).rotateY(Math.PI / 4).scale(hw / 6.4, 1, hd / 6.4).translate(hx, hh + 0.84, hz), roof);
  b.add(boxGeo(V(hx + hw / 2, 0, hz - 0.5), V(hx + hw / 2 + 0.05, 1.9, hz + 0.5)), lam("kDoor", () => ({ color: "#6b4226" })));
  b.add(new THREE.CylinderGeometry(0.22, 0.18, 0.55, 10).translate(hx + hw / 2 + 2.6, 0.275, hz - 1.9), lam("kTulsi", () => ({ color: "#c0533a" })));
  addVeg(b, "bush", hx + hw / 2 + 2.6, 0.5, hz - 1.9, 0.38, 3);
  for (const [px, pz] of [[hx + hw / 2 + 0.6, hz + 1.6], [hx + hw / 2 + 0.9, hz + 1.9]]) b.add(new THREE.SphereGeometry(0.28, 12, 10).scale(1, 0.9, 1).translate(px, 0.26, pz), lam("kPot", () => ({ color: "#b05a3a" })));
  const wood = lam("kWood", () => ({ color: "#8a5a34" }));
  b.add(boxGeo(V(hx + hw / 2 + 1.0, 0.38, hz + 2.6), V(hx + hw / 2 + 2.9, 0.46, hz + 3.5)), wood);
  b.add(boxGeo(V(hx + hw / 2 + 1.05, 0.45, hz + 2.65), V(hx + hw / 2 + 2.85, 0.47, hz + 3.45)), lam("kRope", () => ({ color: "#e6d6ae" })));
  const windowLight = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7).rotateY(Math.PI / 2).translate(hx + hw / 2 + 0.03, 1.5, hz + 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color("#3a2a22") }));
  root.add(windowLight);
  // village neighbours + trees around
  for (const [x, z, s] of [[-32, -14, 0.8], [-26, 22, 0.9], [-38, 8, 0.85]] as const) {
    b.add(new THREE.BoxGeometry(5 * s, 2.3 * s, 4 * s).translate(x, 1.15 * s, z), lam("kMudM", () => ({ map: mud() })));
    b.add(new THREE.ConeGeometry(4 * s, 1.5 * s, 4, 1).rotateY(Math.PI / 4).translate(x, 2.3 * s + 0.75 * s, z), roof);
  }
  for (const [x, z, h] of [[-20, -8, 9], [-22, 12, 11], [-9, -7, 8], [-28, 3, 10], [4, -9, 9.5], [18, -6, 10], [-12, 28, 12], [30, 2, 12]] as const)
    if (!nearCam(x, z, 2.5)) prop(b, {}, "tree_oak", x, 0, z, h, x);
  // the scrub + forest east and north (where the boars live)
  for (let k = 0; k < 70; k++) {
    const east = k < 40, x = east ? U(19, 40) : U(-14, 40), z = east ? U(-2, 30) : U(27, 40);
    if (nearCam(x, z, 2)) continue;
    if (r() < 0.55) prop(b, {}, ["tree_fat", "tree_oak", "tree-high-round"][Math.floor(r() * 3)], x, 0, z, U(8, 14), r() * 6);
    else addVeg(b, "bush", x, 0, z, U(1.2, 2.2), k * 11);
  }
  for (const [x, z, h] of [[18.5, 13, 1.8], [18, 10.5, 1.5], [19.2, 15.5, 2.0], [17.8, 17.8, 1.4]] as const) addVeg(b, "bush", x, 0, z, h, x * z);
  // far hills
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, d = 230 + 40 * (k % 3);
    b.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(70 + 20 * (k % 4), 22 + 10 * (k % 3), 50).translate(Math.cos(a) * d, -2, Math.sin(a) * d),
      lam("kHill" + (k % 2), () => ({ color: k % 2 ? "#7fa86a" : "#8fb47a" })));
  }
  // ---- the bedroom set (night): walls, a window with moonlight, a charpai
  const [rx, , rz] = ROOM;
  const wallM = lam("kRoomWall", () => ({ color: "#d9b58a", side: THREE.DoubleSide }));
  b.add(new THREE.PlaneGeometry(6, 3).translate(rx, 1.5, rz + 2.5).rotateY(0), wallM);
  b.add(new THREE.PlaneGeometry(5, 3).rotateY(Math.PI / 2).translate(rx - 3, 1.5, rz), wallM);
  b.add(new THREE.PlaneGeometry(5, 3).rotateY(-Math.PI / 2).translate(rx + 3, 1.5, rz), wallM);
  b.add(new THREE.PlaneGeometry(6, 5).rotateX(-Math.PI / 2).translate(rx, 0.005, rz), lam("kRoomFloor", () => ({ color: "#a8784e" })));
  b.add(new THREE.PlaneGeometry(6, 5).rotateX(Math.PI / 2).translate(rx, 3, rz), wallM);
  b.add(boxGeo(V(rx - 1.1, 0.4, rz + 0.6), V(rx + 1.1, 0.5, rz + 2.2)), wood);
  b.add(boxGeo(V(rx - 1.05, 0.49, rz + 0.65), V(rx + 1.05, 0.52, rz + 2.15)), lam("kSheet", () => ({ color: "#e8e2f0" })));
  for (const dx of [-1.05, 1.05]) for (const dz of [0.65, 2.15]) b.add(boxGeo(V(rx + dx - 0.05, 0, rz + dz - 0.05), V(rx + dx + 0.05, 0.5, rz + dz + 0.05)), wood);
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.2).translate(rx + 1.8, 1.7, rz + 2.48).rotateY(0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.7, 1.4) }));
  root.add(lamp);
  b.build(root);
  // ---- field states (each its own group so world.ts can switch them)
  const mk = (name: string) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };
  const golden = mk("golden"), destroyed = mk("destroyed"), bare = mk("bare"), young = mk("young"), vines = mk("vines"), seedlings = mk("seedlings");
  const bg = new Batch(), bd = new Batch(), bb = new Batch(), byg = new Batch(), bv = new Batch(), bs = new Batch();
  const sp = 0.62;
  for (let x = x0 + 0.35; x < x1 - 0.2; x += sp) for (let z = z0 + 0.35; z < z1 - 0.2; z += sp) {
    const jx = x + U(-0.08, 0.08), jz = z + U(-0.08, 0.08), h = U(1.9, 2.4), lean = Q(U(-0.06, 0.06), U(0, 6.28), U(-0.06, 0.06));
    corn(bg, m4(V(jx, 0, jz), lean), h, r);
    corn(byg, m4(V(jx, 0, jz), lean), h, r, false);
    // destroyed: most plants knocked flat or snapped, cobs strewn, soil dug up
    const k = r();
    if (k < 0.25) corn(bd, m4(V(jx, 0, jz), lean), h * U(0.25, 0.5), r, false);
    else if (k < 0.85) corn(bd, m4(V(jx, 0.04, jz), Q(U(1.2, 1.5), U(0, 6.28), 0)), h * U(0.6, 1.0), r, false);
    if (r() < 0.35) bd.add(COBG, lam("kCob", () => ({ color: COB })), m4(V(jx + U(-0.3, 0.3), 0.04, jz + U(-0.3, 0.3)), Q(Math.PI / 2, U(0, 6.28), 0)));
    if (r() < 0.25) bd.add(new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(U(0.2, 0.4), U(0.08, 0.14), U(0.2, 0.35)).translate(jx, 0, jz), lam("kClod", () => ({ color: "#6b4326" })));
    if (r() < 0.5) bs.add(LEAFG[2], lam("kSeedling", () => ({ color: "#6fbf4a", side: THREE.DoubleSide })), m4(V(jx, 0.02, jz), Q(0, U(0, 6.28), 0.9), 0.4));
  }
  const fm = lam("kFurrowM", () => ({ map: soilTex(true) }));
  if (fm.map) { fm.map.wrapS = fm.map.wrapT = THREE.RepeatWrapping; fm.map.repeat.set(fw / 4, fd / 4); }
  bb.add(new THREE.PlaneGeometry(fw, fd).rotateX(-Math.PI / 2).translate(fcx, 0.02, fcz), fm);
  // karela vines along the bund, karela hanging on the outer faces
  const vleaf = lam("kVine", () => ({ color: "#3f8f3c" }));
  const per = [[x0 - 0.4, z0 - 0.4, x1 + 0.4, z0 - 0.4], [x1 + 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4], [x1 + 0.4, z1 + 0.4, x0 - 0.4, z1 + 0.4], [x0 - 0.4, z1 + 0.4, x0 - 0.4, z0 - 0.4]];
  for (const [ax, az, cx, cz] of per) {
    const L = Math.hypot(cx - ax, cz - az), nx = -(cz - az) / L, nz = (cx - ax) / L; // outward-ish normal
    for (let s = 0; s < L; s += 0.42) {
      const x = ax + ((cx - ax) * s) / L, z = az + ((cz - az) * s) / L;
      bv.add(new THREE.SphereGeometry(1, 10, 8), vleaf, new THREE.Matrix4().compose(V(x, 0.42 + U(-0.05, 0.08), z), new THREE.Quaternion(), V(U(0.3, 0.42), U(0.28, 0.4), U(0.3, 0.42))));
      if (r() < 0.75) {
        const o = U(0.22, 0.34), side = r() < 0.5 ? 1 : -1;
        bv.add(karelaGeo, lam("kKarela", () => ({ color: "#5aa83c" })), new THREE.Matrix4().compose(V(x + nx * o * side, U(0.32, 0.55), z + nz * o * side), Q(U(-0.3, 0.3), U(0, 6.28), U(-0.3, 0.3)), V(1, 1, 1)));
      }
    }
  }
  bg.build(golden); bd.build(destroyed); bb.build(bare); byg.build(young); bv.build(vines); bs.build(seedlings);
  for (const g of [destroyed, bare, young, vines, seedlings]) g.visible = false;
  return { golden, destroyed, bare, young, vines, seedlings, windowLight, lamp };
};
