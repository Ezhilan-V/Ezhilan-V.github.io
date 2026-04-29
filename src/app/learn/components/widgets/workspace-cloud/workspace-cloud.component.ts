import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const L_BASE     = 0.18;
const L_SHOULDER = 0.50;
const L_ELBOW    = 0.45;
const L_WRIST    = 0.10;

@Component({
  standalone: false,
  selector: 'learn-workspace-cloud',
  template: `
    <div class="wc">
      <div class="wc__stage" #host></div>
      <div class="wc__panel">
        <div class="wc__head">
          <span>Workspace cloud</span>
          <button (click)="resample()" class="wc__btn">
            <i class="fas fa-arrows-rotate"></i> resample
          </button>
        </div>
        <p class="wc__desc">{{ pointCount.toLocaleString() }} random joint configurations sampled. Each blue dot is a TCP position the arm can reach. The donut shape with a hole is the workspace.</p>
        <div class="wc__row">
          <label>Samples
            <input type="range" min="500" max="6000" step="500" [value]="pointCount" (input)="setPointCount($any($event.target).value)" />
            <span>{{ pointCount }}</span>
          </label>
          <label>Joint q₂ limit (±°)
            <input type="range" min="30" max="180" step="5" [value]="q2Limit" (input)="setQ2Limit($any($event.target).value)" />
            <span>{{ q2Limit }}°</span>
          </label>
          <label>Joint q₃ limit (±°)
            <input type="range" min="30" max="180" step="5" [value]="q3Limit" (input)="setQ3Limit($any($event.target).value)" />
            <span>{{ q3Limit }}°</span>
          </label>
        </div>
        <p class="wc__hint">Tighten the joint limits and watch the workspace shrink. Singular configurations are visible as the points cluster densely on the boundary.</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wc { display: grid; grid-template-columns: 1fr; gap: 1rem;
          background: rgba(15,23,42,0.55); border: 1px solid rgba(148,163,184,0.15);
          border-radius: 16px; padding: 1rem; overflow: hidden; }
    @media (min-width: 900px) { .wc { grid-template-columns: 1.5fr 1fr; gap: 1.25rem; padding: 1.25rem; } }
    .wc__stage { position: relative; aspect-ratio: 4/3; border-radius: 12px; overflow: hidden;
                 background: linear-gradient(180deg, #0a1320 0%, #050810 100%); }
    @media (min-width: 900px) { .wc__stage { aspect-ratio: auto; min-height: 420px; } }
    .wc__stage canvas { display: block; }
    .wc__panel { display: flex; flex-direction: column; gap: 0.7rem; }
    .wc__head { display: flex; justify-content: space-between; align-items: center;
                font-size: 0.78rem; font-weight: 600; color: #38bdf8;
                text-transform: uppercase; letter-spacing: 0.12em; }
    .wc__btn { background: transparent; border: 1px solid rgba(148,163,184,0.25);
               color: #cbd5e1; font-family: inherit; font-size: 0.74rem;
               padding: 0.3rem 0.7rem; border-radius: 8px; cursor: pointer; }
    .wc__btn:hover { color: #38bdf8; border-color: rgba(56,189,248,0.45); }
    .wc__desc { margin: 0; color: #94a3b8; font-size: 0.85rem; line-height: 1.5; }
    .wc__row { display: flex; flex-direction: column; gap: 0.6rem; }
    .wc__row label { display: flex; flex-direction: column; gap: 0.2rem;
                     color: #cbd5e1; font-size: 0.78rem; }
    .wc__row label span { color: #38bdf8; font-family: 'JetBrains Mono', monospace; font-size: 0.74rem; }
    .wc__row input[type=range] { width: 100%; }
    .wc__hint { margin: 0; color: #64748b; font-size: 0.72rem; line-height: 1.5; }
  `]
})
export class WorkspaceCloudComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  pointCount = 2500;
  q2Limit = 135;
  q3Limit = 150;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private rafId?: number;
  private resizeObs?: ResizeObserver;
  private cloud?: THREE.Points;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() { this.zone.runOutsideAngular(() => this.init()); }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    if (this.renderer && this.host?.nativeElement.contains(this.renderer.domElement)) {
      this.host.nativeElement.removeChild(this.renderer.domElement);
    }
  }

  setPointCount(v: any) { this.pointCount = +v; this.resample(); }
  setQ2Limit(v: any) { this.q2Limit = +v; this.resample(); }
  setQ3Limit(v: any) { this.q3Limit = +v; this.resample(); }
  resample() { this.buildCloud(); }

  private init() {
    const el = this.host.nativeElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.05, 50);
    this.camera.position.set(1.5, 1.2, 1.6);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(el.clientWidth, el.clientHeight, false);
    el.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.target.set(0, 0.4, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const k = new THREE.DirectionalLight(0xffffff, 0.9); k.position.set(2, 4, 2);
    this.scene.add(k);

    const grid = new THREE.GridHelper(3, 12, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.35; (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);
    this.scene.add(new THREE.AxesHelper(0.3));

    // Reference arm in default pose
    this.buildArm();
    this.buildCloud();

    this.resizeObs = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight; if (!w) return;
      this.renderer!.setSize(w, h, false); this.camera!.aspect = w / h; this.camera!.updateProjectionMatrix();
    });
    this.resizeObs.observe(el);

    const tick = () => {
      this.controls?.update();
      this.renderer!.render(this.scene!, this.camera!);
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  private buildArm() {
    const root = new THREE.Group();
    root.position.y = 0;
    this.scene!.add(root);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, L_BASE, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 })
    );
    base.position.y = L_BASE / 2; root.add(base);

    // Show a sample arm pose for context
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, L_SHOULDER, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 })
    );
    upper.position.y = L_BASE + L_SHOULDER / 2;
    root.add(upper);
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, L_ELBOW, 16),
      new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.5 })
    );
    forearm.position.y = L_BASE + L_SHOULDER + L_ELBOW / 2;
    root.add(forearm);
  }

  private buildCloud() {
    if (this.cloud) {
      this.scene!.remove(this.cloud);
      this.cloud.geometry.dispose();
      (this.cloud.material as THREE.Material).dispose();
    }
    const positions = new Float32Array(this.pointCount * 3);
    const q2Lim = this.q2Limit * Math.PI / 180;
    const q3Lim = this.q3Limit * Math.PI / 180;
    for (let i = 0; i < this.pointCount; i++) {
      const q1 = (Math.random() - 0.5) * 2 * Math.PI;       // base yaw
      const q2 = (Math.random() - 0.5) * 2 * q2Lim;         // shoulder pitch from straight up
      const q3 = (Math.random() - 0.5) * 2 * q3Lim;         // elbow
      // Forward kinematics: in shoulder local plane (radial r vs vertical h):
      const r = L_SHOULDER * Math.sin(q2) + L_ELBOW * Math.sin(q2 + q3);
      const h = L_BASE + L_SHOULDER * Math.cos(q2) + L_ELBOW * Math.cos(q2 + q3);
      // World position with base yaw q1:
      positions[i * 3]     = r * Math.cos(q1);
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = r * Math.sin(q1);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x7dd3fc, size: 0.012, transparent: true, opacity: 0.6
    });
    this.cloud = new THREE.Points(geom, mat);
    this.scene!.add(this.cloud);
  }
}
