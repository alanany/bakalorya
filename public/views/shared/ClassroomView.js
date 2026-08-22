import { apiFetch, state, showToast, formatSessionDateTime } from "../../app.js";

export default class ClassroomView {
  constructor(container, sessionId) {
    this.container = container;
    this.sessionId = sessionId;
    this.session = null;
    
    // Canvas Whiteboard properties
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.currentColor = "#6366f1"; // Default indigo brush
    this.currentTool = "draw"; // draw | erase
    this.brushSize = 3;
    this.lastX = 0;
    this.lastY = 0;

    // Chat Simulator variables
    this.chatInterval = null;
    this.mockStudents = [
      { name: "Layla Mahdi", role: "student" },
      { name: "Tariq Mansour", role: "student" },
      { name: "Sami Al-Fares", role: "student" },
      { name: "Fatima Al-Zahra", role: "student" },
      { name: "Omar Rayan", role: "student" }
    ];
    this.mockMessages = [
      "Could you explain step 2 again, doctor?",
      "Wow, this whiteboard tool makes it so easy to follow!",
      "Will these formulas be on the scientific track exam?",
      "I think the limit evaluates to 1, right?",
      "Yes, L'Hopital rule makes it much faster to solve.",
      "Clear, thank you!",
      "Is the homework sheet downloadable?"
    ];

    // Classroom interactive features
    this.micMuted = false;
    this.camMuted = false;
    this.handRaised = false;
    this.activeTab = "stream"; // stream | board

    // Poll State
    this.pollTimer = null;
    this.pollActive = false;
    this.pollVoted = false;
    this.pollResults = { A: 0, B: 0, C: 0 };
  }

  async render() {
    try {
      // Fetch session info (both course live sessions and private subscription 1-on-1 sessions)
      const [sessions, myPrivateSessions] = await Promise.all([
        apiFetch("/sessions").catch(() => []),
        apiFetch("/sessions/my-private").catch(() => [])
      ]);
      const allSessions = [...(sessions || []), ...(myPrivateSessions || [])];
      this.session = allSessions.find(s => String(s.id) === String(this.sessionId));

      if (!this.session) {
        this.container.innerHTML = `
          <div style="text-align:center; padding:100px 24px;">
            <h2>الحصة غير موجودة</h2>
            <a href="#student-private-sessions" class="btn-primary" style="margin-top:20px;">العودة للوحة التحكم</a>
          </div>
        `;
        return;
      }

      const now = new Date();
      const sessionDate = this.session.scheduledAt ? new Date(this.session.scheduledAt) : null;
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

      const sessionTime = sessionDate ? sessionDate.getTime() : 0;
      const isPastDay = sessionTime > 0 && sessionTime < todayStart;
      const isCompleted = this.session.status === 'COMPLETED' || this.session.status === 'completed';
      const isCancelled = this.session.status?.includes('CANCELLED');
      const isLive = this.session.status === 'live' || this.session.status === 'LIVE';

      // Join window check: Within 30 minutes before scheduled start time to end of session duration
      const durationMs = (this.session.duration || 60) * 60 * 1000;
      const windowStart = sessionTime - (30 * 60 * 1000); // 30 mins before
      const windowEnd = sessionTime + durationMs + (30 * 60 * 1000); // 30 mins after end
      const isWithinWindow = now.getTime() >= windowStart && now.getTime() <= windowEnd;

      const isStudent = state.user?.role === 'student';

      // 1. Past Day Session Guard
      if (isStudent && isPastDay) {
        showToast("عذراً، هذه الحصة من يوم سابق وانتهى موعدها.", "warning");
        this.container.innerHTML = `
          <div style="text-align:center; padding:100px 24px; font-family:'Cairo', sans-serif;">
            <div style="width:72px; height:72px; border-radius:50%; background:rgba(239,68,68,0.12); color:#ef4444; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
              <i data-lucide="clock" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.5rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">انتهى موعد هذه الحصة (يوم سابق)</h2>
            <p style="color:var(--text-muted); max-width:480px; margin:0 auto 24px auto;">عذراً، هذه الحصة خاصة بيوم سابق ولا يمكن دخول القاعة بعد انتهاء موعدها وفق سياسة المنصة.</p>
            <a href="#student-private-sessions" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px;">
              <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> الرجوع لجدول الحصص
            </a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // 2. Completed / Cancelled Session Guard
      if (isStudent && (isCompleted || isCancelled)) {
        showToast("عذراً، هذه الحصة مكتملة أو ملغاة ولا يمكن دخولها.", "warning");
        this.container.innerHTML = `
          <div style="text-align:center; padding:100px 24px; font-family:'Cairo', sans-serif;">
            <div style="width:72px; height:72px; border-radius:50%; background:rgba(245,158,11,0.12); color:#f59e0b; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
              <i data-lucide="check-circle" style="width:36px; height:36px;"></i>
            </div>
            <h2 style="font-size:1.5rem; font-weight:800; margin-bottom:8px; color:var(--text-main);">الحصة مكتملة أو ملغاة</h2>
            <p style="color:var(--text-muted); max-width:480px; margin:0 auto 24px auto;">هذه الحصة تم إكمالها أو إلغاؤها سابقاً ولا يمكن إعادة دخولها.</p>
            <a href="#student-private-sessions" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px;">
              <i data-lucide="arrow-right" style="width:16px; height:16px;"></i> الرجوع لجدول الحصص
            </a>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // 3. Early Future Session Notice (Display notification banner inside classroom instead of blocking)
      const isEarlyEntry = isStudent && !isLive && !isWithinWindow && now.getTime() < windowStart;
      const formatted = formatSessionDateTime(this.session.scheduledAt);

      this.container.innerHTML = `
        ${isEarlyEntry ? `
          <div style="background:rgba(99,102,241,0.1); border:1px solid var(--primary); color:var(--primary); padding:10px 16px; border-radius:12px; margin-bottom:14px; font-size:0.88rem; font-weight:700; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; font-family:'Cairo', sans-serif;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="clock" style="width:18px; height:18px;"></i>
              <span>أنت الآن داخل قاعة الحصة. الموعد الرسمي للبث هو: <strong>${formatted.fullStr}</strong>. يمكنك الانتظار هنا واستخدام التفاعلات.</span>
            </div>
            ${formatted.badgeHTML}
          </div>
        ` : ''}
        <div class="classroom-layout">
          <!-- Main Area (Video Stream or Whiteboard) -->
          <div class="classroom-main">
            <div class="classroom-tabs">
              <span class="classroom-tab ${this.activeTab === "stream" ? "active" : ""}" data-tab="stream">
                <i data-lucide="video" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> Teacher Live Stream
              </span>
              <span class="classroom-tab ${this.activeTab === "board" ? "active" : ""}" data-tab="board">
                <span class="whiteboard-active-indicator"></span> Whiteboard Workspace
              </span>
            </div>

            <div class="classroom-viewport">
              <!-- Embedded Meeting Viewport & Stream Frame -->
              <div id="classroom-stream-area" style="width:100%; height:100%; display: ${this.activeTab === "stream" ? "flex" : "none"}; flex-direction:column;">
                <div id="classroom-embedded-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#09090b; border-radius:16px; overflow:hidden; border:1px solid var(--border-color); position:relative; transition: all 0.3s ease;">
                  
                  <!-- Viewport Toolbar (Maximize / Minimize Controls) -->
                  <div class="embedded-meeting-toolbar" style="padding:10px 16px; background:linear-gradient(90deg, #18181b, #09090b); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="width:10px; height:10px; border-radius:50%; background:#10b981; display:inline-block; box-shadow:0 0 8px #10b981;"></span>
                      <span style="font-weight:700; font-size:0.85rem; color:#f4f4f5;">
                        🎥 البث المباشر - الأستاذ: ${this.session.teacher?.name || 'المعلم'}
                      </span>
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                      ${(this.session.teacher?.meetingLink || this.session.course?.meetingLink) ? `
                        <a href="${this.session.teacher?.meetingLink || this.session.course?.meetingLink}" target="_blank" class="btn-secondary" style="font-size:0.75rem; padding:4px 10px; color:#a1a1aa; border-color:rgba(255,255,255,0.15); text-decoration:none;" title="فتح في نافذة جديدة خارج المنصة">
                          <i data-lucide="external-link" style="width:12px;height:12px;margin-inline-end:4px;"></i> نافذة خارجية ↗️
                        </a>
                      ` : ''}
                      
                      <button type="button" class="btn-secondary" id="toggle-maximize-btn" style="font-size:0.78rem; padding:5px 12px; background:rgba(99,102,241,0.15); color:var(--primary); border-color:var(--primary); font-weight:700; cursor:pointer;" title="تكبير الشاشة ملء المتصفح">
                        <i data-lucide="maximize-2" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i> تكبير ⤢
                      </button>
                      <button type="button" class="btn-secondary" id="toggle-minimize-btn" style="display:none; font-size:0.78rem; padding:5px 12px; background:rgba(239,68,68,0.15); color:#ef4444; border-color:#ef4444; font-weight:700; cursor:pointer;" title="تصغير وتأطير للنمط العادي">
                        <i data-lucide="minimize-2" style="width:14px;height:14px;vertical-align:middle;margin-inline-end:4px;"></i> تصغير ⤤
                      </button>
                    </div>
                  </div>

                  <!-- IFrame Body -->
                  <div style="flex:1; width:100%; position:relative; background:#000;">
                    ${(this.session.teacher?.meetingLink || this.session.course?.meetingLink) ? `
                      <iframe id="embedded-meeting-iframe" src="${this.session.teacher?.meetingLink || this.session.course?.meetingLink}" allow="camera; microphone; fullscreen; display-capture; autoplay" style="width:100%; height:100%; border:none;" title="Google Meet / Zoom Virtual Classroom"></iframe>
                    ` : `
                      <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center;">
                        <i data-lucide="video-off" style="width:56px; height:56px; color:var(--text-muted); opacity:0.4; margin-bottom:12px;"></i>
                        <p style="font-weight:700; color:var(--text-main); margin-bottom:6px;">لم يقم المعلم بإضافة رابط الاجتماع الثابت بعد.</p>
                        <p style="font-size:0.8rem; color:var(--text-muted);">يرجى التواصل مع الإدارة أو المعلم لتأطير البث المباشر.</p>
                      </div>
                    `}
                  </div>

                  <!-- Bottom Helper Bar -->
                  ${(this.session.teacher?.meetingLink || this.session.course?.meetingLink) ? `
                    <div style="padding:6px 14px; background:#121215; border-top:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#a1a1aa;">
                      <span>💡 إذا حجب المتصفح الكاميرا داخل الإطار، يمكنك الاستعانة بزر "نافذة خارجية ↗️".</span>
                      <span>الرابط: <a href="${this.session.teacher?.meetingLink || this.session.course?.meetingLink}" target="_blank" style="color:var(--primary); font-weight:600;">${this.session.teacher?.meetingLink || this.session.course?.meetingLink}</a></span>
                    </div>
                  ` : ''}

                </div>
              </div>

              <!-- Interactive Canvas Whiteboard -->
              <div id="classroom-whiteboard-area" class="whiteboard-container ${this.activeTab === "board" ? "active" : ""}">
                <div class="whiteboard-tools">
                  <button class="tool-btn ${this.currentTool === "draw" ? "active" : ""}" id="tool-draw" title="Brush">
                    <i data-lucide="pencil"></i>
                  </button>
                  <button class="tool-btn ${this.currentTool === "erase" ? "active" : ""}" id="tool-erase" title="Eraser">
                    <i data-lucide="eraser"></i>
                  </button>
                  <button class="tool-btn" id="tool-clear" title="Clear Canvas" style="color:var(--error)">
                    <i data-lucide="trash-2"></i>
                  </button>
                  
                  <div style="width:1px; height:24px; background:var(--border-color); margin:0 8px;"></div>
                  
                  <!-- Color Pickers -->
                  <div class="tool-color active" data-color="#6366f1" style="background:#6366f1;"></div>
                  <div class="tool-color" data-color="#f59e0b" style="background:#f59e0b;"></div>
                  <div class="tool-color" data-color="#10b981" style="background:#10b981;"></div>
                  <div class="tool-color" data-color="#ef4444" style="background:#ef4444;"></div>
                  <div class="tool-color" data-color="#ffffff" style="background:#ffffff;"></div>
                </div>
                <canvas class="classroom-canvas" id="whiteboard-canvas"></canvas>
              </div>

              <!-- Quick Poll Widget -->
              <div class="glass-card classroom-poll-overlay" id="poll-widget" style="display:none; border-color:var(--primary);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <strong style="font-size:0.9rem; color:var(--primary);"><i data-lucide="bar-chart-2"></i> Quick Class Poll</strong>
                  <span style="font-size:0.75rem; background:var(--primary-glow); padding:2px 6px; border-radius:4px; font-weight:700;">Active</span>
                </div>
                <p style="font-size:0.85rem; font-weight:600; margin-bottom:16px;">Is the integration substitution formula clear?</p>
                
                <div id="poll-options-container">
                  <button class="poll-option-btn" data-opt="A">
                    <span>A) Perfectly Clear</span> <span id="opt-count-A"></span>
                  </button>
                  <div class="poll-results-bar"><div class="poll-results-fill" id="opt-fill-A"></div></div>

                  <button class="poll-option-btn" data-opt="B">
                    <span>B) Need one more exercise</span> <span id="opt-count-B"></span>
                  </button>
                  <div class="poll-results-bar"><div class="poll-results-fill" id="opt-fill-B"></div></div>

                  <button class="poll-option-btn" data-opt="C">
                    <span>C) Not clear yet</span> <span id="opt-count-C"></span>
                  </button>
                  <div class="poll-results-bar"><div class="poll-results-fill" id="opt-fill-C"></div></div>
                </div>
              </div>
            </div>

            <!-- Virtual Interaction Buttons -->
            <div class="control-bar">
              <div class="controls-group">
                <button class="control-icon-btn ${this.micMuted ? "active" : ""}" id="btn-mute-mic" title="Toggle Mic">
                  <i data-lucide="${this.micMuted ? 'mic-off' : 'mic'}"></i>
                </button>
                <button class="control-icon-btn ${this.camMuted ? "active" : ""}" id="btn-mute-cam" title="Toggle Camera">
                  <i data-lucide="${this.camMuted ? 'video-off' : 'video'}"></i>
                </button>
                <button class="control-icon-btn ${this.handRaised ? "active" : ""}" id="btn-raise-hand" title="Raise Hand" style="${this.handRaised ? 'color:var(--accent); border-color:var(--accent); background:var(--accent-glow);' : ''}">
                  <i data-lucide="hand"></i>
                </button>
              </div>

              <div style="font-size: 0.9rem; font-weight:600; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                <span style="display:inline-block; width:6px; height:6px; background:var(--error); border-radius:50%; animation: pulse-border 1s infinite;"></span>
                <span>${this.session.title}</span>
              </div>

              <a href="#student-dashboard" class="leave-classroom-btn" id="leave-classroom-btn">
                <i data-lucide="log-out"></i> Leave Class
              </a>
            </div>
          </div>

          <!-- Classroom Chat Sidebar -->
          <div class="classroom-chat-sidebar">
            <div class="chat-header">
              Classroom Chat
            </div>
            
            <div class="chat-messages" id="classroom-chat-box">
              <div class="chat-bubble">
                <div class="chat-bubble-meta">
                  <span class="chat-sender-name">${this.session.teacher?.name} <span class="chat-sender-role">Teacher</span></span>
                  <span>10:00 AM</span>
                </div>
                <div class="chat-bubble-body" style="border-left: 2px solid var(--primary); background:rgba(99,102,241,0.05)">
                  Welcome everyone to our live baccalaureate prep class! Let's work together. Please use the tabs to switch to the Whiteboard where I will draw the solutions.
                </div>
              </div>
            </div>

            <form class="chat-input-area" id="classroom-chat-form">
              <input type="text" id="classroom-chat-input" placeholder="Ask a question..." required>
              <button type="submit" class="chat-send-btn"><i data-lucide="send" style="width:16px;height:16px;"></i></button>
            </form>
          </div>
        </div>
      `;

      this.bindEvents();
      this.initWhiteboardCanvas();
      this.startChatSimulation();
      this.triggerScheduledPoll();
    } catch (err) {
      console.error("Failed to load virtual classroom:", err);
    }
  }

  initWhiteboardCanvas() {
    this.canvas = document.getElementById("whiteboard-canvas");
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    
    // Fit canvas sizing dynamically to container layout
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Mouse drawing events
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e));
    this.canvas.addEventListener("mousemove", (e) => this.draw(e));
    this.canvas.addEventListener("mouseup", () => this.stopDrawing());
    this.canvas.addEventListener("mouseleave", () => this.stopDrawing());

    // Touch support events
    this.canvas.addEventListener("touchstart", (e) => this.startDrawingTouch(e));
    this.canvas.addEventListener("touchmove", (e) => this.drawTouch(e));
    this.canvas.addEventListener("touchend", () => this.stopDrawing());
  }

  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    
    // Save drawing context state
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(this.canvas, 0, 0);

    const rect = this.canvas.parentElement.getBoundingClientRect();
    // Leave room for toolbars
    this.canvas.width = rect.width;
    this.canvas.height = rect.height - 49; 

    // Re-draw saved lines
    this.ctx.drawImage(tempCanvas, 0, 0);
  }

  startDrawing(e) {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  startDrawingTouch(e) {
    if (e.touches.length !== 1) return;
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.touches[0].clientX - rect.left;
    this.lastY = e.touches[0].clientY - rect.top;
    e.preventDefault(); // Stop scrolling on touch
  }

  draw(e) {
    if (!this.isDrawing) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.drawStroke(x, y);
  }

  drawTouch(e) {
    if (!this.isDrawing || e.touches.length !== 1) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.drawStroke(x, y);
    e.preventDefault();
  }

  drawStroke(x, y) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    
    if (this.currentTool === "erase") {
      this.ctx.strokeStyle = "#111116"; // match canvas background
      this.ctx.lineWidth = 20;
    } else {
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.brushSize;
    }
    
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  bindEvents() {
    // Leave button custom warning
    document.getElementById("leave-classroom-btn")?.addEventListener("click", () => {
      showToast("Disconnected from live virtual session.", "info");
    });

    // Maximize / Minimize Viewport Controls
    const embeddedContainer = document.getElementById("classroom-embedded-container");
    const maxBtn = document.getElementById("toggle-maximize-btn");
    const minBtn = document.getElementById("toggle-minimize-btn");

    if (embeddedContainer && maxBtn && minBtn) {
      maxBtn.addEventListener("click", () => {
        embeddedContainer.style.position = "fixed";
        embeddedContainer.style.top = "0";
        embeddedContainer.style.left = "0";
        embeddedContainer.style.width = "100vw";
        embeddedContainer.style.height = "100vh";
        embeddedContainer.style.zIndex = "99999";
        embeddedContainer.style.borderRadius = "0";

        maxBtn.style.display = "none";
        minBtn.style.display = "inline-flex";
        showToast("تم تكبير بث القاعة ملء الشاشة ⤢", "info");
      });

      minBtn.addEventListener("click", () => {
        embeddedContainer.style.position = "relative";
        embeddedContainer.style.top = "auto";
        embeddedContainer.style.left = "auto";
        embeddedContainer.style.width = "100%";
        embeddedContainer.style.height = "100%";
        embeddedContainer.style.zIndex = "auto";
        embeddedContainer.style.borderRadius = "16px";

        minBtn.style.display = "none";
        maxBtn.style.display = "inline-flex";
        showToast("تم تصغير البث للنمط العادي ⤤", "info");
      });
    }

    // Tab Switcher
    const tabs = this.container.querySelectorAll(".classroom-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        this.activeTab = target;
        
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const stream = document.getElementById("classroom-stream-area");
        const board = document.getElementById("classroom-whiteboard-area");

        if (target === "stream") {
          stream.style.display = "flex";
          board.classList.remove("active");
        } else {
          stream.style.display = "none";
          board.classList.add("active");
          this.resizeCanvas(); // Trigger refresh layout
        }
      });
    });

    // Whiteboard tools listeners
    document.getElementById("tool-draw")?.addEventListener("click", (e) => {
      this.currentTool = "draw";
      this.container.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });

    document.getElementById("tool-erase")?.addEventListener("click", (e) => {
      this.currentTool = "erase";
      this.container.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });

    document.getElementById("tool-clear")?.addEventListener("click", () => {
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        showToast("Whiteboard cleared.", "info");
      }
    });

    // Colors selectors
    const colors = this.container.querySelectorAll(".tool-color");
    colors.forEach(col => {
      col.addEventListener("click", (e) => {
        this.currentTool = "draw";
        this.container.querySelector("#tool-draw")?.classList.add("active");
        this.container.querySelector("#tool-erase")?.classList.remove("active");

        this.currentColor = col.getAttribute("data-color");
        colors.forEach(c => c.classList.remove("active"));
        col.classList.add("active");
      });
    });

    // Audio / Visual control triggers
    document.getElementById("btn-mute-mic")?.addEventListener("click", (e) => {
      this.micMuted = !this.micMuted;
      e.currentTarget.classList.toggle("active", this.micMuted);
      e.currentTarget.innerHTML = `<i data-lucide="${this.micMuted ? 'mic-off' : 'mic'}"></i>`;
      showToast(this.micMuted ? "Microphone muted." : "Microphone active.", "info");
      if (window.lucide) window.lucide.createIcons();
    });

    document.getElementById("btn-mute-cam")?.addEventListener("click", (e) => {
      this.camMuted = !this.camMuted;
      e.currentTarget.classList.toggle("active", this.camMuted);
      e.currentTarget.innerHTML = `<i data-lucide="${this.camMuted ? 'video-off' : 'video'}"></i>`;
      showToast(this.camMuted ? "Webcam deactivated." : "Webcam sharing active.", "info");
      if (window.lucide) window.lucide.createIcons();
    });

    document.getElementById("btn-raise-hand")?.addEventListener("click", (e) => {
      this.handRaised = !this.handRaised;
      e.currentTarget.classList.toggle("active", this.handRaised);
      if (this.handRaised) {
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.backgroundColor = "var(--accent-glow)";
        showToast("You raised your hand. Teacher has been notified.", "success");
      } else {
        e.currentTarget.style.color = "";
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.backgroundColor = "";
      }
    });

    // Chat Message Form submission
    document.getElementById("classroom-chat-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("classroom-chat-input");
      const message = input.value.trim();
      if (!message) return;

      this.appendChatMessage(state.user.name, message, state.user.role);
      input.value = "";
    });

    // Poll voting buttons
    this.container.querySelectorAll(".poll-option-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (this.pollVoted) return;
        const opt = e.currentTarget.getAttribute("data-opt");
        
        this.pollVoted = true;
        this.pollResults[opt]++;

        // Calculate totals and percentages
        const total = this.pollResults.A + this.pollResults.B + this.pollResults.C;
        
        // Hide standard options hover and update text with votes percentages
        this.container.querySelectorAll(".poll-option-btn").forEach(b => {
          b.style.cursor = "default";
          const bOpt = b.getAttribute("data-opt");
          const pct = Math.round((this.pollResults[bOpt] / total) * 100);
          
          document.getElementById(`opt-count-${bOpt}`).textContent = `${pct}% (${this.pollResults[bOpt]} votes)`;
          document.getElementById(`opt-fill-${bOpt}`).style.width = `${pct}%`;
        });

        showToast("Your poll response has been registered.", "success");
      });
    });
  }

  appendChatMessage(name, message, role = "student") {
    const chatBox = document.getElementById("classroom-chat-box");
    if (!chatBox) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    
    // Distinguish teacher message layout
    const isTeacher = role === "teacher" || role === "admin";
    const inlineStyle = isTeacher ? `border-left: 2px solid var(--primary); background:rgba(99,102,241,0.05);` : "";

    bubble.innerHTML = `
      <div class="chat-bubble-meta">
        <span class="chat-sender-name">${name} ${isTeacher ? '<span class="chat-sender-role">Teacher</span>' : ""}</span>
        <span>${time}</span>
      </div>
      <div class="chat-bubble-body" style="${inlineStyle}">${message}</div>
    `;

    chatBox.appendChild(bubble);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
  }

  startChatSimulation() {
    this.chatInterval = setInterval(() => {
      // Pick random student and message
      const student = this.mockStudents[Math.floor(Math.random() * this.mockStudents.length)];
      const msg = this.mockMessages[Math.floor(Math.random() * this.mockMessages.length)];
      
      this.appendChatMessage(student.name, msg, student.role);
    }, 9000); // Trigger message every 9 seconds
  }

  triggerScheduledPoll() {
    // Seed initial results for simulation
    this.pollResults = { A: 12, B: 4, C: 2 };
    
    this.pollTimer = setTimeout(() => {
      const widget = document.getElementById("poll-widget");
      if (widget) {
        widget.style.display = "block";
        this.pollActive = true;
        showToast("Teacher launched a live classroom poll!", "info");
      }
    }, 15000); // Launch poll 15 seconds after joining session
  }

  onDestroy() {
    // Clear simulation intervals to avoid leaks
    if (this.chatInterval) clearInterval(this.chatInterval);
    if (this.pollTimer) clearTimeout(this.pollTimer);
    window.removeEventListener("resize", () => this.resizeCanvas());
  }
}
