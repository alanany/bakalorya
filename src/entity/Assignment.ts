import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";

@Entity()
export class Assignment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column("text", { nullable: true })
    description: string;

    @Column("simple-json", { nullable: true })
    questions: Array<{ id: string; text: string; points?: number; imageUrl?: string }>;

    @Column("datetime")
    dueDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Course, (course) => course.id, { onDelete: "CASCADE" })
    course: Course;

    @ManyToOne(() => Lesson, { nullable: true, onDelete: "CASCADE" })
    lesson: Lesson;
}
