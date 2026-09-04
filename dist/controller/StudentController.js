"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentController = void 0;
const data_source_1 = require("../data-source");
const Enrollment_1 = require("../entity/Enrollment");
const Course_1 = require("../entity/Course");
const Lesson_1 = require("../entity/Lesson");
const User_1 = require("../entity/User");
const CourseGroup_1 = require("../entity/CourseGroup");
const Payment_1 = require("../entity/Payment");
const NotificationController_1 = require("./NotificationController");
class StudentController {
    static async getEnrollments(req, res) {
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollments = await enrollmentRepository.find({
                where: { student: { id: req.user.id } },
                order: {
                    createdAt: "ASC"
                },
                relations: ["course", "course.teacher", "group", "group.teacher", "payment"]
            });
            // Filter out rejected or banned enrollments so they do not clutter student dashboard
            const activeOrPending = (enrollments || []).filter(e => e.status !== "rejected" && e.status !== "banned");
            return res.status(200).json(activeOrPending);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async enroll(req, res) {
        const { courseId, groupId, amount, provider, providerTransactionId, receiptUrl, notes } = req.body;
        if (!courseId) {
            return res.status(400).json({ error: "Missing courseId." });
        }
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
            const groupRepository = data_source_1.AppDataSource.getRepository(CourseGroup_1.CourseGroup);
            const paymentRepository = data_source_1.AppDataSource.getRepository(Payment_1.Payment);
            const course = await courseRepository.findOne({
                where: { id: courseId },
                relations: ["teacher"]
            });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            const student = await userRepository.findOneBy({ id: req.user.id });
            if (!student) {
                return res.status(404).json({ error: "Student profile not found." });
            }
            // Subscriptions are strictly for groups — direct course enrollments are not allowed
            if (!groupId) {
                return res.status(400).json({
                    error: "الاشتراك متاح للمجموعات الدراسية فقط. يرجى اختيار وتحديد المجموعة الدراسية للاشتراك بها."
                });
            }
            const selectedGroup = await groupRepository.findOne({
                where: { id: groupId, course: { id: courseId } }
            });
            if (!selectedGroup) {
                return res.status(404).json({ error: "المجموعة الدراسية المحددة غير موجودة." });
            }
            if (selectedGroup.status === "CLOSED" || selectedGroup.status === "IN_PROGRESS") {
                return res.status(400).json({
                    error: "عذراً، هذه المجموعة مغلقة للتسجيل حالياً نظراً لبدء الدراسة والتدريس."
                });
            }
            if (selectedGroup.status === "PENDING_APPROVAL" || selectedGroup.status === "REJECTED") {
                return res.status(400).json({
                    error: "عذراً، هذه المجموعة غير متاحة للتسجيل حالياً بانتظار اعتماد الإدارة."
                });
            }
            // Capacity check: count active + pending enrollments
            const totalEnrolled = await enrollmentRepository.count({
                where: [
                    { group: { id: groupId }, status: "active" },
                    { group: { id: groupId }, status: "pending" }
                ]
            });
            const maxSeats = selectedGroup.maxStudents || 25;
            if (totalEnrolled >= maxSeats || selectedGroup.status === "FULL") {
                return res.status(400).json({
                    error: `عذراً، هذه المجموعة مكتملة العدد (${totalEnrolled}/${maxSeats} طالب) ومغلقة للتسجيل.`
                });
            }
            let enrollment = await enrollmentRepository.findOne({
                where: { student: { id: req.user.id }, group: { id: selectedGroup.id } },
                relations: ["group", "payment"]
            });
            if (enrollment) {
                if (enrollment.status === "active") {
                    return res.status(400).json({ error: "أنت مسجل بالفعل في هذه المجموعة الدراسية." });
                }
                if (enrollment.status === "pending") {
                    return res.status(400).json({ error: "طلب تسجيلك في هذه المجموعة قيد المراجعة والاعتماد من الإدارة بالفعل ⏳." });
                }
                enrollment.group = selectedGroup;
                if (enrollment.status === "rejected") {
                    enrollment.status = "pending";
                }
            }
            else {
                enrollment = new Enrollment_1.Enrollment();
                enrollment.student = student;
                enrollment.course = course;
                enrollment.group = selectedGroup;
                enrollment.progress = 0;
                enrollment.status = "pending";
                enrollment.completedLessons = [];
            }
            // Handle Payment record — Every group subscription is PAID and requires admin approval
            let payment = enrollment.payment;
            if (!payment) {
                payment = new Payment_1.Payment();
            }
            const calculatedAmount = (amount !== undefined && Number(amount) > 0) ? Number(amount) : (selectedGroup.monthlyPrice ||
                (selectedGroup.sessionPrice ? selectedGroup.sessionPrice * 8 : (selectedGroup.studentHourlyRate ? selectedGroup.studentHourlyRate * 8 : 320)));
            payment.student = student;
            payment.amount = calculatedAmount;
            payment.currency = "EGP";
            payment.type = "GROUP_ENROLLMENT";
            payment.provider = provider || "vodafone_cash";
            if (providerTransactionId)
                payment.providerTransactionId = providerTransactionId;
            if (receiptUrl)
                payment.receiptUrl = receiptUrl;
            if (notes)
                payment.notes = notes;
            payment.status = "PENDING";
            const savedPayment = await paymentRepository.save(payment);
            enrollment.payment = savedPayment;
            await enrollmentRepository.save(enrollment);
            // Notify Admins about new payment approval request
            const admins = await userRepository.find({ where: { role: "admin" } });
            const groupNameStr = selectedGroup ? `بالمجموعة (${selectedGroup.name})` : `بدورة (${course.title})`;
            for (const adm of admins) {
                await NotificationController_1.NotificationController.createNotification(adm.id, "طلب تحويل واشتراك بمجموعة جديد 💳", `قدّم الطالب "${student.name}" إشعار دفع للاشتراك ${groupNameStr} بمبلغ ${calculatedAmount} ج.م. في انتظار مراجعة الإيصال واعتماده.`, "info", "#admin-dashboard/courses").catch(() => { });
            }
            // Notify teacher about new enrollment request
            if (course.teacher) {
                const groupInfo = selectedGroup ? ` في (${selectedGroup.name})` : "";
                await NotificationController_1.NotificationController.createNotification(course.teacher.id, "طلب تسجيل جديد 📩", `قدّم الطالب "${student.name}" طلباً للانضمام إلى دورة "${course.title}"${groupInfo}.`, "info", "#enrollment-requests").catch(() => { });
            }
            return res.status(201).json({
                message: "تم إرسال طلب الاشتراك وإشعار التحويل للإدارة بنجاح! سيتم التفعيل فور مراجعة الإيصال. ⏳",
                enrollment
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error: " + (err.message || err) });
        }
    }
    static async completeLesson(req, res) {
        const { courseId } = req.params;
        const { lessonId, complete } = req.body;
        if (!lessonId) {
            return res.status(400).json({ error: "Missing lessonId." });
        }
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const lessonRepository = data_source_1.AppDataSource.getRepository(Lesson_1.Lesson);
            const enrollment = await enrollmentRepository.findOne({
                where: {
                    student: { id: req.user.id },
                    course: { id: courseId }
                }
            });
            if (!enrollment) {
                return res.status(404).json({ error: "Student is not enrolled in this course." });
            }
            const lessonCount = await lessonRepository.count({
                where: { course: { id: courseId } }
            });
            if (lessonCount === 0) {
                return res.status(400).json({ error: "Course has no lessons." });
            }
            let completed = enrollment.completedLessons || [];
            if (complete) {
                if (!completed.includes(lessonId)) {
                    completed.push(lessonId);
                }
            }
            else {
                completed = completed.filter(id => id !== lessonId);
            }
            enrollment.completedLessons = completed;
            enrollment.progress = Math.round((completed.length / lessonCount) * 100);
            await enrollmentRepository.save(enrollment);
            return res.status(200).json(enrollment);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async toggleObjective(req, res) {
        const { courseId } = req.params;
        const { objectiveIndex, completed } = req.body;
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollment = await enrollmentRepository.findOne({
                where: {
                    student: { id: req.user.id },
                    course: { id: courseId }
                }
            });
            if (!enrollment) {
                return res.status(404).json({ error: "Student is not enrolled in this course." });
            }
            let completedObjs = enrollment.completedObjectives || [];
            const objKey = String(objectiveIndex);
            if (completed) {
                if (!completedObjs.includes(objKey)) {
                    completedObjs.push(objKey);
                }
            }
            else {
                completedObjs = completedObjs.filter(id => id !== objKey);
            }
            enrollment.completedObjectives = completedObjs;
            await enrollmentRepository.save(enrollment);
            return res.status(200).json(enrollment);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async toggleLessonObjective(req, res) {
        const { courseId } = req.params;
        const { lessonId, objectiveIndex, completed } = req.body;
        if (!lessonId) {
            return res.status(400).json({ error: "Missing lessonId." });
        }
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollment = await enrollmentRepository.findOne({
                where: {
                    student: { id: req.user.id },
                    course: { id: courseId }
                }
            });
            if (!enrollment) {
                return res.status(404).json({ error: "Student is not enrolled in this course." });
            }
            let map = enrollment.completedLessonObjectives || {};
            let lessonObjs = Array.isArray(map[lessonId]) ? [...map[lessonId]] : [];
            const objKey = String(objectiveIndex);
            if (completed) {
                if (!lessonObjs.includes(objKey)) {
                    lessonObjs.push(objKey);
                }
            }
            else {
                lessonObjs = lessonObjs.filter(id => id !== objKey);
            }
            map[lessonId] = lessonObjs;
            enrollment.completedLessonObjectives = map;
            await enrollmentRepository.save(enrollment);
            return res.status(200).json(enrollment);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async submitActivityFile(req, res) {
        const { courseId } = req.params;
        const { lessonId, fileName, fileUrl } = req.body;
        if (!fileUrl) {
            return res.status(400).json({ error: "Missing fileUrl." });
        }
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollment = await enrollmentRepository.findOne({
                where: {
                    student: { id: req.user.id },
                    course: { id: courseId }
                }
            });
            if (!enrollment) {
                return res.status(404).json({ error: "Student is not enrolled in this course." });
            }
            let submissionsMap = enrollment.activitySubmissions || {};
            const key = lessonId || "general";
            let list = Array.isArray(submissionsMap[key]) ? [...submissionsMap[key]] : [];
            list.push({
                id: Date.now().toString(),
                fileName: fileName || "ملف النشاط",
                fileUrl,
                uploadedAt: new Date().toISOString()
            });
            submissionsMap[key] = list;
            enrollment.activitySubmissions = submissionsMap;
            await enrollmentRepository.save(enrollment);
            return res.status(200).json(enrollment);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async deleteActivityFile(req, res) {
        const { courseId } = req.params;
        const { lessonId, submissionId } = req.body;
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollment = await enrollmentRepository.findOne({
                where: {
                    student: { id: req.user.id },
                    course: { id: courseId }
                }
            });
            if (!enrollment) {
                return res.status(404).json({ error: "Student is not enrolled in this course." });
            }
            let submissionsMap = enrollment.activitySubmissions || {};
            const key = lessonId || "general";
            let list = Array.isArray(submissionsMap[key]) ? [...submissionsMap[key]] : [];
            submissionsMap[key] = list.filter(item => item.id !== submissionId);
            enrollment.activitySubmissions = submissionsMap;
            await enrollmentRepository.save(enrollment);
            return res.status(200).json(enrollment);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async getDashboardStats(req, res) {
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollments = await enrollmentRepository.find({
                where: { student: { id: req.user.id } }
            });
            const totalCourses = enrollments.length;
            let totalCompletedLessons = 0;
            let totalProgressSum = 0;
            enrollments.forEach(enroll => {
                totalCompletedLessons += (enroll.completedLessons || []).length;
                totalProgressSum += enroll.progress;
            });
            const averageProgress = totalCourses > 0 ? Math.round(totalProgressSum / totalCourses) : 0;
            const studyHours = totalCompletedLessons * 0.5 + 4; // Mock study hours calculation
            return res.status(200).json({
                totalCourses,
                completedLessonsCount: totalCompletedLessons,
                averageProgress,
                studyHours: Math.round(studyHours * 10) / 10
            });
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}
exports.StudentController = StudentController;
