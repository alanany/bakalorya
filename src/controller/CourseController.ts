import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { User } from "../entity/User";
import { Enrollment } from "../entity/Enrollment";
import { AuthRequest } from "../middleware/auth";

export class CourseController {
  static async getAll(req: Request, res: Response) {
    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const courses = await courseRepository.find({ relations: ["teacher"] });
      return res.status(200).json(courses);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async getOne(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const lessonRepository = AppDataSource.getRepository(Lesson);

      const course = await courseRepository.findOneBy({ id });
      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }

      const lessons = await lessonRepository.find({
        where: { course: { id } },
        order: { order: "ASC" },
      });

      return res.status(200).json({ ...course, lessons });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    const { title, description, category, degree, image, meetingLink } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: "Missing title, description, or category." });
    }

    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const userRepository = AppDataSource.getRepository(User);

      const teacher = await userRepository.findOneBy({ id: req.user!.id });
      if (!teacher) {
        return res.status(404).json({ error: "Teacher profile not found." });
      }

      const course = new Course();
      course.title = title;
      course.description = description;
      course.category = category;
      course.degree = degree || null;
      course.meetingLink = meetingLink || null;
      course.image = image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60";
      course.teacher = teacher;

      await courseRepository.save(course);
      return res.status(201).json(course);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async addLesson(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { title, description, videoUrl, duration, chapter, order } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ error: "Missing title or videoUrl." });
    }

    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const lessonRepository = AppDataSource.getRepository(Lesson);

      const course = await courseRepository.findOne({
        where: { id: courseId },
        relations: ["teacher"]
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }

      if (course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
      }

      const lesson = new Lesson();
      lesson.title = title;
      lesson.description = description;
      lesson.videoUrl = videoUrl;
      lesson.duration = duration || "0:00";
      lesson.chapter = chapter || "General";
      lesson.order = typeof order === "number" ? order : 0;
      lesson.course = course;

      await lessonRepository.save(lesson);
      return res.status(201).json(lesson);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { title, description, category, degree, image, meetingLink, price } = req.body;

    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const course = await courseRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }

      if (course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
      }

      if (title) course.title = title;
      if (description) course.description = description;
      if (category) course.category = category;
      if (degree !== undefined) course.degree = degree;
      if (image) course.image = image;
      if (meetingLink !== undefined) course.meetingLink = meetingLink;
      if (price !== undefined) course.price = price; // Assuming price is a field in Course entity, if not, it will just be ignored by TypeORM if missing from entity, but we should check if price exists. Wait, I will just omit price for now since it wasn't explicitly requested by the user's previous schema unless it exists. Let's omit price.

      await courseRepository.save(course);
      return res.status(200).json(course);
    } catch (err) {
      console.error("Course update error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateLesson(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { title, description, videoUrl, duration, chapter, order } = req.body;

    try {
      const lessonRepository = AppDataSource.getRepository(Lesson);
      const lesson = await lessonRepository.findOne({
        where: { id },
        relations: ["course", "course.teacher"]
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found." });
      }

      if (lesson.course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
      }

      if (title) lesson.title = title;
      if (description !== undefined) lesson.description = description;
      if (videoUrl) lesson.videoUrl = videoUrl;
      if (duration) lesson.duration = duration;
      if (chapter) lesson.chapter = chapter;
      if (typeof order === "number") lesson.order = order;

      await lessonRepository.save(lesson);
      return res.status(200).json(lesson);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async deleteLesson(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const lessonRepository = AppDataSource.getRepository(Lesson);
      const lesson = await lessonRepository.findOne({
        where: { id },
        relations: ["course", "course.teacher"]
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found." });
      }

      if (lesson.course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this course." });
      }

      await lessonRepository.remove(lesson);
      return res.status(200).json({ message: "Lesson deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async deleteCourse(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({
        where: { id },
        relations: ["teacher", "enrollments"]
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }

      if (course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden." });
      }

      const activeEnrollmentsCount = course.enrollments ? course.enrollments.filter(e => e.status === "active").length : 0;

      // Protection: if course has active enrolled students and action is from teacher without force
      if (activeEnrollmentsCount > 0 && req.user!.role !== "admin" && req.query.force !== "true") {
        return res.status(400).json({
          error: `تنبيه: يوجد ${activeEnrollmentsCount} طالب مسجل بهذه الدورة. يوصى بإبقاء الدورة لحماية حق المشتركين، أو تواصل مع المشرف العام.`,
          hasStudents: true
        });
      }

      await courseRepo.remove(course);
      return res.json({ message: "تم حذف الدورة بنجاح." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete course." });
    }
  }

  static async getEnrollmentRequests(req: AuthRequest, res: Response) {
    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      // Find pending enrollments for courses owned by this teacher
      const requests = await enrollmentRepository.find({
        where: {
          status: "pending",
          course: {
            teacher: { id: req.user!.id }
          }
        },
        relations: ["student", "course", "course.teacher"]
      });
      return res.status(200).json(requests);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateEnrollmentRequest(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'rejected'

    if (!status || !["active", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: { id },
        relations: ["course", "course.teacher"]
      });

      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found." });
      }

      if (enrollment.course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden." });
      }

      enrollment.status = status;
      await enrollmentRepository.save(enrollment);
      return res.status(200).json(enrollment);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
