import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Lesson } from "./Lesson";

@Entity()
export class QuestionAnswer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  questionText: string;

  @Column("text", { nullable: true })
  answerText: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  student: User;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  teacher: User;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  course: Course;

  @ManyToOne(() => Lesson, { nullable: true, onDelete: "CASCADE" })
  lesson: Lesson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
