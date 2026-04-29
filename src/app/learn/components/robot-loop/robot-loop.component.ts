import {
  AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy,
  Output, ViewChild
} from '@angular/core';

interface LoopNode {
  id: 'sense' | 'think' | 'act';
  label: string;
  sub: string;
  icon: string;
  accent: string;
  branch: string;
}

const LOOP: LoopNode[] = [
  { id: 'sense', label: 'Sense',  sub: 'cameras, LiDAR, IMU', icon: 'fa-eye',         accent: '#22d3ee', branch: 'sensors' },
  { id: 'think', label: 'Think',  sub: 'plan, perceive, learn', icon: 'fa-brain',     accent: '#a78bfa', branch: 'ai-ml' },
  { id: 'act',   label: 'Act',    sub: 'wheels, joints, grippers', icon: 'fa-gears',  accent: '#34d399', branch: 'control-systems' }
];

interface NodeGeom extends LoopNode { x: number; y: number; }

@Component({
  standalone: false,
  selector: 'learn-robot-loop',
  templateUrl: './robot-loop.component.html',
  styleUrls: ['./robot-loop.component.scss']
})
export class RobotLoopComponent implements AfterViewInit, OnDestroy {
  @Output() select = new EventEmitter<string>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stage',  { static: true }) stageRef!: ElementRef<HTMLDivElement>;

  hoverId: string | null = null;
  activeStage: 'sense' | 'think' | 'act' = 'sense';

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private nodes: NodeGeom[] = [];
  private resizeObs?: ResizeObserver;
  private rafFrame?: number;
  private lastTs = 0;
  private flowT = 0;
  private stageT = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;
      this.resizeObs = new ResizeObserver(() => this.fit());
      this.resizeObs.observe(this.stageRef.nativeElement);
      this.fit();

      // Honor reduced-motion: render one static frame, skip the loop.
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) this.draw();
      else this.tick(0);
    });
  }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
    if (this.rafFrame) cancelAnimationFrame(this.rafFrame);
  }

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = this.stageRef.nativeElement.clientWidth || 320;
    const h = Math.max(260, Math.min(360, w * 0.42));
    this.cssW = w;
    this.cssH = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(w * this.dpr);
    cv.height = Math.floor(h * this.dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    this.layoutNodes();
  }

  private layoutNodes() {
    const padX = Math.max(60, this.cssW * 0.1);
    const innerW = this.cssW - padX * 2;
    const cy = this.cssH / 2;
    this.nodes = LOOP.map((n, i) => ({
      ...n,
      x: padX + (innerW * i) / 2,
      y: cy
    }));
  }

  private tick = (ts: number) => {
    const dt = this.lastTs === 0 ? 0 : (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    this.flowT += dt;
    this.stageT += dt;

    const period = 1.6;
    const idx = Math.floor((this.stageT % (period * 3)) / period);
    const nextStage = LOOP[idx].id;
    if (nextStage !== this.activeStage) {
      this.zone.run(() => this.activeStage = nextStage);
    }

    this.draw();
    this.rafFrame = requestAnimationFrame(this.tick);
  };

  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;
    const dpr = this.dpr;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // soft grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1 * dpr;
    for (let gx = 0; gx < W; gx += 40 * dpr) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }

    // forward arrows + flowing dots between nodes
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      this.drawFlow(ctx, a, b, dpr, false, i);
    }
    // return arrow from act -> sense (curve below)
    this.drawReturnFlow(ctx, this.nodes[2], this.nodes[0], dpr);

    // nodes
    for (const n of this.nodes) {
      const isActive = this.activeStage === n.id;
      const isHover = this.hoverId === n.id;
      const r = (isActive ? 30 : 26) * dpr;
      const x = n.x * dpr;
      const y = n.y * dpr;

      // halo
      const haloR = r + (isActive ? 14 : 8) * dpr;
      const grad = ctx.createRadialGradient(x, y, r, x, y, haloR);
      grad.addColorStop(0, hexA(n.accent, isActive ? 0.35 : 0.18));
      grad.addColorStop(1, hexA(n.accent, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // disk
      ctx.fillStyle = isActive ? '#0a1320' : '#080d18';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // ring
      ctx.strokeStyle = n.accent;
      ctx.lineWidth = (isActive ? 2.4 : 1.4) * dpr;
      ctx.stroke();

      if (isHover && !isActive) {
        ctx.strokeStyle = hexA(n.accent, 0.55);
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r + 6 * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // labels
      ctx.fillStyle = isActive ? n.accent : '#cbd5e1';
      ctx.font = `${(isActive ? 14 : 13) * dpr}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, x, y + r + 8 * dpr);

      ctx.fillStyle = isActive ? '#94a3b8' : '#64748b';
      ctx.font = `${10 * dpr}px 'Inter', sans-serif`;
      ctx.fillText(n.sub, x, y + r + 26 * dpr);
    }
  }

  private drawFlow(
    ctx: CanvasRenderingContext2D,
    a: NodeGeom, b: NodeGeom, dpr: number,
    _hot: boolean, idx: number
  ) {
    const x1 = a.x * dpr, y1 = a.y * dpr;
    const x2 = b.x * dpr, y2 = b.y * dpr;
    const r = 30 * dpr;
    const ux = x2 - x1, uy = y2 - y1;
    const len = Math.hypot(ux, uy) || 1;
    const nx = ux / len, ny = uy / len;
    const sx = x1 + nx * r, sy = y1 + ny * r;
    const ex = x2 - nx * r, ey = y2 - ny * r;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // arrowhead
    const ah = 6 * dpr;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - nx * ah - ny * ah * 0.5, ey - ny * ah + nx * ah * 0.5);
    ctx.lineTo(ex - nx * ah + ny * ah * 0.5, ey - ny * ah - nx * ah * 0.5);
    ctx.closePath();
    ctx.fill();

    // moving packets
    for (let p = 0; p < 3; p++) {
      const tt = ((this.flowT * 0.55 + p * 0.33 + idx * 0.18) % 1);
      const px = sx + (ex - sx) * tt;
      const py = sy + (ey - sy) * tt;
      const colorFrom = a.accent;
      const colorTo = b.accent;
      const c = mixHex(colorFrom, colorTo, tt);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(px, py, 2.6 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawReturnFlow(
    ctx: CanvasRenderingContext2D,
    a: NodeGeom, b: NodeGeom, dpr: number
  ) {
    const x1 = a.x * dpr, y1 = a.y * dpr;
    const x2 = b.x * dpr, y2 = b.y * dpr;
    // curve below
    const midX = (x1 + x2) / 2;
    const dropY = y1 + 70 * dpr;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(x1, y1 + 30 * dpr);
    ctx.bezierCurveTo(x1, dropY, x2, dropY, x2, y2 + 30 * dpr);
    ctx.stroke();
    ctx.setLineDash([]);

    // moving feedback dot
    const tt = (this.flowT * 0.35) % 1;
    const p = bezierPoint(
      x1, y1 + 30 * dpr,
      x1, dropY,
      x2, dropY,
      x2, y2 + 30 * dpr,
      1 - tt
    );
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // label
    ctx.fillStyle = '#fbbf24';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('feedback (loop)', (x1 + x2) / 2, dropY + 6 * dpr);
  }

  // ─── Pointer ───────────────────────────────────────────────
  private pickNode(clientX: number, clientY: number): NodeGeom | null {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const n of this.nodes) {
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy <= 32 * 32) return n;
    }
    return null;
  }

  onMove(ev: MouseEvent) {
    const node = this.pickNode(ev.clientX, ev.clientY);
    const id = node?.id ?? null;
    if (id !== this.hoverId) {
      this.zone.run(() => this.hoverId = id);
    }
  }

  onLeave() {
    if (this.hoverId !== null) this.zone.run(() => this.hoverId = null);
  }

  onClick(ev: MouseEvent) {
    const node = this.pickNode(ev.clientX, ev.clientY);
    if (node) this.select.emit(node.branch);
  }

  current(): LoopNode {
    return LOOP.find(n => n.id === this.activeStage)!;
  }
}

function bezierPoint(
  x1: number, y1: number, c1x: number, c1y: number,
  c2x: number, c2y: number, x2: number, y2: number, t: number
) {
  const it = 1 - t;
  const x = it * it * it * x1 + 3 * it * it * t * c1x + 3 * it * t * t * c2x + t * t * t * x2;
  const y = it * it * it * y1 + 3 * it * it * t * c1y + 3 * it * t * t * c2y + t * t * t * y2;
  return { x, y };
}

function hexA(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mixHex(hex1: string, hex2: string, t: number): string {
  const a = hexParts(hex1);
  const b = hexParts(hex2);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexParts(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [
    parseInt(v.substring(0, 2), 16),
    parseInt(v.substring(2, 4), 16),
    parseInt(v.substring(4, 6), 16)
  ];
}
