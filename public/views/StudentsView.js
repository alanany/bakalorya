import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML } from "../app.js";

export default class StudentsView {
  constructor(container) {
    this.container = container;
    this.courses = [];
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1440px; margin:0 auto; padding:40px 24px; height:100%; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 class="dashboard-section-title" style="font-size:2rem; margin:0 0 6px 0;">
              <i data-lucide="users"></i> ${t("nav.teacher.students") || "إدارة الطلاب المسجلين"}
            </h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">عرض وإضافة وإدارة جميع الطلاب المسجلين بالمنصة ودوراتك</p>
          </div>
          <button class="btn-primary" id="open-add-student-modal-btn" style="padding:10px 22px; font-weight:800; font-size:0.92rem; display:inline-flex; align-items:center; gap:8px;">
            <i data-lucide="user-plus"></i> إضافة طالب جديد
          </button>
        </div>
        
        <div class="glass-card" style="padding:24px; flex-grow:1;">
          <div id="students-list-container" style="display:flex; flex-direction:column; gap:16px;">
            <div style="text-align:center; padding:40px;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
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
  }

  async loadStudents() {
    try {
      const [students, courses] = await Promise.all([
        apiFetch("/users/students"),
        apiFetch("/courses")
      ]);

      this.courses = courses || [];
      const container = this.container.querySelector("#students-list-container");
      
      if (!students || students.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; color:var(--text-muted); padding:60px 20px;">
            <i data-lucide="users" style="width:48px;height:48px;opacity:0.3;margin-bottom:12px;"></i>
            <p style="font-size:1.1rem; font-weight:700; margin-bottom:12px;">لا يوجد طلاب مسجلين حتى الآن</p>
            <button class="btn-primary" id="empty-add-student-btn" style="font-size:0.88rem; padding:8px 18px;">
              <i data-lucide="user-plus"></i> إضافة أول طالب الآن
            </button>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        container.querySelector("#empty-add-student-btn")?.addEventListener("click", () => this.renderAddStudentModal());
        return;
      }

      container.innerHTML = students.map(student => this.renderStudentCard(student)).join("");

      if (window.lucide) window.lucide.createIcons();
      this.bindStudentCardEvents();

    } catch (error) {
      console.error(error);
      this.container.querySelector("#students-list-container").innerHTML = `<div style="text-align:center; color:var(--error); padding:40px;">فشل تحميل قائمة الطلاب.</div>`;
    }
  }

  bindStudentCardEvents() {
    const container = this.container.querySelector("#students-list-container");
    if (!container) return;

    // Toggle Ban Button
    container.querySelectorAll(".toggle-ban-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const enrollId = btn.getAttribute("data-id");
        const newStatus = btn.getAttribute("data-status");
        try {
          await apiFetch(`/users/students/enrollments/${enrollId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
          });
          showToast(newStatus === "banned" ? "تم حظر الطالب من هذه الدورة." : "تم إعادة تفعيل الطالب بالدورة.", "info");
          await this.loadStudents();
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Remove Student from Course (Unenroll)
    container.querySelectorAll(".remove-enrollment-btn").forEach(btn => {
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
    container.querySelectorAll(".delete-student-btn").forEach(btn => {
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

  renderStudentCard(student) {
    const rawPhone = student.phone || '';
    const cleanPhoneWa = getCleanWhatsAppNumber(rawPhone);

    let enrollmentsHTML = '';
    if (student.enrollments && student.enrollments.length > 0) {
      const items = student.enrollments.map(enroll => {
        if (!enroll || !enroll.course) return '';
        const isBanned = enroll.status === "banned";
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg-card); border-radius:10px; border:1px solid ${isBanned ? 'var(--error)' : 'var(--border-color)'}; margin-bottom:6px;">
            <div style="font-weight:600; font-size:0.9rem; color:${isBanned ? 'var(--error)' : 'var(--text-color)'};">
              <i data-lucide="book-open" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:6px;color:var(--primary);"></i>
              ${enroll.course.title || 'الدورة'}
              ${isBanned ? `<span style="font-size:0.7rem; background:var(--error); color:#fff; padding:2px 8px; border-radius:4px; margin-inline-start:8px;">محظور</span>` : ''}
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary toggle-ban-btn" data-id="${enroll.id}" data-status="${isBanned ? 'active' : 'banned'}" style="padding:4px 10px; font-size:0.78rem; color:${isBanned ? 'var(--success)' : 'var(--warning)'}; border-color:${isBanned ? 'var(--success)' : 'var(--warning)'};">
                <i data-lucide="${isBanned ? 'check-circle' : 'slash'}" style="width:13px;height:13px;"></i> ${isBanned ? 'تفعيل' : 'حظر'}
              </button>
              <button class="btn-secondary remove-enrollment-btn" data-student-id="${student.id}" data-course-id="${enroll.course.id}" style="padding:4px 10px; font-size:0.78rem; color:var(--error); border-color:var(--error);" title="إزالة من الدورة">
                <i data-lucide="x-circle" style="width:13px;height:13px;"></i> إزالة من الدورة
              </button>
            </div>
          </div>
        `;
      }).join("");

      if (items.trim()) {
        enrollmentsHTML = `
          <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color);">
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-muted); margin-bottom:8px;">الدورات المسجل بها:</div>
            <div style="display:flex; flex-direction:column;">
              ${items}
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="glass-card" style="display:flex; flex-direction:column; padding:20px; border-radius:16px; border:1px solid var(--border-color); gap:16px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
          
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="${student.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`}" style="width:56px;height:56px;border-radius:50%; background:var(--bg-card); border:2px solid var(--primary); object-fit:cover;">
            <div>
              <div style="font-weight:800; font-size:1.15rem; color:var(--text-color);">${student.name}</div>
              <div style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
                <i data-lucide="mail" style="width:14px;height:14px;vertical-align:middle;color:var(--primary);"></i> ${student.email}
              </div>
              ${student.phone ? `
                <div style="font-size:0.85rem; color:var(--primary); font-weight:600; margin-top:2px;">
                  <i data-lucide="phone" style="width:14px;height:14px;vertical-align:middle;"></i> ${student.phone}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Actions & Contacts -->
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            ${rawPhone ? `
              <a href="https://wa.me/${cleanPhoneWa}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-color:var(--success); color:var(--success); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="محادثة واتساب">
                <i data-lucide="message-circle" style="width:14px;height:14px;"></i> واتساب
              </a>
              <a href="tel:${cleanPhone}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-color:var(--primary); color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="اتصال">
                <i data-lucide="phone-call" style="width:14px;height:14px;"></i> اتصال
              </a>
            ` : ''}
            <button class="btn-secondary delete-student-btn" data-student-id="${student.id}" data-student-name="${student.name}" style="padding:6px 12px; font-size:0.8rem; border-color:var(--error); color:var(--error); display:inline-flex; align-items:center; gap:4px;" title="${state.user?.role === 'admin' ? 'حذف الحساب' : 'إزالة من دوراتي'}">
              <i data-lucide="${state.user?.role === 'admin' ? 'trash-2' : 'user-minus'}" style="width:14px;height:14px;"></i> ${state.user?.role === 'admin' ? 'حذف الحساب' : 'إزالة من دوراتي'}
            </button>
          </div>
        </div>

        <!-- Location & Level -->
        <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:0.85rem;">
          ${student.location ? `
            <div style="background:var(--bg-card); padding:5px 12px; border-radius:20px; border:1px solid var(--border-color); color:var(--text-main); font-weight:600; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="map-pin" style="width:14px;height:14px;color:var(--primary);"></i> ${student.location}
            </div>
          ` : ''}
          ${student.education ? `
            <div style="background:var(--bg-card); padding:5px 12px; border-radius:20px; border:1px solid var(--border-color); color:var(--text-main); font-weight:600; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="graduation-cap" style="width:14px;height:14px;color:var(--accent);"></i> ${student.education}
            </div>
          ` : ''}
        </div>

        ${enrollmentsHTML}
      </div>
    `;
  }

  renderAddStudentModal() {
    const modalWrapper = this.container.querySelector("#add-student-modal-wrapper");
    if (!modalWrapper) return;

    const teacherCourses = (this.courses || []).filter(c => state.user?.role === "admin" || c.teacher?.id === state.user?.id);

    modalWrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:620px; max-height:88vh; overflow-y:auto; border-radius:20px; padding:22px 26px; border:1px solid var(--border-color); box-shadow:0 16px 50px rgba(0,0,0,0.4);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
            <h3 style="font-size:1.25rem; font-weight:800; margin:0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="user-plus" style="color:var(--primary); width:20px; height:20px;"></i> إضافة طالب جديد
            </h3>
            <button id="close-add-student-modal-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.4rem; line-height:1;">&times;</button>
          </div>

          <form id="add-student-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">الاسم الكامل للطالب <span style="color:var(--error);">*</span></label>
                <input type="text" id="new-student-name" class="form-input" placeholder="مثال: يوسف أحمد" required style="padding:8px 12px; font-size:0.88rem;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">البريد الإلكتروني <span style="color:var(--error);">*</span></label>
                <input type="email" id="new-student-email" class="form-input" placeholder="student@example.com" required style="padding:8px 12px; font-size:0.88rem;">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">كلمة المرور (اختياري)</label>
                <input type="password" id="new-student-password" class="form-input" placeholder="افتراضي: student123" style="padding:8px 12px; font-size:0.88rem;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">رقم الهاتف والواتساب</label>
                ${renderPhoneInputGroup({ selectId: "new-student-phone-code", inputId: "new-student-phone-num", defaultCode: "+20", placeholder: "01012345678", required: false })}
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">الولاية / المدينة</label>
                <input type="text" id="new-student-location" class="form-input" placeholder="مثال: الجزائر العاصمة" style="padding:8px 12px; font-size:0.88rem;">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">المستوى الدراسي <span style="color:var(--error);">*</span></label>
                ${renderEducationSelectHTML({ id: "new-student-education", selectedValue: "Bakalorya 3", required: true, style: "padding:8px 12px; font-size:0.88rem;" })}
              </div>
            </div>

            <div class="form-group" style="margin-bottom:18px;">
              <label style="font-weight:700; font-size:0.85rem; margin-bottom:4px; display:block;">تسجيله في دورة مباشرة (اختياري)</label>
              <select id="new-student-course" class="form-input" style="padding:8px 12px; font-size:0.88rem;">
                <option value="">-- اختر الدورة لإلحاق الطالب بها --</option>
                ${teacherCourses.map(c => `<option value="${c.id}">${c.title} (${c.category || 'عام'})</option>`).join("")}
              </select>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--border-color); padding-top:14px;">
              <button type="button" id="cancel-add-student-modal-btn" class="btn-secondary" style="padding:8px 18px; font-size:0.88rem;">إلغاء</button>
              <button type="submit" id="submit-add-student-btn" class="btn-primary" style="padding:8px 22px; font-size:0.88rem; font-weight:800;">
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
      const phoneCode = modalWrapper.querySelector("#new-student-phone-code")?.value || "+213";
      const phoneNum = modalWrapper.querySelector("#new-student-phone-num")?.value.trim() || "";
      const phone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";
      const location = modalWrapper.querySelector("#new-student-location").value.trim();
      const education = modalWrapper.querySelector("#new-student-education").value.trim();
      const courseId = modalWrapper.querySelector("#new-student-course").value;

      try {
        const res = await apiFetch("/teacher/students", {
          method: "POST",
          body: JSON.stringify({ name, email, password, phone, location, education, courseId })
        });
        showToast(res.message || "تمت إضافة الطالب بنجاح!", "success");
        closeModal();
        await this.loadStudents();
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i data-lucide="check"></i> حفظ وتسجيل الطالب'; }
      }
    });
  }

  onDestroy() {}
}
