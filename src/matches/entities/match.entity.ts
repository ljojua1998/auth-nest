import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Team } from '../../teams/entities/team.entity';

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  FINISHED = 'finished',
  POSTPONED = 'postponed',
}

@Entity('matches')
export class Match {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ nullable: true, description: 'API-Football match ID' })
  @Column({ type: 'int', nullable: true, unique: true })
  apiFootballId: number | null;

  @ApiProperty({ enum: MatchStatus })
  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.SCHEDULED })
  status: MatchStatus;

  @ApiProperty({ nullable: true })
  @Column({ type: 'int', nullable: true, default: 0 })
  homeScore: number | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'int', nullable: true, default: 0 })
  awayScore: number | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  kickoff: Date | null;

  @ManyToOne(() => Tournament, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @Column()
  tournamentId: number;

  @ManyToOne(() => Team, { eager: true, nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'homeTeamId' })
  homeTeam: Team;

  @Column()
  homeTeamId: number;

  @ManyToOne(() => Team, { eager: true, nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'awayTeamId' })
  awayTeam: Team;

  @Column()
  awayTeamId: number;

  @ApiProperty({ example: false })
  @Column({ default: false })
  statsCalculated: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
