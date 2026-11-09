import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Subject } from "./Subject";
import { Course } from "./Course";
import { ClassPackage } from "./ClassPackage";

@Entity()
export class Grade {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string; // e.g., "الصف الأول الابتدائي", "الصف الثالث الثانوي"

  @Column({ nullable: true })
  nameEn: string; // e.g., "Grade 1", "Grade 12"

  @Column({ default: "SECONDARY" })
  stage: "PRIMARY" | "PREPARATORY" | "SECONDARY" | "HIGHER"; // المرحلة التعليمية

  @Column({ default: 1 })
  order: number; // For sorting grades (1 to 12)

  @Column({ nullable: true })
  code: string; // e.g. "PRI_1", "PREP_3", "SEC_3"

  @OneToMany(() => Subject, subject => subject.grade, { cascade: true })
  subjects: Subject[];

  @OneToMany(() => Course, course => course.grade)
  courses: Course[];

  @OneToMany(() => ClassPackage, pkg => pkg.grade)
  classPackages: ClassPackage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
