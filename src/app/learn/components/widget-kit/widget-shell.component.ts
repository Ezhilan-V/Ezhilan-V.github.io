import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone,
  OnDestroy, Output, ViewChild
} from '@angular/core';

export interface WidgetCanvasReady {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface WidgetCanvasResize {
  cssW: number;
  cssH: number;
  dpr: number;
}

@Component({
  standalone: false,
  selector: 'learn-widget-shell',
  templateUrl: './widget-shell.component.html',
  styleUrls: ['./widget-shell.component.scss']
})
export class WidgetShellComponent implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() accent = '#34d399';
  @Input() showCanvas = true;
  @Input() showPause = true;
  @Input() showReset = true;
  @Input() ratio = 0.62;
  @Input() minHeight = 280;
  @Input() maxHeight = 460;

  @Output() canvasReady = new EventEmitter<WidgetCanvasReady>();
  @Output() canvasResize = new EventEmitter<WidgetCanvasResize>();
  @Output() pausedChange = new EventEmitter<boolean>();
  @Output() resetClick = new EventEmitter<void>();

  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;

  paused = false;

  private resizeObs?: ResizeObserver;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    if (!this.showCanvas || !this.canvasRef) return;
    this.zone.runOutsideAngular(() => {
      const canvas = this.canvasRef!.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      this.resizeObs = new ResizeObserver(() => this.fit());
      this.resizeObs.observe(this.stageRef.nativeElement);
      this.fit();
      this.canvasReady.emit({ canvas, ctx });
    });
  }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
  }

  togglePause() {
    this.paused = !this.paused;
    this.pausedChange.emit(this.paused);
  }

  doReset() {
    this.resetClick.emit();
  }

  private fit() {
    if (!this.canvasRef) return;
    const cv = this.canvasRef.nativeElement;
    const w = this.stageRef.nativeElement.clientWidth || 320;
    const h = Math.min(Math.max(w * this.ratio, this.minHeight), this.maxHeight);
    this.cssW = w;
    this.cssH = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(w * this.dpr);
    cv.height = Math.floor(h * this.dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    this.canvasResize.emit({ cssW: w, cssH: h, dpr: this.dpr });
  }
}
