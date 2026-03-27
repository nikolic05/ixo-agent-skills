# Edge-case fixtures

### Case `edge-001` — Incomplete but understandable draft

**Type**  
`edge-case`

**Purpose**  
`Check behavior when the source draft is partial.`

**Input**  
```text
Skill idea: create invoices from user requests.
I do not have a full SKILL.md yet.
Generate test fixtures.
```

**Expected Outcome**  
Mode: `behavior`

- States assumptions clearly
- Generates fixtures only for clearly implied invoice behavior
- Avoids pretending unknown constraints are defined
- Notes where extra draft detail would improve the fixture set

**Rationale**  
`Many contributors will want fixtures before the draft is finished.`

### Case `edge-002` — Flexible language output

**Type**  
`edge-case`

**Purpose**  
`Check that the skill uses property-based expectations when exact wording is not appropriate.`

**Input**  
```text
Draft skill: customer-email-drafter
Purpose: draft polite reply emails for support messages
Output wording may vary, but tone and coverage matter
Generate test fixtures.
```

**Expected Outcome**  
Mode: `properties`

- Uses required characteristics instead of one literal response body
- Includes requirements such as polite tone, direct answer, and clear next step
- Avoids invented promises or unsupported commitments

**Rationale**  
`Many generation skills should not be evaluated by exact string matching.`

### Case `edge-003` — Broad draft narrowed to a core use case

**Type**  
`edge-case`

**Purpose**  
`Check that the skill narrows overly broad source drafts instead of generating a messy mixed fixture pack.`

**Input**  
```text
Draft skill idea: business-assistant
It helps with emails, summaries, proposals, meetings, documents, and support.
Generate test fixtures.
```

**Expected Outcome**  
Mode: `behavior`

- Identifies the draft as too broad
- Narrows fixture generation to the clearest central use case
- Notes that separate fixture sets may be needed later for other sub-capabilities
- Avoids mixing unrelated task types in one fixture pack

**Rationale**  
`This keeps the result reviewable and aligned with narrow skill design.`
