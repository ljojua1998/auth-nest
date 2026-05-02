import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Match } from './match.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

// BUG-H07: enforce DB-level uniqueness — one score record per user per match
@Entity('user_match_scores')
@Unique(['userId', 'matchId'])
export class UserMatchScore {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 42 })
  @Column({ default: 0 })
  totalPoints: number;

  @ApiProperty({ description: 'ქულების breakdown (playerId: points)' })
  @Column({ type: 'jsonb', nullable: true })
  breakdown: Record<string, number> | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @Column()
  matchId: number;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @Column()
  tournamentId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
