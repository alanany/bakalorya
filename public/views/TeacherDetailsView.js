import { apiFetch, state, showToast, t, getCleanWhatsAppNumber } from "../app.js";

export default class TeacherDetailsView {
  constructor(container, teacherId) {
    this.container = container;
    this.teacherId = teacherId;
    this.teacher = null;
    this.courses = [];
    this.blogs = [];
  }

  async render() {
    this.container.innerHTML = `
      <div style="width:100%; max-width:1400px; margin:0 auto; padding:40px 32px 80px;">
        <div style="text-align:center; padding:60px; color:var(--text-muted);">
          <div class="spinner" style="margin:0 auto 16px;"></div>
          <p>جارٍ تحميل ملف الأستاذ...</p>
        </div>
      </div>
    `;

    try {
      const [teacher, allCourses, allBlogs, reviewsRes] = await Promise.all([
        apiFetch(`/teachers/${this.teacherId}`).catch(() => null),
        apiFetch(`/courses`).catch(() => []),
        apiFetch(`/blogs`).catch(() => []),
        apiFetch(`/reviews/teacher/${this.teacherId}`).catch(() => ({ reviews: [], totalReviews: 0, averageRating: 0 }))
      ]);

      if (!teacher || teacher.error) {
        this.renderNotFound();
        return;
      }

      this.teacher = teacher;
      this.courses = Array.isArray(allCourses) ? allCourses.filter(c => c.teacher?.id === this.teacherId) : [];
      this.blogs = Array.isArray(allBlogs) ? allBlogs.filter(b => b.author?.id === this.teacherId) : [];
      this.teacherReviews = reviewsRes?.reviews || [];
      this.teacherAvgRating = reviewsRes?.averageRating || 4.9;
      this.teacherReviewsCount = reviewsRes?.totalReviews || this.teacherReviews.length;

      this.renderContent();
    } catch (err) {
      console.error("Error loading teacher profile:", err);
      this.renderNotFound();
    }
  }

  renderNotFound() {
    this.container.innerHTML = `
      <div style="max-width:600px; margin:80px auto; text-align:center; padding:40px;">
        <div style="font-size:4rem; margin-bottom:16px;">👨‍🏫</div>
        <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:12px;">ملف الأستاذ غير موجود</h2>
        <p style="color:var(--text-muted); margin-bottom:24px;">عذراً، لم نتمكن من العثور على المعلم المطلوب.</p>
        <a href="#landing" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none;">
          <i data-lucide="arrow-right"></i> العودة للصفحة الرئيسية
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  renderContent() {
    const tProfile = this.teacher;
    const name = tProfile.name || "أستاذ البكالوريا";
    const avatar = tProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
    const education = tProfile.education || "أستاذ وخبير تربوي متميز في البكالوريا";
    const location = tProfile.location || "المنصة الرقمية";
    const categories = [...new Set((this.teacherCourses || []).map(c => c.category).filter(Boolean))];

    const rawPhone = tProfile.phone || "";
    const cleanPhoneWa = getCleanWhatsAppNumber(rawPhone);

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
                  <i data-lucide="book-open" style="width:16px; height:16px; color:var(--accent);"></i> ${this.courses.length} دورات تعليمية
                </span>
                <span style="display:flex; align-items:center; gap:6px;">
                  <i data-lucide="newspaper" style="width:16px; height:16px; color:#ec4899;"></i> ${this.blogs.length} مقالات منشورة
                </span>
              </div>

              <!-- Quick Contact Actions -->
              <div style="display:flex; gap:12px; flex-wrap:wrap;">
                ${tProfile.meetingLink ? `
                  <a href="${tProfile.meetingLink}" target="_blank" class="btn-primary" style="text-decoration:none; padding:10px 22px; border-radius:30px; font-size:0.88rem; display:inline-flex; align-items:center; gap:8px;">
                    <i data-lucide="video"></i> رابط البث المباشر للأستاذ
                  </a>
                ` : ''}
                ${rawPhone ? `
                  <a href="https://wa.me/${cleanPhoneWa}" target="_blank" class="btn-secondary" style="text-decoration:none; padding:10px 20px; border-radius:30px; font-size:0.88rem; color:var(--success); border-color:var(--success); display:inline-flex; align-items:center; gap:8px;">
                    <i data-lucide="message-circle"></i> تواصل عبر WhatsApp
                  </a>
                ` : ''}
              </div>
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

        <!-- Section 1: Teacher's Courses -->
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

  onDestroy() {}
}
