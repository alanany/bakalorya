// SEO Manager for Entlq / Bakalorya Single Page Application (SPA)
// Dynamically updates Title, Meta Tags, OpenGraph, Twitter Cards, and Structured Data on every route transition.

export const BASE_URL = "https://www.entlqedu.com";
export const DEFAULT_OG_IMAGE = `${BASE_URL}/assets/logo.png`;

export const SEO_CONFIG = {
  "#landing": {
    title: "منصة انطلق | بوابة التعليم الإلكتروني التفاعلي والمناهج الدراسية",
    description: "منصة انطلق التعليمية الرائدة: دورات تفاعلية، حصص بث مباشر مع نخبة من أفضل المعلمين المعتمدين، ومجموعات دراسية مخصصة لجميع المراحل (الابتدائية، الإعدادية، والثانوية العامة).",
    keywords: "منصة انطلق, تعليم إلكتروني, ثانوية عامة, مناهج مصرية, حصص تفاعلية, دروس خصوصية, شرح مواد, فيزياء, كيمياء, لغة عربية, رياضيات, بكالوريا, معلمين مصر, دورات أونلاين",
    type: "website",
    isPublic: true
  },
  "#courses": {
    title: "المقررات والمناهج الدراسية المعتمدة | منصة انطلق",
    description: "استكشف كافة المقررات والمناهج الدراسية المعتمدة لسنوات النقل والشهادات العامة (الابتدائية، الإعدادية، والثانوية العامة) مع نخبة الأساتذة المتميزين في مصر.",
    keywords: "مقررات دراسية, مناهج تعليمية, كورسات أونلاين, ثانوية عامة, إعدادي, ابتدائي, انطلق, دورات تعليمية مصر",
    type: "website",
    isPublic: true
  },
  "#teachers": {
    title: "كادر المعلمين والخبراء التربويين | منصة انطلق",
    description: "تعرف على أفضل المدرسين والخبراء التربويين المعتمدين في كافة المواد والتخصصات الدراسية، واستعرض تقييماتهم واحجز حصصك التفاعلية المباشرة.",
    keywords: "معلمين مصر, مدرسين ثانوية عامة, دروس خصوصية, حصص فردية, نخبة الأساتذة, مدرس لغة عربية, مدرس فيزياء, انطلق",
    type: "website",
    isPublic: true
  },
  "#teacher": {
    title: "الملف الأكاديمي للمعلم | منصة انطلق",
    description: "استعرض السيرة الذاتية للمعلم، المقررات والمجموعات الدراسية المتاحة، ومواعيد الحصص المباشرة والتقييمات على منصة انطلق.",
    keywords: "معلم معتمد, تقييم المدرس, حجز حصة تفاعلية, منصة انطلق",
    type: "profile",
    isPublic: true
  },
  "#subscription-plans": {
    title: "باقات الاشتراك وحصص البث المباشر | منصة انطلق",
    description: "اختر باقة الاشتراك المناسبة لك لحضور الحصص التفاعلية المباشرة والمجموعات التعليمية بأسعار متميزة وخيارات دفع إلكترونية آمنة ومتعددة.",
    keywords: "اشتراكات الحصص, باقات تعليمية, حصص مباشرة, اشتراك شهري, منصة انطلق",
    type: "website",
    isPublic: true
  },
  "#subject-groups": {
    title: "المجموعات الدراسية وحصص البث المباشر | منصة انطلق",
    description: "انضم لمجموعتك الدراسية التفاعلية مع نخبة المعلمين وتفاعل صوتاً وصورة في قاعات بث تفاعلية ذكية مصممة لضمان أعلى درجات الفهم والاستيعاب.",
    keywords: "مجموعات دراسية, بث مباشر تعليمي, فصول افتراضية, منصة انطلق",
    type: "website",
    isPublic: true
  },
  "#course-details": {
    title: "تفاصيل المقرر الدراسي والمحتوى التعليمي | منصة انطلق",
    description: "تعرف على محتويات المقرر، أهداف المنهج، الوحدات والدروس المقررة، جدول الحصص، وأستاذ المادة عبر منصة انطلق.",
    keywords: "تفاصيل الكورس, محتوى المنهج, دروس المادة, وحدات دراسية, منصة انطلق",
    type: "article",
    isPublic: true
  },
  "#course-preview": {
    title: "معاينة المقرر والخطة التدريسية | منصة انطلق",
    description: "معاينة شاملة لمحتوى المقرر الدراسي والوحدات والدروس قبل الاشتراك.",
    type: "article",
    isPublic: true
  },
  "#about": {
    title: "عن منصة انطلق | رؤيتنا في ريادة التعليم التفاعلي",
    description: "تعرف على رسالة ورؤية منصة انطلق في تمكين الطلاب والمعلمين في مصر والوطن العربي من خلال تجربة تعليمية ذكية، تفاعلية، وشاملة.",
    keywords: "عن المنصة, رؤية انطلق, منصة تعليمية عربية, من نحن",
    type: "website",
    isPublic: true
  },
  "#contact": {
    title: "تواصل معنا | مركز الدعم وخدمة الطلاب وأولياء الأمور",
    description: "فريق دعم منصة انطلق جاهز للرد على استفسارات الطلاب وأولياء الأمور والمعلمين عبر قنوات الدعم المباشرة والواتساب على مدار الساعة.",
    keywords: "اتصل بنا, دعم انطلق, خدمة العملاء, رقم واتساب انطلق",
    type: "website",
    isPublic: true
  },
  "#faq": {
    title: "الأسئلة الشائعة | كل ما تحتاج معرفته عن منصة انطلق",
    description: "إجابات وافية وشاملة عن كل ما يخص التسجيل في المنصة، حجز الحصص المباشرة، خطط الاشتراكات، طرق الدفع المعتمدة، وشروط الانضمام كمعلم.",
    keywords: "الأسئلة الشائعة, استفسارات التعليم, كيفية التسجيل, منصة انطلق",
    type: "website",
    isPublic: true
  },
  "#search": {
    title: "البحث الذكي في المقررات والمعلمين | منصة انطلق",
    description: "ابحث عن المقررات والمناهج والأساتذة والمجموعات المتاحة حسب مرحلتك الدراسية ومادتك المفضلة.",
    keywords: "بحث المقررات, البحث عن معلم, منصة انطلق",
    type: "website",
    isPublic: true
  },
  "#login": {
    title: "تسجيل الدخول | منصة انطلق",
    description: "سجل دخولك إلى حسابك في منصة انطلق لمتابعة دروسك المباشرة، واجباتك، ومجموعاتك التعليمية.",
    type: "website",
    isPublic: true
  },
  "#signup": {
    title: "إنشاء حساب جديد مجاناً | انضم لمنصة انطلق",
    description: "أنشئ حسابك مجاناً الآن كطالب أو معلم وابدأ رحلة التفوق الأكاديمي مع أقوى المناهج التعليمية ونخبة المدرسين.",
    type: "website",
    isPublic: true
  },
  "#teacher-apply": {
    title: "انضم إلينا كمعلم معتمد | منصة انطلق",
    description: "فرصة متميزة للمعلمين المتميزين لتقديم حصصهم ومجموعاتهم التعليمية لآلاف الطلاب في جميع أنحاء مصر والوطن العربي.",
    keywords: "وظائف معلمين, تدريس أونلاين, انضمام معلم, منصة انطلق",
    type: "website",
    isPublic: true
  },
  // Private / Authenticated Dashboard routes (Marked with noindex)
  "#student-dashboard": {
    title: "لوحة تحكم الطالب | مساحتي التعليمية الذكية",
    description: "متابعة الحصص المباشرة، الواجبات، الكورسات المقترحة لصفك الدراسي، والمجموعات التعليمية.",
    isPublic: false
  },
  "#student-groups": {
    title: "مجموعاتي الدراسية | منصة انطلق",
    description: "استعراض مجموعاتك الدراسية وحصص البث المباشر القادمة.",
    isPublic: false
  },
  "#student-subscriptions": {
    title: "اشتراكاتي وباقاتي | منصة انطلق",
    description: "إدارة رصيد الحصص وباقات الاشتراكات الخاصة بك.",
    isPublic: false
  },
  "#teacher-portal": {
    title: "بوابة المعلم | إدارة المقررات والطلاب",
    description: "لوحة المعلم لإدارة المقررات التعليمية، المجموعات، الحصص المباشرة، ومتابعة الواجبات.",
    isPublic: false
  },
  "#admin-dashboard": {
    title: "لوحة التحكم الإدارية | منصة انطلق",
    description: "إدارة المنصة، المستخدمين، المقررات، والجلسات التعليمية.",
    isPublic: false
  },
  "#settings": {
    title: "إعدادات الحساب | منصة انطلق",
    description: "تعديل البيانات الشخصية، الصف والمرحلة الدراسية، وكلمة المرور.",
    isPublic: false
  }
};

/**
 * Updates DOM title, meta tags, OpenGraph, Twitter card, and canonical link
 * @param {string} routeBase Current route hash base (e.g. '#courses', '#landing')
 * @param {string|null} routeParam Optional route parameter (e.g. course ID)
 */
export function applyPageSEO(routeBase, routeParam = null) {
  try {
    const cleanRoute = (routeBase || "#landing").toLowerCase().trim();
    const config = SEO_CONFIG[cleanRoute] || SEO_CONFIG["#landing"];

    // 1. Update Title
    const finalTitle = config.title || "منصة انطلق | بوابة التعليم الإلكتروني التفاعلي";
    document.title = finalTitle;

    // Helper to safely set meta attribute
    const setMeta = (selector, attr, value) => {
      if (!value) return;
      let el = document.querySelector(selector);
      if (el) {
        el.setAttribute(attr, value);
      }
    };

    // 2. Standard Meta Tags
    setMeta('meta[name="title"]', 'content', finalTitle);
    setMeta('meta[name="description"]', 'content', config.description || SEO_CONFIG["#landing"].description);
    if (config.keywords) {
      setMeta('meta[name="keywords"]', 'content', config.keywords);
    }

    // 3. Robots meta (Public pages get index, follow; Private get noindex, nofollow)
    const robotsContent = config.isPublic
      ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      : "noindex, nofollow";
    setMeta('meta[name="robots"]', 'content', robotsContent);

    // 4. Canonical URL & OpenGraph URL
    const currentUrl = `${BASE_URL}/${window.location.hash || ""}`;
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute("href", currentUrl);
    }

    // 5. OpenGraph Tags
    setMeta('meta[property="og:title"]', 'content', finalTitle);
    setMeta('meta[property="og:description"]', 'content', config.description || SEO_CONFIG["#landing"].description);
    setMeta('meta[property="og:url"]', 'content', currentUrl);
    setMeta('meta[property="og:type"]', 'content', config.type || "website");
    setMeta('meta[property="og:image"]', 'content', config.image || DEFAULT_OG_IMAGE);

    // 6. Twitter Card Tags
    setMeta('meta[name="twitter:title"]', 'content', finalTitle);
    setMeta('meta[name="twitter:description"]', 'content', config.description || SEO_CONFIG["#landing"].description);
    setMeta('meta[name="twitter:url"]', 'content', currentUrl);
    setMeta('meta[name="twitter:image"]', 'content', config.image || DEFAULT_OG_IMAGE);

    // 7. Dynamic Breadcrumb Schema for SEO rich results
    updateBreadcrumbSchema(cleanRoute, finalTitle);

  } catch (err) {
    console.warn("SEO update notice:", err);
  }
}

/**
 * Updates dynamic JSON-LD BreadcrumbList in the DOM
 */
function updateBreadcrumbSchema(route, title) {
  let breadcrumbScript = document.getElementById("schema-org-breadcrumb");
  if (!breadcrumbScript) {
    breadcrumbScript = document.createElement("script");
    breadcrumbScript.type = "application/ld+json";
    breadcrumbScript.id = "schema-org-breadcrumb";
    document.head.appendChild(breadcrumbScript);
  }

  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "الرئيسية",
      "item": `${BASE_URL}/#landing`
    }
  ];

  if (route && route !== "#landing" && route !== "") {
    items.push({
      "@type": "ListItem",
      "position": 2,
      "name": title.split("|")[0].trim(),
      "item": `${BASE_URL}/${route}`
    });
  }

  breadcrumbScript.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  });
}
