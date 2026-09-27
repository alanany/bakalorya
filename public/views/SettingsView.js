import { apiFetch, state, showToast, t, switchLanguage, renderPhoneInputGroup, renderEducationSelectHTML } from "../app.js";

export default class SettingsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    try {
      if (!state.user) return;

      this.container.innerHTML = `
        <div style="max-width:800px; margin:0 auto; padding:40px 24px;">
          <h2 class="dashboard-section-title" style="font-size:2rem; margin-bottom:32px;">
            <i data-lucide="settings"></i> ${t("nav.settings")}
          </h2>

          <div class="glass-card" style="padding:32px; margin-bottom:24px;">
            <h3 style="font-size:1.2rem; margin-bottom:24px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="user"></i> User Profile
            </h3>
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:20px; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; gap:20px;">
                <div style="position:relative; width:84px; height:84px; flex-shrink:0;">
                  <img id="settings-avatar-img" src="${(state.user.avatar && !state.user.avatar.includes('dicebear.com')) ? state.user.avatar : 'assets/logo.png'}" onerror="this.src='assets/logo.png'" style="width:84px; height:84px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(79,70,229,0.25);">
                  <label for="settings-avatar-file-input" style="position:absolute; bottom:0; right:0; width:28px; height:28px; background:var(--primary); color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.3); border:2px solid var(--bg-card); transition:transform 0.15s;" title="رفع صورة جديدة">
                    <i data-lucide="camera" style="width:14px;height:14px;"></i>
                  </label>
                  <input type="file" id="settings-avatar-file-input" accept="image/*" style="display:none;">
                </div>
                <div>
                  <h4 style="font-size:1.3rem; margin:0 0 4px 0; font-weight:800;">${state.user.name}</h4>
                  <p style="color:var(--text-muted); margin:0 0 6px 0; font-size:0.88rem;">${state.user.email}</p>
                  <span class="session-tag" style="background:var(--primary-glow); color:var(--primary); font-weight:800;">${state.user.role.toUpperCase()}</span>
                </div>
              </div>

              <!-- Avatar Action Buttons -->
              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <label for="settings-avatar-file-input" class="btn-primary" style="padding:9px 18px; font-size:0.85rem; font-weight:800; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="upload" style="width:15px;height:15px;"></i> تغيير الصورة الشخصية 📸
                </label>
                <button type="button" id="settings-reset-avatar-btn" class="btn-secondary" style="padding:9px 16px; font-size:0.85rem; font-weight:700; border-radius:12px; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> استعادة شعار المنصة الافتراضي 🛡️
                </button>
              </div>
            </div>

            ${state.user.role === 'student' ? `
              <form id="settings-student-profile-form" style="display:flex; flex-direction:column; gap:20px;">
                <div style="background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.04)); border:1.5px solid rgba(99,102,241,0.25); border-radius:18px; padding:20px; display:flex; align-items:center; gap:12px;">
                  <div style="width:40px; height:40px; border-radius:12px; background:rgba(99,102,241,0.15); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i data-lucide="graduation-cap" style="width:20px; height:20px;"></i>
                  </div>
                  <div>
                    <h4 style="margin:0 0 2px 0; font-size:1rem; font-weight:800; color:var(--text-main);">المرحلة والبيانات الأكاديمية 🎓</h4>
                    <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">يمكنك تحديث صفك ومرحلتك الدراسية فورياً لتخصيص الكورسات والمجموعات المناسبة لك.</p>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                  <!-- Full Name (Read-Only) -->
                  <div class="form-group">
                    <label style="font-weight:700; font-size:0.85rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="user" style="width:14px;height:14px;color:var(--primary);"></i>
                      الاسم الكامل (معتمد)
                    </label>
                    <input type="text" class="form-input" value="${state.user.name || ''}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed;">
                  </div>

                  <!-- Email (Read-Only) -->
                  <div class="form-group">
                    <label style="font-weight:700; font-size:0.85rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                      <i data-lucide="mail" style="width:14px;height:14px;color:var(--primary);"></i>
                      البريد الإلكتروني (معتمد)
                    </label>
                    <input type="email" class="form-input" value="${state.user.email || ''}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed;">
                  </div>
                </div>

                <!-- Education Level (Editable) -->
                <div class="form-group">
                  <label style="font-weight:800; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px; color:var(--primary);">
                    <i data-lucide="book-open" style="width:16px;height:16px;"></i>
                    المرحلة والصف الدراسي المقيد به الطالب *
                  </label>
                  ${renderEducationSelectHTML({
        id: "settings-student-education",
        selectedValue: state.user.education || "Grade 6 (Primary)",
        required: true,
        style: "padding:12px 14px; font-size:0.9rem; font-weight:700; border-radius:12px; border:1.5px solid var(--primary); background:var(--bg-card); color:var(--text-main);"
      })}
                  <small style="color:var(--text-muted); display:block; margin-top:4px;">* اختيارك للمرحلة يحدد الكورسات والمجموعات الدراسية وحصص البث المخصصة لصفك بدقة.</small>
                </div>

                <!-- Phone Numbers Notice -->
                <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); color:#d97706; padding:12px 16px; border-radius:14px; font-size:0.84rem; font-weight:700; display:flex; align-items:center; gap:10px;">
                  <i data-lucide="lock" style="width:18px;height:18px;flex-shrink:0;"></i>
                  <span>أرقام الهواتف معتمدة ومقفلة — لتعديل أي رقم هاتف، يتم إرسال طلب رسمي للإدارة لمراجعته واعتماده.</span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                  <!-- Student Phone (Locked) -->
                  <div class="form-group">
                    <label style="font-weight:700; font-size:0.85rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                      <span style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="smartphone" style="width:14px;height:14px;color:#10b981;"></i>
                        رقم هاتف الطالب (واتساب)
                      </span>
                      <span style="font-size:0.72rem; color:#10b981; font-weight:700; display:flex; align-items:center; gap:3px;">
                        <i data-lucide="lock" style="width:11px;height:11px;"></i> مقفل ومعتمد
                      </span>
                    </label>
                    <div style="display:flex; gap:8px;">
                      <input type="text" class="form-input" value="${state.user.phone || 'غير مسجل'}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed; direction:ltr; text-align:left; flex:1; font-weight:700;">
                      <button type="button" class="btn-secondary request-phone-modal-trigger" data-phone-type="student" style="padding:6px 12px; border-radius:10px; font-size:0.75rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; color:#10b981; border-color:rgba(16,185,129,0.3); background:rgba(16,185,129,0.06); cursor:pointer;" title="طلب تعديل رقم هاتف الطالب من الإدارة">
                        <i data-lucide="send" style="width:12px;height:12px;"></i> تعديل
                      </button>
                    </div>
                  </div>

                  <!-- Parent Phone (Locked) -->
                  <div class="form-group">
                    <label style="font-weight:700; font-size:0.85rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                      <span style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="phone-call" style="width:14px;height:14px;color:#f59e0b;"></i>
                        رقم هاتف ولي الأمر (للمتابعة والغياب)
                      </span>
                      <span style="font-size:0.72rem; color:#f59e0b; font-weight:700; display:flex; align-items:center; gap:3px;">
                        <i data-lucide="lock" style="width:11px;height:11px;"></i> مقفل ومعتمد
                      </span>
                    </label>
                    <div style="display:flex; gap:8px;">
                      <input type="text" class="form-input" value="${state.user.parentPhone || 'غير مسجل'}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed; direction:ltr; text-align:left; flex:1; font-weight:700;">
                      <button type="button" class="btn-secondary request-phone-modal-trigger" data-phone-type="parent" style="padding:6px 12px; border-radius:10px; font-size:0.75rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; color:#f59e0b; border-color:rgba(245,158,11,0.3); background:rgba(245,158,11,0.06); cursor:pointer;" title="طلب تعديل رقم ولي الأمر من الإدارة">
                        <i data-lucide="send" style="width:12px;height:12px;"></i> تعديل
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" id="settings-save-student-btn" class="btn-primary" style="margin-top:12px; padding:12px 24px; font-size:0.92rem; font-weight:800; border-radius:12px; justify-content:center; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="check" style="width:16px;height:16px;"></i> حفظ المرحلة الدراسية 🎓
                </button>
              </form>
            ` : `
            <form id="settings-profile-form">
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                <!-- Full Name -->
                <div class="form-group">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="user" style="width:15px;height:15px;color:var(--primary);"></i>
                    الاسم الكامل (Full Name) *
                  </label>
                  <input type="text" id="settings-name" class="form-input" value="${state.user.name}" required style="font-weight:700;">
                </div>

                <!-- Email (Read-Only) -->
                <div class="form-group">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="mail" style="width:15px;height:15px;color:var(--primary);"></i>
                    البريد الإلكتروني (Email Address)
                  </label>
                  <input type="email" class="form-input" value="${state.user.email || ''}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed;">
                </div>
              </div>

              <!-- Phone Number (Locked - Editable only via Admin Request) -->
              <div class="form-group" style="margin-top:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                  <label style="display:flex; align-items:center; gap:6px; font-weight:700; margin:0; font-size:0.88rem;">
                    <i data-lucide="phone" style="width:16px;height:16px;color:#10b981;"></i>
                    رقم الهاتف المعتمد (Phone Number)
                  </label>
                  <span style="font-size:0.75rem; color:#10b981; font-weight:800; background:rgba(16,185,129,0.1); padding:2px 10px; border-radius:10px; border:1px solid rgba(16,185,129,0.25); display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="lock" style="width:12px;height:12px;"></i> معتمد ومقفل
                  </span>
                </div>
                
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                  <input type="text" class="form-input" value="${state.user.phone || 'غير مسجل'}" disabled style="background:var(--bg-app); opacity:0.9; cursor:not-allowed; direction:ltr; text-align:left; flex:1; min-width:200px; font-weight:700;">
                  <button type="button" class="btn-secondary request-phone-modal-trigger" data-phone-type="self" style="padding:10px 18px; border-radius:12px; font-size:0.84rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; color:#10b981; border-color:rgba(16,185,129,0.35); background:rgba(16,185,129,0.06); cursor:pointer;">
                    <i data-lucide="send" style="width:15px;height:15px;"></i>
                    <span>طلب تعديل رقم الهاتف من الإدارة 📞</span>
                  </button>
                </div>
                <small style="color:var(--text-muted); display:block; margin-top:6px;">لحماية حسابك وتوثيق العمليات، لا يمكن تعديل رقم الهاتف مباشرة إلا بعد إرسال طلب لاعتماده من إدارة المنصة.</small>
              </div>

              <button type="submit" class="btn-primary" style="margin-top:24px; padding:12px 28px; font-weight:800; border-radius:12px; display:inline-flex; align-items:center; gap:8px;">
                <i data-lucide="check" style="width:16px;height:16px;"></i>
                <span>حفظ التغييرات / Save Changes</span>
              </button>
            </form>
            `}
          </div>

          <!-- Change Password Card (For Students, Teachers, and all platform users) -->
          <div class="glass-card" style="padding:32px; margin-bottom:24px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="shield-check" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.2rem; margin:0 0 2px 0; font-weight:800; color:var(--text-main);">
                  الأمان وتغيير كلمة المرور 🔒
                </h3>
                <p style="color:var(--text-muted); font-size:0.84rem; margin:0;">
                  تحديث كلمة المرور الخاصة بحسابك لحماية بياناتك الأكاديمية والوصول الآمن.
                </p>
              </div>
            </div>

            <form id="settings-change-password-form" style="display:flex; flex-direction:column; gap:16px; margin-top:20px;">
              <div class="form-group">
                <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="lock" style="width:14px;height:14px;color:var(--primary);"></i>
                  كلمة المرور الحالية (Current Password) *
                </label>
                <div style="position:relative;">
                  <input type="password" id="settings-current-password" class="form-input" required placeholder="أدخل كلمة المرور الحالية" style="padding-left:42px;">
                  <button type="button" class="btn-toggle-password" data-target="settings-current-password" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="إظهار / إخفاء">
                    <i data-lucide="eye" style="width:16px;height:16px;"></i>
                  </button>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
                <div class="form-group">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="key" style="width:14px;height:14px;color:#10b981;"></i>
                    كلمة المرور الجديدة (New Password) *
                  </label>
                  <div style="position:relative;">
                    <input type="password" id="settings-new-password" class="form-input" required minlength="6" placeholder="6 أحرف أو أرقام على الأقل" style="padding-left:42px;">
                    <button type="button" class="btn-toggle-password" data-target="settings-new-password" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="إظهار / إخفاء">
                      <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <i data-lucide="check-check" style="width:14px;height:14px;color:#10b981;"></i>
                    تأكيد كلمة المرور الجديدة (Confirm Password) *
                  </label>
                  <div style="position:relative;">
                    <input type="password" id="settings-confirm-password" class="form-input" required minlength="6" placeholder="أعد إدخال كلمة المرور" style="padding-left:42px;">
                    <button type="button" class="btn-toggle-password" data-target="settings-confirm-password" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;" title="إظهار / إخفاء">
                      <i data-lucide="eye" style="width:16px;height:16px;"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Password Requirements Note -->
              <div style="font-size:0.8rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                <i data-lucide="info" style="width:14px;height:14px;color:var(--primary);flex-shrink:0;"></i>
                <span>يجب أن تتكون كلمة المرور من 6 خانات على الأقل، ويُفضل استخدام حروف وأرقام لضمان قوة الأمان.</span>
              </div>

              <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                <button type="submit" id="settings-password-submit-btn" class="btn-primary" style="padding:10px 24px; font-weight:800; border-radius:12px; display:inline-flex; align-items:center; gap:8px;">
                  <i data-lucide="lock" style="width:16px;height:16px;"></i>
                  <span>تحديث كلمة المرور</span>
                </button>
              </div>
            </form>
          </div>

          <div class="glass-card" style="padding:32px;">
            <h3 style="font-size:1.2rem; margin-bottom:24px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="globe"></i> Preferences
            </h3>
            
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; border-bottom:1px solid var(--border-color); margin-bottom:16px;">
              <div>
                <div style="font-weight:600; margin-bottom:4px;">Language</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">Choose your preferred platform language</div>
              </div>
              <select id="settings-language" class="form-select" style="width:150px;">
                <option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option>
                <option value="ar" ${state.language === 'ar' ? 'selected' : ''}>العربية</option>
              </select>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:600; margin-bottom:4px;">Theme</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">Switch between dark and light mode</div>
              </div>
              <button class="btn-secondary" id="settings-theme-btn" style="width:150px; justify-content:center;">
                <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}"></i>
                ${state.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (err) {
      console.error("Settings error:", err);
    }
  }

  bindEvents() {
    // 1. Upload Avatar File Listener
    const avatarInput = document.getElementById("settings-avatar-file-input");
    avatarInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)", "error");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast("حجم الصورة يجب أن لا يتجاوز 5 ميغابايت", "error");
        return;
      }

      const formData = new FormData();
      formData.append("avatar", file);

      try {
        showToast("جاري رفع وتحديث صورتك الشخصية...", "info");
        const token = localStorage.getItem("token") || (state.token || "");
        const res = await fetch("/api/users/avatar", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.avatar) {
          if (state.user) {
            state.user.avatar = data.avatar;
            localStorage.setItem("user", JSON.stringify(state.user));
          }
          const img = document.getElementById("settings-avatar-img");
          if (img) img.src = data.avatar;

          // Update header / navbar avatar
          document.querySelectorAll(".navbar-avatar, #user-menu-avatar, .user-avatar-img").forEach(el => {
            el.src = data.avatar;
          });

          showToast("تم تحديث صورتك الشخصية بنجاح! 📸", "success");
        } else {
          showToast(data.error || "فشل رفع الصورة", "error");
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
        showToast("حدث خطأ أثناء رفع الصورة", "error");
      }
    });

    // 2. Reset to Platform Logo Avatar
    document.getElementById("settings-reset-avatar-btn")?.addEventListener("click", async () => {
      const defaultLogoUrl = "assets/logo.png";

      try {
        showToast("جاري استعادة الشعار الافتراضي للمنصة...", "info");
        const updatedUser = await apiFetch("/users/me", {
          method: "PATCH",
          body: JSON.stringify({ avatar: defaultLogoUrl })
        });

        if (updatedUser) {
          if (state.user) {
            state.user.avatar = defaultLogoUrl;
            localStorage.setItem("user", JSON.stringify(state.user));
          }
          const img = document.getElementById("settings-avatar-img");
          if (img) img.src = defaultLogoUrl;

          document.querySelectorAll(".navbar-avatar, #user-menu-avatar, .user-avatar-img, .user-avatar, .sidebar-avatar-img").forEach(el => {
            el.src = defaultLogoUrl;
          });

          showToast("تم اعتماد شعار المنصة كصورتك الشخصية بنجاح! 🛡️", "success");
        }
      } catch (err) {
        console.error("Reset avatar error:", err);
        showToast("فشل استعادة الشعار الافتراضي", "error");
      }
    });

    // 3. Student profile form
    if (state.user?.role === "student") {
      document.getElementById("settings-student-profile-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById("settings-save-student-btn");
        const education = document.getElementById("settings-student-education")?.value;

        if (!education) {
          showToast("يرجى اختيار المرحلة الدراسية.", "error");
          return;
        }

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:15px;height:15px;"></i> جاري الحفظ...`;
          if (window.lucide) window.lucide.createIcons();
        }

        try {
          const updatedUser = await apiFetch(`/users/me`, {
            method: "PATCH",
            body: JSON.stringify({ education })
          });

          if (updatedUser && updatedUser.id) {
            state.user = { ...state.user, ...updatedUser };
            try {
              localStorage.setItem("user", JSON.stringify(state.user));
            } catch (_) { }
            showToast("تم حفظ المرحلة الدراسية بنجاح! 🎓", "success");
            this.render();
          }
        } catch (err) {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i data-lucide="check" style="width:16px;height:16px;"></i> حفظ المرحلة الدراسية 🎓`;
            if (window.lucide) window.lucide.createIcons();
          }
          showToast(err.message || "فشل تحديث البيانات.", "error");
        }
      });
    }

    // 4. Non-student profile form
    if (state.user?.role !== "student") {
      document.getElementById("settings-profile-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newName = document.getElementById("settings-name")?.value.trim();
        if (!newName) {
          showToast("الاسم الكامل مطلوب.", "error");
          return;
        }

        try {
          const updatedUser = await apiFetch(`/users/me`, {
            method: "PATCH",
            body: JSON.stringify({ name: newName })
          });

          if (updatedUser && updatedUser.id) {
            state.user = { ...state.user, ...updatedUser };
            try {
              localStorage.setItem("user", JSON.stringify(state.user));
            } catch (_) {}
            showToast("تم حفظ إعدادات الملف الشخصي بنجاح! ✅", "success");
            this.render();
          }
        } catch (err) {
          console.error(err);
          showToast(err.message || "حدث خطأ أثناء حفظ التغييرات.", "error");
        }
      });
    }

    // 4b. Phone change request modal trigger (all roles: student, parent, teacher, admin)
    this.container.querySelectorAll(".request-phone-modal-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const phoneType = btn.getAttribute("data-phone-type") || "self";
        this.openPhoneChangeModal(phoneType);
      });
    });

    document.getElementById("settings-language")?.addEventListener("change", (e) => {
      switchLanguage(e.target.value);
    });

    document.getElementById("settings-theme-btn")?.addEventListener("click", () => {
      document.getElementById("theme-toggle").click(); // Trigger global theme toggle
      this.render(); // Re-render to update button text/icon
    });

    // 5. Password visibility toggles
    this.container.querySelectorAll(".btn-toggle-password").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" style="width:16px;height:16px;"></i>`;
        if (window.lucide) window.lucide.createIcons();
      });
    });

    // 6. Change Password Form Handler
    const changePasswordForm = document.getElementById("settings-change-password-form");
    changePasswordForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById("settings-current-password")?.value || "";
      const newPassword = document.getElementById("settings-new-password")?.value || "";
      const confirmPassword = document.getElementById("settings-confirm-password")?.value || "";
      const submitBtn = document.getElementById("settings-password-submit-btn");

      if (!currentPassword || !newPassword) {
        showToast("يرجى إدخال كلمة المرور الحالية والجديدة.", "error");
        return;
      }

      if (newPassword.length < 6) {
        showToast("كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف أو أرقام.", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast("كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين.", "error");
        return;
      }

      if (currentPassword === newPassword) {
        showToast("كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.", "error");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:16px;height:16px;"></i> جاري التحديث...`;
        if (window.lucide) window.lucide.createIcons();
      }

      try {
        const res = await apiFetch("/users/change-password", {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword
          })
        });

        showToast(res.message || "تم تغيير كلمة المرور بنجاح! 🔒", "success");
        changePasswordForm.reset();
      } catch (err) {
        console.error("Change password failed:", err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="lock" style="width:16px;height:16px;"></i> <span>تحديث كلمة المرور</span>`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  }

  openPhoneChangeModal(phoneType = "self") {
    const isParentPhone = phoneType === "parent";
    const currentPhone = isParentPhone ? (state.user.parentPhone || "غير مسجل") : (state.user.phone || "غير مسجل");
    const label = isParentPhone ? "رقم هاتف ولي الأمر" : "رقم هاتفك المعتمد";
    const waBase = state.platformSettings?.whatsappUrl || "https://wa.me/213555123456";

    const modalId = "settings-phone-change-modal";
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalHtml = `
      <div id="${modalId}" style="position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div class="glass-card" style="width:100%;max-width:480px;background:var(--bg-card);border-radius:24px;border:1.5px solid rgba(99,102,241,0.3);box-shadow:0 20px 50px rgba(0,0,0,0.4);padding:26px;box-sizing:border-box;">
          
          <!-- Modal Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:44px;height:44px;border-radius:14px;background:rgba(16,185,129,0.12);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:1.3rem;">
                📱
              </div>
              <div>
                <h3 style="margin:0 0 3px 0;font-size:1.15rem;font-weight:900;color:var(--text-main);">طلب تعديل رقم الهاتف</h3>
                <p style="margin:0;font-size:0.8rem;color:var(--text-muted);">إرسال طلب رسمي للإدارة لمراجعة وتحديث ${label}</p>
              </div>
            </div>
            <button type="button" id="close-phone-modal-btn" style="background:none;border:none;color:var(--text-muted);font-size:1.4rem;cursor:pointer;padding:4px;line-height:1;">&times;</button>
          </div>

          <!-- Current Phone Info -->
          <div style="background:var(--bg-app);border:1px solid var(--border-color);border-radius:14px;padding:12px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.82rem;font-weight:700;color:var(--text-muted);">الرقم الحالي المسجل:</span>
            <span style="font-size:0.88rem;font-weight:900;color:var(--text-main);direction:ltr;">${currentPhone}</span>
          </div>

          <!-- Request Form -->
          <form id="phone-change-request-form" style="display:flex;flex-direction:column;gap:14px;">
            <div class="form-group">
              <label style="font-weight:800;font-size:0.85rem;margin-bottom:6px;display:flex;align-items:center;gap:6px;color:var(--text-main);">
                <i data-lucide="smartphone" style="width:15px;height:15px;color:#10b981;"></i>
                رقم الهاتف الجديد المطلوب اعتماده *
              </label>
              <input type="tel" id="request-new-phone-input" class="form-input" required placeholder="مثال: +213 555 123 456 أو 0555123456" style="direction:ltr;text-align:left;font-weight:700;padding:12px 14px;border-radius:12px;">
              <small style="color:var(--text-muted);display:block;margin-top:4px;">يرجى كتابة رقم الهاتف مع رمز الدولة للتأكد من ربط الواتساب بدقة.</small>
            </div>

            <div class="form-group">
              <label style="font-weight:700;font-size:0.85rem;margin-bottom:6px;display:flex;align-items:center;gap:6px;color:var(--text-main);">
                <i data-lucide="message-square" style="width:15px;height:15px;color:var(--primary);"></i>
                سبب التعديل أو ملاحظات للإدارة (اختياري)
              </label>
              <textarea id="request-phone-reason-input" class="form-input" rows="2" placeholder="مثال: قمت بتغيير شريحة الهاتف / الرقم القديم لم يعد يعمل..." style="font-size:0.85rem;border-radius:12px;resize:none;"></textarea>
            </div>

            <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap;">
              <button type="submit" id="submit-phone-request-btn" class="btn-primary" style="flex:1;min-width:160px;padding:12px 18px;border-radius:14px;font-size:0.88rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;cursor:pointer;">
                <i data-lucide="send" style="width:15px;height:15px;"></i>
                <span>إرسال الطلب للإدارة 🚀</span>
              </button>

              <a id="phone-change-wa-link" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="padding:12px 16px;border-radius:14px;font-size:0.82rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:6px;color:#10b981;border-color:rgba(16,185,129,0.3);text-decoration:none;" title="محادثة الإدارة مباشرة على واتساب">
                <i data-lucide="message-circle" style="width:16px;height:16px;"></i>
                <span>واتساب الإدارة</span>
              </a>
            </div>
          </form>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    if (window.lucide) window.lucide.createIcons();

    const modalEl = document.getElementById(modalId);
    const closeBtn = document.getElementById("close-phone-modal-btn");
    const form = document.getElementById("phone-change-request-form");
    const waLink = document.getElementById("phone-change-wa-link");
    const newPhoneInput = document.getElementById("request-new-phone-input");

    const closeModal = () => modalEl?.remove();
    closeBtn?.addEventListener("click", closeModal);
    modalEl?.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    // Update WhatsApp link live as user types
    const updateWaLink = () => {
      const p = newPhoneInput?.value.trim() || "";
      const defaultMsg = `السلام عليكم إدارة منصة انطلق، أنا المستخدم (${state.user.name} - الدور: ${state.user.role}). أرجو اعتماد تعديل ${label} إلى الرقم الجديد: ${p || '[الرقم الجديد]'}. شكراً لكم.`;
      if (waLink) {
        waLink.href = `${waBase}?text=${encodeURIComponent(defaultMsg)}`;
      }
    };
    newPhoneInput?.addEventListener("input", updateWaLink);
    updateWaLink();

    // Form submit
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPhone = newPhoneInput?.value.trim();
      const reason = document.getElementById("request-phone-reason-input")?.value.trim() || "";
      const submitBtn = document.getElementById("submit-phone-request-btn");

      if (!newPhone) {
        showToast("يرجى إدخال رقم الهاتف الجديد.", "error");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:16px;height:16px;"></i> جاري الإرسال...`;
        if (window.lucide) window.lucide.createIcons();
      }

      try {
        const res = await apiFetch("/users/request-phone-change", {
          method: "POST",
          body: JSON.stringify({ newPhone, phoneType, reason })
        });

        closeModal();
        showToast(res.message || "تم إرسال طلب تعديل رقم الهاتف إلى إدارة المنصة بنجاح! ✅", "success");
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="send" style="width:15px;height:15px;"></i> إرسال الطلب للإدارة 🚀`;
          if (window.lucide) window.lucide.createIcons();
        }
        showToast(err.message || "فشل إرسال الطلب، يرجى المحاولة لاحقاً.", "error");
      }
    });
  }

  onDestroy() { }
}
