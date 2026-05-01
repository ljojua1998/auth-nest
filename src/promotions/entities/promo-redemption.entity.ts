import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { PromoCode } from './promo-code.entity';

@Entity('promo_redemptions')
export class PromoRedemption {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => PromoCode, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  @Column()
  promoCodeId: number;

  @ApiProperty()
  @CreateDateColumn()
  redeemedAt: Date;
}
