import { apiFetch, state, showToast, t } from "../app.js";

export default class CourseLandingView {
  constructor(container, courseId) {
    this.container = container;
    this.courseId = courseId;
    this.course = null;
    this.enrollmentStatus = null; // null, 'pending', 'active', 'rejected'
  }

  async render() {
    try {
      this.container.innerHTML = `<div class="app-loader"><div class="spinner"></div></div>`;

      // Fetch course and enrollments (if logged in)
      const fetchPromises = [apiFetch(`/courses/${this.courseId}`)];
      if (state.user && state.user.role === 'student') {
        fetchPromises.push(apiFetch("/student/enrollments"));
      }

      const results = await Promise.all(fetchPromises);
      this.course = results[0];
      
      if (results[1]) {
        const enrollments = results[1];
        const myEnrollment = enrollments.find(e => e.course?.id === this.courseId);
        if (myEnrollment) {
          this.enrollmentStatus = myEnrollment.status || 'active'; // fallback for old records
        }
      } else if (state.user && (state.user.role === 'teacher' || state.user.role === 'admin')) {
        // Teachers/Admins don't "enroll" but they have access
        this.enrollmentStatus = 'active'; 
      }

      const hasLessons = this.course.lessons && this.course.lessons.length > 0;
      
      const chaptersMap = {};
      let totalDuration = 0;
      if (hasLessons) {
        this.course.lessons.forEach(l => {
          const chName = l.chapter || "General";
          if (!chaptersMap[chName]) chaptersMap[chName] = [];
          chaptersMap[chName].push(l);
          
          // Basic duration parsing (assuming MM:SS format)
          const parts = l.duration ? l.duration.split(':') : [];
          if (parts.length === 2) {
            totalDuration += parseInt(parts[0]) * 60 + parseInt(parts[1]);
          } else {
            totalDuration += 600; // default 10 mins
          }
        });
      }

      const totalHours = Math.floor(totalDuration / 3600);
      const totalMins = Math.floor((totalDuration % 3600) / 60);
      const durationText = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

      this.container.innerHTML = `
        <div style="background:var(--bg-color); min-height:100vh;">
          
          <!-- Top Cover (Slider / Hero) -->
          <div style="position: relative; width: 100%; height: 50vh; min-height: 400px; background-image: url('${this.course.image}'); background-size: cover; background-position: center;">
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 20px;">
              <span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; margin-bottom: 16px; text-transform: uppercase;">
                ${this.course.category}
              </span>
              <h1 style="font-size: 3.5rem; font-weight: 800; color: #ffffff; margin-bottom: 20px; max-width: 800px; line-height: 1.2; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${this.course.title}
              </h1>
              
              <div style="display:flex; gap:16px; align-items:center; margin-top: 24px;">
                ${this.enrollmentStatus === 'active' ? `
                  <a href="#course/${this.course.id}" class="btn-primary" style="padding: 16px 40px; font-size: 1.2rem; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <i data-lucide="play-circle"></i> ${t("course.continueLearning") || "Go to Course"}
                  </a>
                ` : this.enrollmentStatus === 'pending' ? `
                  <button class="btn-primary" disabled style="padding: 16px 40px; font-size: 1.2rem; border-radius: 30px; opacity:0.7; cursor:not-allowed;">
                    <i data-lucide="clock"></i> Pending Approval
                  </button>
                ` : this.enrollmentStatus === 'rejected' ? `
                  <button class="btn-primary" disabled style="padding: 16px 40px; font-size: 1.2rem; border-radius: 30px; background:var(--error); border-color:var(--error); opacity:0.8;">
                    <i data-lucide="x-circle"></i> Enrollment Rejected
                  </button>
                ` : `
                  <button id="enroll-hero-btn" class="btn-primary" style="padding: 16px 40px; font-size: 1.2rem; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <i data-lucide="plus-circle"></i> ${t("course.enroll") || "Enroll Now"}
                  </button>
                `}
              </div>
            </div>
          </div>

          <!-- Main Content Section (2 columns: Left Content, Right Description) -->
          <div style="max-width: 1200px; margin: 0 auto; padding: 60px 24px; display:flex; gap:40px; flex-wrap: wrap;">
            
            <!-- Left: Course Content (Curriculum) -->
            <div style="flex: 2; min-width: 300px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-main); margin:0;">Course Content</h2>
                <span style="font-size:0.9rem; color:var(--text-muted);">${Object.keys(chaptersMap).length} sections • ${this.course.lessons?.length || 0} lessons • ${durationText}</span>
              </div>
              
              ${Object.keys(chaptersMap).length === 0 ? `
                <div class="glass-card" style="text-align:center; padding: 40px; color:var(--text-muted);">
                  Curriculum is currently being developed.
                </div>
              ` : `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow:hidden; background: var(--card-bg);">
                  ${Object.keys(chaptersMap).map((chName, idx) => `
                    <div style="border-bottom: 1px solid var(--border-color);">
                      <div style="background: rgba(0,0,0,0.02); padding: 16px 24px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; font-size:1.1rem; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                          <i data-lucide="folder" style="width:18px; color:var(--primary);"></i> ${chName}
                        </span>
                        <span style="font-size:0.85rem; color:var(--text-muted);">${chaptersMap[chName].length} lessons</span>
                      </div>
                      <div>
                        ${chaptersMap[chName].map(l => `
                          <div style="padding: 12px 24px 12px 48px; border-top: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background: var(--bg-color);">
                            <span style="display:flex; align-items:center; gap:12px; font-size:0.95rem; color:var(--text-main);">
                              <i data-lucide="play-circle" style="width:16px; color:var(--text-muted);"></i>
                              ${l.title}
                            </span>
                            <span style="font-size:0.8rem; color:var(--text-muted); background: var(--card-bg); padding: 2px 8px; border-radius: 12px; border: 1px solid var(--border-color);">${l.duration || '--:--'}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Right: Description & Teacher Info -->
            <div style="flex: 1; min-width: 300px;">
              <div class="glass-card" style="padding: 32px; margin-bottom: 24px;">
                <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:16px;">Description</h2>
                <p style="font-size:1rem; color:var(--text-muted); line-height:1.8; white-space: pre-wrap;">${this.course.description || "No description provided."}</p>
              </div>

              <div class="glass-card" style="padding: 32px;">
                <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:24px;">Instructor</h2>
                <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
                  <img src="${this.course.teacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher'}" style="width:64px; height:64px; border-radius:50%; border: 2px solid var(--primary);">
                  <div>
                    <div style="font-weight:800; font-size:1.1rem; color:var(--text-main);">${this.course.teacher?.name || "Bakalorya Instructor"}</div>
                    <div style="font-size:0.9rem; color:var(--text-muted);">Teacher</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom: Reviews (Placeholder) -->
          <div style="max-width: 1200px; margin: 0 auto; padding: 0 24px 60px 24px;">
            <h2 style="font-size:1.8rem; font-weight:800; color:var(--text-main); margin-bottom:24px;">Student Reviews</h2>
            <div class="glass-card" style="padding: 40px; text-align:center;">
              <i data-lucide="message-square" style="width:48px; height:48px; color:var(--border-color); margin-bottom:16px;"></i>
              <h3 style="font-size:1.2rem; color:var(--text-main); margin-bottom:8px;">No reviews yet</h3>
              <p style="color:var(--text-muted); font-size:0.95rem;">Enroll now and be the first to leave a review for this course!</p>
            </div>
          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this.bindEvents();
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--error);">Failed to load course details.</div>`;
    }
  }

  bindEvents() {
    const handleEnroll = async () => {
      if (!state.user) {
        showToast("Please log in to enroll in this course.", "info");
        window.location.hash = "#login"; // Redirect strictly to login page
        return;
      }

      if (state.user.role === 'teacher' || state.user.role === 'admin') {
        window.location.hash = `#course/${this.course.id}`;
        return;
      }

      try {
        await apiFetch(`/student/enrollments`, {
          method: "POST",
          body: JSON.stringify({ courseId: this.course.id })
        });
        showToast("Enrollment requested. Waiting for teacher approval.", "success");
        await this.render(); // Re-render to show pending status
      } catch (err) {
        console.error("Enrollment error", err);
      }
    };

    document.getElementById("enroll-hero-btn")?.addEventListener("click", handleEnroll);
    document.getElementById("enroll-card-btn")?.addEventListener("click", handleEnroll);
  }

  onDestroy() {}
}
