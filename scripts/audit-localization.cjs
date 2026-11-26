// Read-only localization coverage audit. Run: node scripts/audit-localization.cjs
// This does not build Android or modify application data.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dictionary = fs.readFileSync(path.join(root, 'src/i18n.ts'), 'utf8');
const keys = new Set();
for (const match of dictionary.matchAll(/^\s*(["'])(.*?)\1\s*:\s*(["'])/gm)) {
  keys.add(match[2].replace(/\\n/g, '\n'));
}
const missing = [];
let checked = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (['node_modules', '.git', '.test-build', 'android', 'ios'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.tsx$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, 'utf8');
    const relative = path.relative(root, full);
    // Only literal tr('...') calls can be checked statically; dynamic keys need UI tests.
    for (const match of source.matchAll(/\btr\(\s*(["'])(.*?)\1\s*\)/g)) {
      const key = match[2].replace(/\\n/g, '\n');
      if (!/[\u0600-\u06ff]/.test(key)) continue;
      checked++;
      if (!keys.has(key)) {
        const line = source.slice(0, match.index).split('\n').length;
        missing.push({file: relative, line, key});
      }
    }
  }
}
walk(root);
console.log(JSON.stringify({checked, missingCount: missing.length, missing}, null, 2));
if (missing.length) process.exitCode = 1;
