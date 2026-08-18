import { apiFetch, state, showToast, t, showEnrollmentRequestedModal } from "../app.js";

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

      // Fetch course and enrollments (if logged in)
      const fetchPromises = [apiFetch(`/courses/${this.courseId}`)];
      if (state.user && state.user.role === 'student') {
        fetchPromises.push(apiFetch("/student/enrollments"));
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

      const hasLessons = this.course.lessons && this.course.lessons.length > 0;

      const chaptersMap = {};
      let totalDuration = 0;
      if (hasLessons) {
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
      }

      const totalHours = Math.floor(totalDuration / 3600);
      const totalMins = Math.floor((totalDuration % 3600) / 60);
      const durationText = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

      this.container.innerHTML = `
        <div style="background:var(--bg-color); min-height:100vh;">
          
          <!-- Top Cover (Slider / Hero) -->
          <div style="position: relative; width: 100%; min-height: 340px; background-image: url('${this.course.image}'); background-size: cover; background-position: center; padding: 40px 16px;">
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
                ${this.course.teacher && (!state.user || state.user.role === 'student' && this.enrollmentStatus === 'active') ? `
                  <button id="book-private-session-hero-btn" class="btn-secondary" style="padding: 12px 24px; font-size: 0.9rem; font-weight: 800; border-radius: 30px; background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.5); color:#fff; backdrop-filter:blur(8px); display:inline-flex; align-items:center; justify-content:center; gap:8px;">
                    <i data-lucide="user-check"></i> احجز حصص خاصة مع المعلم
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Main Content Section (2 columns: Left Content, Right Description) -->
          <div style="max-width: 1200px; margin: 0 auto; padding: 60px 24px; display:flex; gap:40px; flex-wrap: wrap;">
            
            <!-- Left: Course Content (Curriculum) -->
            <div style="flex: 2; min-width: 300px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-main); margin:0;">Course Content</h2>
                <span style="font-size:0.9rem; color:var(--text-muted);">${Object.keys(chaptersMap).length} sections • ${this.course.lessons?.length || 0} lessons • ${durationText}</span>
              </div>
              
              ${Object.keys(chaptersMap).length === 0 ? `
                <div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted);">
                  Curriculum is currently being developed.
                </div>
              ` : `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow:hidden; background: var(--card-bg);">
                  ${Object.keys(chaptersMap).map((chName, idx) => `
                    <div style="border-bottom: 1px solid var(--border-color);">
                      <div style="background: rgba(0,0,0,0.02); padding: 16px 24px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; font-size:1.1rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                          <i data-lucide="folder" style="width:18px; color:var(--primary);"></i> ${chName}
                        </span>
                        <span style="font-size:0.85rem; color:var(--text-muted);">${chaptersMap[chName].length} lessons</span>
                      </div>
                      <div>
                        ${chaptersMap[chName].map(l => `
                          <div style="padding: 12px 24px 12px 48px; border-top: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background: var(--bg-color);">
                            <span style="display:flex; align-items:center; gap:12px; font-size:0.95rem; color:var(--text-main);">
                              <i data-lucide="play-circle" style="width:16px; color:var(--text-muted);"></i>
                              ${l.title}
                            </span>
                            <span style="font-size:0.8rem; color:var(--text-muted); background: var(--card-bg); padding: 2px 8px; border-radius: 12px; border: 1px solid var(--border-color);">${l.duration || '--:--'}</span>
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
                    <div style="font-weight:800; font-size:1.1rem; color:var(--text-main);">${this.course.teacher?.name || "Bakalorya Instructor"}</div>
                    <div style="font-size:0.9rem; color:var(--text-muted);">Teacher</div>
                  </div>
                </div>
              </div>

              <!-- Cross-sell section -->
               <div class="glass-card" style="padding: 24px; margin-top:24px; background:linear-gradient(135deg, rgba(16,185,129,0.07), rgba(16,185,129,0.02)); border:1px solid rgba(16,185,129,0.25);">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; color:#10b981;">
                  <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.12); display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="video" style="width:22px; height:22px;"></i>
                  </div>
                  <h3 style="font-size:1.1rem; font-weight:800; margin:0; color:var(--text-main);">حصة خاصة مع المعلم</h3>
                </div>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                  <img src="${this.course.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:40px; height:40px; border-radius:50%; border:2px solid rgba(16,185,129,0.4);">
                  <div>
                    <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">${this.course.teacher?.name || 'المعلم'}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted);">متاح للحصص الفردية (1-على-1)</div>
                  </div>
                </div>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px; line-height:1.5;">
                  احجز حصة خاصة مباشرة مع هذا المعلم لشرح مخصص وتفاعل فردي.
                </p>
               ${this.enrollmentStatus !== 'active' ? `` : ` <button id="book-private-session-card-btn" class="btn-primary" style="background:#10b981; border-color:#10b981; width:100%; justify-content:center;">
                  <i data-lucide="calendar-plus" style="width:16px;height:16px;"></i> احجز حصة خاصة الآن
                </button>`}
              </div>
            </div>

          </div>

          <!-- Bottom: Reviews (Placeholder) -->
          <div style="max-width: 1200px; margin: 0 auto; padding: 0 24px 60px 24px;">
            <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-main); margin-bottom:24px;">Student Reviews</h2>
            <div class="glass-card" style="padding: 40px; text-align:center;">
              <i data-lucide="message-square" style="width:48px; height:48px; color:var(--border-color); margin-bottom:16px;"></i>
              <h3 style="font-size:1.2rem; color:var(--text-main); margin-bottom:8px;">No reviews yet</h3>
              <p style="color:var(--text-muted); font-size:0.95rem;">Enroll now and be the first to leave a review for this course!</p>
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
      window.location.hash = "#subscription-plans";
    };

    document.getElementById("book-private-session-hero-btn")?.addEventListener("click", handleBookPrivateSession);
    document.getElementById("book-private-session-card-btn")?.addEventListener("click", handleBookPrivateSession);
  }

  renderPaidCourseEnrollmentModal() {
    const existingModal = document.getElementById("paid-course-modal-dynamic");
    if (existingModal) existingModal.remove();

    const paymentInfo = this.course.paymentDetails || "فودافون كاش / إنستاباي / IBAN البنك الأهلي المصري\nرقم المحفظة المعتمـد: 01012345678\nالاسم: أكاديمية بكالوريا التعليمية";

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
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">المعلم: ${this.course.teacher?.name || 'منصة بكالوريا'}</div>
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
