import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminSessionsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminSessionsPage = {

  renderGroupsTab() {
    const allSessions = this.allSessions || [];
    const isGroupCheck = (s) => !!s.course || !s.student || (s.type && String(s.type).toLowerCase().includes("group")) || (s.title && String(s.title).includes("مجموعة"));
    const groupSessions = allSessions.filter(isGroupCheck);

    const groupsMap = new Map();

    groupSessions.forEach(sess => {
      const key = sess.course ? `course_${sess.course.id}` : (sess.title || `group_${sess.id}`);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          id: sess.id,
          title: sess.title || (sess.course ? sess.course.title : "مجموعة دراسية أونلاين"),
          course: sess.course,
          teacher: sess.teacher || sess.course?.teacher,
          sessions: [],
          studentsMap: new Map()
        });
      }
      const grp = groupsMap.get(key);
      grp.sessions.push(sess);

      if (sess.course) {
        const courseId = sess.course.id || sess.courseId;
        const courseEnrollments = (this.allEnrollments || []).filter(e => e.course && String(e.course.id) === String(courseId));
        courseEnrollments.forEach(e => {
          if (e.student) grp.studentsMap.set(String(e.student.id), e.student);
        });
      }
      if (sess.student) {
        grp.studentsMap.set(String(sess.student.id), sess.student);
      }
    });

    const groupsList = Array.from(groupsMap.values());

    // Sort sessions inside each group chronologically
    groupsList.forEach(grp => {
      grp.sessions.sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
    });

    // Sort groups list by newest date first (Newer First)
    groupsList.sort((a, b) => {
      const getLatestTimestamp = (g) => {
        const times = g.sessions.map(s => {
          const c = s.createdAt ? new Date(s.createdAt).getTime() : 0;
          const sch = s.scheduledAt ? new Date(s.scheduledAt).getTime() : 0;
          return Math.max(c, sch);
        });
        return times.length > 0 ? Math.max(...times) : 0;
      };
      return getLatestTimestamp(b) - getLatestTimestamp(a);
    });

    const totalStudentsInGroups = groupsList.reduce((acc, g) => acc + g.studentsMap.size, 0);

    return `
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
          <div>
            <h3 style="font-weight:800; font-size:1.25rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="users" style="color:var(--primary);"></i>
              👥 إدارة المجموعات والحصص الجماعية (${groupsList.length} مجموعات)
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 0 0;">استعراض المجموعات المفتوحة، الطلاب المنضمين، مواعيد البث المباشر، وجدولة مجموعات جديدة.</p>
          </div>
          <button class="btn-primary" id="admin-groups-add-btn" style="padding:11px 20px; font-weight:800; font-size:0.9rem; gap:8px; background:linear-gradient(135deg,#8b5cf6,#ec4899); border:none; border-radius:14px;">
            <i data-lucide="plus-circle" style="width:18px; height:18px;"></i> ➕ إضافة وجدولة مجموعة أونلاين جديدة
          </button>
        </div>

        <!-- Summary Stat Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
          <div class="glass-card" style="padding:18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(139,92,246,0.15); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="users" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:800; color:var(--text-main);">${groupsList.length}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي المجموعات الدراسية</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="graduation-cap" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:800; color:#10b981;">${totalStudentsInGroups}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الطلاب بالمجموعات</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:46px; height:46px; border-radius:14px; background:rgba(236,72,153,0.15); color:#ec4899; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="video" style="width:24px; height:24px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:800; color:#ec4899;">${groupSessions.length}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الحصص المجدولة</div>
            </div>
          </div>
        </div>

        <!-- Groups Grid -->
        ${groupsList.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 20px; color:var(--text-muted); border-radius:20px;">
            <i data-lucide="users" style="width:56px; height:56px; opacity:0.3; margin-bottom:12px;"></i>
            <h4 style="font-weight:800; margin:0 0 6px 0; color:var(--text-main);">لا توجد مجموعات جماعية مضافة حتى الآن</h4>
            <p style="font-size:0.88rem; margin:0 0 16px 0;">اضغط على "إضافة مجموعة جديدة" لجدولة حصص جماعية أونلاين وتعيين الطلاب لها.</p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
            ${groupsList.map(grp => {
              const students = Array.from(grp.studentsMap.values());
              const teacherName = grp.teacher?.name || "معلم المنصة";
              const upcomingSession = grp.sessions.find(s => new Date(s.scheduledAt) >= new Date()) || grp.sessions[0];
              const dateStr = upcomingSession?.scheduledAt ? new Date(upcomingSession.scheduledAt).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'مواعيد مستمرة';

              return `
                <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; background:var(--bg-card); box-shadow:0 4px 14px rgba(0,0,0,0.03);">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px;">
                      <span class="badge" style="background:linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15)); color:#8b5cf6; font-weight:800; font-size:0.78rem;">
                        👥 مجموعة أونلاين (${grp.sessions.length} حصص)
                      </span>
                      <span style="font-size:0.78rem; font-weight:700; color:var(--primary);">
                        ⏰ ${dateStr}
                      </span>
                    </div>

                    <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0 0 8px 0; line-height:1.4;">${grp.title}</h4>
                    
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="user-check" style="width:15px; height:15px; color:var(--primary);"></i>
                      <span>المعلم: <strong style="color:var(--text-main);">${teacherName}</strong></span>
                    </div>

                    <!-- Enrolled Students Preview -->
                    <div style="padding:12px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); margin-bottom:16px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:0.82rem; font-weight:800; color:var(--text-main);">الطلاب المسجلون بالجروب:</span>
                        <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem; font-weight:800;">${students.length} طالب</span>
                      </div>

                      ${students.length === 0 ? `
                        <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">لا يوجد طلاب مسجلون حالياً بهذه المجموعة.</div>
                      ` : `
                        <div style="display:flex; align-items:center; gap:-8px; flex-wrap:wrap; margin-bottom:6px;">
                          ${students.slice(0, 5).map(st => `
                            <img src="${st.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${st.id}`}" title="${st.name}" style="width:30px; height:30px; border-radius:50%; border:2px solid var(--bg-card); object-fit:cover; margin-inline-end:-6px;">
                          `).join('')}
                          ${students.length > 5 ? `<span style="font-size:0.75rem; font-weight:800; color:var(--primary); margin-inline-start:12px;">+${students.length - 5} آخرين</span>` : ''}
                        </div>
                      `}

                      <button type="button" class="admin-view-group-students-btn" data-id="${grp.id}" style="border:none; background:transparent; color:#8b5cf6; font-weight:800; font-size:0.8rem; cursor:pointer; padding:0; text-decoration:underline; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
                        <i data-lucide="users" style="width:13px;height:13px;"></i> عرض قائمة وجداول الطلاب التفصيلية 👥
                      </button>
                    </div>
                  </div>

                  <div style="border-top:1px solid var(--border-color); padding-top:14px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    ${upcomingSession ? `
                      <a href="#classroom/${upcomingSession.id}" class="btn-primary" style="font-size:0.82rem; padding:8px 14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:800;">
                        <i data-lucide="video" style="width:14px;height:14px;"></i> دخول قاعة البث 🎥
                      </a>
                    ` : ''}
                    <button type="button" class="btn-secondary admin-reassign-teacher-btn" data-id="${grp.id}" style="font-size:0.8rem; padding:8px 12px; font-weight:700;">
                      <i data-lucide="user-check" style="width:14px;height:14px;"></i> تغيير المعلم
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  // ── 5. Sessions Management Tab ────────────────────────────────────────────────

  renderSessionsTab(filterSubId = null) {
    let allSessions = this.allSessions || [];
    if (filterSubId) {
      allSessions = allSessions.filter(s => String(s.subscription?.id) === String(filterSubId));
    }

    this.sessionTimeFilter = this.sessionTimeFilter || 'all';
    this.sessionViewMode = this.sessionViewMode || 'list';
    this.sessionCustomDate = this.sessionCustomDate || '';

    const now = new Date();
    const todayYMD = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();

    // Calculate Week Range (Sunday to Saturday)
    const currentDay = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Calculate Month Range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Apply Time Filter
    const filteredSessions = allSessions.filter(s => {
      if (!s.scheduledAt) return this.sessionTimeFilter === 'all';
      const sDate = new Date(s.scheduledAt);

      if (this.sessionTimeFilter === 'today') {
        return new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).toDateString() === todayStr;
      } else if (this.sessionTimeFilter === 'week') {
        return sDate >= startOfWeek && sDate <= endOfWeek;
      } else if (this.sessionTimeFilter === 'month') {
        return sDate >= startOfMonth && sDate <= endOfMonth;
      } else if (this.sessionTimeFilter === 'custom' && this.sessionCustomDate) {
        const sYMD = sDate.toISOString().slice(0, 10);
        return sYMD === this.sessionCustomDate;
      }
      return true;
    });

    const getStatusBadge = (status) => {
      const s = (status || "").toLowerCase();
      if (s === "live") return `<span style="background:rgba(239,68,68,0.15); color:#ef4444; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="video" style="width:12px;height:12px;"></i> بث مباشر الآن</span>`;
      if (s === "completed") return `<span style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">✓ مكتملة</span>`;
      if (s.includes("cancelled")) return `<span style="background:rgba(239,68,68,0.12); color:#ef4444; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">❌ ملغاة</span>`;
      return `<span style="background:rgba(99,102,241,0.12); color:#6366f1; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">📅 مجدولة</span>`;
    };

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    return `
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
          <div>
            <h3 style="font-weight:800; font-size:1.2rem; color:var(--text-main); margin:0;">
              ${filterSubId ? `حصص الاشتراك #${filterSubId.substring(0, 8)} (${filteredSessions.length})` : `📹 إدارة الحصص والجلسات المباشرة (${filteredSessions.length})`}
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 0 0;">فلترة الحصص حسب اليوم والأسبوع والشهر مع إمكانية المعاينة كجدول حصص أسبوعي (Timetable).</p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <button class="btn-primary" id="admin-open-group-session-btn" style="padding:10px 18px; font-size:0.88rem; font-weight:800; gap:8px; background:linear-gradient(135deg,#8b5cf6,#ec4899); border:none; border-radius:12px;">
              <i data-lucide="users" style="width:16px; height:16px;"></i> 👥 جدولة حصة أونلاين لمجموعة طلاب
            </button>
            ${filterSubId ? `<button class="btn-secondary admin-view-all-sessions-btn" style="padding:8px 16px; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="arrow-right" style="width:16px; height:16px;"></i> الرجوع لكل الحصص</button>` : ''}
          </div>
        </div>

        <!-- Filter Bar & View Switcher -->
        <div class="glass-card" style="padding:14px 20px; border-radius:16px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          
          <!-- Time Filters -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:0.82rem; font-weight:800; color:var(--text-main); margin-inline-end:4px;">⏱️ فلترة المواعيد:</span>
            
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="all" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'all' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              الكل (${allSessions.length})
            </button>
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="today" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'today' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              ☀️ اليوم
            </button>
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="week" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'week' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              📅 هذا الأسبوع
            </button>
            <button class="btn-secondary admin-session-time-filter-btn" data-filter="month" style="padding:6px 14px; font-size:0.8rem; font-weight:700; ${this.sessionTimeFilter === 'month' ? 'background:var(--primary); color:#fff; border-color:var(--primary);' : ''}">
              🗓️ هذا الشهر
            </button>

            <div style="display:inline-flex; align-items:center; gap:6px; margin-inline-start:4px;">
              <input type="date" id="admin-session-date-picker" class="form-input" style="padding:4px 10px; font-size:0.8rem; border-radius:8px;" value="${this.sessionCustomDate || todayYMD}">
            </div>
          </div>

          <!-- View Mode Toggle -->
          <div style="display:flex; align-items:center; gap:6px; background:var(--bg-app); padding:4px; border-radius:12px; border:1px solid var(--border-color);">
            <button class="btn-secondary admin-session-view-btn" data-mode="list" style="padding:6px 12px; font-size:0.78rem; font-weight:700; border:none; ${this.sessionViewMode === 'list' ? 'background:var(--bg-card); color:var(--primary); box-shadow:0 2px 6px rgba(0,0,0,0.1);' : 'color:var(--text-muted); background:transparent;'}">
              <i data-lucide="list" style="width:14px;height:14px;"></i> قائمة
            </button>
            <button class="btn-secondary admin-session-view-btn" data-mode="timetable" style="padding:6px 12px; font-size:0.78rem; font-weight:700; border:none; ${this.sessionViewMode === 'timetable' ? 'background:var(--bg-card); color:var(--primary); box-shadow:0 2px 6px rgba(0,0,0,0.1);' : 'color:var(--text-muted); background:transparent;'}">
              <i data-lucide="calendar-days" style="width:14px;height:14px;"></i> جدول الحصص (Timetable)
            </button>
          </div>

        </div>
      </div>

      ${this.sessionViewMode === 'timetable' ? `
        <!-- Timetable View -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
          ${[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + dayIdx);
      const isTodayDay = dayDate.toDateString() === todayStr;

      const daySessions = filteredSessions.filter(s => {
        if (!s.scheduledAt) return false;
        const d = new Date(s.scheduledAt);
        return d.getDay() === dayIdx;
      }).sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));

      return `
              <div class="glass-card" style="padding:16px; border-radius:18px; border:${isTodayDay ? '2px solid var(--primary)' : '1px solid var(--border-color)'}; background:${isTodayDay ? 'rgba(99,102,241,0.03)' : 'var(--bg-card)'}; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border-color);">
                  <div>
                    <h4 style="font-weight:800; margin:0; font-size:0.95rem; color:${isTodayDay ? 'var(--primary)' : 'var(--text-main)'};">
                      ${dayNames[dayIdx]} ${isTodayDay ? '⭐ (اليوم)' : ''}
                    </h4>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${dayDate.toLocaleDateString('ar', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <span class="badge" style="background:${daySessions.length > 0 ? 'var(--primary-glow)' : 'rgba(0,0,0,0.05)'}; color:${daySessions.length > 0 ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:800; font-size:0.75rem;">
                    ${daySessions.length} حصص
                  </span>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px; flex:1;">
                  ${daySessions.length === 0 ? `
                    <div style="text-align:center; padding:30px 10px; color:var(--text-muted); font-size:0.8rem; font-style:italic;">
                      لا توجد حصص مجدولة
                    </div>
                  ` : daySessions.map(sess => {
        const teacherTz = sess.teacher?.timezone || "Africa/Cairo";
        const formatted = formatSessionDateTime(sess.scheduledAt, "Asia/Riyadh", { secondaryTz: teacherTz });
        const teacherName = sess.teacher?.name || sess.course?.teacher?.name || "معلم المنصة";
        const studentName = sess.student?.name || (sess.course ? "طلاب الدورة الجماعية" : "حصة خاصة");
        const sessTeacherId = sess.teacher?.id || sess.teacherId || sess.course?.teacher?.id;
        const sameTimeGroupCount = sess.scheduledAt && sessTeacherId ? allSessions.filter(s => {
          const tId = s.teacher?.id || s.teacherId || s.course?.teacher?.id;
          return String(tId) === String(sessTeacherId) && s.scheduledAt && new Date(s.scheduledAt).getTime() === new Date(sess.scheduledAt).getTime();
        }).length : 1;

        return `
                      <div style="background:var(--bg-app); border-radius:12px; padding:12px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                          ${formatted.badgeHTML}
                          ${getStatusBadge(sess.status)}
                        </div>
                        <strong style="font-size:0.88rem; color:var(--text-main);">${sess.title || "حصة خاصة"}</strong>
                        <div style="font-size:0.78rem; color:var(--primary); font-weight:700;">
                          ⏰ ${formatted.timeStr} ${formatted.secondaryTZHTML}
                        </div>
                        <div style="font-size:0.78rem; color:var(--text-muted);">
                          <div>👨‍🏫 ${teacherName}</div>
                          <div>👤 ${studentName}</div>
                        </div>
                        <div style="display:flex; gap:6px; margin-top:4px; justify-content:flex-end;">
                          ${sess.status !== "completed" && !sess.status?.includes("cancelled") ? `
                            <button class="btn-secondary admin-reassign-teacher-btn" data-id="${sess.id}" style="font-size:0.72rem; padding:4px 8px;">تغيير المعلم</button>
                            <button class="btn-secondary admin-cancel-session-btn" data-id="${sess.id}" style="font-size:0.72rem; padding:4px 8px; color:var(--error);">إلغاء</button>
                          ` : ''}
                          <a href="#classroom/${sess.id}" class="btn-primary" style="font-size:0.72rem; padding:4px 8px; text-decoration:none;">دخول</a>
                        </div>
                      </div>
                    `;
      }).join('')}
                </div>
              </div>
            `;
    }).join('')}
        </div>
      ` : `
        <!-- Table View -->
        <div class="glass-card" style="padding:0; border-radius:18px; overflow:hidden; border:1px solid var(--border-color);">
          ${filteredSessions.length === 0 ? `
            <div style="text-align:center; padding:60px 20px; color:var(--text-muted);">
              <i data-lucide="video" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px;"></i>
              <h4 style="font-weight:700; margin-bottom:6px;">لا توجد حصص تطابق التصفية المحددة</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">اختر فترة زمنية أخرى أو تصفية "الكل" لعرض كافة الحصص.</p>
            </div>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
                <thead>
                  <tr style="background:var(--bg-app); border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">
                    <th style="padding:14px 20px; font-weight:800; text-align:start;">عنوان الحصة / الدرس</th>
                    <th style="padding:14px 16px; font-weight:800; text-align:start;">المعلم والمنظم</th>
                    <th style="padding:14px 16px; font-weight:800; text-align:start;">الطالب (إن وجد)</th>
                    <th style="padding:14px 16px; font-weight:800; text-align:start;">الموعد والمدة</th>
                    <th style="padding:14px 16px; font-weight:800; text-align:start;">الحالة</th>
                    <th style="padding:14px 20px; font-weight:800; text-align:end;">إجراءات التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredSessions.map(sess => {
      const dateStr = sess.scheduledAt ? new Date(sess.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
      const teacherName = sess.teacher?.name || sess.course?.teacher?.name || "معلم المنصة";
      const studentName = sess.student?.name || (sess.course ? "طلاب الدورة الجماعية" : "حصة خاصة 1-على-1");

      return `
                      <tr style="border-bottom:1px solid var(--border-color);" onmouseover="this.style.background='var(--bg-app)'" onmouseout="this.style.background='transparent'">
                        <td style="padding:14px 20px; vertical-align:middle;">
                          <strong style="font-size:0.92rem; color:var(--text-main); display:block;">${sess.title || "حصة خاصة"}</strong>
                          <span style="font-size:0.75rem; color:var(--text-muted);">${sess.course ? '📖 ' + sess.course.title : '🔒 حصة من اشتراك شهر'}</span>
                        </td>
                        <td style="padding:14px 16px; vertical-align:middle;">
                          <div style="font-size:0.85rem; font-weight:700; color:var(--text-main);">${teacherName}</div>
                        </td>
                        <td style="padding:14px 16px; vertical-align:middle;">
                          <div style="font-size:0.85rem; color:var(--text-main);">${studentName}</div>
                        </td>
                        <td style="padding:14px 16px; vertical-align:middle;">
                          <div style="font-size:0.82rem; font-weight:700; color:var(--primary);">${dateStr}</div>
                          <span style="font-size:0.75rem; color:var(--text-muted);">${sess.duration || 60} دقيقة</span>
                        </td>
                        <td style="padding:14px 16px; vertical-align:middle;">
                          ${getStatusBadge(sess.status)}
                        </td>
                        <td style="padding:14px 20px; vertical-align:middle; text-align:end;">
                          <div style="display:inline-flex; gap:6px; justify-content:flex-end; flex-wrap:wrap;">
                            ${sess.status !== "completed" && !sess.status?.includes("cancelled") ? `
                              <button class="btn-secondary admin-reassign-teacher-btn" data-id="${sess.id}" style="font-size:0.75rem; padding:5px 10px; border-color:var(--primary); color:var(--primary); font-weight:700;">
                                <i data-lucide="user-check" style="width:12px;height:12px;"></i> تغيير المعلم
                              </button>
                              <button class="btn-secondary admin-cancel-session-btn" data-id="${sess.id}" style="font-size:0.75rem; padding:5px 10px; border-color:var(--error); color:var(--error); font-weight:700;">
                                <i data-lucide="x-circle" style="width:12px;height:12px;"></i> إلغاء الحصة
                              </button>
                            ` : ''}
                            <a href="#classroom/${sess.id}" class="btn-primary" style="font-size:0.75rem; padding:5px 10px; text-decoration:none;">
                              <i data-lucide="video" style="width:12px;height:12px;"></i> دخول
                            </a>
                          </div>
                        </td>
                      </tr>
                    `;
    }).join("")}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `}
    `;
  },

  // ── 6. Full Reports & Transcripts Tab ─────────────────────────────────────────

  renderGroupStudentsModal(groupIdOrSessionId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    let targetTitle = "";
    let teacherName = "معلم المنصة";
    let students = [];
    let templateSessionId = groupIdOrSessionId;

    const sess = (this.allSessions || []).find(s => String(s.id) === String(groupIdOrSessionId));
    
    if (sess) {
      targetTitle = sess.title || (sess.course ? sess.course.title : "مجموعة دراسية أونلاين");
      teacherName = sess.teacher?.name || sess.course?.teacher?.name || "معلم المنصة";

      if (sess.course) {
        const courseId = sess.course.id || sess.courseId;
        const courseEnrollments = (this.allEnrollments || []).filter(e => e.course && String(e.course.id) === String(courseId));
        students = courseEnrollments.map(e => e.student).filter(Boolean);
      }

      if (sess.scheduledAt) {
        const sessTime = new Date(sess.scheduledAt).getTime();
        const teacherId = sess.teacher?.id || sess.teacherId;
        const sameTimeSessions = (this.allSessions || []).filter(s => {
          const tId = s.teacher?.id || s.teacherId;
          return (s.title === sess.title || (s.scheduledAt && new Date(s.scheduledAt).getTime() === sessTime)) && String(tId) === String(teacherId);
        });
        sameTimeSessions.forEach(s => {
          if (s.student && !students.some(st => String(st.id) === String(s.student.id))) {
            students.push(s.student);
          }
        });
      }
    } else {
      const courseId = String(groupIdOrSessionId).startsWith("course_") ? String(groupIdOrSessionId).replace("course_", "") : null;
      if (courseId) {
        const courseEnrollments = (this.allEnrollments || []).filter(e => e.course && String(e.course.id) === String(courseId));
        students = courseEnrollments.map(e => e.student).filter(Boolean);
        const course = (this.courses || []).find(c => String(c.id) === String(courseId));
        if (course) {
          targetTitle = course.title;
          teacherName = course.teacher?.name || "معلم المنصة";
        }
      }
    }

    const availableStudents = (this.allMembers || []).filter(u => u.role === "student" && !students.some(st => String(st.id) === String(u.id)));

    container.innerHTML = `
      <div class="modal-overlay" id="group-students-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:760px; width:95%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; background:var(--bg-card); box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);">
          
          <!-- Header -->
          <div style="padding:20px 24px; background:linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.12)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:14px; background:rgba(139,92,246,0.15); color:#8b5cf6; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="users" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">إدارة طلاب المجموعات والحصص الجماعية (${students.length}) 👥</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">${targetTitle || 'مجموعة أونلاين'} | المعلم: ${teacherName}</p>
              </div>
            </div>
            <span id="close-group-students-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <div class="modal-body" style="padding:20px 24px; max-height:70vh; overflow-y:auto;">

            <!-- Add Student to Group Bar -->
            <div style="background:var(--bg-app); border:1px solid var(--border-color); padding:16px; border-radius:16px; margin-bottom:20px;">
              <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:10px;">
                <i data-lucide="user-plus" style="width:16px; height:16px; color:var(--primary);"></i> ➕ إضافة طالب جديد لهذه المجموعة
              </label>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <select id="select-new-group-student" class="form-select" style="flex:1; min-width:220px; border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                  <option value="">-- اختر طالباً لإضافته للمجموعة --</option>
                  ${availableStudents.map(st => `<option value="${st.id}">${st.name} (${st.email || st.phone || 'طالب'})</option>`).join('')}
                </select>
                <button type="button" id="add-student-to-group-btn" class="btn-primary" style="padding:10px 18px; border-radius:12px; font-weight:800; font-size:0.85rem; gap:6px;">
                  ➕ إضافة للمجموعة
                </button>
              </div>
            </div>

            ${students.length === 0 ? `
              <div style="text-align:center; padding:40px; color:var(--text-muted);">
                <i data-lucide="user-x" style="width:48px; height:48px; opacity:0.35; margin-bottom:10px;"></i>
                <h4 style="margin:0; font-weight:800;">لا يوجد طلاب مسجلون بهذه الحصة الجماعية حتى الآن</h4>
              </div>
            ` : `
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">
                ${students.map(st => {
                  const cleanPhone = st.phone ? st.phone.replace(/[^0-9]/g, '') : '';
                  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

                  return `
                    <div style="padding:14px; border-radius:16px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                      <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                        <img src="${st.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${st.id}`}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);">
                        <div style="overflow:hidden; text-overflow:ellipsis;">
                          <strong style="font-size:0.92rem; color:var(--text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st.name || 'طالب'}</strong>
                          <span style="font-size:0.78rem; color:var(--text-muted); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st.email || ''}</span>
                          ${st.phone ? `<span style="font-size:0.75rem; color:var(--primary); font-weight:700;">📞 ${st.phone}</span>` : ''}
                        </div>
                      </div>

                      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                        ${waUrl ? `
                          <a href="${waUrl}" target="_blank" rel="noopener" class="btn-secondary" style="font-size:0.72rem; padding:4px 8px; border-color:#25d366; color:#25d366; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:800;">
                            <i data-lucide="message-circle" style="width:13px;height:13px;"></i> واتساب
                          </a>
                        ` : ''}
                        <button type="button" class="btn-secondary admin-remove-group-student-btn" data-student-id="${st.id}" style="font-size:0.72rem; padding:4px 8px; color:var(--error); border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.06); font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="user-minus" style="width:13px;height:13px;"></i> إزالة
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <div class="modal-footer" style="padding:14px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end;">
            <button type="button" class="btn-secondary" id="cancel-group-students-btn" style="padding:8px 20px; font-size:0.88rem; font-weight:700;">إغلاق</button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-group-students-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-group-students-btn")?.addEventListener("click", closeModal);

    // Add Student to Group
    document.getElementById("add-student-to-group-btn")?.addEventListener("click", async () => {
      const studentId = document.getElementById("select-new-group-student")?.value;
      if (!studentId) {
        showToast("اختر طالباً لإضافته للمجموعة.", "error");
        return;
      }
      try {
        const res = await apiFetch("/admin/group-sessions/add-student", {
          method: "POST",
          body: JSON.stringify({ sessionId: templateSessionId, studentId })
        });
        showToast(res.message || "تمت إضافة الطالب بنجاح! 🎉", "success");
        await this.loadAllData();
        this.renderGroupStudentsModal(templateSessionId);
        this.renderTab(this.activeTab);
      } catch (err) {
        showToast(err.message || "فشل إضافة الطالب إلى المجموعة", "error");
      }
    });

    // Remove Student from Group
    container.querySelectorAll(".admin-remove-group-student-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const stId = btn.getAttribute("data-student-id");
        const confirmed = await confirmDialog({ message: "هل أنت متأكد من إزالة هذا الطالب من هذه المجموعة الدراسية؟", danger: true });
        if (!confirmed) return;
        try {
          const res = await apiFetch("/admin/group-sessions/remove-student", {
            method: "POST",
            body: JSON.stringify({ sessionId: templateSessionId, studentId: stId })
          });
          showToast(res.message || "تمت إزالة الطالب من المجموعة بنجاح", "info");
          await this.loadAllData();
          this.renderGroupStudentsModal(templateSessionId);
          this.renderTab(this.activeTab);
        } catch (err) {
          showToast(err.message || "فشل إزالة الطالب من المجموعة", "error");
        }
      });
    });
  },

  renderReassignTeacherModal(sessionId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");

    container.innerHTML = `
      <div class="modal-overlay" id="reassign-teacher-modal" style="display:flex;">
        <div class="modal-content" style="max-width:480px;">
          <div class="modal-header">
            <h3 class="modal-title">إعادة تعيين / تغيير المعلم للحصة</h3>
            <span class="modal-close-btn" id="close-reassign-modal">&times;</span>
          </div>
          <form id="reassign-teacher-form">
            <div class="modal-body">
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">اختر المعلم الجديد الذي سيتم إسناد هذه الحصة له بنجاح مع حفظ سجلات الحصص السابقة المكتملة باسم المعلم الأصلي.</p>
              <div class="form-group">
                
                <label for="reassign-teacher-select" style="font-size:0.88rem; font-weight:700; display:block; margin-bottom:6px;">اختر المعلم:</label>
                <select id="reassign-teacher-select" class="form-input" style="width:100%; padding:10px;">
                  ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-reassign-btn">إلغاء</button>
              <button type="submit" class="btn-primary">تغيير المعلم</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-reassign-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-reassign-btn")?.addEventListener("click", closeModal);

    document.getElementById("reassign-teacher-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById("reassign-teacher-select").value;
      try {
        const res = await apiFetch(`/sessions/${sessionId}/reassign-teacher`, {
          method: "PUT",
          body: JSON.stringify({ teacherId })
        });
        showToast(res.message || "تم التعيين بنجاح", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("sessions");
      } catch (err) {
        showToast(err.message || "فشل التعيين", "error");
      }
    });
  },

  renderGroupSessionModal() {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher");
    const students = (this.allMembers || []).filter(u => u.role === "student");

    const now = new Date();
    const nextSaturday = new Date();
    nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    const defaultStartDateStr = nextSaturday.toISOString().slice(0, 10);
    const defaultTimeStr = "18:00";

    let currentStep = 1;

    container.innerHTML = `
      <div class="modal-overlay" id="group-session-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
        <div class="modal-content" style="max-width:780px; width:95%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; background:var(--bg-card); box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);">
          
          <!-- Header -->
          <div style="padding:20px 24px; background:linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.12)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:14px; background:rgba(139,92,246,0.15); color:#8b5cf6; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="users" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main);">معالج جدولة باقة حصص جماعية 👥</h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:2px 0 0 0;">إعداد وتعيين مواعيد الحصص المباشرة لمجموعة طلاب خطوة بخطوة</p>
              </div>
            </div>
            <span id="close-group-session-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <!-- Stepper Navigation Bar -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin:16px 24px 0 24px; padding:12px 16px; background:var(--bg-app); border-radius:14px; border:1px solid var(--border-color); flex-wrap:wrap; gap:8px;">
            <div id="grp-nav-1" style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.84rem; color:var(--primary);">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">1</span>
              <span>المجموعة والمعلم</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 8px;" id="grp-line-1"></div>
            <div id="grp-nav-2" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.84rem; color:var(--text-muted);">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; font-size:0.8rem;">2</span>
              <span>تحديد الطلاب</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 8px;" id="grp-line-2"></div>
            <div id="grp-nav-3" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.84rem; color:var(--text-muted);">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; font-size:0.8rem;">3</span>
              <span>نمط الجدولة</span>
            </div>
            <div style="flex:1; height:2px; background:var(--border-color); margin:0 8px;" id="grp-line-3"></div>
            <div id="grp-nav-4" style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.84rem; color:var(--text-muted);">
              <span style="width:26px; height:26px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; font-size:0.8rem;">4</span>
              <span>المعاينة والتعارضات</span>
            </div>
          </div>

          <form id="group-session-form">
            <div class="modal-body" style="padding:22px 24px; min-height:360px; max-height:65vh; overflow-y:auto;">
              
              <!-- STEP 1: Group & Teacher Details -->
              <div id="grp-step-content-1">
                <div style="display:flex; flex-direction:column; gap:16px;">
                  <div class="form-group" style="margin:0;">
                    <label for="group-session-title" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="heading" style="width:14px; height:14px; color:var(--primary);"></i>
                      عنوان المجموعة والدورة <span style="color:var(--error);">*</span>
                    </label>
                    <input type="text" id="group-session-title" class="form-input" placeholder="مثال: حصص مراجعة جماعية - الفيزياء للثانوية العامة" required style="border-radius:14px; padding:11px 16px; font-size:0.88rem;">
                  </div>

                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group" style="margin:0;">
                      <label for="group-session-teacher" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="user-check" style="width:14px; height:14px; color:#8b5cf6;"></i>
                        المعلم المسؤول <span style="color:var(--error);">*</span>
                      </label>
                      <select id="group-session-teacher" class="form-select" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                        <option value="">-- اختر معلم المنصة --</option>
                        ${teachers.map(t => `<option value="${t.id}" data-link="${t.meetingLink || ''}">${t.name} (${t.email})</option>`).join('')}
                      </select>
                    </div>

                    <div class="form-group" style="margin:0;">
                      <label for="group-session-duration" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="clock" style="width:14px; height:14px; color:#10b981;"></i>
                        مدة كل حصة (بالدقائق) <span style="color:var(--error);">*</span>
                      </label>
                      <input type="number" id="group-session-duration" class="form-input" value="60" min="15" max="240" step="15" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    </div>
                  </div>

                  <div class="form-group" style="margin:0;">
                    <label for="group-session-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                      🔗 رابط البث أونلاين الافتراضي (Google Meet / Zoom)
                    </label>
                    <input type="url" id="group-session-meeting-link" class="form-input" placeholder="https://meet.google.com/abc-defg-hij" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                  </div>
                </div>
              </div>

              <!-- STEP 2: Students Selection -->
              <div id="grp-step-content-2" style="display:none;">
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <label style="font-weight:800; font-size:0.9rem; color:var(--text-main); display:flex; align-items:center; gap:6px; margin:0;">
                      <i data-lucide="users" style="width:16px; height:16px; color:#ec4899;"></i>
                      اختر الطلاب المنضمين للمجموعة <span style="color:var(--error);">*</span>
                    </label>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <button type="button" id="group-select-all-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:8px;">
                        ✓ تظليل الكل
                      </button>
                      <button type="button" id="group-deselect-all-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:8px;">
                        ✕ إلغاء التظليل
                      </button>
                    </div>
                  </div>

                  <!-- Live Counter -->
                  <div id="group-student-counter-badge" style="background:linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1)); border:1px solid rgba(139,92,246,0.3); color:#8b5cf6; font-weight:800; padding:10px 16px; border-radius:14px; font-size:0.88rem; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                      👥 عدد الطلاب المحددين: <strong id="group-count-num" style="font-size:1.05rem; color:var(--primary);">0</strong> طالب
                    </div>
                    <div>
                      🎬 إجمالي السجلات المتوقعة: <strong id="group-total-records" style="font-size:1.05rem; color:#10b981;">0</strong> سجل
                    </div>
                  </div>

                  <!-- Search Input -->
                  <input type="text" id="group-students-search" class="form-input" placeholder="🔍 تصفية الطلاب باسم أو بريد الطالب..." style="border-radius:10px; padding:8px 12px; font-size:0.82rem; margin-bottom:10px; width:100%;">

                  <!-- Students Checkboxes Grid -->
                  <div id="group-students-checkboxes-container" style="max-height:220px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px; padding-inline-end:4px;">
                    ${students.length === 0 ? `
                      <div style="color:var(--text-muted); font-size:0.82rem; padding:12px; grid-column:1/-1; text-align:center;">
                        لا يوجد طلاب مسجلون بالمنصة حالياً.
                      </div>
                    ` : students.map(st => `
                      <label class="group-student-item" data-search="${st.name.toLowerCase()} ${st.email.toLowerCase()}" style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:var(--bg-card); border-radius:10px; border:1px solid var(--border-color); cursor:pointer; font-size:0.82rem;">
                        <input type="checkbox" name="groupStudentIds" value="${st.id}" class="group-student-checkbox" style="width:16px; height:16px; accent-color:#8b5cf6;">
                        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                          <strong style="display:block; font-size:0.82rem;">${st.name}</strong>
                          <span style="font-size:0.72rem; color:var(--text-muted);">${st.email}</span>
                        </div>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>

              <!-- STEP 3: Scheduling Pattern & Dates -->
              <div id="grp-step-content-3" style="display:none;">
                <div style="display:flex; flex-direction:column; gap:16px;">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group" style="margin:0;">
                      <label for="group-sessions-count" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="layers" style="width:14px; height:14px; color:#10b981;"></i>
                        عدد الحصص الجماعية المطلوبة <span style="color:var(--error);">*</span>
                      </label>
                      <input type="number" id="group-sessions-count" class="form-input" value="4" min="1" max="30" step="1" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    </div>

                    <div class="form-group" style="margin:0;">
                      <label for="group-sessions-freq" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                        تكرار الجدولة
                      </label>
                      <select id="group-sessions-freq" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                        <option value="custom_days">أيام محددة في الأسبوع (موصى به)</option>
                        <option value="weekly">أسبوعياً (حصة واحدة كل 7 أيام)</option>
                        <option value="biweekly">حصتان أسبوعياً (توزيع منظم)</option>
                        <option value="single">حصة واحدة فقط</option>
                      </select>
                    </div>
                  </div>

                  <!-- Days of week checkboxes -->
                  <div id="group-days-box" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:14px;">
                    <label style="font-size:0.85rem; font-weight:800; display:block; margin-bottom:8px; color:var(--text-main);">
                      🗓️ اختر أيام الحصص الأسبوعية للمجموعة:
                    </label>
                    <div style="display:flex; flex-wrap:wrap; gap:12px;">
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="6" checked /> السبت</label>
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="0" /> الأحد</label>
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="1" checked /> الاثنين</label>
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="2" /> الثلاثاء</label>
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="3" /> الأربعاء</label>
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="4" /> الخميس</label>
                      <label style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" name="groupDays" value="5" /> الجمعة</label>
                    </div>
                  </div>

                  <!-- Start Date & Daily Time -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group" style="margin:0;">
                      <label for="group-session-start-date" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                        تاريخ بداية الحصص (الحصة الأولى)
                      </label>
                      <input type="date" id="group-session-start-date" class="form-input" value="${defaultStartDateStr}" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    </div>

                    <div class="form-group" style="margin:0;">
                      <label for="group-session-daily-time" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                        وقت الحصة الموحد
                      </label>
                      <input type="time" id="group-session-daily-time" class="form-input" value="${defaultTimeStr}" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    </div>
                  </div>
                </div>
              </div>

              <!-- STEP 4: Preview & Conflict Check -->
              <div id="grp-step-content-4" style="display:none;">
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:14px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                    <h4 style="font-weight:800; font-size:0.9rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="calendar-check" style="width:16px; height:16px; color:#8b5cf6;"></i>
                      معاينة مواعيد الحصص وفحص التعارضات المباشر
                    </h4>
                    <button type="button" id="refresh-group-preview-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 12px; border-radius:8px;">
                      🔄 إعادة فحص التعارضات
                    </button>
                  </div>

                  <div style="max-height:240px; overflow-y:auto; border:1px solid var(--border-color); border-radius:10px; margin-bottom:12px;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:start;">
                      <thead style="position:sticky; top:0; background:var(--bg-app); color:var(--text-muted); font-weight:800; border-bottom:1px solid var(--border-color);">
                        <tr>
                          <th style="padding:8px 12px;">#</th>
                          <th style="padding:8px 12px;">تاريخ ووقت الحصة</th>
                          <th style="padding:8px 12px;">اليوم</th>
                          <th style="padding:8px 12px;">فحص التعارضات</th>
                        </tr>
                      </thead>
                      <tbody id="group-dates-preview-tbody"></tbody>
                    </table>
                  </div>

                  <div id="group-preview-summary-box" style="padding:10px 14px; background:rgba(139,92,246,0.06); border-radius:10px; border:1px solid rgba(139,92,246,0.2); font-size:0.82rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                      المعلم: <strong id="grp-summary-teacher" style="color:var(--text-main);">-</strong> | 
                      الطلاب: <strong id="grp-summary-students" style="color:var(--primary);">0</strong> | 
                      الحصص: <strong id="grp-summary-sessions" style="color:#ec4899;">0</strong>
                    </div>
                    <div id="grp-conflict-status-badge" style="font-weight:700;">-</div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Modal Footer with Stepper Controls -->
            <div class="modal-footer" style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <button type="button" class="btn-secondary" id="grp-prev-btn" style="display:none; padding:10px 20px; border-radius:30px; font-size:0.88rem; font-weight:700;">
                ⬅️ السابق
              </button>
              <div style="display:flex; gap:10px; margin-inline-start:auto;">
                <button type="button" class="btn-secondary" id="cancel-group-session-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
                <button type="button" class="btn-primary" id="grp-next-btn" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#8b5cf6,#ec4899); border:none;">
                  التالي ➡️
                </button>
                <button type="submit" id="submit-group-session-btn" class="btn-primary" style="display:none; padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none;">
                  <i data-lucide="sparkles" style="width:16px; height:16px; vertical-align:middle;"></i> تأكيد وجدولة كافة الحصص الجماعية 🚀
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-group-session-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-group-session-modal")?.addEventListener("click", closeModal);

    const step1El = document.getElementById("grp-step-content-1");
    const step2El = document.getElementById("grp-step-content-2");
    const step3El = document.getElementById("grp-step-content-3");
    const step4El = document.getElementById("grp-step-content-4");

    const nav1 = document.getElementById("grp-nav-1");
    const nav2 = document.getElementById("grp-nav-2");
    const nav3 = document.getElementById("grp-nav-3");
    const nav4 = document.getElementById("grp-nav-4");

    const prevBtn = document.getElementById("grp-prev-btn");
    const nextBtn = document.getElementById("grp-next-btn");
    const submitBtn = document.getElementById("submit-group-session-btn");

    const setStep = (step) => {
      currentStep = step;
      step1El.style.display = step === 1 ? "block" : "none";
      step2El.style.display = step === 2 ? "block" : "none";
      step3El.style.display = step === 3 ? "block" : "none";
      step4El.style.display = step === 4 ? "block" : "none";

      prevBtn.style.display = step > 1 ? "block" : "none";
      nextBtn.style.display = step < 4 ? "block" : "none";
      submitBtn.style.display = step === 4 ? "block" : "none";

      [nav1, nav2, nav3, nav4].forEach((nav, idx) => {
        const s = idx + 1;
        const iconSpan = nav.querySelector("span:first-child");
        if (s === step) {
          nav.style.color = "var(--primary)";
          nav.style.fontWeight = "800";
          iconSpan.style.background = "var(--primary)";
          iconSpan.style.color = "#fff";
        } else if (s < step) {
          nav.style.color = "#10b981";
          nav.style.fontWeight = "700";
          iconSpan.style.background = "#10b981";
          iconSpan.style.color = "#fff";
        } else {
          nav.style.color = "var(--text-muted)";
          nav.style.fontWeight = "600";
          iconSpan.style.background = "var(--bg-card)";
          iconSpan.style.color = "var(--text-muted)";
        }
      });

      if (step === 4) {
        updatePreviewTable();
      }
    };

    nextBtn.addEventListener("click", () => {
      if (currentStep === 1) {
        const title = document.getElementById("group-session-title")?.value.trim();
        const teacherId = document.getElementById("group-session-teacher")?.value;
        if (!title) {
          showToast("يرجى إدخال عنوان المجموعة والدورة", "error");
          return;
        }
        if (!teacherId) {
          showToast("يرجى اختيار المعلم المسؤول عن المجموعة", "error");
          return;
        }
        setStep(2);
      } else if (currentStep === 2) {
        const checkedStudents = container.querySelectorAll(".group-student-checkbox:checked");
        if (checkedStudents.length === 0) {
          showToast("يرجى اختيار طالب واحد على الأقل للمجموعة", "error");
          return;
        }
        setStep(3);
      } else if (currentStep === 3) {
        const startDateStr = document.getElementById("group-session-start-date")?.value;
        const count = parseInt(document.getElementById("group-sessions-count")?.value) || 0;
        if (!startDateStr) {
          showToast("يرجى تحديد تاريخ بداية الحصص", "error");
          return;
        }
        if (count < 1) {
          showToast("يرجى إدخال عدد حصص صحيح", "error");
          return;
        }
        setStep(4);
      }
    });

    prevBtn.addEventListener("click", () => {
      if (currentStep > 1) setStep(currentStep - 1);
    });

    // Populate default meeting link when teacher changes
    const teacherSelect = document.getElementById("group-session-teacher");
    const meetingInput = document.getElementById("group-session-meeting-link");
    teacherSelect?.addEventListener("change", () => {
      const opt = teacherSelect.options[teacherSelect.selectedIndex];
      if (opt && opt.getAttribute("data-link")) {
        meetingInput.value = opt.getAttribute("data-link");
      }
    });

    // Helper: Generate Group Dates & Conflicts
    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    let generatedDatesList = [];
    let groupConflictsData = [];

    const updatePreviewTable = async () => {
      const startDateStr = document.getElementById("group-session-start-date")?.value;
      const timeStr = document.getElementById("group-session-daily-time")?.value || "18:00";
      const count = parseInt(document.getElementById("group-sessions-count")?.value) || 4;
      const freq = document.getElementById("group-sessions-freq")?.value || "custom_days";
      const duration = parseInt(document.getElementById("group-session-duration")?.value) || 60;
      const teacherId = document.getElementById("group-session-teacher")?.value;

      const selectedDays = Array.from(container.querySelectorAll("input[name='groupDays']:checked")).map(cb => parseInt(cb.value));

      generatedDatesList = [];
      if (!startDateStr || !timeStr) return;

      const [hours, minutes] = timeStr.split(':').map(Number);
      let current = new Date(startDateStr);
      current.setHours(hours, minutes, 0, 0);

      if (freq === 'single') {
        generatedDatesList.push(new Date(current));
      } else if (freq === 'weekly') {
        while (generatedDatesList.length < count) {
          generatedDatesList.push(new Date(current));
          current.setDate(current.getDate() + 7);
        }
      } else if (freq === 'biweekly') {
        let step = 3;
        while (generatedDatesList.length < count) {
          generatedDatesList.push(new Date(current));
          current.setDate(current.getDate() + step);
          step = step === 3 ? 4 : 3;
        }
      } else {
        // custom_days
        const activeDays = selectedDays.length > 0 ? selectedDays : [6, 1];
        while (generatedDatesList.length < count) {
          if (activeDays.includes(current.getDay())) {
            generatedDatesList.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
      }

      // Check conflicts if teacher is selected
      const selectedStudentCbs = container.querySelectorAll(".group-student-checkbox:checked");
      const studentIds = Array.from(selectedStudentCbs).map(cb => cb.value);

      const teacherOpt = teacherSelect.options[teacherSelect.selectedIndex];
      const teacherName = teacherOpt ? teacherOpt.text.split('(')[0].trim() : '-';

      const summaryTeacherEl = document.getElementById("grp-summary-teacher");
      if (summaryTeacherEl) summaryTeacherEl.innerText = teacherName;

      const summaryStudentsEl = document.getElementById("grp-summary-students");
      if (summaryStudentsEl) summaryStudentsEl.innerText = `${studentIds.length} طلاب`;

      const summarySessionsEl = document.getElementById("grp-summary-sessions");
      if (summarySessionsEl) summarySessionsEl.innerText = `${generatedDatesList.length} حصص`;

      groupConflictsData = [];
      let totalConflictsCount = 0;

      if (teacherId && generatedDatesList.length > 0) {
        try {
          const checkRes = await apiFetch("/sessions/group-preview-conflicts", {
            method: "POST",
            body: JSON.stringify({
              teacherId,
              studentIds,
              scheduledDates: generatedDatesList.map(d => d.toISOString()),
              duration
            })
          });
          if (checkRes && checkRes.items) {
            groupConflictsData = checkRes.items;
            totalConflictsCount = checkRes.totalConflicts || 0;
          }
        } catch (e) {}
      }

      const conflictStatusEl = document.getElementById("grp-conflict-status-badge");
      if (conflictStatusEl) {
        if (totalConflictsCount === 0) {
          conflictStatusEl.innerHTML = '<span style="color:#10b981;">✓ لا توجد تعارضات (جاهز للحفظ)</span>';
        } else {
          conflictStatusEl.innerHTML = `<span style="color:#ef4444;">⚠️ تم رصد ${totalConflictsCount} تعارض</span>`;
        }
      }

      // Render Preview Table HTML
      const tbody = document.getElementById("group-dates-preview-tbody");
      if (tbody) {
        tbody.innerHTML = generatedDatesList.map((dt, idx) => {
          const conflictItem = groupConflictsData[idx];
          let statusBadge = '<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-weight:700;">✓ متاح بدون تعارض</span>';

          if (conflictItem && conflictItem.hasConflict) {
            const reasons = [];
            if (conflictItem.teacherConflict) {
              reasons.push(`<span style="color:#ef4444; font-weight:700;">⚠️ المعلم لديه حصة (${conflictItem.teacherConflict.time})</span>`);
            }
            if (conflictItem.studentConflicts && conflictItem.studentConflicts.length > 0) {
              const names = conflictItem.studentConflicts.map(s => s.studentName).join(', ');
              reasons.push(`<span style="color:#b45309; font-weight:700;">⚠️ تعارض للطلاب: ${names}</span>`);
            }
            statusBadge = `
              <div style="display:flex; flex-direction:column; gap:2px; font-size:0.75rem;">
                ${reasons.join('')}
              </div>
            `;
          }

          return `
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:8px 12px; font-weight:800; color:var(--primary);">#${idx + 1}</td>
              <td style="padding:8px 12px; font-weight:700;">${dt.toLocaleString('ar', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <td style="padding:8px 12px; color:var(--text-muted);">${daysAr[dt.getDay()]}</td>
              <td style="padding:8px 12px;">${statusBadge}</td>
            </tr>
          `;
        }).join('');
      }
    };

    // Update group counter live
    const updateGroupCounter = () => {
      const checkedCount = container.querySelectorAll(".group-student-checkbox:checked").length;
      const countEl = document.getElementById("group-count-num");
      if (countEl) countEl.innerText = String(checkedCount);

      const countSessions = parseInt(document.getElementById("group-sessions-count")?.value) || 4;
      const totalRecordsEl = document.getElementById("group-total-records");
      if (totalRecordsEl) totalRecordsEl.innerText = String(checkedCount * countSessions);
    };

    container.querySelectorAll(".group-student-checkbox").forEach(cb => {
      cb.addEventListener("change", updateGroupCounter);
    });

    document.getElementById("group-sessions-count")?.addEventListener("input", updateGroupCounter);
    document.getElementById("refresh-group-preview-btn")?.addEventListener("click", updatePreviewTable);

    // Initial group counter update
    updateGroupCounter();

    // Select all / Deselect all
    document.getElementById("group-select-all-btn")?.addEventListener("click", () => {
      container.querySelectorAll(".group-student-checkbox").forEach(cb => { cb.checked = true; });
      updateGroupCounter();
    });

    document.getElementById("group-deselect-all-btn")?.addEventListener("click", () => {
      container.querySelectorAll(".group-student-checkbox").forEach(cb => { cb.checked = false; });
      updateGroupCounter();
    });

    // Filter students by search
    document.getElementById("group-students-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      container.querySelectorAll(".group-student-item").forEach(item => {
        const text = item.getAttribute("data-search") || "";
        item.style.display = text.includes(q) ? "flex" : "none";
      });
    });

    // Form submission
    document.getElementById("group-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("group-session-title").value.trim();
      const teacherId = document.getElementById("group-session-teacher").value;
      const duration = parseInt(document.getElementById("group-session-duration").value) || 60;
      const meetingLink = document.getElementById("group-session-meeting-link").value.trim();

      const selectedStudentCbs = container.querySelectorAll(".group-student-checkbox:checked");
      const studentIds = Array.from(selectedStudentCbs).map(cb => cb.value);

      if (!teacherId) {
        showToast("الرجاء اختيار المعلم المسؤول عن المجموعة.", "error");
        return;
      }

      if (studentIds.length === 0) {
        showToast("الرجاء اختيار طالب واحد على الأقل لإضافته إلى الحصة الجماعية.", "error");
        return;
      }

      if (generatedDatesList.length === 0) {
        showToast("الرجاء تحديد مواعيد الحصص الجماعية بشكل صحيح.", "error");
        return;
      }

      const scheduledDates = generatedDatesList.map(dt => dt.toISOString());
      submitBtn.disabled = true;

      const doSubmit = async (allowConflicts = false) => {
        try {
          const res = await apiFetch("/sessions/group-schedule", {
            method: "POST",
            body: JSON.stringify({ title, teacherId, studentIds, scheduledDates, duration, meetingLink, allowConflicts }),
            silentError: true
          });

          showToast(res.message || `تم إدراج وجدولة ${scheduledDates.length} حصة جماعية لـ ${studentIds.length} طلاب بنجاح! 🚀`, "success");
          closeModal();
          await this.loadAllData();
          this.renderTab("sessions");
        } catch (err) {
          submitBtn.disabled = false;
          if (err.conflict && Array.isArray(err.conflicts)) {
            const conflictMsg = err.conflicts.map(c => `• ${c}`).join('\n');
            const force = confirm(`⚠️ تم اكتشاف تعارض في المواعيد التالية:\n\n${conflictMsg}\n\nهل ترغب في تجاوز التعارض وجدولة الحصص على أي حال؟`);
            if (force) {
              submitBtn.disabled = true;
              await doSubmit(true);
            }
          } else {
            showToast(err.message || "فشلت جدولة الحصص الجماعية.", "error");
          }
        }
      };

      await doSubmit(false);
    });
  }

};
