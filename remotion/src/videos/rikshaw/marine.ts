// Marine Drive, our own cartoon version: sea wall + promenade (palms, "Queen's Necklace" lamps), a 4-lane road with
// dashed markings and a median of lamp posts, the signal, a pastel art-deco frontage (flat roofs, horizontal bands,
// rounded parapets), the roundabout (island + fountain) and Happy Singh's garage (pegboard, tyres, bench, drums, bulb).
// Static geometry goes into one Batch; emissive bits (lamp heads, signal lamps, bulb, door glow) are returned so
// world.ts can switch them per frame. Buildings that block any camera sight line are left out.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, Ray } from "./build";
import { ctex, rng, facadeHD } from "./paint";
import { D0, Z_WALL, MEDIAN, FOOT, LANE, SIGNAL_X, CRASH, ROUND, GARAGE } from "./story";

let sight: Ray[] = [];
const inTheWay = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
  for (const { o, d, len } of sight) {
    let t0 = 0, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};

// ---------------- painted textures ----------------
const asphalt = () => ctex("rkAsphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#77716a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 5, 2 + r() * 5); }
  // (no dark tar patches: from above they read as shadows with no caster)
});
const paving = () => ctex("rkPaving", 512, 512, (g, r) => {
  g.fillStyle = "#d9d2c4"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) {
    g.fillStyle = ["#d9d2c4", "#d1cabc", "#e0d9cc", "#cfc8b9"][Math.floor(r() * 4)]; g.fillRect(x + 2, y + 2, 60, 60);
  }
  g.fillStyle = "rgba(90,80,70,0.35)"; for (let k = 0; k <= 512; k += 64) { g.fillRect(k, 0, 2, 512); g.fillRect(0, k, 512, 2); }
});
const pegboard = () => ctex("rkPeg", 1024, 512, (g, r) => {
  g.fillStyle = "#b98d5e"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "rgba(60,40,25,0.5)"; for (let y = 16; y < 512; y += 32) for (let x = 16; x < 1024; x += 32) g.fillRect(x, y, 4, 4);
  const tool = (x: number, y: number, kind: number) => {
    g.strokeStyle = "#241726"; g.lineWidth = 6; g.fillStyle = ["#c8323a", "#3f6fb5", "#8a8f98", "#f2c94c"][kind % 4];
    g.beginPath();
    if (kind % 3 === 0) { g.rect(x - 8, y, 16, 120); g.fill(); g.stroke(); g.beginPath(); g.arc(x, y - 10, 22, 0, 7); g.fill(); g.stroke(); }
    else if (kind % 3 === 1) { g.rect(x - 6, y, 12, 140); g.fill(); g.stroke(); g.beginPath(); g.rect(x - 30, y - 18, 60, 22); g.fill(); g.stroke(); }
    else { g.ellipse(x, y + 50, 40, 40, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(x, y + 50, 16, 16, 0, 0, 7); g.fillStyle = "#b98d5e"; g.fill(); g.stroke(); }
  };
  for (let i = 0; i < 9; i++) tool(70 + i * 110, 120 + (i % 2) * 140, i + Math.floor(r() * 3));
});
const concrete = () => ctex("rkConcrete", 512, 512, (g, r) => {
  g.fillStyle = "#8f8a86"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10; i++) { g.fillStyle = "rgba(30,26,30,0.18)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 60, 12 + r() * 30, r() * 3, 0, 7); g.fill(); }
});

/** the street seen through the garage door at sunset: amber sky, a low sun, palm and building silhouettes */
const sunsetStreet = () => ctex("rkSunsetStreet", 1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#f2a35e"); gr.addColorStop(0.55, "#ffd58c"); gr.addColorStop(0.62, "#ffe9b8"); gr.addColorStop(1, "#c9874e");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  const sg = g.createRadialGradient(560, 300, 10, 560, 300, 260); sg.addColorStop(0, "rgba(255,250,225,1)"); sg.addColorStop(0.25, "rgba(255,236,170,0.8)"); sg.addColorStop(1, "rgba(255,210,140,0)");
  g.fillStyle = sg; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "rgba(120,70,60,0.55)";
  for (const [x, w, h] of [[0, 160, 170], [170, 120, 120], [760, 140, 150], [910, 114, 200]]) g.fillRect(x, 330 - h, w, h + 40);
  g.strokeStyle = "rgba(110,60,50,0.6)"; g.lineWidth = 10;
  for (const px of [300, 840]) { g.beginPath(); g.moveTo(px, 360); g.quadraticCurveTo(px + 12, 260, px + 6, 190); g.stroke();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.moveTo(px + 6, 190); g.quadraticCurveTo(px + 6 + 50 * Math.cos(a), 170 + 20 * Math.sin(a), px + 6 + 80 * Math.cos(a), 205 + 30 * Math.abs(Math.sin(a))); g.stroke(); } }
  g.fillStyle = "rgba(90,50,45,0.4)"; g.fillRect(0, 360, 1024, 152);
});

// deco palette: muted pastels (never lavender in shade: warm creams, peach, mint-teal, ochre)
const DECO = [
  { wall: "#efe3c6", shutter: "#3f6f8f", band: "#c9a979" }, { wall: "#f2cfb0", shutter: "#2f5f6a", band: "#d98f6f" },
  { wall: "#cfe2d6", shutter: "#2f5f6a", band: "#7fb0a0" }, { wall: "#ead39a", shutter: "#5a3b2a", band: "#c79a52" },
  { wall: "#f4e7d3", shutter: "#8c3b4a", band: "#d7b48a" }, { wall: "#e7c2b4", shutter: "#3f6fb5", band: "#c08877" },
];

/** flat-roofed art-deco block, facade facing +z (the sea) at z = zf */
const deco = (b: Batch, x: number, zf: number, w: number, d: number, h: number, si: number) => {
  if (inTheWay(x - w / 2 - 0.5, x + w / 2 + 0.5, D0, D0 + h + 1.5, zf - d - 0.5, zf + 0.8)) return;
  const st = DECO[si % DECO.length];
  const front = lam(`rkF${si}_${w}_${h}`, () => ({ map: facadeHD(`rkF${si}_${w}_${h}`, w, h, { wall: st.wall, shutter: st.shutter, door: true }) }));
  const side = lam(`rkS${si}_${h}`, () => ({ map: facadeHD(`rkS${si}_${h}`, d, h, { wall: st.wall, shutter: st.shutter }) }));
  const band = lam(`rkB${si}`, () => ({ color: st.band })), cap = lam("rkCap", () => ({ color: "#f6efe0" }));
  const x0 = x - w / 2, x1 = x + w / 2, z0 = zf - d, y = D0;
  b.add(quad(V(x0, y, zf), V(x1, y, zf), V(x1, y + h, zf), V(x0, y + h, zf), 1, 1), front);
  b.add(quad(V(x1, y, zf), V(x1, y, z0), V(x1, y + h, z0), V(x1, y + h, zf), 1, 1), side);
  b.add(quad(V(x0, y, z0), V(x0, y, zf), V(x0, y + h, zf), V(x0, y + h, z0), 1, 1), side);
  b.add(boxGeo(V(x0 - 0.1, y + h, z0 - 0.1), V(x1 + 0.1, y + h + 0.25, zf + 0.1)), cap);              // roof slab
  b.add(boxGeo(V(x0 - 0.15, y + h + 0.25, zf - 0.25), V(x1 + 0.15, y + h + 1.0, zf + 0.15)), cap);    // front parapet
  for (let k = 1; k * 2.8 < h - 0.5; k++) b.add(boxGeo(V(x0 - 0.06, y + k * 2.8 - 0.18, zf), V(x1 + 0.06, y + k * 2.8, zf + 0.12)), band); // floor bands
  if (si % 3 === 0) b.add(new THREE.CylinderGeometry(w * 0.12, w * 0.12, h + 1.4, 16, 1, false, 0, Math.PI).rotateY(-Math.PI / 2).translate(x1 - w * 0.12, y + (h + 1.4) / 2, zf), band); // rounded corner tower
};

/** palm: curved trunk of rings + a crown of drooping fronds */
const palm = (b: Batch, x: number, z: number, h: number, seed: number) => {
  const trunk = lam("rkPalmTrunk", () => ({ color: "#9a7652" })), leaf = lam("rkPalmLeaf", () => ({ color: "#4f9a43", side: THREE.DoubleSide }));
  const lean = 0.6 + 0.4 * Math.sin(seed);
  let px = x, pz = z, py = D0;
  for (let i = 0; i < 10; i++) {
    const t = (i + 1) / 10, nx = x + lean * t * t, ny = D0 + h * t;
    const g = new THREE.CylinderGeometry(0.17 - 0.05 * t, 0.2 - 0.05 * t, h / 10 + 0.05, 8);
    b.add(g, trunk, new THREE.Matrix4().compose(V((px + nx) / 2, (py + ny) / 2, pz), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(nx - px, ny - py, 0).normalize()), V(1, 1, 1)));
    px = nx; py = ny;
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + seed, g = new THREE.BufferGeometry(), L = 2.6, pts: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, r = L * t, y = 0.5 * t - 1.4 * t * t, w = 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.1));
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, nx2 = -Math.sin(a) * w, nz2 = Math.cos(a) * w;
      pts.push(px + cx - nx2, py + y, pz + cz - nz2, px + cx + nx2, py + y, pz + cz + nz2);
    }
    const idx: number[] = []; for (let i = 0; i < 8; i++) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx); g.computeVertexNormals();
    b.add(g, leaf);
  }
};

export type Marine = {
  lampHeads: THREE.Mesh[]; signal: { red: THREE.Mesh; amber: THREE.Mesh; green: THREE.Mesh }; bulb: THREE.Mesh; door: THREE.Mesh;
  crashPost: THREE.Group;
};

export const buildMarine = (root: THREE.Object3D, rays: Ray[]): Marine => {
  sight = rays;
  const b = new Batch(), r = rng(1930);
  const road = lam("rkRoad", () => ({ map: asphalt() })), pave = lam("rkPave", () => ({ map: paving() }));
  for (const m of [road, pave]) if (m.map) { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.anisotropy = 16; }
  const white = lam("rkLine", () => ({ color: "#f1ede2" })), kerb = lam("rkKerb", () => ({ color: "#bdb6aa" }));
  const wallM = lam("rkSeaWall", () => ({ color: "#a59d90" })), grass = lam("rkGrass", () => ({ color: "#7fb35a" })), plaza = lam("rkPlaza", () => ({ color: "#a9a49c" }));
  const XA = -420, XB = 520;
  const up = (x0: number, x1: number, z0: number, z1: number, m: THREE.Material, dy = 0, tile = 6) => {
    const g = new THREE.BufferGeometry(), y = D0 + dy;
    g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([0, 1, 0]).flat(), 3));
    const u = (x1 - x0) / tile, v = (z1 - z0) / tile;
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
    b.add(g, m);
  };
  // ground strips (z decreasing inland)
  up(XA, XB, -34, Z_WALL, pave, 0.15, 3);                                    // promenade (raised kerb)
  up(XA, XB, -48, -34, road, 0, 10);                                          // road
  up(XA, XB, -51, -48, pave, 0.15, 3);                                        // city footpath
  up(XA - 900, XB + 900, -1200, -51, plaza, -0.02, 20);                       // city ground behind the frontage (paved, to the horizon)
  b.add(boxGeo(V(XA, D0, -34.1), V(XB, D0 + 0.15, -33.9)), kerb); b.add(boxGeo(V(XA, D0, -48.1), V(XB, D0 + 0.15, -47.9)), kerb);
  // sea wall + parapet + tetrapods below
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute([XA, -0.5, Z_WALL, XB, -0.5, Z_WALL, XB, D0 + 0.15, Z_WALL, XA, -0.5, Z_WALL, XB, D0 + 0.15, Z_WALL, XA, D0 + 0.15, Z_WALL], 3));
  wg.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill([0, 0, 1]).flat(), 3));
  b.add(wg, wallM);
  b.add(boxGeo(V(XA, D0 + 0.15, Z_WALL - 0.45), V(XB, D0 + 0.75, Z_WALL)), kerb);
  const tet = lam("rkTetra", () => ({ color: "#9b958b" }));
  for (let i = 0; i < 160; i++) { const g = new THREE.TetrahedronGeometry(0.9 + r() * 0.5); g.rotateX(r() * 6); g.rotateY(r() * 6); g.translate(XA + r() * (XB - XA), 0.2 + r() * 0.8, Z_WALL + 0.8 + r() * 2.6); b.add(g, tet); }
  // lane markings: dashed lane lines + solid median edges; zebra at the signal
  for (let x = XA; x < XB; x += 6) for (const z of [(LANE.sea + LANE.e2) / 2, (LANE.w1 + LANE.w2) / 2]) b.add(boxGeo(V(x, D0 + 0.005, z - 0.07), V(x + 3, D0 + 0.012, z + 0.07)), white);
  b.add(boxGeo(V(XA, D0, MEDIAN - 0.55), V(XB, D0 + 0.22, MEDIAN + 0.55)), kerb);                    // median divider
  for (let k = 0; k < 8; k++) b.add(boxGeo(V(SIGNAL_X + 1.0, D0 + 0.005, -34 - 0.2 - k * 1.7), V(SIGNAL_X + 3.4, D0 + 0.012, -34 - 0.9 - k * 1.7)), white); // zebra
  // frontage: pastel deco blocks with gaps; leave room for the roundabout and the garage
  const lampHeads: THREE.Mesh[] = [];
  for (let x = XA + 6; x < XB - 6;) {
    const w = [10, 12, 14, 16][Math.floor(r() * 4)], h = [12, 15, 18, 21][Math.floor(r() * 4)], cx = x + w / 2;
    const nearRound = Math.abs(cx - ROUND[0]) < 34, nearGarage = Math.abs(cx - GARAGE[0]) < 16;
    if (!nearRound && !nearGarage) deco(b, cx, -51.5, w, 12, h, Math.floor(r() * 6));
    x += w + (r() < 0.25 ? 3 : 0.4);
  }
  // the city behind: two more rows of taller blocks, and a ring of blocks round the roundabout, so no view ends in a void
  for (const [zf, hs] of [[-80, [18, 22, 26, 30]], [-112, [24, 30, 36, 42]]] as const)
    for (let x = XA - 200; x < XB + 300;) {
      const w = [14, 16, 18][Math.floor(r() * 3)], h = hs[Math.floor(r() * 4)], cx = x + w / 2;
      if (!(Math.abs(cx - ROUND[0]) < 30 && zf > -100) && Math.abs(cx - GARAGE[0]) > 14) deco(b, cx, zf, w, 14, h, Math.floor(r() * 6));
      x += w + 2 + r() * 4;
    }
  for (const dx of [-26, -8, 10, 28]) deco(b, ROUND[0] + dx, ROUND[2] - 20, 14, 12, 16 + (dx % 3 + 3) * 2, Math.floor(r() * 6));
  // palms on the promenade, between the lamps
  for (let x = XA + 12; x < XB; x += 24) { const px = x + r() * 3; if (px > 10 && px < 50) continue; palm(b, px, -32.3, 7 + r() * 2.5, x * 0.37); } // keep the ending's frame clear
  // lamp posts: promenade (the necklace) + median; heads are separate emissive meshes
  const pole = lam("rkPole", () => ({ color: "#4a4f5a" }));
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85) });
  const addLamp = (x: number, z: number, armDir: number, grp?: THREE.Group) => {
    const target = grp ?? null;
    const pg = new THREE.CylinderGeometry(0.09, 0.13, 7.5, 8).translate(x, D0 + 3.75, z);
    const ag = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6).rotateX(Math.PI / 2).translate(x, D0 + 7.3, z + armDir * 0.7);
    if (target) { for (const g of [pg, ag]) { const m = new THREE.Mesh(g, pole); m.castShadow = true; target.add(m); } }
    else { b.add(pg, pole); b.add(ag, pole); }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10).scale(1, 0.6, 1).translate(x, D0 + 7.15, z + armDir * 1.35), headMat.clone());
    (target ?? root).add(head); lampHeads.push(head);
  };
  for (let x = XA + 6; x < XB; x += 24) addLamp(x, -33.4, 1);
  const crashPost = new THREE.Group();
  for (let x = XA + 12; x < XB; x += 18) { if (Math.abs(x - CRASH[0]) < 4 || Math.abs(x - 30) < 16) continue; addLamp(x, MEDIAN, -1); } // none in the ending's frame
  addLamp(CRASH[0], CRASH[2], -1, crashPost); root.add(crashPost);
  // the signal: pole on the city footpath? (eastbound faces +x): pole on the median at the stop line, arm over the eastbound lanes
  const sigPole = lam("rkSig", () => ({ color: "#2c3038" }));
  b.add(new THREE.CylinderGeometry(0.12, 0.14, 6.2, 8).translate(SIGNAL_X + 0.4, D0 + 3.1, MEDIAN + 0.2), sigPole);
  b.add(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6).rotateX(Math.PI / 2).translate(SIGNAL_X + 0.4, D0 + 6.0, MEDIAN + 2.0), sigPole);
  b.add(boxGeo(V(SIGNAL_X + 0.25, D0 + 4.75, -38.95), V(SIGNAL_X + 0.6, D0 + 5.95, -38.55)), sigPole);
  const lampG = new THREE.CircleGeometry(0.13, 16).rotateY(-Math.PI / 2);
  const mk = (y: number, col: THREE.ColorRepresentation) => { const m = new THREE.Mesh(lampG.clone().translate(SIGNAL_X + 0.24, D0 + y, -38.75), new THREE.MeshBasicMaterial({ color: col })); root.add(m); return m; };
  const signal = { red: mk(5.75, "#ff3b30"), amber: mk(5.35, "#ffb020"), green: mk(4.95, "#34d058") };
  // roundabout: island lawn + fountain + flower ring
  const island = new THREE.CylinderGeometry(7, 7.2, 0.35, 40).translate(ROUND[0], D0 + 0.17, ROUND[2]);
  b.add(island, grass);
  b.add(new THREE.CylinderGeometry(7.3, 7.3, 0.36, 40, 1, true).translate(ROUND[0], D0 + 0.17, ROUND[2]), kerb);
  b.add(new THREE.CylinderGeometry(2.4, 2.6, 0.7, 24).translate(ROUND[0], D0 + 0.7, ROUND[2]), lam("rkFount", () => ({ color: "#e9e1d0" })));
  b.add(new THREE.CylinderGeometry(2.1, 2.1, 0.05, 24).translate(ROUND[0], D0 + 1.06, ROUND[2]), lam("rkFountW", () => ({ color: "#6fc3dd" })));
  b.add(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 10).translate(ROUND[0], D0 + 2.1, ROUND[2]), lam("rkFount", () => ({ color: "#e9e1d0" })));
  for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; b.add(new THREE.SphereGeometry(0.35, 8, 6).translate(ROUND[0] + 5.6 * Math.cos(a), D0 + 0.55, ROUND[2] + 5.6 * Math.sin(a)), lam("rkFlower" + (k % 3), () => ({ color: ["#e8505b", "#f2c94c", "#f07aa8"][k % 3] }))); }
  up(ROUND[0] - 16, ROUND[0] + 16, ROUND[2] - 16, ROUND[2] + 18, road, 0.004, 10);                    // road apron round the island (joins Marine Drive)
  // Happy Singh's garage: room open toward +z
  const [gx, , gz] = GARAGE, W = 10, Dp = 9, Hh = 4.6, x0 = gx - W / 2, x1 = gx + W / 2, z0 = gz - Dp + 3, z1 = gz + 3;
  const gWall = lam("rkGWall", () => ({ color: "#6f8fa3" })), peg = lam("rkPegM", () => ({ map: pegboard() })), floor = lam("rkGFloor", () => ({ map: concrete() }));
  if (floor.map) { floor.map.wrapS = floor.map.wrapT = THREE.RepeatWrapping; }
  up(x0, x1, z0, z1, floor, 0.02, 4);
  b.add(quad(V(x0, D0, z0), V(x1, D0, z0), V(x1, D0 + Hh, z0), V(x0, D0 + Hh, z0)), peg);              // back wall (pegboard)
  b.add(quad(V(x0, D0, z1), V(x0, D0, z0), V(x0, D0 + Hh, z0), V(x0, D0 + Hh, z1)), gWall);            // side walls (inward)
  b.add(quad(V(x1, D0, z0), V(x1, D0, z1), V(x1, D0 + Hh, z1), V(x1, D0 + Hh, z0)), gWall);
  b.add(boxGeo(V(x0 - 0.3, D0 + Hh, z0 - 0.3), V(x1 + 0.3, D0 + Hh + 0.3, z1 + 0.3)), lam("rkGRoof", () => ({ color: "#5d6a75" })));
  b.add(boxGeo(V(x0 - 0.3, D0 + Hh - 1.3, z1), V(x1 + 0.3, D0 + Hh, z1 + 0.3)), lam("rkShutter", () => ({ color: "#9aa3ad" }))); // half-raised shutter
  b.add(boxGeo(V(x0 - 0.3, D0, z1), V(x0 + 0.2, D0 + Hh, z1 + 0.3)), gWall); b.add(boxGeo(V(x1 - 0.2, D0, z1), V(x1 + 0.3, D0 + Hh, z1 + 0.3)), gWall);
  b.add(boxGeo(V(x0 + 0.3, D0, z0 + 0.3), V(x0 + 3.2, D0 + 0.95, z0 + 1.3)), lam("rkBench", () => ({ color: "#7a5434" })));          // workbench
  const tyre = lam("rkTyre", () => ({ color: "#1f1f24" }));
  for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.42, 0.17, 10, 20).rotateX(Math.PI / 2).translate(x1 - 1.0, D0 + 0.17 + k * 0.32, z0 + 1.0), tyre);
  for (let k = 0; k < 2; k++) b.add(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 16).translate(x0 + 0.8 + k * 0.9, D0 + 0.55, z1 - 1.5), lam("rkDrum" + k, () => ({ color: k ? "#2f6a43" : "#c8323a" })));
  b.add(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 4).translate(gx, D0 + Hh - 0.5, gz - 1.5), pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10).translate(gx, D0 + Hh - 1.05, gz - 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8) }));
  root.add(bulb);
  // door glow: a warm emissive plane just outside the doorway, faded in by world.ts
  // (a big double-sided plane some metres beyond the doorway: through the door the street reads as a wall of gold light)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(W + 14, 9).translate(gx, D0 + 4.2, z1 + 9), new THREE.MeshBasicMaterial({ map: sunsetStreet(), color: new THREE.Color(0, 0, 0), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  b.add(boxGeo(V(x0 + 0.15, D0, z1 - 0.05), V(x0 + 0.45, D0 + Hh - 1.3, z1 + 0.35)), lam("rkDoorTrim", () => ({ color: "#2b2a33" })));
  b.add(boxGeo(V(x1 - 0.45, D0, z1 - 0.05), V(x1 - 0.15, D0 + Hh - 1.3, z1 + 0.35)), lam("rkDoorTrim", () => ({ color: "#2b2a33" })));
  root.add(door);
  // a short garage-street outside: road + the frontage across it
  up(gx - 30, gx + 30, z1 + 0.3, z1 + 14, road, 0.003, 10);
  b.build(root);
  sight = [];
  return { lampHeads, signal, bulb, door, crashPost };
};
