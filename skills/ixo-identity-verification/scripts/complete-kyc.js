#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const outputDir = '/workspace/output';
const outputFile = path.join(outputDir, 'complete-result.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const userDid = process.env._SKILL_CONTEXT_USER_DID;
const providerToken = process.env._ORACLE_SECRET_KYC_PROVIDER_TOKEN;
const serverUrl = process.env._ORACLE_SECRET_KYC_SERVER_URL;
const protocolDid = process.env.PROTOCOL_DID;

function writeResult(result) {
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

function fail(message) {
  writeResult({ success: false, error: message });
  process.exit(1);
}

if (!userDid) fail('Missing _SKILL_CONTEXT_USER_DID');
if (!providerToken) fail('Missing _ORACLE_SECRET_KYC_PROVIDER_TOKEN');
if (!serverUrl) fail('Missing _ORACLE_SECRET_KYC_SERVER_URL');
if (!protocolDid) fail('Missing PROTOCOL_DID');

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, serverUrl);
    const mod = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Authorization': providerToken,
        'Content-Type': 'application/json',
      },
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

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
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // PATCH /kycaml/:did/:protocolId — Mark evaluation as complete
  console.log(`Completing KYC for DID: ${userDid}, Protocol: ${protocolDid}`);

  const res = await request(
    'PATCH',
    `/kycaml/${encodeURIComponent(userDid)}/${encodeURIComponent(protocolDid)}`,
    { status: 'complete' }
  );

  if (res.status !== 200) {
    fail(`Failed to complete KYC: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const evaluation = res.body.data || res.body;

  writeResult({
    success: true,
    status: evaluation.status || 'complete',
  });
}

main().catch((err) => fail(`Unexpected error: ${err.message}`));
