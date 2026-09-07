import { apiFetch, state, showToast, t, formatSessionDateTime, canJoinSession, getSessionMeetingUrl, confirmDialog, getCleanWhatsAppNumber } from "../../app.js";
import { AssignmentGradingModal } from "./AssignmentGradingModal.js";
import { StudentFeedbackModal } from "./StudentFeedbackModal.js";
import { AssignmentDetailsModal } from "./AssignmentDetailsModal.js";

export default class GroupHubView {
  constructor(container, groupId) {
    this.container = container;
    this.groupId = groupId;
    this.hubData = null;
    this.activeTab = "videos"; // 'videos', 'sessions', 'assignments', 'announcements', 'attendance', 'roster'
    this.sessionFilter = "all"; // 'all', 'upcoming', 'completed'
    this.videoSearchQuery = "";
    this.videoChapterFilter = "all";
    this.resourceSearchQuery = "";
    this.resourceTypeFilter = "all";
    this.loading = true;
  }

  async render() {
    if (!this.groupId) {
      this.container.innerHTML = `
        <div style="text-align:center; padding:90px 24px; font-family:'Cairo', sans-serif;">
          <h2 style="font-size:1.4rem; color:var(--text-main); margin-bottom:12px;">المجموعة غير محددة</h2>
          <p style="color:var(--text-muted); margin-bottom:24px;">لم يتم تمرير معرّف المجموعة الدراسية المطلوب.</p>
          <a href="#student-groups" class="btn-primary">العودة للمجموعات</a>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div style="text-align:center; padding:120px 24px; font-family:'Cairo', sans-serif;">
        <div style="display:inline-block; width:52px; height:52px; border:4px solid var(--border-color); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px;"></div>
        <h3 style="font-size:1.15rem; color:var(--text-main); font-weight:800;">جاري تحميل قاعة المجموعة... 👥</h3>
        <p style="color:var(--text-muted); font-size:0.88rem; margin-top:8px;">نجهز لك الحصص، الواجبات، والتنبيهات الدراسية</p>
      </div>
    `;

    try {
      this.hubData = await apiFetch(`/groups/${this.groupId}/hub`);
      this.loading = false;
      this.renderUI();
    } catch (err) {
      console.error("Error loading group hub:", err);
      this.container.innerHTML = `
        <div style="text-align:center; padding:100px 24px; font-family:'Cairo', sans-serif; max-width:540px; margin:0 auto;">
          <div style="width:72px; height:72px; border-radius:24px; background:rgba(239,68,68,0.1); color:var(--error); display:inline-flex; align-items:center; justify-content:center; margin-bottom:18px;">
            <i data-lucide="alert-circle" style="width:36px; height:36px;"></i>
          </div>
          <h2 style="font-size:1.35rem; font-weight:900; color:var(--text-main); margin-bottom:10px;">تعذر فتح صفحة المجموعة</h2>
          <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin-bottom:24px;">${err.message || 'قد لا تكون مسجلاً في هذه المجموعة أو انتهت صلاحية الجلسة.'}</p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <a href="#student-groups" class="btn-primary" style="text-decoration:none;">مجموعاتي الدراسية</a>
            <a href="#landing" class="btn-secondary" style="text-decoration:none;">الرئيسية</a>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderUI() {
    if (!this.hubData) return;

    const { group, course, teacher, videos = [], sessions = [], assignments = [], resources = [], announcements = [], stats, students = [], isTeacher, isAdmin, isStudent } = this.hubData;
    const now = new Date();

    // Find Live Session or Next Upcoming Session
    let liveSession = null;
    let nextSession = null;

    for (const s of sessions) {
      const sTime = s.scheduledAt ? new Date(s.scheduledAt).getTime() : 0;
      const durM = s.duration || 60;
      const diffM = (sTime - now.getTime()) / 60000;
      const isLive = s.status === 'live' || s.status === 'LIVE' || (diffM <= 0 && diffM > -durM);

      if (isLive && !liveSession) {
        liveSession = s;
      } else if (diffM > 0 && !nextSession) {
        nextSession = s;
      }
    }

    const backUrl = isTeacher ? '#teacher-groups' : '#student-groups';
    const backTitle = isTeacher ? 'لوحة مجموعات المعلم' : 'مجموعاتي الدراسية';
    const courseCoverImg = course?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200';

    this.container.innerHTML = `
      <div class="group-hub-wrapper" style="min-height:100vh; background:var(--bg-app); padding:20px 8px 80px; font-family:'Cairo', sans-serif; box-sizing:border-box;">
        <div style="max-width:1380px; width:100%; margin:0 auto; padding:0 8px; display:flex; flex-direction:column; gap:20px; box-sizing:border-box;">

          <!-- Top Navigation Breadcrumb -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:0.86rem; font-weight:700; color:var(--text-muted);">
              <a href="${backUrl}" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:4px; transition:color 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">
                <i data-lucide="arrow-right" style="width:16px; height:16px;"></i>
                <span>${backTitle}</span>
              </a>
              <span>/</span>
              <span style="color:var(--text-main); font-weight:900;">${group.name}</span>
            </div>
          </div>

          <!-- Hero Classroom Card with Course Header Photo -->
          <div class="glass-card" style="border-radius:24px; border:1px solid var(--border-color); background:var(--bg-card); overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.06);">
            
            <!-- Banner Top with Course Photo Cover -->
            <div style="position:relative; width:100%; min-height:230px; background-image:url('${courseCoverImg}'); background-size:cover; background-position:center; overflow:hidden;">
              <!-- Dark Blur Gradient Overlay for Readability -->
              <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(15,23,42,0.88) 0%, rgba(30,27,75,0.82) 50%, rgba(15,23,42,0.92) 100%); backdrop-filter:blur(3px);"></div>
              
              <div style="position:relative; z-index:2; padding:30px 28px 24px; display:flex; justify-content:space-between; align-items:center; gap:24px; flex-wrap:wrap;">
                
                <div style="display:flex; align-items:center; gap:20px; flex:1; min-width:300px;">
                  <!-- Course Thumbnail Photo -->
                  <div style="width:86px; height:86px; min-width:86px; border-radius:20px; overflow:hidden; border:2px solid rgba(255,255,255,0.3); box-shadow:0 8px 24px rgba(0,0,0,0.35); background:#0f172a;">
                    <img src="${courseCoverImg}" alt="${course?.title || 'صورة الكورس'}" style="width:100%; height:100%; object-fit:cover;">
                  </div>

                  <div>
                    <!-- Subject & Grade & Course Badges -->
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                      ${course?.subject ? `
                        <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:14px; background:rgba(229,29,116,0.3); color:#fbcfe8; border:1px solid rgba(229,29,116,0.4); backdrop-filter:blur(8px);">
                          ${course.subject.name}
                        </span>
                      ` : ''}
                      ${course?.grade ? `
                        <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:14px; background:rgba(16,185,129,0.3); color:#a7f3d0; border:1px solid rgba(16,185,129,0.4); backdrop-filter:blur(8px);">
                          ${course.grade.name}
                        </span>
                      ` : ''}
                      <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:14px; background:rgba(99,102,241,0.3); color:#e0e7ff; border:1px solid rgba(99,102,241,0.4); backdrop-filter:blur(8px);">
                        📚 ${course?.title || 'المقرر التعليمي'}
                      </span>
                    </div>

                    <!-- Group Title -->
                    <h1 style="font-size:clamp(1.4rem, 3.5vw, 2rem); font-weight:900; color:#ffffff; margin:0 0 10px; line-height:1.25; text-shadow:0 2px 10px rgba(0,0,0,0.6);">
                      👥 ${group.name}
                    </h1>

                    <!-- Schedule Text -->
                    <div style="display:inline-flex; align-items:center; gap:8px; color:#e2e8f0; font-size:0.88rem; font-weight:700; background:rgba(0,0,0,0.35); padding:6px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.15); backdrop-filter:blur(8px);">
                      <i data-lucide="calendar" style="width:16px; height:16px; color:#a5b4fc;"></i>
                      <span style="color:#cbd5e1;">مواعيد الحصص:</span>
                      <span style="color:#ffffff; font-weight:800;">${group.scheduleText || `${group.scheduleDays || ''} ${group.scheduleTime || ''}`.trim() || 'مواعيد منتظمة'}</span>
                    </div>
                  </div>
                </div>

                <!-- Teacher Glass Card -->
                <div style="display:flex; align-items:center; gap:14px; background:rgba(255,255,255,0.12); backdrop-filter:blur(14px); padding:12px 18px; border-radius:20px; border:1px solid rgba(255,255,255,0.2); box-shadow:0 8px 24px rgba(0,0,0,0.25);">
                  <img src="${teacher?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}"
                    alt="${teacher?.name || 'المعلم'}"
                    style="width:48px; height:48px; border-radius:14px; object-fit:cover; border:2px solid rgba(255,255,255,0.4); box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                  <div>
                    <div style="font-size:0.75rem; font-weight:700; color:#cbd5e1;">المعلم المشرف:</div>
                    <div style="font-size:0.95rem; font-weight:900; color:#ffffff;">${teacher?.name || 'الأستاذ'}</div>
                    <div style="font-size:0.75rem; color:#a5b4fc; font-weight:800;">محاضر المادة الرسمي ⭐</div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Live Session Alert Bar (If Live or Soon) -->
            ${liveSession ? `
              <div style="padding:18px 24px; background:linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(5,150,105,0.08) 100%); border-bottom:1px solid rgba(16,185,129,0.25); display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#10b981; box-shadow:0 0 0 4px rgba(16,185,129,0.3); animation:pulse 1.5s infinite;"></span>
                  <div>
                    <div style="font-size:0.95rem; font-weight:900; color:#065f46;">الحصة جارية الآن في قاعة البث المباشر! 🔴</div>
                    <div style="font-size:0.82rem; color:#047857; font-weight:700;">${liveSession.title} • بدأت الآن، تفضل بالانضمام وتسجيل حضورك</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <button class="btn-primary join-live-btn" data-url="${liveSession.meetingLink || group.meetingLink || ''}"
                    style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:14px; font-weight:900; font-size:0.88rem; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">
                    <i data-lucide="video" style="width:16px; height:16px;"></i>
                    <span>انضم للحصة الآن (Google Meet)</span>
                  </button>
                  <button class="session-checkin-action-btn" data-id="${liveSession.id}"
                    style="padding:10px 16px; border-radius:14px; font-weight:800; font-size:0.84rem; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); cursor:pointer;">
                    تأكيد الحضور ✍️
                  </button>
                </div>
              </div>
            ` : nextSession ? `
              <div style="padding:14px 24px; background:rgba(99,102,241,0.05); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:10px; font-size:0.88rem; font-weight:700; color:var(--text-main);">
                  <i data-lucide="clock" style="width:16px; height:16px; color:var(--primary);"></i>
                  <span>الحصة القادمة:</span>
                  <span style="font-weight:900; color:var(--primary);">${nextSession.title}</span>
                  <span style="color:var(--text-muted); font-size:0.82rem;">• ${formatSessionDateTime(nextSession.scheduledAt).dateStr} الساعة ${formatSessionDateTime(nextSession.scheduledAt).timeStr}</span>
                </div>
                <div style="font-size:0.82rem; font-weight:800; color:var(--primary); padding:4px 12px; border-radius:10px; background:rgba(99,102,241,0.1);">
                  ⏳ يُفتح البث المباشر قبل الموعد بـ 30 دقيقة
                </div>
              </div>
            ` : ''}

            <!-- Sub-Navigation Tabs Bar -->
            <div style="display:flex; gap:6px; padding:8px 16px; background:var(--bg-app); border-bottom:1px solid var(--border-color); overflow-x:auto;">
              ${this.renderTabButton("videos", "🎥 فيديوهات وشروحات المعلم", videos.length)}
              ${this.renderTabButton("sessions", "📅 جدول وحصص المجموعة", sessions.length)}
              ${this.renderTabButton("assignments", "📝 الواجبات والمهام", assignments.length)}
              ${this.renderTabButton("resources", "📁 ملفات ومذكرات المجموعة", resources.length)}
              ${this.renderTabButton("announcements", "📢 حائط الإعلانات", announcements.length)}
              ${this.renderTabButton("attendance", "📊 سجل الحضور والتقييم")}
              ${this.renderTabButton("roster", "👥 أعضاء المجموعة", students.length)}
            </div>

          </div>

          <!-- Active Tab Content Area -->
          <div id="group-tab-container">
            ${this.renderActiveTabContent()}
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
  }

  renderTabButton(tabKey, label, badgeCount) {
    const isActive = this.activeTab === tabKey;
    return `
      <button class="tab-btn ${isActive ? 'active' : ''}" data-tab="${tabKey}"
        style="padding:10px 18px; border-radius:12px; border:none; font-family:'Cairo', sans-serif; font-size:0.88rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:8px; white-space:nowrap; transition:all 0.2s;
        background:${isActive ? 'var(--primary)' : 'transparent'}; color:${isActive ? '#fff' : 'var(--text-muted)'};">
        <span>${label}</span>
        ${badgeCount !== undefined ? `
          <span style="padding:2px 7px; border-radius:8px; font-size:0.72rem; font-weight:900; background:${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'}; color:${isActive ? '#fff' : 'var(--text-muted)'};">
            ${badgeCount}
          </span>
        ` : ''}
      </button>
    `;
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case "videos":
        return this.renderVideosTab();
      case "assignments":
        return this.renderAssignmentsTab();
      case "resources":
        return this.renderResourcesTab();
      case "announcements":
        return this.renderAnnouncementsTab();
      case "attendance":
        return this.renderAttendanceTab();
      case "roster":
        return this.renderRosterTab();
      case "sessions":
      default:
        return this.renderSessionsTab();
    }
  }

  // ── Tab 0: Videos (Sorted Newer First) ─────────────────────────────────
  renderVideosTab() {
    const { videos = [], isTeacher, isAdmin } = this.hubData;
    const canManageVideos = isTeacher || isAdmin;

    // Ensure sorted newer first
    const sortedVideos = [...(videos || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Extract all chapters / units
    const chapters = Array.from(new Set(sortedVideos.map(v => v.chapter || "عام").filter(Boolean)));

    // Apply client filters
    const filteredVideos = sortedVideos.filter(v => {
      const q = (this.videoSearchQuery || '').toLowerCase().trim();
      const matchesQuery = !q || (v.title || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q);
      const matchesChapter = !this.videoChapterFilter || this.videoChapterFilter === 'all' || (v.chapter || 'عام') === this.videoChapterFilter;
      return matchesQuery && matchesChapter;
    });

    const getYouTubeId = (url) => {
      if (!url) return null;
      const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return m ? m[1] : null;
    };

    const formatRelativeDate = (dateVal) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'اليوم ⚡';
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    };

    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Header: Title & Upload Button for Teacher -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
          <div>
            <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="video" style="width:20px; height:20px; color:#ef4444;"></i>
              <span>فيديوهات وشروحات المعلم 🎥</span>
            </h3>
            <p style="color:var(--text-muted); font-size:0.84rem; margin:4px 0 0;">
              الشروحات المسجلة والمراجعات وحلول الأسئلة الخاصة بهذه المجموعة (مرتبة من الأحدث للأقدم)
            </p>
          </div>

          ${canManageVideos ? `
            <button id="open-upload-video-modal-btn" class="btn-primary"
              style="display:inline-flex; align-items:center; gap:6px; padding:10px 20px; border-radius:14px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; background:linear-gradient(135deg, #ef4444, #dc2626); color:#fff; box-shadow:0 4px 15px rgba(239,68,68,0.3); transition:transform 0.15s;"
              onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
              <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
              <span>إضافة / رفع فيديو جديد 🎥</span>
            </button>
          ` : ''}
        </div>

        <!-- Search & Filter Controls -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; background:var(--bg-card); padding:12px 16px; border-radius:16px; border:1px solid var(--border-color);">
          
          <!-- Search Input -->
          <div style="position:relative; flex:1; min-width:240px; max-width:400px;">
            <input type="text" id="video-search-input" class="form-input" value="${this.videoSearchQuery || ''}" placeholder="ابحث في الفيديوهات والشروحات..."
              style="width:100%; padding:8px 14px 8px 36px; border-radius:12px; font-size:0.85rem; box-sizing:border-box;">
            <i data-lucide="search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:15px; height:15px; color:var(--text-muted); pointer-events:none;"></i>
          </div>

          <!-- Unit / Chapter Filter -->
          ${chapters.length > 0 ? `
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.78rem; font-weight:800; color:var(--text-muted);">الوحدة:</span>
              <select id="video-chapter-filter" class="form-input" style="padding:7px 12px; border-radius:12px; font-size:0.82rem; font-weight:700;">
                <option value="all" ${this.videoChapterFilter === 'all' ? 'selected' : ''}>جميع الوحدات (${sortedVideos.length})</option>
                ${chapters.map(ch => `
                  <option value="${ch}" ${this.videoChapterFilter === ch ? 'selected' : ''}>${ch}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <!-- Count Badge -->
          <div style="font-size:0.8rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.08); padding:6px 12px; border-radius:12px;">
            ${filteredVideos.length} فيديو
          </div>
        </div>

        <!-- Videos Grid -->
        ${filteredVideos.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:60px 24px; border-radius:24px; color:var(--text-muted); border:1px dashed var(--border-color);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(239,68,68,0.08); color:#ef4444; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
              <i data-lucide="video-off" style="width:32px; height:32px;"></i>
            </div>
            <h4 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0 0 8px 0;">
              ${this.videoSearchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد فيديوهات مسجلة بعد'}
            </h4>
            <p style="font-size:0.88rem; max-width:400px; margin:0 auto 20px; line-height:1.6;">
              ${this.videoSearchQuery ? 'جرب البحث بكلمات أخرى أو اختر جميع الوحدات.' : 'سيقوم المعلم برفع الشروحات وحصص المراجعة المسجلة هنا تباعاً لطلاب المجموعة.'}
            </p>
            ${canManageVideos && !this.videoSearchQuery ? `
              <button id="open-upload-first-video-btn" class="btn-primary" style="padding:10px 22px; border-radius:14px; font-weight:800; font-size:0.88rem; background:linear-gradient(135deg, #ef4444, #dc2626); border:none; cursor:pointer;">
                رفع أول فيديو الآن 📤
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
            ${filteredVideos.map((v, idx) => {
              const ytId = getYouTubeId(v.videoUrl);
              const thumbUrl = ytId
                ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                : (v.photo || this.hubData.course?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600');
              const relDate = formatRelativeDate(v.createdAt);

              return `
                <div class="glass-card video-card-item" style="border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s; box-shadow:0 4px 16px rgba(0,0,0,0.04);"
                  onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.08)'"
                  onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.04)'">

                  <!-- Thumbnail with Overlay Play & Badges -->
                  <div class="watch-video-trigger" data-id="${v.id}" style="position:relative; aspect-ratio:16/9; background:#0f172a; overflow:hidden; cursor:pointer;">
                    <img src="${thumbUrl}" alt="${v.title}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s;"
                      onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">
                    
                    <!-- Dark Gradient Overlay -->
                    <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%);"></div>

                    <!-- Center Play Button Overlay -->
                    <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                      <div style="width:52px; height:52px; border-radius:50%; background:rgba(239,68,68,0.9); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 20px rgba(239,68,68,0.4); transition:transform 0.2s;"
                        onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'">
                        <i data-lucide="play" style="width:24px; height:24px; margin-inline-start:3px;"></i>
                      </div>
                    </div>

                    <!-- Top Date Badge (Newer First visual indicator) -->
                    ${relDate ? `
                      <span style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); color:#fff; font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.2);">
                        📅 ${relDate}
                      </span>
                    ` : ''}

                    <!-- Duration Badge -->
                    ${v.duration ? `
                      <span style="position:absolute; bottom:12px; left:12px; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px); color:#fff; font-size:0.74rem; font-weight:800; padding:3px 9px; border-radius:8px;">
                        ⏱️ ${v.duration}
                      </span>
                    ` : ''}
                  </div>

                  <!-- Video Meta Content -->
                  <div style="padding:16px 18px; flex:1; display:flex; flex-direction:column; gap:10px;">
                    
                    <!-- Chapter & Order Badge -->
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                      <span style="font-size:0.72rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.08); padding:3px 10px; border-radius:10px; border:1px solid rgba(99,102,241,0.18);">
                        📁 ${v.chapter || 'فيديو شرح'}
                      </span>
                      <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">
                        فيديو #${sortedVideos.length - idx}
                      </span>
                    </div>

                    <!-- Video Title -->
                    <h4 class="watch-video-trigger" data-id="${v.id}" style="font-size:0.98rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.4; cursor:pointer; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${v.title}">
                      ${v.title}
                    </h4>

                    <!-- Video Description Snippet -->
                    ${v.description ? `
                      <p style="font-size:0.82rem; color:var(--text-muted); margin:0; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${v.description}
                      </p>
                    ` : ''}

                    <!-- Action Bar -->
                    <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:8px;">
                      <button class="watch-video-trigger btn-primary" data-id="${v.id}"
                        style="background:linear-gradient(135deg, #ef4444, #dc2626); border:none; padding:8px 16px; border-radius:12px; font-size:0.8rem; font-weight:800; color:#fff; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 3px 10px rgba(239,68,68,0.25);">
                        <i data-lucide="play-circle" style="width:14px; height:14px;"></i>
                        <span>مشاهدة 🎬</span>
                      </button>

                      <div style="display:flex; align-items:center; gap:6px;">
                        ${v.resourceUrl ? `
                          <a href="${v.resourceUrl}" target="_blank" rel="noopener" class="btn-secondary"
                            style="padding:7px 12px; border-radius:10px; font-size:0.75rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="تحميل المذكرة المرفقة">
                            <i data-lucide="paperclip" style="width:13px; height:13px;"></i>
                            <span>المذكرة 📎</span>
                          </a>
                        ` : ''}

                        ${canManageVideos ? `
                          <button class="delete-video-btn btn-secondary" data-id="${v.id}"
                            style="padding:7px 10px; border-radius:10px; color:var(--error); border-color:rgba(239,68,68,0.25); background:rgba(239,68,68,0.06); cursor:pointer;" title="حذف هذا الفيديو">
                            <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                          </button>
                        ` : ''}
                      </div>
                    </div>

                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;
  }

  // ── Tab 1: Sessions & Live Classes ──────────────────────────────────────
  renderSessionsTab() {
    const { sessions = [], group, isTeacher, isAdmin } = this.hubData;
    const now = new Date();

    const filteredSessions = sessions.filter(s => {
      const sDate = s.scheduledAt ? new Date(s.scheduledAt) : null;
      const isPast = sDate && (sDate.getTime() + (s.duration || 60) * 60000) < now.getTime();
      if (this.sessionFilter === "upcoming") return !isPast;
      if (this.sessionFilter === "completed") return isPast;
      return true;
    });

    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <!-- Filter Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="session-filter-pill ${this.sessionFilter === 'all' ? 'active' : ''}" data-filter="all"
              style="padding:6px 14px; border-radius:10px; font-size:0.82rem; font-weight:800; border:1px solid var(--border-color); cursor:pointer; background:${this.sessionFilter === 'all' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.sessionFilter === 'all' ? '#fff' : 'var(--text-main)'};">
              الكل (${sessions.length})
            </button>
            <button class="session-filter-pill ${this.sessionFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming"
              style="padding:6px 14px; border-radius:10px; font-size:0.82rem; font-weight:800; border:1px solid var(--border-color); cursor:pointer; background:${this.sessionFilter === 'upcoming' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.sessionFilter === 'upcoming' ? '#fff' : 'var(--text-main)'};">
              القادمة ⏳
            </button>
            <button class="session-filter-pill ${this.sessionFilter === 'completed' ? 'active' : ''}" data-filter="completed"
              style="padding:6px 14px; border-radius:10px; font-size:0.82rem; font-weight:800; border:1px solid var(--border-color); cursor:pointer; background:${this.sessionFilter === 'completed' ? 'var(--primary)' : 'var(--bg-card)'}; color:${this.sessionFilter === 'completed' ? '#fff' : 'var(--text-main)'};">
              المكتملة ✅
            </button>
          </div>

          <div style="font-size:0.82rem; color:var(--text-muted); font-weight:700;">
            إجمالي الحصص المجدولة: <span style="font-weight:900; color:var(--text-main);">${sessions.length} حصة</span>
          </div>
        </div>

        <!-- Sessions Grid / List -->
        ${filteredSessions.length === 0 ? `
          <div class="glass-card" style="padding:60px 24px; text-align:center; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
            <i data-lucide="calendar-x" style="width:40px; height:40px; color:var(--text-muted); margin-bottom:12px;"></i>
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">لا توجد حصص في هذا التصنيف</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">تابع إعلانات المعلم لمعرفة المواعيد الجديدة.</p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${filteredSessions.map((s, idx) => {
      const sTime = s.scheduledAt ? new Date(s.scheduledAt).getTime() : 0;
      const durM = s.duration || 60;
      const diffM = (sTime - now.getTime()) / 60000;
      const isPast = diffM < -durM || s.status === 'COMPLETED';
      const isLive = s.status === 'live' || s.status === 'LIVE' || (diffM <= 0 && diffM > -durM);
      const isSoon = diffM > 0 && diffM <= 30;
      const fmt = formatSessionDateTime(s.scheduledAt);

      let badgeBg = isLive || isSoon ? 'rgba(16,185,129,0.12)' : isPast ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)';
      let badgeColor = isLive || isSoon ? '#10b981' : isPast ? '#16a34a' : 'var(--primary)';
      let badgeText = isLive ? '🔴 مباشر الآن' : isSoon ? '⚡ تبدأ قريباً' : isPast ? '✅ مكتملة' : '⏳ قادمة';

      return `
                <div class="glass-card" style="padding:16px 20px; border-radius:18px; border:1px solid ${isLive ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; ${isLive ? 'box-shadow:0 0 20px rgba(16,185,129,0.15);' : ''}">
                  
                  <div style="display:flex; align-items:center; gap:16px; min-width:240px; flex:1;">
                    <!-- Session Number Circle -->
                    <div style="width:44px; height:44px; border-radius:14px; background:${badgeBg}; color:${badgeColor}; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.95rem; flex-shrink:0;">
                      #${idx + 1}
                    </div>

                    <div>
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <h4 style="font-size:0.98rem; font-weight:900; color:var(--text-main); margin:0;">
                          ${s.title}
                        </h4>
                        <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:10px; background:${badgeBg}; color:${badgeColor};">
                          ${badgeText}
                        </span>
                        ${s.myAttendance ? `
                          <span style="font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:10px; background:${s.myAttendance === 'PRESENT' || s.myAttendance === 'LATE' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color:${s.myAttendance === 'PRESENT' || s.myAttendance === 'LATE' ? '#10b981' : '#ef4444'};">
                            ${s.myAttendance === 'PRESENT' ? 'حاضر ✅' : s.myAttendance === 'LATE' ? 'متأخر ⏱️' : 'غائب ❌'}
                          </span>
                        ` : ''}
                      </div>

                      <div style="display:flex; align-items:center; gap:12px; font-size:0.8rem; color:var(--text-muted); font-weight:700;">
                        <span>📅 ${fmt.dateStr}</span>
                        <span>🕐 ${fmt.timeStr}</span>
                        <span>⏱️ ${durM} دقيقة</span>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                    ${(isLive || isSoon) ? `
                      <button class="join-live-btn" data-url="${s.meetingLink || group.meetingLink || ''}"
                        style="padding:8px 16px; border-radius:12px; font-weight:800; font-size:0.82rem; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="video" style="width:14px; height:14px;"></i>
                        <span>دخول البث 🎥</span>
                      </button>
                      <button class="session-checkin-action-btn" data-id="${s.id}"
                        style="padding:8px 12px; border-radius:12px; font-weight:800; font-size:0.78rem; background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); cursor:pointer;">
                        تأكيد الحضور ✍️
                      </button>
                    ` : isPast ? `
                      <button class="view-session-notes-btn" data-idx="${idx}"
                        style="padding:8px 14px; border-radius:12px; font-weight:800; font-size:0.8rem; background:var(--bg-app); color:var(--text-main); border:1px solid var(--border-color); cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="file-text" style="width:14px; height:14px;"></i>
                        <span>${(isTeacher || isAdmin) && !s.whatWasCovered && !s.topic ? 'كتابة ملخص الحصة ✍️' : 'ملخص الحصة'}</span>
                      </button>
                    ` : `
                      <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">
                        لم يحن الموعد بعد ⏳
                      </span>
                    `}
                  </div>

                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ── Tab 2: Group Assignments ──────────────────────────────────────────
  renderAssignmentsTab() {
    const { assignments = [], isTeacher, isAdmin } = this.hubData;

    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <!-- Header & Add Button for Teacher -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0;">مهام وواجبات المجموعة 📝</h3>
            <p style="color:var(--text-muted); font-size:0.82rem; margin:4px 0 0;">واجبات أسبوعية وتدريبات لرفع كفاءة ومستوى طلاب المجموعة</p>
          </div>

          ${(isTeacher || isAdmin) ? `
            <button id="open-add-assignment-modal-btn" class="btn-primary"
              style="display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:12px; font-weight:800; font-size:0.85rem; border:none; cursor:pointer;">
              <i data-lucide="plus" style="width:16px; height:16px;"></i>
              <span>إضافة واجب جديد للمجموعة</span>
            </button>
          ` : ''}
        </div>

        <!-- Assignments List -->
        ${assignments.length === 0 ? `
          <div class="glass-card" style="padding:60px 24px; text-align:center; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
            <i data-lucide="check-circle" style="width:40px; height:40px; color:#10b981; margin-bottom:12px;"></i>
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">لا توجد واجبات مطلوبة حالياً 🎉</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">أنت متفرغ الآن! سيقوم المعلم برفع واجب جديد بعد الحصة القادمة.</p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
            ${assignments.map(asgn => {
      const due = asgn.dueDate ? new Date(asgn.dueDate) : null;
      const isExpired = due && due.getTime() < Date.now();
      const sub = asgn.mySubmission;

      return `
                <div class="glass-card" style="padding:20px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; flex-direction:column; gap:12px;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <h4 style="font-size:1.02rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.4;">
                      ${asgn.title}
                    </h4>
                    ${sub ? `
                      <span style="font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:10px; background:rgba(16,185,129,0.12); color:#10b981; white-space:nowrap;">
                        تم التسليم ✅
                      </span>
                    ` : isExpired ? `
                      <span style="font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:10px; background:rgba(239,68,68,0.12); color:#ef4444; white-space:nowrap;">
                        انتهى الموعد ⚠️
                      </span>
                    ` : `
                      <span style="font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:10px; background:rgba(99,102,241,0.1); color:var(--primary); white-space:nowrap;">
                        مطلوب التسليم ⏳
                      </span>
                    `}
                  </div>

                  ${asgn.description ? `
                    <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin:0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
                      ${asgn.description}
                    </p>
                  ` : ''}

                  <!-- Due Date Pill -->
                  <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--text-muted); font-weight:700; background:var(--bg-app); padding:8px 12px; border-radius:10px; border:1px solid var(--border-color);">
                    <i data-lucide="clock" style="width:14px; height:14px; color:${isExpired ? '#ef4444' : 'var(--primary)'};"></i>
                    <span>آخر موعد:</span>
                    <span style="font-weight:800; color:${isExpired ? '#ef4444' : 'var(--text-main)'};">
                      ${due ? due.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'غير محدد'}
                    </span>
                  </div>

                  <!-- Submission Info or Action -->
                  <div style="margin-top:auto; padding-top:12px; border-top:1px dashed var(--border-color); display:flex; flex-direction:column; gap:8px;">
                    ${sub ? `
                      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div>
                          ${sub.status === 'graded' ? `
                            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                              <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:900; font-size:0.75rem; padding:3px 8px; border-radius:8px; border:1px solid rgba(16,185,129,0.3);">
                                تم التصحيح والاعتماد 🏆
                              </span>
                              <span style="font-size:0.88rem; font-weight:900; color:var(--text-main);">
                                <strong style="color:#10b981;">${sub.grade !== null ? sub.grade : 0}</strong> / ${asgn.totalPoints || 100} (${sub.percentage !== null && sub.percentage !== undefined ? sub.percentage : (asgn.totalPoints ? Math.round(((sub.grade || 0)/asgn.totalPoints)*100) : 0)}%)
                              </span>
                            </div>
                            ${sub.overallFeedback ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px; max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">💬 ${sub.overallFeedback}</div>` : ''}
                          ` : `
                            <span class="badge" style="background:rgba(245,158,11,0.12); color:#f59e0b; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:8px;">
                              تم تسليم الحل • قيد المراجعة والتصحيح ⏳
                            </span>
                          `}
                        </div>
                        ${sub.status === 'graded' ? `
                          <button class="btn-primary view-student-feedback-btn" data-id="${asgn.id}"
                            style="padding:6px 14px; border-radius:10px; font-weight:800; font-size:0.8rem; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                            <i data-lucide="file-check-2" style="width:14px; height:14px;"></i>
                            <span>مراجعة تقرير التصحيح 📋</span>
                          </button>
                        ` : ''}
                      </div>
                    ` : (isTeacher || isAdmin) ? `
                      <div style="display:flex; flex-direction:column; gap:10px;">
                        <!-- Submission & Correction Statistics (إحصائيات التسليم والتصحيح) -->
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; background:var(--bg-app); padding:8px 12px; border-radius:12px; border:1px solid var(--border-color);">
                          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <!-- Count Sent (المسلّمون / تم الإرسال) -->
                            <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; font-size:0.78rem; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:5px; border:1px solid rgba(99,102,241,0.25);">
                              <i data-lucide="send" style="width:13px; height:13px;"></i>
                              <span>تم الإرسال (المستلم): <strong style="font-weight:900;">${asgn.submissionsCount || 0}</strong></span>
                            </span>

                            <!-- Count Corrected (المصحح) -->
                            <span class="badge" style="background:${(asgn.gradedCount || 0) > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.1)'}; color:${(asgn.gradedCount || 0) > 0 ? '#10b981' : 'var(--text-muted)'}; font-weight:800; font-size:0.78rem; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:5px; border:1px solid ${(asgn.gradedCount || 0) > 0 ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'};">
                              <i data-lucide="check-check" style="width:13px; height:13px;"></i>
                              <span>تم التصحيح: <strong style="font-weight:900;">${asgn.gradedCount || 0}</strong></span>
                            </span>
                          </div>

                          ${(asgn.submissionsCount || 0) > (asgn.gradedCount || 0) ? `
                            <span class="badge" style="background:rgba(245,158,11,0.12); color:#f59e0b; font-weight:800; font-size:0.74rem; padding:3px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.3);">
                              بانتظار التصحيح: ${(asgn.submissionsCount || 0) - (asgn.gradedCount || 0)} ⏳
                            </span>
                          ` : (asgn.submissionsCount || 0) > 0 ? `
                            <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.74rem; padding:3px 8px; border-radius:6px;">
                              تم تصحيح الكل 🏆
                            </span>
                          ` : `
                            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">لا توجد تسليمات بعد</span>
                          `}
                        </div>

                        <!-- Action Buttons -->
                        <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px;">
                          <button class="btn-secondary open-assignment-details-btn" data-id="${asgn.id}"
                            style="padding:6px 12px; border-radius:10px; font-weight:800; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="عرض تفاصيل وأسئلة الواجب وتعديلها أو حذفها">
                            <i data-lucide="info" style="width:14px; height:14px;"></i>
                            <span>التفاصيل والأسئلة 📋</span>
                          </button>

                          <button class="btn-primary open-teacher-grading-btn" data-id="${asgn.id}" data-title="${asgn.title}" data-total="${asgn.totalPoints || 100}"
                            style="padding:6px 14px; border-radius:10px; font-weight:800; font-size:0.8rem; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
                            <i data-lucide="check-square" style="width:14px; height:14px;"></i>
                            <span>التصحيح ورصد الدرجات 🎯</span>
                          </button>
                        </div>
                      </div>
                    ` : `
                      <button class="btn-primary submit-assignment-btn" data-id="${asgn.id}" data-title="${asgn.title}"
                        style="width:100%; padding:9px; border-radius:12px; font-weight:800; font-size:0.84rem; border:none; cursor:pointer;">
                        تسليم حل الواجب 📤
                      </button>
                    `}
                  </div>

                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ── Tab: Group Files & Resources (ملفات ومذكرات المجموعة) ─────────────────
  renderResourcesTab() {
    const { resources = [], isTeacher, isAdmin } = this.hubData;
    const canManage = isTeacher || isAdmin;

    const filteredResources = resources.filter(res => {
      const q = (this.resourceSearchQuery || "").toLowerCase().trim();
      const matchesQuery = !q || (res.title || "").toLowerCase().includes(q) || (res.description || "").toLowerCase().includes(q) || (res.fileName || "").toLowerCase().includes(q);
      
      let matchesType = true;
      if (this.resourceTypeFilter && this.resourceTypeFilter !== "all") {
        if (this.resourceTypeFilter === "image") {
          matchesType = res.fileType === "image";
        } else if (this.resourceTypeFilter === "pdf") {
          matchesType = res.fileType === "pdf";
        } else if (this.resourceTypeFilter === "document") {
          matchesType = res.fileType === "document" || res.fileType === "other";
        }
      }
      return matchesQuery && matchesType;
    });

    const imageCount = resources.filter(r => r.fileType === "image").length;
    const pdfCount = resources.filter(r => r.fileType === "pdf").length;
    const docCount = resources.filter(r => r.fileType === "document" || r.fileType === "other").length;

    const formatDate = (dateVal) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Header & Top Action Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
          <div>
            <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
              <i data-lucide="folder" style="width:22px; height:22px; color:var(--primary);"></i>
              <span>ملفات ومذكرات ومصادر المجموعة 📁</span>
            </h3>
            <p style="color:var(--text-muted); font-size:0.84rem; margin:4px 0 0;">
              المذكرات والملخصات (PDF)، أوراق العمل والواجبات الإضافية، والصور والخرائط الذهنية المرفوعة للطلاب.
            </p>
          </div>

          ${canManage ? `
            <button id="open-upload-resource-modal-btn" class="btn-primary"
              style="display:inline-flex; align-items:center; gap:8px; padding:10px 22px; border-radius:14px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; background:linear-gradient(135deg, var(--primary), #4f46e5); color:#fff; box-shadow:0 4px 15px rgba(99,102,241,0.3); transition:transform 0.15s;"
              onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
              <i data-lucide="upload-cloud" style="width:18px; height:18px;"></i>
              <span>رفع ملف أو صورة جديدة 📤</span>
            </button>
          ` : ''}
        </div>

        <!-- Filter & Search Controls Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; background:var(--bg-card); padding:14px 18px; border-radius:18px; border:1px solid var(--border-color);">
          
          <!-- Search Input -->
          <div style="position:relative; flex:1; min-width:240px; max-width:420px;">
            <input type="text" id="resource-search-input" class="form-input" value="${this.resourceSearchQuery || ''}" placeholder="ابحث في أسماء الملفات والمذكرات..."
              style="width:100%; padding:9px 14px 9px 38px; border-radius:12px; font-size:0.85rem; box-sizing:border-box; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main);">
            <i data-lucide="search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);"></i>
          </div>

          <!-- Type Filter Pills -->
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="resource-type-filter-btn ${(!this.resourceTypeFilter || this.resourceTypeFilter === 'all') ? 'active' : ''}" data-type="all"
              style="padding:6px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.8rem; font-weight:800; cursor:pointer; font-family:'Cairo', sans-serif;
              background:${(!this.resourceTypeFilter || this.resourceTypeFilter === 'all') ? 'var(--primary)' : 'var(--bg-app)'};
              color:${(!this.resourceTypeFilter || this.resourceTypeFilter === 'all') ? '#fff' : 'var(--text-muted)'}; transition:all 0.15s;">
              الكل (${resources.length})
            </button>

            <button class="resource-type-filter-btn ${this.resourceTypeFilter === 'image' ? 'active' : ''}" data-type="image"
              style="padding:6px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.8rem; font-weight:800; cursor:pointer; font-family:'Cairo', sans-serif;
              background:${this.resourceTypeFilter === 'image' ? 'var(--primary)' : 'var(--bg-app)'};
              color:${this.resourceTypeFilter === 'image' ? '#fff' : 'var(--text-muted)'}; transition:all 0.15s;">
              🖼️ صور ورسومات (${imageCount})
            </button>

            <button class="resource-type-filter-btn ${this.resourceTypeFilter === 'pdf' ? 'active' : ''}" data-type="pdf"
              style="padding:6px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.8rem; font-weight:800; cursor:pointer; font-family:'Cairo', sans-serif;
              background:${this.resourceTypeFilter === 'pdf' ? 'var(--primary)' : 'var(--bg-app)'};
              color:${this.resourceTypeFilter === 'pdf' ? '#fff' : 'var(--text-muted)'}; transition:all 0.15s;">
              📕 مذكرات PDF (${pdfCount})
            </button>

            <button class="resource-type-filter-btn ${this.resourceTypeFilter === 'document' ? 'active' : ''}" data-type="document"
              style="padding:6px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:0.8rem; font-weight:800; cursor:pointer; font-family:'Cairo', sans-serif;
              background:${this.resourceTypeFilter === 'document' ? 'var(--primary)' : 'var(--bg-app)'};
              color:${this.resourceTypeFilter === 'document' ? '#fff' : 'var(--text-muted)'}; transition:all 0.15s;">
              📑 مستندات أخرى (${docCount})
            </button>
          </div>

        </div>

        <!-- Resources Cards Grid -->
        ${filteredResources.length === 0 ? `
          <div class="glass-card" style="padding:60px 24px; text-align:center; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="width:64px; height:64px; border-radius:20px; background:rgba(99,102,241,0.1); color:var(--primary); display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
              <i data-lucide="folder-open" style="width:32px; height:32px;"></i>
            </div>
            <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin-bottom:6px;">
              ${resources.length === 0 ? 'لا توجد ملفات أو مذكرات مرفوعة حتى الآن' : 'لا توجد نتائج تطابق بحثك'}
            </h3>
            <p style="color:var(--text-muted); font-size:0.85rem; max-width:440px; margin:0 auto 18px;">
              ${resources.length === 0 ? 'يقوم المعلم برفع المذكرات وأوراق العمل والصور التوضيحية هنا لتتمكن من تحميلها وتصفحها في أي وقت.' : 'جرب تغيير كلمة البحث أو الفلتر المختار أعلاه.'}
            </p>
            ${canManage && resources.length === 0 ? `
              <button id="open-upload-first-resource-btn" class="btn-primary" style="padding:9px 22px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer;">
                رفع أول ملف للمجموعة 📤
              </button>
            ` : ''}
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(290px, 1fr)); gap:18px;">
            ${filteredResources.map(res => {
              const isImage = res.fileType === 'image';
              const isPdf = res.fileType === 'pdf';
              const cleanFileName = res.fileName || (res.fileUrl ? res.fileUrl.split('/').pop() : 'ملف_مرفق');

              return `
                <div class="glass-card" style="border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s;"
                  onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 30px rgba(0,0,0,0.08)'"
                  onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                  
                  <!-- Card Top Preview Banner -->
                  ${isImage ? `
                    <div class="resource-img-preview-trigger" data-id="${res.id}" style="cursor:pointer; position:relative; width:100%; height:180px; overflow:hidden; background:#0f172a;" title="انقر للمعاينة المكبرة">
                      <img src="${res.fileUrl}" alt="${res.title}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s;"
                        onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
                      <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.1) 60%); display:flex; align-items:flex-end; padding:12px; opacity:0; transition:opacity 0.2s;"
                        onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                        <span style="font-size:0.8rem; font-weight:800; color:#fff; display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,0.6); padding:4px 12px; border-radius:10px; backdrop-filter:blur(4px);">
                          <i data-lucide="zoom-in" style="width:14px; height:14px;"></i>
                          <span>معاينة مكبرة</span>
                        </span>
                      </div>
                      <span style="position:absolute; top:12px; right:12px; background:rgba(15,23,42,0.75); backdrop-filter:blur(8px); color:#38bdf8; padding:3px 10px; border-radius:10px; font-size:0.72rem; font-weight:800; border:1px solid rgba(56,189,248,0.3);">
                        🖼️ صورة توضيحية
                      </span>
                    </div>
                  ` : isPdf ? `
                    <div style="position:relative; width:100%; height:130px; background:linear-gradient(135deg, rgba(239,68,68,0.06), rgba(220,38,38,0.16)); display:flex; align-items:center; justify-content:center; border-bottom:1px solid var(--border-color);">
                      <div style="width:60px; height:60px; border-radius:16px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); display:flex; align-items:center; justify-content:center; color:#ef4444; box-shadow:0 6px 18px rgba(239,68,68,0.15);">
                        <i data-lucide="file-text" style="width:32px; height:32px;"></i>
                      </div>
                      <span style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.12); color:#ef4444; padding:3px 10px; border-radius:10px; font-size:0.72rem; font-weight:900; border:1px solid rgba(239,68,68,0.25);">
                        📕 مستند PDF
                      </span>
                    </div>
                  ` : `
                    <div style="position:relative; width:100%; height:130px; background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(79,70,229,0.16)); display:flex; align-items:center; justify-content:center; border-bottom:1px solid var(--border-color);">
                      <div style="width:60px; height:60px; border-radius:16px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); display:flex; align-items:center; justify-content:center; color:var(--primary); box-shadow:0 6px 18px rgba(99,102,241,0.15);">
                        <i data-lucide="file" style="width:32px; height:32px;"></i>
                      </div>
                      <span style="position:absolute; top:12px; right:12px; background:rgba(99,102,241,0.12); color:var(--primary); padding:3px 10px; border-radius:10px; font-size:0.72rem; font-weight:900; border:1px solid rgba(99,102,241,0.25);">
                        📑 ملف / مذكرة
                      </span>
                    </div>
                  `}

                  <!-- Card Body -->
                  <div style="padding:16px 18px; display:flex; flex-direction:column; flex:1; justify-content:space-between; gap:12px;">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
                        <h4 style="font-size:0.98rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.4;">
                          ${res.title}
                        </h4>
                        ${canManage ? `
                          <button class="delete-resource-btn" data-id="${res.id}"
                            style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px; border-radius:6px; transition:color 0.15s;"
                            title="حذف هذا الملف" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text-muted)'">
                            <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
                          </button>
                        ` : ''}
                      </div>

                      ${res.description ? `
                        <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0 0 10px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                          ${res.description}
                        </p>
                      ` : ''}

                      <!-- Meta Info -->
                      <div style="display:flex; flex-wrap:wrap; gap:8px; font-size:0.75rem; color:var(--text-muted); font-weight:700;">
                        <span style="display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="user" style="width:12px; height:12px;"></i>
                          <span>${res.uploadedBy || 'المعلم'}</span>
                        </span>
                        <span>•</span>
                        <span style="display:inline-flex; align-items:center; gap:4px;">
                          <i data-lucide="calendar" style="width:12px; height:12px;"></i>
                          <span>${formatDate(res.createdAt)}</span>
                        </span>
                        ${res.fileSize ? `
                          <span>•</span>
                          <span style="direction:ltr;">${res.fileSize}</span>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display:flex; gap:8px; margin-top:8px; padding-top:12px; border-top:1px solid var(--border-color);">
                      ${isImage ? `
                        <button class="preview-resource-img-btn btn-secondary" data-id="${res.id}"
                          style="flex:1; padding:8px 12px; border-radius:10px; font-size:0.8rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                          <i data-lucide="eye" style="width:14px; height:14px;"></i>
                          <span>معاينة</span>
                        </button>
                        <a href="${res.fileUrl}" download="${cleanFileName}" target="_blank" class="btn-primary"
                          style="flex:1; padding:8px 12px; border-radius:10px; font-size:0.8rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                          <i data-lucide="download" style="width:14px; height:14px;"></i>
                          <span>تحميل</span>
                        </a>
                      ` : isPdf ? `
                        <a href="${res.fileUrl}" target="_blank" class="btn-secondary"
                          style="flex:1; padding:8px 12px; border-radius:10px; font-size:0.8rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                          <i data-lucide="book-open" style="width:14px; height:14px; color:#ef4444;"></i>
                          <span>قراءة 📖</span>
                        </a>
                        <a href="${res.fileUrl}" download="${cleanFileName}" target="_blank" class="btn-primary"
                          style="flex:1; padding:8px 12px; border-radius:10px; font-size:0.8rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg, #ef4444, #dc2626); border-color:#dc2626;">
                          <i data-lucide="download" style="width:14px; height:14px;"></i>
                          <span>تحميل ⬇️</span>
                        </a>
                      ` : `
                        <a href="${res.fileUrl}" download="${cleanFileName}" target="_blank" class="btn-primary"
                          style="flex:1; padding:8px 12px; border-radius:10px; font-size:0.8rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                          <i data-lucide="download" style="width:14px; height:14px;"></i>
                          <span>تحميل واستعراض ⬇️</span>
                        </a>
                      `}
                    </div>

                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;
  }

  // ── Tab 3: Group Notice Board / Announcements ─────────────────────────
  renderAnnouncementsTab() {
    const { announcements = [], isTeacher, isAdmin } = this.hubData;

    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Post Announcement Form (For Teachers & Admins) -->
        ${(isTeacher || isAdmin) ? `
          <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:1rem; font-weight:900; color:var(--text-main);">
              <i data-lucide="megaphone" style="width:18px; height:18px; color:var(--primary);"></i>
              <span>نشر تنبيه جديد لطلاب المجموعة</span>
            </div>

            <form id="group-announcement-form" style="display:flex; flex-direction:column; gap:12px;">
              <input type="text" id="announcement-title-input" placeholder="عنوان التنبيه (مثلاً: تنبيه هام بخصوص الحصة القادمة)..." required
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.9rem; font-weight:700;">

              <textarea id="announcement-content-input" rows="3" placeholder="اكتب تفاصيل التنبيه أو التوجيهات لطلاب مجموعتك هنا..." required
                style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.9rem; resize:vertical;"></textarea>

              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:var(--text-muted); cursor:pointer;">
                  <input type="checkbox" id="announcement-pin-checkbox" style="width:16px; height:16px;">
                  <span>تثبيت في أعلى الحائط 📌</span>
                </label>

                <button type="submit" class="btn-primary"
                  style="display:inline-flex; align-items:center; gap:6px; padding:9px 22px; border-radius:12px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer;">
                  <i data-lucide="send" style="width:14px; height:14px;"></i>
                  <span>نشر التنبيه وإشعار الطلاب 🚀</span>
                </button>
              </div>
            </form>
          </div>
        ` : ''}

        <!-- Announcements Stream -->
        ${announcements.length === 0 ? `
          <div class="glass-card" style="padding:60px 24px; text-align:center; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
            <i data-lucide="bell" style="width:40px; height:40px; color:var(--text-muted); margin-bottom:12px;"></i>
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">لا توجد تنبيهات منشورة حالياً</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">تابع هذا الحائط لمعرفة كل جديد وملاحظات المعلم اليومية.</p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${announcements.map(ann => {
      const annDate = ann.createdAt ? new Date(ann.createdAt) : new Date();
      const dateStr = annDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
                <div class="glass-card" style="padding:20px; border-radius:18px; border:1px solid ${ann.isPinned ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}; background:var(--bg-card); display:flex; flex-direction:column; gap:10px; ${ann.isPinned ? 'background:linear-gradient(135deg, rgba(99,102,241,0.04), var(--bg-card));' : ''}">
                  
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div>
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        ${ann.isPinned ? `
                          <span style="font-size:0.72rem; font-weight:900; padding:2px 8px; border-radius:8px; background:rgba(99,102,241,0.15); color:var(--primary);">
                            📌 مثبت
                          </span>
                        ` : ''}
                        <h4 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0;">
                          ${ann.title}
                        </h4>
                      </div>
                      <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">
                        بواسطة: <span style="color:var(--primary); font-weight:800;">${ann.authorName || 'معلم المجموعة'}</span> (${ann.authorRole || 'المعلم'}) • ${dateStr}
                      </div>
                    </div>

                    ${(isTeacher || isAdmin) ? `
                      <button class="delete-announcement-btn" data-id="${ann.id}"
                        style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:6px; border-radius:8px;" title="حذف التنبيه">
                        <i data-lucide="trash-2" style="width:16px; height:16px; color:#ef4444;"></i>
                      </button>
                    ` : ''}
                  </div>

                  <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin:0; white-space:pre-line;">
                    ${ann.content}
                  </p>

                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ── Tab 4: Attendance & Performance ───────────────────────────────────
  renderAttendanceTab() {
    const { sessions = [], stats, isTeacher, isAdmin } = this.hubData;
    const userAtt = stats?.userAttendance;

    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- Attendance Stats Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
          
          <div class="glass-card" style="padding:18px 20px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:14px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(99,102,241,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="calendar" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">إجمالي حصص المنهج</div>
              <div style="font-size:1.3rem; font-weight:900; color:var(--text-main);">${stats?.totalSessions || sessions.length} حصة</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px 20px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:14px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="check-circle-2" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">الحصص المنفذة حتى الآن</div>
              <div style="font-size:1.3rem; font-weight:900; color:var(--text-main);">${stats?.completedSessions || 0} حصة</div>
            </div>
          </div>

          ${userAtt ? `
            <div class="glass-card" style="padding:18px 20px; border-radius:18px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:14px;">
              <div style="width:48px; height:48px; border-radius:14px; background:${userAtt.percentage >= 80 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color:${userAtt.percentage >= 80 ? '#10b981' : '#ef4444'}; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.05rem;">
                ${userAtt.percentage}%
              </div>
              <div>
                <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">نسبة حضورك الشخصي</div>
                <div style="font-size:1.15rem; font-weight:900; color:var(--text-main);">${userAtt.attendedCount} من ${userAtt.completedSessionsCount} حصة</div>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Attendance Breakdown Table -->
        <div class="glass-card" style="padding:22px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
          <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0 0 16px;">
            سجل الحضور والغياب التفصيلي لكل حصة
          </h3>

          ${sessions.length === 0 ? `
            <p style="color:var(--text-muted); font-size:0.88rem; text-align:center;">لم تبدأ الحصص بعد لعرض سجل الحضور.</p>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.86rem; text-align:right;">
                <thead>
                  <tr style="border-bottom:1.5px solid var(--border-color); color:var(--text-muted);">
                    <th style="padding:10px 12px; font-weight:800;">#</th>
                    <th style="padding:10px 12px; font-weight:800;">الحصة</th>
                    <th style="padding:10px 12px; font-weight:800;">التاريخ والوقت</th>
                    <th style="padding:10px 12px; font-weight:800;">حالة الحصة</th>
                    ${!isTeacher && !isAdmin ? `<th style="padding:10px 12px; font-weight:800;">حالة حضورك</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${sessions.map((s, idx) => {
      const fmt = formatSessionDateTime(s.scheduledAt);
      return `
                      <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:12px; font-weight:800; color:var(--primary);">${idx + 1}</td>
                        <td style="padding:12px; font-weight:800; color:var(--text-main);">${s.title}</td>
                        <td style="padding:12px; color:var(--text-muted); font-weight:700;">${fmt.dateStr} • ${fmt.timeStr}</td>
                        <td style="padding:12px;">
                          <span style="padding:3px 8px; border-radius:8px; font-size:0.75rem; font-weight:800; background:var(--bg-app); color:var(--text-muted);">
                            ${s.status}
                          </span>
                        </td>
                        ${!isTeacher && !isAdmin ? `
                          <td style="padding:12px;">
                            ${s.myAttendance === 'PRESENT' ? `
                              <span style="color:#10b981; font-weight:800;">حاضر ✅</span>
                            ` : s.myAttendance === 'LATE' ? `
                              <span style="color:#f59e0b; font-weight:800;">متأخر ⏱️</span>
                            ` : s.myAttendance === 'ABSENT' ? `
                              <span style="color:#ef4444; font-weight:800;">غائب ❌</span>
                            ` : `
                              <span style="color:var(--text-muted); font-weight:700;">قادمة ⏳</span>
                            `}
                          </td>
                        ` : ''}
                      </tr>
                    `;
    }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
    `;
  }

  // ── Tab 5: Class Roster & Members ─────────────────────────────────────
  renderRosterTab() {
    const { students = [], isTeacher, isAdmin } = this.hubData;

    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0;">طلاب وأعضاء المجموعة 👥</h3>
            <p style="color:var(--text-muted); font-size:0.82rem; margin:4px 0 0;">إجمالي الطلاب المسجلين رسمياً في هذه المجموعة</p>
          </div>
          <span style="font-size:0.88rem; font-weight:900; color:var(--primary); padding:6px 14px; border-radius:12px; background:rgba(99,102,241,0.1);">
            ${students.length} طالب مسجل
          </span>
        </div>

        ${students.length === 0 ? `
          <div class="glass-card" style="padding:60px 24px; text-align:center; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
            <i data-lucide="users" style="width:40px; height:40px; color:var(--text-muted); margin-bottom:12px;"></i>
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">لا يوجد طلاب مسجلين حتى الآن</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">المجموعة مفتوحة لاستقبال الطلاب الجدد.</p>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:14px;">
            ${students.map((st, idx) => {
      const cleanWa = st.phone ? getCleanWhatsAppNumber(st.phone) : null;
      return `
                <div class="glass-card" style="padding:16px; border-radius:16px; border:1px solid var(--border-color); background:var(--bg-card); display:flex; align-items:center; gap:12px;">
                  <img src="${st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}"
                    alt="${st.name}"
                    style="width:44px; height:44px; border-radius:12px; object-fit:cover; border:1.5px solid var(--border-color);">
                  
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:0.9rem; font-weight:800; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${st.name}
                    </div>
                    ${st.progress !== undefined ? `
                      <div style="margin-top:4px; font-size:0.72rem; color:var(--primary); font-weight:800;">
                        نسبة الإنجاز: ${st.progress}%
                      </div>
                    ` : ''}
                  </div>

                  ${(isAdmin) && cleanWa ? `
                    <a href="https://wa.me/${cleanWa}" target="_blank" rel="noopener noreferrer"
                      style="width:36px; height:36px; border-radius:10px; background:rgba(37,211,102,0.12); color:#25d366; display:flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;"
                      title="مراسلة عبر واتساب">
                      <i data-lucide="message-circle" style="width:18px; height:18px;"></i>
                    </a>
                  ` : ''}
                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ── Event Handlers & Modal Interactions ───────────────────────────────
  bindEvents() {
    // Tab switching
    this.container.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.getAttribute("data-tab");
        this.renderUI();
      });
    });

    // Videos Search & Chapter Filter
    const videoSearchInput = this.container.querySelector("#video-search-input");
    if (videoSearchInput) {
      videoSearchInput.addEventListener("input", (e) => {
        this.videoSearchQuery = e.target.value;
        const container = this.container.querySelector("#group-tab-container");
        if (container && this.activeTab === "videos") {
          container.innerHTML = this.renderVideosTab();
          if (window.lucide) window.lucide.createIcons();
          this.bindVideoEvents();
        }
      });
    }

    const videoChapterFilter = this.container.querySelector("#video-chapter-filter");
    if (videoChapterFilter) {
      videoChapterFilter.addEventListener("change", (e) => {
        this.videoChapterFilter = e.target.value;
        const container = this.container.querySelector("#group-tab-container");
        if (container && this.activeTab === "videos") {
          container.innerHTML = this.renderVideosTab();
          if (window.lucide) window.lucide.createIcons();
          this.bindVideoEvents();
        }
      });
    }

    // Video events binding
    this.bindVideoEvents();

    // Resources Search & Type Filter
    const resourceSearchInput = this.container.querySelector("#resource-search-input");
    if (resourceSearchInput) {
      resourceSearchInput.addEventListener("input", (e) => {
        this.resourceSearchQuery = e.target.value;
        const container = this.container.querySelector("#group-tab-container");
        if (container && this.activeTab === "resources") {
          container.innerHTML = this.renderResourcesTab();
          if (window.lucide) window.lucide.createIcons();
          this.bindResourceEvents();
        }
      });
    }

    this.container.querySelectorAll(".resource-type-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.resourceTypeFilter = btn.getAttribute("data-type");
        const container = this.container.querySelector("#group-tab-container");
        if (container && this.activeTab === "resources") {
          container.innerHTML = this.renderResourcesTab();
          if (window.lucide) window.lucide.createIcons();
          this.bindResourceEvents();
        }
      });
    });

    // Resource events binding
    this.bindResourceEvents();

    // Sessions filter
    this.container.querySelectorAll(".session-filter-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        this.sessionFilter = btn.getAttribute("data-filter");
        this.renderUI();
      });
    });

    // Join live meeting button
    this.container.querySelectorAll(".join-live-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-url");
        if (url) {
          window.open(url, "_blank");
        } else {
          showToast("لم يتم تحديد رابط الاجتماع بعد من قِبل المعلم.", "info");
        }
      });
    });

    // Check-in action button
    this.container.querySelectorAll(".session-checkin-action-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sessId = btn.getAttribute("data-id");
        try {
          btn.disabled = true;
          btn.textContent = "جاري التأكيد...";
          await apiFetch(`/sessions/${sessId}/check-in`, { method: "POST" });
          showToast("تم تأكيد حضورك في الحصة بنجاح! ✅", "success");
          this.render(); // reload hub data
        } catch (err) {
          showToast(err.message || "فشل تسجيل الحضور.", "error");
          btn.disabled = false;
          btn.textContent = "تأكيد الحضور ✍️";
        }
      });
    });

    // View Session Notes / Summary Modal
    this.container.querySelectorAll(".view-session-notes-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const s = this.hubData.sessions[idx];
        if (!s) return;
        this.openSessionNotesModal(s);
      });
    });

    // Post Announcement Form
    const annForm = this.container.querySelector("#group-announcement-form");
    if (annForm) {
      annForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = this.container.querySelector("#announcement-title-input")?.value;
        const content = this.container.querySelector("#announcement-content-input")?.value;
        const isPinned = this.container.querySelector("#announcement-pin-checkbox")?.checked;

        try {
          await apiFetch(`/groups/${this.groupId}/announcements`, {
            method: "POST",
            body: JSON.stringify({ title, content, isPinned })
          });
          showToast("تم نشر التنبيه بنجاح وإشعار جميع طلاب المجموعة! 📢", "success");
          this.render();
        } catch (err) {
          showToast(err.message || "فشل نشر التنبيه.", "error");
        }
      });
    }

    // Delete Announcement
    this.container.querySelectorAll(".delete-announcement-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const annId = btn.getAttribute("data-id");
        const ok = await confirmDialog({
          title: "حذف التنبيه",
          message: "هل أنت متأكد من حذف هذا التنبيه من حائط المجموعة؟",
          confirmText: "نعم، حذف",
          isDestructive: true
        });
        if (!ok) return;

        try {
          await apiFetch(`/groups/${this.groupId}/announcements/${annId}`, { method: "DELETE" });
          showToast("تم حذف التنبيه بنجاح.", "success");
          this.render();
        } catch (err) {
          showToast(err.message || "فشل حذف التنبيه.", "error");
        }
      });
    });

    // Open Add Assignment Modal
    const addAsgnBtn = this.container.querySelector("#open-add-assignment-modal-btn");
    if (addAsgnBtn) {
      addAsgnBtn.addEventListener("click", () => {
        this.openAddAssignmentModal();
      });
    }

    // Submit Assignment Button (Student)
    this.container.querySelectorAll(".submit-assignment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const asgnId = btn.getAttribute("data-id");
        const asgnTitle = btn.getAttribute("data-title");
        this.openSubmitAssignmentModal(asgnId, asgnTitle);
      });
    });

    // Teacher View Assignment Details / Edit / Delete Modal Button
    this.container.querySelectorAll(".open-assignment-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const asgnId = parseInt(btn.getAttribute("data-id"), 10);
        const asgn = (this.hubData.assignments || []).find(a => a.id === asgnId);
        if (asgn) {
          const modal = new AssignmentDetailsModal(asgn, () => this.render());
          modal.open();
        }
      });
    });

    // Teacher Grading Modal Button
    this.container.querySelectorAll(".open-teacher-grading-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const asgnId = parseInt(btn.getAttribute("data-id"), 10);
        const asgnTitle = btn.getAttribute("data-title");
        const total = parseFloat(btn.getAttribute("data-total")) || 100;
        const modal = new AssignmentGradingModal(asgnId, asgnTitle, total, () => this.render());
        modal.open();
      });
    });

    // Student View Feedback Button
    this.container.querySelectorAll(".view-student-feedback-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const asgnId = btn.getAttribute("data-id");
        const asgn = (this.hubData.assignments || []).find(a => String(a.id) === String(asgnId));
        if (asgn && asgn.mySubmission) {
          const modal = new StudentFeedbackModal(asgn, asgn.mySubmission);
          modal.open();
        }
      });
    });
  }

  // ── Video Events & Modals ─────────────────────────────────────────────
  bindVideoEvents() {
    // Open upload modal
    const uploadBtn = this.container.querySelector("#open-upload-video-modal-btn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => this.openUploadVideoModal());
    }
    const uploadFirstBtn = this.container.querySelector("#open-upload-first-video-btn");
    if (uploadFirstBtn) {
      uploadFirstBtn.addEventListener("click", () => this.openUploadVideoModal());
    }

    // Watch video triggers
    this.container.querySelectorAll(".watch-video-trigger").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const videoId = el.getAttribute("data-id");
        const video = (this.hubData.videos || []).find(v => String(v.id) === String(videoId));
        if (video) {
          this.openWatchVideoModal(video);
        }
      });
    });

    // Delete video
    this.container.querySelectorAll(".delete-video-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const videoId = btn.getAttribute("data-id");
        if (!confirm("هل أنت متأكد من حذف هذا الفيديو نهائياً من المجموعة؟")) return;

        try {
          btn.disabled = true;
          await apiFetch(`/groups/${this.groupId}/videos/${videoId}`, { method: "DELETE" });
          showToast("تم حذف الفيديو بنجاح 🗑️", "success");
          this.render();
        } catch (err) {
          showToast(err.message || "فشل حذف الفيديو.", "error");
          btn.disabled = false;
        }
      });
    });
  }

  // Watch Video Modal (Modal Theater)
  openWatchVideoModal(video) {
    let modal = document.getElementById("watch-video-modal");
    if (modal) modal.remove();

    const getYouTubeId = (url) => {
      if (!url) return null;
      const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      return m ? m[1] : null;
    };

    const getVimeoId = (url) => {
      if (!url) return null;
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return m ? m[1] : null;
    };

    const getDriveId = (url) => {
      if (!url) return null;
      const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    };

    const ytId = getYouTubeId(video.videoUrl);
    const vimeoId = getVimeoId(video.videoUrl);
    const driveId = getDriveId(video.videoUrl);

    let playerHtml = '';
    if (ytId) {
      playerHtml = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe>`;
    } else if (vimeoId) {
      playerHtml = `<iframe src="https://player.vimeo.com/video/${vimeoId}?autoplay=1" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe>`;
    } else if (driveId) {
      playerHtml = `<iframe src="https://drive.google.com/file/d/${driveId}/preview" frameborder="0" allow="autoplay" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe>`;
    } else if (video.videoUrl && (video.videoUrl.endsWith(".mp4") || video.videoUrl.endsWith(".webm") || video.videoUrl.endsWith(".ogg") || video.videoUrl.includes("/uploads/"))) {
      playerHtml = `<video src="${video.videoUrl}" controls autoplay style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:#000;"></video>`;
    } else {
      playerHtml = `<iframe src="${video.videoUrl}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe>`;
    }

    modal = document.createElement("div");
    modal.id = "watch-video-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.88); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";

    modal.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:960px; max-height:94vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 25px 60px rgba(0,0,0,0.5); overflow:hidden;">
        
        <!-- Modal Header -->
        <div style="padding:16px 22px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <div style="width:36px; height:36px; border-radius:10px; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center; font-weight:900; flex-shrink:0;">
              <i data-lucide="play" style="width:18px; height:18px;"></i>
            </div>
            <div style="min-width:0;">
              <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${video.title}
              </h3>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; display:flex; gap:12px; margin-top:2px;">
                <span>📁 ${video.chapter || 'فيديو شرح'}</span>
                ${video.duration ? `<span>⏱️ ${video.duration}</span>` : ''}
              </div>
            </div>
          </div>
          <button id="close-watch-video-modal-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer; line-height:1; padding:4px 8px; border-radius:8px;">&times;</button>
        </div>

        <!-- Video Player Box (16:9 ratio) -->
        <div style="position:relative; width:100%; padding-top:56.25%; background:#000; flex-shrink:0;">
          ${playerHtml}
        </div>

        <!-- Video Footer & Description -->
        <div style="padding:18px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
          ${video.description ? `
            <div>
              <h4 style="font-size:0.85rem; font-weight:800; color:var(--text-muted); margin:0 0 6px 0;">وصف الحصة والشرح:</h4>
              <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin:0; white-space:pre-wrap;">${video.description}</p>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-top:auto; padding-top:12px; border-top:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:8px;">
              ${video.resourceUrl ? `
                <a href="${video.resourceUrl}" target="_blank" rel="noopener" class="btn-primary" style="padding:8px 16px; border-radius:12px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
                  <i data-lucide="paperclip" style="width:14px; height:14px;"></i>
                  <span>تحميل المذكرة / المرفقات 📎</span>
                </a>
              ` : ''}
              <a href="${video.videoUrl}" target="_blank" rel="noopener" class="btn-secondary" style="padding:8px 16px; border-radius:12px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
                <i data-lucide="external-link" style="width:14px; height:14px;"></i>
                <span>فتح المصدر الخارجي ↗️</span>
              </a>
            </div>

            <button id="close-watch-video-modal-bottom-btn" class="btn-secondary" style="padding:8px 18px; border-radius:12px; font-size:0.82rem; font-weight:800; cursor:pointer;">
              إغلاق ✖
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => {
      const iframe = modal.querySelector("iframe");
      if (iframe) iframe.src = "";
      const vid = modal.querySelector("video");
      if (vid) vid.pause();
      modal.remove();
    };

    modal.querySelector("#close-watch-video-modal-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#close-watch-video-modal-bottom-btn")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  }

  // Upload Group Video Modal (Teacher/Admin)
  openUploadVideoModal() {
    let modal = document.getElementById("upload-group-video-modal");
    if (modal) modal.remove();

    const existingChapters = Array.from(new Set((this.hubData.videos || []).map(v => v.chapter || "عام").filter(Boolean)));

    modal = document.createElement("div");
    modal.id = "upload-group-video-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";

    modal.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:620px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;">
        
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:12px; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="video" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">إضافة فيديو شرح جديد للمجموعة 🎥</h3>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">سيظهر في أول تبويب للطلاب مرتباً من الأحدث للأقدم</div>
            </div>
          </div>
          <button id="close-upload-video-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer; line-height:1;">&times;</button>
        </div>

        <form id="upload-video-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
          <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
            
            <!-- Video Title -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                عنوان الفيديو / الدرس: <span style="color:#ef4444;">*</span>
              </label>
              <input type="text" id="video-title-input" required placeholder="مثلاً: شرح الدرس الأول - الحركة في خط مستقيم..."
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
            </div>

            <!-- Video URL -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                رابط الفيديو (YouTube / Vimeo / Google Drive / MP4): <span style="color:#ef4444;">*</span>
              </label>
              <input type="url" id="video-url-input" required placeholder="https://www.youtube.com/watch?v=... أو رابط مباشر"
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box; direction:ltr; text-align:left;">
            </div>

            <!-- Unit / Chapter & Duration -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div>
                <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">الوحدة / الباب:</label>
                <input type="text" id="video-chapter-input" placeholder="مثلاً: الوحدة الأولى" list="chapter-suggestions"
                  style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
                <datalist id="chapter-suggestions">
                  ${existingChapters.map(ch => `<option value="${ch}">`).join('')}
                </datalist>
              </div>

              <div>
                <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">المدة التقديرية:</label>
                <input type="text" id="video-duration-input" placeholder="مثلاً: 45 دقيقة"
                  style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
              </div>
            </div>

            <!-- Resource / Notes URL -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                رابط المذكرة أو أوراق الشرح المرفقة (اختياري - PDF / Drive):
              </label>
              <input type="url" id="video-resource-input" placeholder="https://drive.google.com/..."
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box; direction:ltr; text-align:left;">
            </div>

            <!-- Description -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                ملاحظات أو وصف الفيديو:
              </label>
              <textarea id="video-description-input" rows="3" placeholder="اكتب نبذة عن النقاط التي تمت تغطيتها في هذا الفيديو..."
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box; resize:vertical;"></textarea>
            </div>

          </div>

          <!-- Modal Footer -->
          <div style="padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px; background:var(--bg-app); flex-shrink:0;">
            <button type="button" id="cancel-upload-video-btn" class="btn-secondary" style="padding:9px 18px; border-radius:12px; font-weight:800; font-size:0.88rem; cursor:pointer;">
              إلغاء
            </button>
            <button type="submit" id="submit-upload-video-btn" class="btn-primary" style="padding:9px 24px; border-radius:12px; font-weight:800; font-size:0.88rem; background:linear-gradient(135deg, #ef4444, #dc2626); border:none; color:#fff; cursor:pointer; box-shadow:0 4px 14px rgba(239,68,68,0.35);">
              نشر الفيديو الآن 🚀
            </button>
          </div>
        </form>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => modal.remove();
    modal.querySelector("#close-upload-video-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#cancel-upload-video-btn")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    const form = modal.querySelector("#upload-video-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = modal.querySelector("#video-title-input")?.value.trim();
      const videoUrl = modal.querySelector("#video-url-input")?.value.trim();
      const chapter = modal.querySelector("#video-chapter-input")?.value.trim();
      const duration = modal.querySelector("#video-duration-input")?.value.trim();
      const resourceUrl = modal.querySelector("#video-resource-input")?.value.trim();
      const description = modal.querySelector("#video-description-input")?.value.trim();

      if (!title || !videoUrl) {
        showToast("يرجى ملء عنوان ورابط الفيديو.", "warning");
        return;
      }

      const submitBtn = modal.querySelector("#submit-upload-video-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري النشر... ⏳";
      }

      try {
        await apiFetch(`/groups/${this.groupId}/videos`, {
          method: "POST",
          body: JSON.stringify({
            title,
            videoUrl,
            chapter,
            duration,
            resourceUrl,
            description
          })
        });

        showToast("تمت إضافة الفيديو ونشره للطلاب بنجاح! 🎥🎉", "success");
        closeModal();
        this.render();
      } catch (err) {
        showToast(err.message || "فشل إضافة الفيديو.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "نشر الفيديو الآن 🚀";
        }
      }
    });
  }

  // ── Resource Events & Modals ──────────────────────────────────────────
  bindResourceEvents() {
    // Open upload resource modal
    const uploadBtn = this.container.querySelector("#open-upload-resource-modal-btn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => this.openUploadResourceModal());
    }
    const uploadFirstBtn = this.container.querySelector("#open-upload-first-resource-btn");
    if (uploadFirstBtn) {
      uploadFirstBtn.addEventListener("click", () => this.openUploadResourceModal());
    }

    // Image lightbox preview trigger
    this.container.querySelectorAll(".resource-img-preview-trigger, .preview-resource-img-btn").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const resId = el.getAttribute("data-id");
        const res = (this.hubData.resources || []).find(r => String(r.id) === String(resId));
        if (res) {
          this.openResourceLightbox(res);
        }
      });
    });

    // Delete resource
    this.container.querySelectorAll(".delete-resource-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const resId = btn.getAttribute("data-id");
        const ok = await confirmDialog({
          title: "حذف الملف أو المذكرة",
          message: "هل أنت متأكد من حذف هذا الملف نهائياً من المجموعة؟ لن يتمكن الطلاب من الوصول إليه بعد الحذف.",
          confirmText: "نعم، حذف الملف",
          isDestructive: true
        });
        if (!ok) return;

        try {
          btn.disabled = true;
          await apiFetch(`/groups/${this.groupId}/resources/${resId}`, { method: "DELETE" });
          showToast("تم حذف الملف بنجاح 🗑️", "success");
          this.render();
        } catch (err) {
          showToast(err.message || "فشل حذف الملف.", "error");
          btn.disabled = false;
        }
      });
    });
  }

  // Upload Group Resource Modal (Teacher / Admin)
  openUploadResourceModal() {
    let modal = document.getElementById("upload-group-resource-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "upload-group-resource-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;";

    modal.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:620px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;">
        
        <!-- Header -->
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="file-plus" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">رفع ملف أو صورة للمجموعة 📁</h3>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">مذكرات، أوراق عمل، شيتات (PDF)، وصور توضيحية لطلاب المجموعة</div>
            </div>
          </div>
          <button id="close-upload-resource-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer; line-height:1;">&times;</button>
        </div>

        <form id="upload-resource-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
          <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
            
            <!-- File Title -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                عنوان الملف أو المذكرة: <span style="color:#ef4444;">*</span>
              </label>
              <input type="text" id="res-title-input" required placeholder="مثلاً: ملخص قوانين الحركة والفيزياء الفصل الأول..."
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
            </div>

            <!-- File Description -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                وصف أو تعليمات للطلاب (اختياري):
              </label>
              <textarea id="res-desc-input" rows="2" placeholder="ملاحظات توضيحية للطلاب حول هذا الملف أو طريقة استخدامه..."
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; resize:vertical; box-sizing:border-box;"></textarea>
            </div>

            <!-- Upload Area -->
            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                الملف أو الصورة: <span style="color:#ef4444;">*</span>
              </label>
              
              <div id="dropzone-box" style="border:2px dashed var(--border-color); border-radius:16px; padding:24px 16px; text-align:center; background:var(--bg-app); cursor:pointer; transition:all 0.2s;"
                onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                
                <input type="file" id="res-file-picker" style="display:none;" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt">
                
                <div id="dropzone-prompt">
                  <div style="width:48px; height:48px; border-radius:14px; background:rgba(99,102,241,0.1); color:var(--primary); display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    <i data-lucide="upload-cloud" style="width:24px; height:24px;"></i>
                  </div>
                  <div style="font-size:0.92rem; font-weight:800; color:var(--text-main); margin-bottom:4px;">اضغط لاختيار ملف أو صورة من جهازك 📎</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">يدعم: صور (PNG, JPG, WebP)، مستندات PDF، مذكرات Word، وغيرها</div>
                </div>

                <div id="dropzone-status" style="display:none; flex-direction:column; align-items:center; gap:8px;">
                  <div id="dropzone-preview-box"></div>
                  <div id="dropzone-filename" style="font-size:0.88rem; font-weight:800; color:var(--text-main);"></div>
                  <div id="dropzone-filesize" style="font-size:0.75rem; color:var(--text-muted);"></div>
                  <button type="button" id="change-file-btn" style="background:transparent; border:none; color:var(--primary); font-size:0.8rem; font-weight:800; cursor:pointer; text-decoration:underline;">
                    تغيير الملف 🔄
                  </button>
                </div>
              </div>

              <!-- Hidden inputs to store upload result -->
              <input type="hidden" id="uploaded-file-url" required>
              <input type="hidden" id="uploaded-file-name">
              <input type="hidden" id="uploaded-file-type">
              <input type="hidden" id="uploaded-file-size">
            </div>

            <!-- Alternative / Direct External URL Option -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">
                  أو استخدم رابطاً خارجياً مباشر (Google Drive / Dropbox):
                </label>
              </div>
              <input type="url" id="res-external-url-input" placeholder="https://drive.google.com/... أو رابط مباشر للملف"
                style="width:100%; padding:9px 12px; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.82rem; box-sizing:border-box; direction:ltr; text-align:left;">
            </div>

          </div>

          <!-- Footer -->
          <div style="padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; align-items:center; gap:12px; background:var(--bg-app); flex-shrink:0;">
            <button type="button" id="cancel-upload-res-btn" class="btn-secondary" style="padding:10px 20px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer;">
              إلغاء
            </button>
            <button type="submit" id="submit-upload-res-btn" class="btn-primary"
              style="display:inline-flex; align-items:center; gap:6px; padding:10px 24px; border-radius:12px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer;">
              <i data-lucide="check" style="width:16px; height:16px;"></i>
              <span>نشر الملف للمجموعة 🚀</span>
            </button>
          </div>
        </form>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => modal.remove();
    modal.querySelector("#close-upload-resource-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#cancel-upload-res-btn")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    const filePicker = modal.querySelector("#res-file-picker");
    const dropzoneBox = modal.querySelector("#dropzone-box");
    const dropzonePrompt = modal.querySelector("#dropzone-prompt");
    const dropzoneStatus = modal.querySelector("#dropzone-status");
    const previewBox = modal.querySelector("#dropzone-preview-box");
    const filenameEl = modal.querySelector("#dropzone-filename");
    const filesizeEl = modal.querySelector("#dropzone-filesize");
    const changeBtn = modal.querySelector("#change-file-btn");
    const urlInp = modal.querySelector("#uploaded-file-url");
    const nameInp = modal.querySelector("#uploaded-file-name");
    const typeInp = modal.querySelector("#uploaded-file-type");
    const sizeInp = modal.querySelector("#uploaded-file-size");
    const titleInp = modal.querySelector("#res-title-input");
    const extUrlInp = modal.querySelector("#res-external-url-input");

    dropzoneBox.addEventListener("click", (e) => {
      if (e.target !== changeBtn) filePicker.click();
    });
    changeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      filePicker.click();
    });

    filePicker.addEventListener("change", async () => {
      const file = filePicker.files[0];
      if (!file) return;

      // Auto-fill title if empty
      if (!titleInp.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        titleInp.value = cleanName;
      }

      // Format file size
      const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      dropzonePrompt.style.display = "none";
      dropzoneStatus.style.display = "flex";
      previewBox.innerHTML = `
        <div style="font-size:0.85rem; color:var(--primary); font-weight:800; display:flex; align-items:center; gap:8px;">
          <i data-lucide="loader-2" class="spin" style="width:20px; height:20px;"></i>
          <span>جاري رفع الملف إلى السيرفر... ⏳</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token },
          body: formData
        });
        if (!res.ok) throw new Error("فشل رفع الملف إلى السيرفر");
        const data = await res.json();

        urlInp.value = data.url;
        nameInp.value = file.name;
        sizeInp.value = formatBytes(file.size);

        // Determine type
        let fType = "other";
        if (file.type.startsWith("image/")) fType = "image";
        else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) fType = "pdf";
        else if (file.name.match(/\.(doc|docx|ppt|pptx|xls|xlsx|txt)$/i)) fType = "document";
        typeInp.value = fType;

        filenameEl.textContent = file.name;
        filesizeEl.textContent = formatBytes(file.size);

        if (fType === "image") {
          previewBox.innerHTML = `
            <img src="${data.url}" alt="${file.name}" style="max-height:100px; max-width:180px; object-fit:cover; border-radius:12px; border:2px solid var(--border-color); box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          `;
        } else if (fType === "pdf") {
          previewBox.innerHTML = `
            <div style="width:50px; height:50px; border-radius:12px; background:rgba(239,68,68,0.12); color:#ef4444; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="file-text" style="width:26px; height:26px;"></i>
            </div>
          `;
        } else {
          previewBox.innerHTML = `
            <div style="width:50px; height:50px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center;">
              <i data-lucide="file" style="width:26px; height:26px;"></i>
            </div>
          `;
        }
        if (window.lucide) window.lucide.createIcons();
        showToast("تم رفع الملف بنجاح! 📎", "success");
      } catch (err) {
        showToast(err.message || "فشل رفع الملف.", "error");
        dropzonePrompt.style.display = "block";
        dropzoneStatus.style.display = "none";
      }
    });

    extUrlInp.addEventListener("input", () => {
      const val = extUrlInp.value.trim();
      if (val) {
        urlInp.value = val;
        nameInp.value = val.split("/").pop() || "ملف خارجي";
        if (val.match(/\.(png|jpe?g|gif|webp|svg)/i)) typeInp.value = "image";
        else if (val.match(/\.pdf/i)) typeInp.value = "pdf";
        else typeInp.value = "other";
      }
    });

    modal.querySelector("#upload-resource-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = titleInp.value.trim();
      const description = modal.querySelector("#res-desc-input")?.value.trim();
      const fileUrl = urlInp.value.trim() || extUrlInp.value.trim();
      const fileName = nameInp.value.trim();
      const fileType = typeInp.value.trim();
      const fileSize = sizeInp.value.trim();

      if (!fileUrl) {
        showToast("يرجى اختيار ملف لرفعه أو إدخال رابط الملف أولاً.", "warning");
        return;
      }

      const submitBtn = modal.querySelector("#submit-upload-res-btn");
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>جاري النشر...</span>`;

        await apiFetch(`/groups/${this.groupId}/resources`, {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            fileUrl,
            fileName,
            fileType,
            fileSize
          })
        });

        showToast("تم نشر الملف بنجاح وإشعار طلاب المجموعة! 📁🚀", "success");
        modal.remove();
        this.render();
      } catch (err) {
        showToast(err.message || "فشل نشر الملف للمجموعة.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check" style="width:16px; height:16px;"></i><span>نشر الملف للمجموعة 🚀</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Open Image Lightbox
  openResourceLightbox(res) {
    let modal = document.getElementById("resource-lightbox-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "resource-lightbox-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(10px); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; font-family:'Cairo', sans-serif;";

    modal.innerHTML = `
      <div style="position:absolute; top:20px; right:24px; left:24px; display:flex; justify-content:space-between; align-items:center; z-index:10; color:#fff;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center;">
            <i data-lucide="image" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <h3 style="font-size:1.1rem; font-weight:900; margin:0; text-shadow:0 2px 10px rgba(0,0,0,0.8);">${res.title}</h3>
            <div style="font-size:0.78rem; opacity:0.8;">بواسطة ${res.uploadedBy || 'المعلم'} ${res.fileSize ? `• ${res.fileSize}` : ''}</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <a href="${res.fileUrl}" download="${res.fileName || 'صورة'}" target="_blank" class="btn-primary" style="padding:8px 16px; border-radius:12px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; text-decoration:none; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:#fff;">
            <i data-lucide="download" style="width:14px; height:14px;"></i>
            <span>تحميل الصورة</span>
          </a>
          <button id="close-lightbox-btn" style="background:rgba(255,255,255,0.15); border:none; color:#fff; width:36px; height:36px; border-radius:12px; font-size:1.4rem; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;">
            &times;
          </button>
        </div>
      </div>

      <div style="max-width:92vw; max-height:82vh; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.8);">
        <img src="${res.fileUrl}" alt="${res.title}" style="max-width:100%; max-height:82vh; object-fit:contain;">
      </div>

      ${res.description ? `
        <div style="margin-top:16px; max-width:800px; text-align:center; color:#f1f5f9; font-size:0.9rem; background:rgba(0,0,0,0.5); padding:8px 20px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
          ${res.description}
        </div>
      ` : ''}
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => modal.remove();
    modal.querySelector("#close-lightbox-btn")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.parentElement === modal) {
        if (e.target.tagName !== 'IMG' && !e.target.closest('.btn-primary') && !e.target.closest('#close-lightbox-btn')) closeModal();
      }
    });
  }

  // ── Session Notes / Report Modal ───────────────────────────────────────
  openSessionNotesModal(session) {
    const modalId = "session-notes-modal";
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    const fmt = formatSessionDateTime(session.scheduledAt);
    const { isTeacher, isAdmin } = this.hubData;
    const canManageReport = isTeacher || isAdmin;
    const hasReport = Boolean(session.topic || session.whatWasCovered || session.homework || session.teacherNotes);

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;";

    const renderViewMode = () => `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">📄 ملخص الحصة</h3>
            <span style="font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:10px; background:rgba(99,102,241,0.1); color:var(--primary);">${session.title}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-top:4px;">📅 ${fmt.dateStr} • ${fmt.timeStr}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${canManageReport ? `
            <button id="toggle-edit-report-btn" class="btn-secondary" style="padding:6px 12px; font-size:0.78rem; font-weight:800; border-radius:10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
              <i data-lucide="edit-3" style="width:13px; height:13px;"></i>
              <span>${hasReport ? 'تعديل الملخص' : 'كتابة الملخص'}</span>
            </button>
          ` : ''}
          <button id="close-session-notes-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        ${session.topic ? `
          <div style="padding:12px 14px; border-radius:14px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.18);">
            <div style="font-size:0.75rem; font-weight:800; color:var(--primary); margin-bottom:4px;">📌 موضوع الحصة:</div>
            <div style="font-size:0.92rem; font-weight:800; color:var(--text-main);">${session.topic}</div>
          </div>
        ` : ''}

        ${session.whatWasCovered ? `
          <div style="padding:12px 14px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color);">
            <div style="font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">📝 ما تم شرحه وإنجازه (ملخص الدرس):</div>
            <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin:0; white-space:pre-wrap;">${session.whatWasCovered}</p>
          </div>
        ` : ''}

        ${session.homework ? `
          <div style="padding:12px 14px; border-radius:14px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25);">
            <div style="font-size:0.8rem; font-weight:900; color:#d97706; margin-bottom:4px;">📚 الواجب أو التكليف المطلوب:</div>
            <p style="font-size:0.88rem; color:var(--text-main); line-height:1.5; margin:0; white-space:pre-wrap;">${session.homework}</p>
          </div>
        ` : ''}

        ${session.teacherNotes ? `
          <div style="padding:12px 14px; border-radius:14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2);">
            <div style="font-size:0.8rem; font-weight:800; color:#10b981; margin-bottom:4px;">💡 ملاحظات وتوجيهات المعلم للطلاب:</div>
            <p style="font-size:0.88rem; color:var(--text-main); line-height:1.6; margin:0; white-space:pre-wrap;">${session.teacherNotes}</p>
          </div>
        ` : ''}

        ${session.studentPerformance ? `
          <div style="padding:10px 14px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); font-size:0.84rem;">
            <span style="color:var(--text-muted); font-weight:700;">تقييم مستوى التفاعل: </span>
            <strong style="color:var(--text-main);">${session.studentPerformance}</strong>
          </div>
        ` : ''}

        ${!session.topic && !session.whatWasCovered && !session.homework && !session.teacherNotes ? `
          <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
            <i data-lucide="file-text" style="width:36px; height:36px; opacity:0.3; margin:0 auto 10px; display:block;"></i>
            <p style="font-size:0.92rem; margin:0 0 10px;">لم يقم المعلم بتسجيل ملخص لهذه الحصة حتى الآن.</p>
            ${canManageReport ? `
              <button id="write-first-report-btn" class="btn-primary" style="padding:8px 18px; font-size:0.82rem; font-weight:800; border-radius:12px;">
                كتابة ملخص الحصة الآن ✍️
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;

    const renderEditMode = () => `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
        <div>
          <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">✍️ تسجيل ملخص وتقرير الحصة</h3>
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-top:2px;">${session.title} • يظهر الملخص والواجب لطلاب المجموعة فور الحفظ</div>
        </div>
        <button id="close-session-notes-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.4rem; cursor:pointer;">&times;</button>
      </div>

      <form id="session-report-form" style="display:flex; flex-direction:column; gap:14px;">
        <div>
          <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            📌 موضوع الحصة (Topic):
          </label>
          <input type="text" id="report-topic-input" class="form-input" value="${session.topic || ''}" placeholder="مثال: الدرس الأول - حل المعادلات والتفاضل"
            style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
        </div>

        <div>
          <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            📝 ما تم شرحه وإنجازه (ملخص الحصة): <span style="color:#ef4444;">*</span>
          </label>
          <textarea id="report-covered-input" required rows="3" class="form-input" placeholder="اكتب ملخصاً لما تم شرحه وأهم النقاط التي ركزت عليها..."
            style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">${session.whatWasCovered || ''}</textarea>
        </div>

        <div>
          <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            📚 الواجب والتكليفات المطلوبة (Homework):
          </label>
          <textarea id="report-homework-input" rows="2" class="form-input" placeholder="الصفحات والتمارين المطلوبة من الطلاب للمرة القادمة..."
            style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">${session.homework || ''}</textarea>
        </div>

        <div>
          <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
            💡 ملاحظات وتوجيهات عامة للطلاب:
          </label>
          <input type="text" id="report-notes-input" class="form-input" value="${session.teacherNotes || ''}" placeholder="نصائح للمذاكرة أو مراجعة أجزاء سابقة..."
            style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px; border-top:1px solid var(--border-color); padding-top:14px;">
          ${hasReport ? `
            <button type="button" id="cancel-edit-report-btn" class="btn-secondary" style="padding:8px 16px; border-radius:12px; font-weight:800; font-size:0.84rem;">
              إلغاء
            </button>
          ` : ''}
          <button type="submit" id="save-report-submit-btn" class="btn-primary" style="padding:9px 22px; border-radius:12px; font-weight:900; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="check" style="width:15px; height:15px;"></i>
            <span>حفظ ملخص الحصة ✅</span>
          </button>
        </div>
      </form>
    `;

    const updateModalContent = (isEdit) => {
      modal.innerHTML = `
        <div class="glass-card" style="background:var(--bg-card); border-radius:22px; width:100%; max-width:540px; padding:26px; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; max-height:90vh; overflow-y:auto;">
          ${isEdit ? renderEditMode() : renderViewMode()}
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      modal.querySelectorAll("#close-session-notes-btn").forEach(btn => {
        btn.addEventListener("click", () => modal.remove());
      });

      modal.querySelector("#toggle-edit-report-btn")?.addEventListener("click", () => {
        updateModalContent(true);
      });

      modal.querySelector("#write-first-report-btn")?.addEventListener("click", () => {
        updateModalContent(true);
      });

      modal.querySelector("#cancel-edit-report-btn")?.addEventListener("click", () => {
        updateModalContent(false);
      });

      const form = modal.querySelector("#session-report-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const topic = modal.querySelector("#report-topic-input")?.value.trim();
          const whatWasCovered = modal.querySelector("#report-covered-input")?.value.trim();
          const homework = modal.querySelector("#report-homework-input")?.value.trim();
          const teacherNotes = modal.querySelector("#report-notes-input")?.value.trim();
          const submitBtn = modal.querySelector("#save-report-submit-btn");

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "جاري الحفظ...";
          }

          try {
            await apiFetch(`/sessions/${session.id}/complete`, {
              method: "POST",
              body: JSON.stringify({ topic, whatWasCovered, homework, teacherNotes })
            });

            session.topic = topic;
            session.whatWasCovered = whatWasCovered;
            session.homework = homework;
            session.teacherNotes = teacherNotes;
            session.status = "COMPLETED";

            showToast("تم حفظ ملخص الحصة بنجاح! 📄✅", "success");
            modal.remove();
            this.render();
          } catch (err) {
            showToast(err.message || "تعذر حفظ ملخص الحصة.", "error");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "حفظ ملخص الحصة ✅";
            }
          }
        });
      }
    };

    updateModalContent(canManageReport && !hasReport);
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  }

  // ── Add Group Assignment Modal (Teacher) ──────────────────────────────
  openAddAssignmentModal() {
    const modalId = "add-group-assignment-modal";
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    const minDate = new Date().toISOString().slice(0, 16);

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;";

    modal.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:720px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;">
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:10px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="plus-circle" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">إضافة واجب جديد للمجموعة 📝</h3>
              <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">دعم أنماط الأسئلة المتعددة (MCQ، مقالي، رفع ملفات)</div>
            </div>
          </div>
          <button id="close-add-asgn-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer;">&times;</button>
        </div>

        <form id="create-group-asgn-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
          <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div>
                <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">عنوان الواجب: <span style="color:#ef4444;">*</span></label>
                <input type="text" id="asgn-title" required placeholder="مثلاً: واجب قوانين نيوتن والسرعة..."
                  style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
              </div>

              <div>
                <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">آخر موعد لتسليم الواجب: <span style="color:#ef4444;">*</span></label>
                <input type="datetime-local" id="asgn-due" min="${minDate}" required
                  style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.88rem; box-sizing:border-box;">
              </div>
            </div>

            <div>
              <label style="display:block; font-size:0.82rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">تعليمات وإرشادات عامة:</label>
              <textarea id="asgn-desc" rows="2" placeholder="ملاحظات وتوجيهات عامة للطلاب بخصوص الواجب..."
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.86rem; box-sizing:border-box;"></textarea>
            </div>

            <!-- Questions Builder Section -->
            <div style="border-top:1px solid var(--border-color); padding-top:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="font-weight:900; font-size:0.95rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                  <i data-lucide="help-circle" style="width:17px; height:17px; color:var(--primary);"></i>
                  <span>أسئلة الواجب ونماذج التقييم</span>
                </div>

                <div style="display:flex; gap:6px;">
                  <button type="button" class="add-q-btn btn-secondary" data-type="mcq" style="font-size:0.75rem; padding:5px 10px; border-radius:8px; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                    + اختيار من متعدد (MCQ)
                  </button>
                  <button type="button" class="add-q-btn btn-secondary" data-type="essay" style="font-size:0.75rem; padding:5px 10px; border-radius:8px; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                    + سؤال مقالي
                  </button>
                  <button type="button" class="add-q-btn btn-secondary" data-type="file" style="font-size:0.75rem; padding:5px 10px; border-radius:8px; font-weight:800; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                    + رفع ملف / مستند
                  </button>
                </div>
              </div>

              <div id="questions-builder-container" style="display:flex; flex-direction:column; gap:12px;">
                <!-- Dynamically injected questions -->
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div style="padding:14px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
            <div style="font-size:0.85rem; font-weight:800; color:var(--text-muted);">
              إجمالي الدرجات: <span id="builder-total-points-badge" style="color:var(--primary); font-weight:900;">0 درجة</span>
            </div>
            <div style="display:flex; gap:10px;">
              <button type="button" id="cancel-add-asgn-btn" class="btn-secondary" style="padding:9px 18px; border-radius:12px; font-weight:800; font-size:0.85rem;">إلغاء</button>
              <button type="submit" class="btn-primary" style="padding:9px 24px; border-radius:12px; font-weight:900; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="check" style="width:15px; height:15px;"></i>
                <span>حفظ ونشر الواجب 🚀</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    modal.querySelector("#close-add-asgn-btn")?.addEventListener("click", () => modal.remove());
    modal.querySelector("#cancel-add-asgn-btn")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    const qContainer = modal.querySelector("#questions-builder-container");
    const totalPointsBadge = modal.querySelector("#builder-total-points-badge");

    const updateTotalPoints = () => {
      let sum = 0;
      qContainer.querySelectorAll(".builder-q-points").forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val)) sum += val;
      });
      if (totalPointsBadge) totalPointsBadge.innerText = `${sum} درجة`;
    };

    const renderQuestionBuilderRow = (type = 'essay', index = 1) => {
      const qId = 'q_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const isMcq = type === 'mcq';
      const isFile = type === 'file';

      const div = document.createElement("div");
      div.className = "builder-question-card";
      div.setAttribute("data-q-id", qId);
      div.setAttribute("data-q-type", type);
      div.style.cssText = "border:1px solid var(--border-color); border-radius:14px; background:var(--bg-app); padding:14px 16px; display:flex; flex-direction:column; gap:10px;";

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="builder-q-num" style="font-weight:900; font-size:0.88rem; color:var(--primary);">س${index}</span>
            <span class="badge" style="font-size:0.72rem; font-weight:800; background:rgba(99,102,241,0.1); color:var(--primary);">
              ${isMcq ? 'اختيار من متعدد (تصحيح آلي)' : isFile ? 'رفع ملف مستندات' : 'سؤال مقالي'}
            </span>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:800;">الدرجة:</span>
              <input type="number" min="1" max="100" class="builder-q-points form-input" value="10" style="width:60px; padding:4px 6px; text-align:center; font-weight:800; font-size:0.82rem; border-radius:8px; height:28px;">
            </div>
            <button type="button" class="remove-builder-q-btn" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:4px;">
              <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
            </button>
          </div>
        </div>

        <div>
          <input type="text" class="builder-q-text form-input" required placeholder="اكتب نص السؤال هنا..."
            style="width:100%; padding:8px 12px; font-size:0.85rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); box-sizing:border-box;">
        </div>

        ${isMcq ? `
          <div class="mcq-options-container" style="display:flex; flex-direction:column; gap:6px; background:var(--bg-card); padding:10px 12px; border-radius:10px; border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-size:0.76rem; font-weight:800; color:var(--text-muted);">الخيارات (حدد الخيار الصحيح للتصحيح الآلي):</span>
              <button type="button" class="add-mcq-opt-btn btn-secondary" style="font-size:0.72rem; padding:3px 8px; border-radius:6px; cursor:pointer;">+ خيار إضافي</button>
            </div>

            <div class="mcq-options-list" style="display:flex; flex-direction:column; gap:6px;">
              ${[1, 2, 3, 4].map(optIdx => `
                <div class="mcq-opt-row" style="display:flex; align-items:center; gap:8px;">
                  <input type="radio" name="mcq_correct_${qId}" class="mcq-is-correct-radio" ${optIdx === 1 ? 'checked' : ''} style="cursor:pointer;" title="تحديد كإجابة صحيحة">
                  <input type="text" class="mcq-opt-text form-input" required placeholder="الخيار ${optIdx}..." value="" style="flex:1; padding:6px 10px; font-size:0.82rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main);">
                </div>
              `).join('')}
            </div>

            <div style="margin-top:4px;">
              <input type="text" class="mcq-explanation form-input" placeholder="شرح وتفسير الإجابة الصحيحة للطلاب بعد التصحيح (اختياري)..."
                style="width:100%; padding:6px 10px; font-size:0.8rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); box-sizing:border-box;">
            </div>
          </div>
        ` : isFile ? `
          <div style="font-size:0.8rem; color:var(--text-muted); background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
            📎 يُسمح للطالب برفع ملفات مستندات (PDF, Word, صور). يتم معاينتها وتصحيحها من المعلم.
          </div>
        ` : `
          <div style="font-size:0.8rem; color:var(--text-muted); background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
            ✍️ سؤال مقالي يكتب الطالب فيه إجابته التحريرية ليتم تصحيحها يدوياً مع إمكانية كتابة تعليقات توجيهية.
          </div>
        `}
      `;

      if (window.lucide) window.lucide.createIcons();

      div.querySelector(".remove-builder-q-btn")?.addEventListener("click", () => {
        div.remove();
        reindexBuilderRows();
        updateTotalPoints();
      });

      div.querySelector(".builder-q-points")?.addEventListener("input", updateTotalPoints);

      div.querySelector(".add-mcq-opt-btn")?.addEventListener("click", () => {
        const optList = div.querySelector(".mcq-options-list");
        if (optList) {
          const row = document.createElement("div");
          row.className = "mcq-opt-row";
          row.style.cssText = "display:flex; align-items:center; gap:8px;";
          row.innerHTML = `
            <input type="radio" name="mcq_correct_${qId}" class="mcq-is-correct-radio" style="cursor:pointer;" title="تحديد كإجابة صحيحة">
            <input type="text" class="mcq-opt-text form-input" required placeholder="خيار جديد..." style="flex:1; padding:6px 10px; font-size:0.82rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main);">
            <button type="button" class="remove-opt-btn" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem;">&times;</button>
          `;
          row.querySelector(".remove-opt-btn").addEventListener("click", () => row.remove());
          optList.appendChild(row);
        }
      });

      return div;
    };

    const reindexBuilderRows = () => {
      qContainer.querySelectorAll(".builder-question-card").forEach((card, idx) => {
        const numSpan = card.querySelector(".builder-q-num");
        if (numSpan) numSpan.innerText = `س${idx + 1}`;
      });
    };

    // Add buttons
    modal.querySelectorAll(".add-q-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-type");
        const count = qContainer.querySelectorAll(".builder-question-card").length;
        const row = renderQuestionBuilderRow(type, count + 1);
        qContainer.appendChild(row);
        updateTotalPoints();
        if (window.lucide) window.lucide.createIcons();
      });
    });

    // Default initial question (1 Essay)
    qContainer.appendChild(renderQuestionBuilderRow('essay', 1));
    updateTotalPoints();

    // Form submit
    modal.querySelector("#create-group-asgn-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = modal.querySelector("#asgn-title")?.value.trim();
      const description = modal.querySelector("#asgn-desc")?.value.trim();
      const dueDate = modal.querySelector("#asgn-due")?.value;

      const questionCards = qContainer.querySelectorAll(".builder-question-card");
      if (questionCards.length === 0) {
        showToast("يرجى إضافة سؤال واحد على الأقل للواجب.", "warning");
        return;
      }

      const questions = [];
      questionCards.forEach((card, i) => {
        const qType = card.getAttribute("data-q-type");
        const qText = card.querySelector(".builder-q-text")?.value.trim() || "";
        const points = parseFloat(card.querySelector(".builder-q-points")?.value) || 10;

        let options = undefined;
        let explanation = undefined;

        if (qType === 'mcq') {
          options = [];
          card.querySelectorAll(".mcq-opt-row").forEach((optRow, optIdx) => {
            const optText = optRow.querySelector(".mcq-opt-text")?.value.trim() || "";
            const isCorrect = optRow.querySelector(".mcq-is-correct-radio")?.checked || false;
            options.push({
              id: `opt_${optIdx + 1}`,
              text: optText,
              isCorrect
            });
          });
          explanation = card.querySelector(".mcq-explanation")?.value.trim() || undefined;
        }

        questions.push({
          id: `q_${i + 1}`,
          type: qType,
          text: qText,
          points,
          options,
          explanation
        });
      });

      try {
        const res = await apiFetch(`/groups/${this.groupId}/assignments`, {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            type: questions.length === 1 ? questions[0].type : 'hybrid',
            questions,
            dueDate
          })
        });
        showToast("تم إضافة ونشر الواجب بنجاح للمجموعة! 📝🚀", "success");
        modal.remove();
        await this.render();

        const createdAsgn = res?.assignment || (this.hubData.assignments || []).find(a => a.title === title);
        if (createdAsgn) {
          const detailsModal = new AssignmentDetailsModal(createdAsgn, () => this.render());
          detailsModal.open();
        }
      } catch (err) {
        showToast(err.message || "فشل إضافة الواجب.", "error");
      }
    });
  }

  // ── Submit Assignment Modal (Student) ─────────────────────────────────
  openSubmitAssignmentModal(assignmentId, assignmentTitle) {
    const modalId = "submit-assignment-modal";
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    const asgn = (this.hubData.assignments || []).find(a => String(a.id) === String(assignmentId));
    const questions = Array.isArray(asgn?.questions) ? asgn.questions : [];

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;";

    modal.innerHTML = `
      <div class="glass-card" style="background:var(--bg-card); border-radius:24px; width:100%; max-width:700px; max-height:92vh; display:flex; flex-direction:column; border:1px solid var(--border-color); font-family:'Cairo', sans-serif; box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;">
        
        <div style="padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:38px; height:38px; border-radius:10px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; font-weight:900;">
              <i data-lucide="edit-3" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-main); margin:0;">تسليم حل الواجب 📤</h3>
              <div style="font-size:0.8rem; color:var(--primary); font-weight:800; margin-top:2px;">${assignmentTitle}</div>
            </div>
          </div>
          <button id="close-submit-asgn-btn" style="background:transparent; border:none; color:var(--text-muted); font-size:1.6rem; cursor:pointer;">&times;</button>
        </div>

        <form id="submit-assignment-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
          <div style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
            
            ${asgn?.description ? `
              <div style="padding:12px 16px; border-radius:12px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); font-size:0.85rem; color:var(--text-main); line-height:1.5;">
                <strong style="color:var(--primary);">💡 تعليمات الواجب:</strong> ${asgn.description}
              </div>
            ` : ''}

            ${questions.length === 0 ? `
              <div>
                <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">حل الواجب أو رابط الملف المرفق: <span style="color:#ef4444;">*</span></label>
                <textarea id="submission-content-input" rows="6" required placeholder="اكتب إجاباتك هنا بالتفصيل، أو ضع رابط درايف/صورة للحل الخاص بك..."
                  style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-family:'Cairo', sans-serif; font-size:0.9rem; resize:vertical; box-sizing:border-box;"></textarea>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:16px;">
                ${questions.map((q, idx) => {
      const isMcq = q.type === 'mcq';
      const isFile = q.type === 'file';

      return `
                    <div class="student-question-box" data-q-id="${q.id}" data-q-type="${q.type}" data-q-pts="${q.points || 10}" style="border:1px solid var(--border-color); border-radius:16px; background:var(--bg-app); padding:16px; display:flex; flex-direction:column; gap:12px;">
                      
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                        <div style="font-weight:900; font-size:0.95rem; color:var(--text-main); line-height:1.4;">
                          <span style="color:var(--primary);">س${idx + 1}:</span> ${q.text}
                        </div>
                        <span class="badge" style="background:var(--primary-glow); color:var(--primary); font-size:0.75rem; font-weight:800; flex-shrink:0;">
                          ${q.points || 10} درجات
                        </span>
                      </div>

                      ${isMcq ? `
                        <div class="mcq-student-options" style="display:flex; flex-direction:column; gap:8px;">
                          ${(q.options || []).map(opt => `
                            <label style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-card); cursor:pointer; font-size:0.9rem; color:var(--text-main); transition:all 0.15s ease;">
                              <input type="radio" name="student_mcq_${q.id}" value="${opt.id}" class="student-mcq-radio" required style="cursor:pointer;">
                              <span>${opt.text}</span>
                            </label>
                          `).join('')}
                        </div>
                      ` : isFile ? `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                          <div style="display:flex; align-items:center; gap:12px;">
                            <label class="btn-secondary" style="font-size:0.82rem; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
                              <i data-lucide="upload-cloud" style="width:16px; height:16px;"></i>
                              <span class="file-upload-label-text">اختيار ملف ورفعه 📎</span>
                              <input type="file" class="student-file-input" style="display:none;" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip">
                            </label>
                            <span class="file-upload-status-text" style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">(PDF, Word, صور, ZIP)</span>
                          </div>
                          <input type="hidden" class="student-uploaded-file-url" value="">
                          <input type="hidden" class="student-uploaded-file-name" value="">
                          <div class="file-preview-inline" style="display:none; padding:10px; background:var(--bg-card); border-radius:10px; border:1px solid var(--border-color); font-size:0.85rem; color:var(--primary); font-weight:800;"></div>
                        </div>
                      ` : `
                        <div>
                          <textarea class="student-essay-textarea form-input" required rows="3" placeholder="اكتب إجابتك التحريرية بالتفصيل هنا..."
                            style="width:100%; padding:10px 14px; font-size:0.88rem; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); line-height:1.6; resize:vertical; box-sizing:border-box; font-family:inherit;"></textarea>
                        </div>
                      `}
                    </div>
                  `;
    }).join('')}
              </div>
            `}

          </div>

          <div style="padding:14px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px; background:var(--bg-app); flex-shrink:0;">
            <button type="button" id="cancel-submit-asgn-btn" class="btn-secondary" style="padding:10px 18px; border-radius:12px; font-weight:800; font-size:0.88rem;">إلغاء</button>
            <button type="submit" id="submit-assignment-confirm-btn" class="btn-primary" style="padding:10px 24px; border-radius:12px; font-weight:900; font-size:0.9rem; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="send" style="width:16px; height:16px;"></i>
              <span>تسليم الحل الآن 🚀</span>
            </button>
          </div>
        </form>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    modal.querySelector("#close-submit-asgn-btn")?.addEventListener("click", () => modal.remove());
    modal.querySelector("#cancel-submit-asgn-btn")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    // File upload delegates for file questions
    modal.querySelectorAll(".student-file-input").forEach(fileInp => {
      fileInp.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const box = fileInp.closest(".student-question-box");
        const labelText = box?.querySelector(".file-upload-label-text");
        const statusText = box?.querySelector(".file-upload-status-text");
        const urlInp = box?.querySelector(".student-uploaded-file-url");
        const nameInp = box?.querySelector(".student-uploaded-file-name");
        const prevInline = box?.querySelector(".file-preview-inline");

        if (labelText) labelText.innerText = "جاري الرفع... ⏳";

        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("token");

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });
          if (!res.ok) throw new Error("فشل رفع الملف");
          const data = await res.json();

          if (urlInp) urlInp.value = data.url;
          if (nameInp) nameInp.value = file.name;
          if (statusText) statusText.innerText = `✅ تم رفع: ${file.name}`;
          if (labelText) labelText.innerText = "تغيير الملف 📎";
          if (prevInline) {
            prevInline.style.display = "block";
            prevInline.innerText = `تم إرفاق: ${file.name}`;
          }
          showToast("تم رفع الملف بنجاح! 📎", "success");
        } catch (err) {
          showToast("تعذر رفع الملف، يرجى المحاولة مرة أخرى.", "error");
          if (labelText) labelText.innerText = "اختيار ملف ورفعه 📎";
        }
      });
    });

    // Submit handler
    modal.querySelector("#submit-assignment-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const qBoxes = modal.querySelectorAll(".student-question-box");
      const submitBtn = modal.querySelector("#submit-assignment-confirm-btn");

      let payload = {};

      if (qBoxes.length > 0) {
        const answers = [];
        let missingFile = false;

        qBoxes.forEach(box => {
          const qId = box.getAttribute("data-q-id");
          const qType = box.getAttribute("data-q-type");
          const maxPts = parseFloat(box.getAttribute("data-q-pts")) || 10;

          if (qType === 'mcq') {
            const selectedRadio = box.querySelector(".student-mcq-radio:checked");
            answers.push({
              questionId: qId,
              type: 'mcq',
              selectedOptionId: selectedRadio ? selectedRadio.value : '',
              maxPoints: maxPts
            });
          } else if (qType === 'file') {
            const fileUrl = box.querySelector(".student-uploaded-file-url")?.value;
            const fileName = box.querySelector(".student-uploaded-file-name")?.value;
            if (!fileUrl) missingFile = true;
            answers.push({
              questionId: qId,
              type: 'file',
              fileUrl,
              fileName,
              maxPoints: maxPts
            });
          } else {
            const text = box.querySelector(".student-essay-textarea")?.value.trim() || "";
            answers.push({
              questionId: qId,
              type: 'essay',
              answerText: text,
              maxPoints: maxPts
            });
          }
        });

        if (missingFile) {
          showToast("يرجى رفع الملف المطلوب قبل تسليم الحل.", "warning");
          return;
        }

        payload = { answers };
      } else {
        const content = modal.querySelector("#submission-content-input")?.value.trim();
        payload = { content };
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "جاري الإرسال... ⏳";
      }

      try {
        await apiFetch(`/assignments/${assignmentId}/submit`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast("تم تسليم الواجب بنجاح! 🎉", "success");
        modal.remove();
        this.render();
      } catch (err) {
        showToast(err.message || "فشل تسليم الواجب.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "تسليم الحل الآن 🚀";
        }
      }
    });
  }
}
