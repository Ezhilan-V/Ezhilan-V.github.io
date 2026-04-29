import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-stereo-disparity',
  template: `
    <learn-widget-shell title="Stereo disparity → depth"
                        subtitle="A scene viewed by two cameras separated by baseline B. The same object lands at different x positions in left and right images. The shift (disparity) is inversely proportional to depth: Z = f·B/d. Closer objects → larger disparity."
                        accent="#22d3ee"
                        [ratio]="0.55"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="sd-controls">
        <learn-slider label="Baseline B (m)" [min]="0.05" [max]="0.6" [step]="0.01" [value]="baseline" (valueChange)="baseline = $event"></learn-slider>
        <learn-slider label="Focal f (px)" [min]="200" [max]="900" [step]="10" [value]="focal" (valueChange)="focal = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.sd-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class StereoDisparityComponent {
  baseline = 0.2;
  focal = 500;
  paused = false;

  private objs = [
    { x: -0.3, z: 1.2, color: '#fb7185', size: 0.18 },
    { x: 0.4, z: 2.0, color: '#34d399', size: 0.22 },
    { x: -0.1, z: 3.5, color: '#a78bfa', size: 0.3 },
    { x: 0.6, z: 5.0, color: '#fbbf24', size: 0.32 }
  ];
  private t = 0;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  reset() { this.t = 0; }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = (now: number) => {
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (!this.paused) this.t += dt;
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Animated x-bob
    const bob = 0.15 * Math.sin(this.t * 0.7);
    const objs = this.objs.map(o => ({ ...o, x: o.x + bob }));

    // Layout: top-down scene (top half), two camera images (bottom row)
    const sceneH = H * 0.45;
    this.drawScene(ctx, W, sceneH, objs);

    const imgY = sceneH + 10 * dpr;
    const imgH = H - imgY - 10 * dpr;
    const imgW = (W - 30 * dpr) / 2;
    this.drawImage(ctx, 10 * dpr, imgY, imgW, imgH, objs, -this.baseline / 2, 'Left');
    this.drawImage(ctx, 20 * dpr + imgW, imgY, imgW, imgH, objs, this.baseline / 2, 'Right');
  }

  private drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, objs: any[]) {
    const dpr = this.dpr;
    // Coordinate: scene x in [-1.5, 1.5], z in [0, 6], cameras at z=0
    const xMin = -1.5, xMax = 1.5, zMax = 6;
    const px = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const py = (z: number) => H - 20 * dpr - (z / zMax) * (H - 50 * dpr);

    // Cameras
    const lx = px(-this.baseline / 2), rx = px(this.baseline / 2);
    const cy = py(0);
    [[lx, '#22d3ee', 'L'], [rx, '#a78bfa', 'R']].forEach(([x, color, label]) => {
      ctx.fillStyle = color as string;
      ctx.fillRect((x as number) - 14 * dpr, cy - 8 * dpr, 28 * dpr, 16 * dpr);
      ctx.fillStyle = '#0a1320';
      ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(label as string, (x as number), cy + 4 * dpr);
    });

    // Frustum lines (approximate FOV)
    const fov = Math.atan(W * 0.5 / this.focal) * 1.8;
    [[lx, '#22d3ee'], [rx, '#a78bfa']].forEach(([x, color]) => {
      ctx.strokeStyle = (color as string) + '55';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(x as number, cy);
      ctx.lineTo((x as number) - Math.tan(fov / 2) * (cy - py(zMax)), py(zMax));
      ctx.moveTo(x as number, cy);
      ctx.lineTo((x as number) + Math.tan(fov / 2) * (cy - py(zMax)), py(zMax));
      ctx.stroke();
    });

    // Objects (top-down)
    for (const o of objs) {
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(px(o.x), py(o.z), 8 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('top-down scene', 10 * dpr, 14 * dpr);
  }

  private drawImage(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, H: number,
                    objs: any[], camX: number, label: string) {
    const dpr = this.dpr;
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fillRect(x, y, W, H);
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(x, y, W, H);

    // Project each object: u = f * (X - cx)/Z + cx_pix
    const cxPix = W / 2;
    const cyPix = H / 2;
    for (const o of objs) {
      const dx = o.x - camX;
      const u = (this.focal * dx / o.z) * (W / 800) + cxPix;
      const radius = (this.focal * o.size / o.z) * (W / 800) * 0.5;
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(x + u, y + cyPix, Math.max(2 * dpr, radius), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 6 * dpr, y + 14 * dpr);

    // Disparity readout for closest object on left image
    if (label === 'Left') {
      const o = objs[0];
      const dispPx = (this.focal * this.baseline / o.z);
      ctx.fillStyle = '#fb7185';
      ctx.fillText(`d=${dispPx.toFixed(1)}px → Z=${o.z.toFixed(2)}m`, x + 6 * dpr, y + H - 6 * dpr);
    }
  }
}
