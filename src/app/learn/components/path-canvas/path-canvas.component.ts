import {
  AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy,
  Output, ViewChild
} from '@angular/core';

interface PathNode {
  id: string;            // branch slug or '*'
  label: string;         // short label
  layer: number;         // 0=prereq, 1=foundations, 2=technical, 3=applied
  layerLane?: number;    // optional fixed lane in the layer
  icon: string;          // FA class
  accent: string;
}

interface PathEdge {
  from: string;
  to: string;
}

const NODES: PathNode[] = [
  // Layer 0 - prerequisites
  { id: 'foundations',         label: 'Foundations',    layer: 0, icon: 'fa-book-open',     accent: '#facc15' },
  { id: 'setup',               label: 'Setup',          layer: 0, icon: 'fa-rocket',        accent: '#fbbf24' },

  // Layer 1 - sensors / mechanical (the bedrock)
  { id: 'mechanical-design',   label: 'Mechanical',     layer: 1, icon: 'fa-gears',         accent: '#94a3b8' },
  { id: 'sensors',             label: 'Sensors',        layer: 1, icon: 'fa-broadcast-tower', accent: '#22d3ee' },

  // Layer 2 - technical core
  { id: 'computer-vision',     label: 'CV / Perception', layer: 2, icon: 'fa-eye',          accent: '#a78bfa' },
  { id: 'control-systems',     label: 'Control',        layer: 2, icon: 'fa-sliders',       accent: '#f43f5e' },
  { id: 'ai-ml',               label: 'AI / ML',        layer: 2, icon: 'fa-brain',         accent: '#fb7185' },
  { id: 'hri',                 label: 'HRI',            layer: 2, icon: 'fa-handshake',     accent: '#d946ef' },

  // Layer 3 - applied platforms
  { id: 'manipulation',        label: 'Manipulation',   layer: 3, icon: 'fa-hand-paper',    accent: '#38bdf8' },
  { id: 'navigation',          label: 'Navigation',     layer: 3, icon: 'fa-compass',       accent: '#34d399' },
  { id: 'amr',                 label: 'AMR',            layer: 3, icon: 'fa-truck-fast',    accent: '#818cf8' },
  { id: 'autonomous-vehicles', label: 'AV',             layer: 3, icon: 'fa-car-side',      accent: '#2dd4bf' },
  { id: 'drones',              label: 'Drones',         layer: 3, icon: 'fa-helicopter',    accent: '#a3e635' },
  { id: 'multi-robot',         label: 'Multi-robot',    layer: 3, icon: 'fa-network-wired', accent: '#ec4899' },
  { id: 'compute',             label: 'Compute',        layer: 3, icon: 'fa-microchip',     accent: '#fb923c' }
];

const EDGES: PathEdge[] = [
  // foundations / setup feed everything in layer 1
  { from: 'foundations', to: 'mechanical-design' },
  { from: 'foundations', to: 'sensors' },
  { from: 'setup',       to: 'mechanical-design' },
  { from: 'setup',       to: 'sensors' },

  // layer 1 -> layer 2
  { from: 'mechanical-design', to: 'control-systems' },
  { from: 'mechanical-design', to: 'computer-vision' },
  { from: 'sensors',           to: 'computer-vision' },
  { from: 'sensors',           to: 'control-systems' },
  { from: 'sensors',           to: 'ai-ml' },
  { from: 'mechanical-design', to: 'hri' },
  { from: 'computer-vision',   to: 'ai-ml' },

  // layer 2 -> layer 3
  { from: 'control-systems',  to: 'manipulation' },
  { from: 'computer-vision',  to: 'manipulation' },
  { from: 'ai-ml',            to: 'manipulation' },

  { from: 'computer-vision',  to: 'navigation' },
  { from: 'control-systems',  to: 'navigation' },

  { from: 'control-systems',  to: 'amr' },
  { from: 'ai-ml',            to: 'amr' },

  { from: 'computer-vision',  to: 'autonomous-vehicles' },
  { from: 'control-systems',  to: 'autonomous-vehicles' },
  { from: 'ai-ml',            to: 'autonomous-vehicles' },

  { from: 'control-systems',  to: 'drones' },
  { from: 'computer-vision',  to: 'drones' },

  { from: 'ai-ml',            to: 'multi-robot' },
  { from: 'hri',              to: 'multi-robot' },

  { from: 'mechanical-design', to: 'compute' },
  { from: 'sensors',           to: 'compute' }
];

interface NodeGeom extends PathNode { x: number; y: number; }

@Component({
  standalone: false,
  selector: 'learn-path-canvas',
  templateUrl: './path-canvas.component.html',
  styleUrls: ['./path-canvas.component.scss']
})
export class PathCanvasComponent implements AfterViewInit, OnDestroy {
  @Output() select = new EventEmitter<string>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stage',  { static: true }) stageRef!: ElementRef<HTMLDivElement>;

  hoverId: string | null = null;
  hoverLabel = '';
  hoverDesc = '';
  hoverPos = { x: 0, y: 0 };

  layerLabels = ['Prerequisites', 'Bedrock', 'Technical core', 'Applied platforms'];

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private nodeGeoms: NodeGeom[] = [];
  private resizeObs?: ResizeObserver;
  private rafFrame?: number;
  private lastTs = 0;
  private flowT = 0;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;
      this.resizeObs = new ResizeObserver(() => this.fit());
      this.resizeObs.observe(this.stageRef.nativeElement);
      this.fit();

      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) this.draw();
      else this.tick(0);
    });
  }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
    if (this.rafFrame) cancelAnimationFrame(this.rafFrame);
  }

  // ─── Layout ────────────────────────────────────────────────
  private fit() {
    const cv = this.canvasRef.nativeElement;
    const w = this.stageRef.nativeElement.clientWidth || 320;
    const h = Math.max(420, Math.min(560, w * 0.55));
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
    const layers = [0, 1, 2, 3];
    const layerCounts = layers.map(L => NODES.filter(n => n.layer === L).length);
    const cssW = this.cssW;
    const cssH = this.cssH;
    const padX = Math.max(48, cssW * 0.06);
    const padY = 40;
    const innerW = cssW - padX * 2;
    const innerH = cssH - padY * 2 - 28;

    const xByLayer = (L: number) => padX + (innerW * L) / 3;

    this.nodeGeoms = NODES.map(n => {
      const lc = layerCounts[n.layer];
      const idxInLayer = NODES.filter(m => m.layer === n.layer).indexOf(n);
      const lane = (idxInLayer + 0.5) / lc;
      const x = xByLayer(n.layer);
      const y = padY + 28 + innerH * lane;
      return { ...n, x, y };
    });
  }

  // ─── Animation loop ────────────────────────────────────────
  private tick = (ts: number) => {
    const dt = this.lastTs === 0 ? 0 : (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    this.flowT += dt;
    this.draw();
    this.rafFrame = requestAnimationFrame(this.tick);
  };

  // ─── Drawing ───────────────────────────────────────────────
  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;
    const dpr = this.dpr;

    // background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // layer band labels
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let L = 0; L < 4; L++) {
      const x = (this.cssW * 0.06 + ((this.cssW - this.cssW * 0.12) * L) / 3) * dpr;
      ctx.fillText(this.layerLabels[L].toUpperCase(), x, 12 * dpr);
    }

    // edges with animated flow
    for (const edge of EDGES) {
      const a = this.nodeGeoms.find(n => n.id === edge.from);
      const b = this.nodeGeoms.find(n => n.id === edge.to);
      if (!a || !b) continue;

      const isHot = this.hoverId !== null && (edge.from === this.hoverId || edge.to === this.hoverId);
      const x1 = a.x * dpr;
      const y1 = a.y * dpr;
      const x2 = b.x * dpr;
      const y2 = b.y * dpr;
      // bezier control points for a smooth left-to-right flow
      const dx = x2 - x1;
      const c1x = x1 + dx * 0.5;
      const c1y = y1;
      const c2x = x1 + dx * 0.5;
      const c2y = y2;

      ctx.strokeStyle = isHot ? 'rgba(56, 189, 248, 0.7)' : 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = (isHot ? 1.4 : 0.8) * dpr;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2);
      ctx.stroke();

      // animated dot along the edge
      const tt = (this.flowT * 0.4 + (Math.abs(x1 + y1) * 0.000111)) % 1;
      const p = bezierPoint(x1, y1, c1x, c1y, c2x, c2y, x2, y2, tt);
      ctx.fillStyle = isHot ? b.accent : 'rgba(56, 189, 248, 0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isHot ? 3.2 : 2) * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // nodes
    for (const n of this.nodeGeoms) {
      const isHover = this.hoverId === n.id;
      const r = (isHover ? 26 : 22) * dpr;
      const x = n.x * dpr;
      const y = n.y * dpr;

      ctx.fillStyle = isHover ? hexA(n.accent, 0.3) : hexA(n.accent, 0.16);
      ctx.beginPath();
      ctx.arc(x, y, r + 8 * dpr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a1320';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = n.accent;
      ctx.lineWidth = (isHover ? 2 : 1.2) * dpr;
      ctx.stroke();

      // label
      ctx.fillStyle = isHover ? n.accent : '#cbd5e1';
      ctx.font = `${(isHover ? 11 : 10) * dpr}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, x, y + r + 6 * dpr);
    }
  }

  // ─── Pointer ───────────────────────────────────────────────
  private pickNode(clientX: number, clientY: number): NodeGeom | null {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const n of this.nodeGeoms) {
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy <= 28 * 28) return n;
    }
    return null;
  }

  onMove(ev: MouseEvent) {
    const node = this.pickNode(ev.clientX, ev.clientY);
    const id = node ? node.id : null;
    if (id === this.hoverId) {
      if (id) {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.zone.run(() => this.hoverPos = { x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      }
      return;
    }
    this.zone.run(() => {
      this.hoverId = id;
      if (node) {
        this.hoverLabel = node.label;
        this.hoverDesc = describe(node.id);
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.hoverPos = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      } else {
        this.hoverLabel = '';
        this.hoverDesc = '';
      }
    });
  }

  onLeave() {
    if (this.hoverId !== null) {
      this.zone.run(() => { this.hoverId = null; this.hoverLabel = ''; this.hoverDesc = ''; });
    }
  }

  onClick(ev: MouseEvent) {
    const node = this.pickNode(ev.clientX, ev.clientY);
    if (node) this.select.emit(node.id);
  }
}

function bezierPoint(
  x1: number, y1: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  x2: number, y2: number,
  t: number
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

function describe(id: string): string {
  const map: Record<string, string> = {
    foundations:           'The math + code prereqs every robotics text assumes you know.',
    setup:                 'Install ROS 2, the simulators, and the dev tools.',
    'mechanical-design':   'Bodies, joints, kinematics, URDF - the physical robot.',
    sensors:               'Cameras, LiDAR, IMU - what the robot can perceive.',
    'computer-vision':     'Pixels and depth into a description of the world.',
    'control-systems':     'PID, MPC, real-time loops - turning plans into motion.',
    'ai-ml':               'RL, imitation, VLMs, VLAs - robots that learn.',
    hri:                   'How robots and humans share space, intent, and trust.',
    manipulation:          'Arms, hands, IK, MoveIt, grasping.',
    navigation:            'Maps, localization, planners, costmaps.',
    amr:                   'Autonomous mobile robots: fleets, VDA 5050, WMS.',
    'autonomous-vehicles': 'Self-driving cars: SAE levels, BEV, ISO 26262.',
    drones:                'Aerial robots: dynamics, autopilots, MAVLink.',
    'multi-robot':         'Coordinating fleets: MAPF, swarm, multi-SLAM.',
    compute:               'Onboard compute, GPUs, real-time, networking.'
  };
  return map[id] ?? '';
}
