import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-cascade-pid',
  template: `
    <learn-widget-shell title="Cascade PID — drone attitude"
                        subtitle="A drone uses nested loops: outer position controller commands a desired angle; middle attitude controller commands a desired body rate; inner rate loop drives motors. Tuning starts at the inner loop and works outward — invert this and the system fights itself."
                        accent="#fbbf24"
                        [ratio]="0.7"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="cp-controls">
        <learn-slider label="Position Kp" [min]="0.5" [max]="6.0" [step]="0.1" [value]="kpPos" (valueChange)="kpPos = $event"></learn-slider>
        <learn-slider label="Attitude Kp" [min]="2" [max]="20" [step]="0.5" [value]="kpAtt" (valueChange)="kpAtt = $event"></learn-slider>
        <learn-slider label="Rate Kp" [min]="0.05" [max]="0.6" [step]="0.01" [value]="kpRate" (valueChange)="kpRate = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.cp-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class CascadePidComponent {
  kpPos = 2.0;
  kpAtt = 8.0;
  kpRate = 0.18;
  paused = false;

  // State: x position, vx, theta (roll), omega (rate)
  private x = -2;
  private vx = 0;
  private theta = 0;
  private omega = 0;
  private target = 2;
  private switchT = 0;

  private posHist: number[] = [];
  private attHist: number[] = [];
  private rateHist: number[] = [];
  private targetHist: number[] = [];
  private maxHist = 280;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  reset() {
    this.x = -2; this.vx = 0; this.theta = 0; this.omega = 0;
    this.target = 2; this.switchT = 0;
    this.posHist = []; this.attHist = []; this.rateHist = []; this.targetHist = [];
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = (now: number) => {
    const dt = Math.min(0.04, (now - this.lastTs) / 1000);
    this.lastTs = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    this.switchT += dt;
    if (this.switchT > 5) { this.target = -this.target; this.switchT = 0; }

    // Cascade
    const posErr = this.target - this.x;
    const desiredAngle = Math.max(-0.5, Math.min(0.5, this.kpPos * posErr - 1.4 * this.vx));
    const attErr = desiredAngle - this.theta;
    const desiredRate = Math.max(-4, Math.min(4, this.kpAtt * attErr));
    const rateErr = desiredRate - this.omega;
    const torque = Math.max(-2, Math.min(2, this.kpRate * rateErr * 10));
    // Dynamics: pendulum-like + drag
    this.omega += (torque - 0.3 * this.omega) * dt * 5;
    this.theta += this.omega * dt;
    // Horizontal force from tilt
    const a = 9.81 * Math.sin(this.theta) - 0.5 * this.vx;
    this.vx += a * dt;
    this.x += this.vx * dt;
    // Bounds
    if (this.x < -4) { this.x = -4; this.vx = Math.max(0, this.vx); }
    if (this.x > 4) { this.x = 4; this.vx = Math.min(0, this.vx); }

    this.posHist.push(this.x);
    this.attHist.push(this.theta);
    this.rateHist.push(this.omega);
    this.targetHist.push(this.target);
    if (this.posHist.length > this.maxHist) {
      this.posHist.shift(); this.attHist.shift(); this.rateHist.shift(); this.targetHist.shift();
    }
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Drone visualization (top half)
    const droneH = H * 0.4;
    const droneCx = W / 2;
    const droneCy = droneH / 2;
    const xScale = W / 10;

    // Target marker
    ctx.strokeStyle = 'rgba(52,211,153,0.6)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    const tx = droneCx + this.target * xScale;
    ctx.moveTo(tx, 10 * dpr); ctx.lineTo(tx, droneH - 10 * dpr);
    ctx.stroke();
    ctx.setLineDash([]);

    // Drone body
    const dx = droneCx + this.x * xScale;
    const dy = droneCy;
    const armLen = 30 * dpr;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(this.theta);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4 * dpr;
    ctx.beginPath();
    ctx.moveTo(-armLen, 0); ctx.lineTo(armLen, 0);
    ctx.stroke();
    [[-armLen, 0], [armLen, 0]].forEach(([x, y]) => {
      ctx.fillStyle = '#fb7185';
      ctx.beginPath(); ctx.arc(x, y, 6 * dpr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, 7 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Plot area (bottom)
    const plotT = droneH;
    const plotH = H - droneH - 30 * dpr;
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    for (let g = 0; g <= 4; g++) {
      const y = plotT + (plotH * g) / 4;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();

    const drawTrace = (data: number[], color: string, range: number) => {
      if (data.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (i / Math.max(this.maxHist - 1, 1)) * W;
        const y = plotT + plotH / 2 - (data[i] / range) * (plotH / 2 - 4 * dpr);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawTrace(this.targetHist, 'rgba(52,211,153,0.5)', 4);
    drawTrace(this.posHist, '#fbbf24', 4);
    drawTrace(this.attHist, '#a78bfa', 0.6);
    drawTrace(this.rateHist, '#fb7185', 5);

    // Legend
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    const items: [string, string][] = [
      ['target', 'rgba(52,211,153,0.7)'],
      ['x (m)', '#fbbf24'],
      ['θ (rad)', '#a78bfa'],
      ['ω (rad/s)', '#fb7185']
    ];
    let lx = 12 * dpr;
    items.forEach(([label, color]) => {
      ctx.fillStyle = color;
      ctx.fillRect(lx, plotT + plotH + 8 * dpr, 10 * dpr, 3 * dpr);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(label, lx + 14 * dpr, plotT + plotH + 13 * dpr);
      lx += ctx.measureText(label).width + 36 * dpr;
    });
  }
}
