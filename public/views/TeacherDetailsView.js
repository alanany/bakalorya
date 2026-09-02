import { apiFetch, state, showToast, t, getCleanWhatsAppNumber, renderCourseCard } from "../app.js";
import { openGroupPaymentModal } from "./shared/GroupPaymentModal.js";

export default class TeacherDetailsView {
  constructor(container, teacherId) {
    this.container = container;
    // Extract ID either from parameter or hash
    this.teacherId = teacherId || (window.location.hash.split("/")[1] || "").split("?")[0];
    this.teacher = null;
    this.courses = [];
    this.blogs = [];
  }

  async render() {
    this.container.innerHTML = `
      <div style="width:100%; max-width:1400px; margin:0 auto; padding:60px 24px 80px;">
        <div style="text-align:center; padding:60px 20px; color:var(--text-muted);" class="glass-card">
          <div class="spinner" style="width:44px; height:44px; margin:0 auto 16px; border-width:3px;"></div>
          <p style="font-weight:700; font-size:1rem;">جارٍ تحميل ملف الأستاذ والدورات...</p>
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

      const [teacher, allCourses, allBlogs, reviewsRes, myEnrollments] = await Promise.all([
        apiFetch(`/teachers/${this.teacherId}`).catch(() => null),
        apiFetch(`/courses`).catch(() => []),
        apiFetch(`/blogs`).catch(() => []),
        apiFetch(`/reviews/teacher/${this.teacherId}`).catch(() => ({ reviews: [], totalReviews: 0, averageRating: 0 })),
        enrollmentsPromise
      ]);

      if (!teacher || teacher.error) {
        this.renderNotFound();
        return;
      }

      this.teacher = teacher;
      this.myEnrollments = myEnrollments || [];
      this.courses = Array.isArray(allCourses) ? allCourses.filter(c => c.teacher?.id === this.teacherId) : [];
      this.blogs = Array.isArray(allBlogs) ? allBlogs.filter(b => b.author?.id === this.teacherId) : [];
      this.teacherReviews = reviewsRes?.reviews || [];
      this.teacherAvgRating = reviewsRes?.averageRating || 4.9;
      this.teacherReviewsCount = reviewsRes?.totalReviews || this.teacherReviews.length;

      // Fetch teacher groups from all their courses
      const groupsResults = await Promise.all(
        this.courses.map(c => apiFetch(`/courses/${c.id}/groups`).catch(() => []))
      );
      this.groups = groupsResults.flat().filter(g => g.status === 'OPEN' || g.status === 'IN_PROGRESS' || g.status === 'CLOSED');

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
    const name = tProfile.name || "أستاذ";
    const avatar = tProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
    const education = tProfile.education || "أستاذ وخبير تربوي متميز بالمنصة";
    const location = tProfile.location || "المنصة الرقمية";
    const categories = [...new Set([
      ...(this.courses || []).map(c => c.category).filter(Boolean),
      ...(Array.isArray(tProfile.customCategories) ? tProfile.customCategories : [])
    ])];

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    this.container.innerHTML = `
      <div style="width:100%; max-width:1400px; margin:0 auto; padding:32px 32px 80px;">
        
        <!-- Top Navigation / Breadcrumb -->
        <div style="margin-bottom:24px; display:flex; align-items:center; justify-content:space-between;">
          <a href="#landing" class="btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; font-size:0.9rem; padding:8px 18px; border-radius:30px;">
            <i data-lucide="arrow-right"></i> العودة للصفحة الرئيسية
          </a>
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">الملف الشخصي للأستاذ</span>
        </div>

        <!-- Teacher Hero Banner Card -->
        <div class="glass-card" style="border-radius:24px; padding:36px; margin-bottom:36px; border:1px solid var(--border-color); box-shadow:0 12px 40px rgba(0,0,0,0.12); position:relative; overflow:hidden;">
          <div style="position:absolute; top:-60px; left:-60px; width:220px; height:220px; background:var(--primary-glow); border-radius:50%; filter:blur(60px); pointer-events:none;"></div>
          
          <div style="display:flex; gap:32px; align-items:center; flex-wrap:wrap; position:relative; z-index:2;">
            <!-- Avatar -->
            <div style="position:relative;">
              <img src="${avatar}" alt="${name}" style="width:130px; height:130px; border-radius:50%; border:4px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(0,0,0,0.15);">
              <span style="position:absolute; bottom:6px; left:6px; background:var(--success); color:#fff; font-size:0.7rem; font-weight:800; padding:3px 8px; border-radius:12px; border:2px solid var(--bg-card);" title="استاذ موثوق">
                ✓ موثوق
              </span>
            </div>

            <!-- Main Bio Header -->
            <div style="flex:1; min-width:280px;">
              <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:6px;">
                <h1 style="font-size:2.1rem; font-weight:900; color:var(--text-color); margin:0;">${name}</h1>
                <span class="session-tag" style="background:var(--primary-glow); color:var(--primary); font-size:0.8rem; padding:4px 12px; border-radius:20px; font-weight:800;">
                  ⭐ 4.95 تقييم ممتاز
                </span>
              </div>

              <p style="font-size:1.05rem; color:var(--primary); font-weight:700; margin:0 0 14px 0;">${education}</p>

              <div style="display:flex; gap:20px; flex-wrap:wrap; font-size:0.88rem; color:var(--text-muted); margin-bottom:20px;">
                <span style="display:flex; align-items:center; gap:6px;">
                  <i data-lucide="map-pin" style="width:16px; height:16px; color:var(--primary);"></i> ${location}
                </span>
                <span style="display:flex; align-items:center; gap:6px;">
                  <i data-lucide="users" style="width:16px; height:16px; color:#e51d74;"></i> ${this.groups.length} مجموعات دراسية
                </span>
                <span style="display:flex; align-items:center; gap:6px;">
                  <i data-lucide="book-open" style="width:16px; height:16px; color:var(--accent);"></i> ${this.courses.length} دورات تعليمية
                </span>
              </div>

              <!-- Quick Contact Actions -->
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <button type="button" class="btn-primary teacher-request-private-btn"
                  style="padding:10px 22px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 16px rgba(16,185,129,0.3); cursor:pointer;">
                  <i data-lucide="sparkles"></i> طلب حصة خاصة (1-on-1) 🎯
                </button>
                <a href="#teacher-groups-section" class="btn-secondary" style="text-decoration:none; padding:10px 20px; border-radius:30px; font-size:0.88rem; font-weight:800; color:#e51d74; border-color:rgba(229,29,116,0.3); background:rgba(229,29,116,0.06); display:inline-flex; align-items:center; gap:8px;">
                  <i data-lucide="users"></i> المجموعات الدراسية (${this.groups.length}) 👥
                </a>
              </div>

            </div>
          </div>
        </div>

        <!-- Section: Dedicated 1-on-1 Private Sessions Banner -->
        <div class="glass-card" style="border-radius:24px; padding:32px; margin-bottom:40px; border:1px solid rgba(16,185,129,0.25); background:linear-gradient(135deg, rgba(16,185,129,0.05), rgba(99,102,241,0.04)); box-shadow:0 10px 30px rgba(0,0,0,0.04); position:relative; overflow:hidden;">
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
              <button type="button" class="btn-primary teacher-request-private-btn"
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

        <!-- Custom Categories & Specialties -->
        ${categories.length > 0 ? `
          <div class="glass-card" style="border-radius:20px; padding:24px 32px; margin-bottom:36px;">
            <h3 style="font-size:1.05rem; font-weight:800; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="layers" style="color:var(--primary);"></i> التخصصات والمواد التي يدرسها الأستاذ
            </h3>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              ${categories.map(cat => `
                <span style="background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-color); font-size:0.85rem; font-weight:700; padding:8px 16px; border-radius:20px;">
                  ✨ ${cat}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Section 1: Teacher's Live Groups -->
        <div id="teacher-groups-section" style="margin-bottom:50px;">
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
                const studentRate = grp.studentHourlyRate || grp.sessionPrice || 40;

                return `
                  <div class="glass-card" style="padding:22px; border-radius:22px; border:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; gap:14px; background:var(--bg-card); position:relative; overflow:hidden;">
                    <div style="position:absolute; top:0; right:0; left:0; height:4px; background:linear-gradient(90deg, #e51d74, #6366f1);"></div>

                    <div>
                      <!-- Header Badges -->
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px;">
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                          ${grp.course?.subject?.name ? `<span class="badge" style="background:rgba(229,29,116,0.12); color:#e51d74; font-size:0.75rem; font-weight:800;">${grp.course.subject.name}</span>` : ''}
                          ${grp.course?.grade?.name ? `<span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-size:0.75rem;">${grp.course.grade.name}</span>` : ''}
                        </div>
                        <div>
                          ${isClosed
                            ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(99,102,241,0.12); color:#6366f1;">🔒 بدأت الدراسة</span>`
                            : isFull
                              ? `<span style="font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px; background:rgba(239,68,68,0.12); color:#ef4444;">مكتملة 🔒</span>`
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
                    <div style="border-top:1px solid var(--border-color); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
                      ${(() => {
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

        <!-- Section 2: Teacher's Courses -->
        <div style="margin-bottom:50px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h2 style="font-size:1.5rem; font-weight:900; margin:0; display:flex; align-items:center; gap:10px;">
              <i data-lucide="book-open" style="color:var(--primary);"></i> دورات الأستاذ المتاحة (${this.courses.length})
            </h2>
          </div>

          ${this.courses.length === 0 ? `
            <div class="glass-card" style="text-align:center; padding:48px; color:var(--text-muted); border-radius:20px;">
              لم يقم الأستاذ بنشر دورات تعليمية بعد.
            </div>
          ` : `
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:24px;">
              ${this.courses.map(course => renderCourseCard(course)).join('')}
            </div>
          `}
        </div>

        <!-- Section 2: Teacher's Blogs & Articles -->
        ${this.blogs.length > 0 ? `
          <div style="margin-bottom:50px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
              <h2 style="font-size:1.5rem; font-weight:900; margin:0; display:flex; align-items:center; gap:10px;">
                <i data-lucide="newspaper" style="color:#ec4899;"></i> مقالات وإرشادات الأستاذ (${this.blogs.length})
              </h2>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:24px;">
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
                      <div style="font-size:0.78rem; color:var(--text-muted); font-weight:600; margin-bottom:8px;">${new Date(blog.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} • ${blog.readTime}</div>
                      <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-color); margin:0 0 10px 0; line-height:1.4;">${blog.title}</h3>
                      <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">${blog.content.substring(0, 100)}...</p>
                    </div>
                  </div>
                  <div style="padding:16px 20px; border-top:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-color);">${name}</span>
                    <span style="font-size:0.8rem; font-weight:800; color:var(--primary);">اقرأ المقال ➔</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Section 3: Student Reviews & Feedback for Teacher -->
        <div class="glass-card" style="border-radius:24px; padding:32px; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; border-bottom:1px solid var(--border-color); padding-bottom:20px; margin-bottom:28px;">
            <div>
              <h2 style="font-size:1.5rem; font-weight:900; margin:0 0 6px 0; display:flex; align-items:center; gap:10px;">
                <i data-lucide="star" style="color:#f59e0b; fill:#f59e0b; width:26px; height:26px;"></i>
                آراء وتقييمات الطلاب في ${name}
              </h2>
              <p style="font-size:0.88rem; color:var(--text-muted); margin:0;">انطباعات الطلاب المسجلين حول أسلوب الشرح والتفاعل.</p>
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
                    <img src="${r.student?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.student?.id || 'std'}`}" style="width:44px; height:44px; border-radius:50%; border:2px solid var(--primary); object-fit:cover;">
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

    this.bindReviewEvents();
    if (window.lucide) window.lucide.createIcons();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  bindReviewEvents() {
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

    // Group Enroll Buttons
    this.container.querySelectorAll(".teacher-group-enroll-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const groupId = btn.getAttribute("data-group-id");
        const groupObj = (this.teacherGroups || []).find(g => g.id === groupId) || {};
        const courseObj = groupObj.course || (this.courses || []).find(c => c.id === btn.getAttribute("data-course-id")) || {};

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
      btn.addEventListener("click", () => {
        this.openRequestPrivateSessionModal();
      });
    });

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

  // ── Open Request Private Session Modal ────────────────────────────────────────
  async openRequestPrivateSessionModal() {
    if (!state.user) {
      showToast("يرجى تسجيل الدخول أولاً لطلب حجز حصة خاصة.", "info");
      window.location.hash = "#auth/login";
      return;
    }

    const tProfile = this.teacher || {};
    const name = tProfile.name || "الأستاذ";
    const avatar = tProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
    const phone = tProfile.phone || "";

    // Fetch active student subscriptions to see if user already has 1-on-1 credits
    let mySubscriptions = [];
    try {
      mySubscriptions = await apiFetch("/student/subscriptions").catch(() => []);
    } catch (e) {}

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
      z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;
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
              حصة فردية مباشرة مع ${name}
            </h3>
          </div>
        </div>

        ${teacherSub ? `
          <div style="padding:10px 14px; border-radius:14px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#059669; font-size:0.84rem; font-weight:800; margin-bottom:18px; display:flex; align-items:center; gap:8px;">
            <i data-lucide="check-circle" style="width:18px; height:18px;"></i>
            <span>لديك اشتراك نشط (${teacherSub.plan?.name || 'باقة حصص خاصة'}) يمكنك حجز الموعد مباشرة من رصيدك.</span>
          </div>
        ` : `
          <div style="padding:12px 14px; border-radius:14px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); color:var(--primary); font-size:0.82rem; margin-bottom:18px; line-height:1.5;">
            💡 يمكنك حجز وتنسيق موعد الحصة الخاصة، أو اختيار باقة حصص خاصة شهرية للاستفادة من خصم الحصص الفردية.
          </div>
        `}

        <form id="private-session-request-form" style="display:flex; flex-direction:column; gap:14px;">
          
          <div>
            <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
              📅 الموعد المقترح للحصة (تاريخ وتوقيت البث):
            </label>
            <input type="datetime-local" id="ps-scheduled-at" value="${dateStr}" required
              style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; box-sizing:border-box; font-family:'Cairo',sans-serif;">
          </div>

          <div>
            <label style="display:block; font-size:0.85rem; font-weight:800; color:var(--text-main); margin-bottom:6px;">
              🎯 موضوع الحصة أو الدرس المطلوب شرحه:
            </label>
            <input type="text" id="ps-topic" placeholder="مثال: مراجعة الوحدة الأولى، حل مسائل الفيزياء المعقدة..." required
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
              <i data-lucide="send" style="width:16px;height:16px;"></i> ${teacherSub ? 'تأكيد وحجز الحصة مباشرة 🚀' : 'إرسال طلب الحصة الخاصة للأستاذ 🚀'}
            </button>

            ${phone ? `
              <a id="ps-whatsapp-direct-btn" href="#" target="_blank" class="btn-secondary"
                style="padding:10px 16px; border-radius:14px; font-weight:800; font-size:0.85rem; color:#25D366; border-color:rgba(37,211,102,0.4); background:rgba(37,211,102,0.08); text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i data-lucide="message-circle" style="width:16px;height:16px;"></i> تواصل فوري وتنسيق الموعد عبر واتساب 💬
              </a>
            ` : ''}

            <a href="#subscription-plans?teacherId=${this.teacherId}" class="btn-secondary"
              style="padding:10px 16px; border-radius:14px; font-weight:800; font-size:0.85rem; color:var(--primary); border-color:var(--primary); text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i data-lucide="sparkles" style="width:15px;height:15px;"></i> استعراض باقات واشتراكات الحصص الشهرية
            </a>
          </div>

        </form>

      </div>
    `;

    document.body.appendChild(modalBackdrop);
    if (window.lucide) window.lucide.createIcons();

    // Close logic
    const closeModal = () => modalBackdrop.remove();
    modalBackdrop.querySelector("#close-private-modal-btn")?.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Update WhatsApp link dynamically as user inputs topic & date
    const updateWhatsAppLink = () => {
      const topic = modalBackdrop.querySelector("#ps-topic")?.value || "حصة خاصة 1-on-1";
      const sched = modalBackdrop.querySelector("#ps-scheduled-at")?.value || "";
      const waBtn = modalBackdrop.querySelector("#ps-whatsapp-direct-btn");
      if (waBtn && phone) {
        const text = `مرحباً أستاذ ${name}، أنا الطالب (${state.user?.name || ''}) وأرغب في حجز حصة خاصة (1-on-1) معكم في مادة: ${topic} بتاريخ وموعد مقترح: ${sched}. هل الموعد مناسب معكم؟`;
        waBtn.href = `https://wa.me/${getCleanWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
      }
    };

    modalBackdrop.querySelector("#ps-topic")?.addEventListener("input", updateWhatsAppLink);
    modalBackdrop.querySelector("#ps-scheduled-at")?.addEventListener("change", updateWhatsAppLink);
    updateWhatsAppLink();

    // Form Submit logic
    modalBackdrop.querySelector("#private-session-request-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const scheduledAt = modalBackdrop.querySelector("#ps-scheduled-at")?.value;
      const topic = modalBackdrop.querySelector("#ps-topic")?.value;
      const duration = parseInt(modalBackdrop.querySelector("#ps-duration")?.value || "60", 10);
      const notes = modalBackdrop.querySelector("#ps-notes")?.value || "";
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
          // Send direct request notification to the teacher and admin
          await apiFetch("/notifications", {
            method: "POST",
            body: JSON.stringify({
              userId: this.teacherId,
              title: "طلب حصة خاصة جديدة (1-on-1) 🎯",
              message: `قام الطالب (${state.user?.name || 'طالب'}) بطلب حجز حصة خاصة 1-on-1 في موضوع "${topic}" بموعد مقترح: ${scheduledAt}.`,
              type: "info",
              link: "#teacher-private-sessions"
            })
          }).catch(() => {});
          showToast("تم إرسال طلب الحصة الخاصة للأستاذ بنجاح! سيتم التواصل معك لتأكيد الموعد 🚀", "success");
        }

        closeModal();

        // If user wants to open WhatsApp as well
        if (phone) {
          const text = `مرحباً أستاذ ${name}، أنا الطالب (${state.user?.name || ''}) وقمت بتقديم طلب حجز حصة خاصة (1-on-1) معكم عبر المنصة في موضوع "${topic}" بموعد مقترح: ${scheduledAt}.`;
          window.open(`https://wa.me/${getCleanWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`, "_blank");
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="send" style="width:16px;height:16px;"></i> تأكيد الطلب`;
        showToast(err.message || "فشل إرسال طلب الحصة الخاصة.", "error");
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  onDestroy() { }
}

