import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string; // Hashed password, optional until invitation is accepted

  @Column({ default: "student" })
  role: "student" | "teacher" | "admin";

  @Column({ default: "ACTIVE" })
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";

  @Column({ type: "simple-array", nullable: true })
  teacherCapabilities: string[]; // ["COURSE_INSTRUCTOR", "SESSION_TEACHER"]

  @Column({ nullable: true })
  invitationToken?: string;

  @Column({ nullable: true })
  invitationExpiresAt?: Date;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  githubId: string;

  @Column({ nullable: true })
  meetingLink: string;

  @Column({ nullable: true })
  customCategories: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  education: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  parentPhone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
