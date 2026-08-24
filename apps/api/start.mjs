// Start script - run this with: node apps/api/start.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Use tsx directly via require
require('tsx/cjs');
// Dynamic import to register tsx loader
await import('./apps/api/src/main.ts');
