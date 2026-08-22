#!/usr/bin/env python3
"""
Build a clean AdminView.js shell with:
1. All imports at top
2. Class body with ONLY core methods (no page methods)
3. Page module assignments AFTER the class
"""

import re

BASE = "/Users/mohamed/Desktop/bakalorya platform"
SRC  = f"{BASE}/public/views/AdminView.js"
DEST = f"{BASE}/public/views/admin/AdminView.js"

with open(SRC, "r", encoding="utf-8") as f:
    lines = f.readlines()

total = len(lines)

# ─── Build the new file ───────────────────────────────────────────────────────

out = []

# 1. Top-level imports (line 1 of original)
out.append('import { apiFetch, state, setAuth, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";\n')
out.append('\n')

# 2. Page module imports
out.append('// ── Page Module Imports ──────────────────────────────────────────────────────\n')
out.append("import { AdminStatsPage }         from './AdminStatsPage.js';\n")
out.append("import { AdminUsersPage }          from './AdminUsersPage.js';\n")
out.append("import { AdminCoursesPage }        from './AdminCoursesPage.js';\n")
out.append("import { AdminSessionsPage }       from './AdminSessionsPage.js';\n")
out.append("import { AdminSubscriptionsPage }  from './AdminSubscriptionsPage.js';\n")
out.append("import { AdminReportsPage }        from './AdminReportsPage.js';\n")
out.append("import { AdminEarningsPage }       from './AdminEarningsPage.js';\n")
out.append("import { AdminPlansPage }          from './AdminPlansPage.js';\n")
out.append('\n')

# 3. Class declaration
out.append('export default class AdminView {\n')
out.append('\n')

# 4. constructor (lines 4-20, 0-indexed 3-19)
out.extend(lines[3:20])
out.append('\n')

# 5. async render() (lines 21-447, 0-indexed 20-446)
out.extend(lines[20:446])
out.append('\n')

# 6. updateBadges (lines 448-465, 0-indexed 447-464)
out.extend(lines[447:465])
out.append('\n')

# 7. loadAllData (lines 466-496, 0-indexed 465-495)
out.extend(lines[465:496])
out.append('\n')

# 8. bindTabEvents (lines 498-542, 0-indexed 497-541)
out.extend(lines[497:542])
out.append('\n')

# 9. static TAB_META and renderTab (lines 544-594, 0-indexed 543-593)
out.extend(lines[543:594])
out.append('\n')

# 10. bindActionEvents (lines 2697-3327, 0-indexed 2696-3326)
out.extend(lines[2696:3327])
out.append('\n')

# 11. onDestroy (line 5332, 0-indexed 5331) — lines 5332 only (not 5333 which is the original class close)
out.extend(lines[5331:5332])   # just "  onDestroy() { }\n"
out.append('\n')

# 12. Close class
out.append('}\n')
out.append('\n')

# 13. Assign page methods to prototype
out.append('// ── Assign page module methods to AdminView prototype ────────────────────────\n')
out.append('Object.assign(AdminView.prototype, AdminStatsPage);\n')
out.append('Object.assign(AdminView.prototype, AdminUsersPage);\n')
out.append('Object.assign(AdminView.prototype, AdminCoursesPage);\n')
out.append('Object.assign(AdminView.prototype, AdminSessionsPage);\n')
out.append('Object.assign(AdminView.prototype, AdminSubscriptionsPage);\n')
out.append('Object.assign(AdminView.prototype, AdminReportsPage);\n')
out.append('Object.assign(AdminView.prototype, AdminEarningsPage);\n')
out.append('Object.assign(AdminView.prototype, AdminPlansPage);\n')

with open(DEST, "w", encoding="utf-8") as f:
    f.writelines(out)

line_count = len(out)
print(f"Written admin/AdminView.js shell: {line_count} lines")
print("Done!")
