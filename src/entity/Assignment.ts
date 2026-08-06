import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Course } from "./Course";

@Entity()
export class Assignment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column("text", { nullable: true })
    description: string;

    @Column("datetime")
    dueDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Course, (course) => course.id, { onDelete: "CASCADE" })
    course: Course;
}
