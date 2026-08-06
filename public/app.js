import LandingView from "./views/LandingView.js";
import StudentView from "./views/StudentView.js";
import TeacherView from "./views/TeacherView.js";
import AdminView from "./views/AdminView.js";
import CoursePlayerView from "./views/CoursePlayerView.js";
import ClassroomView from "./views/ClassroomView.js";
import CoursesView from "./views/CoursesView.js";
import ScheduleView from "./views/ScheduleView.js";
import SettingsView from "./views/SettingsView.js";
import AssignmentsView from "./views/AssignmentsView.js";
import ResourcesView from "./views/ResourcesView.js";
import TestsView from "./views/TestsView.js";
import StudentsView from "./views/StudentsView.js";
import CourseManageView from "./views/CourseManageView.js";
import CourseLandingView from "./views/CourseLandingView.js";
import AuthView from "./views/AuthView.js";
import RequestsView from "./views/RequestsView.js";
import TeacherBlogsView from "./views/TeacherBlogsView.js";
import BlogDetailsView from "./views/BlogDetailsView.js";
import TeacherDetailsView from "./views/TeacherDetailsView.js";
import TeacherApplyView from "./views/TeacherApplyView.js";

// ─── Country Code & Phone Helpers ──────────────────────────────────────────────
export const COUNTRY_CODES = [
  { code: "+20",  flag: "🇪🇬", name: "مصر (+20)" },
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
  { code: "+33",  flag: "🇫🇷", name: "فرنسا (+33)" },
  { code: "+44",  flag: "🇬🇧", name: "بريطانيا (+44)" },
  { code: "+1",   flag: "🇺🇸", name: "أمريكا (+1)" }
];

export function renderPhoneInputGroup({ selectId = "phone-code", inputId = "phone-number", defaultCode = "+20", placeholder = "01012345678", required = true } = {}) {
  const optionsHtml = COUNTRY_CODES.map(c => `
    <option value="${c.code}" ${c.code === defaultCode ? "selected" : ""}>
      ${c.flag} ${c.name}
    </option>
  `).join("");

  return `
    <div style="display:flex; gap:8px; align-items:center;">
      <select id="${selectId}" class="form-select" style="width:130px; flex-shrink:0; font-size:0.85rem; padding:10px 8px; border-radius:10px;">
        ${optionsHtml}
      </select>
      <input type="tel" id="${inputId}" class="form-input" placeholder="${placeholder}" ${required ? "required" : ""} style="flex:1; padding:10px 14px; border-radius:10px;">
    </div>
  `;
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

// ─── Shared Course Card Renderer ──────────────────────────────────────────────

export function renderCourseCard(course, { enrollmentStatus = null, isBanned = false, progress = 0, isTeacherView = false } = {}) {
  const defaultImg = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80";
  const image = course.image || defaultImg;

  // Ribbon tag based on category / level (e.g., 3ث / 2ث / BAC)
  let ribbonTag = "3ث";
  if (course.category?.includes("Math") || course.category?.includes("رياضيات")) ribbonTag = "3ث";
  else if (course.category?.includes("Physics") || course.category?.includes("فيزياء")) ribbonTag = "2ث";
  else if (course.category?.includes("Chemistry") || course.category?.includes("كيمياء")) ribbonTag = "1ث";
  else ribbonTag = "BAC";

  const categoryTitle = course.category || "عام";
  const teacherName = course.teacher?.name || "المعلم الفاضل";
  const teacherAvatar = course.teacher?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(teacherName)}`;

  let actionButtonHTML = `<a href="#course-preview/${course.id}" class="course-price-pill">مجاني</a>`;

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
        <span class="course-ribbon-badge">${ribbonTag}</span>
      </div>

      <div class="course-card-content">
        <div class="course-instructor-row">
          <img src="${teacherAvatar}" alt="${teacherName}" class="course-instructor-avatar">
          <span class="course-instructor-name">${teacherName}</span>
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
  theme: localStorage.getItem("theme") || "dark",
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
  return state.translations[key] || key;
}

export function switchLanguage(lang) {
  state.language = lang;
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  // Reload so all views re-render with new language
  loadTranslations(lang).then(() => router());
}

// ─── Initialize App ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Apply theme + load translations BEFORE first render
  applyTheme(state.theme);
  await loadTranslations(state.language);
  document.documentElement.lang = state.language;
  document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";

  setupEventListeners();
  await checkAuth();
  await router();
  window.addEventListener("hashchange", router);
});

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
  };
  const closeSidebar = () => {
    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
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
      <div class="user-profile-trigger">
        <img src="${state.user.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Bakalorya"}" alt="Avatar" class="user-avatar">
        <span style="font-weight:600;font-size:0.9rem;">${state.user.name}</span>
        <button class="logout-btn" id="logout-button" title="${t("nav.logout")}">
          <i data-lucide="log-out"></i>
        </button>
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
          <a href="#admin-dashboard" class="sidebar-nav-item" style="color:var(--primary); font-weight:700;">
            <i data-lucide="shield"></i> لوحة تحكم المشرف
          </a>
          <a href="#admin-dashboard" class="sidebar-nav-item">
            <i data-lucide="layers"></i> إدارة التصنيفات
          </a>
          <a href="#admin-dashboard" class="sidebar-nav-item">
            <i data-lucide="book-open"></i> إدارة الدورات
          </a>
          <a href="#admin-dashboard" class="sidebar-nav-item">
            <i data-lucide="graduation-cap"></i> إدارة المعلمين
          </a>
          <a href="#admin-dashboard" class="sidebar-nav-item">
            <i data-lucide="users"></i> إدارة الطلاب
          </a>
          <a href="#admin-dashboard" class="sidebar-nav-item">
            <i data-lucide="shield-check"></i> جميع الأعضاء
          </a>
          <a href="#admin-dashboard" class="sidebar-nav-item">
            <i data-lucide="bar-chart-3"></i> التقارير والسجلات
          </a>
          <a href="#settings" class="sidebar-nav-item">
            <i data-lucide="settings"></i> ${t("nav.settings")}
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
          <a href="#assignments" class="sidebar-nav-item">
            <i data-lucide="clipboard-list"></i> ${t("nav.assignments")}
          </a>
          <a href="#resources" class="sidebar-nav-item">
            <i data-lucide="library"></i> ${t("nav.resources")}
          </a>
          <a href="#tests" class="sidebar-nav-item">
            <i data-lucide="check-square"></i> ${t("nav.tests")}
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

  if (window.lucide) window.lucide.createIcons();
  checkPendingRequestsNotification();
}

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
    if (endpoint !== "/auth/me") {
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

// ─── Router ────────────────────────────────────────────────────────────────────

export async function router() {
  const viewport = document.getElementById("app-viewport");
  if (!viewport) return;

  const hash = window.location.hash || "#landing";
  const routeParts = hash.split("/");
  const routeBase = routeParts[0];
  const routeParam = routeParts[1] || null;

  updateHeader();

  // Security
  if (routeBase === "#student-dashboard" && !state.user) {
    showToast(t("error.loginRequired") || "الرجاء تسجيل الدخول أولاً.", "error");
    window.location.hash = "#landing";
    return;
  }
  if ((routeBase === "#teacher-portal" || routeBase === "#enrollment-requests" || routeBase === "#teacher-blogs") && (!state.user || (state.user.role !== "teacher" && state.user.role !== "admin"))) {
    showToast(t("error.accessRestricted") || "الوصول مقيد للمعلمين والمشرفين.", "error");
    window.location.hash = "#landing";
    return;
  }
  if (routeBase === "#admin-dashboard" && (!state.user || state.user.role !== "admin")) {
    showToast(t("error.adminOnly") || "الوصول مقيد للمشرفين فقط.", "error");
    window.location.hash = "#landing";
    return;
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
    case "#course": ViewClass = CoursePlayerView; break;
    case "#teacher-portal": ViewClass = TeacherView; break;
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
