import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Course } from "./Course";
import { Lesson } from "./Lesson";
import { CourseGroup } from "./CourseGroup";

@Entity()
export class Assignment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column("text", { nullable: true })
    description: string;

    @Column({ nullable: true })
    type?: string; // 'mcq' | 'essay' | 'file' | 'hybrid'

    @Column("simple-json", { nullable: true })
    questions: Array<{
        id: string;
        type: 'mcq' | 'essay' | 'file';
        text: string;
        points: number;
        imageUrl?: string;
        options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
        explanation?: string;
        allowedFileTypes?: string[];
        maxFileSizeMb?: number;
        rubric?: string;
    }>;

    @Column("float", { default: 0 })
    totalPoints: number;

    @Column("datetime")
    dueDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Course, (course) => course.id, { onDelete: "CASCADE" })
    course: Course;

    @ManyToOne(() => Lesson, { nullable: true, onDelete: "CASCADE" })
    lesson: Lesson;

    @ManyToOne(() => CourseGroup, (group) => group.assignments, { nullable: true, onDelete: "CASCADE" })
    group: CourseGroup | null;
}
