import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Lesson } from "./Lesson";
import { Enrollment } from "./Enrollment";
import { Grade } from "./Grade";
import { Subject } from "./Subject";
import { CourseGroup } from "./CourseGroup";

@Entity()
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column("text")
  description: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  degree: string;

  @Column({ nullable: true })
  meetingLink: string;

  @Column({ default: "PUBLISHED" }) // Default for legacy courses; new submitted courses use PENDING_REVIEW
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";

  @Column({ type: "float", default: 0 })
  price: number;

  @Column({ default: true })
  isFree: boolean;

  @Column({ nullable: true, default: "EGP" })
  currency: string;

  @Column({ type: "text", nullable: true })
  paymentDetails: string;

  @ManyToOne(() => Grade, grade => grade.courses, { nullable: true, eager: true, onDelete: "SET NULL" })
  grade: Grade | null;

  @ManyToOne(() => Subject, subject => subject.courses, { nullable: true, eager: true, onDelete: "SET NULL" })
  subject: Subject | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: "SET NULL" })
  teacher: User | null;

  @Column("simple-json", { nullable: true })
  unitsOrder: string[];

  @OneToMany(() => Lesson, lesson => lesson.course, { cascade: true })
  lessons: Lesson[];

  @OneToMany(() => CourseGroup, group => group.course, { cascade: true })
  groups: CourseGroup[];

  @OneToMany(() => Enrollment, enrollment => enrollment.course, { cascade: true })
  enrollments: Enrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
