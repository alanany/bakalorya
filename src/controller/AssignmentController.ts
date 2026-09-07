import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Assignment } from "../entity/Assignment";
import { AssignmentSubmission } from "../entity/AssignmentSubmission";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { Enrollment } from "../entity/Enrollment";
import { User } from "../entity/User";
import { NotificationController } from "./NotificationController";

export class AssignmentController {
    static getAssignments = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const userId = user.id || user.userId;
            const assignmentRepo = AppDataSource.getRepository(Assignment);

            if (user.role === 'student') {
                const enrollmentRepo = AppDataSource.getRepository(Enrollment);
                const enrollments = await enrollmentRepo.find({ where: { student: { id: userId } }, relations: ["course"] });
                const courseIds = enrollments.map(e => e.course?.id).filter(Boolean);
                
                if (courseIds.length === 0) return res.json([]);

                // Fetch assignments for enrolled courses with student's submissions
                const assignments = await assignmentRepo.createQueryBuilder("assignment")
                    .leftJoinAndSelect("assignment.course", "course")
                    .leftJoinAndSelect("assignment.lesson", "lesson")
                    .leftJoinAndSelect(AssignmentSubmission, "sub", "sub.assignmentId = assignment.id AND sub.studentId = :studentId", { studentId: userId })
                    .where("assignment.courseId IN (:...courseIds)", { courseIds })
                    .select([
                        "assignment.id AS id",
                        "assignment.title AS title",
                        "assignment.description AS description",
                        "assignment.questions AS questions",
                        "assignment.dueDate AS dueDate",
                        "course.title AS courseTitle",
                        "lesson.id AS lessonId",
                        "lesson.title AS lessonTitle",
                        "sub.id AS submissionId",
                        "sub.content AS submissionContent",
                        "sub.answers AS submissionAnswers",
                        "sub.grade AS grade",
                        "sub.submittedAt AS submittedAt"
                    ])
                    .getRawMany();

                return res.json(assignments.map(row => {
                    let parsedQuestions = [];
                    try {
                        if (row.questions) {
                            parsedQuestions = typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions;
                        }
                    } catch (e) { parsedQuestions = []; }

                    let parsedAnswers = [];
                    try {
                        if (row.submissionAnswers) {
                            parsedAnswers = typeof row.submissionAnswers === 'string' ? JSON.parse(row.submissionAnswers) : row.submissionAnswers;
                        }
                    } catch (e) { parsedAnswers = []; }

                    return {
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        questions: parsedQuestions,
                        dueDate: row.dueDate,
                        course: { title: row.courseTitle },
                        lesson: row.lessonTitle ? { id: row.lessonId, title: row.lessonTitle } : null,
                        submission: row.submissionId ? {
                            id: row.submissionId,
                            content: row.submissionContent,
                            answers: parsedAnswers,
                            grade: row.grade,
                            submittedAt: row.submittedAt
                        } : null
                    };
                }));
            } else {
                // Teacher / Admin
                let query = assignmentRepo.createQueryBuilder("assignment")
                    .leftJoinAndSelect("assignment.course", "course")
                    .leftJoinAndSelect("assignment.lesson", "lesson");
                
                if (user.role === 'teacher') {
                    query = query.leftJoin("course.teacher", "teacher").where("teacher.id = :teacherId", { teacherId: userId });
                }

                const assignments = await query.getMany();
                return res.json(assignments);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch assignments" });
        }
    };

    static createAssignment = async (req: Request, res: Response) => {
        try {
            const { title, description, questions, dueDate, courseId, lessonId } = req.body;
            const courseRepo = AppDataSource.getRepository(Course);
            const course = await courseRepo.findOne({ where: { id: courseId } });
            
            if (!course) return res.status(404).json({ error: "Course not found" });

            const assignment = new Assignment();
            assignment.title = title;
            assignment.description = description || "";
            if (questions && Array.isArray(questions)) {
                assignment.questions = questions
                    .filter((q: any) => q && q.text && q.text.trim().length > 0)
                    .map((q: any, i: number) => ({
                        id: q.id || `q_${i + 1}`,
                        text: q.text.trim(),
                        points: q.points ? Number(q.points) : undefined,
                        imageUrl: q.imageUrl ? String(q.imageUrl).trim() : undefined
                    }));

                if (!assignment.description && assignment.questions.length > 0) {
                    assignment.description = assignment.questions.map((q: any, i: number) => `س${i + 1}: ${q.text}${q.points ? ` (${q.points} درجة)` : ''}`).join('\n');
                }
            }
            assignment.dueDate = new Date(dueDate);
            assignment.course = course;

            if (lessonId) {
                const lessonRepo = AppDataSource.getRepository(Lesson);
                const lesson = await lessonRepo.findOne({ where: { id: lessonId } });
                if (lesson) {
                    assignment.lesson = lesson;
                }
            }

            await AppDataSource.getRepository(Assignment).save(assignment);

            // Notify all actively enrolled students about the new assignment
            try {
              const enrollments = await AppDataSource.getRepository(Enrollment).find({
                where: { course: { id: courseId }, status: "active" },
                relations: ["student"]
              });
              const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("ar") : null;
              for (const enr of enrollments) {
                if (enr.student) {
                  await NotificationController.createNotification(
                    enr.student.id,
                    `واجب دراسي جديد 📝`,
                    `تم إضافة واجب جديد بعنوان "${title}" في دورة "${course.title}". ${dueDateStr ? 'موعد التسليم: ' + dueDateStr : ''}`,
                    "info",
                    "#assignments"
                  );
                }
              }
            } catch (notifErr) {
              console.error("فشل إشعار الطلاب بواجب جديد:", notifErr);
            }

            res.status(201).json(assignment);
        } catch (error) {
            res.status(500).json({ error: "Failed to create assignment" });
        }
    };

    static submitAssignment = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const userId = user.id || user.userId;
            const assignmentId = parseInt(req.params.id);
            const { content, answers } = req.body;

            const assignmentRepo = AppDataSource.getRepository(Assignment);
            const assignment = await assignmentRepo.findOne({ where: { id: assignmentId } });
            if (!assignment) return res.status(404).json({ error: "Assignment not found" });

            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            let submission = await subRepo.findOne({ where: { assignment: { id: assignmentId }, student: { id: userId } } });

            if (!submission) {
                submission = new AssignmentSubmission();
                submission.assignment = assignment;
                submission.student = { id: userId } as User;
            }

            if (answers && Array.isArray(answers) && answers.length > 0) {
                submission.answers = answers;
                if (!content || !content.trim()) {
                    submission.content = answers.map((a: any, i: number) => {
                        const qLabel = a.questionText ? `س${i + 1} (${a.questionText})` : `س${i + 1}`;
                        return `${qLabel}:\n${a.answerText || 'لم تتم الإجابة'}`;
                    }).join('\n\n');
                } else {
                    submission.content = content;
                }
            } else {
                submission.content = content || "";
            }

            submission.submittedAt = new Date();
            await subRepo.save(submission);

            // Notify teacher that a student submitted an assignment
            try {
              const fullAssignment = await AppDataSource.getRepository(Assignment).findOne({
                where: { id: assignmentId },
                relations: ["course", "course.teacher"]
              });
              if (fullAssignment?.course?.teacher) {
                const student = await AppDataSource.getRepository(User).findOneBy({ id: userId });
                await NotificationController.createNotification(
                  fullAssignment.course.teacher.id,
                  `تسليم واجب جديد 📬`,
                  `سلّم الطالب "${student?.name || 'طالب'}" واجب "${fullAssignment.title}" في دورة "${fullAssignment.course.title}".`,
                  "info",
                  "#assignments"
                );
              }
            } catch (notifErr) {
              console.error("فشل إشعار المعلم بتسليم الواجب:", notifErr);
            }

            res.status(201).json(submission);
        } catch (error) {
            res.status(500).json({ error: "Failed to submit assignment" });
        }
    };

    static getSubmissions = async (req: Request, res: Response) => {
        try {
            const assignmentId = parseInt(req.params.id);
            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            const submissions = await subRepo.find({
                where: { assignment: { id: assignmentId } },
                relations: ["student"]
            });
            res.json(submissions);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch submissions" });
        }
    };

    static gradeSubmission = async (req: Request, res: Response) => {
        try {
            const submissionId = parseInt(req.params.id);
            const { grade } = req.body;
            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            
            const submission = await subRepo.findOne({ where: { id: submissionId } });
            if (!submission) return res.status(404).json({ error: "Submission not found" });

            submission.grade = grade;
            await subRepo.save(submission);

            // Notify student that their submission was graded
            try {
              const gradedSubmission = await subRepo.findOne({
                where: { id: submissionId },
                relations: ["student", "assignment"]
              });
              if (gradedSubmission?.student) {
                await NotificationController.createNotification(
                  gradedSubmission.student.id,
                  `تم تقييم واجبك! 🏆`,
                  `تم تصحيح واجبك "${gradedSubmission.assignment?.title || 'الواجب'}" وتقييمه بدرجة ${grade}.`,
                  "success",
                  "#assignments"
                );
              }
            } catch (notifErr) {
              console.error("فشل إشعار الطالب بتصحيح الواجب:", notifErr);
            }

            res.json(submission);
        } catch (error) {
            res.status(500).json({ error: "Failed to grade submission" });
        }
    };
}
