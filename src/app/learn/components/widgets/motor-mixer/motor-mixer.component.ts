import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Motor {
  /** body-frame x position (right = +x) */
  x: number;
  /** body-frame z position (forward = -z) */
  z: number;
  ccw: boolean;
  cmd: number;
  phase: number;
  prop?: THREE.Object3D;
  glow?: THREE.Mesh;
}

@Component({
  standalone: false,
  selector: 'learn-motor-mixer',
  templateUrl: './motor-mixer.component.html',
  styleUrls: ['./motor-mixer.component.scss']
})
export class MotorMixerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;

  thrust = 0.55;
  roll   = 0.0;
  pitch  = 0.0;
  yaw    = 0.0;

  motorLabels = ['FL', 'FR', 'RR', 'RL'];

  motors: Motor[] = [
    { x: -1, z: -1, ccw: true,  cmd: 0, phase: 0 },
    { x:  1, z: -1, ccw: false, cmd: 0, phase: 0 },
    { x:  1, z:  1, ccw: true,  cmd: 0, phase: 0 },
    { x: -1, z:  1, ccw: false, cmd: 0, phase: 0 }
  ];

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private body?: THREE.Group;
  private rafId?: number;
  private resizeObs?: ResizeObserver;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.compute();
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

  onSlider(field: 'thrust' | 'roll' | 'pitch' | 'yaw', raw: any) {
    (this as any)[field] = +raw;
    this.compute();
  }

  applyPreset(p: 'hover' | 'roll-left' | 'pitch-fwd' | 'yaw-cw' | 'rampup') {
    const map = {
      'hover':     [0.55,  0,    0,    0],
      'roll-left': [0.55, +0.5,  0,    0],
      'pitch-fwd': [0.55,  0,   +0.5,  0],
      'yaw-cw':    [0.55,  0,    0,   -0.5],
      'rampup':    [0.95,  0,    0,    0]
    } as const;
    [this.thrust, this.roll, this.pitch, this.yaw] = map[p];
    this.compute();
  }

  private compute() {
    const raw = [
      this.thrust - this.roll + this.pitch + this.yaw,   // FL CCW
      this.thrust + this.roll + this.pitch - this.yaw,   // FR CW
      this.thrust + this.roll - this.pitch + this.yaw,   // RR CCW
      this.thrust - this.roll - this.pitch - this.yaw    // RL CW
    ];
    for (let i = 0; i < 4; i++) {
      this.motors[i].cmd = clamp(raw[i], 0, 1);
    }
  }

  private init() {
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50);
    this.camera.position.set(2.4, 2.2, 2.6);
    this.camera.lookAt(0, 0.6, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 8;
    this.controls.target.set(0, 0.6, 0);

    this.addLights();
    this.addGround();
    this.buildBody();

    this.resizeObs = new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(el);

    this.lastTs = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.lastTs) / 1000, 0.05);
      this.lastTs = now;
      this.animateProps(dt);
      this.applyAttitude();
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
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 4, 2);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rim.position.set(-3, 3, -3);
    this.scene!.add(amb, key, rim);
  }

  private addGround() {
    const grid = new THREE.GridHelper(6, 24, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.001;
    this.scene!.add(grid);

    const axes = new THREE.AxesHelper(0.5);
    (axes.material as THREE.Material).transparent = true;
    (axes.material as THREE.Material).opacity = 0.85;
    this.scene!.add(axes);
  }

  private buildBody() {
    const armLen = 0.65;
    const motorR = 0.22;

    const body = new THREE.Group();
    body.position.y = 0.6;
    this.scene!.add(body);
    this.body = body;

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 })
    );
    body.add(plate);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8, roughness: 0.3, metalness: 0.5,
        emissive: 0x0c4a6e, emissiveIntensity: 0.3
      })
    );
    dome.position.y = 0.04;
    body.add(dome);

    // Forward arrow (heading)
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.13, 12),
      new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0x713f12, emissiveIntensity: 0.6 })
    );
    arrow.position.set(0, 0.05, -0.18);
    arrow.rotation.x = -Math.PI / 2;
    body.add(arrow);

    const armMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.4 });
    const motorBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });

    for (let i = 0; i < this.motors.length; i++) {
      const m = this.motors[i];
      const dir = new THREE.Vector3(m.x, 0, m.z).normalize();
      const dist = armLen;

      // Arm
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, dist, 16),
        armMat
      );
      arm.position.copy(dir.clone().multiplyScalar(dist / 2));
      arm.lookAt(dir.clone().multiplyScalar(dist));
      arm.rotateX(Math.PI / 2);
      body.add(arm);

      // Motor base
      const motorBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.05, 24),
        motorBaseMat
      );
      motorBase.position.set(dir.x * dist, 0.025, dir.z * dist);
      body.add(motorBase);

      // Spin-direction halo (scales + opacity track thrust)
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(motorR * 1.1, 24),
        new THREE.MeshBasicMaterial({
          color: m.ccw ? 0xa78bfa : 0x38bdf8,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide
        })
      );
      glow.position.set(dir.x * dist, 0.05, dir.z * dist);
      glow.rotation.x = -Math.PI / 2;
      body.add(glow);
      m.glow = glow;

      // Disc base (visual contrast for prop)
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(motorR * 0.92, 24),
        new THREE.MeshBasicMaterial({
          color: 0x0a1320, transparent: true, opacity: 0.7, side: THREE.DoubleSide
        })
      );
      disc.position.set(dir.x * dist, 0.052, dir.z * dist);
      disc.rotation.x = -Math.PI / 2;
      body.add(disc);

      // Spinning prop
      const prop = new THREE.Group();
      prop.position.set(dir.x * dist, 0.075, dir.z * dist);
      body.add(prop);
      m.prop = prop;

      const propMat = new THREE.MeshStandardMaterial({
        color: m.ccw ? 0xa78bfa : 0x38bdf8, roughness: 0.4, metalness: 0.6
      });
      for (let b = 0; b < 2; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(motorR * 1.6, 0.005, 0.02), propMat
        );
        blade.rotation.y = b * Math.PI / 2;
        prop.add(blade);
      }
      prop.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
      ));

      // Spin-direction ring indicator
      const ringGeom = new THREE.RingGeometry(
        motorR * 1.25, motorR * 1.32, 24, 1,
        0, m.ccw ? Math.PI * 1.4 : -Math.PI * 1.4
      );
      const ring = new THREE.Mesh(
        ringGeom,
        new THREE.MeshBasicMaterial({
          color: m.ccw ? 0xa78bfa : 0x38bdf8,
          side: THREE.DoubleSide, transparent: true, opacity: 0.55
        })
      );
      ring.position.set(dir.x * dist, 0.085, dir.z * dist);
      ring.rotation.x = -Math.PI / 2;
      body.add(ring);
    }
  }

  private animateProps(dt: number) {
    for (const m of this.motors) {
      const omega = m.cmd * (m.ccw ? -32 : 32);
      m.phase += dt * omega;
      if (m.prop) m.prop.rotation.y = m.phase;

      if (m.glow) {
        const s = 0.7 + m.cmd * 0.6;
        m.glow.scale.set(s, s, s);
        (m.glow.material as THREE.MeshBasicMaterial).opacity = 0.1 + m.cmd * 0.4;
      }
    }
  }

  private applyAttitude() {
    if (!this.body) return;
    const rollTarget  =  this.roll * 0.35;
    const pitchTarget = -this.pitch * 0.35;
    this.body.rotation.z += (rollTarget  - this.body.rotation.z) * 0.12;
    this.body.rotation.x += (pitchTarget - this.body.rotation.x) * 0.12;
    this.body.rotation.y -= this.yaw * 0.012;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
