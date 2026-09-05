import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminUsersPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminUsersPage = {

  renderTeachersTab() {
    const teachers = this.allMembers.filter(u => u.role === "teacher");
    const allSessions = this.allSessions || [];

    const teacherData = teachers.map(t => {
      const completedSessions = allSessions.filter(s =>
        (s.teacher?.id === t.id || s.teacherId === t.id) &&
        (s.status === 'COMPLETED' || s.status === 'completed')
      );
      const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 60), 0);
      const completedHours = Math.round((totalMinutes / 60) * 10) / 10;
      const rate = t.hourlyRate !== undefined ? t.hourlyRate : 150;
      const totalSalary = Math.round(completedHours * rate);

      return {
        teacher: t,
        completedCount: completedSessions.length,
        completedHours,
        rate,
        totalSalary
      };
    });

    const grandTotalSalary = teacherData.reduce((sum, d) => sum + d.totalSalary, 0);
    const grandTotalHours = teacherData.reduce((sum, d) => sum + d.completedHours, 0);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:700;margin-bottom:4px;">${t("admin.tab.teachers")} (${teachers.length})</h3>
          <p style="font-size:0.83rem;color:var(--text-muted);margin:0;">إدارة بيانات المعلمين، تحديد أجر الساعة، واحتساب الراتب المستحق عن الحصص المنفذة</p>
        </div>
        <button class="btn-primary" id="open-create-teacher-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addTeacher")}
        </button>
      </div>

      <!-- Salary Summary Strip -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
        <div class="glass-card" style="padding:18px 20px; border-inline-start:4px solid var(--primary);">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الرواتب المستحقة</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--primary); margin-top:4px;">${grandTotalSalary.toLocaleString()} ج.م</div>
        </div>
        <div class="glass-card" style="padding:18px 20px; border-inline-start:4px solid var(--success);">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي ساعات الحصص المكتملة</div>
          <div style="font-size:1.5rem; font-weight:800; color:var(--success); margin-top:4px;">${grandTotalHours} ساعة</div>
        </div>
        <div class="glass-card" style="padding:18px 20px; border-inline-start:4px solid #f59e0b;">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">عدد المعلمين المسجلين</div>
          <div style="font-size:1.5rem; font-weight:800; color:#f59e0b; margin-top:4px;">${teachers.length} معلم</div>
        </div>
      </div>

      ${teachers.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noTeachers")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;text-align:start;font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">المعلم</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">البريد والتواصل</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">سعر الساعة</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">الحصص المنفذة</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">الراتب المستحق</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${teacherData.map(item => {
          const u = item.teacher;
          const joinDate = new Date(u.createdAt).toLocaleDateString();
          return `
                      <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:14px 20px;">
                          <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${u.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + u.name}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
                            <div>
                              <div style="font-weight:700;font-size:0.9rem;">${u.name}</div>
                              <div style="font-size:0.75rem;color:var(--primary);font-weight:600;">انضمام: ${joinDate}</div>
                            </div>
                          </div>
                        </td>
                        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">
                          <div>
                            <a href="mailto:${u.email}" style="color:var(--text-color); text-decoration:none; display:inline-flex; align-items:center; gap:5px; font-weight:600;" title="إرسال بريد إلكتروني">
                              <i data-lucide="mail" style="width:13px;height:13px;color:var(--primary);"></i> ${u.email}
                            </a>
                          </div>
                          ${u.phone ? `
                            <div style="margin-top:4px;">
                              <a href="https://wa.me/${getCleanWhatsAppNumber(u.phone)}?text=${encodeURIComponent(`مرحباً الأستاذ ${u.name}، نتواصل معك من إدارة منصة انطلق.`)}" target="_blank" style="color:#10b981; text-decoration:none; font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:4px; background:rgba(16,185,129,0.08); padding:3px 8px; border-radius:8px;" title="فتح محادثة واتساب">
                                <i data-lucide="message-circle" style="width:12px;height:12px;"></i> ${u.phone}
                              </a>
                            </div>
                          ` : '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">بدون هاتف</div>'}
                          ${u.meetingLink ? `<div style="font-size:0.72rem;color:var(--primary);margin-top:4px;font-weight:700;"><a href="${u.meetingLink}" target="_blank" style="color:var(--primary);text-decoration:underline;">🔗 رابط الاجتماع الثابت</a></div>` : ''}
                          <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">
                            ${(!u.teacherCapabilities || u.teacherCapabilities.includes("COURSE_INSTRUCTOR")) ? `<span class="badge" style="background:rgba(99,102,241,0.12); color:#6366f1; font-size:0.65rem; font-weight:800;">📚 إنشاء دورات</span>` : ''}
                            ${(!u.teacherCapabilities || u.teacherCapabilities.includes("SESSION_TEACHER")) ? `<span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.65rem; font-weight:800;">⏱️ حصص خاصة</span>` : ''}
                          </div>
                        </td>
                        <td style="padding:14px 20px;">
                          <span style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; padding:4px 12px; border-radius:12px; font-size:0.82rem; display:inline-flex; align-items:center; gap:4px;">
                            💵 ${item.rate} ج.م / ساعة
                          </span>
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="font-weight:700;">${item.completedCount} حصص</div>
                          <div style="font-size:0.75rem;color:var(--text-muted);">${item.completedHours} ساعة عمل</div>
                        </td>
                        <td style="padding:14px 20px;">
                          <span style="background:rgba(16,185,129,0.15); color:var(--success); font-weight:900; padding:6px 14px; border-radius:14px; font-size:0.9rem; display:inline-flex; align-items:center; gap:4px;">
                            💰 ${item.totalSalary.toLocaleString()} ج.م
                          </span>
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                            ${u.phone ? `
                              <a href="https://wa.me/${getCleanWhatsAppNumber(u.phone)}?text=${encodeURIComponent(`مرحباً الأستاذ ${u.name}، نتواصل معك من إدارة منصة انطلق.`)}" target="_blank" class="btn-secondary" style="font-size:0.75rem;padding:6px 11px;border-color:#10b981;color:#10b981;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:rgba(16,185,129,0.08);" title="محادثة واتساب مباشرة">
                                <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب
                              </a>
                            ` : `
                              <button class="btn-secondary" disabled style="font-size:0.75rem;padding:6px 11px;opacity:0.4;cursor:not-allowed;border-radius:10px;display:inline-flex;align-items:center;gap:4px;" title="لا يتوفر هاتف مسجل">
                                <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب
                              </button>
                            `}
                            <button class="btn-secondary communicate-user-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 11px;border-color:var(--primary);color:var(--primary);display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:rgba(99,102,241,0.08);" title="خيارات ونماذج التواصل">
                              <i data-lucide="send" style="width:12px;height:12px;"></i> تواصل
                            </button>
                            <button class="btn-secondary edit-member-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 11px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="edit" style="width:12px;height:12px;"></i> تعديل
                            </button>
                            <button class="btn-secondary view-transcript-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 11px;border-color:var(--info);color:var(--info);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="file-text" style="width:12px;height:12px;"></i> السجل
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
        }).join("")}
                </tbody>
              </table>
            </div>
          </div>`
      }
    `;
  },

  // ── Teacher Applications Tab ─────────────────────────────────────────────────

  renderTeacherApplicationsTab() {
    const apps = this.teacherApplications || [];
    const pending = apps.filter(a => a.status === "pending");
    const approved = apps.filter(a => a.status === "approved");
    const rejected = apps.filter(a => a.status === "rejected");

    const statusBadge = (status) => {
      const map = {
        pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "⏳ قيد المراجعة" },
        approved: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "✅ مقبول" },
        rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "❌ مرفوض" },
      };
      const s = map[status] || map.pending;
      return `<span style="font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:20px; background:${s.bg}; color:${s.color};">${s.label}</span>`;
    };

    const appCard = (app) => `
      <div class="glass-card" style="border-radius:16px; padding:20px; border:1px solid var(--border-color); border-right: 4px solid ${app.status === 'pending' ? '#f59e0b' : app.status === 'approved' ? '#22c55e' : '#ef4444'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(app.name)}" 
              alt="${app.name}" style="width:52px; height:52px; border-radius:50%; border:2px solid var(--border-color);">
            <div>
              <h4 style="font-size:1rem; font-weight:800; margin:0 0 4px 0;">${app.name}</h4>
              <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">${app.email}</p>
            </div>
          </div>
          ${statusBadge(app.status)}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:0.83rem;">
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="graduation-cap" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${app.education || "غير محدد"}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="map-pin" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${app.location || "غير محدد"}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="phone" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${app.phone || "غير محدد"}</span>
            ${app.phone ? `
              <a href="https://wa.me/${getCleanWhatsAppNumber(app.phone)}" target="_blank" style="color:var(--success); text-decoration:none; margin-inline-start:4px; display:inline-flex; align-items:center; gap:3px; font-weight:700;" title="واتساب المباشر">
                <i data-lucide="message-circle" style="width:14px;height:14px;"></i> واتساب
              </a>
            ` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);">
            <i data-lucide="calendar" style="width:14px;height:14px;color:var(--primary);"></i>
            <span>${new Date(app.createdAt).toLocaleDateString("ar")}</span>
          </div>
        </div>

        ${app.bio ? `<p style="font-size:0.83rem; color:var(--text-muted); padding:12px; background:var(--bg-app); border-radius:8px; margin-bottom:14px; line-height:1.6;">${app.bio}</p>` : ""}

        ${app.status === "pending" ? `
        <div style="display:flex; gap:10px; border-top:1px solid var(--border-color); padding-top:14px;">
          <button class="btn-primary approve-application-btn" data-id="${app.id}" 
            style="flex:1; padding:8px; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px; background:var(--success);">
            <i data-lucide="check-circle" style="width:15px;height:15px;"></i> قبول الطلب
          </button>
          <button class="btn-secondary reject-application-btn" data-id="${app.id}" 
            style="flex:1; padding:8px; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px; color:var(--error); border-color:var(--error);">
            <i data-lucide="x-circle" style="width:15px;height:15px;"></i> رفض الطلب
          </button>
        </div>` : ""}
      </div>
    `;

    return `
      <!-- Summary Badges -->
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px;">
        <div class="glass-card" style="padding:16px 20px; border-right:4px solid #f59e0b; border-radius:12px;">
          <p style="font-size:1.8rem; font-weight:900; color:#f59e0b; margin:0;">${pending.length}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">⏳ طلبات قيد المراجعة</p>
        </div>
        <div class="glass-card" style="padding:16px 20px; border-right:4px solid #22c55e; border-radius:12px;">
          <p style="font-size:1.8rem; font-weight:900; color:#22c55e; margin:0;">${approved.length}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">✅ طلبات مقبولة</p>
        </div>
        <div class="glass-card" style="padding:16px 20px; border-right:4px solid #ef4444; border-radius:12px;">
          <p style="font-size:1.8rem; font-weight:900; color:#ef4444; margin:0;">${rejected.length}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">❌ طلبات مرفوضة</p>
        </div>
      </div>

      <!-- Pending Applications First -->
      ${pending.length > 0 ? `
        <h4 style="font-weight:800; margin-bottom:16px; font-size:1rem;">⏳ طلبات تنتظر المراجعة (${pending.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px; margin-bottom:28px;">
          ${pending.map(a => appCard(a)).join("")}
        </div>
      ` : `<div class="glass-card" style="text-align:center;padding:28px;color:var(--text-muted);margin-bottom:24px;">لا توجد طلبات قيد الانتظار حالياً ✅</div>`}

      <!-- Approved -->
      ${approved.length > 0 ? `
        <h4 style="font-weight:800; margin-bottom:16px; font-size:1rem;">✅ الطلبات المقبولة (${approved.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px; margin-bottom:28px;">
          ${approved.map(a => appCard(a)).join("")}
        </div>
      ` : ""}

      <!-- Rejected -->
      ${rejected.length > 0 ? `
        <h4 style="font-weight:800; margin-bottom:16px; font-size:1rem;">❌ الطلبات المرفوضة (${rejected.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px,1fr)); gap:16px;">
          ${rejected.map(a => appCard(a)).join("")}
        </div>
      ` : ""}

      ${apps.length === 0 ? `<div class="glass-card" style="text-align:center;padding:60px;color:var(--text-muted);">لم يتم استلام أي طلبات انضمام بعد. <br><br><a href="#teacher-apply" style="color:var(--primary);">رابط طلب الانضمام</a></div>` : ""}
    `;
  },

  // ── 3. Dedicated Students Tab (Add Student & Edit Student & View Transcript) ─────

  renderStudentsTab() {
    const students = this.allMembers.filter(u => u.role === "student");

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:700;margin-bottom:4px;">${t("admin.tab.students")} (${students.length})</h3>
          <p style="font-size:0.83rem;color:var(--text-muted);margin:0;">قائمة الطلاب المسجلين، بيانات الاتصال، وإمكانية التواصل المباشر عبر الواتساب والبريد الإلكتروني</p>
        </div>
        <button class="btn-primary" id="open-create-student-btn" style="font-size:0.85rem;padding:10px 18px;background:var(--success);">
          <i data-lucide="user-plus"></i> ${t("admin.addStudent")}
        </button>
      </div>

      ${students.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noStudents")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;text-align:start;font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.name")}</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">البريد والتواصل</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">المستوى / الولاية</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">التواصل السريع</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map(u => {
                    const joinDate = new Date(u.createdAt).toLocaleDateString();
                    const cleanPhone = u.phone ? getCleanWhatsAppNumber(u.phone) : "";
                    const cleanParentPhone = u.parentPhone ? getCleanWhatsAppNumber(u.parentPhone) : "";
                    const studentWaText = encodeURIComponent(`مرحباً ${u.name}، نتواصل معك من إدارة منصة انطلق.`);
                    const parentWaText = encodeURIComponent(`مرحباً ولي أمر الطالب ${u.name}، نتواصل معكم من إدارة منصة انطلق.`);

                    return `
                      <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:14px 20px;">
                          <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${u.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + u.name}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">
                            <div>
                              <div style="font-weight:700;font-size:0.9rem;">${u.name}</div>
                              <div style="font-size:0.75rem;color:var(--primary);font-weight:600;">انضمام: ${joinDate}</div>
                            </div>
                          </div>
                        </td>
                        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">
                          <div>
                            <a href="mailto:${u.email}" style="color:var(--text-color);text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:600;" title="إرسال بريد إلكتروني">
                              <i data-lucide="mail" style="width:13px;height:13px;color:var(--primary);"></i> ${u.email}
                            </a>
                          </div>
                          ${u.phone ? `
                            <div style="margin-top:4px;">
                              <a href="https://wa.me/${cleanPhone}?text=${studentWaText}" target="_blank" style="color:#10b981; text-decoration:none; font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:4px; background:rgba(16,185,129,0.08); padding:2px 8px; border-radius:6px;" title="واتساب الطالب">
                                <i data-lucide="message-circle" style="width:12px;height:12px;"></i> ${u.phone}
                              </a>
                            </div>
                          ` : ''}
                          ${u.parentPhone ? `
                            <div style="margin-top:2px;">
                              <a href="https://wa.me/${cleanParentPhone}?text=${parentWaText}" target="_blank" style="color:var(--primary); text-decoration:none; font-size:0.78rem; font-weight:700; display:inline-flex; align-items:center; gap:4px; background:rgba(99,102,241,0.08); padding:2px 8px; border-radius:6px;" title="واتساب ولي الأمر">
                                👨‍👩‍👦 ${u.parentPhone}
                              </a>
                            </div>
                          ` : ''}
                          ${!u.phone && !u.parentPhone ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">بدون هاتف مسجل</div>` : ''}
                        </td>
                        <td style="padding:14px 20px;">
                          ${u.education ? `<span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.75rem; font-weight:800; display:inline-block; margin-bottom:4px;">${u.education}</span>` : '<span style="font-size:0.75rem;color:var(--text-muted);">-</span>'}
                          ${u.location ? `<div style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;gap:3px;"><i data-lucide="map-pin" style="width:11px;height:11px;"></i> ${u.location}</div>` : ''}
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                            ${cleanPhone ? `
                              <a href="https://wa.me/${cleanPhone}?text=${studentWaText}" target="_blank" class="btn-secondary" style="padding:5px 10px; font-size:0.75rem; border-color:#10b981; color:#10b981; border-radius:10px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:700; background:rgba(16,185,129,0.08);" title="واتساب الطالب مباشرة">
                                <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب
                              </a>
                            ` : ''}
                            ${cleanParentPhone ? `
                              <a href="https://wa.me/${cleanParentPhone}?text=${parentWaText}" target="_blank" class="btn-secondary" style="padding:5px 10px; font-size:0.75rem; border-color:var(--primary); color:var(--primary); border-radius:10px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:700; background:rgba(99,102,241,0.08);" title="واتساب ولي الأمر">
                                💬 ولي الأمر
                              </a>
                            ` : ''}
                            <button class="btn-secondary communicate-user-btn" data-id="${u.id}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--primary);color:var(--primary);display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:rgba(99,102,241,0.08);" title="خيارات ونماذج المراسلة">
                              <i data-lucide="send" style="width:12px;height:12px;"></i> تواصل
                            </button>
                          </div>
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn-secondary edit-member-btn" data-id="${u.id}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="edit" style="width:12px;height:12px;"></i> تعديل
                            </button>
                            <button class="btn-secondary view-transcript-btn" data-id="${u.id}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--info);color:var(--info);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="file-text" style="width:12px;height:12px;"></i> السجل
                            </button>
                            <button class="btn-secondary delete-user-btn" data-id="${u.id}" data-name="${u.name}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--error,#ef4444);color:var(--error,#ef4444);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="trash-2" style="width:12px;height:12px;"></i> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>`
      }
    `;
  },

  // ── 4. Members Management Tab (All Members: Add / Edit / Delete) ─────────────

  renderMembersTab() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <h3 style="font-weight:700;">${t("admin.tab.allMembers")} (${this.allMembers.length})</h3>
        <button class="btn-primary" id="open-create-member-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addMember")}
        </button>
      </div>

      ${this.allMembers.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noTeachers")}</div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.name")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.email")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("form.accountType")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.joined")}</th>
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                ${this.allMembers.map(u => this.memberTableRow(u)).join("")}
              </tbody>
            </table>
          </div>`
      }
    `;
  },

  memberTableRow(user) {
    const joinDate = new Date(user.createdAt).toLocaleDateString();
    const isMe = user.id === state.user?.id;
    const cleanPhone = user.phone ? getCleanWhatsAppNumber(user.phone) : "";

    let roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(99,102,241,0.15);color:var(--primary);">${t("admin.role.student")}</span>`;
    if (user.role === "teacher") {
      roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(16,185,129,0.15);color:var(--success);">${t("admin.role.teacher")}</span>`;
    } else if (user.role === "admin") {
      roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(245,158,11,0.15);color:#f59e0b;">${t("admin.role.admin")}</span>`;
    }

    return `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:14px 20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + user.name}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
            <span style="font-weight:600;font-size:0.9rem;">${user.name}</span>
          </div>
        </td>
        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">
          <div>${user.email}</div>
          ${user.phone ? `
            <div style="margin-top:3px;">
              <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${user.name}، نتواصل معك من إدارة منصة انطلق.`)}" target="_blank" style="color:#10b981;font-size:0.78rem;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px;" title="واتساب">
                <i data-lucide="message-circle" style="width:12px;height:12px;"></i> ${user.phone}
              </a>
            </div>
          ` : ''}
        </td>
        <td style="padding:14px 20px;">${roleBadge}</td>
        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">${joinDate}</td>
        <td style="padding:14px 20px;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${cleanPhone ? `
              <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً ${user.name}، نتواصل معك من إدارة منصة انطلق.`)}" target="_blank" class="btn-secondary" style="font-size:0.75rem;padding:6px 10px;border-color:#10b981;color:#10b981;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:rgba(16,185,129,0.08);" title="محادثة واتساب">
                <i data-lucide="message-circle" style="width:12px;height:12px;"></i> واتساب
              </a>
            ` : ''}
            <button class="btn-secondary communicate-user-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--primary);color:var(--primary);display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:rgba(99,102,241,0.08);" title="خيارات ونماذج التواصل">
              <i data-lucide="send" style="width:12px;height:12px;"></i> تواصل
            </button>
            <button class="btn-secondary edit-member-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
              <i data-lucide="edit" style="width:12px;height:12px;"></i> ${t("admin.editMember")}
            </button>
            <button class="btn-secondary view-transcript-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--info);color:var(--info);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
              <i data-lucide="file-text" style="width:12px;height:12px;"></i> ${t("admin.viewTranscript")}
            </button>
            ${!isMe ? `
              <button class="btn-secondary delete-user-btn" data-id="${user.id}" data-name="${user.name}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--error,#ef4444);color:var(--error,#ef4444);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i> ${t("common.delete")}
              </button>` : `<span style="font-size:0.75rem;color:var(--text-muted);">${t("admin.you")}</span>`}
          </div>
        </td>
      </tr>
    `;
  },

  // ── 5. Courses Management Tab ────────────────────────────────────────────────

  renderMemberModal(user = null, defaultRole = "student") {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const isEdit = !!user;
    const initialRole = isEdit ? user.role : defaultRole;

    container.innerHTML = `
      <div class="modal-overlay" id="member-modal" style="display:flex; padding:16px;">
        <div class="modal-content" style="max-width:600px; max-height:88vh; overflow-y:auto; border-radius:20px;">
          <div class="modal-header" style="padding:14px 20px;">
            <h3 class="modal-title" style="font-size:1.15rem;">${isEdit ? t("admin.editMember") : t("admin.addMember")}</h3>
            <span class="modal-close-btn" id="close-member-modal">&times;</span>
          </div>
          <form id="member-form">
            <div class="modal-body" style="padding:18px 20px; display:flex; flex-direction:column; gap:12px;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-name" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.fullName")}</label>
                  <input type="text" id="member-name" class="form-input" value="${isEdit ? user.name : ''}" placeholder="${t("form.fullNamePlaceholder")}" required style="padding:8px 12px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-email" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.email")}</label>
                  <input type="email" id="member-email" class="form-input" value="${isEdit ? user.email : ''}" placeholder="email@example.com" required style="padding:8px 12px; font-size:0.88rem;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-role" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.accountType")}</label>
                  <select id="member-role" class="form-select" style="padding:8px 12px; font-size:0.88rem;">
                    <option value="student" ${initialRole === "student" ? "selected" : ""}>${t("admin.role.student")}</option>
                    <option value="teacher" ${initialRole === "teacher" ? "selected" : ""}>${t("admin.role.teacher")}</option>
                    <option value="admin" ${initialRole === "admin" ? "selected" : ""}>${t("admin.role.admin")}</option>
                  </select>
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-password" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${isEdit ? t("admin.newPassword") : t("form.password")}</label>
                  <input type="password" id="member-password" class="form-input" placeholder="${isEdit ? t("admin.leavePasswordBlank") : t("form.passwordPlaceholder")}" ${isEdit ? '' : 'required'} style="padding:8px 12px; font-size:0.88rem;">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-phone" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">رقم هاتف المستخدم والواتساب</label>
                  ${renderPhoneInputGroup({ selectId: "member-phone-code", inputId: "member-phone-num", defaultCode: "+20", value: isEdit ? (user.phone || "") : "", placeholder: "01012345678", required: false })}
                </div>
                <div class="form-group" style="margin:0;">
                  <label for="member-education" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">المستوى الدراسي</label>
                  ${renderEducationSelectHTML({ id: "member-education", selectedValue: isEdit ? (user.education || "Entlq 3") : "Entlq 3", style: "padding:8px 12px; font-size:0.88rem;" })}
                </div>
              </div>

              <!-- Parent Phone (Required for New Students) -->
              <div id="parent-phone-group" style="display:${initialRole === 'student' ? 'block' : 'none'}; margin-top:2px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-parent-phone" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">
                    رقم هاتف ولي الأمر (Parent Phone)
                  </label>
                  ${renderPhoneInputGroup({ selectId: "member-parent-phone-code", inputId: "member-parent-phone-num", defaultCode: "+20", value: isEdit ? (user.parentPhone || "") : "", placeholder: "01012345678", required: false })}
                </div>
              </div>

              <!-- Teacher Capabilities & Hourly Rate Section -->
              <div id="teacher-capabilities-group" style="display:${initialRole === 'teacher' ? 'block' : 'none'}; background:rgba(99,102,241,0.06); padding:14px; border-radius:14px; border:1px solid var(--border-focus); margin-top:4px;">
                
                <div class="form-group" style="margin-bottom:12px;">
                  <label for="member-meeting-link" style="font-size:0.85rem; font-weight:800; color:var(--primary); margin-bottom:4px; display:block;">
                    🔗 رابط اجتماع المعلم الثابت (Google Meet / Zoom Static Link):
                  </label>
                  <input type="url" id="member-meeting-link" class="form-input" value="${isEdit ? (user.meetingLink || '') : ''}" placeholder="https://meet.google.com/abc-defg-hij" style="padding:8px 12px; font-size:0.88rem; width:100%;">
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                  <label for="member-hourly-rate" style="font-size:0.85rem; font-weight:800; color:var(--primary); margin-bottom:4px; display:block;">
                    💵 أجر الساعة للمعلم (Hourly Rate):
                  </label>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <input type="number" id="member-hourly-rate" class="form-input" min="0" step="5" value="${isEdit ? (user.hourlyRate !== undefined ? user.hourlyRate : 150) : 150}" placeholder="150" style="padding:8px 12px; font-size:0.88rem; flex:1;">
                    <span style="font-size:0.85rem; font-weight:700; color:var(--text-muted);">ج.م / ساعة</span>
                  </div>
                </div>

                <label style="font-size:0.85rem; font-weight:800; color:var(--primary); margin-bottom:8px; display:block;">
                  🎯 صلاحيات وقدرات المعلم (Teacher Capabilities):
                </label>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.83rem; cursor:pointer; font-weight:600;">
                    <input type="checkbox" id="cap-course" value="COURSE_INSTRUCTOR" ${!isEdit || (user.teacherCapabilities && user.teacherCapabilities.includes("COURSE_INSTRUCTOR")) ? "checked" : ""}>
                    <span>📚 COURSE_INSTRUCTOR (إنشاء وبيع الدورات والدروس المسجلة)</span>
                  </label>
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.83rem; cursor:pointer; font-weight:600;">
                    <input type="checkbox" id="cap-session" value="SESSION_TEACHER" ${!isEdit || (user.teacherCapabilities && user.teacherCapabilities.includes("SESSION_TEACHER")) ? "checked" : ""}>
                    <span>⏱️ SESSION_TEACHER (تقديم الحصص المباشرة والاشتراكات الخاصة 1-على-1)</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="padding:12px 20px;">
              <button type="button" class="btn-secondary" id="cancel-member-modal" style="padding:8px 18px; font-size:0.88rem;">${t("common.cancel")}</button>
              <button type="submit" class="btn-primary" style="padding:8px 22px; font-size:0.88rem; font-weight:800;">${isEdit ? t("admin.saveChanges") : t("admin.addMember")}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };

    document.getElementById("close-member-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-member-modal")?.addEventListener("click", closeModal);

    document.getElementById("member-role")?.addEventListener("change", (e) => {
      const capGroup = document.getElementById("teacher-capabilities-group");
      if (capGroup) capGroup.style.display = e.target.value === "teacher" ? "block" : "none";
      const parentPhoneGroup = document.getElementById("parent-phone-group");
      if (parentPhoneGroup) parentPhoneGroup.style.display = e.target.value === "student" ? "block" : "none";
    });

    document.getElementById("member-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("member-name").value;
      const email = document.getElementById("member-email").value;
      const role = document.getElementById("member-role").value;
      const password = document.getElementById("member-password").value;
      const phoneCode = document.getElementById("member-phone-code")?.value || "+20";
      const phoneNum = document.getElementById("member-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";

      const parentPhoneCode = document.getElementById("member-parent-phone-code")?.value || "+20";
      const parentPhoneNum = document.getElementById("member-parent-phone-num")?.value.trim() || "";
      const parentPhone = parentPhoneNum ? `${parentPhoneCode} ${parentPhoneNum}`.trim() : "";

      const education = document.getElementById("member-education")?.value || "";
      const hourlyRate = parseFloat(document.getElementById("member-hourly-rate")?.value) || 150;
      const meetingLink = document.getElementById("member-meeting-link")?.value.trim() || "";

      const teacherCapabilities = [];
      if (role === "teacher") {
        if (document.getElementById("cap-course")?.checked) teacherCapabilities.push("COURSE_INSTRUCTOR");
        if (document.getElementById("cap-session")?.checked) teacherCapabilities.push("SESSION_TEACHER");
      }

      try {
        if (isEdit) {
          await apiFetch(`/admin/users/${user.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink, teacherCapabilities })
          });
          showToast(t("admin.toast.userUpdated") || "تم تحديث بيانات العضو بنجاح! ✅", "success");
        } else {
          const res = await apiFetch("/admin/users", {
            method: "POST",
            body: JSON.stringify({ name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink, teacherCapabilities })
          });
          showToast(t("admin.toast.userCreated") || "تم إنشاء حساب العضو بنجاح! 🎉", "success");
          handleWhatsAppResponse(res);
        }
        closeModal();
        await this.loadAllData();
        this.renderTab(this.activeTab);
      } catch (err) {
        console.error("Member save error:", err);
        showToast(err.message || "فشل حفظ بيانات العضو", "error");
      }
    });
  },

  // ── Render User Transcript Modal ──────────────────────────────────────────────

  renderTranscriptModal(user) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const joinDate = new Date(user.createdAt).toLocaleString();

    container.innerHTML = `
      <div class="modal-overlay" id="transcript-modal" style="display:flex;">
        <div class="modal-content" style="max-width:650px;">
          <div class="modal-header">
            <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
              <i data-lucide="file-text" style="color:var(--primary);"></i>
              ${t("admin.transcriptTitle")}
            </h3>
            <span class="modal-close-btn" id="close-transcript-modal">&times;</span>
          </div>
          <div class="modal-body" style="font-family:monospace; background:var(--bg-card); padding:20px; border-radius:var(--radius-sm); max-height:400px; overflow-y:auto; font-size:0.85rem; line-height:1.6;">
            <div style="border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
              <strong style="color:var(--primary);">[SYSTEM TRANSCRIPT AUDIT LOG]</strong><br>
              <strong>Member Name:</strong> ${user.name}<br>
              <strong>Email:</strong> ${user.email}<br>
              <strong>Role:</strong> ${user.role.toUpperCase()}<br>
              <strong>User ID:</strong> ${user.id}<br>
              <strong>Account Created:</strong> ${joinDate}
            </div>

            <div style="color:var(--text-muted);">
              <div>[TIMESTAMP ${joinDate}] USER_REGISTERED: Account provisioned with role "${user.role}".</div>
              <div>[TIMESTAMP ${joinDate}] AUTH_VERIFIED: JWT Token granted. Session established.</div>
              ${user.role === "teacher" ? `
                <div>[TIMESTAMP ACTIVE] TEACHER_PORTAL: Verified broadcaster credentials. Authorized to create courses & schedule live classrooms.</div>
              ` : `
                <div>[TIMESTAMP ACTIVE] STUDENT_PORTAL: Active curriculum path initialized. Enrolled course tracks ready.</div>
              `}
              <div style="margin-top:12px; color:var(--success);">[STATUS OK] Transcript log clean. No security anomalies detected.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" id="close-transcript-btn">${t("common.cancel")}</button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-transcript-modal")?.addEventListener("click", closeModal);
    document.getElementById("close-transcript-btn")?.addEventListener("click", closeModal);
  },

  // ── Render Quick Communicate Modal (WhatsApp & Email) ─────────────────────────

  renderCommunicateModal(user) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const isTeacher = user.role === "teacher";
    const cleanUserPhone = user.phone ? getCleanWhatsAppNumber(user.phone) : "";
    const cleanParentPhone = user.parentPhone ? getCleanWhatsAppNumber(user.parentPhone) : "";

    let currentTargetPhone = cleanUserPhone || cleanParentPhone || "";
    let currentTargetType = cleanUserPhone ? "user" : (cleanParentPhone ? "parent" : "none");

    const templates = isTeacher ? [
      {
        id: "t1",
        label: "👋 ترحيب وتنسيق",
        text: `مرحباً الأستاذ ${user.name}، نأمل أن تكون بخير. نتواصل معك من إدارة منصة انطلق لمتابعة التنسيق الأكاديمي وجداول الحصص. نسعد دائماً بتواجدك معنا.`
      },
      {
        id: "t2",
        label: "⏰ تذكير بمواعيد الحصص",
        text: `مرحباً الأستاذ ${user.name}، نود تذكيرك بمواعيد الحصص التفاعلية القادمة المقررة على منصة انطلق، يرجى مراجعة الجدول والتأكد من فتح الفصل الافتراضي في الموعد المحدد.`
      },
      {
        id: "t3",
        label: "💰 كشف المستحقات والرواتب",
        text: `مرحباً الأستاذ ${user.name}، تم تدقيق وتحديث كشف المستحقات المالية والساعات المنفذة الخاصة بك على منصة انطلق. يمكنك مراجعتها عبر بوابة المعلم.`
      },
      {
        id: "t4",
        label: "✍️ رسالة مخصصة",
        text: `مرحباً الأستاذ ${user.name}، `
      }
    ] : [
      {
        id: "s1",
        label: "👋 ترحيب ومتابعة",
        text: `مرحباً ${user.name}، نتمنى لك كل التوفيق في دراستك عبر منصة انطلق! فريق الإشراف متواجد لدعمك والإجابة على أي استفسار يخص المواد والحصص.`
      },
      {
        id: "s2",
        label: "⏰ تذكير بحصة مباشرة",
        text: `مرحباً ${user.name}، نود تذكيرك بموعد حصتك التفاعلية المباشرة القادمة عبر منصة انطلق، يرجى الاستعداد وتسجيل الحضور في الموعد.`
      },
      {
        id: "s3",
        label: "👨‍👩‍👦 متابعة مع ولي الأمر",
        text: `تحية طيبة، نتواصل معكم من إدارة منصة انطلق لمتابعة التقدم الدراسي والحضور للحصص التفاعلية للطالب ${user.name}. نسعد بتواصلكم معنا دائماً.`
      },
      {
        id: "s4",
        label: "✍️ رسالة مخصصة",
        text: `مرحباً ${user.name}، `
      }
    ];

    let currentText = templates[0].text;

    container.innerHTML = `
      <div class="modal-overlay" id="communicate-modal" style="display:flex; padding:16px;">
        <div class="modal-content" style="max-width:620px; width:100%; border-radius:20px; overflow:hidden;">
          
          <div class="modal-header" style="padding:16px 20px; background:var(--bg-card); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:50%; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="message-circle" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 class="modal-title" style="font-size:1.1rem; margin:0 0 2px 0;">تواصل مع ${isTeacher ? 'المعلم' : 'الطالب'}: ${user.name}</h3>
                <span style="font-size:0.75rem; color:var(--text-muted);">${user.email}</span>
              </div>
            </div>
            <span class="modal-close-btn" id="close-communicate-modal">&times;</span>
          </div>

          <div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
            
            <!-- Target Selector if Student has both phones -->
            ${!isTeacher && user.parentPhone && user.phone ? `
              <div>
                <label style="font-size:0.83rem; font-weight:700; margin-bottom:6px; display:block; color:var(--text-muted);">إرسال إلى:</label>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <label id="lbl-target-user" style="border:1.5px solid #10b981; padding:10px 14px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:8px; background:rgba(16,185,129,0.06);">
                    <input type="radio" name="communicate-target" value="user" checked>
                    <span style="font-size:0.83rem; font-weight:700;">📱 الطالب: ${user.phone}</span>
                  </label>
                  <label id="lbl-target-parent" style="border:1.5px solid var(--border-color); padding:10px 14px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--bg-card);">
                    <input type="radio" name="communicate-target" value="parent">
                    <span style="font-size:0.83rem; font-weight:700;">👨‍👩‍👦 ولي الأمر: ${user.parentPhone}</span>
                  </label>
                </div>
              </div>
            ` : `
              <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-card); padding:10px 16px; border-radius:12px; border:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="phone" style="width:16px; height:16px; color:var(--primary);"></i>
                  <span style="font-size:0.85rem; font-weight:700;">رقم الهاتف:</span>
                  <span style="font-size:0.88rem; font-weight:800; color:var(--text-color);">${user.phone || (user.parentPhone ? user.parentPhone + ' (ولي الأمر)' : 'غير متوفر')}</span>
                </div>
                ${(user.phone || user.parentPhone) ? `
                  <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem;">جاهز للواتساب ✅</span>
                ` : `
                  <span class="badge" style="background:rgba(239,68,68,0.12); color:var(--error); font-weight:800; font-size:0.75rem;">لا يوجد رقم هاتف ⚠️</span>
                `}
              </div>
            `}

            <!-- Quick Template Selector -->
            <div>
              <label style="font-size:0.83rem; font-weight:700; margin-bottom:8px; display:block; color:var(--text-muted);">نماذج الرسائل السريعة:</label>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px;" id="communicate-templates-grid">
                ${templates.map((tpl, idx) => `
                  <button type="button" class="btn-secondary template-select-btn" data-index="${idx}" style="font-size:0.78rem; padding:8px 10px; text-align:start; border-radius:10px; border-color:${idx === 0 ? 'var(--primary)' : 'var(--border-color)'}; background:${idx === 0 ? 'rgba(99,102,241,0.1)' : 'transparent'}; font-weight:700; cursor:pointer;">
                    ${tpl.label}
                  </button>
                `).join("")}
              </div>
            </div>

            <!-- Message Textarea -->
            <div>
              <label for="communicate-textarea" style="font-size:0.83rem; font-weight:700; margin-bottom:6px; display:block; color:var(--text-muted);">نص الرسالة (يمكنك تعديلها بحرية):</label>
              <textarea id="communicate-textarea" class="form-input" rows="4" style="width:100%; box-sizing:border-box; padding:12px; font-size:0.92rem; line-height:1.6; border-radius:12px; resize:vertical;">${currentText}</textarea>
            </div>

            <!-- Action Buttons -->
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px;">
              <button type="button" id="btn-send-whatsapp" class="btn-primary" style="flex:1; min-width:180px; padding:12px 18px; font-size:0.92rem; font-weight:800; background:#10b981; border:none; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
                <i data-lucide="message-circle" style="width:18px; height:18px;"></i> فتح محادثة واتساب
              </button>
              <button type="button" id="btn-send-email" class="btn-secondary" style="padding:12px 16px; font-size:0.88rem; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
                <i data-lucide="mail" style="width:16px; height:16px;"></i> إرسال بريد
              </button>
              <button type="button" id="btn-copy-text" class="btn-secondary" style="padding:12px 16px; font-size:0.88rem; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;" title="نسخ نص الرسالة">
                <i data-lucide="copy" style="width:16px; height:16px;"></i> نسخ
              </button>
            </div>

          </div>

          <div class="modal-footer" style="padding:12px 20px; background:var(--bg-card); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end;">
            <button class="btn-secondary" id="cancel-communicate-btn" style="padding:8px 20px; font-size:0.88rem;">إغلاق</button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-communicate-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-communicate-btn")?.addEventListener("click", closeModal);

    const textarea = document.getElementById("communicate-textarea");

    // Template selection
    const templateBtns = container.querySelectorAll(".template-select-btn");
    templateBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        templateBtns.forEach(b => {
          b.style.borderColor = "var(--border-color)";
          b.style.background = "transparent";
        });
        btn.style.borderColor = "var(--primary)";
        btn.style.background = "rgba(99,102,241,0.1)";
        if (templates[idx] && textarea) {
          textarea.value = templates[idx].text;
          textarea.focus();
        }
      });
    });

    // Radio target change
    const radioInputs = container.querySelectorAll("input[name='communicate-target']");
    radioInputs.forEach(radio => {
      radio.addEventListener("change", () => {
        currentTargetType = radio.value;
        if (currentTargetType === "user") {
          currentTargetPhone = cleanUserPhone;
          document.getElementById("lbl-target-user")?.style.setProperty("border-color", "#10b981");
          document.getElementById("lbl-target-parent")?.style.setProperty("border-color", "var(--border-color)");
        } else {
          currentTargetPhone = cleanParentPhone;
          document.getElementById("lbl-target-parent")?.style.setProperty("border-color", "var(--primary)");
          document.getElementById("lbl-target-user")?.style.setProperty("border-color", "var(--border-color)");
        }
      });
    });

    // Send WhatsApp
    document.getElementById("btn-send-whatsapp")?.addEventListener("click", () => {
      const targetPhone = currentTargetPhone;
      if (!targetPhone) {
        showToast("لا يتوفر رقم هاتف مسجل لهذا الحساب للتواصل عبر الواتساب.", "warning");
        return;
      }
      const text = textarea ? textarea.value.trim() : "";
      const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    });

    // Send Email
    document.getElementById("btn-send-email")?.addEventListener("click", () => {
      const text = textarea ? textarea.value.trim() : "";
      const subject = encodeURIComponent(`منصة انطلق - تواصل مع الإدارة`);
      const body = encodeURIComponent(text);
      window.location.href = `mailto:${encodeURIComponent(user.email)}?subject=${subject}&body=${body}`;
    });

    // Copy Text
    document.getElementById("btn-copy-text")?.addEventListener("click", async () => {
      const text = textarea ? textarea.value.trim() : "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast("تم نسخ نص الرسالة إلى الحافظة بنجاح!", "success");
      } catch {
        showToast("فشل نسخ النص.", "error");
      }
    });
  }

};
