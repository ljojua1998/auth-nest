import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CartItem } from '../../cart/entities/cart-item.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5000 })
  balance: number;

  @Column({ default: true })
  isVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  verificationToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  // OneToMany = ერთ User-ს აქვს ბევრი CartItem
  // ეს DB-ში სვეტს არ ქმნის! მხოლოდ TypeORM-ს ეუბნება კავშირის შესახებ
  // Angular-ში ეს იქნებოდა: user.cartItems — nested array interface-ში
  @OneToMany(() => CartItem, (cartItem) => cartItem.user)
  cartItems: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
