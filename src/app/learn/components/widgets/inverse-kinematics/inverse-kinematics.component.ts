import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * 3D IK demo on a 3-link arm: base yaw + shoulder pitch + elbow pitch.
 * Closed-form analytical IK for the end-effector position (x, y, z).
 *
 * The wrist is locked to "point along the arm" so the user focuses on
 * positional IK; this matches what most teaching texts cover first.
 */

const L_BASE     = 0.18;
const L_SHOULDER = 0.5;
const L_ELBOW    = 0.45;

@Component({
  standalone: false,
  selector: 'learn-inverse-kinematics',
  templateUrl: './inverse-kinematics.component.html',
  styleUrls: ['./inverse-kinematics.component.scss']
})
export class InverseKinematicsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;

  /** Slider-controlled target. World-frame meters. */
  target = { x: 0.4, y: 0.55, z: 0.0 };

  /** Solved joint angles in degrees, for display. */
  q = { base: 0, shoulder: 0, elbow: 0 };
  reachable = true;
  elbowUp = true;

  reach = { min: Math.abs(L_SHOULDER - L_ELBOW), max: L_SHOULDER + L_ELBOW };

  /** Slider min / max in meters. */
  bounds = {
    x: { min: -1.0, max: 1.0 },
    y: { min:  0.0, max: 1.4 },
    z: { min: -1.0, max: 1.0 }
  };

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private rafId?: number;
  private resizeObs?: ResizeObserver;

  // Arm groups
  private j1?: THREE.Group; // base yaw
  private j2?: THREE.Group; // shoulder pitch
  private j3?: THREE.Group; // elbow pitch
  private tcp?: THREE.Object3D;
  private targetMesh?: THREE.Mesh;
  private targetLine?: THREE.Line;

  // Drag state
  private raycaster = new THREE.Raycaster();
  private dragging = false;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  constructor(private zone: NgZone) {}

  // ─── lifecycle ─────────────────────────────────────────────
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
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else mat.dispose();
      }
    });
  }

  // ─── controls ──────────────────────────────────────────────
  setTarget(axis: 'x' | 'y' | 'z', raw: any) {
    this.target[axis] = +raw;
    this.solveAndApply();
  }

  toggleElbow() {
    this.elbowUp = !this.elbowUp;
    this.solveAndApply();
  }

  randomTarget() {
    const reach = this.reach.max * 0.92;
    const r = (Math.random() * 0.7 + 0.2) * reach;
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * 0.7;
    this.target.x = +(r * Math.sin(theta) * Math.cos(phi)).toFixed(2);
    this.target.z = +(r * Math.sin(theta) * Math.sin(phi)).toFixed(2);
    this.target.y = +(L_BASE + r * Math.cos(theta) * 0.8).toFixed(2);
    this.solveAndApply();
  }

  reset() {
    this.target = { x: 0.4, y: 0.55, z: 0.0 };
    this.elbowUp = true;
    this.solveAndApply();
  }

  // ─── IK solver ─────────────────────────────────────────────
  private solveAndApply() {
    const x = this.target.x;
    const y = this.target.y - L_BASE;   // shift origin to shoulder
    const z = this.target.z;

    const baseYaw = Math.atan2(z, x);
    const r = Math.sqrt(x * x + z * z);
    const d = Math.sqrt(r * r + y * y);

    if (d > this.reach.max || d < this.reach.min) {
      this.reachable = false;
      // Aim toward target as best we can
      this.q.base = THREE.MathUtils.radToDeg(baseYaw);
      this.q.shoulder = THREE.MathUtils.radToDeg(Math.atan2(y, r));
      this.q.elbow = 0;
    } else {
      this.reachable = true;
      const cosE = (d * d - L_SHOULDER * L_SHOULDER - L_ELBOW * L_ELBOW)
        / (2 * L_SHOULDER * L_ELBOW);
      const c = Math.max(-1, Math.min(1, cosE));
      const elbow = Math.acos(c) * (this.elbowUp ? 1 : -1);
      const k1 = L_SHOULDER + L_ELBOW * Math.cos(elbow);
      const k2 = L_ELBOW * Math.sin(elbow);
      const shoulder = Math.atan2(y, r) - Math.atan2(k2, k1);

      this.q.base     = THREE.MathUtils.radToDeg(baseYaw);
      this.q.shoulder = THREE.MathUtils.radToDeg(shoulder);
      this.q.elbow    = THREE.MathUtils.radToDeg(elbow);
    }

    this.applyAnglesToScene();
    this.zone.run(() => {
      this.q.base = +this.q.base.toFixed(0);
      this.q.shoulder = +this.q.shoulder.toFixed(0);
      this.q.elbow = +this.q.elbow.toFixed(0);
    });
  }

  private applyAnglesToScene() {
    if (!this.j1 || !this.j2 || !this.j3 || !this.targetMesh) return;
    // Base yaw: q.base = atan2(z, x); Three.js Y-rotation that aligns j1's +X to the target = -atan2(z, x).
    this.j1.rotation.y = -THREE.MathUtils.degToRad(this.q.base);
    // Shoulder: standard 2-link returns angle of upper arm from +X axis. Our cylinder defaults along +Y,
    // so subtract π/2 so that "shoulder = 0 from +X" maps to "arm horizontal".
    this.j2.rotation.z = THREE.MathUtils.degToRad(this.q.shoulder) - Math.PI / 2;
    // Elbow: standard θ₂ applied directly (positive = elbow bends toward standard +Y direction).
    this.j3.rotation.z = THREE.MathUtils.degToRad(this.q.elbow);

    this.targetMesh.position.set(this.target.x, this.target.y, this.target.z);
    const targetMat = this.targetMesh.material as THREE.MeshStandardMaterial;
    targetMat.color.setHex(this.reachable ? 0xfb7185 : 0x6b7280);
    targetMat.emissive.setHex(this.reachable ? 0x9f1239 : 0x1f2937);

    if (this.targetLine && this.tcp) {
      const tcpPos = new THREE.Vector3();
      this.tcp.getWorldPosition(tcpPos);
      const positions = (this.targetLine.geometry as THREE.BufferGeometry)
        .attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, tcpPos.x, tcpPos.y, tcpPos.z);
      positions.setXYZ(1, this.target.x, this.target.y, this.target.z);
      positions.needsUpdate = true;
    }
  }

  // ─── pointer drag on target ────────────────────────────────
  private onPointerDown = (ev: PointerEvent) => {
    if (!this.targetMesh || !this.camera || !this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.targetMesh);
    if (!hits.length) return;
    ev.stopPropagation();
    if (this.controls) this.controls.enabled = false;
    this.dragging = true;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    // Plane perpendicular to camera through current target position
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.dragPlane.setFromNormalAndCoplanarPoint(camDir, this.targetMesh.position);
  };

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.dragging || !this.camera || !this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const intersect = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, intersect)) return;
    // Clamp to bounds
    this.target.x = clamp(intersect.x, this.bounds.x.min, this.bounds.x.max);
    this.target.y = clamp(intersect.y, this.bounds.y.min, this.bounds.y.max);
    this.target.z = clamp(intersect.z, this.bounds.z.min, this.bounds.z.max);
    this.solveAndApply();
  };

  private onPointerUp = () => {
    this.dragging = false;
    if (this.controls) this.controls.enabled = true;
  };

  // ─── init ──────────────────────────────────────────────────
  private init() {
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50);
    this.camera.position.set(1.4, 1.0, 1.4);
    this.camera.lookAt(0, 0.4, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 4;
    this.controls.target.set(0, 0.4, 0);

    this.addLights();
    this.addGround();
    this.buildArm();
    this.buildTarget();
    this.solveAndApply();

    // Pointer events for target dragging
    const cv = this.renderer.domElement;
    cv.addEventListener('pointerdown', this.onPointerDown);
    cv.addEventListener('pointermove', this.onPointerMove);
    cv.addEventListener('pointerup',   this.onPointerUp);
    cv.addEventListener('pointerleave', this.onPointerUp);

    this.resizeObs = new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(el);

    const tick = () => {
      this.controls?.update();
      this.renderer!.render(this.scene!, this.camera!);
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
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
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 4, 2);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.5);
    rim.position.set(-2, 2.5, -2);
    this.scene!.add(amb, key, rim);
  }

  private addGround() {
    const grid = new THREE.GridHelper(4, 16, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.001;
    this.scene!.add(grid);

    const axes = new THREE.AxesHelper(0.35);
    (axes.material as THREE.Material).transparent = true;
    (axes.material as THREE.Material).opacity = 0.85;
    this.scene!.add(axes);

    // Reachability sphere (faint wireframe)
    const reachShell = new THREE.Mesh(
      new THREE.SphereGeometry(this.reach.max, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.06 })
    );
    reachShell.position.y = L_BASE;
    this.scene!.add(reachShell);
  }

  private buildArm() {
    const root = new THREE.Group();
    this.scene!.add(root);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, L_BASE, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.4 })
    );
    base.position.y = L_BASE / 2;
    root.add(base);

    const j1 = new THREE.Group(); j1.position.y = L_BASE; root.add(j1); this.j1 = j1;
    j1.add(this.jointBall(0xa78bfa, 0.06));

    const j2 = new THREE.Group(); j1.add(j2); this.j2 = j2;
    j2.add(this.jointBall(0x38bdf8, 0.07));
    const upper = this.cylinderLink(L_SHOULDER, 0.045, 0x38bdf8);
    upper.position.y = L_SHOULDER / 2;
    j2.add(upper);

    const j3 = new THREE.Group(); j3.position.y = L_SHOULDER; j2.add(j3); this.j3 = j3;
    j3.add(this.jointBall(0x34d399, 0.06));
    const fore = this.cylinderLink(L_ELBOW, 0.04, 0x34d399);
    fore.position.y = L_ELBOW / 2;
    j3.add(fore);

    // TCP marker at end of forearm
    const tcp = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0x713f12, emissiveIntensity: 0.6 })
    );
    tcp.position.y = L_ELBOW;
    j3.add(tcp);
    this.tcp = tcp;
  }

  private buildTarget() {
    const target = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0x9f1239, emissiveIntensity: 0.55, roughness: 0.4 })
    );
    target.position.set(this.target.x, this.target.y, this.target.z);
    this.scene!.add(target);
    this.targetMesh = target;

    // Outer halo ring for affordance
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.075, 32),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    target.add(ring);

    // Dashed line from TCP to target (updated each frame)
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xfb7185, dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0.55
    });
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3()
    ]);
    const line = new THREE.Line(lineGeom, lineMat);
    line.computeLineDistances();
    this.scene!.add(line);
    this.targetLine = line;
  }

  private jointBall(color: number, r = 0.05) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 18, 18),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 })
    );
  }

  private cylinderLink(len: number, radius: number, color: number) {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, len, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 })
    );
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
