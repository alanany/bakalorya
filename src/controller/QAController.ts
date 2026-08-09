import { Response } from "express";
import { AppDataSource } from "../data-source";
import { QuestionAnswer } from "../entity/QuestionAnswer";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";

export class QAController {
  static async getByCourse(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    try {
      const qaRepo = AppDataSource.getRepository(QuestionAnswer);
      const qaList = await qaRepo.find({
        where: { course: { id: courseId } },
        relations: ["student", "teacher", "lesson"],
        order: { createdAt: "DESC" }
      });

      // Filter out sensitive user data
      const sanitized = qaList.map(item => ({
        id: item.id,
        questionText: item.questionText,
        answerText: item.answerText,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        student: item.student ? {
          id: item.student.id,
          name: item.student.name,
          avatar: item.student.avatar,
          role: item.student.role
        } : null,
        teacher: item.teacher ? {
          id: item.teacher.id,
          name: item.teacher.name,
          avatar: item.teacher.avatar,
          role: item.teacher.role
        } : null,
        lesson: item.lesson ? {
          id: item.lesson.id,
          title: item.lesson.title
        } : null
      }));

      return res.json(sanitized);
    } catch (err) {
      console.error("Get QA Error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async createQuestion(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { questionText, lessonId } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: "الرجاء إدخال نص السؤال." });
    }

    try {
      const courseRepo = AppDataSource.getRepository(Course);
      const userRepo = AppDataSource.getRepository(User);
      const qaRepo = AppDataSource.getRepository(QuestionAnswer);

      const course = await courseRepo.findOneBy({ id: courseId });
      if (!course) {
        return res.status(404).json({ error: "الدورة غير موجودة." });
      }

      const student = await userRepo.findOneBy({ id: req.user!.id });
      if (!student) {
        return res.status(404).json({ error: "حساب الطالب غير موجود." });
      }

      const qa = new QuestionAnswer();
      qa.questionText = questionText.trim();
      qa.student = student;
      qa.course = course;

      if (lessonId) {
        const lessonRepo = AppDataSource.getRepository(Lesson);
        const lesson = await lessonRepo.findOneBy({ id: lessonId });
        if (lesson) qa.lesson = lesson;
      }

      await qaRepo.save(qa);

      return res.status(201).json({
        id: qa.id,
        questionText: qa.questionText,
        answerText: qa.answerText,
        createdAt: qa.createdAt,
        student: {
          id: student.id,
          name: student.name,
          avatar: student.avatar,
          role: student.role
        },
        teacher: null,
        lesson: qa.lesson ? { id: qa.lesson.id, title: qa.lesson.title } : null
      });
    } catch (err) {
      console.error("Create QA Error:", err);
      return res.status(500).json({ error: "فشل حفظ السؤال." });
    }
  }

  static async answerQuestion(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { answerText } = req.body;

    if (!answerText || !answerText.trim()) {
      return res.status(400).json({ error: "الرجاء إدخال نص الإجابة." });
    }

    try {
      const qaRepo = AppDataSource.getRepository(QuestionAnswer);
      const userRepo = AppDataSource.getRepository(User);

      const qa = await qaRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher", "student", "teacher"]
      });

      if (!qa) {
        return res.status(404).json({ error: "السؤال غير موجود." });
      }

      // Check permission: teacher of course or admin
      if (req.user!.role !== "admin" && qa.course.teacher?.id !== req.user!.id) {
        return res.status(403).json({ error: "غير مصرح لك بإضافة إجابة على هذا السؤال." });
      }

      const teacher = await userRepo.findOneBy({ id: req.user!.id });
      if (!teacher) {
        return res.status(404).json({ error: "حساب المعلم غير موجود." });
      }

      qa.answerText = answerText.trim();
      qa.teacher = teacher;
      await qaRepo.save(qa);

      return res.json({
        id: qa.id,
        questionText: qa.questionText,
        answerText: qa.answerText,
        createdAt: qa.createdAt,
        updatedAt: qa.updatedAt,
        student: qa.student ? { id: qa.student.id, name: qa.student.name, avatar: qa.student.avatar } : null,
        teacher: { id: teacher.id, name: teacher.name, avatar: teacher.avatar, role: teacher.role }
      });
    } catch (err) {
      console.error("Answer QA Error:", err);
      return res.status(500).json({ error: "فشل حفظ الإجابة." });
    }
  }

  static async deleteQuestion(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const qaRepo = AppDataSource.getRepository(QuestionAnswer);
      const qa = await qaRepo.findOne({
        where: { id },
        relations: ["student", "course", "course.teacher"]
      });

      if (!qa) {
        return res.status(404).json({ error: "السؤال غير موجود." });
      }

      const isTeacherOrAdmin = req.user!.role === "admin" || (qa.course.teacher && qa.course.teacher.id === req.user!.id);
      const isOwnerStudent = qa.student && qa.student.id === req.user!.id;

      if (!isTeacherOrAdmin && !isOwnerStudent) {
        return res.status(403).json({ error: "غير مصرح لك بحذف هذا السؤال." });
      }

      await qaRepo.remove(qa);
      return res.json({ message: "تم حذف السؤال بنجاح." });
    } catch (err) {
      console.error("Delete QA Error:", err);
      return res.status(500).json({ error: "فشل حذف السؤال." });
    }
  }
}
