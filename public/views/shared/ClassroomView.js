import { apiFetch, state, showToast, formatSessionDateTime, canJoinSession, getSessionMeetingUrl } from "../../app.js";

export default class ClassroomView {
  constructor(container, sessionId) {
    this.container = container;
    this.sessionId = sessionId;
    this.session = null;
  }

  async render() {
    try {
      this.container.innerHTML = `
        <div style="text-align:center; padding:100px 24px; font-family:'Cairo', sans-serif;">
          <div style="display:inline-block; width:50px; height:50px; border:4px solid var(--border-color); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:16px;"></div>
          <h3 style="font-size:1.1rem; color:var(--text-main); font-weight:800;">جاري التحقق من موعد الحصة ورابط Google Meet... 🎥</h3>
        </div>
      `;

      // Fetch session info
      const [sessions, myPrivateSessions] = await Promise.all([
        apiFetch("/sessions").catch(() => []),
        apiFetch("/sessions/my-private").catch(() => [])
      ]);
      const allSessions = [...(sessions || []), ...(myPrivateSessions || [])];
      this.session = allSessions.find(s => String(s.id) === String(this.sessionId));

      if (!this.session) {
        this.container.innerHTML = `
          <div style="text-align:center; padding:90px 24px; font-family:'Cairo', sans-serif; max-width:520px; margin:0 auto;">
            <div style="width:72px; height:72px; border-radius:20px; background:rgba(239,68,68,0.1); color:var(--error); display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
              <i data-lucide="alert-circle" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.4rem; font-weight:900; color:var(--text-main); margin-bottom:8px;">الحصة غير موجودة</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">تعذر العثور على بيانات هذه الحصة أو ربما تم حذفها.</p>
            <a href="#schedule" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none;">الرجوع إلى جدول الحصص</a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const isTeacher = state.user?.role === 'teacher' || (this.session.teacher && String(this.session.teacher.id) === String(state.user?.id));
      const isStudent = state.user?.role === 'student' || (this.session.student && String(this.session.student.id) === String(state.user?.id));

      const now = new Date();
      const sessionDate = this.session.scheduledAt ? new Date(this.session.scheduledAt) : null;
      const sessionTime = sessionDate ? sessionDate.getTime() : 0;
      const durationMins = this.session.duration || 60;
      const durationMs = durationMins * 60 * 1000;
      const isCompleted = this.session.status === 'COMPLETED' || this.session.status === 'completed';
      const isCancelled = this.session.status?.includes('CANCELLED');
      const isLive = this.session.status === 'live' || this.session.status === 'LIVE';

      const teacherWindowStart = sessionTime - (60 * 60 * 1000); // 1 hr
      const studentWindowStart = sessionTime - (30 * 60 * 1000); // 30 min
      const windowEnd = sessionTime + durationMs + (30 * 60 * 1000);

      const formatted = formatSessionDateTime(this.session.scheduledAt);
      const isExpired = !isLive && (now.getTime() > windowEnd);

      // 1. Expired Guard
      if (isExpired || isCompleted || isCancelled) {
        this.container.innerHTML = `
          <div style="text-align:center; padding:90px 24px; font-family:'Cairo', sans-serif; max-width:540px; margin:0 auto;">
            <div style="width:72px; height:72px; border-radius:20px; background:rgba(245,158,11,0.1); color:#f59e0b; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
              <i data-lucide="clock" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.4rem; font-weight:900; color:var(--text-main); margin-bottom:8px;">الحصة منتهية أو مكتملة</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">انتهى موعد هذه الحصة المباشرة ولا يمكن الانضمام إليها الآن.</p>
            <a href="#schedule" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none;">الرجوع لجدول الحصص</a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // 2. Early Guard
      const isTooEarly = isTeacher ? (now.getTime() < teacherWindowStart) : (now.getTime() < studentWindowStart);
      if (!isLive && isTooEarly) {
        const targetStart = isTeacher ? teacherWindowStart : studentWindowStart;
        const diffMs = targetStart - now.getTime();
        const minsLeft = Math.ceil(diffMs / 60000);
        let timeRemainingStr = `${minsLeft} دقيقة`;
        if (minsLeft >= 60) {
          const hrs = Math.floor(minsLeft / 60);
          const rem = minsLeft % 60;
          timeRemainingStr = `${hrs} ساعة ${rem > 0 ? `و ${rem}د` : ''}`;
        }

        this.container.innerHTML = `
          <div style="text-align:center; padding:80px 20px; font-family:'Cairo', sans-serif; max-width:540px; margin:0 auto;">
            <div style="width:76px; height:76px; border-radius:24px; background:rgba(99,102,241,0.1); color:var(--primary); display:inline-flex; align-items:center; justify-content:center; margin-bottom:20px; border:1px solid rgba(99,102,241,0.2);">
              <i data-lucide="lock" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.5rem; font-weight:900; color:var(--text-main); margin-bottom:8px;">رابط Google Meet غير نشط بعد 🔒</h2>
            <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin-bottom:20px;">
              ${isTeacher 
                ? "يتاح للمعلم دخول الحصة قبل الموعد بـ <strong>60 دقيقة</strong>." 
                : "ينشط زر الانضمام للطلاب عبر Google Meet <strong>قبل موعد الحصة بـ 30 دقيقة فقط</strong>."}
            </p>
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:18px 22px; margin-bottom:24px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">🗓️ الموعد الرسمي للحصة:</div>
              <div style="font-size:1.1rem; font-weight:900; color:var(--primary);">${formatted.fullStr}</div>
              <div style="font-size:0.84rem; color:#f59e0b; font-weight:800; margin-top:4px;">⏳ ينشط رابط Google Meet بعد: ${timeRemainingStr}</div>
            </div>
            <a href="#schedule" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; padding:10px 24px;">الرجوع لجدول الحصص</a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // 3. Time is Valid! Resolve Google Meet link
      const meetUrl = getSessionMeetingUrl(this.session);

      // Record attendance in background
      apiFetch(`/sessions/${this.sessionId}/checkin`, { method: "POST" })
        .then(() => {
          window.checkedInSessions = window.checkedInSessions || new Set();
          window.checkedInSessions.add(String(this.sessionId));
        })
        .catch(() => {});

      if (!meetUrl) {
        this.container.innerHTML = `
          <div style="text-align:center; padding:80px 20px; font-family:'Cairo', sans-serif; max-width:540px; margin:0 auto;">
            <div style="width:76px; height:76px; border-radius:24px; background:rgba(245,158,11,0.12); color:#f59e0b; display:inline-flex; align-items:center; justify-content:center; margin-bottom:20px; border:1px solid rgba(245,158,11,0.25);">
              <i data-lucide="video-off" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.4rem; font-weight:900; color:var(--text-main); margin-bottom:8px;">لم يتم إضافة رابط Google Meet بعد</h2>
            <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.6; margin-bottom:22px;">
              الحصة في موعدها، ولكن لم يقم المعلم أو الإدارة بإدراج رابط Google Meet الخاص بالحصة بعد. يرجى مراجعة المعلم أو التواصل مع الدعم الفني.
            </p>
            <a href="#schedule" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; padding:10px 22px;">الرجوع لجدول الحصص</a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // Attempt automatic redirect to Google Meet
      window.open(meetUrl, "_blank", "noopener,noreferrer");

      // Render sleek redirect & action card
      this.container.innerHTML = `
        <div style="text-align:center; padding:80px 24px; font-family:'Cairo', sans-serif; max-width:560px; margin:0 auto;">
          <div style="width:84px; height:84px; border-radius:28px; background:linear-gradient(135deg, #10b981, #059669); color:#fff; display:inline-flex; align-items:center; justify-content:center; margin-bottom:20px; box-shadow:0 10px 30px rgba(16,185,129,0.35);">
            <i data-lucide="video" style="width:42px; height:42px;"></i>
          </div>
          <h2 style="font-size:1.6rem; font-weight:900; color:var(--text-main); margin-bottom:8px;">الانتقال إلى Google Meet 🎥</h2>
          <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:24px;">
            تم تأكيد حضورك في الحصة بنجاح ✅ وجاري تحويلك إلى قاعة Google Meet المباشرة.
          </p>

          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:18px; padding:22px; margin-bottom:26px; display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:0.95rem; font-weight:800; color:var(--text-main);">${this.session.title || 'حصة تعليمية مباشرة'}</div>
            <div style="font-size:0.82rem; color:var(--text-muted);">المعلم: <strong>${this.session.teacher?.name || 'معلم المنصة'}</strong></div>
            <div style="font-size:0.82rem; color:var(--primary); font-weight:700;">🗓️ ${formatted.fullStr}</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
            <a href="${meetUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="width:100%; max-width:340px; padding:13px 24px; font-size:1.02rem; font-weight:900; border-radius:14px; background:linear-gradient(135deg, #10b981, #059669); color:#fff; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 6px 20px rgba(16,185,129,0.3);">
              <i data-lucide="external-link" style="width:18px; height:18px;"></i>
              <span>فتح Google Meet الآن 🚀</span>
            </a>
            <a href="#schedule" class="btn-secondary" style="font-size:0.85rem; padding:8px 18px; text-decoration:none;">
              الرجوع إلى جدول الحصص
            </a>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      console.error("Classroom redirect error:", err);
      this.container.innerHTML = `
        <div style="text-align:center; padding:80px 24px; font-family:'Cairo', sans-serif;">
          <h2>حدث خطأ أثناء فتح الحصة</h2>
          <a href="#schedule" class="btn-primary" style="margin-top:16px;">الرجوع لجدول الحصص</a>
        </div>
      `;
    }
  }
}
