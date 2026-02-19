#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');
const proc = spawn('cargo', ['run', '--manifest-path', require('path').join(__dirname, '..', 'backend-rust', 'Cargo.toml')], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
proc.on('exit', (code, sig) => process.exit(code !== null ? code : sig ? 1 : 0));
