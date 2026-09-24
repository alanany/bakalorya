import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Blog } from "../entity/Blog";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";
import { NotificationController } from "./NotificationController";

export class BlogController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const blogRepo = AppDataSource.getRepository(Blog);
      const user = req.user;

      // 1. Admin requesting all blogs or filtered by status
      if (user && user.role === "admin") {
        const queryStatus = req.query.status as string;
        let whereClause: any = {};
        if (queryStatus && queryStatus !== "ALL") {
          whereClause = { status: queryStatus };
        }
        const blogs = await blogRepo.find({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          order: { createdAt: "DESC" }
        });
        return res.json(blogs);
      }

      // 2. Teacher requesting blogs (see approved blogs + their own pending/rejected ones)
      if (user && user.role === "teacher") {
        const queryMy = req.query.my === "true" || req.query.allMine === "true";
        if (queryMy) {
          const myBlogs = await blogRepo.find({
            where: { author: { id: user.id } },
            order: { createdAt: "DESC" }
          });
          return res.json(myBlogs);
        }

        // Return approved blogs OR blogs authored by this teacher
        const blogs = await blogRepo
          .createQueryBuilder("blog")
          .leftJoinAndSelect("blog.author", "author")
          .where("blog.status = :approvedStatus OR author.id = :teacherId", {
            approvedStatus: "APPROVED",
            teacherId: user.id
          })
          .orderBy("blog.createdAt", "DESC")
          .getMany();

        return res.json(blogs);
      }

      // 3. Public or students: only APPROVED blogs
      const blogs = await blogRepo
        .createQueryBuilder("blog")
        .leftJoinAndSelect("blog.author", "author")
        .where("blog.status = :approvedStatus OR blog.status IS NULL", { approvedStatus: "APPROVED" })
        .orderBy("blog.createdAt", "DESC")
        .getMany();

      return res.json(blogs);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      return res.status(500).json({ error: "Failed to fetch blogs" });
    }
  }

  static async getOne(req: AuthRequest, res: Response) {
    try {
      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = await blogRepo.findOne({
        where: { id: req.params.id },
        relations: ["author"]
      });

      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // If blog is not approved, only author or admin can view
      if (blog.status && blog.status !== "APPROVED") {
        const user = req.user;
        const isAuthor = user && blog.author && user.id === blog.author.id;
        const isAdmin = user && user.role === "admin";
        if (!isAuthor && !isAdmin) {
          return res.status(404).json({ error: "Blog post not found or pending review" });
        }
      }

      return res.json(blog);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      return res.status(500).json({ error: "Failed to fetch blog post" });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "فقط مسؤولو المنصة يمكنهم إنشاء المقالات." });
      }

      const { title, content, category, image, readTime, status } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const author = await userRepo.findOne({ where: { id: req.user!.id } });

      if (!author) {
        return res.status(401).json({ error: "Author user not found." });
      }

      const blogStatus: "PENDING" | "APPROVED" | "REJECTED" = 
        status && ["APPROVED", "PENDING", "REJECTED"].includes(status) ? status : "APPROVED";

      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = blogRepo.create({
        title,
        content,
        category: category || "عام",
        image: image || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600",
        readTime: readTime || "📖 5 دقائق قراءة",
        status: blogStatus,
        rejectionReason: undefined,
        author
      });

      await blogRepo.save(blog);
      return res.status(201).json(blog);
    } catch (error) {
      console.error("Error creating blog:", error);
      return res.status(500).json({ error: "Failed to create blog article" });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "فقط مسؤولو المنصة يمكنهم تعديل المقالات." });
      }

      const { title, content, category, image, readTime, status, rejectionReason } = req.body;
      const blogRepo = AppDataSource.getRepository(Blog);

      const blog = await blogRepo.findOne({
        where: { id: req.params.id },
        relations: ["author"]
      });

      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      if (title) blog.title = title;
      if (content) blog.content = content;
      if (category) blog.category = category;
      if (image !== undefined) blog.image = image;
      if (readTime) blog.readTime = readTime;

      if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        blog.status = status;
        if (status === "REJECTED") {
          blog.rejectionReason = rejectionReason || blog.rejectionReason || "لم يستوفِ معايير النشر.";
        } else if (status === "APPROVED") {
          blog.rejectionReason = undefined;
        }
      }

      await blogRepo.save(blog);
      return res.json(blog);
    } catch (error) {
      console.error("Error updating blog:", error);
      return res.status(500).json({ error: "Failed to update blog article" });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "فقط مسؤولو المنصة يمكنهم حذف المقالات." });
      }

      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = await blogRepo.findOne({
        where: { id: req.params.id },
        relations: ["author"]
      });

      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      await blogRepo.remove(blog);
      return res.json({ message: "Blog article deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog:", error);
      return res.status(500).json({ error: "Failed to delete blog article" });
    }
  }

  // ── Admin: Get all blogs with filters ──────────────────────────────────────────
  static async getAdminBlogs(req: AuthRequest, res: Response) {
    try {
      const blogRepo = AppDataSource.getRepository(Blog);
      const { status } = req.query;

      let whereClause: any = {};
      if (status && status !== "ALL") {
        whereClause.status = status;
      }

      const blogs = await blogRepo.find({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        relations: ["author"],
        order: { createdAt: "DESC" }
      });

      return res.json(blogs);
    } catch (error) {
      console.error("Error fetching admin blogs:", error);
      return res.status(500).json({ error: "Failed to fetch admin blogs" });
    }
  }

  // ── Admin: Accept / Refuse Teacher Blog ─────────────────────────────────────────
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status, rejectionReason } = req.body;
      if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
        return res.status(400).json({ error: "Status must be APPROVED, REJECTED, or PENDING" });
      }

      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = await blogRepo.findOne({
        where: { id: req.params.id },
        relations: ["author"]
      });

      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      const previousStatus = blog.status;
      blog.status = status;

      if (status === "APPROVED") {
        blog.rejectionReason = undefined;
      } else if (status === "REJECTED") {
        blog.rejectionReason = rejectionReason || "لم يستوفِ المقال معايير وشروط النشر التربوي المحددة بالمنصة.";
      }

      await blogRepo.save(blog);

      // Notify the author if status changed
      if (blog.author && blog.author.id !== req.user!.id && previousStatus !== status) {
        if (status === "APPROVED") {
          await NotificationController.createNotification(
            blog.author.id,
            "تمت الموافقة على مقالك في المدونة ✅",
            `تهانينا! تمت مراجعة مقالك "${blog.title}" واعتماده بنجاح من قِبل إدارة المنصة، وهو الآن منشور ومتاح للجميع.`,
            "success",
            `#blog/${blog.id}`
          );
        } else if (status === "REJECTED") {
          await NotificationController.createNotification(
            blog.author.id,
            "تم رفض نشر مقال المدونة ❌",
            `نعتذر، لم يتم اعتماد مقالك "${blog.title}". السبب: ${blog.rejectionReason}`,
            "error",
            `#teacher-blogs`
          );
        }
      }

      return res.json({
        message: status === "APPROVED" ? "تم قبول ونشر المقال بنجاح!" : "تم رفض المقال وتنبيه المعلم بالسبب.",
        blog
      });
    } catch (error) {
      console.error("Error updating blog status:", error);
      return res.status(500).json({ error: "Failed to update blog status" });
    }
  }
}
