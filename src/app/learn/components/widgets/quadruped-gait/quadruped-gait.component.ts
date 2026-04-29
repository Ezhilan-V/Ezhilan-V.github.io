import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type GaitName = 'walk' | 'trot' | 'pace' | 'bound' | 'gallop';

interface GaitDef {
  name: GaitName;
  label: string;
  duty: number;
  offsets: [number, number, number, number];   // FL, FR, RL, RR
  description: string;
}

const GAITS: Record<GaitName, GaitDef> = {
  walk:   { name: 'walk',   label: 'Walk',           duty: 0.75, offsets: [0.00, 0.50, 0.75, 0.25], description: 'Slow, three legs always grounded - most stable' },
  trot:   { name: 'trot',   label: 'Trot',           duty: 0.50, offsets: [0.00, 0.50, 0.50, 0.00], description: 'Diagonal pairs - Spot, Anymal, Unitree default' },
  pace:   { name: 'pace',   label: 'Pace',           duty: 0.50, offsets: [0.00, 0.50, 0.00, 0.50], description: 'Lateral pairs - camels, some sport horses' },
  bound:  { name: 'bound',  label: 'Bound',          duty: 0.50, offsets: [0.00, 0.00, 0.50, 0.50], description: 'Front pair / rear pair - squirrels, fast quads' },
  gallop: { name: 'gallop', label: 'Gallop (rotary)', duty: 0.40, offsets: [0.00, 0.08, 0.55, 0.63], description: 'Cheetah-style - fastest, brief flight phase' }
};

const LEG_NAMES = ['FL', 'FR', 'RL', 'RR'];
const LEG_COLORS_HEX = [0xfb7185, 0x38bdf8, 0xa78bfa, 0x34d399];
const LEG_COLORS_CSS = ['#fb7185', '#38bdf8', '#a78bfa', '#34d399'];

interface LegMesh {
  hipBall: THREE.Mesh;
  upperCyl: THREE.Mesh;
  kneeBall: THREE.Mesh;
  lowerCyl: THREE.Mesh;
  footBall: THREE.Mesh;
}

@Component({
  standalone: false,
  selector: 'learn-quadruped-gait',
  templateUrl: './quadruped-gait.component.html',
  styleUrls: ['./quadruped-gait.component.scss']
})
export class QuadrupedGaitComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;

  gaitNames: GaitName[] = ['walk', 'trot', 'pace', 'bound', 'gallop'];
  current: GaitName = 'trot';
  currentDef = GAITS['trot'];

  freq = 1.4;
  stride = 0.35;
  paused = false;

  legStance = [false, false, false, false];

  legColors = LEG_COLORS_CSS;
  legNames = LEG_NAMES;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private rafId?: number;
  private resizeObs?: ResizeObserver;
  private lastTs = 0;
  private t = 0;

  private bodyGroup?: THREE.Group;
  private hips: THREE.Vector3[] = [];
  private legs: LegMesh[] = [];

  private readonly UP = new THREE.Vector3(0, 1, 0);

  private bodyL = 0.55;
  private bodyW = 0.28;
  private bodyH = 0.10;
  private hipHeight = 0.30;
  private upperLen = 0.16;
  private lowerLen = 0.18;

  /**
   * Knee bend direction per leg, expressed as a sign in body local +Z direction
   * (positive = knee bows toward +Z = backward; negative = bows toward -Z = forward).
   * Front legs typically bow knee forward (-1); rear legs bow knee backward (+1).
   */
  private kneeBendDir = [-1, -1, +1, +1];

  private groundStripes: THREE.Mesh[] = [];

  constructor(private zone: NgZone) {}

  // ─── lifecycle ─────────────────────────────────────────
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    if (this.renderer && this.host?.nativeElement.contains(this.renderer.domElement)) {
      this.host.nativeElement.removeChild(this.renderer.domElement);
    }
    this.scene?.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      if (mat) {
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else mat.dispose();
      }
    });
  }

  // ─── controls ──────────────────────────────────────────
  setGait(name: GaitName) {
    this.current = name;
    this.currentDef = GAITS[name];
  }

  onSlider(field: 'freq' | 'stride', raw: any) {
    (this as any)[field] = +raw;
  }

  togglePause() { this.paused = !this.paused; }

  // ─── gait math ─────────────────────────────────────────
  private legState(idx: number): { stance: boolean; phase: number; stanceProg: number; swingProg: number } {
    const offset = this.currentDef.offsets[idx];
    let phase = (this.t * this.freq + offset) % 1;
    if (phase < 0) phase += 1;
    const duty = this.currentDef.duty;
    const stance = phase < duty;
    const stanceProg = stance ? phase / duty : 0;
    const swingProg = stance ? 0 : (phase - duty) / Math.max(1 - duty, 1e-6);
    return { stance, phase, stanceProg, swingProg };
  }

  // ─── three.js init ─────────────────────────────────────
  private init() {
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50);
    this.camera.position.set(1.0, 0.9, 1.4);
    this.camera.lookAt(0, 0.3, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.7;
    this.controls.maxDistance = 4;
    this.controls.target.set(0, 0.25, 0);

    this.addLights();
    this.addGround();
    this.buildRobot();

    this.resizeObs = new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(el);

    this.lastTs = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.lastTs) / 1000, 0.05);
      this.lastTs = now;
      if (!this.paused) this.t += dt;
      this.applyGait(dt);
      this.controls?.update();
      this.renderer!.render(this.scene!, this.camera!);
      this.rafId = requestAnimationFrame(tick);
    };
    tick(this.lastTs);
  }

  private onResize() {
    if (!this.renderer || !this.camera) return;
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private addLights() {
    this.scene!.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 4, 2);
    this.scene!.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rim.position.set(-2, 3, -2);
    this.scene!.add(rim);
  }

  private addGround() {
    const grid = new THREE.GridHelper(8, 32, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0;
    this.scene!.add(grid);

    const stripeGeom = new THREE.PlaneGeometry(0.6, 0.06);
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.DoubleSide
    });
    for (let i = 0; i < 16; i++) {
      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      stripe.position.set(0, 0.001, -3 + i * 0.4);
      stripe.rotation.x = -Math.PI / 2;
      this.scene!.add(stripe);
      this.groundStripes.push(stripe);
    }

    const axes = new THREE.AxesHelper(0.3);
    (axes.material as THREE.Material).transparent = true;
    (axes.material as THREE.Material).opacity = 0.85;
    this.scene!.add(axes);
  }

  private buildRobot() {
    const body = new THREE.Group();
    body.position.y = this.hipHeight;
    this.scene!.add(body);
    this.bodyGroup = body;

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(this.bodyW, this.bodyH, this.bodyL),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.4 })
    );
    body.add(chassis);

    // Head at front (forward = -Z)
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.10, 0.13),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8, roughness: 0.4, metalness: 0.5,
        emissive: 0x0c4a6e, emissiveIntensity: 0.3
      })
    );
    head.position.set(0, 0.04, -this.bodyL / 2 - 0.07);
    body.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0x713f12, emissiveIntensity: 0.7 });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), eyeMat);
    const eR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), eyeMat);
    eL.position.set(-0.04, 0.05, -this.bodyL / 2 - 0.13);
    eR.position.set( 0.04, 0.05, -this.bodyL / 2 - 0.13);
    body.add(eL, eR);

    // Hip positions (body-local). Forward = -Z. Place hips at chassis bottom corners, slightly outboard.
    this.hips = [
      new THREE.Vector3(-this.bodyW / 2 - 0.01, -this.bodyH / 2, -this.bodyL / 2 + 0.06),  // FL
      new THREE.Vector3( this.bodyW / 2 + 0.01, -this.bodyH / 2, -this.bodyL / 2 + 0.06),  // FR
      new THREE.Vector3(-this.bodyW / 2 - 0.01, -this.bodyH / 2,  this.bodyL / 2 - 0.06),  // RL
      new THREE.Vector3( this.bodyW / 2 + 0.01, -this.bodyH / 2,  this.bodyL / 2 - 0.06)   // RR
    ];

    // Build leg meshes - position-only updates, no nested rotation hierarchy.
    for (let i = 0; i < 4; i++) {
      const colorHex = LEG_COLORS_HEX[i];
      const limbMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55, metalness: 0.3 });
      const ballMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.4 });

      const hipBall  = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16), ballMat);
      const upperCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.015, this.upperLen, 12),
        limbMat
      );
      const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), ballMat);
      const lowerCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.012, this.lowerLen, 12),
        limbMat
      );
      const footBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 16, 16),
        new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 })
      );

      body.add(hipBall, upperCyl, kneeBall, lowerCyl, footBall);
      this.legs.push({ hipBall, upperCyl, kneeBall, lowerCyl, footBall });
    }
  }

  /**
   * Position-based 2-link IK: compute the foot target from gait phase, solve
   * the triangle (hip, knee, foot) for the knee position, then orient each
   * cylinder between its endpoints. Avoids the rotation-axis sign confusion
   * of nested-group IK.
   */
  private applyGait(dt: number) {
    if (!this.bodyGroup) return;

    const liftHeight = 0.06;
    let stanceCount = 0;

    for (let i = 0; i < 4; i++) {
      const { stance, stanceProg, swingProg } = this.legState(i);
      this.legStance[i] = stance;
      if (stance) stanceCount++;

      const hipBody = this.hips[i];
      const groundY = -this.hipHeight;
      const footX = hipBody.x;
      let footZ: number;
      let liftY = 0;
      if (stance) {
        // Stance: foot slides backward in body frame as the body marches forward
        footZ = hipBody.z + (-0.5 + stanceProg) * this.stride;
      } else {
        // Swing: foot lifts in a parabolic arc and swings forward
        footZ = hipBody.z + (0.5 - swingProg) * this.stride;
        liftY = Math.sin(swingProg * Math.PI) * liftHeight;
      }
      const footY = groundY + liftY;
      const footPos = new THREE.Vector3(footX, footY, footZ);

      // Knee position via 2-link IK in the y-z (sagittal) plane.
      const dy = footPos.y - hipBody.y;
      const dz = footPos.z - hipBody.z;
      const dPlanar = Math.hypot(dy, dz);
      const L1 = this.upperLen, L2 = this.lowerLen;
      const reach = clamp(dPlanar, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);

      // Angle at hip between hip→foot direction and hip→knee direction.
      const cosA = (L1 * L1 + reach * reach - L2 * L2) / (2 * L1 * reach);
      const A = Math.acos(clamp(cosA, -1, 1));

      // Direction from hip to foot in sagittal plane (unit vector).
      const along = new THREE.Vector3(0, dy / reach, dz / reach);
      // Perpendicular to `along` in the y-z plane (90° rotation about +X, right-hand rule):
      // (0, y, z) rotated +90° about +X → (0, -z, y).
      const perp = new THREE.Vector3(0, -along.z, along.y);
      // Choose perpendicular sign so the knee bows in the desired direction.
      // perp.z > 0 ⇒ knee toward +Z (backward bend, suits rear legs).
      // perp.z < 0 ⇒ knee toward -Z (forward bend, suits front legs).
      const wantBackward = this.kneeBendDir[i] > 0;
      if ((perp.z > 0) !== wantBackward) perp.negate();

      const kneePos = hipBody.clone()
        .add(along.clone().multiplyScalar(L1 * Math.cos(A)))
        .add(perp.clone().multiplyScalar(L1 * Math.sin(A)));

      const leg = this.legs[i];
      leg.hipBall.position.copy(hipBody);
      leg.kneeBall.position.copy(kneePos);
      leg.footBall.position.copy(footPos);
      this.alignSegment(leg.upperCyl, hipBody, kneePos);
      this.alignSegment(leg.lowerCyl, kneePos, footPos);
    }

    // Subtle body bob with stance count
    const bobTarget = this.hipHeight + 0.005 * (stanceCount - 2);
    this.bodyGroup.position.y += (bobTarget - this.bodyGroup.position.y) * 0.15;

    // Subtle pitch / roll
    const fl = +this.legStance[0], fr = +this.legStance[1], rl = +this.legStance[2], rr = +this.legStance[3];
    const pitchTarget = ((rl + rr) - (fl + fr)) * 0.025;
    const rollTarget  = ((fl + rl) - (fr + rr)) * 0.018;
    this.bodyGroup.rotation.x += (pitchTarget - this.bodyGroup.rotation.x) * 0.15;
    this.bodyGroup.rotation.z += (rollTarget  - this.bodyGroup.rotation.z) * 0.15;

    // Ground stripes scroll backward
    const speed = this.stride * this.freq * (this.paused ? 0 : 1);
    for (const stripe of this.groundStripes) {
      stripe.position.z += dt * speed;
      if (stripe.position.z > 3) stripe.position.z -= 6.4;
    }
  }

  /**
   * Position a unit-length-along-Y cylinder so it spans from `from` to `to`
   * (positions in the parent's local frame).
   *
   * Cylinder geometry was built with its exact length (L1 or L2) along +Y,
   * and the 2-link IK guarantees the segment length matches by construction,
   * so no scaling is needed - just position at the midpoint and orient via
   * setFromUnitVectors. This sidesteps every rotation-axis sign trap.
   */
  private alignSegment(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 1e-6) return;
    mesh.position.copy(from).add(dir.clone().multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(this.UP, dir.clone().normalize());
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
