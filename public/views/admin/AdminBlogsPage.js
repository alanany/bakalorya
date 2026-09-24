import { apiFetch, showToast, confirmDialog, state } from '../../app.js';

// ── AdminBlogsPage ─────────────────────────────────────────────────────────────
// Blog management module for AdminView: upload cover, publish, edit, approve & manage blogs

export const AdminBlogsPage = {

  renderBlogsTab() {
    const blogs = this.allBlogs || [];
    const pendingBlogs = blogs.filter(b => b.status === "PENDING");
    const approvedBlogs = blogs.filter(b => b.status === "APPROVED" || !b.status);
    const rejectedBlogs = blogs.filter(b => b.status === "REJECTED");

    const currentFilter = this._blogStatusFilter || "ALL";

    let filteredBlogs = blogs;
    if (currentFilter === "PENDING") filteredBlogs = pendingBlogs;
    else if (currentFilter === "APPROVED") filteredBlogs = approvedBlogs;
    else if (currentFilter === "REJECTED") filteredBlogs = rejectedBlogs;

    if (this._blogSearchQuery) {
      const q = this._blogSearchQuery.toLowerCase();
      filteredBlogs = filteredBlogs.filter(b => 
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        (b.content && b.content.toLowerCase().includes(q))
      );
    }

    return `
      <!-- Header & Action -->
      <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800; margin:0 0 4px 0; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <span>📰 إدارة مقالات ومدونة المنصة</span>
            ${pendingBlogs.length > 0 ? `<span style="background:var(--warning,#f59e0b); color:#fff; font-size:0.75rem; font-weight:800; padding:2px 10px; border-radius:12px;">${pendingBlogs.length} بانتظار المراجعة</span>` : ''}
          </h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin:0;">نشر مقالات جديدة باسم إدارة المنصة، رفع صور الغلاف، والتحكم الكامل في محتوى المدونة.</p>
        </div>
        <button id="admin-create-blog-btn" class="btn-primary" style="gap:8px; white-space:nowrap; padding:10px 22px; border-radius:12px; background:linear-gradient(135deg, #ec4899, #a855f7); border:none; display:flex; align-items:center;">
          <i data-lucide="plus-circle" style="width:18px;height:18px;"></i> كتابة مقال كمسؤول ✍️
        </button>
      </div>

      <!-- Quick Metrics Cards -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:24px;">
        <div class="glass-card" style="padding:18px; border-radius:16px; text-align:center; border:1px solid var(--border-color); cursor:pointer;" onclick="window.adminViewInstance.setBlogFilter('ALL')">
          <div style="font-size:1.8rem; font-weight:900; color:var(--primary);">${blogs.length}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-top:4px;">إجمالي المقالات</div>
        </div>
        <div class="glass-card" style="padding:18px; border-radius:16px; text-align:center; border:2px solid ${currentFilter === 'PENDING' ? '#f59e0b' : 'rgba(245,158,11,0.3)'}; background:${pendingBlogs.length > 0 ? 'rgba(245,158,11,0.06)' : 'transparent'}; cursor:pointer;" onclick="window.adminViewInstance.setBlogFilter('PENDING')">
          <div style="font-size:1.8rem; font-weight:900; color:#f59e0b;">${pendingBlogs.length}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-top:4px;">⏳ قيد المراجعة</div>
        </div>
        <div class="glass-card" style="padding:18px; border-radius:16px; text-align:center; border:2px solid ${currentFilter === 'APPROVED' ? '#10b981' : 'rgba(16,185,129,0.3)'}; cursor:pointer;" onclick="window.adminViewInstance.setBlogFilter('APPROVED')">
          <div style="font-size:1.8rem; font-weight:900; color:#10b981;">${approvedBlogs.length}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-top:4px;">✅ مقالات منشورة ومقبولة</div>
        </div>
        <div class="glass-card" style="padding:18px; border-radius:16px; text-align:center; border:2px solid ${currentFilter === 'REJECTED' ? '#ef4444' : 'rgba(239,68,68,0.3)'}; cursor:pointer;" onclick="window.adminViewInstance.setBlogFilter('REJECTED')">
          <div style="font-size:1.8rem; font-weight:900; color:#ef4444;">${rejectedBlogs.length}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700; margin-top:4px;">❌ مقالات مرفوضة</div>
        </div>
      </div>

      <!-- Filter Tabs & Search Bar -->
      <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:14px 18px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-secondary admin-blog-filter-btn" data-filter="ALL" style="padding:7px 16px; font-size:0.82rem; border-radius:20px; ${currentFilter === 'ALL' ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : ''}">
            جميع المقالات (${blogs.length})
          </button>
          <button class="btn-secondary admin-blog-filter-btn" data-filter="PENDING" style="padding:7px 16px; font-size:0.82rem; border-radius:20px; ${currentFilter === 'PENDING' ? 'background:#f59e0b;color:#fff;border-color:#f59e0b;' : ''}">
            ⏳ قيد المراجعة (${pendingBlogs.length})
          </button>
          <button class="btn-secondary admin-blog-filter-btn" data-filter="APPROVED" style="padding:7px 16px; font-size:0.82rem; border-radius:20px; ${currentFilter === 'APPROVED' ? 'background:#10b981;color:#fff;border-color:#10b981;' : ''}">
            ✅ المقبولة والمنشورة (${approvedBlogs.length})
          </button>
          <button class="btn-secondary admin-blog-filter-btn" data-filter="REJECTED" style="padding:7px 16px; font-size:0.82rem; border-radius:20px; ${currentFilter === 'REJECTED' ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : ''}">
            ❌ المرفوضة (${rejectedBlogs.length})
          </button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; min-width:260px; flex:1; max-width:380px;">
          <input type="text" id="admin-blog-search-input" class="form-input" style="padding:8px 14px; font-size:0.85rem;" placeholder="بحث بالعنوان أو التصنيف..." value="${this._blogSearchQuery || ''}">
        </div>
      </div>

      <!-- Blogs Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
        ${filteredBlogs.length === 0 ? `
          <div class="glass-card" style="text-align:center; padding:50px 20px; color:var(--text-muted); grid-column:1/-1; border:2px dashed var(--border-color); border-radius:18px;">
            <i data-lucide="newspaper" style="width:44px; height:44px; opacity:0.3; margin-bottom:12px;"></i>
            <h4 style="font-size:1.1rem; color:var(--text-main); margin-bottom:6px;">لا توجد مقالات مطابقة</h4>
            <p style="font-size:0.88rem; margin:0;">لم يتم العثور على أي مقالات في هذا القسم حالياً.</p>
          </div>
        ` : filteredBlogs.map(blog => {
          const isPending = blog.status === "PENDING";
          const isRejected = blog.status === "REJECTED";

          let badgeColor = "#10b981";
          let badgeBg = "rgba(16,185,129,0.12)";
          let badgeText = "✅ منشور ومقبول";

          if (isPending) {
            badgeColor = "#f59e0b";
            badgeBg = "rgba(245,158,11,0.12)";
            badgeText = "⏳ قيد مراجعة الإدارة";
          } else if (isRejected) {
            badgeColor = "#ef4444";
            badgeBg = "rgba(239,68,68,0.12)";
            badgeText = "❌ مرفوض";
          }

          return `
            <div class="glass-card" style="border-radius:18px; border:2px solid ${isPending ? '#f59e0b' : 'var(--border-color)'}; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; position:relative; box-shadow:${isPending ? '0 4px 20px rgba(245,158,11,0.15)' : 'none'};">
              <div>
                <!-- Cover Image & Badge -->
                <div style="height:150px; position:relative; overflow:hidden;">
                  <img src="${blog.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600'}" alt="${blog.title}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                  <div style="position:absolute; inset:0; background:linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6));"></div>
                  <span style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.6); color:#fff; font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:14px; backdrop-filter:blur(4px);">${blog.category || 'عام'}</span>
                  <span style="position:absolute; top:12px; left:12px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:14px;">${badgeText}</span>
                </div>

                <!-- Body -->
                <div style="padding:16px;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:0.75rem; color:var(--text-muted);">
                    <i data-lucide="clock" style="width:14px;height:14px;"></i>
                    <span>${blog.readTime || '5 دقائق قراءة'}</span>
                    <span>•</span>
                    <span>${new Date(blog.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>

                  <h4 style="font-size:1.02rem; font-weight:800; color:var(--text-main); margin:0 0 8px 0; line-height:1.4;">${blog.title}</h4>
                  <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.55; margin:0 0 12px 0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${blog.content}</p>

                  ${isRejected && blog.rejectionReason ? `
                    <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:8px 12px; font-size:0.75rem; color:#ef4444; margin-bottom:10px;">
                      <strong>سبب الرفض:</strong> ${blog.rejectionReason}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="padding:12px 16px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:8px;">
                ${isPending ? `
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <button class="btn-primary admin-accept-blog-btn" data-id="${blog.id}" style="background:#10b981; border:none; padding:7px 10px; font-size:0.8rem; border-radius:8px; gap:4px; justify-content:center; display:flex; align-items:center;">
                      <i data-lucide="check" style="width:14px;height:14px;"></i> قبول ونشر ✅
                    </button>
                    <button class="btn-secondary admin-refuse-blog-btn" data-id="${blog.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); padding:7px 10px; font-size:0.8rem; border-radius:8px; gap:4px; justify-content:center; display:flex; align-items:center;">
                      <i data-lucide="x" style="width:14px;height:14px;"></i> رفض المقال ❌
                    </button>
                  </div>
                ` : ''}

                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <div style="display:flex; gap:6px;">
                    <button class="btn-secondary admin-edit-blog-btn" data-id="${blog.id}" style="padding:6px 12px; font-size:0.78rem; border-radius:8px; gap:4px; display:flex; align-items:center;">
                      <i data-lucide="edit-3" style="width:13px;height:13px;"></i> تعديل
                    </button>
                    <button class="btn-secondary admin-delete-blog-btn" data-id="${blog.id}" style="padding:6px 12px; font-size:0.78rem; border-radius:8px; color:#ef4444; border-color:rgba(239,68,68,0.3); gap:4px; display:flex; align-items:center;">
                      <i data-lucide="trash-2" style="width:13px;height:13px;"></i> حذف
                    </button>
                  </div>
                  <a href="#blog/${blog.id}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.78rem; border-radius:8px; gap:4px; text-decoration:none; display:flex; align-items:center;">
                    <i data-lucide="external-link" style="width:13px;height:13px;"></i> معاينة
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Create / Edit Blog Modal -->
      <div class="modal-overlay" id="admin-blog-modal" style="display:none;">
        <div class="modal-content" style="max-width:680px; max-height:92vh; overflow-y:auto;">
          <div class="modal-header">
            <h3 class="modal-title" id="admin-blog-modal-title">✍️ كتابة مقال جديد</h3>
            <span class="modal-close-btn" id="close-admin-blog-modal">&times;</span>
          </div>
          <form id="admin-blog-form">
            <input type="hidden" id="admin-blog-id">
            <div class="modal-body">
              <div class="form-group">
                <label for="admin-blog-title">عنوان المقال *</label>
                <input type="text" id="admin-blog-title" class="form-input" placeholder="مثال: دليلك الشامل للتفوق في الثانوية العامة" required>
              </div>

              <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div>
                  <label for="admin-blog-category">التصنيف أو الوسم *</label>
                  <input type="text" id="admin-blog-category" class="form-input" placeholder="مثال: 📐 نصائح المذاكرة" required>
                </div>
                <div>
                  <label for="admin-blog-readtime">وقت القراءة المقدر</label>
                  <input type="text" id="admin-blog-readtime" class="form-input" placeholder="📖 5 دقائق قراءة" value="📖 5 دقائق قراءة">
                </div>
              </div>

              <!-- Cover Image Upload Box -->
              <div class="form-group">
                <label style="font-weight:700; margin-bottom:8px; display:block;">صورة غلاف المقال 🖼️</label>
                
                <input type="hidden" id="admin-blog-image" value="">
                <input type="file" id="admin-blog-cover-file" accept="image/*" style="display:none;">

                <div id="admin-blog-cover-dropzone" style="border: 2px dashed var(--border-color); border-radius: 14px; padding: 18px; background: rgba(255,255,255,0.02); text-align: center; transition: all 0.2s ease;">
                  
                  <!-- Preview Box -->
                  <div id="admin-blog-cover-preview-box" style="display:none; position:relative; margin-bottom:14px; border-radius:12px; overflow:hidden; border:1px solid var(--border-color);">
                    <img id="admin-blog-cover-preview-img" src="" alt="غلاف المقال" style="width:100%; max-height:220px; object-fit:cover; display:block;">
                    <div style="position:absolute; top:10px; left:10px; display:flex; gap:8px;">
                      <button type="button" id="admin-blog-cover-change-btn" class="btn-secondary" style="font-size:0.75rem; padding:5px 12px; border-radius:8px; background:rgba(0,0,0,0.7); color:#fff; border:1px solid rgba(255,255,255,0.3); backdrop-filter:blur(4px); cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> تغيير الصورة
                      </button>
                      <button type="button" id="admin-blog-cover-remove-btn" style="font-size:0.75rem; padding:5px 12px; border-radius:8px; background:rgba(239,68,68,0.85); color:#fff; border:none; backdrop-filter:blur(4px); cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <i data-lucide="trash-2" style="width:12px;height:12px;"></i> حذف
                      </button>
                    </div>
                  </div>

                  <!-- Upload Placeholder / Dropzone -->
                  <div id="admin-blog-cover-placeholder" style="display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer;">
                    <div style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.15)); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                      <i data-lucide="image-up" style="width:26px; height:26px;"></i>
                    </div>
                    <div>
                      <div style="font-weight:700; font-size:0.95rem; color:var(--text-main); margin-bottom:4px;">
                        اضغط لرفع صورة الغلاف من جهازك أو اسحبها هنا
                      </div>
                      <div style="font-size:0.78rem; color:var(--text-muted);">
                        يدعم صيغ JPG, PNG, WEBP أو GIF (الحد الأقصى 10 ميجابايت)
                      </div>
                    </div>
                    <button type="button" id="admin-blog-cover-select-btn" class="btn-secondary" style="font-size:0.82rem; padding:7px 18px; border-radius:8px; margin-top:4px;">
                      اختيار ملف من الجهاز 📁
                    </button>
                  </div>

                  <!-- Upload Progress Indicator -->
                  <div id="admin-blog-cover-uploading" style="display:none; padding:20px; text-align:center;">
                    <div class="spinner" style="width:28px; height:28px; margin:0 auto 10px auto; border-color:var(--primary) transparent transparent transparent;"></div>
                    <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">جاري رفع صورة الغلاف إلى المنصة... ⏳</span>
                  </div>

                  <!-- Direct URL fallback -->
                  <div style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--border-color); display:flex; align-items:center; gap:8px;">
                    <span style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap;">أو إدخال رابط مباشر:</span>
                    <input type="url" id="admin-blog-image-url-input" class="form-input" style="font-size:0.8rem; padding:6px 12px; flex:1;" placeholder="https://images.unsplash.com/photo-...">
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="admin-blog-status">حالة النشر</label>
                <select id="admin-blog-status" class="form-input">
                  <option value="APPROVED">✅ منشور ومعتمد فوراً (Approved)</option>
                  <option value="PENDING">⏳ قيد المراجعة / مسودة (Pending)</option>
                  <option value="REJECTED">❌ غير معتمد / مرفوض (Rejected)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="admin-blog-content">نص ومحتوى المقال *</label>
                <textarea id="admin-blog-content" class="form-input" style="height:220px; resize:vertical; line-height:1.6;" placeholder="اكتب محتوى المقال التعليمي والتوجيهي هنا..." required></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-admin-blog-modal">إلغاء</button>
              <button type="submit" class="btn-primary" id="save-admin-blog-btn" style="background:linear-gradient(135deg,#ec4899,#a855f7); border:none;">حفظ ونشر المقال 🚀</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Refuse / Rejection Reason Modal -->
      <div class="modal-overlay" id="admin-blog-refuse-modal" style="display:none;">
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header">
            <h3 class="modal-title" style="color:#ef4444;">❌ رفض مقال المدونة</h3>
            <span class="modal-close-btn" id="close-blog-refuse-modal">&times;</span>
          </div>
          <form id="admin-blog-refuse-form">
            <input type="hidden" id="refuse-blog-id">
            <div class="modal-body">
              <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px;">
                سيتم إشعار الكاتب برفض المقال. يرجى كتابة أو اختيار سبب الرفض لتوضيحه له:
              </p>
              
              <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
                <label style="font-size:0.78rem; font-weight:700;">أسباب سريعة شائعة (انقر للاختيار):</label>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  <button type="button" class="btn-secondary quick-reason-btn" style="font-size:0.75rem; padding:4px 8px;">محتوى غير كافٍ أو مقتضب</button>
                  <button type="button" class="btn-secondary quick-reason-btn" style="font-size:0.75rem; padding:4px 8px;">يرجى تحسين الصياغة والتنسيق</button>
                  <button type="button" class="btn-secondary quick-reason-btn" style="font-size:0.75rem; padding:4px 8px;">غير متوافق مع المناهج التعليمية</button>
                  <button type="button" class="btn-secondary quick-reason-btn" style="font-size:0.75rem; padding:4px 8px;">يرجى إضافة صورة غلاف مناسبة</button>
                </div>
              </div>

              <div class="form-group">
                <label for="refuse-reason-text">سبب الرفض الموجه للكاتب *</label>
                <textarea id="refuse-reason-text" class="form-input" style="height:100px;" placeholder="اكتب سبب الرفض هنا..." required></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="cancel-blog-refuse-modal">تراجع</button>
              <button type="submit" class="btn-primary" style="background:#ef4444; border:none;">تأكيد الرفض ❌</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  setBlogFilter(filter) {
    this._blogStatusFilter = filter;
    this.renderTab("blogs");
  },

  async _handleCoverUpload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, GIF)", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("حجم الصورة كبير جداً، الحد الأقصى 10 ميجابايت", "error");
      return;
    }

    const placeholder = this.container.querySelector("#admin-blog-cover-placeholder");
    const previewBox = this.container.querySelector("#admin-blog-cover-preview-box");
    const uploadingState = this.container.querySelector("#admin-blog-cover-uploading");
    const previewImg = this.container.querySelector("#admin-blog-cover-preview-img");
    const hiddenInput = this.container.querySelector("#admin-blog-image");
    const urlInput = this.container.querySelector("#admin-blog-image-url-input");

    try {
      if (placeholder) placeholder.style.display = "none";
      if (previewBox) previewBox.style.display = "none";
      if (uploadingState) uploadingState.style.display = "block";

      const formData = new FormData();
      formData.append("file", file);

      const token = state?.token || localStorage.getItem("token");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        throw new Error("فشل رفع الصورة إلى الخادم");
      }

      const data = await res.json();
      const imageUrl = data.url;

      if (hiddenInput) hiddenInput.value = imageUrl;
      if (urlInput) urlInput.value = imageUrl;
      if (previewImg) previewImg.src = imageUrl;

      if (uploadingState) uploadingState.style.display = "none";
      if (previewBox) previewBox.style.display = "block";
      showToast("تم رفع صورة الغلاف بنجاح! 🖼️", "success");
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error("Cover upload error:", err);
      showToast(err.message || "تعذر رفع صورة الغلاف، يرجى المحاولة لاحقاً", "error");
      if (uploadingState) uploadingState.style.display = "none";
      if (hiddenInput && hiddenInput.value) {
        if (previewBox) previewBox.style.display = "block";
      } else {
        if (placeholder) placeholder.style.display = "flex";
      }
    }
  },

  bindBlogsEvents() {
    // Filter tabs
    this.container.querySelectorAll(".admin-blog-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.setBlogFilter(btn.dataset.filter);
      });
    });

    // Search input
    const searchInput = this.container.querySelector("#admin-blog-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this._blogSearchQuery = e.target.value;
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => {
          this.renderTab("blogs");
          const input = this.container.querySelector("#admin-blog-search-input");
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }, 300);
      });
    }

    // Open Create Blog Modal
    this.container.querySelector("#admin-create-blog-btn")?.addEventListener("click", () => {
      this._openAdminBlogModal();
    });

    // Close modals
    const blogModal = this.container.querySelector("#admin-blog-modal");
    this.container.querySelector("#close-admin-blog-modal")?.addEventListener("click", () => { blogModal.style.display = "none"; });
    this.container.querySelector("#cancel-admin-blog-modal")?.addEventListener("click", () => { blogModal.style.display = "none"; });

    const refuseModal = this.container.querySelector("#admin-blog-refuse-modal");
    this.container.querySelector("#close-blog-refuse-modal")?.addEventListener("click", () => { refuseModal.style.display = "none"; });
    this.container.querySelector("#cancel-blog-refuse-modal")?.addEventListener("click", () => { refuseModal.style.display = "none"; });

    // Quick rejection reason click
    this.container.querySelectorAll(".quick-reason-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const textarea = this.container.querySelector("#refuse-reason-text");
        if (textarea) textarea.value = btn.textContent.trim();
      });
    });

    // Cover image upload events
    const fileInput = this.container.querySelector("#admin-blog-cover-file");
    const browseBtn = this.container.querySelector("#admin-blog-cover-select-btn");
    const changeBtn = this.container.querySelector("#admin-blog-cover-change-btn");
    const placeholder = this.container.querySelector("#admin-blog-cover-placeholder");
    const removeBtn = this.container.querySelector("#admin-blog-cover-remove-btn");
    const urlInput = this.container.querySelector("#admin-blog-image-url-input");
    const dropzone = this.container.querySelector("#admin-blog-cover-dropzone");

    const triggerBrowse = () => fileInput?.click();
    browseBtn?.addEventListener("click", triggerBrowse);
    changeBtn?.addEventListener("click", triggerBrowse);
    placeholder?.addEventListener("click", (e) => {
      if (e.target !== browseBtn) triggerBrowse();
    });

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) this._handleCoverUpload(file);
    });

    // Drag and Drop
    if (dropzone) {
      ["dragenter", "dragover"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.style.borderColor = "var(--primary)";
          dropzone.style.background = "rgba(168,85,247,0.06)";
        });
      });
      ["dragleave", "drop"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.style.borderColor = "var(--border-color)";
          dropzone.style.background = "rgba(255,255,255,0.02)";
        });
      });
      dropzone.addEventListener("drop", (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) this._handleCoverUpload(file);
      });
    }

    // Remove Cover
    removeBtn?.addEventListener("click", () => {
      const hiddenInput = this.container.querySelector("#admin-blog-image");
      const previewBox = this.container.querySelector("#admin-blog-cover-preview-box");
      const previewImg = this.container.querySelector("#admin-blog-cover-preview-img");
      if (hiddenInput) hiddenInput.value = "";
      if (urlInput) urlInput.value = "";
      if (fileInput) fileInput.value = "";
      if (previewImg) previewImg.src = "";
      if (previewBox) previewBox.style.display = "none";
      if (placeholder) placeholder.style.display = "flex";
      if (window.lucide) window.lucide.createIcons();
    });

    // Direct URL input change
    urlInput?.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      const hiddenInput = this.container.querySelector("#admin-blog-image");
      const previewBox = this.container.querySelector("#admin-blog-cover-preview-box");
      const previewImg = this.container.querySelector("#admin-blog-cover-preview-img");
      if (hiddenInput) hiddenInput.value = url;
      if (url) {
        if (previewImg) previewImg.src = url;
        if (previewBox) previewBox.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      } else {
        if (previewImg) previewImg.src = "";
        if (previewBox) previewBox.style.display = "none";
        if (placeholder) placeholder.style.display = "flex";
      }
    });

    // Accept / Publish Teacher Blog
    this.container.querySelectorAll(".admin-accept-blog-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        try {
          btn.disabled = true;
          await apiFetch(`/admin/blogs/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "APPROVED" })
          });
          showToast("تم قبول ونشر المقال بنجاح! 🎉", "success");
          await this.loadAllBlogsData();
          this.renderTab("blogs");
        } catch (err) {
          showToast(err.message || "فشل قبول المقال", "error");
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Open Refuse Modal
    this.container.querySelectorAll(".admin-refuse-blog-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const form = this.container.querySelector("#admin-blog-refuse-form");
        if (form) form.reset();
        this.container.querySelector("#refuse-blog-id").value = id;
        refuseModal.style.display = "flex";
      });
    });

    // Submit Refuse Form
    this.container.querySelector("#admin-blog-refuse-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = this.container.querySelector("#refuse-blog-id").value;
      const reason = this.container.querySelector("#refuse-reason-text").value.trim();

      try {
        await apiFetch(`/admin/blogs/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "REJECTED", rejectionReason: reason })
        });
        showToast("تم رفض المقال وتنبيه الكاتب بالسبب.", "info");
        refuseModal.style.display = "none";
        await this.loadAllBlogsData();
        this.renderTab("blogs");
      } catch (err) {
        showToast(err.message || "فشل رفض المقال", "error");
      }
    });

    // Edit Blog
    this.container.querySelectorAll(".admin-edit-blog-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const blog = (this.allBlogs || []).find(b => b.id === btn.dataset.id);
        if (blog) this._openAdminBlogModal(blog);
      });
    });

    // Delete Blog
    this.container.querySelectorAll(".admin-delete-blog-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog("هل أنت متأكد من رغبتك في حذف هذا المقال نهائياً من المنصة؟", "حذف المقال");
        if (!ok) return;

        try {
          await apiFetch(`/blogs/${btn.dataset.id}`, { method: "DELETE" });
          showToast("تم حذف المقال بنجاح.", "info");
          await this.loadAllBlogsData();
          this.renderTab("blogs");
        } catch (err) {
          showToast(err.message || "فشل حذف المقال.", "error");
        }
      });
    });

    // Save / Update Blog Form
    this.container.querySelector("#admin-blog-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = this.container.querySelector("#admin-blog-id").value;
      const payload = {
        title: this.container.querySelector("#admin-blog-title").value.trim(),
        category: this.container.querySelector("#admin-blog-category").value.trim(),
        readTime: this.container.querySelector("#admin-blog-readtime").value.trim() || "📖 5 دقائق قراءة",
        image: this.container.querySelector("#admin-blog-image").value.trim() || undefined,
        content: this.container.querySelector("#admin-blog-content").value.trim(),
        status: this.container.querySelector("#admin-blog-status").value
      };

      try {
        if (id) {
          await apiFetch(`/blogs/${id}`, { method: "PUT", body: JSON.stringify(payload) });
          showToast("تم تحديث المقال بنجاح! 📝", "success");
        } else {
          await apiFetch("/blogs", { method: "POST", body: JSON.stringify(payload) });
          showToast("تم نشر المقال بنجاح! 🚀", "success");
        }
        blogModal.style.display = "none";
        await this.loadAllBlogsData();
        this.renderTab("blogs");
      } catch (err) {
        showToast(err.message || "حدث خطأ أثناء حفظ المقال.", "error");
      }
    });
  },

  _openAdminBlogModal(blog = null) {
    const modal = this.container.querySelector("#admin-blog-modal");
    const form = this.container.querySelector("#admin-blog-form");
    if (!modal || !form) return;

    form.reset();
    this.container.querySelector("#admin-blog-id").value = blog?.id || "";
    this.container.querySelector("#admin-blog-modal-title").textContent = blog ? "✏️ تعديل مقال المدونة" : "✍️ كتابة مقال جديد كمسؤول";
    this.container.querySelector("#save-admin-blog-btn").textContent = blog ? "حفظ التعديلات ✅" : "نشر المقال فوراً 🚀";

    const placeholder = this.container.querySelector("#admin-blog-cover-placeholder");
    const previewBox = this.container.querySelector("#admin-blog-cover-preview-box");
    const uploadingState = this.container.querySelector("#admin-blog-cover-uploading");
    const previewImg = this.container.querySelector("#admin-blog-cover-preview-img");
    const hiddenInput = this.container.querySelector("#admin-blog-image");
    const urlInput = this.container.querySelector("#admin-blog-image-url-input");
    const fileInput = this.container.querySelector("#admin-blog-cover-file");

    if (fileInput) fileInput.value = "";
    if (uploadingState) uploadingState.style.display = "none";

    const initialImage = blog?.image || "";
    if (hiddenInput) hiddenInput.value = initialImage;
    if (urlInput) urlInput.value = initialImage;

    if (initialImage) {
      if (previewImg) previewImg.src = initialImage;
      if (previewBox) previewBox.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    } else {
      if (previewImg) previewImg.src = "";
      if (previewBox) previewBox.style.display = "none";
      if (placeholder) placeholder.style.display = "flex";
    }

    if (blog) {
      this.container.querySelector("#admin-blog-title").value = blog.title || "";
      this.container.querySelector("#admin-blog-category").value = blog.category || "";
      this.container.querySelector("#admin-blog-readtime").value = blog.readTime || "📖 5 دقائق قراءة";
      this.container.querySelector("#admin-blog-content").value = blog.content || "";
      this.container.querySelector("#admin-blog-status").value = blog.status || "APPROVED";
    } else {
      this.container.querySelector("#admin-blog-status").value = "APPROVED";
      this.container.querySelector("#admin-blog-readtime").value = "📖 5 دقائق قراءة";
    }

    modal.style.display = "flex";
    if (window.lucide) window.lucide.createIcons();
  },

  async loadAllBlogsData() {
    try {
      const res = await apiFetch("/admin/blogs");
      this.allBlogs = Array.isArray(res) ? res : [];
      this.updateBadges();
    } catch (err) {
      console.error("Failed to load admin blogs:", err);
    }
  }
};
