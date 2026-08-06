import { apiFetch, state, showToast, t } from "../app.js";

export default class ResourcesView {
  constructor(container) {
    this.container = container;
    this.resources = [];
    this.courses = [];
    this.filterCourseId = "all";
  }

  async render() {
    try {
      if (!state.user) return;
      const isTeacher = state.user.role === "teacher" || state.user.role === "admin";

      this.container.innerHTML = `
        <div style="max-width:1280px; margin:0 auto; padding:40px 24px; display:flex; flex-direction:column; gap:0;">

          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
            <div>
              <h2 class="dashboard-section-title" style="font-size:2rem; margin:0;">
                <i data-lucide="library"></i> ${t("nav.resources") || "الموارد التعليمية"}
              </h2>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">
                ملفات ومواد الدراسة المرتبطة بكل دورة
              </p>
            </div>
            ${isTeacher ? `
              <button class="btn-primary" id="open-resource-modal-btn" style="display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="plus"></i> إضافة مورد
              </button>
            ` : ""}
          </div>

          <!-- Course Filter Tab Bar — full width sticky -->
          <div style="width:100%; border-bottom:2px solid var(--border-color); margin-bottom:28px; overflow-x:auto;">
            <div id="course-filter-bar" style="display:flex; min-width:max-content; gap:0;">
              <button class="filter-tab-btn active" data-course="all"
                style="padding:12px 28px; font-size:0.9rem; font-weight:700; background:none; border:none; border-bottom:3px solid var(--primary); color:var(--primary); cursor:pointer; white-space:nowrap; transition:all 0.2s;">
                <i data-lucide="layers" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:6px;"></i> الكل (All)
              </button>
              <!-- course tabs injected here -->
            </div>
          </div>

          <!-- Resources Grid -->
          <div id="resources-content-area" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:24px;">
            <div style="text-align:center; padding:60px; grid-column: 1 / -1;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>

        <!-- Add Resource Modal -->
        <div class="modal-overlay" id="resource-modal" style="display:none;">
          <div class="modal-content" style="max-width:520px;">
            <div class="modal-header">
              <h3 class="modal-title"><i data-lucide="package-plus" style="width:20px;height:20px;"></i> إضافة مورد جديد</h3>
              <span class="modal-close-btn" id="close-resource-modal">&times;</span>
            </div>
            <form id="create-resource-form">
              <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">

                <!-- Course selector -->
                <div class="form-group">
                  <label for="resource-course">📚 الدورة المرتبطة (اختر دورة)</label>
                  <select id="resource-course" class="form-select" required>
                    <option value="">-- اختر الدورة --</option>
                  </select>
                </div>

                <!-- Title -->
                <div class="form-group">
                  <label for="resource-title">📝 اسم المورد</label>
                  <input type="text" id="resource-title" class="form-input" placeholder="مثال: ملخص الفصل الأول..." required>
                </div>

                <!-- Photo URL -->
                <div class="form-group">
                  <label for="resource-photo">🖼️ صورة تمثيلية (رابط صورة اختياري)</label>
                  <input type="url" id="resource-photo" class="form-input" placeholder="https://... (اختياري)">
                  <div id="photo-preview-wrap" style="margin-top:8px; display:none;">
                    <img id="resource-photo-preview" src="" style="width:100%; max-height:140px; object-fit:cover; border-radius:10px; border:1px solid var(--border-color);">
                  </div>
                </div>

                <!-- Drive / Resource link -->
                <div class="form-group">
                  <label for="resource-url">🔗 رابط المورد (Google Drive / PDF / ...)</label>
                  <input type="url" id="resource-url" class="form-input" placeholder="https://drive.google.com/..." required>
                </div>

              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-resource-modal">إلغاء</button>
                <button type="submit" class="btn-primary" id="submit-resource-btn">
                  <i data-lucide="upload-cloud"></i> حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      await this.loadContent();
    } catch (err) {
      console.error(err);
    }
  }

  async loadContent() {
    try {
      this.resources = await apiFetch("/resources");

      const isTeacher = state.user.role === "teacher" || state.user.role === "admin";
      if (isTeacher) {
        const allCourses = await apiFetch("/courses");
        this.courses = (allCourses || []).filter(c =>
          state.user.role === "admin" ||
          c.teacher?.id === state.user.id ||
          c.teacherId === state.user.id
        );
        if (this.courses.length === 0 && (allCourses || []).length > 0) {
          // Fallback: show available courses
          this.courses = allCourses;
        }
        this.renderCourseSelect();
      } else {
        // For students — derive unique courses from their resources
        const seen = new Set();
        this.courses = this.resources
          .filter(r => r.course && !seen.has(r.course.id) && seen.add(r.course.id))
          .map(r => r.course);
      }

      this.renderFilterBar();
      this.renderResourcesList();
      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (error) {
      console.error(error);
      const area = this.container.querySelector("#resources-content-area");
      if (area) area.innerHTML = `<div class="glass-card" style="text-align:center;padding:40px;color:var(--error);grid-column:1/-1;">فشل تحميل الموارد</div>`;
    }
  }

  renderCourseSelect() {
    const select = document.getElementById("resource-course");
    if (!select) return;
    select.innerHTML = `<option value="">-- اختر الدورة --</option>` +
      this.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("");
  }

  renderFilterBar() {
    const bar = this.container.querySelector("#course-filter-bar");
    if (!bar) return;

    const tabStyle = (active) =>
      `padding:12px 28px; font-size:0.9rem; font-weight:700; background:none; border:none; border-bottom:3px solid ${active ? "var(--primary)" : "transparent"}; color:${active ? "var(--primary)" : "var(--text-muted)"}; cursor:pointer; white-space:nowrap; transition:all 0.2s;`;

    const allActive = this.filterCourseId === "all";
    const courseTabs = this.courses.map(c => `
      <button class="filter-tab-btn" data-course="${c.id}"
        style="${tabStyle(String(this.filterCourseId) === String(c.id))}">
        <i data-lucide="book-open" style="width:13px;height:13px;vertical-align:middle;margin-inline-end:5px;"></i>${c.title}
      </button>
    `).join("");

    bar.innerHTML = `
      <button class="filter-tab-btn" data-course="all" style="${tabStyle(allActive)}">
        <i data-lucide="layers" style="width:13px;height:13px;vertical-align:middle;margin-inline-end:5px;"></i>الكل (All)
      </button>
      ${courseTabs}
    `;

    if (window.lucide) window.lucide.createIcons();

    bar.querySelectorAll(".filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.filterCourseId = btn.dataset.course;
        bar.querySelectorAll(".filter-tab-btn").forEach(b => {
          const isActive = b.dataset.course === this.filterCourseId;
          b.style.borderBottomColor = isActive ? "var(--primary)" : "transparent";
          b.style.color = isActive ? "var(--primary)" : "var(--text-muted)";
        });
        this.renderResourcesList();
      });
    });
  }

  renderResourcesList() {
    const area = this.container.querySelector("#resources-content-area");
    if (!area) return;

    let filtered = this.resources;
    if (this.filterCourseId !== "all") {
      filtered = filtered.filter(r => String(r.course?.id) === String(this.filterCourseId));
    }

    const isTeacher = state.user.role === "teacher" || state.user.role === "admin";

    if (filtered.length === 0) {
      area.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:60px 24px; color:var(--text-muted); grid-column: 1 / -1;">
          <i data-lucide="folder-open" style="width:56px; height:56px; margin-bottom:16px; opacity:0.4;"></i>
          <h4 style="font-weight:700; margin-bottom:6px;">لا توجد موارد بعد</h4>
          <p style="font-size:0.9rem;">No resources found${this.filterCourseId !== "all" ? " for this course" : ""}.</p>
          ${isTeacher ? `<button class="btn-primary" id="quick-add-resource-btn" style="margin-top:16px; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="plus"></i> إضافة مورد الآن</button>` : ""}
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      document.getElementById("quick-add-resource-btn")?.addEventListener("click", () => {
        document.getElementById("resource-modal").style.display = "flex";
      });
      return;
    }

    area.innerHTML = filtered.map(r => this.renderResourceCard(r, isTeacher)).join("");
    if (window.lucide) window.lucide.createIcons();

    // Delete buttons
    area.querySelectorAll(".delete-resource-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("هل تريد حذف هذا المورد؟ / Delete this resource?")) return;
        try {
          await apiFetch(`/resources/${id}`, { method: "DELETE" });
          showToast("تم حذف المورد بنجاح", "success");
          await this.loadContent();
        } catch (err) { console.error(err); }
      });
    });
  }

  renderResourceCard(resource, isTeacher) {
    const defaultPhoto = `https://placehold.co/400x200/6366f1/ffffff?text=${encodeURIComponent(resource.title?.charAt(0) || "R")}`;
    const photo = resource.photo || defaultPhoto;
    const isDrive = resource.url?.includes("drive.google.com");
    const isDoc = resource.url?.includes("docs.google.com");
    const iconLabel = isDrive ? "Google Drive" : isDoc ? "Google Docs" : "فتح الرابط";
    const iconName = isDrive || isDoc ? "hard-drive" : "external-link";

    return `
      <div class="glass-card" style="padding:0; overflow:hidden; display:flex; flex-direction:column; border:1px solid var(--border-color); border-radius:16px; transition:transform 0.2s;" 
           onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'">

        <!-- Cover Photo -->
        <div style="position:relative; height:160px; overflow:hidden;">
          <img src="${photo}" alt="${resource.title}" loading="lazy"
               style="width:100%; height:100%; object-fit:cover;"
               onerror="this.src='${defaultPhoto}'">
          <!-- Course badge overlay -->
          <div style="position:absolute; top:10px; inset-inline-start:10px;">
            <span style="background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); color:#fff; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
              <i data-lucide="book-open" style="width:12px;height:12px;"></i>
              ${resource.course?.title || "عام"}
            </span>
          </div>
          ${isTeacher ? `
            <button class="delete-resource-btn" data-id="${resource.id}"
              style="position:absolute; top:10px; inset-inline-end:10px; background:rgba(239,68,68,0.85); color:#fff; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;"
              onmouseenter="this.style.background='rgba(220,38,38,1)'" onmouseleave="this.style.background='rgba(239,68,68,0.85)'"
              title="حذف المورد">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          ` : ""}
        </div>

        <!-- Body -->
        <div style="padding:16px 18px; display:flex; flex-direction:column; gap:12px; flex-grow:1;">
          <h4 style="font-size:1.05rem; font-weight:800; margin:0; color:var(--text-color); line-height:1.3;">${resource.title}</h4>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--text-muted);">
            <i data-lucide="calendar" style="width:13px;height:13px;"></i>
            ${resource.createdAt ? new Date(resource.createdAt).toLocaleDateString("ar-EG") : ""}
          </div>

          <div style="margin-top:auto;">
            <a href="${resource.url}" target="_blank" rel="noopener" class="btn-primary"
               style="width:100%; justify-content:center; display:flex; align-items:center; gap:6px; text-decoration:none;">
              <i data-lucide="${iconName}"></i> ${iconLabel}
            </a>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const modal = document.getElementById("resource-modal");

    document.getElementById("open-resource-modal-btn")?.addEventListener("click", () => {
      modal.style.display = "flex";
    });
    document.getElementById("close-resource-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });
    document.getElementById("cancel-resource-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    // Live photo preview
    document.getElementById("resource-photo")?.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const wrap = document.getElementById("photo-preview-wrap");
      const img = document.getElementById("resource-photo-preview");
      if (val) { wrap.style.display = "block"; img.src = val; }
      else { wrap.style.display = "none"; img.src = ""; }
    });

    document.getElementById("create-resource-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("submit-resource-btn");
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:16px;height:16px;border-width:2px;"></i> جار الحفظ...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const courseId = document.getElementById("resource-course").value.trim();
        const title = document.getElementById("resource-title").value.trim();
        const photo = document.getElementById("resource-photo").value.trim() || null;
        const url = document.getElementById("resource-url").value.trim();

        if (!courseId) {
          showToast("يرجى اختيار الدورة المرتبطة بالمورد أولاً.", "error");
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="upload-cloud"></i> حفظ المورد`;
          if (window.lucide) window.lucide.createIcons();
          return;
        }

        await apiFetch("/resources", {
          method: "POST",
          body: JSON.stringify({ title, courseId, photo, url })
        });

        showToast("تم إضافة المورد بنجاح! ✅", "success");
        modal.style.display = "none";
        document.getElementById("create-resource-form").reset();
        document.getElementById("photo-preview-wrap").style.display = "none";
        await this.loadContent();
      } catch (err) {
        showToast("فشل إضافة المورد. تحقق من البيانات.", "error");
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="upload-cloud"></i> حفظ المورد`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  onDestroy() {}
}
