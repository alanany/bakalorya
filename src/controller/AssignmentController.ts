import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Assignment } from "../entity/Assignment";
import { AssignmentSubmission } from "../entity/AssignmentSubmission";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { Enrollment } from "../entity/Enrollment";
import { User } from "../entity/User";

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
                        "assignment.dueDate AS dueDate",
                        "course.title AS courseTitle",
                        "lesson.id AS lessonId",
                        "lesson.title AS lessonTitle",
                        "sub.id AS submissionId",
                        "sub.content AS submissionContent",
                        "sub.grade AS grade",
                        "sub.submittedAt AS submittedAt"
                    ])
                    .getRawMany();

                return res.json(assignments.map(row => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    dueDate: row.dueDate,
                    course: { title: row.courseTitle },
                    lesson: row.lessonTitle ? { id: row.lessonId, title: row.lessonTitle } : null,
                    submission: row.submissionId ? {
                        id: row.submissionId,
                        content: row.submissionContent,
                        grade: row.grade,
                        submittedAt: row.submittedAt
                    } : null
                })));
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
            const { title, description, dueDate, courseId, lessonId } = req.body;
            const courseRepo = AppDataSource.getRepository(Course);
            const course = await courseRepo.findOne({ where: { id: courseId } });
            
            if (!course) return res.status(404).json({ error: "Course not found" });

            const assignment = new Assignment();
            assignment.title = title;
            assignment.description = description;
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
            const { content } = req.body;

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

            submission.content = content;
            submission.submittedAt = new Date();
            await subRepo.save(submission);

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
            res.json(submission);
        } catch (error) {
            res.status(500).json({ error: "Failed to grade submission" });
        }
    };
}
