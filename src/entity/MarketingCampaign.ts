import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Enrollment } from "./Enrollment";
import { Payment } from "./Payment";

export type CampaignPlatform = "facebook" | "instagram" | "tiktok" | "google_ads" | "snapchat" | "whatsapp" | "other";

@Entity()
export class MarketingCampaign {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string; // اسم الحملة (مثال: حملة فيسبوك - مراجعات الثانوية)

  @Column({ type: "varchar", length: 50, default: "facebook" })
  platform: CampaignPlatform | string; // facebook, instagram, tiktok, google_ads, snapchat, whatsapp, other

  @Column({ type: "float", default: 0 })
  adSpend: number; // المبلغ المصروف على الإعلان

  @Column({ type: "varchar", length: 10, default: "EGP" })
  currency: string;

  @Column({ type: "varchar", length: 50, default: "active" })
  status: "active" | "completed" | "paused";

  @Column({ type: "date", nullable: true })
  startDate: string | null;

  @Column({ type: "date", nullable: true })
  endDate: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  targetAudience: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @OneToMany(() => Enrollment, enrollment => enrollment.campaign)
  enrollments: Enrollment[];

  @OneToMany(() => Payment, payment => payment.campaign)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
