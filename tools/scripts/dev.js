#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

console.log('🚀 Starting development servers...\n');

// Start backend development server
const backend = spawn('pnpm', ['--filter', 'backend', 'dev'], {
  cwd: rootDir,
  stdio: 'pipe',
  shell: true
});

// Start frontend development server
const frontend = spawn('pnpm', ['--filter', 'frontend', 'dev'], {
  cwd: rootDir,
  stdio: 'pipe',
  shell: true
});

// Handle backend output
backend.stdout.on('data', (data) => {
  process.stdout.write(`[BACKEND] ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[BACKEND] ${data}`);
});

// Handle frontend output
frontend.stdout.on('data', (data) => {
  process.stdout.write(`[FRONTEND] ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`[FRONTEND] ${data}`);
});

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down development servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle child process exits
backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  if (code !== 0) {
    frontend.kill();
    process.exit(code);
  }
});

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
  if (code !== 0) {
    backend.kill();
    process.exit(code);
  }
});