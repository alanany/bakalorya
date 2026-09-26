import { apiFetch, setAuth, state, t, renderPhoneInputGroup, renderEducationSelectHTML } from "../app.js";

export default class AuthView {
  constructor(container, mode) {
    this.container = container;
    this.isStaffMode = window.location.hash.includes("staff-login") || window.location.hash.includes("teacher-login") || window.location.hash.includes("admin-login");
    this.isRegisterMode = !this.isStaffMode && (mode === "signup" || window.location.hash.includes("signup"));
    this.showPassword = false;
    this.isLoading = false;  // Guard: prevents multiple concurrent requests
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
        ? "البوابة الموحدة للكادر التعليمي والإداري لإدارة المحتوى، الحصص التفاعلية، والتقارير الأكاديمية."
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
              <h2 id="auth-header-title" class="auth-form-title">
                ${titleText}
              </h2>
              <p id="auth-header-desc" class="auth-form-desc">
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
            ` : ""}

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

          <div class="auth-form-row-2col">
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

          <div class="auth-form-row-2col">
            <div class="form-group" style="margin:0;">
              <label for="reg-location" style="font-weight:700; font-size:0.82rem; color:var(--text-main);">المدينة / المحافظة</label>
              <input type="text" id="reg-location" class="form-input" style="padding:11px 14px; border-radius:12px; font-size:0.88rem; width:100%; box-sizing:border-box;" placeholder="مثال: القاهرة، الجيزة..." required>
            </div>
            <div class="form-group" style="margin:0;">
              <label for="reg-education" style="font-weight:700; font-size:0.82rem; color:var(--text-main);">المستوى الدراسي</label>
              ${renderEducationSelectHTML({ id: "reg-education", selectedValue: "Entlq 3", style: "padding:11px 14px; border-radius:12px; font-size:0.88rem; width:100%; box-sizing:border-box;" })}
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


    // Submit handler
    document.getElementById("auth-submit-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      // ---- MULTI-SUBMIT GUARD ----
      if (this.isLoading) return;
      this.isLoading = true;

      const submitBtn = document.getElementById("auth-submit-btn");

      const setLoading = (loading) => {
        this.isLoading = loading;
        if (!submitBtn) return;
        if (loading) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = "0.75";
          submitBtn.style.cursor = "not-allowed";
          submitBtn.style.pointerEvents = "none";
          submitBtn.innerHTML = `
            <span>جاري المعالجة...</span>
            <div style="width:18px;height:18px;border:2.5px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.75s linear infinite;flex-shrink:0;"></div>
          `;
        } else {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
          submitBtn.style.cursor = "";
          submitBtn.style.pointerEvents = "";
          if (this.isRegisterMode) {
            submitBtn.innerHTML = `<span>${t("auth.register") || "إنشاء الحساب والتسجيل"}</span> <i data-lucide="arrow-left" style="width:18px; height:18px;"></i>`;
          } else {
            submitBtn.innerHTML = `<span>${this.isStaffMode ? "دخول المعلمين والإدارة 🛡️" : "تسجيل دخول الطالب 🚀"}</span> <i data-lucide="arrow-left" style="width:18px; height:18px;"></i>`;
          }
          if (window.lucide) window.lucide.createIcons();
        }
      };

      setLoading(true);

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
          if (data && data.pendingApproval) {
            setLoading(false);
            this.renderPendingApprovalNotice(data.message, name);
          } else if (data && data.token && data.user) {
            setAuth(data.token, data.user);
            // Navigation happens, no need to re-enable button
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error(err);
          setLoading(false);
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
            // Navigation happens, no need to re-enable button
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error(err);
          setLoading(false);
        }
      }
    });
  }

  renderPendingApprovalNotice(message, name) {
    const card = document.getElementById("auth-form-card");
    const titleEl = document.getElementById("auth-header-title");
    const descEl = document.getElementById("auth-header-desc");
    const tabsNav = this.container.querySelector(".auth-tabs-nav");

    if (titleEl) titleEl.textContent = "طلب الانضمام قيد المراجعة والاعتماد ⏳";
    if (descEl) descEl.textContent = "تم استلام بياناتك بنجاح وبانتظار موافقة الإدارة";
    if (tabsNav) tabsNav.style.display = "none";

    if (card) {
      card.innerHTML = `
        <div style="text-align:center; padding:24px 10px; display:flex; flex-direction:column; align-items:center; gap:16px;">
          <div style="width:76px; height:76px; border-radius:50%; background:linear-gradient(135deg, rgba(245,158,11,0.18), rgba(16,185,129,0.18)); color:#d97706; display:flex; align-items:center; justify-content:center; border:2px solid rgba(245,158,11,0.35); box-shadow:0 12px 28px rgba(245,158,11,0.25);">
            <i data-lucide="clock" style="width:40px; height:40px;"></i>
          </div>

          <div>
            <span class="badge" style="background:rgba(245,158,11,0.15); color:#d97706; font-size:0.8rem; font-weight:800; padding:4px 12px; border-radius:20px; display:inline-block; margin-bottom:10px;">
              ⏳ تم استلام بيانات التسجيل بنجاح
            </span>
            <h3 style="font-size:1.35rem; font-weight:900; color:var(--text-main); margin:0 0 10px 0;">
              أهلاً بك يا ${name || 'طالبنا العزيز'}!
            </h3>
            <p style="font-size:0.88rem; color:var(--text-muted); line-height:1.7; margin:0 auto; max-width:420px;">
              ${message || "تم إنشاء حسابك بنجاح! حسابك الآن <strong>قيد المراجعة والاعتماد من قبل إدارة الأكاديمية</strong> قبل تفعيل الدخول إلى لوحة التحكم."}
              <br>
              بمجرد موافقة الإدارة على طلبك، ستتمكن من تسجيل الدخول والوصول لكافة الحصص والدروس.
            </p>
          </div>

          <div style="background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.18); border-radius:14px; padding:14px 18px; font-size:0.82rem; color:var(--text-muted); text-align:start; width:100%; box-sizing:border-box; line-height:1.5;">
            💡 <strong>ملاحظة هامة:</strong> تتم مراجعة الحسابات الجديدة سريعاً من قبل الإدارة لضمان صحة البيانات وتجهيز الجدول الدراسي. عند اعتماد الحساب ستتمكن من الدخول فوراً.
          </div>

          <button type="button" id="go-to-login-after-pending" class="btn-primary" style="padding:12px 28px; font-size:0.92rem; font-weight:800; border-radius:14px; width:100%; cursor:pointer;">
            الانتقال لصفحة الدخول 🔑
          </button>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      document.getElementById("go-to-login-after-pending")?.addEventListener("click", () => {
        window.location.hash = "#login";
      });
    }
  }

  onDestroy() { }
}
