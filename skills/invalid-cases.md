# Invalid-case fixtures

### Case `invalid-001` — Request to run tests

**Type**  
`invalid-case`

**Purpose**  
`Check that the skill refuses to act like a test runner.`

**Input**  
```text
Read my draft skill, generate fixtures, run all of them, and tell me which ones pass.
```

**Expected Outcome**  
Mode: `behavior`

- Declines the execution part
- States that the skill only generates fixtures
- Still offers fixtures if enough source detail is available
- Does not claim runtime validation happened

**Rationale**  
`This protects the core scope boundary of the skill.`

### Case `invalid-002` — Contradictory draft requirements

**Type**  
`invalid-case`

**Purpose**  
`Check that the skill handles conflicting source instructions honestly.`

**Input**  
```text
Draft skill description:
- must always return JSON only
- must also always return a long natural-language explanation
Generate test fixtures.
```

**Expected Outcome**  
Mode: `behavior`

- Flags the contradiction
- Uses clarification-oriented expected behavior
- Does not silently choose one conflicting rule and proceed as if the draft were clean

**Rationale**  
`Conflicting drafts should not be treated as fully valid without comment.`

### Case `invalid-003` — Missing core description

**Type**  
`invalid-case`

**Purpose**  
`Check that the skill does not hallucinate fixtures from an empty request.`

**Input**  
```text
Generate fixtures for my skill.
```

**Expected Outcome**  
Mode: `behavior`

- States that there is not enough source information
- Requests or notes the need for at least a basic capability description
- Does not invent a random skill definition

**Rationale**  
`Fixture generation must stay grounded in the source draft.`
