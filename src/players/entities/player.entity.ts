import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Team } from '../../teams/entities/team.entity';
import { Tier } from '../../tiers/entities/tier.entity';

export enum PlayerPosition {
  GK = 'GK',
  DEF = 'DEF',
  MID = 'MID',
  FWD = 'FWD',
}

@Entity('players')
export class Player {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Lionel Messi' })
  @Column()
  name: string;

  @ApiProperty({ enum: PlayerPosition, example: PlayerPosition.FWD })
  @Column({ type: 'enum', enum: PlayerPosition })
  position: PlayerPosition;

  @ApiProperty({ example: 'https://...photo.png', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  photo: string | null;

  @ApiProperty({ example: 123456, nullable: true, description: 'API-Football-ის ID' })
  @Column({ type: 'int', nullable: true, unique: true })
  apiFootballId: number | null;

  @ApiProperty({ type: () => Team })
  @ManyToOne(() => Team, { eager: true, nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  teamId: number;

  @ApiProperty({ type: () => Tier })
  @ManyToOne(() => Tier, { eager: true, nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tierId' })
  tier: Tier;

  @Column()
  tierId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
