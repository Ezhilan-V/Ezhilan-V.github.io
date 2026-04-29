import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Joint {
  key: string;
  label: string;
  symbol: string;
  axis: 'x' | 'y' | 'z';
  min: number;
  max: number;
  value: number;
  group: THREE.Group;
}

/* UR5-flavored 6-DOF arm dimensions (rough, in meters at 1 unit = 1 m) */
const L_BASE     = 0.18;   // base height
const L_SHOULDER = 0.42;   // upper arm
const L_ELBOW    = 0.39;   // forearm
const L_WRIST1   = 0.10;
const L_WRIST2   = 0.10;
const L_GRIPPER  = 0.10;

@Component({
  standalone: false,
  selector: 'learn-kinematics-viewer',
  templateUrl: './kinematics-viewer.component.html',
  styleUrls: ['./kinematics-viewer.component.scss']
})
export class KinematicsViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;

  joints: Joint[] = [];
  endEffector = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private rafId?: number;
  private resizeObs?: ResizeObserver;
  private gripper?: THREE.Object3D;

  constructor(private zone: NgZone) {}

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
    this.scene?.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[];
      if (mat) {
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    });
  }

  reset() {
    this.joints[0].value =   0;
    this.joints[1].value = -45;
    this.joints[2].value =  90;
    this.joints[3].value = -45;
    this.joints[4].value =   0;
    this.joints[5].value =   0;
    this.applyAngles();
  }

  homePose() {
    this.joints.forEach(j => j.value = 0);
    this.applyAngles();
  }

  onSlider(j: Joint, raw: any) {
    j.value = +raw;
    this.applyAngles();
  }

  private init() {
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50);
    this.camera.position.set(1.2, 1.0, 1.4);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 4;
    this.controls.target.set(0, 0.5, 0);

    this.addLights();
    this.addGround();
    this.buildArm();
    this.reset();

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
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(2, 4, 2);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.55);
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
  }

  private buildArm() {
    const root = new THREE.Group();
    this.scene!.add(root);

    /* Base plinth */
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, L_BASE, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.4 })
    );
    base.position.y = L_BASE / 2;
    root.add(base);

    /* Joint 1 - base yaw (rotation about Y, world up) */
    const j1 = new THREE.Group();
    j1.position.y = L_BASE;
    root.add(j1);
    j1.add(this.jointBall(0xa78bfa, 0.06));

    /* Joint 2 - shoulder pitch (rotation about Z) */
    const j2 = new THREE.Group();
    j2.position.set(0, 0.04, 0);
    j1.add(j2);
    j2.add(this.jointBall(0x38bdf8, 0.07));

    /* Upper arm link from shoulder. Default along +Y when angles are 0. */
    const upper = this.cylinderLink(L_SHOULDER, 0.045, 0x38bdf8);
    upper.position.y = L_SHOULDER / 2;
    j2.add(upper);

    /* Joint 3 - elbow pitch */
    const j3 = new THREE.Group();
    j3.position.y = L_SHOULDER;
    j2.add(j3);
    j3.add(this.jointBall(0x34d399, 0.06));

    /* Forearm link */
    const fore = this.cylinderLink(L_ELBOW, 0.04, 0x34d399);
    fore.position.y = L_ELBOW / 2;
    j3.add(fore);

    /* Joint 4 - wrist 1 (pitch) */
    const j4 = new THREE.Group();
    j4.position.y = L_ELBOW;
    j3.add(j4);
    j4.add(this.jointBall(0xfbbf24, 0.05));

    const w1 = this.cylinderLink(L_WRIST1, 0.035, 0xfbbf24);
    w1.position.y = L_WRIST1 / 2;
    j4.add(w1);

    /* Joint 5 - wrist 2 (yaw) */
    const j5 = new THREE.Group();
    j5.position.y = L_WRIST1;
    j4.add(j5);
    j5.add(this.jointBall(0xfb7185, 0.045));

    const w2 = this.cylinderLink(L_WRIST2, 0.03, 0xfb7185);
    w2.position.y = L_WRIST2 / 2;
    j5.add(w2);

    /* Joint 6 - wrist 3 (roll) */
    const j6 = new THREE.Group();
    j6.position.y = L_WRIST2;
    j5.add(j6);
    j6.add(this.jointBall(0xec4899, 0.04));

    /* Gripper - two parallel jaws */
    const gripperRoot = new THREE.Group();
    gripperRoot.position.y = L_GRIPPER * 0.4;
    j6.add(gripperRoot);
    this.gripper = gripperRoot;

    const palmMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.4 });
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.06), palmMat);
    palm.position.y = 0.02;
    gripperRoot.add(palm);

    const fingerGeom = new THREE.BoxGeometry(0.012, 0.07, 0.02);
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.6 });
    const fL = new THREE.Mesh(fingerGeom, fingerMat); fL.position.set(-0.034, 0.075, 0); gripperRoot.add(fL);
    const fR = new THREE.Mesh(fingerGeom, fingerMat); fR.position.set( 0.034, 0.075, 0); gripperRoot.add(fR);

    /* TCP marker */
    const tcp = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0x713f12, emissiveIntensity: 0.6 })
    );
    tcp.position.y = 0.115;
    gripperRoot.add(tcp);

    this.joints = [
      { key: 'q1', label: 'Base yaw',     symbol: 'q₁', axis: 'y', min: -180, max: 180, value:   0, group: j1 },
      { key: 'q2', label: 'Shoulder',     symbol: 'q₂', axis: 'z', min: -135, max:  90, value: -45, group: j2 },
      { key: 'q3', label: 'Elbow',        symbol: 'q₃', axis: 'z', min: -150, max: 150, value:  90, group: j3 },
      { key: 'q4', label: 'Wrist 1',      symbol: 'q₄', axis: 'z', min: -180, max: 180, value: -45, group: j4 },
      { key: 'q5', label: 'Wrist 2',      symbol: 'q₅', axis: 'y', min: -180, max: 180, value:   0, group: j5 },
      { key: 'q6', label: 'Wrist 3',      symbol: 'q₆', axis: 'z', min: -180, max: 180, value:   0, group: j6 }
    ];
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

  private applyAngles() {
    if (!this.joints.length) return;
    for (const j of this.joints) {
      const rad = THREE.MathUtils.degToRad(j.value);
      j.group.rotation.set(0, 0, 0);
      if (j.axis === 'x') j.group.rotation.x = rad;
      else if (j.axis === 'y') j.group.rotation.y = rad;
      else j.group.rotation.z = rad;
    }

    if (this.gripper) {
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      this.gripper.getWorldPosition(wp);
      this.gripper.getWorldQuaternion(wq);
      const e = new THREE.Euler().setFromQuaternion(wq, 'ZYX');
      this.zone.run(() => {
        this.endEffector = {
          x: +wp.x.toFixed(2),
          y: +wp.y.toFixed(2),
          z: +wp.z.toFixed(2),
          roll:  +THREE.MathUtils.radToDeg(e.x).toFixed(0),
          pitch: +THREE.MathUtils.radToDeg(e.y).toFixed(0),
          yaw:   +THREE.MathUtils.radToDeg(e.z).toFixed(0)
        };
      });
    }
  }
}
