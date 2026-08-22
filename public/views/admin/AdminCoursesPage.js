import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminCoursesPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminCoursesPage = {

  renderCoursesTab() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-weight:700;">${t("admin.tab.courses")} (${this.courses.length})</h3>
        <button class="btn-primary" id="open-admin-add-course-modal-btn" style="padding:10px 18px; font-weight:800; gap:8px;">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة دورة تعليمية جديدة ➕
        </button>
      </div>

      ${this.courses.length === 0
        ? `<div class="glass-card" style="text-align:center;padding:40px;color:var(--text-muted);">${t("admin.noCourses")}</div>`
        : `<div style="display:flex;flex-direction:column;gap:16px;">
            ${this.courses.map(course => {
          const coursePlansCount = (this.allPlans || []).filter(p => p.courseId === course.id || p.course?.id === course.id).length;
          const isPending = course.status === "PENDING_REVIEW";
          const isPublished = course.status === "PUBLISHED" || !course.status;

          return `
              <div class="glass-card" style="display:flex;align-items:center;gap:20px;padding:16px 20px; ${isPending ? 'border:1px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.03);' : ''}">
                <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}"
                  style="width:72px;height:72px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                    <span style="font-size:0.7rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${course.category}</span>
                    <span class="badge" style="background:rgba(139,92,246,0.12); color:#8b5cf6; font-size:0.7rem; font-weight:800;">${coursePlansCount} خطط اشتراك مخصصة</span>
                    ${isPending ? `
                      <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.72rem; font-weight:800;">🟡 قيد المراجعة والاعتماد (PENDING_REVIEW) ⏳</span>
                    ` : isPublished ? `
                      <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.72rem; font-weight:800;">منشورة ومتاحة ✅</span>
                    ` : `
                      <span class="badge" style="background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.72rem; font-weight:800;">مرفوضة / مسودة ❌</span>
                    `}
                  </div>
                  <h4 style="font-weight:700;font-size:1rem;margin-bottom:6px;">${course.title}</h4>
                  <div style="display:flex;gap:20px;font-size:0.8rem;color:var(--text-muted);flex-wrap:wrap;">
                    <span><i data-lucide="user" style="width:12px;height:12px;"></i> ${course.teacher?.name || "منصة باكالوريا التعليمية 🏛️"}</span>
                    <span><i data-lucide="book" style="width:12px;height:12px;"></i> ${course.lessonsCount || 0} ${t("admin.lessons")}</span>
                    <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${course.enrollmentsCount || 0} ${t("admin.enrolled")}</span>
                  </div>
                </div>
                <div style="display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap;">
                  ${isPending ? `
                    <button class="btn-primary admin-approve-course-btn" data-id="${course.id}"
                      style="font-size:0.8rem; padding:8px 14px; gap:6px; background:#10b981; border-color:#10b981; font-weight:800;">
                      <i data-lucide="check-circle" style="width:14px;height:14px;"></i> قبول واعتماد النشر 🎉
                    </button>
                    <button class="btn-secondary admin-reject-course-btn" data-id="${course.id}"
                      style="font-size:0.8rem; padding:8px 14px; gap:6px; color:#ef4444; border-color:#ef4444; font-weight:700;">
                      <i data-lucide="x-circle" style="width:14px;height:14px;"></i> رفض ❌
                    </button>
                  ` : ''}
                  <a href="#manage-course/${course.id}" class="btn-primary"
                    style="font-size:0.8rem; padding:8px 14px; gap:6px; background:#8b5cf6; border-color:#8b5cf6; text-decoration:none; display:inline-flex; align-items:center; font-weight:800;">
                    <i data-lucide="book-open" style="width:14px;height:14px;"></i> إضافة وإدارة الدروس والوحدات 📚
                  </a>
                  <button class="btn-primary admin-view-course-details-btn" data-id="${course.id}"
                    style="font-size:0.8rem; padding:8px 14px; gap:6px;">
                    <i data-lucide="eye" style="width:14px;height:14px;"></i> تفاصيل الكورس والاشتراكات 🔍
                  </button>
                  <button class="btn-secondary delete-course-btn" data-id="${course.id}" data-title="${course.title}"
                    style="font-size:0.8rem; padding:8px 14px; border-color:var(--error, #ef4444); color:var(--error, #ef4444);">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i> ${t("common.delete")}
                  </button>
                </div>
              </div>
            `;
        }).join("")}
          </div>`
      }
    `;
  },

  renderEnrollmentsTab() {
    const enrollments = this.enrollments || [];
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-weight:800; font-size:1.3rem;">🎓 طلبات وتسجيلات الكورسات (${enrollments.length})</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; margin:0;">مراجعة واعتماد طلبات التحويل وتسجيل الطلاب في جميع الكورسات</p>
        </div>
      </div>

      ${enrollments.length === 0 ? `
        <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد طلبات تسجيل في الكورسات حالياً.</div>
      ` : `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:start;">
            <thead>
              <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); font-size:0.82rem; color:var(--text-muted);">
                <th style="padding:14px 16px;">الطالب</th>
                <th style="padding:14px 16px;">الدورة التعليمية</th>
                <th style="padding:14px 16px;">إيصال التحويل والدفع</th>
                <th style="padding:14px 16px;">الحالة</th>
                <th style="padding:14px 16px;">تاريخ الطلب</th>
                <th style="padding:14px 16px;">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${enrollments.map(e => {
      const stMap = {
        'active': { label: 'مقبول ونشط ✅', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
        'rejected': { label: 'مرفوض ❌', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        'PENDING': { label: 'في انتظار الاعتماد ⏳', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
      };
      const st = stMap[e.status] || { label: e.status, bg: 'rgba(99,102,241,0.15)', color: 'var(--primary)' };
      const receiptUrl = e.payment?.receiptUrl;

      return `
                  <tr style="border-bottom:1px solid var(--border-color); font-size:0.88rem;">
                    <td style="padding:14px 16px;">
                      <div style="font-weight:700; color:var(--text-main);">${e.student?.name || 'طالب'}</div>
                      <div style="font-size:0.78rem; color:var(--text-muted);">${e.student?.email || ''}</div>
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="font-weight:700;">${e.course?.title || 'دورة'}</div>
                      <div style="font-size:0.78rem; color:var(--primary);">${e.course?.category || ''}</div>
                    </td>
                    <td style="padding:14px 16px;">
                      ${receiptUrl ? `
                        <a href="${receiptUrl}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary);">
                          <i data-lucide="file-text" style="width:12px;height:12px;"></i> عرض إيصال التحويل 📄
                        </a>
                      ` : `
                        <span style="font-size:0.78rem; color:var(--text-muted);">لا يوجد إيصال مرفق</span>
                      `}
                    </td>
                    <td style="padding:14px 16px;">
                      <span style="font-size:0.78rem; font-weight:800; padding:4px 10px; border-radius:14px; background:${st.bg}; color:${st.color};">
                        ${st.label}
                      </span>
                    </td>
                    <td style="padding:14px 16px; font-size:0.8rem; color:var(--text-muted);">
                      ${new Date(e.createdAt).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style="padding:14px 16px;">
                      <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${e.status !== 'active' ? `
                          <button class="btn-primary admin-approve-enrollment-btn" data-id="${e.id}" style="padding:6px 12px; font-size:0.78rem; background:#10b981; border-color:#10b981; font-weight:800;">
                            <i data-lucide="check" style="width:14px;height:14px;"></i> قبول واعتماد ✅
                          </button>
                        ` : ''}
                        ${e.status !== 'rejected' ? `
                          <button class="btn-secondary admin-reject-enrollment-btn" data-id="${e.id}" style="padding:6px 12px; font-size:0.78rem; color:#ef4444; border-color:#ef4444; font-weight:700;">
                            <i data-lucide="x" style="width:14px;height:14px;"></i> رفض ❌
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  updateAddCourseModalTeachers() {
    const selectEl = document.getElementById("admin-course-teacher-id");
    if (!selectEl) return;
    const teachers = (this.allMembers || []).filter(m => m.role === "teacher");
    selectEl.innerHTML = `
      <option value="">🏛️ دورة عامة على المنصة (بدون معلم خاص)</option>
      ${teachers.map(t => `<option value="${t.id}">${t.name} (${t.email})</option>`).join('')}
    `;
  },

  renderAddCourseModal() {
    const categories = this.categories || [];
    return `
      <div class="modal-overlay" id="admin-course-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:650px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
          <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:46px; height:46px; border-radius:14px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                <i data-lucide="book-plus" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h3 class="modal-title" style="font-size:1.2rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">إضافة دورة تعليمية جديدة للمنصة ➕</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">أدخل تفاصيل الدورة، القسم المعني، السنة الدراسية والمعلم المسؤول</p>
              </div>
            </div>
            <span class="modal-close-btn" id="close-admin-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <form id="admin-course-form">
            <div class="modal-body" style="padding:24px 28px; display:flex; flex-direction:column; gap:18px;">
              
              <!-- Course Title -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                  عنوان الدورة التعليمية <span style="color:var(--error);">*</span>
                </label>
                <input type="text" id="admin-course-title" class="form-input" placeholder="مثال: الدورة الشاملة في الرياضيات - ثانوية عامة" style="border-radius:14px; padding:12px 16px; font-size:0.9rem;" required>
              </div>

              <!-- Category & Degree Grid -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <!-- Category Select -->
                <div class="form-group" style="margin:0;">
                  <label for="admin-course-category-select" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="layers" style="width:14px; height:14px; color:#a855f7;"></i>
                    التخصص / المادة <span style="color:var(--error);">*</span>
                  </label>
                  <select id="admin-course-category-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;" required>
                    <option value="">-- اختر التخصص / المادة الدراسية --</option>
                    <optgroup label="📚 المواد والدراسات الأساسية">
                      <option value="الرياضيات">الرياضيات (Mathematics)</option>
                      <option value="الفيزياء">الفيزياء (Physics)</option>
                      <option value="الكيمياء">الكيمياء (Chemistry)</option>
                      <option value="الأحياء">الأحياء (Biology)</option>
                      <option value="العلوم العامة">العلوم العامة (Science)</option>
                      <option value="اللغة العربية">اللغة العربية (Arabic)</option>
                      <option value="اللغة الإنجليزية">اللغة الإنجليزية (English)</option>
                      <option value="اللغة الفرنسية">اللغة الفرنسية (French)</option>
                      <option value="التاريخ">التاريخ (History)</option>
                      <option value="الجغرافيا">الجغرافيا (Geography)</option>
                      <option value="الفلسفة والمنطق">الفلسفة والمنطق (Philosophy)</option>
                      <option value="الحاسب الآلي والبرمجة">الحاسب الآلي وتكنولوجيا المعلومات (IT)</option>
                      <option value="الاقتصاد والإحصاء">الاقتصاد والإحصاء (Economics)</option>
                    </optgroup>
                    ${categories.length > 0 ? `
                      <optgroup label="🗂️ التصنيفات المعتمدة بالمنصة">
                        ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                      </optgroup>
                    ` : ''}
                    <optgroup label="✏️ إضافة تخصيص">
                      <option value="__custom__">+ كتابة تخصص / مادة جديدة مخصصة</option>
                    </optgroup>
                  </select>
                  <div id="admin-course-category-custom-wrapper" style="display:none; margin-top:10px;">
                    <input type="text" id="admin-course-category-custom" class="form-input" placeholder="أدخل اسم التخصص أو المادة الجديدة..." style="border-radius:12px; padding:10px 14px; font-size:0.88rem; width:100%; border:1px solid var(--primary);">
                  </div>
                </div>

                <!-- Degree Select -->
                <div class="form-group" style="margin:0;">
                  <label for="admin-course-degree" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="graduation-cap" style="width:14px; height:14px; color:#10b981;"></i>
                    السنة الدراسية / المستوى <span style="color:var(--error);">*</span>
                  </label>
                  <select id="admin-course-degree" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;" required>
                    <option value="">-- اختر المستوى --</option>
                    <optgroup label="🌱 المرحلة الابتدائية (Primary)">
                      <option value="الابتدائية - الصف الأول">الصف الأول الابتدائي (Primary 1)</option>
                      <option value="الابتدائية - الصف الثاني">الصف الثاني الابتدائي (Primary 2)</option>
                      <option value="الابتدائية - الصف الثالث">الصف الثالث الابتدائي (Primary 3)</option>
                      <option value="الابتدائية - الصف الرابع">الصف الرابع الابتدائي (Primary 4)</option>
                      <option value="الابتدائية - الصف الخامس">الصف الخامس الابتدائي (Primary 5)</option>
                      <option value="الابتدائية - الصف السادس">الصف السادس الابتدائي (Primary 6)</option>
                    </optgroup>
                    <optgroup label="📘 المرحلة الإعدادية (Prep)">
                      <option value="الإعدادية - الصف الأول">الصف الأول الإعدادي (Prep 1)</option>
                      <option value="الإعدادية - الصف الثاني">الصف الثاني الإعدادي (Prep 2)</option>
                      <option value="الإعدادية - الصف الثالث">الصف الثالث الإعدادي - الشهادة الإعدادية (Prep 3)</option>
                    </optgroup>
                    <optgroup label="🎓 المرحلة الثانوية (Secondary)">
                      <option value="الثانوية - الصف الأول">الصف الأول الثانوي (1st Secondary)</option>
                      <option value="الثانوية - الصف الثاني (علمي)">الصف الثاني الثانوي - علمي</option>
                      <option value="الثانوية - الصف الثاني (أدبي)">الصف الثاني الثانوي - أدبي</option>
                      <option value="الثانوية - الصف الثالث (علمي علوم)">الصف الثالث الثانوي - علمي علوم</option>
                      <option value="الثانوية - الصف الثالث (علمي رياضة)">الصف الثالث الثانوي - علمي رياضة</option>
                      <option value="الثانوية - الصف الثالث (أدبي)">الصف الثالث الثانوي - أدبي</option>
                      <option value="الثانوية الأزهرية">الثانوية الأزهرية</option>
                    </optgroup>
                    <optgroup label="🌟 عام وتأسيس (General)">
                      <option value="جميع المراحل والصفوف">جميع المراحل والصفوف (All Grades)</option>
                      <option value="تأسيس ودورات عامة">تأسيس ودورات تدريبية عامة (Foundation)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- Teacher Selection -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-teacher-id" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="user-check" style="width:14px; height:14px; color:var(--primary);"></i>
                  المعلم المسؤول عن الدورة (اختياري للدورات العامة)
                </label>
                <select id="admin-course-teacher-id" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem;">
                  <option value="">🏛️ دورة عامة على المنصة (بدون معلم خاص)</option>
                  ${(this.allMembers || []).filter(m => m.role === 'teacher').map(t => `<option value="${t.id}">${t.name} (${t.email})</option>`).join('')}
                </select>
              </div>

              <!-- Course Description -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-desc" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="file-text" style="width:14px; height:14px; color:var(--text-muted);"></i>
                  وصف ومحتويات الدورة
                </label>
                <textarea id="admin-course-desc" class="form-input" style="height:90px; resize:none; border-radius:14px; padding:12px 16px; font-size:0.88rem; line-height:1.5;" placeholder="أدخل تفاصيل ومحاور المنهج التعليمي والدورة..." required></textarea>
              </div>

              <!-- Course Image Upload -->
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                  <span style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="image" style="width:14px; height:14px; color:#f59e0b;"></i>
                    غلاف / صورة الدورة
                  </span>
                  <button type="button" id="admin-toggle-url-input-btn" style="background:none; border:none; color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;">
                    أو أدخل رابط صورة مباشرة 🔗
                  </button>
                </label>

                <div id="admin-course-dropzone" style="border:2px dashed var(--border-color); border-radius:16px; padding:18px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s ease;">
                  <input type="file" id="admin-course-image-file" accept="image/*" style="display:none;">

                  <div id="admin-image-upload-idle">
                    <button type="button" class="btn-secondary" id="admin-btn-trigger-upload" style="padding:8px 20px; border-radius:30px; font-size:0.85rem; margin:0 auto; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i> اختيار صورة غلاف الدورة
                    </button>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:8px 0 0 0;">الصغار المقبولة: JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت)</p>
                  </div>

                  <div id="admin-image-upload-loading" style="display:none; padding:10px; color:var(--primary); font-weight:700; font-size:0.88rem;">
                    <i data-lucide="loader" class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-inline-end:6px;"></i> جاري رفع الصورة...
                  </div>

                  <div id="admin-image-preview-wrapper" style="display:none; text-align:center;">
                    <div style="position:relative; display:inline-block;">
                      <img id="admin-course-preview-img" src="" style="max-height:130px; border-radius:12px; object-fit:cover; border:2px solid var(--primary); box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                      <button type="button" id="admin-remove-course-image-btn" title="حذف الصورة" style="position:absolute; top:-8px; right:-8px; background:var(--error,#ef4444); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✕</button>
                    </div>
                    <p style="font-size:0.78rem; color:var(--success,#10b981); font-weight:800; margin:6px 0 0 0;">✓ تم اختيار ورفع غلاف الدورة بنجاح</p>
                  </div>
                </div>

                <div id="admin-url-input-wrapper" style="display:none; margin-top:10px;">
                  <input type="url" id="admin-course-image-url-direct" class="form-input" placeholder="https://example.com/course-cover.jpg" style="border-radius:12px; padding:10px 14px; font-size:0.85rem;">
                </div>

                <input type="hidden" id="admin-course-image">
              </div>

              <!-- Static Meeting Link -->
              <div class="form-group" style="margin:0;">
                <label for="admin-course-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="video" style="width:14px; height:14px; color:#06b6d4;"></i>
                  🔗 رابط البث المباشر الثابت (Zoom / Meet / Webex)
                </label>
                <input type="url" id="admin-course-meeting-link" class="form-input" placeholder="https://meet.google.com/abc-defg-hij" style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
              </div>

            </div>

            <div class="modal-footer" style="padding:16px 28px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:12px;">
              <button type="button" class="btn-secondary" id="cancel-admin-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
              <button type="submit" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#0056D2,#a855f7); border:none;">
                <i data-lucide="check-circle-2" style="width:16px; height:16px; vertical-align:middle;"></i> إنشاء ونشر الدورة للمنصة 🎉
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  // ── 4.5 Groups Management Tab ────────────────────────────────────────────────

  renderCourseDetailsModal(course) {
    const modalId = 'course-details-modal-overlay';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const coursePlans = (this.allPlans || []).filter(p => p.courseId === course.id || p.course?.id === course.id);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:850px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
        <!-- Header -->
        <div style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.1), rgba(168,85,247,0.1)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=80&auto=format'}" style="width:56px; height:56px; border-radius:14px; object-fit:cover; border:2px solid var(--primary);">
            <div>
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.75rem; font-weight:800;">${course.category || 'عام'}</span>
                ${course.degree ? `<span class="badge" style="background:rgba(139,92,246,0.15); color:#8b5cf6; font-size:0.75rem; font-weight:800;">${course.degree}</span>` : ''}
              </div>
              <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">${course.title}</h3>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <a href="#manage-course/${course.id}" class="btn-primary" style="font-size:0.82rem; padding:8px 16px; background:#8b5cf6; border-color:#8b5cf6; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800; border-radius:12px;">
              <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> إضافة وإدارة دروس المنهج 📚
            </a>
            <span id="close-course-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:24px; background:var(--bg-app); max-height:75vh; overflow-y:auto; font-size:0.9rem;">
          
          <!-- Quick Stats Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:24px;">
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">👨‍🏫 المعلم المسؤول</div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-top:2px;">${course.teacher?.name || 'غير محدد'}</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">📖 عدد الدروس</div>
              <div style="font-size:0.95rem; font-weight:800; color:var(--primary); margin-top:2px;">${course.lessonsCount || 0} درس</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">👥 الطلاب المسجلين</div>
              <div style="font-size:0.95rem; font-weight:800; color:#10b981; margin-top:2px;">${course.enrollmentsCount || 0} طالب</div>
            </div>
            <div style="background:var(--bg-card); padding:12px 16px; border-radius:14px; border:1px solid var(--border-color);">
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">💎 خطط الاشتراكات</div>
              <div style="font-size:0.95rem; font-weight:800; color:#8b5cf6; margin-top:2px;">${coursePlans.length} خطة شهرية</div>
            </div>
          </div>

          <!-- Description -->
          <div style="background:var(--bg-card); padding:18px; border-radius:16px; border:1px solid var(--border-color); margin-bottom:24px;">
            <h4 style="font-weight:800; margin:0 0 8px 0; color:var(--text-main); font-size:0.95rem;">📝 وصف الدورة التدريبية:</h4>
            <p style="color:var(--text-muted); margin:0; line-height:1.6; font-size:0.88rem;">${course.description || 'لا يوجد وصف مضاف حتى الآن.'}</p>
            ${course.meetingLink ? `
              <div style="margin-top:12px; font-size:0.82rem; font-weight:700;">
                <span>🔗 رابط القاعة المباشرة:</span>
                <a href="${course.meetingLink}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none; margin-inline-start:6px;">${course.meetingLink}</a>
              </div>
            ` : ''}
          </div>

          <!-- Section: Subscription Plans -->
          <div style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <h4 style="font-weight:800; margin:0; color:var(--text-main); font-size:1rem; display:flex; align-items:center; gap:6px;">
                ✨ خطط الاشتراكات الشهرية المخصصة لهذا الكورس (${coursePlans.length})
              </h4>
              <button id="modal-add-course-plan-btn" class="btn-primary" style="padding:6px 14px; font-size:0.8rem; border-radius:10px; gap:6px;">
                <i data-lucide="plus-circle" style="width:14px;height:14px;"></i> إضافة خطة جديدة للكورس 🚀
              </button>
            </div>

            ${coursePlans.length === 0 ? `
              <div style="background:var(--bg-card); text-align:center; padding:30px; border-radius:16px; border:1px dashed var(--border-color); color:var(--text-muted);">
                <i data-lucide="sparkles" style="width:32px; height:32px; opacity:0.3; margin-bottom:8px;"></i>
                <p style="margin:0 0 10px 0; font-size:0.85rem;">لا توجد خطط اشتراكات شهرية مخصصة لهذا الكورس حتى الآن.</p>
                <button id="modal-add-course-plan-btn-2" class="btn-secondary" style="font-size:0.8rem; padding:6px 12px; border-color:var(--primary); color:var(--primary); font-weight:700;">
                  أنشئ أول خطة مخصصة للكورس الآن
                </button>
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px;">
                ${coursePlans.map(p => `
                  <div style="background:var(--bg-card); padding:16px; border-radius:14px; border:2px solid ${p.isActive ? 'var(--primary)' : 'var(--border-color)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <h5 style="font-weight:800; margin:0; font-size:0.95rem;">${p.name}</h5>
                      <span style="font-size:1.1rem; font-weight:900; color:var(--primary);">${p.price} ${p.currency}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px; min-height:28px;">${p.description || ''}</p>
                    <div style="font-size:0.75rem; color:var(--text-main); font-weight:700; margin-bottom:12px; display:flex; gap:10px;">
                      <span>📅 ${p.sessionsCount} حصة</span>
                      <span>⏱️ ${p.durationDays} يوم</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                      <button class="btn-secondary modal-edit-plan-btn" data-id="${p.id}" style="flex:1; padding:4px; font-size:0.75rem; border-color:var(--primary); color:var(--primary);">تعديل</button>
                      <button class="btn-secondary modal-toggle-plan-btn" data-id="${p.id}" data-active="${p.isActive}" style="flex:1; padding:4px; font-size:0.75rem;">${p.isActive ? 'إلغاء' : 'تفعيل'}</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Lessons List -->
          ${course.lessons && course.lessons.length > 0 ? `
            <div>
              <h4 style="font-weight:800; margin:0 0 12px 0; color:var(--text-main); font-size:1rem;">📚 دروس الدورة المتاحة (${course.lessons.length}):</h4>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${course.lessons.map((lesson, i) => `
                  <div style="background:var(--bg-card); padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="font-weight:800; font-size:0.8rem; color:var(--primary); width:20px;">#${i + 1}</span>
                      <span style="font-weight:700; color:var(--text-main); font-size:0.85rem;">${lesson.title}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px; font-size:0.78rem; color:var(--text-muted);">
                      ${lesson.duration ? `<span>⏱️ ${lesson.duration} دقيقة</span>` : ''}
                      ${lesson.isFree ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.7rem; font-weight:800;">مجاني</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('close-course-modal')?.addEventListener('click', () => overlay.remove());

    const openAddPlanForCourse = () => {
      overlay.remove();
      this.renderPlanModal({ courseId: course.id, course: course });
    };

    document.getElementById('modal-add-course-plan-btn')?.addEventListener('click', openAddPlanForCourse);
    document.getElementById('modal-add-course-plan-btn-2')?.addEventListener('click', openAddPlanForCourse);

    overlay.querySelectorAll('.modal-edit-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const plan = (this.allPlans || []).find(p => p.id === id);
        overlay.remove();
        if (plan) this.renderPlanModal(plan);
      });
    });

    overlay.querySelectorAll('.modal-toggle-plan-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const active = e.currentTarget.getAttribute('data-active') === 'true';
        try {
          await apiFetch(`/subscription-plans/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: !active })
          });
          showToast('تم تحديث حالة الخطة! ✅', 'success');
          overlay.remove();
          await this.loadAllData();
          this.renderTab('courses');
        } catch (err) {
          showToast(err.message || 'فشل تحديث الخطة.', 'error');
        }
      });
    });
  }

  // ── 12. Subscription Plans Tab ────────────────────────────────────────────────

};
