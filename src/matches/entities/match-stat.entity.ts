import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from './match.entity';
import { Player } from '../../players/entities/player.entity';

@Entity('match_stats')
export class MatchStat {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 90 })
  @Column({ default: 0 })
  minutes: number;

  @ApiProperty({ example: 1 })
  @Column({ default: 0 })
  goals: number;

  @ApiProperty({ example: 1 })
  @Column({ default: 0 })
  assists: number;

  @ApiProperty({ example: true })
  @Column({ default: false })
  cleanSheet: boolean;

  @ApiProperty({ example: 1 })
  @Column({ default: 0 })
  yellowCards: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  redCards: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  saves: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  penaltySaved: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  penaltyMissed: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  penaltyEarned: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  penaltyConceded: number;

  @ApiProperty({ example: 0 })
  @Column({ default: 0 })
  ownGoals: number;

  @ApiProperty({ example: 5, description: 'წარმატებული დაცვა (x3 = +1 ქულა)' })
  @Column({ default: 0 })
  tackles: number;

  @ApiProperty({ example: 0, description: 'გაშვებული გოლი (x2 = -1 ქულა, GK/DEF)' })
  @Column({ default: 0 })
  goalsConceded: number;

  @Column({ type: 'jsonb', nullable: true })
  rawApiData: Record<string, unknown> | null;

  @ManyToOne(() => Match, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @Column()
  matchId: number;

  @ManyToOne(() => Player, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @Column()
  playerId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
