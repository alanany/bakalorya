import { apiFetch, state, showToast, t, renderCourseCard } from "../app.js";
import { openGroupPaymentModal } from "./shared/GroupPaymentModal.js";

// Helper to parse and format embed video data
function parseVideoEmbed(url) {
  if (!url || typeof url !== "string") return null;
  const cleanUrl = url.trim();
  if (!cleanUrl) return null;

  // 1. YouTube (watch, youtu.be, embed, shorts)
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      originalUrl: cleanUrl
    };
  }

  // 2. Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return {
      type: "vimeo",
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      thumbnail: null,
      originalUrl: cleanUrl
    };
  }

  // 3. Google Drive
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      type: "drive",
      fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      thumbnail: null,
      originalUrl: cleanUrl
    };
  }

  // 4. HTML5 Direct Video (.mp4, .webm, local uploads)
  if (cleanUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || cleanUrl.startsWith("/uploads/")) {
    return {
      type: "html5",
      embedUrl: cleanUrl,
      thumbnail: null,
      originalUrl: cleanUrl
    };
  }

  // 5. Generic Iframe Embed
  return {
    type: "iframe",
    embedUrl: cleanUrl,
    thumbnail: null,
    originalUrl: cleanUrl
  };
}

export default class TeacherDetailsView {
  constructor(container, teacherId) {
    this.container = container;
    this.teacherId = teacherId || (window.location.hash.split("/")[1] || "").split("?")[0];
    this.teacher = null;
    this.courses = [];
    this.blogs = [];
    this.groups = [];
    this.featuredVideoUrl = null;
    this.featuredVideoTitle = "نبذة مرئية ونموذج لشرح المنهج";
    this.isVideoPlaying = false;
    window.currentTeacherDetailsView = this;
  }

  async render() {
    this.container.innerHTML = `
      <div style="width:100%; max-width:1400px; margin:0 auto; padding:60px 24px 80px;">
        <div style="text-align:center; padding:60px 20px; color:var(--text-muted);" class="glass-card">
          <div class="spinner" style="width:44px; height:44px; margin:0 auto 16px; border-width:3px;"></div>
          <p style="font-weight:700; font-size:1rem;">جارٍ تحميل ملف الأستاذ والدورات والفيديو التعريفي...</p>
        </div>
      </div>
    `;

    if (!this.teacherId) {
      this.renderNotFound();
      return;
    }

    try {
      let enrollmentsPromise = Promise.resolve([]);
      if (state.user && state.user.role === "student") {
        enrollmentsPromise = apiFetch("/student/enrollments").catch(() => []);
      }

      const [teacher, allCourses, allBlogs, reviewsRes, myEnrollments, teacherGroups] = await Promise.all([
        apiFetch(`/teachers/${this.teacherId}`).catch(() => null),
        apiFetch(`/courses`).catch(() => []),
        apiFetch(`/blogs`).catch(() => []),
        apiFetch(`/reviews/teacher/${this.teacherId}`).catch(() => ({ reviews: [], totalReviews: 0, averageRating: 0 })),
        enrollmentsPromise,
        apiFetch(`/teachers/${this.teacherId}/groups`).catch(() => [])
      ]);

      if (!teacher || teacher.error) {
        this.renderNotFound();
        return;
      }

      this.teacher = teacher;
      this.myEnrollments = myEnrollments || [];
      this.blogs = Array.isArray(allBlogs) ? allBlogs.filter(b => b.author?.id === this.teacherId) : [];
      this.teacherReviews = reviewsRes?.reviews || [];
      this.teacherAvgRating = reviewsRes?.averageRating || 4.9;
      this.teacherReviewsCount = reviewsRes?.totalReviews || this.teacherReviews.length;

      // Direct courses where teacher is instructor
      const directCourses = Array.isArray(allCourses) ? allCourses.filter(c => c.teacher?.id === this.teacherId) : [];

      // Also fetch groups from any courses assigned to this teacher
      let courseGroups = [];
      if (directCourses.length > 0) {
        const groupsResults = await Promise.all(
          directCourses.map(c => apiFetch(`/courses/${c.id}/groups`).catch(() => []))
        );
        courseGroups = groupsResults.flat();
      }

      // Merge and deduplicate groups by id
      const groupMap = new Map();
      (Array.isArray(teacherGroups) ? teacherGroups : []).forEach(g => { if (g && g.id) groupMap.set(g.id, g); });
      (courseGroups || []).forEach(g => { if (g && g.id && !groupMap.has(g.id)) groupMap.set(g.id, g); });

      this.groups = Array.from(groupMap.values()).filter(g => g.status !== 'REJECTED');
      this.teacherGroups = this.groups;

      // Populate courses: include direct courses plus any courses linked to teacher's groups
      const courseMap = new Map();
      directCourses.forEach(c => { if (c && c.id) courseMap.set(c.id, c); });
      this.groups.forEach(g => {
        if (g.course && g.course.id && !courseMap.has(g.course.id)) {
          const matchedCourse = (Array.isArray(allCourses) ? allCourses : []).find(ac => ac.id === g.course.id);
          courseMap.set(g.course.id, matchedCourse || g.course);
        }
      });
      this.courses = Array.from(courseMap.values());

      // ── Determine Featured Teacher Video (Above) ────────────────────────────
      const DEFAULT_TEACHER_VIDEO = "https://www.youtube.com/watch?v=im1YjIuVN6A";
      this.featuredVideoUrl = teacher.videoUrl || null;
      this.featuredVideoTitle = "نبذة مرئية ونموذج لشرح المنهج مع الأستاذ";

      // If teacher has no explicit videoUrl, inspect first available course lessons for a sample lecture
      if (!this.featuredVideoUrl && directCourses.length > 0) {
        for (const c of directCourses.slice(0, 3)) {
          try {
            const cDetails = await apiFetch(`/courses/${c.id}`).catch(() => null);
            if (cDetails && Array.isArray(cDetails.lessons)) {
              const lessonWithVid = cDetails.lessons.find(l => l.videoUrl && l.videoUrl.trim().length > 0);
              if (lessonWithVid) {
                this.featuredVideoUrl = lessonWithVid.videoUrl.trim();
                this.featuredVideoTitle = `نموذج لشرح درس: ${lessonWithVid.title || c.title}`;
                break;
              }
            }
          } catch (e) {}
        }
      }

      // Default preview video if still empty
      if (!this.featuredVideoUrl) {
        this.featuredVideoUrl = DEFAULT_TEACHER_VIDEO;
        this.featuredVideoTitle = "فيديو تعريفي ونموذج لشرح المنهج مع الأستاذ";
      }

      this.renderContent();
    } catch (err) {
      console.error("Error loading teacher profile:", err);
      this.renderNotFound();
    }
  }

  renderNotFound() {
    this.container.innerHTML = `
      <div style="max-width:600px; margin:80px auto; text-align:center; padding:48px 28px; border-radius:24px;" class="glass-card">
        <div style="font-size:4rem; margin-bottom:16px;">👨‍🏫</div>
        <h2 style="font-size:1.8rem; font-weight:900; margin-bottom:10px; color:var(--text-main);">ملف الأستاذ غير موجود</h2>
        <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:28px;">عذراً، لم نتمكن من العثور على المعلم المطلوب أو أن الرابط غير صحيح.</p>
        <a href="#landing" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; padding:10px 24px; border-radius:30px; margin:0 auto;">
          <i data-lucide="arrow-right" style="width:16px;height:16px;"></i> العودة للصفحة الرئيسية
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  renderContent() {
    const tProfile = this.teacher || {};
    const name = tProfile.name || "أستاذ متميز";
    const avatar = (tProfile.avatar && !tProfile.avatar.includes('dicebear.com')) ? tProfile.avatar : 'assets/logo.png';
    const education = tProfile.education || "أستاذ وخبير تربوي متميز بالمنصة";
    const location = tProfile.location || "المنصة الرقمية";

    const categories = [...new Set([
      ...(this.courses || []).map(c => c.category).filter(Boolean),
      ...(Array.isArray(tProfile.customCategories) ? tProfile.customCategories : [])
    ])];

    const isOwnerOrAdmin = state.user && (
      String(state.user.id) === String(this.teacherId) ||
      state.user.role === "admin"
    );

    const videoEmbed = parseVideoEmbed(this.featuredVideoUrl);

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    this.container.innerHTML = `
      <div class="teacher-profile-page" style="width:100%; max-width:1420px; margin:0 auto; padding:24px 20px 80px; box-sizing:border-box;">
        
        <!-- Top Navigation / Breadcrumb & Action Row -->
        <div style="margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <a href="#landing" class="btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; padding:8px 16px; border-radius:30px;">
              <i data-lucide="arrow-right" style="width:15px;height:15px;"></i> الرئيسية
            </a>
            <span style="color:var(--text-muted); font-size:0.85rem;">/</span>
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">ملف الأستاذ</span>
            <span style="color:var(--text-muted); font-size:0.85rem;">/</span>
            <strong style="font-size:0.85rem; color:var(--text-main); font-weight:800;">${name}</strong>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" id="copy-teacher-profile-btn" class="btn-secondary" title="نسخ رابط الملف"
              style="padding:8px 14px; border-radius:20px; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <i data-lucide="share-2" style="width:14px;height:14px;"></i> مشاركة الملف 🔗
            </button>
            ${isOwnerOrAdmin ? `
              <button type="button" id="edit-teacher-video-top-btn" class="btn-secondary"
                style="padding:8px 16px; border-radius:20px; font-size:0.82rem; font-weight:800; color:var(--primary); border-color:var(--primary); background:var(--primary-glow); display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <i data-lucide="upload" style="width:14px;height:14px;"></i> رفع أو إضافة فيديو 🎬
              </button>
            ` : ''}
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- 🌟 REDESIGNED HERO SECTION: TEACHER SHOWCASE + VIDEO AT THE TOP 🌟 -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div class="teacher-hero-card glass-card" style="position:relative; overflow:hidden; border-radius:28px; padding:32px; margin-bottom:32px; border:1px solid var(--border-color); box-shadow:0 16px 50px rgba(0,0,0,0.08); background:linear-gradient(135deg, var(--bg-card) 0%, rgba(255,255,255,0.02) 100%);">
          
          <!-- Ambient Glow Background Orbs -->
          <div style="position:absolute; top:-50px; right:-50px; width:320px; height:320px; background:radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%); border-radius:50%; filter:blur(50px); pointer-events:none; z-index:0;"></div>
          <div style="position:absolute; bottom:-60px; left:-60px; width:300px; height:300px; background:radial-gradient(circle, rgba(229,29,116,0.12) 0%, transparent 70%); border-radius:50%; filter:blur(50px); pointer-events:none; z-index:0;"></div>
          <div style="position:absolute; top:40%; left:45%; width:240px; height:240px; background:radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%); border-radius:50%; filter:blur(60px); pointer-events:none; z-index:0;"></div>

          <div style="position:relative; z-index:2; display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:36px; align-items:center;">
            
            <!-- ── Column 1: Teacher Bio & Action Hub ── -->
            <div style="display:flex; flex-direction:column; justify-content:center; gap:18px;">
              
              <!-- Badges Ribbon -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(16,185,129,0.15); color:#10b981; font-size:0.78rem; font-weight:800; padding:5px 12px; border-radius:20px; border:1px solid rgba(16,185,129,0.3);">
                  <span style="width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
                  متاح للحصص المباشرة والخاصة
                </span>
                <span style="display:inline-flex; align-items:center; gap:4px; background:rgba(245,158,11,0.15); color:#f59e0b; font-size:0.78rem; font-weight:800; padding:5px 12px; border-radius:20px; border:1px solid rgba(245,158,11,0.3);">
                  ⭐ ${this.teacherAvgRating > 0 ? this.teacherAvgRating : '4.95'} تقييم ممتاز (${this.teacherReviewsCount})
                </span>
                <span style="display:inline-flex; align-items:center; gap:4px; background:rgba(99,102,241,0.12); color:#6366f1; font-size:0.78rem; font-weight:800; padding:5px 12px; border-radius:20px;">
                  🛡️ معتمد وموثوق
                </span>
              </div>

              <!-- Avatar & Name Header -->
              <div style="display:flex; align-items:center; gap:20px;">
                <div style="position:relative; flex-shrink:0;">
                  <img src="${avatar}" alt="${name}" 
                    style="width:96px; height:96px; border-radius:50%; object-fit:cover; border:3px solid var(--primary); background:var(--bg-app); box-shadow:0 10px 25px rgba(0,0,0,0.15);">
                  <span style="position:absolute; bottom:2px; left:2px; background:#10b981; color:#fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:900; border:2px solid var(--bg-card);" title="أستاذ موثوق ومعتمد">
                    ✓
                  </span>
                </div>

                <div>
                  <h1 style="font-size:2.1rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0; line-height:1.2;">
                    ${name}
                  </h1>
                  <p style="font-size:0.98rem; font-weight:800; color:var(--primary); margin:0 0 6px 0; line-height:1.4;">
                    ${education}
                  </p>
                  <div style="display:flex; gap:14px; font-size:0.82rem; color:var(--text-muted); font-weight:700;">
                    <span style="display:flex; align-items:center; gap:5px;">
                      <i data-lucide="map-pin" style="width:14px; height:14px; color:var(--primary);"></i> ${location}
                    </span>
                    <span style="display:flex; align-items:center; gap:5px;">
                      <i data-lucide="book-open" style="width:14px; height:14px; color:#e51d74;"></i> ${this.courses.length} دورات
                    </span>
                  </div>
                </div>
              </div>

              <!-- Quick Highlight Stats Grid -->
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:18px; padding:14px 16px;">
                <div style="text-align:center;">
                  <div style="font-size:1.35rem; font-weight:900; color:#e51d74; line-height:1.1;">${this.groups.length}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-top:2px;">مجموعات متاحة</div>
                </div>
                <div style="text-align:center; border-right:1px solid var(--border-color); border-left:1px solid var(--border-color);">
                  <div style="font-size:1.35rem; font-weight:900; color:#10b981; line-height:1.1;">1-on-1</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-top:2px;">حصص فردية</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:1.35rem; font-weight:900; color:#f59e0b; line-height:1.1;">%99</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700; margin-top:2px;">رضا الطلاب</div>
                </div>
              </div>

              <!-- Specialties Tags -->
              ${categories.length > 0 ? `
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                  <span style="font-size:0.76rem; font-weight:800; color:var(--text-muted);">المواد:</span>
                  ${categories.slice(0, 4).map(c => `
                    <span style="background:var(--bg-app); border:1px solid var(--border-color); font-size:0.76rem; font-weight:700; padding:4px 10px; border-radius:14px; color:var(--text-main);">
                      ${c}
                    </span>
                  `).join('')}
                </div>
              ` : ''}

              <!-- Primary Action CTAs (No WhatsApp/تواصل button as requested) -->
              <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:4px;">
                <button type="button" class="btn-primary teacher-request-private-btn" onclick="window.currentTeacherDetailsView?.openRequestPrivateSessionModal()"
                  style="padding:12px 26px; border-radius:30px; font-size:0.92rem; font-weight:900; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; display:inline-flex; align-items:center; gap:8px; box-shadow:0 6px 20px rgba(16,185,129,0.35); cursor:pointer;">
                  <i data-lucide="sparkles" style="width:16px;height:16px;"></i> طلب حصة خاصة (1-on-1) 🎯
                </button>

                <button type="button" id="scroll-to-teacher-groups-btn" class="btn-secondary" onclick="document.getElementById('teacher-groups-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"
                  style="cursor:pointer; text-decoration:none; padding:12px 22px; border-radius:30px; font-size:0.9rem; font-weight:800; color:#e51d74; border:1px solid rgba(229,29,116,0.3); background:rgba(229,29,116,0.06); display:inline-flex; align-items:center; gap:8px;">
                  <i data-lucide="users" style="width:16px;height:16px;"></i> المجموعات الدراسية (${this.groups.length}) 👥
                </button>
              </div>

            </div>

            <!-- ── Column 2: Featured Video Showcase (In Above / At the Top!) ── -->
            <div class="teacher-hero-video-card" style="display:flex; flex-direction:column; gap:12px;">
              
              <!-- Video Frame Card Header -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="width:10px; height:10px; border-radius:50%; background:#ef4444; box-shadow:0 0 8px #ef4444; display:inline-block;"></span>
                  <span style="font-size:0.86rem; font-weight:900; color:var(--text-main); display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="play-circle" style="width:16px;height:16px; color:#ef4444;"></i>
                    ${this.featuredVideoTitle}
                  </span>
                </div>
                <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px;">
                  🎬 فيديو تعريفي HD
                </span>
              </div>

              <!-- 16:9 Cinema Aspect Ratio Viewport -->
              <div id="teacher-video-viewport" 
                style="position:relative; width:100%; aspect-ratio:16/9; border-radius:20px; overflow:hidden; background:#0b0f19; border:2px solid rgba(99,102,241,0.25); box-shadow:0 14px 40px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center;">
                
                ${this.renderVideoPlayerContent(videoEmbed, avatar, name, isOwnerOrAdmin)}

              </div>

              <!-- Video Bottom Meta & Controls -->
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding:0 4px;">
                <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="info" style="width:14px;height:14px;color:var(--primary);"></i>
                  شاهد نموذجاً حياً من أسلوب الشرح التفاعلي وطريقة إيصال المعلومة
                </span>

                ${isOwnerOrAdmin ? `
                  <button type="button" id="edit-teacher-video-card-btn"
                    style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:12px; cursor:pointer; font-size:0.78rem; font-weight:800; color:var(--primary); display:inline-flex; align-items:center; gap:5px; padding:4px 10px;">
                    <i data-lucide="upload" style="width:13px;height:13px;"></i> رفع أو تعديل الفيديو ✏️
                  </button>
                ` : ''}
              </div>

            </div>

          </div>

        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- QUICK NAVIGATION PILLS                                              -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:32px; padding:8px 0;">
          <a href="#teacher-groups-section" onclick="document.getElementById('teacher-groups-section')?.scrollIntoView({behavior:'smooth'}); return false;"
            class="btn-secondary" style="padding:8px 18px; border-radius:20px; font-size:0.84rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="users" style="width:15px;height:15px;color:#e51d74;"></i> المجموعات الدراسية (${this.groups.length})
          </a>
          <a href="#teacher-private-section" onclick="document.getElementById('teacher-private-section')?.scrollIntoView({behavior:'smooth'}); return false;"
            class="btn-secondary" style="padding:8px 18px; border-radius:20px; font-size:0.84rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="target" style="width:15px;height:15px;color:#10b981;"></i> الحصص الخاصة (1-on-1)
          </a>
          <a href="#teacher-bio-section" onclick="document.getElementById('teacher-bio-section')?.scrollIntoView({behavior:'smooth'}); return false;"
            class="btn-secondary" style="padding:8px 18px; border-radius:20px; font-size:0.84rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="graduation-cap" style="width:15px;height:15px;color:var(--primary);"></i> المؤهلات والتخصص
          </a>
          ${this.blogs.length > 0 ? `
            <a href="#teacher-blogs-section" onclick="document.getElementById('teacher-blogs-section')?.scrollIntoView({behavior:'smooth'}); return false;"
              class="btn-secondary" style="padding:8px 18px; border-radius:20px; font-size:0.84rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="newspaper" style="width:15px;height:15px;color:#ec4899;"></i> المقالات (${this.blogs.length})
            </a>
          ` : ''}
          <a href="#teacher-reviews-section" onclick="document.getElementById('teacher-reviews-section')?.scrollIntoView({behavior:'smooth'}); return false;"
            class="btn-secondary" style="padding:8px 18px; border-radius:20px; font-size:0.84rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="star" style="width:15px;height:15px;color:#f59e0b;"></i> آراء الطلاب (${this.teacherReviewsCount})
          </a>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- SECTION: DEDICATED 1-ON-1 PRIVATE SESSIONS                          -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div id="teacher-private-section" class="glass-card" style="border-radius:24px; padding:32px; margin-bottom:36px; border:1px solid rgba(16,185,129,0.25); background:linear-gradient(135deg, rgba(16,185,129,0.06), rgba(99,102,241,0.04)); box-shadow:0 10px 30px rgba(0,0,0,0.04); position:relative; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; margin-bottom:20px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                <span class="badge" style="background:rgba(16,185,129,0.18); color:#10b981; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">
                  🎯 1-on-1 مباشر وتفاعلي
                </span>
                <span class="badge" style="background:rgba(99,102,241,0.15); color:#6366f1; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:20px;">
                  ⚡ مرونة تامة في التوقيت
                </span>
              </div>
              <h2 style="font-size:1.45rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0;">
                الحصص الخاصة والاستشارات الفردية مع الأستاذ ${name}
              </h2>
              <p style="font-size:0.9rem; color:var(--text-muted); margin:0; max-width:700px; line-height:1.6;">
                احصل على جلسة خاصة فردية مباشرة (صوت وصورة مع سبورة رقمية تفاعلية) لشرح المنهج، حل التمارين ونماذج الامتحانات، والإجابة على كافة تساؤلاتك بشكل حصري ومخصص لك.
              </p>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button type="button" class="btn-primary teacher-request-private-btn" onclick="window.currentTeacherDetailsView?.openRequestPrivateSessionModal()"
                style="padding:12px 24px; border-radius:30px; font-size:0.92rem; font-weight:900; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 16px rgba(16,185,129,0.35); cursor:pointer;">
                <i data-lucide="calendar-plus"></i> طلب حجز حصة خاصة الآن 🚀
              </button>
              <a href="#subscription-plans?teacherId=${this.teacherId}" class="btn-secondary"
                style="text-decoration:none; padding:12px 20px; border-radius:30px; font-size:0.9rem; font-weight:800; color:var(--primary); border-color:var(--primary); display:inline-flex; align-items:center; gap:6px;">
                <i data-lucide="sparkles"></i> باقات واشتراكات الحصص 💳
              </a>
            </div>
          </div>

          <!-- Feature Bullets -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; border-top:1px dashed var(--border-color); padding-top:20px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:10px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="video" style="width:18px; height:18px;"></i>
              </div>
              <span style="font-size:0.84rem; font-weight:800; color:var(--text-main);">فصل دراسي مباشر وفردي</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:10px; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="target" style="width:18px; height:18px;"></i>
              </div>
              <span style="font-size:0.84rem; font-weight:800; color:var(--text-main);">تركيز كامل على نقاط ضعفك</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:10px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="clock" style="width:18px; height:18px;"></i>
              </div>
              <span style="font-size:0.84rem; font-weight:800; color:var(--text-main);">تنسيق مرن لموعد الحصة</span>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- SECTION: ACADEMIC QUALIFICATIONS & SPECIALTIES                      -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div id="teacher-bio-section" class="glass-card" style="border-radius:24px; padding:28px 32px; margin-bottom:36px; border:1px solid var(--border-color);">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <div style="width:42px; height:42px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:900; margin:0 0 2px 0; color:var(--text-main);">المؤهل العلمي والتخصص الأكاديمي</h3>
              <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">الاعتماد الأكاديمي والخبرة المهنية للأستاذ بالمنصة</p>
            </div>
          </div>

          <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:18px 22px;">
            <div style="display:flex; align-items:center; gap:10px; font-size:1rem; font-weight:800; color:var(--primary);">
              <i data-lucide="award" style="width:20px; height:20px;"></i>
              <span>${education}</span>
            </div>
            ${tProfile.bio ? `
              <p style="margin:12px 0 0 0; font-size:0.9rem; color:var(--text-muted); line-height:1.7; border-top:1px dashed var(--border-color); padding-top:12px; white-space:pre-wrap;">
                ${tProfile.bio}
              </p>
            ` : `
              <p style="margin:12px 0 0 0; font-size:0.88rem; color:var(--text-muted); line-height:1.6; border-top:1px dashed var(--border-color); padding-top:12px;">
                معلم ذو خبرة عالية في تبسيط المناهج التعليمية وتدريب الطلاب على حل الامتحانات النموذجية وتحقيق أعلى الدرجات في البكالوريا.
              </p>
            `}
          </div>

          ${categories.length > 0 ? `
            <div style="margin-top:20px;">
              <h4 style="font-size:0.92rem; font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:6px; color:var(--text-main);">
                <i data-lucide="layers" style="width:16px;height:16px;color:var(--primary);"></i> المواد والتخصصات التي يدرّسها الأستاذ:
              </h4>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${categories.map(cat => `
                  <span style="background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-main); font-size:0.84rem; font-weight:700; padding:6px 14px; border-radius:18px;">
                    ✨ ${cat}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- SECTION: TEACHER'S LIVE GROUPS                                      -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div id="teacher-groups-section" style="margin-bottom:48px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:10px;">
            <div>
              <h2 style="font-size:1.5rem; font-weight:900; margin:0 0 4px 0; display:flex; align-items:center; gap:10px;">
                <i data-lucide="users" style="color:#e51d74;"></i>
                المجموعات والحصص الدراسية المتاحة للأستاذ (${this.groups.length}) 👥
              </h2>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                انضم لمجموعات الحصص المباشرة والجدول الأسبوعي مع الأستاذ ${name}
              </p>
            </div>
          </div>

          ${this.groups.length === 0 ? `
            <div class="glass-card" style="text-align:center; padding:48px; color:var(--text-muted); border-radius:20px;">
              <i data-lucide="users" style="width:48px; height:48px; opacity:0.3; margin-bottom:12px; color:#e51d74;"></i>
              <h4 style="font-weight:800; margin:0 0 6px 0; color:var(--text-main);">لا توجد مجموعات دراسية مفتوحة حالياً</h4>
              <p style="font-size:0.88rem; margin:0;">تابع الصفحة وسيتم فتح مجموعات دراسية جديدة قريباً.</p>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:22px;">
              ${this.groups.map(grp => {
                const enrolled = grp.enrolledCount || 0;
                const maxCap = grp.maxStudents || 25;
                const available = grp.availableSeats !== undefined ? grp.availableSeats : Math.max(0, maxCap - enrolled);
                const capPct = Math.min(100, Math.round((enrolled / maxCap) * 100));
                const isFull = grp.isFull || available <= 0;
                const isClosed = grp.status === 'IN_PROGRESS' || grp.status === 'CLOSED';
                const startDateText = grp.startDate ? formatArabicDate(grp.startDate) : "الأحد 13 سبتمبر 2026";
                const endDateText = grp.endDate ? formatArabicDate(grp.endDate) : "الأربعاء 2 ديسمبر 2026";

                return `
                  <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; gap:14px; background:var(--bg-card); position:relative; overflow:hidden;">
                    <div style="position:absolute; top:0; right:0; left:0; height:4px; background:linear-gradient(90deg, #e51d74, #6366f1);"></div>

                    <div>
                      <!-- Header Badges -->
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px;">
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                          ${(grp.course?.subject?.name || grp.course?.title) ? `<span class="badge" style="background:rgba(229,29,116,0.12); color:#e51d74; font-size:0.75rem; font-weight:800;">${grp.course?.subject?.name || grp.course?.title}</span>` : ''}
                          ${grp.course?.grade?.name ? `<span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.75rem;">${grp.course.grade.name}</span>` : ''}
                        </div>
                        <div>
                          ${isClosed
                            ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.12); color:#6366f1;">🔒 بدأت الدراسة</span>`
                            : isFull
                              ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(239,68,68,0.12); color:#ef4444;">مكتملة 🔒</span>`
                              : (grp.status === 'PENDING_APPROVAL' || grp.status === 'PENDING')
                                ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(245,158,11,0.12); color:#d97706;">⏳ قيد المراجعة</span>`
                                : `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981;">متاح للتسجيل 🟢</span>`
                          }
                        </div>
                      </div>

                      <h4 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0 0 8px 0; line-height:1.3;">
                        👥 ${grp.name || `مجموعة ${grp.scheduleDays || ''}`}
                      </h4>

                      <!-- Schedule Pill -->
                      <div style="padding:8px 12px; border-radius:12px; background:rgba(229,29,116,0.06); color:#e51d74; font-size:0.82rem; font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="calendar" style="width:14px;height:14px;"></i>
                        <span>الجدول: ${grp.scheduleText || `${grp.scheduleDays || ''} ${grp.scheduleTime || ''}`}</span>
                      </div>

                      <!-- Dates Row -->
                      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:10px; padding:6px 10px; font-size:0.75rem; margin-bottom:10px;">
                        <div>
                          <span style="color:var(--text-muted); font-weight:700; display:block;">البدء:</span>
                          <strong style="color:var(--text-main);">${startDateText}</strong>
                        </div>
                        <div>
                          <span style="color:var(--text-muted); font-weight:700; display:block;">الانتهاء:</span>
                          <strong style="color:var(--text-main);">${endDateText}</strong>
                        </div>
                      </div>

                      <!-- Capacity Progress Bar -->
                      <div style="padding:10px 12px; border-radius:12px; background:var(--bg-app); border:1px solid var(--border-color); margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:800; color:var(--text-muted); margin-bottom:4px;">
                          <span>👥 المقاعد: ${enrolled} من ${maxCap}</span>
                          <span style="color:${available <= 3 ? '#ef4444' : '#10b981'};">
                            ${available > 0 ? `(${available} متبقي)` : 'مكتملة'}
                          </span>
                        </div>
                        <div style="width:100%; height:6px; background:var(--bg-card); border-radius:10px; overflow:hidden;">
                          <div style="width:${capPct}%; height:100%; background:${capPct >= 90 ? '#ef4444' : '#10b981'}; border-radius:10px;"></div>
                        </div>
                      </div>

                    </div>

                    <!-- Footer Action -->
                    <div style="border-top:1px solid var(--border-color); padding-top:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                      <a href="#course-details/${grp.course?.id || ''}/${grp.id}" class="btn-secondary" style="padding:7px 14px; border-radius:12px; font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                        <i data-lucide="book-open" style="width:14px;height:14px;"></i>
                        <span>تفاصيل المقرر 📖</span>
                      </a>
                      ${(() => {
                        const isOwner = state.user && (state.user.id === this.teacherId || state.user.id === grp.teacher?.id);
                        if (isOwner) {
                          return `
                            <a href="#teacher/groups" class="btn-secondary" style="padding:7px 14px; border-radius:12px; font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:#e51d74; border-color:rgba(229,29,116,0.3);">
                              <i data-lucide="settings" style="width:14px;height:14px;"></i>
                              <span>إدارة مجموعاتي ⚙️</span>
                            </a>
                          `;
                        }

                        if (grp.status === 'PENDING_APPROVAL' || grp.status === 'PENDING') {
                          return `
                            <div style="padding:6px 14px; border-radius:12px; font-weight:800; font-size:0.8rem; background:rgba(245, 158, 11, 0.12); border:1.5px solid #f59e0b; color:#d97706; display:inline-flex; align-items:center; gap:4px;">
                              <span>⏳ قيد اعتماد الإدارة</span>
                            </div>
                          `;
                        }

                        const myEnrollment = (this.myEnrollments || []).find(e => 
                          e.group?.id && String(e.group.id) === String(grp.id)
                        );
                        const isPending = myEnrollment && (myEnrollment.status === 'pending' || myEnrollment.status === 'PENDING');
                        const isActive = myEnrollment && (myEnrollment.status === 'active' || myEnrollment.status === 'ACTIVE');

                        if (isPending) {
                          return `
                            <div style="padding:6px 14px; border-radius:12px; font-weight:800; font-size:0.8rem; background:rgba(245, 158, 11, 0.12); border:1.5px solid #f59e0b; color:#d97706; display:inline-flex; align-items:center; gap:4px;">
                              <span>⏳ قيد المراجعة</span>
                            </div>
                          `;
                        }

                        if (isActive) {
                          return `
                            <div style="padding:6px 14px; border-radius:12px; font-weight:800; font-size:0.8rem; background:rgba(16, 185, 129, 0.12); border:1.5px solid #10b981; color:#059669; display:inline-flex; align-items:center; gap:4px;">
                              <span>✓ مسجل بالمجموعة</span>
                            </div>
                          `;
                        }

                        if (isFull || isClosed) {
                          return `
                            <button type="button" class="btn-secondary" disabled style="padding:8px 16px; border-radius:14px; font-size:0.82rem; opacity:0.6; cursor:not-allowed;">
                              <span>التسجيل مغلق 🔒</span>
                            </button>
                          `;
                        }

                        return `
                          <button type="button" class="btn-primary teacher-group-enroll-btn"
                            data-group-id="${grp.id}"
                            data-course-id="${grp.course?.id || ''}"
                            style="padding:8px 18px; border-radius:14px; font-weight:800; font-size:0.82rem; background:#e51d74; border-color:#e51d74; cursor:pointer;">
                            <span>تسجيل بالمجموعة 🚀</span>
                          </button>
                        `;
                      })()}
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- SECTION: TEACHER'S BLOGS & ARTICLES                                 -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        ${this.blogs.length > 0 ? `
          <div id="teacher-blogs-section" style="margin-bottom:48px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h2 style="font-size:1.5rem; font-weight:900; margin:0; display:flex; align-items:center; gap:10px;">
                <i data-lucide="newspaper" style="color:#ec4899;"></i> مقالات وإرشادات الأستاذ (${this.blogs.length})
              </h2>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:22px;">
              ${this.blogs.map(blog => `
                <div class="glass-card" style="border-radius:20px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; cursor:pointer;" onclick="window.location.hash='#blog/${blog.id}'">
                  <div>
                    <div style="position:relative; height:170px; overflow:hidden;">
                      <img src="${blog.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600'}" style="width:100%; height:100%; object-fit:cover;">
                      <span style="position:absolute; top:12px; right:12px; background:var(--primary); color:#ffffff; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px;">
                        ${blog.category || 'عام'}
                      </span>
                    </div>
                    <div style="padding:20px;">
                      <div style="font-size:0.78rem; color:var(--text-muted); font-weight:600; margin-bottom:8px;">${new Date(blog.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} • ${blog.readTime || 'قراءة'}</div>
                      <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-color); margin:0 0 10px 0; line-height:1.4;">${blog.title}</h3>
                      <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">${blog.content.substring(0, 100)}...</p>
                    </div>
                  </div>
                  <div style="padding:14px 20px; border-top:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
                    <span style="font-size:0.78rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="book-open" style="width:14px;height:14px;color:var(--primary);"></i> مقال تعليمي
                    </span>
                    <span style="font-size:0.82rem; font-weight:800; color:var(--primary);">اقرأ المقال ➔</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- SECTION: REVIEWS & FEEDBACK                                         -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div id="teacher-reviews-section" class="glass-card" style="border-radius:24px; padding:32px; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; border-bottom:1px solid var(--border-color); padding-bottom:20px; margin-bottom:28px;">
            <div>
              <h2 style="font-size:1.5rem; font-weight:900; margin:0 0 6px 0; display:flex; align-items:center; gap:10px;">
                <i data-lucide="star" style="color:#f59e0b; fill:#f59e0b; width:26px; height:26px;"></i>
                آراء وتقييمات الطلاب في الأستاذ ${name}
              </h2>
              <p style="font-size:0.88rem; color:var(--text-muted); margin:0;">انطباعات الطلاب المسجلين حول أسلوب الشرح والتفاعل والاستفادة.</p>
            </div>
            <div style="text-align:center; background:rgba(245,158,11,0.08); padding:12px 28px; border-radius:18px; border:1px solid rgba(245,158,11,0.2);">
              <div style="font-size:2.4rem; font-weight:900; color:#f59e0b; line-height:1;">${this.teacherAvgRating > 0 ? this.teacherAvgRating : '4.9'}</div>
              <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-top:4px;">من 5 نجوم • (${this.teacherReviewsCount} تقييم)</div>
            </div>
          </div>

          <!-- Add Review Form -->
          ${state.user ? `
            <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:18px; padding:24px; margin-bottom:32px;">
              <h3 style="font-size:1.05rem; font-weight:800; margin:0 0 14px 0;">أضف تقييمك للأستاذ ${name} ✍️</h3>
              <form id="submit-teacher-review-form">
                <div style="margin-bottom:16px;">
                  <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:8px;">اختر عدد النجوم:</label>
                  <div style="display:flex; gap:8px; align-items:center;">
                    ${[1, 2, 3, 4, 5].map(s => `
                      <button type="button" class="teacher-star-btn" data-star="${s}" style="background:none; border:none; cursor:pointer; padding:4px;">
                        <i data-lucide="star" class="teacher-star-icon" data-star="${s}" style="width:30px; height:30px; color:#f59e0b; fill:#f59e0b;"></i>
                      </button>
                    `).join('')}
                  </div>
                  <input type="hidden" id="teacher-selected-rating-val" value="5">
                </div>

                <div style="margin-bottom:18px;">
                  <label for="teacher-review-comment" style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">اكتب رأيك في أسلوب الشرح والتجاوب:</label>
                  <textarea id="teacher-review-comment" class="form-input" style="width:100%; height:95px; resize:vertical; padding:12px;" placeholder="شارك الطلاب الآخرين تجربتك مع هذا الأستاذ..." required></textarea>
                </div>

                <button type="submit" class="btn-primary" style="font-size:0.9rem; padding:10px 24px; border-radius:30px;">
                  <i data-lucide="send"></i> نشر التقييم للأستاذ
                </button>
              </form>
            </div>
          ` : `
            <div style="text-align:center; padding:20px; background:var(--bg-app); border-radius:14px; border:1px solid var(--border-color); margin-bottom:28px;">
              <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">يرجى <a href="#login" style="color:var(--primary); font-weight:800;">تسجيل الدخول كطالب</a> لإضافة تقييمك لهذا الأستاذ.</p>
            </div>
          `}

          <!-- Reviews List -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${(this.teacherReviews || []).length === 0 ? `
              <div style="text-align:center; padding:40px; color:var(--text-muted);">
                <i data-lucide="star" style="width:40px; height:40px; opacity:0.3; margin-bottom:8px;"></i>
                <p style="margin:0;">لا توجد تقييمات مضافة لهذا الأستاذ بعد. كُن أول من يقيمه!</p>
              </div>
            ` : (this.teacherReviews || []).map(r => `
              <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${(r.student?.avatar && !r.student.avatar.includes('dicebear.com')) ? r.student.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:44px; height:44px; border-radius:50%; border:2px solid var(--primary); object-fit:cover;">
                    <div>
                      <strong style="font-size:0.95rem; color:var(--text-color); display:block;">${r.student?.name || 'طالب مسجل'}</strong>
                      <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(r.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })} ${r.course ? `• دورة: ${r.course.title}` : ''}</span>
                    </div>
                  </div>
                  <div style="display:flex; gap:2px; background:rgba(245,158,11,0.12); padding:4px 10px; border-radius:12px;">
                    ${Array.from({ length: 5 }).map((_, i) => `
                      <i data-lucide="star" style="width:14px; height:14px; color:${i < r.rating ? '#f59e0b' : 'var(--border-color)'}; ${i < r.rating ? 'fill:#f59e0b;' : ''}"></i>
                    `).join('')}
                  </div>
                </div>
                <p style="font-size:0.9rem; color:var(--text-color); margin:0; line-height:1.5; white-space:pre-wrap;">${r.comment}</p>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Render Video Player Content (Thumbnail + Play Button or Active Iframe/Video) ──
  renderVideoPlayerContent(embed, avatar, name, isOwnerOrAdmin) {
    if (!embed || !embed.embedUrl) {
      return `
        <div style="text-align:center; padding:32px 20px; color:#fff;">
          <div style="width:64px; height:64px; border-radius:50%; background:rgba(99,102,241,0.2); color:#6366f1; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
            <i data-lucide="video" style="width:32px; height:32px;"></i>
          </div>
          <h4 style="font-size:1.1rem; font-weight:800; margin:0 0 6px 0; color:#fff;">فيديو تعريفي للأستاذ</h4>
          <p style="font-size:0.85rem; color:rgba(255,255,255,0.7); margin:0 0 16px 0;">لم يتم رفع فيديو تعريفي بعد من قبل المعلم.</p>
          ${isOwnerOrAdmin ? `
            <button type="button" class="btn-primary" onclick="window.currentTeacherDetailsView?.openEditVideoModal()"
              style="font-size:0.84rem; padding:10px 22px; border-radius:24px; display:inline-flex; align-items:center; gap:6px;">
              <i data-lucide="upload" style="width:16px;height:16px;"></i> رفع أو إضافة فيديو تعريفي الآن 🎬
            </button>
          ` : ''}
        </div>
      `;
    }

    if (this.isVideoPlaying) {
      if (embed.type === "html5") {
        return `
          <video controls autoplay playsinline style="width:100%; height:100%; object-fit:contain; border:none; outline:none; background:#000;">
            <source src="${embed.embedUrl}">
            متصفحك لا يدعم تشغيل هذا الفيديو.
          </video>
        `;
      }
      return `
        <iframe src="${embed.embedUrl}" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen 
          style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; outline:none;">
        </iframe>
      `;
    }

    // High quality Poster / Thumbnail Preview with Animated Play Trigger
    const thumbnail = embed.thumbnail || (this.courses[0]?.image || avatar);
    return `
      <div id="teacher-play-video-overlay" style="position:relative; width:100%; height:100%; cursor:pointer; overflow:hidden;">
        <!-- Backdrop Poster Image -->
        <img src="${thumbnail}" alt="${name}" 
          style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.7) contrast(1.05); transition:transform 0.4s ease;">
        
        <!-- Dark Gradient Overlay -->
        <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%);"></div>

        <!-- Center Glowing Play Button -->
        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; z-index:2;">
          <div style="width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg, #e51d74, #6366f1); display:flex; align-items:center; justify-content:center; box-shadow:0 0 35px rgba(229,29,116,0.6); transition:transform 0.25s ease;" class="play-btn-pulse">
            <i data-lucide="play" style="width:32px; height:32px; color:#ffffff; fill:#ffffff; margin-right:-3px;"></i>
          </div>
          <span style="color:#ffffff; font-weight:800; font-size:0.95rem; text-shadow:0 2px 10px rgba(0,0,0,0.8); background:rgba(0,0,0,0.5); padding:5px 14px; border-radius:20px; backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.2);">
            ▶ اضغط لمشاهدة شرح الأستاذ
          </span>
        </div>

        <!-- Top Right Mini Badge -->
        <div style="position:absolute; top:12px; right:12px; z-index:2; display:flex; gap:6px;">
          <span style="background:rgba(15,23,42,0.75); color:#fff; font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:12px; backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.15);">
            🎥 نموذج المحاضرة
          </span>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Play video trigger
    const playTrigger = this.container.querySelector("#teacher-play-video-overlay");
    if (playTrigger) {
      playTrigger.addEventListener("click", () => {
        this.isVideoPlaying = true;
        const viewport = this.container.querySelector("#teacher-video-viewport");
        if (viewport) {
          const videoEmbed = parseVideoEmbed(this.featuredVideoUrl);
          const isOwnerOrAdmin = state.user && (
            String(state.user.id) === String(this.teacherId) ||
            state.user.role === "admin"
          );
          viewport.innerHTML = this.renderVideoPlayerContent(videoEmbed, this.teacher?.avatar, this.teacher?.name, isOwnerOrAdmin);
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    // Copy profile link button
    this.container.querySelector("#copy-teacher-profile-btn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("تم نسخ رابط الملف الشخصي للأستاذ! 🔗", "success");
      } catch (e) {
        showToast("يمكنك مشاركة الرابط من شريط العنوان.", "info");
      }
    });

    // Edit video modal triggers
    this.container.querySelector("#edit-teacher-video-top-btn")?.addEventListener("click", () => {
      this.openEditVideoModal();
    });
    this.container.querySelector("#edit-teacher-video-card-btn")?.addEventListener("click", () => {
      this.openEditVideoModal();
    });

    // Star rating buttons in review form
    const starBtns = this.container.querySelectorAll(".teacher-star-btn");
    const ratingInput = this.container.querySelector("#teacher-selected-rating-val");

    starBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const star = parseInt(btn.getAttribute("data-star"), 10);
        if (ratingInput) ratingInput.value = star;

        starBtns.forEach(b => {
          const s = parseInt(b.getAttribute("data-star"), 10);
          const icon = b.querySelector(".teacher-star-icon");
          if (icon) {
            if (s <= star) {
              icon.style.color = "#f59e0b";
              icon.style.fill = "#f59e0b";
            } else {
              icon.style.color = "var(--border-color)";
              icon.style.fill = "none";
            }
          }
        });
      });
    });

    // Scroll to groups button
    this.container.querySelector("#scroll-to-teacher-groups-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("teacher-groups-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Group Enroll Buttons
    this.container.querySelectorAll(".teacher-group-enroll-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const groupId = btn.getAttribute("data-group-id");
        const groupObj = (this.groups || this.teacherGroups || []).find(g => g.id === groupId) || {};
        const courseObj = groupObj.course || (this.courses || []).find(c => c.id === (btn.getAttribute("data-course-id") || groupObj.courseId || groupObj.course?.id)) || {};

        openGroupPaymentModal({
          courseId: courseObj.id || groupObj.course?.id,
          courseTitle: courseObj.title || "الدورة التعليمية",
          courseImage: courseObj.image || this.teacher?.avatar,
          groupId: groupObj.id || groupId,
          groupName: groupObj.name || "المجموعة الدراسية",
          teacherName: this.teacher?.name || "الأستاذ",
          subjectName: courseObj.subject?.name || courseObj.category || "",
          scheduleDays: groupObj.scheduleDays || "الأحد والأربعاء",
          scheduleTime: groupObj.scheduleTime || "06:00 م",
          sessionPrice: groupObj.sessionPrice || 40,
          monthlyPrice: groupObj.monthlyPrice || 320,
          totalSessions: groupObj.totalSessions || 24,
          onSuccess: async () => {
            await this.render();
          }
        });
      });
    });

    // Request Private Session Buttons
    this.container.querySelectorAll(".teacher-request-private-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.openRequestPrivateSessionModal();
      };
    });

    // Review submission form
    this.container.querySelector("#submit-teacher-review-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rating = parseInt(this.container.querySelector("#teacher-selected-rating-val")?.value || "5", 10);
      const comment = this.container.querySelector("#teacher-review-comment")?.value || "";

      try {
        await apiFetch("/reviews", {
          method: "POST",
          body: JSON.stringify({ rating, comment, teacherId: this.teacherId })
        });
        showToast("تم إرسال تقييمك للأستاذ بنجاح! ⭐", "success");
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل إرسال التقييم", "error");
      }
    });
  }

  // ── Modal to Upload or Add Video for Teacher (Admin & Teacher Enabled) ──────
  openEditVideoModal() {
    document.getElementById("edit-teacher-video-modal")?.remove();

    const currentUrl = (this.teacher?.videoUrl || "").trim();
    const isAdmin = state.user?.role === "admin";

    const modal = document.createElement("div");
    modal.id = "edit-teacher-video-modal";
    modal.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0;
      background:rgba(15,23,42,0.78); backdrop-filter:blur(12px);
      z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;
      animation:fadeIn 0.2s ease;
    `;

    modal.innerHTML = `
      <div class="glass-card" style="width:100%; max-width:580px; max-height:92vh; overflow-y:auto; border-radius:26px; padding:28px 30px; background:var(--bg-card); border:1px solid var(--border-color); box-shadow:0 24px 70px rgba(0,0,0,0.35); position:relative; box-sizing:border-box;">
        
        <button type="button" id="close-edit-video-btn" 
          style="position:absolute; top:20px; left:20px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted);">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>

        <!-- Header -->
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
          <div style="width:46px; height:46px; border-radius:14px; background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(229,29,116,0.15)); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i data-lucide="video" style="width:24px; height:24px;"></i>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">
                إدارة الفيديو التعريفي للأستاذ
              </h3>
              ${isAdmin ? `
                <span class="badge" style="background:rgba(245,158,11,0.15); color:#d97706; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                  👑 المشرف (Admin)
                </span>
              ` : ''}
            </div>
            <p style="font-size:0.82rem; color:var(--text-muted); margin:4px 0 0 0;">
              يمكنك رفع ملف فيديو مباشرة من جهازك أو لصق رابط خارجي (YouTube / Vimeo / Drive).
            </p>
          </div>
        </div>

        <!-- Mode Toggle Tabs (Upload vs URL) -->
        <div style="display:flex; gap:8px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:5px; margin-bottom:22px;">
          <button type="button" id="tab-btn-upload" class="video-modal-tab-btn"
            style="flex:1; padding:10px 14px; border-radius:12px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; background:var(--bg-card); color:var(--primary); box-shadow:0 2px 8px rgba(0,0,0,0.06); display:flex; align-items:center; justify-content:center; gap:6px;">
            <i data-lucide="upload" style="width:16px;height:16px;"></i> رفع ملف فيديو (MP4/WebM)
          </button>
          <button type="button" id="tab-btn-url" class="video-modal-tab-btn"
            style="flex:1; padding:10px 14px; border-radius:12px; font-weight:800; font-size:0.88rem; border:none; cursor:pointer; background:transparent; color:var(--text-muted); display:flex; align-items:center; justify-content:center; gap:6px;">
            <i data-lucide="link" style="width:16px;height:16px;"></i> رابط خارجي (YouTube/Drive)
          </button>
        </div>

        <!-- ── TAB 1: UPLOAD VIDEO FILE DIRECTLY ── -->
        <div id="video-tab-upload-content" style="display:block;">
          <form id="upload-teacher-video-form" style="display:flex; flex-direction:column; gap:16px;">
            
            <div id="video-file-dropzone" 
              style="border:2px dashed var(--primary); background:var(--primary-glow); border-radius:18px; padding:28px 20px; text-align:center; cursor:pointer; transition:all 0.2s ease;">
              <input type="file" id="video-file-input" accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov" style="display:none;">
              
              <div style="width:52px; height:52px; border-radius:50%; background:var(--bg-card); color:var(--primary); margin:0 auto 12px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.08);">
                <i data-lucide="upload-cloud" style="width:26px; height:26px;"></i>
              </div>

              <div id="video-file-label">
                <strong style="display:block; font-size:0.95rem; color:var(--text-main); margin-bottom:4px;">
                  انقر هنا لاختيار ملف الفيديو من جهازك 📁
                </strong>
                <span style="font-size:0.8rem; color:var(--text-muted);">
                  يدعم صيغ MP4, WebM, MOV حتى 250 ميغابايت
                </span>
              </div>
            </div>

            <!-- Upload Progress Bar (hidden by default) -->
            <div id="video-upload-progress-container" style="display:none; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:800; color:var(--text-main);">
                <span>جارٍ رفع ملف الفيديو... ⏳</span>
                <span id="video-upload-pct">0%</span>
              </div>
              <div style="width:100%; height:8px; background:var(--bg-app); border-radius:10px; overflow:hidden; border:1px solid var(--border-color);">
                <div id="video-upload-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #6366f1, #e51d74); border-radius:10px; transition:width 0.2s ease;"></div>
              </div>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
              <button type="button" class="btn-secondary close-modal-action-btn" style="padding:10px 20px; border-radius:14px; font-weight:800; font-size:0.88rem;">
                إلغاء
              </button>
              <button type="submit" id="submit-upload-video-btn" class="btn-primary" disabled
                style="padding:11px 26px; border-radius:14px; font-weight:900; font-size:0.9rem; opacity:0.5; cursor:not-allowed;">
                <i data-lucide="upload" style="width:16px;height:16px;"></i> رفع وحفظ الفيديو 🚀
              </button>
            </div>
          </form>
        </div>

        <!-- ── TAB 2: PASTE EXTERNAL VIDEO URL ── -->
        <div id="video-tab-url-content" style="display:none;">
          <form id="save-teacher-video-form" style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label style="display:block; font-size:0.86rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                🔗 رابط الفيديو (YouTube أو Vimeo أو Google Drive أو رابط مباشر):
              </label>
              <input type="url" id="new-teacher-video-input" value="${currentUrl}" placeholder="https://www.youtube.com/watch?v=im1YjIuVN6A" required
                style="width:100%; padding:12px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.9rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif; direction:ltr; text-align:left;">
              <span style="font-size:0.75rem; color:var(--text-muted); margin-top:6px; display:block;">
                💡 يدعم روابط YouTube (العادية والمختصرة youtu.be)، فيديوهات Vimeo، وملفات Google Drive المشاركة.
              </span>
            </div>

            <div style="display:flex; gap:10px; justify-content:space-between; align-items:center; margin-top:8px;">
              ${currentUrl ? `
                <button type="button" id="remove-teacher-video-btn" 
                  style="background:none; border:none; color:#ef4444; font-size:0.82rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; padding:6px;">
                  <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف الفيديو الحالي
                </button>
              ` : `<span></span>`}

              <div style="display:flex; gap:10px;">
                <button type="button" class="btn-secondary close-modal-action-btn" style="padding:10px 20px; border-radius:14px; font-weight:800; font-size:0.88rem;">
                  إلغاء
                </button>
                <button type="submit" id="submit-save-video-btn" class="btn-primary" style="padding:11px 26px; border-radius:14px; font-weight:900; font-size:0.9rem;">
                  حفظ وتطبيق 🚀
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => modal.remove();
    modal.querySelector("#close-edit-video-btn")?.addEventListener("click", closeModal);
    modal.querySelectorAll(".close-modal-action-btn").forEach(btn => btn.addEventListener("click", closeModal));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Tab switcher logic
    const tabUploadBtn = modal.querySelector("#tab-btn-upload");
    const tabUrlBtn = modal.querySelector("#tab-btn-url");
    const uploadContent = modal.querySelector("#video-tab-upload-content");
    const urlContent = modal.querySelector("#video-tab-url-content");

    tabUploadBtn.addEventListener("click", () => {
      tabUploadBtn.style.background = "var(--bg-card)";
      tabUploadBtn.style.color = "var(--primary)";
      tabUploadBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      tabUrlBtn.style.background = "transparent";
      tabUrlBtn.style.color = "var(--text-muted)";
      tabUrlBtn.style.boxShadow = "none";
      uploadContent.style.display = "block";
      urlContent.style.display = "none";
    });

    tabUrlBtn.addEventListener("click", () => {
      tabUrlBtn.style.background = "var(--bg-card)";
      tabUrlBtn.style.color = "var(--primary)";
      tabUrlBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      tabUploadBtn.style.background = "transparent";
      tabUploadBtn.style.color = "var(--text-muted)";
      tabUploadBtn.style.boxShadow = "none";
      uploadContent.style.display = "none";
      urlContent.style.display = "block";
    });

    // File selection handling
    const dropzone = modal.querySelector("#video-file-dropzone");
    const fileInput = modal.querySelector("#video-file-input");
    const fileLabel = modal.querySelector("#video-file-label");
    const submitUploadBtn = modal.querySelector("#submit-upload-video-btn");

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--success)";
      dropzone.style.background = "rgba(16,185,129,0.1)";
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "var(--primary)";
      dropzone.style.background = "var(--primary-glow)";
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--primary)";
      dropzone.style.background = "var(--primary-glow)";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleSelectedFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        handleSelectedFile(fileInput.files[0]);
      }
    });

    const handleSelectedFile = (file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      fileLabel.innerHTML = `
        <strong style="display:block; font-size:0.95rem; color:#10b981; margin-bottom:4px;">
          ✓ تم اختيار: ${file.name}
        </strong>
        <span style="font-size:0.8rem; color:var(--text-muted);">
          الحجم: ${sizeMb} ميغابايت • جاهز للرفع
        </span>
      `;
      submitUploadBtn.disabled = false;
      submitUploadBtn.style.opacity = "1";
      submitUploadBtn.style.cursor = "pointer";
    };

    // Upload Form Submission (FormData)
    modal.querySelector("#upload-teacher-video-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const file = fileInput.files?.[0];
      if (!file) {
        showToast("الرجاء اختيار ملف فيديو أولاً.", "warning");
        return;
      }

      submitUploadBtn.disabled = true;
      submitUploadBtn.innerHTML = `<span>جارٍ الرفع... ⏳</span>`;

      const progressContainer = modal.querySelector("#video-upload-progress-container");
      const progressBar = modal.querySelector("#video-upload-progress-bar");
      const progressPct = modal.querySelector("#video-upload-pct");

      progressContainer.style.display = "flex";

      try {
        const formData = new FormData();
        formData.append("video", file);

        const token = state.token || localStorage.getItem("token") || "";

        // Use XMLHttpRequest for live progress bar animation
        const uploadPromise = new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/teachers/${this.teacherId}/video/upload`);
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              progressBar.style.width = `${pct}%`;
              progressPct.innerText = `${pct}%`;
            }
          };

          xhr.onload = () => {
            try {
              const res = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(res);
              } else {
                reject(new Error(res.error || "فشل رفع الفيديو إلى السيرفر."));
              }
            } catch (jsonErr) {
              reject(new Error("استجابة غير متوقعة من السيرفر."));
            }
          };

          xhr.onerror = () => reject(new Error("حدث خطأ في الاتصال بالسيرفر أثناء الرفع."));
          xhr.send(formData);
        });

        const resData = await uploadPromise;
        const uploadedUrl = resData.videoUrl;

        if (this.teacher) this.teacher.videoUrl = uploadedUrl;
        this.featuredVideoUrl = uploadedUrl;
        this.isVideoPlaying = false;

        showToast("تم رفع الفيديو التعريفي للأستاذ بنجاح! 🎬", "success");
        closeModal();
        await this.render();
      } catch (err) {
        submitUploadBtn.disabled = false;
        submitUploadBtn.innerHTML = `<i data-lucide="upload" style="width:16px;height:16px;"></i> إعادة المحاولة 🚀`;
        showToast(err.message || "تعذر رفع ملف الفيديو.", "error");
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // URL Form Submission
    modal.querySelector("#save-teacher-video-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newVideoUrl = modal.querySelector("#new-teacher-video-input")?.value.trim() || "";
      const submitBtn = modal.querySelector("#submit-save-video-btn");

      submitBtn.disabled = true;
      submitBtn.innerText = "جارٍ الحفظ... ⏳";

      try {
        await apiFetch(`/teachers/${this.teacherId}/video`, {
          method: "PATCH",
          body: JSON.stringify({ videoUrl: newVideoUrl })
        });

        if (this.teacher) this.teacher.videoUrl = newVideoUrl;
        this.featuredVideoUrl = newVideoUrl;
        this.isVideoPlaying = false;

        showToast("تم تحديث الفيديو التعريفي للأستاذ بنجاح! 🎬", "success");
        closeModal();
        await this.render();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerText = "حفظ وتطبيق 🚀";
        showToast(err.message || "تعذر حفظ رابط الفيديو.", "error");
      }
    });

    // Remove video trigger
    modal.querySelector("#remove-teacher-video-btn")?.addEventListener("click", async () => {
      if (!confirm("هل أنت متأكد من حذف هذا الفيديو للأستاذ؟")) return;

      try {
        await apiFetch(`/teachers/${this.teacherId}/video`, {
          method: "PATCH",
          body: JSON.stringify({ videoUrl: null })
        });

        if (this.teacher) this.teacher.videoUrl = null;
        this.featuredVideoUrl = null;
        this.isVideoPlaying = false;

        showToast("تم إزالة الفيديو بنجاح.", "info");
        closeModal();
        await this.render();
      } catch (err) {
        showToast(err.message || "تعذر حذف الفيديو.", "error");
      }
    });
  }

  // ── Open Request Private Session Modal ────────────────────────────────────────
  async openRequestPrivateSessionModal() {
    try {
      document.getElementById("teacher-private-session-modal")?.remove();

      const tProfile = this.teacher || {};
      const name = tProfile.name || "الأستاذ";
      const avatar = (tProfile.avatar && !tProfile.avatar.includes('dicebear.com')) ? tProfile.avatar : 'assets/logo.png';

      // Fetch active student subscriptions to see if user already has 1-on-1 credits
      let mySubscriptions = [];
      if (state.user && state.user.role === "student") {
        try {
          mySubscriptions = await apiFetch("/subscriptions/my", { silentError: true }).catch(() => []);
        } catch (e) {}
      }

      const teacherSub = (mySubscriptions || []).find(s => 
        s.status === "ACTIVE" && (
          (s.teacher && String(s.teacher.id) === String(this.teacherId)) ||
          (!s.teacher)
        )
      );

      // Tomorrow 6 PM as default
      const defaultDate = new Date(Date.now() + 24 * 3600 * 1000);
      defaultDate.setHours(18, 0, 0, 0);
      const dateStr = defaultDate.toISOString().slice(0, 16);

      const modalBackdrop = document.createElement("div");
      modalBackdrop.id = "teacher-private-session-modal";
      modalBackdrop.style.cssText = `
        position:fixed; top:0; left:0; right:0; bottom:0;
        background:rgba(15,23,42,0.75); backdrop-filter:blur(10px);
        z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;
        animation:fadeIn 0.2s ease;
      `;

      modalBackdrop.innerHTML = `
        <div class="glass-card" style="width:100%; max-width:560px; max-height:90vh; overflow-y:auto; border-radius:24px; padding:28px 30px; background:var(--bg-card); border:1px solid var(--border-color); box-shadow:0 20px 60px rgba(0,0,0,0.3); position:relative; box-sizing:border-box;">
          
          <!-- Close Button -->
          <button type="button" id="close-private-modal-btn" 
            style="position:absolute; top:20px; left:20px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted);">
            <i data-lucide="x" style="width:18px;height:18px;"></i>
          </button>

          <!-- Header -->
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
            <img src="${avatar}" alt="${name}" style="width:54px; height:54px; border-radius:50%; object-fit:cover; border:2px solid #10b981; background:var(--bg-app);">
            <div>
              <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800; font-size:0.75rem; margin-bottom:4px; display:inline-block;">
                🎯 طلب حصة خاصة (1-on-1)
              </span>
              <h3 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main);">
                حصة فردية خاصة مع ${name}
              </h3>
            </div>
          </div>

          ${!state.user ? `
            <div style="padding:12px 14px; border-radius:14px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); color:#d97706; font-size:0.84rem; font-weight:800; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
              <span>⚠️ تنبيه: يرجى تسجيل الدخول بحساب الطالب لتأكيد إرسال الطلب.</span>
              <a href="#login" class="btn-primary" style="padding:6px 14px; font-size:0.8rem; border-radius:12px; text-decoration:none;">
                تسجيل الدخول الآن 🔑
              </a>
            </div>
          ` : ''}

          ${teacherSub ? `
            <div style="padding:10px 14px; border-radius:14px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#059669; font-size:0.84rem; font-weight:800; margin-bottom:18px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="check-circle" style="width:18px; height:18px;"></i>
              <span>لديك اشتراك نشط (${teacherSub.plan?.name || 'باقة حصص خاصة'}) يمكنك حجز الموعد مباشرة من رصيدك.</span>
            </div>
          ` : `
            <div style="padding:12px 14px; border-radius:14px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); color:var(--primary); font-size:0.82rem; margin-bottom:18px; line-height:1.5;">
              💡 سيتم إرسال طلب إنشاء مجموعة خاصة (1-on-1) بمقعد واحد فقط لإدارة المنصة لاعتماد الموعد وتنسيق الرابط مع الأستاذ.
            </div>
          `}

          <form id="private-session-request-form" style="display:flex; flex-direction:column; gap:14px;">
            
            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                📚 المادة أو الدورة التابعة للحصة:
              </label>
              <select id="ps-course-id" style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif; cursor:pointer;">
                <option value="">دورة تدريبية عامة / مخصصة مع الأستاذ</option>
                ${(this.courses || []).map(c => `<option value="${c.id}">${c.title} ${c.grade?.name ? `(${c.grade.name})` : ''}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                🎯 موضوع الحصة أو الدرس المطلوب شرحه: <span style="color:#ef4444;">*</span>
              </label>
              <input type="text" id="ps-topic" placeholder="مثال: مراجعة الوحدة الأولى، حل مسائل الفيزياء المعقدة..." required
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif;">
            </div>

            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                📅 الموعد المقترح للحصة (تاريخ وتوقيت البث): <span style="color:#ef4444;">*</span>
              </label>
              <input type="datetime-local" id="ps-scheduled-at" value="${dateStr}" required
                style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif;">
            </div>

            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                ⏱️ مدة الحصة:
              </label>
              <select id="ps-duration" style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif; cursor:pointer;">
                <option value="60">60 دقيقة (ساعة كاملة 🎯)</option>
                <option value="90">90 دقيقة (ساعة ونصف 🚀)</option>
                <option value="120">120 دقيقة (ساعتان مكثفة ⭐)</option>
              </select>
            </div>

            <div>
              <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
                📝 ملاحظات أو أسئلة محددة تود التركيز عليها (اختياري):
              </label>
              <textarea id="ps-notes" placeholder="اكتب هنا أي تفاصيل تود إعلام الأستاذ بها مسبقاً للتحضير لها..."
                style="width:100%; height:75px; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif; resize:vertical;"></textarea>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
              <button type="submit" id="ps-submit-btn" class="btn-primary"
                style="padding:12px 20px; border-radius:16px; font-weight:900; font-size:0.92rem; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 16px rgba(16,185,129,0.35); cursor:pointer;">
                <i data-lucide="send" style="width:16px;height:16px;"></i> ${teacherSub ? 'تأكيد وحجز الحصة مباشرة 🚀' : 'إرسال طلب الحصة الخاصة للإدارة 🚀'}
              </button>

              <a href="#subscription-plans?teacherId=${this.teacherId}" class="btn-secondary"
                style="padding:10px 16px; border-radius:14px; font-weight:800; font-size:0.85rem; color:var(--primary); border-color:var(--primary); text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
                <i data-lucide="sparkles" style="width:15px;height:15px;"></i> استعراض باقات واشتراكات الحصص الشهرية
              </a>
            </div>

          </form>

        </div>
      `;

      document.body.appendChild(modalBackdrop);
      try {
        if (window.lucide) window.lucide.createIcons();
      } catch (e) {}

      // Close logic
      const closeModal = () => modalBackdrop.remove();
      modalBackdrop.querySelector("#close-private-modal-btn")?.addEventListener("click", closeModal);
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) closeModal();
      });

      // Form Submit logic
      modalBackdrop.querySelector("#private-session-request-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!state.user) {
          showToast("يرجى تسجيل الدخول أولاً بحساب الطالب لإرسال الطلب.", "info");
          closeModal();
          window.location.hash = "#login";
          return;
        }

        const scheduledAt = modalBackdrop.querySelector("#ps-scheduled-at")?.value;
        const topic = modalBackdrop.querySelector("#ps-topic")?.value;
        const duration = parseInt(modalBackdrop.querySelector("#ps-duration")?.value || "60", 10);
        const notes = modalBackdrop.querySelector("#ps-notes")?.value || "";
        const courseId = modalBackdrop.querySelector("#ps-course-id")?.value || undefined;
        const submitBtn = modalBackdrop.querySelector("#ps-submit-btn");

        if (!scheduledAt || !topic) {
          showToast("يرجى ملء الموعد والموضوع المطلوب.", "error");
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>جارٍ إرسال الطلب... ⏳</span>`;

        try {
          if (teacherSub) {
            // Direct booking using active subscription
            await apiFetch("/sessions/book", {
              method: "POST",
              body: JSON.stringify({
                subscriptionId: teacherSub.id,
                scheduledAt: new Date(scheduledAt).toISOString(),
                topic,
                title: `حصة خاصة: ${topic}`,
                duration,
                notes
              })
            });
            showToast("تم حجز الحصة الخاصة بنجاح وجدولتها في حسابك! 🎯", "success");
          } else {
            // Send request to admin to create 1-on-1 private group with 1 seat
            await apiFetch(`/teachers/${this.teacherId}/request-private-group`, {
              method: "POST",
              body: JSON.stringify({
                topic,
                scheduledAt,
                duration,
                notes,
                courseId
              })
            });
            showToast("تم إرسال طلب الحصة الخاصة بنجاح! تم إنشاء طلب مجموعة خاصة (1-on-1) بمقعد واحد وإرساله للإدارة للاعتماد 🚀", "success");
          }

          closeModal();
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="send" style="width:16px;height:16px;"></i> تأكيد الطلب`;
          showToast(err.message || "فشل إرسال طلب الحصة الخاصة.", "error");
          try {
            if (window.lucide) window.lucide.createIcons();
          } catch (e) {}
        }
      });
    } catch (outerErr) {
      console.error("Error opening private session modal:", outerErr);
      showToast("تعذر فتح نافذة الحجز: " + outerErr.message, "error");
    }
  }

  onDestroy() { }
}

// Global click fallback for private session buttons
if (typeof window !== "undefined" && !window._teacherPrivateClickRegistered) {
  window._teacherPrivateClickRegistered = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".teacher-request-private-btn");
    if (btn && window.currentTeacherDetailsView) {
      e.preventDefault();
      window.currentTeacherDetailsView.openRequestPrivateSessionModal();
    }
  });
}
