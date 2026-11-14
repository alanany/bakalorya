import { Request, Response } from "express";
import { In, IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { Grade } from "../entity/Grade";
import { Subject } from "../entity/Subject";
import { Course } from "../entity/Course";
import { CourseGroup } from "../entity/CourseGroup";
import { Enrollment } from "../entity/Enrollment";
import { ClassPackage } from "../entity/ClassPackage";
import { User } from "../entity/User";
import { Payment } from "../entity/Payment";
import { NotificationController } from "./NotificationController";
import { AuthRequest } from "../middleware/auth";

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
        .leftJoinAndSelect("grade.subjects", "subject", "subject.isActive = :active", { active: true })
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

      const whereClause: any = { isActive: true };
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

  // GET /admin/curriculum/grades — returns all grades with ALL subjects (including hidden) for admin
  static async getAdminGrades(req: Request, res: Response) {
    try {
      const gradeRepo = AppDataSource.getRepository(Grade);
      const stage = req.query.stage as string;

      const queryBuilder = gradeRepo.createQueryBuilder("grade")
        .leftJoinAndSelect("grade.subjects", "subject")
        .leftJoinAndSelect("grade.classPackages", "classPackage")
        .leftJoinAndSelect("classPackage.linkedGroups", "classGroup")
        .leftJoinAndSelect("classGroup.teacher", "groupTeacher")
        .leftJoinAndSelect("classGroup.course", "groupCourse")
        .leftJoinAndSelect("groupCourse.subject", "courseSubject")
        .orderBy("grade.order", "ASC")
        .addOrderBy("subject.name", "ASC")
        .addOrderBy("classPackage.order", "ASC");

      if (stage) {
        queryBuilder.where("grade.stage = :stage", { stage: stage.toUpperCase() });
      }

      const grades = await queryBuilder.getMany();
      return res.status(200).json(grades);
    } catch (err: any) {
      console.error("Error in getAdminGrades:", err);
      return res.status(500).json({ error: "Failed to fetch grades." });
    }
  }

  // POST /admin/curriculum/grades — create a new grade
  static async createGrade(req: Request, res: Response) {
    try {
      const gradeRepo = AppDataSource.getRepository(Grade);
      const { name, nameEn, stage, order, code } = req.body;

      if (!name || !stage) {
        return res.status(400).json({ error: "name and stage are required." });
      }

      const grade = new Grade();
      grade.name = name;
      grade.nameEn = nameEn || "";
      grade.stage = stage;
      grade.order = order || 0;
      grade.code = code || "";

      const saved = await gradeRepo.save(grade);
      return res.status(201).json(saved);
    } catch (err: any) {
      console.error("Error in createGrade:", err);
      return res.status(500).json({ error: "Failed to create grade." });
    }
  }

  // POST /admin/curriculum/grades/:gradeId/subjects — add a subject to a grade
  static async createSubject(req: Request, res: Response) {
    try {
      const subjectRepo = AppDataSource.getRepository(Subject);
      const gradeRepo = AppDataSource.getRepository(Grade);
      const { gradeId } = req.params;
      const { name, nameEn, icon, isLanguageTrack } = req.body;

      if (!name) {
        return res.status(400).json({ error: "name is required." });
      }

      const grade = await gradeRepo.findOneBy({ id: gradeId });
      if (!grade) {
        return res.status(404).json({ error: "Grade not found." });
      }

      const subject = new Subject();
      subject.name = name;
      subject.nameEn = nameEn || "";
      subject.icon = icon || "📖";
      subject.isLanguageTrack = !!isLanguageTrack;
      subject.isActive = true;
      subject.stage = grade.stage;
      subject.grade = grade;

      const saved = await subjectRepo.save(subject);
      return res.status(201).json(saved);
    } catch (err: any) {
      console.error("Error in createSubject:", err);
      return res.status(500).json({ error: "Failed to create subject." });
    }
  }

  // PUT /admin/curriculum/subjects/:id — update subject details
  static async updateSubject(req: Request, res: Response) {
    try {
      const subjectRepo = AppDataSource.getRepository(Subject);
      const { id } = req.params;
      const { name, nameEn, icon, isLanguageTrack, isActive } = req.body;

      const subject = await subjectRepo.findOne({ where: { id }, relations: ["grade"] });
      if (!subject) {
        return res.status(404).json({ error: "Subject not found." });
      }

      if (name !== undefined) subject.name = name;
      if (nameEn !== undefined) subject.nameEn = nameEn;
      if (icon !== undefined) subject.icon = icon;
      if (isLanguageTrack !== undefined) subject.isLanguageTrack = !!isLanguageTrack;
      if (isActive !== undefined) subject.isActive = !!isActive;

      const saved = await subjectRepo.save(subject);
      return res.status(200).json(saved);
    } catch (err: any) {
      console.error("Error in updateSubject:", err);
      return res.status(500).json({ error: "Failed to update subject." });
    }
  }

  // PATCH /admin/curriculum/subjects/:id/toggle — toggle isActive
  static async toggleSubjectVisibility(req: Request, res: Response) {
    try {
      const subjectRepo = AppDataSource.getRepository(Subject);
      const { id } = req.params;

      const subject = await subjectRepo.findOne({ where: { id }, relations: ["grade"] });
      if (!subject) {
        return res.status(404).json({ error: "Subject not found." });
      }

      subject.isActive = !subject.isActive;
      const saved = await subjectRepo.save(subject);
      return res.status(200).json({ id: saved.id, isActive: saved.isActive, message: saved.isActive ? "تم إظهار المادة بنجاح" : "تم إخفاء المادة بنجاح" });
    } catch (err: any) {
      console.error("Error in toggleSubjectVisibility:", err);
      return res.status(500).json({ error: "Failed to toggle subject visibility." });
    }
  }

  // DELETE /admin/curriculum/subjects/:id — delete a subject (only if no courses attached)
  static async deleteSubject(req: Request, res: Response) {
    try {
      const subjectRepo = AppDataSource.getRepository(Subject);
      const courseRepo = AppDataSource.getRepository(Course);
      const { id } = req.params;

      const subject = await subjectRepo.findOneBy({ id });
      if (!subject) {
        return res.status(404).json({ error: "Subject not found." });
      }

      const courseCount = await courseRepo.count({ where: { subject: { id } } });
      if (courseCount > 0) {
        return res.status(409).json({ error: `لا يمكن حذف هذه المادة لأنها مرتبطة بـ ${courseCount} دورة/دورات. يمكنك إخفاؤها بدلاً من الحذف.` });
      }

      await subjectRepo.remove(subject);
      return res.status(200).json({ message: "تم حذف المادة بنجاح." });
    } catch (err: any) {
      console.error("Error in deleteSubject:", err);
      return res.status(500).json({ error: "Failed to delete subject." });
    }
  }

  // DELETE /admin/curriculum/grades/:id — delete a grade (only if no subjects and no courses attached)
  static async deleteGrade(req: Request, res: Response) {
    try {
      const gradeRepo = AppDataSource.getRepository(Grade);
      const courseRepo = AppDataSource.getRepository(Course);
      const { id } = req.params;

      const grade = await gradeRepo.findOne({ where: { id }, relations: ["subjects"] });
      if (!grade) {
        return res.status(404).json({ error: "Grade not found." });
      }

      const courseCount = await courseRepo.count({ where: { grade: { id } } });
      if (courseCount > 0) {
        return res.status(409).json({ error: `لا يمكن حذف هذا الصف لأنه مرتبط بـ ${courseCount} دورة/دورات.` });
      }

      if (grade.subjects && grade.subjects.length > 0) {
        return res.status(409).json({ error: `لا يمكن حذف هذا الصف لأنه يحتوي على ${grade.subjects.length} مادة/مواد. احذف المواد أولاً.` });
      }

      await gradeRepo.remove(grade);
      return res.status(200).json({ message: "تم حذف الصف الدراسي بنجاح." });
    } catch (err: any) {
      console.error("Error in deleteGrade:", err);
      return res.status(500).json({ error: "Failed to delete grade." });
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
        .where("course.status = :status", { status: "PUBLISHED" })
        .andWhere("(teacher.id IS NULL OR teacher.status = 'ACTIVE')")
        .andWhere("(subject.id IS NULL OR subject.isActive = true)");

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
      const groupRepo = AppDataSource.getRepository(CourseGroup);
      const gradeRepo = AppDataSource.getRepository(Grade);

      let subject: any = null;
      let requestedCourse: Course | null = null;

      // 1. Try finding Subject by ID if provided and not literal "undefined"/"null"
      if (subjectId && subjectId !== "undefined" && subjectId !== "null") {
        subject = await subjectRepo.findOne({
          where: { id: subjectId },
          relations: ["grade"]
        });

        // Block access to hidden subjects
        if (subject && subject.isActive === false) {
          return res.status(404).json({ error: "هذه المادة غير متاحة حالياً." });
        }

        // 2. If subject not found, try finding Course by that ID
        if (!subject) {
          requestedCourse = await courseRepo.findOne({
            where: { id: subjectId },
            relations: ["subject", "grade", "teacher", "lessons"]
          });

          if (requestedCourse) {
            if (requestedCourse.subject) {
              subject = await subjectRepo.findOne({
                where: { id: requestedCourse.subject.id },
                relations: ["grade"]
              });
            }
            if (!subject) {
              subject = {
                id: requestedCourse.id,
                name: requestedCourse.category || requestedCourse.title || "المقرر الدراسي",
                nameEn: requestedCourse.title || "Course",
                icon: "📚",
                stage: requestedCourse.grade?.stage || "PRIMARY",
                grade: requestedCourse.grade || null
              };
            }
          }
        }
      }

      // 3. Fallback: If still no subject, pick the first available subject or course
      if (!subject) {
        subject = await subjectRepo.findOne({
          where: {},
          relations: ["grade"]
        });

        if (!subject) {
          requestedCourse = await courseRepo.findOne({
            where: { status: "PUBLISHED" },
            relations: ["subject", "grade", "teacher", "lessons"]
          });
          if (requestedCourse) {
            subject = {
              id: requestedCourse.id,
              name: requestedCourse.category || requestedCourse.title || "المقرر الدراسي",
              nameEn: requestedCourse.title || "Course",
              icon: "📚",
              stage: requestedCourse.grade?.stage || "PRIMARY",
              grade: requestedCourse.grade || null
            };
          }
        }
      }

      // 4. Absolute fallback if database has no subjects or courses yet
      if (!subject) {
        subject = {
          id: "default",
          name: "المقرر الدراسي",
          nameEn: "Course",
          icon: "📚",
          stage: "PRIMARY",
          grade: null
        };
      }

      const safeStr = (s: any) => String(s || "").trim().toLowerCase();
      const subName = safeStr(subject.name);
      const subNameEn = safeStr(subject.nameEn);
      const subCat = safeStr(subject.category);
      const subGradeId = subject.grade?.id;
      const subStage = subject.stage || subject.grade?.stage || "PRIMARY";

      // 5. Fetch published courses matching this subject and grade (only with active subjects)
      let allCourses: Course[] = [];
      try {
        allCourses = await courseRepo.find({
          where: { status: "PUBLISHED" },
          relations: ["teacher", "grade", "subject", "lessons"]
        });
        // Filter out courses whose subject is hidden
        allCourses = allCourses.filter(c => !c.subject || c.subject.isActive !== false);
      } catch (e) {
        allCourses = [];
      }

      let matchingCourses = allCourses.filter(c => {
        const cId = c.id;
        const cSubId = c.subject?.id;
        const cGradeId = c.grade?.id;
        const cCat = safeStr(c.category);
        const cTitle = safeStr(c.title);
        const cSubName = safeStr(c.subject?.name);

        const matchesCourseId = !!(requestedCourse && cId === requestedCourse.id);
        const matchesSubId = !!((subject.id && cSubId === subject.id) || (subjectId && cSubId === subjectId));
        const matchesCat = !!(
          (subName && (cCat.includes(subName) || subName.includes(cCat))) ||
          (subNameEn && (cCat.includes(subNameEn) || subNameEn.includes(cCat))) ||
          (subCat && (cCat.includes(subCat) || subCat.includes(cCat))) ||
          (cTitle && subName && (cTitle.includes(subName) || subName.includes(cTitle)))
        );

        if (matchesCourseId) return true;
        if (matchesSubId) return true;
        if (subGradeId && cGradeId) {
          return cGradeId === subGradeId && (matchesCat || (cSubName && subName && cSubName === subName));
        }
        return matchesCat && (c.grade?.stage === subStage || !c.grade?.stage);
      });

      // If no matching courses found, only include requestedCourse if specifically requested
      if (matchingCourses.length === 0 && requestedCourse) {
        matchingCourses = [requestedCourse];
      }

      // Ensure requested course is first in the array
      if (requestedCourse) {
        const idx = matchingCourses.findIndex(c => c.id === requestedCourse!.id);
        if (idx > -1) {
          const [c] = matchingCourses.splice(idx, 1);
          matchingCourses.unshift(c);
        } else {
          matchingCourses.unshift(requestedCourse);
        }
      }

      const matchingCourseIds = matchingCourses.map(c => c.id).filter(Boolean);

      // 6. Fetch groups for matching courses
      let groups: CourseGroup[] = [];
      try {
        if (matchingCourseIds.length > 0) {
          groups = await groupRepo.find({
            where: matchingCourseIds.map(cid => ({ course: { id: cid } })),
            relations: ["course", "course.grade", "course.teacher", "teacher"]
          });
        } else {
          groups = [];
        }
      } catch (e) {
        console.warn("Could not query groups by course ids:", e);
        groups = [];
      }

      // 7. Fetch available grades in this stage for filtering
      let stageGrades: Grade[] = [];
      try {
        if (subStage) {
          stageGrades = await gradeRepo.find({
            where: { stage: subStage as any },
            order: { order: "ASC" }
          });
        }
      } catch (e) {
        stageGrades = [];
      }
      if (stageGrades.length === 0 && subject.grade) {
        stageGrades = [subject.grade];
      }

      const selectedDays = days
        ? String(days).split(",").map(d => d.trim().toLowerCase()).filter(Boolean)
        : [];

      const groupCards: any[] = [];

      for (const group of groups) {
        if (!group.course) continue;
        // Only published courses are visible publicly
        if (group.course.status && group.course.status !== "PUBLISHED") {
          continue;
        }

        // Verify teacher is active if course has a teacher
        const courseTeacher = group.course.teacher || group.teacher;
        if (courseTeacher && courseTeacher.status && courseTeacher.status !== "ACTIVE") {
          continue;
        }

        // Only show approved groups (OPEN or FULL) to students - skip pending, rejected, or closed
        if (group.status === "PENDING_APPROVAL" || group.status === "REJECTED" || group.status === "CLOSED") {
          continue;
        }

        // If days filter is active, check match
        if (selectedDays.length > 0) {
          const groupScheduleStr = `${group.scheduleDays || ""} ${group.scheduleText || ""} ${group.name || ""}`.toLowerCase();
          const matchesDay = selectedDays.some(day => groupScheduleStr.includes(day));
          if (!matchesDay) continue;
        }

        let enrolledCount = 0;
        let pendingCount = 0;
        try {
          enrolledCount = await enrollmentRepo.count({
            where: {
              group: { id: group.id },
              status: "active"
            }
          });

          pendingCount = await enrollmentRepo.count({
            where: {
              group: { id: group.id },
              status: "pending"
            }
          });
        } catch (e) {
          enrolledCount = 0;
          pendingCount = 0;
        }

        const totalOccupied = enrolledCount + pendingCount;
        const maxSeats = group.maxStudents || 25;
        const availableSeats = Math.max(0, maxSeats - totalOccupied);
        const isFull = totalOccupied >= maxSeats;

        const teacher = group.teacher || group.course.teacher;

        const arabicDays = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
        const daysText = (group.scheduleDays || group.scheduleText || "");
        const matchedDays = arabicDays.filter(day => daysText.includes(day));
        const daysCount = matchedDays.length;

        let sessionsPerMonth = 8;
        if (group.totalSessions && group.totalSessions > 0 && group.totalSessions <= 8) {
          sessionsPerMonth = group.totalSessions;
        } else if (daysCount > 0) {
          sessionsPerMonth = group.totalSessions ? Math.min(group.totalSessions, daysCount * 4) : daysCount * 4;
        } else if (group.totalSessions && group.totalSessions > 0) {
          sessionsPerMonth = Math.min(group.totalSessions, 8);
        }

        const sessionPrice = group.sessionPrice || group.studentHourlyRate || (group.monthlyPrice > 0 ? Math.round(group.monthlyPrice / sessionsPerMonth) : 40);

        let groupPrice = group.monthlyPrice;
        if (sessionPrice > 0 && (!groupPrice || (groupPrice === sessionPrice * 8 && sessionsPerMonth !== 8) || (group.totalSessions && group.totalSessions <= 8 && group.totalSessions !== 8 && groupPrice === sessionPrice * 8))) {
          groupPrice = sessionPrice * sessionsPerMonth;
          groupRepo.update(group.id, { monthlyPrice: groupPrice }).catch(() => {});
        } else if (!groupPrice) {
          groupPrice = group.course?.price || (sessionPrice * sessionsPerMonth);
        }

        groupCards.push({
          groupId: group.id,
          groupName: group.name,
          courseId: group.course.id,
          courseTitle: group.course.title,
          gradeId: group.course.grade?.id || subject.grade?.id || "",
          gradeName: group.course.grade?.name || subject.grade?.name || "الصف الدراسي",
          price: groupPrice,
          isFree: group.course.isFree,
          currency: group.course.currency || "ج.م.",
          startDate: group.startDate ? String(group.startDate) : null,
          endDate: group.endDate ? String(group.endDate) : null,
          totalSessions: group.totalSessions || 0,
          sessionDuration: group.sessionDuration || 60,
          sessionPrice: sessionPrice,
          studentHourlyRate: group.studentHourlyRate || sessionPrice,
          teacherHourlyRate: group.teacherHourlyRate || 0,
          billingCycle: group.billingCycle || "شهريًّا",
          monthlyPrice: groupPrice,
          platformCommissionPercent: group.platformCommissionPercent || 50,
          teacher: teacher ? {
            id: teacher.id,
            name: teacher.name,
            avatar: teacher.avatar || ""
          } : null,
          scheduleText: group.scheduleText || (group.scheduleDays ? `${group.scheduleDays} ${group.scheduleTime || ""}`.trim() : "حسب جدول المجموعة"),
          scheduleDays: group.scheduleDays || "",
          scheduleTime: group.scheduleTime || "",
          maxStudents: maxSeats,
          enrolledCount: totalOccupied,
          availableSeats: availableSeats,
          isFull: isFull,
          status: isFull ? "FULL" : group.status || "OPEN"
        });
      }

      const primaryCourse = requestedCourse || (matchingCourses.length > 0 ? matchingCourses[0] : null);

      return res.status(200).json({
        subject: {
          id: subject.id,
          name: subject.name || "المقرر الدراسي",
          nameEn: subject.nameEn || "Course",
          icon: subject.icon || "📖",
          stage: subStage,
          gradeId: subject.grade?.id || primaryCourse?.grade?.id || "",
          gradeName: subject.grade?.name || primaryCourse?.grade?.name || "المرحلة الدراسية",
          subtitle: `${subject.grade?.name || primaryCourse?.grade?.name || ""} • الفصل الدراسي الأول • المنهج الدراسي`,
          image: primaryCourse?.image || null,
          teacher: primaryCourse?.teacher ? {
            id: primaryCourse.teacher.id,
            name: primaryCourse.teacher.name,
            avatar: primaryCourse.teacher.avatar
          } : null
        },
        primaryCourse: primaryCourse ? {
          id: primaryCourse.id,
          title: primaryCourse.title,
          description: primaryCourse.description,
          image: primaryCourse.image,
          price: primaryCourse.price,
          currency: primaryCourse.currency || "ج.م.",
          gradeName: primaryCourse.grade?.name || subject.grade?.name || "",
          teacher: primaryCourse.teacher ? {
            id: primaryCourse.teacher.id,
            name: primaryCourse.teacher.name,
            avatar: primaryCourse.teacher.avatar
          } : null
        } : null,
        courses: matchingCourses.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          image: c.image,
          price: c.price,
          isFree: c.isFree,
          currency: c.currency || "ج.م.",
          category: c.category,
          gradeId: c.grade?.id,
          gradeName: c.grade?.name,
          lessonsCount: (c.lessons || []).length,
          teacher: c.teacher ? {
            id: c.teacher.id,
            name: c.teacher.name,
            avatar: c.teacher.avatar
          } : null
        })),
        availableGrades: stageGrades.filter(Boolean).map(g => ({
          id: g.id,
          name: g.name,
          stage: g.stage
        })),
        totalGroups: groupCards.length,
        groups: groupCards
      });
    } catch (err: any) {
      console.error("Error in getSubjectGroups:", err);
      return res.status(500).json({ error: "Failed to fetch subject groups: " + (err?.message || "") });
    }
  }

  // ============================================================
  // Class Packages (فصول وباقات الصفحة الرئيسية والصف)
  // ============================================================

  // GET /curriculum/classes — Public list of active class packages
  static async getClasses(req: Request, res: Response) {
    try {
      const { gradeId, stage } = req.query;
      const classRepo = AppDataSource.getRepository(ClassPackage);

      const baseWhere: any = {};
      if (gradeId) {
        baseWhere.grade = { id: String(gradeId) };
      }
      if (stage) {
        baseWhere.grade = { stage: String(stage).toUpperCase() as any };
      }

      // Return classes that are active (isActive = true or isActive IS NULL)
      const classes = await classRepo.find({
        where: [
          { ...baseWhere, isActive: true },
          { ...baseWhere, isActive: IsNull() }
        ],
        relations: [
          "grade",
          "grades",
          "linkedGroups",
          "linkedGroups.teacher",
          "linkedGroups.course",
          "linkedGroups.course.subject"
        ],
        order: { order: "ASC", createdAt: "ASC" }
      });
      return res.status(200).json(classes);
    } catch (err: any) {
      console.error("Error in getClasses:", err);
      return res.status(500).json({ error: "Failed to fetch classes." });
    }
  }

  // GET /curriculum/classes/:id — Public single class details
  static async getClassById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const classRepo = AppDataSource.getRepository(ClassPackage);

      const pkg = await classRepo.findOne({
        where: { id },
        relations: [
          "grade",
          "grades",
          "linkedGroups",
          "linkedGroups.teacher",
          "linkedGroups.course",
          "linkedGroups.course.subject",
          "linkedGroups.sessions"
        ]
      });

      if (!pkg) {
        return res.status(404).json({ error: "فصل/باقة غير موجودة." });
      }

      return res.status(200).json(pkg);
    } catch (err: any) {
      console.error("Error in getClassById:", err);
      return res.status(500).json({ error: "Failed to fetch class details." });
    }
  }

  // GET /admin/curriculum/classes — Admin list ALL packages across all grades
  static async getAllAdminClasses(req: Request, res: Response) {
    try {
      const classRepo = AppDataSource.getRepository(ClassPackage);
      const classes = await classRepo.find({
        relations: [
          "grade",
          "grades",
          "linkedGroups",
          "linkedGroups.teacher",
          "linkedGroups.course",
          "linkedGroups.course.subject"
        ],
        order: { order: "ASC", createdAt: "ASC" }
      });
      return res.status(200).json(classes);
    } catch (err: any) {
      console.error("Error in getAllAdminClasses:", err);
      return res.status(500).json({ error: "Failed to fetch all admin classes." });
    }
  }

  // GET /admin/curriculum/grades/:gradeId/classes — Admin list all packages for a grade
  static async getAdminClasses(req: Request, res: Response) {
    try {
      const { gradeId } = req.params;
      const classRepo = AppDataSource.getRepository(ClassPackage);

      const classes = await classRepo.createQueryBuilder("pkg")
        .leftJoinAndSelect("pkg.grade", "grade")
        .leftJoinAndSelect("pkg.grades", "grades")
        .leftJoinAndSelect("pkg.linkedGroups", "linkedGroups")
        .leftJoinAndSelect("linkedGroups.teacher", "teacher")
        .leftJoinAndSelect("linkedGroups.course", "course")
        .leftJoinAndSelect("course.subject", "subject")
        .where("grade.id = :gradeId OR grades.id = :gradeId", { gradeId })
        .orderBy("pkg.order", "ASC")
        .addOrderBy("pkg.createdAt", "ASC")
        .getMany();

      return res.status(200).json(classes);
    } catch (err: any) {
      console.error("Error in getAdminClasses:", err);
      return res.status(500).json({ error: "Failed to fetch admin classes." });
    }
  }

  // POST /admin/curriculum/grades/:gradeId/classes — Admin create class package
  static async createClassPackage(req: Request, res: Response) {
    try {
      const { gradeId } = req.params;
      const {
        name,
        badge,
        lessonsCount,
        theme,
        price,
        priceEg,
        description,
        features,
        subjects,
        weeklySchedule,
        linkedGroupId,
        groupIds,
        gradeIds,
        order,
        isActive
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "اسم الفصل أو الباقة مطلوب." });
      }

      const gradeRepo = AppDataSource.getRepository(Grade);
      let targetGrades: Grade[] = [];
      const idsToFetch = Array.isArray(gradeIds) && gradeIds.length > 0 
        ? gradeIds 
        : (gradeId ? [gradeId] : []);

      if (idsToFetch.length > 0) {
        targetGrades = await gradeRepo.find({
          where: { id: In(idsToFetch) }
        });
      }

      const grade = targetGrades[0] || (gradeId ? await gradeRepo.findOneBy({ id: gradeId }) : null);
      if (!grade) {
        return res.status(404).json({ error: "الصف الدراسي غير موجود." });
      }

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      let linkedGroups: CourseGroup[] = [];

      // Link multiple CourseGroups if groupIds provided
      if (Array.isArray(groupIds) && groupIds.length > 0) {
        linkedGroups = await groupRepo.find({
          where: { id: In(groupIds) },
          relations: ["teacher", "course", "course.subject"]
        });
      } else if (linkedGroupId) {
        const singleGroup = await groupRepo.findOne({
          where: { id: linkedGroupId },
          relations: ["teacher", "course", "course.subject"]
        });
        if (singleGroup) linkedGroups = [singleGroup];
      }

      const classRepo = AppDataSource.getRepository(ClassPackage);
      const pkg = new ClassPackage();
      pkg.name = name.trim();
      pkg.badge = badge?.trim() || null;
      pkg.theme = ["blue", "green", "purple", "amber"].includes(theme) ? theme : "blue";
      pkg.price = price?.trim() || null;
      pkg.priceEg = priceEg?.trim() || null;
      pkg.description = description?.trim() || null;
      pkg.features = Array.isArray(features) ? features : [];
      pkg.grade = grade;
      pkg.grades = targetGrades.length > 0 ? targetGrades : [grade];
      pkg.linkedGroups = linkedGroups;
      pkg.linkedGroup = linkedGroups[0] || null;
      pkg.order = Number(order) || 0;
      pkg.isActive = isActive !== undefined ? Boolean(isActive) : true;

      // Auto-derive subjects from linked groups if not provided
      if ((!subjects || !Array.isArray(subjects) || subjects.length === 0) && linkedGroups.length > 0) {
        pkg.subjects = linkedGroups.map(g => ({
          name: g.course?.subject?.name || g.name,
          icon: g.course?.subject?.icon || "📖",
          time: `${g.scheduleDays || ''} ${g.scheduleTime || ''}`.trim() || g.scheduleText || "مواعيد منتظمة",
          teacherName: g.teacher?.name || g.course?.teacher?.name || "معلم معتمد"
        }));
      } else {
        pkg.subjects = Array.isArray(subjects) ? subjects : [];
      }

      // Auto-calculate lessons count if not provided
      if (lessonsCount && lessonsCount.trim()) {
        pkg.lessonsCount = lessonsCount.trim();
      } else if (linkedGroups.length > 0) {
        const total = linkedGroups.reduce((sum, g) => sum + (g.totalSessions || 8), 0);
        pkg.lessonsCount = `عدد الحصص: ${total} حصة`;
      } else {
        pkg.lessonsCount = "عدد الحصص: 64 حصة";
      }

      pkg.weeklySchedule = Array.isArray(weeklySchedule) ? weeklySchedule : [];

      const saved = await classRepo.save(pkg);
      return res.status(201).json(saved);
    } catch (err: any) {
      console.error("Error in createClassPackage:", err);
      return res.status(500).json({ error: "Failed to create class package." });
    }
  }

  // PUT /admin/curriculum/classes/:id — Admin update class package
  static async updateClassPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const classRepo = AppDataSource.getRepository(ClassPackage);
      const pkg = await classRepo.findOne({
        where: { id },
        relations: ["grade", "grades", "linkedGroups", "linkedGroups.teacher", "linkedGroups.course"]
      });

      if (!pkg) {
        return res.status(404).json({ error: "الباقة غير موجودة." });
      }

      const {
        name,
        badge,
        lessonsCount,
        theme,
        price,
        priceEg,
        description,
        features,
        subjects,
        weeklySchedule,
        linkedGroupId,
        groupIds,
        gradeIds,
        order,
        isActive
      } = req.body;

      if (name !== undefined) pkg.name = name.trim();
      if (badge !== undefined) pkg.badge = badge ? badge.trim() : null;
      if (lessonsCount !== undefined) pkg.lessonsCount = lessonsCount.trim();
      if (theme !== undefined && ["blue", "green", "purple", "amber"].includes(theme)) pkg.theme = theme;
      if (price !== undefined) pkg.price = price ? price.trim() : null;
      if (priceEg !== undefined) pkg.priceEg = priceEg ? priceEg.trim() : null;
      if (description !== undefined) pkg.description = description ? description.trim() : null;
      if (features !== undefined && Array.isArray(features)) pkg.features = features;
      if (subjects !== undefined && Array.isArray(subjects)) pkg.subjects = subjects;
      if (weeklySchedule !== undefined && Array.isArray(weeklySchedule)) pkg.weeklySchedule = weeklySchedule;
      if (order !== undefined) pkg.order = Number(order);
      if (isActive !== undefined) pkg.isActive = Boolean(isActive);

      if (Array.isArray(gradeIds)) {
        const gradeRepo = AppDataSource.getRepository(Grade);
        if (gradeIds.length > 0) {
          const targetGrades = await gradeRepo.find({ where: { id: In(gradeIds) } });
          pkg.grades = targetGrades;
          if (targetGrades.length > 0) {
            pkg.grade = targetGrades[0];
          }
        }
      }

      const groupRepo = AppDataSource.getRepository(CourseGroup);
      if (Array.isArray(groupIds)) {
        if (groupIds.length > 0) {
          pkg.linkedGroups = await groupRepo.find({
            where: { id: In(groupIds) },
            relations: ["teacher", "course", "course.subject"]
          });
          pkg.linkedGroup = pkg.linkedGroups[0] || null;
        } else {
          pkg.linkedGroups = [];
          pkg.linkedGroup = null;
        }
      } else if (linkedGroupId !== undefined) {
        if (!linkedGroupId) {
          pkg.linkedGroup = null;
        } else {
          const grp = await groupRepo.findOne({
            where: { id: linkedGroupId },
            relations: ["teacher", "course", "course.subject"]
          });
          if (grp) {
            pkg.linkedGroup = grp;
            if (!pkg.linkedGroups || pkg.linkedGroups.length === 0) {
              pkg.linkedGroups = [grp];
            }
          }
        }
      }

      const updated = await classRepo.save(pkg);
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error("Error in updateClassPackage:", err);
      return res.status(500).json({ error: "Failed to update class package." });
    }
  }

  // DELETE /admin/curriculum/classes/:id — Admin delete class package
  static async deleteClassPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const classRepo = AppDataSource.getRepository(ClassPackage);
      const pkg = await classRepo.findOneBy({ id });

      if (!pkg) {
        return res.status(404).json({ error: "الباقة غير موجودة." });
      }

      await classRepo.remove(pkg);
      return res.status(200).json({ message: "تم حذف الباقة بنجاح." });
    } catch (err: any) {
      console.error("Error in deleteClassPackage:", err);
      return res.status(500).json({ error: "Failed to delete class package." });
    }
  }

  // PATCH /admin/curriculum/classes/:id/toggle — Admin toggle visibility
  static async toggleClassVisibility(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const classRepo = AppDataSource.getRepository(ClassPackage);
      const pkg = await classRepo.findOneBy({ id });

      if (!pkg) {
        return res.status(404).json({ error: "الباقة غير موجودة." });
      }

      pkg.isActive = !pkg.isActive;
      await classRepo.save(pkg);
      return res.status(200).json({ message: "تم تغيير حالة ظهور الباقة.", isActive: pkg.isActive });
    } catch (err: any) {
      console.error("Error in toggleClassVisibility:", err);
      return res.status(500).json({ error: "Failed to toggle visibility." });
    }
  }

  // POST /admin/curriculum/grades/:gradeId/classes/seed-defaults — Generate 3 preset packages
  static async seedDefaultClasses(req: Request, res: Response) {
    try {
      const { gradeId } = req.params;
      const gradeRepo = AppDataSource.getRepository(Grade);
      const grade = await gradeRepo.findOneBy({ id: gradeId });

      if (!grade) {
        return res.status(404).json({ error: "الصف الدراسي غير موجود." });
      }

      const classRepo = AppDataSource.getRepository(ClassPackage);
      const existing = await classRepo.count({ where: { grade: { id: gradeId } } });
      if (existing > 0 && req.query.force !== "true") {
        return res.status(400).json({ error: "هذا الصف يحتوي بالفعل على باقات مضافة." });
      }

      const isSec = grade.stage === "SECONDARY";
      const isMid = grade.stage === "PREPARATORY";

      const packagesData = [
        {
          name: "فصل المتفوقين (باقة مجمعة)",
          badge: "متاح للاشتراك",
          lessonsCount: "عدد الحصص: 64 حصة",
          theme: "blue" as const,
          price: isSec ? "800 ريال / شهرياً  •  800 جنيه / شهرياً" : (isMid ? "600 ريال / شهرياً  •  600 جنيه / شهرياً" : "500 ريال / شهرياً  •  500 جنيه / شهرياً"),
          priceEg: isSec ? "800 جنيه" : (isMid ? "600 جنيه" : "500 جنيه"),
          description: `باقة "فصل المتفوقين" هي الخيار الأقوى للطلاب الطامحين للمراكز الأولى، وتشمل جميع المواد المقررة ومتابعة أسبوعية واختبارات قياس مستوى دورية.`,
          features: [
            "جميع المواد والمجموعات في باقة واحدة",
            "شرح مبسط وتفاعلي من أفضل المعلمين المعتمدين",
            "حصص تفاعلية مباشرة (64 حصة) طوال الفصل",
            "متابعة مستمرة وتواصل مباشر مع ولي الأمر",
            "بنك أسئلة وتدريبات تفاعلية ومراجعات ليلة الامتحان"
          ],
          subjects: isSec ? [
            { name: "الفيزياء", icon: "⚡", time: "الأحد والثلاثاء - 5:00 مساءً", teacherName: "أ. محمد عبد المعبود" },
            { name: "الكيمياء", icon: "🧪", time: "الاثنين والأربعاء - 6:00 مساءً", teacherName: "أ. إيهاب سعيد" },
            { name: "الأحياء / الجيولوجيا", icon: "🧬", time: "السبت والخميس - 7:00 مساءً", teacherName: "د. أحمد الجوهري" },
            { name: "الرياضيات واللغة العربية", icon: "📐", time: "الأحد والأربعاء - 8:00 مساءً", teacherName: "أ. رضا الفاروق" }
          ] : (isMid ? [
            { name: "اللغة العربية", icon: "📙", time: "الأحد والثلاثاء - 5:00 مساءً", teacherName: "أ. محمد علي" },
            { name: "اللغة الإنجليزية", icon: "🔤", time: "الاثنين والأربعاء - 6:00 مساءً", teacherName: "أ. تامر رأفت" },
            { name: "الرياضيات", icon: "➕", time: "السبت والخميس - 7:00 مساءً", teacherName: "أ. أحمد سعيد" },
            { name: "العلوم والدراسات", icon: "🧪", time: "الأحد والأربعاء - 8:00 مساءً", teacherName: "أ. سامح عبد الله" }
          ] : [
            { name: "اللغة العربية", icon: "📙", time: "الأحد والثلاثاء - 5:00 مساءً", teacherName: "أ. محمد علي" },
            { name: "اللغة الإنجليزية", icon: "🔤", time: "الاثنين والأربعاء - 6:00 مساءً", teacherName: "أ. تامر رأفت" },
            { name: "الرياضيات", icon: "➕", time: "السبت والخميس - 7:00 مساءً", teacherName: "أ. أحمد سعيد" },
            { name: "العلوم", icon: "🧪", time: "الأحد والأربعاء - 8:00 مساءً", teacherName: "أ. سامح عبد الله" }
          ]),
          weeklySchedule: [
            { day: "السبت", items: [{ subject: "الرياضيات", time: "7:00 - 8:00 مساءً" }] },
            { day: "الأحد", items: [{ subject: "اللغة العربية", time: "5:00 - 6:00 م" }, { subject: "العلوم", time: "8:00 - 9:00 م" }] },
            { day: "الاثنين", items: [{ subject: "اللغة الإنجليزية", time: "6:00 - 7:00 مساءً" }] },
            { day: "الثلاثاء", items: [{ subject: "اللغة العربية", time: "5:00 - 6:00 مساءً" }] },
            { day: "الأربعاء", items: [{ subject: "اللغة الإنجليزية", time: "6:00 - 7:00 م" }, { subject: "العلوم", time: "8:00 - 9:00 م" }] },
            { day: "الخميس", items: [{ subject: "الرياضيات", time: "7:00 - 8:00 مساءً" }] }
          ],
          order: 1
        },
        {
          name: "فصل التأسيس (باقة مصغرة)",
          badge: "الأكثر طلباً",
          lessonsCount: "عدد الحصص: 32 حصة",
          theme: "green" as const,
          price: isSec ? "450 ريال / شهرياً  •  450 جنيه / شهرياً" : (isMid ? "300 ريال / شهرياً  •  300 جنيه / شهرياً" : "300 ريال / شهرياً  •  300 جنيه / شهرياً"),
          priceEg: isSec ? "450 جنيه" : (isMid ? "300 جنيه" : "300 جنيه"),
          description: `باقة تأسيسية تركز على المواد المحورية ومعالجة الصعوبات الفردية للطالب لضمان التأسيس المتين وبناء الثقة في التحصيل.`,
          features: [
            "تركيز مكثف على المواد المحورية الأساسية",
            "مجموعات صغيرة تفاعلية",
            "معالجة فورية لصعوبات التعلم والتأسيس",
            "تقارير دورية لمتابعة التطور التحصيلي"
          ],
          subjects: isSec ? [
            { name: "المواد الأساسية المشتركة", icon: "📙", time: "السبت والخميس - 4:00 مساءً", teacherName: "أ. محمود رجب" },
            { name: "الرياضيات التخصصية", icon: "➕", time: "الأحد والثلاثاء - 6:00 مساءً", teacherName: "أ. أحمد عصام" }
          ] : [
            { name: "اللغة العربية", icon: "📙", time: "السبت والخميس - 4:00 مساءً", teacherName: "أ. محمد علي" },
            { name: "الرياضيات", icon: "➕", time: "الأحد والثلاثاء - 6:00 مساءً", teacherName: "أ. أحمد سعيد" }
          ],
          weeklySchedule: [
            { day: "السبت", items: [{ subject: "المادة الأساسية 1", time: "4:00 - 5:30 م" }] },
            { day: "الأحد", items: [{ subject: "الرياضيات", time: "6:00 - 7:30 م" }] },
            { day: "الثلاثاء", items: [{ subject: "الرياضيات", time: "6:00 - 7:30 م" }] },
            { day: "الخميس", items: [{ subject: "المادة الأساسية 1", time: "4:00 - 5:30 م" }] }
          ],
          order: 2
        },
        {
          name: "فصل اللغات (باقة اللغات والعلوم المترجمة)",
          badge: "مسار اللغات",
          lessonsCount: "عدد الحصص: 48 حصة",
          theme: "purple" as const,
          price: isSec ? "900 ريال / شهرياً  •  900 جنيه / شهرياً" : (isMid ? "700 ريال / شهرياً  •  700 جنيه / شهرياً" : "550 ريال / شهرياً  •  550 جنيه / شهرياً"),
          priceEg: isSec ? "900 جنيه" : (isMid ? "700 جنيه" : "550 جنيه"),
          description: `باقة متخصصة لطلاب مدارس اللغات والمدارس التجريبية تقدم شروحات متقنة باللغة الإنجليزية للمواد العلمية والمتقدمة.`,
          features: [
            "تدريس باللغة الإنجليزية من معلمين معتمدين ذوي خبرة",
            "تغطية مناهج Connect Plus و Math و Science",
            "حل بنوك الأسئلة وامتحانات المدارس التجريبية واللغات",
            "متابعة دورية تفاعلية مستمرة"
          ],
          subjects: isSec ? [
            { name: "English High Level", icon: "🇬🇧", time: "الاثنين والأربعاء - 5:00 مساءً", teacherName: "Mr. Tamer Raafat" },
            { name: "Pure & Applied Math", icon: "📐", time: "السبت والخميس - 8:00 مساءً", teacherName: "Eng. Ahmed Saeed" },
            { name: "Physics & Chemistry", icon: "🔬", time: "الأحد والأربعاء - 7:00 مساءً", teacherName: "Dr. Sameh Abdullah" }
          ] : [
            { name: "English", icon: "🇬🇧", time: "الاثنين والأربعاء - 5:00 مساءً", teacherName: "Mr. Tamer Raafat" },
            { name: "Mathematics (EN)", icon: "📐", time: "السبت والخميس - 8:00 مساءً", teacherName: "Eng. Ahmed Saeed" },
            { name: "Science (EN)", icon: "🔬", time: "الأحد والأربعاء - 7:00 مساءً", teacherName: "Dr. Sameh Abdullah" }
          ],
          weeklySchedule: [
            { day: "السبت", items: [{ subject: "Mathematics", time: "8:00 - 9:30 م" }] },
            { day: "الأحد", items: [{ subject: "Science", time: "7:00 - 8:30 م" }] },
            { day: "الاثنين", items: [{ subject: "English", time: "5:00 - 6:30 م" }] },
            { day: "الأربعاء", items: [{ subject: "English", time: "5:00 - 6:30 م" }, { subject: "Science", time: "7:00 - 8:30 م" }] },
            { day: "الخميس", items: [{ subject: "Mathematics", time: "8:00 - 9:30 م" }] }
          ],
          order: 3
        }
      ];

      const created: ClassPackage[] = [];
      for (const item of packagesData) {
        const pkg = new ClassPackage();
        pkg.name = item.name;
        pkg.badge = item.badge;
        pkg.lessonsCount = item.lessonsCount;
        pkg.theme = item.theme;
        pkg.price = item.price;
        pkg.priceEg = item.priceEg;
        pkg.description = item.description;
        pkg.features = item.features;
        pkg.subjects = item.subjects;
        pkg.weeklySchedule = item.weeklySchedule;
        pkg.grade = grade;
        pkg.order = item.order;
        pkg.isActive = true;
        created.push(await classRepo.save(pkg));
      }

      return res.status(201).json({ message: "تم توليد الباقات النموذجية بنجاح.", packages: created });
    } catch (err: any) {
      console.error("Error in seedDefaultClasses:", err);
      return res.status(500).json({ error: "Failed to seed default classes." });
    }
  }

  // POST /admin/curriculum/classes/:id/enroll-student
  // Tiers / bundles enrollment: Student pays for the class package, system automatically enrolls them into ALL linked groups of the class!
  static async enrollStudentInClass(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { 
        studentId, 
        amount, 
        paymentPlan, 
        receiptUrl, 
        notes, 
        provider, 
        providerTransactionId 
      } = req.body;

      if (!studentId) {
        return res.status(400).json({ error: "معرف الطالب مطلوب (studentId)." });
      }

      const classRepo = AppDataSource.getRepository(ClassPackage);
      const pkg = await classRepo.findOne({
        where: { id },
        relations: [
          "grade", 
          "linkedGroups", 
          "linkedGroups.teacher", 
          "linkedGroups.course",
          "linkedGroups.course.teacher"
        ]
      });

      if (!pkg) {
        return res.status(404).json({ error: "الفصل أو الباقة غير موجودة." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const student = await userRepo.findOneBy({ id: studentId });
      if (!student) {
        return res.status(404).json({ error: "الطالب غير موجود بالنظام." });
      }

      const groups = pkg.linkedGroups || [];
      if (groups.length === 0) {
        return res.status(400).json({ 
          error: "هذا الفصل لا يحتوي على مجموعات دراسية مربوطة بعد. يرجى ربط مجموعات المواد بالفصل أولاً." 
        });
      }

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);
      const enrolledGroupNames: string[] = [];

      // Create a master payment record for the Class package subscription
      let masterPayment: Payment | null = null;
      if (amount && Number(amount) > 0) {
        masterPayment = new Payment();
        masterPayment.student = student;
        masterPayment.amount = Number(amount);
        masterPayment.currency = "EGP";
        masterPayment.type = "COURSE_ENROLLMENT";
        masterPayment.status = "SUCCESS";
        masterPayment.provider = provider || "CASH_OR_WALLET";
        masterPayment.providerTransactionId = providerTransactionId || "";
        masterPayment.receiptUrl = receiptUrl || "";
        masterPayment.notes = notes || `اشتراك في ${pkg.name} (${groups.length} مجموعات مواد)`;
        await paymentRepo.save(masterPayment);
      }

      for (const group of groups) {
        let enrollment = await enrollmentRepo.findOne({
          where: { student: { id: student.id }, group: { id: group.id } },
          relations: ["student", "group", "course"]
        });

        if (!enrollment) {
          enrollment = new Enrollment();
          enrollment.student = student;
          enrollment.group = group;
          enrollment.course = group.course;
          enrollment.progress = 0;
          enrollment.completedLessons = [];
        }

        enrollment.status = "active";
        if (masterPayment) {
          enrollment.payment = masterPayment;
          enrollment.paymentStatus = (paymentPlan === "PARTIAL") ? "PARTIAL" : (paymentPlan === "UNPAID" ? "UNPAID" : "PAID");
        }
        await enrollmentRepo.save(enrollment);
        enrolledGroupNames.push(group.name);

        // Notify teacher of the group
        const teacher = group.teacher || group.course?.teacher;
        if (teacher) {
          try {
            await NotificationController.createNotification(
              teacher.id,
              "طالب جديد انضم لمجموعتك عبر باقة الفصل 👨‍🎓",
              `انضم الطالب "${student.name}" إلى مجموعة "${group.name}" عبر باقة "${pkg.name}". المعلم يحصل على مستحقات ساعته (${group.teacherHourlyRate || 100} ج.م/ساعة) عن كل حصة مكتملة تلقائياً.`,
              "info",
              "#teacher-dashboard/groups"
            );
          } catch (_) {}
        }
      }

      // Also create or update the master ClassPackage enrollment
      let masterClassEnrollment = await enrollmentRepo.findOne({
        where: { student: { id: student.id }, classPackage: { id: pkg.id } }
      });
      if (!masterClassEnrollment) {
        masterClassEnrollment = new Enrollment();
        masterClassEnrollment.student = student;
        masterClassEnrollment.classPackage = pkg;
        masterClassEnrollment.course = null;
        masterClassEnrollment.group = null;
      }
      masterClassEnrollment.status = "active";
      masterClassEnrollment.paymentStatus = (paymentPlan === "PARTIAL") ? "PARTIAL" : (paymentPlan === "UNPAID" ? "UNPAID" : "PAID");
      masterClassEnrollment.paidAmount = amount ? Number(amount) : 0;
      masterClassEnrollment.remainingAmount = req.body.remainingAmount ? Number(req.body.remainingAmount) : 0;
      masterClassEnrollment.dueDate = req.body.dueDate || null;
      if (masterPayment) masterClassEnrollment.payment = masterPayment;
      await enrollmentRepo.save(masterClassEnrollment);

      // Notify Student
      try {
        await NotificationController.createNotification(
          student.id,
          "تم اشتراكك وتسكينك في جميع مجموعات الفصل بنجاح! 🎓",
          `تم تفعيل اشتراكك في باقة "${pkg.name}" وتسكينك في ${groups.length} مجموعات دراسية (${enrolledGroupNames.join('، ')}). تم إدراج كافة الحصص في جدولك الدراسي.`,
          "success",
          "#student/groups"
        );
      } catch (_) {}

      return res.status(200).json({
        message: `تم تسكين الطالب بنجاح في ${groups.length} مجموعات تابعة للفصل! 🚀`,
        classPackage: pkg.name,
        enrolledGroups: enrolledGroupNames
      });
    } catch (err: any) {
      console.error("Error in enrollStudentInClass:", err);
      return res.status(500).json({ error: "فشل تسكين الطالب في مجموعات الفصل." });
    }
  }

  // POST /curriculum/classes/:id/request-subscription
  // Student requests subscription to a ClassPackage (PAID with receipt, PARTIAL installment, or UNPAID)
  static async requestClassSubscription(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { paymentPlan, paidAmount, remainingAmount, dueDate, receiptUrl, notes, provider, providerTransactionId } = req.body;
      const studentId = req.user?.id;

      if (!studentId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم طلب الاشتراك." });
      }

      const classRepo = AppDataSource.getRepository(ClassPackage);
      const pkg = await classRepo.findOne({
        where: { id },
        relations: ["grade", "linkedGroups"]
      });

      if (!pkg) {
        return res.status(404).json({ error: "الفصل الدراسي غير موجود." });
      }

      const userRepo = AppDataSource.getRepository(User);
      const student = await userRepo.findOneBy({ id: studentId });
      if (!student) {
        return res.status(404).json({ error: "حساب الطالب غير موجود." });
      }

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      let enrollment = await enrollmentRepo.findOne({
        where: { student: { id: student.id }, classPackage: { id: pkg.id } },
        relations: ["payment"]
      });

      if (enrollment && enrollment.status === "active") {
        return res.status(400).json({ error: "أنت مشترك بالفعل في هذا الفصل الدراسي وهو نشط حالياً! ✅" });
      }

      if (!enrollment) {
        enrollment = new Enrollment();
        enrollment.student = student;
        enrollment.classPackage = pkg;
        enrollment.course = null;
        enrollment.group = null;
      }

      enrollment.status = "pending";
      const plan = paymentPlan === "PARTIAL" ? "PARTIAL" : (paymentPlan === "UNPAID" ? "UNPAID" : "PAID");
      enrollment.paymentStatus = plan;
      enrollment.paidAmount = Number(paidAmount) || 0;
      enrollment.remainingAmount = Number(remainingAmount) || 0;
      enrollment.dueDate = dueDate || null;

      // Handle payment / receipt
      let payment = enrollment.payment;
      if (!payment && (receiptUrl || enrollment.paidAmount > 0)) {
        payment = new Payment();
        payment.student = student;
        payment.currency = "EGP";
        payment.type = "COURSE_ENROLLMENT";
        payment.status = "PENDING";
      }

      if (payment) {
        payment.amount = enrollment.paidAmount;
        payment.receiptUrl = receiptUrl || payment.receiptUrl || "";
        payment.provider = provider || payment.provider || "vodafone_cash";
        payment.providerTransactionId = providerTransactionId || payment.providerTransactionId || "";
        payment.notes = notes || `طلب اشتراك في باقة: ${pkg.name}`;
        await paymentRepo.save(payment);
        enrollment.payment = payment;
      }

      if (plan === "PARTIAL" && enrollment.paidAmount > 0) {
        enrollment.installmentHistory = [
          {
            amount: enrollment.paidAmount,
            paidAt: new Date().toISOString(),
            receiptUrl: receiptUrl || "",
            provider: provider || "vodafone_cash",
            notes: "دفعة أولى عند تقديم طلب الاشتراك"
          }
        ];
      }

      await enrollmentRepo.save(enrollment);

      // Notify Admins
      try {
        const admins = await userRepo.find({ where: { role: "admin" } });
        for (const admin of admins) {
          await NotificationController.createNotification(
            admin.id,
            "طلب اشتراك جديد في باقة فصل دراسي 🎒",
            `قام الطالب "${student.name}" بطلب الاشتراك في "${pkg.name}" (${plan === 'PAID' ? 'دفع بالكامل' : (plan === 'PARTIAL' ? 'نظام تقسيط' : 'لم يدفع بعد')}). يرجى مراجعة واعتماد الطلب من لوحة الاشتراكات.`,
            "info",
            "#admin-dashboard/subscriptions"
          );
        }
      } catch (_) {}

      return res.status(201).json({
        message: "تم إرسال طلب الاشتراك بنجاح! سيتم مراجعة الطلب واعتماده من قبل الإدارة فوراً.",
        enrollment
      });
    } catch (err: any) {
      console.error("Error in requestClassSubscription:", err);
      return res.status(500).json({ error: "فشل إرسال طلب الاشتراك." });
    }
  }

  // POST /admin/curriculum/class-subscriptions/:id/approve
  // Admin approves class package subscription, confirms receipt/installment/payment, and enrolls student in all linked groups
  static async approveClassSubscription(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { 
        paymentStatus, 
        paidAmount, 
        remainingAmount, 
        dueDate, 
        receiptUrl, 
        notes, 
        provider, 
        providerTransactionId 
      } = req.body;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: [
          "student", 
          "classPackage", 
          "classPackage.linkedGroups", 
          "classPackage.linkedGroups.teacher", 
          "classPackage.linkedGroups.course",
          "classPackage.linkedGroups.course.teacher",
          "payment"
        ]
      });

      if (!enrollment || !enrollment.classPackage) {
        return res.status(404).json({ error: "طلب اشتراك الفصل غير موجود." });
      }

      const pkg = enrollment.classPackage;
      const student = enrollment.student;

      enrollment.status = "active";
      if (paymentStatus) {
        enrollment.paymentStatus = paymentStatus;
      }
      if (paidAmount !== undefined) enrollment.paidAmount = Number(paidAmount);
      if (remainingAmount !== undefined) enrollment.remainingAmount = Number(remainingAmount);
      if (dueDate !== undefined) enrollment.dueDate = dueDate;

      // Handle payment record
      let payment = enrollment.payment;
      if (!payment && (receiptUrl || enrollment.paidAmount > 0)) {
        payment = new Payment();
        payment.student = student;
        payment.type = "COURSE_ENROLLMENT";
      }

      if (payment) {
        payment.amount = enrollment.paidAmount;
        payment.currency = "EGP";
        payment.status = "SUCCESS";
        payment.receiptUrl = receiptUrl || payment.receiptUrl || "";
        payment.provider = provider || payment.provider || "vodafone_cash";
        payment.providerTransactionId = providerTransactionId || payment.providerTransactionId || "";
        payment.notes = notes || payment.notes || `اعتماد اشتراك باقة: ${pkg.name}`;
        await paymentRepo.save(payment);
        enrollment.payment = payment;
      }

      await enrollmentRepo.save(enrollment);

      // Auto-enroll student into all linked groups of this class package
      const groups = pkg.linkedGroups || [];
      const enrolledGroupNames: string[] = [];

      for (const group of groups) {
        let groupEnrollment = await enrollmentRepo.findOne({
          where: { student: { id: student.id }, group: { id: group.id } },
          relations: ["student", "group", "course"]
        });

        if (!groupEnrollment) {
          groupEnrollment = new Enrollment();
          groupEnrollment.student = student;
          groupEnrollment.group = group;
          groupEnrollment.course = group.course;
          groupEnrollment.progress = 0;
          groupEnrollment.completedLessons = [];
        }

        groupEnrollment.status = "active";
        if (enrollment.payment) groupEnrollment.payment = enrollment.payment;
        groupEnrollment.paymentStatus = enrollment.paymentStatus;
        await enrollmentRepo.save(groupEnrollment);
        enrolledGroupNames.push(group.name);

        // Notify teacher of group
        const teacher = group.teacher || group.course?.teacher;
        if (teacher) {
          try {
            await NotificationController.createNotification(
              teacher.id,
              "طالب جديد انضم لمجموعتك عبر باقة الفصل 👨‍🎓",
              `انضم الطالب "${student.name}" إلى مجموعة "${group.name}" بعد اعتماد اشتراكه في باقة "${pkg.name}".`,
              "info",
              "#teacher-dashboard/groups"
            );
          } catch (_) {}
        }
      }

      // Notify student
      try {
        await NotificationController.createNotification(
          student.id,
          "تم قبول واعتماد اشتراكك في باقة الفصل الدراسي! 🎉",
          `تهانينا! تم اعتماد اشتراكك في باقة "${pkg.name}" وتسكينك في ${groups.length} مجموعات دراسية بنجاح. يمكنك الآن بدء الحصص والتواصل مع المعلمين.`,
          "success",
          "#student/groups"
        );
      } catch (_) {}

      return res.json({
        message: `تم اعتماد وتفعيل اشتراك الفصل وتسكين الطالب في ${groups.length} مجموعات دراسية بنجاح! ✅`,
        enrollment,
        enrolledGroups: enrolledGroupNames
      });
    } catch (err: any) {
      console.error("Error in approveClassSubscription:", err);
      return res.status(500).json({ error: "فشل اعتماد اشتراك الفصل." });
    }
  }

  // POST /admin/curriculum/class-subscriptions/:id/reject
  static async rejectClassSubscription(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ["student", "classPackage", "payment"]
      });

      if (!enrollment || !enrollment.classPackage) {
        return res.status(404).json({ error: "طلب اشتراك الفصل غير موجود." });
      }

      enrollment.status = "rejected";
      if (enrollment.payment) {
        enrollment.payment.status = "FAILED";
        if (reason) {
          enrollment.payment.notes = (enrollment.payment.notes ? enrollment.payment.notes + " | " : "") + `سبب الرفض: ${reason}`;
        }
        await paymentRepo.save(enrollment.payment);
      }
      await enrollmentRepo.save(enrollment);

      // Notify student
      if (enrollment.student) {
        try {
          const reasonText = reason ? ` (السبب: ${reason})` : "";
          await NotificationController.createNotification(
            enrollment.student.id,
            "إشعار بشأن طلب الاشتراك في الفصل ❌",
            `تم رفض طلب التسجيل في باقة "${enrollment.classPackage.name}"${reasonText}. يرجى التواصل مع إدارة المنصة للمزيد من التفاصيل.`,
            "warning",
            "#student-classes"
          );
        } catch (_) {}
      }

      return res.json({ message: "تم رفض طلب اشتراك الفصل.", enrollment });
    } catch (err: any) {
      console.error("Error in rejectClassSubscription:", err);
      return res.status(500).json({ error: "فشل رفض طلب الاشتراك." });
    }
  }

  // PATCH /admin/curriculum/class-subscriptions/:id/payment
  // Admin updates payment status, amounts, receipts, or logs a new installment
  static async updateClassSubscriptionPayment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { 
        paymentStatus, 
        paidAmount, 
        remainingAmount, 
        dueDate, 
        receiptUrl, 
        notes, 
        newInstallment 
      } = req.body;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const paymentRepo = AppDataSource.getRepository(Payment);

      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ["student", "classPackage", "payment"]
      });

      if (!enrollment || !enrollment.classPackage) {
        return res.status(404).json({ error: "اشتراك الفصل غير موجود." });
      }

      if (paymentStatus) enrollment.paymentStatus = paymentStatus;
      if (paidAmount !== undefined) enrollment.paidAmount = Number(paidAmount);
      if (remainingAmount !== undefined) enrollment.remainingAmount = Number(remainingAmount);
      if (dueDate !== undefined) enrollment.dueDate = dueDate;

      // Handle new installment addition
      if (newInstallment && Number(newInstallment.amount) > 0) {
        const instAmount = Number(newInstallment.amount);
        const history = enrollment.installmentHistory || [];
        history.push({
          amount: instAmount,
          paidAt: newInstallment.paidAt || new Date().toISOString(),
          receiptUrl: newInstallment.receiptUrl || receiptUrl || "",
          provider: newInstallment.provider || "vodafone_cash",
          notes: newInstallment.notes || "سداد قسط"
        });
        enrollment.installmentHistory = history;

        if (paidAmount === undefined) {
          enrollment.paidAmount = (enrollment.paidAmount || 0) + instAmount;
          enrollment.remainingAmount = Math.max(0, (enrollment.remainingAmount || 0) - instAmount);
          if (enrollment.remainingAmount === 0) {
            enrollment.paymentStatus = "PAID";
          }
        }
      }

      // Update or create linked payment
      let payment = enrollment.payment;
      if (!payment && (receiptUrl || enrollment.paidAmount > 0)) {
        payment = new Payment();
        payment.student = enrollment.student;
        payment.type = "COURSE_ENROLLMENT";
      }

      if (payment) {
        if (receiptUrl) payment.receiptUrl = receiptUrl;
        payment.amount = enrollment.paidAmount;
        if (notes) payment.notes = notes;
        payment.status = enrollment.paymentStatus === "UNPAID" ? "PENDING" : "SUCCESS";
        await paymentRepo.save(payment);
        enrollment.payment = payment;
      }

      await enrollmentRepo.save(enrollment);

      return res.json({
        message: "تم تحديث بيانات الدفع والتقسيط بنجاح! 💳",
        enrollment
      });
    } catch (err: any) {
      console.error("Error in updateClassSubscriptionPayment:", err);
      return res.status(500).json({ error: "فشل تحديث بيانات الدفع." });
    }
  }

  // DELETE /admin/curriculum/class-subscriptions/:id
  static async deleteClassSubscription(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ["classPackage"]
      });

      if (!enrollment || !enrollment.classPackage) {
        return res.status(404).json({ error: "اشتراك الفصل غير موجود." });
      }

      await enrollmentRepo.remove(enrollment);
      return res.json({ message: "تم حذف اشتراك الفصل بنجاح." });
    } catch (err: any) {
      console.error("Error in deleteClassSubscription:", err);
      return res.status(500).json({ error: "فشل حذف اشتراك الفصل." });
    }
  }

  // POST /admin/curriculum/class-subscriptions/:id/finish
  static async finishClassSubscription(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ["classPackage", "student"]
      });

      if (!enrollment || !enrollment.classPackage) {
        return res.status(404).json({ error: "اشتراك الفصل غير موجود." });
      }

      // Mark only this specific student's class package subscription as completed
      enrollment.status = "completed";
      await enrollmentRepo.save(enrollment);

      return res.json({ 
        message: `تم إنهاء اشتراك الطالب (${enrollment.student?.name || ''}) في باقة فصل (${enrollment.classPackage.name}) فقط بنجاح 🏁`, 
        enrollment 
      });
    } catch (err: any) {
      console.error("Error in finishClassSubscription:", err);
      return res.status(500).json({ error: "فشل إنهاء اشتراك الفصل." });
    }
  }
}
