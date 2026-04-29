import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const ARENA_W = 8;       // metres
const ARENA_H = 6;
const SENSOR_NOISE = 0.4;     // metres
const STEP_HZ = 6;            // particle filter updates / sec

interface Particle { x: number; y: number; w: number; }

@Component({
  standalone: false,
  selector: 'learn-particle-filter',
  templateUrl: './particle-filter.component.html',
  styleUrls: ['./particle-filter.component.scss']
})
export class ParticleFilterComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  N = 200;
  motionNoise = 0.08;

  paused = false;

  // True robot pose
  private rx = ARENA_W / 2;
  private ry = ARENA_H / 2;
  private rTheta = 0;     // along-path angle (used for circular motion)

  particles: Particle[] = [];
  beacons = [
    { x: 0.4,           y: 0.4 },
    { x: ARENA_W - 0.4, y: 0.4 },
    { x: 0.4,           y: ARENA_H - 0.4 },
    { x: ARENA_W - 0.4, y: ARENA_H - 0.4 }
  ];

  // Estimated pose (weighted mean) and trail
  estX = ARENA_W / 2; estY = ARENA_H / 2;
  trueTrail: { x: number; y: number }[] = [];
  estTrail:  { x: number; y: number }[] = [];

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0; private cssH = 0;
  private rafId?: number;
  private lastTs = 0;
  private nextStep = 0;
  private resizeObs?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.scatter();
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

  onSlider(field: 'N' | 'motionNoise', raw: any) {
    if (field === 'N') {
      this.N = Math.max(20, Math.min(1500, +raw | 0));
      this.scatter();
    } else {
      this.motionNoise = +raw;
    }
  }

  togglePause() { this.paused = !this.paused; }

  reset() {
    this.rx = ARENA_W / 2; this.ry = ARENA_H / 2; this.rTheta = 0;
    this.trueTrail = []; this.estTrail = [];
    this.scatter();
  }

  kidnap() {
    // Move robot to a random pose
    this.rx = 0.5 + Math.random() * (ARENA_W - 1);
    this.ry = 0.5 + Math.random() * (ARENA_H - 1);
    this.trueTrail = []; this.estTrail = [];
  }

  private scatter() {
    this.particles = [];
    for (let i = 0; i < this.N; i++) {
      this.particles.push({
        x: Math.random() * ARENA_W,
        y: Math.random() * ARENA_H,
        w: 1 / this.N
      });
    }
  }

  // ── physics + filter ──

  private gauss(std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
  }

  private moveTrueRobot() {
    // Robot follows a Lissajous-like loop
    this.rTheta += 0.015;
    const cx = ARENA_W / 2;
    const cy = ARENA_H / 2;
    const ax = (ARENA_W / 2) - 0.6;
    const ay = (ARENA_H / 2) - 0.6;
    const px = cx + ax * Math.sin(this.rTheta);
    const py = cy + ay * Math.sin(this.rTheta * 1.7);
    const dx = px - this.rx;
    const dy = py - this.ry;
    this.rx = px; this.ry = py;
    return { dx, dy };
  }

  private predictParticles(dx: number, dy: number) {
    for (const p of this.particles) {
      p.x += dx + this.gauss(this.motionNoise);
      p.y += dy + this.gauss(this.motionNoise);
      // Clamp inside arena
      if (p.x < 0) p.x = 0; if (p.x > ARENA_W) p.x = ARENA_W;
      if (p.y < 0) p.y = 0; if (p.y > ARENA_H) p.y = ARENA_H;
    }
  }

  private observe(): number[] {
    return this.beacons.map(b => {
      const d = Math.hypot(b.x - this.rx, b.y - this.ry);
      return d + this.gauss(SENSOR_NOISE);
    });
  }

  private weightParticles(meas: number[]) {
    let sum = 0;
    for (const p of this.particles) {
      let logW = 0;
      for (let i = 0; i < this.beacons.length; i++) {
        const b = this.beacons[i];
        const dPred = Math.hypot(b.x - p.x, b.y - p.y);
        const e = meas[i] - dPred;
        logW += -(e * e) / (2 * SENSOR_NOISE * SENSOR_NOISE);
      }
      p.w = Math.exp(logW);
      sum += p.w;
    }
    if (sum === 0) {
      for (const p of this.particles) p.w = 1 / this.N;
    } else {
      for (const p of this.particles) p.w /= sum;
    }
  }

  private resample() {
    // Low-variance resampling
    const M = this.particles.length;
    const next: Particle[] = [];
    const r = Math.random() * (1 / M);
    let c = this.particles[0].w;
    let i = 0;
    for (let m = 0; m < M; m++) {
      const U = r + m / M;
      while (U > c && i < M - 1) { i++; c += this.particles[i].w; }
      const src = this.particles[i];
      next.push({ x: src.x, y: src.y, w: 1 / M });
    }
    this.particles = next;
  }

  private estimate() {
    let sx = 0, sy = 0;
    for (const p of this.particles) { sx += p.x * p.w; sy += p.y * p.w; }
    this.estX = sx; this.estY = sy;
  }

  private filterStep() {
    const { dx, dy } = this.moveTrueRobot();
    this.predictParticles(dx, dy);
    const z = this.observe();
    this.weightParticles(z);
    this.resample();
    this.estimate();

    this.trueTrail.push({ x: this.rx, y: this.ry });
    this.estTrail.push({  x: this.estX, y: this.estY });
    if (this.trueTrail.length > 220) this.trueTrail.shift();
    if (this.estTrail.length > 220)  this.estTrail.shift();
  }

  // ── loop ──

  private tick(now: number) {
    const dt = now - this.lastTs;
    this.lastTs = now;
    if (!this.paused) {
      this.nextStep += dt;
      const interval = 1000 / STEP_HZ;
      while (this.nextStep >= interval) {
        this.filterStep();
        this.nextStep -= interval;
      }
    }
    this.draw();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  // ── rendering ──

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = cv.parentElement!.clientWidth;
    const h = w * (ARENA_H / ARENA_W);
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
    const sx = W / ARENA_W;
    const sy = H / ARENA_H;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid (1m)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    for (let i = 1; i < ARENA_W; i++) { ctx.moveTo(i * sx, 0); ctx.lineTo(i * sx, H); }
    for (let i = 1; i < ARENA_H; i++) { ctx.moveTo(0, i * sy); ctx.lineTo(W, i * sy); }
    ctx.stroke();

    // Border
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // Particles
    const maxW = Math.max(...this.particles.map(p => p.w));
    for (const p of this.particles) {
      const a = 0.15 + (p.w / Math.max(maxW, 1e-6)) * 0.7;
      const r = 1.4 + (p.w / Math.max(maxW, 1e-6)) * 1.8;
      ctx.fillStyle = `rgba(167, 139, 250, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, r * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // True trail (dashed grey)
    if (this.trueTrail.length > 1) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.setLineDash([3 * this.dpr, 3 * this.dpr]);
      ctx.beginPath();
      for (let i = 0; i < this.trueTrail.length; i++) {
        const p = this.trueTrail[i];
        const x = p.x * sx, y = p.y * sy;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Est trail (solid sky)
    if (this.estTrail.length > 1) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.beginPath();
      for (let i = 0; i < this.estTrail.length; i++) {
        const p = this.estTrail[i];
        const x = p.x * sx, y = p.y * sy;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Beacons
    for (const b of this.beacons) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(b.x * sx, b.y * sy, 6 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.stroke();
    }

    // True robot (cyan ring + cross)
    {
      const x = this.rx * sx, y = this.ry * sy;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.4 * this.dpr;
      ctx.beginPath();
      ctx.arc(x, y, 7 * this.dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 4 * this.dpr, y); ctx.lineTo(x + 4 * this.dpr, y);
      ctx.moveTo(x, y - 4 * this.dpr); ctx.lineTo(x, y + 4 * this.dpr);
      ctx.stroke();
    }

    // Estimate (sky filled circle)
    {
      const x = this.estX * sx, y = this.estY * sy;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 5 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.stroke();
    }
  }
}
