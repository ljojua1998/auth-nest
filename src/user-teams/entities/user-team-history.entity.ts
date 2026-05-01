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
import { Player } from '../../players/entities/player.entity';

export enum TransferAction {
  BUY = 'buy',
  SELL = 'sell',
  ELIMINATION_REMOVED = 'elimination_removed',
}

@Entity('user_team_history')
export class UserTeamHistory {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: TransferAction })
  @Column({ type: 'enum', enum: TransferAction })
  action: TransferAction;

  @ApiProperty({ example: 150000 })
  @Column({ type: 'bigint' })
  coinAmount: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Player, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'playerId' })
  player: Player | null;

  @Column({ nullable: true })
  playerId: number | null;

  @ApiProperty({ example: 'Lionel Messi' })
  @Column()
  playerName: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
