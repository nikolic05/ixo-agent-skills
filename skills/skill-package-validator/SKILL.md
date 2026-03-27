---
name: skill-package-validator
description: Validates an IXO skill folder against repository structure, SKILL.md, and script rules, and use it before submission to catch packaging errors early.
license: MIT
compatibility:
  - ixo-agent-skills
allowed-tools:
  - filesystem
  - shell
metadata:
  author: OpenAI
  version: 1.0.0
  category: validation
---

# Overview

This skill checks whether a candidate IXO skill package is ready for repository submission.
It validates folder naming, required files, YAML frontmatter, frontmatter consistency, instruction quality basics, and optional script requirements.

# Purpose

Use this skill when you need to review a skill package before publishing it to the IXO Agent Skills repository.
The goal is to catch common packaging errors early and return a clear pass/fail report with actionable fixes.

# When to use

Use this skill when:
- a new skill folder has been drafted
- you want a submission-readiness check before opening a pull request
- you need a repeatable validation flow for multiple skill packages
- you want a machine-readable report for CI, local review, or agent workflows

# When not to use

Do not use this skill when:
- you need to evaluate whether the skill idea is commercially valuable or strategically important
- you want deep runtime testing of external APIs or services not included in the package
- you need legal review of license compatibility beyond basic file and metadata checks

# Required inputs

Provide:
- the path to the skill folder
- access to the folder contents, especially `SKILL.md`

Optional:
- whether to require helper script checks
- whether to emit JSON output only

# Validation criteria

The validator should check at minimum:

1. **Folder name**
   - must be 1-64 characters
   - lowercase letters, numbers, and hyphens only
   - no leading or trailing hyphen
   - no repeated double hyphens

2. **Required file**
   - `SKILL.md` must exist in the skill folder

3. **Frontmatter**
   - `SKILL.md` must begin with a valid YAML frontmatter block
   - frontmatter must contain at least `name` and `description`

4. **Name consistency**
   - frontmatter `name` must exactly match the folder name

5. **Description quality**
   - description must be concrete
   - description must explain what the skill does and when it should be used

6. **Instruction quality**
   - markdown body should be structured and operational
   - instructions should be practical, explicit, and safe

7. **Scripts**
   - if a `scripts/` directory exists, scripts should be CLI-compatible
   - Python scripts should expose `main()` and have a standard CLI entry point
   - scripts must be documented in `SKILL.md`

8. **Submission quality**
   - package should be clean, repository-ready, and not depend on hidden assumptions

# Step-by-step instructions

1. Identify the target skill folder.
2. Read the folder name and validate it against repository naming rules.
3. Confirm that `SKILL.md` exists at the root of the skill folder.
4. Parse the YAML frontmatter from `SKILL.md`.
5. Check that `name` exists and exactly matches the folder name.
6. Check that `description` exists and is specific enough to describe both capability and intended use.
7. Review the markdown body for structure.
8. If `scripts/` exists, inspect each relevant script for CLI compatibility and confirm that script usage is documented in `SKILL.md`.
9. Produce a final report with:
   - overall status
   - checks passed
   - checks failed
   - warnings
   - suggested fixes
10. If the package fails, do not claim it is submission-ready.

# Output format

Return a concise validation report in structured form.
Prefer JSON with the following shape:

```json
{
  "skill_path": "skills/skill-package-validator",
  "folder_name": "skill-package-validator",
  "valid": true,
  "checks": [
    {"id": "folder-name", "passed": true, "message": "Folder name is valid."},
    {"id": "skill-md", "passed": true, "message": "SKILL.md exists."}
  ],
  "warnings": [],
  "suggested_fixes": []
}
```

If the caller wants a human-readable summary, include:
- overall verdict
- the failing checks first
- concrete next steps

# Error handling and edge cases

- If the folder does not exist, return a hard failure immediately.
- If `SKILL.md` is missing, fail early and do not pretend the package is valid.
- If frontmatter is malformed, report the parsing error clearly.
- If the package contains scripts but the documentation does not mention them, report that mismatch.
- If a description is present but overly vague, mark it as failed or warn depending on severity.
- If a package is mostly valid but missing polish, return warnings instead of false failures.

# Examples

## Example use

Validate the skill folder:

```bash
python scripts/validate_skill_package.py --skill-path skills/skill-package-validator
```

## Example interpretation

- `valid: true` means the package passed all required checks.
- `valid: false` means at least one required submission check failed.
- warnings indicate improvements that are recommended but not necessarily blocking.

# Helper script

This skill includes an optional helper script:

- `scripts/validate_skill_package.py`

The script performs a local validation pass and emits JSON.
It is intended as a practical companion to the written instructions, not as a replacement for review judgment.

# Notes

- Favor narrow, deterministic validation over vague scoring.
- Do not invent repository requirements that are not documented.
- When uncertain, report the uncertainty explicitly instead of silently passing a check.
