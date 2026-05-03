import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'bigint',
    default: 1000000,
  })
  coins: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  verificationToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  resetTokenExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  refreshToken: string | null;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Exclude()
  referralCode: string | null;

  @Column({ type: 'int', nullable: true })
  referredBy: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
