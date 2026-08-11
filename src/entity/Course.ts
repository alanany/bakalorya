import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Lesson } from "./Lesson";
import { Enrollment } from "./Enrollment";

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

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: "text", nullable: true })
  rejectionReason: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  teacher: User;

  @OneToMany(() => Lesson, lesson => lesson.course, { cascade: true })
  lessons: Lesson[];

  @OneToMany(() => Enrollment, enrollment => enrollment.course, { cascade: true })
  enrollments: Enrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
