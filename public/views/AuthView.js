import { apiFetch, setAuth, state, t, renderPhoneInputGroup, renderEducationSelectHTML } from "../app.js";

export default class AuthView {
  constructor(container, mode) {
    this.container = container;
    this.isStaffMode = window.location.hash.includes("staff-login") || window.location.hash.includes("teacher-login") || window.location.hash.includes("admin-login");
    this.isRegisterMode = !this.isStaffMode && (mode === "signup" || window.location.hash.includes("signup"));
    this.showPassword = false;
  }

  async render() {
    this.isStaffMode = window.location.hash.includes("staff-login") || window.location.hash.includes("teacher-login") || window.location.hash.includes("admin-login");
    if (this.isStaffMode) {
      this.isRegisterMode = false;
    }

    if (state.user) {
      const targetHash = state.user.role === "admin" ? "#admin-dashboard" : state.user.role === "teacher" ? "#teacher-portal" : "#student-dashboard";
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      return;
    }

    const titleText = this.isStaffMode 
      ? "بوابة المعلمين والإدارة 🛡️" 
      : this.isRegisterMode 
        ? "إنشاء حساب طالب جديد ✨" 
        : "تسجيل دخول الطلاب 👨‍🎓";

    const descText = this.isStaffMode
      ? "تسجيل الدخول الموحد للأساتذة والمعلمين والمشرفين لإدارة الكورسات والحصص ولوحة التحكم"
      : this.isRegisterMode
        ? "انضم الآن إلى أكاديمية انطلق التعليمية وابدأ رحلة التفوق"
        : "مرحباً بك يا بطل! أدخل بريدك الإلكتروني وكلمة المرور لمتابعة دروسك وحصصك";

    this.container.innerHTML = `
      <div class="auth-page-wrapper">
        <!-- Ambient decorative glow lights -->
        <div class="auth-ambient-glow auth-ambient-glow-1"></div>
        <div class="auth-ambient-glow auth-ambient-glow-2"></div>

        <div class="auth-modern-card">
          
          <!-- RIGHT SECTION: Logo & Brand Showcase (RTL First) -->
          <div class="auth-showcase-panel">
            <div class="auth-showcase-header">
              <a href="#landing" style="text-decoration:none;">
                <div class="auth-logo-wrapper">
                  <img src="assets/logo.png" alt="أكاديمية انطلق" class="auth-logo-img">
                </div>
              </a>
              <h2 class="auth-showcase-title">أكاديمية انطلق التعليمية</h2>
              <p class="auth-showcase-subtitle">
                ${this.isStaffMode 
                  ? "البوابة الموحدة للكادر التعليمي والإداري لإدارة المحتوى، الجلسات التفاعلية، والتقارير الأكاديمية."
                  : "بوابتك الأولى نحو التفوق والتميز الأكاديمي مع نخبة من أفضل الأساتذة في بيئة تعليمية تفاعلية حديثة."}
              </p>
            </div>

            <!-- Feature Bullet Cards -->
            <div class="auth-showcase-features">
              <div class="auth-feature-item">
                <div class="auth-feature-icon">
                  <i data-lucide="sparkles" style="width:20px; height:20px;"></i>
                </div>
                <div class="auth-feature-text">
                  <h4>${this.isStaffMode ? "إدارة الكورسات والمحتوى" : "شروحات ومراجعات مكثفة"}</h4>
                  <p>${this.isStaffMode ? "رفع الحصص، تنظيم بنوك الأسئلة، ومتابعة تسليمات الواجبات." : "دورات متكاملة تغطي كافة المناهج بأسلوب تدريس مبتكر ومبسط."}</p>
                </div>
              </div>

              <div class="auth-feature-item">
                <div class="auth-feature-icon" style="background: linear-gradient(135deg, #a855f7, #6366f1);">
                  <i data-lucide="video" style="width:20px; height:20px;"></i>
                </div>
                <div class="auth-feature-text">
                  <h4>${this.isStaffMode ? "البث المباشر والحصص الخاصة" : "بث مباشر وفصول تفاعلية"}</h4>
                  <p>${this.isStaffMode ? "إطلاق الغرف الافتراضية والسبورة الذكية وجدولة المواعيد المتاحة." : "تفاعل لحظي مع الأساتذة مع حل التمارين والرد الفوري على الأسئلة."}</p>
                </div>
              </div>

              <div class="auth-feature-item">
                <div class="auth-feature-icon" style="background: linear-gradient(135deg, #10b981, #06b6d4);">
                  <i data-lucide="award" style="width:20px; height:20px;"></i>
                </div>
                <div class="auth-feature-text">
                  <h4>${this.isStaffMode ? "إحصائيات وتقارير تفصيلية" : "تقارير أداء ومتابعة دورية"}</h4>
                  <p>${this.isStaffMode ? "متابعة دقيقة للأرباح والاشتراكات ومعدلات حضور الطلاب." : "اختبارات ذكية وتقارير فورية للدرجات مع إشعارات مباشرة لولي الأمر."}</p>
                </div>
              </div>
            </div>

            <!-- Trust Badge Footer -->
            <div class="auth-showcase-footer">
              <div class="auth-trust-badge">
                <i data-lucide="${this.isStaffMode ? 'shield-check' : 'check-circle-2'}" style="width:16px; height:16px;"></i>
                <span>${this.isStaffMode ? "بوابة الكادر الإداري والأكاديمي المعتمدة" : "منصة تعليمية معتمدة وموثوقة"}</span>
              </div>
              <span style="font-weight:600;">© 2026 Entlq Platform</span>
            </div>
          </div>

          <!-- LEFT SECTION: Modern Auth Form Area -->
          <div class="auth-form-panel">
            
            <div style="margin-bottom: 22px;">
              <h2 id="auth-header-title" style="font-size: 1.55rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
                ${titleText}
              </h2>
              <p id="auth-header-desc" style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
                ${descText}
              </p>
            </div>

            <!-- Navigation Switcher Tabs -->
            ${this.isStaffMode ? `
              <div class="auth-tabs-nav" style="grid-template-columns: 1fr;">
                <button class="auth-tab-btn active" style="cursor:default;">
                  <i data-lucide="shield-check" style="width:16px; height:16px; color:#10b981;"></i>
                  <span>بوابة المعلمين والإدارة</span>
                </button>
              </div>
            ` : `
              <div class="auth-tabs-nav">
                <button id="tab-login" class="auth-tab-btn ${!this.isRegisterMode ? 'active' : ''}">
                  <i data-lucide="log-in" style="width:16px; height:16px;"></i>
                  <span>دخول الطلاب</span>
                </button>
                <button id="tab-signup" class="auth-tab-btn ${this.isRegisterMode ? 'active' : ''}">
                  <i data-lucide="user-plus" style="width:16px; height:16px;"></i>
                  <span>حساب طالب جديد</span>
                </button>
              </div>
            `}

            <!-- Form Container -->
            <div id="auth-form-card">
              ${this.getFormHTML()}
            </div>

            ${this.isStaffMode ? `
              <!-- Quick Switcher back to Student Portal on Staff page only -->
              <div style="margin-top: 18px; padding: 11px 16px; background: rgba(99,102,241,0.05); border: 1px dashed rgba(99,102,241,0.22); border-radius: 12px; text-align: center; font-size: 0.86rem;">
                <span style="color:var(--text-muted);">هل أنت طالب بالمنصة؟</span>
                <a href="#login" style="color:var(--primary); font-weight:800; text-decoration:none; margin-inline-start:4px;">
                  الانتقال لبوابة تسجيل دخول الطلاب 👨‍🎓 ↗
                </a>
              </div>

              <!-- Staff Demo Accounts Box -->
              <div class="auth-demo-box" style="margin-top:16px;">
                <div class="auth-demo-title">
                  <i data-lucide="shield-check" style="width:15px; height:15px; color:var(--primary);"></i>
                  <span>حسابات تجريبية للدخول السريع (كادر المنصة):</span>
                </div>
                <div class="auth-demo-grid">
                  <button class="auth-demo-btn" id="fill-teacher-btn" title="حساب معلم دورات وبث مباشر">
                    <span>👨‍🏫 معلم دورات</span>
                  </button>
                  <button class="auth-demo-btn" id="fill-session-teacher-btn" title="حساب معلم حصص خاصة">
                    <span>⏱️ معلم حصص</span>
                  </button>
                  <button class="auth-demo-btn" id="fill-admin-btn" title="حساب مشرف لوحة التحكم">
                    <span>🛡️ مشرف أدمن</span>
                  </button>
                </div>
              </div>
            ` : `
              <!-- Student Demo Account Box -->
              <div class="auth-demo-box" style="margin-top:16px;">
                <div class="auth-demo-title">
                  <i data-lucide="key-round" style="width:15px; height:15px; color:var(--primary);"></i>
                  <span>تجربة سريعة بحساب طالب جاهز:</span>
                </div>
                <div class="auth-demo-grid" style="grid-template-columns: 1fr;">
                  <button class="auth-demo-btn" id="fill-student-btn" title="تسجيل الدخول بحساب طالب تجريبي">
                    <span>👨‍🎓 تجربة بحساب طالب (student@bakalorya.com)</span>
                  </button>
                </div>
              </div>
            `}

          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
  }

  getFormHTML() {
    if (this.isRegisterMode) {
      return `
        <form id="auth-submit-form" style="display:flex; flex-direction:column; gap: 14px;">
          
          <div class="form-group" style="margin:0;">
            <label for="reg-name" style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${t("form.fullName") || "الاسم الكامل"}</label>
            <div class="auth-input-wrapper">
              <input type="text" id="reg-name" class="auth-input-field" placeholder="${t("form.fullNamePlaceholder") || "أدخل اسمك بالكامل"}" required>
              <i data-lucide="user" class="auth-input-icon"></i>
            </div>
          </div>

          <div class="form-group" style="margin:0;">
            <label for="reg-email" style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${t("form.email") || "البريد الإلكتروني"}</label>
            <div class="auth-input-wrapper">
              <input type="email" id="reg-email" class="auth-input-field" placeholder="${t("form.emailPlaceholder") || "example@domain.com"}" required>
              <i data-lucide="mail" class="auth-input-icon"></i>
            </div>
          </div>

          <div class="form-group" style="margin:0;">
            <label for="reg-password" style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${t("form.password") || "كلمة المرور"}</label>
            <div class="auth-input-wrapper">
              <input type="${this.showPassword ? 'text' : 'password'}" id="reg-password" class="auth-input-field" placeholder="${t("form.passwordPlaceholder") || "••••••••"}" required>
              <i data-lucide="lock" class="auth-input-icon"></i>
              <button type="button" class="auth-password-toggle" id="toggle-password-btn" title="إظهار/إخفاء كلمة المرور">
                <i data-lucide="${this.showPassword ? 'eye-off' : 'eye'}" style="width:16px; height:16px;"></i>
              </button>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-group" style="margin:0;">
              <label for="reg-phone" style="font-weight:700; font-size:0.82rem; color:var(--text-main);">هاتف الطالب (واتساب)</label>
              ${renderPhoneInputGroup({ selectId: "reg-phone-code", inputId: "reg-phone", defaultCode: "+20", placeholder: "01012345678" })}
            </div>
            <div class="form-group" style="margin:0;">
              <label for="reg-parent-phone" style="font-weight:700; font-size:0.82rem; color:var(--text-main);">
                هاتف ولي الأمر <span style="color:var(--error);">*</span>
              </label>
              ${renderPhoneInputGroup({ selectId: "reg-parent-phone-code", inputId: "reg-parent-phone", defaultCode: "+20", placeholder: "01012345678", required: true })}
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-group" style="margin:0;">
              <label for="reg-location" style="font-weight:700; font-size:0.82rem; color:var(--text-main);">المدينة / المحافظة</label>
              <input type="text" id="reg-location" class="form-input" style="padding:11px 14px; border-radius:12px; font-size:0.88rem;" placeholder="مثال: القاهرة، الجيزة..." required>
            </div>
            <div class="form-group" style="margin:0;">
              <label for="reg-education" style="font-weight:700; font-size:0.82rem; color:var(--text-main);">المستوى الدراسي</label>
              ${renderEducationSelectHTML({ id: "reg-education", selectedValue: "Entlq 3", style: "padding:11px 14px; border-radius:12px; font-size:0.88rem;" })}
            </div>
          </div>

          <button type="submit" class="btn-primary auth-btn-submit" id="auth-submit-btn">
            <span>${t("auth.register") || "إنشاء الحساب والتسجيل"}</span>
            <i data-lucide="arrow-left" style="width:18px; height:18px;"></i>
          </button>
        </form>
      `;
    } else {
      return `
        <form id="auth-submit-form" style="display:flex; flex-direction:column; gap: 18px;">
          
          <div class="form-group" style="margin:0;">
            <label for="login-email" style="font-weight:700; font-size:0.88rem; color:var(--text-main);">${t("form.email") || "البريد الإلكتروني"}</label>
            <div class="auth-input-wrapper">
              <input type="email" id="login-email" class="auth-input-field" placeholder="${t("form.emailPlaceholder") || "example@domain.com"}" required autocomplete="email">
              <i data-lucide="mail" class="auth-input-icon"></i>
            </div>
          </div>

          <div class="form-group" style="margin:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label for="login-password" style="font-weight:700; font-size:0.88rem; color:var(--text-main);">${t("form.password") || "كلمة المرور"}</label>
              <a href="javascript:void(0)" onclick="alert('يرجى التواصل مع الدعم الفني للمنصة لاستعادة كلمة المرور')" style="font-size:0.78rem; color:var(--primary); text-decoration:none; font-weight:600;">
                نسيت كلمة المرور؟
              </a>
            </div>
            <div class="auth-input-wrapper">
              <input type="${this.showPassword ? 'text' : 'password'}" id="login-password" class="auth-input-field" placeholder="${t("form.passwordLoginPlaceholder") || "••••••••"}" required autocomplete="current-password">
              <i data-lucide="lock" class="auth-input-icon"></i>
              <button type="button" class="auth-password-toggle" id="toggle-password-btn" title="إظهار/إخفاء كلمة المرور">
                <i data-lucide="${this.showPassword ? 'eye-off' : 'eye'}" style="width:16px; height:16px;"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-primary auth-btn-submit" id="auth-submit-btn">
            <span>${this.isStaffMode ? "دخول المعلمين والإدارة 🛡️" : "تسجيل دخول الطالب 🚀"}</span>
            <i data-lucide="arrow-left" style="width:18px; height:18px;"></i>
          </button>
        </form>
      `;
    }
  }

  bindEvents() {
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");

    if (tabLogin) {
      tabLogin.addEventListener("click", () => {
        if (this.isRegisterMode) {
          this.isRegisterMode = false;
          window.location.hash = "#login";
          this.render();
        }
      });
    }

    if (tabSignup) {
      tabSignup.addEventListener("click", () => {
        if (!this.isRegisterMode) {
          this.isRegisterMode = true;
          window.location.hash = "#signup";
          this.render();
        }
      });
    }

    // Password Toggle
    const togglePasswordBtn = document.getElementById("toggle-password-btn");
    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener("click", () => {
        this.showPassword = !this.showPassword;
        const passInput = document.getElementById(this.isRegisterMode ? "reg-password" : "login-password");
        if (passInput) {
          passInput.type = this.showPassword ? "text" : "password";
          togglePasswordBtn.innerHTML = `<i data-lucide="${this.showPassword ? 'eye-off' : 'eye'}" style="width:16px; height:16px;"></i>`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    // Quick demo buttons
    document.getElementById("fill-teacher-btn")?.addEventListener("click", async () => {
      window.location.hash = "#staff-login";
      this.isStaffMode = true;
      this.isRegisterMode = false;
      await this.render();
      const email = document.getElementById("login-email");
      const pass = document.getElementById("login-password");
      if (email && pass) {
        email.value = "teacher1@bakalorya.com";
        pass.value = "teacher123";
      }
    });

    document.getElementById("fill-session-teacher-btn")?.addEventListener("click", async () => {
      window.location.hash = "#staff-login";
      this.isStaffMode = true;
      this.isRegisterMode = false;
      await this.render();
      const email = document.getElementById("login-email");
      const pass = document.getElementById("login-password");
      if (email && pass) {
        email.value = "sessionteacher@bakalorya.com";
        pass.value = "teacher123";
      }
    });

    document.getElementById("fill-student-btn")?.addEventListener("click", async () => {
      window.location.hash = "#login";
      this.isStaffMode = false;
      this.isRegisterMode = false;
      await this.render();
      const email = document.getElementById("login-email");
      const pass = document.getElementById("login-password");
      if (email && pass) {
        email.value = "student@bakalorya.com";
        pass.value = "password123";
      }
    });

    document.getElementById("fill-admin-btn")?.addEventListener("click", async () => {
      window.location.hash = "#staff-login";
      this.isStaffMode = true;
      this.isRegisterMode = false;
      await this.render();
      const email = document.getElementById("login-email");
      const pass = document.getElementById("login-password");
      if (email && pass) {
        email.value = "admin@bakalorya.com";
        pass.value = "admin123";
      }
    });

    // Submit handler
    document.getElementById("auth-submit-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("auth-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.innerHTML = `<span>جاري المعالجة...</span> <div class="spinner" style="width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>`;
      }

      if (this.isRegisterMode) {
        const name = document.getElementById("reg-name").value;
        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;
        const phoneCode = document.getElementById("reg-phone-code")?.value || "+20";
        const phoneNumber = document.getElementById("reg-phone")?.value || "";
        const phone = phoneNumber ? `${phoneCode} ${phoneNumber}`.trim() : "";

        const parentPhoneCode = document.getElementById("reg-parent-phone-code")?.value || "+20";
        const parentPhoneNumber = document.getElementById("reg-parent-phone")?.value || "";
        const parentPhone = `${parentPhoneCode} ${parentPhoneNumber}`.trim();

        const location = document.getElementById("reg-location").value;
        const education = document.getElementById("reg-education").value;
        try {
          const data = await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password, phone, parentPhone, location, education, role: "student" })
          });
          if (data && data.token && data.user) {
            setAuth(data.token, data.user);
          }
        } catch (err) {
          console.error(err);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            submitBtn.innerHTML = `<span>${t("auth.register") || "إنشاء الحساب والتسجيل"}</span> <i data-lucide="arrow-left" style="width:18px; height:18px;"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        }
      } else {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const loginEndpoint = this.isStaffMode ? "/auth/staff/login" : "/auth/student/login";

        try {
          const data = await apiFetch(loginEndpoint, {
            method: "POST",
            body: JSON.stringify({ email, password })
          });
          if (data && data.token && data.user) {
            setAuth(data.token, data.user);
          }
        } catch (err) {
          console.error(err);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            submitBtn.innerHTML = `<span>${this.isStaffMode ? "دخول المعلمين والإدارة 🛡️" : "تسجيل دخول الطالب 🚀"}</span> <i data-lucide="arrow-left" style="width:18px; height:18px;"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        }
      }
    });
  }

  onDestroy() { }
}
