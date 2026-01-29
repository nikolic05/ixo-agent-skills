# IXO Agent Skills

Community-contributed AI agent skills for the IXO ecosystem.

[![Skills Server](https://img.shields.io/badge/Skills%20Server-Live-brightgreen)](https://capsules.skills.ixo.earth/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What are Agent Skills?

Agent Skills are portable, shareable packages that give AI agents new capabilities. Each skill is a folder containing a `SKILL.md` file with instructions and metadata, plus any additional resources the agent might need.

Think of skills like apps for AI agents - they can learn to fill out PDF forms, analyze data, interact with APIs, and much more.

**Learn more:**
- [What are Skills?](https://agentskills.io/what-are-skills)
- [Agent Skills Specification](https://agentskills.io/specification)

## Submit Your Skill

We welcome community contributions! To share your skill with IXO AI agents:

### 1. Fork this repository

Click the "Fork" button at the top right of this page.

### 2. Create your skill folder

Add your skill to the `skills/` directory:

```
skills/
└── your-skill-name/
    ├── SKILL.md          # Required: Instructions and metadata
    ├── prompts/          # Optional: Additional prompts
    ├── scripts/          # Optional: Helper scripts
    └── examples/         # Optional: Usage examples
```

### 3. Write your SKILL.md

Every skill needs a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: your-skill-name
description: A clear description of what your skill does
license: MIT
---

# Your Skill Name

Instructions for the AI agent on how to use this skill...
```

**Required fields:**
- `name` - Lowercase, alphanumeric with hyphens (must match folder name)
- `description` - Clear explanation of what the skill does (max 1024 chars)

**Optional fields:**
- `license` - The license for your skill (e.g., MIT, Apache-2.0)
- `compatibility` - Which AI agents this skill works with
- `allowed-tools` - Tools the agent needs access to
- `metadata` - Additional key-value pairs

See the [full specification](https://agentskills.io/specification) for details.

### 4. Submit a pull request

Push your changes and open a PR. Our team will review your skill for:
- Correctness and quality
- Security (no harmful prompts or scripts)
- Compliance with the specification

Once approved, your skill will be automatically published to the [IXO Skills Server](https://capsules.skills.ixo.earth/).

## Why Are Skills Reviewed?

Skills contain instructions and scripts that AI agents execute. To protect users and maintain quality:

- **Security** - We check for harmful or malicious content
- **Quality** - We ensure skills work as described
- **Compliance** - We verify skills follow the specification

This review process keeps the ecosystem safe and trustworthy.

## Example Skills

Check out the [examples/](examples/) folder for working skill examples you can use as templates.

## Using Published Skills

Once a skill is published, it receives a unique content identifier (CID). AI agents can fetch skills from our server:

```
https://capsules.skills.ixo.earth/capsules/{cid}
```

Browse all available skills:
- [Skills Server](https://capsules.skills.ixo.earth/)
- [API Documentation](https://capsules.skills.ixo.earth/docs)

## Local Validation

Before submitting, you can validate your skill locally:

```bash
./scripts/validate-skill.sh skills/your-skill-name
```

## Contributing

This repo includes bundled **skills** (in `skills/`) that extend AI agent capabilities. When adding or editing scripts inside a skill:

- **Script standards**: Follow [Script Standards for Agent Skills](SCRIPT_STANDARDS.md)
- **Rules**: Scripts must work from CLI, have a `main()` function that returns, and be documented in that skill's SKILL.md
- **Checklist**: See the checklist in [SCRIPT_STANDARDS.md](SCRIPT_STANDARDS.md) before committing any script

For full contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Resources

- [Agent Skills Website](https://agentskills.io/home)
- [Agent Skills Specification](https://agentskills.io/specification)
- [IXO Skills Server API](https://capsules.skills.ixo.earth/docs)
- [Contributing Guidelines](CONTRIBUTING.md)

## License

This repository is licensed under [Apache 2.0](LICENSE). Individual skills may have their own licenses as specified in their `SKILL.md` files.

---

**Questions?** Open an issue or reach out to the IXO team.
