import { AppDataSource } from "./data-source";
import { User } from "./entity/User";
import { Course } from "./entity/Course";
import { Lesson } from "./entity/Lesson";
import { Session } from "./entity/Session";
import { Enrollment } from "./entity/Enrollment";
import { Category } from "./entity/Category";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log("Database initialized for seeding...");

    const userRepository     = AppDataSource.getRepository(User);
    const courseRepository   = AppDataSource.getRepository(Course);
    const lessonRepository   = AppDataSource.getRepository(Lesson);
    const sessionRepository  = AppDataSource.getRepository(Session);
    const enrollmentRepository = AppDataSource.getRepository(Enrollment);
    const categoryRepository = AppDataSource.getRepository(Category);

    // Clear all data cleanly
    if (AppDataSource.options.type === "mysql") {
      await AppDataSource.query("SET FOREIGN_KEY_CHECKS = 0;");
    }
    await enrollmentRepository.clear();
    await lessonRepository.clear();
    await courseRepository.clear();
    await sessionRepository.clear();
    await userRepository.clear();
    await categoryRepository.clear();
    if (AppDataSource.options.type === "mysql") {
      await AppDataSource.query("SET FOREIGN_KEY_CHECKS = 1;");
    }

    console.log("All tables cleared.");

    // Seed official platform categories
    const initialCategories = [
      { name: "الرياضيات", description: "دروس وتمارين مادة الرياضيات للبكالوريا", icon: "calculator" },
      { name: "العلوم الفيزيائية", description: "دروس الفيزياء والكيمياء", icon: "zap" },
      { name: "علوم الطبيعة والحياة", description: "علم الأحياء والتجارب المخبرية", icon: "dna" },
      { name: "اللغة العربية وآدابها", description: "منهجية التعبير والنشاطات اللغوية", icon: "book-open" },
      { name: "الهندسة الكهربائية", description: "شعبة تقني رياضي - كهرباء", icon: "cpu" },
      { name: "الهندسة المدنية", description: "شعبة تقني رياضي - بناء ومنشآت", icon: "building" },
      { name: "الهندسة الميكانيكية", description: "شعبة تقني رياضي - ميكانيك", icon: "settings" },
      { name: "الفلسفة", description: "المقالات الفلسفية وتحليل النصوص", icon: "feather" },
      { name: "التاريخ والجغرافيا", description: "مصطلحات وشخصيات وخرائط", icon: "globe" },
      { name: "اللغة الإنجليزية", description: "قواعد ولغة إنجليزية", icon: "languages" },
      { name: "اللغة الفرنسية", description: "دروس اللغة الفرنسية", icon: "message-square" },
      { name: "التربية الإسلامية", description: "العلوم الإسلامية للبكالوريا", icon: "bookmark" }
    ];

    for (const catData of initialCategories) {
      const cat = categoryRepository.create(catData);
      await categoryRepository.save(cat);
    }
    console.log("✅ Platform Categories seeded.");

    // Create only the base accounts — no fake courses or sessions
    const passwordHash      = await bcrypt.hash("password123", 10);
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    const student = userRepository.create({
      name:     "طالب تجريبي",
      email:    "student@bakalorya.com",
      password: passwordHash,
      role:     "student",
      avatar:   "https://api.dicebear.com/7.x/adventurer/svg?seed=Student"
    });
    await userRepository.save(student);

    const teacher = userRepository.create({
      name:     "معلم تجريبي",
      email:    "teacher@bakalorya.com",
      password: passwordHash,
      role:     "teacher",
      avatar:   "https://api.dicebear.com/7.x/adventurer/svg?seed=Teacher"
    });
    await userRepository.save(teacher);

    const admin = userRepository.create({
      name:     "مشرف باكالوريا",
      email:    "admin@bakalorya.com",
      password: adminPasswordHash,
      role:     "admin",
      avatar:   "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin"
    });
    await userRepository.save(admin);

    const blogRepository = AppDataSource.getRepository("Blog");
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

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
