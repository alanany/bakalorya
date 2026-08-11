import { apiFetch, state, showToast, t } from "../app.js";

export default class NotificationsView {
  constructor(container) {
    this.container = container;
    this.notifications = [];
    this.currentFilter = "all"; // 'all' | 'unread'
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1100px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:24px;">
        
        <!-- Header Row -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 class="dashboard-section-title" style="font-size:1.8rem; margin:0 0 6px 0; display:flex; align-items:center; gap:10px;">
              <i data-lucide="bell" style="color:var(--primary);"></i> مركز الإشعارات والتنبيهات
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">تابع موافقات طلبات التسجيل، الأنشطة الجديدة، وجلسات البث المباشر</p>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <!-- Filter Tabs -->
            <div style="display:flex; gap:6px; background:var(--bg-app); border:1px solid var(--border-color); padding:4px; border-radius:50px;">
              <button class="notif-filter-btn active" data-filter="all" style="padding:6px 16px; font-size:0.82rem; font-weight:700; border-radius:50px; border:none; cursor:pointer; background:var(--primary); color:#fff;">
                الكل
              </button>
              <button class="notif-filter-btn" data-filter="unread" style="padding:6px 16px; font-size:0.82rem; font-weight:700; border-radius:50px; border:none; cursor:pointer; background:transparent; color:var(--text-muted);">
                غير المقروءة <span id="notif-unread-pill" class="badge-pill" style="background:var(--error); color:#fff; font-size:0.7rem; padding:1px 7px; border-radius:10px; margin-inline-start:4px;">0</span>
              </button>
            </div>

            <!-- Mark All Read -->
            <button id="mark-all-read-btn" class="btn-secondary" style="font-size:0.85rem; padding:8px 16px; border-radius:30px; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="check-check" style="width:16px; height:16px;"></i> تحديد الكل كمقروء
            </button>
          </div>
        </div>

        <!-- Notifications Container -->
        <div class="glass-card" style="padding:24px; border-radius:20px; min-height:400px; border:1px solid var(--border-color);">
          <div id="notifications-list-container">
            <div style="text-align:center; padding:60px 20px;">
              <i data-lucide="loader" class="spinner" style="width:36px; height:36px; border-width:3px; margin:0 auto;"></i>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-top:12px;">جاري تحميل الإشعارات...</p>
            </div>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
    await this.loadNotifications();
  }

  bindEvents() {
    this.container.querySelectorAll(".notif-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.container.querySelectorAll(".notif-filter-btn").forEach(b => {
          b.style.background = "transparent";
          b.style.color = "var(--text-muted)";
        });
        btn.style.background = "var(--primary)";
        btn.style.color = "#fff";
        this.currentFilter = btn.getAttribute("data-filter");
        this.renderList();
      });
    });

    const markAllBtn = this.container.querySelector("#mark-all-read-btn");
    markAllBtn?.addEventListener("click", async () => {
      try {
        await apiFetch("/notifications/read-all", { method: "PATCH" });
        showToast("تم تحديد جميع الإشعارات كمقروءة", "success");
        await this.loadNotifications();
        if (window.updateHeaderNotificationCount) {
          window.updateHeaderNotificationCount();
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  async loadNotifications() {
    try {
      this.notifications = await apiFetch("/notifications");
      this.renderList();
    } catch (err) {
      console.error(err);
      const container = this.container.querySelector("#notifications-list-container");
      if (container) {
        container.innerHTML = `<div style="text-align:center; color:var(--error); padding:40px;">فشل تحميل الإشعارات. يرجى المحاولة لاحقاً.</div>`;
      }
    }
  }

  renderList() {
    const container = this.container.querySelector("#notifications-list-container");
    if (!container) return;

    let list = this.notifications || [];
    const unreadCount = list.filter(n => !n.isRead).length;

    const pill = this.container.querySelector("#notif-unread-pill");
    if (pill) pill.textContent = unreadCount;

    if (this.currentFilter === "unread") {
      list = list.filter(n => !n.isRead);
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:60px 20px;">
          <i data-lucide="bell-off" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
          <h4 style="font-weight:700; margin-bottom:6px;">لا توجد إشعارات حالياً</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">${this.currentFilter === "unread" ? "جميع الإشعارات مقروءة بنجاح! ✨" : "سنقوم بتنبيهك بجميع التحديثات والأنشطة في هذه الصفحة."}</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${list.map(notif => this.renderNotificationCard(notif)).join("")}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindCardEvents();
  }

  renderNotificationCard(notif) {
    const isUnread = !notif.isRead;
    let iconName = "bell";
    let iconBg = "rgba(0,86,210,0.1)";
    let iconColor = "var(--primary)";

    if (notif.type === "success") {
      iconName = "check-circle";
      iconBg = "rgba(16,185,129,0.12)";
      iconColor = "#10b981";
    } else if (notif.type === "warning" || notif.type === "error") {
      iconName = "alert-circle";
      iconBg = "rgba(239,68,68,0.12)";
      iconColor = "#ef4444";
    }

    const dateStr = notif.createdAt ? new Date(notif.createdAt).toLocaleString("ar", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    }) : "";

    return `
      <div class="notif-item-card" data-id="${notif.id}" style="padding:16px 20px; border-radius:16px; border:1px solid ${isUnread ? 'var(--primary)' : 'var(--border-color)'}; background:${isUnread ? 'rgba(0,86,210,0.04)' : 'var(--bg-app)'}; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; transition:all 0.2s ease;">
        <div style="display:flex; gap:14px; align-items:flex-start;">
          <div style="width:42px; height:42px; border-radius:12px; background:${iconBg}; color:${iconColor}; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;">
            <i data-lucide="${iconName}" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:800; font-size:0.98rem; color:var(--text-main);">${notif.title}</span>
              ${isUnread ? `<span style="background:var(--primary); color:#fff; font-size:0.65rem; font-weight:800; padding:2px 7px; border-radius:10px;">جديد</span>` : ''}
            </div>
            <p style="font-size:0.88rem; color:var(--text-main); margin:6px 0 8px 0; line-height:1.5;">${notif.message}</p>
            <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <i data-lucide="clock" style="width:12px; height:12px;"></i> ${dateStr}
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          ${notif.link ? `
            <a href="${notif.link}" class="btn-primary notif-link-btn" data-id="${notif.id}" style="padding:6px 14px; font-size:0.78rem; border-radius:20px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
              فتح <i data-lucide="arrow-left" style="width:12px; height:12px;"></i>
            </a>
          ` : ''}
          ${isUnread ? `
            <button class="btn-secondary mark-read-single-btn" data-id="${notif.id}" style="padding:6px 12px; font-size:0.78rem; border-radius:20px;" title="تحديد كمقروء">
              <i data-lucide="check" style="width:14px; height:14px;"></i>
            </button>
          ` : ''}
          <button class="btn-secondary delete-notif-btn" data-id="${notif.id}" style="padding:6px 10px; font-size:0.78rem; border-radius:20px; color:var(--error); border-color:transparent;" title="حذف">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
        </div>
      </div>
    `;
  }

  bindCardEvents() {
    const container = this.container.querySelector("#notifications-list-container");
    if (!container) return;

    // Mark single as read
    container.querySelectorAll(".mark-read-single-btn, .notif-link-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
          if (window.updateHeaderNotificationCount) {
            window.updateHeaderNotificationCount();
          }
        } catch (e) {}
      });
    });

    // Delete single
    container.querySelectorAll(".delete-notif-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/notifications/${id}`, { method: "DELETE" });
          this.notifications = this.notifications.filter(n => n.id !== id);
          this.renderList();
          if (window.updateHeaderNotificationCount) {
            window.updateHeaderNotificationCount();
          }
        } catch (e) {}
      });
    });
  }

  onDestroy() {}
}
