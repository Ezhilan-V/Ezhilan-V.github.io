import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-loop-closure',
  template: `
    <learn-widget-shell title="SLAM loop closure"
                        subtitle="A robot drives a loop. Without a fix, dead-reckoning drifts (red trajectory diverges from the true path). When the robot recognises a previously-seen place (loop closure), pose-graph optimisation snaps the trajectory back into alignment."
                        accent="#34d399"
                        [ratio]="0.7"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="lc-controls">
        <learn-slider label="Drift level" [min]="0" [max]="0.05" [step]="0.001" [value]="drift" (valueChange)="drift = $event"></learn-slider>
        <learn-slider label="Speed" [min]="0.2" [max]="2.0" [step]="0.05" [value]="speed" (valueChange)="speed = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.lc-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class LoopClosureComponent {
  drift = 0.018;
  speed = 0.8;
  paused = false;

  private truth: { x: number; y: number }[] = [];
  private estimated: { x: number; y: number }[] = [];
  private optimized: { x: number; y: number }[] | null = null;
  private t = 0;
  private closed = false;
  private flashT = 0;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  reset() {
    this.truth = []; this.estimated = []; this.optimized = null;
    this.t = 0; this.closed = false; this.flashT = 0;
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private truePoint(t: number) {
    // figure-eight-ish loop
    const x = 2 * Math.cos(t);
    const y = 1.4 * Math.sin(t * 2);
    return { x, y };
  }

  private tick = (now: number) => {
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    this.flashT = Math.max(0, this.flashT - dt);
    this.t += dt * this.speed;
    const tp = this.truePoint(this.t);
    this.truth.push(tp);

    // estimated has accumulating drift
    const driftAng = this.t * this.drift;
    const c = Math.cos(driftAng), s = Math.sin(driftAng);
    const driftScale = 1 + this.t * this.drift * 0.4;
    const ep = {
      x: (tp.x * c - tp.y * s) * driftScale,
      y: (tp.x * s + tp.y * c) * driftScale
    };
    this.estimated.push(ep);

    // Loop closure detected after t > 2π and we are near the start
    if (!this.closed && this.t > Math.PI * 2 + 0.1) {
      const startEst = this.estimated[0];
      const dx = ep.x - startEst.x;
      const dy = ep.y - startEst.y;
      // Optimisation: linearly interpolate the drift back to zero
      const N = this.estimated.length;
      this.optimized = this.estimated.map((p, i) => {
        const w = i / (N - 1);
        // pull each point back by w * mismatch (anchor start, fix end)
        return { x: p.x - w * dx, y: p.y - w * dy };
      });
      // Further: run a couple smoothing passes to better match shape
      for (let pass = 0; pass < 3; pass++) {
        const newPts = this.optimized.map((p, i) => {
          if (i === 0 || i === N - 1) return p;
          const a = this.optimized![i - 1], b = this.optimized![i + 1];
          return { x: 0.5 * p.x + 0.25 * (a.x + b.x), y: 0.5 * p.y + 0.25 * (a.y + b.y) };
        });
        this.optimized = newPts;
      }
      this.closed = true;
      this.flashT = 1.5;
    }

    if (this.t > Math.PI * 2 + 1.5) this.reset();
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) / 4.5;

    // Truth
    ctx.strokeStyle = 'rgba(56,189,248,0.5)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    this.truth.forEach((p, i) => {
      const x = cx + p.x * scale, y = cy - p.y * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Estimated (drifting)
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    this.estimated.forEach((p, i) => {
      const x = cx + p.x * scale, y = cy - p.y * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Optimized
    if (this.optimized) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5 * dpr;
      ctx.beginPath();
      this.optimized.forEach((p, i) => {
        const x = cx + p.x * scale, y = cy - p.y * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Robot dot at current estimate
    if (this.estimated.length) {
      const p = this.estimated[this.estimated.length - 1];
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(cx + p.x * scale, cy - p.y * scale, 6 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Loop closure flash
    if (this.flashT > 0 && this.estimated.length) {
      const startE = this.estimated[0];
      const lastE = this.estimated[this.estimated.length - 1];
      ctx.strokeStyle = `rgba(251,191,36,${this.flashT / 1.5})`;
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(cx + startE.x * scale, cy - startE.y * scale);
      ctx.lineTo(cx + lastE.x * scale, cy - lastE.y * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Legend
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    const items: [string, string][] = [
      ['ground truth', 'rgba(56,189,248,0.7)'],
      ['estimated (drifts)', '#fb7185']
    ];
    if (this.optimized) items.push(['after closure', '#34d399']);
    let lx = 12 * dpr;
    items.forEach(([label, color]) => {
      ctx.fillStyle = color;
      ctx.fillRect(lx, 12 * dpr, 12 * dpr, 3 * dpr);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(label, lx + 16 * dpr, 18 * dpr);
      lx += ctx.measureText(label).width + 36 * dpr;
    });

    if (this.flashT > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = `${13 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('LOOP CLOSURE — pose-graph optimised', W / 2, H - 16 * dpr);
    }
  }
}
