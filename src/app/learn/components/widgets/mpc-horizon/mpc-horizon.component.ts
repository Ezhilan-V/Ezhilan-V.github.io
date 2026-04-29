import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-mpc-horizon',
  template: `
    <learn-widget-shell title="MPC predictive horizon"
                        subtitle="A 1-D vehicle steers toward a goal. Each tick the controller plans N steps ahead, executes the first one, replans. Watch the horizon contract as you near the goal."
                        accent="#fb7185"
                        [ratio]="0.5"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="mpc-controls">
        <learn-slider label="Horizon (N)" unit="steps" [min]="3" [max]="40" [step]="1" [value]="N" (valueChange)="setN($event)"></learn-slider>
        <learn-slider label="Goal x" unit="m" [min]="-3" [max]="3" [step]="0.05" [value]="goal" (valueChange)="setGoal($event)"></learn-slider>
        <learn-slider label="Tracking weight Q" [min]="0.1" [max]="20" [step]="0.1" [value]="Q" (valueChange)="setQ($event)"></learn-slider>
        <learn-slider label="Effort weight R" [min]="0.01" [max]="5" [step]="0.01" [value]="R" (valueChange)="setR($event)"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.mpc-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.75rem 0.85rem; }`]
})
export class MpcHorizonComponent {
  N = 12;
  goal = 1.5;
  Q = 5;
  R = 0.2;
  paused = false;

  /** State: position x, velocity v. Action: acceleration u. */
  private x = -1.5;
  private v = 0;
  /** Cached predicted trajectory (positions over horizon). */
  private predicted: number[] = [];
  private dt = 0.08;
  private uMax = 1.5;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  setN(v: number) { this.N = Math.round(v); }
  setGoal(v: number) { this.goal = v; }
  setQ(v: number) { this.Q = v; }
  setR(v: number) { this.R = v; }

  reset() {
    this.x = -1.5; this.v = 0; this.predicted = [];
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) {
    this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr;
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.lastTs) / 1000, 0.05);
    this.lastTs = now;
    if (!this.paused) this.step(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Simple receding-horizon controller. Brute-force search over a coarse
   * grid of constant accelerations across the horizon (just for visualisation).
   * Real MPC solves a QP each tick; we cheat with a small grid so the demo
   * stays fast and the predicted trajectory is the educational point.
   */
  private step(realDt: number) {
    if (!this.ctx) return;

    // Plan over horizon: pick u from a grid that minimises Q·err² + R·u²
    const candidates = [-1.5, -1, -0.5, -0.2, 0, 0.2, 0.5, 1, 1.5];
    let bestU = 0; let bestCost = Infinity; let bestTraj: number[] = [];
    for (const u of candidates) {
      let xH = this.x, vH = this.v, cost = 0;
      const traj: number[] = [xH];
      for (let k = 0; k < this.N; k++) {
        vH = clamp(vH + u * this.dt, -2, 2);
        xH = xH + vH * this.dt;
        cost += this.Q * (xH - this.goal) ** 2 + this.R * u ** 2;
        traj.push(xH);
      }
      if (cost < bestCost) { bestCost = cost; bestU = u; bestTraj = traj; }
    }
    this.predicted = bestTraj;

    // Apply only the first action this tick (receding-horizon)
    this.v = clamp(this.v + bestU * realDt, -2, 2);
    this.x = this.x + this.v * realDt;
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a1320'); g.addColorStop(1, '#050810');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Track from -3 to +3
    const trackY = H * 0.55;
    const xTo = (m: number) => W * 0.5 + (m / 3.5) * W * 0.42;

    // Track line
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.moveTo(xTo(-3), trackY); ctx.lineTo(xTo(3), trackY); ctx.stroke();

    // Tick marks
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    for (let m = -3; m <= 3; m++) {
      ctx.beginPath(); ctx.moveTo(xTo(m), trackY - 5 * dpr); ctx.lineTo(xTo(m), trackY + 5 * dpr); ctx.stroke();
      ctx.fillText(String(m), xTo(m), trackY + 18 * dpr);
    }

    // Goal marker
    ctx.fillStyle = '#34d399';
    ctx.beginPath(); ctx.arc(xTo(this.goal), trackY, 7 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(52,211,153,0.85)';
    ctx.fillText('goal', xTo(this.goal), trackY - 14 * dpr);

    // Predicted trajectory dots (fading)
    for (let k = 0; k < this.predicted.length; k++) {
      const alpha = 1 - k / this.predicted.length;
      ctx.fillStyle = `rgba(251,113,133,${alpha * 0.85})`;
      const r = (3 + (1 - k / this.predicted.length) * 2) * dpr;
      ctx.beginPath(); ctx.arc(xTo(this.predicted[k]), trackY - 18 * dpr, r, 0, Math.PI * 2); ctx.fill();
    }
    if (this.predicted.length) {
      ctx.fillStyle = '#fb7185';
      ctx.font = `${10 * dpr}px 'Inter', sans-serif`;
      ctx.fillText(`predicted (N=${this.N})`, xTo(this.predicted[Math.floor(this.predicted.length / 2)]), trackY - 36 * dpr);
    }

    // Vehicle
    const vx = xTo(this.x);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(vx - 14 * dpr, trackY - 11 * dpr, 28 * dpr, 22 * dpr);
    ctx.strokeStyle = '#0a1320'; ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(vx - 14 * dpr, trackY - 11 * dpr, 28 * dpr, 22 * dpr);
    // Wheels
    ctx.fillStyle = '#0a1320';
    ctx.beginPath(); ctx.arc(vx - 9 * dpr, trackY + 11 * dpr, 4 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(vx + 9 * dpr, trackY + 11 * dpr, 4 * dpr, 0, Math.PI * 2); ctx.fill();

    // Status line at top
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${11 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`x = ${this.x.toFixed(2)} m   v = ${this.v.toFixed(2)} m/s   err = ${(this.goal - this.x).toFixed(2)} m`,
      14 * dpr, 18 * dpr);
  }
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
