"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("./data-source");
const User_1 = require("./entity/User");
const Course_1 = require("./entity/Course");
const Lesson_1 = require("./entity/Lesson");
const Session_1 = require("./entity/Session");
const Enrollment_1 = require("./entity/Enrollment");
const Category_1 = require("./entity/Category");
const Subscription_1 = require("./entity/Subscription");
const SessionCreditLedger_1 = require("./entity/SessionCreditLedger");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seed() {
    try {
        await (0, data_source_1.initAppDataSource)();
        console.log("Database initialized for seeding...");
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
        const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
        const sessionRepository = data_source_1.AppDataSource.getRepository(Session_1.Session);
        const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
        const categoryRepository = data_source_1.AppDataSource.getRepository(Category_1.Category);
        const qaRepository = data_source_1.AppDataSource.getRepository("QuestionAnswer");
        // Clear all data cleanly
        if (data_source_1.AppDataSource.options.type === "mysql") {
            await data_source_1.AppDataSource.query("SET FOREIGN_KEY_CHECKS = 0;");
            await data_source_1.AppDataSource.query("TRUNCATE TABLE `question_answer`;").catch(() => { });
        }
        await enrollmentRepository.clear().catch(() => { });
        await lessonRepository.clear().catch(() => { });
        await courseRepository.clear().catch(() => { });
        await sessionRepository.clear().catch(() => { });
        await userRepository.clear().catch(() => { });
        await categoryRepository.clear().catch(() => { });
        await qaRepository.clear().catch(() => { });
        if (data_source_1.AppDataSource.options.type === "mysql") {
            await data_source_1.AppDataSource.query("SET FOREIGN_KEY_CHECKS = 1;");
        }
        console.log("All tables cleared.");
        // Seed official platform categories (All Egyptian Grades: Primary, Prep, Secondary, Azhar, KG)
        const initialCategories = [
            // ── Stage 1: المرحلة الثانوية (Secondary School) ──
            { name: "اللغة العربية - الثانوية العامة", description: "النحو والصرّف، البلاغة، الأدب، والنصوص للمرحلة الثانوية", icon: "book-open" },
            { name: "اللغة الإنجليزية - الثانوية العامة", description: "منهج اللغة الإنجليزية والتراكيب اللغوية للمرحلة الثانوية", icon: "languages" },
            { name: "اللغة الفرنسية - الثانوية العامة", description: "اللغة الأجنبية الثانية (Français)", icon: "message-square" },
            { name: "اللغة الألمانية - الثانوية العامة", description: "اللغة الأجنبية الثانية (Deutsch)", icon: "globe" },
            { name: "اللغة الإيطالية - الثانوية العامة", description: "اللغة الأجنبية الثانية (Italiano)", icon: "sparkles" },
            { name: "اللغة الإسبانية - الثانوية العامة", description: "اللغة الأجنبية الثانية (Español)", icon: "compass" },
            { name: "الفيزياء - المرحلة الثانوية", description: "الكهربية والمغناطيسية والفيزياء الحديثة - شعبة علمي", icon: "zap" },
            { name: "الكيمياء - المرحلة الثانوية", description: "الكيمياء غير العضوية والتحليلية والعضوية - شعبة علمي", icon: "flask-conical" },
            { name: "الأحياء - المرحلة الثانوية", description: "التركيب والوظيفة والبيولوجيا الجزيئية - علمي علوم", icon: "dna" },
            { name: "الجيولوجيا والعلوم البيئية", description: "مكونات الأرض والتطور الصخري والبيئة - علمي علوم", icon: "mountain" },
            { name: "التفاضل والتكامل - الثانوي", description: "الرياضيات البحتة - شعبة علمي رياضة", icon: "calculator" },
            { name: "الجبر والهندسة الفراغية - الثانوي", description: "الرياضيات البحتة والمصفوفات والأشكال الفراغية - شعبة علمي رياضة", icon: "shapes" },
            { name: "الاستاتيكا والديناميكا - الثانوي", description: "الرياضيات التطبيقية وقوانين الحركة والاتزان - شعبة علمي رياضة", icon: "activity" },
            { name: "الرياضيات العامة - أولى وثانية ثانوي", description: "الجبر وحساب المثلثات والهندسة التحليلية", icon: "calculator" },
            { name: "التاريخ - المرحلة الثانوية", description: "تاريخ مصر الحديث والمعاصر والشرق الأوسط - الشعبة الأدبية", icon: "landmark" },
            { name: "الجغرافيا السياسيّة - الثانوي", description: "مقومات الدولة والجغرافيا الاقتصادية والسياسية - الشعبة الأدبية", icon: "map-pin" },
            { name: "الفلسفة والمنطق - الثانوي", description: "الفلسفة التطبيقية والبيئية والمنطق الرمزي - الشعبة الأدبية", icon: "feather" },
            { name: "علم النفس والاجتماع - الثانوي", description: "مبادئ التعلم والنمو وعلم الاجتماع البشري - الشعبة الأدبية", icon: "smile" },
            { name: "القرآن الكريم والعلوم الشرعية (الأزهر)", description: "التفسير والفقه والحديث والتجويد - الثانوية الأزهرية", icon: "book-marked" },
            { name: "الحاسب الآلي وتكنولوجيا المعلومات (ICT)", description: "البرمجة وقواعد البيانات والذكاء الاصطناعي", icon: "cpu" },
            { name: "الإحصاء والاقتصاد - الثانوي", description: "المفاهيم الاقتصادية والتحليل الإحصائي للبيانات", icon: "bar-chart-2" },
            // ── Stage 2: المرحلة الإعدادية (Preparatory School) ──
            { name: "اللغة العربية - المرحلة الإعدادية", description: "منهج القراءة والنصوص والنحو والإملاء للإعدادية", icon: "book-open" },
            { name: "اللغة الإنجليزية - المرحلة الإعدادية", description: "منهج اللغة الإنجليزية والتواصل للإعدادية", icon: "languages" },
            { name: "الرياضيات - المرحلة الإعدادية", description: "الجبر والهندسة وحساب المثلثات للإعدادية", icon: "calculator" },
            { name: "العلوم - المرحلة الإعدادية", description: "الفيزياء والكيمياء والأحياء المبسطة للإعدادية", icon: "flask-conical" },
            { name: "الدراسات الاجتماعية - المرحلة الإعدادية", description: "التاريخ والجغرافيا الوطنية والإقليمية للإعدادية", icon: "globe" },
            { name: "التربية الدينية الإسلامية - الإعدادية", description: "السيرة والعقيدة والأحكام والأخلاق الإسلامية", icon: "bookmark" },
            { name: "تكنولوجيا المعلومات والاتصالات - الإعدادية", description: "مبادئ الحاسب الآلي والإنترنت والبرمجة المبسطة", icon: "cpu" },
            // ── Stage 3: المرحلة الابتدائية (Primary School) ──
            { name: "اللغة العربية - المرحلة الابتدائية", description: "تأسيس القراءة والنحو والقواعد والخط العربي", icon: "book-open" },
            { name: "اللغة الإنجليزية - الابتدائية (Connect)", description: "مناهج Connect & Connect Plus والتأسيس اللغوي", icon: "languages" },
            { name: "الرياضيات (Math) - المرحلة الابتدائية", description: "أساسيات الحساب والعمليات الرياضية والهندسة الابتدائية", icon: "calculator" },
            { name: "العلوم (Science) - المرحلة الابتدائية", description: "استكشاف الطبيعة والحيوانات والمادة والمناخ", icon: "zap" },
            { name: "الدراسات الاجتماعية - المرحلة الابتدائية", description: "معالم مصر الجغرافية والتاريخية المبسطة", icon: "map-pin" },
            { name: "المهارات المهنية - المرحلة الابتدائية", description: "المهارات العملية والتفكير الإبداعي والحرف", icon: "hammer" },
            { name: "القيم واحترام الآخر - الابتدائية", description: "الأخلاق والتربية السلوكية والقيم الإنسانية", icon: "heart" },
            { name: "تكنولوجيا المعلومات ICT - الابتدائية", description: "التعامل الرقمي الآمن وأساسيات الكومبيوتر", icon: "laptop" },
            // ── Stage 4: رياض الأطفال والتأسيس (KG & Foundation) ──
            { name: "تأسيس لغة عربية وقراءة مبكرة", description: "تعليم الحروف والتشكيل والتهجي للأطفال", icon: "smile" },
            { name: "تأسيس إنجليزي وفونكس (Phonics)", description: "نطق الأصوات والكلمات الأولى وتأسيس الإنجليزية", icon: "music" },
            { name: "تأسيس رياضيات وحساب ذهني (Mental Math)", description: "الأرقام والعد والعمليات الحسابية السريعة للأطفال", icon: "plus-circle" }
        ];
        for (const catData of initialCategories) {
            const cat = categoryRepository.create(catData);
            await categoryRepository.save(cat);
        }
        console.log("✅ Platform Categories seeded.");
        // Create only the base accounts — no fake courses or sessions
        const passwordHash = await bcryptjs_1.default.hash("password123", 10);
        const adminPasswordHash = await bcryptjs_1.default.hash("admin123", 10);
        const student = userRepository.create({
            name: "طالب تجريبي",
            email: "student@bakalorya.com",
            password: passwordHash,
            role: "student",
            phone: "+20 01012345678",
            parentPhone: "+20 01099887766",
            avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Student"
        });
        await userRepository.save(student);
        const teacher = userRepository.create({
            name: "معلم تجريبي",
            email: "teacher@bakalorya.com",
            password: passwordHash,
            role: "teacher",
            avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher"
        });
        await userRepository.save(teacher);
        const admin = userRepository.create({
            name: "مشرف باكالوريا",
            email: "admin@bakalorya.com",
            password: adminPasswordHash,
            role: "admin",
            avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin"
        });
        await userRepository.save(admin);
        const blogRepository = data_source_1.AppDataSource.getRepository("Blog");
        await blogRepository.clear();
        const blog1 = blogRepository.create({
            title: "أفضل 5 طرق لتنظيم الوقت وتفادي التوتر أثناء التحضير للبكالوريا",
            content: "تعلم كيفية بناء جدول مراجعة أسبوعي متوازن يجمع بين التركيز العالي وأوقات الراحة المستحقة لضمان تحصيل أفضل النتائج.",
            category: "📐 تنظيم الوقت",
            image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600",
            readTime: "📖 5 دقائق قراءة",
            author: teacher
        });
        const blog2 = blogRepository.create({
            title: "كيف تتجنب الأخطاء الشائعة في تمارين الفيزياء والكيمياء؟",
            content: "دليل خطوة بخطوة لفهم صياغة الأسئلة وتحليل الدارات الكهربائية والتفاعلات الكيميائية بدقة تامة والابتعاد عن التسرع.",
            category: "⚡ منهجية الامتحانات",
            image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600",
            readTime: "📖 7 دقائق قراءة",
            author: teacher
        });
        const blog3 = blogRepository.create({
            title: "أسرار الحصول على علامة ممتازة في البلاغة والتعبير الكتابي",
            content: "نماذج تطبيقية وطرق التعبير الأدبي وتلخيص النصوص بأسلوب متميز يضمن إعجاب المصحح والحصول على النقاط المكتملة.",
            category: "📖 الإنشاء والتعبير",
            image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600",
            readTime: "📖 4 دقائق قراءة",
            author: teacher
        });
        await blogRepository.save([blog1, blog2, blog3]);
        console.log("✅ Initial blog articles seeded.");
        // Seed sample initial Baccalaureate courses
        const course1 = courseRepository.create({
            title: "الدورة الشاملة في الرياضيات - باكالوريا 2026",
            description: "شرح وافٍ وتطبيقات شاملة في الدوال العددية، المتتاليات، والاحتمالات مخصصة لشعب العلوم، الرياضيات وتقني رياضي.",
            category: "الرياضيات",
            degree: "3ème AS - BAC",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60",
            meetingLink: "https://zoom.us/j/123456789",
            teacher: teacher
        });
        const course2 = courseRepository.create({
            title: "العلوم الفيزيائية والتركيز العالي (وحدات المتابعة والكهرباء)",
            description: "تمارين نموذجية وموضوعات محلولة بدقة عالية في الكيمياء والفيزياء لفهم المتابعة الزمنية والدارة RC و RL.",
            category: "العلوم الفيزيائية",
            degree: "3ème AS - BAC",
            image: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=60",
            meetingLink: "https://zoom.us/j/987654321",
            teacher: teacher
        });
        const course3 = courseRepository.create({
            title: "علوم الطبيعة والحياة - تركيب البروتين والإنزيمات",
            description: "منهجية الإجابة الدقيقة وتحديد آليات الاستدلال العلمي لضمان النقطة الكاملة في تمارين علوم الحياة.",
            category: "علوم الطبيعة والحياة",
            degree: "3ème AS - BAC",
            image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=60",
            meetingLink: "https://zoom.us/j/456789123",
            teacher: teacher
        });
        await courseRepository.save([course1, course2, course3]);
        // Seed lessons for course 1
        const lesson1 = lessonRepository.create({
            title: "الدرس الأول: دراسة تغيرات الدوال وإثبات وجود الحلول",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description: "شرح تفصيلي لدراسة التغيرات وجدول الإشارات للمتتاليات والدوال",
            duration: "45:00",
            chapter: "الوحدة الأولى: الدوال العددية",
            order: 1,
            course: course1
        });
        const lesson2 = lessonRepository.create({
            title: "الدرس الثاني: المتتاليات الحسابية والهندسية وعلاقات التراجع",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description: "طرق البرهان بالتراجع وحساب عبارات الحد العام والمجموع",
            duration: "50:00",
            chapter: "الوحدة الثانية: المتتاليات",
            order: 2,
            course: course1
        });
        await lessonRepository.save([lesson1, lesson2]);
        console.log("✅ Initial Baccalaureate Courses & Lessons seeded.");
        // Seed Subscription Plans
        const planRepository = data_source_1.AppDataSource.getRepository("SubscriptionPlan");
        const basicPlan = planRepository.create({
            name: "الباقة الأساسية (4 حصص / شهر)",
            description: "حصة أسبوعية واحدة مباشرة 1-على-1 مع أستاذك المفضل مع متابعة شاملة",
            sessionsCount: 4,
            price: 600,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 60,
            isActive: true
        });
        const standardPlan = planRepository.create({
            name: "الباقة القياسية (8 حصص / شهر)",
            description: "حصتان أسبوعياً للتركيز وتغطية كافة الوحدات والتمارين المنهجية التطبيقية",
            sessionsCount: 8,
            price: 1100,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 60,
            isActive: true
        });
        const premiumPlan = planRepository.create({
            name: "الباقة المكثفة (12 حصة / شهر)",
            description: "3 حصص أسبوعياً للمكثف والمراجعات الشاملة لحصد أعلى العلامات في البكالوريا",
            sessionsCount: 12,
            price: 1500,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 60,
            isActive: true
        });
        const plan30_4 = planRepository.create({
            name: "باقة المراجعة السريعة (4 حصص / 30 دقيقة)",
            description: "4 حصص شهرياً مدة الحصة 30 دقيقة للمراجعات السريعة وحل الأسئلة المحددة",
            sessionsCount: 4,
            price: 400,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 30,
            isActive: true
        });
        const plan30_8 = planRepository.create({
            name: "باقة الدعم المنتظم (8 حصص / 30 دقيقة)",
            description: "8 حصص شهرياً مدة الحصة 30 دقيقة للتثبيت المستمر للمفاهيم الأساسية",
            sessionsCount: 8,
            price: 750,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 30,
            isActive: true
        });
        const plan40_4 = planRepository.create({
            name: "الباقة الاقتصادية (4 حصص / 40 دقيقة)",
            description: "4 حصص شهرياً مدة الحصة 40 دقيقة، شرح مبسط وتركيز على النقاط الهامة",
            sessionsCount: 4,
            price: 500,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 40,
            isActive: true
        });
        const plan40_8 = planRepository.create({
            name: "الباقة المتوازنة (8 حصص / 40 دقيقة)",
            description: "8 حصص شهرياً مدة الحصة 40 دقيقة لضمان الفهم والتدريب على الامتحانات",
            sessionsCount: 8,
            price: 950,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 40,
            isActive: true
        });
        const plan40_12 = planRepository.create({
            name: "الباقة الشاملة (12 حصة / 40 دقيقة)",
            description: "12 حصة شهرياً مدة الحصة 40 دقيقة لمتابعة مكثفة وتحصيل دراسي عالي",
            sessionsCount: 12,
            price: 1350,
            currency: "EGP",
            durationDays: 30,
            sessionDurationMins: 40,
            isActive: true
        });
        await planRepository.save([basicPlan, standardPlan, premiumPlan, plan30_4, plan30_8, plan40_4, plan40_8, plan40_12]);
        console.log("✅ Initial Monthly Subscription Plans (60, 40 & 30 mins) seeded.");
        // Seed Sample Student Subscription
        const subRepo = data_source_1.AppDataSource.getRepository(Subscription_1.Subscription);
        const sub = subRepo.create({
            student: student,
            teacher: teacher,
            plan: standardPlan,
            totalSessions: 8,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "ACTIVE"
        });
        await subRepo.save(sub);
        // Seed Credit Ledger Entry (+8 credits)
        const ledgerRepo = data_source_1.AppDataSource.getRepository(SessionCreditLedger_1.SessionCreditLedger);
        const ledger = ledgerRepo.create({
            subscription: sub,
            amount: 8,
            type: "SUBSCRIPTION_PURCHASE",
            reason: "شراء الباقة القياسية (8 حصص / شهر)",
            createdBy: student
        });
        await ledgerRepo.save(ledger);
        // Seed Sample Sessions
        const now = new Date();
        const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days in future
        const liveSession = sessionRepository.create({
            title: "بث مباشر: حل مسائل وموضوعات النموذجية لربط وحدات الدوال والفيزياء",
            description: "جلسة تطبيقية تفاعلية لمراجعة أسئلة الامتحانات المنهجية بدقة",
            scheduledAt: now,
            duration: 60,
            status: "live",
            course: course1,
            teacher: teacher
        });
        const scheduledPrivateSession = sessionRepository.create({
            title: "حصة خاصة 1-على-1: مراجعة شاملة في متتاليات التراجع والبرهان بالتراجع",
            description: "جلسة فردية مع الطالب لشرح الصعوبات وتثبيت قواعد المتتاليات",
            scheduledAt: futureDate,
            duration: 60,
            status: "SCHEDULED",
            subscription: sub,
            student: student,
            teacher: teacher
        });
        const completedPrivateSession = sessionRepository.create({
            title: "حصة خاصة 1-على-1: أساسيات التفاضل والتكامل وتعيين ثوابت الدوال",
            description: "متابعة وتقييم مستوى الطالب في اشتقاق الدوال العددية",
            scheduledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            completedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
            duration: 60,
            status: "COMPLETED",
            topic: "الدوال والاشتقاقية",
            whatWasCovered: "دراسة الاتصال والاشتقاق وتعيين مماس المنحنى C_f",
            studentPerformance: "ممتاز ومستعد بشكل رائع مع انضباط تام",
            homework: "حل التمرينين 14 و 15 ص 45 من الكتاب المدرسي",
            teacherNotes: "تم الخصم بنجاح وتسجيل الرصيد",
            subscription: sub,
            student: student,
            teacher: teacher
        });
        await sessionRepository.save([liveSession, scheduledPrivateSession, completedPrivateSession]);
        console.log("✅ Initial Live Classrooms & 1-on-1 Private Sessions seeded.");
        console.log("🎉 Seeding completed successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}
seed();
