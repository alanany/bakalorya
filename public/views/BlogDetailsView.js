import { apiFetch, state, t } from "../app.js";

export default class BlogDetailsView {
  constructor(container, blogId) {
    this.container = container;
    this.blogId = blogId;
    this.blog = null;
    this.allBlogs = [];
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:900px; margin:0 auto; padding:40px 24px 80px;">
        <div style="text-align:center; padding:60px; color:var(--text-muted);">
          <div class="spinner" style="margin:0 auto 16px;"></div>
          <p>جارٍ تحميل المقال...</p>
        </div>
      </div>
    `;

    try {
      const [blog, allBlogs] = await Promise.all([
        apiFetch(`/blogs/${this.blogId}`),
        apiFetch(`/blogs`)
      ]);

      if (!blog || blog.error) {
        this.renderNotFound();
        return;
      }

      this.blog = blog;
      this.allBlogs = Array.isArray(allBlogs) ? allBlogs.filter(b => b.id !== this.blogId) : [];

      this.renderContent();
    } catch (err) {
      console.error("Error loading blog details:", err);
      this.renderNotFound();
    }
  }

  renderNotFound() {
    this.container.innerHTML = `
      <div style="max-width:600px; margin:80px auto; text-align:center; padding:40px;">
        <div style="font-size:4rem; margin-bottom:16px;">📰</div>
        <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:12px;">المقال غير موجود</h2>
        <p style="color:var(--text-muted); margin-bottom:24px;">عذراً، لم نتمكن من العثور على المقال المطلوبة أو قد تم إزالته.</p>
        <a href="#landing" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none;">
          <i data-lucide="arrow-right"></i> العودة للصفحة الرئيسية
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  renderContent() {
    const b = this.blog;
    const authorName = b.author?.name || "فريق المنصة";
    const authorAvatar = b.author?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${authorName}`;
    const pubDate = new Date(b.createdAt).toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" });
    const formattedContent = b.content ? b.content.split('\n\n').map(p => `<p style="line-height:1.9; font-size:1.1rem; color:var(--text-color); margin-bottom:20px;">${p.trim()}</p>`).join('') : '';

    this.container.innerHTML = `
      <div style="width:100%; max-width:1400px; margin:0 auto; padding:32px 32px 80px;">
        <!-- Top Navigation / Breadcrumb -->
        <div style="margin-bottom:28px; display:flex; align-items:center; justify-content:space-between;">
          <a href="#landing" class="btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; font-size:0.9rem; padding:8px 16px; border-radius:30px;">
            <i data-lucide="arrow-right"></i> العودة للمقالات
          </a>
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">قسم المقالات والتربية</span>
        </div>

        <!-- Article Header Card -->
        <article class="glass-card" style="border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); box-shadow:0 12px 40px rgba(0,0,0,0.15);">
          <!-- Featured Hero Image -->
          <div style="position:relative; width:100%; height:380px; overflow:hidden; background:var(--bg-app);">
            <img src="${b.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200'}" alt="${b.title}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%);"></div>
            
            <div style="position:absolute; bottom:28px; right:28px; left:28px;">
              <span style="background:var(--primary); color:#fff; font-size:0.8rem; font-weight:800; padding:6px 14px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; display:inline-block; margin-bottom:12px;">
                ${b.category || 'توجيه وإرشاد'}
              </span>
              <h1 style="color:#fff; font-size:2rem; font-weight:900; line-height:1.35; margin:0 0 12px 0; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
                ${b.title}
              </h1>
            </div>
          </div>

          <!-- Author Info & Metadata Bar -->
          <div style="padding:20px 32px; background:var(--bg-card); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${authorAvatar}" style="width:46px; height:46px; border-radius:50%; border:2px solid var(--primary);">
              <div>
                <h4 style="font-size:0.95rem; font-weight:700; margin:0 0 2px 0;">${authorName}</h4>
                <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">أستاذ ومؤطر بمنصة باكالوريا</p>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:20px; font-size:0.85rem; color:var(--text-muted);">
              <span style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="calendar" style="width:16px; height:16px; color:var(--primary);"></i> ${pubDate}
              </span>
              <span style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="clock" style="width:16px; height:16px; color:var(--accent);"></i> ${b.readTime || '5 دقائق قراءة'}
              </span>
            </div>
          </div>

          <!-- Main Article Body -->
          <div style="padding:36px; background:var(--bg-card);">
            ${formattedContent}
          </div>
        </article>

        <!-- More Articles / اقرأ أيضاً -->
        ${this.allBlogs.length > 0 ? `
          <div style="margin-top:50px;">
            <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:24px; display:flex; align-items:center; gap:10px;">
              <i data-lucide="sparkles" style="color:var(--primary);"></i> مقالات أخرى قد تهمك
            </h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:20px;">
              ${this.allBlogs.slice(0, 3).map(item => `
                <div class="glass-card course-card" style="border-radius:18px; overflow:hidden; padding:0; display:flex; flex-direction:column; justify-content:space-between;">
                  <div style="position:relative; height:160px; overflow:hidden;">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500'}" style="width:100%; height:100%; object-fit:cover;">
                    <span style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); color:#fff; font-size:0.72rem; font-weight:700; padding:4px 10px; border-radius:12px;">
                      ${item.category}
                    </span>
                  </div>
                  <div style="padding:16px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                      <h4 style="font-size:0.95rem; font-weight:800; line-height:1.4; margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${item.title}
                      </h4>
                      <p style="font-size:0.8rem; color:var(--text-muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:14px;">
                        ${item.content}
                      </p>
                    </div>
                    <a href="#blog/${item.id}" class="btn-secondary" style="text-decoration:none; justify-content:center; padding:8px; font-size:0.8rem; border-color:var(--primary); color:var(--primary);">
                      قراءة المقال كاملًا
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  onDestroy() {}
}
