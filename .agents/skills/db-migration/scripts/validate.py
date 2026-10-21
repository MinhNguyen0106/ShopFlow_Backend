#!/usr/bin/env python3
"""
ShopFlow Schema & Migration Validator
Validates schema.json reference against architectural and database best practices.
"""

import json
import re
import sys
from pathlib import Path


def is_snake_case(s: str) -> bool:
    return bool(re.match(r"^[a-z][a-z0-9_]*$", s))


def validate_schema(schema_path: Path) -> int:
    if not schema_path.exists():
        print(f"[-] ERROR: Schema reference not found at: {schema_path}", file=sys.stderr)
        return 1

    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as err:
        print(f"[-] ERROR: Invalid JSON in {schema_path}: {err}", file=sys.stderr)
        return 1

    tables = data.get("tables", {})
    if not tables:
        print("[-] ERROR: No tables found in schema definition.", file=sys.stderr)
        return 1

    errors = []
    warnings = []
    print(f"[*] Validating ShopFlow database schema: {len(tables)} tables found.")

    for table_name, table_def in tables.items():
        # 1. Check table naming convention
        if not is_snake_case(table_name):
            errors.append(f"Table '{table_name}' must be formatted in snake_case.")

        # 2. Check primary key
        pk = table_def.get("primaryKey")
        if not pk:
            errors.append(f"Table '{table_name}' is missing 'primaryKey'.")

        columns = table_def.get("columns", {})
        if not columns:
            errors.append(f"Table '{table_name}' has no columns defined.")
            continue

        if pk and pk not in columns:
            errors.append(f"Table '{table_name}' primary key '{pk}' not present in columns list.")

        # 3. Check columns
        for col_name, col_def in columns.items():
            if not is_snake_case(col_name):
                errors.append(f"Column '{table_name}.{col_name}' must be formatted in snake_case.")

            # Validate foreign keys
            fk = col_def.get("references")
            if fk:
                if "." not in fk:
                    errors.append(f"Invalid reference syntax '{fk}' in '{table_name}.{col_name}'. Expected 'target_table.col'.")
                else:
                    target_table, target_col = fk.split(".", 1)
                    if target_table not in tables:
                        errors.append(f"Foreign key in '{table_name}.{col_name}' references non-existent table '{target_table}'.")
                    elif target_col not in tables[target_table].get("columns", {}):
                        errors.append(f"Foreign key in '{table_name}.{col_name}' references non-existent column '{target_table}.{target_col}'.")

        # 4. Check audit timestamps
        if "created_at" not in columns:
            warnings.append(f"Table '{table_name}' does not have standard 'created_at' audit timestamp.")

        # 5. Check indexes
        indexes = table_def.get("indexes", [])
        if not indexes:
            warnings.append(f"Table '{table_name}' has no explicit indexes defined.")

    # Print Report
    print("=" * 60)
    print("SHOPFLOW DATABASE SCHEMA AUDIT REPORT")
    print("=" * 60)

    if warnings:
        print(f"[!] WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")

    if errors:
        print(f"[-] CRITICAL ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
        print("=" * 60)
        print("[-] Schema validation FAILED. Fix the above errors before running migration.")
        return 1

    print("[+] SUCCESS: All tables, columns, constraints, and references passed validation!")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    current_dir = Path(__file__).resolve().parent
    schema_file = current_dir.parent / "references" / "schema.json"
    exit_code = validate_schema(schema_file)
    sys.exit(exit_code)
