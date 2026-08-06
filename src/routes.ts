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
import { authMiddleware, requireRole } from "./middleware/auth";
import multer from "multer";
import path from "path";
import crypto from "crypto";

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

// Authentication
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.get("/auth/me", authMiddleware, AuthController.me);

// Courses
router.get("/courses", CourseController.getAll);
router.get("/courses/:id", CourseController.getOne);
router.post("/courses", authMiddleware, requireRole(["teacher", "admin"]), CourseController.create);
router.put("/courses/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.update);
router.delete("/courses/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.deleteCourse);
router.post("/courses/:courseId/lessons", authMiddleware, requireRole(["teacher", "admin"]), CourseController.addLesson);
router.put("/lessons/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.updateLesson);
router.delete("/lessons/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.deleteLesson);

// Uploads
router.post("/upload", authMiddleware, requireRole(["teacher", "admin"]), upload.single("file"), UploadController.uploadFile);

// Live Sessions
router.get("/sessions", SessionController.getAll);
router.post("/sessions", authMiddleware, requireRole(["teacher", "admin"]), SessionController.create);
router.put("/sessions/:id", authMiddleware, requireRole(["teacher", "admin"]), SessionController.update);
router.delete("/sessions/:id", authMiddleware, requireRole(["teacher", "admin"]), SessionController.delete);
router.patch("/sessions/:id/status", authMiddleware, requireRole(["teacher", "admin"]), SessionController.updateStatus);

// Student Portal & Enrollments
router.get("/student/enrollments", authMiddleware, StudentController.getEnrollments);
router.post("/student/enrollments", authMiddleware, StudentController.enroll);
router.post("/student/enrollments/:courseId/lessons/complete", authMiddleware, StudentController.completeLesson);
router.get("/student/stats", authMiddleware, StudentController.getDashboardStats);

// ─── TEACHER & USER ROUTES ──────────────────────────────────────────────────────────
router.post("/teacher-applications", TeacherApplicationController.apply);
router.get("/teachers", UserController.getTeachers);
router.get("/teachers/:id", UserController.getTeacherById);
router.patch("/users/me", authMiddleware, UserController.updateProfile);
router.get("/users/students", authMiddleware, requireRole(["teacher", "admin"]), UserController.getStudents);
router.post("/teacher/students", authMiddleware, requireRole(["teacher", "admin"]), UserController.addStudent);
router.delete("/teacher/students/:studentId", authMiddleware, requireRole(["teacher", "admin"]), UserController.deleteStudent);
router.get("/teacher/enrollment-requests", authMiddleware, requireRole(["teacher", "admin"]), CourseController.getEnrollmentRequests);
router.put("/teacher/enrollment-requests/:id", authMiddleware, requireRole(["teacher", "admin"]), CourseController.updateEnrollmentRequest);
router.patch("/users/students/enrollments/:enrollmentId/status", authMiddleware, UserController.toggleBan);

// ── Admin Panel ───────────────────────────────────────────────────────────────
router.get("/admin/stats", authMiddleware, requireRole(["admin"]), AdminController.getStats);
router.get("/admin/users", authMiddleware, requireRole(["admin"]), AdminController.getUsers);
router.post("/admin/users", authMiddleware, requireRole(["admin"]), AdminController.createUser);
router.put("/admin/users/:id", authMiddleware, requireRole(["admin"]), AdminController.updateUser);
router.patch("/admin/users/:id/role", authMiddleware, requireRole(["admin"]), AdminController.updateUserRole);
router.delete("/admin/users/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteUser);
router.get("/admin/courses", authMiddleware, requireRole(["admin"]), AdminController.getCourses);
router.delete("/admin/courses/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteCourse);
router.delete("/admin/sessions/:id", authMiddleware, requireRole(["admin"]), AdminController.deleteSession);
router.get("/admin/reports", authMiddleware, requireRole(["admin"]), AdminController.getReports);
router.get("/admin/teacher-applications", authMiddleware, requireRole(["admin"]), TeacherApplicationController.getApplications);
router.put("/admin/teacher-applications/:id", authMiddleware, requireRole(["admin"]), TeacherApplicationController.reviewApplication);

// ── Assignments ───────────────────────────────────────────────────────────────
router.get("/assignments", authMiddleware, AssignmentController.getAssignments);
router.post("/assignments", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.createAssignment);
router.post("/assignments/:id/submit", authMiddleware, requireRole(["student"]), AssignmentController.submitAssignment);
router.get("/assignments/:id/submissions", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.getSubmissions);
router.patch("/submissions/:id/grade", authMiddleware, requireRole(["teacher", "admin"]), AssignmentController.gradeSubmission);

// ── Resources ─────────────────────────────────────────────────────────────────
router.get("/resources", authMiddleware, ResourceController.getResources);
router.post("/resources", authMiddleware, requireRole(["teacher", "admin"]), ResourceController.createResource);
router.delete("/resources/:id", authMiddleware, requireRole(["teacher", "admin"]), ResourceController.deleteResource);

// ─── Blogs & Articles ─────────────────────────────────────────────────────────
router.get("/blogs", BlogController.getAll);
router.get("/blogs/:id", BlogController.getOne);
router.post("/blogs", authMiddleware, requireRole(["teacher", "admin"]), BlogController.create);
router.put("/blogs/:id", authMiddleware, requireRole(["teacher", "admin"]), BlogController.update);
router.delete("/blogs/:id", authMiddleware, requireRole(["teacher", "admin"]), BlogController.delete);

// ── Tests ─────────────────────────────────────────────────────────────────────
router.get("/tests", authMiddleware, TestController.getTests);
router.post("/tests", authMiddleware, requireRole(["teacher", "admin"]), TestController.createTest);
router.get("/tests/:id/questions", authMiddleware, TestController.getTestQuestions);
router.post("/tests/:id/submit", authMiddleware, requireRole(["student"]), TestController.submitTest);

// ─── Categories ─────────────────────────────────────────────────────────────
router.get("/categories", CategoryController.getAll);
router.post("/categories", authMiddleware, requireRole(["admin"]), CategoryController.create);
router.put("/categories/:id", authMiddleware, requireRole(["admin"]), CategoryController.update);
router.delete("/categories/:id", authMiddleware, requireRole(["admin"]), CategoryController.delete);

export default router;
