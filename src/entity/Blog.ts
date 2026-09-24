import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Blog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column("text")
  content!: string;

  @Column({ default: "عام" })
  category!: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ default: "📖 5 دقائق قراءة" })
  readTime!: string;

  @Column({ default: "APPROVED" })
  status!: "PENDING" | "APPROVED" | "REJECTED";

  @Column({ type: "text", nullable: true })
  rejectionReason?: string;

  @ManyToOne(() => User, { onDelete: "CASCADE", eager: true })
  author!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
