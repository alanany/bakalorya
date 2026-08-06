import { apiFetch, state, showToast, t, checkPendingRequestsNotification, renderCourseCard } from "../app.js";

export default class TeacherView {
  constructor(container) {
    this.container = container;
    this.courses = [];
    this.sessions = [];
    this.sessionFilter = "all";
    this.selectedCourseForLesson = null;
  }

  async render() {
    try {
      const [allCourses, sessions, students, requests, allBlogs] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/sessions"),
        apiFetch("/users/students"),
        apiFetch("/teacher/enrollment-requests"),
        apiFetch("/blogs")
      ]);

      this.courses = (allCourses || []).filter(c => c.teacher?.id === state.user.id);
      this.sessions = (sessions || []).filter(s => s.teacher?.id === state.user.id);
      this.blogs = (allBlogs || []).filter(b => b.author?.id === state.user.id);

      const totalCourses = this.courses.length;
      const upcomingSessions = this.sessions.filter(s => s.status === "scheduled").length;
      const activeStudentsCount = students ? students.length : 0;
      const filteredSessions = this.filterSessions(this.sessions);
      this.enrollmentRequests = requests || [];

      this.container.innerHTML = `
        <div class="teacher-layout">
          <div class="teacher-header-row">
            <div>
              <h2 style="font-size: 1.8rem; font-weight:800; margin-bottom: 8px;">${t("teacher.portalTitle")}</h2>
              <p style="color:var(--text-muted)">${t("teacher.portalSubtitle").replace("{name}", state.user.name)}</p>
            </div>
            <div class="teacher-actions-top">
              <button class="btn-primary" id="open-course-modal-btn"><i data-lucide="plus-circle"></i> ${t("teacher.createCourse")}</button>
              <button class="btn-secondary" id="open-session-modal-btn" style="border-color:var(--primary); color:var(--primary);"><i data-lucide="calendar-plus"></i> ${t("teacher.planSession")}</button>
              <a href="#students" class="btn-primary" style="background:#10b981; border-color:#10b981; text-decoration:none; display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:8px; font-weight:800;"><i data-lucide="user-plus"></i> إضافة / إدارة الطلاب</a>
              <a href="#teacher-blogs" class="btn-secondary" style="border-color:#ec4899; color:#ec4899; text-decoration:none; display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px;"><i data-lucide="newspaper"></i> مقالات المدونة</a>
            </div>
          </div>

          <!-- Stats -->
          <div class="dashboard-stats-grid" style="margin-bottom: 40px;">
            <div class="glass-card stat-box">
              <div class="stat-box-icon"><i data-lucide="book-open"></i></div>
              <div>
                <div class="stat-box-val">${totalCourses}</div>
                <div class="stat-box-lbl">${t("teacher.publishedCourses")}</div>
              </div>
            </div>
            <div class="glass-card stat-box">
              <div class="stat-box-icon" style="color:var(--accent); background:var(--accent-glow);"><i data-lucide="video"></i></div>
              <div>
                <div class="stat-box-val">${upcomingSessions}</div>
                <div class="stat-box-lbl">${t("teacher.scheduledClasses")}</div>
              </div>
            </div>
            <div class="glass-card stat-box">
              <div class="stat-box-icon" style="color:var(--info); background:var(--info-glow);"><i data-lucide="users"></i></div>
              <div>
                <div class="stat-box-val">${activeStudentsCount}</div>
                <div class="stat-box-lbl">${t("teacher.activeStudents")}</div>
              </div>
            </div>
          </div>

          <div class="student-dashboard-layout" style="grid-template-columns: 1fr; padding:0;">
            <!-- Sessions (Today only for Dashboard) -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:8px;">
                <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="video"></i> Today's Sessions</h3>
                <a href="#schedule" style="font-size:0.9rem; color:var(--primary); font-weight:600; display:flex; align-items:center; gap:4px;">
                  ${t("nav.schedule")} <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
                </a>
              </div>

              <div class="schedule-list" id="teacher-schedule-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
                ${
                  filteredSessions.length === 0
                    ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted); grid-column: 1 / -1;">
                        ${t("teacher.noSessions")}
                      </div>`
                    : filteredSessions.map(session => this.renderTeacherSessionCard(session)).join("")
                }
              </div>
            </div>
          </div>

          <div id="enrollment-requests-section" class="student-dashboard-layout" style="grid-template-columns: 1fr; padding:0; margin-top:40px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:8px;">
                <h3 class="dashboard-section-title" style="margin:0;"><i data-lucide="user-plus"></i> Enrollment Requests</h3>
              </div>

              <div class="schedule-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap:20px;">
                ${
                  this.enrollmentRequests.length === 0
                    ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted); grid-column: 1 / -1;">
                        No pending enrollment requests.
                      </div>`
                    : this.enrollmentRequests.map(req => {
                        const rawPhone = req.student?.phone || '';
                        const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
                        const cleanPhoneWa = cleanPhone.replace('+', '');

                        return `
                          <div class="glass-card" style="padding: 20px; display:flex; flex-direction:column; gap:14px;">
                            <div style="display:flex; gap:12px; align-items:center;">
                              <img src="${req.student?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (req.student?.name || 'S')}" style="width:48px; height:48px; border-radius:50%; border:2px solid var(--primary);">
                              <div>
                                <div style="font-weight:700; font-size:1.1rem;">${req.student?.name || "Student"}</div>
                                <div style="font-size:0.85rem; color:var(--text-muted);">${req.student?.email || ""}</div>
                                ${req.student?.phone ? `<div style="font-size:0.8rem; color:var(--primary); font-weight:600;"><i data-lucide="phone" style="width:12px;height:12px;vertical-align:middle;"></i> ${req.student.phone}</div>` : ''}
                              </div>
                            </div>

                            <!-- Badges -->
                            <div style="display:flex; gap:8px; flex-wrap:wrap; font-size:0.8rem;">
                              ${req.student?.location ? `<span style="background:var(--bg-card); padding:4px 8px; border-radius:12px; border:1px solid var(--border-color); font-weight:600;"><i data-lucide="map-pin" style="width:12px;height:12px;color:var(--primary);"></i> ${req.student.location}</span>` : ''}
                              ${req.student?.education ? `<span style="background:var(--bg-card); padding:4px 8px; border-radius:12px; border:1px solid var(--border-color); font-weight:600;"><i data-lucide="graduation-cap" style="width:12px;height:12px;color:var(--accent);"></i> ${req.student.education}</span>` : ''}
                            </div>

                            <div style="font-size:0.95rem; color:var(--text-main); background:rgba(0,0,0,0.03); padding:8px 12px; border-radius:8px; border-inline-start:3px solid var(--primary);">
                              Requested to join <strong>${req.course?.title || 'Course'}</strong>
                            </div>

                            <!-- Contact Actions -->
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                              ${rawPhone ? `
                                <a href="tel:${cleanPhone}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-color:var(--primary); color:var(--primary); text-decoration:none;" title="Call">
                                  <i data-lucide="phone-call" style="width:12px;height:12px;"></i> Call
                                </a>
                                <a href="https://wa.me/${cleanPhoneWa}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem; border-color:var(--success); color:var(--success); text-decoration:none;" title="WhatsApp">
                                  <i data-lucide="message-circle" style="width:12px;height:12px;"></i> WhatsApp
                                </a>
                              ` : ''}
                              <a href="mailto:${req.student?.email}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:0.75rem; text-decoration:none;" title="Email">
                                <i data-lucide="mail" style="width:12px;height:12px;"></i> Email
                              </a>
                            </div>

                            <div style="display:flex; gap:12px; margin-top:8px;">
                              <button class="btn-primary handle-request-btn" data-id="${req.id}" data-action="active" style="flex:1; justify-content:center;">Accept</button>
                              <button class="btn-secondary handle-request-btn" data-id="${req.id}" data-action="rejected" style="flex:1; justify-content:center; color:var(--error); border-color:var(--error);">Refuse</button>
                            </div>
                          </div>
                        `;
                      }).join("")
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Course Creation Modal -->
        <div class="modal-overlay" id="course-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${t("teacher.createCourse")}</h3>
              <span class="modal-close-btn" id="close-course-modal">&times;</span>
            </div>
            <form id="create-course-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="course-title">${t("teacher.courseTitle")}</label>
                  <input type="text" id="course-title" class="form-input" placeholder="${t("teacher.courseTitlePlaceholder")}" required>
                </div>
                <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div>
                    <label for="course-category">${t("teacher.courseCategory")}</label>
                    <select id="course-category-select" class="form-select" onchange="(function(sel){
                      var wrap = document.getElementById('course-category-custom-wrap');
                      var inp = document.getElementById('course-category-custom');
                      if(sel.value === '__custom__'){
                        wrap.style.display='block';
                        inp.required=true;
                        inp.focus();
                      } else {
                        wrap.style.display='none';
                        inp.required=false;
                        inp.value='';
                      }
                    })(this)">
                      <option value="Mathematics">${t("subject.math")}</option>
                      <option value="Physics">${t("subject.physics")}</option>
                      <option value="Chemistry">${t("subject.chemistry")}</option>
                      <option value="Arabic">${t("subject.arabic")}</option>
                      <option value="French">${t("subject.french")}</option>
                      <option value="History & Geography">التاريخ والجغرافيا</option>
                      <option value="Philosophy">الفلسفة</option>
                      <option value="Islamic Studies">التربية الإسلامية</option>
                      <option value="English">اللغة الإنجليزية</option>
                      <option value="Biology">علوم الطبيعة والحياة</option>
                      <option value="__custom__">✏️ تصنيف مخصص (أدخل يدوياً)</option>
                    </select>
                    <div id="course-category-custom-wrap" style="display:none; margin-top:8px;">
                      <input type="text" id="course-category-custom" class="form-input" placeholder="أدخل تصنيف الدورة...">
                    </div>
                  </div>
                  <div>
                    <label for="course-degree">السنة الدراسية / المستوى</label>
                    <select id="course-degree" class="form-select">
                      <option value="">-- اختر المستوى --</option>
                      <option value="1ère AS">الأولى ثانوي (1ère AS)</option>
                      <option value="2ème AS">الثانية ثانوي (2ème AS)</option>
                      <option value="3ème AS - BAC">الثالثة ثانوي - باكالوريا (3AS / BAC)</option>
                      <option value="Toutes les classes">جميع المستويات</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label for="course-desc">${t("teacher.courseDesc")}</label>
                  <textarea id="course-desc" class="form-input" style="height:100px; resize:none;" placeholder="${t("teacher.courseDescPlaceholder")}" required></textarea>
                </div>
                <div class="form-group">
                  <label for="course-image-file">${t("teacher.courseImage")}</label>
                  <input type="file" id="course-image-file" class="form-input" accept="image/*" style="margin-bottom:8px;">
                  <input type="hidden" id="course-image-url">
                </div>
                <div class="form-group">
                  <label for="course-meeting-link">Meeting Link (Zoom, Meet, etc.)</label>
                  <input type="url" id="course-meeting-link" class="form-input" placeholder="https://zoom.us/j/123456789">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-course-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.publishCourse")}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Live Session Modal -->
        <div class="modal-overlay" id="session-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${t("teacher.scheduleSession")}</h3>
              <span class="modal-close-btn" id="close-session-modal">&times;</span>
            </div>
            <form id="create-session-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="session-title">${t("teacher.sessionTitle")}</label>
                  <input type="text" id="session-title" class="form-input" placeholder="${t("teacher.sessionTitlePlaceholder")}" required>
                </div>
                <div class="form-group">
                  <label for="session-course-id">${t("teacher.selectCourse")}</label>
                  <select id="session-course-id" class="form-select" required>
                    <option value="">${t("teacher.selectCoursePlaceholder")}</option>
                    ${this.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label for="session-desc">${t("teacher.sessionDesc")}</label>
                  <textarea id="session-desc" class="form-input" style="height:80px; resize:none;" placeholder="${t("teacher.sessionDescPlaceholder")}"></textarea>
                </div>
                <div class="form-group">
                  <label for="session-date">${t("teacher.sessionDate")}</label>
                  <input type="datetime-local" id="session-date" class="form-input" required>
                </div>
                <div class="form-group">
                  <label for="session-duration">${t("teacher.sessionDuration")}</label>
                  <input type="number" id="session-duration" class="form-input" value="60" min="15" max="180" required>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-session-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.planSession")}</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Lesson Upload Modal -->
        <div class="modal-overlay" id="lesson-modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title" id="lesson-modal-title">${t("teacher.addLesson")}</h3>
              <span class="modal-close-btn" id="close-lesson-modal">&times;</span>
            </div>
            <form id="add-lesson-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="lesson-title">${t("teacher.lessonTitle")}</label>
                  <input type="text" id="lesson-title" class="form-input" placeholder="${t("teacher.lessonTitlePlaceholder")}" required>
                </div>
                <div class="form-group">
                  <label for="lesson-chapter">${t("teacher.chapterName")}</label>
                  <input type="text" id="lesson-chapter" class="form-input" placeholder="${t("teacher.chapterPlaceholder")}" value="General" required>
                </div>
                <div class="form-group">
                  <label for="lesson-videourl">${t("teacher.videoUrl")}</label>
                  <input type="url" id="lesson-videourl" class="form-input" placeholder="https://..." required>
                </div>
                <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div>
                    <label for="lesson-duration">${t("teacher.lessonDuration")}</label>
                    <input type="text" id="lesson-duration" class="form-input" placeholder="12:45" value="10:00" required>
                  </div>
                  <div>
                    <label for="lesson-order">${t("teacher.lessonOrder")}</label>
                    <input type="number" id="lesson-order" class="form-input" value="1" min="0" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="lesson-desc">${t("teacher.lessonDesc")}</label>
                  <textarea id="lesson-desc" class="form-input" style="height:60px; resize:none;" placeholder="${t("teacher.lessonDescPlaceholder")}"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-lesson-modal">${t("common.cancel")}</button>
                <button type="submit" class="btn-primary">${t("teacher.uploadLesson")}</button>
              </div>
            </form>
          </div>
        </div>
      `;

      this.bindEvents();
      if (window.lucide) window.lucide.createIcons();

      if (window.location.hash.includes("enrollment-requests")) {
        setTimeout(() => {
          const reqSec = this.container.querySelector("#enrollment-requests-section");
          if (reqSec) reqSec.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Teacher portal rendering failed:", err);
      this.container.innerHTML = `
        <div style="text-align:center; padding:100px 24px; color:var(--error);">
          <i data-lucide="alert-circle" style="width:48px; height:48px; margin-bottom:16px;"></i>
          <h3 style="font-size:1.5rem; margin-bottom:8px;">Failed to load Teacher Portal</h3>
          <p style="color:var(--text-muted); margin-bottom:20px;">${err.message || "An unexpected error occurred."}</p>
          <button onclick="window.location.hash='#landing'" class="btn-primary">Return to Home</button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  filterSessions(sessions) {
    if (!sessions || sessions.length === 0) return [];
    const now = new Date();

    // In Dashboard, we ONLY show today's sessions by default
    return sessions.filter(s => {
      const d = new Date(s.scheduledAt);
      return d.toDateString() === now.toDateString();
    });
  }

  renderCourseListCard(course) {
    return renderCourseCard(course, { isTeacherView: true });
  }

  renderTeacherSessionCard(session) {
    const isLive = session.status === "live";
    const isCompleted = session.status === "completed";
    const date = new Date(session.scheduledAt);
    const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = date.toLocaleDateString([], { month: "short", day: "numeric" });

    let statusTag = `<span class="session-tag">${t("session.scheduled")}</span>`;
    let sessionAction = "";

    if (isLive) {
      statusTag = `<span class="session-tag live">${t("session.liveNow")}</span>`;
      sessionAction = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px;">
          <a href="${session.course?.meetingLink || session.teacher?.meetingLink || '#'}" target="_blank" class="btn-primary" style="background:var(--success); font-size:0.8rem; padding:8px 12px; justify-content:center;"><i data-lucide="external-link"></i> Enter Meeting</a>
          <button class="btn-secondary end-session-btn" data-id="${session.id}" style="font-size:0.8rem; padding:8px 12px; justify-content:center; color:var(--error); border-color:var(--error);"><i data-lucide="stop-circle"></i> ${t("session.end")}</button>
        </div>
      `;
    } else if (isCompleted) {
      statusTag = `<span class="session-tag" style="background:var(--border-color); color:var(--text-muted); border-color:transparent;">${t("session.finished")}</span>`;
      sessionAction = `<button class="btn-secondary session-action" style="cursor:default; margin-top:12px;" disabled>${t("session.ended")}</button>`;
    } else {
      sessionAction = `
        <div style="display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:14px;">
          <button class="btn-primary start-session-btn" data-id="${session.id}" style="font-size:0.8rem; padding:8px 12px; justify-content:center;"><i data-lucide="play"></i> ${t("session.goLive")}</button>
          <button class="btn-secondary edit-session-btn" data-id="${session.id}" style="font-size:0.8rem; padding:8px 12px; justify-content:center; border-color:var(--primary); color:var(--primary);" title="تعديل تاريخ ووقت الجلسة">
            <i data-lucide="calendar-clock"></i> تعديل الموعد
          </button>
        </div>
      `;
    }

    return `
      <div class="glass-card session-card" style="${isLive ? "border-color: var(--success);" : ""}">
        <div class="session-header-row">
          ${statusTag}
          <span style="font-size: 0.75rem; color:var(--text-muted); font-weight:600;">${session.duration} ${t("session.mins")}</span>
        </div>
        <h4 class="session-title">${session.title}</h4>
        ${session.course ? `<div style="font-size:0.75rem; color:var(--primary); font-weight:600; margin-top:2px;"><i data-lucide="book" style="width:12px;height:12px;"></i> ${session.course.title}</div>` : ""}
        <div class="session-time" style="margin-top:6px;">
          <i data-lucide="calendar" style="width:14px;height:14px;"></i>
          <span>${formattedDate} ${t("session.at")} ${formattedTime}</span>
        </div>
        ${sessionAction}
      </div>
    `;
  }

  bindEvents() {
    document.querySelectorAll(".handle-request-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const action = e.currentTarget.getAttribute("data-action"); // active or rejected
        try {
          await apiFetch(`/teacher/enrollment-requests/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: action })
          });
          showToast(action === 'active' ? "Request accepted." : "Request refused.", "success");
          checkPendingRequestsNotification();
          await this.render();
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Schedule filter buttons click handler for Teacher
    const filterBtns = this.container.querySelectorAll("[data-teacher-schedule-filter]");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-teacher-schedule-filter");
        this.sessionFilter = filter;
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const container = this.container.querySelector("#teacher-schedule-container");
        if (container) {
          const filtered = this.filterSessions(this.sessions);
          container.innerHTML = filtered.length === 0
            ? `<div class="glass-card" style="text-align:center; padding: 30px; color:var(--text-muted);">${t("teacher.noSessions")}</div>`
            : filtered.map(session => this.renderTeacherSessionCard(session)).join("");
          if (window.lucide) window.lucide.createIcons();
          this.bindSessionActionButtons();
        }
      });
    });

    const courseModal = document.getElementById("course-modal");
    
    // Open for Create
    document.getElementById("open-course-modal-btn")?.addEventListener("click", async () => { 
      document.getElementById("create-course-form").reset();
      document.getElementById("create-course-form").removeAttribute("data-id");
      await this.populateCategoryOptions();
      courseModal.querySelector(".modal-title").innerText = t("teacher.createCourse");
      courseModal.style.display = "flex"; 
    });
    
    document.getElementById("close-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });
    document.getElementById("cancel-course-modal")?.addEventListener("click", () => { courseModal.style.display = "none"; });

    // Open for Edit 
    const editButtons = this.container.querySelectorAll(".edit-course-btn");
    editButtons.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const courseId = e.currentTarget.getAttribute("data-id");
        const course = await apiFetch(`/courses/${courseId}`);
        if (course) {
          document.getElementById("course-title").value = course.title || "";
          await this.populateCategoryOptions(course.category || "");
          document.getElementById("course-degree").value = course.degree || "";
          document.getElementById("course-desc").value = course.description || "";
          document.getElementById("course-image-url").value = course.image || "";
          document.getElementById("course-meeting-link").value = course.meetingLink || "";
          
          document.getElementById("create-course-form").setAttribute("data-id", courseId);
          courseModal.querySelector(".modal-title").innerText = "Edit Course";
          courseModal.style.display = "flex";
        }
      });
    });
    
    document.getElementById("create-course-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("course-title").value;
      const catSelectEl = document.getElementById("course-category-select");
      const catCustomEl = document.getElementById("course-category-custom");
      const category = catSelectEl.value === "__custom__" ? catCustomEl.value.trim() : catSelectEl.value;
      if (!category) { showToast("الرجاء إدخال تصنيف الدورة.", "error"); return; }
      const degree = document.getElementById("course-degree").value;
      const description = document.getElementById("course-desc").value;
      let image = document.getElementById("course-image-url").value;
      const meetingLink = document.getElementById("course-meeting-link").value;
      const fileInput = document.getElementById("course-image-file");

      // Handle file upload
      if (fileInput && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        try {
          const token = state.token || localStorage.getItem("token");
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            image = data.url;
          } else {
            console.error("Upload failed with status", uploadRes.status);
          }
        } catch (err) {
          console.error("Upload failed", err);
        }
      }

      const courseId = document.getElementById("create-course-form").getAttribute("data-id");
      try {
        if (courseId) {
          await apiFetch(`/courses/${courseId}`, { method: "PUT", body: JSON.stringify({ title, category, degree, description, image, meetingLink }) });
          showToast("Course updated successfully", "success");
        } else {
          await apiFetch("/courses", { method: "POST", body: JSON.stringify({ title, category, degree, description, image, meetingLink }) });
          showToast(t("toast.coursePublished"), "success");
        }
        courseModal.style.display = "none";
        await this.render();
      } catch (err) {}
    });

    const sessionModal = document.getElementById("session-modal");
    document.getElementById("open-session-modal-btn")?.addEventListener("click", () => {
      const form = document.getElementById("create-session-form");
      form.reset();
      form.removeAttribute("data-id");
      sessionModal.querySelector(".modal-title").innerText = t("teacher.scheduleSession");
      sessionModal.style.display = "flex";
    });
    document.getElementById("close-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });
    document.getElementById("cancel-session-modal")?.addEventListener("click", () => { sessionModal.style.display = "none"; });

    document.querySelectorAll(".add-session-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const courseId = btn.getAttribute("data-id");
        const form = document.getElementById("create-session-form");
        form.reset();
        form.removeAttribute("data-id");
        sessionModal.querySelector(".modal-title").innerText = t("teacher.scheduleSession");
        sessionModal.style.display = "flex";
        const select = document.getElementById("session-course-id");
        if (select) select.value = courseId;
      });
    });

    // Edit Session Date & Time Handler
    this.container.querySelectorAll(".edit-session-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const sId = e.currentTarget.getAttribute("data-id");
        const session = (this.sessions || []).find(s => s.id === sId);
        if (!session) return;

        const form = document.getElementById("create-session-form");
        form.reset();
        form.setAttribute("data-id", session.id);
        sessionModal.querySelector(".modal-title").innerText = "تعديل موعد وتاريخ الجلسة (Edit Session)";

        document.getElementById("session-title").value = session.title || "";
        if (session.course) {
          document.getElementById("session-course-id").value = session.course.id;
        }
        document.getElementById("session-desc").value = session.description || "";
        document.getElementById("session-duration").value = session.duration || 60;

        if (session.scheduledAt) {
          const d = new Date(session.scheduledAt);
          const pad = (n) => String(n).padStart(2, '0');
          const localISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          document.getElementById("session-date").value = localISO;
        }

        sessionModal.style.display = "flex";
      });
    });

    document.getElementById("create-session-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const sessionId = form.getAttribute("data-id");
      const title = document.getElementById("session-title").value;
      const courseId = document.getElementById("session-course-id").value;
      const description = document.getElementById("session-desc").value;
      const scheduledAt = document.getElementById("session-date").value;
      const duration = parseInt(document.getElementById("session-duration").value, 10);

      try {
        if (sessionId) {
          await apiFetch(`/sessions/${sessionId}`, {
            method: "PUT",
            body: JSON.stringify({ title, courseId, description, scheduledAt, duration })
          });
          showToast("تم تعديل موعد الجلسة بنجاح! ✅", "success");
        } else {
          await apiFetch("/sessions", {
            method: "POST",
            body: JSON.stringify({ title, courseId, description, scheduledAt, duration })
          });
          showToast(t("toast.sessionScheduled"), "success");
        }
        sessionModal.style.display = "none";
        form.reset();
        form.removeAttribute("data-id");
        await this.render();
      } catch (err) {}
    });

    const lessonModal = document.getElementById("lesson-modal");
    const lessonTitleHeading = document.getElementById("lesson-modal-title");

    document.querySelectorAll(".add-lesson-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedCourseForLesson = btn.getAttribute("data-id");
        const courseTitle = btn.getAttribute("data-title");
        lessonTitleHeading.textContent = `${t("teacher.addLessonTo")}: ${courseTitle}`;
        lessonModal.style.display = "flex";
      });
    });

    document.getElementById("close-lesson-modal")?.addEventListener("click", () => { lessonModal.style.display = "none"; });
    document.getElementById("cancel-lesson-modal")?.addEventListener("click", () => { lessonModal.style.display = "none"; });

    document.getElementById("add-lesson-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("lesson-title").value;
      const chapter = document.getElementById("lesson-chapter").value;
      const videoUrl = document.getElementById("lesson-videourl").value;
      const duration = document.getElementById("lesson-duration").value;
      const order = parseInt(document.getElementById("lesson-order").value);
      const description = document.getElementById("lesson-desc").value;
      try {
        await apiFetch(`/courses/${this.selectedCourseForLesson}/lessons`, {
          method: "POST",
          body: JSON.stringify({ title, chapter, videoUrl, duration, order, description })
        });
        showToast(t("toast.lessonUploaded"), "success");
        lessonModal.style.display = "none";
        document.getElementById("add-lesson-form").reset();
        await this.render();
      } catch (err) {}
    });

    this.bindSessionActionButtons();
  }

  bindSessionActionButtons() {
    this.container.querySelectorAll(".start-session-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "live" }) });
          showToast(t("toast.sessionLive"), "success");
          await this.render();
        } catch (err) {}
      });
    });

    this.container.querySelectorAll(".end-session-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await apiFetch(`/sessions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) });
          showToast(t("toast.sessionEnded"), "info");
          await this.render();
        } catch (err) {}
      });
    });
  }

  async populateCategoryOptions(selectedCategory = "") {
    const catSelect = document.getElementById("course-category-select");
    if (!catSelect) return;

    let apiCategories = [];
    try {
      apiCategories = await apiFetch("/categories");
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }

    let customList = [];
    if (state.user?.customCategories) {
      customList = state.user.customCategories
        .split(/[,،]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    let optionsHTML = "";
    
    // Official Global Admin Categories
    if (apiCategories && apiCategories.length > 0) {
      optionsHTML += `<optgroup label="التصنيفات المعتمدة من إدارة المنصة">`;
      apiCategories.forEach(cat => {
        optionsHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
      optionsHTML += `</optgroup>`;
    }

    // Teacher Custom Categories (from settings)
    if (customList.length > 0) {
      optionsHTML += `<optgroup label="تخصصاتك الخاصة (من الإعدادات)">`;
      customList.forEach(cat => {
        optionsHTML += `<option value="${cat}">${cat}</option>`;
      });
      optionsHTML += `</optgroup>`;
    }

    optionsHTML += `<option value="__custom__">✏️ تصنيف جديد (أدخل يدوياً)</option>`;

    catSelect.innerHTML = optionsHTML;

    const catCustomWrap = document.getElementById("course-category-custom-wrap");
    const catCustomInput = document.getElementById("course-category-custom");

    const allDefined = [
      ...(apiCategories || []).map(c => c.name),
      ...customList
    ];

    if (selectedCategory && !allDefined.includes(selectedCategory)) {
      catSelect.value = "__custom__";
      if (catCustomWrap) catCustomWrap.style.display = "block";
      if (catCustomInput) catCustomInput.value = selectedCategory;
    } else if (selectedCategory) {
      catSelect.value = selectedCategory;
      if (catCustomWrap) catCustomWrap.style.display = "none";
      if (catCustomInput) catCustomInput.value = "";
    } else {
      if (catCustomWrap) catCustomWrap.style.display = "none";
      if (catCustomInput) catCustomInput.value = "";
    }
  }

  onDestroy() {}
}
