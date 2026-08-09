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
const ResourceController_1 = require("./controller/ResourceController");
const TestController_1 = require("./controller/TestController");
const UserController_1 = require("./controller/UserController");
const UploadController_1 = require("./controller/UploadController");
const BlogController_1 = require("./controller/BlogController");
const CategoryController_1 = require("./controller/CategoryController");
const TeacherApplicationController_1 = require("./controller/TeacherApplicationController");
const QAController_1 = require("./controller/QAController");
const ReviewController_1 = require("./controller/ReviewController");
const auth_1 = require("./middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
// Configure Multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, "../public/uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto_1.default.randomBytes(8).toString("hex");
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// Authentication
router.post("/auth/register", AuthController_1.AuthController.register);
router.post("/auth/login", AuthController_1.AuthController.login);
router.get("/auth/me", auth_1.authMiddleware, AuthController_1.AuthController.me);
// Courses
router.get("/courses", CourseController_1.CourseController.getAll);
router.get("/courses/:id", CourseController_1.CourseController.getOne);
router.post("/courses", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.create);
router.put("/courses/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.update);
router.delete("/courses/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.deleteCourse);
router.post("/courses/:courseId/lessons", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.addLesson);
router.put("/lessons/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.updateLesson);
router.delete("/lessons/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.deleteLesson);
// Uploads
router.post("/upload", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), upload.single("file"), UploadController_1.UploadController.uploadFile);
// Live Sessions
router.get("/sessions", SessionController_1.SessionController.getAll);
router.post("/sessions", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.create);
router.put("/sessions/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.update);
router.delete("/sessions/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.delete);
router.patch("/sessions/:id/status", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.updateStatus);
const NotificationController_1 = require("./controller/NotificationController");
// Student Portal & Enrollments
router.get("/student/enrollments", auth_1.authMiddleware, StudentController_1.StudentController.getEnrollments);
router.post("/student/enrollments", auth_1.authMiddleware, StudentController_1.StudentController.enroll);
router.post("/student/enrollments/:courseId/lessons/complete", auth_1.authMiddleware, StudentController_1.StudentController.completeLesson);
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
// ─── TEACHER & USER ROUTES ──────────────────────────────────────────────────────────
router.post("/teacher-applications", TeacherApplicationController_1.TeacherApplicationController.apply);
router.get("/teachers", UserController_1.UserController.getTeachers);
router.get("/teachers/:id", UserController_1.UserController.getTeacherById);
router.patch("/users/me", auth_1.authMiddleware, UserController_1.UserController.updateProfile);
router.get("/users/students", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), UserController_1.UserController.getStudents);
router.post("/teacher/students", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), UserController_1.UserController.addStudent);
router.delete("/teacher/students/:studentId", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), UserController_1.UserController.deleteStudent);
router.get("/teacher/enrollment-requests", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.getEnrollmentRequests);
router.put("/teacher/enrollment-requests/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.updateEnrollmentRequest);
router.patch("/users/students/enrollments/:enrollmentId/status", auth_1.authMiddleware, UserController_1.UserController.toggleBan);
// ── Admin Panel ───────────────────────────────────────────────────────────────
router.get("/admin/stats", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getStats);
router.get("/admin/users", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getUsers);
router.post("/admin/users", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.createUser);
router.put("/admin/users/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.updateUser);
router.patch("/admin/users/:id/role", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.updateUserRole);
router.delete("/admin/users/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.deleteUser);
router.get("/admin/courses", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getCourses);
router.delete("/admin/courses/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.deleteCourse);
router.delete("/admin/sessions/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.deleteSession);
router.get("/admin/reports", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), AdminController_1.AdminController.getReports);
router.get("/admin/teacher-applications", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), TeacherApplicationController_1.TeacherApplicationController.getApplications);
router.put("/admin/teacher-applications/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), TeacherApplicationController_1.TeacherApplicationController.reviewApplication);
// ── Assignments ───────────────────────────────────────────────────────────────
router.get("/assignments", auth_1.authMiddleware, AssignmentController_1.AssignmentController.getAssignments);
router.post("/assignments", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), AssignmentController_1.AssignmentController.createAssignment);
router.post("/assignments/:id/submit", auth_1.authMiddleware, (0, auth_1.requireRole)(["student"]), AssignmentController_1.AssignmentController.submitAssignment);
router.get("/assignments/:id/submissions", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), AssignmentController_1.AssignmentController.getSubmissions);
router.patch("/submissions/:id/grade", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), AssignmentController_1.AssignmentController.gradeSubmission);
// ── Resources ─────────────────────────────────────────────────────────────────
router.get("/resources", auth_1.authMiddleware, ResourceController_1.ResourceController.getResources);
router.post("/resources", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), ResourceController_1.ResourceController.createResource);
router.delete("/resources/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), ResourceController_1.ResourceController.deleteResource);
// ─── Blogs & Articles ─────────────────────────────────────────────────────────
router.get("/blogs", BlogController_1.BlogController.getAll);
router.get("/blogs/:id", BlogController_1.BlogController.getOne);
router.post("/blogs", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), BlogController_1.BlogController.create);
router.put("/blogs/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), BlogController_1.BlogController.update);
router.delete("/blogs/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), BlogController_1.BlogController.delete);
// ── Tests ─────────────────────────────────────────────────────────────────────
router.get("/tests", auth_1.authMiddleware, TestController_1.TestController.getTests);
router.post("/tests", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), TestController_1.TestController.createTest);
router.get("/tests/:id/questions", auth_1.authMiddleware, TestController_1.TestController.getTestQuestions);
router.post("/tests/:id/submit", auth_1.authMiddleware, (0, auth_1.requireRole)(["student"]), TestController_1.TestController.submitTest);
// ── Course Q&A ─────────────────────────────────────────────────────────────
router.get("/courses/:courseId/qa", auth_1.optionalAuthMiddleware, QAController_1.QAController.getByCourse);
router.post("/courses/:courseId/qa", auth_1.authMiddleware, QAController_1.QAController.createQuestion);
router.put("/qa/:id/answer", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), QAController_1.QAController.answerQuestion);
router.delete("/qa/:id", auth_1.authMiddleware, QAController_1.QAController.deleteQuestion);
// ─── Categories ─────────────────────────────────────────────────────────────
router.get("/categories", CategoryController_1.CategoryController.getAll);
router.post("/categories", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CategoryController_1.CategoryController.create);
router.put("/categories/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CategoryController_1.CategoryController.update);
router.delete("/categories/:id", auth_1.authMiddleware, (0, auth_1.requireRole)(["admin"]), CategoryController_1.CategoryController.delete);
exports.default = router;
