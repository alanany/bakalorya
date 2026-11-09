import { state, t, apiFetch, showToast } from "../app.js";

export default class ClassDetailsView {
    constructor(container, routeParam) {
        this.container = container;
        this.routeParam = routeParam || "";

        // Parse query parameters from hash or routeParam
        const hash = window.location.hash || "";
        const queryStr = hash.includes("?") ? hash.split("?")[1] : (routeParam?.includes("?") ? routeParam.split("?")[1] : "");
        const params = new URLSearchParams(queryStr);

        this.classId = params.get("id") || params.get("classId");
        this.stageKey = params.get("stage") || "primary";
        this.stageName = params.get("stageName") || (this.stageKey === "secondary" ? "المرحلة الثانوية" : (this.stageKey === "middle" ? "المرحلة الإعدادية" : "المرحلة الابتدائية"));
        this.gradeName = params.get("grade") || "الصف الرابع الابتدائي";
        this.roomName = params.get("room") || "فصل المتفوقين (باقة مجمعة)";
        this.price = params.get("price") || "500 ريال";
        this.priceEg = params.get("priceEg") || "150 جنيه";
        this.lessonsCount = params.get("lessonsCount") || "64 حصة";
        this.description = null;
        this.features = null;

        // جدول مواعيد الأيام الستة من محتوى الـ HTML المرفق
        this.weeklySchedule = [
            {
                day: "السبت",
                items: [
                    { subject: "الرياضيات", time: "7:00 - 8:00 مساءً", duration: "40 دقيقة" }
                ]
            },
            {
                day: "الأحد",
                items: [
                    { subject: "اللغة العربية", time: "5:00 - 6:00 م", duration: "40 دقيقة" },
                    { subject: "العلوم", time: "8:00 - 9:00 م", duration: "40 دقيقة" }
                ]
            },
            {
                day: "الاثنين",
                items: [
                    { subject: "اللغة الإنجليزية", time: "6:00 - 7:00 مساءً", duration: "40 دقيقة" }
                ]
            },
            {
                day: "الثلاثاء",
                items: [
                    { subject: "اللغة العربية", time: "5:00 - 6:00 مساءً", duration: "40 دقيقة" }
                ]
            },
            {
                day: "الأربعاء",
                items: [
                    { subject: "اللغة الإنجليزية", time: "6:00 - 7:00 م", duration: "40 دقيقة" },
                    { subject: "العلوم", time: "8:00 - 9:00 م", duration: "40 دقيقة" }
                ]
            },
            {
                day: "الخميس",
                items: [
                    { subject: "الرياضيات", time: "7:00 - 8:00 مساءً", duration: "40 دقيقة" }
                ]
            }
        ];
    }

    async render() {
        if (this.classId) {
            try {
                const res = await fetch(`/api/curriculum/classes/${encodeURIComponent(this.classId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        this.classData = data;
                        if (data.name) this.roomName = data.name;
                        if (data.grade?.name) this.gradeName = data.grade.name;
                        if (data.grade?.stage) {
                            this.stageKey = data.grade.stage;
                            this.stageName = (data.grade.stage === "secondary" ? "المرحلة الثانوية" : (data.grade.stage === "middle" ? "المرحلة الإعدادية" : "المرحلة الابتدائية"));
                        }
                        if (data.price) this.price = data.price;
                        if (data.priceEg) this.priceEg = data.priceEg;
                        if (data.lessonsCount) this.lessonsCount = data.lessonsCount;
                        if (data.description) this.description = data.description;
                        if (Array.isArray(data.weeklySchedule) && data.weeklySchedule.length > 0) {
                            this.weeklySchedule = data.weeklySchedule;
                        }
                        if (Array.isArray(data.features) && data.features.length > 0) {
                            this.features = data.features;
                        }
                        if (Array.isArray(data.subjects) && data.subjects.length > 0) {
                            this.subjects = data.subjects;
                        }
                        if (Array.isArray(data.linkedGroups) && data.linkedGroups.length > 0) {
                            this.linkedGroups = data.linkedGroups;
                            this.subjects = data.linkedGroups.map(g => {
                                const durationMin = g.sessionDuration || 40;
                                return {
                                    id: g.id,
                                    name: g.course?.subject?.name || g.name,
                                    groupName: g.name,
                                    teacher: g.teacher?.name || g.course?.teacher?.name || "معلم معتمد",
                                    schedule: `${g.scheduleDays || ''} ${g.scheduleTime || ''}`.trim() || "مواعيد منتظمة",
                                    duration: `${durationMin} دقيقة`,
                                    sessionDuration: durationMin,
                                    totalSessions: g.totalSessions ? `${g.totalSessions} حصة` : "8 حصص شهرياً"
                                };
                            });

                            if (!Array.isArray(data.weeklySchedule) || data.weeklySchedule.length === 0) {
                                const dayMap = {};
                                data.linkedGroups.forEach(g => {
                                    const days = (g.scheduleDays || "السبت • الإثنين").split(/[•,،-]/).map(d => d.trim()).filter(Boolean);
                                    const time = g.scheduleTime || "7:00 - 8:30 م";
                                    const subj = g.course?.subject?.name || g.name;
                                    const dur = `${g.sessionDuration || 40} دقيقة`;
                                    days.forEach(day => {
                                        if (!dayMap[day]) dayMap[day] = [];
                                        dayMap[day].push({ subject: subj, time: time, duration: dur });
                                    });
                                });
                                if (Object.keys(dayMap).length > 0) {
                                    this.weeklySchedule = Object.entries(dayMap).map(([day, items]) => ({ day, items }));
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not load class details from API:", err);
            }
        }

        this.container.innerHTML = `
      <div class="class-details-page-root" dir="rtl">
        <style>
            :root {
                --primary-navy: #1a237e;
                --primary-blue: #1976d2;
                --accent-purple: #4a148c;
                --badge-purple: #5c1b99;
                --bg-soft: #f4f8fc;
                --text-dark: #1e293b;
                --text-muted: #64748b;
                --accent-yellow: #ffca28;
                --border-light: #e2e8f0;
            }

            .class-details-page-root {
                font-family: 'Cairo', sans-serif;
                background-color: var(--bg-soft);
                min-height: 100vh;
                padding-bottom: 70px;
                color: var(--text-dark);
                overflow-x: hidden;
            }

            .container {
                max-width: 1220px;
                margin: 0 auto;
                padding: 0 24px;
                box-sizing: border-box;
            }

            /* -------------------------------------------
               رأس الصفحة التعبيري (Hero Banner)
            -------------------------------------------- */
            .class-hero-banner {
                background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 65%, #f4f8fc 100%);
                padding: 30px 0 20px 0;
                position: relative;
                overflow: hidden;
                border-bottom: 1px solid #e0f2fe;
            }

            .class-hero-banner::before {
                content: '';
                position: absolute;
                top: -80px;
                left: -60px;
                width: 320px;
                height: 320px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, rgba(219, 234, 254, 0) 70%);
                pointer-events: none;
            }

            .hero-header-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
            }

            .breadcrumb-capsule {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #e0f2fe;
                padding: 7px 18px;
                border-radius: 50px;
                font-size: 14px;
                font-weight: 700;
                color: #1e3a8a;
                border: 1px solid #bae6fd;
            }

            .breadcrumb-capsule a {
                color: #1e3a8a;
                text-decoration: none;
                transition: color 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .breadcrumb-capsule a:hover {
                color: var(--accent-purple);
            }

            .breadcrumb-capsule .sep {
                color: #94a3b8;
                font-weight: 400;
            }

            .hero-brand-logo img {
                height: 48px;
                width: auto;
                object-fit: contain;
            }

            .hero-main-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                padding-bottom: 15px;
            }

            .hero-text-side {
                flex: 1;
                max-width: 620px;
                z-index: 2;
            }

            .hero-badge-pill {
                display: inline-block;
                background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);
                color: #ffffff;
                font-size: 15px;
                font-weight: 800;
                padding: 6px 22px;
                border-radius: 50px;
                margin-bottom: 14px;
                box-shadow: 0 4px 12px rgba(74, 20, 140, 0.25);
            }

            .hero-title {
                font-size: clamp(2rem, 3.8vw, 2.9rem);
                font-weight: 900;
                color: #1a237e;
                margin: 0 0 12px 0;
                line-height: 1.25;
                letter-spacing: -0.5px;
            }

            .hero-subtitle {
                font-size: clamp(1.05rem, 1.8vw, 1.3rem);
                font-weight: 800;
                color: #334155;
                margin: 0;
                line-height: 1.5;
            }

            .hero-curve-underline {
                display: block;
                margin-top: 8px;
            }

            .hero-visual-side {
                display: flex;
                align-items: flex-end;
                justify-content: flex-end;
                position: relative;
                height: 220px;
                width: 440px;
            }

            .visual-student-portrait {
                position: absolute;
                bottom: -20px;
                left: 10px;
                height: 250px;
                width: auto;
                object-fit: contain;
                z-index: 2;
                transform: scaleX(-1);
                filter: drop-shadow(0 10px 20px rgba(0, 86, 210, 0.18));
            }

            .visual-3d-books {
                position: absolute;
                bottom: 0px;
                left: 160px;
                width: 220px;
                z-index: 1;
            }

            /* -------------------------------------------
               شبكة التفاصيل الرئيسية (2 Columns)
            -------------------------------------------- */
            .details-main-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 28px;
                margin-top: 30px;
                align-items: start;
            }

            .column-content {
                display: flex;
                flex-direction: column;
                gap: 26px;
            }

            .class-feature-card {
                background: #ffffff;
                border-radius: 24px;
                padding: 28px 30px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.035);
                border: 1.5px solid #eef2f6;
                position: relative;
            }

            .card-header-pill {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #4a148c 0%, #5e1a9e 100%);
                color: #ffffff;
                font-size: 17px;
                font-weight: 800;
                padding: 8px 24px;
                border-radius: 50px;
                box-shadow: 0 4px 14px rgba(74, 20, 140, 0.22);
            }

            /* 1. كارت جدول مواعيد الحصص الأسبوعية */
            .schedule-flex-wrap {
                display: flex;
                align-items: center;
                gap: 22px;
                margin-top: 24px;
            }

            .schedule-3d-clock {
                flex-shrink: 0;
                width: 86px;
                height: 86px;
                background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
                border-radius: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 20px rgba(14, 165, 233, 0.18);
                border: 2px solid #ffffff;
                position: relative;
            }

            .schedule-3d-clock svg {
                filter: drop-shadow(0 4px 8px rgba(2, 132, 199, 0.25));
            }

            .schedule-table-grid {
                flex: 1;
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 10px;
            }

            .schedule-day-column {
                display: flex;
                flex-direction: column;
                gap: 8px;
                text-align: center;
            }

            .day-header-pill {
                background: #1976d2;
                color: #ffffff;
                font-size: 14px;
                font-weight: 800;
                padding: 8px 4px;
                border-radius: 12px;
                box-shadow: 0 3px 8px rgba(25, 118, 210, 0.22);
            }

            .day-time-box {
                background: #f8fafc;
                border: 1.5px solid #e2e8f0;
                border-radius: 12px;
                padding: 10px 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                min-height: 82px;
                box-sizing: border-box;
                transition: all 0.2s ease;
            }

            .day-time-box:hover {
                border-color: #1976d2;
                background: #f0f7ff;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(25, 118, 210, 0.08);
            }

            .session-entry {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }

            .session-name {
                font-size: 13px;
                font-weight: 800;
                color: #1a237e;
                line-height: 1.3;
            }

            .session-hours {
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                margin-top: 1px;
            }

            .mini-day-divider {
                width: 80%;
                border: none;
                border-top: 1px dashed #cbd5e1;
                margin: 4px 0;
            }

            /* 2. كارت المواد الدراسية المتضمنة (البطاقات الخمس) */
            .subjects-cards-row {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 14px;
                margin-top: 24px;
            }

            .subject-tile {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 18px 8px 16px 8px;
                border-radius: 18px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
                border: 1.5px solid transparent;
                transition: transform 0.25s ease, box-shadow 0.25s ease;
                cursor: pointer;
            }

            .subject-tile:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
            }

            .subject-tile-icon {
                width: 58px;
                height: 58px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 12px;
                transition: transform 0.2s;
            }

            .subject-tile:hover .subject-tile-icon {
                transform: scale(1.08);
            }

            .subject-tile-title {
                font-size: 14px;
                font-weight: 800;
                margin: 0;
                line-height: 1.35;
            }

            .subject-tile-teacher {
                font-size: 11.5px;
                font-weight: 700;
                color: #64748b;
                margin-top: 4px;
            }

            .subject-arabic {
                background-color: #fff1f2;
                border-color: #ffe4e6;
            }
            .subject-arabic .subject-tile-title { color: #9f1239; }

            .subject-english {
                background-color: #eff6ff;
                border-color: #dbeafe;
            }
            .subject-english .subject-tile-title { color: #1e40af; }

            .subject-math {
                background-color: #f0fdf4;
                border-color: #dcfce7;
            }
            .subject-math .subject-tile-title { color: #166534; }

            .subject-science {
                background-color: #faf5ff;
                border-color: #f3e8ff;
            }
            .subject-science .subject-tile-title { color: #6b21a8; }

            .subject-social {
                background-color: #fffbeb;
                border-color: #fef3c7;
            }
            .subject-social .subject-tile-title { color: #92400e; }

            /* كارت نبذة عن الباقة (من ملف HTML) */
            .course-description-box {
                background: #ffffff;
                border-radius: 20px;
                padding: 24px 28px;
                border: 1px solid #edf2f7;
            }

            .course-description-box h3 {
                font-size: 18px;
                font-weight: 800;
                color: var(--primary-navy);
                margin: 0 0 10px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .course-description-box p {
                font-size: 15px;
                line-height: 1.8;
                color: #475569;
                margin: 0;
                font-weight: 600;
            }

            /* -------------------------------------------
               القسم الأيسر: مميزات الفصل والاشتراك
            -------------------------------------------- */
            .column-sidebar {
                position: sticky;
                top: 25px;
            }

            .enroll-features-card {
                background: #ffffff;
                border-radius: 24px;
                padding: 30px 26px;
                box-shadow: 0 10px 32px rgba(0, 0, 0, 0.05);
                border: 2px solid #eef2f6;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .features-list {
                list-style: none;
                padding: 0;
                margin: 26px 0 22px 0;
                text-align: right;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .features-list li {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 15px;
                font-weight: 800;
                color: #1e293b;
                line-height: 1.4;
            }

            .check-circle-green {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #22c55e;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 3px 8px rgba(34, 197, 94, 0.35);
            }

            .pricing-divider {
                height: 1px;
                background: #e2e8f0;
                margin: 24px 0 20px 0;
                border: none;
            }

            .pricing-label {
                font-size: 16px;
                font-weight: 800;
                color: #1a237e;
                margin-bottom: 6px;
            }

            .pricing-val {
                font-size: 44px;
                font-weight: 900;
                color: #1a237e;
                line-height: 1.1;
                margin-bottom: 22px;
                letter-spacing: -1px;
            }

            .btn-subscribe-gold-wrap {
                position: relative;
                display: block;
                width: 100%;
            }

            .btn-sparkle-rays {
                position: absolute;
                top: 50%;
                right: -12px;
                transform: translateY(-50%);
                pointer-events: none;
                z-index: 3;
            }

            .btn-subscribe-gold {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                background: linear-gradient(135deg, #ffca28 0%, #f59e0b 100%);
                color: #1e1b4b;
                font-size: 20px;
                font-weight: 900;
                padding: 16px 24px;
                border-radius: 18px;
                text-decoration: none;
                border: none;
                cursor: pointer;
                box-shadow: 0 8px 24px rgba(245, 158, 11, 0.38);
                transition: all 0.25s ease;
                box-sizing: border-box;
            }

            .btn-subscribe-gold:hover {
                background: linear-gradient(135deg, #ffd54f 0%, #fbbf24 100%);
                transform: translateY(-3px);
                box-shadow: 0 12px 28px rgba(245, 158, 11, 0.5);
            }

            .btn-contact-inquiry {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                background-color: transparent;
                color: var(--primary-navy);
                text-align: center;
                padding: 13px;
                border-radius: 16px;
                font-size: 15px;
                font-weight: 700;
                text-decoration: none;
                border: 2px solid #cbd5e1;
                box-sizing: border-box;
                margin-top: 12px;
                transition: all 0.25s ease;
            }

            .btn-contact-inquiry:hover {
                border-color: var(--primary-navy);
                background-color: #f8fafc;
            }

            /* -------------------------------------------
               شريط مميزات الثقة والضمان (Trust Badges Bar)
            -------------------------------------------- */
            .trust-badges-bar {
                background: #ffffff;
                border-radius: 50px;
                padding: 18px 40px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.035);
                border: 1px solid #eef2f6;
                display: flex;
                align-items: center;
                justify-content: space-around;
                margin: 34px 0 40px 0;
            }

            .trust-badge-item {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                font-weight: 800;
                color: #1e293b;
            }

            .trust-badge-item i {
                color: #1976d2;
                width: 22px;
                height: 22px;
            }

            .trust-divider {
                width: 1.5px;
                height: 28px;
                background: #e2e8f0;
            }

            /* -------------------------------------------
               قسم صمم باقتك بنفسك (Custom Enroll Section)
            -------------------------------------------- */
            .custom-enroll-section {
                max-width: 100%;
                margin: 0 auto;
                background: linear-gradient(135deg, #311b92 0%, #512da8 100%);
                border-radius: 28px;
                padding: 40px 48px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 15px 35px rgba(49, 27, 146, 0.22);
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
                border: 1px solid #7c4dff;
            }

            .custom-enroll-puzzle-bg {
                position: absolute;
                left: -35px;
                bottom: -35px;
                width: 220px;
                height: 220px;
                opacity: 0.08;
                pointer-events: none;
                z-index: 0;
                color: #ffffff;
            }

            .custom-content {
                flex: 1;
                position: relative;
                z-index: 1;
                padding-left: 36px;
            }

            .custom-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background-color: rgba(255, 202, 40, 0.16);
                color: #ffca28;
                border: 1px solid #ffca28;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 13.5px;
                font-weight: 800;
                margin-bottom: 14px;
            }

            .custom-title {
                font-size: clamp(1.4rem, 2.5vw, 1.95rem);
                font-weight: 800;
                color: #ffffff;
                margin: 0 0 14px 0;
                line-height: 1.35;
            }

            .custom-desc {
                font-size: 15.5px;
                color: #e0e7ff;
                font-weight: 600;
                margin: 0 0 20px 0;
                line-height: 1.7;
                max-width: 640px;
            }

            .custom-features {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-wrap: wrap;
                gap: 12px 24px;
            }

            .custom-features li {
                font-size: 14.5px;
                font-weight: 700;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .feature-check-icon {
                color: #4caf50;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.95);
            }

            .custom-action {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                background: #ffffff;
                padding: 28px 24px;
                border-radius: 20px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
                min-width: 250px;
                box-sizing: border-box;
            }

            .custom-action h4 {
                margin: 0 0 6px 0;
                font-size: 18px;
                font-weight: 800;
                color: #311b92;
            }

            .custom-action p {
                margin: 0 0 16px 0;
                font-size: 14px;
                font-weight: 600;
                color: #64748b;
            }

            .btn-custom-enroll {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                background-color: #ffca28;
                color: #1a237e;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 14px;
                font-size: 17px;
                font-weight: 800;
                width: 100%;
                box-sizing: border-box;
                box-shadow: 0 6px 18px rgba(255, 202, 40, 0.35);
                transition: all 0.25s ease;
                border: none;
                cursor: pointer;
            }

            .btn-custom-enroll:hover {
                background-color: #ffb300;
                transform: translateY(-2px);
                box-shadow: 0 10px 24px rgba(255, 202, 40, 0.45);
            }

            /* -------------------------------------------
               التجاوب مع الشاشات (Responsive)
            -------------------------------------------- */
            @media (max-width: 992px) {
                .details-main-grid {
                    grid-template-columns: 1fr;
                }
                .column-sidebar {
                    position: static;
                }
                .hero-visual-side {
                    display: none;
                }
                .hero-text-side {
                    max-width: 100%;
                }
                .subjects-cards-row {
                    grid-template-columns: repeat(3, 1fr);
                }
                .trust-badges-bar {
                    flex-direction: column;
                    gap: 14px;
                    border-radius: 20px;
                    padding: 20px;
                }
                .trust-divider {
                    display: none;
                }
            }

            @media (max-width: 768px) {
                .schedule-flex-wrap {
                    flex-direction: column;
                    align-items: stretch;
                }
                .schedule-table-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
                .subjects-cards-row {
                    grid-template-columns: repeat(2, 1fr);
                }
                .custom-enroll-section {
                    flex-direction: column !important;
                    padding: 32px 22px !important;
                    text-align: center !important;
                }
                .custom-content {
                    padding-left: 0 !important;
                    margin-bottom: 28px !important;
                }
                .custom-features {
                    justify-content: center !important;
                }
                .custom-action {
                    width: 100% !important;
                    min-width: auto !important;
                }
            }

            @media (max-width: 480px) {
                .schedule-table-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .subjects-cards-row {
                    grid-template-columns: 1fr;
                }
            }
        </style>

        <!-- رأس الصفحة التعبيري (Hero Banner) -->
        <header class="class-hero-banner">
            <div class="container">
                
                <!-- الصف العلوي: مسار التنقل وشعار المنصة -->
                <div class="hero-header-row">
                    <nav class="breadcrumb-capsule">
                        <i data-lucide="home" style="width:16px;height:16px;"></i>
                        <a href="#landing">الرئيسية</a>
                        <span class="sep">›</span>
                        <a href="#landing">${this.stageName}</a>
                        <span class="sep">›</span>
                        <span>${this.gradeName}</span>
                    </nav>

                
                </div>

                <!-- المحتوى الرئيسي للبانر (من محتوى HTML) -->
                <div class="hero-main-content">
                    <div class="hero-text-side">
                        <span class="hero-badge-pill">الباقة الشاملة</span>
                        <h1 class="hero-title">${this.roomName} - ${this.gradeName}</h1>
                        <p class="hero-subtitle">
                            كل المواد في فصل واحد .. شرح مبسط وتفاعل مباشر
                        </p>
                        <svg class="hero-curve-underline" width="160" height="12" viewBox="0 0 160 12" fill="none">
                            <path d="M4 8C55 2 110 2 156 8" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
                        </svg>
                    </div>

                    <!-- الرسم التعبيري وصورة الطالب المتفوق -->
                    <div class="hero-visual-side">
                        <img src="assets/child-student-portrait.png" alt="طالب متفوق" class="visual-student-portrait">

                        <div class="visual-3d-books">
                            <svg viewBox="0 0 240 180" fill="none" style="width:100%; height:auto;">
                                <line x1="190" y1="20" x2="198" y2="10" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                                <line x1="205" y1="30" x2="218" y2="25" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                                <line x1="200" y1="45" x2="212" y2="52" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                                
                                <rect x="35" y="65" width="40" height="55" rx="8" fill="#ffffff" stroke="#bae6fd" stroke-width="3" />
                                <rect x="39" y="32" width="7" height="42" rx="3" fill="#1e40af" transform="rotate(-10 39 32)"/>
                                <rect x="52" y="30" width="7" height="42" rx="3" fill="#f59e0b" />
                                <rect x="63" y="32" width="7" height="42" rx="3" fill="#0284c7" transform="rotate(12 63 32)"/>

                                <path d="M75 90 L185 80 L205 105 L95 115 Z" fill="#0284c7"/>
                                <path d="M75 90 L95 115 L95 125 L75 100 Z" fill="#0369a1"/>
                                <path d="M95 115 L205 105 L205 115 L95 125 Z" fill="#38bdf8"/>

                                <path d="M60 115 L175 105 L195 130 L80 140 Z" fill="#e11d48"/>
                                <path d="M60 115 L80 140 L80 150 L60 125 Z" fill="#be123c"/>
                                <path d="M80 140 L195 130 L195 140 L80 150 Z" fill="#fb7185"/>

                                <path d="M50 140 L165 130 L185 155 L70 165 Z" fill="#f59e0b"/>
                                <path d="M50 140 L70 165 L70 175 L50 150 Z" fill="#d97706"/>
                                <path d="M70 165 L185 155 L185 165 L70 175 Z" fill="#fcd34d"/>
                            </svg>
                        </div>
                    </div>
                </div>

            </div>
        </header>

        <!-- جسم الصفحة الرئيسي (Grid Layout) -->
        <div class="container">
            <div class="details-main-grid">
                
                <!-- القسم الأيمن (مواعيد الحصص + المواد الدراسية + نبذة عن الباقة) -->
                <div class="column-content">
                    
                    <!-- 1. كارت جدول مواعيد الحصص الأسبوعية (المحتوى من الـ HTML المرفق) -->
                    <div class="class-feature-card">
                        <div class="card-header-pill">
                            <span>مواعيد الحصص الأسبوعية</span>
                            <i data-lucide="calendar" style="width:18px;height:18px;"></i>
                        </div>

                        <div class="schedule-flex-wrap">
                            <!-- مجسم الساعة والتقويم ثلاثي الأبعاد -->
                            <div class="schedule-3d-clock">
                                <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                                    <circle cx="32" cy="30" r="24" fill="#0284c7" />
                                    <circle cx="32" cy="30" r="19" fill="#ffffff" />
                                    <line x1="32" y1="30" x2="32" y2="17" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
                                    <line x1="32" y1="30" x2="23" y2="38" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
                                    <circle cx="32" cy="30" r="2.5" fill="#0284c7" />
                                    <rect x="10" y="38" width="20" height="18" rx="4" fill="#ffffff" stroke="#bae6fd" stroke-width="2"/>
                                    <rect x="10" y="38" width="20" height="6" fill="#f59e0b"/>
                                    <circle cx="15" cy="48" r="1.5" fill="#0284c7"/>
                                    <circle cx="20" cy="48" r="1.5" fill="#0284c7"/>
                                    <circle cx="25" cy="48" r="1.5" fill="#0284c7"/>
                                </svg>
                            </div>

                            <!-- شبكة الأيام الستة مع المادة والتوقيت من ملف HTML -->
                            <div class="schedule-table-grid">
                                ${this.weeklySchedule.map(s => `
                                    <div class="schedule-day-column">
                                        <div class="day-header-pill">${s.day}</div>
                                        <div class="day-time-box">
                                            ${s.items.map((item, idx) => `
                                                ${idx > 0 ? '<hr class="mini-day-divider">' : ''}
                                                <div class="session-entry">
                                                    <span class="session-name">${item.subject}</span>
                                                    <span class="session-hours">${item.time}</span>
                                                    <span style="font-size:10.5px; font-weight:800; color:#0284c7; background:rgba(2,132,199,0.1); padding:2px 8px; border-radius:8px; display:inline-flex; align-items:center; gap:4px; margin-top:3px;">
                                                        <i data-lucide="clock" style="width:11px;height:11px;"></i>
                                                        <span>${item.duration || '40 دقيقة'}</span>
                                                    </span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- 2. كارت المواد والمجموعات الدراسية المتضمنة مع المعلمين والمدة -->
                    <div class="class-feature-card">
                        <div class="card-header-pill">
                            <span>المواد الدراسية والمعلمون ومدة الحصص</span>
                            <i data-lucide="book-open" style="width:18px;height:18px;"></i>
                        </div>

                        <div class="subjects-cards-row">
                            ${this.subjects && this.subjects.length > 0 ? this.subjects.map((sub, sIdx) => {
                                const themeClasses = ["subject-arabic", "subject-english", "subject-math", "subject-science", "subject-social"];
                                const cls = themeClasses[sIdx % themeClasses.length];
                                const icons = ["📚", "📐", "🔬", "🌍", "⚡", "🧪", "🧬"];
                                const icon = sub.icon || icons[sIdx % icons.length];
                                const dur = sub.duration || "40 دقيقة";
                                return `
                                    <div class="subject-tile ${cls}">
                                        <div class="subject-tile-icon" style="font-size:1.8rem; display:flex; align-items:center; justify-content:center;">
                                            <span>${icon}</span>
                                        </div>
                                        <h4 class="subject-tile-title">${sub.name}</h4>
                                        <span class="subject-tile-teacher">${sub.teacher || 'معلم معتمد'}</span>
                                        
                                        <!-- مدة الحصة للمجموعة -->
                                        <div style="margin-top:8px; display:inline-flex; align-items:center; gap:4px; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.25); border-radius:12px; padding:3px 10px; font-size:11px; font-weight:800; white-space:nowrap;">
                                            <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                            <span>مدة الحصة: ${dur}</span>
                                        </div>

                                        ${sub.schedule ? `
                                            <span style="font-size:10px; font-weight:700; color:#64748b; margin-top:5px; text-align:center; line-height:1.3;">
                                                ${sub.schedule}
                                            </span>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('') : `
                            <!-- 1. اللغة العربية -->
                            <div class="subject-tile subject-arabic">
                                <div class="subject-tile-icon">
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <path d="M8 12C12 10 18 10 24 13C30 10 36 10 40 12V36C36 34 30 34 24 37C18 34 12 34 8 36V12Z" fill="#fee2e2" stroke="#e11d48" stroke-width="2.5" stroke-linejoin="round"/>
                                        <line x1="24" y1="13" x2="24" y2="37" stroke="#e11d48" stroke-width="2.5"/>
                                        <line x1="12" y1="18" x2="20" y2="18" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
                                        <line x1="28" y1="18" x2="36" y2="18" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                                <h4 class="subject-tile-title">اللغة العربية</h4>
                                <span class="subject-tile-teacher">أ. محمد علي</span>
                                <div style="margin-top:8px; display:inline-flex; align-items:center; gap:4px; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.25); border-radius:12px; padding:3px 10px; font-size:11px; font-weight:800;">
                                    <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                    <span>مدة الحصة: 40 دقيقة</span>
                                </div>
                            </div>

                            <!-- 2. اللغة الانجليزية -->
                            <div class="subject-tile subject-english">
                                <div class="subject-tile-icon">
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <rect x="7" y="18" width="18" height="18" rx="4" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
                                        <text x="16" y="32" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Cairo', sans-serif">A</text>
                                        <rect x="23" y="12" width="18" height="18" rx="4" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
                                        <text x="32" y="26" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Cairo', sans-serif">B</text>
                                        <rect x="18" y="24" width="18" height="18" rx="4" fill="#10b981" stroke="#059669" stroke-width="1.5"/>
                                        <text x="27" y="38" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="'Cairo', sans-serif">C</text>
                                    </svg>
                                </div>
                                <h4 class="subject-tile-title">اللغة الانجليزية</h4>
                                <span class="subject-tile-teacher">أ. تامر رأفت</span>
                                <div style="margin-top:8px; display:inline-flex; align-items:center; gap:4px; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.25); border-radius:12px; padding:3px 10px; font-size:11px; font-weight:800;">
                                    <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                    <span>مدة الحصة: 40 دقيقة</span>
                                </div>
                            </div>

                            <!-- 3. الرياضيات -->
                            <div class="subject-tile subject-math">
                                <div class="subject-tile-icon">
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <path d="M12 15H22M17 10V20" stroke="#16a34a" stroke-width="3" stroke-linecap="round"/>
                                        <path d="M26 15H36" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
                                        <path d="M12 28L20 36M20 28L12 36" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/>
                                        <circle cx="31" cy="27" r="2" fill="#d97706"/>
                                        <line x1="26" y1="32" x2="36" y2="32" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
                                        <circle cx="31" cy="37" r="2" fill="#d97706"/>
                                    </svg>
                                </div>
                                <h4 class="subject-tile-title">الرياضيات</h4>
                                <span class="subject-tile-teacher">أ. أحمد سعيد</span>
                                <div style="margin-top:8px; display:inline-flex; align-items:center; gap:4px; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.25); border-radius:12px; padding:3px 10px; font-size:11px; font-weight:800;">
                                    <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                    <span>مدة الحصة: 40 دقيقة</span>
                                </div>
                            </div>

                            <!-- 4. العلوم -->
                            <div class="subject-tile subject-science">
                                <div class="subject-tile-icon">
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <path d="M21 8H27M24 8V18L35 36C36.5 38.5 34.5 41 31.5 41H16.5C13.5 41 11.5 38.5 13 36L24 18V8" stroke="#9333ea" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M16 36L20 28C22 30 26 30 28 28L32 36C31 38 17 38 16 36Z" fill="#c084fc"/>
                                        <circle cx="21" cy="33" r="1.5" fill="#ffffff"/>
                                        <circle cx="26" cy="31" r="2" fill="#ffffff"/>
                                    </svg>
                                </div>
                                <h4 class="subject-tile-title">العلوم</h4>
                                <span class="subject-tile-teacher">أ. سامح عبد الله</span>
                                <div style="margin-top:8px; display:inline-flex; align-items:center; gap:4px; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.25); border-radius:12px; padding:3px 10px; font-size:11px; font-weight:800;">
                                    <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                    <span>مدة الحصة: 40 دقيقة</span>
                                </div>
                            </div>

                            <!-- 5. الدراسات الاجتماعية -->
                            <div class="subject-tile subject-social">
                                <div class="subject-tile-icon">
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <circle cx="24" cy="20" r="13" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>
                                        <path d="M18 16C19 14 22 15 23 17C24 19 21 21 19 20C17 19 17 18 18 16Z" fill="#16a34a"/>
                                        <path d="M27 22C28 20 32 21 34 23C33 26 29 27 28 25Z" fill="#16a34a"/>
                                        <path d="M36 25C34 32 28 35 24 35C20 35 14 32 12 25" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
                                        <path d="M24 35V40M18 40H30" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
                                    </svg>
                                </div>
                                <h4 class="subject-tile-title">الدراسات الاجتماعية</h4>
                                <span class="subject-tile-teacher">أ. يوسف إبراهيم</span>
                                <div style="margin-top:8px; display:inline-flex; align-items:center; gap:4px; background:rgba(2,132,199,0.1); color:#0284c7; border:1px solid rgba(2,132,199,0.25); border-radius:12px; padding:3px 10px; font-size:11px; font-weight:800;">
                                    <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                    <span>مدة الحصة: 40 دقيقة</span>
                                </div>
                            </div>
                            `}

                        </div>
                    </div>

                    ${(this.linkedGroups && this.linkedGroups.length > 0) ? `
                    <!-- كارت تفصيلي لكل مجموعة وحصصها المباشرة -->
                    <div class="class-feature-card" style="margin-top:20px;">
                        <div class="card-header-pill">
                            <span>تفاصيل مجموعات الفصل وحصصها المباشرة</span>
                            <i data-lucide="layers" style="width:18px;height:18px;"></i>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-top:16px;">
                            ${this.linkedGroups.map(g => {
                                const dur = g.sessionDuration ? `${g.sessionDuration} دقيقة` : '40 دقيقة';
                                const sName = g.course?.subject?.name || g.name;
                                const tName = g.teacher?.name || g.course?.teacher?.name || 'معلم معتمد';
                                const sched = `${g.scheduleDays || ''} ${g.scheduleTime || ''}`.trim() || 'مواعيد منتظمة';
                                return `
                                    <div style="background:#ffffff; border:1.5px solid var(--border-light, #e2e8f0); border-radius:18px; padding:16px 18px; display:flex; flex-direction:column; gap:9px; box-shadow:0 3px 10px rgba(0,0,0,0.02); transition:transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.05)';" onmouseleave="this.style.transform='none'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.02)';">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <span style="font-weight:900; font-size:0.98rem; color:#1a237e;">${sName}</span>
                                            <span style="background:rgba(2,132,199,0.12); color:#0284c7; font-weight:800; font-size:0.76rem; padding:3px 10px; border-radius:10px; display:inline-flex; align-items:center; gap:4px;">
                                                <i data-lucide="clock" style="width:12px;height:12px;"></i>
                                                <span>${dur}</span>
                                            </span>
                                        </div>
                                        <div style="font-size:0.82rem; color:#64748b; display:flex; align-items:center; gap:6px;">
                                            <i data-lucide="user" style="width:14px;height:14px;color:#1e40af;"></i>
                                            <span><strong>المعلم:</strong> ${tName}</span>
                                        </div>
                                        <div style="font-size:0.8rem; color:#64748b; display:flex; align-items:center; gap:6px;">
                                            <i data-lucide="calendar" style="width:14px;height:14px;color:#10b981;"></i>
                                            <span><strong>المواعيد:</strong> ${sched}</span>
                                        </div>
                                        <div style="font-size:0.77rem; color:#0284c7; font-weight:800; margin-top:2px; display:flex; align-items:center; gap:4px; padding-top:6px; border-top:1px dashed #e2e8f0;">
                                            <i data-lucide="timer" style="width:13px;height:13px;"></i>
                                            <span>مدة الحصة لكل لقاء: <strong>${dur}</strong></span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- 3. نبذة عن الباقة (محتوى الـ HTML الأصلي) -->
                    <div class="course-description-box">
                        <h3>
                            <i data-lucide="info" style="width:18px;height:18px;color:var(--primary-blue);"></i>
                            <span>عن هذه الباقة</span>
                        </h3>
                        <p>
                            ${this.description || `باقة "${this.roomName}" هي الحل الأمثل لتأسيس طفلك في جميع المواد الأساسية دفعة واحدة. تشمل الباقة بواقع ${this.lessonsCount || '64 حصة إجمالية'}. نضمن لك متابعة مستمرة وتواصلاً مباشراً مع نخبة من أكفأ المعلمين المتخصصين لضمان تفوق طفلك.`}
                        </p>
                    </div>

                </div>

                <!-- القسم الأيسر (مميزات الفصل والاشتراك) -->
                <div class="column-sidebar">
                    <div class="enroll-features-card">
                        
                        <div class="card-header-pill">
                            <i data-lucide="star" style="width:16px;height:16px;color:#ffca28;fill:#ffca28;"></i>
                            <span>مميزات الفصل</span>
                        </div>

                        <!-- قائمة المميزات مع علامات الصح الخضراء (من ملف HTML) -->
                        <ul class="features-list">
                            ${(this.features && this.features.length > 0) ? this.features.map(f => `
                                <li>
                                    <span class="check-circle-green">
                                        <i data-lucide="check" style="width:15px;height:15px;"></i>
                                    </span>
                                    <span>${f}</span>
                                </li>
                            `).join('') : `
                                <li>
                                    <span class="check-circle-green">
                                        <i data-lucide="check" style="width:15px;height:15px;"></i>
                                    </span>
                                    <span>جميع المواد والمجموعات في فصل واحد</span>
                                </li>
                                <li>
                                    <span class="check-circle-green">
                                        <i data-lucide="clock" style="width:15px;height:15px;"></i>
                                    </span>
                                    <span>مدة الحصة لكل مجموعة: <strong>${(this.subjects && this.subjects[0]?.duration) || '40 دقيقة'}</strong> تفاعلية ومباشرة</span>
                                </li>
                                <li>
                                    <span class="check-circle-green">
                                        <i data-lucide="check" style="width:15px;height:15px;"></i>
                                    </span>
                                    <span>شرح مبسط من أفضل المعلمين المعتمدين</span>
                                </li>
                                <li>
                                    <span class="check-circle-green">
                                        <i data-lucide="check" style="width:15px;height:15px;"></i>
                                    </span>
                                    <span>حصص تفاعلية مباشرة (${this.lessonsCount || '64 حصة'})</span>
                                </li>
                                <li>
                                    <span class="check-circle-green">
                                        <i data-lucide="check" style="width:15px;height:15px;"></i>
                                    </span>
                                    <span>متابعة مستمرة مع المعلم وولي الأمر</span>
                                </li>
                            `}
                        </ul>

                        <hr class="pricing-divider">

                        <!-- سعر الاشتراك الشهري -->
                        <div class="pricing-label">رسوم الاشتراك الشهرية</div>
                        <div class="pricing-val">${this.priceEg || '150 جنيه'}</div>

                        <!-- زر اشترك الآن الذهبي -->
                        <div class="btn-subscribe-gold-wrap">
                            <svg class="btn-sparkle-rays" width="34" height="34" viewBox="0 0 34 34" fill="none">
                                <line x1="8" y1="8" x2="22" y2="13" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                                <line x1="4" y1="18" x2="18" y2="18" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                                <line x1="8" y1="28" x2="22" y2="23" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
                            </svg>

                            <button type="button" class="btn-subscribe-gold" id="btn-subscribe-now">
                                <span>اشترك الآن</span>
                                <i data-lucide="shopping-cart" style="width:22px;height:22px;"></i>
                            </button>
                        </div>

                        <a href="#contact" class="btn-contact-inquiry">
                            <i data-lucide="message-circle" style="width:17px;height:17px;"></i>
                            <span>تواصل معنا للاستفسار</span>
                        </a>

                    </div>
                </div>

            </div>

            <!-- شريط مميزات الثقة والضمان (Trust Badges Bar) -->
            <div class="trust-badges-bar">
                
                <div class="trust-badge-item">
                    <i data-lucide="headphones" style="width:22px;height:22px;color:#0284c7;"></i>
                    <span>دعم فني دائم</span>
                </div>

                <div class="trust-divider"></div>

                <div class="trust-badge-item">
                    <i data-lucide="trending-up" style="width:22px;height:22px;color:#16a34a;"></i>
                    <span>متابعة مستمرة</span>
                </div>

                <div class="trust-divider"></div>

                <div class="trust-badge-item">
                    <i data-lucide="award" style="width:22px;height:22px;color:#f59e0b;"></i>
                    <span>جودة تعليم عالية</span>
                </div>

            </div>

            <!-- 🧩 قسم صمم باقتك بنفسك (Custom Enroll Section) -->
            <div class="custom-enroll-section">
                <svg class="custom-enroll-puzzle-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                    <path d="M19.439 7.85c0-1.57.802-2.54 2.14-2.54 1.35 0 2.421 1.07 2.421 2.54 0 1.48-1.071 2.55-2.421 2.55h-2.14V7.85zm0 8.3c0-1.48 1.07-2.55 2.421-2.55 1.338 0 2.14.97 2.14 2.55 0 1.47-1.071 2.54-2.421 2.54-1.338 0-2.14-.97-2.14-2.54zm-3.739 3.85c1.57 0 2.54.8 2.54 2.14 0 1.35-1.07 2.42-2.54 2.42-1.48 0-2.55-1.07-2.55-2.42v-2.14h2.55zm-8.3 0c1.48 0 2.55 1.07 2.55 2.42 0 1.34-.97 2.14-2.55 2.14-1.47 0-2.54-1.07-2.54-2.42 0-1.34.97-2.14 2.54-2.14z"/>
                </svg>

                <div class="custom-content">
                    <span class="custom-badge">
                        <i data-lucide="sliders" style="width:16px;height:16px;color:#ffca28;"></i>
                        <span>مرونة تامة في الاختيار</span>
                    </span>
                    <h2 class="custom-title">صمم باقتك بنفسك.. واختر المواد التي تحتاجها فقط!</h2>
                    <p class="custom-desc">
                        لا داعي للاشتراك في باقة كاملة إذا كنت ترغب في التركيز على مواد معينة. في أكاديمية انطلق، نوفر لك حرية تامة لتفصيل جدولك واختيار موادك الفردية بما يناسب مستوى طفلك.
                    </p>
                    <ul class="custom-features">
                        <li>
                            <span class="feature-check-icon"><i data-lucide="check" style="width:15px;height:15px;"></i></span>
                            <span>ادفع فقط مقابل المواد التي تختارها</span>
                        </li>
                        <li>
                            <span class="feature-check-icon"><i data-lucide="check" style="width:15px;height:15px;"></i></span>
                            <span>حرية اختيار المعلمين والمواعيد</span>
                        </li>
                        <li>
                            <span class="feature-check-icon"><i data-lucide="check" style="width:15px;height:15px;"></i></span>
                            <span>نفس جودة التعليم والمتابعة المستمرة</span>
                        </li>
                    </ul>
                </div>

                <div class="custom-action">
                    <h4>جاهز لتخصيص دراستك؟</h4>
                    <p>تصفح المواد المتاحة وأضفها لباقتك</p>
                    <a href="#courses" class="btn-custom-enroll">
                        <span>ابدأ باختيار المواد</span>
                        <i data-lucide="arrow-left" style="width:18px;height:18px;"></i>
                    </a>
                </div>
            </div>

        </div>
      </div>
    `;

        // تهيئة أيقونات Lucide فوراً لضمان ظهور كافة الأيقونات
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // زر الاشتراك
        const subscribeBtn = this.container.querySelector("#btn-subscribe-now");
        subscribeBtn?.addEventListener("click", () => {
            if (!state.user) {
                showToast("يرجى تسجيل الدخول أو إنشاء حساب للاشتراك في الفصل.", "info");
                window.location.hash = "#login";
            } else {
                this.renderStudentClassSubscriptionModal();
            }
        });
    }

    renderStudentClassSubscriptionModal() {
        const modalContainer = document.getElementById("admin-modal-container") || document.body;
        
        // Extract numeric price if possible
        const rawPriceStr = this.priceEg || this.price || "";
        const numericMatch = String(rawPriceStr).match(/\d+/);
        const totalPrice = numericMatch ? Number(numericMatch[0]) : 800;

        const modalDiv = document.createElement("div");
        modalDiv.id = "student-class-sub-modal";
        modalDiv.className = "modal-overlay";
        modalDiv.style.cssText = "display:flex; backdrop-filter:blur(8px); background:rgba(0,0,0,0.65); position:fixed; inset:0; z-index:99999; align-items:center; justify-content:center; padding:16px; direction:rtl;";

        modalDiv.innerHTML = `
            <div class="modal-content glass-card" style="max-width:540px; width:100%; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--bg-card); max-height:92vh; display:flex; flex-direction:column; box-shadow:0 20px 50px rgba(0,0,0,0.3);">
                
                <div style="padding:20px 24px; background:linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.12)); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:42px; height:42px; border-radius:14px; background:linear-gradient(135deg, #2563eb, #10b981); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                            <i data-lucide="graduation-cap" style="width:22px; height:22px;"></i>
                        </div>
                        <div>
                            <h3 style="font-size:1.15rem; font-weight:900; margin:0; color:var(--text-main);">الاشتراك في باقة الفصل 🎒</h3>
                            <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">${this.roomName || 'فصل وباقة شاملة'} • ${this.gradeName || ''}</p>
                        </div>
                    </div>
                    <span id="close-student-class-sub-modal" style="font-size:1.5rem; cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-app); border:1px solid var(--border-color); color:var(--text-muted);">&times;</span>
                </div>

                <form id="student-class-sub-form" style="display:flex; flex-direction:column; overflow-y:auto;">
                    <div style="padding:22px 24px; display:flex; flex-direction:column; gap:16px;">
                        
                        <!-- Summary banner -->
                        <div style="background:var(--bg-app); padding:14px 18px; border-radius:16px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div>
                                <div style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">سعر باقة الفصل:</div>
                                <div style="font-size:1.25rem; font-weight:900; color:var(--primary);">${this.priceEg || this.price || `${totalPrice} ج.م`}</div>
                            </div>
                            <span class="badge" style="background:rgba(16,185,129,0.12); color:#10b981; font-weight:800; font-size:0.75rem; padding:4px 10px; border-radius:10px;">
                                ${(this.subjects || []).length} مواد دراسية متكاملة
                            </span>
                        </div>

                        <!-- 1. Select Payment Option (Full / Installment / Later) -->
                        <div>
                            <label style="font-size:0.86rem; font-weight:800; display:block; margin-bottom:8px; color:var(--text-main);">
                                💳 اختر خطة وسداد الرسوم:
                            </label>
                            
                            <div style="display:grid; grid-template-columns:1fr; gap:10px;">
                                <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); transition:all 0.2s;" class="sub-plan-card">
                                    <input type="radio" name="classPaymentOption" value="PAID" checked style="accent-color:var(--primary); width:18px; height:18px;">
                                    <div>
                                        <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">دفع الرسوم بالكامل الآن ✅</div>
                                        <div style="font-size:0.74rem; color:var(--text-muted);">سداد إجمالي قيمة الباقة (${totalPrice} ج.م) مع رفع إيصال التحويل المالي لتفعيل فوري</div>
                                    </div>
                                </label>

                                <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); transition:all 0.2s;" class="sub-plan-card">
                                    <input type="radio" name="classPaymentOption" value="PARTIAL" style="accent-color:var(--primary); width:18px; height:18px;">
                                    <div>
                                        <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">نظام تقسيط (سداد على دفعات) ⏳</div>
                                        <div style="font-size:0.74rem; color:var(--text-muted);">سداد دفعة أولى وتنسيق مواعيد استحقاق باقي الأقساط مع إدارة المنصة</div>
                                    </div>
                                </label>

                                <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; border:1.5px solid var(--border-color); cursor:pointer; background:var(--bg-app); transition:all 0.2s;" class="sub-plan-card">
                                    <input type="radio" name="classPaymentOption" value="UNPAID" style="accent-color:var(--primary); width:18px; height:18px;">
                                    <div>
                                        <div style="font-weight:800; font-size:0.88rem; color:var(--text-main);">حجز مقعد والدفع لاحقاً / لم يدفع بعد 🏦</div>
                                        <div style="font-size:0.74rem; color:var(--text-muted);">إرسال طلب الانضمام ومراجعة طرق التحويل والسداد مع الإدارة عبر الواتساب</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Dynamic Payment Fields (Amount & Remaining) -->
                        <div id="class-sub-amounts-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                            <div class="form-group" style="margin:0;">
                                <label for="class-sub-paid-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المدفوع الآن (ج.م) <span style="color:var(--error);">*</span></label>
                                <input type="number" id="class-sub-paid-amount" class="form-input" value="${totalPrice}" min="0" step="1" required style="border-radius:12px; padding:10px 14px; font-size:0.88rem;">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label for="class-sub-remaining-amount" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">المبلغ المتبقي (ج.م)</label>
                                <input type="number" id="class-sub-remaining-amount" class="form-input" value="0" readonly style="border-radius:12px; padding:10px 14px; font-size:0.88rem; background:var(--bg-app); color:var(--text-muted);">
                            </div>
                        </div>

                        <!-- Receipt Upload Section (Visible for PAID or PARTIAL) -->
                        <div id="class-sub-receipt-section" style="background:rgba(99,102,241,0.03); border:1.5px dashed var(--border-color); border-radius:14px; padding:14px;">
                            <label style="font-weight:800; font-size:0.84rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                                <span>🧾 صورة إيصال التحويل (إنستاباي / فودافون كاش / بنكي):</span>
                            </label>
                            <input type="file" id="class-sub-receipt-file" accept="image/*" class="form-input" style="border-radius:12px; padding:8px 12px; font-size:0.82rem; width:100%;">
                            <div id="class-sub-receipt-preview-container" style="display:none; margin-top:10px; text-align:center;">
                                <img id="class-sub-receipt-preview" src="" style="max-height:120px; border-radius:10px; border:2px solid var(--border-color); object-fit:contain;">
                            </div>
                        </div>

                        <!-- Provider & Sender Info -->
                        <div id="class-sub-provider-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                            <div class="form-group" style="margin:0;">
                                <label for="class-sub-provider" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">طريقة التحويل</label>
                                <select id="class-sub-provider" class="form-select" style="border-radius:12px; padding:10px 12px; font-size:0.86rem;">
                                    <option value="vodafone_cash">Vodafone Cash (فودافون كاش)</option>
                                    <option value="instapay">InstaPay (إنستاباي)</option>
                                    <option value="bank_transfer">تحويل بنكي</option>
                                    <option value="orange_cash">أورنج كاش</option>
                                    <option value="etisalat_cash">اتصالات كاش</option>
                                    <option value="cash">نقداً بالإدارة</option>
                                    <option value="other">أخرى</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label for="class-sub-sender-txid" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">رقم هاتف المحول أو رقم العملية</label>
                                <input type="text" id="class-sub-sender-txid" class="form-input" placeholder="010xxxxxxxx أو رقم العملية" style="border-radius:12px; padding:10px 14px; font-size:0.86rem;">
                            </div>
                        </div>

                        <!-- Notes -->
                        <div class="form-group" style="margin:0;">
                            <label for="class-sub-notes" style="font-weight:700; font-size:0.82rem; margin-bottom:4px; display:block;">ملاحظات إضافية أو طلبات خاصة (اختياري)</label>
                            <textarea id="class-sub-notes" class="form-input" rows="2" placeholder="أية تفاصيل ترغب بتوضيحها للإدارة..." style="border-radius:12px; padding:8px 12px; font-size:0.84rem;"></textarea>
                        </div>

                    </div>

                    <div style="padding:16px 24px; background:var(--bg-app); border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" id="cancel-student-class-sub-btn" class="btn-secondary" style="padding:9px 20px; border-radius:24px; font-size:0.86rem;">إلغاء</button>
                        <button type="submit" id="submit-student-class-sub-btn" class="btn-primary" style="padding:9px 24px; border-radius:24px; font-size:0.86rem; font-weight:800; background:linear-gradient(135deg, #2563eb, #10b981); border:none; color:#fff; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(37,99,235,0.3);">
                            <i data-lucide="send" style="width:15px; height:15px;"></i> إرسال طلب الاشتراك 🚀
                        </button>
                    </div>
                </form>

            </div>
        `;

        modalContainer.appendChild(modalDiv);
        if (window.lucide) window.lucide.createIcons();

        const closeModal = () => modalDiv.remove();
        modalDiv.querySelector("#close-student-class-sub-modal")?.addEventListener("click", closeModal);
        modalDiv.querySelector("#cancel-student-class-sub-btn")?.addEventListener("click", closeModal);

        const paidInput = modalDiv.querySelector("#class-sub-paid-amount");
        const remainingInput = modalDiv.querySelector("#class-sub-remaining-amount");
        const receiptSection = modalDiv.querySelector("#class-sub-receipt-section");
        const providerRow = modalDiv.querySelector("#class-sub-provider-row");
        const fileInput = modalDiv.querySelector("#class-sub-receipt-file");
        const previewContainer = modalDiv.querySelector("#class-sub-receipt-preview-container");
        const previewImg = modalDiv.querySelector("#class-sub-receipt-preview");

        // Radio change handling
        const radios = modalDiv.querySelectorAll('input[name="classPaymentOption"]');
        radios.forEach(radio => {
            radio.addEventListener("change", () => {
                const opt = radio.value;
                if (opt === "PAID") {
                    paidInput.value = totalPrice;
                    remainingInput.value = 0;
                    paidInput.readOnly = false;
                    receiptSection.style.display = "block";
                    providerRow.style.display = "grid";
                } else if (opt === "PARTIAL") {
                    const half = Math.round(totalPrice / 2);
                    paidInput.value = half;
                    remainingInput.value = Math.max(0, totalPrice - half);
                    paidInput.readOnly = false;
                    receiptSection.style.display = "block";
                    providerRow.style.display = "grid";
                } else { // UNPAID
                    paidInput.value = 0;
                    remainingInput.value = totalPrice;
                    paidInput.readOnly = true;
                    receiptSection.style.display = "none";
                    providerRow.style.display = "none";
                }
            });
        });

        // Paid amount auto-calculates remaining
        paidInput?.addEventListener("input", () => {
            const paidVal = Number(paidInput.value) || 0;
            remainingInput.value = Math.max(0, totalPrice - paidVal);
        });

        // Receipt preview
        fileInput?.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewContainer.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });

        // Form Submit
        modalDiv.querySelector("#student-class-sub-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = modalDiv.querySelector("#submit-student-class-sub-btn");
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = "جاري إرسال الطلب...";
            }

            try {
                const selectedOpt = modalDiv.querySelector('input[name="classPaymentOption"]:checked')?.value || "PAID";
                const paidAmount = Number(paidInput.value) || 0;
                const remainingAmount = Number(remainingInput.value) || 0;
                const provider = modalDiv.querySelector("#class-sub-provider")?.value;
                const providerTransactionId = modalDiv.querySelector("#class-sub-sender-txid")?.value.trim() || "";
                const notes = modalDiv.querySelector("#class-sub-notes")?.value.trim() || "";

                let receiptUrl = "";
                if (fileInput?.files?.[0]) {
                    const formData = new FormData();
                    formData.append("file", fileInput.files[0]);
                    const token = state.token || localStorage.getItem("token");
                    const uploadRes = await fetch("/api/upload", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                    });
                    if (uploadRes.ok) {
                        const data = await uploadRes.json();
                        receiptUrl = data.url;
                    }
                }

                const res = await apiFetch(`/curriculum/classes/${encodeURIComponent(this.classId)}/request-subscription`, {
                    method: "POST",
                    body: JSON.stringify({
                        paymentPlan: selectedOpt,
                        paidAmount,
                        remainingAmount,
                        receiptUrl,
                        provider,
                        providerTransactionId,
                        notes
                    })
                });

                closeModal();
                showToast(res.message || "تم إرسال طلب الاشتراك بنجاح! سيتم مراجعته وتفعيل باقتك فوراً.", "success");
            } catch (err) {
                showToast(err.message || "فشل إرسال طلب الاشتراك.", "error");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i data-lucide="send" style="width:15px; height:15px;"></i> إرسال طلب الاشتراك 🚀`;
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        });
    }
}
