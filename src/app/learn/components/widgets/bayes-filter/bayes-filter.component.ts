import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

const N = 20;
const DOORS = [5, 11, 17];

@Component({
  standalone: false,
  selector: 'learn-bayes-filter',
  templateUrl: './bayes-filter.component.html',
  styleUrls: ['./bayes-filter.component.scss']
})
export class BayesFilterComponent {
  belief: number[] = [];
  lastLikelihood: number[] | null = null;
  lastUpdate: 'predict' | 'sense' | 'reset' = 'reset';
  step = 0;

  motionNoise = 0.18;
  senseNoise = 0.18;
  motionStep = 1;

  presets = [
    { id: 'predict', label: 'predict (move →)', hint: 'Apply motion model: belief blurs and shifts.' },
    { id: 'sense',   label: 'sense door',       hint: 'Multiply by door likelihood, then normalize.' },
    { id: 'lost',    label: 'lost (uniform)',   hint: 'Reset to a flat prior.' }
  ];

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  constructor(private zone: NgZone) {
    this.resetBelief();
  }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.draw();
  }

  onCanvasResize(e: WidgetCanvasResize) {
    this.cssW = e.cssW;
    this.cssH = e.cssH;
    this.dpr = e.dpr;
    this.draw();
  }

  resetBelief() {
    this.belief = new Array(N).fill(1 / N);
    this.lastLikelihood = null;
    this.lastUpdate = 'reset';
    this.step = 0;
    this.draw();
  }

  applyAction(id: string) {
    if (id === 'predict') this.predict();
    else if (id === 'sense') this.sense();
    else if (id === 'lost') this.resetBelief();
  }

  private predict() {
    const k = this.motionStep;
    const sigma = Math.max(0.01, this.motionNoise);
    const kernel: number[] = [];
    const half = 3;
    let sum = 0;
    for (let i = -half; i <= half; i++) {
      const v = Math.exp(-((i - k) ** 2) / (2 * sigma * sigma * (k + 1)));
      kernel.push(v); sum += v;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

    const next = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < kernel.length; j++) {
        const src = i - (j - half);
        if (src >= 0 && src < N) next[i] += this.belief[src] * kernel[j];
      }
    }
    let total = next.reduce((a, b) => a + b, 0);
    if (total === 0) total = 1;
    for (let i = 0; i < N; i++) next[i] /= total;
    this.belief = next;
    this.lastUpdate = 'predict';
    this.lastLikelihood = null;
    this.step++;
    this.draw();
  }

  private sense() {
    const pHit = 1 - this.senseNoise;
    const pMiss = this.senseNoise;
    const lik: number[] = [];
    for (let i = 0; i < N; i++) {
      const isDoor = DOORS.includes(i);
      lik.push(isDoor ? pHit : pMiss);
    }
    let total = 0;
    for (let i = 0; i < N; i++) {
      this.belief[i] *= lik[i];
      total += this.belief[i];
    }
    if (total === 0) total = 1;
    for (let i = 0; i < N; i++) this.belief[i] /= total;
    this.lastLikelihood = lik;
    this.lastUpdate = 'sense';
    this.step++;
    this.draw();
  }

  setMotionNoise(v: number)  { this.motionNoise = v; }
  setSenseNoise(v: number)   { this.senseNoise = v; }

  entropy(): number {
    let h = 0;
    for (const p of this.belief) {
      if (p > 0) h -= p * Math.log2(p);
    }
    return h;
  }

  bestCell(): number {
    let bi = 0; let bv = -1;
    for (let i = 0; i < N; i++) {
      if (this.belief[i] > bv) { bv = this.belief[i]; bi = i; }
    }
    return bi;
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const padX = 28 * this.dpr;
    const padTop = 36 * this.dpr;
    const padBottom = 64 * this.dpr;
    const innerW = W - padX * 2;
    const innerH = H - padTop - padBottom;
    const cellW = innerW / N;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    for (let g = 0; g <= 4; g++) {
      const y = padTop + (innerH * g) / 4;
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + innerW, y);
    }
    ctx.stroke();

    const peak = Math.max(0.05, ...this.belief);

    if (this.lastLikelihood) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
      for (let i = 0; i < N; i++) {
        const h = (this.lastLikelihood[i] / Math.max(...this.lastLikelihood)) * innerH;
        ctx.fillRect(padX + i * cellW + 1, padTop + (innerH - h), cellW - 2, h);
      }
    }

    for (let i = 0; i < N; i++) {
      const h = (this.belief[i] / peak) * innerH;
      const x = padX + i * cellW;
      const y = padTop + (innerH - h);
      const isDoor = DOORS.includes(i);
      const isBest = i === this.bestCell();

      ctx.fillStyle = isBest ? '#34d399'
                   : isDoor ? '#38bdf8'
                            : 'rgba(56, 189, 248, 0.55)';
      ctx.fillRect(x + 2, y, cellW - 4, h);

      if (isBest) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5 * this.dpr;
        ctx.strokeRect(x + 1, y - 2, cellW - 2, h + 2);
      }
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.2 * this.dpr;
    ctx.beginPath();
    ctx.moveTo(padX, padTop + innerH);
    ctx.lineTo(padX + innerW, padTop + innerH);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const d of DOORS) {
      const x = padX + d * cellW + cellW / 2;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('door', x, padTop + innerH + 6 * this.dpr);
    }
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < N; i += 2) {
      const x = padX + i * cellW + cellW / 2;
      ctx.fillText(String(i), x, padTop + innerH + 22 * this.dpr);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${11 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`step ${this.step}  ·  H = ${this.entropy().toFixed(2)} bits  ·  argmax = cell ${this.bestCell()}`, padX, 12 * this.dpr);

    ctx.fillStyle = this.lastUpdate === 'predict' ? '#fb7185'
                 : this.lastUpdate === 'sense'   ? '#fbbf24'
                                                  : '#94a3b8';
    ctx.fillText(this.lastUpdate.toUpperCase(), padX + innerW - 60 * this.dpr, 12 * this.dpr);
  }
}
