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
import { Tournament } from '../../tournaments/entities/tournament.entity';

@Entity('leaderboard_snapshots')
export class LeaderboardSnapshot {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column()
  rank: number;

  @ApiProperty({ example: 142 })
  @Column({ default: 0 })
  totalPoints: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'bigint', default: 0 })
  prizeCoins: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @Column()
  tournamentId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
