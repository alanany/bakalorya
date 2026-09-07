import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Assignment } from "./Assignment";
import { User } from "./User";

@Entity()
export class AssignmentSubmission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text", { nullable: true })
    content: string;

    @Column({ default: "submitted" })
    status: string; // 'submitted' | 'draft_graded' | 'graded'

    @Column("simple-json", { nullable: true })
    answers: Array<{
        questionId: string;
        questionIndex?: number;
        questionText?: string;
        type: 'mcq' | 'essay' | 'file';
        selectedOptionId?: string;
        selectedOptionIds?: string[];
        answerText?: string;
        fileUrl?: string;
        fileName?: string;
        pointsAwarded?: number;
        maxPoints?: number;
        isCorrect?: boolean;
        feedback?: string;
    }>;

    @Column("float", { nullable: true })
    grade: number;

    @Column("float", { nullable: true })
    percentage: number;

    @Column("text", { nullable: true })
    overallFeedback: string;

    @Column({ nullable: true })
    feedbackFileUrl?: string;

    @Column({ nullable: true })
    feedbackFileName?: string;

    @Column("boolean", { default: false })
    isLate: boolean;

    @Column("datetime", { nullable: true })
    gradedAt?: Date;

    @CreateDateColumn()
    submittedAt: Date;

    @ManyToOne(() => Assignment, (assignment) => assignment.id, { onDelete: "CASCADE" })
    assignment: Assignment;

    @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
    student: User;
}
