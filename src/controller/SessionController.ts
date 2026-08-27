import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";
import { User } from "../entity/User";
import { Course } from "../entity/Course";
import { AuthRequest } from "../middleware/auth";

export class SessionController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const sessions = await sessionRepository.find({
        relations: ["teacher", "course", "student"],
        order: { scheduledAt: "ASC" }
      });

      let finalSessions = sessions;

      if (req.user && req.user.role === "student") {
        const enrollmentRepository = AppDataSource.getRepository("Enrollment");
        const activeEnrollments = await enrollmentRepository.find({
          where: { student: { id: req.user.id }, status: "active" },
          relations: ["course"]
        }) as any[];
        
        const activeCourseIds = activeEnrollments.map(e => e.course?.id).filter(Boolean);
        
        finalSessions = sessions.filter(session => {
          // 1. If assigned directly to this student
          if (session.student?.id) {
            return session.student.id === req.user!.id;
          }
          // 2. If session belongs to a course, student must have an active enrollment
          if (session.course?.id) {
            return activeCourseIds.includes(session.course.id);
          }
          return false;
        });
      } else if (req.user && req.user.role === "teacher") {
        finalSessions = sessions.filter(session => session.teacher?.id === req.user!.id);
      }

      return res.status(200).json(finalSessions);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    const { title, description, scheduledAt, duration, courseId } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ error: "Missing title or scheduledAt date." });
    }

    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    const minAllowedTime = new Date(now.getTime() + 59 * 60 * 1000);

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "تاريخ البث المباشر غير صالح." });
    }

    if (scheduledDate < minAllowedTime) {
      return res.status(400).json({ error: "عفواً، موعد البث المباشر يجب أن يكون في المستقبل وبعد الوقت الحالي بساعة واحدة على الأقل." });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);
      const courseRepository = AppDataSource.getRepository(Course);

      const teacher = await userRepository.findOneBy({ id: req.user!.id });
      if (!teacher) {
        return res.status(404).json({ error: "Teacher profile not found." });
      }

      const session = new Session();
      session.title = title;
      session.description = description;
      session.teacher = teacher;
      session.scheduledAt = scheduledDate;
      session.duration = duration || 60;
      session.status = "scheduled";

      if (courseId) {
        const course = await courseRepository.findOneBy({ id: courseId });
        if (course) {
          session.course = course;
        }
      }

      await sessionRepository.save(session);
      return res.status(201).json(session);
    } catch (err) {
      console.error("Session creation error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { title, description, scheduledAt, duration, courseId } = req.body;

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const courseRepository = AppDataSource.getRepository(Course);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "course"]
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      if (session.teacher?.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
      }

      if (title) session.title = title;
      if (description !== undefined) session.description = description;
      if (scheduledAt) {
        const scheduledDate = new Date(scheduledAt);
        const now = new Date();
        const minAllowedTime = new Date(now.getTime() + 59 * 60 * 1000);

        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({ error: "تاريخ البث المباشر غير صالح." });
        }

        if (scheduledDate < minAllowedTime) {
          return res.status(400).json({ error: "عفواً، موعد البث المباشر يجب أن يكون في المستقبل وبعد الوقت الحالي بساعة واحدة على الأقل." });
        }
        session.scheduledAt = scheduledDate;
      }
      if (duration) session.duration = Number(duration);

      if (courseId) {
        const course = await courseRepository.findOneBy({ id: String(courseId) });
        if (course) session.course = course;
      }

      await sessionRepository.save(session);
      const updated = await sessionRepository.findOne({
        where: { id: session.id },
        relations: ["teacher", "course"]
      });
      return res.status(200).json(updated);
    } catch (err) {
      console.error("Update session error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      if (session.teacher?.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
      }

      await sessionRepository.remove(session);
      return res.status(200).json({ message: "Session deleted." });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    if (!["scheduled", "live", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "course"]
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      if (session.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
      }

      session.status = status;
      await sessionRepository.save(session);
      return res.status(200).json(session);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
