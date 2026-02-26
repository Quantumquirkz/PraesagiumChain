/**
 * Google Gemini API helper for sentiment analysis (Node.js).
 * Usage: node gemini-api.js "Bitcoin is going up"
 * Requires: GEMINI_API_KEY in env. Optional: GEMINI_MODEL (default: gemini-1.5-flash)
 */
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

async function infer(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `Analyze the sentiment of this text. Reply with ONLY a single number from -1 (very negative) to 1 (very positive). Text: ${text}`
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 10
    }
  });

  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const textContent = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const scoreStr = (textContent || '').trim().split(/\s+/)[0] || '0';
          const score = parseFloat(scoreStr) || 0;
          resolve({ score: Math.max(-1, Math.min(1, score)), raw: textContent });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const text = process.argv[2] || 'Bitcoin is bullish';
  if (!apiKey) {
    console.error('Set GEMINI_API_KEY');
    process.exit(1);
  }
  const result = await infer(text);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
