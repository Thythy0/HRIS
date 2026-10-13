// One-command dynamic setup: `npm run setup`
// - installs deps if node_modules is missing
// - creates .env from .env.example if missing (demo mode works with no keys)
// - reports which mode the project will run in
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(root, '..');
const major = Number(process.versions.node.split('.')[0]);

if (major < 18) {
  console.error(`Node 18+ required (found ${process.versions.node}).`);
  process.exit(1);
}

if (!fs.existsSync(path.join(project, 'node_modules'))) {
  console.log('Installing dependencies…');
  execSync('npm install', { stdio: 'inherit', cwd: project });
} else {
  console.log('Dependencies already installed.');
}

const example = path.join(project, '.env.example');
const target = path.join(project, '.env');
if (!fs.existsSync(target)) {
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, target);
    console.log('Created .env from .env.example (demo mode — no database keys).');
  } else {
    console.log('No .env.example found, skipping .env creation.');
  }
} else {
  console.log('.env already exists, leaving it untouched.');
}

const envText = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
const hasSupabase = /VITE_SUPABASE_URL=https:\/\//.test(envText) && !envText.includes('xyzcompany');
console.log(hasSupabase
  ? 'Mode: Supabase Postgres (keys detected in .env).'
  : 'Mode: local demo data (no Supabase keys — set them in .env to share data).');
console.log('Next: npm run dev  →  http://localhost:5173');
console.log('Demo logins: admin@sunrisedigital.ph / admin123 · employee@sunrisedigital.ph / emp123');
