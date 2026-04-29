import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

@Component({
  standalone: false,
  selector: 'learn-costmap-inflation',
  templateUrl: './costmap-inflation.component.html',
  styleUrls: ['./costmap-inflation.component.scss']
})
export class CostmapInflationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  cols = 30;
  rows = 18;
  inflationCells = 5;        // inflation radius in cells
  decay = 0.55;              // exponential cost decay rate
  showRobot = true;

  private walls!: Uint8Array;
  private dist!: Float32Array;     // Chebyshev distance to nearest wall

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cellPx = 0;
  private cssW = 0; private cssH = 0;
  private resizeObs?: ResizeObserver;
  private painting: 'add' | 'remove' | null = null;
  private rafId?: number;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.initWalls();
    this.computeDistances();
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

  // ── controls ──

  onSlider(field: 'inflationCells' | 'decay', raw: any) {
    if (field === 'inflationCells') this.inflationCells = +raw | 0;
    else this.decay = +raw;
    this.draw();
  }

  toggleRobot() { this.showRobot = !this.showRobot; this.draw(); }

  reset() {
    this.walls = new Uint8Array(this.cols * this.rows);
    this.computeDistances();
    this.draw();
  }

  scatter() {
    this.walls = new Uint8Array(this.cols * this.rows);
    for (let i = 0; i < this.walls.length; i++) {
      if (Math.random() < 0.10) this.walls[i] = 1;
    }
    // Add a couple of obstacle clusters
    for (let k = 0; k < 3; k++) {
      const c = 4 + Math.floor(Math.random() * (this.cols - 8));
      const r = 3 + Math.floor(Math.random() * (this.rows - 6));
      const w = 2 + Math.floor(Math.random() * 4);
      const h = 2 + Math.floor(Math.random() * 3);
      for (let dr = 0; dr < h; dr++)
        for (let dc = 0; dc < w; dc++)
          if (c + dc < this.cols && r + dr < this.rows)
            this.walls[(r + dr) * this.cols + (c + dc)] = 1;
    }
    this.computeDistances();
    this.draw();
  }

  private initWalls() {
    this.walls = new Uint8Array(this.cols * this.rows);
    // Default scene: a column + a small box
    for (let r = 3; r < this.rows - 3; r++) this.walls[r * this.cols + 10] = 1;
    for (let r = 6; r < 11; r++)
      for (let c = 18; c < 23; c++)
        this.walls[r * this.cols + c] = 1;
    this.dist = new Float32Array(this.cols * this.rows);
  }

  // ── geometry / pointer ──

  onPointerDown(ev: PointerEvent) {
    const cell = this.cellAt(ev.offsetX, ev.offsetY);
    if (cell == null) return;
    this.painting = this.walls[cell] ? 'remove' : 'add';
    this.walls[cell] = this.painting === 'add' ? 1 : 0;
    this.computeDistances();
    this.draw();
    (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent) {
    if (!this.painting) return;
    const cell = this.cellAt(ev.offsetX, ev.offsetY);
    if (cell == null) return;
    const want: 0 | 1 = this.painting === 'add' ? 1 : 0;
    if (this.walls[cell] !== want) {
      this.walls[cell] = want;
      this.computeDistances();
      this.draw();
    }
  }

  onPointerUp() { this.painting = null; }

  private cellAt(px: number, py: number): number | null {
    const c = Math.floor(px / this.cellPx);
    const r = Math.floor(py / this.cellPx);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return null;
    return r * this.cols + c;
  }

  // ── distance transform (Chebyshev, multi-source BFS from all walls) ──

  private computeDistances() {
    const N = this.cols * this.rows;
    this.dist = new Float32Array(N);
    this.dist.fill(Infinity);

    type Item = { idx: number; d: number };
    const queue: Item[] = [];
    for (let i = 0; i < N; i++) {
      if (this.walls[i]) {
        this.dist[i] = 0;
        queue.push({ idx: i, d: 0 });
      }
    }
    // 8-connected BFS gives Chebyshev distance
    while (queue.length) {
      const { idx, d } = queue.shift()!;
      const c = idx % this.cols;
      const r = Math.floor(idx / this.cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nc = c + dc, nr = r + dr;
          if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
          const nidx = nr * this.cols + nc;
          const nd = d + 1;
          if (nd < this.dist[nidx]) {
            this.dist[nidx] = nd;
            queue.push({ idx: nidx, d: nd });
          }
        }
      }
    }
  }

  // ── render ──

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

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cp = this.cellPx * this.dpr;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;

    ctx.fillStyle = '#0a1320';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < this.walls.length; i++) {
      const c = i % this.cols;
      const r = Math.floor(i / this.cols);
      const x = c * cp;
      const y = r * cp;
      const d = this.dist[i];

      let fill = '#0e1a2c';
      if (this.walls[i]) {
        fill = '#1f2937';                  // lethal
      } else if (d <= this.inflationCells) {
        // Cost from 254 (close) → 0 (far) via exponential
        const cost = Math.exp(-this.decay * d);   // 1 at d=0, lower as d grows
        // Mix red (high) → orange → yellow → fade
        if (cost > 0.75)      fill = `rgba(248, 113, 113, ${0.55 * cost + 0.2})`;
        else if (cost > 0.45) fill = `rgba(251, 146, 60,  ${0.5 * cost + 0.15})`;
        else if (cost > 0.20) fill = `rgba(251, 191, 36,  ${0.45 * cost + 0.1})`;
        else                  fill = `rgba(56, 189, 248,  ${0.2 * cost + 0.05})`;
      }

      ctx.fillStyle = fill;
      ctx.fillRect(x, y, cp + 0.5, cp + 0.5);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.strokeRect(x + 0.5, y + 0.5, cp - 1, cp - 1);
    }

    // Wall outline (sharp)
    for (let i = 0; i < this.walls.length; i++) {
      if (!this.walls[i]) continue;
      const c = i % this.cols;
      const r = Math.floor(i / this.cols);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2 * this.dpr;
      ctx.strokeRect(c * cp + 0.5, r * cp + 0.5, cp - 1, cp - 1);
    }

    // Robot footprint hint
    if (this.showRobot && this.inflationCells > 0) {
      const cx = (this.cols / 2) * cp;
      const cy = (this.rows - 2) * cp;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2 * this.dpr;
      const r = this.inflationCells * cp * 0.55;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.beginPath(); ctx.arc(cx, cy, 4 * this.dpr, 0, Math.PI * 2); ctx.fill();
    }
  }
}
