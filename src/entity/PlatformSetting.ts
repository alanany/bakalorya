import { Entity, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity()
export class PlatformSetting {
  @PrimaryColumn()
  key: string;

  @Column({ type: "text", nullable: true })
  value: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
