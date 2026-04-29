import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

type BtType = 'sequence' | 'fallback' | 'action' | 'condition';
type BtStatus = 'idle' | 'running' | 'success' | 'failure';

interface BtNode {
  id: string; type: BtType; label: string;
  children?: BtNode[];
  status: BtStatus;
  outcome: BtStatus; // pre-scripted outcome for action/condition
}

@Component({
  standalone: false,
  selector: 'learn-behavior-tree',
  template: `
    <learn-widget-shell title="Behaviour tree — pick & place"
                        subtitle="Watch the tick traverse the tree at 1 Hz. Sequence (→) requires every child to succeed. Fallback (?) succeeds when any child does. Green = success, red = failure, amber = currently running. The whole tree re-ticks every cycle until the root succeeds."
                        accent="#a78bfa"
                        [ratio]="0.7"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="bt-controls">
        <learn-slider label="Tick rate (Hz)" [min]="0.5" [max]="4.0" [step]="0.1" [value]="rateHz" (valueChange)="rateHz = $event"></learn-slider>
        <learn-presets [presets]="scenarios" [active]="scenario" (select)="setScenario($any($event))"></learn-presets>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.bt-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class BehaviorTreeComponent {
  rateHz = 1.5;
  paused = false;
  scenario: 'success' | 'fail' | 'mixed' = 'success';

  scenarios = [
    { id: 'success', label: 'All ok' },
    { id: 'fail', label: 'No object' },
    { id: 'mixed', label: 'Retry' }
  ];

  private root!: BtNode;
  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;
  private elapsed = 0;
  private lastTs = 0;
  private tickIdx = 0;

  constructor(private zone: NgZone) { this.buildTree(); }

  setScenario(s: string) {
    this.scenario = s as any;
    this.buildTree();
    this.reset();
  }

  reset() {
    this.tickIdx = 0;
    this.elapsed = 0;
    this.markIdle(this.root);
  }

  private buildTree() {
    const action = (label: string, outcome: BtStatus = 'success'): BtNode =>
      ({ id: label, type: 'action', label, status: 'idle', outcome });
    const cond = (label: string, outcome: BtStatus = 'success'): BtNode =>
      ({ id: label, type: 'condition', label, status: 'idle', outcome });
    const seq = (label: string, ...children: BtNode[]): BtNode =>
      ({ id: label, type: 'sequence', label, status: 'idle', outcome: 'idle', children });
    const fb = (label: string, ...children: BtNode[]): BtNode =>
      ({ id: label, type: 'fallback', label, status: 'idle', outcome: 'idle', children });

    if (this.scenario === 'success') {
      this.root = seq('PickAndPlace',
        cond('ObjectVisible'),
        seq('Approach', action('PlanPath'), action('FollowPath')),
        action('Grasp'),
        action('Place')
      );
    } else if (this.scenario === 'fail') {
      this.root = seq('PickAndPlace',
        cond('ObjectVisible', 'failure'),
        seq('Approach', action('PlanPath'), action('FollowPath')),
        action('Grasp'),
        action('Place')
      );
    } else {
      this.root = seq('PickAndPlace',
        fb('FindObject', cond('ObjectVisible', 'failure'), action('Search')),
        seq('Approach', action('PlanPath'), action('FollowPath')),
        action('Grasp'),
        action('Place')
      );
    }
  }

  private markIdle(n: BtNode) {
    n.status = 'idle';
    n.children?.forEach(c => this.markIdle(c));
  }

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
      this.elapsed += dt;
      const interval = 1 / this.rateHz;
      if (this.elapsed > interval) {
        this.elapsed = 0;
        this.advance();
      }
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  // Step through tick visually: show one node per advance
  private order: BtNode[] = [];
  private orderIdx = 0;
  private completedRoot: BtStatus = 'idle';

  private advance() {
    if (this.orderIdx >= this.order.length || this.completedRoot !== 'idle') {
      this.markIdle(this.root);
      this.order = [];
      this.evaluate(this.root);
      this.completedRoot = this.root.status;
      // Reset all to idle then walk through ordered nodes
      this.markIdle(this.root);
      this.orderIdx = 0;
      this.tickIdx++;
    }
    const node = this.order[this.orderIdx];
    if (!node) return;
    node.status = node.type === 'action' || node.type === 'condition' ? node.outcome : 'running';
    // Propagate parent status update
    this.recomputeParents(this.root);
    this.orderIdx++;
    if (this.orderIdx >= this.order.length) {
      // After last step, set parent statuses to final
      this.evaluate(this.root);
      this.completedRoot = this.root.status;
    }
  }

  private evaluate(n: BtNode): BtStatus {
    if (n.type === 'action' || n.type === 'condition') {
      n.status = n.outcome;
      this.order.push(n);
      return n.outcome;
    }
    if (n.type === 'sequence') {
      n.status = 'running';
      this.order.push(n);
      for (const c of n.children!) {
        const s = this.evaluate(c);
        if (s !== 'success') { n.status = s; return s; }
      }
      n.status = 'success';
      return 'success';
    }
    if (n.type === 'fallback') {
      n.status = 'running';
      this.order.push(n);
      for (const c of n.children!) {
        const s = this.evaluate(c);
        if (s !== 'failure') { n.status = s; return s; }
      }
      n.status = 'failure';
      return 'failure';
    }
    return 'idle';
  }

  private recomputeParents(n: BtNode): BtStatus {
    if (!n.children) return n.status;
    if (n.children.every(c => c.status === 'idle')) return n.status;
    let derived: BtStatus = 'running';
    if (n.type === 'sequence') {
      let any = false;
      for (const c of n.children) {
        const s = this.recomputeParents(c);
        if (s === 'failure') { derived = 'failure'; break; }
        if (s === 'idle') { derived = 'running'; break; }
        if (s === 'running') { derived = 'running'; any = true; break; }
        if (s === 'success') any = true;
      }
      if (!any) derived = 'idle';
      else if (n.children.every(c => c.status === 'success')) derived = 'success';
    } else if (n.type === 'fallback') {
      let any = false;
      for (const c of n.children) {
        const s = this.recomputeParents(c);
        if (s === 'success') { derived = 'success'; break; }
        if (s === 'idle') { derived = 'running'; break; }
        if (s === 'running') { derived = 'running'; any = true; break; }
        if (s === 'failure') any = true;
      }
      if (!any) derived = 'idle';
      else if (n.children.every(c => c.status === 'failure')) derived = 'failure';
    }
    if (n.status !== 'idle' || derived !== 'idle') n.status = derived;
    return n.status;
  }

  // Layout: assign positions on canvas
  private layout(n: BtNode, x: number, y: number, dx: number, depth: number): { width: number; positions: Map<string, { x: number; y: number; depth: number }> } {
    const positions = new Map<string, { x: number; y: number; depth: number }>();
    if (!n.children || n.children.length === 0) {
      positions.set(n.id, { x, y, depth });
      return { width: 1, positions };
    }
    let cumX = x;
    let totalW = 0;
    const childInfos: { positions: Map<string, { x: number; y: number; depth: number }>; width: number }[] = [];
    for (const c of n.children) {
      const info = this.layout(c, cumX, y + dx, dx, depth + 1);
      childInfos.push(info);
      info.positions.forEach((v, k) => positions.set(k, v));
      cumX += info.width * dx;
      totalW += info.width;
    }
    // center this node above its children
    const firstChild = n.children[0];
    const lastChild = n.children[n.children.length - 1];
    const fp = positions.get(firstChild.id)!;
    const lp = positions.get(lastChild.id)!;
    positions.set(n.id, { x: (fp.x + lp.x) / 2, y, depth });
    return { width: totalW, positions };
  }

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const leafCount = this.countLeaves(this.root);
    const dx = W / Math.max(leafCount, 1);
    const layoutInfo = this.layout(this.root, dx / 2, 50 * dpr, dx, 0);
    const verticalGap = 70 * dpr;
    layoutInfo.positions.forEach((v) => {
      v.y = 40 * dpr + v.depth * verticalGap;
    });

    // Edges
    this.forEach(this.root, (n) => {
      const p = layoutInfo.positions.get(n.id)!;
      n.children?.forEach(c => {
        const cp = layoutInfo.positions.get(c.id)!;
        ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 14 * dpr);
        ctx.lineTo(cp.x, cp.y - 14 * dpr);
        ctx.stroke();
      });
    });

    // Nodes
    this.forEach(this.root, (n) => {
      const p = layoutInfo.positions.get(n.id)!;
      const color = this.statusColor(n.status);
      const isLeaf = !n.children || n.children.length === 0;
      const w = isLeaf ? 78 * dpr : 36 * dpr;
      const h = 28 * dpr;
      ctx.fillStyle = color + '22';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      this.roundRect(ctx, p.x - w / 2, p.y - h / 2, w, h, 8 * dpr);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbol = n.type === 'sequence' ? '→' : n.type === 'fallback' ? '?' : (n.type === 'condition' ? '◇' : '');
      const text = isLeaf ? n.label : symbol;
      ctx.fillText(text, p.x, p.y);
    });
    ctx.textBaseline = 'alphabetic';

    // HUD
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`tick #${this.tickIdx}  rate ${this.rateHz.toFixed(1)} Hz`, 12 * dpr, H - 12 * dpr);
  }

  private countLeaves(n: BtNode): number {
    if (!n.children || n.children.length === 0) return 1;
    return n.children.reduce((a, c) => a + this.countLeaves(c), 0);
  }

  private forEach(n: BtNode, fn: (n: BtNode) => void) {
    fn(n);
    n.children?.forEach(c => this.forEach(c, fn));
  }

  private statusColor(s: BtStatus) {
    return s === 'success' ? '#34d399'
         : s === 'failure' ? '#fb7185'
         : s === 'running' ? '#fbbf24'
         : '#475569';
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
