import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-rl-curve',
  template: `
    <learn-widget-shell title="RL training curve"
                        subtitle="Simulated PPO learning a cartpole-like task. Sliders control hyperparameters; watch how the reward curve shape changes. Real PPO runs are noisy — that's why we plot mean ± std, not raw episode rewards."
                        accent="#fb7185"
                        [ratio]="0.55"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="rl-controls">
        <learn-presets [presets]="algos" [active]="algo" (select)="setAlgo($any($event))"></learn-presets>
        <learn-slider label="Learning rate" [min]="0.0001" [max]="0.01" [step]="0.0001" [value]="lr" (valueChange)="lr = $event"></learn-slider>
        <learn-slider label="Batch size" [min]="32" [max]="2048" [step]="32" [value]="batch" (valueChange)="batch = $event"></learn-slider>
        <learn-slider label="Reward scale" [min]="100" [max]="500" [step]="10" [value]="targetReward" (valueChange)="targetReward = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.rl-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class RlCurveComponent {
  algo: 'ppo' | 'sac' | 'a2c' = 'ppo';
  lr = 0.0003;
  batch = 256;
  targetReward = 400;
  paused = false;

  algos = [
    { id: 'ppo', label: 'PPO' },
    { id: 'sac', label: 'SAC' },
    { id: 'a2c', label: 'A2C' }
  ];

  private mean: number[] = [];
  private std: number[] = [];
  private step = 0;
  private maxSteps = 220;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private lastTs = 0;

  constructor(private zone: NgZone) {}

  setAlgo(id: string) { this.algo = id as any; this.reset(); }

  reset() { this.mean = []; this.std = []; this.step = 0; }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.lastTs = performance.now();
    this.zone.runOutsideAngular(() => this.tick(this.lastTs));
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = (now: number) => {
    const dt = (now - this.lastTs) / 1000;
    this.lastTs = now;
    if (!this.paused && this.step < this.maxSteps) {
      // Add new sample every ~0.05s
      if (Math.random() < dt / 0.05) this.advance();
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private advance() {
    /* Simulated learning curve.
       PPO: smooth sigmoid, modest variance.
       SAC: faster initial, slightly noisier.
       A2C: noisy, slower.
       Hyperparameters tilt the speed: high LR overshoots, large batch slows but smooths. */
    const t = this.step / this.maxSteps;
    const baseSpeed = this.algo === 'sac' ? 1.3 : (this.algo === 'a2c' ? 0.7 : 1.0);
    const lrEffect = clamp(this.lr / 0.0003, 0.4, 3);
    const overshoot = lrEffect > 1.5 ? 0.15 * (lrEffect - 1.5) : 0;
    const sigArg = (t - 0.45) * 7 * baseSpeed * Math.sqrt(lrEffect);
    let progress = sigmoid(sigArg);
    if (overshoot && t > 0.5) progress = Math.min(1, progress + overshoot * Math.sin(t * 8) * Math.exp(-(t - 0.7) * 4));
    const meanReward = progress * this.targetReward;
    const noiseScale = (this.algo === 'a2c' ? 60 : 30) * (1 / Math.sqrt(this.batch / 256));
    const stdReward = noiseScale * (0.5 + 0.5 * (1 - progress));
    this.mean.push(meanReward);
    this.std.push(stdReward);
    this.step++;
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const padL = 50 * dpr, padT = 20 * dpr, padR = 20 * dpr, padB = 36 * dpr;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const yMax = Math.max(this.targetReward, ...(this.mean.map((m, i) => m + this.std[i]))) * 1.05;
    const xFor = (i: number) => padL + (i / Math.max(this.maxSteps - 1, 1)) * plotW;
    const yFor = (r: number) => padT + plotH - (r / yMax) * plotH;

    // Grid + axes
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    for (let g = 0; g <= 4; g++) {
      const y = padT + (plotH * g) / 4;
      ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y);
    }
    ctx.stroke();

    // Target line
    ctx.strokeStyle = 'rgba(52,211,153,0.5)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(padL, yFor(this.targetReward)); ctx.lineTo(padL + plotW, yFor(this.targetReward)); ctx.stroke();
    ctx.setLineDash([]);

    // Std band
    if (this.mean.length > 1) {
      ctx.fillStyle = 'rgba(251,113,133,0.18)';
      ctx.beginPath();
      for (let i = 0; i < this.mean.length; i++) {
        const x = xFor(i), y = yFor(this.mean[i] + this.std[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let i = this.mean.length - 1; i >= 0; i--) {
        const x = xFor(i), y = yFor(Math.max(0, this.mean[i] - this.std[i]));
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Mean line
    if (this.mean.length > 1) {
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (let i = 0; i < this.mean.length; i++) {
        const x = xFor(i), y = yFor(this.mean[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('reward', padL - 36 * dpr, padT - 4 * dpr);
    ctx.fillText('training steps →', padL, H - 8 * dpr);
    ctx.textAlign = 'right';
    ctx.fillText(yMax.toFixed(0), padL - 4 * dpr, padT + 4 * dpr);
    ctx.fillText('0', padL - 4 * dpr, padT + plotH);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${11 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    const last = this.mean.length ? this.mean[this.mean.length - 1] : 0;
    ctx.fillText(`${this.algo.toUpperCase()}  step ${this.step}/${this.maxSteps}  reward ${last.toFixed(0)}`,
      padL, padT + 14 * dpr);
  }
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }
