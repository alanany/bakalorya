import { apiFetch, state, showToast, t, showEnrollmentRequestedModal } from "../../app.js";

export default class CourseLandingView {
  constructor(container, courseId) {
    this.container = container;
    this.courseId = courseId;
    this.course = null;
    this.enrollmentStatus = null; // null, 'pending', 'active', 'rejected'
  }

  async render() {
    try {
      this.container.innerHTML = `<div class="app-loader"><div class="spinner"></div></div>`;

      // Fetch course, enrollments, and subscriptions (if logged in)
      const fetchPromises = [apiFetch(`/courses/${this.courseId}`)];
      if (state.user && state.user.role === 'student') {
        fetchPromises.push(apiFetch("/student/enrollments").catch(() => []));
        fetchPromises.push(apiFetch("/subscriptions/my").catch(() => []));
      }

      const results = await Promise.all(fetchPromises);
      this.course = results[0];

      if (results[1]) {
        const enrollments = results[1];
        const myEnrollment = enrollments.find(e => e.course?.id === this.courseId);
        if (myEnrollment) {
          this.enrollmentStatus = myEnrollment.status || 'active'; // fallback for old records
        }
      } else if (state.user && (state.user.role === 'teacher' || state.user.role === 'admin')) {
        // Teachers/Admins don't "enroll" but they have access
        this.enrollmentStatus = 'active';
      }

      if (results[2]) {
        this.mySubscriptions = results[2] || [];
      }

      const hasLessons = this.course.lessons && this.course.lessons.length > 0;

      const chaptersMap = {};
      let totalDuration = 0;
      if (hasLessons) {
        const orderedUnits = Array.isArray(this.course?.unitsOrder) ? [...this.course.unitsOrder] : [];
        const allKnownUnits = Array.from(new Set([
          ...orderedUnits,
          ...this.course.lessons.map(l => l.chapter || "General")
        ])).filter(Boolean);

        allKnownUnits.forEach(u => { chaptersMap[u] = []; });

        this.course.lessons.forEach(l => {
          const chName = l.chapter || "General";
          if (!chaptersMap[chName]) chaptersMap[chName] = [];
          chaptersMap[chName].push(l);

          // Basic duration parsing (assuming MM:SS format)
          const parts = l.duration ? l.duration.split(':') : [];
          if (parts.length === 2) {
            totalDuration += parseInt(parts[0]) * 60 + parseInt(parts[1]);
          } else {
            totalDuration += 600; // default 10 mins
          }
        });

        Object.keys(chaptersMap).forEach(k => {
          if (chaptersMap[k].length === 0) delete chaptersMap[k];
          else chaptersMap[k].sort((a, b) => (a.order || 0) - (b.order || 0));
        });
      }

      const totalHours = Math.floor(totalDuration / 3600);
      const totalMins = Math.floor((totalDuration % 3600) / 60);
      const durationText = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

      this.container.innerHTML = `
        <div style="background:var(--bg-color); min-height:100vh;">
          
          <!-- Top Cover (Slider / Hero) -->
          <div style="position: relative; width: 100%; min-height: 340px; background-image: url('${this.course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200'}'); background-size: cover; background-position: center; padding: 40px 16px;">
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 100%); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 24px 16px;">
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap; justify-content:center;">
                <span style="background: var(--primary); color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase;">
                  ${this.course.category}
                </span>
                ${this.course.isFree || !this.course.price || this.course.price === 0 ? `
                  <span style="background: #10b981; color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 800;">
                    🎁 مجانية بالكامل (Free)
                  </span>
                ` : `
                  <span style="background: linear-gradient(135deg,#a855f7,#6366f1); color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 800;">
                    💳 ${this.course.price} ${this.course.currency || 'ج.م'}
                  </span>
                `}
              </div>
              <h1 style="font-size: clamp(1.5rem, 4.5vw, 2.8rem); font-weight: 800; color: #ffffff; margin-bottom: 16px; max-width: 800px; line-height: 1.3; text-shadow: 0 2px 10px rgba(0,0,0,0.6);">
                ${this.course.title}
              </h1>
              
              <div style="display:flex; gap:12px; align-items:center; margin-top: 16px; flex-wrap:wrap; justify-content:center; width:100%; max-width:500px;">
                ${this.enrollmentStatus === 'active' ? `
                  <a href="#course/${this.course.id}" class="btn-primary" style="padding: 12px 28px; font-size: 0.95rem; font-weight: 800; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="play-circle"></i> ${t("course.continueLearning") || "دخول الدورة"}
                  </a>
                ` : this.enrollmentStatus === 'pending' ? `
                  <button class="btn-primary" disabled style="padding: 12px 24px; font-size: 0.9rem; font-weight: 800; border-radius: 30px; opacity:0.8; cursor:not-allowed;">
                    <i data-lucide="clock"></i> طلب الحجز قيد المراجعة والموافقة
                  </button>
                ` : this.enrollmentStatus === 'rejected' ? `
                  <button class="btn-primary" disabled style="padding: 12px 24px; font-size: 0.9rem; font-weight: 800; border-radius: 30px; background:var(--error); border-color:var(--error); opacity:0.8;">
                    <i data-lucide="x-circle"></i> تم الرفض
                  </button>
                ` : `
                  <button id="enroll-hero-btn" class="btn-primary" style="padding: 12px 28px; font-size: 0.95rem; font-weight: 800; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="plus-circle"></i> ${!this.course.isFree && this.course.price > 0 ? `التحاق بالدورة (${this.course.price} ${this.course.currency || 'ج.م'}) 💳` : (t("course.enroll") || "التسجيل مجاناً 🎁")}
                  </button>
                `}
                ${this.course.teacher ? `
                  <button id="book-private-session-hero-btn" class="btn-secondary" style="padding: 12px 24px; font-size: 0.9rem; font-weight: 800; border-radius: 30px; background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.5); color:#fff; backdrop-filter:blur(8px); display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
                    <i data-lucide="calendar-plus"></i> طلب حجز حصة خاصة 🚀
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Main Content Section (2 columns: Left Content, Right Description) -->
          <div style="max-width: 1200px; margin: 0 auto; padding: 60px 24px; display:flex; gap:40px; flex-wrap: wrap;">
            
            <!-- Left: Course Content (Curriculum) -->
            <div style="flex: 2; min-width: 300px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:10px;">
                <h2 style="font-size:1.6rem; font-weight:800; color:var(--text-main); margin:0;">📚 محتوى ومنهج الدورة (Units & Lessons)</h2>
                <span style="font-size:0.88rem; color:var(--text-muted); font-weight:700;">${Object.keys(chaptersMap).length} وحدات • ${this.course.lessons?.length || 0} دروس • ${durationText}</span>
              </div>
              
              ${Object.keys(chaptersMap).length === 0 ? `
                <div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted);">
                  جاري إعداد وإضافة دروس المنهج في هذه الدورة.
                </div>
              ` : `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow:hidden; background: var(--card-bg);">
                  ${Object.keys(chaptersMap).map((chName, idx) => `
                    <div style="border-bottom: 1px solid var(--border-color);">
                      <div style="background: rgba(99,102,241,0.05); padding: 16px 24px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; font-size:1.05rem; color:var(--text-main); display:flex; align-items:center; gap:10px;">
                          <i data-lucide="folder-open" style="width:18px; color:var(--primary);"></i> ${chName}
                        </span>
                        <span class="badge" style="font-size:0.78rem; background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800;">${chaptersMap[chName].length} دروس</span>
                      </div>
                      <div>
                        ${chaptersMap[chName].map((l, lIdx) => `
                          <div style="padding: 12px 24px 12px 36px; border-top: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background: var(--bg-color);">
                            <span style="display:flex; align-items:center; gap:12px; font-size:0.92rem; color:var(--text-main); font-weight:600;">
                              <i data-lucide="${l.videoUrl ? 'play-circle' : 'file-text'}" style="width:16px; color:${l.videoUrl ? 'var(--primary)' : 'var(--text-muted)'};"></i>
                              #${lIdx + 1} ${l.title}
                            </span>
                            <div style="display:flex; align-items:center; gap:8px;">
                              ${l.isFree ? `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.7rem; font-weight:800;">مجاني 🎁</span>` : ''}
                              <span style="font-size:0.78rem; color:var(--text-muted); background: var(--card-bg); padding: 2px 8px; border-radius: 12px; border: 1px solid var(--border-color);">${l.duration || '--:--'}</span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Right: Description & Teacher Info -->
            <div style="flex: 1; min-width: 300px;">
              <div class="glass-card" style="padding: 32px; margin-bottom: 24px;">
                <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:16px;">Description</h2>
                <p style="font-size:1rem; color:var(--text-muted); line-height:1.8; white-space: pre-wrap;">${this.course.description || "No description provided."}</p>
              </div>

              <div class="glass-card" style="padding: 32px;">
                <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:24px;">Instructor</h2>
                <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
                  <img src="${this.course.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:64px; height:64px; border-radius:50%; border: 2px solid var(--primary);">
                  <div>
                    <div style="font-weight:800; font-size:1.1rem; color:var(--text-main);">${this.course.teacher?.name || "Entlq Instructor"}</div>
                    <div style="font-size:0.9rem; color:var(--text-muted);">Teacher</div>
                  </div>
                </div>
              </div>

              <!-- Cross-sell section -->
              <div class="glass-card" style="padding: 24px; margin-top:24px; background:linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.04)); border:1.5px solid rgba(16,185,129,0.3); border-radius:18px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px; color:#10b981;">
                  <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.15); display:flex; align-items:center; justify-content:center; color:#10b981;">
                    <i data-lucide="sparkles" style="width:22px; height:22px;"></i>
                  </div>
                  <div>
                    <h3 style="font-size:1.1rem; font-weight:800; margin:0; color:var(--text-main);">حصة خاصة مع المعلم</h3>
                    <span style="font-size:0.75rem; color:#10b981; font-weight:700;">متابعة فردية 1-on-1 مباشر</span>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px; background:var(--bg-app); padding:10px 14px; border-radius:12px; border:1px solid var(--border-color);">
                  <img src="${this.course.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:42px; height:42px; border-radius:50%; border:2px solid #10b981; object-fit:cover;">
                  <div>
                    <div style="font-weight:800; font-size:0.92rem; color:var(--text-main);">${this.course.teacher?.name || 'أستاذ المادة'}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted);">متاح للاستشارات والحصص الخاصة</div>
                  </div>
                </div>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px; line-height:1.5;">
                  هل تحتاج لشرح مخصص، حل أسئلة محددة، أو مراجعة فردية مع الأستاذ؟ احجز حصتك الخاصة الآن.
                </p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <button id="book-private-session-card-btn" class="btn-primary" style="background:linear-gradient(135deg, #10b981, #059669); border:none; padding:10px 16px; border-radius:12px; font-weight:800; font-size:0.88rem; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 12px rgba(16,185,129,0.25); cursor:pointer; width:100%;">
                    <i data-lucide="calendar-plus" style="width:16px;height:16px;"></i> طلب حجز حصة خاصة الآن 🚀
                  </button>
                  <button id="plans-card-btn" class="btn-secondary" style="border-color:var(--primary); color:var(--primary); padding:8px 16px; border-radius:12px; font-weight:700; font-size:0.82rem; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; width:100%;">
                    <i data-lucide="sparkles" style="width:14px;height:14px;"></i> باقات واشتراكات الحصص الشهرية
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom: Reviews (Placeholder) -->
          <div style="max-width: 1200px; margin: 0 auto; padding: 0 24px 60px 24px;">
            <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-main); margin-bottom:24px;">آراء وتقييمات الطلاب 🌟</h2>
            <div class="glass-card" style="padding: 40px; text-align:center;">
              <i data-lucide="message-square" style="width:48px; height:48px; color:var(--border-color); margin-bottom:16px;"></i>
              <h3 style="font-size:1.2rem; color:var(--text-main); margin-bottom:8px;">لا توجد تقييمات حتى الآن</h3>
              <p style="color:var(--text-muted); font-size:0.95rem;">سجل بالدورة الآن وكن أول من يشارك رأيه وتجربته التعليمية!</p>
            </div>
          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--error);">Failed to load course details.</div>`;
    }
  }

  bindEvents() {
    const handleEnroll = async () => {
      if (!state.user) {
        showToast("Please log in to enroll in this course.", "info");
        window.location.hash = "#login"; // Redirect strictly to login page
        return;
      }

      if (state.user.role === 'teacher' || state.user.role === 'admin') {
        window.location.hash = `#course/${this.course.id}`;
        return;
      }

      const isPaid = !this.course.isFree && this.course.price > 0;
      if (isPaid) {
        this.renderPaidCourseEnrollmentModal();
        return;
      }

      try {
        await apiFetch(`/student/enrollments`, {
          method: "POST",
          body: JSON.stringify({ courseId: this.course.id })
        });
        showToast("تم تقديم طلب التسجيل بنجاح! في انتظار موافقة المعلم.", "success");
        showEnrollmentRequestedModal({
          courseTitle: this.course.title,
          teacherName: this.course.teacher?.name,
          courseImage: this.course.image
        });
        await this.render(); // Re-render to show pending status
      } catch (err) {
        console.error("Enrollment error", err);
      }
    };

    document.getElementById("enroll-hero-btn")?.addEventListener("click", handleEnroll);
    document.getElementById("enroll-card-btn")?.addEventListener("click", handleEnroll);

    const handleBookPrivateSession = () => {
      if (!state.user) {
        showToast("سجل دخولك أولاً لحجز حصة خاصة.", "info");
        window.location.hash = "#login";
        return;
      }

      if (state.user.role === 'teacher' || state.user.role === 'admin') {
        const teacherId = this.course.teacher?.id || '';
        window.location.hash = `#subscription-plans?courseId=${this.course.id}${teacherId ? `&teacherId=${teacherId}` : ''}`;
        return;
      }

      if (this.enrollmentStatus !== 'active') {
        this.renderMustEnrollModal();
        return;
      }

      // Check if student already has an active / ongoing subscription for this course or teacher
      const existingSub = (this.mySubscriptions || []).find(s => 
        (s.subjectId === this.course.id || s.teacher?.id === this.course.teacher?.id) && 
        s.status !== "CANCELLED" && s.status !== "EXPIRED"
      );

      if (existingSub) {
        this.renderExistingSubscriptionModal(existingSub);
        return;
      }

      const teacherId = this.course.teacher?.id || '';
      window.location.hash = `#subscription-plans?courseId=${this.course.id}${teacherId ? `&teacherId=${teacherId}` : ''}`;
    };

    document.getElementById("book-private-session-hero-btn")?.addEventListener("click", handleBookPrivateSession);
    document.getElementById("book-private-session-card-btn")?.addEventListener("click", handleBookPrivateSession);
    document.getElementById("plans-card-btn")?.addEventListener("click", handleBookPrivateSession);
  }

  renderExistingSubscriptionModal(sub) {
    const existingModal = document.getElementById("existing-sub-modal-dynamic");
    if (existingModal) existingModal.remove();

    const remaining = sub.remainingCredits !== undefined ? sub.remainingCredits : (sub.totalSessions || 0);
    const total = sub.totalSessions || 0;
    const teacherName = sub.teacher?.name || this.course.teacher?.name || 'أستاذ المادة';
    const isPendingPayment = sub.status === 'PENDING_PAYMENT';
    const isTeacherAssignmentPending = sub.status === 'TEACHER_ASSIGNMENT_PENDING';
    const isSchedulePending = sub.status === 'SCHEDULE_PENDING';
    const isActive = sub.status === 'ACTIVE';

    let headerIcon = 'calendar-check-2';
    let headerTitle = 'تفاصيل اشتراكك الحالي للحصص الخاصة 🌟';
    let statusBadgeHTML = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:800;">نشط ✅</span>';

    if (isPendingPayment) {
      headerIcon = 'clock';
      headerTitle = 'طلب الاشتراك قيد مراجعة وتأكيد الدفع ⏳';
      statusBadgeHTML = '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-weight:800;">⏳ في انتظار تأكيد الدفع من الإدارة</span>';
    } else if (isTeacherAssignmentPending) {
      headerIcon = 'user-check';
      headerTitle = 'تم الدفع - قيد تعيين المعلم ⏳';
      statusBadgeHTML = '<span class="badge" style="background:rgba(59,130,246,0.15); color:#3b82f6; font-weight:800;">تم الدفع - قيد تعيين المعلم</span>';
    } else if (isSchedulePending) {
      headerIcon = 'calendar-range';
      headerTitle = 'تم تعيين المعلم - قيد جدولة الباقة 🗓️';
      statusBadgeHTML = '<span class="badge" style="background:rgba(139,92,246,0.15); color:#8b5cf6; font-weight:800;">قيد جدولة الحصص 🗓️</span>';
    }

    const modalHTML = `
      <div class="modal-overlay" id="existing-sub-modal-dynamic" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.65); z-index:10000; justify-content:center; align-items:center;">
        <div class="modal-content" style="max-width:540px; width:92%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card); box-shadow:0 20px 40px rgba(0,0,0,0.35);">
          
          <!-- Header -->
          <div style="padding:24px; text-align:center; background:linear-gradient(135deg, ${isPendingPayment ? 'rgba(245,158,11,0.12), rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12), rgba(16,185,129,0.1)'}); border-bottom:1px solid var(--border-color);">
            <div style="width:64px; height:64px; border-radius:50%; background:${isPendingPayment ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)'}; color:${isPendingPayment ? '#f59e0b' : 'var(--primary)'}; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; border:2px solid ${isPendingPayment ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'};">
              <i data-lucide="${headerIcon}" style="width:32px; height:32px;"></i>
            </div>
            <h3 style="font-weight:900; font-size:1.25rem; margin:0 0 6px 0; color:var(--text-main);">
              ${headerTitle}
            </h3>
            <div style="display:flex; justify-content:center; gap:8px; align-items:center; flex-wrap:wrap;">
              ${statusBadgeHTML}
              <span class="badge" style="background:var(--bg-app); color:var(--text-muted); font-size:0.75rem; border:1px solid var(--border-color);">
                ${sub.plan?.name || 'باقة الحصص'}
              </span>
            </div>
          </div>

          <!-- Body -->
          <div style="padding:24px;">
            
            <!-- Subscription Info Box -->
            <div style="background:var(--bg-app); padding:16px; border-radius:16px; border:1px solid var(--border-color); margin-bottom:18px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <img src="${sub.teacher?.avatar || this.course.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:44px; height:44px; border-radius:50%; border:2px solid var(--primary); object-fit:cover;">
                  <div>
                    <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">أ. ${teacherName}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted);">كورس: ${this.course.title}</div>
                  </div>
                </div>
                ${!isPendingPayment ? `
                  <div style="text-align:end;">
                    <span style="font-size:1.4rem; font-weight:900; color:var(--primary);">${remaining}</span>
                    <span style="font-size:0.72rem; color:var(--text-muted); display:block;">حصص متبقية من ${total}</span>
                  </div>
                ` : `
                  <div style="text-align:end;">
                    <span style="font-size:1.2rem; font-weight:900; color:#f59e0b;">${total} حصص</span>
                    <span style="font-size:0.72rem; color:var(--text-muted); display:block;">إجمالي الباقة</span>
                  </div>
                `}
              </div>

              <div style="font-size:0.78rem; color:var(--text-muted); display:flex; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:10px; margin-top:8px;">
                <span>${isPendingPayment ? 'تاريخ الطلب: ' : 'ينتهي في: '}<strong>${new Date(isPendingPayment ? (sub.createdAt || sub.startDate) : sub.endDate).toLocaleDateString('ar')}</strong></span>
                <span>الباقة: <strong>${sub.plan?.name || `${total} حصص`}</strong></span>
              </div>
            </div>

            <!-- Context message depending on status -->
            ${isPendingPayment ? `
              <div style="background:rgba(245,158,11,0.08); padding:14px 16px; border-radius:14px; border:1px solid rgba(245,158,11,0.25); margin-bottom:20px; line-height:1.6; text-align:center;">
                <p style="font-size:0.92rem; color:var(--text-main); margin:0 0 6px 0; font-weight:700;">
                  ⏳ طلب اشتراكك قيد مراجعة وتأكيد الدفع
                </p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                  تم إرسال طلب اشتراكك في باقة (${sub.plan?.name || 'الحصص الخاصة'}). الطلب حالياً في انتظار تأكيد الدفع والاعتماد من قبل إدارة المنصة لتفعيل رصيد الحصص في حسابك مباشرة.
                </p>
              </div>

              <!-- Action buttons for PENDING_PAYMENT -->
              <div style="display:flex; flex-direction:column; gap:10px;">
                <button type="button" id="close-existing-sub-modal-btn" class="btn-primary" style="padding:12px; border-radius:14px; font-weight:800; font-size:0.92rem; justify-content:center;">
                  حسناً، فهمت 👍
                </button>

                <button type="button" id="cancel-existing-sub-btn" class="btn-secondary" style="border-color:rgba(239,68,68,0.3); color:#ef4444; padding:10px; border-radius:14px; font-weight:700; font-size:0.85rem; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="x-circle" style="width:15px;height:15px;"></i> إلغاء طلب الاشتراك الحالي
                </button>
              </div>
            ` : isTeacherAssignmentPending ? `
              <div style="background:rgba(59,130,246,0.08); padding:14px 16px; border-radius:14px; border:1px solid rgba(59,130,246,0.25); margin-bottom:20px; line-height:1.6; text-align:center;">
                <p style="font-size:0.92rem; color:var(--text-main); margin:0 0 6px 0; font-weight:700;">
                  ✅ تم تأكيد الدفع بنجاح
                </p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                  الطلب حالياً في انتظار تعيين المعلم المناسب من قبل الإدارة للبدء في جدولة الحصص.
                </p>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <button type="button" id="close-existing-sub-modal-btn" class="btn-primary" style="padding:12px; border-radius:14px; font-weight:800; font-size:0.92rem; justify-content:center;">
                  حسناً، فهمت 👍
                </button>
                <button type="button" id="cancel-existing-sub-btn" class="btn-secondary" style="border-color:rgba(239,68,68,0.3); color:#ef4444; padding:10px; border-radius:14px; font-weight:700; font-size:0.85rem; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="x-circle" style="width:15px;height:15px;"></i> إلغاء الطلب
                </button>
              </div>
            ` : isSchedulePending ? `
              <div style="background:rgba(139,92,246,0.08); padding:14px 16px; border-radius:14px; border:1px solid rgba(139,92,246,0.25); margin-bottom:20px; line-height:1.6; text-align:center;">
                <p style="font-size:0.92rem; color:var(--text-main); margin:0 0 6px 0; font-weight:700;">
                  🗓️ تم تعيين المعلم وجاري جدولة الحصص
                </p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                  تم ربط باقتك بالأستاذ (أ. ${teacherName})، والإدارة تقوم بجدولة المواعيد المتاحة حالياً.
                </p>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="#subscription-sessions?id=${sub.id}" class="btn-primary" style="padding:12px; border-radius:14px; font-weight:800; font-size:0.92rem; justify-content:center; text-decoration:none; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="calendar" style="width:16px;height:16px;"></i> متابعة جدول الحصص 🗓️
                </a>
                <button type="button" id="close-existing-sub-modal-btn" class="btn-secondary" style="padding:8px; border:none; color:var(--text-muted); font-size:0.85rem; justify-content:center;">
                  إغلاق
                </button>
              </div>
            ` : `
              <!-- Active Subscription UI -->
              ${remaining >= 2 ? `
                <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin:0 0 20px 0; background:rgba(99,102,241,0.06); padding:12px 14px; border-radius:12px; border-inline-start:4px solid var(--primary);">
                  💡 <strong>اشتراكك ما زال مستمراً:</strong> لديك رصيد <strong>${remaining} حصص قادمة</strong> متاحة للاستخدام. يمكنك متابعة جدول حصصك الحالي أو التجديد المبكر لإضافة رصيد إضافي، كما يمكنك إلغاء الاشتراك إذا كنت ترغب في ذلك.
                </p>
              ` : `
                <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin:0 0 20px 0; background:rgba(245,158,11,0.08); padding:12px 14px; border-radius:12px; border-inline-start:4px solid var(--warning,#f59e0b);">
                  ⚡ <strong>رصيدك قارب على الانتهاء:</strong> متبقي لديك (${remaining} حصة فقط). ننصحك بتجديد اشتراكك الآن لإضافة حصص جديدة ومتابعة دروسك دون انقطاع 🚀.
                </p>
              `}

              <!-- Action buttons for ACTIVE -->
              <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="#subscription-sessions?id=${sub.id}" class="btn-primary" style="padding:12px; border-radius:14px; font-weight:800; font-size:0.92rem; justify-content:center; text-decoration:none; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="calendar" style="width:16px;height:16px;"></i> عرض وإدارة جدول حصصي الحالية 🗓️
                </a>

                <a href="#subscription-plans?courseId=${this.course.id}&teacherId=${this.course.teacher?.id || ''}" class="btn-secondary" style="border-color:var(--primary); color:var(--primary); padding:11px; border-radius:14px; font-weight:800; font-size:0.9rem; justify-content:center; text-decoration:none; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="refresh-cw" style="width:16px;height:16px;"></i> تجديد الاشتراك وشراء باقة إضافية 🔄
                </a>

                <button type="button" id="cancel-existing-sub-btn" class="btn-secondary" style="border-color:rgba(239,68,68,0.3); color:#ef4444; padding:10px; border-radius:14px; font-weight:700; font-size:0.85rem; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="x-circle" style="width:15px;height:15px;"></i> طلب إلغاء الاشتراك الحالي
                </button>

                <button type="button" id="close-existing-sub-modal-btn" class="btn-secondary" style="padding:8px; border:none; color:var(--text-muted); font-size:0.85rem; justify-content:center;">
                  إغلاق
                </button>
              </div>
            `}

          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    if (window.lucide) window.lucide.createIcons();

    const modalEl = document.getElementById("existing-sub-modal-dynamic");
    const closeModal = () => modalEl?.remove();

    document.getElementById("close-existing-sub-modal-btn")?.addEventListener("click", closeModal);

    document.getElementById("cancel-existing-sub-btn")?.addEventListener("click", async () => {
      const confirmed = confirm("هل أنت متأكد من رغبتك في إلغاء هذا الاشتراك؟");
      if (!confirmed) return;

      try {
        await apiFetch(`/subscriptions/${sub.id}/cancel`, {
          method: "PATCH",
          body: JSON.stringify({ reason: "إلغاء الاشتراك من قبل الطالب" })
        });
        showToast("تم إلغاء الاشتراك بنجاح.", "success");
        closeModal();
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل إلغاء الاشتراك", "error");
      }
    });
  }

  renderMustEnrollModal() {
    const existingModal = document.getElementById("must-enroll-modal-dynamic");

    if (existingModal) existingModal.remove();

    const isPending = this.enrollmentStatus === 'pending';
    const isRejected = this.enrollmentStatus === 'rejected';
    const isPaid = !this.course.isFree && this.course.price > 0;
    const teacherName = this.course.teacher?.name || 'أستاذ المادة';

    const modalHTML = `
      <div class="modal-overlay" id="must-enroll-modal-dynamic" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.65); z-index:10000; justify-content:center; align-items:center;">
        <div class="modal-content" style="max-width:500px; width:92%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card); box-shadow:0 20px 40px rgba(0,0,0,0.3);">
          
          <div style="padding:24px; text-align:center; background:linear-gradient(135deg, rgba(245,158,11,0.12), rgba(99,102,241,0.08)); border-bottom:1px solid var(--border-color);">
            <div style="width:64px; height:64px; border-radius:50%; background:rgba(245,158,11,0.15); color:#f59e0b; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; border:2px solid rgba(245,158,11,0.3);">
              <i data-lucide="${isPending ? 'clock' : isRejected ? 'x-circle' : 'lock'}" style="width:32px; height:32px;"></i>
            </div>
            <h3 style="font-weight:900; font-size:1.3rem; margin:0 0 6px 0; color:var(--text-main);">
              ${isPending ? 'طلب الالتحاق قيد المراجعة ⏳' : isRejected ? 'طلب الالتحاق مرفوض ❌' : 'يلزم الالتحاق بالكورس أولاً 🔒'}
            </h3>
            <span class="badge" style="background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; font-size:0.78rem;">
              📚 ${this.course.title}
            </span>
          </div>

          <div style="padding:24px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px; background:var(--bg-app); padding:12px 14px; border-radius:14px; border:1px solid var(--border-color);">
              <img src="${this.course.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:46px; height:46px; border-radius:50%; border:2px solid #10b981; object-fit:cover;">
              <div>
                <div style="font-weight:800; font-size:0.95rem; color:var(--text-main);">${teacherName}</div>
                <div style="font-size:0.78rem; color:var(--text-muted);">أستاذ ومحاضر الكورس</div>
              </div>
            </div>

            ${isPending ? `
              <p style="font-size:0.92rem; color:var(--text-main); line-height:1.7; margin:0 0 24px 0; text-align:center;">
                طلب تسجيلك في هذا الكورس تم إرساله بنجاح وهو قيد المراجعة والموافقة من الإدارة حالياً.<br>
                <span style="color:var(--text-muted); font-size:0.85rem; display:block; margin-top:8px;">
                  بمجرد تفعيل اشتراكك في الكورس، ستتمكن من حجز الحصص الخاصة 1-on-1 مباشرة مع الأستاذ.
                </span>
              </p>
              <div style="display:flex; justify-content:center;">
                <button type="button" id="close-must-enroll-modal" class="btn-primary" style="padding:10px 28px; border-radius:30px; font-weight:800;">
                  حسناً، فهمت
                </button>
              </div>
            ` : isRejected ? `
              <p style="font-size:0.92rem; color:var(--text-main); line-height:1.7; margin:0 0 24px 0; text-align:center;">
                تم رفض طلب تسجيلك في هذا الكورس سابقاً. يرجى التواصل مع الدعم أو محاولة التسجيل مرة أخرى.
              </p>
              <div style="display:flex; justify-content:center;">
                <button type="button" id="close-must-enroll-modal" class="btn-secondary" style="padding:10px 28px; border-radius:30px; font-weight:800;">
                  إغلاق
                </button>
              </div>
            ` : `
              <p style="font-size:0.92rem; color:var(--text-main); line-height:1.7; margin:0 0 20px 0;">
                لطلب حجز حصة خاصة فردية ومباشرة (1-on-1) مع <strong>أ. ${teacherName}</strong>، يجب أن تكون مسجلاً ومشتركاً في كورس <strong>"${this.course.title}"</strong> أولاً.
              </p>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <button type="button" id="enroll-now-from-dialog-btn" class="btn-primary" style="padding:12px; border-radius:14px; font-weight:800; font-size:0.95rem; justify-content:center; gap:8px;">
                  <i data-lucide="sparkles" style="width:16px;height:16px;"></i> ${isPaid ? `التحاق بالكورس الآن (${this.course.price} ${this.course.currency || 'ج.م'}) 💳` : 'التسجيل في الكورس مجاناً الآن 🎁'}
                </button>
                <button type="button" id="close-must-enroll-modal" class="btn-secondary" style="padding:10px; border-radius:14px; font-weight:700; font-size:0.88rem; justify-content:center;">
                  إلغاء
                </button>
              </div>
            `}
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    if (window.lucide) window.lucide.createIcons();

    const modalEl = document.getElementById("must-enroll-modal-dynamic");
    const closeModal = () => modalEl?.remove();

    document.getElementById("close-must-enroll-modal")?.addEventListener("click", closeModal);
    document.getElementById("enroll-now-from-dialog-btn")?.addEventListener("click", () => {
      closeModal();
      const enrollHeroBtn = document.getElementById("enroll-hero-btn");
      if (enrollHeroBtn) {
        enrollHeroBtn.click();
      } else {
        if (isPaid) {
          this.renderPaidCourseEnrollmentModal();
        }
      }
    });
  }

  renderPaidCourseEnrollmentModal() {
    const existingModal = document.getElementById("paid-course-modal-dynamic");
    if (existingModal) existingModal.remove();

    const paymentInfo = this.course.paymentDetails || "فودافون كاش / إنستاباي / IBAN البنك الأهلي المصري\nرقم المحفظة المعتمـد: 01012345678\nالاسم: أكاديمية انطلق التعليمية";

    const modalHTML = `
      <div class="modal-overlay" id="paid-course-modal-dynamic" style="display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6); z-index:10000;">
        <div class="modal-content" style="max-width:540px; width:95%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card);">
          <div class="modal-header" style="padding:20px 24px; background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-weight:800; font-size:1.15rem; margin:0; display:flex; align-items:center; gap:8px; color:var(--text-main);">
              <i data-lucide="credit-card" style="color:var(--primary);"></i>
              تفاصيل دفع رسوم الدورة 💳
            </h3>
            <span id="close-paid-course-modal" style="font-size:1.4rem; cursor:pointer; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
          </div>

          <div style="padding:24px;">
            <!-- Course Summary Box -->
            <div style="margin-bottom:18px; padding:14px 16px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:0.75rem; color:var(--primary); font-weight:800; text-transform:uppercase;">${this.course.category}</div>
                <div style="font-size:1rem; font-weight:800; color:var(--text-main); margin-top:2px;">${this.course.title}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">المعلم: ${this.course.teacher?.name || 'منصة انطلق'}</div>
              </div>
              <div style="text-align:end; font-size:1.2rem; font-weight:800; color:var(--primary);">
                ${this.course.price} ${this.course.currency || 'ج.م'}
              </div>
            </div>

            <!-- Attached Payment Details -->
            <div style="margin-bottom:20px; padding:16px; border-radius:16px; background:linear-gradient(135deg, rgba(79,70,229,0.06), rgba(16,185,129,0.06)); border:1px solid var(--border-focus);">
              <label style="font-weight:800; font-size:0.88rem; margin-bottom:8px; display:flex; align-items:center; gap:6px; color:var(--text-main);">
                <i data-lucide="building-bank" style="width:16px; height:16px; color:var(--primary);"></i>
                بيانات التحويل المعتمـدة المرفقة بالدورة
              </label>
              <div style="font-size:0.85rem; color:var(--text-main); line-height:1.6; white-space:pre-wrap; font-weight:600; font-family:monospace; background:var(--bg-app); padding:12px; border-radius:10px; border:1px solid var(--border-color);">
                ${paymentInfo}
              </div>
            </div>

            <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 20px 0; line-height:1.5;">
              يرجى تحويل المبلغ المطلوب وفق البيانات أعلاه، ثم النقر على تأكيد طلب الالتحاق لإرسال الطلب لإدارة المنصة والمعلم للاعتماد.
            </p>

            <div style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border-color); padding-top:16px;">
              <button type="button" class="btn-secondary" id="cancel-paid-course-modal" style="padding:10px 20px; border-radius:30px; font-size:0.88rem;">إلغاء</button>
              <button type="button" id="confirm-paid-enrollment-btn" class="btn-primary" style="padding:10px 24px; border-radius:30px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#4f46e5,#0056D2); border:none; gap:6px; display:inline-flex; align-items:center;">
                <i data-lucide="check-circle" style="width:16px; height:16px;"></i> تأكيد طلب الحجز والدفع 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    if (window.lucide) window.lucide.createIcons();

    const modalEl = document.getElementById("paid-course-modal-dynamic");
    const closeBtn = document.getElementById("close-paid-course-modal");
    const cancelBtn = document.getElementById("cancel-paid-course-modal");
    const confirmBtn = document.getElementById("confirm-paid-enrollment-btn");

    const closeModal = () => modalEl.remove();
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    confirmBtn?.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      try {
        await apiFetch(`/student/enrollments`, {
          method: "POST",
          body: JSON.stringify({ courseId: this.course.id })
        });
        showToast("تم تقديم طلب التسجيل بنجاح! في انتظار موافقة المعلم وتأكيد الدفع.", "success");
        closeModal();
        showEnrollmentRequestedModal({
          courseTitle: this.course.title,
          teacherName: this.course.teacher?.name,
          courseImage: this.course.image
        });
        await this.render();
      } catch (err) {
        showToast(err.message || "فشل تقديم طلب التسجيل", "error");
        confirmBtn.disabled = false;
      }
    });
  }

  onDestroy() { }
}
