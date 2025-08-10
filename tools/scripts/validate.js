#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

console.log('🔍 Validating monorepo setup...\n');

const checks = [
  {
    name: 'Root package.json exists',
    check: () => existsSync(join(rootDir, 'package.json')),
  },
  {
    name: 'pnpm-workspace.yaml exists',
    check: () => existsSync(join(rootDir, 'pnpm-workspace.yaml')),
  },
  {
    name: 'Root tsconfig.json exists',
    check: () => existsSync(join(rootDir, 'tsconfig.json')),
  },
  {
    name: 'Frontend workspace exists',
    check: () => existsSync(join(rootDir, 'apps/frontend/package.json')),
  },
  {
    name: 'Backend workspace exists',
    check: () => existsSync(join(rootDir, 'apps/backend/package.json')),
  },
  {
    name: 'Shared package exists',
    check: () => existsSync(join(rootDir, 'packages/shared/package.json')),
  },
  {
    name: 'Frontend references shared package',
    check: () => {
      try {
        const pkg = JSON.parse(readFileSync(join(rootDir, 'apps/frontend/package.json'), 'utf8'));
        return pkg.dependencies?.shared === 'workspace:*';
      } catch {
        return false;
      }
    },
  },
  {
    name: 'TypeScript project references configured',
    check: () => {
      try {
        const tsconfig = JSON.parse(readFileSync(join(rootDir, 'tsconfig.json'), 'utf8'));
        return tsconfig.references && tsconfig.references.length > 0;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Development scripts exist',
    check: () => existsSync(join(rootDir, 'tools/scripts/dev.js')),
  },
  {
    name: 'Build scripts exist',
    check: () => existsSync(join(rootDir, 'tools/scripts/build.js')),
  },
];

let passed = 0;
let failed = 0;

for (const { name, check } of checks) {
  const result = check();
  if (result) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 Monorepo setup is valid!');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review the setup.');
  process.exit(1);
}