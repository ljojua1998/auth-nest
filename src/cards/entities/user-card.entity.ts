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

export enum CardType {
  TRIPLE_CAPTAIN = 'triple_captain',
  WILDCARD = 'wildcard',
  LIMITLESS = 'limitless',
}

@Entity('user_cards')
export class UserCard {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: CardType })
  @Column({ type: 'enum', enum: CardType })
  type: CardType;

  @ApiProperty({ example: false })
  @Column({ default: false })
  used: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'int', nullable: true })
  usedInTournamentId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
