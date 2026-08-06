import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Course } from "./Course";
import { TestQuestion } from "./TestQuestion";

@Entity()
export class Test {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Course, (course) => course.id, { onDelete: "CASCADE" })
    course: Course;

    @OneToMany(() => TestQuestion, (question) => question.test)
    questions: TestQuestion[];
}
