#!/usr/bin/env python3
"""Validate an IXO skill package for basic repository compliance."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


FOLDER_RE = re.compile(r"^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$")


def parse_frontmatter(text: str) -> Tuple[Dict[str, Any], str]:
    if not text.startswith("---\n"):
        raise ValueError("SKILL.md does not start with YAML frontmatter.")

    parts = text.split("\n---\n", 1)
    if len(parts) != 2:
        raise ValueError("Could not find closing YAML frontmatter delimiter.")

    raw_yaml = parts[0][4:]
    body = parts[1]
    data: Dict[str, Any] = {}

    for line in raw_yaml.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")

    return data, body


def documented_in_skill_md(body: str, script_name: str) -> bool:
    return script_name in body


def check_python_script(script_path: Path) -> List[str]:
    issues: List[str] = []
    text = script_path.read_text(encoding="utf-8")

    if "def main(" not in text:
        issues.append("missing main() function")
    if 'if __name__ == "__main__":' not in text:
        issues.append("missing CLI entry point")
    return issues


def main(skill_path: str, **kwargs: Any) -> int:
    path = Path(skill_path)
    checks: List[Dict[str, Any]] = []
    warnings: List[str] = []
    fixes: List[str] = []

    def add_check(check_id: str, passed: bool, message: str) -> None:
        checks.append({"id": check_id, "passed": passed, "message": message})

    if not path.exists() or not path.is_dir():
        result = {
            "skill_path": str(path),
            "folder_name": path.name,
            "valid": False,
            "checks": [{"id": "skill-folder", "passed": False, "message": "Skill folder does not exist."}],
            "warnings": [],
            "suggested_fixes": ["Create the target skill folder and place SKILL.md inside it."],
        }
        print(json.dumps(result, indent=2))
        return 1

    folder_name = path.name
    folder_ok = bool(FOLDER_RE.fullmatch(folder_name))
    add_check("folder-name", folder_ok, "Folder name is valid." if folder_ok else "Folder name violates IXO naming rules.")
    if not folder_ok:
        fixes.append("Rename the folder to lowercase-hyphen format, 1-64 chars, no leading/trailing hyphen, no double hyphens.")

    skill_md = path / "SKILL.md"
    skill_md_ok = skill_md.exists()
    add_check("skill-md", skill_md_ok, "SKILL.md exists." if skill_md_ok else "SKILL.md is missing.")
    if not skill_md_ok:
        fixes.append("Add SKILL.md at the root of the skill folder.")

    frontmatter: Dict[str, Any] = {}
    body = ""
    if skill_md_ok:
        try:
            frontmatter, body = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
            add_check("frontmatter", True, "YAML frontmatter parsed successfully.")
        except Exception as exc:
            add_check("frontmatter", False, f"Frontmatter error: {exc}")
            fixes.append("Ensure SKILL.md starts with a valid YAML frontmatter block delimited by --- lines.")

    name_value = frontmatter.get("name", "") if frontmatter else ""
    name_ok = bool(name_value) and name_value == folder_name
    add_check("name-match", name_ok, "Frontmatter name matches folder name." if name_ok else "Frontmatter name is missing or does not match folder name.")
    if not name_ok:
        fixes.append("Set frontmatter name to exactly match the folder name.")

    description_value = frontmatter.get("description", "") if frontmatter else ""
    desc_ok = isinstance(description_value, str) and len(description_value.split()) >= 8 and "use" in description_value.lower()
    add_check("description", desc_ok, "Description is concrete enough." if desc_ok else "Description is missing or too vague.")
    if not desc_ok:
        fixes.append("Write a concrete description that explains what the skill does and when to use it.")

    structured_body = all(section in body for section in ["# Overview", "# Purpose", "# Step-by-step instructions", "# Output format"])
    add_check("instructions", structured_body, "Instruction body is structured." if structured_body else "Instruction body is missing expected structure.")
    if not structured_body:
        warnings.append("Consider adding clear sections such as Overview, Purpose, Step-by-step instructions, and Output format.")

    scripts_dir = path / "scripts"
    scripts_ok = True
    if scripts_dir.exists() and scripts_dir.is_dir():
        for script in scripts_dir.iterdir():
            if script.is_file() and script.suffix == ".py":
                issues = check_python_script(script)
                if issues:
                    scripts_ok = False
                    add_check(f"script-{script.name}", False, f"{script.name}: " + ", ".join(issues))
                    fixes.append(f"Fix {script.name}: add main() and standard CLI entry point.")
                else:
                    add_check(f"script-{script.name}", True, f"{script.name} is CLI-compatible.")

                if not documented_in_skill_md(body, script.name):
                    scripts_ok = False
                    add_check(f"script-docs-{script.name}", False, f"{script.name} is not documented in SKILL.md.")
                    fixes.append(f"Document {script.name} usage in SKILL.md.")
                else:
                    add_check(f"script-docs-{script.name}", True, f"{script.name} is documented in SKILL.md.")

    valid = all(check["passed"] for check in checks if check["id"] in {"folder-name", "skill-md", "frontmatter", "name-match", "description", "instructions"} or check["id"].startswith("script"))

    result = {
        "skill_path": str(path),
        "folder_name": folder_name,
        "valid": valid and scripts_ok,
        "checks": checks,
        "warnings": warnings,
        "suggested_fixes": fixes,
    }
    print(json.dumps(result, indent=2))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate an IXO skill package.")
    parser.add_argument("--skill-path", required=True, help="Path to the skill folder to validate.")
    args = parser.parse_args()
    raise SystemExit(main(args.skill_path))
