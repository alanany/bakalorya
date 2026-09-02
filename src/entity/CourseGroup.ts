import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./Course";
import { User } from "./User";
import { Enrollment } from "./Enrollment";

@Entity()
export class CourseGroup {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string; // e.g. "مجموعة أ (السبت والثلاثاء ٦:٠٠ م)"

  @ManyToOne(() => Course, course => course.groups, { onDelete: "CASCADE" })
  course: Course;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  teacher: User | null;

  @Column({ nullable: true })
  scheduleDays: string; // e.g. "السبت والأربعاء" or "Saturday, Wednesday"

  @Column({ nullable: true })
  scheduleTime: string; // e.g. "18:00" or "6:00 PM"

  @Column({ nullable: true })
  scheduleText: string; // Human readable: "كل سبت وأربعاء الساعة 6:00 مساءً"

  @Column({ type: "int", default: 25 })
  maxStudents: number; // Maximum allowed students in this cohort/group

  @Column({ nullable: true })
  meetingLink: string; // Zoom / Google Meet link

  @Column({ default: "OPEN" })
  status: "OPEN" | "FULL" | "CLOSED" | "IN_PROGRESS" | "PENDING_APPROVAL" | "REJECTED";

  @Column({ type: "date", nullable: true })
  startDate: Date | null;

  @Column({ type: "date", nullable: true })
  endDate: Date | null;

  @Column({ type: "int", default: 24 })
  totalSessions: number; // عدد الحصص (e.g. 24)

  @Column({ type: "int", default: 60 })
  sessionDuration: number; // مدة الحصة بالدقائق (e.g. 60 دقيقة)

  @Column({ type: "float", default: 40 })
  sessionPrice: number; // سعر الحصة للطالب (e.g. 40 ج.م.)

  @Column({ type: "float", default: 40 })
  studentHourlyRate: number; // سعر ساعة التدريس للطالب (e.g. 40 ج.م./ساعة)

  @Column({ type: "float", default: 100 })
  teacherHourlyRate: number; // أجر المعلم بالساعة (نظام الأجر بالساعة وليس بعدد الطلاب - e.g. 100 ج.م./ساعة)

  @Column({ default: "شهريًّا" })
  billingCycle: string; // نظام الدفع (شهريًّا)

  @Column({ type: "float", default: 320 })
  monthlyPrice: number; // السعر للـ 8 حصص (e.g. 320 ج.م.)

  @Column({ type: "float", default: 50 })
  platformCommissionPercent: number; // نسبة أرباح وتشغيل المنصة

  @OneToMany(() => Enrollment, enrollment => enrollment.group)
  enrollments: Enrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
