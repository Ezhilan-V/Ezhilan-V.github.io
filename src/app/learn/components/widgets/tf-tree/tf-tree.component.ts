import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface FrameDef {
  name: string;
  parent: string | null;
  pos: [number, number, number];
  euler: [number, number, number]; // radians
}

@Component({
  standalone: false,
  selector: 'learn-tf-tree',
  template: `
    <div class="tf">
      <div class="tf__stage">
        <div class="tf__canvas" #canvasHost></div>
        <div class="tf__hud"><span>drag to orbit · scroll to zoom</span></div>
      </div>
      <div class="tf__panel">
        <div class="tf__panel-head">
          <span class="tf__title">Frame tree</span>
          <button type="button" (click)="animate = !animate" class="tf__btn">
            <i class="fas" [ngClass]="animate ? 'fa-pause' : 'fa-play'"></i>
            {{ animate ? 'pause' : 'play' }}
          </button>
        </div>
        <pre class="tf__tree">{{ treeText }}</pre>
        <p class="tf__note">
          Each frame is positioned relative to its parent. To find a leaf in the world frame, multiply
          transforms along the chain: <code>T_world_camera = T_world_base · T_base_arm · T_arm_camera</code>.
          ROS 2's tf2 library does this lookup for you with <code>tf2_ros::Buffer::lookupTransform()</code>.
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .tf {
      display: grid; grid-template-columns: 1fr; gap: 1rem;
      background: rgba(15,23,42,0.55);
      border: 1px solid rgba(148,163,184,0.15);
      border-radius: 16px; padding: 1rem;
      backdrop-filter: blur(6px);
    }
    @media (min-width: 900px) { .tf { grid-template-columns: 1.5fr 1fr; gap: 1.25rem; padding: 1.25rem; } }
    .tf__stage {
      position: relative; width: 100%; aspect-ratio: 4 / 3;
      border-radius: 12px; overflow: hidden;
      background: radial-gradient(ellipse at top, rgba(56,189,248,0.12), transparent 60%),
                  linear-gradient(180deg, #0a1320 0%, #050810 100%);
    }
    @media (min-width: 900px) { .tf__stage { aspect-ratio: auto; min-height: 420px; } }
    .tf__canvas { position: absolute; inset: 0; }
    .tf__canvas canvas { display: block; }
    .tf__hud {
      position: absolute; bottom: 8px; left: 12px;
      font-size: 0.7rem; color: #94a3b8; pointer-events: none;
    }
    .tf__panel { display: flex; flex-direction: column; gap: 0.7rem; }
    .tf__panel-head {
      display: flex; justify-content: space-between; align-items: center;
    }
    .tf__title {
      font-size: 0.78rem; font-weight: 600; color: #38bdf8;
      text-transform: uppercase; letter-spacing: 0.12em;
    }
    .tf__btn {
      display: inline-flex; align-items: center; gap: 0.45rem;
      font-size: 0.74rem; color: #cbd5e1;
      background: rgba(8,11,20,0.6);
      border: 1px solid rgba(148,163,184,0.22);
      border-radius: 999px; padding: 0.4rem 0.85rem;
      cursor: pointer; font-family: inherit;
    }
    .tf__btn:hover { color: #38bdf8; border-color: rgba(56,189,248,0.45); }
    .tf__tree {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem; color: #cbd5e1;
      background: rgba(8,11,20,0.5);
      border: 1px solid rgba(148,163,184,0.12);
      border-radius: 8px; padding: 0.7rem 0.9rem;
      margin: 0; line-height: 1.6;
      white-space: pre;
    }
    .tf__note { margin: 0; color: #94a3b8; font-size: 0.78rem; line-height: 1.5; }
    .tf__note code {
      font-family: 'JetBrains Mono', monospace; color: #38bdf8;
      background: rgba(56,189,248,0.1); padding: 0.05rem 0.35rem; border-radius: 4px;
    }
  `]
})
export class TfTreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;

  animate = true;

  private frames: FrameDef[] = [
    { name: 'world',          parent: null,        pos: [0, 0, 0],     euler: [0, 0, 0] },
    { name: 'base_link',      parent: 'world',     pos: [0.5, 0, 0],   euler: [0, 0, 0] },
    { name: 'lidar_link',     parent: 'base_link', pos: [0, 0.55, 0],  euler: [0, 0, 0] },
    { name: 'arm_base',       parent: 'base_link', pos: [0.4, 0.2, 0], euler: [0, 0, 0] },
    { name: 'arm_tip',        parent: 'arm_base',  pos: [0.7, 0, 0],   euler: [0, 0, 0] },
    { name: 'camera_link',    parent: 'arm_tip',   pos: [0.15, 0, 0.1],euler: [0, -Math.PI / 6, 0] }
  ];

  treeText = '';

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private rafId?: number;
  private resizeObs?: ResizeObserver;
  private frameGroups = new Map<string, THREE.Group>();
  private linkLines: THREE.Line[] = [];
  private t = 0;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => this.init());
    this.buildTreeText();
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

  private buildTreeText() {
    const lines: string[] = [];
    const printChildren = (parent: string | null, depth: number) => {
      const kids = this.frames.filter(f => f.parent === parent);
      for (const k of kids) {
        const indent = '  '.repeat(depth);
        const arrow = depth === 0 ? '' : '└─ ';
        lines.push(`${indent}${arrow}${k.name}`);
        printChildren(k.name, depth + 1);
      }
    };
    printChildren(null, 0);
    this.treeText = lines.join('\n');
  }

  private init() {
    const container = this.host.nativeElement;
    const w = container.clientWidth || 480;
    const h = container.clientHeight || 360;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 50);
    this.camera.position.set(2.4, 1.6, 2.6);
    this.camera.lookAt(0.7, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.7, 0.4, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Lights (we use unlit materials but keep ambient for any future)
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(amb);

    // Ground grid
    const grid = new THREE.GridHelper(6, 12, 0x334155, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    this.scene.add(grid);

    // Build frame triads
    for (const f of this.frames) {
      const g = new THREE.Group();
      g.add(this.makeTriad(0.18));
      // Label sprite
      g.add(this.makeLabel(f.name));
      this.frameGroups.set(f.name, g);
      this.scene.add(g);
    }

    // Initial pose update + lines
    this.updatePoses(0);

    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(container);
    this.lastTs = performance.now();
    this.tick(this.lastTs);
  }

  private fit() {
    if (!this.renderer || !this.camera) return;
    const c = this.host.nativeElement;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private makeTriad(len: number): THREE.Object3D {
    const grp = new THREE.Group();
    const make = (color: number, dir: THREE.Vector3) => {
      const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        dir.clone().multiplyScalar(len)
      ]);
      const line = new THREE.Line(geo, mat);
      grp.add(line);
      // Tip dot
      const sph = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 12, 12),
        new THREE.MeshBasicMaterial({ color })
      );
      sph.position.copy(dir.clone().multiplyScalar(len));
      grp.add(sph);
    };
    make(0xfb7185, new THREE.Vector3(1, 0, 0)); // X red
    make(0x34d399, new THREE.Vector3(0, 1, 0)); // Y green
    make(0x38bdf8, new THREE.Vector3(0, 0, 1)); // Z blue
    return grp;
  }

  private makeLabel(text: string): THREE.Sprite {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const cctx = cv.getContext('2d')!;
    cctx.fillStyle = 'rgba(15,23,42,0.7)';
    cctx.fillRect(0, 0, 256, 64);
    cctx.fillStyle = '#cbd5e1';
    cctx.font = '24px JetBrains Mono, monospace';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.position.set(0, 0.22, 0);
    sp.scale.set(0.45, 0.11, 1);
    return sp;
  }

  private worldOf(name: string, t: number): { pos: THREE.Vector3; quat: THREE.Quaternion } {
    const f = this.frames.find(ff => ff.name === name)!;
    let pos = new THREE.Vector3(...f.pos);
    let quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...f.euler));
    if (f.name === 'arm_tip') {
      const swing = Math.sin(t * 0.8) * 0.6;
      quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, swing)));
    }
    if (f.name === 'arm_base') {
      const yaw = Math.sin(t * 0.5) * 0.4;
      quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)));
    }
    if (f.parent) {
      const parent = this.worldOf(f.parent, t);
      pos.applyQuaternion(parent.quat).add(parent.pos);
      quat.premultiply(parent.quat);
    }
    return { pos, quat };
  }

  private updatePoses(t: number) {
    for (const f of this.frames) {
      const w = this.worldOf(f.name, t);
      const g = this.frameGroups.get(f.name)!;
      g.position.copy(w.pos);
      g.quaternion.copy(w.quat);
    }
    // Rebuild parent-child connecting lines
    for (const l of this.linkLines) {
      this.scene!.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    }
    this.linkLines = [];
    for (const f of this.frames) {
      if (!f.parent) continue;
      const a = this.worldOf(f.parent, t).pos;
      const b = this.worldOf(f.name, t).pos;
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      const mat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
      const line = new THREE.Line(geo, mat);
      this.scene!.add(line);
      this.linkLines.push(line);
    }
  }

  private tick = (now: number) => {
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (this.animate) this.t += dt;
    this.updatePoses(this.t);
    this.controls?.update();
    this.renderer?.render(this.scene!, this.camera!);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
