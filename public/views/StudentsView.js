import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse } from "../app.js";

export default class StudentsView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.students = [];
    this.searchQuery = "";
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1440px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px;">
        
        <!-- Header & Action Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 class="dashboard-section-title" style="font-size:1.8rem; margin:0 0 6px 0; display:flex; align-items:center; gap:10px;">
              <i data-lucide="users" style="color:var(--primary);"></i> ${t("nav.teacher.students") || "إدارة الطلاب المسجلين"}
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">عرض وتصفية وإدارة جميع الطلاب المسجلين بدوراتك بشكل تفاعلي</p>
          </div>
          
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <!-- Search Bar -->
            <div style="position:relative; min-width:260px;">
              <i data-lucide="search" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
              <input type="text" id="students-search-input" class="form-input" placeholder="بحث بالاسم، الإيميل أو الهاتف..." style="padding:10px 40px 10px 14px; font-size:0.88rem; border-radius:30px; background:var(--bg-card);">
            </div>

            <button class="btn-primary" id="open-add-student-modal-btn" style="padding:10px 22px; font-weight:800; font-size:0.88rem; border-radius:30px; display:inline-flex; align-items:center; gap:8px;">
              <i data-lucide="user-plus"></i> إضافة طالب جديد
            </button>
          </div>
        </div>

        <!-- Metric Stat Cards -->
        <div id="students-metrics-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
          <div class="glass-card" style="padding:18px 22px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center;">
              <i data-lucide="users" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">إجمالي الطلاب</div>
              <div id="stat-total-students" style="font-size:1.4rem; font-weight:900; color:var(--text-main);">0</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px 22px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="book-open-check" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">الاشتراكات النشطة</div>
              <div id="stat-active-enrollments" style="font-size:1.4rem; font-weight:900; color:var(--text-main);">0</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px 22px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="phone-call" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">أرقام تفاعلية (واتساب)</div>
              <div id="stat-phone-students" style="font-size:1.4rem; font-weight:900; color:var(--text-main);">0</div>
            </div>
          </div>
        </div>

        <!-- Main Data Table Container -->
        <div class="glass-card" style="padding:0; border-radius:20px; overflow:hidden; border:1px solid var(--border-color);">
          <div id="students-table-wrapper" style="overflow-x:auto;">
            <div style="text-align:center; padding:60px 20px;">
              <i data-lucide="loader" class="spinner" style="width:36px; height:36px; border-width:3px; margin:0 auto;"></i>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-top:12px;">جاري تحميل جدول الطلاب...</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Add Student Modal Container -->
      <div id="add-student-modal-wrapper"></div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindGlobalEvents();
    await this.loadStudents();
  }

  bindGlobalEvents() {
    this.container.querySelector("#open-add-student-modal-btn")?.addEventListener("click", () => {
      this.renderAddStudentModal();
    });

    const searchInput = this.container.querySelector("#students-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderStudentsTable();
    });
  }

  async loadStudents() {
    try {
      if (!state.user || (state.user.role !== "teacher" && state.user.role !== "admin")) {
        showToast("يرجى تسجيل الدخول بحساب معلم لمشاهدة الطلاب.", "error");
        window.location.hash = "#login";
        return;
      }

      this.students = await apiFetch("/users/students");
      this.courses = await apiFetch("/courses").catch(() => []);

      this.updateMetrics();
      this.renderStudentsTable();

    } catch (error) {
      console.error("Error loading students:", error);
      const wrapper = this.container.querySelector("#students-table-wrapper");
      if (wrapper) {
        wrapper.innerHTML = `<div style="text-align:center; color:var(--error); padding:50px; font-weight:700;">حدث خطأ أثناء تحميل جدول الطلاب: ${error.message || 'يرجى إعادت التحميل.'}</div>`;
      }
    }
  }

  updateMetrics() {
    const totalStudents = this.students.length;
    let activeEnrollments = 0;
    let phoneCount = 0;

    this.students.forEach(s => {
      if (s.phone) phoneCount++;
      if (s.enrollments) {
        activeEnrollments += s.enrollments.filter(e => e.status === "active").length;
      }
    });

    const totalEl = this.container.querySelector("#stat-total-students");
    const activeEl = this.container.querySelector("#stat-active-enrollments");
    const phoneEl = this.container.querySelector("#stat-phone-students");

    if (totalEl) totalEl.textContent = totalStudents;
    if (activeEl) activeEl.textContent = activeEnrollments;
    if (phoneEl) phoneEl.textContent = phoneCount;
  }

  getFilteredStudents() {
    if (!this.searchQuery) return this.students;
    const q = this.searchQuery;
    return this.students.filter(s => {
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const phoneMatch = s.phone?.toLowerCase().includes(q);
      const locationMatch = s.location?.toLowerCase().includes(q);
      const courseMatch = s.enrollments?.some(e => e.course?.title?.toLowerCase().includes(q));
      return nameMatch || emailMatch || phoneMatch || locationMatch || courseMatch;
    });
  }

  renderStudentsTable() {
    const wrapper = this.container.querySelector("#students-table-wrapper");
    if (!wrapper) return;

    const filtered = this.getFilteredStudents();

    if (filtered.length === 0) {
      wrapper.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:60px 20px;">
          <i data-lucide="users" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
          <p style="font-size:1.05rem; font-weight:700; margin-bottom:12px;">${this.searchQuery ? "لا توجد نتائج تطابق البحث" : "لا يوجد طلاب مسجلون حتى الآن"}</p>
          <button class="btn-primary" id="empty-add-student-btn" style="font-size:0.88rem; padding:8px 20px; border-radius:30px;">
            <i data-lucide="user-plus"></i> إضافة طالب الآن
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      wrapper.querySelector("#empty-add-student-btn")?.addEventListener("click", () => this.renderAddStudentModal());
      return;
    }

    const rowsHTML = filtered.map((student, idx) => this.renderTableRow(student, idx)).join("");

    wrapper.innerHTML = `
      <table style="width:100%; border-collapse:collapse; text-align:start; font-size:0.88rem;">
        <thead>
          <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">
            <th style="padding:14px 20px; font-weight:800;">الطالب</th>
            <th style="padding:14px 16px; font-weight:800;">المستوى والمنطقة</th>
            <th style="padding:14px 16px; font-weight:800;">الدورات وحالة الاشتراك</th>
            <th style="padding:14px 16px; font-weight:800; text-align:center;">التواصل السريع</th>
            <th style="padding:14px 20px; font-weight:800; text-align:end;">الإجراءات</th>
          </tr>
        </thead>
        <tbody style="divide-y:1px solid var(--border-color);">
          ${rowsHTML}
        </tbody>
      </table>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindTableEvents();
  }

  renderTableRow(student, idx) {
    const rawPhone = student.phone || '';
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const cleanPhoneWa = getCleanWhatsAppNumber(rawPhone);

    const rawParentPhone = student.parentPhone || '';
    const cleanParentPhoneWa = getCleanWhatsAppNumber(rawParentPhone);

    // Render course badges and toggle ban
    let coursesContent = '<span style="color:var(--text-muted); font-size:0.8rem;">غير مسجل بدورات</span>';
    if (student.enrollments && student.enrollments.length > 0) {
      coursesContent = student.enrollments.map(enroll => {
        if (!enroll || !enroll.course) return '';
        const isBanned = enroll.status === "banned";
        return `
          <div style="display:inline-flex; align-items:center; gap:8px; background:var(--bg-app); border:1px solid ${isBanned ? 'var(--error)' : 'var(--border-color)'}; padding:4px 10px; border-radius:20px; font-size:0.8rem; margin:2px 0;">
            <span style="font-weight:700; color:${isBanned ? 'var(--error)' : 'var(--text-main)'};">
              📖 ${enroll.course.title}
            </span>
            ${isBanned ? `<span style="background:var(--error); color:#fff; font-size:0.68rem; padding:1px 6px; border-radius:10px;">محظور</span>` : ''}
            
            <div style="display:inline-flex; gap:4px; margin-inline-start:6px;">
              <button class="toggle-ban-btn" data-id="${enroll.id}" data-status="${isBanned ? 'active' : 'banned'}" style="background:none; border:none; cursor:pointer; color:${isBanned ? 'var(--success)' : 'var(--warning)'}; padding:2px;" title="${isBanned ? 'تفعيل الاشتراك' : 'حظر الطالب'}">
                <i data-lucide="${isBanned ? 'check-circle-2' : 'slash'}" style="width:14px; height:14px;"></i>
              </button>
              <button class="remove-enrollment-btn" data-student-id="${student.id}" data-course-id="${enroll.course.id}" style="background:none; border:none; cursor:pointer; color:var(--error); padding:2px;" title="إزالة من هذه الدورة">
                <i data-lucide="x-circle" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    return `
      <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s ease;" onmouseover="this.style.background='var(--bg-app)'" onmouseout="this.style.background='transparent'">
        <!-- Student Info -->
        <td style="padding:14px 20px; vertical-align:middle;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${student.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`}" style="width:42px; height:42px; border-radius:50%; border:2px solid var(--primary); object-fit:cover; flex-shrink:0;">
            <div>
              <div style="font-weight:800; color:var(--text-main); font-size:0.95rem;">${student.name}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:4px;">
                <i data-lucide="mail" style="width:12px; height:12px; color:var(--primary);"></i> ${student.email}
              </div>
              ${rawParentPhone ? `
                <div style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-top:2px; display:flex; align-items:center; gap:4px;">
                  👨‍👩‍👦 ولي الأمر: ${rawParentPhone}
                </div>
              ` : ''}
            </div>
          </div>
        </td>

        <!-- Level & Location -->
        <td style="padding:14px 16px; vertical-align:middle;">
          <div style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem;">
            ${student.education ? `
              <span style="font-weight:700; color:var(--primary); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="graduation-cap" style="width:13px; height:13px;"></i> ${student.education}
              </span>
            ` : '<span style="color:var(--text-muted);">-</span>'}
            ${student.location ? `
              <span style="color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${student.location}
              </span>
            ` : ''}
          </div>
        </td>

        <!-- Courses Enrolled -->
        <td style="padding:14px 16px; vertical-align:middle;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${coursesContent}
          </div>
        </td>

        <!-- Contact Actions (WhatsApp & Call) -->
        <td style="padding:14px 16px; vertical-align:middle; text-align:center;">
          <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
            ${rawPhone ? `
              <div style="display:inline-flex; align-items:center; gap:4px; justify-content:center;">
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">الطالب:</span>
                <a href="https://wa.me/${cleanPhoneWa}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-color:#10b981; color:#10b981; border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; gap:3px;" title="واتساب الطالب">
                  <i data-lucide="message-circle" style="width:12px; height:12px;"></i> واتساب
                </a>
              </div>
            ` : ''}
            ${rawParentPhone ? `
              <div style="display:inline-flex; align-items:center; gap:4px; justify-content:center;">
                <span style="font-size:0.75rem; font-weight:700; color:var(--primary);">ولي الأمر:</span>
                <a href="https://wa.me/${cleanParentPhoneWa}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-color:var(--primary); color:var(--primary); border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; gap:3px;" title="واتساب ولي الأمر">
                  💬 واتساب
                </a>
              </div>
            ` : (!rawPhone ? '<span style="color:var(--text-muted); font-size:0.78rem;">لا يوجد هاتف</span>' : '')}
          </div>
        </td>

        <!-- Actions -->
        <td style="padding:14px 20px; vertical-align:middle; text-align:end;">
          <button class="btn-secondary delete-student-btn" data-student-id="${student.id}" data-student-name="${student.name}" style="padding:6px 12px; font-size:0.78rem; border-color:var(--error); color:var(--error); border-radius:20px; display:inline-flex; align-items:center; gap:4px;" title="${state.user?.role === 'admin' ? 'حذف الحساب' : 'إزالة من دوراتي'}">
            <i data-lucide="${state.user?.role === 'admin' ? 'trash-2' : 'user-minus'}" style="width:13px; height:13px;"></i> ${state.user?.role === 'admin' ? 'حذف الحساب' : 'إزالة'}
          </button>
        </td>
      </tr>
    `;
  }

  bindTableEvents() {
    const wrapper = this.container.querySelector("#students-table-wrapper");
    if (!wrapper) return;

    // Toggle Ban Button
    wrapper.querySelectorAll(".toggle-ban-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const enrollId = btn.getAttribute("data-id");
        const newStatus = btn.getAttribute("data-status");
        try {
          await apiFetch(`/users/students/enrollments/${enrollId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
          });
          showToast(newStatus === "banned" ? "تم حظر الطالب من الدورة." : "تم تفعيل حساب الطالب بالدورة.", "info");
          await this.loadStudents();
        } catch (err) { console.error(err); }
      });
    });

    // Remove Student from Course (Unenroll)
    wrapper.querySelectorAll(".remove-enrollment-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const studentId = btn.getAttribute("data-student-id");
        const courseId = btn.getAttribute("data-course-id");
        const confirmed = await confirmDialog({
          message: "هل تريد إزالة الطالب من هذه الدورة؟",
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          const res = await apiFetch(`/teacher/students/${studentId}?courseId=${courseId}`, { method: "DELETE" });
          showToast(res.message || "تم إزالة الطالب من الدورة بنجاح.", "success");
          await this.loadStudents();
        } catch (err) { btn.disabled = false; }
      });
    });

    // Delete / Remove Student
    wrapper.querySelectorAll(".delete-student-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const studentId = btn.getAttribute("data-student-id");
        const studentName = btn.getAttribute("data-student-name");
        const isAdmin = state.user?.role === "admin";
        
        const confirmed = await confirmDialog({
          message: isAdmin 
            ? `هل أنت تأكد من حذف حساب الطالب "${studentName}" نهائياً من المنصة؟`
            : `هل تريد إزالة الطالب "${studentName}" من دوراتك؟`,
          danger: true
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
          const res = await apiFetch(`/teacher/students/${studentId}`, { method: "DELETE" });
          showToast(res.message || (isAdmin ? "تم حذف الحساب بنجاح." : "تم إزالة الطالب من دوراتك بنجاح."), "success");
          await this.loadStudents();
        } catch (err) { btn.disabled = false; }
      });
    });
  }

  renderAddStudentModal() {
    const modalWrapper = this.container.querySelector("#add-student-modal-wrapper");
    if (!modalWrapper) return;

    const teacherCourses = (this.courses || []).filter(c => state.user?.role === "admin" || c.teacher?.id === state.user?.id);

    modalWrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:620px; max-height:88vh; overflow-y:auto; border-radius:20px; padding:24px 28px; border:1px solid var(--border-color); box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <h3 style="font-size:1.25rem; font-weight:800; margin:0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="user-plus" style="color:var(--primary); width:20px; height:20px;"></i> إضافة طالب جديد
            </h3>
            <button id="close-add-student-modal-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.4rem; line-height:1;">&times;</button>
          </div>

          <form id="add-student-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">الاسم الكامل للطالب <span style="color:var(--error);">*</span></label>
                <input type="text" id="new-student-name" class="form-input" placeholder="مثال: يوسف أحمد" required style="padding:10px 14px; font-size:0.88rem; border-radius:12px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">البريد الإلكتروني <span style="color:var(--error);">*</span></label>
                <input type="email" id="new-student-email" class="form-input" placeholder="student@example.com" required style="padding:10px 14px; font-size:0.88rem; border-radius:12px;">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">كلمة المرور (اختياري)</label>
                <input type="password" id="new-student-password" class="form-input" placeholder="افتراضي: student123" style="padding:10px 14px; font-size:0.88rem; border-radius:12px;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">رقم هاتف الطالب والواتساب</label>
                ${renderPhoneInputGroup({ selectId: "new-student-phone-code", inputId: "new-student-phone-num", defaultCode: "+20", placeholder: "01012345678", required: false })}
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">
                  رقم هاتف ولي الأمر (Parent Phone) <span style="color:var(--error);">*</span>
                </label>
                ${renderPhoneInputGroup({ selectId: "new-student-parent-phone-code", inputId: "new-student-parent-phone-num", defaultCode: "+20", placeholder: "01012345678", required: true })}
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">الولاية / المدينة</label>
                <input type="text" id="new-student-location" class="form-input" placeholder="مثال: القاهرة" style="padding:10px 14px; font-size:0.88rem; border-radius:12px;">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">المستوى الدراسي <span style="color:var(--error);">*</span></label>
                ${renderEducationSelectHTML({ id: "new-student-education", selectedValue: "Entlq 3", required: true, style: "padding:10px 14px; font-size:0.88rem; border-radius:12px;" })}
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">تسجيله في دورة تعليمية <span style="color:var(--error);">*</span></label>
                <select id="new-student-course" class="form-input" style="padding:10px 14px; font-size:0.88rem; border-radius:12px;" required>
                  ${teacherCourses.length === 0 ? `<option value="">-- لا يوجد دورات متاحة --</option>` : ''}
                  ${teacherCourses.map((c, idx) => `<option value="${c.id}" ${idx === 0 ? 'selected' : ''}>${c.title} (${c.category || 'عام'})</option>`).join("")}
                </select>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border-color); padding-top:16px;">
              <button type="button" id="cancel-add-student-modal-btn" class="btn-secondary" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
              <button type="submit" id="submit-add-student-btn" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800;">
                <i data-lucide="check"></i> حفظ وتسجيل الطالب
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { modalWrapper.innerHTML = ""; };
    modalWrapper.querySelector("#close-add-student-modal-btn")?.addEventListener("click", closeModal);
    modalWrapper.querySelector("#cancel-add-student-modal-btn")?.addEventListener("click", closeModal);

    const form = modalWrapper.querySelector("#add-student-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = modalWrapper.querySelector("#submit-add-student-btn");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" class="spinner"></i> جارٍ الحفظ...'; }

      const name = modalWrapper.querySelector("#new-student-name").value.trim();
      const email = modalWrapper.querySelector("#new-student-email").value.trim();
      const password = modalWrapper.querySelector("#new-student-password").value;
      const phoneCode = modalWrapper.querySelector("#new-student-phone-code")?.value || "+20";
      const phoneNum = modalWrapper.querySelector("#new-student-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";

      const parentPhoneCode = modalWrapper.querySelector("#new-student-parent-phone-code")?.value || "+20";
      const parentPhoneNum = modalWrapper.querySelector("#new-student-parent-phone-num")?.value.trim() || "";
      const parentPhone = `${parentPhoneCode} ${parentPhoneNum}`.trim();

      const location = modalWrapper.querySelector("#new-student-location").value.trim();
      const education = modalWrapper.querySelector("#new-student-education").value.trim();
      const courseId = modalWrapper.querySelector("#new-student-course").value;

      try {
        const res = await apiFetch("/teacher/students", {
          method: "POST",
          body: JSON.stringify({ name, email, password, phone, parentPhone, location, education, courseId })
        });
        showToast(res.message || "تمت إضافة الطالب بنجاح!", "success");
        handleWhatsAppResponse(res);
        closeModal();
        await this.loadStudents();
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i data-lucide="check"></i> حفظ وتسجيل الطالب'; }
      }
    });
  }

  onDestroy() {}
}
