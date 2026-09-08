import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Assignment } from "../entity/Assignment";
import { AssignmentSubmission } from "../entity/AssignmentSubmission";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { Enrollment } from "../entity/Enrollment";
import { User } from "../entity/User";
import { CourseGroup } from "../entity/CourseGroup";
import { NotificationController } from "./NotificationController";

export class AssignmentController {
    static getAssignments = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const userId = user.id || user.userId;
            const assignmentRepo = AppDataSource.getRepository(Assignment);

            if (user.role === 'student') {
                const enrollmentRepo = AppDataSource.getRepository(Enrollment);
                const enrollments = await enrollmentRepo.find({ where: { student: { id: userId } }, relations: ["course", "group"] });
                const courseIds = enrollments.map(e => e.course?.id).filter(Boolean);
                const groupIds = enrollments.map(e => e.group?.id).filter(Boolean);
                
                if (courseIds.length === 0) return res.json([]);

                // Fetch assignments for enrolled courses with student's submissions
                const qb = assignmentRepo.createQueryBuilder("assignment")
                    .leftJoinAndSelect("assignment.course", "course")
                    .leftJoinAndSelect("assignment.lesson", "lesson")
                    .leftJoinAndSelect(AssignmentSubmission, "sub", "sub.assignmentId = assignment.id AND sub.studentId = :studentId", { studentId: userId });

                if (groupIds.length > 0) {
                    qb.where("assignment.courseId IN (:...courseIds) AND (assignment.groupId IS NULL OR assignment.groupId IN (:...groupIds))", { courseIds, groupIds });
                } else {
                    qb.where("assignment.courseId IN (:...courseIds) AND assignment.groupId IS NULL", { courseIds });
                }

                const assignments = await qb
                    .select([
                        "assignment.id AS id",
                        "assignment.title AS title",
                        "assignment.description AS description",
                        "assignment.type AS type",
                        "assignment.questions AS questions",
                        "assignment.totalPoints AS totalPoints",
                        "assignment.dueDate AS dueDate",
                        "course.title AS courseTitle",
                        "lesson.id AS lessonId",
                        "lesson.title AS lessonTitle",
                        "sub.id AS submissionId",
                        "sub.status AS status",
                        "sub.content AS submissionContent",
                        "sub.answers AS submissionAnswers",
                        "sub.grade AS grade",
                        "sub.percentage AS percentage",
                        "sub.overallFeedback AS overallFeedback",
                        "sub.feedbackFileUrl AS feedbackFileUrl",
                        "sub.feedbackFileName AS feedbackFileName",
                        "sub.isLate AS isLate",
                        "sub.submittedAt AS submittedAt",
                        "sub.gradedAt AS gradedAt"
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

                    // If student and status is draft_graded, hide private drafts
                    const isDraft = row.status === 'draft_graded';

                    return {
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        type: row.type,
                        questions: parsedQuestions,
                        totalPoints: row.totalPoints,
                        dueDate: row.dueDate,
                        course: { title: row.courseTitle },
                        lesson: row.lessonTitle ? { id: row.lessonId, title: row.lessonTitle } : null,
                        submission: row.submissionId ? {
                            id: row.submissionId,
                            status: isDraft ? 'submitted' : (row.status || 'submitted'),
                            content: row.submissionContent,
                            answers: isDraft ? parsedAnswers.map((a: any) => ({ ...a, pointsAwarded: undefined, feedback: undefined })) : parsedAnswers,
                            grade: isDraft ? null : row.grade,
                            percentage: isDraft ? null : row.percentage,
                            overallFeedback: isDraft ? null : row.overallFeedback,
                            feedbackFileUrl: isDraft ? null : row.feedbackFileUrl,
                            feedbackFileName: isDraft ? null : row.feedbackFileName,
                            isLate: row.isLate,
                            submittedAt: row.submittedAt,
                            gradedAt: isDraft ? null : row.gradedAt
                        } : null
                    };
                }));
            } else {
                // Teacher / Admin
                let query = assignmentRepo.createQueryBuilder("assignment")
                    .leftJoinAndSelect("assignment.course", "course")
                    .leftJoinAndSelect("assignment.lesson", "lesson")
                    .leftJoinAndSelect("assignment.group", "group");
                
                if (user.role === 'teacher') {
                    query = query
                        .leftJoin("course.teacher", "courseTeacher")
                        .leftJoin("group.teacher", "groupTeacher")
                        .where("courseTeacher.id = :teacherId OR groupTeacher.id = :teacherId", { teacherId: userId });
                }

                query = query.orderBy("assignment.createdAt", "DESC");

                const assignments = await query.getMany();
                const subRepo = AppDataSource.getRepository(AssignmentSubmission);
                const enriched = await Promise.all(assignments.map(async (asgn) => {
                    const submissionsCount = await subRepo.count({ where: { assignment: { id: asgn.id } } });
                    const gradedCount = await subRepo.count({ where: { assignment: { id: asgn.id }, status: 'graded' } });
                    return {
                        ...asgn,
                        submissionsCount,
                        gradedCount
                    };
                }));
                return res.json(enriched);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch assignments" });
        }
    };

    static createAssignment = async (req: Request, res: Response) => {
        try {
            const { title, description, type, questions, dueDate, courseId, lessonId, groupId } = req.body;
            const courseRepo = AppDataSource.getRepository(Course);
            const course = await courseRepo.findOne({ where: { id: courseId } });
            
            if (!course) return res.status(404).json({ error: "Course not found" });

            const assignment = new Assignment();
            assignment.title = title;
            assignment.description = description || "";
            assignment.type = type || 'hybrid';

            let calculatedTotalPoints = 0;
            if (questions && Array.isArray(questions)) {
                assignment.questions = questions
                    .filter((q: any) => q && q.text && q.text.trim().length > 0)
                    .map((q: any, i: number) => {
                        const pts = Number(q.points) > 0 ? Number(q.points) : 10;
                        calculatedTotalPoints += pts;
                        return {
                            id: q.id || `q_${i + 1}`,
                            type: (q.type === 'mcq' || q.type === 'essay' || q.type === 'file') ? q.type : 'essay',
                            text: q.text.trim(),
                            points: pts,
                            imageUrl: q.imageUrl ? String(q.imageUrl).trim() : undefined,
                            options: Array.isArray(q.options) ? q.options.map((opt: any, optIdx: number) => ({
                                id: opt.id || `opt_${optIdx + 1}`,
                                text: String(opt.text || "").trim(),
                                isCorrect: Boolean(opt.isCorrect)
                            })) : undefined,
                            explanation: q.explanation ? String(q.explanation).trim() : undefined,
                            allowedFileTypes: Array.isArray(q.allowedFileTypes) ? q.allowedFileTypes : undefined,
                            maxFileSizeMb: q.maxFileSizeMb ? Number(q.maxFileSizeMb) : 25,
                            rubric: q.rubric ? String(q.rubric).trim() : undefined
                        };
                    });

                if (!assignment.description && assignment.questions.length > 0) {
                    assignment.description = assignment.questions.map((q: any, i: number) => `س${i + 1} (${q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'file' ? 'رفع ملف' : 'سؤال مقالي'}): ${q.text} [${q.points} درجات]`).join('\n');
                }
            } else {
                assignment.questions = [];
            }
            assignment.totalPoints = calculatedTotalPoints || 100;
            assignment.dueDate = new Date(dueDate);
            assignment.course = course;

            if (groupId) {
                const groupRepo = AppDataSource.getRepository(CourseGroup);
                const group = await groupRepo.findOne({ where: { id: groupId } });
                if (group) assignment.group = group;
            }

            if (lessonId) {
                const lessonRepo = AppDataSource.getRepository(Lesson);
                const lesson = await lessonRepo.findOne({ where: { id: lessonId } });
                if (lesson) {
                    assignment.lesson = lesson;
                }
            }

            await AppDataSource.getRepository(Assignment).save(assignment);

            // Notify enrolled students
            try {
              const enrollments = await AppDataSource.getRepository(Enrollment).find({
                where: { course: { id: courseId }, status: "active" },
                relations: ["student"]
              });
              const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("ar-EG") : null;
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
            console.error(error);
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
            const assignment = await assignmentRepo.findOne({
                where: { id: assignmentId },
                relations: ["course", "course.teacher", "group"]
            });
            if (!assignment) return res.status(404).json({ error: "Assignment not found" });

            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            let submission = await subRepo.findOne({
                where: { assignment: { id: assignmentId }, student: { id: userId } }
            });

            if (!submission) {
                submission = new AssignmentSubmission();
                submission.assignment = assignment;
                submission.student = { id: userId } as User;
            }

            const now = new Date();
            const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
            const isLate = Boolean(dueDate && now.getTime() > dueDate.getTime());
            submission.isLate = isLate;

            // Process per-question answers and perform instant automated grading for MCQs
            let autoPointsSum = 0;
            let totalMaxPoints = assignment.totalPoints || 0;
            let hasManualQuestions = false;

            const questionsMap = new Map<string, any>();
            if (Array.isArray(assignment.questions)) {
                assignment.questions.forEach((q: any) => {
                    questionsMap.set(q.id, q);
                });
            }

            const processedAnswers: any[] = [];
            if (Array.isArray(answers) && answers.length > 0) {
                for (let i = 0; i < answers.length; i++) {
                    const ans = answers[i];
                    const qDef = questionsMap.get(ans.questionId);
                    const qType = ans.type || qDef?.type || 'essay';
                    const maxPts = ans.maxPoints || qDef?.points || 10;

                    let isCorrect: boolean | undefined = undefined;
                    let pointsAwarded: number | undefined = undefined;

                    if (qType === 'mcq') {
                        // Automated grading
                        const correctOptions = qDef?.options?.filter((o: any) => o.isCorrect) || [];
                        const correctIds = correctOptions.map((o: any) => String(o.id));
                        
                        // Check if single or multiple selected
                        const selectedIds = ans.selectedOptionIds && Array.isArray(ans.selectedOptionIds) 
                            ? ans.selectedOptionIds.map(String)
                            : ans.selectedOptionId ? [String(ans.selectedOptionId)] : [];

                        if (correctIds.length > 0) {
                            const isExactMatch = correctIds.length === selectedIds.length &&
                                correctIds.every((id: string) => selectedIds.includes(id));
                            isCorrect = isExactMatch;
                            pointsAwarded = isExactMatch ? maxPts : 0;
                            autoPointsSum += pointsAwarded || 0;
                        }
                    } else {
                        hasManualQuestions = true;
                    }

                    processedAnswers.push({
                        questionId: ans.questionId || `q_${i + 1}`,
                        questionIndex: i + 1,
                        questionText: ans.questionText || qDef?.text || `سؤال ${i + 1}`,
                        type: qType,
                        selectedOptionId: ans.selectedOptionId,
                        selectedOptionIds: ans.selectedOptionIds,
                        answerText: ans.answerText || "",
                        fileUrl: ans.fileUrl || "",
                        fileName: ans.fileName || "",
                        pointsAwarded,
                        maxPoints: maxPts,
                        isCorrect,
                        feedback: ans.feedback || ""
                    });
                }
            }

            submission.answers = processedAnswers;

            // Generate structured content summary if not provided
            if (!content || !content.trim()) {
                submission.content = processedAnswers.map((a: any, i: number) => {
                    const label = `س${i + 1}: ${a.questionText || ''}`;
                    if (a.type === 'mcq') {
                        return `${label}\nإجابة الطالب: الخيار المختار [${a.selectedOptionId || a.selectedOptionIds?.join(', ') || 'لا يوجد'}]`;
                    } else if (a.type === 'file') {
                        return `${label}\nالملف المرفوع: ${a.fileName || a.fileUrl || 'لا يوجد'}`;
                    } else {
                        return `${label}\n${a.answerText || 'لا يوجد نص'}`;
                    }
                }).join('\n\n');
            } else {
                submission.content = content;
            }

            submission.submittedAt = now;

            // If ALL questions were MCQs and graded automatically, mark as graded!
            if (!hasManualQuestions && processedAnswers.length > 0) {
                submission.status = "graded";
                submission.grade = autoPointsSum;
                submission.percentage = totalMaxPoints > 0 ? Math.round((autoPointsSum / totalMaxPoints) * 100) : 100;
                submission.gradedAt = now;
                submission.overallFeedback = "تم التصحيح الآلي الفوري لاختبار الاختيار من متعدد بنجاح.";
            } else {
                submission.status = "submitted";
            }

            await subRepo.save(submission);

            // Notify teacher about new submission
            try {
              const teacherId = assignment.group?.teacher?.id || assignment.course?.teacher?.id;
              if (teacherId) {
                const student = await AppDataSource.getRepository(User).findOneBy({ id: userId });
                await NotificationController.createNotification(
                  teacherId,
                  `تسليم واجب جديد 📬`,
                  `سلّم الطالب "${student?.name || 'طالب'}" واجب "${assignment.title}" ${isLate ? '(تسليم متأخر)' : ''}.`,
                  "info",
                  assignment.group ? `#group/${assignment.group.id}` : "#assignments"
                );
              }
            } catch (notifErr) {
              console.error("فشل إشعار المعلم بتسليم الواجب:", notifErr);
            }

            res.status(201).json(submission);
        } catch (error) {
            console.error("Error submitting assignment:", error);
            res.status(500).json({ error: "Failed to submit assignment" });
        }
    };

    static getSubmissions = async (req: Request, res: Response) => {
        try {
            const assignmentId = parseInt(req.params.id);
            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            const submissions = await subRepo.find({
                where: { assignment: { id: assignmentId } },
                relations: ["student", "assignment"]
            });
            res.json(submissions);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch submissions" });
        }
    };

    static getTeacherAssignmentsReview = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const userId = user.id || user.userId;
            const assignmentRepo = AppDataSource.getRepository(Assignment);
            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            const enrollmentRepo = AppDataSource.getRepository(Enrollment);

            let query = assignmentRepo.createQueryBuilder("assignment")
                .leftJoinAndSelect("assignment.course", "course")
                .leftJoinAndSelect("assignment.lesson", "lesson")
                .leftJoinAndSelect("assignment.group", "group");

            if (user.role === 'teacher') {
                query = query
                    .leftJoin("course.teacher", "courseTeacher")
                    .leftJoin("group.teacher", "groupTeacher")
                    .where("courseTeacher.id = :teacherId OR groupTeacher.id = :teacherId", { teacherId: userId });
            }

            query = query.orderBy("assignment.createdAt", "DESC");
            const assignments = await query.getMany();

            let totalSubmissions = 0;
            let totalGraded = 0;
            let totalPendingGrading = 0;
            let totalNotDelivered = 0;

            const enriched = await Promise.all(assignments.map(async (asgn) => {
                let enrollments: Enrollment[] = [];
                if (asgn.group?.id) {
                    enrollments = await enrollmentRepo.find({
                        where: { group: { id: asgn.group.id }, status: "active" },
                        relations: ["student"]
                    });
                } else if (asgn.course?.id) {
                    enrollments = await enrollmentRepo.find({
                        where: { course: { id: asgn.course.id }, status: "active" },
                        relations: ["student"]
                    });
                }

                const submissions = await subRepo.find({
                    where: { assignment: { id: asgn.id } },
                    relations: ["student"],
                    order: { submittedAt: "DESC" }
                });

                const submittedStudentIds = new Set(submissions.map(s => s.student?.id).filter(Boolean));
                
                const delivered = submissions.map(s => ({
                    id: s.id,
                    status: s.status,
                    grade: s.grade,
                    percentage: s.percentage,
                    submittedAt: s.submittedAt,
                    student: {
                        id: s.student?.id,
                        name: s.student?.name || "طالب",
                        avatar: s.student?.avatar,
                        email: s.student?.email,
                        phone: s.student?.phone
                    }
                }));

                const notDelivered = enrollments
                    .filter(e => e.student && !submittedStudentIds.has(e.student.id))
                    .map(e => ({
                        id: e.student.id,
                        name: e.student.name || "طالب",
                        avatar: e.student.avatar,
                        email: e.student.email,
                        phone: e.student.phone
                    }));

                const submissionsCount = submissions.length;
                const gradedCount = submissions.filter(s => s.status === 'graded').length;
                const pendingGradingCount = Math.max(0, submissionsCount - gradedCount);
                const notDeliveredCount = notDelivered.length;
                const totalStudentsCount = enrollments.length;

                totalSubmissions += submissionsCount;
                totalGraded += gradedCount;
                totalPendingGrading += pendingGradingCount;
                totalNotDelivered += notDeliveredCount;

                return {
                    ...asgn,
                    totalStudentsCount,
                    submissionsCount,
                    gradedCount,
                    pendingGradingCount,
                    notDeliveredCount,
                    delivered,
                    notDelivered
                };
            }));

            res.json({
                stats: {
                    totalAssignments: assignments.length,
                    totalSubmissions,
                    totalGraded,
                    totalPendingGrading,
                    totalNotDelivered
                },
                assignments: enriched
            });
        } catch (error) {
            console.error("Failed to fetch teacher assignments review:", error);
            res.status(500).json({ error: "Failed to fetch assignments review data" });
        }
    };

    static getSubmissionDetails = async (req: Request, res: Response) => {
        try {
            const submissionId = parseInt(req.params.id);
            const user = (req as any).user;
            const currentUserId = user.id || user.userId;
            const userRole = user.role;

            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            const submission = await subRepo.findOne({
                where: { id: submissionId },
                relations: ["student", "assignment", "assignment.course", "assignment.course.teacher", "assignment.group"]
            });

            if (!submission) return res.status(404).json({ error: "التسليم غير موجود" });

            // Authorization: Student can only view their own submission if graded/submitted; Teachers/Admins can view any
            const isOwner = submission.student?.id === currentUserId;
            const isTeacher = submission.assignment?.course?.teacher?.id === currentUserId ||
                submission.assignment?.group?.teacher?.id === currentUserId;
            const isAdmin = userRole === 'admin';

            if (!isOwner && !isTeacher && !isAdmin) {
                return res.status(403).json({ error: "غير مصرح لك بالاطلاع على هذا التسليم." });
            }

            // If student and status is 'draft_graded', do not expose private draft grading yet
            if (isOwner && !isTeacher && !isAdmin && submission.status === 'draft_graded') {
                const sanitizedSubmission = {
                    ...submission,
                    grade: null,
                    percentage: null,
                    overallFeedback: null,
                    feedbackFileUrl: null,
                    answers: submission.answers?.map((a: any) => ({
                        ...a,
                        pointsAwarded: undefined,
                        feedback: undefined
                    }))
                };
                return res.json(sanitizedSubmission);
            }

            return res.json(submission);
        } catch (error) {
            console.error("Error fetching submission details:", error);
            res.status(500).json({ error: "Failed to get submission details" });
        }
    };

    static gradeSubmission = async (req: Request, res: Response) => {
        try {
            const submissionId = parseInt(req.params.id);
            const {
                grade,
                percentage,
                overallFeedback,
                feedbackFileUrl,
                feedbackFileName,
                answers,
                status // 'draft_graded' | 'graded' (published)
            } = req.body;

            const subRepo = AppDataSource.getRepository(AssignmentSubmission);
            const submission = await subRepo.findOne({
                where: { id: submissionId },
                relations: ["student", "assignment", "assignment.course"]
            });

            if (!submission) return res.status(404).json({ error: "Submission not found" });

            const targetStatus = status === "draft_graded" ? "draft_graded" : "graded";
            submission.status = targetStatus;

            if (answers && Array.isArray(answers)) {
                submission.answers = answers;
            }

            if (grade !== undefined && grade !== null) {
                submission.grade = Number(grade);
            }

            if (percentage !== undefined && percentage !== null) {
                submission.percentage = Number(percentage);
            } else if (submission.assignment?.totalPoints && submission.assignment.totalPoints > 0 && submission.grade !== null) {
                submission.percentage = Math.round((submission.grade / submission.assignment.totalPoints) * 100);
            }

            if (overallFeedback !== undefined) {
                submission.overallFeedback = overallFeedback;
            }

            if (feedbackFileUrl !== undefined) {
                submission.feedbackFileUrl = feedbackFileUrl;
            }

            if (feedbackFileName !== undefined) {
                submission.feedbackFileName = feedbackFileName;
            }

            const now = new Date();
            submission.gradedAt = now;

            await subRepo.save(submission);

            // If publishing (status === 'graded'), notify student immediately!
            if (targetStatus === "graded" && submission.student) {
                try {
                    const gradeStr = submission.grade !== null && submission.grade !== undefined 
                        ? `${submission.grade}${submission.assignment?.totalPoints ? ` من ${submission.assignment.totalPoints}` : ''}`
                        : '';
                    const percentStr = submission.percentage !== null && submission.percentage !== undefined
                        ? ` (${submission.percentage}%)`
                        : '';
                    
                    await NotificationController.createNotification(
                        submission.student.id,
                        `تم تقييم ونشر نتيجة واجبك! 🏆`,
                        `تم تصحيح واجب "${submission.assignment?.title || 'الواجب'}" بدرجة ${gradeStr}${percentStr}. اضغط لمراجعة نموذج الإجابة والملاحظات.`,
                        "success",
                        `#assignments`
                    );
                } catch (notifErr) {
                    console.error("فشل إرسال إشعار تصحيح الواجب للطالب:", notifErr);
                }
            }

            res.json({
                message: targetStatus === "graded" ? "تم نشر النتيجة للطالب بنجاح!" : "تم حفظ مسودة التصحيح بنجاح.",
                submission
            });
        } catch (error) {
            console.error("Error grading submission:", error);
            res.status(500).json({ error: "Failed to grade submission" });
        }
    };

    static getAssignmentById = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const assignmentRepo = AppDataSource.getRepository(Assignment);
            const assignment = await assignmentRepo.findOne({
                where: { id },
                relations: ["course", "course.teacher", "lesson", "group", "group.teacher"]
            });
            if (!assignment) return res.status(404).json({ error: "الواجب غير موجود." });
            res.json(assignment);
        } catch (error) {
            console.error("Error fetching assignment:", error);
            res.status(500).json({ error: "Failed to fetch assignment" });
        }
    };

    static updateAssignment = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const user = (req as any).user;
            const currentUserId = user?.id || user?.userId;
            const userRole = user?.role;

            const assignmentRepo = AppDataSource.getRepository(Assignment);
            const assignment = await assignmentRepo.findOne({
                where: { id },
                relations: ["course", "course.teacher", "group", "group.teacher"]
            });

            if (!assignment) return res.status(404).json({ error: "الواجب غير موجود." });

            const isTeacher = assignment.course?.teacher?.id === currentUserId ||
                assignment.group?.teacher?.id === currentUserId;
            const isAdmin = userRole === 'admin';

            if (!isTeacher && !isAdmin) {
                return res.status(403).json({ error: "غير مصرح لك بتعديل هذا الواجب." });
            }

            const { title, description, questions, dueDate, type } = req.body;

            if (title) assignment.title = title.trim();
            if (description !== undefined) assignment.description = description;
            if (dueDate) assignment.dueDate = new Date(dueDate);
            if (type) assignment.type = type;

            if (questions && Array.isArray(questions)) {
                let calculatedTotalPoints = 0;
                assignment.questions = questions
                    .filter((q: any) => q && q.text && q.text.trim().length > 0)
                    .map((q: any, i: number) => {
                        const pts = Number(q.points) > 0 ? Number(q.points) : 10;
                        calculatedTotalPoints += pts;
                        return {
                            id: q.id || `q_${i + 1}`,
                            type: (q.type === 'mcq' || q.type === 'essay' || q.type === 'file') ? q.type : 'essay',
                            text: q.text.trim(),
                            points: pts,
                            imageUrl: q.imageUrl ? String(q.imageUrl).trim() : undefined,
                            options: Array.isArray(q.options) ? q.options.map((opt: any, optIdx: number) => ({
                                id: opt.id || `opt_${optIdx + 1}`,
                                text: String(opt.text || "").trim(),
                                isCorrect: Boolean(opt.isCorrect)
                            })) : undefined,
                            explanation: q.explanation ? String(q.explanation).trim() : undefined,
                            allowedFileTypes: Array.isArray(q.allowedFileTypes) ? q.allowedFileTypes : undefined,
                            maxFileSizeMb: q.maxFileSizeMb ? Number(q.maxFileSizeMb) : 25,
                            rubric: q.rubric ? String(q.rubric).trim() : undefined
                        };
                    });
                assignment.totalPoints = calculatedTotalPoints || 100;
            }

            const saved = await assignmentRepo.save(assignment);
            res.json({ message: "تم تحديث بيانات الواجب بنجاح!", assignment: saved });
        } catch (error) {
            console.error("Error updating assignment:", error);
            res.status(500).json({ error: "Failed to update assignment" });
        }
    };

    static deleteAssignment = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const user = (req as any).user;
            const currentUserId = user?.id || user?.userId;
            const userRole = user?.role;

            const assignmentRepo = AppDataSource.getRepository(Assignment);
            const assignment = await assignmentRepo.findOne({
                where: { id },
                relations: ["course", "course.teacher", "group", "group.teacher"]
            });

            if (!assignment) return res.status(404).json({ error: "الواجب غير موجود." });

            const isTeacher = assignment.course?.teacher?.id === currentUserId ||
                assignment.group?.teacher?.id === currentUserId;
            const isAdmin = userRole === 'admin';

            if (!isTeacher && !isAdmin) {
                return res.status(403).json({ error: "غير مصرح لك بحذف هذا الواجب." });
            }

            // Delete associated submissions first to ensure consistency
            await AppDataSource.getRepository(AssignmentSubmission).delete({ assignment: { id } });
            await assignmentRepo.remove(assignment);
            res.json({ message: "تم حذف الواجب بنجاح." });
        } catch (error) {
            console.error("Error deleting assignment:", error);
            res.status(500).json({ error: "Failed to delete assignment" });
        }
    };
}
