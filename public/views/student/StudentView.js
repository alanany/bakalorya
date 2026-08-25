import { apiFetch, state, showToast, t, renderCourseCard, canJoinSession, getMinSessionDateTimeISO, validateSessionScheduledDate, formatSessionDateTime, getTimezoneBadgeHTML } from "../../app.js";

export default class StudentView {
  constructor(container) {
    this.container = container;
    this.sessionFilter = "all";
    this.courseFilter = "all";
    this.rawSessions = [];
    this.enrollments = [];
    this.allCourses = [];
    this.subscriptions = [];
    this.assignments = [];
    this.stats = null;
  }

  async render() {
    this.container.innerHTML = `
      <div style="width:100%; min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; color:var(--text-muted);">
        <div class="spinner" style="width:44px; height:44px; border-width:3px; margin-bottom:16px;"></div>
        <p style="font-weight:700; font-size:1rem;">جاري تحضير مساحتك التعليمية الذكية...</p>
      </div>
    `;

    try {
      const [stats, enrollments, allCourses, sessions, subscriptions, assignments] = await Promise.all([
        apiFetch("/student/stats").catch(() => ({ totalCourses: 0, completedLessonsCount: 0, studyHours: 0 })),
        apiFetch("/student/enrollments").catch(() => []),
        apiFetch("/courses").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/subscriptions/my").catch(() => []),
        apiFetch("/assignments").catch(() => [])
      ]);

      this.stats = stats || { totalCourses: 0, completedLessonsCount: 0, studyHours: 0 };
      this.enrollments = Array.isArray(enrollments) ? enrollments : [];
      this.allCourses = Array.isArray(allCourses) ? allCourses : [];
      this.rawSessions = Array.isArray(sessions) ? sessions : [];
      this.subscriptions = Array.isArray(subscriptions) ? subscriptions : [];
      this.assignments = Array.isArray(assignments) ? assignments : [];

      this.renderDashboard();
    } catch (err) {
      console.error("Dashboard loading error:", err);
      this.container.innerHTML = `
        <div class="glass-card" style="max-width:600px; margin:60px auto; padding:40px; text-align:center;">
          <i data-lucide="alert-circle" style="width:48px; height:48px; color:var(--error); margin-bottom:16px;"></i>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:8px;">تعذر تحميل لوحة التحكم</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">حدث خطأ أثناء استرداد بياناتك، يرجى المحاولة مرة أخرى.</p>
          <button onclick="window.location.reload()" class="btn-primary" style="margin:0 auto; padding:10px 24px; border-radius:30px;">
            <i data-lucide="rotate-cw"></i> إعادة التحميل
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderDashboard() {
    const studentName = state.user?.name || "طالب العلم";
    const studentAvatar = state.user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(studentName)}`;
    
    // Greeting by time of day
    const hour = new Date().getHours();
    let timeGreeting = "مرحباً بك";
    let greetingIcon = "sparkles";
    if (hour >= 5 && hour < 12) {
      timeGreeting = "صباح الهمة والنشاط ☀️";
      greetingIcon = "sun";
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = "طاب يومك بكل خير 🌤️";
      greetingIcon = "sun-medium";
    } else {
      timeGreeting = "مساء التميز والإنجاز 🌙";
      greetingIcon = "moon";
    }

    const todaySessions = this.filterTodaySessions(this.rawSessions);
    const pendingAssignments = this.assignments.filter(a => !a.submission);
    
    // Active / spotlight course (the first in-progress enrolled course)
    const activeEnrollment = this.enrollments.find(e => (e.progress || 0) < 100 && e.status === 'active') || this.enrollments[0];
    
    // Filtered enrolled courses
    let displayEnrollments = this.enrollments;
    if (this.courseFilter === "in-progress") {
      displayEnrollments = this.enrollments.filter(e => (e.progress || 0) < 100);
    } else if (this.courseFilter === "completed") {
      displayEnrollments = this.enrollments.filter(e => (e.progress || 0) >= 100);
    }

    // Recommended courses (published courses that the student hasn't enrolled in yet)
    const enrolledIds = new Set(this.enrollments.map(e => e.course?.id).filter(Boolean));
    const recommendedCourses = this.allCourses.filter(c => !enrolledIds.has(c.id) && (c.status === "PUBLISHED" || !c.status)).slice(0, 3);

    // Private sessions summary
    const totalRemainingCredits = this.subscriptions.reduce((sum, s) => sum + (s.remainingCredits || 0), 0);

    this.container.innerHTML = `
      <div class="student-dashboard-modern" style="width:100%; max-width:1440px; margin:0 auto; padding:24px 20px 80px; box-sizing:border-box;">
        
        <!-- 1. Hero Studio Banner -->
        <div class="glass-card hero-student-banner" style="position:relative; overflow:hidden; border-radius:28px; padding:32px 36px; margin-bottom:28px; background:linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(147,51,234,0.08) 50%, rgba(16,185,129,0.08) 100%); border:1.5px solid var(--border-focus); box-shadow:0 12px 36px rgba(79,70,229,0.08);">
          
          <!-- Decorative Floating Glow Orbs -->
          <div style="position:absolute; top:-30px; left:-30px; width:160px; height:160px; background:radial-gradient(circle, rgba(79,70,229,0.25) 0%, rgba(79,70,229,0) 70%); border-radius:50%; pointer-events:none;"></div>
          <div style="position:absolute; bottom:-40px; right:-20px; width:180px; height:180px; background:radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0) 70%); border-radius:50%; pointer-events:none;"></div>

          <div style="position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:24px;">
            
            <!-- Left Info -->
            <div style="display:flex; align-items:center; gap:20px; flex:1; min-width:280px;">
              <div style="position:relative; flex-shrink:0;">
                <img src="${studentAvatar}" alt="${studentName}" style="width:74px; height:74px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(79,70,229,0.25);">
                <span style="position:absolute; bottom:2px; right:2px; width:16px; height:16px; background:#10b981; border:2px solid var(--bg-card); border-radius:50%;" title="متصل الآن"></span>
              </div>

              <div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                  <span style="font-size:0.85rem; font-weight:800; color:var(--primary); background:var(--primary-glow); padding:3px 12px; border-radius:20px; border:1px solid rgba(79,70,229,0.2); display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="${greetingIcon}" style="width:13px;height:13px;"></i> ${timeGreeting}
                  </span>
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:3px 10px; border-radius:20px;">
                    🎓 حساب طالب رسمي
                  </span>
                </div>

                <h1 style="font-size:clamp(1.4rem, 4vw, 1.9rem); font-weight:900; margin:0 0 6px 0; color:var(--text-main); letter-spacing:-0.5px;">
                  أهلاً بك مجدداً، <span style="background:linear-gradient(135deg, var(--primary), #9333ea); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${studentName}</span> 👋
                </h1>
                
                <p style="color:var(--text-muted); font-size:0.92rem; margin:0; line-height:1.5;">
                  واصل رحلة تفوقك الدراسي واستكشف دروسك وحصصك المباشرة لليوم بكل سهولة.
                </p>
              </div>
            </div>

            <!-- Right Shortcuts & Timezone -->
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:12px;">
              ${getTimezoneBadgeHTML()}
              
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${activeEnrollment?.course ? `
                  <a href="#course/${activeEnrollment.course.id}" class="btn-primary" style="padding:10px 20px; font-weight:800; font-size:0.88rem; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 16px rgba(79,70,229,0.3);">
                    <i data-lucide="play" style="width:16px;height:16px;"></i> متابعة آخر درس ▶
                  </a>
                ` : ''}
                <a href="#student-private-sessions" class="btn-secondary" style="padding:10px 18px; font-weight:700; font-size:0.85rem; border-radius:30px; border-color:var(--primary); color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.6);">
                  <i data-lucide="sparkles" style="width:15px;height:15px;"></i> حصصي الخاصة 🎯
                </a>
              </div>
            </div>

          </div>
        </div>

        <!-- 2. Metrics & Performance Row (Gamified Cards) -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:18px; margin-bottom:32px;">
          
          <!-- Card 1: Enrolled Courses -->
          <div class="glass-card stat-card-hover" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(79,70,229,0.15), rgba(79,70,229,0.05)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="book-open" style="width:26px; height:26px;"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:1.6rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${this.enrollments.length}
              </div>
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                الكورسات المسجلة
              </div>
            </div>
            <span style="font-size:0.72rem; font-weight:800; padding:3px 8px; border-radius:12px; background:var(--primary-glow); color:var(--primary);">
              مساراتك
            </span>
          </div>

          <!-- Card 2: Completed Lessons -->
          <div class="glass-card stat-card-hover" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05)); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="check-circle-2" style="width:26px; height:26px;"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:1.6rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${this.stats.completedLessonsCount || 0}
              </div>
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                الدروس المكتملة
              </div>
            </div>
            <span style="font-size:0.72rem; font-weight:800; padding:3px 8px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981;">
              إنجاز رائع 🏆
            </span>
          </div>

          <!-- Card 3: Study Hours -->
          <div class="glass-card stat-card-hover" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05)); color:#06b6d4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="clock" style="width:26px; height:26px;"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:1.6rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${this.stats.studyHours || 0}<span style="font-size:0.95rem; font-weight:700; color:var(--text-muted); margin-inline-start:4px;">ساعة</span>
              </div>
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                ساعات المذاكرة
              </div>
            </div>
            <span style="font-size:0.72rem; font-weight:800; padding:3px 8px; border-radius:12px; background:rgba(6,182,212,0.12); color:#06b6d4;">
              وقت الاستثمار ⚡
            </span>
          </div>

          <!-- Card 4: Private Sessions Balance -->
          <div class="glass-card stat-card-hover" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05)); color:#a855f7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="sparkles" style="width:26px; height:26px;"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:1.6rem; font-weight:900; color:var(--text-main); line-height:1.1;">
                ${totalRemainingCredits}<span style="font-size:0.95rem; font-weight:700; color:var(--text-muted); margin-inline-start:4px;">حصة</span>
              </div>
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted); margin-top:2px;">
                رصيد الحصص الخاصة
              </div>
            </div>
            <a href="#student-private-sessions" style="font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:12px; background:rgba(168,85,247,0.15); color:#a855f7; text-decoration:none;">
              حجز ↗
            </a>
          </div>

        </div>

        <!-- 3. Spotlight "استكمال المذاكرة فوراً" Card (If student has active course) -->
        ${activeEnrollment?.course ? `
          <div class="glass-card" style="margin-bottom:32px; padding:24px 28px; border-radius:22px; background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.04)); border:1.5px solid var(--border-focus); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
            <div style="display:flex; align-items:center; gap:18px; flex:1; min-width:280px;">
              <div style="position:relative; width:90px; height:68px; border-radius:14px; overflow:hidden; border:1px solid var(--border-color); flex-shrink:0; background:#000;">
                <img src="${activeEnrollment.course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300'}" alt="${activeEnrollment.course.title}" style="width:100%; height:100%; object-fit:cover; opacity:0.85;">
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                  <div style="width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,0.9); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="play" style="width:14px; height:14px; margin-inline-start:2px;"></i>
                  </div>
                </div>
              </div>

              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span style="font-size:0.75rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.1); padding:2px 8px; border-radius:10px;">
                    ${activeEnrollment.course.category || 'دورة تعليمية'}
                  </span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">
                    👨‍🏫 ${activeEnrollment.course.teacher?.name || 'المعلم'}
                  </span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:800; margin:0 0 8px 0; color:var(--text-main);">
                  ${activeEnrollment.course.title}
                </h3>
                <!-- Progress Bar -->
                <div style="display:flex; align-items:center; gap:12px; max-width:400px;">
                  <div style="flex:1; height:8px; background:rgba(0,0,0,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:${activeEnrollment.progress || 0}%; height:100%; background:linear-gradient(90deg, var(--primary), #10b981); border-radius:10px;"></div>
                  </div>
                  <span style="font-size:0.8rem; font-weight:800; color:var(--text-main);">${activeEnrollment.progress || 0}% مكتمل</span>
                </div>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a href="#course/${activeEnrollment.course.id}" class="btn-primary" style="padding:12px 24px; font-size:0.9rem; font-weight:800; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 16px rgba(99,102,241,0.35);">
                <i data-lucide="play-circle" style="width:18px;height:18px;"></i> استكمال المذاكرة فوراً ▶
              </a>
            </div>
          </div>
        ` : ''}

        <!-- 4. Main Two-Column Hub Layout -->
        <div style="display:grid; grid-template-columns: 1fr 360px; gap:28px; align-items:start;" class="dashboard-main-grid-layout">
          
          <!-- Left Column (Main Track) -->
          <div style="display:flex; flex-direction:column; gap:32px;">
            
            <!-- Section: My Enrolled Courses -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                <div>
                  <h2 style="font-size:1.25rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="graduation-cap" style="width:22px; height:22px; color:var(--primary);"></i>
                    مساري ودوراتي التعليمية (${this.enrollments.length})
                  </h2>
                  <p style="color:var(--text-muted); font-size:0.85rem; margin:2px 0 0 0;">الدورات والمناهج المشترك بها مع نسب التقدم لكل مادة</p>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  <button class="filter-pill-btn ${this.courseFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; border:1px solid var(--border-color); background:${this.courseFilter === 'all' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.courseFilter === 'all' ? '#fff' : 'var(--text-muted)'};">
                    الكل (${this.enrollments.length})
                  </button>
                  <button class="filter-pill-btn ${this.courseFilter === 'in-progress' ? 'active' : ''}" data-filter="in-progress" style="padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; border:1px solid var(--border-color); background:${this.courseFilter === 'in-progress' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.courseFilter === 'in-progress' ? '#fff' : 'var(--text-muted)'};">
                    قيد الدراسة
                  </button>
                  <button class="filter-pill-btn ${this.courseFilter === 'completed' ? 'active' : ''}" data-filter="completed" style="padding:6px 14px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; border:1px solid var(--border-color); background:${this.courseFilter === 'completed' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.courseFilter === 'completed' ? '#fff' : 'var(--text-muted)'};">
                    المكتملة
                  </button>
                  <a href="#courses" style="font-size:0.85rem; color:var(--primary); font-weight:700; margin-inline-start:8px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                    دليل الدورات ↗
                  </a>
                </div>
              </div>

              ${displayEnrollments.length === 0 ? `
                <div class="glass-card" style="text-align:center; padding:44px 20px; border-radius:20px; color:var(--text-muted);">
                  <div style="width:56px; height:56px; border-radius:18px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                    <i data-lucide="book-plus" style="width:28px; height:28px;"></i>
                  </div>
                  <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin:0 0 6px;">لا توجد دورات مسجلة في هذا التبويب</h4>
                  <p style="font-size:0.88rem; max-width:400px; margin:0 auto 20px;">استكشف باقة واسعة من أقوى الدورات التعليمية المصممة للمرحلة الدراسية الخاصة بك.</p>
                  <a href="#courses" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; padding:10px 24px; border-radius:30px; text-decoration:none;">
                    <i data-lucide="compass" style="width:16px;height:16px;"></i> استكشف الدورات المتاحة الآن
                  </a>
                </div>
              ` : `
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:18px;">
                  ${displayEnrollments.map(e => this.renderCourseCard(e.course, e.progress, true, e.status)).join('')}
                </div>
              `}
            </div>

            <!-- Section: Pending Assignments & Tasks -->
            ${pendingAssignments.length > 0 ? `
              <div class="glass-card" style="padding:24px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                  <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="clipboard-list" style="width:20px; height:20px; color:#f59e0b;"></i>
                    الواجبات والأنشطة المطلوب تسليمها (${pendingAssignments.length})
                  </h3>
                  <a href="#assignments" style="font-size:0.82rem; font-weight:700; color:var(--primary); text-decoration:none;">
                    عرض كافة الواجبات ↗
                  </a>
                </div>

                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${pendingAssignments.slice(0, 3).map(asg => {
                    const dueDate = asg.dueDate ? new Date(asg.dueDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'غير محدد';
                    return `
                      <div style="padding:14px 18px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <div>
                          <div style="font-weight:800; font-size:0.92rem; color:var(--text-main);">${asg.title}</div>
                          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
                            📚 ${asg.course?.title || 'الدورة'} • ⏰ آخر موعد: <span style="color:#f59e0b; font-weight:700;">${dueDate}</span>
                          </div>
                        </div>
                        <a href="#assignments" class="btn-secondary" style="padding:6px 14px; font-size:0.8rem; font-weight:700; border-radius:20px; border-color:var(--primary); color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="upload-cloud" style="width:13px;height:13px;"></i> تسليم الحل
                        </a>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Section: Recommended Courses for You -->
            ${recommendedCourses.length > 0 ? `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                  <div>
                    <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                      <i data-lucide="sparkles" style="width:20px; height:20px; color:#a855f7;"></i>
                      دورات مقترحة لتعزيز مهاراتك
                    </h3>
                    <p style="color:var(--text-muted); font-size:0.82rem; margin:2px 0 0 0;">اخترنا لك هذه المناهج لمساعدتك على التفوق</p>
                  </div>
                  <a href="#courses" style="font-size:0.82rem; font-weight:700; color:var(--primary); text-decoration:none;">
                    تصفح الكل (${this.allCourses.length}) ↗
                  </a>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:18px;">
                  ${recommendedCourses.map(c => this.renderCourseCard(c, 0, false, null)).join('')}
                </div>
              </div>
            ` : ''}

          </div>

          <!-- Right Column (Sidebar Schedule & Subscriptions) -->
          <div style="display:flex; flex-direction:column; gap:24px;">
            
            <!-- Live & Upcoming Sessions Hub -->
            <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); background:var(--bg-card);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-size:1.1rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                  <i data-lucide="video" style="width:18px; height:18px; color:#10b981;"></i>
                  حصص اليوم المباشرة
                </h3>
                <a href="#schedule" style="font-size:0.8rem; font-weight:700; color:var(--primary); text-decoration:none;">
                  الجدول 📅
                </a>
              </div>

              ${todaySessions.length === 0 ? `
                <div style="text-align:center; padding:28px 14px; background:var(--bg-app); border-radius:16px; border:1px dashed var(--border-color); color:var(--text-muted);">
                  <i data-lucide="calendar-check" style="width:36px; height:36px; opacity:0.35; margin-bottom:8px;"></i>
                  <div style="font-weight:700; font-size:0.88rem; color:var(--text-main); margin-bottom:2px;">لا توجد حصص مباشرة مجدولة اليوم</div>
                  <p style="font-size:0.78rem; margin:0 0 12px 0;">يمكنك مراجعة الدروس المسجلة أو حجز حصة خاصة مع معلمك.</p>
                  <a href="#student-private-sessions" class="btn-secondary" style="font-size:0.78rem; padding:6px 14px; border-radius:20px; border-color:var(--primary); color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="plus"></i> طلب حصة خاصة 🎯
                  </a>
                </div>
              ` : `
                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${todaySessions.map(s => this.renderSessionCard(s)).join('')}
                </div>
              `}
            </div>

            <!-- 1-on-1 Private Sessions & Subscriptions Card -->
            <div class="glass-card" style="padding:22px; border-radius:22px; border:1.5px solid rgba(168,85,247,0.25); background:linear-gradient(135deg, rgba(168,85,247,0.06), rgba(99,102,241,0.03));">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                <div style="width:40px; height:40px; border-radius:12px; background:rgba(168,85,247,0.15); color:#a855f7; display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="sparkles" style="width:20px; height:20px;"></i>
                </div>
                <div>
                  <h4 style="font-size:1rem; font-weight:800; margin:0; color:var(--text-main);">الحصص الخاصة الفردية</h4>
                  <div style="font-size:0.75rem; color:var(--text-muted);">متابعة 1-on-1 مع نخبة الأساتذة</div>
                </div>
              </div>

              ${this.subscriptions.length === 0 ? `
                <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0 0 16px 0;">
                  احصل على جلسات استشارية وشرح مخصص فردي مع أفضل الأساتذة وفق جدولك الخاص.
                </p>
                <a href="#subscription-plans" class="btn-primary" style="width:100%; justify-content:center; text-decoration:none; padding:10px; font-size:0.85rem; font-weight:800; border-radius:12px; background:linear-gradient(135deg,#a855f7,#6366f1); border:none; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> تصفح باقات الحصص الشهرية
                </a>
              ` : `
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">
                  ${this.subscriptions.map(sub => `
                    <div style="padding:12px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color);">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-weight:800; font-size:0.85rem; color:var(--text-main);">${sub.plan?.name || 'اشتراك شهري'}</span>
                        <span style="font-size:0.85rem; font-weight:900; color:#a855f7;">${sub.remainingCredits || 0} متبقية</span>
                      </div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">👨‍🏫 المعلم: ${sub.teacher?.name || 'في انتظار التعيين'}</div>
                    </div>
                  `).join('')}
                </div>
                <a href="#student-private-sessions" class="btn-secondary" style="width:100%; justify-content:center; text-decoration:none; padding:8px; font-size:0.82rem; font-weight:700; border-radius:10px; border-color:#a855f7; color:#a855f7; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="calendar"></i> إدارة الحصص الخاصة ↗
                </a>
              `}
            </div>

            <!-- Quick Study Tips / Motivation Widget -->
            <div class="glass-card" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; color:#f59e0b;">
                <i data-lucide="lightbulb" style="width:20px; height:20px;"></i>
                <h4 style="font-size:0.95rem; font-weight:800; margin:0; color:var(--text-main);">نصيحة اليوم للتفوق</h4>
              </div>
              <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.6; margin:0;">
                💡 <strong>قاعدة الـ 25 دقيقة:</strong> ركز في درس واحد لمدة 25 دقيقة متواصلة بدون أي مشتتات، ثم خذ استراحة 5 دقائق لتثبيت المعلومات بأعلى كفاءة.
              </p>
            </div>

          </div>

        </div>

      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  filterTodaySessions(sessions) {
    const todayStr = new Date().toDateString();
    return (sessions || []).filter(s => {
      if (!s.scheduledAt) return false;
      const d = new Date(s.scheduledAt).toDateString();
      return d === todayStr;
    });
  }

  renderCourseCard(course, progress = 0, showContinue = false, enrollmentStatus = "active") {
    return renderCourseCard(course, {
      progress: progress || 0,
      enrollmentStatus: showContinue ? (enrollmentStatus || "active") : null
    });
  }

  renderSessionCard(session) {
    if (!session) return "";

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const durationMins = session.duration || 60;
    const now = Date.now();
    const diffMs = scheduledTime - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    const isPastSession = diffMins < -durationMins;

    const isLive = session.status === "live" || session.status === "active";
    const isStartingSoon = diffMins <= 30 && !isPastSession;
    const teacherTz = session.teacher?.timezone || "Africa/Cairo";
    const formatted = formatSessionDateTime(session.scheduledAt, null, { secondaryTz: teacherTz });

    return `
      <div class="glass-card" style="padding:14px; display:flex; flex-direction:column; gap:8px; border-radius:16px; border:1px solid ${isLive ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}; background:${isLive ? 'rgba(16,185,129,0.06)' : 'var(--bg-app)'};">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <span style="font-size:0.85rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
            <i data-lucide="video" style="width:14px; height:14px; color:var(--primary);"></i>
            ${session.title || 'حصة تدريبية'}
          </span>
          ${formatted.badgeHTML}
        </div>

        <div style="font-size:0.78rem; color:var(--text-muted); display:flex; flex-direction:column; gap:2px;">
          <div>👨‍🏫 المعلم: <strong style="color:var(--text-main);">${session.teacher?.name || '-'}</strong></div>
          <div>⏰ الموعد: ${formatted.timeStr} ${formatted.secondaryTZHTML}</div>
        </div>

        <div style="margin-top:2px;">
          <a href="#classroom/${session.id}" class="btn-primary" style="width:100%; padding:8px 12px; font-size:0.8rem; font-weight:800; justify-content:center; text-decoration:none; border-radius:10px; background:${isLive || isStartingSoon ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--primary), #4f46e5)'}; gap:6px; border:none; display:flex; align-items:center;">
            <i data-lucide="${isLive ? 'video' : 'door-open'}" style="width:14px; height:14px;"></i> ${isLive ? 'دخول البث المباشر الآن 🔴' : 'دخول قاعة الحصة ⏳'}
          </a>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Course Filter Pills (All / In-Progress / Completed)
    this.container.querySelectorAll(".filter-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");
        this.courseFilter = filter;
        this.renderDashboard();
      });
    });
  }
}

