import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const STEPS_PER_SEC = 8;
const HISTORY = 80;
const Q_TRUE = 0.04;     // process noise std (the truth)
const R_TRUE = 0.55;     // measurement noise std

interface Pt { t: number; truth: number; meas: number | null; est: number; var: number; }

@Component({
  standalone: false,
  selector: 'learn-kalman-1d',
  templateUrl: './kalman-1d.component.html',
  styleUrls: ['./kalman-1d.component.scss']
})
export class Kalman1dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Tunings
  Q = 0.04;     // process variance
  R = 0.30;     // measurement variance

  paused = false;

  // True state + filter state
  private xTrue = 0;
  private xHat = 0;
  private P = 1;

  history: Pt[] = [];
  private nextStep = 0;
  private rafId?: number;
  private lastTs = 0;

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0; private cssH = 0;
  private resizeObs?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      this.resizeObs = new ResizeObserver(() => { this.fit(); this.draw(); });
      this.resizeObs.observe(this.canvasRef.nativeElement.parentElement!);
      this.fit();
      this.lastTs = performance.now();
      this.tick(this.lastTs);
    });
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
  }

  // ── controls ──

  onSlider(field: 'Q' | 'R', raw: any) { (this as any)[field] = +raw; }
  togglePause() { this.paused = !this.paused; }
  reset() {
    this.xTrue = 0; this.xHat = 0; this.P = 1;
    this.history = []; this.nextStep = 0;
  }
  applyPreset(p: 'trust-meas' | 'trust-model' | 'balanced') {
    const map = { 'trust-meas': [0.5, 0.05], 'trust-model': [0.005, 1.0], 'balanced': [0.04, 0.3] } as const;
    [this.Q, this.R] = map[p];
  }

  // ── loop ──

  private tick(now: number) {
    const dtMs = now - this.lastTs;
    if (!this.paused) {
      this.nextStep += dtMs;
      const stepInterval = 1000 / STEPS_PER_SEC;
      while (this.nextStep >= stepInterval) {
        this.kfStep();
        this.nextStep -= stepInterval;
      }
    }
    this.lastTs = now;
    this.draw();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  private gauss(std = 1) {
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
  }

  private kfStep() {
    // True dynamics: random-walk with small drift
    this.xTrue += this.gauss(Math.sqrt(Q_TRUE)) + 0.04 * Math.sin(this.history.length * 0.07);
    // Take a measurement most steps (skip occasional to show "predict only")
    const z: number | null = Math.random() < 0.85 ? this.xTrue + this.gauss(Math.sqrt(R_TRUE)) : null;

    // Predict
    // x_hat = x_hat (no control / motion model assumed)
    this.P = this.P + this.Q;

    // Update
    if (z != null) {
      const K = this.P / (this.P + this.R);
      this.xHat = this.xHat + K * (z - this.xHat);
      this.P = (1 - K) * this.P;
    }

    this.history.push({
      t: this.history.length,
      truth: this.xTrue,
      meas: z,
      est: this.xHat,
      var: this.P
    });
    while (this.history.length > HISTORY) this.history.shift();
  }

  // ── render ──

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = cv.parentElement!.clientWidth;
    const h = Math.min(Math.max(w * 0.55, 260), 380);
    this.cssW = w; this.cssH = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * this.dpr;
    cv.height = h * this.dpr;
    cv.style.height = h + 'px';
  }

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;
    const pad = 22 * this.dpr;
    const plotW = W - pad * 2;
    const plotH = H - pad * 2;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (this.history.length < 2) return;

    // Y range
    let yMin = Infinity, yMax = -Infinity;
    for (const p of this.history) {
      yMin = Math.min(yMin, p.truth, p.est, p.meas ?? p.est);
      yMax = Math.max(yMax, p.truth, p.est, p.meas ?? p.est);
    }
    yMin -= 0.4; yMax += 0.4;
    const yRange = yMax - yMin;

    const xMap = (i: number) => pad + (i / Math.max(HISTORY - 1, 1)) * plotW;
    const yMap = (v: number) => pad + (1 - (v - yMin) / yRange) * plotH;

    // Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const xv = pad + (plotW * i / 6);
      ctx.moveTo(xv, pad); ctx.lineTo(xv, pad + plotH);
    }
    for (let i = 1; i < 5; i++) {
      const yv = pad + (plotH * i / 5);
      ctx.moveTo(pad, yv); ctx.lineTo(pad + plotW, yv);
    }
    ctx.stroke();

    // Covariance band around estimate (±σ)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    for (let i = 0; i < this.history.length; i++) {
      const p = this.history[i];
      const sd = Math.sqrt(p.var);
      const x = xMap(i);
      const y = yMap(p.est + sd);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = this.history.length - 1; i >= 0; i--) {
      const p = this.history[i];
      const sd = Math.sqrt(p.var);
      ctx.lineTo(xMap(i), yMap(p.est - sd));
    }
    ctx.closePath();
    ctx.fill();

    // Truth (dashed grey)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.setLineDash([4 * this.dpr, 4 * this.dpr]);
    ctx.beginPath();
    for (let i = 0; i < this.history.length; i++) {
      const x = xMap(i);
      const y = yMap(this.history[i].truth);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Estimate (sky blue)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 * this.dpr;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < this.history.length; i++) {
      const x = xMap(i);
      const y = yMap(this.history[i].est);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Measurements (red dots)
    ctx.fillStyle = '#f87171';
    for (const p of this.history) {
      if (p.meas == null) continue;
      ctx.beginPath();
      ctx.arc(xMap(p.t - this.history[0].t), yMap(p.meas), 2.4 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Axis labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`σ = ${Math.sqrt(this.P).toFixed(2)}`, pad + 6 * this.dpr, pad + 14 * this.dpr);
    ctx.fillText('time →', W - 60 * this.dpr, H - 6 * this.dpr);
  }
}
