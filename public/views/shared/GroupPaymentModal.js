import { apiFetch, state, showToast, t } from "../../app.js";

/**
 * Opens the Group Enrollment & Payment Confirmation Modal
 * @param {Object} options
 * @param {string} options.courseId
 * @param {string} options.courseTitle
 * @param {string} options.courseImage
 * @param {string} options.groupId
 * @param {string} options.groupName
 * @param {string} options.teacherName
 * @param {string} options.subjectName
 * @param {string} options.scheduleDays
 * @param {string} options.scheduleTime
 * @param {number} options.sessionPrice
 * @param {number} options.monthlyPrice
 * @param {number} options.totalSessions
 * @param {Function} [options.onSuccess]
 */
export function openGroupPaymentModal(options) {
  if (!state.user) {
    showToast("يرجى تسجيل الدخول أولاً لإتمام طلب الاشتراك.", "info");
    window.location.hash = "#login";
    return;
  }

  if (state.user.role === "teacher" || state.user.role === "admin") {
    showToast("أنت مسجل كمعلم أو مسؤول بالمنصة.", "info");
    return;
  }

  // Remove any existing modal
  const existing = document.getElementById("group-payment-modal-overlay");
  if (existing) existing.remove();

  const {
    courseId,
    courseTitle = "الدورة التعليمية",
    groupId,
    groupName = "المجموعة الدراسية",
    teacherName = "الأستاذ",
    subjectName = "",
    scheduleDays = "الأحد والأربعاء",
    scheduleTime = "06:00 م",
    sessionPrice = 40,
    monthlyPrice = 320,
    totalSessions = 24,
    onSuccess
  } = options;

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "group-payment-modal-overlay";
  modalOverlay.className = "modal-overlay";
  modalOverlay.style.cssText = `
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 100000;
    align-items: center;
    justify-content: center;
    padding: 20px;
    direction: rtl;
    font-family: inherit;
  `;

  modalOverlay.innerHTML = `
    <div class="modal-content glass-card" style="
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 28px;
      padding: 0;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      box-shadow: 0 25px 60px rgba(0,0,0,0.35);
      position: relative;
    ">
      
      <!-- Header -->
      <div style="
        padding: 24px 28px;
        background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(16, 185, 129, 0.08));
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 16px;
            background: var(--primary);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
            box-shadow: 0 6px 18px rgba(79, 70, 229, 0.35);
          ">
            💳
          </div>
          <div>
            <h3 style="font-size:1.2rem; font-weight:900; margin:0 0 4px 0; color:var(--text-main);">
              تأكيد الاشتراك وإرسال إشعار التحويل
            </h3>
            <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">
              ${groupName} • ${teacherName}
            </span>
          </div>
        </div>

        <button type="button" id="close-group-payment-modal" style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--bg-app);
          color: var(--text-muted);
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        ">&times;</button>
      </div>

      <!-- Body -->
      <form id="group-payment-submission-form" style="padding: 24px 28px; display: flex; flex-direction: column; gap: 20px;">
        
        <!-- 1. Group Summary Box -->
        <div style="
          background: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">المقرر والمادة:</span>
            <span style="font-size:0.9rem; font-weight:800; color:var(--text-main);">${courseTitle} ${subjectName ? `(${subjectName})` : ''}</span>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">مواعيد الحصص الأسبوعية:</span>
            <span style="font-size:0.88rem; font-weight:800; color:var(--primary);">${scheduleDays} • ${scheduleTime}</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">نظام الحساب والاشتراك:</span>
            <span style="font-size:0.88rem; font-weight:800; color:var(--text-main);">${sessionPrice} ج.م. للحصة (${totalSessions} حصة بالمقرر)</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:2px;">
            <span style="font-size:0.92rem; font-weight:900; color:var(--text-main);">المبلغ المطلوب تحويله (اشتراك 8 حصص شهرياً):</span>
            <span style="font-size:1.25rem; font-weight:900; color:#10b981; background:rgba(16,185,129,0.1); padding:4px 14px; border-radius:14px; border:1px solid rgba(16,185,129,0.2);">
              ${monthlyPrice} ج.م.
            </span>
          </div>
        </div>

        <!-- 2. Platform Transfer Accounts (With Copy Buttons) -->
        <div style="
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(79, 70, 229, 0.04));
          border: 1px dashed #f59e0b;
          border-radius: 20px;
          padding: 16px 20px;
        ">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span style="font-size:1.1rem;">📲</span>
            <span style="font-weight:900; font-size:0.9rem; color:var(--text-main);">بيانات التحويل المالي المعتمدة للمنصة:</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            
            <!-- Vodafone Cash -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="display:block; font-size:0.75rem; color:#ef4444; font-weight:800;">🔴 فودافون كاش</span>
                <span style="font-size:0.9rem; font-weight:900; color:var(--text-main); font-family:monospace;" id="vf-cash-num">01098765432</span>
              </div>
              <button type="button" class="btn-secondary copy-wallet-btn" data-target="vf-cash-num" style="padding:4px 10px; font-size:0.75rem; border-radius:10px;">
                نسخ 📋
              </button>
            </div>

            <!-- InstaPay -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="display:block; font-size:0.75rem; color:#8b5cf6; font-weight:800;">⚡ إنستاباي (InstaPay)</span>
                <span style="font-size:0.85rem; font-weight:900; color:var(--text-main);" id="instapay-handle">bakalorya@instapay</span>
              </div>
              <button type="button" class="btn-secondary copy-wallet-btn" data-target="instapay-handle" style="padding:4px 10px; font-size:0.75rem; border-radius:10px;">
                نسخ 📋
              </button>
            </div>

          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin:10px 0 0 0; line-height:1.4;">
            * يرجى إتمام التحويل بمبلغ <strong>${monthlyPrice} ج.م.</strong> ثم إدخال بيانات العملية وإرفاق صورة الإيصال بالأسفل لاعتماد اشتراكك فورياً.
          </p>
        </div>

        <!-- 3. Student Input Fields -->
        <div style="display:flex; flex-direction:column; gap:14px;">
          
          <!-- Payment Method -->
          <div class="form-group" style="margin:0;">
            <label style="display:block; font-weight:800; font-size:0.85rem; margin-bottom:6px; color:var(--text-main);">
              1. وسيلة التحويل التي استخدمتها: <span style="color:#ef4444;">*</span>
            </label>
            <select id="group-payment-provider-select" class="form-select" style="border-radius:14px; padding:11px 14px; font-size:0.9rem; width:100%;" required>
              <option value="vodafone_cash">📱 فودافون كاش (Vodafone Cash)</option>
              <option value="instapay">⚡ إنستاباي (InstaPay)</option>
              <option value="orange_cash">🟠 أورنج كاش (Orange Cash)</option>
              <option value="etisalat_cash">🟢 اتصالات كاش (Etisalat Cash)</option>
              <option value="bank_transfer">🏦 تحويل بنكي / حساب بنكي</option>
              <option value="fawry">🛒 فوري / أمان / خدمة دفع أخرى</option>
            </select>
          </div>

          <!-- Sender Phone Number / Account -->
          <div class="form-group" style="margin:0;">
            <label style="display:block; font-weight:800; font-size:0.85rem; margin-bottom:6px; color:var(--text-main);">
              2. رقم الهاتف أو الحساب المحول منه: <span style="color:#ef4444;">*</span>
            </label>
            <input 
              type="text" 
              id="group-payment-sender-phone" 
              class="form-input" 
              placeholder="مثال: 01012345678 أو اسم حسابك" 
              style="border-radius:14px; padding:12px 16px; font-size:0.9rem; width:100%; box-sizing:border-box;"
              required
            >
          </div>

          <!-- 3. Receipt Submission Mode (Direct Upload vs WhatsApp) -->
          <div class="form-group" style="margin:0;">
            <label style="display:block; font-weight:800; font-size:0.85rem; margin-bottom:8px; color:var(--text-main);">
              3. طريقة تسليم إيصال التحويل للإدارة: <span style="color:#ef4444;">*</span>
            </label>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
              <label id="delivery-option-upload-card" style="
                display:flex;
                align-items:center;
                gap:10px;
                padding:12px 14px;
                border-radius:14px;
                border:2px solid var(--primary);
                background:var(--bg-card);
                cursor:pointer;
                transition:all 0.2s ease;
              ">
                <input type="radio" name="receipt_delivery_mode" value="upload" checked style="accent-color:var(--primary); width:16px; height:16px;">
                <div>
                  <strong style="display:block; font-size:0.88rem; color:var(--text-main);">📤 رفع صورة الإيصال الآن</strong>
                  <span style="font-size:0.72rem; color:var(--text-muted);">تحميل مباشر على الموقع</span>
                </div>
              </label>

              <label id="delivery-option-whatsapp-card" style="
                display:flex;
                align-items:center;
                gap:10px;
                padding:12px 14px;
                border-radius:14px;
                border:2px solid var(--border-color);
                background:var(--bg-card);
                cursor:pointer;
                transition:all 0.2s ease;
              ">
                <input type="radio" name="receipt_delivery_mode" value="whatsapp" style="accent-color:#10b981; width:16px; height:16px;">
                <div>
                  <strong style="display:block; font-size:0.88rem; color:#10b981;">💬 سأرسل الإيصال لاحقاً عبر الواتساب</strong>
                  <span style="font-size:0.72rem; color:var(--text-muted);">إتمام التسجيل والإرسال بالواتساب</span>
                </div>
              </label>
            </div>

            <!-- Mode 1: Direct File Dropzone -->
            <div id="receipt-upload-wrapper" style="display:block;">
              <div id="receipt-upload-dropzone" style="
                border: 2px dashed var(--border-color);
                border-radius: 18px;
                padding: 20px;
                text-align: center;
                background: var(--bg-app);
                cursor: pointer;
                transition: all 0.2s ease;
              ">
                <input type="file" id="group-payment-receipt-file" accept="image/*" style="display:none;">
                
                <div id="receipt-idle-state">
                  <div style="width:44px; height:44px; border-radius:50%; background:var(--primary-glow); color:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 8px; font-size:1.3rem;">
                    📤
                  </div>
                  <span style="font-weight:800; font-size:0.88rem; color:var(--primary); display:block; margin-bottom:4px;">
                    اضغط هنا لاختيار أو تصوير إيصال التحويل
                  </span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">
                    الصيغ المقبولة: JPG, PNG, WEBP (الحد الأقصى 20 ميجابايت)
                  </span>
                </div>

                <div id="receipt-loading-state" style="display:none; padding:10px; color:var(--primary); font-weight:800; font-size:0.9rem;">
                  <div class="spinner" style="width:24px;height:24px;display:inline-block;vertical-align:middle;margin-inline-end:8px;"></div>
                  جاري رفع صورة الإيصال...
                </div>

                <div id="receipt-preview-state" style="display:none; text-align:center;">
                  <div style="position:relative; display:inline-block;">
                    <img id="receipt-preview-image" src="" style="max-height:140px; border-radius:14px; object-fit:cover; border:2px solid #10b981; box-shadow:0 6px 18px rgba(0,0,0,0.15);">
                    <button type="button" id="remove-receipt-btn" style="position:absolute; top:-10px; right:-10px; background:#ef4444; color:#fff; border:none; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.3);">&times;</button>
                  </div>
                  <p style="font-size:0.8rem; color:#10b981; font-weight:800; margin:6px 0 0 0;">
                    ✓ تم اختيار ورفع إيصال التحويل بنجاح
                  </p>
                </div>

              </div>

              <input type="hidden" id="group-payment-receipt-url" value="">
            </div>

            <!-- Mode 2: WhatsApp Delivery Helper Box -->
            <div id="receipt-whatsapp-wrapper" style="display:none;">
              <div style="
                background: rgba(16, 185, 129, 0.08);
                border: 1.5px solid rgba(16, 185, 129, 0.35);
                border-radius: 18px;
                padding: 18px 20px;
                text-align: center;
              ">
                <div style="width:46px; height:46px; border-radius:50%; background:#10b981; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 10px; box-shadow:0 4px 14px rgba(16,185,129,0.35);">
                  💬
                </div>
                <h4 style="font-size:0.95rem; font-weight:900; margin:0 0 6px 0; color:var(--text-main);">
                  إرسال صورة الإيصال لاحقاً لمسؤول المنصة عبر الواتساب
                </h4>
                <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 14px 0; line-height:1.5;">
                  يمكنك إتمام التسجيل والاشتراك الآن وسيقوم المسؤول بمراجعة وتأكيد حسابك بمجرد إرسال صورة التحويل له عبر الواتساب.
                </p>
                <button type="button" id="open-whatsapp-chat-action-btn" class="btn-primary" style="
                  background: #10b981;
                  border-color: #10b981;
                  padding: 10px 22px;
                  font-weight: 800;
                  font-size: 0.88rem;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  gap: 8px;
                  border-radius: 30px;
                  box-shadow: 0 4px 16px rgba(16,185,129,0.35);
                ">
                  <span>فتح محادثة الواتساب لإرسال الإيصال الآن 💬</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Notes -->
          <div class="form-group" style="margin:0;">
            <label style="display:block; font-weight:800; font-size:0.85rem; margin-bottom:6px; color:var(--text-main);">
              4. رقم العملية المرجعي أو ملاحظات للإدارة (اختياري):
            </label>
            <input 
              type="text" 
              id="group-payment-notes" 
              class="form-input" 
              placeholder="مثال: تم التحويل من محفظة والدي باسم محمد..." 
              style="border-radius:14px; padding:11px 16px; font-size:0.88rem; width:100%; box-sizing:border-box;"
            >
          </div>

        </div>

        <!-- Submit & Actions Footer -->
        <div style="
          display: flex;
          gap: 12px;
          margin-top: 10px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        ">
          <button type="button" id="cancel-group-payment-modal-btn" class="btn-secondary" style="flex:1; padding:12px 20px; border-radius:30px; font-weight:700; font-size:0.92rem;">
            إلغاء
          </button>
          <button type="submit" id="submit-group-payment-btn" class="btn-primary" style="flex:2; padding:12px 24px; border-radius:30px; font-weight:900; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>تأكيد وإرسال إشعار الدفع للإدارة 🚀</span>
          </button>
        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Close handlers
  const closeModal = () => modalOverlay.remove();
  modalOverlay.querySelector("#close-group-payment-modal")?.addEventListener("click", closeModal);
  modalOverlay.querySelector("#cancel-group-payment-modal-btn")?.addEventListener("click", closeModal);

  // Copy wallet buttons
  modalOverlay.querySelectorAll(".copy-wallet-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetEl = modalOverlay.querySelector(`#${targetId}`);
      if (targetEl) {
        navigator.clipboard.writeText(targetEl.textContent.trim());
        showToast("تم نسخ الرقم إلى الحافظة بنجاح 📋", "success");
        btn.textContent = "تم النسخ ✓";
        setTimeout(() => { btn.textContent = "نسخ 📋"; }, 2000);
      }
    });
  });

  // Delivery mode radio toggle
  const uploadCard = modalOverlay.querySelector("#delivery-option-upload-card");
  const waCard = modalOverlay.querySelector("#delivery-option-whatsapp-card");
  const uploadWrapper = modalOverlay.querySelector("#receipt-upload-wrapper");
  const waWrapper = modalOverlay.querySelector("#receipt-whatsapp-wrapper");
  const senderPhoneInput = modalOverlay.querySelector("#group-payment-sender-phone");
  const submitBtn = modalOverlay.querySelector("#submit-group-payment-btn");
  let currentDeliveryMode = "upload";

  modalOverlay.querySelectorAll("input[name='receipt_delivery_mode']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentDeliveryMode = e.target.value;
      if (currentDeliveryMode === "upload") {
        uploadCard.style.borderColor = "var(--primary)";
        waCard.style.borderColor = "var(--border-color)";
        uploadWrapper.style.display = "block";
        waWrapper.style.display = "none";
        if (senderPhoneInput) senderPhoneInput.required = true;
        if (submitBtn) submitBtn.innerHTML = `<span>تأكيد وإرسال إشعار الدفع للإدارة 🚀</span>`;
      } else {
        uploadCard.style.borderColor = "var(--border-color)";
        waCard.style.borderColor = "#10b981";
        uploadWrapper.style.display = "none";
        waWrapper.style.display = "block";
        if (senderPhoneInput) senderPhoneInput.required = false;
        if (submitBtn) submitBtn.innerHTML = `<span>تأكيد وإتمام التسجيل (سأرسل الإيصال لاحقاً) 🚀</span>`;
      }
    });
  });

  // WhatsApp Send Button Handler
  modalOverlay.querySelector("#open-whatsapp-chat-action-btn")?.addEventListener("click", () => {
    const studentName = state.user?.name || "طالب";
    const senderPhone = modalOverlay.querySelector("#group-payment-sender-phone")?.value.trim() || state.user?.phone || "";
    const provider = modalOverlay.querySelector("#group-payment-provider-select")?.value || "تحويل مالي";
    const notes = modalOverlay.querySelector("#group-payment-notes")?.value.trim() || "";

    const message = `مرحباً إدارة منصة بكالوريا 👋\nأود تأكيد تحويل رسوم الاشتراك في المجموعة الدراسية:\n- 👨‍🎓 اسم الطالب: ${studentName}\n- 👥 المجموعة: ${groupName}\n- 📚 المقرر: ${courseTitle}\n- 👨‍🏫 المعلم: ${teacherName}\n- 💰 المبلغ المحول: ${monthlyPrice} ج.م.\n- 📱 طريقة التحويل: ${provider}\n- 📞 رقم المحول منه: ${senderPhone || 'غير محدد'}\n${notes ? `- 📝 ملاحظات: ${notes}\n` : ''}\n(مرفق صورة إيصال التحويل)`;

    const waUrl = state.platformSettings?.whatsappUrl || "https://wa.me/213555123456";
    const cleanNumber = waUrl.replace(/\D/g, "") || "213555123456";
    const targetUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(targetUrl, "_blank");
  });

  // Receipt upload handling
  const fileInput = modalOverlay.querySelector("#group-payment-receipt-file");
  const dropzone = modalOverlay.querySelector("#receipt-upload-dropzone");
  const idleState = modalOverlay.querySelector("#receipt-idle-state");
  const loadingState = modalOverlay.querySelector("#receipt-loading-state");
  const previewState = modalOverlay.querySelector("#receipt-preview-state");
  const previewImg = modalOverlay.querySelector("#receipt-preview-image");
  const removeBtn = modalOverlay.querySelector("#remove-receipt-btn");
  const hiddenReceiptUrl = modalOverlay.querySelector("#group-payment-receipt-url");

  dropzone?.addEventListener("click", (e) => {
    if (e.target === dropzone || idleState?.contains(e.target)) {
      fileInput?.click();
    }
  });

  removeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    hiddenReceiptUrl.value = "";
    if (fileInput) fileInput.value = "";
    previewState.style.display = "none";
    idleState.style.display = "block";
  });

  fileInput?.addEventListener("change", async () => {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];

    idleState.style.display = "none";
    loadingState.style.display = "block";
    previewState.style.display = "none";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = state.token || localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: formData
      });

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        hiddenReceiptUrl.value = data.url;
        previewImg.src = data.url;
        loadingState.style.display = "none";
        previewState.style.display = "block";
        showToast("تم رفع صورة الإيصال بنجاح ✅", "success");
      } else {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "فشل رفع الملف");
      }
    } catch (err) {
      console.error("Receipt upload error:", err);
      loadingState.style.display = "none";
      idleState.style.display = "block";
      showToast(err.message || "فشل رفع صورة الإيصال. يرجى إعادة المحاولة.", "error");
    }
  });

  // Form submission
  const form = modalOverlay.querySelector("#group-payment-submission-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const provider = modalOverlay.querySelector("#group-payment-provider-select")?.value || "vodafone_cash";
    const rawSenderPhone = modalOverlay.querySelector("#group-payment-sender-phone")?.value.trim();
    const senderPhone = rawSenderPhone || state.user?.phone || state.user?.email || "غير محدد";
    const receiptUrl = hiddenReceiptUrl?.value || "";
    const notes = modalOverlay.querySelector("#group-payment-notes")?.value.trim();

    if (currentDeliveryMode === "upload" && !receiptUrl && (!fileInput.files || fileInput.files.length === 0)) {
      showToast("يرجى اختيار صورة إيصال التحويل أو اختيار 'سأرسل الإيصال لاحقاً عبر الواتساب'.", "warning");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;"></div>
        <span>جاري الإرسال...</span>
      `;

      // If file chosen but not yet uploaded (in upload mode)
      let finalReceiptUrl = receiptUrl;
      if (currentDeliveryMode === "upload" && !finalReceiptUrl && fileInput?.files?.[0]) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        const token = state.token || localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers,
          body: formData
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          finalReceiptUrl = data.url;
        }
      }

      const isViaWa = currentDeliveryMode === "whatsapp";
      const deliveryTag = isViaWa ? "[سأرسل الإيصال لاحقاً عبر الواتساب للمشرف]" : "[تم رفع الإيصال بالموقع]";
      const fullNotes = notes 
        ? `${notes} ${deliveryTag} (رقم المحول: ${senderPhone})` 
        : `${deliveryTag} (رقم المحول: ${senderPhone})`;

      const payload = {
        courseId,
        groupId,
        amount: monthlyPrice,
        provider,
        providerTransactionId: senderPhone,
        receiptUrl: isViaWa ? (finalReceiptUrl || null) : finalReceiptUrl,
        notes: fullNotes
      };

      const res = await apiFetch("/student/enrollments", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      closeModal();
      showToast(res.message || "تم إرسال طلب الاشتراك بنجاح! 🎉", "success");

      // Show celebratory confirmation modal
      showGroupEnrollmentSuccessModal({
        groupName,
        courseTitle,
        teacherName,
        amount: monthlyPrice
      });

      if (typeof onSuccess === "function") {
        onSuccess(res);
      }
    } catch (err) {
      console.error("Group enrollment submission error:", err);
      showToast(err.message || "حدث خطأ أثناء إرسال طلب الاشتراك.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = currentDeliveryMode === "whatsapp" 
        ? `<span>تأكيد وإتمام التسجيل (سأرسل الإيصال لاحقاً) 🚀</span>`
        : `<span>تأكيد وإرسال إشعار الدفع للإدارة 🚀</span>`;
    }
  });
}

/**
 * Celebratory Success Modal
 */
function showGroupEnrollmentSuccessModal({ groupName, courseTitle, teacherName, amount }) {
  const existing = document.getElementById("group-enrollment-success-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "group-enrollment-success-modal";
  modal.className = "modal-overlay";
  modal.style.cssText = `
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 100001;
    align-items: center;
    justify-content: center;
    padding: 20px;
    direction: rtl;
  `;

  modal.innerHTML = `
    <div class="glass-card" style="
      max-width: 520px;
      width: 100%;
      border-radius: 28px;
      padding: 32px 28px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    ">
      <div style="
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.2rem;
        margin: 0 auto 16px;
        border: 2px solid rgba(16, 185, 129, 0.3);
      ">
        🎉
      </div>

      <h3 style="font-size:1.35rem; font-weight:900; color:var(--text-main); margin:0 0 8px 0;">
        تم استلام طلب اشتراكك وإشعار التحويل بنجاح!
      </h3>
      
      <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.6; margin:0 0 20px 0;">
        تم إرسال إيصال التحويل المالي بمبلغ <strong>${amount} ج.م.</strong> لإدارة المنصة لمراجعته واعتماده. سيتم تفعيل حسابك وحجز مقعدك في <strong>${groupName}</strong> فوراً وإشعارك بالقبول.
      </p>

      <div style="
        background: var(--bg-app);
        border: 1px solid var(--border-color);
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: start;
        font-size: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 6px;
      ">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">المجموعة:</span>
          <span style="font-weight:800; color:var(--text-main);">${groupName}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">المقرر:</span>
          <span style="font-weight:800; color:var(--text-main);">${courseTitle}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">المعلم:</span>
          <span style="font-weight:800; color:var(--text-main);">${teacherName}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">حالة الطلب:</span>
          <span style="font-weight:800; color:#f59e0b;">قيد المراجعة والاعتماد ⏳</span>
        </div>
      </div>

      <button id="close-success-enrollment-modal-btn" class="btn-primary" style="width:100%; padding:12px; border-radius:30px; font-weight:900; font-size:1rem;">
        متابعة وموافق 👍
      </button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector("#close-success-enrollment-modal-btn")?.addEventListener("click", () => {
    modal.remove();
  });
}
