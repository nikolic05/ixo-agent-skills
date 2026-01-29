# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a community repository for AI agent skills that get published to the IXO Skills Server at `https://capsules.skills.ixo.earth/`. Contributors submit skills via pull requests, which are reviewed for security and quality before being automatically published.

## Commands

```bash
# Validate a skill locally before submitting
./scripts/validate-skill.sh skills/your-skill-name
```

## Repository Structure

- `skills/` - Community-contributed skills (submitted via PR)
- `examples/` - Reference skills demonstrating proper structure
- `scripts/` - Validation and utility scripts
- `.github/workflows/` - CI for validation (on PR) and publishing (on merge to main)

## Skill Structure

Every skill is a folder containing at minimum a `SKILL.md` file:

```
skill-name/
├── SKILL.md       # Required: YAML frontmatter + markdown instructions
├── scripts/       # Optional: Helper scripts (must follow SCRIPT_STANDARDS.md)
├── prompts/       # Optional: Additional prompt files
└── examples/      # Optional: Usage examples
```

## SKILL.md Format

```markdown
---
name: skill-name          # Must match folder name, lowercase + hyphens
description: What it does # Required, max 1024 chars
license: Apache-2.0       # Optional
compatibility: claude     # Optional
allowed-tools: Read Bash  # Optional, space-delimited
metadata:                 # Optional key-value pairs
  author: Name
  version: "1.0.0"
---

# Instructions for the AI agent...
```

## Script Standards

Scripts in skill `scripts/` directories must follow [SCRIPT_STANDARDS.md](SCRIPT_STANDARDS.md). The three rules:

1. **Work from CLI**: `python scripts/my_script.py arg1 arg2`
2. **Have `main()` that returns**: Function accepts `**kwargs`, returns result
3. **Documented in SKILL.md**: Include usage and description

### Python Script Template

```python
#!/usr/bin/env python3
"""
Brief description.

Usage: python script.py <arg1> <arg2>
"""

import sys

def main(arg1=None, arg2=None, **kwargs):
    """Do the work."""
    result = f"Processed {arg1} and {arg2}"
    return result

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python script.py <arg1> <arg2>")
        sys.exit(1)
    result = main(arg1=sys.argv[1], arg2=sys.argv[2])
    print(result)
```

### TypeScript Script Template

```typescript
#!/usr/bin/env node
/**
 * Brief description.
 * Usage: ts-node script.ts <arg1> <arg2>
 */

export async function main(options: { arg1?: string; arg2?: string }) {
  const result = `Processed ${options.arg1} and ${options.arg2}`;
  return result;
}

if (require.main === module) {
  if (process.argv.length < 4) {
    console.error('Usage: ts-node script.ts <arg1> <arg2>');
    process.exit(1);
  }
  main({ arg1: process.argv[2], arg2: process.argv[3] }).then(result => {
    console.log(result);
  });
}
```

### Why These Standards Matter

AI agents execute scripts as black boxes via command line - they read SKILL.md for instructions but don't read script source code during normal operation. This is token-efficient: loading SKILL.md uses ~800 tokens, executing a script uses ~20 tokens, but reading script code would use ~2,500 tokens.

### Pre-Commit Checklist

- [ ] Works from CLI: `python scripts/my_script.py args`
- [ ] Has `main()` that returns something
- [ ] Documented in SKILL.md with description and usage
- [ ] If imports other files, those exist and work
- [ ] Tested (ran it at least once)

## GitHub Actions

- **validate-skill.yml**: Runs on PRs touching `skills/**`, validates folder name format, SKILL.md existence and frontmatter
- **publish-skill.yml**: Runs on merge to main, packages changed skills as tar.gz and uploads to skills server using `SKILLS_API_KEY` secret

## Naming Conventions

Skill folder names must be:
- 1-64 characters
- Lowercase alphanumeric with single hyphens
- No leading/trailing hyphens, no consecutive hyphens
- Match the `name` field in SKILL.md frontmatter
