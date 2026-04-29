import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const IMG_W = 640;
const IMG_H = 480;
const CX = IMG_W / 2;
const CY = IMG_H / 2;

@Component({
  standalone: false,
  selector: 'learn-pinhole-camera',
  templateUrl: './pinhole-camera.component.html',
  styleUrls: ['./pinhole-camera.component.scss']
})
export class PinholeCameraComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) host!: ElementRef<HTMLDivElement>;
  @ViewChild('preview',    { static: true }) preview!: ElementRef<HTMLCanvasElement>;

  /** Focal length in pixels (display only - converted to 3D-scale below). */
  f = 500;
  /** 3D point in camera frame (meters). */
  X = 0.6;
  Y = -0.2;   // up is -Y in OpenCV-style camera frame; we'll show with +Y up though
  Z = 1.6;

  /** Resulting projected pixel. */
  u = 0;
  v = 0;
  inBounds = true;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private rafId?: number;
  private resizeObs?: ResizeObserver;

  // Virtual pinhole camera + scene objects
  private vCamGroup?: THREE.Group;     // wireframe pyramid representing the camera
  private vCamFrustum?: THREE.LineSegments;
  private vImagePlane?: THREE.Mesh;
  private pointSphere?: THREE.Mesh;
  private projectionRay?: THREE.Line;
  private projectionDot?: THREE.Mesh;

  // 2D preview canvas
  private pCtx?: CanvasRenderingContext2D;
  private pDpr = 1;

  // Drag state for the 3D point
  private raycaster = new THREE.Raycaster();
  private dragging = false;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  constructor(private zone: NgZone) {}

  // ─── lifecycle ─────────────────────────────────────────
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => this.init());
    this.fitPreview();
    this.compute();
    this.drawPreview();
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    if (this.renderer && this.host?.nativeElement.contains(this.renderer.domElement)) {
      this.host.nativeElement.removeChild(this.renderer.domElement);
    }
    this.scene?.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      if (mat) {
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else mat.dispose();
      }
    });
  }

  // ─── controls ──────────────────────────────────────────
  onSlider(field: 'f' | 'X' | 'Y' | 'Z', raw: any) {
    (this as any)[field] = +raw;
    this.compute();
    this.applyToScene();
    this.drawPreview();
  }

  reset() {
    this.f = 500; this.X = 0.6; this.Y = -0.2; this.Z = 1.6;
    this.compute();
    this.applyToScene();
    this.drawPreview();
  }

  // ─── projection math ───────────────────────────────────
  private compute() {
    if (this.Z <= 0.01) {
      this.u = NaN; this.v = NaN; this.inBounds = false;
      return;
    }
    this.u = this.f * this.X / this.Z + CX;
    this.v = this.f * this.Y / this.Z + CY;
    this.inBounds = this.u >= 0 && this.u <= IMG_W && this.v >= 0 && this.v <= IMG_H;
  }

  /** Convert pixel focal length to a sensible 3D-scene length so the frustum scales reasonably. */
  private fScene(): number {
    /* Map f ∈ [100, 1500] to 3D distance ∈ [0.4, 1.6] meters. */
    return 0.4 + ((this.f - 100) / 1400) * 1.2;
  }

  /** Image plane half-extents in 3D, derived from f and image size. */
  private imageHalfWidth() { return (IMG_W / 2) / this.f * this.fScene(); }
  private imageHalfHeight() { return (IMG_H / 2) / this.f * this.fScene(); }

  // ─── three.js init ─────────────────────────────────────
  private init() {
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.05, 50);
    this.camera.position.set(2.4, 1.5, 2.6);
    this.camera.lookAt(0, 0.5, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 8;
    this.controls.target.set(0, 0.5, 1);

    this.addLights();
    this.addGround();
    this.buildScene();
    this.buildPinhole();
    this.buildPoint();
    this.applyToScene();

    // Drag handling for the 3D point
    const cv = this.renderer.domElement;
    cv.addEventListener('pointerdown', this.onPointerDown);
    cv.addEventListener('pointermove', this.onPointerMove);
    cv.addEventListener('pointerup',   this.onPointerUp);
    cv.addEventListener('pointerleave', this.onPointerUp);

    this.resizeObs = new ResizeObserver(() => { this.onResize(); this.fitPreview(); this.drawPreview(); });
    this.resizeObs.observe(el);

    const tick = () => {
      this.controls?.update();
      this.renderer!.render(this.scene!, this.camera!);
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  private onResize() {
    if (!this.renderer || !this.camera) return;
    const el = this.host.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private addLights() {
    this.scene!.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 4, 2);
    this.scene!.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rim.position.set(-3, 3, -3);
    this.scene!.add(rim);
  }

  private addGround() {
    const grid = new THREE.GridHelper(8, 16, 0x38bdf8, 0x1e293b);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.001;
    this.scene!.add(grid);

    const axes = new THREE.AxesHelper(0.4);
    (axes.material as THREE.Material).transparent = true;
    (axes.material as THREE.Material).opacity = 0.85;
    this.scene!.add(axes);
  }

  /**
   * A few cubes / spheres at varied depths so the user has a real "scene" the
   * camera is looking at.
   */
  private buildScene() {
    const colors = [0x38bdf8, 0xa78bfa, 0x34d399, 0xfbbf24, 0xfb7185];
    for (let i = 0; i < 5; i++) {
      const geom = i % 2 === 0
        ? new THREE.BoxGeometry(0.18, 0.18, 0.18)
        : new THREE.SphereGeometry(0.11, 24, 18);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.55,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        -0.6 + Math.random() * 1.2,
        0.15 + Math.random() * 0.6,
        1.2 + Math.random() * 1.4
      );
      this.scene!.add(mesh);
    }
  }

  private buildPinhole() {
    /* Camera origin at world (0, 0.5, 0), looking down +Z. */
    const cam = new THREE.Group();
    cam.position.set(0, 0.5, 0);
    this.scene!.add(cam);
    this.vCamGroup = cam;

    // Camera body: a small pyramid opening forward
    const bodyGeom = new THREE.ConeGeometry(0.08, 0.16, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4, metalness: 0.4 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.06;
    cam.add(body);

    // Up arrow on the body for orientation
    const up = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x34d399 })
    );
    up.position.set(0, 0.07, -0.04);
    cam.add(up);

    // Frustum lines + image-plane quad - both rebuilt from focal length
    const frustum = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.7 })
    );
    cam.add(frustum);
    this.vCamFrustum = frustum;

    const planeGeom = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.12, side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    cam.add(plane);
    this.vImagePlane = plane;

    // Dot on the image plane at the projection
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x713f12, emissiveIntensity: 0.6 })
    );
    cam.add(dot);
    this.projectionDot = dot;
  }

  private buildPoint() {
    // 3D point - draggable, in world coords
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0x9f1239, emissiveIntensity: 0.55 })
    );
    this.scene!.add(sphere);
    this.pointSphere = sphere;

    // Halo
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.085, 24),
      new THREE.MeshBasicMaterial({ color: 0xfb7185, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    sphere.add(ring);

    // Ray from camera origin to point
    const rayMat = new THREE.LineDashedMaterial({
      color: 0xfb7185, dashSize: 0.04, gapSize: 0.04, transparent: true, opacity: 0.55
    });
    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3()
    ]);
    const ray = new THREE.Line(rayGeom, rayMat);
    ray.computeLineDistances();
    this.scene!.add(ray);
    this.projectionRay = ray;
  }

  /** Re-position frustum, image plane, dot and ray based on current state. */
  private applyToScene() {
    if (!this.vCamFrustum || !this.vImagePlane || !this.pointSphere || !this.projectionRay || !this.projectionDot) return;

    const fS = this.fScene();
    const hw = this.imageHalfWidth();
    const hh = this.imageHalfHeight();

    // Frustum lines from camera origin through the 4 corners of the image plane and beyond
    const corners = [
      new THREE.Vector3(-hw, -hh, fS),
      new THREE.Vector3( hw, -hh, fS),
      new THREE.Vector3( hw,  hh, fS),
      new THREE.Vector3(-hw,  hh, fS)
    ];
    const farK = 2.4;   // extend past image plane
    const segs: THREE.Vector3[] = [];
    // Origin to corners
    for (const c of corners) {
      segs.push(new THREE.Vector3(0, 0, 0));
      segs.push(c.clone().multiplyScalar(farK));
    }
    // Image plane rectangle
    for (let i = 0; i < 4; i++) {
      segs.push(corners[i].clone());
      segs.push(corners[(i + 1) % 4].clone());
    }
    this.vCamFrustum.geometry.dispose();
    this.vCamFrustum.geometry = new THREE.BufferGeometry().setFromPoints(segs);

    // Image plane quad
    this.vImagePlane.scale.set(hw * 2, hh * 2, 1);
    this.vImagePlane.position.set(0, 0, fS);

    // Place the 3D point in world coords. Camera origin at (0, 0.5, 0), so
    // world = camera_origin + (X, -Y, Z)  (we render with +Y up but pinhole +Y is down,
    // so flip Y for the world position).
    const worldPos = new THREE.Vector3(this.X, 0.5 - this.Y, this.Z);
    this.pointSphere.position.copy(worldPos);

    // Update ray from cam origin to point
    const rayPositions = (this.projectionRay.geometry as THREE.BufferGeometry)
      .attributes.position as THREE.BufferAttribute;
    rayPositions.setXYZ(0, 0, 0.5, 0);
    rayPositions.setXYZ(1, worldPos.x, worldPos.y, worldPos.z);
    rayPositions.needsUpdate = true;
    (this.projectionRay as any).computeLineDistances?.();

    // Project onto image plane (in camera local frame): u_local = f_scene * X / Z, v_local = f_scene * (-Y) / Z
    if (this.Z > 0.01) {
      const uLocal = fS * this.X / this.Z;
      const vLocal = fS * this.Y / this.Z;   // (note Y already flipped sign convention)
      this.projectionDot.position.set(uLocal, -vLocal, fS);
      this.projectionDot.visible = this.inBounds;
    } else {
      this.projectionDot.visible = false;
    }
  }

  // ─── pointer drag for the 3D point ─────────────────────
  private onPointerDown = (ev: PointerEvent) => {
    if (!this.pointSphere || !this.camera || !this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.pointSphere, false);
    if (!hits.length) return;
    ev.stopPropagation();
    if (this.controls) this.controls.enabled = false;
    this.dragging = true;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.dragPlane.setFromNormalAndCoplanarPoint(camDir, this.pointSphere.position);
  };

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.dragging || !this.camera || !this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, hit)) return;
    // Convert world → pinhole-camera-frame:
    // X = world.x; Y = (camOrigin.y - world.y) where cam origin = 0.5; Z = world.z
    this.X = clamp(hit.x, -2, 2);
    this.Y = clamp(0.5 - hit.y, -2, 2);
    this.Z = clamp(hit.z, 0.1, 6);
    this.compute();
    this.applyToScene();
    this.drawPreview();
    this.zone.run(() => {
      this.X = +this.X.toFixed(2);
      this.Y = +this.Y.toFixed(2);
      this.Z = +this.Z.toFixed(2);
    });
  };

  private onPointerUp = () => {
    this.dragging = false;
    if (this.controls) this.controls.enabled = true;
  };

  // ─── 2D image preview canvas ───────────────────────────
  private fitPreview() {
    const cv = this.preview.nativeElement;
    const parent = cv.parentElement!;
    const w = parent.clientWidth || 220;
    const h = w * (IMG_H / IMG_W);
    this.pDpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * this.pDpr;
    cv.height = h * this.pDpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    this.pCtx = cv.getContext('2d')!;
  }

  private drawPreview() {
    if (!this.pCtx) return;
    const ctx = this.pCtx;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const sx = W / IMG_W;
    const sy = H / IMG_H;
    const dpr = this.pDpr;

    ctx.clearRect(0, 0, W, H);

    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#0a1320');
    grd.addColorStop(1, '#050810');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    for (let x = 80; x < IMG_W; x += 80) { ctx.moveTo(x * sx, 0); ctx.lineTo(x * sx, H); }
    for (let y = 80; y < IMG_H; y += 80) { ctx.moveTo(0, y * sy); ctx.lineTo(W, y * sy); }
    ctx.stroke();

    // border
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // principal point
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.beginPath();
    ctx.moveTo(CX * sx - 6 * dpr, CY * sy);
    ctx.lineTo(CX * sx + 6 * dpr, CY * sy);
    ctx.moveTo(CX * sx, CY * sy - 6 * dpr);
    ctx.lineTo(CX * sx, CY * sy + 6 * dpr);
    ctx.stroke();

    // projected pixel
    if (this.inBounds && !isNaN(this.u)) {
      const px = this.u * sx;
      const py = this.v * sy;

      const glow = ctx.createRadialGradient(px, py, 0, px, py, 18 * dpr);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(px - 18 * dpr, py - 18 * dpr, 36 * dpr, 36 * dpr);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py, 4.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(px, 0);  ctx.lineTo(px, py);
      ctx.moveTo(0, py);  ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = 'rgba(248, 113, 113, 0.85)';
      ctx.font = `${10 * dpr}px 'Inter', sans-serif`;
      ctx.fillText('outside image', 6 * dpr, H - 8 * dpr);
    }
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
