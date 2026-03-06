---
name: ixo-identity-verification
version: 2.0.0
description: |
  Subscription-based KYC/AML identity verification using the ixo-kyc-server and ComplyCube.
  Orchestrates the full verification pipeline: initiate evaluation, get ComplyCube session URL,
  poll for completion, fetch credential, and mark complete. The credential is returned as a
  JSON string for the caller to store (e.g. in a Matrix room via a credential.store action block).
author: ixo
license: MIT
compatibility: Node.js 18+
allowed-tools: shell
secrets:
  oracle:
    - KYC_PROVIDER_TOKEN: "Provider app token for KYC server API (originAuthorization)"
    - KYC_SERVER_URL: "Base URL of the ixo-kyc-server (e.g. https://kyc-server.ixo.earth)"
  user: []
context:
  - _SKILL_CONTEXT_USER_DID
  - _SKILL_CONTEXT_USER_ADDRESS
---

# IXO Identity Verification (Subscription-Based)

Orchestrates KYC/AML identity verification through the ixo-kyc-server + ComplyCube.
This skill is a pure API orchestration layer — it talks to the KYC server, returns data,
and leaves it to the caller (oracle agent) to decide how to present results to the user.

## How It Works

The skill runs 6 scripts sequentially. Each script calls the KYC server API, writes
its result to `/workspace/output/<name>.json`, and prints the same JSON to stdout.
The oracle reads the output and decides what to do with it.

```
initiate-kyc  →  get-session-token  →  trigger-review  →  poll-status  →  fetch-credential  →  complete-kyc
     ↑                   ↑                    ↑                ↑                  ↑                    ↑
  FORM_DATA         PROTOCOL_DID           TOKEN          PROTOCOL_DID      PROTOCOL_DID         PROTOCOL_DID
  PROTOCOL_DID                        (from step 2)
```

## Editor Flow Execution (REQUIRED when running inside a flow document)

When this skill is triggered from an editor flow (e.g. via a `form.submit` companion prompt),
follow these steps EXACTLY. Do NOT deviate.

### Flow structure (3 blocks)

| Block | Type | Purpose |
|-------|------|---------|
| Block 1 | Action (`form.submit`) | Collects user data via SurveyJS (name, DOB, consent, etc.) |
| Block 2 | FlowLink | Displays the ComplyCube liveness check URL (external link) |
| Block 3 | Action (`credential.store`) | User stores the issued credential to their Matrix room |

### Step 0: Read flow context and blocks

1. Call `read_flow_context` to get flow-level metadata. Extract `protocolDid` — this is REQUIRED for all scripts. If missing, tell the user and stop.
2. Call `list_blocks` to identify all blocks and their UUIDs. You need the FlowLink block UUID and the credential.store block UUID.

### Step 1: Initiate KYC (Phase 1)

Run `initiate-kyc.js` with:
- `PROTOCOL_DID` = protocolDid from flow metadata
- `FORM_DATA` = JSON string of the form answers (from the companion prompt trigger)

```bash
PROTOCOL_DID="<protocolDid>" FORM_DATA='<form answers JSON>' node scripts/initiate-kyc.js
```

### Step 2: Get liveness check URL and update FlowLink block (Phase 1)

Run `get-session-token.js`:
```bash
PROTOCOL_DID="<protocolDid>" node scripts/get-session-token.js
```

This writes TWO output files:
- `/workspace/output/session-token.json` — contains `token` (needed for step 4) and `kycUrl`
- `/workspace/output/flowlink-update.json` — pre-formatted for the FlowLink block

**Update the FlowLink block using `apply_sandbox_output_to_block`:**
```json
{
  "filePath": "/workspace/output/flowlink-update.json",
  "blockId": "<flowlink-block-uuid>",
  "fieldMapping": { "links": "links" }
}
```

Do NOT use edit_block for this — use apply_sandbox_output_to_block.

Save the `token` value from session-token.json for step 4.

### Step 3: Wait for user to complete liveness check

Tell the user something like:
> "Your identity verification link is ready. Please click the link in the verification block to complete the liveness check. Let me know when you're done."

**Do NOT proceed until the user explicitly tells you they have completed the liveness check.**
Do NOT automatically continue. Wait for the user's message.

### Step 4: Trigger review

Run `trigger-review.js` with the token from step 2:
```bash
TOKEN="<token from step 2>" node scripts/trigger-review.js
```

A 404 is normal (the webview may have already triggered it). Both success and `alreadyReviewed: true` mean you can proceed.

### Step 5: Poll for credential (max 2 minutes)

Run `poll-status.js` repeatedly:
```bash
PROTOCOL_DID="<protocolDid>" node scripts/poll-status.js
```

**Polling rules:**
- Poll every 10 seconds for the first minute, then every 20 seconds
- **Stop after 2 minutes maximum**
- If `phase` is `credential_ready` — proceed to step 6
- If `phase` is `rejected` — tell user their verification was rejected, stop
- If `phase` is `error` — tell user there was an error, stop
- If 2 minutes pass without reaching a terminal phase — tell the user:
  > "Your credential is still being processed. Please wait a few minutes and then ask me to check the status again."
  Then STOP. Do not keep polling. The user will come back and ask you to check again.

### Step 6: Fetch credential and update credential.store block

Run `fetch-credential.js`:
```bash
PROTOCOL_DID="<protocolDid>" node scripts/fetch-credential.js
```

**Update the credential.store block using `apply_sandbox_output_to_block`:**
```json
{
  "filePath": "/workspace/output/credential.json",
  "blockId": "<credential-store-block-uuid>",
  "fieldMapping": {
    "credential": "inputs.credential",
    "credentialKey": "inputs.credentialKey"
  }
}
```

Do NOT use edit_block for credentials — they are large JWT objects that WILL be truncated.
You MUST use apply_sandbox_output_to_block with dot-notation fieldMapping to write into `inputs`.

### Step 7: Wait for user to store credential

Tell the user:
> "Your credential is ready! Click the 'Store Credential' button to save it to your account."

Wait for the user to confirm or for the block state to change to `completed`.

### Step 8: Complete the evaluation

Run `complete-kyc.js`:
```bash
PROTOCOL_DID="<protocolDid>" node scripts/complete-kyc.js
```

Tell the user their identity verification is complete.

---

## Conversation Mode (no flow blocks)

The oracle can also run these scripts outside of a flow context. In conversation mode, the oracle
returns results directly to the user as messages (e.g. "Here is your KYC verification URL: ...").
The credential can be returned as text or stored programmatically.

## Scripts

### Step 1: initiate-kyc.js — Create Evaluation

Creates a KYC evaluation on the server with the user's data.

```bash
PROTOCOL_DID="did:ixo:entity:abc123" \
FORM_DATA='{"firstName":"John","lastName":"Doe"}' \
node scripts/initiate-kyc.js
```

**Env:** `_SKILL_CONTEXT_USER_DID`, `_SKILL_CONTEXT_USER_ADDRESS`, `_ORACLE_SECRET_KYC_PROVIDER_TOKEN`, `_ORACLE_SECRET_KYC_SERVER_URL`

**Output:** `initiate-result.json`
```json
{ "success": true, "did": "...", "protocolDid": "...", "status": "verify", "evaluation": {...} }
```

### Step 2: get-session-token.js — Get ComplyCube URL

Gets the ComplyCube webview URL for the user to complete the liveness check.

```bash
PROTOCOL_DID="did:ixo:entity:abc123" \
node scripts/get-session-token.js
```

**Env:** `_SKILL_CONTEXT_USER_DID`, `_ORACLE_SECRET_KYC_PROVIDER_TOKEN`, `_ORACLE_SECRET_KYC_SERVER_URL`

**Output:** `session-token.json`
```json
{ "success": true, "token": "...", "kycUrl": "https://...", "expiresAt": "2026-03-05T..." }
```

The `token` value is needed for step 3. The `kycUrl` is for the user to open.

### Step 3: trigger-review.js — Trigger Review

Triggers the review process after the user completes the ComplyCube webview.
The webview often triggers this automatically, so a 404 response is treated as success.

```bash
TOKEN="<token from step 2>" \
node scripts/trigger-review.js
```

**Env:** `_ORACLE_SECRET_KYC_SERVER_URL`

**Output:** `review-result.json`
```json
{ "success": true, "alreadyReviewed": false, "status": "review" }
```

### Step 4: poll-status.js — Poll Verification Status

Polls the KYC server until a terminal state is reached. Run repeatedly with delays.

```bash
PROTOCOL_DID="did:ixo:entity:abc123" \
node scripts/poll-status.js
```

**Env:** `_SKILL_CONTEXT_USER_DID`, `_ORACLE_SECRET_KYC_PROVIDER_TOKEN`, `_ORACLE_SECRET_KYC_SERVER_URL`

**Output:** `poll-result.json`
```json
{ "success": true, "serverStatus": "review", "phase": "verifying", "isTerminal": false, "checks": {...} }
```

**Phase mapping:**
- `verifying` — server is `verify` or `review` (keep polling)
- `processing` — server is `clear`, `authorizing`, `authorized`, `issuing` (keep polling)
- `credential_ready` — server is `issued` (proceed to step 5)
- `rejected` — server rejected the verification (terminal)
- `error` — something went wrong (terminal)

Recommended polling: every 10s initially, back off to 30s after 2 minutes.

### Step 5: fetch-credential.js — Fetch Verifiable Credential

Retrieves the issued credential from the KYC server.

```bash
PROTOCOL_DID="did:ixo:entity:abc123" \
node scripts/fetch-credential.js
```

**Env:** `_SKILL_CONTEXT_USER_DID`, `_ORACLE_SECRET_KYC_PROVIDER_TOKEN`, `_ORACLE_SECRET_KYC_SERVER_URL`

**Output:** `credential.json`
```json
{ "success": true, "credentialKey": "kycamlattestation", "credential": { "@context": [...], ... } }
```

The `credential` field is the full Verifiable Credential object. Pass it as the `credential`
input to a `credential.store` action block — the handler takes care of double-stringifying
it for Matrix storage (Matrix does not allow floats in state event values).

### Step 6: complete-kyc.js — Mark Complete

Marks the evaluation as complete on the KYC server. Run after the credential has been stored.

```bash
PROTOCOL_DID="did:ixo:entity:abc123" \
node scripts/complete-kyc.js
```

**Env:** `_SKILL_CONTEXT_USER_DID`, `_ORACLE_SECRET_KYC_PROVIDER_TOKEN`, `_ORACLE_SECRET_KYC_SERVER_URL`

**Output:** `complete-result.json`
```json
{ "success": true, "status": "complete" }
```

## Error Handling

All scripts output `{ "success": false, "error": "..." }` on failure. The oracle should
communicate the error to the user and allow retry.

## KYC Server API Reference

Authenticated endpoints use the provider token as the `Authorization` header (raw string, not Bearer format).

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/kycaml/:did` | POST | Yes | Create evaluation |
| `/tokens/:did/:protocolId` | GET | Yes | Get ComplyCube session URL + token |
| `/tokens/byToken/:token/review` | POST | No | Trigger review after ComplyCube |
| `/kycaml/:did/:protocolId` | GET | Yes | Get full evaluation details |
| `/kycaml/:did/:protocolId/credential` | GET | Yes | Get Verifiable Credential |
| `/kycaml/:did/:protocolId` | PATCH | Yes | Update status (e.g. complete) |
