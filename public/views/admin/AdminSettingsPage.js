import { apiFetch, state, showToast } from '../../app.js';

// ── AdminSettingsPage ─────────────────────────────────────────────────────────
// Settings page with internal sub-navigation (sub-pages)

export const AdminSettingsPage = {

  _settingsSection: 'contact', // active sub-section

  renderSettingsTab() {
    const settings = this.platformSettings || state.platformSettings || {};
    this._settingsSection = this._settingsSection || 'contact';

    const SECTIONS = [
      { key: 'contact',  icon: 'message-circle',  label: 'بيانات التواصل والواتساب' },
      { key: 'payment',  icon: 'wallet',           label: 'بيانات الدفع والتحويل' },
      { key: 'password', icon: 'lock-keyhole',     label: 'تغيير كلمة المرور' },
    ];

    return `
      <style>
        .set-layout { display:flex; gap:0; min-height:560px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:24px; overflow:hidden; }
        .set-sidebar { width:230px; flex-shrink:0; border-inline-end:1px solid var(--border-color); padding:20px 12px; display:flex; flex-direction:column; gap:4px; background:var(--bg-app); }
        .set-sidebar-title { font-size:0.7rem; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px; padding:4px 10px 10px 10px; }
        .set-nav-btn { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:14px; border:none; background:transparent; cursor:pointer; width:100%; text-align:right; font-size:0.85rem; font-weight:700; color:var(--text-muted); transition:all 0.18s; }
        .set-nav-btn i { width:17px; height:17px; flex-shrink:0; }
        .set-nav-btn:hover { background:rgba(99,102,241,0.07); color:var(--primary); }
        .set-nav-btn.active { background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; }
        .set-nav-btn.active i { color:var(--primary); }
        .set-content { flex:1; padding:32px 28px; overflow-y:auto; }
        .set-section-header { margin-bottom:28px; }
        .set-section-header h3 { font-size:1.2rem; font-weight:900; color:var(--text-main); margin:0 0 6px 0; }
        .set-section-header p { font-size:0.84rem; color:var(--text-muted); margin:0; line-height:1.5; }
        .set-divider { height:1px; background:var(--border-color); margin:20px 0; }
        .set-form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; }
        .set-fgrp { display:flex; flex-direction:column; gap:6px; }
        .set-fgrp label { font-size:0.8rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; }
        .set-fgrp input, .set-fgrp select, .set-fgrp textarea { padding:11px 14px; border-radius:13px; border:1.5px solid var(--border-color); background:var(--bg-app); color:var(--text-main); font-size:0.88rem; outline:none; transition:border-color 0.2s; width:100%; box-sizing:border-box; }
        .set-fgrp input:focus, .set-fgrp select:focus, .set-fgrp textarea:focus { border-color:var(--primary); }
        .set-fgrp .hint { font-size:0.72rem; color:var(--text-muted); margin-top:2px; }
        .set-save-row { display:flex; justify-content:flex-end; margin-top:28px; padding-top:20px; border-top:1px solid var(--border-color); }
        .set-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 28px; border-radius:14px; border:none; cursor:pointer; font-size:0.9rem; font-weight:800; transition:all 0.2s; }
        .set-btn-primary { background:linear-gradient(135deg,var(--primary),#6d28d9); color:#fff; box-shadow:0 6px 20px rgba(99,102,241,0.3); }
        .set-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,0.4); }
        .set-btn-red { background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; box-shadow:0 6px 20px rgba(239,68,68,0.3); }
        .set-btn-red:hover { transform:translateY(-2px); }
        .pw-eye-wrap { position:relative; }
        .pw-eye-wrap input { padding-inline-start:44px; }
        .pw-eye-btn { position:absolute; inset-inline-start:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px; }
        .pw-strength-bar { margin-top:8px; display:none; }
        .pw-strength-track { height:4px; border-radius:4px; background:var(--border-color); overflow:hidden; }
        .pw-strength-fill { height:100%; width:0%; transition:all 0.3s; border-radius:4px; }
        @media(max-width:640px) { .set-layout { flex-direction:column; } .set-sidebar { width:100%; flex-direction:row; overflow-x:auto; border-inline-end:none; border-bottom:1px solid var(--border-color); } }
      </style>

      <div class="set-layout">
        <!-- Sub nav -->
        <div class="set-sidebar">
          <div class="set-sidebar-title">إعدادات المنصة</div>
          ${SECTIONS.map(s => `
            <button class="set-nav-btn${this._settingsSection === s.key ? ' active' : ''}" data-set-section="${s.key}">
              <i data-lucide="${s.icon}"></i>
              ${s.label}
            </button>
          `).join('')}
        </div>

        <!-- Content panel -->
        <div class="set-content" id="set-content-panel">
          ${this._renderSettingsSection(settings)}
        </div>
      </div>
    `;
  },

  _renderSettingsSection(settings) {
    settings = settings || this.platformSettings || state.platformSettings || {};
    switch (this._settingsSection) {
      case 'contact':  return this._renderContactSection(settings);
      case 'payment':  return this._renderPaymentSection(settings);
      case 'password': return this._renderPasswordSection();
      default: return '';
    }
  },

  _renderContactSection(s) {
    return `
      <div class="set-section-header">
        <h3>📞 بيانات التواصل والواتساب</h3>
        <p>رقم الواتساب الرسمي، بيانات الاتصال، وساعات العمل التي تظهر في أقسام الموقع المختلفة.</p>
      </div>

      <form id="admin-platform-settings-form">
        <div class="set-fgrp" style="margin-bottom:18px;">
          <label><i data-lucide="message-circle" style="width:15px;height:15px;color:#10b981;"></i> رقم الواتساب الرسمي <span style="color:#ef4444;">*</span></label>
          <input type="text" id="setting-whatsapp-number" value="${s.whatsappNumber || ''}" placeholder="+20 101 234 5678">
          <span class="hint">يُحوَّل تلقائياً إلى رابط wa.me ويظهر في الزر العائم والفوتر.</span>
        </div>

        <div class="set-form-grid">
          <div class="set-fgrp">
            <label><i data-lucide="phone" style="width:14px;height:14px;"></i> رقم الاتصال الهاتفي</label>
            <input type="text" id="setting-contact-phone" value="${s.contactPhone || ''}" placeholder="+20 100 000 0000">
            <span class="hint">يظهر في الفوتر وصفحة اتصل بنا.</span>
          </div>
          <div class="set-fgrp">
            <label><i data-lucide="clock" style="width:14px;height:14px;color:#f59e0b;"></i> ساعات العمل</label>
            <input type="text" id="setting-working-hours" value="${s.workingHours || ''}" placeholder="الأحد – الخميس (9ص – 6م)">
          </div>
        </div>

        <div class="set-form-grid" style="margin-top:18px;">
          <div class="set-fgrp">
            <label><i data-lucide="mail" style="width:14px;height:14px;"></i> البريد الإلكتروني الأساسي</label>
            <input type="email" id="setting-contact-email" value="${s.contactEmail || ''}" placeholder="support@bakalorya.com">
          </div>
          <div class="set-fgrp">
            <label><i data-lucide="mail-plus" style="width:14px;height:14px;"></i> بريد الاستفسارات العامة</label>
            <input type="email" id="setting-contact-email2" value="${s.contactEmail2 || ''}" placeholder="info@bakalorya.com">
          </div>
        </div>

        <div class="set-divider"></div>
        <p style="font-size:0.82rem;font-weight:800;color:var(--text-main);margin:0 0 14px 0;">🗺️ نصوص صفحة "تواصل معنا"</p>

        <div class="set-fgrp" style="margin-bottom:14px;">
          <label>العنوان الرئيسي للصفحة</label>
          <input type="text" id="setting-contact-title" value="${s.contactTitle || ''}" placeholder="نحن هنا لدعمك وإجابة استفساراتك 💬">
        </div>
        <div class="set-fgrp" style="margin-bottom:14px;">
          <label>الوصف الفرعي</label>
          <textarea id="setting-contact-subtitle" style="height:70px;resize:vertical;" placeholder="سواء كنت طالباً، معلماً، أو ولي أمر...">${s.contactSubtitle || ''}</textarea>
        </div>
        <div class="set-fgrp">
          <label>العنوان / الموقع الجغرافي</label>
          <input type="text" id="setting-contact-address" value="${s.contactAddress || ''}" placeholder="القاهرة / الجزائر العاصمة">
        </div>

        <div class="set-save-row">
          <button type="submit" id="save-platform-settings-btn" class="set-btn set-btn-primary">
            <i data-lucide="save" style="width:16px;height:16px;"></i> حفظ بيانات التواصل
          </button>
        </div>
      </form>
    `;
  },

  _renderPaymentSection(s) {
    return `
      <div class="set-section-header">
        <h3>💳 بيانات الدفع والتحويل المالي</h3>
        <p>أرقام وحسابات الدفع التي تظهر للطلاب في نافذة الاشتراك عند السداد.</p>
      </div>

      <form id="admin-platform-settings-form">
        <div class="set-form-grid">
          <div class="set-fgrp">
            <label><span style="color:#ef4444;">🔴</span> فودافون كاش <span style="color:#ef4444;">*</span></label>
            <input type="text" id="setting-vodafone-cash" value="${s.vodafoneCashNumber || ''}" placeholder="01098765432" style="font-family:monospace;">
            <span class="hint">الرقم الأساسي لمحفظة فودافون كاش الرسمية.</span>
          </div>
          <div class="set-fgrp">
            <label><span style="color:#8b5cf6;">⚡</span> إنستاباي (IPA) <span style="color:#ef4444;">*</span></label>
            <input type="text" id="setting-instapay-handle" value="${s.instapayHandle || ''}" placeholder="bakalorya@instapay">
            <span class="hint">معرف حساب إنستاباي (IPA Address).</span>
          </div>
          <div class="set-fgrp">
            <label><span style="color:#f97316;">🟠</span> أورنج كاش <small style="color:var(--text-muted);font-weight:normal;">(اختياري)</small></label>
            <input type="text" id="setting-orange-cash" value="${s.orangeCashNumber || ''}" placeholder="01200000000" style="font-family:monospace;">
          </div>
          <div class="set-fgrp">
            <label><span style="color:#10b981;">🟢</span> اتصالات كاش <small style="color:var(--text-muted);font-weight:normal;">(اختياري)</small></label>
            <input type="text" id="setting-etisalat-cash" value="${s.etisalatCashNumber || ''}" placeholder="01100000000" style="font-family:monospace;">
          </div>
        </div>

        <div class="set-divider"></div>

        <div class="set-fgrp" style="margin-bottom:16px;">
          <label><i data-lucide="landmark" style="width:14px;height:14px;"></i> بيانات الحساب البنكي / الآيبان <small style="color:var(--text-muted);font-weight:normal;">(اختياري)</small></label>
          <textarea id="setting-bank-details" style="height:65px;resize:vertical;" placeholder="بنك مصر - حساب رقم 123456789 - IBAN: EG000...">${s.bankAccountDetails || ''}</textarea>
        </div>

        <div class="set-fgrp">
          <label><i data-lucide="file-text" style="width:14px;height:14px;color:#f59e0b;"></i> تعليمات التحويل للطلاب</label>
          <textarea id="setting-payment-instructions" style="height:65px;resize:vertical;" placeholder="يرجى إتمام التحويل ثم إرفاق صورة الإيصال...">${s.paymentInstructions || ''}</textarea>
          <span class="hint">تظهر أسفل أرقام التحويل مباشرةً في نافذة الدفع.</span>
        </div>

        <div class="set-save-row">
          <button type="submit" id="save-platform-settings-btn" class="set-btn set-btn-primary">
            <i data-lucide="save" style="width:16px;height:16px;"></i> حفظ بيانات الدفع
          </button>
        </div>
      </form>
    `;
  },

  _renderPasswordSection() {
    return `
      <div class="set-section-header">
        <h3>🔒 تغيير كلمة المرور</h3>
        <p>غيّر كلمة مرور حساب الأدمن. يُنصح بكلمة مرور قوية لا تقل عن 8 أحرف.</p>
      </div>

      <form id="admin-change-password-form" style="max-width:460px;display:flex;flex-direction:column;gap:18px;">

        <div class="set-fgrp">
          <label><i data-lucide="lock" style="width:14px;height:14px;color:var(--text-muted);"></i> كلمة المرور الحالية</label>
          <div class="pw-eye-wrap">
            <input type="password" id="admin-curr-password" placeholder="••••••••" autocomplete="current-password">
            <button type="button" class="pw-eye-btn" data-target="admin-curr-password"><i data-lucide="eye" style="width:15px;height:15px;"></i></button>
          </div>
        </div>

        <div class="set-fgrp">
          <label><i data-lucide="lock-keyhole" style="width:14px;height:14px;color:#ef4444;"></i> كلمة المرور الجديدة</label>
          <div class="pw-eye-wrap">
            <input type="password" id="admin-new-password" placeholder="••••••••" autocomplete="new-password">
            <button type="button" class="pw-eye-btn" data-target="admin-new-password"><i data-lucide="eye" style="width:15px;height:15px;"></i></button>
          </div>
          <div class="pw-strength-bar" id="admin-pw-strength-bar">
            <div class="pw-strength-track"><div class="pw-strength-fill" id="admin-pw-strength-fill"></div></div>
            <p id="admin-pw-strength-label" style="font-size:0.72rem;margin:4px 0 0 0;color:var(--text-muted);"></p>
          </div>
        </div>

        <div class="set-fgrp">
          <label><i data-lucide="shield-check" style="width:14px;height:14px;color:#10b981;"></i> تأكيد كلمة المرور الجديدة</label>
          <div class="pw-eye-wrap">
            <input type="password" id="admin-confirm-password" placeholder="••••••••" autocomplete="new-password">
            <button type="button" class="pw-eye-btn" data-target="admin-confirm-password"><i data-lucide="eye" style="width:15px;height:15px;"></i></button>
          </div>
          <p id="admin-confirm-match" style="font-size:0.73rem;margin:4px 0 0 0;display:none;"></p>
        </div>

        <div class="set-save-row" style="margin-top:8px;">
          <button type="submit" id="admin-change-pw-btn" class="set-btn set-btn-red">
            <i data-lucide="key-round" style="width:16px;height:16px;"></i> تغيير كلمة المرور
          </button>
        </div>
      </form>
    `;
  },

  // ── Events ──────────────────────────────────────────────────────────────────

  bindSettingsEvents() {
    // Sub-section navigation
    document.querySelectorAll('[data-set-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._settingsSection = btn.getAttribute('data-set-section');
        try {
          if (window.location.hash !== `#admin-dashboard/settings/${this._settingsSection}`) {
            history.pushState(null, "", `#admin-dashboard/settings/${this._settingsSection}`);
          }
        } catch (err) {}
        // Update active button
        document.querySelectorAll('[data-set-section]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Re-render content panel only
        const panel = document.getElementById('set-content-panel');
        if (panel) {
          panel.innerHTML = this._renderSettingsSection();
          if (window.lucide) window.lucide.createIcons();
          this._bindCurrentSectionEvents();
        }
      });
    });

    this._bindCurrentSectionEvents();
  },

  _bindCurrentSectionEvents() {
    if (this._settingsSection === 'contact' || this._settingsSection === 'payment') {
      this._bindPlatformSettingsForm();
    }
    if (this._settingsSection === 'password') {
      this.bindChangePasswordEvents();
    }
  },

  _bindPlatformSettingsForm() {
    document.getElementById('admin-platform-settings-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('save-platform-settings-btn');
      if (!submitBtn) return;

      const origHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" style="width:16px;height:16px;animation:spin 1s linear infinite;"></i> جارٍ الحفظ...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const body = {};
        const g = id => document.getElementById(id)?.value?.trim?.() ?? undefined;
        const ga = id => document.getElementById(id)?.value ?? undefined; // for textarea

        if (this._settingsSection === 'contact') {
          body.whatsappNumber        = g('setting-whatsapp-number');
          body.contactPhone          = g('setting-contact-phone');
          body.workingHours          = g('setting-working-hours');
          body.contactEmail          = g('setting-contact-email');
          body.contactEmail2         = g('setting-contact-email2');
          body.contactTitle          = g('setting-contact-title');
          body.contactSubtitle       = ga('setting-contact-subtitle');
          body.contactAddress        = g('setting-contact-address');
        } else {
          body.vodafoneCashNumber    = g('setting-vodafone-cash');
          body.instapayHandle        = g('setting-instapay-handle');
          body.orangeCashNumber      = g('setting-orange-cash');
          body.etisalatCashNumber    = g('setting-etisalat-cash');
          body.bankAccountDetails    = ga('setting-bank-details');
          body.paymentInstructions   = ga('setting-payment-instructions');
        }

        const res = await apiFetch('/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(body)
        });

        if (res && res.settings) {
          this.platformSettings = res.settings;
          state.platformSettings = { ...state.platformSettings, ...res.settings };
        }
        showToast('✅ تم الحفظ بنجاح', 'success');
      } catch (err) {
        showToast(err.message || 'فشل الحفظ', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHTML;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  },

  bindChangePasswordEvents() {
    // Show/hide toggles
    document.querySelectorAll('.pw-eye-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.getAttribute('data-target'));
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        const icon = btn.querySelector('i');
        if (icon) { icon.setAttribute('data-lucide', showing ? 'eye' : 'eye-off'); if (window.lucide) window.lucide.createIcons(); }
      });
    });

    // Strength meter
    const newPwInput   = document.getElementById('admin-new-password');
    const strengthBar  = document.getElementById('admin-pw-strength-bar');
    const strengthFill = document.getElementById('admin-pw-strength-fill');
    const strengthLbl  = document.getElementById('admin-pw-strength-label');

    newPwInput?.addEventListener('input', () => {
      const val = newPwInput.value;
      if (!val) { strengthBar.style.display = 'none'; return; }
      strengthBar.style.display = 'block';
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;
      const lvls = [
        { w:'25%', c:'#ef4444', t:'🔴 ضعيفة جداً' },
        { w:'50%', c:'#f59e0b', t:'🟠 مقبولة' },
        { w:'75%', c:'#3b82f6', t:'🔵 جيدة' },
        { w:'100%',c:'#10b981', t:'🟢 قوية جداً' },
      ];
      const l = lvls[Math.min(score, 3)];
      strengthFill.style.width = l.w; strengthFill.style.background = l.c;
      strengthLbl.textContent = l.t; strengthLbl.style.color = l.c;
    });

    // Confirm match
    const confirmInput = document.getElementById('admin-confirm-password');
    const matchLbl     = document.getElementById('admin-confirm-match');
    confirmInput?.addEventListener('input', () => {
      const v = confirmInput.value;
      if (!v) { matchLbl.style.display = 'none'; return; }
      matchLbl.style.display = 'block';
      if ((newPwInput?.value || '') === v) {
        matchLbl.textContent = '✅ كلمتا المرور متطابقتان'; matchLbl.style.color = '#10b981';
      } else {
        matchLbl.textContent = '❌ كلمتا المرور غير متطابقتين'; matchLbl.style.color = '#ef4444';
      }
    });

    // Form submit
    document.getElementById('admin-change-password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('admin-curr-password')?.value?.trim();
      const newPassword     = document.getElementById('admin-new-password')?.value?.trim();
      const confirmPassword = document.getElementById('admin-confirm-password')?.value?.trim();

      if (!currentPassword || !newPassword || !confirmPassword) { showToast('يرجى ملء جميع الحقول', 'error'); return; }
      if (newPassword.length < 6)      { showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
      if (newPassword !== confirmPassword) { showToast('كلمتا المرور غير متطابقتين', 'error'); return; }

      const btn = document.getElementById('admin-change-pw-btn');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" style="width:15px;height:15px;animation:spin 1s linear infinite;"></i> جارٍ الحفظ...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        await apiFetch('/auth/change-password', { method:'POST', body:JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
        showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
        ['admin-curr-password','admin-new-password','admin-confirm-password'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        if (strengthBar) strengthBar.style.display = 'none';
        if (matchLbl) matchLbl.style.display = 'none';
      } catch (err) {
        showToast(err.message || 'فشل تغيير كلمة المرور', 'error');
      } finally {
        btn.disabled = false; btn.innerHTML = orig;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  },

};
