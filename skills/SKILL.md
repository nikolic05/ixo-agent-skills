---
name: skill-fixture-generator
description: Generates structured happy-path, edge-case, and invalid-case test fixtures for a draft IXO skill, including expected outcomes, without executing the tests.
---

# Overview

`skill-fixture-generator` turns a draft IXO skill into reusable test fixtures.

It reads a draft `SKILL.md` or a plain description of the skill and generates concrete cases that help contributors and reviewers understand how the skill should behave.

This skill **generates fixtures only**. It does **not** run tests, benchmark the skill, or claim that any case passes.

# Use this skill when

Use this skill when you want to:
- create test cases for a draft IXO skill
- cover happy-path, edge-case, and invalid-case scenarios
- attach expected outcomes to each case
- produce artifacts that can later support review or evaluation

# Do not use this skill when

Do not use this skill when you need to:
- execute tests
- benchmark cost, speed, or quality
- verify runtime behavior
- redesign the draft skill from scratch

# Inputs

Provide as much of the following as you have:
- skill name
- short skill description
- draft `SKILL.md`, if available
- known required inputs
- known output requirements
- known constraints or unsupported requests

If the draft is incomplete, make only the minimum reasonable assumptions and state them clearly.

# Output files

Generate these files:
- `examples/happy-path.md`
- `examples/edge-cases.md`
- `examples/invalid-cases.md`
- `examples/test-fixtures.json`

The markdown files are for human review.
The JSON file is for future tooling.

# What each fixture must contain

Each fixture must include:
- case id
- case type
- purpose
- input
- expected outcome
- rationale

Valid case types:
- `happy-path`
- `edge-case`
- `invalid-case`

# Expected outcome modes

Use exactly one expected outcome mode per case:

- `exact-output` — use only when the output should be deterministic
- `properties` — use when multiple valid phrasings are possible but certain requirements must hold
- `behavior` — use when the correct result is an action pattern such as asking for clarification or refusing unsupported scope

Do not force literal outputs when the source skill is naturally flexible.

# Instructions

## 1. Read the source draft

Identify:
- the main capability
- the narrow use case
- required inputs
- expected outputs
- constraints and non-goals

If the draft is broad, focus on the most central concrete use case.

## 2. Derive operating boundaries

Decide:
- what a normal valid request looks like
- what a tricky but valid request looks like
- what an invalid, ambiguous, contradictory, or unsupported request looks like

Stay within the source draft. Do not invent extra capabilities.

## 3. Generate case buckets

Produce fixtures in three groups:

### Happy-path
Normal valid usage.

### Edge-case
Valid but tricky usage, such as unusual formatting, optional missing values, or mild ambiguity.

### Invalid-case
Requests that should fail gracefully, ask for clarification, or refuse unsupported scope.

## 4. Write structured fixtures

For each case, include:

### Case `<id>` — `<short title>`

**Type**  
`<case type>`

**Purpose**  
`<what this case checks>`

**Input**  
```text
<exact input>
```

**Expected Outcome**  
Mode: `<exact-output | properties | behavior>`

- `<expected item 1>`
- `<expected item 2>`
- `<expected item 3>`

**Rationale**  
`<why this case matters>`

## 5. Keep outcomes realistic

- Use `properties` when wording may vary
- Use `behavior` when the right action matters more than final phrasing
- Use `exact-output` only when a deterministic answer is reasonable

Examples of expected behavior:
- asks for missing required fields
- refuses unsupported requests
- avoids inventing unavailable information
- follows the declared output schema

## 6. Produce the JSON file

Use this structure:

```json
[
  {
    "id": "happy-001",
    "type": "happy-path",
    "purpose": "Basic valid request",
    "input": "Create an invoice for ACME Ltd for 3 consulting hours at €100/hour.",
    "expected": {
      "mode": "properties",
      "items": [
        "Includes client name ACME Ltd",
        "Includes one consulting line item",
        "Quantity equals 3",
        "Unit price equals €100",
        "Total equals €300"
      ]
    },
    "rationale": "Covers the standard expected use of the skill."
  }
]
```

# Handling incomplete or bad drafts

If the source draft is incomplete:
- state assumptions explicitly
- generate fixtures only for clearly implied behavior
- avoid fake precision

If the source draft is contradictory:
- flag the contradiction
- prefer `behavior` mode that asks for clarification
- do not silently choose one conflicting requirement

If the source draft is too broad:
- narrow to the main use case
- note that more fixture sets may be needed later

# Quality rules

Always keep fixtures:
- concrete
- narrow
- grounded in the source draft
- reusable
- realistic

Do not:
- claim to have run tests
- assume hidden tools or services
- invent unsupported capabilities
- turn this skill into a test runner

# Self-check before finalizing

Before finishing, confirm that:
- all three case buckets are present
- every case has all required fields
- expected outcome mode is explicit for every case
- the fixtures stay within the documented scope of the source skill
- nothing implies that execution or validation was performed
