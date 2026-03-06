---
name: ixo-yellowcard
description: >
  YellowCard payment disbursement skill for paying task workers across Africa.
  Supports payouts to bank accounts and mobile money (M-Pesa, MTN, Airtel, etc.)
  in 20+ African countries and 50+ currencies. Use when the user mentions
  "pay", "payout", "disburse", "send funds", "task payment", "mobile money",
  "yellowcard", or needs to send money to recipients in Africa.
version: 1.0.0
author: ixo
license: MIT
compatibility: Node.js 18+
allowed-tools: shell
secrets:
  oracle:
    - YELLOWCARD_API_KEY: "YellowCard public API key"
    - YELLOWCARD_SECRET_KEY: "YellowCard HMAC secret key for request signing"
    - YELLOWCARD_BASE_URL: "YellowCard API base URL (sandbox or production)"
    - YELLOWCARD_ADMIN_DIDS: "Comma-separated DIDs authorized to execute payouts and check balance"
  user: []
context:
  - _SKILL_CONTEXT_USER_DID
  - _SKILL_CONTEXT_SANDBOX_ID
  - _SKILL_CONTEXT_TIMESTAMP
---

# YellowCard Payout Skill

## Purpose

Pay task workers via YellowCard's payment infrastructure. Users complete tasks on the ixo platform, and authorized administrators disburse payments to their bank accounts or mobile money wallets across Africa.

Recipients are identified by DID, which is stored as `customerUID` in YellowCard for reconciliation.

## Trigger Conditions

Activate this skill when the user:
- Wants to pay someone for completing a task
- Mentions "payout", "disburse", "send funds", "yellowcard"
- Asks about available payment channels in a country
- Wants to check payment status or account balance
- Asks about exchange rates for African currencies

## Safety Rules

1. **NEVER** log, echo, or print credentials or secret values
2. **NEVER** make direct API calls — always use `node scripts/yellowcard.js <command>`
3. **NEVER** skip the propose step — always propose before executing
4. **NEVER** execute a payout without explicit user confirmation of the proposal
5. **NEVER** modify a proposal after it has been generated — create a new one instead
6. Only users whose DID is in `YELLOWCARD_ADMIN_DIDS` can execute payouts or check balance

## Commands

All commands output JSON. Errors are returned as `{ "error": true, "message": "..." }`.

---

### 1. `discover` — Find available payment channels and networks

```bash
node scripts/yellowcard.js discover --country <COUNTRY_CODE>
```

**Flags:**

| Flag | Required | Description |
|------|----------|-------------|
| `--country` | Yes | ISO 3166-1 alpha-2 country code (e.g. `NG`, `KE`, `GH`, `ZA`, `UG`) |

**What it does:** Fetches available withdrawal channels and payment networks for a country. Filters to only active withdraw channels (deposit channels are excluded).

**Output fields:**

| Field | Description |
|-------|-------------|
| `channels` | Array of active withdraw channels. Each has `id` (use as `channelId`), `name`, `rampType`, `status`, `accountType` (`bank` or `momo`), `currency`, `country`, `minAmount`, `maxAmount` |
| `networks` | Array of payment networks (specific banks or mobile providers). Each has `id` (use as `networkId`), `name`, `code`, `channelId`, `country`, `status` |

**Use the returned values:**
- `channelId` — from `channels[].id`
- `networkId` — from `networks[].id`
- `accountType` — from `channels[].accountType` (`bank` or `momo`)
- `minAmount` / `maxAmount` — minimum and maximum local currency amounts for the channel

**Supported countries include:** NG (Nigeria), KE (Kenya), GH (Ghana), ZA (South Africa), UG (Uganda), TZ (Tanzania), CM (Cameroon), CI (Cote d'Ivoire), SN (Senegal), RW (Rwanda), and more.

---

### 2. `rates` — Get current exchange rates

```bash
node scripts/yellowcard.js rates --currency <CURRENCY_CODE>
```

**Flags:**

| Flag | Required | Description |
|------|----------|-------------|
| `--currency` | Yes | ISO 4217 currency code (e.g. `NGN`, `KES`, `GHS`, `ZAR`, `UGX`) |

**Output fields:**

| Field | Description |
|-------|-------------|
| `rates` | Array of rate objects with `buy`, `sell`, `code` (currency code), `channelId` |

Use to show the user how much the recipient will receive in local currency for a given USD amount.

---

### 3. `balance` — Check account balance (admin only)

```bash
node scripts/yellowcard.js balance
```

**No flags.** Requires the caller's DID to be in `YELLOWCARD_ADMIN_DIDS`.

**What it does:** Returns the primary USD fiat float balance via `GET /business/account`. This is the balance used to fund all payouts.

**Important:** This is NOT the crypto vaults endpoint (`/custody/vaults`). Vaults are a separate YellowCard feature for on-chain digital asset custody. The balance command returns the fiat float balance you see in the YellowCard Treasury Portal dashboard.

**Output fields:**

| Field | Description |
|-------|-------------|
| `requester_did` | DID of the admin who requested the balance |
| `accounts` | Account balance data from YellowCard |

---

### 4. `propose-payout` — Validate and prepare a payout

```bash
cat request.json | node scripts/yellowcard.js propose-payout
```

**Reads JSON from stdin.** Requires admin DID. **No money moves at this step.**

Validates all fields, generates a SHA-256 proposal hash for integrity, generates a UUID `sequenceId` for idempotency, and returns a proposal summary for user review.

#### Input JSON Schema

```json
{
  "channelId": "<string>",
  "currency": "<string>",
  "amount": "<number — use this OR localAmount>",
  "localAmount": "<number — use this OR amount>",
  "reason": "<string, optional>",
  "customerType": "<string, optional>",
  "recipientDid": "<string, optional>",
  "sender": {
    "name": "<string>",
    "country": "<string>",
    "phone": "<string, optional>",
    "email": "<string, optional>",
    "address": "<string, optional>",
    "dob": "<string, optional>",
    "idType": "<string, optional>",
    "idNumber": "<string, optional>"
  },
  "destination": {
    "accountName": "<string>",
    "accountNumber": "<string>",
    "accountType": "<string>",
    "networkId": "<string>",
    "country": "<string>",
    "accountBank": "<string, optional>"
  }
}
```

#### Input Fields Detail

**Top-level fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `channelId` | Yes | string | Payment channel ID from `discover` |
| `currency` | Yes | string | ISO 4217 currency code (e.g. `NGN`, `KES`) |
| `amount` | One of | number | Amount in USD. YellowCard converts to local currency at current rate. Use for fixed USD budget. |
| `localAmount` | One of | number | Amount in local currency. YellowCard calculates the USD cost. Use for fixed local amount (recommended for task payments). |
| `reason` | No | string | Payment reason. Default: `"other"` |
| `customerType` | No | string | Customer type. Default: `"retail"` |
| `recipientDid` | No | string | Recipient's DID in `did:ixo:...` format (e.g. `did:ixo:entity:abc123`). Stored as `customerUID` in YellowCard for reconciliation. Falls back to the caller's DID if omitted. **MUST be a DID, NOT a Matrix user ID** (e.g. NOT `@did-ixo-...:server`). |

**`amount` vs `localAmount` — provide exactly one, not both:**
- `"localAmount": 2000` with `"currency": "NGN"` — recipient gets exactly 2,000 NGN (recommended for task payments where the worker expects a fixed local amount)
- `"amount": 5` — spend exactly $5 USD, YellowCard converts at current rate

**`sender` fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Sender organization or individual name |
| `country` | Yes | string | Sender country code (e.g. `US`) |
| `phone` | No | string | Phone number (e.g. `+10000000000`) |
| `email` | No | string | Email address |
| `address` | No* | string | Street address |
| `dob` | No* | string | Date of birth (`MM/DD/YYYY`) |
| `idType` | No* | string | ID document type (e.g. `passport`, `national_id`) |
| `idNumber` | No* | string | ID document number |

\* Required for full KYC when cumulative payments to a `customerUID` exceed $200 USD. For reduced KYC (under $200), only `name` and `country` are required.

**`destination` fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `accountName` | Yes | string | Recipient's name as it appears on the account |
| `accountNumber` | Yes | string | Bank account number or mobile money phone number |
| `accountType` | Yes | string | `"bank"` for bank transfer, `"momo"` for mobile money |
| `networkId` | Yes | string | Network ID from `discover` (identifies specific bank or mobile provider) |
| `country` | Yes | string | Recipient's country code (e.g. `NG`) |
| `accountBank` | No | string | Bank name (optional, for bank transfers) |

**Mobile money account numbers** use international phone format: `+{countryCode}{number}` (e.g. `+2341111111111` for Nigeria).

#### Example Input

```json
{
  "sender": {
    "name": "IXO Foundation",
    "country": "US",
    "phone": "+10000000000",
    "email": "payments@ixo.world",
    "address": "1 Main St",
    "dob": "01/01/2000",
    "idType": "passport",
    "idNumber": "X0000000"
  },
  "destination": {
    "accountName": "John Doe",
    "accountNumber": "1111111111",
    "accountType": "bank",
    "networkId": "3d4d08c1-4811-4fee-9349-a302328e55c1",
    "country": "NG"
  },
  "channelId": "fe8f4989-3bf6-41ca-9621-ffe2bc127569",
  "localAmount": 2000,
  "currency": "NGN",
  "reason": "other",
  "recipientDid": "did:ixo:entity:recipient123"
}
```

#### Output Fields

| Field | Description |
|-------|-------------|
| `proposal_id` | SHA-256 hash of the transfer payload (used for integrity verification) |
| `requester_did` | DID of the admin who created the proposal |
| `sequenceId` | UUID for idempotency (YellowCard deduplicates by this) |
| `transfer_payload` | Full YellowCard API request body (includes `forceAccept: true`) |
| `summary` | Human-readable summary with: `recipient_name`, `recipient_account`, `recipient_country`, `account_type`, `amount_type`, `amount`, `currency`, `reason`, `recipient_did` |
| `created_at` | Timestamp of proposal creation |

#### Generated `transfer_payload` Structure

The `propose-payout` command builds the following YellowCard API payload from the input:

```json
{
  "channelId": "...",
  "sequenceId": "<auto-generated UUID>",
  "localAmount": 2000,
  "currency": "NGN",
  "country": "NG",
  "reason": "other",
  "customerType": "retail",
  "customerUID": "did:ixo:entity:recipient123",
  "forceAccept": true,
  "sender": {
    "name": "IXO Foundation",
    "country": "US",
    "phone": "+10000000000",
    "email": "payments@ixo.world",
    "address": "1 Main St",
    "dob": "01/01/2000",
    "idType": "passport",
    "idNumber": "X0000000"
  },
  "destination": {
    "accountName": "John Doe",
    "accountNumber": "1111111111",
    "accountType": "bank",
    "networkId": "3d4d08c1-4811-4fee-9349-a302328e55c1",
    "country": "NG"
  }
}
```

---

### 5. `execute-payout` — Submit the confirmed payout (admin only)

```bash
cat proposal.json | node scripts/yellowcard.js execute-payout
```

**Reads the full proposal JSON from stdin** (the complete output of `propose-payout`).

**Verification steps before submission:**
1. **Hash integrity** — Recomputes SHA-256 of `transfer_payload` and compares to `proposal_id`. Fails if payload was tampered with.
2. **DID match** — The current caller's DID must match `requester_did` in the proposal. Only the original proposer can execute.
3. **Admin check** — Caller must be in `YELLOWCARD_ADMIN_DIDS`.

Submits to YellowCard's `POST /business/payments` with `forceAccept: true` (auto-accepts the payment request, bypassing the separate accept step since the user already confirmed at the propose step).

#### Output Fields

| Field | Description |
|-------|-------------|
| `proposal_id` | The proposal hash that was executed |
| `payment_id` | YellowCard payment ID (use with `check-payout`) |
| `sequenceId` | The idempotency UUID |
| `status` | Initial payment status (typically `CREATED` or `PROCESS`) |
| `requester_did` | Admin DID who executed |
| `recipient_did` | Recipient's DID (`customerUID`) |
| `raw` | Full raw response from YellowCard |
| `executed_at` | ISO timestamp of execution |

---

### 6. `check-payout` — Check payment status

```bash
node scripts/yellowcard.js check-payout --id <PAYMENT_ID>
```

**Flags:**

| Flag | Required | Description |
|------|----------|-------------|
| `--id` | Yes | Payment ID returned by `execute-payout` |

#### Output Fields

| Field | Description |
|-------|-------------|
| `payment_id` | The payment ID queried |
| `status` | Current status (see Payment Status Flow below) |
| `amount` | USD amount |
| `currency` | Local currency code |
| `localAmount` | Amount in local currency |
| `rate` | Exchange rate applied |
| `recipient_did` | `customerUID` (recipient DID) |
| `raw` | Full raw payment object from YellowCard |

---

## Workflow

1. **Discover** channels for the recipient's country
2. **Get rates** to show the user the conversion
3. **Check balance** to verify sufficient funds (admin only)
4. **Propose** the payout — present the summary to the user
5. **Wait for explicit user confirmation**
6. **Execute** the confirmed payout
7. **Check** status if needed

---

## Editor Flow Execution (REQUIRED when running inside a flow document with a Payment action block)

When this skill is triggered from an editor flow (e.g. via a `payment` action block companion prompt), follow these steps EXACTLY. Do NOT deviate.

### How the Payment action block works

The Payment action block is a **generic payment container**. It stores `paymentConfig` JSON in its `inputs` prop, and has dedicated top-level block props for payment state that the oracle updates via `edit_block` (through `call_editor_agent`).

**Block props updated by the oracle:**

| Block Prop | Type | Description |
|------------|------|-------------|
| `paymentStatus` | string | Current payment phase: `proposed`, `submitted`, `pending`, `processing`, `completed`, `failed` |
| `transactionId` | string | Payment provider's transaction ID (from `execute-payout` → `payment_id`) |
| `paymentProposal` | JSON string | Full proposal object from `propose-payout` output (for integrity and re-execution) |
| `paymentSummary` | JSON string | Human-readable key-value summary for display in the panel (from `propose-payout` → `summary`) |
| `paymentError` | string | Error message if any step fails. Clear it on retry. |

**IMPORTANT:**
- Use `call_editor_agent` to update these block props via `edit_block`. Do NOT use `runtimeUpdates` on action blocks in flows — it will be rejected.
- **After every block update, read the block back** (via `call_editor_agent` → `read_block_by_id`) to verify the props were written correctly. If a field is missing or wrong, retry the update.

### Flow structure (1 block minimum)

| Block | Type | Purpose |
|-------|------|---------|
| Payment Block | Action (`payment`) | Collects payment config, displays proposal, and triggers execution |

The block's `inputs` prop contains `paymentConfig` (JSON string) with whatever the user or upstream blocks provided (e.g. recipient info, amount, currency). The skill must read this config, enrich it with discovered channels/networks/rates, and build a full payout request.

### Step 0: Read flow context and blocks

1. Call `read_flow_context` to get flow-level metadata.
2. Call `list_blocks` to identify the Payment action block and its UUID.
3. Read the Payment block's `inputs` prop — parse the `paymentConfig` JSON to get the user's payment parameters.

### Step 1: Discover channels and rates (Calculate Payout)

Using the recipient's country from the payment config:

```bash
node scripts/yellowcard.js discover --country <COUNTRY_CODE>
```

Then get rates for the currency:

```bash
node scripts/yellowcard.js rates --currency <CURRENCY_CODE>
```

Use the discover results to select the appropriate `channelId` and `networkId`. Use the rates to calculate conversion amounts.

**Enrich the block's inputs** by merging the discovered values back into the payment config via `edit_block`:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "inputs": {
      "paymentConfig": {
        "channelId": "<discovered channel ID>",
        "networkId": "<discovered network ID>",
        "rate": "<current exchange rate>"
      }
    }
  }
}
```

The `edit_block` tool auto-merges objects into existing JSON string props — the user's original config fields are preserved.

### Step 2: Propose payout

Build the full payout request JSON from the enriched payment config and pipe it to propose-payout:

```bash
echo '<full payout request JSON>' | node scripts/yellowcard.js propose-payout
```

The script writes its output to `/workspace/output/proposal.json` automatically.

On success, update the Payment block via `call_editor_agent` with `edit_block`. Set the full proposal JSON, the summary, and the status **in a single `edit_block` call**:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "paymentStatus": "proposed",
    "paymentError": "",
    "paymentProposal": "<full JSON string of the propose-payout output>",
    "paymentSummary": "<JSON string of the summary object>"
  }
}
```

**IMPORTANT:** Set all four fields in ONE `edit_block` call. The `paymentProposal` must contain the **complete** propose-payout output including `requester_did`, `proposal_id`, and `transfer_payload` — do not omit any fields.

On error:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "paymentStatus": "failed",
    "paymentError": "<error message>"
  }
}
```

Tell the user the proposal is ready for review in the Payment block panel.

### Step 3: Wait for user confirmation

**Do NOT proceed until the user explicitly confirms the payout.** The user will review the proposal summary in the Payment block's side panel and click "Execute Payout", which sends a new companion prompt.

### Step 4: Execute the confirmed payout

When the user confirms (you receive an execute prompt), read the full proposal from the block's `paymentProposal` prop. This contains the complete output of `propose-payout` including `requester_did`, `proposal_id`, and `transfer_payload`. **Do NOT reconstruct or modify the proposal — pass it verbatim.**

Read the `paymentProposal` prop from the block (via `call_editor_agent` → `read_block_by_id`), write it to a file with `sandbox_write_file`, and pipe it:

```bash
cat /workspace/proposal.json | node scripts/yellowcard.js execute-payout
```

On success, update the Payment block via `call_editor_agent` with `edit_block`:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "paymentStatus": "submitted",
    "paymentError": "",
    "transactionId": "<payment_id from the execute-payout output>"
  }
}
```

On error:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "paymentStatus": "failed",
    "paymentError": "<error message>"
  }
}
```

### Step 5: Poll for completion

After successful execution, poll the payment status:

```bash
node scripts/yellowcard.js check-payout --id <PAYMENT_ID>
```

**Polling rules:**
- Poll every 10 seconds for the first minute, then every 20 seconds
- Stop after 3 minutes maximum
- Update `paymentStatus` on the block as the status progresses:

| YellowCard Status | Set `paymentStatus` to |
|-------------------|----------------------|
| `CREATED`, `PROCESS` | `submitted` |
| `PROCESSING`, `PENDING` | `processing` |
| `COMPLETE` | `completed` |
| `FAILED` | `failed` |

**On terminal status**, update the block via `call_editor_agent` with `edit_block`:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "paymentStatus": "completed"
  }
}
```

Or on failure:

```json
{
  "blockId": "<payment-block-uuid>",
  "updates": {
    "paymentStatus": "failed",
    "paymentError": "<failure details from raw response>"
  }
}
```

If polling times out without reaching a terminal status, tell the user:
> "The payment is still processing. You can check the status later by asking me to check payment <transactionId>."

Then STOP. Do not keep polling.

---

## Conversation Mode (no flow blocks)

The oracle can also run these commands outside of a flow context. In conversation mode, the oracle returns results directly to the user as messages and asks for confirmation before executing. The workflow is the same (discover → rates → propose → confirm → execute → check) but results are communicated as chat messages instead of block prop updates.

## Payment Status Flow

```
CREATED -> PROCESS -> PROCESSING -> PENDING -> COMPLETE
                                            \-> FAILED
```

| Status | Description |
|--------|-------------|
| `CREATED` | Payment request received by YellowCard |
| `PROCESS` | Being processed by YellowCard |
| `PROCESSING` | Submitted to payment network |
| `PENDING` | Awaiting final confirmation from network |
| `COMPLETE` | Funds delivered to recipient |
| `FAILED` | Payment failed (check `raw` response for details) |

Payment requests expire in 10 minutes in sandbox (5 minutes in production) if not accepted. This skill uses `forceAccept: true` so expiry does not apply.

## KYC Thresholds

YellowCard applies KYC requirements based on cumulative payments per `customerUID`:

| Threshold | Required Sender Fields |
|-----------|----------------------|
| Under $200 USD cumulative | `name`, `country` (reduced KYC) |
| Over $200 USD cumulative | `name`, `country`, `address`, `dob`, `idType`, `idNumber` (full KYC) |

## Sandbox Testing

### Test Account Numbers

| Scenario | Account Number |
|----------|---------------|
| Bank SUCCESS | `1111111111` |
| Bank FAILURE | `0000000000` |
| Mobile Money SUCCESS | `+{countryCode}1111111111` (e.g. `+2341111111111` for NG) |
| Mobile Money FAILURE | `+{countryCode}0000000000` (e.g. `+2340000000000` for NG) |

### Common Country / Currency Pairs

| Country | Code | Currency | Typical Methods |
|---------|------|----------|-----------------|
| Nigeria | NG | NGN | Bank, Mobile Money |
| Kenya | KE | KES | M-Pesa (momo) |
| Ghana | GH | GHS | MTN Mobile Money, Bank |
| South Africa | ZA | ZAR | Bank Transfer |
| Uganda | UG | UGX | Mobile Money, Bank |

## Authentication

All API calls are authenticated using HMAC-SHA256 signatures. The script handles signing automatically. The signature is computed over:
- Timestamp (ISO 8601)
- Request path (excluding query string)
- HTTP method (uppercase)
- SHA-256 hash of the request body (base64, for POST requests only)

The `Authorization` header format: `YcHmacV1 {apiKey}:{signature}`

## Validation Rules (propose-payout)

The following fields are validated before a proposal is created:

- **Required top-level:** `channelId`, `currency`, `destination`
- **Required one of:** `amount` or `localAmount` (not both)
- **Required destination:** `accountName`, `accountNumber`, `accountType`, `networkId`, `country`
- **Required sender:** `name`, `country`
- **Amount constraint:** Must be a positive number

## Error Handling

All errors are JSON: `{ "error": true, "message": "..." }`.

| Error | Cause |
|-------|-------|
| `Missing _ORACLE_SECRET_YELLOWCARD_API_KEY` | Credential env var not set |
| `Missing --country flag` | `discover` called without `--country` |
| `Missing --currency flag` | `rates` called without `--currency` |
| `Missing --id flag` | `check-payout` called without `--id` |
| `Unauthorized: DID ... is not in the admin list.` | Non-admin DID tried an admin-only command |
| `Missing required field: ...` | `propose-payout` input missing a required field |
| `Amount must be a positive number` | Amount is zero, negative, or not a number |
| `Provide either amount (USD) or localAmount (local currency), not both.` | Both amount fields provided |
| `Proposal integrity check failed` | `transfer_payload` was modified after proposal creation |
| `DID mismatch: proposal was created by ... but current requester is ...` | Someone other than the proposer tried to execute |
| `Unknown command: ...` | Invalid subcommand passed to the script |

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `_ORACLE_SECRET_YELLOWCARD_API_KEY` | Oracle secret | YellowCard public API key |
| `_ORACLE_SECRET_YELLOWCARD_SECRET_KEY` | Oracle secret | HMAC signing secret key |
| `_ORACLE_SECRET_YELLOWCARD_BASE_URL` | Oracle secret | API base URL (`https://sandbox.api.yellowcard.io` or `https://api.yellowcard.io`) |
| `_ORACLE_SECRET_YELLOWCARD_ADMIN_DIDS` | Oracle secret | Comma-separated admin DIDs |
| `_SKILL_CONTEXT_USER_DID` | Skill context | Current user's DID |
| `_SKILL_CONTEXT_SANDBOX_ID` | Skill context | Sandbox identifier |
| `_SKILL_CONTEXT_TIMESTAMP` | Skill context | Request timestamp |
