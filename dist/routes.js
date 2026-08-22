"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("./controller/AuthController");
const CourseController_1 = require("./controller/CourseController");
const SessionController_1 = require("./controller/SessionController");
const StudentController_1 = require("./controller/StudentController");
const AdminController_1 = require("./controller/AdminController");
const AssignmentController_1 = require("./controller/AssignmentController");
const UserController_1 = require("./controller/UserController");
const UploadController_1 = require("./controller/UploadController");
const BlogController_1 = require("./controller/BlogController");
const CategoryController_1 = require("./controller/CategoryController");
const TeacherApplicationController_1 = require("./controller/TeacherApplicationController");
const QAController_1 = require("./controller/QAController");
const ReviewController_1 = require("./controller/ReviewController");
const NotificationController_1 = require("./controller/NotificationController");
const AdminTeacherController_1 = require("./controller/AdminTeacherController");
const SubscriptionController_1 = require("./controller/SubscriptionController");
const TeacherAvailabilityController_1 = require("./controller/TeacherAvailabilityController");
const SessionBookingController_1 = require("./controller/SessionBookingController");
const TeacherEarningController_1 = require("./controller/TeacherEarningController");
const auth_1 = require("./middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
// Configure Multer for file uploads
const uploadDir = path_1.default.resolve(process.cwd(), "public/uploads");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || ".jpg";
        const name = crypto_1.default.randomBytes(8).toString("hex") + ext;
        cb(null, name);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB max file size
});
const uploadSingleFile = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            console.error("Multer upload error:", err);
            if (err instanceof multer_1.default.MulterError) {
                return res.status(400).json({ error: `حجم أو نوع الملف غير مدعوم: ${err.message}` });
            }
            return res.status(500).json({ error: err.message || "فشل رفع الملف إلى السيرفر." });
        }
        next();
    });
};
const router = (0, express_1.Router)();
// Auth Routes
router.post("/auth/register", AuthController_1.AuthController.register);
router.post("/auth/login", AuthController_1.AuthController.login);
router.get("/auth/me", auth_1.authMiddleware, AuthController_1.AuthController.me);
router.post("/auth/accept-teacher-invitation", AdminTeacherController_1.AdminTeacherController.acceptInvitation);
// Courses & Lessons (Course Instructor capability enforced)
router.get("/courses", CourseController_1.CourseController.getAll);
router.get("/courses/:id", CourseController_1.CourseController.getOne);
router.post("/courses", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.create);
router.put("/courses/:id", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.update);
router.delete("/courses/:id", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.deleteCourse);
router.post("/courses/:id/submit-for-review", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.submitForReview);
router.post("/courses/:courseId/lessons", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.addLesson);
router.put("/lessons/:id", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.updateLesson);
router.delete("/lessons/:id", auth_1.authMiddleware, (0, auth_1.requireCapability)("COURSE_INSTRUCTOR"), CourseController_1.CourseController.deleteLesson);
router.get("/courses/:id/enrollments", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.getCourseEnrollments);
// Course Approvals (Admin)
router.get("/admin/courses/pending-review", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CourseController_1.CourseController.getPendingCourses);
router.post("/admin/courses/:id/approve", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CourseController_1.CourseController.approveCourse);
router.post("/admin/courses/:id/reject", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CourseController_1.CourseController.rejectCourse);
// Admin Teacher Management
router.post("/admin/teachers/invite", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminTeacherController_1.AdminTeacherController.inviteTeacher);
router.get("/admin/teachers", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminTeacherController_1.AdminTeacherController.getAllTeachers);
router.patch("/admin/teachers/:id/capabilities", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminTeacherController_1.AdminTeacherController.updateTeacherCapabilities);
// Monthly Subscription Plans & Subscriptions
router.get("/subscription-plans", SubscriptionController_1.SubscriptionController.getPlans);
router.post("/subscription-plans", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.createPlan);
router.put("/subscription-plans/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.updatePlan);
router.post("/subscriptions", auth_1.authMiddleware, SubscriptionController_1.SubscriptionController.subscribe);
router.get("/subscriptions/my", auth_1.authMiddleware, SubscriptionController_1.SubscriptionController.getMySubscriptions);
router.get("/subscriptions/teacher-assigned", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher"]), SubscriptionController_1.SubscriptionController.getTeacherSubscriptions);
router.get("/admin/subscriptions", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.getAllSubscriptions);
router.patch("/admin/subscriptions/:id/assign-teacher", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.assignTeacher);
router.patch("/admin/subscriptions/:id/approve", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.approveSubscription);
router.patch("/admin/subscriptions/:id/reject", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.rejectSubscription);
router.patch("/admin/subscriptions/:id/renew", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.renewSubscription);
router.delete("/subscription-plans/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SubscriptionController_1.SubscriptionController.deletePlan);
router.patch("/admin/teacher-earnings/:id/pay", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), TeacherEarningController_1.TeacherEarningController.markAsPaid);
// Teacher Availability (Session Teacher capability enforced)
router.get("/teachers/:id/availability", TeacherAvailabilityController_1.TeacherAvailabilityController.getByTeacher);
router.post("/teacher/availability", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), TeacherAvailabilityController_1.TeacherAvailabilityController.setAvailability);
router.delete("/teacher/availability/:id", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), TeacherAvailabilityController_1.TeacherAvailabilityController.deleteSlot);
// Private Session Booking & Completion
router.post("/sessions/book", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.bookSession);
router.post("/sessions/batch-schedule", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.batchScheduleSessions);
router.post("/sessions/group-schedule", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SessionBookingController_1.SessionBookingController.scheduleGroupSession);
router.post("/admin/group-sessions/add-student", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SessionBookingController_1.SessionBookingController.addStudentToGroupSession);
router.post("/admin/group-sessions/remove-student", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SessionBookingController_1.SessionBookingController.removeStudentFromGroupSession);
router.get("/subscriptions/:id/schedule-details", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.getSubscriptionScheduleDetails);
router.post("/sessions/preview-package-schedule", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.previewPackageSchedule);
router.post("/sessions/confirm-package-schedule", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.confirmPackageSchedule);
router.post("/sessions/:id/complete", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), SessionBookingController_1.SessionBookingController.completeSession);
router.post("/sessions/:id/cancel", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.cancelSession);
router.post("/sessions/:id/no-show", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), SessionBookingController_1.SessionBookingController.noShowSession);
router.patch("/sessions/:id/reschedule", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.rescheduleSession);
router.put("/sessions/:id/reassign-teacher", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), SessionBookingController_1.SessionBookingController.reassignSessionTeacher);
// Student private sessions
router.get("/sessions/my-private", auth_1.authMiddleware, SessionBookingController_1.SessionBookingController.getMyPrivateSessions);
// Teacher private sessions
router.get("/teacher/private-sessions", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), SessionBookingController_1.SessionBookingController.getTeacherPrivateSessions);
router.get("/teacher/private-sessions/today", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), SessionBookingController_1.SessionBookingController.getTodayPrivateSessions);
router.get("/teacher/availability/mine", auth_1.authMiddleware, (0, auth_1.requireCapability)("SESSION_TEACHER"), SessionBookingController_1.SessionBookingController.getMyAvailability);
// Teacher Earnings & Financial Settlements
router.get("/teacher/earnings", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher"]), TeacherEarningController_1.TeacherEarningController.getTeacherEarnings);
router.get("/admin/earnings", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), TeacherEarningController_1.TeacherEarningController.getAdminEarnings);
// Uploads
router.post("/upload", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), uploadSingleFile, UploadController_1.UploadController.uploadFile);
// Live Sessions
router.get("/sessions", SessionController_1.SessionController.getAll);
router.post("/sessions", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.create);
router.put("/sessions/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.update);
router.delete("/sessions/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.delete);
router.patch("/sessions/:id/status", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.updateStatus);
// Student Portal & Enrollments
router.get("/student/enrollments", auth_1.authMiddleware, StudentController_1.StudentController.getEnrollments);
router.post("/student/enrollments", auth_1.authMiddleware, StudentController_1.StudentController.enroll);
router.post("/student/enrollments/:courseId/lessons/complete", auth_1.authMiddleware, StudentController_1.StudentController.completeLesson);
router.patch("/student/enrollments/:courseId/lessons/objectives/toggle", auth_1.authMiddleware, StudentController_1.StudentController.toggleLessonObjective);
router.post("/student/enrollments/:courseId/activity-submit", auth_1.authMiddleware, StudentController_1.StudentController.submitActivityFile);
router.delete("/student/enrollments/:courseId/activity-submit", auth_1.authMiddleware, StudentController_1.StudentController.deleteActivityFile);
router.get("/student/stats", auth_1.authMiddleware, StudentController_1.StudentController.getDashboardStats);
// Notifications
router.get("/notifications", auth_1.authMiddleware, NotificationController_1.NotificationController.getUserNotifications);
router.get("/notifications/unread-count", auth_1.authMiddleware, NotificationController_1.NotificationController.getUnreadCount);
router.patch("/notifications/:id/read", auth_1.authMiddleware, NotificationController_1.NotificationController.markAsRead);
router.patch("/notifications/read-all", auth_1.authMiddleware, NotificationController_1.NotificationController.markAllAsRead);
router.delete("/notifications/:id", auth_1.authMiddleware, NotificationController_1.NotificationController.delete);
// Reviews & Ratings
router.post("/reviews", auth_1.authMiddleware, ReviewController_1.ReviewController.create);
router.get("/reviews/course/:courseId", ReviewController_1.ReviewController.getByCourse);
router.get("/reviews/teacher/:teacherId", ReviewController_1.ReviewController.getByTeacher);
router.delete("/reviews/:id", auth_1.authMiddleware, ReviewController_1.ReviewController.delete);
// Teachers & Users
router.post("/teacher-applications", TeacherApplicationController_1.TeacherApplicationController.apply);
router.get("/teachers", UserController_1.UserController.getTeachers);
router.get("/teachers/:id", UserController_1.UserController.getTeacherById);
router.patch("/users/me", auth_1.authMiddleware, UserController_1.UserController.updateProfile);
router.get("/users/students", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), UserController_1.UserController.getStudents);
router.post("/teacher/students", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), UserController_1.UserController.addStudent);
router.delete("/teacher/students/:studentId", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), UserController_1.UserController.deleteStudent);
router.get("/teacher/enrollment-requests", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.getEnrollmentRequests);
router.patch("/teacher/enrollment-requests/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.updateEnrollmentRequest);
router.put("/teacher/enrollment-requests/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.updateEnrollmentRequest);
// Q&A
router.get("/courses/:courseId/qa", QAController_1.QAController.getByCourse);
router.post("/courses/:courseId/qa", auth_1.authMiddleware, QAController_1.QAController.createQuestion);
router.post("/qa/:id/answers", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), QAController_1.QAController.answerQuestion);
router.delete("/qa/:id", auth_1.authMiddleware, QAController_1.QAController.deleteQuestion);
// Categories & Blogs
router.get("/categories", CategoryController_1.CategoryController.getAll);
router.post("/categories", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CategoryController_1.CategoryController.create);
router.put("/categories/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CategoryController_1.CategoryController.update);
router.delete("/categories/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CategoryController_1.CategoryController.delete);
router.get("/blogs", BlogController_1.BlogController.getAll);
router.get("/blogs/:id", BlogController_1.BlogController.getOne);
router.post("/blogs", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), BlogController_1.BlogController.create);
router.put("/blogs/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), BlogController_1.BlogController.update);
router.delete("/blogs/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), BlogController_1.BlogController.delete);
// Assignments & Submissions
router.get("/assignments", auth_1.authMiddleware, AssignmentController_1.AssignmentController.getAssignments);
router.post("/assignments", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), AssignmentController_1.AssignmentController.createAssignment);
router.post("/assignments/:id/submit", auth_1.authMiddleware, AssignmentController_1.AssignmentController.submitAssignment);
router.get("/assignments/:id/submissions", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), AssignmentController_1.AssignmentController.getSubmissions);
router.put("/submissions/:id/grade", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), AssignmentController_1.AssignmentController.gradeSubmission);
// Admin Routes
router.get("/admin/stats", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getStats);
router.get("/admin/users", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getUsers);
router.post("/admin/users", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.createUser);
router.put("/admin/users/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.updateUser);
router.patch("/admin/users/:id/role", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.updateUserRole);
router.delete("/admin/users/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.deleteUser);
router.get("/admin/courses", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getCourses);
router.post("/admin/courses", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.createCourse);
router.delete("/admin/courses/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.deleteCourse);
router.get("/admin/enrollments", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getEnrollments);
router.post("/admin/enrollments/:id/approve", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.approveEnrollment);
router.post("/admin/enrollments/:id/reject", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.rejectEnrollment);
router.get("/admin/reports", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getReports);
router.get("/admin/teacher-applications", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), TeacherApplicationController_1.TeacherApplicationController.getApplications);
router.patch("/admin/teacher-applications/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), TeacherApplicationController_1.TeacherApplicationController.reviewApplication);
exports.default = router;
