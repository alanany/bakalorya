import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Session } from "./Session";
import { User } from "./User";

@Entity()
export class SessionAttendance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Session, { onDelete: "CASCADE" })
  session: Session;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user: User;

  @Column({ default: "PRESENT" })
  status: "PRESENT" | "ABSENT" | "LATE";

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  markedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
