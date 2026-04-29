import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';

type KernelName =
  | 'identity' | 'blur' | 'gaussian' | 'motion-blur'
  | 'sharpen' | 'unsharp'
  | 'edge8' | 'edge4'
  | 'sobel-x' | 'sobel-y' | 'prewitt-x' | 'scharr-x'
  | 'emboss'
  | 'custom';

interface Preset { name: KernelName; label: string; k: number[]; }

const PRESETS: Preset[] = [
  { name: 'identity',    label: 'Identity',      k: [0, 0, 0,   0, 1, 0,   0, 0, 0] },
  { name: 'blur',        label: 'Box blur',      k: [1, 1, 1,   1, 1, 1,   1, 1, 1] },
  { name: 'gaussian',    label: 'Gaussian 3×3',  k: [1, 2, 1,   2, 4, 2,   1, 2, 1] },
  { name: 'motion-blur', label: 'Motion blur',   k: [1, 0, 0,   0, 1, 0,   0, 0, 1] },
  { name: 'sharpen',     label: 'Sharpen',       k: [0, -1, 0,  -1, 5, -1,  0, -1, 0] },
  { name: 'unsharp',     label: 'Unsharp mask',  k: [-1, -1, -1, -1, 9, -1, -1, -1, -1] },
  { name: 'edge8',       label: 'Laplacian 8',   k: [-1, -1, -1, -1, 8, -1, -1, -1, -1] },
  { name: 'edge4',       label: 'Laplacian 4',   k: [0, -1, 0,  -1, 4, -1,  0, -1, 0] },
  { name: 'sobel-x',     label: 'Sobel X',       k: [-1, 0, 1,  -2, 0, 2,  -1, 0, 1] },
  { name: 'sobel-y',     label: 'Sobel Y',       k: [-1, -2, -1, 0, 0, 0,   1, 2, 1] },
  { name: 'prewitt-x',   label: 'Prewitt X',     k: [-1, 0, 1,  -1, 0, 1,  -1, 0, 1] },
  { name: 'scharr-x',    label: 'Scharr X',      k: [-3, 0, 3,  -10, 0, 10, -3, 0, 3] },
  { name: 'emboss',      label: 'Emboss',        k: [-2, -1, 0, -1, 1, 1,   0, 1, 2] }
];

const IMG_W = 360;
const IMG_H = 270;

@Component({
  standalone: false,
  selector: 'learn-convolution',
  templateUrl: './convolution.component.html',
  styleUrls: ['./convolution.component.scss']
})
export class ConvolutionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('srcCanvas', { static: true }) srcRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dstCanvas', { static: true }) dstRef!: ElementRef<HTMLCanvasElement>;

  presets = PRESETS;
  current: KernelName = 'edge8';
  kernel: number[] = [...PRESETS.find(p => p.name === 'edge8')!.k];

  get activeLabel(): string {
    return PRESETS.find(p => p.name === this.current)?.label ?? 'Custom';
  }

  private srcImageData?: ImageData;     // Grayscale source pixels at IMG_W x IMG_H
  private dpr = 1;
  private resizeObs?: ResizeObserver;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.resizeObs = new ResizeObserver(() => { this.fit(); this.renderSource(); this.applyKernel(); });
      this.resizeObs.observe(this.srcRef.nativeElement.parentElement!);
      this.fit();
      this.renderSource();
      this.applyKernel();
    });
  }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
  }

  // ── controls ──

  setPreset(name: KernelName) {
    this.current = name;
    this.kernel = [...PRESETS.find(p => p.name === name)!.k];
    this.applyKernel();
  }

  onCellChange(i: number, raw: any) {
    const v = +raw;
    if (Number.isFinite(v)) {
      this.kernel[i] = v;
      this.current = 'custom';
      this.applyKernel();
    }
  }

  // ── source rendering ──

  private fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const cv of [this.srcRef.nativeElement, this.dstRef.nativeElement]) {
      const w = cv.parentElement!.clientWidth;
      const h = w * (IMG_H / IMG_W);
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.height = h + 'px';
    }
    this.dpr = dpr;
  }

  private renderSource() {
    // Render a synthetic grayscale test image directly into IMG_W × IMG_H ImageData.
    // Then upscale to the canvas size for display.
    const data = new Uint8ClampedArray(IMG_W * IMG_H * 4);
    const stripe = IMG_W / 13;
    const circleR = IMG_W * 0.125;
    const sqOuter = IMG_W * 0.125;
    const sqInner = IMG_W * 0.092;
    const vignette = IMG_W * 0.05;
    for (let y = 0; y < IMG_H; y++) {
      for (let x = 0; x < IMG_W; x++) {
        let v = 90;
        v += Math.floor(80 * (x / IMG_W));
        if ((Math.floor((x + y) / stripe)) % 2 === 0) v += 30;
        const dx = x - IMG_W * 0.32, dy = y - IMG_H * 0.55;
        if (dx * dx + dy * dy < circleR * circleR) v = 235;
        const sx = x - IMG_W * 0.7, sy = y - IMG_H * 0.45;
        if (Math.abs(sx) < sqOuter && Math.abs(sy) < sqOuter) {
          if (Math.abs(sx) > sqInner || Math.abs(sy) > sqInner) v = 30;
        }
        if (y > IMG_H * 0.78 && y < IMG_H * 0.86) v = 200;
        const bx = Math.min(x, IMG_W - x), by = Math.min(y, IMG_H - y);
        const b = Math.min(bx, by);
        if (b < vignette) v = Math.floor(v * (b / vignette + 0.2));
        v = Math.max(0, Math.min(255, v));
        const i = (y * IMG_W + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    this.srcImageData = new ImageData(data, IMG_W, IMG_H);
    this.blitGrayscale(this.srcRef.nativeElement, this.srcImageData);
  }

  // ── convolution ──

  private applyKernel() {
    if (!this.srcImageData) return;
    const src = this.srcImageData.data;
    const out = new Uint8ClampedArray(src.length);
    out.fill(255);

    // Sum of positive kernel weights (for normalization) - fall back to 1 if zero/negative
    let sum = 0;
    for (const k of this.kernel) sum += k;
    const div = sum === 0 ? 1 : sum;
    const useDiv = sum > 0 && Math.abs(sum) > 0.5;
    const offset = useDiv ? 0 : 128;          // centre at gray for edge filters

    for (let y = 0; y < IMG_H; y++) {
      for (let x = 0; x < IMG_W; x++) {
        let acc = 0;
        let ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(IMG_W - 1, Math.max(0, x + dx));
            const yy = Math.min(IMG_H - 1, Math.max(0, y + dy));
            const v = src[(yy * IMG_W + xx) * 4];
            acc += v * this.kernel[ki++];
          }
        }
        const o = useDiv ? acc / div : acc + offset;
        const v = Math.max(0, Math.min(255, o));
        const i = (y * IMG_W + x) * 4;
        out[i] = out[i + 1] = out[i + 2] = v;
        out[i + 3] = 255;
      }
    }
    this.blitGrayscale(this.dstRef.nativeElement, new ImageData(out, IMG_W, IMG_H));
  }

  private blitGrayscale(cv: HTMLCanvasElement, img: ImageData) {
    const ctx = cv.getContext('2d')!;
    // Render into a tiny offscreen at native resolution then upscale (nearest neighbour)
    const off = document.createElement('canvas');
    off.width = IMG_W; off.height = IMG_H;
    off.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(off, 0, 0, cv.width, cv.height);
  }
}
