#!/usr/bin/env node
/**
 * Remove the 'taxonomy-overview' section from every branch JSON and the
 * matching entry from index.json's sectionTitles. Idempotent — does nothing
 * if the section is already absent.
 *
 * Originally added by add-taxonomy-overview.cjs, these sections were heavy
 * on "Sub-branch — ..." and "Career — ..." bullets that cluttered the page
 * without much value-add for someone learning the topic.
 */

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'data', 'learn');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

let removedSections = 0;
let cleanedTitles = 0;

// 1. Strip from each branch JSON
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.json')) continue;
  if (name === 'index.json' || name === 'vocabulary.json' ||
      name === 'quiz.json' || name === 'paths.json') continue;

  const file = path.join(dir, name);
  const data = readJson(file);
  if (!Array.isArray(data.sections)) continue;
  const before = data.sections.length;
  data.sections = data.sections.filter(s => s.id !== 'taxonomy-overview');
  if (data.sections.length !== before) {
    writeJson(file, data);
    removedSections++;
    console.log(`✓ removed taxonomy-overview from ${name}`);
  }
}

// 2. Strip the matching sectionTitles entry from index.json
const indexFile = path.join(dir, 'index.json');
const idx = readJson(indexFile);
if (Array.isArray(idx.branches)) {
  for (const b of idx.branches) {
    if (!Array.isArray(b.sectionTitles)) continue;
    const before = b.sectionTitles.length;
    b.sectionTitles = b.sectionTitles.filter(s => s.id !== 'taxonomy-overview');
    if (b.sectionTitles.length !== before) cleanedTitles++;
  }
  writeJson(indexFile, idx);
}

console.log(`\nDone. Removed ${removedSections} sections, cleaned ${cleanedTitles} sectionTitles entries.`);
