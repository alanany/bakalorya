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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
