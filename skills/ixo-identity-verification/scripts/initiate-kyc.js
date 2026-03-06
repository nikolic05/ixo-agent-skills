#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const outputDir = '/workspace/output';
const outputFile = path.join(outputDir, 'initiate-result.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read environment
const userDid = process.env._SKILL_CONTEXT_USER_DID;
const userAddress = process.env._SKILL_CONTEXT_USER_ADDRESS;
const providerToken = process.env._ORACLE_SECRET_KYC_PROVIDER_TOKEN;
const serverUrl = process.env._ORACLE_SECRET_KYC_SERVER_URL;
const protocolDid = process.env.PROTOCOL_DID;
const formDataRaw = process.env.FORM_DATA;

function writeResult(result) {
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

function fail(message) {
  writeResult({ success: false, error: message });
  process.exit(1);
}

// Validate required env vars
if (!userDid) fail('Missing _SKILL_CONTEXT_USER_DID');
if (!userAddress) fail('Missing _SKILL_CONTEXT_USER_ADDRESS');
if (!providerToken) fail('Missing _ORACLE_SECRET_KYC_PROVIDER_TOKEN');
if (!serverUrl) fail('Missing _ORACLE_SECRET_KYC_SERVER_URL');
if (!protocolDid) fail('Missing PROTOCOL_DID');

// Parse form data (survey answers from the form block)
let formData = {};
if (formDataRaw) {
  try {
    formData = JSON.parse(formDataRaw);
  } catch (e) {
    fail(`Invalid FORM_DATA JSON: ${e.message}`);
  }
}

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
  // Step 1: POST /kycaml/:did — Create the evaluation
  const createBody = {
    address: userAddress,
    protocolId: protocolDid,
    data: formData,
  };

  console.log(`Initiating KYC for DID: ${userDid}`);
  console.log(`Protocol: ${protocolDid}`);

  const createRes = await request('POST', `/kycaml/${encodeURIComponent(userDid)}`, createBody);

  if (createRes.status !== 200 && createRes.status !== 201) {
    fail(`Failed to create evaluation: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }

  const evaluation = createRes.body.data || createRes.body;

  writeResult({
    success: true,
    did: userDid,
    protocolDid,
    status: evaluation.status || 'verify',
    evaluation,
  });
}

main().catch((err) => fail(`Unexpected error: ${err.message}`));
