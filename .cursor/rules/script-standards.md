# Script Standards for Agent Skills

When writing or editing scripts in `skills/*/scripts/`, follow these standards.

## The 3 Rules

1. **Scripts must work from CLI**
   ```bash
   python scripts/my_script.py arg1 arg2
   # Must work and print results
   ```

2. **Scripts must have a `main()` function that returns**
   ```python
   def main(arg1=None, arg2=None, **kwargs):
       # Do work
       return result  # Can be any type
   ```

3. **Scripts must be documented in SKILL.md**
   ```markdown
   ## Scripts
   
   ### my_script.py
   Description of what it does.
   
   **Usage:**
   ```bash
   python scripts/my_script.py <input> <output>
   ```
   ```

## Python Structure

**Required:**
- Shebang: `#!/usr/bin/env python3`
- Module docstring with description and usage
- `main(arg1=None, arg2=None, **kwargs)` with docstring that returns a value
- `if __name__ == '__main__':` block that parses args, calls `main()`, prints result

**Example:**
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

## TypeScript Structure

**Required:**
- Shebang: `#!/usr/bin/env node`
- JSDoc with description and usage
- `export async function main(options: {...})` that returns Promise
- `if (require.main === module)` block that parses args, calls `main()`, logs result

**Example:**
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

## Why These Standards Matter

AI agents **execute scripts, they don't read them**. Scripts are black boxes that agents run via command line and only see the output.

```
Agent workflow:
1. Loads SKILL.md instructions
2. Sees "run python scripts/process.py data.json"
3. Executes it via bash
4. Receives only the output (not the code)
5. Uses output to complete task
```

This means:
- ✅ CLI must work (agents can't import Python functions)
- ✅ Output must be clear (only thing agents see)
- ✅ SKILL.md must document usage (agents won't read code to figure it out)
- ❌ Code structure doesn't matter to agents (they won't read it)

Scripts are token-efficient: Loading instructions = 800 tokens, executing script = 20 tokens. Reading script code = 2,500 tokens (avoided!).

## Pre-Commit Checklist

- [ ] Works from CLI: `python scripts/my_script.py args`
- [ ] Has `main()` that returns something
- [ ] Documented in SKILL.md with description and usage
- [ ] If imports other files, those exist and work
- [ ] Tested (ran it at least once)

See [skills/SCRIPT_STANDARDS.md](skills/SCRIPT_STANDARDS.md) for full details and examples.