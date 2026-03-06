#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const outputDir = '/workspace/output';
const outputFile = path.join(outputDir, 'credential.json');

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
  const errorResult = { success: false, error: message };
  fs.writeFileSync(outputFile, JSON.stringify(errorResult, null, 2));
  console.log(JSON.stringify(errorResult, null, 2));
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
  // GET /kycaml/:did/:protocolId/credential — Fetch the Verifiable Credential
  console.log(`Fetching credential for DID: ${userDid}, Protocol: ${protocolDid}`);

  const res = await request('GET', `/kycaml/${encodeURIComponent(userDid)}/${encodeURIComponent(protocolDid)}/credential`);

  if (res.status !== 200) {
    fail(`Failed to fetch credential: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const credentialData = res.body.data || res.body;

  // The response is { data: { "<credentialKey>": { ...VC... } } }
  // Extract the first (and typically only) credential
  const credentialKeys = Object.keys(credentialData);
  if (credentialKeys.length === 0) {
    fail('No credential found in response');
  }

  const credentialKey = credentialKeys[0];
  const credential = credentialData[credentialKey];

  writeResult({
    success: true,
    credentialKey,
    credential,
  });
}

main().catch((err) => fail(`Unexpected error: ${err.message}`));
