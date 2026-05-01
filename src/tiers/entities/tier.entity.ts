import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('tiers')
export class Tier {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Superstar' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ example: 150000 })
  @Column({ type: 'bigint' })
  coinPrice: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
