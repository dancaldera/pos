#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

const runCommand = (command, args, cwd = rootDir) => {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
};

const build = async () => {
  try {
    console.log('🏗️  Building inventory system...\n');

    // Build shared package first
    console.log('📦 Building shared package...');
    await runCommand('pnpm', ['--filter', 'shared', 'build']);

    // Build backend
    console.log('🔧 Building backend...');
    await runCommand('pnpm', ['--filter', 'backend', 'build']);

    // Build frontend
    console.log('⚛️  Building frontend...');
    await runCommand('pnpm', ['--filter', 'frontend', 'build']);

    console.log('\n✅ Build completed successfully!');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
};

build();