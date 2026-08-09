import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";

@Entity()
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int" })
  rating: number; // 1 to 5 stars

  @Column({ type: "text" })
  comment: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  student: User;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  teacher: User;

  @ManyToOne(() => Course, { nullable: true, onDelete: "CASCADE" })
  course: Course;

  @CreateDateColumn()
  createdAt: Date;
}
