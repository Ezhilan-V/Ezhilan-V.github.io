import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; }

@Component({
  standalone: false,
  selector: 'learn-optical-flow',
  template: `
    <learn-widget-shell title="Optical flow"
                        subtitle="Per-pixel motion vectors. Drag the camera tilt sliders to induce ego-motion; watch how a translating camera produces a divergence pattern (FOE / focus of expansion) while a rotating camera produces parallel arrows."
                        accent="#a78bfa"
                        [ratio]="0.62"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)">
      <div class="of-controls">
        <learn-presets [presets]="presets" [active]="motion" (select)="setMotion($any($event))"></learn-presets>
        <learn-slider label="Speed" [min]="0" [max]="2" [step]="0.05" [value]="speed" (valueChange)="speed = $event"></learn-slider>
        <learn-slider label="Camera depth feel" [min]="0.5" [max]="3" [step]="0.05" [value]="depth" (valueChange)="depth = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.of-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class OpticalFlowComponent {
  motion: 'forward' | 'pan' | 'roll' | 'zoom' = 'forward';
  speed = 1;
  depth = 1.5;

  presets = [
    { id: 'forward', label: 'forward translate' },
    { id: 'pan',     label: 'pan (yaw)' },
    { id: 'roll',    label: 'roll' },
    { id: 'zoom',    label: 'zoom in' }
  ];

  private particles: Particle[] = [];
  private grid: { gx: number; gy: number; vx: number; vy: number }[] = [];

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;
  private t = 0;

  constructor(private zone: NgZone) {
    // Spawn initial random particles in a 3D-feel layout
    for (let i = 0; i < 90; i++) this.particles.push(this.makeParticle());
  }

  setMotion(id: string) { this.motion = id as any; }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) {
    this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr;
    this.buildGrid();
  }

  private makeParticle(): Particle {
    return { x: Math.random(), y: Math.random(), vx: 0, vy: 0, life: 0.5 + Math.random() * 1.5 };
  }

  private buildGrid() {
    this.grid = [];
    const cols = 14, rows = 10;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.grid.push({ gx: (c + 0.5) / cols, gy: (r + 0.5) / rows, vx: 0, vy: 0 });
      }
    }
  }

  /** Compute the flow vector at normalized image coord (u, v), in normalized units. */
  private flowAt(u: number, v: number): { vx: number; vy: number } {
    // Center coords in [-1, 1]
    const x = (u - 0.5) * 2;
    const y = (v - 0.5) * 2;
    const s = this.speed * 0.05;
    switch (this.motion) {
      case 'forward': {
        // Foe at (0,0); flow magnitude proportional to radius / depth
        const z = 0.5 + this.depth * (0.6 + 0.4 * (1 - Math.abs(x) * Math.abs(y)));   // pseudo-depth varies
        return { vx: x * s / z, vy: y * s / z };
      }
      case 'zoom': {
        // Pure radial divergence
        return { vx: x * s, vy: y * s };
      }
      case 'pan': {
        // Mostly horizontal flow with depth parallax
        const z = 0.5 + this.depth * (0.6 + 0.4 * (1 - Math.abs(y)));
        return { vx: -s * 1.5 / z, vy: 0 };
      }
      case 'roll': {
        // Angular: flow = ω × r. Orthogonal to radius.
        return { vx: -y * s * 1.5, vy: x * s * 1.5 };
      }
    }
  }

  private tick = (now: number) => {
    const dt = Math.min((now - this.lastTs) / 1000, 0.05);
    this.lastTs = now;
    this.t += dt;
    // Advance particles
    for (const p of this.particles) {
      const f = this.flowAt(p.x, p.y);
      p.vx = f.vx; p.vy = f.vy;
      p.x += p.vx * dt * 30;
      p.y += p.vy * dt * 30;
      p.life -= dt * 0.4;
      if (p.life <= 0 || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        Object.assign(p, this.makeParticle());
      }
    }
    // Update grid
    for (const g of this.grid) {
      const f = this.flowAt(g.gx, g.gy);
      g.vx = f.vx; g.vy = f.vy;
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Grid arrows
    const arrowScale = 80 * dpr;
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    ctx.fillStyle = 'rgba(167,139,250,0.85)';
    ctx.lineWidth = 1.5 * dpr;
    for (const g of this.grid) {
      const x = g.gx * W, y = g.gy * H;
      const dx = g.vx * arrowScale, dy = g.vy * arrowScale;
      const m = Math.hypot(dx, dy);
      if (m < 0.3) continue;
      ctx.beginPath();
      ctx.moveTo(x - dx * 0.5, y - dy * 0.5);
      ctx.lineTo(x + dx * 0.5, y + dy * 0.5);
      ctx.stroke();
      // Arrowhead
      const ang = Math.atan2(dy, dx);
      const ah = 4 * dpr;
      ctx.beginPath();
      const tipX = x + dx * 0.5, tipY = y + dy * 0.5;
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - Math.cos(ang) * ah - Math.sin(ang) * ah * 0.5,
                 tipY - Math.sin(ang) * ah + Math.cos(ang) * ah * 0.5);
      ctx.lineTo(tipX - Math.cos(ang) * ah + Math.sin(ang) * ah * 0.5,
                 tipY - Math.sin(ang) * ah - Math.cos(ang) * ah * 0.5);
      ctx.closePath(); ctx.fill();
    }

    // Tracked particles as faint dots
    ctx.fillStyle = 'rgba(56,189,248,0.55)';
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // FOE marker for forward motion
    if (this.motion === 'forward' || this.motion === 'zoom') {
      const fx = W * 0.5, fy = H * 0.5;
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(fx - 8 * dpr, fy); ctx.lineTo(fx + 8 * dpr, fy);
      ctx.moveTo(fx, fy - 8 * dpr); ctx.lineTo(fx, fy + 8 * dpr);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('FOE', fx + 12 * dpr, fy - 6 * dpr);
    }
  }
}
