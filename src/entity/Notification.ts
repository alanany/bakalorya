import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @Column()
  title: string;

  @Column("text")
  message: string;

  @Column({ default: "info" }) // 'info' | 'success' | 'warning' | 'error'
  type: string;

  @Column({ nullable: true })
  link: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
