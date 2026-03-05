#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

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

const { spawn } = require('child_process');
const isProd = process.env.NODE_ENV === 'production';
const args = ['run', '--manifest-path', path.join(__dirname, '..', 'backend-rust', 'Cargo.toml')];
if (isProd) args.splice(1, 0, '--release');
const proc = spawn('cargo', args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
proc.on('exit', (code, sig) => process.exit(code !== null ? code : sig ? 1 : 0));
