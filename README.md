# Ezhilan Veluchami  Portfolio

Personal portfolio site for Ezhilan Veluchami, Systems Development Engineer at Amazon Robotics. Built with Angular 19, Tailwind CSS, and Angular Material. Deployed via GitHub Pages at [ezhilan-v.github.io](https://ezhilan-v.github.io).

## Stack

- **Framework**: Angular 19 (NgModule, zone.js)
- **Styling**: Tailwind CSS v3 + Angular Material M3 + Bootstrap 4 (layout only)
- **Animations**: AOS (Animate on Scroll)
- **Icons**: Font Awesome 5 (CDN) + Angular Material Icons
- **Content**: Single JSON file at `src/assets/data/portfolio.json`  all text, skills, projects, and experience data lives here
- **Hosting**: GitHub Pages (output to `docs/`)

## Sections

1. Hero  typewriter role, count-up stats, tech tags
2. About  professional summary, contact info, expandable STAR engineering stories
3. Skills  categorized chips with icons, click-to-filter projects
4. Experience  Amazon Robotics, ASU, Infosys, Ashok Leyland with sub-projects
5. Education  ASU MS Robotics (4.0 GPA), Karpagam BE Automobile Engineering
6. Patent  U.S. Application No. 63/574,771 (Parkinson's biofeedback device)
7. Projects  Robotics, Software, and Automobile categories
8. Contact

## Development

```bash
npm install
npx ng serve           # dev server at http://localhost:4200
```

## Build & Deploy

```bash
npx ng build           # production build → docs/
git add docs/ src/
git commit -m "deploy"
git push               # GitHub Pages serves from docs/
```

## Content Updates

All site content is driven by `src/assets/data/portfolio.json`. Update that file and rebuild  no component changes needed for text, skills, projects, or experience.
