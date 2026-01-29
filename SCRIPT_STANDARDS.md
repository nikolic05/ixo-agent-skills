# Script Standards for Agent Skills

All scripts in skill `scripts/` directories must follow these standards for consistency and reusability.

## Core Requirements

Every script must satisfy three requirements:

### 1. Works from Command Line

Scripts must be executable from the terminal and produce output.

```bash
python scripts/process_data.py input.json output.json
```

### 2. Has a `main()` Function That Returns

Scripts must have a `main()` function that:
- Accepts keyword arguments (`**kwargs`)
- Returns a result (any type: dict, list, string, Path, etc.)
- Can be imported and called programmatically

```python
def main(input_file=None, output_file=None, **kwargs):
    # Do work
    return result
```

### 3. Documented in SKILL.md

Each script must be documented in the skill's SKILL.md with:
- Brief description of what it does
- Usage example

Example documentation:

## Scripts

### process_data.py

Processes data from input JSON and writes results.

**Usage:**
```bash
python scripts/process_data.py input.json output.json
```

---

## Python Scripts

### Required Structure

```python
#!/usr/bin/env python3
"""
Brief description of what this script does.

Usage: python script_name.py <arg1> <arg2>
"""

import sys


def main(arg1=None, arg2=None, **kwargs):
    """
    Main function that does the work.
    
    Args:
        arg1: First argument
        arg2: Second argument
        **kwargs: Any other arguments
    
    Returns:
        Result data (dict, list, string, etc.)
    """
    # Your code here
    result = f"Processed {arg1} and {arg2}"
    
    return result


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python script_name.py <arg1> <arg2>")
        sys.exit(1)
    
    result = main(
        arg1=sys.argv[1],
        arg2=sys.argv[2]
    )
    
    print(result)
```

### Key Components

1. **Shebang** - `#!/usr/bin/env python3` at the top
2. **Module docstring** - Description and usage example
3. **`main()` function** - Entry point with `**kwargs` that returns a value
4. **CLI handler** - `if __name__ == '__main__':` block that:
   - Parses `sys.argv`
   - Calls `main()` with arguments
   - Prints the result

### Example: File Processing

```python
#!/usr/bin/env python3
"""
Process JSON data and generate report.

Usage: python process_data.py input.json output.txt
"""

import json
import sys
from pathlib import Path


def main(input_file=None, output_file=None, **kwargs):
    """
    Process JSON data from input file and write report.
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output report file
        **kwargs: Additional options
    
    Returns:
        Number of records processed
    """
    # Load input
    with open(input_file) as f:
        data = json.load(f)
    
    # Process
    records = len(data.get('items', []))
    report = f"Processed {records} records\n"
    
    # Write output
    with open(output_file, 'w') as f:
        f.write(report)
    
    return records


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python process_data.py input.json output.txt")
        sys.exit(1)
    
    count = main(
        input_file=sys.argv[1],
        output_file=sys.argv[2]
    )
    
    print(f"Processed {count} records")
```

---

## TypeScript Scripts

### Required Structure

```typescript
#!/usr/bin/env node
/**
 * Brief description of what this script does.
 * 
 * Usage: ts-node script_name.ts <arg1> <arg2>
 */

export async function main(options: {
  arg1?: string;
  arg2?: string;
}): Promise<any> {
  /**
   * Main function that does the work.
   * 
   * @param options.arg1 - First argument
   * @param options.arg2 - Second argument
   * @returns Result data
   */
  
  // Your code here
  const result = `Processed ${options.arg1} and ${options.arg2}`;
  
  return result;
}

if (require.main === module) {
  if (process.argv.length < 4) {
    console.error('Usage: ts-node script_name.ts <arg1> <arg2>');
    process.exit(1);
  }
  
  main({
    arg1: process.argv[2],
    arg2: process.argv[3]
  }).then(result => {
    console.log(result);
  });
}
```

### Key Components

1. **Shebang** - `#!/usr/bin/env node` at the top
2. **JSDoc comment** - Description and usage
3. **Exported `main()` function** - Async function that accepts options object and returns Promise
4. **CLI handler** - `if (require.main === module)` block that:
   - Parses `process.argv`
   - Calls `main()` with options
   - Logs the result

---

## Script Dependencies

Scripts can be standalone or have dependencies:

### Standalone (Preferred)

All code in one file:

```
scripts/
└── process_data.py
```

### With Dependencies

Scripts can import from other files in the same `scripts/` directory:

```
scripts/
├── generate_report.py
└── utils.py
```

**Requirements when using dependencies:**
- Imports must work when script is run from CLI
- All imported files must exist
- Must be tested and working

---

## Common Patterns

### Optional Arguments

```python
def main(input_file=None, output_file=None, verbose=False, **kwargs):
    if not input_file:
        raise ValueError("input_file is required")
    # Process...
    return result
```

### Returning Different Types

```python
# Return a Path object
def main(output_dir=None, **kwargs):
    output_path = Path(output_dir) / 'result.txt'
    output_path.write_text('data')
    return output_path

# Return a dict
def main(input_file=None, **kwargs):
    data = process(input_file)
    return {"status": "success", "count": len(data)}

# Return a list
def main(**kwargs):
    items = get_items()
    return items
```

### Error Handling

```python
def main(input_file=None, **kwargs):
    try:
        with open(input_file) as f:
            data = f.read()
        result = process(data)
        return result
    except FileNotFoundError:
        print(f"Error: File not found: {input_file}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None
```

---

## How AI Agents Use Scripts

Understanding how agents interact with skills helps explain why these standards matter.

### Progressive Disclosure

AI agents use a token-efficient progressive loading model with three stages:

**Stage 1: Metadata Only (approximately 100 tokens)**
- All skill names and descriptions loaded at startup
- Used for skill discovery and matching

**Stage 2: Instructions (approximately 800-5000 tokens)**
- SKILL.md content loaded when skill is activated
- Contains usage instructions and examples

**Stage 3: Script Execution (output only)**
- Script executed via command line
- Only the output is captured
- Script code remains outside the context window

### Scripts as Black Boxes

Agents execute scripts without reading their source code.

```bash
# Agent executes:
python scripts/generate_invoice.py data.json output.html

# Agent receives:
Invoice generated: output.html

# Agent does not see:
# - The script's source code
# - Implementation details
# - Helper functions
# - Internal logic
```

### Token Efficiency

**Without progressive disclosure:**
```
Metadata: 100 tokens
SKILL.md: 800 tokens
Script source code: 2,500 tokens
Template files: 1,200 tokens
Helper modules: 800 tokens
Total: 5,400 tokens
```

**With progressive disclosure:**
```
Metadata: 100 tokens
SKILL.md: 800 tokens
Script output: 20 tokens
Total: 920 tokens
```

This represents an 83% reduction in token usage.

### When Scripts Are Read

Scripts are only read in specific cases:

1. **Debugging** - When a script fails and the agent needs to diagnose the issue
2. **Modification** - When the user requests changes to the script's behavior
3. **Explicit instruction** - When SKILL.md explicitly directs the agent to review the code

In normal operation, scripts are executed as black boxes.

### Implications for Script Design

**Important considerations:**

- CLI reliability - Agents execute scripts via bash
- Clear output - Agents interpret only what is printed or returned
- Usage documentation - SKILL.md provides execution instructions
- Helpful error messages - Output is used to diagnose problems

**Less important considerations:**

- Code readability for agents - They do not read the source
- Internal comments - Not visible during normal execution
- Code organization - Only needs to execute correctly

### Documentation Examples

**Insufficient documentation:**
```markdown
## Scripts

### process_data.py
See the script for details on how to use it.
```

**Proper documentation:**
```markdown
## Scripts

### process_data.py
Validates and transforms JSON data.

**Usage:**
```bash
python scripts/process_data.py input.json output.json
```

**Output:**
- Prints "Processed N records" on success
- Prints "Error: [details]" on failure
- Exit code 0 indicates success, 1 indicates failure
```

The proper documentation provides:
- Execution instructions
- Expected output format
- Status indicators

---

## Pre-Commit Checklist

Before committing any script, verify:

- Works from CLI - Tested by running the command
- Has `main()` function - Returns a value
- Documented in SKILL.md - Has description and usage example
- Dependencies work - All imports resolve correctly
- Actually tested - Executed successfully at least once

---

## Rationale

These standards provide:

- **Consistency** - All scripts follow the same pattern
- **Reusability** - Scripts can be imported and called from other code
- **Testability** - The `main()` function can be tested programmatically
- **Discoverability** - Documentation in SKILL.md makes scripts easy to find
- **Maintainability** - Standard structure simplifies understanding and updates
- **Agent compatibility** - CLI execution with clear output enables agent usage without requiring code inspection