import { apiFetch, state, showToast } from "../app.js";

export default class TeacherBlogsView {
  constructor(container) {
    this.container = container;
    this.blogs = [];
  }

  async render() {
    try {
      const allBlogs = await apiFetch("/blogs");
      this.blogs = (allBlogs || []).filter(b => b.author?.id === state.user.id);
    } catch (e) {
      this.blogs = [];
    }

    this.container.innerHTML = `
      <div style="max-width:1100px; margin:0 auto; padding:32px 24px;">

        <!-- Page Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; flex-wrap:wrap; gap:16px;">
          <div>
            <h2 style="font-size:1.8rem; font-weight:900; margin:0 0 6px 0; color:var(--text-color); display:flex; align-items:center; gap:10px;">
              <i data-lucide="newspaper" style="color:#ec4899;"></i> مقالات المدونة التربوية
            </h2>
            <p style="color:var(--text-muted); margin:0;">نشر وإدارة مقالاتك وإرشاداتك التربوية لطلاب البكالوريا</p>
          </div>
          <button class="btn-primary" id="open-blog-modal-btn" style="background:linear-gradient(135deg,#ec4899,#a855f7); border:none; padding:12px 22px; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
            <i data-lucide="plus-circle"></i> نشر مقال جديد
          </button>
        </div>

        <!-- Stats Row -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:16px; margin-bottom:32px;">
          <div class="glass-card" style="padding:20px; border-radius:16px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:2rem; font-weight:900; color:#ec4899;">${this.blogs.length}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:600; margin-top:4px;">مقال منشور</div>
          </div>
          <div class="glass-card" style="padding:20px; border-radius:16px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:2rem; font-weight:900; color:var(--primary);">${new Set(this.blogs.map(b => b.category)).size}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); font-weight:600; margin-top:4px;">تصنيف مختلف</div>
          </div>
        </div>

        <!-- Blog Cards Grid -->
        <div id="blogs-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:24px;">
          ${this._renderBlogCards()}
        </div>

        <!-- Blog Modal (Create / Edit) -->
        <div class="modal-overlay" id="blog-modal" style="display:none;">
          <div class="modal-content" style="max-width:640px;">
            <div class="modal-header">
              <h3 class="modal-title" id="blog-modal-title">✍️ كتابة مقال جديد</h3>
              <span class="modal-close-btn" id="close-blog-modal">&times;</span>
            </div>
            <form id="create-blog-form">
              <input type="hidden" id="blog-id">
              <div class="modal-body">
                <div class="form-group">
                  <label for="blog-title">عنوان المقال</label>
                  <input type="text" id="blog-title" class="form-input" placeholder="مثال: أفضل 5 طرق لتنظيم الوقت في البكالوريا" required>
                </div>
                <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div>
                    <label for="blog-category">التصنيف / الوسم</label>
                    <input type="text" id="blog-category" class="form-input" placeholder="📐 تنظيم الوقت" required>
                  </div>
                  <div>
                    <label for="blog-readtime">وقت القراءة المقدر</label>
                    <input type="text" id="blog-readtime" class="form-input" placeholder="📖 5 دقائق قراءة" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="blog-image">رابط صورة الغلاف (اختياري)</label>
                  <input type="url" id="blog-image" class="form-input" placeholder="https://images.unsplash.com/...">
                </div>
                <div class="form-group">
                  <label for="blog-content">محتوى المقال والإرشادات</label>
                  <textarea id="blog-content" class="form-input" style="height:160px; resize:vertical;" placeholder="اكتب النصائح والمنهجية هنا لطلاب البكالوريا..." required></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn-secondary" id="cancel-blog-modal">إلغاء</button>
                <button type="submit" class="btn-primary" id="save-blog-btn" style="background:linear-gradient(135deg,#ec4899,#a855f7); border:none;">نشر المقال 🚀</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this._bindEvents();
  }

  _renderBlogCards() {
    if (this.blogs.length === 0) {
      return `
        <div class="glass-card" style="text-align:center; padding:60px 24px; color:var(--text-muted); grid-column:1/-1; border-radius:20px; border:2px dashed var(--border-color);">
          <i data-lucide="newspaper" style="width:52px; height:52px; opacity:0.35; margin-bottom:16px;"></i>
          <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:8px; color:var(--text-color);">لم تنشر أي مقال بعد</h3>
          <p style="margin-bottom:20px; font-size:0.9rem;">شارك خبرتك التربوية مع طلاب البكالوريا من خلال نشر أول مقال تعليمي.</p>
          <button class="btn-primary" id="open-blog-modal-btn-empty" style="background:linear-gradient(135deg,#ec4899,#a855f7); border:none; display:inline-flex; gap:8px; align-items:center;">
            <i data-lucide="plus-circle"></i> ابدأ بكتابة مقالك الأول
          </button>
        </div>
      `;
    }

    return this.blogs.map(blog => `
      <div class="glass-card" style="border-radius:20px; border:1px solid var(--border-color); overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
        <div>
          <div style="height:160px; overflow:hidden; position:relative;">
            <img src="${blog.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600'}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            <div style="position:absolute; inset:0; background:linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5));"></div>
            <span style="position:absolute; top:12px; right:12px; background:linear-gradient(135deg,#ec4899,#a855f7); color:#fff; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:20px; box-shadow:0 2px 8px rgba(236,72,153,0.4);">${blog.category || 'عام'}</span>
          </div>
          <div style="padding:18px;">
            <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:6px; font-weight:600;">
              ${new Date(blog.createdAt).toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" })} &nbsp;•&nbsp; ${blog.readTime}
            </div>
            <h4 style="font-size:1rem; font-weight:800; color:var(--text-color); margin:0 0 8px 0; line-height:1.45;">${blog.title}</h4>
            <p style="font-size:0.83rem; color:var(--text-muted); line-height:1.6; margin:0;">${blog.content.substring(0, 120)}...</p>
          </div>
        </div>
        <div style="padding:12px 16px; border-top:1px solid var(--border-color); display:flex; gap:10px; background:rgba(0,0,0,0.02);">
          <button class="btn-secondary edit-blog-btn" data-id="${blog.id}" style="flex:1; padding:7px; font-size:0.82rem; border-color:var(--primary); color:var(--primary); justify-content:center; display:flex; align-items:center; gap:6px;">
            <i data-lucide="edit-3" style="width:14px;height:14px;"></i> تعديل
          </button>
          <button class="btn-secondary delete-blog-btn" data-id="${blog.id}" style="flex:1; padding:7px; font-size:0.82rem; border-color:var(--error); color:var(--error); justify-content:center; display:flex; align-items:center; gap:6px;">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف
          </button>
        </div>
      </div>
    `).join("");
  }

  _openModal(blog = null) {
    const modal = document.getElementById("blog-modal");
    const form = document.getElementById("create-blog-form");
    form.reset();
    document.getElementById("blog-id").value = blog?.id || "";
    document.getElementById("blog-modal-title").textContent = blog ? "✏️ تعديل مقال المدونة" : "✍️ كتابة مقال جديد";
    document.getElementById("save-blog-btn").textContent = blog ? "حفظ التعديلات ✅" : "نشر المقال 🚀";

    if (blog) {
      document.getElementById("blog-title").value = blog.title || "";
      document.getElementById("blog-category").value = blog.category || "";
      document.getElementById("blog-readtime").value = blog.readTime || "";
      document.getElementById("blog-image").value = blog.image || "";
      document.getElementById("blog-content").value = blog.content || "";
    }
    modal.style.display = "flex";
  }

  _bindEvents() {
    const modal = document.getElementById("blog-modal");

    // Open buttons
    ["open-blog-modal-btn", "open-blog-modal-btn-empty"].forEach(id => {
      document.getElementById(id)?.addEventListener("click", () => this._openModal());
    });

    // Close buttons
    document.getElementById("close-blog-modal")?.addEventListener("click", () => { modal.style.display = "none"; });
    document.getElementById("cancel-blog-modal")?.addEventListener("click", () => { modal.style.display = "none"; });

    // Form submit (Create / Update)
    document.getElementById("create-blog-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("blog-id").value;
      const payload = {
        title: document.getElementById("blog-title").value,
        category: document.getElementById("blog-category").value,
        readTime: document.getElementById("blog-readtime").value,
        image: document.getElementById("blog-image").value,
        content: document.getElementById("blog-content").value,
      };
      try {
        if (id) {
          await apiFetch(`/blogs/${id}`, { method: "PUT", body: JSON.stringify(payload) });
          showToast("تم تحديث المقال بنجاح! 📝", "success");
        } else {
          await apiFetch("/blogs", { method: "POST", body: JSON.stringify(payload) });
          showToast("تم نشر المقال بنجاح! 🚀", "success");
        }
        modal.style.display = "none";
        await this.render();
      } catch (err) {
        showToast("حدث خطأ أثناء الحفظ.", "error");
      }
    });

    // Edit buttons
    this.container.querySelectorAll(".edit-blog-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const blog = this.blogs.find(b => b.id === btn.dataset.id);
        if (blog) this._openModal(blog);
      });
    });

    // Delete buttons
    this.container.querySelectorAll(".delete-blog-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المقال؟ لا يمكن التراجع.")) return;
        try {
          await apiFetch(`/blogs/${btn.dataset.id}`, { method: "DELETE" });
          showToast("تم حذف المقال بنجاح.", "info");
          await this.render();
        } catch (err) {
          showToast("فشل حذف المقال.", "error");
        }
      });
    });
  }

  onDestroy() {}
}
