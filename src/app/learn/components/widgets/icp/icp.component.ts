import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-icp',
  template: `
    <learn-widget-shell title="ICP — iterative closest point"
                        subtitle="Two scans of the same scene, slightly misaligned. Each step: find nearest neighbours, compute the rigid transform that minimises sum-of-squared distances, apply it. Watch the green source cloud snap onto the blue target."
                        accent="#38bdf8"
                        [ratio]="0.65"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="icp-controls">
        <learn-presets [presets]="shapes" [active]="shape" (select)="setShape($any($event))"></learn-presets>
        <learn-slider label="Initial misalignment (deg)" [min]="0" [max]="60" [step]="1" [value]="initRot" (valueChange)="setInitRot($event)"></learn-slider>
        <learn-slider label="Step speed" [min]="0.05" [max]="1.0" [step]="0.05" [value]="stepSpeed" (valueChange)="stepSpeed = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.icp-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class IcpComponent {
  shape: 'L' | 'circle' | 'cross' = 'L';
  initRot = 25;
  stepSpeed = 0.4;
  paused = false;

  shapes = [
    { id: 'L', label: 'L-shape' },
    { id: 'circle', label: 'Arc' },
    { id: 'cross', label: 'Cross' }
  ];

  private target: { x: number; y: number }[] = [];
  private source: { x: number; y: number }[] = [];
  private iter = 0;
  private err = 0;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;
  private elapsed = 0;

  constructor(private zone: NgZone) {}

  setShape(s: string) { this.shape = s as any; this.reset(); }
  setInitRot(v: number) { this.initRot = v; this.reset(); }

  reset() {
    this.target = this.makeShape();
    const c = Math.cos(this.initRot * Math.PI / 180);
    const s = Math.sin(this.initRot * Math.PI / 180);
    this.source = this.target.map(p => ({
      x: p.x * c - p.y * s + 0.6,
      y: p.x * s + p.y * c - 0.4
    }));
    this.iter = 0;
    this.err = this.computeError();
    this.elapsed = 0;
  }

  private makeShape(): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    if (this.shape === 'L') {
      for (let i = 0; i < 30; i++) pts.push({ x: -2 + (i / 29) * 4, y: -1.2 });
      for (let i = 0; i < 20; i++) pts.push({ x: -2, y: -1.2 + (i / 19) * 2.5 });
    } else if (this.shape === 'circle') {
      for (let i = 0; i < 50; i++) {
        const a = (i / 50) * Math.PI * 1.4;
        pts.push({ x: 2 * Math.cos(a), y: 2 * Math.sin(a) });
      }
    } else {
      for (let i = 0; i < 30; i++) pts.push({ x: -1.8 + (i / 29) * 3.6, y: 0 });
      for (let i = 0; i < 30; i++) pts.push({ x: 0, y: -1.8 + (i / 29) * 3.6 });
    }
    return pts;
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.reset();
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = (now: number) => {
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (!this.paused) {
      this.elapsed += dt;
      const interval = 1.2 - this.stepSpeed; // smaller = faster
      if (this.elapsed > interval && this.err > 0.005) {
        this.elapsed = 0;
        this.icpStep();
      }
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private icpStep() {
    // Find nearest neighbour for each source point
    const pairs: { sp: { x: number; y: number }, tp: { x: number; y: number } }[] = [];
    for (const sp of this.source) {
      let best = this.target[0];
      let bestD = Infinity;
      for (const tp of this.target) {
        const d = (tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2;
        if (d < bestD) { bestD = d; best = tp; }
      }
      pairs.push({ sp, tp: best });
    }
    // Centroids
    const sCx = pairs.reduce((a, p) => a + p.sp.x, 0) / pairs.length;
    const sCy = pairs.reduce((a, p) => a + p.sp.y, 0) / pairs.length;
    const tCx = pairs.reduce((a, p) => a + p.tp.x, 0) / pairs.length;
    const tCy = pairs.reduce((a, p) => a + p.tp.y, 0) / pairs.length;
    // 2D rotation via SVD-equivalent
    let sxx = 0, sxy = 0, syx = 0, syy = 0;
    for (const p of pairs) {
      const sx = p.sp.x - sCx, sy = p.sp.y - sCy;
      const tx = p.tp.x - tCx, ty = p.tp.y - tCy;
      sxx += sx * tx; sxy += sx * ty;
      syx += sy * tx; syy += sy * ty;
    }
    const angle = Math.atan2(sxy - syx, sxx + syy);
    const c = Math.cos(angle), s = Math.sin(angle);
    const tx = tCx - (c * sCx - s * sCy);
    const ty = tCy - (s * sCx + c * sCy);
    this.source = this.source.map(p => ({
      x: c * p.x - s * p.y + tx,
      y: s * p.x + c * p.y + ty
    }));
    this.iter++;
    this.err = this.computeError();
  }

  private computeError() {
    let e = 0;
    for (const sp of this.source) {
      let bd = Infinity;
      for (const tp of this.target) {
        const d = (tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2;
        if (d < bd) bd = d;
      }
      e += bd;
    }
    return Math.sqrt(e / this.source.length);
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) / 8;

    // Target (blue)
    ctx.fillStyle = '#38bdf8';
    for (const p of this.target) {
      ctx.beginPath();
      ctx.arc(cx + p.x * scale, cy - p.y * scale, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Correspondences
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    for (const sp of this.source) {
      let best = this.target[0]; let bd = Infinity;
      for (const tp of this.target) {
        const d = (tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2;
        if (d < bd) { bd = d; best = tp; }
      }
      ctx.moveTo(cx + sp.x * scale, cy - sp.y * scale);
      ctx.lineTo(cx + best.x * scale, cy - best.y * scale);
    }
    ctx.stroke();

    // Source (green)
    ctx.fillStyle = '#34d399';
    for (const p of this.source) {
      ctx.beginPath();
      ctx.arc(cx + p.x * scale, cy - p.y * scale, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${11 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`iter ${this.iter}   rmse ${this.err.toFixed(3)}`, 12 * dpr, 18 * dpr);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('blue: target  green: source', 12 * dpr, H - 12 * dpr);
  }
}
