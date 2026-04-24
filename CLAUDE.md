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
| Icons | Font Awesome 5 (CDN, brand + solid) + Angular Material Icons |
| Content | Single JSON file: `src/assets/data/portfolio.json` |
| Hosting | GitHub Pages (`docs/` output folder) |

---

## Key Files

```
src/assets/data/portfolio.json          ← ALL site content lives here
src/app/profile/profile.service.ts      ← TypeScript interfaces + data getters
src/app/profile/profile.component.html  ← Top-level layout (hero, sections, footer)
src/app/profile/profile.component.scss  ← Global profile + hero styles
src/app/profile/profile.module.ts       ← Module declarations
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
