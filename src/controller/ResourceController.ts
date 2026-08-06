import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Resource } from "../entity/Resource";
import { Course } from "../entity/Course";
import { Enrollment } from "../entity/Enrollment";
import { AuthRequest } from "../middleware/auth";

export class ResourceController {

  // GET /resources — Get all resources (filtered by role & course access)
  static getResources = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const userId = user.id;
      const resourceRepo = AppDataSource.getRepository(Resource);

      // Fetch all resources with course and course.teacher relations
      const allResources = await resourceRepo.find({
        relations: ["course", "course.teacher"],
        order: { createdAt: "DESC" }
      });

      if (user.role === "admin") {
        return res.json(allResources);
      }

      if (user.role === "teacher") {
        const teacherResources = allResources.filter(r => 
          r.course && (r.course.teacher?.id === userId || (r.course as any).teacherId === userId)
        );
        return res.json(teacherResources);
      }

      if (user.role === "student") {
        const enrollmentRepo = AppDataSource.getRepository(Enrollment);
        const activeEnrollments = await enrollmentRepo.find({
          where: { student: { id: userId }, status: "active" },
          relations: ["course"]
        });
        const enrolledCourseIds = new Set(activeEnrollments.map(e => e.course?.id).filter(Boolean));
        const studentResources = allResources.filter(r => r.course && enrolledCourseIds.has(r.course.id));
        return res.json(studentResources);
      }

      return res.json(allResources);
    } catch (error) {
      console.error("getResources error:", error);
      return res.status(500).json({ error: "Failed to fetch resources" });
    }
  };

  // POST /resources — Create a new resource
  static createResource = async (req: AuthRequest, res: Response) => {
    try {
      const { title, url, courseId, photo } = req.body;
      const targetCourseId = courseId ? String(courseId).trim() : "";

      if (!title || !url || !targetCourseId) {
        return res.status(400).json({ error: "اسم المورد ورابطه والدورة المرتبطة مطلوبين جميعاً." });
      }

      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({
        where: { id: targetCourseId },
        relations: ["teacher"]
      });

      if (!course) {
        return res.status(404).json({ error: "الدورة المحددة غير موجودة." });
      }

      const resourceRepo = AppDataSource.getRepository(Resource);
      const resource = resourceRepo.create({
        title: title.trim(),
        url: url.trim(),
        photo: photo ? photo.trim() : null,
        course
      });

      await resourceRepo.save(resource);

      const savedResource = await resourceRepo.findOne({
        where: { id: resource.id },
        relations: ["course", "course.teacher"]
      });

      return res.status(201).json(savedResource);
    } catch (error) {
      console.error("Resource creation error:", error);
      return res.status(500).json({ error: "فشل إنشاء المورد التعليمي." });
    }
  };

  // DELETE /resources/:id — Delete a resource
  static deleteResource = async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const userId = user.id;
      const id = parseInt(req.params.id);
      const resourceRepo = AppDataSource.getRepository(Resource);

      const resource = await resourceRepo.findOne({
        where: { id },
        relations: ["course", "course.teacher"]
      });

      if (!resource) {
        return res.status(404).json({ error: "المورد غير موجود." });
      }

      if (user.role === "teacher" && resource.course?.teacher?.id !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بحذف هذا المورد." });
      }

      await resourceRepo.remove(resource);
      return res.json({ message: "تم حذف المورد بنجاح." });
    } catch (error) {
      console.error("Resource deletion error:", error);
      return res.status(500).json({ error: "فشل حذف المورد." });
    }
  };
}
