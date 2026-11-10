/**
 * Delete ALL stored data (users, incidents, audit, settings, learning).
 * Requires the --yes flag so it is never run by accident:
 *   npm run reset-data -- --yes
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

if (!process.argv.includes('--yes')) {
  console.log('This permanently deletes all AegisHeal data in', config.dataDir);
  console.log('Re-run with:  npm run reset-data -- --yes');
  process.exit(1);
}

const file = path.join(config.dataDir, 'aegisheal.json');
for (const f of [file, `${file}.tmp`]) {
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    console.log('Removed', f);
  }
}
console.log('Data reset. Run `npm run seed` to recreate the demo accounts.');
