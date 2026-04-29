#!/usr/bin/env node
/**
 * Migrate ROS 2 Humble references → Jazzy across per-branch JSON files.
 * Conservative: only touches code blocks + obvious distro mentions, never
 * rewrites prose paragraphs (those are handled by hand for distro-choice).
 */

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'data', 'learn');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json');

const codeReplacements = [
  // apt packages — surgical exact-match
  [/ros-humble-/g,                           'ros-jazzy-'],
  [/osrf\/ros:humble-/g,                     'osrf/ros:jazzy-'],
  [/ros-jazzy-jazzy-/g,                      'ros-jazzy-'], // safety: don't double-prefix
  [/\$ROS_DISTRO == 'humble'/g,              "$ROS_DISTRO == 'jazzy'"],
  [/echo \$ROS_DISTRO {2,}# → humble/g,      'echo $ROS_DISTRO   # → jazzy'],
  [/ros\/humble\//g,                         'ros/jazzy/'],
  [/\.ros\.org\/en\/humble\//g,              '.ros.org/en/jazzy/'],

  // git branch references in clone / vcs imports
  [/-b humble\b/g,                           '-b jazzy'],
  [/-b\s+humble\b/g,                         '-b jazzy'],
  [/version: humble\b/g,                     'version: jazzy'],
  [/branch: humble\b/g,                      'branch: jazzy'],
  [/--rosdistro humble\b/g,                  '--rosdistro jazzy'],
  [/source\s+\/opt\/ros\/humble\//g,         'source /opt/ros/jazzy/'],
  [/\/opt\/ros\/humble\//g,                  '/opt/ros/jazzy/'],
  [/source\s+\/opt\/ros\/humble\/setup\.bash/g, 'source /opt/ros/jazzy/setup.bash'],

  // Ubuntu codename
  [/Ubuntu 22\.04/g,                         'Ubuntu 24.04'],
  [/22\.04 \(jammy\)/g,                      '24.04 (noble)'],

  // Plain string mentions in titles/notes/labels
  [/ROS 2 Humble\b/g,                        'ROS 2 Jazzy'],
  [/Humble distribution\b/gi,                'Jazzy distribution'],
  [/the Humble \(/g,                         'the Jazzy ('],
];

// Anything inside "code" string fields gets all replacements above.
function fix(value) {
  let s = value;
  for (const [pat, rep] of codeReplacements) s = s.replace(pat, rep);
  return s;
}

let totalFiles = 0;
let totalCodeReplacements = 0;
let totalLinkReplacements = 0;

for (const f of files) {
  const fullPath = path.join(dir, f);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  let beforeCode = 0, afterCode = 0;
  let beforeLinks = 0, afterLinks = 0;

  for (const sec of data.sections || []) {
    if (sec.codeBlocks) {
      for (const cb of sec.codeBlocks) {
        if (typeof cb.code === 'string') {
          beforeCode += (cb.code.match(/humble/gi) || []).length + (cb.code.match(/22\.04/g) || []).length;
          cb.code = fix(cb.code);
          afterCode += (cb.code.match(/humble/gi) || []).length + (cb.code.match(/22\.04/g) || []).length;
        }
        if (typeof cb.note === 'string') cb.note = fix(cb.note);
        if (typeof cb.title === 'string') cb.title = fix(cb.title);
      }
    }
    if (sec.links) {
      for (const ln of sec.links) {
        if (typeof ln.url === 'string') {
          const before = (ln.url.match(/\/en\/humble\//g) || []).length;
          ln.url = ln.url.replace(/\/en\/humble\//g, '/en/jazzy/');
          const after = (ln.url.match(/\/en\/humble\//g) || []).length;
          beforeLinks += before; afterLinks += after;
        }
      }
    }
  }

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  const codeFixed = beforeCode - afterCode;
  const linkFixed = beforeLinks - afterLinks;
  totalCodeReplacements += codeFixed;
  totalLinkReplacements += linkFixed;
  totalFiles++;
  console.log(`  ${f.padEnd(20)}  code:${codeFixed.toString().padStart(3)}  links:${linkFixed.toString().padStart(3)}`);
}

console.log(`\n${totalFiles} files, ${totalCodeReplacements} code replacements, ${totalLinkReplacements} link replacements`);
