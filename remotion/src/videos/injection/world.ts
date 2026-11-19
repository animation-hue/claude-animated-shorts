// Injection Ka Khauf: one three.js scene - the clinic set (clinic.ts) and the cast as lit ink cards (cast.ts).
// update(id, f, cam) poses everything for shot `id` at frame f (pure function of id + f). One mood all film: "clinic"
// (day preset, soft window key, bright shade) - lights.ts moodLight / moodLook.
import * as THREE from "three";
import { V, Kit } from "./build";
import { LIGHTS, LOOK, LightPreset, moodLight, moodLook } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { buildClinic } from "./clinic";
import { FPS, SHOTS, camAt, ShotDef, segmentOf, SUN_SEG } from "./story";

export const loadKit = () => Promise.resolve({} as Kit); // no external models in this film

const SU = 0.00216;
const geoBody = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const GEO: Record<string, THREE.BufferGeometry> = { body: geoBody };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Record<string, Actor[]> = { body: [] };
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#e4ece8", 9, 60);
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    buildClinic(R);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset, f0: number) {
    const [sa, sb] = segmentOf(id, f0), ck = id * 100000 + sa;
    let v = this.sunCache.get(ck);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = sa; f < sb; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const so = SUN_SEG[`${id}:${sa}`];
    const az = THREE.MathUtils.degToRad(so?.az ?? s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(so?.el ?? s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(ck, v);
    return v;
  }

  private actor(geo: string, i: number) { const a = this.actors[geo]; while (a.length <= i) a.push(new Actor(this.root, GEO[geo])); return a[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = moodLight(LIGHTS[s.light], s.mood), K = moodLook(LOOK[s.light], s.mood);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L, f);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = 7.5; // the whole room in one shadow map
    this.sun.position.set(0, 1, 0).addScaledVector(sunDir, 30); this.sun.target.position.set(0, 1, 0);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 5; sc.far = 60; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * 0.6;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- fog (room depth) ----
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    void K; void t;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const fwd = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const st = stage(id, t, f, { pos: cam.position, right, fwd });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const used: Actor[] = [], counts: Record<string, number> = { body: 0 };
    for (const p of st.places) {
      const sc2 = p.scale ?? 1, geo = p.geo ?? "body";
      if (!p.bill && !this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(geo, counts[geo]++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      if (p.bill) { a.mesh.quaternion.copy(cam.quaternion); a.mesh.rotateZ(p.roll ?? 0); }
      else a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (const geo of Object.keys(this.actors)) for (let i = counts[geo]; i < this.actors[geo].length; i++) this.actors[geo][i].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      e2.glow = p.glow ?? 0;
    }
    const fused = this.fxs.slice(0, fi);
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

