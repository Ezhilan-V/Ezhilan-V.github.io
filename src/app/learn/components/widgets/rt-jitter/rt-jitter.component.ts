import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-rt-jitter',
  template: `
    <learn-widget-shell title="Real-time vs vanilla scheduling"
                        subtitle="Each tick should land exactly every 1 ms. Toggle the OS load and watch the timing histogram. Vanilla Linux has long tails; PREEMPT_RT bounds them."
                        accent="#fb7185"
                        [ratio]="0.55"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)">
      <div class="rt-controls">
        <learn-presets [presets]="presets" [active]="mode" (select)="setMode($any($event))"></learn-presets>
        <learn-slider label="OS load" unit="%" [min]="0" [max]="100" [step]="5" [value]="load" (valueChange)="load = $event"></learn-slider>
        <learn-slider label="Sample rate" unit="kHz" [min]="0.5" [max]="2.5" [step]="0.1" [value]="rateKHz" (valueChange)="rateKHz = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.rt-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class RtJitterComponent {
  mode: 'vanilla' | 'preempt' = 'vanilla';
  load = 40;
  rateKHz = 1;

  presets = [
    { id: 'vanilla', label: 'vanilla Linux' },
    { id: 'preempt', label: 'PREEMPT_RT' }
  ];

  /** Histogram of latency in microseconds. Bin width = 50us, range 0..3000us. */
  private histogram: number[] = new Array(60).fill(0);
  /** Most-recent raw latencies for the live trace. */
  private trace: number[] = [];
  private maxTraceLen = 240;
  private targetUs = 1000;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;
  private accUs = 0;

  constructor(private zone: NgZone) {}

  setMode(id: string) { this.mode = id as any; this.histogram.fill(0); }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = (now: number) => {
    const dt = now - this.lastTs;
    this.lastTs = now;
    this.accUs += dt * 1000;
    const periodUs = 1000 / this.rateKHz;
    while (this.accUs >= periodUs) {
      this.accUs -= periodUs;
      this.recordSample();
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private recordSample() {
    // Vanilla: tail-heavy (log-normal-ish with rare giant spikes)
    // Preempt: tight Gaussian
    let latency: number;
    const loadF = this.load / 100;
    if (this.mode === 'preempt') {
      // Gaussian, σ ~ 30us regardless of load, plus tiny load contribution
      latency = this.targetUs + this.gauss(0, 25 + loadF * 25);
    } else {
      // Vanilla: σ ~80us baseline + heavy log-normal tail under load
      latency = this.targetUs + this.gauss(0, 60 + loadF * 100);
      if (Math.random() < 0.04 + loadF * 0.18) {
        // Tail spike
        latency += Math.random() * (300 + loadF * 1800);
      }
    }
    latency = Math.max(latency, 1);
    this.trace.push(latency);
    if (this.trace.length > this.maxTraceLen) this.trace.shift();
    const bin = Math.min(this.histogram.length - 1, Math.floor(latency / 50));
    this.histogram[bin]++;
  }

  private gauss(mu: number, sigma: number) {
    // Box-Muller
    const u1 = Math.random() || 1e-9, u2 = Math.random();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Top: live trace
    const traceH = H * 0.4;
    const traceTop = 12 * dpr;
    const traceBottom = traceTop + traceH;
    ctx.strokeStyle = 'rgba(148,163,184,0.18)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, traceTop); ctx.lineTo(W, traceTop);
    ctx.moveTo(0, traceBottom); ctx.lineTo(W, traceBottom);
    ctx.stroke();
    // Target line at 1000us
    const yFor = (us: number) => traceBottom - (Math.min(us, 3000) / 3000) * traceH;
    ctx.strokeStyle = 'rgba(52,211,153,0.45)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(0, yFor(1000)); ctx.lineTo(W, yFor(1000)); ctx.stroke();
    ctx.setLineDash([]);

    // Trace
    ctx.strokeStyle = this.mode === 'preempt' ? '#34d399' : '#fb7185';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < this.trace.length; i++) {
      const x = (i / this.maxTraceLen) * W;
      const y = yFor(this.trace[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('latency (µs)', 8 * dpr, traceTop + 12 * dpr);
    ctx.fillText('1000 µs target', 8 * dpr, yFor(1000) - 4 * dpr);
    ctx.fillText('3000 µs', 8 * dpr, traceBottom - 4 * dpr);

    // Bottom: histogram
    const histTop = traceBottom + 28 * dpr;
    const histH = H - histTop - 18 * dpr;
    const totalSamples = this.histogram.reduce((a, b) => a + b, 0) || 1;
    const peak = Math.max(...this.histogram);
    const binW = W / this.histogram.length;
    for (let i = 0; i < this.histogram.length; i++) {
      const h = (this.histogram[i] / Math.max(peak, 1)) * histH;
      ctx.fillStyle = i === 20 ? '#34d399' : (i > 30 ? '#fb7185' : '#7dd3fc');
      ctx.fillRect(i * binW, histTop + (histH - h), binW - 1, h);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`histogram of ${totalSamples} samples`, 8 * dpr, histTop - 6 * dpr);
    ctx.textAlign = 'right';
    const max = Math.max(...this.trace);
    ctx.fillText(`p100 = ${max.toFixed(0)} µs`, W - 8 * dpr, histTop - 6 * dpr);
  }
}
