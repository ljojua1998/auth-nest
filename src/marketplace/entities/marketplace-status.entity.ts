import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('marketplace_status')
export class MarketplaceStatus {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isOpen: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
