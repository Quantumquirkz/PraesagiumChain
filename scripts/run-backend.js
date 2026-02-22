#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');
const isProd = process.env.NODE_ENV === 'production';
const args = ['run', '--manifest-path', require('path').join(__dirname, '..', 'backend-rust', 'Cargo.toml')];
if (isProd) args.splice(1, 0, '--release');
const proc = spawn('cargo', args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
proc.on('exit', (code, sig) => process.exit(code !== null ? code : sig ? 1 : 0));
