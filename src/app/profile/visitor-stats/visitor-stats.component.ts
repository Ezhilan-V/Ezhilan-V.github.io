import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component,
  ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

interface VisitDot {
  /** -180..180 lon */
  lon: number;
  /** -90..90 lat */
  lat: number;
  country: string;
  city?: string;
  ageMs: number;
  /** is the current user */
  self?: boolean;
}

interface IpApiResponse {
  ip: string;
  country_code?: string;
  country_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

declare global {
  interface Window {
    GA_MEASUREMENT_ID?: string;
    GOATCOUNTER_CODE?: string;
    FIREBASE_DB_URL?: string;
  }
}

interface FirebasePin {
  lat: number;
  lon: number;
  country: string;
  city?: string;
  ts: number;
}

const VISIT_DOTS_KEY    = 'visit_dots_v2';
const SESSION_PIN_KEY   = 'visit_pin_recorded_v2';
const SESSION_GEO_KEY   = 'visit_geo_v2';
const MAX_DOTS          = 30;
const PIN_TTL_MS        = 14 * 24 * 60 * 60 * 1000; // show pins from the last 14 days

const SAMPLE_DOTS: VisitDot[] = [
  { lon: -122.4194, lat: 37.7749,  country: 'US', city: 'San Francisco',  ageMs: 0 },
  { lon: -73.9857,  lat: 40.7484,  country: 'US', city: 'New York',       ageMs: 0 },
  { lon: -71.0589,  lat: 42.3601,  country: 'US', city: 'Boston',         ageMs: 0 },
  { lon: -79.3832,  lat: 43.6532,  country: 'CA', city: 'Toronto',        ageMs: 0 },
  { lon: -0.1276,   lat: 51.5074,  country: 'GB', city: 'London',         ageMs: 0 },
  { lon: 2.3522,    lat: 48.8566,  country: 'FR', city: 'Paris',          ageMs: 0 },
  { lon: 13.4050,   lat: 52.5200,  country: 'DE', city: 'Berlin',         ageMs: 0 },
  { lon: 77.5946,   lat: 12.9716,  country: 'IN', city: 'Bengaluru',      ageMs: 0 },
  { lon: 80.2707,   lat: 13.0827,  country: 'IN', city: 'Chennai',        ageMs: 0 },
  { lon: 139.6917,  lat: 35.6895,  country: 'JP', city: 'Tokyo',          ageMs: 0 },
  { lon: 121.4737,  lat: 31.2304,  country: 'CN', city: 'Shanghai',       ageMs: 0 },
  { lon: 151.2093,  lat: -33.8688, country: 'AU', city: 'Sydney',         ageMs: 0 },
  { lon: 18.4241,   lat: -33.9249, country: 'ZA', city: 'Cape Town',      ageMs: 0 },
  { lon: -46.6333,  lat: -23.5505, country: 'BR', city: 'São Paulo',      ageMs: 0 }
];

@Component({
  standalone: false,
  selector: 'app-visitor-stats',
  templateUrl: './visitor-stats.component.html',
  styleUrls: ['./visitor-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisitorStatsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapStage', { static: true }) mapStage!: ElementRef<HTMLDivElement>;
  @ViewChild('mapCanvas', { static: true }) mapCanvas!: ElementRef<HTMLCanvasElement>;

  // Display state
  totalVisits = 0;
  displayCount = 0;
  showCount = false;             // only shown if a public counter is configured
  selfLocation: { country: string; city?: string } | null = null;
  loading = true;

  // Tracker availability
  gaConfigured = false;
  goatCounterCode = '';
  firebaseDbUrl = '';
  liveMap = false;          // true when Firebase is wired and we're showing real cross-visitor pins

  private dots: VisitDot[] = [];
  private resizeObs?: ResizeObserver;
  private ctx?: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private rafFrame?: number;
  private startedAt = 0;
  private destroyed = false;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // ─── lifecycle ────────────────────────────────────────────────
  ngOnInit() {
    const gaId = environment.ga.measurementId;
    this.gaConfigured = !!gaId && gaId !== 'G-PLACEHOLDER';

    const gc = environment.goatCounter.code;
    this.goatCounterCode = (gc && gc.length > 0) ? gc : '';

    const fbUrl = (environment.firebase.dbUrl || '').trim().replace(/\/+$/, '');
    this.firebaseDbUrl = fbUrl;
    this.liveMap = !!fbUrl;

    if (this.liveMap) {
      // Live shared map: pull from Firebase, ignore localStorage seeds
      this.dots = [];
      this.fetchPinsFromFirebase();
    } else {
      // Per-browser fallback
      this.dots = this.loadStoredDots();
      if (this.dots.length === 0) {
        this.dots = SAMPLE_DOTS.map(d => ({ ...d, ageMs: 30 * 60 * 1000 + Math.random() * 6 * 60 * 60 * 1000 }));
      }
    }

    if (this.goatCounterCode) {
      this.fetchGoatCounterTotal();
    } else {
      this.loading = false;
    }

    this.fetchCurrentLocation();
  }

  ngAfterViewInit() {
    const ctx = this.mapCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.zone.runOutsideAngular(() => {
      this.resizeObs = new ResizeObserver(() => this.fit());
      this.resizeObs.observe(this.mapStage.nativeElement);
      this.fit();
      this.startedAt = performance.now();

      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) this.draw(this.startedAt);
      else this.tick(this.startedAt);
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.resizeObs?.disconnect();
    if (this.rafFrame) cancelAnimationFrame(this.rafFrame);
  }

  // ─── animated counter ─────────────────────────────────────────
  @HostListener('window:resize')
  onResize() { this.fit(); }

  private animateCount(target: number) {
    const startVal = this.displayCount;
    const t0 = performance.now();
    const dur = 1400;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      this.displayCount = Math.round(startVal + (target - startVal) * eased);
      this.cd.markForCheck();
      if (t < 1 && !this.destroyed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ─── GoatCounter (optional public counter) ────────────────────
  private fetchGoatCounterTotal() {
    const url = `https://${this.goatCounterCode}.goatcounter.com/counter//TOTAL.json`;
    this.http.get<{ count: string | number }>(url).pipe(
      timeout(4500),
      catchError(() => of(null as { count: string | number } | null))
    ).subscribe(res => {
      if (res && res.count != null) {
        const n = typeof res.count === 'number' ? res.count : parseInt(String(res.count).replace(/[, ]/g, ''), 10);
        if (!Number.isNaN(n) && n >= 0) {
          this.totalVisits = n;
          this.showCount = true;
          this.animateCount(n);
        }
      }
      this.loading = false;
      this.cd.markForCheck();
    });
  }

  // ─── current visitor location ─────────────────────────────────
  private fetchCurrentLocation() {
    // Try sessionStorage first - free instant render on refresh.
    const cached = this.readCachedGeo();
    if (cached) {
      this.applyGeo(cached);
      return;
    }

    this.http.get<IpApiResponse>(environment.geo.endpoint).pipe(
      timeout(4500),
      catchError(() => of(null as IpApiResponse | null))
    ).subscribe(res => {
      if (!res || !res.country_code) { this.cd.markForCheck(); return; }
      try { sessionStorage.setItem(SESSION_GEO_KEY, JSON.stringify(res)); } catch { /* ignore */ }
      this.applyGeo(res);
    });
  }

  private readCachedGeo(): IpApiResponse | null {
    try {
      const raw = sessionStorage.getItem(SESSION_GEO_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as IpApiResponse;
      return parsed && parsed.country_code ? parsed : null;
    } catch { return null; }
  }

  private applyGeo(res: IpApiResponse) {
    this.selfLocation = { country: res.country_name || res.country_code || '', city: res.city };

    if (typeof res.latitude === 'number' && typeof res.longitude === 'number') {
      const selfDot: VisitDot = {
        lat: res.latitude,
        lon: res.longitude,
        country: res.country_code || '??',
        city: res.city,
        ageMs: 0,
        self: true
      };
      this.dots = [selfDot, ...this.dots.filter(d => !d.self)].slice(0, MAX_DOTS);
      if (this.liveMap) {
        this.recordPinOnFirebase(selfDot);
      } else {
        this.persistDots();
      }
    }
    this.cd.markForCheck();
  }

  // ─── Firebase Realtime DB (optional shared map) ───────────────
  private fetchPinsFromFirebase() {
    if (!this.firebaseDbUrl) return;
    const url = `${this.firebaseDbUrl}/pins.json`;
    this.http.get<Record<string, FirebasePin> | null>(url).pipe(
      timeout(5000),
      catchError(() => of(null as Record<string, FirebasePin> | null))
    ).subscribe(res => {
      if (!res) {
        // Firebase unreachable → fall back to localStorage view
        this.dots = this.loadStoredDots();
        if (this.dots.length === 0) {
          this.dots = SAMPLE_DOTS.map(d => ({ ...d, ageMs: 60 * 60 * 1000 }));
        }
        this.cd.markForCheck();
        return;
      }
      const cutoff = Date.now() - PIN_TTL_MS;
      const list = Object.values(res || {})
        .filter(p =>
          p && typeof p.lat === 'number' && typeof p.lon === 'number' &&
          typeof p.ts === 'number' && p.ts >= cutoff &&
          p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180
        )
        .sort((a, b) => b.ts - a.ts)
        .slice(0, MAX_DOTS);
      this.dots = list.map(p => ({
        lat: p.lat, lon: p.lon,
        country: p.country || '??',
        city: p.city,
        ageMs: Math.max(0, Date.now() - p.ts)
      }));
      this.cd.markForCheck();
    });
  }

  private recordPinOnFirebase(dot: VisitDot) {
    if (!this.firebaseDbUrl) return;
    if (sessionStorage.getItem(SESSION_PIN_KEY) === '1') return; // one pin per session
    const payload: FirebasePin = {
      lat: round(dot.lat, 2),    // ~1 km precision; we don't need more
      lon: round(dot.lon, 2),
      country: dot.country,
      ts: Date.now()
    };
    if (dot.city) payload.city = dot.city.slice(0, 80);

    this.http.post(`${this.firebaseDbUrl}/pins.json`, payload).pipe(
      timeout(4500),
      catchError(() => of(null))
    ).subscribe(() => {
      sessionStorage.setItem(SESSION_PIN_KEY, '1');
    });
  }

  private loadStoredDots(): VisitDot[] {
    try {
      const raw = localStorage.getItem(VISIT_DOTS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as VisitDot[];
      return Array.isArray(arr) ? arr.slice(0, MAX_DOTS) : [];
    } catch { return []; }
  }

  private persistDots() {
    try { localStorage.setItem(VISIT_DOTS_KEY, JSON.stringify(this.dots)); }
    catch { /* full or denied */ }
  }

  // ─── canvas world map ─────────────────────────────────────────
  private fit() {
    if (!this.mapCanvas) return;
    const cv = this.mapCanvas.nativeElement;
    const stage = this.mapStage.nativeElement;
    const w = stage.clientWidth || 320;
    const h = Math.max(160, Math.min(220, w * 0.46));
    this.cssW = w;
    this.cssH = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(w * this.dpr);
    cv.height = Math.floor(h * this.dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
  }

  private project(lat: number, lon: number): { x: number; y: number } {
    const x = ((lon + 180) / 360) * this.cssW;
    const y = ((90 - lat) / 180) * this.cssH;
    return { x: x * this.dpr, y: y * this.dpr };
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    this.draw(now);
    this.rafFrame = requestAnimationFrame(this.tick);
  };

  private draw(now: number) {
    const ctx = this.ctx;
    if (!ctx || !this.cssW) return;
    const W = this.cssW * this.dpr;
    const H = this.cssH * this.dpr;
    const dpr = this.dpr;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1320');
    bg.addColorStop(1, '#050810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawDottedWorld(ctx, this.cssW, this.cssH, dpr);

    const { selfDot, countries } = this.aggregateByCountry();
    const t = (now - this.startedAt) / 1000;

    // 1. Non-self country pins (one per country, sized by count)
    const maxCount = countries.reduce((m, c) => Math.max(m, c.count), 1);
    for (const c of countries) {
      const { x, y } = this.project(c.lat, c.lon);
      // Smooth scale: 4 px base, +1.6 px per sqrt(count). 1 visitor = 4, 9 = 8.8.
      const r = (4 + Math.sqrt(c.count) * 1.6) * dpr;
      const pulse = (Math.sin(t * 1.6 + (x + y) * 0.001) + 1) / 2;
      const haloR = r + 5 * dpr * (0.6 + 0.4 * pulse);

      const grad = ctx.createRadialGradient(x, y, r * 0.6, x, y, haloR);
      grad.addColorStop(0, hexA('#38bdf8', 0.42));
      grad.addColorStop(1, hexA('#38bdf8', 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // body
      ctx.fillStyle = c.count >= maxCount ? '#bae6fd' : '#7dd3fc';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(8, 11, 20, 0.85)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      // count label
      ctx.fillStyle = '#0a1320';
      ctx.font = `${600} ${(r * 1.0).toFixed(1)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(c.count), x, y + 0.5 * dpr);
    }

    // 2. Self pin on top (always green, distinct)
    if (selfDot) {
      const { x, y } = this.project(selfDot.lat, selfDot.lon);
      const r = 5 * dpr;
      const pulse = (Math.sin(t * 2.4) + 1) / 2;
      const haloR = r + 9 * dpr * (0.6 + 0.4 * pulse);

      const grad = ctx.createRadialGradient(x, y, r, x, y, haloR);
      grad.addColorStop(0, hexA('#34d399', 0.6));
      grad.addColorStop(1, hexA('#34d399', 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1.6 * dpr;
      ctx.stroke();
    }
  }

  // ─── aggregation ──────────────────────────────────────────────
  /**
   * Group all non-self dots by country (latest visit per country wins for
   * lat/lon), and pull out the self dot separately.
   */
  private aggregateByCountry(): {
    selfDot: VisitDot | undefined;
    countries: { country: string; lat: number; lon: number; count: number }[];
  } {
    const selfDot = this.dots.find(d => d.self);
    const buckets = new Map<string, { lat: number; lon: number; count: number; ageMs: number }>();
    for (const d of this.dots) {
      if (d.self) continue;
      const key = (d.country || '??').toUpperCase();
      const existing = buckets.get(key);
      if (!existing) {
        buckets.set(key, { lat: d.lat, lon: d.lon, count: 1, ageMs: d.ageMs });
      } else {
        existing.count += 1;
        // Keep the most recent visit's coordinates as the country pin position
        if (d.ageMs < existing.ageMs) {
          existing.lat = d.lat;
          existing.lon = d.lon;
          existing.ageMs = d.ageMs;
        }
      }
    }
    const countries = Array.from(buckets.entries())
      .map(([country, b]) => ({ country, lat: b.lat, lon: b.lon, count: b.count }))
      .sort((a, b) => b.count - a.count);
    return { selfDot, countries };
  }

  // ─── template helpers ─────────────────────────────────────────
  totalVisitorPins(): number {
    return this.dots.filter(d => !d.self).length;
  }

  countriesReached(): number {
    return this.aggregateByCountry().countries.length;
  }

  topPlaces(): { label: string; count: number; isSelf: boolean }[] {
    const { selfDot, countries } = this.aggregateByCountry();
    const selfCountry = selfDot?.country.toUpperCase();
    return countries
      .slice(0, 6)
      .map(c => ({
        label: countryName(c.country),
        count: c.count,
        isSelf: c.country === selfCountry
      }));
  }

  trackerLabel(): string {
    if (this.gaConfigured && this.goatCounterCode) return 'Tracking via Google Analytics + GoatCounter';
    if (this.gaConfigured) return 'Tracking via Google Analytics';
    if (this.goatCounterCode) return 'Tracking via GoatCounter';
    return 'Analytics not yet configured';
  }

  goatCounterDashboard(): string {
    return this.goatCounterCode
      ? `https://${this.goatCounterCode}.goatcounter.com`
      : 'https://www.goatcounter.com/';
  }
}

function hexA(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function round(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
  GB: 'United Kingdom', FR: 'France', DE: 'Germany', NL: 'Netherlands',
  ES: 'Spain', IT: 'Italy', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  IN: 'India', CN: 'China', JP: 'Japan', KR: 'South Korea', SG: 'Singapore',
  AU: 'Australia', NZ: 'New Zealand', ZA: 'South Africa', AE: 'UAE',
  IL: 'Israel', TR: 'Turkey', RU: 'Russia', PL: 'Poland', UA: 'Ukraine',
  ID: 'Indonesia', PH: 'Philippines', MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam'
};
function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}

function drawDottedWorld(
  ctx: CanvasRenderingContext2D, cssW: number, cssH: number, dpr: number
) {
  const grid = LANDMASS_GRID;
  const rows = grid.length;
  const cols = grid[0].length;
  const cellW = cssW / cols;
  const cellH = cssH / rows;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== '#') continue;
      const px = (x + 0.5) * cellW * dpr;
      const py = (y + 0.5) * cellH * dpr;
      ctx.beginPath();
      ctx.arc(px, py, 1.1 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const LANDMASS_GRID: string[] = [
  '....................................',
  '.....##########..........#####......',
  '...################.....##########..',
  '..#################...##############',
  '...##############......############.',
  '....###########.........###########.',
  '......########..........###########.',
  '......#######...........#######.....',
  '........#####.............####......',
  '..........###.............###.......',
  '..........###..............##.......',
  '...........##..............##.......',
  '............#...............#.......',
  '............#......................#',
  '...........#.....................##.',
  '....................................'
];
