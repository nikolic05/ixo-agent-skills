# Contributing to IXO Agent Skills

Thank you for your interest in contributing a skill! This guide will help you create and submit a high-quality skill.

## Before You Start

1. Read the [Agent Skills Specification](https://agentskills.io/specification)
2. Check existing skills to avoid duplicates
3. Review our [example skills](examples/) for reference

## Skill Structure

Every skill is a folder containing at least a `SKILL.md` file:

```
your-skill-name/
├── SKILL.md              # Required
├── prompts/              # Optional: Additional prompts
│   └── detailed.md
├── scripts/              # Optional: Helper scripts
│   └── helper.py
├── examples/             # Optional: Usage examples
│   └── example.md
└── LICENSE.txt           # Optional: Skill-specific license
```

## Script Standards

If your skill includes scripts in the `scripts/` directory, they **must** follow our [Script Standards](SCRIPT_STANDARDS.md).

**The 3 Rules:**

1. **Scripts must work from CLI** - Agents execute scripts via command line
2. **Scripts must have a `main()` function that returns** - For programmatic use
3. **Scripts must be documented in SKILL.md** - Agents don't read code, only docs

See [SCRIPT_STANDARDS.md](SCRIPT_STANDARDS.md) for full details, examples, and the pre-commit checklist.

## Naming Conventions

**Folder name must:**
- Be 1-64 characters
- Use only lowercase letters, numbers, and hyphens
- Not start or end with a hyphen
- Not contain consecutive hyphens
- Match the `name` field in your SKILL.md

**Good names:** `pdf-reader`, `code-review`, `data-analyzer`

**Bad names:** `PDF_Reader`, `my--skill`, `-invalid`

## SKILL.md Format

Your `SKILL.md` file must have YAML frontmatter followed by markdown content:

```markdown
---
name: your-skill-name
description: A clear, concise description of what this skill does
license: MIT
compatibility: claude
allowed-tools: Read Write Bash
metadata:
  author: Your Name
  version: "1.0.0"
  category: productivity
---

# Your Skill Name

## Overview

Explain what this skill enables the AI agent to do.

## Instructions

Step-by-step instructions for the AI agent...

## Examples

Show example usage...
```

### Required Fields

| Field | Description | Constraints |
|-------|-------------|-------------|
| `name` | Skill identifier | 1-64 chars, lowercase alphanumeric + hyphens |
| `description` | What the skill does | 1-1024 characters |

### Optional Fields

| Field | Description | Constraints |
|-------|-------------|-------------|
| `license` | License identifier | Any string (e.g., MIT, Apache-2.0) |
| `compatibility` | Compatible AI agents | Max 500 characters |
| `allowed-tools` | Required tool access | Space-delimited tool names |
| `metadata` | Custom key-value pairs | Max 20 pairs, keys max 64 chars, values max 1024 chars |

## Writing Good Instructions

The markdown body of your SKILL.md is what the AI agent reads. Make it:

1. **Clear** - Use simple, direct language
2. **Structured** - Use headings, lists, and examples
3. **Complete** - Include everything the agent needs
4. **Safe** - Never include harmful instructions

### Do's

- Explain the skill's purpose upfront
- Provide step-by-step instructions
- Include example inputs and outputs
- Document any prerequisites
- Handle edge cases and errors

### Don'ts

- Don't assume prior knowledge
- Don't include sensitive data or credentials
- Don't instruct harmful or unethical actions
- Don't reference external resources that may change

## Submitting Your Skill

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR-USERNAME/ixo-agent-skills.git
cd ixo-agent-skills
```

### 2. Create Your Skill

```bash
mkdir -p skills/your-skill-name
# Create your SKILL.md and any additional files
```

### 3. Validate Locally

```bash
./scripts/validate-skill.sh skills/your-skill-name
```

### 4. Commit and Push

```bash
git add skills/your-skill-name
git commit -m "Add your-skill-name skill"
git push origin main
```

### 5. Open a Pull Request

Go to GitHub and open a PR against the `main` branch. Fill out the PR template completely.

## Review Process

All skills are reviewed before publishing. We check for:

### Security
- No malicious instructions or code
- No attempts to exfiltrate data
- No instructions to bypass safety measures

### Quality
- Clear, well-written instructions
- Skill works as described
- Proper error handling

### Compliance
- Valid SKILL.md frontmatter
- Folder name matches skill name
- Follows the Agent Skills specification

### Timeline

- Initial review: 1-3 business days
- Feedback provided via PR comments
- Once approved, skill is auto-published

## After Publishing

Once merged, your skill will be:

1. Automatically packaged and uploaded
2. Assigned a unique content identifier (CID) following IPLD standards
3. Available at `https://capsules.skills.ixo.earth/capsules/{cid}`

The CID will be posted as a comment on your PR.

## Updating a Skill

To update an existing skill:

1. Make changes in a new branch
2. Submit a PR with your updates
3. The skill will receive a new CID after merge

Note: CIDs are content-addressed, so any change creates a new identifier.

## Getting Help

- **Questions?** Open an issue
- **Bug in a skill?** Open an issue or PR
- **Specification questions?** See [agentskills.io](https://agentskills.io)

## Code of Conduct

Be respectful and constructive. We're all here to build useful tools for AI agents.

---

Thank you for contributing to the IXO Agent Skills ecosystem!
