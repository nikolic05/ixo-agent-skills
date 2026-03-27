# Happy-path fixtures

### Case `happy-001` — Basic fixture generation from a concrete draft

**Type**  
`happy-path`

**Purpose**  
`Check that the skill generates grounded fixtures from a clear source draft.`

**Input**  
```text
Skill name: invoice-creator

Description:
Creates structured invoice outputs from plain-language billing requests.

Requirements:
- include client name
- include line items
- calculate total
- do not invent missing tax data

Generate test fixtures.
```

**Expected Outcome**  
Mode: `properties`

- Produces at least one happy-path fixture
- Produces at least one edge-case fixture
- Produces at least one invalid-case fixture
- Every fixture includes id, type, purpose, input, expected outcome, and rationale
- No expected outcome invents unsupported capabilities

**Rationale**  
`This is the core intended use of the skill.`

### Case `happy-002` — Generate fixtures from a full draft skill file

**Type**  
`happy-path`

**Purpose**  
`Check that a fuller draft leads to more specific but still bounded fixtures.`

**Input**  
```text
Here is a draft SKILL.md for a pdf-summarizer skill. Generate test fixtures from it.
```

**Expected Outcome**  
Mode: `behavior`

- Reads the supplied draft rather than ignoring it
- Derives cases from the documented summary scope
- Produces human-readable markdown files and a JSON fixtures file
- Avoids adding unrelated extraction requirements unless the draft supports them

**Rationale**  
`Contributors may already have a substantial draft when they use this skill.`
