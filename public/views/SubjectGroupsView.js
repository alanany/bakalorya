import { apiFetch, state, t, showToast } from "../app.js";
import { openGroupPaymentModal } from "./shared/GroupPaymentModal.js";

export default class SubjectGroupsView {
  constructor(container, subjectId) {
    this.container = container;
    this.subjectId = subjectId;
    this.subjectData = null;
    this.courses = [];
    this.allGroups = [];
    this.selectedDays = []; // e.g. ["الأحد", "الثلاثاء"]
    this.searchQuery = "";
    this.selectedTeacher = "all";
    this.selectedGrade = "all"; // for any grades filter
    this.availableGrades = [];
    this.onlyAvailable = false;
    this.sortBy = "default"; // 'default', 'price_asc', 'price_desc', 'seats'
    this.daysList = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    this.loading = true;
  }

  getCoverPhoto(subjectName, primaryCourse) {
    if (primaryCourse && primaryCourse.image) {
      const img = String(primaryCourse.image).trim();
      if (img && img !== "null" && img !== "undefined") {
        return img;
      }
    }
    if (this.subjectData && this.subjectData.image) {
      const img = String(this.subjectData.image).trim();
      if (img && img !== "null" && img !== "undefined") {
        return img;
      }
    }
    const n = String(subjectName || "").toLowerCase();
    if (n.includes("connect") || n.includes("engl") || n.includes("إنجل") || n.includes("لغة")) {
      return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("عرب") || n.includes("arabic")) {
      return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("رياض") || n.includes("math")) {
      return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("فيزي") || n.includes("physic")) {
      return "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("كيمي") || n.includes("chem")) {
      return "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("أحيا") || n.includes("bio")) {
      return "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("علوم") || n.includes("scien")) {
      return "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("فرنس") || n.includes("french") || n.includes("ألمان") || n.includes("german")) {
      return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("تاريخ") || n.includes("جغراف") || n.includes("دراسات") || n.includes("history")) {
      return "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1600&auto=format&fit=crop&q=80";
    }
    if (n.includes("ict") || n.includes("حاسب") || n.includes("تكنولوج")) {
      return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&auto=format&fit=crop&q=80";
  }

  getSubjectTheme(name) {
    const n = String(name || "").toLowerCase();
    if (n.includes("عرب") || n.includes("arabic")) {
      return { gradient: "linear-gradient(135deg, #0d9488 0%, #042f2e 100%)", color: "#0d9488", icon: "📖" };
    }
    if (n.includes("engl") || n.includes("connect") || n.includes("إنجل") || n.includes("لغة")) {
      return { gradient: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)", color: "#2563eb", icon: "🔤" };
    }
    if (n.includes("رياض") || n.includes("math")) {
      return { gradient: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "#7c3aed", icon: "📐" };
    }
    if (n.includes("فيزي") || n.includes("physic")) {
      return { gradient: "linear-gradient(135deg, #d97706 0%, #78350f 100%)", color: "#d97706", icon: "⚡" };
    }
    if (n.includes("كيمي") || n.includes("chem")) {
      return { gradient: "linear-gradient(135deg, #059669 0%, #064e3b 100%)", color: "#059669", icon: "🧪" };
    }
    if (n.includes("أحيا") || n.includes("bio")) {
      return { gradient: "linear-gradient(135deg, #10b981 0%, #065f46 100%)", color: "#10b981", icon: "🧬" };
    }
    if (n.includes("فرنس") || n.includes("french") || n.includes("ألمان") || n.includes("german")) {
      return { gradient: "linear-gradient(135deg, #e11d48 0%, #881337 100%)", color: "#e11d48", icon: "🌍" };
    }
    if (n.includes("تاريخ") || n.includes("history") || n.includes("جغراف") || n.includes("دراسات")) {
      return { gradient: "linear-gradient(135deg, #b45309 0%, #78350f 100%)", color: "#b45309", icon: "🏛️" };
    }
    return { gradient: "linear-gradient(135deg, #e51d74 0%, #9f1239 100%)", color: "#e51d74", icon: "📚" };
  }

  async render() {
    this.container.innerHTML = `
      <style id="subject-groups-responsive-css">
        .subject-groups-wrapper {
          background: var(--bg-app);
          min-height: 100vh;
          padding-bottom: 80px;
        }
        .subject-groups-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(16px, 3.5vw, 32px) clamp(14px, 3vw, 24px);
        }
        .subject-header-icon {
          width: clamp(60px, 12vw, 76px);
          height: clamp(60px, 12vw, 76px);
          font-size: clamp(1.8rem, 4vw, 2.3rem);
          border-radius: 50%;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          margin-bottom: 12px;
          box-shadow: 0 10px 28px rgba(0,0,0,0.15);
          border: 3.5px solid #ffffff;
        }
        .subject-header-title {
          font-size: clamp(1.5rem, 4vw, 2.3rem);
          font-weight: 900;
          color: var(--text-color);
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .subject-header-sub {
          font-size: clamp(0.88rem, 2.5vw, 1.05rem);
          color: var(--text-muted);
          font-weight: 800;
        }
        .nagwa-days-filter-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 22px;
          padding: clamp(16px, 3vw, 22px);
          margin-bottom: clamp(20px, 4vw, 32px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.03);
        }
        .days-filter-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-start;
          direction: rtl;
        }
        .day-filter-pill {
          flex: 1 1 calc(12.5% - 8px);
          min-width: 76px;
          padding: 9px 12px;
          border-radius: 12px;
          font-weight: 800;
          font-size: clamp(0.82rem, 2vw, 0.92rem);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        @media (max-width: 768px) {
          .day-filter-pill {
            flex: 1 1 calc(25% - 8px);
            min-width: 68px;
          }
        }
        @media (max-width: 420px) {
          .day-filter-pill {
            flex: 1 1 calc(33.33% - 6px);
            min-width: 58px;
            padding: 7px 6px;
            font-size: 0.78rem;
          }
        }
        #groups-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
          gap: clamp(16px, 2.5vw, 22px);
          direction: rtl;
        }
        @media (max-width: 640px) {
          #groups-cards-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        .nagwa-teacher-group-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-header-container {
          background: rgba(0,0,0,0.02);
          padding: clamp(14px, 3vw, 18px) clamp(14px, 3vw, 20px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 12px;
        }
        .card-body-container {
          padding: clamp(16px, 3vw, 20px);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .card-dates-box {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          background: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 10px 12px;
        }
        .card-specs-box {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          text-align: center;
        }
        .card-specs-item {
          background: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 8px 4px;
        }
        .card-actions-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .card-action-btn-main {
          flex: 1.4;
          min-width: 130px;
          text-align: center;
        }
        .card-action-btn-details {
          flex: 1;
          min-width: 90px;
          text-align: center;
        }
      </style>

      <div class="subject-groups-wrapper">
        <div class="subject-groups-container">
          
          <!-- TOP BREADCRUMB & BACK BUTTON -->
          <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <a href="#landing" style="display:inline-flex; align-items:center; gap:8px; color:var(--text-muted); font-weight:800; text-decoration:none; font-size:clamp(0.85rem, 2vw, 0.92rem); background:var(--bg-card); padding:8px 16px; border-radius:18px; border:1px solid var(--border-color);">
              <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
              <span>العودة للمستكشف الرئيسي</span>
            </a>

            <div id="subject-breadcrumb" style="font-size:0.82rem; font-weight:800; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <span>المنهج الدراسي</span>
              <span>/</span>
              <span id="breadcrumb-grade">المرحلة</span>
              <span>/</span>
              <span id="breadcrumb-subject" style="color:var(--primary);">المادة</span>
            </div>
          </div>

          <!-- MAIN CONTENT CONTAINER -->
          <div id="subject-groups-content">
            <div style="text-align:center; padding:70px 20px;">
              <div class="spinner" style="width:44px; height:44px; margin:0 auto 16px; border-width:3px;"></div>
              <p style="color:var(--text-muted); font-weight:800; font-size:1rem;">جاري تحميل المقرر والمجموعات الدراسية المعتمدة...</p>
            </div>
          </div>

        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    let myEnrollments = [];
    if (state.user && state.user.role === "student") {
      try {
        myEnrollments = await apiFetch("/student/enrollments");
      } catch (_) {
        myEnrollments = [];
      }
    }
    this.myEnrollments = myEnrollments || [];

    // Fallback: If no subjectId provided in URL or literal "undefined"/"null"
    if (!this.subjectId || this.subjectId === "undefined" || this.subjectId === "null") {
      try {
        const subs = await apiFetch("/curriculum/subjects");
        if (Array.isArray(subs) && subs.length > 0) {
          this.subjectId = subs[0].id;
        } else {
          const courses = await apiFetch("/courses");
          if (Array.isArray(courses) && courses.length > 0) {
            this.subjectId = courses[0].id;
          }
        }
      } catch (e) {
        console.warn("Could not fetch fallback subjects:", e);
      }
    }

    let loadedRes = null;

    // Attempt 1: GET /curriculum/subjects/:subjectId/groups
    try {
      const url = `/curriculum/subjects/${this.subjectId || 'default'}/groups`;
      loadedRes = await apiFetch(url);
    } catch (err1) {
      console.warn("Fetch by curriculum subject failed:", err1);
    }

    // Attempt 2: GET /curriculum/courses/:subjectId/groups
    if (!loadedRes || !loadedRes.subject) {
      try {
        loadedRes = await apiFetch(`/curriculum/courses/${this.subjectId}/groups`);
      } catch (err2) {
        console.warn("Fetch by curriculum course failed:", err2);
      }
    }

    // Attempt 3: Direct Course Fetch /courses/:id and /courses/:id/groups
    if (!loadedRes || !loadedRes.subject) {
      try {
        const course = await apiFetch(`/courses/${this.subjectId}`);
        if (course && course.id) {
          let cGroups = [];
          try {
            cGroups = await apiFetch(`/courses/${course.id}/groups`);
          } catch (_) {}

          loadedRes = {
            subject: {
              id: course.id,
              name: course.category || course.title || "المقرر الدراسي",
              nameEn: course.title || "Course",
              gradeId: course.grade?.id || "",
              gradeName: course.grade?.name || "المرحلة الدراسية",
              subtitle: `${course.grade?.name || ""} • الفصل الدراسي الأول • المنهج الدراسي`
            },
            courses: [course],
            groups: (Array.isArray(cGroups) ? cGroups : []).map(g => ({
              groupId: g.id,
              groupName: g.name,
              courseId: course.id,
              courseTitle: course.title,
              gradeId: course.grade?.id || "",
              gradeName: course.grade?.name || "الصف الدراسي",
              price: g.monthlyPrice || course.price || 320,
              monthlyPrice: g.monthlyPrice || course.price || 320,
              sessionPrice: g.sessionPrice || 40,
              teacher: g.teacher || course.teacher,
              scheduleDays: g.scheduleDays || "",
              scheduleText: g.scheduleText || "",
              availableSeats: g.availableSeats !== undefined ? g.availableSeats : (g.maxStudents || 25),
              maxStudents: g.maxStudents || 25,
              isFull: !!g.isFull,
              status: g.status || "OPEN"
            })),
            availableGrades: course.grade ? [{ id: course.grade.id, name: course.grade.name }] : []
          };
        }
      } catch (err3) {
        console.warn("Fetch by direct course failed:", err3);
      }
    }



    if (loadedRes && loadedRes.subject) {
      this.subjectData = loadedRes.subject;
      this.courses = loadedRes.courses || [];
      this.primaryCourse = loadedRes.primaryCourse || null;
      this.allGroups = loadedRes.groups || [];
      this.availableGrades = loadedRes.availableGrades || [];
      if (!this.selectedCourseId) {
        const matched = this.courses.find(c => String(c.id) === String(this.subjectId));
        this.selectedCourseId = matched ? matched.id : (this.primaryCourse ? this.primaryCourse.id : "all");
      }
      this.loading = false;
      try {
        this.renderContent();
      } catch (renderErr) {
        console.error("Error executing renderContent:", renderErr);
      }
      return;
    }

    this.loading = false;
    const contentEl = document.getElementById("subject-groups-content");
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:50px 20px; border-radius:20px; max-width:550px; margin:0 auto;">
          <div style="font-size:3rem; margin-bottom:12px;">📚</div>
          <p style="color:#ef4444; font-weight:800; font-size:1.1rem; margin-bottom:8px;">عذراً، لم نتمكن من العثور على مجموعات لهذا الرابط</p>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:20px;">يمكنك استكشاف المقررات والمجموعات الدراسية المتاحة عبر المستكشف الرئيسي.</p>
          <button class="btn-primary" onclick="window.location.hash='#landing'" style="padding:10px 24px; border-radius:20px;">العودة للمستكشف الرئيسي</button>
        </div>
      `;
    }
  }

  getFilteredGroups() {
    let list = [...(this.allGroups || [])];

    // 0. Grade filter ("for any grades")
    if (this.selectedGrade && this.selectedGrade !== "all") {
      list = list.filter(g => {
        return String(g.gradeId) === String(this.selectedGrade) ||
               (g.gradeName && g.gradeName.toLowerCase().includes(this.selectedGrade.toLowerCase()));
      });
    }

    // 0.5. Course filter
    if (this.selectedCourseId && this.selectedCourseId !== "all") {
      list = list.filter(g => String(g.courseId) === String(this.selectedCourseId));
    }

    // 1. Days filter
    if (this.selectedDays && this.selectedDays.length > 0) {
      list = list.filter(g => {
        const str = `${g.scheduleDays || ''} ${g.scheduleText || ''} ${g.groupName || ''}`.toLowerCase();
        return this.selectedDays.some(d => str.includes(d.toLowerCase()));
      });
    }

    // 2. Search query
    if (this.searchQuery) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(g => {
        const name = (g.groupName || '').toLowerCase();
        const teacher = (g.teacher?.name || g.teacherName || '').toLowerCase();
        const course = (g.courseTitle || '').toLowerCase();
        return name.includes(q) || teacher.includes(q) || course.includes(q);
      });
    }

    // 3. Teacher filter
    if (this.selectedTeacher && this.selectedTeacher !== "all") {
      list = list.filter(g => {
        const tName = g.teacher?.name || g.teacherName || '';
        const tId = g.teacher?.id;
        return tName === this.selectedTeacher || String(tId) === String(this.selectedTeacher);
      });
    }

    // 4. Available seats only
    if (this.onlyAvailable) {
      list = list.filter(g => !g.isFull && (g.availableSeats === undefined || g.availableSeats > 0));
    }

    // 5. Sort
    if (this.sortBy === "price_asc") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.sortBy === "price_desc") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (this.sortBy === "seats") {
      list.sort((a, b) => (b.availableSeats || 0) - (a.availableSeats || 0));
    }

    return list;
  }

  renderContent() {
    const contentEl = document.getElementById("subject-groups-content");
    if (!contentEl || !this.subjectData) return;

    const sub = this.subjectData;
    const activeCourse = (this.courses || []).find(c => String(c.id) === String(this.selectedCourseId)) ||
                         this.primaryCourse ||
                         ((this.courses && this.courses.length > 0) ? this.courses[0] : null);
    const coverImage = this.getCoverPhoto(sub.name, activeCourse);
    const courseTitle = activeCourse?.title || sub.name;
    const gradeName = activeCourse?.gradeName || sub.gradeName || "المرحلة الدراسية";
    const courseDesc = activeCourse?.description || `شرح مبسط ومتابعة مباشرة وتأسيس قوي لمقرر ${sub.name} مع نخبة من أفضل المعلمين المعتمدين.`;
    const teacher = activeCourse?.teacher || sub.teacher || null;
    const coursePrice = activeCourse?.price || 320;
    const currency = activeCourse?.currency || "ج.م.";

    // Update breadcrumb
    const bcGrade = document.getElementById("breadcrumb-grade");
    const bcSubject = document.getElementById("breadcrumb-subject");
    if (bcGrade) bcGrade.innerText = gradeName;
    if (bcSubject) bcSubject.innerText = courseTitle;

    const filteredGroups = this.getFilteredGroups();

    // Extract unique teachers for filter dropdown
    const teacherMap = new Map();
    (this.allGroups || []).forEach(g => {
      const name = g.teacher?.name || g.teacherName;
      if (name) teacherMap.set(name, name);
    });
    const uniqueTeachers = Array.from(teacherMap.keys());

    // Extract available grades for filter ("for any grades")
    const gradeMap = new Map();
    (this.availableGrades || []).forEach(g => {
      if (g && g.id && g.name) gradeMap.set(g.id, g.name);
    });
    (this.allGroups || []).forEach(g => {
      if (g.gradeId && g.gradeName) gradeMap.set(g.gradeId, g.gradeName);
    });
    if (sub.gradeName) {
      gradeMap.set(sub.gradeId || "current", sub.gradeName);
    }
    const availableGradesList = Array.from(gradeMap.entries()).map(([id, name]) => ({ id, name }));

    contentEl.innerHTML = `
      <!-- 0. COURSE TABS (WHEN MULTIPLE COURSES EXIST) -->
      ${this.courses.length > 1 ? `
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:18px; padding:12px 18px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; gap:8px; font-weight:900; font-size:0.9rem; color:var(--text-color);">
            <span style="color:#e51d74;">📚</span>
            <span>المقررات المتوفرة لهذه المادة (${this.courses.length}):</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="course-tab-pill ${(!this.selectedCourseId || this.selectedCourseId === 'all') ? 'active' : ''}" data-course-id="all" style="
              background: ${(!this.selectedCourseId || this.selectedCourseId === 'all') ? '#e51d74' : 'var(--bg-app)'};
              color: ${(!this.selectedCourseId || this.selectedCourseId === 'all') ? '#ffffff' : 'var(--text-color)'};
              border: 1px solid ${(!this.selectedCourseId || this.selectedCourseId === 'all') ? '#e51d74' : 'var(--border-color)'};
              padding: 8px 16px;
              border-radius: 12px;
              font-size: 0.84rem;
              font-weight: 800;
              cursor: pointer;
              transition: all 0.2s;
            ">
              🌟 جميع المقررات (${this.allGroups.length} مجموعات)
            </button>
            ${this.courses.map(c => {
              const isSelected = this.selectedCourseId === c.id;
              const cGroupsCount = (this.allGroups || []).filter(g => String(g.courseId) === String(c.id)).length;
              return `
                <button type="button" class="course-tab-pill ${isSelected ? 'active' : ''}" data-course-id="${c.id}" style="
                  background: ${isSelected ? '#e51d74' : 'var(--bg-app)'};
                  color: ${isSelected ? '#ffffff' : 'var(--text-color)'};
                  border: 1px solid ${isSelected ? '#e51d74' : 'var(--border-color)'};
                  padding: 8px 16px;
                  border-radius: 12px;
                  font-size: 0.84rem;
                  font-weight: 800;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  transition: all 0.2s;
                ">
                  <span>${c.title}</span>
                  <span style="background:${isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'}; padding:1px 6px; border-radius:8px; font-size:0.72rem;">${cGroupsCount}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 1. HERO COVER PHOTO & REAL COURSE DETAILS -->
      <div class="course-cover-hero-banner" style="
        position: relative;
        width: 100%;
        min-height: 290px;
        border-radius: 26px;
        overflow: hidden;
        margin-bottom: 24px;
        background-image: linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.68) 45%, rgba(15,23,42,0.96) 100%), url('${coverImage}');
        background-size: cover;
        background-position: center;
        box-shadow: 0 16px 40px rgba(0,0,0,0.16);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: clamp(22px, 4vw, 36px);
        color: #ffffff;
      ">
        <!-- Top Badges inside Cover -->
        <div style="position: absolute; top: 20px; right: 22px; display: flex; gap: 8px; flex-wrap: wrap; z-index: 3;">
          <span style="background: rgba(0,0,0,0.65); backdrop-filter: blur(10px); color: #ffffff; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.84rem; border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 6px;">
            <span>🎓</span>
            <span>${gradeName}</span>
          </span>
          <span style="background: rgba(16,185,129,0.92); backdrop-filter: blur(10px); color: #ffffff; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
            <span>🇪🇬</span>
            <span>منهج رسمي معتمد</span>
          </span>
          ${sub.name ? `
            <span style="background: rgba(229,29,116,0.9); backdrop-filter: blur(10px); color: #ffffff; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.84rem;">
              ${sub.name}
            </span>
          ` : ''}
        </div>

        <!-- Title, Description & Teacher Meta inside Cover -->
        <div style="position: relative; z-index: 2; max-width: 900px;">
          <h1 style="
            font-size: clamp(1.75rem, 4.5vw, 2.7rem);
            font-weight: 900;
            color: #ffffff;
            margin: 0 0 10px 0;
            text-shadow: 0 3px 14px rgba(0,0,0,0.8);
            line-height: 1.25;
            letter-spacing: -0.5px;
          ">
            ${courseTitle}
          </h1>

          <p style="
            font-size: clamp(0.9rem, 2vw, 1.05rem);
            color: rgba(255,255,255,0.94);
            margin: 0 0 16px 0;
            font-weight: 600;
            line-height: 1.6;
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
            max-width: 800px;
          ">
            ${courseDesc}
          </p>

          <!-- Key Meta Pills -->
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); font-weight: 800; font-size: 0.86rem; color: #ffffff;">
              <span>👥</span>
              <span>${filteredGroups.length} مجموعات تفاعلية نشطة</span>
            </div>
          </div>

        </div>
      </div>

      <!-- 2. GROUPS FILTER TOOLBAR (FOR ANY GRADES & SESSIONS) -->
      <div class="nagwa-days-filter-card">
        
        <!-- Filter Controls Row -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:18px;">
          
          <!-- Grade Selector Filter (for any grades) -->
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">الصف الدراسي:</label>
            <select id="filter-grade-select" style="width:100%; padding:10px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.86rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
              <option value="all" ${this.selectedGrade === 'all' ? 'selected' : ''}>🎓 جميع الصفوف الدراسية</option>
              ${availableGradesList.map(g => `
                <option value="${g.id}" ${this.selectedGrade === g.id ? 'selected' : ''}>
                  ${g.name}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Search Input -->
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">بحث في المجموعات:</label>
            <input type="text" id="filter-search-input" placeholder="🔍 ابحث بالمجموعة أو المعلم..." value="${this.searchQuery || ''}"
              style="width:100%; padding:10px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.86rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
          </div>

          <!-- Teacher Select -->
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">المعلم:</label>
            <select id="filter-teacher-select" style="width:100%; padding:10px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.86rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
              <option value="all">👨‍🏫 جميع المعلمين (${uniqueTeachers.length})</option>
              ${uniqueTeachers.map(t => `<option value="${t}" ${this.selectedTeacher === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>

          <!-- Sort Dropdown -->
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--text-muted); margin-bottom:6px;">الترتيب حسب:</label>
            <select id="filter-sort-select" style="width:100%; padding:10px 14px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.86rem; font-family:'Cairo',sans-serif; box-sizing:border-box;">
              <option value="default" ${this.sortBy === 'default' ? 'selected' : ''}>الافتراضي</option>
              <option value="price_asc" ${this.sortBy === 'price_asc' ? 'selected' : ''}>السعر: من الأقل للأعلى</option>
              <option value="price_desc" ${this.sortBy === 'price_desc' ? 'selected' : ''}>السعر: من الأعلى للأقل</option>
              <option value="seats" ${this.sortBy === 'seats' ? 'selected' : ''}>الأكثر مقاعد متاحة</option>
            </select>
          </div>

          <!-- Only Available Checkbox -->
          <div style="display:flex; align-items:flex-end; padding-bottom:4px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.86rem; font-weight:800; color:var(--text-color); background:var(--bg-app); padding:9px 14px; border-radius:14px; border:1px solid var(--border-color); width:100%; box-sizing:border-box;">
              <input type="checkbox" id="filter-only-open" ${this.onlyAvailable ? 'checked' : ''} style="accent-color:#e51d74; width:17px; height:17px;">
              <span>المتاح للحجز فقط 🟢</span>
            </label>
          </div>

        </div>

        <!-- Days Filter Row -->
        <div style="border-top:1px solid var(--border-color); padding-top:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
            <span style="font-weight:900; font-size:0.92rem; color:var(--text-color); display:flex; align-items:center; gap:6px;">
              <i data-lucide="calendar" style="width:16px; height:16px; color:#e51d74;"></i>
              <span>أيام الأسبوع للحصص:</span>
            </span>
            <button id="clear-all-days-btn" style="background:none; border:none; color:#e51d74; font-weight:800; font-size:0.84rem; cursor:pointer; display:${this.selectedDays.length > 0 ? "inline-block" : "none"};">
              إلغاء تصفية الأيام
            </button>
          </div>

          <div class="days-filter-list">
            <button type="button" class="day-filter-pill ${this.selectedDays.length === 0 ? 'active' : ''}" data-day="all" style="
              border:1px solid ${this.selectedDays.length === 0 ? '#e51d74' : 'var(--border-color)'};
              background:${this.selectedDays.length === 0 ? '#e51d74' : 'var(--bg-app)'};
              color:${this.selectedDays.length === 0 ? '#ffffff' : 'var(--text-color)'};
              font-weight:900;
            ">
              جميع الأيام
            </button>
            ${this.daysList.map(day => {
              const isSelected = this.selectedDays.includes(day);
              return `
                <button type="button" class="day-filter-pill ${isSelected ? "active" : ""}" data-day="${day}" style="
                  border:1px solid ${isSelected ? "#e51d74" : "var(--border-color)"};
                  background:${isSelected ? "#e51d74" : "var(--bg-app)"};
                  color:${isSelected ? "#ffffff" : "var(--text-color)"};
                  box-shadow:${isSelected ? "0 4px 12px rgba(229,29,116,0.3)" : "none"};
                ">
                  ${day}
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Meta count bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border-color); font-size:0.84rem; font-weight:800; color:var(--text-muted); flex-wrap:wrap; gap:8px;">
          <span id="groups-count-badge">يتم عرض <strong style="color:var(--text-color); font-size:0.95rem;">${filteredGroups.length}</strong> من أصل ${this.allGroups.length} مجموعة دراسية</span>
          ${(this.selectedGrade !== 'all' || this.selectedDays.length > 0 || this.searchQuery || this.selectedTeacher !== 'all' || this.onlyAvailable) ? `
            <button id="reset-all-filters-btn" style="background:none; border:none; color:var(--primary); font-weight:800; font-size:0.82rem; cursor:pointer; text-decoration:underline;">
              إعادة ضبط جميع الفلاتر ↺
            </button>
          ` : ''}
        </div>

      </div>

      <!-- 3. GROUPS & TEACHERS CARDS GRID -->
      <div id="groups-cards-grid">
        ${this.renderGroupsList(filteredGroups)}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.attachEvents();
  }

  renderGroupsList(groupsToRender) {
    const list = groupsToRender !== undefined ? groupsToRender : this.getFilteredGroups();

    if (this.allGroups.length === 0) {
      return `
        <div style="grid-column:1/-1; text-align:center; padding:70px 20px; background:var(--bg-card); border-radius:24px; border:1px solid var(--border-color);">
          <div style="width:72px; height:72px; border-radius:24px; background:rgba(229,29,116,0.1); color:#e51d74; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px; font-size:2.2rem;">
            📚
          </div>
          <h3 style="font-size:1.35rem; font-weight:900; color:var(--text-color); margin-bottom:8px;">لا توجد مجموعات دراسية متاحة لهذه المادة حتى الآن</h3>
          <p style="font-size:0.92rem; color:var(--text-muted); max-width:480px; margin:0 auto 20px; line-height:1.6;">
            لم يقم المعلمون بفتح مجموعات دراسية لهذه المادة بعد. يمكنك العودة واستكشاف المجموعات والمواد المتاحة الأخرى.
          </p>
          <a href="#landing" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; padding:11px 26px; border-radius:14px; text-decoration:none; font-weight:800; font-size:0.9rem; background:#e51d74; color:#fff;">
            <span>استكشاف باقي المواد الدراسية 🧭</span>
          </a>
        </div>
      `;
    }

    if (list.length === 0) {
      return `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:24px; border:1px solid var(--border-color);">
          <div style="font-size:3rem; margin-bottom:12px;">📅</div>
          <h3 style="font-size:1.2rem; font-weight:900; color:var(--text-color); margin-bottom:8px;">لا توجد مجموعات تطابق خيارات التصفية</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:16px;">جرب تغيير الأيام أو إزالة البحث لعرض المجموعات المتاحة.</p>
          <button id="reset-filter-empty-btn" class="btn-primary" style="padding:10px 24px; border-radius:20px; background:#e51d74; border-color:#e51d74;">
            عرض جميع المجموعات الدراسية
          </button>
        </div>
      `;
    }

    const formatArabicDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    return list.map(group => {
      const isFull = group.isFull || group.availableSeats <= 0;
      const monthlyPrice = group.monthlyPrice || group.price || 0;
      const sessionPrice = group.sessionPrice || (monthlyPrice > 0 ? Math.round(monthlyPrice / 8) : 0);
      const totalSessions = group.totalSessions || 8;
      const duration = group.sessionDuration || 60;
      const startDateText = group.startDate ? formatArabicDate(group.startDate) : "حسب جدول الحصص";
      const endDateText = group.endDate ? formatArabicDate(group.endDate) : "حسب جدول الحصص";
      const teacherName = group.teacher?.name || group.teacherName || "معلم معتمد";
      const teacherInitial = teacherName.trim().charAt(0);
      const teacherAvatar = group.teacher?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(teacherName)}`;
      
      return `
        <div class="nagwa-teacher-group-card">
          
          <!-- CARD HEADER -->
          <div class="card-header-container">
            
            <!-- TEACHER INFO -->
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${teacherAvatar}" 
                   alt="${teacherName}" 
                   style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.1); flex-shrink:0; background:var(--bg-app);">
              <div>
                <h3 style="font-size:clamp(1rem, 2.5vw, 1.15rem); font-weight:900; color:var(--text-color); margin:0 0 4px 0;">
                  ${teacherName}
                </h3>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">معلم المادة المعتمد</span>
              </div>
            </div>

            <!-- PRICE HEADER -->
            <div class="card-price-container" style="text-align:left;">
              <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); margin-bottom:2px;">الاشتراك الشهري</div>
              <div style="font-size:clamp(1.2rem, 3vw, 1.35rem); font-weight:900; color:#e51d74; line-height:1.1;">
                ${monthlyPrice} ${group.currency || "ج.م."}
              </div>
              ${sessionPrice > 0 ? `
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">(سعر الحصة ${sessionPrice} ج.م.)</div>
              ` : ''}
            </div>

          </div>

          <!-- CARD BODY -->
          <div class="card-body-container">
            
            <!-- GROUP NAME & GRADE ROW -->
            <div style="font-weight:900; font-size:0.95rem; color:var(--text-color); display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:#e51d74;">👥</span>
                <span>${group.groupName || 'مجموعة دراسية'}</span>
              </div>
              ${group.gradeName ? `
                <span style="font-size:0.72rem; font-weight:800; background:rgba(0,86,210,0.08); color:var(--primary); padding:3px 9px; border-radius:10px;">
                  ${group.gradeName}
                </span>
              ` : ''}
            </div>

            <!-- SCHEDULE ROW -->
            <div style="display:flex; align-items:center; gap:8px; font-size:clamp(0.82rem, 2vw, 0.92rem); background:rgba(229,29,116,0.06); padding:8px 12px; border-radius:12px; color:#e51d74; font-weight:800; line-height:1.4;">
              <i data-lucide="calendar" style="width:16px; height:16px; flex-shrink:0;"></i>
              <span>الجدول: ${group.scheduleText || (group.scheduleDays ? `${group.scheduleDays} ${group.scheduleTime || ""}`.trim() : "حسب جدول المجموعة")}</span>
            </div>

            <!-- DATES GRID (START & END) -->
            <div class="card-dates-box">
              <div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">تاريخ البدء</div>
                <div style="font-size:clamp(0.78rem, 2vw, 0.85rem); font-weight:900; color:var(--text-color); line-height:1.3;">${startDateText}</div>
              </div>
              <div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:800; margin-bottom:2px;">تاريخ الانتهاء</div>
                <div style="font-size:clamp(0.78rem, 2vw, 0.85rem); font-weight:900; color:var(--text-color); line-height:1.3;">${endDateText}</div>
              </div>
            </div>

            <!-- COHORT SPECIFICATIONS (SESSIONS COUNT, DURATION, SEATS) -->
            <div class="card-specs-box">
              <div class="card-specs-item">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">عدد الحصص</div>
                <div style="font-size:clamp(0.85rem, 2vw, 0.92rem); font-weight:900; color:var(--text-color); margin-top:2px;">${totalSessions}</div>
              </div>
              <div class="card-specs-item">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">مدة الحصة</div>
                <div style="font-size:clamp(0.85rem, 2vw, 0.92rem); font-weight:900; color:var(--text-color); margin-top:2px;">${duration} دقيقةً</div>
              </div>
              <div class="card-specs-item">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">إجمالي المقاعد</div>
                <div style="font-size:clamp(0.85rem, 2vw, 0.92rem); font-weight:900; color:var(--text-color); margin-top:2px;">${group.maxStudents || 25}</div>
              </div>
            </div>

            <!-- REMAINING SEATS -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:clamp(0.82rem, 2vw, 0.88rem); flex-wrap:wrap; gap:4px;">
              <span style="font-weight:800; color:var(--text-color);">المقاعد المتبقية:</span>
              <span style="font-weight:900; color:${isFull ? "#ef4444" : "#10b981"};">
                ${isFull ? "مكتملة بالكامل (0 متبقي) 🔴" : `${group.availableSeats} من إجمالي ${group.maxStudents || 25} 🟢`}
              </span>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="card-actions-row">
              ${(() => {
                const myEnrollment = (this.myEnrollments || []).find(e => 
                  e.group?.id && String(e.group.id) === String(group.groupId)
                );
                const isPending = myEnrollment && (myEnrollment.status === 'pending' || myEnrollment.status === 'PENDING');
                const isActive = myEnrollment && (myEnrollment.status === 'active' || myEnrollment.status === 'ACTIVE');

                if (isPending) {
                  return `
                    <div class="card-action-btn-main" style="
                      background:rgba(245, 158, 11, 0.12);
                      border:1.5px solid #f59e0b;
                      color:#d97706;
                      padding:11px 14px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.85rem, 2vw, 0.92rem);
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      gap:6px;
                    ">
                      <span>⏳ قيد المراجعة والاعتماد</span>
                    </div>
                  `;
                }

                if (isActive) {
                  return `
                    <button disabled class="card-action-btn-main" style="
                      background:#10b981;
                      color:#ffffff;
                      border:none;
                      padding:12px 14px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.85rem, 2vw, 0.9rem);
                      cursor:default;
                    ">
                      ✓ أنت مسجل بالمجموعة
                    </button>
                  `;
                }

                if (group.status === 'IN_PROGRESS' || group.status === 'CLOSED') {
                  return `
                    <button disabled class="card-action-btn-main" style="
                      background:#6366f1;
                      color:#ffffff;
                      border:none;
                      padding:12px 16px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.85rem, 2vw, 0.9rem);
                      cursor:not-allowed;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      gap:6px;
                    ">
                      <span>🔒 مغلقة وبدأت الدراسة</span>
                    </button>
                  `;
                }

                if (isFull) {
                  return `
                    <button disabled class="card-action-btn-main" style="
                      background:#9ca3af;
                      color:#ffffff;
                      border:none;
                      padding:12px 20px;
                      border-radius:30px;
                      font-weight:900;
                      font-size:clamp(0.9rem, 2vw, 1rem);
                      cursor:not-allowed;
                    ">
                      المجموعة مكتملة
                    </button>
                  `;
                }

                return `
                  <button class="enroll-group-btn card-action-btn-main" 
                          data-course-id="${group.courseId}" 
                          data-group-id="${group.groupId}" 
                          data-group-name="${group.groupName}"
                          data-teacher-name="${teacherName}"
                          data-is-full="${isFull}"
                          style="
                            background:#e51d74;
                            color:#ffffff;
                            border:none;
                            padding:12px 20px;
                            border-radius:30px;
                            font-weight:900;
                            font-size:clamp(0.9rem, 2vw, 1rem);
                            cursor:pointer;
                            transition:all 0.2s ease;
                            box-shadow:0 4px 14px rgba(229,29,116,0.35);
                          ">
                    حجز مقعد الآن 🚀
                  </button>
                `;
              })()}

              <a href="#course-details/${group.courseId}/${group.groupId}" class="card-action-btn-details" style="
                background:transparent;
                color:var(--text-color);
                border:1px solid var(--border-color);
                padding:12px 18px;
                border-radius:30px;
                font-weight:800;
                font-size:clamp(0.85rem, 2vw, 0.95rem);
                text-decoration:none;
                transition:all 0.2s ease;
                display:inline-block;
              " onmouseenter="this.style.background='var(--bg-app)'" onmouseleave="this.style.background='transparent'">
                تفاصيل المقرر
              </a>
            </div>

          </div>

        </div>
      `;
    }).join("");
  }

  attachEvents() {
    // -1. Course Tab Pills
    document.querySelectorAll(".course-tab-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        const courseId = btn.getAttribute("data-course-id");
        this.selectedCourseId = courseId;
        this.renderContent();
      });
    });

    // 0. Grade Select ("for any grades")
    const gradeSelect = document.getElementById("filter-grade-select");
    gradeSelect?.addEventListener("change", (e) => {
      this.selectedGrade = e.target.value;
      this.refreshGroupsGrid();
    });

    // 1. Search Input
    const searchInput = document.getElementById("filter-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.refreshGroupsGrid();
    });

    // 2. Teacher Select
    const teacherSelect = document.getElementById("filter-teacher-select");
    teacherSelect?.addEventListener("change", (e) => {
      this.selectedTeacher = e.target.value;
      this.refreshGroupsGrid();
    });

    // 3. Sort Select
    const sortSelect = document.getElementById("filter-sort-select");
    sortSelect?.addEventListener("change", (e) => {
      this.sortBy = e.target.value;
      this.refreshGroupsGrid();
    });

    // 4. Only Open Checkbox
    const onlyOpenCheck = document.getElementById("filter-only-open");
    onlyOpenCheck?.addEventListener("change", (e) => {
      this.onlyAvailable = e.target.checked;
      this.refreshGroupsGrid();
    });

    // 5. Day filter pills click
    document.querySelectorAll(".day-filter-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        const day = btn.getAttribute("data-day");
        if (day === "all") {
          this.selectedDays = [];
        } else {
          if (this.selectedDays.includes(day)) {
            this.selectedDays = this.selectedDays.filter(d => d !== day);
          } else {
            this.selectedDays.push(day);
          }
        }
        this.renderContent();
      });
    });

    // 6. Clear all days
    document.getElementById("clear-all-days-btn")?.addEventListener("click", () => {
      this.selectedDays = [];
      this.renderContent();
    });

    // 7. Reset all filters
    const resetAllBtn = document.getElementById("reset-all-filters-btn") || document.getElementById("reset-filter-empty-btn");
    resetAllBtn?.addEventListener("click", () => {
      this.selectedGrade = "all";
      this.selectedDays = [];
      this.searchQuery = "";
      this.selectedTeacher = "all";
      this.onlyAvailable = false;
      this.sortBy = "default";
      this.renderContent();
    });

    // 8. Enroll in group button
    document.querySelectorAll(".enroll-group-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const isFull = btn.getAttribute("data-is-full") === "true";
        if (isFull) {
          showToast("عذراً، هذه المجموعة مكتملة العدد. يرجى اختيار مجموعة أخرى.", "warning");
          return;
        }

        const courseId = btn.getAttribute("data-course-id");
        const groupId = btn.getAttribute("data-group-id");
        const groupName = btn.getAttribute("data-group-name");

        const groupObj = this.allGroups.find(g => g.groupId === groupId) || {};

        openGroupPaymentModal({
          courseId,
          courseTitle: groupObj.courseTitle || this.subjectData?.name || "المقرر الدراسي",
          groupId,
          groupName: groupName || groupObj.groupName || "المجموعة الدراسية",
          teacherName: groupObj.teacher?.name || groupObj.teacherName || "الأستاذ",
          subjectName: this.subjectData?.name || "",
          scheduleDays: groupObj.scheduleDays || "الأحد والأربعاء",
          scheduleTime: groupObj.scheduleTime || "06:00 م",
          sessionPrice: groupObj.sessionPrice || 40,
          monthlyPrice: groupObj.monthlyPrice || 320,
          totalSessions: groupObj.totalSessions || 24,
          onSuccess: async () => {
            await this.loadData();
          }
        });
      });
    });
  }

  refreshGroupsGrid() {
    const grid = document.getElementById("groups-cards-grid");
    if (grid) {
      const filtered = this.getFilteredGroups();
      grid.innerHTML = this.renderGroupsList(filtered);
      if (window.lucide) window.lucide.createIcons();

      const countBadge = document.getElementById("groups-count-badge");
      if (countBadge) {
        countBadge.innerHTML = `يتم عرض <strong style="color:var(--text-color); font-size:0.95rem;">${filtered.length}</strong> من أصل ${this.allGroups.length} مجموعة دراسية`;
      }

      // Re-bind enroll buttons in grid
      grid.querySelectorAll(".enroll-group-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const isFull = btn.getAttribute("data-is-full") === "true";
          if (isFull) {
            showToast("عذراً، هذه المجموعة مكتملة العدد. يرجى اختيار مجموعة أخرى.", "warning");
            return;
          }

          const courseId = btn.getAttribute("data-course-id");
          const groupId = btn.getAttribute("data-group-id");
          const groupName = btn.getAttribute("data-group-name");

          const groupObj = this.allGroups.find(g => g.groupId === groupId) || {};

          openGroupPaymentModal({
            courseId,
            courseTitle: groupObj.courseTitle || this.subjectData?.name || "المقرر الدراسي",
            groupId,
            groupName: groupName || groupObj.groupName || "المجموعة الدراسية",
            teacherName: groupObj.teacher?.name || groupObj.teacherName || "الأستاذ",
            subjectName: this.subjectData?.name || "",
            scheduleDays: groupObj.scheduleDays || "الأحد والأربعاء",
            scheduleTime: groupObj.scheduleTime || "06:00 م",
            sessionPrice: groupObj.sessionPrice || 40,
            monthlyPrice: groupObj.monthlyPrice || 320,
            totalSessions: groupObj.totalSessions || 24,
            onSuccess: async () => {
              await this.loadData();
            }
          });
        });
      });
    }
  }
}
