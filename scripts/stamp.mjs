#!/usr/bin/env node
// Cache-busting for a static host.
//
// GitHub Pages lets browsers cache CSS and JS for ~10 minutes. Without this, a visitor who
// loaded the site just before a deploy can get NEW html with OLD css/js, which breaks the page.
// This rewrites index.html so every first-party file is requested as <file>?v=<content hash>.
// The HTML decides which versions load, so a browser always gets one matching set.
//
//   node scripts/stamp.mjs           rewrite index.html
//   node scripts/stamp.mjs --check   exit 1 if index.html is out of date (used by the git hook)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const jsFiles = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).sort();
const hash = createHash('sha256');
for (const f of ['styles.css', ...jsFiles.map((f) => `js/${f}`)]) hash.update(f).update(read(f));
const v = hash.digest('hex').slice(0, 10);

// three.js is vendored and rarely changes, so it gets its own stable version and stays cached.
const three = JSON.parse(readFileSync(join(root, 'vendor/three/package-version.json'), 'utf8')).version;
const vend = (p) => `./vendor/three/${p}?v=${three}`;

const imports = {
  three: vend('three.module.js'),
  './vendor/three/three.core.js': vend('three.core.js'), // imported by three.module.js
  'three/addons/RoundedBoxGeometry.js': vend('addons/RoundedBoxGeometry.js'),
  'three/addons/RoomEnvironment.js': vend('addons/RoomEnvironment.js'),
};
for (const f of jsFiles) imports[`./js/${f}`] = `./js/${f}?v=${v}`;

const map = `<script type="importmap">\n    ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n    ')}\n  </script>`;

let html = read('index.html');
html = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, () => map)
  .replace(/<link rel="stylesheet" href="styles\.css[^"]*" \/>/, `<link rel="stylesheet" href="styles.css?v=${v}" />`)
  .replace(/<script type="module" src="js\/main\.js[^"]*"><\/script>/, `<script type="module" src="js/main.js?v=${v}"></script>`);

if (process.argv.includes('--check')) {
  if (html !== read('index.html')) {
    console.error('index.html asset versions are stale. Run: node scripts/stamp.mjs');
    process.exit(1);
  }
  console.log(`index.html is up to date (v=${v})`);
} else {
  writeFileSync(join(root, 'index.html'), html);
  console.log(`stamped index.html with v=${v}`);
}
