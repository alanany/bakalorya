import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Test } from "./Test";

@Entity()
export class TestQuestion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    questionText: string;

    @Column("simple-json")
    options: string[];

    @Column()
    correctAnswer: string;

    @ManyToOne(() => Test, (test) => test.id, { onDelete: "CASCADE" })
    test: Test;
}
