import { apiFetch, state, t, renderCourseCard } from "../app.js";

export default class LandingView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.sessions = [];
    this.activeCategory = "all";
  }

  async render() {
    this.container.innerHTML = `
      <div style="background:var(--bg-app); min-height:100vh;">

        <!-- TOP UTILITY BAR -->
        <div style="background:#09090b; border-bottom:1px solid rgba(255,255,255,0.08); padding:8px 24px; font-size:0.82rem; color:var(--text-muted);">
          <div style="max-width:1280px; margin:0 auto; display:flex; gap:24px; align-items:center; font-weight:700;">
            <span style="color:var(--primary); border-bottom:2px solid var(--primary); padding-bottom:4px; cursor:pointer;">للطلاب والمتفوقين (For Students)</span>
            <span style="cursor:pointer; opacity:0.8;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.8'">للمعلمين والأساتذة (For Teachers)</span>
            <span style="cursor:pointer; opacity:0.8;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.8'">للمدارس والمؤسسات (For Schools)</span>
          </div>
        </div>

        <!-- SCREENSHOT 1: SECTION 1 (DUAL HERO CAROUSEL) -->
        <section style="max-width:1280px; margin:0 auto; padding:32px 24px 16px 24px;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px; align-items:stretch;">
            
            <div class="glass-card" style="background:linear-gradient(135deg, #0056D2 0%, #1e40af 100%); color:#ffffff; border-radius:24px; padding:40px 32px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; min-height:300px; box-shadow:0 12px 36px rgba(0,86,210,0.25);">
              <div style="max-width:320px; z-index:2;">
                <h1 style="font-size:2.1rem; font-weight:900; line-height:1.25; margin-bottom:14px; color:#ffffff;">
                  ابدأ، طوّر، وحقق أفضل درجات البكالوريا 🎓
                </h1>
                <p style="font-size:0.95rem; opacity:0.9; line-height:1.6; margin-bottom:24px;">
                  تعلم وتفوق مع أفضل الدورات والدروس المباشرة مع نخبة معلمي المملكة والمغرب العربي.
                </p>
                <a href="#signup" class="btn-primary" style="background:#ffffff; color:#0056D2; padding:12px 28px; font-weight:800; font-size:0.95rem; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                  سجل مجاناً الآن <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>

              <div style="position:relative; width:160px; height:200px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.15); top:10px; right:-20px;"></div>
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400" alt="Student" style="width:140px; height:180px; object-fit:cover; border-radius:100px 100px 20px 20px; position:relative; z-index:2; border:3px solid rgba(255,255,255,0.3);">
              </div>
            </div>

            <div class="glass-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:24px; padding:40px 32px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; min-height:300px;">
              <div style="max-width:320px; z-index:2;">
                <h2 style="font-size:1.8rem; font-weight:900; line-height:1.3; margin-bottom:14px; color:var(--text-color);">
                  ارتقِ بمستوى طلابك وانضم لطاقم معلّمي بكالوريا 👨‍🏫
                </h2>
                <p style="font-size:0.92rem; color:var(--text-muted); line-height:1.6; margin-bottom:24px;">
                  قدّم دوراتك وبثك المباشر لآلاف الطلاب ومكّنهم من تحقيق أفضل النتائج.
                </p>
                <a href="#teacher-apply" class="btn-primary" style="padding:12px 28px; font-weight:800; font-size:0.95rem; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                  انضم كـ معلم بالمنصة <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; flex-shrink:0; width:140px;">
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:12px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:var(--primary);">📐 رياضيات</div>
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:12px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:#f59e0b;">⚡ فيزياء</div>
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:12px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:#10b981;">🧪 كيمياء</div>
                <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:12px 8px; text-align:center; font-weight:800; font-size:0.75rem; color:#ec4899;">📖 لغات</div>
              </div>
            </div>

          </div>

          <div style="display:flex; justify-content:flex-start; gap:8px; align-items:center; margin-top:20px; padding-inline-start:8px;">
            <span class="hero-dot active" style="width:28px; height:8px; border-radius:4px; background:var(--primary); cursor:pointer;"></span>
            <span class="hero-dot" style="width:10px; height:8px; border-radius:4px; background:var(--border-color); cursor:pointer;"></span>
            <span class="hero-dot" style="width:10px; height:8px; border-radius:4px; background:var(--border-color); cursor:pointer;"></span>
          </div>
        </section>


        <!-- SCREENSHOT 1: SECTION 2 (DYNAMIC NEW AND POPULAR 3-COLUMNS FROM DATABASE) -->
        <section style="max-width:1280px; margin:0 auto; padding:32px 24px;">
          <h2 style="font-size:1.75rem; font-weight:900; color:var(--text-color); margin-bottom:24px; display:flex; align-items:center; gap:8px;">
            الجديد والأكثر شعبية من قاعدة البيانات <span style="font-size:1rem; color:var(--text-muted); font-weight:600;">(Real Database Courses)</span>
          </h2>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">

            <!-- Column 1: Most popular -->
            <div class="glass-card" style="background:rgba(99,102,241,0.04); border:1px solid var(--border-color); border-radius:20px; padding:24px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="font-size:1.1rem; font-weight:900; color:var(--text-color); margin:0;">
                  الأكثر طلباً ومتابعة <i data-lucide="arrow-left" style="width:16px;height:16px; color:var(--primary);"></i>
                </h3>
                <span style="font-size:0.75rem; color:var(--primary); font-weight:700;">Most popular</span>
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
                <span style="font-size:0.75rem; color:#f59e0b; font-weight:700;">Hot new releases</span>
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
                <span style="font-size:0.75rem; color:#10b981; font-weight:700;">Trending sessions</span>
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
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:16px;">
              <div style="max-width:440px;">
                <h2 style="font-size:1.8rem; font-weight:900; margin-bottom:6px; color:#ffffff;">استعد لاجتياز امتحانات البكالوريا بامتياز</h2>
                <p style="font-size:0.92rem; opacity:0.9; margin:0;">اختر مسارك المفضل وابدأ في مراجعة أقوى الدورات والشهادات التدريبية.</p>
              </div>

              <div style="display:flex; gap:8px; flex-wrap:wrap; background:rgba(255,255,255,0.15); padding:6px; border-radius:30px; backdrop-filter:blur(10px);">
                <button class="gradient-pill-btn active" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:#000000; color:#ffffff; border:none; cursor:pointer;">📐 الرياضيات</button>
                <button class="gradient-pill-btn" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:rgba(255,255,255,0.85); color:#0056D2; border:none; cursor:pointer;">⚡ الفيزياء</button>
                <button class="gradient-pill-btn" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:rgba(255,255,255,0.85); color:#0056D2; border:none; cursor:pointer;">🧪 الكيمياء</button>
                <button class="gradient-pill-btn" style="padding:6px 18px; border-radius:20px; font-size:0.85rem; font-weight:800; background:rgba(255,255,255,0.85); color:#0056D2; border:none; cursor:pointer;">📖 العلوم واللغات</button>
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
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px;">
            <div class="glass-card" style="background:linear-gradient(135deg, #0056D2 0%, #2563eb 100%); color:#ffffff; border-radius:24px; padding:36px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; box-shadow:0 12px 32px rgba(0,86,210,0.2);">
              <div style="max-width:300px; z-index:2;">
                <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.2); padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:900; margin-bottom:12px;">
                  bakalorya <span style="background:#f59e0b; color:#000; padding:2px 6px; border-radius:4px; font-size:0.75rem;">PLUS</span>
                </div>
                <h3 style="font-size:1.5rem; font-weight:900; line-height:1.3; margin-bottom:12px; color:#ffffff;">
                  احصل على وصول كلي لجميع دورات وملخصات البكالوريا
                </h3>
                <a href="#signup" style="color:#ffffff; font-weight:800; font-size:0.95rem; text-decoration:underline; display:inline-flex; align-items:center; gap:6px;">
                  ابدأ تجربتك المجانية لمدة 7 أيام <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" style="width:120px; height:150px; object-fit:cover; border-radius:80px 80px 20px 20px; border:2px solid rgba(255,255,255,0.3); flex-shrink:0;">
            </div>

            <div class="glass-card" style="background:linear-gradient(135deg, #001e50 0%, #0f172a 100%); color:#ffffff; border-radius:24px; padding:36px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; box-shadow:0 12px 32px rgba(0,30,80,0.3);">
              <div style="max-width:300px; z-index:2;">
                <div style="display:inline-flex; align-items:center; gap:6px; color:#93c5fd; font-size:0.8rem; font-weight:900; margin-bottom:12px;">
                  bakalorya <span style="color:#ffffff; font-weight:500;">for teachers & schools</span>
                </div>
                <h3 style="font-size:1.5rem; font-weight:900; line-height:1.3; margin-bottom:12px; color:#ffffff;">
                  مكّن أساتذتك وطلابك من أحدث أدوات التعليم الرقمي
                </h3>
                <a href="#signup" style="color:#93c5fd; font-weight:800; font-size:0.95rem; text-decoration:underline; display:inline-flex; align-items:center; gap:6px;">
                  اكتشف حلول المؤسسات والمدارس <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
                </a>
              </div>
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300" style="width:120px; height:150px; object-fit:cover; border-radius:80px 80px 20px 20px; border:2px solid rgba(255,255,255,0.2); flex-shrink:0;">
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 3: SECTION 1 (WHAT BRINGS YOU TODAY?) -->
        <section style="max-width:1280px; margin:0 auto; padding:16px 24px 32px 24px;">
          <div class="glass-card" style="background:rgba(99,102,241,0.06); border:1px solid var(--border-color); border-radius:20px; padding:24px 32px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--text-color); margin:0;">
              ما الذي تسعى لتحقيقه في منصة بكالوريا اليوم؟
            </h3>
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
              <button class="goal-pill-btn" style="display:flex; align-items:center; gap:10px; background:#ffffff; color:#0f172a; padding:10px 20px; border-radius:30px; font-size:0.88rem; font-weight:800; border:1px solid #cbd5e1; cursor:pointer;">
                <span style="background:#0056D2; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">🚀</span>
                التحضير لاجتياز البكالوريا
              </button>
              <button class="goal-pill-btn" style="display:flex; align-items:center; gap:10px; background:#ffffff; color:#0f172a; padding:10px 20px; border-radius:30px; font-size:0.88rem; font-weight:800; border:1px solid #cbd5e1; cursor:pointer;">
                <span style="background:#2563eb; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">🔀</span>
                مراجعة وتدارك النقائص
              </button>
              <button class="goal-pill-btn" style="display:flex; align-items:center; gap:10px; background:#ffffff; color:#0f172a; padding:10px 20px; border-radius:30px; font-size:0.88rem; font-weight:800; border:1px solid #cbd5e1; cursor:pointer;">
                <span style="background:#10b981; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:0.8rem;">📈</span>
                الرفع من معدل المواد الأساسية
              </button>
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 3: SECTION 2 (EXPLORE SPECIALIZATIONS) -->
        <section style="max-width:1280px; margin:0 auto; padding:20px 24px 40px 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h2 style="font-size:1.75rem; font-weight:900; color:var(--text-color); margin:0;">
              استكشف الشعب والمسارات الدراسية <span style="font-size:1rem; color:var(--text-muted); font-weight:600;">(Explore specializations)</span>
            </h2>
            <a href="#courses-section" style="color:var(--primary); font-weight:800; text-decoration:none; font-size:0.9rem;">استكشف الكل ➔</a>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px;">
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <div>
                <div style="background:#fef3c7; border-radius:12px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Spec1" style="width:72px; height:72px; border-radius:50%; position:relative; z-index:2; border:2px solid #fff; background:#fff;">
                </div>
                <h3 style="font-size:1.05rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">شعبة العلوم التجريبية</h3>
                <p style="font-size:0.8rem; color:#64748b; line-height:1.45; margin:0;">علوم الحياة، الفيزياء والكيمياء، والتحليل العلمي لشهادة البكالوريا.</p>
              </div>
            </div>

            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <div>
                <div style="background:#dbeafe; border-radius:12px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Spec2" style="width:72px; height:72px; border-radius:50%; position:relative; z-index:2; border:2px solid #fff; background:#fff;">
                </div>
                <h3 style="font-size:1.05rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">شعبة الرياضيات والتقني</h3>
                <p style="font-size:0.8rem; color:#64748b; line-height:1.45; margin:0;">التفاضل والتكامل، الهندسة الفضائية، ومكانيك الهياكل التقنية.</p>
              </div>
            </div>

            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <div>
                <div style="background:#dcfce7; border-radius:12px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Spec3" style="width:72px; height:72px; border-radius:50%; position:relative; z-index:2; border:2px solid #fff; background:#fff;">
                </div>
                <h3 style="font-size:1.05rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">شعبة العلوم الرياضية</h3>
                <p style="font-size:0.8rem; color:#64748b; line-height:1.45; margin:0;">الجبر المتقدم، الاحتمالات، والفيزياء النظرية العالية.</p>
              </div>
            </div>

            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <div>
                <div style="background:#fce7f3; border-radius:12px; padding:16px; text-align:center; position:relative; overflow:hidden; margin-bottom:14px;">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Spec4" style="width:72px; height:72px; border-radius:50%; position:relative; z-index:2; border:2px solid #fff; background:#fff;">
                </div>
                <h3 style="font-size:1.05rem; font-weight:900; margin:0 0 6px 0; color:#0f172a;">شعبة الآداب والعلوم الإنسانية</h3>
                <p style="font-size:0.8rem; color:#64748b; line-height:1.45; margin:0;">الفلسفة، البلاغة، قواعد الإعراب واللغات الأجنبية.</p>
              </div>
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 3: SECTION 3 (91% CIRCULAR OUTCOMES BANNER) -->
        <section style="max-width:1280px; margin:0 auto; padding:0 24px 60px 24px;">
          <div class="glass-card" style="background:#001e50; color:#ffffff; border-radius:24px; padding:48px 40px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:32px; position:relative; overflow:hidden; box-shadow:0 16px 40px rgba(0,30,80,0.35);">
            <div style="max-width:540px; z-index:2;">
              <h2 style="font-size:2.2rem; font-weight:900; line-height:1.25; margin-bottom:16px; color:#ffffff;">
                91% من طلاب منصة بكالوريا حققوا ميزة التفوق والنجاح
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


        <!-- SCREENSHOT 4: SECTION 1 (WHY PEOPLE CHOOSE TESTIMONIAL GRID) -->
        <section style="max-width:1280px; margin:0 auto; padding:20px 24px 40px 24px;">
          <h2 style="font-size:1.75rem; font-weight:900; color:var(--text-color); margin-bottom:24px;">
            لماذا يختار الطلاب والأساتذة منصة بكالوريا <span style="font-size:1rem; color:var(--text-muted); font-weight:600;">(Why people choose Bakalorya)</span>
          </h2>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px;">
            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
              <div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #0056D2;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:900; margin:0; color:#0f172a;">سارة الهاشمي</h4>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">طالبة شعبة العلوم التجريبية</span>
                  </div>
                </div>
                <p style="font-size:0.85rem; color:#334155; line-height:1.6; margin:0; font-style:italic;">
                  "محتوى عالي الجودة مع مرونة تامة للتحضير المباشر والمستمر لامتحانات البكالوريا ومراجعة المواضيع الصعبة."
                </p>
              </div>
            </div>

            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
              <div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #0056D2;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:900; margin:0; color:#0f172a;">أيوب بوزيد</h4>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">طالب شعبة الرياضيات</span>
                  </div>
                </div>
                <p style="font-size:0.85rem; color:#334155; line-height:1.6; margin:0; font-style:italic;">
                  "أعادت المنصة لي الثقة وقدرة الاعتماد على النفس للوصول لأعلى النقاط في مادة الرياضيات والفيزياء."
                </p>
              </div>
            </div>

            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
              <div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #0056D2;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:900; margin:0; color:#0f172a;">عبد الله منصور</h4>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">طالب بكالوريا</span>
                  </div>
                </div>
                <p style="font-size:0.85rem; color:#334155; line-height:1.6; margin:0; font-style:italic;">
                  "أصبحت أكثر جاهزية لحل التمارين المعقدة ومتابعة البث المباشر المباشر أسبوعياً مع نخبة الأساتذة."
                </p>
              </div>
            </div>

            <div class="glass-card" style="background:#ffffff; color:#0f172a; border-radius:16px; border:1px solid #e2e8f0; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
              <div>
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                  <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #0056D2;">
                  <div>
                    <h4 style="font-size:0.95rem; font-weight:900; margin:0; color:#0f172a;">أنس السليمي</h4>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">طالب متميز</span>
                  </div>
                </div>
                <p style="font-size:0.85rem; color:#334155; line-height:1.6; margin:0; font-style:italic;">
                  "التطبيق الشامل والموارد المتاحة في Drive مكنتني من مراجعة كافة الدروس والسلاسل بسهولة فائقة."
                </p>
              </div>
            </div>
          </div>
        </section>


        <!-- SCREENSHOT 4: SECTION 2 (FAQ ACCORDION SECTION) -->
        <section style="max-width:1280px; margin:0 auto; padding:10px 24px 24px 24px;">
          <h2 style="font-size:1.35rem; font-weight:900; color:var(--text-color); margin-bottom:16px;">
            الأسئلة الشائعة والمتكررة <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">(Frequently asked questions)</span>
          </h2>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="faq-accordion-item glass-card" style="border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
              <div class="faq-question" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.88rem; color:var(--text-color);">
                <span>هل منصة بكالوريا معتمدة وتقدم شهادات ومتابعة دورية؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                نعم، توفر المنصة دورات ومراجعات شاملة من قِبل نخبة من أساتذة البكالوريا المتميزين، مع متابعة مستمرة للدرجات وحفظ المحتوى على حساب الطالب.
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
                <span>ما هي ميزات اشتراك Bakalorya PLUS وماذا يتضمن؟</span>
                <i data-lucide="chevron-down" class="faq-icon" style="transition:transform 0.3s; width:16px; height:16px;"></i>
              </div>
              <div class="faq-answer" style="display:none; padding:0 18px 12px 18px; font-size:0.82rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:10px;">
                يتيح اشتراك Bakalorya PLUS الوصول الشامل لكافة الدورات المسجلة والبث المباشر ومكتبة الملفات بخصم اشتراك موحد موفر للطالب.
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


        <!-- BAKALORYA CORE: METRICS TICKER STRIP -->
        <section style="background:var(--bg-card); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); padding:36px 24px;">
          <div style="max-width:1280px; margin:0 auto; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:24px; text-align:center;">
            <div>
              <div style="font-size:2.2rem; font-weight:900; color:var(--primary); line-height:1;">+15,000</div>
              <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700; margin-top:6px;">طالب مسجل بالمنصة</div>
            </div>
            <div>
              <div style="font-size:2.2rem; font-weight:900; color:var(--primary); line-height:1;">99.4%</div>
              <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700; margin-top:6px;">نسبة النجاح في البكالوريا</div>
            </div>
            <div>
              <div style="font-size:2.2rem; font-weight:900; color:var(--primary); line-height:1;">+120</div>
              <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700; margin-top:6px;">دورة تعليمية شاملة</div>
            </div>
            <div>
              <div style="font-size:2.2rem; font-weight:900; color:var(--primary); line-height:1;">+50</div>
              <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700; margin-top:6px;">استاذ وخبير تربوي</div>
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
                <h2 style="font-size:2rem; font-weight:900; margin:0; color:var(--text-color);">تعلم على يد أفضل أساتذة البكالوريا 👨‍🏫</h2>
                <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px;">أساتذة ذوو خبرة طويلة في إعداد طلاب البكالوريا للدرجات العليا</p>
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
              <h2 style="font-size:2rem; font-weight:900; margin:0; color:var(--text-color);">أحدث المقالات والنصائح للبكالوريا 📝</h2>
              <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px;">إرشادات ومنهجيات لم مساعدة طلاب البكالوريا على المذاكرة بذكاء وتفادي التوتر</p>
            </div>
            <a href="#courses-section" class="btn-secondary" style="padding:10px 22px; font-size:0.85rem; border-radius:20px; text-decoration:none;">تصفح جميع المقالات ➔</a>
          </div>

          <div id="landing-blogs-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
            <div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;"><i data-lucide="loader" class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto;"></i></div>
          </div>
        </section>


        <!-- CALL TO ACTION BANNER -->
        <section style="background:linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%); color:#ffffff; padding:70px 24px; text-align:center;">
          <div style="max-width:800px; margin:0 auto;">
            <h2 style="font-size:2.4rem; font-weight:900; margin-bottom:16px; color:#ffffff;">جاهز للبدء وتحقيق هدفك في البكالوريا؟</h2>
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
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:40px; margin-bottom:50px;">
              <div>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
                  <div style="width:36px; height:36px; border-radius:10px; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.2rem;">B</div>
                  <span style="font-size:1.4rem; font-weight:900; color:var(--text-color);">Bakalorya</span>
                </div>
                <p style="line-height:1.6; font-size:0.85rem; margin-bottom:20px;">
                  المنصة التعليمية التفاعلية الأولى المخصصة لمساعدة طلاب البكالوريا والدراسات الثانوية على تحقيق التفوق الأكاديمي.
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
                  <li><a href="#courses-section" style="color:var(--text-muted); text-decoration:none;">دليل الدورات التعليمية</a></li>
                  <li><a href="#schedule" style="color:var(--text-muted); text-decoration:none;">جدول البث المباشر</a></li>
                  <li><a href="#resources" style="color:var(--text-muted); text-decoration:none;">مكتبة الموارد والملفات</a></li>
                </ul>
              </div>

              <div>
                <h4 style="color:var(--text-color); font-weight:800; font-size:1rem; margin-bottom:18px;">التخصصات والمواد</h4>
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
                  <li><a href="#courses-section" style="color:var(--text-muted); text-decoration:none;">📐 مادة الرياضيات (Math)</a></li>
                  <li><a href="#courses-section" style="color:var(--text-muted); text-decoration:none;">⚡ مادة الفيزياء (Physics)</a></li>
                  <li><a href="#courses-section" style="color:var(--text-muted); text-decoration:none;">🧪 مادة الكيمياء (Chemistry)</a></li>
                  <li><a href="#courses-section" style="color:var(--text-muted); text-decoration:none;">📖 اللغة العربية والعلوم</a></li>
                </ul>
              </div>

              <div>
                <h4 style="color:var(--text-color); font-weight:800; font-size:1rem; margin-bottom:18px;">الدعم والتواصل</h4>
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
                  <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="mail" style="color:var(--primary); width:16px; height:16px;"></i> support@bakalorya.com</li>
                  <li style="display:flex; align-items:center; gap:8px;"><i data-lucide="phone" style="color:var(--primary); width:16px; height:16px;"></i> +213 555 123 456</li>
                </ul>
              </div>
            </div>

            <div style="padding-top:24px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; font-size:0.82rem;">
              <div>جميع الحقوق محفوظة © 2026 منصة بكالوريا التعليمية (Bakalorya Platform)</div>
            </div>

          </div>
        </footer>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
    await this.loadCoursesAsync();
  }

  async loadCoursesAsync() {
    try {
      const [coursesRes, sessionsRes, teachersRes, blogsRes] = await Promise.allSettled([
        apiFetch("/courses"),
        apiFetch("/sessions"),
        apiFetch("/teachers"),
        apiFetch("/blogs")
      ]);
      this.courses = coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value) ? coursesRes.value : [];
      this.sessions = sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value) ? sessionsRes.value : [];
      this.teachers = teachersRes.status === "fulfilled" && Array.isArray(teachersRes.value) ? teachersRes.value : [];
      this.blogs = blogsRes.status === "fulfilled" && Array.isArray(blogsRes.value) ? blogsRes.value : [];

      this.renderDynamicLandingSections();
      this.renderFilteredCourses();
    } catch (e) {
      console.error("Failed to load data for landing page", e);
    }
  }

  renderDynamicLandingSections() {
    // 1. Render Most Popular (Top 3 Courses from DB)
    const mostPopularContainer = this.container.querySelector("#most-popular-container");
    if (mostPopularContainer) {
      const items = this.courses.slice(0, 3);
      if (items.length === 0) {
        mostPopularContainer.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted);">لا توجد دورات متاحة حالياً.</div>`;
      } else {
        mostPopularContainer.innerHTML = items.map(course => `
          <div style="display:flex; gap:14px; align-items:center; background:var(--bg-card); padding:12px; border-radius:14px; border:1px solid var(--border-color); cursor:pointer;" onclick="window.location.hash='#course-preview/${course.id}'">
            <img src="${course.image || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200'}" style="width:56px; height:56px; object-fit:cover; border-radius:10px; flex-shrink:0;">
            <div style="flex:1;">
              <div style="font-size:0.75rem; color:var(--primary); font-weight:800;">${course.category || 'عام'} • ${course.teacher?.name || 'الأستاذ'}</div>
              <div style="font-size:0.9rem; font-weight:800; color:var(--text-color); margin:2px 0;">${course.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">دورة من قاعدة البيانات • ⭐ 4.9</div>
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
          <div style="display:flex; gap:14px; align-items:center; background:var(--bg-card); padding:12px; border-radius:14px; border:1px solid var(--border-color); cursor:pointer;" onclick="window.location.hash='#course-preview/${course.id}'">
            <img src="${course.image || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200'}" style="width:56px; height:56px; object-fit:cover; border-radius:10px; flex-shrink:0;">
            <div style="flex:1;">
              <div style="font-size:0.75rem; color:#f59e0b; font-weight:800;">${course.category || 'جديد'} • ${course.teacher?.name || 'الأستاذ'}</div>
              <div style="font-size:0.9rem; font-weight:800; color:var(--text-color); margin:2px 0;">${course.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">إصدار حديث • ⭐ 4.95</div>
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
          <div style="display:flex; gap:14px; align-items:center; background:var(--bg-card); padding:12px; border-radius:14px; border:1px solid var(--border-color); cursor:pointer;" onclick="window.location.hash='#schedule'">
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
              </div>
              <div style="font-size:0.75rem; color:#0056D2; font-weight:800; margin-bottom:4px;">${course.category || 'دورة تعليمية'} • ${course.teacher?.name || 'الأستاذ'}</div>
              <h4 style="font-size:1rem; font-weight:800; margin:0 0 8px 0; color:#0f172a; line-height:1.35;">${course.title}</h4>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:0.78rem; color:#64748b; font-weight:700;">
              <span>دورة من قاعدة البيانات</span>
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
            <div style="font-size:0.82rem; color:var(--primary); font-weight:700; margin-bottom:12px;">${teacher.education || 'أستاذ وخبير تربوي في البكالوريا'}</div>
            <div style="display:flex; justify-content:center; align-items:center; gap:12px; font-size:0.8rem; color:var(--text-muted); margin-bottom:18px; background:var(--bg-app); padding:8px 12px; border-radius:12px;">
              <span>⭐ 4.95 (أستاذ موثوق)</span>
              <span>•</span>
              <span>${teacher.location || 'المنصة الرقمية'}</span>
            </div>
            <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin-bottom:20px;">خبير تربوي في إعداد وشرح دروس البكالوريا والتمارين المنهجية التطبيقية.</p>
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
      <div class="courses-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:24px;">
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
  }
  onDestroy() { }
}