import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML, generateEntlqEmail } from '../../app.js';

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
        ${state.user?.role === "admin" ? `
        <button class="btn-primary" id="open-create-teacher-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addTeacher")}
        </button>
        ` : ""}
      </div>

      <!-- Salary Summary Strip -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">

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
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">ملاحظات</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${teacherData.map(item => {
          const u = item.teacher;
          const joinDate = new Date(u.createdAt).toLocaleDateString();
          const isBlocked = u.isBlocked || u.status === 'BLOCKED' || u.status === 'SUSPENDED';
          return `
                      <tr style="border-bottom:1px solid var(--border-color);${isBlocked ? 'background:rgba(239,68,68,0.03);' : ''}">
                        <td style="padding:14px 20px;">
                          <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${(u.avatar && !u.avatar.includes('dicebear.com')) ? u.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;${isBlocked ? 'filter:grayscale(60%);border:2px solid var(--error,#ef4444);' : ''}">
                            <div>
                              <div style="font-weight:700;font-size:0.9rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <span>${u.name}</span>
                                ${isBlocked
              ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:var(--error,#ef4444);font-size:0.68rem;padding:2px 7px;border-radius:6px;font-weight:800;">🚫 محظور من الدخول</span>`
              : `<span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.68rem;padding:2px 7px;border-radius:6px;font-weight:800;">✅ نشط</span>`
            }
                              </div>
                              ${u.education ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">🎓 ${u.education}</div>` : ''}
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
                          ${u.notes ? `
                            <div style="font-size:0.8rem; color:var(--text-main); background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:8px; padding:6px 10px; max-width:200px; white-space:pre-wrap; word-break:break-word; line-height:1.4;">
                              ${u.notes}
                            </div>
                          ` : `<span style="font-size:0.75rem;color:var(--text-muted);">-</span>`}
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
                            ${state.user?.role === "admin" ? `
                            <button class="btn-secondary toggle-block-btn" data-id="${u.id}" data-name="${u.name}" data-role="teacher" data-blocked="${isBlocked ? 'true' : 'false'}" style="font-size:0.75rem;padding:6px 11px;border-color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};display:inline-flex;align-items:center;gap:4px;border-radius:10px;background:${isBlocked ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};font-weight:700;" title="${isBlocked ? 'إلغاء حظر المعلم والسماح له بتسجيل الدخول' : 'حظر المعلم ومنعه من تسجيل الدخول إلى الأكاديمية'}">
                              <i data-lucide="${isBlocked ? 'check-circle' : 'shield-alert'}" style="width:12px;height:12px;"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر المعلم'}
                            </button>
                            <button class="btn-secondary edit-member-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 11px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="edit" style="width:12px;height:12px;"></i> تعديل
                            </button>
                            <button class="btn-secondary reset-user-pwd-btn" data-id="${u.id}" data-name="${u.name}" style="font-size:0.75rem;padding:6px 11px;border-color:#f59e0b;color:#d97706;display:inline-flex;align-items:center;gap:4px;border-radius:10px;background:rgba(245,158,11,0.08);font-weight:700;" title="إعادة تعيين كلمة المرور إلى 123456">
                              <i data-lucide="key" style="width:12px;height:12px;"></i> كلمة المرور (123456)
                            </button>
                            ` : ""}
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
            <img src="${(app.avatar && !app.avatar.includes('dicebear.com')) ? app.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" 
              alt="${app.name}" style="width:52px; height:52px; border-radius:50%; object-fit:cover; border:2px solid var(--border-color);">
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

  matchesStudentGrade(education, filter) {
    if (!filter || filter === "all") return true;
    const edu = String(education || "").toLowerCase().trim();
    if (filter === "unspecified") {
      return !edu || edu === "-" || edu === "null" || edu === "undefined";
    }
    if (!edu) return false;

    // Stage filters
    if (filter === "STAGE_PRIMARY") {
      return edu.includes("prim") || edu.includes("ابتدائ") || /grade\s*[1-6]\b/.test(edu) || /pri[_-]?[1-6]/.test(edu) || /^[1-6]\s*ابتدائي/.test(edu);
    }
    if (filter === "STAGE_PREPARATORY") {
      return edu.includes("prep") || edu.includes("إعداد") || edu.includes("اعداد") || edu.includes("متوسط") || edu.includes("bem") || /grade\s*[7-9]\b/.test(edu) || /prep[_-]?[1-3]/.test(edu) || /^[1-3]\s*إعدادي/.test(edu);
    }
    if (filter === "STAGE_SECONDARY") {
      return edu.includes("sec") || edu.includes("ثانو") || edu.includes("entlq") || edu.includes("bac") || edu.includes("بكالوريا") || /grade\s*(10|11|12)\b/.test(edu);
    }

    // Specific grades
    const normFilter = String(filter).toLowerCase().trim();
    if (normFilter === "grade 1 (primary)" || normFilter === "pri_1") {
      return edu.includes("grade 1") || edu.includes("pri_1") || edu.includes("1 ابتدائي") || edu.includes("أول ابتدائي") || edu.includes("الأول الابتدائي");
    }
    if (normFilter === "grade 2 (primary)" || normFilter === "pri_2") {
      return edu.includes("grade 2") || edu.includes("pri_2") || edu.includes("2 ابتدائي") || edu.includes("ثاني ابتدائي") || edu.includes("الثاني الابتدائي");
    }
    if (normFilter === "grade 3 (primary)" || normFilter === "pri_3") {
      return edu.includes("grade 3") || edu.includes("pri_3") || edu.includes("3 ابتدائي") || edu.includes("ثالث ابتدائي") || edu.includes("الثالث الابتدائي");
    }
    if (normFilter === "grade 4 (primary)" || normFilter === "pri_4") {
      return edu.includes("grade 4") || edu.includes("pri_4") || edu.includes("4 ابتدائي") || edu.includes("رابع ابتدائي") || edu.includes("الرابع الابتدائي");
    }
    if (normFilter === "grade 5 (primary)" || normFilter === "pri_5") {
      return edu.includes("grade 5") || edu.includes("pri_5") || edu.includes("5 ابتدائي") || edu.includes("خامس ابتدائي") || edu.includes("الخامس الابتدائي");
    }
    if (normFilter === "grade 6 (primary)" || normFilter === "pri_6") {
      return edu.includes("grade 6") || edu.includes("pri_6") || edu.includes("6 ابتدائي") || edu.includes("سادس ابتدائي") || edu.includes("السادس الابتدائي");
    }
    if (normFilter === "grade 7 (prep 1)" || normFilter === "prep_1") {
      return edu.includes("grade 7") || edu.includes("prep 1") || edu.includes("prep_1") || edu.includes("1 إعدادي") || edu.includes("أول إعدادي") || edu.includes("الأول الإعدادي") || edu.includes("7 متوسط");
    }
    if (normFilter === "grade 8 (prep 2)" || normFilter === "prep_2") {
      return edu.includes("grade 8") || edu.includes("prep 2") || edu.includes("prep_2") || edu.includes("2 إعدادي") || edu.includes("ثاني إعدادي") || edu.includes("الثاني الإعدادي") || edu.includes("8 متوسط");
    }
    if (normFilter === "grade 9 (prep 3 / bem)" || normFilter === "prep_3") {
      return edu.includes("grade 9") || edu.includes("prep 3") || edu.includes("prep_3") || edu.includes("3 إعدادي") || edu.includes("ثالث إعدادي") || edu.includes("الثالث الإعدادي") || edu.includes("9 متوسط") || edu.includes("bem");
    }
    if (normFilter === "entlq 1" || normFilter === "sec_1") {
      return edu.includes("entlq 1") || edu.includes("sec 1") || edu.includes("sec_1") || edu.includes("grade 10") || edu.includes("1ث") || edu.includes("أولى ثانوي") || edu.includes("الأول الثانوي");
    }
    if (normFilter === "entlq 2" || normFilter === "sec_2") {
      return edu.includes("entlq 2") || edu.includes("sec 2") || edu.includes("sec_2") || edu.includes("grade 11") || edu.includes("2ث") || edu.includes("ثانية ثانوي") || edu.includes("الثاني الثانوي");
    }
    if (normFilter === "entlq 3" || normFilter === "sec_3") {
      return edu.includes("entlq 3") || edu.includes("sec 3") || edu.includes("sec_3") || edu.includes("grade 12") || edu.includes("3ث") || edu.includes("ثالثة ثانوي") || edu.includes("الثالث الثانوي") || edu.includes("bac") || edu.includes("بكالوريا");
    }

    return edu === normFilter || edu.includes(normFilter) || normFilter.includes(edu);
  },

  matchesStudentStatus(u, statusFilter) {
    if (!statusFilter || statusFilter === "all") return true;
    const isPending = u.status === 'PENDING';
    const isBlocked = u.isBlocked || u.status === 'BLOCKED' || u.status === 'SUSPENDED';
    const isActive = (u.status === 'ACTIVE' || !u.status) && !u.isBlocked;

    if (statusFilter === "pending") return isPending;
    if (statusFilter === "active") return isActive;
    if (statusFilter === "blocked") return isBlocked;
    return true;
  },

  matchesStudentSearch(u, query) {
    if (!query) return true;
    const q = String(query).toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.parentPhone && u.parentPhone.toLowerCase().includes(q)) ||
      (u.location && u.location.toLowerCase().includes(q)) ||
      (u.education && u.education.toLowerCase().includes(q)) ||
      (u.notes && u.notes.toLowerCase().includes(q))
    );
  },

  formatStudentGrade(edu) {
    if (!edu) return "-";
    const str = String(edu).trim();
    const l = str.toLowerCase();
    if (l === "entlq 1" || l === "1ث" || l.includes("أولى ثانوي") || l.includes("sec 1")) return "الصف الأول الثانوي (انطلق 1)";
    if (l === "entlq 2" || l === "2ث" || l.includes("ثانية ثانوي") || l.includes("sec 2")) return "الصف الثاني الثانوي (انطلق 2)";
    if (l === "entlq 3" || l === "3ث" || l.includes("ثالثة ثانوي") || l.includes("sec 3") || l.includes("bac")) return "الصف الثالث الثانوي (انطلق 3 - BAC)";
    if (l.includes("grade 1") || l.includes("1 ابتدائي")) return "الصف الأول الابتدائي (Grade 1)";
    if (l.includes("grade 2") || l.includes("2 ابتدائي")) return "الصف الثاني الابتدائي (Grade 2)";
    if (l.includes("grade 3") || l.includes("3 ابتدائي")) return "الصف الثالث الابتدائي (Grade 3)";
    if (l.includes("grade 4") || l.includes("4 ابتدائي")) return "الصف الرابع الابتدائي (Grade 4)";
    if (l.includes("grade 5") || l.includes("5 ابتدائي")) return "الصف الخامس الابتدائي (Grade 5)";
    if (l.includes("grade 6") || l.includes("6 ابتدائي")) return "الصف السادس الابتدائي (Grade 6)";
    if (l.includes("grade 7") || l.includes("prep 1") || l.includes("1 إعدادي")) return "الصف الأول الإعدادي (Prep 1)";
    if (l.includes("grade 8") || l.includes("prep 2") || l.includes("2 إعدادي")) return "الصف الثاني الإعدادي (Prep 2)";
    if (l.includes("grade 9") || l.includes("prep 3") || l.includes("3 إعدادي") || l.includes("bem")) return "الصف الثالث الإعدادي (BEM)";
    return str;
  },

  getStudentGradeBadgeStyle(edu) {
    if (!edu) return { bg: "rgba(100,116,139,0.1)", color: "var(--text-muted)", border: "rgba(100,116,139,0.2)" };
    const l = String(edu).toLowerCase();
    if (l.includes("prim") || l.includes("ابتدائ") || /grade\s*[1-6]\b/.test(l)) {
      return { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" };
    }
    if (l.includes("prep") || l.includes("إعداد") || l.includes("اعداد") || l.includes("متوسط") || /grade\s*[7-9]\b/.test(l) || l.includes("bem")) {
      return { bg: "rgba(2,132,199,0.12)", color: "#0284c7", border: "rgba(2,132,199,0.25)" };
    }
    if (l.includes("sec") || l.includes("ثانو") || l.includes("entlq") || l.includes("bac")) {
      return { bg: "rgba(99,102,241,0.12)", color: "var(--primary)", border: "rgba(99,102,241,0.25)" };
    }
    return { bg: "rgba(99,102,241,0.12)", color: "var(--primary)", border: "rgba(99,102,241,0.25)" };
  },

  renderStudentsTab() {
    const allStudents = this.allMembers.filter(u => u.role === "student");
    const activeStatus = this.studentStatusFilter || "all";
    const activeGrade = this.studentGradeFilter || "all";
    const searchQuery = (this.studentSearchQuery || "").trim();

    // Counts within selected grade (or all if grade is 'all')
    const studentsInGrade = allStudents.filter(u => this.matchesStudentGrade(u.education, activeGrade));
    const pendingCount = studentsInGrade.filter(u => this.matchesStudentStatus(u, 'pending')).length;
    const blockedCount = studentsInGrade.filter(u => this.matchesStudentStatus(u, 'blocked')).length;
    const activeCount = studentsInGrade.filter(u => this.matchesStudentStatus(u, 'active')).length;

    // Filter students by Grade + Status + Search Query
    const students = allStudents.filter(u =>
      this.matchesStudentGrade(u.education, activeGrade) &&
      this.matchesStudentStatus(u, activeStatus) &&
      this.matchesStudentSearch(u, searchQuery)
    );

    // Collect any extra distinct custom education values present in students
    const customEducations = [...new Set(allStudents.map(s => s.education).filter(Boolean))]
      .filter(edu => !this.matchesStudentGrade(edu, "STAGE_PRIMARY") && !this.matchesStudentGrade(edu, "STAGE_PREPARATORY") && !this.matchesStudentGrade(edu, "STAGE_SECONDARY"));

    const hasActiveFilters = activeGrade !== "all" || activeStatus !== "all" || searchQuery !== "";

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:700;margin-bottom:4px;">${t("admin.tab.students")} (${allStudents.length})</h3>
          <p style="font-size:0.83rem;color:var(--text-muted);margin:0;">قائمة الطلاب المسجلين، مراجعة واعتماد طلبات التسجيل الجديدة، والتصفية حسب الصف والحالة</p>
        </div>
        ${state.user?.role === "admin" ? `
        <button class="btn-primary" id="open-create-student-btn" style="font-size:0.85rem;padding:10px 18px;background:var(--success);">
          <i data-lucide="user-plus"></i> ${t("admin.addStudent")}
        </button>
        ` : ""}
      </div>

      <!-- Quick Status Filter Pills with Counts -->
      <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; align-items:center;">
        <button class="filter-tab-btn student-filter-tab-btn ${activeStatus === 'all' ? 'active' : ''}" data-filter="all" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; cursor:pointer;">
          الكل (${studentsInGrade.length})
        </button>
        <button class="filter-tab-btn student-filter-tab-btn ${activeStatus === 'pending' ? 'active' : ''}" data-filter="pending" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; cursor:pointer; ${pendingCount > 0 ? 'background:rgba(245,158,11,0.15); color:#d97706; border-color:rgba(245,158,11,0.4);' : ''}">
          ⏳ بانتظار الاعتماد والموافقة (${pendingCount})
        </button>
        <button class="filter-tab-btn student-filter-tab-btn ${activeStatus === 'active' ? 'active' : ''}" data-filter="active" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; cursor:pointer;">
          ✅ النشطون (${activeCount})
        </button>
        <button class="filter-tab-btn student-filter-tab-btn ${activeStatus === 'blocked' ? 'active' : ''}" data-filter="blocked" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; cursor:pointer;">
          🚫 المحظورون (${blockedCount})
        </button>
      </div>

      <!-- Unified Filter & Search Toolbar (Grade & Status Filter) -->
      <div class="glass-card" style="padding:14px 18px; margin-bottom:20px; border-radius:16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; background:var(--bg-card); border:1px solid var(--border-color);">
        
        <!-- Search Input -->
        <div style="flex:1; min-width:230px; position:relative;">
          <i data-lucide="search" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--text-muted); pointer-events:none;"></i>
          <input type="text" id="students-search-input" value="${this.studentSearchQuery || ''}" class="form-input" placeholder="بحث بالاسم، البريد، الهاتف، أو الولاية..." style="width:100%; padding:9px 34px 9px 12px; font-size:0.85rem; border-radius:10px; background:var(--bg-main, transparent);">
        </div>

        <!-- Grade Filter Select -->
        <div style="display:flex; align-items:center; gap:6px;">
          <label for="student-grade-filter" style="font-size:0.82rem; font-weight:700; color:var(--text-muted); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            <i data-lucide="graduation-cap" style="width:15px; height:15px; color:var(--primary);"></i> الصف:
          </label>
          <select id="student-grade-filter" class="form-input" style="padding:8px 12px; font-size:0.85rem; border-radius:10px; min-width:190px; background:var(--bg-card); color:var(--text-main); font-weight:600; cursor:pointer;">
            <option value="all" ${activeGrade === 'all' ? 'selected' : ''}>🎓 جميع الصفوف والمراحل (الكل)</option>
            
            <optgroup label="── المراحل التعليمية الكاملة ──">
              <option value="STAGE_PRIMARY" ${activeGrade === 'STAGE_PRIMARY' ? 'selected' : ''}>🌱 المرحلة الابتدائية (جميع صفوف الابتدائي)</option>
              <option value="STAGE_PREPARATORY" ${activeGrade === 'STAGE_PREPARATORY' ? 'selected' : ''}>📘 المرحلة الإعدادية / المتوسطة (جميع صفوف الإعدادي)</option>
              <option value="STAGE_SECONDARY" ${activeGrade === 'STAGE_SECONDARY' ? 'selected' : ''}>🎓 المرحلة الثانوية (جميع صفوف الثانوي)</option>
            </optgroup>

            <optgroup label="── المرحلة الابتدائية (Primary) ──">
              <option value="Grade 1 (Primary)" ${activeGrade === 'Grade 1 (Primary)' ? 'selected' : ''}>الصف الأول الابتدائي (Grade 1)</option>
              <option value="Grade 2 (Primary)" ${activeGrade === 'Grade 2 (Primary)' ? 'selected' : ''}>الصف الثاني الابتدائي (Grade 2)</option>
              <option value="Grade 3 (Primary)" ${activeGrade === 'Grade 3 (Primary)' ? 'selected' : ''}>الصف الثالث الابتدائي (Grade 3)</option>
              <option value="Grade 4 (Primary)" ${activeGrade === 'Grade 4 (Primary)' ? 'selected' : ''}>الصف الرابع الابتدائي (Grade 4)</option>
              <option value="Grade 5 (Primary)" ${activeGrade === 'Grade 5 (Primary)' ? 'selected' : ''}>الصف الخامس الابتدائي (Grade 5)</option>
              <option value="Grade 6 (Primary)" ${activeGrade === 'Grade 6 (Primary)' ? 'selected' : ''}>الصف السادس الابتدائي (Grade 6)</option>
            </optgroup>

            <optgroup label="── المرحلة الإعدادية والمتوسطة (Prep) ──">
              <option value="Grade 7 (Prep 1)" ${activeGrade === 'Grade 7 (Prep 1)' ? 'selected' : ''}>الصف الأول الإعدادي (Grade 7)</option>
              <option value="Grade 8 (Prep 2)" ${activeGrade === 'Grade 8 (Prep 2)' ? 'selected' : ''}>الصف الثاني الإعدادي (Grade 8)</option>
              <option value="Grade 9 (Prep 3 / BEM)" ${activeGrade === 'Grade 9 (Prep 3 / BEM)' ? 'selected' : ''}>الصف الثالث الإعدادي (Grade 9 BEM)</option>
            </optgroup>

            <optgroup label="── المرحلة الثانوية والبكالوريا (Secondary) ──">
              <option value="Entlq 1" ${activeGrade === 'Entlq 1' ? 'selected' : ''}>الصف الأول الثانوي (انطلق 1 - Sec 1)</option>
              <option value="Entlq 2" ${activeGrade === 'Entlq 2' ? 'selected' : ''}>الصف الثاني الثانوي (انطلق 2 - Sec 2)</option>
              <option value="Entlq 3" ${activeGrade === 'Entlq 3' ? 'selected' : ''}>الصف الثالث الثانوي (انطلق 3 - BAC)</option>
            </optgroup>

            ${customEducations.length > 0 ? `
              <optgroup label="── صفوف وتصنيفات أخرى ──">
                ${customEducations.map(edu => `<option value="${edu}" ${activeGrade === edu ? 'selected' : ''}>${edu}</option>`).join('')}
              </optgroup>
            ` : ''}

            <option value="unspecified" ${activeGrade === 'unspecified' ? 'selected' : ''}>❓ غير محدد / بدون صف مسجل</option>
          </select>
        </div>

        <!-- Status Filter Select -->
        <div style="display:flex; align-items:center; gap:6px;">
          <label for="student-status-filter" style="font-size:0.82rem; font-weight:700; color:var(--text-muted); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            <i data-lucide="shield-check" style="width:15px; height:15px; color:var(--primary);"></i> الحالة:
          </label>
          <select id="student-status-filter" class="form-input" style="padding:8px 12px; font-size:0.85rem; border-radius:10px; min-width:160px; background:var(--bg-card); color:var(--text-main); font-weight:600; cursor:pointer;">
            <option value="all" ${activeStatus === 'all' ? 'selected' : ''}>جميع الحالات (الكل)</option>
            <option value="active" ${activeStatus === 'active' ? 'selected' : ''}>✅ نشط فقط (${activeCount})</option>
            <option value="pending" ${activeStatus === 'pending' ? 'selected' : ''}>⏳ معلق بانتظار الاعتماد (${pendingCount})</option>
            <option value="blocked" ${activeStatus === 'blocked' ? 'selected' : ''}>🚫 محظور فقط (${blockedCount})</option>
          </select>
        </div>

        <!-- Reset Filters Button -->
        ${hasActiveFilters ? `
        <button id="reset-student-filters-btn" class="btn-secondary" style="padding:8px 14px; font-size:0.82rem; border-radius:10px; display:inline-flex; align-items:center; gap:5px; font-weight:700; color:var(--text-muted); cursor:pointer;" title="إعادة تعيين جميع الفلاتر للوضع الافتراضي">
          <i data-lucide="rotate-ccw" style="width:13px; height:13px;"></i> إعادة ضبط
        </button>
        ` : ''}

        <!-- Results Counter Badge -->
        <div style="margin-inline-start:auto; font-size:0.82rem; font-weight:700; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <span>النتائج:</span>
          <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.8rem; padding:4px 10px; border-radius:8px; font-weight:800;">
            ${students.length} من أصل ${allStudents.length} طالب
          </span>
        </div>
      </div>

      ${students.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:48px 24px;color:var(--text-muted);border-radius:18px;">
            <div style="width:56px;height:56px;border-radius:18px;background:rgba(99,102,241,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <i data-lucide="search-x" style="width:28px;height:28px;"></i>
            </div>
            <h4 style="font-size:1.1rem;font-weight:800;color:var(--text-main);margin-bottom:6px;">لا توجد نتائج مطابقة</h4>
            <p style="font-size:0.85rem;max-width:440px;margin:0 auto 16px;line-height:1.6;">
              ${activeStatus === 'pending' && !hasActiveFilters
                ? 'لا توجد طلبات تسجيل طلاب معلقة حالياً.'
                : 'لم نتمكن من العثور على أي طلاب يطابقون معايير التصفية والبحث المحددة. يمكنك تعديل خيارات الصف الدراسي أو الحالة أو إعادة ضبط الفلاتر.'
              }
            </p>
            ${hasActiveFilters ? `
            <button id="empty-reset-filters-btn" class="btn-secondary" style="padding:8px 18px;font-size:0.85rem;border-radius:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;margin:0 auto;">
              <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> إعادة ضبط جميع الفلاتر
            </button>
            ` : ''}
          </div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;text-align:start;font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">${t("admin.col.name")}</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">البريد والتواصل</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">المستوى / الولاية</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">التواصل السريع</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">ملاحظات</th>
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

          const isPending = u.status === 'PENDING';
          const isBlocked = u.isBlocked || u.status === 'BLOCKED' || u.status === 'SUSPENDED';

          const gradeBadgeStyle = this.getStudentGradeBadgeStyle(u.education);
          const formattedGrade = this.formatStudentGrade(u.education);

          return `
                      <tr style="border-bottom:1px solid var(--border-color);${isPending ? 'background:rgba(245,158,11,0.04);' : (isBlocked ? 'background:rgba(239,68,68,0.03);' : '')}">
                        <td style="padding:14px 20px;">
                          <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${(u.avatar && !u.avatar.includes('dicebear.com')) ? u.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:38px;height:38px;border-radius:50%;object-fit:cover;${isBlocked ? 'filter:grayscale(60%);border:2px solid var(--error,#ef4444);' : ''}">
                            <div>
                              <div style="font-weight:700;font-size:0.9rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <span>${u.name}</span>
                                ${isPending
              ? `<span class="badge" style="background:rgba(245,158,11,0.15);color:#d97706;font-size:0.68rem;padding:2px 7px;border-radius:6px;font-weight:800;">⏳ بانتظار الموافقة والاعتماد</span>`
              : isBlocked
                ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:var(--error,#ef4444);font-size:0.68rem;padding:2px 6px;border-radius:6px;font-weight:800;">🚫 محظور من الدخول</span>`
                : `<span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.68rem;padding:2px 6px;border-radius:6px;font-weight:800;">✅ نشط</span>`
            }
                              </div>
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
                          ${u.education ? `
                            <span class="badge" style="background:${gradeBadgeStyle.bg}; color:${gradeBadgeStyle.color}; border:1px solid ${gradeBadgeStyle.border}; font-size:0.75rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:8px; margin-bottom:4px;">
                              <i data-lucide="graduation-cap" style="width:11px;height:11px;"></i> ${formattedGrade}
                            </span>
                          ` : '<span style="font-size:0.75rem;color:var(--text-muted);background:rgba(100,116,139,0.08);padding:2px 8px;border-radius:6px;display:inline-block;">غير محدد</span>'}
                          ${u.location ? `<div style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;gap:4px;margin-top:2px;"><i data-lucide="map-pin" style="width:11px;height:11px;"></i> ${u.location}</div>` : ''}
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
                          ${u.notes ? `
                            <div style="font-size:0.8rem; color:var(--text-main); background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:8px; padding:6px 10px; max-width:200px; white-space:pre-wrap; word-break:break-word; line-height:1.4;">
                              ${u.notes}
                            </div>
                          ` : `<span style="font-size:0.75rem;color:var(--text-muted);">-</span>`}
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                            <button class="btn-primary view-student-profile-btn" data-id="${u.id}" style="font-size:0.75rem;padding:5px 12px;background:linear-gradient(135deg,var(--primary),#7c3aed);color:#fff;border:none;display:inline-flex;align-items:center;gap:5px;font-weight:800;border-radius:10px;cursor:pointer;box-shadow:0 2px 8px rgba(99,102,241,0.25);" title="عرض الملف الأكاديمي والجدول الدراسي للطالب">
                              <i data-lucide="calendar" style="width:12px;height:12px;"></i> الملف والجدول 👤
                            </button>
                            ${state.user?.role === "admin" ? `
                            ${isPending ? `
                              <button class="btn-primary approve-student-btn" data-id="${u.id}" data-name="${u.name}" style="font-size:0.75rem;padding:5px 12px;background:linear-gradient(135deg, #10b981, #059669);border:none;display:inline-flex;align-items:center;gap:4px;font-weight:800;border-radius:10px;cursor:pointer;box-shadow:0 2px 6px rgba(16,185,129,0.3);" title="الموافقة على تسجيل الطالب وتفعيل حسابه">
                                <i data-lucide="check-circle" style="width:12px;height:12px;"></i> موافقة وتفعيل ✅
                              </button>
                            ` : `
                              <button class="btn-secondary toggle-block-btn" data-id="${u.id}" data-name="${u.name}" data-role="student" data-blocked="${isBlocked ? 'true' : 'false'}" style="font-size:0.75rem;padding:5px 10px;border-color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:${isBlocked ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};" title="${isBlocked ? 'إلغاء حظر الطالب والسماح له بتسجيل الدخول' : 'حظر الطالب ومنعه من تسجيل الدخول إلى الأكاديمية'}">
                                <i data-lucide="${isBlocked ? 'check-circle' : 'shield-alert'}" style="width:12px;height:12px;"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر الطالب'}
                              </button>
                            `}
                            <button class="btn-secondary edit-member-btn" data-id="${u.id}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="edit" style="width:12px;height:12px;"></i> تعديل
                            </button>
                            <button class="btn-secondary reset-user-pwd-btn" data-id="${u.id}" data-name="${u.name}" style="font-size:0.75rem;padding:5px 10px;border-color:#f59e0b;color:#d97706;display:inline-flex;align-items:center;gap:4px;border-radius:10px;background:rgba(245,158,11,0.08);font-weight:700;" title="إعادة تعيين كلمة المرور إلى 123456">
                              <i data-lucide="key" style="width:12px;height:12px;"></i> كلمة المرور (123456)
                            </button>
                            ` : ""}
                            <button class="btn-secondary view-transcript-btn" data-id="${u.id}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--info);color:var(--info);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="file-text" style="width:12px;height:12px;"></i> السجل
                            </button>
                            ${state.user?.role === "admin" ? `
                            <button class="btn-secondary delete-user-btn" data-id="${u.id}" data-name="${u.name}" data-role="${u.role}" style="font-size:0.75rem;padding:5px 10px;border-color:var(--error,#ef4444);color:var(--error,#ef4444);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="trash-2" style="width:12px;height:12px;"></i> حذف
                            </button>
                            ` : ""}
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
        ${state.user?.role === "admin" ? `
        <button class="btn-primary" id="open-create-member-btn" style="font-size:0.85rem;padding:10px 18px;">
          <i data-lucide="user-plus"></i> ${t("admin.addMember")}
        </button>
        ` : ""}
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
                  <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">ملاحظات</th>
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
    } else if (user.role === "supervisor") {
      roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(14,165,233,0.15);color:#0ea5e9;">🛡️ مشرف</span>`;
    } else if (user.role === "parent") {
      roleBadge = `<span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(139,92,246,0.15);color:#8b5cf6;">👨‍👩‍👧 ولي أمر</span>`;
    }

    const isBlocked = user.isBlocked || user.status === 'BLOCKED' || user.status === 'SUSPENDED';

    return `
      <tr style="border-bottom:1px solid var(--border-color);${isBlocked ? 'background:rgba(239,68,68,0.03);' : ''}">
        <td style="padding:14px 20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${(user.avatar && !user.avatar.includes('dicebear.com')) ? user.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;${isBlocked ? 'filter:grayscale(60%);border:2px solid var(--error,#ef4444);' : ''}">
            <div>
              <div style="font-weight:600;font-size:0.9rem;">${user.name}</div>
              ${isBlocked ? `<span style="padding:1px 6px;border-radius:6px;font-size:0.68rem;font-weight:800;background:rgba(239,68,68,0.15);color:var(--error,#ef4444);display:inline-block;margin-top:2px;">🚫 محظور من الدخول</span>` : ''}
            </div>
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
        <td style="padding:14px 20px;">
          ${roleBadge}
        </td>
        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">${joinDate}</td>
        <td style="padding:14px 20px;">
          ${user.notes ? `
            <div style="font-size:0.8rem; color:var(--text-main); background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:8px; padding:6px 10px; max-width:180px; white-space:pre-wrap; word-break:break-word; line-height:1.4;">
              ${user.notes}
            </div>
          ` : `<span style="font-size:0.75rem;color:var(--text-muted);">-</span>`}
        </td>
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
            ${state.user?.role === "admin" && !isMe ? `
              <button class="btn-secondary toggle-block-btn" data-id="${user.id}" data-name="${user.name}" data-role="${user.role}" data-blocked="${isBlocked ? 'true' : 'false'}" style="font-size:0.75rem;padding:6px 10px;border-color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};display:inline-flex;align-items:center;gap:4px;font-weight:700;border-radius:10px;background:${isBlocked ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};" title="${isBlocked ? 'إلغاء حظر الحساب والسماح له بالدخول' : 'حظر الحساب ومنعه من تسجيل الدخول'}">
                <i data-lucide="${isBlocked ? 'check-circle' : 'shield-alert'}" style="width:12px;height:12px;"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر الحساب'}
              </button>
            ` : ''}
            ${state.user?.role === "admin" ? `
            <button class="btn-secondary edit-member-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
              <i data-lucide="edit" style="width:12px;height:12px;"></i> ${t("admin.editMember")}
            </button>
            <button class="btn-secondary reset-user-pwd-btn" data-id="${user.id}" data-name="${user.name}" style="font-size:0.75rem;padding:6px 10px;border-color:#f59e0b;color:#d97706;display:inline-flex;align-items:center;gap:4px;border-radius:10px;background:rgba(245,158,11,0.08);font-weight:700;" title="إعادة تعيين كلمة المرور إلى 123456">
              <i data-lucide="key" style="width:12px;height:12px;"></i> كلمة المرور (123456)
            </button>
            ` : ''}
            <button class="btn-secondary view-transcript-btn" data-id="${user.id}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--info);color:var(--info);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
              <i data-lucide="file-text" style="width:12px;height:12px;"></i> ${t("admin.viewTranscript")}
            </button>
            ${state.user?.role === "admin" ? (!isMe ? `
              <button class="btn-secondary delete-user-btn" data-id="${user.id}" data-name="${user.name}" data-role="${user.role}" style="font-size:0.75rem;padding:6px 10px;border-color:var(--error,#ef4444);color:var(--error,#ef4444);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i> ${t("common.delete")}
              </button>` : `<span style="font-size:0.75rem;color:var(--text-muted);">${t("admin.you")}</span>`) : ''}
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
    const currentAvatar = (user && user.avatar && !user.avatar.includes('dicebear.com'))
      ? user.avatar
      : 'assets/logo.png';

    container.innerHTML = `
      <div class="modal-overlay" id="member-modal" style="display:flex; padding:16px;">
        <div class="modal-content" style="max-width:600px; max-height:88vh; overflow-y:auto; border-radius:20px;">
          <div class="modal-header" style="padding:14px 20px;">
            <h3 class="modal-title" style="font-size:1.15rem;">${isEdit ? t("admin.editMember") : t("admin.addMember")}</h3>
            <span class="modal-close-btn" id="close-member-modal">&times;</span>
          </div>
          <form id="member-form">
            <div class="modal-body" style="padding:18px 20px; display:flex; flex-direction:column; gap:12px;">

              <!-- Avatar / Profile Photo Section -->
              <div style="display:flex; align-items:center; gap:16px; padding:12px 14px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px;">
                <div style="position:relative; width:64px; height:64px; flex-shrink:0;">
                  <img id="member-avatar-preview" src="${currentAvatar}" alt="Profile Avatar" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:var(--bg-card); box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                  <div id="member-avatar-loading" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.5); border-radius:50%; align-items:center; justify-content:center; color:#fff; font-size:12px;">⏳</div>
                </div>
                <input type="hidden" id="member-avatar-url" value="${currentAvatar}">
                <input type="file" id="member-avatar-file-input" accept="image/*" style="display:none;">
                <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                  <label style="font-size:0.85rem; font-weight:800; color:var(--text-main); margin:0;">
                    صورة الملف الشخصي (Profile Photo)
                  </label>
                  <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                    <label for="member-avatar-file-input" class="btn-primary" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin:0;">
                      <i data-lucide="upload" style="width:14px; height:14px;"></i>
                      <span>رفع صورة</span>
                    </label>
                    <button type="button" id="member-random-avatar-btn" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="shield" style="width:14px; height:14px;"></i>
                      <span>شعار المنصة الافتراضي</span>
                    </button>
                    <span id="member-avatar-status" style="font-size:0.78rem; font-weight:600; color:var(--text-muted);"></span>
                  </div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label for="member-name" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">${t("form.fullName")}</label>
                  <input type="text" id="member-name" class="form-input" value="${isEdit ? user.name : ''}" placeholder="${t("form.fullNamePlaceholder")}" required style="padding:8px 12px; font-size:0.88rem;">
                </div>
                <div class="form-group" style="margin:0;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <label for="member-email" style="font-size:0.85rem; font-weight:700; margin:0;">${t("form.email")}</label>
                    <button type="button" id="member-auto-email-btn" title="توليد بريد إلكتروني تلقائي باللغة الإنجليزية (@entlq.com)" style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); color:var(--primary); font-size:0.75rem; font-weight:700; border-radius:6px; padding:2px 8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s;">
                      <span>✨ توليد تلقائي (@entlq.com)</span>
                    </button>
                  </div>
                  <input type="email" id="member-email" class="form-input" value="${isEdit ? user.email : ''}" placeholder="username@entlq.com" required style="padding:8px 12px; font-size:0.88rem;" dir="ltr">
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
                <div class="form-group" id="student-education-group" style="margin:0; display:${initialRole === 'student' ? 'block' : 'none'};">
                  <label for="member-education" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">المرحلة والصف الدراسي المقيد به الطالب</label>
                  ${renderEducationSelectHTML({ id: "member-education", selectedValue: isEdit && user.role === 'student' ? (user.education || "Entlq 3") : "Entlq 3", style: "padding:8px 12px; font-size:0.88rem;" })}
                </div>
                <div class="form-group" id="teacher-education-group" style="margin:0; display:${initialRole === 'teacher' ? 'block' : 'none'};">
                  <label for="member-teacher-education" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">المؤهل والتخصص الأكاديمي للمعلم</label>
                  <input type="text" id="member-teacher-education" class="form-input" value="${isEdit && user.role === 'teacher' ? (user.education || '') : ''}" placeholder="مثال: أستاذ تعليم ثانوي مادة الفيزياء - خبرة 10 سنوات" style="padding:8px 12px; font-size:0.88rem;">
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

              <!-- Account Access & Login Status (Admin Only) -->
              <div style="background:${(user && (user.isBlocked || user.status === 'BLOCKED' || user.status === 'SUSPENDED')) ? 'rgba(239,68,68,0.06)' : 'var(--bg-app)'}; border:1px solid ${(user && (user.isBlocked || user.status === 'BLOCKED' || user.status === 'SUSPENDED')) ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}; border-radius:12px; padding:12px 14px; margin-top:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div>
                    <label for="member-status-select" style="font-size:0.85rem; font-weight:800; color:var(--text-main); margin:0; display:block;">
                      صلاحية الدخول وحالة الحساب (Login Access)
                    </label>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:2px 0 0 0;">
                      التحكم في إمكانية تسجيل دخول المعلم أو الطالب للأكاديمية
                    </p>
                  </div>
                  <select id="member-status-select" class="form-select" style="width:auto; min-width:180px; padding:6px 12px; font-size:0.84rem; font-weight:700;">
                    <option value="ACTIVE" ${(!user || (!user.isBlocked && user.status !== 'BLOCKED' && user.status !== 'SUSPENDED')) ? 'selected' : ''}>✅ نشط ومسموح بالدخول</option>
                    <option value="BLOCKED" ${(user && (user.isBlocked || user.status === 'BLOCKED' || user.status === 'SUSPENDED')) ? 'selected' : ''}>🚫 محظور من تسجيل الدخول</option>
                  </select>
                </div>
                <div id="member-block-reason-group" style="display:${(user && (user.isBlocked || user.status === 'BLOCKED' || user.status === 'SUSPENDED')) ? 'block' : 'none'}; margin-top:10px;">
                  <label for="member-block-reason" style="font-size:0.8rem; font-weight:700; color:var(--error,#ef4444); margin-bottom:4px; display:block;">
                    سبب الحظر (ملاحظة تظهر للمستخدم عند محاولة تسجيل الدخول):
                  </label>
                  <input type="text" id="member-block-reason" class="form-input" value="${user?.blockReason || ''}" placeholder="مثال: مخالفة شروط الاستخدام أو تعليق الحساب مؤقتاً" style="padding:6px 10px; font-size:0.82rem;">
                </div>
              </div>

              <!-- Admin Notes -->
              <div class="form-group" style="margin:0;">
                <label for="member-notes" style="font-size:0.85rem; font-weight:700; margin-bottom:4px; display:block;">
                  📝 ملاحظات الإدارة (Admin Notes)
                </label>
                <textarea id="member-notes" class="form-input" rows="2" placeholder="أدخل أي ملاحظات خاصة بالطالب أو المعلم (مرئية للإدارة فقط)..." style="padding:8px 12px; font-size:0.88rem; width:100%; resize:vertical;">${isEdit ? (user.notes || '') : ''}</textarea>
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

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };

    document.getElementById("close-member-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-member-modal")?.addEventListener("click", closeModal);

    // Avatar upload handler
    const avatarFileInput = document.getElementById("member-avatar-file-input");
    avatarFileInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const preview = document.getElementById("member-avatar-preview");
      const urlInput = document.getElementById("member-avatar-url");
      const loading = document.getElementById("member-avatar-loading");
      const status = document.getElementById("member-avatar-status");

      // Show immediate local preview
      const reader = new FileReader();
      reader.onload = (re) => {
        if (preview && re.target?.result) preview.src = re.target.result;
      };
      reader.readAsDataURL(file);

      if (loading) loading.style.display = "flex";
      if (status) {
        status.style.color = "var(--primary)";
        status.textContent = "جاري رفع الصورة...";
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: formData
        });
        if (!res.ok) throw new Error("فشل رفع الصورة");
        const json = await res.json();
        const uploadedUrl = json.url || json.path || json.filename;
        if (uploadedUrl) {
          if (urlInput) urlInput.value = uploadedUrl;
          if (preview) preview.src = uploadedUrl;
          if (status) {
            status.style.color = "#10b981";
            status.textContent = "✅ تم رفع الصورة بنجاح";
          }
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
        if (status) {
          status.style.color = "#ef4444";
          status.textContent = "❌ فشل الرفع";
        }
      } finally {
        if (loading) loading.style.display = "none";
      }
    });

    // Reset to platform default logo
    document.getElementById("member-random-avatar-btn")?.addEventListener("click", () => {
      const preview = document.getElementById("member-avatar-preview");
      const urlInput = document.getElementById("member-avatar-url");
      const status = document.getElementById("member-avatar-status");
      const newAvatar = "assets/logo.png";
      if (preview) preview.src = newAvatar;
      if (urlInput) urlInput.value = newAvatar;
      if (status) {
        status.style.color = "#10b981";
        status.textContent = "✨ تم تعيين شعار المنصة الافتراضي";
      }
    });

    // Auto-generate English email ending with @entlq.com based on user's name
    const memberNameInput = document.getElementById("member-name");
    const memberEmailInput = document.getElementById("member-email");
    const memberAutoEmailBtn = document.getElementById("member-auto-email-btn");
    let isEmailManuallyEdited = isEdit && Boolean(user?.email);

    memberEmailInput?.addEventListener("input", () => {
      isEmailManuallyEdited = memberEmailInput.value.trim().length > 0;
    });

    memberNameInput?.addEventListener("input", () => {
      if (!isEmailManuallyEdited) {
        const generated = generateEntlqEmail(memberNameInput.value);
        if (generated && memberEmailInput) {
          memberEmailInput.value = generated;
        }
      }
    });

    memberAutoEmailBtn?.addEventListener("click", () => {
      const generated = generateEntlqEmail(memberNameInput?.value || "");
      if (generated && memberEmailInput) {
        memberEmailInput.value = generated;
        isEmailManuallyEdited = false;
        showToast("✨ تم توليد البريد الإلكتروني بنجاح (@entlq.com)", "info");
      } else {
        showToast("يرجى إدخال اسم العضو أولاً لتوليد البريد الإلكتروني", "warning");
        memberNameInput?.focus();
      }
    });

    document.getElementById("member-role")?.addEventListener("change", (e) => {
      const selectedRole = e.target.value;
      const capGroup = document.getElementById("teacher-capabilities-group");
      if (capGroup) capGroup.style.display = selectedRole === "teacher" ? "block" : "none";
      const parentPhoneGroup = document.getElementById("parent-phone-group");
      if (parentPhoneGroup) parentPhoneGroup.style.display = selectedRole === "student" ? "block" : "none";
      const studentEduGroup = document.getElementById("student-education-group");
      if (studentEduGroup) studentEduGroup.style.display = selectedRole === "student" ? "block" : "none";
      const teacherEduGroup = document.getElementById("teacher-education-group");
      if (teacherEduGroup) teacherEduGroup.style.display = selectedRole === "teacher" ? "block" : "none";
    });

    document.getElementById("member-status-select")?.addEventListener("change", (e) => {
      const isBlocked = e.target.value === "BLOCKED";
      const reasonGroup = document.getElementById("member-block-reason-group");
      if (reasonGroup) {
        reasonGroup.style.display = isBlocked ? "block" : "none";
      }
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

      const education = role === "teacher"
        ? (document.getElementById("member-teacher-education")?.value.trim() || "")
        : (document.getElementById("member-education")?.value || "");
      const hourlyRate = parseFloat(document.getElementById("member-hourly-rate")?.value) || 150;
      const meetingLink = document.getElementById("member-meeting-link")?.value.trim() || "";
      const avatar = document.getElementById("member-avatar-url")?.value?.trim() || undefined;

      const isBlocked = document.getElementById("member-status-select")?.value === "BLOCKED";
      const blockReason = isBlocked ? (document.getElementById("member-block-reason")?.value.trim() || undefined) : undefined;
      const status = isBlocked ? "BLOCKED" : "ACTIVE";
      const notes = document.getElementById("member-notes")?.value?.trim() || "";

      const teacherCapabilities = [];
      if (role === "teacher") {
        if (document.getElementById("cap-course")?.checked) teacherCapabilities.push("COURSE_INSTRUCTOR");
        if (document.getElementById("cap-session")?.checked) teacherCapabilities.push("SESSION_TEACHER");
      }

      try {
        if (isEdit) {
          await apiFetch(`/admin/users/${user.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink, teacherCapabilities, avatar, isBlocked, blockReason, status, notes })
          });
          showToast(t("admin.toast.userUpdated") || "تم تحديث بيانات العضو بنجاح! ✅", "success");
        } else {
          const res = await apiFetch("/admin/users", {
            method: "POST",
            body: JSON.stringify({ name, email, role, password, phone, parentPhone, education, hourlyRate, meetingLink, teacherCapabilities, avatar, isBlocked, blockReason, status, notes })
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
    const isParent = user.role === "parent";
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
    ] : isParent ? [
      {
        id: "p1",
        label: "👨‍👩‍👧 تقرير ومتابعة دراسية",
        text: `السلام عليكم ولي أمر الطالب المحترم (${user.name})، نتواصل معكم من إدارة منصة انطلق لنحيطكم علماً بالتقرير الأكاديمي والتقدم الدراسي ومستوى التفاعل لأبنائكم على المنصة. نسعد دائماً بتواصلكم معنا.`
      },
      {
        id: "p2",
        label: "⏰ تذكير بمواعيد الحصص",
        text: `السلام عليكم ولي أمر الطالب المحترم (${user.name})، نود تذكيركم بموعد الحصة التفاعلية المباشرة القادمة لابنكم، يرجى التكرم بتشجيعه على الحضور في الموعد المحدد.`
      },
      {
        id: "p3",
        label: "📝 إشعار الواجبات والامتحانات",
        text: `السلام عليكم ولي أمر الطالب المحترم (${user.name})، نلفت عنايتكم الكريمة إلى إضافة واجبات وتدريبات جديدة لأبنائكم على المنصة، يرجى متابعة تسليمها في الموعد.`
      },
      {
        id: "p4",
        label: "✍️ رسالة مخصصة",
        text: `السلام عليكم ولي أمر الطالب المحترم (${user.name})، `
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
                <h3 class="modal-title" style="font-size:1.1rem; margin:0 0 2px 0;">تواصل مع ${isTeacher ? 'المعلم' : isParent ? 'ولي الأمر' : 'الطالب'}: ${user.name}</h3>
                <span style="font-size:0.75rem; color:var(--text-muted);">${user.email}</span>
              </div>
            </div>
            <span class="modal-close-btn" id="close-communicate-modal">&times;</span>
          </div>

          <div class="modal-body" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
            
            <!-- Target Selector if Student has both phones -->
            ${!isTeacher && !isParent && user.parentPhone && user.phone ? `
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
  },

  // ── Supervisors Tab ───────────────────────────────────────────────────────────

  renderSupervisorsTab() {
    const supervisors = this.allSupervisors || [];

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="font-weight:700;margin-bottom:4px;">🛡️ المشرفون (${supervisors.length})</h3>
          <p style="font-size:0.83rem;color:var(--text-muted);margin:0;">إضافة وإدارة حسابات المشرفين — يملكون صلاحية الإشراف على المنصة ومتابعة الطلاب والمعلمين</p>
        </div>
        <button class="btn-primary" id="open-create-supervisor-btn" style="font-size:0.85rem;padding:10px 18px;display:inline-flex;align-items:center;gap:6px;">
          <i data-lucide="user-plus"></i> إضافة مشرف جديد
        </button>
      </div>

      <!-- Info Banner -->
      <div style="background:linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.08));border:1px solid rgba(14,165,233,0.25);border-radius:16px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:1.4rem;flex-shrink:0;">🛡️</span>
        <div>
          <div style="font-weight:700;font-size:0.92rem;margin-bottom:4px;color:var(--text-color);">دور المشرف (Supervisor)</div>
          <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.6;">
            المشرف هو دور وسيط بين المسؤول والمعلم. يمكنه متابعة الطلاب، مراجعة الحصص والتقارير، والتواصل مع الأعضاء. لا يملك صلاحيات الحذف أو تعديل إعدادات المنصة.
          </div>
        </div>
      </div>

      ${supervisors.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:56px 40px;color:var(--text-muted);">
            <div style="font-size:3rem;margin-bottom:16px;">🛡️</div>
            <h4 style="font-weight:700;margin-bottom:8px;color:var(--text-color);">لا يوجد مشرفون حتى الآن</h4>
            <p style="font-size:0.85rem;">انقر على "إضافة مشرف جديد" لإنشاء أول حساب مشرف على المنصة</p>
           </div>`
        : `<div class="glass-card" style="overflow:hidden;padding:0;">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;text-align:start;font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-card);border-bottom:1px solid var(--border-color);">
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">المشرف</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">البريد والتواصل</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">الحالة</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">ملاحظات</th>
                    <th style="padding:14px 20px;text-align:start;font-size:0.8rem;font-weight:700;color:var(--text-muted);">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${supervisors.map(u => {
                    const isBlocked = u.isBlocked || u.status === 'BLOCKED' || u.status === 'SUSPENDED';
                    const joinDate = new Date(u.createdAt).toLocaleDateString('ar-EG');
                    const cleanPhone = u.phone ? getCleanWhatsAppNumber(u.phone) : '';
                    return `
                      <tr style="border-bottom:1px solid var(--border-color);${isBlocked ? 'background:rgba(239,68,68,0.03);' : ''}">
                        <td style="padding:14px 20px;">
                          <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${(u.avatar && !u.avatar.includes('dicebear.com')) ? u.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(14,165,233,0.3);${isBlocked ? 'filter:grayscale(60%);border-color:var(--error,#ef4444);' : ''}">
                            <div>
                              <div style="font-weight:700;font-size:0.9rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <span>${u.name}</span>
                                <span style="background:rgba(14,165,233,0.12);color:#0ea5e9;font-size:0.68rem;padding:2px 8px;border-radius:6px;font-weight:800;">🛡️ مشرف</span>
                                ${isBlocked ? `<span style="background:rgba(239,68,68,0.15);color:var(--error,#ef4444);font-size:0.68rem;padding:2px 7px;border-radius:6px;font-weight:800;">🚫 محظور</span>` : ''}
                              </div>
                              ${u.education ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">🎓 ${u.education}</div>` : ''}
                              <div style="font-size:0.75rem;color:#0ea5e9;font-weight:600;margin-top:1px;">انضمام: ${joinDate}</div>
                            </div>
                          </div>
                        </td>
                        <td style="padding:14px 20px;color:var(--text-muted);font-size:0.85rem;">
                          <div><a href="mailto:${u.email}" style="color:var(--text-color);text-decoration:none;display:inline-flex;align-items:center;gap:5px;font-weight:600;">${u.email}</a></div>
                          ${cleanPhone ? `
                            <div style="margin-top:4px;">
                              <a href="https://wa.me/${cleanPhone}" target="_blank" style="color:#10b981;font-size:0.8rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.08);padding:3px 8px;border-radius:8px;text-decoration:none;">
                                <i data-lucide="message-circle" style="width:12px;height:12px;"></i> ${u.phone}
                              </a>
                            </div>
                          ` : `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">بدون هاتف مسجل</div>`}
                        </td>
                        <td style="padding:14px 20px;">
                          ${isBlocked
                            ? `<span style="background:rgba(239,68,68,0.12);color:var(--error,#ef4444);font-size:0.78rem;font-weight:700;padding:4px 12px;border-radius:12px;">🚫 محظور من الدخول</span>`
                            : `<span style="background:rgba(16,185,129,0.12);color:#10b981;font-size:0.78rem;font-weight:700;padding:4px 12px;border-radius:12px;">✅ نشط</span>`
                          }
                        </td>
                        <td style="padding:14px 20px;">
                          ${u.notes ? `
                            <div style="font-size:0.8rem;color:var(--text-main);background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:8px;padding:6px 10px;max-width:200px;white-space:pre-wrap;word-break:break-word;line-height:1.4;">${u.notes}</div>
                          ` : `<span style="font-size:0.75rem;color:var(--text-muted);">-</span>`}
                        </td>
                        <td style="padding:14px 20px;">
                          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                            <button class="btn-secondary toggle-block-btn" data-id="${u.id}" data-name="${u.name}" data-role="supervisor" data-blocked="${isBlocked ? 'true' : 'false'}" style="font-size:0.75rem;padding:6px 11px;border-color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};color:${isBlocked ? '#10b981' : 'var(--error,#ef4444)'};display:inline-flex;align-items:center;gap:4px;border-radius:10px;background:${isBlocked ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};font-weight:700;" title="${isBlocked ? 'إلغاء الحظر' : 'حظر المشرف'}">
                              <i data-lucide="${isBlocked ? 'check-circle' : 'shield-alert'}" style="width:12px;height:12px;"></i> ${isBlocked ? 'إلغاء الحظر' : 'حظر المشرف'}
                            </button>
                            <button class="btn-secondary edit-supervisor-btn" data-id="${u.id}" style="font-size:0.75rem;padding:6px 11px;border-color:var(--border-color);color:var(--text-color);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="edit" style="width:12px;height:12px;"></i> تعديل
                            </button>
                            <button class="btn-secondary reset-user-pwd-btn" data-id="${u.id}" data-name="${u.name}" style="font-size:0.75rem;padding:6px 11px;border-color:#f59e0b;color:#d97706;display:inline-flex;align-items:center;gap:4px;border-radius:10px;background:rgba(245,158,11,0.08);font-weight:700;" title="إعادة تعيين كلمة المرور إلى 123456">
                              <i data-lucide="key" style="width:12px;height:12px;"></i> كلمة المرور (123456)
                            </button>
                            <button class="btn-secondary delete-supervisor-btn" data-id="${u.id}" data-name="${u.name}" style="font-size:0.75rem;padding:6px 11px;border-color:var(--error,#ef4444);color:var(--error,#ef4444);display:inline-flex;align-items:center;gap:4px;border-radius:10px;">
                              <i data-lucide="trash-2" style="width:12px;height:12px;"></i> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>`
      }
    `;
  },

  // Open supervisor create/edit modal
  renderSupervisorModal(supervisor = null) {
    const isEdit = !!supervisor;
    const u = supervisor || {};
    const modalId = 'supervisor-modal-wrapper';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.id = modalId;
    wrapper.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    wrapper.innerHTML = `
      <div style="background:var(--bg-card);border-radius:20px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.35);padding:28px 28px 24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="font-weight:800;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
            <span style="background:linear-gradient(135deg,#0ea5e9,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">🛡️ ${isEdit ? 'تعديل بيانات المشرف' : 'إضافة مشرف جديد'}</span>
          </h3>
          <button id="close-supervisor-modal-btn" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.4rem;line-height:1;">×</button>
        </div>
        <form id="supervisor-form" autocomplete="off" style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">الاسم الكامل *</label>
              <input id="sup-name" type="text" class="form-input" value="${u.name || ''}" placeholder="اسم المشرف" required style="padding:9px 12px;font-size:0.88rem;border-radius:10px;width:100%;">
            </div>
            <div>
              <label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">البريد الإلكتروني *</label>
              <input id="sup-email" type="email" class="form-input" value="${u.email || ''}" placeholder="example@email.com" required style="padding:9px 12px;font-size:0.88rem;border-radius:10px;width:100%;" ${isEdit ? 'dir="ltr"' : ''}>
            </div>
          </div>
          ${!isEdit ? `
            <div>
              <label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">كلمة المرور *</label>
              <input id="sup-password" type="password" class="form-input" placeholder="كلمة المرور (6 أحرف على الأقل)" required minlength="6" style="padding:9px 12px;font-size:0.88rem;border-radius:10px;width:100%;direction:ltr;">
            </div>
          ` : ''}
          <div>
            <label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">رقم الهاتف / واتساب</label>
            <input id="sup-phone" type="tel" class="form-input" value="${u.phone || ''}" placeholder="05xxxxxxxx" style="padding:9px 12px;font-size:0.88rem;border-radius:10px;width:100%;direction:ltr;">
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">المؤهل العلمي / التخصص</label>
            <input id="sup-education" type="text" class="form-input" value="${u.education || ''}" placeholder="مثال: بكالوريوس إدارة أعمال" style="padding:9px 12px;font-size:0.88rem;border-radius:10px;width:100%;">
          </div>
          <div>
            <label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">ملاحظات (مرئية للإدارة فقط)</label>
            <textarea id="sup-notes" class="form-input" rows="3" placeholder="أي ملاحظات خاصة بالمشرف..." style="padding:9px 12px;font-size:0.88rem;border-radius:10px;width:100%;resize:vertical;">${isEdit ? (u.notes || '') : ''}</textarea>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px;">
            <button type="button" id="cancel-supervisor-modal-btn" class="btn-secondary" style="padding:9px 20px;border-radius:12px;">إلغاء</button>
            <button type="submit" id="save-supervisor-btn" class="btn-primary" style="padding:9px 24px;border-radius:12px;font-weight:800;">
              ${isEdit ? '💾 حفظ التعديلات' : '🛡️ إضافة المشرف'}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(wrapper);

    const closeModal = () => wrapper.remove();
    wrapper.querySelector('#close-supervisor-modal-btn')?.addEventListener('click', closeModal);
    wrapper.querySelector('#cancel-supervisor-modal-btn')?.addEventListener('click', closeModal);
    wrapper.addEventListener('click', (e) => { if (e.target === wrapper) closeModal(); });

    wrapper.querySelector('#supervisor-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('sup-name')?.value.trim();
      const email = document.getElementById('sup-email')?.value.trim();
      const password = document.getElementById('sup-password')?.value;
      const phone = document.getElementById('sup-phone')?.value.trim() || null;
      const education = document.getElementById('sup-education')?.value.trim() || null;
      const notes = document.getElementById('sup-notes')?.value.trim() || null;

      if (!name || !email) { showToast('الاسم والبريد الإلكتروني مطلوبان', 'error'); return; }
      if (!isEdit && (!password || password.length < 6)) { showToast('كلمة المرور يجب أن لا تقل عن 6 أحرف', 'error'); return; }

      const saveBtn = document.getElementById('save-supervisor-btn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'جارٍ الحفظ...'; }

      try {
        const body = { name, email, role: 'supervisor', phone, education, notes };
        if (!isEdit) body.password = password;

        const url = isEdit ? `/admin/users/${u.id}` : '/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await apiFetch(url, { method, body: JSON.stringify(body) });
        showToast(res.message || (isEdit ? 'تم تحديث بيانات المشرف بنجاح' : 'تم إضافة المشرف بنجاح 🛡️'), 'success');
        closeModal();
        await this.loadAllData();
        this.renderTab('supervisors');
      } catch (err) {
        showToast(err.message || 'فشل حفظ بيانات المشرف', 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = isEdit ? '💾 حفظ التعديلات' : '🛡️ إضافة المشرف'; }
      }
    });
  },

  bindSupervisorsEvents() {
    // Create Supervisor
    this.container.querySelector('#open-create-supervisor-btn')?.addEventListener('click', () => {
      this.renderSupervisorModal(null);
    });

    // Edit Supervisor
    this.container.querySelectorAll('.edit-supervisor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const sup = (this.allSupervisors || []).find(s => s.id === id);
        if (sup) this.renderSupervisorModal(sup);
      });
    });

    // Delete Supervisor
    this.container.querySelectorAll('.delete-supervisor-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const confirmed = await confirmDialog({
          title: `حذف حساب المشرف "${name}" ⚠️`,
          message: `هل أنت متأكد من رغبتك في حذف حساب المشرف "${name}" نهائياً من المنصة؟`,
          confirmText: 'نعم، حذف المشرف',
          cancelText: 'إلغاء',
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
          showToast(res.message || 'تم حذف المشرف بنجاح', 'success');
          await this.loadAllData();
          this.renderTab('supervisors');
        } catch (err) {
          showToast(err.message || 'فشل حذف المشرف', 'error');
          btn.disabled = false;
        }
      });
    });
  },

};
