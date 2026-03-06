#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const outputDir = '/workspace/output';
const outputFile = path.join(outputDir, 'poll-result.json');

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

// Terminal statuses — stop polling when one of these is reached
const TERMINAL_STATUSES = new Set(['issued', 'rejected', 'error', 'complete']);

// Statuses that indicate verification is still processing (post-review)
const PROCESSING_STATUSES = new Set(['clear', 'authorizing', 'authorized', 'issuing']);

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
  // GET /kycaml/:did/:protocolId — Get full evaluation details (authenticated)
  console.log(`Polling status for DID: ${userDid}, Protocol: ${protocolDid}`);

  const res = await request('GET', `/kycaml/${encodeURIComponent(userDid)}/${encodeURIComponent(protocolDid)}`);

  if (res.status !== 200) {
    fail(`Failed to get status: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const evaluation = res.body.data || res.body;
  const status = (evaluation.status || 'unknown').toLowerCase();
  const isTerminal = TERMINAL_STATUSES.has(status);
  const isProcessing = PROCESSING_STATUSES.has(status);

  // Map KYC server status to a high-level phase for the caller
  let phase;
  if (status === 'issued') {
    phase = 'credential_ready';
  } else if (status === 'rejected') {
    phase = 'rejected';
  } else if (status === 'error' || status === 'unknown') {
    phase = 'error';
  } else if (isProcessing) {
    phase = 'processing';
  } else {
    phase = 'verifying';
  }

  // Extract check results if available
  const checks = {};
  const checkFields = [
    'standard_screening_check', 'extensive_screening_check', 'document_check',
    'identity_check', 'enhanced_identity_check', 'proof_of_address_check',
    'multi_bureau_check', 'face_authentication_check', 'age_estimation_check',
  ];
  for (const field of checkFields) {
    if (evaluation[field]) {
      checks[field] = evaluation[field];
    }
  }

  writeResult({
    success: true,
    serverStatus: status,
    phase,
    isTerminal,
    isProcessing,
    checks: Object.keys(checks).length > 0 ? checks : undefined,
  });
}

main().catch((err) => fail(`Unexpected error: ${err.message}`));
