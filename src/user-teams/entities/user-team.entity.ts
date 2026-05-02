import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { UserTeamPlayer } from './user-team-player.entity';

export const VALID_FORMATIONS = [
  '3-4-3', '3-5-2', '4-3-3', '4-4-2', '4-5-1', '5-3-2', '5-4-1',
] as const;

export type Formation = typeof VALID_FORMATIONS[number];

@Entity('user_teams')
export class UserTeam {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '4-3-3' })
  @Column({ type: 'varchar', default: '4-3-3' })
  formation: string;

  @ApiProperty({ example: 5, nullable: true })
  @Column({ type: 'int', nullable: true })
  captainId: number | null;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: number;

  @OneToMany(() => UserTeamPlayer, (utp) => utp.userTeam, {
    cascade: true,
    eager: true,
  })
  players: UserTeamPlayer[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
