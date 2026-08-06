"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("./controller/AuthController");
const CourseController_1 = require("./controller/CourseController");
const SessionController_1 = require("./controller/SessionController");
const StudentController_1 = require("./controller/StudentController");
const auth_1 = require("./middleware/auth");
const router = (0, express_1.Router)();
// Authentication
router.post("/auth/register", AuthController_1.AuthController.register);
router.post("/auth/login", AuthController_1.AuthController.login);
router.get("/auth/me", auth_1.authMiddleware, AuthController_1.AuthController.me);
// Courses
router.get("/courses", CourseController_1.CourseController.getAll);
router.get("/courses/:id", CourseController_1.CourseController.getOne);
router.post("/courses", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.create);
router.post("/courses/:courseId/lessons", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), CourseController_1.CourseController.addLesson);
// Live Sessions
router.get("/sessions", SessionController_1.SessionController.getAll);
router.post("/sessions", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.create);
router.patch("/sessions/:id/status", auth_1.authMiddleware, (0, auth_1.requireRole)(["teacher", "admin"]), SessionController_1.SessionController.updateStatus);
// Student Portal & Enrollments
router.get("/student/enrollments", auth_1.authMiddleware, StudentController_1.StudentController.getEnrollments);
router.post("/student/enrollments", auth_1.authMiddleware, StudentController_1.StudentController.enroll);
router.post("/student/enrollments/:courseId/lessons/complete", auth_1.authMiddleware, StudentController_1.StudentController.completeLesson);
router.get("/student/stats", auth_1.authMiddleware, StudentController_1.StudentController.getDashboardStats);
exports.default = router;
