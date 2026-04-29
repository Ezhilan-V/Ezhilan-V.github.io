import { Component, NgZone, OnDestroy } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-force-closure',
  template: `
    <learn-widget-shell title="Force closure grasp"
                        subtitle="Drag contact points around the object outline. Each contact's friction cone (yellow wedge) defines feasible push directions. The grasp achieves force closure when the cones positively span ℝ³ in 2D (fx, fy, τ) — i.e. they can resist any disturbance."
                        accent="#a78bfa"
                        [ratio]="0.7"
                        [showPause]="false"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (resetClick)="reset()">
      <div class="fc-controls">
        <learn-presets [presets]="shapes" [active]="shape" (select)="setShape($any($event))"></learn-presets>
        <learn-slider label="Contacts" [min]="2" [max]="4" [step]="1" [value]="numContacts" (valueChange)="setNumContacts($event)"></learn-slider>
        <learn-slider label="Friction μ" [min]="0.1" [max]="1.2" [step]="0.05" [value]="mu" (valueChange)="mu = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.fc-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class ForceClosureComponent implements OnDestroy {
  shape: 'circle' | 'square' | 'oval' = 'circle';
  numContacts = 3;
  mu = 0.5;

  shapes = [
    { id: 'circle', label: 'Disc' },
    { id: 'square', label: 'Square' },
    { id: 'oval', label: 'Oval' }
  ];

  private contacts: number[] = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
  private dragging = -1;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;

  constructor(private zone: NgZone) {}

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.detachListeners();
  }

  setShape(s: string) { this.shape = s as any; }
  setNumContacts(n: number) {
    this.numContacts = n;
    this.contacts = [];
    for (let i = 0; i < n; i++) this.contacts.push((i / n) * Math.PI * 2);
  }

  reset() {
    this.contacts = [];
    for (let i = 0; i < this.numContacts; i++) this.contacts.push((i / this.numContacts) * Math.PI * 2);
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.canvas = e.canvas;
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    this.zone.runOutsideAngular(() => this.tick());
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private detachListeners() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
  }

  private localPoint(ev: PointerEvent) {
    const rect = this.canvas!.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * this.dpr,
      y: (ev.clientY - rect.top) * this.dpr
    };
  }

  private onDown = (ev: PointerEvent) => {
    if (!this.canvas) return;
    const p = this.localPoint(ev);
    const { cx, cy, scale } = this.viewportInfo();
    let best = -1, bestD = 30 * this.dpr;
    for (let i = 0; i < this.contacts.length; i++) {
      const cp = this.shapePoint(this.contacts[i]);
      const px = cx + cp.x * scale, py = cy - cp.y * scale;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) { bestD = d; best = i; }
    }
    this.dragging = best;
    if (best >= 0) this.canvas.setPointerCapture(ev.pointerId);
  };
  private onMove = (ev: PointerEvent) => {
    if (this.dragging < 0) return;
    const p = this.localPoint(ev);
    const { cx, cy, scale } = this.viewportInfo();
    const wx = (p.x - cx) / scale;
    const wy = -(p.y - cy) / scale;
    this.contacts[this.dragging] = this.tFromPoint(wx, wy);
  };
  private onUp = (_ev: PointerEvent) => { this.dragging = -1; };

  private viewportInfo() {
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr;
    return { cx: W / 2, cy: H / 2, scale: Math.min(W, H) / 4.2 };
  }

  private shapePoint(t: number): { x: number; y: number; nx: number; ny: number } {
    if (this.shape === 'circle') {
      return { x: 1.4 * Math.cos(t), y: 1.4 * Math.sin(t), nx: -Math.cos(t), ny: -Math.sin(t) };
    } else if (this.shape === 'oval') {
      const a = 1.7, b = 1.0;
      const x = a * Math.cos(t), y = b * Math.sin(t);
      // outward normal of ellipse: (x/a^2, y/b^2) normalised, then negate for inward
      let nx = x / (a * a), ny = y / (b * b);
      const n = Math.hypot(nx, ny);
      nx /= n; ny /= n;
      return { x, y, nx: -nx, ny: -ny };
    } else {
      const u = (t / (Math.PI * 2)) * 4;
      const seg = Math.floor(u) % 4;
      const f = u - Math.floor(u);
      const s = 1.4;
      let x = 0, y = 0, nx = 0, ny = 0;
      if (seg === 0) { x = -s + f * 2 * s; y = -s; nx = 0; ny = 1; }
      else if (seg === 1) { x = s; y = -s + f * 2 * s; nx = -1; ny = 0; }
      else if (seg === 2) { x = s - f * 2 * s; y = s; nx = 0; ny = -1; }
      else { x = -s; y = s - f * 2 * s; nx = 1; ny = 0; }
      return { x, y, nx, ny };
    }
  }

  private tFromPoint(wx: number, wy: number) {
    let t = Math.atan2(wy, wx);
    if (t < 0) t += Math.PI * 2;
    return t;
  }

  private hasForceClosure(): boolean {
    const wrenches: number[][] = [];
    const halfAngle = Math.atan(this.mu);
    for (const t of this.contacts) {
      const p = this.shapePoint(t);
      for (const sign of [1, -1]) {
        const a = Math.atan2(p.ny, p.nx) + sign * halfAngle;
        const fx = Math.cos(a), fy = Math.sin(a);
        const tau = p.x * fy - p.y * fx;
        wrenches.push([fx, fy, tau]);
      }
    }
    if (wrenches.length < 3) return false;
    const dim = (axis: number) => wrenches.some(w => w[axis] > 0.05) && wrenches.some(w => w[axis] < -0.05);
    if (!dim(0) || !dim(1) || !dim(2)) return false;
    let maxDet = 0;
    for (let i = 0; i < wrenches.length; i++)
      for (let j = i + 1; j < wrenches.length; j++)
        for (let k = j + 1; k < wrenches.length; k++) {
          const a = wrenches[i], b = wrenches[j], c = wrenches[k];
          const det = a[0] * (b[1] * c[2] - b[2] * c[1])
                    - a[1] * (b[0] * c[2] - b[2] * c[0])
                    + a[2] * (b[0] * c[1] - b[1] * c[0]);
          if (Math.abs(det) > maxDet) maxDet = Math.abs(det);
        }
    return maxDet > 0.05;
  }

  private tick = () => {
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const { cx, cy, scale } = this.viewportInfo();

    ctx.fillStyle = 'rgba(56,189,248,0.18)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.02) {
      const p = this.shapePoint(t);
      const x = cx + p.x * scale, y = cy - p.y * scale;
      t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const halfAngle = Math.atan(this.mu);
    const coneLen = 1.0 * scale;
    for (const t of this.contacts) {
      const p = this.shapePoint(t);
      const px = cx + p.x * scale, py = cy - p.y * scale;
      const baseA = Math.atan2(-p.ny, p.nx);
      ctx.fillStyle = 'rgba(251,191,36,0.22)';
      ctx.strokeStyle = 'rgba(251,191,36,0.7)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(baseA - halfAngle) * coneLen, py + Math.sin(baseA - halfAngle) * coneLen);
      ctx.lineTo(px + Math.cos(baseA + halfAngle) * coneLen, py + Math.sin(baseA + halfAngle) * coneLen);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#a78bfa';
    for (const t of this.contacts) {
      const p = this.shapePoint(t);
      const px = cx + p.x * scale, py = cy - p.y * scale;
      ctx.beginPath();
      ctx.arc(px, py, 7 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    const closed = this.hasForceClosure();
    ctx.fillStyle = closed ? '#34d399' : '#fb7185';
    ctx.font = `${12 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(closed ? '✓ FORCE CLOSURE' : '✗ NO FORCE CLOSURE', 12 * dpr, 20 * dpr);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`μ=${this.mu.toFixed(2)}  ${this.contacts.length} contacts`, 12 * dpr, 36 * dpr);
    ctx.fillText('drag dots to move contacts', 12 * dpr, H - 12 * dpr);
  }
}
