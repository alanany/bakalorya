import { apiFetch, state, showToast, t } from "../../app.js";
import { AssignmentGradingModal } from "../shared/AssignmentGradingModal.js";
import { AssignmentDetailsModal } from "../shared/AssignmentDetailsModal.js";

export default class TeacherAssignmentsReviewView {
  constructor(container) {
    this.container = container;
    this.data = null;
    this.activeFilter = "all"; // 'all', 'pending', 'not_delivered', 'completed'
    this.searchQuery = "";
    this.expandedAssignmentIds = new Set();
  }

  async render() {
    try {
      if (!state.user || (state.user.role !== 'teacher' && state.user.role !== 'admin')) {
        window.location.hash = "#teacher-portal";
        return;
      }

      this.container.innerHTML = `
        <div style="max-width:1400px; margin:0 auto; padding:28px 20px 80px; box-sizing:border-box;">
          
          <!-- Top Breadcrumb & Actions Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:var(--text-muted);">
              <a href="#teacher-portal" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="home" style="width:14px; height:14px;"></i> لوحة المعلم
              </a>
              <span>/</span>
              <span style="color:var(--primary); font-weight:800;">متابعة وتصحيح الواجبات</span>
            </div>

            <div style="display:flex; align-items:center; gap:10px;">
              <a href="#teacher-portal" class="btn-secondary" style="font-size:0.82rem; font-weight:800; padding:8px 16px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="arrow-right" style="width:14px; height:14px;"></i> العودة للرئيسية
              </a>
              <a href="#assignments" class="btn-primary" style="font-size:0.82rem; font-weight:800; padding:8px 18px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #8b5cf6, #7c3aed);">
                <i data-lucide="plus-circle" style="width:15px; height:15px;"></i> إضافة واجب جديد ➕
              </a>
            </div>
          </div>

          <!-- Hero Banner -->
          <div class="glass-card" style="position:relative; overflow:hidden; border-radius:24px; padding:28px 32px; margin-bottom:28px; background:linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(79,70,229,0.08) 50%, rgba(245,158,11,0.06) 100%); border:1px solid rgba(139,92,246,0.25);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
              <div>
                <span class="badge" style="background:rgba(139,92,246,0.15); color:#8b5cf6; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; margin-bottom:8px;">
                  <i data-lucide="sparkles" style="width:13px; height:13px;"></i> نظام المتابعة الفورية والتصحيح
                </span>
                <h1 style="font-size:1.85rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main);">
                  📋 متابعة الواجبات والتسليمات المدرسية
                </h1>
                <p style="color:var(--text-muted); font-size:0.92rem; margin:0; max-width:700px; line-height:1.5;">
                  متابعة شاملة لآخر الواجبات المنشورة، رصد الإجابات بانتظار التصحيح، ومتابعة دقيقة للطلاب الذين لم يسلّموا بعد مع إمكانية التصحيح الفوري.
                </p>
              </div>
            </div>
          </div>

          <!-- Metric Stats Grid (Populated dynamically) -->
          <div id="review-metrics-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:18px; margin-bottom:28px;">
            <div style="text-align:center; padding:30px; grid-column:1 / -1;">
              <i data-lucide="loader" class="spinner" style="width:36px; height:36px; margin:0 auto;"></i>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="glass-card" style="padding:14px 20px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:24px;">
            
            <!-- Filter Pills -->
            <div id="review-filter-tabs" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <button class="tab-btn active" data-filter="all" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.83rem; cursor:pointer;">
                🌟 الكل
              </button>
              <button class="tab-btn" data-filter="pending" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.83rem; cursor:pointer;">
                ⏳ بانتظار التصحيح
              </button>
              <button class="tab-btn" data-filter="not_delivered" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.83rem; cursor:pointer;">
                ⚠️ طلاب لم يسلّموا
              </button>
              <button class="tab-btn" data-filter="completed" style="padding:7px 16px; border-radius:12px; font-weight:800; font-size:0.83rem; cursor:pointer;">
                ✅ مكتملة التصحيح
              </button>
            </div>

            <!-- Search Box -->
            <div style="position:relative; min-width:260px; flex:1; max-width:380px;">
              <i data-lucide="search" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
              <input type="text" id="review-search-input" class="form-input" placeholder="بحث بعنوان الواجب أو المجموعة..." style="padding-right:38px; height:38px; font-size:0.85rem; border-radius:12px;">
            </div>

          </div>

          <!-- Main Assignments List Container -->
          <div id="review-assignments-list" style="display:flex; flex-direction:column; gap:20px;">
            <div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
              <i data-lucide="loader" class="spinner" style="width:40px; height:40px; margin:0 auto 12px;"></i>
              <div>جاري تحميل بيانات الواجبات والتسليمات...</div>
            </div>
          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      await this.loadContent();
    } catch (err) {
      console.error("Error rendering TeacherAssignmentsReviewView:", err);
    }
  }

  async loadContent() {
    try {
      this.data = await apiFetch("/assignments/teacher-review");
      this.renderMetrics();
      this.renderAssignments();
      this.bindEvents();
    } catch (err) {
      console.error("Failed to load assignments review data:", err);
      const listContainer = this.container.querySelector("#review-assignments-list");
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="glass-card" style="text-align:center; padding:40px; color:var(--error); border-radius:20px;">
            فشل تحميل بيانات الواجبات والتسليمات. يرجى إعادة المحاولة.
          </div>
        `;
      }
    }
  }

  renderMetrics() {
    const metricsContainer = this.container.querySelector("#review-metrics-container");
    if (!metricsContainer || !this.data) return;

    const stats = this.data.stats || {
      totalAssignments: 0,
      totalSubmissions: 0,
      totalGraded: 0,
      totalPendingGrading: 0,
      totalNotDelivered: 0
    };

    metricsContainer.innerHTML = `
      <!-- Stat 1: Total Assignments -->
      <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px;">
        <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(79,70,229,0.15), rgba(79,70,229,0.05)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i data-lucide="clipboard-list" style="width:26px; height:26px;"></i>
        </div>
        <div>
          <div style="font-size:1.6rem; font-weight:900; color:var(--text-main); line-height:1.1;">
            ${stats.totalAssignments}
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
            إجمالي الواجبات المنشورة
          </div>
        </div>
      </div>

      <!-- Stat 2: Pending Grading (Highlight) -->
      <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid ${stats.totalPendingGrading > 0 ? 'rgba(245,158,11,0.4)' : 'var(--border-color)'}; background:${stats.totalPendingGrading > 0 ? 'linear-gradient(135deg, rgba(245,158,11,0.06), var(--bg-card))' : 'var(--bg-card)'}; display:flex; align-items:center; gap:16px;">
        <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.06)); color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i data-lucide="hourglass" style="width:26px; height:26px;"></i>
        </div>
        <div>
          <div style="font-size:1.6rem; font-weight:900; color:${stats.totalPendingGrading > 0 ? '#b45309' : 'var(--text-main)'}; line-height:1.1; display:flex; align-items:center; gap:8px;">
            <span>${stats.totalPendingGrading}</span>
            ${stats.totalPendingGrading > 0 ? `<span style="font-size:0.7rem; font-weight:900; background:rgba(245,158,11,0.15); color:#d97706; padding:2px 8px; border-radius:6px;">بانتظار رصد الدرجات ⏳</span>` : ''}
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
            حلول تنتظر التصحيح
          </div>
        </div>
      </div>

      <!-- Stat 3: Not Delivered (Missing Submissions) -->
      <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid ${stats.totalNotDelivered > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}; background:${stats.totalNotDelivered > 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.04), var(--bg-card))' : 'var(--bg-card)'}; display:flex; align-items:center; gap:16px;">
        <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05)); color:#ef4444; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i data-lucide="user-x" style="width:26px; height:26px;"></i>
        </div>
        <div>
          <div style="font-size:1.6rem; font-weight:900; color:${stats.totalNotDelivered > 0 ? '#ef4444' : 'var(--text-main)'}; line-height:1.1; display:flex; align-items:center; gap:8px;">
            <span>${stats.totalNotDelivered}</span>
            ${stats.totalNotDelivered > 0 ? `<span style="font-size:0.7rem; font-weight:900; background:rgba(239,68,68,0.12); color:#ef4444; padding:2px 8px; border-radius:6px;">تأخر في التسليم ⚠️</span>` : ''}
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
            طلاب لم يسلّموا بعد
          </div>
        </div>
      </div>

      <!-- Stat 4: Graded Submissions -->
      <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px;">
        <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05)); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <i data-lucide="check-check" style="width:26px; height:26px;"></i>
        </div>
        <div>
          <div style="font-size:1.6rem; font-weight:900; color:#10b981; line-height:1.1;">
            ${stats.totalGraded}
          </div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
            تم تصحيحها ورصد درجاتها 🏆
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderAssignments() {
    const listContainer = this.container.querySelector("#review-assignments-list");
    if (!listContainer || !this.data) return;

    let assignments = this.data.assignments || [];

    // Filter by Tab
    if (this.activeFilter === "pending") {
      assignments = assignments.filter(a => (a.pendingGradingCount || 0) > 0);
    } else if (this.activeFilter === "not_delivered") {
      assignments = assignments.filter(a => (a.notDeliveredCount || 0) > 0);
    } else if (this.activeFilter === "completed") {
      assignments = assignments.filter(a => (a.submissionsCount || 0) > 0 && (a.pendingGradingCount || 0) === 0);
    }

    // Filter by Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      assignments = assignments.filter(a => 
        (a.title || "").toLowerCase().includes(q) ||
        (a.course?.title || "").toLowerCase().includes(q) ||
        (a.group?.name || "").toLowerCase().includes(q)
      );
    }

    if (assignments.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:60px 24px; color:var(--text-muted); border-radius:22px; background:var(--bg-card); border:1px dashed var(--border-color);">
          <div style="width:64px; height:64px; border-radius:20px; background:rgba(139,92,246,0.1); color:#8b5cf6; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
            <i data-lucide="clipboard-check" style="width:32px; height:32px;"></i>
          </div>
          <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0;">لا توجد واجبات تطابق هذا التصفية</h3>
          <p style="font-size:0.86rem; margin:0 0 16px 0;">يمكنك تغيير خيارات التصفية أو البحث عن واجب آخر.</p>
          <button class="btn-secondary reset-filter-btn" style="padding:8px 18px; border-radius:12px; font-weight:800; font-size:0.83rem;">
            عرض جميع الواجبات
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      listContainer.querySelector(".reset-filter-btn")?.addEventListener("click", () => {
        this.activeFilter = "all";
        this.container.querySelectorAll("#review-filter-tabs .tab-btn").forEach(b => {
          b.classList.toggle("active", b.getAttribute("data-filter") === "all");
        });
        this.renderAssignments();
      });
      return;
    }

    listContainer.innerHTML = assignments.map(asgn => this.renderAssignmentItem(asgn)).join("");
    if (window.lucide) window.lucide.createIcons();
    this.bindAssignmentActions();
  }

  renderAssignmentItem(asgn) {
    const isExpanded = this.expandedAssignmentIds.has(asgn.id);
    const dueDate = asgn.dueDate ? new Date(asgn.dueDate) : null;
    const isOverdue = dueDate && (new Date() > dueDate);
    const dueDateStr = dueDate ? dueDate.toLocaleDateString('ar-EG', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'غير محدد';
    const qCount = Array.isArray(asgn.questions) ? asgn.questions.length : 0;
    const totalPts = asgn.totalPoints || 100;

    const totalStudents = asgn.totalStudentsCount || 0;
    const subCount = asgn.submissionsCount || 0;
    const gradCount = asgn.gradedCount || 0;
    const pendingGrading = asgn.pendingGradingCount || 0;
    const notDeliveredCount = asgn.notDeliveredCount || 0;

    // Proportion calculation for visual progress bar
    const gradedPct = totalStudents > 0 ? Math.round((gradCount / totalStudents) * 100) : (subCount > 0 && pendingGrading === 0 ? 100 : 0);
    const pendingPct = totalStudents > 0 ? Math.round((pendingGrading / totalStudents) * 100) : 0;
    const notDeliveredPct = Math.max(0, 100 - gradedPct - pendingPct);

    return `
      <div class="glass-card review-assignment-card" id="asgn-card-${asgn.id}" style="border-radius:22px; border:1px solid ${pendingGrading > 0 ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}; background:var(--bg-card); overflow:hidden; transition:all 0.2s; box-shadow:0 6px 22px rgba(0,0,0,0.03);">
        
        <!-- Card Top Bar -->
        <div style="padding:22px 26px; display:flex; flex-direction:column; gap:16px;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                <span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:10px; border:1px solid rgba(99,102,241,0.2);">
                  ${asgn.group?.name ? `👥 مجموعة: ${asgn.group.name}` : (asgn.course?.title || 'واجب دراسي عام')}
                </span>

                <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="help-circle" style="width:13px; height:13px;"></i> ${qCount} أسئلة
                </span>
                
                <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                  <i data-lucide="award" style="width:13px; height:13px;"></i> ${totalPts} درجة
                </span>

                ${asgn.type === 'mcq' ? `<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:8px;">تصحيح آلي MCQ</span>` : ''}
              </div>

              <h3 style="font-size:1.25rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); line-height:1.35;">
                ${asgn.title}
              </h3>

              ${asgn.description ? `<p style="font-size:0.83rem; color:var(--text-muted); margin:0; max-width:800px; line-height:1.4;">${asgn.description}</p>` : ''}
            </div>

            <!-- Due Date & Expiry Tag -->
            <div style="text-align:inline-end;">
              <div style="font-size:0.82rem; font-weight:800; color:${isOverdue ? '#ef4444' : 'var(--text-main)'}; display:inline-flex; align-items:center; gap:6px; background:var(--bg-app); padding:6px 12px; border-radius:12px; border:1px solid var(--border-color);">
                <i data-lucide="clock" style="width:14px; height:14px; color:${isOverdue ? '#ef4444' : 'var(--primary)'};"></i>
                <span>موعد التسليم: ${dueDateStr}</span>
                ${isOverdue ? `<span style="font-size:0.68rem; font-weight:900; background:rgba(239,68,68,0.12); color:#ef4444; padding:1px 6px; border-radius:6px;">منتهي ⌛</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Visual Progress & Delivery Bar -->
          <div style="background:var(--bg-app); border-radius:16px; padding:14px 18px; border:1px solid var(--border-color);">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:0.8rem; font-weight:800;">
                <span style="color:var(--text-main); display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="users" style="width:14px; height:14px; color:var(--primary);"></i>
                  <span>إجمالي الطلاب: <strong>${totalStudents}</strong></span>
                </span>
                <span style="color:#10b981; display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="check-circle" style="width:14px; height:14px;"></i>
                  <span>المصحح: <strong>${gradCount}</strong></span>
                </span>
                <span style="color:#d97706; display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="hourglass" style="width:14px; height:14px;"></i>
                  <span>بانتظار التصحيح: <strong>${pendingGrading}</strong></span>
                </span>
                <span style="color:#ef4444; display:inline-flex; align-items:center; gap:5px;">
                  <i data-lucide="user-x" style="width:14px; height:14px;"></i>
                  <span>لم يسلّم: <strong>${notDeliveredCount}</strong></span>
                </span>
              </div>

              ${pendingGrading > 0 ? `
                <span style="font-size:0.75rem; font-weight:900; background:rgba(245,158,11,0.15); color:#d97706; padding:3px 10px; border-radius:8px; border:1px solid rgba(245,158,11,0.3);">
                  ${pendingGrading} حل بحاجة للتصحيح ⏳
                </span>
              ` : notDeliveredCount > 0 ? `
                <span style="font-size:0.75rem; font-weight:800; background:rgba(239,68,68,0.1); color:#ef4444; padding:3px 10px; border-radius:8px;">
                  ${notDeliveredCount} طلاب متأخرين ⚠️
                </span>
              ` : `
                <span style="font-size:0.75rem; font-weight:900; background:rgba(16,185,129,0.15); color:#10b981; padding:3px 10px; border-radius:8px;">
                  مكتمل بنسبة 100% 🏆
                </span>
              `}
            </div>

            <!-- Proportional Multi-Segment Bar -->
            <div style="height:8px; width:100%; border-radius:6px; background:rgba(0,0,0,0.06); display:flex; overflow:hidden;">
              <div style="height:100%; width:${gradedPct}%; background:#10b981; transition:width 0.3s;" title="مصحح: ${gradCount}"></div>
              <div style="height:100%; width:${pendingPct}%; background:#f59e0b; transition:width 0.3s;" title="بانتظار التصحيح: ${pendingGrading}"></div>
              <div style="height:100%; width:${notDeliveredPct}%; background:rgba(239,68,68,0.35); transition:width 0.3s;" title="لم يتم التسليم: ${notDeliveredCount}"></div>
            </div>

          </div>

          <!-- Action Buttons Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-top:4px;">
            
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <button class="btn-primary start-grading-btn" data-id="${asgn.id}" data-title="${asgn.title}" data-total="${totalPts}"
                style="padding:8px 18px; border-radius:12px; font-size:0.83rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:linear-gradient(135deg, var(--primary), #8b5cf6);">
                <i data-lucide="check-square" style="width:15px; height:15px;"></i>
                <span>التصحيح الفوري ورصد الدرجات 🎯</span>
              </button>

              <button class="btn-secondary toggle-students-btn" data-id="${asgn.id}"
                style="padding:8px 16px; border-radius:12px; font-size:0.83rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:15px; height:15px;"></i>
                <span>${isExpanded ? 'إخفاء تفاصيل الطلاب' : `عرض قائمة الطلاب والتسليمات (${totalStudents}) 👥`}</span>
              </button>
            </div>

            <div>
              <button class="btn-secondary view-questions-btn" data-id="${asgn.id}"
                style="padding:8px 14px; border-radius:12px; font-size:0.8rem; font-weight:700; color:var(--text-muted); display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <i data-lucide="file-text" style="width:14px; height:14px;"></i>
                <span>تفاصيل وأسئلة الواجب 📋</span>
              </button>
            </div>

          </div>

        </div>

        <!-- Expandable Students & Delivery Roster Drawer -->
        ${isExpanded ? `
          <div style="border-top:1px solid var(--border-color); background:rgba(0,0,0,0.015); padding:22px 26px;">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">
              
              <!-- Column 1: Delivered Submissions (الطلاب الذين قاموا بالتسليم) -->
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h4 style="font-size:0.95rem; font-weight:900; margin:0; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                    <i data-lucide="check-circle-2" style="width:16px; height:16px; color:#10b981;"></i>
                    <span>قاموا بالتسليم (${(asgn.delivered || []).length})</span>
                  </h4>
                  <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">${pendingGrading} ينتظر التصحيح</span>
                </div>

                ${(!asgn.delivered || asgn.delivered.length === 0) ? `
                  <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.83rem; background:var(--bg-app); border-radius:14px; border:1px dashed var(--border-color);">
                    لا توجد تسليمات مسجلة حتى الآن لهذا الواجب.
                  </div>
                ` : `
                  <div style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-inline-end:4px;">
                    ${asgn.delivered.map(sub => {
                      const isGraded = sub.status === 'graded';
                      const isDraft = sub.status === 'draft_graded';
                      const subTime = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
                      return `
                        <div style="background:var(--bg-card); padding:12px 14px; border-radius:14px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap:10px;">
                          <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${sub.student?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sub.student?.name || 'طالب')}`}" style="width:36px; height:36px; border-radius:10px; background:var(--bg-app);" />
                            <div>
                              <div style="font-weight:900; font-size:0.88rem; color:var(--text-main);">${sub.student?.name || 'طالب'}</div>
                              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:1px;">سُلّم: ${subTime}</div>
                            </div>
                          </div>

                          <div style="display:flex; align-items:center; gap:8px;">
                            ${isGraded ? `
                              <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:8px;">
                                ✅ ${sub.grade !== null ? `${sub.grade}/${totalPts}` : 'مصحح'}
                              </span>
                            ` : isDraft ? `
                              <span class="badge" style="background:rgba(245,158,11,0.12); color:#d97706; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:8px;">
                                📝 مسودة ${sub.grade !== null ? `(${sub.grade})` : ''}
                              </span>
                            ` : `
                              <span class="badge" style="background:rgba(245,158,11,0.15); color:#d97706; font-weight:900; font-size:0.75rem; padding:3px 8px; border-radius:8px;">
                                ⏳ ينتظر التصحيح
                              </span>
                            `}

                            <button class="btn-secondary direct-grade-btn" data-asgn-id="${asgn.id}" data-asgn-title="${asgn.title}" data-total="${totalPts}" data-sub-id="${sub.id}"
                              style="padding:4px 10px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;" title="تصحيح إجابة هذا الطالب فوراً">
                              تصحيح 🎯
                            </button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}
              </div>

              <!-- Column 2: Not Delivered (الطلاب الذين لم يقوموا بالتسليم بعد) -->
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h4 style="font-size:0.95rem; font-weight:900; margin:0; color:#ef4444; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="alert-triangle" style="width:16px; height:16px;"></i>
                    <span>لم يقوموا بالتسليم بعد (${(asgn.notDelivered || []).length})</span>
                  </h4>
                  <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">غير مسلّمين</span>
                </div>

                ${(!asgn.notDelivered || asgn.notDelivered.length === 0) ? `
                  <div style="padding:24px; text-align:center; color:#10b981; font-size:0.83rem; background:rgba(16,185,129,0.04); border-radius:14px; border:1px dashed rgba(16,185,129,0.3); font-weight:800;">
                    🎉 رائع! جميع الطلاب المسجلين قاموا بتسليم حل هذا الواجب.
                  </div>
                ` : `
                  <div style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding-inline-end:4px;">
                    ${asgn.notDelivered.map(st => {
                      return `
                        <div style="background:var(--bg-card); padding:12px 14px; border-radius:14px; border:1px solid rgba(239,68,68,0.2); display:flex; justify-content:space-between; align-items:center; gap:10px;">
                          <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${st.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(st.name || 'طالب')}`}" style="width:36px; height:36px; border-radius:10px; background:var(--bg-app);" />
                            <div>
                              <div style="font-weight:900; font-size:0.88rem; color:var(--text-main);">${st.name}</div>
                              <div style="font-size:0.72rem; color:var(--text-muted);">${st.phone || st.email || 'طالب مسجل بالمجموعة'}</div>
                            </div>
                          </div>

                          <div>
                            <span class="badge" style="background:rgba(239,68,68,0.1); color:#ef4444; font-size:0.73rem; font-weight:800; padding:4px 9px; border-radius:8px; border:1px solid rgba(239,68,68,0.2);">
                              ${isOverdue ? 'تأخر عن الموعد ⌛' : 'لم يسلّم بعد ⚠️'}
                            </span>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}
              </div>

            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  bindEvents() {
    // Tab filtering
    const tabBtns = this.container.querySelectorAll("#review-filter-tabs .tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeFilter = btn.getAttribute("data-filter") || "all";
        this.renderAssignments();
      });
    });

    // Search input
    const searchInput = this.container.querySelector("#review-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value || "";
        this.renderAssignments();
      });
    }
  }

  bindAssignmentActions() {
    // Start grading modal button
    this.container.querySelectorAll(".start-grading-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        const title = btn.getAttribute("data-title") || "الواجب الدراسي";
        const total = parseFloat(btn.getAttribute("data-total")) || 100;
        const modal = new AssignmentGradingModal(id, title, total, () => this.loadContent());
        modal.open();
      });
    });

    // Direct student grading button inside drawer
    this.container.querySelectorAll(".direct-grade-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const asgnId = parseInt(btn.getAttribute("data-asgn-id"), 10);
        const title = btn.getAttribute("data-asgn-title") || "الواجب الدراسي";
        const total = parseFloat(btn.getAttribute("data-total")) || 100;
        const subId = parseInt(btn.getAttribute("data-sub-id"), 10);

        const modal = new AssignmentGradingModal(asgnId, title, total, () => this.loadContent());
        modal.open();
        // Automatically select the chosen student submission
        setTimeout(() => {
          if (modal.selectSubmission && subId) {
            modal.selectSubmission(subId);
          }
        }, 300);
      });
    });

    // Toggle students drawer
    this.container.querySelectorAll(".toggle-students-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        if (this.expandedAssignmentIds.has(id)) {
          this.expandedAssignmentIds.delete(id);
        } else {
          this.expandedAssignmentIds.add(id);
        }
        this.renderAssignments();
      });
    });

    // View assignment details & questions modal
    this.container.querySelectorAll(".view-questions-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        const asgn = (this.data?.assignments || []).find(a => a.id === id);
        if (asgn) {
          const modal = new AssignmentDetailsModal(asgn, () => this.loadContent());
          modal.open();
        }
      });
    });
  }

  onDestroy() {}
}
