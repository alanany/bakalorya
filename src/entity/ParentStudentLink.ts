import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn
} from "typeorm";
import { User } from "./User";

@Entity()
export class ParentStudentLink {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** The parent user */
  @ManyToOne(() => User, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "parentId" })
  parent: User;

  @Column()
  parentId: string;

  /** The child/student user */
  @ManyToOne(() => User, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "studentId" })
  student: User;

  @Column()
  studentId: string;

  /** Relationship label e.g. "أب", "أم", "ولي أمر" */
  @Column({ nullable: true })
  relationship?: string;

  /** Added by admin */
  @Column({ nullable: true })
  addedByAdminId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
