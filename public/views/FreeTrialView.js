import { apiFetch, state, showToast, t, renderEducationSelectHTML } from "../app.js";

export default class FreeTrialView {
  constructor(container) {
    this.container = container;
    this.allGrades = [];
    this.loading = true;

    // Parse any pre-selected query params passed via URL hash (e.g. #free-trial?gradeId=xxx&subjectId=yyy)
    const hash = window.location.hash || "";
    let targetGradeId = null;
    let targetSubjectId = null;
    if (hash.includes("?")) {
      try {
        const qs = hash.split("?")[1] || "";
        const params = new URLSearchParams(qs);
        targetGradeId = params.get("gradeId") || params.get("grade") || null;
        targetSubjectId = params.get("subjectId") || params.get("subject") || null;
      } catch (e) {
        // ignore malformed query string
      }
    }
    this.targetGradeId = targetGradeId;
    this.targetSubjectId = targetSubjectId;
  }

  // Helper: Normalize Grade Key across curricula, English/Arabic names, codes and degrees
  normalizeGradeKey(raw) {
    if (!raw) return "";
    let s = String(raw).toLowerCase().trim();
    s = s
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[\u064B-\u065F]/g, "");

    // Secondary 3 / Entlq 3 / Thanawya Amma / BAC / Grade 12
    if (
      s.includes("sec_3") || s.includes("sec 3") || s.includes("grade 12") ||
      s.includes("entlq 3") || s.includes("bac") || s.includes("3ث") ||
      s.includes("ثانويه عامه") || s.includes("ثانويه العامه") ||
      (s.includes("ثانوي") && (s.includes("ثالث") || s.includes("3")))
    ) {
      return "sec_3";
    }

    // Secondary 2 / Entlq 2 / Grade 11
    if (
      s.includes("sec_2") || s.includes("sec 2") || s.includes("grade 11") ||
      s.includes("entlq 2") || s.includes("2ث") ||
      (s.includes("ثانوي") && (s.includes("ثاني") || s.includes("2")))
    ) {
      return "sec_2";
    }

    // Secondary 1 / Entlq 1 / Grade 10
    if (
      s.includes("sec_1") || s.includes("sec 1") || s.includes("grade 10") ||
      s.includes("entlq 1") || s.includes("1ث") ||
      (s.includes("ثانوي") && (s.includes("اول") || s.includes("1")))
    ) {
      return "sec_1";
    }

    // Preparatory 3 / Grade 9 / BEM
    if (
      s.includes("prep_3") || s.includes("prep 3") || s.includes("grade 9") ||
      s.includes("bem") || s.includes("3 اعدادي") || s.includes("3ع") ||
      ((s.includes("اعدادي") || s.includes("متوسط")) && (s.includes("ثالث") || s.includes("تاسع") || s.includes("3") || s.includes("9")))
    ) {
      return "grade_9";
    }

    // Preparatory 2 / Grade 8
    if (
      s.includes("prep_2") || s.includes("prep 2") || s.includes("grade 8") ||
      s.includes("2 اعدادي") || s.includes("2ع") ||
      ((s.includes("اعدادي") || s.includes("متوسط")) && (s.includes("ثاني") || s.includes("ثامن") || s.includes("2") || s.includes("8")))
    ) {
      return "grade_8";
    }

    // Preparatory 1 / Grade 7
    if (
      s.includes("prep_1") || s.includes("prep 1") || s.includes("grade 7") ||
      s.includes("1 اعدادي") || s.includes("1ع") ||
      ((s.includes("اعدادي") || s.includes("متوسط")) && (s.includes("اول") || s.includes("سابع") || s.includes("1") || s.includes("7")))
    ) {
      return "grade_7";
    }

    // Primary 6 / Grade 6
    if (
      s.includes("pri_6") || s.includes("pri 6") || s.includes("grade 6") ||
      ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("سادس") || s.includes("6"))) ||
      s.includes("6 ابتدائي") || s.includes("سادس ابتدائي")
    ) {
      return "grade_6";
    }

    // Primary 5 / Grade 5
    if (
      s.includes("pri_5") || s.includes("pri 5") || s.includes("grade 5") ||
      ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("خامس") || s.includes("5"))) ||
      s.includes("5 ابتدائي") || s.includes("خامس ابتدائي")
    ) {
      return "grade_5";
    }

    // Primary 4 / Grade 4
    if (
      s.includes("pri_4") || s.includes("pri 4") || s.includes("grade 4") ||
      ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("رابع") || s.includes("4"))) ||
      s.includes("4 ابتدائي") || s.includes("رابع ابتدائي")
    ) {
      return "grade_4";
    }

    // Primary 3 / Grade 3
    if (
      s.includes("pri_3") || s.includes("pri 3") || s.includes("grade 3") ||
      ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("ثالث") || s.includes("3"))) ||
      s.includes("3 ابتدائي") || s.includes("ثالث ابتدائي")
    ) {
      return "grade_3";
    }

    // Primary 2 / Grade 2
    if (
      s.includes("pri_2") || s.includes("pri 2") || s.includes("grade 2") ||
      ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("ثاني") || s.includes("2"))) ||
      s.includes("2 ابتدائي") || s.includes("ثاني ابتدائي")
    ) {
      return "grade_2";
    }

    // Primary 1 / Grade 1
    if (
      s.includes("pri_1") || s.includes("pri 1") || s.includes("grade 1") ||
      ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("اول") || s.includes("1"))) ||
      s.includes("1 ابتدائي") || s.includes("اول ابتدائي")
    ) {
      return "grade_1";
    }

    return s;
  }

  // Match the user selected grade string with Grade entity from database
  findGradeForValue(val) {
    if (!this.allGrades || this.allGrades.length === 0) return null;
    if (!val) return this.allGrades[0];

    const targetKey = this.normalizeGradeKey(val);

    // 1. Direct ID match
    let matched = this.allGrades.find(g => g.id === val);
    if (matched) return matched;

    // 2. Normalized code match (e.g. SEC_3 -> sec_3)
    matched = this.allGrades.find(g => this.normalizeGradeKey(g.code) === targetKey);
    if (matched) return matched;

    // 3. Normalized name or nameEn match
    matched = this.allGrades.find(g => 
      this.normalizeGradeKey(g.name) === targetKey || 
      this.normalizeGradeKey(g.nameEn) === targetKey
    );
    if (matched) return matched;

    // 4. Substring loose comparison
    const normVal = this.normalizeGradeKey(val);
    matched = this.allGrades.find(g => {
      const gName = this.normalizeGradeKey(g.name);
      const gNameEn = this.normalizeGradeKey(g.nameEn);
      return gName.includes(normVal) || normVal.includes(gName) || gNameEn.includes(normVal) || normVal.includes(gNameEn);
    });

    return matched || this.allGrades[0];
  }

  async render() {
    this.container.innerHTML = `
      <div style="background:var(--bg-app); min-height:100vh; padding:32px 20px 80px; direction:rtl;">
        <div style="max-width:1100px; margin:0 auto; display:flex; flex-direction:column; gap:28px;">
          
          <!-- Breadcrumb navigation -->
          <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:var(--text-muted);">
            <a href="${state.user?.role === 'student' ? '#student-dashboard' : '#landing'}" style="color:var(--text-muted); text-decoration:none;">
              ${state.user?.role === 'student' ? 'لوحة الطالب' : 'الرئيسية'}
            </a>
            <span>/</span>
            <span style="color:var(--primary);">حجز حصة تجريبية مجانية</span>
          </div>

          <!-- Header -->
          <div style="text-align:center; max-width:800px; margin:0 auto;">
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(16,185,129,0.12); color:#10b981; font-size:0.85rem; font-weight:900; padding:6px 18px; border-radius:30px; margin-bottom:14px; border:1px solid rgba(16,185,129,0.25);">
              <span style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block; box-shadow:0 0 10px #10b981;"></span>
              🎁 عرض ترحيبي خاص • حصة تجريبية مجانية 100% بدون أي التزام
            </div>
            <h1 style="font-size:clamp(1.5rem, 3.5vw, 2.3rem); font-weight:900; color:var(--text-color); margin:0 0 12px 0; line-height:1.3;">
              احجز حصتك التجريبية المجانية وتفوق معنا 🎯
            </h1>
            <p style="font-size:1.0rem; color:var(--text-muted); line-height:1.6; margin:0 auto;">
              عش تجربة الفصول الافتراضية التفاعلية مع نخبة مدرسي المنصة. احضر بثاً حياً، تفاعل بالصوت والأسئلة، واستلم ملخص الدرس وأوراق العمل مجاناً فور انتهاء الحصة!
            </p>
          </div>

          <!-- Main Grid (Form Card + Value Card) -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:28px; align-items:stretch;">

            <!-- Column 1: Interactive Enrollment Form -->
            <div class="glass-card" style="background:var(--bg-card); border:1.5px solid var(--border-color); border-radius:24px; padding:32px 28px; box-shadow:0 12px 36px rgba(0,0,0,0.03); display:flex; flex-direction:column; justify-content:space-between;">
              
              <div id="trial-page-form-wrapper">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:8px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(0,86,210,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <i data-lucide="sparkles" style="width:22px; height:22px;"></i>
                    </div>
                    <div>
                      <h3 style="font-size:1.2rem; font-weight:900; color:var(--text-color); margin:0;">نموذج حجز الحصة التجريبية</h3>
                      <span style="font-size:0.8rem; color:var(--text-muted);">سجل بياناتك وسيتم التنسيق معك فوراً</span>
                    </div>
                  </div>
                  <span style="font-size:0.75rem; font-weight:800; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.25); padding:4px 12px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                    ⚡ مقاعد مجانية محدودة اليوم
                  </span>
                </div>

                <form id="trial-page-form" style="display:flex; flex-direction:column; gap:18px;">
                  
                  <!-- Student Name -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-weight:800; font-size:0.88rem; color:var(--text-color); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="user" style="width:15px; height:15px; color:var(--primary);"></i> اسم الطالب / ولي الأمر <span style="color:var(--error);">*</span>
                    </label>
                    <input type="text" id="trial-page-name" class="form-input" value="${state.user?.name || ''}" placeholder="أدخل الاسم ثلاثي..." required style="padding:11px 14px; font-size:0.92rem; border-radius:12px;">
                  </div>

                  <!-- Phone / WhatsApp (Optional) -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-weight:800; font-size:0.88rem; color:var(--text-color); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="phone" style="width:15px; height:15px; color:#10b981;"></i> رقم الهاتف أو الواتساب (اختياري)
                    </label>
                    <input type="tel" id="trial-page-phone" class="form-input" value="${state.user?.phone || ''}" placeholder="رقم الهاتف (اختياري)..." style="padding:11px 14px; font-size:0.92rem; border-radius:12px; direction:ltr; text-align:right;">
                  </div>

                  <!-- Degree & Grade from SAME ALL SITES -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-weight:800; font-size:0.88rem; color:var(--text-color); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="graduation-cap" style="width:15px; height:15px; color:var(--primary);"></i> المرحلة والصف الدراسي (Degree & Grade) <span style="color:var(--error);">*</span>
                    </label>
                    ${renderEducationSelectHTML({
                      id: "trial-page-education",
                      selectedValue: state.user?.education || "Entlq 3",
                      required: true,
                      style: "padding:11px 14px; font-size:0.92rem; border-radius:12px; width:100%; box-sizing:border-box; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-color);"
                    })}
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">المستوى الدراسي المعتمد والموحد على مستوى المنصة.</span>
                  </div>

                  <!-- Subject (Strictly related to selected Grade & Active in site) -->
                  <div class="form-group" style="margin:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <label style="font-weight:800; font-size:0.88rem; color:var(--text-color); margin:0; display:flex; align-items:center; gap:6px;">
                        <i data-lucide="book-open" style="width:15px; height:15px; color:var(--primary);"></i> المادة المراد تجربتها (Subject) <span style="color:var(--error);">*</span>
                      </label>
                      <span style="font-size:0.73rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:8px;">
                        مواد نشطة ومخصصة للصف
                      </span>
                    </div>

                    <select id="trial-page-subject" class="form-input" required style="padding:11px 14px; font-size:0.92rem; border-radius:12px; cursor:pointer; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-color);">
                      <option value="" disabled selected>-- جاري تحميل المواد النشطة للصف المحدد... --</option>
                    </select>

                    <div id="trial-page-subject-help" style="font-size:0.76rem; color:#10b981; margin-top:6px; display:flex; align-items:center; gap:5px; font-weight:700;">
                      <i data-lucide="sparkles" style="width:13px; height:13px;"></i>
                      <span>يتم جلب المواد النشطة والمعتمدة الخاصة بالصف الدراسي المختار تلقائياً.</span>
                    </div>
                  </div>

                  <!-- Preferred Timing -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-weight:800; font-size:0.88rem; color:var(--text-color); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="clock" style="width:15px; height:15px; color:#f59e0b;"></i> الموعد المفضل للحصة <span style="color:var(--error);">*</span>
                    </label>
                    <select id="trial-page-timing" class="form-input" style="padding:11px 14px; font-size:0.92rem; border-radius:12px; cursor:pointer; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-color);">
                      <option value="فترة مسائية (05:00 م - 07:00 م)">فترة مسائية (05:00 م - 07:00 م)</option>
                      <option value="فترة ليلية (08:00 م - 10:00 م)" selected>فترة ليلية (08:00 م - 10:00 م)</option>
                      <option value="عطلة نهاية الأسبوع (الجمعة / السبت)">عطلة نهاية الأسبوع (الجمعة / السبت)</option>
                      <option value="أي موعد متاح لدى المعلم">أي موعد متاح لدى المعلم</option>
                    </select>
                  </div>

                  <!-- Optional Notes -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-weight:800; font-size:0.88rem; color:var(--text-color); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="message-square" style="width:15px; height:15px; color:var(--primary);"></i> ملاحظات أو درس معين ترغب بشرحه (اختياري)
                    </label>
                    <input type="text" id="trial-page-notes" class="form-input" placeholder="مثال: أرغب بالتركيز على درس قوانين كيرشوف..." style="padding:11px 14px; font-size:0.9rem; border-radius:12px;">
                  </div>

                  <!-- Single Submit Action: Send Directly via WhatsApp -->
                  <button type="submit" id="trial-page-submit-btn" class="btn-primary" style="padding:15px; font-weight:900; font-size:1.02rem; border-radius:30px; width:100%; justify-content:center; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); border:none; box-shadow:0 8px 24px rgba(37,211,102,0.3); cursor:pointer; margin-top:8px; display:inline-flex; align-items:center; gap:10px; color:#ffffff; transition:all 0.2s;">
                    <i data-lucide="message-circle" style="width:20px; height:20px;"></i>
                    <span>إرسال وتأكيد الحجز عبر واتساب 💬</span>
                  </button>

                </form>
              </div>

              <!-- Success Card View (Shown after submission) -->
              <div id="trial-page-success-wrapper" style="display:none; text-align:center; padding:20px 10px;">
                <div style="width:68px; height:68px; border-radius:50%; background:rgba(16,185,129,0.12); color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; border:2px solid rgba(16,185,129,0.3);">
                  <i data-lucide="check-circle-2" style="width:38px; height:38px;"></i>
                </div>
                <h3 style="font-size:1.4rem; font-weight:900; color:var(--text-color); margin:0 0 8px 0;">تهانينا! تم تسجيل طلب الحصة بنجاح 🎉</h3>
                <p style="font-size:0.95rem; color:var(--text-muted); line-height:1.6; margin:0 0 24px 0;">
                  تم استلام طلبك لحضور الحصة التجريبية المجانية. سيتواصل معك منسق المادة لتأكيد الموعد وإرسال رابط البث المباشر.
                </p>

                <div id="trial-page-success-summary" style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:18px; padding:18px; text-align:start; margin-bottom:24px; font-size:0.9rem; display:flex; flex-direction:column; gap:10px;">
                </div>

                <div style="display:flex; flex-direction:column; gap:12px;">
                  <a id="trial-page-success-wa-link" href="#" target="_blank" class="btn-primary" style="background:#10b981; color:#ffffff; padding:12px; border-radius:30px; font-weight:800; font-size:0.95rem; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 6px 20px rgba(16,185,129,0.25);">
                    <i data-lucide="message-circle" style="width:18px; height:18px;"></i>
                    تأكيد الموعد فوراً مع الدعم على واتساب 💬
                  </a>
                  <a href="${state.user?.role === 'student' ? '#student-dashboard' : '#courses'}" class="btn-secondary" style="padding:10px 18px; font-size:0.85rem; border-radius:20px; text-decoration:none; display:inline-flex; align-items:center; justify-content:center;">
                    العودة إلى لوحة التحكم
                  </a>
                </div>
              </div>

              <!-- Trust Footer -->
              <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.78rem; color:var(--text-muted);">
                <i data-lucide="shield-check" style="width:15px; height:15px; color:#10b981;"></i>
                <span>بياناتك في أمان تام • الحصة مجانية 100% ولا تتطلب أي وسيلة دفع</span>
              </div>

            </div>

            <!-- Column 2: What You Get & Value Proposition -->
            <div class="glass-card" style="background:var(--bg-card); border:1.5px solid var(--border-color); border-radius:24px; padding:32px 28px; box-shadow:0 12px 36px rgba(0,0,0,0.03); display:flex; flex-direction:column; justify-content:space-between; gap:20px;">
              <div>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
                  <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i data-lucide="gift" style="width:22px; height:22px;"></i>
                  </div>
                  <div>
                    <h3 style="font-size:1.2rem; font-weight:900; color:var(--text-color); margin:0;">ماذا تشمل حصتك التجريبية؟</h3>
                    <span style="font-size:0.8rem; color:var(--text-muted);">كل ما يحتاجه الطالب لتجربة تعليمية متكاملة</span>
                  </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:16px;">
                  
                  <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px; display:flex; align-items:flex-start; gap:14px;">
                    <div style="width:38px; height:38px; border-radius:10px; background:rgba(0,86,210,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.15rem;">
                      🎙️
                    </div>
                    <div>
                      <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-color); margin:0 0 3px 0;">بث حي فائق الجودة وتفاعل صوتي كامل</h4>
                      <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0;">احضر الحصة وتفاعل مع المعلم كأنك في فصل دراسي خاص، يمكنك رفع اليد وطرح الأسئلة صوتياً.</p>
                    </div>
                  </div>

                  <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px; display:flex; align-items:flex-start; gap:14px;">
                    <div style="width:38px; height:38px; border-radius:10px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.15rem;">
                      📄
                    </div>
                    <div>
                      <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-color); margin:0 0 3px 0;">ملخص رقمي PDF وخرائط ذهنية مجانية</h4>
                      <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0;">استلم ملف PDF يلخص أهم قواعد ونقاط ومسائل الدرس فور انتهاء الحصة لتحتفظ به دائماً.</p>
                    </div>
                  </div>

                  <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px; display:flex; align-items:flex-start; gap:14px;">
                    <div style="width:38px; height:38px; border-radius:10px; background:rgba(245,158,11,0.1); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.15rem;">
                      📊
                    </div>
                    <div>
                      <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-color); margin:0 0 3px 0;">تحديد مستوى الطالب وتقييم سريع</h4>
                      <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0;">اختبار تفاعلي مصغر في نهاية الحصة لقياس استيعاب الطالب ونقاط القوة والفرص الدراسية.</p>
                    </div>
                  </div>

                  <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:16px; padding:16px; display:flex; align-items:flex-start; gap:14px;">
                    <div style="width:38px; height:38px; border-radius:10px; background:rgba(147,51,234,0.1); color:#9333ea; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.15rem;">
                      🎯
                    </div>
                    <div>
                      <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-color); margin:0 0 3px 0;">استشارة تعليمية وخطة للمذاكرة</h4>
                      <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0;">جلسة استشارية قصيرة لاقتراح أفضل مجموعة ومواعيد تناسب الجدول الدراسي للطالب.</p>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Social Proof Banner -->
              <div style="background:linear-gradient(135deg, rgba(0,86,210,0.06) 0%, rgba(16,185,129,0.06) 100%); border:1px dashed rgba(0,86,210,0.25); border-radius:18px; padding:18px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; align-items:center; gap:4px; color:#f59e0b; font-size:0.85rem; font-weight:800;">
                    <span>★★★★★</span>
                    <span style="color:var(--text-color); margin-inline-start:4px;">4.9 / 5</span>
                  </div>
                  <span style="font-size:0.75rem; color:#10b981; font-weight:800;">
                    +12,450 طالب خاضوا التجربة بنجاح
                  </span>
                </div>
                <p style="font-size:0.83rem; color:var(--text-color); font-weight:600; line-height:1.5; margin:0; font-style:italic;">
                  "الحصة التجريبية ساعدتني أفهم مادة الفيزياء من أول ربع ساعة وطريقة الشرح كانت أسهل بكتير من الدروس التقليدية!"
                </p>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">— زياد أحمد، طالب ثانوي متفوق</span>
              </div>

            </div>

          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
    await this.loadCurriculumDataAsync();
  }

  // Load Grades and their Active Subjects from platform API
  async loadCurriculumDataAsync() {
    try {
      const grades = await apiFetch("/curriculum/grades");
      if (Array.isArray(grades) && grades.length > 0) {
        this.allGrades = grades;
        this.populateGradesSelect();
      }
    } catch (e) {
      console.error("Failed to load /curriculum/grades for FreeTrialView:", e);
    }
    await this.updateSubjectsForSelectedGrade();
  }

  // Populate grade dropdown dynamically from real database grades grouped by educational stage
  populateGradesSelect() {
    const eduSelect = this.container.querySelector("#trial-page-education");
    if (!eduSelect || !this.allGrades || this.allGrades.length === 0) return;

    const stages = [
      { key: "PRIMARY", label: "المرحلة الابتدائية (Primary Stage)" },
      { key: "PREPARATORY", label: "المرحلة الإعدادية والمتوسطة (Preparatory / Intermediate)" },
      { key: "SECONDARY", label: "المرحلة الثانوية والبكالوريا (Secondary Stage / Entlq)" }
    ];

    let html = `<option value="" disabled>-- اختر المرحلة والصف الدراسي --</option>`;

    stages.forEach(st => {
      const stageGrades = this.allGrades.filter(g => g.stage === st.key);
      if (stageGrades.length > 0) {
        html += `<optgroup label="${st.label}">`;
        stageGrades.forEach(g => {
          const enLabel = g.nameEn ? ` (${g.nameEn})` : "";
          html += `<option value="${g.id}" data-id="${g.id}" data-code="${g.code || ''}" data-name="${g.name}">
            ${g.name}${enLabel}
          </option>`;
        });
        html += `</optgroup>`;
      }
    });

    const otherGrades = this.allGrades.filter(g => !stages.some(s => s.key === g.stage));
    if (otherGrades.length > 0) {
      html += `<optgroup label="مراحل تعليمية أخرى">`;
      otherGrades.forEach(g => {
        html += `<option value="${g.id}" data-id="${g.id}">${g.name}</option>`;
      });
      html += `</optgroup>`;
    }

    eduSelect.innerHTML = html;

    // Determine initial selected grade
    let target = null;
    if (this.targetGradeId) {
      target = this.findGradeForValue(this.targetGradeId);
    }
    if (!target && state.user?.education) {
      target = this.findGradeForValue(state.user.education);
    }
    if (!target) {
      // Default to 3rd Secondary (SEC_3) or first available
      target = this.allGrades.find(g => (g.code || "").toUpperCase() === "SEC_3") ||
               this.allGrades.find(g => g.stage === "SECONDARY") ||
               this.allGrades[0];
    }

    if (target) {
      eduSelect.value = target.id;
    }
  }

  // Dynamically update the Subject select so it strictly contains active subjects related to the chosen grade
  async updateSubjectsForSelectedGrade() {
    const eduSelect = this.container.querySelector("#trial-page-education");
    const subjectSelect = this.container.querySelector("#trial-page-subject");
    const subjectHelp = this.container.querySelector("#trial-page-subject-help");
    if (!subjectSelect) return;

    const selectedGradeVal = eduSelect ? eduSelect.value : "";
    const matchedGrade = this.findGradeForValue(selectedGradeVal);

    if (!matchedGrade) {
      subjectSelect.innerHTML = `<option value="" disabled selected>-- جاري تحميل المواد النشطة... --</option>`;
      return;
    }

    // Filter ONLY active subjects for this specific grade
    let activeSubjects = (matchedGrade.subjects || []).filter(s => s.isActive !== false);

    // If subjects not populated or empty, fetch active subjects directly from /curriculum/subjects API
    if (!activeSubjects || activeSubjects.length === 0) {
      try {
        const subjectsData = await apiFetch(`/curriculum/subjects?gradeId=${matchedGrade.id}`);
        if (Array.isArray(subjectsData) && subjectsData.length > 0) {
          activeSubjects = subjectsData.filter(s => s.isActive !== false);
          matchedGrade.subjects = activeSubjects; // cache for responsiveness
        }
      } catch (err) {
        console.warn("Could not fetch active subjects for grade:", err);
      }
    }

    if (activeSubjects && activeSubjects.length > 0) {
      subjectSelect.innerHTML = activeSubjects.map(s => {
        const langBadge = s.isLanguageTrack ? " • (لغات / Languages)" : "";
        const icon = s.icon || "📖";
        const isSelected = (
          this.targetSubjectId && (s.id === this.targetSubjectId || s.name === this.targetSubjectId || s.nameEn === this.targetSubjectId)
        ) ? "selected" : "";
        return `<option value="${s.name}" data-id="${s.id}" data-icon="${icon}" ${isSelected}>
          ${icon} ${s.name}${langBadge}
        </option>`;
      }).join("");
      subjectSelect.disabled = false;

      // Consume targetSubjectId on first application
      this.targetSubjectId = null;

      if (subjectHelp) {
        subjectHelp.innerHTML = `
          <i data-lucide="check-circle" style="width:13px; height:13px; color:#10b981;"></i>
          <span>المواد النشطة لـ <strong>${matchedGrade.name}</strong> (${activeSubjects.length} مادة معتمدة ونشطة بالمنصة)</span>
        `;
        subjectHelp.style.color = "#10b981";
      }
    } else {
      subjectSelect.innerHTML = `<option value="" disabled selected>لا توجد مواد دراسية نشطة متاحة لـ ${matchedGrade.name} حالياً</option>`;
      subjectSelect.disabled = true;

      if (subjectHelp) {
        subjectHelp.innerHTML = `
          <i data-lucide="alert-circle" style="width:13px; height:13px; color:#f59e0b;"></i>
          <span>لا توجد مواد نشطة مفعلة لـ ${matchedGrade.name} حالياً</span>
        `;
        subjectHelp.style.color = "#f59e0b";
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const form = this.container.querySelector("#trial-page-form");
    const nameInput = this.container.querySelector("#trial-page-name");
    const phoneInput = this.container.querySelector("#trial-page-phone");
    const eduSelect = this.container.querySelector("#trial-page-education");
    const subjectSelect = this.container.querySelector("#trial-page-subject");
    const timingSelect = this.container.querySelector("#trial-page-timing");
    const notesInput = this.container.querySelector("#trial-page-notes");
    const submitBtn = this.container.querySelector("#trial-page-submit-btn");
    const waQuickBtn = this.container.querySelector("#trial-page-wa-btn");
    const formWrapper = this.container.querySelector("#trial-page-form-wrapper");
    const successWrapper = this.container.querySelector("#trial-page-success-wrapper");
    const successSummary = this.container.querySelector("#trial-page-success-summary");
    const successWaLink = this.container.querySelector("#trial-page-success-wa-link");

    // Dynamic reactive listener: change subjects when education/grade changes
    eduSelect?.addEventListener("change", async () => {
      await this.updateSubjectsForSelectedGrade();
    });

    const buildWhatsAppUrl = () => {
      const name = nameInput?.value?.trim() || (state.user?.name || "طالب جديد");
      const selectedGradeVal = eduSelect ? eduSelect.value : "";
      const matchedGrade = this.findGradeForValue(selectedGradeVal);
      const degreeText = matchedGrade?.name || (eduSelect ? eduSelect.options[eduSelect.selectedIndex]?.text : "المرحلة الثانوية");
      const subject = subjectSelect?.value || "الرياضيات";
      const timing = timingSelect?.value || "فترة ليلية";
      const notes = notesInput?.value?.trim() || "";

      // Message lines WITHOUT student phone number (as requested)
      const lines = [
        "مرحباً إدارة منصة انطلق 🎓",
        "أرغب في حجز حصة تجريبية تفاعلية مجانية:",
        `• اسم الطالب: ${name}`,
        `• المرحلة والصف الدراسي: ${degreeText}`,
        `• المادة المطلوبة: ${subject}`,
        `• الموعد المفضل: ${timing}`
      ];
      if (notes) lines.push(`• ملاحظات: ${notes}`);
      lines.push("يرجى تأكيد الموعد وإرسال رابط القاعة الافتراضية. شكراً جزيلاً!");

      const cleanWa = state.platformSettings?.cleanWhatsApp || "213555123456";
      return `https://wa.me/${cleanWa}?text=${encodeURIComponent(lines.join("\n"))}`;
    };

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = nameInput?.value?.trim();
      const phone = phoneInput?.value?.trim() || (state.user?.phone || "");
      const selectedGradeVal = eduSelect?.value || "Entlq 3";
      const matchedGrade = this.findGradeForValue(selectedGradeVal);
      const degreeText = matchedGrade?.name || (eduSelect ? eduSelect.options[eduSelect.selectedIndex]?.text : "المرحلة الثانوية");
      const subject = subjectSelect?.value || "";
      const selectedSubjectOpt = subjectSelect?.options[subjectSelect.selectedIndex];
      const subjectId = selectedSubjectOpt?.getAttribute("data-id") || null;
      const timing = timingSelect?.value || "فترة ليلية";
      const notes = notesInput?.value?.trim() || "";

      if (!name) {
        showToast("يرجى إدخال اسم الطالب.", "warning");
        return;
      }

      if (!subject) {
        showToast("يرجى اختيار المادة المراد تجربتها.", "warning");
        return;
      }

      // 1. Build WhatsApp URL without phone number
      const waUrl = buildWhatsAppUrl();

      // 2. Open WhatsApp directly in new window/tab
      window.open(waUrl, "_blank");

      // 3. Record submission on server in background for admin notification
      apiFetch("/public/free-trial", {
        method: "POST",
        body: {
          name,
          phone: phone || "عبر واتساب",
          stage: matchedGrade?.stage || "SECONDARY",
          grade: degreeText,
          gradeId: matchedGrade?.id || null,
          subject,
          subjectId,
          timing,
          notes
        }
      }).catch(err => {
        console.warn("Trial submit API notice (handled smoothly):", err);
      });

      // 4. Populate success view details
      if (successSummary) {
        successSummary.innerHTML = `
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
            <strong style="color:var(--text-color);">اسم الطالب:</strong>
            <span style="color:var(--primary); font-weight:700;">${name}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
            <strong style="color:var(--text-color);">المرحلة والصف الدراسي:</strong>
            <span>${degreeText}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
            <strong style="color:var(--text-color);">المادة المراد تجربتها:</strong>
            <span style="color:#10b981; font-weight:800;">${subject}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <strong style="color:var(--text-color);">الموعد المفضل:</strong>
            <span>${timing}</span>
          </div>
        `;
      }

      if (successWaLink) {
        successWaLink.href = waUrl;
      }

      if (formWrapper) formWrapper.style.display = "none";
      if (successWrapper) successWrapper.style.display = "block";

      showToast("تم فتح محادثة واتساب لتأكيد حجز الحصة 💬", "success");
      if (window.lucide) window.lucide.createIcons();
    });
  }

  onDestroy() {}
}
