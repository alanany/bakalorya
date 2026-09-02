import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Grade } from "./Grade";
import { Course } from "./Course";

@Entity()
export class Subject {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string; // e.g. "اللغة العربية", "الفيزياء", "الكيمياء"

  @Column({ nullable: true })
  nameEn: string; // e.g. "Arabic", "Physics", "Chemistry"

  @Column({ nullable: true })
  icon: string; // Emoji icon or Lucide icon name, e.g. "⚡", "🧪", "📖", "📐"

  @Column({ default: "SECONDARY" })
  stage: "PRIMARY" | "PREPARATORY" | "SECONDARY" | "HIGHER";

  @Column({ default: false })
  isLanguageTrack: boolean; // True if it's for Languages / اللغات (e.g. Science, Mathematics, Connect Plus)

  @ManyToOne(() => Grade, grade => grade.subjects, { onDelete: "CASCADE" })
  grade: Grade;

  @OneToMany(() => Course, course => course.subject)
  courses: Course[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
