import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class SubscriptionPlan {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string; // e.g., "Basic (4 Sessions)", "Standard (8 Sessions)", "Premium (12 Sessions)"

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "int" })
  sessionsCount: number; // e.g., 4, 8, 12

  @Column({ type: "float" })
  price: number; // e.g., 600, 1200, 1800

  @Column({ default: "EGP" })
  currency: string;

  @Column({ type: "int", default: 30 })
  durationDays: number; // e.g., 30

  @Column({ type: "int", default: 60 })
  sessionDurationMins: number; // e.g., 60

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
