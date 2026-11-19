// The clinic, our own cartoon set for "Injection Ka Khauf": a small exam room (floor y = 0, x -4..4, z -3.5..3.5,
// 3.2 m high, open toward -z where most cameras stand): pastel walls with a dado band, tiled floor, a window with
// blinds, an examination couch (padded mauve top on a chrome frame) along x at z = 0, a medicine cabinet, a sink,
// a curtain rail, an IV stand and a round wall clock without numbers. Everything goes into one Batch.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad } from "./build";
import { ctex } from "./paint";
import { COUCH } from "./story";

const tiles = () => ctex("ijTiles", 512, 512, (g, r) => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#d8dde3" : "#e6eaee"; g.fillRect(x * 64, y * 64, 64, 64); }
  g.fillStyle = "rgba(90,95,110,0.35)"; for (let k = 0; k <= 512; k += 64) { g.fillRect(k, 0, 2, 512); g.fillRect(0, k, 512, 2); }
  for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(r() * 512, r() * 512, 10 + r() * 20, 2); }
});
const wallTex = () => ctex("ijWall", 1024, 512, (g) => {
  g.fillStyle = "#cfe6dd"; g.fillRect(0, 0, 1024, 512);                       // mint upper wall
  g.fillStyle = "#9fc7c4"; g.fillRect(0, 330, 1024, 182);                     // darker dado
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 318, 1024, 14);                      // dado rail
});
const blinds = () => ctex("ijBlinds", 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fff6dc"); gr.addColorStop(1, "#ffe7b0");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(170,150,120,0.55)"; for (let y = 6; y < 256; y += 18) g.fillRect(0, y, 256, 6);
  g.strokeStyle = "#f4f1e8"; g.lineWidth = 14; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
});
const clock = () => ctex("ijClock", 256, 256, (g) => {
  g.fillStyle = "#fbfaf6"; g.strokeStyle = "#241726"; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.stroke();
  g.lineCap = "round"; for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = 7; g.beginPath(); g.moveTo(128 + 82 * Math.cos(a), 128 + 82 * Math.sin(a)); g.lineTo(128 + 98 * Math.cos(a), 128 + 98 * Math.sin(a)); g.stroke(); }
  g.lineWidth = 11; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 64); g.stroke(); g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(176, 146); g.stroke();
});
const bottles = () => ctex("ijShelf", 512, 512, (g, r) => {
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, 512, 512);
  for (let s = 0; s < 3; s++) {
    g.fillStyle = "#c9bfae"; g.fillRect(0, 150 + s * 160, 512, 10);
    for (let k = 0; k < 7; k++) { const x = 20 + k * 70, h = 50 + r() * 60; g.fillStyle = ["#e8505b", "#3f6fb5", "#f2c94c", "#5fbf7a", "#f4f1e8", "#7b5ac9"][Math.floor(r() * 6)];
      g.fillRect(x, 150 + s * 160 - h, 40, h); g.strokeStyle = "#241726"; g.lineWidth = 4; g.strokeRect(x, 150 + s * 160 - h, 40, h); g.fillStyle = "#f4f1e8"; g.fillRect(x + 6, 150 + s * 160 - h * 0.7, 28, h * 0.3); }
  }
});

export const buildClinic = (root: THREE.Object3D) => {
  const b = new Batch(), sh = new Batch(); // sh = the room shell: never casts (the sun would black out the room)
  const floor = lam("ijFloor", () => ({ map: tiles() })), wall = lam("ijWallM", () => ({ map: wallTex(), side: THREE.DoubleSide }));
  for (const m of [floor]) if (m.map) { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; }
  const ceil = lam("ijCeil", () => ({ color: "#f4f1e8", side: THREE.DoubleSide })), trim = lam("ijTrim", () => ({ color: "#f4f1e8" }));
  const X0 = -4.5, X1 = 4.5, Z0 = -6, Z1 = 3.5, H = 3.2;
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute([X0, 0, Z1, X1, 0, Z1, X1, 0, Z0, X0, 0, Z1, X1, 0, Z0, X0, 0, Z0], 3));
  fg.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([0, 1, 0]).flat(), 3));
  fg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 9 / 1.6, 0, 9 / 1.6, 9.5 / 1.6, 0, 0, 9 / 1.6, 9.5 / 1.6, 0, 9.5 / 1.6], 2));
  sh.add(fg, floor);
  // walls: back (z = Z1), left (x = X0), right (x = X1), front (z = Z0) - all facing inward
  sh.add(quad(V(X1, 0, Z1), V(X0, 0, Z1), V(X0, H, Z1), V(X1, H, Z1)), wall);
  sh.add(quad(V(X0, 0, Z0), V(X0, 0, Z1), V(X0, H, Z1), V(X0, H, Z0)), wall);
  sh.add(quad(V(X1, 0, Z1), V(X1, 0, Z0), V(X1, H, Z0), V(X1, H, Z1)), wall);
  sh.add(quad(V(X0, 0, Z0), V(X1, 0, Z0), V(X1, H, Z0), V(X0, H, Z0)), wall);
  sh.add(quad(V(X0, H, Z0), V(X1, H, Z0), V(X1, H, Z1), V(X0, H, Z1)), ceil);
  for (const [a, c] of [[V(X0, 0, Z1 - 0.06), V(X1, 0.12, Z1)], [V(X0, 0, Z0), V(X0 + 0.06, 0.12, Z1)], [V(X1 - 0.06, 0, Z0), V(X1, 0.12, Z1)]] as const) sh.add(boxGeo(a, c), trim); // skirting
  // window with blinds on the back wall (warm daylight behind)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3).rotateY(Math.PI).translate(2.0, 1.75, Z1 - 0.02), new THREE.MeshBasicMaterial({ map: blinds(), color: new THREE.Color(1.35, 1.3, 1.2) }));
  root.add(win);
  b.add(boxGeo(V(1.0, 1.02, Z1 - 0.14), V(3.0, 1.1, Z1)), trim);                                               // sill
  // round clock (no numerals) on the left wall
  const clk = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32).rotateY(Math.PI / 2).translate(X0 + 0.02, 2.35, 0.4), new THREE.MeshBasicMaterial({ map: clock() }));
  root.add(clk);
  // examination couch: mauve padded top on a chrome frame, a raised head rest at -x, a paper roll
  const [cx, cy, cz] = COUCH, L = 2.0, Wc = 0.7;
  const pad = lam("ijPad", () => ({ color: "#8e6f86" })), chrome = lam("ijChrome", () => ({ color: "#c9cdd4" }));
  b.add(boxGeo(V(cx - L / 2, cy - 0.12, cz - Wc / 2), V(cx + L / 2, cy, cz + Wc / 2)), pad);
  b.add(new THREE.BoxGeometry(0.42, 0.05, 0.5).translate(cx - L / 2 + 0.26, cy + 0.025, cz), lam("ijPillow", () => ({ color: "#f8f6ee" }))); // flat pillow
  b.add(boxGeo(V(cx - L / 2 + 0.5, cy + 0.001, cz - 0.24), V(cx + L / 2, cy + 0.006, cz + 0.24)), lam("ijPaper", () => ({ color: "#f8f6ee" })));
  for (const dx of [-L / 2 + 0.12, L / 2 - 0.12]) for (const dz of [-Wc / 2 + 0.08, Wc / 2 - 0.08])
    b.add(new THREE.CylinderGeometry(0.03, 0.03, cy - 0.12, 8).translate(cx + dx, (cy - 0.12) / 2, cz + dz), chrome);
  b.add(boxGeo(V(cx - L / 2 + 0.1, 0.22, cz - Wc / 2 + 0.06), V(cx + L / 2 - 0.1, 0.25, cz + Wc / 2 - 0.06)), chrome);
  // medicine cabinet (glass front with bottles) on the right wall, a sink with a mirror on the back wall
  const shelf = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5).rotateY(-Math.PI / 2).translate(X1 - 0.31, 1.55, 1.8), new THREE.MeshBasicMaterial({ map: bottles() }));
  root.add(shelf);
  b.add(boxGeo(V(X1 - 0.3, 0.8, 1.15), V(X1, 2.35, 2.45)), lam("ijCab", () => ({ color: "#f4f1e8" })));
  b.add(boxGeo(V(-2.6, 0.85, Z1 - 0.45), V(-1.8, 0.95, Z1)), lam("ijSink", () => ({ color: "#f8f8f6" })));
  b.add(boxGeo(V(-2.55, 0.0, Z1 - 0.4), V(-1.85, 0.85, Z1 - 0.05)), lam("ijCab", () => ({ color: "#f4f1e8" })));
  b.add(boxGeo(V(-2.5, 1.2, Z1 - 0.03), V(-1.9, 1.9, Z1)), lam("ijMirror", () => ({ color: "#bfd9e8" })));
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6).rotateX(Math.PI / 2).translate(-2.2, 1.05, Z1 - 0.15), chrome);
  // curtain rail + a pale blue curtain pulled to the right of the couch head
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 3.4, 6).rotateZ(Math.PI / 2).translate(0, 2.9, 1.6), chrome);
  const cur = lam("ijCurtain", () => ({ color: "#9cc6e4", side: THREE.DoubleSide }));
  for (let k = 0; k < 7; k++) b.add(new THREE.PlaneGeometry(0.22, 2.4).translate(1.15 + k * 0.17, 1.6, 1.6 + 0.06 * Math.sin(k * 1.7)), cur);
  // IV stand beside the couch
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6).translate(cx + L / 2 + 0.45, 0.95, cz + 0.6), chrome);
  b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12).translate(cx + L / 2 + 0.45, 0.03, cz + 0.6), chrome);
  b.add(new THREE.BoxGeometry(0.16, 0.24, 0.06).translate(cx + L / 2 + 0.45, 1.75, cz + 0.6), lam("ijBag", () => ({ color: "#d9eef7" })));
  // ceiling lamp
  b.add(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24).translate(0, H - 0.03, 0), lam("ijLamp", () => ({ color: "#ffffff" })));
  b.build(root);
  sh.build(root, false);
};
