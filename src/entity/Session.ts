import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Subscription } from "./Subscription";

@Entity()
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  title: string;

  @Column("text", { nullable: true })
  description: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  teacher: User;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  student: User; // Nullable for group course sessions; set for 1-on-1 private sessions

  @ManyToOne(() => Course, { eager: true, nullable: true, onDelete: "CASCADE" })
  course: Course;

  @ManyToOne(() => Subscription, { eager: true, nullable: true, onDelete: "SET NULL" })
  subscription: Subscription;

  @Column()
  scheduledAt: Date;

  @Column({ default: 60 })
  duration: number; // in minutes

  @Column({ default: "SCHEDULED" })
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED_BY_STUDENT" | "CANCELLED_BY_TEACHER" | "NO_SHOW_STUDENT" | "NO_SHOW_TEACHER" | "RESCHEDULED" | "scheduled" | "live" | "completed";

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: "varchar", length: 500, nullable: true })
  meetingLink: string | null;

  // Session Report / Lesson Notes Fields
  @Column({ nullable: true })
  topic: string;

  @Column({ type: "text", nullable: true })
  whatWasCovered: string;

  @Column({ nullable: true })
  studentPerformance: string; // "Excellent" | "Good" | "Needs Practice"

  @Column({ type: "text", nullable: true })
  homework: string;

  @Column({ type: "text", nullable: true })
  teacherNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
