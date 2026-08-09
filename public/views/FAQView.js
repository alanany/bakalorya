import { state, t } from "../app.js";

export default class FAQView {
  constructor(container) {
    this.container = container;
    this.currentCategory = "all";
    this.searchQuery = "";

    this.faqs = [
      {
        category: "courses",
        question: "كيف يمكنني التسجيل والانضمام في إحدى الدورات التعليمية؟",
        answer: "يمكنك تصفح دليل الدورات من علامة التبويب 'الدورات'، ثم اختيار الدورة والنقر على 'طلب الانضمام للدورة'. سيتم إرسال الطلب للمعلم للموافقة وتفعيل حسابك فوراً."
      },
      {
        category: "courses",
        question: "هل يمكنني إلغاء التسجيل أو تغيير الدورة لاحقاً؟",
        answer: "نعم، يمكنك التواصل مع الدعم الفني أو المعلم لمراجعة حالة تسجيلك وإتاحة تغيير الدورة أو التخصص الدراسي في أي وقت."
      },
      {
        category: "live",
        question: "كيف يمكنني حضور جلسات البث المباشر التفاعلي؟",
        answer: "ستظهر الجلسات المبرمجة في جدولك وفي صفحة 'البث المباشر'. عند بدء البث من قبل الأستاذ، سيظهر زر 'دخول القاعة الافتراضية' مباشرة."
      },
      {
        category: "live",
        question: "ماذا يحدث إذا فاتتني حصة بث مباشر؟",
        answer: "جميع حصص البث المباشر يتم تسجيلها تلقائياً وأرشفتها داخل صفحة الدورة لتتمكن من مراجعتها في أي وقت وبعدد لا محدود من المرات."
      },
      {
        category: "teachers",
        question: "كيف يمكن للمعلمين والمؤسسات الانضمام لطاقم التدريس بالمنصة؟",
        answer: "يمكن للمدرسين والمؤسسات النقر على زر 'للمعلمين والمدارس' في أعلى الصفحة وتعبئة نموذج التقديم. يتم مراجعة الطلب من قِبل إدارة المنصة والتواصل معكم لتفعيل حساب الأستاذ."
      },
      {
        category: "teachers",
        question: "هل توفر المنصة أدوات لرفع المذكرات وإنشاء الاختبارات؟",
        answer: "بالتأكيد، توفر لوحة المعلم إمكانية رفع الملفات والموارد (PDF، صور، روابط Drive)، إنشاء التكليفات والواجبات المنزلية، وتصميم الاختبارات التفاعلية."
      },
      {
        category: "general",
        question: "هل تعمل المنصة على الهواتف والأجهزة اللوحية؟",
        answer: "نعم، المنصة متوافقة كلياً مع جميع الشاشات والأجهزة (الهواتف الذكية، الأجهزة اللوحية، وأجهزة الكمبيوتر) لتضمن لك تجربة دراسة مريحة في أي مكان."
      },
      {
        category: "general",
        question: "كيف أستطيع التواصل مع خدمة العملاء في حال واجهتني مشكلة؟",
        answer: "يمكنك التواصل معنا فورياً عبر زر الدعم المباشر على الواتساب، أو عبر صفحة 'تواصل معنا' أو إرسال بريد إلكتروني إلى support@bakalorya.com."
      }
    ];
  }

  async render() {
    this.container.innerHTML = `
      <div style="max-width:1100px; margin:0 auto; padding:40px 24px 80px; display:flex; flex-direction:column; gap:32px;">
        
        <!-- Header -->
        <div style="text-align:center;">
          <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,86,210,0.12); color:var(--primary); font-size:0.8rem; font-weight:800; padding:6px 18px; border-radius:30px; margin-bottom:14px;">
            <i data-lucide="help-circle" style="width:14px; height:14px;"></i> الأسئلة الشائعة والمتكررة
          </div>
          <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-color); margin:0 0 10px 0;">كل ما تحتاج معرفته عن منصة بكالوريا ❓</h1>
          <p style="font-size:0.98rem; color:var(--text-muted); max-width:620px; margin:0 auto; line-height:1.6;">
            استكشف إجابات أهم الأسئلة حول طرق التسجيل، جلسات البث المباشر، أدوات المعلمين والاشتراكات.
          </p>
        </div>

        <!-- Search Bar & Filters -->
        <div class="glass-card" style="padding:24px; border-radius:24px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:20px;">
          <!-- Search Box -->
          <div style="position:relative; width:100%; max-width:600px; margin:0 auto;">
            <input type="text" id="faq-search-input" placeholder="ابحث في الأسئلة الشائعة (مثال: بث مباشر، تسجيل، معلم)..." style="width:100%; padding:14px 44px 14px 18px; border-radius:30px; border:1.5px solid var(--border-color); background:var(--bg-app); font-size:0.92rem; font-family:inherit; color:var(--text-color); outline:none;">
            <i data-lucide="search" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); width:18px; height:18px; color:var(--text-muted);"></i>
          </div>

          <!-- Category Filter Pills -->
          <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
            <button class="faq-category-btn active" data-cat="all" style="padding:8px 20px; font-size:0.85rem; font-weight:800; border-radius:30px; border:none; cursor:pointer; background:var(--primary); color:#fff;">
              جميع الأسئلة
            </button>
            <button class="faq-category-btn" data-cat="courses" style="padding:8px 20px; font-size:0.85rem; font-weight:800; border-radius:30px; border:none; cursor:pointer; background:var(--bg-app); color:var(--text-muted); border:1px solid var(--border-color);">
              التسجيل والدورات
            </button>
            <button class="faq-category-btn" data-cat="live" style="padding:8px 20px; font-size:0.85rem; font-weight:800; border-radius:30px; border:none; cursor:pointer; background:var(--bg-app); color:var(--text-muted); border:1px solid var(--border-color);">
              البث المباشر والمحتوى
            </button>
            <button class="faq-category-btn" data-cat="teachers" style="padding:8px 20px; font-size:0.85rem; font-weight:800; border-radius:30px; border:none; cursor:pointer; background:var(--bg-app); color:var(--text-muted); border:1px solid var(--border-color);">
              المعلمون والمؤسسات
            </button>
            <button class="faq-category-btn" data-cat="general" style="padding:8px 20px; font-size:0.85rem; font-weight:800; border-radius:30px; border:none; cursor:pointer; background:var(--bg-app); color:var(--text-muted); border:1px solid var(--border-color);">
              عام والدعم الفني
            </button>
          </div>
        </div>

        <!-- Accordion Container -->
        <div id="faq-accordion-container" style="display:flex; flex-direction:column; gap:14px;">
          <!-- Injected via JavaScript -->
        </div>

        <!-- Still have questions banner -->
        <div class="glass-card" style="padding:32px; border-radius:24px; border:1px solid var(--border-color); text-align:center; background:linear-gradient(135deg, rgba(0,86,210,0.06) 0%, rgba(99,102,241,0.04) 100%); display:flex; flex-direction:column; align-items:center; gap:14px; margin-top:20px;">
          <h3 style="font-size:1.25rem; font-weight:900; color:var(--text-color); margin:0;">لم تجد الإجابة التي تبحث عنها؟</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); margin:0;">فريق الدعم الفني متواجد لمساعدتك والإجابة عن كافة استفساراتك فوراً.</p>
          <a href="#contact" class="btn-primary" style="padding:10px 24px; font-size:0.88rem; font-weight:800; border-radius:30px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
            تواصل مع خدمة العملاء <i data-lucide="arrow-left" style="width:16px; height:16px;"></i>
          </a>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents();
    this.renderAccordion();
  }

  bindEvents() {
    const searchInput = this.container.querySelector("#faq-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderAccordion();
    });

    this.container.querySelectorAll(".faq-category-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.container.querySelectorAll(".faq-category-btn").forEach(b => {
          b.style.background = "var(--bg-app)";
          b.style.color = "var(--text-muted)";
          b.style.border = "1px solid var(--border-color)";
        });
        btn.style.background = "var(--primary)";
        btn.style.color = "#fff";
        btn.style.border = "none";
        this.currentCategory = btn.getAttribute("data-cat");
        this.renderAccordion();
      });
    });
  }

  renderAccordion() {
    const container = this.container.querySelector("#faq-accordion-container");
    if (!container) return;

    let filtered = this.faqs;
    if (this.currentCategory !== "all") {
      filtered = filtered.filter(f => f.category === this.currentCategory);
    }
    if (this.searchQuery) {
      filtered = filtered.filter(f => 
        f.question.toLowerCase().includes(this.searchQuery) ||
        f.answer.toLowerCase().includes(this.searchQuery)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:50px 20px; color:var(--text-muted);">
          <i data-lucide="help-circle" style="width:42px; height:42px; opacity:0.3; margin-bottom:10px;"></i>
          <p style="font-weight:700; margin:0;">لم نجد أي أسئلة مطابقة للبحث.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map((faq, idx) => `
      <div class="glass-card faq-item-card" style="border:1px solid var(--border-color); border-radius:16px; overflow:hidden; transition:all 0.2s ease;">
        <div class="faq-header-toggle" style="padding:18px 24px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:800; font-size:0.98rem; color:var(--text-color);">
          <span style="display:flex; align-items:center; gap:10px;">
            <span style="color:var(--primary); font-weight:900;">س${idx + 1}.</span> ${faq.question}
          </span>
          <i data-lucide="chevron-down" class="faq-toggle-icon" style="transition:transform 0.3s ease; width:18px; height:18px; color:var(--text-muted); flex-shrink:0;"></i>
        </div>
        <div class="faq-answer-body" style="display:none; padding:0 24px 20px 24px; font-size:0.9rem; color:var(--text-muted); line-height:1.6; border-top:1px dashed var(--border-color); padding-top:14px; margin-top:0;">
          ${faq.answer}
        </div>
      </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();

    // Accordion Toggle Behavior
    container.querySelectorAll(".faq-header-toggle").forEach(header => {
      header.addEventListener("click", () => {
        const itemCard = header.closest(".faq-item-card");
        const body = itemCard.querySelector(".faq-answer-body");
        const icon = itemCard.querySelector(".faq-toggle-icon");

        const isOpen = body.style.display === "block";

        container.querySelectorAll(".faq-answer-body").forEach(b => b.style.display = "none");
        container.querySelectorAll(".faq-toggle-icon").forEach(i => i.style.transform = "rotate(0deg)");

        if (!isOpen) {
          body.style.display = "block";
          icon.style.transform = "rotate(180deg)";
        }
      });
    });
  }

  onDestroy() {}
}
