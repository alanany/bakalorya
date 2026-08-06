import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entity/Category";
import { AuthRequest } from "../middleware/auth";

export class CategoryController {
  static async getAll(req: Request, res: Response) {
    try {
      const categoryRepo = AppDataSource.getRepository(Category);
      const categories = await categoryRepo.find({
        order: { name: "ASC" }
      });
      return res.json(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admin access required." });
    }

    const { name, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }

    try {
      const categoryRepo = AppDataSource.getRepository(Category);

      const existing = await categoryRepo.findOneBy({ name });
      if (existing) {
        return res.status(400).json({ error: "Category already exists." });
      }

      const category = new Category();
      category.name = name.trim();
      category.description = description ? description.trim() : null;
      category.icon = icon ? icon.trim() : null;

      await categoryRepo.save(category);
      return res.status(201).json(category);
    } catch (err) {
      console.error("Error creating category:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admin access required." });
    }

    const { id } = req.params;
    const { name, description, icon } = req.body;

    try {
      const categoryRepo = AppDataSource.getRepository(Category);
      const category = await categoryRepo.findOneBy({ id });

      if (!category) {
        return res.status(404).json({ error: "Category not found." });
      }

      if (name) category.name = name.trim();
      if (description !== undefined) category.description = description ? description.trim() : null;
      if (icon !== undefined) category.icon = icon ? icon.trim() : null;

      await categoryRepo.save(category);
      return res.json(category);
    } catch (err) {
      console.error("Error updating category:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admin access required." });
    }

    const { id } = req.params;

    try {
      const categoryRepo = AppDataSource.getRepository(Category);
      const category = await categoryRepo.findOneBy({ id });

      if (!category) {
        return res.status(404).json({ error: "Category not found." });
      }

      await categoryRepo.remove(category);
      return res.json({ message: "Category deleted successfully." });
    } catch (err) {
      console.error("Error deleting category:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
