import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const WHEEL_BASE = 0.30;       // metres
const PIXELS_PER_M = 90;
const TRAIL_MAX = 600;

@Component({
  standalone: false,
  selector: 'learn-diff-drive',
  templateUrl: './diff-drive.component.html',
  styleUrls: ['./diff-drive.component.scss']
})
export class DiffDriveComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  vL = 0.4;   // left wheel linear velocity (m/s)
  vR = 0.6;

  x = 0; y = 0; theta = 0;
  vx = 0; wz = 0;

  paused = false;

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;
  private rafId?: number;
  private lastTs = 0;
  private trail: { x: number; y: number }[] = [];
  private resizeObs?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      this.resizeObs = new ResizeObserver(() => this.fit());
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

  // ─── controls ──────────────────────────────────────

  onSlider(field: 'vL' | 'vR', raw: any) {
    (this as any)[field] = +raw;
  }

  reset() {
    this.x = 0; this.y = 0; this.theta = 0;
    this.trail = [];
  }

  togglePause() { this.paused = !this.paused; }

  applyPreset(preset: 'forward' | 'spin' | 'arc' | 'stop') {
    const map = {
      forward: [0.5, 0.5],
      spin:    [-0.4, 0.4],
      arc:     [0.2, 0.6],
      stop:    [0, 0]
    } as const;
    [this.vL, this.vR] = map[preset];
  }

  // ─── loop ──────────────────────────────────────────

  private tick(now: number) {
    const dt = Math.min((now - this.lastTs) / 1000, 0.05);
    this.lastTs = now;

    if (!this.paused) {
      this.vx = (this.vL + this.vR) / 2;
      this.wz = (this.vR - this.vL) / WHEEL_BASE;

      this.theta += this.wz * dt;
      // Wrap to (-π, π]
      if (this.theta > Math.PI)  this.theta -= 2 * Math.PI;
      if (this.theta <= -Math.PI) this.theta += 2 * Math.PI;
      this.x += this.vx * Math.cos(this.theta) * dt;
      this.y += this.vx * Math.sin(this.theta) * dt;

      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
    } else {
      this.vx = 0; this.wz = 0;
    }

    this.draw();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  // ─── rendering ─────────────────────────────────────

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = cv.parentElement!.clientWidth;
    const h = Math.min(Math.max(w * 0.62, 280), 460);
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

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    // Camera-follow: translate so robot is at canvas centre
    const ppm = PIXELS_PER_M * this.dpr;
    ctx.translate(W / 2 - this.x * ppm, H / 2 + this.y * ppm);
    ctx.scale(1, -1);

    // Grid (1 m spacing)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    const gridSpan = 30; // metres
    for (let i = -gridSpan; i <= gridSpan; i++) {
      ctx.moveTo(i * ppm, -gridSpan * ppm);
      ctx.lineTo(i * ppm, gridSpan * ppm);
      ctx.moveTo(-gridSpan * ppm, i * ppm);
      ctx.lineTo(gridSpan * ppm, i * ppm);
    }
    ctx.stroke();

    // World origin marker
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.beginPath();
    ctx.moveTo(-10 * this.dpr, 0); ctx.lineTo(10 * this.dpr, 0);
    ctx.moveTo(0, -10 * this.dpr); ctx.lineTo(0, 10 * this.dpr);
    ctx.stroke();

    // Trail
    if (this.trail.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineWidth = 2 * this.dpr;
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1], b = this.trail[i];
        const age = i / this.trail.length;
        ctx.strokeStyle = `rgba(56, 189, 248, ${age * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(a.x * ppm, a.y * ppm);
        ctx.lineTo(b.x * ppm, b.y * ppm);
        ctx.stroke();
      }
    }

    // Robot
    const r = 0.18 * ppm;
    const rx = this.x * ppm;
    const ry = this.y * ppm;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(this.theta);

    // Body shadow
    ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
    ctx.shadowBlur = 12 * this.dpr;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 * this.dpr;
    ctx.stroke();

    // Heading arrow
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(r * 0.95, 0);
    ctx.lineTo(r * 0.45, r * 0.28);
    ctx.lineTo(r * 0.55, 0);
    ctx.lineTo(r * 0.45, -r * 0.28);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#fbbf24';
    const wheelLen = r * 0.55;
    const wheelWid = r * 0.18;
    const wheelOff = r * 0.85;
    ctx.fillRect(-wheelLen / 2, wheelOff, wheelLen, wheelWid);
    ctx.fillRect(-wheelLen / 2, -wheelOff - wheelWid, wheelLen, wheelWid);

    // Velocity vectors per wheel (visualise vL / vR)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 2 * this.dpr;
    const vScale = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, wheelOff + wheelWid / 2);
    ctx.lineTo(this.vR * ppm * vScale, wheelOff + wheelWid / 2);
    ctx.moveTo(0, -wheelOff - wheelWid / 2);
    ctx.lineTo(this.vL * ppm * vScale, -wheelOff - wheelWid / 2);
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    // HUD - draw in screen space
    ctx.fillStyle = 'rgba(8, 11, 20, 0.7)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1 * this.dpr;
    const hudW = 165 * this.dpr;
    const hudH = 64 * this.dpr;
    ctx.fillRect(W - hudW - 10 * this.dpr, 10 * this.dpr, hudW, hudH);
    ctx.strokeRect(W - hudW - 10 * this.dpr, 10 * this.dpr, hudW, hudH);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    const hx = W - hudW - 10 * this.dpr + 8 * this.dpr;
    const hy = 10 * this.dpr + 16 * this.dpr;
    ctx.fillText(`pose  (${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${(this.theta * 180 / Math.PI).toFixed(0)}°)`, hx, hy);
    ctx.fillText(`vx    ${this.vx.toFixed(2)} m/s`, hx, hy + 16 * this.dpr);
    ctx.fillText(`wz    ${this.wz.toFixed(2)} rad/s`, hx, hy + 32 * this.dpr);
  }
}
