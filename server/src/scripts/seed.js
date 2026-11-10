/**
 * Create demo accounts (idempotent). Run with: npm run seed
 *   admin    — from ADMIN_EMAIL / ADMIN_PASSWORD in .env
 *   operator — operator@aegisheal.local / Operator@123
 *   viewer   — viewer@aegisheal.local   / Viewer@1234
 */
import path from 'node:path';
import { config } from '../config/index.js';
import { JsonStore } from '../lib/store.js';
import { UserService } from '../users/userService.js';

const store = new JsonStore(path.join(config.dataDir, 'aegisheal.json'));
const users = new UserService(store);

const accounts = [
  { name: config.admin.name, email: config.admin.email, password: config.admin.password, role: 'admin' },
  { name: 'Demo Operator', email: 'operator@aegisheal.local', password: 'Operator@123', role: 'operator' },
  { name: 'Demo Viewer', email: 'viewer@aegisheal.local', password: 'Viewer@1234', role: 'viewer' },
];

for (const a of accounts) {
  if (users.byEmail(a.email)) {
    console.log(`• ${a.role.padEnd(8)} ${a.email} already exists`);
    continue;
  }
  await users.create(a);
  console.log(`✓ ${a.role.padEnd(8)} ${a.email} created`);
}
store.flushSync();
console.log(`\nDatabase: ${store.filePath}\nDone. Start the app with: npm run dev`);
