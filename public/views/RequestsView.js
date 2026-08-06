import { apiFetch, state, showToast, t, checkPendingRequestsNotification } from "../app.js";

export default class RequestsView {
  constructor(container) {
    this.container = container;
    this.requests = [];
    this.currentFilter = "pending"; // 'pending', 'active', 'rejected', 'all'
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1440px; margin:0 auto; padding:40px 24px; height:100%; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 class="dashboard-section-title" style="font-size:2rem; margin:0;">
              <i data-lucide="user-check"></i> ${t("nav.teacher.requests") || "طلبات التسجيل"}
            </h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">
              إدارة طلبات الانضمام للدورات والتواصل المباشر مع الطلاب
            </p>
          </div>

          <!-- Filter Tabs -->
          <div style="display:flex; gap:8px; background:var(--bg-app); border:1px solid var(--border-color); padding:4px; border-radius:50px;">
            <button class="btn-secondary filter-tab-btn ${this.currentFilter === 'pending' ? 'active' : ''}" data-filter="pending" style="padding:6px 16px; font-size:0.85rem; border-radius:50px; border:none;">
              قيد الانتظار (Pending)
            </button>
            <button class="btn-secondary filter-tab-btn ${this.currentFilter === 'active' ? 'active' : ''}" data-filter="active" style="padding:6px 16px; font-size:0.85rem; border-radius:50px; border:none;">
              المقبولة (Accepted)
            </button>
            <button class="btn-secondary filter-tab-btn ${this.currentFilter === 'rejected' ? 'active' : ''}" data-filter="rejected" style="padding:6px 16px; font-size:0.85rem; border-radius:50px; border:none;">
              المرفوضة (Refused)
            </button>
            <button class="btn-secondary filter-tab-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:6px 16px; font-size:0.85rem; border-radius:50px; border:none;">
              الكل (All)
            </button>
          </div>
        </div>

        <div class="glass-card" style="padding:24px; flex-grow:1;">
          <div id="requests-list-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:20px;">
            <div style="text-align:center; padding:40px; grid-column:1/-1;">
              <i data-lucide="loader" class="spinner" style="width:40px;height:40px;border-width:3px;margin:0 auto;"></i>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    await this.loadRequests();
  }

  async loadRequests() {
    try {
      this.requests = await apiFetch("/teacher/enrollment-requests");
      this.renderList();
    } catch (error) {
      console.error("Failed to load enrollment requests:", error);
      const container = this.container.querySelector("#requests-list-container");
      if (container) {
        container.innerHTML = `<div style="text-align:center; color:var(--error); padding:40px; grid-column:1/-1;">فشل تحميل طلبات التسجيل. (Failed to load requests)</div>`;
      }
    }
  }

  renderList() {
    const container = this.container.querySelector("#requests-list-container");
    if (!container) return;

    let filtered = this.requests || [];
    if (this.currentFilter !== "all") {
      filtered = filtered.filter(r => r.status === this.currentFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:50px 20px; grid-column:1/-1;">
          <i data-lucide="user-x" style="width:48px; height:48px; margin-bottom:12px; color:var(--border-color);"></i>
          <h4 style="font-weight:700; margin-bottom:4px;">لا يوجد طلبات في هذه الفئة</h4>
          <p style="font-size:0.85rem;">No enrollment requests found for this filter.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map(req => this.renderRequestCard(req)).join("");
    if (window.lucide) window.lucide.createIcons();
    this.bindActionButtons();
  }

  renderRequestCard(req) {
    const rawPhone = req.student?.phone || '';
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const cleanPhoneWa = cleanPhone.replace('+', '');
    const isPending = req.status === "pending";
    const isAccepted = req.status === "active";
    const isRejected = req.status === "rejected";

    let statusBadge = `<span style="background:var(--warning-glow); color:var(--warning); padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">قيد الانتظار</span>`;
    if (isAccepted) statusBadge = `<span style="background:var(--success-glow); color:var(--success); padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">مقبول (Accepted)</span>`;
    if (isRejected) statusBadge = `<span style="background:rgba(239,68,68,0.15); color:var(--error); padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">مرفوض (Refused)</span>`;

    return `
      <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:14px; border:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <div style="display:flex; gap:12px; align-items:center;">
            <img src="${req.student?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + (req.student?.name || 'S')}" style="width:50px; height:50px; border-radius:50%; border:2px solid var(--primary); background:var(--bg-card);">
            <div>
              <div style="font-weight:800; font-size:1.1rem; color:var(--text-color);">${req.student?.name || "Student"}</div>
              <div style="font-size:0.85rem; color:var(--text-muted);">${req.student?.email || ""}</div>
              ${req.student?.phone ? `<div style="font-size:0.8rem; color:var(--primary); font-weight:600; margin-top:2px;"><i data-lucide="phone" style="width:12px;height:12px;vertical-align:middle;"></i> ${req.student.phone}</div>` : ''}
            </div>
          </div>
          ${statusBadge}
        </div>

        <!-- Badges -->
        <div style="display:flex; gap:8px; flex-wrap:wrap; font-size:0.8rem;">
          ${req.student?.location ? `<span style="background:var(--bg-card); padding:4px 10px; border-radius:14px; border:1px solid var(--border-color); font-weight:600;"><i data-lucide="map-pin" style="width:12px;height:12px;color:var(--primary);"></i> ${req.student.location}</span>` : ''}
          ${req.student?.education ? `<span style="background:var(--bg-card); padding:4px 10px; border-radius:14px; border:1px solid var(--border-color); font-weight:600;"><i data-lucide="graduation-cap" style="width:12px;height:12px;color:var(--accent);"></i> ${req.student.education}</span>` : ''}
        </div>

        <div style="font-size:0.9rem; color:var(--text-main); background:var(--bg-app); padding:10px 14px; border-radius:10px; border-inline-start:4px solid var(--primary);">
          طلب الانضمام إلى دوره: <strong>${req.course?.title || 'Course'}</strong>
        </div>

        <!-- Contact Actions (وسائل التواصل المباشر) -->
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${rawPhone ? `
            <a href="tel:${cleanPhone}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-color:var(--primary); color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="اتصال">
              <i data-lucide="phone-call" style="width:14px;height:14px;"></i> Call
            </a>
            <a href="https://wa.me/${cleanPhoneWa}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-color:var(--success); color:var(--success); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="واتساب">
              <i data-lucide="message-circle" style="width:14px;height:14px;"></i> WhatsApp
            </a>
            <a href="sms:${cleanPhone}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-color:var(--accent); color:var(--accent); text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="رسالة SMS">
              <i data-lucide="message-square" style="width:14px;height:14px;"></i> SMS
            </a>
          ` : ''}
          <a href="mailto:${req.student?.email}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="إرسال إيميل">
            <i data-lucide="mail" style="width:14px;height:14px;"></i> Email
          </a>
        </div>

        <!-- Decision Buttons -->
        <div style="display:flex; gap:12px; margin-top:6px; border-top:1px solid var(--border-color); padding-top:12px;">
          <button class="btn-primary handle-request-btn" data-id="${req.id}" data-action="active" style="flex:1; justify-content:center; ${isAccepted ? 'background:var(--success); cursor:default;' : ''}">
            <i data-lucide="check"></i> ${isAccepted ? 'قبول (Accepted)' : 'قبول (Accept)'}
          </button>
          <button class="btn-secondary handle-request-btn" data-id="${req.id}" data-action="rejected" style="flex:1; justify-content:center; color:var(--error); border-color:var(--error); ${isRejected ? 'opacity:0.6;' : ''}">
            <i data-lucide="x"></i> ${isRejected ? 'مرفوض (Refused)' : 'رفض (Refuse)'}
          </button>
        </div>
      </div>
    `;
  }

  bindActionButtons() {
    // Filter tab buttons
    const filterBtns = this.container.querySelectorAll(".filter-tab-btn");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.currentFilter = btn.getAttribute("data-filter");
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderList();
      });
    });

    // Accept / Refuse buttons
    const actionBtns = this.container.querySelectorAll(".handle-request-btn");
    actionBtns.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const action = e.currentTarget.getAttribute("data-action"); // active or rejected
        try {
          await apiFetch(`/teacher/enrollment-requests/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: action })
          });
          showToast(action === 'active' ? "تم قبول طلب الطالب بنجاح." : "تم رفض الطلب.", "success");
          checkPendingRequestsNotification();
          await this.loadRequests();
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  onDestroy() { }
}
