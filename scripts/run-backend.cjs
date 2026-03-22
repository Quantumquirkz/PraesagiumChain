#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const { spawnSync } = require('child_process');
const fs = require('fs');
const { loadRootEnv } = require("./lib/load-env.cjs");

loadRootEnv();

const repoRoot = path.join(__dirname, '..');
const envPath = path.join(repoRoot, '.env');
if (!process.env.DATABASE_URL || String(process.env.DATABASE_URL).trim() === '') {
  if (!fs.existsSync(envPath)) {
    console.error(`\n[run-backend] Missing ${envPath}`);
    console.error('  Create it: cp env.example .env');
    console.error('  Then set DATABASE_URL (see env.example; Docker Postgres defaults to port 5433).\n');
  } else {
    console.error(`\n[run-backend] DATABASE_URL is not set or is empty in ${envPath}`);
    console.error('  Add a line like:');
    console.error('  DATABASE_URL=postgresql://praesagium:praesagium@localhost:5433/praesagium');
    console.error('  (Start Postgres: docker compose up -d postgres)\n');
  }
  process.exit(1);
}

// Liberar el puerto si ya está en uso (evita "Address already in use")
const port = process.env.PORT || '4000';
const kill = spawnSync('fuser', ['-k', `${port}/tcp`], {
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});
if (kill.status === 0 && kill.stdout) {
  const wait = spawnSync('sleep', ['1'], { stdio: 'ignore' });
}

const isProd = process.env.NODE_ENV === 'production';
const manifestPath = path.join(__dirname, '..', 'backend', 'Cargo.toml');
const args = ['run', '--manifest-path', manifestPath];
if (isProd) args.splice(1, 0, '--release');
const proc = spawn('cargo', args, {
  stdio: 'inherit',
  env: process.env,
  cwd: path.join(__dirname, '..'),
});
proc.on('exit', (code, sig) => process.exit(code !== null ? code : sig ? 1 : 0));
