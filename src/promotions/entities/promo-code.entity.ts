import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum PromoType {
  CAMPAIGN = 'campaign',
  REFERRAL = 'referral',
  EVENT = 'event',
}

@Entity('promo_codes')
export class PromoCode {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'WORLDCUP2026' })
  @Column({ unique: true })
  code: string;

  @ApiProperty({ enum: PromoType })
  @Column({ type: 'enum', enum: PromoType, default: PromoType.CAMPAIGN })
  type: PromoType;

  @ApiProperty({ example: 50000 })
  @Column({ type: 'bigint' })
  bonusCoins: number;

  @ApiProperty({ example: 100, nullable: true })
  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  usedCount: number;

  @ApiProperty({ example: true })
  @Column({ default: true })
  onePerUser: boolean;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
