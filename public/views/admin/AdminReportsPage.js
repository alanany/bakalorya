import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminReportsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminReportsPage = {

  renderReportsTab() {
    const rep = this.reportsData?.summary || {};
    const audit = this.reportsData?.auditLogs || {};

    const total = rep.totalUsers || 1;
    const studentPct = Math.round(((rep.totalStudents || 0) / total) * 100);
    const teacherPct = Math.round(((rep.totalTeachers || 0) / total) * 100);
    const adminPct = 100 - (studentPct + teacherPct);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:800;font-size:1.4rem;">${t("admin.reports.title")}</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;">${t("admin.reports.subtitle")}</p>
        </div>
        <button class="btn-secondary" id="print-reports-btn" style="font-size:0.85rem;padding:8px 16px;border-color:var(--primary);color:var(--primary);">
          <i data-lucide="printer"></i> ${t("admin.reports.printReport")}
        </button>
      </div>

      <!-- Key System Metrics Grid -->
      <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:32px;">
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--primary);background:var(--primary-glow);"><i data-lucide="users"></i></div>
          <div>
            <div class="stat-box-val">${rep.totalUsers || 0}</div>
            <div class="stat-box-lbl">${t("admin.reports.userDistribution")}</div>
          </div>
        </div>
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--success);background:var(--success-glow);"><i data-lucide="award"></i></div>
          <div>
            <div class="stat-box-val">${rep.avgProgress || 0}%</div>
            <div class="stat-box-lbl">${t("course.progress")}</div>
          </div>
        </div>
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--accent);background:var(--accent-glow);"><i data-lucide="check-circle-2"></i></div>
          <div>
            <div class="stat-box-val">${rep.completedLessonsSum || 0}</div>
            <div class="stat-box-lbl">${t("student.completedLessons")}</div>
          </div>
        </div>
        <div class="glass-card stat-box">
          <div class="stat-box-icon" style="color:var(--info);background:var(--info-glow);"><i data-lucide="video"></i></div>
          <div>
            <div class="stat-box-val">${rep.liveSessions || 0} / ${rep.totalSessions || 0}</div>
            <div class="stat-box-lbl">${t("admin.reports.sessionStatus")}</div>
          </div>
        </div>
      </div>

      <!-- Distribution & Performance Breakdown -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
        <div class="glass-card" style="padding:24px;">
          <h4 style="font-weight:700;margin-bottom:16px;font-size:0.95rem;">${t("admin.reports.userDistribution")}</h4>
          <div style="height:12px;width:100%;border-radius:10px;background:var(--border-color);display:flex;overflow:hidden;margin-bottom:20px;">
            <div style="width:${studentPct}%;background:var(--success);" title="${studentPct}% Students"></div>
            <div style="width:${teacherPct}%;background:var(--primary);" title="${teacherPct}% Teachers"></div>
            <div style="width:${adminPct}%;background:#f59e0b;" title="${adminPct}% Admins"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);">
            <span><strong style="color:var(--success);">● ${t("admin.role.student")}:</strong> ${rep.totalStudents || 0} (${studentPct}%)</span>
            <span><strong style="color:var(--primary);">● ${t("admin.role.teacher")}:</strong> ${rep.totalTeachers || 0} (${teacherPct}%)</span>
            <span><strong style="color:#f59e0b;">● ${t("admin.role.admin")}:</strong> ${rep.totalAdmins || 0} (${adminPct}%)</span>
          </div>
        </div>

        <div class="glass-card" style="padding:24px;">
          <h4 style="font-weight:700;margin-bottom:16px;font-size:0.95rem;">${t("admin.reports.courseEngagement")}</h4>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
              <span style="color:var(--text-muted);">${t("admin.stat.courses")}</span>
              <strong>${rep.totalCourses || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
              <span style="color:var(--text-muted);">${t("admin.lessons")}</span>
              <strong>${rep.totalLessons || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
              <span style="color:var(--text-muted);">${t("admin.stat.enrollments")}</span>
              <strong>${rep.totalEnrollments || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="glass-card" style="padding:24px;">
        <h4 style="font-weight:700;margin-bottom:20px;font-size:1rem;display:flex;align-items:center;gap:8px;">
          <i data-lucide="history" style="width:18px;height:18px;color:var(--primary);"></i>
          ${t("admin.reports.auditLog")}
        </h4>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div>
            <h5 style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;font-weight:700;">${t("admin.reports.recentRegistrations")}</h5>
            ${(audit.recentUsers || []).map(u => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <img src="${u.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + u.name}" style="width:24px;height:24px;border-radius:50%;">
                  <strong>${u.name}</strong> (${u.role})
                </div>
                <span style="color:var(--text-muted);">${new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            `).join("") || `<p style="color:var(--text-muted);font-size:0.8rem;">${t("admin.noData")}</p>`}
          </div>

          <div>
            <h5 style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;font-weight:700;">${t("admin.reports.recentEnrollments")}</h5>
            ${(audit.recentEnrollments || []).map(e => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;">
                <div>
                  <strong>${e.studentName}</strong> → ${e.courseTitle}
                </div>
                <span style="color:var(--success);font-weight:600;">${e.progress}%</span>
              </div>
            `).join("") || `<p style="color:var(--text-muted);font-size:0.8rem;">${t("admin.noData")}</p>`}
          </div>
        </div>
      </div>
    `;
  }
  // ── 9. Subscriptions Tab ─────────────────────────────────────────────────────────────

};
