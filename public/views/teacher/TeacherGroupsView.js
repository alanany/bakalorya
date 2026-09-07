import { apiFetch, state, showToast, t, getCleanWhatsAppNumber, formatSessionDateTime, getTimezoneBadgeHTML, confirmDialog } from "../../app.js";

export default class TeacherGroupsView {
  constructor(container) {
    this.container = container;
    this.searchQuery = "";
    this.filterStatus = "all"; // 'all', 'live', 'open', 'pending', 'in_progress', 'completed'
    this.filterCourseId = "all";
    this.filterDay = "all";
    this.sortBy = "newest"; // 'newest', 'oldest', 'most_students', 'name'
    this.groupsData = [];
    this.teacherCourses = [];
    this.expandedGroupKeys = new Set();
    this.activeModalGroupId = null;
  }

  async render() {
    try {
      const [teacherGroups, sessions, allCourses] = await Promise.all([
        apiFetch("/teacher/groups").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/courses").catch(() => [])
      ]);

      const myTeacherId = state.user?.id;
      this.teacherCourses = (allCourses || []).filter(c => c.teacher?.id === myTeacherId || c.teacherId === myTeacherId);

      const rawSessions = sessions || [];
      const mySessions = rawSessions.filter(s => s.teacher?.id === myTeacherId || s.teacherId === myTeacherId);

      const groupMap = {};

      // 1. Process Database CourseGroups first
      (teacherGroups || []).forEach(g => {
        const key = `db_group_${g.id}`;
        groupMap[key] = {
          key,
          id: g.id,
          isDbGroup: true,
          title: g.name || 'مجموعة دراسية',
          status: g.status || 'OPEN',
          course: g.course,
          grade: g.course?.grade,
          subject: g.course?.subject,
          scheduleDays: g.scheduleDays || '',
          scheduleTime: g.scheduleTime || '',
          scheduleText: g.scheduleText || `${g.scheduleDays || ''} ${g.scheduleTime || ''}`.trim() || 'يُحدد لاحقاً',
          startDate: g.startDate,
          endDate: g.endDate,
          totalSessions: g.totalSessions || 24,
          sessionDuration: g.sessionDuration || 60,
          maxStudents: g.maxStudents || 25,
          enrolledCount: g.enrolledCount || (g.students || []).length,
          availableSeats: g.availableSeats !== undefined ? g.availableSeats : Math.max(0, (g.maxStudents || 25) - (g.enrolledCount || 0)),
          isFull: g.isFull || false,
          meetingLink: g.meetingLink || g.course?.meetingLink || state.user?.meetingLink || null,
          teacher: g.teacher || state.user,
          sessions: [],
          students: g.students || []
        };
      });

      // 2. Map Sessions to groups
      const isGroupSession = (s) =>
        !!s.course ||
        !s.student ||
        (s.type && String(s.type).toLowerCase().includes("group")) ||
        (s.title && String(s.title).includes("مجموعة"));

      const myGroupSessions = mySessions.filter(isGroupSession);

      myGroupSessions.forEach(s => {
        const courseId = s.course?.id;
        const matchingDbGroupKey = Object.keys(groupMap).find(k => groupMap[k].course?.id === courseId);

        if (matchingDbGroupKey) {
          groupMap[matchingDbGroupKey].sessions.push(s);
          if (s.student && s.student.id && !groupMap[matchingDbGroupKey].students.some(st => st.id === s.student.id)) {
            groupMap[matchingDbGroupKey].students.push(s.student);
          }
        } else {
          const titleKey = (s.title || 'مجموعة بدون عنوان').trim();
          const key = `session_${titleKey}__${courseId || 'nocourse'}`;

          if (!groupMap[key]) {
            groupMap[key] = {
              key,
              isDbGroup: false,
              title: titleKey,
              teacher: s.teacher || state.user,
              meetingLink: s.meetingLink || s.teacher?.meetingLink || state.user?.meetingLink || null,
              course: s.course,
              grade: s.course?.grade,
              subject: s.course?.subject,
              scheduleText: 'مواعيد الحصص المجدولة',
              maxStudents: 25,
              enrolledCount: s.student ? 1 : 0,
              availableSeats: 25,
              isFull: false,
              sessions: [],
              students: s.student ? [s.student] : []
            };
          }

          groupMap[key].sessions.push(s);
          if (s.student && s.student.id && !groupMap[key].students.some(st => st.id === s.student.id)) {
            groupMap[key].students.push(s.student);
          }
        }
      });

      // Sort dates
      Object.values(groupMap).forEach(g => {
        g.sessions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      });

      this.groupsData = Object.values(groupMap);
      this.renderUI();
    } catch (err) {
      console.error("Error rendering TeacherGroupsView:", err);
      this.container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--error);">حدث خطأ أثناء تحميل مجموعات المعلم.</div>`;
    }
  }

  renderUI() {
    const now = Date.now();

    // Process group status
    const processedGroups = this.groupsData.map(group => {
      let liveSession = null;
      let upcomingSessions = [];
      let completedCount = 0;

      const timeSlotsMap = {};
      group.sessions.forEach(s => {
        const slotKey = new Date(s.scheduledAt).toISOString();
        if (!timeSlotsMap[slotKey]) timeSlotsMap[slotKey] = s;
      });
      const uniqueSessions = Object.values(timeSlotsMap).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

      uniqueSessions.forEach(s => {
        const sTime = new Date(s.scheduledAt).getTime();
        const durM = s.duration || 60;
        const diffM = (sTime - now) / 60000;
        const isPast = diffM < -durM;
        const isLive = (s.status === "live" || s.status === "active") || (diffM <= 0 && diffM > -durM);
        const isSoon = diffM > 0 && diffM <= 30;

        if (isLive || isSoon) {
          if (!liveSession) liveSession = s;
        }
        if (!isPast) {
          upcomingSessions.push(s);
        } else {
          completedCount++;
        }
      });

      const isCompleted = uniqueSessions.length > 0 && completedCount === uniqueSessions.length;

      return {
        ...group,
        uniqueSessions,
        liveSession,
        upcomingSessions,
        nextSession: upcomingSessions[0] || null,
        completedCount,
        isCompleted
      };
    });

    processedGroups.sort((a, b) => {
      if (a.liveSession && !b.liveSession) return -1;
      if (!a.liveSession && b.liveSession) return 1;

      if (a.nextSession && b.nextSession) {
        return new Date(a.nextSession.scheduledAt).getTime() - new Date(b.nextSession.scheduledAt).getTime();
      }
      if (a.nextSession && !b.nextSession) return -1;
      if (!a.nextSession && b.nextSession) return 1;

      return (b.enrolledCount || 0) - (a.enrolledCount || 0);
    });

    const totalGroupsCount = processedGroups.length;
    const liveGroupsCount = processedGroups.filter(g => g.liveSession).length;
    const openGroupsCount = processedGroups.filter(g => g.status === 'OPEN').length;
    const pendingGroupsCount = processedGroups.filter(g => g.status === 'PENDING_APPROVAL').length;
    const inProgressGroupsCount = processedGroups.filter(g => g.status === 'IN_PROGRESS' || g.status === 'CLOSED').length;
    const completedGroupsCount = processedGroups.filter(g => g.isCompleted).length;
    const totalStudentsEnrolled = processedGroups.reduce((acc, g) => acc + (g.students ? g.students.length : (g.enrolledCount || 0)), 0);

    let filteredGroups = processedGroups.filter(g => {
      // 1. Text Search Query
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        g.title.toLowerCase().includes(q) ||
        (g.course?.title && g.course.title.toLowerCase().includes(q)) ||
        (g.grade?.name && g.grade.name.toLowerCase().includes(q)) ||
        (g.subject?.name && g.subject.name.toLowerCase().includes(q)) ||
        (g.students && g.students.some(st => (st.name && st.name.toLowerCase().includes(q)) || (st.phone && st.phone.includes(q)) || (st.email && st.email.toLowerCase().includes(q))));

      if (!matchQuery) return false;

      // 2. Status Filter
      if (this.filterStatus === "live") {
        if (!g.liveSession) return false;
      } else if (this.filterStatus === "open") {
        if (g.status !== "OPEN") return false;
      } else if (this.filterStatus === "pending") {
        if (g.status !== "PENDING_APPROVAL") return false;
      } else if (this.filterStatus === "in_progress") {
        if (g.status !== "IN_PROGRESS" && g.status !== "CLOSED") return false;
      } else if (this.filterStatus === "completed") {
        if (!g.isCompleted) return false;
      }

      // 3. Course Filter
      if (this.filterCourseId && this.filterCourseId !== "all") {
        if (String(g.course?.id) !== String(this.filterCourseId)) return false;
      }

      // 4. Day of the Week Filter
      if (this.filterDay && this.filterDay !== "all") {
        const daysText = `${g.scheduleDays || ''} ${g.scheduleText || ''}`;
        if (!daysText.includes(this.filterDay)) return false;
      }

      return true;
    });

    // Apply Sorting
    if (this.sortBy === "oldest") {
      filteredGroups.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (this.sortBy === "most_students") {
      filteredGroups.sort((a, b) => {
        const countA = a.students ? a.students.length : (a.enrolledCount || 0);
        const countB = b.students ? b.students.length : (b.enrolledCount || 0);
        return countB - countA;
      });
    } else if (this.sortBy === "name") {
      filteredGroups.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
    } else {
      // Default: Newest first
      filteredGroups.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    const hasActiveFilters = this.searchQuery || this.filterStatus !== 'all' || this.filterCourseId !== 'all' || this.filterDay !== 'all' || this.sortBy !== 'newest';

    this.container.innerHTML = `
      <style>
        .group-search-input:focus {
          border-color: #e51d74 !important;
          box-shadow: 0 0 0 3px rgba(229,29,116,0.15) !important;
        }
        .filter-tab-btn {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 800;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .filter-tab-btn.active {
          background: #e51d74;
          color: #ffffff;
          border-color: #e51d74;
          box-shadow: 0 4px 12px rgba(229,29,116,0.3);
        }
        .group-card-creative {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .group-card-creative:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px -10px rgba(0,0,0,0.12) !important;
        }
        .filter-select-input {
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--bg-app);
          color: var(--text-main);
          font-size: 0.82rem;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          outline: none;
          cursor: pointer;
        }
        .filter-select-input:focus {
          border-color: #e51d74;
        }
      </style>

      <div style="max-width:1280px; margin:0 auto; padding:24px 16px; display:flex; flex-direction:column; gap:20px; box-sizing:border-box;">
        
        <!-- Header Banner -->
        <div class="glass-card" style="padding:26px; border-radius:24px; background:linear-gradient(135deg, rgba(229,29,116,0.08), rgba(99,102,241,0.06)); border:1px solid rgba(229,29,116,0.2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 style="font-size:1.6rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i data-lucide="users" style="width:28px; height:28px; color:#e51d74;"></i>
              إدارة المجموعات الدراسية (لوحة المعلم) 👨‍🏫
            </h2>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">
              أنشئ المجموعات المباشرة، حدد الأيام الأسبوعية وسعة المقاعد، وتواصل فوراً مع طلابك عبر واتساب.
            </p>
          </div>
          
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <button id="open-create-group-modal-btn" class="btn-primary" style="padding:10px 22px; border-radius:30px; font-weight:900; background:#e51d74; border-color:#e51d74; gap:8px; display:inline-flex; align-items:center; box-shadow:0 4px 14px rgba(229,29,116,0.3);">
              <i data-lucide="plus-circle" style="width:18px; height:18px;"></i>
              <span>إنشاء مجموعة جديدة ➕</span>
            </button>
            ${getTimezoneBadgeHTML()}
          </div>
        </div>

        <!-- Summary Stats Bar -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; width:100%; box-sizing:border-box;">
          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #e51d74; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(229,29,116,0.12); color:#e51d74; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="users" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalGroupsCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">مجموعاتي التعليمية</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-radius:18px; border-inline-start:4px solid #10b981; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="radio" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:#10b981;">${liveGroupsCount}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">بث مباشر الآن 🔴</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 20px; border-inline-start:4px solid #6366f1; display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.4rem; font-weight:900; color:var(--text-main);">${totalStudentsEnrolled}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">إجمالي الطلاب المسجلين</div>
            </div>
          </div>
        </div>

        <!-- Comprehensive Filter & Search Bar -->
        <div class="glass-card" style="padding:18px 20px; border-radius:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:14px; width:100%; box-sizing:border-box;">
          
          <!-- Status Filter Tabs -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <span style="font-size:0.82rem; font-weight:800; color:var(--text-main); margin-inline-end:4px;">
                <i data-lucide="filter" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> الفلترة بالحالة:
              </span>
              <button class="filter-tab-btn ${this.filterStatus === 'all' ? 'active' : ''}" data-filter="all">
                الكل (${totalGroupsCount})
              </button>
              <button class="filter-tab-btn ${this.filterStatus === 'live' ? 'active' : ''}" data-filter="live">
                <span style="width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block;"></span> مباشر الآن (${liveGroupsCount})
              </button>
              <button class="filter-tab-btn ${this.filterStatus === 'open' ? 'active' : ''}" data-filter="open">
                🟢 متاح للتسجيل (${openGroupsCount})
              </button>
              <button class="filter-tab-btn ${this.filterStatus === 'pending' ? 'active' : ''}" data-filter="pending">
                ⏳ قيد المراجعة (${pendingGroupsCount})
              </button>
              <button class="filter-tab-btn ${this.filterStatus === 'in_progress' ? 'active' : ''}" data-filter="in_progress">
                🔒 بدأت الدراسة (${inProgressGroupsCount})
              </button>
            </div>

            ${hasActiveFilters ? `
              <button id="reset-group-filters-btn" style="background:rgba(239,68,68,0.08); color:#ef4444; border:1px solid rgba(239,68,68,0.25); border-radius:20px; padding:5px 12px; font-size:0.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="rotate-ccw" style="width:12px; height:12px;"></i> إعادة ضبط الفلاتر
              </button>
            ` : ''}
          </div>

          <!-- Secondary Filters Row (Search, Course, Day, Sort) -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            
            <!-- Search Box -->
            <div style="position:relative; flex:1; min-width:240px; max-width:380px;">
              <input type="text" id="group-search-input" class="group-search-input" value="${this.searchQuery}" placeholder="ابحث باسم المجموعة، المادة، أو الطالب..."
                style="width:100%; padding:9px 16px 9px 38px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.85rem; outline:none; box-sizing:border-box;">
              <i data-lucide="search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
            </div>

            <!-- Dropdown Selects -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              
              <!-- Course Filter Dropdown -->
              <select id="group-filter-course" class="filter-select-input">
                <option value="all" ${this.filterCourseId === 'all' ? 'selected' : ''}>📚 جميع الكورسات (${this.teacherCourses.length})</option>
                ${this.teacherCourses.map(c => `
                  <option value="${c.id}" ${String(this.filterCourseId) === String(c.id) ? 'selected' : ''}>
                    ${c.title} ${c.grade ? `(${c.grade.name})` : ''}
                  </option>
                `).join('')}
              </select>

              <!-- Day Filter Dropdown -->
              <select id="group-filter-day" class="filter-select-input">
                <option value="all" ${this.filterDay === 'all' ? 'selected' : ''}>📅 جميع الأيام</option>
                <option value="السبت" ${this.filterDay === 'السبت' ? 'selected' : ''}>السبت</option>
                <option value="الأحد" ${this.filterDay === 'الأحد' ? 'selected' : ''}>الأحد</option>
                <option value="الاثنين" ${this.filterDay === 'الاثنين' ? 'selected' : ''}>الاثنين</option>
                <option value="الثلاثاء" ${this.filterDay === 'الثلاثاء' ? 'selected' : ''}>الثلاثاء</option>
                <option value="الأربعاء" ${this.filterDay === 'الأربعاء' ? 'selected' : ''}>الأربعاء</option>
                <option value="الخميس" ${this.filterDay === 'الخميس' ? 'selected' : ''}>الخميس</option>
                <option value="الجمعة" ${this.filterDay === 'الجمعة' ? 'selected' : ''}>الجمعة</option>
              </select>

              <!-- Sort Dropdown -->
              <select id="group-sort-by" class="filter-select-input">
                <option value="newest" ${this.sortBy === 'newest' ? 'selected' : ''}>⏱️ الأحدث إضافة</option>
                <option value="oldest" ${this.sortBy === 'oldest' ? 'selected' : ''}>📅 الأقدم</option>
                <option value="most_students" ${this.sortBy === 'most_students' ? 'selected' : ''}>👥 الأكثر تسجيلاً للطلاب</option>
                <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>🔤 أبجدياً (الاسم)</option>
              </select>

            </div>

          </div>

        </div>

        <!-- Group Cards Grid & Results Info -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0 4px; flex-wrap:wrap; gap:10px;">
          <span style="font-size:0.85rem; font-weight:800; color:var(--text-muted);">
            عرض <strong style="color:var(--text-main);">${filteredGroups.length}</strong> من أصل <strong style="color:var(--text-main);">${totalGroupsCount}</strong> مجموعة دراسية
          </span>
        </div>

        ${filteredGroups.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 24px; border-radius:24px; color:var(--text-muted);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(229,29,116,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
              <i data-lucide="search-x" style="width:32px; height:32px; color:#e51d74; opacity:0.6;"></i>
            </div>
            <h3 style="font-size:1.15rem; font-weight:900; margin:0 0 8px 0; color:var(--text-main);">
              ${hasActiveFilters ? 'لا توجد مجموعات تطابق الفلاتر المحددة' : 'لم تقم بإنشاء أي مجموعة بعد'}
            </h3>
            <p style="font-size:0.88rem; line-height:1.6; max-width:440px; margin:0 auto 20px auto; color:var(--text-muted);">
              ${hasActiveFilters ? 'جرب تغيير شروط البحث أو الفلاتر للعثور على المجموعات المطلوبة.' : 'ابدأ الآن بإنشاء مجموعة دراسية جديدة لكورساتك لتحديد مواعيد الحصص المباشرة والحد الأقصى للطلاب.'}
            </p>
            ${hasActiveFilters ? `
              <button id="empty-state-reset-filters-btn" class="btn-secondary" style="padding:10px 22px; border-radius:20px; font-weight:800;">
                إعادة ضبط جميع الفلاتر 🔄
              </button>
            ` : `
              <button id="empty-state-create-group-btn" class="btn-primary" style="padding:10px 24px; border-radius:24px; font-weight:800; background:#e51d74; border-color:#e51d74;">
                ➕ إنشاء أول مجموعة دراسية
              </button>
            `}
          </div>
        ` : `
          <!-- 🌟 SLEEK MODERN GROUP CARDS GRID FOR TEACHER 🌟 -->
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px; width:100%; box-sizing:border-box;">
            ${filteredGroups.map((group, idx) => this.renderTeacherGroupCard(group, idx, now)).join('')}
          </div>
        `}

      </div>

      <!-- Modal Containers -->
      <div id="teacher-group-modal-container"></div>
      <div id="create-group-modal-container"></div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderTeacherGroupCard(group, idx, now) {
    const totalCount = group.uniqueSessions.length || group.totalSessions || 24;
    const studentsCount = group.enrolledCount || (group.students ? group.students.length : 0);
    const maxCapacity = group.maxStudents || 25;
    const capacityPct = Math.min(100, Math.round((studentsCount / maxCapacity) * 100));

    const isPending = group.status === 'PENDING_APPROVAL' || group.status === 'PENDING' || group.status === 'pending';
    const isLive = Boolean(group.liveSession);
    const isClosedOrTeaching = group.status === 'IN_PROGRESS' || group.status === 'CLOSED';
    const isFull = group.isFull || group.status === 'FULL' || capacityPct >= 100;

    const accentColor = isLive ? '#10b981' : isPending ? '#f59e0b' : isClosedOrTeaching ? '#6366f1' : isFull ? '#ef4444' : '#10b981';

    return `
      <div class="glass-card group-card-creative" data-group-id="${group.id}" data-key="${group.key}"
        style="border-radius:22px; border:1px solid var(--border-color); border-top:4px solid ${accentColor}; background:var(--bg-card); display:flex; flex-direction:column; overflow:hidden; padding:20px; gap:14px; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
        
        <!-- Card Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
              <span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                ${group.course?.title || 'مقرر دراسي'}
              </span>
              ${group.grade ? `<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:8px;">${group.grade.name}</span>` : ''}
              ${group.subject ? `<span class="badge" style="background:rgba(229,29,116,0.1); color:#e51d74; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:8px;">${group.subject.name}</span>` : ''}
            </div>
            <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.3;">
              👥 ${group.title}
            </h3>
          </div>

          <!-- Status Badge -->
          ${isLive ? `
            <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.35); white-space:nowrap; flex-shrink:0;">
              🔴 مباشر الآن
            </span>
          ` : isPending ? `
            <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.3); white-space:nowrap; flex-shrink:0;">
              ⏳ قيد الاعتماد
            </span>
          ` : isClosedOrTeaching ? `
            <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(99,102,241,0.15); color:#6366f1; border:1px solid rgba(99,102,241,0.35); white-space:nowrap; flex-shrink:0;">
              🔒 بدأت الدراسة
            </span>
          ` : isFull ? `
            <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); white-space:nowrap; flex-shrink:0;">
              🔴 مكتملة
            </span>
          ` : `
            <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); white-space:nowrap; flex-shrink:0;">
              🟢 متاح للتسجيل
            </span>
          `}
        </div>

        <!-- Schedule Pill -->
        <div style="padding:8px 12px; border-radius:12px; background:rgba(229,29,116,0.06); border:1px solid rgba(229,29,116,0.15); display:flex; align-items:center; justify-content:space-between; gap:6px;">
          <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:800; color:#e51d74;">
            <i data-lucide="calendar" style="width:14px; height:14px;"></i>
            <span>مواعيد الحصص:</span>
          </div>
          <span style="font-size:0.8rem; font-weight:800; color:var(--text-main);">${group.scheduleText}</span>
        </div>

        <!-- Students Capacity Info -->
        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-weight:800;">
            <span style="color:var(--text-muted);">👥 الطلاب المسجلون:</span>
            <span style="color:var(--text-main);">${studentsCount} من ${maxCapacity} مقعداً ${group.availableSeats > 0 ? `(${group.availableSeats} شاغر)` : '(مكتملة)'}</span>
          </div>
          <div style="width:100%; height:6px; background:var(--bg-app); border-radius:10px; overflow:hidden; border:1px solid var(--border-color);">
            <div style="width:${capacityPct}%; height:100%; background:${capacityPct >= 95 ? '#ef4444' : capacityPct >= 75 ? '#f59e0b' : '#10b981'}; border-radius:10px;"></div>
          </div>
        </div>

        <!-- Pending Notice or Actions -->
        ${isPending ? `
          <div style="margin-top:auto; padding:10px 12px; background:rgba(245,158,11,0.08); border-radius:12px; border:1px dashed rgba(245,158,11,0.3); font-size:0.78rem; color:#d97706; font-weight:700; display:flex; align-items:center; gap:6px;">
            <i data-lucide="info" style="width:14px; height:14px; flex-shrink:0;"></i>
            <span>المجموعة قيد مراجعة واعتماد الإدارة ⏳</span>
          </div>
        ` : `
          <!-- Action Buttons -->
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
            ${isLive ? `
              <button data-join-meet-id="${group.liveSession.id}" class="btn-primary"
                style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:10px 16px; border-radius:14px; font-size:0.84rem; font-weight:800; border:none; background:#10b981; color:#fff; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                <i data-lucide="video" style="width:15px; height:15px;"></i>
                فتح Google Meet الآن 🔴
              </button>
            ` : ''}

            ${group.id ? `
              <a href="#group/${group.id}" class="btn-primary"
                style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:11px 16px; border-radius:14px; font-size:0.88rem; font-weight:900; text-decoration:none; background:linear-gradient(135deg, #0ea5e9, #6366f1); color:#fff; box-shadow:0 4px 14px rgba(14,165,233,0.25); transition:transform 0.15s;"
                onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <i data-lucide="layout-dashboard" style="width:16px; height:16px;"></i>
                <span>إدارة قاعة المجموعة 🚀</span>
              </a>
            ` : ''}
          </div>
        `}

      </div>
    `;
  }

  // ── Open Create Group Modal (Teacher View) ──────────────────────────────────
  openCreateGroupModal() {
    const container = document.getElementById("create-group-modal-container");
    if (!container) return;

    const courseOptions = this.teacherCourses.map(c => `
      <option value="${c.id}">
        ${c.title} ${c.grade ? `(${c.grade.name})` : ''} ${c.subject ? `• ${c.subject.name}` : ''}
      </option>
    `).join('');

    container.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:560px; border-radius:28px; padding:26px; max-height:90vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          
          <!-- Modal Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <h3 style="font-size:1.2rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i data-lucide="plus-circle" style="width:20px; height:20px; color:#e51d74;"></i>
                إنشاء وإضافة مجموعة دراسية جديدة 👥
              </h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                حدد المادة وأيام ومواعيد الحصص لإرسالها لمراجعة واعتماد الإدارة وتحديد المقاعد.
              </p>
            </div>
            <button id="close-create-group-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">
              &times;
            </button>
          </div>

          <form id="create-group-form" style="display:flex; flex-direction:column; gap:18px; overflow-y:auto; padding-inline-end:4px;">
            
            <!-- Course Select -->
            <div>
              <label style="display:block; font-size:0.88rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">
                الكورس / المادة الدراسية: <span style="color:#ef4444;">*</span>
              </label>
              ${this.teacherCourses.length === 0 ? `
                <div style="padding:10px; border-radius:12px; background:rgba(239,68,68,0.1); color:#ef4444; font-size:0.82rem; font-weight:700;">
                  ⚠️ ليس لديك أي كورسات منشورة حالياً لإنشاء مجموعات لها. يرجى إنشاء كورس أولاً.
                </div>
              ` : `
                <select id="modal-group-course-id" required style="width:100%; padding:12px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.92rem; font-family:'Cairo',sans-serif;">
                  ${courseOptions}
                </select>
              `}
            </div>

            <!-- Days Checkboxes -->
            <div>
              <label style="display:block; font-size:0.88rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">
                أيام الأسبوع للحصص: <span style="color:#ef4444;">*</span>
              </label>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(95px, 1fr)); gap:8px;">
                ${["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map((day, idx) => `
                  <label style="display:flex; align-items:center; gap:6px; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); font-size:0.85rem; font-weight:700; cursor:pointer;">
                    <input type="checkbox" name="modal-group-days" value="${day}" ${idx === 1 || idx === 3 ? 'checked' : ''} style="accent-color:#e51d74; width:16px; height:16px;">
                    <span>${day}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Schedule Time (Select Dropdown) -->
            <div>
              <label style="display:block; font-size:0.88rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">
                توقيت الحصة: <span style="color:#ef4444;">*</span>
              </label>
              <select id="modal-group-time" required
                style="width:100%; padding:12px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.92rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
                <option value="09:00 ص">09:00 ص (9:00 صباحاً)</option>
                <option value="10:00 ص">10:00 ص (10:00 صباحاً)</option>
                <option value="11:00 ص">11:00 ص (11:00 صباحاً)</option>
                <option value="12:00 م">12:00 م (12:00 ظهراً)</option>
                <option value="01:00 م">01:00 م (1:00 ظهراً)</option>
                <option value="02:00 م">02:00 م (2:00 ظهراً)</option>
                <option value="03:00 م">03:00 م (3:00 عصراً)</option>
                <option value="03:30 م">03:30 م (3:30 عصراً)</option>
                <option value="04:00 م">04:00 م (4:00 عصراً)</option>
                <option value="04:30 م">04:30 م (4:30 عصراً)</option>
                <option value="05:00 م">05:00 م (5:00 مساءً)</option>
                <option value="05:30 م">05:30 م (5:30 مساءً)</option>
                <option value="06:00 م" selected>06:00 م (6:00 مساءً)</option>
                <option value="06:30 م">06:30 م (6:30 مساءً)</option>
                <option value="07:00 م">07:00 م (7:00 مساءً)</option>
                <option value="07:30 م">07:30 م (7:30 مساءً)</option>
                <option value="08:00 م">08:00 م (8:00 مساءً)</option>
                <option value="08:30 م">08:30 م (8:30 مساءً)</option>
                <option value="09:00 م">09:00 م (9:00 مساءً)</option>
                <option value="09:30 م">09:30 م (9:30 مساءً)</option>
                <option value="10:00 م">10:00 م (10:00 مساءً)</option>
              </select>
            </div>

            <!-- Meeting Link -->
            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                رابط البث المباشر المخصص (Zoom / Meet) - اختياري:
              </label>
              <input type="url" id="modal-group-meeting-link" placeholder="https://zoom.us/j/... أو https://meet.google.com/..."
                style="width:100%; padding:11px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.9rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
            </div>

            <!-- Submit Buttons -->
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
              <button type="button" id="cancel-create-group-btn" class="btn-secondary" style="padding:10px 20px; border-radius:20px;">
                إلغاء
              </button>
              <button type="submit" id="submit-create-group-btn" class="btn-primary" style="padding:10px 28px; border-radius:20px; font-weight:900; background:#e51d74; border-color:#e51d74;" ${this.teacherCourses.length === 0 ? 'disabled' : ''}>
                إرسال المجموعة للمراجعة والاعتماد 🚀
              </button>
            </div>

          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-create-group-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-create-group-btn")?.addEventListener("click", closeModal);

    document.getElementById("create-group-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const courseId = document.getElementById("modal-group-course-id")?.value;
      const scheduleTime = document.getElementById("modal-group-time")?.value.trim() || "6:00م";
      const meetingLink = document.getElementById("modal-group-meeting-link")?.value.trim() || null;

      const checkedDays = Array.from(document.querySelectorAll("input[name='modal-group-days']:checked")).map(cb => cb.value);
      const scheduleDays = checkedDays.join("، ") || "الأحد، الثلاثاء";
      const scheduleText = `${scheduleDays} الساعة ${scheduleTime}`;
      const name = `مجموعة ${scheduleDays} (${scheduleTime})`;

      if (!courseId) {
        showToast("يرجى اختيار الكورس.", "error");
        return;
      }

      const submitBtn = document.getElementById("submit-create-group-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الإرسال...";
      }

      try {
        await apiFetch(`/courses/${courseId}/groups`, {
          method: "POST",
          body: JSON.stringify({
            name,
            scheduleDays,
            scheduleTime,
            scheduleText,
            meetingLink
          })
        });

        showToast("تم إرسال المجموعة لمراجعة واعتماد الإدارة بنجاح! ⏳🚀", "success");
        closeModal();
        await this.render();
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "إرسال المجموعة للمراجعة والاعتماد 🚀";
        }
        showToast(err.message || "فشل إرسال المجموعة.", "error");
      }
    });
  }

  // ── Open Students Modal (Teacher View - Anonymized / NO Contacts) ─────────────
  async openStudentsModal(groupKey) {
    const group = this.groupsData.find(g => g.key === groupKey);
    if (!group) return;

    const container = document.getElementById("teacher-group-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:540px; border-radius:24px; padding:24px; max-height:85vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          <div style="text-align:center; padding:40px;">
            <div class="spinner" style="width:36px; height:36px; margin:0 auto 12px; border-width:3px;"></div>
            <p style="font-weight:700; font-size:0.92rem; color:var(--text-muted);">جارٍ تحميل قائمة طلاب المجموعة...</p>
          </div>
        </div>
      </div>
    `;

    let students = group.students || [];

    if (group.id) {
      try {
        const res = await apiFetch(`/groups/${group.id}/roster`);
        if (res && Array.isArray(res.students)) {
          students = res.students;
          group.students = students;
        }
      } catch (err) {
        console.warn("Could not fetch fresh roster, falling back to cached students", err);
      }
    }

    container.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:540px; border-radius:24px; padding:24px; max-height:85vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          
          <!-- Modal Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i data-lucide="users" style="width:20px; height:20px; color:#e51d74;"></i>
                قائمة طلاب المجموعة (${students.length}) 👥
              </h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                👥 ${group.title || group.name} • سعة المجموعة: ${group.maxStudents || 25} طالب
              </p>
            </div>
            <button id="close-teacher-group-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main);">
              &times;
            </button>
          </div>

          <!-- Students List (Anonymized - Name & Seat status ONLY, No phone / WhatsApp) -->
          <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; padding-inline-end:4px;">
            ${students.length === 0 ? `
              <div style="text-align:center; padding:40px; color:var(--text-muted); font-size:0.88rem;">
                <i data-lucide="users" style="width:40px; height:40px; opacity:0.3; margin:0 auto 10px; display:block;"></i>
                لا يوجد طلاب مسجلون في هذه المجموعة حتى الآن.
              </div>
            ` : students.map((st, idx) => {
              const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(st.name || `student_${idx}`)}`;
              const isPending = st.status && st.status.toLowerCase() === "pending";
              return `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:16px; background:var(--bg-app); border:1px solid var(--border-color);">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:28px; height:28px; border-radius:8px; background:rgba(99,102,241,0.1); color:var(--primary); font-weight:800; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">
                      ${idx + 1}
                    </div>
                    <img src="${avatar}" alt="${st.name}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color); background:var(--bg-card);">
                    <div>
                      <div style="font-size:0.92rem; font-weight:800; color:var(--text-main);">${st.name}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">طالب مقيد بالمجموعة 🎓</div>
                    </div>
                  </div>

                  <span style="padding:4px 10px; border-radius:12px; background:${isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'}; color:${isPending ? '#d97706' : '#10b981'}; font-weight:800; font-size:0.75rem; border:1px solid ${isPending ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}; display:inline-flex; align-items:center; gap:4px;">
                    ${isPending ? '⏳ قيد المراجعة' : '✅ مقعد نشط'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("close-teacher-group-modal")?.addEventListener("click", () => {
      container.innerHTML = "";
    });
  }

  // ── Open Teacher Group Sessions Modal ─────────────────────────────────────────
  async openGroupSessionsModal(groupId, groupKey) {
    const group = this.groupsData.find(g => g.key === groupKey || String(g.id) === String(groupId));
    const container = document.getElementById("teacher-group-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:680px; border-radius:24px; padding:26px; max-height:88vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          <div style="text-align:center; padding:40px;">
            <div class="spinner" style="width:40px; height:40px; margin:0 auto 12px; border-width:3px;"></div>
            <p style="font-weight:700; font-size:0.95rem; color:var(--text-muted);">جارٍ تحميل جدول الحصص المباشرة...</p>
          </div>
        </div>
      </div>
    `;

    let sessions = [];
    let groupInfo = group;

    if (groupId) {
      try {
        const res = await apiFetch(`/groups/${groupId}/sessions`);
        sessions = res.sessions || [];
        if (res.group) groupInfo = { ...group, ...res.group };
      } catch (e) {
        sessions = group?.uniqueSessions || [];
      }
    } else {
      sessions = group?.uniqueSessions || [];
    }

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} الساعة ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    container.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:680px; border-radius:24px; padding:26px; max-height:88vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <h3 style="font-size:1.2rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i data-lucide="calendar" style="width:22px; height:22px; color:var(--primary);"></i>
                جدول الحصص المباشرة (${sessions.length} حصة) 📅
              </h3>
              <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
                👥 ${groupInfo?.name || groupInfo?.title || 'المجموعة الدراسية'} • ${groupInfo?.scheduleText || ''}
              </p>
            </div>
            <button id="close-sessions-modal-btn" style="background:var(--bg-app); border:1px solid var(--border-color); width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">
              &times;
            </button>
          </div>

          <!-- Sessions Scrollable List -->
          <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; padding-inline-end:4px;">
            ${sessions.length === 0 ? `
              <div style="text-align:center; padding:40px; color:var(--text-muted); font-size:0.9rem;">
                لم يتم توليد أو جدولة حصص لهذه المجموعة بعد.
              </div>
            ` : sessions.map((sess, idx) => {
              const sTime = new Date(sess.scheduledAt).getTime();
              const durM = sess.duration || groupInfo?.sessionDuration || 60;
              const nowTime = Date.now();
              const diffM = (sTime - nowTime) / 60000;
              const isPast = diffM < -durM || sess.status === 'COMPLETED';
              const isLive = (sess.status === 'live' || sess.status === 'active') || (diffM <= 0 && diffM > -durM);

              return `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 16px; border-radius:14px; background:var(--bg-app); border:1px solid ${isLive ? '#10b981' : 'var(--border-color)'}; flex-wrap:wrap;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:10px; background:${isLive ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)'}; color:${isLive ? '#10b981' : 'var(--primary)'}; font-weight:900; font-size:0.82rem; display:flex; align-items:center; justify-content:center;">
                      ${idx + 1}
                    </div>
                    <div>
                      <strong style="font-size:0.9rem; color:var(--text-main); display:block;">
                        ${sess.title || `حصة ${idx + 1}`}
                      </strong>
                      <span style="font-size:0.78rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px; margin-top:2px;">
                        <i data-lucide="clock" style="width:12px; height:12px;"></i>
                        ${formatArabicDate(sess.scheduledAt)} (${durM} دقيقة)
                      </span>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:8px;">
                    ${isLive ? `
                      <button data-join-meet-id="${sess.id}" style="padding:6px 14px; border-radius:12px; font-weight:800; font-size:0.78rem; background:#10b981; color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(16,185,129,0.3);">
                        <i data-lucide="video" style="width:13px; height:13px;"></i> فتح Google Meet الآن 🔴
                      </button>
                    ` : isPast ? `
                      <span style="padding:4px 10px; border-radius:10px; background:rgba(107,114,128,0.1); color:#6b7280; font-size:0.74rem; font-weight:700;">
                        ✓ حصة مكتملة
                      </span>
                    ` : `
                      <button data-join-meet-id="${sess.id}" style="padding:6px 12px; border-radius:12px; font-weight:800; font-size:0.76rem; background:rgba(99,102,241,0.1); color:var(--primary); border:1px solid rgba(99,102,241,0.25); cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="video" style="width:13px; height:13px;"></i> Google Meet 🎥
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    document.getElementById("close-sessions-modal-btn")?.addEventListener("click", () => {
      container.innerHTML = "";
    });
  }

  bindEvents() {
    // Open create group modal
    document.getElementById("open-create-group-modal-btn")?.addEventListener("click", () => {
      this.openCreateGroupModal();
    });
    document.getElementById("empty-state-create-group-btn")?.addEventListener("click", () => {
      this.openCreateGroupModal();
    });

    const searchInput = this.container.querySelector("#group-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderUI();
      });
    }

    // Course Filter Dropdown
    const courseFilter = this.container.querySelector("#group-filter-course");
    if (courseFilter) {
      courseFilter.addEventListener("change", (e) => {
        this.filterCourseId = e.target.value;
        this.renderUI();
      });
    }

    // Day Filter Dropdown
    const dayFilter = this.container.querySelector("#group-filter-day");
    if (dayFilter) {
      dayFilter.addEventListener("change", (e) => {
        this.filterDay = e.target.value;
        this.renderUI();
      });
    }

    // Sort By Dropdown
    const sortBySelect = this.container.querySelector("#group-sort-by");
    if (sortBySelect) {
      sortBySelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.renderUI();
      });
    }

    // Reset Filters Buttons
    const resetFilters = () => {
      this.searchQuery = "";
      this.filterStatus = "all";
      this.filterCourseId = "all";
      this.filterDay = "all";
      this.sortBy = "newest";
      this.renderUI();
    };
    this.container.querySelector("#reset-group-filters-btn")?.addEventListener("click", resetFilters);
    this.container.querySelector("#empty-state-reset-filters-btn")?.addEventListener("click", resetFilters);

    this.container.querySelectorAll(".filter-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.filterStatus = btn.getAttribute("data-filter");
        this.renderUI();
      });
    });
  }
}
