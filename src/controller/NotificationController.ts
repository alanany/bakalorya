import { Response } from "express";
import { AppDataSource } from "../data-source";
import { Notification } from "../entity/Notification";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";

export class NotificationController {
  // Static helper to push notification internally
  static async createNotification(userId: string, title: string, message: string, type: string = "info", link: string | null = null) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      const notifRepo = AppDataSource.getRepository(Notification);

      const user = await userRepo.findOneBy({ id: userId });
      if (!user) return null;

      const notif = notifRepo.create({
        user,
        title,
        message,
        type,
        link: link || undefined,
        isRead: false
      });

      return await notifRepo.save(notif);
    } catch (err) {
      console.error("Failed to create notification:", err);
      return null;
    }
  }

  // GET /api/notifications
  static async getUserNotifications(req: AuthRequest, res: Response) {
    try {
      const notifRepo = AppDataSource.getRepository(Notification);
      const notifications = await notifRepo.find({
        where: { user: { id: req.user!.id } },
        order: { createdAt: "DESC" },
        take: 50
      });
      return res.status(200).json(notifications);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch notifications." });
    }
  }

  // GET /api/notifications/unread-count
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const notifRepo = AppDataSource.getRepository(Notification);
      const count = await notifRepo.count({
        where: { user: { id: req.user!.id }, isRead: false }
      });
      return res.status(200).json({ unreadCount: count });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to get count." });
    }
  }

  // PATCH /api/notifications/:id/read
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const notifRepo = AppDataSource.getRepository(Notification);
      
      const notif = await notifRepo.findOne({
        where: { id, user: { id: req.user!.id } }
      });

      if (!notif) {
        return res.status(404).json({ error: "Notification not found." });
      }

      notif.isRead = true;
      await notifRepo.save(notif);
      return res.status(200).json(notif);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to mark notification as read." });
    }
  }

  // PATCH /api/notifications/read-all
  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const notifRepo = AppDataSource.getRepository(Notification);
      await notifRepo.update(
        { user: { id: req.user!.id }, isRead: false },
        { isRead: true }
      );
      return res.status(200).json({ message: "All notifications marked as read." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to mark all as read." });
    }
  }

  // DELETE /api/notifications/:id
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const notifRepo = AppDataSource.getRepository(Notification);
      await notifRepo.delete({ id, user: { id: req.user!.id } });
      return res.status(200).json({ message: "Notification deleted." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete notification." });
    }
  }
}
