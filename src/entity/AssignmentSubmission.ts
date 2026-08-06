import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Assignment } from "./Assignment";
import { User } from "./User";

@Entity()
export class AssignmentSubmission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    content: string;

    @Column("float", { nullable: true })
    grade: number;

    @CreateDateColumn()
    submittedAt: Date;

    @ManyToOne(() => Assignment, (assignment) => assignment.id, { onDelete: "CASCADE" })
    assignment: Assignment;

    @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
    student: User;
}
