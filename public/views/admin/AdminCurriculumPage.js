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
      if (q) subjects = subjects.filter(s => s.name?.toLowerCase().includes(q) || s.nameEn?.toLowerCase().includes(q) || grade.name?.toLowerCase().includes(q));
      const activeCount = subjects.filter(s => s.isActive).length;
      const open = idx < 2;
      return `<div class="curr-grade-card" data-grade-id="${grade.id}">
        <div class="curr-grade-header" data-toggle-grade="${grade.id}">
          <div class="curr-grade-icon">🎒</div>
          <div><div class="curr-grade-name">${grade.name}</div><div class="curr-grade-meta">${grade.nameEn||""} • ${subjects.length} مادة (${activeCount} ظاهرة)</div></div>
          <div class="curr-grade-actions">
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);background:var(--bg-app);padding:4px 10px;border-radius:20px;border:1px solid var(--border-color);">${grade.code||grade.stage}</span>
            <button class="curr-sub-btn danger curr-delete-grade-btn" data-grade-id="${grade.id}" data-grade-name="${grade.name}"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
            <i data-lucide="chevron-down" style="width:18px;height:18px;" class="curr-toggle-icon${open?" rotated":""}" id="ti-${grade.id}"></i>
          </div>
        </div>
        <div id="gp-${grade.id}" ${open?'':'style="display:none"'}>
          <div class="curr-subjects-grid">
            ${subjects.map(sub => this.renderSubjectCard(sub)).join("")}
            <div class="curr-add-subject-card" data-add-subject="${grade.id}">
              <i data-lucide="plus-circle" style="width:28px;height:28px;"></i>
              <span>إضافة مادة</span>
            </div>
          </div>
        </div>
      </div>`;
    }).join("");
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
}
