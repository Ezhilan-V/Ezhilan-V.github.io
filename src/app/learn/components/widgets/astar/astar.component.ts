import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone,
  OnDestroy, ViewChild, HostListener
} from '@angular/core';

interface Node {
  idx: number;
  g: number;
  h: number;
  f: number;
  parent: number;
}

@Component({
  standalone: false,
  selector: 'learn-astar',
  templateUrl: './astar.component.html',
  styleUrls: ['./astar.component.scss']
})
export class AstarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  cols = 28;
  rows = 16;
  walls!: Uint8Array;
  start = 0;
  goal = 0;

  speed = 50;          // ms per step
  running = false;
  found = false;
  exhausted = false;
  steps = 0;
  pathLen = 0;

  private open = new Map<number, Node>();
  private closed = new Set<number>();
  private parent = new Map<number, number>();
  private gScore = new Map<number, number>();
  private path = new Set<number>();

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cellPx = 0;
  private cssW = 0;
  private cssH = 0;
  private rafId?: number;
  private lastStep = 0;
  private resizeObs?: ResizeObserver;

  private painting: 'add' | 'remove' | null = null;

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}

  // ─── lifecycle ─────────────────────────────────────

  ngAfterViewInit() {
    this.initBoard();
    this.zone.runOutsideAngular(() => {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      this.resizeObs = new ResizeObserver(() => { this.fit(); this.draw(); });
      this.resizeObs.observe(this.canvasRef.nativeElement.parentElement!);
      this.fit();
      this.draw();
    });
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
  }

  @HostListener('window:mouseup')
  onWindowMouseUp() { this.painting = null; }

  // ─── board init ────────────────────────────────────

  private initBoard() {
    this.walls = new Uint8Array(this.cols * this.rows);
    this.start = this.idx(2, Math.floor(this.rows / 2));
    this.goal  = this.idx(this.cols - 3, Math.floor(this.rows / 2));
    this.resetSearch();
    // Sprinkle a couple of walls so it isn't empty
    for (let r = 4; r < this.rows - 4; r++) this.walls[this.idx(Math.floor(this.cols / 2) - 4, r)] = 1;
    for (let r = 0; r < this.rows - 4; r++) this.walls[this.idx(Math.floor(this.cols / 2) + 4, r)] = 1;
  }

  private idx(c: number, r: number) { return r * this.cols + c; }
  private toCR(i: number) { return { c: i % this.cols, r: Math.floor(i / this.cols) }; }

  // ─── canvas sizing ─────────────────────────────────

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = cv.parentElement!.clientWidth;
    this.cellPx = Math.max(Math.floor(w / this.cols), 14);
    this.cssW = this.cellPx * this.cols;
    this.cssH = this.cellPx * this.rows;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = this.cssW * this.dpr;
    cv.height = this.cssH * this.dpr;
    cv.style.width = this.cssW + 'px';
    cv.style.height = this.cssH + 'px';
  }

  // ─── pointer handling ──────────────────────────────

  onPointerDown(ev: PointerEvent) {
    const cell = this.cellAt(ev.offsetX, ev.offsetY);
    if (cell == null) return;
    if (this.running) return;
    if (cell === this.start || cell === this.goal) return;

    this.painting = this.walls[cell] ? 'remove' : 'add';
    this.walls[cell] = this.painting === 'add' ? 1 : 0;
    this.resetSearch();
    this.draw();
    (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent) {
    if (!this.painting) return;
    const cell = this.cellAt(ev.offsetX, ev.offsetY);
    if (cell == null) return;
    if (cell === this.start || cell === this.goal) return;
    const want: 0 | 1 = this.painting === 'add' ? 1 : 0;
    if (this.walls[cell] !== want) {
      this.walls[cell] = want;
      this.draw();
    }
  }

  onPointerUp() { this.painting = null; }

  private cellAt(px: number, py: number): number | null {
    const c = Math.floor(px / this.cellPx);
    const r = Math.floor(py / this.cellPx);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return null;
    return this.idx(c, r);
  }

  // ─── controls ──────────────────────────────────────

  run() {
    if (this.found || this.exhausted) this.resetSearch();
    if (this.open.size === 0) this.seedSearch();
    this.running = true;
    this.lastStep = performance.now();
    this.tick(this.lastStep);
  }

  pause() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.cdr.detectChanges();
  }

  reset() {
    this.pause();
    this.resetSearch();
    this.draw();
    this.cdr.detectChanges();
  }

  clearWalls() {
    this.pause();
    this.walls.fill(0);
    this.resetSearch();
    this.draw();
    this.cdr.detectChanges();
  }

  randomWalls() {
    this.pause();
    this.walls.fill(0);
    for (let i = 0; i < this.walls.length; i++) {
      if (Math.random() < 0.22) this.walls[i] = 1;
    }
    this.walls[this.start] = 0;
    this.walls[this.goal]  = 0;
    this.resetSearch();
    this.draw();
    this.cdr.detectChanges();
  }

  setSpeed(raw: any) { this.speed = +raw; }

  private resetSearch() {
    this.open.clear();
    this.closed.clear();
    this.parent.clear();
    this.gScore.clear();
    this.path.clear();
    this.found = false;
    this.exhausted = false;
    this.steps = 0;
    this.pathLen = 0;
  }

  private seedSearch() {
    const h = this.heuristic(this.start);
    this.open.set(this.start, { idx: this.start, g: 0, h, f: h, parent: -1 });
    this.gScore.set(this.start, 0);
  }

  // ─── A* core ───────────────────────────────────────

  private heuristic(idx: number) {
    const a = this.toCR(idx);
    const b = this.toCR(this.goal);
    return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);   // Manhattan, 4-connectivity
  }

  private aStep(): boolean {
    if (!this.open.size) { this.exhausted = true; this.running = false; return false; }
    // Pick lowest f
    let best: Node | null = null;
    for (const n of this.open.values()) {
      if (!best || n.f < best.f || (n.f === best.f && n.h < best.h)) best = n;
    }
    if (!best) return false;

    if (best.idx === this.goal) {
      this.reconstruct(best.idx);
      this.found = true;
      this.running = false;
      return false;
    }

    this.open.delete(best.idx);
    this.closed.add(best.idx);
    this.parent.set(best.idx, best.parent);

    const { c, r } = this.toCR(best.idx);
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dc, dr] of NB) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
      const ni = this.idx(nc, nr);
      if (this.walls[ni]) continue;
      if (this.closed.has(ni)) continue;

      const tentG = best.g + 1;
      const existing = this.gScore.get(ni);
      if (existing != null && tentG >= existing) continue;

      this.gScore.set(ni, tentG);
      const h = this.heuristic(ni);
      this.open.set(ni, { idx: ni, g: tentG, h, f: tentG + h, parent: best.idx });
    }
    this.steps++;
    return true;
  }

  private reconstruct(endIdx: number) {
    let cur = endIdx;
    this.path.clear();
    let len = 0;
    while (cur !== -1 && cur !== this.start) {
      this.path.add(cur);
      const node = this.open.get(cur);
      const parentIdx = node ? node.parent : (this.parent.get(cur) ?? -1);
      cur = parentIdx;
      len++;
      if (len > 5000) break;
    }
    this.path.add(this.start);
    this.pathLen = len;
  }

  // ─── animation loop ────────────────────────────────

  private tick(now: number) {
    if (!this.running) return;
    const dt = now - this.lastStep;
    if (dt >= this.speed) {
      const stepsThisFrame = Math.max(1, Math.floor(dt / Math.max(this.speed, 1)));
      for (let i = 0; i < stepsThisFrame; i++) {
        if (!this.aStep()) break;
      }
      this.lastStep = now;
      this.draw();
      this.zone.run(() => {});  // refresh stats display
    }
    if (this.running) {
      this.rafId = requestAnimationFrame(t => this.tick(t));
    }
  }

  // ─── rendering ─────────────────────────────────────

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;
    const cp = this.cellPx * this.dpr;

    ctx.fillStyle = '#0a1320';
    ctx.fillRect(0, 0, W, H);

    // Cells
    for (let i = 0; i < this.walls.length; i++) {
      const { c, r } = this.toCR(i);
      const x = c * cp;
      const y = r * cp;

      let fill = '#0e1a2c';
      if (this.walls[i])           fill = '#1f2937';
      else if (i === this.start)   fill = '#34d399';
      else if (i === this.goal)    fill = '#fb7185';
      else if (this.path.has(i))   fill = '#fbbf24';
      else if (this.closed.has(i)) fill = 'rgba(167, 139, 250, 0.22)';
      else if (this.open.has(i))   fill = 'rgba(56, 189, 248, 0.28)';

      ctx.fillStyle = fill;
      ctx.fillRect(x, y, cp, cp);

      // Cell border
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.strokeRect(x + 0.5, y + 0.5, cp - 1, cp - 1);
    }

    // Highlight start / goal labels
    ctx.fillStyle = '#0a1320';
    ctx.font = `bold ${Math.max(10, cp * 0.45) }px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const s = this.toCR(this.start);
    const g = this.toCR(this.goal);
    ctx.fillText('S', s.c * cp + cp / 2, s.r * cp + cp / 2);
    ctx.fillText('G', g.c * cp + cp / 2, g.r * cp + cp / 2);
  }
}
