import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToOne } from "typeorm";
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
  type: "COURSE_ENROLLMENT" | "SUBSCRIPTION" | "GROUP_ENROLLMENT";

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

  @Column({ nullable: true })
  receiptUrl: string; // Uploaded receipt image URL

  @Column({ type: "text", nullable: true })
  notes: string; // Free-form transaction notes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
