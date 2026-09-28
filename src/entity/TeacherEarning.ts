import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class TeacherEarning {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  teacher: User;

  @Column()
  sourceType: "COURSE_SALE" | "SESSION_COMPLETED" | "ADJUSTMENT" | "BONUS" | "REFUND";

  @Column()
  sourceId: string; // Course ID or Session ID

  @Column({ type: "float" })
  amount: number;

  @Column({ default: "EGP" })
  currency: string;

  @Column({ default: "pending" })
  status: "pending" | "paid";

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ default: "manual", nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  transactionRef: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
