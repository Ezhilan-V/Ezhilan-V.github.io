import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

interface Node { id: string; x: number; y: number; color: string; }
interface Topic { id: string; from: string; to: string[]; rateHz: number; phase: number; color: string; }
interface Msg { topicId: string; from: string; to: string; t: number; }

@Component({
  standalone: false,
  selector: 'learn-ros-pubsub',
  template: `
    <learn-widget-shell title="ROS 2 pub/sub graph"
                        subtitle="Each box is a node. Lines are topic connections, with little dots representing message packets flowing between publishers and subscribers. The /tf and /odom topics are high-rate; /cmd_vel only ticks when a goal is active."
                        accent="#38bdf8"
                        [ratio]="0.7"
                        [showPause]="true"
                        [showReset]="false"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event">
      <div class="rp-controls">
        <learn-slider label="Speed" [min]="0.1" [max]="3.0" [step]="0.1" [value]="speed" (valueChange)="speed = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.rp-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class RosPubsubComponent {
  speed = 1;
  paused = false;

  private nodes: Node[] = [
    { id: 'lidar',     x: 0.1, y: 0.25, color: '#22d3ee' },
    { id: 'camera',    x: 0.1, y: 0.75, color: '#a78bfa' },
    { id: 'slam',      x: 0.4, y: 0.5,  color: '#34d399' },
    { id: 'planner',   x: 0.7, y: 0.3,  color: '#fbbf24' },
    { id: 'controller',x: 0.9, y: 0.5,  color: '#fb7185' },
    { id: 'tf',        x: 0.5, y: 0.85, color: '#94a3b8' }
  ];

  private topics: Topic[] = [
    { id: '/scan',    from: 'lidar',  to: ['slam'], rateHz: 10, phase: 0, color: '#22d3ee' },
    { id: '/image',   from: 'camera', to: ['slam'], rateHz: 30, phase: 0.1, color: '#a78bfa' },
    { id: '/map',     from: 'slam',   to: ['planner'], rateHz: 1, phase: 0.3, color: '#34d399' },
    { id: '/path',    from: 'planner',to: ['controller'], rateHz: 5, phase: 0.4, color: '#fbbf24' },
    { id: '/cmd_vel', from: 'controller', to: [], rateHz: 50, phase: 0.6, color: '#fb7185' },
    { id: '/tf',      from: 'tf',     to: ['slam', 'planner', 'controller'], rateHz: 100, phase: 0, color: '#cbd5e1' }
  ];

  private msgs: Msg[] = [];
  private t = 0;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = (now: number) => {
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (!this.paused) {
      this.t += dt * this.speed;
      // Spawn messages based on rate
      for (const topic of this.topics) {
        const period = 1 / topic.rateHz;
        const phase = (this.t + topic.phase) % period;
        const lastPhase = (this.t + topic.phase - dt * this.speed) % period;
        if (phase < lastPhase) {
          for (const tgt of topic.to) {
            this.msgs.push({ topicId: topic.id, from: topic.from, to: tgt, t: 0 });
          }
        }
      }
      // Advance messages
      this.msgs.forEach(m => m.t += dt * this.speed * 1.2);
      this.msgs = this.msgs.filter(m => m.t < 1);
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private nodePos(id: string) {
    const n = this.nodes.find(n => n.id === id)!;
    return { x: n.x * this.cssW * this.dpr, y: n.y * this.cssH * this.dpr };
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Topic lines
    for (const topic of this.topics) {
      const a = this.nodePos(topic.from);
      for (const tgt of topic.to) {
        const b = this.nodePos(tgt);
        ctx.strokeStyle = topic.color + '55';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Topic label at midpoint
        ctx.fillStyle = topic.color + '99';
        ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(topic.id, (a.x + b.x) / 2, (a.y + b.y) / 2 - 4 * dpr);
      }
    }

    // Messages (animated dots)
    for (const m of this.msgs) {
      const a = this.nodePos(m.from);
      const b = this.nodePos(m.to);
      const t = m.t;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const topic = this.topics.find(tt => tt.id === m.topicId)!;
      ctx.fillStyle = topic.color;
      ctx.beginPath();
      ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes
    for (const n of this.nodes) {
      const x = n.x * W, y = n.y * H;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2 * dpr;
      const w = 80 * dpr, h = 28 * dpr;
      ctx.beginPath();
      this.roundRect(ctx, x - w / 2, y - h / 2, w, h, 8 * dpr);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = n.color;
      ctx.font = `${11 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('/' + n.id, x, y);
    }
    ctx.textBaseline = 'alphabetic';
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
