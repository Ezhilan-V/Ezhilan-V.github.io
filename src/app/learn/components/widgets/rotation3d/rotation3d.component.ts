import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  standalone: false,
  selector: 'learn-rotation3d',
  templateUrl: './rotation3d.component.html',
  styleUrls: ['./rotation3d.component.scss']
})
export class Rotation3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;

  // Euler ZYX (yaw, pitch, roll) in degrees
  yaw = 30;
  pitch = 20;
  roll = -10;

  // Computed
  qw = 1; qx = 0; qy = 0; qz = 0;
  axisX = 1; axisY = 0; axisZ = 0; axisDeg = 0;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private cube?: THREE.Group;
  private rafId?: number;
  private resizeObs?: ResizeObserver;

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
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as any;
      if (mat) (Array.isArray(mat) ? mat.forEach((x: any) => x.dispose()) : mat.dispose());
    });
  }

  // ── controls ──

  onSlider(field: 'yaw' | 'pitch' | 'roll', raw: any) {
    (this as any)[field] = +raw;
    this.applyEuler();
  }

  reset() { this.yaw = 0; this.pitch = 0; this.roll = 0; this.applyEuler(); }

  preset(name: 'identity' | 'gimbal-lock' | 'flip-x' | 'random') {
    if (name === 'identity')          { this.yaw =  0; this.pitch =   0; this.roll =  0; }
    else if (name === 'gimbal-lock')  { this.yaw =  0; this.pitch =  89; this.roll = 45; }
    else if (name === 'flip-x')       { this.yaw =  0; this.pitch =   0; this.roll = 180; }
    else if (name === 'random')       {
      this.yaw   = Math.round((Math.random() - 0.5) * 360);
      this.pitch = Math.round((Math.random() - 0.5) * 180);
      this.roll  = Math.round((Math.random() - 0.5) * 360);
    }
    this.applyEuler();
  }

  // ── math ──

  private applyEuler() {
    if (!this.cube) return;
    const e = new THREE.Euler(
      THREE.MathUtils.degToRad(this.roll),     // X
      THREE.MathUtils.degToRad(this.pitch),    // Y
      THREE.MathUtils.degToRad(this.yaw),      // Z
      'ZYX'
    );
    this.cube.setRotationFromEuler(e);

    const q = new THREE.Quaternion().setFromEuler(e);
    this.qx = +q.x.toFixed(3);
    this.qy = +q.y.toFixed(3);
    this.qz = +q.z.toFixed(3);
    this.qw = +q.w.toFixed(3);

    // Axis-angle
    const angle = 2 * Math.acos(Math.max(-1, Math.min(1, q.w)));
    const s = Math.sqrt(Math.max(0, 1 - q.w * q.w));
    if (s < 1e-6) {
      this.axisX = 1; this.axisY = 0; this.axisZ = 0; this.axisDeg = 0;
    } else {
      this.axisX = +(q.x / s).toFixed(3);
      this.axisY = +(q.y / s).toFixed(3);
      this.axisZ = +(q.z / s).toFixed(3);
      this.axisDeg = +(THREE.MathUtils.radToDeg(angle)).toFixed(1);
    }
    this.zone.run(() => {});
  }

  // ── three init ──

  private init() {
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(3.6, 2.6, 3.6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0, 0);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(4, 6, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.4);  rim.position.set(-4, 3, -3); this.scene.add(rim);

    // Ground grid (faint)
    const grid = new THREE.GridHelper(8, 16, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = -1.0;
    this.scene.add(grid);

    // World axes (long, faint)
    const worldAxes = new THREE.AxesHelper(1.0);
    (worldAxes.material as THREE.Material).transparent = true;
    (worldAxes.material as THREE.Material).opacity = 0.55;
    this.scene.add(worldAxes);

    // The rotated cube group (with cube + body axes)
    this.cube = new THREE.Group();
    this.scene.add(this.cube);

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.55, metalness: 0.2 }), // +X red
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.55, metalness: 0.2 }), // -X
      new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.55, metalness: 0.2 }), // +Y green
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.55, metalness: 0.2 }), // -Y
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.55, metalness: 0.2 }), // +Z blue
      new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.55, metalness: 0.2 })  // -Z
    ];
    const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), materials);
    this.cube.add(cubeMesh);

    // Body axes
    const bodyAxes = new THREE.AxesHelper(1.4);
    this.cube.add(bodyAxes);

    this.applyEuler();

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
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
