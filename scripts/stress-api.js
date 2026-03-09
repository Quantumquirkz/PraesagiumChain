#!/usr/bin/env node
/**
 * Phase 6 — API stress: sends many concurrent requests to /health and /api/markets.
 * Uso: node scripts/stress-api.js [baseUrl]
 * baseUrl por defecto: http://localhost:4000
 */
const base = process.argv[2] || 'http://localhost:4000';
const concurrency = 50;
const totalRequests = 500;
const endpoints = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/api/markets?page=1&limit=10' },
  { method: 'GET', path: '/api/markets/stats' },
];

async function fetchOne(url, method) {
  const start = Date.now();
  try {
    const res = await fetch(url, { method });
    const body = await res.text();
    return { status: res.status, duration: Date.now() - start, ok: res.ok };
  } catch (e) {
    return { status: 0, duration: Date.now() - start, error: e.message };
  }
}

async function run() {
  const rounds = Math.ceil(totalRequests / concurrency);
  const stats = { '200': 0, '2xx': 0, '4xx': 0, '5xx': 0, '0': 0, errors: 0 };
  let completed = 0;
  const startTotal = Date.now();

  for (let r = 0; r < rounds; r++) {
    const batch = [];
    for (let i = 0; i < concurrency && completed < totalRequests; i++) {
      const ep = endpoints[completed % endpoints.length];
      const url = base + ep.path;
      batch.push(fetchOne(url, ep.method));
      completed++;
    }
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r.status === 200) stats['200']++;
      else if (r.status >= 200 && r.status < 300) stats['2xx']++;
      else if (r.status >= 400 && r.status < 500) stats['4xx']++;
      else if (r.status >= 500) stats['5xx']++;
      else { stats['0']++; if (r.error) stats.errors++; }
    }
  }

  const elapsed = Date.now() - startTotal;
  console.log('Stress API results');
  console.log('Base URL:', base);
  console.log('Total requests:', completed);
  console.log('Total time (ms):', elapsed);
  console.log('HTTP 200:', stats['200']);
  console.log('HTTP 2xx:', stats['2xx']);
  console.log('HTTP 4xx:', stats['4xx']);
  console.log('HTTP 5xx:', stats['5xx']);
  console.log('Connection failed (0):', stats['0']);
  if (stats.errors) console.log('Errors:', stats.errors);
  console.log('Requests/sec:', (completed / (elapsed / 1000)).toFixed(2));
}

run().catch((e) => { console.error(e); process.exit(1); });
