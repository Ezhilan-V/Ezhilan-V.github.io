import { Component, EventEmitter, HostListener, Output } from '@angular/core';

interface BranchNode {
  slug: string;
  label: string;
  icon: string;
  description: string;
  angleDeg: number;
  active: boolean;
  hue: string;
  subBranches: string[];
}

@Component({
  standalone: false,
  selector: 'learn-branches-diagram',
  templateUrl: './branches-diagram.component.html',
  styleUrls: ['./branches-diagram.component.scss']
})
export class BranchesDiagramComponent {
  @Output() select = new EventEmitter<string>();

  // ── Top-level layout (6 canonical technical branches at 60° intervals) ──
  readonly cx = 250;
  readonly cy = 220;
  readonly hubR = 50;
  readonly orbitR = 162;
  readonly nodeR = 34;
  readonly labelOffset = 14;

  // ── Drill-down layout ───────────────────────────────
  readonly subOrbitR = 150;
  readonly subNodeR = 18;
  readonly subLabelOffset = 16;
  readonly centreR = 62;             // central selected branch radius (drill-down)

  hoveredSlug: string | null = null;
  hoveredSubIdx: number | null = null;
  selectedSlug: string | null = null;

  /** Applied + setup branches NOT on the central diagram - rendered as pills below. */
  readonly appliedPills = [
    { slug: 'manipulation',         label: 'Manipulation',  icon: 'fa-hand-paper',     hue: '#38bdf8' },
    { slug: 'navigation',           label: 'Navigation',    icon: 'fa-compass',        hue: '#34d399' },
    { slug: 'amr',                  label: 'AMR',           icon: 'fa-truck-fast',     hue: '#818cf8' },
    { slug: 'autonomous-vehicles',  label: 'AV',            icon: 'fa-car-side',       hue: '#2dd4bf' },
    { slug: 'drones',               label: 'Drones',        icon: 'fa-helicopter',     hue: '#a3e635' },
    { slug: 'multi-robot',          label: 'Multi-robot',   icon: 'fa-network-wired',  hue: '#ec4899' },
    { slug: 'compute',              label: 'Compute',       icon: 'fa-microchip',      hue: '#fb923c' },
    { slug: 'surgical',             label: 'Surgical',      icon: 'fa-stethoscope',    hue: '#f472b6' },
    { slug: 'agricultural',         label: 'Agricultural',  icon: 'fa-tractor',        hue: '#84cc16' },
    { slug: 'industrial',           label: 'Industrial',    icon: 'fa-industry',       hue: '#fb923c' }
  ];

  /** 6 canonical technical branches around the hub. Applied branches live in the sidebar. */
  readonly nodes: BranchNode[] = [
    {
      slug: 'mechanical-design', label: 'Mechanical', icon: 'fa-gears',
      description: 'Bodies, joints, kinematics, dynamics',
      angleDeg: -90, active: true, hue: '#94a3b8',
      subBranches: [
        'Rigid-body mechanics',
        'Joints & actuators',
        'Forward kinematics',
        'Inverse kinematics',
        'Robot dynamics',
        'URDF / xacro',
        'Frames & rotations',
        'End-effectors',
        'Mechanical design process'
      ]
    },
    {
      slug: 'sensors', label: 'Perception', icon: 'fa-broadcast-tower',
      description: 'Sensors + sensing the world',
      angleDeg: -30, active: true, hue: '#22d3ee',
      subBranches: [
        'Cameras (RGB/RGBD/event)',
        'LiDAR (2D/3D/solid-state)',
        'IMU (accel/gyro/mag)',
        'Joint encoders',
        'Force / torque / tactile',
        'GPS / GNSS / RTK',
        'mmWave radar',
        'Bus protocols (CAN, EtherCAT)',
        'Calibration',
        'Time synchronization'
      ]
    },
    {
      slug: 'computer-vision', label: 'Computer Vision', icon: 'fa-eye',
      description: 'Pixels → geometry, objects, semantics',
      angleDeg: 30, active: true, hue: '#a78bfa',
      subBranches: [
        '2D image processing',
        '3D vision (stereo, depth)',
        'Object detection',
        'Semantic segmentation',
        'Visual SLAM',
        'Optical flow',
        '6-DoF pose estimation',
        'Visual servoing'
      ]
    },
    {
      slug: 'control-systems', label: 'Control', icon: 'fa-sliders',
      description: 'Feedback loops + planners',
      angleDeg: 90, active: true, hue: '#f43f5e',
      subBranches: [
        'Feedback fundamentals',
        'PID control',
        'State-space + LQR',
        'Model predictive control',
        'Force / impedance / admittance',
        'Motion planning',
        'Trajectory generation',
        'ros2_control framework',
        'Real-time control'
      ]
    },
    {
      slug: 'ai-ml', label: 'AI / ML', icon: 'fa-brain',
      description: 'Robots that learn from data',
      angleDeg: 150, active: true, hue: '#fb7185',
      subBranches: [
        'Reinforcement learning',
        'Imitation learning',
        'Sim-to-real',
        'Vision-Language Models',
        'Vision-Language-Action',
        'LLM planners',
        'World models',
        'Foundation models',
        'Robot datasets'
      ]
    },
    {
      slug: 'hri', label: 'HRI', icon: 'fa-handshake',
      description: 'Where robots meet humans',
      angleDeg: 210, active: true, hue: '#d946ef',
      subBranches: [
        'Shared autonomy',
        'Natural language',
        'Gesture & pose',
        'Cobot safety (ISO 10218)',
        'Teleoperation',
        'Haptic feedback',
        'Social robots',
        'Trust calibration',
        'Research methods'
      ]
    }
  ];

  // ── geometry ────────────────────────────────────────

  pos(angleDeg: number, r = this.orbitR) {
    const a = (angleDeg * Math.PI) / 180;
    return { x: this.cx + r * Math.cos(a), y: this.cy + r * Math.sin(a) };
  }

  labelPos(node: BranchNode) {
    return this.pos(node.angleDeg, this.orbitR + this.nodeR + this.labelOffset);
  }

  /** Sub-branch i's angle when its parent is selected */
  subAngle(i: number, total: number): number {
    return -90 + (360 / total) * i;
  }
  subPos(i: number, total: number, r = this.subOrbitR) {
    return this.pos(this.subAngle(i, total), r);
  }
  subLabelPos(i: number, total: number) {
    return this.pos(this.subAngle(i, total), this.subOrbitR + this.subNodeR + this.subLabelOffset);
  }

  // ── state ───────────────────────────────────────────

  hover(slug: string | null) { this.hoveredSlug = slug; }
  hoverSub(idx: number | null) { this.hoveredSubIdx = idx; }

  isHovered(slug: string)   { return this.hoveredSlug === slug; }
  isDimmed(slug: string)    {
    if (this.selectedSlug !== null) return slug !== this.selectedSlug;
    return this.hoveredSlug !== null && this.hoveredSlug !== slug;
  }

  get hovered() { return this.nodes.find(n => n.slug === this.hoveredSlug) || null; }
  get selected() { return this.nodes.find(n => n.slug === this.selectedSlug) || null; }

  /** Click on a top-level branch - drills in (does NOT navigate). */
  drillIn(node: BranchNode, ev?: Event) {
    ev?.stopPropagation();
    if (!node.active) return;
    this.selectedSlug = node.slug;
    this.hoveredSlug = null;
    this.hoveredSubIdx = null;
  }

  /** Click on the central selected branch - navigates to its guide. */
  openSelected() {
    const s = this.selected;
    if (s && s.active) this.select.emit(s.slug);
  }

  /** Click on an applied-branch pill - jumps directly to that branch. */
  selectApplied(slug: string) {
    this.select.emit(slug);
  }

  /** Click on the back button or backdrop - exits drill-down. */
  drillOut(ev?: Event) {
    ev?.stopPropagation();
    this.selectedSlug = null;
    this.hoveredSlug = null;
    this.hoveredSubIdx = null;
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.selectedSlug) this.drillOut(); }
}
