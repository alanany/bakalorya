import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class TeacherAvailability {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  teacher: User;

  @Column({ type: "int" })
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat

  @Column()
  startTime: string; // e.g., "17:00"

  @Column()
  endTime: string; // e.g., "21:00"

  @Column({ default: "Africa/Cairo" })
  timezone: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
