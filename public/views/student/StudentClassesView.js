import { apiFetch, state, showToast, t, renderEducationSelectHTML } from "../../app.js";
import { normalizeGradeKey, getStudentGradeDisplay } from "./StudentView.js";

export default class StudentClassesView {
  constructor(container) {
    this.container = container;
    this.allClasses = [];
    this.allGradesData = [];
    this.activeFilter = "my_grade"; // 'my_grade' or 'all'
  }

  async render() {
    this.container.innerHTML = `
      <div class="app-loader" style="min-height:400px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner" style="width:44px; height:44px; border-width:3px; margin-bottom:16px;"></div>
        <p style="font-weight:700; font-size:1rem;">جاري تحميل باقات وفصول صفك الدراسي...</p>
      </div>
    `;

    try {
      const [allClasses, allGrades, meData] = await Promise.all([
        apiFetch("/curriculum/classes").catch(() => []),
        apiFetch("/curriculum/grades").catch(() => []),
        apiFetch("/auth/me").catch(() => null)
      ]);

      if (meData) {
        state.user = { ...state.user, ...meData };
      }

      this.allClasses = Array.isArray(allClasses) ? allClasses : [];
      this.allGradesData = Array.isArray(allGrades) ? allGrades : [];

      this.renderContent();
    } catch (err) {
      console.error("StudentClassesView load error:", err);
      this.container.innerHTML = `
        <div class="glass-card" style="max-width:600px; margin:60px auto; padding:40px; text-align:center;">
          <i data-lucide="alert-circle" style="width:48px; height:48px; color:var(--error); margin-bottom:16px;"></i>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:8px;">تعذر تحميل فصول الصف</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">حدث خطأ أثناء استرداد باقات الفصول الدراسية، يرجى المحاولة لاحقاً.</p>
          <button onclick="window.location.reload()" class="btn-primary" style="margin:0 auto; padding:10px 24px; border-radius:30px;">
            <i data-lucide="rotate-cw"></i> إعادة المحاولة
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderContent() {
    const studentEdu = state.user?.education;
    const sKey = normalizeGradeKey(studentEdu);

    // Find current grade from Egyptian curriculum
    const currentGrade = (this.allGradesData || []).find(g => {
      const gCode = normalizeGradeKey(g.code);
      const gName = normalizeGradeKey(g.name);
      const gNameEn = normalizeGradeKey(g.nameEn);
      return (gCode && gCode === sKey) || (gName && gName === sKey) || (gNameEn && gNameEn === sKey);
    });

    // Filter classes matching student's grade
    const myGradeClasses = (this.allClasses || []).filter(c => {
      if (!c) return false;
      if (currentGrade && (c.grade?.id === currentGrade.id || c.gradeId === currentGrade.id)) return true;
      if (currentGrade?.name && c.grade?.name && normalizeGradeKey(c.grade.name) === normalizeGradeKey(currentGrade.name)) return true;
      if (studentEdu && c.grade?.name && normalizeGradeKey(c.grade.name) === sKey) return true;
      if (studentEdu && c.grade?.code && normalizeGradeKey(c.grade.code) === sKey) return true;
      return false;
    });

    const displayClasses = this.activeFilter === "all" ? this.allClasses : myGradeClasses;

    const themeStyles = {
      blue: { accent: "#2563eb", rgb: "37, 99, 235", bg: "rgba(37, 99, 235, 0.04)", border: "rgba(37, 99, 235, 0.2)", glow: "rgba(37, 99, 235, 0.15)" },
      green: { accent: "#10b981", rgb: "16, 185, 129", bg: "rgba(16, 185, 129, 0.04)", border: "rgba(16, 185, 129, 0.2)", glow: "rgba(16, 185, 129, 0.15)" },
      purple: { accent: "#8b5cf6", rgb: "139, 92, 246", bg: "rgba(139, 92, 246, 0.04)", border: "rgba(139, 92, 246, 0.2)", glow: "rgba(139, 92, 246, 0.15)" },
      amber: { accent: "#f59e0b", rgb: "245, 158, 11", bg: "rgba(245, 158, 11, 0.04)", border: "rgba(245, 158, 11, 0.2)", glow: "rgba(245, 158, 11, 0.15)" }
    };

    this.container.innerHTML = `
      <div class="student-dashboard-layout" style="display:block; max-width:1280px; margin:0 auto; padding:24px 16px;">
        
        <!-- Top Hero Banner -->
        <div class="glass-card" style="padding:28px 32px; border-radius:28px; background:linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(139,92,246,0.07) 50%, rgba(16,185,129,0.06) 100%); border:1.5px solid rgba(99,102,241,0.25); margin-bottom:28px; box-shadow:0 12px 36px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
            
            <div style="flex:1; min-width:280px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                <span class="badge" style="background:rgba(99,102,241,0.14); color:var(--primary); font-size:0.78rem; font-weight:800; padding:4px 12px; border-radius:20px; border:1px solid rgba(99,102,241,0.3); display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="sparkles" style="width:13px; height:13px;"></i> باقات شاملة موحدة
                </span>
                <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.78rem; font-weight:800; padding:4px 12px; border-radius:20px; border:1px solid rgba(16,185,129,0.3);">
                  🎯 صفي الدراسي: ${getStudentGradeDisplay(studentEdu)}
                </span>
              </div>

              <h1 style="font-size:1.85rem; font-weight:900; margin:0 0 8px 0; color:var(--text-main); display:flex; align-items:center; gap:10px;">
                <span>🎒 فصول وباقات صفي الدراسي</span>
              </h1>
              
              <p style="color:var(--text-muted); font-size:0.92rem; margin:0; max-width:760px; line-height:1.6;">
                باقات دراسية متكاملة تجمع كافة مواد المنهج بحصص تفاعلية مباشرة مع أفضل المعلمين وبنك تدريبات ومتابعة مستمرة بسعر موحد وخصم شامل.
              </p>
            </div>

            <!-- Header Quick Actions -->
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
              <button type="button" id="btn-change-grade-modal" class="btn-secondary" style="font-size:0.85rem; font-weight:800; padding:10px 18px; border-radius:14px; display:inline-flex; align-items:center; gap:6px; background:var(--bg-card); border:1.5px solid var(--border-color); cursor:pointer;">
                <i data-lucide="refresh-cw" style="width:15px; height:15px; color:var(--primary);"></i>
                <span>تغيير الصف الدراسي 🔄</span>
              </button>
              <a href="#student-dashboard" class="btn-primary" style="font-size:0.85rem; font-weight:800; padding:10px 20px; border-radius:14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="layout-dashboard" style="width:15px; height:15px;"></i>
                <span>العودة للوحة الرئيسية ➔</span>
              </a>
            </div>

          </div>
        </div>

        <!-- Filter Tabs & Stats Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:24px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="classes-tab-btn ${this.activeFilter === 'my_grade' ? 'active' : ''}" data-filter="my_grade"
              style="padding:9px 20px; border-radius:24px; font-size:0.88rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; border:1px solid ${this.activeFilter === 'my_grade' ? 'var(--primary)' : 'var(--border-color)'}; background:${this.activeFilter === 'my_grade' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.activeFilter === 'my_grade' ? '#ffffff' : 'var(--text-muted)'}; box-shadow:${this.activeFilter === 'my_grade' ? '0 4px 14px rgba(99,102,241,0.3)' : 'none'};">
              <i data-lucide="backpack" style="width:15px; height:15px;"></i>
              <span>فصول صفي (${myGradeClasses.length})</span>
            </button>

            <button type="button" class="classes-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all"
              style="padding:9px 20px; border-radius:24px; font-size:0.88rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; border:1px solid ${this.activeFilter === 'all' ? 'var(--primary)' : 'var(--border-color)'}; background:${this.activeFilter === 'all' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.activeFilter === 'all' ? '#ffffff' : 'var(--text-muted)'}; box-shadow:${this.activeFilter === 'all' ? '0 4px 14px rgba(99,102,241,0.3)' : 'none'};">
              <i data-lucide="grid" style="width:15px; height:15px;"></i>
              <span>جميع فصول المنصة (${this.allClasses.length})</span>
            </button>
          </div>

          <div style="font-size:0.85rem; font-weight:700; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
            <i data-lucide="info" style="width:15px; height:15px; color:var(--primary);"></i>
            <span>تتضمن كل باقة جدولاً أسبوعياً منتظماً وحصصاً جماعية معتمدة</span>
          </div>
        </div>

        <!-- Class Packages Cards Grid -->
        ${displayClasses.length === 0 ? `
          <div class="glass-card" style="padding:48px 24px; text-align:center; border-radius:24px; border:1.5px dashed rgba(99,102,241,0.3); background:rgba(99,102,241,0.02); max-width:700px; margin:20px auto;">
            <div style="width:64px; height:64px; border-radius:50%; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 16px;">
              🎒
            </div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0 0 8px 0;">
              ${this.activeFilter === 'my_grade' ? `لا توجد باقات فصول مخصصة حالياً لصف: ${getStudentGradeDisplay(studentEdu)}` : 'لا توجد فصول دراسية مضافة حالياً'}
            </h3>
            <p style="font-size:0.88rem; color:var(--text-muted); margin:0 auto 20px auto; max-width:460px; line-height:1.6;">
              ${this.activeFilter === 'my_grade' ? 'يتم تحضير فصول وباقات متكاملة لصفك قريباً، أو يمكنك تغيير صفك الدراسي أو استعراض جميع فصول المراحل الأخرى.' : 'يرجى التحقق مرة أخرى لاحقاً أو التواصل مع إدارة المنصة.'}
            </p>
            <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
              <button type="button" class="btn-primary btn-trigger-grade-modal" style="padding:10px 22px; border-radius:24px; font-size:0.86rem; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="refresh-cw" style="width:14px; height:14px;"></i> تغيير الصف الدراسي 🔄
              </button>
              <button type="button" class="btn-secondary" onclick="document.querySelector('.classes-tab-btn[data-filter=\\'all\\']')?.click()" style="padding:10px 20px; border-radius:24px; font-size:0.86rem; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="globe" style="width:14px; height:14px;"></i> استعراض كافة فصول المنصة 🌐
              </button>
            </div>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:24px;">
            ${displayClasses.map(c => {
              const theme = themeStyles[c.theme] || themeStyles.blue;
              const gradeName = c.grade?.name || 'الصف الدراسي';
              const subjectsList = Array.isArray(c.subjects) ? c.subjects : [];
              const featuresList = Array.isArray(c.features) ? c.features : [];

              return `
                <div class="glass-card class-package-card" style="border-radius:24px; overflow:hidden; border:1.5px solid ${theme.border}; background:var(--bg-card); display:flex; flex-direction:column; box-shadow:0 8px 30px rgba(0,0,0,0.04); transition:transform 0.25s ease, box-shadow 0.25s ease; position:relative;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 14px 38px ${theme.glow}';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.04)';">
                  
                  <!-- Top Chromatic Strip -->
                  <div style="height:5px; width:100%; background:${theme.accent};"></div>

                  <!-- Card Header -->
                  <div style="padding:22px 24px 16px; border-bottom:1px solid var(--border-color); background:linear-gradient(180deg, ${theme.bg} 0%, transparent 100%);">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px;">
                      <span style="font-size:0.75rem; font-weight:900; color:${theme.accent}; background:rgba(${theme.rgb}, 0.12); padding:3px 10px; border-radius:10px; border:1px solid rgba(${theme.rgb}, 0.25);">
                        ${c.badge || 'باقة شاملة موحدة'}
                      </span>
                      <span class="badge" style="font-size:0.75rem; font-weight:800; background:rgba(0,0,0,0.04); color:var(--text-muted); border:1px solid var(--border-color); border-radius:10px; padding:3px 10px; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="graduation-cap" style="width:12px; height:12px; color:${theme.accent};"></i>
                        ${gradeName}
                      </span>
                    </div>

                    <h3 style="font-size:1.25rem; font-weight:900; color:var(--text-main); margin:0 0 8px 0; line-height:1.4;">
                      ${c.name}
                    </h3>

                    ${c.description ? `
                      <p style="font-size:0.83rem; color:var(--text-muted); margin:0; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${c.description}
                      </p>
                    ` : ''}

                    <!-- Stats Bar -->
                    <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
                      <span style="font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:8px; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-main); display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="video" style="width:13px; height:13px; color:${theme.accent};"></i>
                        ${c.lessonsCount || '64 حصة تفاعلية'}
                      </span>
                      <span style="font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:8px; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-main); display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="book-open" style="width:13px; height:13px; color:${theme.accent};"></i>
                        ${subjectsList.length} مواد دراسية
                      </span>
                    </div>

                  </div>

                  <!-- Card Body -->
                  <div style="padding:20px 24px; flex:1; display:flex; flex-direction:column; gap:16px;">
                    
                    <!-- Subjects Preview -->
                    ${subjectsList.length > 0 ? `
                      <div>
                        <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:5px;">
                          <i data-lucide="layers" style="width:13px; height:13px; color:${theme.accent};"></i>
                          المواد والمجموعات المشمولة في الباقة:
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                          ${subjectsList.map(sub => `
                            <span style="font-size:0.74rem; font-weight:800; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-main); border-radius:8px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px;">
                              <span>${sub.icon || '📖'}</span>
                              <span>${sub.name}</span>
                              ${sub.teacherName ? `<span style="color:var(--text-muted); font-size:0.68rem; margin-right:3px;">(${sub.teacherName})</span>` : ''}
                            </span>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                    <!-- Key Features -->
                    ${featuresList.length > 0 ? `
                      <div>
                        <div style="font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:8px;">
                          مميزات الاشتراك:
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                          ${featuresList.slice(0, 3).map(f => `
                            <div style="font-size:0.78rem; color:var(--text-main); font-weight:700; display:flex; align-items:flex-start; gap:6px; line-height:1.4;">
                              <i data-lucide="check-circle-2" style="width:14px; height:14px; color:${theme.accent}; flex-shrink:0; margin-top:2px;"></i>
                              <span>${f}</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                    <!-- Price & Action Button Footer -->
                    <div style="margin-top:auto; padding-top:16px; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                      <div>
                        <div style="font-size:1.15rem; font-weight:900; color:${theme.accent}; line-height:1.2;">
                          ${c.priceEg || c.price || 'سعر مخفض'}
                        </div>
                        <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">
                          ${c.price && c.priceEg ? c.price : 'اشتراك شامل لكل المواد'}
                        </div>
                      </div>

                      <a href="#class-details?id=${c.id}" class="btn-primary" style="padding:10px 20px; border-radius:14px; font-size:0.86rem; font-weight:900; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:${theme.accent}; color:#ffffff; border:none; box-shadow:0 4px 16px ${theme.glow};">
                        <span>عرض تفاصيل الفصل</span>
                        <i data-lucide="arrow-left" style="width:14px; height:14px;"></i>
                      </a>
                    </div>

                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    // Filter Tabs
    this.container.querySelectorAll(".classes-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");
        this.activeFilter = filter;
        this.renderContent();
      });
    });

    // Change Grade Modal Triggers
    const triggerGradeModal = () => this.openChangeGradeModal();
    this.container.querySelector("#btn-change-grade-modal")?.addEventListener("click", triggerGradeModal);
    this.container.querySelectorAll(".btn-trigger-grade-modal").forEach(btn => {
      btn.addEventListener("click", triggerGradeModal);
    });
  }

  openChangeGradeModal() {
    const currentEdu = state.user?.education || "";
    const modal = document.createElement("div");
    modal.className = "modal active";
    modal.style.zIndex = "9999";
    modal.innerHTML = `
      <div class="modal-content glass-card" style="max-width:480px; width:92%; padding:28px; border-radius:24px; border:1px solid var(--border-color); background:var(--bg-card); box-shadow:0 20px 50px rgba(0,0,0,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:40px; height:40px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.3rem;">
              🎓
            </div>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--text-main);">تحديد المرحلة والصف الدراسي</h3>
              <p style="margin:3px 0 0 0; font-size:0.8rem; color:var(--text-muted);">اختر صفك الدراسي لعرض باقات الفصول المتوافقة معك تلقائياً</p>
            </div>
          </div>
          <button type="button" id="close-classes-grade-modal" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px; font-size:1.2rem; line-height:1;">✕</button>
        </div>

        <form id="classes-change-grade-form" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:8px; color:var(--text-main);">المرحلة والصف الدراسي:</label>
            ${renderEducationSelectHTML({
              id: "quick-classes-education-select",
              selectedValue: currentEdu,
              required: true,
              style: "width:100%; padding:12px 14px; border-radius:12px; border:1.5px solid var(--border-color); background:var(--bg-input, rgba(255,255,255,0.05)); color:var(--text-main); font-size:0.92rem;"
            })}
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button type="button" id="cancel-classes-grade-modal" class="btn-secondary" style="padding:10px 18px; border-radius:12px; font-weight:700;">إلغاء</button>
            <button type="submit" id="submit-classes-grade-btn" class="btn-primary" style="padding:10px 22px; border-radius:12px; font-weight:800; display:flex; align-items:center; gap:6px;">
              <span>حفظ وتحديث الفصول</span>
              <i data-lucide="check" style="width:16px; height:16px;"></i>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => modal.remove();
    modal.querySelector("#close-classes-grade-modal")?.addEventListener("click", closeModal);
    modal.querySelector("#cancel-classes-grade-modal")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    const form = modal.querySelector("#classes-change-grade-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newGrade = modal.querySelector("#quick-classes-education-select")?.value;
      if (!newGrade) return;

      const submitBtn = modal.querySelector("#submit-classes-grade-btn");
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:15px; height:15px;"></i> جاري الحفظ...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        await apiFetch("/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ education: newGrade })
        });

        if (!state.user) state.user = {};
        state.user.education = newGrade;
        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          storedUser.education = newGrade;
          localStorage.setItem("user", JSON.stringify(storedUser));
        } catch (_) {}

        showToast(`تم تحديث المرحلة بنجاح إلى: ${getStudentGradeDisplay(newGrade)} 🎉`, "success");
        closeModal();
        this.renderContent();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>حفظ وتحديث الفصول</span><i data-lucide="check" style="width:16px; height:16px;"></i>`;
        if (window.lucide) window.lucide.createIcons();
        showToast(err.message || "تعذر تحديث المرحلة الدراسية", "error");
      }
    });
  }
}

