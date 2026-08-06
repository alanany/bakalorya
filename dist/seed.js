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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seed() {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log("Database initialized for seeding...");
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
        const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
        const sessionRepository = data_source_1.AppDataSource.getRepository(Session_1.Session);
        const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
        // Clear existing data
        await enrollmentRepository.clear();
        await lessonRepository.clear();
        await courseRepository.clear();
        await sessionRepository.clear();
        await userRepository.clear();
        console.log("Existing database tables cleared.");
        // Create default accounts
        const passwordHash = await bcryptjs_1.default.hash("password123", 10);
        const student = new User_1.User();
        student.name = "Mohamed";
        student.email = "student@bakalorya.com";
        student.password = passwordHash;
        student.role = "student";
        student.avatar = "https://api.dicebear.com/7.x/adventurer/svg?seed=Mohamed";
        await userRepository.save(student);
        const teacher = new User_1.User();
        teacher.name = "Dr. Youssef Al-Hassan";
        teacher.email = "teacher@bakalorya.com";
        teacher.password = passwordHash;
        teacher.role = "teacher";
        teacher.avatar = "https://api.dicebear.com/7.x/adventurer/svg?seed=Youssef";
        await userRepository.save(teacher);
        const admin = new User_1.User();
        admin.name = "Bakalorya Admin";
        admin.email = "admin@bakalorya.com";
        admin.password = passwordHash;
        admin.role = "admin";
        admin.avatar = "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin";
        await userRepository.save(admin);
        console.log("Users created: student@bakalorya.com, teacher@bakalorya.com, admin@bakalorya.com (password: password123)");
        // Create Courses
        const mathCourse = new Course_1.Course();
        mathCourse.title = "Pure Mathematics: Limits, Derivatives & Integration";
        mathCourse.description = "A comprehensive preparation course covering the entire math syllabus for the scientific baccalaureate track. Learn calculus step-by-step with solved exams.";
        mathCourse.category = "Mathematics";
        mathCourse.image = "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60";
        mathCourse.teacher = teacher;
        await courseRepository.save(mathCourse);
        const physicsCourse = new Course_1.Course();
        physicsCourse.title = "Mastering Physics: Mechanics & Electromagnetism";
        physicsCourse.description = "From Newton's laws to electromagnetic waves, master all physics concepts, formulas, and experimental proofs required for the high school baccalaureate exam.";
        physicsCourse.category = "Physics";
        physicsCourse.image = "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500&auto=format&fit=crop&q=60";
        physicsCourse.teacher = teacher;
        await courseRepository.save(physicsCourse);
        const arabicCourse = new Course_1.Course();
        arabicCourse.title = "Arabic Grammar, Syntax & Poetry Analysis";
        arabicCourse.description = "Learn how to parse texts (I'rab) and analyze classical Arabic poetry. A structured curriculum designed for high scores in both literary and scientific tracks.";
        arabicCourse.category = "Arabic";
        arabicCourse.image = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60";
        arabicCourse.teacher = teacher;
        await courseRepository.save(arabicCourse);
        console.log("Courses created.");
        // Create Lessons for Mathematics
        const mathLessons = [
            {
                title: "Introduction to Limits & Continuity",
                description: "Understanding the concept of limits, intuitive definitions, left and right hand limits, and continuity on an interval.",
                videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
                duration: "09:32",
                chapter: "Chapter 1: Limits & Continuity",
                order: 1
            },
            {
                title: "Solving Indeterminate Forms (0/0, inf/inf)",
                description: "Advanced techniques for solving indeterminate limits using factorization, conjugates, and L'Hopital's rule.",
                videoUrl: "https://www.w3schools.com/html/movie.mp4",
                duration: "14:15",
                chapter: "Chapter 1: Limits & Continuity",
                order: 2
            },
            {
                title: "Basics of the Derivative & Rates of Change",
                description: "Definition of the derivative, geometric meaning as slope of the tangent line, and standard differentiation formulas.",
                videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
                duration: "11:05",
                chapter: "Chapter 2: Differentiation",
                order: 3
            },
            {
                title: "Chain Rule & Composite Functions",
                description: "How to differentiate composite functions using the chain rule, alongside trigonometric derivatives.",
                videoUrl: "https://www.w3schools.com/html/movie.mp4",
                duration: "18:40",
                chapter: "Chapter 2: Differentiation",
                order: 4
            },
            {
                title: "Introduction to Antiderivatives & Integrals",
                description: "Reversing differentiation: the concept of indefinite integration and fundamental theorem of calculus.",
                videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
                duration: "15:20",
                chapter: "Chapter 3: Integration",
                order: 5
            }
        ];
        const savedMathLessons = [];
        for (const l of mathLessons) {
            const lesson = new Lesson_1.Lesson();
            lesson.title = l.title;
            lesson.description = l.description;
            lesson.videoUrl = l.videoUrl;
            lesson.duration = l.duration;
            lesson.chapter = l.chapter;
            lesson.order = l.order;
            lesson.course = mathCourse;
            const saved = await lessonRepository.save(lesson);
            savedMathLessons.push(saved);
        }
        // Create Lessons for Physics
        const physicsLessons = [
            {
                title: "Newtonian Mechanics: Laws of Motion",
                description: "Deep dive into Newton's First, Second, and Third laws with interactive force diagrams and translational motion vector dynamics.",
                videoUrl: "https://www.w3schools.com/html/movie.mp4",
                duration: "12:50",
                chapter: "Chapter 1: Translational Dynamics",
                order: 1
            },
            {
                title: "Work, Energy & Power Theorem",
                description: "Calculating work done by constant and variable forces, kinetic vs potential energy, and mechanical energy conservation.",
                videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
                duration: "16:22",
                chapter: "Chapter 1: Translational Dynamics",
                order: 2
            },
            {
                title: "Electric Fields & Coulomb's Law",
                description: "Understanding electric charges, lines of forces, calculating electric field vectors of point charges, and voltage potential.",
                videoUrl: "https://www.w3schools.com/html/movie.mp4",
                duration: "14:10",
                chapter: "Chapter 2: Electromagnetism",
                order: 3
            }
        ];
        for (const l of physicsLessons) {
            const lesson = new Lesson_1.Lesson();
            lesson.title = l.title;
            lesson.description = l.description;
            lesson.videoUrl = l.videoUrl;
            lesson.duration = l.duration;
            lesson.chapter = l.chapter;
            lesson.order = l.order;
            lesson.course = physicsCourse;
            await lessonRepository.save(lesson);
        }
        console.log("Lessons created.");
        // Enroll student in Mathematics and Physics courses
        const mathEnrollment = new Enrollment_1.Enrollment();
        mathEnrollment.student = student;
        mathEnrollment.course = mathCourse;
        mathEnrollment.progress = 20; // 1 out of 5 lessons completed
        mathEnrollment.completedLessons = [savedMathLessons[0].id];
        await enrollmentRepository.save(mathEnrollment);
        const physicsEnrollment = new Enrollment_1.Enrollment();
        physicsEnrollment.student = student;
        physicsEnrollment.course = physicsCourse;
        physicsEnrollment.progress = 0;
        physicsEnrollment.completedLessons = [];
        await enrollmentRepository.save(physicsEnrollment);
        console.log("Student course enrollments completed.");
        // Create Live Sessions
        const liveSessionToday = new Session_1.Session();
        liveSessionToday.title = "Live Q&A: Integration & Definite Integrals Basics";
        liveSessionToday.description = "Join Dr. Youssef Al-Hassan for a live review session. We will solve past baccalaureate exam questions on calculus and definite integrals. Bring your questions!";
        liveSessionToday.teacher = teacher;
        const tenMinFromNow = new Date();
        tenMinFromNow.setMinutes(tenMinFromNow.getMinutes() + 10); // Start in 10 minutes
        liveSessionToday.scheduledAt = tenMinFromNow;
        liveSessionToday.duration = 60;
        liveSessionToday.status = "scheduled";
        await sessionRepository.save(liveSessionToday);
        const liveSessionTomorrow = new Session_1.Session();
        liveSessionTomorrow.title = "Electricity & Circuits: R-L-C Oscillations";
        liveSessionTomorrow.description = "Interactive class covering resistor-inductor-capacitor circuits, electrical resonance, and differential equations. Highly recommended for physics tracks.";
        liveSessionTomorrow.teacher = teacher;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(15, 0, 0, 0); // 3 PM tomorrow
        liveSessionTomorrow.scheduledAt = tomorrow;
        liveSessionTomorrow.duration = 90;
        liveSessionTomorrow.status = "scheduled";
        await sessionRepository.save(liveSessionTomorrow);
        console.log("Live sessions scheduled.");
        console.log("Seeding database finished successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}
seed();
