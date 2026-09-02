import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminSessionsPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminSessionsPage = {

  renderGroupsTab() {
    const allCourseGroups = this.allCourseGroups || [];
    const allSessions = this.allSessions || [];

    // Map all CourseGroups from DB
    const groupsList = allCourseGroups.map(cg => {
      const teacherName = cg.teacher?.name || cg.course?.teacher?.name || "معلم المنصة";
      const courseTitle = cg.course?.title || "كورس تعليمي";
      const gradeName = cg.course?.grade?.name || "";
      const subjectName = cg.course?.subject?.name || "";
      
      const enrolledCount = cg.enrolledCount !== undefined ? cg.enrolledCount : 0;
      const maxSeats = cg.maxStudents || 25;
      const availableSeats = cg.availableSeats !== undefined ? cg.availableSeats : Math.max(0, maxSeats - enrolledCount);
      const isFull = cg.isFull || enrolledCount >= maxSeats;

      return {
        id: cg.id,
        isDbGroup: true,
        rawGroup: cg,
        title: cg.name || `مجموعة ${cg.scheduleDays || ''}`,
        course: cg.course,
        courseTitle,
        gradeName,
        subjectName,
        teacher: cg.teacher || cg.course?.teacher,
        teacherName,
        scheduleText: cg.scheduleText || `${cg.scheduleDays || "الأحد والثلاثاء"} ${cg.scheduleTime || "6:00م"}`,
        scheduleDays: cg.scheduleDays || "الأحد، الثلاثاء",
        scheduleTime: cg.scheduleTime || "6:00م",
        startDate: cg.startDate,
        endDate: cg.endDate,
        totalSessions: cg.totalSessions || 24,
        sessionDuration: cg.sessionDuration || 60,
        studentHourlyRate: cg.studentHourlyRate || cg.sessionPrice || 40,
        teacherHourlyRate: cg.teacherHourlyRate || cg.teacher?.hourlyRate || 100,
        sessionPrice: cg.sessionPrice || cg.studentHourlyRate || 40,
        monthlyPrice: cg.monthlyPrice || ((cg.studentHourlyRate || 40) * 8),
        maxSeats,
        enrolledCount,
        availableSeats,
        isFull,
        status: cg.status || "OPEN",
        meetingLink: cg.meetingLink || null,
        sessions: allSessions.filter(s => String(s.groupId) === String(cg.id) || (s.course && String(s.course.id) === String(cg.course?.id)))
      };
    });

    const allCourses = this.courses || [];
    const allTeachers = (this.allMembers || []).filter(m => m.role === 'teacher' || m.role === 'instructor');

    const totalStudentsInGroups = groupsList.reduce((acc, g) => acc + g.enrolledCount, 0);
    const totalGroupsCount = groupsList.length;
    const openGroupsCount = groupsList.filter(g => g.status === 'OPEN').length;
    const inProgressGroupsCount = groupsList.filter(g => g.status === 'IN_PROGRESS' || g.status === 'CLOSED').length;
    const fullGroupsCount = groupsList.filter(g => g.isFull).length;
    const pendingGroupsCount = (this.pendingCourseGroups || []).length;

    // Apply Filters
    let filteredGroups = groupsList.filter(grp => {
      // 1. Text Search Query
      const q = (this.adminGroupSearchQuery || '').toLowerCase().trim();
      const matchQuery = !q ||
        (grp.title && grp.title.toLowerCase().includes(q)) ||
        (grp.courseTitle && grp.courseTitle.toLowerCase().includes(q)) ||
        (grp.teacherName && grp.teacherName.toLowerCase().includes(q)) ||
        (grp.gradeName && grp.gradeName.toLowerCase().includes(q)) ||
        (grp.subjectName && grp.subjectName.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // 2. Status Filter
      const statusFilter = this.adminGroupFilterStatus || 'all';
      if (statusFilter === 'open') {
        if (grp.status !== 'OPEN') return false;
      } else if (statusFilter === 'in_progress') {
        if (grp.status !== 'IN_PROGRESS' && grp.status !== 'CLOSED') return false;
      } else if (statusFilter === 'full') {
        if (!grp.isFull) return false;
      }

      // 3. Course Filter
      const courseFilter = this.adminGroupCourseFilter || 'all';
      if (courseFilter !== 'all') {
        if (String(grp.course?.id) !== String(courseFilter)) return false;
      }

      // 4. Teacher Filter
      const teacherFilter = this.adminGroupTeacherFilter || 'all';
      if (teacherFilter !== 'all') {
        if (String(grp.teacher?.id) !== String(teacherFilter)) return false;
      }

      return true;
    });

    // Apply Sorting
    const sortBy = this.adminGroupSort || 'newest';
    if (sortBy === 'oldest') {
      filteredGroups.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (sortBy === 'most_students') {
      filteredGroups.sort((a, b) => b.enrolledCount - a.enrolledCount);
    } else if (sortBy === 'highest_student_rate') {
      filteredGroups.sort((a, b) => (b.studentHourlyRate || 0) - (a.studentHourlyRate || 0));
    } else if (sortBy === 'lowest_student_rate') {
      filteredGroups.sort((a, b) => (a.studentHourlyRate || 0) - (b.studentHourlyRate || 0));
    } else {
      // Default: newest
      filteredGroups.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    const hasActiveFilters = Boolean(
      (this.adminGroupSearchQuery && this.adminGroupSearchQuery.trim()) ||
      (this.adminGroupFilterStatus && this.adminGroupFilterStatus !== 'all') ||
      (this.adminGroupCourseFilter && this.adminGroupCourseFilter !== 'all') ||
      (this.adminGroupTeacherFilter && this.adminGroupTeacherFilter !== 'all') ||
      (this.adminGroupSort && this.adminGroupSort !== 'newest')
    );

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return "غير محدد";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    return `
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
          <div>
            <h3 style="font-weight:800; font-size:1.25rem; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="users" style="color:var(--primary);"></i>
              👥 إدارة المجموعات والحصص الجماعية (${groupsList.length} مجموعات)
            </h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 0 0;">
              تحكم كامل في تعديل تفاصيل وأسعار وسعة المجموعات، إغلاق المجموعات عند بدء الدراسة، وتعيين المعلمين.
            </p>
          </div>
          <button class="btn-primary" id="admin-groups-add-btn" style="padding:11px 20px; font-weight:800; font-size:0.9rem; gap:8px; background:linear-gradient(135deg,#8b5cf6,#ec4899); border:none; border-radius:14px; cursor:pointer;">
            <i data-lucide="plus-circle" style="width:18px; height:18px;"></i> ➕ إضافة وجدولة مجموعة أونلاين جديدة
          </button>
        </div>

        <!-- Summary Stat Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:20px;">
          <div class="glass-card" style="padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(139,92,246,0.15); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="users" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.35rem; font-weight:900; color:var(--text-main);">${totalGroupsCount}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">إجمالي المجموعات</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.35rem; font-weight:900; color:#10b981;">${totalStudentsInGroups}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">الطلاب المسجلين</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="check-circle-2" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.35rem; font-weight:900; color:#10b981;">${openGroupsCount}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">مجموعات متاحة للتسجيل</div>
            </div>
          </div>

          <div class="glass-card" style="padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; align-items:center; gap:14px; background:var(--bg-card);">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(245,158,11,0.15); color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="clock" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:1.35rem; font-weight:900; color:#d97706;">${pendingGroupsCount}</div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">بانتظار الاعتماد ⏳</div>
            </div>
          </div>
        </div>

        <!-- Pending Groups Approval Banner (Admin Only) -->
        ${(this.pendingCourseGroups && this.pendingCourseGroups.length > 0) ? `
          <div class="glass-card" style="margin-bottom:24px; padding:20px; border-radius:20px; border:2px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <h4 style="font-weight:900; font-size:1.1rem; color:#d97706; margin:0; display:flex; align-items:center; gap:8px;">
                <i data-lucide="clock" style="width:20px; height:20px;"></i>
                ⏳ مجموعات دراسية بانتظار المراجعة والاعتماد وتحديد المقاعد والأسعار (${this.pendingCourseGroups.length})
              </h4>
              <span style="font-size:0.78rem; font-weight:800; color:var(--text-muted);">
                اضغط على "اعتماد ونشر المجموعة" لضبط سعر ساعة الطالب وأجر المعلم والتواريخ وسعة المقاعد
              </span>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
              ${this.pendingCourseGroups.map(pg => {
                const teacherName = pg.teacher?.name || "معلم";
                const courseTitle = pg.course?.title || "كورس تعليمي";
                const gradeName = pg.course?.grade?.name || "";
                const subjectName = pg.course?.subject?.name || "";

                return `
                  <div class="glass-card" style="padding:16px 18px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                    <div style="flex:1; min-width:280px;">
                      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
                        <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.75rem; font-weight:800;">${courseTitle}</span>
                        ${gradeName ? `<span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.75rem;">${gradeName}</span>` : ''}
                        ${subjectName ? `<span class="badge" style="background:rgba(229,29,116,0.12); color:#e51d74; font-size:0.75rem;">${subjectName}</span>` : ''}
                      </div>
                      <h4 style="margin:0 0 4px 0; font-size:1.05rem; font-weight:900; color:var(--text-main);">👥 ${pg.name}</h4>
                      <div style="font-size:0.82rem; color:var(--text-muted); display:flex; gap:12px; flex-wrap:wrap;">
                        <span>المعلم: <strong style="color:var(--text-main);">${teacherName}</strong></span>
                        <span>الجدول: <span style="color:#e51d74; font-weight:800;">${pg.scheduleText}</span></span>
                      </div>
                    </div>

                    <!-- Actions: Open Approval Modal & Reject -->
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <button class="btn-primary admin-open-approve-group-modal-btn" data-id="${pg.id}" style="padding:9px 16px; border-radius:12px; font-weight:900; font-size:0.82rem; background:linear-gradient(135deg,#10b981,#059669); border:none; color:#fff; box-shadow:0 4px 14px rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                        <i data-lucide="check-circle" style="width:15px; height:15px;"></i> اعتماد ونشر المجموعة 🚀✅
                      </button>
                      <button class="btn-secondary admin-reject-group-btn" data-id="${pg.id}" style="padding:9px 14px; border-radius:12px; font-weight:800; font-size:0.82rem; color:#ef4444; border-color:#ef4444; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
                        <i data-lucide="x" style="width:14px; height:14px;"></i> رفض ❌
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Comprehensive Filters Toolbar -->
        <div class="glass-card" style="padding:18px 20px; border-radius:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:14px; margin-bottom:22px; background:var(--bg-card);">
          
          <!-- Status Filter Tabs -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <span style="font-size:0.82rem; font-weight:800; color:var(--text-main); margin-inline-end:4px;">
                <i data-lucide="filter" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> تصفية المجموعات:
              </span>
              <button class="filter-tab-btn admin-group-filter-tab-btn ${(this.adminGroupFilterStatus || 'all') === 'all' ? 'active' : ''}" data-filter="all"
                style="padding:6px 14px; border-radius:18px; font-size:0.8rem; font-weight:800; border:1px solid var(--border-color); background:${(this.adminGroupFilterStatus || 'all') === 'all' ? '#8b5cf6' : 'var(--bg-app)'}; color:${(this.adminGroupFilterStatus || 'all') === 'all' ? '#fff' : 'var(--text-muted)'}; cursor:pointer;">
                الكل (${totalGroupsCount})
              </button>
              <button class="filter-tab-btn admin-group-filter-tab-btn ${this.adminGroupFilterStatus === 'open' ? 'active' : ''}" data-filter="open"
                style="padding:6px 14px; border-radius:18px; font-size:0.8rem; font-weight:800; border:1px solid var(--border-color); background:${this.adminGroupFilterStatus === 'open' ? '#10b981' : 'var(--bg-app)'}; color:${this.adminGroupFilterStatus === 'open' ? '#fff' : 'var(--text-muted)'}; cursor:pointer;">
                🟢 متاحة للتسجيل (${openGroupsCount})
              </button>
              <button class="filter-tab-btn admin-group-filter-tab-btn ${this.adminGroupFilterStatus === 'in_progress' ? 'active' : ''}" data-filter="in_progress"
                style="padding:6px 14px; border-radius:18px; font-size:0.8rem; font-weight:800; border:1px solid var(--border-color); background:${this.adminGroupFilterStatus === 'in_progress' ? '#6366f1' : 'var(--bg-app)'}; color:${this.adminGroupFilterStatus === 'in_progress' ? '#fff' : 'var(--text-muted)'}; cursor:pointer;">
                🔒 بدأت الدراسة (${inProgressGroupsCount})
              </button>
              <button class="filter-tab-btn admin-group-filter-tab-btn ${this.adminGroupFilterStatus === 'full' ? 'active' : ''}" data-filter="full"
                style="padding:6px 14px; border-radius:18px; font-size:0.8rem; font-weight:800; border:1px solid var(--border-color); background:${this.adminGroupFilterStatus === 'full' ? '#ef4444' : 'var(--bg-app)'}; color:${this.adminGroupFilterStatus === 'full' ? '#fff' : 'var(--text-muted)'}; cursor:pointer;">
                مكتملة المقاعد (${fullGroupsCount})
              </button>
            </div>

            ${hasActiveFilters ? `
              <button id="admin-reset-group-filters-btn" style="background:rgba(239,68,68,0.08); color:#ef4444; border:1px solid rgba(239,68,68,0.25); border-radius:20px; padding:5px 12px; font-size:0.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="rotate-ccw" style="width:12px; height:12px;"></i> إعادة ضبط الفلاتر
              </button>
            ` : ''}
          </div>

          <!-- Secondary Filters: Search, Course, Teacher, Sort -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            
            <!-- Search Box -->
            <div style="position:relative; flex:1; min-width:240px; max-width:360px;">
              <input type="text" id="admin-groups-search-input" value="${this.adminGroupSearchQuery || ''}" placeholder="ابحث باسم المجموعة، المادة، أو المعلم..."
                style="width:100%; padding:9px 14px 9px 36px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.85rem; outline:none; box-sizing:border-box;">
              <i data-lucide="search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--text-muted); pointer-events:none;"></i>
            </div>

            <!-- Select Dropdowns -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              
              <!-- Course Filter -->
              <select id="admin-groups-course-filter"
                style="padding:8px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700; font-family:'Cairo',sans-serif; outline:none; cursor:pointer;">
                <option value="all" ${(this.adminGroupCourseFilter || 'all') === 'all' ? 'selected' : ''}>📚 جميع الكورسات والمواد (${allCourses.length})</option>
                ${allCourses.map(c => `
                  <option value="${c.id}" ${String(this.adminGroupCourseFilter) === String(c.id) ? 'selected' : ''}>
                    ${c.title} ${c.grade ? `(${c.grade.name})` : ''}
                  </option>
                `).join('')}
              </select>

              <!-- Teacher Filter -->
              <select id="admin-groups-teacher-filter"
                style="padding:8px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700; font-family:'Cairo',sans-serif; outline:none; cursor:pointer;">
                <option value="all" ${(this.adminGroupTeacherFilter || 'all') === 'all' ? 'selected' : ''}>👨‍🏫 جميع المعلمين (${allTeachers.length})</option>
                ${allTeachers.map(t => `
                  <option value="${t.id}" ${String(this.adminGroupTeacherFilter) === String(t.id) ? 'selected' : ''}>
                    ${t.name}
                  </option>
                `).join('')}
              </select>

              <!-- Sort Dropdown -->
              <select id="admin-groups-sort"
                style="padding:8px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700; font-family:'Cairo',sans-serif; outline:none; cursor:pointer;">
                <option value="newest" ${(this.adminGroupSort || 'newest') === 'newest' ? 'selected' : ''}>⏱️ الأحدث إضافة</option>
                <option value="oldest" ${this.adminGroupSort === 'oldest' ? 'selected' : ''}>📅 الأقدم</option>
                <option value="most_students" ${this.adminGroupSort === 'most_students' ? 'selected' : ''}>👥 الأكثر طلاباً</option>
                <option value="highest_student_rate" ${this.adminGroupSort === 'highest_student_rate' ? 'selected' : ''}>💰 سعر ساعة الطالب (الأعلى)</option>
                <option value="lowest_student_rate" ${this.adminGroupSort === 'lowest_student_rate' ? 'selected' : ''}>💵 سعر ساعة الطالب (الأقل)</option>
              </select>

            </div>

          </div>

        </div>

        <!-- Groups Count & Results Info + Expand/Collapse All Toolbar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:0 4px; flex-wrap:wrap; gap:10px;">
          <span style="font-size:0.88rem; font-weight:800; color:var(--text-muted);">
            عرض <strong style="color:var(--text-main); font-size:0.95rem;">${filteredGroups.length}</strong> من أصل <strong style="color:var(--text-main); font-size:0.95rem;">${totalGroupsCount}</strong> مجموعة دراسية
          </span>

          <!-- Expand / Collapse All Controls -->
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="admin-accordion-expand-all-btn" class="btn-secondary"
              style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              <i data-lucide="chevrons-down" style="width:14px; height:14px;"></i> توسيع الكل
            </button>
            <button id="admin-accordion-collapse-all-btn" class="btn-secondary"
              style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              <i data-lucide="chevrons-up" style="width:14px; height:14px;"></i> طي الكل
            </button>
          </div>
        </div>

        <!-- Groups Content (Empty State vs Modern Accordion View) -->
        ${filteredGroups.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 20px; color:var(--text-muted); border-radius:20px;">
            <i data-lucide="search-x" style="width:52px; height:52px; opacity:0.3; margin-bottom:12px; color:var(--primary);"></i>
            <h4 style="font-weight:800; margin:0 0 6px 0; color:var(--text-main);">
              ${hasActiveFilters ? 'لا توجد مجموعات تطابق الفلاتر المحددة' : 'لا توجد مجموعات دراسية مضافة حتى الآن'}
            </h4>
            <p style="font-size:0.88rem; margin:0 0 16px 0;">
              ${hasActiveFilters ? 'جرب تغيير أو إعادة ضبط الفلاتر لعرض المجموعات.' : 'اضغط على "إضافة مجموعة جديدة" لجدولة حصص ومجموعات دراسية أونلاين.'}
            </p>
            ${hasActiveFilters ? `
              <button id="admin-empty-reset-filters-btn" class="btn-secondary" style="padding:8px 18px; border-radius:14px; font-weight:800; font-size:0.82rem;">
                إعادة ضبط جميع الفلاتر 🔄
              </button>
            ` : ''}
          </div>
        ` : `
          
          <!-- 🌟 CREATIVE MODERN ACCORDION LIST 🌟 -->
          <div class="groups-accordion-container" style="display:flex; flex-direction:column; gap:12px;">
            ${filteredGroups.map((grp, idx) => {
              const startDateText = grp.startDate ? formatArabicDate(grp.startDate) : "13 سبتمبر 2026";
              const endDateText = grp.endDate ? formatArabicDate(grp.endDate) : "2 ديسمبر 2026";
              const capPct = Math.min(100, Math.round((grp.enrolledCount / grp.maxSeats) * 100));
              const isClosedOrTeaching = (grp.status === 'CLOSED' || grp.status === 'IN_PROGRESS');
              const isFull = grp.isFull || (grp.availableSeats <= 0);
              const totalFee = (grp.studentHourlyRate || 0) * (grp.totalSessions || 24);
              const teacherTotal = (grp.teacherHourlyRate || 0) * (grp.totalSessions || 24);
              
              // Status Border Color
              const accentColor = isClosedOrTeaching ? '#6366f1' : isFull ? '#ef4444' : grp.status === 'PENDING_APPROVAL' ? '#f59e0b' : '#10b981';

              return `
                <div class="glass-card group-accordion-item" data-group-id="${grp.id}" 
                  style="border-radius:20px; border:1px solid var(--border-color); border-inline-start:5px solid ${accentColor}; overflow:hidden; background:var(--bg-card); transition:all 0.25s ease; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
                  
                  <!-- ── ACCORDION HEADER BAR (Always Visible & Clickable) ──── -->
                  <div class="group-accordion-header" 
                    style="padding:16px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; user-select:none; background:transparent; transition:background 0.2s ease;">
                    
                    <!-- Left: Number + Title + Badges -->
                    <div style="display:flex; align-items:center; gap:14px; flex:1.5; min-width:280px;">
                      <span style="width:36px; height:36px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); font-weight:900; font-size:0.85rem; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${idx + 1}
                      </span>
                      <div>
                        <strong style="font-size:1rem; font-weight:900; color:var(--text-main); display:block; margin-bottom:4px; line-height:1.3;">
                          👥 ${grp.title}
                        </strong>
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                          <span class="badge" style="background:rgba(99,102,241,0.1); color:var(--primary); font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                            ${grp.courseTitle}
                          </span>
                          ${grp.gradeName ? `<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:8px;">${grp.gradeName}</span>` : ''}
                          ${grp.subjectName ? `<span class="badge" style="background:rgba(229,29,116,0.1); color:#e51d74; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:8px;">${grp.subjectName}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- Center 1: Teacher & Schedule -->
                    <div style="display:flex; align-items:center; gap:14px; flex:1.2; min-width:220px; flex-wrap:wrap;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(grp.teacherName || 'Teacher')}" 
                             alt="${grp.teacherName}" 
                             style="width:32px; height:32px; border-radius:50%; object-fit:cover; background:var(--bg-app); border:1.5px solid var(--border-color); flex-shrink:0;">
                        <span style="font-size:0.85rem; font-weight:800; color:var(--text-main);">${grp.teacherName}</span>
                      </div>
                      <span style="font-size:0.8rem; font-weight:800; color:#e51d74; background:rgba(229,29,116,0.06); padding:4px 10px; border-radius:10px; display:inline-flex; align-items:center; gap:5px;">
                        <i data-lucide="calendar" style="width:13px; height:13px;"></i> ${grp.scheduleText}
                      </span>
                    </div>

                    <!-- Center 2: Capacity Mini Progress -->
                    <div style="display:flex; flex-direction:column; gap:4px; min-width:140px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.76rem; font-weight:800;">
                        <span style="color:var(--text-main);">👥 ${grp.enrolledCount}/${grp.maxSeats} طالب</span>
                        <span style="color:${grp.availableSeats <= 3 ? '#ef4444' : '#10b981'}; font-size:0.72rem;">
                          ${grp.availableSeats > 0 ? `(${grp.availableSeats} شاغر)` : 'مكتملة'}
                        </span>
                      </div>
                      <div style="width:100%; height:5px; background:var(--bg-app); border-radius:10px; overflow:hidden; border:1px solid var(--border-color);">
                        <div style="width:${capPct}%; height:100%; background:${capPct >= 95 ? '#ef4444' : capPct >= 75 ? '#f59e0b' : '#10b981'}; border-radius:10px;"></div>
                      </div>
                    </div>

                    <!-- Right: Status Badge & Accordion Toggle Icon -->
                    <div style="display:flex; align-items:center; gap:12px; margin-inline-start:auto;">
                      ${grp.status === 'PENDING_APPROVAL' ? `
                        <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.3); display:inline-flex; align-items:center; gap:4px;">
                          ⏳ قيد المراجعة
                        </span>
                      ` : isClosedOrTeaching ? `
                        <span style="font-size:0.75rem; font-weight:900; padding:4px 11px; border-radius:12px; background:rgba(99,102,241,0.15); color:#6366f1; border:1px solid rgba(99,102,241,0.35); display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 8px rgba(99,102,241,0.18);">
                          <i data-lucide="lock" style="width:12px; height:12px;"></i> بدأت الدراسة 🔒
                        </span>
                      ` : isFull ? `
                        <span style="font-size:0.75rem; font-weight:900; padding:4px 10px; border-radius:12px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:4px;">
                          🔴 المقاعد مكتملة
                        </span>
                      ` : `
                        <span style="font-size:0.75rem; font-weight:900; padding:4px 11px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:4px;">
                          <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span> متاحة للتسجيل 🟢
                        </span>
                      `}

                      <div class="accordion-chevron-icon" style="width:30px; height:30px; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; color:var(--text-muted); transition:transform 0.3s ease;">
                        <i data-lucide="chevron-down" style="width:16px; height:16px;"></i>
                      </div>
                    </div>

                  </div>

                  <!-- ── ACCORDION EXPANDABLE BODY (Collapsed by default) ── -->
                  <div class="group-accordion-body" style="display:none; padding:18px 22px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.02); animation:slideDown 0.25s ease;">
                    
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:16px;">
                      
                      <!-- 1. Specifications & Rates Panel -->
                      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; font-size:0.82rem;">
                        <div style="font-weight:900; font-size:0.86rem; color:var(--text-main); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                          <i data-lucide="calendar-range" style="width:15px; height:15px; color:var(--primary);"></i>
                          المواعيد والمواصفات
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                          <span style="color:var(--text-muted);">الفترة الزمنية:</span>
                          <strong style="color:var(--text-main);">من ${startDateText} إلى ${endDateText}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                          <span style="color:var(--text-muted);">إجمالي الحصص:</span>
                          <strong style="color:var(--text-main);">${grp.totalSessions || 24} حصة (${grp.sessionDuration || 60} دقيقة لكل حصة)</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:6px;">
                          <span style="color:var(--text-muted);">ساعة الطالب:</span>
                          <strong style="color:#e51d74; font-weight:900;">${grp.studentHourlyRate} ج.م. (إجمالي: ${totalFee} ج.م.)</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                          <span style="color:var(--text-muted);">أجر المعلم:</span>
                          <strong style="color:#10b981; font-weight:900;">${grp.teacherHourlyRate} ج.م./ساعة (إجمالي: ${teacherTotal} ج.م.)</strong>
                        </div>
                      </div>

                      <!-- 2. Students Status & Capacity Panel -->
                      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; font-size:0.82rem;">
                        <div style="font-weight:900; font-size:0.86rem; color:var(--text-main); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                          <i data-lucide="users" style="width:15px; height:15px; color:#e51d74;"></i>
                          الطلاب والتسجيلات
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                          <span style="color:var(--text-muted);">المقاعد المحجوزة:</span>
                          <strong style="color:var(--text-main);">${grp.enrolledCount} من ${grp.maxSeats} مقعداً</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                          <span style="color:var(--text-muted);">المقاعد المتبقية:</span>
                          <strong style="color:${grp.availableSeats > 0 ? '#10b981' : '#ef4444'}; font-weight:800;">
                            ${grp.availableSeats > 0 ? `${grp.availableSeats} مقاعد شاغرة` : 'اكتملت جميع المقاعد'}
                          </strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:6px;">
                          <span style="color:var(--text-muted);">رابط قاعة البث:</span>
                          <span style="color:var(--text-main); font-weight:700;">
                            ${grp.meetingLink ? `<a href="${grp.meetingLink}" target="_blank" style="color:var(--primary); text-decoration:none;">رابط Zoom/Meet 🔗</a>` : 'قاعة المنصة التفاعلية 🎥'}
                          </span>
                        </div>
                      </div>

                    </div>

                    <!-- 3. Actions Toolbar inside Accordion -->
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; border-top:1px solid var(--border-color); padding-top:14px;">
                      
                      <!-- Primary Direct Controls -->
                      <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="btn-primary admin-view-group-sessions-btn" data-id="${grp.id}"
                          style="padding:8px 16px; font-size:0.82rem; font-weight:900; border-radius:12px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none; color:#fff; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(99,102,241,0.25); cursor:pointer;">
                          <i data-lucide="calendar" style="width:15px; height:15px;"></i> جدول الحصص (${grp.totalSessions || 24} حصة) 📅
                        </button>

                        <button type="button" class="btn-secondary admin-view-group-students-btn" data-id="${grp.id}"
                          style="padding:8px 16px; font-size:0.82rem; font-weight:900; border-radius:12px; background:rgba(229,29,116,0.08); border:1px solid rgba(229,29,116,0.3); color:#e51d74; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                          <i data-lucide="users" style="width:15px; height:15px;"></i> قائمة الطلاب والواتساب 👥💬
                        </button>
                      </div>

                      <!-- State & Management Controls -->
                      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        
                        ${grp.status === 'OPEN' ? `
                          <button type="button" class="btn-secondary admin-toggle-group-status-btn" data-id="${grp.id}" data-action="close"
                            style="padding:8px 14px; font-size:0.8rem; font-weight:800; color:#6366f1; border-color:#6366f1; background:rgba(99,102,241,0.08); border-radius:12px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
                            <i data-lucide="lock" style="width:13px; height:13px;"></i> إغلاق وبدء التدريس 🔒
                          </button>
                        ` : `
                          <button type="button" class="btn-secondary admin-toggle-group-status-btn" data-id="${grp.id}" data-action="open"
                            style="padding:8px 14px; font-size:0.8rem; font-weight:800; color:#10b981; border-color:#10b981; background:rgba(16,185,129,0.08); border-radius:12px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
                            <i data-lucide="unlock" style="width:13px; height:13px;"></i> إعادة فتح للتسجيل 🔓
                          </button>
                        `}

                        <button type="button" class="btn-secondary admin-edit-group-btn" data-id="${grp.id}"
                          style="padding:8px 14px; font-size:0.8rem; font-weight:800; border-radius:12px; color:#8b5cf6; border-color:rgba(139,92,246,0.4); background:rgba(139,92,246,0.08); display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
                          <i data-lucide="edit-3" style="width:13px; height:13px;"></i> تعديل المجموعة ✏️
                        </button>

                        <button type="button" class="btn-secondary admin-delete-group-btn" data-id="${grp.id}" data-name="${grp.title}" data-enrolled="${grp.enrolledCount || 0}"
                          style="padding:8px 12px; font-size:0.8rem; font-weight:800; border-radius:12px; color:#ef4444; border-color:rgba(239,68,68,0.4); background:rgba(239,68,68,0.08); display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
                          <i data-lucide="trash-2" style="width:13px; height:13px;"></i> حذف 🗑️
                        </button>

                      </div>

                    </div>

                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Container for Edit Group Modal -->
      <div id="admin-edit-group-modal-container"></div>
    `;
  },

  // ── Render Edit Group Modal (Admin Full Control) ──────────────────────────────
  renderEditGroupModal(group) {
    const container = document.getElementById("admin-edit-group-modal-container") || document.body;
    const teachers = (this.allMembers || []).filter(m => m.role === 'teacher' || m.role === 'instructor');

    const teacherOptions = teachers.map(t => `
      <option value="${t.id}" ${group.teacher && String(group.teacher.id) === String(t.id) ? 'selected' : ''}>
        ${t.name} (${t.email || t.phone || 'معلم'})
      </option>
    `).join('');

    const daysList = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    const currentDaysStr = group.scheduleDays || "";

    const wrapper = document.createElement("div");
    wrapper.id = "admin-edit-group-modal-wrapper";
    wrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:640px; border-radius:28px; padding:26px; max-height:90vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <h3 style="font-size:1.2rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i data-lucide="edit-3" style="width:20px; height:20px; color:#8b5cf6;"></i>
                تعديل بيانات المجموعة الدراسية بالكامل ✏️
              </h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                تحكم في اسم المجموعة، المعلم المشرف، المواعيد، الأسعار، السعة، والحالة قبل إغلاقها أو بدء الدراسة.
              </p>
            </div>
            <button id="close-admin-edit-group-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">
              &times;
            </button>
          </div>

          <form id="admin-edit-group-form" style="display:flex; flex-direction:column; gap:14px; overflow-y:auto; padding-inline-end:4px;">
            
            <!-- Group Name -->
            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                اسم المجموعة: <span style="color:#ef4444;">*</span>
              </label>
              <input type="text" id="edit-group-name" value="${group.name || group.title || ''}" required class="form-input"
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.9rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
            </div>

            <!-- Teacher Select & Status -->
            <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  المعلم المشرف: <span style="color:#ef4444;">*</span>
                </label>
                <select id="edit-group-teacher" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo',sans-serif;">
                  ${teacherOptions || `<option value="">معلم المنصة الافتراضي</option>`}
                </select>
              </div>

              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  حالة المجموعة للتسجيل: <span style="color:#ef4444;">*</span>
                </label>
                <select id="edit-group-status" class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-weight:800; font-family:'Cairo',sans-serif;">
                  <option value="OPEN" ${group.status === 'OPEN' ? 'selected' : ''}>🟢 متاحة للتسجيل (مفتوحة)</option>
                  <option value="IN_PROGRESS" ${group.status === 'IN_PROGRESS' ? 'selected' : ''}>🔒 مغلقة للتسجيل وبدأت الدراسة</option>
                  <option value="CLOSED" ${group.status === 'CLOSED' ? 'selected' : ''}>🔒 مغلقة للتسجيل</option>
                  <option value="FULL" ${group.status === 'FULL' ? 'selected' : ''}>🔴 مكتملة العدد</option>
                  <option value="PENDING_APPROVAL" ${group.status === 'PENDING_APPROVAL' ? 'selected' : ''}>⏳ قيد المراجعة والاعتماد</option>
                </select>
              </div>
            </div>

            <!-- Schedule Days -->
            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                أيام الأسبوع للحصص: <span style="color:#ef4444;">*</span>
              </label>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(80px, 1fr)); gap:6px;">
                ${daysList.map(day => `
                  <label style="display:flex; align-items:center; gap:5px; padding:8px 10px; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); font-size:0.8rem; font-weight:700; cursor:pointer;">
                    <input type="checkbox" name="edit-group-days" value="${day}" ${currentDaysStr.includes(day) ? 'checked' : ''} style="accent-color:#e51d74;">
                    <span>${day}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Schedule Time & Duration -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">توقيت الحصة:</label>
                <input type="text" id="edit-group-time" value="${group.scheduleTime || '6:00م'}" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo',sans-serif; box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">مدة الحصة (بالدقائق):</label>
                <input type="number" id="edit-group-duration" value="${group.sessionDuration || 60}" min="15" max="180" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
            </div>

            <!-- Dates (Start & End) -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">تاريخ البدء:</label>
                <input type="date" id="edit-group-start-date" value="${group.startDate ? new Date(group.startDate).toISOString().slice(0,10) : '2026-09-13'}" class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">تاريخ الانتهاء:</label>
                <input type="date" id="edit-group-end-date" value="${group.endDate ? new Date(group.endDate).toISOString().slice(0,10) : '2026-12-02'}" class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
            </div>

            <!-- Total Sessions & Capacity -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">عدد الحصص الإجمالي:</label>
                <input type="number" id="edit-group-total-sessions" value="${group.totalSessions || 24}" min="1" max="100" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">إجمالي المقاعد (السعة):</label>
                <input type="number" id="edit-group-max-students" value="${group.maxSeats || group.maxStudents || 25}" min="1" max="100" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
            </div>

            <!-- Pricing: Student Rate & Teacher Hourly Rate -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">سعر ساعة الطالب (ج.م.):</label>
                <input type="number" id="edit-group-student-rate" value="${group.studentHourlyRate || group.sessionPrice || 40}" min="0" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:#10b981;">أجر المعلم بالساعة (ج.م.):</label>
                <input type="number" id="edit-group-teacher-rate" value="${group.teacherHourlyRate || 100}" min="0" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid #10b981; background:var(--bg-app); color:#10b981; font-weight:800; box-sizing:border-box;">
              </div>
            </div>

            <!-- Meeting Link -->
            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">رابط البث المباشر (Zoom / Meet):</label>
              <input type="url" id="edit-group-meeting-link" value="${group.meetingLink || ''}" placeholder="https://zoom.us/j/... أو Meet" class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
            </div>

            <!-- Submit Buttons -->
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
              <button type="button" id="cancel-admin-edit-group-btn" class="btn-secondary" style="padding:10px 20px; border-radius:20px;">إلغاء</button>
              <button type="submit" id="submit-admin-edit-group-btn" class="btn-primary" style="padding:10px 28px; border-radius:20px; font-weight:900; background:#8b5cf6; border-color:#8b5cf6;">
                حفظ كافة التعديلات 💾🚀
              </button>
            </div>

          </form>

        </div>
      </div>
    `;

    container.appendChild(wrapper);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { wrapper.remove(); };
    wrapper.querySelector("#close-admin-edit-group-modal")?.addEventListener("click", closeModal);
    wrapper.querySelector("#cancel-admin-edit-group-btn")?.addEventListener("click", closeModal);

    wrapper.querySelector("#admin-edit-group-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = wrapper.querySelector("#edit-group-name")?.value.trim();
      const teacherId = wrapper.querySelector("#edit-group-teacher")?.value;
      const status = wrapper.querySelector("#edit-group-status")?.value;
      const duration = parseInt(wrapper.querySelector("#edit-group-duration")?.value, 10) || 60;
      const scheduleTime = wrapper.querySelector("#edit-group-time")?.value.trim() || "6:00م";
      const startDate = wrapper.querySelector("#edit-group-start-date")?.value || null;
      const endDate = wrapper.querySelector("#edit-group-end-date")?.value || null;
      const totalSessions = parseInt(wrapper.querySelector("#edit-group-total-sessions")?.value, 10) || 24;
      const maxStudents = parseInt(wrapper.querySelector("#edit-group-max-students")?.value, 10) || 25;
      const studentHourlyRate = parseFloat(wrapper.querySelector("#edit-group-student-rate")?.value) || 40;
      const teacherHourlyRate = parseFloat(wrapper.querySelector("#edit-group-teacher-rate")?.value) || 100;
      const meetingLink = wrapper.querySelector("#edit-group-meeting-link")?.value.trim() || null;

      const checkedDays = Array.from(wrapper.querySelectorAll("input[name='edit-group-days']:checked")).map(cb => cb.value);
      const scheduleDays = checkedDays.join("، ") || "الأحد، الثلاثاء";
      const scheduleText = `${scheduleDays} الساعة ${scheduleTime}`;

      const submitBtn = wrapper.querySelector("#submit-admin-edit-group-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الحفظ...";
      }

      try {
        await apiFetch(`/groups/${group.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            teacherId,
            status,
            scheduleDays,
            scheduleTime,
            scheduleText,
            startDate,
            endDate,
            totalSessions,
            sessionDuration: duration,
            studentHourlyRate,
            teacherHourlyRate,
            sessionPrice: studentHourlyRate,
            monthlyPrice: studentHourlyRate * 8,
            maxStudents,
            meetingLink
          })
        });

        showToast("تم تحديث كافة بيانات المجموعة بنجاح! 🎉💾", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("groups");
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "حفظ كافة التعديلات 💾🚀";
        }
        showToast(err.message || "فشل تحديث المجموعة.", "error");
      }
    });
  },

  // ── Render Start Teaching & Sessions Generator Modal ─────────────────────────
  renderStartTeachingModal(group) {
    const existing = document.getElementById("admin-start-teaching-modal-wrapper");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "admin-start-teaching-modal-wrapper";
    document.body.appendChild(wrapper);

    const closeModal = () => { wrapper.remove(); };

    const dayIndexMap = {
      'الأحد': 0, 'الاثنين': 1, 'الإثنين': 1, 'الثلاثاء': 2,
      'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6
    };
    const daysArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const monthsArabic = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const totalSessions = group.totalSessions || 24;
    const duration = group.sessionDuration || 60;
    const scheduleDaysStr = group.scheduleDays || "الأحد، الثلاثاء";
    const scheduleTimeStr = group.scheduleTime || "6:00م";
    const defaultStartDate = group.startDate ? new Date(group.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const defaultMeetingLink = group.meetingLink || "";

    const generateSessionsPreview = (startDateVal) => {
      const daysArr = scheduleDaysStr.split(/[,،]+/).map(d => d.trim());
      const targetDays = daysArr.map(d => dayIndexMap[d]).filter(d => d !== undefined);

      let hour = 18;
      let min = 0;
      const isPM = scheduleTimeStr.includes("م") || scheduleTimeStr.toLowerCase().includes("pm");
      const isAM = scheduleTimeStr.includes("ص") || scheduleTimeStr.toLowerCase().includes("am");
      const cleanTime = scheduleTimeStr.replace(/[^0-9:]/g, "");
      const parts = cleanTime.split(":");
      if (parts.length >= 1) {
        hour = parseInt(parts[0], 10) || 18;
        if (isPM && hour < 12) hour += 12;
        if (isAM && hour === 12) hour = 0;
      }
      if (parts.length >= 2) {
        min = parseInt(parts[1], 10) || 0;
      }

      let curr = new Date(startDateVal || new Date());
      curr.setHours(hour, min, 0, 0);

      const list = [];
      let count = 0;
      let safety = 0;

      while (count < totalSessions && safety < 1000) {
        safety++;
        if (targetDays.length === 0 || targetDays.includes(curr.getDay())) {
          count++;
          const d = new Date(curr);
          const dayName = daysArabic[d.getDay()];
          const dateFormatted = `${dayName} ${d.getDate()} ${monthsArabic[d.getMonth()]} ${d.getFullYear()}`;
          const timeFormatted = scheduleTimeStr;

          list.push({
            sessionNumber: count,
            title: `${group.name || group.title} - حصة ${count}`,
            scheduledAt: d.toISOString(),
            dateFormatted,
            timeFormatted,
            duration
          });
        }
        curr.setDate(curr.getDate() + 1);
      }
      return list;
    };

    let previewList = generateSessionsPreview(defaultStartDate);
    const teacherName = group.teacher?.name || group.course?.teacher?.name || "معلم المنصة";
    const enrolledStudentsCount = group.enrolledCount || (group.students ? group.students.length : 0);

    const renderPreviewHTML = (sessions) => {
      return sessions.map(s => `
        <div style="padding:10px 14px; border-radius:12px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:0.84rem;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:26px; height:26px; border-radius:8px; background:rgba(99,102,241,0.12); color:var(--primary); font-weight:900; font-size:0.78rem; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${s.sessionNumber}
            </span>
            <div>
              <strong style="color:var(--text-main); font-size:0.86rem; display:block;">${s.title}</strong>
              <span style="color:var(--text-muted); font-size:0.76rem;">📅 ${s.dateFormatted}</span>
            </div>
          </div>
          <div style="text-align:left; flex-shrink:0;">
            <span style="font-weight:800; color:#e51d74; font-size:0.82rem; background:rgba(229,29,116,0.06); padding:3px 8px; border-radius:8px; border:1px solid rgba(229,29,116,0.15); display:inline-flex; align-items:center; gap:4px;">
              <i data-lucide="clock" style="width:12px; height:12px;"></i> ${s.timeFormatted} (${s.duration} د)
            </span>
          </div>
        </div>
      `).join('');
    };

    wrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:680px; border-radius:28px; padding:26px; max-height:92vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden; border:1.5px solid rgba(99,102,241,0.3); box-shadow:0 25px 60px rgba(0,0,0,0.4);">
          
          <!-- Modal Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:46px; height:46px; border-radius:14px; background:linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.2)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="calendar-plus" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.25rem; font-weight:900; margin:0 0 2px 0; color:var(--text-main);">
                  إغلاق التسجيل وبدء التدريس وتوليد الحصص 🔒🚀
                </h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                  سيتم تحويل المجموعة لـ "قيد التدريس" وتوليد ${totalSessions} حصة مباشرة وإدراجها بجداول المعلم والطلاب المسجلين.
                </p>
              </div>
            </div>
            <button id="close-start-teaching-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">&times;</button>
          </div>

          <!-- Info Strip -->
          <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:12px 16px; display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; font-size:0.82rem;">
            <div>
              <span style="color:var(--text-muted); display:block;">المجموعة:</span>
              <strong style="color:var(--text-main);">${group.name || group.title}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block;">المعلم المشرف:</span>
              <strong style="color:var(--primary);">${teacherName}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block;">أيام وتوقيت الحصص:</span>
              <strong style="color:#e51d74;">${scheduleDaysStr} • ${scheduleTimeStr}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block;">الطلاب المستفيدون:</span>
              <strong style="color:#10b981;">👥 ${enrolledStudentsCount} طلاب مسجلين</strong>
            </div>
          </div>

          <!-- Controls Form -->
          <form id="start-teaching-form" style="display:flex; flex-direction:column; gap:14px; overflow-y:auto; padding-inline-end:4px;">
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label style="display:block; font-size:0.84rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  تاريخ بداية أول حصة: <span style="color:#ef4444;">*</span>
                </label>
                <input type="date" id="start-teaching-start-date" value="${defaultStartDate}" required class="form-input"
                  style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo',sans-serif; box-sizing:border-box;">
              </div>

              <div>
                <label style="display:block; font-size:0.84rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  رابط قاعة البث (Zoom / Google Meet):
                </label>
                <input type="url" id="start-teaching-meeting-link" value="${defaultMeetingLink}" placeholder="https://zoom.us/j/... أو Meet" class="form-input"
                  style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo',sans-serif; box-sizing:border-box;">
              </div>
            </div>

            <!-- Live Sessions Preview Box -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label style="font-size:0.86rem; font-weight:900; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                  <i data-lucide="list-ordered" style="width:16px; height:16px; color:var(--primary);"></i>
                  جدول الحصص التي سيتم توليدها (${totalSessions} حصة تفاعلية)
                </label>
                <span id="sessions-date-range-label" style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">
                  من ${previewList[0]?.dateFormatted || ''} إلى ${previewList[previewList.length - 1]?.dateFormatted || ''}
                </span>
              </div>

              <div id="start-teaching-sessions-preview-container" style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; border:1px solid var(--border-color); border-radius:16px; padding:10px; background:rgba(0,0,0,0.02);">
                ${renderPreviewHTML(previewList)}
              </div>
            </div>

            <!-- Footer Actions -->
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px; border-top:1px solid var(--border-color); padding-top:14px;">
              <button type="button" id="cancel-start-teaching-modal-btn" class="btn-secondary" style="padding:10px 22px; border-radius:20px; font-size:0.88rem; font-weight:700;">إلغاء</button>
              <button type="submit" id="submit-start-teaching-btn" class="btn-primary" style="padding:10px 28px; border-radius:20px; font-weight:900; font-size:0.92rem; background:linear-gradient(135deg, #10b981, #059669); border:none; box-shadow:0 4px 16px rgba(16,185,129,0.35); display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="rocket" style="width:18px; height:18px;"></i>
                <span>تأكيد وبدء التدريس وتوليد الحصص (${totalSessions}) 🚀</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("close-start-teaching-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-start-teaching-modal-btn")?.addEventListener("click", closeModal);

    // Live Date Change Listener
    const dateInput = document.getElementById("start-teaching-start-date");
    dateInput?.addEventListener("change", (e) => {
      const newStartDate = e.target.value;
      previewList = generateSessionsPreview(newStartDate);
      const container = document.getElementById("start-teaching-sessions-preview-container");
      if (container) {
        container.innerHTML = renderPreviewHTML(previewList);
        if (window.lucide) window.lucide.createIcons();
      }
      const rangeLabel = document.getElementById("sessions-date-range-label");
      if (rangeLabel && previewList.length > 0) {
        rangeLabel.textContent = `من ${previewList[0]?.dateFormatted || ''} إلى ${previewList[previewList.length - 1]?.dateFormatted || ''}`;
      }
    });

    // Submit Handler
    document.getElementById("start-teaching-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-start-teaching-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>جاري توليد الحصص وإدراجها... ⏳</span>`;
      }

      const startDateVal = document.getElementById("start-teaching-start-date")?.value;
      const meetingLinkVal = document.getElementById("start-teaching-meeting-link")?.value?.trim() || null;

      try {
        const res = await apiFetch(`/admin/groups/${group.id}/start-teaching`, {
          method: "POST",
          body: JSON.stringify({
            startDate: startDateVal,
            meetingLink: meetingLinkVal,
            sessionsList: previewList
          })
        });

        showToast(res.message || "تم بدء التدريس وتوليد الحصص بنجاح! 🎉🚀", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("groups");
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="rocket" style="width:18px; height:18px;"></i> <span>تأكيد وبدء التدريس وتوليد الحصص (${totalSessions}) 🚀</span>`;
          if (window.lucide) window.lucide.createIcons();
        }
        showToast(err.message || "فشل بدء التدريس وتوليد الحصص.", "error");
      }
    });
  },

  // ── Render Group Sessions View Modal ──────────────────────────────────────────
  async renderGroupSessionsViewModal(groupId) {
    const existing = document.getElementById("admin-group-sessions-view-modal-wrapper");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "admin-group-sessions-view-modal-wrapper";
    document.body.appendChild(wrapper);

    const closeModal = () => { wrapper.remove(); };

    wrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:780px; border-radius:28px; padding:30px; max-height:90vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden; border:1px solid var(--border-color); box-shadow:0 25px 60px rgba(0,0,0,0.4);">
          <div style="padding:40px; text-align:center;">
            <div class="spinner" style="width:36px; height:36px; margin:0 auto 12px;"></div>
            <p style="color:var(--text-muted); font-size:0.9rem; font-weight:700;">جاري تحميل جدول الحصص المجدولة للمجموعة...</p>
          </div>
        </div>
      </div>
    `;

    let group = (this.allCourseGroups || []).find(g => String(g.id) === String(groupId));
    let sessions = [];

    try {
      const res = await apiFetch(`/groups/${groupId}/sessions`).catch(() => null);
      if (res && res.sessions) {
        sessions = res.sessions;
        if (res.group) group = { ...(group || {}), ...res.group };
      } else if (group && group.course) {
        // Fallback filter from allSessions
        sessions = (this.allSessions || []).filter(s => 
          s.course && String(s.course.id) === String(group.course.id)
        );
      }
    } catch (e) {
      console.error("Error loading group sessions:", e);
    }

    const groupTitle = group?.name || group?.title || "المجموعة الدراسية";
    const teacherName = group?.teacher?.name || group?.course?.teacher?.name || "معلم المنصة";
    const meetingLink = group?.meetingLink || "";

    const daysArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const monthsArabic = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const formatDateTime = (dateStr) => {
      if (!dateStr) return { date: '—', time: '—' };
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: '' };
      const dayName = daysArabic[d.getDay()];
      const dateText = `${dayName} ${d.getDate()} ${monthsArabic[d.getMonth()]} ${d.getFullYear()}`;
      const timeText = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      return { date: dateText, time: timeText };
    };

    const scheduledCount = sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'scheduled').length;
    const completedCount = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'completed').length;
    const liveCount = sessions.filter(s => s.status === 'live').length;

    wrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:820px; border-radius:28px; padding:26px; max-height:92vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden; border:1.5px solid rgba(99,102,241,0.3); box-shadow:0 25px 60px rgba(0,0,0,0.4);">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:48px; height:48px; border-radius:16px; background:linear-gradient(135deg, rgba(99,102,241,0.2), rgba(229,29,116,0.15)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="calendar" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.25rem; font-weight:900; margin:0 0 2px 0; color:var(--text-main);">
                  جدول الحصص التفاعلية للمجموعة (${sessions.length} حصة) 📅
                </h3>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                  👥 ${groupTitle} | 👨‍🏫 المعلم: ${teacherName}
                </p>
              </div>
            </div>
            <button id="close-group-sessions-view-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.2rem;">&times;</button>
          </div>

          <!-- Metrics Strip -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:10px 14px; text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:700;">إجمالي الحصص</span>
              <strong style="font-size:1.2rem; color:var(--text-main); font-weight:900;">${sessions.length}</strong>
            </div>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:10px 14px; text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:700;">الحصص القادمة</span>
              <strong style="font-size:1.2rem; color:var(--primary); font-weight:900;">${scheduledCount}</strong>
            </div>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:10px 14px; text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:700;">مباشر الآن</span>
              <strong style="font-size:1.2rem; color:#10b981; font-weight:900;">${liveCount}</strong>
            </div>
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:14px; padding:10px 14px; text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:700;">الحصص المكتملة</span>
              <strong style="font-size:1.2rem; color:#6b7280; font-weight:900;">${completedCount}</strong>
            </div>
          </div>

          <!-- Sessions List Container -->
          <div style="flex:1; max-height:55vh; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-inline-end:4px;">
            ${sessions.length === 0 ? `
              <div style="text-align:center; padding:45px 20px; color:var(--text-muted); background:var(--bg-app); border-radius:18px; border:1px dashed var(--border-color);">
                <i data-lucide="calendar-x" style="width:44px; height:44px; color:var(--primary); opacity:0.4; margin-bottom:8px;"></i>
                <h4 style="margin:0 0 6px 0; font-weight:800; color:var(--text-main);">لم يتم توليد جدول حصص لهذه المجموعة بعد</h4>
                <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 14px 0;">يمكنك إغلاق التسجيل وبدء التدريس لتوليد جدول الحصص الآن.</p>
                ${group ? `
                  <button type="button" id="admin-modal-start-teaching-btn" class="btn-primary" style="padding:8px 20px; font-size:0.85rem; font-weight:800; border-radius:14px; margin:0 auto; gap:6px;">
                    <i data-lucide="rocket" style="width:14px; height:14px;"></i> بدء التدريس وتوليد الحصص الآن 🚀
                  </button>
                ` : ''}
              </div>
            ` : `
              ${sessions.map((s, idx) => {
                const dt = formatDateTime(s.scheduledAt);
                const isCompleted = s.status === 'COMPLETED' || s.status === 'completed';
                const isLive = s.status === 'live';

                return `
                  <div style="padding:12px 16px; border-radius:14px; background:var(--bg-app); border:1px solid ${isLive ? '#10b981' : isCompleted ? 'rgba(107,114,128,0.2)' : 'var(--border-color)'}; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                    
                    <div style="display:flex; align-items:center; gap:12px;">
                      <span style="width:30px; height:30px; border-radius:10px; background:${isLive ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)'}; color:${isLive ? '#10b981' : 'var(--primary)'}; font-weight:900; font-size:0.82rem; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${idx + 1}
                      </span>
                      <div>
                        <strong style="font-size:0.9rem; color:var(--text-main); display:block;">
                          ${s.title || `${groupTitle} - حصة ${idx + 1}`}
                        </strong>
                        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:8px;">
                          <span>📅 ${dt.date}</span>
                          ${dt.time ? `<span>• ⏰ ${dt.time}</span>` : ''}
                          <span>• ⏱️ ${s.duration || 60} دقيقة</span>
                        </div>
                      </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px; margin-inline-start:auto;">
                      ${isLive ? `
                        <span style="font-size:0.75rem; font-weight:900; background:rgba(16,185,129,0.15); color:#10b981; padding:3px 10px; border-radius:10px; border:1px solid rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:4px;">
                          <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span> مباشر الآن 🔴
                        </span>
                        <a href="#classroom/${s.id}" class="btn-primary" style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:10px; background:#10b981; border-color:#10b981; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                          دخول القاعة 🚀
                        </a>
                      ` : isCompleted ? `
                        <span style="font-size:0.75rem; font-weight:800; background:rgba(107,114,128,0.12); color:#6b7280; padding:3px 10px; border-radius:10px;">
                          ✓ مكتملة
                        </span>
                      ` : `
                        <span style="font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.1); color:var(--primary); padding:3px 10px; border-radius:10px;">
                          ⏳ قادمة ومجدولة
                        </span>
                        ${s.id ? `
                          <a href="#classroom/${s.id}" class="btn-secondary" style="padding:5px 12px; font-size:0.76rem; font-weight:800; border-radius:10px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                            <i data-lucide="video" style="width:12px; height:12px;"></i> القاعة
                          </a>
                        ` : ''}
                      `}
                    </div>

                  </div>
                `;
              }).join('')}
            `}
          </div>

          <!-- Footer -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:14px; flex-wrap:wrap; gap:10px;">
            ${meetingLink ? `
              <a href="${meetingLink}" target="_blank" class="btn-secondary" style="font-size:0.8rem; font-weight:800; padding:6px 14px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="external-link" style="width:13px; height:13px;"></i> فتح رابط البث المباشر (Zoom / Meet)
              </a>
            ` : '<span></span>'}

            <div style="display:flex; gap:8px;">
              ${group && sessions.length > 0 ? `
                <button type="button" id="admin-modal-regenerate-teaching-btn" class="btn-secondary" style="padding:8px 18px; border-radius:20px; font-size:0.82rem; font-weight:800; color:#8b5cf6; border-color:#8b5cf6;">
                  <i data-lucide="refresh-cw" style="width:13px; height:13px;"></i> إعادة جدولة الحصص ⚡
                </button>
              ` : ''}
              <button type="button" id="cancel-group-sessions-view-modal-btn" class="btn-primary" style="padding:8px 24px; border-radius:20px; font-size:0.88rem; font-weight:800;">إغلاق</button>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("close-group-sessions-view-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-group-sessions-view-modal-btn")?.addEventListener("click", closeModal);

    document.getElementById("admin-modal-start-teaching-btn")?.addEventListener("click", () => {
      closeModal();
      if (group) this.renderStartTeachingModal(group);
    });

    document.getElementById("admin-modal-regenerate-teaching-btn")?.addEventListener("click", () => {
      closeModal();
      if (group) this.renderStartTeachingModal(group);
    });
  },

  // ── Render Cannot Delete Group Alert Modal ────────────────────────────────────
  renderCannotDeleteGroupModal(group) {
    const existing = document.getElementById("admin-cannot-delete-modal-wrapper");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "admin-cannot-delete-modal-wrapper";
    document.body.appendChild(wrapper);

    const closeModal = () => { wrapper.remove(); };

    const count = group.enrolledCount || 1;
    const name = group.name || group.title || "المجموعة الدراسية";

    wrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:520px; border-radius:24px; padding:28px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:16px; position:relative; overflow:hidden; border:1.5px solid rgba(239,68,68,0.4); box-shadow:0 25px 60px rgba(0,0,0,0.45); background:var(--bg-card);">
          
          <!-- Warning Icon -->
          <div style="width:68px; height:68px; border-radius:50%; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center; border:2px solid rgba(239,68,68,0.3); flex-shrink:0;">
            <i data-lucide="alert-octagon" style="width:36px; height:36px;"></i>
          </div>

          <!-- Content -->
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:#ef4444; margin:0 0 8px 0;">
              لا يمكن حذف المجموعة الدراسية ⚠️
            </h3>
            <p style="font-size:0.9rem; color:var(--text-main); font-weight:700; line-height:1.6; margin:0 0 8px 0;">
              المجموعة <span style="color:#e51d74;">«${name}»</span> تحتوي حالياً على <strong style="color:#ef4444;">(${count})</strong> طلاب مسجلين.
            </p>
            <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0;">
              لحماية بيانات واشتراكات وحصص الطلاب، تمنع المنصة حذف أي مجموعة دراسية تحتوي على مقاعد مشغولة. يجب نقل أو إزالة جميع الطلاب من قائمة المجموعة أولاً قبل إمكانية حذفها.
            </p>
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:10px; width:100%; margin-top:8px; justify-content:center; flex-wrap:wrap;">
            <button type="button" id="open-roster-from-alert-btn" class="btn-primary" style="flex:1; min-width:180px; padding:11px 16px; border-radius:14px; font-weight:800; font-size:0.88rem; background:#8b5cf6; border-color:#8b5cf6; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
              <i data-lucide="users" style="width:16px; height:16px;"></i> قائمة الطلاب لإزالتهم 👥
            </button>
            <button type="button" id="close-cannot-delete-modal-btn" class="btn-secondary" style="padding:11px 22px; border-radius:14px; font-weight:800; font-size:0.88rem;">
              فهمت ذلك
            </button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("close-cannot-delete-modal-btn")?.addEventListener("click", closeModal);
    document.getElementById("open-roster-from-alert-btn")?.addEventListener("click", () => {
      closeModal();
      this.renderGroupStudentsModal(group.id);
    });
  },

  // ── Render Approve Group Modal (Admin Approval & Pricing/Dates Calculation) ────
  renderApproveGroupModal(group) {
    const wrapper = document.createElement("div");
    wrapper.id = "admin-approve-group-modal-wrapper";
    document.body.appendChild(wrapper);

    const closeModal = () => {
      wrapper.remove();
    };

    const dayIndexMap = {
      'الأحد': 0,
      'الاثنين': 1,
      'الإثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5,
      'السبت': 6
    };

    const calculateEndDate = (startDateStr, daysArr, totalSessionsCount) => {
      if (!startDateStr || !totalSessionsCount || totalSessionsCount <= 0) return '';
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) return '';

      const targetDayIndices = (daysArr || []).map(d => dayIndexMap[d.trim()]).filter(idx => idx !== undefined);
      if (targetDayIndices.length === 0) {
        const daysToAdd = Math.round((totalSessionsCount / 2) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + daysToAdd);
        return end.toISOString().slice(0, 10);
      }

      let curr = new Date(start);
      let sessionCount = 0;
      let safety = 0;

      while (sessionCount < totalSessionsCount && safety < 1000) {
        safety++;
        if (targetDayIndices.includes(curr.getDay())) {
          sessionCount++;
          if (sessionCount === totalSessionsCount) {
            return curr.toISOString().slice(0, 10);
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
      return curr.toISOString().slice(0, 10);
    };

    const currentDaysStr = group.scheduleDays || "الأحد، الثلاثاء";
    const initialDays = currentDaysStr.split(/[،,]/).map(d => d.trim()).filter(Boolean);
    const initialSessions = group.totalSessions || 24;
    const initialStudentRate = group.studentHourlyRate || group.sessionPrice || 50;
    const initialTeacherRate = group.teacherHourlyRate || group.teacher?.hourlyRate || 120;
    const initialMaxSeats = group.maxStudents || 25;
    const initialDuration = group.sessionDuration || 60;
    const initialTime = group.scheduleTime || "6:00م";

    const todayStr = new Date().toISOString().slice(0, 10);
    const initialStartDate = group.startDate ? new Date(group.startDate).toISOString().slice(0, 10) : todayStr;
    const initialEndDate = group.endDate ? new Date(group.endDate).toISOString().slice(0, 10) : calculateEndDate(initialStartDate, initialDays, initialSessions);

    wrapper.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="glass-card" style="width:100%; max-width:620px; border-radius:28px; padding:26px; max-height:92vh; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden; border:2px solid #10b981; box-shadow:0 16px 40px rgba(0,0,0,0.3);">
          
          <!-- Modal Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <div style="display:flex; gap:6px; margin-bottom:4px;">
                <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem; font-weight:800;">
                  اعتماد ونشر مجموعة دراسية 🚀
                </span>
                ${group.course?.title ? `<span class="badge" style="background:rgba(99,102,241,0.12); color:#6366f1; font-size:0.75rem;">${group.course.title}</span>` : ''}
              </div>
              <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">
                👥 ${group.name || group.title}
              </h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">
                المعلم: <strong style="color:var(--text-main);">${group.teacher?.name || "معلم المادة"}</strong> • حدد التواريخ والأسعار وسعة المقاعد
              </p>
            </div>
            <button id="close-admin-approve-group-modal" style="background:var(--bg-app); border:1px solid var(--border-color); width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-main); font-size:1.3rem;">
              &times;
            </button>
          </div>

          <!-- Form Body -->
          <form id="admin-approve-group-form" style="display:flex; flex-direction:column; gap:16px; overflow-y:auto; padding-inline-end:4px;">
            
            <!-- Schedule Days Checkboxes -->
            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                أيام الحصص في الأسبوع: <span style="color:#ef4444;">*</span>
              </label>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(80px, 1fr)); gap:6px;">
                ${["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map(day => `
                  <label style="display:flex; align-items:center; gap:5px; padding:7px 8px; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); font-size:0.8rem; font-weight:700; cursor:pointer;">
                    <input type="checkbox" name="approve-group-days" value="${day}" ${currentDaysStr.includes(day) ? 'checked' : ''} style="accent-color:#10b981;">
                    <span>${day}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Schedule Time & Session Duration -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">توقيت الحصة:</label>
                <input type="text" id="approve-group-time" value="${initialTime}" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo',sans-serif; box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">مدة الحصة (بالدقائق):</label>
                <input type="number" id="approve-group-duration" value="${initialDuration}" min="15" max="180" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
            </div>

            <!-- Total Sessions & Start Date -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  عدد الحصص الإجمالي: <span style="color:#ef4444;">*</span>
                </label>
                <input type="number" id="approve-group-total-sessions" value="${initialSessions}" min="1" max="120" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-weight:800; box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  تاريخ بدء المجموعة: <span style="color:#ef4444;">*</span>
                </label>
                <input type="date" id="approve-group-start-date" value="${initialStartDate}" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
              </div>
            </div>

            <!-- Calculated End Date & Max Capacity -->
            <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:10px;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="font-size:0.85rem; font-weight:800; color:var(--text-main); margin:0;">تاريخ الانتهاء المحسوب:</label>
                  <span style="font-size:0.72rem; color:#10b981; font-weight:800;">⚡ حساب تلقائي</span>
                </div>
                <input type="date" id="approve-group-end-date" value="${initialEndDate}" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1.5px solid #10b981; background:var(--bg-app); color:var(--text-main); font-weight:800; box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">إجمالي المقاعد:</label>
                <input type="number" id="approve-group-max-students" value="${initialMaxSeats}" min="1" max="100" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-weight:800; box-sizing:border-box;">
              </div>
            </div>

            <!-- Pricing: Student Rate & Teacher Rate -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:var(--text-main);">
                  سعر ساعة/حصة الطالب (ج.م.): <span style="color:#ef4444;">*</span>
                </label>
                <input type="number" id="approve-group-student-rate" value="${initialStudentRate}" min="0" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-weight:800; font-size:1rem; box-sizing:border-box;">
              </div>
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; margin-bottom:6px; color:#10b981;">
                  أجر المعلم بالساعة (ج.م.): <span style="color:#ef4444;">*</span>
                </label>
                <input type="number" id="approve-group-teacher-rate" value="${initialTeacherRate}" min="0" required class="form-input" style="width:100%; padding:10px 12px; border-radius:12px; border:1.5px solid #10b981; background:var(--bg-app); color:#10b981; font-weight:800; font-size:1rem; box-sizing:border-box;">
              </div>
            </div>

            <!-- Live Calculation Summary Card -->
            <div id="approve-group-live-summary" style="background:linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.06) 100%); border:1px solid rgba(16,185,129,0.3); border-radius:16px; padding:14px 18px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                <span style="color:var(--text-muted); font-weight:700;">💰 إجمالي تكلفة الدورة للطالب:</span>
                <strong id="summary-student-total" style="color:var(--text-main); font-size:0.95rem;">${initialStudentRate * initialSessions} ج.م. (${initialStudentRate} ج.م. × ${initialSessions} حصة)</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                <span style="color:var(--text-muted); font-weight:700;">👨‍🏫 إجمالي مستحقات المعلم:</span>
                <strong id="summary-teacher-total" style="color:#10b981; font-size:0.95rem;">${initialTeacherRate * initialSessions} ج.م. (${initialTeacherRate} ج.م. × ${initialSessions} ساعة)</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; border-top:1px dashed var(--border-color); padding-top:6px;">
                <span style="color:var(--text-muted);">📅 الفترة الزمنية:</span>
                <span id="summary-duration-text" style="color:var(--text-main); font-weight:800;">من ${initialStartDate} إلى ${initialEndDate}</span>
              </div>
            </div>

            <!-- Submit Buttons -->
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">
              <button type="button" id="cancel-admin-approve-group-btn" class="btn-secondary" style="padding:11px 22px; border-radius:20px; font-weight:800;">إلغاء</button>
              <button type="submit" id="submit-admin-approve-group-btn" class="btn-primary" style="padding:11px 32px; border-radius:20px; font-weight:900; background:linear-gradient(135deg,#10b981,#059669); border:none; color:#fff; box-shadow:0 4px 16px rgba(16,185,129,0.35); font-size:0.92rem; display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="check-circle" style="width:18px; height:18px;"></i> اعتماد ونشر المجموعة للطلاب الآن 🚀
              </button>
            </div>

          </form>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Close Modal Events
    wrapper.querySelector("#close-admin-approve-group-modal")?.addEventListener("click", closeModal);
    wrapper.querySelector("#cancel-admin-approve-group-btn")?.addEventListener("click", closeModal);

    // Live calculation updates
    const updateCalculations = () => {
      const startDateVal = wrapper.querySelector("#approve-group-start-date")?.value;
      const totalSessionsVal = parseInt(wrapper.querySelector("#approve-group-total-sessions")?.value, 10) || 24;
      const studentRateVal = parseFloat(wrapper.querySelector("#approve-group-student-rate")?.value) || 0;
      const teacherRateVal = parseFloat(wrapper.querySelector("#approve-group-teacher-rate")?.value) || 0;
      
      const checkedDays = Array.from(wrapper.querySelectorAll("input[name='approve-group-days']:checked")).map(cb => cb.value);
      
      const computedEnd = calculateEndDate(startDateVal, checkedDays, totalSessionsVal);
      const endDateInput = wrapper.querySelector("#approve-group-end-date");
      if (endDateInput && computedEnd) {
        endDateInput.value = computedEnd;
      }

      const summaryStudent = wrapper.querySelector("#summary-student-total");
      if (summaryStudent) {
        summaryStudent.innerText = `${studentRateVal * totalSessionsVal} ج.م. (${studentRateVal} ج.م. × ${totalSessionsVal} حصة)`;
      }

      const summaryTeacher = wrapper.querySelector("#summary-teacher-total");
      if (summaryTeacher) {
        summaryTeacher.innerText = `${teacherRateVal * totalSessionsVal} ج.م. (${teacherRateVal} ج.م. × ${totalSessionsVal} ساعة)`;
      }

      const summaryDuration = wrapper.querySelector("#summary-duration-text");
      if (summaryDuration) {
        summaryDuration.innerText = `من ${startDateVal || '...'} إلى ${computedEnd || endDateInput?.value || '...'}`;
      }
    };

    wrapper.querySelector("#approve-group-start-date")?.addEventListener("change", updateCalculations);
    wrapper.querySelector("#approve-group-total-sessions")?.addEventListener("input", updateCalculations);
    wrapper.querySelector("#approve-group-student-rate")?.addEventListener("input", updateCalculations);
    wrapper.querySelector("#approve-group-teacher-rate")?.addEventListener("input", updateCalculations);
    wrapper.querySelectorAll("input[name='approve-group-days']").forEach(cb => cb.addEventListener("change", updateCalculations));

    // Form Submit
    const form = wrapper.querySelector("#admin-approve-group-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const startDate = wrapper.querySelector("#approve-group-start-date")?.value || null;
      const endDate = wrapper.querySelector("#approve-group-end-date")?.value || null;
      const scheduleTime = wrapper.querySelector("#approve-group-time")?.value.trim() || "6:00م";
      const totalSessions = parseInt(wrapper.querySelector("#approve-group-total-sessions")?.value, 10) || 24;
      const sessionDuration = parseInt(wrapper.querySelector("#approve-group-duration")?.value, 10) || 60;
      const maxStudents = parseInt(wrapper.querySelector("#approve-group-max-students")?.value, 10) || 25;
      const studentHourlyRate = parseFloat(wrapper.querySelector("#approve-group-student-rate")?.value) || 50;
      const teacherHourlyRate = parseFloat(wrapper.querySelector("#approve-group-teacher-rate")?.value) || 120;
      
      const checkedDays = Array.from(wrapper.querySelectorAll("input[name='approve-group-days']:checked")).map(cb => cb.value);
      const scheduleDays = checkedDays.join("، ") || "الأحد، الثلاثاء";
      const scheduleText = `${scheduleDays} الساعة ${scheduleTime}`;

      const submitBtn = wrapper.querySelector("#submit-admin-approve-group-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;display:inline-block;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> جاري الاعتماد والنشر...`;
      }

      try {
        await apiFetch(`/admin/groups/${group.id}/approve`, {
          method: "POST",
          body: JSON.stringify({
            startDate,
            endDate,
            scheduleDays,
            scheduleTime,
            scheduleText,
            totalSessions,
            sessionDuration,
            studentHourlyRate,
            teacherHourlyRate,
            sessionPrice: studentHourlyRate,
            monthlyPrice: studentHourlyRate * 8,
            maxStudents
          })
        });

        showToast("تم اعتماد المجموعة ونشرها للطلاب بنجاح! 🎉🚀", "success");
        closeModal();
        await this.loadAllData();
        this.renderTab("groups");
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="check-circle" style="width:18px; height:18px;"></i> اعتماد ونشر المجموعة للطلاب الآن 🚀`;
          if (window.lucide) window.lucide.createIcons();
        }
        showToast(err.message || "فشل اعتماد المجموعة.", "error");
      }
    });
  },

  // ── 5. Sessions Management Tab ────────────────────────────────────────────────

  renderSessionsTab(filterSubId = null) {
    let allSessions = this.allSessions || [];
    if (filterSubId) {
      allSessions = allSessions.filter(s => String(s.subscription?.id) === String(filterSubId));
    }

    // Sort all sessions by newest date first (Newest First DESC)
    allSessions = [...allSessions].sort((a, b) => {
      const timeA = new Date(a.scheduledAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.scheduledAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

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

  async renderGroupStudentsModal(groupIdOrSessionId) {
    const container = document.getElementById("admin-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div class="modal-overlay" id="group-students-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6); z-index:99999;">
        <div class="modal-content" style="max-width:820px; width:95%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; background:var(--bg-card); box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);">
          <div style="padding:40px; text-align:center;">
            <div class="spinner" style="width:36px; height:36px; margin:0 auto 12px;"></div>
            <p style="color:var(--text-muted); font-size:0.9rem; font-weight:700;">جاري تحميل قائمة طلاب المجموعة وطرق التواصل...</p>
          </div>
        </div>
      </div>
    `;

    let targetTitle = "المجموعة الدراسية";
    let teacherName = "معلم المنصة";
    let maxSeats = 25;
    let students = [];
    let isDbCourseGroup = false;
    let dbGroupId = groupIdOrSessionId;

    try {
      // 1. Try to fetch official roster from backend endpoint
      const rosterRes = await apiFetch(`/groups/${groupIdOrSessionId}/roster`).catch(() => null);
      
      if (rosterRes && rosterRes.students) {
        isDbCourseGroup = true;
        targetTitle = rosterRes.group?.name || "المجموعة الدراسية";
        teacherName = rosterRes.group?.teacher?.name || "معلم المنصة";
        maxSeats = rosterRes.group?.maxStudents || 25;
        students = rosterRes.students || [];
      } else {
        // 2. Fallback: match from local cache
        const matchedGroup = (this.allCourseGroups || []).find(g => String(g.id) === String(groupIdOrSessionId));
        if (matchedGroup) {
          isDbCourseGroup = true;
          targetTitle = matchedGroup.name || "المجموعة الدراسية";
          teacherName = matchedGroup.teacher?.name || matchedGroup.course?.teacher?.name || "معلم المنصة";
          maxSeats = matchedGroup.maxStudents || 25;

          const groupEnrollments = (this.allEnrollments || []).filter(e => 
            e.group && String(e.group.id) === String(groupIdOrSessionId)
          );

          students = groupEnrollments.map(e => ({
            enrollmentId: e.id,
            studentId: e.student?.id || null,
            name: e.student?.name || "طالب",
            email: e.student?.email || "",
            phone: e.student?.phone || e.payment?.providerTransactionId || "",
            status: e.status || "active",
            progress: e.progress || 0,
            payment: e.payment,
            enrolledAt: e.createdAt
          }));
        } else {
          // 3. Session fallback
          const sess = (this.allSessions || []).find(s => String(s.id) === String(groupIdOrSessionId));
          if (sess) {
            targetTitle = sess.title || (sess.course ? sess.course.title : "مجموعة دراسية أونلاين");
            teacherName = sess.teacher?.name || sess.course?.teacher?.name || "معلم المنصة";

            if (sess.course) {
              const courseId = sess.course.id || sess.courseId;
              const courseEnrollments = (this.allEnrollments || []).filter(e => e.course && String(e.course.id) === String(courseId));
              students = courseEnrollments.map(e => ({
                enrollmentId: e.id,
                studentId: e.student?.id,
                name: e.student?.name,
                email: e.student?.email,
                phone: e.student?.phone || e.payment?.providerTransactionId,
                status: e.status,
                progress: e.progress || 0,
                payment: e.payment,
                enrolledAt: e.createdAt
              })).filter(s => s.studentId);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading group students modal:", err);
    }

    const availableStudents = (this.allMembers || []).filter(u => 
      u.role === "student" && !students.some(st => String(st.studentId) === String(u.id))
    );

    const activeCount = students.filter(s => s.status === 'active').length;
    const pendingCount = students.filter(s => s.status === 'pending' || s.status === 'PENDING').length;
    const availableSeats = Math.max(0, maxSeats - activeCount);
    const isFull = availableSeats <= 0;

    container.innerHTML = `
      <div class="modal-overlay" id="group-students-modal" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6); z-index:99999;">
        <div class="modal-content" style="max-width:840px; width:95%; border-radius:24px; overflow:hidden; border:1px solid var(--border-color); padding:0; background:var(--bg-card); box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);">
          
          <!-- Header -->
          <div style="padding:22px 26px; background:linear-gradient(135deg, rgba(139,92,246,0.14), rgba(229,29,116,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:48px; height:48px; border-radius:16px; background:rgba(139,92,246,0.18); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="users" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.2rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main);">
                  قائمة طلاب المجموعة والتواصل عبر الواتساب (${students.length}) 👥💬
                </h3>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:0.8rem; color:var(--text-muted);">
                  <span>👥 <strong>${targetTitle}</strong></span>
                  <span>•</span>
                  <span>👨‍🏫 المعلم: <strong>${teacherName}</strong></span>
                  <span>•</span>
                  <span style="color:#10b981; font-weight:800;">✅ مفعّل: ${activeCount}</span>
                  ${pendingCount > 0 ? `<span style="color:#d97706; font-weight:800;">⏳ قيد الاعتماد: ${pendingCount}</span>` : ''}
                  <span>•</span>
                  <span style="font-weight:800; color:${isFull ? '#ef4444' : '#10b981'};">
                    ${isFull ? '🔒 السعة مكتملة (0 متبقي)' : `✨ شاغر: ${availableSeats} مقاعد من ${maxSeats}`}
                  </span>
                </div>
              </div>
            </div>
            <span id="close-group-students-modal" style="font-size:1.4rem; cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <div class="modal-body" style="padding:22px 26px; max-height:72vh; overflow-y:auto; display:flex; flex-direction:column; gap:18px;">

            <!-- Add Student to Group Bar -->
            ${isFull ? `
              <div style="background:rgba(239,68,68,0.08); border:1px dashed rgba(239,68,68,0.35); padding:14px 18px; border-radius:18px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="lock" style="width:18px; height:18px; color:#ef4444;"></i>
                  <div>
                    <strong style="font-size:0.88rem; color:#ef4444; display:block;">اكتملت مقاعد هذه المجموعة بالكامل (${maxSeats} من ${maxSeats} مقعداً)</strong>
                    <span style="font-size:0.76rem; color:var(--text-muted);">لا يمكن إضافة طلاب جدد إلا بعد زيادة سعة المجموعة في نافذة التعديل أو إزالة طالب.</span>
                  </div>
                </div>
                <span style="font-size:0.78rem; font-weight:800; background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 10px; border-radius:10px;">
                  0 مقاعد متاحة
                </span>
              </div>
            ` : `
              <div style="background:var(--bg-app); border:1px solid var(--border-color); padding:16px 18px; border-radius:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin:0;">
                    <i data-lucide="user-plus" style="width:16px; height:16px; color:#8b5cf6;"></i> ➕ إضافة وتسكين طالب جديد في هذه المجموعة
                  </label>
                  <span style="font-size:0.78rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.12); padding:3px 10px; border-radius:12px; border:1px solid rgba(16,185,129,0.25);">
                    ✨ متبقي ${availableSeats} مقاعد شاغرة
                  </span>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                  <select id="select-new-group-student" class="form-select" style="flex:1; min-width:240px; border-radius:14px; padding:10px 14px; font-size:0.88rem;">
                    <option value="">-- اختر طالباً لإضافته وتفعيل مقعده وتوليد الحصص له --</option>
                    ${availableStudents.map(st => `<option value="${st.id}">${st.name} (${st.email || st.phone || 'طالب'})</option>`).join('')}
                  </select>
                  <button type="button" id="add-student-to-group-btn" class="btn-primary" style="padding:10px 20px; border-radius:14px; font-weight:800; font-size:0.85rem; gap:6px; background:#8b5cf6; border-color:#8b5cf6;">
                    <i data-lucide="plus" style="width:14px; height:14px;"></i> إضافة وتفعيل المقعد والحصص
                  </button>
                </div>
              </div>
            `}

            <!-- Students List -->
            ${students.length === 0 ? `
              <div style="text-align:center; padding:50px 20px; color:var(--text-muted); background:var(--bg-app); border-radius:18px; border:1px dashed var(--border-color);">
                <div style="width:54px; height:54px; border-radius:16px; background:rgba(99,102,241,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                  <i data-lucide="user-x" style="width:28px; height:28px; color:var(--primary); opacity:0.5;"></i>
                </div>
                <h4 style="margin:0 0 6px 0; font-weight:800; color:var(--text-main);">لا يوجد طلاب مسجلون بهذه المجموعة حالياً</h4>
                <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">يمكنك إضافة طالب من القائمة أعلاه أو انتظار تسجيل الطلاب واعتماد إيصالاتهم.</p>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${students.map(st => {
                  const rawPhone = st.phone || '';
                  const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
                  const cleanWa = getCleanWhatsAppNumber(rawPhone);
                  const isPending = st.status === 'pending' || st.status === 'PENDING';
                  const isActive = st.status === 'active' || st.status === 'ACTIVE';
                  const waMsg = encodeURIComponent(`مرحباً ${st.name || 'طالبنا العزيز'}، نتواصل معك من إدارة منصة انطلق بخصوص مجموعتك الدراسية (${targetTitle}) مع الأستاذ ${teacherName}.`);

                  return `
                    <div style="padding:14px 18px; border-radius:16px; background:var(--bg-app); border:1px solid ${isPending ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;">
                      
                      <!-- Left: Student Info -->
                      <div style="display:flex; align-items:center; gap:12px; min-width:220px;">
                        <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(st.name || 'Student')}" 
                             alt="${st.name}" 
                             style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:var(--bg-card); flex-shrink:0;">
                        <div>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <strong style="font-size:0.95rem; color:var(--text-main);">${st.name || 'طالب'}</strong>
                            ${isPending ? `
                              <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.3);">
                                ⏳ قيد الاعتماد
                              </span>
                            ` : isActive ? `
                              <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);">
                                ✅ مقعد مفعّل
                              </span>
                            ` : `
                              <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:8px; background:rgba(239,68,68,0.15); color:#ef4444;">
                                ❌ مرفوض
                              </span>
                            `}
                          </div>
                          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                            ${st.email || ''} ${st.enrolledAt ? `• تاريخ التسجيل: ${new Date(st.enrolledAt).toLocaleDateString('ar')}` : ''}
                          </div>
                        </div>
                      </div>

                      <!-- Right: Contact Methods & Actions -->
                      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-inline-start:auto;">
                        
                        <!-- WhatsApp Direct Chat Button -->
                        ${rawPhone ? `
                          <a href="https://wa.me/${cleanWa}?text=${waMsg}" target="_blank" rel="noopener" 
                             class="btn-secondary" 
                             style="font-size:0.78rem; padding:6px 12px; border-radius:12px; border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.08); text-decoration:none; display:inline-flex; align-items:center; gap:5px; font-weight:800;"
                             title="مراسلة الطالب مباشرة عبر الواتساب">
                            💬 واتساب (${rawPhone})
                          </a>
                          <a href="tel:${cleanPhone}" 
                             class="btn-secondary" 
                             style="font-size:0.78rem; padding:6px 10px; border-radius:12px; border-color:var(--primary); color:var(--primary); background:rgba(99,102,241,0.08); text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:800;"
                             title="اتصال هاتفي فوري">
                            <i data-lucide="phone-call" style="width:12px; height:12px;"></i> اتصال
                          </a>
                        ` : `
                          <span style="font-size:0.75rem; color:var(--text-muted); padding:4px 8px;">لا يوجد هاتف</span>
                        `}

                        <!-- Quick Approve button for pending students -->
                        ${isPending && st.enrollmentId ? `
                          <button type="button" class="btn-primary admin-roster-approve-btn" data-enrollment-id="${st.enrollmentId}"
                            style="font-size:0.76rem; padding:6px 12px; border-radius:12px; background:#10b981; border-color:#10b981; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;"
                            title="اعتماد وتفعيل مقعد هذا الطالب الآن">
                            <i data-lucide="check" style="width:13px; height:13px;"></i> اعتماد ✅
                          </button>
                        ` : ''}

                        <!-- Remove from Group Button -->
                        <button type="button" class="btn-secondary admin-remove-group-student-btn" 
                          data-student-id="${st.studentId || ''}" 
                          data-enrollment-id="${st.enrollmentId || ''}"
                          style="font-size:0.76rem; padding:6px 10px; border-radius:12px; color:#ef4444; border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.06); font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;"
                          title="إزالة الطالب من هذه المجموعة">
                          <i data-lucide="trash-2" style="width:13px; height:13px;"></i> إزالة
                        </button>

                      </div>

                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <div class="modal-footer" style="padding:16px 26px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.8rem; color:var(--text-muted);">إجمالي المقاعد المحددة للمجموعة: <strong>${maxSeats} مقعداً</strong></span>
            <button type="button" class="btn-secondary" id="cancel-group-students-btn" style="padding:8px 22px; font-size:0.88rem; font-weight:800; border-radius:20px;">إغلاق</button>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-group-students-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-group-students-btn")?.addEventListener("click", closeModal);

    // 1. Add Student to Group
    document.getElementById("add-student-to-group-btn")?.addEventListener("click", async () => {
      const studentId = document.getElementById("select-new-group-student")?.value;
      if (!studentId) {
        showToast("يرجى اختيار طالب من القائمة أولاً.", "warning");
        return;
      }

      const addBtn = document.getElementById("add-student-to-group-btn");
      if (addBtn) addBtn.disabled = true;

      try {
        if (isDbCourseGroup) {
          const res = await apiFetch(`/admin/groups/${dbGroupId}/add-student`, {
            method: "POST",
            body: JSON.stringify({ studentId })
          });
          showToast(res.message || "تمت إضافة الطالب للمجموعة وتفعيل مقعده بنجاح! 🎉", "success");
        } else {
          const res = await apiFetch("/admin/group-sessions/add-student", {
            method: "POST",
            body: JSON.stringify({ sessionId: dbGroupId, studentId })
          });
          showToast(res.message || "تمت إضافة الطالب بنجاح! 🎉", "success");
        }

        await this.loadAllData();
        await this.renderGroupStudentsModal(dbGroupId);
        this.renderTab(this.activeTab);
      } catch (err) {
        showToast(err.message || "فشل إضافة الطالب إلى المجموعة", "error");
        if (addBtn) addBtn.disabled = false;
      }
    });

    // 2. Quick Approve from Modal
    container.querySelectorAll(".admin-roster-approve-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const enrollmentId = btn.getAttribute("data-enrollment-id");
        if (!enrollmentId) return;
        btn.disabled = true;
        try {
          const res = await apiFetch(`/admin/enrollments/${enrollmentId}/approve`, {
            method: "POST",
            body: JSON.stringify({})
          });
          showToast(res.message || "تم اعتماد وتفعيل مقعد الطالب بنجاح! ✅", "success");
          await this.loadAllData();
          await this.renderGroupStudentsModal(dbGroupId);
          this.renderTab(this.activeTab);
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "فشل اعتماد تسجيل الطالب", "error");
        }
      });
    });

    // 3. Remove Student from Group
    container.querySelectorAll(".admin-remove-group-student-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const stId = btn.getAttribute("data-student-id");
        const enrId = btn.getAttribute("data-enrollment-id");
        const confirmed = await confirmDialog({ message: "هل أنت متأكد من إزالة هذا الطالب من المجموعة الدراسية؟", danger: true });
        if (!confirmed) return;
        btn.disabled = true;
        try {
          if (isDbCourseGroup) {
            const res = await apiFetch(`/admin/groups/${dbGroupId}/remove-student`, {
              method: "POST",
              body: JSON.stringify({ studentId: stId, enrollmentId: enrId })
            });
            showToast(res.message || "تمت إزالة الطالب من المجموعة بنجاح", "info");
          } else {
            const res = await apiFetch("/admin/group-sessions/remove-student", {
              method: "POST",
              body: JSON.stringify({ sessionId: dbGroupId, studentId: stId })
            });
            showToast(res.message || "تمت إزالة الطالب من المجموعة بنجاح", "info");
          }

          await this.loadAllData();
          await this.renderGroupStudentsModal(dbGroupId);
          this.renderTab(this.activeTab);
        } catch (err) {
          btn.disabled = false;
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

    const teachers = (this.allMembers || []).filter(u => u.role === "teacher" || u.role === "instructor");
    const students = (this.allMembers || []).filter(u => u.role === "student");
    const courses = this.courses || [];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const defaultStartDateStr = `${y}-${m}-${d}`;
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
              <span>المعلم والدورة التعليمية</span>
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
              
              <!-- STEP 1: Teacher & Course Selection -->
              <div id="grp-step-content-1">
                <div style="display:flex; flex-direction:column; gap:16px;">
                  
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <!-- Teacher Select -->
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

                    <!-- Course Select (Filtered automatically by teacher) -->
                    <div class="form-group" style="margin:0;">
                      <label for="group-session-course" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="book-open" style="width:14px; height:14px; color:var(--primary);"></i>
                        الدورة / المادة الدراسية <span style="color:var(--error);">*</span>
                      </label>
                      <select id="group-session-course" class="form-select" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                        <option value="">-- اختر الدورة التعليمية المرتبطة --</option>
                        ${courses.map(c => `
                          <option value="${c.id}" data-teacher-id="${c.teacher?.id || c.teacherId || ''}" data-link="${c.meetingLink || ''}">
                            ${c.title} ${c.grade ? `(${c.grade.name})` : ''} ${c.subject ? `• ${c.subject.name}` : ''}
                          </option>
                        `).join('')}
                      </select>
                    </div>
                  </div>

                  <!-- Course Specs Banner Info -->
                  <div id="group-course-preview-card" style="display:none; padding:12px 16px; border-radius:14px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); font-size:0.85rem; color:var(--text-main);">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                      <span style="font-weight:900; color:var(--primary);" id="grp-selected-course-title">📚 -</span>
                      <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.72rem;" id="grp-selected-course-grade">🎓 -</span>
                      <span class="badge" style="background:rgba(229,29,116,0.12); color:#e51d74; font-weight:800; font-size:0.72rem;" id="grp-selected-course-subject">📖 -</span>
                    </div>
                  </div>

                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group" style="margin:0;">
                      <label for="group-session-duration" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="clock" style="width:14px; height:14px; color:#10b981;"></i>
                        مدة كل حصة (بالدقائق) <span style="color:var(--error);">*</span>
                      </label>
                      <input type="number" id="group-session-duration" class="form-input" value="60" min="15" max="240" step="15" required style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    </div>

                    <div class="form-group" style="margin:0;">
                      <label for="group-session-meeting-link" style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">
                        🔗 رابط البث أونلاين الافتراضي (Google Meet / Zoom)
                      </label>
                      <input type="url" id="group-session-meeting-link" class="form-input" placeholder="https://meet.google.com/abc-defg-hij" style="border-radius:14px; padding:11px 14px; font-size:0.88rem; width:100%;">
                    </div>
                  </div>

                </div>
              </div>

              <!-- STEP 2: Students Selection (Filtered by Course Grade) -->
              <div id="grp-step-content-2" style="display:none;">
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px;">
                  
                  <!-- Grade Filter Notification Header -->
                  <div id="group-grade-filter-info" style="display:none; padding:10px 14px; border-radius:12px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); margin-bottom:12px; font-size:0.84rem; color:var(--text-main);">
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">🎓</span>
                        <div>
                          <span style="font-weight:800; color:var(--primary);">تصفية ذكية حسب المرحلة الدراسية للدورة:</span>
                          <span id="group-filter-grade-name" style="font-weight:700; color:var(--text-main);">-</span>
                        </div>
                      </div>
                      <button type="button" id="toggle-grade-filter-btn" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; border-radius:8px; font-weight:700;">
                        عرض جميع الطلاب
                      </button>
                    </div>
                  </div>

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
                  <input type="text" id="group-students-search" class="form-input" placeholder="🔍 تصفية الطلاب باسم أو بريد أو مرحلة الطالب..." style="border-radius:10px; padding:8px 12px; font-size:0.82rem; margin-bottom:10px; width:100%;">

                  <!-- Students Checkboxes Grid (Populated dynamically according to course grade) -->
                  <div id="group-students-checkboxes-container" style="max-height:230px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px; padding-inline-end:4px;">
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

                  <!-- Financial & Individual Receipts Details Box -->
                  <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:18px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                      <label style="font-weight:900; font-size:0.95rem; color:var(--text-main); display:flex; align-items:center; gap:8px; margin:0; cursor:pointer;">
                        <input type="checkbox" id="group-receipt-enabled" checked style="width:18px; height:18px; accent-color:var(--primary);">
                        <i data-lucide="receipt" style="width:18px; height:18px; color:#10b981;"></i>
                        إصدار وتوثيق إيصال مالي فردي لكل طالب مسجل 💳
                      </label>
                      <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem;">إيصال منفصل لكل طالب</span>
                    </div>

                    <div id="group-receipt-fields-container" style="display:flex; flex-direction:column; gap:12px;">
                      
                      <!-- Batch Fill Toolbar -->
                      <div style="padding:10px 14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:0.82rem;">
                          <span style="font-weight:800; color:var(--text-main);">⚡ تعبئة سريعة للكل:</span>
                          <input type="number" id="batch-receipt-amount" value="300" min="0" step="10" placeholder="المبلغ (ج.م)"
                            style="width:95px; padding:6px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700;">
                          <select id="batch-receipt-method"
                            style="padding:6px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700;">
                            <option value="instapay" selected>انستاباي InstaPay</option>
                            <option value="bank_transfer">تحويل بنكي</option>
                            <option value="vodafone_cash">فودافون كاش</option>
                            <option value="cash">نقداً كاش</option>
                            <option value="card">بطاقة دفع</option>
                          </select>
                          <input type="text" id="batch-receipt-ref-prefix" value="REC-" placeholder="بادئة الإيصال (REC-)"
                            style="width:120px; padding:6px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem;">
                        </div>
                        <button type="button" id="apply-batch-receipts-btn" class="btn-secondary"
                          style="padding:6px 14px; font-size:0.78rem; font-weight:800; border-radius:10px; background:rgba(99,102,241,0.1); color:var(--primary); border-color:rgba(99,102,241,0.25); cursor:pointer;">
                          تطبيق على كل الطلاب ✍️
                        </button>
                      </div>

                      <!-- Per-Student Receipt Cards Container -->
                      <div id="group-student-individual-receipts-list" style="max-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-inline-end:4px;">
                        <!-- Rendered dynamically -->
                      </div>

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
                      الدورة: <strong id="grp-summary-course" style="color:var(--primary);">-</strong> | 
                      الطلاب: <strong id="grp-summary-students" style="color:#10b981;">0</strong> | 
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

    const teacherSelect = document.getElementById("group-session-teacher");
    const courseSelect = document.getElementById("group-session-course");
    const meetingInput = document.getElementById("group-session-meeting-link");

    // Dynamic Teacher <-> Course synchronization
    const updateCourseSelectOptions = (selectedTeacherId) => {
      const currentSelectedCourseId = courseSelect.value;
      let matchingCourses = courses;
      if (selectedTeacherId) {
        matchingCourses = courses.filter(c => {
          const tId = c.teacher?.id || c.teacherId;
          return String(tId) === String(selectedTeacherId);
        });
      }

      courseSelect.innerHTML = `
        <option value="">-- اختر الدورة التعليمية المرتبطة (${matchingCourses.length}) --</option>
        ${matchingCourses.map(c => `
          <option value="${c.id}" data-teacher-id="${c.teacher?.id || c.teacherId || ''}" data-link="${c.meetingLink || ''}">
            ${c.title} ${c.grade?.name || c.grade?.code || c.degree ? `(${c.grade?.name || c.grade?.code || c.degree})` : ''} ${c.subject?.name || c.category ? `• ${c.subject?.name || c.category}` : ''}
          </option>
        `).join('')}
      `;

      if (currentSelectedCourseId && matchingCourses.some(c => String(c.id) === String(currentSelectedCourseId))) {
        courseSelect.value = currentSelectedCourseId;
      } else if (matchingCourses.length === 1) {
        courseSelect.value = matchingCourses[0].id;
      }
      updateCoursePreviewCard();
    };

    const updateCoursePreviewCard = () => {
      const selectedCourseId = courseSelect.value;
      const previewCard = document.getElementById("group-course-preview-card");
      const courseObj = courses.find(c => String(c.id) === String(selectedCourseId));

      if (courseObj && previewCard) {
        previewCard.style.display = "block";
        const gradeName = courseObj.grade?.name || courseObj.grade?.code || courseObj.degree || 'جميع المراحل';
        const subjectName = courseObj.subject?.name || courseObj.category || 'عام';
        document.getElementById("grp-selected-course-title").innerText = `📚 ${courseObj.title}`;
        document.getElementById("grp-selected-course-grade").innerText = `🎓 ${gradeName}`;
        document.getElementById("grp-selected-course-subject").innerText = `📖 ${subjectName}`;
        if (courseObj.meetingLink && !meetingInput.value) {
          meetingInput.value = courseObj.meetingLink;
        }
      } else if (previewCard) {
        previewCard.style.display = "none";
      }
    };

    // Comprehensive Grade Key Normalization Helper
    const normalizeGradeKey = (raw) => {
      if (!raw) return "";
      const s = String(raw).toLowerCase().trim();

      // Secondary 3 / Entlq 3 / BAC
      if (s.includes("entlq 3") || s.includes("bac") || s.includes("ثالثة ثانوي") || s.includes("3ث") || s.includes("ثالث ثانوي") || s.includes("sec_3") || s.includes("grade 12")) {
        return "sec_3";
      }
      // Secondary 2 / Entlq 2
      if (s.includes("entlq 2") || s.includes("ثانية ثانوي") || s.includes("2ث") || s.includes("ثاني ثانوي") || s.includes("sec_2") || s.includes("grade 11")) {
        return "sec_2";
      }
      // Secondary 1 / Entlq 1
      if (s.includes("entlq 1") || s.includes("أولى ثانوي") || s.includes("اولى ثانوي") || s.includes("1ث") || s.includes("أول ثانوي") || s.includes("اول ثانوي") || s.includes("sec_1") || s.includes("grade 10")) {
        return "sec_1";
      }

      // Preparatory / Intermediate
      if (s.includes("grade 9") || s.includes("bem") || s.includes("تاسع") || s.includes("الصف 9") || s.includes("prep_3") || s.includes("3 إعدادي") || s.includes("ثالث إعدادي")) {
        return "grade_9";
      }
      if (s.includes("grade 8") || s.includes("ثامن") || s.includes("الصف 8") || s.includes("prep_2") || s.includes("2 إعدادي") || s.includes("ثاني إعدادي")) {
        return "grade_8";
      }
      if (s.includes("grade 7") || s.includes("سابع") || s.includes("الصف 7") || s.includes("prep_1") || s.includes("1 إعدادي") || s.includes("أول إعدادي") || s.includes("اول إعدادي")) {
        return "grade_7";
      }

      // Primary / Prep 6-1
      if (s.includes("grade 6") || s.includes("سادس") || s.includes("الصف 6") || s.includes("pri_6") || s.includes("prep 6") || s.includes("سادسة") || s.includes("6 إعدادي") || s.includes("6 ابتدائي")) {
        return "grade_6";
      }
      if (s.includes("grade 5") || s.includes("خامس") || s.includes("الصف 5") || s.includes("pri_5") || s.includes("خامسة") || s.includes("5 ابتدائي")) {
        return "grade_5";
      }
      if (s.includes("grade 4") || s.includes("رابع") || s.includes("الصف 4") || s.includes("pri_4") || s.includes("رابعة") || s.includes("4 ابتدائي")) {
        return "grade_4";
      }
      if (s.includes("grade 3") || s.includes("الصف 3 ابتدائي") || s.includes("pri_3") || s.includes("3 ابتدائي")) {
        return "grade_3";
      }
      if (s.includes("grade 2") || s.includes("الصف 2 ابتدائي") || s.includes("pri_2") || s.includes("2 ابتدائي")) {
        return "grade_2";
      }
      if (s.includes("grade 1") || s.includes("الصف 1 ابتدائي") || s.includes("pri_1") || s.includes("1 ابتدائي")) {
        return "grade_1";
      }

      return s;
    };

    // Format human-readable grade label for student
    const formatStudentGradeLabel = (st) => {
      const raw = st.grade?.name || st.education || "";
      if (!raw) return "المرحلة غير محددة";
      const key = normalizeGradeKey(raw);
      const gradeLabels = {
        "grade_1": "الصف الأول الابتدائي (Grade 1)",
        "grade_2": "الصف الثاني الابتدائي (Grade 2)",
        "grade_3": "الصف الثالث الابتدائي (Grade 3)",
        "grade_4": "الصف الرابع الابتدائي (Grade 4)",
        "grade_5": "الصف الخامس الابتدائي (Grade 5)",
        "grade_6": "الصف السادس الابتدائي (Grade 6)",
        "grade_7": "الصف السابع المتوسط (Grade 7)",
        "grade_8": "الصف الثامن المتوسط (Grade 8)",
        "grade_9": "الصف التاسع المتوسط (Grade 9 BEM)",
        "sec_1": "الصف الأول الثانوي (انطلق 1)",
        "sec_2": "الصف الثاني الثانوي (انطلق 2)",
        "sec_3": "الصف الثالث الثانوي (انطلق 3 - BAC)"
      };
      return gradeLabels[key] || raw;
    };

    // Strict Same-Grade Matching Function
    const isStudentMatchingCourseGrade = (student, course) => {
      if (!course) return true;
      const courseGradeRaw = course.grade?.name || course.grade?.code || course.degree || '';
      if (!courseGradeRaw) return true;

      const cKey = normalizeGradeKey(courseGradeRaw);
      const sKey = normalizeGradeKey(student.grade?.name || student.grade?.code || student.education || '');

      if (cKey && sKey && cKey === sKey) return true;
      if (String(student.gradeId || student.grade?.id || '') === String(course.grade?.id || '---')) return true;

      return false;
    };

    let filterStudentsByGradeOnly = true;

    // Render Student Checkboxes Grid in Step 2 with Course Grade Filter
    const renderStudentsCheckboxes = () => {
      const containerEl = document.getElementById("group-students-checkboxes-container");
      const gradeFilterInfo = document.getElementById("group-grade-filter-info");
      const filterGradeNameEl = document.getElementById("group-filter-grade-name");
      const toggleFilterBtn = document.getElementById("toggle-grade-filter-btn");
      if (!containerEl) return;

      const selectedCourseId = courseSelect.value;
      const selectedCourse = courses.find(c => String(c.id) === String(selectedCourseId));
      const hasCourseGrade = selectedCourse && (selectedCourse.grade?.name || selectedCourse.grade?.code || selectedCourse.degree);
      const gradeTitle = selectedCourse?.grade?.name || selectedCourse?.grade?.code || selectedCourse?.degree || '';

      let displayedStudents = students;
      if (hasCourseGrade && filterStudentsByGradeOnly) {
        displayedStudents = students.filter(st => isStudentMatchingCourseGrade(st, selectedCourse));
      }

      if (gradeFilterInfo) {
        if (hasCourseGrade) {
          gradeFilterInfo.style.display = "block";
          if (filterGradeNameEl) {
            filterGradeNameEl.innerText = `${gradeTitle} (${displayedStudents.length} طلاب مسجلين بالمرحلة)`;
          }
          if (toggleFilterBtn) {
            toggleFilterBtn.innerText = filterStudentsByGradeOnly ? "عرض جميع الطلاب (إلغاء التصفية)" : "عرض طلاب نفس المرحلة فقط 🎯";
          }
        } else {
          gradeFilterInfo.style.display = "none";
        }
      }

      if (displayedStudents.length === 0) {
        containerEl.innerHTML = `
          <div style="color:var(--text-muted); font-size:0.85rem; padding:20px; grid-column:1/-1; text-align:center; background:var(--bg-card); border-radius:12px; border:1px dashed var(--border-color);">
            ⚠️ لم يتم العثور على طلاب مسجلين في مرحلة <strong>${gradeTitle || 'الدورة المحددة'}</strong> حالياً.
            <div style="margin-top:10px;">
              <button type="button" id="show-all-students-fallback-btn" class="btn-primary" style="padding:6px 14px; border-radius:8px; font-size:0.8rem; font-weight:700;">
                عرض كافة طلاب المنصة (${students.length} طالب)
              </button>
            </div>
          </div>
        `;
        document.getElementById("show-all-students-fallback-btn")?.addEventListener("click", () => {
          filterStudentsByGradeOnly = false;
          renderStudentsCheckboxes();
        });
        return;
      }

      containerEl.innerHTML = displayedStudents.map(st => `
        <label class="group-student-item" data-search="${st.name.toLowerCase()} ${st.email.toLowerCase()} ${(st.education || '').toLowerCase()}"
          style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color); cursor:pointer; transition:all 0.2s;">
          <input type="checkbox" name="groupStudentIds" value="${st.id}" class="group-student-checkbox" style="width:17px; height:17px; accent-color:#8b5cf6; margin-top:2px;">
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
            <strong style="display:block; font-size:0.85rem; color:var(--text-main); overflow:hidden; text-overflow:ellipsis;">${st.name}</strong>
            <span style="font-size:0.73rem; color:var(--text-muted); display:block; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis;">${st.email}</span>
            <div style="display:flex; align-items:center; gap:4px;">
              <span class="badge" style="font-size:0.7rem; font-weight:800; background:rgba(99,102,241,0.12); color:var(--primary); padding:2px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;">
                🎓 ${formatStudentGradeLabel(st)}
              </span>
            </div>
          </div>
        </label>
      `).join('');

      containerEl.querySelectorAll(".group-student-checkbox").forEach(cb => {
        cb.addEventListener("change", updateGroupCounter);
      });
      updateGroupCounter();
    };

    // Toggle Grade Filter button click
    document.getElementById("toggle-grade-filter-btn")?.addEventListener("click", () => {
      filterStudentsByGradeOnly = !filterStudentsByGradeOnly;
      renderStudentsCheckboxes();
    });

    teacherSelect?.addEventListener("change", () => {
      const tId = teacherSelect.value;
      const opt = teacherSelect.options[teacherSelect.selectedIndex];
      if (opt && opt.getAttribute("data-link") && !meetingInput.value) {
        meetingInput.value = opt.getAttribute("data-link");
      }
      updateCourseSelectOptions(tId);
      renderStudentsCheckboxes();
    });

    courseSelect?.addEventListener("change", () => {
      const selectedCourseId = courseSelect.value;
      const courseObj = courses.find(c => String(c.id) === String(selectedCourseId));
      if (courseObj) {
        const tId = courseObj.teacher?.id || courseObj.teacherId;
        if (tId && (!teacherSelect.value || teacherSelect.value !== String(tId))) {
          teacherSelect.value = String(tId);
        }
        if (courseObj.meetingLink) {
          meetingInput.value = courseObj.meetingLink;
        }
      }
      updateCoursePreviewCard();
      renderStudentsCheckboxes();
    });

    // Render Individual Student Receipts Rows
    const renderStudentReceiptsRows = () => {
      const listContainer = document.getElementById("group-student-individual-receipts-list");
      if (!listContainer) return;

      const selectedCbs = Array.from(container.querySelectorAll(".group-student-checkbox:checked"));
      const selectedIds = selectedCbs.map(cb => cb.value);

      const defaultAmount = document.getElementById("batch-receipt-amount")?.value || "300";
      const defaultMethod = document.getElementById("batch-receipt-method")?.value || "instapay";
      const refPrefix = document.getElementById("batch-receipt-ref-prefix")?.value || "REC-";

      listContainer.innerHTML = selectedIds.map((sId, idx) => {
        const studentObj = students.find(st => String(st.id) === String(sId)) || { id: sId, name: `طالب ${idx + 1}`, email: '' };
        const autoRef = `${refPrefix}${Math.floor(1000 + Math.random() * 9000)}`;

        return `
          <div class="st-receipt-row" data-student-id="${sId}"
            style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color); flex-wrap:wrap;">
            
            <!-- Student Header -->
            <div style="display:flex; align-items:center; gap:8px; min-width:160px; flex:1;">
              <div style="width:28px; height:28px; border-radius:50%; background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">
                ${idx + 1}
              </div>
              <div>
                <strong style="font-size:0.85rem; color:var(--text-main); display:block;">${studentObj.name}</strong>
                <span style="font-size:0.72rem; color:var(--text-muted); display:block;">${studentObj.email || ''}</span>
                <span class="badge" style="font-size:0.68rem; background:rgba(99,102,241,0.1); color:var(--primary); font-weight:800; padding:1px 5px; border-radius:5px; margin-top:2px; display:inline-block;">
                  🎓 ${formatStudentGradeLabel(studentObj)}
                </span>
              </div>
            </div>

            <!-- Receipt Inputs -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:2; justify-content:flex-end;">
              
              <!-- Amount -->
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">المبلغ:</span>
                <input type="number" class="st-receipt-amount" value="${defaultAmount}" min="0" step="10"
                  style="width:80px; padding:6px 8px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.82rem; font-weight:700;">
              </div>

              <!-- Method -->
              <select class="st-receipt-method"
                style="padding:6px 8px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.8rem; font-weight:700;">
                <option value="instapay" ${defaultMethod === 'instapay' ? 'selected' : ''}>InstaPay</option>
                <option value="bank_transfer" ${defaultMethod === 'bank_transfer' ? 'selected' : ''}>تحويل بنكي</option>
                <option value="vodafone_cash" ${defaultMethod === 'vodafone_cash' ? 'selected' : ''}>فودافون كاش</option>
                <option value="cash" ${defaultMethod === 'cash' ? 'selected' : ''}>نقداً كاش</option>
                <option value="card" ${defaultMethod === 'card' ? 'selected' : ''}>بطاقة دفع</option>
              </select>

              <!-- Ref No -->
              <input type="text" class="st-receipt-ref" value="${autoRef}" placeholder="رقم الإيصال"
                style="width:105px; padding:6px 8px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.8rem;">

              <!-- Upload Receipt Photo Button -->
              <div style="display:flex; align-items:center; gap:4px;">
                <input type="file" class="st-receipt-file" accept="image/*,.pdf" style="display:none;">
                <input type="hidden" class="st-receipt-url" value="">
                <button type="button" class="st-receipt-upload-btn btn-secondary"
                  style="padding:6px 10px; font-size:0.75rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                  <i data-lucide="paperclip" style="width:13px; height:13px;"></i>
                  <span class="st-upload-label">صورة الإيصال 📎</span>
                </button>
                <a href="#" target="_blank" class="st-receipt-preview-link"
                  style="display:none; font-size:0.75rem; color:#10b981; font-weight:800; text-decoration:none; padding:4px 8px; background:rgba(16,185,129,0.1); border-radius:6px;">
                  👁️ عرض
                </a>
              </div>

              <!-- Notes -->
              <input type="text" class="st-receipt-notes" placeholder="ملاحظات..."
                style="width:100px; padding:6px 8px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.8rem;">

            </div>

          </div>
        `;
      }).join('');

      // Bind receipt file uploads
      listContainer.querySelectorAll(".st-receipt-row").forEach(row => {
        const fileInput = row.querySelector(".st-receipt-file");
        const urlInput = row.querySelector(".st-receipt-url");
        const uploadBtn = row.querySelector(".st-receipt-upload-btn");
        const uploadLabel = row.querySelector(".st-upload-label");
        const previewLink = row.querySelector(".st-receipt-preview-link");

        uploadBtn?.addEventListener("click", () => fileInput?.click());

        fileInput?.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const formData = new FormData();
          formData.append("file", file);
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");

          if (uploadLabel) uploadLabel.innerText = "⏳ جاري الرفع...";
          uploadBtn.disabled = true;

          try {
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { Authorization: "Bearer " + token },
              body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
              urlInput.value = uploadData.url;
              if (uploadLabel) uploadLabel.innerText = "✅ تم الإرفاق";
              uploadBtn.style.background = "rgba(16,185,129,0.15)";
              uploadBtn.style.color = "#10b981";
              uploadBtn.style.borderColor = "rgba(16,185,129,0.3)";
              if (previewLink) {
                previewLink.href = uploadData.url;
                previewLink.style.display = "inline-flex";
              }
              showToast("تم رفع صورة الإيصال بنجاح! 📎", "success");
            } else {
              throw new Error(uploadData.error || "فشل رفع الملف");
            }
          } catch (err) {
            if (uploadLabel) uploadLabel.innerText = "❌ فشل الرفع";
            showToast(err.message || "حدث خطأ أثناء رفع صورة الإيصال", "error");
          } finally {
            uploadBtn.disabled = false;
            if (window.lucide) window.lucide.createIcons();
          }
        });
      });

      if (window.lucide) window.lucide.createIcons();
    };

    // Apply Batch Receipts button
    document.getElementById("apply-batch-receipts-btn")?.addEventListener("click", () => {
      const defaultAmount = document.getElementById("batch-receipt-amount")?.value || "300";
      const defaultMethod = document.getElementById("batch-receipt-method")?.value || "instapay";
      const refPrefix = document.getElementById("batch-receipt-ref-prefix")?.value || "REC-";

      container.querySelectorAll(".st-receipt-row").forEach((row, idx) => {
        const amtInput = row.querySelector(".st-receipt-amount");
        const methodSelect = row.querySelector(".st-receipt-method");
        const refInput = row.querySelector(".st-receipt-ref");

        if (amtInput) amtInput.value = defaultAmount;
        if (methodSelect) methodSelect.value = defaultMethod;
        if (refInput) refInput.value = `${refPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
      });
      showToast("تم تطبيق تفاصيل الإيصال على كافة الطلاب المحددين بنجاح! ⚡", "info");
    });

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

      if (step === 2) {
        renderStudentsCheckboxes();
      }

      if (step === 3) {
        renderStudentReceiptsRows();
      }

      if (step === 4) {
        updatePreviewTable();
      }
    };

    nextBtn.addEventListener("click", () => {
      if (currentStep === 1) {
        const teacherId = document.getElementById("group-session-teacher")?.value;
        const courseId = document.getElementById("group-session-course")?.value;
        if (!teacherId) {
          showToast("يرجى اختيار المعلم المسؤول عن المجموعة", "error");
          return;
        }
        if (!courseId) {
          showToast("يرجى اختيار الدورة التعليمية المرتبطة بالمجموعة", "error");
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
      const courseId = document.getElementById("group-session-course")?.value;

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
      const courseObj = courses.find(c => String(c.id) === String(courseId));

      const summaryTeacherEl = document.getElementById("grp-summary-teacher");
      if (summaryTeacherEl) summaryTeacherEl.innerText = teacherName;

      const summaryCourseEl = document.getElementById("grp-summary-course");
      if (summaryCourseEl) summaryCourseEl.innerText = courseObj ? courseObj.title : '-';

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

    // Toggle receipt details visibility
    const receiptCheckbox = document.getElementById("group-receipt-enabled");
    const receiptFields = document.getElementById("group-receipt-fields-container");
    receiptCheckbox?.addEventListener("change", () => {
      if (receiptFields) {
        receiptFields.style.display = receiptCheckbox.checked ? "flex" : "none";
      }
    });

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
      const teacherId = document.getElementById("group-session-teacher").value;
      const courseId = document.getElementById("group-session-course").value;
      const duration = parseInt(document.getElementById("group-session-duration").value) || 60;
      const meetingLink = document.getElementById("group-session-meeting-link").value.trim();

      const courseObj = courses.find(c => String(c.id) === String(courseId));
      const title = courseObj ? courseObj.title : "حصة جماعية";

      const selectedStudentCbs = container.querySelectorAll(".group-student-checkbox:checked");
      const studentIds = Array.from(selectedStudentCbs).map(cb => cb.value);

      if (!teacherId) {
        showToast("الرجاء اختيار المعلم المسؤول عن المجموعة.", "error");
        return;
      }

      if (!courseId) {
        showToast("الرجاء اختيار الدورة التعليمية المرتبطة بالمجموعة.", "error");
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
      
      const receiptEnabled = document.getElementById("group-receipt-enabled")?.checked || false;
      const studentReceipts = [];

      if (receiptEnabled) {
        selectedStudentCbs.forEach(cb => {
          const sId = cb.value;
          const row = container.querySelector(`.st-receipt-row[data-student-id="${sId}"]`);
          const amount = row ? parseFloat(row.querySelector(".st-receipt-amount")?.value) || 0 : 0;
          const paymentMethod = row ? row.querySelector(".st-receipt-method")?.value || "instapay" : "instapay";
          const transactionRef = row ? row.querySelector(".st-receipt-ref")?.value.trim() || `REC-${sId.slice(0, 6)}` : `REC-${sId.slice(0, 6)}`;
          const receiptUrl = row ? row.querySelector(".st-receipt-url")?.value || null : null;
          const notes = row ? row.querySelector(".st-receipt-notes")?.value.trim() || "" : "";

          studentReceipts.push({
            studentId: sId,
            amount,
            paymentMethod,
            transactionRef,
            receiptUrl,
            notes
          });
        });
      }

      submitBtn.disabled = true;

      const doSubmit = async (allowConflicts = false) => {
        try {
          const res = await apiFetch("/sessions/group-schedule", {
            method: "POST",
            body: JSON.stringify({
              title,
              courseId,
              teacherId,
              studentIds,
              scheduledDates,
              duration,
              meetingLink,
              allowConflicts,
              studentReceipts,
              receiptDetails: { enabled: receiptEnabled }
            }),
            silentError: true
          });

          showToast(res.message || `تم إدراج وجدولة ${scheduledDates.length} حصة جماعية لـ ${studentIds.length} طلاب بنجاح! 🚀`, "success");
          closeModal();
          await this.loadAllData();
          if (window.location.hash.includes("groups") || this.currentTab === "groups") {
            this.renderTab("groups");
          } else {
            this.renderTab("sessions");
          }
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
