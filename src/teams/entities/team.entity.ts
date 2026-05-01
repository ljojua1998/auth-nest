import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('teams')
export class Team {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Brazil' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ example: 'BRA' })
  @Column({ length: 3, unique: true })
  code: string;

  @ApiProperty({ example: 'https://...flag.png', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  flag: string | null;

  @ApiProperty({ example: 'A', description: 'ჯგუფი (A-H)' })
  @Column({ length: 1, nullable: true })
  group: string | null;

  @ApiProperty({ example: false })
  @Column({ default: false })
  eliminated: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
