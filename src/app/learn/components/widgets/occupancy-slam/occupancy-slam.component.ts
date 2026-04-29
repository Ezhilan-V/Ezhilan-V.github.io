import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const ARENA_W = 8;        // metres
const ARENA_H = 6;
const RES     = 0.07;     // m per cell
const COLS    = Math.floor(ARENA_W / RES);
const ROWS    = Math.floor(ARENA_H / RES);

const L_FREE = -0.7;     // log-odds update for free
const L_OCC  =  1.0;     // log-odds update for occupied
const L_MIN  = -8;
const L_MAX  =  8;
const STEPS_HZ = 8;

interface Wall { x1: number; y1: number; x2: number; y2: number; }

@Component({
  standalone: false,
  selector: 'learn-occupancy-slam',
  templateUrl: './occupancy-slam.component.html',
  styleUrls: ['./occupancy-slam.component.scss']
})
export class OccupancySlamComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  beamCount = 90;
  lidarRange = 4.0;
  paused = false;
  showTruth = true;

  private logOdds!: Float32Array;
  private rx = 1.5;
  private ry = ARENA_H / 2;
  private rTheta = 0;
  private walls: Wall[] = [];

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0; private cssH = 0;
  private rafId?: number;
  private lastTs = 0;
  private nextStep = 0;
  private resizeObs?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.initWorld();
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

  // ── world setup ──

  private initWorld() {
    this.logOdds = new Float32Array(COLS * ROWS);
    const W = ARENA_W, H = ARENA_H;
    this.walls = [
      // outer walls
      { x1: 0, y1: 0, x2: W, y2: 0 },
      { x1: W, y1: 0, x2: W, y2: H },
      { x1: W, y1: H, x2: 0, y2: H },
      { x1: 0, y1: H, x2: 0, y2: 0 },
      // interior
      { x1: 2.5, y1: 0,    x2: 2.5, y2: 1.6 },
      { x1: 2.5, y1: 2.5,  x2: 2.5, y2: H },
      { x1: 5.5, y1: H,    x2: 5.5, y2: 4.0 },
      { x1: 5.5, y1: 2.8,  x2: 5.5, y2: 0   },
      { x1: 4.0, y1: 2.0,  x2: 4.0, y2: 4.0 },
      { x1: 4.0, y1: 4.0,  x2: 4.7, y2: 4.0 }
    ];
  }

  // ── controls ──

  onSlider(field: 'beamCount' | 'lidarRange', raw: any) {
    if (field === 'beamCount') this.beamCount = +raw | 0;
    else this.lidarRange = +raw;
  }

  togglePause() { this.paused = !this.paused; }
  toggleTruth() { this.showTruth = !this.showTruth; }
  resetMap() { this.logOdds.fill(0); }
  resetRobot() {
    this.rx = 1.5; this.ry = ARENA_H / 2; this.rTheta = 0;
    this.logOdds.fill(0);
  }

  // ── physics + map update ──

  private moveRobot() {
    this.rTheta += 0.018;
    const cx = ARENA_W / 2;
    const cy = ARENA_H / 2;
    const ax = (ARENA_W / 2) - 1.0;
    const ay = (ARENA_H / 2) - 0.8;
    this.rx = cx + ax * Math.sin(this.rTheta);
    this.ry = cy + ay * Math.sin(this.rTheta * 1.7);
  }

  private fireBeams() {
    for (let i = 0; i < this.beamCount; i++) {
      const angle = (i / this.beamCount) * Math.PI * 2;
      const { hit, hitX, hitY, distance } = this.raycast(this.rx, this.ry, angle, this.lidarRange);
      this.updateAlongBeam(this.rx, this.ry, hitX, hitY, hit && distance < this.lidarRange);
    }
  }

  private raycast(x: number, y: number, theta: number, maxR: number) {
    const dx = Math.cos(theta), dy = Math.sin(theta);
    let nearest = maxR;
    let hitX = x + dx * maxR, hitY = y + dy * maxR;
    let hit = false;
    for (const w of this.walls) {
      const t = this.raySegment(x, y, dx, dy, w.x1, w.y1, w.x2, w.y2);
      if (t != null && t > 0 && t < nearest) {
        nearest = t;
        hitX = x + dx * t;
        hitY = y + dy * t;
        hit = true;
      }
    }
    return { hit, hitX, hitY, distance: nearest };
  }

  private raySegment(ox: number, oy: number, dx: number, dy: number,
                      x1: number, y1: number, x2: number, y2: number): number | null {
    const sx = x2 - x1, sy = y2 - y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((x1 - ox) * sy - (y1 - oy) * sx) / denom;
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
    if (t < 0 || u < 0 || u > 1) return null;
    return t;
  }

  private updateAlongBeam(x0: number, y0: number, x1: number, y1: number, hit: boolean) {
    // Bresenham-like: walk in cell space along the beam, mark FREE; mark endpoint OCC if hit
    const c0 = Math.floor(x0 / RES), r0 = Math.floor(y0 / RES);
    const c1 = Math.floor(x1 / RES), r1 = Math.floor(y1 / RES);
    let c = c0, r = r0;
    const dc = c1 - c0, dr = r1 - r0;
    const stepC = Math.sign(dc), stepR = Math.sign(dr);
    const adc = Math.abs(dc), adr = Math.abs(dr);
    let err = adc - adr;
    while (true) {
      // Mark current cell FREE (skip endpoint, will mark OCC there if hit)
      if (!(c === c1 && r === r1) && c >= 0 && c < COLS && r >= 0 && r < ROWS) {
        const idx = r * COLS + c;
        const v = this.logOdds[idx] + L_FREE;
        this.logOdds[idx] = v < L_MIN ? L_MIN : v > L_MAX ? L_MAX : v;
      }
      if (c === c1 && r === r1) break;
      const e2 = err * 2;
      if (e2 > -adr) { err -= adr; c += stepC; }
      if (e2 <  adc) { err += adc; r += stepR; }
      if (Math.abs(c - c0) > 200 || Math.abs(r - r0) > 200) break;
    }
    if (hit && c1 >= 0 && c1 < COLS && r1 >= 0 && r1 < ROWS) {
      const idx = r1 * COLS + c1;
      const v = this.logOdds[idx] + L_OCC;
      this.logOdds[idx] = v < L_MIN ? L_MIN : v > L_MAX ? L_MAX : v;
    }
  }

  // ── loop ──

  private tick(now: number) {
    const dt = now - this.lastTs; this.lastTs = now;
    if (!this.paused) {
      this.nextStep += dt;
      const interval = 1000 / STEPS_HZ;
      while (this.nextStep >= interval) {
        this.moveRobot();
        this.fireBeams();
        this.nextStep -= interval;
      }
    }
    this.draw();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  // ── render ──

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
    const cellW = W / COLS;
    const cellH = H / ROWS;

    // Background
    ctx.fillStyle = '#0a1320';
    ctx.fillRect(0, 0, W, H);

    // Grid cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const lo = this.logOdds[r * COLS + c];
        if (lo === 0) continue;
        const p = 1 / (1 + Math.exp(-lo));   // probability occupied
        if (p > 0.62) {
          ctx.fillStyle = `rgba(248, 113, 113, ${0.3 + (p - 0.62) * 1.5})`;
        } else if (p < 0.38) {
          ctx.fillStyle = `rgba(56, 189, 248, ${0.05 + (0.38 - p) * 0.7})`;
        } else continue;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Truth walls (faint)
    if (this.showTruth) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.beginPath();
      for (const w of this.walls) {
        ctx.moveTo(w.x1 * sx, w.y1 * sy);
        ctx.lineTo(w.x2 * sx, w.y2 * sy);
      }
      ctx.stroke();
    }

    // Lidar beams (live)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    const sample = Math.min(this.beamCount, 60);
    for (let i = 0; i < sample; i++) {
      const idx = Math.floor((i / sample) * this.beamCount);
      const angle = (idx / this.beamCount) * Math.PI * 2;
      const { hitX, hitY } = this.raycast(this.rx, this.ry, angle, this.lidarRange);
      ctx.moveTo(this.rx * sx, this.ry * sy);
      ctx.lineTo(hitX * sx, hitY * sy);
    }
    ctx.stroke();

    // Robot
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.beginPath();
    ctx.arc(this.rx * sx, this.ry * sy, 6 * this.dpr, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}
