import { apiFetch, state, showToast, t } from '../../app.js';

// ── AdminSettingsPage ─────────────────────────────────────────────────────────
// Methods for Platform & WhatsApp Settings — assigned to AdminView.prototype

export const AdminSettingsPage = {

  renderSettingsTab() {
    const settings = this.platformSettings || state.platformSettings || {
      whatsappNumber: '+213 555 123 456',
      contactPhone: '+213 555 123 456',
      contactEmail: 'support@entlqedu.com',
      whatsappUrl: 'https://wa.me/213555123456'
    };

    return `
      <div style="max-width:1000px; margin:0 auto; display:flex; flex-direction:column; gap:28px;">
        
        <!-- Header Banner -->
        <div class="glass-card" style="padding:28px; border-radius:24px; border:2px solid var(--border-color); background:linear-gradient(135deg, rgba(37, 211, 102, 0.08), rgba(99, 102, 241, 0.08)); position:relative; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; position:relative; z-index:2;">
            <div style="display:flex; align-items:center; gap:18px;">
              <div style="width:58px; height:58px; border-radius:18px; background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(16,185,129,0.35); flex-shrink:0;">
                <i data-lucide="settings-2" style="width:30px; height:30px;"></i>
              </div>
              <div>
                <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(16,185,129,0.15); color:#059669; font-size:0.75rem; font-weight:800; padding:3px 12px; border-radius:20px; margin-bottom:6px;">
                  <i data-lucide="shield-check" style="width:13px; height:13px;"></i> إعدادات المنصة والتواصل الرسمية
                </div>
                <h2 style="font-size:1.5rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main);">
                  ⚙️ إعدادات المنصة ورقم الواتساب
                </h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin:0; line-height:1.5;">
                  تحكم كامل في رقم الواتساب الرسمي المربوط بالصفحة الرئيسية والزر العائم، بالإضافة لبيانات الدعم الفني.
                </p>
              </div>
            </div>

            <!-- Live WhatsApp Action Button -->
            <a id="admin-preview-wa-link" href="${settings.whatsappUrl || 'https://wa.me/213555123456'}" target="_blank" class="btn-secondary" style="padding:10px 20px; font-size:0.88rem; border-color:#10b981; color:#059669; border-radius:30px; font-weight:800; display:inline-flex; align-items:center; gap:8px; text-decoration:none; background:#ffffff; box-shadow:0 4px 15px rgba(16,185,129,0.2);" title="تجربة رابط الواتساب الفعلي الآن">
              <i data-lucide="external-link" style="width:16px; height:16px;"></i> تجربة محادثة واتساب الحالية
            </a>
          </div>
        </div>

        <!-- Settings Cards Grid -->
        <div style="display:grid; grid-template-columns: 1fr; gap:24px;">
          
          <div class="glass-card" style="padding:32px; border-radius:24px; border:1px solid var(--border-color);">
            
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(37,211,102,0.15); color:#059669; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="message-square" style="width:22px; height:22px;"></i>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; margin:0 0 2px 0; color:var(--text-main);">بيانات التواصل والربط المباشر</h3>
                <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">سيتم تطبيق التعديلات فوراً على كافة صفحات المنصة دون الحاجة لإعادة تشغيل السيرفر.</p>
              </div>
            </div>

            <form id="admin-platform-settings-form" style="display:flex; flex-direction:column; gap:22px;">
              
              <!-- WhatsApp Number -->
              <div class="form-group" style="margin:0;">
                <label style="font-size:0.9rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                  <span style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="message-circle" style="width:18px; height:18px; color:#10b981;"></i>
                    رقم الواتساب الرسمي (WhatsApp Number) <span style="color:var(--error,#ef4444);">*</span>
                  </span>
                  <span style="font-size:0.75rem; color:#059669; font-weight:700; background:rgba(16,185,129,0.1); padding:2px 10px; border-radius:12px;">يظهر بالزر العائم والفوتر</span>
                </label>
                <div style="position:relative;">
                  <input type="text" id="setting-whatsapp-number" class="form-input" value="${settings.whatsappNumber || '+213 555 123 456'}" placeholder="مثال: +213 555 123 456 أو +20 101 234 5678" required style="padding:14px 16px; font-size:1rem; font-weight:700; border-radius:14px; width:100%; border:2px solid var(--border-color);">
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:6px; font-size:0.78rem; color:var(--text-muted);">
                  <i data-lucide="info" style="width:14px; height:14px; color:var(--primary);"></i>
                  <span>يقبل الأرقام بالصيغة الدولية (+213... / +20...) أو المحلية (0555... / 010...) ويتم تحويلها تلقائياً لرابط https://wa.me</span>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                
                <!-- Contact Phone -->
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.9rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <i data-lucide="phone" style="width:16px; height:16px; color:var(--primary);"></i>
                    رقم هاتف الاتصال الهاتفي (Contact Phone)
                  </label>
                  <input type="text" id="setting-contact-phone" class="form-input" value="${settings.contactPhone || '+213 555 123 456 / +20 100 000 0000'}" placeholder="مثال: +213 555 123 456 / +20 100 000 0000" required style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:14px;">
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                    يظهر في قسم أرقام الاتصال الهاتفي بالفوتر وصفحة اتصل بنا
                  </span>
                </div>

                <!-- Working Hours -->
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.9rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <i data-lucide="clock" style="width:16px; height:16px; color:#f59e0b;"></i>
                    ساعات وأوقات العمل الرسمية (Working Hours)
                  </label>
                  <input type="text" id="setting-working-hours" class="form-input" value="${settings.workingHours || 'الأحد - الخميس (09:00 ص - 06:00 م)'}" placeholder="الأحد - الخميس (09:00 ص - 06:00 م)" required style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:14px;">
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                    تظهر في بطاقة الاتصال بصفحة اتصل بنا
                  </span>
                </div>

              </div>

              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">

                <!-- Support Email 1 -->
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.9rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <i data-lucide="mail" style="width:16px; height:16px; color:var(--primary);"></i>
                    البريد الإلكتروني الرسمي الأساسي (Support Email)
                  </label>
                  <input type="email" id="setting-contact-email" class="form-input" value="${settings.contactEmail || 'support@entlqedu.com'}" placeholder="support@entlqedu.com" required style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:14px;">
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                    البريد الأساسي للدعم الفني
                  </span>
                </div>

                <!-- Support Email 2 -->
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.9rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <i data-lucide="mail-plus" style="width:16px; height:16px; color:var(--primary);"></i>
                    البريد الإلكتروني للاستفسارات العامة (Info Email)
                  </label>
                  <input type="email" id="setting-contact-email2" class="form-input" value="${settings.contactEmail2 || 'info@entlqedu.com'}" placeholder="info@entlqedu.com" style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:14px;">
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                    البريد الثانوي للاستفسارات العامة
                  </span>
                </div>

              </div>

              <!-- Page Title & Subtitle Section -->
              <div style="border-top:1px dashed var(--border-color); padding-top:18px; display:flex; flex-direction:column; gap:16px;">
                <h4 style="font-size:0.98rem; font-weight:800; color:var(--text-main); margin:0; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="layout" style="width:16px; height:16px; color:var(--primary);"></i>
                  نصوص وعناوين صفحة "تواصل معنا" (#contact)
                </h4>

                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:6px; display:block;">
                    العنوان الرئيسي لصفحة اتصل بنا (Page Heading):
                  </label>
                  <input type="text" id="setting-contact-title" class="form-input" value="${settings.contactTitle || 'نحن هنا لدعمك وإجابة استفساراتك 💬'}" placeholder="نحن هنا لدعمك وإجابة استفساراتك 💬" required style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:12px;">
                </div>

                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:6px; display:block;">
                    الوصف الفرعي لصفحة اتصل بنا (Subtitle):
                  </label>
                  <textarea id="setting-contact-subtitle" class="form-input" style="height:70px; resize:vertical; padding:12px; font-size:0.9rem; line-height:1.5; border-radius:12px;" placeholder="سواء كنت طالباً، معلماً، أو ولي أمر...">${settings.contactSubtitle || 'سواء كنت طالباً، معلماً، أو ولي أمر، يسعدنا تواصلك معنا طوال أيام الأسبوع للحصول على الدعم الفني والأكاديمي.'}</textarea>
                </div>

                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:6px; display:block;">
                    المقر والتواجد الجغرافي (Address / Location):
                  </label>
                  <input type="text" id="setting-contact-address" class="form-input" value="${settings.contactAddress || 'الجزائر العاصمة / القاهرة'}" placeholder="الجزائر العاصمة / القاهرة" style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:12px;">
                </div>
              </div>

              <!-- Platform Financial Transfer Accounts Section -->
              <div style="border-top:2px solid var(--border-color); padding-top:24px; display:flex; flex-direction:column; gap:18px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:38px; height:38px; border-radius:12px; background:rgba(245, 158, 11, 0.15); color:#d97706; display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="wallet" style="width:22px; height:22px;"></i>
                  </div>
                  <div>
                    <h4 style="font-size:1.1rem; font-weight:900; color:var(--text-main); margin:0 0 2px 0;">
                      💳 بيانات التحويل المالي المعتمدة للمنصة
                    </h4>
                    <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
                      أرقام وحسابات الدفع التي تظهر للطلاب في نافذة الاشتراك ودفع رسوم المجموعات (مع زر النسخ الفوري).
                    </p>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                  
                  <!-- Vodafone Cash -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                      <span style="color:#ef4444; font-size:1rem;">🔴</span>
                      <span>رقم فودافون كاش (Vodafone Cash)</span>
                      <span style="color:var(--error,#ef4444);">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="setting-vodafone-cash" 
                      class="form-input" 
                      value="${settings.vodafoneCashNumber || '01098765432'}" 
                      placeholder="مثال: 01098765432" 
                      required 
                      style="padding:12px 14px; font-size:0.95rem; font-weight:700; font-family:monospace; border-radius:14px;"
                    >
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                      الرقم الأساسي لمحفظة فودافون كاش الرسمية للمنصة
                    </span>
                  </div>

                  <!-- InstaPay Handle -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                      <span style="color:#8b5cf6; font-size:1rem;">⚡</span>
                      <span>عنوان / معرف إنستاباي (InstaPay Handle)</span>
                      <span style="color:var(--error,#ef4444);">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="setting-instapay-handle" 
                      class="form-input" 
                      value="${settings.instapayHandle || 'bakalorya@instapay'}" 
                      placeholder="مثال: bakalorya@instapay" 
                      required 
                      style="padding:12px 14px; font-size:0.95rem; font-weight:700; border-radius:14px;"
                    >
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                      معرف حساب إنستاباي المعتمد (IPA Address / Username)
                    </span>
                  </div>

                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                  
                  <!-- Orange Cash -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                      <span style="color:#f97316; font-size:1rem;">🟠</span>
                      <span>رقم أورنج كاش (Orange Cash) <small style="color:var(--text-muted); font-weight:normal;">(اختياري)</small></span>
                    </label>
                    <input 
                      type="text" 
                      id="setting-orange-cash" 
                      class="form-input" 
                      value="${settings.orangeCashNumber || ''}" 
                      placeholder="مثال: 01200000000" 
                      style="padding:12px 14px; font-size:0.95rem; font-weight:700; font-family:monospace; border-radius:14px;"
                    >
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                      يظهر تلقائياً في نافذة الدفع إذا تم إدخاله
                    </span>
                  </div>

                  <!-- Etisalat Cash -->
                  <div class="form-group" style="margin:0;">
                    <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                      <span style="color:#10b981; font-size:1rem;">🟢</span>
                      <span>رقم اتصالات كاش (Etisalat Cash) <small style="color:var(--text-muted); font-weight:normal;">(اختياري)</small></span>
                    </label>
                    <input 
                      type="text" 
                      id="setting-etisalat-cash" 
                      class="form-input" 
                      value="${settings.etisalatCashNumber || ''}" 
                      placeholder="مثال: 01100000000" 
                      style="padding:12px 14px; font-size:0.95rem; font-weight:700; font-family:monospace; border-radius:14px;"
                    >
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                      يظهر تلقائياً في نافذة الدفع إذا تم إدخاله
                    </span>
                  </div>

                </div>

                <!-- Bank Account / IBAN Details -->
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <i data-lucide="landmark" style="width:16px; height:16px; color:var(--primary);"></i>
                    <span>بيانات الحساب البنكي / الآيبان (Bank Details & IBAN) <small style="color:var(--text-muted); font-weight:normal;">(اختياري)</small></span>
                  </label>
                  <textarea 
                    id="setting-bank-details" 
                    class="form-input" 
                    style="height:65px; resize:vertical; padding:12px; font-size:0.9rem; line-height:1.5; border-radius:12px;" 
                    placeholder="مثال: بنك مصر - حساب رقم 123456789 - IBAN: EG0000000000000000000000"
                  >${settings.bankAccountDetails || ''}</textarea>
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                    تظهر بيانات الحساب للطلاب الراغبين في التحويل البنكي المباشر
                  </span>
                </div>

                <!-- Payment Instructions -->
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.88rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <i data-lucide="file-text" style="width:16px; height:16px; color:#f59e0b;"></i>
                    <span>ملاحظات وتعليمات التحويل للطلاب (Payment Notes / Notice)</span>
                  </label>
                  <textarea 
                    id="setting-payment-instructions" 
                    class="form-input" 
                    style="height:65px; resize:vertical; padding:12px; font-size:0.9rem; line-height:1.5; border-radius:12px;" 
                    placeholder="مثال: يرجى إتمام التحويل بالمبلغ المطلوب ثم إدخال بيانات العملية وإرفاق صورة الإيصال بالأسفل لاعتماد اشتراكك فورياً."
                  >${settings.paymentInstructions || ''}</textarea>
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                    التنبيه أو التعليمات التي تقرأها الطالب أسفل أرقام التحويل المالي مباشرةً
                  </span>
                </div>
              </div>

              <!-- Submit Button -->
              <div style="display:flex; justify-content:flex-end; align-items:center; gap:14px; margin-top:10px; padding-top:18px; border-top:1px solid var(--border-color);">
                <button type="submit" id="save-platform-settings-btn" class="btn-primary" style="padding:14px 34px; font-size:0.95rem; font-weight:900; border-radius:16px; display:inline-flex; align-items:center; gap:10px; background:linear-gradient(135deg, #059669, #10b981); border:none; box-shadow:0 6px 20px rgba(16,185,129,0.35);">
                  <i data-lucide="check-circle-2" style="width:20px; height:20px;"></i>
                  <span>حفظ إعدادات المنصة وبيانات التحويل 💾</span>
                </button>
              </div>

            </form>

          </div>

        </div>

      </div>
    `;
  }

};
