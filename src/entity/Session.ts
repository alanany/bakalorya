import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";

@Entity()
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column("text", { nullable: true })
  description: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  teacher: User;

  @ManyToOne(() => Course, { eager: true, nullable: true, onDelete: "CASCADE" })
  course: Course;

  @Column()
  scheduledAt: Date;

  @Column({ default: 60 })
  duration: number; // in minutes

  @Column({ default: "scheduled" })
  status: "scheduled" | "live" | "completed";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
