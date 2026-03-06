#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { spawnSync } = require('child_process');

// Load .env from repo root (no dotenv dependency)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  });
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
const manifestPath = path.join(__dirname, '..', 'backend-rust', 'Cargo.toml');
const args = ['run', '--manifest-path', manifestPath];
if (isProd) args.splice(1, 0, '--release');
const proc = spawn('cargo', args, {
  stdio: 'inherit',
  env: process.env,
  cwd: path.join(__dirname, '..'),
});
proc.on('exit', (code, sig) => process.exit(code !== null ? code : sig ? 1 : 0));
