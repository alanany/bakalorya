import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password?: string; // Hashed password, made optional in queries/responses where we don't return it

  @Column({ default: "student" })
  role: "student" | "teacher" | "admin";

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
