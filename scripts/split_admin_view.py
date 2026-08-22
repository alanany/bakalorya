#!/usr/bin/env python3
"""
Split AdminView.js into focused page modules using the prototype-mixin pattern.
Each page module exports an object whose methods are assigned to AdminView.prototype.
This means all 'this.' references remain valid without any changes.
"""

import os
import shutil

BASE = "/Users/mohamed/Desktop/bakalorya platform"
SRC  = f"{BASE}/public/views/AdminView.js"
DEST = f"{BASE}/public/views/admin"

os.makedirs(DEST, exist_ok=True)

with open(SRC, "r", encoding="utf-8") as f:
    lines = f.readlines()

total = len(lines)

# Method boundaries (1-indexed start lines from our analysis)
# Format: (start_line, method_name)
METHOD_STARTS = [
    (4,    "constructor"),
    (21,   "render"),
    (448,  "updateBadges"),
    (466,  "loadAllData"),
    (498,  "bindTabEvents"),
    (545,  "TAB_META"),   # static field
    (563,  "renderTab"),
    (598,  "renderStatsTab"),
    (632,  "statCard"),
    (646,  "miniUserRow"),
    (659,  "renderCategoriesTab"),
    (745,  "renderTeachersTab"),
    (873,  "renderTeacherApplicationsTab"),
    (989,  "renderStudentsTab"),
    (1022, "renderMembersTab"),
    (1053, "memberTableRow"),
    (1094, "renderCoursesTab"),
    (1166, "renderEnrollmentsTab"),
    (1252, "updateAddCourseModalTeachers"),
    (1262, "renderAddCourseModal"),
    (1456, "renderGroupsTab"),
    (1619, "renderSessionsTab"),
    (1876, "renderReportsTab"),
    (2000, "renderSingleSubRow"),
    (2118, "renderSubscriptionsTab"),
    (2341, "renderEarningsTab"),
    (2492, "renderBillingsTableRows"),
    (2575, "renderPaymentDetailsModal"),
    (2697, "bindActionEvents"),
    (3328, "renderCategoryModal"),
    (3398, "renderMemberModal"),
    (3567, "renderTranscriptModal"),
    (3617, "renderGroupStudentsModal"),
    (3798, "renderReassignTeacherModal"),
    (3853, "renderApproveSubscriptionModal"),
    (3981, "renderRenewSubscriptionModal"),
    (4141, "renderAssignTeacherToSubscriptionModal"),
    (4198, "renderPackageScheduleWizardModal"),
    (4570, "renderCourseDetailsModal"),
    (4751, "renderPlansTab"),
    (4820, "renderPlanModal"),
    (4948, "renderGroupSessionModal"),
    (5332, "onDestroy"),
    (total + 1, "__END__"),  # sentinel
]

def get_method_lines(start, next_start):
    """Extract lines from start to just before next_start (1-indexed)."""
    # Find the actual start of this method block (including preceding comment lines)
    # We go back a few lines to catch comment headers like // ── section ──
    actual_start = start
    for i in range(start - 2, max(start - 5, 0), -1):
        stripped = lines[i].strip()
        if stripped.startswith("// ──") or stripped.startswith("// --") or stripped == "":
            actual_start = i + 1  # 1-indexed
        else:
            break

    # Extract up to next method start
    end = next_start - 1  # exclusive, 1-indexed
    return lines[actual_start - 1 : end - 1]  # convert to 0-indexed slicing


def extract_method_block(start_line, end_line):
    """Get raw lines from start_line to end_line (1-indexed, inclusive)."""
    return lines[start_line - 1 : end_line]

# ── Map methods to page files ──────────────────────────────────────────────────
# Keys = page file base name, values = list of method start lines to include
PAGE_ASSIGNMENTS = {
    "AdminStatsPage":         [598, 632, 646, 659, 3328],
    "AdminUsersPage":         [745, 873, 989, 1022, 1053, 3398, 3567],
    "AdminCoursesPage":       [1094, 1166, 1252, 1262, 3398, 4570],
    "AdminSessionsPage":      [1456, 1619, 3617, 3798, 4948],
    "AdminSubscriptionsPage": [2000, 2118, 3853, 3981, 4141, 4198, 4751, 4820],
    "AdminReportsPage":       [1876],
    "AdminEarningsPage":      [2341, 2492, 2575],
}

# Note: renderCourseDetailsModal (4570) and renderMemberModal (3398) appear in multiple places.
# We'll put each in its most natural home and avoid duplicating.

PAGE_ASSIGNMENTS = {
    "AdminStatsPage":         [598, 632, 646, 659, 3328],
    "AdminUsersPage":         [745, 873, 989, 1022, 1053, 3398, 3567],
    "AdminCoursesPage":       [1094, 1166, 1252, 1262, 4570],
    "AdminSessionsPage":      [1456, 1619, 3617, 3798, 4948],
    "AdminSubscriptionsPage": [2000, 2118, 3853, 3981, 4141, 4198],
    "AdminReportsPage":       [1876],
    "AdminEarningsPage":      [2341, 2492, 2575],
    "AdminPlansPage":         [4751, 4820],
}

# Build a lookup: method_start -> (method_start, next_method_start)
method_lookup = {}
for i, (start, name) in enumerate(METHOD_STARTS[:-1]):
    next_start = METHOD_STARTS[i + 1][0]
    method_lookup[start] = (start, next_start, name)

# Core methods that stay in AdminView.js
CORE_METHODS = {4, 21, 448, 466, 498, 545, 563, 2697, 5332}

# Get all methods assigned to pages
ASSIGNED_METHODS = set()
for methods in PAGE_ASSIGNMENTS.values():
    ASSIGNED_METHODS.update(methods)

# Header for AdminView.js (lines 1-3: imports)
header_lines = lines[0:3]

def build_page_file(page_name, method_starts):
    """Build a page module file."""
    import_line = "import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';\n"
    
    out = [import_line, "\n"]
    out.append(f"// ── {page_name} ─────────────────────────────────────────────────────────────\n")
    out.append(f"// Methods extracted from AdminView.js — assigned to AdminView.prototype\n\n")
    out.append(f"export const {page_name} = {{\n\n")
    
    for ms in method_starts:
        if ms not in method_lookup:
            print(f"  WARNING: method start {ms} not found in method_lookup")
            continue
        mstart, mnext, mname = method_lookup[ms]
        # Extract lines
        method_lines = extract_method_block(mstart, mnext - 1)
        # Remove trailing blank lines
        while method_lines and method_lines[-1].strip() == "":
            method_lines.pop()
        # Add a blank line separator
        out.extend(method_lines)
        out.append("\n")
    
    # Close the exported object
    out.append("};\n")
    return out


def build_admin_view_shell():
    """Build the trimmed AdminView.js that only has core methods."""
    # Header (import line)
    out = list(header_lines)
    
    # Import all page modules
    out.append("\n// ── Page Module Imports ──────────────────────────────────────────────────────\n")
    out.append("import { AdminStatsPage } from './AdminStatsPage.js';\n")
    out.append("import { AdminUsersPage } from './AdminUsersPage.js';\n")
    out.append("import { AdminCoursesPage } from './AdminCoursesPage.js';\n")
    out.append("import { AdminSessionsPage } from './AdminSessionsPage.js';\n")
    out.append("import { AdminSubscriptionsPage } from './AdminSubscriptionsPage.js';\n")
    out.append("import { AdminReportsPage } from './AdminReportsPage.js';\n")
    out.append("import { AdminEarningsPage } from './AdminEarningsPage.js';\n")
    out.append("import { AdminPlansPage } from './AdminPlansPage.js';\n")
    out.append("\n")
    
    # Lines from start of class to end of constructor/render() (lines 3-447)
    out.extend(lines[3:447])  # lines 4-447 (0-indexed 3-446)
    
    # Add TAB_META static field and core methods
    # TAB_META: lines 545-562 (0-indexed 544-561)
    out.extend(lines[544:562])
    out.append("\n")
    
    # renderTab: lines 563-594
    out.extend(lines[562:594])
    out.append("\n")
    
    # updateBadges: lines 448-465
    out.extend(lines[447:465])
    out.append("\n")
    
    # loadAllData: lines 466-496
    out.extend(lines[465:496])
    out.append("\n")
    
    # bindTabEvents: lines 498-542
    out.extend(lines[497:542])
    out.append("\n")
    
    # bindActionEvents: lines 2697-3327
    out.extend(lines[2696:3327])
    out.append("\n")
    
    # onDestroy: line 5332
    out.extend(lines[5331:5334])
    out.append("\n")
    
    # Close class
    out.append("}\n\n")
    
    # Assign page methods to prototype
    out.append("// ── Assign page module methods to AdminView prototype ────────────────────────\n")
    out.append("Object.assign(AdminView.prototype, AdminStatsPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminUsersPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminCoursesPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminSessionsPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminSubscriptionsPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminReportsPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminEarningsPage);\n")
    out.append("Object.assign(AdminView.prototype, AdminPlansPage);\n")
    
    return out


# ── Generate page files ────────────────────────────────────────────────────────
print(f"Source file: {SRC} ({total} lines)")
print()

for page_name, method_starts in PAGE_ASSIGNMENTS.items():
    out_path = f"{DEST}/{page_name}.js"
    content = build_page_file(page_name, method_starts)
    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(content)
    line_count = sum(1 for _ in content)
    print(f"  Created {page_name}.js  (~{line_count} lines)")

# ── Generate new AdminView.js shell ───────────────────────────────────────────
shell_content = build_admin_view_shell()
shell_path = f"{DEST}/AdminView.js"
with open(shell_path, "w", encoding="utf-8") as f:
    f.writelines(shell_content)
print(f"  Created admin/AdminView.js  (~{len(shell_content)} lines)")

print("\nDone! Now update app.js to import from ./views/admin/AdminView.js")
