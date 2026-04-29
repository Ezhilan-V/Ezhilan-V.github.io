import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const ARENA_W = 8;
const ARENA_H = 5;

interface Node { x: number; y: number; parent: number; }
interface Rect { x: number; y: number; w: number; h: number; }

@Component({
  standalone: false,
  selector: 'learn-rrt',
  templateUrl: './rrt.component.html',
  styleUrls: ['./rrt.component.scss']
})
export class RrtComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  stepSize = 0.4;
  goalBias = 0.10;
  speed = 4;          // iterations per frame
  running = false;

  nodes: Node[] = [];
  obstacles: Rect[] = [];
  start = { x: 0.5, y: ARENA_H / 2 };
  goal  = { x: ARENA_W - 0.5, y: ARENA_H / 2 };
  goalReachedIdx = -1;
  path: Node[] = [];
  iters = 0;

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0; private cssH = 0;
  private rafId?: number;
  private resizeObs?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.randomObstacles();
    this.reset(false);
    this.zone.runOutsideAngular(() => {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      this.resizeObs = new ResizeObserver(() => { this.fit(); this.draw(); });
      this.resizeObs.observe(this.canvasRef.nativeElement.parentElement!);
      this.fit();
      this.draw();
      this.tick();
    });
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
  }

  // ── controls ──

  onSlider(field: 'stepSize' | 'goalBias' | 'speed', raw: any) {
    if (field === 'speed') this.speed = +raw | 0;
    else (this as any)[field] = +raw;
  }

  toggleRun() {
    if (this.goalReachedIdx >= 0) this.reset(false);
    this.running = !this.running;
  }

  reset(newObstacles: boolean) {
    this.running = false;
    this.iters = 0;
    this.path = [];
    this.goalReachedIdx = -1;
    this.nodes = [{ x: this.start.x, y: this.start.y, parent: -1 }];
    if (newObstacles) this.randomObstacles();
  }

  newScene() { this.reset(true); }

  private randomObstacles() {
    this.obstacles = [];
    const want = 5;
    let tries = 0;
    while (this.obstacles.length < want && tries++ < 80) {
      const w = 0.5 + Math.random() * 1.6;
      const h = 0.5 + Math.random() * 1.6;
      const x = 1.2 + Math.random() * (ARENA_W - 2.4 - w);
      const y = 0.4 + Math.random() * (ARENA_H - 0.8 - h);
      const r = { x, y, w, h };
      // Don't cover start/goal
      if (this.pointInRect(this.start.x, this.start.y, r)) continue;
      if (this.pointInRect(this.goal.x, this.goal.y, r)) continue;
      this.obstacles.push(r);
    }
  }

  // ── geometry ──

  private pointInRect(x: number, y: number, r: Rect) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  private segHitsAny(x1: number, y1: number, x2: number, y2: number) {
    for (const r of this.obstacles) if (this.segHitsRect(x1, y1, x2, y2, r)) return true;
    return false;
  }

  private segHitsRect(x1: number, y1: number, x2: number, y2: number, r: Rect) {
    if (this.pointInRect(x1, y1, r) || this.pointInRect(x2, y2, r)) return true;
    const edges = [
      [r.x,       r.y,       r.x + r.w, r.y      ],
      [r.x + r.w, r.y,       r.x + r.w, r.y + r.h],
      [r.x + r.w, r.y + r.h, r.x,       r.y + r.h],
      [r.x,       r.y + r.h, r.x,       r.y      ]
    ];
    for (const [ex1, ey1, ex2, ey2] of edges) {
      if (this.segSeg(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
    }
    return false;
  }

  private segSeg(ax: number, ay: number, bx: number, by: number,
                  cx: number, cy: number, dx: number, dy: number) {
    const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(denom) < 1e-12) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // ── RRT step ──

  private rrtStep() {
    if (this.goalReachedIdx >= 0) return;
    // Sample
    const sample = Math.random() < this.goalBias
      ? { x: this.goal.x, y: this.goal.y }
      : { x: Math.random() * ARENA_W, y: Math.random() * ARENA_H };

    // Nearest existing node
    let nearestIdx = 0, nearestD2 = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const d2 = (n.x - sample.x) ** 2 + (n.y - sample.y) ** 2;
      if (d2 < nearestD2) { nearestD2 = d2; nearestIdx = i; }
    }
    const near = this.nodes[nearestIdx];

    // Steer toward sample by stepSize
    const d = Math.sqrt(nearestD2);
    if (d < 1e-9) return;
    const t = Math.min(1, this.stepSize / d);
    const nx = near.x + (sample.x - near.x) * t;
    const ny = near.y + (sample.y - near.y) * t;

    // Collision-free?
    if (this.segHitsAny(near.x, near.y, nx, ny)) return;

    const newIdx = this.nodes.length;
    this.nodes.push({ x: nx, y: ny, parent: nearestIdx });
    this.iters++;

    // Goal reached?
    const dGoal = Math.hypot(this.goal.x - nx, this.goal.y - ny);
    if (dGoal < this.stepSize && !this.segHitsAny(nx, ny, this.goal.x, this.goal.y)) {
      this.nodes.push({ x: this.goal.x, y: this.goal.y, parent: newIdx });
      this.goalReachedIdx = this.nodes.length - 1;
      this.reconstructPath();
      this.running = false;
    }
  }

  private reconstructPath() {
    this.path = [];
    let i = this.goalReachedIdx;
    while (i !== -1) {
      this.path.unshift(this.nodes[i]);
      i = this.nodes[i].parent;
    }
  }

  // ── loop ──

  private tick() {
    if (this.running) {
      for (let i = 0; i < this.speed; i++) {
        if (this.goalReachedIdx >= 0 || this.iters > 4000) { this.running = false; break; }
        this.rrtStep();
      }
      this.draw();
    }
    this.rafId = requestAnimationFrame(() => this.tick());
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

    // Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    for (let i = 1; i < ARENA_W; i++) { ctx.moveTo(i * sx, 0); ctx.lineTo(i * sx, H); }
    for (let i = 1; i < ARENA_H; i++) { ctx.moveTo(0, i * sy); ctx.lineTo(W, i * sy); }
    ctx.stroke();

    // Obstacles
    ctx.fillStyle = 'rgba(31, 41, 55, 0.85)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.2 * this.dpr;
    for (const r of this.obstacles) {
      ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
      ctx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
    }

    // Tree edges
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    for (let i = 1; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const p = this.nodes[n.parent];
      ctx.moveTo(p.x * sx, p.y * sy);
      ctx.lineTo(n.x * sx, n.y * sy);
    }
    ctx.stroke();

    // Tree nodes
    ctx.fillStyle = 'rgba(167, 139, 250, 0.55)';
    for (const n of this.nodes) {
      ctx.beginPath();
      ctx.arc(n.x * sx, n.y * sy, 1.6 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Path
    if (this.path.length > 1) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5 * this.dpr;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.path.length; i++) {
        const p = this.path[i];
        if (i === 0) ctx.moveTo(p.x * sx, p.y * sy);
        else ctx.lineTo(p.x * sx, p.y * sy);
      }
      ctx.stroke();
    }

    // Start + goal
    ctx.fillStyle = '#34d399';
    ctx.beginPath(); ctx.arc(this.start.x * sx, this.start.y * sy, 7 * this.dpr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fb7185';
    ctx.beginPath(); ctx.arc(this.goal.x * sx, this.goal.y * sy, 7 * this.dpr, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0a1320';
    ctx.font = `bold ${10 * this.dpr}px 'Inter', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('S', this.start.x * sx, this.start.y * sy);
    ctx.fillText('G', this.goal.x * sx, this.goal.y * sy);
  }
}
