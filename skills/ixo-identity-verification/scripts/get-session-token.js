#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const outputDir = '/workspace/output';
const outputFile = path.join(outputDir, 'session-token.json');

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

function request(method, urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, serverUrl);
    const mod = url.protocol === 'https:' ? https : http;

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
  // GET /tokens/:did/:protocolId — Get ComplyCube session token + webview URL
  console.log(`Getting session token for DID: ${userDid}, Protocol: ${protocolDid}`);

  const res = await request('GET', `/tokens/${encodeURIComponent(userDid)}/${encodeURIComponent(protocolDid)}`);

  if (res.status !== 200) {
    fail(`Failed to get session token: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const tokenData = res.body.data || res.body;

  const result = {
    success: true,
    token: tokenData.token,
    kycUrl: tokenData.url,
    expiresAt: tokenData.exp ? new Date(tokenData.exp).toISOString() : null,
  };

  writeResult(result);

  // Also write a pre-formatted flowlink update file for apply_sandbox_output_to_block
  const flowlinkUpdate = {
    links: JSON.stringify([{
      id: 'kyc-liveness-link',
      title: 'Complete Identity Verification',
      description: 'Click to open the liveness check in a new tab',
      captionText: '',
      position: 0,
      externalUrl: tokenData.url,
    }]),
  };
  const flowlinkFile = path.join(outputDir, 'flowlink-update.json');
  fs.writeFileSync(flowlinkFile, JSON.stringify(flowlinkUpdate, null, 2));
}

main().catch((err) => fail(`Unexpected error: ${err.message}`));
