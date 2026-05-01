import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  REGISTRATION_BONUS = 'registration_bonus',
  PLAYER_BUY = 'player_buy',
  PLAYER_SELL = 'player_sell',
  PRIZE = 'prize',
  PROMO = 'promo',
  ELIMINATION_REFUND = 'elimination_refund',
}

@Entity('transactions')
export class Transaction {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: TransactionType })
  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ example: 150000 })
  @Column({ type: 'bigint' })
  amount: number;

  @ApiProperty({ example: 1000000 })
  @Column({ type: 'bigint' })
  balanceBefore: number;

  @ApiProperty({ example: 850000 })
  @Column({ type: 'bigint' })
  balanceAfter: number;

  @ApiProperty({ example: 'Bought Lionel Messi' })
  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
