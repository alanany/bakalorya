import { apiFetch, state, t, renderCourseCard, showToast } from "../app.js";

export default class LandingView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.sessions = [];
    this.activeCategory = "all";
    this.platformStats = null;
    this.chartInstance = null;
    this.currentChartType = "growth";

    // Curriculum & Groups Explorer State
    this.explorerStage = "PRIMARY";
    this.explorerGradeId = null;
    this.explorerSubjectId = null;
    this.explorerDays = [];
    this.daysList = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    this.allGradesData = [];
  }

  async render() {
    this.container.innerHTML = `
      <div style="background:var(--bg-app); min-height:100vh;">

        <!-- TOP UTILITY BAR -->
        <div class="landing-utility-bar" style="background:#09090b; border-bottom:1px solid rgba(255,255,255,0.08); padding:8px 24px; font-size:0.82rem; color:var(--text-muted);">
          <div style="max-width:1280px; margin:0 auto; display:flex; gap:24px; align-items:center; font-weight:700;">
            <span style="color:var(--primary); border-bottom:2px solid var(--primary); padding-bottom:4px; cursor:pointer;">للطلاب والمتفوقين</span>
            <span style="cursor:pointer; opacity:0.8;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.8'">للمعلمين والأساتذة</span>
            <span style="cursor:pointer; opacity:0.8;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.8'">للمدارس والمؤسسات</span>
          </div>
        </div>

        <!-- SCREENSHOT 1: SECTION 1 (DUAL HERO CAROUSEL) -->
        <section style="max-width:1280px; margin:0 auto; padding:32px 24px 16px 24px;">
          <div class="hero-section-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px; align-items:stretch;">
            
            <div class="glass-card hero-card-main" style="background:linear-gradient(135deg, #0056D2 0%, #1e40af 100%); color:#ffffff; border-radius:24px; padding:40px 32px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; min-height:300px; box-shadow:0 12px 36px rgba(0,86,210,0.25);">
              <div style="max-width:320px; z-index:2;">
                <h1 style="font-size:2.1rem; font-weight:900; line-height:1.25; margin-bottom:14px; color:#ffffff;">
                  ابدأ، طوّر، وحقق أفضل درجات انطلق 🎓
                </h1>
                <p style="font-size:0.95rem; opacity:0.9; line-height:1.6; margin-bottom:24px;">
                  تعلم وتفوق مع أفضل الدورات والدروس المباشرة مع نخبة معلمي مصر و الوطن العربي.
                </p>
                <a href="#signup" class="btn-primary" style="background:#ffffff; color:#0056D2; padding:12px 28px; font-weight:800; font-size:0.95rem; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                  سجل مجاناً الآن <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>

              <div class="hero-card-image-wrapper" style="position:relative; width:160px; height:200px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.15); top:10px; right:-20px;"></div>
                <img src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80" alt="Education & Learning" style="width:140px; height:180px; object-fit:cover; border-radius:24px; position:relative; z-index:2; border:3px solid rgba(255,255,255,0.3); box-shadow:0 12px 30px rgba(0,0,0,0.25);">
              </div>
            </div>

            <div class="glass-card hero-card-secondary" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:24px; padding:40px 32px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; min-height:300px;">
              <div style="max-width:320px; z-index:2;">
                <h2 style="font-size:1.8rem; font-weight:900; line-height:1.3; margin-bottom:14px; color:var(--text-color);">
                  ارتقِ بمستوى طلابك وانضم لطاقم معلّمي انطلق 👨‍🏫
                </h2>
                <p style="font-size:0.92rem; color:var(--text-muted); line-height:1.6; margin-bottom:24px;">
                  قدّم دوراتك وبثك المباشر لآلاف الطلاب ومكّنهم من تحقيق أفضل النتائج.
                </p>
                <a href="#teacher-apply" class="btn-primary" style="padding:12px 28px; font-weight:800; font-size:0.95rem; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                  انضم كـ معلم بالمنصة <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>

              <div id="hero-categories-container" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; flex-shrink:0; width:180px;">
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:10px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:var(--primary);">📐 رياضيات</div>
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:10px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:#f59e0b;">⚡ فيزياء</div>
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:10px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:#10b981;">🧪 كيمياء</div>
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:10px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:#ec4899;">📖 لغات</div>
              </div>
            </div>

          </div>

          <div style="display:flex; justify-content:flex-start; gap:8px; align-items:center; margin-top:20px; padding-inline-start:8px;">
            <span class="hero-dot active" style="width:28px; height:8px; border-radius:4px; background:var(--primary); cursor:pointer;"></span>
            <span class="hero-dot" style="width:10px; height:8px; border-radius:4px; background:var(--border-color); cursor:pointer;"></span>
            <span class="hero-dot" style="width:10px; height:8px; border-radius:4px; background:var(--border-color); cursor:pointer;"></span>
          </div>
        </section>


        <!-- 🌟 CREATIVE CURRICULUM EXPLORER (HERO STAGE, GRADE & SUBJECTS SELECTOR) -->
        <section id="interactive-curriculum-explorer" style="max-width:1280px; margin:0 auto; padding:20px 24px 44px 24px;">
          <div class="glass-card curriculum-explorer-box" style="
            background: linear-gradient(180deg, var(--bg-card) 0%, rgba(24, 24, 27, 0.02) 100%);
            border: 1px solid var(--border-color);
            border-radius: 32px;
            padding: 44px 36px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.04);
            position: relative;
            overflow: hidden;
          ">
            
            <!-- BACKGROUND AMBIENT GLOW EFFECTS -->
            <div style="position:absolute; top:-100px; right:-100px; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle, rgba(229,29,116,0.12) 0%, transparent 70%); pointer-events:none;"></div>
            <div style="position:absolute; bottom:-100px; left:-100px; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle, rgba(0,86,210,0.1) 0%, transparent 70%); pointer-events:none;"></div>

        <!-- SECTION 1: INTERACTIVE ACCORDION CURRICULUM EXPLORER (WIDE & EXPANSIVE) -->
        <section style="max-width:1400px; width:100%; margin:0 auto; padding:36px 16px 24px 16px; direction:rtl;">
          
          <div style="background:var(--bg-card); border:1.5px solid var(--border-color); border-radius:28px; padding:36px 18px; box-shadow:0 16px 48px rgba(0,0,0,0.04); position:relative; overflow:hidden;">
            
            <!-- Floating Decorative Background Glows -->
            <div style="position:absolute; top:-60px; right:-60px; width:260px; height:260px; border-radius:50%; background:radial-gradient(circle, rgba(0,86,210,0.12) 0%, transparent 70%); pointer-events:none;"></div>
            <div style="position:absolute; bottom:-60px; left:-60px; width:260px; height:260px; border-radius:50%; background:radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%); pointer-events:none;"></div>

            <!-- SECTION HEADER (CENTERED) -->
            <div style="text-align:center; max-width:820px; margin:0 auto 36px auto; position:relative; z-index:1;">
              <span style="font-size:0.85rem; font-weight:900; background:rgba(0,86,210,0.08); color:var(--primary); padding:6px 18px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; margin-bottom:12px;">
                <i data-lucide="compass" style="width:15px;height:15px;"></i> استكشف المناهج والمجموعات الدراسية
              </span>
              <h2 style="font-size:clamp(1.7rem, 3.5vw, 2.4rem); font-weight:900; color:var(--text-color); margin-bottom:10px; line-height:1.3; letter-spacing:-0.5px;">
                اختر مرحلتك وصفك الدراسي 🎯
              </h2>
              <p style="font-size:0.98rem; color:var(--text-muted); line-height:1.6; margin:0 auto; max-width:680px;">
                افتح مرحلتك الدراسية لرؤية الصفوف والمواد المقررة، واستعراض الحصص والمجموعات المتاحة فوراً مع نخبة الأساتذة.
              </p>
            </div>

            <!-- WIDE ACCORDION CONTAINER -->
            <div id="curriculum-accordion-container" style="max-width:100%; margin:0 auto; position:relative; z-index:1;">
              <div style="text-align:center; padding:40px 0; color:var(--text-muted);">
                <div class="spinner" style="width:36px;height:36px;margin:0 auto 12px;border-width:3px;"></div>
                <p style="font-weight:700; font-size:0.9rem;">جاري تحميل المراحل والمواد الدراسية...</p>
              </div>
            </div>

          </div>
        </section>


        <!-- SCREENSHOT 1: SECTION 2 (DYNAMIC NEW AND POPULAR 3-COLUMNS FROM DATABASE) -->
        <section style="max-width:1280px; margin:0 auto; padding:32px 24px;">
          

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">

            <!-- Column 1: Most popular -->
            <div class="glass-card" style="background:rgba(99,102,241,0.04); border:1px solid var(--border-color); border-radius:20px; padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-color); margin:0;">
                  الأكثر طلباً ومتابعة <i data-lucide="arrow-left" style="width:16px;height:16px; color:var(--primary);"></i>
                </h3>
                <span style="font-size:0.75rem; color:var(--primary); font-weight:700;"></span>
              </div>
              <div id="most-popular-container" style="display:flex; flex-direction:column; gap:14px;">
                <div style="text-align:center; padding:20px; color:var(--text-muted);"><i data-lucide="loader" class="spinner" style="width:24px;height:24px;border-width:2px;margin:0 auto;"></i></div>
              </div>
            </div>

            <!-- Column 2: Hot new releases -->
            <div class="glass-card" style="background:rgba(245,158,11,0.04); border:1px solid var(--border-color); border-radius:20px; padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-color); margin:0;">
                  الإصدارات الحديثة <i data-lucide="arrow-left" style="width:16px;height:16px; color:#f59e0b;"></i>
                </h3>
                <span style="font-size:0.75rem; color:#f59e0b; font-weight:700;"></span>
              </div>
              <div id="new-releases-container" style="display:flex; flex-direction:column; gap:14px;">
                <div style="text-align:center; padding:20px; color:var(--text-muted);"><i data-lucide="loader" class="spinner" style="width:24px;height:24px;border-width:2px;margin:0 auto;"></i></div>
              </div>
            </div>

            <!-- Column 3: Trending AI/Live courses -->
            <div class="glass-card" style="background:rgba(16,185,129,0.04); border:1px solid var(--border-color); border-radius:20px; padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-color); margin:0;">
                  جلسات البث والمراجعات <i data-lucide="arrow-left" style="width:16px;height:16px; color:#10b981;"></i>
                </h3>
                <span style="font-size:0.75rem; color:#10b981; font-weight:700;"></span>
              </div>
              <div id="trending-sessions-container" style="display:flex; flex-direction:column; gap:14px;">
                <div style="text-align:center; padding:20px; color:var(--text-muted);"><i data-lucide="loader" class="spinner" style="width:24px;height:24px;border-width:2px;margin:0 auto;"></i></div>
              </div>
            </div>

          </div>
        </section>


        <!-- SCREENSHOT 2: SECTION 1 (GRADIENT FEATURED CAREER BANNER DYNAMIC FROM DATABASE) -->
        <section style="max-width:1280px; margin:0 auto; padding:20px 24px 32px 24px;">
          <div style="background:linear-gradient(135deg, #0056D2 0%, #10b981 100%); border-radius:24px; padding:36px; color:#ffffff; position:relative; overflow:hidden; box-shadow:0 16px 40px rgba(0,86,210,0.25);">
            
            <div class="gradient-banner-inner" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:16px;">
              <div style="max-width:440px;">
                <h2 style="font-size:1.6rem; font-weight:900; margin-bottom:6px; color:#ffffff;">استعد لاجتياز امتحانات انطلق بامتياز</h2>
                <p style="font-size:0.92rem; opacity:0.9; margin:0;">اختر مسارك المفضل وابدأ في مراجعة أقوى الدورات والشهادات التدريبية.</p>
              </div>

              <div id="featured-category-pills" style="display:flex; gap:8px; flex-wrap:wrap; background:rgba(255,255,255,0.15); padding:6px; border-radius:30px; backdrop-filter:blur(10px);">
                <button class="gradient-pill-btn active" data-cat="all" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:#000000; color:#ffffff; border:none; cursor:pointer;">📐 الرياضيات</button>
                <button class="gradient-pill-btn" data-cat="فيزياء" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:rgba(255,255,255,0.85); color:#0056D2; border:none; cursor:pointer;">⚡ الفيزياء</button>
                <button class="gradient-pill-btn" data-cat="كيمياء" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:rgba(255,255,255,0.85); color:#0056D2; border:none; cursor:pointer;">🧪 الكيمياء</button>
                <button class="gradient-pill-btn" data-cat="علوم" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:rgba(255,255,255,0.85); color:#0056D2; border:none; cursor:pointer;">📖 العلوم واللغات</button>
              </div>
            </div>

            <!-- Horizontal 4-Cards Grid Dynamic -->
            <div id="gradient-featured-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:20px;">
              <div style="text-align:center; padding:40px; color:#ffffff; grid-column:1/-1;"><i data-lucide="loader" class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto;border-top-color:#fff;"></i></div>
            </div>

          </div>
        </section>


        <!-- SCREENSHOT 2: SECTION 2 (DUAL SUBSCRIPTION BANNERS) -->
        <section style="max-width:1280px; margin:0 auto; padding:0 24px 40px 24px;">
          <div class="subscription-banners-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px;">
            <div class="glass-card subscription-banner-card" style="background:linear-gradient(135deg, #0056D2 0%, #2563eb 100%); color:#ffffff; border-radius:24px; padding:36px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; box-shadow:0 12px 32px rgba(0,86,210,0.2);">
              <div style="max-width:300px; z-index:2;">
                <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.2); padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:900; margin-bottom:12px;">
                   <span style="background:#f59e0b; color:#000; padding:2px 6px; border-radius:4px; font-size:0.75rem;">PLUS</span>
                </div>
                <h3 style="font-size:1.5rem; font-weight:900; line-height:1.3; margin-bottom:12px; color:#ffffff;">
                  احصل على وصول كلي لجميع دورات وملخصات انطلق
                </h3>
                <a href="#signup" style="color:#ffffff; font-weight:800; font-size:0.95rem; text-decoration:underline; display:inline-flex; align-items:center; gap:6px;">
                  ابدأ تجربتك المجانية لمدة 7 أيام <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>
              <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&auto=format&fit=crop&q=80" alt="Education Books" style="width:120px; height:150px; object-fit:cover; border-radius:20px; border:2px solid rgba(255,255,255,0.3); flex-shrink:0;">
            </div>

            <div class="glass-card subscription-banner-card" style="background:linear-gradient(135deg, #001e50 0%, #0f172a 100%); color:#ffffff; border-radius:24px; padding:36px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; box-shadow:0 12px 32px rgba(0,30,80,0.3); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#teacher-apply'">
              <div style="max-width:300px; z-index:2;">
                <div style="display:inline-flex; align-items:center; gap:6px; color:#93c5fd; font-size:0.8rem; font-weight:900; margin-bottom:12px;">
                   <span style="color:#ffffff; font-weight:500;">for teachers & schools</span>
                </div>
                <h3 style="font-size:1.5rem; font-weight:900; line-height:1.3; margin-bottom:12px; color:#ffffff;">
                  مكّن أساتذتك وطلابك من أحدث أدوات التعليم الرقمي
                </h3>
                <a href="#teacher-apply" style="color:#93c5fd; font-weight:800; font-size:0.95rem; text-decoration:underline; display:inline-flex; align-items:center; gap:6px;">
                  اكتشف حلول المؤسسات والمدارس <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>
              <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80" alt="Digital School Tools" style="width:120px; height:150px; object-fit:cover; border-radius:20px; border:2px solid rgba(255,255,255,0.2); flex-shrink:0;">
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 3: SECTION 1 (MAIN UX PATHS) -->
        <section style="max-width:1280px; margin:0 auto; padding:16px 24px 32px 24px;">
          <h2 style="font-size:1.8rem; font-weight:900; color:var(--text-color); margin-bottom:24px; text-align:center;">
            ماذا تريد أن تتعلم؟
          </h2>
          <div class="learn-paths-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
            <!-- Courses Path -->
            <div class="glass-card learn-path-card" style="background:linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(37,99,235,0.01) 100%); border:1px solid rgba(37,99,235,0.2); border-radius:24px; padding:40px; display:flex; flex-direction:column; align-items:center; text-align:center; transition:transform 0.2s; cursor:pointer;" onmouseenter="this.style.transform='translateY(-6px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#courses'">
              <div style="width:80px; height:80px; background:rgba(37,99,235,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:24px; color:#2563eb;">
                <i data-lucide="book-open" style="width:40px; height:40px;"></i>
              </div>
              <h3 style="font-size:1.6rem; font-weight:900; color:var(--text-color); margin-bottom:12px;">📚 الكورسات</h3>
              <p style="font-size:1.05rem; color:var(--text-muted); line-height:1.6; margin-bottom:32px; max-width:280px;">
                تعلم من خلال كورسات منظمة خطوة بخطوة مع نخبة من الأساتذة.
              </p>
              <a href="#courses" class="btn-primary" style="padding:14px 32px; font-size:1.05rem; border-radius:30px; width:100%; text-decoration:none; justify-content:center;">استكشف الكورسات</a>
            </div>

            <!-- Private Lessons Path -->
            <div class="glass-card learn-path-card" style="background:linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.01) 100%); border:1px solid rgba(16,185,129,0.2); border-radius:24px; padding:40px; display:flex; flex-direction:column; align-items:center; text-align:center; transition:transform 0.2s; cursor:pointer;" onmouseenter="this.style.transform='translateY(-6px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#subscription-plans'">
              <div style="width:80px; height:80px; background:rgba(16,185,129,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:24px; color:#10b981;">
                <i data-lucide="users" style="width:40px; height:40px;"></i>
              </div>
              <h3 style="font-size:1.6rem; font-weight:900; color:var(--text-color); margin-bottom:12px;">👨‍🏫 حصص فردية</h3>
              <p style="font-size:1.05rem; color:var(--text-muted); line-height:1.6; margin-bottom:32px; max-width:280px;">
                اختر مدرسًا واحجز حصصًا خاصة (1 على 1) تناسب جدولك ومستواك الدراسي.
              </p>
              <a href="#subscription-plans" class="btn-primary" style="background:#10b981; border-color:#10b981; padding:14px 32px; font-size:1.05rem; border-radius:30px; width:100%; text-decoration:none; justify-content:center;">احجز حصتك الخاصة</a>
            </div>
          </div>
        </section>


        <!-- SECTION 2: EXPLORE SPECIALIZATIONS & DEGREES -->
        <section style="max-width:1280px; margin:0 auto; padding:20px 24px 40px 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
            <div>
              <h2 style="font-size:1.75rem; font-weight:900; color:var(--text-color); margin:0 0 4px 0;">
                استكشف المراحل والصفوف الدراسية
              </h2>
              <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">شامل لجميع الصفوف الدراسية من الابتدائية والإعدادية حتى الثانوية والأزهر الشريف</p>
            </div>
            <a href="#courses" style="color:var(--primary); font-weight:800; text-decoration:none; font-size:0.9rem;">عرض جميع المسارات ➔</a>
          </div>

          <div class="degrees-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px;">
            <!-- Secondary -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#courses'">
              <div>
                <div style="background:#dbeafe; border-radius:14px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <span style="font-size:2.2rem; display:block; margin-bottom:4px;">🎓</span>
                  <span style="font-weight:900; font-size:0.75rem; color:#1e40af; background:#ffffff; padding:2px 10px; border-radius:12px;">1ث - 2ث - 3ث</span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">المرحلة الثانوية العامة</h3>
                <p style="font-size:0.82rem; color:#64748b; line-height:1.5; margin:0;">علمي علوم، علمي رياضة، أدبي، والتحضير الشامل للشهادة الثانوية العامة.</p>
              </div>
            </div>

            <!-- Prep -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#courses'">
              <div>
                <div style="background:#dcfce7; border-radius:14px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <span style="font-size:2.2rem; display:block; margin-bottom:4px;">📘</span>
                  <span style="font-weight:900; font-size:0.75rem; color:#166534; background:#ffffff; padding:2px 10px; border-radius:12px;">1ع - 2ع - 3ع</span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">المرحلة الإعدادية</h3>
                <p style="font-size:0.82rem; color:#64748b; line-height:1.5; margin:0;">الصف الأول، الثاني، والثالث الإعدادي وتأسيس المواد الأساسية المتقدمة.</p>
              </div>
            </div>

            <!-- Primary -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#courses'">
              <div>
                <div style="background:#fef3c7; border-radius:14px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <span style="font-size:2.2rem; display:block; margin-bottom:4px;">🎒</span>
                  <span style="font-weight:900; font-size:0.75rem; color:#92400e; background:#ffffff; padding:2px 10px; border-radius:12px;">1ب - 2ب - 3ب - 4ب - 5ب - 6ب</span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">المرحلة الابتدائية</h3>
                <p style="font-size:0.82rem; color:#64748b; line-height:1.5; margin:0;">صفوف الابتدائي من الصف الأول حتى السادس الابتدائي واللغات والماث.</p>
              </div>
            </div>

            <!-- Azhar -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#courses'">
              <div>
                <div style="background:#fce7f3; border-radius:14px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <span style="font-size:2.2rem; display:block; margin-bottom:4px;">🕌</span>
                  <span style="font-weight:900; font-size:0.75rem; color:#9d174d; background:#ffffff; padding:2px 10px; border-radius:12px;">أزهر شريف</span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">التعليم الأزهري الشريف</h3>
                <p style="font-size:0.82rem; color:#64748b; line-height:1.5; margin:0;">المواد الشرعية، العلوم العربية، والشهادتين الإعدادية والثانوية الأزهرية.</p>
              </div>
            </div>

            <!-- Foundation & KG -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#courses'">
              <div>
                <div style="background:#ffedd5; border-radius:14px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <span style="font-size:2.2rem; display:block; margin-bottom:4px;">🎨</span>
                  <span style="font-weight:900; font-size:0.75rem; color:#c2410c; background:#ffffff; padding:2px 10px; border-radius:12px;">KG & Foundation</span>
                </div>
                <h3 style="font-size:1.1rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">التأسيس ورياض الأطفال</h3>
                <p style="font-size:0.82rem; color:#64748b; line-height:1.5; margin:0;">تأسيس القراءة، الكتابة، الحساب والـ Phonics واللغات للأطفال.</p>
              </div>
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 3: SECTION 3 (91% CIRCULAR OUTCOMES BANNER) -->
        <section style="max-width:1280px; margin:0 auto; padding:0 24px 60px 24px;">
          <div class="glass-card outcome-banner-inner" style="background:#001e50; color:#ffffff; border-radius:24px; padding:48px 40px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:32px; position:relative; overflow:hidden; box-shadow:0 16px 40px rgba(0,30,80,0.35);">
            <div style="max-width:540px; z-index:2;">
              <h2 style="font-size:2.2rem; font-weight:900; line-height:1.25; margin-bottom:16px; color:#ffffff;">
                91% من طلاب منصة انطلق حققوا ميزة التفوق والنجاح
              </h2>
              <p style="font-size:1.05rem; color:#93c5fd; line-height:1.6; margin-bottom:28px;">
                أظهرت النتائج ارتفاعاً ملحوظاً في المعدلات العامة واستيعاب المفاهيم الصعبة مع حلول التدارك والبث المباشر.
              </p>
              <a href="#courses-section" style="color:#ffffff; font-weight:800; font-size:1rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                اعرف المزيد عن نتائج الطلاب <i data-lucide="arrow-left" style="width:18px;height:18px; color:#38bdf8;"></i>
              </a>
            </div>

            <div style="position:relative; width:180px; height:180px; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:2;">
              <svg viewBox="0 0 100 100" style="width:180px; height:180px; transform:rotate(-90deg);">
                <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.15)" stroke-width="12" fill="none"/>
                <circle cx="50" cy="50" r="42" stroke="#0056D2" stroke-width="12" stroke-dasharray="264" stroke-dashoffset="24" fill="none" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="42" stroke="#10b981" stroke-width="12" stroke-dasharray="264" stroke-dashoffset="80" fill="none" stroke-linecap="round"/>
              </svg>
              <div style="position:absolute; text-align:center;">
                <div style="font-size:2.6rem; font-weight:900; color:#ffffff; line-height:1;">91%</div>
                <div style="font-size:0.75rem; color:#93c5fd; font-weight:700; margin-top:2px;">نسبة النجاح</div>
              </div>
            </div>
          </div>
        </section>


        <!-- SECTION: WHY PEOPLE CHOOSE entlqEDU (FEATURE ICONS GRID) -->
        <section style="max-width:1280px; margin:0 auto; padding:20px 24px 40px 24px;">
          <div style="margin-bottom:24px;">
            <h2 style="font-size:1.75rem; font-weight:900; color:var(--text-color); margin:0 0 4px 0;">
              لماذا يختار الطلاب والأساتذة منصة انطلق 
            </h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">أهم المزايا والركائز الأساسية التي تضمن تفوق الطلاب وتمكين المعلمين بالمنصة</p>
          </div>

          <div class="why-choose-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px;">
            <!-- Feature 1 -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04); transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'">
              <div>
                <div style="width:52px; height:52px; border-radius:14px; background:rgba(0,86,210,0.12); color:#0056D2; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
                  <i data-lucide="award" style="width:26px; height:26px;"></i>
                </div>
                <h4 style="font-size:1.05rem; font-weight:900; margin:0 0 8px 0; color:#0f172a;">نخبة من أفضل المعلمين المعتمدين</h4>
                <p style="font-size:0.85rem; color:#475569; line-height:1.6; margin:0;">
                  دروس ومراجعات استثنائية مقدمة من نخبة من كبار أساتذة انطلق والمراحل الدراسية لضمان استيعاب المفاهيم الصعبة.
                </p>
              </div>
            </div>

            <!-- Feature 2 -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04); transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#schedule'">
              <div>
                <div style="width:52px; height:52px; border-radius:14px; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
                  <i data-lucide="video" style="width:26px; height:26px;"></i>
                </div>
                <h4 style="font-size:1.05rem; font-weight:900; margin:0 0 8px 0; color:#0f172a;">جلسات بث مباشر وتفاعل حقيقي</h4>
                <p style="font-size:0.85rem; color:#475569; line-height:1.6; margin:0;">
                  إمكانية طرح الأسئلة مباشرة على الأستاذ أثناء الحصص التفاعلية، ومراجعة التسجيلات في أي وقت ومن أي مكان.
                </p>
              </div>
            </div>

            <!-- Feature 3 -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04); transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#resources'">
              <div>
                <div style="width:52px; height:52px; border-radius:14px; background:rgba(245,158,11,0.12); color:#f59e0b; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
                  <i data-lucide="book-open-check" style="width:26px; height:26px;"></i>
                </div>
                <h4 style="font-size:1.05rem; font-weight:900; margin:0 0 8px 0; color:#0f172a;">مكتبة ومحتوى مكمل شامل</h4>
                <p style="font-size:0.85rem; color:#475569; line-height:1.6; margin:0;">
                  ملخصات، سلاسل تمارين، اختبارات تفاعلية ومذكرات مرفقة تضمن التأسيس والتفوق في كافة المواد الدراسية.
                </p>
              </div>
            </div>

            <!-- Feature 4 -->
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04); transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'">
              <div>
                <div style="width:52px; height:52px; border-radius:14px; background:rgba(236,72,153,0.12); color:#ec4899; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
                  <i data-lucide="trending-up" style="width:26px; height:26px;"></i>
                </div>
                <h4 style="font-size:1.05rem; font-weight:900; margin:0 0 8px 0; color:#0f172a;">ارتفاع ملحوظ في المعدلات والنتائج</h4>
                <p style="font-size:0.85rem; color:#475569; line-height:1.6; margin:0;">
                  نسبة 91% من الطلاب يلاحظون تحسناً كبيراً في مستواهم الأكاديمي والتحضير لشهادات امتحانات نهاية العام.
                </p>
              </div>
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 4: SECTION 2 (FAQ ACCORDION SECTION) -->
        <section style="max-width:1280px; margin:0 auto; padding:10px 24px 24px 24px;">
          <h2 style="font-size:1.35rem; font-weight:900; color:var(--text-color); margin-bottom:16px;">
            الأسئلة الشائعة والمتكررة
          </h2>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="faq-accordion-item glass-card" style="border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
              <div class="faq-question" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.88rem; color:var(--text-color);">
                <span>هل منصة انطلق معتمدة وتقدم شهادات ومتابعة دورية؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                نعم، توفر المنصة دورات ومراجعات شاملة من قِبل نخبة من أساتذة انطلق المتميزين، مع متابعة مستمرة للدرجات وحفظ المحتوى على حساب الطالب.
              </div>
            </div>

            <div class="faq-accordion-item glass-card" style="border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
              <div class="faq-question" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.88rem; color:var(--text-color);">
                <span>كيف يستفيد الطالب من البث المباشر وموارد Google Drive؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                يحصل كل طالب مسجل في الدورة على رابط الاجتماع المباشر (Zoom / Google Meet) بالإضافة لزر الوصول المباشر لمجلد Drive المرفق بالملخصات والسلاسل.
              </div>
            </div>

            <div class="faq-accordion-item glass-card" style="border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
              <div class="faq-question" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.88rem; color:var(--text-color);">
                <span>ما هي ميزات اشتراك Entlq PLUS وماذا يتضمن؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                يتيح اشتراك Entlq PLUS الوصول الشامل لكافة الدورات المسجلة والبث المباشر ومكتبة الملفات بخصم اشتراك موحد موفر للطالب.
              </div>
            </div>

            <div class="faq-accordion-item glass-card" style="border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
              <div class="faq-question" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.88rem; color:var(--text-color);">
                <span>هل توجد دورات وموارد مجانية بالكامل في المنصة؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                نعم، تتيح المنصة عينات مجانية ومواضيع نموذجية محلولة ومقاطع مراجعة متاحة لجميع الطلاب مجاناً بمجرد إنشاء حساب.
              </div>
            </div>

            <div class="faq-accordion-item glass-card" style="border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
              <div class="faq-question" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.88rem; color:var(--text-color);">
                <span>كيف تضمن المنصة تواصل الطالب المباشر مع أستاذه؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                من خلال غرف المحادثة المباشرة أثناء البث المباشر، وأزرار التواصل السريع عبر الواتساب والبريد المتاحة بصفحات الدورات.
              </div>
            </div>
          </div>
        </section>


        <!-- entlqEDU CORE: REAL-TIME PLATFORM METRICS & INTERACTIVE CHART -->
        <section id="platform-analytics-section" style="background:var(--bg-card); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); padding:60px 24px; position:relative; overflow:hidden;">
          <div style="max-width:1280px; margin:0 auto; position:relative; z-index:2;">
            
            <!-- 4 Modern Stat Cards -->
            <div class="metrics-strip-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:20px; margin-bottom:40px;">
              
              <!-- Students Count -->
              <div class="glass-card stat-card-hover" style="padding:24px 20px; border-radius:20px; border:1px solid rgba(99,102,241,0.2); background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(0,86,210,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
                <div style="width:54px; height:54px; border-radius:16px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i data-lucide="users" style="width:26px; height:26px;"></i>
                </div>
                <div>
                  <div id="stat-students-num" style="font-size:2.1rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">0</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); font-weight:700; margin-top:6px;">طالب مسجل بالمنصة</div>
                </div>
              </div>

              <!-- Success Rate -->
              <div class="glass-card stat-card-hover" style="padding:24px 20px; border-radius:20px; border:1px solid rgba(16,185,129,0.2); background:linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
                <div style="width:54px; height:54px; border-radius:16px; background:rgba(16,185,129,0.15); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i data-lucide="award" style="width:26px; height:26px;"></i>
                </div>
                <div>
                  <div id="stat-success-num" style="font-size:2.1rem; font-weight:900; color:#10b981; line-height:1; font-family:'Outfit','Cairo',sans-serif;">99.4%</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); font-weight:700; margin-top:6px;">نسبة النجاح في انطلق</div>
                </div>
              </div>

              <!-- Courses Count -->
              <div class="glass-card stat-card-hover" style="padding:24px 20px; border-radius:20px; border:1px solid rgba(245,158,11,0.2); background:linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
                <div style="width:54px; height:54px; border-radius:16px; background:rgba(245,158,11,0.15); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i data-lucide="book-open" style="width:26px; height:26px;"></i>
                </div>
                <div>
                  <div id="stat-courses-num" style="font-size:2.1rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">0</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); font-weight:700; margin-top:6px;">دورة تعليمية شاملة</div>
                </div>
              </div>

              <!-- Teachers Count -->
              <div class="glass-card stat-card-hover" style="padding:24px 20px; border-radius:20px; border:1px solid rgba(6,182,212,0.2); background:linear-gradient(135deg, rgba(6,182,212,0.06), rgba(6,182,212,0.02)); display:flex; align-items:center; gap:16px; position:relative; overflow:hidden;">
                <div style="width:54px; height:54px; border-radius:16px; background:rgba(6,182,212,0.15); color:#06b6d4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i data-lucide="graduation-cap" style="width:26px; height:26px;"></i>
                </div>
                <div>
                  <div id="stat-teachers-num" style="font-size:2.1rem; font-weight:900; color:var(--text-color); line-height:1; font-family:'Outfit','Cairo',sans-serif;">0</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); font-weight:700; margin-top:6px;">استاذ وخبير تربوي</div>
                </div>
              </div>

            </div>

           
              

               

             

              

            </div>

          </div>
        </section>


      


        <!-- TOP INSTRUCTORS SECTION -->
        <section style="background:var(--bg-card); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); padding:70px 24px;">
          <div style="max-width:1280px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; flex-wrap:wrap; gap:16px;">
              <div>
                <div style="display:inline-flex; align-items:center; gap:6px; color:var(--primary); font-weight:700; font-size:0.85rem; margin-bottom:6px;">
                  <i data-lucide="award" style="width:16px;height:16px;"></i> نخبة الأساتذة والخبراء
                </div>
                <h2 style="font-size:1.7rem; font-weight:900; margin:0; color:var(--text-color);">تعلم على يد أفضل أساتذة انطلق 👨‍🏫</h2>
                <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px;">أساتذة ذوو خبرة طويلة في إعداد طلاب انطلق للدرجات العليا</p>
              </div>
              <a href="#courses-section" class="btn-secondary" style="padding:10px 22px; font-size:0.85rem; border-radius:20px; text-decoration:none;">انضم كـ معلم بالمنصة</a>
            </div>

            <div id="top-teachers-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:24px;">
              <div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;"><i data-lucide="loader" class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto;"></i></div>
            </div>
          </div>
        </section>


        <!-- BLOG & ARTICLES SECTION -->
        <section style="max-width:1280px; margin:0 auto; padding:70px 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="display:inline-flex; align-items:center; gap:6px; color:var(--primary); font-weight:700; font-size:0.85rem; margin-bottom:6px;">
                <i data-lucide="newspaper" style="width:16px;height:16px;"></i> المدونة والإرشادات التربوية
              </div>
              <h2 style="font-size:1.7rem; font-weight:900; margin:0; color:var(--text-color);">أحدث المقالات والنصائح للانطلق 📝</h2>
              <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px;">إرشادات ومنهجيات لم مساعدة طلاب انطلق على المذاكرة بذكاء وتفادي التوتر</p>
            </div>
            <a href="#courses-section" class="btn-secondary" style="padding:10px 22px; font-size:0.85rem; border-radius:20px; text-decoration:none;">تصفح جميع المقالات ➔</a>
          </div>

          <div id="landing-blogs-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
            <div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;"><i data-lucide="loader" class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto;"></i></div>
          </div>
        </section>


        <!-- CALL TO ACTION BANNER -->
        <section class="cta-section" style="background:linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%); color:#ffffff; padding:70px 24px; text-align:center;">
          <div style="max-width:800px; margin:0 auto;">
            <h2 style="font-size:2.4rem; font-weight:900; margin-bottom:16px; color:#ffffff;">جاهز للبدء وتحقيق هدفك في انطلق</h2>
            <p style="font-size:1.1rem; opacity:0.9; margin-bottom:32px; line-height:1.6;">انضم اليوم إلى آلاف الطلاب واستفد من أحدث الدورات التفاعلية والدروس المباشرة مع نخبة المعلمين.</p>
            <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
              <a href="#signup" class="btn-primary" style="background:#ffffff; color:var(--primary); padding:16px 36px; font-size:1.1rem; font-weight:800; border-radius:30px; text-decoration:none;">
                سجل حساب طالب مجاناً 🚀
              </a>
              <a href="#login" class="btn-secondary" style="border-color:rgba(255,255,255,0.4); color:#ffffff; padding:16px 32px; font-size:1.1rem; font-weight:800; border-radius:30px; text-decoration:none;">
                تسجيل الدخول
              </a>
            </div>
          </div>
        </section>


        <!-- FOOTER -->
        <footer style="background:var(--bg-card); border-top:1px solid var(--border-color); padding:70px 24px 30px 24px; color:var(--text-muted); font-size:0.9rem;">
          <div style="max-width:1280px; margin:0 auto;">
            
            <div class="footer-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:40px; margin-bottom:50px;">
              <div>
                <a href="#landing" style="text-decoration:none; display:inline-flex; align-items:center; margin-bottom:16px;">
                  <img src="assets/logo.png" alt="انطلق" style="height:48px; width:auto; object-fit:contain; border-radius:10px; padding:4px 8px; background:#ffffff; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                </a>
                <p style="line-height:1.6; font-size:0.85rem; margin-bottom:20px;">
                  المنصة التعليمية التفاعلية الأولى المخصصة لمساعدة طلاب انطلق والدراسات الثانوية على تحقيق التفوق الأكاديمي.
                </p>

                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                  <a href="https://facebook.com" target="_blank" title="Facebook" style="width:36px; height:36px; border-radius:50%; background:#1877F2; color:#fff; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                    <i data-lucide="facebook" style="width:18px; height:18px;"></i>
                  </a>
                  <a href="https://youtube.com" target="_blank" title="YouTube" style="width:36px; height:36px; border-radius:50%; background:#FF0000; color:#fff; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                    <i data-lucide="youtube" style="width:18px; height:18px;"></i>
                  </a>
                  <a href="https://instagram.com" target="_blank" title="Instagram" style="width:36px; height:36px; border-radius:50%; background:linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%); color:#fff; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                    <i data-lucide="instagram" style="width:18px; height:18px;"></i>
                  </a>
                  <a href="https://telegram.org" target="_blank" title="Telegram" style="width:36px; height:36px; border-radius:50%; background:#26A5E4; color:#fff; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                    <i data-lucide="send" style="width:18px; height:18px;"></i>
                  </a>
                  <a href="https://linkedin.com" target="_blank" title="LinkedIn" style="width:36px; height:36px; border-radius:50%; background:#0A66C2; color:#fff; display:flex; align-items:center; justify-content:center; text-decoration:none;">
                    <i data-lucide="linkedin" style="width:18px; height:18px;"></i>
                  </a>
                </div>
              </div>

              <div>
                <h4 style="color:var(--text-color); font-weight:800; font-size:1rem; margin-bottom:18px;">روابط سريعة</h4>
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
                  <li><a href="#landing" style="color:var(--text-muted); text-decoration:none;">الصفحة الرئيسية</a></li>
                  <li><a href="#about" style="color:var(--text-muted); text-decoration:none;">عن منصة انطلق</a></li>
                  <li><a href="#courses" style="color:var(--text-muted); text-decoration:none;">دليل الدورات التعليمية</a></li>
                  <li><a href="#schedule" style="color:var(--text-muted); text-decoration:none;">جدول البث المباشر</a></li>
                  <li><a href="#faq" style="color:var(--text-muted); text-decoration:none;">الأسئلة الشائعة</a></li>
                </ul>
              </div>

              <div>
                <h4 style="color:var(--text-color); font-weight:800; font-size:1rem; margin-bottom:18px;">للمعلمين والمدارس</h4>
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
                  <li>
                    <a href="#staff-login" style="color:var(--primary); font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                      <i data-lucide="shield-check" style="width:16px; height:16px;"></i> بوابة المعلمين والإدارة 🛡️
                    </a>
                  </li>
                  <li>
                    <a href="#teacher-apply" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                      👨‍🏫 انضم كمعلم أو محاضر
                    </a>
                  </li>
                  <li>
                    <a href="#teacher-apply" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                      🏫 للمدارس والمؤسسات
                    </a>
                  </li>
                  <li>
                    <a href="#contact" style="color:var(--text-muted); text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                      💬 تواصل معنا
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 style="color:var(--text-color); font-weight:800; font-size:1rem; margin-bottom:18px;">الدعم والتواصل</h4>
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
                  <li style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="mail" style="color:var(--primary); width:16px; height:16px;"></i>
                    <a href="mailto:${state.platformSettings?.contactEmail || 'support@entlqedu.com'}" style="color:inherit; text-decoration:none;">
                      ${state.platformSettings?.contactEmail || 'support@entlqedu.com'}
                    </a>
                  </li>
                  <li style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="phone" style="color:var(--primary); width:16px; height:16px;"></i>
                    <a href="tel:${state.platformSettings?.contactPhone || '+213 555 123 456'}" style="color:inherit; text-decoration:none;">
                      ${state.platformSettings?.contactPhone || '+213 555 123 456'}
                    </a>
                  </li>
                  <li style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="message-circle" style="color:#10b981; width:16px; height:16px;"></i>
                    <a href="${state.platformSettings?.whatsappUrl || 'https://wa.me/213555123456'}" target="_blank" style="color:#10b981; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                      واتساب: ${state.platformSettings?.whatsappNumber || '+213 555 123 456'} ↗
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div class="footer-bottom" style="padding-top:24px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; font-size:0.88rem;">
              <div style="font-weight:600;">جميع الحقوق محفوظة © 2026 منصة انطلق التعليمية</div>
              
              <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <a href="#staff-login" style="color:var(--primary); font-weight:800; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:rgba(99,102,241,0.08); padding:6px 14px; border-radius:20px; border:1px solid rgba(99,102,241,0.25); transition:all 0.2s;" onmouseenter="this.style.background='rgba(99,102,241,0.18)';" onmouseleave="this.style.background='rgba(99,102,241,0.08)';">
                  <i data-lucide="shield-check" style="width:14px; height:14px; color:var(--primary);"></i> بوابة المعلمين والإدارة
                </a>
                <a href="#about" style="color:var(--text-color); font-weight:800; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:var(--bg-app); padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--primary)';" onmouseleave="this.style.borderColor='var(--border-color)';">
                  <i data-lucide="info" style="width:14px; height:14px; color:var(--primary);"></i> عن المنصة
                </a>
                <a href="#contact" style="color:var(--text-color); font-weight:800; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:var(--bg-app); padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); transition:all 0.2s;" onmouseenter="this.style.borderColor='#10b981';" onmouseleave="this.style.borderColor='var(--border-color)';">
                  <i data-lucide="headphones" style="width:14px; height:14px; color:#10b981;"></i> تواصل معنا
                </a>
                <a href="#faq" style="color:var(--text-color); font-weight:800; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:var(--bg-app); padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); transition:all 0.2s;" onmouseenter="this.style.borderColor='#f59e0b';" onmouseleave="this.style.borderColor='var(--border-color)';">
                  <i data-lucide="help-circle" style="width:14px; height:14px; color:#f59e0b;"></i> الأسئلة الشائعة
                </a>
              </div>
            </div>

          </div>
        </footer>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
    this.loadCoursesAsync();
  }

  async loadCoursesAsync() {
    try {
      const [coursesRes, sessionsRes, teachersRes, blogsRes, categoriesRes, statsRes] = await Promise.allSettled([
        apiFetch("/courses"),
        apiFetch("/sessions"),
        apiFetch("/teachers"),
        apiFetch("/blogs"),
        apiFetch("/categories"),
        apiFetch("/public/stats")
      ]);
      this.courses = coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value) ? coursesRes.value : [];
      this.sessions = sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value) ? sessionsRes.value : [];
      this.teachers = teachersRes.status === "fulfilled" && Array.isArray(teachersRes.value) ? teachersRes.value : [];
      this.blogs = blogsRes.status === "fulfilled" && Array.isArray(blogsRes.value) ? blogsRes.value : [];
      this.categories = categoriesRes.status === "fulfilled" && Array.isArray(categoriesRes.value) ? categoriesRes.value : [];
      this.platformStats = statsRes.status === "fulfilled" ? statsRes.value : null;

      this.renderDynamicLandingSections();
      this.renderFilteredCourses();
      this.renderPlatformStats(this.platformStats);
      this.initLiveChart(this.platformStats, this.currentChartType);
      await this.initCurriculumExplorerAsync();
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error("Failed to load data for landing page", e);
    }
  }

  // ─── Interactive Curriculum Accordion Explorer Logic (Centered) ───────────────────
  getSubjectTheme(name) {
    const n = String(name || "").toLowerCase();
    if (n.includes("عرب") || n.includes("arabic")) {
      return { gradient: "linear-gradient(135deg, #0d9488 0%, #042f2e 100%)", color: "#0d9488", icon: "📖" };
    }
    if (n.includes("engl") || n.includes("connect") || n.includes("إنجل") || n.includes("لغة")) {
      return { gradient: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)", color: "#2563eb", icon: "🔤" };
    }
    if (n.includes("رياض") || n.includes("math")) {
      return { gradient: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "#7c3aed", icon: "📐" };
    }
    if (n.includes("فيزي") || n.includes("physic")) {
      return { gradient: "linear-gradient(135deg, #d97706 0%, #78350f 100%)", color: "#d97706", icon: "⚡" };
    }
    if (n.includes("كيمي") || n.includes("chem")) {
      return { gradient: "linear-gradient(135deg, #e11d48 0%, #881337 100%)", color: "#e11d48", icon: "🧪" };
    }
    if (n.includes("أحيا") || n.includes("bio") || n.includes("علوم") || n.includes("scien")) {
      return { gradient: "linear-gradient(135deg, #059669 0%, #064e3b 100%)", color: "#059669", icon: "🧬" };
    }
    if (n.includes("تاريخ") || n.includes("جغراف") || n.includes("دراسات") || n.includes("فلسف")) {
      return { gradient: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)", color: "#4f46e5", icon: "🏛️" };
    }
    if (n.includes("ict") || n.includes("حاسب") || n.includes("برمج") || n.includes("معلومات")) {
      return { gradient: "linear-gradient(135deg, #0891b2 0%, #164e63 100%)", color: "#0891b2", icon: "💻" };
    }
    return { gradient: "linear-gradient(135deg, #e51d74 0%, #831843 100%)", color: "#e51d74", icon: "📚" };
  }

  async initCurriculumExplorerAsync() {
    try {
      const accordionContainer = document.getElementById("curriculum-accordion-container");
      if (!accordionContainer) return;

      const grades = await apiFetch("/curriculum/grades");
      if (Array.isArray(grades) && grades.length > 0) {
        this.allGradesData = grades;
      }

      if (!this.allGradesData || this.allGradesData.length === 0) {
        accordionContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding:20px;">لا توجد بيانات مناهج متاحة حالياً.</p>`;
        return;
      }

      const stages = [
        {
          key: "PRIMARY",
          name: "المرحلة الابتدائية (Primary)",
          subtitle: "من الصف الأول حتى الصف السادس الابتدائي واللغات",
          icon: "🎒",
          color: "#10b981",
          gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          glow: "rgba(16,185,129,0.15)"
        },
        {
          key: "PREPARATORY",
          name: "المرحلة الإعدادية والمتوسطة (Prep)",
          subtitle: "الصفوف من الأول الإعدادي حتى الثالث الإعدادي (الشهادة الإعدادية)",
          icon: "📚",
          color: "#3b82f6",
          gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          glow: "rgba(59,130,246,0.15)"
        },
        {
          key: "SECONDARY",
          name: "المرحلة الثانوية والبكالوريا (Secondary)",
          subtitle: "الصفوف الأول والثاني والثالث الثانوي (انطلق 1، 2، 3 - BAC)",
          icon: "🎓",
          color: "#e51d74",
          gradient: "linear-gradient(135deg, #e51d74 0%, #be123c 100%)",
          glow: "rgba(229,29,116,0.15)"
        }
      ];

      if (!this.explorerStage) this.explorerStage = "PRIMARY";

      const renderAccordion = () => {
        accordionContainer.innerHTML = stages.map(stage => {
          const isOpen = this.explorerStage === stage.key;
          const stageGrades = this.allGradesData.filter(g => g.stage === stage.key);
          
          if (isOpen && (!this.explorerGradeId || !stageGrades.some(g => g.id === this.explorerGradeId))) {
            this.explorerGradeId = stageGrades[0]?.id || null;
          }

          const currentGrade = stageGrades.find(g => g.id === this.explorerGradeId) || stageGrades[0];

          return `
            <div class="curriculum-accordion-item ${isOpen ? 'open' : ''}" style="
              background: var(--bg-card);
              border: 2px solid ${isOpen ? stage.color : 'var(--border-color)'};
              border-radius: 24px;
              margin-bottom: 16px;
              overflow: hidden;
              box-shadow: ${isOpen ? `0 12px 32px ${stage.glow}` : '0 4px 14px rgba(0,0,0,0.02)'};
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">
              <!-- Header Button -->
              <button type="button" class="accordion-header-btn" data-stage="${stage.key}" style="
                width: 100%;
                background: ${isOpen ? 'rgba(0,0,0,0.015)' : 'transparent'};
                border: none;
                padding: 16px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                text-align: right;
                gap: 14px;
                transition: background 0.2s;
              ">
                <div style="display:flex; align-items:center; gap:16px;">
                  <div style="
                    width: 50px;
                    height: 50px;
                    border-radius: 16px;
                    background: ${stage.gradient};
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.7rem;
                    box-shadow: 0 6px 16px ${stage.color}40;
                    flex-shrink: 0;
                  ">
                    ${stage.icon}
                  </div>
                  <div>
                    <h3 style="font-size:1.15rem; font-weight:900; color:var(--text-color); margin:0 0 3px 0;">${stage.name}</h3>
                    <p style="font-size:0.82rem; font-weight:700; color:var(--text-muted); margin:0;">${stage.subtitle}</p>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:0.78rem; font-weight:800; padding:4px 12px; border-radius:14px; background:${isOpen ? stage.color : 'var(--bg-app)'}; color:${isOpen ? '#fff' : 'var(--text-muted)'};">
                    ${stageGrades.length} صفوف
                  </span>
                  <div style="
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: var(--bg-app);
                    border: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${isOpen ? stage.color : 'var(--text-muted)'};
                    transform: rotate(${isOpen ? '180deg' : '0deg'});
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  ">
                    <i data-lucide="chevron-down" style="width:18px;height:18px;"></i>
                  </div>
                </div>
              </button>

              <!-- Accordion Body -->
              ${isOpen ? `
                <div class="accordion-body-content" style="
                  padding: 22px 12px 28px;
                  border-top: 1px solid var(--border-color);
                  background: linear-gradient(180deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.025) 100%);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  text-align: center;
                ">
                  
                  <!-- Centered Grade Tabs -->
                  <div style="margin-bottom: 24px; width: 100%; text-align: center;">
                    <span style="font-size:0.86rem; font-weight:900; color:var(--text-color); margin-bottom:12px; display:block;">
                      حدد الصف الدراسي لاستعراض المواد والمجموعات:
                    </span>
                    <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px;">
                      ${stageGrades.map((grade, idx) => {
                        const isGradeSel = grade.id === currentGrade?.id;
                        return `
                          <button type="button" class="accordion-grade-chip-btn ${isGradeSel ? 'active' : ''}" data-grade-id="${grade.id}" style="
                            padding: 8px 16px;
                            border-radius: 14px;
                            font-weight: 800;
                            font-size: 0.86rem;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            border: 1.5px solid ${isGradeSel ? stage.color : 'var(--border-color)'};
                            background: ${isGradeSel ? stage.color : 'var(--bg-card)'};
                            color: ${isGradeSel ? '#ffffff' : 'var(--text-color)'};
                            box-shadow: ${isGradeSel ? `0 6px 14px ${stage.color}35` : '0 2px 6px rgba(0,0,0,0.02)'};
                          ">
                            <span style="background:${isGradeSel ? 'rgba(255,255,255,0.25)' : 'var(--bg-app)'}; padding:2px 6px; border-radius:6px; font-size:0.72rem; font-weight:900;">
                              ${idx + 1}
                            </span>
                            <span>${grade.name}</span>
                          </button>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Centered Section Label -->
                  <div style="margin-bottom: 18px; display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:1.05rem; font-weight:900; color:var(--text-color);">
                      المواد المقررة لـ <span style="color:${stage.color};">${currentGrade ? currentGrade.name : ''}</span> 🎯
                    </span>
                    <span style="font-size:0.75rem; font-weight:800; background:${stage.color}15; color:${stage.color}; padding:2px 10px; border-radius:12px; border:1px solid ${stage.color}30;">
                      ${currentGrade?.subjects?.length || 0} مواد متاحة
                    </span>
                  </div>

                  <!-- Centered Creative Circle Cards Grid (Wide) -->
                  <div style="
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 16px;
                    width: 100%;
                    max-width: 100%;
                    margin: 0 auto;
                  ">
                    ${(!currentGrade || !currentGrade.subjects || currentGrade.subjects.length === 0) ? `
                      <p style="color:var(--text-muted); font-size:0.9rem; padding:20px;">لا توجد مواد دراسية مسجلة لهذا الصف حالياً.</p>
                    ` : currentGrade.subjects.map(subject => {
                      const theme = this.getSubjectTheme(subject.name);
                      const iconToDisplay = subject.icon && subject.icon.length <= 2 ? subject.icon : theme.icon;

                      return `
                        <a href="#subject-groups/${subject.id}" class="creative-circle-subject-card" style="
                          width: 140px;
                          background: var(--bg-card);
                          border: 1.5px solid var(--border-color);
                          border-radius: 24px;
                          padding: 18px 12px 16px;
                          text-decoration: none;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          text-align: center;
                          position: relative;
                          overflow: hidden;
                          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                          box-shadow: 0 4px 14px rgba(0,0,0,0.03);
                          cursor: pointer;
                        " onmouseenter="
                            this.style.transform='translateY(-6px) scale(1.04)';
                            this.style.borderColor='${theme.color}';
                            this.style.boxShadow='0 12px 26px ${theme.color}25, 0 0 0 2px ${theme.color}33';
                            this.querySelector('.circle-icon-inner').style.transform='scale(1.1) rotate(6deg)';
                            this.querySelector('.circle-glow-bg').style.opacity='0.6';
                          " 
                          onmouseleave="
                            this.style.transform='translateY(0) scale(1)';
                            this.style.borderColor='var(--border-color)';
                            this.style.boxShadow='0 4px 14px rgba(0,0,0,0.03)';
                            this.querySelector('.circle-icon-inner').style.transform='scale(1) rotate(0deg)';
                            this.querySelector('.circle-glow-bg').style.opacity='0';
                          ">
                          
                          <!-- Subtle Glow Backdrop on Hover -->
                          <div class="circle-glow-bg" style="
                            position: absolute;
                            top: 10px;
                            width: 65px;
                            height: 65px;
                            border-radius: 50%;
                            background: ${theme.color};
                            filter: blur(18px);
                            opacity: 0;
                            transition: opacity 0.3s ease;
                            pointer-events: none;
                          "></div>

                          <!-- Circular Creative Icon -->
                          <div class="circle-icon-inner" style="
                            width: 62px;
                            height: 62px;
                            border-radius: 50%;
                            background: ${theme.gradient};
                            color: #ffffff;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1.8rem;
                            font-weight: 900;
                            box-shadow: 0 6px 16px ${theme.color}40, inset 0 2px 4px rgba(255,255,255,0.35);
                            margin-bottom: 10px;
                            position: relative;
                            z-index: 2;
                            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                            border: 2.5px solid rgba(255,255,255,0.85);
                          ">
                            ${iconToDisplay}
                          </div>

                          <!-- Subject Name -->
                          <h4 style="
                            font-size: 0.92rem;
                            font-weight: 900;
                            color: var(--text-color);
                            margin: 0 0 5px 0;
                            line-height: 1.25;
                            width: 100%;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                          " title="${subject.name}">
                            ${subject.name}
                          </h4>

                          <!-- Mini Track Tag -->
                          <span style="
                            font-size: 0.66rem;
                            font-weight: 800;
                            padding: 2px 7px;
                            border-radius: 10px;
                            background: ${subject.isLanguageTrack ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)"};
                            color: ${subject.isLanguageTrack ? "#2563eb" : "#059669"};
                            border: 1px solid ${subject.isLanguageTrack ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)"};
                            margin-bottom: 8px;
                          ">
                            ${subject.isLanguageTrack ? "لغات 🌐" : "عام 🇪🇬"}
                          </span>

                          <!-- Action Link -->
                          <div style="
                            display: inline-flex;
                            align-items: center;
                            gap: 3px;
                            font-size: 0.7rem;
                            font-weight: 800;
                            color: ${theme.color};
                            background: var(--bg-app);
                            padding: 3px 9px;
                            border-radius: 20px;
                            border: 1px solid var(--border-color);
                          ">
                            <span>المجموعات</span>
                            <i data-lucide="arrow-left" style="width:10px; height:10px;"></i>
                          </div>

                        </a>
                      `;
                    }).join('')}
                  </div>

                </div>
              ` : ''}

            </div>
          `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        // Bind Accordion Header Clicks
        accordionContainer.querySelectorAll(".accordion-header-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const stage = btn.getAttribute("data-stage");
            if (this.explorerStage === stage) {
              this.explorerStage = null; // Toggle close if clicked again
            } else {
              this.explorerStage = stage;
              this.explorerGradeId = null;
            }
            renderAccordion();
          });
        });

        // Bind Grade Chip clicks
        accordionContainer.querySelectorAll(".accordion-grade-chip-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.explorerGradeId = btn.getAttribute("data-grade-id");
            renderAccordion();
          });
        });
      };

      renderAccordion();
    } catch (err) {
      console.error("Error loading curriculum explorer:", err);
    }
  }

  renderDynamicLandingSections() {
    // Calculate course count per category from real DB courses
    const categoryCounts = {};
    (this.courses || []).forEach(c => {
      if (c.category) {
        const catName = c.category.trim();
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      }
    });

    // Sort categories by course count descending
    let sortedCategories = [];
    if (this.categories && this.categories.length > 0) {
      sortedCategories = [...this.categories].sort((a, b) => {
        const countA = categoryCounts[a.name] || 0;
        const countB = categoryCounts[b.name] || 0;
        return countB - countA;
      });
    } else {
      const catNames = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
      sortedCategories = catNames.map(name => ({ name, icon: "book-open" }));
    }

    // Top 3 Categories with the most courses
    const top3Categories = sortedCategories.slice(0, 3);

    // 0. Render Top 3 Dynamic Categories in Hero Grid
    const heroCategoriesContainer = this.container.querySelector("#hero-categories-container");
    if (heroCategoriesContainer && top3Categories.length > 0) {
      const colors = ["var(--primary)", "#f59e0b", "#10b981", "#ec4899", "#a855f7"];
      heroCategoriesContainer.innerHTML = top3Categories.map((cat, idx) => `
        <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:10px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:${colors[idx % colors.length]}; display:flex; align-items:center; justify-content:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${cat.name}">
          <i data-lucide="${cat.icon || 'layers'}" style="width:14px; height:14px; flex-shrink:0;"></i>
          <span style="overflow:hidden; text-overflow:ellipsis;">${cat.name}</span>
        </div>
      `).join("");
    }

    // 0.5 Render Top 3 Category Pills (Plus "All") in Featured Section
    const featuredPillsContainer = this.container.querySelector("#featured-category-pills");
    if (featuredPillsContainer) {
      const displayCats = [{ name: "الكل", icon: "sparkles", value: "all" }, ...top3Categories.map(c => ({ name: c.name, icon: c.icon || "layers", value: c.name }))];
      featuredPillsContainer.innerHTML = displayCats.map(cat => {
        const isActive = this.activeCategory === cat.value || (cat.value === "all" && this.activeCategory === "all");
        return `
          <button class="gradient-pill-btn ${isActive ? 'active' : ''}" data-cat="${cat.value}" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:${isActive ? '#000000' : 'rgba(255,255,255,0.85)'}; color:${isActive ? '#ffffff' : '#0056D2'}; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <i data-lucide="${cat.icon}" style="width:14px; height:14px;"></i>
            ${cat.name}
          </button>
        `;
      }).join("");

      featuredPillsContainer.querySelectorAll(".gradient-pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.activeCategory = btn.getAttribute("data-cat");
          this.renderDynamicLandingSections();
          this.renderFilteredCourses();
        });
      });
    }
    // 1. Render Most Popular (Top 3 Courses from DB)
    const mostPopularContainer = this.container.querySelector("#most-popular-container");
    if (mostPopularContainer) {
      const items = this.courses.slice(0, 3);
      if (items.length === 0) {
        mostPopularContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted);">لا توجد دورات متاحة حالياً.</div>`;
      } else {
        mostPopularContainer.innerHTML = items.map(course => `
          <div style="display:flex; gap:14px; align-items:center; background:var(--bg-card); padding:12px; border-radius:14px; border:1px solid var(--border-color); cursor:pointer; transition:all 0.2s;" onclick="window.location.hash='#course-preview/${course.id}'">
            <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200'}" style="width:56px; height:56px; object-fit:cover; border-radius:10px; flex-shrink:0;">
            <div style="flex:1;">
              <div style="font-size:0.75rem; color:var(--primary); font-weight:800; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                <span>${course.category || 'عام'} • ${course.teacher?.name || 'الأستاذ'}</span>
                <span style="background:rgba(0,86,210,0.1); color:var(--primary); font-size:0.68rem; font-weight:800; padding:1px 7px; border-radius:10px;">${course.degree || 'عام'}</span>
              </div>
              <div style="font-size:0.9rem; font-weight:800; color:var(--text-color); margin:2px 0;">${course.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">🎓 ${course.degree || 'جميع المراحل'} • ⭐ 4.9</div>
            </div>
          </div>
        `).join("");
      }
    }

    // 2. Render Hot New Releases (Latest 3 Courses from DB)
    const newReleasesContainer = this.container.querySelector("#new-releases-container");
    if (newReleasesContainer) {
      const items = [...this.courses].reverse().slice(0, 3);
      if (items.length === 0) {
        newReleasesContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted);">لا توجد دورات حديثة.</div>`;
      } else {
        newReleasesContainer.innerHTML = items.map(course => `
          <div style="display:flex; gap:14px; align-items:center; background:var(--bg-card); padding:12px; border-radius:14px; border:1px solid var(--border-color); cursor:pointer; transition:all 0.2s;" onclick="window.location.hash='#course-preview/${course.id}'">
            <img src="${course.image || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200'}" style="width:56px; height:56px; object-fit:cover; border-radius:10px; flex-shrink:0;">
            <div style="flex:1;">
              <div style="font-size:0.75rem; color:#f59e0b; font-weight:800; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                <span>${course.category || 'جديد'} • ${course.teacher?.name || 'الأستاذ'}</span>
                <span style="background:rgba(245,158,11,0.12); color:#f59e0b; font-size:0.68rem; font-weight:800; padding:1px 7px; border-radius:10px;">${course.degree || 'عام'}</span>
              </div>
              <div style="font-size:0.9rem; font-weight:800; color:var(--text-color); margin:2px 0;">${course.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">🎓 ${course.degree || 'جميع المراحل'} • ⭐ 4.95</div>
            </div>
          </div>
        `).join("");
      }
    }

    // 3. Render Trending Sessions (Live Sessions from DB)
    const trendingSessionsContainer = this.container.querySelector("#trending-sessions-container");
    if (trendingSessionsContainer) {
      const items = this.sessions.slice(0, 3);
      if (items.length === 0) {
        trendingSessionsContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted);">لا توجد جلسات مبرمجة حالياً.</div>`;
      } else {
        trendingSessionsContainer.innerHTML = items.map(session => `
          <div style="display:flex; gap:14px; align-items:center; background:var(--bg-card); padding:12px; border-radius:14px; border:1px solid var(--border-color);">
            <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200" style="width:56px; height:56px; object-fit:cover; border-radius:10px; flex-shrink:0;">
            <div style="flex:1;">
              <div style="font-size:0.75rem; color:var(--error); font-weight:800;">🔴 بث مباشر • ${session.teacher?.name || 'الأستاذ'}</div>
              <div style="font-size:0.9rem; font-weight:800; color:var(--text-color); margin:2px 0;">${session.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">بث تفاعلي حقيقي</div>
            </div>
          </div>
        `).join("");
      }
    }

    // 4. Render Gradient Featured Program Cards (Top 4 Courses from DB)
    const gradientFeaturedContainer = this.container.querySelector("#gradient-featured-container");
    if (gradientFeaturedContainer) {
      const items = this.courses.slice(0, 4);
      if (items.length === 0) {
        gradientFeaturedContainer.innerHTML = `<div style="font-size:0.85rem; color:#ffffff; grid-column:1/-1;">لا توجد دورات مضافة حالياً.</div>`;
      } else {
        gradientFeaturedContainer.innerHTML = items.map(course => `
          <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:18px; padding:20px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 8px 24px rgba(0,0,0,0.15); cursor:pointer; transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#course-preview/${course.id}'">
            <div>
              <div style="position:relative; border-radius:12px; overflow:hidden; margin-bottom:14px; height:120px;">
                <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'}" style="width:100%; height:100%; object-fit:cover;">
                <span style="position:absolute; top:8px; right:8px; background:rgba(0,86,210,0.85); color:#fff; font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:12px; backdrop-filter:blur(4px);">
                  ${course.degree || 'عام'}
                </span>
              </div>
              <div style="font-size:0.75rem; color:#0056D2; font-weight:800; margin-bottom:4px;">${course.category || 'دورة تعليمية'} • ${course.teacher?.name || 'الأستاذ'}</div>
              <h4 style="font-size:1rem; font-weight:800; margin:0 0 8px 0; color:#0f172a; line-height:1.35;">${course.title}</h4>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:0.78rem; color:#64748b; font-weight:700;">
              <span>🎓 ${course.degree || 'عام / لجميع المراحل'}</span>
              <span style="color:#f59e0b; font-weight:800;">⭐ 4.9</span>
            </div>
          </div>
        `).join("");
      }
    }

    // 5. Render Top Teachers (Instructors from DB)
    const topTeachersContainer = this.container.querySelector("#top-teachers-container");
    if (topTeachersContainer) {
      const teachersList = this.teachers || [];
      if (teachersList.length === 0) {
        topTeachersContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); grid-column:1/-1; text-align:center; padding:30px;">لا يوجد أساتذة مسجلين في النظام حالياً.</div>`;
      } else {
        topTeachersContainer.innerHTML = teachersList.map(teacher => `
          <div class="glass-card" style="padding:28px; border-radius:20px; border:1px solid var(--border-color); text-align:center; transition:transform 0.2s; cursor:pointer;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#teacher/${teacher.id}'">
            <img src="${teacher.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.id}`}" style="width:84px; height:84px; border-radius:50%; border:3px solid var(--primary); margin:0 auto 16px auto; background:var(--bg-app); object-fit:cover;">
            <h3 style="font-size:1.15rem; font-weight:800; margin:0 0 4px 0; color:var(--text-color);">${teacher.name}</h3>
            <div style="font-size:0.82rem; color:var(--primary); font-weight:700; margin-bottom:12px;">${teacher.education || 'أستاذ وخبير تربوي في انطلق'}</div>
            <div style="display:flex; justify-content:center; align-items:center; gap:12px; font-size:0.8rem; color:var(--text-muted); margin-bottom:18px; background:var(--bg-app); padding:8px 12px; border-radius:12px;">
              <span>⭐ 4.95 (أستاذ موثوق)</span>
              <span>•</span>
              <span>${teacher.location || 'المنصة الرقمية'}</span>
            </div>
            <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin-bottom:20px;">خبير تربوي في إعداد وشرح دروس انطلق والتمارين المنهجية التطبيقية.</p>
            <a href="#teacher/${teacher.id}" class="btn-secondary" style="width:100%; justify-content:center; font-size:0.85rem; padding:8px 14px; text-decoration:none; display:inline-flex;">عرض ملف الأستاذ والدورات ➔</a>
          </div>
        `).join("");
      }
    }

    // 6. Render Blogs
    const blogsContainer = this.container.querySelector("#landing-blogs-container");
    if (blogsContainer) {
      const blogItems = (this.blogs || []).slice(0, 3);
      if (blogItems.length === 0) {
        blogsContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); grid-column:1/-1; text-align:center; padding:30px;">لا توجد مقالات مدونة مضافة حالياً.</div>`;
      } else {
        blogsContainer.innerHTML = blogItems.map(blog => `
          <div class="glass-card" style="border-radius:20px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s; cursor:pointer;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform='translateY(0)'" onclick="window.location.hash='#blog/${blog.id}'">
            <div>
              <div style="position:relative; height:180px; overflow:hidden;">
                <img src="${blog.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600'}" style="width:100%; height:100%; object-fit:cover;">
                <span style="position:absolute; top:12px; right:12px; background:var(--primary); color:#ffffff; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:20px;">${blog.category || 'عام'}</span>
              </div>
              <div style="padding:20px;">
                <div style="font-size:0.78rem; color:var(--text-muted); font-weight:600; margin-bottom:8px;">${new Date(blog.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} • ${blog.readTime}</div>
                <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-color); margin:0 0 10px 0; line-height:1.4;">${blog.title}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">${blog.content.substring(0, 110)}...</p>
              </div>
            </div>
            <div style="padding:16px 20px; border-top:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.02);">
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${blog.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${blog.author?.name || 'Teacher'}`}" style="width:32px; height:32px; border-radius:50%; background:var(--bg-app); object-fit:cover;">
                <span style="font-size:0.8rem; font-weight:700; color:var(--text-color);">${blog.author?.name || 'أستاذ المنصة'}</span>
              </div>
              <span style="font-size:0.8rem; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:4px;">
                اقرأ المقال ➔
              </span>
            </div>
          </div>
        `).join("");
      }
    }
  }

  renderFilteredCourses() {
    const coursesContainer = this.container.querySelector("#landing-courses-container");
    if (!coursesContainer) return;

    let filtered = this.courses || [];
    if (this.activeCategory !== "all") {
      filtered = filtered.filter(c => c.category?.toLowerCase() === this.activeCategory.toLowerCase() || c.category?.includes(this.activeCategory));
    }

    if (filtered.length === 0) {
      coursesContainer.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:50px 24px; color:var(--text-muted); grid-column:1/-1;">
          <i data-lucide="book-open" style="width:48px; height:48px; color:var(--primary); margin-bottom:16px; opacity:0.5;"></i>
          <h3 style="margin-bottom:8px; font-weight:700; color:var(--text-color);">لا توجد دورات مضافة في هذا التخصص حالياً</h3>
          <p style="font-size:0.9rem; margin-bottom:20px;">يمكنك استكشاف التخصصات الأخرى أو التسجيل لتصلك الدورات الجديدة.</p>
          <a href="#signup" class="btn-primary" style="display:inline-flex;">انضم للمنصة الآن</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    coursesContainer.innerHTML = `
      <div class="courses-grid">
        ${filtered.map(course => renderCourseCard(course)).join("")}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    // Filter tab buttons
    const filterBtns = this.container.querySelectorAll(".landing-tab-btn");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        this.activeCategory = btn.getAttribute("data-cat");
        filterBtns.forEach(b => {
          const isActive = b === btn;
          b.style.borderBottomColor = isActive ? "var(--primary)" : "transparent";
          b.style.color = isActive ? "var(--primary)" : "var(--text-muted)";
        });
        this.renderFilteredCourses();
      });
    });

    // FAQ Accordion Toggle Handlers
    const faqItems = this.container.querySelectorAll(".faq-accordion-item");
    faqItems.forEach(item => {
      const q = item.querySelector(".faq-question");
      const ans = item.querySelector(".faq-answer");
      const icon = item.querySelector(".faq-icon");
      q?.addEventListener("click", () => {
        const isOpen = ans.style.display === "block";
        faqItems.forEach(i => {
          i.querySelector(".faq-answer").style.display = "none";
          i.querySelector(".faq-icon").style.transform = "rotate(0deg)";
        });
        if (!isOpen) {
          ans.style.display = "block";
          icon.style.transform = "rotate(180deg)";
        }
      });
    });

    this.bindChartEvents();
  }

  bindChartEvents() {
    const tabBtns = this.container.querySelectorAll(".chart-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-chart-type");
        this.currentChartType = type;

        tabBtns.forEach(b => {
          const isActive = b === btn;
          b.style.background = isActive ? "var(--primary)" : "transparent";
          b.style.color = isActive ? "#ffffff" : "var(--text-muted)";
          b.style.fontWeight = isActive ? "800" : "700";
        });

        this.initLiveChart(this.platformStats, type);
      });
    });
  }

  renderPlatformStats(stats) {
    const students = stats?.totalStudents !== undefined ? Math.max(stats.totalStudents, 15) : (this.teachers?.length || 1) * 25;
    const courses = stats?.totalCourses !== undefined ? stats.totalCourses : (this.courses?.length || 12);
    const teachers = stats?.totalTeachers !== undefined ? stats.totalTeachers : (this.teachers?.length || 6);
    const sessions = stats?.totalSessions !== undefined ? stats.totalSessions : (this.sessions?.length || 45);

    this.animateValue("stat-students-num", 0, students, 1400, "+");
    this.animateValue("stat-courses-num", 0, courses, 1200, "+");
    this.animateValue("stat-teachers-num", 0, teachers, 1000, "+");

    const sessionsBadge = document.getElementById("chart-stat-sessions");
    if (sessionsBadge) {
      sessionsBadge.textContent = `+${sessions} حصة`;
    }
  }

  animateValue(id, start, end, duration, prefix = "+", suffix = "") {
    const el = document.getElementById(id);
    if (!el) return;

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * (end - start) + start);
      el.textContent = `${prefix}${current.toLocaleString('ar-EG')}${suffix}`;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = `${prefix}${end.toLocaleString('ar-EG')}${suffix}`;
      }
    };
    window.requestAnimationFrame(step);
  }

  initLiveChart(stats, type = "growth") {
    if (!window.Chart) {
      // Retry in 200ms if Chart.js is still loading
      setTimeout(() => this.initLiveChart(stats, type), 200);
      return;
    }

    const canvas = document.getElementById("landing-live-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const isDark = document.body.classList.contains("dark-theme");
    const textColor = isDark ? "#e2e8f0" : "#334155";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    const monthlyData = stats?.monthlyData || [
      { month: "يناير", students: 180, sessions: 45 },
      { month: "فبراير", students: 340, sessions: 90 },
      { month: "مارس", students: 580, sessions: 160 },
      { month: "أبريل", students: 890, sessions: 280 },
      { month: "مايو", students: 1250, sessions: 410 },
      { month: "يونيو", students: stats?.totalStudents || 1680, sessions: stats?.totalSessions || 540 }
    ];

    if (type === "growth") {
      // Area / Line Chart
      const gradStudents = ctx.createLinearGradient(0, 0, 0, 300);
      gradStudents.addColorStop(0, "rgba(99, 102, 241, 0.35)");
      gradStudents.addColorStop(1, "rgba(99, 102, 241, 0.0)");

      const gradSessions = ctx.createLinearGradient(0, 0, 0, 300);
      gradSessions.addColorStop(0, "rgba(6, 182, 212, 0.3)");
      gradSessions.addColorStop(1, "rgba(6, 182, 212, 0.0)");

      this.chartInstance = new window.Chart(ctx, {
        type: "line",
        data: {
          labels: monthlyData.map(d => d.month),
          datasets: [
            {
              label: "إجمالي الطلاب النشطين",
              data: monthlyData.map(d => d.students),
              borderColor: "#6366f1",
              backgroundColor: gradStudents,
              borderWidth: 3,
              fill: true,
              tension: 0.42,
              pointBackgroundColor: "#6366f1",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8
            },
            {
              label: "جلسات البث والمراجعات المكتملة",
              data: monthlyData.map(d => d.sessions),
              borderColor: "#06b6d4",
              backgroundColor: gradSessions,
              borderWidth: 3,
              fill: true,
              tension: 0.42,
              pointBackgroundColor: "#06b6d4",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1200,
            easing: "easeOutQuart"
          },
          interaction: {
            mode: "index",
            intersect: false
          },
          plugins: {
            legend: {
              position: "top",
              align: "end",
              labels: {
                color: textColor,
                font: { family: "Cairo, sans-serif", weight: "700", size: 12 },
                boxWidth: 14,
                usePointStyle: true,
                pointStyle: "circle"
              }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
              borderWidth: 1,
              padding: 12,
              cornerRadius: 12,
              boxPadding: 6,
              bodyFont: { family: "Cairo, sans-serif", weight: "600" },
              titleFont: { family: "Cairo, sans-serif", weight: "800" }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700" } }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: "Outfit, sans-serif", weight: "600" } }
            }
          }
        }
      });

    } else if (type === "distribution") {
      // Doughnut Chart of Subjects
      const dist = stats?.categoryDistribution || {};
      let labels = Object.keys(dist);
      let values = Object.values(dist);

      if (labels.length === 0) {
        labels = ["الرياضيات والعلوم", "الفيزياء والكيمياء", "اللغات والترجمة", "العلوم الإنسانية والفلسفة", "علوم الحاسب والتقنية"];
        values = [35, 25, 20, 12, 8];
      }

      const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

      this.chartInstance = new window.Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: isDark ? "#0f172a" : "#ffffff",
            borderWidth: 3,
            hoverOffset: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1100,
            easing: "easeOutCirc"
          },
          cutout: "64%",
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: textColor,
                font: { family: "Cairo, sans-serif", weight: "700", size: 12 },
                padding: 14,
                boxWidth: 14,
                usePointStyle: true,
                pointStyle: "circle"
              }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                label: function (context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const val = context.parsed;
                  const pct = Math.round((val / total) * 100);
                  return ` ${context.label}: ${val} دورات (${pct}%)`;
                }
              }
            }
          }
        }
      });

    } else if (type === "engagement") {
      // Rounded Bar Chart
      const weekDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
      const studyHours = [240, 310, 280, 420, 390, 480, 520];
      const completedTasks = [180, 260, 220, 340, 310, 400, 450];

      this.chartInstance = new window.Chart(ctx, {
        type: "bar",
        data: {
          labels: weekDays,
          datasets: [
            {
              label: "ساعات التعلم والمشاهدة",
              data: studyHours,
              backgroundColor: "#6366f1",
              borderRadius: 8,
              borderSkipped: false
            },
            {
              label: "الواجبات والاختبارات المكتملة",
              data: completedTasks,
              backgroundColor: "#10b981",
              borderRadius: 8,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1000,
            easing: "easeOutQuad"
          },
          plugins: {
            legend: {
              position: "top",
              align: "end",
              labels: {
                color: textColor,
                font: { family: "Cairo, sans-serif", weight: "700", size: 12 },
                boxWidth: 14,
                usePointStyle: true,
                pointStyle: "circle"
              }
            },
            tooltip: {
              rtl: true,
              textDirection: "rtl",
              backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              titleColor: isDark ? "#ffffff" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#475569",
              padding: 12,
              cornerRadius: 12
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: "Cairo, sans-serif", weight: "700" } }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: "Outfit, sans-serif", weight: "600" } }
            }
          }
        }
      });
    }
  }

  onDestroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}