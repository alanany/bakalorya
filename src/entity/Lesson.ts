import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./Course";

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column("text", { nullable: true })
  description: string;

  @Column()
  videoUrl: string;

  @Column({ default: "0:00" })
  duration: string;

  @Column({ default: "General" })
  chapter: string;

  @Column({ default: 0 })
  order: number;

  @Column("text", { nullable: true })
  photo: string;

  @Column("text", { nullable: true })
  notes: string;

  @Column("text", { nullable: true })
  resourceUrl: string;

  @Column("text", { nullable: true })
  resourceTitle: string;

  @Column("simple-json", { nullable: true })
  questions: any[];

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  course: Course;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
