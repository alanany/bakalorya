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
            <div style="display:flex; align-items:center; gap:24px; margin-bottom:24px;">
              <img src="${state.user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Entlq'}" style="width:80px;height:80px;border-radius:50%;border:2px solid var(--primary);">
              <div>
                <h4 style="font-size:1.3rem; margin:0 0 4px 0;">${state.user.name}</h4>
                <p style="color:var(--text-muted); margin:0 0 8px 0;">${state.user.email}</p>
                <span class="session-tag" style="background:var(--primary-glow); color:var(--primary);">${state.user.role.toUpperCase()}</span>
              </div>
            </div>
            
            <form id="settings-profile-form">
              <div class="form-group">
                <label style="font-weight:700;">الاسم الكامل (Full Name)</label>
                <input type="text" id="settings-name" class="form-input" value="${state.user.name}" required>
              </div>

              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:8px;">
                  <i data-lucide="phone" style="width:16px;height:16px;color:var(--primary);"></i>
                  رقم الهاتف والرمز الدولي (Phone Number & Country Key)
                </label>
                ${renderPhoneInputGroup({
                  selectId: "settings-phone-code",
                  inputId: "settings-phone-number",
                  defaultCode: "+213",
                  value: state.user.phone || "",
                  placeholder: "0555123456",
                  required: false
                })}
                <small style="color:var(--text-muted); display:block; margin-top:4px;">اختر مفتاح الدولة واكتب رقم هاتفك لاستلام إشعارات الانطلق عبر واتساب.</small>
              </div>

              ${state.user.role === 'student' ? `
              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:8px;">
                  💬 رقم هاتف ولي الأمر والرمز الدولي (Parent Phone Number) <span style="color:var(--error);">*</span>
                </label>
                ${renderPhoneInputGroup({
                  selectId: "settings-parent-phone-code",
                  inputId: "settings-parent-phone-number",
                  defaultCode: "+20",
                  value: state.user.parentPhone || "",
                  placeholder: "01012345678",
                  required: true
                })}
                <small style="color:var(--text-muted); display:block; margin-top:4px;">رقم هاتف ولي الأمر إجباري للتواصل والتنبيهات المباشرة.</small>
              </div>

              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:8px;">
                  <i data-lucide="graduation-cap" style="width:16px;height:16px;color:var(--primary);"></i>
                  المستوى والتخصص الدراسي (Education Level / Stream)
                </label>
                ${renderEducationSelectHTML ? renderEducationSelectHTML({ id: "settings-education", selectedValue: state.user.education || "Entlq 3" }) : `
                  <select id="settings-education" class="form-select">
                    <option value="Entlq 3" ${state.user.education?.includes("Entlq 3") ? "selected" : ""}>Entlq 3</option>
                  </select>
                `}
              </div>
              ` : ''}
              
              ${(state.user.role === 'teacher' || state.user.role === 'admin') ? `
              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700;">
                  <i data-lucide="video" style="width:16px;height:16px;color:var(--primary);"></i> 
                  رابط البث المباشر (Global Meeting Link)
                </label>
                <input type="url" id="settings-meeting-link" class="form-input" value="${state.user.meetingLink || ''}" placeholder="https://zoom.us/j/...">
                <small style="color:var(--text-muted); display:block; margin-top:4px;">هذا الرابط سيستخدم تلقائياً لجميع الجلسات التي ليس لها رابط مخصص في المقرر.</small>
              </div>

              ` : ''}

              <button type="submit" class="btn-primary" style="margin-top:24px;">حفظ التغييرات / Save Changes</button>
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
    document.getElementById("settings-profile-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newName = document.getElementById("settings-name").value;
      const meetingLinkInput = document.getElementById("settings-meeting-link");
      const phoneCode = document.getElementById("settings-phone-code")?.value || "+20";
      const phoneNum = document.getElementById("settings-phone-number")?.value.trim() || "";
      const parentPhoneCode = document.getElementById("settings-parent-phone-code")?.value || "+20";
      const parentPhoneNum = document.getElementById("settings-parent-phone-number")?.value.trim() || "";
      const educationInput = document.getElementById("settings-education");
      
      const fullPhone = phoneNum ? `${phoneCode} ${phoneNum}`.trim() : "";
      const fullParentPhone = parentPhoneNum ? `${parentPhoneCode} ${parentPhoneNum}`.trim() : "";

      const payload = { 
        name: newName,
        phone: fullPhone
      };

      if (state.user.role === "student") {
        if (!fullParentPhone) {
          showToast("رقم هاتف ولي الأمر مطلوب عند تحديث البيانات.", "error");
          return;
        }
        payload.parentPhone = fullParentPhone;
      }

      if (educationInput) {
        payload.education = educationInput.value;
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

    document.getElementById("settings-language")?.addEventListener("change", (e) => {
      switchLanguage(e.target.value);
    });

    document.getElementById("settings-theme-btn")?.addEventListener("click", () => {
      document.getElementById("theme-toggle").click(); // Trigger global theme toggle
      this.render(); // Re-render to update button text/icon
    });
  }

  onDestroy() {}
}
