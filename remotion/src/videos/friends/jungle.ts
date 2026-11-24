// The world of "Two Friends and the Bear": one long dirt path along x through grass. West end: the village (mud huts
// with thatch, Grandma's charpai). Then the jungle: dense cartoon trees and bushes on both sides of the path, a
// rustling bush, the hornbill's branch. East: the clearing with Ram's big tree (a low branch toward -x) and the bush
// the bear comes out of. Trees on a camera's sight line are dropped (build.ts prop()).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, prop, setSight, addVeg, Ray } from "./build";
import { ctex, grass, rng } from "./paint";
import { HUT, BUSH, PERCH, TREE, BEAR_BUSH } from "./story";

const dirt = () => ctex("fbDirt", 512, 512, (g, r) => {
  g.fillStyle = "#c79a64"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(150,105,60,0.35)" : "rgba(225,190,140,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 10, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(110,90,70,0.6)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 4, 2 + r() * 3, 0, 0, 7); g.fill(); }
});
const mud = () => ctex("fbMud", 256, 256, (g, r) => {
  g.fillStyle = "#d9a86c"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) { g.fillStyle = "rgba(170,120,70,0.25)"; g.fillRect(r() * 256, r() * 256, 10 + r() * 30, 3 + r() * 6); }
  g.fillStyle = "#f2e6cf"; g.fillRect(0, 200, 256, 56); // whitewashed plinth band
});
const thatch = () => ctex("fbThatch", 256, 256, (g, r) => {
  g.fillStyle = "#c9a45a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) { g.strokeStyle = r() < 0.5 ? "rgba(140,100,40,0.5)" : "rgba(240,215,150,0.5)"; g.lineWidth = 2; const x = r() * 256, y = r() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 18 + r() * 14); g.stroke(); }
});

/** a village hut: mud walls, a dark doorway, a 4-sided thatch roof */
const hut = (b: Batch, x: number, z: number, w: number, d: number, h: number, yaw: number) => {
  const m = new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1));
  b.add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), lam("fbMudM", () => ({ map: mud() })), m);
  b.add(new THREE.BoxGeometry(0.8, 1.6, 0.05).translate(0, 0.8, -d / 2 - 0.02), lam("fbDoor", () => ({ color: "#3a2a22" })), m);
  b.add(new THREE.ConeGeometry(Math.max(w, d) * 0.82, 1.6, 4, 1).rotateY(Math.PI / 4).scale(w / Math.max(w, d), 1, d / Math.max(w, d)).translate(0, h + 0.75, 0),
    lam("fbThatchM", () => ({ map: thatch() })), m);
};
/** Grandma's charpai (rope cot) */
const charpai = (b: Batch, x: number, z: number) => {
  const wood = lam("fbWood", () => ({ color: "#8a5a34" })), rope = lam("fbRope", () => ({ color: "#e6d6ae" }));
  b.add(boxGeo(V(x - 0.95, 0.38, z - 0.45), V(x + 0.95, 0.45, z + 0.45)), wood);
  b.add(boxGeo(V(x - 0.9, 0.44, z - 0.4), V(x + 0.9, 0.46, z + 0.4)), rope);
  for (const dx of [-0.9, 0.9]) for (const dz of [-0.4, 0.4]) b.add(boxGeo(V(x + dx - 0.05, 0, z + dz - 0.05), V(x + dx + 0.05, 0.45, z + dz + 0.05)), wood);
};

export const buildJungle = (root: THREE.Object3D, rays: Ray[]) => {
  setSight(rays);
  const b = new Batch(), r = rng(1771), U = (a: number, c: number) => a + (c - a) * r();
  // keep every plant clear of every lens position (the sight-line test only checks centre lines)
  const cams: [number, number][] = [];
  for (const ray of rays) if (ray.core) cams.push([ray.o.x, ray.o.z]);
  const nearCam = (x: number, z: number, rad: number) => cams.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < rad + 1.6);
  const plant = (name: string, x: number, z: number, h: number, yaw: number, rad: number) => { if (!nearCam(x, z, rad)) prop(b, {}, name, x, 0, z, h, yaw); };
  // ground: grass everywhere, the dirt path along x
  const gm = lam("fbGrass", () => ({ map: grass() }));
  if (gm.map) { gm.map.wrapS = gm.map.wrapT = THREE.RepeatWrapping; gm.map.repeat.set(80, 80); }
  const gp = new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2);
  b.add(gp, gm);
  const dm = lam("fbDirtM", () => ({ map: dirt() }));
  if (dm.map) { dm.map.wrapS = dm.map.wrapT = THREE.RepeatWrapping; dm.map.repeat.set(60, 1); }
  b.add(new THREE.PlaneGeometry(160, 2.8).rotateX(-Math.PI / 2).translate(-5, 0.012, 0), dm);
  // the clearing: a wider worn patch
  b.add(new THREE.CircleGeometry(6.5, 40).rotateX(-Math.PI / 2).translate(38, 0.014, 0.6), dm);
  // the village: huts, Grandma's charpai
  hut(b, HUT[0], HUT[2], 3.6, 3.0, 2.3, 0.05);
  hut(b, -58.5, 6.8, 3.0, 2.8, 2.1, -0.15);
  hut(b, -72, 7.5, 3.4, 3.0, 2.2, 0.2);
  hut(b, -60, -16, 2.8, 2.6, 2.0, 3.1);
  charpai(b, HUT[0], HUT[2] - 2.2);
  for (const [x, z, h] of [[-72, -9, 9], [-52, -12, 8], [-63, 12, 10], [-49, 11, 7.5], [-77, 2, 8]] as const) prop(b, {}, "tree_oak", x, 0, z, h, x);
  // the jungle: dense on both sides of the path (kept off the path and the clearing)
  const clear = (x: number, z: number) => Math.hypot(x - 38, z - 1) < 7.2 || Math.abs(z) < 2.6 || (x < -40 && Math.abs(z) < 14);
  const kinds = ["tree_oak", "tree_fat", "tree-high-round", "tree_default", "tree_fat"];
  for (let x = -40; x <= 75; x += 2.6) for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
    const z = side * (3.2 + k * 3.4 + U(0, 2.4)), xx = x + U(-1, 1);
    if (clear(xx, z)) continue;
    plant(kinds[Math.floor(r() * kinds.length)], xx, z, U(9, 16), r() * 6, 2.5);
    if (r() < 0.6) { const bh = U(1.0, 1.8), bz = z - side * U(0.6, 1.4); if (Math.abs(bz) > 5) plant("plant_bushLarge", xx + U(-1, 1), bz, bh, r() * 6, bh + 1.5); }
  }
  // deeper jungle walls (far, low detail) so every horizon is trees
  for (let x = -60; x <= 110; x += 6) for (const side of [-1, 1]) prop(b, {}, "tree_fat", x + U(-2, 2), 0, side * U(18, 30), U(13, 19), r() * 6);
  // the rustling bush, the bear's bush, bushes at the clearing edge
  addVeg(b, "bush", BUSH[0], 0, BUSH[2], 1.3, 11);
  addVeg(b, "bush", BEAR_BUSH[0], 0, BEAR_BUSH[2], 2.0, 12);
  addVeg(b, "bush", BEAR_BUSH[0] + 1.6, 0, BEAR_BUSH[2] - 0.8, 1.6, 13);
  for (const [x, z, h] of [[44, 6.5, 1.5], [46.5, 4.8, 1.8], [31, 4.6, 1.3], [32, -4.2, 1.4], [43, -5.6, 1.6]] as const) addVeg(b, "bush", x, 0, z, h, x * 7);
  // the hornbill's tree: a tall tree beside the path with a bare side branch at PERCH
  addVeg(b, "tall", PERCH[0] + 0.6, 0, PERCH[2] + 1.4, 13, 21);
  const bark = lam("barkHD", () => ({ color: "#8f5d3b" }));
  b.add(new THREE.CylinderGeometry(0.07, 0.12, 2.0, 8).rotateZ(Math.PI / 2).rotateY(0.5).translate(PERCH[0] + 0.1, PERCH[1] - 0.06, PERCH[2] + 0.7), bark);
  // Ram's tree: a fat tree with a low thick branch toward -x
  addVeg(b, "fat", TREE[0], 0, TREE[2], 11.5, 31);
  b.add(new THREE.CylinderGeometry(0.16, 0.26, 2.0, 10).rotateZ(Math.PI / 2 - 0.12).translate(TREE[0] - 1.0, 3.25, TREE[2] - 0.1), bark);
  b.add(new THREE.CylinderGeometry(0.55, 0.75, 3.6, 12).translate(TREE[0], 1.8, TREE[2]), bark);
  b.build(root);
};
