import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Grade } from "./Grade";
import { CourseGroup } from "./CourseGroup";

@Entity()
export class ClassPackage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string; // e.g. "فصل المتفوقين (باقة مجمعة)"

  @Column({ nullable: true })
  badge: string; // e.g. "متاح للاشتراك", "الأكثر طلباً", "مسار اللغات"

  @Column({ default: "عدد الحصص: 64 حصة" })
  lessonsCount: string;

  @Column({ default: "blue" })
  theme: "blue" | "green" | "purple" | "amber";

  @Column({ nullable: true })
  customBg: string;

  @Column({ nullable: true })
  customBorder: string;

  @Column({ nullable: true })
  customHeaderBg: string;

  @Column({ nullable: true })
  price: string; // e.g. "800 ريال / شهرياً  •  800 جنيه / شهرياً"

  @Column({ nullable: true })
  priceEg: string; // e.g. "800 جنيه"

  @Column({ type: "text", nullable: true })
  description: string;

  @Column("simple-json", { nullable: true })
  features: string[]; // List of package features

  @Column("simple-json", { nullable: true })
  subjects: Array<{
    name: string;
    icon: string;
    time: string;
    teacherName?: string;
  }>;

  @Column("simple-json", { nullable: true })
  weeklySchedule: Array<{
    day: string;
    items: Array<{
      subject: string;
      time: string;
    }>;
  }>;

  @ManyToOne(() => Grade, grade => grade.classPackages, { onDelete: "CASCADE", eager: true, nullable: true })
  grade: Grade | null;

  @ManyToMany(() => Grade, { eager: true })
  @JoinTable({ name: "class_package_grades" })
  grades: Grade[];

  @ManyToOne(() => CourseGroup, { nullable: true, onDelete: "SET NULL", eager: true })
  linkedGroup: CourseGroup | null;

  @ManyToMany(() => CourseGroup, { eager: true })
  @JoinTable({ name: "class_package_groups" })
  linkedGroups: CourseGroup[];

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

