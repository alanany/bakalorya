import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { TeacherAvailability } from "../entity/TeacherAvailability";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";

export class TeacherAvailabilityController {
  // Public/Student view active time slots for teacher
  static async getByTeacher(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const availabilityRepository = AppDataSource.getRepository(TeacherAvailability);
      const slots = await availabilityRepository.find({
        where: { teacher: { id }, isActive: true },
        order: { dayOfWeek: "ASC", startTime: "ASC" }
      });
      return res.status(200).json(slots);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher set/add weekly availability slot
  static async setAvailability(req: AuthRequest, res: Response) {
    const { dayOfWeek, startTime, endTime, timezone } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: "الرجاء تحديد اليوم، وقت البدء، ووقت الانتهاء." });
    }

    try {
      const availabilityRepository = AppDataSource.getRepository(TeacherAvailability);
      const userRepository = AppDataSource.getRepository(User);

      const teacher = await userRepository.findOneBy({ id: req.user!.id, role: "teacher" });
      if (!teacher) return res.status(404).json({ error: "حساب المعلم غير موجود." });

      const slot = new TeacherAvailability();
      slot.teacher = teacher;
      slot.dayOfWeek = Number(dayOfWeek);
      slot.startTime = startTime;
      slot.endTime = endTime;
      slot.timezone = timezone || "Africa/Cairo";
      slot.isActive = true;

      await availabilityRepository.save(slot);
      return res.status(201).json(slot);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  // Teacher delete slot
  static async deleteSlot(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const availabilityRepository = AppDataSource.getRepository(TeacherAvailability);
      const slot = await availabilityRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!slot) return res.status(404).json({ error: "الفترة الزمنية غير موجودة." });

      if (slot.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "غير مصرح لك بتعديل فترات هذا المعلم." });
      }

      await availabilityRepository.remove(slot);
      return res.status(200).json({ message: "تم حذف فترة التفرغ بنجاح." });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }
}
