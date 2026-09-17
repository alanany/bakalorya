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
                  <img id="settings-avatar-img" src="${state.user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(state.user.name || 'Entlq')}" style="width:84px; height:84px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(79,70,229,0.25);">
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
                <button type="button" id="settings-random-avatar-btn" class="btn-secondary" style="padding:9px 16px; font-size:0.85rem; font-weight:700; border-radius:12px; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="shuffle" style="width:14px;height:14px;"></i> شخصية كرتونية 🎨
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
                  <span>أرقام الهواتف معتمدة ومقفلة — لتعديل رقم هاتف الطالب أو ولي الأمر، يرجى التواصل مع إدارة المنصة.</span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                  <!-- Student Phone (Locked) -->
                  <div class="form-group">
                    <label style="font-weight:700; font-size:0.85rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                      <span style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="smartphone" style="width:14px;height:14px;color:#10b981;"></i>
                        رقم هاتف الطالب (واتساب)
                      </span>
                      <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; display:flex; align-items:center; gap:3px;">
                        <i data-lucide="lock" style="width:11px;height:11px;"></i> مقفل
                      </span>
                    </label>
                    <input type="text" class="form-input" value="${state.user.phone || 'غير مسجل'}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed; direction:ltr; text-align:left;">
                  </div>

                  <!-- Parent Phone (Locked) -->
                  <div class="form-group">
                    <label style="font-weight:700; font-size:0.85rem; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                      <span style="display:flex; align-items:center; gap:6px;">
                        <i data-lucide="phone-call" style="width:14px;height:14px;color:#f59e0b;"></i>
                        رقم هاتف ولي الأمر (للمتابعة والغياب)
                      </span>
                      <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700; display:flex; align-items:center; gap:3px;">
                        <i data-lucide="lock" style="width:11px;height:11px;"></i> مقفل
                      </span>
                    </label>
                    <input type="text" class="form-input" value="${state.user.parentPhone || 'غير مسجل'}" disabled style="background:var(--bg-app); opacity:0.85; cursor:not-allowed; direction:ltr; text-align:left;">
                  </div>
                </div>

                <button type="submit" id="settings-save-student-btn" class="btn-primary" style="margin-top:12px; padding:12px 24px; font-size:0.92rem; font-weight:800; border-radius:12px; justify-content:center; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="check" style="width:16px;height:16px;"></i> حفظ المرحلة الدراسية 🎓
                </button>
              </form>
            ` : `
            <form id="settings-profile-form">
              <div class="form-group">
                <label style="font-weight:700;">الاسم الكامل (Full Name)</label>
                <input type="text" id="settings-name" class="form-input" value="${state.user.name}" required>
              </div>

              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:8px;">
                  <i data-lucide="book-open" style="width:16px;height:16px;color:var(--primary);"></i>
                  التخصص والمؤهل الأكاديمي (Education / Specialization)
                </label>
                <input type="text" id="settings-education" class="form-input" value="${state.user.education || ''}" placeholder="مثال: أستاذ تعليم ثانوي مادة الفيزياء - خبرة 10 سنوات">
                <small style="color:var(--text-muted); display:block; margin-top:4px;">يظهر هذا الحقل في صفحتك الشخصية للطلاب.</small>
              </div>

              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:8px;">
                  <i data-lucide="phone" style="width:16px;height:16px;color:var(--primary);"></i>
                  رقم الهاتف والرمز الدولي (Phone Number &amp; Country Key)
                </label>
                ${renderPhoneInputGroup({
                  selectId: "settings-phone-code",
                  inputId: "settings-phone-number",
                  defaultCode: "+213",
                  value: state.user.phone || "",
                  placeholder: "0555123456",
                  required: false
                })}
                <small style="color:var(--text-muted); display:block; margin-top:4px;">اختر مفتاح الدولة واكتب رقم هاتفك لاستلام الإشعارات.</small>
              </div>

              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700;">
                  <i data-lucide="video" style="width:16px;height:16px;color:var(--primary);"></i> 
                  رابط البث المباشر (Global Meeting Link)
                </label>
                <input type="url" id="settings-meeting-link" class="form-input" value="${state.user.meetingLink || ''}" placeholder="https://zoom.us/j/...">
                <small style="color:var(--text-muted); display:block; margin-top:4px;">هذا الرابط سيستخدم تلقائياً لجميع الجلسات التي ليس لها رابط مخصص في المقرر.</small>
              </div>

              <button type="submit" class="btn-primary" style="margin-top:24px;">حفظ التغييرات / Save Changes</button>
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

    // 2. Random Cartoon Avatar Generator
    document.getElementById("settings-random-avatar-btn")?.addEventListener("click", async () => {
      const randomSeed = Math.random().toString(36).substring(2, 9);
      const newAvatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomSeed}`;

      try {
        showToast("جاري تغيير الشخصية الكرتونية...", "info");
        const updatedUser = await apiFetch("/users/me", {
          method: "PATCH",
          body: JSON.stringify({ avatar: newAvatarUrl })
        });

        if (updatedUser) {
          if (state.user) {
            state.user.avatar = newAvatarUrl;
            localStorage.setItem("user", JSON.stringify(state.user));
          }
          const img = document.getElementById("settings-avatar-img");
          if (img) img.src = newAvatarUrl;

          document.querySelectorAll(".navbar-avatar, #user-menu-avatar, .user-avatar-img").forEach(el => {
            el.src = newAvatarUrl;
          });

          showToast("تم اختيار شخصية جديدة وتحديث صورتك بنجاح! 🎨", "success");
        }
      } catch (err) {
        console.error("Random avatar error:", err);
        showToast("فشل تحديث الشخصية الكرتونية", "error");
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
            } catch (_) {}
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
        const newName = document.getElementById("settings-name").value;
        const meetingLinkInput = document.getElementById("settings-meeting-link");
        const phoneCode = document.getElementById("settings-phone-code")?.value || "+20";
        const phoneNum = document.getElementById("settings-phone-number")?.value.trim() || "";
        
        const fullPhone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";

        const payload = { 
          name: newName,
          phone: fullPhone
        };

        const educationInput = document.getElementById("settings-education");
        if (educationInput !== null) {
          payload.education = educationInput.value.trim();
        }

        if (meetingLinkInput) {
          payload.meetingLink = meetingLinkInput.value;
        }

        try {
          const updatedUser = await apiFetch(`/users/me`, { 
            method: "PATCH", 
            body: JSON.stringify(payload) 
          });
          
          if (updatedUser && updatedUser.id) {
            state.user = updatedUser;
            showToast("تم حفظ إعدادات الملف الشخصي بنجاح! ✅", "success");
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

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

  onDestroy() {}
}
