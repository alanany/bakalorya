"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const data_source_1 = require("../data-source");
const Course_1 = require("../entity/Course");
const Lesson_1 = require("../entity/Lesson");
const User_1 = require("../entity/User");
class CourseController {
    static async getAll(req, res) {
        try {
            const courseRepository = data_source_1.AppDataSource.getRepository(Course_1.Course);
            const courses = await courseRepository.find();
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
            const course = await courseRepository.findOneBy({ id });
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
        const { title, description, category, image } = req.body;
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
            course.image = image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60";
            course.teacher = teacher;
            await courseRepository.save(course);
            return res.status(201).json(course);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async addLesson(req, res) {
        const { courseId } = req.params;
        const { title, description, videoUrl, duration, chapter, order } = req.body;
        if (!title || !videoUrl) {
            return res.status(400).json({ error: "Missing title or videoUrl." });
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
            if (course.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
            }
            const lesson = new Lesson_1.Lesson();
            lesson.title = title;
            lesson.description = description;
            lesson.videoUrl = videoUrl;
            lesson.duration = duration || "0:00";
            lesson.chapter = chapter || "General";
            lesson.order = typeof order === "number" ? order : 0;
            lesson.course = course;
            await lessonRepository.save(lesson);
            return res.status(201).json(lesson);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}
exports.CourseController = CourseController;
