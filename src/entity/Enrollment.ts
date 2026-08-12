import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
import { Payment } from "./Payment";

@Entity()
export class Enrollment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  student: User;

  @ManyToOne(() => Course, { eager: true, onDelete: "CASCADE" })
  course: Course;

  @Column({ default: 0 })
  progress: number; // 0 to 100

  @Column({ default: "pending" })
  status: "pending" | "active" | "banned" | "rejected";

  @Column("simple-json", { nullable: true })
  completedLessons: string[]; // List of completed lesson IDs

  @OneToOne(() => Payment, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn()
  payment: Payment; // Linked payment/receipt for this enrollment

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
