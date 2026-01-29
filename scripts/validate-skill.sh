#!/bin/bash

# Validate a skill folder structure and SKILL.md content
# Usage: ./scripts/validate-skill.sh skills/my-skill-name

set -e

SKILL_DIR="$1"

if [ -z "$SKILL_DIR" ]; then
    echo "Usage: $0 <skill-directory>"
    echo "Example: $0 skills/my-skill-name"
    exit 1
fi

if [ ! -d "$SKILL_DIR" ]; then
    echo "Error: Directory '$SKILL_DIR' does not exist"
    exit 1
fi

SKILL_NAME=$(basename "$SKILL_DIR")
ERRORS=0

echo "Validating skill: $SKILL_NAME"
echo "================================"

# Check folder name format
echo -n "Checking folder name format... "
if echo "$SKILL_NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: Folder name must be lowercase alphanumeric with single hyphens"
    echo "  Got: $SKILL_NAME"
    ERRORS=$((ERRORS + 1))
fi

# Check folder name length
echo -n "Checking folder name length... "
if [ ${#SKILL_NAME} -le 64 ]; then
    echo "OK (${#SKILL_NAME} chars)"
else
    echo "FAILED"
    echo "  Error: Folder name must be 64 characters or less"
    echo "  Got: ${#SKILL_NAME} characters"
    ERRORS=$((ERRORS + 1))
fi

# Check SKILL.md exists
echo -n "Checking SKILL.md exists... "
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: SKILL.md not found in $SKILL_DIR"
    ERRORS=$((ERRORS + 1))
    echo ""
    echo "Validation failed with $ERRORS error(s)"
    exit 1
fi

# Extract frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$SKILL_DIR/SKILL.md" | sed '1d;$d')

echo -n "Checking YAML frontmatter... "
if [ -n "$FRONTMATTER" ]; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: No YAML frontmatter found (must be between --- delimiters)"
    ERRORS=$((ERRORS + 1))
    echo ""
    echo "Validation failed with $ERRORS error(s)"
    exit 1
fi

# Check 'name' field
echo -n "Checking 'name' field... "
NAME_VALUE=$(echo "$FRONTMATTER" | grep -E '^name:' | sed 's/name:[[:space:]]*//' | tr -d '"' | tr -d "'")
if [ -n "$NAME_VALUE" ]; then
    echo "OK ($NAME_VALUE)"
else
    echo "FAILED"
    echo "  Error: Missing required 'name' field in frontmatter"
    ERRORS=$((ERRORS + 1))
fi

# Check name matches folder
echo -n "Checking name matches folder... "
if [ "$NAME_VALUE" = "$SKILL_NAME" ]; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: Folder name '$SKILL_NAME' does not match frontmatter name '$NAME_VALUE'"
    ERRORS=$((ERRORS + 1))
fi

# Check 'description' field
echo -n "Checking 'description' field... "
DESC_VALUE=$(echo "$FRONTMATTER" | grep -E '^description:' | sed 's/description:[[:space:]]*//')
if [ -n "$DESC_VALUE" ]; then
    # Check description length (rough estimate, may include quotes)
    DESC_LEN=${#DESC_VALUE}
    if [ $DESC_LEN -le 1024 ]; then
        echo "OK ($DESC_LEN chars)"
    else
        echo "FAILED"
        echo "  Error: Description exceeds 1024 characters ($DESC_LEN chars)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "FAILED"
    echo "  Error: Missing required 'description' field in frontmatter"
    ERRORS=$((ERRORS + 1))
fi

# Check for optional fields (informational)
echo ""
echo "Optional fields:"
echo -n "  license: "
LICENSE=$(echo "$FRONTMATTER" | grep -E '^license:' | sed 's/license:[[:space:]]*//')
if [ -n "$LICENSE" ]; then
    echo "$LICENSE"
else
    echo "(not set)"
fi

echo -n "  compatibility: "
COMPAT=$(echo "$FRONTMATTER" | grep -E '^compatibility:' | sed 's/compatibility:[[:space:]]*//')
if [ -n "$COMPAT" ]; then
    echo "$COMPAT"
else
    echo "(not set)"
fi

echo -n "  allowed-tools: "
TOOLS=$(echo "$FRONTMATTER" | grep -E '^allowed-tools:' | sed 's/allowed-tools:[[:space:]]*//')
if [ -n "$TOOLS" ]; then
    echo "$TOOLS"
else
    echo "(not set)"
fi

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "Validation PASSED"
    echo ""
    echo "Your skill is ready to submit!"
    echo "Create a pull request to add it to the repository."
    exit 0
else
    echo "Validation FAILED with $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before submitting."
    exit 1
fi
