// ── Public / Shared Views ─────────────────────────────────────────────────────
import LandingView from "./views/LandingView.js";
import AuthView from "./views/AuthView.js";
import TeacherDetailsView from "./views/TeacherDetailsView.js";
import StudentsView from "./views/StudentsView.js";
import AboutView from "./views/AboutView.js";
import ContactView from "./views/ContactView.js";
import FAQView from "./views/FAQView.js";
import SubscriptionPlansView from "./views/SubscriptionPlansView.js";
import SearchView from "./views/SearchView.js";
import NotificationsView from "./views/NotificationsView.js";
import ResourcesView from "./views/ResourcesView.js";
import SettingsView from "./views/SettingsView.js";
import RequestsView from "./views/RequestsView.js";
import TestsView from "./views/TestsView.js";
import BlogDetailsView from "./views/BlogDetailsView.js";

// ── Admin Views ───────────────────────────────────────────────────────────────
import AdminView from "./views/admin/AdminView.js";

// ── Teacher Views ─────────────────────────────────────────────────────────────
import TeacherView from "./views/teacher/TeacherView.js";
import TeacherGroupsView from "./views/teacher/TeacherGroupsView.js";
import TeacherPrivateSessionsView from "./views/teacher/TeacherPrivateSessionsView.js";
import TeacherAvailabilityView from "./views/teacher/TeacherAvailabilityView.js";
import TeacherBlogsView from "./views/teacher/TeacherBlogsView.js";
import TeacherApplyView from "./views/teacher/TeacherApplyView.js";

// ── Student Views ─────────────────────────────────────────────────────────────
import StudentView from "./views/student/StudentView.js";
import StudentGroupsView from "./views/student/StudentGroupsView.js";
import StudentPrivateSessionsView from "./views/student/StudentPrivateSessionsView.js";
import SubscriptionSessionsView from "./views/student/SubscriptionSessionsView.js";

// ── Shared Role Views ─────────────────────────────────────────────────────────
import CoursePlayerView from "./views/shared/CoursePlayerView.js";
import CourseManageView from "./views/shared/CourseManageView.js";
import CourseLandingView from "./views/shared/CourseLandingView.js";
import CoursesView from "./views/shared/CoursesView.js";
import AssignmentsView from "./views/shared/AssignmentsView.js";
import ScheduleView from "./views/shared/ScheduleView.js";
import ClassroomView from "./views/shared/ClassroomView.js";


// ─── Country Code & Phone Helpers ──────────────────────────────────────────────
export const COUNTRY_CODES = [
  { code: "+20", flag: "🇪🇬", name: "مصر (+20)" },
  { code: "+213", flag: "🇩🇿", name: "الجزائر (+213)" },
  { code: "+212", flag: "🇲🇦", name: "المغرب (+212)" },
  { code: "+216", flag: "🇹🇳", name: "تونس (+216)" },
  { code: "+966", flag: "🇸🇦", name: "السعودية (+966)" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات (+971)" },
  { code: "+974", flag: "🇶🇦", name: "قطر (+974)" },
  { code: "+965", flag: "🇰🇼", name: "الكويت (+965)" },
  { code: "+968", flag: "🇴🇲", name: "عمان (+968)" },
  { code: "+973", flag: "🇧🇭", name: "البحرين (+973)" },
  { code: "+962", flag: "🇯🇴", name: "الأردن (+962)" },
  { code: "+970", flag: "🇵🇸", name: "فلسطين (+970)" },
  { code: "+961", flag: "🇱🇧", name: "لبنان (+961)" },
  { code: "+964", flag: "🇮🇶", name: "العراق (+964)" },
  { code: "+963", flag: "🇸🇾", name: "سوريا (+963)" },
  { code: "+218", flag: "🇱🇾", name: "ليبيا (+218)" },
  { code: "+222", flag: "🇲🇷", name: "موريتانيا (+222)" },
  { code: "+249", flag: "🇸🇩", name: "السودان (+249)" },
  { code: "+33", flag: "🇫🇷", name: "فرنسا (+33)" },
  { code: "+44", flag: "🇬🇧", name: "بريطانيا (+44)" },
  { code: "+1", flag: "🇺🇸", name: "أمريكا (+1)" }
];

export function renderPhoneInputGroup({ selectId = "phone-code", inputId = "phone-number", defaultCode = "+213", value = "", placeholder = "0555123456", required = false } = {}) {
  const { code: selectedCode, number: numValue } = parsePhoneWithKey(value, defaultCode);
  const optionsHtml = COUNTRY_CODES.map(c => `
    <option value="${c.code}" ${c.code === selectedCode ? "selected" : ""}>
      ${c.flag} ${c.name}
    </option>
  `).join("");

  return `
    <div style="display:flex; gap:8px; align-items:center;">
      <select id="${selectId}" class="form-select" style="width:145px; flex-shrink:0; font-size:0.85rem; padding:10px 8px; border-radius:10px;">
        ${optionsHtml}
      </select>
      <input type="tel" id="${inputId}" class="form-input" value="${numValue || ''}" placeholder="${placeholder}" ${required ? "required" : ""} style="flex:1; padding:10px 14px; border-radius:10px;">
    </div>
  `;
}

export function parsePhoneWithKey(phoneString, defaultCode = "+213") {
  if (!phoneString) return { code: defaultCode, number: "" };
  const trimmed = String(phoneString).trim();
  const matched = COUNTRY_CODES.find(c => trimmed.startsWith(c.code));
  if (matched) {
    const numPart = trimmed.substring(matched.code.length).trim();
    return { code: matched.code, number: numPart };
  }
  if (trimmed.startsWith("+")) {
    const parts = trimmed.split(" ");
    if (parts.length > 1) {
      return { code: parts[0], number: parts.slice(1).join(" ") };
    }
  }
  return { code: defaultCode, number: trimmed };
}

export function getCleanWhatsAppNumber(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, "");
  if (clean.startsWith("+")) {
    return clean.replace("+", "");
  }
  if (clean.startsWith("01")) {
    return "20" + clean.substring(1);
  }
  if (clean.startsWith("0")) {
    return "213" + clean.substring(1);
  }
  return clean;
}

export function renderEducationSelectHTML({ id = "education-select", selectedValue = "Bakalorya 3", required = true, style = "" } = {}) {
  const isSel = (val) => String(selectedValue).toLowerCase() === String(val).toLowerCase() ? "selected" : "";

  const options = `
    <option value="" ${!selectedValue ? "selected" : ""} disabled>-- اختر المستوى الدراسي --</option>
    <optgroup label="التعليم الابتدائي والإعدادي">
      <option value="Grade 1 (Prep)" ${isSel("Grade 1 (Prep)")}>الصف 1 ابتدائي (Grade 1)</option>
      <option value="Grade 2 (Prep)" ${isSel("Grade 2 (Prep)")}>الصف 2 ابتدائي (Grade 2)</option>
      <option value="Grade 3 (Prep)" ${isSel("Grade 3 (Prep)")}>الصف 3 ابتدائي (Grade 3)</option>
      <option value="Grade 4 (Prep)" ${isSel("Grade 4 (Prep)")}>الصف 4 ابتدائي (Grade 4)</option>
      <option value="Grade 5 (Prep)" ${isSel("Grade 5 (Prep)")}>الصف 5 ابتدائي (Grade 5)</option>
      <option value="Grade 6 (Prep)" ${isSel("Grade 6 (Prep)")}>الصف 6 إعدادي (Grade 6)</option>
    </optgroup>
    <optgroup label="التعليم المتوسط">
      <option value="Grade 7 (Intermediate)" ${isSel("Grade 7 (Intermediate)")}>الصف 7 متوسط (Grade 7)</option>
      <option value="Grade 8 (Intermediate)" ${isSel("Grade 8 (Intermediate)")}>الصف 8 متوسط (Grade 8)</option>
      <option value="Grade 9 (Intermediate)" ${isSel("Grade 9 (Intermediate)")}>الصف 9 متوسط (Grade 9 BEM)</option>
    </optgroup>
    <optgroup label="التعليم الثانوي والباكالوريا">
      <option value="Bakalorya 1" ${isSel("Bakalorya 1")}>بكالوريا 1 (1ث - Bakalorya 1)</option>
      <option value="Bakalorya 2" ${isSel("Bakalorya 2")}>بكالوريا 2 (2ث - Bakalorya 2)</option>
      <option value="Bakalorya 3" ${isSel("Bakalorya 3") || isSel("BAC") ? "selected" : ""}>بكالوريا 3 (3ث - Bakalorya 3 BAC)</option>
    </optgroup>
    <optgroup label="مستوى آخر">
      <option value="Other" ${isSel("Other")}>آخر (Other)</option>
    </optgroup>
  `;

  return `<select id="${id}" class="form-select" ${required ? "required" : ""} style="${style}">${options}</select>`;
}

// ─── Session Join Permission Helper (30-min restriction) ───────────────────────
export function canJoinSession(session) {
  if (!session) return false;
  if (session.status === "live" || session.status === "active") return true;
  if (session.status === "completed") return false;
  if (!session.scheduledAt) return false;

  const scheduledTime = new Date(session.scheduledAt).getTime();
  const now = Date.now();
  const diffMs = scheduledTime - now;
  const thirtyMinutesMs = 30 * 60 * 1000;

  return diffMs <= thirtyMinutesMs;
}

export function getSessionJoinInfo(session) {
  if (!session) return { canJoin: false, text: "غير متاح" };
  if (session.status === "live" || session.status === "active") {
    return { canJoin: true, text: "دخول البث المباشر الآن 🔴" };
  }
  if (session.status === "completed") {
    return { canJoin: false, text: "انتهت الجلسة" };
  }

  const scheduledTime = new Date(session.scheduledAt).getTime();
  const now = Date.now();
  const diffMs = scheduledTime - now;
  const thirtyMinutesMs = 30 * 60 * 1000;

  if (diffMs <= thirtyMinutesMs) {
    return { canJoin: true, text: "الانضمام للبث المباشر 🎥" };
  } else {
    const minutesLeft = Math.ceil(diffMs / (60 * 1000));
    let timeText = `${minutesLeft} دقيقة`;
    if (minutesLeft >= 60) {
      const hours = Math.floor(minutesLeft / 60);
      const mins = minutesLeft % 60;
      timeText = `${hours} ساعة ${mins > 0 ? `و ${mins}د` : ''}`;
    }
    return {
      canJoin: false,
      text: `متاح الانضمام قبل الموعد بـ 30 دقيقة فقط`
    };
  }
}

/**
 * Validate that a session scheduled date is at least 1 hour in the future.
 */
export function validateSessionScheduledDate(scheduledAtVal) {
  if (!scheduledAtVal) {
    return { valid: false, errorMsg: "الرجاء تحديد تاريخ ووقت البث المباشر." };
  }
  const selectedDate = new Date(scheduledAtVal);
  const now = new Date();
  const minAllowed = new Date(now.getTime() + 59 * 60 * 1000);

  if (isNaN(selectedDate.getTime())) {
    return { valid: false, errorMsg: "تاريخ البث المباشر غير صالح." };
  }

  if (selectedDate < minAllowed) {
    return {
      valid: false,
      errorMsg: "عفواً، لا يمكنك اختيار تاريخ سابق أو قريب جداً! يجب أن يكون موعد البث المباشر بعد الوقت الحالي بساعة واحدة على الأقل. ❌"
    };
  }
  return { valid: true };
}

/**
 * Returns formatted ISO string for datetime-local min attribute (now + 1 hour)
 */
export function getMinSessionDateTimeISO() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ─── Shared Course Card Renderer ──────────────────────────────────────────────

export function renderCourseCard(course, { enrollmentStatus = null, isBanned = false, progress = 0, isTeacherView = false } = {}) {
  const defaultImg = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80";
  const image = course.image || defaultImg;

  const categoryTitle = course.category || "عام";
  const degreeText = course.degree || "عام / لجميع المراحل";
  const teacherName = course.teacher?.name || "المعلم الفاضل";
  const teacherAvatar = course.teacher?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(teacherName)}`;
  const isPaid = !course.isFree && course.price > 0;
  const priceLabel = isPaid ? `${course.price} ${course.currency || 'ج.م'}` : "مجاني 🎁";
  let actionButtonHTML = `<a href="#course-preview/${course.id}" class="course-price-pill" style="${isPaid ? 'background:linear-gradient(135deg,#a855f7,#6366f1);' : 'background:#10b981;'}">${priceLabel}</a>`;

  if (isTeacherView) {
    actionButtonHTML = `
      <div style="display:flex; gap:6px;">
        <a href="#manage-course/${course.id}" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-color:var(--primary); color:var(--primary); text-decoration:none;">إدارة</a>
        <a href="#course/${course.id}" class="btn-primary" style="padding:4px 10px; font-size:0.75rem; text-decoration:none;">معاينة</a>
      </div>
    `;
  } else if (enrollmentStatus === "active") {
    actionButtonHTML = `
      <a href="#course/${course.id}" class="course-price-pill" style="background:var(--primary); text-decoration:none;">
        <i data-lucide="play" style="width:12px;height:12px;margin-inline-end:4px;"></i> دخول الدورة
      </a>
    `;
  } else if (enrollmentStatus === "pending") {
    actionButtonHTML = `
      <span class="course-price-pill" style="background:var(--warning); cursor:default;">
        <i data-lucide="clock" style="width:12px;height:12px;margin-inline-end:4px;"></i> قيد الانتظار
      </span>
    `;
  } else if (enrollmentStatus === "rejected") {
    actionButtonHTML = `
      <span class="course-price-pill" style="background:var(--error); cursor:default;">
        مرفوض
      </span>
    `;
  }

  return `
    <div class="bakalorya-course-card ${isBanned ? 'banned-card' : ''}">
      <div class="course-img-wrapper">
        <img src="${image}" alt="${course.title}" loading="lazy" onerror="this.src='${defaultImg}'">
        <span class="course-category-badge">${categoryTitle}</span>
        <span class="course-ribbon-badge" style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${degreeText}">🎓 ${degreeText}</span>
      </div>

      <div class="course-card-content">
        <div class="course-instructor-row" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${teacherAvatar}" alt="${teacherName}" class="course-instructor-avatar">
            <span class="course-instructor-name">${teacherName}</span>
          </div>
          <span style="font-size:0.72rem; font-weight:700; background:rgba(0,86,210,0.08); color:var(--primary); padding:2px 8px; border-radius:12px; border:1px solid rgba(0,86,210,0.15); flex-shrink:0;" title="المستوى الدراسي">
            ${degreeText}
          </span>
        </div>

        <h4 class="course-card-title">${course.title}</h4>
        <p class="course-card-desc">${course.description || 'لا يوجد وصف حالياً.'}</p>

        ${progress > 0 ? `
          <div style="margin-top:4px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; margin-bottom:4px;">
              <span>مستوى الإنجاز</span>
              <span>${progress}%</span>
            </div>
            <div class="course-progress-bar">
              <div class="course-progress-fill" style="width:${progress}%;"></div>
            </div>
          </div>
        ` : ''}

        <div class="course-card-footer">
          <div class="course-tag-subject">
            <i data-lucide="book-open" style="width:16px;height:16px;color:var(--primary);"></i>
            <span>${categoryTitle}</span>
          </div>
          ${actionButtonHTML}
        </div>
      </div>
    </div>
  `;
}

// ─── Custom Confirmation Dialog ──────────────────────────────────────────────

export function confirmDialog({ title, message, confirmText, cancelText, danger = false } = {}) {
  return new Promise((resolve) => {
    // Remove any existing dialog
    document.getElementById("confirm-dialog-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "confirm-dialog-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
      animation:fadeIn 0.15s ease;
    `;

    overlay.innerHTML = `
      <div id="confirm-dialog-box" style="
        background:var(--bg-card);
        border:1px solid var(--border-focus);
        border-radius:24px;
        padding:32px;
        max-width:420px;
        width:90%;
        box-shadow:0 24px 60px rgba(0,0,0,0.4);
        animation:slideUp 0.2s cubic-bezier(.34,1.56,.64,1);
        text-align:center;
      ">
        <div style="
          width:56px;height:56px;border-radius:50%;margin:0 auto 20px;
          display:flex;align-items:center;justify-content:center;
          background:${danger ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'};
        ">
          <i data-lucide="${danger ? 'alert-triangle' : 'help-circle'}" style="width:28px;height:28px;color:${danger ? '#ef4444' : 'var(--primary)'};"></i>
        </div>
        <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:10px;">${title || t('dialog.title')}</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6;margin-bottom:28px;">${message || ''}</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="dialog-cancel-btn" style="
            flex:1;padding:12px 20px;
            border-radius:50px;border:1px solid var(--border-color);
            background:transparent;color:var(--text-main);
            font-size:0.9rem;font-weight:600;cursor:pointer;
            transition:all 0.2s;
          ">${cancelText || t('dialog.cancel')}</button>
          <button id="dialog-confirm-btn" style="
            flex:1;padding:12px 20px;
            border-radius:50px;border:none;
            background:${danger ? '#ef4444' : 'var(--primary)'};
            color:#fff;
            font-size:0.9rem;font-weight:700;cursor:pointer;
            transition:all 0.2s;
            box-shadow:0 4px 15px ${danger ? 'rgba(239,68,68,0.35)' : 'var(--primary-glow, rgba(99,102,241,0.35))'};
          ">${confirmText || t('dialog.confirm')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const cleanup = (result) => {
      overlay.style.animation = 'fadeOut 0.15s ease forwards';
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    };

    document.getElementById("dialog-confirm-btn").addEventListener("click", () => cleanup(true));
    document.getElementById("dialog-cancel-btn").addEventListener("click", () => cleanup(false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(false); });
  });
}

// Global SPA State
export const state = {
  user: null,
  token: localStorage.getItem("token") || null,
  currentViewInstance: null,
  theme: localStorage.getItem("theme") || "light",
  language: localStorage.getItem("language") || "ar",
  translations: {}
};

// ─── Translation helpers ───────────────────────────────────────────────────────

export async function loadTranslations(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error("locale file not found");
    state.translations = await res.json();
  } catch (e) {
    console.warn("Translations not loaded:", e);
    state.translations = {};
  }
}

export function t(key) {
  if (state.translations && state.translations[key]) {
    return state.translations[key];
  }
  return null;
}

export function switchLanguage(lang) {
  state.language = lang;
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  // Reload so all views re-render with new language
  loadTranslations(lang).then(() => router());
}

async function initApp() {
  try {
    applyTheme(state.theme);
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";

    setupEventListeners();
    window.addEventListener("hashchange", router);

    // MUST await translations BEFORE running router to ensure 100% Arabic strings on first load
    await loadTranslations(state.language);
    checkAuth().then(() => updateHeader()).catch(() => {});
    await router();
  } catch (err) {
    console.error("initApp failed:", err);
    try { await router(); } catch (e) {}
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ─── Event listeners ───────────────────────────────────────────────────────────

function setupEventListeners() {
  // Theme Toggle
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    applyTheme(isDark ? "light" : "dark");
  });

  // Language Toggle
  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    const newLang = state.language === "ar" ? "en" : "ar";
    switchLanguage(newLang);
    const btn = document.getElementById("lang-toggle");
    if (btn) btn.textContent = newLang === "ar" ? "EN" : "AR";
  });

  // Side Menu Drawer Toggle
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  const closeBtn = document.getElementById("sidebar-close-btn");

  const openSidebar = () => {
    sidebar?.classList.add("active");
    overlay?.classList.add("active");
    document.body.classList.add("sidebar-open");
  };
  const closeSidebar = () => {
    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
  };

  toggleBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem("theme", theme);
  if (theme === "light") {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function checkAuth() {
  if (!state.token) return;
  try {
    const data = await apiFetch("/auth/me");
    if (data && data.user) {
      state.user = data.user;
    } else {
      clearAuth(true);
    }
  } catch (err) {
    console.warn("Auth token invalid/expired, clearing session silently.");
    clearAuth(true);
  }
}

export function setAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("token", token);
  showToast(t("toast.welcome").replace("{name}", user.name) || `مرحباً، ${user.name}!`, "success");
  updateHeader();
  if (user.role === "admin") {
    window.location.hash = "#admin-dashboard";
  } else if (user.role === "teacher") {
    window.location.hash = "#teacher-portal";
  } else {
    window.location.hash = "#student-dashboard";
  }
}

export function clearAuth(silent = false) {
  state.token = null;
  state.user = null;
  localStorage.removeItem("token");
  if (!silent) {
    showToast(t("toast.loggedOut") || "تم تسجيل الخروج بنجاح.", "info");
  }
  updateHeader();
  if (window.location.hash !== "#landing" && window.location.hash !== "#login" && window.location.hash !== "#signup") {
    window.location.hash = "#landing";
  }
}

// ─── Header ────────────────────────────────────────────────────────────────────

export function updateHeader() {
  const navMenu = document.getElementById("nav-menu");
  const authContainer = document.getElementById("auth-action-container");
  const searchWrapper = document.getElementById("header-search-wrapper");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  if (!navMenu || !authContainer) return;

  const isAdmin = state.user && state.user.role === "admin";

  if (searchWrapper) {
    searchWrapper.style.display = isAdmin ? "none" : "flex";
  }

  if (sidebarToggleBtn) {
    sidebarToggleBtn.style.display = isAdmin ? "none" : "flex";
  }

  navMenu.innerHTML = "";
  authContainer.innerHTML = "";

  if (state.user) {
    if (state.user.role === "student") {
      navMenu.innerHTML = `
        <a href="#student-dashboard" class="nav-link active">
          <i data-lucide="layout-dashboard"></i> ${t("nav.dashboard")}
        </a>
      `;
    } else if (state.user.role === "teacher") {
      navMenu.innerHTML = `
        <a href="#teacher-portal" class="nav-link active">
          <i data-lucide="graduation-cap"></i> ${t("nav.teacherPortal")}
        </a>
        <a href="#students" class="nav-link">
          <i data-lucide="users"></i> ${t("nav.teacher.students") || "إدارة الطلاب"}
        </a>
        <a href="#enrollment-requests" class="nav-link" style="position:relative; display:flex; align-items:center; gap:6px;">
          <i data-lucide="bell"></i> ${t("nav.teacher.requests") || "طلبات التسجيل"}
          <span id="header-pending-requests-badge" style="display:none; background:var(--error); color:#fff; font-size:0.7rem; font-weight:700; padding:2px 7px; border-radius:10px; box-shadow:0 0 8px rgba(239,68,68,0.5);">0</span>
        </a>
      `;
    } else if (state.user.role === "admin") {
      navMenu.innerHTML = `
        <a href="#admin-dashboard" class="nav-link active" style="color:var(--primary); font-weight:800; display:flex; align-items:center; gap:6px;">
          <i data-lucide="shield"></i> ${t("nav.adminPanel")}
        </a>
      `;
    }

    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="#notifications" id="header-notification-btn" title="الإشعارات والتنبيهات" style="position:relative; width:38px; height:38px; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; color:var(--text-main); text-decoration:none; transition:all 0.2s ease;">
          <i data-lucide="bell" style="width:18px; height:18px;"></i>
          <span id="header-unread-notif-badge" style="display:none; position:absolute; top:-2px; right:-2px; background:var(--error,#ef4444); color:#fff; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:10px; border:2px solid var(--bg-card); min-width:18px; text-align:center;">0</span>
        </a>

        <div class="user-profile-trigger">
          <img src="${state.user.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Bakalorya"}" alt="Avatar" class="user-avatar">
          <span class="user-profile-name" style="font-weight:700; font-size:0.88rem;">${state.user.name}</span>
          <button class="logout-btn" id="logout-button" title="${t("nav.logout") || 'تسجيل الخروج'}">
            <i data-lucide="log-out" style="width:15px; height:15px;"></i>
            <span class="logout-text">${t("nav.logout") || "خروج"}</span>
          </button>
        </div>
      </div>
    `;
    document.getElementById("logout-button")?.addEventListener("click", async (e) => {
      e.preventDefault();
      const confirmed = await confirmDialog({
        title: t("dialog.signOutTitle"),
        message: t("dialog.signOutMessage"),
        confirmText: t("dialog.signOutConfirm"),
        cancelText: t("dialog.cancel"),
        danger: false
      });
      if (confirmed) clearAuth();
    });
  } else {
    navMenu.innerHTML = ``;
    authContainer.innerHTML = `
      <a href="#login" style="color:#0056D2; font-weight:700; text-decoration:none; font-size:0.9rem; margin-inline-end:8px;">${t("nav.login") || "Log In"}</a>
      <a href="#signup" style="border:1.5px solid #0056D2; color:#0056D2; background:transparent; padding:8px 18px; border-radius:6px; font-weight:800; font-size:0.9rem; text-decoration:none; transition:all 0.2s;" onmouseenter="this.style.background='#0056D2'; this.style.color='#ffffff';" onmouseleave="this.style.background='transparent'; this.style.color='#0056D2';">${t("auth.register") || "Join for Free"}</a>
    `;
  }

  // Populate Side Menu Drawer Links
  const sidebarList = document.getElementById("sidebar-menu-list");
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const closeSidebar = () => {
    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
  };

  if (sidebarList) {
    let links = `
      <a href="#landing" class="sidebar-nav-item">
        <i data-lucide="home"></i> ${t("nav.home")}
      </a>
    `;
    if (state.user) {
      if (state.user.role === "admin") {
        links += `
          <a href="#admin-dashboard/stats" class="sidebar-nav-item" style="color:var(--primary); font-weight:700;">
            <i data-lucide="shield"></i> لوحة تحكم المشرف
          </a>
          <a href="#admin-dashboard/categories" class="sidebar-nav-item">
            <i data-lucide="layers"></i> إدارة التصنيفات
          </a>
          <a href="#admin-dashboard/courses" class="sidebar-nav-item">
            <i data-lucide="book-open"></i> إدارة الدورات
          </a>
          <a href="#admin-dashboard/teachers" class="sidebar-nav-item">
            <i data-lucide="graduation-cap"></i> إدارة المعلمين
          </a>
          <a href="#admin-dashboard/students" class="sidebar-nav-item">
            <i data-lucide="users"></i> إدارة الطلاب
          </a>
          <a href="#admin-dashboard/teacherApplications" class="sidebar-nav-item">
            <i data-lucide="user-plus"></i> طلبات انضمام المعلمين
          </a>
          <a href="#admin-dashboard/members" class="sidebar-nav-item">
            <i data-lucide="shield-check"></i> جميع الأعضاء
          </a>
          <a href="#admin-dashboard/reports" class="sidebar-nav-item">
            <i data-lucide="bar-chart-3"></i> التقارير والسجلات
          </a>
          <a href="#admin-dashboard/subscriptions" class="sidebar-nav-item">
            <i data-lucide="calendar-heart"></i> إدارة الاشتراكات
          </a>
          <a href="#admin-dashboard/plans" class="sidebar-nav-item">
            <i data-lucide="settings"></i> الإعدادات وخطط الباقات
          </a>
        `;
      } else if (state.user.role === "teacher") {
        links += `
          <a href="#teacher-portal" class="sidebar-nav-item">
            <i data-lucide="graduation-cap"></i> ${t("nav.teacherPortal")}
          </a>
          <a href="#courses" class="sidebar-nav-item">
            <i data-lucide="book-open"></i> ${t("nav.teacher.courses")}
          </a>
          <a href="#schedule" class="sidebar-nav-item">
            <i data-lucide="calendar"></i> ${t("nav.teacher.schedule")}
          </a>
          <a href="#teacher-private-sessions" class="sidebar-nav-item" style="color:var(--primary);">
            <i data-lucide="users"></i> طلابي في الحصص الخاصة
          </a>
          <a href="#teacher-groups" class="sidebar-nav-item" style="color:#6366f1; font-weight:700;">
            <i data-lucide="users"></i> مجموعاتي والحصص الجماعية
          </a>
          <a href="#teacher-availability" class="sidebar-nav-item" style="color:var(--primary);">
            <i data-lucide="clock"></i> مواعيد التوفر
          </a>
          <a href="#teacher-financial" class="sidebar-nav-item" style="color:#10b981; font-weight:700;">
            <i data-lucide="wallet"></i> الأرباح والمستحقات الماليّة
          </a>
          <a href="#assignments" class="sidebar-nav-item">
            <i data-lucide="clipboard-list"></i> ${t("nav.teacher.assignments")}
          </a>
          <a href="#resources" class="sidebar-nav-item">
            <i data-lucide="library"></i> ${t("nav.teacher.resources")}
          </a>
          <a href="#tests" class="sidebar-nav-item">
            <i data-lucide="check-square"></i> ${t("nav.teacher.tests")}
          </a>
          <a href="#enrollment-requests" class="sidebar-nav-item" style="position:relative; display:flex; align-items:center;">
            <i data-lucide="user-check"></i> ${t("nav.teacher.requests") || "طلبات التسجيل"}
            <span id="sidebar-pending-requests-badge" style="display:none; background:var(--error); color:#fff; font-size:0.7rem; font-weight:700; padding:2px 7px; border-radius:10px; margin-inline-start:auto; box-shadow:0 0 8px rgba(239,68,68,0.5);">0</span>
          </a>
          <a href="#students" class="sidebar-nav-item">
            <i data-lucide="users"></i> ${t("nav.teacher.students")}
          </a>
          <a href="#teacher-blogs" class="sidebar-nav-item" style="color:#ec4899;">
            <i data-lucide="newspaper"></i> مقالات المدونة
          </a>
          <a href="#settings" class="sidebar-nav-item">
            <i data-lucide="settings"></i> ${t("nav.settings")}
          </a>
        `;
      } else {
        links += `
          <a href="#student-dashboard" class="sidebar-nav-item">
            <i data-lucide="layout-dashboard"></i> ${t("nav.dashboard")}
          </a>
          <a href="#courses" class="sidebar-nav-item">
            <i data-lucide="book-open"></i> ${t("nav.courses")}
          </a>
          <a href="#schedule" class="sidebar-nav-item">
            <i data-lucide="calendar"></i> ${t("nav.schedule")}
          </a>
          <a href="#student-private-sessions" class="sidebar-nav-item" style="color:var(--primary);">
            <i data-lucide="sparkles"></i> اشتراكاتي والحصص الخاصة
          </a>
          <a href="#student-groups" class="sidebar-nav-item" style="color:#6366f1; font-weight:700;">
            <i data-lucide="users"></i> مجموعاتي والحصص الجماعية
          </a>
          <a href="#assignments" class="sidebar-nav-item">
            <i data-lucide="clipboard-list"></i> ${t("nav.assignments")}
          </a>
          <a href="#resources" class="sidebar-nav-item">
            <i data-lucide="library"></i> ${t("nav.resources")}
          </a>
          <a href="#tests" class="sidebar-nav-item">
            <i data-lucide="check-square"></i> ${t("nav.tests")}
          </a>
          <a href="#notifications" class="sidebar-nav-item">
            <i data-lucide="bell"></i> الإشعارات والتنبيهات
          </a>
          <a href="#settings" class="sidebar-nav-item">
            <i data-lucide="settings"></i> ${t("nav.settings")}
          </a>
        `;
      }
      links += `
        <div style="margin-top:auto; padding-top:20px; border-top:1px solid var(--border-color);">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <img src="${state.user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bakalorya'}" style="width:36px;height:36px;border-radius:50%;">
            <div>
              <div style="font-weight:700;font-size:0.9rem;">${state.user.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${state.user.role.toUpperCase()}</div>
            </div>
          </div>
          <button class="btn-secondary" id="sidebar-logout-btn" style="width:100%; justify-content:center; color:var(--error); border-color:var(--error); font-size:0.85rem;">
            <i data-lucide="log-out"></i> ${t("nav.logout")}
          </button>
        </div>
      `;
    } else {
      links += `
        <a href="#landing" class="sidebar-nav-item login-btn" style="margin-top:20px; justify-content:center;">
          <i data-lucide="log-in"></i> ${t("nav.login")}
        </a>
      `;
    }
    sidebarList.innerHTML = links;

    sidebarList.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", closeSidebar);
    });

    sidebarList.querySelector("#sidebar-logout-btn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      closeSidebar();
      const confirmed = await confirmDialog({
        title: t("dialog.signOutTitle"),
        message: t("dialog.signOutMessage"),
        confirmText: t("dialog.signOutConfirm"),
        cancelText: t("dialog.cancel"),
        danger: false
      });
      if (confirmed) clearAuth();
    });
  }

  checkPendingRequestsNotification();
  updateHeaderNotificationCount();
  setupHeaderSearch();
}

export function setupHeaderSearch() {
  const searchInput = document.getElementById("header-search-input");
  const searchBtn = document.getElementById("header-search-btn");
  const searchWrapper = document.getElementById("header-search-wrapper");

  if (!searchInput || searchInput.dataset.searchBound === "true") return;
  searchInput.dataset.searchBound = "true";

  const executeSearch = () => {
    const query = searchInput.value.trim();
    const targetHash = query ? `#search?q=${encodeURIComponent(query)}` : `#search`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // Redirect on click or focus of search bar if not already on search page
  const handleActivate = () => {
    if (!window.location.hash.startsWith("#search")) {
      executeSearch();
    }
  };

  searchInput.addEventListener("click", handleActivate);
  searchInput.addEventListener("focus", handleActivate);
  searchWrapper?.addEventListener("click", handleActivate);

  searchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    executeSearch();
  });

  // Live input sync
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (window.location.hash.startsWith("#search")) {
      if (state.currentViewInstance && typeof state.currentViewInstance.updateQuery === "function") {
        state.currentViewInstance.updateQuery(query);
      } else {
        executeSearch();
      }
    } else {
      executeSearch();
    }
  });

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch();
    }
  });
}

export async function updateHeaderNotificationCount() {
  if (!state.user) return;
  try {
    const res = await apiFetch("/notifications/unread-count");
    const count = res ? (res.unreadCount || 0) : 0;
    const badge = document.getElementById("header-unread-notif-badge");
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
  } catch (err) { }
}
window.updateHeaderNotificationCount = updateHeaderNotificationCount;

export async function checkPendingRequestsNotification() {
  if (!state.user || (state.user.role !== "teacher" && state.user.role !== "admin")) return;
  try {
    const requests = await apiFetch("/teacher/enrollment-requests");
    const pendingCount = (requests || []).filter(r => r.status === "pending").length;

    const badges = [
      document.getElementById("sidebar-pending-requests-badge"),
      document.getElementById("header-pending-requests-badge")
    ];

    badges.forEach(b => {
      if (b) {
        if (pendingCount > 0) {
          b.textContent = pendingCount;
          b.style.display = "inline-block";
        } else {
          b.style.display = "none";
        }
      }
    });
  } catch (err) {
    // Silent catch
  }
}

// ─── API Fetch ─────────────────────────────────────────────────────────────────

export async function apiFetch(endpoint, options = {}) {
  const url = `${window.location.origin}/api${endpoint}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  // Endpoints that should fail silently without a toast
  const silentEndpoints = ["/sessions", "/teachers", "/blogs", "/resources", "/categories"];
  const isSilent = silentEndpoints.some(e => endpoint.startsWith(e)) || endpoint.includes("/qa");

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && endpoint !== "/auth/me") {
        clearAuth(true);
      }
      throw new Error(data.error || "Something went wrong.");
    }
    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    if (endpoint !== "/auth/me" && !isSilent) {
      showToast(error.message, "error");
    }
    throw error;
  }
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let iconName = "info";
  if (type === "success") iconName = "check-circle";
  if (type === "error") iconName = "alert-circle";

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.animation = "slideInRight 0.2s reverse forwards";
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

export function showWhatsAppToast(notification) {
  if (!notification || !notification.whatsappUrl) return;

  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast success";
  toast.style.background = "linear-gradient(135deg, #059669, #10b981)";
  toast.style.color = "#ffffff";
  toast.style.display = "flex";
  toast.style.flexDirection = "column";
  toast.style.gap = "8px";
  toast.style.padding = "16px 20px";
  toast.style.borderRadius = "16px";
  toast.style.boxShadow = "0 12px 35px rgba(16,185,129,0.4)";
  toast.style.border = "1px solid rgba(255,255,255,0.2)";

  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.95rem;">
      <span style="font-size:1.2rem;">💬</span>
      <span>تم إنشاء إشعار الواتساب للطالب!</span>
    </div>
    <div style="font-size:0.82rem; opacity:0.95; line-height:1.4;">
      رقم الطالب: <strong>${notification.formattedPhone || notification.phone}</strong>
    </div>
    <div style="display:flex; gap:8px; margin-top:6px;">
      <a href="${notification.whatsappUrl}" target="_blank" class="btn-primary" style="background:#ffffff; color:#059669; font-size:0.85rem; padding:8px 16px; border-radius:20px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
        💬 فتح الواتساب والإرسال الآن ➔
      </a>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideInRight 0.2s reverse forwards";
    setTimeout(() => toast.remove(), 200);
  }, 12000);
}

export function handleWhatsAppResponse(res) {
  if (res && res.whatsappNotification) {
    showWhatsAppToast(res.whatsappNotification);
  }
}

export function showEnrollmentAcceptanceModal({
  enrollmentId,
  studentName,
  studentPhone,
  studentEmail,
  courseTitle,
  teacherName,
  onAccept
}) {
  let modalOverlay = document.getElementById("enroll-acceptance-modal");
  if (modalOverlay) modalOverlay.remove();

  modalOverlay = document.createElement("div");
  modalOverlay.id = "enroll-acceptance-modal";
  modalOverlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
    z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: fadeIn 0.25s ease;
  `;

  let currentStep = 1;
  const formattedPhone = studentPhone ? getCleanWhatsAppNumber(studentPhone) : "";
  let paymentData = null;
  let receiptPreviewUrl = null;
  let receiptUploadPath = null;

  function getStep2Data() {
    return {
      amount: document.getElementById("pay-amount")?.value?.trim() || "",
      currency: document.getElementById("pay-currency")?.value || "EGP",
      provider: document.getElementById("pay-method")?.value || "manual",
      providerTransactionId: document.getElementById("pay-tx-id")?.value?.trim() || "",
      notes: document.getElementById("pay-notes")?.value?.trim() || "",
      receiptUrl: receiptUploadPath || null
    };
  }

  const defaultGreetingText = `مرحباً ${studentName || 'عزيزي الطالب'}! 📚🎓

مبروك! تم قبول طلب تسجيلك وانضمامك بنجاح إلى الدورة التعليمية:
📖 *${courseTitle || 'الدورة التعليمية'}*${teacherName ? ` مع الأستاذ: *${teacherName}*` : ''}

يمكنك الآن الدخول والوصول المباشر لكافة الدروس، الفيديوهات، الملخصات والجلسات التفاعلية عبر منصتنا:
🔗 ${window.location.origin}/#courses

نتمنى لك توفيقاً وحصداً لأعلى العلامات في البكالوريا! 🌟💯`;

  function buildStepHTML() {
    const dots = [1,2,3].map(s =>
      `<div style="width:${s===currentStep?'20px':'7px'};height:7px;border-radius:10px;background:${s===currentStep?'var(--primary)':s<currentStep?'rgba(99,102,241,0.45)':'var(--border-color)'};transition:all 0.3s;"></div>`
    ).join('');

    const titles = ['Step 1','Step 2','Step 3'];

    let body = '';
    if (currentStep === 1) {
      body = `
        <div style="background:rgba(99,102,241,0.08);border:1px solid var(--primary-glow);padding:16px;border-radius:16px;margin-bottom:18px;">
          <h4 style="font-weight:800;font-size:1rem;margin:0 0 10px 0;color:var(--text-main);display:flex;align-items:center;gap:8px;">
            <i data-lucide="user-check" style="color:var(--primary);"></i>
            <span id="_s1_title"></span>
          </h4>
          <div style="font-size:0.87rem;display:flex;flex-direction:column;gap:7px;color:var(--text-main);">
            <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1rem;">&#128100;</span><div><div style="font-size:0.74rem;color:var(--text-muted);" id="_lbl_student"></div><div style="font-weight:800;">${studentName}</div></div></div>
            ${studentEmail ? `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1rem;">&#128231;</span><div><div style="font-size:0.74rem;color:var(--text-muted);" id="_lbl_email"></div><div style="font-weight:700;">${studentEmail}</div></div></div>` : ''}
            <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1rem;">&#128241;</span><div><div style="font-size:0.74rem;color:var(--text-muted);" id="_lbl_phone"></div><div style="font-weight:700;">${studentPhone || '&#8212;'}</div></div></div>
            <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1rem;">&#128214;</span><div><div style="font-size:0.74rem;color:var(--text-muted);" id="_lbl_course"></div><div style="font-weight:800;color:var(--primary);">${courseTitle}</div></div></div>
          </div>
        </div>
        <p style="color:var(--text-muted);font-size:0.84rem;line-height:1.6;margin-bottom:20px;" id="_s1_desc"></p>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button id="cancel-acceptance-modal" class="btn-secondary" style="padding:9px 18px;border-radius:30px;" id="_btn_cancel"></button>
          <button id="next-acceptance-step" class="btn-primary" style="padding:9px 22px;border-radius:30px;font-weight:800;display:inline-flex;align-items:center;gap:6px;" id="_btn_next1"></button>
        </div>
      `;
    } else if (currentStep === 2) {
      const receiptZone = receiptPreviewUrl
        ? `<img src="${receiptPreviewUrl}" style="max-height:100px;max-width:100%;border-radius:10px;margin-bottom:6px;object-fit:contain;"><div id="receipt-upload-status" style="font-size:0.78rem;color:#10b981;font-weight:700;" id="_s2_receipt_ok"></div>`
        : `<i data-lucide="upload-cloud" style="width:28px;height:28px;color:var(--primary);margin-bottom:6px;"></i><div id="receipt-upload-status" style="font-size:0.78rem;color:var(--text-muted);font-weight:600;" id="_s2_receipt_hint"></div>`;
      body = `
        <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);padding:10px 14px;border-radius:12px;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-size:0.81rem;color:var(--warning);">
          <i data-lucide="info" style="width:14px;height:14px;flex-shrink:0;"></i><span id="_s2_optional"></span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px;">
          <div><label style="font-size:0.77rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;" id="_lbl_amount"></label>
            <input type="number" id="pay-amount" class="form-input" placeholder="0.00" min="0" step="0.01" value="${paymentData?paymentData.amount||'':''}" style="padding:8px 10px;font-size:0.87rem;border-radius:10px;width:100%;box-sizing:border-box;"></div>
          <div><label style="font-size:0.77rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;" id="_lbl_currency"></label>
            <select id="pay-currency" class="form-input" style="padding:8px 10px;font-size:0.87rem;border-radius:10px;width:100%;box-sizing:border-box;">
              <option value="EGP" ${!paymentData||!paymentData.currency||paymentData.currency==='EGP'?'selected':''}>&shy;</option>
              <option value="USD" ${paymentData&&paymentData.currency==='USD'?'selected':''}>USD</option>
              <option value="SAR" ${paymentData&&paymentData.currency==='SAR'?'selected':''}>SAR</option>
            </select></div>
        </div>
        <div style="margin-bottom:11px;"><label style="font-size:0.77rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;" id="_lbl_method"></label>
          <select id="pay-method" class="form-input" style="padding:8px 10px;font-size:0.87rem;border-radius:10px;width:100%;box-sizing:border-box;">
            <option value="manual" ${!paymentData||!paymentData.provider||paymentData.provider==='manual'?'selected':''}>&shy;</option>
            <option value="bank_transfer" ${paymentData&&paymentData.provider==='bank_transfer'?'selected':''}>&#128970;</option>
            <option value="vodafone_cash" ${paymentData&&paymentData.provider==='vodafone_cash'?'selected':''}>Vodafone</option>
            <option value="instapay" ${paymentData&&paymentData.provider==='instapay'?'selected':''}>InstaPay</option>
            <option value="other" ${paymentData&&paymentData.provider==='other'?'selected':''}>&#8212;</option>
          </select></div>
        <div style="margin-bottom:11px;"><label style="font-size:0.77rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;" id="_lbl_txid"></label>
          <input type="text" id="pay-tx-id" class="form-input" value="${paymentData?paymentData.providerTransactionId||'':''}" style="padding:8px 10px;font-size:0.87rem;border-radius:10px;width:100%;box-sizing:border-box;"></div>
        <div style="margin-bottom:13px;"><label style="font-size:0.77rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;" id="_lbl_notes"></label>
          <textarea id="pay-notes" class="form-input" rows="2" style="padding:8px 10px;font-size:0.84rem;border-radius:10px;width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${paymentData?paymentData.notes||'':''}</textarea></div>
        <div style="margin-bottom:16px;"><label style="font-size:0.77rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;" id="_lbl_receipt"></label>
          <div id="receipt-upload-zone" style="border:2px dashed var(--border-color);border-radius:13px;padding:15px;text-align:center;cursor:pointer;background:var(--bg-app);" onclick="document.getElementById('receipt-file-input').click()">${receiptZone}</div>
          <input type="file" id="receipt-file-input" accept="image/*,.pdf" style="display:none;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:9px;">
          <button id="prev-acceptance-step" class="btn-secondary" style="padding:7px 13px;border-radius:30px;font-size:0.82rem;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="arrow-right" style="width:13px;height:13px;"></i> <span id="_btn_prev2"></span></button>
          <div style="display:flex;gap:8px;">
            <button id="skip-payment-step" class="btn-secondary" style="padding:7px 13px;border-radius:30px;font-size:0.81rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="skip-forward" style="width:12px;height:12px;"></i> <span id="_btn_skip"></span></button>
            <button id="next-payment-step" class="btn-primary" style="padding:7px 16px;border-radius:30px;font-size:0.82rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;"><span id="_btn_next2"></span> <i data-lucide="arrow-left" style="width:13px;height:13px;"></i></button>
          </div>
        </div>
      `;
    } else {
      const payBanner = paymentData
        ? `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);padding:9px 13px;border-radius:11px;font-size:0.79rem;margin-bottom:13px;display:flex;align-items:center;gap:7px;color:#10b981;"><i data-lucide="check-circle" style="width:15px;height:15px;flex-shrink:0;"></i><span id="_s3_paybanner"></span></div>`
        : `<div style="background:rgba(99,102,241,0.07);border:1px solid var(--primary-glow);padding:9px 13px;border-radius:11px;font-size:0.79rem;margin-bottom:13px;display:flex;align-items:center;gap:7px;color:var(--primary);"><i data-lucide="info" style="width:15px;height:15px;flex-shrink:0;"></i><span id="_s3_nopay"></span></div>`;
      const waBanner = formattedPhone
        ? `<div style="background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);color:#25D366;padding:9px 13px;border-radius:11px;font-size:0.79rem;margin-bottom:18px;display:flex;align-items:center;gap:7px;"><i data-lucide="message-circle" style="width:16px;height:16px;flex-shrink:0;"></i><span id="_s3_wa"></span></div>`
        : `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:var(--warning);padding:9px 13px;border-radius:11px;font-size:0.79rem;margin-bottom:18px;" id="_s3_nophone"></div>`;
      body = `
        ${payBanner}
        <label style="font-weight:800;font-size:0.88rem;margin-bottom:7px;display:block;color:var(--text-main);" id="_lbl_greeting"></label>
        <textarea id="custom-greeting-text" class="form-input" rows="6" style="width:100%;padding:11px;font-family:inherit;font-size:0.84rem;line-height:1.5;resize:vertical;margin-bottom:13px;border-radius:12px;box-sizing:border-box;">${defaultGreetingText}</textarea>
        ${waBanner}
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:9px;">
          <button id="prev-acceptance-step" class="btn-secondary" style="padding:7px 13px;border-radius:30px;font-size:0.82rem;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="arrow-right" style="width:13px;height:13px;"></i> <span id="_btn_prev3"></span></button>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="confirm-acceptance-only-btn" class="btn-secondary" style="padding:9px 15px;border-radius:30px;font-size:0.82rem;font-weight:700;" id="_btn_confirmonly"></button>
            <button id="confirm-acceptance-whatsapp-btn" class="btn-primary" style="padding:9px 18px;border-radius:30px;font-size:0.82rem;font-weight:800;background:linear-gradient(135deg,#059669,#10b981);border:none;box-shadow:0 5px 18px rgba(16,185,129,0.35);display:inline-flex;align-items:center;gap:5px;" id="_btn_confirmwa"></button>
          </div>
        </div>
      `;
    }

    return { dots, body };
  }

  function setTexts() {
    const T = window._bak_i18n || {};
    const s = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const h = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    if (currentStep === 1) {
      s('_s1_title', T['req.studentData'] || '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0627\u0644\u0628 \u0648\u0627\u0644\u062f\u0648\u0631\u0629');
      s('_lbl_student', T['lbl.name'] || '\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628');
      s('_lbl_email', T['lbl.email'] || '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a');
      s('_lbl_phone', T['lbl.phone'] || '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641');
      s('_lbl_course', T['lbl.course'] || '\u0627\u0644\u062f\u0648\u0631\u0629');
      s('_s1_desc', T['req.step1desc'] || '\u0641\u064a \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u064a\u0645\u06a9\u0646\u06a9 \u062a\u0633\u062c\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u0648\u0631\u0641\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644.');
      h('cancel-acceptance-modal', T['btn.cancel'] || '\u0625\u0644\u063a\u0627\u0621');
      h('next-acceptance-step', (T['btn.nextPayment'] || '\u0627\u0644\u062a\u0627\u0644\u064a: \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0641\u0639') + ' \u2192');
    } else if (currentStep === 2) {
      s('_s2_optional', T['req.payOptional'] || '\u0647\u0630\u0647 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629 \u2014 \u064a\u0645\u06a9\u0646\u06a9 \u062a\u062e\u0637\u064a\u0647\u0627 \u0648\u0642\u0628\u0648\u0644 \u0627\u0644\u0637\u0627\u0644\u0628 \u0628\u062f\u0648\u0646 \u062a\u0633\u062c\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0641\u0639.');
      s('_lbl_amount', T['lbl.amount'] || '\uD83D\uDCB0 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062f\u0641\u0648\u0639');
      s('_lbl_currency', T['lbl.currency'] || '\uD83D\uDCB1 \u0627\u0644\u0639\u0645\u0644\u0629');
      const payMethodEl = document.getElementById('pay-currency');
      if (payMethodEl) {
        const opts = payMethodEl.options;
        if (opts[0]) opts[0].text = T['currency.EGP'] || '\u062C\u0646\u064A\u0647 \u0645\u0635\u0631\u064A (EGP)';
      }
      s('_lbl_method', T['lbl.payMethod'] || '\uD83C\uDFE6 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639');
      const pmEl = document.getElementById('pay-method');
      if (pmEl) {
        const o = pmEl.options;
        if (o[0]) o[0].text = T['method.cash'] || '\u0646\u0642\u062f\u0627\u064b (\u06a9\u0627\u0634)';
        if (o[1]) o[1].text = T['method.bank'] || '\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u06a9\u064a';
        if (o[2]) o[2].text = T['method.vf'] || '\u0641\u0648\u062f\u0627\u0641\u0648\u0646 \u06a9\u0627\u0634';
        if (o[3]) o[3].text = 'InstaPay';
        if (o[4]) o[4].text = T['method.other'] || '\u0623\u062e\u0631\u0649';
      }
      s('_lbl_txid', T['lbl.txid'] || '\uD83D\uDD22 \u0631\u0642\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629 / \u0627\u0644\u0625\u064A\u0635\u0627\u0644 (\u0627\u062e\u062a\u064A\u0627\u0631\u064A)');
      const txEl = document.getElementById('pay-tx-id');
      if (txEl) txEl.placeholder = T['ph.txid'] || '\u0645\u062b\u0627\u0644: TXN-2024-001...';
      s('_lbl_notes', T['lbl.notes'] || '\uD83D\uDCDD \u0645\u0644\u0627\u062d\u0638\u0627\u062a (\u0627\u062e\u062a\u064A\u0627\u0631\u064A)');
      const ntEl = document.getElementById('pay-notes');
      if (ntEl) ntEl.placeholder = T['ph.notes'] || '\u0623\u064A \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u062D\u0648\u0644 \u0627\u0644\u062F\u0641\u0639\u0629...';
      s('_lbl_receipt', T['lbl.receipt'] || '\uD83E\uDDFE \u0631\u0641\u0639 \u0627\u0644\u0625\u064A\u0635\u0627\u0644 / \u0635\u0648\u0631\u0629 \u0627\u0644\u062F\u0641\u0639');
      s('receipt-upload-status', receiptPreviewUrl ? (T['receipt.ok']||'\u2705 \u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u0628\u0646\u062c\u0627\u062d') : (T['receipt.hint']||'\u0627\u0636\u063a\u0637 \u0644\u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u0631\u0629 \u0627\u0644\u0625\u064a\u0635\u0627\u0644'));
      s('_btn_prev2', T['btn.prev'] || '\u0627\u0644\u0633\u0627\u0628\u0642');
      s('_btn_skip', T['btn.skip'] || '\u062a\u062e\u0637\u064a');
      s('_btn_next2', T['btn.nextGreeting'] || '\u0627\u0644\u062a\u0627\u0644\u064a: \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062a\u0631\u062d\u064a\u0628');
    } else {
      if (paymentData) {
        s('_s3_paybanner', (T['pay.recorded'] || '\u2705 \u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0641\u0639') + (paymentData.receiptUrl ? (' ' + (T['pay.andReceipt']||'\u0648\u0627\u0644\u0625\u064a\u0635\u0627\u0644')) : ''));
      } else {
        s('_s3_nopay', T['pay.skipped'] || '\u062a\u062e\u0637\u064a \u0627\u0644\u062f\u0641\u0639 \u2014 \u0633\u064a\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u0637\u0627\u0644\u0628 \u0628\u062f\u0648\u0646 \u0633\u062c\u0644 \u0645\u0627\u0644\u064a.');
      }
      s('_lbl_greeting', T['lbl.greeting'] || '\uD83D\uDCAC \u0646\u0635 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u0647\u0646\u0626\u0629 \u0644\u0644\u0637\u0627\u0644\u0628');
      if (formattedPhone) {
        s('_s3_wa', (T['wa.sendTo'] || '\u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0647\u0646\u0626\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628:') + ' +' + formattedPhone);
      } else {
        s('_s3_nophone', T['wa.noPhone'] || '\u26A0\uFE0F \u0627\u0644\u0637\u0627\u0644\u0628 \u0644\u0645 \u064A\u0633\u062C\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641.');
      }
      s('_btn_prev3', T['btn.prev'] || '\u0627\u0644\u0633\u0627\u0628\u0642');
      h('confirm-acceptance-only-btn', T['btn.confirmOnly'] || '\u062a\u0623\u06a9\u064a\u062f \u0627\u0644\u0642\u0628\u0648\u0644 \u0641\u0642\u0637');
      h('confirm-acceptance-whatsapp-btn', '\uD83D\uDCAC ' + (T['btn.confirmWa'] || '\u0642\u0628\u0648\u0644 + \u0648\u0627\u062a\u0633\u0627\u0628'));
    }
  }

  function renderModalContent() {
    const { dots, body } = buildStepHTML();
    const stepTitleMap = {
      1: '\u0627\u0644\u062e\u0637\u0648\u0629 1: \u062a\u0623\u06a9\u064a\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0627\u0644\u0628',
      2: '\u0627\u0644\u062e\u0637\u0648\u0629 2: \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u0625\u064a\u0635\u0627\u0644',
      3: '\u0627\u0644\u062e\u0637\u0648\u0629 3: \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062a\u0631\u062d\u064a\u0628'
    };
    modalOverlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);width:100%;max-width:560px;border-radius:24px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.5);position:relative;max-height:92vh;overflow-y:auto;">
        <button id="close-acceptance-modal-x" style="position:absolute;top:20px;left:20px;background:transparent;border:none;color:var(--text-muted);font-size:1.4rem;cursor:pointer;line-height:1;z-index:1;">&times;</button>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:13px;border-bottom:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:var(--primary);color:#fff;width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.84rem;flex-shrink:0;">${currentStep}</span>
            <span style="font-weight:800;font-size:0.97rem;color:var(--text-main);">${stepTitleMap[currentStep]}</span>
          </div>
          <div style="display:flex;gap:5px;align-items:center;">${dots}</div>
        </div>
        ${body}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    setTexts();

    // Common
    document.getElementById("close-acceptance-modal-x")?.addEventListener("click", () => modalOverlay.remove());
    document.getElementById("cancel-acceptance-modal")?.addEventListener("click", () => modalOverlay.remove());
    document.getElementById("prev-acceptance-step")?.addEventListener("click", () => { if (currentStep > 1) { currentStep--; renderModalContent(); } });

    // Step 1
    document.getElementById("next-acceptance-step")?.addEventListener("click", () => { currentStep = 2; renderModalContent(); });

    // Step 2
    document.getElementById("receipt-file-input")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const statusEl = document.getElementById("receipt-upload-status");
      const zone = document.getElementById("receipt-upload-zone");
      if (statusEl) statusEl.textContent = '\u23f3 \u062c\u0627\u0631\u064a \u0631\u0641\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644...';
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadJson = await uploadRes.json();
        receiptUploadPath = uploadJson.url || uploadJson.path || uploadJson.filename;
        receiptPreviewUrl = receiptUploadPath;
        if (zone) zone.innerHTML = `<img src="${receiptPreviewUrl}" style="max-height:100px;max-width:100%;border-radius:10px;margin-bottom:6px;object-fit:contain;" onerror="this.style.display='none'"><div style="font-size:0.78rem;color:#10b981;font-weight:700;" id="receipt-upload-status">\u2705 \u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u0628\u0646\u062c\u0627\u062d</div>`;
      } catch (err) {
        if (statusEl) statusEl.textContent = '\u274c \u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641';
        console.error("Receipt upload error:", err);
      }
    });

    document.getElementById("skip-payment-step")?.addEventListener("click", () => {
      paymentData = null; currentStep = 3; renderModalContent();
    });
    document.getElementById("next-payment-step")?.addEventListener("click", () => {
      const data = getStep2Data();
      paymentData = (data.amount || data.providerTransactionId || data.receiptUrl || data.notes) ? data : null;
      currentStep = 3; renderModalContent();
    });

    // Step 3
    document.getElementById("confirm-acceptance-only-btn")?.addEventListener("click", async () => {
      modalOverlay.remove();
      if (onAccept) await onAccept(null, false, paymentData);
    });
    document.getElementById("confirm-acceptance-whatsapp-btn")?.addEventListener("click", async () => {
      const customMsg = document.getElementById("custom-greeting-text")?.value || defaultGreetingText;
      modalOverlay.remove();
      if (onAccept) await onAccept(customMsg, true, paymentData);
    });
  }

  document.body.appendChild(modalOverlay);
  renderModalContent();
}

export function showEnrollmentRequestedModal({ courseTitle, teacherName, courseImage } = {}) {
  let modalOverlay = document.getElementById("enrollment-requested-modal");
  if (modalOverlay) modalOverlay.remove();

  modalOverlay = document.createElement("div");
  modalOverlay.id = "enrollment-requested-modal";
  modalOverlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
    z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: fadeIn 0.25s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); width:100%; max-width:500px; border-radius:28px; padding:32px; text-align:center; box-shadow:0 30px 80px rgba(0,0,0,0.6); position:relative; overflow:hidden;">
      
      <!-- Glowing Animated Success Icon -->
      <div style="width:76px; height:76px; background:linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.3)); border:2px solid #10b981; border-radius:50%; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 30px rgba(16,185,129,0.4);">
        <i data-lucide="check-circle-2" style="width:42px; height:42px; color:#10b981;"></i>
      </div>

      <span class="session-tag" style="background:rgba(245,158,11,0.15); color:var(--warning); border:1px solid rgba(245,158,11,0.3); font-weight:800; font-size:0.82rem; padding:5px 16px; border-radius:20px; margin-bottom:14px; display:inline-block;">
        ⏳ قيد الانتظار لموافقة المعلم (Pending Approval)
      </span>

      <h3 style="font-size:1.4rem; font-weight:900; color:var(--text-main); margin:6px 0 10px 0;">
        تم تقديم طلب التسجيل بنجاح! 🎉
      </h3>

      <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.6; margin-bottom:24px;">
        تم إرسال طلب انضمامك إلى الدورة التعليمية بنجاح. سيقوم الأستاذ بمراجعة الطلب وتأكيده ليتم تفعيل اشتراكك وتنبيهك فوراً.
      </p>

      ${courseTitle ? `
        <div style="background:var(--bg-app); border:1px solid var(--border-color); padding:16px; border-radius:18px; margin-bottom:24px; text-align:start; display:flex; gap:14px; align-items:center;">
          ${courseImage ? `<img src="${courseImage}" style="width:54px; height:54px; object-fit:cover; border-radius:12px; flex-shrink:0;">` : ''}
          <div>
            <div style="font-size:0.75rem; color:var(--primary); font-weight:800;">📖 الدورة المطلوبة:</div>
            <div style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-top:2px;">${courseTitle}</div>
            ${teacherName ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">الأستاذ: ${teacherName}</div>` : ''}
          </div>
        </div>
      ` : ''}

      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="close-enroll-modal-btn" class="btn-primary" style="flex:1; padding:12px 24px; border-radius:30px; font-weight:800; font-size:0.92rem;">
          فهمت، حسناً 👍
        </button>
        <a href="#courses" id="explore-more-courses-btn" class="btn-secondary" style="flex:1; padding:12px 20px; border-radius:30px; font-size:0.88rem; font-weight:700; text-decoration:none; justify-content:center; display:flex; align-items:center;">
          تصفح الدورات
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  if (window.lucide) window.lucide.createIcons();

  document.getElementById("close-enroll-modal-btn")?.addEventListener("click", () => modalOverlay.remove());
  document.getElementById("explore-more-courses-btn")?.addEventListener("click", () => modalOverlay.remove());
}

// ─── Router ────────────────────────────────────────────────────────────────────

export async function router() {
  const viewport = document.getElementById("app-viewport");
  if (!viewport) return;

  const hash = window.location.hash || "#landing";
  let routeBase = hash;
  let routeParam = null;

  if (hash.includes("?")) {
    const mainParts = hash.split("?");
    routeBase = mainParts[0];
    const queryString = mainParts[1] || "";
    const params = new URLSearchParams(queryString);
    routeParam = params.get("id") || params.get("q") || queryString;
  } else if (hash.includes("/")) {
    const routeParts = hash.split("/");
    routeBase = routeParts[0];
    routeParam = routeParts[1] || null;
  }

  updateHeader();

  // Security
  if (routeBase === "#student-dashboard" && !state.user) {
    showToast(t("error.loginRequired") || "الرجاء تسجيل الدخول أولاً.", "error");
    window.location.hash = "#landing";
    return router();
  }
  if ((routeBase === "#teacher-portal" || routeBase === "#enrollment-requests" || routeBase === "#teacher-blogs" || routeBase === "#teacher-private-sessions" || routeBase === "#teacher-groups" || routeBase === "#teacher-financial") && (!state.user || (state.user.role !== "teacher" && state.user.role !== "admin"))) {
    showToast(t("error.accessRestricted") || "الوصول مقيد للمعلمين والمشرفين.", "error");
    window.location.hash = "#landing";
    return router();
  }
  if (routeBase === "#admin-dashboard" && state.user && state.user.role !== "admin") {
    showToast(t("error.adminOnly") || "الوصول مقيد للمشرفين فقط.", "error");
    window.location.hash = "#landing";
    return router();
  }

  // Destroy old view
  if (state.currentViewInstance && typeof state.currentViewInstance.onDestroy === "function") {
    state.currentViewInstance.onDestroy();
  }

  let ViewClass;
  switch (routeBase) {
    case "":
    case "#":
    case "#landing": ViewClass = LandingView; break;
    case "#login":
    case "#signup":
    case "#auth": ViewClass = AuthView; break;
    case "#student-dashboard": ViewClass = StudentView; break;
    case "#student-groups": ViewClass = StudentGroupsView; break;
    case "#student-private-sessions": ViewClass = StudentPrivateSessionsView; break;
    case "#subscription-sessions": ViewClass = SubscriptionSessionsView; break;
    case "#course": ViewClass = CoursePlayerView; break;
    case "#teacher-portal": ViewClass = TeacherView; break;
    case "#teacher-financial": ViewClass = TeacherView; break;
    case "#teacher-private-sessions": ViewClass = TeacherPrivateSessionsView; break;
    case "#teacher-groups": ViewClass = TeacherGroupsView; break;
    case "#teacher-availability": ViewClass = TeacherAvailabilityView; break;
    case "#teacher": ViewClass = TeacherDetailsView; break;
    case "#teacher-apply": ViewClass = TeacherApplyView; break;
    case "#enrollment-requests": ViewClass = RequestsView; break;
    case "#teacher-blogs": ViewClass = TeacherBlogsView; break;
    case "#blog": ViewClass = BlogDetailsView; break;
    case "#classroom": ViewClass = ClassroomView; break;
    case "#admin-dashboard": ViewClass = AdminView; break;
    case "#courses": ViewClass = CoursesView; break;
    case "#manage-course": ViewClass = CourseManageView; break;
    case "#course-preview": ViewClass = CourseLandingView; break;
    case "#schedule": ViewClass = ScheduleView; break;
    case "#assignments": ViewClass = AssignmentsView; break;
    case "#resources": ViewClass = ResourcesView; break;
    case "#tests": ViewClass = TestsView; break;
    case "#students": ViewClass = StudentsView; break;
    case "#settings": ViewClass = SettingsView; break;
    case "#notifications": ViewClass = NotificationsView; break;
    case "#search": ViewClass = SearchView; break;
    case "#about": ViewClass = AboutView; break;
    case "#contact": ViewClass = ContactView; break;
    case "#faq": ViewClass = FAQView; break;
    case "#subscription-plans": ViewClass = SubscriptionPlansView; break;
    default:
      ViewClass = LandingView;
  }

  // Show spinner
  viewport.innerHTML = `<div class="app-loader"><div class="spinner"></div></div>`;

  try {
    const viewInstance = new ViewClass(viewport, routeParam);
    state.currentViewInstance = viewInstance;
    await viewInstance.render();
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("View rendering failed:", err);
    viewport.innerHTML = `
      <div style="text-align:center;padding:100px 24px;">
        <h2 style="margin-bottom:16px;">${t("error.loadFailed")}</h2>
        <p style="color:var(--text-muted);margin-bottom:24px;">${err.message}</p>
        <a href="#landing" class="btn-primary">${t("nav.home")}</a>
      </div>
    `;
  }
}

// Global listener for 30-minute session join restriction
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".restricted-join-btn");
  if (btn) {
    e.preventDefault();
    showToast("عفواً، لا يمكنك الانضمام للبث المباشر إلا قبل الموعد بـ 30 دقيقة فقط! ❌", "error");
  }
});

// ── Universal Multi-Timezone Utilities ─────────────────────────────────────────

export const TIMEZONE_MAP = {
  "Asia/Riyadh": { name: "توقيت السعودية", flag: "🇸🇦", utcOffset: "+3" },
  "Africa/Cairo": { name: "توقيت مصر", flag: "🇪🇬", utcOffset: "+3" },
  "Asia/Dubai": { name: "توقيت الإمارات", flag: "🇦🇪", utcOffset: "+4" },
  "Asia/Kuwait": { name: "توقيت الكويت", flag: "🇰🇼", utcOffset: "+3" },
  "Asia/Qatar": { name: "توقيت قطر", flag: "🇶🇦", utcOffset: "+3" },
  "Asia/Amman": { name: "توقيت الأردن", flag: "🇯🇴", utcOffset: "+3" },
  "Asia/Baghdad": { name: "توقيت العراق", flag: "🇮🇶", utcOffset: "+3" },
  "Europe/London": { name: "توقيت غرينتش", flag: "🇬🇧", utcOffset: "+0" }
};

export function getUserTimezone() {
  if (state.user && state.user.timezone) {
    return state.user.timezone;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo";
  } catch (e) {
    return "Africa/Cairo";
  }
}

export function getTimezoneBadgeHTML(tz = getUserTimezone()) {
  const info = TIMEZONE_MAP[tz] || { name: "التوقيت المحلي", flag: "🌐" };
  return `<span class="tz-badge" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.12); color:var(--primary); padding:2px 8px; border-radius:8px;">${info.flag} ${info.name}</span>`;
}

export function formatSessionDateTime(dateInput, targetTz = null, options = {}) {
  if (!dateInput) return { timeStr: "-", dateStr: "-", fullStr: "-", badgeHTML: "", secondaryTZHTML: "" };
  
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { timeStr: "-", dateStr: "-", fullStr: "-", badgeHTML: "", secondaryTZHTML: "" };

  const tz = targetTz || getUserTimezone();
  const tzInfo = TIMEZONE_MAP[tz] || { name: "التوقيت المحلي", flag: "🌐" };

  let timeStr = "";
  let dateStr = "";
  try {
    timeStr = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    dateStr = d.toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
  } catch (e) {
    timeStr = d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
    dateStr = d.toLocaleDateString("ar", { month: "short", day: "numeric" });
  }

  const badgeHTML = `<span class="tz-badge" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:800; background:rgba(99,102,241,0.12); color:var(--primary); padding:2px 8px; border-radius:8px;">${tzInfo.flag} ${tzInfo.name}</span>`;
  const fullStr = `${dateStr} • ${timeStr} (${tzInfo.flag} ${tzInfo.name})`;

  let secondaryTZHTML = "";
  if (options.secondaryTz && options.secondaryTz !== tz) {
    const secInfo = TIMEZONE_MAP[options.secondaryTz] || { name: options.secondaryTz, flag: "🌐" };
    try {
      const secTimeStr = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", timeZone: options.secondaryTz });
      secondaryTZHTML = `<span style="font-size:0.74rem; color:var(--text-muted); font-weight:600;">(${secTimeStr} ${secInfo.flag} ${secInfo.name})</span>`;
    } catch (e) {}
  }

  return { timeStr, dateStr, fullStr, badgeHTML, secondaryTZHTML };
}
