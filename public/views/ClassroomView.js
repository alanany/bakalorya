import { apiFetch, state, showToast } from "../app.js";

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
      // Fetch session info
      const sessions = await apiFetch("/sessions");
      this.session = sessions.find(s => s.id === this.sessionId);

      if (!this.session) {
        this.container.innerHTML = `
          <div style="text-align:center; padding:100px 24px;">
            <h2>Session not found</h2>
            <a href="#student-dashboard" class="btn-primary" style="margin-top:20px;">Back to Dashboard</a>
          </div>
        `;
        return;
      }

      this.container.innerHTML = `
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
              <!-- Teacher Video Stream Simulator -->
              <div id="classroom-stream-area" style="width:100%; height:100%; display: ${this.activeTab === "stream" ? "block" : "none"};">
                <div class="video-placeholder" style="background:#09090b; height:100%;">
                  <i data-lucide="user-round" style="width:72px; height:72px; color:var(--text-muted); opacity:0.3; animation: pulse-border 2s infinite;"></i>
                  <p style="font-weight:600; color:var(--text-main); margin-top:16px;">${this.session.teacher?.name} is lecturing...</p>
                  <p style="font-size:0.8rem; color:var(--text-muted);">Audio Connection Secure. Screen Share Active.</p>
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
          stream.style.display = "block";
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
