#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const outputDir = '/workspace/output';
const outputFile = path.join(outputDir, 'review-result.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const serverUrl = process.env._ORACLE_SECRET_KYC_SERVER_URL;
const token = process.env.TOKEN;

function writeResult(result) {
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

function fail(message) {
  writeResult({ success: false, error: message });
  process.exit(1);
}

if (!serverUrl) fail('Missing _ORACLE_SECRET_KYC_SERVER_URL');
if (!token) fail('Missing TOKEN (ComplyCube session token from get-session-token step)');

function request(method, urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, serverUrl);
    const mod = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // POST /tokens/byToken/:token/review — Trigger review (public endpoint, no auth needed)
  console.log(`Triggering review for token: ${token.slice(0, 8)}...`);

  const res = await request('POST', `/tokens/byToken/${encodeURIComponent(token)}/review`);

  if (res.status !== 200) {
    // The webview may have already triggered review, which deletes the token.
    // A 404 here is expected if the user already completed the webview flow.
    if (res.status === 404) {
      writeResult({
        success: true,
        alreadyReviewed: true,
        message: 'Token not found — review was likely already triggered by the webview.',
      });
      return;
    }
    fail(`Failed to trigger review: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const reviewData = res.body.data || res.body;

  writeResult({
    success: true,
    alreadyReviewed: false,
    status: reviewData.status || 'review',
  });
}

main().catch((err) => fail(`Unexpected error: ${err.message}`));
