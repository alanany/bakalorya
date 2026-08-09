import { apiFetch, state, showToast, t, renderCourseCard } from "../app.js";

export default class SearchView {
  constructor(container, query = "") {
    this.container = container;
    this.query = decodeURIComponent(query || "").trim();
    this.courses = [];
    this.teachers = [];
    this.activeTab = "all"; // 'all' | 'courses' | 'teachers'
  }

  updateQuery(newQuery) {
    this.query = (newQuery || "").trim();
    const pageInput = this.container.querySelector("#page-search-input");
    if (pageInput && pageInput.value !== this.query) {
      pageInput.value = this.query;
    }
    this.renderResults();
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1280px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:28px;">
        
        <!-- Search Header Bar -->
        <div class="glass-card" style="padding:32px; border-radius:24px; border:1px solid var(--border-color); background:linear-gradient(135deg, rgba(0,86,210,0.06) 0%, rgba(99,102,241,0.04) 100%); display:flex; flex-direction:column; gap:16px;">
          <div>
            <h2 class="dashboard-section-title" style="font-size:1.8rem; margin:0 0 6px 0; display:flex; align-items:center; gap:10px;">
              <i data-lucide="search" style="color:var(--primary);"></i> البحث الشامل في المنصة
            </h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">ابحث عن المواد والدورات التعليمية والمعلمين بسهولة حسب الاسم، التخصص، أو المستوى الدراسي</p>
          </div>

          <!-- Live Search Box inside Page -->
          <div style="display:flex; gap:12px; align-items:center; max-width:680px; width:100%;">
            <div style="position:relative; flex:1;">
              <input type="text" id="page-search-input" value="${this.escapeHtml(this.query)}" placeholder="ابحث باسم الدورة، اسم المعلم، أو المادة (مثال: فيزياء، رياضيات)..." style="width:100%; padding:14px 44px 14px 18px; border-radius:30px; border:1.5px solid var(--border-color); background:var(--bg-app); font-size:0.95rem; font-family:inherit; color:var(--text-color); outline:none; transition:all 0.2s ease;">
              <i data-lucide="search" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); width:18px; height:18px; color:var(--text-muted);"></i>
            </div>
            <button id="page-search-submit-btn" class="btn-primary" style="padding:14px 24px; border-radius:30px; font-weight:800; font-size:0.9rem; flex-shrink:0;">
              بحث
            </button>
          </div>

          <!-- Result Tabs & Counts -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:8px; padding-top:16px; border-top:1px solid var(--border-color);">
            <div style="display:flex; gap:8px; background:var(--bg-app); border:1px solid var(--border-color); padding:4px; border-radius:50px;" id="search-tabs-wrapper">
              <button class="search-tab-btn active" data-tab="all" style="padding:6px 20px; font-size:0.85rem; font-weight:800; border-radius:50px; border:none; cursor:pointer; background:var(--primary); color:#fff;">
                الكل (<span id="count-all">0</span>)
              </button>
              <button class="search-tab-btn" data-tab="courses" style="padding:6px 20px; font-size:0.85rem; font-weight:800; border-radius:50px; border:none; cursor:pointer; background:transparent; color:var(--text-muted);">
                الدورات (<span id="count-courses">0</span>)
              </button>
              <button class="search-tab-btn" data-tab="teachers" style="padding:6px 20px; font-size:0.85rem; font-weight:800; border-radius:50px; border:none; cursor:pointer; background:transparent; color:var(--text-muted);">
                المعلمون (<span id="count-teachers">0</span>)
              </button>
            </div>

            <div id="search-query-summary" style="font-size:0.85rem; color:var(--text-muted); font-weight:600;"></div>
          </div>
        </div>

        <!-- Search Results Container -->
        <div id="search-results-viewport">
          <div style="text-align:center; padding:60px 20px;">
            <i data-lucide="loader" class="spinner" style="width:36px; height:36px; border-width:3px; margin:0 auto;"></i>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-top:12px;">جاري البحث وتجمِيع النتائج...</p>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
    await this.fetchDataAndSearch();
  }

  bindEvents() {
    const input = this.container.querySelector("#page-search-input");
    const btn = this.container.querySelector("#page-search-submit-btn");

    const doSearch = () => {
      const q = input?.value.trim() || "";
      this.query = q;
      window.location.hash = `#search?q=${encodeURIComponent(q)}`;
      this.renderResults();
    };

    btn?.addEventListener("click", doSearch);
    input?.addEventListener("keyup", (e) => {
      if (e.key === "Enter") doSearch();
    });

    this.container.querySelectorAll(".search-tab-btn").forEach(tab => {
      tab.addEventListener("click", () => {
        this.container.querySelectorAll(".search-tab-btn").forEach(t => {
          t.style.background = "transparent";
          t.style.color = "var(--text-muted)";
        });
        tab.style.background = "var(--primary)";
        tab.style.color = "#fff";
        this.activeTab = tab.getAttribute("data-tab");
        this.renderResults();
      });
    });
  }

  async fetchDataAndSearch() {
    try {
      const [courses, teachers] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/teachers")
      ]);
      this.courses = courses || [];
      this.teachers = teachers || [];
      this.renderResults();
    } catch (err) {
      console.error(err);
      const viewport = this.container.querySelector("#search-results-viewport");
      if (viewport) {
        viewport.innerHTML = `<div style="text-align:center; color:var(--error); padding:40px;">حدث خطأ أثناء تحميل نتائج البحث. يرجى المحاولة لاحقاً.</div>`;
      }
    }
  }

  renderResults() {
    const viewport = this.container.querySelector("#search-results-viewport");
    if (!viewport) return;

    const q = (this.query || "").toLowerCase();

    // Filter courses
    const filteredCourses = this.courses.filter(c => {
      if (!q) return true;
      const title = (c.title || "").toLowerCase();
      const cat = (c.category || "").toLowerCase();
      const deg = (c.degree || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      const tName = (c.teacher?.name || "").toLowerCase();
      return title.includes(q) || cat.includes(q) || deg.includes(q) || desc.includes(q) || tName.includes(q);
    });

    // Filter teachers
    const filteredTeachers = this.teachers.filter(t => {
      if (!q) return true;
      const name = (t.name || "").toLowerCase();
      const bio = (t.bio || "").toLowerCase();
      const subj = (t.subject || t.specialty || "").toLowerCase();
      const email = (t.email || "").toLowerCase();
      return name.includes(q) || bio.includes(q) || subj.includes(q) || email.includes(q);
    });

    const totalCount = filteredCourses.length + filteredTeachers.length;

    // Update Counts
    const countAll = this.container.querySelector("#count-all");
    const countCourses = this.container.querySelector("#count-courses");
    const countTeachers = this.container.querySelector("#count-teachers");
    const summary = this.container.querySelector("#search-query-summary");

    if (countAll) countAll.textContent = totalCount;
    if (countCourses) countCourses.textContent = filteredCourses.length;
    if (countTeachers) countTeachers.textContent = filteredTeachers.length;
    if (summary) {
      summary.textContent = q ? `إجمالي النتائج لـ "${this.query}": ${totalCount} نتيجة` : `عرض جميع الدورات والمعلمين (${totalCount})`;
    }

    if (totalCount === 0) {
      viewport.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:60px 20px; border-radius:20px; border:1px solid var(--border-color);">
          <i data-lucide="search-x" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px; color:var(--text-muted);"></i>
          <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">لم نجد أي نتائج مطابقة لـ "${this.escapeHtml(this.query)}"</h3>
          <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:20px;">جرب البحث بكلمات عامة مثل (فيزياء، رياضيات، أستاذ) أو تصفح كتالوج الدورات الرئيسي.</p>
          <a href="#courses" class="btn-primary" style="display:inline-flex; width:fit-content; margin:0 auto; padding:10px 24px; border-radius:30px;">تصفح كتالوج الدورات</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = ``;

    // Render Courses section
    if ((this.activeTab === "all" || this.activeTab === "courses") && filteredCourses.length > 0) {
      html += `
        <div style="margin-bottom:40px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 class="dashboard-section-title" style="margin:0; font-size:1.3rem; display:flex; align-items:center; gap:8px;">
              <i data-lucide="book-open" style="color:var(--primary);"></i> الدورات التعليمية المطابقة (${filteredCourses.length})
            </h3>
          </div>
          <div class="courses-grid">
            ${filteredCourses.map(course => renderCourseCard(course)).join("")}
          </div>
        </div>
      `;
    }

    // Render Teachers section
    if ((this.activeTab === "all" || this.activeTab === "teachers") && filteredTeachers.length > 0) {
      html += `
        <div style="margin-bottom:40px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 class="dashboard-section-title" style="margin:0; font-size:1.3rem; display:flex; align-items:center; gap:8px;">
              <i data-lucide="graduation-cap" style="color:var(--primary);"></i> المعلمون المطابقون (${filteredTeachers.length})
            </h3>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:20px;">
            ${filteredTeachers.map(teacher => this.renderTeacherCard(teacher)).join("")}
          </div>
        </div>
      `;
    }

    viewport.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  renderTeacherCard(teacher) {
    const name = teacher.name || "الأستاذ المعلم";
    const avatar = teacher.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
    const specialty = teacher.subject || teacher.specialty || "معلم معتمد بالمنصة";

    return `
      <div class="glass-card" style="padding:20px; border-radius:18px; border:1px solid var(--border-color); display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; transition:transform 0.2s ease;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'">
        <img src="${avatar}" alt="${name}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:2px solid var(--primary-glow); background:var(--bg-app);">
        <div>
          <h4 style="font-size:1.05rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main);">${name}</h4>
          <span style="font-size:0.78rem; font-weight:700; color:var(--primary); background:rgba(0,86,210,0.08); padding:2px 10px; border-radius:12px; display:inline-block;">
            ${specialty}
          </span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin:0; line-height:1.4; max-height:40px; overflow:hidden; text-overflow:ellipsis;">
          ${teacher.bio || 'معلم خبير ومتخصص تقديم دروس الدعم المباشر والمراجعات المتقدمة.'}
        </p>
        <a href="#teacher/${teacher.id}" class="btn-primary" style="padding:8px 18px; font-size:0.82rem; border-radius:20px; text-decoration:none; margin-top:4px; font-weight:700; width:100%; justify-content:center;">
          تصفح ملف المعلم ودوراته
        </a>
      </div>
    `;
  }

  escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  onDestroy() {}
}
