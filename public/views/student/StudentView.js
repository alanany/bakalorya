import { apiFetch, state, showToast, t, renderCourseCard, canJoinSession, getMinSessionDateTimeISO, validateSessionScheduledDate, formatSessionDateTime, getTimezoneBadgeHTML, getUserTimezone, getTimezoneInfo, TIMEZONE_MAP, renderEducationSelectHTML } from "../../app.js";
import { StudentFeedbackModal } from "../shared/StudentFeedbackModal.js";

// Helper: Normalize Grade Key across curricula and Arabic/English strings
export function normalizeGradeKey(raw) {
  if (!raw) return "";
  let s = String(raw).toLowerCase().trim();
  s = s
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "");

  // Secondary 3 / Entlq 3 / Thanawya Amma / BAC / Grade 12
  if (
    s.includes("sec_3") || s.includes("sec 3") || s.includes("grade 12") ||
    s.includes("entlq 3") || s.includes("bac") || s.includes("3ث") ||
    s.includes("ثانويه عامه") || s.includes("ثانويه العامه") ||
    (s.includes("ثانوي") && (s.includes("ثالث") || s.includes("3")))
  ) {
    return "sec_3";
  }

  // Secondary 2 / Entlq 2 / Grade 11
  if (
    s.includes("sec_2") || s.includes("sec 2") || s.includes("grade 11") ||
    s.includes("entlq 2") || s.includes("2ث") ||
    (s.includes("ثانوي") && (s.includes("ثاني") || s.includes("2")))
  ) {
    return "sec_2";
  }

  // Secondary 1 / Entlq 1 / Grade 10
  if (
    s.includes("sec_1") || s.includes("sec 1") || s.includes("grade 10") ||
    s.includes("entlq 1") || s.includes("1ث") ||
    (s.includes("ثانوي") && (s.includes("اول") || s.includes("1")))
  ) {
    return "sec_1";
  }

  // Preparatory 3 / Grade 9 / BEM
  if (
    s.includes("prep_3") || s.includes("prep 3") || s.includes("grade 9") ||
    s.includes("bem") || s.includes("3 اعدادي") || s.includes("3ع") ||
    ((s.includes("اعدادي") || s.includes("متوسط")) && (s.includes("ثالث") || s.includes("تاسع") || s.includes("3") || s.includes("9")))
  ) {
    return "grade_9";
  }

  // Preparatory 2 / Grade 8
  if (
    s.includes("prep_2") || s.includes("prep 2") || s.includes("grade 8") ||
    s.includes("2 اعدادي") || s.includes("2ع") ||
    ((s.includes("اعدادي") || s.includes("متوسط")) && (s.includes("ثاني") || s.includes("ثامن") || s.includes("2") || s.includes("8")))
  ) {
    return "grade_8";
  }

  // Preparatory 1 / Grade 7
  if (
    s.includes("prep_1") || s.includes("prep 1") || s.includes("grade 7") ||
    s.includes("1 اعدادي") || s.includes("1ع") ||
    ((s.includes("اعدادي") || s.includes("متوسط")) && (s.includes("اول") || s.includes("سابع") || s.includes("1") || s.includes("7")))
  ) {
    return "grade_7";
  }

  // Primary 6 / Grade 6
  if (
    s.includes("pri_6") || s.includes("pri 6") || s.includes("grade 6") ||
    ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("سادس") || s.includes("6"))) ||
    s.includes("6 ابتدائي") || s.includes("سادس ابتدائي")
  ) {
    return "grade_6";
  }

  // Primary 5 / Grade 5
  if (
    s.includes("pri_5") || s.includes("pri 5") || s.includes("grade 5") ||
    ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("خامس") || s.includes("5"))) ||
    s.includes("5 ابتدائي") || s.includes("خامس ابتدائي")
  ) {
    return "grade_5";
  }

  // Primary 4 / Grade 4
  if (
    s.includes("pri_4") || s.includes("pri 4") || s.includes("grade 4") ||
    ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("رابع") || s.includes("4"))) ||
    s.includes("4 ابتدائي") || s.includes("رابع ابتدائي")
  ) {
    return "grade_4";
  }

  // Primary 3 / Grade 3
  if (
    s.includes("pri_3") || s.includes("pri 3") || s.includes("grade 3") ||
    ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("ثالث") || s.includes("3"))) ||
    s.includes("3 ابتدائي") || s.includes("ثالث ابتدائي")
  ) {
    return "grade_3";
  }

  // Primary 2 / Grade 2
  if (
    s.includes("pri_2") || s.includes("pri 2") || s.includes("grade 2") ||
    ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("ثاني") || s.includes("2"))) ||
    s.includes("2 ابتدائي") || s.includes("ثاني ابتدائي")
  ) {
    return "grade_2";
  }

  // Primary 1 / Grade 1
  if (
    s.includes("pri_1") || s.includes("pri 1") || s.includes("grade 1") ||
    ((s.includes("ابتدائي") || s.includes("primary")) && (s.includes("اول") || s.includes("1"))) ||
    s.includes("1 ابتدائي") || s.includes("اول ابتدائي")
  ) {
    return "grade_1";
  }

  return s;
}

export const KNOWN_GRADE_KEYS = new Set([
  "sec_3", "sec_2", "sec_1",
  "grade_9", "grade_8", "grade_7",
  "grade_6", "grade_5", "grade_4", "grade_3", "grade_2", "grade_1"
]);

// Helper: Check if course matches student's educational stage/degree
export function isCourseMatchingStudentGrade(course, studentEdu) {
  if (!studentEdu || !course) return false;
  const sKey = normalizeGradeKey(studentEdu);
  if (!sKey || !KNOWN_GRADE_KEYS.has(sKey)) return false;

  // 1. Check direct course.grade object (most accurate)
  if (course.grade) {
    const gCode = normalizeGradeKey(course.grade.code);
    if (gCode && KNOWN_GRADE_KEYS.has(gCode)) return gCode === sKey;
    const gName = normalizeGradeKey(course.grade.name);
    if (gName && KNOWN_GRADE_KEYS.has(gName)) return gName === sKey;
    const gNameEn = normalizeGradeKey(course.grade.nameEn);
    if (gNameEn && KNOWN_GRADE_KEYS.has(gNameEn)) return gNameEn === sKey;
  }

  // 2. Check degree string on course
  if (course.degree) {
    const degKey = normalizeGradeKey(course.degree);
    if (degKey && KNOWN_GRADE_KEYS.has(degKey)) return degKey === sKey;
  }

  // 3. Check subject grade if available
  if (course.subject?.grade) {
    const sgCode = normalizeGradeKey(course.subject.grade.code);
    if (sgCode && KNOWN_GRADE_KEYS.has(sgCode)) return sgCode === sKey;
    const sgName = normalizeGradeKey(course.subject.grade.name);
    if (sgName && KNOWN_GRADE_KEYS.has(sgName)) return sgName === sKey;
  }

  // 4. Check course title if it mentions a specific grade
  if (course.title) {
    const titleKey = normalizeGradeKey(course.title);
    if (titleKey && KNOWN_GRADE_KEYS.has(titleKey)) return titleKey === sKey;
  }

  // 5. Check category if it mentions a specific grade
  if (course.category) {
    const catKey = normalizeGradeKey(course.category);
    if (catKey && KNOWN_GRADE_KEYS.has(catKey)) return catKey === sKey;
  }

  return false;
}

// Helper: Format Student Grade Title for human display
export function getStudentGradeDisplay(eduStr) {
  if (!eduStr) return "لم يتم تحديد المرحلة بعد ⚠️";
  const key = normalizeGradeKey(eduStr);
  const gradeNames = {
    "sec_3": "الصف الثالث الثانوي (انطلق 3 - BAC)",
    "sec_2": "الصف الثاني الثانوي (انطلق 2)",
    "sec_1": "الصف الأول الثانوي (انطلق 1)",
    "grade_9": "الصف الثالث الإعدادي / 9 متوسط (Grade 9 BEM)",
    "grade_8": "الصف الثاني الإعدادي / 8 متوسط (Grade 8)",
    "grade_7": "الصف الأول الإعدادي / 7 متوسط (Grade 7)",
    "grade_6": "الصف السادس الابتدائي (Grade 6)",
    "grade_5": "الصف الخامس الابتدائي (Grade 5)",
    "grade_4": "الصف الرابع الابتدائي (Grade 4)",
    "grade_3": "الصف الثالث الابتدائي (Grade 3)",
    "grade_2": "الصف الثاني الابتدائي (Grade 2)",
    "grade_1": "الصف الأول الابتدائي (Grade 1)",
    "other": "مستوى تعليمي آخر"
  };

  if (gradeNames[key]) {
    return gradeNames[key];
  }

  const s = String(eduStr).toLowerCase().trim();
  const map = {
    "entlq 1": "الصف الأول الثانوي (انطلق 1)",
    "entlq 2": "الصف الثاني الثانوي (انطلق 2)",
    "entlq 3": "الصف الثالث الثانوي (انطلق 3 - BAC)",
    "bac": "الصف الثالث الثانوي (انطلق 3 - BAC)",
    "other": "مستوى تعليمي آخر"
  };
  return map[s] || eduStr;
}

export default class StudentView {
  constructor(container) {
    this.container = container;
    this.sessionFilter = "all";
    this.courseFilter = "all";
    this.rawSessions = [];
    this.enrollments = [];
    this.allCourses = [];
    this.subscriptions = [];
    this.assignments = [];
    this.stats = null;
  }

  async render() {
    this.container.innerHTML = `
      <div style="width:100%; min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; color:var(--text-muted);">
        <div class="spinner" style="width:44px; height:44px; border-width:3px; margin-bottom:16px;"></div>
        <p style="font-weight:700; font-size:1rem;">جاري تحضير مساحتك التعليمية الذكية...</p>
      </div>
    `;

    try {
      const [stats, enrollments, allCourses, sessions, subscriptions, assignments, meData] = await Promise.all([
        apiFetch("/student/stats").catch(() => ({ totalCourses: 0, completedLessonsCount: 0, studyHours: 0 })),
        apiFetch("/student/enrollments").catch(() => []),
        apiFetch("/courses").catch(() => []),
        apiFetch("/sessions").catch(() => []),
        apiFetch("/subscriptions/my").catch(() => []),
        apiFetch("/assignments").catch(() => []),
        apiFetch("/auth/me").catch(() => null)
      ]);

      if (meData) {
        state.user = { ...state.user, ...meData };
      }

      this.stats = stats || { totalCourses: 0, completedLessonsCount: 0, studyHours: 0 };
      this.enrollments = Array.isArray(enrollments) ? enrollments : [];
      this.allCourses = Array.isArray(allCourses) ? allCourses : [];
      this.rawSessions = Array.isArray(sessions) ? sessions : [];
      this.subscriptions = Array.isArray(subscriptions) ? subscriptions : [];
      this.assignments = Array.isArray(assignments) ? assignments : [];

      this.renderDashboard();
    } catch (err) {
      console.error("Dashboard loading error:", err);
      this.container.innerHTML = `
        <div class="glass-card" style="max-width:600px; margin:60px auto; padding:40px; text-align:center;">
          <i data-lucide="alert-circle" style="width:48px; height:48px; color:var(--error); margin-bottom:16px;"></i>
          <h3 style="font-size:1.4rem; font-weight:800; margin-bottom:8px;">تعذر تحميل لوحة التحكم</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">حدث خطأ أثناء استرداد بياناتك، يرجى المحاولة مرة أخرى.</p>
          <button onclick="window.location.reload()" class="btn-primary" style="margin:0 auto; padding:10px 24px; border-radius:30px;">
            <i data-lucide="rotate-cw"></i> إعادة التحميل
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderDashboard() {
    const studentName = state.user?.name || "طالب العلم";
    const studentAvatar = state.user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(studentName)}`;
    
    // Greeting by time of day
    const hour = new Date().getHours();
    let timeGreeting = "مرحباً بك";
    let greetingIcon = "sparkles";
    if (hour >= 5 && hour < 12) {
      timeGreeting = "صباح الهمة والنشاط ☀️";
      greetingIcon = "sun";
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = "طاب يومك بكل خير 🌤️";
      greetingIcon = "sun-medium";
    } else {
      timeGreeting = "مساء التميز والإنجاز 🌙";
      greetingIcon = "moon";
    }

    const todaySessions = this.filterTodaySessions(this.rawSessions);
    const recentReportSessions = (this.rawSessions || [])
      .filter(s => (s.status === "completed" || s.status === "COMPLETED" || Boolean(s.completedAt) || Boolean(s.whatWasCovered || s.homework || s.topic)))
      .sort((a, b) => new Date(b.scheduledAt || b.completedAt || 0) - new Date(a.scheduledAt || a.completedAt || 0))
      .slice(0, 3);
    const pendingAssignments = this.assignments.filter(a => !a.submission);
    const gradedAssignments = (this.assignments || [])
      .filter(a => a.submission && (a.submission.status === 'graded' || (a.submission.grade !== null && a.submission.grade !== undefined)))
      .sort((a, b) => new Date(b.submission.gradedAt || b.submission.submittedAt || 0) - new Date(a.submission.gradedAt || a.submission.submittedAt || 0));
    
    // Extract student's groups (sorted newer first by enrollment date)
    const groupMap = {};
    const nowTime = Date.now();

    (this.enrollments || []).forEach(enr => {
      if (enr.group) {
        const g = enr.group;
        const key = `group_${g.id}`;
        if (!groupMap[key]) {
          groupMap[key] = {
            id: g.id,
            title: g.name || `${enr.course?.title || 'مجموعة'} - الفوج`,
            courseTitle: enr.course?.title || 'دورة دراسية',
            courseImage: enr.course?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300',
            gradeName: enr.course?.grade?.name || '',
            subjectName: enr.course?.subject?.name || '',
            teacher: g.teacher || enr.course?.teacher || null,
            scheduleText: g.scheduleText || (g.scheduleDays ? `${g.scheduleDays} ${g.scheduleTime ? 'الساعة ' + g.scheduleTime : ''}` : ''),
            meetingLink: g.meetingLink || enr.course?.meetingLink || null,
            status: enr.status,
            createdAt: enr.createdAt || 0,
            sessions: []
          };
        }
      } else if (enr.course) {
        const key = `course_${enr.course.id}`;
        if (!groupMap[key]) {
          groupMap[key] = {
            id: null,
            courseId: enr.course.id,
            title: enr.course.title || 'مجموعة دراسية',
            courseTitle: enr.course.title || 'دورة دراسية',
            courseImage: enr.course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300',
            gradeName: enr.course.grade?.name || '',
            subjectName: enr.course.subject?.name || '',
            teacher: enr.course.teacher || null,
            scheduleText: '',
            meetingLink: enr.course.meetingLink || null,
            status: enr.status,
            createdAt: enr.createdAt || 0,
            sessions: []
          };
        }
      }
    });

    // Link rawSessions to groups to detect live and upcoming sessions
    (this.rawSessions || []).forEach(s => {
      const courseId = s.course?.id;
      const matchingKey = Object.keys(groupMap).find(k => {
        const g = groupMap[k];
        return (g.courseId && g.courseId === courseId) || (g.courseTitle && g.courseTitle === s.course?.title);
      });
      if (matchingKey) {
        groupMap[matchingKey].sessions.push(s);
      }
    });

    const recentGroups = Object.values(groupMap)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    recentGroups.forEach(g => {
      let live = null;
      let nextSess = null;
      (g.sessions || []).forEach(s => {
        const sTime = new Date(s.scheduledAt).getTime();
        const durM = s.duration || 60;
        const diffM = (sTime - nowTime) / 60000;
        const isLive = (s.status === "live" || s.status === "active") || (diffM <= 0 && diffM > -durM);
        if (isLive && !live) live = s;
        if (diffM > 0 && (!nextSess || sTime < new Date(nextSess.scheduledAt).getTime())) {
          nextSess = s;
        }
      });
      g.liveSession = live;
      g.nextSession = nextSess;
    });

    // Recommended courses (strictly matching the student's grade/degree)
    const enrolledIds = new Set(this.enrollments.map(e => e.course?.id).filter(Boolean));
    const studentEdu = state.user?.education;
    const candidateCourses = this.allCourses.filter(c => !enrolledIds.has(c.id) && (c.status === "PUBLISHED" || !c.status));
    
    // Match courses specifically for student's grade/degree
    let recommendedCourses = studentEdu ? candidateCourses.filter(c => isCourseMatchingStudentGrade(c, studentEdu)) : [];
    recommendedCourses = recommendedCourses.slice(0, 6);

    // Private sessions summary
    const totalRemainingCredits = this.subscriptions.reduce((sum, s) => sum + (s.remainingCredits || 0), 0);

    // Circular metrics calculations
    const completedLessons = this.stats?.completedLessonsCount || 0;
    const studyHours = this.stats?.studyHours || 0;
    const groupCount = this.enrollments.length;
    const privateCredits = totalRemainingCredits;

    // Calculate circular stroke offsets for circumference 226 (r=36)
    const lessonsPct = Math.min(100, Math.max(15, Math.round((completedLessons / Math.max(completedLessons + 5, 20)) * 100)));
    const lessonsOffset = Math.round(226 - (226 * lessonsPct / 100));

    const groupsPct = Math.min(100, Math.max(20, Math.min(100, groupCount * 25)));
    const groupsOffset = Math.round(226 - (226 * groupsPct / 100));

    const hoursPct = Math.min(100, Math.max(15, Math.min(100, studyHours * 10)));
    const hoursOffset = Math.round(226 - (226 * hoursPct / 100));

    const creditsPct = Math.min(100, Math.max(15, Math.min(100, privateCredits * 20)));
    const creditsOffset = Math.round(226 - (226 * creditsPct / 100));

    const userTz = getUserTimezone();
    const tzInfo = getTimezoneInfo(userTz);

    this.container.innerHTML = `
      <style>
        @keyframes pulseBroadcast {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
          50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
        @keyframes radarPing {
          0% { transform: scale(0.95); opacity: 0.85; }
          50% { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        .student-dashboard-modern {
          animation: fadeInDashboard 0.35s ease-out;
        }
        @keyframes fadeInDashboard {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .circular-metrics-hub {
          padding: 20px 24px;
          border-radius: 26px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          margin-bottom: 26px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.03);
        }
        .circle-stat-pod {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .circle-stat-pod:hover {
          transform: translateY(-4px) scale(1.03);
        }
        .circle-ring-wrapper {
          position: relative;
          width: 84px;
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: box-shadow 0.25s ease;
        }
        .circle-stat-pod:hover .circle-ring-wrapper {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.25);
        }
        .circle-ring-value {
          position: absolute;
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 1.25rem;
          font-weight: 900;
          color: var(--text-main);
          line-height: 1;
        }
        .circle-stat-label {
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--text-main);
          text-align: center;
        }
        .circle-stat-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 700;
          text-align: center;
        }
        .creative-live-stage {
          position: relative;
          border-radius: 24px;
          background: radial-gradient(circle at 95% 5%, rgba(16,185,129,0.12) 0%, transparent 40%), radial-gradient(circle at 5% 95%, rgba(99,102,241,0.08) 0%, transparent 40%), var(--bg-card);
          border: 1.5px solid rgba(16, 185, 129, 0.35);
          box-shadow: 0 16px 40px -12px rgba(16, 185, 129, 0.12);
          overflow: hidden;
          padding: 22px 24px;
          margin-bottom: 28px;
        }
        .compact-cohort-card {
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          padding: 18px;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 6px 20px rgba(0,0,0,0.03);
          cursor: pointer;
        }
        .compact-cohort-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.07);
          border-color: rgba(99,102,241,0.35);
        }
        .creative-session-card {
          border-radius: 22px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-card);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 24px rgba(0,0,0,0.035);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .creative-session-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(0,0,0,0.08);
          border-color: rgba(99, 102, 241, 0.35);
        }
        .creative-session-card.is-live {
          border-color: rgba(16, 185, 129, 0.55);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%);
          box-shadow: 0 14px 36px rgba(16, 185, 129, 0.18);
        }
      </style>

      <!-- SVG Gradients for Circular Gauges -->
      <svg width="0" height="0" style="position:absolute; pointer-events:none;">
        <defs>
          <linearGradient id="circ-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <linearGradient id="circ-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
          <linearGradient id="circ-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#06b6d4" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
          <linearGradient id="circ-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      <div class="student-dashboard-modern" style="width:100%; max-width:1440px; margin:0 auto; padding:24px 20px 80px; box-sizing:border-box;">
        
        <!-- Missing Education Level Alert Banner (if not set) -->
        ${!state.user?.education ? `
          <div class="glass-card" style="margin-bottom:24px; padding:18px 24px; border-radius:20px; background:linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06)); border:1.5px solid rgba(245,158,11,0.4); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; box-shadow:0 8px 24px rgba(245,158,11,0.12);">
            <div style="display:flex; align-items:center; gap:14px; min-width:260px; flex:1;">
              <div style="width:44px; height:44px; border-radius:14px; background:rgba(245,158,11,0.2); color:#f59e0b; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i data-lucide="alert-triangle" style="width:24px; height:24px;"></i>
              </div>
              <div>
                <strong style="font-size:0.98rem; color:var(--text-main); display:block; margin-bottom:2px;">تنبيه: لم تقم بتحديد مرحلتك الدراسية بعد! ⚠️</strong>
                <span style="font-size:0.82rem; color:var(--text-muted);">يرجى تحديد صفك ومستواك الأكاديمي لتخصيص الكورسات والمناهج المقترحة وحصص البث الملائمة لك تلقائياً.</span>
              </div>
            </div>
            <button type="button" class="btn-primary btn-change-student-grade" style="padding:10px 20px; border-radius:20px; font-weight:800; font-size:0.85rem; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; display:flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(245,158,11,0.35); color:#fff; cursor:pointer;">
              <i data-lucide="graduation-cap" style="width:16px;height:16px;"></i> تحديد المرحلة والصف الآن 🎓
            </button>
          </div>
        ` : ''}

        <!-- 1. Hero Studio Banner -->
        <div class="glass-card hero-student-banner" style="position:relative; overflow:hidden; border-radius:28px; padding:30px 34px; margin-bottom:24px; background:linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(147,51,234,0.08) 50%, rgba(16,185,129,0.08) 100%); border:1.5px solid var(--border-focus); box-shadow:0 12px 36px rgba(79,70,229,0.08);">
          
          <!-- Decorative Floating Glow Orbs -->
          <div style="position:absolute; top:-30px; left:-30px; width:160px; height:160px; background:radial-gradient(circle, rgba(79,70,229,0.25) 0%, rgba(79,70,229,0) 70%); border-radius:50%; pointer-events:none;"></div>
          <div style="position:absolute; bottom:-40px; right:-20px; width:180px; height:180px; background:radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0) 70%); border-radius:50%; pointer-events:none;"></div>

          <div style="position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:24px;">
            
            <!-- Left Info -->
            <div style="display:flex; align-items:center; gap:20px; flex:1; min-width:280px;">
              <div style="position:relative; flex-shrink:0;">
                <img src="${studentAvatar}" alt="${studentName}" style="width:74px; height:74px; border-radius:50%; border:3px solid var(--primary); object-fit:cover; background:var(--bg-app); box-shadow:0 8px 24px rgba(79,70,229,0.25);">
                <span style="position:absolute; bottom:2px; right:2px; width:16px; height:16px; background:#10b981; border:2px solid var(--bg-card); border-radius:50%;" title="متصل الآن"></span>
              </div>

              <div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                  <span style="font-size:0.85rem; font-weight:800; color:var(--primary); background:var(--primary-glow); padding:3px 12px; border-radius:20px; border:1px solid rgba(79,70,229,0.2); display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="${greetingIcon}" style="width:13px;height:13px;"></i> ${timeGreeting}
                  </span>
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); background:rgba(0,0,0,0.03); padding:3px 10px; border-radius:20px;">
                    🎓 حساب طالب رسمي
                  </span>
                </div>

                <h1 style="font-size:clamp(1.4rem, 4vw, 1.9rem); font-weight:900; margin:0 0 6px 0; color:var(--text-main); letter-spacing:-0.5px;">
                  أهلاً بك مجدداً، <span style="background:linear-gradient(135deg, var(--primary), #9333ea); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${studentName}</span> 👋
                </h1>
                
                <!-- Educational Data Pill Line in Hero -->
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px; margin-bottom:4px;">
                  <span class="badge" style="font-size:0.82rem; font-weight:800; color:var(--primary); background:rgba(99,102,241,0.12); padding:4px 12px; border-radius:20px; border:1px solid rgba(99,102,241,0.25); display:inline-flex; align-items:center; gap:5px;">
                    🎓 المرحلة: <strong>${getStudentGradeDisplay(state.user?.education)}</strong>
                  </span>
                  <button type="button" class="btn-change-student-grade" style="background:rgba(99,102,241,0.15); border:1px solid var(--primary); color:var(--primary); border-radius:20px; padding:3px 12px; font-size:0.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;">
                    <i data-lucide="refresh-cw" style="width:12px; height:12px;"></i> تغيير الصف 🔄
                  </button>
                  ${state.user?.parentPhone ? `
                    <span class="badge" style="font-size:0.75rem; font-weight:700; color:var(--text-muted); background:rgba(0,0,0,0.04); padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;">
                      <i data-lucide="phone-call" style="width:12px; height:12px;"></i> ولي الأمر: ${state.user.parentPhone}
                    </span>
                  ` : ''}
                  <a href="#settings" style="color:var(--primary); font-size:0.76rem; font-weight:800; text-decoration:underline; padding:0 4px; display:inline-flex; align-items:center; gap:3px;">
                    <i data-lucide="settings" style="width:12px; height:12px;"></i> الإعدادات ⚙️
                  </a>
                </div>

                <p style="color:var(--text-muted); font-size:0.88rem; margin:4px 0 0 0; line-height:1.5;">
                  واصل رحلة تفوقك الدراسي واستكشف دروسك وحصصك المباشرة لليوم بكل سهولة.
                </p>
              </div>
            </div>

            <!-- Right Live Date, Time & Action Studio Widget -->
            <div class="glass-card student-live-clock-card" style="background:rgba(15, 15, 23, 0.55); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); border:1px solid rgba(99,102,241,0.3); border-radius:24px; padding:16px 20px; box-shadow:0 12px 32px rgba(0,0,0,0.25), inset 0 0 24px rgba(99,102,241,0.08); display:flex; flex-direction:column; gap:10px; min-width:290px;">
              
              <!-- Date & Day Header with Local Country Badge -->
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:8px; background:rgba(99,102,241,0.2); color:var(--primary);">
                    <i data-lucide="calendar" style="width:13px;height:13px;"></i>
                  </span>
                  <span id="student-live-day" style="color:var(--primary); font-weight:800; font-size:0.9rem;">-</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span id="student-live-date" style="font-size:0.8rem; font-weight:700; color:var(--text-main);">-</span>
                  <span class="tz-badge" style="display:inline-flex; align-items:center; gap:3px; font-size:0.72rem; font-weight:800; background:rgba(99,102,241,0.18); color:#a5b4fc; padding:2px 8px; border-radius:12px; border:1px solid rgba(99,102,241,0.3);">
                    ${tzInfo.flag} ${tzInfo.name}
                  </span>
                </div>
              </div>

              <!-- Live Clock & Status -->
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div style="display:flex; align-items:baseline; gap:6px;">
                  <span id="student-live-time" style="font-family:'Outfit',monospace,sans-serif; font-size:1.75rem; font-weight:900; letter-spacing:1px; color:#ffffff; text-shadow:0 0 20px rgba(99,102,241,0.6);">
                    00:00:00
                  </span>
                  <span id="student-live-ampm" style="font-size:0.75rem; font-weight:800; color:#a5b4fc; background:rgba(99,102,241,0.15); padding:2px 6px; border-radius:6px;">--</span>
                </div>

                <div style="display:inline-flex; align-items:center; gap:5px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.35); padding:4px 9px; border-radius:20px; font-size:0.72rem; font-weight:800; color:#10b981;">
                  <span style="width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
                  <span>مباشر</span>
                </div>
              </div>

              <!-- Prayer Times Trigger Button -->
              <button id="student-open-prayer-btn" style="width:100%; margin-top:4px; padding:8px 14px; font-weight:800; font-size:0.8rem; border-radius:14px; border:1px solid rgba(16,185,129,0.35); color:#10b981; background:rgba(16,185,129,0.08); display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; transition:all 0.2s;">
                <i data-lucide="moon-star" style="width:15px;height:15px;"></i> مواقيت الصلاة لليوم 🕌
              </button>

            </div>

          </div>
        </div>

        <!-- 2. Reduced Cards: Sleek Circular Metrics Hub (دوائر الإنجاز والتقدم الذكي) -->
        <div class="glass-card circular-metrics-hub">
          
          <!-- Circle 1: Completed Lessons -->
          <a href="#student-groups" class="circle-stat-pod" title="عرض كافة الدروس والمجموعات">
            <div class="circle-ring-wrapper">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(16,185,129,0.12)" stroke-width="6.5" />
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-emerald)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${lessonsOffset}" stroke-linecap="round" style="transform:rotate(-90deg); transform-origin:42px 42px; transition:stroke-dashoffset 0.8s ease;" />
              </svg>
              <div class="circle-ring-value" style="color:#10b981;">
                ${completedLessons}
              </div>
            </div>
            <div style="text-align:center;">
              <div class="circle-stat-label">الدروس المكتملة</div>
              <div class="circle-stat-sub">إنجاز رائع 🏆</div>
            </div>
          </a>

          <!-- Circle 2: Enrolled Cohorts & Courses -->
          <a href="#student-groups" class="circle-stat-pod" title="عرض مجموعاتك وأفواجك الدراسية">
            <div class="circle-ring-wrapper">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(99,102,241,0.12)" stroke-width="6.5" />
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-indigo)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${groupsOffset}" stroke-linecap="round" style="transform:rotate(-90deg); transform-origin:42px 42px; transition:stroke-dashoffset 0.8s ease;" />
              </svg>
              <div class="circle-ring-value" style="color:var(--primary);">
                ${groupCount}
              </div>
            </div>
            <div style="text-align:center;">
              <div class="circle-stat-label">أفواجي التعليمية</div>
              <div class="circle-stat-sub">مجموعاتك ↗</div>
            </div>
          </a>

          <!-- Circle 3: Study Hours -->
          <a href="#courses" class="circle-stat-pod" title="عرض ساعات المذاكرة والمناهج">
            <div class="circle-ring-wrapper">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(6,182,212,0.12)" stroke-width="6.5" />
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-cyan)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${hoursOffset}" stroke-linecap="round" style="transform:rotate(-90deg); transform-origin:42px 42px; transition:stroke-dashoffset 0.8s ease;" />
              </svg>
              <div class="circle-ring-value" style="color:#06b6d4;">
                ${studyHours}<span style="font-size:0.75rem; font-weight:700;">س</span>
              </div>
            </div>
            <div style="text-align:center;">
              <div class="circle-stat-label">ساعات المذاكرة</div>
              <div class="circle-stat-sub">استثمار الوقت ⚡</div>
            </div>
          </a>

          <!-- Circle 4: Private Sessions Balance -->
          <a href="#student-subscriptions" class="circle-stat-pod" title="عرض باقات الحصص الخاصة">
            <div class="circle-ring-wrapper">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="rgba(168,85,247,0.12)" stroke-width="6.5" />
                <circle cx="42" cy="42" r="36" fill="transparent" stroke="url(#circ-purple)" stroke-width="6.5" stroke-dasharray="226" stroke-dashoffset="${creditsOffset}" stroke-linecap="round" style="transform:rotate(-90deg); transform-origin:42px 42px; transition:stroke-dashoffset 0.8s ease;" />
              </svg>
              <div class="circle-ring-value" style="color:#a855f7;">
                ${privateCredits}
              </div>
            </div>
            <div style="text-align:center;">
              <div class="circle-stat-label">الحصص الخاصة</div>
              <div class="circle-stat-sub">الباقات المتاحة 💎</div>
            </div>
          </a>

        </div>

        <!-- 3. Priority 1: Today's Live Broadcast Studio (استوديو البث المباشر لليوم) -->
        <div class="creative-live-stage">
          
          <!-- Section Header -->
          <div style="position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:14px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="position:relative; width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #10b981, #059669); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(16,185,129,0.35); flex-shrink:0;">
                <i data-lucide="radio" style="width:22px; height:22px;"></i>
                <span style="position:absolute; top:-2px; right:-2px; width:12px; height:12px; border-radius:50%; background:#ef4444; border:2px solid #fff; box-shadow:0 0 8px #ef4444;"></span>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <h2 style="font-size:1.25rem; font-weight:900; margin:0; color:var(--text-main); letter-spacing:-0.02em;">
                    استوديو البث والحصص المباشرة لليوم
                  </h2>
                  <span style="display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:12px; font-size:0.75rem; font-weight:900; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);">
                    <span style="width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                    ${todaySessions.length > 0 ? `${todaySessions.length} حصص مجدولة` : 'اليوم'}
                  </span>
                </div>
                <p style="color:var(--text-muted); font-size:0.82rem; margin:2px 0 0 0;">
                  قاعة الحضور والتفاعل الحي • سجّل حضورك وانضم مباشرة للبث عبر Google Meet
                </p>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:10px;">
              <a href="#schedule" class="btn-secondary" style="font-size:0.8rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:12px; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-main); transition:all 0.2s;">
                <i data-lucide="calendar" style="width:14px; height:14px; color:var(--primary);"></i>
                <span>الجدول الكامل 📅</span>
              </a>
            </div>
          </div>

          <!-- Section Content -->
          ${todaySessions.length === 0 ? `
            <div style="position:relative; z-index:1; padding:18px 24px; border-radius:18px; background:var(--bg-card); border:1px dashed var(--border-focus); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.1)); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:1.3rem;">
                  ☕
                </div>
                <div>
                  <h4 style="font-size:0.96rem; font-weight:800; color:var(--text-main); margin:0 0 2px 0;">
                    لا توجد حصص بث مباشر مقررة لليوم ✨
                  </h4>
                  <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">
                    يوم هادئ ومخصص للمذاكرة المستقلة، متابعة شروحات المجموعات، وحل الواجبات.
                  </p>
                </div>
              </div>

              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <a href="#student-groups" class="btn-primary" style="padding:8px 16px; border-radius:12px; font-size:0.8rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                  <i data-lucide="play-circle" style="width:14px; height:14px;"></i>
                  <span>شروحات وفيديوهات المجموعات 🎥</span>
                </a>
              </div>
            </div>
          ` : `
            <div style="position:relative; z-index:1; display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:18px;">
              ${todaySessions.map(s => this.renderSessionCard(s)).join('')}
            </div>
          `}

        </div>



        <!-- 5. Main Two-Column Hub Layout -->
        <div style="display:grid; grid-template-columns: 1fr 360px; gap:28px; align-items:start;" class="dashboard-main-grid-layout">
          
          <!-- Left Column (Main Track) -->
          <div style="display:flex; flex-direction:column; gap:32px;">
            
            <!-- Section: Recommended Courses for You -->
            <div id="student-recommended-courses-section">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                <div>
                  <h3 style="font-size:1.15rem; font-weight:800; margin:0; color:var(--text-main); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <i data-lucide="sparkles" style="width:20px; height:20px; color:#a855f7;"></i>
                    <span>دورات مقترحة لتعزيز مهاراتك</span>
                    <span class="badge" style="font-size:0.75rem; background:rgba(99,102,241,0.12); color:var(--primary); font-weight:800; padding:3px 10px; border-radius:12px; border:1px solid rgba(99,102,241,0.25);">
                      🎯 لصف: ${getStudentGradeDisplay(state.user?.education)}
                    </span>
                    <button type="button" class="btn-change-student-grade" style="background:rgba(99,102,241,0.08); border:1px dashed var(--primary); color:var(--primary); border-radius:12px; padding:2px 10px; font-size:0.72rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s ease;">
                      <i data-lucide="refresh-cw" style="width:11px; height:11px;"></i> تغيير الصف 🔄
                    </button>
                  </h3>
                  <p style="color:var(--text-muted); font-size:0.82rem; margin:2px 0 0 0;">اخترنا لك هذه المناهج والدورات المتوافقة مع مرحلتك الدراسية</p>
                </div>
                <a href="#courses" style="font-size:0.82rem; font-weight:700; color:var(--primary); text-decoration:none;">
                  تصفح كافة المقررات (${this.allCourses.length}) ↗
                </a>
              </div>

              ${recommendedCourses.length > 0 ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:18px;">
                  ${recommendedCourses.map(c => this.renderCourseCard(c, 0, false, null)).join('')}
                </div>
              ` : `
                <div class="glass-card" style="padding:28px 20px; text-align:center; border-radius:18px; border:1px dashed rgba(99,102,241,0.3); background:rgba(99,102,241,0.02); display:flex; flex-direction:column; align-items:center; gap:10px;">
                  <div style="width:46px; height:46px; border-radius:50%; background:rgba(99,102,241,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.3rem;">
                    🎯
                  </div>
                  <div>
                    <h4 style="font-size:0.98rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main);">
                      لا توجد دورات إضافية متاحة حالياً لصف: ${getStudentGradeDisplay(state.user?.education)}
                    </h4>
                    <p style="font-size:0.82rem; color:var(--text-muted); margin:0; max-width:460px; line-height:1.5;">
                      المناهج المقترحة هنا ترتبط تلقائياً بصفك الدراسي. يمكنك تغيير صفك لعرض المناهج المقترحة للمراحل الأخرى أو استعراض جميع المقررات العامة.
                    </p>
                  </div>
                  <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:4px;">
                    <button type="button" class="btn-primary btn-change-student-grade" style="font-size:0.82rem; padding:7px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:5px;">
                      <i data-lucide="refresh-cw" style="width:13px; height:13px;"></i> تغيير الصف الدراسي 🔄
                    </button>
                    <a href="#courses" class="btn-secondary" style="font-size:0.82rem; padding:7px 16px; border-radius:10px; text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
                      <i data-lucide="book-open" style="width:13px; height:13px;"></i> استعراض كافة المقررات ↗
                    </a>
                  </div>
                </div>
              `}
            </div>

          </div>

          <!-- Right Column (Sidebar Academic Profile, Reports & Shortcuts) -->
          <div style="display:flex; flex-direction:column; gap:24px;">


            <!-- Quick Learning Hub & Shortcuts -->
            <div class="glass-card" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
              <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-bottom:14px; display:flex; align-items:center; gap:8px;">
                <i data-lucide="compass" style="width:18px; height:18px; color:var(--primary);"></i>
                أدوات الوصول السريع ⚡
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <a href="#schedule" class="btn-secondary" style="padding:10px; font-size:0.8rem; font-weight:700; border-radius:12px; text-decoration:none; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="calendar" style="width:14px;height:14px;color:var(--primary);"></i> الجدول الدراسي
                </a>
                <a href="#student-groups" class="btn-secondary" style="padding:10px; font-size:0.8rem; font-weight:700; border-radius:12px; text-decoration:none; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="users" style="width:14px;height:14px;color:#f59e0b;"></i> مجموعاتي الدراسية
                </a>
                <a href="#student-certificates" class="btn-secondary" style="padding:10px; font-size:0.8rem; font-weight:700; border-radius:12px; text-decoration:none; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="award" style="width:14px;height:14px;color:#10b981;"></i> شهاداتي
                </a>
                <a href="#settings" class="btn-secondary" style="padding:10px; font-size:0.8rem; font-weight:700; border-radius:12px; text-decoration:none; justify-content:center; display:flex; align-items:center; gap:6px;">
                  <i data-lucide="settings" style="width:14px;height:14px;color:#6366f1;"></i> الإعدادات
                </a>
              </div>
            </div>

            <!-- Quick Study Tips / Motivation Widget -->
            <div class="glass-card" style="padding:20px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card);">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; color:#f59e0b;">
                <i data-lucide="lightbulb" style="width:20px; height:20px;"></i>
                <h4 style="font-size:0.95rem; font-weight:800; margin:0; color:var(--text-main);">نصيحة اليوم للتفوق</h4>
              </div>
              <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.6; margin:0;">
                💡 <strong>قاعدة الـ 25 دقيقة:</strong> ركز في درس واحد لمدة 25 دقيقة متواصلة بدون أي مشتتات، ثم خذ استراحة 5 دقائق لتثبيت المعلومات بأعلى كفاءة.
              </p>
            </div>

          </div>

        </div>

      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
    this.initLiveClock();
  }

  initLiveClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }

    const userTz = getUserTimezone();

    const updateClock = () => {
      const now = new Date();
      const dayElem = this.container.querySelector("#student-live-day");
      const dateElem = this.container.querySelector("#student-live-date");
      const timeElem = this.container.querySelector("#student-live-time");
      const ampmElem = this.container.querySelector("#student-live-ampm");

      if (!timeElem) return;

      try {
        // Date in local country timezone
        const dateOptions = { timeZone: userTz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const dateParts = new Intl.DateTimeFormat('ar-EG', dateOptions).formatToParts(now);
        
        let weekday = "";
        let day = "";
        let month = "";
        let year = "";

        dateParts.forEach(p => {
          if (p.type === 'weekday') weekday = p.value;
          if (p.type === 'day') day = p.value;
          if (p.type === 'month') month = p.value;
          if (p.type === 'year') year = p.value;
        });

        if (dayElem) dayElem.textContent = weekday || "اليوم";
        if (dateElem) dateElem.textContent = `${day} ${month} ${year}`;

        // Time in local country timezone
        const timeOptions = { timeZone: userTz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
        const timeParts = new Intl.DateTimeFormat('en-US', timeOptions).formatToParts(now);

        let h = "00";
        let m = "00";
        let s = "00";
        let dayPeriod = "AM";

        timeParts.forEach(p => {
          if (p.type === 'hour') h = p.value.padStart(2, '0');
          if (p.type === 'minute') m = p.value.padStart(2, '0');
          if (p.type === 'second') s = p.value.padStart(2, '0');
          if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
        });

        const isColonVisible = now.getSeconds() % 2 === 0;
        timeElem.innerHTML = `${h}<span style="opacity:${isColonVisible ? '1' : '0.25'}; transition:opacity 0.15s; color:var(--primary);">:</span>${m}<span style="opacity:${isColonVisible ? '1' : '0.25'}; transition:opacity 0.15s; color:var(--primary);">:</span>${s}`;
        
        if (ampmElem) {
          ampmElem.textContent = dayPeriod === 'PM' ? 'مساءً' : 'صباحاً';
        }
      } catch (e) {
        timeElem.innerHTML = now.toLocaleTimeString("ar-EG");
      }
    };

    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  filterTodaySessions(sessions) {
    const todayStr = new Date().toDateString();
    const currentStudentId = state.user?.id;
    const enrolledIds = new Set((this.enrollments || []).filter(e => e.status === "active").map(e => e.course?.id).filter(Boolean));

    return (sessions || []).filter(s => {
      if (!s.scheduledAt) return false;
      const d = new Date(s.scheduledAt).toDateString();
      if (d !== todayStr) return false;

      // Ensure session strictly belongs to this student
      if (s.student?.id) {
        return s.student.id === currentStudentId;
      }
      if (s.course?.id) {
        return enrolledIds.has(s.course.id);
      }
      return false;
    });
  }

  renderCourseCard(course, progress = 0, showContinue = false, enrollmentStatus = "active", groupId = null) {
    return renderCourseCard(course, {
      progress: progress || 0,
      enrollmentStatus: showContinue ? (enrollmentStatus || "active") : null,
      groupId: groupId || null
    });
  }

  renderSessionCard(session) {
    if (!session) return "";

    const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const durationMins = session.duration || 60;
    const now = Date.now();
    const diffMs = scheduledTime - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    const isPastSession = diffMins < -durationMins;

    const isCompleted = session.status === "completed" || session.status === "COMPLETED" || Boolean(session.completedAt);
    const isLive = !isCompleted && !isPastSession && (session.status === "live" || session.status === "active");
    const isStartingSoon = !isCompleted && diffMins <= 30 && !isPastSession;
    const teacherTz = session.teacher?.timezone || "Africa/Cairo";
    const formatted = formatSessionDateTime(session.scheduledAt, null, { secondaryTz: teacherTz });
    const teacherAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(session.teacher?.name || 'teacher')}`;

    return `
      <div class="creative-session-card ${isLive ? 'is-live' : ''}">
        
        <!-- Live Accent Line -->
        <div style="height:5px; width:100%; background:${isLive ? 'linear-gradient(90deg, #ef4444, #10b981)' : isCompleted ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, var(--primary), #a855f7)'};"></div>

        <div style="padding:18px 20px; display:flex; flex-direction:column; gap:12px; flex:1;">
          
          <!-- Top Row: Course/Group Tag & Live Status Badge -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:10px; background:rgba(99,102,241,0.1); color:var(--primary); display:inline-flex; align-items:center; gap:4px;">
              <i data-lucide="book-open" style="width:12px; height:12px;"></i>
              ${session.course?.title || session.groupTitle || 'حصة تدريبية'}
            </span>

            ${isLive ? `
              <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:900; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.35); display:inline-flex; align-items:center; gap:5px; animation:pulseRed 2s infinite;">
                <span style="width:7px; height:7px; border-radius:50%; background:#ef4444;"></span>
                بث مباشر الآن 🔴
              </span>
            ` : isCompleted ? `
              <span style="padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:800; background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="check-circle-2" style="width:13px; height:13px;"></i>
                مكتملة وموثقة ✅
              </span>
            ` : isStartingSoon ? `
              <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:900; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.35); display:inline-flex; align-items:center; gap:4px;">
                <i data-lucide="clock" style="width:12px; height:12px;"></i>
                تبدأ خلال دقائق ⏳
              </span>
            ` : `
              <span style="padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.08); color:var(--primary);">
                مجدولة لليوم 🕒
              </span>
            `}
          </div>

          <!-- Session Title -->
          <h3 style="font-size:1.05rem; font-weight:900; color:var(--text-main); margin:0; line-height:1.35; display:flex; align-items:center; gap:8px;">
            <i data-lucide="video" style="width:17px; height:17px; color:${isLive ? '#ef4444' : 'var(--primary)'}; flex-shrink:0;"></i>
            ${session.title || 'حصة بث مباشر'}
          </h3>

          <!-- Teacher Profile & Timezone Capsule -->
          <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:14px; background:var(--bg-app); border:1px solid var(--border-color);">
            <img src="${teacherAvatar}" alt="${session.teacher?.name || ''}" style="width:36px; height:36px; border-radius:10px; object-fit:cover; border:1px solid rgba(99,102,241,0.25);">
            <div style="flex:1; min-width:0;">
              <div style="font-size:0.85rem; font-weight:800; color:var(--text-main);">${session.teacher?.name || 'المعلم الأكاديمي'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; display:flex; align-items:center; gap:4px; margin-top:1px;">
                <i data-lucide="clock" style="width:12px; height:12px; color:var(--primary);"></i>
                ${formatted.timeStr} ${formatted.secondaryTZHTML}
              </div>
            </div>
          </div>

          <!-- Completed Session Summary (if any) -->
          ${isCompleted && (session.topic || session.whatWasCovered || session.homework) ? `
            <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:12px; padding:10px 12px; font-size:0.78rem; display:flex; flex-direction:column; gap:4px;">
              ${session.topic ? `<div style="font-weight:800; color:var(--text-main);">📌 ${session.topic}</div>` : ''}
              ${session.whatWasCovered ? `<div style="color:var(--text-muted); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">📝 ${session.whatWasCovered}</div>` : ''}
              ${session.homework ? `
                <div style="color:#d97706; font-weight:800; margin-top:2px; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:8px; border:1px solid rgba(245,158,11,0.2);">
                  📚 الواجب: ${session.homework}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Action Buttons / Attendance / Google Meet -->
          <div class="session-actions-wrapper" data-id="${session.id}" style="margin-top:auto; padding-top:4px; display:flex; flex-direction:column; gap:8px;">
            ${isCompleted ? `
              <button class="btn-primary view-session-report-btn" data-id="${session.id}" style="width:100%; padding:10px 14px; font-size:0.84rem; font-weight:900; justify-content:center; border-radius:12px; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; display:flex; align-items:center; gap:8px; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.25);">
                <i data-lucide="file-text" style="width:16px; height:16px;"></i>
                <span>عرض ملخص الحصة والواجب 📋</span>
              </button>
            ` : (isLive || isStartingSoon) ? (
              window.checkedInSessions?.has(session.id) ? `
                <span style="font-size:0.78rem; font-weight:800; color:#10b981; padding:6px 12px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:15px; height:15px;"></i> تم تأكيد حضورك (حاضر) ✅
                </span>
                <button class="btn-primary session-action" data-join-meet-id="${session.id}" style="width:100%; padding:11px 14px; font-size:0.86rem; font-weight:900; justify-content:center; border-radius:12px; background:linear-gradient(135deg, #10b981, #059669); gap:8px; border:none; display:flex; align-items:center; cursor:pointer; box-shadow:0 4px 16px rgba(16,185,129,0.35);">
                  <i data-lucide="video" style="width:16px; height:16px;"></i>
                  <span>الانضمام عبر Google Meet 🎥</span>
                </button>
              ` : `
                <button class="btn-primary session-checkin-btn" data-id="${session.id}" data-role="student" style="width:100%; justify-content:center; font-size:0.86rem; padding:11px 14px; background:linear-gradient(135deg, #10b981, #059669); font-weight:900; cursor:pointer; border-radius:12px; border:none; color:#fff; display:flex; align-items:center; gap:8px; box-shadow:0 4px 16px rgba(16,185,129,0.3); animation:pulseBroadcast 2.5s infinite;">
                  <i data-lucide="user-check" style="width:16px; height:16px;"></i>
                  <span>تأكيد الحضور (لست غائباً) ✍️</span>
                </button>
                <div style="font-size:0.72rem; color:var(--text-muted); text-align:center; font-weight:600;">* اضغط لتأكيد حضورك وتفعيل رابط البث المباشر فوراً</div>
              `
            ) : `
              <button disabled class="btn-secondary" style="width:100%; padding:10px 14px; font-size:0.82rem; font-weight:800; justify-content:center; border-radius:12px; opacity:0.85; cursor:not-allowed; background:rgba(99,102,241,0.06); color:var(--primary); border:1px solid rgba(99,102,241,0.2);">
                <i data-lucide="lock" style="width:14px; height:14px; margin-inline-end:6px;"></i> ينشط قبل الموعد بـ 30 دقيقة 🔒
              </button>
            `}
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    // Course Filter Pills (All / In-Progress / Completed)
    this.container.querySelectorAll(".filter-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");
        this.courseFilter = filter;
        this.renderDashboard();
      });
    });

    // Attendance Check-in Buttons
    this.container.querySelectorAll('.session-checkin-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:13px;height:13px;"></i> جاري تأكيد الحضور...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await apiFetch(`/sessions/${id}/checkin`, { method: "POST" });
          showToast(res.message || "تم تأكيد حضورك رسمياً بنجاح، ولن يتم احتسابك غائباً ✅", "success");
          window.checkedInSessions = window.checkedInSessions || new Set();
          window.checkedInSessions.add(id);

          const wrapper = btn.closest(".session-actions-wrapper") || btn.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:6px;">
                <span style="font-size:0.75rem; font-weight:800; color:#10b981; padding:4px 8px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:4px; width:100%; box-sizing:border-box;">
                  <i data-lucide="check-circle-2" style="width:13px; height:13px;"></i> تم تأكيد حضور الطالب (حاضر) ✅
                </span>
                <button class="btn-primary session-action" data-join-meet-id="${id}" style="background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 4px 15px rgba(16,185,129,0.3); font-size:0.85rem; padding:9px; justify-content:center; font-weight:900; display:flex; align-items:center; gap:6px; border-radius:10px; border:none; color:#fff; cursor:pointer;">
                  <i data-lucide="video" style="width:15px; height:15px;"></i> الانضمام عبر Google Meet 🚀
                </button>
              </div>
            `;
            if (window.lucide) window.lucide.createIcons();
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="user-check" style="width:14px; height:14px;"></i> تأكيد الحضور (لست غائباً) ✍️`;
          if (window.lucide) window.lucide.createIcons();
          showToast(err.message || "تعذر تأكيد الحضور.", "error");
        }
      });
    });

    // Session report view modal
    this.container.querySelectorAll('.view-session-report-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const session = (this.rawSessions || []).find(s => String(s.id) === String(id));
        if (session && typeof window.showStudentSessionReportModal === 'function') {
          window.showStudentSessionReportModal(session);
        }
      });
    });

    // Graded assignment feedback report modal
    this.container.querySelectorAll('.view-graded-assignment-report-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const asg = (this.assignments || []).find(a => String(a.id) === String(id));
        if (asg && asg.submission) {
          const modal = new StudentFeedbackModal(asg, asg.submission);
          modal.open();
        }
      });
    });

    // Prayer Times Modal Trigger
    this.container.querySelector("#student-open-prayer-btn")?.addEventListener("click", () => {
      this.renderPrayerTimesModal();
    });

    // Quick Change Student Grade Modal
    this.container.querySelectorAll(".btn-change-student-grade").forEach(btn => {
      btn.addEventListener("click", () => {
        this.openChangeGradeModal();
      });
    });
  }

  async renderPrayerTimesModal() {
    let container = document.getElementById("student-prayer-modal-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "student-prayer-modal-container";
      document.body.appendChild(container);
    }

    const userTz = getUserTimezone();
    const tzInfo = getTimezoneInfo(userTz);

    // Initial Loading State
    container.innerHTML = `
      <div class="modal-overlay" id="prayer-modal" style="display:flex; z-index:9999;">
        <div class="modal-content" style="max-width:540px; background:var(--bg-card); border-radius:26px; border:1px solid rgba(16,185,129,0.3); box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <div class="modal-header" style="border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px; font-size:1.15rem; color:var(--text-main); margin:0;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:10px; background:rgba(16,185,129,0.15); color:#10b981;">
                <i data-lucide="moon-star" style="width:18px;height:18px;"></i>
              </span>
              مواقيت الصلاة لليوم 🕌
            </h3>
            <span class="modal-close-btn" id="close-prayer-modal" style="font-size:1.5rem; cursor:pointer;">&times;</span>
          </div>
          <div class="modal-body" style="padding:30px 20px; text-align:center;">
            <div class="spinner" style="width:36px; height:36px; border-width:3px; margin:0 auto 12px; border-color:#10b981 transparent #10b981 transparent;"></div>
            <p style="color:var(--text-muted); font-size:0.9rem; font-weight:700; margin:0;">جاري استرداد مواقيت الصلاة الدقيقة لـ ${tzInfo.name}...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => { container.innerHTML = ""; };
    document.getElementById("close-prayer-modal")?.addEventListener("click", closeModal);

    try {
      // Determine query: If Cairo/Egypt, fetch Cairo Egypt; otherwise fetch by local city/country
      let apiUrl = "";
      if (userTz.includes("Cairo") || userTz.includes("Egypt")) {
        apiUrl = "https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5";
      } else if (tzInfo.city && tzInfo.country && tzInfo.country !== "Global") {
        apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(tzInfo.city)}&country=${encodeURIComponent(tzInfo.country)}&method=5`;
      } else {
        apiUrl = `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(userTz)}&method=5`;
      }

      // Fetch Live Prayer Timings
      const res = await fetch(apiUrl);
      let timings = null;
      let hijri = null;

      if (res.ok) {
        const data = await res.json();
        if (data.code === 200 && data.data) {
          timings = data.data.timings;
          hijri = data.data.date?.hijri;
        }
      }

      // Fallback Timings if Offline / Network Failed
      if (!timings) {
        timings = {
          Fajr: "04:50",
          Sunrise: "06:15",
          Dhuhr: "12:45",
          Asr: "16:15",
          Maghrib: "19:10",
          Isha: "20:30"
        };
      }

      const hijriStr = hijri ? `${hijri.day} ${hijri.month?.ar || ''} ${hijri.year} هـ` : 'التاريخ الهجري المعتمد';

      // Parse and Calculate Next Prayer
      const now = new Date();
      const prayers = [
        { key: "Fajr", name: "الفجر", icon: "sunrise", time: timings.Fajr },
        { key: "Sunrise", name: "الشروق", icon: "sun", time: timings.Sunrise },
        { key: "Dhuhr", name: "الظهر", icon: "sun-medium", time: timings.Dhuhr },
        { key: "Asr", name: "العصر", icon: "cloud-sun", time: timings.Asr },
        { key: "Maghrib", name: "المغرب", icon: "sunset", time: timings.Maghrib },
        { key: "Isha", name: "العشاء", icon: "moon", time: timings.Isha }
      ];

      // Format Time to 12h Arabic
      const formatPrayer12h = (time24) => {
        if (!time24) return "-";
        const clean = time24.split(" ")[0];
        const [hStr, mStr] = clean.split(":");
        let h = parseInt(hStr, 10);
        const m = mStr;
        const ampm = h >= 12 ? "م" : "ص";
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      };

      // Detect Next Prayer
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      let nextPrayer = null;
      let remainingMinutes = 0;

      for (const p of prayers) {
        const clean = p.time.split(" ")[0];
        const [h, m] = clean.split(":").map(Number);
        const prayerMinutes = h * 60 + m;
        if (prayerMinutes > currentMinutes) {
          nextPrayer = p;
          remainingMinutes = prayerMinutes - currentMinutes;
          break;
        }
      }

      // If all passed today, next is Fajr tomorrow
      if (!nextPrayer) {
        nextPrayer = prayers[0];
        const [h, m] = nextPrayer.time.split(" ")[0].split(":").map(Number);
        const fajrMinutes = h * 60 + m;
        remainingMinutes = (24 * 60 - currentMinutes) + fajrMinutes;
      }

      const remHours = Math.floor(remainingMinutes / 60);
      const remMins = remainingMinutes % 60;
      const remainingCountdownStr = remHours > 0 ? `${remHours} ساعة و ${remMins} دقيقة` : `${remMins} دقيقة`;

      // Render Completed Prayer Card Modal
      container.innerHTML = `
        <div class="modal-overlay" id="prayer-modal" style="display:flex; z-index:9999;">
          <div class="modal-content" style="max-width:540px; max-height:90vh; overflow-y:auto; background:var(--bg-card); border-radius:26px; border:1.5px solid rgba(16,185,129,0.35); box-shadow:0 24px 60px rgba(0,0,0,0.5);">
            
            <!-- Modal Header -->
            <div class="modal-header" style="border-bottom:1px solid var(--border-color); padding:18px 24px;">
              <div>
                <h3 class="modal-title" style="display:flex; align-items:center; gap:8px; font-size:1.18rem; color:var(--text-main); margin:0 0 4px 0;">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; background:rgba(16,185,129,0.15); color:#10b981;">
                    <i data-lucide="moon-star" style="width:20px;height:20px;"></i>
                  </span>
                  مواقيت الصلاة 🕌
                </h3>
                <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; color:var(--text-muted);">
                  <span>${tzInfo.flag} ${tzInfo.name}</span>
                  <span>•</span>
                  <span style="color:#10b981; font-weight:700;">${hijriStr}</span>
                </div>
              </div>
              <span class="modal-close-btn" id="close-prayer-modal-btn" style="font-size:1.6rem; cursor:pointer; color:var(--text-muted);">&times;</span>
            </div>

            <!-- Modal Body -->
            <div class="modal-body" style="padding:22px 24px; display:flex; flex-direction:column; gap:18px;">
              
              <!-- Next Prayer Spotlight Card -->
              <div style="background:linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(99,102,241,0.1) 100%); border:1.5px solid rgba(16,185,129,0.3); border-radius:18px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                  <div style="font-size:0.78rem; font-weight:800; color:#10b981; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                    <span style="width:7px; height:7px; background:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
                    الصلاة القادمة
                  </div>
                  <div style="font-size:1.35rem; font-weight:900; color:var(--text-main);">
                    صلاة ${nextPrayer.name}
                  </div>
                  <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                    المتبقي على الأذان: <strong style="color:#10b981;">${remainingCountdownStr}</strong> ⏳
                  </div>
                </div>

                <div style="text-align:end;">
                  <div style="font-family:'Outfit',monospace,sans-serif; font-size:1.6rem; font-weight:900; color:#10b981; text-shadow:0 0 16px rgba(16,185,129,0.4);">
                    ${formatPrayer12h(nextPrayer.time)}
                  </div>
                </div>
              </div>

              <!-- 6 Prayers Grid -->
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
                ${prayers.map(p => {
                  const isNext = p.key === nextPrayer.key;
                  return `
                    <div style="background:${isNext ? 'rgba(16,185,129,0.12)' : 'var(--bg-app)'}; border:1.5px solid ${isNext ? '#10b981' : 'var(--border-color)'}; border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; position:relative; overflow:hidden; transition:transform 0.15s;">
                      ${isNext ? `
                        <div style="position:absolute; top:8px; left:8px; width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 6px #10b981;"></div>
                      ` : ''}
                      
                      <div style="display:flex; align-items:center; gap:6px; color:${isNext ? '#10b981' : 'var(--text-muted)'}; font-size:0.85rem; font-weight:800;">
                        <i data-lucide="${p.icon}" style="width:16px;height:16px;"></i>
                        <span>${p.name}</span>
                      </div>

                      <div style="font-family:'Outfit',monospace,sans-serif; font-size:1.15rem; font-weight:900; color:${isNext ? '#10b981' : 'var(--text-main)'};">
                        ${formatPrayer12h(p.time)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Quran Quote Banner -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:14px; padding:12px 16px; text-align:center; font-size:0.82rem; color:var(--text-muted);">
                ✨ <strong>﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾</strong>
              </div>

            </div>

            <!-- Modal Footer -->
            <div class="modal-footer" style="border-top:1px solid var(--border-color); padding:14px 24px; display:flex; justify-content:center;">
              <button type="button" class="btn-secondary" id="close-prayer-modal-footer-btn" style="padding:8px 24px; font-weight:700; border-radius:12px;">إغلاق</button>
            </div>

          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      document.getElementById("close-prayer-modal-btn")?.addEventListener("click", closeModal);
      document.getElementById("close-prayer-modal-footer-btn")?.addEventListener("click", closeModal);
      document.getElementById("prayer-modal")?.addEventListener("click", (e) => {
        if (e.target.id === "prayer-modal") closeModal();
      });

    } catch (err) {
      console.error("Prayer times error:", err);
      container.innerHTML = "";
      showToast("تعذر جلب مواقيت الصلاة، يرجى التحقق من اتصال الإنترنت.", "error");
    }
  }

  openChangeGradeModal() {
    const existingModal = document.getElementById("change-student-grade-modal");
    if (existingModal) existingModal.remove();

    const currentEdu = state.user?.education || "";
    const modal = document.createElement("div");
    modal.id = "change-student-grade-modal";
    modal.className = "modal-backdrop active";
    modal.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; animation:fadeIn 0.2s ease;";

    modal.innerHTML = `
      <div class="modal-card" style="background:var(--bg-card, #1e1e2d); border:1.5px solid var(--border-color, rgba(255,255,255,0.1)); border-radius:24px; padding:28px; width:100%; max-width:480px; box-shadow:0 20px 50px rgba(0,0,0,0.4); display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:44px; height:44px; border-radius:14px; background:rgba(99,102,241,0.15); color:var(--primary, #6366f1); display:flex; align-items:center; justify-content:center; font-size:1.3rem;">
              🎓
            </div>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--text-main);">تحديد المرحلة والصف الدراسي</h3>
              <p style="margin:3px 0 0 0; font-size:0.8rem; color:var(--text-muted);">اختر صفك الدراسي لعرض المناهج والدورات المتوافقة معك تلقائياً</p>
            </div>
          </div>
          <button type="button" id="close-grade-modal-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px; font-size:1.2rem; line-height:1;">✕</button>
        </div>

        <form id="change-student-grade-form" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:8px; color:var(--text-main);">المرحلة والصف الدراسي:</label>
            ${renderEducationSelectHTML({
              id: "quick-education-select",
              selectedValue: currentEdu,
              required: true,
              style: "width:100%; padding:12px 14px; border-radius:12px; border:1.5px solid var(--border-color); background:var(--bg-input, rgba(255,255,255,0.05)); color:var(--text-main); font-size:0.92rem;"
            })}
          </div>

          <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:12px; padding:12px; font-size:0.8rem; color:var(--text-muted); display:flex; gap:8px; align-items:flex-start;">
            <i data-lucide="info" style="width:16px; height:16px; color:var(--primary); flex-shrink:0; margin-top:2px;"></i>
            <span>عند تغيير صفك الدراسي، سيتم تخصيص الدورات المقترحة في صفحتك الرئيسية فوراً لتطابق مرحلتك الجديدة.</span>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button type="button" id="cancel-grade-modal-btn" class="btn-secondary" style="padding:10px 18px; border-radius:12px; font-weight:700;">إلغاء</button>
            <button type="submit" id="submit-grade-modal-btn" class="btn-primary" style="padding:10px 22px; border-radius:12px; font-weight:800; display:flex; align-items:center; gap:6px;">
              <span>حفظ وتحديث المقترحات</span>
              <i data-lucide="check" style="width:16px; height:16px;"></i>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    const closeModal = () => modal.remove();
    modal.querySelector("#close-grade-modal-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#cancel-grade-modal-btn")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    const form = modal.querySelector("#change-student-grade-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newGrade = modal.querySelector("#quick-education-select")?.value;
      if (!newGrade) return;

      const submitBtn = modal.querySelector("#submit-grade-modal-btn");
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader" class="spinner" style="width:15px; height:15px;"></i> جاري الحفظ...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        await apiFetch("/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ education: newGrade })
        });

        // Update active state and local storage
        if (!state.user) state.user = {};
        state.user.education = newGrade;
        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          storedUser.education = newGrade;
          localStorage.setItem("user", JSON.stringify(storedUser));
        } catch (_) {}

        showToast(`تم تحديث المرحلة بنجاح إلى: ${getStudentGradeDisplay(newGrade)} 🎉`, "success");
        closeModal();
        this.renderDashboard();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>حفظ وتحديث المقترحات</span><i data-lucide="check" style="width:16px; height:16px;"></i>`;
        if (window.lucide) window.lucide.createIcons();
        showToast(err.message || "تعذر تحديث المرحلة الدراسية", "error");
      }
    });
  }

  onDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
}

