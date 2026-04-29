import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const ARENA_W = 8;
const ARENA_H = 5;
const MAX_SPEED = 1.6;     // m/s
const MIN_SPEED = 0.5;

interface Boid { x: number; y: number; vx: number; vy: number; }

@Component({
  standalone: false,
  selector: 'learn-boids',
  templateUrl: './boids.component.html',
  styleUrls: ['./boids.component.scss']
})
export class BoidsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  count = 120;
  cohesion = 0.5;
  alignment = 0.6;
  separation = 1.4;
  neighborR = 1.4;
  paused = false;

  private boids: Boid[] = [];
  private predator: { x: number; y: number } | null = null;

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0; private cssH = 0;
  private rafId?: number;
  private lastTs = 0;
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

  onSlider(field: 'count' | 'cohesion' | 'alignment' | 'separation' | 'neighborR', raw: any) {
    if (field === 'count') {
      const next = +raw | 0;
      if (next > this.count) {
        for (let i = this.count; i < next; i++) this.boids.push(this.makeBoid());
      } else {
        this.boids.length = next;
      }
      this.count = next;
    } else {
      (this as any)[field] = +raw;
    }
  }

  togglePause() { this.paused = !this.paused; }
  reset() { this.scatter(); }

  setPredator(ev: PointerEvent) {
    const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width  * ARENA_W;
    const y = (ev.clientY - rect.top)  / rect.height * ARENA_H;
    this.predator = { x, y };
  }

  clearPredator() { this.predator = null; }

  applyPreset(p: 'classic' | 'tight-flock' | 'scattered' | 'lined-up') {
    const map = {
      'classic':     { cohesion: 0.5, alignment: 0.6, separation: 1.4 },
      'tight-flock': { cohesion: 1.5, alignment: 1.0, separation: 0.8 },
      'scattered':   { cohesion: 0.1, alignment: 0.1, separation: 2.5 },
      'lined-up':    { cohesion: 0.3, alignment: 2.5, separation: 1.0 }
    } as const;
    Object.assign(this, map[p]);
  }

  // ── physics ──

  private scatter() {
    this.boids = [];
    for (let i = 0; i < this.count; i++) this.boids.push(this.makeBoid());
  }

  private makeBoid(): Boid {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * ARENA_W,
      y: Math.random() * ARENA_H,
      vx: Math.cos(angle) * 1.0,
      vy: Math.sin(angle) * 1.0
    };
  }

  private update(dt: number) {
    const r = this.neighborR;
    const r2 = r * r;
    for (const b of this.boids) {
      let cx = 0, cy = 0;       // cohesion centroid
      let vxSum = 0, vySum = 0; // alignment
      let sepX = 0, sepY = 0;   // separation
      let n = 0;
      for (const o of this.boids) {
        if (o === b) continue;
        const dx = o.x - b.x, dy = o.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          cx += o.x; cy += o.y;
          vxSum += o.vx; vySum += o.vy;
          if (d2 < (r * 0.4) ** 2 && d2 > 1e-6) {
            const inv = 1 / Math.sqrt(d2);
            sepX -= dx * inv;
            sepY -= dy * inv;
          }
          n++;
        }
      }

      let ax = 0, ay = 0;
      if (n > 0) {
        cx /= n; cy /= n;
        ax += (cx - b.x) * this.cohesion;
        ay += (cy - b.y) * this.cohesion;
        vxSum /= n; vySum /= n;
        ax += (vxSum - b.vx) * this.alignment;
        ay += (vySum - b.vy) * this.alignment;
        ax += sepX * this.separation;
        ay += sepY * this.separation;
      }

      // Predator avoidance (strong push away)
      if (this.predator) {
        const dx = b.x - this.predator.x;
        const dy = b.y - this.predator.y;
        const d2 = dx * dx + dy * dy;
        const pr = 1.5;
        if (d2 < pr * pr) {
          const inv = 1 / Math.sqrt(Math.max(d2, 0.01));
          ax += dx * inv * 6;
          ay += dy * inv * 6;
        }
      }

      // Edge repel (so boids don't wall-stick when wrapping is off)
      const margin = 0.4;
      if (b.x < margin)            ax += (margin - b.x) * 4;
      if (b.x > ARENA_W - margin)  ax -= (b.x - (ARENA_W - margin)) * 4;
      if (b.y < margin)            ay += (margin - b.y) * 4;
      if (b.y > ARENA_H - margin)  ay -= (b.y - (ARENA_H - margin)) * 4;

      b.vx += ax * dt;
      b.vy += ay * dt;

      // Clamp speed
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPEED)      { b.vx = b.vx / sp * MAX_SPEED; b.vy = b.vy / sp * MAX_SPEED; }
      else if (sp < MIN_SPEED) { const k = MIN_SPEED / Math.max(sp, 1e-6); b.vx *= k; b.vy *= k; }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Wrap
      if (b.x < 0) b.x += ARENA_W; if (b.x > ARENA_W) b.x -= ARENA_W;
      if (b.y < 0) b.y += ARENA_H; if (b.y > ARENA_H) b.y -= ARENA_H;
    }
  }

  // ── loop ──

  private tick(now: number) {
    const dt = Math.min((now - this.lastTs) / 1000, 0.05);
    this.lastTs = now;
    if (!this.paused) this.update(dt);
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

    ctx.fillStyle = '#0a1320';
    ctx.fillRect(0, 0, W, H);

    // Faint grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    for (let i = 1; i < ARENA_W; i++) { ctx.moveTo(i * sx, 0); ctx.lineTo(i * sx, H); }
    for (let i = 1; i < ARENA_H; i++) { ctx.moveTo(0, i * sy); ctx.lineTo(W, i * sy); }
    ctx.stroke();

    // Predator
    if (this.predator) {
      ctx.fillStyle = 'rgba(248, 113, 113, 0.18)';
      ctx.beginPath(); ctx.arc(this.predator.x * sx, this.predator.y * sy, 1.5 * sx, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f87171';
      ctx.beginPath(); ctx.arc(this.predator.x * sx, this.predator.y * sy, 7 * this.dpr, 0, Math.PI * 2); ctx.fill();
    }

    // Boids - triangles pointing in velocity direction
    for (const b of this.boids) {
      const heading = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x * sx, b.y * sy);
      ctx.rotate(heading);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(7 * this.dpr, 0);
      ctx.lineTo(-4 * this.dpr,  3 * this.dpr);
      ctx.lineTo(-4 * this.dpr, -3 * this.dpr);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
