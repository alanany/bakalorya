import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Blog } from "../entity/Blog";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";

export class BlogController {
  static async getAll(req: Request, res: Response) {
    try {
      const blogRepo = AppDataSource.getRepository(Blog);
      const blogs = await blogRepo.find({
        order: { createdAt: "DESC" }
      });
      return res.json(blogs);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      return res.status(500).json({ error: "Failed to fetch blogs" });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = await blogRepo.findOne({
        where: { id: req.params.id }
      });
      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      return res.json(blog);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      return res.status(500).json({ error: "Failed to fetch blog post" });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { title, content, category, image, readTime } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const author = await userRepo.findOne({ where: { id: req.user!.id } });

      if (!author) {
        return res.status(401).json({ error: "Author user not found." });
      }

      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = blogRepo.create({
        title,
        content,
        category: category || "عام",
        image: image || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600",
        readTime: readTime || "📖 5 دقائق قراءة",
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
      const { title, content, category, image, readTime } = req.body;
      const blogRepo = AppDataSource.getRepository(Blog);

      const blog = await blogRepo.findOne({
        where: { id: req.params.id },
        relations: ["author"]
      });

      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      if (blog.author.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to edit this article" });
      }

      if (title) blog.title = title;
      if (content) blog.content = content;
      if (category) blog.category = category;
      if (image) blog.image = image;
      if (readTime) blog.readTime = readTime;

      await blogRepo.save(blog);
      return res.json(blog);
    } catch (error) {
      console.error("Error updating blog:", error);
      return res.status(500).json({ error: "Failed to update blog article" });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const blogRepo = AppDataSource.getRepository(Blog);
      const blog = await blogRepo.findOne({
        where: { id: req.params.id },
        relations: ["author"]
      });

      if (!blog) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      if (blog.author.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to delete this article" });
      }

      await blogRepo.remove(blog);
      return res.json({ message: "Blog article deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog:", error);
      return res.status(500).json({ error: "Failed to delete blog article" });
    }
  }
}
