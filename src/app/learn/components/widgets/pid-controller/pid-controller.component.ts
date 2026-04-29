import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const HISTORY_S = 6;     // seconds shown
const DT = 1 / 60;       // physics dt
const MAX_U = 12;        // controller saturation

interface Sample { t: number; r: number; y: number; u: number; }

@Component({
  standalone: false,
  selector: 'learn-pid-controller',
  templateUrl: './pid-controller.component.html',
  styleUrls: ['./pid-controller.component.scss']
})
export class PidControllerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── PID gains ──
  Kp = 4;
  Ki = 1.5;
  Kd = 0.6;

  // ── plant: m·ÿ + c·ẏ + k·y = u  (mass-spring-damper) ──
  m = 1.0;
  c = 0.6;
  k = 1.0;

  // ── state ──
  setpoint = 1;
  paused = false;

  y  = 0;       // position
  yd = 0;       // velocity
  e_int = 0;    // integral of error
  e_prev = 0;
  u = 0;
  t = 0;

  // metrics
  overshoot = 0;
  settled = false;
  settleTime = NaN;

  history: Sample[] = [];

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;
  private rafId?: number;
  private lastTs = 0;
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

  onSlider(field: 'Kp'|'Ki'|'Kd'|'setpoint', raw: any) {
    (this as any)[field] = +raw;
    if (field === 'setpoint') this.kickStep();
  }

  applyPreset(preset: 'p' | 'pi' | 'pid' | 'aggressive') {
    const map = {
      p:          [4,   0,   0],
      pi:         [3,   2,   0],
      pid:        [4,   1.5, 0.6],
      aggressive: [10,  3,   1.5]
    } as const;
    [this.Kp, this.Ki, this.Kd] = map[preset];
    this.kickStep();
  }

  togglePause() { this.paused = !this.paused; }

  reset() {
    this.kickStep();
  }

  private kickStep() {
    this.y = 0; this.yd = 0;
    this.e_int = 0; this.e_prev = this.setpoint;
    this.u = 0; this.t = 0;
    this.history = [];
    this.overshoot = 0;
    this.settled = false;
    this.settleTime = NaN;
  }

  // ── loop ──

  private tick(now: number) {
    const dt = Math.min((now - this.lastTs) / 1000, 0.1);
    this.lastTs = now;

    if (!this.paused) {
      // Run several physics substeps per frame for stability
      const steps = Math.max(1, Math.round(dt / DT));
      for (let i = 0; i < steps; i++) this.step(DT);
    }

    this.draw();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  private step(dt: number) {
    const e = this.setpoint - this.y;
    this.e_int += e * dt;
    // Anti-windup clamp
    if (this.Ki !== 0) {
      const intLimit = MAX_U / Math.max(this.Ki, 0.001);
      if (this.e_int >  intLimit) this.e_int =  intLimit;
      if (this.e_int < -intLimit) this.e_int = -intLimit;
    }
    const e_dot = (e - this.e_prev) / dt;
    this.e_prev = e;

    let u = this.Kp * e + this.Ki * this.e_int + this.Kd * e_dot;
    if (u >  MAX_U) u =  MAX_U;
    if (u < -MAX_U) u = -MAX_U;
    this.u = u;

    // Plant: m ÿ + c ẏ + k y = u
    const ydd = (u - this.c * this.yd - this.k * this.y) / this.m;
    this.yd += ydd * dt;
    this.y  += this.yd * dt;

    this.t += dt;
    this.history.push({ t: this.t, r: this.setpoint, y: this.y, u });
    while (this.history.length && this.t - this.history[0].t > HISTORY_S) this.history.shift();

    // Metrics
    const overshootPct = ((this.y - this.setpoint) / Math.max(Math.abs(this.setpoint), 0.001)) * 100;
    if (overshootPct > this.overshoot) this.overshoot = overshootPct;
    if (!this.settled && Math.abs(e / Math.max(Math.abs(this.setpoint), 0.001)) < 0.02 && this.t > 0.2) {
      this.settled = true;
      this.settleTime = this.t;
    }
    if (Math.abs(e / Math.max(Math.abs(this.setpoint), 0.001)) > 0.02) {
      this.settled = false;
      this.settleTime = NaN;
    }
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
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Y-axis range (auto-fit response)
    const yMin = Math.min(-0.3, ...this.history.map(s => s.y), this.setpoint - 0.5);
    const yMax = Math.max(this.setpoint * 1.6 + 0.3, ...this.history.map(s => s.y));
    const yRange = yMax - yMin;
    const yMap = (v: number) => pad + (1 - (v - yMin) / yRange) * plotH;
    const xMap = (s: number) => {
      // s is timestamp; map last HISTORY_S window
      const tEnd = this.t || 0;
      const tStart = Math.max(0, tEnd - HISTORY_S);
      return pad + ((s - tStart) / HISTORY_S) * plotW;
    };

    // Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
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

    // Zero line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    ctx.moveTo(pad, yMap(0)); ctx.lineTo(pad + plotW, yMap(0));
    ctx.stroke();

    // Setpoint line
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.setLineDash([5 * this.dpr, 5 * this.dpr]);
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.beginPath();
    ctx.moveTo(pad, yMap(this.setpoint)); ctx.lineTo(pad + plotW, yMap(this.setpoint));
    ctx.stroke();
    ctx.setLineDash([]);

    // Response curve
    if (this.history.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * this.dpr;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.history.length; i++) {
        const s = this.history[i];
        const x = xMap(s.t);
        const y = yMap(s.y);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Control effort (faint)
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.beginPath();
      for (let i = 0; i < this.history.length; i++) {
        const s = this.history[i];
        const x = xMap(s.t);
        const y = yMap(s.u / MAX_U * (yMax - yMin) * 0.4);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText('time (s) →', pad + 4 * this.dpr, H - 6 * this.dpr);
    ctx.fillText('y', 4 * this.dpr, pad + 10 * this.dpr);
  }
}
