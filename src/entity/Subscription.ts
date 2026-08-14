import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { SubscriptionPlan } from "./SubscriptionPlan";

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  student: User;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  teacher: User; // Nullable if TEACHER_ASSIGNMENT_PENDING

  @ManyToOne(() => SubscriptionPlan, { eager: true, onDelete: "RESTRICT" })
  plan: SubscriptionPlan;

  @Column({ nullable: true })
  subjectId: string;

  @Column({ nullable: true })
  levelId: string;

  @Column({ type: "int" })
  totalSessions: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: "PENDING_PAYMENT" })
  status: "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED" | "PAST_DUE" | "TEACHER_ASSIGNMENT_PENDING";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
