import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Grade } from "../entity/Grade";
import { Subject } from "../entity/Subject";
import { Course } from "../entity/Course";
import { CourseGroup } from "../entity/CourseGroup";
import { Enrollment } from "../entity/Enrollment";

// Egyptian Curriculum Data Structure from Nagwa Egypt
export const EGYPTIAN_CURRICULUM_DATA = [
  // --- الابتدائية (PRIMARY) ---
  {
    name: "الصف الأول الابتدائي",
    nameEn: "Grade 1 (Primary)",
    stage: "PRIMARY" as const,
    order: 1,
    code: "PRI_1",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "Connect Plus", nameEn: "Connect Plus", icon: "📘", isLanguageTrack: true },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
    ]
  },
  {
    name: "الصف الثاني الابتدائي",
    nameEn: "Grade 2 (Primary)",
    stage: "PRIMARY" as const,
    order: 2,
    code: "PRI_2",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "Connect Plus", nameEn: "Connect Plus", icon: "📘", isLanguageTrack: true },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
    ]
  },
  {
    name: "الصف الثالث الابتدائي",
    nameEn: "Grade 3 (Primary)",
    stage: "PRIMARY" as const,
    order: 3,
    code: "PRI_3",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "Connect Plus", nameEn: "Connect Plus", icon: "📘", isLanguageTrack: true },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
    ]
  },
  {
    name: "الصف الرابع الابتدائي",
    nameEn: "Grade 4 (Primary)",
    stage: "PRIMARY" as const,
    order: 4,
    code: "PRI_4",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "Connect Plus", nameEn: "Connect Plus", icon: "📘", isLanguageTrack: true },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "العلوم", nameEn: "Science", icon: "🔬", isLanguageTrack: false },
      { name: "Science", nameEn: "Science (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الدراسات الاجتماعية", nameEn: "Social Studies", icon: "🌍", isLanguageTrack: false },
      { name: "تكنولوجيا المعلومات والاتصالات (ICT)", nameEn: "ICT", icon: "💻", isLanguageTrack: false },
      { name: "ICT", nameEn: "ICT (EN)", icon: "🖥️", isLanguageTrack: true },
    ]
  },
  {
    name: "الصف الخامس الابتدائي",
    nameEn: "Grade 5 (Primary)",
    stage: "PRIMARY" as const,
    order: 5,
    code: "PRI_5",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "Connect Plus", nameEn: "Connect Plus", icon: "📘", isLanguageTrack: true },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "العلوم", nameEn: "Science", icon: "🔬", isLanguageTrack: false },
      { name: "Science", nameEn: "Science (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الدراسات الاجتماعية", nameEn: "Social Studies", icon: "🌍", isLanguageTrack: false },
      { name: "تكنولوجيا المعلومات والاتصالات (ICT)", nameEn: "ICT", icon: "💻", isLanguageTrack: false },
      { name: "ICT", nameEn: "ICT (EN)", icon: "🖥️", isLanguageTrack: true },
    ]
  },
  {
    name: "الصف السادس الابتدائي",
    nameEn: "Grade 6 (Primary)",
    stage: "PRIMARY" as const,
    order: 6,
    code: "PRI_6",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "Connect Plus", nameEn: "Connect Plus", icon: "📘", isLanguageTrack: true },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "العلوم", nameEn: "Science", icon: "🔬", isLanguageTrack: false },
      { name: "Science", nameEn: "Science (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الدراسات الاجتماعية", nameEn: "Social Studies", icon: "🌍", isLanguageTrack: false },
      { name: "تكنولوجيا المعلومات والاتصالات (ICT)", nameEn: "ICT", icon: "💻", isLanguageTrack: false },
      { name: "ICT", nameEn: "ICT (EN)", icon: "🖥️", isLanguageTrack: true },
    ]
  },

  // --- الإعدادية (PREPARATORY) ---
  {
    name: "الصف الأول الإعدادي",
    nameEn: "Grade 7 (1st Prep)",
    stage: "PREPARATORY" as const,
    order: 7,
    code: "PREP_1",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "العلوم", nameEn: "Science", icon: "🔬", isLanguageTrack: false },
      { name: "Science", nameEn: "Science (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الدراسات الاجتماعية", nameEn: "Social Studies", icon: "🌍", isLanguageTrack: false },
    ]
  },
  {
    name: "الصف الثاني الإعدادي",
    nameEn: "Grade 8 (2nd Prep)",
    stage: "PREPARATORY" as const,
    order: 8,
    code: "PREP_2",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "العلوم", nameEn: "Science", icon: "🔬", isLanguageTrack: false },
      { name: "Science", nameEn: "Science (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الدراسات الاجتماعية", nameEn: "Social Studies", icon: "🌍", isLanguageTrack: false },
    ]
  },
  {
    name: "الصف الثالث الإعدادي",
    nameEn: "Grade 9 (3rd Prep / الشهادة الإعدادية)",
    stage: "PREPARATORY" as const,
    order: 9,
    code: "PREP_3",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "العلوم", nameEn: "Science", icon: "🔬", isLanguageTrack: false },
      { name: "Science", nameEn: "Science (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الدراسات الاجتماعية", nameEn: "Social Studies", icon: "🌍", isLanguageTrack: false },
    ]
  },

  // --- الثانوية (SECONDARY) ---
  {
    name: "الصف الأول الثانوي",
    nameEn: "Grade 10 (1st Secondary)",
    stage: "SECONDARY" as const,
    order: 10,
    code: "SEC_1",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "التاريخ", nameEn: "History", icon: "🏛️", isLanguageTrack: false },
      { name: "الفلسفة والمنطق", nameEn: "Philosophy & Logic", icon: "💭", isLanguageTrack: false },
      { name: "العلوم المتكاملة", nameEn: "Integrated Science", icon: "🔬", isLanguageTrack: false },
      { name: "Integrated Science", nameEn: "Integrated Science (EN)", icon: "🧪", isLanguageTrack: true },
    ]
  },
  {
    name: "الصف الثاني الثانوي",
    nameEn: "Grade 11 (2nd Secondary)",
    stage: "SECONDARY" as const,
    order: 11,
    code: "SEC_2",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "الرياضيات", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "الفيزياء", nameEn: "Physics", icon: "⚡", isLanguageTrack: false },
      { name: "Physics", nameEn: "Physics (EN)", icon: "⚡", isLanguageTrack: true },
      { name: "الكيمياء", nameEn: "Chemistry", icon: "🧪", isLanguageTrack: false },
      { name: "Chemistry", nameEn: "Chemistry (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الأحياء", nameEn: "Biology", icon: "🧬", isLanguageTrack: false },
      { name: "Biology", nameEn: "Biology (EN)", icon: "🧬", isLanguageTrack: true },
      { name: "التاريخ", nameEn: "History", icon: "🏛️", isLanguageTrack: false },
      { name: "علم النفس", nameEn: "Psychology", icon: "🧠", isLanguageTrack: false },
      { name: "البرمجة (Programming)", nameEn: "Programming", icon: "💻", isLanguageTrack: false },
    ]
  },
  {
    name: "الصف الثالث الثانوي (الثانوية العامة)",
    nameEn: "Grade 12 (3rd Secondary / Thanawya Amma)",
    stage: "SECONDARY" as const,
    order: 12,
    code: "SEC_3",
    subjects: [
      { name: "اللغة العربية", nameEn: "Arabic", icon: "📖", isLanguageTrack: false },
      { name: "English", nameEn: "English", icon: "🔤", isLanguageTrack: false },
      { name: "الرياضيات (البحتة والتطبيقية)", nameEn: "Mathematics", icon: "📐", isLanguageTrack: false },
      { name: "Mathematics", nameEn: "Mathematics (EN)", icon: "🔢", isLanguageTrack: true },
      { name: "الفيزياء", nameEn: "Physics", icon: "⚡", isLanguageTrack: false },
      { name: "Physics", nameEn: "Physics (EN)", icon: "⚡", isLanguageTrack: true },
      { name: "الكيمياء", nameEn: "Chemistry", icon: "🧪", isLanguageTrack: false },
      { name: "Chemistry", nameEn: "Chemistry (EN)", icon: "🧪", isLanguageTrack: true },
      { name: "الأحياء", nameEn: "Biology", icon: "🧬", isLanguageTrack: false },
      { name: "Biology", nameEn: "Biology (EN)", icon: "🧬", isLanguageTrack: true },
      { name: "التاريخ", nameEn: "History", icon: "🏛️", isLanguageTrack: false },
      { name: "الجغرافيا", nameEn: "Geography", icon: "🗺️", isLanguageTrack: false },
      { name: "الإحصاء", nameEn: "Statistics", icon: "📊", isLanguageTrack: false },
    ]
  }
];

export class CurriculumController {
  // Automatically seeds Grade, Subject, and sample CourseGroups if they don't exist yet
  static async seedEgyptianCurriculum(): Promise<void> {
    try {
      const gradeRepo = AppDataSource.getRepository(Grade);
      const subjectRepo = AppDataSource.getRepository(Subject);
      const userRepo = AppDataSource.getRepository("User");
      const courseRepo = AppDataSource.getRepository(Course);
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const count = await gradeRepo.count();
      if (count === 0) {
        console.log("🌱 Seeding Egyptian Curriculum stages, grades, and subjects from Nagwa...");

        for (const item of EGYPTIAN_CURRICULUM_DATA) {
          let grade = new Grade();
          grade.name = item.name;
          grade.nameEn = item.nameEn;
          grade.stage = item.stage;
          grade.order = item.order;
          grade.code = item.code;
          grade = await gradeRepo.save(grade);

          for (const sub of item.subjects) {
            const subject = new Subject();
            subject.name = sub.name;
            subject.nameEn = sub.nameEn;
            subject.icon = sub.icon;
            subject.stage = item.stage;
            subject.isLanguageTrack = sub.isLanguageTrack;
            subject.grade = grade;
            await subjectRepo.save(subject);
          }
        }
        console.log("✅ Egyptian Curriculum successfully seeded!");
      }
    } catch (err: any) {
      console.error("⚠️ Failed to seed Egyptian Curriculum:", err.message || err);
    }
  }

  // GET /curriculum/grades
  static async getGrades(req: Request, res: Response) {
    try {
      const gradeRepo = AppDataSource.getRepository(Grade);
      const stage = req.query.stage as string;

      const queryBuilder = gradeRepo.createQueryBuilder("grade")
        .leftJoinAndSelect("grade.subjects", "subject")
        .orderBy("grade.order", "ASC")
        .addOrderBy("subject.name", "ASC");

      if (stage) {
        queryBuilder.where("grade.stage = :stage", { stage: stage.toUpperCase() });
      }

      const grades = await queryBuilder.getMany();
      return res.status(200).json(grades);
    } catch (err: any) {
      console.error("Error in getGrades:", err);
      return res.status(500).json({ error: "Failed to fetch grades." });
    }
  }

  // GET /curriculum/subjects
  static async getSubjects(req: Request, res: Response) {
    try {
      const subjectRepo = AppDataSource.getRepository(Subject);
      const { gradeId, stage } = req.query;

      const whereClause: any = {};
      if (gradeId) whereClause.grade = { id: String(gradeId) };
      if (stage) whereClause.stage = String(stage).toUpperCase();

      const subjects = await subjectRepo.find({
        where: whereClause,
        relations: ["grade"],
        order: { name: "ASC" }
      });

      return res.status(200).json(subjects);
    } catch (err: any) {
      console.error("Error in getSubjects:", err);
      return res.status(500).json({ error: "Failed to fetch subjects." });
    }
  }

  // GET /landing/explore
  // High-performance landing page explorer
  static async getLandingExplore(req: Request, res: Response) {
    try {
      const { stage, gradeId, subjectId } = req.query;

      const courseRepo = AppDataSource.getRepository(Course);
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      // Build course query
      const qb = courseRepo.createQueryBuilder("course")
        .leftJoinAndSelect("course.teacher", "teacher")
        .leftJoinAndSelect("course.grade", "grade")
        .leftJoinAndSelect("course.subject", "subject")
        .leftJoinAndSelect("course.groups", "groups")
        .leftJoinAndSelect("groups.teacher", "groupTeacher")
        .where("course.status = :status", { status: "PUBLISHED" });

      if (subjectId) {
        qb.andWhere("course.subject.id = :subjectId", { subjectId: String(subjectId) });
      } else if (gradeId) {
        qb.andWhere("course.grade.id = :gradeId", { gradeId: String(gradeId) });
      } else if (stage) {
        qb.andWhere("(course.grade.stage = :stage OR course.degree = :stage)", { stage: String(stage).toUpperCase() });
      }

      qb.orderBy("course.createdAt", "DESC");
      const courses = await qb.getMany();

      // For all courses, calculate live group occupancy
      const resultCourses = await Promise.all(
        courses.map(async (course) => {
          const groups = course.groups || [];
          
          const groupsWithOccupancy = await Promise.all(
            groups.map(async (group) => {
              // Count active or pending enrollments in this group
              const enrolledCount = await enrollmentRepo.count({
                where: {
                  group: { id: group.id },
                  status: "active"
                }
              });

              const pendingCount = await enrollmentRepo.count({
                where: {
                  group: { id: group.id },
                  status: "pending"
                }
              });

              const totalOccupied = enrolledCount + pendingCount;
              const maxSeats = group.maxStudents || 20;
              const availableSeats = Math.max(0, maxSeats - totalOccupied);
              const isFull = totalOccupied >= maxSeats;

              return {
                id: group.id,
                name: group.name,
                scheduleDays: group.scheduleDays,
                scheduleTime: group.scheduleTime,
                scheduleText: group.scheduleText || `${group.scheduleDays || "أسبوعياً"} ${group.scheduleTime || ""}`,
                maxStudents: maxSeats,
                enrolledCount: totalOccupied,
                availableSeats: availableSeats,
                isFull: isFull,
                status: isFull ? "FULL" : group.status || "OPEN",
                meetingLink: group.meetingLink
              };
            })
          );

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            category: course.category,
            image: course.image,
            price: course.price,
            isFree: course.isFree,
            currency: course.currency || "EGP",
            teacher: course.teacher ? {
              id: course.teacher.id,
              name: course.teacher.name,
              avatar: course.teacher.avatar,
              location: course.teacher.location,
              hourlyRate: course.teacher.hourlyRate
            } : null,
            grade: course.grade ? {
              id: course.grade.id,
              name: course.grade.name,
              stage: course.grade.stage
            } : null,
            subject: course.subject ? {
              id: course.subject.id,
              name: course.subject.name,
              icon: course.subject.icon
            } : null,
            groups: groupsWithOccupancy
          };
        })
      );

      return res.status(200).json({
        totalCourses: resultCourses.length,
        courses: resultCourses
      });
    } catch (err: any) {
      console.error("Error in getLandingExplore:", err);
      return res.status(500).json({ error: "Failed to explore courses and groups." });
    }
  }

  // GET /curriculum/subjects/:subjectId/groups
  // Returns groups for a specific subject with day filters matching the Nagwa design
  static async getSubjectGroups(req: Request, res: Response) {
    try {
      const { subjectId } = req.params;
      const { days } = req.query; // comma-separated or single day string e.g. "الأحد,الثلاثاء"

      const subjectRepo = AppDataSource.getRepository(Subject);
      const courseRepo = AppDataSource.getRepository(Course);
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      const subject = await subjectRepo.findOne({
        where: { id: subjectId },
        relations: ["grade"]
      });

      if (!subject) {
        return res.status(404).json({ error: "المادة الدراسية غير موجودة." });
      }

      // Fetch all published courses for this subject
      const courses = await courseRepo.find({
        where: {
          subject: { id: subjectId },
          status: "PUBLISHED"
        },
        relations: ["teacher", "groups", "groups.teacher", "grade", "subject"]
      });

      const selectedDays = days
        ? String(days).split(",").map(d => d.trim().toLowerCase()).filter(Boolean)
        : [];

      const groupCards: any[] = [];

      for (const course of courses) {
        const groups = course.groups || [];
        for (const group of groups) {
          // Skip groups pending admin approval or rejected
          if (group.status === "PENDING_APPROVAL" || group.status === "REJECTED") {
            continue;
          }

          // If days filter is active, check match
          if (selectedDays.length > 0) {
            const groupScheduleStr = `${group.scheduleDays || ""} ${group.scheduleText || ""} ${group.name || ""}`.toLowerCase();
            const matchesDay = selectedDays.some(day => groupScheduleStr.includes(day));
            if (!matchesDay) continue;
          }

          const enrolledCount = await enrollmentRepo.count({
            where: {
              group: { id: group.id },
              status: "active"
            }
          });

          const pendingCount = await enrollmentRepo.count({
            where: {
              group: { id: group.id },
              status: "pending"
            }
          });

          const totalOccupied = enrolledCount + pendingCount;
          const maxSeats = group.maxStudents || 25;
          const availableSeats = Math.max(0, maxSeats - totalOccupied);
          const isFull = totalOccupied >= maxSeats;

          const teacher = group.teacher || course.teacher;

          const groupPrice = group.monthlyPrice || course.price || 320;
          const sessionPrice = group.sessionPrice || (groupPrice > 0 ? Math.round(groupPrice / 8) : 40);

          groupCards.push({
            groupId: group.id,
            groupName: group.name,
            courseId: course.id,
            courseTitle: course.title,
            price: groupPrice,
            isFree: course.isFree,
            currency: course.currency || "ج.م.",
            startDate: group.startDate || "2026-09-13",
            endDate: group.endDate || "2026-12-02",
            totalSessions: group.totalSessions || 24,
            sessionDuration: group.sessionDuration || 60,
            sessionPrice: sessionPrice,
            studentHourlyRate: group.studentHourlyRate || sessionPrice,
            teacherHourlyRate: group.teacherHourlyRate || 100,
            billingCycle: group.billingCycle || "شهريًّا",
            monthlyPrice: groupPrice,
            platformCommissionPercent: group.platformCommissionPercent || 50,
            teacher: teacher ? {
              id: teacher.id,
              name: teacher.name,
              avatar: teacher.avatar || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80",
              rating: 91,
              ratingCount: 2763
            } : {
              id: null,
              name: "مدرس المنصة المعتمد",
              avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80",
              rating: 95,
              ratingCount: 1540
            },
            scheduleText: group.scheduleText || `${group.scheduleDays || "الأحد والثلاثاء"} الساعة ${group.scheduleTime || "6:00م"}`,
            scheduleDays: group.scheduleDays,
            scheduleTime: group.scheduleTime,
            maxStudents: maxSeats,
            enrolledCount: totalOccupied,
            availableSeats: availableSeats,
            isFull: isFull,
            status: isFull ? "FULL" : group.status || "OPEN"
          });
        }
      }

      // If no custom course groups exist yet for this subject, provide default curriculum teacher groups
      if (groupCards.length === 0 && (!days || selectedDays.length === 0)) {
        const sampleTeachers = [
          { name: "أمنية خالد", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80", rating: 91, ratingCount: 2763, scheduleText: "الأحد والثلاثاء الساعة 6:00م", scheduleDays: "الأحد، الثلاثاء", price: 320, sessionPrice: 40, maxSeats: 25, enrolled: 12 },
          { name: "شيماء كمال", avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80", rating: 94, ratingCount: 3120, scheduleText: "الأحد والثلاثاء الساعة 6:00م", scheduleDays: "الأحد، الثلاثاء", price: 320, sessionPrice: 40, maxSeats: 25, enrolled: 18 },
          { name: "أحمد سامي", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80", rating: 96, ratingCount: 1890, scheduleText: "السبت والأربعاء الساعة 7:30م", scheduleDays: "السبت، الأربعاء", price: 350, sessionPrice: 45, maxSeats: 30, enrolled: 22 },
          { name: "سارة حسني", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80", rating: 93, ratingCount: 2450, scheduleText: "الاثنين والخميس الساعة 5:00م", scheduleDays: "الاثنين، الخميس", price: 300, sessionPrice: 38, maxSeats: 20, enrolled: 9 }
        ];

        for (let i = 0; i < sampleTeachers.length; i++) {
          const t = sampleTeachers[i];
          const available = Math.max(0, t.maxSeats - t.enrolled);
          groupCards.push({
            groupId: `sample-group-${subject.id}-${i + 1}`,
            groupName: `مجموعة ${t.scheduleDays} - إشراف ${t.name}`,
            courseId: courses[0]?.id || `demo-course-${subject.id}`,
            courseTitle: `شرح ومراجعة ${subject.name} - ${subject.grade?.name || ""}`,
            price: t.price,
            isFree: false,
            currency: "ج.م.",
            startDate: "2026-09-13",
            endDate: "2026-12-02",
            totalSessions: 24,
            sessionDuration: 60,
            sessionPrice: t.sessionPrice || 40,
            billingCycle: "شهريًّا",
            monthlyPrice: t.price,
            platformCommissionPercent: 50,
            teacher: {
              id: `teacher-${i + 1}`,
              name: t.name,
              avatar: t.avatar,
              rating: t.rating,
              ratingCount: t.ratingCount
            },
            scheduleText: t.scheduleText,
            scheduleDays: t.scheduleDays,
            scheduleTime: "6:00م",
            maxStudents: t.maxSeats,
            enrolledCount: t.enrolled,
            availableSeats: available,
            isFull: available <= 0,
            status: "OPEN"
          });
        }
      } else if (groupCards.length === 0 && selectedDays.length > 0) {
        // Filter sample teachers by selected days if no DB groups matched
        const sampleTeachers = [
          { name: "أمنية خالد", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80", rating: 91, ratingCount: 2763, scheduleText: "الأحد والثلاثاء الساعة 6:00م", scheduleDays: "الأحد، الثلاثاء", price: 320, sessionPrice: 40, maxSeats: 25, enrolled: 12 },
          { name: "شيماء كمال", avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80", rating: 94, ratingCount: 3120, scheduleText: "الأحد والثلاثاء الساعة 6:00م", scheduleDays: "الأحد، الثلاثاء", price: 320, sessionPrice: 40, maxSeats: 25, enrolled: 18 },
          { name: "أحمد سامي", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80", rating: 96, ratingCount: 1890, scheduleText: "السبت والأربعاء الساعة 7:30م", scheduleDays: "السبت، الأربعاء", price: 350, sessionPrice: 45, maxSeats: 30, enrolled: 22 },
          { name: "سارة حسني", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80", rating: 93, ratingCount: 2450, scheduleText: "الاثنين والخميس الساعة 5:00م", scheduleDays: "الاثنين، الخميس", price: 300, sessionPrice: 38, maxSeats: 20, enrolled: 9 }
        ];

        sampleTeachers.forEach((t, i) => {
          const groupScheduleStr = `${t.scheduleDays} ${t.scheduleText}`.toLowerCase();
          const matches = selectedDays.some(day => groupScheduleStr.includes(day));
          if (matches) {
            const available = Math.max(0, t.maxSeats - t.enrolled);
            groupCards.push({
              groupId: `sample-group-${subject.id}-${i + 1}`,
              groupName: `مجموعة ${t.scheduleDays} - إشراف ${t.name}`,
              courseId: courses[0]?.id || `demo-course-${subject.id}`,
              courseTitle: `شرح ومراجعة ${subject.name} - ${subject.grade?.name || ""}`,
              price: t.price,
              isFree: false,
              currency: "ج.م.",
              startDate: "2026-09-13",
              endDate: "2026-12-02",
              totalSessions: 24,
              sessionDuration: 60,
              sessionPrice: t.sessionPrice || 40,
              billingCycle: "شهريًّا",
              monthlyPrice: t.price,
              platformCommissionPercent: 50,
              teacher: {
                id: `teacher-${i + 1}`,
                name: t.name,
                avatar: t.avatar,
                rating: t.rating,
                ratingCount: t.ratingCount
              },
              scheduleText: t.scheduleText,
              scheduleDays: t.scheduleDays,
              scheduleTime: "6:00م",
              maxStudents: t.maxSeats,
              enrolledCount: t.enrolled,
              availableSeats: available,
              isFull: available <= 0,
              status: "OPEN"
            });
          }
        });
      }

      return res.status(200).json({
        subject: {
          id: subject.id,
          name: subject.name,
          nameEn: subject.nameEn,
          icon: subject.icon || "📖",
          stage: subject.stage,
          gradeName: subject.grade?.name || "المرحلة الدراسية",
          subtitle: `${subject.grade?.name || ""} • الفصل الدراسي الأول • المنهج الدراسي`
        },
        totalGroups: groupCards.length,
        groups: groupCards
      });
    } catch (err: any) {
      console.error("Error in getSubjectGroups:", err);
      return res.status(500).json({ error: "Failed to fetch subject groups." });
    }
  }
}
