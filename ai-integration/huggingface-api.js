/**
 * Hugging Face Inference API helper for Node.js.
 * Usage: node huggingface-api.js "Bitcoin is going up"
 * Requires: HF_API_KEY in env. Optional: HF_MODEL (default: cardiffnlp/twitter-roberta-base-sentiment-latest)
 */
const https = require('https');

const apiKey = process.env.HF_API_KEY;
const model = process.env.HF_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment-latest';

function infer(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ inputs: text });
    const req = https.request({
      hostname: 'api-inference.huggingface.co',
      path: '/models/' + model,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const best = parsed.reduce((a, b) => (a.score > b.score ? a : b));
            resolve({ label: best.label, score: best.score });
          } else {
            resolve({ label: 'neutral', score: 0.5 });
          }
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
    console.error('Set HF_API_KEY');
    process.exit(1);
  }
  const result = await infer(text);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
