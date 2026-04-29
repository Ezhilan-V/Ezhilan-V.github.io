#!/usr/bin/env node
/**
 * Replace em-dash (—, U+2014) with a regular hyphen-minus (-) across all
 * user-facing source under src/. Skips binary assets and lockfiles.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const EXTS = ['.json', '.html', '.ts', '.scss', '.css', '.md'];

let changed = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (EXTS.includes(path.extname(name))) {
      const before = fs.readFileSync(p, 'utf8');
      if (!before.includes('—')) continue;
      const after = before.replace(/—/g, '-');
      if (after !== before) {
        fs.writeFileSync(p, after, 'utf8');
        changed++;
        console.log(`✓ ${path.relative(path.join(ROOT, '..'), p)}`);
      }
    }
  }
}

walk(ROOT);
console.log(`\nDone. ${changed} file(s) updated.`);
