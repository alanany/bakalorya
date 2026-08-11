import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Subscription } from "./Subscription";
import { Session } from "./Session";
import { User } from "./User";

@Entity()
export class SessionCreditLedger {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Subscription, { onDelete: "CASCADE" })
  subscription: Subscription;

  @ManyToOne(() => Session, { nullable: true, onDelete: "SET NULL" })
  session: Session;

  @Column({ type: "int" })
  amount: number; // +8 for purchase, -1 for completion, +1 for refund/compensation

  @Column()
  type: "SUBSCRIPTION_PURCHASE" | "SESSION_COMPLETED" | "SESSION_CANCELLED_REFUND" | "ADMIN_COMPENSATION" | "ADMIN_ADJUSTMENT" | "EXPIRATION" | "ROLLOVER";

  @Column({ type: "text", nullable: true })
  reason: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
