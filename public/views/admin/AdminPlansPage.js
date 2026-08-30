import { apiFetch, state, showToast, t, confirmDialog, renderPhoneInputGroup, getCleanWhatsAppNumber, renderEducationSelectHTML, handleWhatsAppResponse, formatSessionDateTime, getTimezoneBadgeHTML } from '../../app.js';

// ── AdminPlansPage ─────────────────────────────────────────────────────────────
// Methods extracted from AdminView.js — assigned to AdminView.prototype

export const AdminPlansPage = {

  renderPlansTab() {
    const plans = this.allPlans || [];

    return `
      <!-- Subscription Plans Section -->
      <div style="margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.2rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main);">✨ إدارة خطط الاشتراكات الشهرية لكافة الكورسات</h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">إدارة خطط الاشتراكات الشهرية المخصصة لكل كورس على حدة أو الخطط العامة.</p>
        </div>
        <button id="add-plan-btn" class="btn-primary" style="gap:8px; white-space:nowrap; padding:10px 20px; border-radius:12px;">
          <i data-lucide="plus-circle" style="width:18px;height:18px;"></i> إضافة خطة جديدة
        </button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
        ${plans.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
            <i data-lucide="sparkles" style="width:40px;height:40px;margin-bottom:12px;opacity:0.3;"></i>
            <p>لا توجد خطط اشتراك بعد. أضف أولى الخطط الآن!</p>
          </div>
        ` : plans.map(p => `
          <div class="glass-card" style="padding:22px; border-radius:18px; border:2px solid ${p.isActive ? 'var(--primary)' : 'var(--border-color)'}; position:relative; ${!p.isActive ? 'opacity:0.65;' : ''}">
            ${p.isActive ? '' : '<span style="position:absolute;top:14px;left:14px;background:var(--error,#ef4444);color:#fff;font-size:0.72rem;font-weight:800;padding:3px 10px;border-radius:10px;">غير نشطة</span>'}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
              <div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                  <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:inline-block;">
                    ${p.sessionsCount} حصة / ${p.durationDays} يوم
                  </span>
                  <span style="font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px; background:rgba(99,102,241,0.12); color:var(--primary); display:inline-block;">
                    ${p.course?.title ? `📚 كورس: ${p.course.title}` : '🌐 عام (جميع الكورسات)'}
                  </span>
                </div>
                <h3 style="font-weight:800; font-size:1.15rem; margin:0; color:var(--text-main);">${p.name}</h3>
              </div>
              <div style="text-align:end;">
                <div style="font-size:1.5rem; font-weight:900; color:var(--primary);">${p.price}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${p.currency}</div>
              </div>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px; min-height:38px; line-height:1.5;">${p.description || 'بدون وصف'}</p>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:18px; text-align:center;">
              <div style="background:var(--bg-app); border-radius:10px; padding:8px; border:1px solid var(--border-color);">
                <div style="font-size:0.7rem; color:var(--text-muted);">المدة</div>
                <div style="font-size:0.85rem; font-weight:800;">${p.durationDays} يوم</div>
              </div>
              <div style="background:var(--bg-app); border-radius:10px; padding:8px; border:1px solid var(--border-color);">
                <div style="font-size:0.7rem; color:var(--text-muted);">مدة الحصة</div>
                <div style="font-size:0.85rem; font-weight:800;">${p.sessionDurationMins} دقيقة</div>
              </div>
              <div style="background:var(--bg-app); border-radius:10px; padding:8px; border:1px solid var(--border-color);">
                <div style="font-size:0.7rem; color:var(--text-muted);">الحصص</div>
                <div style="font-size:0.85rem; font-weight:800;">${p.sessionsCount} حصة</div>
              </div>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="calendar" style="width:12px;height:12px;color:var(--primary);"></i>
              <span>تاريخ الإضافة: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-secondary edit-plan-btn" data-id="${p.id}" style="flex:1; justify-content:center; font-size:0.82rem; border-color:var(--primary); color:var(--primary); font-weight:700;">
                <i data-lucide="pencil" style="width:14px;height:14px;"></i> تعديل
              </button>
              <button class="btn-secondary toggle-plan-btn" data-id="${p.id}" data-active="${p.isActive}" style="flex:1; justify-content:center; font-size:0.82rem; font-weight:700; ${p.isActive ? 'border-color:var(--error,#ef4444);color:var(--error,#ef4444);' : 'border-color:var(--success,#10b981);color:var(--success,#10b981);'}">
                <i data-lucide="${p.isActive ? 'eye-off' : 'eye'}" style="width:14px;height:14px;"></i> ${p.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderPlanModal(plan = null) {
    const isEdit = !!plan;
    const modalId = 'plan-modal-overlay';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.display = 'flex';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.background = 'rgba(0,0,0,0.6)';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:560px; width:92%; border-radius:24px; border:1px solid var(--border-color); padding:0; background:var(--bg-card);">
        <div class="modal-header" style="padding:22px 28px; background:linear-gradient(135deg, rgba(0,86,210,0.08), rgba(168,85,247,0.08)); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:44px; height:44px; border-radius:12px; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center;">
              <i data-lucide="sparkles" style="width:22px;height:22px;"></i>
            </div>
            <div>
              <h3 style="font-size:1.1rem; font-weight:800; margin:0; color:var(--text-main);">${isEdit ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك جديدة'}</h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">تخصيص الخطة لكورس معين أو لجميع الكورسات على المنصة</p>
            </div>
          </div>
          <span id="close-plan-modal" style="font-size:1.4rem; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
        </div>
        <div style="padding:28px; background:var(--bg-app); max-height:70vh; overflow-y:auto;">
          <form id="plan-form" style="display:flex; flex-direction:column; gap:16px;">
            <input type="hidden" id="plan-id" value="${plan?.id || ''}">
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">اسم الخطة <span style="color:var(--error,#ef4444);">*</span></label>
              <input type="text" id="plan-name" class="form-input" required style="width:100%; padding:10px;" placeholder="مثال: اشتراك كورس الفيزياء الشهري" value="${plan?.name || ''}">
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">الكورس المخصص لخطة الاشتراك (اختياري)</label>
              <select id="plan-course-id" class="form-input" style="width:100%; padding:10px;">
                <option value="">-- 🌐 عام (تنطبق على جميع الكورسات) --</option>
                ${(this.courses || []).map(c => `
                  <option value="${c.id}" ${(plan?.course?.id === c.id || plan?.courseId === c.id) ? 'selected' : ''}>
                    📚 ${c.title} (${c.category || 'عام'})
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">الوصف</label>
              <textarea id="plan-desc" class="form-input" rows="2" style="width:100%; padding:10px; resize:vertical;" placeholder="وصف مختصر لما تتضمنه هذه الخطة...">${plan?.description || ''}</textarea>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">عدد الحصص <span style="color:var(--error,#ef4444);">*</span></label>
                <input type="number" id="plan-sessions" class="form-input" required min="1" style="width:100%; padding:10px;" placeholder="مثال: 8" value="${plan?.sessionsCount || ''}">
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">مدة الخطة (أيام) <span style="color:var(--error,#ef4444);">*</span></label>
                <input type="number" id="plan-duration" class="form-input" required min="1" style="width:100%; padding:10px;" placeholder="مثال: 30" value="${plan?.durationDays || 30}">
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px;">
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">السعر <span style="color:var(--error,#ef4444);">*</span></label>
                <input type="number" id="plan-price" class="form-input" required min="0" style="width:100%; padding:10px;" placeholder="مثال: 600" value="${plan?.price || ''}">
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">العملة</label>
                <input type="text" id="plan-currency" class="form-input" style="width:100%; padding:10px;" placeholder="EGP" value="${plan?.currency || 'EGP'}">
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom:6px;">مدة الحصة (دقيقة)</label>
                <input type="number" id="plan-session-mins" class="form-input" min="15" style="width:100%; padding:10px;" value="${plan?.sessionDurationMins || 60}">
              </div>
            </div>
            <div>
              <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                <input type="checkbox" id="plan-active" ${(!plan || plan.isActive) ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--primary);">
                <span style="font-size:0.9rem; font-weight:600;">الخطة نشطة وظاهرة للطلاب</span>
              </label>
            </div>
            <div style="display:flex; gap:12px; margin-top:8px; justify-content:flex-end;">
              <button type="button" id="cancel-plan-modal" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">${isEdit ? 'حفظ التعديلات ✅' : 'إضافة الخطة 🚀'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => overlay.remove();
    document.getElementById('close-plan-modal')?.addEventListener('click', closeModal);
    document.getElementById('cancel-plan-modal')?.addEventListener('click', closeModal);

    document.getElementById('plan-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('plan-id').value;
      const payload = {
        name: document.getElementById('plan-name').value.trim(),
        courseId: document.getElementById('plan-course-id').value || null,
        description: document.getElementById('plan-desc').value.trim(),
        sessionsCount: parseInt(document.getElementById('plan-sessions').value),
        durationDays: parseInt(document.getElementById('plan-duration').value),
        price: parseFloat(document.getElementById('plan-price').value),
        currency: document.getElementById('plan-currency').value.trim() || 'EGP',
        sessionDurationMins: parseInt(document.getElementById('plan-session-mins').value) || 60,
        isActive: document.getElementById('plan-active').checked
      };

      try {
        if (id) {
          await apiFetch(`/subscription-plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('تم تحديث الخطة بنجاح! ✅', 'success');
        } else {
          await apiFetch('/subscription-plans', { method: 'POST', body: JSON.stringify(payload) });
          showToast('تم إضافة الخطة بنجاح! 🚀', 'success');
        }
        closeModal();
        await this.loadAllData();
        this.renderTab('plans');
      } catch (err) {
        showToast(err.message || 'فشل حفظ الخطة.', 'error');
      }
    });
  }

  // ── Render Group Session Modal ─────────────────────────────────────────────

};
