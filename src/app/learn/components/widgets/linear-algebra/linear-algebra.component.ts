import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

interface Vec2 { x: number; y: number; }

@Component({
  standalone: false,
  selector: 'learn-linear-algebra',
  templateUrl: './linear-algebra.component.html',
  styleUrls: ['./linear-algebra.component.scss']
})
export class LinearAlgebraComponent {
  /** Two draggable vectors, in world units (1 unit = 50 px at default scale). */
  a: Vec2 = { x: 2, y: 1 };
  b: Vec2 = { x: 1, y: 1.5 };
  /** Rotation angle (degrees) applied to a only - so user can see what R * a does. */
  thetaDeg = 0;
  showSum = true;
  showRotated = true;

  /** Pixels per world unit. */
  scale = 50;

  presets = [
    { id: 'reset',    label: 'reset',          hint: 'a = (2,1), b = (1,1.5), θ = 0' },
    { id: 'orthogonal','label': 'orthogonal',  hint: 'a · b = 0' },
    { id: 'parallel', label: 'parallel',       hint: 'b is a scalar multiple of a' },
    { id: 'rotate90', label: 'rotate a by 90°','hint': 'R(90°) a swaps and negates' }
  ];

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private dragging: 'a' | 'b' | null = null;

  constructor(private zone: NgZone) {}

  // ─── widget-shell handshake ────────────────────────────────
  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    e.canvas.addEventListener('pointerdown',  this.onDown);
    e.canvas.addEventListener('pointermove',  this.onMove);
    e.canvas.addEventListener('pointerup',    this.onUp);
    e.canvas.addEventListener('pointerleave', this.onUp);
    this.draw();
  }
  onCanvasResize(e: WidgetCanvasResize) {
    this.cssW = e.cssW;
    this.cssH = e.cssH;
    this.dpr = e.dpr;
    this.draw();
  }

  // ─── presets / controls ────────────────────────────────────
  applyPreset(id: string) {
    if (id === 'reset')        { this.a = { x: 2, y: 1 };   this.b = { x: 1, y: 1.5 }; this.thetaDeg = 0; }
    else if (id === 'orthogonal') { this.a = { x: 2, y: 0 };   this.b = { x: 0, y: 1.6 }; }
    else if (id === 'parallel')   { this.a = { x: 2, y: 1 };   this.b = { x: -1, y: -0.5 }; }
    else if (id === 'rotate90')   { this.thetaDeg = 90; }
    this.draw();
  }
  setTheta(v: number) { this.thetaDeg = v; this.draw(); }

  // ─── pointer-drag for vector tips ──────────────────────────
  private onDown = (ev: PointerEvent) => {
    const p = this.toWorld(ev);
    const da = dist(p, this.a);
    const db = dist(p, this.b);
    const r = 0.4;   // world-unit hit radius
    if (Math.min(da, db) > r) return;
    this.dragging = da <= db ? 'a' : 'b';
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  };
  private onMove = (ev: PointerEvent) => {
    if (!this.dragging) return;
    const p = this.toWorld(ev);
    if (this.dragging === 'a') this.a = p;
    else this.b = p;
    this.draw();
  };
  private onUp = () => { this.dragging = null; };

  private toWorld(ev: PointerEvent): Vec2 {
    const cv = (ev.target as HTMLCanvasElement);
    const rect = cv.getBoundingClientRect();
    const cx = (ev.clientX - rect.left) - this.cssW / 2;
    const cy = (ev.clientY - rect.top)  - this.cssH / 2;
    return { x: round2(cx / this.scale), y: round2(-cy / this.scale) };
  }

  // ─── derived values shown in the panel ─────────────────────
  dot(): number { return round2(this.a.x * this.b.x + this.a.y * this.b.y); }
  cross(): number { return round2(this.a.x * this.b.y - this.a.y * this.b.x); }
  normA(): number { return round2(Math.hypot(this.a.x, this.a.y)); }
  normB(): number { return round2(Math.hypot(this.b.x, this.b.y)); }
  angleDeg(): number {
    const cos = this.dot() / (this.normA() * this.normB() || 1);
    const c = Math.max(-1, Math.min(1, cos));
    return round2(Math.acos(c) * 180 / Math.PI);
  }
  rotated(): Vec2 {
    const t = this.thetaDeg * Math.PI / 180;
    const c = Math.cos(t), s = Math.sin(t);
    return { x: round2(c * this.a.x - s * this.a.y), y: round2(s * this.a.x + c * this.a.y) };
  }
  sum(): Vec2 { return { x: round2(this.a.x + this.b.x), y: round2(this.a.y + this.b.y) }; }

  // ─── drawing ───────────────────────────────────────────────
  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;
    const dpr = this.dpr;

    // bg
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // grid
    const cx = W / 2, cy = H / 2;
    const sPx = this.scale * dpr;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    for (let x = cx % sPx; x < W; x += sPx) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = cy % sPx; y < H; y += sPx) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // axes
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();

    // sum (a + b) - rendered behind the source vectors
    if (this.showSum) {
      const s = this.sum();
      drawArrow(ctx, cx, cy, cx + s.x * sPx, cy - s.y * sPx, '#475569', 1.4 * dpr, dpr);
      // parallelogram completion lines
      ctx.setLineDash([5 * dpr, 4 * dpr]);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx + this.a.x * sPx, cy - this.a.y * sPx);
      ctx.lineTo(cx + s.x * sPx, cy - s.y * sPx);
      ctx.moveTo(cx + this.b.x * sPx, cy - this.b.y * sPx);
      ctx.lineTo(cx + s.x * sPx, cy - s.y * sPx);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // rotated a
    if (this.showRotated && Math.abs(this.thetaDeg) > 0.5) {
      const r = this.rotated();
      drawArrow(ctx, cx, cy, cx + r.x * sPx, cy - r.y * sPx, '#fbbf24', 1.8 * dpr, dpr);
      label(ctx, cx + r.x * sPx, cy - r.y * sPx, 'Ra', '#fbbf24', dpr);
    }

    // a, b
    drawArrow(ctx, cx, cy, cx + this.a.x * sPx, cy - this.a.y * sPx, '#38bdf8', 2.4 * dpr, dpr);
    drawArrow(ctx, cx, cy, cx + this.b.x * sPx, cy - this.b.y * sPx, '#a78bfa', 2.4 * dpr, dpr);
    label(ctx, cx + this.a.x * sPx, cy - this.a.y * sPx, 'a', '#38bdf8', dpr);
    label(ctx, cx + this.b.x * sPx, cy - this.b.y * sPx, 'b', '#a78bfa', dpr);

    // origin
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // tip handles (for hit-testing visualization)
    drawHandle(ctx, cx + this.a.x * sPx, cy - this.a.y * sPx, '#38bdf8', dpr);
    drawHandle(ctx, cx + this.b.x * sPx, cy - this.b.y * sPx, '#a78bfa', dpr);
  }
}

function dist(p: Vec2, q: Vec2) { return Math.hypot(p.x - q.x, p.y - q.y); }
function round2(n: number) { return Math.round(n * 100) / 100; }

function drawArrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w: number, dpr: number) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  // head
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const ah = 9 * dpr;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(ang) * ah - Math.sin(ang) * ah * 0.5,
             y1 - Math.sin(ang) * ah + Math.cos(ang) * ah * 0.5);
  ctx.lineTo(x1 - Math.cos(ang) * ah + Math.sin(ang) * ah * 0.5,
             y1 - Math.sin(ang) * ah - Math.cos(ang) * ah * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dpr: number) {
  ctx.fillStyle = '#0a1320';
  ctx.beginPath();
  ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6 * dpr;
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, dpr: number) {
  ctx.fillStyle = color;
  ctx.font = `${600} ${13 * dpr}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 8 * dpr, y - 8 * dpr);
}
