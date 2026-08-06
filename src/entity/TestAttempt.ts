import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Test } from "./Test";
import { User } from "./User";

@Entity()
export class TestAttempt {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("float")
    score: number;

    @CreateDateColumn()
    completedAt: Date;

    @ManyToOne(() => Test, (test) => test.id, { onDelete: "CASCADE" })
    test: Test;

    @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
    student: User;
}
