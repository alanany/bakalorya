import { apiFetch, showToast, t } from "../../app.js";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default class TeacherAvailabilityView {
  constructor(container) {
    this.container = container;
    this.availability = [];
  }

  async render() {
    try {
      const availability = await apiFetch("/teacher/availability/mine").catch(() => []);
      this.availability = availability || [];

      this.container.innerHTML = `
        <div class="teacher-layout">
          <div class="teacher-header-row" style="margin-bottom:30px;">
            <div>
              <h2 style="font-size: 1.8rem; font-weight:800; margin-bottom: 8px;">مواعيد التوفر الأسبوعية</h2>
              <p style="color:var(--text-muted)">إدارة الأوقات التي تكون متاحاً فيها لحجز الحصص الخاصة من قبل الطلاب.</p>
            </div>
            <div class="teacher-actions-top">
              <button class="btn-primary" id="add-availability-btn" style="font-size:0.9rem; padding:8px 20px;">
                <i data-lucide="plus" style="width:16px;height:16px;"></i> إضافة موعد
              </button>
            </div>
          </div>

          <div class="glass-card" style="padding: 24px;">
            ${this.availability.length === 0 ? `
              <div style="text-align:center; padding: 40px; color:var(--text-muted);">
                <i data-lucide="clock" style="width:48px;height:48px; margin-bottom:16px; opacity:0.3; display:block; margin: 0 auto 16px auto;"></i>
                <h3 style="margin-bottom:8px; color:var(--text-main);">لم تحدد مواعيد توفرك بعد</h3>
                <p>اضغط على "إضافة موعد" لتحديد الأوقات المتاحة للطلاب لحجز الحصص الخاصة معك.</p>
              </div>
            ` : `
              <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:16px;" id="availability-slots-container">
                ${this.renderAvailabilitySlots()}
              </div>
            `}
          </div>
        </div>

        <!-- Availability Modal -->
        <div class="modal-overlay" id="availability-modal" style="display:none; backdrop-filter:blur(8px); background:rgba(0,0,0,0.6);">
          <div class="modal-content" style="max-width:440px; width:92%; border-radius:20px; padding:0; border:1px solid var(--border-color);">
            <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin:0; font-size:1.1rem; font-weight:800;">🕐 إضافة موعد توفر أسبوعي</h3>
              <span id="close-availability-modal" style="cursor:pointer; font-size:1.4rem; color:var(--text-muted);">&times;</span>
            </div>
            <div style="padding:24px; display:flex; flex-direction:column; gap:16px;">
              <div class="form-group" style="margin:0;">
                <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">يوم الأسبوع</label>
                <select id="avail-day" class="form-select" style="border-radius:12px; padding:10px 14px;">
                  <option value="0">الأحد</option>
                  <option value="1">الاثنين</option>
                  <option value="2">الثلاثاء</option>
                  <option value="3">الأربعاء</option>
                  <option value="4">الخميس</option>
                  <option value="5">الجمعة</option>
                  <option value="6" selected>السبت</option>
                </select>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">وقت البداية</label>
                  <input type="time" id="avail-start" class="form-input" value="17:00" style="border-radius:12px; padding:10px 14px;">
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-weight:700; font-size:0.88rem; margin-bottom:6px; display:block;">وقت الانتهاء</label>
                  <input type="time" id="avail-end" class="form-input" value="21:00" style="border-radius:12px; padding:10px 14px;">
                </div>
              </div>
              <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">سيتمكن الطلاب من حجز حصة خلال هذا الوقت المتاح.</p>
              <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary" id="cancel-availability-modal" style="padding:9px 18px; border-radius:30px;">إلغاء</button>
                <button class="btn-primary" id="save-availability-btn" style="padding:9px 20px; border-radius:30px; font-weight:800;">💾 حفظ الموعد</button>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();

    } catch (err) {
      this.container.innerHTML = `<div class="error-msg">تعذر تحميل بيانات مواعيد التوفر.</div>`;
    }
  }

  renderAvailabilitySlots() {
    return this.availability.map(slot => `
      <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:12px; position:relative;">
        <h4 style="margin:0 0 6px 0; font-size:1rem; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:6px;">
          <i data-lucide="calendar" style="width:14px;height:14px;color:var(--primary);"></i>
          ${DAYS_AR[slot.dayOfWeek]}
        </h4>
        <div style="color:var(--text-muted); font-size:0.85rem; display:flex; align-items:center; gap:6px;">
          <i data-lucide="clock" style="width:12px;height:12px;"></i>
          ${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)}
        </div>
        <button class="delete-availability-btn" data-id="${slot.id}" style="position:absolute; top:10px; inset-inline-end:10px; background:none; border:none; color:var(--error,#ef4444); cursor:pointer; font-size:1rem;" title="حذف">&#10005;</button>
      </div>
    `).join('');
  }

  bindEvents() {
    const availModal = document.getElementById('availability-modal');

    document.getElementById('add-availability-btn')?.addEventListener('click', () => {
      availModal.style.display = 'flex';
    });
    document.getElementById('close-availability-modal')?.addEventListener('click', () => {
      availModal.style.display = 'none';
    });
    document.getElementById('cancel-availability-modal')?.addEventListener('click', () => {
      availModal.style.display = 'none';
    });

    document.getElementById('save-availability-btn')?.addEventListener('click', async () => {
      const dayOfWeek = parseInt(document.getElementById('avail-day').value);
      const startTime = document.getElementById('avail-start').value;
      const endTime = document.getElementById('avail-end').value;

      try {
        await apiFetch('/teacher/availability', {
          method: 'POST',
          body: JSON.stringify({ dayOfWeek, startTime, endTime })
        });
        showToast('تم حفظ موعد التوفر بنجاح!', 'success');
        availModal.style.display = 'none';
        this.render(); // re-render view
      } catch (err) {
        showToast(err.message || 'تعذر حفظ موعد التوفر', 'error');
      }
    });

    // Delete availability slots
    this.container.querySelectorAll('.delete-availability-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
        const id = btn.getAttribute('data-id');
        try {
          await apiFetch(`/teacher/availability/${id}`, { method: 'DELETE' });
          showToast('تم حذف الموعد', 'success');
          this.render(); // re-render view
        } catch (err) {
          showToast('فشل حذف الموعد', 'error');
        }
      });
    });
  }

  onDestroy() {}
}
