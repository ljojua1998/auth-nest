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

  @ApiProperty({ example: 10, nullable: true, description: 'მაისურის ნომერი' })
  @Column({ type: 'smallint', nullable: true })
  number: number | null;

  @ApiProperty({ example: 36, nullable: true })
  @Column({ type: 'smallint', nullable: true })
  age: number | null;

  @ApiProperty({ example: '1987-06-24', nullable: true })
  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @ApiProperty({ example: 'Rosario', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  birthPlace: string | null;

  @ApiProperty({ example: 'Argentina', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  nationality: string | null;

  @ApiProperty({ example: '170 cm', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  height: string | null;

  @ApiProperty({ example: '72 kg', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  weight: string | null;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  injured: boolean;

  @ApiProperty({ example: 7.8, nullable: true, description: 'სეზონის რეიტინგი' })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  rating: number | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
