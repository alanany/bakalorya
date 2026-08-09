import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Review } from "../entity/Review";
import { User } from "../entity/User";
import { Course } from "../entity/Course";
import { AuthRequest } from "../middleware/auth";

export class ReviewController {
  static async create(req: AuthRequest, res: Response) {
    const { rating, comment, courseId, teacherId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "الرجاء تحديد تقييم من 1 إلى 5 نجوم." });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: "الرجاء كتابة تعليق على التقييم." });
    }

    if (!courseId && !teacherId) {
      return res.status(400).json({ error: "الرجاء تحديد الدورة أو الأستاذ المستهدف بالتقييم." });
    }

    try {
      const reviewRepository = AppDataSource.getRepository(Review);
      const userRepository = AppDataSource.getRepository(User);
      const courseRepository = AppDataSource.getRepository(Course);

      const student = await userRepository.findOneBy({ id: req.user!.id });
      if (!student) {
        return res.status(404).json({ error: "حساب الطالب غير موجود." });
      }

      let course: Course | null = null;
      let teacher: User | null = null;

      if (courseId) {
        course = await courseRepository.findOne({
          where: { id: courseId },
          relations: ["teacher"]
        });
        if (!course) {
          return res.status(404).json({ error: "الدورة التدريبية غير موجودة." });
        }
      }

      if (teacherId) {
        teacher = await userRepository.findOneBy({ id: teacherId, role: "teacher" });
        if (!teacher && !course) {
          return res.status(404).json({ error: "الأستاذ غير موجود." });
        }
      }

      // Check if student already created a review for this target
      let existingReview: Review | null = null;
      if (courseId) {
        existingReview = await reviewRepository.findOne({
          where: { student: { id: student.id }, course: { id: courseId } }
        });
      } else if (teacherId) {
        existingReview = await reviewRepository.findOne({
          where: { student: { id: student.id }, teacher: { id: teacherId } }
        });
      }

      let review: Review;
      if (existingReview) {
        review = existingReview;
        review.rating = Number(rating);
        review.comment = comment;
      } else {
        review = new Review();
        review.rating = Number(rating);
        review.comment = comment;
        review.student = student;
        if (course) review.course = course;
        if (teacher) review.teacher = teacher;
      }

      await reviewRepository.save(review);

      const savedReview = await reviewRepository.findOne({
        where: { id: review.id },
        relations: ["student", "course", "teacher"]
      });

      return res.status(201).json(savedReview);
    } catch (err) {
      console.error("Review submit error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async getByCourse(req: Request, res: Response) {
    const { courseId } = req.params;

    try {
      const reviewRepository = AppDataSource.getRepository(Review);
      const reviews = await reviewRepository.find({
        where: { course: { id: courseId } },
        relations: ["student"],
        order: { createdAt: "DESC" }
      });

      const count = reviews.length;
      let averageRating = 0;
      if (count > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        averageRating = Number((sum / count).toFixed(1));
      }

      return res.status(200).json({
        reviews,
        totalReviews: count,
        averageRating
      });
    } catch (err) {
      console.error("Fetch course reviews error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async getByTeacher(req: Request, res: Response) {
    const { teacherId } = req.params;

    try {
      const reviewRepository = AppDataSource.getRepository(Review);
      const reviews = await reviewRepository.find({
        where: [
          { teacher: { id: teacherId } },
          { course: { teacher: { id: teacherId } } }
        ],
        relations: ["student", "course"],
        order: { createdAt: "DESC" }
      });

      const count = reviews.length;
      let averageRating = 0;
      if (count > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        averageRating = Number((sum / count).toFixed(1));
      }

      return res.status(200).json({
        reviews,
        totalReviews: count,
        averageRating
      });
    } catch (err) {
      console.error("Fetch teacher reviews error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const reviewRepository = AppDataSource.getRepository(Review);
      const review = await reviewRepository.findOne({
        where: { id },
        relations: ["student"]
      });

      if (!review) {
        return res.status(404).json({ error: "التقييم غير موجود." });
      }

      if (review.student.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "غير مصرح لك بحذف هذا التقييم." });
      }

      await reviewRepository.remove(review);
      return res.status(200).json({ message: "تم حذف التقييم بنجاح." });
    } catch (err) {
      console.error("Delete review error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
