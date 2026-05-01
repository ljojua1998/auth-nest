import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum TournamentStage {
  GROUP = 'group',
  ROUND_OF_32 = 'round_of_32',
  ROUND_OF_16 = 'round_of_16',
  QUARTER_FINAL = 'quarter_final',
  SEMI_FINAL = 'semi_final',
  FINAL = 'final',
  OVERALL = 'overall',
}

@Entity('tournaments')
export class Tournament {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Group Stage' })
  @Column()
  name: string;

  @ApiProperty({ enum: TournamentStage })
  @Column({ type: 'enum', enum: TournamentStage })
  stage: TournamentStage;

  @ApiProperty({ enum: TournamentStatus })
  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.UPCOMING })
  status: TournamentStatus;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
