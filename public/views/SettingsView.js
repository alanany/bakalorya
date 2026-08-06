import { apiFetch, state, showToast, t, switchLanguage } from "../app.js";

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
              <img src="${state.user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bakalorya'}" style="width:80px;height:80px;border-radius:50%;border:2px solid var(--primary);">
              <div>
                <h4 style="font-size:1.3rem; margin:0 0 4px 0;">${state.user.name}</h4>
                <p style="color:var(--text-muted); margin:0 0 8px 0;">${state.user.email}</p>
                <span class="session-tag" style="background:var(--primary-glow); color:var(--primary);">${state.user.role.toUpperCase()}</span>
              </div>
            </div>
            
            <form id="settings-profile-form">
              <div class="form-group">
                <label>Name</label>
                <input type="text" id="settings-name" class="form-input" value="${state.user.name}" required>
              </div>
              
              ${(state.user.role === 'teacher' || state.user.role === 'admin') ? `
              <div class="form-group" style="margin-top:16px;">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700;">
                  <i data-lucide="video" style="width:16px;height:16px;color:var(--primary);"></i> 
                  رابط البث المباشر (Global Meeting Link)
                </label>
                <input type="url" id="settings-meeting-link" class="form-input" value="${state.user.meetingLink || ''}" placeholder="https://zoom.us/j/...">
                <small style="color:var(--text-muted); display:block; margin-top:4px;">هذا الرابط سيستخدم تلقائياً لجميع الجلسات التي ليس لها رابط مخصص في المقرر.</small>
              </div>

              <div class="form-group" style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border-color);">
                <label style="display:flex; align-items:center; gap:6px; font-weight:700;">
                  <i data-lucide="layers" style="width:16px;height:16px;color:#a855f7;"></i> 
                  إدارة التصنيفات الخاصة بك (Teacher Custom Categories)
                </label>
                <input type="text" id="settings-custom-categories" class="form-input" value="${state.user.customCategories || ''}" placeholder="مثال: رياضيات, فيزياء, هندسة مدنية, علوم الطبيعة والحياة">
                <small style="color:var(--text-muted); display:block; margin-top:4px;">اكتب التصنيفات والتخصصات الخاصة بك مفصولة بفاصلة (، أو ,). ستظهر هذه التصنيفات خياراً جاهزاً عند إنشاء أي دورة جديدة.</small>
              </div>
              ` : ''}

              <button type="submit" class="btn-primary" style="margin-top:20px;">حفظ التغييرات / Save Changes</button>
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
      const customCatInput = document.getElementById("settings-custom-categories");
      
      const payload = { name: newName };
      if (meetingLinkInput) {
        payload.meetingLink = meetingLinkInput.value;
      }
      if (customCatInput) {
        payload.customCategories = customCatInput.value;
      }

      try {
        const updatedUser = await apiFetch(`/users/me`, { 
          method: "PATCH", 
          body: JSON.stringify(payload) 
        });
        
        if (updatedUser && updatedUser.id) {
          state.user = updatedUser;
          showToast("Profile settings saved successfully", "success");
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
