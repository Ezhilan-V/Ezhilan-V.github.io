# CLAUDE.md  Ezhilan-V.github.io Portfolio

## About This Project

Personal portfolio for **Ezhilan Veluchami**, Systems Development Engineer at Amazon Robotics.
Actively job-hunting in the **Robotics industry**  all content, framing, and copy should reinforce robotics expertise and hiring appeal.

- **Live site:** https://ezhilan-v.github.io
- **Repo:** Ezhilan-V.github.io (GitHub Pages, served from `docs/`)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Angular 19 (NgModule, zone.js, `standalone: false` on all components) |
| Styling | Tailwind CSS v3 + Angular Material M3 + custom SCSS |
| Animations | AOS (Animate on Scroll)  via CDN |
| Icons | Font Awesome 6 free (CDN cdnjs 6.6.0, backward-compat with `fas fa-*` v5 syntax) + Angular Material Icons |
| Portfolio content | `src/assets/data/portfolio.json` |
| Learn module content | `src/assets/data/learn/` — split per-branch JSON files |
| 3D | Three.js (lazy-loaded only with `LearnModule`) |
| Hosting | GitHub Pages (`docs/` output folder) |

---

## Key Files

```
# Portfolio (route /)
src/assets/data/portfolio.json          ← Portfolio content (about, skills, experience, projects, stories)
src/app/profile/profile.service.ts      ← TypeScript interfaces + data getters
src/app/profile/profile.component.html  ← Top-level layout (hero, sections, footer)
src/app/profile/profile.component.scss  ← Global profile + hero styles
src/app/profile/profile.module.ts       ← Module declarations

# Learn Robotics module (route /learn — lazy-loaded)
src/app/learn/learn.module.ts                       ← Lazy module + component registrations
src/app/learn/learn-routing.module.ts               ← /learn + /learn/:slug routes
src/app/learn/services/learn.service.ts             ← Index + per-branch lazy fetch + cache
src/app/learn/services/workspace.service.ts         ← {{ws}} template variable + localStorage
src/app/learn/pages/learn-layout/                   ← Sticky ws bar + nested sidebar (scroll-spy)
src/app/learn/pages/learn-home/                     ← Hero + branches diagram + branch cards
src/app/learn/pages/branch-page/                    ← Generic JSON-driven section renderer
src/app/learn/components/branches-diagram/          ← SVG hub-and-spoke (8 active branches)
src/app/learn/components/code-block/                ← Copy button + ws-template substitution
src/app/learn/components/kinematics-viewer/         ← Three.js 3-DOF hexapod leg
src/app/learn/components/widgets/{name}/            ← Canvas-based interactive widgets

# Content (Learn)
src/assets/data/learn/index.json                    ← intro + branch metadata + sectionTitles
src/assets/data/learn/{slug}.json                   ← Per-branch hero + sections
scripts/add-deep-sections.cjs                       ← One-shot helper used during content expansion

# Shared
src/styles.scss                         ← Global CSS (dark theme vars, Tailwind, AOS)
src/index.html                          ← CDN links (FA5, Poppins, Material Icons)
docs/                                   ← Build output (GitHub Pages serves this)
```

### Section Components

| Component | Section |
|---|---|
| `app-about` | About Me + STAR Engineering Stories |
| `app-skills` | Skill chips (categorized, click-to-filter) |
| `app-experience` | Work timeline (Amazon, ASU, Infosys, Barrow, Ashok Leyland) |
| `app-education` | ASU MS Robotics + Karpagam BE Automobile |
| `app-patent` | U.S. Patent App 63/574,771 |
| `app-project-card` | Tabbed project carousel (Robotics / Software / Mechanical) |

---

## portfolio.json Structure

```
meta          → name, title, company, location, email, linkedin, github, resumeUrl, copyrightYear, languages, patent
hero          → roles[], techTags[], stats[]
about         → bio (hero blurb), professionalSummary[]
skills[]      → { name, icon, color, skills[] }
experience[]  → { id, company, location, role, period, color, responsibilities[], subProjects? }
education[]   → { school, period, degree, gradient, details[] }
projects[]    → { name, icon, color, projects[] }  ← 3 categories: Robotics, Software, Mechanical
motorsport    → (retained in JSON but not rendered  no component)
patent        → { title, applicationNumber, filingDate, applicant, description, impact }
stories[]     → { id, title, principle, body }
```

### Project Category Colors (Tailwind gradient classes)
- Robotics: `from-sky-700 to-sky-500`
- Software: `from-emerald-700 to-emerald-500`
- Mechanical: `from-amber-700 to-amber-500`

---

## ProfileService Interfaces (key ones)

```typescript
StarStory   { id, title, principle, body }          // body = single prose paragraph, no STAR split
ProjectCategory { name, icon, color, projects[] }
Project     { title, role, timeline, description, imageUrls, technologies?, highlights? }
Experience  { id, company, location, role, period, color, responsibilities[], subProjects? }
```

---

## Learn Robotics module (`/learn`)

A second-class top-level surface intended as an evergreen, comprehensive robotics learning resource. Lives at `/learn` and is **lazy-loaded** — initial portfolio bundle is unaffected. Build target: `learn-learn-module` chunk (~140 KB transfer with all widgets and Three.js).

### Routes
- `/learn`               → `LearnHomeComponent` (hero + 8-spoke SVG branches diagram + branch cards)
- `/learn/:slug`         → `BranchPageComponent` (JSON-driven sections + embedded widgets)

Both render inside `LearnLayoutComponent`, which provides:
- A sticky top **workspace bar** (`~/[ws_name]/`) that drives every `{{ws}}` placeholder
- A **nested sidebar** on desktop (Get-Started + Branches groups, active branch auto-expands to show its sections)
- A sticky **mobile tab strip** (horizontal pills, scroll-snap)
- **Scroll-spy** highlighting the current section in the sidebar

### Branches (15 total — 2 setup + 6 technical + 7 applied)

The structure mirrors the canonical academic robotics taxonomy. **Technical branches** are the 6 foundational fields a textbook would list. **Applied branches** are the platforms / domains those fields combine into. **Setup-kind** is foundational onboarding.

| Slug                    | Kind       | Icon                | Accent  | Description |
|-------------------------|------------|---------------------|---------|-------------|
| `setup`                 | setup      | fa-rocket           | #fbbf24 | Install ROS 2 Jazzy, Gazebo, MoveIt, Nav2, dev tools |
| `foundations`           | setup      | fa-book-open        | #facc15 | Math (LA / calc / prob), Python + C++ idioms, debugging, books, careers |
| `mechanical-design`     | technical  | fa-gears            | #94a3b8 | **Mechanical Design & Kinematics** — joints, actuators, FK/IK, dynamics, URDF, end-effectors |
| `sensors`               | technical  | fa-broadcast-tower  | #22d3ee | **Sensing & Perception** — cameras, LiDAR, IMU, encoders, FT, GPS, calibration, bus protocols |
| `computer-vision`       | technical  | fa-eye              | #a78bfa | **Computer Vision** — image processing, detection, segmentation, SLAM, pose estimation |
| `control-systems`       | technical  | fa-sliders          | #f43f5e | **Control Systems** — PID, state-space, MPC, motion planning, ros2_control, real-time |
| `ai-ml`                 | technical  | fa-brain            | #fb7185 | **AI & Machine Learning** — RL, IL, VLMs, VLAs, world models, foundation models |
| `hri`                   | technical  | fa-handshake        | #d946ef | **Human-Robot Interaction** — shared autonomy, NL, gesture, cobot safety, teleop, social robots |
| `manipulation`          | applied    | fa-hand-paper       | #38bdf8 | Robotic arms in practice — MoveIt 2, pick & place, grasping, bimanual |
| `navigation`            | applied    | fa-compass          | #34d399 | Mobile-robot navigation — Nav2, AMCL, SLAM, costmaps, behavior trees |
| `amr`                   | applied    | fa-truck-fast       | #818cf8 | Autonomous mobile robots — fleet protocols, VDA 5050, WMS integration |
| `autonomous-vehicles`   | applied    | fa-car-side         | #2dd4bf | Self-driving cars — SAE levels, BEV fusion, Autoware/Apollo, ISO 26262 |
| `drones`                | applied    | fa-helicopter       | #a3e635 | Aerial robots — multirotor dynamics, PX4/Ardupilot, MAVLink, swarms |
| `multi-robot`           | applied    | fa-network-wired    | #ec4899 | Multi-robot systems — MAPF, multi-SLAM, swarm, Open-RMF |
| `compute`               | applied    | fa-microchip        | #fb923c | Onboard compute, GPUs, real-time Linux, DDS, networking |

**Home + sidebar grouping** — the `LearnHomeComponent` and `LearnLayoutComponent` both render three groups: **Get Started** (setup), **Technical Branches** (technical), **Applied & Platform** (applied + legacy 'branch' kind for backward compatibility).

**Canonical robotics taxonomy.** Each field branch has a `taxonomy-overview` section as section[0] that anchors it in the canonical academic taxonomy and lists 8–10 sub-branches plus 4–6 career specializations within it. New visitors land on the overview before the deep technical sections.

**Branches diagram** (`branches-diagram.component.ts`) places ONLY the 6 canonical technical branches at every 60° around the central "Robotics" hub (orbit radius 162, node radius 34, hub radius 50). Each spoke is clickable for drill-down (sub-branches around the selected centre, click centre to navigate). `setup`, `foundations`, and the 7 applied branches are intentionally NOT on the diagram — they live in the sidebar / home cards under their respective groups.

### Content layout — per-branch JSON

Content is **split per branch** for maintainability. The `LearnService` lazy-fetches each branch on first navigation, then caches.

```
src/assets/data/learn/
  index.json          ← intro + array of branch metadata (one entry per branch)
                        each entry has slug, kind, title, shortName, icon, color, accent,
                        description, hero, AND sectionTitles: [{id, heading}] for sub-nav
  {slug}.json         ← per-branch payload: { slug, hero, sections[] }
```

**`LearnSection` shape** (defined in `learn.service.ts`):

```typescript
{
  id: string;              // kebab-case anchor (rendered as id="section-<id>")
  heading: string;
  body?: string;           // 1-3 paragraphs; \n\n splits paragraphs visually
  bullets?: string[];      // bulleted key takeaways
  codeBlocks?: [           // each renders via <learn-code-block>; copy button + {{ws}} substitution
    { language, title?, code, note? }
  ];
  links?: [{ label, url }];
  widget?: LearnWidget;    // see below
}
```

### Widget catalog

18 interactive widgets, registered in `LearnModule`. To embed in a section, set `"widget": "<key>"` in JSON.

| key            | Component                       | Branch use                                       | Stack            |
|----------------|---------------------------------|--------------------------------------------------|------------------|
| `kinematics`   | `KinematicsViewerComponent`     | manipulation/fk-playground                       | **Three.js**     |
| `rotation3d`   | `Rotation3dComponent`           | manipulation/frames-rotations                    | **Three.js**     |
| `pinhole`      | `PinholeCameraComponent`        | computer-vision/camera-fundamentals              | Canvas 2D        |
| `convolution`  | `ConvolutionComponent`          | computer-vision/image-processing                 | Canvas 2D        |
| `diffdrive`    | `DiffDriveComponent`            | navigation/robot-kinematics, amr/drive-systems   | Canvas 2D        |
| `astar`        | `AstarComponent`                | navigation/astar-playground                      | Canvas 2D        |
| `costmap`      | `CostmapInflationComponent`     | navigation/costmaps                              | Canvas 2D        |
| `pid`          | `PidControllerComponent`        | manipulation/control-basics                      | Canvas 2D (plot) |
| `ik`           | `InverseKinematicsComponent`    | manipulation/inverse-kinematics                  | Canvas 2D        |
| `kalman`       | `Kalman1dComponent`             | computer-vision/state-estimation                 | Canvas 2D (plot) |
| `particle`     | `ParticleFilterComponent`       | navigation/localization                          | Canvas 2D        |
| `occupancy`    | `OccupancySlamComponent`        | navigation/slam                                  | Canvas 2D        |
| `rrt`          | `RrtComponent`                  | manipulation/motion-planning                     | Canvas 2D        |
| `gait`         | `QuadrupedGaitComponent`        | amr/legged-amrs                                  | Canvas 2D        |
| `boids`        | `BoidsComponent`                | multi-robot/swarm                                | Canvas 2D        |
| `qlearning`    | `QLearningComponent`            | ai-ml/rl-fundamentals                            | Canvas 2D        |
| `frenet`       | `FrenetSamplerComponent`        | autonomous-vehicles/trajectory-gen-av            | Canvas 2D        |
| `mixer`        | `MotorMixerComponent`           | drones/multirotor-dynamics                       | Canvas 2D        |
| `bayes`        | `BayesFilterComponent`          | navigation/bayes-filter-intuition                | Canvas 2D        |

**Widget conventions** (when adding a new one):
- Live under `src/app/learn/components/widgets/<name>/`
- Standalone-false Angular component, registered in `LearnModule`, `selector: 'learn-<name>'`
- Add to `LearnWidget` union type in `learn.service.ts`
- Add `*ngSwitchCase` in `branch-page.component.html` widget block
- Use `runOutsideAngular` for RAF loops (no zone churn)
- HiDPI canvas: cap `devicePixelRatio` at 2
- ResizeObserver on the canvas's parent for responsive sizing
- Light + dark theme via `:host-context(.light-theme)` overrides
- Touch-friendly: use Pointer Events + `touch-action: none` for click-and-drag

### Workspace template variable (`{{ws}}`)

Every code block's source is run through `WorkspaceService.substitute()` before rendering. `{{ws}}` is replaced with the current workspace name (default `ros2_ws`, persisted in localStorage). When the user types a new name in the sticky bar at the top of `/learn`, **every** rendered code block updates live (and the copy button copies the substituted text). Always write workspace-relative paths in JSON as `~/{{ws}}/...`.

### How to add a new branch

1. Create `src/assets/data/learn/<slug>.json` with `{ slug, hero, sections }`
2. Add an entry to `index.json`'s `branches` array with full metadata + `sectionTitles` derived from the new file
3. (Optional) Add a node to `branches-diagram.component.ts` `nodes[]` if it should appear on the home diagram
4. No code changes needed in components — the JSON-driven `BranchPageComponent` handles rendering

### How to add a new section to an existing branch

1. Edit `src/assets/data/learn/<slug>.json` → append to `sections[]`
2. Update `index.json` → append the new `{id, heading}` to that branch's `sectionTitles`
3. Verify build (`npx ng build`)

### Performance notes (2026-04-28)
- Initial portfolio bundle: **~259 kB** transfer (unchanged by Learn module additions)
- Lazy `learn-learn-module` chunk: **~155 kB** transfer (Three.js + 18 widgets + components)
- `index.json`: **~24 kB** (one fetch on first /learn visit)
- Per-branch JSON: 5–30 kB each (fetched on first visit to that branch, then cached)

### Content stats (2026-04-28)
| | Count |
|---|---|
| Branches | 15 (2 setup + 6 technical + 7 applied) |
| Sections | 179 |
| Interactive widgets in catalog | 18 |
| Widget bindings in JSON | 24 (incl. diffdrive ×2; some widgets bind in multiple branches now after the technical/applied refactor) |
| Code blocks | 171 |
| Bullets | 944 |
| Links | 240 |

### Newcomer onboarding
Two parallel entry points for newcomers:
1. **Setup branch** — pragmatic install path. Ends with `learning-paths` (5 concrete starter projects: mobile robot / arm / drone / learn-from-demos / AV) + `first-week` (day-by-day plan).
2. **Foundations branch** — the math + CS prereqs every robotics text assumes you know. Linear algebra, calculus + optimization, probability + statistics, Python and C++ idioms for robotics, debugging patterns, curated books + courses, communities, and careers + interview prep.

The home `index.json` intro body explicitly points new learners at both. Sidebar groups them under "Get Started"; home renders both as full-width Setup-style cards.

### Branches diagram interactivity
Hover behavior uses a **nested `<g>` pattern** to avoid the SVG/CSS transform collision: outer `<g>` carries the inline `transform="translate(...)"` for positioning; inner `<g class="node-scale">` carries the CSS `transform: scale(...)` on hover. Labels are rendered OUTSIDE the node circles in a separate `<g class="labels">` so longer titles don't clip and the hover scale doesn't drag the label with it. The hover popover is an absolutely-positioned HTML overlay (not SVG) so it never gets clipped by the diagram viewBox. Entrance animations stagger spokes / nodes / labels via per-element `--enter-delay` CSS variables. Active nodes have a subtle ambient `pulse` animation that speeds up on hover.

**Critical pitfall — never apply CSS `transform` to an SVG element that already has an inline `transform` attribute.** They collide and the inline value is dropped. Use the nested-`<g>` pattern above.

### Font Awesome icon set
Site loads **FA 6.6.0 free** from cdnjs. Backward-compatible with the v5 `fas fa-*` syntax used everywhere; canonical FA6 names (e.g. `fa-tower-broadcast`) work alongside legacy aliases (`fa-broadcast-tower`). Critical context: an earlier version pinned FA 5.0.6 (Feb 2018) which silently dropped any icon added after that — the diagram showed only the four oldest icons. If you add a new icon: verify it exists in FA6 free at https://fontawesome.com/search?o=r&m=free.

### Version notes (2026-04-28)
- ROS 2 default: **Jazzy Jalisco** (LTS, Ubuntu 24.04, EOL May 2029). Humble Hawksbill still patched until May 2027.
- Gazebo: **Harmonic** is the current pairing for Jazzy (Fortress for Humble).
- A scheduled remote agent ([routine](https://claude.ai/code/routines/trig_01W7qmYUg75g9PXuniaWcyDf)) fires 2026-05-26 to add 3 widgets (SensorFusion2D, MpcHorizon, NeuralNetForward) and re-sweep dependency versions / VLA model names.

---

## User Instructions & Preferences

### Git
- **Never commit or push automatically.** Always show the proposed commit message and ask for explicit approval before running `git commit` or `git push`.

### Content & Copy
- Portfolio is targeted at **robotics job hunting**  frame everything around robotics, C++, ROS2, perception, planning.
- Availability badge: **"Open to Robotics Roles"**
- Hero typewriter roles: Robotics Software Engineer → Systems Development Engineer → C++ · ROS2 · Perception · Planning
- Stories in the About section use **single flowing prose**  no STAR split boxes, no Amazon Leadership Principle labels.
- The `principle` field in stories is a personal theme tagline (italic, slate-500), not an ALP name.
- Third project category is **"Mechanical"** (not "Automobile").

### UI & Design
- Keep the **dark theme**  `bg-dark-bg` (#0d1117), `bg-dark-surface`, Tailwind slate palette.
- All sections must be **fully mobile-responsive**: use `px-4 sm:px-6`, `py-12 sm:py-20`, responsive text sizes.
- Experience cards: company + role stacked vertically (no side-by-side on mobile), no company initial badge.
- Project tabs: `mat-stretch-tabs="true"` so all 3 tabs fill equal width on small screens.
- Project cards: gradient category header (72px, `bg-gradient-to-r [ngClass]="category.color"`) instead of images; show top 2 highlights + 4 tech pills.
- Skills chips show Font Awesome icons on **desktop only** (`hidden md:inline-block`).

### Project Cards  Images
- Cards currently use **gradient category headers** (72px, `bg-gradient-to-r [ngClass]="category.color"`) instead of images  intentional, not a bug.
- **Pending after UI is finalized:** restore image support with the hybrid approach  show `project.imageUrls[0]` when a real image exists, fall back to the gradient header when the image is a placeholder. Cards with real photos: SUPRA 2018 (`supra2018.jpg`), SUPRA 2017 (`supra2017.jpg`), BFKCT (`bfkct2018.jpg`), ATLAS (`atlasCheckPoint.jpg`), Drone Collision (`edge_not_aligned3.jpg`).

### Code Style
- All Angular components: `standalone: false` (NgModule-based, not standalone).
- No comments unless the WHY is non-obvious.
- Prefer editing existing files; do not create new components unless explicitly asked.
- Do not add error handling, fallbacks, or abstractions beyond the task.

### Learn module content style
- Each section's `body` should be 1-3 dense paragraphs explaining the WHY + key concepts. Avoid filler.
- `bullets` capture 4-7 key takeaways someone learning the topic should remember.
- `codeBlocks` should be runnable, idiomatic ROS 2 Humble (or relevant domain) — not pseudocode.
- Use `{{ws}}` for any workspace-relative path so the workspace input has a visible effect.
- `links` are canonical references (official docs, paper page, primary repo) — no SEO blogs.
- Hero `intro` is a 2-3 sentence framing of the entire branch (shown above the section list).

---

## Build & Deploy

```bash
# Dev server
npx ng serve                   # http://localhost:4200

# Production build → docs/
npx ng build

# Deploy (after user approves commit)
git add docs/ src/
git commit -m "your message"
git push                       # GitHub Pages serves from docs/
```

---

## User Profile

- **Name:** Ezhilan Veluchami
- **Email:** ezhilan.veluchami@gmail.com
- **Current role:** Systems Development Engineer, Amazon Robotics (May 2025–Present), Greater Boston, MA
- **Education:** MS Robotics & Autonomous Systems, ASU  4.0 GPA, Graduated With Distinction
- **Background:** Robotics + 5 years full-stack (Infosys) + automobile engineering (Karpagam BE)
- **Work auth:** STEM OPT valid through July 2027, H-1B pending
- **Resume:** https://drive.google.com/file/d/19F_hfYUmYktTFvMLo4RRnwrdnHdn4LTw/view?usp=sharing
- **LinkedIn:** https://www.linkedin.com/in/ezhilan-veluchami/
- **GitHub:** https://github.com/Ezhilan-V
