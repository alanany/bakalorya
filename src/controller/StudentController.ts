import { Response } from "express";
import { AppDataSource } from "../data-source";
import { Enrollment } from "../entity/Enrollment";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";

import { NotificationController } from "./NotificationController";

export class StudentController {
  static async getEnrollments(req: AuthRequest, res: Response) {
    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollments = await enrollmentRepository.find({
        where: { student: { id: req.user!.id } },
        relations: ["course", "course.teacher"]
      });

      // Filter out rejected or banned enrollments so they do not clutter student dashboard
      const activeOrPending = (enrollments || []).filter(e => e.status !== "rejected" && e.status !== "banned");
      return res.status(200).json(activeOrPending);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async enroll(req: AuthRequest, res: Response) {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "Missing courseId." });
    }

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const courseRepository = AppDataSource.getRepository(Course);
      const userRepository = AppDataSource.getRepository(User);

      const course = await courseRepository.findOne({
        where: { id: courseId },
        relations: ["teacher"]
      });
      if (!course) {
        return res.status(404).json({ error: "Course not found." });
      }

      const student = await userRepository.findOneBy({ id: req.user!.id });
      if (!student) {
        return res.status(404).json({ error: "Student profile not found." });
      }

      let enrollment = await enrollmentRepository.findOne({
        where: {
          student: { id: req.user!.id },
          course: { id: courseId }
        }
      });

      if (enrollment) {
        if (enrollment.status === "rejected") {
          enrollment.status = "pending";
          await enrollmentRepository.save(enrollment);
        } else {
          return res.status(200).json(enrollment);
        }
      } else {
        enrollment = new Enrollment();
        enrollment.student = student;
        enrollment.course = course;
        enrollment.progress = 0;
        enrollment.status = "pending";
        enrollment.completedLessons = [];
        await enrollmentRepository.save(enrollment);
      }

      // Notify teacher about new enrollment request
      if (course.teacher) {
        await NotificationController.createNotification(
          course.teacher.id,
          "طلب تسجيل جديد 📩",
          `قدّم الطالب "${student.name}" طلباً للانضمام إلى دورة "${course.title}".`,
          "info",
          "#enrollment-requests"
        );
      }

      return res.status(201).json(enrollment);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async completeLesson(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { lessonId, complete } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: "Missing lessonId." });
    }

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const lessonRepository = AppDataSource.getRepository(Lesson);

      const enrollment = await enrollmentRepository.findOne({
        where: {
          student: { id: req.user!.id },
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
      } else {
        completed = completed.filter(id => id !== lessonId);
      }

      enrollment.completedLessons = completed;
      enrollment.progress = Math.round((completed.length / lessonCount) * 100);

      await enrollmentRepository.save(enrollment);
      return res.status(200).json(enrollment);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async toggleObjective(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { objectiveIndex, completed } = req.body;

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: {
          student: { id: req.user!.id },
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
      } else {
        completedObjs = completedObjs.filter(id => id !== objKey);
      }

      enrollment.completedObjectives = completedObjs;
      await enrollmentRepository.save(enrollment);
      return res.status(200).json(enrollment);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async toggleLessonObjective(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { lessonId, objectiveIndex, completed } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: "Missing lessonId." });
    }

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: {
          student: { id: req.user!.id },
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
      } else {
        lessonObjs = lessonObjs.filter(id => id !== objKey);
      }

      map[lessonId] = lessonObjs;
      enrollment.completedLessonObjectives = map;
      await enrollmentRepository.save(enrollment);
      return res.status(200).json(enrollment);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async submitActivityFile(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { lessonId, fileName, fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: "Missing fileUrl." });
    }

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: {
          student: { id: req.user!.id },
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
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async deleteActivityFile(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { lessonId, submissionId } = req.body;

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: {
          student: { id: req.user!.id },
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
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollments = await enrollmentRepository.find({
        where: { student: { id: req.user!.id } }
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
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
