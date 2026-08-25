"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const data_source_1 = require("../data-source");
const Course_1 = require("../entity/Course");
const Lesson_1 = require("../entity/Lesson");
const User_1 = require("../entity/User");
const Enrollment_1 = require("../entity/Enrollment");
const Payment_1 = require("../entity/Payment");
const NotificationController_1 = require("./NotificationController");
const whatsapp_1 = require("../utils/whatsapp");
class CourseController {
    static async getAll(req, res) {
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const courses = await courseRepository.find({ relations: ["teacher"] });
            return res.status(200).json(courses);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async getOne(req, res) {
        const { id } = req.params;
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
            const course = await courseRepository.findOne({
                where: { id },
                relations: ["teacher"]
            });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            const lessons = await lessonRepository.find({
                where: { course: { id } },
                order: { order: "ASC" },
            });
            return res.status(200).json({ ...course, lessons });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async create(req, res) {
        const { title, description, category, degree, image, meetingLink, price, isFree, currency, paymentDetails } = req.body;
        if (!title || !description || !category) {
            return res.status(400).json({ error: "Missing title, description, or category." });
        }
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
            const teacher = await userRepository.findOneBy({ id: req.user.id });
            if (!teacher) {
                return res.status(404).json({ error: "Teacher profile not found." });
            }
            const course = new Course_1.Course();
            course.title = title;
            course.description = description;
            course.category = category;
            course.degree = degree || null;
            course.meetingLink = meetingLink || null;
            course.image = image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60";
            course.teacher = teacher;
            const numericPrice = parseFloat(price) || 0;
            const courseIsFree = isFree === true || isFree === "true" || numericPrice === 0;
            course.price = courseIsFree ? 0 : numericPrice;
            course.isFree = courseIsFree;
            course.currency = currency || "EGP";
            course.paymentDetails = paymentDetails || null;
            course.status = req.user.role === "admin" ? "PUBLISHED" : "PENDING_REVIEW";
            await courseRepository.save(course);
            return res.status(201).json(course);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    // Teacher submits course for Admin review
    static async submitForReview(req, res) {
        const { id } = req.params;
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const course = await courseRepository.findOne({
                where: { id },
                relations: ["teacher"]
            });
            if (!course)
                return res.status(404).json({ error: "الدورة غير موجودة." });
            if (course.teacher && course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "غير مصرح لك بتحديث هذه الدورة." });
            }
            course.status = "PENDING_REVIEW";
            await courseRepository.save(course);
            return res.status(200).json({ message: "تم إرسال الدورة للمراجعة والاعتماد من قبل الإدارة بنجاح! ⏳", course });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    // Admin approves course (attaching payment details if paid)
    static async approveCourse(req, res) {
        const { id } = req.params;
        const { paymentDetails, price, isFree, currency } = req.body || {};
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const course = await courseRepository.findOneBy({ id });
            if (!course)
                return res.status(404).json({ error: "الدورة غير موجودة." });
            if (paymentDetails !== undefined)
                course.paymentDetails = paymentDetails;
            if (price !== undefined) {
                const numericPrice = parseFloat(price) || 0;
                course.price = numericPrice;
                course.isFree = numericPrice === 0 || isFree === true || isFree === "true";
            }
            if (currency !== undefined)
                course.currency = currency;
            course.status = "PUBLISHED";
            course.approvedBy = { id: req.user.id };
            course.approvedAt = new Date();
            course.rejectionReason = null;
            await courseRepository.save(course);
            return res.status(200).json({ message: "تمت الموافقة على نشر الدورة وإرفاق بيانات الدفع بنجاح! 🎉", course });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    // Admin rejects course
    static async rejectCourse(req, res) {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const course = await courseRepository.findOneBy({ id });
            if (!course)
                return res.status(404).json({ error: "الدورة غير موجودة." });
            course.status = "DRAFT";
            course.rejectionReason = rejectionReason || "المحتوى غير مطابق لشروط الأكاديمية.";
            await courseRepository.save(course);
            return res.status(200).json({ message: "تم رفض الاعتماد وتوجيه الدورة للمسودة مع إرسال السبب.", course });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    // Admin lists pending courses for review
    static async getPendingCourses(req, res) {
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const courses = await courseRepository.find({
                where: { status: "PENDING_REVIEW" },
                relations: ["teacher", "lessons"],
                order: { createdAt: "DESC" }
            });
            return res.status(200).json(courses);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async addLesson(req, res) {
        const { courseId } = req.params;
        const { title, description, videoUrl, duration, chapter, order, photo, notes, resourceUrl, resourceTitle, questions, objectives } = req.body;
        if (!title) {
            return res.status(400).json({ error: "عنوان الدرس مطلوب." });
        }
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
            const course = await courseRepository.findOne({
                where: { id: courseId },
                relations: ["teacher"]
            });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            if (course.teacher && course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
            }
            const lesson = new Lesson_1.Lesson();
            lesson.title = title;
            lesson.description = description || null;
            lesson.videoUrl = videoUrl || null;
            lesson.duration = duration || "0:00";
            lesson.chapter = chapter || "General";
            lesson.order = typeof order === "number" ? order : 0;
            lesson.photo = photo || null;
            lesson.notes = notes || null;
            lesson.resourceUrl = resourceUrl || null;
            lesson.resourceTitle = resourceTitle || null;
            lesson.questions = Array.isArray(questions) ? questions : [];
            lesson.objectives = Array.isArray(objectives) ? objectives : [];
            lesson.course = course;
            await lessonRepository.save(lesson);
            return res.status(201).json(lesson);
        }
        catch (err) {
            console.error("addLesson error:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async update(req, res) {
        const { id } = req.params;
        const { title, description, category, degree, image, meetingLink, price, isFree, currency, paymentDetails } = req.body;
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const course = await courseRepository.findOne({
                where: { id },
                relations: ["teacher"]
            });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            if (course.teacher && course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
            }
            if (title)
                course.title = title;
            if (description !== undefined)
                course.description = description;
            if (category !== undefined)
                course.category = category;
            if (degree !== undefined)
                course.degree = degree;
            if (image !== undefined)
                course.image = image;
            if (meetingLink !== undefined)
                course.meetingLink = meetingLink;
            if (price !== undefined) {
                const numericPrice = parseFloat(price) || 0;
                course.price = numericPrice;
                course.isFree = numericPrice === 0 || isFree === true || isFree === "true";
            }
            else if (isFree !== undefined) {
                course.isFree = isFree === true || isFree === "true";
                if (course.isFree)
                    course.price = 0;
            }
            if (currency !== undefined)
                course.currency = currency;
            if (paymentDetails !== undefined)
                course.paymentDetails = paymentDetails;
            await courseRepository.save(course);
            return res.status(200).json(course);
        }
        catch (err) {
            console.error("Course update error:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async updateLesson(req, res) {
        const { id } = req.params;
        const { title, description, videoUrl, duration, chapter, order, photo, notes, resourceUrl, resourceTitle, questions, objectives } = req.body;
        try {
            const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
            const lesson = await lessonRepository.findOne({
                where: { id },
                relations: ["course", "course.teacher"]
            });
            if (!lesson) {
                return res.status(404).json({ error: "Lesson not found." });
            }
            if (lesson.course?.teacher && lesson.course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
            }
            if (title)
                lesson.title = title;
            if (description !== undefined)
                lesson.description = description;
            if (videoUrl !== undefined)
                lesson.videoUrl = videoUrl || null;
            if (duration)
                lesson.duration = duration;
            if (chapter)
                lesson.chapter = chapter;
            if (typeof order === "number")
                lesson.order = order;
            if (photo !== undefined)
                lesson.photo = photo || null;
            if (notes !== undefined)
                lesson.notes = notes;
            if (resourceUrl !== undefined)
                lesson.resourceUrl = resourceUrl;
            if (resourceTitle !== undefined)
                lesson.resourceTitle = resourceTitle;
            if (questions !== undefined)
                lesson.questions = Array.isArray(questions) ? questions : [];
            if (objectives !== undefined)
                lesson.objectives = Array.isArray(objectives) ? objectives : [];
            await lessonRepository.save(lesson);
            return res.status(200).json(lesson);
        }
        catch (err) {
            console.error("updateLesson error:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async deleteLesson(req, res) {
        const { id } = req.params;
        try {
            const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
            const lesson = await lessonRepository.findOne({
                where: { id },
                relations: ["course", "course.teacher"]
            });
            if (!lesson) {
                return res.status(404).json({ error: "Lesson not found." });
            }
            if (lesson.course?.teacher && lesson.course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
            }
            await lessonRepository.remove(lesson);
            return res.status(200).json({ message: "Lesson deleted successfully." });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async deleteCourse(req, res) {
        const { id } = req.params;
        try {
            const courseRepo = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const course = await courseRepo.findOne({
                where: { id },
                relations: ["teacher", "enrollments"]
            });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            if (course.teacher && course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden." });
            }
            const activeEnrollmentsCount = course.enrollments ? course.enrollments.filter(e => e.status === "active").length : 0;
            // Protection: if course has active enrolled students and action is from teacher without force
            if (activeEnrollmentsCount > 0 && req.user.role !== "admin" && req.query.force !== "true") {
                return res.status(400).json({
                    error: `تنبيه: يوجد ${activeEnrollmentsCount} طالب مسجل بهذه الدورة. يوصى بإبقاء الدورة لحماية حق المشتركين، أو تواصل مع المشرف العام.`,
                    hasStudents: true
                });
            }
            await courseRepo.remove(course);
            return res.json({ message: "تم حذف الدورة بنجاح." });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to delete course." });
        }
    }
    static async getEnrollmentRequests(req, res) {
        try {
            let requests = [];
            if (req.user?.role === "teacher") {
                const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
                const teacher = await userRepo.findOneBy({ id: req.user.id });
                if (teacher && teacher.teacherCapabilities && Array.isArray(teacher.teacherCapabilities) && !teacher.teacherCapabilities.includes("COURSE_INSTRUCTOR")) {
                    return res.status(200).json([]);
                }
            }
            if (req.user?.role === "admin") {
                // Admin sees all enrollment requests from all courses
                requests = await data_source_1.AppDataSource.query(`
          SELECT 
            e.id, e.status, e.createdAt,
            u.id as studentId, u.name as studentName, u.email as studentEmail,
            u.phone as studentPhone, u.parentPhone as studentParentPhone, u.avatar as studentAvatar,
            u.location as studentLocation, u.education as studentEducation,
            c.id as courseId, c.title as courseTitle,
            t.id as teacherId, t.name as teacherName
          FROM enrollment e
          JOIN user u ON u.id = e.studentId
          JOIN course c ON c.id = e.courseId
          JOIN user t ON t.id = c.teacherId
          ORDER BY e.createdAt DESC
        `);
            }
            else {
                // Teacher sees all enrollment requests for their own courses
                requests = await data_source_1.AppDataSource.query(`
          SELECT 
            e.id, e.status, e.createdAt,
            u.id as studentId, u.name as studentName, u.email as studentEmail,
            u.phone as studentPhone, u.parentPhone as studentParentPhone, u.avatar as studentAvatar,
            u.location as studentLocation, u.education as studentEducation,
            c.id as courseId, c.title as courseTitle,
            t.id as teacherId, t.name as teacherName
          FROM enrollment e
          JOIN user u ON u.id = e.studentId
          JOIN course c ON c.id = e.courseId
          JOIN user t ON t.id = c.teacherId
          WHERE c.teacherId = ?
          ORDER BY e.createdAt DESC
        `, [req.user.id]);
            }
            // Reshape to match the existing frontend format
            const shaped = requests.map((row) => ({
                id: row.id,
                status: row.status,
                createdAt: row.createdAt,
                student: {
                    id: row.studentId,
                    name: row.studentName,
                    email: row.studentEmail,
                    phone: row.studentPhone,
                    parentPhone: row.studentParentPhone,
                    avatar: row.studentAvatar,
                    location: row.studentLocation,
                    education: row.studentEducation
                },
                course: {
                    id: row.courseId,
                    title: row.courseTitle,
                    teacher: { id: row.teacherId, name: row.teacherName }
                }
            }));
            return res.status(200).json(shaped);
        }
        catch (err) {
            console.error("Error fetching enrollment requests:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async updateEnrollmentRequest(req, res) {
        const { id } = req.params;
        const { status, paymentData } = req.body; // 'active' or 'rejected'; paymentData is optional
        if (!status || !["active", "rejected"].includes(status)) {
            return res.status(400).json({ error: "Invalid status." });
        }
        if (req.user?.role === "teacher") {
            const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
            const teacher = await userRepo.findOneBy({ id: req.user.id });
            if (teacher && teacher.teacherCapabilities && Array.isArray(teacher.teacherCapabilities) && !teacher.teacherCapabilities.includes("COURSE_INSTRUCTOR")) {
                return res.status(403).json({ error: "عفواً، لا تملك صلاحية قبول وإدارة طلبات التسجيل بالدورات (COURSE_INSTRUCTOR)." });
            }
        }
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollment = await enrollmentRepository.findOne({
                where: { id },
                relations: ["student", "course", "course.teacher"]
            });
            if (!enrollment) {
                return res.status(404).json({ error: "Enrollment not found." });
            }
            enrollment.status = status;
            // Create Payment record if accepting and paymentData provided
            if (status === "active" && paymentData) {
                try {
                    const paymentRepository = data_source_1.AppDataSource.getRepository(Payment_1.Payment);
                    const payment = new Payment_1.Payment();
                    payment.student = enrollment.student;
                    payment.amount = parseFloat(paymentData.amount) || 0;
                    payment.currency = paymentData.currency || "EGP";
                    payment.type = "COURSE_ENROLLMENT";
                    payment.courseEnrollment = enrollment;
                    payment.provider = paymentData.provider || "manual";
                    payment.providerTransactionId = paymentData.providerTransactionId || null;
                    payment.receiptUrl = paymentData.receiptUrl || null;
                    payment.notes = paymentData.notes || null;
                    payment.status = "SUCCESS";
                    const savedPayment = await paymentRepository.save(payment);
                    enrollment.payment = savedPayment;
                }
                catch (payErr) {
                    console.error("Error creating payment record:", payErr);
                    // Non-fatal: enrollment acceptance continues even if payment record fails
                }
            }
            await enrollmentRepository.save(enrollment);
            // Create internal notification for student
            if (enrollment.student) {
                if (status === "active") {
                    await NotificationController_1.NotificationController.createNotification(enrollment.student.id, "تم قبول طلب التسجيل! 🎉", `تهانينا! تم قبول طلب انضمامك إلى دورة "${enrollment.course?.title || 'الدورة التعليمية'}". يمكنك الآن البدء بالمتابعة والتفكير بالتفوق.`, "success", "#courses");
                }
                else if (status === "rejected") {
                    await NotificationController_1.NotificationController.createNotification(enrollment.student.id, "تحديث حالة طلب الانضمام ❌", `نأسف، تم رفض طلب انضمامك إلى دورة "${enrollment.course?.title || 'الدورة التعليمية'}".`, "warning", "#courses");
                }
            }
            let whatsappNotification = null;
            if (status === "active" && enrollment.student && enrollment.student.phone) {
                const msgText = (0, whatsapp_1.buildEnrollmentAcceptedMessage)(enrollment.student.name, enrollment.course ? enrollment.course.title : "الدورة التعليمية", enrollment.course && enrollment.course.teacher ? enrollment.course.teacher.name : undefined);
                whatsappNotification = (0, whatsapp_1.createWhatsAppNotificationPayload)(enrollment.student.phone, msgText);
            }
            return res.status(200).json({
                ...enrollment,
                whatsappNotification
            });
        }
        catch (err) {
            console.error("Error updating enrollment request:", err);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async getCourseEnrollments(req, res) {
        const { id } = req.params;
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const course = await courseRepository.findOne({
                where: { id },
                relations: ["teacher"]
            });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            if (course.teacher && course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden." });
            }
            const enrollments = await enrollmentRepository.find({
                where: { course: { id } },
                relations: ["student"]
            });
            return res.status(200).json(enrollments);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}
exports.CourseController = CourseController;
