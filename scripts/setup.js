#!/usr/bin/env node
/**
 * One-time project setup (cross-platform):
 *   1. checks the Node.js version
 *   2. creates server/.env from server/.env.example with a strong random JWT secret
 *   3. reminds you of the next commands
 * Safe to run again: an existing server/.env is never overwritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error(`✗ Node.js 20 or newer is required (you have ${process.versions.node}). Install the LTS from https://nodejs.org`);
  process.exit(1);
}
console.log(`✓ Node.js ${process.versions.node}`);

const example = path.join(root, 'server', '.env.example');
const target = path.join(root, 'server', '.env');
if (fs.existsSync(target)) {
  console.log('✓ server/.env already exists (left unchanged)');
} else {
  const secret = crypto.randomBytes(48).toString('hex');
  const content = fs
    .readFileSync(example, 'utf8')
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  fs.writeFileSync(target, content, { mode: 0o600 });
  console.log('✓ Created server/.env with a random JWT_SECRET');
}
console.log('\nNext steps:\n  npm run seed     # create demo accounts\n  npm run dev      # start API + dashboard → http://localhost:5173\n');
