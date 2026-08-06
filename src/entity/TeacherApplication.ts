import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class TeacherApplication {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  education: string; // Specialty / Subject

  @Column({ nullable: true })
  location: string;

  @Column("text", { nullable: true })
  bio: string;

  @Column({ default: "pending" })
  status: "pending" | "approved" | "rejected";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
