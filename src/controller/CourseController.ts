import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Course } from "../entity/Course";
import { Lesson } from "../entity/Lesson";
import { User } from "../entity/User";
import { Enrollment } from "../entity/Enrollment";
import { Payment } from "../entity/Payment";
import { AuthRequest } from "../middleware/auth";
import { NotificationController } from "./NotificationController";
import { createWhatsAppNotificationPayload, buildEnrollmentAcceptedMessage } from "../utils/whatsapp";

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
      course.status = req.user!.role === "admin" ? "PUBLISHED" : "DRAFT";

      await courseRepository.save(course);
      return res.status(201).json(course);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher submits course for Admin review
  static async submitForReview(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const course = await courseRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!course) return res.status(404).json({ error: "الدورة غير موجودة." });

      if (course.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذه الدورة." });
      }

      course.status = "PENDING_REVIEW";
      await courseRepository.save(course);
      return res.status(200).json({ message: "تم إرسال الدورة للمراجعة والاعتماد من قبل الإدارة بنجاح! ⏳", course });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin approves course
  static async approveCourse(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const course = await courseRepository.findOneBy({ id });

      if (!course) return res.status(404).json({ error: "الدورة غير موجودة." });

      course.status = "PUBLISHED";
      course.approvedBy = { id: req.user!.id } as User;
      course.approvedAt = new Date();
      (course as any).rejectionReason = null;

      await courseRepository.save(course);
      return res.status(200).json({ message: "تمت الموافقة على نشر الدورة بنجاح! 🎉", course });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin rejects course
  static async rejectCourse(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const course = await courseRepository.findOneBy({ id });

      if (!course) return res.status(404).json({ error: "الدورة غير موجودة." });

      course.status = "DRAFT";
      course.rejectionReason = rejectionReason || "المحتوى غير مطابق لشروط الأكاديمية.";

      await courseRepository.save(course);
      return res.status(200).json({ message: "تم رفض الاعتماد وتوجيه الدورة للمسودة مع إرسال السبب.", course });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Admin lists pending courses for review
  static async getPendingCourses(req: Request, res: Response) {
    try {
      const courseRepository = AppDataSource.getRepository(Course);
      const courses = await courseRepository.find({
        where: { status: "PENDING_REVIEW" },
        relations: ["teacher", "lessons"],
        order: { createdAt: "DESC" }
      });
      return res.status(200).json(courses);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async addLesson(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const { title, description, videoUrl, duration, chapter, order, photo, notes, resourceUrl, resourceTitle, questions } = req.body;

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
      lesson.description = description || null;
      lesson.videoUrl = videoUrl;
      lesson.duration = duration || "0:00";
      lesson.chapter = chapter || "General";
      lesson.order = typeof order === "number" ? order : 0;
      lesson.photo = photo || null;
      lesson.notes = notes || null;
      lesson.resourceUrl = resourceUrl || null;
      lesson.resourceTitle = resourceTitle || null;
      lesson.questions = Array.isArray(questions) ? questions : [];
      lesson.course = course;

      await lessonRepository.save(lesson);
      return res.status(201).json(lesson);
    } catch (err) {
      console.error("addLesson error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { title, description, category, degree, image, meetingLink } = req.body;

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
      if (description !== undefined) course.description = description;
      if (category !== undefined) course.category = category;
      if (degree !== undefined) course.degree = degree;
      if (image !== undefined) course.image = image;
      if (meetingLink !== undefined) course.meetingLink = meetingLink;

      await courseRepository.save(course);
      return res.status(200).json(course);
    } catch (err) {
      console.error("Course update error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateLesson(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { title, description, videoUrl, duration, chapter, order, photo, notes, resourceUrl, resourceTitle, questions } = req.body;

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
      if (photo !== undefined) lesson.photo = photo;
      if (notes !== undefined) lesson.notes = notes;
      if (resourceUrl !== undefined) lesson.resourceUrl = resourceUrl;
      if (resourceTitle !== undefined) lesson.resourceTitle = resourceTitle;
      if (questions !== undefined) lesson.questions = Array.isArray(questions) ? questions : [];

      await lessonRepository.save(lesson);
      return res.status(200).json(lesson);
    } catch (err) {
      console.error("updateLesson error:", err);
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
      let requests: any[] = [];

      if (req.user?.role === "admin") {
        // Admin sees all enrollment requests from all courses
        requests = await AppDataSource.query(`
          SELECT 
            e.id, e.status, e.createdAt,
            u.id as studentId, u.name as studentName, u.email as studentEmail,
            u.phone as studentPhone, u.parentPhone as studentParentPhone, u.avatar as studentAvatar,
            u.location as studentLocation, u.education as studentEducation,
            c.id as courseId, c.title as courseTitle,
            t.id as teacherId, t.name as teacherName
          FROM enrollment e
          JOIN user u ON u.id = e.studentId
          JOIN course c ON c.id = e.courseId
          JOIN user t ON t.id = c.teacherId
          ORDER BY e.createdAt DESC
        `);
      } else {
        // Teacher sees all enrollment requests for their own courses
        requests = await AppDataSource.query(`
          SELECT 
            e.id, e.status, e.createdAt,
            u.id as studentId, u.name as studentName, u.email as studentEmail,
            u.phone as studentPhone, u.parentPhone as studentParentPhone, u.avatar as studentAvatar,
            u.location as studentLocation, u.education as studentEducation,
            c.id as courseId, c.title as courseTitle,
            t.id as teacherId, t.name as teacherName
          FROM enrollment e
          JOIN user u ON u.id = e.studentId
          JOIN course c ON c.id = e.courseId
          JOIN user t ON t.id = c.teacherId
          WHERE c.teacherId = ?
          ORDER BY e.createdAt DESC
        `, [req.user!.id]);
      }

      // Reshape to match the existing frontend format
      const shaped = requests.map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        student: {
          id: row.studentId,
          name: row.studentName,
          email: row.studentEmail,
          phone: row.studentPhone,
          parentPhone: row.studentParentPhone,
          avatar: row.studentAvatar,
          location: row.studentLocation,
          education: row.studentEducation
        },
        course: {
          id: row.courseId,
          title: row.courseTitle,
          teacher: { id: row.teacherId, name: row.teacherName }
        }
      }));

      return res.status(200).json(shaped);
    } catch (err) {
      console.error("Error fetching enrollment requests:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateEnrollmentRequest(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status, paymentData } = req.body; // 'active' or 'rejected'; paymentData is optional

    if (!status || !["active", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    try {
      const enrollmentRepository = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepository.findOne({
        where: { id },
        relations: ["student", "course", "course.teacher"]
      });

      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found." });
      }

      enrollment.status = status;

      // Create Payment record if accepting and paymentData provided
      if (status === "active" && paymentData) {
        try {
          const paymentRepository = AppDataSource.getRepository(Payment);
          const payment = new Payment();
          payment.student = enrollment.student;
          payment.amount = parseFloat(paymentData.amount) || 0;
          payment.currency = paymentData.currency || "EGP";
          payment.type = "COURSE_ENROLLMENT";
          payment.courseEnrollment = enrollment;
          payment.provider = paymentData.provider || "manual";
          payment.providerTransactionId = paymentData.providerTransactionId || null;
          payment.receiptUrl = paymentData.receiptUrl || null;
          payment.notes = paymentData.notes || null;
          payment.status = "SUCCESS";
          const savedPayment = await paymentRepository.save(payment);
          enrollment.payment = savedPayment;
        } catch (payErr) {
          console.error("Error creating payment record:", payErr);
          // Non-fatal: enrollment acceptance continues even if payment record fails
        }
      }

      await enrollmentRepository.save(enrollment);

      // Create internal notification for student
      if (enrollment.student) {
        if (status === "active") {
          await NotificationController.createNotification(
            enrollment.student.id,
            "تم قبول طلب التسجيل! 🎉",
            `تهانينا! تم قبول طلب انضمامك إلى دورة "${enrollment.course?.title || 'الدورة التعليمية'}". يمكنك الآن البدء بالمتابعة والتفكير بالتفوق.`,
            "success",
            "#courses"
          );
        } else if (status === "rejected") {
          await NotificationController.createNotification(
            enrollment.student.id,
            "تحديث حالة طلب الانضمام ❌",
            `نأسف، تم رفض طلب انضمامك إلى دورة "${enrollment.course?.title || 'الدورة التعليمية'}".`,
            "warning",
            "#courses"
          );
        }
      }

      let whatsappNotification: any = null;
      if (status === "active" && enrollment.student && enrollment.student.phone) {
        const msgText = buildEnrollmentAcceptedMessage(
          enrollment.student.name,
          enrollment.course ? enrollment.course.title : "الدورة التعليمية",
          enrollment.course && enrollment.course.teacher ? enrollment.course.teacher.name : undefined
        );
        whatsappNotification = createWhatsAppNotificationPayload(enrollment.student.phone, msgText);
      }

      return res.status(200).json({
        ...enrollment,
        whatsappNotification
      });
    } catch (err) {
      console.error("Error updating enrollment request:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
