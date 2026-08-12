import { apiFetch, state, showToast, t, checkPendingRequestsNotification, handleWhatsAppResponse, showEnrollmentAcceptanceModal, getCleanWhatsAppNumber, confirmDialog } from "../app.js";

export default class RequestsView {
  constructor(container) {
    this.container = container;
    this.requests = [];
    this.currentFilter = "pending"; // 'pending', 'active', 'rejected', 'all'
    this.searchQuery = "";
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1440px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px;">
        
        <!-- Header & Action Controls -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 class="dashboard-section-title" style="font-size:1.8rem; margin:0 0 6px 0; display:flex; align-items:center; gap:10px;">
              <i data-lucide="user-check" style="color:var(--primary);"></i> ${t("nav.teacher.requests") || "طلبات التسجيل بالدورات"}
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">إدارة ومراجعة طلبات انضمام الطلاب لدوراتك والتواصل المباشر معهم</p>
          </div>

          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <!-- Search Input -->
            <div style="position:relative; min-width:240px;">
              <i data-lucide="search" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
              <input type="text" id="requests-search-input" class="form-input" placeholder="بحث باسم الطالب، الإيميل أو الدورة..." style="padding:10px 40px 10px 14px; font-size:0.88rem; border-radius:30px; background:var(--bg-card);">
            </div>

            <!-- Filter Status Tabs -->
            <div style="display:flex; gap:6px; background:var(--bg-app); border:1px solid var(--border-color); padding:4px; border-radius:50px;">
              <button class="filter-tab-btn ${this.currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">
                قيد الانتظار <span id="badge-count-pending" class="badge-pill" style="background:var(--warning); color:#fff; font-size:0.7rem; padding:1px 7px; border-radius:10px; margin-inline-start:4px;">0</span>
              </button>
              <button class="filter-tab-btn ${this.currentFilter === 'active' ? 'active' : ''}" data-filter="active">
                المقبولة
              </button>
              <button class="filter-tab-btn ${this.currentFilter === 'rejected' ? 'active' : ''}" data-filter="rejected">
                المرفوضة
              </button>
              <button class="filter-tab-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                الكل
              </button>
            </div>
          </div>
        </div>

        <!-- Metrics Row -->
        <div id="requests-metrics-row" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
          <div class="glass-card" style="padding:18px 22px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="clock" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">طلبات قيد الانتظار</div>
              <div id="metric-pending" style="font-size:1.4rem; font-weight:900; color:var(--text-main);">0</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px 22px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="check-circle" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">الطلبات المقبولة</div>
              <div id="metric-accepted" style="font-size:1.4rem; font-weight:900; color:var(--text-main);">0</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px 22px; border-radius:16px; display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="x-circle" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">الطلبات المرفوضة</div>
              <div id="metric-rejected" style="font-size:1.4rem; font-weight:900; color:var(--text-main);">0</div>
            </div>
          </div>
        </div>

        <!-- Table Container -->
        <div class="glass-card" style="padding:0; border-radius:20px; overflow:hidden; border:1px solid var(--border-color);">
          <div id="requests-table-wrapper" style="overflow-x:auto;">
            <div style="text-align:center; padding:60px 20px;">
              <i data-lucide="loader" class="spinner" style="width:36px; height:36px; border-width:3px; margin:0 auto;"></i>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-top:12px;">جاري تحميل طلبات التسجيل...</p>
            </div>
          </div>
        </div>

      </div>
    `;

    // Inline style for filter tabs
    const styleTag = document.createElement("style");
    styleTag.textContent = `
      .filter-tab-btn {
        padding:7px 18px; font-size:0.85rem; font-weight:700; border-radius:50px; border:none; cursor:pointer; background:transparent; color:var(--text-muted); transition:all 0.2s ease;
      }
      .filter-tab-btn.active {
        background:var(--primary); color:#fff; box-shadow:0 3px 10px var(--primary-glow);
      }
    `;
    document.head.appendChild(styleTag);

    if (window.lucide) window.lucide.createIcons();
    this.bindGlobalEvents();
    await this.loadRequests();
  }

  bindGlobalEvents() {
    this.container.querySelectorAll(".filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.container.querySelectorAll(".filter-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.getAttribute("data-filter");
        this.renderRequestsTable();
      });
    });

    const searchInput = this.container.querySelector("#requests-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderRequestsTable();
    });
  }

  async loadRequests() {
    try {
      this.requests = await apiFetch("/teacher/enrollment-requests");
      this.updateMetrics();
      this.renderRequestsTable();
    } catch (error) {
      console.error("Failed to load enrollment requests:", error);
      const wrapper = this.container.querySelector("#requests-table-wrapper");
      if (wrapper) {
        wrapper.innerHTML = `<div style="text-align:center; color:var(--error); padding:50px; font-weight:700;">حدث خطأ أثناء تحميل طلبات التسجيل: ${error.message || 'يرجى إعادة المحاولة.'}</div>`;
      }
    }
  }

  updateMetrics() {
    const list = this.requests || [];
    const pendingCount = list.filter(r => r.status === "pending").length;
    const acceptedCount = list.filter(r => r.status === "active").length;
    const rejectedCount = list.filter(r => r.status === "rejected").length;

    const pEl = this.container.querySelector("#metric-pending");
    const aEl = this.container.querySelector("#metric-accepted");
    const rEl = this.container.querySelector("#metric-rejected");
    const badgeEl = this.container.querySelector("#badge-count-pending");

    if (pEl) pEl.textContent = pendingCount;
    if (aEl) aEl.textContent = acceptedCount;
    if (rEl) rEl.textContent = rejectedCount;
    if (badgeEl) badgeEl.textContent = pendingCount;
  }

  getFilteredRequests() {
    let list = this.requests || [];
    if (this.currentFilter !== "all") {
      list = list.filter(r => r.status === this.currentFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(r => {
        const nameMatch = r.student?.name?.toLowerCase().includes(q);
        const emailMatch = r.student?.email?.toLowerCase().includes(q);
        const phoneMatch = r.student?.phone?.toLowerCase().includes(q);
        const courseMatch = r.course?.title?.toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || courseMatch;
      });
    }
    return list;
  }

  renderRequestsTable() {
    const wrapper = this.container.querySelector("#requests-table-wrapper");
    if (!wrapper) return;

    const filtered = this.getFilteredRequests();

    if (filtered.length === 0) {
      wrapper.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:60px 20px;">
          <i data-lucide="user-x" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
          <h4 style="font-weight:700; margin-bottom:6px;">لا توجد طلبات في هذه الفئة</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">${this.searchQuery ? "جرّب تغيير كلمات البحث" : "لم يتم العثور على طلبات تسجيل تتوافق مع التصفية المختارة"}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const rowsHTML = filtered.map(req => this.renderTableRow(req)).join("");

    wrapper.innerHTML = `
      <table style="width:100%; border-collapse:collapse; text-align:start; font-size:0.88rem;">
        <thead>
          <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px;">
            <th style="padding:14px 20px; font-weight:800;">الطالب</th>
            <th style="padding:14px 16px; font-weight:800;">المستوى والمنطقة</th>
            <th style="padding:14px 16px; font-weight:800;">الدورة المطلوبة</th>
            <th style="padding:14px 16px; font-weight:800; text-align:center;">الحالة</th>
            <th style="padding:14px 16px; font-weight:800; text-align:center;">التواصل</th>
            <th style="padding:14px 20px; font-weight:800; text-align:end;">الإجراء</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindTableEvents();
  }

  renderTableRow(req) {
    const rawPhone = req.student?.phone || '';
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const cleanPhoneWa = getCleanWhatsAppNumber(rawPhone);
    const isPending = req.status === "pending";
    const isAccepted = req.status === "active";
    const isRejected = req.status === "rejected";

    let statusBadge = `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:4px 12px; border-radius:20px; font-size:0.78rem; font-weight:800; border:1px solid rgba(245,158,11,0.3); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px;height:12px;"></i> قيد الانتظار</span>`;
    if (isAccepted) statusBadge = `<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:4px 12px; border-radius:20px; font-size:0.78rem; font-weight:800; border:1px solid rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="check-circle" style="width:12px;height:12px;"></i> مقبول</span>`;
    if (isRejected) statusBadge = `<span style="background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 12px; border-radius:20px; font-size:0.78rem; font-weight:800; border:1px solid rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:4px;"><i data-lucide="x-circle" style="width:12px;height:12px;"></i> مرفوض</span>`;

    return `
      <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s ease;" onmouseover="this.style.background='var(--bg-app)'" onmouseout="this.style.background='transparent'">
        <!-- Student Info -->
        <td style="padding:14px 20px; vertical-align:middle;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${req.student?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(req.student?.name || 'S')}`}" style="width:42px; height:42px; border-radius:50%; border:2px solid var(--primary); object-fit:cover; flex-shrink:0;">
            <div>
              <div style="font-weight:800; color:var(--text-main); font-size:0.95rem;">${req.student?.name || "طالب"}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                <i data-lucide="mail" style="width:12px; height:12px; color:var(--primary);"></i> ${req.student?.email || ""}
              </div>
            </div>
          </div>
        </td>

        <!-- Level & Location -->
        <td style="padding:14px 16px; vertical-align:middle;">
          <div style="display:flex; flex-direction:column; gap:3px; font-size:0.8rem;">
            ${req.student?.education ? `
              <span style="font-weight:700; color:var(--primary); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="graduation-cap" style="width:13px; height:13px;"></i> ${req.student.education}
              </span>
            ` : '<span style="color:var(--text-muted);">-</span>'}
            ${req.student?.location ? `
              <span style="color:var(--text-muted); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="map-pin" style="width:12px; height:12px;"></i> ${req.student.location}
              </span>
            ` : ''}
          </div>
        </td>

        <!-- Requested Course -->
        <td style="padding:14px 16px; vertical-align:middle;">
          <div style="font-weight:700; color:var(--text-main); font-size:0.88rem; display:inline-flex; align-items:center; gap:6px; background:var(--bg-app); border:1px solid var(--border-color); padding:6px 12px; border-radius:12px;">
            <i data-lucide="book-open" style="width:14px; height:14px; color:var(--primary);"></i>
            ${req.course?.title || 'الدورة التعليمية'}
          </div>
        </td>

        <!-- Status -->
        <td style="padding:14px 16px; vertical-align:middle; text-align:center;">
          ${statusBadge}
        </td>

        <!-- Quick Contacts -->
        <td style="padding:14px 16px; vertical-align:middle; text-align:center;">
          ${rawPhone ? `
            <div style="display:inline-flex; align-items:center; gap:6px; justify-content:center;">
              <a href="https://wa.me/${cleanPhoneWa}" target="_blank" class="btn-secondary" style="padding:5px 10px; font-size:0.75rem; border-color:#10b981; color:#10b981; border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="واتساب المباشر">
                💬 واتساب
              </a>
              <a href="tel:${cleanPhone}" target="_blank" class="btn-secondary" style="padding:5px 10px; font-size:0.75rem; border-color:var(--primary); color:var(--primary); border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="اتصال هاتفي">
                <i data-lucide="phone-call" style="width:12px; height:12px;"></i> اتصال
              </a>
            </div>
          ` : '<span style="color:var(--text-muted); font-size:0.78rem;">لا يوجد هاتف</span>'}
        </td>

        <!-- Actions (Accept Steps / Refuse) -->
        <td style="padding:14px 20px; vertical-align:middle; text-align:end;">
          <div style="display:inline-flex; gap:6px; justify-content:flex-end;">
            ${isPending ? `
              <button class="btn-primary accept-request-modal-btn" 
                data-id="${req.id}" 
                data-name="${req.student?.name || ''}" 
                data-email="${req.student?.email || ''}" 
                data-phone="${req.student?.phone || ''}" 
                data-course="${req.course?.title || ''}" 
                data-teacher="${req.course?.teacher?.name || ''}" 
                style="padding:6px 14px; font-size:0.78rem; border-radius:20px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="user-check" style="width:13px; height:13px;"></i> قبول الطلب
              </button>
              <button class="btn-secondary refuse-request-btn" data-id="${req.id}" data-name="${req.student?.name || ''}" style="padding:6px 12px; font-size:0.78rem; border-color:var(--error); color:var(--error); border-radius:20px; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="user-x" style="width:13px; height:13px;"></i> رفض
              </button>
            ` : isAccepted ? `
              <button class="btn-secondary refuse-request-btn" data-id="${req.id}" data-name="${req.student?.name || ''}" style="padding:6px 12px; font-size:0.78rem; border-color:var(--warning); color:var(--warning); border-radius:20px; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="slash" style="width:13px; height:13px;"></i> حظر / إلغاء
              </button>
            ` : `
              <button class="btn-primary accept-request-modal-btn" 
                data-id="${req.id}" 
                data-name="${req.student?.name || ''}" 
                data-email="${req.student?.email || ''}" 
                data-phone="${req.student?.phone || ''}" 
                data-course="${req.course?.title || ''}" 
                data-teacher="${req.course?.teacher?.name || ''}" 
                style="padding:6px 12px; font-size:0.78rem; border-radius:20px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="rotate-ccw" style="width:13px; height:13px;"></i> إحياء وقبول
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }

  bindTableEvents() {
    const wrapper = this.container.querySelector("#requests-table-wrapper");
    if (!wrapper) return;

    // Accept Request Modal Flow (Step 1 → Step 2 Payment → Step 3 Greetings)
    wrapper.querySelectorAll(".accept-request-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const studentName = btn.getAttribute("data-name");
        const studentEmail = btn.getAttribute("data-email");
        const studentPhone = btn.getAttribute("data-phone");
        const courseTitle = btn.getAttribute("data-course");
        const teacherName = btn.getAttribute("data-teacher");

        showEnrollmentAcceptanceModal({
          enrollmentId: id,
          studentName,
          studentEmail,
          studentPhone,
          courseTitle,
          teacherName,
          onAccept: async (customMsg, sendWhatsApp, paymentData) => {
            try {
              const body = { status: "active" };
              if (paymentData) body.paymentData = paymentData;

              const res = await apiFetch(`/teacher/enrollment-requests/${id}`, {
                method: "PUT",
                body: JSON.stringify(body)
              });
              showToast("تم قبول طلب التسجيل بنجاح!", "success");
              if (paymentData) showToast("تم تسجيل بيانات الدفع بنجاح! 💳", "info");
              handleWhatsAppResponse(res);
              checkPendingRequestsNotification();
              await this.loadRequests();
            } catch (err) {
              console.error(err);
              showToast("حدث خطأ أثناء قبول الطلب.", "error");
            }
          }
        });
      });
    });

    // Refuse Request
    wrapper.querySelectorAll(".refuse-request-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const studentName = btn.getAttribute("data-name") || "هذا الطالب";
        const confirmed = await confirmDialog({
          title: "تأكيد رفض الطلب ⚠️",
          message: `هل أنت متأكد من رغبتك في رفض طلب الانضمام للطالب "${studentName}"؟`,
          confirmText: "نعم، رفض الطلب",
          cancelText: "تراجع",
          danger: true
        });
        if (!confirmed) return;

        try {
          await apiFetch(`/teacher/enrollment-requests/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "rejected" })
          });
          showToast("تم رفض طلب التسجيل بنجاح.", "info");
          checkPendingRequestsNotification();
          await this.loadRequests();
        } catch (err) {
          console.error(err);
          showToast("حدث خطأ أثناء رفض الطلب.", "error");
        }
      });
    });
  }

  onDestroy() {}
}
