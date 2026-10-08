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
import { PlatformSettingController } from "./controller/PlatformSettingController";
import { CurriculumController } from "./controller/CurriculumController";
import { CourseGroupController } from "./controller/CourseGroupController";
import { ParentController } from "./controller/ParentController";
import { authMiddleware, optionalAuthMiddleware, requireRole, requireCapability } from "./middleware/auth";
import { authRateLimiter, sensitiveActionLimiter } from "./middleware/rateLimiter";
import { concurrencyLock } from "./middleware/concurrencyLock";
import { idempotency } from "./middleware/idempotency";
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

// Auth Routes (Hardened against brute force, credential stuffing, and duplicate submissions)
router.post("/auth/register", authRateLimiter, concurrencyLock, AuthController.register);
router.post("/auth/login", authRateLimiter, AuthController.login);
router.post("/auth/student/login", authRateLimiter, AuthController.studentLogin);
router.post("/auth/student-login", authRateLimiter, AuthController.studentLogin);
router.post("/auth/staff/login", authRateLimiter, AuthController.staffLogin);
router.post("/auth/staff-login", authRateLimiter, AuthController.staffLogin);
router.post("/auth/parent/login", authRateLimiter, AuthController.parentLogin);
router.post("/auth/parent-login", authRateLimiter, AuthController.parentLogin);
router.get("/auth/me", authMiddleware, AuthController.me);
router.post("/auth/accept-teacher-invitation", AdminTeacherController.acceptInvitation);

// Public Platform Stats & Settings
router.get("/public/stats", AdminController.getPublicStats);
router.get("/public/settings", PlatformSettingController.getPublicSettings);

// Curriculum (Grades, Subjects & Landing Page Explorer)
router.get("/curriculum/grades", CurriculumController.getGrades);
router.get("/curriculum/subjects", CurriculumController.getSubjects);
router.get("/curriculum/subjects/:subjectId/groups", CurriculumController.getSubjectGroups);
router.get("/curriculum/courses/:subjectId/groups", CurriculumController.getSubjectGroups);
router.get("/landing/explore", CurriculumController.getLandingExplore);

// Admin Curriculum Management (Grades & Subjects)
router.get("/admin/curriculum/grades", authMiddleware, requireRole(["admin", "supervisor"]), CurriculumController.getAdminGrades);
router.post("/admin/curriculum/grades", authMiddleware, requireRole(["admin"]), CurriculumController.createGrade);
router.delete("/admin/curriculum/grades/:id", authMiddleware, requireRole(["admin"]), CurriculumController.deleteGrade);
router.post("/admin/curriculum/grades/:gradeId/subjects", authMiddleware, requireRole(["admin"]), CurriculumController.createSubject);
router.put("/admin/curriculum/subjects/:id", authMiddleware, requireRole(["admin"]), CurriculumController.updateSubject);
router.patch("/admin/curriculum/subjects/:id/toggle", authMiddleware, requireRole(["admin"]), CurriculumController.toggleSubjectVisibility);
router.delete("/admin/curriculum/subjects/:id", authMiddleware, requireRole(["admin"]), CurriculumController.deleteSubject);

router.get("/groups/:id", CourseGroupController.getGroupById);
router.post("/groups", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.createGroup);
router.get("/courses/:courseId/groups", CourseGroupController.getCourseGroups);
router.post("/courses/:courseId/groups", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.createGroup);
router.put("/groups/:id", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.updateGroup);
router.delete("/groups/:id", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.deleteGroup);
router.get("/groups/:id/roster", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.getGroupRoster);
router.get("/groups/:id/sessions", authMiddleware, CourseGroupController.getGroupSessions);
router.post("/groups/:id/sessions", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.createGroupSession);
router.delete("/groups/:id/sessions/:sessionId", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.deleteGroupSession);
router.get("/groups/:id/hub", authMiddleware, CourseGroupController.getGroupHub);
router.post("/groups/:id/announcements", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.postGroupAnnouncement);
router.delete("/groups/:id/announcements/:announcementId", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.deleteGroupAnnouncement);
router.post("/groups/:id/videos", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.uploadGroupVideo);
router.delete("/groups/:id/videos/:videoId", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.deleteGroupVideo);
router.post("/groups/:id/lessons", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.addGroupLesson);
router.post("/groups/:id/lessons/import-from-course", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.importCourseLessons);
router.put("/groups/:id/lessons/:lessonId", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.updateGroupLesson);
router.delete("/groups/:id/lessons/:lessonId", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.deleteGroupLesson);
router.post("/groups/:id/assignments", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.createGroupAssignment);
router.post("/groups/:id/resources", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.uploadGroupResource);
router.delete("/groups/:id/resources/:resourceId", authMiddleware, requireRole(["teacher", "admin", "supervisor"]), CourseGroupController.deleteGroupResource);
router.get("/teacher/groups", authMiddleware, requireRole(["teacher", "admin"]), CourseGroupController.getMyTeacherGroups);
router.post("/teachers/:teacherId/request-private-group", authMiddleware, CourseGroupController.requestPrivateGroup);

// Admin Platform Settings
router.get("/admin/settings", authMiddleware, requireRole(["admin"]), PlatformSettingController.getAdminSettings);
router.put("/admin/settings", authMiddleware, requireRole(["admin"]), PlatformSettingController.updateSettings);

// Courses & Lessons (Course Instructor capability enforced)
router.get("/courses", CourseController.getAll);
router.get("/courses/:id", CourseController.getOne);
router.post("/courses", authMiddleware, requireRole(["admin"]), CourseController.create);
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

// Course & Group Approvals (Admin)
router.get("/admin/courses/pending-review", authMiddleware, requireRole(["admin"]), CourseController.getPendingCourses);
router.post("/admin/courses/:id/approve", authMiddleware, requireRole(["admin"]), CourseController.approveCourse);
router.post("/admin/courses/:id/reject", authMiddleware, requireRole(["admin"]), CourseController.rejectCourse);
router.post("/admin/courses/:id/archive", authMiddleware, requireRole(["admin"]), CourseController.archiveCourse);
router.post("/admin/courses/:id/unarchive", authMiddleware, requireRole(["admin"]), CourseController.unarchiveCourse);
router.get("/admin/groups/pending-approval", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.getPendingGroups);
router.get("/admin/all-groups", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.getAllGroups);
router.post("/admin/groups/:id/approve", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.approveGroup);
router.post("/admin/groups/:id/reject", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.rejectGroup);
router.post("/admin/groups/:id/add-student", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.addStudentToGroup);
router.post("/admin/groups/:id/remove-student", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.removeStudentFromGroup);
router.post("/admin/groups/:id/start-teaching", authMiddleware, requireRole(["admin", "supervisor"]), CourseGroupController.startTeachingAndGenerateSessions);

// Admin Teacher Management
router.post("/admin/teachers/invite", authMiddleware, requireRole(["admin"]), AdminTeacherController.inviteTeacher);
router.get("/admin/teachers", authMiddleware, requireRole(["admin", "supervisor"]), AdminTeacherController.getAllTeachers);
router.patch("/admin/teachers/:id/capabilities", authMiddleware, requireRole(["admin"]), AdminTeacherController.updateTeacherCapabilities);

// Monthly Subscription Plans & Subscriptions
router.get("/subscription-plans", SubscriptionController.getPlans);
router.get("/courses/:courseId/subscription-plans", SubscriptionController.getPlans);
router.post("/subscription-plans", authMiddleware, requireRole(["admin"]), SubscriptionController.createPlan);
router.put("/subscription-plans/:id", authMiddleware, requireRole(["admin"]), SubscriptionController.updatePlan);

router.post("/subscriptions", authMiddleware, sensitiveActionLimiter, concurrencyLock, idempotency, SubscriptionController.subscribe);
router.get("/subscriptions/my", authMiddleware, SubscriptionController.getMySubscriptions);
router.get("/subscriptions/my/course/:courseId", authMiddleware, SubscriptionController.getCourseQuota);
router.get("/courses/:courseId/my-quota", authMiddleware, SubscriptionController.getCourseQuota);
router.get("/subscriptions/teacher-assigned", authMiddleware, requireRole(["teacher"]), SubscriptionController.getTeacherSubscriptions);
router.get("/admin/subscriptions", authMiddleware, requireRole(["admin", "supervisor"]), SubscriptionController.getAllSubscriptions);
router.post("/admin/subscriptions/manual-create", authMiddleware, requireRole(["admin"]), SubscriptionController.manualCreateSubscription);
router.patch("/admin/subscriptions/:id/assign-teacher", authMiddleware, requireRole(["admin"]), SubscriptionController.assignTeacher);
router.patch("/admin/subscriptions/:id/approve", authMiddleware, requireRole(["admin"]), SubscriptionController.approveSubscription);
router.patch("/admin/subscriptions/:id/reject", authMiddleware, requireRole(["admin"]), SubscriptionController.rejectSubscription);
router.patch("/admin/subscriptions/:id/renew", authMiddleware, requireRole(["admin"]), SubscriptionController.renewSubscription);
router.patch("/subscriptions/:id/cancel", authMiddleware, SubscriptionController.cancelSubscription);
router.delete("/subscription-plans/:id", authMiddleware, requireRole(["admin"]), SubscriptionController.deletePlan);
router.patch("/admin/teacher-earnings/:id/pay", authMiddleware, requireRole(["admin"]), TeacherEarningController.markAsPaid);
router.post("/admin/teacher-earnings/pay-teacher", authMiddleware, requireRole(["admin"]), TeacherEarningController.payTeacher);
router.delete("/admin/teacher-earnings/:id/receipt", authMiddleware, requireRole(["admin"]), TeacherEarningController.revertPayout);
router.delete("/admin/teacher-earnings/:id", authMiddleware, requireRole(["admin"]), TeacherEarningController.deleteEarning);

// Teacher Availability (Session Teacher capability enforced)
router.get("/teachers/:id/availability", TeacherAvailabilityController.getByTeacher);
router.post("/teacher/availability", authMiddleware, requireCapability("SESSION_TEACHER"), TeacherAvailabilityController.setAvailability);
router.delete("/teacher/availability/:id", authMiddleware, requireCapability("SESSION_TEACHER"), TeacherAvailabilityController.deleteSlot);

// Private Session Booking & Completion (Protected by concurrency lock, idempotency & rate limits)
router.post("/sessions/book", authMiddleware, sensitiveActionLimiter, concurrencyLock, idempotency, SessionBookingController.bookSession);
router.post("/sessions/batch-schedule", authMiddleware, sensitiveActionLimiter, concurrencyLock, idempotency, SessionBookingController.batchScheduleSessions);
router.post("/sessions/group-schedule", authMiddleware, requireRole(["admin", "supervisor"]), SessionBookingController.scheduleGroupSession);
router.post("/sessions/group-preview-conflicts", authMiddleware, requireRole(["admin", "supervisor"]), SessionBookingController.previewGroupConflicts);
router.post("/admin/group-sessions/add-student", authMiddleware, requireRole(["admin", "supervisor"]), SessionBookingController.addStudentToGroupSession);
router.post("/admin/group-sessions/remove-student", authMiddleware, requireRole(["admin", "supervisor"]), SessionBookingController.removeStudentFromGroupSession);
router.get("/subscriptions/:id/schedule-details", authMiddleware, SessionBookingController.getSubscriptionScheduleDetails);
router.post("/sessions/preview-package-schedule", authMiddleware, SessionBookingController.previewPackageSchedule);
router.post("/sessions/recheck-schedule-conflicts", authMiddleware, SessionBookingController.recheckScheduleConflicts);
router.post("/sessions/confirm-package-schedule", authMiddleware, sensitiveActionLimiter, concurrencyLock, idempotency, SessionBookingController.confirmPackageSchedule);
router.post("/sessions/:id/complete", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.completeSession);
router.post("/sessions/:id/cancel", authMiddleware, SessionBookingController.cancelSession);
router.post("/sessions/:id/no-show", authMiddleware, requireCapability("SESSION_TEACHER"), SessionBookingController.noShowSession);
router.post("/sessions/:id/checkin", authMiddleware, SessionBookingController.checkInAttendance);
router.post("/sessions/:id/check-in", authMiddleware, SessionBookingController.checkInAttendance);
router.get("/sessions/:id/attendance", authMiddleware, SessionBookingController.getSessionAttendance);
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
router.post("/upload", authMiddleware, uploadSingleFile, UploadController.uploadFile);

// Live Sessions
router.get("/sessions", optionalAuthMiddleware, SessionController.getAll);
router.get("/sessions/:id/reminder-data", authMiddleware, requireRole(["admin", "teacher"]), SessionController.getSessionReminderData);
router.post("/sessions", authMiddleware, requireRole(["teacher", "admin"]), SessionController.create);
router.put("/sessions/:id", authMiddleware, requireRole(["teacher", "admin"]), SessionController.update);
router.delete("/sessions/:id", authMiddleware, requireRole(["teacher", "admin"]), SessionController.delete);
router.patch("/sessions/:id/status", authMiddleware, requireRole(["teacher", "admin"]), SessionController.updateStatus);

// Student Portal & Enrollments
router.get("/student/enrollments", authMiddleware, StudentController.getEnrollments);
router.post("/student/enrollments", authMiddleware, sensitiveActionLimiter, concurrencyLock, idempotency, StudentController.enroll);
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

// Reviews & Ratings (Protected against spam & duplicate submissions)
router.post("/reviews", authMiddleware, sensitiveActionLimiter, concurrencyLock, ReviewController.create);
router.get("/reviews/course/:courseId", ReviewController.getByCourse);
router.get("/reviews/teacher/:teacherId", ReviewController.getByTeacher);
router.delete("/reviews/:id", authMiddleware, ReviewController.delete);

// Teachers & Users
router.post("/teacher-applications", sensitiveActionLimiter, concurrencyLock, TeacherApplicationController.apply);
router.get("/teachers", UserController.getTeachers);
router.get("/teachers/:id", UserController.getTeacherById);
router.get("/teachers/:id/groups", optionalAuthMiddleware, CourseGroupController.getTeacherGroups);
router.patch("/users/me", authMiddleware, UserController.updateProfile);
router.post("/users/request-phone-change", authMiddleware, UserController.requestPhoneChange);
router.post("/users/avatar", authMiddleware, uploadSingleAvatar, UserController.uploadAvatar);
router.post("/users/change-password", authMiddleware, UserController.changePassword);
router.post("/auth/change-password", authMiddleware, UserController.changePassword);
router.get("/users/students", authMiddleware, requireRole(["teacher", "admin"]), UserController.getStudents);
router.post("/teacher/students", authMiddleware, requireRole(["admin"]), UserController.addStudent);
router.delete("/teacher/students/:studentId", authMiddleware, requireRole(["admin"]), UserController.deleteStudent);
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
router.get("/blogs", optionalAuthMiddleware, BlogController.getAll);
router.get("/blogs/:id", optionalAuthMiddleware, BlogController.getOne);
router.post("/blogs", authMiddleware, requireRole(["admin"]), BlogController.create);
router.put("/blogs/:id", authMiddleware, requireRole(["admin"]), BlogController.update);
router.delete("/blogs/:id", authMiddleware, requireRole(["admin"]), BlogController.delete);
router.get("/admin/blogs", authMiddleware, requireRole(["admin", "supervisor"]), BlogController.getAdminBlogs);
router.patch("/admin/blogs/:id/status", authMiddleware, requireRole(["admin"]), BlogController.updateStatus);

// Assignments & Submissions
router.get("/assignments/teacher-review", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.getTeacherAssignmentsReview);
router.get("/assignments", authMiddleware, AssignmentController.getAssignments);
router.post("/assignments", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.createAssignment);
router.get("/assignments/:id", authMiddleware, AssignmentController.getAssignmentById);
router.put("/assignments/:id", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.updateAssignment);
router.delete("/assignments/:id", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.deleteAssignment);
router.post("/assignments/:id/submit", authMiddleware, AssignmentController.submitAssignment);
router.get("/assignments/:id/submissions", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.getSubmissions);
router.get("/submissions/:id", authMiddleware, AssignmentController.getSubmissionDetails);
router.put("/submissions/:id/grade", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.gradeSubmission);

// Resources (Lesson Materials)
router.get("/resources", authMiddleware, ResourceController.getResources);
router.post("/resources", authMiddleware, requireRole(["teacher", "admin"]), ResourceController.createResource);
router.delete("/resources/:id", authMiddleware, requireRole(["teacher", "admin"]), ResourceController.deleteResource);

// Tests & Quizzes
router.get("/tests", authMiddleware, TestController.getTests);
router.get("/tests/:id/questions", authMiddleware, TestController.getTestQuestions);
router.post("/tests", authMiddleware, requireRole(["teacher", "admin"]), TestController.createTest);
router.post("/tests/:id/submit", authMiddleware, requireRole(["student"]), TestController.submitTest);

// Admin Routes
router.get("/admin/stats", authMiddleware, requireRole(["admin", "supervisor"]), AdminController.getStats);
router.get("/admin/users", authMiddleware, requireRole(["admin", "supervisor"]), AdminController.getUsers);
router.post("/admin/users", authMiddleware, requireRole(["admin"]), AdminController.createUser);
router.put("/admin/users/:id", authMiddleware, requireRole(["admin"]), AdminController.updateUser);
router.patch("/admin/users/:id/role", authMiddleware, requireRole(["admin"]), AdminController.updateUserRole);
router.patch("/admin/users/:id/block", authMiddleware, requireRole(["admin"]), AdminController.toggleBlockUser);
router.post("/admin/users/:id/reset-password", authMiddleware, requireRole(["admin"]), AdminController.resetPassword);
router.delete("/admin/users/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteUser);
router.get("/admin/courses", authMiddleware, requireRole(["admin", "supervisor"]), AdminController.getCourses);
router.post("/admin/courses", authMiddleware, requireRole(["admin"]), AdminController.createCourse);
router.put("/admin/courses/:id", authMiddleware, requireRole(["admin"]), AdminController.updateCourse);
router.post("/admin/courses/:id/assign-teacher", authMiddleware, requireRole(["admin"]), AdminController.assignTeacher);
router.post("/admin/courses/:id/duplicate", authMiddleware, requireRole(["admin"]), AdminController.duplicateCourse);
router.delete("/admin/courses/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteCourse);
router.get("/admin/enrollments", authMiddleware, requireRole(["admin", "supervisor"]), AdminController.getEnrollments);
router.post("/admin/enrollments/:id/approve", authMiddleware, requireRole(["admin"]), AdminController.approveEnrollment);
router.post("/admin/enrollments/:id/reject", authMiddleware, requireRole(["admin"]), AdminController.rejectEnrollment);
router.delete("/admin/payments/:id", authMiddleware, requireRole(["admin"]), AdminController.deletePayment);
router.get("/admin/reports", authMiddleware, requireRole(["admin", "supervisor"]), AdminController.getReports);
router.get("/admin/teacher-applications", authMiddleware, requireRole(["admin", "supervisor"]), TeacherApplicationController.getApplications);
router.put("/admin/teacher-applications/:id", authMiddleware, requireRole(["admin"]), TeacherApplicationController.reviewApplication);
router.patch("/admin/teacher-applications/:id", authMiddleware, requireRole(["admin"]), TeacherApplicationController.reviewApplication);

// ─── Parent Portal Routes ─────────────────────────────────────────────────────
// Admin: manage parent accounts
router.get("/admin/parents", authMiddleware, requireRole(["admin", "supervisor"]), ParentController.adminListParents);
router.post("/admin/parents", authMiddleware, requireRole(["admin"]), ParentController.adminCreateParent);
router.patch("/admin/parents/:id/approve", authMiddleware, requireRole(["admin"]), ParentController.adminApproveParent);
router.patch("/admin/parents/:id/block", authMiddleware, requireRole(["admin"]), ParentController.adminToggleBlockParent);
router.get("/admin/parents/:parentId/children", authMiddleware, requireRole(["admin"]), ParentController.adminGetChildren);
router.post("/admin/parents/:parentId/children", authMiddleware, requireRole(["admin"]), ParentController.adminAddChild);
router.delete("/admin/parent-links/:linkId", authMiddleware, requireRole(["admin"]), ParentController.adminRemoveChild);
router.get("/admin/students/search", authMiddleware, requireRole(["admin"]), ParentController.adminSearchStudents);
// Parent: read-only portal
router.get("/parent/children", authMiddleware, requireRole(["parent"]), ParentController.myChildren);
router.get("/parent/children/:studentId/groups", authMiddleware, requireRole(["parent"]), ParentController.childGroups);
router.get("/parent/children/:studentId/sessions", authMiddleware, requireRole(["parent"]), ParentController.childSessions);
router.get("/parent/children/:studentId/grades", authMiddleware, requireRole(["parent"]), ParentController.childGrades);
router.get("/parent/children/:studentId/billing", authMiddleware, requireRole(["parent"]), ParentController.childBilling);

// Supervisor Management (admin only)
// Supervisors are managed via the existing /admin/users endpoints with role=supervisor
// The following dedicated route allows filtering supervisors specifically
router.get("/admin/supervisors", authMiddleware, requireRole(["admin"]), async (req: any, res: any) => {
  try {
    const { AppDataSource } = await import("./data-source");
    const { User } = await import("./entity/User");
    const userRepo = AppDataSource.getRepository(User);
    const supervisors = await userRepo.find({
      where: { role: "supervisor" as any },
      order: { createdAt: "DESC" },
      select: ["id", "name", "email", "role", "avatar", "phone", "status", "isBlocked", "blockReason", "notes", "createdAt", "education", "location"]
    });
    return res.json(supervisors);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch supervisors." });
  }
});

export default router;

