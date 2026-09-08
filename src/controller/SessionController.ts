import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";
import { User } from "../entity/User";
import { Course } from "../entity/Course";
import { CourseGroup } from "../entity/CourseGroup";
import { Enrollment } from "../entity/Enrollment";
import { SessionAttendance } from "../entity/SessionAttendance";
import { AuthRequest } from "../middleware/auth";
import {
  formatPhoneForWhatsApp,
  generateWhatsAppLink,
  buildTeacherSessionReminderMessage,
  buildStudentSessionReminderMessage,
  buildGroupBroadcastReminderMessage
} from "../utils/whatsapp";

export class SessionController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const sessions = await sessionRepository.find({
        relations: ["teacher", "course", "course.subject", "course.grade", "course.teacher", "student", "subscription", "group"],
        order: { scheduledAt: "DESC" }
      });

      let finalSessions = sessions;

      if (req.user && req.user.role === "student") {
        const enrollmentRepository = AppDataSource.getRepository("Enrollment");
        const activeEnrollments = await enrollmentRepository.find({
          where: { student: { id: req.user.id }, status: "active" },
          relations: ["course", "group", "group.course"]
        }) as any[];
        
        const activeCourseIds = activeEnrollments.map(e => e.course?.id || e.group?.course?.id).filter(Boolean);
        const activeGroupIds = activeEnrollments.map(e => e.group?.id).filter(Boolean);
        
        finalSessions = sessions.filter(session => {
          // 1. If assigned directly to this student (1-on-1 private)
          if (session.student?.id) {
            return session.student.id === req.user!.id;
          }
          // 2. If session belongs to a group, student MUST be enrolled in THAT group
          if (session.group?.id) {
            return activeGroupIds.includes(session.group.id);
          }
          // 3. If legacy session belongs to a course without a group, student must have an active enrollment
          if (session.course?.id) {
            return activeCourseIds.includes(session.course.id);
          }
          return false;
        });
      } else if (req.user && req.user.role === "teacher") {
        finalSessions = sessions.filter(session => session.teacher?.id === req.user!.id);
      }

      if (req.user) {
        const attendanceRepository = AppDataSource.getRepository(SessionAttendance);
        const myAttendances = await attendanceRepository.find({
          where: { user: { id: req.user.id }, status: "PRESENT" },
          relations: ["session"]
        });
        const checkedSessionIds = new Set(myAttendances.map(a => a.session?.id).filter(Boolean));
        finalSessions = finalSessions.map((s: any) => ({
          ...s,
          isCheckedIn: checkedSessionIds.has(s.id)
        })) as any;
      }

      return res.status(200).json(finalSessions);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    const { title, description, scheduledAt, duration, courseId, groupId } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ error: "Missing required fields (title, scheduledAt)." });
    }

    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    const minAllowedTime = new Date(now.getTime() + 59 * 60 * 1000);

    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "تاريخ البث المباشر غير صالح." });
    }

    if (scheduledDate < minAllowedTime) {
      return res.status(400).json({ error: "عفواً، موعد البث المباشر يجب أن يكون في المستقبل وبعد الوقت الحالي بساعة واحدة على الأقل." });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const userRepository = AppDataSource.getRepository(User);
      const courseRepository = AppDataSource.getRepository(Course);
      const groupRepository = AppDataSource.getRepository(CourseGroup);

      const teacher = await userRepository.findOneBy({ id: req.user!.id });
      if (!teacher) {
        return res.status(404).json({ error: "Teacher profile not found." });
      }

      const session = new Session();
      session.title = title;
      session.description = description;
      session.teacher = teacher;
      session.scheduledAt = scheduledDate;
      session.duration = duration || 60;
      session.status = "scheduled";

      if (groupId) {
        const group = await groupRepository.findOne({ where: { id: groupId }, relations: ["course"] });
        if (group) {
          session.group = group;
          if (group.course) session.course = group.course;
        }
      }

      if (!session.course && courseId) {
        const course = await courseRepository.findOneBy({ id: courseId });
        if (course) {
          session.course = course;
        }
      }

      await sessionRepository.save(session);
      return res.status(201).json(session);
    } catch (err) {
      console.error("Session creation error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { title, description, scheduledAt, duration, courseId, groupId } = req.body;

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const courseRepository = AppDataSource.getRepository(Course);
      const groupRepository = AppDataSource.getRepository(CourseGroup);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "course", "group"]
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      if (session.teacher?.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
      }

      if (title) session.title = title;
      if (description !== undefined) session.description = description;
      if (scheduledAt) {
        const scheduledDate = new Date(scheduledAt);
        const now = new Date();
        const minAllowedTime = new Date(now.getTime() + 59 * 60 * 1000);

        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({ error: "تاريخ البث المباشر غير صالح." });
        }

        if (scheduledDate < minAllowedTime) {
          return res.status(400).json({ error: "عفواً، موعد البث المباشر يجب أن يكون في المستقبل وبعد الوقت الحالي بساعة واحدة على الأقل." });
        }
        session.scheduledAt = scheduledDate;
      }
      if (duration) session.duration = Number(duration);

      if (courseId) {
        const course = await courseRepository.findOneBy({ id: String(courseId) });
        if (course) session.course = course;
      }

      if (groupId !== undefined) {
        if (groupId) {
          const group = await groupRepository.findOne({ where: { id: groupId } });
          if (group) session.group = group;
        } else {
          session.group = null;
        }
      }

      await sessionRepository.save(session);
      const updated = await sessionRepository.findOne({
        where: { id: session.id },
        relations: ["teacher", "course"]
      });
      return res.status(200).json(updated);
    } catch (err) {
      console.error("Update session error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher"]
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      if (session.teacher?.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
      }

      await sessionRepository.remove(session);
      return res.status(200).json({ message: "Session deleted." });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    if (!["scheduled", "live", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    try {
      const sessionRepository = AppDataSource.getRepository(Session);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: ["teacher", "course"]
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      if (session.teacher.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
      }

      session.status = status;
      await sessionRepository.save(session);
      return res.status(200).json(session);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error." });
    }
  }

  static async getSessionReminderData(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const sessionRepository = AppDataSource.getRepository(Session);
      const session = await sessionRepository.findOne({
        where: { id },
        relations: [
          "teacher",
          "student",
          "group",
          "group.teacher",
          "group.course",
          "course",
          "course.teacher",
          "course.grade",
          "course.subject"
        ]
      });

      if (!session) {
        return res.status(404).json({ error: "الحصة غير موجودة." });
      }

      const teacher = session.teacher || session.group?.teacher || session.course?.teacher;
      const teacherName = teacher?.name || "معلم المنصة";
      const teacherPhone = teacher?.phone || "";

      const rawMeetingLink = (
        session.meetingLink ||
        session.group?.meetingLink ||
        session.course?.meetingLink ||
        teacher?.meetingLink ||
        ""
      ).trim();

      let meetingLink = rawMeetingLink;
      if (meetingLink && !meetingLink.startsWith("http://") && !meetingLink.startsWith("https://")) {
        meetingLink = "https://" + meetingLink;
      }

      // Format date and time
      const schedDate = session.scheduledAt ? new Date(session.scheduledAt) : new Date();
      const dateStr = schedDate.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const timeStr = schedDate.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit"
      });

      const sessionTitle = session.title || session.group?.name || session.course?.title || "حصة دراسية مباشرة";
      const studentOrGroupName = session.student?.name || session.group?.name || session.course?.title || "المجموعة الدراسية";

      // Teacher WhatsApp message
      const teacherMessage = buildTeacherSessionReminderMessage({
        teacherName,
        sessionTitle,
        studentOrGroupName,
        scheduledDateStr: dateStr,
        scheduledTimeStr: timeStr,
        meetingLink
      });

      const teacherPayload = {
        id: teacher?.id || null,
        name: teacherName,
        phone: teacherPhone,
        formattedPhone: formatPhoneForWhatsApp(teacherPhone),
        whatsappUrl: generateWhatsAppLink(teacherPhone, teacherMessage),
        messageText: teacherMessage
      };

      let isGroup = !session.student;
      let singleStudent: any = null;
      let groupStudents: any[] = [];

      if (session.student) {
        const studentName = session.student.name || "طالب المنصة";
        const studentPhone = session.student.phone || "";
        const studentMessage = buildStudentSessionReminderMessage({
          studentName,
          sessionTitle,
          teacherName,
          scheduledDateStr: dateStr,
          scheduledTimeStr: timeStr,
          meetingLink
        });

        singleStudent = {
          id: session.student.id,
          name: studentName,
          phone: studentPhone,
          formattedPhone: formatPhoneForWhatsApp(studentPhone),
          whatsappUrl: generateWhatsAppLink(studentPhone, studentMessage),
          messageText: studentMessage
        };
      } else if (session.group?.id || session.course?.id) {
        isGroup = true;
        const enrollmentRepository = AppDataSource.getRepository(Enrollment);
        const filterWhere: any = { status: "active" };
        if (session.group?.id) {
          filterWhere.group = { id: session.group.id };
        } else if (session.course?.id) {
          filterWhere.course = { id: session.course.id };
        }

        const enrollments = await enrollmentRepository.find({
          where: filterWhere,
          relations: ["student"]
        });

        groupStudents = enrollments.map(e => {
          const sName = e.student?.name || "طالب";
          const sPhone = e.student?.phone || "";
          const sMsg = buildStudentSessionReminderMessage({
            studentName: sName,
            sessionTitle,
            teacherName,
            scheduledDateStr: dateStr,
            scheduledTimeStr: timeStr,
            meetingLink
          });

          return {
            enrollmentId: e.id,
            id: e.student?.id || null,
            name: sName,
            phone: sPhone,
            formattedPhone: formatPhoneForWhatsApp(sPhone),
            whatsappUrl: generateWhatsAppLink(sPhone, sMsg),
            messageText: sMsg
          };
        });
      }

      const groupBroadcastText = buildGroupBroadcastReminderMessage({
        groupTitle: session.group?.name || session.course?.title || sessionTitle,
        teacherName,
        scheduledDateStr: dateStr,
        scheduledTimeStr: timeStr,
        meetingLink
      });

      return res.status(200).json({
        session: {
          id: session.id,
          title: sessionTitle,
          scheduledAt: session.scheduledAt,
          duration: session.duration || 60,
          meetingLink,
          status: session.status
        },
        teacher: teacherPayload,
        isGroup,
        student: singleStudent,
        students: groupStudents,
        groupBroadcastText
      });
    } catch (err: any) {
      console.error("Error in getSessionReminderData:", err);
      return res.status(500).json({ error: "فشل استخراج بيانات تذكير الواتساب للحصة." });
    }
  }
}
