import { apiFetch, showToast, confirmDialog } from "../../app.js";

export class AdminCurriculumPage {
  constructor(container, adminView) {
    this.container = container;
    this.adminView = adminView;
    this.grades = [];
    this.activeStage = "SECONDARY";
    this.searchQuery = "";
  }

  async render() {
    this.container.innerHTML = `<div style="padding:24px 0;display:flex;align-items:center;justify-content:center;"><i data-lucide="loader-2" style="width:24px;height:24px;animation:spin 1s linear infinite;"></i></div>`;
    if (window.lucide) window.lucide.createIcons();
    await this.loadGrades();
    this.renderPage();
    this.bindEvents();
  }

  async loadGrades() {
    try {
      this.grades = await apiFetch("/admin/curriculum/grades");
    } catch (e) {
      this.grades = [];
      showToast("فشل تحميل بيانات المناهج", "error");
    }
  }

  gradesForStage() {
    return (this.grades || []).filter(g => g.stage === this.activeStage);
  }

  renderPage() {
    const stageGrades = this.gradesForStage();
    const q = this.searchQuery.toLowerCase().trim();
    const totalSubjects = stageGrades.reduce((sum, g) => sum + (g.subjects || []).length, 0);
    const activeSubjects = stageGrades.reduce((sum, g) => sum + (g.subjects || []).filter(s => s.isActive).length, 0);
    const hiddenSubjects = totalSubjects - activeSubjects;

    this.container.innerHTML = `
      <style>
        .curr-page{padding:24px 28px;max-width:1200px;font-family:'Outfit','Cairo',sans-serif;}
        .curr-stats-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;}
        .curr-stat-card{flex:1;min-width:160px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:18px;padding:20px 22px;}
        .curr-stat-card .stat-val{font-size:2rem;font-weight:900;color:var(--primary);margin:4px 0;}
        .curr-stat-card .stat-label{font-size:0.78rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
        .curr-stage-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;}
        .curr-stage-tab{padding:9px 20px;border-radius:50px;border:2px solid var(--border-color);background:transparent;cursor:pointer;font-size:0.85rem;font-weight:700;color:var(--text-muted);transition:all 0.2s;}
        .curr-stage-tab.active{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.3);}
        .curr-stage-tab:hover:not(.active){border-color:var(--primary);color:var(--primary);}
        .curr-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px;}
        .curr-search{flex:1;min-width:220px;padding:10px 16px;border-radius:14px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-main);font-size:0.88rem;outline:none;transition:border-color 0.2s;}
        .curr-search:focus{border-color:var(--primary);}
        .curr-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:14px;border:none;cursor:pointer;font-size:0.85rem;font-weight:800;transition:all 0.2s;}
        .curr-btn-primary{background:linear-gradient(135deg,var(--primary),#6d28d9);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.35);}
        .curr-btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(99,102,241,0.45);}
        .curr-btn-outline{background:var(--bg-card);color:var(--text-main);border:1px solid var(--border-color);}
        .curr-btn-outline:hover{border-color:var(--primary);color:var(--primary);}
        .curr-grade-list{display:flex;flex-direction:column;gap:20px;}
        .curr-grade-card{background:var(--bg-card);border:1px solid var(--border-color);border-radius:20px;overflow:hidden;transition:box-shadow 0.2s;}
        .curr-grade-card:hover{box-shadow:0 8px 32px rgba(0,0,0,0.1);}
        .curr-grade-header{display:flex;align-items:center;gap:14px;padding:18px 22px;border-bottom:1px solid var(--border-color);cursor:pointer;user-select:none;}
        .curr-grade-icon{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(109,40,217,0.1));color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;}
        .curr-grade-name{font-size:1rem;font-weight:800;color:var(--text-main);}
        .curr-grade-meta{font-size:0.75rem;color:var(--text-muted);margin-top:2px;}
        .curr-grade-actions{margin-inline-start:auto;display:flex;gap:8px;align-items:center;}
        .curr-toggle-icon{transition:transform 0.25s;color:var(--text-muted);}
        .curr-toggle-icon.rotated{transform:rotate(180deg);}
        .curr-subjects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:18px 22px;}
        .curr-subject-card{background:var(--bg-app);border:1.5px solid var(--border-color);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;transition:all 0.2s;}
        .curr-subject-card.hidden-subject{opacity:0.5;border-style:dashed;}
        .curr-subject-card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:0 6px 20px rgba(99,102,241,0.12);}
        .curr-subject-icon{font-size:1.8rem;line-height:1;}
        .curr-subject-name{font-size:0.9rem;font-weight:800;color:var(--text-main);}
        .curr-subject-name-en{font-size:0.75rem;color:var(--text-muted);}
        .curr-subject-badges{display:flex;gap:6px;flex-wrap:wrap;}
        .curr-badge{padding:2px 8px;border-radius:8px;font-size:0.68rem;font-weight:800;}
        .curr-badge-lang{background:rgba(245,158,11,0.15);color:#d97706;}
        .curr-badge-hidden{background:rgba(239,68,68,0.12);color:#ef4444;}
        .curr-badge-active{background:rgba(16,185,129,0.12);color:#10b981;}
        .curr-subject-actions{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;}
        .curr-sub-btn{padding:5px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-card);cursor:pointer;font-size:0.73rem;font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:all 0.15s;}
        .curr-sub-btn:hover{border-color:var(--primary);color:var(--primary);}
        .curr-sub-btn.danger:hover{border-color:#ef4444;color:#ef4444;}
        .curr-sub-btn.success:hover{border-color:#10b981;color:#10b981;}
        .curr-add-subject-card{background:transparent;border:2px dashed var(--border-color);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all 0.2s;min-height:140px;color:var(--text-muted);}
        .curr-add-subject-card:hover{border-color:var(--primary);color:var(--primary);background:rgba(99,102,241,0.04);}
        .curr-add-subject-card span{font-size:0.82rem;font-weight:700;}
        .curr-section-title-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px 8px 20px;border-top:1px solid var(--border-color);margin-top:10px;flex-wrap:wrap;gap:10px;}
        .curr-section-title{font-size:0.86rem;font-weight:900;color:var(--text-main);display:flex;align-items:center;gap:6px;}
        .curr-classes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;padding:12px 20px 20px 20px;}
        .curr-class-card{background:var(--bg-app);border:1.5px solid var(--border-color);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;position:relative;transition:all 0.2s;}
        .curr-class-card:hover{border-color:var(--primary);box-shadow:0 6px 18px rgba(0,0,0,0.06);}
        .curr-class-card.hidden-class{opacity:0.6;border-style:dashed;}
        .curr-class-header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
        .curr-class-name{font-weight:900;font-size:0.92rem;color:var(--text-main);line-height:1.3;}
        .curr-class-badge{padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:800;}
        .curr-class-meta{font-size:0.78rem;color:var(--text-muted);font-weight:700;}
        .curr-class-price{font-size:0.95rem;font-weight:900;color:var(--primary);margin-top:2px;}
        .curr-add-class-card{background:transparent;border:2px dashed var(--border-color);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all 0.2s;min-height:120px;color:var(--text-muted);}
        .curr-add-class-card:hover{border-color:var(--primary);color:var(--primary);background:rgba(99,102,241,0.04);}
        .curr-add-class-card span{font-size:0.82rem;font-weight:700;}
        .curr-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;}
        .curr-modal{background:var(--bg-card);border:1px solid var(--border-color);border-radius:24px;padding:32px 28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.25);animation:slideUp 0.25s cubic-bezier(0.16,1,0.3,1);}
        .curr-modal h3{font-size:1.15rem;font-weight:900;color:var(--text-main);margin:0 0 22px 0;}
        .curr-fgrp{margin-bottom:16px;}
        .curr-fgrp label{font-size:0.8rem;font-weight:800;color:var(--text-muted);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px;}
        .curr-fgrp input,.curr-fgrp select{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid var(--border-color);background:var(--bg-app);color:var(--text-main);font-size:0.88rem;outline:none;box-sizing:border-box;transition:border-color 0.2s;}
        .curr-fgrp input:focus,.curr-fgrp select:focus{border-color:var(--primary);}
        .curr-icon-picker{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
        .curr-icon-opt{width:38px;height:38px;border-radius:10px;border:2px solid var(--border-color);background:var(--bg-app);cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
        .curr-icon-opt.selected{border-color:var(--primary);background:rgba(99,102,241,0.12);}
        .curr-icon-opt:hover{border-color:var(--primary);}
        .curr-modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;flex-wrap:wrap;}
        .curr-empty{text-align:center;padding:40px 20px;color:var(--text-muted);}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      </style>
      <div class="curr-page">
        <div class="curr-stats-row">
          <div class="curr-stat-card"><div class="stat-label">إجمالي الصفوف</div><div class="stat-val">${this.grades.length}</div></div>
          <div class="curr-stat-card"><div class="stat-label">المواد في المرحلة</div><div class="stat-val">${totalSubjects}</div></div>
          <div class="curr-stat-card"><div class="stat-label">مواد ظاهرة</div><div class="stat-val" style="color:#10b981;">${activeSubjects}</div></div>
          <div class="curr-stat-card"><div class="stat-label">مواد مخفية</div><div class="stat-val" style="color:#ef4444;">${hiddenSubjects}</div></div>
        </div>
        <div class="curr-stage-tabs">
          ${[{key:"PRIMARY",label:"🏫 ابتدائي"},{key:"PREPARATORY",label:"📚 إعدادي"},{key:"SECONDARY",label:"🎓 ثانوي"},{key:"HIGHER",label:"🏛️ تعليم عالٍ"}]
            .map(s=>`<button class="curr-stage-tab${this.activeStage===s.key?" active":""}" data-stage="${s.key}">${s.label}</button>`).join("")}
        </div>
        <div class="curr-toolbar">
          <input class="curr-search" type="search" id="curr-search-input" placeholder="🔍 ابحث عن مادة أو صف..." value="${this.searchQuery}">
          <button class="curr-btn curr-btn-primary" id="curr-add-grade-btn"><i data-lucide="plus-circle" style="width:15px;height:15px;"></i> إضافة صف</button>
        </div>
        <div class="curr-grade-list" id="curr-grade-list">${this.renderGradeCards(stageGrades, q)}</div>
      </div>`;
    if (window.lucide) window.lucide.createIcons();
  }

  renderGradeCards(grades, q) {
    if (!grades.length) return `<div class="curr-empty"><div style="font-size:2.5rem;margin-bottom:12px;">📭</div><p>لا توجد صفوف دراسية في هذه المرحلة.</p></div>`;
    return grades.map((grade, idx) => {
      let subjects = grade.subjects || [];
      let classes = grade.classPackages || [];
      if (q) {
        subjects = subjects.filter(s => s.name?.toLowerCase().includes(q) || s.nameEn?.toLowerCase().includes(q) || grade.name?.toLowerCase().includes(q));
        classes = classes.filter(c => c.name?.toLowerCase().includes(q) || c.badge?.toLowerCase().includes(q) || grade.name?.toLowerCase().includes(q));
      }
      const activeCount = subjects.filter(s => s.isActive).length;
      const activeClassesCount = classes.filter(c => c.isActive).length;
      const open = idx < 2;
      return `<div class="curr-grade-card" data-grade-id="${grade.id}">
        <div class="curr-grade-header" data-toggle-grade="${grade.id}">
          <div class="curr-grade-icon">🎒</div>
          <div>
            <div class="curr-grade-name">${grade.name}</div>
            <div class="curr-grade-meta">${grade.nameEn||""} • ${subjects.length} مادة (${activeCount} ظاهرة) • ${classes.length} فصول وباقات (${activeClassesCount} ظاهرة)</div>
          </div>
          <div class="curr-grade-actions">
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);background:var(--bg-app);padding:4px 10px;border-radius:20px;border:1px solid var(--border-color);">${grade.code||grade.stage}</span>
            <button class="curr-sub-btn danger curr-delete-grade-btn" data-grade-id="${grade.id}" data-grade-name="${grade.name}"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
            <i data-lucide="chevron-down" style="width:18px;height:18px;" class="curr-toggle-icon${open?" rotated":""}" id="ti-${grade.id}"></i>
          </div>
        </div>
        <div id="gp-${grade.id}" ${open?'':'style="display:none"'}>
          <!-- قسم المواد الدراسية -->
          <div style="padding:14px 20px 4px 20px; display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:0.86rem; font-weight:800; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <i data-lucide="book-open" style="width:15px;height:15px;"></i>
              <span>المواد الدراسية المقررة (${subjects.length})</span>
            </div>
          </div>
          <div class="curr-subjects-grid">
            ${subjects.map(sub => this.renderSubjectCard(sub)).join("")}
            <div class="curr-add-subject-card" data-add-subject="${grade.id}">
              <i data-lucide="plus-circle" style="width:28px;height:28px;"></i>
              <span>إضافة مادة</span>
            </div>
          </div>

          <!-- قسم الفصول والباقات الشاملة -->
          <div class="curr-section-title-row">
            <div class="curr-section-title">
              <i data-lucide="layers" style="width:16px;height:16px;color:var(--primary);"></i>
              <span>فصول وباقات الصف (${classes.length})</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="curr-btn curr-btn-primary curr-add-class-btn" data-grade-id="${grade.id}" style="padding:6px 14px; font-size:0.78rem;">
                <i data-lucide="plus-circle" style="width:14px;height:14px;"></i>
                <span>إضافة فصل جديد</span>
              </button>
              <button type="button" class="curr-btn curr-btn-outline curr-seed-classes-btn" data-grade-id="${grade.id}" data-grade-name="${grade.name}" style="padding:6px 14px; font-size:0.78rem;" title="توليد 3 باقات وفصول افتراضية متكاملة لهذا الصف">
                <i data-lucide="sparkles" style="width:14px;height:14px;color:#f59e0b;"></i>
                <span>توليد تلقائي ✨</span>
              </button>
            </div>
          </div>
          <div class="curr-classes-grid">
            ${classes.map(pkg => this.renderClassCard(pkg, grade)).join("")}
            <div class="curr-add-class-card" data-add-class="${grade.id}">
              <i data-lucide="plus-circle" style="width:24px;height:24px;"></i>
              <span>إضافة فصل أو باقة لهذا الصف</span>
            </div>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  renderClassCard(pkg, grade) {
    const isHidden = !pkg.isActive;
    const themeColors = {
      blue: "#0284c7",
      green: "#10b981",
      purple: "#8b5cf6",
      amber: "#f59e0b"
    };
    const accentColor = themeColors[pkg.theme] || "#0284c7";
    const rawData = JSON.stringify({
      id: pkg.id,
      name: pkg.name,
      badge: pkg.badge || "",
      lessonsCount: pkg.lessonsCount || "عدد الحصص: 64 حصة",
      theme: pkg.theme || "blue",
      priceEg: pkg.priceEg || "",
      price: pkg.price || "",
      description: pkg.description || "",
      order: pkg.order || 0,
      isActive: !!pkg.isActive,
      groupIds: (pkg.linkedGroups || []).map(g => g.id)
    }).replace(/"/g, "&quot;");

    const linkedGroups = pkg.linkedGroups || [];

    return `
      <div class="curr-class-card${isHidden ? " hidden-class" : ""}">
        <div class="curr-class-header">
          <div style="flex:1;">
            ${pkg.badge ? `<span class="curr-class-badge" style="background:${accentColor}18; color:${accentColor}; border:1px solid ${accentColor}33; display:inline-block; margin-bottom:4px;">${pkg.badge}</span>` : ''}
            <div class="curr-class-name">${pkg.name}</div>
          </div>
          <span class="curr-badge ${isHidden ? "curr-badge-hidden" : "curr-badge-active"}">${isHidden ? "مخفية" : "ظاهرة"}</span>
        </div>

        <div class="curr-class-meta">
          <div><i data-lucide="book" style="width:12px;height:12px;display:inline;"></i> ${pkg.lessonsCount || (linkedGroups.length > 0 ? `عدد الحصص: ${linkedGroups.length * 8} حصة` : "64 حصة")}</div>
          ${pkg.priceEg ? `<div class="curr-class-price">${pkg.priceEg} / شهرياً</div>` : (pkg.price ? `<div class="curr-class-price">${pkg.price}</div>` : '')}
        </div>

        <!-- المجموعات المربوطة وأجور المعلمين بالساعة -->
        <div style="margin: 6px 0; display:flex; flex-direction:column; gap:4px;">
          <div style="font-size:0.74rem; font-weight:800; color:var(--text-muted); display:flex; justify-content:space-between;">
            <span>المجموعات المربوطة (${linkedGroups.length}):</span>
            <span style="color:#10b981; font-weight:800;">أجر الساعة للمعلم</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; max-height:100px; overflow-y:auto; padding-inline-end:2px;">
            ${linkedGroups.length > 0 ? linkedGroups.map(g => `
              <div style="font-size:0.72rem; display:flex; align-items:center; justify-content:space-between; background:var(--bg-card); padding:4px 8px; border-radius:8px; border:1px solid var(--border-color);">
                <span style="font-weight:700; color:var(--text-main);">${g.course?.subject?.name || g.name} (${g.teacher?.name || 'معلم'})</span>
                <span style="color:#10b981; font-weight:800;">${g.teacherHourlyRate || 100} ج.م/س</span>
              </div>
            `).join('') : '<span style="font-size:0.72rem; color:#f59e0b; padding:4px 0;">⚠️ لم يتم ربط مجموعات بعد</span>'}
          </div>
        </div>

        <div class="curr-subject-actions" style="margin-top:auto; padding-top:8px; border-top:1px solid var(--border-color); flex-wrap:wrap;">
          <button type="button" class="curr-sub-btn curr-class-enroll-btn" data-class-id="${pkg.id}" data-grade-id="${grade.id}" data-class-name="${pkg.name}" data-class-price="${pkg.priceEg || ''}" style="background:#10b98118; color:#10b981; border-color:#10b98140;" title="تسكين طالب في جميع مجموعات الفصل بنقرة واحدة">
            <i data-lucide="user-plus" style="width:12px;height:12px;"></i>
            <span>تسكين طالب</span>
          </button>
          <button type="button" class="curr-sub-btn curr-class-toggle-btn${isHidden ? " success" : ""}" data-class-id="${pkg.id}" title="${isHidden ? "إظهار الفصل" : "إخفاء الفصل"}">
            <i data-lucide="${isHidden ? "eye" : "eye-off"}" style="width:12px;height:12px;"></i>
            <span>${isHidden ? "إظهار" : "إخفاء"}</span>
          </button>
          <button type="button" class="curr-sub-btn curr-class-edit-btn" data-grade-id="${grade.id}" data-class="${rawData}" title="تعديل الفصل">
            <i data-lucide="pencil" style="width:12px;height:12px;"></i>
            <span>تعديل</span>
          </button>
          <button type="button" class="curr-sub-btn danger curr-class-del-btn" data-class-id="${pkg.id}" data-class-name="${pkg.name}" title="حذف الفصل">
            <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            <span>حذف</span>
          </button>
        </div>
      </div>
    `;
  }

  renderSubjectCard(sub) {
    const isHidden = !sub.isActive;
    const raw = {id:sub.id,name:sub.name,nameEn:sub.nameEn||"",icon:sub.icon||"📖",isLanguageTrack:!!sub.isLanguageTrack,isActive:!!sub.isActive};
    const subData = JSON.stringify(raw).replace(/"/g,"&quot;");
    return `<div class="curr-subject-card${isHidden?" hidden-subject":""}">
      <div class="curr-subject-icon">${sub.icon||"📖"}</div>
      <div class="curr-subject-name">${sub.name}</div>
      ${sub.nameEn?`<div class="curr-subject-name-en">${sub.nameEn}</div>`:""}
      <div class="curr-subject-badges">
        ${sub.isLanguageTrack?`<span class="curr-badge curr-badge-lang">لغات</span>`:""}
        ${isHidden?`<span class="curr-badge curr-badge-hidden">مخفية</span>`:`<span class="curr-badge curr-badge-active">ظاهرة</span>`}
      </div>
      <div class="curr-subject-actions">
        <button class="curr-sub-btn curr-toggle-btn${isHidden?" success":""}" data-subject-id="${sub.id}"><i data-lucide="${isHidden?"eye":"eye-off"}" style="width:12px;height:12px;"></i>${isHidden?"إظهار":"إخفاء"}</button>
        <button class="curr-sub-btn curr-edit-btn" data-subject="${subData}"><i data-lucide="pencil" style="width:12px;height:12px;"></i></button>
        <button class="curr-sub-btn danger curr-del-sub-btn" data-subject-id="${sub.id}" data-subject-name="${sub.name}"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
      </div>
    </div>`;
  }

  bindEvents() {
    this.container.querySelectorAll(".curr-stage-tab").forEach(btn => {
      btn.addEventListener("click", () => { this.activeStage = btn.getAttribute("data-stage"); this.searchQuery = ""; this.renderPage(); this.bindEvents(); });
    });
    document.getElementById("curr-search-input")?.addEventListener("input", e => {
      this.searchQuery = e.target.value;
      const list = document.getElementById("curr-grade-list");
      if (list) { list.innerHTML = this.renderGradeCards(this.gradesForStage(), this.searchQuery.toLowerCase().trim()); if (window.lucide) window.lucide.createIcons(); this.bindListEvents(); }
    });
    document.getElementById("curr-add-grade-btn")?.addEventListener("click", () => this.openAddGradeModal());
    this.bindListEvents();
  }

  bindListEvents() {
    this.container.querySelectorAll("[data-toggle-grade]").forEach(header => {
      header.addEventListener("click", e => {
        if (e.target.closest(".curr-delete-grade-btn")) return;
        const id = header.getAttribute("data-toggle-grade");
        const panel = document.getElementById("gp-"+id);
        const icon = document.getElementById("ti-"+id);
        if (panel) { const h = panel.style.display==="none"; panel.style.display=h?"":"none"; icon?.classList.toggle("rotated",h); }
      });
    });
    this.container.querySelectorAll(".curr-delete-grade-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-grade-id"), name = btn.getAttribute("data-grade-name");
        if (!await confirmDialog(`حذف "${name}"؟ لا يمكن التراجع.`)) return;
        try { const r = await apiFetch(`/admin/curriculum/grades/${id}`,{method:"DELETE"}); showToast(r.message||"تم الحذف","success"); await this.loadGrades(); this.renderPage(); this.bindEvents(); }
        catch(err){ showToast(err.message||"فشل الحذف","error"); }
      });
    });
    this.container.querySelectorAll("[data-add-subject]").forEach(card => {
      card.addEventListener("click", () => { const grade = this.grades.find(g=>g.id===card.getAttribute("data-add-subject")); this.openSubjectModal(null, grade); });
    });
    this.container.querySelectorAll(".curr-toggle-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-subject-id"); btn.disabled = true;
        try { const r = await apiFetch(`/admin/curriculum/subjects/${id}/toggle`,{method:"PATCH"}); showToast(r.message||"تم","success"); await this.loadGrades(); this.renderPage(); this.bindEvents(); }
        catch(err){ showToast(err.message||"فشل","error"); btn.disabled=false; }
      });
    });
    this.container.querySelectorAll(".curr-edit-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        try { this.openSubjectModal(JSON.parse(btn.getAttribute("data-subject").replace(/&quot;/g,'"')), null); }
        catch { showToast("خطأ في البيانات","error"); }
      });
    });
    this.container.querySelectorAll(".curr-del-sub-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-subject-id"), name = btn.getAttribute("data-subject-name");
        if (!await confirmDialog(`حذف مادة "${name}"؟ إذا كانت مرتبطة بدورات ستُرفض. يمكنك إخفاؤها بدلاً من الحذف.`)) return;
        try { const r = await apiFetch(`/admin/curriculum/subjects/${id}`,{method:"DELETE"}); showToast(r.message||"تم الحذف","success"); await this.loadGrades(); this.renderPage(); this.bindEvents(); }
        catch(err){ showToast(err.message||"فشل الحذف","error"); }
      });
    });

    // Class Package Events
    this.container.querySelectorAll(".curr-add-class-btn, [data-add-class]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const gradeId = btn.getAttribute("data-grade-id") || btn.getAttribute("data-add-class");
        const grade = this.grades.find(g => g.id === gradeId);
        if (grade) this.openClassModal(grade, null);
      });
    });

    this.container.querySelectorAll(".curr-seed-classes-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const gradeId = btn.getAttribute("data-grade-id");
        const gradeName = btn.getAttribute("data-grade-name");
        if (!await confirmDialog(`هل تريد إنشاء وتوليد 3 باقات وفصول متكاملة تلقائياً لصف "${gradeName}"؟`)) return;
        btn.disabled = true;
        try {
          await apiFetch(`/admin/curriculum/grades/${gradeId}/classes/seed-defaults?force=true`, { method: "POST" });
          showToast("تم توليد الفصول الافتراضية بنجاح 🚀", "success");
          await this.loadGrades();
          this.renderPage();
          this.bindEvents();
        } catch (err) {
          showToast(err.message || "فشل التوليد", "error");
          btn.disabled = false;
        }
      });
    });

    this.container.querySelectorAll(".curr-class-toggle-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-class-id");
        btn.disabled = true;
        try {
          const r = await apiFetch(`/admin/curriculum/classes/${id}/toggle`, { method: "PATCH" });
          showToast(r.message || "تم تغيير حالة الفصل", "success");
          await this.loadGrades();
          this.renderPage();
          this.bindEvents();
        } catch (err) {
          showToast(err.message || "فشل", "error");
          btn.disabled = false;
        }
      });
    });

    this.container.querySelectorAll(".curr-class-edit-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const gradeId = btn.getAttribute("data-grade-id");
        const grade = this.grades.find(g => g.id === gradeId);
        try {
          const classData = JSON.parse(btn.getAttribute("data-class").replace(/&quot;/g, '"'));
          this.openClassModal(grade, classData);
        } catch {
          showToast("خطأ في قراءة بيانات الفصل", "error");
        }
      });
    });

    this.container.querySelectorAll(".curr-class-del-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const id = btn.getAttribute("data-class-id");
        const name = btn.getAttribute("data-class-name");
        if (!await confirmDialog(`حذف فصل "${name}"؟ لا يمكن التراجع.`)) return;
        btn.disabled = true;
        try {
          const r = await apiFetch(`/admin/curriculum/classes/${id}`, { method: "DELETE" });
          showToast(r.message || "تم حذف الفصل بنجاح", "success");
          await this.loadGrades();
          this.renderPage();
          this.bindEvents();
        } catch (err) {
          showToast(err.message || "فشل حذف الفصل", "error");
          btn.disabled = false;
        }
      });
    });

    this.container.querySelectorAll(".curr-class-enroll-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const classId = btn.getAttribute("data-class-id");
        const gradeId = btn.getAttribute("data-grade-id");
        const grade = this.grades.find(g => g.id === gradeId);
        const pkg = (grade?.classPackages || []).find(c => c.id === classId);
        if (pkg) this.openEnrollStudentModal(pkg);
        else showToast("تعذر العثور على بيانات الفصل", "error");
      });
    });
  }

  openAddGradeModal() {
    const overlay = document.createElement("div"); overlay.className = "curr-modal-overlay";
    overlay.innerHTML = `<div class="curr-modal">
      <h3>🎒 إضافة صف دراسي جديد</h3>
      <div class="curr-fgrp"><label>اسم الصف (عربي) *</label><input id="cgm-name" type="text" placeholder="مثال: الصف الأول الثانوي"></div>
      <div class="curr-fgrp"><label>اسم الصف (إنجليزي)</label><input id="cgm-name-en" type="text" placeholder="Grade 10 (1st Secondary)"></div>
      <div class="curr-fgrp"><label>المرحلة الدراسية *</label><select id="cgm-stage">
        <option value="PRIMARY"${this.activeStage==="PRIMARY"?" selected":""}>ابتدائي</option>
        <option value="PREPARATORY"${this.activeStage==="PREPARATORY"?" selected":""}>إعدادي</option>
        <option value="SECONDARY"${this.activeStage==="SECONDARY"?" selected":""}>ثانوي</option>
        <option value="HIGHER"${this.activeStage==="HIGHER"?" selected":""}>تعليم عالٍ</option>
      </select></div>
      <div class="curr-fgrp"><label>الترتيب (رقم)</label><input id="cgm-order" type="number" placeholder="13" min="1"></div>
      <div class="curr-fgrp"><label>كود الصف (اختياري)</label><input id="cgm-code" type="text" placeholder="مثال: SEC_4"></div>
      <div class="curr-modal-footer">
        <button class="curr-btn curr-btn-outline" id="cgm-cancel">إلغاء</button>
        <button class="curr-btn curr-btn-primary" id="cgm-save"><i data-lucide="save" style="width:14px;height:14px;"></i> حفظ</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
    overlay.querySelector("#cgm-cancel").addEventListener("click", ()=>overlay.remove());
    overlay.addEventListener("click", e=>{if(e.target===overlay)overlay.remove();});
    overlay.querySelector("#cgm-save").addEventListener("click", async()=>{
      const name=overlay.querySelector("#cgm-name").value.trim(), nameEn=overlay.querySelector("#cgm-name-en").value.trim(), stage=overlay.querySelector("#cgm-stage").value, order=parseInt(overlay.querySelector("#cgm-order").value)||0, code=overlay.querySelector("#cgm-code").value.trim();
      if(!name){showToast("اسم الصف مطلوب","error");return;}
      const btn=overlay.querySelector("#cgm-save"); btn.disabled=true; btn.textContent="جارٍ الحفظ...";
      try{ await apiFetch("/admin/curriculum/grades",{method:"POST",body:JSON.stringify({name,nameEn,stage,order,code})}); showToast("تم إضافة الصف ✅","success"); overlay.remove(); await this.loadGrades(); this.renderPage(); this.bindEvents(); }
      catch(err){showToast(err.message||"فشل","error");btn.disabled=false;btn.textContent="حفظ";}
    });
  }

  openSubjectModal(subject, grade) {
    const isEdit = !!subject;
    const ICONS = ["📖","🔤","📐","🔢","🔬","🧪","🌍","💻","🖥️","⚡","🧬","🏛️","💭","📊","🗺️","🧠","🎨","📝","🎭","🌱","⚗️","🔭","📡","🎵","✏️"];
    let selectedIcon = subject?.icon || "📖";
    const overlay = document.createElement("div"); overlay.className = "curr-modal-overlay";
    overlay.innerHTML = `<div class="curr-modal">
      <h3>${isEdit?"✏️ تعديل المادة":"➕ إضافة مادة"}${grade?" — "+grade.name:""}</h3>
      <div class="curr-fgrp"><label>اسم المادة (عربي) *</label><input id="csm-name" type="text" placeholder="مثال: الفيزياء" value="${subject?.name||""}"></div>
      <div class="curr-fgrp"><label>اسم المادة (إنجليزي)</label><input id="csm-name-en" type="text" placeholder="Physics" value="${subject?.nameEn||""}"></div>
      <div class="curr-fgrp">
        <label>الأيقونة</label>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <span id="csm-icon-preview" style="font-size:2rem;">${selectedIcon}</span>
          <input type="text" id="csm-icon-input" value="${selectedIcon}" placeholder="إيموجي" style="max-width:100px;padding:8px 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-app);color:var(--text-main);font-size:1.1rem;outline:none;">
        </div>
        <div class="curr-icon-picker" id="csm-icon-picker">${ICONS.map(ic=>`<button class="curr-icon-opt${ic===selectedIcon?" selected":""}" data-icon="${ic}">${ic}</button>`).join("")}</div>
      </div>
      <div class="curr-fgrp"><label style="display:flex;align-items:center;gap:10px;cursor:pointer;text-transform:none;letter-spacing:0;"><input type="checkbox" id="csm-lang"${subject?.isLanguageTrack?" checked":""} style="width:18px;height:18px;"> مسار لغات (Language Track)</label></div>
      ${isEdit?`<div class="curr-fgrp"><label style="display:flex;align-items:center;gap:10px;cursor:pointer;text-transform:none;letter-spacing:0;"><input type="checkbox" id="csm-active"${subject?.isActive?" checked":""} style="width:18px;height:18px;"> ظاهرة للطلاب والمعلمين</label></div>`:""}
      <div class="curr-modal-footer">
        <button class="curr-btn curr-btn-outline" id="csm-cancel">إلغاء</button>
        <button class="curr-btn curr-btn-primary" id="csm-save"><i data-lucide="save" style="width:14px;height:14px;"></i> ${isEdit?"حفظ التعديلات":"إضافة المادة"}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
    const iconInput=overlay.querySelector("#csm-icon-input"), iconPreview=overlay.querySelector("#csm-icon-preview");
    overlay.querySelector("#csm-icon-picker").querySelectorAll(".curr-icon-opt").forEach(btn=>{
      btn.addEventListener("click",()=>{selectedIcon=btn.getAttribute("data-icon");iconPreview.textContent=selectedIcon;iconInput.value=selectedIcon;overlay.querySelectorAll(".curr-icon-opt").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");});
    });
    iconInput.addEventListener("input",()=>{selectedIcon=iconInput.value||"📖";iconPreview.textContent=selectedIcon;});
    overlay.querySelector("#csm-cancel").addEventListener("click",()=>overlay.remove());
    overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove();});
    overlay.querySelector("#csm-save").addEventListener("click", async()=>{
      const name=overlay.querySelector("#csm-name").value.trim(), nameEn=overlay.querySelector("#csm-name-en").value.trim(), isLanguageTrack=overlay.querySelector("#csm-lang").checked, icon=selectedIcon||"📖", isActive=isEdit?overlay.querySelector("#csm-active").checked:true;
      if(!name){showToast("اسم المادة مطلوب","error");return;}
      const btn=overlay.querySelector("#csm-save"); btn.disabled=true; btn.textContent="جارٍ الحفظ...";
      try{
        if(isEdit){ await apiFetch(`/admin/curriculum/subjects/${subject.id}`,{method:"PUT",body:JSON.stringify({name,nameEn,icon,isLanguageTrack,isActive})}); showToast("تم التعديل ✅","success"); }
        else { await apiFetch(`/admin/curriculum/grades/${grade.id}/subjects`,{method:"POST",body:JSON.stringify({name,nameEn,icon,isLanguageTrack})}); showToast("تمت الإضافة ✅","success"); }
        overlay.remove(); await this.loadGrades(); this.renderPage(); this.bindEvents();
      }catch(err){showToast(err.message||"فشل","error");btn.disabled=false;btn.textContent=isEdit?"حفظ التعديلات":"إضافة المادة";}
    });
  }

  async openClassModal(grade, pkg = null) {
    const isEdit = !!pkg;
    let allGroups = [];
    try {
      allGroups = await apiFetch("/admin/all-groups").catch(() => []);
    } catch (_) {
      allGroups = [];
    }

    // دالة مساعدة لتوحيد النصوص العربية لتفادي أي فروقات في كتابة الهمزات أو التاء المربوطة
    const norm = (s) => (s || '').toString().toLowerCase().replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();

    const gradeId = grade?.id ? String(grade.id) : '';
    const gradeName = (grade?.name || '').trim();
    const gradeNameNorm = norm(gradeName);

    // حصر المجموعات التابعة حصراً لهذا الصف الدراسي فقط ومنع أي مجموعات من صفوف أخرى
    const gradeGroups = (allGroups || []).filter(g => {
      const courseGradeId = g.course?.grade?.id 
        ? String(g.course.grade.id) 
        : (g.course?.subject?.grade?.id ? String(g.course.subject.grade.id) : (g.course?.gradeId ? String(g.course.gradeId) : ''));
      const courseGradeNameNorm = norm(g.course?.grade?.name || g.course?.subject?.grade?.name);
      const courseDegreeNorm = norm(g.course?.degree);
      const groupNameNorm = norm(g.name);

      // 1. مطابقة مباشرة بمعرف الصف الدراسي (Grade ID)
      if (gradeId && courseGradeId && courseGradeId === gradeId) return true;

      // 2. مطابقة بالاسم الرسمي للصف الدراسي
      if (gradeNameNorm && courseGradeNameNorm && (courseGradeNameNorm === gradeNameNorm || courseGradeNameNorm.includes(gradeNameNorm) || gradeNameNorm.includes(courseGradeNameNorm))) return true;

      // 3. مطابقة بنص المرحلة/الصف الدراسي المخزن في الكورس (Course Degree)
      if (gradeNameNorm && courseDegreeNorm && (courseDegreeNorm === gradeNameNorm || courseDegreeNorm.includes(gradeNameNorm) || gradeNameNorm.includes(courseDegreeNorm))) return true;

      // 4. مطابقة إذا كان اسم المجموعة نفسه يتضمن اسم الصف المحدد
      if (gradeNameNorm && groupNameNorm && groupNameNorm.includes(gradeNameNorm)) return true;

      return false;
    });

    // الالتزام التام بالمجموعات التابعة لهذا الصف فقط - دون العودة لكافة مجموعات المنصة
    const groupsList = gradeGroups;
    const selectedGroupIds = (pkg?.groupIds || (pkg?.linkedGroups || []).map(g => g.id)).slice();

    const overlay = document.createElement("div");
    overlay.className = "acp-modal-overlay";
    overlay.innerHTML = `
      <div class="acp-modal-dialog">
        <!-- رأس النافذة الثابت -->
        <div class="acp-modal-header">
          <div class="acp-modal-title-box">
            <div class="acp-modal-title-icon">
              <i data-lucide="${isEdit ? 'edit-3' : 'layers'}" style="width:22px;height:22px;"></i>
            </div>
            <div>
              <h3 class="acp-modal-title">${isEdit ? "تعديل الفصل والباقة الشاملة" : "➕ إنشاء فصل وباقة شاملة جديدة"}${grade ? " — " + grade.name : ""}</h3>
              <p class="acp-modal-subtitle">تجميع مجموعات المواد باشتراك شهري موحد للطالب وأجر ساعة معتمد للمعلمين</p>
            </div>
          </div>
          <button type="button" class="acp-modal-close-btn" id="ccm-close-x" title="إغلاق">✕</button>
        </div>

        <!-- جسم النافذة القابل للتمرير -->
        <div class="acp-modal-body">
          <div class="acp-form-group">
            <label>اسم الفصل / الباقة *</label>
            <input class="acp-form-input" id="ccm-name" type="text" placeholder="مثال: فصل المتفوقين (باقة مجمعة - ${grade?.name || 'الصف الدراسي'})" value="${pkg?.name || ""}">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div class="acp-form-group">
              <label>شارة التمييز (Badge)</label>
              <input class="acp-form-input" id="ccm-badge" type="text" placeholder="مثال: متاح للاشتراك أو الأكثر طلباً" value="${pkg?.badge || "متاح للاشتراك"}">
            </div>
            <div class="acp-form-group">
              <label>الثيم اللوني</label>
              <select class="acp-form-select" id="ccm-theme">
                <option value="blue"${(!pkg || pkg.theme === "blue") ? " selected" : ""}>🔵 أزرق (Blue)</option>
                <option value="green"${pkg?.theme === "green" ? " selected" : ""}>🟢 أخضر (Green)</option>
                <option value="purple"${pkg?.theme === "purple" ? " selected" : ""}>🟣 بنفسجي (Purple)</option>
                <option value="amber"${pkg?.theme === "amber" ? " selected" : ""}>🟡 كهرماني ذهبي (Amber)</option>
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div class="acp-form-group">
              <label>سعر اشتراك الفصل (شهرياً - EGP) *</label>
              <input class="acp-form-input" id="ccm-price-eg" type="text" placeholder="مثال: 1200 جنيه" value="${pkg?.priceEg || ""}">
            </div>
            <div class="acp-form-group">
              <label>السعر بالريال / النص الكامل</label>
              <input class="acp-form-input" id="ccm-price" type="text" placeholder="مثال: 1200 ريال / شهرياً  •  1200 جنيه" value="${pkg?.price || ""}">
            </div>
          </div>

          <!-- اختيار المجموعات المربوطة بالفصل ونظام أجر المعلم بالساعة -->
          <div class="acp-form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label style="margin-bottom:0;">👥 مجموعات المواد التابعة لهذا الفصل</label>
              <span id="ccm-selected-counter" style="font-size:0.78rem; color:#0284c7; font-weight:800; background:rgba(2,132,199,0.1); padding:2px 10px; border-radius:8px;">
                0 مجموعات محددة
              </span>
            </div>
            <p style="font-size:0.77rem; color:var(--text-muted); margin:0 0 10px 0; line-height:1.5;">
              حدد مجموعات المواد التابعة لهذا الفصل. عند اشتراك الطالب يتم تسكينه تلقائياً في كل المجموعات المحددة، ويحصل المعلم على أجر ساعته عند إتمام حصصه بنجاح.
            </p>
            <div style="max-height:190px; overflow-y:auto; border:1.5px solid var(--border-color); border-radius:14px; padding:10px; background:var(--bg-app); display:flex; flex-direction:column; gap:8px;">
              ${groupsList.length > 0 ? groupsList.map(g => {
                const isChecked = selectedGroupIds.includes(g.id);
                const teacherRate = g.teacherHourlyRate || 100;
                const groupGradeLabel = g.course?.grade?.name || g.course?.subject?.grade?.name || g.course?.degree || '';
                return `
                  <label class="acp-group-row ${isChecked ? 'selected' : ''}" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:12px; background:${isChecked ? 'rgba(2,132,199,0.07)' : 'var(--bg-card)'}; border:1.5px solid ${isChecked ? '#0284c7' : 'var(--border-color)'}; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                    <div style="display:flex; align-items:center; gap:11px;">
                      <input type="checkbox" class="ccm-group-check" value="${g.id}" data-rate="${teacherRate}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; accent-color:#0284c7; cursor:pointer;">
                      <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="font-weight:900; font-size:0.88rem; color:var(--text-main);">${g.course?.subject?.name || g.name}</span>
                          ${groupGradeLabel ? `<span class="badge" style="background:rgba(2,132,199,0.1); color:#0284c7; font-size:0.68rem; padding:2px 7px; border-radius:6px; font-weight:700;">🎓 ${groupGradeLabel}</span>` : ''}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                          <strong style="color:var(--text-main);">${g.teacher?.name || g.course?.teacher?.name || 'معلم معتمد'}</strong>
                          ${g.scheduleDays ? `• ${g.scheduleDays} ${g.scheduleTime || ''}` : ''}
                          • ⏱️ ${g.sessionDuration || 40} دقيقة
                        </div>
                      </div>
                    </div>
                    <div style="font-size:0.8rem; font-weight:900; color:#10b981; background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:8px; white-space:nowrap;">
                      ${teacherRate} ج.م/ساعة
                    </div>
                  </label>
                `;
              }).join('') : `
                <div style="font-size:0.84rem; color:var(--text-muted); text-align:center; padding:22px; line-height:1.6;">
                  <i data-lucide="alert-circle" style="width:24px;height:24px;margin-bottom:6px;display:inline-block;color:#f59e0b;"></i><br>
                  لا توجد أي مجموعات مسجلة تابعة لـ (<strong>${grade?.name || 'هذا الصف'}</strong>) حالياً.<br>
                  <span style="font-size:0.76rem; color:var(--text-muted);">يتم حصر المجموعات التابعة لهذا الصف فقط لضمان دقة ربط المواد، ويمكنك إنشاء مجموعة جديدة لهذا الصف من صفحة المجموعات.</span>
                </div>
              `}
            </div>
          </div>

          <!-- صندوق النموذج المالي والربحية -->
          <div style="background:rgba(2, 132, 199, 0.05); border:1.5px solid rgba(2, 132, 199, 0.2); border-radius:16px; padding:12px 16px;">
            <div style="font-size:0.82rem; font-weight:900; color:#0284c7; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="shield-check" style="width:16px;height:16px;"></i>
              <span>النموذج المالي: اشتراك الطالب للمنصة + أجر الساعة للمعلمين</span>
            </div>
            <div style="font-size:0.77rem; color:var(--text-main); line-height:1.5;">
              الطالب يدفع اشتراك الفصل كاملاً للمنصة، وتدفع المنصة للمعلمين أجور ساعاتهم المحددة فقط عن كل حصة مكتملة، مما يضمن أعلى ربحية صافية ومستقرة للمنصة.
            </div>
          </div>

          <div class="acp-form-group">
            <label>نبذة عن الباقة ومميزاتها للطلاب</label>
            <textarea class="acp-form-textarea" id="ccm-desc" rows="2" placeholder="شرح مبسط ومميزات الباقة للطلاب...">${pkg?.description || ""}</textarea>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:center;">
            <div class="acp-form-group">
              <label>ترتيب الظهور</label>
              <input class="acp-form-input" id="ccm-order" type="number" min="0" value="${pkg?.order || 0}">
            </div>
            <div class="acp-form-group" style="padding-top:20px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; text-transform:none;">
                <input type="checkbox" id="ccm-active"${(!pkg || pkg.isActive) ? " checked" : ""} style="width:18px; height:18px; accent-color:#0284c7;">
                <span>مفعل وظاهر للطلاب في الموقع</span>
              </label>
            </div>
          </div>
        </div>

        <!-- شريط الأزرار الثابت -->
        <div class="acp-modal-footer">
          <div id="ccm-footer-summary" style="font-size:0.8rem; font-weight:800; color:var(--text-muted);">
            <!-- يتم تحديثه ديناميكياً -->
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button type="button" class="acp-btn acp-btn-outline" id="ccm-cancel">إلغاء</button>
            <button type="button" class="acp-btn acp-btn-primary" id="ccm-save">
              <i data-lucide="check" style="width:16px;height:16px;"></i>
              <span>${isEdit ? "حفظ التعديلات" : "إضافة الفصل وتأكيد الربط 🚀"}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const counterBadge = overlay.querySelector("#ccm-selected-counter");
    const footerSummary = overlay.querySelector("#ccm-footer-summary");

    const updateSelectionStats = () => {
      const checkedBoxes = Array.from(overlay.querySelectorAll(".ccm-group-check:checked"));
      const count = checkedBoxes.length;
      let totalHourly = 0;
      checkedBoxes.forEach(cb => {
        totalHourly += parseFloat(cb.getAttribute("data-rate")) || 0;
      });

      if (counterBadge) {
        counterBadge.textContent = `${count} مجموعات محددة`;
      }
      if (footerSummary) {
        footerSummary.innerHTML = count > 0 
          ? `تم تحديد <strong style="color:#0284c7;">${count} مواد</strong> • تكلفة الحصة: <strong style="color:#10b981;">${totalHourly} ج.م/ساعة</strong>`
          : `يرجى تحديد مجموعة واحدة على الأقل`;
      }
    };

    overlay.querySelectorAll(".ccm-group-check").forEach(cb => {
      cb.addEventListener("change", e => {
        const row = e.target.closest("label");
        if (row) {
          if (e.target.checked) {
            row.classList.add("selected");
            row.style.background = "rgba(2,132,199,0.07)";
            row.style.borderColor = "#0284c7";
          } else {
            row.classList.remove("selected");
            row.style.background = "var(--bg-card)";
            row.style.borderColor = "var(--border-color)";
          }
        }
        updateSelectionStats();
      });
    });

    updateSelectionStats();

    const closeModal = () => overlay.remove();
    overlay.querySelector("#ccm-close-x")?.addEventListener("click", closeModal);
    overlay.querySelector("#ccm-cancel")?.addEventListener("click", closeModal);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    overlay.querySelector("#ccm-save").addEventListener("click", async () => {
      const name = overlay.querySelector("#ccm-name").value.trim();
      const badge = overlay.querySelector("#ccm-badge").value.trim();
      const priceEg = overlay.querySelector("#ccm-price-eg").value.trim();
      const price = overlay.querySelector("#ccm-price").value.trim();
      const theme = overlay.querySelector("#ccm-theme").value;
      const description = overlay.querySelector("#ccm-desc").value.trim();
      const order = parseInt(overlay.querySelector("#ccm-order").value) || 0;
      const isActive = overlay.querySelector("#ccm-active").checked;

      const groupCheckboxes = overlay.querySelectorAll(".ccm-group-check:checked");
      const groupIds = Array.from(groupCheckboxes).map(cb => cb.value);

      if (!name) {
        showToast("اسم الفصل أو الباقة مطلوب", "error");
        return;
      }

      const saveBtn = overlay.querySelector("#ccm-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "جارٍ الحفظ...";

      const payload = {
        name,
        badge,
        priceEg,
        price: price || (priceEg ? `${priceEg} / شهرياً` : ""),
        theme,
        description,
        order,
        isActive,
        groupIds
      };

      try {
        if (isEdit) {
          await apiFetch(`/admin/curriculum/classes/${pkg.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("تم تحديث بيانات الفصل والمجموعات المربوطة بنجاح ✅", "success");
        } else {
          await apiFetch(`/admin/curriculum/grades/${grade.id}/classes`, {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("تمت إضافة الفصل وربط مجموعاته بنجاح 🚀", "success");
        }
        overlay.remove();
        await this.loadGrades();
        this.renderPage();
        this.bindEvents();
      } catch (err) {
        showToast(err.message || "فشلت العملية", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? "حفظ التعديلات" : "إضافة الفصل وتأكيد الربط";
      }
    });
  }

  // نافذة تسكين طالب في جميع مجموعات الفصل معاً بنقرة واحدة
  async openEnrollStudentModal(pkg) {
    let allUsers = [];
    try {
      allUsers = await apiFetch("/admin/users").catch(() => []);
    } catch (_) {
      allUsers = [];
    }

    const students = (allUsers || []).filter(u => u.role === "student");
    const linkedGroups = pkg.linkedGroups || [];

    if (linkedGroups.length === 0) {
      showToast("يرجى ربط مجموعات بهذا الفصل أولاً قبل تسكين الطلاب.", "error");
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "curr-modal-overlay";
    overlay.innerHTML = `
      <div class="curr-modal" style="max-width:540px;">
        <h3>🎓 تسكين طالب في فصل: ${pkg.name}</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin:-14px 0 16px 0;">
          سيتم تسكين الطالب تلقائياً في جميع مجموعات الفصل المربوطة (${linkedGroups.length} مجموعات: ${linkedGroups.map(g => g.course?.subject?.name || g.name).join('، ')}).
        </p>

        <div class="curr-fgrp">
          <label>اختر الطالب *</label>
          <select id="ces-student-id">
            <option value="">-- اختر طالباً من المنصة (${students.length} طالب) --</option>
            ${students.map(s => `
              <option value="${s.id}">${s.name} ${s.phone ? `(${s.phone})` : ''} - ${s.email || ''}</option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="curr-fgrp">
            <label>مبلغ اشتراك الفصل (EGP)</label>
            <input id="ces-amount" type="number" placeholder="المبلغ المدفوع" value="${parseInt(pkg.priceEg) || 1200}">
          </div>
          <div class="curr-fgrp">
            <label>خطة السداد</label>
            <select id="ces-plan">
              <option value="PAID">مسدد بالكامل (PAID)</option>
              <option value="PARTIAL">دفعة جزئية (PARTIAL)</option>
              <option value="POSTPONED">سيدفع لاحقاً (POSTPONED)</option>
            </select>
          </div>
        </div>

        <div class="curr-fgrp">
          <label>طريقة الدفع / التحويل</label>
          <select id="ces-provider">
            <option value="VODAFONE_CASH">فودافون كاش / محافظ إلكترونية</option>
            <option value="INSTAPAY">انستاباي (InstaPay)</option>
            <option value="BANK_TRANSFER">تحويل بنكي</option>
            <option value="CASH">نقدي باليد</option>
          </select>
        </div>

        <div class="curr-fgrp">
          <label>رابط أو مسار صورة الإيصال (اختياري)</label>
          <input id="ces-receipt" type="text" placeholder="رابط صورة التحويل أو الإيصال">
        </div>

        <div class="curr-fgrp">
          <label>ملاحظات إدارية</label>
          <input id="ces-notes" type="text" placeholder="مثال: اشتراك شهري في باقة الفصل المجمعة">
        </div>

        <div class="curr-modal-footer">
          <button type="button" class="curr-btn curr-btn-outline" id="ces-cancel">إلغاء</button>
          <button type="button" class="curr-btn curr-btn-primary" id="ces-save" style="background:linear-gradient(135deg, #10b981, #059669);">
            <i data-lucide="check-circle" style="width:14px;height:14px;"></i>
            <span>تسكين في كل المجموعات (${linkedGroups.length}) 🚀</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector("#ces-cancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#ces-save").addEventListener("click", async () => {
      const studentId = overlay.querySelector("#ces-student-id").value;
      const amount = parseFloat(overlay.querySelector("#ces-amount").value) || 0;
      const paymentPlan = overlay.querySelector("#ces-plan").value;
      const provider = overlay.querySelector("#ces-provider").value;
      const receiptUrl = overlay.querySelector("#ces-receipt").value.trim();
      const notes = overlay.querySelector("#ces-notes").value.trim();

      if (!studentId) {
        showToast("يرجى اختيار الطالب أولاً", "error");
        return;
      }

      const saveBtn = overlay.querySelector("#ces-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "جارٍ تسكين الطالب في جميع المجموعات...";

      try {
        const res = await apiFetch(`/admin/curriculum/classes/${pkg.id}/enroll-student`, {
          method: "POST",
          body: JSON.stringify({
            studentId,
            amount,
            paymentPlan,
            provider,
            receiptUrl,
            notes
          })
        });
        showToast(res.message || "تم تسكين الطالب بنجاح في جميع مجموعات الفصل! 🎉", "success");
        overlay.remove();
        await this.loadGrades();
        this.renderPage();
        this.bindEvents();
      } catch (err) {
        showToast(err.message || "فشل تسكين الطالب", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = `تسكين في كل المجموعات (${linkedGroups.length}) 🚀`;
      }
    });
  }
}
