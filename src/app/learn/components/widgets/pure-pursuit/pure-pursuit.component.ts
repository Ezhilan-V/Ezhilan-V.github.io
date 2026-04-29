import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-pure-pursuit',
  template: `
    <learn-widget-shell title="Pure pursuit path tracking"
                        subtitle="A differential-drive robot follows a wavy reference path. The controller picks a lookahead point Ld ahead on the path and steers toward it. Larger Ld smooths the motion but cuts corners; smaller Ld tracks tightly but oscillates."
                        accent="#34d399"
                        [ratio]="0.62"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="pp-controls">
        <learn-slider label="Lookahead Ld (m)" [min]="0.4" [max]="3.0" [step]="0.05" [value]="Ld" (valueChange)="Ld = $event"></learn-slider>
        <learn-slider label="Speed (m/s)" [min]="0.5" [max]="3.0" [step]="0.1" [value]="speed" (valueChange)="speed = $event"></learn-slider>
        <learn-slider label="Path amplitude" [min]="0" [max]="2.5" [step]="0.05" [value]="amp" (valueChange)="amp = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.pp-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class PurePursuitComponent {
  Ld = 1.2;
  speed = 1.5;
  amp = 1.5;
  paused = false;

  private x = 0; private y = 0; private theta = 0;
  private trail: { x: number; y: number }[] = [];
  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;
  private wheelBase = 0.5;

  constructor(private zone: NgZone) {}

  reset() {
    this.x = 0; this.y = this.pathY(0); this.theta = 0;
    this.trail = [];
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.reset();
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private pathY(x: number) { return this.amp * Math.sin(x * 0.6); }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastTs) / 1000);
    this.lastTs = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    // Find lookahead point: scan ahead along path from robot's x
    let lx = this.x;
    let found = false;
    for (let s = 0; s < 6; s += 0.05) {
      const px = this.x + s;
      const py = this.pathY(px);
      const d = Math.hypot(px - this.x, py - this.y);
      if (d >= this.Ld) { lx = px; found = true; break; }
    }
    const ly = this.pathY(lx);
    // Transform lookahead into robot frame
    const dx = lx - this.x, dy = ly - this.y;
    const c = Math.cos(this.theta), s = Math.sin(this.theta);
    const localX = dx * c + dy * s;
    const localY = -dx * s + dy * c;
    const Ld2 = Math.max(0.01, localX * localX + localY * localY);
    const curvature = (2 * localY) / Ld2;
    const omega = curvature * this.speed;
    this.x += this.speed * Math.cos(this.theta) * dt;
    this.y += this.speed * Math.sin(this.theta) * dt;
    this.theta += omega * dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 800) this.trail.shift();
    if (this.x > 12) this.reset();
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // World-to-pixel: x in [-1, 13], y in [-3.5, 3.5]
    const xMin = -1, xMax = 13, yRange = 4;
    const pxX = (wx: number) => ((wx - xMin) / (xMax - xMin)) * W;
    const pxY = (wy: number) => H / 2 - (wy / yRange) * (H / 2);
    const scale = W / (xMax - xMin);

    // Reference path
    ctx.strokeStyle = 'rgba(56,189,248,0.55)';
    ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (let wx = xMin; wx <= xMax; wx += 0.1) {
      const x = pxX(wx), y = pxY(this.pathY(wx));
      wx === xMin ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(52,211,153,0.7)';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      this.trail.forEach((p, i) => {
        const x = pxX(p.x), y = pxY(p.y);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Lookahead point
    let lx = this.x;
    for (let s = 0; s < 6; s += 0.05) {
      const px = this.x + s;
      const py = this.pathY(px);
      const d = Math.hypot(px - this.x, py - this.y);
      if (d >= this.Ld) { lx = px; break; }
    }
    const ly = this.pathY(lx);

    // Lookahead circle
    ctx.strokeStyle = 'rgba(167,139,250,0.4)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.arc(pxX(this.x), pxY(this.y), this.Ld * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Line to lookahead
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(pxX(this.x), pxY(this.y));
    ctx.lineTo(pxX(lx), pxY(ly));
    ctx.stroke();

    // Lookahead dot
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(pxX(lx), pxY(ly), 5 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Robot (oriented triangle)
    const rx = pxX(this.x), ry = pxY(this.y);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(-this.theta); // canvas y inverted
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(12 * dpr, 0);
    ctx.lineTo(-8 * dpr, 8 * dpr);
    ctx.lineTo(-8 * dpr, -8 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Cross-track error indicator
    const cte = this.y - this.pathY(this.x);
    ctx.strokeStyle = 'rgba(251,191,36,0.6)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(pxX(this.x), pxY(this.pathY(this.x)));
    ctx.stroke();

    // HUD
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${11 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`Ld=${this.Ld.toFixed(2)}m  v=${this.speed.toFixed(1)}m/s  cte=${cte.toFixed(2)}m`,
      12 * dpr, 18 * dpr);
  }
}
