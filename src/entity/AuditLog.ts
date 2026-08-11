import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  actor: User;

  @Column()
  action: string; // e.g. "TEACHER_CAPABILITY_CHANGED", "SESSION_CREDIT_ADJUSTED", "TEACHER_REASSIGNED"

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column({ type: "text", nullable: true })
  metadata: string; // JSON string

  @CreateDateColumn()
  createdAt: Date;
}
