#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const { spawnSync } = require('child_process');
const { loadRootEnv } = require('./lib/load-env');

loadRootEnv();

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
