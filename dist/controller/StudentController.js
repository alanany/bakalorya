"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentController = void 0;
const data_source_1 = require("../data-source");
const Enrollment_1 = require("../entity/Enrollment");
const Course_1 = require("../entity/Course");
const Lesson_1 = require("../entity/Lesson");
const User_1 = require("../entity/User");
class StudentController {
    static async getEnrollments(req, res) {
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const enrollments = await enrollmentRepository.find({
                where: { student: { id: req.user.id } },
                relations: ["course", "course.teacher"]
            });
            return res.status(200).json(enrollments);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async enroll(req, res) {
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ error: "Missing courseId." });
        }
        try {
            const enrollmentRepository = data_source_1.AppDataSource.getRepository(Enrollment_1.Enrollment);
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
            const existing = await enrollmentRepository.findOne({
                where: {
                    student: { id: req.user.id },
                    course: { id: courseId }
                }
            });
            if (existing) {
                return res.status(200).json(existing);
            }
            const course = await courseRepository.findOneBy({ id: courseId });
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }
            const student = await userRepository.findOneBy({ id: req.user.id });
            if (!student) {
                return res.status(404).json({ error: "Student profile not found." });
            }
            const enrollment = new Enrollment_1.Enrollment();
            enrollment.student = student;
            enrollment.course = course;
            enrollment.progress = 0;
            enrollment.completedLessons = [];
            await enrollmentRepository.save(enrollment);
            return res.status(201).json(enrollment);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
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
