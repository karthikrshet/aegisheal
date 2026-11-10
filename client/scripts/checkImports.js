/** Lightweight lint: every relative import in src/ must resolve to a real file. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const exts = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
let problems = 0;
let files = 0;

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(jsx?|css)$/.test(e.name)) check(full);
  }
};

function check(file) {
  files += 1;
  const src = fs.readFileSync(file, 'utf8');
  const re = /(?:import\s[^'"]*?from\s*|import\s*\(|@import\s+)['"](\.{1,2}\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const base = path.resolve(path.dirname(file), m[1]);
    if (!exts.some((x) => fs.existsSync(base + x) && fs.statSync(base + x).isFile())) {
      problems += 1;
      console.error(`✗ ${path.relative(root, file)} -> ${m[1]}`);
    }
  }
}

walk(root);
console.log(problems ? `${problems} unresolved import(s)` : `✓ ${files} files, all imports resolve`);
process.exit(problems ? 1 : 0);
