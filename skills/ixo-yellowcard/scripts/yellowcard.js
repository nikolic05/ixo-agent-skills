#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Credentials & Context
// ---------------------------------------------------------------------------

let _creds = null;

function loadCredentials() {
  if (_creds) return _creds;
  const apiKey = process.env._ORACLE_SECRET_YELLOWCARD_API_KEY;
  const secretKey = process.env._ORACLE_SECRET_YELLOWCARD_SECRET_KEY;
  const baseUrl = process.env._ORACLE_SECRET_YELLOWCARD_BASE_URL;
  if (!apiKey) fatal('Missing _ORACLE_SECRET_YELLOWCARD_API_KEY');
  if (!secretKey) fatal('Missing _ORACLE_SECRET_YELLOWCARD_SECRET_KEY');
  if (!baseUrl) fatal('Missing _ORACLE_SECRET_YELLOWCARD_BASE_URL');
  _creds = { apiKey, secretKey, baseUrl: baseUrl.replace(/\/+$/, '') };
  return _creds;
}

function loadContext() {
  return {
    userDid: normalizeDid(process.env._SKILL_CONTEXT_USER_DID || ''),
    sandboxId: process.env._SKILL_CONTEXT_SANDBOX_ID || '',
    timestamp: process.env._SKILL_CONTEXT_TIMESTAMP || new Date().toISOString(),
  };
}

function loadAdminDids() {
  const raw = process.env._ORACLE_SECRET_YELLOWCARD_ADMIN_DIDS || '';
  return raw.split(',').map(d => d.trim()).filter(Boolean);
}

function requireAdmin(ctx) {
  const admins = loadAdminDids();
  if (!ctx.userDid) fatal('No user DID in context — cannot authorize.');
  if (admins.length === 0) fatal('No admin DIDs configured (YELLOWCARD_ADMIN_DIDS is empty).');
  if (!admins.includes(ctx.userDid)) {
    fatal(`Unauthorized: DID ${ctx.userDid} is not in the admin list.`);
  }
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 Signing & HTTP
// ---------------------------------------------------------------------------

async function makeRequest(method, path, body) {
  const { apiKey, secretKey, baseUrl } = loadCredentials();
  const timestamp = new Date().toISOString();

  // HMAC signing: sign only the path portion (exclude query string)
  const signPath = path.split('?')[0];
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(timestamp, 'utf8');
  hmac.update(signPath, 'utf8');
  hmac.update(method.toUpperCase(), 'utf8');
  if (body) {
    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('base64');
    hmac.update(bodyHash);
  }
  const signature = hmac.digest('base64');

  const url = `${baseUrl}${path}`;
  const headers = {
    'X-YC-Timestamp': timestamp,
    'Authorization': `YcHmacV1 ${apiKey}:${signature}`,
    'Accept': 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';

  const opts = { method: method.toUpperCase(), headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { ok: res.ok, status: res.status, data };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function fatal(message) {
  console.log(JSON.stringify({ error: true, message }, null, 2));
  process.exit(1);
}

const OUTPUT_DIR = '/workspace/output';
const COMMAND_OUTPUT_FILES = {
  'discover': 'discover.json',
  'rates': 'rates.json',
  'balance': 'balance.json',
  'propose-payout': 'proposal.json',
  'execute-payout': 'execute-result.json',
  'check-payout': 'check-result.json',
};

function output(data) {
  const json = JSON.stringify(data, null, 2);
  console.log(json);

  // Write to output file for apply_sandbox_output_to_block
  const command = process.argv[2];
  const filename = COMMAND_OUTPUT_FILES[command];
  if (filename) {
    try {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), json);
    } catch {
      // Silently ignore file write errors (may not be in sandbox)
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(3);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      parsed[args[i].slice(2)] = args[i + 1];
      i++;
    } else if (args[i].startsWith('--')) {
      parsed[args[i].slice(2)] = true;
    }
  }
  return parsed;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`Invalid JSON on stdin: ${e.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

async function hashProposal(payload) {
  const str = stableStringify(payload);
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return hash;
}

function generateSequenceId() {
  return crypto.randomUUID();
}

/**
 * Convert a Matrix user ID to a DID if needed.
 * Matrix format: @did-ixo-ixo1abc123:server.domain → did:ixo:ixo1abc123
 * Already a DID: returned as-is.
 */
function normalizeDid(value) {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.startsWith('did:')) return trimmed;
  const match = trimmed.match(/^@did-([^:]+):(.+)$/);
  if (match) {
    return 'did:' + match[1].replace(/-/g, ':');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdDiscover() {
  const args = parseArgs();
  const country = args.country;
  if (!country) fatal('Missing --country flag (e.g. --country NG)');

  const [channelsRes, networksRes] = await Promise.all([
    makeRequest('GET', `/business/channels?country=${encodeURIComponent(country)}`),
    makeRequest('GET', `/business/networks?country=${encodeURIComponent(country)}`),
  ]);

  if (!channelsRes.ok && !networksRes.ok) {
    fatal(`Failed to discover for country ${country}: channels=${channelsRes.status}, networks=${networksRes.status}`);
  }

  const channels = channelsRes.ok ? channelsRes.data : { error: channelsRes.data };
  const networks = networksRes.ok ? networksRes.data : { error: networksRes.data };

  // Filter to withdrawal channels (payouts)
  const withdrawChannels = Array.isArray(channels)
    ? channels.filter(c => c.rampType === 'withdraw' && c.status === 'active')
    : channels;

  output({
    success: true,
    country,
    channels: withdrawChannels,
    networks: networksRes.ok ? networksRes.data : [],
    message: `Found ${Array.isArray(withdrawChannels) ? withdrawChannels.length : '?'} active payout channels for ${country}`,
  });
}

async function cmdRates() {
  const args = parseArgs();
  const currency = args.currency;
  if (!currency) fatal('Missing --currency flag (e.g. --currency NGN)');

  const res = await makeRequest('GET', `/business/rates?currency=${encodeURIComponent(currency)}`);
  if (!res.ok) fatal(`Failed to get rates for ${currency}: ${JSON.stringify(res.data)}`);

  output({
    success: true,
    currency,
    rates: res.data,
  });
}

async function cmdBalance() {
  const ctx = loadContext();
  requireAdmin(ctx);

  const res = await makeRequest('GET', '/business/account');
  if (!res.ok) fatal(`Failed to get account balance: ${JSON.stringify(res.data)}`);

  output({
    success: true,
    requester_did: ctx.userDid,
    accounts: res.data.accounts || res.data,
  });
}

async function cmdProposePayout() {
  const ctx = loadContext();
  requireAdmin(ctx);

  let input;
  try {
    input = await readStdin();
  } catch (e) {
    fatal(e.message);
  }

  // Validate required fields
  const required = ['channelId', 'currency', 'destination'];
  for (const field of required) {
    if (!input[field]) fatal(`Missing required field: ${field}`);
  }
  if (!input.amount && !input.localAmount) fatal('Missing amount or localAmount (provide one)');
  if (input.amount && input.localAmount) fatal('Provide either amount (USD) or localAmount (local currency), not both.');
  if (!input.destination.accountNumber) fatal('Missing destination.accountNumber');
  if (!input.destination.accountName) fatal('Missing destination.accountName (recipient name on account)');
  if (!input.destination.accountType) fatal('Missing destination.accountType (bank or momo)');
  if (!input.destination.networkId) fatal('Missing destination.networkId (from discover command)');
  if (!input.destination.country) fatal('Missing destination.country');

  if (!input.sender) fatal('Missing sender object (name, country, phone, email)');
  if (!input.sender.name) fatal('Missing sender.name');
  if (!input.sender.country) fatal('Missing sender.country');

  const useLocalAmount = !!input.localAmount;
  const amountValue = parseFloat(input.localAmount || input.amount);
  if (isNaN(amountValue) || amountValue <= 0) fatal('Amount must be a positive number');

  // Build the YellowCard payment payload
  // Required top-level: channelId, sequenceId, reason, sender, destination, customerUID, customerType, forceAccept
  // Required destination: accountNumber, accountName, accountType, networkId
  // Use either amount (USD) or localAmount (local currency), not both
  const sequenceId = generateSequenceId();
  const transferPayload = {
    channelId: input.channelId,
    sequenceId,
    ...(useLocalAmount ? { localAmount: amountValue } : { amount: amountValue }),
    currency: input.currency,
    country: input.destination.country,
    reason: input.reason || 'other',
    customerType: input.customerType || 'retail',
    customerUID: normalizeDid(input.recipientDid) || ctx.userDid || '',
    forceAccept: true,
    sender: {
      name: input.sender.name,
      country: input.sender.country,
      phone: input.sender.phone || '',
      email: input.sender.email || '',
      address: input.sender.address || '',
      dob: input.sender.dob || '',
      idType: input.sender.idType || '',
      idNumber: input.sender.idNumber || '',
    },
    destination: {
      accountName: input.destination.accountName,
      accountNumber: input.destination.accountNumber,
      accountType: input.destination.accountType,
      networkId: input.destination.networkId,
    },
  };

  // Include optional destination fields
  if (input.destination.country) transferPayload.destination.country = input.destination.country;
  if (input.destination.accountBank) transferPayload.destination.accountBank = input.destination.accountBank;

  const proposalHash = await hashProposal(transferPayload);

  output({
    success: true,
    proposal_id: proposalHash,
    requester_did: ctx.userDid,
    sequenceId,
    transfer_payload: transferPayload,
    summary: {
      recipient_name: input.destination.accountName,
      recipient_account: input.destination.accountNumber,
      recipient_country: input.destination.country,
      account_type: input.destination.accountType,
      amount_type: useLocalAmount ? 'localAmount' : 'amount (USD)',
      amount: amountValue,
      currency: input.currency,
      reason: transferPayload.reason,
      recipient_did: transferPayload.customerUID,
    },
    message: 'Payout proposal created. Review the summary above and confirm to execute.',
    created_at: ctx.timestamp,
  });
}

async function cmdExecutePayout() {
  const ctx = loadContext();
  requireAdmin(ctx);

  let proposal;
  try {
    proposal = await readStdin();
  } catch (e) {
    fatal(e.message);
  }

  if (!proposal.proposal_id) fatal('Missing proposal_id — pass the full proposal JSON from propose-payout.');
  if (!proposal.transfer_payload) fatal('Missing transfer_payload — pass the full proposal JSON from propose-payout.');
  if (!proposal.requester_did) fatal('Missing requester_did in proposal.');

  // Verify identity
  if (proposal.requester_did !== ctx.userDid) {
    fatal(`DID mismatch: proposal was created by ${proposal.requester_did} but current requester is ${ctx.userDid}. Only the original proposer can execute.`);
  }

  // Verify proposal integrity
  const expectedHash = await hashProposal(proposal.transfer_payload);
  if (expectedHash !== proposal.proposal_id) {
    fatal('Proposal integrity check failed — the transfer payload has been modified since proposal creation.');
  }

  // Submit to YellowCard
  const res = await makeRequest('POST', '/business/payments', proposal.transfer_payload);

  if (!res.ok) {
    output({
      success: false,
      error: true,
      message: 'YellowCard rejected the payment request.',
      status_code: res.status,
      details: res.data,
      proposal_id: proposal.proposal_id,
    });
    process.exit(1);
  }

  output({
    success: true,
    proposal_id: proposal.proposal_id,
    payment_id: res.data.id || null,
    sequenceId: proposal.transfer_payload.sequenceId,
    status: res.data.status || 'submitted',
    requester_did: ctx.userDid,
    recipient_did: proposal.transfer_payload.customerUID,
    raw: res.data,
    message: 'Payout submitted to YellowCard. Use check-payout to track status.',
    executed_at: new Date().toISOString(),
  });
}

async function cmdCheckPayout() {
  const args = parseArgs();
  const id = args.id;
  if (!id) fatal('Missing --id flag (payment ID from execute-payout)');

  const res = await makeRequest('GET', `/business/payments/${encodeURIComponent(id)}`);
  if (!res.ok) fatal(`Failed to check payment ${id}: ${JSON.stringify(res.data)}`);

  const payment = res.data;
  output({
    success: true,
    payment_id: id,
    status: payment.status || 'unknown',
    amount: payment.amount,
    currency: payment.currency,
    localAmount: payment.localAmount,
    rate: payment.rate,
    recipient_did: payment.customerUID || null,
    raw: payment,
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const command = process.argv[2];

  if (!command) {
    fatal(
      'Usage: node scripts/yellowcard.js <command> [options]\n' +
      'Commands: discover, rates, balance, propose-payout, execute-payout, check-payout'
    );
  }

  switch (command) {
    case 'discover':       return cmdDiscover();
    case 'rates':          return cmdRates();
    case 'balance':        return cmdBalance();
    case 'propose-payout': return cmdProposePayout();
    case 'execute-payout': return cmdExecutePayout();
    case 'check-payout':   return cmdCheckPayout();
    default:
      fatal(`Unknown command: ${command}. Valid commands: discover, rates, balance, propose-payout, execute-payout, check-payout`);
  }
}

main().catch(err => fatal(err.message));
