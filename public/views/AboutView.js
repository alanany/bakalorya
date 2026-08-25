import { state, t } from "../app.js";

export default class AboutView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1200px; margin:0 auto; padding:40px 24px 80px; display:flex; flex-direction:column; gap:40px;">
        
        <!-- Hero Header -->
        <div class="glass-card" style="padding:48px 36px; border-radius:28px; border:1px solid var(--border-color); background:linear-gradient(135deg, rgba(0,86,210,0.08) 0%, rgba(99,102,241,0.04) 100%); text-align:center;">
          <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,86,210,0.12); color:var(--primary); font-size:0.8rem; font-weight:800; padding:6px 18px; border-radius:30px; margin-bottom:16px;">
            <i data-lucide="info" style="width:14px; height:14px;"></i> عن منصة انطلق
          </div>
          <h1 style="font-size:2.4rem; font-weight:900; color:var(--text-color); margin:0 0 16px 0; line-height:1.25;">
            رائدون في تمكين الطلاب والمعلمين بأحدث تقنيات التعليم الرقمي 🚀
          </h1>
          <p style="font-size:1.05rem; color:var(--text-muted); max-width:760px; margin:0 auto; line-height:1.7;">
            منصة "انطلق" هي المنصة التعليمية التفاعلية الأولى المصممة لمواكبة متطلبات المناهج التعليمية الحديثة من الابتدائية حتى الثانوية والأزهر الشريف، وتقديم تجربة تعلم استثنائية وبث مباشر تفاعلي مع نخبة كبار الأساتذة.
          </p>
        </div>

        <!-- Platform Stats -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px;">
          <div class="glass-card" style="padding:28px; border-radius:20px; border:1px solid var(--border-color); text-align:center;">
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(0,86,210,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 14px auto;">
              <i data-lucide="users" style="width:26px; height:26px;"></i>
            </div>
            <div style="font-size:2rem; font-weight:900; color:var(--text-color); margin-bottom:4px;">+50,000</div>
            <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700;">طالب وطالبة مسجلون بالمنصة</div>
          </div>

          <div class="glass-card" style="padding:28px; border-radius:20px; border:1px solid var(--border-color); text-align:center;">
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 14px auto;">
              <i data-lucide="graduation-cap" style="width:26px; height:26px;"></i>
            </div>
            <div style="font-size:2rem; font-weight:900; color:var(--text-color); margin-bottom:4px;">+250</div>
            <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700;">معلم وأستاذ معتمد</div>
          </div>

          <div class="glass-card" style="padding:28px; border-radius:20px; border:1px solid var(--border-color); text-align:center;">
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(245,158,11,0.1); color:#f59e0b; display:flex; align-items:center; justify-content:center; margin:0 auto 14px auto;">
              <i data-lucide="book-open" style="width:26px; height:26px;"></i>
            </div>
            <div style="font-size:2rem; font-weight:900; color:var(--text-color); margin-bottom:4px;">+1,200</div>
            <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700;">دورة تعليمية وملخص مجاني</div>
          </div>

          <div class="glass-card" style="padding:28px; border-radius:20px; border:1px solid var(--border-color); text-align:center;">
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(236,72,153,0.1); color:#ec4899; display:flex; align-items:center; justify-content:center; margin:0 auto 14px auto;">
              <i data-lucide="award" style="width:26px; height:26px;"></i>
            </div>
            <div style="font-size:2rem; font-weight:900; color:var(--text-color); margin-bottom:4px;">91%</div>
            <div style="font-size:0.88rem; color:var(--text-muted); font-weight:700;">نسبة النجاح والتفوق الأكاديمي</div>
          </div>
        </div>

        <!-- Vision and Mission -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">
          <div class="glass-card" style="padding:32px; border-radius:24px; border:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
              <div style="width:44px; height:44px; border-radius:12px; background:rgba(0,86,210,0.1); color:var(--primary); display:flex; align-items:center; justify-content:center;">
                <i data-lucide="compass" style="width:22px; height:22px;"></i>
              </div>
              <h3 style="font-size:1.3rem; font-weight:900; color:var(--text-color); margin:0;">رؤيتنا</h3>
            </div>
            <p style="font-size:0.92rem; color:var(--text-muted); line-height:1.7; margin:0;">
              بناء جيل واعٍ ومتفوق أكاديمياً من خلال إتاحة فرص تعلم عادلة وراقية لجميع الطلاب في مختلف الولايات والمحافظات، والربط بين المعلم المتميز والطالب الشغوف للتفوق.
            </p>
          </div>

          <div class="glass-card" style="padding:32px; border-radius:24px; border:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
              <div style="width:44px; height:44px; border-radius:12px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center;">
                <i data-lucide="target" style="width:22px; height:22px;"></i>
              </div>
              <h3 style="font-size:1.3rem; font-weight:900; color:var(--text-color); margin:0;">رسالتنا</h3>
            </div>
            <p style="font-size:0.92rem; color:var(--text-muted); line-height:1.7; margin:0;">
              تقديم حلول تعليم رقمية متكاملة تشتمل على دروس الفيديو المباشرة والمجهزة، البث المباشر التفاعلي، سلاسل التمارين المحلولة، والامتحانات الذكية لتسهيل المذاكرة والوصول لأعلى الدرجات.
            </p>
          </div>
        </div>

        <!-- Core Values -->
        <div>
          <h2 style="font-size:1.6rem; font-weight:900; color:var(--text-color); margin:0 0 20px 0; text-align:center;">قيمنا الجوهرية ✨</h2>
          
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:20px;">
            <div class="glass-card" style="padding:24px; border-radius:18px; border:1px solid var(--border-color);">
              <h4 style="font-size:1.05rem; font-weight:800; color:var(--primary); margin:0 0 8px 0;">🎯 الجودة والاحترافية</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">اختيار دقيق للمناهج والمعلمين لضمان تقديم مادة علمية موثوقة ومبسطة.</p>
            </div>

            <div class="glass-card" style="padding:24px; border-radius:18px; border:1px solid var(--border-color);">
              <h4 style="font-size:1.05rem; font-weight:800; color:#10b981; margin:0 0 8px 0;">💡 التفاعل والابتكار</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">دمج التقنيات التفاعلية والبث المباشر المباشر لتوفير تجربة دراسية ممتعة ومستمرة.</p>
            </div>

            <div class="glass-card" style="padding:24px; border-radius:18px; border:1px solid var(--border-color);">
              <h4 style="font-size:1.05rem; font-weight:800; color:#f59e0b; margin:0 0 8px 0;">🤝 الشفافية والدعم</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">تقديم دعم متواصل للطلاب وأولياء الأمور والمعلمين طوال العام الدراسي.</p>
            </div>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  onDestroy() {}
}
