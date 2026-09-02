import { apiFetch, showToast, t, formatSessionDateTime } from "../../app.js";

export default class StudentPrivateSessionsView {
  constructor(container) {
    this.container = container;
    this.privateSessions = [];
    this.searchQuery = "";
    this.filterStatus = "all"; // 'all', 'live', 'today', 'upcoming', 'completed'
  }

  async render() {
    try {
      const privateSessions = await apiFetch("/sessions/my-private").catch(() => []);
      this.privateSessions = privateSessions || [];

      // Sort private sessions so earlier / upcoming sessions come first:
      // 1. Live or starting soon sessions first
      // 2. Upcoming sessions sorted ascending by scheduledAt (Today, Tomorrow, etc.)
      // 3. Completed / past sessions last
      const nowTime = Date.now();
      this.privateSessions.sort((a, b) => {
        const timeA = new Date(a.scheduledAt).getTime();
        const timeB = new Date(b.scheduledAt).getTime();
        const isPastA = (a.status === 'COMPLETED' || a.status === 'completed') || (timeA < nowTime - (a.duration || 60) * 60000);
        const isPastB = (b.status === 'COMPLETED' || b.status === 'completed') || (timeB < nowTime - (b.duration || 60) * 60000);

        if (!isPastA && isPastB) return -1;
        if (isPastA && !isPastB) return 1;

        if (!isPastA && !isPastB) {
          return timeA - timeB; // Earliest upcoming first (Today, Tomorrow, etc.)
        }
        return timeB - timeA; // Most recently completed first
      });

      this.renderContent();
    } catch (err) {
      console.error("StudentPrivateSessionsView error:", err);
      this.container.innerHTML = `<div class="error-msg">تعذر تحميل بيانات الحصص الخاصة.</div>`;
    }
  }

  getRelativeDateLabel(dateInput) {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: "اليوم", bg: "rgba(239,68,68,0.12)", color: "#ef4444", icon: "🔥", diff: 0 };
    if (diffDays === 1) return { text: "غداً", bg: "rgba(245,158,11,0.14)", color: "#d97706", icon: "⚡", diff: 1 };
    if (diffDays === 2) return { text: "بعد غد", bg: "rgba(99,102,241,0.12)", color: "#6366f1", icon: "📅", diff: 2 };
    if (diffDays < 0) return { text: "سابقاً", bg: "rgba(107,114,128,0.1)", color: "#6b7280", icon: "✓", diff: diffDays };
    return { text: `بعد ${diffDays} يوم`, bg: "rgba(99,102,241,0.08)", color: "var(--primary)", icon: "⏳", diff: diffDays };
  }

  renderContent() {
    const nowTime = Date.now();

    // Categorize
    const processedSessions = this.privateSessions.map(s => {
      const sTime = new Date(s.scheduledAt).getTime();
      const durM = s.duration || 60;
      const diffM = (sTime - nowTime) / 60000;
      const isPast = (s.status === 'COMPLETED' || s.status === 'completed') || (diffM < -durM);
      const isLive = s.status === 'live' || (diffM <= 0 && diffM > -durM);
      const isSoon = diffM > 0 && diffM <= 30;
      const isWithinJoinWindow = isLive || isSoon;
      const rel = this.getRelativeDateLabel(s.scheduledAt);
      const isToday = rel?.diff === 0;

      return {
        ...s,
        isPast,
        isLive,
        isSoon,
        isWithinJoinWindow,
        rel,
        isToday
      };
    });

    // Counts
    const totalCount = processedSessions.length;
    const liveCount = processedSessions.filter(s => s.isLive).length;
    const todayCount = processedSessions.filter(s => s.isToday && !s.isPast).length;
    const upcomingCount = processedSessions.filter(s => !s.isPast).length;
    const completedCount = processedSessions.filter(s => s.isPast).length;

    // Filter
    let filtered = processedSessions.filter(s => {
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (s.topic && s.topic.toLowerCase().includes(q)) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.teacher?.name && s.teacher.name.toLowerCase().includes(q)) ||
        (s.subscription?.plan?.name && s.subscription.plan.name.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (this.filterStatus === "live") return s.isLive;
      if (this.filterStatus === "today") return s.isToday && !s.isPast;
      if (this.filterStatus === "upcoming") return !s.isPast;
      if (this.filterStatus === "completed") return s.isPast;
      return true;
    });

    this.container.innerHTML = `
      <style>
        .filter-tab-btn {
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 0.84rem;
          font-weight: 800;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .filter-tab-btn.active {
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
      </style>

      <div class="student-dashboard-layout" style="display:block; max-width:1280px; margin:0 auto; padding:24px 16px;">
        
        <!-- Header Banner -->
        <div class="glass-card" style="padding:24px; border-radius:24px; background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06)); border:1px solid rgba(99,102,241,0.2); margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 style="font-size:1.6rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i data-lucide="calendar-heart" style="width:28px; height:28px; color:#6366f1;"></i>
              حصصي الخاصة (1-على-1) 🎯
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
              متابعة مواعيد الحصص الخاصة الفردية، الدخول المباشر للبث مع المعلم، وإلغاء أو تعديل الحصص.
            </p>
          </div>
          
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="#student-subscriptions" class="btn-secondary" style="font-size:0.85rem; padding:9px 16px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:700;">
              <i data-lucide="sparkles"></i> باقات اشتراكاتي 💎
            </a>
            <a href="#subscription-plans" class="btn-primary" style="font-size:0.85rem; padding:9px 18px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800;">
              <i data-lucide="plus-circle" style="width:16px; height:16px;"></i> شراء باقة جديدة
            </a>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display:flex; gap:10px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
          <a href="#student-private-sessions" style="padding:8px 20px; border-radius:20px; font-size:0.88rem; font-weight:800; background:#6366f1; color:#fff; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(99,102,241,0.3);">
            <i data-lucide="calendar" style="width:16px;height:16px;"></i> جدول الحصص الخاصة (1-على-1)
          </a>
          <a href="#student-subscriptions" style="padding:8px 20px; border-radius:20px; font-size:0.88rem; font-weight:700; background:var(--bg-card); color:var(--text-muted); text-decoration:none; border:1px solid var(--border-color); display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="sparkles" style="width:16px;height:16px;"></i> باقات اشتراكاتي
          </a>
        </div>

        <!-- Stat Summary Bar -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; width:100%; box-sizing:border-box; margin-bottom: 24px;">
          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #6366f1; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="calendar" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${upcomingCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">حصص خاصة قادمة</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #ef4444; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="flame" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:#ef4444;">${todayCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">حصص اليوم 🔥</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #10b981; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="radio" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${liveCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">بث مباشر الآن 🔴</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #a855f7; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(168,85,247,0.12); color:#a855f7; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="check-circle-2" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${completedCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">حصص مكتملة</div>
            </div>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; width:100%; box-sizing:border-box; margin-bottom: 24px;">
          <!-- Filter Tabs -->
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="filter-tab-btn ${this.filterStatus === 'all' ? 'active' : ''}" data-filter="all">
              <i data-lucide="grid" style="width:14px; height:14px;"></i> الكل (${totalCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'today' ? 'active' : ''}" data-filter="today">
              🔥 اليوم (${todayCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'live' ? 'active' : ''}" data-filter="live">
              <span style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></span> مباشر الآن (${liveCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
              <i data-lucide="clock" style="width:14px; height:14px;"></i> القادمة (${upcomingCount})
            </button>
            <button class="filter-tab-btn ${this.filterStatus === 'completed' ? 'active' : ''}" data-filter="completed">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> المكتملة (${completedCount})
            </button>
          </div>

          <!-- Search Input -->
          <div style="position:relative; width:100%; max-width:320px;">
            <input type="text" id="private-session-search" value="${this.searchQuery}" placeholder="ابحث باسم المعلم أو موضوع الحصة..."
              style="width:100%; padding:10px 16px 10px 38px; border-radius:30px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box;">
            <i data-lucide="search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
          </div>
        </div>

        <!-- Sessions Grid -->
        ${filtered.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 24px; border-radius:24px; color:var(--text-muted);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(99,102,241,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
              <i data-lucide="calendar" style="width:32px; height:32px; color:var(--primary); opacity:0.5;"></i>
            </div>
            <h3 style="font-size:1.1rem; font-weight:800; margin:0 0 8px 0; color:var(--text-main);">
              ${this.searchQuery ? 'لا توجد حصص تطابق بحثك' : 'لا توجد حصص في هذا القسم'}
            </h3>
            <p style="font-size:0.85rem; line-height:1.6; max-width:400px; margin:0 auto; color:var(--text-muted);">
              ${this.searchQuery ? 'جرب البحث بكلمة أخرى أو تغيير الفلتر.' : 'عند جدولة أي حصة جديدة ستظهر هنا تلقائياً بالأولوية الزمنية.'}
            </p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
            ${filtered.map(s => this.renderSessionCard(s)).join('')}
          </div>
        `}

        <!-- Cancellation Modal Container -->
        <div id="student-booking-modal-overlay"></div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderSessionCard(session) {
    const fmt = formatSessionDateTime(session.scheduledAt, null, {});
    const rel = session.rel;
    const isLive = session.isLive;
    const isPast = session.isPast;
    const isWithinJoinWindow = session.isWithinJoinWindow;

    return `
      <div class="glass-card" style="padding:20px; border-radius:20px; border:1px solid ${isLive ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; flex-direction:column; justify-content:space-between; ${isLive ? 'box-shadow:0 0 24px rgba(16,185,129,0.12);' : ''}">
        <div>
          <!-- Badge Row -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              ${isLive ? `
                <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);">
                  🔴 مباشر الآن
                </span>
              ` : isPast ? `
                <span style="font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:12px; background:var(--bg-app); color:var(--text-muted);">
                  ✅ مكتملة
                </span>
              ` : rel ? `
                <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:${rel.bg}; color:${rel.color};">
                  ${rel.icon} ${rel.text}
                </span>
              ` : ''}

              <span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.1); color:var(--primary);">
                ${session.subscription?.plan?.name || 'حصة خاصة 1-على-1'}
              </span>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">⏱️ ${session.duration || 60} دقيقة</span>
          </div>

          <!-- Title -->
          <h4 style="font-weight:900; font-size:1.05rem; margin:0 0 8px 0; color:var(--text-main); line-height:1.35;">
            🎯 ${session.topic || session.title || 'حصة خاصة مباشرة'}
          </h4>

          <!-- Teacher Info -->
          <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
            <i data-lucide="user" style="width:16px; height:16px; color:var(--primary);"></i>
            <span>المعلم: <strong style="color:var(--text-main);">${session.teacher?.name || 'الأستاذ'}</strong></span>
          </div>

          <!-- Scheduled Date Box -->
          <div style="padding:10px 14px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; font-size:0.84rem;">
            <span style="color:var(--text-muted); font-weight:700;">🗓️ الموعد:</span>
            <span style="font-weight:800; color:var(--text-main);">${fmt.dateStr} • ${fmt.timeStr}</span>
          </div>

          <!-- Summary / Feedback if completed -->
          ${(isPast && (session.whatWasCovered || session.teacherNotes || session.homework)) ? `
            <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.15); border-radius:12px; padding:12px; font-size:0.8rem; margin-bottom:14px; line-height:1.5;">
              ${session.whatWasCovered ? `<div style="margin-bottom:4px;"><strong>📝 ما تم إنجازه:</strong> ${session.whatWasCovered}</div>` : ''}
              ${session.homework ? `<div style="margin-bottom:4px;"><strong>📖 الواجب:</strong> ${session.homework}</div>` : ''}
              ${session.teacherNotes ? `<div><strong>💬 ملاحظات المعلم:</strong> ${session.teacherNotes}</div>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          ${!isPast ? `
            ${isWithinJoinWindow ? `
              <a href="#classroom/${session.id}"
                class="btn-primary" style="width:100%; justify-content:center; font-size:0.88rem; padding:11px; text-decoration:none; gap:8px; background:linear-gradient(135deg,#10b981,#059669); border-color:#10b981; box-shadow:0 4px 14px rgba(16,185,129,0.3); font-weight:800;">
                <i data-lucide="video" style="width:18px;height:18px;"></i> دخول قاعة الحصة الآن 🎥
              </a>
              <button class="btn-secondary session-checkin-btn" data-id="${session.id}" style="width:100%; justify-content:center; font-size:0.84rem; padding:9px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); font-weight:800; cursor:pointer;">
                <i data-lucide="user-check" style="width:16px;height:16px;"></i> تأكيد الحضور (لست غائباً) ✍️
              </button>
            ` : `
              <button disabled class="btn-secondary" style="width:100%; justify-content:center; font-size:0.82rem; padding:10px; opacity:0.85; cursor:not-allowed; background:rgba(99,102,241,0.06); color:var(--primary); border-color:rgba(99,102,241,0.2); font-weight:700;" title="ينشط زر الدخول قبل موعد الحصة بـ 30 دقيقة فقط">
                <i data-lucide="lock" style="width:14px;height:14px;margin-inline-end:4px;"></i> ينشط الدخول قبل الموعد بـ 30 دقيقة 🔒
              </button>
            `}

            <div style="display:flex; gap:8px;">
              <a href="#subscription-sessions?id=${session.subscription?.id || session.subscriptionId}" class="btn-secondary" style="flex:1; justify-content:center; font-size:0.8rem; padding:8px; text-decoration:none; font-weight:700;">
                <i data-lucide="list" style="width:14px; height:14px;"></i> سجل الباقة 📋
              </a>
              <button class="btn-secondary cancel-my-session-btn" data-id="${session.id}" style="font-size:0.8rem; padding:8px 14px; color:var(--error,#ef4444); border-color:rgba(239,68,68,0.3); font-weight:700;">
                إلغاء
              </button>
            </div>
          ` : `
            <a href="#subscription-sessions?id=${session.subscription?.id || session.subscriptionId}" class="btn-secondary" style="width:100%; justify-content:center; font-size:0.82rem; padding:9px; text-decoration:none; font-weight:700;">
              عرض تقرير وسجل الحصة 📋
            </a>
          `}
        </div>
      </div>
    `;
  }

  renderCancelSessionModal(session) {
    const modalId = 'cancel-session-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : Date.now();
    const nowTime = Date.now();
    const diffMs = scheduledTime - nowTime;
    const hoursDiff = diffMs / (1000 * 60 * 60);
    const isLateCancellation = hoursDiff < 2;

    const sessionDateStr = session.scheduledAt 
      ? new Date(session.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "موعد غير محدد";

    const hoursText = hoursDiff > 0 
      ? `${Math.floor(hoursDiff)} ساعة و ${Math.floor((diffMs % 3600000) / 60000)} دقيقة`
      : "الموعد حان أو مضى";

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:500px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card); overflow:hidden;">
        <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, ${isLateCancellation ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}, rgba(245,158,11,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:${isLateCancellation ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; color:${isLateCancellation ? '#ef4444' : '#10b981'}; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="${isLateCancellation ? 'alert-triangle' : 'check-circle'}" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">إلغاء الحصة الخاصة</h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">موعد الحصة: ${sessionDateStr}</p>
            </div>
          </div>
          <span class="modal-close-btn" id="close-cancel-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>

        <div class="modal-body" style="padding:24px; background:var(--bg-app);">
          ${!isLateCancellation ? `
            <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:14px; padding:16px; margin-bottom:18px; color:var(--text-main); font-size:0.85rem; line-height:1.6;">
              <div style="color:#10b981; font-weight:800; font-size:0.92rem; margin-bottom:4px;">✅ إلغاء مجاني (متبقي ${hoursText}):</div>
              نظراً للإلغاء قبل موعد الحصة بـ <strong>أكثر من ساعتين</strong>، سيتم إلغاء الحصة وحفظ رصيدك في اشتراكك بالكامل لإعادة جدولتها في أي وقت مجاناً.
            </div>
          ` : `
            <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:14px; padding:16px; margin-bottom:18px; color:var(--text-main); font-size:0.85rem; line-height:1.6;">
              <div style="color:#ef4444; font-weight:800; font-size:0.92rem; margin-bottom:4px;">⚠️ تحذير إلغاء متأخر (متبقي ${hoursText}):</div>
              الإلغاء قبل أقل من <strong>ساعتين</strong> من موعد الحصة سيؤدي إلى <strong>خصم رصيد الحصة واحتسابها</strong> تعويضاً عن وقت المعلم المخصص وفق سياسة المنصة.
            </div>
          `}

          <form id="cancel-session-form" style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">سبب الإلغاء (اختياري)</label>
              <input type="text" id="cancel-reason" class="form-input" style="width:100%; padding:10px; border-radius:10px;" placeholder="اكتب سبب الإلغاء...">
            </div>
            <div style="display:flex; gap:12px; margin-top:8px; justify-content:flex-end;">
              <button type="button" class="btn-secondary" id="dismiss-cancel-modal">تراجع</button>
              <button type="submit" class="btn-primary" style="background:${isLateCancellation ? '#ef4444' : 'var(--primary)'}; border-color:${isLateCancellation ? '#ef4444' : 'var(--primary)'};">تأكيد الإلغاء ❌</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { overlay.remove(); };
    document.getElementById("close-cancel-modal")?.addEventListener("click", closeModal);
    document.getElementById("dismiss-cancel-modal")?.addEventListener("click", closeModal);

    document.getElementById("cancel-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reason = document.getElementById("cancel-reason").value.trim() || "إلغاء من الطالب";

      try {
        const res = await apiFetch(`/sessions/${session.id}/cancel`, {
          method: "POST",
          body: JSON.stringify({ reason })
        });
        showToast(res.message || "تم إلغاء الحصة.", res.isLate ? "warning" : "success");
        closeModal();
        await this.render();
      } catch (err) {
        showToast(err.message || "تعذر إلغاء الحصة.", "error");
      }
    });
  }

  bindEvents() {
    // Search input
    const searchInput = this.container.querySelector("#private-session-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderContent();
      });
    }

    // Filter tabs
    this.container.querySelectorAll(".filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.filterStatus = btn.getAttribute("data-filter");
        this.renderContent();
      });
    });

    // Cancellation buttons
    this.container.querySelectorAll('.cancel-my-session-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const session = (this.privateSessions || []).find(s => String(s.id) === String(id)) || { id };
        this.renderCancelSessionModal(session);
      });
    });

    // Checkin / confirm presence buttons
    this.container.querySelectorAll('.session-checkin-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:13px;height:13px;"></i> جاري التسجيل...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await apiFetch(`/sessions/${id}/checkin`, { method: "POST" });
          showToast(res.message || "تم تأكيد حضورك رسمياً بنجاح، ولن يتم احتسابك غائباً ✅", "success");
          btn.outerHTML = `
            <span style="font-size:0.8rem; font-weight:800; color:#10b981; padding:8px 12px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> تم تأكيد حضورك في الحصة (حاضر) ✅
            </span>
          `;
          if (window.lucide) window.lucide.createIcons();
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="user-check" style="width:16px; height:16px;"></i> تأكيد الحضور (لست غائباً) ✍️`;
          if (window.lucide) window.lucide.createIcons();
          showToast(err.message || "تعذر تأكيد الحضور.", "error");
        }
      });
    });
  }
}
