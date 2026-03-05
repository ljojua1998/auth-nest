import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

// Order = შეკვეთის "თავი"
// ერთი Order-ი შეიცავს რამდენიმე OrderItem-ს (ნივთებს)
// მაგ: Order #1 → [ჯაკეტი x2, მაისური x1], totalPrice: $134.28
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // ვის ეკუთვნის ეს შეკვეთა
  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  // შეკვეთის ჯამური ფასი
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  // სტატუსი — ჯერ მხოლოდ 'completed', მომავალში 'cancelled' შეიძლება
  @Column({ default: 'completed' })
  status: string;

  // გადახდის მეთოდი — 'balance' ან 'card' (card დროებით disabled)
  @Column({ default: 'balance' })
  paymentMethod: string;

  // OneToMany — ერთ Order-ს აქვს ბევრი OrderItem
  // eager: true — Order-ს რომ წამოიღებ, items ავტომატურად მოყვება
  // cascade: true — Order-ს save()-ს რომ გაუძახებ, items-იც ავტომატურად შეინახება
  //   ანუ: order.items = [item1, item2]; save(order) → ორივე item-იც შეინახება
  //   cascade-ის გარეშე: items ცალ-ცალკე save() უნდა გააკეთო
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    eager: true,
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
