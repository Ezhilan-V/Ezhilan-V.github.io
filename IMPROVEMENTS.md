# Improvements roadmap

A living checklist of issues found during the Apr 2026 deep code review. Items
are tagged ✅ (done in this session), 🟡 (partial / next sprint), or ⬜ (not
started).

The review is split in two: **A.** software engineering of the Angular app,
**B.** robotics-engineering review of the Learn module's teaching material.

---

## A. Software engineering

### A1. Critical correctness + accessibility

| | Item | Notes |
|---|---|---|
| ✅ | Viewport meta blocked pinch-zoom | Replaced `maximum-scale=1, user-scalable=0` with the modern `width=device-width, initial-scale=1, viewport-fit=cover` |
| ✅ | `profile.component.ts` mixed setTimeout / setInterval ids | Split into `timeouts: number[]` and `intervals: number[]`, each cleared with the right API |
| ✅ | Subscription leaks | All page-level components migrated to **`takeUntilDestroyed`** (Angular 16+ idiom): `branch-page`, `learn-home`, `paths`. Other components use explicit Subscription tracking |
| ✅ | Inconsistent `OnPush` adoption | All page-level components now use `OnPush + markForCheck`: `vocabulary`, `contact-form`, `visitor-stats`, `branch-page`, `learn-home`, `paths`, `code-block`, `not-found` |
| ✅ | No tests | Added 3 smoke specs: `learn.service.spec.ts` (HTTP cache), `contact-form.component.spec.ts` (validation), `vocabulary.component.spec.ts` (filter logic) |

### A2. Performance

| | Item | Notes |
|---|---|---|
| ✅ | Three.js + heavy widgets in lazy chunk | Already correct |
| ⬜ | Bootstrap 4.6 in package.json | Pulled in transitively by `now-ui-kit` SCSS theme. Removing it cleanly requires auditing the entire `src/assets/sass/now-ui-kit/` tree. Defer |
| ⬜ | AOS via CDN | Replace with native CSS scroll-driven animations or just drop entirely |
| ✅ | ipapi.co geo lookup not cached + sequential network calls | `sessionStorage` cache key `visit_geo_v2` makes refreshes free; ipapi + Firebase already fire in parallel from `ngOnInit` |
| ⬜ | Font Awesome from CDN (~80 KB) | Tree-shake locally with `fontawesome-svg-core` or use a custom kit |
| ✅ | `<img>` tags lacked lazy loading | Added `loading="lazy"` + `decoding="async"` to project-card and project-details images; hero photo gets `fetchpriority="high"` |

### A3. SEO + meta

| | Item | Notes |
|---|---|---|
| ✅ | Description still said "Software Developer / Automobile Engineer" | Updated to robotics positioning across `og:description`, `twitter:description`, `<meta name="description">` |
| ✅ | Missing OpenGraph + Twitter card + canonical + author + theme-color | All added in `index.html` |
| ✅ | No JSON-LD Person schema | Added in `index.html` (`<script type="application/ld+json">`) |
| ✅ | No per-route titles | Added `PortfolioTitleStrategy` in `app.routing.ts` + per-route `title` keys in both routing modules + dynamic title in `BranchPageComponent` |
| ⬜ | No SSR / prerender | Enable Angular 19 prerender for `/learn/*` paths. Big SEO win for the teaching content |

### A4. Hardening + privacy

| | Item | Notes |
|---|---|---|
| ✅ | No Content Security Policy | Added `<meta http-equiv="Content-Security-Policy">` whitelisting self + GA + Firebase + ipapi + Font Awesome + Google Fonts + GoatCounter |
| ✅ | Inline scripts in index.html | Firebase + GoatCounter config moved to `src/environments/environment.ts`. GA loader stays inline (must run pre-bootstrap) but reads `GA_ID` only |
| ⬜ | ipapi.co rate-limit handling | Cache the geo lookup in `sessionStorage` so refreshes are free |
| ⬜ | Firebase /messages can be flooded | Add a daily Firebase Function that prunes anything > 30 days; consider Cloudflare Turnstile if abuse appears |

### A5. Architecture + tech debt

| | Item | Notes |
|---|---|---|
| ⬜ | `MaterialModule` always imported | Pulls in unused Angular Material. Lazy-load it |
| ✅ | Routing files inconsistent | Renamed `app.routing.ts` → `app-routing.module.ts` and updated `app.module.ts` import |
| ✅ | `ResumeComponent` class mismatch with `app-profile` selector | Renamed to `ProfileComponent` everywhere |
| ⬜ | `standalone: false` everywhere | Future migration item — Angular 19 prefers standalone |
| ⬜ | `learn.service.ts` mixes 5 entity types | Split into `LearnIndexService`, `VocabularyService`, `QuizService`, `PathsService` |
| ⬜ | `APP_INITIALIZER` blocks first paint | Move portfolio.json load to a non-blocking pattern with skeleton placeholders |
| ✅ | `environment.ts` not used for runtime config | Done. GA / Firebase / GoatCounter / ipapi / site identity all live in `environment.ts`. Components import from there |

### A6. UX polish

| | Item | Notes |
|---|---|---|
| ✅ | `target="_blank"` missing `rel="noopener noreferrer"` | Patched across `profile.component.html`, `about.component.html`, `navbar.component.html`. branch-page already had it |
| ✅ | No skip-to-content link | Added in `app.component.html` + styled in `app.component.scss` (visually-hidden until focus) |
| ⬜ | `<canvas>` widgets ignored `prefers-reduced-motion` | ✅ Patched: `robot-loop`, `path-canvas`, `visitor-stats` now render a single static frame instead of looping when reduced-motion is set |
| ✅ | No 404 component | Added `NotFoundComponent` at `src/app/shared/not-found/`. `path: '**'` now renders a real 404 with two CTAs (back to portfolio, jump to Learn) |
| ⬜ | Form fields with implicit `<label>` | Audit Material wrapper inputs and add `aria-label` where the visible label is decorative |

(Reduced-motion handling marked done — see entry above this row.)

---

## B. Robotics teaching material

### B1. Pedagogy + first-time learner

| | Item | Notes |
|---|---|---|
| ⬜ | First-time view should land on `foundations`, not `setup` | Pin Foundations as section 0 in the sidebar with copy "Read this first if you're new" |
| ⬜ | No "what does done look like?" rubric | Add per-starter-project acceptance criteria in `setup/learning-paths` |
| ⬜ | Foundations branch is text-only | Add a linear-algebra widget (vector + 2D rotation sandbox) and a probability widget (sample from Gaussian, watch histogram fill) |
| ✅ | Vocabulary not cross-linked from body text | `LearnTermDirective` shipped. Wrap any phrase with `[learnTerm]="'pose'"` and a popover shows the glossary entry on hover/focus, click deep-links to the section. Apply across content gradually |
| 🟡 | Quiz coverage (85 questions / 168 sections) | 34 → 54 → **85** across all 7 categories. Still aim for 1 per technical section (target ~150) |

### B2. Technical accuracy + currency

| | Item | Notes |
|---|---|---|
| ✅ | The 2026 refresh holds (π0/π0.5, GR00T, Cosmos, V-JEPA 2, ALOHA Unleashed, humanoid fleet) | Verified |
| ✅ | `manipulation/inverse-kinematics` now mentions TRAC-IK, Pinocchio, IKFast | Updated body + bullets + links |
| ✅ | `control-systems/mpc` mentions acados (production default) + ProxQP | Updated solver bullet |
| ✅ | `navigation/slam` mentions RTAB-Map for RGB-D SLAM | Updated body |
| ✅ | `computer-vision/object-detection` updated with RT-DETR, Grounding DINO, OWL-ViT, SAM 2 | YOLOv10/11 still production default but landscape now reflected |
| ✅ | `ai-ml/imitation-learning` opens with HuggingFace LeRobot as the de-facto starting point | Lerobot + openpi prominent |
| ✅ | `compute/embedded-compute` mentions Jetson Thor (2025) | Now the headline; AGX Orin downgraded to "still most-deployed" |
| ✅ | `drones/autopilots` de-emphasizes Betaflight | Reframed as FPV-only, not for autonomy |

### B3. Coverage gaps

| | Item | Notes |
|---|---|---|
| ⬜ | No surgical / medical robotics branch | da Vinci, Stryker Mako, CMR Versius |
| ⬜ | No agricultural robotics branch | John Deere See & Spray, Naïo, Bear Flag |
| ⬜ | No industrial / factory robotics branch | KUKA, Fanuc, ABB cell programming |
| ✅ | No "ROS 1 → ROS 2 migration" section in Setup | Added `setup/ros1-to-ros2` with rospy↔rclpy / catkin↔colcon side-by-side, breaking-change checklist, and runnable code samples |
| ⬜ | No safety-engineering depth | ISO 13482, IEC 61508 SIL levels, FMEA. Currently scattered |
| ⬜ | No "dataset hygiene" section in AI/ML | Biases, eval leakage, train/test for cross-embodiment |
| ✅ | No "robotics math cookbook" in Foundations | Added `foundations/math-cookbook` with all the formulas (transform compose / invert, quaternion slerp + compose, axis-angle ↔ quaternion, Rodrigues, twists, adjoints, skew matrix, integration of angular velocity) plus runnable scipy + Eigen / Sophus examples |

### B4. Newcomer onboarding

| | Item | Notes |
|---|---|---|
| ⬜ | 5-minute "Is robotics for you?" primer at `/learn` | Quick assessment routes to one of the 4 paths |
| ⬜ | Robot-loop nodes click into deep technical sections | Each branch should have a `00-primer` section that newcomers land on first |
| ⬜ | `setup/first-week` should branch by background | Robotics undergrad vs SWE-pivot vs hardware-pivot vs hobbyist |
| ⬜ | C++ underrepresented vs Python | Add C++ samples in 20 highest-traffic sections (Manipulation, Control, Compute) |
| ⬜ | No video / GIF embeds | Gait cycles, MPC horizons, SLAM optimization are 10× clearer with motion |
| ⬜ | No "hands-on lab" tag | Sections requiring hardware should be visually distinct from sim-only |

### B5. Widget catalog

| | Item | Notes |
|---|---|---|
| ⬜ | No URDF visualizer | `urdf-loaders` (NASA-JPL) loads any URDF in browser via Three.js. Big "wow" factor |
| ⬜ | No PPO / SAC training-curve playground | qlearning widget covers discrete-Q only |
| ⬜ | Bayes-filter widget hidden under navigation | Replicate it in Foundations as "what is a probability distribution" intro |
| ⬜ | Branches diagram shows technical-only | Either add an "all 15" toggle or replicate applied branches as a second ring |

---

## Prioritized roadmap

### Sprint 1 — done in earlier session (shipped above)
1. ✅ Viewport meta + SEO + JSON-LD
2. ✅ Per-route titles
3. ✅ Profile timer/interval bug fix
4. ✅ Lazy image loading
5. ✅ rel=noopener everywhere
6. ✅ Skip-to-content link
7. ✅ Reduced-motion canvas pause
8. ✅ Robotics content refresh (TRAC-IK + Pinocchio, LeRobot, Jetson Thor, RT-DETR + Grounding DINO + SAM 2, RTAB-Map, acados, Betaflight de-emphasis)

### Sprint 2 — done in this session
1. ✅ `NotFoundComponent` for `path: '**'`
2. ✅ Renamed `ResumeComponent` → `ProfileComponent`
3. ✅ Renamed `app.routing.ts` → `app-routing.module.ts`
4. ✅ OnPush + markForCheck across all page-level components (`branch-page`, `learn-home`, `paths`, `code-block`)
5. ✅ Subscription tracking everywhere (no inline subscribes)
6. ✅ ipapi.co geo cached in sessionStorage
7. ✅ Added 20 quiz questions (34 → 54)

### Sprint 3 — shipped earlier
1. ✅ environment.ts migration for GA / Firebase / GoatCounter / ipapi config
2. ✅ CSP `<meta http-equiv>` whitelisting all known origins
3. ✅ `takeUntilDestroyed` migration on `branch-page`, `learn-home`, `paths`
4. ✅ `LearnTermDirective` glossary popover (use anywhere with `[learnTerm]="'pose'"`)
5. ✅ +31 quiz questions (54 → 85)
6. ✅ ROS 1 → 2 migration section in Setup
7. ✅ Robotics math cookbook section in Foundations
8. ✅ 3 smoke unit tests (LearnService, ContactForm, Vocabulary)

### Sprint 4 — shipped earlier
1. ✅ **Linear-algebra interactive widget** for Foundations - canvas-based vectors / dot product / rotation playground, drag the tips of `a` and `b`, watch the math react
2. ✅ **Branches diagram applied-pills row** - all 9 applied/setup branches reachable directly from the home diagram, no longer technical-only
3. ✅ **Three new applied branches** - surgical (RCM, IEC 62304, FDA 510(k), teleop), agricultural (RTK-GNSS, ISOBUS, See & Spray, perception in dust), industrial (KRL/RAPID/KAREL, ROS-Industrial, ISO 10218 cell safety, PROFINET/EtherCAT/EtherNet/IP)
4. ✅ **+22 quiz questions (85 → 107)** covering the new branches plus advanced topics: RCM, IEC 62304, ISOBUS, See & Spray, KRL, ISO 15066 cobot modes, EtherCAT, ROS-Industrial, twists in se(3), Eigen vs NumPy, ROS 1→2 migration, Grounding DINO, SAM 2, Jetson Thor FP4, AprilTag vs ArUco, VLA benchmarks, Jacobian singularity, time-sync, impedance vs admittance
5. ✅ **C++ samples in high-traffic sections** - PID controller (control-systems), forward kinematics (mechanical-design)

### Sprint 5 — shipped earlier (3D visualization upgrade)
1. ✅ **FK widget rewritten as a 6-DOF Three.js robot arm** - replaces the 3-DOF hexapod leg. UR5-flavored: base yaw + shoulder + elbow + wrist1 + wrist2 + wrist3, with a parallel-jaw gripper at the TCP. Six sliders, OrbitControls, live xyz + rpy readout, color-coded joints
2. ✅ **IK widget rewritten in 3D using Three.js** - same arm aesthetic, draggable red target sphere in 3D, dashed line from TCP to target, reachability sphere wireframe, closed-form 3D positional IK (base yaw + 2-link planar in the rotated x'-y plane), elbow up/down toggle, X/Y/Z sliders, drag-to-orbit, pointer-based 3D target dragging on a camera-aligned plane
3. ✅ **Motor mixer rewritten as 3D Three.js quadcopter** - X-frame body that tilts under roll/pitch/yaw, four propellers spinning at the mixed RPMs (CCW = violet, CW = blue), spin-direction halos that pulse with thrust, yellow heading arrow, motor-cmd HUD bar overlay. Same mixer math as before, now with proper 3D feel

### Sprint 6 — shipped in this session
1. ✅ **Pinhole camera widget rewritten in 3D Three.js** - 3D scene with multicolored objects, virtual camera with frustum lines + image-plane quad, draggable red point in world space, dashed projection ray, projection dot landing on the image plane in 3D, plus a 2D image-preview overlay in the corner showing the resulting (u, v) pixel. Sliders for f / X / Y / Z. Drag the sphere in 3D and watch both the 3D dot on the image plane AND the 2D preview pixel update together
2. ✅ **Quadruped gait widget rewritten in 3D Three.js** - proper 4-legged robot with body + head/eyes + 2-segment legs (upper + lower with knee bends). Each leg's pose comes from per-frame 2-link IK on a body-frame foot target derived from the gait phase. Body bobs / pitches / rolls subtly under the gait. Ground stripes scroll backward to give a forward-motion feel. Five gaits (walk / trot / pace / bound / gallop) with live stance/swing legend
3. ✅ **Global search bar in the Learn module** - sticky header bar searches across branches + sections + 125+ vocabulary terms + 107 quiz questions + 4 learning paths + tools. Keyboard nav (`/` to focus, ↑↓ to move, ↵ to open, esc to close), tokenized scoring (exact title > prefix > substring + kind bonus), deep-link via fragments to specific sections. Click-outside dismisses. Replaces the previous bare workspace bar — search is now the prominent element, workspace input is secondary on the right (collapses on small phones)

### Still pending after Sprint 5

#### Content (an afternoon each)
- Add "what is a robot?" primer page that always renders before Setup
- Add a 5-minute "Is robotics for you?" assessment at `/learn` (started — needs new component + route)
- Per-branch `00-primer` sections
- Push quiz from 107 → ~180 (one per technical section across all 18 branches)
- Add more C++ code samples (navigation send-goal, perception camera bringup, MoveIt 2 execution, etc.)
- Apply `[learnTerm]` to body text across all branches
- Backfill the 3 new branches (surgical / agricultural / industrial) with more sections - currently 4 each, others have 10+

#### Bigger components (each a session of focused work)
- URDF visualizer widget (uses `urdf-loaders` + Three.js)
- PPO / SAC training-curve playground
- 3D quadruped gait visualization (currently 2D — could be Three.js 4-leg walk cycle)

#### Architecture (deferred for risk)
- Drop Bootstrap (currently `@import "bootstrap/scss/bootstrap"` in `styles.scss` — removal cascades into the now-ui-kit theme)
- Lazy-load `MaterialModule` (refactor)
- Standalone-component migration (intentionally deferred per CLAUDE.md)
- Split `learn.service.ts` into `LearnIndexService` / `VocabularyService` / `QuizService` / `PathsService`
- Migrate `APP_INITIALIZER` to non-blocking pattern with skeletons
- Tree-shake Font Awesome locally

#### Performance / infra
- Replace AOS with native CSS scroll-driven animations
- Enable Angular prerender for `/learn/*` SEO
- Firebase Function to prune `/messages` older than 30 days

#### A11y polish
- Form aria-label audit for Material wrapper inputs
- Apply `learnTerm` directive across body text in all branches

---

## Files touched in Sprint 1

- `src/index.html` — viewport, SEO meta, OG, Twitter, JSON-LD
- `src/app/app.routing.ts` — `PortfolioTitleStrategy`
- `src/app/learn/learn-routing.module.ts` — per-route titles
- `src/app/learn/pages/branch-page/branch-page.component.ts` — dynamic title from branch metadata
- `src/app/profile/profile.component.ts` — timeout/interval split
- `src/app/profile/profile.component.html` — `width`/`height` + `fetchpriority`/`decoding`/`rel`
- `src/app/profile/about/about.component.html` — `rel=noopener noreferrer`
- `src/app/shared/navbar/navbar.component.html` — `rel=noopener noreferrer`
- `src/app/profile/project-card/project-card.component.html` — `loading=lazy`/`decoding`
- `src/app/profile/project-details/project-details.component.ts` — `loading=lazy`/`decoding`
- `src/app/app.component.html` — skip-to-content link + `<main>` landmark
- `src/app/app.component.scss` — skip-link styles
- `src/app/learn/components/robot-loop/robot-loop.component.ts` — reduced-motion path
- `src/app/learn/components/path-canvas/path-canvas.component.ts` — reduced-motion path
- `src/app/profile/visitor-stats/visitor-stats.component.ts` — reduced-motion path
- `src/assets/data/learn/manipulation.json` — TRAC-IK, Pinocchio, IKFast
- `src/assets/data/learn/ai-ml.json` — LeRobot / openpi prominence
- `src/assets/data/learn/compute.json` — Jetson Thor
- `src/assets/data/learn/computer-vision.json` — RT-DETR, Grounding DINO, OWL-ViT, SAM 2
- `src/assets/data/learn/navigation.json` — RTAB-Map
- `src/assets/data/learn/control-systems.json` — acados, ProxQP
- `src/assets/data/learn/drones.json` — Betaflight de-emphasis

Build: 268.04 kB → **268.48 kB** transfer (+0.4 KB for the new metadata + a11y CSS).

## Files touched in Sprint 2

- `src/app/shared/not-found/not-found.component.{ts,html,scss}` — new 404 page
- `src/app/app.module.ts` — register `NotFoundComponent`, fix routing import path
- `src/app/app-routing.module.ts` (renamed from `app.routing.ts`) — wire `**` to `NotFoundComponent` instead of redirect
- `src/app/profile/profile.component.ts` — class renamed `ResumeComponent` → `ProfileComponent`
- `src/app/profile/profile.module.ts` — updated import + declaration name
- `src/app/learn/pages/branch-page/branch-page.component.ts` — `OnPush` + `markForCheck`
- `src/app/learn/pages/learn-home/learn-home.component.ts` — `OnPush` + `markForCheck` + `trackBranch`
- `src/app/learn/pages/paths/paths.component.ts` — `OnPush` + `markForCheck`
- `src/app/learn/components/code-block/code-block.component.ts` — `OnPush` + `markForCheck`
- `src/app/profile/visitor-stats/visitor-stats.component.ts` — `sessionStorage` cache for ipapi.co
- `src/assets/data/learn/quiz.json` — +20 questions across all 7 categories

Build: 268.48 kB → **269.23 kB** transfer (+0.75 KB; mostly NotFoundComponent + 20 quiz questions).

## Files touched in Sprint 3

- `src/environments/environment.ts` + `environment.prod.ts` — runtime config (GA, Firebase, GoatCounter, ipapi, site identity)
- `src/index.html` — slimmed inline scripts to GA-only; added CSP meta; old `window.FIREBASE_DB_URL`/`GOATCOUNTER_CODE` config blocks removed
- `src/app/profile/visitor-stats/visitor-stats.component.ts` — read from `environment` instead of `window.*`
- `src/app/profile/contact-form/contact-form.component.ts` — same migration
- `src/app/learn/pages/branch-page/branch-page.component.ts` — `takeUntilDestroyed`
- `src/app/learn/pages/learn-home/learn-home.component.ts` — `takeUntilDestroyed`
- `src/app/learn/pages/paths/paths.component.ts` — `takeUntilDestroyed`
- `src/app/learn/components/learn-term/learn-term.directive.ts` — new glossary popover directive
- `src/app/learn/learn.module.ts` — register `LearnTermDirective`
- `src/styles.scss` — global styles for `.learn-term` + `.learn-term__pop`
- `src/app/learn/services/learn.service.spec.ts` — new HTTP cache test
- `src/app/profile/contact-form/contact-form.component.spec.ts` — new validation test
- `src/app/learn/pages/vocabulary/vocabulary.component.spec.ts` — new filter test
- `src/assets/data/learn/quiz.json` — +31 questions (54 → 85)
- `src/assets/data/learn/setup.json` — new `ros1-to-ros2` section
- `src/assets/data/learn/foundations.json` — new `math-cookbook` section
- `src/assets/data/learn/index.json` — `sectionTitles` updated for both new sections

Build: 269.23 kB → **269.36 kB** transfer (+0.13 KB; almost everything was JSON content + global styles, both off the JS bundle path).

## Files touched in Sprint 4

- `src/app/learn/components/widgets/linear-algebra/{ts,html,scss}` — new interactive vector / dot-product / rotation widget
- `src/app/learn/learn.module.ts` — register `LinearAlgebraComponent`
- `src/app/learn/services/learn.service.ts` — add `'linalg'` to the `LearnWidget` union
- `src/app/learn/pages/branch-page/branch-page.component.html` — `<learn-linear-algebra>` switch case
- `src/app/learn/components/branches-diagram/branches-diagram.component.{ts,html,scss}` — applied-branches pill row
- `src/assets/data/learn/surgical.json` — new branch (4 sections, 8 KB)
- `src/assets/data/learn/agricultural.json` — new branch (4 sections, 7 KB)
- `src/assets/data/learn/industrial.json` — new branch (4 sections, 7 KB)
- `src/assets/data/learn/index.json` — register the 3 new branches with full metadata + sectionTitles
- `src/assets/data/learn/foundations.json` — bind `linalg` widget to the linear-algebra section
- `src/assets/data/learn/quiz.json` — +22 questions (85 → 107)
- `src/assets/data/learn/control-systems.json` — C++ PID alongside the Python version
- `src/assets/data/learn/mechanical-design.json` — Python + C++ FK side by side

Build: 269.36 kB → **269.20 kB** transfer (-0.16 KB; LinearAlgebra widget added but Sprint-3 LearnTermDirective tree-shook some code and the new content is JSON-only). Content stats: **18 branches, 182 sections, 182 code blocks, 884 bullets, 258 links, 26 widget bindings, 125 vocab terms, 107 quiz questions, 4 learning paths.**

## Files touched in Sprint 5

- `src/app/learn/components/kinematics-viewer/kinematics-viewer.component.{ts,html,scss}` — rewrote as 6-DOF arm (UR-flavored), six sliders + home/ready presets + xyz+rpy readout
- `src/app/learn/components/widgets/inverse-kinematics/inverse-kinematics.component.{ts,html,scss}` — 2D canvas → 3D Three.js. Same arm style as FK, draggable target sphere with camera-aligned drag plane, dashed line TCP→target, reachability wireframe, closed-form 3D positional IK
- `src/app/learn/components/widgets/motor-mixer/motor-mixer.component.{ts,html,scss}` — 2D canvas → 3D Three.js quadcopter. Spinning props colored by spin direction, body tilts under commanded attitude, motor-cmd HUD bars overlay

Build: 269.20 kB initial bundle (unchanged — all the new Three.js code lives in the lazy `learn-learn-module` chunk). The lazy chunk grew slightly to absorb the new geometry but the visitor's first paint is unaffected.

---

*Last updated: 2026-04-29 (Sprint 5)*
