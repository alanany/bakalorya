import { apiFetch, setAuth, state, t, renderPhoneInputGroup, renderEducationSelectHTML } from "../app.js";

export default class AuthView {
  constructor(container, mode) {
    this.container = container;
    // mode can be 'signup' or 'login'
    this.isRegisterMode = mode === "signup" || window.location.hash.includes("signup");
  }

  async render() {
    if (state.user) {
      const targetHash = state.user.role === "admin" ? "#admin-dashboard" : state.user.role === "teacher" ? "#teacher-portal" : "#student-dashboard";
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      return;
    }

    this.container.innerHTML = `
      <div style="min-height: 85vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; background: radial-gradient(circle at top, rgba(99, 102, 241, 0.1) 0%, transparent 70%);">
        
        <div class="glass-card" style="width: 100%; max-width: 480px; padding: 40px; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); border: 1px solid var(--border-focus); position: relative;">
          
          <!-- Top Brand Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="#landing" style="display: inline-flex; align-items: center; gap: 8px; font-size: 1.5rem; font-weight: 800; color: var(--text-main); text-decoration: none; margin-bottom: 8px;">
              <span class="text-gradient">Bakalorya</span> 🎓
            </a>
            <h2 id="auth-header-title" style="font-size: 1.4rem; font-weight: 700; color: var(--text-main);">
              ${this.isRegisterMode ? (t("auth.joinStudent") || "إنشاء حساب جديد") : (t("auth.signIn") || "تسجيل الدخول")}
            </h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
              ${this.isRegisterMode ? "انضم إلى منصة بكالوريا التعليمية كطالب أو معلم" : "مرحباً بك مجدداً، أدخل بياناتك للمتابعة"}
            </p>
          </div>

          <!-- Tabs Toggle -->
          <div style="display: flex; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 50px; padding: 4px; margin-bottom: 28px;">
            <button id="tab-login" style="flex: 1; padding: 10px; border: none; border-radius: 50px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; ${!this.isRegisterMode ? 'background: var(--primary); color: #fff; box-shadow: 0 2px 8px var(--primary-glow);' : 'background: transparent; color: var(--text-muted);'}">
              ${t("auth.signIn") || "تسجيل الدخول"}
            </button>
            <button id="tab-signup" style="flex: 1; padding: 10px; border: none; border-radius: 50px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; ${this.isRegisterMode ? 'background: var(--primary); color: #fff; box-shadow: 0 2px 8px var(--primary-glow);' : 'background: transparent; color: var(--text-muted);'}">
              ${t("auth.register") || "حساب جديد"}
            </button>
          </div>

          <!-- Dynamic Form Container -->
          <div id="auth-form-card">
            ${this.getFormHTML()}
          </div>

          <!-- Quick Demo Buttons -->
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-size: 0.85rem; color: var(--primary); text-align: center; margin-bottom: 12px;">
              🔑 بيانات الدخول للتجربة للمعلمين والطلاب:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn-secondary" id="fill-teacher-btn" style="padding: 8px; font-size: 0.75rem; justify-content: center; border-color: var(--primary); color: var(--primary);">
                👨‍🏫 معلم دورات وجلسات
              </button>
              <button class="btn-secondary" id="fill-session-teacher-btn" style="padding: 8px; font-size: 0.75rem; justify-content: center; border-color: #a855f7; color: #a855f7;">
                ⏱️ معلم حصص خاصة
              </button>
              <button class="btn-secondary" id="fill-student-btn" style="padding: 8px; font-size: 0.75rem; justify-content: center;">
                👨‍🎓 حساب طالب
              </button>
              <button class="btn-secondary" id="fill-admin-btn" style="padding: 8px; font-size: 0.75rem; justify-content: center;">
                🛡️ مشرف أدمن
              </button>
            </div>
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
        <form id="auth-submit-form" style="display:flex; flex-direction:column; gap: 16px;">
          <div class="form-group" style="margin:0;">
            <label for="reg-name" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">${t("form.fullName") || "الاسم الكامل"}</label>
            <input type="text" id="reg-name" class="form-input" placeholder="${t("form.fullNamePlaceholder") || "أدخل اسمك الكامل"}" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label for="reg-email" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">${t("form.email") || "البريد الإلكتروني"}</label>
            <input type="email" id="reg-email" class="form-input" placeholder="${t("form.emailPlaceholder") || "example@domain.com"}" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label for="reg-password" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">${t("form.password") || "كلمة المرور"}</label>
            <input type="password" id="reg-password" class="form-input" placeholder="${t("form.passwordPlaceholder") || "••••••••"}" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label for="reg-phone" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">رقم هاتف الطالب والواتساب (Student Phone)</label>
            ${renderPhoneInputGroup({ selectId: "reg-phone-code", inputId: "reg-phone", defaultCode: "+20", placeholder: "01012345678" })}
          </div>
          <div class="form-group" style="margin:0;">
            <label for="reg-parent-phone" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">
              رقم هاتف ولي الأمر (Parent Phone) <span style="color:var(--error);">*</span>
            </label>
            ${renderPhoneInputGroup({ selectId: "reg-parent-phone-code", inputId: "reg-parent-phone", defaultCode: "+20", placeholder: "01012345678", required: true })}
          </div>
          <div class="form-group" style="margin:0;">
            <label for="reg-location" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">الولاية / المدينة (Location)</label>
            <input type="text" id="reg-location" class="form-input" placeholder="مثال: القاهرة، الإسكندرية، وهران..." required>
          </div>
          <div class="form-group" style="margin:0;">
            <label for="reg-education" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">المستوى الدراسي (Education)</label>
            ${renderEducationSelectHTML({ id: "reg-education", selectedValue: "Bakalorya 3" })}
          </div>
          <button type="submit" class="btn-primary" style="margin-top: 8px; width:100%; justify-content:center; padding: 14px; font-size: 1rem; border-radius: 50px;">
            ${t("auth.register") || "إنشاء الحساب"}
          </button>
        </form>
      `;
    } else {
      return `
        <form id="auth-submit-form" style="display:flex; flex-direction:column; gap: 16px;">
          <div class="form-group" style="margin:0;">
            <label for="login-email" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">${t("form.email") || "البريد الإلكتروني"}</label>
            <input type="email" id="login-email" class="form-input" placeholder="${t("form.emailPlaceholder") || "example@domain.com"}" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label for="login-password" style="font-weight:600; font-size:0.85rem; margin-bottom:6px; display:block;">${t("form.password") || "كلمة المرور"}</label>
            <input type="password" id="login-password" class="form-input" placeholder="${t("form.passwordLoginPlaceholder") || "••••••••"}" required>
          </div>
          <button type="submit" class="btn-primary" style="margin-top: 8px; width:100%; justify-content:center; padding: 14px; font-size: 1rem; border-radius: 50px;">
            ${t("auth.login") || "تسجيل الدخول"}
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

    // Quick demo buttons
    document.getElementById("fill-teacher-btn")?.addEventListener("click", async () => {
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
      this.isRegisterMode = false;
      await this.render();
      const email = document.getElementById("login-email");
      const pass = document.getElementById("login-password");
      if (email && pass) {
        email.value = "admin@bakalorya.com";
        pass.value = "admin123";
      }
    });

    document.getElementById("auth-submit-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
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
        }
      } else {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        try {
          const data = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
          });
          if (data && data.token && data.user) {
            setAuth(data.token, data.user);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  onDestroy() {}
}
