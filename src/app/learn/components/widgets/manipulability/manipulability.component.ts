import { Component, NgZone } from '@angular/core';
import { WidgetCanvasReady, WidgetCanvasResize } from '../../widget-kit/widget-shell.component';

@Component({
  standalone: false,
  selector: 'learn-manipulability',
  template: `
    <learn-widget-shell title="Manipulability ellipsoid"
                        subtitle="A 2-link planar arm. The pink ellipse shows how easily the end-effector can move in each direction. It collapses near singularities (arm fully extended) — directions of low manipulability are where Jacobian becomes ill-conditioned and small joint speeds produce huge end-effector motion (or none)."
                        accent="#fb7185"
                        [ratio]="0.7"
                        [showPause]="true"
                        [showReset]="true"
                        (canvasReady)="onCanvasReady($event)"
                        (canvasResize)="onCanvasResize($event)"
                        (pausedChange)="paused = $event"
                        (resetClick)="reset()">
      <div class="m-controls">
        <learn-slider label="Joint 1 (deg)" [min]="-90" [max]="180" [step]="1" [value]="q1" (valueChange)="q1 = $event"></learn-slider>
        <learn-slider label="Joint 2 (deg)" [min]="-170" [max]="170" [step]="1" [value]="q2" (valueChange)="q2 = $event"></learn-slider>
      </div>
    </learn-widget-shell>
  `,
  styles: [`.m-controls { display:flex; flex-direction:column; gap:0.5rem; padding:0.7rem 0.85rem; }`]
})
export class ManipulabilityComponent {
  q1 = 45;
  q2 = 60;
  paused = false;
  L1 = 1.4;
  L2 = 1.2;

  private ctx?: CanvasRenderingContext2D;
  private cssW = 0; private cssH = 0; private dpr = 1;
  private rafId?: number;

  constructor(private zone: NgZone) {}

  reset() { this.q1 = 45; this.q2 = 60; }

  onCanvasReady(e: WidgetCanvasReady) {
    this.ctx = e.ctx;
    this.zone.runOutsideAngular(() => this.tick());
  }
  onCanvasResize(e: WidgetCanvasResize) { this.cssW = e.cssW; this.cssH = e.cssH; this.dpr = e.dpr; }

  private tick = () => {
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private draw() {
    const ctx = this.ctx; if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr, H = this.cssH * this.dpr, dpr = this.dpr;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320'); bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const cx = W * 0.32, cy = H * 0.65;
    const scale = Math.min(W, H) / 4.2;

    const t1 = this.q1 * Math.PI / 180;
    const t2 = this.q2 * Math.PI / 180;

    // Forward kinematics
    const j2x = cx + this.L1 * Math.cos(t1) * scale;
    const j2y = cy - this.L1 * Math.sin(t1) * scale;
    const eex = j2x + this.L2 * Math.cos(t1 + t2) * scale;
    const eey = j2y - this.L2 * Math.sin(t1 + t2) * scale;

    // Jacobian (planar 2-link, in m)
    // J = [[-L1 s1 - L2 s12, -L2 s12], [L1 c1 + L2 c12, L2 c12]]
    const s1 = Math.sin(t1), c1 = Math.cos(t1);
    const s12 = Math.sin(t1 + t2), c12 = Math.cos(t1 + t2);
    const J11 = -this.L1 * s1 - this.L2 * s12;
    const J12 = -this.L2 * s12;
    const J21 = this.L1 * c1 + this.L2 * c12;
    const J22 = this.L2 * c12;
    // M = J J^T
    const M11 = J11 * J11 + J12 * J12;
    const M12 = J11 * J21 + J12 * J22;
    const M22 = J21 * J21 + J22 * J22;
    // Eigenvalues
    const tr = M11 + M22;
    const det = M11 * M22 - M12 * M12;
    const disc = Math.max(0, tr * tr / 4 - det);
    const e1 = tr / 2 + Math.sqrt(disc);
    const e2 = tr / 2 - Math.sqrt(disc);
    // Eigenvector for e1
    let vx, vy;
    if (Math.abs(M12) > 1e-6) { vx = e1 - M22; vy = M12; }
    else { vx = 1; vy = 0; }
    const vn = Math.hypot(vx, vy); vx /= vn; vy /= vn;
    const angle = Math.atan2(vy, vx);
    // manipulability = sqrt(det(JJ^T))
    const mu = Math.sqrt(Math.max(0, det));

    // Workspace circle (max reach)
    ctx.strokeStyle = 'rgba(148,163,184,0.18)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, (this.L1 + this.L2) * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Manipulability ellipse at end-effector
    const ellipseScale = scale * 0.5; // visualisation scale
    const a = Math.sqrt(e1) * ellipseScale;
    const b = Math.sqrt(e2) * ellipseScale;
    ctx.save();
    ctx.translate(eex, eey);
    ctx.rotate(-angle);
    ctx.fillStyle = 'rgba(251,113,133,0.22)';
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Arm
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(j2x, j2y);
    ctx.stroke();
    ctx.strokeStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(j2x, j2y); ctx.lineTo(eex, eey);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Joints
    [[cx, cy], [j2x, j2y]].forEach(([x, y]) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(x, y, 7 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2 * dpr; ctx.stroke();
    });
    ctx.fillStyle = '#fb7185';
    ctx.beginPath(); ctx.arc(eex, eey, 6 * dpr, 0, Math.PI * 2); ctx.fill();

    // HUD
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${11 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`q1=${this.q1.toFixed(0)}°  q2=${this.q2.toFixed(0)}°`, 12 * dpr, 18 * dpr);
    ctx.fillText(`μ = √det(JJᵀ) = ${mu.toFixed(3)}`, 12 * dpr, 36 * dpr);
    ctx.fillText(`σ_max/σ_min = ${(Math.sqrt(e1 / Math.max(e2, 1e-6))).toFixed(2)}`, 12 * dpr, 54 * dpr);

    if (mu < 0.05) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('⚠ near singularity', 12 * dpr, 72 * dpr);
    }
  }
}
