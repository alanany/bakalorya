import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Enrollment } from "./Enrollment";
import { Subscription } from "./Subscription";

@Entity()
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  student: User;

  @Column({ type: "float" })
  amount: number;

  @Column({ default: "EGP" })
  currency: string;

  @Column()
  type: "COURSE_ENROLLMENT" | "SUBSCRIPTION";

  @ManyToOne(() => Enrollment, { nullable: true, onDelete: "SET NULL" })
  courseEnrollment: Enrollment;

  @ManyToOne(() => Subscription, { nullable: true, onDelete: "SET NULL" })
  subscription: Subscription;

  @Column({ default: "manual" })
  provider: string;

  @Column({ nullable: true })
  providerTransactionId: string;

  @Column({ default: "SUCCESS" })
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
