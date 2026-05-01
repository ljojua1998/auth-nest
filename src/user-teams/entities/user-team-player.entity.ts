import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserTeam } from './user-team.entity';
import { Player } from '../../players/entities/player.entity';

@Entity('user_team_players')
export class UserTeamPlayer {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: true, description: 'Starter vs Substitute' })
  @Column({ default: false })
  isStarter: boolean;

  @ApiProperty({ example: 1, nullable: true, description: 'Sub priority 1-4' })
  @Column({ type: 'int', nullable: true })
  subOrder: number | null;

  @ManyToOne(() => UserTeam, (ut) => ut.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userTeamId' })
  userTeam: UserTeam;

  @Column()
  userTeamId: number;

  @ManyToOne(() => Player, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @Column()
  playerId: number;

  @ApiProperty()
  @CreateDateColumn()
  addedAt: Date;
}
