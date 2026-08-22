#!/usr/bin/env python3
"""
Fix missing commas between methods in object literal page files.
In a JS class, methods don't need commas. In object literals they do.
Pattern: a lone `}` on its own line followed by a new method definition
needs a comma added: `},`
"""
import re, os

admin_dir = "/Users/mohamed/Desktop/bakalorya platform/public/views/admin"

PAGE_FILES = [
    "AdminStatsPage.js",
    "AdminUsersPage.js",
    "AdminCoursesPage.js",
    "AdminSessionsPage.js",
    "AdminSubscriptionsPage.js",
    "AdminReportsPage.js",
    "AdminEarningsPage.js",
    "AdminPlansPage.js",
]

def is_method_start(line):
    """Return True if this line looks like an object method definition."""
    stripped = line.strip()
    # Matches: methodName(...) {  or  async methodName(...) {
    return bool(re.match(r'^(async\s+)?[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(', stripped)) and not stripped.startswith('//')

def fix_file(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    changes = 0

    for i, line in enumerate(lines):
        stripped = line.rstrip('\n').rstrip()

        # Check: is this a lone closing brace `  }` (method end)?
        # And is the next non-blank line a new method start?
        if stripped in ('  }', ' }', '}') and stripped.endswith('}') and not stripped.endswith('},') and not stripped.endswith('};'):
            # Look ahead to the next non-blank line
            next_real = None
            for j in range(i + 1, min(i + 6, len(lines))):
                ns = lines[j].strip()
                if ns == '':
                    continue
                if ns.startswith('//') or ns.startswith('/*') or ns.startswith('*'):
                    continue  # skip comment lines - keep looking
                next_real = lines[j]
                break

            if next_real and is_method_start(next_real):
                # This `}` closes a method, and next non-blank is another method -> add comma
                new_line = line.rstrip('\n').rstrip() + ',\n'
                new_lines.append(new_line)
                changes += 1
                continue

        new_lines.append(line)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    return changes

total = 0
for fname in PAGE_FILES:
    fpath = os.path.join(admin_dir, fname)
    n = fix_file(fpath)
    total += n
    print(f"  {fname}: +{n} commas added")

print(f"\nTotal commas added: {total}")
