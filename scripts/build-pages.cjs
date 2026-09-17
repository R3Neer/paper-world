const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const files = [
  'index.html',
  'styles.css',
  'device-canvas.css',
  'device-canvas.js',
  'script.js',
];

fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

for (const directory of ['assets', 'public']) {
  fs.cpSync(path.join(root, directory), path.join(dist, directory), {recursive: true});
}

console.log(`GitHub Pages bundle written to ${dist}`);
