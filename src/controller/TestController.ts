import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Test } from "../entity/Test";
import { TestQuestion } from "../entity/TestQuestion";
import { TestAttempt } from "../entity/TestAttempt";
import { Course } from "../entity/Course";
import { Enrollment } from "../entity/Enrollment";
import { User } from "../entity/User";

export class TestController {
    static getTests = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const testRepo = AppDataSource.getRepository(Test);

            if (user.role === 'student') {
                const enrollments = await AppDataSource.getRepository(Enrollment).find({
                    where: { student: { id: user.userId } },
                    relations: ["course"]
                });
                const courseIds = enrollments.map(e => e.course.id);
                if (courseIds.length === 0) return res.json([]);

                const tests = await testRepo.createQueryBuilder("test")
                    .leftJoinAndSelect("test.course", "course")
                    .leftJoinAndSelect("test.questions", "questions")
                    .leftJoinAndSelect(TestAttempt, "attempt", "attempt.testId = test.id AND attempt.studentId = :studentId", { studentId: user.userId })
                    .where("test.courseId IN (:...courseIds)", { courseIds })
                    .select([
                        "test.id AS id",
                        "test.title AS title",
                        "course.title AS courseTitle",
                        "attempt.id AS attemptId",
                        "attempt.score AS score",
                        "attempt.completedAt AS completedAt"
                    ])
                    .getRawMany();

                return res.json(tests.map(row => ({
                    id: row.id,
                    title: row.title,
                    course: { title: row.courseTitle },
                    attempt: row.attemptId ? {
                        id: row.attemptId,
                        score: row.score,
                        completedAt: row.completedAt
                    } : null
                })));
            } else {
                let query = testRepo.createQueryBuilder("test")
                    .leftJoinAndSelect("test.course", "course")
                    .leftJoinAndSelect("test.questions", "questions");
                
                if (user.role === 'teacher') {
                    query = query.where("course.teacherId = :teacherId", { teacherId: user.userId });
                }
                const tests = await query.getMany();
                return res.json(tests);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch tests" });
        }
    };

    static getTestQuestions = async (req: Request, res: Response) => {
        try {
            const testId = parseInt(req.params.id);
            const user = (req as any).user;
            
            // Check if student already attempted
            if (user.role === 'student') {
                const attempt = await AppDataSource.getRepository(TestAttempt).findOne({
                    where: { test: { id: testId }, student: { id: user.userId } }
                });
                if (attempt) {
                    return res.status(403).json({ error: "Already attempted this test" });
                }
            }

            const questions = await AppDataSource.getRepository(TestQuestion).find({
                where: { test: { id: testId } }
            });

            if (user.role === 'student') {
                // Remove correctAnswer from response for students
                return res.json(questions.map(q => ({
                    id: q.id,
                    questionText: q.questionText,
                    options: q.options
                })));
            }

            res.json(questions);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch questions" });
        }
    };

    static createTest = async (req: Request, res: Response) => {
        try {
            const { title, courseId, questions } = req.body;
            
            const courseRepo = AppDataSource.getRepository(Course);
            const course = await courseRepo.findOne({ where: { id: courseId } });
            if (!course) return res.status(404).json({ error: "Course not found" });

            // Using transaction to save Test and Questions together
            await AppDataSource.transaction(async transactionalEntityManager => {
                const test = new Test();
                test.title = title;
                test.course = course;
                const savedTest = await transactionalEntityManager.save(test);

                if (questions && questions.length > 0) {
                    const testQuestions = questions.map((q: any) => {
                        const question = new TestQuestion();
                        question.questionText = q.questionText;
                        question.options = q.options;
                        question.correctAnswer = q.correctAnswer;
                        question.test = savedTest;
                        return question;
                    });
                    await transactionalEntityManager.save(testQuestions);
                }
            });

            res.status(201).json({ message: "Test created successfully" });
        } catch (error) {
            res.status(500).json({ error: "Failed to create test" });
        }
    };

    static submitTest = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const testId = parseInt(req.params.id);
            const { answers } = req.body; // { [questionId]: "selectedOption" }

            // Verify no previous attempt
            const attemptRepo = AppDataSource.getRepository(TestAttempt);
            const existingAttempt = await attemptRepo.findOne({
                where: { test: { id: testId }, student: { id: user.userId } }
            });
            if (existingAttempt) return res.status(403).json({ error: "Already attempted" });

            // Get questions to grade
            const questions = await AppDataSource.getRepository(TestQuestion).find({
                where: { test: { id: testId } }
            });

            if (questions.length === 0) return res.status(400).json({ error: "Test has no questions" });

            let correctCount = 0;
            for (const q of questions) {
                if (answers[q.id] === q.correctAnswer) {
                    correctCount++;
                }
            }

            const score = Math.round((correctCount / questions.length) * 100);

            const attempt = new TestAttempt();
            attempt.test = { id: testId } as Test;
            attempt.student = { id: user.userId } as User;
            attempt.score = score;

            await attemptRepo.save(attempt);
            res.status(201).json({ score });
        } catch (error) {
            res.status(500).json({ error: "Failed to submit test" });
        }
    };
}
