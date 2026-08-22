import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminStatsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminStatsPage = {

  renderStatsTab() {
    const s = this.stats;
    const teachers = this.allMembers.filter(u => u.role === "teacher");
    const students = this.allMembers.filter(u => u.role === "student");

    return `
      <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom:40px;">
        ${this.statCard("graduation-cap", s.totalTeachers || 0, t("admin.stat.teachers"), "var(--primary)", "var(--primary-glow)")}
        ${this.statCard("users", s.totalStudents || 0, t("admin.stat.students"), "var(--success)", "var(--success-glow)")}
        ${this.statCard("shield", s.totalAdmins || 0, t("admin.role.admin"), "var(--info)", "var(--info-glow)")}
        ${this.statCard("book-open", s.totalCourses || 0, t("admin.stat.courses"), "var(--accent)", "var(--accent-glow)")}
        ${this.statCard("video", s.totalSessions || 0, t("admin.stat.sessions"), "var(--warning, #f59e0b)", "rgba(245,158,11,0.15)")}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        <div class="glass-card" style="padding:24px;">
          <h3 style="font-weight:700;margin-bottom:20px;font-size:1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="graduation-cap" style="width:18px;height:18px;color:var(--primary);"></i>
            ${t("admin.recentTeachers")}
          </h3>
          ${teachers.slice(0, 5).map(u => this.miniUserRow(u)).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;">${t("admin.noData")}</p>`}
        </div>

        <div class="glass-card" style="padding:24px;">
          <h3 style="font-weight:700;margin-bottom:20px;font-size:1rem;display:flex;align-items:center;gap:8px;">
            <i data-lucide="users" style="width:18px;height:18px;color:var(--success);"></i>
            ${t("admin.recentStudents")}
          </h3>
          ${students.slice(0, 5).map(u => this.miniUserRow(u)).join("") || `<p style="color:var(--text-muted);font-size:0.85rem;">${t("admin.noData")}</p>`}
        </div>
      </div>
    `;
  },

  statCard(icon, value, label, color, bg) {
    return `
      <div class="glass-card stat-box">
        <div class="stat-box-icon" style="color:${color}; background:${bg};">
          <i data-lucide="${icon}"></i>
        </div>
        <div>
          <div class="stat-box-val">${value}</div>
          <div class="stat-box-lbl">${label}</div>
        </div>
      </div>
    `;
  },

  miniUserRow(user) {
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color);">
        <img src="${user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + user.name}" style="width:32px;height:32px;border-radius:50%;">
        <div>
          <div style="font-weight:600;font-size:0.85rem;">${user.name}</div>
          <div style="color:var(--text-muted);font-size:0.75rem;">${user.email}</div>
        </div>
      </div>
    `;
  },

  // ── 1.5 Categories Tab ────────────────────────────────────────────────────────

  renderCategoriesTab() {
    const categories = this.categories || [];

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-weight:800; margin:0 0 4px 0; font-size:1.3rem; display:flex; align-items:center; gap:8px;">
            <i data-lucide="layers" style="color:var(--primary);"></i> تصنيفات المنصة المعتمدة (${categories.length})
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">إدارة وتعديل الأقسام والتخصصات الرسمية المتاحة لجميع المعلمين والطلاب في المنصة</p>
        </div>
        <button class="btn-primary" id="open-create-category-btn" style="font-size:0.88rem; padding:10px 20px; border-radius:30px; background:linear-gradient(135deg,#a855f7,#0056D2); border:none; display:flex; align-items:center; gap:8px; font-weight:800;">
          <i data-lucide="plus-circle"></i> إضافة تصنيف جديد
        </button>
      </div>

      <div class="glass-card" style="padding:0; border-radius:20px; overflow:hidden; border:1px solid var(--border-color);">
        ${categories.length === 0
        ? `<div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
              <i data-lucide="layers" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
              <h4 style="font-weight:700; margin-bottom:6px;">لا توجد تصنيفات معرفة بعد</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">انقر فوق "إضافة تصنيف جديد" لإضافة أول تخصص رسمي بالمنصة.</p>
            </div>`
        : `<div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:start; font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">
                    <th style="padding:14px 20px; font-weight:800;">التصنيف والتخصص</th>
                    <th style="padding:14px 16px; font-weight:800;">الوصف والشرح</th>
                    <th style="padding:14px 16px; font-weight:800;">تاريخ الإنشاء</th>
                    <th style="padding:14px 20px; font-weight:800; text-align:end;">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${categories.map(cat => `
                    <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s ease;" onmouseover="this.style.background='var(--bg-app)'" onmouseout="this.style.background='transparent'">
                      <!-- Category Name & Icon -->
                      <td style="padding:14px 20px; vertical-align:middle;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div style="width:42px; height:42px; border-radius:12px; background:rgba(168,85,247,0.12); color:#a855f7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i data-lucide="${cat.icon || 'layers'}" style="width:22px; height:22px;"></i>
                          </div>
                          <div>
                            <div style="font-weight:800; color:var(--text-main); font-size:0.95rem;">${cat.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">تخصص معتمد 🎓</div>
                          </div>
                        </div>
                      </td>

                      <!-- Description -->
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <div style="font-size:0.85rem; color:var(--text-main); line-height:1.5;">
                          ${cat.description || 'تصنيف رسمي معتمد لدروس البكالوريا'}
                        </div>
                      </td>

                      <!-- Created Date -->
                      <td style="padding:14px 16px; vertical-align:middle;">
                        <span style="font-size:0.8rem; color:var(--text-muted); background:var(--bg-app); border:1px solid var(--border-color); padding:4px 10px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="calendar" style="width:12px; height:12px; color:var(--primary);"></i>
                          ${cat.createdAt ? new Date(cat.createdAt).toLocaleDateString("ar") : "-"}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td style="padding:14px 20px; vertical-align:middle; text-align:end;">
                        <div style="display:inline-flex; gap:8px; justify-content:flex-end;">
                          <button class="btn-secondary edit-category-btn" data-id="${cat.id}" style="padding:6px 14px; font-size:0.78rem; border-color:var(--primary); color:var(--primary); border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="edit-3" style="width:13px; height:13px;"></i> تعديل
                          </button>
                          <button class="btn-secondary delete-category-btn" data-id="${cat.id}" style="padding:6px 14px; font-size:0.78rem; border-color:var(--error); color:var(--error); border-radius:20px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="trash-2" style="width:13px; height:13px;"></i> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>`
      }
      </div>
    `;
  },

  // ── 2. Dedicated Teachers Tab (Add Teacher & Salary Calculation) ─────

  renderCategoryModal(category = null) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const isEdit = !!category;

    container.innerHTML = `
      <div class="modal-overlay" id="category-modal" style="display:flex;">
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</h3>
            <span class="modal-close-btn" id="close-category-modal">&times;</span>
          </div>
          <form id="category-form">
            <div class="modal-body">
              <div class="form-group">
                <label for="category-name">اسم التصنيف / المادة</label>
                <input type="text" id="category-name" class="form-input" value="${isEdit ? category.name : ''}" placeholder="مثال: العلوم الفيزيائية" required>
              </div>
              <div class="form-group">
                <label for="category-icon">أيقونة Lucide Icon (اختياري)</label>
                <input type="text" id="category-icon" class="form-input" value="${isEdit ? (category.icon || '') : ''}" placeholder="مثال: calculator, zap, book-open, dna">
              </div>
              <div class="form-group">
                <label for="category-desc">الوصف الإرشادي للتصنيف</label>
                <textarea id="category-desc" class="form-input" style="height:90px; resize:none;" placeholder="اكتب وصفاً موجزاً عن هذا التخصص...">${isEdit ? (category.description || '') : ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-category-modal">إلغاء</button>
              <button type="submit" class="btn-primary" style="background:linear-gradient(135deg,#a855f7,#0056D2); border:none;">${isEdit ? "حفظ التعديلات ✅" : "إضافة التصنيف 🚀"}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };

    document.getElementById("close-category-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-category-modal")?.addEventListener("click", closeModal);

    document.getElementById("category-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("category-name").value;
      const icon = document.getElementById("category-icon").value;
      const description = document.getElementById("category-desc").value;

      try {
        if (isEdit) {
          await apiFetch(`/categories/${category.id}`, {
            method: "PUT",
            body: JSON.stringify({ name, icon, description })
          });
          showToast("تم تحديث التصنيف بنجاح! 📝", "success");
        } else {
          await apiFetch("/categories", {
            method: "POST",
            body: JSON.stringify({ name, icon, description })
          });
          showToast("تم إضافة التصنيف الجديد بنجاح! 🚀", "success");
        }
        closeModal();
        await this.loadAllData();
        this.renderTab("categories");
      } catch (err) { }
    });
  }

  // ── Render Member Create / Edit Modal ───────────────────────────────────────

};
