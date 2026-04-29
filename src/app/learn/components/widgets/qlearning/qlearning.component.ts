import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const ACTIONS = [
  { name: 'up',    dr: -1, dc:  0 },
  { name: 'right', dr:  0, dc:  1 },
  { name: 'down',  dr:  1, dc:  0 },
  { name: 'left',  dr:  0, dc: -1 }
];

@Component({
  standalone: false,
  selector: 'learn-qlearning',
  templateUrl: './qlearning.component.html',
  styleUrls: ['./qlearning.component.scss']
})
export class QLearningComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  cols = 9;
  rows = 6;

  alpha = 0.20;
  gamma = 0.90;
  epsilon = 0.20;
  speed = 100;             // updates per frame

  episodes = 0;
  totalSteps = 0;
  paused = false;
  showArrows = true;

  private Q!: Float32Array;     // (cells * 4) values
  private cells!: Uint8Array;   // 0 free, 1 wall, 2 trap, 3 goal
  private start = 0;
  private goal = 0;
  private agentIdx = 0;
  private stepInEp = 0;

  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cellPx = 0;
  private cssW = 0; private cssH = 0;
  private rafId?: number;
  private resizeObs?: ResizeObserver;

  // Smooth agent rendering
  private displayCol = 0; private displayRow = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.initWorld();
    this.zone.runOutsideAngular(() => {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      this.resizeObs = new ResizeObserver(() => { this.fit(); this.draw(); });
      this.resizeObs.observe(this.canvasRef.nativeElement.parentElement!);
      this.fit();
      this.tick();
    });
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
  }

  // ── world setup ──

  private initWorld() {
    this.cells = new Uint8Array(this.cols * this.rows);
    // Walls
    for (let r = 1; r < this.rows - 1; r++) this.cells[r * this.cols + 3] = 1;
    this.cells[1 * this.cols + 3] = 0;        // gap in wall (top)
    this.cells[2 * this.cols + 6] = 1;
    this.cells[3 * this.cols + 6] = 1;
    // Traps
    this.cells[2 * this.cols + 5] = 2;
    this.cells[4 * this.cols + 5] = 2;
    this.cells[1 * this.cols + 7] = 2;
    // Start + goal
    this.start = (this.rows - 1) * this.cols + 0;
    this.goal  = 0 * this.cols + (this.cols - 1);
    this.cells[this.goal] = 3;

    this.Q = new Float32Array(this.cols * this.rows * 4);
    this.agentIdx = this.start;
    this.displayCol = 0; this.displayRow = this.rows - 1;
    this.episodes = 0; this.totalSteps = 0; this.stepInEp = 0;
  }

  // ── controls ──

  onSlider(field: 'alpha' | 'gamma' | 'epsilon' | 'speed', raw: any) {
    if (field === 'speed') this.speed = +raw | 0;
    else (this as any)[field] = +raw;
  }

  togglePause() { this.paused = !this.paused; }
  toggleArrows() { this.showArrows = !this.showArrows; }
  resetQ() {
    this.Q.fill(0);
    this.episodes = 0; this.totalSteps = 0; this.stepInEp = 0;
    this.agentIdx = this.start;
  }
  resetWorld() { this.initWorld(); }

  // ── Q-learning ──

  private q(s: number, a: number) { return this.Q[s * 4 + a]; }
  private setQ(s: number, a: number, v: number) { this.Q[s * 4 + a] = v; }
  private maxQ(s: number) {
    let m = -Infinity;
    for (let a = 0; a < 4; a++) if (this.Q[s * 4 + a] > m) m = this.Q[s * 4 + a];
    return m;
  }
  private argmaxQ(s: number) {
    let m = -Infinity, ai = 0;
    for (let a = 0; a < 4; a++) if (this.Q[s * 4 + a] > m) { m = this.Q[s * 4 + a]; ai = a; }
    return ai;
  }

  private chooseAction(s: number) {
    if (Math.random() < this.epsilon) return Math.floor(Math.random() * 4);
    return this.argmaxQ(s);
  }

  private step() {
    const s = this.agentIdx;
    const a = this.chooseAction(s);
    const c = s % this.cols, r = Math.floor(s / this.cols);
    const nc = c + ACTIONS[a].dc;
    const nr = r + ACTIONS[a].dr;
    let s_next = s, reward = -0.04, terminal = false;
    if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) {
      reward = -0.5;        // off-grid bump
    } else {
      const nidx = nr * this.cols + nc;
      const t = this.cells[nidx];
      if (t === 1) { reward = -0.5; }                          // wall
      else if (t === 2) { reward = -1.0; terminal = true; s_next = nidx; }   // trap
      else if (t === 3) { reward = +1.0; terminal = true; s_next = nidx; }   // goal
      else { s_next = nidx; }
    }
    // Q update
    const target = terminal ? reward : reward + this.gamma * this.maxQ(s_next);
    const cur = this.q(s, a);
    this.setQ(s, a, cur + this.alpha * (target - cur));

    this.agentIdx = terminal ? this.start : s_next;
    this.stepInEp++;
    this.totalSteps++;
    if (terminal || this.stepInEp > 200) {
      this.episodes++; this.stepInEp = 0;
      this.agentIdx = this.start;
    }
  }

  // ── loop ──

  private tick() {
    if (!this.paused) {
      const n = Math.max(1, this.speed);
      for (let i = 0; i < n; i++) this.step();
    }
    // smooth display position toward agentIdx
    const tc = this.agentIdx % this.cols;
    const tr = Math.floor(this.agentIdx / this.cols);
    this.displayCol += (tc - this.displayCol) * 0.25;
    this.displayRow += (tr - this.displayRow) * 0.25;
    this.draw();
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  // ── render ──

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = cv.parentElement!.clientWidth;
    this.cellPx = Math.max(Math.floor(w / this.cols), 36);
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

    ctx.fillStyle = '#0a1320';
    ctx.fillRect(0, 0, this.cssW * this.dpr, this.cssH * this.dpr);

    // Find Q value range for color mapping
    let qMin = 0, qMax = 0;
    for (let s = 0; s < this.cols * this.rows; s++) {
      if (this.cells[s] === 1) continue;
      const m = this.maxQ(s);
      if (m > qMax) qMax = m;
      if (m < qMin) qMin = m;
    }
    const span = Math.max(qMax - qMin, 0.01);

    for (let i = 0; i < this.cells.length; i++) {
      const c = i % this.cols, r = Math.floor(i / this.cols);
      const x = c * cp, y = r * cp;
      const t = this.cells[i];
      let fill = '#0e1a2c';

      if (t === 1) fill = '#1f2937';
      else if (t === 2) fill = '#7f1d1d';
      else if (t === 3) fill = '#14532d';
      else {
        const v = (this.maxQ(i) - qMin) / span;
        if (v > 0.6)      fill = `rgba(52, 211, 153, ${0.18 + v * 0.4})`;
        else if (v > 0.3) fill = `rgba(56, 189, 248, ${0.12 + v * 0.3})`;
        else              fill = `rgba(15, 23, 42, ${0.5 - v * 0.3})`;
      }

      ctx.fillStyle = fill;
      ctx.fillRect(x, y, cp + 0.5, cp + 0.5);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.strokeRect(x + 0.5, y + 0.5, cp - 1, cp - 1);
    }

    // Goal / trap / start labels
    {
      const gc = this.goal % this.cols, gr = Math.floor(this.goal / this.cols);
      const sc = this.start % this.cols, sr = Math.floor(this.start / this.cols);
      ctx.fillStyle = '#34d399';
      ctx.font = `bold ${cp * 0.45}px 'Inter', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('G', gc * cp + cp / 2, gr * cp + cp / 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('S', sc * cp + cp / 2, sr * cp + cp / 2);
    }

    // Best-action arrows
    if (this.showArrows) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.fillStyle = '#fbbf24';
      ctx.lineWidth = 2 * this.dpr;
      ctx.lineCap = 'round';
      for (let i = 0; i < this.cells.length; i++) {
        if (this.cells[i] === 1 || this.cells[i] === 2 || this.cells[i] === 3) continue;
        if (this.maxQ(i) === 0) continue;
        const a = this.argmaxQ(i);
        const c = i % this.cols, r = Math.floor(i / this.cols);
        const x = c * cp + cp / 2;
        const y = r * cp + cp / 2;
        const dir = ACTIONS[a];
        const ex = x + dir.dc * cp * 0.30;
        const ey = y + dir.dr * cp * 0.30;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        // Arrowhead
        const ang = Math.atan2(ey - y, ex - x);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 6 * this.dpr * Math.cos(ang - 0.5), ey - 6 * this.dpr * Math.sin(ang - 0.5));
        ctx.lineTo(ex - 6 * this.dpr * Math.cos(ang + 0.5), ey - 6 * this.dpr * Math.sin(ang + 0.5));
        ctx.closePath(); ctx.fill();
      }
    }

    // Agent
    const ax = (this.displayCol + 0.5) * cp;
    const ay = (this.displayRow + 0.5) * cp;
    ctx.fillStyle = '#fb7185';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * this.dpr;
    ctx.beginPath(); ctx.arc(ax, ay, cp * 0.28, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}
