import { Router } from "express";
import { AuthController } from "./controller/AuthController";
import { CourseController } from "./controller/CourseController";
import { SessionController } from "./controller/SessionController";
import { StudentController } from "./controller/StudentController";
import { AdminController } from "./controller/AdminController";
import { AssignmentController } from "./controller/AssignmentController";
import { ResourceController } from "./controller/ResourceController";
import { TestController } from "./controller/TestController";
import { UserController } from "./controller/UserController";
import { UploadController } from "./controller/UploadController";
import { BlogController } from "./controller/BlogController";
import { CategoryController } from "./controller/CategoryController";
import { TeacherApplicationController } from "./controller/TeacherApplicationController";
import { QAController } from "./controller/QAController";
import { ReviewController } from "./controller/ReviewController";
import { NotificationController } from "./controller/NotificationController";
import { AdminTeacherController } from "./controller/AdminTeacherController";
import { SubscriptionController } from "./controller/SubscriptionController";
import { TeacherAvailabilityController } from "./controller/TeacherAvailabilityController";
import { SessionBookingController } from "./controller/SessionBookingController";
import { TeacherEarningController } from "./controller/TeacherEarningController";
import { authMiddleware, optionalAuthMiddleware, requireRole, requireCapability } from "./middleware/auth";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Configure Multer for file uploads (supports persistent UPLOADS_DIR)
const uploadDir = process.env.UPLOADS_DIR 
  ? path.resolve(process.env.UPLOADS_DIR) 
  : path.resolve(process.cwd(), "public/uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = crypto.randomBytes(8).toString("hex") + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max file size
});

const uploadSingleFile = (req: any, res: any, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      console.error("Multer upload error:", err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `حجم أو نوع الملف غير مدعوم: ${err.message}` });
      }
      return res.status(500).json({ error: err.message || "فشل رفع الملف إلى السيرفر." });
    }
    next();
  });
};

const uploadSingleAvatar = (req: any, res: any, next: any) => {
  upload.fields([{ name: "avatar", maxCount: 1 }, { name: "file", maxCount: 1 }])(req, res, (err: any) => {
    if (err) {
      console.error("Avatar upload error:", err);
      return res.status(400).json({ error: `فشل رفع الصورة: ${err.message}` });
    }
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      req.file = req.files.avatar[0];
    } else if (req.files && req.files.file && req.files.file[0]) {
      req.file = req.files.file[0];
    }
    next();
  });
};

const router = Router();

// Auth Routes
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.post("/auth/student/login", AuthController.studentLogin);
router.post("/auth/student-login", AuthController.studentLogin);
router.post("/auth/staff/login", AuthController.staffLogin);
router.post("/auth/staff-login", AuthController.staffLogin);
router.get("/auth/me", authMiddleware, AuthController.me);
router.post("/auth/accept-teacher-invitation", AdminTeacherController.acceptInvitation);

// Public Platform Stats & Analytics
router.get("/public/stats", AdminController.getPublicStats);

// Courses & Lessons (Course Instructor capability enforced)
router.get("/courses", CourseController.getAll);
router.get("/courses/:id", CourseController.getOne);
router.post("/courses", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.create);
router.put("/courses/:id", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.update);
router.delete("/courses/:id", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.deleteCourse);
router.post("/courses/:id/submit-for-review", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.submitForReview);
router.post("/courses/:courseId/lessons", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.addLesson);
router.put("/lessons/:id", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.updateLesson);
router.delete("/lessons/:id", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.deleteLesson);
router.post("/courses/:id/units", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.addUnit);
router.put("/courses/:id/units/rename", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.renameUnit);
router.delete("/courses/:id/units", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.deleteUnit);
router.put("/courses/:id/units/reorder", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.reorderUnits);
router.put("/courses/:id/lessons/reorder", authMiddleware, requireCapability("COURSE_INSTRUCTOR"), CourseController.reorderLessons);
router.get("/courses/:id/enrollments", authMiddleware, requireRole(["teacher", "admin"]), CourseController.getCourseEnrollments);

// Course Approvals (Admin)
router.get("/admin/courses/pending-review", authMiddleware, requireRole(["admin"]), CourseController.getPendingCourses);
router.post("/admin/courses/:id/approve", authMiddleware, requireRole(["admin"]), CourseController.approveCourse);
router.post("/admin/courses/:id/reject", authMiddleware, requireRole(["admin"]), CourseController.rejectCourse);

// Admin Teacher Management
router.post("/admin/teachers/invite", authMiddleware, requireRole(["admin"]), AdminTeacherController.inviteTeacher);
router.get("/admin/teachers", authMiddleware, requireRole(["admin"]), AdminTeacherController.getAllTeachers);
router.patch("/admin/teachers/:id/capabilities", authMiddleware, requireRole(["admin"]), AdminTeacherController.updateTeacherCapabilities);

// Monthly Subscription Plans & Subscriptions
router.get("/subscription-plans", SubscriptionController.getPlans);
router.get("/courses/:courseId/subscription-plans", SubscriptionController.getPlans);
router.post("/subscription-plans", authMiddleware, requireRole(["admin"]), SubscriptionController.createPlan);
router.put("/subscription-plans/:id", authMiddleware, requireRole(["admin"]), SubscriptionController.updatePlan);

router.post("/subscriptions", authMiddleware, SubscriptionController.subscribe);
router.get("/subscriptions/my", authMiddleware, SubscriptionController.getMySubscriptions);
router.get("/subscriptions/my/course/:courseId", authMiddleware, SubscriptionController.getCourseQuota);
router.get("/courses/:courseId/my-quota", authMiddleware, SubscriptionController.getCourseQuota);
router.get("/subscriptions/teacher-assigned", authMiddleware, requireRole(["teacher"]), SubscriptionController.getTeacherSubscriptions);
router.get("/admin/subscriptions", authMiddleware, requireRole(["admin"]), SubscriptionController.getAllSubscriptions);
router.post("/admin/subscriptions/manual-create", authMiddleware, requireRole(["admin"]), SubscriptionController.manualCreateSubscription);
router.patch("/admin/subscriptions/:id/assign-teacher", authMiddleware, requireRole(["admin"]), SubscriptionController.assignTeacher);
router.patch("/admin/subscriptions/:id/approve", authMiddleware, requireRole(["admin"]), SubscriptionController.approveSubscription);
router.patch("/admin/subscriptions/:id/reject", authMiddleware, requireRole(["admin"]), SubscriptionController.rejectSubscription);
router.patch("/admin/subscriptions/:id/renew", authMiddleware, requireRole(["admin"]), SubscriptionController.renewSubscription);
router.patch("/subscriptions/:id/cancel", authMiddleware, SubscriptionController.cancelSubscription);
router.delete("/subscription-plans/:id", authMiddleware, requireRole(["admin"]), SubscriptionController.deletePlan);
router.patch("/admin/teacher-earnings/:id/pay", authMiddleware, requireRole(["admin"]), TeacherEarningController.markAsPaid);

// Teacher Availability (Session Teacher capability enforced)
router.get("/teachers/:id/availability", TeacherAvailabilityController.getByTeacher);
router.post("/teacher/availability", authMiddleware, requireCapability("SESSION_TEACHER"), TeacherAvailabilityController.setAvailability);
router.delete("/teacher/availability/:id", authMiddleware, requireCapability("SESSION_TEACHER"), TeacherAvailabilityController.deleteSlot);

// Private Session Booking & Completion
router.post("/sessions/book", authMiddleware, SessionBookingController.bookSession);
router.post("/sessions/batch-schedule", authMiddleware, SessionBookingController.batchScheduleSessions);
router.post("/sessions/group-schedule", authMiddleware, requireRole(["admin"]), SessionBookingController.scheduleGroupSession);
router.post("/sessions/group-preview-conflicts", authMiddleware, requireRole(["admin"]), SessionBookingController.previewGroupConflicts);
router.post("/admin/group-sessions/add-student", authMiddleware, requireRole(["admin"]), SessionBookingController.addStudentToGroupSession);
router.post("/admin/group-sessions/remove-student", authMiddleware, requireRole(["admin"]), SessionBookingController.removeStudentFromGroupSession);
router.get("/subscriptions/:id/schedule-details", authMiddleware, SessionBookingController.getSubscriptionScheduleDetails);
router.post("/sessions/preview-package-schedule", authMiddleware, SessionBookingController.previewPackageSchedule);
router.post("/sessions/recheck-schedule-conflicts", authMiddleware, SessionBookingController.recheckScheduleConflicts);
router.post("/sessions/confirm-package-schedule", authMiddleware, SessionBookingController.confirmPackageSchedule);
router.post("/sessions/:id/complete", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.completeSession);
router.post("/sessions/:id/cancel", authMiddleware, SessionBookingController.cancelSession);
router.post("/sessions/:id/no-show", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.noShowSession);
router.patch("/sessions/:id/reschedule", authMiddleware, SessionBookingController.rescheduleSession);
router.put("/sessions/:id/reassign-teacher", authMiddleware, requireRole(["admin"]), SessionBookingController.reassignSessionTeacher);

// Student private sessions
router.get("/sessions/my-private", authMiddleware, SessionBookingController.getMyPrivateSessions);

// Teacher private sessions
router.get("/teacher/private-sessions", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.getTeacherPrivateSessions);
router.get("/teacher/private-sessions/today", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.getTodayPrivateSessions);
router.get("/teacher/availability/mine", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.getMyAvailability);

// Teacher Earnings & Financial Settlements
router.get("/teacher/earnings", authMiddleware, requireRole(["teacher"]), TeacherEarningController.getTeacherEarnings);
router.get("/admin/earnings", authMiddleware, requireRole(["admin"]), TeacherEarningController.getAdminEarnings);

// Uploads
router.post("/upload", authMiddleware, requireRole(["teacher", "admin"]), uploadSingleFile, UploadController.uploadFile);

// Live Sessions
router.get("/sessions", optionalAuthMiddleware, SessionController.getAll);
router.post("/sessions", authMiddleware, requireRole(["teacher", "admin"]), SessionController.create);
router.put("/sessions/:id", authMiddleware, requireRole(["teacher", "admin"]), SessionController.update);
router.delete("/sessions/:id", authMiddleware, requireRole(["teacher", "admin"]), SessionController.delete);
router.patch("/sessions/:id/status", authMiddleware, requireRole(["teacher", "admin"]), SessionController.updateStatus);

// Student Portal & Enrollments
router.get("/student/enrollments", authMiddleware, StudentController.getEnrollments);
router.post("/student/enrollments", authMiddleware, StudentController.enroll);
router.post("/student/enrollments/:courseId/lessons/complete", authMiddleware, StudentController.completeLesson);
router.patch("/student/enrollments/:courseId/lessons/objectives/toggle", authMiddleware, StudentController.toggleLessonObjective);
router.post("/student/enrollments/:courseId/activity-submit", authMiddleware, StudentController.submitActivityFile);
router.delete("/student/enrollments/:courseId/activity-submit", authMiddleware, StudentController.deleteActivityFile);
router.get("/student/stats", authMiddleware, StudentController.getDashboardStats);

// Notifications
router.get("/notifications", authMiddleware, NotificationController.getUserNotifications);
router.get("/notifications/unread-count", authMiddleware, NotificationController.getUnreadCount);
router.patch("/notifications/:id/read", authMiddleware, NotificationController.markAsRead);
router.patch("/notifications/read-all", authMiddleware, NotificationController.markAllAsRead);
router.delete("/notifications/:id", authMiddleware, NotificationController.delete);

// Reviews & Ratings
router.post("/reviews", authMiddleware, ReviewController.create);
router.get("/reviews/course/:courseId", ReviewController.getByCourse);
router.get("/reviews/teacher/:teacherId", ReviewController.getByTeacher);
router.delete("/reviews/:id", authMiddleware, ReviewController.delete);

// Teachers & Users
router.post("/teacher-applications", TeacherApplicationController.apply);
router.get("/teachers", UserController.getTeachers);
router.get("/teachers/:id", UserController.getTeacherById);
router.patch("/users/me", authMiddleware, UserController.updateProfile);
router.post("/users/avatar", authMiddleware, uploadSingleAvatar, UserController.uploadAvatar);
router.get("/users/students", authMiddleware, requireRole(["teacher", "admin"]), UserController.getStudents);
router.post("/teacher/students", authMiddleware, requireRole(["teacher", "admin"]), UserController.addStudent);
router.delete("/teacher/students/:studentId", authMiddleware, requireRole(["teacher", "admin"]), UserController.deleteStudent);
router.get("/teacher/enrollment-requests", authMiddleware, requireRole(["teacher", "admin"]), CourseController.getEnrollmentRequests);
router.patch("/teacher/enrollment-requests/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.updateEnrollmentRequest);
router.put("/teacher/enrollment-requests/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.updateEnrollmentRequest);

// Q&A
router.get("/courses/:courseId/qa", QAController.getByCourse);
router.post("/courses/:courseId/qa", authMiddleware, QAController.createQuestion);
router.post("/qa/:id/answers", authMiddleware, requireRole(["teacher", "admin"]), QAController.answerQuestion);
router.delete("/qa/:id", authMiddleware, QAController.deleteQuestion);

// Categories & Blogs
router.get("/categories", CategoryController.getAll);
router.post("/categories", authMiddleware, requireRole(["admin"]), CategoryController.create);
router.put("/categories/:id", authMiddleware, requireRole(["admin"]), CategoryController.update);
router.delete("/categories/:id", authMiddleware, requireRole(["admin"]), CategoryController.delete);
router.get("/blogs", BlogController.getAll);
router.get("/blogs/:id", BlogController.getOne);
router.post("/blogs", authMiddleware, requireRole(["teacher", "admin"]), BlogController.create);
router.put("/blogs/:id", authMiddleware, requireRole(["teacher", "admin"]), BlogController.update);
router.delete("/blogs/:id", authMiddleware, requireRole(["teacher", "admin"]), BlogController.delete);

// Assignments & Submissions
router.get("/assignments", authMiddleware, AssignmentController.getAssignments);
router.post("/assignments", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.createAssignment);
router.post("/assignments/:id/submit", authMiddleware, AssignmentController.submitAssignment);
router.get("/assignments/:id/submissions", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.getSubmissions);
router.put("/submissions/:id/grade", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.gradeSubmission);

// Resources (Lesson Materials)
router.get("/resources", authMiddleware, ResourceController.getResources);
router.post("/resources", authMiddleware, requireRole(["teacher", "admin"]), ResourceController.createResource);
router.delete("/resources/:id", authMiddleware, requireRole(["teacher", "admin"]), ResourceController.deleteResource);

// Admin Routes
router.get("/admin/stats", authMiddleware, requireRole(["admin"]), AdminController.getStats);
router.get("/admin/users", authMiddleware, requireRole(["admin"]), AdminController.getUsers);
router.post("/admin/users", authMiddleware, requireRole(["admin"]), AdminController.createUser);
router.put("/admin/users/:id", authMiddleware, requireRole(["admin"]), AdminController.updateUser);
router.patch("/admin/users/:id/role", authMiddleware, requireRole(["admin"]), AdminController.updateUserRole);
router.delete("/admin/users/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteUser);
router.get("/admin/courses", authMiddleware, requireRole(["admin"]), AdminController.getCourses);
router.post("/admin/courses", authMiddleware, requireRole(["admin"]), AdminController.createCourse);
router.delete("/admin/courses/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteCourse);
router.get("/admin/enrollments", authMiddleware, requireRole(["admin"]), AdminController.getEnrollments);
router.post("/admin/enrollments/:id/approve", authMiddleware, requireRole(["admin"]), AdminController.approveEnrollment);
router.post("/admin/enrollments/:id/reject", authMiddleware, requireRole(["admin"]), AdminController.rejectEnrollment);
router.get("/admin/reports", authMiddleware, requireRole(["admin"]), AdminController.getReports);
router.get("/admin/teacher-applications", authMiddleware, requireRole(["admin"]), TeacherApplicationController.getApplications);
router.patch("/admin/teacher-applications/:id", authMiddleware, requireRole(["admin"]), TeacherApplicationController.reviewApplication);

export default router;
