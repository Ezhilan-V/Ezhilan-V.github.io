import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

const ROAD_LEN     = 80;        // metres of road shown along x
const LANE_HALF    = 2.0;       // road half-width (metres)
const HORIZON      = 22;        // metres lookahead
const CAR_LEN      = 1.8;
const CAR_WID      = 0.9;

@Component({
  standalone: false,
  selector: 'learn-frenet-sampler',
  templateUrl: './frenet-sampler.component.html',
  styleUrls: ['./frenet-sampler.component.scss']
})
export class FrenetSamplerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  numSamples = 11;
  speed = 6;            // m/s
  paused = false;

  obstacleS = 35;       // along-road position
  obstacleD = 0.4;      // lateral offset

  // Cost weights
  wCenter = 1.0;
  wObs    = 8.0;
  wChange = 0.5;

  // Car state in Frenet
  carS = 6;
  carD = 0;

  bestIdx = 5;

  private rafId?: number;
  private ctx?: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0; private cssH = 0;
  private resizeObs?: ResizeObserver;
  private lastTs = 0;
  private dragging = false;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
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

  // ─── controls ───────────────────────────────────────

  onSlider(field: 'numSamples' | 'speed' | 'wCenter' | 'wObs', raw: any) {
    if (field === 'numSamples') this.numSamples = +raw | 0;
    else (this as any)[field] = +raw;
  }

  togglePause() { this.paused = !this.paused; }

  reset() {
    this.carS = 6; this.carD = 0;
    this.obstacleS = 35; this.obstacleD = 0.4;
  }

  // ─── pointer (drag obstacle) ───────────────────────

  onPointerDown(ev: PointerEvent) {
    const w = this.worldFromPointer(ev);
    const dx = w.s - this.obstacleS;
    const dy = w.d - this.obstacleD;
    if (dx * dx + dy * dy < 4) {
      this.dragging = true;
      (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
    }
  }

  onPointerMove(ev: PointerEvent) {
    if (!this.dragging) return;
    const w = this.worldFromPointer(ev);
    this.obstacleS = Math.max(this.carS + 4, Math.min(ROAD_LEN - 5, w.s));
    this.obstacleD = Math.max(-LANE_HALF * 0.85, Math.min(LANE_HALF * 0.85, w.d));
  }

  onPointerUp() { this.dragging = false; }

  private worldFromPointer(ev: PointerEvent) {
    const cv = ev.target as HTMLCanvasElement;
    const r = cv.getBoundingClientRect();
    // World coords: x = ROAD_LEN axis, y = lateral
    const px = (ev.clientX - r.left) / r.width  * ROAD_LEN;
    const py = (ev.clientY - r.top)  / r.height;
    // map vertical to (-LANE_HALF*1.6 .. LANE_HALF*1.6) total span around centerline
    const span = LANE_HALF * 1.6;
    const d = (0.5 - py) * span * 2;
    return { s: px, d };
  }

  // ─── road geometry ─────────────────────────────────

  private centerline(s: number) {
    // y as function of s - gentle sine for visual interest
    const y = 0.9 * Math.sin(s * 0.10) + 0.45 * Math.sin(s * 0.06 + 1.2);
    return y;
  }
  private centerHeading(s: number) {
    const dy_ds = 0.9 * 0.10 * Math.cos(s * 0.10) + 0.45 * 0.06 * Math.cos(s * 0.06 + 1.2);
    return Math.atan2(dy_ds, 1);
  }

  /** Convert (Frenet s, d) to world (x, y) - y axis is lateral up */
  private sd2world(s: number, d: number) {
    const cy = this.centerline(s);
    const h  = this.centerHeading(s);
    return { x: s + d * -Math.sin(h), y: cy + d * Math.cos(h) };
  }

  // ─── sampling + scoring ────────────────────────────

  private sampleD(targetD: number, tau: number) {
    /* Quintic polynomial from (d=carD, d'=0, d''=0) at tau=0
       to (d=targetD, d'=0, d''=0) at tau=1. */
    const a0 = this.carD;
    const a1 = 0; const a2 = 0;
    const dd = targetD - this.carD;
    const a3 =  10 * dd;
    const a4 = -15 * dd;
    const a5 =   6 * dd;
    return a0 + a1*tau + a2*tau**2 + a3*tau**3 + a4*tau**4 + a5*tau**5;
  }

  private trajectoryPoints(targetD: number, n = 24) {
    const out: { s: number; d: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = this.carS + t * HORIZON;
      const d = this.sampleD(targetD, t);
      out.push({ s, d });
    }
    return out;
  }

  private cost(targetD: number) {
    const traj = this.trajectoryPoints(targetD, 18);
    let cost = this.wCenter * targetD * targetD;
    cost += this.wChange * Math.abs(targetD - this.carD);
    let minObsDist = Infinity;
    for (const p of traj) {
      const ds = p.s - this.obstacleS;
      const dd = p.d - this.obstacleD;
      const dist = Math.sqrt(ds * ds + dd * dd);
      if (dist < minObsDist) minObsDist = dist;
    }
    if (minObsDist < 1.4) cost += 1e6;                      // collision
    else cost += this.wObs / (minObsDist - 1.0) ** 2;       // smooth penalty
    if (Math.abs(targetD) > LANE_HALF * 0.9) cost += 1e5;   // off-road
    return cost;
  }

  private samples(): number[] {
    const out: number[] = [];
    const span = LANE_HALF * 1.6;
    const half = (this.numSamples - 1) / 2;
    for (let i = 0; i < this.numSamples; i++) {
      out.push(((i - half) / Math.max(half, 1)) * span / 2);
    }
    return out;
  }

  // ─── loop ──────────────────────────────────────────

  private tick(now: number) {
    const dt = Math.min((now - this.lastTs) / 1000, 0.05);
    this.lastTs = now;

    // Score samples
    const samps = this.samples();
    let best = 0; let bestCost = Infinity;
    for (let i = 0; i < samps.length; i++) {
      const c = this.cost(samps[i]);
      if (c < bestCost) { bestCost = c; best = i; }
    }
    this.bestIdx = best;

    if (!this.paused) {
      // Move car forward and lerp lateral toward best trajectory's first lookahead point
      this.carS += this.speed * dt;
      const targetD = samps[best];
      const desiredD = this.sampleD(targetD, 0.18);
      this.carD += (desiredD - this.carD) * Math.min(1, dt * 4);
      // Wrap when off the road
      if (this.carS > ROAD_LEN - 4) { this.carS = 6; this.carD = 0; }
    }

    this.draw();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  // ─── render ────────────────────────────────────────

  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = cv.parentElement!.clientWidth;
    const h = Math.max(220, Math.min(360, w * 0.30));
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
    const sx = W / ROAD_LEN;
    const span = LANE_HALF * 1.6;
    const sy = H / (span * 2);   // pixels per lateral metre
    const cy = H / 2;
    const w2p = (s: number, d: number) => ({ x: s * sx, y: cy - d * sy });

    // Background
    ctx.fillStyle = '#0a1320';
    ctx.fillRect(0, 0, W, H);

    // Road shoulder
    ctx.fillStyle = 'rgba(31, 41, 55, 0.7)';
    ctx.beginPath();
    for (let i = 0; i <= ROAD_LEN; i += 0.5) {
      const p = w2p(i, this.centerline(i) + LANE_HALF);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    for (let i = ROAD_LEN; i >= 0; i -= 0.5) {
      const p = w2p(i, this.centerline(i) - LANE_HALF);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();

    // Road edges
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1.5 * this.dpr;
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i <= ROAD_LEN; i += 0.5) {
        const p = w2p(i, this.centerline(i) + sign * LANE_HALF);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Centerline (dashed)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.setLineDash([8 * this.dpr, 10 * this.dpr]);
    ctx.lineWidth = 1.2 * this.dpr;
    ctx.beginPath();
    for (let i = 0; i <= ROAD_LEN; i += 0.5) {
      const p = w2p(i, this.centerline(i));
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Candidate trajectories
    const samps = this.samples();
    for (let i = 0; i < samps.length; i++) {
      const traj = this.trajectoryPoints(samps[i], 18);
      const isBest = i === this.bestIdx;
      ctx.strokeStyle = isBest ? '#fbbf24' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = (isBest ? 3 : 1.4) * this.dpr;
      ctx.beginPath();
      for (let k = 0; k < traj.length; k++) {
        const p = w2p(traj[k].s, traj[k].d + this.centerline(traj[k].s));
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Obstacle
    {
      const o = w2p(this.obstacleS, this.centerline(this.obstacleS) + this.obstacleD);
      ctx.fillStyle = 'rgba(248, 113, 113, 0.85)';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2 * this.dpr;
      const ow = 2.0 * sx, oh = 1.0 * sy;
      ctx.fillRect(o.x - ow / 2, o.y - oh / 2, ow, oh);
      ctx.strokeRect(o.x - ow / 2, o.y - oh / 2, ow, oh);
      ctx.fillStyle = '#fff';
      ctx.font = `${10 * this.dpr}px 'Inter', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('drag', o.x, o.y);
    }

    // Car
    {
      const cw = w2p(this.carS, this.carD + this.centerline(this.carS));
      const heading = this.centerHeading(this.carS);
      ctx.save();
      ctx.translate(cw.x, cw.y);
      ctx.rotate(-heading);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0a1320';
      ctx.lineWidth = 2 * this.dpr;
      const cl = CAR_LEN * sx, cwd = CAR_WID * sy;
      ctx.fillRect(-cl / 2, -cwd / 2, cl, cwd);
      ctx.strokeRect(-cl / 2, -cwd / 2, cl, cwd);
      // Heading arrow
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo( cl / 2,  0);
      ctx.lineTo( cl / 4,  cwd * 0.35);
      ctx.lineTo( cl / 4, -cwd * 0.35);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}
